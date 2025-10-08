# 🤖 Отчет об исправлении AI Workflow интеграции

**Дата:** 8 октября 2025  
**Версия:** 2.0  
**Статус:** ✅ Исправлено и готово к тестированию

---

## 📋 Описание проблем

### Проблема 1: Пустые параметры в воркфлоу
**До исправления:**
- Все AI-воркфлоу вызывались с пустыми параметрами `{}`
- Пользователь не мог передать свой запрос (тему исследования, название добавки)
- Воркфлоу получали `null` или пустые объекты

### Проблема 2: Отсутствие интерактивности
**До исправления:**
- Интерактивные воркфлоу (training_program, nutrition_plan) не обрабатывали анкеты
- Функция `continueInteractiveWorkflow` существовала, но не использовалась
- После получения анкеты от AI, бот не мог принять ответы пользователя

---

## 🔧 Внесенные изменения

### 1. Обработка `/deepresearch` (Глубокое исследование)

#### Было:
```javascript
const result = await runWorkflow(workflowId, {});
```

#### Стало:
```javascript
// Шаг 1: Запрос темы у пользователя
userStates.set(user.id, { mode: 'awaiting_deepresearch_query' });
await bot.sendMessage(chatId, 'Введите тему для исследования...');

// Шаг 2: Обработка ответа пользователя
const result = await runWorkflow(workflowId, { query: userInput });
```

**Логика работы:**
1. Пользователь нажимает `/deepresearch`
2. Бот просит ввести тему исследования
3. Пользователь отправляет текст (например: "Как креатин влияет на набор мышечной массы?")
4. Бот вызывает воркфлоу с параметром `{ query: "Как креатин..." }`
5. Получает и отправляет результат пользователю

---

### 2. Обработка `/composition_analysis` (Анализ состава добавок)

#### Было:
```javascript
const result = await runWorkflow(workflowId, {});
```

#### Стало:
```javascript
// Шаг 1: Запрос названия добавки
userStates.set(user.id, { mode: 'awaiting_composition_query' });
await bot.sendMessage(chatId, 'Введите название добавки для анализа...');

// Шаг 2: Обработка ответа
const result = await runWorkflow(workflowId, { supplement: userInput });
```

**Логика работы:**
1. Пользователь нажимает `/composition_analysis`
2. Бот просит ввести название добавки
3. Пользователь отправляет текст (например: "Креатин моногидрат")
4. Бот вызывает воркфлоу с параметром `{ supplement: "Креатин моногидрат" }`
5. Получает и отправляет анализ

---

### 3. Обработка `/training_program` (Программа тренировок)

#### Было:
```javascript
const result = await runWorkflow(workflowId, {});
await bot.sendMessage(chatId, result.response); // ❌ response не существует для интерактивных
```

#### Стало:
```javascript
// Шаг 1: Запуск интерактивного воркфлоу
const result = await runWorkflow(workflowId, {});

// Шаг 2: Проверка на интерактивность
if (result.isInteractive && result.eventId) {
  // Сохраняем eventId для продолжения диалога
  userStates.set(user.id, {
    mode: 'interactive_training_program',
    eventId: result.eventId,
    workflowType: 'training_program'
  });
  
  // Отправляем анкету (первый вопрос от AI)
  await bot.sendMessage(chatId, result.message, { reply_markup: { force_reply: true } });
}

// Шаг 3: Обработка ответов пользователя
// Когда пользователь отправляет текст в режиме interactive_training_program:
const continueResult = await continueInteractiveWorkflow(
  eventId,          // ID сессии
  userAnswer,       // Ответ пользователя
  'training_program',
  userId
);

// Шаг 4: Проверка на завершение
if (continueResult.eventId && !continueResult.isComplete) {
  // Еще есть вопросы - обновляем eventId и отправляем следующий вопрос
  userStates.set(user.id, { ...state, eventId: continueResult.eventId });
  await bot.sendMessage(chatId, continueResult.message);
} else {
  // Диалог завершен - отправляем финальную программу тренировок
  await sendLongMessage(bot, chatId, continueResult.message, mainKeyboard);
}
```

