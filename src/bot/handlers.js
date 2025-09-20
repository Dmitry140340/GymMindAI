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
  getUserDataSummary
} from '../services/database.js';
import { runWorkflow, getConversationId, clearConversation, continueInteractiveWorkflow } from '../services/coze.js';
import { runCozeChat } from '../services/coze_v3.js';
import { createSubscriptionPayment } from '../services/payment.js';
import { analyzeUserProgress, formatProgressReport } from '../services/progress-analyzer.js';
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

// Хранилища состояний пользователей
const userStates = new Map();
const userWorkflowContext = new Map();
const userInteractiveWorkflow = new Map();
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
      
      // Проверяем согласие с пользовательским соглашением
      const dbUser = await getUserByTelegramId(user.id);
      
      if (!dbUser.agreement_accepted) {
        await bot.sendMessage(
          chatId,
          '📄 **Добро пожаловать в FitnessBotAI!**\n\n' +
          'Для использования бота необходимо принять пользовательское соглашение.\n\n' +
          '⚠️ **Важно**: Этот бот предоставляет информацию исключительно в образовательных целях. ' +
          'Всегда консультируйтесь с врачом или квалифицированным специалистом по фитнесу перед началом новой программы тренировок или изменением диеты.\n\n' +
          '🔒 Мы заботимся о конфиденциальности ваших данных и используем их только для улучшения сервиса.',
          { parse_mode: 'Markdown', ...userAgreementKeyboard }
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
      await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка текстовых сообщений
  bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
      await handleTextMessage(bot, msg);
    }
  });

  // Обработка callback запросов
  bot.on('callback_query', async (callbackQuery) => {
    await handleCallbackQuery(bot, callbackQuery);
  });

  // Периодическая проверка истекших подписок
  setInterval(async () => {
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      console.error('Ошибка проверки подписок:', error);
    }
  }, 60000); // Каждую минуту
}

