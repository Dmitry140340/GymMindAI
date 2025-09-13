@echo off
echo ====================================
echo SSH CONNECTION TO TIMEWEB SERVER
echo ====================================
echo.
echo Server IP: 85.198.80.51
echo Username: root
echo Password: boNe?7vBEtkL-_
echo.
echo SOLUTIONS IF PASSWORD INPUT FAILS:
echo.
echo 1. TRY PUTTY (RECOMMENDED):
echo    - Download PuTTY from putty.org
echo    - Host: 85.198.80.51
echo    - Port: 22
echo    - Username: root
echo    - Password: boNe?7vBEtkL-_
echo.
echo 2. TRY CMD INSTEAD OF POWERSHELL:
echo    - Open Command Prompt (cmd)
echo    - Run: ssh root@85.198.80.51
echo.
echo 3. TRY WINDOWS TERMINAL:
echo    - Open Windows Terminal
echo    - Run: ssh root@85.198.80.51
echo.
echo 4. USE WSL (if available):
echo    - Open WSL/Ubuntu
echo    - Run: ssh root@85.198.80.51
echo.
echo ====================================
echo ATTEMPTING SSH CONNECTION...
echo ====================================
echo.

REM Попытка подключения через ssh
ssh -o StrictHostKeyChecking=no root@85.198.80.51

echo.
echo ====================================
echo If connection failed, try methods above
echo ====================================
pause
