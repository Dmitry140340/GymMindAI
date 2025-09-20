import axios from 'axios';

async function testOriginalPortPayment() {
    console.log('🧪 Тестирую платеж с оригинальным портом 3004...');
    
    const testPaymentData = {
        amount: { value: '100.00', currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: 'http://85.198.80.51:3004/' },
        description: 'Тест - порт 3004 восстановлен',
        metadata: {
            telegram_id: '123456789',
            user_name: 'Test User Port 3004'
        }
    };
    
    try {
        // Проверяем доступность webhook
        console.log('🔍 Проверяю webhook на порту 3004...');
        const webhookResponse = await axios.get('http://85.198.80.51:3004/webhook/payment');
        console.log('✅ Webhook отвечает:', webhookResponse.data.message);
        
        // Создаем тестовый платеж
        const shopId = process.env.YOOKASSA_TEST_SHOP_ID || '1139867';
        const secretKey = process.env.YOOKASSA_TEST_SECRET_KEY || 'test_hczBNmYmZ4vs8QaSMsyGHFdtU_3X039YoTcFS4L7DMo';
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        
        console.log('💳 Создаю тестовый платеж...');
        const paymentResponse = await axios.post('https://api.yookassa.ru/v3/payments', testPaymentData, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Idempotence-Key': `test-3004-${Date.now()}`
            }
        });
        
        console.log('✅ Платеж создан успешно!');
        console.log('💰 ID платежа:', paymentResponse.data.id);
        console.log('🔗 Ссылка для оплаты:', paymentResponse.data.confirmation?.confirmation_url);
        
        console.log('\n🎯 ИТОГ: Бот работает на оригинальном порту 3004');
        console.log('📍 Webhook URL: http://85.198.80.51:3004/webhook/payment ✅');
        console.log('🚀 Готов к приему платежей от YooKassa');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.response?.data || error.message);
    }
}

testOriginalPortPayment();