async function handleTextMessage(bot, msg) {
  const chatId = msg.chat.id;
  const text = msg.text;
  const user = msg.from;

  console.log(`📩 Получено сообщение от пользователя ${user.id}:`, text);

  try {
    // Обновляем активность пользователя
    await createOrUpdateUser(user);
    const dbUser = await getUserByTelegramId(user.id);

    // Проверяем согласие с пользовательским соглашением
    if (!dbUser.agreement_accepted) {
      await bot.sendMessage(
        chatId,
        '⚠️ Для использования бота необходимо принять пользовательское соглашение.',
        userAgreementKeyboard
      );
      return;
    }

    // Обработка основных команд и кнопок
    if (text === '🤖 ИИ-тренер' || text.includes('ИИ-тренер')) {
      userStates.delete(user.id); // Сбрасываем режим ИИ-тренера
      
      // Проверяем доступ пользователя (подписка или бесплатные запросы)
      const subscription = await getActiveSubscription(dbUser.id);
      const freeRequests = await getUserFreeRequests(dbUser.id);
      
      let hasAccess = false;
      let requestStatus = null;
      
      if (subscription && subscription.status === 'active') {
        hasAccess = true;
        requestStatus = { type: 'subscription', subscription };
      } else if (freeRequests.remaining > 0) {
        hasAccess = true;
        requestStatus = { type: 'free', remaining: freeRequests.remaining };
      }
      
      if (hasAccess) {
        userStates.set(user.id, 'ai_trainer');
        
        let message = '🤖 **ИИ-тренер активирован!**\n\n';
        message += '💬 Теперь вы можете задавать мне любые вопросы о:\n';
        message += '• 💪 Тренировках и упражнениях\n';
        message += '• 🥗 Питании и диете\n';
        message += '• 🏃‍♂️ Кардио и выносливости\n';
        message += '• 🧘‍♀️ Восстановлении и растяжке\n\n';
        
        if (requestStatus.type === 'free') {
          message += `🆓 Бесплатных запросов осталось: ${requestStatus.remaining}/7\n\n`;
        } else {
          message += '💎 У вас активная подписка - безлимитные запросы!\n\n';
        }
        
        message += '📝 Просто отправьте ваш вопрос текстом, и я отвечу максимально подробно!';
        
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...mainKeyboard });
      } else {
        await bot.sendMessage(
          chatId,
          '🔒 **Доступ ограничен**\n\n' +
          '❌ У вас закончились бесплатные запросы (7/7 использовано)\n\n' +
          '💎 Для продолжения работы с ИИ-тренером оформите подписку:\n\n' +
          '**Доступные планы:**\n' +
          '• 🥉 Базовый (150₽) - 30 дней, 100 запросов\n' +
          '• 🥈 Стандарт (300₽) - 30 дней, 300 запросов\n' +
          '• 🥇 Премиум (450₽) - 30 дней, безлимит',
          { parse_mode: 'Markdown', ...subscriptionKeyboard }
        );
      }
      return;
    }
    
    if (text === '📊 Подписка' || text.includes('Подписка')) {
      userStates.delete(user.id);
      await showSubscriptionMenu(bot, chatId, dbUser.id);
      return;
    }

    if (text === '🏠 Главное меню' || text.includes('Главное меню')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '🏠 **Главное меню**\n\nВыберите действие:',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return;
    }

    if (text === '📊 Мой профиль' || text.includes('Мой профиль')) {
      userStates.delete(user.id);
      await showUserProfile(bot, chatId, user);
      return;
    }

    if (text === '🎯 Мои данные' || text.includes('Мои данные')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '🎯 **Управление данными**\n\n' +
        'Здесь вы можете:\n' +
        '• ⚖️ Записывать и отслеживать вес\n' +
        '• 🎯 Устанавливать и изменять цели\n' +
        '• 🏋️‍♂️ Добавлять тренировки\n' +
        '• 📊 Просматривать свои записи\n' +
        '• 📧 Редактировать данные\n' +
        '• 🗑️ Удалять записи\n\n' +
        'Выберите действие:',
        { parse_mode: 'Markdown', ...userDataKeyboard }
      );
      return;
    }

    if (text === '🧬 ИИ-инструменты' || text.includes('ИИ-инструменты')) {
      userStates.delete(user.id);
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

    // Обработка кнопок управления данными
    if (text === '⚖️ Записать вес' || text.includes('Записать вес')) {
      userStates.set(user.id, 'entering_weight');
      await bot.sendMessage(
        chatId,
        '⚖️ **Запись веса**\n\n' +
        'Введите ваш текущий вес в килограммах (например: 75.5):',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (text === '🎯 Установить цель' || text.includes('Установить цель')) {
      userStates.set(user.id, 'setting_goal');
      await bot.sendMessage(
        chatId,
        '🎯 **Установка цели**\n\n' +
        'Выберите тип цели:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      return;
    }

    if (text === '🏋️‍♂️ Добавить тренировку' || text.includes('Добавить тренировку')) {
      userStates.set(user.id, 'adding_workout');
      await bot.sendMessage(
        chatId,
        '🏋️‍♂️ **Добавление тренировки**\n\n' +
        'Выберите тип тренировки:',
        { parse_mode: 'Markdown', ...workoutKeyboard }
      );
      return;
    }

    if (text === '📊 Мои записи' || text.includes('Мои записи')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '📊 **Мои записи**\n\n' +
        'Выберите, что хотите посмотреть:',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    // Обработка кнопок аналитики  
    if (text === '📈 График веса' || text.includes('График веса')) {
      userStates.delete(user.id);
      
      await bot.sendMessage(chatId, '📊 Генерирую график веса...');
      
      try {
        const chartBuffer = await generateWeightChart(dbUser.id);
        if (chartBuffer) {
          await bot.sendPhoto(chatId, chartBuffer, {
            caption: '📈 **График изменения веса**\n\nВаша динамика за последнее время',
            parse_mode: 'Markdown'
          });
        } else {
          await bot.sendMessage(
            chatId,
            '📝 У вас пока нет записей о весе.\n\nДобавьте первую запись через "🎯 Мои данные" → "⚖️ Записать вес"'
          );
        }
      } catch (error) {
        console.error('Ошибка генерации графика веса:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при генерации графика. Попробуйте позже.');
      }
      return;
    }

    if (text === '🏋️‍♂️ График тренировок' || text.includes('График тренировок')) {
      userStates.delete(user.id);
      
      await bot.sendMessage(chatId, '📊 Генерирую график тренировок...');
      
      try {
        const chartBuffer = await generateWorkoutChart(dbUser.id);
        if (chartBuffer) {
          await bot.sendPhoto(chatId, chartBuffer, {
            caption: '🏋️‍♂️ **График тренировок**\n\nВаша активность за последнее время',
            parse_mode: 'Markdown'
          });
        } else {
          await bot.sendMessage(
            chatId,
            '📝 У вас пока нет записей о тренировках.\n\nДобавьте первую тренировку через "🎯 Мои данные" → "🏋️‍♂️ Добавить тренировку"'
          );
        }
      } catch (error) {
        console.error('Ошибка генерации графика тренировок:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при генерации графика. Попробуйте позже.');
      }
      return;
    }

    if (text === '📊 Общий отчет' || text.includes('Общий отчет')) {
      userStates.delete(user.id);
      
      await bot.sendMessage(chatId, '📊 Генерирую отчет о прогрессе...');
      
      try {
        const progressReport = await analyzeUserProgress(dbUser.id);
        const formattedReport = await formatProgressReport(progressReport);
        
        await bot.sendMessage(chatId, formattedReport, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Ошибка генерации отчета:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при генерации отчета. Попробуйте позже.');
      }
      return;
    }

    // Обработка кнопок навигации
    if (text === '⬅️ Назад в меню' || text.includes('Назад в меню')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '🏠 **Главное меню**\n\nВыберите действие:',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return;
    }

    if (text === '📈 Аналитика' || text.includes('Аналитика')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '📈 **Аналитика и отчеты**\n\n' +
        'Выберите тип аналитики:',
        { parse_mode: 'Markdown', ...analyticsKeyboard }
      );
      return;
    }

    if (text === '❓ Помощь' || text.includes('Помощь')) {
      userStates.delete(user.id);
      const helpMessage = `❓ **Помощь по использованию FitnessBotAI**

🤖 **ИИ-тренер** - ваш персональный помощник по фитнесу:
• Отвечает на вопросы о тренировках
• Составляет программы упражнений  
• Дает советы по питанию
• Помогает с мотивацией

📊 **Мой профиль** - информация о вашей учетной записи:
• Статус подписки
• Оставшиеся запросы
• История платежей

🎯 **Мои данные** - управление фитнес-данными:
• Запись веса и измерений
• Установка целей
• Добавление тренировок
• Просмотр прогресса

📈 **Аналитика** - отчеты и графики:
• График изменения веса
• Анализ тренировок
• Отчет о прогрессе

💎 **Подписка** - управление тарифным планом:
• Оформление подписки
• Просмотр тарифов
• История платежей

🆘 **Нужна помощь?** Напишите в поддержку: @support_bot`;

      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown', ...mainKeyboard });
      return;
    }

    if (text === '🔄 Новый диалог' || text.includes('Новый диалог')) {
      // Очищаем состояние пользователя
      userStates.delete(user.id);
      userWorkflowContext.delete(user.id);
      userInteractiveWorkflow.delete(user.id);
      
      await bot.sendMessage(
        chatId,
        '🔄 **Диалог сброшен!**\n\n' +
        'Контекст разговора очищен. Можете начать новую тему.\n\n' +
        'Выберите действие:',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return;
    }

    // Обработка кнопок истории и записей
    if (text === '🏋️‍♂️ История тренировок' || text.includes('История тренировок')) {
      userStates.delete(user.id);
      
      try {
        const workouts = await getUserWorkouts(dbUser.id);
        if (workouts && workouts.length > 0) {
          let message = '🏋️‍♂️ **История тренировок**\n\n';
          workouts.slice(0, 10).forEach((workout, index) => {
            const date = new Date(workout.date).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${workout.type || 'Тренировка'}\n`;
            message += `   📅 ${date}\n`;
            if (workout.description) {
              message += `   📝 ${workout.description}\n`;
            }
            message += '\n';
          });
          
          if (workouts.length > 10) {
            message += `... и еще ${workouts.length - 10} записей\n\n`;
          }
          
          message += 'Показаны последние 10 записей.';
          
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...mainKeyboard });
        } else {
          await bot.sendMessage(
            chatId,
            '📝 **У вас пока нет записей о тренировках**\n\n' +
            'Добавьте первую тренировку через:\n' +
            '🎯 Мои данные → 🏋️‍♂️ Добавить тренировку',
            { parse_mode: 'Markdown', ...mainKeyboard }
          );
        }
      } catch (error) {
        console.error('Ошибка получения истории тренировок:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при загрузке истории тренировок.', mainKeyboard);
      }
      return;
    }

    if (text === '⚖️ История веса' || text.includes('История веса')) {
      userStates.delete(user.id);
      
      try {
        const metrics = await getUserMetrics(dbUser.id);
        const weightRecords = metrics.filter(m => m.metric_type === 'weight');
        
        if (weightRecords && weightRecords.length > 0) {
          let message = '⚖️ **История веса**\n\n';
          weightRecords.slice(0, 15).forEach((record, index) => {
            const date = new Date(record.date).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${record.value} кг - ${date}\n`;
          });
          
          if (weightRecords.length > 15) {
            message += `\n... и еще ${weightRecords.length - 15} записей\n\n`;
          }
          
          message += '\nПоказаны последние 15 записей.';
          
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...mainKeyboard });
        } else {
          await bot.sendMessage(
            chatId,
            '📝 **У вас пока нет записей о весе**\n\n' +
            'Добавьте первую запись через:\n' +
            '🎯 Мои данные → ⚖️ Записать вес',
            { parse_mode: 'Markdown', ...mainKeyboard }
          );
        }
      } catch (error) {
        console.error('Ошибка получения истории веса:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при загрузке истории веса.', mainKeyboard);
      }
      return;
    }

    if (text === '🎯 Мои цели' || text.includes('Мои цели')) {
      userStates.delete(user.id);
      
      try {
        const goals = await getUserGoals(dbUser.id);
        if (goals && goals.length > 0) {
          let message = '🎯 **Мои цели**\n\n';
          goals.forEach((goal, index) => {
            const date = new Date(goal.created_at).toLocaleDateString('ru-RU');
            message += `${index + 1}. ${goal.goal}\n`;
            message += `   📅 Создана: ${date}\n`;
            if (goal.status) {
              message += `   📊 Статус: ${goal.status}\n`;
            }
            message += '\n';
          });
          
          await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...mainKeyboard });
        } else {
          await bot.sendMessage(
            chatId,
            '📝 **У вас пока нет целей**\n\n' +
            'Установите первую цель через:\n' +
            '🎯 Мои данные → 🎯 Установить цель',
            { parse_mode: 'Markdown', ...mainKeyboard }
          );
        }
      } catch (error) {
        console.error('Ошибка получения целей:', error);
        await bot.sendMessage(chatId, '❌ Ошибка при загрузке целей.', mainKeyboard);
      }
      return;
    }

    if (text === '🗑️ Удалить записи' || text.includes('Удалить записи')) {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '🗑️ **Удаление записей**\n\n' +
        '⚠️ **Внимание!** Удаленные данные восстановить невозможно.\n\n' +
        'Что вы хотите удалить?',
        { parse_mode: 'Markdown', ...deleteRecordsKeyboard }
      );
      return;
    }

    // Обработка кнопок удаления
    if (text === '🗑️ Удалить тренировки' || text.includes('Удалить тренировки')) {
      userStates.set(user.id, 'confirm_delete_workouts');
      await bot.sendMessage(
        chatId,
        '⚠️ **Подтверждение удаления**\n\n' +
        'Вы действительно хотите удалить ВСЕ записи о тренировках?\n' +
        'Это действие нельзя отменить!',
        { parse_mode: 'Markdown', reply_markup: { keyboard: [['✅ Да, удалить'], ['❌ Отмена']], resize_keyboard: true } }
      );
      return;
    }

    if (text === '🗑️ Удалить веса' || text.includes('Удалить веса')) {
      userStates.set(user.id, 'confirm_delete_weight');
      await bot.sendMessage(
        chatId,
        '⚠️ **Подтверждение удаления**\n\n' +
        'Вы действительно хотите удалить ВСЕ записи о весе?\n' +
        'Это действие нельзя отменить!',
        { parse_mode: 'Markdown', reply_markup: { keyboard: [['✅ Да, удалить'], ['❌ Отмена']], resize_keyboard: true } }
      );
      return;
    }

    if (text === '🗑️ Удалить всё' || text.includes('Удалить всё')) {
      userStates.set(user.id, 'confirm_delete_all');
      await bot.sendMessage(
        chatId,
        '🚨 **ВНИМАНИЕ! ПОЛНОЕ УДАЛЕНИЕ**\n\n' +
        'Вы собираетесь удалить ВСЕ ваши данные:\n' +
        '• Записи о весе\n' +
        '• Историю тренировок\n' +
        '• Цели\n' +
        '• Прогресс\n\n' +
        '❗ Это действие НЕВОЗМОЖНО отменить!\n\n' +
        'Вы уверены?',
        { parse_mode: 'Markdown', reply_markup: { keyboard: [['✅ Да, удалить ВСЁ'], ['❌ Отмена']], resize_keyboard: true } }
      );
      return;
    }

    // Проверяем, находится ли пользователь в режиме ИИ-тренера
    const userState = userStates.get(user.id);
    
    if (userState === 'ai_trainer') {
      // Проверяем доступ пользователя
      const subscription = await getActiveSubscription(dbUser.id);
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        await bot.sendMessage(
          chatId,
          '🔒 **Доступ ограничен**\n\n' +
          requestStatus.message,
          { parse_mode: 'Markdown', ...subscriptionKeyboard }
        );
        userStates.delete(user.id);
        return;
      }
      
      // Отправляем сообщение "думаю"
      const thinkingMessage = await bot.sendMessage(chatId, '🤔 Обрабатываю ваш запрос...');
      
      // Получаем контекст предыдущего разговора
      let workflowContext = userWorkflowContext.get(user.id);
      
      let messageWithContext = text;
      if (workflowContext && workflowContext.lastResponse) {
        messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:
${workflowContext.lastResponse}

УТОЧНЯЮЩИЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}

Пожалуйста, ответь на уточняющий вопрос с учетом контекста предыдущего анализа.`;
      }

      console.log(`📝 Отправляем уточняющий вопрос в Coze API для пользователя ${user.id}`);
      
      const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер и эксперт по питанию: будь конкретным, структурируй ответы списками, используй контекст предыдущего анализа.');

      // Удаляем сообщение "думает"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // Игнорируем ошибки удаления
      }

      if (aiResponse.success) {
        // Обновляем timestamp контекста для возможности дальнейших уточнений
        workflowContext = workflowContext || {};
        workflowContext.lastResponse = aiResponse.message;
        workflowContext.timestamp = Date.now();
        userWorkflowContext.set(user.id, workflowContext);
        
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

    // Обработка состояний ввода данных
    if (userState === 'entering_weight') {
      const weight = parseFloat(text);
      if (isNaN(weight) || weight <= 0 || weight > 300) {
        await bot.sendMessage(
          chatId,
          '❌ **Некорректный вес**\n\n' +
          'Пожалуйста, введите корректный вес в килограммах (от 1 до 300).\n' +
          'Например: 75.5',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        await saveFitnessMetric(dbUser.id, 'weight', weight);
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `✅ **Вес записан!**\n\n` +
          `📊 Ваш вес: ${weight} кг\n` +
          `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `Данные сохранены в вашем профиле.`,
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      } catch (error) {
        console.error('Ошибка сохранения веса:', error);
        await bot.sendMessage(
          chatId,
          '❌ Ошибка при сохранении данных. Попробуйте позже.',
          mainKeyboard
        );
      }
      return;
    }

    if (userState === 'setting_goal') {
      userStates.delete(user.id);
      
      try {
        await setUserGoal(dbUser.id, text);
        
        await bot.sendMessage(
          chatId,
          `🎯 **Цель установлена!**\n\n` +
          `Ваша цель: ${text}\n\n` +
          `Теперь вы можете отслеживать прогресс в разделе "📈 Аналитика"`,
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      } catch (error) {
        console.error('Ошибка установки цели:', error);
        await bot.sendMessage(
          chatId,
          '❌ Ошибка при установке цели. Попробуйте позже.',
          mainKeyboard
        );
      }
      return;
    }

    if (userState === 'adding_workout') {
      userStates.delete(user.id);
      
      try {
        const workoutData = {
          type: text,
          date: new Date(),
          description: `Тренировка: ${text}`
        };
        
        await saveWorkout(dbUser.id, workoutData);
        
        await bot.sendMessage(
          chatId,
          `🏋️‍♂️ **Тренировка добавлена!**\n\n` +
          `Тип: ${text}\n` +
          `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `Тренировка сохранена в вашем профиле.`,
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      } catch (error) {
        console.error('Ошибка сохранения тренировки:', error);
        await bot.sendMessage(
          chatId,
          '❌ Ошибка при сохранении тренировки. Попробуйте позже.',
          mainKeyboard
        );
      }
      return;
    }

    // Обработка подтверждений удаления
    if (userState === 'confirm_delete_workouts') {
      if (text === '✅ Да, удалить' || text.includes('Да')) {
        userStates.delete(user.id);
        
        try {
          // Удаляем все тренировки пользователя
          const workouts = await getUserWorkouts(dbUser.id);
          if (workouts && workouts.length > 0) {
            // Здесь нужна функция для удаления всех тренировок
            // await deleteAllUserWorkouts(dbUser.id);
            
            await bot.sendMessage(
              chatId,
              `✅ **Тренировки удалены**\n\n` +
              `Удалено записей: ${workouts.length}\n\n` +
              `Все записи о тренировках были удалены из вашего профиля.`,
              { parse_mode: 'Markdown', ...mainKeyboard }
            );
          } else {
            await bot.sendMessage(
              chatId,
              '📝 У вас нет записей о тренировках для удаления.',
              mainKeyboard
            );
          }
        } catch (error) {
          console.error('Ошибка удаления тренировок:', error);
          await bot.sendMessage(
            chatId,
            '❌ Ошибка при удалении тренировок. Попробуйте позже.',
            mainKeyboard
          );
        }
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ **Удаление отменено**\n\nВаши данные остались без изменений.',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      }
      return;
    }

    if (userState === 'confirm_delete_weight') {
      if (text === '✅ Да, удалить' || text.includes('Да')) {
        userStates.delete(user.id);
        
        try {
          // Удаляем все записи о весе
          const metrics = await getUserMetrics(dbUser.id);
          const weightRecords = metrics.filter(m => m.metric_type === 'weight');
          
          if (weightRecords && weightRecords.length > 0) {
            // Здесь нужна функция для удаления всех записей о весе
            // await deleteAllUserWeight(dbUser.id);
            
            await bot.sendMessage(
              chatId,
              `✅ **Записи о весе удалены**\n\n` +
              `Удалено записей: ${weightRecords.length}\n\n` +
              `Все записи о весе были удалены из вашего профиля.`,
              { parse_mode: 'Markdown', ...mainKeyboard }
            );
          } else {
            await bot.sendMessage(
              chatId,
              '📝 У вас нет записей о весе для удаления.',
              mainKeyboard
            );
          }
        } catch (error) {
          console.error('Ошибка удаления записей о весе:', error);
          await bot.sendMessage(
            chatId,
            '❌ Ошибка при удалении записей о весе. Попробуйте позже.',
            mainKeyboard
          );
        }
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ **Удаление отменено**\n\nВаши данные остались без изменений.',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      }
      return;
    }

    if (userState === 'confirm_delete_all') {
      if (text === '✅ Да, удалить ВСЁ' || text.includes('Да')) {
        userStates.delete(user.id);
        
        try {
          await clearAllUserData(dbUser.id);
          
          await bot.sendMessage(
            chatId,
            `🗑️ **Все данные удалены**\n\n` +
            `Удалены:\n` +
            `• Все записи о весе\n` +
            `• Вся история тренировок\n` +
            `• Все цели\n` +
            `• Весь прогресс\n\n` +
            `Ваш профиль очищен. Можете начать заново!`,
            { parse_mode: 'Markdown', ...mainKeyboard }
          );
        } catch (error) {
          console.error('Ошибка полного удаления данных:', error);
          await bot.sendMessage(
            chatId,
            '❌ Ошибка при удалении данных. Попробуйте позже.',
            mainKeyboard
          );
        }
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '❌ **Удаление отменено**\n\nВсе ваши данные остались в безопасности.',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
      }
      return;
    }

    // Обработка кнопки "Отмена"
    if (text === '❌ Отмена' || text === '❌ Нет') {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '❌ **Действие отменено**\n\nВозвращаемся в главное меню.',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return;
    }

    // Если сообщение не распознано
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
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const messageId = callbackQuery.message.message_id;

  try {
    // Подтверждаем получение callback
    await bot.answerCallbackQuery(callbackQuery.id);

    // Обработка callback'ов
    if (data === 'accept_agreement') {
      await updateUserAgreement(userId, true);
      
      await bot.editMessageText(
        '✅ **Спасибо за принятие соглашения!**\n\n' +
        '🎉 Теперь вы можете пользоваться всеми функциями FitnessBotAI!\n\n' +
        'Выберите действие:',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...mainKeyboard
        }
      );
      return;
    }

    if (data === 'decline_agreement') {
      await bot.editMessageText(
        '❌ **Соглашение отклонено**\n\n' +
        'Для использования бота необходимо принять пользовательское соглашение.\n\n' +
        'Если вы передумаете, отправьте команду /start',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    if (data === 'main_menu') {
      await bot.editMessageText(
        '🏠 **Главное меню**\n\nВыберите действие:',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...mainKeyboard
        }
      );
      return;
    }

    if (data === 'subscription_menu') {
      const dbUser = await getUserByTelegramId(userId);
      await showSubscriptionMenu(bot, chatId, dbUser.id, messageId);
      return;
    }

    // Обработка выбора тарифного плана
    if (data.startsWith('plan_')) {
      const planType = data.replace('plan_', '');
      await showPaymentConfirmation(bot, chatId, messageId, planType);
      return;
    }

    // Обработка подтверждения оплаты
    if (data.startsWith('confirm_payment_')) {
      const planType = data.replace('confirm_payment_', '');
      await processPayment(bot, chatId, messageId, userId, planType);
      return;
    }

    // Другие callback'ы
    await bot.sendMessage(chatId, 'Функция в разработке. Используйте основные кнопки меню.');

  } catch (error) {
    console.error('Ошибка обработки callback:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
  }
}

async function showSubscriptionMenu(bot, chatId, userId, messageId = null) {
  try {
    const subscription = await getActiveSubscription(userId);
    const freeRequests = await getUserFreeRequests(userId);
    
    let message = '📊 **Управление подпиской**\n\n';
    
    if (subscription && subscription.status === 'active') {
      const endDate = new Date(subscription.end_date).toLocaleString('ru-RU');
      message += `✅ **Активная подписка**\n`;
      message += `📋 План: ${subscription.plan_type}\n`;
      message += `📅 Действует до: ${endDate}\n`;
      message += `🔄 Запросов: ${subscription.requests_used}/${subscription.requests_limit}\n\n`;
      
      if (messageId) {
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...manageSubscriptionKeyboard
        });
      } else {
        await bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown', 
          ...manageSubscriptionKeyboard 
        });
      }
    } else {
      message += `❌ **Нет активной подписки**\n\n`;
      message += `🆓 Бесплатные запросы: ${freeRequests.used}/${freeRequests.limit}\n`;
      message += `📅 Сброс: каждые 24 часа\n\n`;
      message += `💎 **Доступные планы:**\n`;
      message += `• 🥉 Базовый - 150₽ (100 запросов/месяц)\n`;
      message += `• 🥈 Стандарт - 300₽ (300 запросов/месяц)\n`;
      message += `• 🥇 Премиум - 450₽ (безлимит/месяц)\n\n`;
      message += `Выберите подходящий план:`;
      
      if (messageId) {
        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          ...subscriptionPlansKeyboard
        });
      } else {
        await bot.sendMessage(chatId, message, { 
          parse_mode: 'Markdown', 
          ...subscriptionPlansKeyboard 
        });
      }
    }
  } catch (error) {
    console.error('Ошибка показа меню подписки:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при загрузке информации о подписке.');
  }
}

async function showUserProfile(bot, chatId, user) {
  try {
    const dbUser = await getUserByTelegramId(user.id);
    const subscription = await getActiveSubscription(dbUser.id);
    const freeRequests = await getUserFreeRequests(dbUser.id);
    
    let profileMessage = `👤 **Профиль пользователя**\n\n`;
    profileMessage += `🆔 ID: ${user.id}\n`;
    profileMessage += `👤 Имя: ${user.first_name}`;
    if (user.last_name) profileMessage += ` ${user.last_name}`;
    if (user.username) profileMessage += `\n📧 @${user.username}`;
    
    profileMessage += `\n📅 Регистрация: ${new Date(dbUser.created_at).toLocaleDateString('ru-RU')}\n\n`;
    
    if (subscription && subscription.status === 'active') {
      profileMessage += `✅ **Активная подписка**\n`;
      profileMessage += `📋 План: ${subscription.plan_type}\n`;
      profileMessage += `📅 До: ${new Date(subscription.end_date).toLocaleDateString('ru-RU')}\n`;
      profileMessage += `🔄 Запросов: ${subscription.requests_used}/${subscription.requests_limit}`;
    } else {
      profileMessage += `🆓 **Бесплатный доступ**\n`;
      profileMessage += `📊 Использовано: ${freeRequests.used}/${freeRequests.limit} запросов`;
    }
    
    await bot.sendMessage(chatId, profileMessage, { 
      parse_mode: 'Markdown', 
      ...mainKeyboard 
    });
  } catch (error) {
    console.error('Ошибка показа профиля:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при загрузке профиля.');
  }
}

async function showPaymentConfirmation(bot, chatId, messageId, planType) {
  const plans = {
    basic: { name: 'Базовый', price: 150, requests: 100 },
    standard: { name: 'Стандарт', price: 300, requests: 300 },
    premium: { name: 'Премиум', price: 450, requests: 'безлимит' }
  };
  
  const plan = plans[planType];
  if (!plan) return;
  
  const message = `💳 **Подтверждение покупки**\n\n` +
    `📋 План: ${plan.name}\n` +
    `💰 Цена: ${plan.price}₽\n` +
    `🔄 Запросов: ${plan.requests}\n` +
    `📅 Срок: 30 дней\n\n` +
    `Подтвердите покупку:`;
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    ...paymentConfirmKeyboard(planType)
  });
}

async function processPayment(bot, chatId, messageId, telegramId, planType) {
  try {
    await bot.editMessageText(
      '⏳ Создаем ссылку для оплаты...',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    const paymentResult = await createSubscriptionPayment(telegramId, planType);
    
    if (paymentResult.success) {
      const message = `💳 **Ссылка для оплаты готова!**\n\n` +
        `📋 План: ${planType}\n` +
        `💰 Сумма: ${paymentResult.amount}₽\n\n` +
        `👆 Нажмите кнопку ниже для оплаты:`;
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Оплатить', url: paymentResult.paymentUrl }],
            [{ text: '⬅️ Назад', callback_data: 'subscription_menu' }]
          ]
        }
      });
    } else {
      await bot.editMessageText(
        '❌ Ошибка создания платежа. Попробуйте позже.',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад', callback_data: 'subscription_menu' }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error('Ошибка обработки платежа:', error);
    await bot.editMessageText(
      '❌ Произошла ошибка. Попробуйте позже.',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад', callback_data: 'subscription_menu' }]
          ]
        }
      }
    );
  }
}

// Export functions
export { handleTextMessage, handleCallbackQuery };