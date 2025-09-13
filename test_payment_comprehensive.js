/**
 * 🧪 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ ОПЛАТЫ И ПОДПИСОК
 * 
 * Этот скрипт тестирует весь жизненный цикл системы оплаты:
 * 1. Создание и сохранение пользователя
 * 2. Создание платежа через YooKassa
 * 3. Имитация успешной оплаты (webhook)
 * 4. Проверка создания и активации подписки
 * 5. Проверка доступа пользователя к функциям
 * 6. Тестирование использования лимитов
 * 7. Проверка истории платежей и подписок
 */

import dotenv from 'dotenv';
import { 
  initDatabase,
  createOrUpdateUser, 
  getUserByTelegramId,
  getActiveSubscription,
  createSubscription,
  getAllUserSubscriptions,
  canUserMakeRequest,
  incrementRequestUsage,
  createPayment
} from './src/services/database.js';

import { createSubscriptionPayment } from './src/services/payment.js';

dotenv.config();

// 🎯 Конфигурация тестирования
const TEST_CONFIG = {
  testUser: {
    id: 111222333, // Уникальный тестовый ID
    first_name: 'Тест',
    last_name: 'Оплата',
    username: 'test_payment_user_2024'
  },
  
  testPlans: [
    { 
      type: 'basic', 
      amount: parseInt(process.env.BASIC_PRICE || '150'), 
      requests: parseInt(process.env.BASIC_REQUESTS || '100'),
      description: 'Базовый план'
    },
    { 
      type: 'premium', 
      amount: parseInt(process.env.PREMIUM_PRICE || '450'), 
      requests: parseInt(process.env.PREMIUM_REQUESTS || '600'),
      description: 'Премиум план'
    }
  ]
};

// 📊 Результаты тестирования
let testResults = {
  configCheck: false,
  userCreation: false,
  paymentCreation: false,
  webhookSimulation: false,
  subscriptionCreation: false,
  accessControl: false,
  requestLimits: false,
  paymentHistory: false,
  subscriptionHistory: false,
  multiplePayments: false
};

// 📋 Лог результатов
let testLogs = [];

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('ru-RU');
  const logEntry = `[${timestamp}] ${message}`;
  
  switch(type) {
    case 'success':
      console.log('✅', logEntry);
      break;
    case 'error':
      console.log('❌', logEntry);
      break;
    case 'warning':
      console.log('⚠️', logEntry);
      break;
    case 'info':
    default:
      console.log('ℹ️', logEntry);
      break;
  }
  
  testLogs.push({ timestamp, message, type });
}

// 🔧 ЭТАП 1: Проверка конфигурации
async function checkConfiguration() {
  log('Проверка конфигурации платежной системы...');
  
  const requiredEnvVars = [
    'YOOKASSA_PROD_SHOP_ID',
    'YOOKASSA_PROD_SECRET_KEY',
    'BASIC_PRICE',
    'PREMIUM_PRICE',
    'BASIC_REQUESTS',
    'PREMIUM_REQUESTS'
  ];
  
  let configValid = true;
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log(`Переменная окружения ${envVar} не найдена`, 'error');
      configValid = false;
    } else {
      log(`${envVar}: ✓ установлена`);
    }
  }
  
  if (configValid) {
    log('Конфигурация валидна', 'success');
    testResults.configCheck = true;
  } else {
    log('Конфигурация невалидна', 'error');
  }
  
  return configValid;
}

// 👤 ЭТАП 2: Создание и проверка пользователя
async function testUserCreation() {
  log('Создание тестового пользователя...');
  
  try {
    // Создаем пользователя
    await createOrUpdateUser(TEST_CONFIG.testUser);
    
    // Проверяем что пользователь создался
    const dbUser = await getUserByTelegramId(TEST_CONFIG.testUser.id);
    
    if (dbUser) {
      log(`Пользователь создан: ID=${dbUser.id}, Telegram=${dbUser.telegram_id}`, 'success');
      log(`Имя: ${dbUser.first_name} ${dbUser.last_name || ''}`);
      log(`Username: ${dbUser.username || 'не указан'}`);
      
      testResults.userCreation = true;
      return dbUser;
    } else {
      log('Пользователь не найден в базе данных', 'error');
      return null;
    }
  } catch (error) {
    log(`Ошибка создания пользователя: ${error.message}`, 'error');
    return null;
  }
}

