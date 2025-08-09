import { getStats, checkExpiredSubscriptions, activateSubscription, getUserByTelegramId } from '../services/database.js';
import { checkCozeConnection, sendMessageToCoze } from '../services/coze.js';

// Команды администратора
export function setupAdminHandlers(bot) {
  // Получить свой Telegram ID
  bot.onText(/\/my_id/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    await bot.sendMessage(chatId, `Ваш Telegram ID: ${userId}`);
  });

  // Статистика (только для администратора)
  bot.onText(/\/admin_stats/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Проверяем, является ли пользователь администратором
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    try {
      const stats = await getStats();
      const cozeStatus = await checkCozeConnection();
      
      const message = `📊 Статистика бота\n\n` +
                     `👥 Всего пользователей: ${stats.total_users}\n` +
                     `💎 Активных подписок: ${stats.active_subscriptions}\n` +
                     `💳 Успешных платежей: ${stats.successful_payments}\n` +
                     `💰 Общая выручка: ${stats.total_revenue || 0}₽\n\n` +
                     `🤖 Coze API: ${cozeStatus ? '✅ Работает' : '❌ Недоступен'}\n` +
                     `📅 Дата: ${new Date().toLocaleString('ru-RU')}`;
      
      await bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения статистики.');
    }
  });

  // Проверка истёкших подписок
  bot.onText(/\/admin_check_expired/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    try {
      const expiredCount = await checkExpiredSubscriptions();
      await bot.sendMessage(chatId, `✅ Проверка завершена. Обновлено подписок: ${expiredCount}`);
    } catch (error) {
      console.error('Ошибка проверки подписок:', error);
      await bot.sendMessage(chatId, '❌ Ошибка проверки подписок.');
    }
  });

  // Рассылка сообщений
  // Тестовая активация подписки для пользователя (только для тестирования)
  bot.onText(/\/admin_activate_test (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const targetTelegramId = parseInt(match[1]);
    
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    try {
      console.log(`Attempting to activate test subscription for user: ${targetTelegramId}`);
      
      // Находим пользователя
      const user = await getUserByTelegramId(targetTelegramId);
      if (!user) {
        await bot.sendMessage(chatId, '❌ Пользователь не найден.');
        return;
      }
      
      console.log(`Found user in database:`, user);
      
      // Создаем тестовую подписку напрямую
      const testPaymentId = `test_${Date.now()}_${targetTelegramId}`;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // +1 месяц
      
      // Генерируем токен доступа
      const crypto = await import('crypto');
      const timestamp = Date.now();
      const data = `${user.id}-${testPaymentId}-${timestamp}-${process.env.YOOKASSA_SECRET_KEY}`;
      const accessToken = crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
      
      console.log(`Creating test subscription with payment_id: ${testPaymentId}`);
      
      // Вставляем тестовую подписку напрямую
      const { createSubscription, activateSubscription } = await import('../services/database.js');
      const subscriptionId = await createSubscription(user.id, 'monthly', 999, testPaymentId);
      
      console.log(`Test subscription created with ID: ${subscriptionId}`);
      
      // Активируем подписку
      const activated = await activateSubscription(testPaymentId);
      console.log(`Subscription activation result: ${activated}`);
      
      if (activated) {
        await bot.sendMessage(chatId, `✅ Тестовая подписка активирована для пользователя ${targetTelegramId}\nSubscription ID: ${subscriptionId}`);
        
        // Уведомляем пользователя
        try {
          await bot.sendMessage(targetTelegramId, 
            '🎉 Ваша тестовая подписка активирована!\n\n' +
            'Теперь вы можете пользоваться всеми функциями ИИ-тренера!\n\n' +
            '💬 Просто напишите любой вопрос о фитнесе!'
          );
        } catch (notifyError) {
          console.log('Не удалось уведомить пользователя:', notifyError.message);
        }
      } else {
        await bot.sendMessage(chatId, `❌ Подписка создана но не активирована. ID: ${subscriptionId}`);
      }
      
    } catch (error) {
      console.error('Ошибка активации тестовой подписки:', error);
      await bot.sendMessage(chatId, `❌ Ошибка активации тестовой подписки: ${error.message}`);
    }
  });

  // Рассылка сообщений
  bot.onText(/\/admin_broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const message = match[1];
    
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    // Здесь можно добавить логику рассылки всем пользователям
    await bot.sendMessage(chatId, '⚠️ Функция рассылки не реализована.');
  });

  // Тестирование Coze API (только для администратора)
  bot.onText(/\/admin_test_coze(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const testMessage = match ? match[1] : 'Привет! Ты работаешь?';
    
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    try {
      await bot.sendMessage(chatId, '🔄 Тестируем подключение к Coze...');
      
      const isConnected = await checkCozeConnection();
      if (!isConnected) {
        await bot.sendMessage(chatId, 
          '❌ Coze API недоступен.\n\n' +
          '🔧 Проверьте:\n' +
          '• COZE_API_KEY в .env файле\n' +
          '• COZE_BOT_ID в .env файле\n' +
          '• Интернет соединение'
        );
        return;
      }
      
      const response = await sendMessageToCoze(testMessage, userId);
      
      if (response.success) {
        await bot.sendMessage(chatId, 
          '✅ Coze API работает!\n\n' +
          '🤖 Ответ от ИИ:\n' +
          response.message
        );
      } else {
        await bot.sendMessage(chatId, 
          '⚠️ Coze API подключен, но не смог обработать запрос:\n' +
          response.message
        );
      }
      
    } catch (error) {
      console.error('Ошибка тестирования Coze:', error);
      await bot.sendMessage(chatId, `❌ Ошибка при тестировании Coze: ${error.message}`);
    }
  });

  console.log('✅ Команды администратора настроены');
}
