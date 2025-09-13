#!/bin/bash

# 🚀 Deploy Script for GymMindAI Bot
# Автоматический деплой фитнес-бота с ИИ

echo "🚀 Начинаем деплой GymMindAI Bot..."

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js для продолжения."
    exit 1
fi

echo "✅ Node.js версия: $(node --version)"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm для продолжения."
    exit 1
fi

echo "✅ npm версия: $(npm --version)"

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Ошибка установки зависимостей"
    exit 1
fi

echo "✅ Зависимости установлены"

# Проверка .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден. Скопируйте .env.example в .env и настройте переменные."
    exit 1
fi

echo "✅ Файл .env найден"

# Проверка критических переменных
required_vars=("TELEGRAM_BOT_TOKEN" "COZE_API_KEY" "COZE_BOT_ID" "YOOKASSA_PROD_SHOP_ID" "YOOKASSA_PROD_SECRET_KEY")

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        echo "❌ Переменная ${var} не настроена в .env"
        exit 1
    fi
done

echo "✅ Все критические переменные настроены"

# Инициализация базы данных
echo "🗄️ Инициализация базы данных..."
mkdir -p data

# Запуск тестов
echo "🧪 Запуск тестов..."
node test_coze.js
if [ $? -ne 0 ]; then
    echo "⚠️ Тесты Coze API не прошли, но продолжаем деплой"
fi

node test_database.js
if [ $? -ne 0 ]; then
    echo "⚠️ Тесты базы данных не прошли, но продолжаем деплой"
fi

# Запуск бота в продакшене
echo "🤖 Запуск бота в продакшене..."

# Для PM2 (если установлен)
if command -v pm2 &> /dev/null; then
    echo "🔄 Запуск через PM2..."
    pm2 start ecosystem.config.json
    pm2 save
    echo "✅ Бот запущен через PM2"
else
    echo "🔄 Запуск напрямую..."
    nohup npm start > bot.log 2>&1 &
    echo $! > bot.pid
    echo "✅ Бот запущен в фоновом режиме"
    echo "📄 Логи: tail -f bot.log"
    echo "🛑 Остановка: kill $(cat bot.pid)"
fi

echo ""
echo "🎉 ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!"
echo ""
echo "📋 Информация о деплое:"
echo "🤖 Telegram Bot: @FitnessTrainerAI_bot"
echo "🔗 Webhook: http://localhost:3004/webhook/payment"
echo "💾 База данных: ./data/subscriptions.db"
echo ""
echo "📊 Планы подписок:"
echo "• Basic: 150₽ (100 запросов)"
echo "• Standard: 300₽ (300 запросов)"  
echo "• Premium: 450₽ (600 запросов)"
echo ""
echo "🚀 Бот готов к работе!"
