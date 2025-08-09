import { 
  createOrUpdateUser, 
  getUserByTelegramId, 
  getActiveSubscription,
  checkExpiredSubscriptions,
  getUserAccessToken,
  updateUserAgreement,
  // Импорт функций для аналитики
  addFitnessMetric,
  addWorkout,
  addAchievement,
  getUserMetrics,
  getUserWorkouts,
  getUserAchievements
} from '../services/database.js';
import { sendMessageToCoze, getCozeInstructions, resetUserConversation } from '../services/coze.js';
import { createSubscriptionPayment } from '../services/payment.js';
import { 
  generateWeightChart, 
  generateWorkoutChart, 
  generateProgressChart, 
  generateTextReport 
} from '../services/analytics.js';
import { addSampleData } from '../services/sample-data.js';
import {
  mainKeyboard,
  subscriptionKeyboard,
  confirmPaymentKeyboard,
  paymentLinkKeyboard,
  manageSubscriptionKeyboard,
  noSubscriptionKeyboard,
  helpKeyboard,
  analyticsKeyboard,
  workoutKeyboard,
  userAgreementKeyboard
} from './keyboards.js';

// Храним состояния пользователей
const userStates = new Map();

export function setupBotHandlers(bot) {
  // Команда /start с возможным параметром
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const startParam = match ? match[1] : null;

    try {
      // Создаем или обновляем пользователя в БД
      await createOrUpdateUser(user);
      
      // Получаем информацию о пользователе
      const dbUser = await getUserByTelegramId(user.id);
      
      // Проверяем, есть ли параметр payment_success
      if (startParam === 'payment_success') {
        await bot.sendMessage(
          chatId,
          '🎉 Спасибо за оплату!\n\n' +
          'Если ваша подписка уже активирована, вы можете начать общение с ИИ-тренером прямо сейчас!\n\n' +
          '🤖 Нажмите "Доступ к ИИ-тренеру" или просто задайте любой вопрос о фитнесе.',
          mainKeyboard
        );
        return;
      }
      
      // Проверяем, принял ли пользователь соглашение
      if (!dbUser.agreement_accepted) {
        await bot.sendMessage(
          chatId,
          '📄 **Добро пожаловать в FitnessBotAI!**\n\n' +
          'Перед началом работы с ботом, пожалуйста, ознакомьтесь с нашим Пользовательским соглашением.\n\n' +
          '📋 В документе описаны:\n' +
          '• Условия использования сервиса\n' +
          '• Правила обработки персональных данных\n' +
          '• Политика конфиденциальности\n' +
          '• Ваши права и обязанности\n\n' +
          '⚠️ Для продолжения работы с ботом необходимо принять условия соглашения.',
          userAgreementKeyboard
        );
        return;
      }
      
      const welcomeMessage = `🎉 Добро пожаловать в FitnessBotAI!

🤖 Я ваш личный ИИ-тренер, готовый помочь вам достичь ваших фитнес-целей!

✨ Что я умею:
• Составлять персональные программы тренировок
• Давать советы по питанию
• Отвечать на вопросы о фитнесе и здоровье
• Мотивировать и поддерживать вас

💎 Для полного доступа ко всем функциям нужна подписка.

Выберите действие:`;

      await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
    } catch (error) {
      console.error('Ошибка в команде /start:', error);
      await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
    }
  });

  // Обработка текстовых сообщений
  bot.on('message', async (msg) => {
    if (msg.text) {
      // Список системных команд бота (не передаем в Coze)
      const systemCommands = ['/start', '/menu', '/reset', '/сброс', '/help', '/admin_test_coze', '/admin_stats', '/admin_users'];
      
      // Если это не системная команда - обрабатываем как обычное сообщение
      if (!systemCommands.some(cmd => msg.text.startsWith(cmd))) {
        await handleTextMessage(bot, msg);
      }
    }
  });

  // Обработка callback запросов
  bot.on('callback_query', async (callbackQuery) => {
    await handleCallbackQuery(bot, callbackQuery);
  });

  // Периодическая проверка истёкших подписок
  setInterval(async () => {
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      console.error('Ошибка проверки подписок:', error);
    }
  }, 60 * 60 * 1000); // каждый час
}

