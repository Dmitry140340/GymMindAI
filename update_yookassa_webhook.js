import axios from 'axios';

async function updateYooKassaWebhook() {
    console.log('🔄 Обновляю webhook URL в YooKassa через API...');
    
    // Используем продакшн данные
    const shopId = '1158662';
    const secretKey = 'live_E2dE-ecYsexDzsBT-AzkDNeZ2HWPCBGQ52yPO6LdnIs';
    const newWebhookUrl = 'http://85.198.80.51:3005/webhook/payment';
    
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    
    try {
        console.log('📋 Получаю список существующих webhook\'ов...');
        
        const listResponse = await axios.get('https://api.yookassa.ru/v3/webhooks', {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'FitnessBotAI/1.0'
            }
        });
        
        console.log('📄 Найдено webhook\'ов:', listResponse.data.items?.length || 0);
        
        if (listResponse.data.items) {
            for (const webhook of listResponse.data.items) {
                console.log(`📍 Существующий: ${webhook.url} (ID: ${webhook.id})`);
                
                // Удаляем старые webhook'ы
                if (webhook.url.includes('3004') || webhook.url !== newWebhookUrl) {
                    console.log(`🗑️ Удаляю старый webhook: ${webhook.id}`);
                    try {
                        await axios.delete(`https://api.yookassa.ru/v3/webhooks/${webhook.id}`, {
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'User-Agent': 'FitnessBotAI/1.0'
                            }
                        });
                        console.log('✅ Удален успешно');
                    } catch (delError) {
                        console.log('⚠️ Ошибка удаления:', delError.response?.data?.description || delError.message);
                    }
                }
            }
        }
        
        console.log(`📍 Создаю новый webhook: ${newWebhookUrl}`);
        
        const createResponse = await axios.post('https://api.yookassa.ru/v3/webhooks', {
            event: 'payment.succeeded',
            url: newWebhookUrl
        }, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'User-Agent': 'FitnessBotAI/1.0',
                'Idempotence-Key': `webhook-${Date.now()}`
            }
        });
        
        console.log('✅ Webhook успешно создан!');
        console.log('🎯 ID:', createResponse.data.id);
        console.log('🌐 URL:', createResponse.data.url);
        console.log('📅 Событие:', createResponse.data.event);
        
        // Проверяем, что webhook работает
        console.log('\n🧪 Тестирую доступность нового webhook...');
        const testResponse = await axios.get(newWebhookUrl);
        console.log('✅ Webhook отвечает:', testResponse.data.message);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении webhook:');
        console.error('📝 Описание:', error.response?.data?.description || error.message);
        console.error('🔍 Детали:', JSON.stringify(error.response?.data, null, 2));
        return false;
    }
}

// Запускаем обновление
updateYooKassaWebhook().then(success => {
    if (success) {
        console.log('\n🎉 Webhook успешно обновлен! Теперь платежи будут приходить на новый URL.');
    } else {
        console.log('\n💡 Возможные решения:');
        console.log('1. Проверить правильность shop_id и secret_key');
        console.log('2. Убедиться что аккаунт имеет права на управление webhook\'ами');
        console.log('3. Обратиться в поддержку YooKassa для настройки webhook\'а');
    }
});