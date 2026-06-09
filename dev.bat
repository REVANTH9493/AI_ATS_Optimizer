@echo off
echo ===================================================
echo   AI Resume Maker - Starting Development Stack
echo ===================================================

echo.
echo [1/2] Starting FastAPI Backend in a new terminal...
start "FastAPI Backend" cmd /k "call .venv\Scripts\activate && cd project\backend && python -m uvicorn app.main:app --reload --port 8000"

echo [2/2] Starting Next.js Frontend here...
cd project\frontend
npm run dev