// Функция для распознавания фитнес-вопросов
function isFitnessQuestion(text) {
  const fitnessKeywords = [
    'тренировк', 'упражнен', 'программ', 'занят', 'спорт',
    'питание', 'диета', 'калори', 'белок', 'углевод', 'жир',
    'похудеть', 'похудени', 'вес', 'килограмм', 'сбросить',
    'мышц', 'масса', 'накачать', 'набрать', 'рельеф',
    'фитнес', 'зал', 'дома', 'кардио', 'силов',
    'пресс', 'ног', 'рук', 'спин', 'грудь', 'плеч',
    'отжимани', 'приседани', 'подтягивани', 'планка',
    'бег', 'ходьба', 'велосипед', 'плавани',
    'здоровье', 'энергия', 'выносливость', 'сила'
  ];
  
  const lowerText = text.toLowerCase();
  return fitnessKeywords.some(keyword => lowerText.includes(keyword));
}

async function handleTextMessage(bot, msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  const user = msg.from;

  // Логируем все получаемые сообщения
  console.log(`📩 Получено сообщение от пользователя ${user.id}:`, text);

  try {
    // Обновляем активность пользователя
    await createOrUpdateUser(user);
    const dbUser = await getUserByTelegramId(user.id);

    if (text === '🤖 Доступ к ИИ-тренеру') {
      // Проверяем подписку
      const subscription = await getActiveSubscription(dbUser.id);
      
      if (!subscription) {
        await bot.sendMessage(
          chatId,
          '💎 Для доступа к ИИ-тренеру нужна активная подписка.\n\nОформите подписку, чтобы получить персональные рекомендации!',
          noSubscriptionKeyboard
        );
        return;
      }

      // Получаем токен доступа пользователя
      const accessToken = await getUserAccessToken(dbUser.id);
      if (!accessToken) {
        await bot.sendMessage(chatId, '❌ Ошибка получения токена доступа. Обратитесь в поддержку.');
        return;
      }

      // Активируем режим общения с ИИ
      userStates.set(user.id, 'chatting_with_ai');
      
      // Отправляем приветствие ИИ
      const instructions = await getCozeInstructions(accessToken);
      await bot.sendMessage(chatId, instructions.message, { parse_mode: 'Markdown' });
      return;
    }

    if (text === '💎 Подписка') {
      await showSubscriptionMenu(bot, chatId, dbUser.id);
      return;
    }

    if (text === '📊 Мой профиль') {
      await showUserProfile(bot, chatId, dbUser);
      return;
    }

    if (text === '❓ Помощь') {
      await bot.sendMessage(
        chatId,
        '❓ Справка и помощь\n\nВыберите интересующий вас раздел:',
        helpKeyboard
      );
      return;
    }

    if (text === '📈 Аналитика') {
      await bot.sendMessage(
        chatId,
        '📊 Аналитика и статистика\n\nВыберите тип отчета, который хотите посмотреть:',
        analyticsKeyboard
      );
      return;
    }

    if (text === '🏋️‍♂️ Записать тренировку') {
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ Выберите тип тренировки:\n\nВы можете записать данные о своей тренировке для ведения статистики:',
        workoutKeyboard
      );
      return;
    }

    if (text === '🔄 Новый диалог') {
      // Сбрасываем состояние пользователя
      userStates.delete(user.id);
      
      // Получаем токен доступа пользователя
      const accessToken = await getUserAccessToken(dbUser.id);
      if (accessToken) {
        await resetUserConversation(accessToken, dbUser.id);
      }
      
      await bot.sendMessage(
        chatId,
        '🔄 Диалог сброшен!\n\nТеперь ИИ-тренер не помнит вашу предыдущую переписку. Можете начать новый разговор.',
        mainKeyboard
      );
      return;
    }

    // Обработчики аналитики
    if (text === '📈 График веса') {
      await handleWeightChart(bot, chatId, dbUser.id);
      return;
    }

    if (text === '🏋️‍♂️ График тренировок') {
      await handleWorkoutChart(bot, chatId, dbUser.id);
      return;
    }

    if (text === '📊 Общий отчет') {
      await handleProgressReport(bot, chatId, dbUser.id);
      return;
    }

    if (text === '🏆 Достижения') {
      await handleAchievements(bot, chatId, dbUser.id);
      return;
    }

    if (text === '⬅️ Назад в меню') {
      userStates.delete(user.id); // Сбрасываем состояние
      await bot.sendMessage(
        chatId,
        '🏠 Главное меню\n\nВыберите действие:',
        mainKeyboard
      );
      return;
    }

    // Обработчики записи тренировок
    if (['💪 Силовая тренировка', '🏃‍♂️ Кардио', '🧘‍♀️ Йога/Растяжка', '🏋️‍♀️ Функциональная'].includes(text)) {
      await handleWorkoutType(bot, chatId, dbUser.id, text);
      return;
    }

    // Если пользователь в режиме чата с ИИ
    if (userStates.get(user.id) === 'chatting_with_ai') {
      const subscription = await getActiveSubscription(dbUser.id);
      
      if (!subscription) {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ Ваша подписка истекла. Обновите подписку для продолжения общения с ИИ.',
          noSubscriptionKeyboard
        );
        return;
      }

      // Отправляем запрос в Coze
      await bot.sendChatAction(chatId, 'typing');
      
      // Отправляем сообщение о том, что бот думает
      const thinkingMessage = await bot.sendMessage(chatId, '🤔 Анализирую ваш вопрос...');
      
      const aiResponse = await sendMessageToCoze(text, user.id);
      
      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }
      
      if (aiResponse.success) {
        await bot.sendMessage(chatId, aiResponse.message);
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }

    // Команда возврата в главное меню
    if (text === '/menu') {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '🏠 Главное меню',
        mainKeyboard
      );
      return;
    }

    // Команда сброса диалога с ИИ
    if (text === '/reset' || text === '/сброс') {
      // Сбрасываем состояние пользователя
      userStates.delete(user.id);
      
      // Получаем токен доступа пользователя
      const accessToken = await getUserAccessToken(dbUser.id);
      if (accessToken) {
        await resetUserConversation(accessToken, dbUser.id);
      }
      
      await bot.sendMessage(
        chatId,
        '🔄 Диалог с ИИ сброшен! Теперь можете начать новое общение с чистого листа.\n\n💡 Все предыдущие команды и контекст очищены.',
        mainKeyboard
      );
      return;
    }

    // Команда добавления тестовых данных (только для разработки)
    if (text === '/sample_data' || text === '/тестовые_данные') {
      await bot.sendMessage(chatId, '⏳ Добавляем тестовые данные...');
      
      const success = await addSampleData(dbUser.id);
      
      if (success) {
        await bot.sendMessage(
          chatId,
          '✅ Тестовые данные добавлены!\n\n📊 Теперь вы можете посмотреть графики и статистику в разделе "Аналитика".\n\n💡 Данные включают:\n• График веса за 30 дней\n• 7 тренировок разных типов\n• 3 достижения',
          mainKeyboard
        );
      } else {
        await bot.sendMessage(
          chatId,
          '❌ Ошибка при добавлении тестовых данных.',
          mainKeyboard
        );
      }
      return;
    }

    // Автоматическое распознавание фитнес-вопросов для пользователей с подпиской
    const subscription = await getActiveSubscription(dbUser.id);
    console.log(`User ${user.id} subscription status:`, subscription ? 'active' : 'none');
    
    if (subscription && isFitnessQuestion(text)) {
      // Автоматически переводим в режим общения с ИИ
      userStates.set(user.id, 'chatting_with_ai');
      
      await bot.sendChatAction(chatId, 'typing');
      
      // Отправляем сообщение о том, что бот думает
      const thinkingMessage = await bot.sendMessage(chatId, '🤖 Подготавливаю персональный ответ...');
      
      const aiResponse = await sendMessageToCoze(text, user.id);
      
      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }
      
      if (aiResponse.success) {
        await bot.sendMessage(chatId, aiResponse.message + '\n\n🏠 Для возврата в меню: /menu');
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }

    // Если у пользователя есть подписка, но вопрос не распознан как фитнес
    if (subscription) {
      // Специальная обработка для команд Coze (начинающихся с /)
      if (text.startsWith('/')) {
        console.log(`🔧 Команда Coze от пользователя ${user.id}:`, text);
      } else {
        console.log(`User ${user.id} has subscription, but message not recognized as fitness question:`, text);
      }
      
      // Автоматически переводим в режим общения с ИИ для любого сообщения
      userStates.set(user.id, 'chatting_with_ai');
      
      await bot.sendChatAction(chatId, 'typing');
      
      // Отправляем сообщение о том, что бот думает
      const thinkingMessage = await bot.sendMessage(chatId, text.startsWith('/') ? '⚙️ Выполняю команду...' : '🧠 Обрабатываю ваш запрос...');
      
      const aiResponse = await sendMessageToCoze(text, user.id);
      
      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }
      
      if (aiResponse.success) {
        await bot.sendMessage(chatId, aiResponse.message + '\n\n🏠 Для возврата в меню: /menu');
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }

    // Если сообщение не распознано и нет подписки
    console.log(`User ${user.id} has no subscription, showing menu`);
    await bot.sendMessage(
      chatId,
      'Для доступа к ИИ-тренеру необходима активная подписка. Оформите подписку для получения персональных рекомендаций!\n\nИспользуйте кнопки меню для навигации или команду /menu.',
      mainKeyboard
    );

  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
  }
}

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const user = callbackQuery.from;

  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    const dbUser = await getUserByTelegramId(user.id);

    switch (data) {
      case 'accept_agreement':
        // Обновляем статус согласия в базе данных
        await updateUserAgreement(user.id, true);
        
        // Сначала редактируем сообщение без клавиатуры
        await bot.editMessageText(
          '✅ **Спасибо за принятие условий!**\n\n' +
          '🎉 Добро пожаловать в FitnessBotAI!\n\n' +
          '🤖 Я ваш личный ИИ-тренер, готовый помочь вам достичь ваших фитнес-целей!\n\n' +
          '✨ Что я умею:\n' +
          '• Составлять персональные программы тренировок\n' +
          '• Давать советы по питанию\n' +
          '• Отслеживать прогресс\n' +
          '• Мотивировать на достижение результатов\n\n' +
          '💡 Для полного доступа ко всем функциям оформите подписку!\n\n' +
          '🚀 Начнем ваш путь к идеальной форме?',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        
        // Затем отправляем новое сообщение с основной клавиатурой
        await bot.sendMessage(
          chatId,
          'Используйте меню ниже для навигации:',
          mainKeyboard
        );
        break;

      case 'decline_agreement':
        await bot.editMessageText(
          '❌ **Условия не приняты**\n\n' +
          'К сожалению, без принятия пользовательского соглашения мы не можем предоставить вам доступ к нашему сервису.\n\n' +
          'Если вы передумаете, используйте команду /start для повторного ознакомления с условиями.',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        break;

      case 'show_subscription_plans':
        await bot.editMessageText(
          '💎 Выберите план подписки:\n\n📅 Месячная подписка - 999₽\n• Полный доступ к ИИ-тренеру\n• Персональные программы тренировок\n• Советы по питанию\n\n📅 Годовая подписка - 9990₽\n• Всё из месячной подписки\n• Скидка 17%\n• Приоритетная поддержка',
          {
            chat_id: chatId,
            message_id: messageId,
            ...subscriptionKeyboard
          }
        );
        break;

      case 'buy_monthly':
        await showPaymentConfirmation(bot, chatId, messageId, 'monthly');
        break;

      case 'buy_yearly':
        await showPaymentConfirmation(bot, chatId, messageId, 'yearly');
        break;

      case 'confirm_payment_monthly':
        await processPayment(bot, chatId, messageId, user.id, 'monthly');
        break;

      case 'confirm_payment_yearly':
        await processPayment(bot, chatId, messageId, user.id, 'yearly');
        break;

      case 'subscription_status':
        await showSubscriptionStatus(bot, chatId, messageId, dbUser.id);
        break;

      case 'extend_subscription':
        await bot.editMessageText(
          '💎 Продление подписки\n\nВыберите план:',
          {
            chat_id: chatId,
            message_id: messageId,
            ...subscriptionKeyboard
          }
        );
        break;

      case 'cancel_payment':
        await bot.editMessageText(
          '❌ Оплата отменена.\n\nВы можете оформить подписку в любое время.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...noSubscriptionKeyboard
          }
        );
        break;

      case 'back_to_main':
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, '🏠 Главное меню', mainKeyboard);
        break;

      case 'help_ai':
        await bot.editMessageText(
          '🤖 Как пользоваться ИИ-тренером:\n\n1. Нажмите "Чат с ИИ-тренером"\n2. Задайте любой вопрос о фитнесе\n3. Получите персональный ответ\n\n💡 Примеры вопросов:\n• "Составь программу тренировок для новичка"\n• "Что есть перед тренировкой?"\n• "Как накачать пресс дома?"',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      case 'help_payment':
        await bot.editMessageText(
          '💳 Информация об оплате:\n\n• Оплата через ЮКассу (безопасно)\n• Поддерживаются все банковские карты\n• Подписка активируется автоматически\n• Возможен возврат в течение 14 дней\n\n📞 Проблемы с оплатой? Обратитесь в поддержку.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      case 'help_support':
        await bot.editMessageText(
          '📞 Поддержка:\n\n📧 Email: support@fitnessbot.ai\n📱 Telegram: @fitness_support\n⏰ Время работы: 9:00-21:00 МСК\n\n🕐 Обычно отвечаем в течение 2-4 часов.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      default:
        console.log('Неизвестный callback:', data);
    }

  } catch (error) {
    console.error('Ошибка обработки callback:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Произошла ошибка. Попробуйте ещё раз.',
      show_alert: true
    });
  }
}

