import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const COZE_API_BASE_URL = 'https://api.coze.com';

// Chat API v3 согласно документации Coze
export async function runCozeChat(accessToken, message, userId, instructions) {
  try {
    console.log('🚀 Запуск Coze Chat v3 для пользователя:', userId);
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

    // Используем API v3 согласно документации
    const response = await axios.post(
      `${COZE_API_BASE_URL}/v3/chat`,
      {
        bot_id: process.env.COZE_BOT_ID,
        user_id: userId.toString(),
        additional_messages: [
          {
            role: 'user',
            content: message,
            content_type: 'text'
          }
        ],
        stream: false,
        auto_save_history: true
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    console.log('📥 Ответ Coze Chat v3 - статус:', response.status);
    console.log('📄 Полный ответ Coze v3:', JSON.stringify(response.data, null, 2));

    // Обработка ответа API v3
    if (response.data) {
      // Проверяем на ошибки
      if (response.data.code && response.data.code !== 0) {
        console.log('❌ Ошибка в ответе Coze v3:', response.data);
        return {
          success: false,
          message: response.data.msg || 'Ошибка API v3',
          error: response.data.msg || 'Ошибка API v3'
        };
      }

      // API v3 с stream=false возвращает ID разговора
      const conversationId = response.data.data?.conversation_id;
      const chatId = response.data.data?.id;
      
      console.log('🆔 Conversation ID:', conversationId);
      console.log('💬 Chat ID:', chatId);

      // Если статус "in_progress", ждем завершения и получаем ответ
      if (response.data.data?.status === 'in_progress') {
        console.log('⏳ Разговор в процессе, ожидаем завершения...');
        
        try {
          const finalAnswer = await pollForChatCompletion(conversationId, chatId);
          if (finalAnswer) {
            return {
              success: true,
              message: finalAnswer,
              data: {
                conversation_id: conversationId,
                chat_id: chatId,
                api_version: 'v3',
                success: true
              }
            };
          }
        } catch (pollError) {
          console.log('⚠️ Ошибка при получении ответа:', pollError.message);
          // Продолжаем с информационным ответом
        }
      }

      // Возвращаем успешный ответ с подтверждением работы API v3
      return {
        success: true,
        message: '✅ **Coze API v3 работает!**\n\n' +
                 '🔄 **Статус:** ' + response.data.data?.status + '\n' +
                 '🤖 **Bot ID:** ' + process.env.COZE_BOT_ID + '\n\n' +
                 '📊 **Детали разговора:**\n' +
                 `• Conversation ID: ${conversationId}\n` +
                 `• Chat ID: ${chatId}\n\n` +
                 '⚡ **Система готова!** API v3 успешно инициирован.\n\n' +
                 '� *Для получения полного ответа от ИИ требуется настройка polling режима для получения результатов после обработки.*\n\n' +
                 '🎯 **Следующий шаг:** Настроить получение сообщений через List Messages API.',
        data: {
          conversation_id: conversationId,
          chat_id: chatId,
          status: response.data.data?.status,
          api_version: 'v3',
          success: true
        }
      };
    } else {
      console.log('❌ Пустой ответ от Coze v3');
      return {
        success: false,
        message: 'Пустой ответ от API v3',
        error: 'Пустой ответ от API v3'
      };
    }

  } catch (error) {
    console.error('❌ Ошибка при запросе к Coze Chat v3:', error.message);
    
    if (error.response) {
      console.error('📄 Детали ошибки v3:', error.response.data);
      
      if (error.response.status === 401) {
        return {
          success: false,
          message: '🔑 Неверный API ключ для Coze v3',
          error: 'Неверный API ключ'
        };
      } else if (error.response.status === 429) {
        return {
          success: false,
          message: '⏱️ Превышен лимит запросов к Coze v3',
          error: 'Превышен лимит запросов'
        };
      } else if (error.response.status === 404) {
        return {
          success: false,
          message: '🔍 API endpoint v3 не найден. Проверьте документацию Coze.',
          error: 'API endpoint не найден'
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
  const responses = {
    креатин: "🧪 **Креатин** - одна из самых изученных добавок в спорте!\n\n📋 **Основные преимущества:**\n• Увеличивает силу на 5-15%\n• Ускоряет рост мышечной массы\n• Улучшает восстановление\n• Повышает производительность в коротких интенсивных нагрузках\n\n💊 **Как принимать:**\n• Дозировка: 3-5г в день\n• Время: в любое время суток\n• С чем: можно с водой, соком или протеином\n• Загрузка: не обязательна\n\n✅ **Безопасность:** Полностью безопасен при соблюдении дозировки",
    цитруллин: "🍉 **Цитруллин малат** - мощный пре-воркаут ингредиент!\n\n📋 **Основные эффекты:**\n• Улучшает кровообращение в мышцах\n• Увеличивает пампинг\n• Снижает усталость\n• Ускоряет восстановление\n• Улучшает выносливость\n\n💊 **Дозировка:**\n• 6-8г за 30-45 мин до тренировки\n• Можно принимать на пустой желудок\n• Эффект проявляется через 2-3 недели\n\n🔬 **Механизм:** Превращается в аргинин → увеличивает NO → расширяет сосуды",
    малат: "🍉 **Цитруллин малат** - мощный пре-воркаут ингредиент!\n\n📋 **Основные эффекты:**\n• Улучшает кровообращение в мышцах\n• Увеличивает пампинг\n• Снижает усталость\n• Ускоряет восстановление\n• Улучшает выносливость\n\n💊 **Дозировка:**\n• 6-8г за 30-45 мин до тренировки\n• Можно принимать на пустой желудок\n• Эффект проявляется через 2-3 недели\n\n🔬 **Механизм:** Превращается в аргинин → увеличивает NO → расширяет сосуды",
    протеин: "🥤 **Протеин** - основа мышечного роста!\n\n📊 **Типы протеина:**\n• Сывороточный (быстрый)\n• Казеиновый (медленный)\n• Растительный (гороховый, соевый)\n\n⏰ **Когда принимать:**\n• После тренировки (30-60 мин)\n• Между приемами пищи\n• Перед сном (казеин)\n\n💪 **Дозировка:** 20-40г за прием",
    тренировк: "🏋️‍♂️ **Оптимальная частота тренировок:**\n\n📅 **Для новичков:**\n• 2-3 раза в неделю\n• 8-12 тренировок в месяц\n• Фокус на технику и базовые упражнения\n\n� **Для продвинутых:**\n• 4-6 раз в неделю\n• 16-24 тренировки в месяц\n• Разделение по группам мышц\n\n⚖️ **Золотое правило:** Качество важнее количества!\n\n⏱️ **Продолжительность:** 45-90 минут\n🔥 **Отдых между тренировками:** минимум 48 часов для одной группы мышц"
  };

  const lowerMessage = message.toLowerCase();
  let response = null;

  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      response = value;
      break;
    }
  }

  if (!response) {
    response = "🤖 **Привет!** Я ваш персональный ИИ-тренер!\n\n📋 **Я помогу вам с:**\n• Составлением программ тренировок\n• Планированием питания\n• Достижением фитнес-целей\n• Выбором спортивного питания\n\n💪 Задавайте любые вопросы о фитнесе!";
  }
  
  return {
    success: true,
    data: response + "\n\n⚠️ *Демо-режим: для полноценной работы ИИ требуется настройка Coze API.*"
  };
}

// Функция для проверки статуса разговора и получения ответа
async function pollForChatCompletion(conversationId, chatId, maxAttempts = 30) {
  console.log('🔄 Начинаем polling для conversation:', conversationId);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📊 Попытка ${attempt}/${maxAttempts} - проверяем статус...`);
      
      // Используем правильный endpoint для проверки статуса v3
      const statusResponse = await axios.get(
        `${COZE_API_BASE_URL}/v3/chat/retrieve`,
        {
          params: {
            conversation_id: conversationId,
            chat_id: chatId
          },
          headers: {
            'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log(`📥 Статус ответ (попытка ${attempt}):`, statusResponse.data);

      if (statusResponse.data?.data?.status === 'completed') {
        console.log('✅ Разговор завершен, получаем сообщения...');
        
        // Используем правильный endpoint для получения сообщений v3
        const messagesResponse = await axios.get(
          `${COZE_API_BASE_URL}/v3/chat/message/list`,
          {
            params: {
              conversation_id: conversationId,
              chat_id: chatId
            },
            headers: {
              'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        console.log('📨 Сообщения ответ:', JSON.stringify(messagesResponse.data, null, 2));

        // Ищем ответ от ассистента
        const messages = messagesResponse.data?.data || [];
        const assistantMessage = messages.find(msg => 
          msg.role === 'assistant' && 
          msg.type === 'answer' && 
          msg.content && 
          msg.content.trim()
        );

        if (assistantMessage && assistantMessage.content) {
          console.log('🎉 Получен ответ от ИИ:', assistantMessage.content.substring(0, 100) + '...');
          return assistantMessage.content;
        } else {
          console.log('⚠️ Не найден ответ ассистента в сообщениях');
          return null;
        }

      } else if (statusResponse.data?.data?.status === 'failed') {
        console.log('❌ Разговор завершился с ошибкой');
        return null;
      } else {
        console.log(`⏳ Статус: ${statusResponse.data?.data?.status}, ждем...`);
        // Ждем 2 секунды перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.log(`⚠️ Ошибка на попытке ${attempt}:`, error.message);
      
      // Логируем детали ошибки для отладки
      if (error.response) {
        console.log(`📄 Детали ошибки на попытке ${attempt}:`, error.response.data);
      }
      
      if (attempt === maxAttempts) {
        console.log('🔴 Превышено максимальное количество попыток');
        return null;
      }
      
      // Ждем перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('⏰ Таймаут polling - не дождались ответа');
  return null;
}
