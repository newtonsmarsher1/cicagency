@echo off
echo.
echo ========================================
echo   CIC GROUP - Admin Portal Restart
echo ========================================
echo.
echo This will restart the admin portal with
echo the new PostgreSQL configuration.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Stopping any running admin portal...
taskkill /F /FI "WINDOWTITLE eq Administrator: *admin-portal*" 2>nul

echo.
echo Starting admin portal with PostgreSQL...
cd admin-portal
start "CIC Admin Portal" cmd /k "npm start"

echo.
echo ========================================
echo   Admin Portal Started!
echo ========================================
echo.
echo Check the new window for:
echo   - Database connection status
echo   - Any error messages
echo.
echo Expected message:
echo   "Admin Portal: Database connected successfully (PostgreSQL)"
echo.
pause
