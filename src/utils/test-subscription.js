// Простая проверка функции getActiveSubscription
import { initDatabase, getActiveSubscription } from '../services/database.js';

async function testSubscription() {
  try {
    console.log('🔧 Инициализируем базу данных...');
    await initDatabase();
    console.log('✅ База данных инициализирована');
    
    console.log('🔍 Проверяем подписку для пользователя 55...');
    const subscription = await getActiveSubscription(55);
    console.log('📋 Результат:', subscription);
    
    if (subscription) {
      console.log('✅ Подписка найдена:', {
        id: subscription.id,
        status: subscription.status,
        plan_type: subscription.plan_type,
        end_date: subscription.end_date
      });
    } else {
      console.log('❌ Подписка не найдена');
    }
  } catch (error) {
    console.error('💥 Ошибка при проверке подписки:', error);
  }
  
  process.exit(0);
}

testSubscription();
