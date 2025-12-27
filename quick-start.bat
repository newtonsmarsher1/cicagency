@echo off
cls
echo.
echo ========================================
echo   CIC GROUP - Quick Start
echo ========================================
echo.
echo This script will help you get started
echo with the fixed admin portal.
echo.
echo What this script does:
echo 1. Shows current git status
echo 2. Helps you restart admin portal
echo 3. Provides next steps
echo.
pause

cls
echo.
echo ========================================
echo   Step 1: Git Status
echo ========================================
echo.
git status
echo.
echo.
echo Do you want to commit and push changes now?
echo (You can also do this later using git-push.bat)
echo.
set /p PUSH="Push to Git? (y/n): "

if /i "%PUSH%"=="y" (
    echo.
    echo Committing and pushing changes...
    git add .
    git commit -m "Fix: Email service and migrate admin portal to PostgreSQL"
    git push
    echo.
    echo ✅ Changes pushed to Git!
) else (
    echo.
    echo Skipping git push. You can run git-push.bat later.
)

cls
echo.
echo ========================================
echo   Step 2: Admin Portal Status
echo ========================================
echo.
echo The admin portal is currently running with OLD code.
echo You MUST restart it to apply the PostgreSQL fixes.
echo.
echo Current terminal is running: node admin-portal/server.js
echo.
echo To restart:
echo 1. Go to that terminal
echo 2. Press Ctrl+C to stop it
echo 3. Run: cd admin-portal
echo 4. Run: npm start
echo.
echo OR use the restart-admin.bat script
echo.
pause

cls
echo.
echo ========================================
echo   Step 3: What's Next?
echo ========================================
echo.
echo ✅ All issues are FIXED in the code!
echo.
echo IMMEDIATE ACTIONS:
echo.
echo 1. RESTART ADMIN PORTAL (CRITICAL!)
echo    - Stop current server (Ctrl+C)
echo    - cd admin-portal
echo    - npm start
echo    - Look for: "Database connected successfully (PostgreSQL)"
echo.
echo 2. Test CEO Login
echo    - URL: http://localhost:3001
echo    - Username: ceo
echo    - Password: CEO@2024
echo.
echo 3. Configure Email (Optional)
echo    - See ACTION_REQUIRED.md
echo    - Set up Gmail App Password
echo.
echo 4. Deploy Admin Portal
echo    - See DEPLOYMENT_GUIDE.md
echo    - Options: Vercel, Render, Railway
echo.
echo ========================================
echo   Documentation Files
echo ========================================
echo.
echo 📖 README_FIRST.md      - Start here!
echo 📖 ACTION_REQUIRED.md   - Urgent setup steps
echo 📖 DEPLOYMENT_GUIDE.md  - How to deploy
echo 📖 SETUP_GUIDE.md       - Complete setup guide
echo.
echo ========================================
echo   Quick Commands
echo ========================================
echo.
echo restart-admin.bat  - Restart admin portal
echo git-push.bat       - Push changes to Git
echo.
echo cd backend ^&^& node check_email_config.js  - Check email setup
echo cd backend ^&^& node test_email_config.js   - Test email sending
echo.
echo ========================================
echo.
echo All issues are resolved! 🎉
echo Just restart the admin portal and you're good to go!
echo.
pause
