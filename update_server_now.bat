@echo off
echo Connecting to server and updating GymMindAI...
echo.

:: Use plink (PuTTY) for automated SSH connection
plink -ssh root@85.198.80.51 -pw "boNe?7vBEtkL-_" -batch "cd /root/GymMindAI && git pull origin main && systemctl restart gymmind-bot && systemctl status gymmind-bot --no-pager"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Server update completed successfully!
) else (
    echo.
    echo ❌ Server update failed. Trying alternative method...
    
    :: Fallback: use ssh with expect-like approach
    echo | ssh root@85.198.80.51 -o "StrictHostKeyChecking=no" "cd /root/GymMindAI && git pull origin main && systemctl restart gymmind-bot"
)

pause
