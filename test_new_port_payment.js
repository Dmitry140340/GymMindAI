import axios from 'axios';

async function testNewPortPayment() {
    console.log('🧪 Тестирую создание платежа с новым webhook URL...');
    
    const testPaymentData = {
        amount: { value: '100.00', currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: 'http://85.198.80.51:3005/' },
        description: 'Тест платежа - новый порт 3005',
        metadata: {
            telegram_id: '123456789',
            user_name: 'Test User'
        }
    };
    
    try {
        // Проверяем доступность webhook
        console.log('🔍 Проверяю доступность webhook...');
        const webhookResponse = await axios.get('http://85.198.80.51:3005/webhook/payment');
        console.log('✅ Webhook отвечает:', webhookResponse.data);
        
        // Создаем тестовый платеж
        const shopId = process.env.YOOKASSA_TEST_SHOP_ID || '1139867';
        const secretKey = process.env.YOOKASSA_TEST_SECRET_KEY || 'test_hczBNmYmZ4vs8QaSMsyGHFdtU_3X039YoTcFS4L7DMo';
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        
        console.log('💳 Создаю тестовый платеж...');
        const paymentResponse = await axios.post('https://api.yookassa.ru/v3/payments', testPaymentData, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Idempotence-Key': `test-${Date.now()}`
            }
        });
        
        console.log('✅ Платеж создан успешно!');
        console.log('💰 ID платежа:', paymentResponse.data.id);
        console.log('🔗 Ссылка для оплаты:', paymentResponse.data.confirmation?.confirmation_url);
        console.log('📄 Полная информация:', JSON.stringify(paymentResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.response?.data || error.message);
    }
}

testNewPortPayment();