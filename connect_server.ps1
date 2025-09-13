# PowerShell Script для подключения к серверу
# Запустите в PowerShell: .\connect_server.ps1

Write-Host "🔐 Подключение к серверу TimeWeb" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Сервер: 85.198.80.51" -ForegroundColor Yellow
Write-Host "Пользователь: root" -ForegroundColor Yellow
Write-Host "Пароль: boNe?7vBEtkL-_" -ForegroundColor Yellow
Write-Host ""

# Проверяем доступность сервера
Write-Host "🔍 Проверка доступности сервера..." -ForegroundColor Cyan
$ping = Test-NetConnection -ComputerName "85.198.80.51" -Port 22 -WarningAction SilentlyContinue

if ($ping.TcpTestSucceeded) {
    Write-Host "✅ Сервер доступен на порту 22" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🚀 Попытка подключения через SSH..." -ForegroundColor Cyan
    Write-Host "Когда появится 'password:', введите: boNe?7vBEtkL-_" -ForegroundColor Yellow
    Write-Host ""
    
    # Пробуем разные варианты SSH
    Write-Host "Вариант 1: Стандартное подключение" -ForegroundColor Magenta
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL root@85.198.80.51
    
} else {
    Write-Host "❌ Сервер недоступен на порту 22" -ForegroundColor Red
    Write-Host "Проверьте интернет соединение и настройки firewall" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 АЛЬТЕРНАТИВНЫЕ МЕТОДЫ ПОДКЛЮЧЕНИЯ:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣ PUTTY (Рекомендуется):" -ForegroundColor Cyan
Write-Host "   - Скачайте PuTTY с https://putty.org"
Write-Host "   - Host: 85.198.80.51"
Write-Host "   - Port: 22"
Write-Host "   - Username: root"
Write-Host "   - Password: boNe?7vBEtkL-_"
Write-Host ""

Write-Host "2️⃣ Командная строка (cmd):" -ForegroundColor Cyan
Write-Host "   - Откройте cmd.exe"
Write-Host "   - Выполните: ssh root@85.198.80.51"
Write-Host ""

Write-Host "3️⃣ Windows Terminal:" -ForegroundColor Cyan
Write-Host "   - Откройте Windows Terminal"
Write-Host "   - Выполните: ssh root@85.198.80.51"
Write-Host ""

Write-Host "4️⃣ WSL/Ubuntu:" -ForegroundColor Cyan
Write-Host "   - Откройте WSL или Ubuntu"
Write-Host "   - Выполните: ssh root@85.198.80.51"
Write-Host ""

Write-Host "📋 КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ НА СЕРВЕРЕ:" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "# 1. Проверка cloud-init"
Write-Host "tail -n 20 /var/log/cloud-init-output.log"
Write-Host ""
Write-Host "# 2. Проверка установленных компонентов"
Write-Host "node --version && npm --version && pm2 --version"
Write-Host ""
Write-Host "# 3. Проверка пользователя и репозитория"
Write-Host "id botuser && ls -la /home/botuser/"
Write-Host ""
Write-Host "# 4. Переход к настройке (если всё установлено)"
Write-Host "su - botuser"
Write-Host "cd GymMindAI"
Write-Host "cp .env.template .env"
Write-Host "nano .env"
Write-Host ""

Read-Host "Нажмите Enter для завершения"
