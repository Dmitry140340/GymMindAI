import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const DEEPSEEK_API_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-0945e3cceec44d19a48557dfbe13cfc0';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-reasoner';

// Хранилище истории разговоров для каждого пользователя
const conversationHistory = new Map();

/**
 * Основная функция для работы с DeepSeek Chat API
 * @param {string} accessToken - Не используется для DeepSeek (для совместимости с Coze)
 * @param {string} message - Сообщение пользователя
 * @param {string} userId - ID пользователя для сохранения контекста
 * @param {string} instructions - Системные инструкции (role: system)
 * @returns {Object} - Результат с success и message
 */
export async function runDeepSeekChat(accessToken, message, userId, instructions) {
  try {
    console.log('🚀 Запуск DeepSeek Chat для пользователя:', userId);
    console.log('💬 Сообщение:', message);
    console.log('📋 Инструкции:', instructions);
    console.log('🔑 API Key:', DEEPSEEK_API_KEY ? 'Установлен' : '❌ Отсутствует');
    console.log('🌐 Base URL:', DEEPSEEK_API_BASE_URL);
    console.log('🤖 Model:', DEEPSEEK_MODEL);

    // Проверка наличия API ключа
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_api_key_here') {
      console.error('❌ DeepSeek API ключ не настроен!');
      return {
        success: false,
        message: '🔑 **Ошибка конфигурации**\n\nDeepSeek API ключ не настроен.\nОбратитесь к администратору.',
        error: 'API ключ не настроен'
      };
    }

    // Получаем или создаем историю разговора для пользователя
    let messages = conversationHistory.get(userId) || [];
    
    // Если история пустая, добавляем системное сообщение
    if (messages.length === 0 && instructions) {
      messages.push({
        role: 'system',
        content: instructions
      });
    }

    // Добавляем новое сообщение пользователя
    messages.push({
      role: 'user',
      content: message
    });

    console.log('📚 История разговора (количество сообщений):', messages.length);

    // Отправляем запрос к DeepSeek API
    const response = await axios.post(
      `${DEEPSEEK_API_BASE_URL}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: messages,
        stream: false,
        max_tokens: 32000 // Максимальная длина ответа (включая reasoning)
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 минуты таймаут
      }
    );

    console.log('📥 Ответ DeepSeek - статус:', response.status);
    console.log('📄 Полный ответ DeepSeek:', JSON.stringify(response.data, null, 2));

    // Обработка ответа
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const choice = response.data.choices[0];
      const assistantMessage = choice.message;
      
      // Извлекаем reasoning_content (цепочка рассуждений) и content (финальный ответ)
      const reasoningContent = assistantMessage.reasoning_content;
      const finalAnswer = assistantMessage.content;

      console.log('🧠 Reasoning content:', reasoningContent ? reasoningContent.substring(0, 100) + '...' : 'Нет');
      console.log('✅ Финальный ответ:', finalAnswer ? finalAnswer.substring(0, 100) + '...' : 'Нет');

      // Сохраняем в историю ТОЛЬКО финальный ответ (content), БЕЗ reasoning_content
      // Это важно по документации DeepSeek!
      messages.push({
        role: 'assistant',
        content: finalAnswer
      });

      // Обновляем историю разговора
      conversationHistory.set(userId, messages);

      // Возвращаем успешный результат
      return {
        success: true,
        message: finalAnswer,
        data: {
          reasoning: reasoningContent,
          final_answer: finalAnswer,
          model: DEEPSEEK_MODEL,
          usage: response.data.usage,
          api_version: 'deepseek-v1'
        }
      };

    } else {
      console.log('❌ Пустой ответ от DeepSeek');
      return {
        success: false,
        message: 'Пустой ответ от DeepSeek API',
        error: 'Пустой ответ от API'
      };
    }

  } catch (error) {
    console.error('❌ Ошибка при запросе к DeepSeek Chat:', error.message);
    
    if (error.response) {
      console.error('📄 Детали ошибки DeepSeek:', error.response.data);
      console.error('📄 Статус ошибки:', error.response.status);
      
      if (error.response.status === 401) {
        return {
          success: false,
          message: '🔑 Неверный API ключ для DeepSeek',
          error: 'Неверный API ключ'
        };
      } else if (error.response.status === 429) {
        return {
          success: false,
          message: '⏱️ Превышен лимит запросов к DeepSeek',
          error: 'Превышен лимит запросов'
        };
      } else if (error.response.status === 400) {
        return {
          success: false,
          message: '❌ Ошибка в запросе к DeepSeek: ' + (error.response.data?.error?.message || 'Неизвестная ошибка'),
          error: 'Ошибка в запросе'
        };
      }
    }

    // В случае сетевой ошибки
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: '⏰ Превышено время ожидания ответа от DeepSeek',
        error: 'Таймаут'
      };
    }

    // Общая ошибка
    return {
      success: false,
      message: '❌ Произошла ошибка при обращении к DeepSeek: ' + error.message,
      error: error.message
    };
  }
}

/**
 * Очистка истории разговора для пользователя
 * @param {string} userId - ID пользователя
 */
export function clearConversationHistory(userId) {
  conversationHistory.delete(userId);
  console.log('🧹 История разговора очищена для пользователя:', userId);
}

/**
 * Получение истории разговора для пользователя
 * @param {string} userId - ID пользователя
 * @returns {Array} - Массив сообщений
 */
export function getConversationHistory(userId) {
  return conversationHistory.get(userId) || [];
}

/**
 * Симуляция ответа AI (резервный вариант, не используется с реальным API)
 */
async function simulateAIResponse(message, userId) {
  const responses = {
    креатин: "🧪 **Креатин** - одна из самых изученных добавок в спорте!\n\n📋 **Основные преимущества:**\n• Увеличивает силу на 5-15%\n• Ускоряет рост мышечной массы\n• Улучшает восстановление\n• Повышает производительность в коротких интенсивных нагрузках\n\n💊 **Как принимать:**\n• Дозировка: 3-5г в день\n• Время: в любое время суток\n• С чем: можно с водой, соком или протеином\n• Загрузка: не обязательна\n\n✅ **Безопасность:** Полностью безопасен при соблюдении дозировки",
    тренировк: "🏋️‍♂️ **Оптимальная частота тренировок:**\n\n📅 **Для новичков:**\n• 2-3 раза в неделю\n• Фокус на технику и базовые упражнения\n\n💪 **Для продвинутых:**\n• 4-6 раз в неделю\n• Разделение по группам мышц\n\n⚖️ **Золотое правило:** Качество важнее количества!"
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
    response = "🤖 **Привет!** Я ваш персональный ИИ-тренер на базе DeepSeek!\n\n📋 **Я помогу вам с:**\n• Составлением программ тренировок\n• Планированием питания\n• Достижением фитнес-целей\n• Выбором спортивного питания\n\n💪 Задавайте любые вопросы о фитнесе!";
  }
  
  return {
    success: true,
    data: response
  };
}

export default runDeepSeekChat;
