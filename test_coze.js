// Тест для Coze API v3 интеграции
import dotenv from 'dotenv';
import { runCozeChat } from './src/services/coze_v3.js';

dotenv.config();

console.log('🧪 Тестирование Coze API v3...');

// Проверяем API ключи
console.log('🔑 API Key present:', !!process.env.COZE_API_KEY);
console.log('🤖 Bot ID present:', !!process.env.COZE_BOT_ID);

// Тестовый запрос
const testMessage = "Привет! Это тест интеграции с ИИ. Ответь кратко.";
const testUserId = "test_user_123";
const testAccessToken = process.env.COZE_API_KEY;

try {
  console.log('📤 Отправляем тестовый запрос...');
  const response = await runCozeChat(testAccessToken, testMessage, testUserId, "Отвечай кратко и дружелюбно");
  
  if (response && response.success && response.message) {
    console.log('✅ Coze API v3 работает корректно');
    console.log('📨 Ответ:', response.message.substring(0, 150) + '...');
    console.log('📊 Статус:', response.success ? 'Успешно' : 'Ошибка');
  } else {
    console.log('❌ Проблема с ответом от Coze API');
    console.log('📄 Полный ответ:', JSON.stringify(response, null, 2));
  }
} catch (error) {
  console.error('❌ Ошибка при тестировании Coze API:', error.message);
}
