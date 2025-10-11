# 🔄 Миграция с Coze API на DeepSeek API

**Дата**: 11.10.2025  
**Статус**: ✅ Завершено  

---

## 📋 Обзор изменений

Заменили **Coze API** на **DeepSeek API** для обработки запросов в режиме "ИИ-тренер". Логика работы осталась полностью идентичной.

---

## 🆕 Новый файл: `src/services/deepseek.js`

### Основные функции:

#### 1️⃣ `runDeepSeekChat(accessToken, message, userId, instructions)`
**Назначение**: Отправка запроса к DeepSeek API с сохранением контекста разговора

**Параметры**:
- `accessToken` - не используется (для совместимости с Coze)
- `message` - сообщение пользователя
- `userId` - ID пользователя для сохранения истории
- `instructions` - системные инструкции (role: system)

**Возвращает**:
```javascript
{
  success: true/false,
  message: "ответ от AI",
  data: {
    reasoning: "цепочка рассуждений модели",
    final_answer: "финальный ответ",
    model: "deepseek-reasoner",
    usage: { токены },
    api_version: "deepseek-v1"
  }
}
```

**Особенности**:
- ✅ Сохраняет историю разговора для каждого пользователя
- ✅ Автоматически добавляет системные инструкции в начало
- ✅ Использует модель `deepseek-reasoner` с reasoning capabilities
- ✅ **НЕ сохраняет** `reasoning_content` в истории (только финальный ответ)
- ✅ Максимальная длина ответа: 32K токенов

---

#### 2️⃣ `clearConversationHistory(userId)`
**Назначение**: Очистка истории разговора для пользователя

**Использование**:
```javascript
clearConversationHistory(user.id);
```

---

#### 3️⃣ `getConversationHistory(userId)`
**Назначение**: Получение истории разговора для пользователя

**Возвращает**: Массив сообщений `[{role, content}, ...]`

---

## 🔧 Изменения в `src/bot/handlers.js`

### Импорты (строка 38):
**Было**:
```javascript
import { runCozeChat } from '../services/coze_v3.js';
```

**Стало**:
```javascript
import { runDeepSeekChat, clearConversationHistory } from '../services/deepseek.js';
```

---

### Вызов AI (строка ~1833):
**Было**:
```javascript
console.log(`📝 Отправляем уточняющий вопрос в Coze API для пользователя ${user.id}`);
const aiResponse = await runCozeChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер...');
```

**Стало**:
```javascript
console.log(`📝 Отправляем уточняющий вопрос в DeepSeek API для пользователя ${user.id}`);
const aiResponse = await runDeepSeekChat(user.access_token, messageWithContext, user.id, 'Отвечай как персональный фитнес‑тренер...');
```

---

### Очистка истории при "🔄 Новый диалог" (строка ~1307):
**Было**:
```javascript
userStates.delete(user.id);
userWorkflowContext.delete(user.id);
userInteractiveWorkflow.delete(user.id);
```

**Стало**:
```javascript
userStates.delete(user.id);
userWorkflowContext.delete(user.id);
userInteractiveWorkflow.delete(user.id);

// Очищаем историю разговора в DeepSeek
clearConversationHistory(user.id);
```

---

## 🔑 Конфигурация DeepSeek API

### Константы в `deepseek.js`:
```javascript
const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = 'sk-0945e3cceec44d19a48557dfbe13cfc0';
const DEEPSEEK_MODEL = 'deepseek-reasoner';
```

### Формат запроса:
```javascript
POST https://api.deepseek.com/chat/completions
Headers:
  Authorization: Bearer sk-0945e3cceec44d19a48557dfbe13cfc0
  Content-Type: application/json

Body:
{
  "model": "deepseek-reasoner",
  "messages": [
    {"role": "system", "content": "Инструкции"},
    {"role": "user", "content": "Вопрос пользователя"},
    {"role": "assistant", "content": "Ответ AI"},
    {"role": "user", "content": "Следующий вопрос"}
  ],
  "stream": false,
  "max_tokens": 32000
}
```

---

## 🧠 Особенности модели `deepseek-reasoner`