async function showSubscriptionMenu(bot, chatId, userId) {
  const subscription = await getActiveSubscription(userId);
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    
    const message = `💎 Ваша подписка активна!\n\n📅 План: ${subscription.plan_type === 'monthly' ? 'Месячная' : 'Годовая'}\n⏰ До окончания: ${daysLeft} дней\n📊 Статус: Активна`;
    
    await bot.sendMessage(chatId, message, manageSubscriptionKeyboard);
  } else {
    await bot.sendMessage(
      chatId,
      '💎 У вас нет активной подписки\n\nПодписка дает доступ к:\n• Персональному ИИ-тренеру\n• Программам тренировок\n• Советам по питанию\n• Приоритетной поддержке',
      noSubscriptionKeyboard
    );
  }
}

async function showUserProfile(bot, chatId, user) {
  const subscription = await getActiveSubscription(user.id);
  
  let message = `👤 Ваш профиль\n\n`;
  message += `📛 Имя: ${user.first_name || 'Не указано'}\n`;
  message += `🆔 ID: ${user.telegram_id}\n`;
  message += `📅 Регистрация: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n\n`;
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    message += `💎 Подписка: Активна\n`;
    message += `📊 План: ${subscription.plan_type === 'monthly' ? 'Месячная' : 'Годовая'}\n`;
    message += `⏰ Осталось дней: ${daysLeft}`;
  } else {
    message += `💎 Подписка: Не активна`;
  }

  await bot.sendMessage(chatId, message, mainKeyboard);
}

