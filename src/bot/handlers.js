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
  getUserAchievements,
  // Импорт функций для бесплатных запросов
  getUserFreeRequests,
  useFreeRequest,
  canUserMakeRequest,
  incrementRequestUsage,
  // Импорт функций для управления пользовательскими данными
  saveFitnessMetric,
  setUserGoal,
  getUserGoals,
  saveWorkout,
  getLastWeightRecord,
  updateLastWeightRecord,
  deleteLastWeightRecord,
  getLastWorkoutRecord,
  updateLastWorkoutRecord,
  deleteLastWorkoutRecord,
  deleteUserGoal,
  updateUserGoal,
  clearAllUserData,
  getUserDataSummary,
  // Импорт функций для детальных тренировок
  saveDetailedWorkout,
  getDetailedWorkout,
  getUserDetailedWorkouts,
  updateDetailedWorkout,
  getExerciseProgressStats,
  // Импорт функций для удаления записей
  deleteLastWorkout,
  deleteLastWeight,
  deleteAllWorkouts,
  deleteAllWeights
} from '../services/database.js';
import { runWorkflow, getConversationId, clearConversation, continueInteractiveWorkflow } from '../services/coze.js';
import { runCozeChat } from '../services/coze_v3.js';
import { createSubscriptionPayment } from '../services/payment.js';
import { 
  generateWeightChart, 
  generateWorkoutChart, 
  generateProgressChart, 
  generateTextReport 
} from '../services/analytics.js';
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
  userAgreementKeyboard,
  aiToolsKeyboard,
  userDataKeyboard,
  workoutTypesKeyboard,
  detailedWorkoutKeyboard,
  popularExercisesKeyboard,
  viewRecordsKeyboard,
  deleteRecordsKeyboard,
  goalTypesKeyboard,
  subscriptionPlansKeyboard,
  paymentConfirmKeyboard
} from './keyboards.js';

