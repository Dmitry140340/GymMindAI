console.log('Starting payment module with init function...');

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

console.log('All imports loaded');

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

function initializePaymentMode() {
  console.log('initializePaymentMode called');
  const mode = process.env.PAYMENT_MODE || 'test';
  let shopId, secretKey;
  
  if (mode === 'production') {
    shopId = process.env.YOOKASSA_PROD_SHOP_ID || '1048732';
    secretKey = process.env.YOOKASSA_PROD_SECRET_KEY || 'live_E2dE-ecYsexDzsBT-AzkDNeZ2HWPCBGQ52yPO6LdnIs';
    console.log('💳 Платежи: ПРОДАКШН режим (реальные платежи)');
  } else {
    shopId = process.env.YOOKASSA_TEST_SHOP_ID || '1139867';
    secretKey = process.env.YOOKASSA_TEST_SECRET_KEY || 'test_hczBNmYmZ4vs8QaSMsyGHFdtU_3X039YoTcFS4L7DMo';
    console.log('🧪 Платежи: ТЕСТОВЫЙ режим (без реальных денег)');
  }
  
  process.env.YOOKASSA_SHOP_ID = shopId;
  process.env.YOOKASSA_SECRET_KEY = secretKey;
  console.log(`🏪 Shop ID: ${shopId}`);
}

export async function handlePaymentWebhook(data, bot) {
  console.log('🔔 Payment webhook received:', JSON.stringify(data, null, 2));
  
  try {
    // Проверяем тип события
    if (data.event !== 'payment.succeeded') {
      console.log(`⚠️ Ignoring webhook event: ${data.event}`);
      return;
    }

    const payment = data.object;
    console.log('💳 Processing successful payment:', payment.id);

    // Получаем данные из metadata
    const telegramId = payment.metadata?.telegram_id;
    const planType = payment.metadata?.plan_type;
    
    if (!telegramId || !planType) {
      console.error('❌ Missing metadata in payment:', { telegramId, planType });
      return;
    }

    console.log(`✅ Payment successful for user ${telegramId}, plan: ${planType}`);

    // Определяем детали плана
    const planDetails = {
      'basic': { requests_limit: 100, name: 'Базовый' },
      'standard': { requests_limit: 300, name: 'Стандартный' },
      'premium': { requests_limit: 600, name: 'Премиум' }
    };

    const plan = planDetails[planType];
    if (!plan) {
      console.error('❌ Unknown plan type:', planType);
      return;
    }

    // Импортируем функции для работы с БД
    const { updateUserSubscription } = await import('./database.js');
    
    // Обновляем подписку пользователя
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // +1 месяц

    await updateUserSubscription(telegramId, {
      subscription_type: planType,
      subscription_end: subscriptionEnd.toISOString(),
      requests_used: 0,
      requests_limit: plan.requests_limit,
      payment_id: payment.id
    });

    console.log('💾 Subscription updated in database');

    // Отправляем уведомление пользователю
    const successMessage = `🎉 **Оплата успешно завершена!**

✅ **План:** ${plan.name}
💰 **Сумма:** ${payment.amount.value} ${payment.amount.currency}
📊 **Лимит запросов:** ${plan.requests_limit}
📅 **Действует до:** ${subscriptionEnd.toLocaleDateString('ru-RU')}

Теперь вы можете пользоваться всеми возможностями бота! 🚀`;

    await bot.sendMessage(telegramId, successMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]]
      }
    });

    console.log('📨 Success notification sent to user');

  } catch (error) {
    console.error('❌ Error processing payment webhook:', error);
  }
}

export async function createSubscriptionPayment(telegramId, planType) {
  console.log(`Creating payment for user ${telegramId}, plan: ${planType}`);
  
  try {
    // Определяем стоимость и параметры плана
    const planDetails = {
      'basic': {
        amount: process.env.BASIC_PRICE || '150',
        description: 'Базовый план - 100 запросов',
        requests_limit: 100
      },
      'standard': {
        amount: process.env.STANDARD_PRICE || '300', 
        description: 'Стандартный план - 300 запросов',
        requests_limit: 300
      },
      'premium': {
        amount: process.env.PREMIUM_PRICE || '450',
        description: 'Премиум план - 600 запросов', 
        requests_limit: 600
      }
    };

    const plan = planDetails[planType];
    if (!plan) {
      return { success: false, error: 'Неизвестный тип плана' };
    }

    // Создаем уникальный ID платежа
    const paymentId = uuidv4();
    
    // Формируем данные для YooKassa
    const paymentData = {
      amount: {
        value: plan.amount,
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: process.env.WEBHOOK_URL || 'https://t.me/your_bot_username'
      },
      capture: true,
      description: `${plan.description} для Telegram ID: ${telegramId}`,
      metadata: {
        telegram_id: telegramId.toString(),
        plan_type: planType,
        requests_limit: plan.requests_limit.toString()
      }
    };

    console.log('Payment data:', JSON.stringify(paymentData, null, 2));

    // Отправляем запрос в YooKassa
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    
    if (!shopId || !secretKey) {
      return { success: false, error: 'Не настроены ключи YooKassa' };
    }

    const authHeader = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

    const response = await axios.post(
      `${YOOKASSA_API_URL}/payments`,
      paymentData,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
          'Idempotence-Key': paymentId
        },
        timeout: 30000
      }
    );

    console.log('YooKassa response:', response.data);

    if (response.data && response.data.confirmation && response.data.confirmation.confirmation_url) {
      return {
        success: true,
        paymentId: response.data.id,
        paymentUrl: response.data.confirmation.confirmation_url,
        amount: plan.amount,
        planType: planType,
        description: plan.description
      };
    } else {
      return { success: false, error: 'Не удалось создать платеж' };
    }

  } catch (error) {
    console.error('Error creating payment:', error.message);
    if (error.response) {
      console.error('YooKassa error response:', error.response.data);
    }
    return { success: false, error: `Ошибка создания платежа: ${error.message}` };
  }
}

console.log('About to call initializePaymentMode...');
initializePaymentMode();
console.log('Payment module with init function loaded');
