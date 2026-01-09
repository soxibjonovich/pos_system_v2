@echo off
echo Starting backend...
start "Backend" cmd /k "cd backend && python main.py"

echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Frontend and backend started.
pause
