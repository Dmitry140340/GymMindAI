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
                    console.log('🔑 Сохранен новый event_id для продолжения:', newEventId);
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
