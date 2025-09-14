import { handlePaymentWebhook } from './src/services/payment.js';
import { initDatabase, getActiveSubscription } from './src/services/database.js';

// Мокаем бота для тестирования
const mockBot = {
  sendMessage: async (chatId, message, options) => {
    console.log(`📨 [MOCK BOT] Sending message to ${chatId}:`);
    console.log(`📝 Message: ${message}`);
    if (options) {
      console.log(`⚙️ Options:`, JSON.stringify(options, null, 2));
    }
    return { message_id: Math.random() * 1000 };
  }
};

const testWebhookHandler = async () => {
  console.log('🧪 Testing Webhook Handler...\n');

  try {
    // Инициализируем базу данных
    await initDatabase();
    console.log('✅ Database initialized\n');

    // Тестовые данные webhook от YooKassa
    const testWebhookData = {
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: 'test_payment_webhook_' + Date.now(),
        status: 'succeeded',
        paid: true,
        amount: {
          value: '300.00',
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect'
        },
        created_at: new Date().toISOString(),
        description: 'Стандартный план - 300 запросов для Telegram ID: 987654321',
        metadata: {
          telegram_id: '987654321',
          plan_type: 'standard',
          requests_limit: '300'
        },
        payment_method: {
          type: 'bank_card',
          id: 'test_payment_method',
          saved: false,
          card: {
            first6: '555555',
            last4: '4444',
            expiry_month: '12',
            expiry_year: '25',
            card_type: 'MasterCard'
          },
          title: 'Bank card *4444'
        },
        recipient: {
          account_id: '1139867',
          gateway_id: '1987654'
        }
      }
    };

    console.log('📦 Test webhook data:', JSON.stringify(testWebhookData, null, 2));
    console.log('\n📝 Processing webhook...');

    // Обрабатываем webhook
    const result = await handlePaymentWebhook(testWebhookData, mockBot);
    console.log('\n✅ Webhook processing result:', result);

    // Проверяем, что подписка была создана
    console.log('\n🔍 Verifying subscription creation...');
    const subscription = await getActiveSubscription(987654321);
    console.log('📊 Created subscription:', subscription);

    if (subscription) {
      console.log('\n✅ Subscription verification:');
      console.log('✓ Status:', subscription.status);
      console.log('✓ Plan type:', subscription.plan_type);
      console.log('✓ Requests limit:', subscription.requests_limit);
      console.log('✓ Payment ID:', subscription.payment_id);
      console.log('✓ End date:', new Date(subscription.end_date).toLocaleString('ru-RU'));
    } else {
      console.log('❌ Subscription was not created!');
    }

    // Тестируем неправильный тип события
    console.log('\n📝 Testing ignored webhook event...');
    const ignoredWebhookData = {
      ...testWebhookData,
      event: 'payment.canceled'
    };

    const ignoredResult = await handlePaymentWebhook(ignoredWebhookData, mockBot);
    console.log('✅ Ignored webhook result:', ignoredResult);

    // Тестируем webhook без метаданных
    console.log('\n📝 Testing webhook without metadata...');
    const noMetadataWebhook = {
      ...testWebhookData,
      object: {
        ...testWebhookData.object,
        metadata: {}
      }
    };

    const noMetadataResult = await handlePaymentWebhook(noMetadataWebhook, mockBot);
    console.log('✅ No metadata webhook result:', noMetadataResult);

    console.log('\n🎉 Webhook handler test completed successfully!');

  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    console.error('Stack:', error.stack);
  }
};

// Запускаем тест
testWebhookHandler().then(() => {
  console.log('\n✅ All webhook tests completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Webhook test suite failed:', error);
  process.exit(1);
});