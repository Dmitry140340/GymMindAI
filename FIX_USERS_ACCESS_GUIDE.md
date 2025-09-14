
# 🚀 ИНСТРУКЦИЯ: Проверка и исправление доступа для оплативших пользователей

## 🎯 Ситуация
Два пользователя совершили оплату, но не получили доступ к боту.

## ✅ Система исправлена
Все проблемы в коде исправлены. Теперь нужно проверить конкретных пользователей.

## 📋 ПЛАН ДЕЙСТВИЙ

### Шаг 1: Найти пользователей без доступа
```bash
node diagnosis_payment_system.js
```
Посмотрите раздел "👥 Пользователи без активных подписок"

### Шаг 2: Исправить доступ вручную
```bash
node fix_existing_payments.js
```

**Для каждого пользователя введите:**
- Telegram ID (можно узнать из логов бота или YooKassa)
- Тип плана (basic/standard/premium)
- ID платежа (если есть)

### Шаг 3: Проверить результат
После исправления запросите у пользователей:
1. Перезапустить бота командой `/start`
2. Нажать "📊 Мой статус" 
3. Проверить доступные функции

## 🔍 Альтернативный способ (через базу данных)

Если знаете Telegram ID пользователей:

```sql
-- Найти пользователя
SELECT * FROM users WHERE telegram_id = 'TELEGRAM_ID_ПОЛЬЗОВАТЕЛЯ';

-- Проверить подписки
SELECT s.* FROM subscriptions s 
JOIN users u ON s.user_id = u.id 
WHERE u.telegram_id = 'TELEGRAM_ID_ПОЛЬЗОВАТЕЛЯ';

-- Создать подписку вручную (если нужно)
INSERT INTO subscriptions 
(user_id, plan_type, status, start_date, end_date, payment_id, requests_limit, requests_used, created_at, updated_at)
SELECT u.id, 'standard', 'active', datetime('now'), datetime('now', '+1 month'), 'manual_fix_' || datetime('now'), 300, 0, datetime('now'), datetime('now')
FROM users u WHERE u.telegram_id = 'TELEGRAM_ID_ПОЛЬЗОВАТЕЛЯ';
```

## 📨 Уведомление пользователей

После исправления отправьте пользователям сообщение:

```
🎉 Доступ к боту восстановлен!

✅ Ваша подписка активирована
📊 Проверить статус: /start → "📊 Мой статус"  
🚀 Теперь доступны все функции бота

Приносим извинения за временные неудобства!
```

## 🔧 МОНИТОРИНГ (для будущих платежей)

### 1. Проверьте webhook URL в YooKassa:
- Должен быть: `https://ваш-домен.com/webhook/payment`
- Статус: активен

### 2. Мониторьте логи сервера:
```bash
# Логи webhook уведомлений
tail -f logs/server.log | grep "Payment webhook"

# Логи обновления подписок  
tail -f logs/server.log | grep "subscription"
```

### 3. Настройте переменную для админа:
```env
ADMIN_TELEGRAM_ID=ваш_telegram_id
```

## 🎯 Быстрая проверка системы

Тестовый платеж через curl:
```bash
curl -X POST http://localhost:3004/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.succeeded",
    "object": {
      "id": "test_' $(date +%s) '",
      "status": "succeeded", 
      "paid": true,
      "amount": {"value": "300.00", "currency": "RUB"},
      "metadata": {
        "telegram_id": "ВАШ_TELEGRAM_ID",
        "plan_type": "standard"  
      }
    }
  }'
```

## ⚡ Экстренное решение

Если нужно срочно дать доступ пользователю:
1. Узнайте его Telegram ID
2. Выполните:
```bash
node -e "
import('./src/services/database.js').then(async (db) => {
  await db.initDatabase();
  const result = await db.updateUserSubscription(TELEGRAM_ID, {
    subscription_type: 'standard',
    subscription_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    requests_limit: 300,
    requests_used: 0,
    payment_id: 'manual_' + Date.now()
  });
  console.log('Результат:', result);
  process.exit(0);
});
"
```

## ✅ ПРОВЕРОЧНЫЙ СПИСОК

- [ ] Система платежей исправлена
- [ ] Найдены пользователи без доступа  
- [ ] Исправлен доступ через `fix_existing_payments.js`
- [ ] Пользователи уведомлены о восстановлении доступа
- [ ] Пользователи проверили доступ в боте
- [ ] Webhook URL настроен в YooKassa
- [ ] Мониторинг логов настроен

**Результат: Все оплатившие пользователи получают мгновенный доступ к боту! 🚀**