/**
 * Скрипт для ручной активации подписки после оплаты
 * Используйте если webhook не сработал
 */

import dotenv from 'dotenv';
import { initDatabase, createOrUpdateUser, getUserByTelegramId, createSubscription, activateSubscription } from './src/services/database.js';

dotenv.config();

const PAYMENT_ID = '30787ba1-000f-5001-9000-1466f59e17bb'; // ID платежа из логов
const TELEGRAM_ID = 659874549;
const PLAN_TYPE = 'basic';
const AMOUNT = 150;

async function manualActivation() {
  console.log('🔧 РУЧНАЯ АКТИВАЦИЯ ПОДПИСКИ\n');
  console.log('='.repeat(60));
  
  try {
    // Инициализируем БД
    await initDatabase();
    console.log('✅ База данных подключена');
    
    // Проверяем пользователя
    await createOrUpdateUser({ id: TELEGRAM_ID, username: 'User', first_name: 'User' });
    const dbUser = await getUserByTelegramId(TELEGRAM_ID);
    
    if (!dbUser) {
      console.error('❌ Пользователь не найден!');
      process.exit(1);
    }
    
    console.log(`✅ Пользователь найден: ID ${dbUser.id}`);
    
    // Определяем параметры плана
    const planDetails = {
      'basic': { requests_limit: 100, name: 'Базовый' },
      'standard': { requests_limit: 300, name: 'Стандартный' },
      'premium': { requests_limit: 600, name: 'Премиум' }
    };
    
    const plan = planDetails[PLAN_TYPE];
    
    console.log(`\n📋 Создаем подписку:`);
    console.log(`   План: ${plan.name}`);
    console.log(`   Запросов: ${plan.requests_limit}`);
    console.log(`   Сумма: ${AMOUNT}₽`);
    console.log(`   Payment ID: ${PAYMENT_ID}`);
    
    // Создаем подписку (правильный порядок: telegramId, planType, amount, paymentId)
    const subscriptionId = await createSubscription(TELEGRAM_ID, PLAN_TYPE, AMOUNT, PAYMENT_ID);
    
    console.log(`✅ Подписка создана: ID ${subscriptionId}`);
    
    // Активируем подписку (передаём PAYMENT_ID, не subscriptionId!)
    await activateSubscription(PAYMENT_ID, PLAN_TYPE);
    console.log('✅ Подписка активирована!');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ПОДПИСКА УСПЕШНО АКТИВИРОВАНА!');
    console.log('='.repeat(60));
    console.log(`\n✅ Детали подписки:`);
    console.log(`   Пользователь: ${TELEGRAM_ID}`);
    console.log(`   План: ${plan.name}`);
    console.log(`   Запросов в месяц: ${plan.requests_limit}`);
    console.log(`   Сумма: ${AMOUNT}₽`);
    console.log(`   Payment ID: ${PAYMENT_ID}`);
    console.log(`   Действует: 30 дней с момента активации`);
    
    console.log('\n💡 Проверьте статус подписки в боте:');
    console.log('   💎 Подписка → 📋 Статус подписки');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ОШИБКА активации:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем активацию
manualActivation();
