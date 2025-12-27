# Continue Tunnel Setup - Your tunnel already exists!
# Tunnel ID: f3966405-495c-466c-8c05-3627aa5217c8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Continuing Tunnel Setup" -ForegroundColor Cyan
Write-Host "  Tunnel Already Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$tunnelId = "f3966405-495c-466c-8c05-3627aa5217c8"
$tunnelName = "cic-website"
$domain = "cicagency.com"
$port = "3000"

Write-Host "[INFO] Using existing tunnel:" -ForegroundColor Yellow
Write-Host "  Tunnel Name: $tunnelName" -ForegroundColor White
Write-Host "  Tunnel ID: $tunnelId" -ForegroundColor White
Write-Host "  Domain: $domain" -ForegroundColor White
Write-Host "  Port: $port" -ForegroundColor White
Write-Host ""

Write-Host "[5/8] Creating configuration file..." -ForegroundColor Yellow

# Create .cloudflared directory if it doesn't exist
$cloudflaredDir = "$env:USERPROFILE\.cloudflared"
if (-not (Test-Path $cloudflaredDir)) {
    New-Item -ItemType Directory -Path $cloudflaredDir -Force | Out-Null
}

# Create config file
$configPath = "$cloudflaredDir\config.yml"
$configLines = @(
    "tunnel: $tunnelId",
    "credentials-file: $cloudflaredDir\$tunnelId.json",
    "",
    "ingress:",
    "  - hostname: $domain",
    "    service: http://localhost:$port",
    "  - hostname: www.$domain",
    "    service: http://localhost:$port",
    "  - service: http_status:404"
)

$configLines | Set-Content -Path $configPath -Encoding UTF8
Write-Host "[OK] Configuration file created at: $configPath" -ForegroundColor Green

Write-Host ""
Write-Host "[6/8] Routing DNS..." -ForegroundColor Yellow
Write-Host "Setting up DNS records for $domain and www.$domain" -ForegroundColor Gray

cloudflared tunnel route dns $tunnelName $domain
cloudflared tunnel route dns $tunnelName "www.$domain"

Write-Host "[OK] DNS records configured" -ForegroundColor Green

Write-Host ""
Write-Host "[7/8] Configuration complete!" -ForegroundColor Yellow
Write-Host "[OK] All configuration files are ready" -ForegroundColor Green

Write-Host ""
Write-Host "[8/8] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update environment variables:" -ForegroundColor White
Write-Host "   .\update-env-for-cloudflare.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start your website:" -ForegroundColor White
Write-Host "   Double-click: start-with-tunnel.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "Your website will be available at:" -ForegroundColor Yellow
Write-Host "   https://$domain" -ForegroundColor Green
Write-Host "   https://www.$domain" -ForegroundColor Green
Write-Host ""









