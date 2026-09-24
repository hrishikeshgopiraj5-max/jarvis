@echo off
title J.A.R.V.I.S.
cd /d "%~dp0.."

:: Skip install checks — everything should already be installed
:: If electron is missing, auto-install then launch
if not exist "node_modules\electron\package.json" (
    title J.A.R.V.I.S. — First-time setup...
    echo [JARVIS] First time setup — installing dependencies...
    "%USERPROFILE%\.bun\bin\bun.exe" install
    echo [JARVIS] Setup complete. Launching...
)

:: Start the desktop app
"%USERPROFILE%\.bun\bin\bun.exe" node_modules\.bin\electron .\electron\main.js