// Храним состояния пользователей
const userStates = new Map();
// Храним контекст последнего workflow для каждого пользователя
const userWorkflowContext = new Map();
// Храним состояние интерактивных workflow
const userInteractiveWorkflow = new Map();
// Храним активные тренировки пользователей
const activeWorkouts = new Map();

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
  // Исключаем ВСЕ кнопки интерфейса - только чистый текст может быть фитнес-вопросом
  const interfaceButtons = [
    // Основные кнопки
    '🤖 ИИ-тренер', '🧬 ИИ-инструменты', '💎 Подписка', '� Мой профиль',
    '📈 Аналитика', '🎯 Мои данные', '🔄 Новый диалог', '❓ Помощь',
    
    // Кнопки аналитики
    '📈 График веса', '🏋️‍♂️ График тренировок', '📊 Общий отчет', '🏆 Достижения',
    
    // Кнопки тренировок
    '💪 Силовая тренировка', '🏃‍♂️ Кардио', '🧘‍♀️ Йога/Растяжка', '🥊 Единоборства',
    '🔥 Детальная запись', '⚡ Быстрая запись',
    
    // Кнопки управления данными
    '⚖️ Записать вес', '🎯 Установить цель', '🏋️‍♂️ Добавить тренировку', '📊 Мои записи',
    '🏋️‍♂️ История тренировок', '⚖️ История веса', '🎯 Мои цели', '📈 Прогресс',
    
    // Кнопки целей
    '🏋️‍♂️ Набрать мышечную массу', '⚖️ Снизить вес', '💪 Увеличить силу', 
    '🏃‍♂️ Улучшить выносливость', '🤸‍♂️ Повысить гибкость', '⚡ Общая физподготовка',
    
    // Кнопки подписки
    '💳 Оплатить подписку', '📋 Статус подписки', '💳 Продлить подписку', 
    '📊 История платежей', '💳 Оформить подписку', '📋 Преимущества подписки',
    
    // Кнопки помощи
    '💬 Как пользоваться ботом?', '⚡ Что умеет ИИ-тренер?',
    
    // Кнопки удаления
    '🗑️ Удалить записи', '🗑️ Удалить тренировки', '🗑️ Удалить веса', 
    '🗑️ Удалить цели', '🗑️ Удалить всё',
    
    // Кнопки детальных тренировок
    '➕ Добавить упражнение', '✅ Завершить тренировку', '🏋️‍♂️ Жим лежа', 
    '🏋️‍♂️ Приседания', '🏋️‍♂️ Становая тяга', '🏋️‍♂️ Подтягивания', '📝 Другое упражнение',
    
    // Системные кнопки
    '❌ Отмена', '⬅️ Назад в меню', '⬅️ Назад', '✅ Да', '❌ Нет', '⏩ Пропустить',
    
    // Кнопки workflow (они обрабатываются отдельно)
    '🏋️‍♂️ /training_program', '🥗 /nutrition_plan', '🔬 /deepresearch', '🧪 /composition_analysis'
  ];
  
  // Если это кнопка интерфейса, то это НЕ фитнес-вопрос для ИИ
  if (interfaceButtons.includes(text)) {
    return false;
  }

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
  let text = msg.text; // Изменяем const на let, чтобы можно было переопределять
  const user = msg.from;

  // Логируем все получаемые сообщения
  console.log(`📩 Получено сообщение от пользователя ${user.id}:`, text);

  try {
    // Обновляем активность пользователя
    await createOrUpdateUser(user);
    const dbUser = await getUserByTelegramId(user.id);

    // === ПЕРВООЧЕРЕДНАЯ ОБРАБОТКА КНОПОК ИНТЕРФЕЙСА ===
    // Эти кнопки должны обрабатываться ВСЕГДА, независимо от подписки
    // Все кнопки интерфейса сбрасывают режим ИИ-тренера
    
    // Проверяем кнопку "Мои данные" с учетом проблем кодировки эмодзи
    if (text === '🎯 Мои данные' || text.includes('Мои данные')) {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      await bot.sendMessage(
        chatId,
        '🎯 **Управление данными**\n\n' +
        'Здесь вы можете:\n' +
        '• ⚖️ Записывать и отслеживать вес\n' +
        '• 🎯 Устанавливать и изменять цели\n' +
        '• 🏋️‍♂️ Добавлять тренировки\n' +
        '• 📊 Просматривать свои записи\n' +
        '• 🔧 Редактировать данные\n' +
        '• 🗑️ Удалять записи\n\n' +
        'Выберите действие:',
        { parse_mode: 'Markdown', ...userDataKeyboard }
      );
      return;
    }

    if (text === '🧬 ИИ-инструменты' || text.includes('ИИ-инструменты')) {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      await bot.sendMessage(
        chatId,
        '🧬 **ИИ-инструменты**\n\n' +
        '🤖 Специальные воркфлоу команды для работы с ИИ:\n\n' +
        '• 🏋️‍♂️ `/training_program` - создание персональной программы тренировок\n' +
        '• 🥗 `/nutrition_plan` - составление плана питания\n' +
        '• 🔬 `/deepresearch` - глубокое научное исследование\n' +
        '• 🧪 `/composition_analysis` - анализ состава добавок\n\n' +
        'Нажмите на команду или выберите из меню:',
        { parse_mode: 'Markdown', ...aiToolsKeyboard }
      );
      return;
    }

    // Обработка кнопок ИИ-команд
    if (text === '🏋️‍♂️ /training_program') {
      text = '/training_program'; // Переопределяем текст для дальнейшей обработки
    }
    
    if (text === '🥗 /nutrition_plan') {
      text = '/nutrition_plan'; // Переопределяем текст для дальнейшей обработки
    }
    
    if (text === '🔬 /deepresearch') {
      text = '/deepresearch'; // Переопределяем текст для дальнейшей обработки
    }
    
    if (text === '🧪 /composition_analysis') {
      text = '/composition_analysis'; // Переопределяем текст для дальнейшей обработки
    }

    if (text === '⬅️ Назад в меню' || text.includes('Назад в меню')) {
      userStates.delete(user.id); // Сбрасываем состояние
      await bot.sendMessage(
        chatId,
        '🏠 Главное меню\n\nВыберите действие:',
        mainKeyboard
      );
      return;
    }

    if (text === '❌ Отмена') {
      // Отменяем текущее действие и возвращаемся в меню
      userStates.delete(user.id); // Сбрасываем состояние
      activeWorkouts.delete(user.id); // Отменяем активную тренировку если есть
      await bot.sendMessage(
        chatId,
        '❌ Действие отменено\n\n🏠 Возвращаемся в главное меню:',
        mainKeyboard
      );
      return;
    }

    if (text === '💎 Подписка' || text.includes('Подписка')) {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      await showSubscriptionMenu(bot, chatId, dbUser.id);
      return;
    }

    // Обработчики кнопок подписки
    if (text === '📋 Статус подписки') {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      await showSubscriptionStatus(bot, chatId, null, dbUser.id);
      return;
    }

    if (text === '📊 История платежей') {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      await showPaymentHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '💳 Продлить подписку') {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `💎 Продление подписки\n\nВыберите план:\n\n` +
        `💎 **Базовый план** - ${basicPrice}₽/мес\n` +
        `• 100 запросов к ИИ-тренеру\n` +
        `• Основные тренировочные программы\n` +
        `• Базовые советы по питанию\n\n` +
        
        `⭐ **Стандартный план** - ${standardPrice}₽/мес\n` +
        `• 300 запросов к ИИ-тренеру\n` +
        `• Персональные программы тренировок\n` +
        `• Детальные планы питания\n` +
        `• Анализ состава добавок\n\n` +
        
        `🚀 **Премиум план** - ${premiumPrice}₽/мес\n` +
        `• 600 запросов к ИИ-тренеру\n` +
        `• Все возможности ИИ-тренера\n` +
        `• Приоритетная поддержка\n` +
        `• Эксклюзивные исследования\n\n` +
        
        `Выберите план кнопкой ниже:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '💳 Оплатить подписку' || text === '💳 Оформить подписку') {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `💎 Выберите план подписки:\n\n` +
        `� **Базовый план** - ${basicPrice}₽/мес\n` +
        `• 100 запросов к ИИ-тренеру\n` +
        `• Основные тренировочные программы\n` +
        `• Базовые советы по питанию\n\n` +
        
        `⭐ **Стандартный план** - ${standardPrice}₽/мес\n` +
        `• 300 запросов к ИИ-тренеру\n` +
        `• Персональные программы тренировок\n` +
        `• Детальные планы питания\n` +
        `• Анализ состава добавок\n\n` +
        
        `🚀 **Премиум план** - ${premiumPrice}₽/мес\n` +
        `• 600 запросов к ИИ-тренеру\n` +
        `• Все возможности ИИ-тренера\n` +
        `• Приоритетная поддержка\n` +
        `• Эксклюзивные исследования\n\n` +
        
        `Выберите план кнопкой ниже:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '📋 Преимущества подписки') {
      await bot.sendMessage(
        chatId,
        '✨ **Преимущества подписки:**\n\n' +
        '🤖 **Неограниченное общение с ИИ-тренером**\n' +
        '• Персональные ответы на любые фитнес-вопросы\n' +
        '• Составление индивидуальных программ\n' +
        '• Советы по питанию и спортивному питанию\n\n' +
        '🧬 **Доступ к специальным ИИ-инструментам:**\n' +
        '• 🔬 Глубокий научный анализ\n' +
        '• 🏋️‍♂️ Персональные программы тренировок\n' +
        '• 🥗 Индивидуальные планы питания\n' +
        '• 🧪 Профессиональный анализ добавок\n\n' +
        '📊 **Расширенная аналитика:**\n' +
        '• Детальные графики прогресса\n' +
        '• Персональные отчеты\n' +
        '• Система достижений\n\n' +
        '🎯 **Управление данными:**\n' +
        '• Ведение дневника тренировок\n' +
        '• Отслеживание веса и метрик\n' +
        '• Постановка и контроль целей',
        { parse_mode: 'Markdown', ...subscriptionKeyboard }
      );
      return;
    }

    // Обработчики выбора планов подписки
    if (text === '💎 Базовый план - 150₽') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'basic' });
      await bot.sendMessage(
        chatId,
        '💎 **Базовый план** - 150₽/месяц\n\n' +
        '✅ **Что включено:**\n' +
        '• 100 запросов к ИИ-тренеру\n' +
        '• Основные тренировочные программы\n' +
        '• Базовые советы по питанию\n' +
        '• Ведение дневника тренировок\n\n' +
        '💳 **Способы оплаты:**\n' +
        '• Банковская карта (Visa, MasterCard, МИР)\n' +
        '• ЮMoney\n' +
        '• СБП (Система быстрых платежей)\n\n' +
        '⚠️ После оплаты доступ активируется автоматически!\n\n' +
        '👇 **Нажмите кнопку для создания ссылки на оплату:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '⭐ Стандартный план - 300₽') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'standard' });
      await bot.sendMessage(
        chatId,
        '⭐ **Стандартный план** - 300₽/месяц\n\n' +
        '✅ **Что включено:**\n' +
        '• 300 запросов к ИИ-тренеру\n' +
        '• Персональные программы тренировок\n' +
        '• Детальные планы питания\n' +
        '• Анализ состава добавок\n' +
        '• Расширенная аналитика\n' +
        '• Отслеживание прогресса\n\n' +
        '💳 **Способы оплаты:**\n' +
        '• Банковская карта (Visa, MasterCard, МИР)\n' +
        '• ЮMoney\n' +
        '• СБП (Система быстрых платежей)\n\n' +
        '⚠️ После оплаты доступ активируется автоматически!\n\n' +
        '👇 **Нажмите кнопку для создания ссылки на оплату:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '🚀 Премиум план - 450₽') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'premium' });
      await bot.sendMessage(
        chatId,
        '🚀 **Премиум план** - 450₽/месяц\n\n' +
        '✅ **Что включено:**\n' +
        '• 600 запросов к ИИ-тренеру\n' +
        '• Все возможности ИИ-тренера\n' +
        '• Приоритетная поддержка\n' +
        '• Эксклюзивные исследования\n' +
        '• Персональные консультации\n' +
        '• Продвинутая аналитика\n' +
        '• Экспорт данных\n\n' +
        '💳 **Способы оплаты:**\n' +
        '• Банковская карта (Visa, MasterCard, МИР)\n' +
        '• ЮMoney\n' +
        '• СБП (Система быстрых платежей)\n\n' +
        '⚠️ После оплаты доступ активируется автоматически!\n\n' +
        '👇 **Нажмите кнопку для создания ссылки на оплату:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '💳 Оплатить сейчас') {
      const state = userStates.get(user.id);
      if (state && state.action === 'selected_plan') {
        // Создаем платеж
        await bot.sendChatAction(chatId, 'typing');
        const loadingMsg = await bot.sendMessage(chatId, '💳 Создаю ссылку для оплаты...');
        
        const paymentResult = await createSubscriptionPayment(user.id, state.planType);
        
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        
        if (paymentResult.success) {
          const planNames = {
            'basic': '💎 Базовый план',
            'standard': '⭐ Стандартный план', 
            'premium': '🚀 Премиум план'
          };
          
          await bot.sendMessage(
            chatId,
            `✅ **Ссылка для оплаты создана!**\n\n` +
            `📋 **Детали платежа:**\n` +
            `• План: ${planNames[state.planType]}\n` +
            `• Сумма: ${paymentResult.amount}₽\n` +
            `• Описание: ${paymentResult.description}\n\n` +
            `🔗 **[ОПЛАТИТЬ ПОДПИСКУ](${paymentResult.paymentUrl})**\n\n` +
            `💡 **Инструкция:**\n` +
            `1. Нажмите на ссылку выше\n` +
            `2. Выберите способ оплаты\n` +
            `3. Введите данные карты или войдите в ЮMoney\n` +
            `4. Подтвердите платеж\n` +
            `5. Доступ активируется автоматически!\n\n` +
            `⚠️ Ссылка действительна 15 минут`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [
                  [{ text: '📋 Статус подписки' }],
                  [{ text: '⬅️ Назад к планам' }],
                  [{ text: '⬅️ Назад в меню' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
              }
            }
          );
          userStates.delete(user.id);
        } else {
          await bot.sendMessage(
            chatId,
            `❌ **Ошибка создания платежа**\n\n${paymentResult.error}\n\nПопробуйте позже или обратитесь в поддержку.`,
            { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
          );
        }
      } else {
        await bot.sendMessage(
          chatId,
          '❌ Сначала выберите план подписки.',
          subscriptionPlansKeyboard
        );
      }
      return;
    }

    if (text === '⬅️ Назад к планам') {
      userStates.delete(user.id);
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `💎 Выберите план подписки:\n\n` +
        `💎 **Базовый план** - ${basicPrice}₽/мес\n` +
        `• 100 запросов к ИИ-тренеру\n\n` +
        `⭐ **Стандартный план** - ${standardPrice}₽/мес\n` +
        `• 300 запросов к ИИ-тренеру\n\n` +
        `🚀 **Премиум план** - ${premiumPrice}₽/мес\n` +
        `• 600 запросов к ИИ-тренеру\n\n` +
        `Выберите план кнопкой ниже:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '⬅️ Назад к подписке') {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '💎 Управление подпиской\n\nВыберите действие:',
        subscriptionKeyboard
      );
      return;
    }

    if (text === '📊 Мой профиль' || text.includes('Мой профиль')) {
      await showUserProfile(bot, chatId, dbUser);
      return;
    }

    if (text === '❓ Помощь' || text.includes('Помощь')) {
      await bot.sendMessage(
        chatId,
        '❓ Справка и помощь\n\nВыберите интересующий вас раздел:',
        helpKeyboard
      );
      return;
    }

    if (text === '📈 Аналитика' || text.includes('Аналитика')) {
      await bot.sendMessage(
        chatId,
        '📊 Аналитика и статистика\n\nВыберите тип отчета, который хотите посмотреть:',
        analyticsKeyboard
      );
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

    // Обработчики кнопок помощи
    if (text === '💬 Как пользоваться ботом?' || text.includes('Как пользоваться ботом')) {
      await bot.sendMessage(
        chatId,
        '💬 **Как пользоваться ботом**\n\n' +
        '🤖 **ИИ-тренер** - ваш персональный помощник:\n' +
        '• Отвечает на вопросы о фитнесе и питании\n' +
        '• Составляет программы тренировок\n' +
        '• Даёт советы по здоровому образу жизни\n\n' +
        '🧬 **ИИ-инструменты** - специальные функции:\n' +
        '• `/training_program` - персональные программы\n' +
        '• `/nutrition_plan` - планы питания\n' +
        '• `/deepresearch` - научные исследования\n' +
        '• `/composition_analysis` - анализ добавок\n\n' +
        '🎯 **Мои данные** - отслеживание прогресса:\n' +
        '• Записывайте вес и тренировки\n' +
        '• Устанавливайте цели\n' +
        '• Просматривайте историю\n\n' +
        '📊 **Аналитика** - графики и отчёты:\n' +
        '• График изменения веса\n' +
        '• Статистика тренировок\n' +
        '• Общий отчёт прогресса\n\n' +
        '💎 **Подписка** - доступ к премиум функциям',
        { parse_mode: 'Markdown', ...helpKeyboard }
      );
      return;
    }

    if (text === '⚡ Что умеет ИИ-тренер?' || text.includes('Что умеет ИИ-тренер')) {
      await bot.sendMessage(
        chatId,
        '⚡ **Что умеет ИИ-тренер**\n\n' +
        '🏋️‍♂️ **Тренировки:**\n' +
        '• Составление персональных программ\n' +
        '• Подбор упражнений под ваш уровень\n' +
        '• Советы по технике выполнения\n' +
        '• Планирование периодизации\n\n' +
        '🥗 **Питание:**\n' +
        '• Расчёт калорий и БЖУ\n' +
        '• Составление рационов\n' +
        '• Советы по спортивному питанию\n' +
        '• Анализ диет и их эффективности\n\n' +
        '🎯 **Цели:**\n' +
        '• Похудение и сушка\n' +
        '• Набор мышечной массы\n' +
        '• Увеличение силы и выносливости\n' +
        '• Реабилитация и восстановление\n\n' +
        '🧪 **Научный подход:**\n' +
        '• Анализ исследований\n' +
        '• Проверка спортивных добавок\n' +
        '• Развенчание мифов\n' +
        '• Персонализированные рекомендации\n\n' +
        '💡 Просто задавайте любые вопросы через кнопку "🤖 ИИ-тренер"!',
        { parse_mode: 'Markdown', ...helpKeyboard }
      );
      return;
    }

    if (text === ' Аналитика') {
      await bot.sendMessage(
        chatId,
        '📊 Аналитика и статистика\n\nВыберите тип отчета, который хотите посмотреть:',
        analyticsKeyboard
      );
      return;
    }

    if (text === '🤖 ИИ-тренер') {
      // Проверяем возможность делать запросы
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        await bot.sendMessage(
          chatId,
          '💎 У вас закончились запросы к ИИ-тренеру.\n\n' +
          '🆓 Новые пользователи получают 7 бесплатных запросов\n' +
          '💪 Для неограниченного доступа оформите подписку!',
          noSubscriptionKeyboard
        );
        return;
      }

      // Показываем информацию о доступных запросах
      let requestInfo = '';
      if (requestStatus.type === 'free') {
        requestInfo = `\n\n🆓 Бесплатных запросов осталось: ${requestStatus.remaining}/7`;
      } else if (requestStatus.type === 'subscription') {
        requestInfo = `\n\n💎 Запросов по подписке: ${requestStatus.remaining}/${requestStatus.total}`;
      }

      // Активируем режим общения с ИИ
      userStates.set(user.id, 'chatting_with_ai');
      
      // Пробуем получить инструкции Coze
      try {
        const accessToken = await getUserAccessToken(dbUser.id);
        if (accessToken) {
          // Удаляем getCozeInstructions так как он больше не нужен
          // const instructions = await getCozeInstructions(accessToken);
          await bot.sendMessage(chatId, instructions.message + requestInfo, { parse_mode: 'Markdown' });
        } else {
          await bot.sendMessage(
            chatId,
            '🤖 *Добро пожаловать в ИИ-тренер!*\n\n' +
            'Я помогу вам с:\n' +
            '• Составлением программ тренировок\n' +
            '• Советами по питанию\n' +
            '• Вопросами о здоровье и фитнесе\n\n' +
            'Задавайте любые вопросы!' + requestInfo,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        await bot.sendMessage(
          chatId,
          '🤖 *Добро пожаловать в ИИ-тренер!*\n\n' +
          'Я помогу вам с:\n' +
          '• Составлением программ тренировок\n' +
          '• Советами по питанию\n' +
          '• Вопросами о здоровье и фитнесе\n\n' +
          'Задавайте любые вопросы!' + requestInfo,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    if (text === '🧬 ИИ-инструменты') {
      // Проверяем подписку пользователя
      const subscription = await getActiveSubscription(dbUser.id);
      
      if (!subscription) {
        await bot.sendMessage(
          chatId,
          '🔒 **ИИ-инструменты доступны только с подпиской**\n\n' +
          '🧬 Специальные инструменты включают:\n' +
          '• 🔬 Глубокий научный анализ\n' +
          '• 🏋️‍♂️ Персональные программы тренировок\n' +
          '• 🥗 Индивидуальные планы питания\n' +
          '• 🧪 Профессиональный анализ добавок\n\n' +
          '💎 Оформите подписку для доступа ко всем возможностям!',
          { parse_mode: 'Markdown', ...noSubscriptionKeyboard }
        );
        return;
      }
      
      await bot.sendMessage(
        chatId,
        '🧬 **Специальные ИИ-инструменты**\n\n' +
        'Выберите нужный инструмент:\n\n' +
        '🔬 **Глубокий анализ** - Детальное научное исследование любой темы\n' +
        '🏋️‍♂️ **План тренировок** - Персональная программа под ваши цели\n' +
        '🥗 **План питания** - Индивидуальный рацион с расчетом КБЖУ\n' +
        '🧪 **Анализ добавок** - Экспертная оценка состава и эффективности',
        { parse_mode: 'Markdown', ...aiToolsKeyboard }
      );
      return;
    }

    if (text === '🔄 Новый диалог') {
      // Сбрасываем состояние пользователя
      userStates.delete(user.id);
      
      // Очищаем контекст workflow
      userWorkflowContext.delete(user.id);
      console.log(`🗑️ Очищен контекст workflow для пользователя ${user.id}`);
      
      // Очищаем conversation_id пользователя
      clearConversation(dbUser.id);
      
      await bot.sendMessage(
        chatId,
        '🔄 Диалог сброшен!\n\nТеперь ИИ-тренер не помнит вашу предыдущую переписку и контекст анализов. Можете начать новый разговор.',
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

    // === ОБРАБОТЧИКИ КОМАНД УПРАВЛЕНИЯ ДАННЫМИ ===
    
    // Запись веса
    if (text === '⚖️ Записать вес') {
      userStates.set(user.id, { action: 'waiting_weight' });
      await bot.sendMessage(
        chatId,
        '⚖️ **Запись веса**\n\n' +
        'Введите ваш текущий вес в килограммах.\n\n' +
        '💡 Примеры:\n' +
        '• `75.5`\n' +
        '• `68`\n' +
        '• `82.3`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Установка цели
    if (text === '🎯 Установить цель') {
      await bot.sendMessage(
        chatId,
        '🎯 **Установка цели**\n\n' +
        'Выберите тип цели:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      return;
    }

    // Обработка типов целей
    if (['🏋️‍♂️ Набрать мышечную массу', '⚖️ Снизить вес', '💪 Увеличить силу', '🏃‍♂️ Улучшить выносливость', '🤸‍♂️ Повысить гибкость', '⚡ Общая физподготовка'].includes(text)) {
      const goalType = text.split(' ').slice(1).join(' ').toLowerCase();
      userStates.set(user.id, { action: 'waiting_goal_value', goalType: goalType });
      
      let prompt = '🎯 **Установка цели: ' + text + '**\n\n';
      if (text === '⚖️ Снизить вес') {
        prompt += 'Введите желаемый вес в килограммах:\n\n💡 Пример: `70`';
      } else {
        prompt += 'Опишите вашу цель подробно:\n\n💡 Примеры:\n• `Увеличить жим лежа до 100 кг`\n• `Пробежать 10 км за 45 минут`\n• `Набрать 5 кг мышечной массы`';
      }
      
      await bot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
      return;
    }

    // Добавление тренировки
    if (text === '🏋️‍♂️ Добавить тренировку') {
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ **Добавление тренировки**\n\n' +
        'Выберите тип тренировки:',
        { parse_mode: 'Markdown', ...workoutTypesKeyboard }
      );
      return;
    }

    // Обработка типов тренировок
    if (text === '💪 Силовая') {
      // Инициализируем новую детальную тренировку
      activeWorkouts.set(user.id, {
        type: 'strength',
        exercises: [],
        startTime: new Date(),
        moodBefore: 3 // Нейтральное настроение по умолчанию
      });
      
      await bot.sendMessage(
        chatId,
        '💪 **Силовая тренировка начата!**\n\n' +
        '�️‍♂️ Добавляйте упражнения по мере их выполнения.\n' +
        'Для каждого упражнения вы сможете записать количество подходов, вес отягощения, повторения и оставить комментарии.',
        { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
      );
      
      return;
    }

    if (['🏃‍♂️ Кардио', '🧘‍♂️ Йога/Растяжка', '🏊‍♂️ Плавание', '🚴‍♂️ Велосипед', '🥊 Единоборства', '⚽ Спортивные игры', '🏃‍♂️ Другое'].includes(text)) {
      const workoutType = text.split(' ').slice(1).join(' ');
      userStates.set(user.id, { action: 'waiting_workout_duration', workoutType: workoutType });
      
      await bot.sendMessage(
        chatId,
        '⏱️ **Длительность тренировки**\n\n' +
        `Тип: ${text}\n\n` +
        'Введите продолжительность тренировки в минутах:\n\n' +
        '💡 Примеры:\n' +
        '• `45` (45 минут)\n' +
        '• `90` (1.5 часа)\n' +
        '• `30` (30 минут)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Просмотр записей
    if (text === '📊 Мои записи') {
      await bot.sendMessage(
        chatId,
        '📊 **Мои записи**\n\n' +
        'Что вы хотите посмотреть?',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    // Управление записями
    if (text === '🔧 Изменить данные') {
      await bot.sendMessage(
        chatId,
        '🔧 **Изменение данных**\n\n' +
        'Что вы хотите изменить?',
        { parse_mode: 'Markdown', ...manageRecordsKeyboard }
      );
      return;
    }

    // Удаление записей
    if (text === '🗑️ Удалить записи') {
      await bot.sendMessage(
        chatId,
        '🗑️ **Удаление записей**\n\n' +
        '⚠️ Будьте осторожны! Удаленные данные восстановить нельзя.\n\n' +
        'Что вы хотите удалить?',
        { parse_mode: 'Markdown', ...deleteRecordsKeyboard }
      );
      return;
    }

    // === ОБРАБОТЧИКИ УДАЛЕНИЯ ЗАПИСЕЙ ===
    
    if (text === '🗑️ Удалить последнюю тренировку') {
      await handleDeleteLastWorkout(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '🗑️ Удалить последний вес') {
      await handleDeleteLastWeight(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '🗑️ Удалить все тренировки') {
      await confirmDeleteAllWorkouts(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '🗑️ Удалить все записи веса') {
      await confirmDeleteAllWeights(bot, chatId, dbUser.id);
      return;
    }

    // === ОБРАБОТЧИКИ ПРОСМОТРА ЗАПИСЕЙ ===
    
    if (text === '⚖️ История веса') {
      await showWeightHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '🎯 Мои цели') {
      await showUserGoals(bot, chatId, dbUser.id);
      return;
    }

    if (text === '🏋️‍♂️ История тренировок') {
      await showWorkoutHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '📈 Статистика') {
      await showUserStatistics(bot, chatId, dbUser.id);
      return;
    }

    // === ОБРАБОТЧИКИ ИЗМЕНЕНИЯ ЗАПИСЕЙ ===
    
    if (text === '✏️ Изменить последний вес') {
      const lastWeight = await getLastWeightRecord(dbUser.id);
      if (!lastWeight) {
        await bot.sendMessage(chatId, '❌ У вас нет записей веса для изменения.');
        return;
      }
      
      userStates.set(user.id, { action: 'waiting_weight_update' });
      await bot.sendMessage(
        chatId,
        `✏️ **Изменение последней записи веса**\n\n` +
        `Текущий вес: **${lastWeight.value} ${lastWeight.unit}**\n` +
        `Дата записи: ${new Date(lastWeight.recorded_at).toLocaleDateString('ru-RU')}\n\n` +
        `Введите новый вес в килограммах:`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (text === '✏️ Изменить цель') {
      await bot.sendMessage(
        chatId,
        '✏️ **Изменение цели**\n\n' +
        'Выберите тип цели для изменения:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      return;
    }

    if (text === '✏️ Изменить тренировку') {
      const lastWorkout = await getLastWorkoutRecord(dbUser.id);
      if (!lastWorkout) {
        await bot.sendMessage(chatId, '❌ У вас нет записей тренировок для изменения.');
        return;
      }
      
      userStates.set(user.id, { action: 'waiting_workout_update' });
      await bot.sendMessage(
        chatId,
        `✏️ **Изменение последней тренировки**\n\n` +
        `Тип: **${lastWorkout.workout_type}**\n` +
        `Длительность: **${lastWorkout.duration_minutes} мин**\n` +
        `Калории: **${lastWorkout.calories_burned || 0}**\n` +
        `Дата: ${new Date(lastWorkout.workout_date).toLocaleDateString('ru-RU')}\n\n` +
        `Выберите новый тип тренировки:`,
        { parse_mode: 'Markdown', ...workoutTypesKeyboard }
      );
      return;
    }

    // === ОБРАБОТЧИКИ УДАЛЕНИЯ ЗАПИСЕЙ ===
    
    if (text === '🗑️ Удалить последний вес') {
      const lastWeight = await getLastWeightRecord(dbUser.id);
      if (!lastWeight) {
        await bot.sendMessage(chatId, '❌ У вас нет записей веса для удаления.');
        return;
      }
      
      const deleted = await deleteLastWeightRecord(dbUser.id);
      if (deleted) {
        await bot.sendMessage(
          chatId,
          `✅ **Запись веса удалена**\n\n` +
          `Удален вес: **${lastWeight.value} ${lastWeight.unit}**\n` +
          `Дата: ${new Date(lastWeight.recorded_at).toLocaleDateString('ru-RU')}`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при удалении записи веса.');
      }
      return;
    }

    if (text === '🗑️ Удалить цель') {
      await bot.sendMessage(
        chatId,
        '🗑️ **Удаление цели**\n\n' +
        'Выберите тип цели для удаления:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      userStates.set(user.id, { action: 'delete_goal' });
      return;
    }

    if (text === '🗑️ Удалить тренировку') {
      const lastWorkout = await getLastWorkoutRecord(dbUser.id);
      if (!lastWorkout) {
        await bot.sendMessage(chatId, '❌ У вас нет записей тренировок для удаления.');
        return;
      }
      
      const deleted = await deleteLastWorkoutRecord(dbUser.id);
      if (deleted) {
        await bot.sendMessage(
          chatId,
          `✅ **Тренировка удалена**\n\n` +
          `Тип: **${lastWorkout.workout_type}**\n` +
          `Длительность: **${lastWorkout.duration_minutes} мин**\n` +
          `Дата: ${new Date(lastWorkout.workout_date).toLocaleDateString('ru-RU')}`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при удалении тренировки.');
      }
      return;
    }

    if (text === '🗑️ Очистить всё') {
      userStates.set(user.id, { action: 'confirm_clear_all' });
      await bot.sendMessage(
        chatId,
        '⚠️ **ВНИМАНИЕ!**\n\n' +
        'Вы собираетесь удалить ВСЕ свои данные:\n' +
        '• Записи веса\n' +
        '• Все цели\n' +
        '• Историю тренировок\n' +
        '• Достижения\n\n' +
        '❗ Это действие нельзя отменить!\n\n' +
        'Введите `УДАЛИТЬ ВСЁ` для подтверждения или любой другой текст для отмены.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Обработка кнопки "Назад" для подменю
    if (text === '⬅️ Назад') {
      const state = userStates.get(user.id);
      if (state && state.action === 'delete_goal') {
        userStates.delete(user.id);
      }
      await bot.sendMessage(
        chatId,
        '🎯 **Управление данными**\n\nВыберите действие:',
        { parse_mode: 'Markdown', ...userDataKeyboard }
      );
      return;
    }

    // Обработчики команд из ИИ-инструментов
    if (text.includes('/deepresearch')) {
      // Проверяем подписку
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '🔒 Эта функция доступна только с подпиской!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_research_topic');
      await bot.sendMessage(chatId, 
        '🔬 **Глубокое исследование**\n\n' +
        'Укажите тему для детального научного анализа.\n\n' +
        '💡 **Примеры тем:**\n' +
        '• Влияние креатина на силовые показатели\n' +
        '• Гендерные различия в силовом тренинге\n' +
        '• Оптимальное время для кардио и силовых\n' +
        '• Периодизация тренировок для набора массы\n' +
        '• Спортивное питание для восстановления\n\n' +
        '📝 Напишите вашу тему:'
      );
      return;
    }

    if (text.includes('/training_program')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '🔒 Эта функция доступна только с подпиской!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_training_request');
      await bot.sendMessage(chatId, 
        '🏋️‍♂️ **Создание тренировочной программы**\n\n' +
        'Расскажите подробно о ваших целях и условиях тренировок:\n\n' +
        '📋 **Укажите:**\n' +
        '• Цель тренировок (похудение, набор массы, сила, выносливость)\n' +
        '• Уровень подготовки (новичок, средний, продвинутый)\n' +
        '• Сколько дней в неделю готовы тренироваться\n' +
        '• Доступное время на тренировку\n' +
        '• Доступное оборудование (зал, дом, какие снаряды)\n' +
        '• Ограничения по здоровью (если есть)\n\n' +
        '📝 Опишите ваши требования:'
      );
      return;
    }

    if (text.includes('/nutrition_plan')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '🔒 Эта функция доступна только с подпиской!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_nutrition_request');
      await bot.sendMessage(chatId, 
        '🥗 **Создание плана питания**\n\n' +
        'Для составления персонального плана питания укажите:\n\n' +
        '📊 **Основные данные:**\n' +
        '• Цель (похудение, набор массы, поддержание веса)\n' +
        '• Пол, возраст, рост, текущий вес\n' +
        '• Уровень физической активности\n' +
        '• Сколько приемов пищи предпочитаете\n\n' +
        '🍽️ **Предпочтения:**\n' +
        '• Аллергии или непереносимость продуктов\n' +
        '• Особый тип питания (веган, кето, без глютена и т.д.)\n' +
        '• Нелюбимые продукты\n' +
        '• Бюджет на питание\n\n' +
        '📝 Расскажите о себе:'
      );
      return;
    }

    if (text.includes('/composition_analysis')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '🔒 Эта функция доступна только с подпиской!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_supplement_info');
      await bot.sendMessage(chatId, 
        '🧪 **Анализ состава добавки**\n\n' +
        'Отправьте информацию о добавке для детального анализа:\n\n' +
        '📷 **Способы отправки:**\n' +
        '• Фото этикетки с составом\n' +
        '• Название добавки и производителя\n' +
        '• Список ингредиентов с дозировками\n\n' +
        '🔍 **Я проанализирую:**\n' +
        '• Эффективность компонентов\n' +
        '• Безопасность дозировок\n' +
        '• Научные исследования\n' +
        '• Рекомендации по применению\n' +
        '• Возможные побочные эффекты\n\n' +
        '📝 Отправьте информацию о добавке:'
      );
      return;
    }

    // Обработчики записи тренировок
    if (['💪 Силовая тренировка', '🏃‍♂️ Кардио', '🧘‍♀️ Йога/Растяжка', '🏋️‍♀️ Функциональная'].includes(text)) {
      await handleWorkoutType(bot, chatId, dbUser.id, text);
      return;
    }

    // Обработчики режимов записи силовой тренировки
    if (text === '🔥 Детальная запись') {
      // Начинаем детальную силовую тренировку
      activeWorkouts.set(user.id, {
        type: 'strength',
        startTime: Date.now(),
        exercises: []
      });
      
      await bot.sendMessage(
        chatId,
        '💪 **Силовая тренировка начата!**\n\n' +
        '🏋️‍♂️ Добавляйте упражнения по мере их выполнения.\n' +
        'Для каждого упражнения вы сможете записать количество подходов, вес отягощения, повторения и оставить комментарии.',
        { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
      );
      return;
    }

    if (text === '⚡ Быстрая запись') {
      // Быстрая запись силовой тренировки
      try {
        const duration = 60; // 60 минут по умолчанию
        const calories = 300;
        const intensity = 3; // средняя интенсивность
        const exercisesCount = 8;
        
        await addWorkout(dbUser.id, 'strength', duration, calories, intensity, exercisesCount, 'Силовая тренировка');

        await bot.sendMessage(
          chatId,
          '✅ Силовая тренировка записана!\n\n' +
          '📊 Данные тренировки:\n' +
          '⏱ Продолжительность: 60 минут\n' +
          '🔥 Калории: 300 ккал\n' +
          '📈 Интенсивность: 3/5\n' +
          '🏋️‍♂️ Упражнений: 8\n\n' +
          '💡 В следующий раз попробуйте детальную запись для более точного учёта!',
          workoutKeyboard
        );
      } catch (error) {
        console.error('Ошибка быстрой записи тренировки:', error);
        await bot.sendMessage(
          chatId,
          '❌ Ошибка при записи тренировки. Попробуйте позже.',
          workoutKeyboard
        );
      }
      return;
    }

    // === ОБРАБОТЧИКИ ДЕТАЛЬНОЙ СИЛОВОЙ ТРЕНИРОВКИ ===
    
    if (text === '➕ Добавить упражнение') {
      console.log(`🏋️‍♂️ Обработка добавления упражнения для пользователя ${user.id}`);
      if (!activeWorkouts.has(user.id)) {
        console.log(`❌ У пользователя ${user.id} нет активной тренировки`);
        await bot.sendMessage(chatId, '❌ У вас нет активной тренировки. Начните новую силовую тренировку.');
        return;
      }
      
      console.log(`✅ У пользователя ${user.id} есть активная тренировка, показываем упражнения`);
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ **Выберите упражнение**\n\n' +
        'Выберите из популярных упражнений или введите свое:',
        { parse_mode: 'Markdown', ...popularExercisesKeyboard }
      );
      userStates.set(user.id, { action: 'selecting_exercise' });
      return;
    }

    if (text === '📊 Посмотреть тренировку') {
      const workout = activeWorkouts.get(user.id);
      if (!workout) {
        await bot.sendMessage(chatId, '❌ У вас нет активной тренировки.');
        return;
      }
      
      await showCurrentWorkout(bot, chatId, workout);
      return;
    }

    if (text === '✅ Завершить тренировку') {
      const workout = activeWorkouts.get(user.id);
      if (!workout) {
        await bot.sendMessage(chatId, '❌ У вас нет активной тренировки.');
        return;
      }
      
      if (workout.exercises.length === 0) {
        await bot.sendMessage(
          chatId,
          '❌ Нельзя завершить тренировку без упражнений.\n\nДобавьте хотя бы одно упражнение или отмените тренировку.',
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
        return;
      }
      
      const moodKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '😄 Отлично', callback_data: 'mood_5' },
              { text: '😊 Хорошо', callback_data: 'mood_4' }
            ],
            [
              { text: '😐 Нормально', callback_data: 'mood_3' },
              { text: '😕 Плохо', callback_data: 'mood_2' }
            ],
            [
              { text: '😞 Ужасно', callback_data: 'mood_1' }
            ]
          ]
        }
      };
      
      await bot.sendMessage(
        chatId,
        '🎯 **Оцените ваше настроение после тренировки:**\n\n' +
        'Как вы себя чувствуете сейчас?',
        { parse_mode: 'Markdown', ...moodKeyboard }
      );
      userStates.set(user.id, { action: 'waiting_mood_after' });
      return;
    }

    if (text === '❌ Отменить тренировку') {
      if (activeWorkouts.has(user.id)) {
        activeWorkouts.delete(user.id);
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ **Тренировка отменена**\n\nВсе данные удалены.',
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '❌ У вас нет активной тренировки.');
      }
      return;
    }

    // Обработка выбора популярных упражнений
    if (['🏋️‍♂️ Жим лежа', '🏋️‍♂️ Приседания', '🏋️‍♂️ Становая тяга', '🏋️‍♂️ Подтягивания'].includes(text)) {
      const userState = userStates.get(user.id);
      if (userState && userState.action === 'selecting_exercise') {
        // Убираем эмодзи из названия упражнения
        const exerciseName = text.replace('🏋️‍♂️ ', '');
        userStates.set(user.id, { action: 'waiting_sets_count', exerciseName: exerciseName });
        
        await bot.sendMessage(
          chatId,
          `🏋️‍♂️ **${exerciseName}**\n\n` +
          `Сколько подходов вы планируете сделать?\n\n` +
          `💡 Примеры: 3, 4, 5`,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    if (text === '📝 Другое упражнение') {
      const userState = userStates.get(user.id);
      if (userState && userState.action === 'selecting_exercise') {
        userStates.set(user.id, { action: 'waiting_custom_exercise' });
        
        await bot.sendMessage(
          chatId,
          '✏️ **Введите название упражнения**\n\n' +
          '💡 Примеры:\n' +
          '• Жим гантелей\n' +
          '• Махи гирей\n' +
          '• Планка',
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    // === ОБРАБОТКА СОСТОЯНИЙ ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ ===
    
    const userState = userStates.get(user.id);
    
    // Обработка ввода веса
    if (userState && userState.action === 'waiting_weight') {
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight <= 0 || weight > 300) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите корректный вес (число от 1 до 300).\n\n💡 Примеры: `75.5`, `68`, `82.3`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        await saveFitnessMetric(dbUser.id, 'weight', weight, 'kg');
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `✅ **Вес записан!**\n\n` +
          `📊 Ваш вес: **${weight} кг**\n` +
          `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `Записывайте вес регулярно для отслеживания прогресса!`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Ошибка при сохранении веса. Попробуйте еще раз.');
      }
      return;
    }

    // Обработка ввода значения цели
    if (userState && userState.action === 'waiting_goal_value') {
      try {
        const goalType = userState.goalType;
        let targetValue = text.trim();
        
        // Для веса пытаемся распарсить число
        if (goalType === 'снизить вес') {
          const weight = parseFloat(text.replace(',', '.'));
          if (isNaN(weight) || weight <= 0 || weight > 300) {
            await bot.sendMessage(
              chatId,
              '❌ Пожалуйста, введите корректный целевой вес (число от 1 до 300).\n\n💡 Пример: `70`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          targetValue = weight.toString();
        }

        await setUserGoal(dbUser.id, goalType, targetValue);
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `✅ **Цель установлена!**\n\n` +
          `🎯 Тип: **${goalType}**\n` +
          `📊 Цель: **${targetValue}**\n` +
          `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `Удачи в достижении цели! 💪`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Ошибка при сохранении цели. Попробуйте еще раз.');
      }
      return;
    }

    // Обработка ввода длительности тренировки
    if (userState && userState.action === 'waiting_workout_duration') {
      const duration = parseInt(text);
      if (isNaN(duration) || duration <= 0 || duration > 600) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите корректную длительность (от 1 до 600 минут).\n\n💡 Примеры: `45`, `90`, `30`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      userStates.set(user.id, { 
        action: 'waiting_workout_calories', 
        workoutType: userState.workoutType, 
        duration: duration 
      });
      
      await bot.sendMessage(
        chatId,
        '🔥 **Потраченные калории**\n\n' +
        `Тип: **${userState.workoutType}**\n` +
        `Длительность: **${duration} мин**\n\n` +
        'Сколько калорий вы потратили? (необязательно)\n\n' +
        '💡 Примеры:\n' +
        '• `300` (300 калорий)\n' +
        '• `0` (если не знаете)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Обработка ввода калорий для тренировки
    if (userState && userState.action === 'waiting_workout_calories') {
      const calories = parseInt(text) || 0;
      if (calories < 0 || calories > 2000) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите корректное количество калорий (от 0 до 2000).\n\n💡 Примеры: `300`, `450`, `0`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        // Сохраняем кардио тренировку с детальной информацией
        const workoutDetails = {
          type: userState.workoutType,
          duration: userState.duration,
          calories: calories,
          averageIntensity: 'medium',
          totalCalories: calories,
          exercises: [] // Для кардио нет упражнений
        };
        
        await saveDetailedWorkout(
          dbUser.id, 
          'cardio', 
          userState.duration, 
          workoutDetails,
          null, // moodBefore
          null, // moodAfter
          `Кардио тренировка: ${userState.workoutType}` // notes
        );
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `✅ **Тренировка записана!**\n\n` +
          `🏋️‍♂️ Тип: **${userState.workoutType}**\n` +
          `⏱️ Время: **${userState.duration} мин**\n` +
          `🔥 Калории: **${calories}**\n` +
          `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `Отличная работа! 💪`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Ошибка при сохранении тренировки. Попробуйте еще раз.');
      }
      return;
    }

    // Обработка обновления веса
    if (userState && userState.action === 'waiting_weight_update') {
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight <= 0 || weight > 300) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите корректный вес (число от 1 до 300).\n\n💡 Примеры: `75.5`, `68`, `82.3`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        const updated = await updateLastWeightRecord(dbUser.id, weight);
        userStates.delete(user.id);
        
        if (updated) {
          await bot.sendMessage(
            chatId,
            `✅ **Вес обновлен!**\n\n` +
            `📊 Новый вес: **${weight} кг**\n` +
            `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );
        } else {
          await bot.sendMessage(chatId, '❌ Ошибка при обновлении веса.');
        }
      } catch (error) {
        await bot.sendMessage(chatId, '❌ Ошибка при обновлении веса. Попробуйте еще раз.');
      }
      return;
    }

    // Обработка подтверждения полной очистки
    if (userState && userState.action === 'confirm_clear_all') {
      if (text.trim().toUpperCase() === 'УДАЛИТЬ ВСЁ') {
        try {
          await clearAllUserData(dbUser.id);
          userStates.delete(user.id);
          
          await bot.sendMessage(
            chatId,
            `✅ **Все данные удалены**\n\n` +
            `🗑️ Удалено:\n` +
            `• История веса\n` +
            `• Все цели\n` +
            `• История тренировок\n` +
            `• Достижения\n\n` +
            `Вы можете начать записывать данные заново.`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );
        } catch (error) {
          await bot.sendMessage(chatId, '❌ Ошибка при удалении данных.');
        }
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ **Удаление отменено**\n\nВаши данные сохранены.',
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      }
      return;
    }

    // Обработка удаления цели
    if (userState && userState.action === 'delete_goal') {
      if (['🎯 Целевой вес', '💪 Набор мышц', '🔥 Сжигание жира', '🏃‍♂️ Улучшить выносливость', '🏋️‍♂️ Увеличить силу', '🧘‍♂️ Улучшить гибкость'].includes(text)) {
        const goalType = text.split(' ').slice(1).join(' ').toLowerCase();
        
        try {
          const deleted = await deleteUserGoal(dbUser.id, goalType);
          userStates.delete(user.id);
          
          if (deleted) {
            await bot.sendMessage(
              chatId,
              `✅ **Цель удалена**\n\n` +
              `🗑️ Удалена цель: **${goalType}**`,
              { parse_mode: 'Markdown', ...userDataKeyboard }
            );
          } else {
            await bot.sendMessage(
              chatId,
              `❌ Цель "${goalType}" не найдена.`,
              { parse_mode: 'Markdown', ...userDataKeyboard }
            );
          }
        } catch (error) {
          await bot.sendMessage(chatId, '❌ Ошибка при удалении цели.');
        }
        return;
      }
    }

    // === ОБРАБОТЧИКИ ДЕТАЛЬНЫХ ТРЕНИРОВОК ===
    
    // Обработка выбора произвольного упражнения
    if (userState && userState.action === 'waiting_custom_exercise') {
      if (text.length < 2 || text.length > 50) {
        await bot.sendMessage(
          chatId,
          '❌ Название упражнения должно быть от 2 до 50 символов.'
        );
        return;
      }

      userStates.set(user.id, { action: 'waiting_sets_count', exerciseName: text });
      
      await bot.sendMessage(
        chatId,
        `🏋️‍♂️ **${text}**\n\n` +
        `Сколько подходов вы планируете сделать?\n\n` +
        `💡 Примеры: 3, 4, 5`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Обработка количества подходов
    if (userState && userState.action === 'waiting_sets_count') {
      const setsCount = parseInt(text);
      if (isNaN(setsCount) || setsCount < 1 || setsCount > 10) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите количество подходов от 1 до 10.'
        );
        return;
      }

      const exercise = {
        name: userState.exerciseName,
        sets: [],
        totalSets: setsCount,
        currentSet: 1
      };

      const workout = activeWorkouts.get(user.id);
      if (workout) {
        workout.exercises.push(exercise);
        
        await bot.sendMessage(
          chatId,
          `🏋️‍♂️ **${exercise.name}**\n\n` +
          `📊 Подход ${exercise.currentSet} из ${exercise.totalSets}\n\n` +
          `⚖️ Введите вес отягощения (в кг):\n\n` +
          `💡 Примеры:\n` +
          `• 50 - штанга 50 кг\n` +
          `• 20 - гантели 20 кг\n` +
          `• 0 - собственный вес (подтягивания, отжимания)`,
          { parse_mode: 'Markdown' }
        );
        
        userStates.set(user.id, { 
          action: 'waiting_exercise_weight', 
          exerciseIndex: workout.exercises.length - 1 
        });
      }
      return;
    }

    // Обработка веса отягощения
    if (userState && userState.action === 'waiting_exercise_weight') {
      const weight = parseFloat(text);
      if (isNaN(weight) || weight < 0 || weight > 1000) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите вес отягощения от 0 до 1000 кг.\n\n' +
          '💡 0 = собственный вес (без дополнительного отягощения)'
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      // Сохраняем вес для текущего подхода
      exercise.currentWeight = weight;
      
      await bot.sendMessage(
        chatId,
        `🏋️‍♂️ **${exercise.name}**\n\n` +
        `📊 Подход ${exercise.currentSet} из ${exercise.totalSets}\n` +
        `⚖️ Отягощение: ${weight === 0 ? 'собственный вес' : weight + ' кг'}\n\n` +
        `Введите количество повторений:\n\n` +
        `💡 Примеры: 10, 12, 8`,
        { parse_mode: 'Markdown' }
      );

      userStates.set(user.id, { 
        action: 'waiting_reps', 
        exerciseIndex: userState.exerciseIndex 
      });
      return;
    }

    // Обработка повторений
    if (userState && userState.action === 'waiting_reps') {
      const reps = parseInt(text);
      if (isNaN(reps) || reps < 1 || reps > 100) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, введите количество повторений от 1 до 100.'
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      exercise.sets.push({ 
        reps: reps, 
        weight: exercise.currentWeight || 0, 
        notes: null 
      });
      
      if (exercise.currentSet < exercise.totalSets) {
        exercise.currentSet++;
        
        await bot.sendMessage(
          chatId,
          `✅ **Подход ${exercise.currentSet - 1}: ${reps} повторений** ${exercise.currentWeight === 0 ? '(собственный вес)' : '(' + exercise.currentWeight + ' кг)'}\n\n` +
          `🏋️‍♂️ **${exercise.name}**\n` +
          `📊 Подход ${exercise.currentSet} из ${exercise.totalSets}\n\n` +
          `⚖️ Введите вес отягощения (в кг):`,
          { parse_mode: 'Markdown' }
        );

        userStates.set(user.id, { 
          action: 'waiting_exercise_weight', 
          exerciseIndex: userState.exerciseIndex 
        });
      } else {
        await bot.sendMessage(
          chatId,
          `✅ **Упражнение "${exercise.name}" завершено!**\n\n` +
          `📊 Результат:\n` +
          exercise.sets.map((set, i) => 
            `Подход ${i + 1}: ${set.reps} повторений ${set.weight === 0 ? '(собственный вес)' : '(' + set.weight + ' кг)'}`
          ).join('\n') + '\n\n' +
          `💬 Хотите добавить комментарий к этому упражнению?\n` +
          `(например: "легко", "до отказа", "тяжело")\n\n` +
          `Или нажмите "Пропустить" чтобы продолжить.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '⏩ Пропустить' }],
                [{ text: '➕ Добавить упражнение' }, { text: '✅ Завершить тренировку' }]
              ],
              resize_keyboard: true,
              one_time_keyboard: false
            }
          }
        );
        
        userStates.set(user.id, { 
          action: 'waiting_exercise_notes', 
          exerciseIndex: userState.exerciseIndex 
        });
      }
      return;
    }

    // Обработка комментариев к упражнению
    if (userState && userState.action === 'waiting_exercise_notes') {
      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      if (text !== '⏩ Пропустить') {
        exercise.notes = text;
        await bot.sendMessage(
          chatId,
          `✅ **Комментарий добавлен:** "${text}"\n\n` +
          `Продолжайте тренировку:`,
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
      } else {
        await bot.sendMessage(
          chatId,
          `✅ **Упражнение сохранено**\n\n` +
          `Продолжайте тренировку:`,
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
      }
      
      userStates.delete(user.id);
      return;
    }

    // Обработка настроения после тренировки
    if (userState && userState.action === 'waiting_mood_after') {
      const moodValue = parseMoodValue(text);
      const moodKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '😄 Отлично', callback_data: 'mood_5' },
              { text: '😊 Хорошо', callback_data: 'mood_4' }
            ],
            [
              { text: '😐 Нормально', callback_data: 'mood_3' },
              { text: '😕 Плохо', callback_data: 'mood_2' }
            ],
            [
              { text: '😞 Ужасно', callback_data: 'mood_1' }
            ]
          ]
        }
      };
      
      if (moodValue === null) {
        await bot.sendMessage(
          chatId,
          '❌ Пожалуйста, выберите настроение из предложенных вариантов.',
          { parse_mode: 'Markdown', ...moodKeyboard }
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      if (workout) {
        workout.moodAfter = moodValue;
        
        await bot.sendMessage(
          chatId,
          '📝 **Финальные комментарии**\n\n' +
          'Добавьте общий комментарий к тренировке:\n' +
          '• Как прошла тренировка?\n' +
          '• Что получилось хорошо?\n' +
          '• Что можно улучшить?\n\n' +
          'Или нажмите "Пропустить":',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '⏩ Пропустить' }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }
        );
        
        userStates.set(user.id, { action: 'waiting_workout_notes' });
      }
      return;
    }

    // Обработка общих комментариев к тренировке
    if (userState && userState.action === 'waiting_workout_notes') {
      const workout = activeWorkouts.get(user.id);
      if (workout) {
        const workoutNotes = text === '⏩ Пропустить' ? null : text;
        
        // Сохраняем тренировку в базу данных
        try {
          const workoutDetails = {
            exercises: workout.exercises,
            totalExercises: workout.exercises.length,
            totalSets: workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
            totalReps: workout.exercises.reduce((sum, ex) => 
              sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
            ),
            totalWeight: workout.exercises.reduce((sum, ex) => 
              sum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
            ),
            averageIntensity: 'medium',
            duration: Math.round((new Date() - workout.startTime) / (1000 * 60)) // в минутах
          };

          await saveDetailedWorkout(
            dbUser.id,
            'strength',
            workoutDetails.duration,
            workoutDetails,
            workout.moodBefore,
            workout.moodAfter,
            workoutNotes
          );

          // Очищаем активную тренировку
          activeWorkouts.delete(user.id);
          userStates.delete(user.id);

          await bot.sendMessage(
            chatId,
            `🎉 **Тренировка сохранена!**\n\n` +
            `💪 **Результаты:**\n` +
            `• Упражнений: ${workoutDetails.totalExercises}\n` +
            `• Подходов: ${workoutDetails.totalSets}\n` +
            `• Повторений: ${workoutDetails.totalReps}\n` +
            `• Поднято с отягощением: ${workoutDetails.totalWeight} кг\n` +
            `• Время: ${workoutDetails.duration} мин\n` +
            `• Настроение: ${getMoodEmoji(workout.moodBefore)} → ${getMoodEmoji(workout.moodAfter)}\n\n` +
            `Отличная работа! 💪`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );

        } catch (error) {
          await bot.sendMessage(chatId, '❌ Ошибка при сохранении тренировки. Попробуйте еще раз.');
          console.error('Ошибка сохранения тренировки:', error);
        }
      }
      return;
    }

    // Если пользователь ожидает ввода темы для исследования
    if (userStates.get(user.id) === 'waiting_for_research_topic') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '🔬 Запускаю глубокий анализ', 'deep_research');
      return;
    }

    // Если пользователь ожидает ввода данных для тренировочной программы
    if (userStates.get(user.id) === 'waiting_for_training_request') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '🏋️‍♂️ Создаю персональную программу тренировок', 'training_program');
      return;
    }

    // Если пользователь ожидает ввода данных для плана питания
    if (userStates.get(user.id) === 'waiting_for_nutrition_request') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '🥗 Составляю индивидуальный план питания', 'nutrition_plan');
      return;
    }

    // Если пользователь ожидает ввода информации о добавке
    if (userStates.get(user.id) === 'waiting_for_supplement_info') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '🧪 Анализирую состав добавки', 'composition_analysis');
      return;
    }

    // Если пользователь в режиме чата с ИИ
    if (userStates.get(user.id) === 'chatting_with_ai') {
      // Проверяем возможность делать запросы
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ У вас закончились запросы к ИИ-тренеру.\n\n' +
          '🆓 Бесплатные запросы: 0/7\n' +
          '💎 Оформите подписку для продолжения!',
          noSubscriptionKeyboard
        );
        return;
      }

      // Отправляем запрос в Coze
      await bot.sendChatAction(chatId, 'typing');
      
      // Отправляем сообщение о том, что бот думает
      const thinkingMessage = await bot.sendMessage(chatId, '🤔 Анализирую ваш вопрос...');
      
      // Проверяем, есть ли контекст от предыдущего workflow
      const workflowContext = userWorkflowContext.get(user.id);
      let messageWithContext = text;
      
      if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 минут
        messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО АНАЛИЗА:
