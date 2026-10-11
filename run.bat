@echo off
echo ========================================================
echo   AquaGuard AI - Acoustic Leak Detection and Response
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start "AquaGuard Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting React Frontend on http://localhost:5173...
start "AquaGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   AquaGuard AI is running!
echo   - Web Dashboard: http://localhost:5173
echo   - Backend Docs:  http://localhost:8000/docs
echo ========================================================
pause
