// Тестирование команд ИИ-инструментов
import { handleMessage } from '../bot/handlers.js';

const testUser = {
  id: 659874549,
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User'
};

const testChat = {
  id: 659874549,
  type: 'private'
};

// Мок для бота
const mockBot = {
  sendMessage: (chatId, text, options) => {
    console.log(`📤 Отправка сообщения в чат ${chatId}:`);
    console.log(`📝 Текст: ${text}`);
    if (options) console.log(`⚙️ Опции:`, options);
    return Promise.resolve();
  },
  sendChatAction: (chatId, action) => {
    console.log(`⏳ Действие в чате ${chatId}: ${action}`);
    return Promise.resolve();
  }
};

async function testCommands() {
  console.log('🧪 Тестирование команд ИИ-инструментов\n');
  
  // Тест команды /nutrition_plan
  console.log('1️⃣ Тестируем команду /nutrition_plan');
  try {
    await handleMessage(mockBot, {
      message_id: 1,
      from: testUser,
      chat: testChat,
      date: Math.floor(Date.now() / 1000),
      text: '/nutrition_plan'
    });
    console.log('✅ Команда /nutrition_plan обработана\n');
  } catch (error) {
    console.error('❌ Ошибка при обработке /nutrition_plan:', error.message);
  }
  
  // Тест команды /training_program
  console.log('2️⃣ Тестируем команду /training_program');
  try {
    await handleMessage(mockBot, {
      message_id: 2,
      from: testUser,
      chat: testChat,
      date: Math.floor(Date.now() / 1000),
      text: '/training_program'
    });
    console.log('✅ Команда /training_program обработана\n');
  } catch (error) {
    console.error('❌ Ошибка при обработке /training_program:', error.message);
  }
  
  // Тест кнопки с эмодзи
  console.log('3️⃣ Тестируем кнопку с эмодзи 🥗 /nutrition_plan');
  try {
    await handleMessage(mockBot, {
      message_id: 3,
      from: testUser,
      chat: testChat,
      date: Math.floor(Date.now() / 1000),
      text: '🥗 /nutrition_plan'
    });
    console.log('✅ Кнопка с эмодзи обработана\n');
  } catch (error) {
    console.error('❌ Ошибка при обработке кнопки с эмодзи:', error.message);
  }
}

// Запускаем тесты
testCommands().catch(console.error);