Тип анализа: ${workflowContext.type}
Запрос пользователя: "${workflowContext.query}"
Полученный результат: "${workflowContext.result.substring(0, 1000)}..."

НОВЫЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}`;
        
        console.log(`📋 Добавлен контекст workflow к сообщению для пользователя ${user.id}`);
      }
      
  const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер: будь конкретным, структурируй ответы списками, избегай лишней воды.');
      
      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }
      
      if (aiResponse.success) {
        // Списываем запрос
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n🆓 Бесплатных запросов осталось: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }

    // === ОБРАБОТЧИКИ ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ===
    
    // Обработка подтверждения удаления всех тренировок
    if (userStates.get(user.id) === 'waiting_confirm_delete_all_workouts') {
      if (text === 'УДАЛИТЬ ВСЕ ТРЕНИРОВКИ') {
        userStates.delete(user.id);
        await processDeleteAllWorkouts(bot, chatId, dbUser.id);
        return;
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ Удаление отменено.\n\nДля подтверждения нужно было написать точно: `УДАЛИТЬ ВСЕ ТРЕНИРОВКИ`',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
        return;
      }
    }
    
    // Обработка подтверждения удаления всех записей веса
    if (userStates.get(user.id) === 'waiting_confirm_delete_all_weights') {
      if (text === 'УДАЛИТЬ ВСЕ ВЕСА') {
        userStates.delete(user.id);
        await processDeleteAllWeights(bot, chatId, dbUser.id);
        return;
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ Удаление отменено.\n\nДля подтверждения нужно было написать точно: `УДАЛИТЬ ВСЕ ВЕСА`',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
        return;
      }
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
      clearConversation(dbUser.id);
      
      await bot.sendMessage(
        chatId,
        '🔄 Диалог с ИИ сброшен! Теперь можете начать новое общение с чистого листа.\n\n💡 Все предыдущие команды и контекст очищены.',
        mainKeyboard
      );
      return;
    }

    // === ПРОВЕРКА СОСТОЯНИЯ ПОЛЬЗОВАТЕЛЯ ===
    const currentState = userStates.get(user.id);
    
    // Обработка состояний, которые ожидают ввод пользователя (ВЕС, ЦЕЛИ и т.д.)
    if (currentState) {
      await handleUserState(bot, chatId, user, dbUser, text, currentState);
      return;
    }
    
    // === ПРОВЕРКА ИНТЕРАКТИВНЫХ WORKFLOW ===
    // Проверяем, есть ли активный интерактивный workflow
    const activeWorkflow = userInteractiveWorkflow.get(user.id);
    if (activeWorkflow && (Date.now() - activeWorkflow.timestamp) < 600000) { // 10 минут
      console.log(`🔄 Пользователь ${user.id} отвечает на интерактивный workflow: ${activeWorkflow.type}`);
      
      // Это ответ пользователя на интерактивный workflow
      await handleInteractiveWorkflowResponse(bot, chatId, user, dbUser, text, activeWorkflow);
      return;
    }
    
    // === ОБРАБОТКА КОМАНД ИИ-ТРЕНЕРА ===
    // Только кнопка "🤖 ИИ-тренер" должна активировать AI, а состояние 'chatting_with_ai' обрабатывается ниже
    if (text === '🤖 ИИ-тренер') {
      await handleAITrainerConversation(bot, chatId, user, dbUser, text);
      return;
    }
    
    // === ПРОВЕРКА ПОДПИСКИ ДЛЯ AI ФУНКЦИЙ ===
    const subscription = await getActiveSubscription(dbUser.id);
    console.log(`User ${user.id} subscription status:`, subscription ? 'active' : 'none');

    // === ОБРАБОТКА WORKFLOW КОМАНД ===
    // Специальная обработка для команд Coze (начинающихся с /)
    if (text.startsWith('/')) {
      console.log(`🔧 Команда Coze от пользователя ${user.id}:`, text);
      
      if (!subscription) {
        await bot.sendMessage(
          chatId,
          '� **ИИ-инструменты доступны только с подпиской**\n\n' +
          '� Оформите подписку для доступа к специальным инструментам!',
          { parse_mode: 'Markdown', ...noSubscriptionKeyboard }
        );
        return;
      }
      
      await handleWorkflowCommands(bot, chatId, user, dbUser, text);
      return;
    }
    
    // === ОБРАБОТКА РЕЖИМА ИИ-ТРЕНЕРА ===
    // Если пользователь находится в режиме общения с ИИ
    if (currentState === 'chatting_with_ai') {
      // Проверяем возможность делать запросы
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ У вас закончились запросы к ИИ-тренеру.\n\n' +
          '🆓 Бесплатные запросы: 0/7\n' +
          '💎 Оформите подписку для продолжения!',
          noSubscriptionKeyboard
        );
        return;
      }

      // Отправляем запрос в Coze
      await bot.sendChatAction(chatId, 'typing');
      
      // Отправляем сообщение о том, что бот думает
      const thinkingMessage = await bot.sendMessage(chatId, '🤔 Анализирую ваш вопрос...');
      
      // Проверяем, есть ли контекст от предыдущего workflow
      const workflowContext = userWorkflowContext.get(user.id);
      let messageWithContext = text;
      
      if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 минут
        messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО АНАЛИЗА:
Тип анализа: ${workflowContext.type}
Запрос пользователя: "${workflowContext.query}"
Полученный результат: "${workflowContext.result.substring(0, 1000)}..."

НОВЫЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}`;
        
        console.log(`📋 Добавлен контекст workflow к сообщению для пользователя ${user.id}`);
      }
      
      const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер: будь конкретным, структурируй ответы списками, избегай лишней воды.');
      
      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }
      
      if (aiResponse.success) {
        // Списываем запрос
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n🆓 Бесплатных запросов осталось: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }
    
    // === УТОЧНЯЮЩИЕ ВОПРОСЫ К WORKFLOW ===
    // Проверяем, есть ли контекст последнего workflow для уточняющих вопросов
    const workflowContext = userWorkflowContext.get(user.id);
    if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 минут
      console.log(`📋 Обнаружен контекст workflow для пользователя ${user.id}, обрабатываем уточняющий вопрос`);
      
      // Проверяем лимиты запросов
      const requestStatus = await canUserMakeRequest(dbUser.id);
      if (!requestStatus.canMake) {
        if (requestStatus.type === 'free') {
          await bot.sendMessage(
            chatId, 
            `🆓 Исчерпан лимит бесплатных запросов (${requestStatus.used}/${requestStatus.limit}).\n\n💎 Оформите подписку для неограниченного доступа к ИИ-тренеру!`,
            subscriptionKeyboard
          );
        } else {
          await bot.sendMessage(
            chatId, 
            `📊 Исчерпан лимит запросов (${requestStatus.used}/${requestStatus.limit}).\n\n💳 Продлите подписку для продолжения работы!`,
            subscriptionKeyboard
          );
        }
        return;
      }

      // Отправляем уточняющий вопрос в Coze API с контекстом
      await bot.sendChatAction(chatId, 'typing');
      const thinkingMessage = await bot.sendMessage(chatId, '🤔 Анализирую ваш вопрос с учетом предыдущего контекста...');

      // Формируем сообщение с контекстом
      const messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО АНАЛИЗА:
