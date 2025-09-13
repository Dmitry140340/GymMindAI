#!/bin/bash

# ===== СКРИПТ ПРОВЕРКИ СОСТОЯНИЯ СЕРВЕРА ПОСЛЕ CLOUD-INIT =====
echo "🔍 Проверка состояния сервера FitnessBotAI..."
echo "=============================================="

# Проверяем основную информацию о системе
echo "📋 Информация о системе:"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo ""

# Проверяем выполнение cloud-init
echo "☁️ Статус Cloud-init:"
if [ -f /var/log/cloud-init-output.log ]; then
    echo "✅ Лог cloud-init найден"
    echo "📄 Последние строки лога:"
    tail -n 10 /var/log/cloud-init-output.log
    echo ""
    
    # Проверяем на ошибки
    if grep -i "error\|failed\|fatal" /var/log/cloud-init-output.log > /dev/null; then
        echo "⚠️ Найдены ошибки в логе cloud-init!"
        grep -i "error\|failed\|fatal" /var/log/cloud-init-output.log | tail -5
    else
        echo "✅ Ошибок в cloud-init не найдено"
    fi
else
    echo "❌ Лог cloud-init не найден!"
fi
echo ""

# Проверяем установленные пакеты
echo "📦 Проверка установленных компонентов:"

# Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js не установлен"
fi

# npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm не установлен"
fi

# PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2: $(pm2 --version)"
else
    echo "❌ PM2 не установлен"
fi

# Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version | cut -d' ' -f3)"
else
    echo "❌ Git не установлен"
fi

# Nginx
if command -v nginx &> /dev/null; then
    echo "✅ Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
    echo "   Статус: $(systemctl is-active nginx)"
else
    echo "❌ Nginx не установлен"
fi
echo ""

# Проверяем пользователя botuser
echo "👤 Проверка пользователя botuser:"
if id "botuser" &>/dev/null; then
    echo "✅ Пользователь botuser создан"
    echo "   Домашняя папка: $(eval echo ~botuser)"
    echo "   Группы: $(groups botuser)"
else
    echo "❌ Пользователь botuser не создан"
fi
echo ""

# Проверяем репозиторий
echo "📁 Проверка репозитория GymMindAI:"
if [ -d "/home/botuser/GymMindAI" ]; then
    echo "✅ Репозиторий клонирован в /home/botuser/GymMindAI"
    echo "   Размер: $(du -sh /home/botuser/GymMindAI | cut -f1)"
    
    # Проверяем основные файлы
    cd /home/botuser/GymMindAI
    
    if [ -f "package.json" ]; then
        echo "✅ package.json найден"
    else
        echo "❌ package.json не найден"
    fi
    
    if [ -d "node_modules" ]; then
        echo "✅ node_modules установлены"
        echo "   Количество пакетов: $(ls node_modules | wc -l)"
    else
        echo "❌ node_modules не установлены"
    fi
    
    if [ -f ".env.template" ]; then
        echo "✅ .env.template найден"
    else
        echo "❌ .env.template не найден"
    fi
    
    if [ -f "deploy-production.sh" ]; then
        echo "✅ deploy-production.sh найден"
        if [ -x "deploy-production.sh" ]; then
            echo "   Скрипт исполняемый"
        else
            echo "   ⚠️ Скрипт не исполняемый (исправим позже)"
        fi
    else
        echo "❌ deploy-production.sh не найден"
    fi
    
else
    echo "❌ Репозиторий не клонирован"
fi
echo ""

# Проверяем сетевые настройки
echo "🌐 Сетевые настройки:"
echo "IP адрес: $(curl -s ifconfig.me || echo 'Не удалось получить')"
echo "Открытые порты:"
netstat -tuln | grep -E ':80|:443|:3004|:22' | head -10
echo ""

# Проверяем firewall
echo "🔥 Firewall (UFW):"
if command -v ufw &> /dev/null; then
    echo "✅ UFW установлен"
    echo "Статус: $(ufw status | head -1)"
    echo "Правила:"
    ufw status numbered | grep -E "80|443|3004|22" | head -5
else
    echo "❌ UFW не установлен"
fi
echo ""

# Проверяем ресурсы системы
echo "💾 Ресурсы системы:"
echo "Память:"
free -h | grep -E "Mem|Swap"
echo ""
echo "Диск:"
df -h / | tail -1
echo ""
echo "CPU:"
nproc && echo "ядер"
echo ""

# Проверяем логи
echo "📄 Директории логов:"
if [ -d "/var/log/fitnessbotai" ]; then
    echo "✅ /var/log/fitnessbotai создана"
    echo "   Владелец: $(ls -ld /var/log/fitnessbotai | awk '{print $3":"$4}')"
else
    echo "❌ /var/log/fitnessbotai не создана"
fi
echo ""

echo "🎯 ИТОГ ПРОВЕРКИ:"
echo "=================="

# Подсчитываем успешные компоненты
success_count=0
total_count=8

command -v node &> /dev/null && ((success_count++))
command -v npm &> /dev/null && ((success_count++))
command -v pm2 &> /dev/null && ((success_count++))
command -v git &> /dev/null && ((success_count++))
command -v nginx &> /dev/null && ((success_count++))
id "botuser" &>/dev/null && ((success_count++))
[ -d "/home/botuser/GymMindAI" ] && ((success_count++))
[ -f "/home/botuser/GymMindAI/package.json" ] && ((success_count++))

percentage=$((success_count * 100 / total_count))

echo "✅ Успешно настроено: $success_count/$total_count компонентов ($percentage%)"

if [ $success_count -eq $total_count ]; then
    echo "🎉 Сервер полностью готов к деплою!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "1. Настроить .env файл: cp /home/botuser/GymMindAI/.env.template /home/botuser/GymMindAI/.env"
    echo "2. Отредактировать .env: nano /home/botuser/GymMindAI/.env"
    echo "3. Запустить бота: su - botuser -c 'cd GymMindAI && ./deploy-production.sh'"
elif [ $success_count -ge 6 ]; then
    echo "⚠️ Сервер почти готов, есть небольшие проблемы"
    echo "💡 Рекомендуется ручная установка недостающих компонентов"
else
    echo "❌ Серьезные проблемы с настройкой сервера"
    echo "🔧 Требуется ручная настройка"
fi
echo ""
echo "📊 Для мониторинга используйте: /home/botuser/monitor.sh"
