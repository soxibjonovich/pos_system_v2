@echo off
REM start.bat - Windows Docker Compose Launcher

setlocal enabledelayedexpansion

echo ============================================================
echo    POS System Docker Launcher
echo ============================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

:menu
echo Choose an option:
echo.
echo 1. Start all services
echo 2. Stop all services
echo 3. Restart all services
echo 4. View logs
echo 5. Build and start
echo 6. Clean everything (remove volumes)
echo 7. Check service status
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto build
if "%choice%"=="6" goto clean
if "%choice%"=="7" goto status
if "%choice%"=="8" goto end

echo Invalid choice! Please try again.
echo.
goto menu

:start
echo.
echo [*] Starting all services...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)
echo.
echo [OK] All services started successfully!
echo.
echo Services are available at:
echo   - Admin API:    http://localhost:8001/docs
echo   - Database API: http://localhost:8002/docs
echo   - Auth API:     http://localhost:8003/docs
echo   - Order API:    http://localhost:8004/docs
echo   - RabbitMQ UI:  http://localhost:15672 (admin/pos_password_2024)
echo.
pause
goto menu

:stop
echo.
echo [*] Stopping all services...
docker-compose down
echo [OK] All services stopped
echo.
pause
goto menu

:restart
echo.
echo [*] Restarting all services...
docker-compose restart
echo [OK] All services restarted
echo.
pause
goto menu

:logs
echo.
echo [*] Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f
goto menu

:build
echo.
echo [*] Building and starting services...
docker-compose up -d --build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete and services started
echo.
pause
goto menu

:clean
echo.
echo [WARNING] This will remove all containers, networks, and volumes!
set /p confirm="Are you sure? (yes/no): "
if /i "%confirm%" neq "yes" (
    echo Cancelled.
    echo.
    goto menu
)
echo [*] Cleaning up...
docker-compose down -v
echo [OK] Cleanup complete
echo.
pause
goto menu

:status
echo.
echo [*] Service Status:
echo.
docker-compose ps
echo.
pause
goto menu

:end
echo.
echo Goodbye!
exit /b 0