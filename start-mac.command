#!/bin/bash
cd "$(dirname "$0")" || exit 1

if [ ! -f .next/BUILD_ID ]; then
  echo "Сайт ещё не собран. Сначала запустите setup-mac.command"
  read -r -p "Нажмите Enter для выхода..."
  exit 1
fi

echo "=========================================="
echo "  ImportHunter AI запущен: http://localhost:3010"
echo "  Не закрывайте это окно, пока работаете."
echo "  Остановить: Ctrl+C или закрыть окно."
echo "=========================================="

(sleep 6 && open "http://localhost:3010") &
# caffeinate не даёт Mac уснуть, пока сайт работает
exec caffeinate -i npm start
