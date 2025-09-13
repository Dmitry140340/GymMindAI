# 🚀 Cloud-init настройка для TimeWeb

## Автоматический деплой FitnessBotAI с помощью Cloud-init

### 📋 Что делают скрипты:

**cloud-init-timeweb.yaml** - полная продакшн настройка:
- ✅ Установка Node.js LTS + PM2
- ✅ Настройка Nginx с rate limiting
- ✅ Конфигурация firewall (UFW)
- ✅ Создание пользователя botuser
- ✅ Автоматическое клонирование репозитория
- ✅ Настройка логирования и мониторинга
- ✅ Готовые скрипты деплоя

**cloud-init-simple.yaml** - минимальная настройка для тестов

### 🛠 Как использовать:

#### 1. При создании сервера в TimeWeb:
1. Выберите Ubuntu 24.04
2. В разделе "Cloud-init" вставьте содержимое файла `cloud-init-timeweb.yaml`
3. Добавьте ваш SSH ключ
4. Создайте сервер

#### 2. После создания сервера:

```bash
# Подключаемся к серверу
ssh root@YOUR_SERVER_IP

# Переходим к пользователю botuser
su - botuser
cd GymMindAI

# Настраиваем переменные окружения
cp .env.template .env
nano .env  # Заполняем ваши данные

# Запускаем бота
./deploy-production.sh
```

### 🔧 Настройка .env файла:

Заполните следующие обязательные переменные:
```env
TELEGRAM_BOT_TOKEN=6925387250:AAH8Z...  # Токен от @BotFather
COZE_API_KEY=pat_xxx...                 # API ключ Coze
COZE_BOT_ID=7444280...                  # ID бота в Coze
YOOKASSA_PROD_SECRET_KEY=live_xxx...    # Секретный ключ YooKassa
WEBHOOK_URL=https://YOUR_DOMAIN.com/webhook
ADMIN_IDS=YOUR_TELEGRAM_ID
```

### 📊 Мониторинг и управление:

```bash
# Статус бота
pm2 status

# Просмотр логов
pm2 logs fitnessbotai

# Перезапуск
pm2 restart fitnessbotai

# Мониторинг системы
./monitor.sh

# Обновление кода
git pull && pm2 restart fitnessbotai
```

### 🔒 Настройка SSL (опционально):

```bash
# Установка SSL сертификата
sudo certbot --nginx -d yourdomain.com

# Автообновление сертификата
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 📁 Структура после установки:

```
/home/botuser/GymMindAI/           # Проект
├── src/                           # Исходный код
├── data/subscriptions.db          # База данных
├── .env                          # Переменные окружения
├── ecosystem.production.config.js # Конфигурация PM2
├── deploy-production.sh          # Скрипт деплоя
└── monitor.sh                    # Скрипт мониторинга

/var/log/fitnessbotai/            # Логи
├── combined.log                  # Все логи
├── out.log                      # Stdout
└── error.log                    # Ошибки

/etc/nginx/sites-available/       # Конфигурация Nginx
└── fitnessbotai                 # Конфиг для бота
```

### 🚨 Troubleshooting:

**Если cloud-init не выполнился:**
```bash
# Проверить логи cloud-init
sudo cat /var/log/cloud-init-output.log

# Переустановить пакеты вручную
sudo apt update && sudo apt install -y nodejs npm git nginx
```

**Если бот не запускается:**
```bash
# Проверить переменные окружения
cat /home/botuser/GymMindAI/.env

# Проверить логи
sudo -u botuser pm2 logs fitnessbotai

# Запустить вручную для отладки
cd /home/botuser/GymMindAI
sudo -u botuser node src/index.js
```

**Если webhook не работает:**
```bash
# Проверить Nginx
sudo nginx -t
sudo systemctl status nginx

# Проверить порты
sudo netstat -tlnp | grep :3004
sudo netstat -tlnp | grep :80
```

### 🎯 Готовые команды для быстрого старта:

1. **Скопируйте cloud-init-timeweb.yaml** в интерфейс TimeWeb
2. **Создайте сервер** с Ubuntu 24.04
3. **Подключитесь по SSH** и выполните:

```bash
su - botuser
cd GymMindAI
cp .env.template .env
nano .env  # Заполните ваши токены
./deploy-production.sh
```

**Готово! Ваш бот запущен и готов к работе! 🎉**
