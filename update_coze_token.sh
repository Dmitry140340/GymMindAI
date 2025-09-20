#!/bin/bash

# Скрипт для обновления COZE токена на сервере
echo "🔑 Обновление COZE API токена..."

NEW_TOKEN="pat_fAHGFHej2Ek6kUE423HXkuuk7tYJVKjIr1zGS0sKAWddHK9c2qkJP5C30C2VW3mG"

# Путь к .env файлу
ENV_FILE="/root/FitnessBotAI/.env"

if [ -f "$ENV_FILE" ]; then
    echo "📁 Найден .env файл: $ENV_FILE"
    
    # Создаем резервную копию
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Создана резервная копия .env"
    
    # Обновляем токен
    if grep -q "COZE_API_KEY=" "$ENV_FILE"; then
        # Заменяем существующую строку
        sed -i "s|COZE_API_KEY=.*|COZE_API_KEY=$NEW_TOKEN|" "$ENV_FILE"
        echo "✅ COZE_API_KEY обновлен в существующем файле"
    else
        # Добавляем новую строку
        echo "COZE_API_KEY=$NEW_TOKEN" >> "$ENV_FILE"
        echo "✅ COZE_API_KEY добавлен в файл"
    fi
    
    # Показываем текущее значение
    echo "🔍 Текущее значение:"
    grep "COZE_API_KEY" "$ENV_FILE"
    
    echo ""
    echo "🔄 Перезапустите бота для применения изменений:"
    echo "   pm2 restart fitness-bot-ai --update-env"
    
else
    echo "❌ Файл .env не найден: $ENV_FILE"
    echo "💡 Создайте файл .env на основе .env.example"
fi