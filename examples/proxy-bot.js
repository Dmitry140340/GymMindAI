// Пример бота-прокси для интеграции с основным Coze-ботом
// Этот код можно использовать для создания отдельного бота, который будет проверять токены

import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

// Токен ОТДЕЛЬНОГО бота-прокси (не основного!)
const PROXY_BOT_TOKEN = 'your_proxy_bot_token_here';
const VERIFICATION_API_URL = 'https://your-domain.com/api/verify-token';
const MAIN_COZE_BOT_USERNAME = 'your_main_coze_bot_username';

const bot = new TelegramBot(PROXY_BOT_TOKEN, { polling: true });

// Хранилище верифицированных пользователей (в продакшене лучше использовать Redis)
const verifiedUsers = new Map();

// Команда верификации
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const token = match[1].trim();

  try {
    // Проверяем токен через API
    const response = await axios.post(VERIFICATION_API_URL, {
      token: token,
      telegram_id: userId
    });

    if (response.data.success) {
      // Сохраняем верифицированного пользователя
      verifiedUsers.set(userId, {
        verified: true,
        plan_type: response.data.plan_type,
        end_date: response.data.end_date,
        verified_at: new Date()
      });

      await bot.sendMessage(chatId, 
        `✅ Токен верифицирован успешно!\n\n` +
        `💎 План: ${response.data.plan_type === 'monthly' ? 'Месячный' : 'Годовой'}\n` +
        `📅 Действует до: ${new Date(response.data.end_date).toLocaleDateString('ru-RU')}\n\n` +
        `🤖 Теперь вы можете общаться с ИИ-тренером! Задайте любой вопрос.`
      );
    } else {
      await bot.sendMessage(chatId, 
        `❌ Ошибка верификации: ${response.data.error}\n\n` +
        `Убедитесь, что:\n` +
        `• Токен введен правильно\n` +
        `• Подписка не истекла\n` +
        `• Токен принадлежит вашему аккаунту`
      );
    }
  } catch (error) {
    console.error('Ошибка верификации:', error);
    await bot.sendMessage(chatId, 
      '❌ Технический сбой при верификации. Попробуйте позже или обратитесь в поддержку.'
    );
  }
});

// Обработка всех остальных сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Игнорируем команды
  if (text && text.startsWith('/')) {
    if (text === '/start') {
      await bot.sendMessage(chatId,
        `🤖 Добро пожаловать в ИИ-тренер!\n\n` +
        `Для доступа к ИИ отправьте команду:\n` +
        `/verify ваш_токен_доступа\n\n` +
        `💡 Токен можно получить после покупки подписки в основном боте.`
      );
    }
    return;
  }

  // Проверяем, верифицирован ли пользователь
  const userVerification = verifiedUsers.get(userId);
  
  if (!userVerification || !userVerification.verified) {
    await bot.sendMessage(chatId,
      `🔒 Для общения с ИИ необходима верификация.\n\n` +
      `Отправьте команду: /verify ваш_токен`
    );
    return;
  }

  // Проверяем, не истекла ли подписка
  if (new Date(userVerification.end_date) < new Date()) {
    verifiedUsers.delete(userId);
    await bot.sendMessage(chatId,
      `⏰ Ваша подписка истекла.\n\n` +
      `Для продолжения общения с ИИ продлите подписку и получите новый токен.`
    );
    return;
  }

  // Если все проверки пройдены - перенаправляем к основному боту
  await bot.sendMessage(chatId,
    `🤖 Ваш вопрос принят! Переадресовываю к ИИ-тренеру...\n\n` +
    `📱 Для более удобного общения рекомендуем перейти к основному боту: @${MAIN_COZE_BOT_USERNAME}\n\n` +
    `💬 Ваш вопрос: "${text}"\n\n` +
    `⏳ Обрабатываю запрос...`
  );

  // Здесь можно добавить прямую интеграцию с Coze API
  // или просто давать инструкции пользователю
});

console.log('🤖 Бот-прокси запущен и готов к работе!');

export default bot;
