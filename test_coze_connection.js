// Полный тест подключения к Coze API
import axios from 'axios';

console.log('🔗 ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К COZE API');
console.log('====================================\n');

// Константы из .env
const COZE_API_KEY = 'pat_fAHGFHej2Ek6kUE423HXkuuk7tYJVKjIr1zGS0sKAWddHK9c2qkJP5C30C2VW3mG';
const COZE_BOT_ID = '7428947126656434182';
const COZE_WORKFLOW_ID = '7446536649765609488';

console.log('📋 Текущие настройки:');
console.log(`🔑 API Key: ${COZE_API_KEY.substring(0, 20)}...`);
console.log(`🤖 Bot ID: ${COZE_BOT_ID}`);
console.log(`⚡ Workflow ID: ${COZE_WORKFLOW_ID}\n`);

// Тест 1: Проверка валидности API ключа
async function testApiKeyValidation() {
  console.log('🔍 ТЕСТ 1: ПРОВЕРКА API КЛЮЧА');
  console.log('===========================');
  
  try {
    console.log('🚀 Отправляем запрос для проверки API ключа...');
    
    const response = await axios.get('https://api.coze.com/v1/bots', {
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ API ключ валиден!');
    console.log('📊 Статус ответа:', response.status);
    console.log('📄 Количество ботов:', response.data?.data?.length || 'неизвестно');
    
    if (response.data?.data) {
      console.log('🤖 Доступные боты:');
      response.data.data.slice(0, 3).forEach((bot, index) => {
        console.log(`  ${index + 1}. ${bot.name || bot.id} (ID: ${bot.id})`);
      });
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ Ошибка проверки API ключа:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.status === 401) {
      console.log('\n🚨 Ошибка 401: API ключ недействителен!');
      console.log('💡 Возможные причины:');
      console.log('- Срок действия токена истек');
      console.log('- Токен был отозван или переиздан');
      console.log('- Неправильный формат токена');
    }
    
    return { success: false, error: error.response?.data || error.message };
  }
}

// Тест 2: Проверка чата с ботом
async function testBotChat() {
  console.log('\n💬 ТЕСТ 2: ПРОВЕРКА ЧАТА С БОТОМ');
  console.log('==============================');
  
  try {
    console.log('🚀 Отправляем тестовое сообщение боту...');
    
    const chatData = {
      bot_id: COZE_BOT_ID,
      user_id: '999999999',
      query: 'Привет! Это тест подключения.',
      stream: false
    };
    
    console.log('📤 Данные запроса:', JSON.stringify(chatData, null, 2));
    
    const response = await axios.post('https://api.coze.com/v3/chat', chatData, {
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Чат с ботом работает!');
    console.log('📊 Статус ответа:', response.status);
    console.log('💬 ID диалога:', response.data?.data?.id);
    console.log('📝 Статус чата:', response.data?.data?.status);
    
    if (response.data?.data?.messages) {
      console.log('📨 Количество сообщений:', response.data.data.messages.length);
      const lastMessage = response.data.data.messages[response.data.data.messages.length - 1];
      if (lastMessage?.content) {
        console.log('💭 Последний ответ бота:', lastMessage.content.substring(0, 200) + '...');
      }
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ Ошибка чата с ботом:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    return { success: false, error: error.response?.data || error.message };
  }
}

// Тест 3: Проверка доступа к воркфлоу
async function testWorkflowAccess() {
  console.log('\n⚡ ТЕСТ 3: ПРОВЕРКА ДОСТУПА К ВОРКФЛОУ');
  console.log('===================================');
  
  try {
    console.log(`🚀 Проверяем доступ к воркфлоу ID: ${COZE_WORKFLOW_ID}...`);
    
    const workflowData = {
      workflow_id: COZE_WORKFLOW_ID,
      parameters: { test: 'connection' },
      is_async: false
    };
    
    console.log('📤 Данные запроса:', JSON.stringify(workflowData, null, 2));
    
    const response = await axios.post('https://api.coze.com/v1/workflow/run', workflowData, {
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Воркфлоу доступен!');
    console.log('📊 Статус ответа:', response.status);
    console.log('🆔 ID выполнения:', response.data?.data?.execute_id);
    console.log('📈 Статус выполнения:', response.data?.data?.status);
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ Ошибка доступа к воркфлоу:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.status === 404) {
      console.log('\n🚨 Ошибка 404: Воркфлоу не найден!');
      console.log('💡 Возможные причины:');
      console.log('- Неправильный Workflow ID');
      console.log('- Воркфлоу был удален или деактивирован');
      console.log('- Нет прав доступа к воркфлоу');
    }
    
    return { success: false, error: error.response?.data || error.message };
  }
}

// Основная функция тестирования
async function runConnectionTests() {
  console.log('⏱️ Начало тестирования:', new Date().toLocaleString());
  console.log('');
  
  const results = {};
  let successCount = 0;
  
  // Тест 1: API ключ
  results.apiKey = await testApiKeyValidation();
  if (results.apiKey.success) successCount++;
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 2: Чат с ботом
  results.botChat = await testBotChat();
  if (results.botChat.success) successCount++;
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 3: Воркфлоу
  results.workflowAccess = await testWorkflowAccess();
  if (results.workflowAccess.success) successCount++;
  
  // Итоговый отчет
  console.log('\n🎉 ИТОГОВЫЙ ОТЧЕТ ПОДКЛЮЧЕНИЯ');
  console.log('============================');
  console.log(`✅ Успешных тестов: ${successCount}/3`);
  console.log(`⏱️ Время завершения: ${new Date().toLocaleString()}`);
  
  // Детальная статистика
  console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:');
  console.log('- 🔑 API ключ:', results.apiKey.success ? '✅ Валиден' : '❌ Недействителен');
  console.log('- 💬 Чат с ботом:', results.botChat.success ? '✅ Работает' : '❌ Не работает');
  console.log('- ⚡ Воркфлоу:', results.workflowAccess.success ? '✅ Доступен' : '❌ Недоступен');
  
  if (successCount === 3) {
    console.log('\n🏆 ВСЕ КОМПОНЕНТЫ COZE API РАБОТАЮТ!');
  } else if (successCount === 0) {
    console.log('\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Coze API полностью недоступен');
    console.log('💡 Рекомендуется обновить API ключ');
  } else {
    console.log(`\n⚠️ ${3 - successCount} компонентов требуют внимания`);
  }
  
  return results;
}

// Запуск тестов
runConnectionTests().then(() => {
  console.log('\n🏁 Тестирование подключения завершено!');
}).catch(error => {
  console.error('💥 Критическая ошибка тестирования:', error);
});
