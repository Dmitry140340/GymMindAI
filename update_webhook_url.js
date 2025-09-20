import axios from 'axios';

async function updateWebhookURL() {
    console.log('🔄 Обновляю URL webhook в настройках YooKassa...');
    
    const shopId = '1158662'; // Ваш shop ID для production
    const secretKey = process.env.YOOKASSA_PROD_SECRET_KEY || 'live_E2dE-ecYsexDzsBT-AzkDNeZ2HWPCBGQ52yPO6LdnIs';
    
    const newWebhookUrl = 'http://85.198.80.51:3005/webhook/payment';
    
    try {
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        
        // Сначала получаем список существующих webhook'ов
        console.log('📋 Получаю список webhook\'ов...');
        const listResponse = await axios.get('https://api.yookassa.ru/v3/webhooks', {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📄 Существующие webhook\'ы:', JSON.stringify(listResponse.data, null, 2));
        
        // Удаляем старые webhook'ы если есть
        if (listResponse.data.items && listResponse.data.items.length > 0) {
            for (const webhook of listResponse.data.items) {
                console.log(`🗑️ Удаляю старый webhook: ${webhook.id} - ${webhook.url}`);
                await axios.delete(`https://api.yookassa.ru/v3/webhooks/${webhook.id}`, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        }
        
        // Создаем новый webhook
        console.log(`📍 Создаю новый webhook: ${newWebhookUrl}`);
        const createResponse = await axios.post('https://api.yookassa.ru/v3/webhooks', {
            event: 'payment.succeeded',
            url: newWebhookUrl
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook успешно создан:', JSON.stringify(createResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении webhook:', error.response?.data || error.message);
    }
}

updateWebhookURL();