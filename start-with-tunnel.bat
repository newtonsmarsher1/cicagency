@echo off
echo ========================================
echo   Starting CIC Group Website
echo   Backend + Cloudflare Tunnel
echo ========================================
echo.

REM Change to project directory
cd /d "c:\Users\PC\Desktop\CIC GROUP"

REM Start backend server in new window
echo [1/2] Starting backend server...
start "CIC Backend Server" cmd /k "cd /d c:\Users\PC\Desktop\CIC GROUP\backend && echo Starting backend server on port 3000... && npm start"

REM Wait a few seconds for server to start
echo [2/2] Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Start Cloudflare tunnel
echo Starting Cloudflare Tunnel...
echo.
echo Your website will be live at your configured domain!
echo Press Ctrl+C to stop both services.
echo.

cloudflared tunnel run cic-website

pause









