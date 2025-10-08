# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Webhook не работает из-за порта

## Проблема

YooKassa требует:
- ✅ Протокол HTTPS
- ❌ **Порт 443 или 8443 ТОЛЬКО**

Ваш текущий webhook:
- ❌ `https://85.198.80.51:3004/webhook/payment` — **ПОРТ 3004 НЕ ПОДДЕРЖИВАЕТСЯ!**

## Решение

Нужно настроить **nginx** на сервере, чтобы:
1. Nginx слушал на порту **443** (HTTPS)
2. Перенаправлял запросы `/webhook/payment` на `localhost:3004`

---

## 🔧 Настройка nginx на сервере

### 1. Подключитесь к серверу

```bash
ssh root@85.198.80.51
```

### 2. Установите nginx (если не установлен)

```bash
apt update
apt install nginx -y
```

### 3. Создайте конфигурацию nginx

```bash
nano /etc/nginx/sites-available/yookassa-webhook
```

Вставьте конфигурацию:

```nginx
server {
    listen 443 ssl;
    server_name 85.198.80.51;

    # SSL сертификат (самоподписанный подойдёт)
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Webhook для YooKassa
    location /webhook/payment {
        proxy_pass http://localhost:3004/webhook/payment;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Healthcheck
    location / {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

### 4. Создайте самоподписанный SSL сертификат

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=FitnessBot/CN=85.198.80.51"
```

### 5. Активируйте конфигурацию

```bash
ln -s /etc/nginx/sites-available/yookassa-webhook /etc/nginx/sites-enabled/
nginx -t  # Проверка конфигурации
systemctl restart nginx
systemctl enable nginx
```

### 6. Откройте порт 443 в firewall

```bash
ufw allow 443/tcp
ufw status
```

---

## ✅ Проверка

### С вашего компьютера (Windows):

```powershell
curl -X POST https://85.198.80.51/webhook/payment `
  -H "Content-Type: application/json" `
  -d '{"type":"notification","event":"payment.succeeded","object":{"id":"test"}}'
```

Должно вернуться: `OK`

### На сервере:

```bash
# Проверить, что nginx работает
systemctl status nginx

# Проверить логи nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Проверить, что бот получил webhook
# (смотрите логи бота)
```

---

## 🎯 Итоговая настройка в YooKassa

После настройки nginx, URL в YooKassa должен быть:

```
https://85.198.80.51/webhook/payment
```

**БЕЗ ПОРТА!** Nginx сам перенаправит на 3004.

---

## 📝 Альтернатива — порт 8443

Если порт 443 занят, можете использовать 8443:

```nginx
server {
    listen 8443 ssl;
    # ... остальное то же самое
}
```

Тогда URL будет:
```
https://85.198.80.51:8443/webhook/payment
```

---

## 🚀 После настройки

1. ✅ Перезапустите nginx
2. ✅ Проверьте curl запрос
3. ✅ Сделайте тестовый платёж
4. ✅ Проверьте, что webhook пришёл в логах бота

**Webhook должен заработать автоматически!**
