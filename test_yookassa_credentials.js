// Тест проверки YooKassa credentials
import axios from 'axios';

console.log('🔍 Тестирование YooKassa API credentials...\n');

const SHOP_ID = '1158662';
const SECRET_KEY = 'live_Xm-pxAfO7W6qgQWzD-0GlDX7xdCyVF3lzZDHuF8wBKE';

// Создаем базовую авторизацию
const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

console.log('📋 Данные для проверки:');
console.log(`🏪 Shop ID: ${SHOP_ID}`);
console.log(`🔑 Secret Key: ${SECRET_KEY.substring(0, 20)}...`);
console.log(`🔐 Auth Header: Basic ${auth.substring(0, 30)}...\n`);

// Тестовый запрос - получение информации о магазине
async function testYooKassaCredentials() {
  try {
    console.log('🚀 Отправляем тестовый запрос к YooKassa API...');
    
    const response = await axios.get('https://api.yookassa.ru/v3/me', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Успех! Credentials работают.');
    console.log('📊 Информация о магазине:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Ошибка при тестировании credentials:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.status === 401) {
      console.log('\n🚨 Ошибка 401: Неверные credentials!');
      console.log('💡 Рекомендации:');
      console.log('1. Проверьте Shop ID в личном кабинете YooKassa');
      console.log('2. Перевыпустите Secret Key в разделе "Настройки" → "Ключи API"');
      console.log('3. Убедитесь, что используете ПРОДАКШН ключи, а не тестовые');
    }
  }
}

// Дополнительная проверка - создание тестового платежа
async function testPaymentCreation() {
  try {
    console.log('\n🧪 Тестируем создание платежа...');
    
    const paymentData = {
      amount: {
        value: "1.00",
        currency: "RUB"
      },
      confirmation: {
        type: "redirect",
        return_url: "https://example.com"
      },
      capture: true,
      description: "Тестовый платеж для проверки credentials"
    };
    
    const response = await axios.post('https://api.yookassa.ru/v3/payments', paymentData, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': Math.random().toString(36).substring(2, 15)
      }
    });
    
    console.log('✅ Платеж создан успешно!');
    console.log('💳 Payment ID:', response.data.id);
    console.log('🔗 Payment URL:', response.data.confirmation?.confirmation_url);
    
  } catch (error) {
    console.log('❌ Ошибка создания платежа:');
    console.log('Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Запускаем тесты
await testYooKassaCredentials();
await testPaymentCreation();

console.log('\n🏁 Тестирование завершено.');
