@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ImportHunter AI - обновление

where git >nul 2>nul
if errorlevel 1 goto :nogit

echo [1/3] Загрузка новой версии...
git pull
if errorlevel 1 goto :fail

echo.
echo [2/3] Обновление зависимостей...
call npm install
if errorlevel 1 goto :fail
call npx playwright install chromium
if errorlevel 1 goto :fail

echo.
echo [3/3] Сборка...
call npm run build
if errorlevel 1 goto :fail

echo.
echo Готово! Запускайте start-windows.bat
pause
exit /b 0

:nogit
echo [ОШИБКА] Git не найден. Установите Git с сайта https://git-scm.com/download/win
pause
exit /b 1

:fail
echo.
echo [ОШИБКА] Обновление не завершено. Ваши данные (.local-data) не тронуты.
pause
exit /b 1