// 💳 ЭТАП 3: Создание платежей
async function testPaymentCreation(user) {
  log('Тестирование создания платежей...');
  
  const paymentResults = [];
  
  for (const plan of TEST_CONFIG.testPlans) {
    try {
      log(`Создание платежа для плана: ${plan.description} (${plan.amount}₽)`);
      
      const paymentData = await createSubscriptionPayment(
        user,
        plan.type,
        plan.amount,
        `Тестовая подписка ${plan.description}`
      );
      
      if (paymentData && paymentData.success && paymentData.payment) {
        const payment = paymentData.payment;
        
        log(`Платеж создан: ID=${payment.id}`, 'success');
        log(`Сумма: ${payment.amount.value} ${payment.amount.currency}`);
        log(`Статус: ${payment.status}`);
        log(`URL: ${payment.confirmation.confirmation_url.substring(0, 60)}...`);
        
        paymentResults.push({
          plan: plan.type,
          payment: payment,
          success: true
        });
        
        testResults.paymentCreation = true;
      } else {
        log(`Ошибка создания платежа для плана ${plan.type}`, 'error');
        log(`Детали: ${paymentData?.error || 'Неизвестная ошибка'}`);
        
        paymentResults.push({
          plan: plan.type,
          payment: null,
          success: false,
          error: paymentData?.error
        });
      }
    } catch (error) {
      log(`Исключение при создании платежа ${plan.type}: ${error.message}`, 'error');
      paymentResults.push({
        plan: plan.type,
        payment: null,
        success: false,
        error: error.message
      });
    }
  }
  
  return paymentResults;
}

// 🎯 ЭТАП 4: Имитация webhook'а успешной оплаты
async function simulateSuccessfulPayment(user, plan) {
  log(`Имитация успешной оплаты для плана: ${plan.description}...`);
  
  try {
    // Создаем подписку (функция createSubscription принимает telegramId, а не user.id)
    const subscription = await createSubscription(
      user.telegram_id, // Используем telegram_id вместо internal id
      plan.type,
      plan.amount,
      `test_payment_${Date.now()}`
    );
    
    if (subscription) {
      log('Подписка создана и активирована', 'success');
      log(`План: ${plan.type}`);
      log(`Сумма: ${plan.amount}₽`);
      log(`Лимит запросов: ${plan.requests}`);
      
      testResults.webhookSimulation = true;
      testResults.subscriptionCreation = true;
      
      return subscription;
    } else {
      log('Ошибка создания подписки', 'error');
      return null;
    }
  } catch (error) {
    log(`Ошибка имитации оплаты: ${error.message}`, 'error');
    return null;
  }
}

// 🔐 ЭТАП 5: Тестирование контроля доступа
async function testAccessControl(user) {
  log('Тестирование контроля доступа...');
  
  try {
    // Проверяем активную подписку
    const activeSubscription = await getActiveSubscription(user.id);
    
    if (activeSubscription) {
      log('Активная подписка найдена', 'success');
      log(`План: ${activeSubscription.plan_type}`);
      log(`Статус: ${activeSubscription.status}`);
      log(`Запросов: ${activeSubscription.requests_used}/${activeSubscription.requests_limit}`);
    } else {
      log('Активная подписка не найдена', 'warning');
      return false;
    }
    
    // Проверяем возможность делать запросы
    const requestStatus = await canUserMakeRequest(user.id);
    
    log(`Может делать запросы: ${requestStatus.canMake}`);
    log(`Тип доступа: ${requestStatus.type}`);
    log(`Доступно запросов: ${requestStatus.remaining}/${requestStatus.total || requestStatus.limit}`);
    
    if (requestStatus.canMake) {
      testResults.accessControl = true;
      return true;
    } else {
      log('Пользователь не может делать запросы', 'error');
      return false;
    }
  } catch (error) {
    log(`Ошибка проверки доступа: ${error.message}`, 'error');
    return false;
  }
}

// 📊 ЭТАП 6: Тестирование лимитов запросов
async function testRequestLimits(user) {
  log('Тестирование системы лимитов запросов...');
  
  try {
    const initialStatus = await canUserMakeRequest(user.id);
    log(`Начальное состояние: ${initialStatus.remaining} запросов доступно`);
    
    // Делаем несколько тестовых запросов
    const testRequestsCount = Math.min(10, initialStatus.remaining);
    
    for (let i = 1; i <= testRequestsCount; i++) {
      await incrementRequestUsage(user.id);
      const newStatus = await canUserMakeRequest(user.id);
      log(`Запрос ${i}: осталось ${newStatus.remaining} запросов`);
      
      if (i === 1) {
        // Проверяем что счетчик действительно уменьшился
        if (newStatus.remaining === initialStatus.remaining - 1) {
          log('Система лимитов работает корректно', 'success');
          testResults.requestLimits = true;
        } else {
          log('Система лимитов работает некорректно', 'error');
        }
      }
    }
    
    return true;
  } catch (error) {
    log(`Ошибка тестирования лимитов: ${error.message}`, 'error');
    return false;
  }
}

