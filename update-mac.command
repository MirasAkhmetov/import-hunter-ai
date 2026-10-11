#!/bin/bash
cd "$(dirname "$0")" || exit 1
set -e
trap 'echo; echo "[ОШИБКА] Обновление не завершено. Ваши данные (.local-data) не тронуты."; read -r -p "Нажмите Enter для выхода..."' ERR

echo "[1/3] Загрузка новой версии..."
git pull
echo; echo "[2/3] Обновление зависимостей..."
npm install
npx playwright install chromium
echo; echo "[3/3] Сборка..."
npm run build

echo
echo "Готово! Запускайте start-mac.command"
read -r -p "Нажмите Enter для выхода..."
