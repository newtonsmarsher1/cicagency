@echo off
echo.
echo ========================================
echo   Updating .env file with connection string
echo ========================================
echo.

cd /d "%~dp0"

REM Create the connection string
set "PASSWORD=Mirinewton@2005"
set "ENCODED_PASSWORD=Mirinewton%%402005"
set "CONNECTION_STRING=postgresql://postgres:%ENCODED_PASSWORD%@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres"

REM Check if .env exists
if exist ".env" (
    echo Found existing .env file
    echo.
    echo Removing old POSTGRES_URL...
    
    REM Use PowerShell to update the file
    powershell -Command "$content = Get-Content '.env' -Raw; $content = $content -replace '(?m)^POSTGRES_URL=.*$', ''; $content = $content -replace '(?m)^#.*PostgreSQL.*$', ''; $content = $content -replace \"`r?`n{3,}\", \"`r`n`r`n\"; $content = $content.TrimEnd(); $content += \"`n`n# PostgreSQL Database Connection (New Supabase Project)`nPOSTGRES_URL=%CONNECTION_STRING%`n\"; Set-Content -Path '.env' -Value $content -NoNewline"
    
    echo.
    echo ✅ .env file updated!
) else (
    echo Creating new .env file...
    echo.
    (
        echo # PostgreSQL Database Connection (New Supabase Project)
        echo POSTGRES_URL=%CONNECTION_STRING%
        echo.
        echo # JWT Secret
        echo JWT_SECRET=your-secret-key-here
    ) > .env
    echo ✅ .env file created!
)

echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo Connection string added:
echo   Host: db.gkavyanjmbidysinsqaz.supabase.co
echo   Database: postgres
echo.
echo Test connection: node test-connection-simple.js
echo.
pause
