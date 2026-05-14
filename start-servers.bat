@echo off
echo =======================================
echo Nforce Time Tracker - Server Startup
echo =======================================
echo.

echo 1. Starting MySQL service...
net start MySQL80
if errorlevel 1 (
    echo Please run this script as Administrator!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo 2. Setting MySQL password...
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'nforce123'; FLUSH PRIVILEGES;" 2>nul
if errorlevel 1 (
    echo Password might already be set. Testing connection...
    mysql -u root -pnforce123 -e "SELECT 1;" 2>nul
    if errorlevel 1 (
        echo Cannot connect to MySQL. Please check MySQL installation.
        pause
        exit /b 1
    )
)

echo 3. Creating database if not exists...
mysql -u root -pnforce123 -e "CREATE DATABASE IF NOT EXISTS nforce_timetracker;" 2>nul

echo 4. Updating .env file...
(
echo DB_HOST=localhost
echo DB_USER=root
echo DB_PASSWORD=nforce123
echo DB_NAME=nforce_timetracker
echo PORT=5000
echo JWT_SECRET=nforce_super_secret_jwt_key_2024
) > "Backend\.env"

echo 5. Starting Backend Server...
start "Backend" cmd /k "cd /d "%~dp0Backend" && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo 6. Starting Frontend Server...
start "Frontend" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo.
echo =======================================
echo Servers starting in new windows!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo =======================================
echo.
pause