Тип анализа: ${workflowContext.type}
Вопрос пользователя: "${workflowContext.userQuestion}"
Полученный результат: "${workflowContext.workflowResponse.substring(0, 1500)}..."

УТОЧНЯЮЩИЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}

Пожалуйста, ответь на уточняющий вопрос с учетом контекста предыдущего анализа.`;

      console.log(`🔍 Отправляем уточняющий вопрос в Coze API для пользователя ${user.id}`);
      
      const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер и эксперт по питанию: будь конкретным, структурируй ответы списками, используй контекст предыдущего анализа.');

      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }

      if (aiResponse.success) {
        // Обновляем timestamp контекста для возможности дальнейших уточнений
        workflowContext.timestamp = Date.now();
        
        // Списываем запрос
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n🆓 Бесплатных запросов осталось: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, '❌ Извините, не удалось получить ответ от ИИ. Попробуйте позже.');
      }
      return;
    }
    
    // === НЕОПОЗНАННЫЕ СООБЩЕНИЯ ===
    // Если пользователь не в режиме ИИ-тренера и это не кнопка/команда
    console.log(`User ${user.id} sent unrecognized message, showing main menu`);
    await bot.sendMessage(
      chatId,
      '🤔 Не понял ваш запрос. Используйте кнопки меню для навигации.\n\n' +
      '💡 Для общения с ИИ-тренером нажмите "🤖 ИИ-тренер"',
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

      case 'buy_basic':
        await showPaymentConfirmation(bot, chatId, messageId, 'basic');
        break;

      case 'buy_standard':
        await showPaymentConfirmation(bot, chatId, messageId, 'standard');
        break;

      case 'buy_premium':
        await showPaymentConfirmation(bot, chatId, messageId, 'premium');
        break;

      case 'confirm_payment_basic':
        await processPayment(bot, chatId, messageId, user.id, 'basic');
        break;

      case 'confirm_payment_standard':
        await processPayment(bot, chatId, messageId, user.id, 'standard');
        break;

      case 'confirm_payment_premium':
        await processPayment(bot, chatId, messageId, user.id, 'premium');
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

      case 'mood_1':
      case 'mood_2':
      case 'mood_3':
      case 'mood_4':
      case 'mood_5':
        const moodValue = parseInt(data.split('_')[1]);
        const userState = userStates.get(user.id);
        
        if (userState && userState.action === 'waiting_mood_after') {
          const workout = activeWorkouts.get(user.id);
          if (workout) {
            workout.moodAfter = moodValue;
            
            await bot.editMessageText(
              '📝 **Финальные комментарии**\n\n' +
              'Добавьте общий комментарий к тренировке:\n' +
              '• Как прошла тренировка?\n' +
              '• Какие упражнения понравились больше всего?\n' +
              '• Что бы вы хотели изменить в следующий раз?\n\n' +
              '✏️ Напишите ваш комментарий или нажмите "Пропустить":',
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '⏭️ Пропустить', callback_data: 'skip_comment' }]
                  ]
                }
              }
            );
            userStates.set(user.id, { action: 'waiting_workout_notes' });
          }
        }
        break;

      case 'skip_comment':
        const skipUserState = userStates.get(user.id);
        if (skipUserState && skipUserState.action === 'waiting_workout_notes') {
          const workout = activeWorkouts.get(user.id);
          if (workout) {
            // Завершаем тренировку без комментария
            await completeWorkout(user.id, workout);
            activeWorkouts.delete(user.id);
            userStates.delete(user.id);
            
            await bot.editMessageText(
              '✅ **Тренировка завершена!**\n\n' +
              '🎉 Отличная работа! Ваша тренировка успешно записана.\n\n' +
              '📊 Вы можете посмотреть статистику в разделе "📊 Аналитика".',
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
              }
            );
            
            // Отправляем главное меню
            setTimeout(async () => {
              await bot.sendMessage(chatId, '🏠 Главное меню:', mainKeyboard);
            }, 2000);
          }
        }
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
    
    const planNames = {
      'basic': 'Базовый (100 запросов)',
      'standard': 'Стандартный (300 запросов)', 
      'premium': 'Премиум (600 запросов)'
    };
    const remaining = subscription.requests_limit - subscription.requests_used;
    const message = `💎 Ваша подписка активна!\n\n📅 План: ${planNames[subscription.plan_type] || subscription.plan_type}\n📈 Запросы: ${subscription.requests_used}/${subscription.requests_limit} (осталось: ${remaining})\n⏰ До окончания: ${daysLeft} дней\n📊 Статус: Активна`;
    
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
  const freeRequests = await getUserFreeRequests(user.id);
  
  let message = `👤 Ваш профиль\n\n`;
  message += `📛 Имя: ${user.first_name || 'Не указано'}\n`;
  message += `🆔 ID: ${user.telegram_id}\n`;
  message += `📅 Регистрация: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n\n`;
  
  // Показываем бесплатные запросы
  message += `🆓 Бесплатные запросы: ${freeRequests.used}/${freeRequests.total} (осталось: ${freeRequests.remaining})\n\n`;
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    const planNames = {
      'basic': 'Базовый (100 запросов)',
      'standard': 'Стандартный (300 запросов)', 
      'premium': 'Премиум (600 запросов)'
    };
    const remaining = subscription.requests_limit - subscription.requests_used;
    message += `💎 Подписка: Активна\n`;
    message += `📊 План: ${planNames[subscription.plan_type] || subscription.plan_type}\n`;
    message += `📈 Запросы: ${subscription.requests_used}/${subscription.requests_limit} (осталось: ${remaining})\n`;
    message += `⏰ Осталось дней: ${daysLeft}`;
  } else {
    message += `💎 Подписка: Не активна`;
  }

  await bot.sendMessage(chatId, message, mainKeyboard);
}

async function showPaymentConfirmation(bot, chatId, messageId, planType) {
  const plans = {
    'basic': { price: '150₽', requests: '100 запросов', name: 'Базовый' },
    'standard': { price: '300₽', requests: '300 запросов', name: 'Стандартный' },
    'premium': { price: '450₽', requests: '600 запросов', name: 'Премиум' }
  };
  
  const plan = plans[planType];
  const message = `💳 Подтверждение заказа\n\n📦 План: ${plan.name}\n📊 Лимит: ${plan.requests} в месяц\n💰 К оплате: ${plan.price}\n\n✅ После оплаты подписка активируется автоматически.`;
  
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
      const plans = {
        'basic': { price: '150₽', requests: '100 запросов', name: 'Базовый' },
        'standard': { price: '300₽', requests: '300 запросов', name: 'Стандартный' },
        'premium': { price: '450₽', requests: '600 запросов', name: 'Премиум' }
      };
      const plan = plans[planType];
      
      await bot.editMessageText(
        `💳 Оплата подписки\n\n📦 План: ${plan.name}\n📊 Лимит: ${plan.requests} в месяц\n💰 Сумма: ${plan.price}\n\n🔒 Оплата проходит через защищенный сервис ЮКасса.\n\n👆 Нажмите кнопку ниже для перехода к оплате:`,
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
    
    const planNames = {
      'basic': 'Базовый (100 запросов)',
      'standard': 'Стандартный (300 запросов)', 
      'premium': 'Премиум (600 запросов)'
    };
    
    const remaining = subscription.requests_limit - subscription.requests_used;
    const message = `📊 Статус подписки\n\n✅ Статус: Активна\n📅 План: ${planNames[subscription.plan_type] || subscription.plan_type}\n📈 Использовано запросов: ${subscription.requests_used}/${subscription.requests_limit}\n📊 Осталось запросов: ${remaining}\n🗓 Начало: ${startDate.toLocaleDateString('ru-RU')}\n📆 Окончание: ${endDate.toLocaleDateString('ru-RU')}\n⏰ Осталось дней: ${daysLeft}\n💰 Сумма: ${subscription.amount}₽`;
    
    if (messageId) {
      // Если есть messageId, редактируем существующее сообщение
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        ...manageSubscriptionKeyboard
      });
    } else {
      // Если нет messageId, отправляем новое сообщение
      await bot.sendMessage(chatId, message, manageSubscriptionKeyboard);
    }
  } else {
    const noSubMessage = '❌ У вас нет активной подписки';
    
    if (messageId) {
      // Если есть messageId, редактируем существующее сообщение
      await bot.editMessageText(noSubMessage, {
        chat_id: chatId,
        message_id: messageId,
        ...noSubscriptionKeyboard
      });
    } else {
      // Если нет messageId, отправляем новое сообщение
      await bot.sendMessage(chatId, noSubMessage, noSubscriptionKeyboard);
    }
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
  const workoutTypeMap = {
    '💪 Силовая тренировка': 'strength',
    '🏃‍♂️ Кардио': 'cardio',
    '🧘‍♀️ Йога/Растяжка': 'yoga',
    '🏋️‍♀️ Функциональная': 'functional'
  };

  const type = workoutTypeMap[workoutType];
  
  if (type === 'strength') {
    // Для силовой тренировки предлагаем два варианта
    await bot.sendMessage(
      chatId,
      '💪 **Силовая тренировка**\n\n' +
      'Выберите режим записи:\n\n' +
      '🔥 **Детальная запись** - добавляйте упражнения по мере выполнения с подходами, весами и повторениями\n\n' +
      '⚡ **Быстрая запись** - просто укажите общую информацию о тренировке',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['🔥 Детальная запись'],
            ['⚡ Быстрая запись'],
            ['⬅️ Назад в меню']
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
    return;
  }
  
  // Для других типов тренировок используем быстрый режим
  try {
    // Добавляем базовую тренировку с примерными значениями
    const duration = 60; // 60 минут по умолчанию
    const calories = type === 'cardio' ? 400 : type === 'yoga' ? 200 : 300;
    const intensity = 3; // средняя интенсивность
    const exercisesCount = type === 'functional' ? 6 : 4;
    
    await addWorkout(userId, type, duration, calories, intensity, exercisesCount, `Тренировка: ${workoutType}`);

    await bot.sendMessage(
      chatId,
      `✅ Тренировка "${workoutType}" записана!\n\n` +
      `📊 Данные тренировки:\n` +
      `⏱ Продолжительность: ${duration} минут\n` +
      `🔥 Калории: ${calories} ккал\n` +
      `📈 Интенсивность: ${intensity}/5\n` +
      `🏋️‍♂️ Упражнений: ${exercisesCount}\n\n` +
      `💡 Для более детальной записи тренировок выберите "🔥 Детальная запись".`,
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

// Функция для отправки длинных сообщений с разбивкой
async function sendLongMessage(bot, chatId, message) {
  const MAX_MESSAGE_LENGTH = 4000; // Оставляем запас для Telegram лимита 4096
  
  if (message.length <= MAX_MESSAGE_LENGTH) {
    await bot.sendMessage(chatId, message + '\n\n🏠 Для возврата в меню: /menu');
  } else {
    // Разбиваем сообщение на части
    const messageParts = [];
    let currentPart = '';
    const sentences = message.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      if ((currentPart + sentence).length > MAX_MESSAGE_LENGTH) {
        if (currentPart.trim()) {
          messageParts.push(currentPart.trim());
        }
        currentPart = sentence + ' ';
      } else {
        currentPart += sentence + ' ';
      }
    }
    
    if (currentPart.trim()) {
      messageParts.push(currentPart.trim());
    }
    
    // Отправляем части с небольшими задержками
    for (let i = 0; i < messageParts.length; i++) {
      const part = messageParts[i];
      const isLast = i === messageParts.length - 1;
      const messageToSend = part + (isLast ? '\n\n🏠 Для возврата в меню: /menu' : `\n\n📄 Часть ${i + 1} из ${messageParts.length}`);
      
      await bot.sendMessage(chatId, messageToSend);
      
      // Небольшая задержка между сообщениями
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

// Функция для обработки специальных ИИ-запросов через Workflow API
async function handleSpecialAIRequest(bot, chatId, user, dbUser, text, processingMessage, requestType) {
  // Сбрасываем состояние
  userStates.delete(user.id);
  
  // Получаем подписку пользователя
  const subscription = await getActiveSubscription(dbUser.id);
  
  await bot.sendChatAction(chatId, 'typing');
  const thinkingMessage = await bot.sendMessage(chatId, `${processingMessage} по запросу: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"...`);
  
  try {
    // Выбираем правильный workflow ID для типа запроса
    let workflowId = '';
    
    switch (requestType) {
      case 'training_program':
        workflowId = process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID;
        break;
      case 'nutrition_plan':
        workflowId = process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID;
        break;
      case 'composition_analysis':
        workflowId = process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID;
        break;
      case 'deep_research':
        workflowId = process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID;
        break;
      default:
        workflowId = process.env.COZE_WORKFLOW_ID; // fallback
    }
    
    if (!workflowId) {
      throw new Error(`Workflow ID не найден для типа: ${requestType}`);
    }
    
    console.log(`🚀 Запускаем ${requestType} workflow: ${workflowId}`);
    console.log(`📝 Сообщение пользователя: "${text}"`);
    
    // Формируем параметры для workflow
    const workflowParameters = {
      input: text,
      user_id: user.id.toString(),
      request_type: requestType
    };
    
    console.log(`📦 Параметры workflow:`, workflowParameters);
    
    // Запускаем workflow
    const workflowResponse = await runWorkflow(workflowId, workflowParameters);
    
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    
    if (workflowResponse.success && workflowResponse.message) {
      // Проверяем, является ли это интерактивным workflow
      const isInteractive = requestType === 'training_program' || requestType === 'nutrition_plan';
      
      if (isInteractive) {
        // Сохраняем состояние интерактивного workflow
        userInteractiveWorkflow.set(user.id, {
          type: requestType,
          workflowId: workflowId,
          initialMessage: text,
          eventId: workflowResponse.eventId, // Сохраняем event_id для продолжения
          timestamp: Date.now()
        });
        console.log(`💾 Сохранено состояние интерактивного workflow для пользователя ${user.id}: ${requestType}, eventId: ${workflowResponse.eventId}`);
      }
      
      await sendLongMessage(bot, chatId, workflowResponse.message);
      
      // Сохраняем контекст workflow для возможности задавать уточняющие вопросы
      if (!isInteractive) {
        userWorkflowContext.set(user.id, {
          type: requestType,
          userQuestion: text,
          workflowResponse: workflowResponse.message,
          timestamp: Date.now()
        });
        console.log(`💾 Сохранен контекст workflow для пользователя ${user.id}: ${requestType}`);
      }
      
      // Учитываем использование запроса
      await incrementRequestUsage(dbUser.id);
      console.log(`✅ ${requestType} workflow выполнен успешно`);
    } else {
      console.error(`❌ Ошибка ${requestType} workflow:`, workflowResponse.error);
      await bot.sendMessage(chatId, `❌ Извините, не удалось получить ответ от ИИ: ${workflowResponse.error || 'Неизвестная ошибка'}`);
    }
    
  } catch (error) {
    console.error(`❌ Ошибка при обработке ${requestType} запроса:`, error);
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке запроса. Попробуйте позже.');
  }
}