### Reasoning Content (Цепочка рассуждений):
- Модель генерирует **Chain of Thought (CoT)** перед финальным ответом
- CoT доступен в поле `reasoning_content` ответа
- **Важно**: `reasoning_content` НЕ добавляется в историю разговора
- В историю добавляется ТОЛЬКО `content` (финальный ответ)

### Пример ответа от API:
```javascript
{
  choices: [{
    message: {
      role: "assistant",
      reasoning_content: "Цепочка рассуждений модели...",
      content: "Финальный ответ пользователю"
    }
  }],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 500,
    total_tokens: 600
  }
}
```

---

## 📊 Логика работы контекста

### Как сохраняется история:

1. **Первый запрос** (пользователь заходит в "ИИ-тренер"):
   ```javascript
   messages = [
     {role: "system", content: "Отвечай как персональный фитнес-тренер..."},
     {role: "user", content: "Как накачать грудь?"}
   ]
   ```

2. **Ответ AI сохраняется**:
   ```javascript
   messages = [
     {role: "system", content: "Отвечай как персональный фитнес-тренер..."},
     {role: "user", content: "Как накачать грудь?"},
     {role: "assistant", content: "Для развития груди рекомендую..."}
   ]
   ```

3. **Второй запрос** (уточняющий вопрос):
   ```javascript
   messages = [
     {role: "system", content: "Отвечай как персональный фитнес-тренер..."},
     {role: "user", content: "Как накачать грудь?"},
     {role: "assistant", content: "Для развития груди рекомендую..."},
     {role: "user", content: "А сколько раз в неделю?"}
   ]
   ```

**Результат**: DeepSeek видит весь контекст и отвечает с учётом предыдущего разговора!

---

## ✅ Преимущества DeepSeek API

1. **Reasoning Model**: Модель рассуждает перед ответом → более точные результаты
2. **Простота интеграции**: Совместим с OpenAI SDK
3. **Сохранение контекста**: Автоматическое управление историей разговора
4. **Длинные ответы**: До 32K токенов (можно до 64K)
5. **Стабильность**: Без polling и асинхронных проверок статуса

---

## 🧪 Тестирование

### Тест 1: Простой вопрос
1. Нажать "🤖 ИИ-тренер"
2. Написать: "Что такое креатин?"
3. **Ожидаемый результат**: Подробный ответ о креатине

### Тест 2: Контекст разговора
1. Нажать "🤖 ИИ-тренер"
2. Написать: "Как накачать грудь?"
3. Дождаться ответа
4. Написать: "А сколько раз в неделю?"
5. **Ожидаемый результат**: Ответ с учётом контекста (про тренировку груди)

### Тест 3: Длинный ответ
1. Нажать "🤖 ИИ-тренер"
2. Написать: "Напиши подробную программу тренировок на неделю"
3. **Ожидаемый результат**: Ответ автоматически разбивается на части (sendLongMessage)

### Тест 4: Очистка контекста
1. После разговора нажать "🔄 Новый диалог"
2. Написать новый вопрос
3. **Ожидаемый результат**: История очищена, AI не помнит предыдущий разговор

---

## 🔒 Безопасность

- ✅ API ключ хранится в константе (позже можно вынести в .env)
- ✅ Таймаут запроса: 120 секунд
- ✅ Обработка ошибок: 401, 429, 400, таймаут
- ✅ История разговора хранится в памяти (Map), очищается при "Новый диалог"

---

## 📝 Следующие шаги

1. ✅ Протестировать на локальном сервере
2. ✅ Проверить работу контекста
3. ✅ Проверить обработку длинных ответов
4. 🔄 При необходимости: вынести API ключ в .env
5. 🔄 При необходимости: добавить логирование reasoning_content для отладки

---

## 💾 Коммиты

Файлы изменены:
- ✅ `src/services/deepseek.js` - НОВЫЙ файл
- ✅ `src/bot/handlers.js` - обновлён импорт и вызовы API
- ✅ `DEEPSEEK_MIGRATION.md` - документация

---

**Миграция завершена!** 🎉
