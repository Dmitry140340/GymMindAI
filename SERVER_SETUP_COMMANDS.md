# 🚀 Команды для подключения и настройки сервера TimeWeb

## 🔐 Подключение к серверу

### Вариант 1: SSH с паролем
```bash
ssh root@85.198.80.51
# Пароль: boNe?7vBEtkL-_
```

### Вариант 2: PowerShell (Windows)
```powershell
ssh root@85.198.80.51
# Введите пароль: boNe?7vBEtkL-_
```

## ✅ Первоначальная проверка сервера

После подключения выполните:

```bash
# 1. Проверим основную информацию
echo "Проверка системы:"
whoami
pwd
lsb_release -a

# 2. Проверим cloud-init лог
echo -e "\n=== Cloud-init лог (последние 20 строк) ==="
tail -n 20 /var/log/cloud-init-output.log

# 3. Проверим установленные компоненты
echo -e "\n=== Проверка установленных пакетов ==="
node --version 2>/dev/null && echo "✅ Node.js установлен" || echo "❌ Node.js НЕ установлен"
npm --version 2>/dev/null && echo "✅ npm установлен" || echo "❌ npm НЕ установлен"
pm2 --version 2>/dev/null && echo "✅ PM2 установлен" || echo "❌ PM2 НЕ установлен"
git --version 2>/dev/null && echo "✅ Git установлен" || echo "❌ Git НЕ установлен"
nginx -v 2>/dev/null && echo "✅ Nginx установлен" || echo "❌ Nginx НЕ установлен"

# 4. Проверим пользователя botuser
echo -e "\n=== Проверка пользователя botuser ==="
id botuser 2>/dev/null && echo "✅ Пользователь botuser создан" || echo "❌ Пользователь botuser НЕ создан"

# 5. Проверим репозиторий
echo -e "\n=== Проверка репозитория ==="
if [ -d "/home/botuser/GymMindAI" ]; then
    echo "✅ Репозиторий клонирован"
    ls -la /home/botuser/GymMindAI/ | head -10
else
    echo "❌ Репозиторий НЕ клонирован"
fi
```

## 🔧 Если cloud-init НЕ отработал полностью

### Ручная установка недостающих компонентов:

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# Установка дополнительных пакетов
apt install -y git nginx npm

# Установка PM2 глобально
npm install -g pm2

# Создание пользователя botuser (если не создан)
useradd -m -s /bin/bash botuser
usermod -aG sudo botuser

# Клонирование репозитория (если не клонирован)
cd /home/botuser
sudo -u botuser git clone https://github.com/Dmitry140340/GymMindAI.git
chown -R botuser:botuser /home/botuser/GymMindAI

# Установка зависимостей
cd /home/botuser/GymMindAI
sudo -u botuser npm install
```

## 📋 Следующие шаги после проверки:

### 1. Настройка переменных окружения:
```bash
# Переходим к пользователю botuser
su - botuser
cd GymMindAI

# Копируем шаблон .env
cp .env.template .env

# Редактируем .env файл
nano .env
```

### 2. Заполните в .env файле:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
COZE_API_KEY=ваш_api_ключ_coze
COZE_BOT_ID=ваш_bot_id
YOOKASSA_PROD_SECRET_KEY=ваш_секретный_ключ
WEBHOOK_URL=http://85.198.80.51/webhook
ADMIN_IDS=ваш_telegram_id
```

### 3. Запуск бота:
```bash
# Запуск через готовый скрипт
./deploy-production.sh

# ИЛИ запуск вручную:
pm2 start ecosystem.production.config.js
pm2 save
```

### 4. Проверка работы:
```bash
# Статус PM2
pm2 status

# Просмотр логов
pm2 logs fitnessbotai

# Мониторинг системы
./monitor.sh
```

## 🌐 Настройка webhook:

После запуска бота установите webhook URL:
```bash
curl -X POST "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"http://85.198.80.51/webhook"}'
```

## 🔍 Полезные команды для отладки:

```bash
# Проверка портов
netstat -tuln | grep -E ':80|:3004'

# Проверка процессов
ps aux | grep node

# Проверка логов системы
journalctl -u nginx -f

# Проверка дискового пространства
df -h

# Проверка памяти
free -h

# Перезапуск служб
systemctl restart nginx
pm2 restart fitnessbotai
```
