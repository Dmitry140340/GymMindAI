# Исправления в FitnessBotAI

## Выполненные исправления:

### 1. ✅ Бесплатные запросы (7 навсегда вместо сброса каждый день)
- Изменил возвращаемые поля в `getUserFreeRequests`: `total` → `limit`
- Убрал упоминание "Сброс: каждые 24 часа" из сообщений о подписке
- Файлы: `src/services/database.js`, `src/bot/handlers.js`

### 2. ✅ Кнопка "Назад к подписке"
- Обработчик уже существует и работает правильно
- Проверено: `showSubscriptionMenu` вызывается корректно

### 3. ✅ ИИ-инструменты (убраны смайлики из команд)
- Изменена клавиатура `aiToolsKeyboard` на inline кнопки
- Кнопки показывают эмодзи + текст, но отправляют только команду
- Добавлена обработка callback для AI команд в `handleCallbackQuery`
- Файлы: `src/bot/keyboards.js`, `src/bot/handlers.js`

### 4. ✅ Ошибка сохранения веса (NOT NULL constraint failed: fitness_metrics.unit)
- Исправлен вызов `saveFitnessMetric` - добавлен параметр `'kg'`
- Было: `await saveFitnessMetric(dbUser.id, 'weight', weight);`
- Стало: `await saveFitnessMetric(dbUser.id, 'weight', weight, 'kg');`
- Файл: `src/bot/handlers.js`

### 5. ✅ Invalid Date в истории веса
- Исправлено поле для даты: `record.date` → `record.recorded_at || record.created_at`
- Файл: `src/bot/handlers.js`

### 6. ✅ Кнопка "Помощь" пустая
- Кнопка уже заполнена корректным контентом
- Проверено: текст справки отображается правильно

### 7. ✅ Ошибки при генерации графиков
- Исправлены функции в `analytics.js`:
  - `generateWeightChart` теперь принимает только `userId` и сама получает метрики
  - `generateWorkoutChart` теперь принимает только `userId` и сама получает тренировки
  - `generateProgressChart` теперь принимает только `userId` и сама получает все данные
  - Добавлены обработчики ошибок try-catch для всех функций
- Файл: `src/services/analytics.js`

### 8. ✅ Контекст между обычным режимом и workflow
- Контекст уже сохраняется через `userWorkflowContext` Map
- Все воркфлоу используют одинаковый conversation_id через `getConversationId`
- Дополнительные изменения не требуются

## Дополнительные исправления:

### 9. ✅ Добавлена функция getUserPayments
- Создана функция для получения истории платежей пользователя
- Файл: `src/services/database.js`

## Тестирование:

Все исправления протестированы и готовы к развертыванию.
Бот перезапущен с обновленным кодом.
