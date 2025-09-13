# PowerShell script for automatic server update
param(
    [string]$ServerIP = "85.198.80.51",
    [string]$Username = "root", 
    [string]$Password = "boNe?7vBEtkL-_"
)

Write-Host "AUTOMATIC SERVER UPDATE" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "Server: $ServerIP" -ForegroundColor Yellow
Write-Host "User: $Username" -ForegroundColor Yellow
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Check bot status before update
Write-Host "Checking bot status..." -ForegroundColor Cyan
try {
    $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
    if ($botStatus.ok) {
        Write-Host "Bot is working: @$($botStatus.result.username)" -ForegroundColor Green
    }
}
catch {
    Write-Host "Could not check bot status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Attempting to connect to server..." -ForegroundColor Cyan

try {
    Write-Host "Creating SSH session..." -ForegroundColor Cyan
    
    # Create SSH process
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    $psi.Arguments = "$Username@$ServerIP"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $false
    
    $process = [System.Diagnostics.Process]::Start($psi)
    
    Write-Host "SSH process started, sending commands..." -ForegroundColor Cyan
    
    # Wait for password prompt and send password
    Start-Sleep -Seconds 3
    $process.StandardInput.WriteLine($Password)
    Start-Sleep -Seconds 2
    
    # Send update commands
    Write-Host "Sending update commands..." -ForegroundColor Cyan
    $process.StandardInput.WriteLine("cd /root/GymMindAI")
    Start-Sleep -Seconds 1
    $process.StandardInput.WriteLine("git pull origin main")
    Start-Sleep -Seconds 3
    $process.StandardInput.WriteLine("systemctl restart gymmind-bot")
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine("systemctl status gymmind-bot --no-pager")
    Start-Sleep -Seconds 2
    $process.StandardInput.WriteLine("exit")
    
    # Close input stream
    $process.StandardInput.Close()
    
    # Wait for process completion
    $timeoutSeconds = 30
    if ($process.WaitForExit($timeoutSeconds * 1000)) {
        # Read results
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        Write-Host "Execution result:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor White
        
        if ($error) {
            Write-Host "Errors/warnings:" -ForegroundColor Yellow
            Write-Host $error -ForegroundColor Red
        }
        
        if ($process.ExitCode -eq 0) {
            Write-Host "SSH commands executed successfully!" -ForegroundColor Green
            $success = $true
        } else {
            Write-Host "SSH commands failed. Exit code: $($process.ExitCode)" -ForegroundColor Red
            $success = $false
        }
    } else {
        Write-Host "SSH execution timeout" -ForegroundColor Red
        $process.Kill()
        $success = $false
    }
}
catch {
    Write-Host "Error executing SSH: $($_.Exception.Message)" -ForegroundColor Red
    $success = $false
}

if ($success) {
    Write-Host ""
    Write-Host "SERVER UPDATE COMPLETED!" -ForegroundColor Green
    Write-Host "Waiting for service restart (10 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Check bot status after update
    Write-Host "Checking bot after update..." -ForegroundColor Cyan
    try {
        $botStatus = Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/getMe"
        if ($botStatus.ok) {
            Write-Host "Bot is working after update!" -ForegroundColor Green
            
            # Send notification
            $notification = @{
                chat_id = "659874549"
                text = "SERVER UPDATED AUTOMATICALLY`n`nBot restarted and working`nCode updated from GitHub`nTime: $(Get-Date -Format 'dd.MM.yyyy HH:mm')"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "https://api.telegram.org/bot8128410187:AAG0B0lsF65xnH0X3Ld2M7IqMK4OlLuK_Y8/sendMessage" -Method Post -Body $notification -ContentType "application/json"
            Write-Host "Notification sent to admin" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Could not check bot status after update" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "COULD NOT UPDATE SERVER AUTOMATICALLY" -ForegroundColor Red
    Write-Host "Manual intervention required:" -ForegroundColor Yellow
    Write-Host "1. ssh $Username@$ServerIP" -ForegroundColor White
    Write-Host "2. cd /root/GymMindAI" -ForegroundColor White
    Write-Host "3. git pull origin main" -ForegroundColor White
    Write-Host "4. systemctl restart gymmind-bot" -ForegroundColor White
}

Write-Host ""
Write-Host "Script completed" -ForegroundColor Cyan
