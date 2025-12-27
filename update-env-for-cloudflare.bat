@echo off
echo ========================================
echo   Environment Variables Update Helper
echo   For Cloudflare Deployment
echo ========================================
echo.
echo This script will help you update your .env file
echo with your domain for Cloudflare deployment.
echo.
echo IMPORTANT: Make sure you have your domain name ready!
echo.

set /p DOMAIN="Enter your domain name (e.g., example.com): "

if "%DOMAIN%"=="" (
    echo Error: Domain name is required!
    pause
    exit /b 1
)

echo.
echo Updating .env file with domain: %DOMAIN%
echo.

cd /d "c:\Users\PC\Desktop\CIC GROUP"

REM Check if .env file exists
if not exist .env (
    echo .env file not found! Creating from env.example...
    copy env.example .env
)

REM Update BASE_URL
powershell -Command "(Get-Content .env) -replace 'BASE_URL=http://localhost:[0-9]+', 'BASE_URL=https://%DOMAIN%' | Set-Content .env.tmp"
powershell -Command "(Get-Content .env.tmp) -replace 'BASE_URL=.*', 'BASE_URL=https://%DOMAIN%' | Set-Content .env"

REM Update MPESA_CALLBACK_URL
powershell -Command "(Get-Content .env) -replace 'MPESA_CALLBACK_URL=.*', 'MPESA_CALLBACK_URL=https://%DOMAIN%/api/mpesa/callback' | Set-Content .env"

REM Update MPESA_TIMEOUT_URL
powershell -Command "(Get-Content .env) -replace 'MPESA_TIMEOUT_URL=.*', 'MPESA_TIMEOUT_URL=https://%DOMAIN%/api/mpesa/timeout' | Set-Content .env"

REM Update PORT to 3000 if not already
powershell -Command "(Get-Content .env) -replace 'PORT=.*', 'PORT=3000' | Set-Content .env"

REM Set NODE_ENV to production
powershell -Command "(Get-Content .env) -replace 'NODE_ENV=development', 'NODE_ENV=production' | Set-Content .env"

REM Clean up temp file
if exist .env.tmp del .env.tmp

echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo Your .env file has been updated with:
echo   BASE_URL=https://%DOMAIN%
echo   MPESA_CALLBACK_URL=https://%DOMAIN%/api/mpesa/callback
echo   MPESA_TIMEOUT_URL=https://%DOMAIN%/api/mpesa/timeout
echo   PORT=3000
echo   NODE_ENV=production
echo.
echo Please verify the .env file and update any other
echo configuration values as needed (database, M-Pesa credentials, etc.)
echo.
pause









