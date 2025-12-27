@echo off
echo ========================================
echo   Finding Domain Registrar
echo   cicagency.com
echo ========================================
echo.
echo Opening WHOIS lookup tools in your browser...
echo This will help you find where your domain is registered.
echo.

start https://whois.net/cicagency.com
start https://lookup.icann.org/en/lookup?name=cicagency.com
start https://www.whatsmydns.net/#WHOIS/cicagency.com

echo.
echo ========================================
echo   Instructions
echo ========================================
echo.
echo 1. Check the opened WHOIS pages
echo 2. Look for "Registrar" field - this shows where domain is registered
echo 3. Common registrars: NameBright, GoDaddy, Namecheap, etc.
echo.
echo I also noticed "hugedomains.com" in your DNS records.
echo Your domain might be registered through HugeDomains.
echo.
echo Try checking:
echo   - HugeDomains: https://www.hugedomains.com
echo   - NameBright: https://www.namebright.com
echo   - AfterNic: https://www.afternic.com (saw verification record)
echo.
echo Press any key to close...
pause >nul









