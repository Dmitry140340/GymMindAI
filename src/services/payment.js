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
    // Гарантируем, что БД инициализирована (актуально для тестов/автономного вызова)
    try {
      const { initDatabase, db } = await import('./database.js');
      // Если переменная соединения еще не создана — инициализируем
      if (!db) {
        console.log('🗄️ DB not initialized from context, initializing...');
        await initDatabase();
      }
    } catch (dbInitErr) {
      console.warn('⚠️ Could not proactively ensure DB init (will proceed):', dbInitErr.message);
    }

    // Проверяем тип события
    if (data.event !== 'payment.succeeded') {
      console.log(`⚠️ Ignoring webhook event: ${data.event}`);
      return { success: false, message: `Ignored event: ${data.event}` };
    }

    const payment = data.object;
    console.log('💳 Processing successful payment:', {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      paid: payment.paid,
      metadata: payment.metadata
    });

    // Получаем данные из metadata
    const telegramId = payment.metadata?.telegram_id;
    const planType = payment.metadata?.plan_type;
    
    if (!telegramId || !planType) {
      console.error('❌ Missing metadata in payment:', { 
        telegramId, 
        planType, 
        fullMetadata: payment.metadata 
      });
      return { success: false, message: 'Missing metadata' };
    }

    console.log(`✅ Payment successful for user ${telegramId}, plan: ${planType}, amount: ${payment.amount.value} ${payment.amount.currency}`);

    // Определяем детали плана
    const planDetails = {
      'basic': { requests_limit: 100, name: 'Базовый' },
      'standard': { requests_limit: 300, name: 'Стандартный' },
      'premium': { requests_limit: 600, name: 'Премиум' }
    };

    const plan = planDetails[planType];
    if (!plan) {
      console.error('❌ Unknown plan type:', planType);
      return { success: false, message: 'Unknown plan type' };
    }

    // Импортируем функции для работы с БД
    const { createOrUpdateUser, getUserByTelegramId, createSubscription, activateSubscription } = await import('./database.js');
    
    // Проверяем/создаем пользователя
    await createOrUpdateUser({ id: telegramId, username: null, first_name: 'User' });
    const dbUser = await getUserByTelegramId(telegramId);
    
    if (!dbUser) {
      console.error('❌ Could not find or create user:', telegramId);
      return { success: false, message: 'User not found' };
    }

    // Создаем подписку если её нет
    const subscriptionId = await createSubscription(
      telegramId,
      planType,
      parseFloat(payment.amount?.value || '0'),
      payment.id
    );
    
    console.log('💾 Subscription created/updated:', subscriptionId);

    // Активируем подписку
    await activateSubscription(payment.id, planType);
    console.log('✅ Subscription activated');

    // Отправляем уведомление пользователю об успешной оплате
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    const subscriptionEndFormatted = subscriptionEndDate.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const successMessage = `🎉 **Оплата успешно завершена!**

✅ **План:** ${plan.name}
💰 **Сумма:** ${payment.amount.value} ₽
📊 **Лимит запросов:** ${plan.requests_limit} в месяц
📅 **Действует до:** ${subscriptionEndFormatted}
🔔 **ID платежа:** ${payment.id}

🚀 **Теперь вы можете пользоваться всеми возможностями бота!**

Ваши доступные функции:
• Персональные программы тренировок 🏋️‍♂️
• Планы питания и расчет КБЖУ 🥗
• Отслеживание прогресса 📈
• AI‑рекомендации 🤖

Используйте /start для начала работы с ботом!`;

    try {
      await bot.sendMessage(telegramId, successMessage, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🏠 Начать работу', callback_data: 'start_work' },
            { text: '📊 Мой статус', callback_data: 'my_status' }
          ]]
        }
      });

      console.log('📨 Success notification sent to user', telegramId);
    } catch (notificationError) {
      console.error('❌ Failed to send success notification:', notificationError.message);
      
      // Попробуем отправить упрощенное сообщение без Markdown
      try {
        const simpleMessage = `🎉 Оплата успешно завершена!\n\n✅ План: ${plan.name}\n💰 Сумма: ${payment.amount.value} ₽\n📊 Лимит запросов: ${plan.requests_limit} в месяц\n📅 Действует до: ${subscriptionEndFormatted}\n\nИспользуйте /start для начала работы с ботом!`;
        
        await bot.sendMessage(telegramId, simpleMessage, {
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Начать работу', callback_data: 'start_work' },
              { text: '📊 Мой статус', callback_data: 'my_status' }
            ]]
          }
        });
        console.log('📨 Simple success notification sent to user', telegramId);
      } catch (secondError) {
        console.error('❌ Failed to send simple notification as well:', secondError.message);
        // Не критическая ошибка, продолжаем выполнение
      }
    }

    // Отправляем уведомление администратору о новой оплате
    try {
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId) {
        const adminMessage = `💰 **Новая оплата!**

👤 **Пользователь:** ${telegramId}
📦 **План:** ${plan.name}
💵 **Сумма:** ${payment.amount.value} ₽
🆔 **ID платежа:** ${payment.id}
📅 **Действует до:** ${subscriptionEndFormatted}`;

        await bot.sendMessage(adminId, adminMessage, { parse_mode: 'Markdown' });
        console.log('📨 Admin notification sent');
      }
    } catch (adminError) {
      console.error('❌ Failed to send admin notification:', adminError.message);
    }

    return { 
      success: true, 
      message: 'Payment processed successfully',
      telegramId,
      planType,
      paymentId: payment.id,
      subscriptionId 
    };

  } catch (error) {
    console.error('❌ Error processing payment webhook:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Попробуем отправить уведомление об ошибке администратору
    try {
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId && bot) {
        await bot.sendMessage(adminId, `❌ Ошибка обработки платежа:\n\nPayment ID: ${data?.object?.id}\nError: ${error.message}`);
      }
    } catch (notifyError) {
      console.error('❌ Failed to notify admin:', notifyError.message);
    }
    
    return { success: false, error: error.message };
  }
}

export async function createSubscriptionPayment(telegramUserOrId, planType, amountOverride = null, descriptionOverride = null) {
  // Поддерживаем как передачу объекта пользователя, так и прямого telegram_id
  const telegramId = (typeof telegramUserOrId === 'object' && telegramUserOrId)
    ? (telegramUserOrId.telegram_id || telegramUserOrId.id)
    : telegramUserOrId;

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
        value: (amountOverride || plan.amount).toString(),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        // На стороне YooKassa это URL возврата после оплаты (а не URL вебхука)
        return_url: process.env.RETURN_URL || `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'FitnessTrainerAI_bot'}`
      },
      capture: true,
      description: `${(descriptionOverride || plan.description)} для Telegram ID: ${telegramId}`,
      metadata: {
        telegram_id: String(telegramId),
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
      // Возвращаем структуру, ожидаемую тестами: payment внутри результата
      return {
        success: true,
        payment: response.data,
        paymentUrl: response.data.confirmation.confirmation_url,
        amount: response.data.amount?.value || paymentData.amount.value,
        planType: planType,
        description: descriptionOverride || plan.description
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
