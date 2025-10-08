#!/bin/bash

# Автоматическая настройка nginx для webhook YooKassa
# Запускать на сервере: bash setup_nginx_webhook.sh

set -e

echo "🚀 Настройка nginx для webhook YooKassa..."

# 1. Установка nginx
echo "📦 Установка nginx..."
apt update
apt install nginx -y

# 2. Создание SSL сертификата
echo "🔐 Создание самоподписанного SSL сертификата..."
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=FitnessBot/CN=85.198.80.51"

# 3. Создание конфигурации nginx
echo "⚙️  Создание конфигурации nginx..."
cat > /etc/nginx/sites-available/yookassa-webhook << 'EOF'
server {
    listen 443 ssl;
    server_name 85.198.80.51;

    # SSL сертификат
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
        
        # Логирование webhook запросов
        access_log /var/log/nginx/webhook.log;
        error_log /var/log/nginx/webhook_error.log;
    }

    # Healthcheck
    location / {
        return 200 "Webhook server is running";
        add_header Content-Type text/plain;
    }
}
EOF

# 4. Активация конфигурации
echo "🔗 Активация конфигурации..."
ln -sf /etc/nginx/sites-available/yookassa-webhook /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации, если мешает
rm -f /etc/nginx/sites-enabled/default

# 5. Проверка конфигурации
echo "✅ Проверка конфигурации nginx..."
nginx -t

# 6. Перезапуск nginx
echo "🔄 Перезапуск nginx..."
systemctl restart nginx
systemctl enable nginx

# 7. Открытие порта в firewall
echo "🔓 Открытие порта 443 в firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 443/tcp
    ufw status
fi

# 8. Проверка статуса
echo ""
echo "✅ Nginx настроен успешно!"
echo ""
echo "📊 Статус nginx:"
systemctl status nginx --no-pager

echo ""
echo "🌐 Webhook URL для YooKassa:"
echo "   https://85.198.80.51/webhook/payment"
echo ""
echo "🧪 Тест webhook:"
echo "   curl -X POST https://85.198.80.51/webhook/payment \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"type\":\"notification\",\"event\":\"payment.succeeded\",\"object\":{\"id\":\"test\"}}'"
echo ""
echo "📝 Логи nginx:"
echo "   tail -f /var/log/nginx/webhook.log"
echo "   tail -f /var/log/nginx/webhook_error.log"
echo ""
echo "✅ ГОТОВО! Webhook должен заработать."
