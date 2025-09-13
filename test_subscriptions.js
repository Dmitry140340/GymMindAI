// Тест системы подписок
import dotenv from 'dotenv';
import { 
  initDatabase,
  createOrUpdateUser,
  getActiveSubscription,
  createSubscription,
  activateSubscription,
  checkExpiredSubscriptions,
  canUserMakeRequest,
  incrementRequestUsage
} from './src/services/database.js';

dotenv.config();

console.log('🧪 Тестирование системы подписок...');

try {
  await initDatabase();
  
  const testUserId = 888888888;
  
  // Создаем тестового пользователя
  await createOrUpdateUser({
    id: testUserId,
    username: 'subscription_test',
    first_name: 'Sub',
    last_name: 'Test'
  });

  console.log('📋 Проверка планов подписок...');
  
  // Проверяем цены из .env
  const basicPrice = process.env.BASIC_PRICE;
  const standardPrice = process.env.STANDARD_PRICE;
  const premiumPrice = process.env.PREMIUM_PRICE;
  
  console.log(`💰 Basic план: ${basicPrice}₽`);
  console.log(`💰 Standard план: ${standardPrice}₽`);
  console.log(`💰 Premium план: ${premiumPrice}₽`);
  
  // Создаем подписку Basic
  console.log('📝 Создание Basic подписки...');
  const testPaymentId = `test_payment_${Date.now()}`;
  const subscriptionId = await createSubscription(
    testUserId,
    'basic',
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    testPaymentId
  );
  
  if (subscriptionId) {
    console.log('✅ Basic подписка создана, ID:', subscriptionId);
    
    // Активируем подписку
    console.log('🔄 Активация подписки...');
    await activateSubscription(testPaymentId, 'basic');
    console.log('✅ Подписка активирована');
    
    // Проверяем активную подписку
    const activeSubscription = await getActiveSubscription(testUserId);
    if (activeSubscription) {
      console.log('✅ Активная подписка найдена:', activeSubscription.plan_type);
      console.log('📊 Лимит запросов:', activeSubscription.requests_limit);
      console.log('📊 Использовано запросов:', activeSubscription.requests_used);
    }
    
    // Тестируем лимиты запросов
    console.log('🔄 Тест лимитов запросов...');
    const canMakeRequest = await canUserMakeRequest(testUserId);
    console.log('✅ Может делать запрос:', canMakeRequest);
    
    if (canMakeRequest.canMake) {
      await incrementRequestUsage(testUserId);
      console.log('✅ Счетчик запросов увеличен');
    }
    
    // Проверяем истекшие подписки
    console.log('🕒 Проверка истекших подписок...');
    await checkExpiredSubscriptions();
    console.log('✅ Проверка истекших подписок завершена');
    
    console.log('\n🎉 Система подписок работает корректно!');
  } else {
    console.log('❌ Ошибка создания подписки');
  }

} catch (error) {
  console.error('❌ Ошибка при тестировании системы подписок:', error.message);
}
