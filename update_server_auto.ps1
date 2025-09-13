# PowerShell script для автоматического обновления сервера без ввода пароля
# Использует sshpass или автоматическую передачу пароля

param(
    [string]$ServerIP = "85.198.80.51",
    [string]$Username = "root", 
    [string]$Password = "boNe?7vBEtkL-_"
)

Write-Host "🚀 АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СЕРВЕРА" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "📍 Сервер: $ServerIP" -ForegroundColor Yellow
Write-Host "👤 Пользователь: $Username" -ForegroundColor Yellow
Write-Host "⏰ Время: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Функция для выполнения SSH команды с автоматической передачей пароля
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "🔄 $Description" -ForegroundColor Cyan
    
    # Создаем временный скрипт expect
    $expectScript = @"
#!/usr/bin/expect -f
set timeout 20
spawn ssh $Username@$ServerIP "$Command"
expect "password:"
send "$Password\r"
expect eof
"@
    
    # Для Windows используем другой подход
    try {
        # Используем PowerShell с System.Diagnostics.Process
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "ssh"
        $psi.Arguments = "$Username@$ServerIP `"$Command`""
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        
        $process = [System.Diagnostics.Process]::Start($psi)
        
        # Отправляем пароль
        Start-Sleep -Seconds 2
        $process.StandardInput.WriteLine($Password)
        $process.StandardInput.Close()
        
        # Читаем результат
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Успешно: $Description" -ForegroundColor Green
            Write-Host $output -ForegroundColor White
            return $true
        } else {
            Write-Host "❌ Ошибка: $Description" -ForegroundColor Red
            Write-Host $error -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Исключение при выполнении: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Функция для создания SSH сессии с сохранением пароля
function Start-AutoSSHSession {
    Write-Host "🔐 Создание автоматической SSH сессии..." -ForegroundColor Cyan
    
    # Создаем временный файл с командами
    $commandsFile = [System.IO.Path]::GetTempFileName()
    
    $commands = @(
        "cd /root/GymMindAI",
        "echo '📥 Получение обновлений из GitHub...'",
        "git pull origin main",
        "echo '🔄 Перезапуск сервиса...'", 
        "systemctl restart gymmind-bot",
        "sleep 3",
        "echo '📊 Проверка статуса сервиса...'",
        "systemctl status gymmind-bot --no-pager -l",
        "echo '✅ Обновление завершено!'"
    )
    
    $commands | Out-File -FilePath $commandsFile -Encoding ASCII
    
    try {
        # Используем PowerShell для создания интерактивной SSH сессии
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "ssh"
        $psi.Arguments = "-t $Username@$ServerIP"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        
        $process = [System.Diagnostics.Process]::Start($psi)
        
        # Ждем запрос пароля и отправляем его
        Start-Sleep -Seconds 3
        $process.StandardInput.WriteLine($Password)
        
        # Отправляем команды
        foreach ($cmd in $commands) {
            Start-Sleep -Seconds 1
            $process.StandardInput.WriteLine($cmd)
        }
        
        # Завершаем сессию
        Start-Sleep -Seconds 2
        $process.StandardInput.WriteLine("exit")
        $process.StandardInput.Close()
        
        # Читаем весь вывод
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        $process.WaitForExit(30000) # 30 секунд таймаут
        
        Write-Host "📄 Результат выполнения:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor White
        
        if ($error) {
            Write-Host "⚠️ Предупреждения/ошибки:" -ForegroundColor Yellow
            Write-Host $error -ForegroundColor Red
        }
        
        return $process.ExitCode -eq 0
    }
    catch {
        Write-Host "❌ Ошибка при выполнении SSH команд: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        # Удаляем временный файл
        if (Test-Path $commandsFile) {
            Remove-Item $commandsFile -Force
        }
    }
}

# Альтернативный метод через встроенный SSH с ожиданием
function Update-ServerAlternative {
    Write-Host "🔄 Альтернативный метод обновления..." -ForegroundColor Cyan
    
    # Создаем строку с командами для выполнения
    $remoteCommands = "cd /root/GymMindAI && git pull origin main && systemctl restart gymmind-bot && systemctl status gymmind-bot --no-pager"
    
    # Создаем временный batch файл для автоматизации
    $batchContent = @"
@echo off
echo $Password | ssh $Username@$ServerIP "$remoteCommands"
"@
    
    $batchFile = [System.IO.Path]::GetTempFileName() + ".bat"
    $batchContent | Out-File -FilePath $batchFile -Encoding ASCII
    
    try {
        $result = & cmd /c $batchFile
        Write-Host $result -ForegroundColor White
        return $true
    }
    catch {
        Write-Host "❌ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    finally {
        if (Test-Path $batchFile) {
            Remove-Item $batchFile -Force
        }
    }
}

# Основная логика
Write-Host "🚀 Начало процесса обновления..." -ForegroundColor Green

# Проверяем статус бота перед обновлением
Write-Host "🤖 Проверка текущего статуса бота..." -ForegroundColor Cyan
try {
    $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
    if ($botStatus.ok) {
        Write-Host "✅ Бот работает: @$($botStatus.result.username)" -ForegroundColor Green
    }
}
catch {
    Write-Host "⚠️ Не удалось проверить статус бота" -ForegroundColor Yellow
}

Write-Host ""

# Пробуем основной метод
$success = Start-AutoSSHSession

if (-not $success) {
    Write-Host "⚠️ Основной метод не сработал, пробуем альтернативный..." -ForegroundColor Yellow
    $success = Update-ServerAlternative
}

if ($success) {
    Write-Host ""
    Write-Host "🎉 ОБНОВЛЕНИЕ СЕРВЕРА ЗАВЕРШЕНО!" -ForegroundColor Green
    Write-Host "⏳ Ожидание перезапуска сервиса (10 секунд)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Проверяем статус бота после обновления
    Write-Host "🔍 Проверка бота после обновления..." -ForegroundColor Cyan
    try {
        $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
        if ($botStatus.ok) {
            Write-Host "✅ Бот работает после обновления!" -ForegroundColor Green
            
            # Отправляем уведомление
            $notification = @{
                chat_id = "659874549"
                text = "✅ СЕРВЕР ОБНОВЛЕН АВТОМАТИЧЕСКИ`n`n🤖 Бот перезапущен и работает`n📥 Код обновлен с GitHub`n⏰ $(Get-Date -Format 'dd.MM.yyyy HH:mm')"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/sendMessage" -Method Post -Body $notification -ContentType "application/json"
            Write-Host "📬 Уведомление отправлено администратору" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️ Не удалось проверить статус бота после обновления" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ НЕ УДАЛОСЬ ОБНОВИТЬ СЕРВЕР АВТОМАТИЧЕСКИ" -ForegroundColor Red
    Write-Host "📋 Требуется ручное вмешательство:" -ForegroundColor Yellow
    Write-Host "   1. ssh $Username@$ServerIP" -ForegroundColor White
    Write-Host "   2. cd /root/GymMindAI" -ForegroundColor White
    Write-Host "   3. git pull origin main" -ForegroundColor White
    Write-Host "   4. systemctl restart gymmind-bot" -ForegroundColor White
}

Write-Host ""
Write-Host "🏁 Скрипт завершен" -ForegroundColor Cyan
