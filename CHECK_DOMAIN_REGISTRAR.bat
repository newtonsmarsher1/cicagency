@echo off
echo ========================================
echo   Finding Domain Registrar
echo   cicagency.com
echo ========================================
echo.
echo Checking WHOIS information...
echo.

echo Opening WHOIS lookup in browser...
echo.

start https://whois.icann.org/en/lookup?name=cicagency.com
start https://whois.domaintools.com/cicagency.com

echo.
echo ========================================
echo   Instructions
echo ========================================
echo.
echo 1. Check the opened WHOIS lookup pages
echo 2. Look for "Registrar" field - this shows where domain is registered
echo 3. Common registrars: GoDaddy, Namecheap, Google Domains, NameBright, etc.
echo 4. Once you know the registrar, log into that account
echo 5. Find nameserver settings and update to Cloudflare nameservers:
echo    - sofia.ns.cloudflare.com
echo    - terry.ns.cloudflare.com
echo.
echo Press any key to close...
pause >nul









