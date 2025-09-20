import axios from 'axios';

async function setupProductionWebhook() {
    console.log('🔧 Настраиваю webhook для продакшн YooKassa...\n');
    
    // Пробуем разные возможные ключи
    const configs = [
        {
            shopId: '1158662',
            secretKey: 'live_E2dE-ecYsexDzsBT-AzkDNeZ2HWPCBGQ52yPO6LdnIs', // из payment.js
            name: 'из кода payment.js'
        },
        {
            shopId: '1158662', 
            secretKey: 'live_PLJj9G4q3PUtNqsedfXyS7p5OAJh34w0Z1Pk2lr4tXc', // из .env
            name: 'из .env файла'
        }
    ];
    
    for (const config of configs) {
        try {
            console.log(`🔑 Пробую ключи: ${config.name}`);
            
            const auth = Buffer.from(`${config.shopId}:${config.secretKey}`).toString('base64');
            
            // Сначала получаем список существующих webhook'ов
            const listResponse = await axios.get('https://api.yookassa.ru/v3/webhooks', {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Авторизация успешна!');
            console.log(`📋 Найдено webhook'ов: ${listResponse.data.items?.length || 0}`);
            
            if (listResponse.data.items) {
                listResponse.data.items.forEach((webhook, index) => {
                    console.log(`${index + 1}. Event: ${webhook.event}, URL: ${webhook.url}`);
                });
            }
            
            // Создаем новый webhook если нужно
            const webhookUrl = 'http://85.198.80.51:3004/webhook/payment';
            const existingWebhook = listResponse.data.items?.find(w => w.url === webhookUrl);
            
            if (!existingWebhook) {
                console.log(`\n📍 Создаю webhook: ${webhookUrl}`);
                
                const createResponse = await axios.post('https://api.yookassa.ru/v3/webhooks', {
                    event: 'payment.succeeded',
                    url: webhookUrl
                }, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json',
                        'Idempotence-Key': `webhook-prod-${Date.now()}`
                    }
                });
                
                console.log('✅ Webhook создан успешно!');
                console.log('🆔 ID:', createResponse.data.id);
                
            } else {
                console.log(`✅ Webhook уже существует: ${existingWebhook.id}`);
            }
            
            break; // Если успешно, выходим из цикла
            
        } catch (error) {
            console.log(`❌ Ошибка с ключами "${config.name}":`, error.response?.data?.description || error.message);
            continue; // Пробуем следующую конфигурацию
        }
    }
    
    console.log('\n💡 Если webhook не настраивается автоматически:');
    console.log('1. Зайдите в панель YooKassa: https://yookassa.ru/my/');
    console.log('2. Настройки → Уведомления → HTTP-уведомления');
    console.log('3. Добавьте URL: http://85.198.80.51:3004/webhook/payment');
    console.log('4. Событие: payment.succeeded');
}

setupProductionWebhook();