import axios from 'axios';

async function simulateYooKassaWebhook() {
    try {
        console.log('🧪 Имитирую webhook от YooKassa для тестирования обработчика...\n');
        
        // Данные webhook как от YooKassa
        const webhookData = {
            "type": "notification",
            "event": "payment.succeeded",
            "object": {
                "id": "3060ce1c-000f-5000-b000-15585f42843d",
                "status": "succeeded", 
                "amount": {
                    "value": "150.00",
                    "currency": "RUB"
                },
                "description": "Базовый план - 100 запросов для Telegram ID: 659874549",
                "recipient": {
                    "account_id": "1158662",
                    "gateway_id": "2524324"
                },
                "payment_method": {
                    "type": "bank_card",
                    "id": "3060ce1c-000f-5000-b000-15585f42843d",
                    "saved": false,
                    "title": "Bank card **** 1234"
                },
                "captured_at": new Date().toISOString(),
                "created_at": "2025-09-20T14:29:48.938Z",
                "test": false,
                "refunded": {
                    "value": "0.00",
                    "currency": "RUB"
                },
                "paid": true,
                "refundable": true,
                "receipt_registration": "pending",
                "metadata": {
                    "telegram_id": "659874549",
                    "plan_type": "basic", 
                    "requests_limit": "100"
                },
                "authorization_details": {
                    "rrn": "123456789012",
                    "auth_code": "123456"
                }
            }
        };
        
        console.log('📤 Отправляю webhook на сервер...');
        
        const response = await axios.post('http://85.198.80.51:3004/webhook/payment', webhookData, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'YooMoney/Checkout'
            }
        });
        
        console.log('✅ Ответ сервера:', response.status);
        console.log('📄 Данные ответа:', response.data);
        
        console.log('\n🔍 Теперь проверим, создалась ли подписка в БД...');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        if (error.response) {
            console.error('📊 Статус:', error.response.status);
            console.error('📄 Данные ошибки:', error.response.data);
        }
    }
}

simulateYooKassaWebhook();