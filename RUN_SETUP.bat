@echo off
echo ========================================
echo   Cloudflare Tunnel Setup
echo ========================================
echo.
echo Running setup script...
echo.

cd /d "c:\Users\PC\Desktop\CIC GROUP"
powershell -ExecutionPolicy Bypass -File "setup-cloudflare-tunnel.ps1"

pause