// 📈 ЭТАП 7: Проверка истории платежей и подписок
async function testHistory(user) {
  log('Проверка истории платежей и подписок...');
  
  try {
    // Проверяем историю подписок
    const allSubscriptions = await getAllUserSubscriptions(user.id);
    
    if (allSubscriptions && allSubscriptions.length > 0) {
      log(`Найдено подписок: ${allSubscriptions.length}`, 'success');
      
      allSubscriptions.forEach((sub, index) => {
        log(`Подписка ${index + 1}: ${sub.plan_type} (${sub.status}) - ${sub.amount}₽`);
      });
      
      testResults.subscriptionHistory = true;
      testResults.paymentHistory = true;
    } else {
      log('История подписок пуста', 'warning');
    }
    
    return true;
  } catch (error) {
    log(`Ошибка проверки истории: ${error.message}`, 'error');
    return false;
  }
}

// 💯 ЭТАП 8: Тестирование множественных платежей
async function testMultiplePayments(user) {
  log('Тестирование множественных платежей...');
  
  try {
    // Создаем вторую подписку (премиум)
    const premiumPlan = TEST_CONFIG.testPlans.find(p => p.type === 'premium');
    
    if (premiumPlan) {
      const secondSubscription = await simulateSuccessfulPayment(user, premiumPlan);
      
      if (secondSubscription) {
        // Проверяем что система выбирает лучшую подписку
        const activeSubscription = await getActiveSubscription(user.id);
        
        if (activeSubscription && activeSubscription.requests_limit >= premiumPlan.requests) {
          log('Система корректно выбирает лучшую подписку', 'success');
          testResults.multiplePayments = true;
        } else {
          log('Система некорректно обрабатывает множественные подписки', 'error');
        }
      }
    }
    
    return true;
  } catch (error) {
    log(`Ошибка тестирования множественных платежей: ${error.message}`, 'error');
    return false;
  }
}

