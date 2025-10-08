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
      console.log('🔄 Интерактивный workflow - используем Workflow Streaming API');
      // Для интерактивных воркфлоу используем Workflow Streaming API
      return await runInteractiveWorkflow(workflowId, parameters);
    } else {
      console.log('⚡ Простой workflow - используем обычный Workflow API');
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
        timeout: 300000
      }
    );

    console.log('📥 Ответ Workflow API - статус:', response.status);
    console.log('📄 Данные ответа:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.code === 0) {
      const rawData = response.data.data;
      console.log('🔍 Сырые данные workflow:', rawData);
      
      // Парсим JSON-строку, если данные пришли как строка
      let parsedData;
      if (typeof rawData === 'string') {
        try {
          parsedData = JSON.parse(rawData);
          console.log('✅ Успешно распарсили JSON:', parsedData);
        } catch (parseError) {
          console.error('❌ Ошибка парсинга JSON:', parseError.message);
          return {
            success: false,
            error: 'Ошибка парсинга ответа workflow'
          };
        }
      } else {
        parsedData = rawData;
      }
      
      // Ищем output в разных полях
      const output = parsedData.output || parsedData.output_final || parsedData.result;
      
      if (output) {
        return {
          success: true,
          data: parsedData,
          response: output  // Изменено с message на response для единообразия
        };
      } else {
        console.log('❌ Не найден output в данных:', Object.keys(parsedData));
        return {
          success: false,
          error: 'Нет данных в ответе workflow',
          response: null
        };
      }
    } else {
      return {
        success: false,
        error: response.data?.msg || 'Неизвестная ошибка workflow',
        response: null
      };
    }

  } catch (error) {
    console.error('❌ Ошибка простого workflow:', error.message);
    if (error.response) {
      console.error('📄 Ответ сервера:', error.response.data);
    }
    return {
      success: false,
      error: `Ошибка workflow: ${error.message}`
    };
  }
}

