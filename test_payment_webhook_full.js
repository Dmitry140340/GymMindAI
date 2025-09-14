import { handlePaymentWebhook } from './src/services/payment.js';
import { initDatabase } from './src/services/database.js';

// Инициализируем базу данных
await initDatabase();
console.log('💾 Database initialized for testing');

const bot = { sendMessage: (id, msg) => console.log(`📱 Bot message to ${id}: ${msg}`) };

async function testPaymentWebhook() {
  console.log('🧪 Testing complete payment webhook flow...\n');

  // Симуляция webhook данных от YooKassa
  const webhookBody = {
    type: 'notification',
    event: 'payment.succeeded',
    object: {
      id: 'test_payment_12345',
      status: 'succeeded',
      amount: {
        value: '199.00',
        currency: 'RUB'
      },
      metadata: {
        telegram_id: '12345',
        plan_type: 'premium',
        subscription_end: '2024-02-01 15:20:00'
      },
      created_at: '2024-01-01T15:20:00.000Z',
      payment_method: {
        type: 'bank_card',
        card: {
          last4: '4444'
        }
      }
    }
  };

  try {
    console.log('📥 Processing webhook...');
    const result = await handlePaymentWebhook(webhookBody, bot);
    
    console.log('\n✅ Webhook processing result:', result);
    console.log('\n🎉 Payment webhook test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Webhook test failed:', error);
  }
}

testPaymentWebhook();