**Логика работы:**
1. Пользователь нажимает `/training_program`
2. Воркфлоу запускается и отправляет первый вопрос анкеты (например: "Какой у вас опыт тренировок?")
3. Пользователь отвечает → бот вызывает `continueInteractiveWorkflow()`
4. Воркфлоу отправляет следующий вопрос → пользователь отвечает
5. Цикл повторяется пока `isComplete = false`
6. Когда `isComplete = true`, отправляется финальная программа тренировок

---

### 4. Обработка `/nutrition_plan` (План питания)

**Аналогично** `/training_program` - полностью интерактивный воркфлоу с последовательными вопросами.

**Логика работы:**
1. Пользователь нажимает `/nutrition_plan`
2. Воркфлоу отправляет анкету (вес, цель, аллергии и т.д.)
3. Пользователь заполняет анкету, отвечая на каждый вопрос
4. После завершения получает персональный план питания

---

## 🆕 Добавленные функции

### 1. `sendLongMessage()` - Отправка длинных сообщений
```javascript
async function sendLongMessage(bot, chatId, message, keyboard = null) {
  const maxLength = 4096;
  
  if (message.length <= maxLength) {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...keyboard });
  } else {
    // Разбиение на части с сохранением переносов строк
    const parts = [];
    let currentPart = '';
    const lines = message.split('\n');
    
    for (const line of lines) {
      if ((currentPart + line + '\n').length > maxLength) {
        if (currentPart) parts.push(currentPart);
        currentPart = line + '\n';
      } else {
        currentPart += line + '\n';
      }
    }
    if (currentPart) parts.push(currentPart);
    
    // Отправка частей (клавиатура только на последней части)
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      await bot.sendMessage(
        chatId, 
        parts[i], 
        isLast ? { parse_mode: 'Markdown', ...keyboard } : { parse_mode: 'Markdown' }
      );
    }
  }
}
```

**Применение:**
- Все AI-воркфлоу используют `sendLongMessage()` вместо прямого `bot.sendMessage()`
- Автоматическое разбиение ответов >4096 символов
- Сохранение форматирования и переносов строк

---

### 2. Новые состояния пользователей (userStates)

#### Простые воркфлоу:
```javascript
{ mode: 'awaiting_deepresearch_query' }       // Ожидание темы исследования
{ mode: 'awaiting_composition_query' }        // Ожидание названия добавки
```

#### Интерактивные воркфлоу:
```javascript
{
  mode: 'interactive_training_program',       // Режим заполнения анкеты тренировок
  eventId: '7479065104894935045',            // ID сессии для продолжения
  workflowType: 'training_program'           // Тип воркфлоу
}

{
  mode: 'interactive_nutrition_plan',        // Режим заполнения анкеты питания
  eventId: '7446893841430429701',
  workflowType: 'nutrition_plan'
}
```

---

## 📊 Технические детали

### Структура ответов от Coze API

#### Простые воркфлоу (runSimpleWorkflow):
```javascript
{
  success: true,
  data: { output_final: "..." },
  response: "Полный текст ответа AI"  // ← Используется для отправки пользователю
}
```

#### Интерактивные воркфлоу (runInteractiveWorkflow):
```javascript
// Первый запуск (анкета):
{
  success: true,
  message: "Вопрос 1: Какой у вас опыт?",  // ← Вопрос от AI
  eventId: "session_12345",                // ← Сохраняем для продолжения
  isInteractive: true,
  isDone: false
}

// Продолжение через continueInteractiveWorkflow:
{
  success: true,
  message: "Вопрос 2: Сколько дней в неделю можете тренироваться?",
  eventId: "session_12346",  // ← Новый eventId для следующего вопроса
  isComplete: false
}

// Финальный ответ:
{
  success: true,
  message: "## Ваша программа тренировок\n\nДень 1: ...",
  eventId: null,
  isComplete: true  // ← Диалог завершен
}
```

---

## 🔄 Последовательность работы

### Сценарий 1: Глубокое исследование
```
User → /deepresearch
Bot  → "Введите тему для исследования"
      (userStates: { mode: 'awaiting_deepresearch_query' })

User → "Как креатин влияет на набор мышечной массы?"
Bot  → "⏳ Провожу глубокий анализ..."
       runWorkflow(DEEP_RESEARCH_ID, { query: "Как креатин..." })
       sendLongMessage(результат)
       useFreeRequest() или incrementRequestUsage()
       (userStates: удалено)
```

