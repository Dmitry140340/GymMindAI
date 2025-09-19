import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { initDatabase } from './services/database.js';
import { setupBotHandlers } from './bot/handlers.js';
import { setupAdminHandlers } from './bot/admin.js';
import { handlePaymentWebhook } from './services/payment.js';
import { validateAccessToken, updateTokenUsage } from './services/database.js';
import crypto from 'crypto';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для parsing JSON
app.use(express.json());

// Создаем экземпляр бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Инициализация базы данных
await initDatabase();

// Настройка обработчиков бота
setupBotHandlers(bot);
setupAdminHandlers(bot);

// Webhook для уведомлений ЮКассы
app.post('/webhook/payment', async (req, res) => {
  try {
    console.log('🔔 Payment webhook received at:', new Date().toISOString());
    console.log('📨 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    
    // Проверяем подпись (опционально, так как YooKassa не всегда отправляет подпись)
    const signature = req.headers['x-yookassa-signature'];
    if (signature && process.env.YOOKASSA_SECRET_KEY) {
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', process.env.YOOKASSA_SECRET_KEY)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature:', { signature, expectedSignature });
        return res.status(400).json({ error: 'Invalid signature' });
      }
      console.log('✅ Webhook signature validated');
    } else {
      console.log('⚠️ No signature check (signature or secret key missing)');
    }
    
    // Обрабатываем уведомление о платеже
    const result = await handlePaymentWebhook(req.body, bot);
    
    console.log('✅ Webhook processing result:', result);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('❌ Payment webhook error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// API для верификации токенов доступа
app.post('/api/verify-token', async (req, res) => {
  try {
    const { token, telegram_id } = req.body;
    
    if (!token || !telegram_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Токен и Telegram ID обязательны' 
      });
    }
    
    // Проверяем токен
    const subscription = await validateAccessToken(token);
    
    if (!subscription) {
      return res.status(401).json({ 
        success: false, 
        error: 'Недействительный токен или подписка истекла' 
      });
    }
    
    // Проверяем, что токен принадлежит этому пользователю
    if (subscription.telegram_id !== parseInt(telegram_id)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Токен не принадлежит этому пользователю' 
      });
    }
    
    // Обновляем время использования токена
    await updateTokenUsage(token);
    
    res.json({ 
      success: true, 
      user_id: subscription.telegram_id,
      plan_type: subscription.plan_type,
      end_date: subscription.end_date
    });
    
  } catch (error) {
    console.error('Ошибка верификации токена:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Endpoint для проверки здоровья сервера
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GET endpoint для webhook (для диагностики)
app.get('/webhook/payment', (req, res) => {
  res.json({ 
    message: 'Payment webhook endpoint is ready', 
    method: 'Use POST to send payment notifications',
    timestamp: new Date().toISOString(),
    server_ip: req.ip
  });
});

// Обработка ошибок бота
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Telegram bot is active`);
  console.log(`💳 Payment webhook: http://localhost:${PORT}/webhook/payment`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

export { bot, app };
