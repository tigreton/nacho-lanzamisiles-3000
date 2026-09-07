#!/bin/zsh

cd "$(dirname "$0")" || exit 1

python3 -m http.server 8080 &
SERVER_PID=$!

sleep 1
open "http://127.0.0.1:8080"

echo
echo "OPERACIÓN NACHO está funcionando en http://127.0.0.1:8080"
echo "Cierra esta ventana o pulsa Ctrl+C para detener el juego."
echo

trap 'kill "$SERVER_PID" 2>/dev/null' INT TERM EXIT
wait "$SERVER_PID"
