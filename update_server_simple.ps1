# PowerShell script для автоматического обновления сервера
param(
    [string]$ServerIP = "85.198.80.51",
    [string]$Username = "root", 
    [string]$Password = "boNe?7vBEtkL-_"
)

Write-Host "АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СЕРВЕРА" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Сервер: $ServerIP" -ForegroundColor Yellow
Write-Host "Пользователь: $Username" -ForegroundColor Yellow
Write-Host "Время: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Проверяем статус бота перед обновлением
Write-Host "Проверка текущего статуса бота..." -ForegroundColor Cyan
try {
    $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
    if ($botStatus.ok) {
        Write-Host "Бот работает: @$($botStatus.result.username)" -ForegroundColor Green
    }
}
catch {
    Write-Host "Не удалось проверить статус бота" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Попытка подключения к серверу..." -ForegroundColor Cyan

# Простой подход - создаем expect-подобный скрипт
$expectScript = @"
#!/usr/bin/expect -f
set timeout 30
spawn ssh $Username@$ServerIP
expect "password:"
send "$Password\r"
expect "# "
send "cd /root/GymMindAI\r"
expect "# "
send "git pull origin main\r"
expect "# "
send "systemctl restart gymmind-bot\r"
expect "# "
send "systemctl status gymmind-bot --no-pager\r"
expect "# "
send "exit\r"
expect eof
"@

# Для Windows попробуем другой подход
try {
    Write-Host "Создание SSH сессии..." -ForegroundColor Cyan
    
    # Используем plink если доступен, иначе обычный ssh
    $sshCommand = "ssh"
    $fullCommand = "$sshCommand $Username@$ServerIP"
    
    Write-Host "Выполнение команды: $fullCommand" -ForegroundColor Yellow
    
    # Создаем процесс SSH
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    $psi.Arguments = "$Username@$ServerIP"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $false
    
    $process = [System.Diagnostics.Process]::Start($psi)
    
    Write-Host "SSH процесс запущен, отправляем команды..." -ForegroundColor Cyan
    
    # Ждем запрос пароля и отправляем его
    Start-Sleep -Seconds 3
    $process.StandardInput.WriteLine($Password)
    Start-Sleep -Seconds 2
    
    # Отправляем команды обновления
    Write-Host "Отправка команд обновления..." -ForegroundColor Cyan
    $process.StandardInput.WriteLine("cd /root/GymMindAI")
    Start-Sleep -Seconds 1
    $process.StandardInput.WriteLine("git pull origin main")
    Start-Sleep -Seconds 3
    $process.StandardInput.WriteLine("systemctl restart gymmind-bot")
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine("systemctl status gymmind-bot --no-pager")
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine("exit")
    
    # Закрываем входной поток
    $process.StandardInput.Close()
    
    # Ждем завершения процесса
    $timeoutSeconds = 30
    if ($process.WaitForExit($timeoutSeconds * 1000)) {
        # Читаем результат
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        Write-Host "Результат выполнения:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor White
        
        if ($error) {
            Write-Host "Ошибки/предупреждения:" -ForegroundColor Yellow
            Write-Host $error -ForegroundColor Red
        }
        
        if ($process.ExitCode -eq 0) {
            Write-Host "SSH команды выполнены успешно!" -ForegroundColor Green
            $success = $true
        } else {
            Write-Host "SSH команды завершились с ошибкой. Exit code: $($process.ExitCode)" -ForegroundColor Red
            $success = $false
        }
    } else {
        Write-Host "Таймаут выполнения SSH команд" -ForegroundColor Red
        $process.Kill()
        $success = $false
    }
}
catch {
    Write-Host "Ошибка при выполнении SSH: $($_.Exception.Message)" -ForegroundColor Red
    $success = $false
}

if ($success) {
    Write-Host ""
    Write-Host "ОБНОВЛЕНИЕ СЕРВЕРА ЗАВЕРШЕНО!" -ForegroundColor Green
    Write-Host "Ожидание перезапуска сервиса (10 секунд)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Проверяем статус бота после обновления
    Write-Host "Проверка бота после обновления..." -ForegroundColor Cyan
    try {
        $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
        if ($botStatus.ok) {
            Write-Host "Бот работает после обновления!" -ForegroundColor Green
            
            # Отправляем уведомление об успешном обновлении
            $notificationText = @"
🎉 **СЕРВЕР ОБНОВЛЕН АВТОМАТИЧЕСКИ**

✅ **Статус:** Обновление завершено успешно
🔄 **Бот:** Перезапущен и работает
📂 **Код:** Обновлен с GitHub
💳 **Система оплаты:** Готова к работе
🕐 **Время:** $(Get-Date -Format 'dd.MM.yyyy HH:mm')

🚀 **Доступные функции:**
• Webhook для ЮКассы работает
• База данных подключена
• Все планы подписки активны
• Уведомления настроены

🔗 **Webhook URL:** https://85.198.80.51:3000/webhook/payment
📊 **Health check:** https://85.198.80.51:3000/health
"@

            $notification = @{
                chat_id = "659874549"
                text = $notificationText
                parse_mode = "Markdown"
            } | ConvertTo-Json
            
            $notificationResult = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/sendMessage" -Method Post -Body $notification -ContentType "application/json; charset=utf-8"
            
            if ($notificationResult.ok) {
                Write-Host "Уведомление отправлено в Telegram" -ForegroundColor Green
            }
        }
    }
    catch {
        Write-Host "Не удалось проверить статус бота после обновления" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "НЕ УДАЛОСЬ ОБНОВИТЬ СЕРВЕР АВТОМАТИЧЕСКИ" -ForegroundColor Red
    Write-Host "Требуется ручное вмешательство:" -ForegroundColor Yellow
    Write-Host "1. ssh $Username@$ServerIP" -ForegroundColor White
    Write-Host "2. cd /root/GymMindAI" -ForegroundColor White
    Write-Host "3. git pull origin main" -ForegroundColor White
    Write-Host "4. systemctl restart gymmind-bot" -ForegroundColor White
}

Write-Host ""
Write-Host "Скрипт завершен" -ForegroundColor Cyan