### Сценарий 2: Программа тренировок (интерактивная)
```
User → /training_program
Bot  → "⏳ Запускаю интерактивный помощник..."
       runWorkflow(TRAINING_PROGRAM_ID, {})
       
Bot  → "Вопрос 1: Какой у вас опыт тренировок?"
      (userStates: { mode: 'interactive_training_program', eventId: 'xxx' })

User → "Средний, тренируюсь 2 года"
Bot  → continueInteractiveWorkflow('xxx', "Средний...", 'training_program')
       
Bot  → "Вопрос 2: Сколько дней в неделю можете тренироваться?"
      (userStates: обновлен eventId)

User → "4 дня"
Bot  → continueInteractiveWorkflow(...)

...еще несколько вопросов...

Bot  → "## Ваша персональная программа тренировок\n\nДень 1: ..."
       sendLongMessage(финальная программа)
       useFreeRequest()
       (userStates: удалено)
```

---

## ✅ Проверочный список

- [x] `/deepresearch` - запрашивает тему исследования
- [x] `/composition_analysis` - запрашивает название добавки
- [x] `/training_program` - интерактивная анкета
- [x] `/nutrition_plan` - интерактивная анкета
- [x] Функция `sendLongMessage()` для разбиения длинных ответов
- [x] Обработка состояний `awaiting_deepresearch_query`
- [x] Обработка состояний `awaiting_composition_query`
- [x] Обработка состояний `interactive_training_program`
- [x] Обработка состояний `interactive_nutrition_plan`
- [x] Передача параметров в воркфлоу: `{ query: ... }`, `{ supplement: ... }`
- [x] Использование `continueInteractiveWorkflow()` для продолжения диалога
- [x] Списание запросов только после успешного завершения воркфлоу
- [x] Сохранение eventId для многоэтапных диалогов

---

## 🧪 План тестирования

### Тест 1: Глубокое исследование
1. Нажать `/deepresearch`
2. Ввести тему: "Влияние креатина на мышечную массу"
3. **Ожидаемый результат:** Получить подробный научный анализ
4. **Проверить:** Запрос списался (6/7 осталось)

### Тест 2: Анализ добавки
1. Нажать `/composition_analysis`
2. Ввести: "BCAA"
3. **Ожидаемый результат:** Анализ состава, рекомендации по применению
4. **Проверить:** Запрос списался (5/7 осталось)

### Тест 3: Программа тренировок (интерактивная)
1. Нажать `/training_program`
2. Ответить на все вопросы анкеты (опыт, частота, цели и т.д.)
3. **Ожидаемый результат:** Персональная программа тренировок
4. **Проверить:** 
   - Анкета работает последовательно (вопрос-ответ-вопрос...)
   - Запрос списался только после завершения
   - Длинный ответ разбит на части (если >4096 символов)

### Тест 4: План питания (интерактивная)
1. Нажать `/nutrition_plan`
2. Заполнить анкету (вес, рост, цель, предпочтения)
3. **Ожидаемый результат:** Персональный план питания с меню
4. **Проверить:** Интерактивность и корректное завершение

---

## 📌 Важные замечания

### Для простых воркфлоу (deepresearch, composition_analysis):
- Используют `result.response` (не `result.message`)
- Списывают запрос сразу после получения ответа
- Не требуют сохранения состояния после обработки

### Для интерактивных воркфлоу (training_program, nutrition_plan):
- Используют `result.message` (не `result.response`)
- Проверяют `result.isInteractive` и `result.eventId`
- Списывают запрос только после `isComplete = true`
- Сохраняют `eventId` в userStates для продолжения диалога

### Параметры воркфлоу:
- **deepresearch:** `{ query: "текст вопроса" }`
- **composition_analysis:** `{ supplement: "название добавки" }`
- **training_program:** `{}` (первый запуск), затем через `continueInteractiveWorkflow()`
- **nutrition_plan:** `{}` (первый запуск), затем через `continueInteractiveWorkflow()`

---

## 🚀 Следующие шаги

1. **Тестирование:** Запустить бота и протестировать все 4 воркфлоу
2. **Проверка логов:** Убедиться что параметры передаются корректно
3. **Проверка подписки:** Убедиться что доступ контролируется
4. **GitHub commit:** Зафиксировать изменения

---

**Автор:** GitHub Copilot  
**Дата создания:** 8 октября 2025
