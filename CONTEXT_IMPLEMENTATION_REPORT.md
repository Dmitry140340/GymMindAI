# ✅ Отчёт: Реализация контекста диалога и уточняющих вопросов

**Дата**: 08.10.2025  
**Коммит**: `b0803c1`  
**Статус**: ✅ Реализовано и готово к тестированию

---

## 📋 Выполненные задачи

### 1️⃣ ИИ-тренер: Сохранение контекста между запросами
**Файл**: `src/bot/handlers.js` (строки 1800-1850)

**Реализовано**:
- ✅ При каждом запросе в режиме "ИИ-тренер" получается контекст предыдущих ответов
- ✅ Контекст добавляется к новому запросу перед отправкой в Coze API
- ✅ После получения ответа от Coze API, новый ответ сохраняется в контексте
- ✅ Контекст НЕ удаляется при переключении кнопок меню

**Код**:
```javascript
// Получаем контекст предыдущего разговора
let workflowContext = userWorkflowContext.get(user.id);

let messageWithContext = text;
if (workflowContext && workflowContext.lastResponse) {
  messageWithContext = `КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:
${workflowContext.lastResponse}

УТОЧНЯЮЩИЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: ${text}

Пожалуйста, ответь на уточняющий вопрос с учетом контекста предыдущего анализа.`;
}

// Отправляем в Coze API
const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, ...);

// Сохраняем новый ответ
workflowContext = workflowContext || {};
workflowContext.lastResponse = aiResponse.message;
workflowContext.timestamp = Date.now();
userWorkflowContext.set(user.id, workflowContext);
```

**Пример диалога**:
```
Пользователь: "🤖 ИИ-тренер"
Бот: [Режим AI-trainer активирован]

Пользователь: "Как накачать грудь?"
Бот: "Для развития грудных мышц рекомендую..."
[Контекст сохранён]

Пользователь: "А сколько раз в неделю?"
Бот получает:
КОНТЕКСТ: "Для развития грудных мышц рекомендую..."
ВОПРОС: "А сколько раз в неделю?"

Бот: "Для тренировки груди рекомендую 2-3 раза в неделю..."
```

---

### 2️⃣ ИИ-инструменты: Уточняющие вопросы после workflow
**Файл**: `src/bot/handlers.js`

**Реализовано**:
- ✅ После завершения `deepresearch` workflow контекст сохраняется (строка ~1638)
- ✅ После завершения `composition_analysis` workflow контекст сохраняется (строка ~1698)
- ✅ После завершения интерактивных workflow (`training_program`, `nutrition_plan`) контекст сохраняется (строки ~1767, ~287)
- ✅ Следующий запрос пользователя НЕ идёт в workflow, а идёт в Coze API с контекстом

**Код для сохранения контекста**:
```javascript
// После deepresearch
const result = await runWorkflow(workflowId, { input: text });

// Сохраняем контекст для возможности уточняющих вопросов
userWorkflowContext.set(user.id, {
  lastResponse: result.response,
  timestamp: Date.now()
});

await sendLongMessage(bot, chatId, result.response, mainKeyboard);
```

**Аналогично для**:
- `composition_analysis` (строка ~1692)
- Интерактивные workflow при завершении (строка ~1773)
- Интерактивные workflow при мгновенном результате (строка ~287)

**Пример диалога**:
```
Пользователь: "🧬 ИИ-инструменты"
Бот: [Меню инструментов]

Пользователь: "🧪 Анализ состава добавок"
Бот: "Введите название добавки"

Пользователь: "E621, E627, E631"
Бот: [Глубокий анализ от workflow]
[Контекст сохранён: ответ workflow]

Пользователь: "Можно ли их детям?"
Бот получает от Coze API:
КОНТЕКСТ: [анализ E621, E627, E631]
ВОПРОС: "Можно ли их детям?"

Бот: "Учитывая анализ E621, E627, E631..."
```

---

### 3️⃣ Исправление Help button
**Файл**: `src/bot/handlers.js` (строка ~1268)

**Проблема**: Telegram ошибка парсинга Markdown:
```
Bad Request: can't parse entities: Can't find end of the entity starting at byte offset 1310
```

**Причина**: Использование `**жирного**` текста Markdown вместе с `@username` вызывало конфликт парсера.

**Решение**: Заменили `**` на `*` (одинарные звёздочки):
```javascript
const helpMessage = `❓ *Помощь по использованию FitnessBotAI*

