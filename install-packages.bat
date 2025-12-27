@echo off
echo Installing database packages...
echo.

echo Installing pg package...
call npm install pg@8.11.3 --save
if %errorlevel% neq 0 (
    echo ERROR: Failed to install pg
    pause
    exit /b 1
)

echo.
echo Installing @vercel/postgres package...
call npm install @vercel/postgres@0.5.1 --save
if %errorlevel% neq 0 (
    echo WARNING: Failed to install @vercel/postgres (this is OK for local development)
)

echo.
echo Verifying installation...
node -e "try { require('pg'); console.log('SUCCESS: pg module found'); } catch(e) { console.log('ERROR: pg module NOT found'); process.exit(1); }"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: pg package is not installed correctly
    echo Please run: npm install pg --save
    pause
    exit /b 1
)

echo.
echo Installation complete!
echo You can now run: npm start
pause








