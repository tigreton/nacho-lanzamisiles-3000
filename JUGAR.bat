@echo off
rem Operación Nacho — lanzador de Windows
rem Arranca un servidor local y abre el juego en el navegador.

cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Necesitas Python instalado ^(https://www.python.org^).
  pause
  exit /b 1
)

rem El navegador se abre con un pequeño retardo para dar tiempo al servidor.
start "" cmd /c "timeout /t 1 >nul & start "" http://127.0.0.1:8080"

echo.
echo OPERACIÓN NACHO está funcionando en http://127.0.0.1:8080
echo Cierra esta ventana o pulsa Ctrl+C para detener el juego.
echo.

python -m http.server 8080
if errorlevel 1 (
  echo.
  echo El puerto 8080 está ocupado. Cierra el proceso que lo usa
  echo o edita este archivo para usar otro puerto.
  pause
)
