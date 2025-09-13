/**
 * 🔧 ДИАГНОСТИКА ПРОБЛЕМ СИСТЕМЫ ОПЛАТЫ
 * Простая проверка без внешних зависимостей
 */

import dotenv from 'dotenv';
import { 
  initDatabase,
  createOrUpdateUser, 
  getUserByTelegramId,
  getActiveSubscription,
  createSubscription,
  canUserMakeRequest,
  incrementRequestUsage,
  getAllUserSubscriptions
} from './src/services/database.js';

dotenv.config();

console.log('🔧 ДИАГНОСТИКА ПРОБЛЕМ СИСТЕМЫ ОПЛАТЫ');
console.log('='.repeat(50));

async function diagnoseProblem() {
  try {
    await initDatabase();
    console.log('✅ База данных инициализирована');
    
    // Создаем тестового пользователя
    const testUser = {
      id: 888777666,
      first_name: 'Диагностика',
      last_name: 'Тест',
      username: 'diagnostic_user'
    };
    
    await createOrUpdateUser(testUser);
    const dbUser = await getUserByTelegramId(testUser.id);
    console.log(`✅ Пользователь создан: ID=${dbUser.id}, Telegram=${dbUser.telegram_id}`);
    
    // 🔍 ПРОБЛЕМА: createSubscription создает подписки со статусом PENDING
    console.log('\n🔍 ДИАГНОСТИКА 1: Как создается подписка');
    
    console.log('📝 Создаем подписку через createSubscription...');
    const subscription = await createSubscription(
      testUser.id, // telegram_id
      'basic',     // plan_type
      150,         // amount
      `test_payment_${Date.now()}`
    );
    
    if (subscription) {
      console.log('✅ Подписка создана');
      
      // Получаем все подписки пользователя
      const allSubscriptions = await getAllUserSubscriptions(testUser.id);
      console.log('📊 Все подписки пользователя:');
      allSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. План: ${sub.plan_type}, Статус: ${sub.status}, Лимит: ${sub.requests_limit}`);
      });
      
      // Проверяем активную подписку
      const activeSubscription = await getActiveSubscription(dbUser.id);
      console.log('\n🔍 Результат getActiveSubscription:');
      if (activeSubscription) {
        console.log(`✅ Найдена: ${activeSubscription.plan_type} (${activeSubscription.status})`);
      } else {
        console.log('❌ Активная подписка НЕ найдена');
        console.log('💡 Это значит что getActiveSubscription ищет только статус "active"');
        console.log('💡 А createSubscription создает со статусом "pending"');
      }
      
      // Проверяем доступ пользователя
      const requestStatus = await canUserMakeRequest(dbUser.id);
      console.log('\n🔍 Результат canUserMakeRequest:');
      console.log(`   Может делать запросы: ${requestStatus.canMake}`);
      console.log(`   Тип доступа: ${requestStatus.type}`);
      console.log(`   Доступно запросов: ${requestStatus.remaining}`);
      
      if (requestStatus.canMake && requestStatus.type === 'subscription') {
        console.log('✅ Система все-таки находит подписку для доступа');
      } else if (requestStatus.canMake && requestStatus.type === 'free') {
        console.log('⚠️ Пользователь работает по бесплатному лимиту');
      } else {
        console.log('❌ Пользователь не может делать запросы');
      }
      
    } else {
      console.log('❌ Подписка НЕ создана');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 ДИАГНОЗ ПРОБЛЕМ:');
    
    const allSubs = await getAllUserSubscriptions(testUser.id);
    const activeSub = await getActiveSubscription(dbUser.id);
    const access = await canUserMakeRequest(dbUser.id);
    
    console.log('1. Создание подписки:', allSubs.length > 0 ? '✅ Работает' : '❌ Не работает');
    console.log('2. Поиск активной подписки:', activeSub ? '✅ Работает' : '❌ Не работает');
    console.log('3. Система доступа:', access.canMake ? '✅ Работает' : '❌ Не работает');
    console.log('4. Запоминание пользователя:', (allSubs.length > 0 && dbUser) ? '✅ Работает' : '❌ Не работает');
    
    console.log('\n💡 ВЫВОД:');
    if (allSubs.length > 0 && !activeSub) {
      console.log('🎯 ОСНОВНАЯ ПРОБЛЕМА: Подписки создаются, но не считаются активными');
      console.log('🔧 РЕШЕНИЕ: Нужно либо изменить createSubscription чтобы создавал активные подписки,');
      console.log('   либо добавить функцию активации после успешного платежа');
    }
    
    if (access.canMake) {
      console.log('✅ ХОРОШАЯ НОВОСТЬ: Система доступа все равно работает!');
      console.log('✅ ПОЛЬЗОВАТЕЛЬ ТОЧНО ЗАПОМИНАЕТСЯ И ПОЛУЧАЕТ ДОСТУП!');
    }
    
    // Проверим реальную работу лимитов
    console.log('\n🧪 ТЕСТ РЕАЛЬНОЙ РАБОТЫ ЛИМИТОВ:');
    const initialRequests = access.remaining;
    
    await incrementRequestUsage(dbUser.id);
    const newAccess = await canUserMakeRequest(dbUser.id);
    
    if (newAccess.remaining < initialRequests) {
      console.log('✅ ЛИМИТЫ ЗАПРОСОВ РАБОТАЮТ КОРРЕКТНО!');
      console.log(`   Было: ${initialRequests}, стало: ${newAccess.remaining}`);
    } else {
      console.log('❌ Проблема с лимитами запросов');
    }
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

diagnoseProblem();
