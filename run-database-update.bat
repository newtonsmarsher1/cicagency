@echo off
echo CIC Database Update Script
echo ========================
echo.
echo This script will update your MySQL database with the necessary columns
echo for displaying real user data (wallet balance, earnings, level, etc.)
echo.
echo Make sure MySQL is running and you have the correct credentials.
echo.
pause

echo.
echo Running database update...
mysql -u root -p < update-database.sql

echo.
echo Database update completed!
echo.
echo You can now:
echo 1. Restart your backend server
echo 2. Test the application to see real user data
echo.
pause







