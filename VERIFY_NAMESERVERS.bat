@echo off
echo ========================================
echo   Verify Nameservers for cicagency.com
echo ========================================
echo.
echo Checking current nameservers...
echo.

nslookup -type=NS cicagency.com

echo.
echo ========================================
echo   Expected Nameservers
echo ========================================
echo.
echo Your domain should use:
echo   sofia.ns.cloudflare.com
echo   terry.ns.cloudflare.com
echo.
echo If you see different nameservers above,
echo you need to update them at your registrar.
echo.
echo Opening online checker in browser...
echo.

start https://www.whatsmydns.net/#NS/cicagency.com

pause