🤖 *ИИ-тренер* - ваш персональный помощник по фитнесу:
...
🆘 *Нужна помощь?* Напишите в поддержку: @support_bot`;
```

**Результат**: ✅ Help button работает корректно

---

## 🔍 Логика работы контекста

### Сохранение контекста:
1. После ответа Coze API в режиме "ИИ-тренер"
2. После завершения любого workflow (deepresearch, composition_analysis, training_program, nutrition_plan)
3. Контекст хранится в `userWorkflowContext` Map

### Использование контекста:
1. При следующем запросе пользователя проверяется наличие контекста
2. Если контекст есть, он добавляется к запросу перед отправкой в Coze API
3. Coze API получает:
   ```
   КОНТЕКСТ ПРЕДЫДУЩЕГО РАЗГОВОРА:
   [предыдущий ответ]
   
   УТОЧНЯЮЩИЙ ВОПРОС ПОЛЬЗОВАТЕЛЯ: [новый вопрос]
   ```

### Очистка контекста:
- ✅ ТОЛЬКО при нажатии "🔄 Новый диалог" (строка 1306)
- ❌ НЕ очищается при переключении меню
- ❌ НЕ очищается при нажатии других кнопок

---

## 📊 Места сохранения контекста

### 1. Deepresearch workflow (строка ~1638)
```javascript
userWorkflowContext.set(user.id, {
  lastResponse: result.response,
  timestamp: Date.now()
});
```

### 2. Composition analysis workflow (строка ~1698)
```javascript
userWorkflowContext.set(user.id, {
  lastResponse: result.response,
  timestamp: Date.now()
});
```

### 3. Интерактивные workflow - завершение (строка ~1773)
```javascript
userWorkflowContext.set(user.id, {
  lastResponse: result.message,
  timestamp: Date.now()
});
```

### 4. Интерактивные workflow - мгновенный результат (строка ~287)
```javascript
userWorkflowContext.set(user.id, {
  lastResponse: result.message,
  timestamp: Date.now()
});
```

### 5. Ответ Coze API в режиме AI-trainer (строка ~1843)
```javascript
workflowContext = workflowContext || {};
workflowContext.lastResponse = aiResponse.message;
workflowContext.timestamp = Date.now();
userWorkflowContext.set(user.id, workflowContext);
```

---

## 🧪 Тестирование

Создан файл: **CONTEXT_TEST_GUIDE.md**

### Тест 1: ИИ-тренер
1. Нажать "🤖 ИИ-тренер"
2. Задать вопрос: "Какие упражнения для груди?"
3. Дождаться ответа
4. Задать уточняющий вопрос: "А сколько повторений?"
5. **Ожидаемый результат**: Coze понимает контекст (отвечает про упражнения груди)

### Тест 2: ИИ-инструменты → Уточняющие вопросы
1. Нажать "🧬 ИИ-инструменты"
2. Выбрать "🧪 Анализ состава добавок"
3. Ввести "E621, E627, E631"
4. Дождаться ответа от workflow
5. Задать уточняющий вопрос: "Можно ли детям?"
6. **Ожидаемый результат**: Coze видит контекст (анализ добавок)

---

## ✅ Итоговый чеклист

- ✅ Контекст сохраняется в режиме "ИИ-тренер"
- ✅ Контекст передаётся Coze API при каждом запросе
- ✅ Контекст сохраняется после завершения всех 4 workflow
- ✅ Уточняющие вопросы после workflow идут в Coze API (не в workflow)
- ✅ Контекст очищается ТОЛЬКО при "🔄 Новый диалог"
- ✅ Help button исправлен (Markdown parsing)
- ✅ Логи показывают передачу контекста: `📝 Отправляем уточняющий вопрос в Coze API`

---

## 📝 Коммиты

1. **6f89bd5**: Fix: Add 'input' parameter to interactive workflows (training_program, nutrition_plan)
2. **b0803c1**: Fix: Add workflow context saving for follow-up questions + Fix Help button Markdown parsing

---

## 🚀 Готовность к деплою

**Статус**: ✅ Готово к тестированию на сервере

**Требования**:
- ✅ Код протестирован локально
- ✅ Все изменения закоммичены в GitHub
- ✅ Документация создана (CONTEXT_TEST_GUIDE.md)
- ⏳ Ожидается тестирование на production сервере

**Следующий шаг**: Оплатить сервер и развернуть бота для полного тестирования с реальными пользователями.