// Функция для интерактивных воркфлоу (training_program, nutrition_plan)
async function runInteractiveWorkflow(workflowId, parameters) {
  try {
    console.log('🌊 Используем Workflow Streaming API для интерактивного workflow');

    const requestData = {
      workflow_id: workflowId,
      parameters: parameters,
      bot_id: process.env.COZE_BOT_ID
    };

    console.log('📤 Отправляем данные в Coze Workflow Streaming API:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${COZE_API_BASE_URL}/v1/workflow/stream_run`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000,
        responseType: 'stream'
      }
    );

    console.log('📥 Ответ Workflow Streaming API - статус:', response.status);

    return new Promise((resolve, reject) => {
      let resultMessage = '';
      let isDone = false;
      let allChunks = '';
      let interruptEventId = null;

      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        allChunks += chunkStr;
        console.log('🔍 Получен chunk:', chunkStr);

        // Парсим Server-Sent Events формат
        const lines = chunkStr.split('\n');
        let currentEvent = { id: null, event: null, data: null };

        for (const line of lines) {
          if (line.trim() === '') {
            // Пустая строка означает конец события SSE - обрабатываем накопленное событие
            if (currentEvent.event && currentEvent.data) {
              console.log('🔍 Полное SSE событие:', currentEvent);

              try {
                const eventData = JSON.parse(currentEvent.data);
                console.log('📨 Parsed SSE event:', currentEvent.event, eventData);

                if (currentEvent.event === 'Message') {
                  if (eventData.content) {
                    console.log('💬 Получено сообщение:', eventData.content.substring(0, 100) + '...');
                    resultMessage += eventData.content;
                  }
                } else if (currentEvent.event === 'Interrupt') {
                  console.log('⏸️ Workflow требует взаимодействия пользователя');
                  if (eventData.interrupt_data && eventData.interrupt_data.event_id) {
                    interruptEventId = eventData.interrupt_data.event_id;
                    console.log('🔑 Сохранен event_id для продолжения:', interruptEventId);
                  }
                  isDone = true;
                } else if (currentEvent.event === 'Done') {
                  console.log('✅ Workflow завершен');
                  isDone = true;
                } else if (currentEvent.event === 'Error') {
                  console.log('❌ Ошибка workflow:', eventData);
                  reject(new Error(eventData.message || 'Ошибка workflow'));
                  return;
                }
              } catch (parseError) {
                console.log('⚠️ Не удалось распарсить SSE data:', currentEvent.data);
                console.log('⚠️ Ошибка парсинга:', parseError.message);
              }

              // Сбрасываем для следующего события
              currentEvent = { id: null, event: null, data: null };
              continue;
            }
          }

          // Парсим SSE поля
          if (line.startsWith('id:')) {
            currentEvent.id = line.slice(3).trim();
          } else if (line.startsWith('event:')) {
            currentEvent.event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentEvent.data = line.slice(5).trim();
          }
        }

        // Если есть interrupt, завершаем поток досрочно
        if (interruptEventId) {
          console.log('✅ Получен интерактивный контент, завершаем');
          response.data.destroy(); // Прекращаем чтение потока
        }
      });

      response.data.on('end', () => {
        console.log('🔚 Streaming завершен');
        console.log('📊 Итого получено данных:', allChunks.length, 'байт');
        console.log('🔍 Все данные (raw):', JSON.stringify(allChunks));
        console.log('📝 Все данные (строка):', allChunks);
        console.log('💬 Результат:', resultMessage.length, 'символов');
        console.log('✅ isDone:', isDone);
        console.log('✅ Streaming завершен успешно');

        resolve({
          success: true,
          data: { output: resultMessage },
          message: resultMessage || 'Workflow выполнен, но контент пуст',
          isDone: true,
          eventId: interruptEventId,
          isInteractive: !!interruptEventId
        });
      });

      response.data.on('error', (error) => {
        console.error('❌ Ошибка streaming:', error);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Ошибка интерактивного workflow:', error.message);
    if (error.response) {
      console.error('📄 Ответ сервера:', error.response.data);
    }
    return {
      success: false,
      error: `Ошибка workflow: ${error.message}`
    };
  }
}

// Функция для запуска Coze Chat API
export async function runCozeChat(accessToken, message, userId, instructions) {
  try {
    console.log('🚀 Запуск Coze Chat для пользователя:', userId);
    console.log('💬 Сообщение:', message);
    console.log('📋 Инструкции:', instructions);

    if (!process.env.COZE_API_KEY || process.env.COZE_API_KEY.includes('your_')) {
      console.log('⚠️ API ключ не настроен, используем симуляцию');
      return await simulateAIResponse(message, userId);
    }

    if (!process.env.COZE_BOT_ID || process.env.COZE_BOT_ID.includes('your_')) {
      console.log('⚠️ Bot ID не настроен, используем симуляцию');
      return await simulateAIResponse(message, userId);
    }

    const response = await axios.post(
      `${COZE_API_BASE_URL}/v1/chat`,
      {
        bot_id: process.env.COZE_BOT_ID,
        user_id: userId.toString(),
        query: message,
        chat_history: [],
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    console.log('📥 Ответ Coze Chat - статус:', response.status);

    if (response.data && response.data.code === 0) {
      const messages = response.data.data?.messages || [];
      const botMessage = messages.find(msg => msg.role === 'assistant' && msg.type === 'answer');
      
      if (botMessage && botMessage.content) {
        return {
          success: true,
          message: botMessage.content,
          data: botMessage.content
        };
      } else {
        console.log('⚠️ Нет ответа от бота в сообщениях');
        return {
          success: false,
          message: 'Не получен ответ от AI',
          error: 'Не получен ответ от AI'
        };
      }
    } else {
      console.log('❌ Ошибка в ответе Coze:', response.data);
      return {
        success: false,
        message: response.data?.msg || 'Неизвестная ошибка API',
        error: response.data?.msg || 'Неизвестная ошибка API'
      };
    }

  } catch (error) {
    console.error('❌ Ошибка при запросе к Coze Chat:', error.message);
    
    if (error.response) {
      console.error('📄 Детали ошибки:', error.response.data);
      
      if (error.response.status === 401) {
        return {
          success: false,
          error: 'Неверный API ключ'
        };
      } else if (error.response.status === 429) {
        return {
          success: false,
          error: 'Превышен лимит запросов'
        };
      }
    }

  // В случае ошибки используем симуляцию
  console.log('🔄 Переключаемся на симуляцию ответа');
  const sim = await simulateAIResponse(message, userId);
  return { success: true, message: sim.data, data: sim.data };
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
  // В реальной реализации можно хранить conversation_id в базе данных
  return null;
}

// Очистка истории разговора
export function clearConversation(userId) {
  // В реальной реализации можно очистить conversation_id из базы данных
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

// Функция для продолжения интерактивного workflow через Workflow Stream Resume API
export async function continueInteractiveWorkflow(eventId, userResponse, workflowType, userId) {
  try {
    console.log('🔄 Продолжение интерактивного workflow через Workflow Stream Resume API:', { eventId, userResponse, workflowType, userId });

    if (!eventId) {
      throw new Error('Event ID не предоставлен для продолжения workflow');
    }

    // Определяем workflow_id на основе типа
    let workflowId;
    switch (workflowType) {
      case 'nutrition_plan':
        workflowId = process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID;
        break;
      case 'training_program':
        workflowId = process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID;
        break;
      default:
        throw new Error(`Неизвестный тип workflow: ${workflowType}`);
    }

    // Используем правильный Workflow Stream Resume API
    const response = await axios.post(
      `${COZE_API_BASE_URL}/v1/workflow/stream_resume`,
      {
        event_id: eventId,
        resume_data: userResponse,     // Правильный параметр для ответа
        interrupt_type: 2,             // Тип 2 для обычного ответа пользователя
        workflow_id: workflowId,       // ID workflow для валидации
        bot_id: process.env.COZE_BOT_ID // ID бота
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000,
        responseType: 'stream'
      }
    );

    console.log('📥 Ответ Workflow Stream Resume API - статус:', response.status);

    // Обрабатываем streaming ответ от Workflow Resume API
    return new Promise((resolve, reject) => {
      let resultMessage = '';
      let isDone = false;
      let newEventId = null;

      response.data.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        console.log('🔍 Получен resume chunk:', chunkStr);

        // Парсим Server-Sent Events формат
        const lines = chunkStr.split('\n');
        let currentEvent = { id: null, event: null, data: null };

        for (const line of lines) {
          if (line.trim() === '') {
            // Пустая строка означает конец события SSE - обрабатываем накопленное событие
            if (currentEvent.event && currentEvent.data) {
              console.log('🔍 Полное SSE событие (resume):', currentEvent);

              try {
                const eventData = JSON.parse(currentEvent.data);
                console.log('📨 Parsed SSE event (resume):', currentEvent.event, eventData);

                if (currentEvent.event === 'Message') {
                  if (eventData.content) {
                    console.log('💬 Получено сообщение (resume):', eventData.content.substring(0, 100) + '...');
                    
                    // Извлекаем реальный контент из JSON-обертки если нужно
                    let content = eventData.content;
                    if (typeof content === 'string' && content.startsWith('{"output":')) {
                      try {
                        const parsed = JSON.parse(content);
                        content = parsed.output || content;
                      } catch (e) {
                        // Если не получается распарсить, оставляем как есть
                      }
                    }
                    
                    resultMessage += content;
                  }
                } else if (currentEvent.event === 'Interrupt') {
                  console.log('⏸️ Workflow требует дополнительного взаимодействия');
                  if (eventData.interrupt_data && eventData.interrupt_data.event_id) {
                    newEventId = eventData.interrupt_data.event_id;
                    console.log('� Сохранен новый event_id для продолжения:', newEventId);
                  }
                  isDone = false; // Есть еще вопросы
                } else if (currentEvent.event === 'Done') {
                  console.log('✅ Workflow полностью завершен');
                  isDone = true;
                } else if (currentEvent.event === 'Error') {
                  console.log('❌ Ошибка workflow (resume):', eventData);
                  reject(new Error(eventData.error_message || 'Ошибка workflow resume'));
                  return;
                }
              } catch (parseError) {
                console.log('⚠️ Не удалось распарсить SSE data (resume):', currentEvent.data);
                console.log('⚠️ Ошибка парсинга:', parseError.message);
              }

              // Сбрасываем для следующего события
              currentEvent = { id: null, event: null, data: null };
              continue;
            }
          }

          // Парсим SSE поля
          if (line.startsWith('id:')) {
            currentEvent.id = line.slice(3).trim();
          } else if (line.startsWith('event:')) {
            currentEvent.event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentEvent.data = line.slice(5).trim();
          }
        }
      });

      response.data.on('end', () => {
        console.log('🔚 Resume streaming завершен');
        console.log('💬 Результат resume:', resultMessage.length, 'символов');
        console.log('✅ isDone:', isDone);
        console.log('🔑 newEventId:', newEventId);

        resolve({
          success: true,
          message: resultMessage || 'Workflow resume выполнен',
          eventId: newEventId,
          isComplete: isDone
        });
      });

      response.data.on('error', (error) => {
        console.error('❌ Ошибка resume streaming:', error);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Ошибка продолжения интерактивного workflow:', error.message);
    if (error.response) {
      console.error('📄 Ответ сервера (resume):', error.response.data);
    }
    return {
      success: false,
      error: `Ошибка продолжения workflow: ${error.message}`
    };
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
