import axios from 'axios';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Конфигурация для тестирования
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://85.198.80.51/webhook/payment'; // Изменено на стандартный HTTPS порт  
const TEST_TELEGRAM_ID = process.env.TEST_TELEGRAM_ID || '659874549';

async function testWebhookPayment() {
    console.log('🧪 Тестирование обработки webhook платежа\n');
    console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
    console.log(`👤 Test Telegram ID: ${TEST_TELEGRAM_ID}\n`);
    
    // Тестовые данные платежа от YooKassa
    const webhookData = {
        type: 'notification',
        event: 'payment.succeeded',
        object: {
            id: `test_payment_${Date.now()}`,
            status: 'succeeded',
            paid: true,
            amount: {
                value: '300.00',
                currency: 'RUB'
            },
            metadata: {
                telegram_id: TEST_TELEGRAM_ID,
                plan_type: 'standard',
                requests_limit: '300'
            },
            payment_method: {
                type: 'bank_card',
                id: 'test_method_123'
            },
            created_at: new Date().toISOString(),
            captured_at: new Date().toISOString()
        }
    };
    
    try {
        console.log('📤 Отправка тестового webhook...');
        console.log('📦 Данные:', JSON.stringify(webhookData, null, 2));
        
        // Отправляем на сервер
        const response = await axios.post(
            WEBHOOK_URL,
            webhookData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'YooKassa/Webhook-Test'
                },
                timeout: 10000
            }
        );
        
        console.log('\n✅ Webhook успешно обработан!');
        console.log('📨 Ответ сервера:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('🎉 Платеж успешно обработан:');
            console.log(`👤 Пользователь: ${response.data.result.telegramId}`);
            console.log(`📦 План: ${response.data.result.planType}`);
            console.log(`💳 ID платежа: ${response.data.result.paymentId}`);
            console.log(`🆔 ID подписки: ${response.data.result.subscriptionId}`);
        }
        
        console.log('\n💡 Проверьте Telegram - должно прийти уведомление об успешной оплате');
        
    } catch (error) {
        console.error('\n❌ Ошибка при отправке webhook:');
        
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('📡 Нет ответа от сервера. Убедитесь, что сервер запущен на:', WEBHOOK_URL);
        } else {
            console.error('Сообщение:', error.message);
        }
    }
}

// Тест всех типов планов
async function testAllPlans() {
    const plans = [
        { type: 'basic', price: '150.00', requests: 100, name: 'Базовый' },
        { type: 'standard', price: '300.00', requests: 300, name: 'Стандартный' },
        { type: 'premium', price: '450.00', requests: 600, name: 'Премиум' }
    ];
    
    console.log('🧪 Тестирование всех типов планов...\n');
    
    for (const plan of plans) {
        console.log(`📦 Тестируем план: ${plan.name} (${plan.type})`);
        
        const testData = {
            type: 'notification',
            event: 'payment.succeeded',
            object: {
                id: `test_${plan.type}_${Date.now()}`,
                status: 'succeeded',
                paid: true,
                amount: {
                    value: plan.price,
                    currency: 'RUB'
                },
                metadata: {
                    telegram_id: TEST_TELEGRAM_ID,
                    plan_type: plan.type,
                    requests_limit: plan.requests.toString()
                },
                created_at: new Date().toISOString(),
                captured_at: new Date().toISOString()
            }
        };
        
        try {
            const response = await axios.post(WEBHOOK_URL, testData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            
            if (response.data.success) {
                console.log(`✅ План ${plan.name} успешно обработан`);
            } else {
                console.log(`❌ Ошибка обработки плана ${plan.name}:`, response.data.error);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка для плана ${plan.name}:`, error.message);
        }
        
        // Небольшая пауза между тестами
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('');
    }
}

// Основная функция
async function runTests() {
    console.log('🚀 Запуск тестирования webhook для платежей\n');
    console.log('===========================================\n');
    console.log('⚠️ Убедитесь, что бот запущен (npm start)\n');
    
    try {
        // Небольшая задержка для готовности сервера
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Основной тест
        await testWebhookPayment();
        
        console.log('\n===========================================\n');
        
        // Тест всех планов
        await testAllPlans();
        
        console.log('🏁 Тестирование завершено успешно!');
        
    } catch (error) {
        console.error('💥 Критическая ошибка тестирования:', error.message);
    }
}

// Запускаем тесты
runTests();
