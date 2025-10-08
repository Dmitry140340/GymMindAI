import fetch from 'node-fetch';

// Тестовый webhook от YooKassa
const testWebhook = {
  type: "notification",
  event: "payment.succeeded",
  object: {
    id: "test-" + Date.now(),
    status: "succeeded",
    amount: {
      value: "150.00",
      currency: "RUB"
    },
    metadata: {
      telegram_id: "659874549",
      plan_type: "basic"
    },
    created_at: new Date().toISOString(),
    paid: true
  }
};

console.log('📤 Отправка тестового webhook...\n');
console.log(JSON.stringify(testWebhook, null, 2));

try {
  const response = await fetch('http://localhost:3004/webhook/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testWebhook)
  });

  const result = await response.text();
  console.log('\n✅ Ответ сервера:', response.status);
  console.log('📥 Тело ответа:', result);
} catch (error) {
  console.error('\n❌ Ошибка:', error.message);
}
