#!/bin/bash
cd "$(dirname "$0")" || exit 1
set -e

echo "=========================================="
echo "  ImportHunter AI — установка"
echo "=========================================="

if ! command -v node >/dev/null 2>&1; then
  echo "[ОШИБКА] Node.js не найден. Установите Node.js LTS с https://nodejs.org и запустите снова."
  read -r -p "Нажмите Enter для выхода..."
  exit 1
fi
echo "Node.js: $(node -v)"

trap 'echo; echo "[ОШИБКА] Установка не завершена — см. текст выше."; read -r -p "Нажмите Enter для выхода..."' ERR

echo; echo "[1/3] Установка зависимостей..."
npm install
echo; echo "[2/3] Загрузка браузера Chromium для парсинга (~150 MB)..."
npx playwright install chromium
echo; echo "[3/3] Сборка сайта..."
npm run build

echo
echo "Готово! Запускайте start-mac.command"
read -r -p "Нажмите Enter для выхода..."
