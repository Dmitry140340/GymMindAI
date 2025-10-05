#!/bin/bash

# Скрипт для обновления бота на сервере через SSH
echo "🔄 Обновление FitnessBotAI на сервере TimeWeb..."

# Подключаемся к серверу и обновляем код
ssh -o StrictHostKeyChecking=no root@85.198.80.51 << 'EOF'
    echo "📂 Переходим в директорию проекта..."
    cd /root/FitnessBotAI
    
    echo "🔄 Обновляем код из GitHub..."
    git pull origin main
    
    echo "📦 Устанавливаем зависимости..."
    npm install
    
    echo "🔄 Перезапускаем бота через PM2..."
    pm2 restart fitness-bot-ai
    
    echo "📊 Проверяем статус..."
    pm2 status fitness-bot-ai
    
    echo "✅ Обновление завершено!"
EOF

echo "🏁 Скрипт обновления завершен"