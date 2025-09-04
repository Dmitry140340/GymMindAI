import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { 
  createPayment, 
  updatePaymentStatus, 
  activateSubscription,
  getUserByTelegramId,
  createSubscription
} from './database.js';

// Базовый URL ЮКассы API
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

// Создание заголовков для запросов к ЮКассе
function getYookassaHeaders(idempotenceKey = null) {
  const auth = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  };
  
  if (idempotenceKey) {
    headers['Idempotence-Key'] = idempotenceKey;
  }
  
  return headers;
}

// Создание платежа для подписки
export async function createSubscriptionPayment(telegramId, planType) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    // Определяем сумму и описание
    let amount, description;
    if (planType === 'basic') {
      amount = parseFloat(process.env.BASIC_PRICE || '150');
      description = 'Базовый план (100 запросов) - FitnessBotAI';
    } else if (planType === 'standard') {
      amount = parseFloat(process.env.STANDARD_PRICE || '300');
      description = 'Стандартный план (300 запросов) - FitnessBotAI';
    } else if (planType === 'premium') {
      amount = parseFloat(process.env.PREMIUM_PRICE || '450');
      description = 'Премиум план (600 запросов) - FitnessBotAI';
    } else {
      throw new Error('Неверный тип подписки');
    }

    // Генерируем уникальный ключ идемпотентности
    const idempotenceKey = uuidv4();

    // Создаем платеж в ЮКассе
    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'your_fitness_bot'}?start=payment_success`
      },
      capture: true,
      description: description,
      metadata: {
        telegram_id: telegramId.toString(),
        user_id: user.id.toString(),
        plan_type: planType
      }
    };

    const response = await axios.post(
      `${YOOKASSA_API_URL}/payments`,
      paymentData,
      { headers: getYookassaHeaders(idempotenceKey) }
    );

    const payment = response.data;

    console.log('Создан платеж:', payment);

    // Создаем подписку в БД
    const subscriptionId = await createSubscription(
      user.id, 
      planType, 
      amount, 
      payment.id
    );

    // Создаем запись о платеже в БД
    await createPayment(
      user.id,
      subscriptionId,
      payment.id,
      amount,
      'pending'
    );

    return {
      success: true,
      paymentUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id,
      amount: amount
    };

  } catch (error) {
    console.error('Ошибка создания платежа:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Обработка webhook от ЮКассы
export async function handlePaymentWebhook(data, bot) {
  try {
    const { type, object: payment } = data;

    if (type === 'payment.succeeded') {
      console.log('Платеж успешно завершен:', payment.id);

      // Обновляем статус платежа
      await updatePaymentStatus(payment.id, 'succeeded');
      
      // Активируем подписку
      const activated = await activateSubscription(payment.id);
      
      if (activated) {
        // Уведомляем пользователя
        const telegramId = parseInt(payment.metadata.telegram_id);
        const planType = payment.metadata.plan_type;
        
        let message = '🎉 Поздравляем! Ваша подписка активирована!\n\n';
        if (planType === 'monthly') {
          message += '📅 Подписка на 1 месяц\n';
        } else if (planType === 'yearly') {
          message += '📅 Подписка на 1 год\n';
        }
        message += '✨ Теперь у вас есть доступ ко всем функциям ИИ-тренера!\n\n';
        message += '🤖 Для начала работы с ИИ-тренером нажмите кнопку "🤖 Доступ к ИИ-тренеру" или просто напишите любой вопрос о фитнесе!';

        // Импортируем клавиатуру для отправки
        const { mainKeyboard } = await import('../bot/keyboards.js');
        
        await bot.sendMessage(telegramId, message, mainKeyboard);
        
        console.log(`Подписка активирована для пользователя ${telegramId}`);
      }
      
    } else if (type === 'payment.canceled') {
      console.log('Платеж отменен:', payment.id);
      
      // Обновляем статус платежа
      await updatePaymentStatus(payment.id, 'cancelled');
      
      // Уведомляем пользователя
      const telegramId = parseInt(payment.metadata.telegram_id);
      await bot.sendMessage(
        telegramId, 
        '❌ Платеж был отменен. Если это произошло по ошибке, попробуйте оформить подписку снова.'
      );
      
    } else if (type === 'payment.waiting_for_capture') {
      console.log('Платеж ожидает подтверждения:', payment.id);
      
    } else {
      console.log('Неизвестный тип webhook:', type);
    }

  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    throw error;
  }
}

// Получение информации о платеже
export async function getPaymentInfo(paymentId) {
  try {
    const response = await axios.get(
      `${YOOKASSA_API_URL}/payments/${paymentId}`,
      { headers: getYookassaHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Ошибка получения информации о платеже:', error);
    return null;
  }
}

// Возврат платежа
export async function refundPayment(paymentId, amount = null) {
  try {
    const refundData = {
      payment_id: paymentId
    };
    
    if (amount) {
      refundData.amount = {
        value: amount.toFixed(2),
        currency: 'RUB'
      };
    }

    const response = await axios.post(
      `${YOOKASSA_API_URL}/refunds`,
      refundData,
      { headers: getYookassaHeaders(uuidv4()) }
    );
    
    return response.data;
  } catch (error) {
    console.error('Ошибка возврата платежа:', error);
    return null;
  }
}