// Универсальная функция для обработки workflow запросов
async function handleWorkflowRequest(bot, chatId, user, dbUser, text, workflowEnvKey, processingMessage) {
  // Сбрасываем состояние
  userStates.delete(user.id);
  
  // Получаем подписку пользователя
  const subscription = await getActiveSubscription(dbUser.id);
  
  await bot.sendChatAction(chatId, 'typing');
  const thinkingMessage = await bot.sendMessage(chatId, `${processingMessage} по запросу: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"...`);
  
  const workflowId = process.env[workflowEnvKey];
  
  // Все workflow используют переменную input
  const workflowParameters = {
    input: text,
    user_id: user.id.toString(),
    user_profile: `User ID: ${user.id}, Subscription: ${subscription?.plan_type || 'none'}`
  };
  
  console.log('🔧 Параметры для workflow:', { workflowEnvKey, parameters: workflowParameters });
  
  const workflowResponse = await runWorkflow(
    workflowId,
    workflowParameters
  );
  
  // Удаляем сообщение "думает"
  try {
    await bot.deleteMessage(chatId, thinkingMessage.message_id);
  } catch (deleteError) {
    // Игнорируем ошибки удаления
  }
  
  if (workflowResponse.success) {
    // Парсим JSON ответ из workflow
    let resultMessage = workflowResponse.message;
    try {
      const parsedData = JSON.parse(workflowResponse.data);
      if (parsedData.output_final) {
        resultMessage = parsedData.output_final;
      }
    } catch (parseError) {
      console.log('⚠️ Не удалось распарсить JSON ответ workflow:', parseError.message);
    }
    
    // Определяем иконку для результата
    let resultIcon = '📋';
    let workflowType = 'Анализ';
    if (workflowEnvKey.includes('DEEP_RESEARCH')) {
      resultIcon = '🔬';
      workflowType = 'Глубокий анализ';
    } else if (workflowEnvKey.includes('TRAINING_PROGRAM')) {
      resultIcon = '🏋️‍♂️';
      workflowType = 'Программа тренировок';
    } else if (workflowEnvKey.includes('NUTRITION_PLAN')) {
      resultIcon = '🥗';
      workflowType = 'План питания';
    } else if (workflowEnvKey.includes('COMPOSITION_ANALYSIS')) {
      resultIcon = '🧪';
      workflowType = 'Анализ добавки';
    }
    
    // Сохраняем контекст последнего workflow для пользователя
    userWorkflowContext.set(user.id, {
      type: workflowType,
      query: text,
      result: resultMessage,
      timestamp: Date.now()
    });
    
    console.log(`💾 Сохранен контекст workflow для пользователя ${user.id}:`, {
      type: workflowType,
      query: text.substring(0, 100) + '...'
    });
    
    // Разбиваем длинное сообщение на части (Telegram лимит 4096 символов)
    const MAX_MESSAGE_LENGTH = 4000; // Оставляем запас
    const fullMessage = `${resultIcon} **Результат:**\n\n${resultMessage}`;
    
    if (fullMessage.length <= MAX_MESSAGE_LENGTH) {
      await bot.sendMessage(chatId, fullMessage + '\n\n🏠 Для возврата в меню: /menu');
    } else {
      // Разбиваем сообщение на части
      const messageParts = [];
      let currentPart = `${resultIcon} **Результат:**\n\n`;
      const sentences = resultMessage.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if ((currentPart + sentence).length > MAX_MESSAGE_LENGTH) {
          messageParts.push(currentPart.trim());
          currentPart = sentence + ' ';
        } else {
          currentPart += sentence + ' ';
        }
      }
      
      if (currentPart.trim()) {
        messageParts.push(currentPart.trim());
      }
      
      // Отправляем части с небольшими задержками
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        const isLast = i === messageParts.length - 1;
        const messageToSend = part + (isLast ? '\n\n🏠 Для возврата в меню: /menu' : `\n\n📄 Часть ${i + 1} из ${messageParts.length}`);
        
        await bot.sendMessage(chatId, messageToSend);
        
        // Небольшая задержка между сообщениями
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Учитываем использование запроса
    await incrementRequestUsage(dbUser.id);
    
  } else {
    await bot.sendMessage(chatId, `❌ Произошла ошибка при обработке запроса: ${workflowResponse.error}\n\n🏠 Для возврата в меню: /menu`);
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ ===

async function showWeightHistory(bot, chatId, userId) {
  try {
    const weightHistory = await getUserMetrics(userId, 'weight', 10);
    
    if (weightHistory.length === 0) {
      await bot.sendMessage(
        chatId,
        '📊 **История веса**\n\n❌ У вас пока нет записей веса.\n\nИспользуйте "⚖️ Записать вес" для добавления первой записи.',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '📊 **История веса** (последние 10 записей)\n\n';
    weightHistory.forEach((record, index) => {
      const date = new Date(record.recorded_at).toLocaleDateString('ru-RU');
      const isLatest = index === 0 ? ' ⭐' : '';
      message += `📅 ${date}: **${record.value} ${record.unit}**${isLatest}\n`;
    });

    message += '\n⭐ - последняя запись';

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '❌ Ошибка при получении истории веса.');
  }
}

async function showUserGoals(bot, chatId, userId) {
  try {
    const goals = await getUserGoals(userId);
    
    if (goals.length === 0) {
      await bot.sendMessage(
        chatId,
        '🎯 **Мои цели**\n\n❌ У вас пока нет установленных целей.\n\nИспользуйте "🎯 Установить цель" для добавления первой цели.',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '🎯 **Мои цели**\n\n';
    goals.forEach((goal, index) => {
      const date = new Date(goal.created_at).toLocaleDateString('ru-RU');
      message += `${index + 1}. **${goal.goal_type}**\n`;
      message += `   📊 Цель: ${goal.target_value}\n`;
      message += `   📅 Создана: ${date}\n\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '❌ Ошибка при получении целей.');
  }
}

async function showWorkoutHistory(bot, chatId, userId) {
  try {
    // Используем getUserDetailedWorkouts вместо getUserWorkouts
    const workouts = await getUserDetailedWorkouts(userId, 10);
    
    if (workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ История тренировок\n\n' +
        '📝 У вас пока нет записей тренировок.\n\n' +
        '💡 Используйте "🏋️‍♂️ Добавить тренировку" для создания первой записи!',
        { ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '🏋️‍♂️ История тренировок (последние 10)\n\n';
    workouts.forEach((workout, index) => {
      const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
      const time = new Date(workout.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const isLatest = index === 0 ? ' 🌟' : '';
      
      message += `📅 ${date} в ${time}${isLatest}\n`;
      message += `💪 Тип: ${workout.workout_type === 'strength' ? 'Силовая тренировка' : workout.workout_type}\n`;
      
      if (workout.duration_minutes > 0) {
        message += `⏱️ Длительность: ${workout.duration_minutes} мин\n`;
      }
      
      // Показываем самочувствие до и после тренировки
      if (workout.mood_before || workout.mood_after) {
        message += `😊 Самочувствие: `;
        if (workout.mood_before) {
          message += `до ${workout.mood_before}/10`;
        }
        if (workout.mood_before && workout.mood_after) {
          message += ` → `;
        }
        if (workout.mood_after) {
          message += `после ${workout.mood_after}/10`;
        }
        message += `\n`;
      }
      
      // Показываем комментарии
      if (workout.notes && workout.notes.trim()) {
        message += `💬 Комментарий: ${workout.notes}\n`;
      }
      
      // Показываем детальную информацию об упражнениях
      if (workout.workout_details && workout.workout_details.exercises) {
        const details = workout.workout_details;
        const exerciseCount = details.exercises.length;
        const totalSets = details.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const totalReps = details.exercises.reduce((sum, ex) => 
          sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0);
        const totalWeight = details.exercises.reduce((sum, ex) => 
          sum + ex.sets.reduce((setSum, set) => setSum + ((set.weight || 0) * set.reps), 0), 0);
        
        message += `📊 ${exerciseCount} упражнений • ${totalSets} подходов • ${totalReps} повторений\n`;
        if (totalWeight > 0) {
          message += `⚖️ Поднято с отягощением: ${totalWeight} кг\n`;
        }
        
        // Показываем список упражнений
        message += `\n🎯 Упражнения:\n`;
        details.exercises.forEach((ex, i) => {
          const exerciseTotalReps = ex.sets.reduce((sum, set) => sum + set.reps, 0);
          const exerciseWeight = ex.sets.length > 0 ? (ex.sets[0].weight || 0) : 0;
          const weightText = exerciseWeight === 0 ? 'собственный вес' : `${exerciseWeight} кг`;
          const avgReps = exerciseTotalReps > 0 ? Math.round(exerciseTotalReps / ex.sets.length) : 0;
          message += `   ${i + 1}. ${ex.name}: ${ex.sets.length}×${avgReps} (${weightText})\n`;
        });
        
        // Показываем комментарии к тренировке из деталей
        if (details.comments && details.comments.trim()) {
          message += `\n💭 Заметки о тренировке: ${details.comments}\n`;
        }
      }
      
      message += '\n' + '─'.repeat(25) + '\n\n';
    });

    message += '🌟 - последняя тренировка\n';
    message += '💡 Формат: подходы×средние повторения';

    await bot.sendMessage(chatId, message, { ...viewRecordsKeyboard });
  } catch (error) {
    console.error('Ошибка при получении истории тренировок:', error);
    await bot.sendMessage(chatId, 'Ошибка при получении истории тренировок.');
  }
}

async function showUserStatistics(bot, chatId, userId) {
  try {
    const summary = await getUserDataSummary(userId);
    const weightHistory = await getUserMetrics(userId, 'weight', 2); // Последние 2 записи для расчета изменения
    const workouts = await getUserWorkouts(userId, 30); // За последний месяц
    
    let message = '📈 **Статистика**\n\n';
    
    // Общая статистика
    message += `📊 **Общие данные:**\n`;
    message += `• Записей веса: **${summary.weightRecords}**\n`;
    message += `• Тренировок: **${summary.workoutRecords}**\n`;
    message += `• Целей: **${summary.goalRecords}**\n\n`;
    
    // Изменение веса
    if (weightHistory.length >= 2) {
      const currentWeight = weightHistory[0].value;
      const previousWeight = weightHistory[1].value;
      const weightChange = currentWeight - previousWeight;
      const changeDirection = weightChange > 0 ? '📈' : weightChange < 0 ? '📉' : '➡️';
      
      message += `⚖️ **Вес:**\n`;
      message += `• Текущий: **${currentWeight} кг**\n`;
      message += `• Изменение: ${changeDirection} **${Math.abs(weightChange).toFixed(1)} кг**\n\n`;
    } else if (weightHistory.length === 1) {
      message += `⚖️ **Вес:** **${weightHistory[0].value} кг**\n\n`;
    }
    
    // Статистика тренировок за месяц
    if (workouts.length > 0) {
      const totalMinutes = workouts.reduce((sum, w) => sum + w.duration_minutes, 0);
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
      const avgPerWeek = (workouts.length / 4).toFixed(1);
      
      message += `🏋️‍♂️ **Тренировки (30 дней):**\n`;
      message += `• Всего: **${workouts.length}**\n`;
      message += `• Время: **${Math.round(totalMinutes / 60)} ч ${totalMinutes % 60} мин**\n`;
      if (totalCalories > 0) {
        message += `• Калории: **${totalCalories}**\n`;
      }
      message += `• В среднем/неделю: **${avgPerWeek}**\n`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '❌ Ошибка при получении статистики.');
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Функция для безопасного парсинга числа
function safeParseInt(str, min = 1, max = 100, fallback = null) {
  const num = parseInt(str);
  return (isNaN(num) || num < min || num > max) ? fallback : num;
}

// Функция для парсинга настроения
function parseMoodValue(text) {
  const moodMap = {
    '😤 Злой': 1,
    '😞 Грустный': 2,
    '😐 Нормально': 3,
    '😊 Хорошо': 4,
    '🤩 Отлично': 5
  };
  return moodMap[text] || null;
}

// Функция для получения эмодзи настроения
function getMoodEmoji(value) {
  const moodEmojis = {
    1: '😤',
    2: '😞',
    3: '😐',
    4: '😊',
    5: '🤩'
  };
  return moodEmojis[value] || '😐';
}

// Функция для форматирования времени тренировки
function formatWorkoutTime(minutes) {
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}ч ${mins}мин` : `${hours}ч`;
}

// Функция для завершения тренировки и сохранения в базу данных
async function completeWorkout(userId, workout) {
  try {
    // Получаем ID пользователя из БД по telegram_id
    const dbUser = await getUserByTelegramId(userId);
    
    // Подготавливаем детали тренировки
    const workoutDetails = {
      exercises: workout.exercises || [],
      totalExercises: (workout.exercises || []).length,
      totalSets: (workout.exercises || []).reduce((sum, ex) => sum + (ex.sets || []).length, 0),
      totalReps: (workout.exercises || []).reduce((sum, ex) => 
        sum + (ex.sets || []).reduce((setSum, set) => setSum + (set.reps || 0), 0), 0
      ),
      averageIntensity: 'medium',
      totalCalories: 0, // Можно добавить расчет калорий в будущем
      duration: Math.round((Date.now() - workout.startTime) / 60000) // в минутах
    };
    
    // Сохраняем в базу данных
    await saveDetailedWorkout(
      dbUser.id,
      workout.type || 'strength',
      workoutDetails.duration,
      workoutDetails,
      workout.moodBefore || 3,
      workout.moodAfter || 3,
      workout.generalComment || null
    );
    
    console.log(`✅ Тренировка пользователя ${userId} успешно сохранена`);
  } catch (error) {
    console.error('❌ Ошибка сохранения тренировки:', error);
    throw error;
  }
}

// === ФУНКЦИИ УДАЛЕНИЯ ЗАПИСЕЙ ===

async function handleDeleteLastWorkout(bot, chatId, userId) {
  try {
    const result = await deleteLastWorkout(userId);
    
    if (result.success) {
      const date = new Date(result.deletedAt).toLocaleDateString('ru-RU');
      const time = new Date(result.deletedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      await bot.sendMessage(
        chatId,
        `✅ **Тренировка удалена**\n\n` +
        `🗑️ Удалена тренировка от ${date} в ${time}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ **Ошибка удаления**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('Ошибка при удалении последней тренировки:', error);
    await bot.sendMessage(chatId, 'Ошибка при удалении тренировки.', { ...mainKeyboard });
  }
}

async function handleDeleteLastWeight(bot, chatId, userId) {
  try {
    const result = await deleteLastWeight(userId);
    
    if (result.success) {
      const date = new Date(result.deletedAt).toLocaleDateString('ru-RU');
      
      await bot.sendMessage(
        chatId,
        `✅ **Запись веса удалена**\n\n` +
        `🗑️ Удалена запись веса ${result.value} кг от ${date}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ **Ошибка удаления**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('Ошибка при удалении последней записи веса:', error);
    await bot.sendMessage(chatId, 'Ошибка при удалении записи веса.', { ...mainKeyboard });
  }
}

async function confirmDeleteAllWorkouts(bot, chatId, userId) {
  await bot.sendMessage(
    chatId,
    '⚠️ **ВНИМАНИЕ!**\n\n' +
    '🗑️ Вы действительно хотите удалить **ВСЕ** свои тренировки?\n\n' +
    '❌ Это действие **НЕОБРАТИМО**!\n\n' +
    'Для подтверждения напишите: `УДАЛИТЬ ВСЕ ТРЕНИРОВКИ`',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
  
  userStates.set(chatId, 'waiting_confirm_delete_all_workouts');
}

async function confirmDeleteAllWeights(bot, chatId, userId) {
  await bot.sendMessage(
    chatId,
    '⚠️ **ВНИМАНИЕ!**\n\n' +
    '🗑️ Вы действительно хотите удалить **ВСЕ** записи веса?\n\n' +
    '❌ Это действие **НЕОБРАТИМО**!\n\n' +
    'Для подтверждения напишите: `УДАЛИТЬ ВСЕ ВЕСА`',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
  
  userStates.set(chatId, 'waiting_confirm_delete_all_weights');
}

async function processDeleteAllWorkouts(bot, chatId, userId) {
  try {
    const result = await deleteAllWorkouts(userId);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `✅ **Все тренировки удалены**\n\n` +
        `🗑️ Удалено: ${result.count} тренировок`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ **Ошибка удаления**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('Ошибка при удалении всех тренировок:', error);
    await bot.sendMessage(chatId, 'Ошибка при удалении тренировок.', { ...mainKeyboard });
  }
}

async function processDeleteAllWeights(bot, chatId, userId) {
  try {
    const result = await deleteAllWeights(userId);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `✅ **Все записи веса удалены**\n\n` +
        `🗑️ Удалено: ${result.count} записей`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `❌ **Ошибка удаления**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('Ошибка при удалении всех записей веса:', error);
    await bot.sendMessage(chatId, 'Ошибка при удалении записей веса.', { ...mainKeyboard });
  }
}

// Функция для обработки ответов пользователя на интерактивные workflow
async function handleInteractiveWorkflowResponse(bot, chatId, user, dbUser, userResponse, activeWorkflow) {
  try {
    console.log(`🔄 Обработка ответа пользователя на интерактивный workflow: ${activeWorkflow.type}`);
    
    await bot.sendChatAction(chatId, 'typing');
    const thinkingMessage = await bot.sendMessage(chatId, '🤖 Обрабатываю ваш ответ...');

    // Продолжаем интерактивный workflow с ответом пользователя
  const continueResponse = await continueInteractiveWorkflow(activeWorkflow.eventId, userResponse, activeWorkflow.type, user.id);

    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});

    if (continueResponse.success && continueResponse.message) {
      // Проверяем, есть ли новый eventId (означает что есть еще вопросы)
      if (continueResponse.eventId) {
        // Это еще один интерактивный вопрос - обновляем состояние
        activeWorkflow.eventId = continueResponse.eventId;
        activeWorkflow.timestamp = Date.now();
        userInteractiveWorkflow.set(user.id, activeWorkflow);
        console.log(`❓ Получен следующий интерактивный вопрос, новый eventId: ${continueResponse.eventId}`);
      } else {
        // Это финальный результат - удаляем состояние интерактивного workflow
        userInteractiveWorkflow.delete(user.id);
        console.log(`✅ Получен финальный результат от интерактивного workflow`);
        
        // Учитываем использование запроса
        await incrementRequestUsage(dbUser.id);
      }

      await sendLongMessage(bot, chatId, continueResponse.message);
      console.log(`✅ Ответ на интерактивный workflow ${activeWorkflow.type} обработан успешно`);
    } else {
      console.error(`❌ Ошибка продолжения интерактивного workflow:`, continueResponse.error);
      
      // Удаляем состояние при ошибке
      userInteractiveWorkflow.delete(user.id);
      
      await bot.sendMessage(chatId, `❌ Извините, не удалось продолжить обработку: ${continueResponse.error || 'Неизвестная ошибка'}`);
    }

  } catch (error) {
    console.error(`❌ Ошибка при обработке ответа на интерактивный workflow:`, error);
    
    // Удаляем состояние при ошибке
    userInteractiveWorkflow.delete(user.id);
    
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке ответа. Попробуйте позже.');
  }
}

// === ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ===

// Функция для обработки состояний пользователя
async function handleUserState(bot, chatId, user, dbUser, text, currentState) {
  // Здесь будет вся логика обработки состояний из исходного кода
  // Она уже есть в основной функции handleTextMessage, поэтому пока оставим заглушку
  console.log('Обработка состояния пользователя:', currentState);
}

// Функция для обработки режима ИИ-тренера
async function handleAITrainerConversation(bot, chatId, user, dbUser, text) {
  try {
    // Проверяем возможность делать запросы
    const requestStatus = await canUserMakeRequest(dbUser.id);
    
    if (!requestStatus.canMake) {
      await bot.sendMessage(
        chatId,
        '💎 У вас закончились запросы к ИИ-тренеру.\n\n' +
        '🆓 Новые пользователи получают 7 бесплатных запросов\n' +
        '💪 Для неограниченного доступа оформите подписку!',
        noSubscriptionKeyboard
      );
      return;
    }
    
    if (text === '🤖 ИИ-тренер') {
      // Показываем информацию о доступных запросах
      let requestInfo = '';
      if (requestStatus.type === 'free') {
        requestInfo = `\n\n🆓 Бесплатных запросов осталось: ${requestStatus.remaining}/7`;
      } else if (requestStatus.type === 'subscription') {
        requestInfo = `\n\n💎 Запросов по подписке: ${requestStatus.remaining}/${requestStatus.total}`;
      }

      // Активируем режим общения с ИИ
      userStates.set(user.id, 'chatting_with_ai');
      
      await bot.sendMessage(
        chatId,
        '🤖 *Добро пожаловать в ИИ-тренер!*\n\n' +
        'Я помогу вам с:\n' +
        '• Составлением программ тренировок\n' +
        '• Советами по питанию\n' +
        '• Вопросами о здоровье и фитнесе\n\n' +
        'Задавайте любые вопросы!' + requestInfo,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Обрабатываем сообщение пользователя в режиме ИИ-тренера
    await bot.sendChatAction(chatId, 'typing');
    
    // Отправляем сообщение о том, что бот думает
    const thinkingMessage = await bot.sendMessage(chatId, '🤖 Подготавливаю персональный ответ...');
    
    // Проверяем, есть ли контекст от предыдущего workflow
    const workflowContext = userWorkflowContext.get(user.id);
    let messageWithContext = text;
    
    if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 минут
      messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО АНАЛИЗА:
Тип анализа: ${workflowContext.type}
Запрос пользователя: "${workflowContext.query}"
Полученный результат: "${workflowContext.result.substring(0, 1000)}..."

НОВЫЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}`;
      
      console.log(`📋 Добавлен контекст workflow к сообщению для пользователя ${user.id}`);
    }
    
    const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер: будь конкретным, структурируй ответы списками, избегай лишней воды.');
    
    // Удаляем сообщение "думает"
    try {
      await bot.deleteMessage(chatId, thinkingMessage.message_id);
    } catch (deleteError) {
      // Игнорируем ошибки удаления
    }
    
    if (aiResponse.success) {
      await bot.sendMessage(chatId, aiResponse.message + '\n\n🏠 Для возврата в меню: /menu');
      // Учитываем использование запроса
      await incrementRequestUsage(dbUser.id);
    } else {
      await bot.sendMessage(chatId, aiResponse.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка в ИИ-тренере:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обращении к ИИ. Попробуйте позже.');
  }
}

// Функция для обработки workflow команд
async function handleWorkflowCommands(bot, chatId, user, dbUser, text) {
  try {
    console.log(`🔧 Команда Coze от пользователя ${user.id}:`, text);
    
    // Обработка команды /deepresearch через workflow
    if (text.toLowerCase().startsWith('/deepresearch')) {
      console.log('🔬 Обнаружена команда /deepresearch, устанавливаем состояние ожидания');
      userStates.set(user.id, 'waiting_for_research_topic');
      
      await bot.sendMessage(chatId, 
        '🔬 **Глубокое исследование**\n\n' +
        'Укажите тему для детального научного анализа.\n\n' +
        '💡 **Примеры тем:**\n' +
        '• Влияние креатина на силовые показатели\n' +
        '• Гендерные различия в силовом тренинге\n' +
        '• Оптимальное время для кардио и силовых\n' +
        '• Периодизация тренировок для набора массы\n' +
        '• Спортивное питание для восстановления\n\n' +
        '📝 Напишите вашу тему:'
      );
      console.log('✅ Сообщение отправлено, выходим из функции');
      return;
    }

    // Обработка команды /training_program через workflow
    if (text.toLowerCase().startsWith('/training_program')) {
      console.log('🏋️‍♂️ Обнаружена команда /training_program, устанавливаем состояние ожидания');
      userStates.set(user.id, 'waiting_for_training_request');
      
      await bot.sendMessage(chatId, 
        '🏋️‍♂️ **Создание тренировочной программы**\n\n' +
        'Расскажите подробно о ваших целях и условиях тренировок:\n\n' +
        '📋 **Укажите:**\n' +
        '• Цель тренировок (похудение, набор массы, сила, выносливость)\n' +
        '• Уровень подготовки (новичок, средний, продвинутый)\n' +
        '• Сколько дней в неделю готовы тренироваться\n' +
        '• Доступное время на тренировку\n' +
        '• Доступное оборудование (зал, дом, какие снаряды)\n' +
        '• Ограничения по здоровью (если есть)\n\n' +
        '📝 Опишите ваши требования:'
      );
      return;
    }

    // Обработка команды /nutrition_plan через workflow
    if (text.toLowerCase().startsWith('/nutrition_plan')) {
      console.log('🥗 Обнаружена команда /nutrition_plan, устанавливаем состояние ожидания');
      userStates.set(user.id, 'waiting_for_nutrition_request');
      
      await bot.sendMessage(chatId, 
        '🥗 **Создание плана питания**\n\n' +
        'Для составления персонального плана питания укажите:\n\n' +
        '📊 **Основные данные:**\n' +
        '• Цель (похудение, набор массы, поддержание веса)\n' +
        '• Пол, возраст, рост, текущий вес\n' +
        '• Уровень физической активности\n' +
        '• Сколько приемов пищи предпочитаете\n\n' +
        '🍽️ **Предпочтения:**\n' +
        '• Аллергии или непереносимость продуктов\n' +
        '• Особый тип питания (веган, кето, без глютена и т.д.)\n' +
        '• Нелюбимые продукты\n' +
        '• Бюджет на питание\n\n' +
        '📝 Расскажите о себе:'
      );
      return;
    }

    // Обработка команды /composition_analysis через workflow
    if (text.toLowerCase().startsWith('/composition_analysis')) {
      console.log('🧪 Обнаружена команда /composition_analysis, устанавливаем состояние ожидания');
      userStates.set(user.id, 'waiting_for_supplement_info');
      
      await bot.sendMessage(chatId, 
        '🧪 **Анализ состава добавки**\n\n' +
        'Отправьте информацию о добавке для детального анализа:\n\n' +
        '📷 **Способы отправки:**\n' +
        '• Фото этикетки с составом\n' +
        '• Название добавки и производителя\n' +
        '• Список ингредиентов с дозировками\n\n' +
        '🔍 **Я проанализирую:**\n' +
        '• Эффективность компонентов\n' +
        '• Безопасность дозировок\n' +
        '• Научные исследования\n' +
        '• Рекомендации по применению\n' +
        '• Возможные побочные эффекты\n\n' +
        '📝 Отправьте информацию о добавке:'
      );
      return;
    }
    
    // Неизвестная команда
    await bot.sendMessage(
      chatId,
      '❓ Неизвестная команда. Доступные команды:\n\n' +
      '• `/deepresearch` - глубокий анализ\n' +
      '• `/training_program` - программа тренировок\n' +
      '• `/nutrition_plan` - план питания\n' +
      '• `/composition_analysis` - анализ добавок',
      mainKeyboard
    );
    
  } catch (error) {
    console.error('❌ Ошибка обработки workflow команды:', error);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при обработке команды. Попробуйте позже.');
  }
}

// Функция для отображения истории платежей
async function showPaymentHistory(bot, chatId, userId) {
  try {
    // Получаем все подписки пользователя (включая истекшие)
    const { getAllUserSubscriptions } = await import('../services/database.js');
    const subscriptions = await getAllUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      await bot.sendMessage(
        chatId,
        '📊 **История платежей**\n\n' +
        '❌ У вас пока нет истории платежей.\n\n' +
        '💡 Оформите первую подписку для начала работы с ИИ-тренером!',
        { parse_mode: 'Markdown', ...subscriptionKeyboard }
      );
      return;
    }

    let message = '📊 **История платежей**\n\n';
    
    subscriptions.forEach((subscription, index) => {
      const startDate = new Date(subscription.start_date).toLocaleDateString('ru-RU');
      const endDate = new Date(subscription.end_date).toLocaleDateString('ru-RU');
      const createdDate = new Date(subscription.created_at).toLocaleDateString('ru-RU');
      
      const planNames = {
        'basic': 'Базовый',
        'standard': 'Стандартный', 
        'premium': 'Премиум',
        'monthly': 'Месячный'
      };
      
      const statusEmoji = subscription.status === 'active' ? '✅' : subscription.status === 'expired' ? '⏰' : '❌';
      
      message += `${index + 1}. ${statusEmoji} **${planNames[subscription.plan_type] || subscription.plan_type}**\n`;
      message += `   💰 Сумма: ${subscription.amount}₽\n`;
      message += `   📅 Период: ${startDate} - ${endDate}\n`;
      message += `   📊 Статус: ${subscription.status === 'active' ? 'Активна' : subscription.status === 'expired' ? 'Истекла' : 'Неактивна'}\n`;
      message += `   🗓 Оплачена: ${createdDate}\n`;
      if (subscription.status === 'active') {
        message += `   📈 Запросов: ${subscription.requests_used}/${subscription.requests_limit}\n`;
      }
      message += '\n';
    });

    message += '💡 Для продления подписки нажмите "💳 Продлить подписку"';

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...subscriptionKeyboard });
    
  } catch (error) {
    console.error('Ошибка получения истории платежей:', error);
    await bot.sendMessage(
      chatId,
      '❌ Ошибка при загрузке истории платежей. Попробуйте позже.',
      subscriptionKeyboard
    );
  }
}

