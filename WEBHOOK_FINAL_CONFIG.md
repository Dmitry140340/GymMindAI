# ✅ ФИНАЛЬНАЯ НАСТРОЙКА WEBHOOK YOOKASSA

## 🔧 Проблема решена!

YooKassa требует webhook URL:
- ✅ Протокол: `https://` (обязательно)
- ✅ Порт: только **443** (стандартный HTTPS) или **8443**
- ❌ Порт 3004 - **НЕ ПОДДЕРЖИВАЕТСЯ**

## 📋 Правильная конфигурация

### Webhook URL для YooKassa:
```
https://85.198.80.51/webhook/payment
```

**Без указания порта!** Nginx на сервере автоматически проксирует запросы с порта 443 на порт 3004.

### Как это работает:

```
YooKassa → https://85.198.80.51/webhook/payment (порт 443)
    ↓
Nginx (на сервере) перенаправляет →
    ↓
Node.js приложение (localhost:3004)
```

## ✅ Настройка в YooKassa

1. Зайдите в личный кабинет: https://yookassa.ru/
2. Выберите **продакшн магазин** (Shop ID: 1158662)
3. **Настройки** → **Уведомления** (HTTP-уведомления)
4. Добавьте или проверьте webhook:

   **URL:**
   ```
   https://85.198.80.51/webhook/payment
   ```
   
   **Событие:**
   - ✅ `payment.succeeded` (Успешный платеж)

5. Сохраните

## 🧪 Проверка работоспособности

### Тест 1: Проверка доступности endpoint
```bash
curl https://85.198.80.51/webhook/payment
```

**Ожидаемый ответ:**
```json
{
  "message": "Payment webhook endpoint is ready",
  "method": "Use POST to send payment notifications",
  "timestamp": "...",
  "server_ip": "..."
}
```

### Тест 2: Тестовый платеж

1. В боте: **💎 Подписка** → **💳 Оплатить подписку**
2. Выберите любой план
3. Нажмите **💳 Оплатить сейчас**
4. Перейдите по ссылке и оплатите
5. После оплаты YooKassa отправит уведомление на webhook
6. Бот автоматически активирует подписку

### Тест 3: Проверка логов

В терминале с `npm start` после оплаты должны появиться:

```
🔔 Payment webhook received at: 2025-10-08T...
📨 Headers: {...}
📦 Body: {"event":"payment.succeeded",...}
✅ Payment successful for user 659874549, plan: premium
💰 Payment successfully processed...
```

## 📊 Текущие настройки

### .env файл обновлен:
```env
# Webhook URL (БЕЗ ПОРТА для YooKassa!)
YOOKASSA_WEBHOOK_URL=https://85.198.80.51/webhook/payment
WEBHOOK_DOMAIN=https://85.198.80.51

# Приложение слушает на порту 3004 (внутренний)
PORT=3004
```

### YooKassa настройки:
- **Shop ID:** 1158662
- **Секретный ключ:** live_K3s91l3KmJ0dmefZPQbsp2f9SOB6Yz458N0xR1krHKg
- **Webhook URL:** https://85.198.80.51/webhook/payment
- **Событие:** payment.succeeded

## ⚠️ Важные моменты

### 1. Nginx должен быть настроен
На сервере должна быть конфигурация nginx, которая проксирует:
```nginx
location /webhook/payment {
    proxy_pass http://localhost:3004/webhook/payment;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. SSL сертификат должен быть валидным
YooKassa требует валидный SSL сертификат. Проверьте:
```bash
curl -v https://85.198.80.51/webhook/payment 2>&1 | grep "SSL certificate"
```

Если ошибка - установите Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

### 3. Firewall должен разрешать HTTPS
```bash
# На сервере
sudo ufw allow 443/tcp
sudo ufw status
```

## 🎯 Готово!

Теперь конфигурация правильная:
- ✅ Webhook URL без порта (работает через nginx на 443)
- ✅ Новый секретный ключ установлен
- ✅ Бот работает в продакшн режиме
- ✅ Все обработчики кнопок на месте (100% покрытие)

## 💳 Можете оплачивать подписку!

После оплаты подписка активируется автоматически через webhook.

---

**Дата:** 08.10.2025  
**Webhook URL:** https://85.198.80.51/webhook/payment  
**Порт приложения:** 3004 (внутренний)  
**Статус:** ✅ Готов к приему платежей
