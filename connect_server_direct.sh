#!/bin/bash

echo "🚀 Подключение к серверу FitnessBot"
echo "=================================="
echo "🔗 Сервер: 85.198.80.51"
echo "👤 Пользователь: root"
echo "📁 Директория проекта: /var/www/bot"
echo ""

# Подключение к серверу с автоматическим принятием ключа
ssh -o StrictHostKeyChecking=no root@85.198.80.51