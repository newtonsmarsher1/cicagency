# Fix DNS Routing - Authentication Issue
# This will help resolve the authentication error

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing DNS Routing Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] The DNS routing failed due to authentication." -ForegroundColor Yellow
Write-Host "This usually means we need to login again or handle the certificate." -ForegroundColor Gray
Write-Host ""

# Check if certificate exists
$certPath = "$env:USERPROFILE\.cloudflared\cert.pem"
if (Test-Path $certPath) {
    Write-Host "[WARNING] Existing certificate found at: $certPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "1. Delete existing certificate and login again (recommended)" -ForegroundColor White
    Write-Host "2. Use existing certificate and route DNS manually" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter choice (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host ""
        Write-Host "Deleting existing certificate..." -ForegroundColor Yellow
        Remove-Item $certPath -Force
        Write-Host "[OK] Certificate deleted" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now login again..." -ForegroundColor Yellow
        cloudflared tunnel login
        Write-Host ""
        Write-Host "[OK] Login complete. Now routing DNS..." -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] No existing certificate found. Logging in..." -ForegroundColor Yellow
    cloudflared tunnel login
}

Write-Host ""
Write-Host "Routing DNS for cicagency.com..." -ForegroundColor Yellow
cloudflared tunnel route dns cic-website cicagency.com

Write-Host ""
Write-Host "Routing DNS for www.cicagency.com..." -ForegroundColor Yellow
cloudflared tunnel route dns cic-website www.cicagency.com

Write-Host ""
Write-Host "[OK] DNS routing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: You can also route DNS manually from Cloudflare dashboard:" -ForegroundColor Gray
Write-Host "1. Go to: https://dash.cloudflare.com" -ForegroundColor Gray
Write-Host "2. Select your domain: cicagency.com" -ForegroundColor Gray
Write-Host "3. Go to Zero Trust > Networks > Tunnels" -ForegroundColor Gray
Write-Host "4. Configure DNS routes for your tunnel" -ForegroundColor Gray
Write-Host ""









