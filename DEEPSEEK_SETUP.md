# ⚙️ Настройка DeepSeek API

## 📝 Шаги установки

### 1. Добавьте переменные в `.env`

Откройте файл `.env` и добавьте следующие строки:

```bash
# DeepSeek API - для ИИ-тренера
DEEPSEEK_API_KEY=sk-0945e3cceec44d19a48557dfbe13cfc0
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-reasoner
```

**Важно**: Файл `.env` находится в `.gitignore` и не коммитится в GitHub (для безопасности).

---

### 2. Проверьте `.env.example`

Убедитесь, что в `.env.example` есть шаблон:

```bash
# DeepSeek API - для ИИ-тренера
DEEPSEEK_API_KEY=sk-your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-reasoner
```

---

### 3. Перезапустите бота

```bash
npm start
```

При старте вы увидите логи:
```
🚀 Запуск DeepSeek Chat для пользователя: 12345
🔑 API Key: Установлен
🌐 Base URL: https://api.deepseek.com
🤖 Model: deepseek-reasoner
```

---

## 🔍 Отладка

### Проблема: "API ключ не настроен"

**Симптом**:
```
❌ DeepSeek API ключ не настроен!
```

**Решение**:
1. Проверьте, что `.env` содержит `DEEPSEEK_API_KEY`
2. Проверьте, что ключ начинается с `sk-`
3. Перезапустите бота после изменения `.env`

---

### Проблема: "401 Unauthorized"

**Симптом**:
```
🔑 Неверный API ключ для DeepSeek
```

**Решение**:
1. Проверьте правильность API ключа
2. Убедитесь, что ключ активен на https://platform.deepseek.com
3. Проверьте лимиты использования

---

### Проблема: "429 Too Many Requests"

**Симптом**:
```
⏱️ Превышен лимит запросов к DeepSeek
```

**Решение**:
1. Подождите несколько минут
2. Проверьте лимиты на платформе DeepSeek
3. Рассмотрите возможность увеличения лимитов

---

## 📊 Логирование

При каждом запросе к DeepSeek вы увидите:

```
🚀 Запуск DeepSeek Chat для пользователя: 659874549
💬 Сообщение: Что такое креатин?
📋 Инструкции: Отвечай как персональный фитнес‑тренер...
🔑 API Key: Установлен
🌐 Base URL: https://api.deepseek.com
🤖 Model: deepseek-reasoner
📚 История разговора (количество сообщений): 2

📥 Ответ DeepSeek - статус: 200
🧠 Reasoning content: Пользователь спрашивает о креатине...
✅ Финальный ответ: Креатин - это одна из самых изученных...
```

---

## 🎯 Проверка работы

### Тест 1: API ключ установлен
1. Запустите бота: `npm start`
2. Проверьте логи: должно быть `🔑 API Key: Установлен`

### Тест 2: Простой запрос
1. Откройте бота в Telegram
2. Нажмите "🤖 ИИ-тренер"
3. Напишите: "Привет!"
4. **Ожидаемый результат**: Ответ от DeepSeek

### Тест 3: Контекст разговора
1. Напишите: "Что такое креатин?"
2. Дождитесь ответа
3. Напишите: "А как его принимать?"
4. **Ожидаемый результат**: Ответ с учётом контекста про креатин

---

## 📌 Полезные ссылки

- **DeepSeek Platform**: https://platform.deepseek.com
- **DeepSeek Documentation**: https://api-docs.deepseek.com
- **DeepSeek API Keys**: https://platform.deepseek.com/api_keys
- **Модель deepseek-reasoner**: https://api-docs.deepseek.com/guides/reasoning_model

---

## ✅ Checklist

- [ ] Переменные добавлены в `.env`
- [ ] Переменные добавлены в `.env.example`
- [ ] Бот перезапущен
- [ ] Логи показывают "🔑 API Key: Установлен"
- [ ] Тестовый запрос прошёл успешно
- [ ] Контекст разговора работает

---

**Готово!** DeepSeek API настроен и готов к использованию. 🎉
