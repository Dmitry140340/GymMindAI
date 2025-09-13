# 🔄 Автоматическое обновление бота на сервере

## 📋 Варианты настройки автоматического деплоя:

### 🎯 **Вариант 1: GitHub Webhooks (Рекомендуется)**

1. **Создать webhook script на сервере:**
```bash
# /home/botuser/webhook.js
const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'ваш_секретный_ключ';

app.post('/github-webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  
  // Проверка подписи
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  if (signature === digest && req.body.ref === 'refs/heads/main') {
    console.log('🔄 Получен push в main, обновляем бота...');
    
    exec('cd /home/botuser/GymMindAI && git pull && systemctl restart fitnessbotai', 
      (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Ошибка обновления:', error);
        } else {
          console.log('✅ Бот успешно обновлен');
        }
      });
  }
  
  res.status(200).send('OK');
});

app.listen(3005, () => {
  console.log('🎣 Webhook слушает на порту 3005');
});
```

2. **Настроить webhook в GitHub:**
- Репозиторий → Settings → Webhooks → Add webhook
- URL: `http://85.198.80.51:3005/github-webhook`
- Content type: `application/json`
- Secret: ваш секретный ключ
- Events: Just the push event

### 🎯 **Вариант 2: GitHub Actions (Более продвинутый)**

1. **Создать `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.8
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SERVER_SSH_KEY }}
        script: |
          cd /home/botuser/GymMindAI
          git pull origin main
          npm install --production
          systemctl restart fitnessbotai
          echo "✅ Деплой завершен"
```

2. **Добавить secrets в GitHub:**
- `SERVER_HOST`: 85.198.80.51
- `SERVER_USER`: root
- `SERVER_SSH_KEY`: ваш приватный SSH ключ

### 🎯 **Вариант 3: Простой cron script (Самый простой)**

```bash
# Создать скрипт /home/botuser/auto-update.sh
#!/bin/bash
cd /home/botuser/GymMindAI

# Проверяем есть ли обновления
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ $LOCAL != $REMOTE ]; then
    echo "🔄 Найдены обновления, применяем..."
    git pull origin main
    npm install --production
    systemctl restart fitnessbotai
    echo "✅ Бот обновлен: $(date)"
else
    echo "📌 Обновлений нет: $(date)"
fi
```

```bash
# Добавить в crontab (каждые 5 минут)
*/5 * * * * /home/botuser/auto-update.sh >> /var/log/auto-update.log 2>&1
```

## 🛠 **Команды для ручного обновления (сейчас):**

```bash
# Подключиться к серверу
ssh -i ~/.ssh/timeweb_fitnessbotai root@85.198.80.51

# Обновить код
cd /home/botuser/GymMindAI
git pull origin main

# Установить новые зависимости (если есть)
sudo -u botuser npm install --production

# Перезапустить бота
systemctl restart fitnessbotai

# Проверить статус
systemctl status fitnessbotai
```

## 📊 **Полезные команды для управления:**

```bash
# Статус бота
systemctl status fitnessbotai

# Остановить бота
systemctl stop fitnessbotai

# Запустить бота
systemctl start fitnessbotai

# Перезапустить бота
systemctl restart fitnessbotai

# Логи бота
journalctl -u fitnessbotai -f

# Проверить какая версия кода на сервере
cd /home/botuser/GymMindAI && git log --oneline -5
```

## 🎯 **Рекомендация:**

1. **Сейчас**: Используйте ручное обновление командами выше
2. **Позже**: Настройте GitHub Actions для автоматического деплоя
3. **Продвинутый уровень**: Добавьте тесты перед деплоем
