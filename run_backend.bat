@echo off
setlocal
title Lyvora - Python Backend
echo Starting Lyvora Python Backend Service...
echo.

cd /d "%~dp0"

if not exist "venv" (
    echo [ERROR] Python virtual environment not found. Please create it first.
    pause
    exit /b
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting Uvicorn backend on http://localhost:8000 ...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

if errorlevel 1 pause
endlocal
