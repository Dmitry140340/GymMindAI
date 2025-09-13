import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const COZE_API_BASE_URL = 'https://api.coze.com';

// Основная функция для запуска workflow
export async function runWorkflow(workflowId, parameters) {
  try {
    console.log('🚀 Запуск workflow:', { workflowId, parameters });
    console.log('🔑 API Key присутствует:', !!process.env.COZE_API_KEY);

    // Определяем тип воркфлоу по ID
    const interactiveWorkflows = [
      process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID,
      process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID
    ];
    
    const isInteractive = interactiveWorkflows.includes(workflowId);
    
    if (isInteractive) {
      console.log('🔄 Интерактивный workflow - используем Chatflow API');
      // Для интерактивных воркфлоу используем Chatflow API
      return await runInteractiveWorkflow(workflowId, parameters);
    } else {
      console.log('⚡ Простой workflow - используем Workflow API');
      // Для простых воркфлоу используем стандартный Workflow API
      return await runSimpleWorkflow(workflowId, parameters);
    }
  } catch (error) {
    console.error('❌ Ошибка при определении типа workflow:', error.message);
    return {
      success: false,
      error: `Ошибка workflow: ${error.message}`
    };
  }
}

// Функция для простых воркфлоу (deepresearch, composition_analysis)
async function runSimpleWorkflow(workflowId, parameters) {
  try {
    console.log('🌐 API URL:', `${COZE_API_BASE_URL}/v1/workflow/run`);

    const requestData = {
      workflow_id: workflowId,
      parameters: parameters,
      is_async: false
    };

    console.log('📤 Отправляем данные в Coze Workflow API:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${COZE_API_BASE_URL}/v1/workflow/run`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут таймаут
      }
    );

    console.log('📥 Ответ workflow API:', {
      status: response.status,
      code: response.data?.code,
      data: response.data
    });

    if (response.data && response.data.code === 0) {
      let workflowData = response.data.data;
      let resultMessage = null;
      
      console.log('🔍 Исходные данные workflow:', typeof workflowData, workflowData);
      
      // Если data это строка JSON, парсим её
      if (typeof workflowData === 'string') {
        try {
          workflowData = JSON.parse(workflowData);
          console.log('📋 Распарсенные данные workflow:', workflowData);
        } catch (e) {
          console.log('⚠️ Не удалось распарсить JSON данные workflow:', e.message);
        }
      }
      
      // Ищем результат в разных возможных полях
      if (workflowData?.output_final) {
        resultMessage = workflowData.output_final;
        console.log('✅ Найден output_final:', resultMessage.substring(0, 100) + '...');
      } else if (workflowData?.output) {
        resultMessage = workflowData.output;
        console.log('✅ Найден output:', resultMessage.substring(0, 100) + '...');
      } else if (workflowData?.result) {
        resultMessage = workflowData.result;
      } else if (workflowData?.answer) {
        resultMessage = workflowData.answer;
      } else if (typeof workflowData === 'string') {
        resultMessage = workflowData;
      }
      
      console.log('✅ Извлеченный результат workflow:', resultMessage ? 'Найден' : 'Не найден');
      
      return {
        success: true,
        data: response.data.data,
        message: resultMessage || 'Workflow выполнен успешно'
      };
    } else {
      console.log('❌ Ошибка workflow:', response.data);
      return {
        success: false,
        error: response.data?.msg || 'Неизвестная ошибка workflow'
      };
    }
  } catch (error) {
    console.error('❌ Ошибка при запуске простого workflow:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    return {
      success: false,
      error: `Ошибка workflow: ${error.response?.data?.msg || error.message}`
    };
  }
}

// Функция для интерактивных воркфлоу (training_program, nutrition_plan) - использует Chatflow API
async function runInteractiveWorkflow(workflowId, parameters) {
  try {
    console.log('🔄 Используем Chatflow API для интерактивного workflow');
    
    const userInput = parameters.input;
    console.log('📝 Параметры для Chatflow API:', userInput);
    
    const chatflowData = {
      workflow_id: workflowId,
      bot_id: process.env.COZE_BOT_ID,
      additional_messages: [
        {
          role: 'user',
          content: userInput,
          content_type: 'text'
        }
      ]
    };

    console.log('📤 Отправляем данные в Coze Chatflow API:', JSON.stringify(chatflowData, null, 2));

    const response = await axios.post(
      `${COZE_API_BASE_URL}/v1/workflows/chat`,
      chatflowData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        timeout: 300000, // 5 минут таймаут
        responseType: 'stream'
      }
    );

    console.log('📥 Начало получения streaming ответа от Chatflow API');

    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let isCompleted = false;
      
      response.data.on('data', (chunk) => {
        const chunkString = chunk.toString();
        const lines = chunkString.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          try {
            const data = line.slice(6).trim(); // Убираем "data: "
            
            if (data === '[DONE]') {
              console.log('✅ Chatflow завершен');
              isCompleted = true;
              resolve({
                success: true,
                data: { content: fullResponse },
                message: fullResponse || 'Интерактивный workflow выполнен успешно'
              });
              return;
            }
            
            const eventData = JSON.parse(data);
            console.log('📨 Событие Chatflow:', eventData.event);
            
            // Собираем текст ответа из событий
            if (eventData.event === 'conversation.message.delta' && eventData.data?.content) {
              fullResponse += eventData.data.content;
            } else if (eventData.event === 'conversation.message.completed' && eventData.data?.content) {
              fullResponse = eventData.data.content;
            } else if (eventData.event === 'done') {
              console.log('✅ Получено событие done');
              isCompleted = true;
              resolve({
                success: true,
                data: { content: fullResponse },
                message: fullResponse || 'Интерактивный workflow выполнен успешно'
              });
              return;
            }
            
          } catch (parseError) {
            console.log('⚠️ Ошибка парсинга события:', parseError.message, 'Данные:', line);
          }
        }
      });
      
      response.data.on('end', () => {
        console.log('✅ Поток завершен');
        if (!isCompleted) {
          resolve({
            success: true,
            data: { content: fullResponse },
            message: fullResponse || 'Интерактивный workflow выполнен успешно'
          });
        }
      });
      
      response.data.on('error', (streamError) => {
        console.error('❌ Ошибка потока:', streamError);
        reject({
          success: false,
          error: `Ошибка потока: ${streamError.message}`
        });
      });
      
      // Таймаут для предотвращения зависания
      setTimeout(() => {
        if (!isCompleted) {
          console.log('⏰ Таймаут Chatflow');
          resolve({
            success: true,
            data: { content: fullResponse },
            message: fullResponse || 'Интерактивный workflow выполнен (таймаут)'
          });
        }
      }, 120000); // 2 минуты
    });

  } catch (error) {
    console.error('❌ Ошибка при запуске интерактивного workflow:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    return {
      success: false,
      error: `Ошибка интерактивного workflow: ${error.response?.data?.msg || error.message}`
    };
  }
}

