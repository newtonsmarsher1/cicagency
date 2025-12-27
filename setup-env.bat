@echo off
echo Creating .env file for M-Pesa STK Push...
echo.

echo # M-Pesa Payment API Environment Configuration > .env
echo. >> .env
echo # Server Configuration >> .env
echo PORT=2001 >> .env
echo NODE_ENV=development >> .env
echo BASE_URL=http://localhost:2001 >> .env
echo. >> .env
echo # M-Pesa API Configuration (Sandbox) >> .env
echo MPESA_BASE_URL=https://sandbox.safaricom.co.ke >> .env
echo MPESA_CONSUMER_KEY=YOUR_SANDBOX_CONSUMER_KEY_HERE >> .env
echo MPESA_CONSUMER_SECRET=YOUR_SANDBOX_CONSUMER_SECRET_HERE >> .env
echo MPESA_BUSINESS_SHORT_CODE=174379 >> .env
echo MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919 >> .env
echo. >> .env
echo # Callback URLs >> .env
echo MPESA_CALLBACK_URL=http://localhost:2001/api/mpesa/callback >> .env
echo MPESA_TIMEOUT_URL=http://localhost:2001/api/mpesa/timeout >> .env
echo. >> .env
echo # Database Configuration >> .env
echo DB_HOST=localhost >> .env
echo DB_PORT=3306 >> .env
echo DB_NAME=cic >> .env
echo DB_USER=root >> .env
echo DB_PASSWORD=Caroline >> .env
echo. >> .env
echo # Security >> .env
echo JWT_SECRET=your_jwt_secret_key_here >> .env

echo.
echo .env file created successfully!
echo.
echo IMPORTANT: You need to replace the following with your actual M-Pesa API credentials:
echo - YOUR_SANDBOX_CONSUMER_KEY_HERE
echo - YOUR_SANDBOX_CONSUMER_SECRET_HERE
echo.
echo Get your credentials from: https://developer.safaricom.co.ke/
echo.
pause




