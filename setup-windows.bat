@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ImportHunter AI - установка

echo ==========================================
echo   ImportHunter AI - установка
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode
for /f "delims=" %%v in ('node -v') do echo Node.js: %%v

set "CHROME_FOUND="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if not defined CHROME_FOUND echo [ВНИМАНИЕ] Google Chrome не найден. Без него Wildberries и Trendyol могут блокировать поиск. Установите Chrome: https://www.google.com/chrome

echo.
echo [1/3] Установка зависимостей...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/3] Загрузка браузера Chromium для парсинга (~150 MB)...
call npx playwright install chromium
if errorlevel 1 goto :fail

echo.
echo [3/3] Сборка сайта...
call npm run build
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo   Готово! Запускайте start-windows.bat
echo ==========================================
pause
exit /b 0

:nonode
echo [ОШИБКА] Node.js не найден.
echo Установите Node.js LTS с сайта https://nodejs.org и запустите этот файл снова.
pause
exit /b 1

:fail
echo.
echo [ОШИБКА] Установка не завершена. Скопируйте текст ошибки выше и отправьте разработчику.
pause
exit /b 1
