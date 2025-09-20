#!/bin/bash

# Быстрая проверка готовности системы для ЮКассы
echo "🧪 ПРОВЕРКА ГОТОВНОСТИ СИСТЕМЫ ОПЛАТЫ"
echo "====================================="

# Функция для цветного вывода
print_status() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
        return 1
    fi
}

# Счетчик ошибок
errors=0

# 1. Проверка приложения на порту 3004
echo "1️⃣ Проверка локального приложения..."
curl -s http://localhost:3004/health > /dev/null
print_status $? "Приложение работает на порту 3004" || ((errors++))

# 2. Проверка HTTPS health
echo "2️⃣ Проверка HTTPS доступности..."
curl -sk https://85.198.80.51/health > /dev/null
print_status $? "HTTPS health endpoint доступен" || ((errors++))

# 3. Проверка HTTPS webhook
echo "3️⃣ Проверка HTTPS webhook..."
response=$(curl -sk -w "%{http_code}" https://85.198.80.51/webhook/payment -o /dev/null)
if [ "$response" = "200" ]; then
    print_status 0 "HTTPS webhook endpoint доступен"
else
    print_status 1 "HTTPS webhook endpoint недоступен (код: $response)" && ((errors++))
fi

# 4. Проверка Nginx
echo "4️⃣ Проверка Nginx..."
systemctl is-active --quiet nginx
print_status $? "Nginx запущен и активен" || ((errors++))

# 5. Проверка бота
echo "5️⃣ Проверка бота..."
systemctl is-active --quiet gymmind-bot
print_status $? "Бот запущен и активен" || ((errors++))

# 6. Проверка базы данных
echo "6️⃣ Проверка базы данных..."
if [ -f "/root/GymMindAI/data/subscriptions.db" ]; then
    print_status 0 "База данных существует"
else
    print_status 1 "База данных не найдена" && ((errors++))
fi

# 7. Проверка SSL сертификата
echo "7️⃣ Проверка SSL сертификата..."
if openssl s_client -connect 85.198.80.51:443 -servername 85.198.80.51 < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    print_status 0 "SSL сертификат действителен"
else
    print_status 1 "Проблемы с SSL сертификатом" && ((errors++))
fi

# 8. Проверка переменных окружения
echo "8️⃣ Проверка настроек..."
if [ -f "/root/GymMindAI/.env" ]; then
    if grep -q "YOOKASSA_" /root/GymMindAI/.env; then
        print_status 0 "Настройки ЮКассы найдены в .env"
    else
        print_status 1 "Настройки ЮКассы отсутствуют в .env" && ((errors++))
    fi
else
    print_status 1 "Файл .env не найден" && ((errors++))
fi

echo ""
echo "📊 ИТОГОВЫЙ РЕЗУЛЬТАТ:"
echo "====================="

if [ $errors -eq 0 ]; then
    echo "🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!"
    echo ""
    echo "✅ Система полностью готова для работы с ЮКассой"
    echo "✅ Используйте URL: https://85.198.80.51/webhook/payment"
    echo "✅ Можете запускать тестирование: node test_webhook_payment.js"
    echo ""
    echo "🔗 Полезные ссылки:"
    echo "   Health: https://85.198.80.51/health"
    echo "   Webhook: https://85.198.80.51/webhook/payment"
else
    echo "⚠️ НАЙДЕНО ОШИБОК: $errors"
    echo ""
    echo "❌ Необходимо исправить проблемы перед использованием"
    echo "📖 Смотрите инструкции в YOOKASSA_WEBHOOK_SETUP.md"
    echo ""
    echo "🛠️ Для автоматического исправления запустите:"
    echo "   bash setup_yookassa_webhook.sh"
fi

echo ""