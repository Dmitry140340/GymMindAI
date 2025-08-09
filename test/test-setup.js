import dotenv from 'dotenv';
import { checkCozeConnection, sendMessageToCoze } from '../src/services/coze.js';
import { initDatabase, createOrUpdateUser } from '../src/services/database.js';

dotenv.config();

async function runTests() {
  console.log('🧪 Запуск тестов...\n');

  // Тест подключения к базе данных
  console.log('1. Тестирование базы данных...');
  try {
    await initDatabase();
    console.log('✅ База данных: OK\n');
  } catch (error) {
    console.error('❌ База данных: FAIL', error.message);
    return;
  }

  // Тест Coze API
  console.log('2. Тестирование Coze API...');
  try {
    const cozeConnected = await checkCozeConnection();
    if (cozeConnected) {
      console.log('✅ Coze API: OK');
      
      // Тестовый запрос к Coze
      const testResponse = await sendMessageToCoze('Привет! Это тестовое сообщение.', 12345);
      if (testResponse.success) {
        console.log('✅ Тестовый запрос к Coze: OK');
        console.log('📝 Ответ:', testResponse.message.substring(0, 100) + '...');
      } else {
        console.log('⚠️ Тестовый запрос к Coze: FAIL');
        console.log('📝 Ошибка:', testResponse.message);
      }
    } else {
      console.log('❌ Coze API: FAIL - не удалось подключиться');
    }
  } catch (error) {
    console.error('❌ Coze API: FAIL', error.message);
  }
  console.log('');

  // Тест создания пользователя
  console.log('3. Тестирование создания пользователя...');
  try {
    const testUser = {
      id: 12345,
      username: 'test_user',
      first_name: 'Test User'
    };
    
    await createOrUpdateUser(testUser);
    console.log('✅ Создание пользователя: OK\n');
  } catch (error) {
    console.error('❌ Создание пользователя: FAIL', error.message);
  }

  // Проверка переменных окружения
  console.log('4. Проверка переменных окружения...');
  const requiredVars = [
    'TELEGRAM_BOT_TOKEN',
    'COZE_API_KEY',
    'COZE_BOT_ID',
    'YOOKASSA_SHOP_ID',
    'YOOKASSA_SECRET_KEY'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName].includes('your_')) {
      console.log(`⚠️ ${varName}: не настроена`);
      allVarsPresent = false;
    } else {
      console.log(`✅ ${varName}: настроена`);
    }
  }

  if (allVarsPresent) {
    console.log('\n🎉 Все тесты пройдены! Бот готов к запуску.');
  } else {
    console.log('\n⚠️ Некоторые переменные окружения не настроены. Проверьте файл .env');
  }
}

runTests().catch(console.error);
