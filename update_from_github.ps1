# PowerShell скрипт для обновления бота с GitHub
Write-Host "🔄 Обновление бота с GitHub" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# SSH ключ и параметры подключения
$sshKey = "$env:USERPROFILE\.ssh\timeweb_fitnessbotai"
$server = "root@85.198.80.51"

Write-Host "🔑 Используем SSH ключ: $sshKey" -ForegroundColor Yellow
Write-Host "🌐 Подключение к серверу: $server" -ForegroundColor Yellow
Write-Host ""

# Подключение к серверу и выполнение команд
$sshCommand = @"
cd /var/www/bot

echo "📂 Текущая директория: `$(pwd)"
echo ""

# Проверяем статус git
echo "🔍 Проверка статуса Git..."
git status
echo ""

# Создаем бэкап .env если есть локальные изменения
if [ -f .env ]; then
    echo "💾 Создаем бэкап .env файла..."
    cp .env .env.local.backup.`$(date +%Y%m%d_%H%M%S)
fi

# Обновляем код с GitHub
echo "⬇️ Получение обновлений с GitHub..."
git fetch origin main
git reset --hard origin/main

# Устанавливаем зависимости если package.json изменился
echo "📦 Проверка и установка зависимостей..."
npm install

# Показываем обновленный COZE_BOT_ID
echo "🔍 Текущий COZE_BOT_ID из .env:"
grep COZE_BOT_ID .env || echo "❌ COZE_BOT_ID не найден в .env"

# Перезапускаем бот
echo "🔄 Перезапуск бота..."
pm2 restart ecosystem.config.js

# Показываем статус
echo "📊 Статус процессов PM2:"
pm2 list

echo "✅ Обновление завершено!"
"@

# Выполнение SSH команды с ключом
ssh -i $sshKey -o ConnectTimeout=10 -o StrictHostKeyChecking=no $server $sshCommand

Write-Host ""
Write-Host "✅ Обновление с GitHub выполнено!" -ForegroundColor Green