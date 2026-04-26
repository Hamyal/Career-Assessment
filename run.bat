@echo off
cd /d "%~dp0"

echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Starting dev server (LAN enabled) on port 3000
echo.
echo To open on your phone (same Wi-Fi), use:
echo   http://YOUR-PC-IP:3000
echo Tip: run "ipconfig" and copy your "IPv4 Address".
echo.
call npm run dev:server

pause