async function showPaymentConfirmation(bot, chatId, messageId, planType) {
  const price = planType === 'monthly' ? '999₽' : '9990₽';
  const period = planType === 'monthly' ? '1 месяц' : '1 год';
  const savings = planType === 'yearly' ? '\n💰 Экономия: 1998₽ (17%)' : '';
  
  const message = `💳 Подтверждение заказа\n\n📦 Подписка: ${period}\n💰 К оплате: ${price}${savings}\n\n✅ После оплаты подписка активируется автоматически.`;
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...confirmPaymentKeyboard(planType)
  });
}

async function processPayment(bot, chatId, messageId, telegramId, planType) {
  try {
    await bot.editMessageText('⏳ Создаем ссылку для оплаты...', {
      chat_id: chatId,
      message_id: messageId
    });

    const paymentResult = await createSubscriptionPayment(telegramId, planType);
    
    if (paymentResult.success) {
      const price = planType === 'monthly' ? '999₽' : '9990₽';
      const period = planType === 'monthly' ? '1 месяц' : '1 год';
      
      await bot.editMessageText(
        `💳 Оплата подписки\n\n📦 План: ${period}\n💰 Сумма: ${price}\n\n🔒 Оплата проходит через защищенный сервис ЮКасса.\n\n👆 Нажмите кнопку ниже для перехода к оплате:`,
        {
          chat_id: chatId,
          message_id: messageId,
          ...paymentLinkKeyboard(paymentResult.paymentUrl)
        }
      );
    } else {
      await bot.editMessageText(
        `❌ Ошибка создания платежа: ${paymentResult.error}\n\nПопробуйте ещё раз или обратитесь в поддержку.`,
        {
          chat_id: chatId,
          message_id: messageId,
          ...subscriptionKeyboard
        }
      );
    }
  } catch (error) {
    console.error('Ошибка обработки платежа:', error);
    await bot.editMessageText(
      '❌ Произошла ошибка при создании платежа. Попробуйте ещё раз.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...subscriptionKeyboard
      }
    );
  }
}

