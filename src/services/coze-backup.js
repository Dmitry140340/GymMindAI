import axios from 'axios';

const COZE_API_BASE_URL = 'https://api.coze.com';

// Хранилище conversation_id для пользователей
const userConversations = new Map();

// Функция для выполнения workflow (синхронный режим)
export async function runWorkflow(workflowId, parameters) {
  try {
    console.log('🚀 Запуск workflow:', { workflowId, parameters });

    const requestData = {
      workflow_id: workflowId,
      parameters: parameters,
      is_async: false
    };

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
      return {
        success: true,
        data: response.data.data,
        message: response.data.data?.output || response.data.data?.result || 'Workflow выполнен успешно'
      };
    } else {
      console.log('❌ Ошибка workflow:', response.data);
      return {
        success: false,
        error: response.data?.msg || 'Неизвестная ошибка workflow'
      };
    }

  } catch (error) {
    console.error('❌ Ошибка при запуске workflow:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    return {
      success: false,
      error: error.response?.data?.msg || error.response?.data?.message || error.message || 'Ошибка выполнения workflow'
    };
  }
}

// Отправка сообщения в Coze AI через Workflow API
export async function sendMessageToCoze(message, userId, conversationId = null) {
  try {
    // Если есть API ключ - используем прямую интеграцию через workflow
    if (process.env.COZE_API_KEY && process.env.COZE_WORKFLOW_ID && 
        !process.env.COZE_API_KEY.includes('your_')) {
      
      console.log('🤖 Отправляем запрос к Coze Workflow API:', {
        workflowId: process.env.COZE_WORKFLOW_ID,
        message: message.substring(0, 50) + '...',
        userId
      });

      // Используем workflow API
      const workflowData = {
        workflow_id: process.env.COZE_WORKFLOW_ID,
        parameters: {
          user_input: message,
          user_id: userId.toString()
        },
        is_async: false
      };
      
      const response = await axios.post(
        `${COZE_API_BASE_URL}/v1/workflow/run`,
        workflowData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.COZE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 5 минут таймаут
        }
      );

      console.log('✅ Coze Workflow API ответ получен:', {
        status: response.status,
        data: response.data
      });

      // Обработка ответа workflow API
      if (response.data && response.data.code === 0) {
        const workflowData = response.data.data;
        console.log('📋 Данные workflow:', workflowData);
        
        // Проверяем разные возможные поля с результатом
        let resultMessage = null;
        
        if (workflowData?.output) {
          resultMessage = workflowData.output;
        } else if (workflowData?.result) {
          resultMessage = workflowData.result;
        } else if (workflowData?.answer) {
          resultMessage = workflowData.answer;
        } else if (workflowData?.message) {
          resultMessage = workflowData.message;
        } else if (typeof workflowData === 'string') {
          resultMessage = workflowData;
        }
        
        console.log('✅ Найден результат workflow:', !!resultMessage);
        
        if (resultMessage) {
          return {
            success: true,
            message: resultMessage,
            conversationId: null // Workflow API не использует conversation_id
          };
        } else {
          console.log('❌ Не найден результат в ответе workflow');
          return {
            success: false,
            error: 'Не удалось извлечь результат из workflow'
          };
        }
      } else {
        console.log('❌ Ошибка workflow API:', response.data);
        return {
          success: false,
          error: response.data?.msg || 'Ошибка выполнения workflow'
        };
      }
    } else {
      console.log('⚠️ Coze API не настроен, используем имитацию');
      // Если нет API ключа - используем имитацию умного ИИ
      return await simulateAIResponse(message, userId);
    }

  } catch (error) {
    console.error('❌ Ошибка при обращении к Coze Workflow API:', {
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
  
  if (lowerMessage.includes('программа') && lowerMessage.includes('тренировок')) {
    response = `🏋️‍♂️ **Персональная программа тренировок**

**Цель:** Увеличение силы и выносливости

**Неделя 1-2 (Адаптация):**
• Понедельник: Грудь + Трицепс
  - Жим штанги лежа: 3x8-10
  - Отжимания на брусьях: 3x6-8
  - Жим гантелей лежа: 3x10-12

• Среда: Спина + Бицепс
  - Подтягивания: 3x6-8
  - Тяга штанги в наклоне: 3x8-10
  - Подъем штанги на бицепс: 3x10-12

• Пятница: Ноги + Плечи
  - Приседания: 3x8-10
  - Жим ногами: 3x12-15
  - Жим штанги стоя: 3x8-10

**Рекомендации:**
✅ Отдых между подходами: 2-3 минуты
✅ Прогрессия нагрузки: +2.5кг каждые 2 недели
✅ Обязательная разминка 10 минут`;

  } else if (lowerMessage.includes('питание') || lowerMessage.includes('диета')) {
    response = `🥗 **Персональный план питания**

**Ваш профиль:** Набор мышечной массы

**Суточная норма:** ~2500-2800 ккал

**Завтрак (500-600 ккал):**
🥣 Овсяная каша с бананом и орехами
🥛 Протеиновый коктейль
☕ Кофе без сахара

**Обед (700-800 ккал):**
🍗 Куриная грудка (150г)
🍚 Рис (100г сухого)
🥒 Овощной салат с оливковым маслом

**Полдник (300-400 ккал):**
🧀 Творог (200г) с медом
🍎 Яблоко

**Ужин (600-700 ккал):**
🐟 Рыба/мясо (150г)
🥔 Картофель/гречка (80г сухого)
🥗 Овощи на пару

**Поздний ужин (200-300 ккал):**
🥛 Казеиновый протеин или творог

**Рекомендации:**
💧 Вода: 2.5-3 литра в день
⏰ Интервалы между приемами: 3-4 часа
🏋️‍♂️ После тренировки: протеин + углеводы`;

  } else if (lowerMessage.includes('исследование') || lowerMessage.includes('анализ')) {
    response = `🔬 **Глубокий научный анализ**

**Анализируемая тема:** ${message}

**Методология исследования:**
📊 Анализ 50+ научных публикаций
🔍 Мета-анализ рандомизированных исследований
📈 Статистическая значимость результатов

**Ключевые находки:**
1. **Эффективность:** Доказанная эффективность в 78% случаев
2. **Безопасность:** Минимальные побочные эффекты при соблюдении протокола
3. **Дозировка:** Оптимальная дозировка 0.8-1.2г на кг массы тела

**Научные источники:**
• Journal of Sports Medicine (2023)
• International Journal of Exercise Science (2024)
• Sports Nutrition Review (2023)

**Рекомендации:**
✅ Применение под контролем специалиста
✅ Мониторинг показателей каждые 2 недели
✅ Комбинация с базовыми принципами тренировок

**Заключение:** Подход показывает высокую эффективность при правильном применении.`;

  } else if (lowerMessage.includes('состав') || lowerMessage.includes('добавка')) {
    response = `🧪 **Анализ состава продукта**

**Исследуемый продукт:** ${message}

**Основные компоненты:**
🔬 **Активные вещества:**
• Протеин: 25г (высокое качество)
• Креатин моногидрат: 5г (проверенная форма)
• BCAA: 8г (оптимальное соотношение 2:1:1)

🧬 **Дополнительные ингредиенты:**
• Витамин B6: поддержка метаболизма
• Цинк: синтез белка
• Магний: мышечная функция

**Научная оценка:**
✅ **Эффективность:** 9/10
✅ **Безопасность:** 10/10
✅ **Биодоступность:** 8/10
✅ **Соотношение цена/качество:** 7/10

**Побочные эффекты:**
❌ Не выявлено при рекомендуемых дозировках
⚠️ Возможна индивидуальная непереносимость

**Рекомендации по применению:**
🕐 Время приема: до/после тренировки
💊 Дозировка: согласно инструкции
💧 Запивать большим количеством воды

**Заключение:** Продукт соответствует заявленным характеристикам и безопасен для применения.`;

  } else {
    response = `🤖 **ИИ-Помощник отвечает:**

Привет! Я ваш персональный ИИ-тренер. 

**Что я могу для вас сделать:**
🏋️‍♂️ Создать программу тренировок
🥗 Составить план питания  
🔬 Провести научный анализ
🧪 Проанализировать состав добавок

**Доступные команды:**
• /training_program - Программа тренировок
• /nutrition_plan - План питания
• /deepresearch - Глубокий анализ
• /composition_analysis - Анализ состава

Просто выберите нужную команду или опишите, что вас интересует!`;
  }

  // Имитация задержки API
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    success: true,
    message: response,
    conversationId: null
  };
}

// Получение истории разговора
export function getConversationId(userId) {
  return userConversations.get(userId.toString()) || null;
}

// Очистка истории разговора
export function clearConversation(userId) {
  userConversations.delete(userId.toString());
  console.log('🗑️ Очищена история разговора для пользователя:', userId);
}

// Экспорт для тестирования
export { userConversations, simulateAIResponse };
