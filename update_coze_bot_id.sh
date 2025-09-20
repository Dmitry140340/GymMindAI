#!/bin/bash

echo "🔄 Обновление COZE_BOT_ID на сервере"
echo "===================================="

# Новый BOT_ID
NEW_BOT_ID="7428947126656434182"
OLD_BOT_ID="7444280037326487566"

echo "📋 Старый BOT_ID: $OLD_BOT_ID"
echo "📋 Новый BOT_ID: $NEW_BOT_ID"
echo ""

# Подключение к серверу и обновление
echo "🔗 Подключение к серверу..."

ssh -o StrictHostKeyChecking=no root@85.198.80.51 << EOF
    cd /var/www/bot
    
    echo "📂 Текущая директория: \$(pwd)"
    
    # Создаем бэкап .env файла
    if [ -f .env ]; then
        cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
        echo "✅ Создан бэкап .env файла"
    fi
    
    # Показываем текущий BOT_ID
    echo "🔍 Текущий COZE_BOT_ID:"
    grep COZE_BOT_ID .env || echo "❌ COZE_BOT_ID не найден в .env"
    
    # Обновляем BOT_ID
    if grep -q "COZE_BOT_ID=" .env; then
        sed -i "s/COZE_BOT_ID=.*/COZE_BOT_ID=$NEW_BOT_ID/" .env
        echo "✅ COZE_BOT_ID обновлен"
    else
        echo "COZE_BOT_ID=$NEW_BOT_ID" >> .env
        echo "✅ COZE_BOT_ID добавлен в .env"
    fi
    
    # Проверяем обновление
    echo "🔍 Обновленный COZE_BOT_ID:"
    grep COZE_BOT_ID .env
    
    # Перезапускаем бота
    echo "🔄 Перезапуск бота..."
    pm2 restart ecosystem.config.js
    
    echo "✅ Обновление завершено!"
EOF

echo ""
echo "✅ Скрипт обновления выполнен!"