async function showSubscriptionStatus(bot, chatId, messageId, userId) {
  const subscription = await getActiveSubscription(userId);
  
  if (subscription) {
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    
    const message = `📊 Статус подписки\n\n✅ Статус: Активна\n📅 План: ${subscription.plan_type === 'monthly' ? 'Месячная' : 'Годовая'}\n🗓 Начало: ${startDate.toLocaleDateString('ru-RU')}\n📆 Окончание: ${endDate.toLocaleDateString('ru-RU')}\n⏰ Осталось дней: ${daysLeft}\n💰 Сумма: ${subscription.amount}₽`;
    
    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      ...manageSubscriptionKeyboard
    });
  } else {
    await bot.editMessageText(
      '❌ У вас нет активной подписки',
      {
        chat_id: chatId,
        message_id: messageId,
        ...noSubscriptionKeyboard
      }
    );
  }
}

// Обработчики аналитики
async function handleWeightChart(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '⏳ Генерирую график веса...');
    
    console.log(`Запрос метрик веса для пользователя ${userId}`);
    const metrics = await getUserMetrics(userId, 'weight');
    console.log(`Найдено метрик веса: ${metrics.length}`);
    
    if (metrics.length === 0) {
      await bot.sendMessage(
        chatId,
        '📊 У вас пока нет данных о весе.\n\nДля генерации графика добавьте данные через команды ИИ-тренера или запишите тренировку.',
        analyticsKeyboard
      );
      return;
    }

    console.log(`Генерирую график для метрик:`, metrics.slice(0, 2));
    const chartPath = await generateWeightChart(metrics, userId);
    console.log(`Путь к графику: ${chartPath}`);
    
    if (!chartPath) {
      await bot.sendMessage(
        chatId,
        '❌ Ошибка при генерации графика. Попробуйте позже.',
        analyticsKeyboard
      );
      return;
    }

    await bot.sendPhoto(chatId, chartPath, {
      caption: '📈 Ваш график изменения веса\n\nДанные за последние записи в системе.',
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('Ошибка генерации графика веса:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при генерации графика. Попробуйте позже.',
      analyticsKeyboard
    );
  }
}