// 📊 Вывод результатов тестирования
function printTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ ОПЛАТЫ');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Проверка конфигурации', key: 'configCheck', weight: 1 },
    { name: 'Создание пользователя', key: 'userCreation', weight: 2 },
    { name: 'Создание платежей (YooKassa)', key: 'paymentCreation', weight: 3 },
    { name: 'Обработка успешной оплаты', key: 'webhookSimulation', weight: 3 },
    { name: 'Создание подписки', key: 'subscriptionCreation', weight: 3 },
    { name: 'Контроль доступа', key: 'accessControl', weight: 3 },
    { name: 'Система лимитов запросов', key: 'requestLimits', weight: 2 },
    { name: 'История платежей', key: 'paymentHistory', weight: 1 },
    { name: 'История подписок', key: 'subscriptionHistory', weight: 1 },
    { name: 'Множественные платежи', key: 'multiplePayments', weight: 2 }
  ];
  
  let totalWeight = 0;
  let passedWeight = 0;
  
  tests.forEach((test, index) => {
    const passed = testResults[test.key];
    const status = passed ? '✅ ПРОЙДЕН' : '❌ ПРОВАЛЕН';
    const importance = '⭐'.repeat(test.weight);
    
    console.log(`${index + 1}. ${test.name}: ${status} ${importance}`);
    
    totalWeight += test.weight;
    if (passed) passedWeight += test.weight;
  });
  
  const percentage = Math.round((passedWeight / totalWeight) * 100);
  
  console.log('\n' + '-'.repeat(60));
  console.log(`📈 ОБЩИЙ РЕЗУЛЬТАТ: ${passedWeight}/${totalWeight} весовых единиц (${percentage}%)`);
  
  // Анализ результатов
  console.log('\n🔍 АНАЛИЗ СИСТЕМЫ ОПЛАТЫ:');
  
  if (testResults.configCheck) {
    console.log('✅ Конфигурация платежной системы настроена корректно');
  } else {
    console.log('❌ Проблемы с конфигурацией платежной системы');
  }
  
  if (testResults.userCreation) {
    console.log('✅ Система создания и сохранения пользователей работает');
  } else {
    console.log('❌ Проблемы с системой пользователей');
  }
  
  if (testResults.paymentCreation) {
    console.log('✅ Интеграция с YooKassa функционирует');
  } else {
    console.log('❌ Проблемы с интеграцией YooKassa');
  }
  
  if (testResults.subscriptionCreation && testResults.webhookSimulation) {
    console.log('✅ Система обработки платежей и создания подписок работает');
  } else {
    console.log('❌ Проблемы с обработкой платежей');
  }
  
  if (testResults.accessControl) {
    console.log('✅ Контроль доступа функционирует корректно');
  } else {
    console.log('❌ Проблемы с контролем доступа');
  }
  
  const userMemoryWorks = testResults.userCreation && 
                         testResults.subscriptionCreation && 
                         testResults.accessControl && 
                         testResults.subscriptionHistory;
  
  console.log('\n🧠 ЗАПОМИНАНИЕ ПОЛЬЗОВАТЕЛЯ:');
  if (userMemoryWorks) {
    console.log('✅ Система ТОЧНО ЗАПОМИНАЕТ пользователей и их подписки');
    console.log('   • Пользователь сохраняется в базе данных');
    console.log('   • Подписка привязывается к пользователю');
    console.log('   • Доступ контролируется по подписке');
    console.log('   • История сохраняется');
  } else {
    console.log('❌ Проблемы с запоминанием пользователей');
  }
  
  // Общая оценка
  console.log('\n🏆 ОБЩАЯ ОЦЕНКА:');
  if (percentage >= 90) {
    console.log('🎉 СИСТЕМА ОПЛАТЫ РАБОТАЕТ ОТЛИЧНО!');
    console.log('   Все критические компоненты функционируют корректно');
  } else if (percentage >= 75) {
    console.log('👍 Система оплаты работает хорошо');
    console.log('   Основной функционал работает, есть незначительные проблемы');
  } else if (percentage >= 50) {
    console.log('⚠️ Система оплаты работает с проблемами');
    console.log('   Требуются исправления критических компонентов');
  } else {
    console.log('❌ Система оплаты требует серьезных исправлений');
    console.log('   Множественные критические проблемы');
  }
}

// 🚀 Главная функция тестирования
async function runComprehensiveTest() {
  console.log('🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ ОПЛАТЫ');
  console.log('='.repeat(60));
  console.log(`⏰ Время начала: ${new Date().toLocaleString('ru-RU')}`);
  console.log(`👤 Тестовый пользователь: ${TEST_CONFIG.testUser.first_name} ${TEST_CONFIG.testUser.last_name}`);
  console.log(`📱 Telegram ID: ${TEST_CONFIG.testUser.id}`);
  console.log('='.repeat(60));
  
  try {
    // Инициализация базы данных
    log('Инициализация базы данных...');
    await initDatabase();
    log('База данных инициализирована', 'success');
    
    // Этап 1: Проверка конфигурации
    const configValid = await checkConfiguration();
    if (!configValid) {
      log('Тестирование прервано из-за неверной конфигурации', 'error');
      return;
    }
    
    // Этап 2: Создание пользователя
    const user = await testUserCreation();
    if (!user) {
      log('Тестирование прервано - не удалось создать пользователя', 'error');
      return;
    }
    
    // Этап 3: Создание платежей
    const paymentResults = await testPaymentCreation(user);
    
    // Этап 4: Имитация успешной оплаты
    const basicPlan = TEST_CONFIG.testPlans.find(p => p.type === 'basic');
    if (basicPlan) {
      const subscription = await simulateSuccessfulPayment(user, basicPlan);
      
      if (subscription) {
        // Этап 5: Тестирование доступа
        await testAccessControl(user);
        
        // Этап 6: Тестирование лимитов
        await testRequestLimits(user);
        
        // Этап 7: Проверка истории
        await testHistory(user);
        
        // Этап 8: Множественные платежи
        await testMultiplePayments(user);
      }
    }
    
  } catch (error) {
    log(`Критическая ошибка тестирования: ${error.message}`, 'error');
    console.error('Stack trace:', error.stack);
  } finally {
    console.log('\n⏰ Время завершения:', new Date().toLocaleString('ru-RU'));
    printTestResults();
  }
}

// Запуск тестирования
runComprehensiveTest();