// Отправка сообщения в Coze AI через Chat API
export async function sendMessageToCoze(message, userId, conversationId = null) {
  try {
    // Если есть API ключ - используем прямую интеграцию через chat API
    if (process.env.COZE_API_KEY && process.env.COZE_BOT_ID && 
        !process.env.COZE_API_KEY.includes('your_')) {
      
      console.log('🤖 Отправляем запрос к Coze Chat API:', {
        botId: process.env.COZE_BOT_ID,
        message: message.substring(0, 50) + '...',
        userId
      });

      const chatData = {
        bot_id: process.env.COZE_BOT_ID,
        user_id: userId.toString(),
        stream: false,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: message,
            content_type: 'text'
          }
        ]
      };

      if (conversationId) {
        chatData.conversation_id = conversationId;
      }

      const response = await axios.post(
        `${COZE_API_BASE_URL}/v3/chat`,
        chatData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 минуты таймаут
        }
      );

      if (response.data && response.data.code === 0) {
        const chatResponse = response.data.data;
        
        // Извлекаем сообщения от ассистента
        if (chatResponse?.messages && Array.isArray(chatResponse.messages)) {
          const assistantMessages = chatResponse.messages.filter(msg => msg.role === 'assistant');
          
          if (assistantMessages.length > 0) {
            const fullMessage = assistantMessages
              .map(msg => msg.content || '')
              .join('\n\n')
              .trim();
            
            return {
              success: true,
              data: fullMessage,
              conversationId: chatResponse.conversation_id
            };
          }
        }
        
        return {
          success: false,
          error: 'Не получен ответ от ассистента'
        };
      } else {
        return {
          success: false,
          error: response.data?.msg || 'Ошибка API'
        };
      }
    } else {
      // Возвращаем симуляцию ответа
      return await simulateAIResponse(message, userId);
    }
  } catch (error) {
    console.error('Error calling Coze API:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    
    // В случае ошибки API возвращаем симуляцию
    return await simulateAIResponse(message, userId);
  }
}

// Симуляция ответа AI (резервный вариант)
async function simulateAIResponse(message, userId) {
  const responses = [
    "Спасибо за ваш вопрос! Я обрабатываю информацию и скоро дам подробный ответ.",
    "Интересный вопрос! Дайте мне немного времени для анализа.",
    "Я анализирую вашу ситуацию и готовлю персональные рекомендации.",
    "Отличный запрос! Сейчас подготовлю для вас детальный план.",
    "Понял вашу задачу! Работаю над оптимальным решением."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    success: true,
    data: randomResponse + "\n\n⚠️ *Сейчас используется демо-режим. Для получения полноценных AI-ответов требуется настройка API.*"
  };
}

// Получение ID разговора
export function getConversationId(userId) {
  return null;
}

// Очистка истории разговора
export function clearConversation(userId) {
  return true;
}

// Проверка подключения к Coze
export async function checkCozeConnection() {
  try {
    if (!process.env.COZE_API_KEY || process.env.COZE_API_KEY.includes('your_')) {
      return { success: false, error: 'API ключ не настроен' };
    }

    const response = await axios.get(`${COZE_API_BASE_URL}/v1/bots`, {
      headers: {
        'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return { success: response.status === 200 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Получение инструкций от Coze
export async function getCozeInstructions() {
  return "Я ваш персональный фитнес-тренер и диетолог. Задавайте любые вопросы о тренировках, питании и здоровом образе жизни!";
}

export async function resetUserConversation(accessToken, userId) {
  return clearConversation(userId);
}

export async function runCozeWorkflow(workflowId, parameters, userId) {
  return await runWorkflow(workflowId, parameters);
}
