import axios from 'axios';

async function testReturnUrl() {
    console.log('🧪 Тестирую return_url после исправлений...');
    
    const testPaymentData = {
        amount: { value: '100.00', currency: 'RUB' },
        confirmation: { 
            type: 'redirect', 
            return_url: 'https://t.me/FitnessTrainerAI_bot' 
        },
        description: 'Тест return_url - исправленная версия',
        metadata: {
            telegram_id: '123456789',
            user_name: 'Test Return URL'
        }
    };
    
    try {
        const shopId = process.env.YOOKASSA_TEST_SHOP_ID || '1139867';
        const secretKey = process.env.YOOKASSA_TEST_SECRET_KEY || 'test_hczBNmYmZ4vs8QaSMsyGHFdtU_3X039YoTcFS4L7DMo';
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        
        const paymentResponse = await axios.post('https://api.yookassa.ru/v3/payments', testPaymentData, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Idempotence-Key': `test-return-${Date.now()}`
            }
        });
        
        console.log('✅ Платеж создан!');
        console.log('💰 ID:', paymentResponse.data.id);
        console.log('🔗 Ссылка для оплаты:', paymentResponse.data.confirmation?.confirmation_url);
        console.log('🏠 Return URL будет:', paymentResponse.data.confirmation?.return_url || testPaymentData.confirmation.return_url);
        
        console.log('\n🎯 Теперь при нажатии "Вернуться на сайт" должно правильно переводить в бота @FitnessTrainerAI_bot!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
    }
}

testReturnUrl();