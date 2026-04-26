@echo off
cd /d "C:\Users\hamya\Downloads\Agent\career-assessment"
echo Installing dependencies if needed...
call npm install
echo.
echo Starting dev server. Open http://localhost:3000 in your browser.
echo Press Ctrl+C to stop.
call npm run dev
pause
