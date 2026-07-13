@echo off
setlocal
title Lyvora - Vite Frontend

cd /d "%~dp0frontend"
if not exist "package.json" (
    echo [ERROR] Frontend package.json was not found.
    pause
    exit /b 1
)

echo Starting Lyvora frontend on http://localhost:5173 ...
call npm run dev

if errorlevel 1 pause
endlocal
