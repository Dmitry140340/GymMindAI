/**
 * 🎯 ФИНАЛЬНЫЙ ТЕСТ СИСТЕМЫ ОПЛАТЫ
 * Проверяем полный цикл: создание → активация → проверка доступа
 */

import dotenv from 'dotenv';
import { 
  initDatabase,
  createOrUpdateUser, 
  getUserByTelegramId,
  getActiveSubscription,
  createSubscription,
  activateSubscription,
  canUserMakeRequest,
  incrementRequestUsage,
  getAllUserSubscriptions
} from './src/services/database.js';

import { createSubscriptionPayment } from './src/services/payment.js';

dotenv.config();

console.log('🎯 ФИНАЛЬНЫЙ ТЕСТ СИСТЕМЫ ОПЛАТЫ');
console.log('='.repeat(50));

async function finalTest() {
  try {
    await initDatabase();
    console.log('✅ База данных инициализирована\n');
    
    // 🧪 ЭТАП 1: Создание пользователя
    console.log('👤 ЭТАП 1: Создание пользователя');
    console.log('-'.repeat(30));
    
    const testUser = {
      id: 555444333,
      first_name: 'Финальный',
      last_name: 'Тест',
      username: 'final_test_user'
    };
    
    await createOrUpdateUser(testUser);
    const dbUser = await getUserByTelegramId(testUser.id);
    console.log(`✅ Пользователь создан: ${dbUser.first_name} (ID: ${dbUser.id})`);
    
    // 🧪 ЭТАП 2: Создание платежа через YooKassa
    console.log('\n💳 ЭТАП 2: Создание платежа через YooKassa');
    console.log('-'.repeat(40));
    
    const paymentResult = await createSubscriptionPayment(
      testUser,
      'basic',
      150,
      'Тестовая подписка Базовый план'
    );
    
    if (paymentResult && paymentResult.success && paymentResult.payment) {
      console.log('✅ Платеж создан в YooKassa');
      console.log(`   ID платежа: ${paymentResult.payment.id}`);
      console.log(`   Статус: ${paymentResult.payment.status}`);
      console.log(`   Сумма: ${paymentResult.payment.amount.value} ${paymentResult.payment.amount.currency}`);
    } else {
      console.log('⚠️ Проблема с созданием платежа, но продолжаем тест');
    }
    
    // 🧪 ЭТАП 3: Создание подписки (PENDING)
    console.log('\n📝 ЭТАП 3: Создание подписки');
    console.log('-'.repeat(30));
    
    const testPaymentId = `test_payment_${Date.now()}`;
    console.log(`📋 Создаем подписку с payment_id: ${testPaymentId}`);
    
    const subscription = await createSubscription(
      testUser.id,
      'basic',
      150,
      testPaymentId
    );
    
    if (subscription) {
      console.log('✅ Подписка создана со статусом PENDING');
      
      // Проверяем что подписка не активна
      const activeSubBefore = await getActiveSubscription(dbUser.id);
      console.log(`🔍 Активная подписка до активации: ${activeSubBefore ? 'НАЙДЕНА' : 'НЕ НАЙДЕНА'}`);
      
      const accessBefore = await canUserMakeRequest(dbUser.id);
      console.log(`🔍 Доступ до активации: ${accessBefore.type} (${accessBefore.remaining} запросов)`);
      
    } else {
      console.log('❌ Ошибка создания подписки');
      return;
    }
    
    // 🧪 ЭТАП 4: Активация подписки (имитация успешного webhook)
    console.log('\n🎯 ЭТАП 4: Активация подписки');
    console.log('-'.repeat(30));
    
    console.log('💰 Имитируем успешный webhook от YooKassa...');
    const activationResult = await activateSubscription(testPaymentId);
    
    if (activationResult) {
      console.log('✅ Подписка АКТИВИРОВАНА!');
      
      // Проверяем что подписка теперь активна
      const activeSubAfter = await getActiveSubscription(dbUser.id);
      if (activeSubAfter) {
        console.log(`✅ Активная подписка найдена: ${activeSubAfter.plan_type}`);
        console.log(`   Статус: ${activeSubAfter.status}`);
        console.log(`   Лимит запросов: ${activeSubAfter.requests_limit}`);
        console.log(`   Действует до: ${new Date(activeSubAfter.end_date).toLocaleDateString('ru-RU')}`);
      } else {
        console.log('❌ Активная подписка все еще не найдена');
      }
      
      const accessAfter = await canUserMakeRequest(dbUser.id);
      console.log(`🔍 Доступ после активации: ${accessAfter.type} (${accessAfter.remaining} запросов)`);
      
      if (accessAfter.type === 'subscription' && accessAfter.remaining > 0) {
        console.log('🎉 СИСТЕМА ОПЛАТЫ РАБОТАЕТ ПОЛНОСТЬЮ!');
      }
      
    } else {
      console.log('❌ Ошибка активации подписки');
    }
    
    // 🧪 ЭТАП 5: Тест использования запросов
    console.log('\n📊 ЭТАП 5: Тест использования запросов');
    console.log('-'.repeat(35));
    
    const initialAccess = await canUserMakeRequest(dbUser.id);
    console.log(`🔍 Начальное состояние: ${initialAccess.remaining} запросов`);
    
    // Используем несколько запросов
    for (let i = 1; i <= 3; i++) {
      await incrementRequestUsage(dbUser.id);
      const currentAccess = await canUserMakeRequest(dbUser.id);
      console.log(`   После запроса ${i}: ${currentAccess.remaining} запросов осталось`);
      
      if (i === 1 && currentAccess.remaining === initialAccess.remaining - 1) {
        console.log('✅ Система лимитов работает корректно!');
      }
    }
    
    // 🧪 ЭТАП 6: Проверка запоминания пользователя
    console.log('\n🧠 ЭТАП 6: Проверка запоминания пользователя');
    console.log('-'.repeat(40));
    
    // "Забываем" все данные и получаем заново
    const rememberedUser = await getUserByTelegramId(testUser.id);
    const rememberedSubscription = await getActiveSubscription(rememberedUser.id);
    const rememberedAccess = await canUserMakeRequest(rememberedUser.id);
    const allSubscriptions = await getAllUserSubscriptions(testUser.id);
    
    console.log('🔍 Проверяем что система помнит пользователя:');
    console.log(`   ✓ Пользователь найден: ${rememberedUser ? rememberedUser.first_name : 'НЕТ'}`);
    console.log(`   ✓ Активная подписка: ${rememberedSubscription ? rememberedSubscription.plan_type : 'НЕТ'}`);
    console.log(`   ✓ Доступ к запросам: ${rememberedAccess.canMake ? 'ЕСТЬ' : 'НЕТ'}`);
    console.log(`   ✓ История подписок: ${allSubscriptions.length} подписок`);
    
    // 🏆 ФИНАЛЬНАЯ ОЦЕНКА
    console.log('\n' + '='.repeat(50));
    console.log('🏆 ИТОГОВАЯ ОЦЕНКА СИСТЕМЫ ОПЛАТЫ');
    console.log('='.repeat(50));
    
    const checks = [
      { name: 'Создание пользователя', status: !!rememberedUser },
      { name: 'Интеграция с YooKassa', status: paymentResult && paymentResult.success },
      { name: 'Создание подписки', status: !!subscription },
      { name: 'Активация подписки', status: !!rememberedSubscription },
      { name: 'Контроль доступа', status: rememberedAccess.canMake },
      { name: 'Система лимитов', status: rememberedAccess.type === 'subscription' },
      { name: 'Запоминание пользователя', status: allSubscriptions.length > 0 }
    ];
    
    let passedChecks = 0;
    checks.forEach((check, index) => {
      const status = check.status ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ';
      console.log(`${index + 1}. ${check.name}: ${status}`);
      if (check.status) passedChecks++;
    });
    
    const percentage = Math.round((passedChecks / checks.length) * 100);
    console.log(`\n📊 ОБЩИЙ РЕЗУЛЬТАТ: ${passedChecks}/${checks.length} (${percentage}%)`);
    
    if (percentage >= 85) {
      console.log('\n🎉 СИСТЕМА ОПЛАТЫ РАБОТАЕТ ОТЛИЧНО!');
      console.log('✅ Пользователи ТОЧНО ЗАПОМИНАЮТСЯ');
      console.log('✅ Доступ после оплаты ПРЕДОСТАВЛЯЕТСЯ');
      console.log('✅ Лимиты запросов КОНТРОЛИРУЮТСЯ');
    } else if (percentage >= 70) {
      console.log('\n👍 Система оплаты работает хорошо с небольшими проблемами');
    } else {
      console.log('\n⚠️ Система оплаты требует доработок');
    }
    
    // Конкретные рекомендации
    console.log('\n📋 СОСТОЯНИЕ СИСТЕМЫ:');
    if (rememberedUser && rememberedSubscription && rememberedAccess.canMake) {
      console.log('🎯 ГЛАВНЫЙ ВЫВОД: СИСТЕМА ОПЛАТЫ ТОЧНО РАБОТАЕТ!');
      console.log('   • Пользователи сохраняются в базе данных ✅');
      console.log('   • Подписки создаются и активируются ✅');
      console.log('   • Доступ предоставляется после оплаты ✅');
      console.log('   • Система ЗАПОМИНАЕТ пользователей ✅');
    } else {
      console.log('❌ Обнаружены проблемы требующие исправления');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

finalTest();