async function handleWorkoutChart(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '⏳ Генерирую график тренировок...');
    
    const workouts = await getUserWorkouts(userId);
    
    if (workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ У вас пока нет записанных тренировок.\n\nИспользуйте кнопку "Записать тренировку" для добавления данных.',
        analyticsKeyboard
      );
      return;
    }

    const chartPath = await generateWorkoutChart(workouts, userId);
    
    await bot.sendPhoto(chatId, chartPath, {
      caption: '🏋️‍♂️ Ваш график активности\n\nРаспределение тренировок по типам за последний период.',
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('Ошибка генерации графика тренировок:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при генерации графика. Попробуйте позже.',
      analyticsKeyboard
    );
  }
}

async function handleProgressReport(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '⏳ Генерирую отчет о прогрессе...');
    
    const metrics = await getUserMetrics(userId);
    const workouts = await getUserWorkouts(userId);
    
    if (metrics.length === 0 && workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '📊 У вас пока нет данных для отчета.\n\nДобавьте данные о весе и тренировках для генерации полного отчета.',
        analyticsKeyboard
      );
      return;
    }

    const chartPath = await generateProgressChart(metrics, workouts, userId);
    const textReport = await generateTextReport(userId);
    
    await bot.sendPhoto(chatId, chartPath, {
      caption: `📊 Общий отчет о прогрессе\n\n${textReport}`,
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('Ошибка генерации отчета:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при генерации отчета. Попробуйте позже.',
      analyticsKeyboard
    );
  }
}

