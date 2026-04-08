@echo off
cd /d "%~dp0"

echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Starting dev server at http://localhost:3000
call npm run dev

pause
