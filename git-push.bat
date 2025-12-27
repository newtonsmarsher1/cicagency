@echo off
echo.
echo ========================================
echo   CIC GROUP - Git Push Script
echo ========================================
echo.
echo This will commit and push all changes
echo to your Git repository.
echo.
pause

echo.
echo [1/4] Checking git status...
git status

echo.
echo [2/4] Staging all changes...
git add .

echo.
echo [3/4] Committing changes...
git commit -m "Fix: Email service and migrate admin portal to PostgreSQL - Install nodemailer for forgot password emails - Migrate admin portal from MySQL to PostgreSQL (Neon) - Fix admin_users table creation with PostgreSQL syntax - Update all SQL queries to use PostgreSQL placeholders - Create comprehensive setup and deployment documentation"

echo.
echo [4/4] Pushing to remote repository...
git push

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
echo Next steps:
echo 1. Restart admin portal: cd admin-portal ^&^& npm start
echo 2. Deploy admin portal (see DEPLOYMENT_GUIDE.md)
echo 3. Test forgot password feature
echo.
pause
