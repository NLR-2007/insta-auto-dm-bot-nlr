@echo off
title InstaDM Auto - Python Backend
echo Starting Instagram Auto DM Python Backend Service...
echo.

if not exist "venv" (
    echo [ERROR] Python virtual environment not found. Please create it first.
    pause
    exit /b
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting Uvicorn backend on http://localhost:8000 ...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

pause
