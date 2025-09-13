import { getStats, checkExpiredSubscriptions, activateSubscription, getUserByTelegramId } from '../services/database.js';
import { checkCozeConnection, runCozeChat } from '../services/coze.js';
import fs from 'fs';

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
      
      const response = await runCozeChat('test_token', testMessage, userId, 'Тестовое сообщение');
      
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

  // Переключение платежного режима (только для администратора)
  bot.onText(/\/admin_payment_mode (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const mode = match[1];
    
    // Проверяем, является ли пользователь администратором
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    if (mode !== 'test' && mode !== 'production') {
      await bot.sendMessage(chatId, 
        '❌ Неверный режим. Используйте:\n' +
        '• `/admin_payment_mode test` - тестовый режим\n' +
        '• `/admin_payment_mode production` - продакшн режим'
      );
      return;
    }
    
    try {
      // Обновляем переменную окружения
      process.env.PAYMENT_MODE = mode;
      
      // Переинициализируем платежную систему
      const envContent = fs.readFileSync('.env', 'utf8');
      const updatedContent = envContent.replace(
        /PAYMENT_MODE=.*/,
        `PAYMENT_MODE=${mode}`
      );
      fs.writeFileSync('.env', updatedContent);
      
      // Обновляем текущие переменные
      if (mode === 'production') {
        process.env.YOOKASSA_SHOP_ID = process.env.YOOKASSA_PROD_SHOP_ID;
        process.env.YOOKASSA_SECRET_KEY = process.env.YOOKASSA_PROD_SECRET_KEY;
      } else {
        process.env.YOOKASSA_SHOP_ID = process.env.YOOKASSA_TEST_SHOP_ID;
        process.env.YOOKASSA_SECRET_KEY = process.env.YOOKASSA_TEST_SECRET_KEY;
      }
      
      const modeEmoji = mode === 'production' ? '💳' : '🧪';
      const modeText = mode === 'production' ? 'ПРОДАКШН' : 'ТЕСТОВЫЙ';
      
      await bot.sendMessage(chatId, 
        `${modeEmoji} Платежный режим изменен на: **${modeText}**\n\n` +
        `🏪 Shop ID: ${process.env.YOOKASSA_SHOP_ID}\n` +
        `${mode === 'production' ? '⚠️ ВНИМАНИЕ: Включены реальные платежи!' : '✅ Тестовый режим - реальные деньги не списываются'}`
      );
      
      console.log(`💳 Админ ${userId} изменил платежный режим на: ${mode}`);
      
    } catch (error) {
      console.error('Ошибка изменения платежного режима:', error);
      await bot.sendMessage(chatId, `❌ Ошибка изменения режима: ${error.message}`);
    }
  });

  // Проверка текущего платежного режима
  bot.onText(/\/admin_payment_status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Проверяем, является ли пользователь администратором
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id)) : [];
    
    if (!adminIds.includes(userId)) {
      await bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
      return;
    }
    
    const mode = process.env.PAYMENT_MODE || 'test';
    const modeEmoji = mode === 'production' ? '💳' : '🧪';
    const modeText = mode === 'production' ? 'ПРОДАКШН' : 'ТЕСТОВЫЙ';
    
    await bot.sendMessage(chatId, 
      `${modeEmoji} **Текущий платежный режим: ${modeText}**\n\n` +
      `🏪 Shop ID: ${process.env.YOOKASSA_SHOP_ID}\n` +
      `🔑 Secret Key: ${process.env.YOOKASSA_SECRET_KEY ? '***скрыт***' : 'НЕ УСТАНОВЛЕН'}\n\n` +
      `${mode === 'production' ? '⚠️ Реальные платежи включены!' : '✅ Тестовый режим активен'}\n\n` +
      `🔄 Для изменения используйте:\n` +
      `• \`/admin_payment_mode test\`\n` +
      `• \`/admin_payment_mode production\``
    );
  });

  console.log('✅ Команды администратора настроены');
}
