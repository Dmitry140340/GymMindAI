import axios from 'axios';

async function finalTest() {
    console.log('🧪 Финальный тест системы оплаты');
    
    const testData = {
        type: 'notification',
        event: 'payment.succeeded',
        object: {
            id: `test_final_${Date.now()}`,
            status: 'succeeded',
            paid: true,
            amount: {
                value: '300.00',
                currency: 'RUB'
            },
            metadata: {
                telegram_id: '659874549',
                plan_type: 'standard',
                requests_limit: '300'
            },
            created_at: new Date().toISOString(),
            captured_at: new Date().toISOString()
        }
    };

    try {
        console.log('📤 Отправка данных на webhook...');
        const response = await axios.post('https://85.198.80.51/webhook/payment', testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        console.log('✅ Успешно!');
        console.log('📨 Ответ:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('🎉 Платеж обработан:');
            console.log(`👤 Пользователь: ${response.data.result.telegramId}`);
            console.log(`📦 План: ${response.data.result.planType}`);
        }
        
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        if (error.response) {
            console.log('📄 Ответ сервера:', error.response.data);
        }
    }
}

finalTest();