async function handleAchievements(bot, chatId, userId) {
  try {
    const achievements = await getUserAchievements(userId);
    
    if (achievements.length === 0) {
      await bot.sendMessage(
        chatId,
        '🏆 У вас пока нет достижений.\n\nПродолжайте тренироваться и следить за прогрессом - достижения не заставят себя ждать!',
        analyticsKeyboard
      );
      return;
    }

    let message = '🏆 Ваши достижения:\n\n';
    achievements.forEach((achievement, index) => {
      const date = new Date(achievement.earned_date).toLocaleDateString('ru-RU');
      message += `${index + 1}. ${achievement.title}\n`;
      message += `   📝 ${achievement.description}\n`;
      message += `   📅 Получено: ${date}\n\n`;
    });

    await bot.sendMessage(chatId, message, analyticsKeyboard);
    
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при загрузке достижений. Попробуйте позже.',
      analyticsKeyboard
    );
  }
}

async function handleWorkoutType(bot, chatId, userId, workoutType) {
  // Здесь можно добавить логику записи тренировки
  // Пока просто отвечаем сообщением
  const workoutTypeMap = {
    '💪 Силовая тренировка': 'strength',
    '🏃‍♂️ Кардио': 'cardio',
    '🧘‍♀️ Йога/Растяжка': 'yoga',
    '🏋️‍♀️ Функциональная': 'functional'
  };

  const type = workoutTypeMap[workoutType];
  
  try {
    // Добавляем базовую тренировку с примерными значениями
    const duration = 60; // 60 минут по умолчанию
    const calories = type === 'cardio' ? 400 : type === 'strength' ? 300 : 200;
    const intensity = 3; // средняя интенсивность
    const exercisesCount = type === 'strength' ? 8 : type === 'functional' ? 6 : 4;
    
    await addWorkout(userId, type, duration, calories, intensity, exercisesCount, `Тренировка: ${workoutType}`);

    await bot.sendMessage(
      chatId,
      `✅ Тренировка "${workoutType}" записана!\n\n` +
      `📊 Данные тренировки:\n` +
      `⏱ Продолжительность: ${duration} минут\n` +
      `🔥 Калории: ${calories} ккал\n` +
      `📈 Интенсивность: ${intensity}/5\n` +
      `🏋️‍♂️ Упражнений: ${exercisesCount}\n\n` +
      `💡 Для более детальной записи тренировок обратитесь к ИИ-тренеру.`,
      workoutKeyboard
    );
    
  } catch (error) {
    console.error('Ошибка записи тренировки:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при записи тренировки. Попробуйте позже.',
      workoutKeyboard
    );
  }
}
