#!/bin/bash

# 🚀 Скрипт автообновления FitnessBotAI на сервере
# Использует GitHub webhook или прямые команды для обновления

echo "🔄 ОБНОВЛЕНИЕ GYMMINDAI НА СЕРВЕРЕ"
echo "=================================="
echo "⏰ $(date)"
echo "📍 Сервер: 85.198.80.51"
echo "📂 Репозиторий: Dmitry140340/GymMindAI"
echo ""

# Функция для обновления через SSH (если доступен)
update_via_ssh() {
    echo "🔐 Попытка обновления через SSH..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes root@85.198.80.51 'echo "SSH подключение успешно"' 2>/dev/null; then
        echo "✅ SSH подключение установлено"
        
        echo "📥 Получение обновлений..."
        ssh root@85.198.80.51 'cd /root/GymMindAI && git pull origin main'
        
        echo "🔄 Перезапуск сервиса..."
        ssh root@85.198.80.51 'systemctl restart gymmind-bot'
        
        echo "📊 Проверка статуса..."
        ssh root@85.198.80.51 'systemctl status gymmind-bot --no-pager'
        
        return 0
    else
        echo "❌ SSH подключение недоступно"
        return 1
    fi
}

# Функция для проверки статуса бота через API
check_bot_status() {
    echo "🤖 Проверка статуса бота через Telegram API..."
    
    response=$(curl -s "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe")
    
    if echo "$response" | grep -q '"ok":true'; then
        echo "✅ Бот работает и отвечает на запросы"
        bot_username=$(echo "$response" | grep -o '"username":"[^"]*' | cut -d'"' -f4)
        echo "📱 Username: @$bot_username"
        return 0
    else
        echo "❌ Бот не отвечает или работает с ошибками"
        echo "📄 Ответ API: $response"
        return 1
    fi
}

# Функция для отправки уведомления админу
send_notification() {
    local status="$1"
    local message="$2"
    
    echo "📬 Отправка уведомления администратору..."
    
    if [ "$status" = "success" ]; then
        emoji="✅"
        text="$emoji ОБНОВЛЕНИЕ УСПЕШНО\\n\\n$message\\n\\n⏰ $(date)"
    else
        emoji="❌"
        text="$emoji ОШИБКА ОБНОВЛЕНИЯ\\n\\n$message\\n\\n⏰ $(date)"
    fi
    
    curl -s -X POST "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"659874549\", \"text\": \"$text\"}" > /dev/null
}

# Основная логика обновления
main() {
    echo "🏁 НАЧАЛО ПРОЦЕССА ОБНОВЛЕНИЯ"
    echo ""
    
    # Проверяем текущий статус бота
    if ! check_bot_status; then
        echo "⚠️ Бот уже не работает, попытка восстановления..."
    fi
    
    echo ""
    
    # Пытаемся обновить через SSH
    if update_via_ssh; then
        echo ""
        echo "🎉 ОБНОВЛЕНИЕ ЧЕРЕЗ SSH УСПЕШНО!"
        
        # Ждем немного и проверяем статус
        echo "⏳ Ожидание перезапуска сервиса (10 сек)..."
        sleep 10
        
        if check_bot_status; then
            send_notification "success" "Бот обновлен через SSH и работает корректно"
            echo "✅ ВСЕ ГОТОВО! Бот обновлен и работает."
        else
            send_notification "error" "Бот обновлен через SSH, но не отвечает на запросы"
            echo "⚠️ Бот обновлен, но возможны проблемы с запуском"
        fi
    else
        echo ""
        echo "⚠️ SSH НЕДОСТУПЕН - ТРЕБУЕТСЯ РУЧНОЕ ОБНОВЛЕНИЕ"
        echo ""
        echo "📋 ИНСТРУКЦИИ ДЛЯ РУЧНОГО ОБНОВЛЕНИЯ:"
        echo "1. Подключитесь к серверу: ssh root@85.198.80.51"
        echo "2. Перейдите в папку: cd /root/GymMindAI"
        echo "3. Получите обновления: git pull origin main"
        echo "4. Перезапустите сервис: systemctl restart gymmind-bot"
        echo "5. Проверьте статус: systemctl status gymmind-bot"
        echo ""
        
        if check_bot_status; then
            send_notification "success" "Код отправлен в GitHub. Бот работает, но требует ручного обновления на сервере"
            echo "✅ КОД ОБНОВЛЕН В GITHUB, НО СЕРВЕР ТРЕБУЕТ РУЧНОГО ОБНОВЛЕНИЯ"
        else
            send_notification "error" "Код отправлен в GitHub, но бот не отвечает. Требуется срочное ручное вмешательство"
            echo "❌ КРИТИЧЕСКАЯ СИТУАЦИЯ: БОТ НЕ РАБОТАЕТ"
        fi
    fi
    
    echo ""
    echo "🏁 ПРОЦЕСС ОБНОВЛЕНИЯ ЗАВЕРШЕН"
    echo "⏰ $(date)"
}

# Запуск основной функции
main "$@"
