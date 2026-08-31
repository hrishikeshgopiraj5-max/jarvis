@echo off
title J.A.R.V.I.S. — Starting...
cd /d "%~dp0\.."

:: Check if bun is installed
if not exist "%USERPROFILE%\.bun\bin\bun.exe" (
    echo Installing bun...
    powershell -NoProfile -Command "irm bun.sh/install.ps1 | iex"
)

:: Install dependencies if needed
if not exist "node_modules\electron" (
    echo Installing Electron...
    "%USERPROFILE%\.bun\bin\bun.exe" add electron --dev
)

:: Start the desktop app
"%USERPROFILE%\.bun\bin\bun.exe" node_modules\.bin\electron .\electron\main.js
