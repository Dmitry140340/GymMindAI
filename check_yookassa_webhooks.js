import axios from 'axios';

async function checkYooKassaWebhooks() {
    try {
        console.log('🔍 Проверяю настройки webhook в YooKassa...\n');
        
        const shopId = '1158662';
        const secretKey = 'live_PLJj9G4q3PUtNqsedfXyS7p5OAJh34w0Z1Pk2lr4tXc';
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        
        // Получаем список webhook'ов
        const response = await axios.get('https://api.yookassa.ru/v3/webhooks', {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📋 Настроенные webhook\'ы:');
        
        if (response.data.items && response.data.items.length > 0) {
            response.data.items.forEach((webhook, index) => {
                console.log(`${index + 1}. 🎯 Event: ${webhook.event}`);
                console.log(`   🔗 URL: ${webhook.url}`);
                console.log(`   🆔 ID: ${webhook.id}`);
                console.log('');
            });
        } else {
            console.log('❌ Webhook\'ы не настроены!');
            console.log('\n💡 Нужно создать webhook для payment.succeeded');
            console.log(`📍 URL: http://85.198.80.51:3004/webhook/payment`);
        }
        
        // Проверяем конкретный платеж
        const paymentId = '3060ce1c-000f-5000-b000-15585f42843d';
        console.log(`\n🔍 Проверяю статус платежа ${paymentId}:`);
        
        const paymentResponse = await axios.get(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        const payment = paymentResponse.data;
        console.log(`💰 Статус: ${payment.status}`);
        console.log(`💵 Сумма: ${payment.amount.value} ${payment.amount.currency}`);
        console.log(`📅 Создан: ${payment.created_at}`);
        if (payment.paid) {
            console.log(`✅ Оплачен: ${payment.captured_at || 'да'}`);
        } else {
            console.log('⏳ Ожидает оплаты');
        }
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.error('❌ Ошибка авторизации - проверьте shop_id и secret_key');
        } else {
            console.error('❌ Ошибка:', error.response?.data || error.message);
        }
    }
}

checkYooKassaWebhooks();