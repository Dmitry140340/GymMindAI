# Отчет о проверке готовности бота

**Дата проверки:** 05.10.2025, 20:19:39

## Результаты

- **Всего проверок:** 31
- **Успешно:** 22
- **Ошибок:** 9
- **Предупреждений:** 0
- **Готовность:** 71.0%

## Статус

❌ **НЕ ГОТОВ К ЗАПУСКУ**

## Детальные результаты

✅ src/index.js
✅ src/bot/handlers.js
✅ src/bot/keyboards.js
✅ src/services/database.js
✅ src/services/coze.js
✅ src/services/payment.js
✅ package.json
✅ .env
✅ node-telegram-bot-api v^0.66.0
✅ axios v^1.6.2
✅ dotenv v^16.3.1
✅ express v^4.18.2
✅ sqlite3 v^5.1.6
✅ uuid v^9.0.1
❌ BOT_TOKEN - отсутствует
❌ COZE_API_TOKEN - отсутствует
❌ BOT_ID - отсутствует
❌ YOOKASSA_SHOP_ID - отсутствует
❌ YOOKASSA_SECRET_KEY - отсутствует
❌ WEBHOOK_DOMAIN - отсутствует
✅ База данных существует (64.00 KB)
❌ Обработчик start_work отсутствует
❌ Обработчик my_status отсутствует
❌ Обработчик pay_monthly отсутствует
✅ Обработчик accept_agreement найден
✅ Обработчик main_menu найден
✅ Клавиатура mainKeyboard найдена
✅ Клавиатура subscriptionKeyboard найдена
✅ Клавиатура userAgreementKeyboard найдена
✅ Клавиатура aiToolsKeyboard найдена
✅ Клавиатура analyticsKeyboard найдена

## Рекомендации

Критические проблемы:
  - BOT_TOKEN - отсутствует
  - COZE_API_TOKEN - отсутствует
  - BOT_ID - отсутствует
  - YOOKASSA_SHOP_ID - отсутствует
  - YOOKASSA_SECRET_KEY - отсутствует
  - WEBHOOK_DOMAIN - отсутствует
  - Обработчик start_work отсутствует
  - Обработчик my_status отсутствует
  - Обработчик pay_monthly отсутствует

Рекомендуется:
  1. Проверить установку зависимостей: npm install
  2. Настроить файл .env
  3. Запустить автоисправление: node auto_fix_buttons.js

---

*Автоматически сгенерирован системой проверки FitnessBotAI*
