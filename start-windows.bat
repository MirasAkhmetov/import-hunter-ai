@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ImportHunter AI

if not exist ".next\BUILD_ID" goto :notbuilt

echo ==========================================
echo   ImportHunter AI запущен
echo   Адрес: http://localhost:3010
echo   Не закрывайте это окно, пока работаете.
echo   Чтобы остановить - закройте окно.
echo ==========================================
echo.

rem Открываем браузер через несколько секунд, когда сервер поднимется
start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 6; Start-Process 'http://localhost:3010'"

call npm start
pause
exit /b 0

:notbuilt
echo Сайт ещё не собран. Сначала запустите setup-windows.bat
pause
exit /b 1
