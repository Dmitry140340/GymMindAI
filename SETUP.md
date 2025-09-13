# 🚀 GymMindAI Bot - Setup Instructions

## 📋 Системные требования

- **Node.js**: версия 18+ (рекомендуется 22.14.0)
- **npm**: версия 9+ (рекомендуется 10.9.2)
- **Операционная система**: Windows, macOS, Linux
- **Память**: минимум 512 MB RAM
- **Место на диске**: 200 MB

## ⚡ Быстрый запуск

### 1. Клонирование репозитория
```bash
git clone https://github.com/Dmitry140340/GymMindAI.git
cd GymMindAI
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
```

Отредактируйте `.env` файл, заполнив все необходимые переменные:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username

# Coze API
COZE_API_KEY=your_coze_api_key
COZE_BOT_ID=your_coze_bot_id

# YooKassa (Production)
PAYMENT_MODE=production
YOOKASSA_PROD_SHOP_ID=your_shop_id
YOOKASSA_PROD_SECRET_KEY=your_secret_key

# Admin
ADMIN_IDS=your_telegram_id
```

### 4. Запуск бота
```bash
# Разработка
npm run dev

# Продакшн
npm start
```

## 🔧 Детальная настройка

### Получение Telegram Bot Token
1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Введите имя и username бота
4. Скопируйте полученный токен

### Настройка Coze API
1. Зарегистрируйтесь на [coze.com](https://coze.com)
2. Создайте нового бота
3. Получите API ключ и Bot ID
4. Настройте workflow для фитнес-консультаций

### Настройка YooKassa
1. Зарегистрируйтесь в [yookassa.ru](https://yookassa.ru)
2. Получите Shop ID и Secret Key
3. Настройте webhook URL: `https://your-domain.com/webhook/payment`

## 🗄️ База данных

Бот использует SQLite для хранения данных:
- **Расположение**: `./data/subscriptions.db`
- **Автоматическая инициализация**: при первом запуске
- **Миграции**: выполняются автоматически

## 🚀 Деплой в продакшн

### С PM2 (рекомендуется)
```bash
npm install -g pm2
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

### С Docker
```bash
docker build -t gymmind-bot .
docker run -d --name gymmind-bot -p 3004:3004 gymmind-bot
```

### Обычный запуск
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🧪 Тестирование

Перед деплоем запустите тесты:
```bash
# Тест Coze API
node test_coze.js

# Тест базы данных  
node test_database.js

# Тест подписок
node test_subscriptions.js

# Тест платежей
node test_payment.js
```

## 📊 Мониторинг

### Логи
```bash
# PM2 логи
pm2 logs

# Обычные логи
tail -f bot.log
```

### Статус
```bash
# PM2 статус
pm2 status

# Проверка процесса
ps aux | grep node
```

## 🔒 Безопасность

1. **Никогда не коммитьте .env файл**
2. **Используйте HTTPS для webhook**
3. **Регулярно обновляйте зависимости**
4. **Проверяйте подписи webhook от YooKassa**

## 🆘 Устранение неполадок

### Бот не отвечает
- Проверьте токен бота
- Убедитесь, что бот запущен
- Проверьте логи на ошибки

### Ошибки платежей
- Проверьте YooKassa настройки
- Убедитесь в корректности webhook URL
- Проверьте режим работы (test/production)

### Проблемы с ИИ
- Проверьте Coze API ключ
- Убедитесь в корректности Bot ID
- Проверьте лимиты API

## 📞 Поддержка

- **GitHub Issues**: [создать issue](https://github.com/Dmitry140340/GymMindAI/issues)
- **Документация**: [README.md](./README.md)
- **Тесты**: [TEST_RESULTS.md](./TEST_RESULTS.md)
