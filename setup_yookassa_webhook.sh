#!/bin/bash

# Скрипт для настройки сервера под требования ЮКассы
# Запускать на сервере: bash setup_yookassa_webhook.sh

echo "🔧 Настройка сервера для webhook ЮКассы"
echo "======================================"

# Проверяем текущее состояние
echo "📋 Проверка текущего состояния..."

# Проверяем работу приложения на порту 3004  
echo "🔍 Проверка приложения на порту 3004..."
if curl -s http://localhost:3004/health > /dev/null; then
    echo "✅ Приложение работает на порту 3004"
else
    echo "❌ Приложение не отвечает на порту 3004"
    echo "Запустите: pm2 start fitness-bot-ai или systemctl start gymmind-bot"
    exit 1
fi

# Проверяем Nginx
echo "🔍 Проверка Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
else
    echo "❌ Nginx не запущен"
    echo "Запустите: systemctl start nginx"
fi

# Проверяем SSL сертификат
echo "🔍 Проверка SSL сертификата..."
if [ -f "/etc/letsencrypt/live/85.198.80.51/fullchain.pem" ]; then
    echo "✅ SSL сертификат найден"
    SSL_CERT="/etc/letsencrypt/live/85.198.80.51/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/85.198.80.51/privkey.pem"
elif [ -f "/etc/ssl/certs/server.crt" ]; then
    echo "✅ SSL сертификат найден (custom)"
    SSL_CERT="/etc/ssl/certs/server.crt"
    SSL_KEY="/etc/ssl/private/server.key"
else
    echo "❌ SSL сертификат не найден"
    echo "Необходимо настроить SSL. Варианты:"
    echo "1. Let's Encrypt: certbot --nginx -d 85.198.80.51"
    echo "2. Самоподписанный: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/server.key -out /etc/ssl/certs/server.crt"
    exit 1
fi

# Создаем конфигурацию Nginx для webhook
echo "⚙️  Создание конфигурации Nginx..."

cat > /etc/nginx/sites-available/gymmind-webhook << EOF
server {
    listen 443 ssl http2;
    server_name 85.198.80.51;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Webhook endpoint для ЮКассы
    location /webhook/payment {
        proxy_pass http://127.0.0.1:3004/webhook/payment;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Yookassa-Signature \$http_x_yookassa_signature;
        
        # Настройки для webhook
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3004/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3004/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name 85.198.80.51;
    return 301 https://\$server_name\$request_uri;
}
EOF

# Активируем конфигурацию
if [ ! -L "/etc/nginx/sites-enabled/gymmind-webhook" ]; then
    ln -s /etc/nginx/sites-available/gymmind-webhook /etc/nginx/sites-enabled/
    echo "✅ Конфигурация Nginx активирована"
else
    echo "✅ Конфигурация Nginx уже активна"
fi

# Удаляем конфликтующий default сайт если есть
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
    echo "✅ Удалена конфликтующая конфигурация default"
fi

# Проверяем конфигурацию Nginx
echo "🔍 Проверка конфигурации Nginx..."
if nginx -t; then
    echo "✅ Конфигурация Nginx корректна"
    systemctl reload nginx
    echo "✅ Nginx перезагружен"
else
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi

# Открываем порты в файрволле
echo "🔥 Настройка файрволла..."
ufw allow 80/tcp
ufw allow 443/tcp
echo "✅ Порты 80 и 443 открыты"

# Финальная проверка
echo "🧪 Финальная проверка..."

sleep 3

# Проверка HTTPS
if curl -sk https://85.198.80.51/health > /dev/null; then
    echo "✅ HTTPS работает"
    echo "✅ Health check доступен: https://85.198.80.51/health"
else
    echo "❌ HTTPS не работает"
fi

# Проверка webhook endpoint
if curl -sk https://85.198.80.51/webhook/payment > /dev/null; then
    echo "✅ Webhook endpoint доступен: https://85.198.80.51/webhook/payment"
else
    echo "❌ Webhook endpoint недоступен"
fi

echo ""
echo "🎉 НАСТРОЙКА ЗАВЕРШЕНА!"
echo "===================="
echo ""
echo "📋 Для ЮКассы используйте URL:"
echo "🔗 https://85.198.80.51/webhook/payment"
echo ""
echo "📋 Проверочные ссылки:"
echo "🔗 Health: https://85.198.80.51/health"
echo "🔗 Webhook: https://85.198.80.51/webhook/payment"
echo ""
echo "📋 Следующие шаги:"
echo "1. Зайдите в личный кабинет ЮКассы"
echo "2. Настройте webhook на URL: https://85.198.80.51/webhook/payment"
echo "3. Выберите событие: payment.succeeded"
echo "4. Протестируйте с помощью: node test_webhook_payment.js"