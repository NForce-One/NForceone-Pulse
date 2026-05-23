@echo off
echo Resetting MySQL root password to 'nforce123'...
echo.

net stop MySQL80
if %errorlevel% neq 0 (
    echo Failed to stop MySQL service. Run as Administrator.
    pause
    exit /b 1
)

echo Starting MySQL in safe mode...
start /B "" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --skip-grant-tables --shared-memory
timeout /t 5 /nobreak >nul

echo Updating password...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'nforce123';"

echo Stopping safe mode MySQL...
taskkill /f /im mysqld.exe
timeout /t 3 /nobreak >nul

echo Starting MySQL normally...
net start MySQL80

echo Done! Password set to 'nforce123'
pause
