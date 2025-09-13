# ====================================================================
# КОМАНДЫ ДЛЯ ПРОВЕРКИ И НАСТРОЙКИ СЕРВЕРА TIMEWEB
# Скопируйте и вставьте эти команды после подключения к серверу
# ====================================================================

# ==========================================
# 1. БАЗОВАЯ ПРОВЕРКА СИСТЕМЫ
# ==========================================
echo "🔍 Проверка системы..."
whoami
pwd
uname -a
lsb_release -a

# ==========================================
# 2. ПРОВЕРКА CLOUD-INIT ЛОГОВ  
# ==========================================
echo -e "\n📄 Проверка cloud-init логов..."
if [ -f /var/log/cloud-init-output.log ]; then
    echo "✅ Cloud-init лог найден"
    echo "📋 Последние 20 строк:"
    tail -n 20 /var/log/cloud-init-output.log
    
    echo -e "\n🔍 Поиск ошибок:"
    if grep -i "error\|failed\|fatal" /var/log/cloud-init-output.log | tail -5; then
        echo "⚠️ Найдены ошибки выше"
    else
        echo "✅ Критических ошибок не найдено"
    fi
else
    echo "❌ Cloud-init лог не найден!"
fi

# ==========================================
# 3. ПРОВЕРКА УСТАНОВЛЕННЫХ КОМПОНЕНТОВ
# ==========================================
echo -e "\n🔧 Проверка установленных компонентов..."

# Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js НЕ установлен"
fi

# npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm НЕ установлен"
fi

# PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2: $(pm2 --version)"
else
    echo "❌ PM2 НЕ установлен"
fi

# Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version | cut -d' ' -f3)"
else
    echo "❌ Git НЕ установлен"
fi

# Nginx
if command -v nginx &> /dev/null; then
    echo "✅ Nginx: $(nginx -v 2>&1 | cut -d' ' -f3)"
    echo "   Статус: $(systemctl is-active nginx 2>/dev/null || echo 'не запущен')"
else
    echo "❌ Nginx НЕ установлен"
fi

# ==========================================
# 4. ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ BOTUSER
# ==========================================
echo -e "\n👤 Проверка пользователя botuser..."
if id "botuser" &>/dev/null; then
    echo "✅ Пользователь botuser создан"
    echo "   Домашняя папка: $(eval echo ~botuser)"
    echo "   Группы: $(groups botuser)"
else
    echo "❌ Пользователь botuser НЕ создан"
fi

# ==========================================
# 5. ПРОВЕРКА РЕПОЗИТОРИЯ
# ==========================================
echo -e "\n📁 Проверка репозитория GymMindAI..."
if [ -d "/home/botuser/GymMindAI" ]; then
    echo "✅ Репозиторий клонирован"
    echo "   Путь: /home/botuser/GymMindAI"
    echo "   Размер: $(du -sh /home/botuser/GymMindAI 2>/dev/null | cut -f1 || echo 'неизвестно')"
    
    echo -e "\n📋 Содержимое репозитория:"
    ls -la /home/botuser/GymMindAI/ | head -15
    
    # Проверяем ключевые файлы
    cd /home/botuser/GymMindAI 2>/dev/null || echo "Не удалось перейти в директорию"
    
    echo -e "\n🔍 Проверка ключевых файлов:"
    [ -f "package.json" ] && echo "✅ package.json" || echo "❌ package.json"
    [ -f "src/index.js" ] && echo "✅ src/index.js" || echo "❌ src/index.js"
    [ -f ".env.template" ] && echo "✅ .env.template" || echo "❌ .env.template"
    [ -f "deploy-production.sh" ] && echo "✅ deploy-production.sh" || echo "❌ deploy-production.sh"
    [ -d "node_modules" ] && echo "✅ node_modules ($(ls node_modules 2>/dev/null | wc -l) пакетов)" || echo "❌ node_modules НЕ установлены"
    
else
    echo "❌ Репозиторий НЕ клонирован"
fi

# ==========================================
# 6. СИСТЕМНАЯ ИНФОРМАЦИЯ
# ==========================================
echo -e "\n💾 Системные ресурсы:"
echo "Память:"
free -h
echo -e "\nДиск:"
df -h /
echo -e "\nСеть:"
ip addr show | grep -E "inet.*scope global" | head -3

# ==========================================
# 7. ИТОГОВАЯ ОЦЕНКА
# ==========================================
echo -e "\n🎯 ИТОГОВАЯ ОЦЕНКА ГОТОВНОСТИ:"
echo "================================="

# Подсчет готовых компонентов
ready_count=0
total_count=6

command -v node &> /dev/null && ((ready_count++))
command -v npm &> /dev/null && ((ready_count++))
command -v pm2 &> /dev/null && ((ready_count++))
command -v git &> /dev/null && ((ready_count++))
id "botuser" &>/dev/null && ((ready_count++))
[ -d "/home/botuser/GymMindAI" ] && ((ready_count++))

percentage=$((ready_count * 100 / total_count))

echo "Готовность: $ready_count/$total_count компонентов ($percentage%)"

if [ $ready_count -eq $total_count ]; then
    echo "🎉 СЕРВЕР ПОЛНОСТЬЮ ГОТОВ!"
    echo ""
    echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
    echo "su - botuser"
    echo "cd GymMindAI"
    echo "cp .env.template .env"
    echo "nano .env  # Заполните токены"
    echo "./deploy-production.sh"
    
elif [ $ready_count -ge 4 ]; then
    echo "⚠️ СЕРВЕР ПОЧТИ ГОТОВ (нужны мелкие доработки)"
    echo ""
    echo "🔧 КОМАНДЫ ДЛЯ ДОУСТАНОВКИ:"
    
    if ! command -v node &> /dev/null; then
        echo "# Установка Node.js:"
        echo "curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -"
        echo "apt-get install -y nodejs"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        echo "# Установка PM2:"
        echo "npm install -g pm2"
    fi
    
    if ! id "botuser" &>/dev/null; then
        echo "# Создание пользователя:"
        echo "useradd -m -s /bin/bash botuser"
        echo "usermod -aG sudo botuser"
    fi
    
    if [ ! -d "/home/botuser/GymMindAI" ]; then
        echo "# Клонирование репозитория:"
        echo "cd /home/botuser"
        echo "sudo -u botuser git clone https://github.com/Dmitry140340/GymMindAI.git"
        echo "chown -R botuser:botuser /home/botuser/GymMindAI"
        echo "cd /home/botuser/GymMindAI"
        echo "sudo -u botuser npm install"
    fi
    
else
    echo "❌ ТРЕБУЕТСЯ СЕРЬЕЗНАЯ ДОРАБОТКА"
    echo ""
    echo "🔧 ПОЛНАЯ УСТАНОВКА:"
    echo "apt update && apt upgrade -y"
    echo "curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -"
    echo "apt-get install -y nodejs git nginx"
    echo "npm install -g pm2"
    echo "useradd -m -s /bin/bash botuser"
    echo "usermod -aG sudo botuser"
    echo "cd /home/botuser"
    echo "sudo -u botuser git clone https://github.com/Dmitry140340/GymMindAI.git"
    echo "chown -R botuser:botuser /home/botuser/GymMindAI"
    echo "cd /home/botuser/GymMindAI"
    echo "sudo -u botuser npm install"
fi

echo -e "\n🔍 Для повторной проверки выполните этот скрипт снова"
echo "💡 Все команды можно копировать и выполнять по отдельности"
