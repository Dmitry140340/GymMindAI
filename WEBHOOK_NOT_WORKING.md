# ⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА: Webhook YooKassa не работает!

## 🔴 Что произошло

После оплаты 150₽ подписка не активировалась автоматически.

**Payment ID:** `30787ba1-000f-5001-9000-1466f59e17bb`  
**Статус платежа:** `paid: true` (деньги списаны)  
**Статус в боте:** Подписка НЕ активирована  
**Причина:** Webhook от YooKassa не пришел на сервер

## ✅ Подписка активирована вручную

Использована команда:
```bash
node activate_subscription_manual.js
```

**Результат:**
- ✅ Подписка ID: 43
- ✅ План: Базовый (100 запросов)
- ✅ Действует до: 08.11.2025
- ✅ Статус: active

## 🔧 НЕОБХОДИМО ИСПРАВИТЬ WEBHOOK!

### Проблема

YooKassa **НЕ ОТПРАВЛЯЕТ** уведомления на:
```
https://85.198.80.51/webhook/payment
```

### Возможные причины:

1. **Webhook НЕ настроен в YooKassa**
   - Зайдите в личный кабинет YooKassa
   - Проверьте раздел "Уведомления"
   - Должен быть webhook на `https://85.198.80.51/webhook/payment`

2. **Сервер недоступен из интернета**
   ```bash
   # Проверьте доступность
   curl https://85.198.80.51/webhook/payment
   ```
   
   **Должен вернуть:**
   ```json
   {
     "message": "Payment webhook endpoint is ready",
     "method": "Use POST to send payment notifications"
   }
   ```

3. **Nginx не проксирует запросы**
   - На сервере должна быть настройка nginx
   - Проверьте конфиг: `/etc/nginx/sites-available/default`

4. **SSL сертификат невалиден**
   - YooKassa требует валидный SSL
   - Проверьте: `curl -v https://85.198.80.51/webhook/payment`

5. **Firewall блокирует запросы**
   - Порт 443 должен быть открыт
   - Проверьте: `sudo ufw status`

## 📋 Шаги для исправления

### Шаг 1: Проверьте настройки в YooKassa

1. Зайдите в https://yookassa.ru/
2. Выберите продакшн магазин (Shop ID: 1158662)
3. **Настройки** → **Уведомления (HTTP-уведомления)**
4. Проверьте webhook:

   **URL должен быть:**
   ```
   https://85.198.80.51/webhook/payment
   ```
   
   **Событие:**
   - ✅ `payment.succeeded`

5. Если webhook отсутствует - добавьте его!

---

### Шаг 2: Проверьте доступность сервера

**С вашего компьютера:**
```bash
curl https://85.198.80.51/webhook/payment
```

**Или откройте в браузере:**
```
https://85.198.80.51/webhook/payment
```

**Ожидаемый ответ:**
```json
{
  "message": "Payment webhook endpoint is ready",
  "method": "Use POST to send payment notifications",
  "timestamp": "2025-10-08T...",
  "server_ip": "..."
}
```

**Если ошибка:**
- Сервер недоступен из интернета
- Порт заблокирован
- SSL проблемы

---

### Шаг 3: Проверьте настройки Nginx

**На сервере:**
```bash
# Подключитесь к серверу
ssh root@85.198.80.51

# Проверьте конфиг nginx
cat /etc/nginx/sites-available/default | grep -A 10 webhook
```

**Должна быть конфигурация:**
```nginx
location /webhook/payment {
    proxy_pass http://localhost:3004/webhook/payment;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Если отсутствует - добавьте и перезагрузите nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Шаг 4: Проверьте SSL сертификат

```bash
# Проверка SSL
curl -v https://85.198.80.51/webhook/payment 2>&1 | grep -i ssl

# Должно быть: SSL certificate verify ok
```

**Если ошибка SSL - установите Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

### Шаг 5: Проверьте firewall

```bash
# На сервере
sudo ufw status

# Должен быть открыт порт 443
# Если нет - откройте:
sudo ufw allow 443/tcp
sudo ufw reload
```

---

### Шаг 6: Тестовый webhook

После настройки протестируйте webhook вручную:

```bash
# Отправьте тестовый POST запрос
curl -X POST https://85.198.80.51/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.succeeded",
    "object": {
      "id": "test-payment-id",
      "status": "succeeded",
      "paid": true,
      "metadata": {
        "telegram_id": "659874549",
        "plan_type": "basic",
        "requests_limit": "100"
      },
      "amount": {
        "value": "150.00",
        "currency": "RUB"
      }
    }
  }'
```

**Проверьте логи бота:**
Должно появиться:
```
🔔 Payment webhook received
✅ Payment successful for user 659874549
```

---

## 🚨 ВРЕМЕННОЕ РЕШЕНИЕ

Пока webhook не работает, активируйте подписки вручную:

### Для себя:
В боте используйте команду:
```
/admin_premium
```

### Для других пользователей:
1. Получите Payment ID из логов бота
2. Отредактируйте файл `activate_subscription_manual.js`:
   ```javascript
   const PAYMENT_ID = 'ИЗ_ЛОГОВ';
   const TELEGRAM_ID = ID_ПОЛЬЗОВАТЕЛЯ;
   const PLAN_TYPE = 'basic'; // или 'standard', 'premium'
   const AMOUNT = 150; // или 300, 450
   ```
3. Запустите:
   ```bash
   node activate_subscription_manual.js
   ```

---

## 📊 История проблемы

### Платеж №1
- **Date:** 08.10.2025 13:32
- **Payment ID:** 30787ba1-000f-5001-9000-1466f59e17bb
- **Amount:** 150₽
- **Status:** ✅ paid
- **Webhook:** ❌ НЕ получен
- **Решение:** Активирован вручную скриптом

---

## ✅ Контрольный список

Перед следующим платежом убедитесь:

- [ ] Webhook настроен в YooKassa (https://85.198.80.51/webhook/payment)
- [ ] Событие `payment.succeeded` включено
- [ ] Сервер доступен из интернета (curl проверка)
- [ ] Nginx проксирует /webhook/payment на localhost:3004
- [ ] SSL сертификат валиден
- [ ] Firewall разрешает порт 443
- [ ] Бот запущен и слушает на порту 3004
- [ ] В логах бота появляется "🔔 Payment webhook received" после тестового запроса

---

## 📞 Дальнейшие действия

1. **СРОЧНО:** Настройте webhook в YooKassa (инструкция выше)
2. **ВАЖНО:** Проверьте доступность сервера
3. **ТЕСТ:** Отправьте тестовый webhook (curl команда выше)
4. **ПРОВЕРКА:** Сделайте тестовый платеж и убедитесь, что подписка активируется автоматически

---

**Дата:** 08.10.2025  
**Статус:** ⚠️ Webhook НЕ работает, требуется настройка  
**Временное решение:** Активация вручную через скрипт
