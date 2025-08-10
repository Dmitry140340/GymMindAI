import axios from 'axios';

const COZE_API_BASE_URL = 'https://api.coze.com';

// Храним conversation_id для каждого пользователя
const userConversations = new Map();

// Функция для сброса диалога пользователя
export function resetUserConversation(userId) {
  userConversations.delete(userId.toString());
  console.log(`🔄 Сброшен диалог для пользователя ${userId}`);
}

// Функция для получения текущего conversation_id пользователя
export function getUserConversationId(userId) {
  return userConversations.get(userId.toString());
}

// Отправка сообщения в Coze AI (полная интеграция)
export async function sendMessageToCoze(message, userId, conversationId = null) {
  try {
    // Если есть API ключ - используем прямую интеграцию
    if (process.env.COZE_API_KEY && process.env.COZE_BOT_ID && 
        !process.env.COZE_API_KEY.includes('your_')) {
      
      // Получаем сохраненный conversation_id для пользователя
      const savedConversationId = userConversations.get(userId.toString()) || conversationId;
      
      console.log('🤖 Отправляем запрос к Coze API v3:', {
        botId: process.env.COZE_BOT_ID,
        message: message.substring(0, 50) + '...',
        userId,
        conversationId: savedConversationId
      });
      
      const requestData = {
        bot_id: process.env.COZE_BOT_ID,
        user_id: userId.toString(),
        stream: false,
        auto_save_history: true,
        additional_messages: [
          {
            role: "user",
            content: message,
            content_type: "text"
          }
        ]
      };
      
      // Формируем URL с conversation_id в query string (если есть)
      let apiUrl = `${COZE_API_BASE_URL}/v3/chat`;
      if (savedConversationId) {
        apiUrl += `?conversation_id=${savedConversationId}`;
        console.log('🔄 Продолжаем диалог с conversation_id в URL:', savedConversationId);
      } else {
        console.log('🆕 Начинаем новый диалог');
      }
      
      const response = await axios.post(
        apiUrl,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 минут таймаут
        }
      );

      console.log('✅ Coze API v3 ответ получен:', {
        status: response.status,
        data: response.data
      });

      // Обработка ответа согласно новому API
      if (response.data && response.data.code === 0) {
        const chatData = response.data.data;
        
        // Сохраняем conversation_id для нового диалога
        if (!savedConversationId && chatData?.conversation_id) {
          userConversations.set(userId.toString(), chatData.conversation_id);
          console.log('💾 Сохранен первоначальный conversation_id:', chatData.conversation_id);
        }
        
        // Если статус "in_progress", нужно дождаться завершения
        if (chatData?.status === 'in_progress') {
          console.log('⏳ Запрос обрабатывается, ожидаем результат...');
          
          // Ждем завершения обработки (максимум 5 минут)
          const chatId = chatData.id;
          const conversationId = chatData.conversation_id;
          
          for (let attempt = 0; attempt < 150; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
            
            // Логируем прогресс каждые 30 секунд
            if (attempt % 15 === 0 && attempt > 0) {
              console.log(`⏳ Ожидание ответа от Coze... ${attempt * 2} секунд из 300`);
            }
            
            try {
              const resultResponse = await axios.get(
                `${COZE_API_BASE_URL}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 60000 // 1 минута таймаут для проверки статуса
                }
              );
              
              if (resultResponse.data?.code === 0) {
                const resultData = resultResponse.data.data;
                console.log('📥 Статус чата:', resultData?.status);
                
                if (resultData?.status === 'completed') {
                  // Получаем сообщения
                  const messagesResponse = await axios.get(
                    `${COZE_API_BASE_URL}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
                        'Content-Type': 'application/json'
                      },
                      timeout: 60000 // 1 минута таймаут для получения сообщений
                    }
                  );
                  
                  if (messagesResponse.data?.code === 0) {
                    const messages = messagesResponse.data.data || [];
                    const assistantMessage = messages.find(
                      msg => msg.role === 'assistant' && msg.type === 'answer'
                    );
                    
                    if (assistantMessage && assistantMessage.content) {
                      // Сохраняем conversation_id только если его еще нет (первый запрос)
                      if (!savedConversationId) {
                        userConversations.set(userId.toString(), conversationId);
                        console.log('💾 Сохранен новый conversation_id:', conversationId);
                      } else {
                        console.log('🔒 Оставляем существующий conversation_id:', savedConversationId);
                      }
                      
                      return {
                        success: true,
                        message: assistantMessage.content,
                        conversationId: savedConversationId || conversationId
                      };
                    }
                  }
                  
                  break; // Завершили обработку
                } else if (resultData?.status === 'requires_action') {
                  console.log('🔧 Требуется действие пользователя, получаем детали...');
                  
                  // Получаем информацию о требуемых действиях
                  try {
                    const actionsResponse = await axios.get(
                      `${COZE_API_BASE_URL}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
                      {
                        headers: {
                          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
                          'Content-Type': 'application/json'
                        },
                        timeout: 60000
                      }
                    );
                    
                    if (actionsResponse.data?.code === 0) {
                      const messages = actionsResponse.data.data || [];
                      
                      // Ищем сообщения с tool_calls или требованиями действий
                      const toolCallMessages = messages.filter(
                        msg => msg.type === 'tool_call' || msg.type === 'function_call'
                      );
                      
                      console.log('🛠️ Найдено вызовов функций:', toolCallMessages.length);
                      
                      // Логируем детали каждого tool call
                      toolCallMessages.forEach((msg, index) => {
                        console.log(`🔧 Tool Call ${index + 1}:`, {
                          id: msg.id,
                          type: msg.type,
                          content: msg.content,
                          tool_calls: msg.tool_calls
                        });
                      });
                      
                      // Попытаемся получить tool calls из content или напрямую
                      let allToolCalls = [];
                      
                      toolCallMessages.forEach(msg => {
                        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
                          allToolCalls = allToolCalls.concat(msg.tool_calls);
                        } else if (msg.content && typeof msg.content === 'string') {
                          try {
                            const parsed = JSON.parse(msg.content);
                            if (parsed.tool_calls) {
                              allToolCalls = allToolCalls.concat(parsed.tool_calls);
                            }
                          } catch (e) {
                            // Игнорируем ошибки парсинга
                          }
                        }
                      });
                      
                      console.log('🎯 Всего tool calls для обработки:', allToolCalls.length);
                      
                      if (allToolCalls.length > 0) {
                        // Формируем tool outputs правильно
                        const toolOutputs = allToolCalls.map(toolCall => ({
                          tool_call_id: toolCall.id,
                          output: "Действие подтверждено пользователем"
                        }));
                        
                        console.log('📤 Отправляем tool outputs:', toolOutputs);
                        
                        const confirmResponse = await axios.post(
                          `${COZE_API_BASE_URL}/v3/chat/submit_tool_outputs`,
                          {
                            chat_id: chatId,
                            conversation_id: conversationId,
                            tool_outputs: toolOutputs
                          },
                          {
                            headers: {
                              'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
                              'Content-Type': 'application/json'
                            },
                            timeout: 60000
                          }
                        );
                        
                        console.log('📥 Ответ на submit_tool_outputs:', {
                          status: confirmResponse.status,
                          data: confirmResponse.data
                        });
                        
                        if (confirmResponse.data?.code === 0) {
                          console.log('✅ Все действия подтверждены, продолжаем ожидание...');
                          // Продолжаем цикл ожидания - НЕ делаем break
                        } else {
                          console.log('❌ Ошибка при подтверждении:', confirmResponse.data);
                          // Также продолжаем ожидание, возможно статус изменится
                        }
                      } else {
                        console.log('⚠️ Не найдены tool calls для подтверждения');
                        
                        // Попробуем альтернативный подход - просто продолжить без подтверждения
                        console.log('🔄 Пробуем продолжить без подтверждения...');
                      }
                      
                      // Проверим, есть ли уже готовый ответ, несмотря на requires_action
                      const assistantMessage = messages.find(
                        msg => msg.role === 'assistant' && msg.type === 'answer' && msg.content
                      );
                      
                      if (assistantMessage && assistantMessage.content) {
                        console.log('🎉 Найден готовый ответ несмотря на requires_action');
                        // Сохраняем conversation_id только если его еще нет
                        if (!savedConversationId) {
                          userConversations.set(userId.toString(), conversationId);
                          console.log('💾 Сохранен новый conversation_id для requires_action:', conversationId);
                        }
                        
                        return {
                          success: true,
                          message: assistantMessage.content,
                          conversationId: savedConversationId || conversationId
                        };
                      }
                    }
                  } catch (confirmError) {
                    console.log('⚠️ Ошибка при обработке требуемых действий:', confirmError.message);
                  }
                } else if (resultData?.status === 'failed') {
                  console.log('❌ Обработка чата завершилась с ошибкой');
                  console.log('🔍 Детали ошибки:', JSON.stringify(resultData, null, 2));
                  console.log('🔍 Полный ответ API:', JSON.stringify(resultResponse.data, null, 2));
                  
                  // Если ошибка связана с балансом токенов (код 4011) или другими критическими ошибками - используем fallback
                  if (resultData?.last_error?.code === 4011) {
                    console.log('💰 Недостаточный баланс CozeToken. Переключаемся на имитацию ИИ');
                    return await simulateAIResponse(message, userId);
                  }
                  
                  console.log('⚠️ Критическая ошибка Coze API. Переключаемся на имитацию ИИ');
                  return await simulateAIResponse(message, userId);
                }
              }
            } catch (pollError) {
              console.log('⚠️ Ошибка при проверке статуса:', pollError.message);
            }
          }
          
          // Если после всех попыток ответ не получен - используем fallback
          console.log('⚠️ Coze API не ответил или завершился с ошибкой. Переключаемся на имитацию ИИ');
          return await simulateAIResponse(message, userId);
        } else {
          // Если статус не "in_progress", обрабатываем как обычно
          const messages = response.data.data?.messages || [];
          const assistantMessage = messages.find(
            msg => msg.role === 'assistant' && msg.type === 'answer'
          );
          
          if (assistantMessage) {
            // Сохраняем conversation_id только если его еще нет
            const finalConversationId = response.data.data?.conversation_id || savedConversationId;
            if (!savedConversationId) {
              userConversations.set(userId.toString(), finalConversationId);
              console.log('💾 Сохранен новый conversation_id (прямой ответ):', finalConversationId);
            }
            
            return {
              success: true,
              message: assistantMessage.content,
              conversationId: savedConversationId || finalConversationId
            };
          }
          
          // Если нет assistant сообщения, но есть другие сообщения
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            return {
              success: true,
              message: lastMessage.content || 'Получен ответ от ИИ',
              conversationId: response.data.data?.conversation_id || conversationId
            };
          }
        }
      }

      // Если бот не опубликован (код 4015) или другие ошибки - переключаемся на fallback
      if (response.data && response.data.code !== 0) {
        console.log('⚠️ Coze API ошибка:', response.data.msg);
        console.log('🔄 Переключаемся на имитацию ИИ');
        return await simulateAIResponse(message, userId);
      }

      return {
        success: false,
        message: 'Извините, не удалось получить ответ от ИИ. Попробуйте ещё раз.',
        conversationId: null
      };
    }
    
    console.log('⚠️ Coze API не настроен, используем имитацию');
    // Если нет API ключа - используем имитацию умного ИИ
    return await simulateAIResponse(message, userId);

  } catch (error) {
    console.error('❌ Ошибка при обращении к Coze API v3:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Fallback на имитацию
    console.log('🔄 Переключаемся на имитацию ИИ');
    return await simulateAIResponse(message, userId);
  }
}

// Имитация ответов ИИ-тренера (пока нет API)
async function simulateAIResponse(message, userId) {
  const lowerMessage = message.toLowerCase();
  
  let response = '';
  
  if (lowerMessage.includes('программа') || lowerMessage.includes('тренировк')) {
    response = `🏋️‍♂️ **Персональная программа тренировок**\n\n` +
               `На основе вашего запроса рекомендую:\n\n` +
               `**День 1 - Верх тела:**\n` +
               `• Отжимания: 3x10-15\n` +
               `• Подтягивания: 3x5-10\n` +
               `• Планка: 3x30-60 сек\n\n` +
               `**День 2 - Низ тела:**\n` +
               `• Приседания: 3x15-20\n` +
               `• Выпады: 3x10 на каждую ногу\n` +
               `• Подъемы на носки: 3x15\n\n` +
               `**День 3 - Кардио:**\n` +
               `• Бег/ходьба: 20-30 минут\n` +
               `• Берпи: 3x5-10\n\n` +
               `💡 *Начинайте с меньших нагрузок и постепенно увеличивайте!*`;
               
  } else if (lowerMessage.includes('питание') || lowerMessage.includes('диета') || lowerMessage.includes('еда')) {
    response = `🥗 **Советы по питанию**\n\n` +
               `Основные принципы здорового питания:\n\n` +
               `**Завтрак (7:00-9:00):**\n` +
               `• Овсянка + фрукты + орехи\n` +
               `• Или: яйца + овощи + цельнозерновой хлеб\n\n` +
               `**Обед (12:00-14:00):**\n` +
               `• Белок (курица, рыба, бобовые)\n` +
               `• Сложные углеводы (рис, гречка)\n` +
               `• Овощи\n\n` +
               `**Ужин (18:00-20:00):**\n` +
               `• Легкий белок (рыба, творог)\n` +
               `• Овощи\n` +
               `• Минимум углеводов\n\n` +
               `💧 **Вода:** 30-35 мл на кг веса\n` +
               `🚫 **Избегайте:** фастфуд, сладкое, жареное`;
               
  } else if (lowerMessage.includes('похудеть') || lowerMessage.includes('вес')) {
    response = `⚖️ **План по снижению веса**\n\n` +
               `Ключевые принципы:\n\n` +
               `� **Дефицит калорий:**\n` +
               `• Тратьте больше, чем потребляете\n` +
               `• Дефицит: 300-500 ккал в день\n\n` +
               `🏃‍♀️ **Кардио:**\n` +
               `• 150 минут в неделю умеренной активности\n` +
               `• Или 75 минут интенсивной\n\n` +
               `💪 **Силовые тренировки:**\n` +
               `• 2-3 раза в неделю\n` +
               `• Сохраняют мышечную массу\n\n` +
               `📊 **Отслеживание:**\n` +
               `• Взвешивайтесь 1 раз в неделю\n` +
               `• Делайте фото прогресса\n` +
               `• Измеряйте объемы\n\n` +
               `⏰ **Терпение:** результат через 2-4 недели`;
               
  } else if (lowerMessage.includes('мышц') || lowerMessage.includes('масса') || lowerMessage.includes('накачать')) {
    response = `💪 **Набор мышечной массы**\n\n` +
               `План действий:\n\n` +
               `🍖 **Питание:**\n` +
               `• Профицит калорий: +300-500 ккал\n` +
               `• Белок: 1.6-2.2г на кг веса\n` +
               `• Углеводы: 4-7г на кг веса\n` +
               `• Жиры: 0.8-1.2г на кг веса\n\n` +
               `🏋️ **Тренировки:**\n` +
               `• 3-4 раза в неделю\n` +
               `• Базовые упражнения (приседания, жим, тяга)\n` +
               `• Прогрессия нагрузок\n` +
               `• 6-12 повторений\n\n` +
               `😴 **Восстановление:**\n` +
               `• Сон: 7-9 часов\n` +
               `• Отдых между тренировками: 48-72 часа\n\n` +
               `📈 **Результат:** видимые изменения через 4-6 недель`;
               
  } else {
    response = `🤖 **Здравствуйте! Я ваш ИИ-тренер**\n\n` +
               `Я помогу вам с:\n\n` +
               `🏋️‍♂️ **Тренировками:**\n` +
               `• Составление программ\n` +
               `• Техника упражнений\n` +
               `• Планирование нагрузок\n\n` +
               `🥗 **Питанием:**\n` +
               `• Планы питания\n` +
               `• Расчет калорий\n` +
               `• Рецепты\n\n` +
               `📊 **Целями:**\n` +
               `• Похудение\n` +
               `• Набор массы\n` +
               `• Поддержание формы\n\n` +
               `💡 Задайте мне любой вопрос о фитнесе!\n\n` +
               `*Примеры: "составь программу тренировок", "как правильно питаться", "хочу похудеть"*`;
  }
  
  return {
    success: true,
    message: response,
    conversationId: null
  };
}

// Функция для получения инструкций доступа (теперь не нужна)
export async function getCozeInstructions(accessToken) {
  return {
    success: true,
    message: `🎉 Добро пожаловать в ИИ-фитнес тренер!\n\n` +
             `🤖 Я ваш персональный ИИ-тренер и готов помочь вам достичь фитнес-целей!\n\n` +
             `✨ Мои возможности:\n` +
             `• 🏋️‍♂️ Составление персональных программ тренировок\n` +
             `• 🥗 Планы питания и советы по диете\n` +
             `• ⚖️ Планы похудения и набора массы\n` +
             `• 💪 Техника выполнения упражнений\n` +
             `• 📊 Расчет калорий и макронутриентов\n` +
             `• 🎯 Постановка и достижение целей\n\n` +
             `💬 Просто напишите мне любой вопрос!\n\n` +
             `� Примеры запросов:\n` +
             `"Составь программу тренировок для дома"\n` +
             `"Как правильно питаться для похудения?"\n` +
             `"Хочу накачать мышцы, что делать?"\n\n` +
             `🏠 Для возврата в главное меню используйте /menu`
  };
}

// Проверка доступности Coze API
export async function checkCozeConnection() {
  try {
    if (!process.env.COZE_API_KEY || !process.env.COZE_BOT_ID || 
        process.env.COZE_API_KEY.includes('your_')) {
      console.log('⚠️ Coze API не настроен');
      return false;
    }
    
    console.log('🔄 Тестируем подключение к Coze API v3...');
    
    const response = await axios.post(
      `${COZE_API_BASE_URL}/v3/chat`,
      {
        bot_id: process.env.COZE_BOT_ID,
        user_id: 'test_user',
        stream: false,
        auto_save_history: false,
        additional_messages: [
          {
            role: "user",
            content: "Привет, это тестовое сообщение",
            content_type: "text"
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 минута таймаут для проверки подключения
      }
    );
    
    console.log('✅ Coze API v3 подключение успешно');
    return true;
    
  } catch (error) {
    console.error('❌ Coze API v3 недоступен:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
}

// Получение информации о боте (заглушка)
export async function getBotInfo() {
  return {
    status: 'integrated_mode', // Встроенный режим - всё в одном боте
    main_bot: 'current_bot' // Используем текущего бота
  };
}
