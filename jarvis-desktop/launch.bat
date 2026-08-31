@echo off
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   J.A.R.V.I.S. Desktop AI Assistant  ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [*] Checking Python...
python --version 2>NUL
if errorlevel 1 (
    echo [!] Python not found. Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo [*] Installing dependencies...
pip install -r requirements.txt --quiet 2>NUL

echo [*] Starting J.A.R.V.I.S...
echo.
python main.py %*

pause
