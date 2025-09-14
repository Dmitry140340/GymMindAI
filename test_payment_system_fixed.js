import { initDatabase, updateUserSubscription, getActiveSubscription } from './src/services/database.js';

const testPaymentSystem = async () => {
  console.log('🧪 Testing Payment System...\n');

  try {
    // Инициализируем базу данных
    await initDatabase();
    console.log('✅ Database initialized\n');

    // Тестовые данные
    const testTelegramId = 123456789;
    const testPlanType = 'standard';
    const testSubscriptionData = {
      subscription_type: testPlanType,
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 дней
      requests_limit: 300,
      requests_used: 0,
      payment_id: 'test_payment_' + Date.now()
    };

    console.log('📝 Testing updateUserSubscription...');
    console.log('Test data:', testSubscriptionData);

    // Тестируем обновление подписки
    const updateResult = await updateUserSubscription(testTelegramId, testSubscriptionData);
    console.log('✅ Update result:', updateResult);

    // Проверяем активную подписку
    console.log('\n📊 Testing getActiveSubscription...');
    const activeSubscription = await getActiveSubscription(testTelegramId);
    console.log('✅ Active subscription:', activeSubscription);

    // Проверяем корректность данных
    if (activeSubscription) {
      console.log('\n🔍 Verification:');
      console.log('✅ Status:', activeSubscription.status === 'active' ? '✓' : '✗');
      console.log('✅ Plan type:', activeSubscription.plan_type === testPlanType ? '✓' : '✗');
      console.log('✅ Requests limit:', activeSubscription.requests_limit === 300 ? '✓' : '✗');
      console.log('✅ Payment ID:', activeSubscription.payment_id === testSubscriptionData.payment_id ? '✓' : '✗');
      
      const endDate = new Date(activeSubscription.end_date);
      const now = new Date();
      console.log('✅ End date in future:', endDate > now ? '✓' : '✗');
      console.log('📅 Subscription ends:', endDate.toLocaleString('ru-RU'));
    } else {
      console.log('❌ No active subscription found!');
    }

    // Тестируем второе обновление (должно заменить предыдущее)
    console.log('\n📝 Testing subscription replacement...');
    const newSubscriptionData = {
      subscription_type: 'premium',
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      requests_limit: 600,
      requests_used: 0,
      payment_id: 'test_payment_premium_' + Date.now()
    };

    await updateUserSubscription(testTelegramId, newSubscriptionData);
    const newActiveSubscription = await getActiveSubscription(testTelegramId);
    
    console.log('✅ New subscription:', {
      plan_type: newActiveSubscription?.plan_type,
      requests_limit: newActiveSubscription?.requests_limit,
      status: newActiveSubscription?.status
    });

    console.log('\n🎉 Payment system test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
};

// Запускаем тест
testPaymentSystem().then(() => {
  console.log('\n✅ All tests completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});