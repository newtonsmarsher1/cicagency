# Cloudflare Tunnel Setup Script for CIC Group Website
# This script helps you set up Cloudflare Tunnel for self-hosting

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel Setup Wizard" -ForegroundColor Cyan
Write-Host "  CIC Group Website Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is installed
Write-Host "[1/8] Checking if cloudflared is installed..." -ForegroundColor Yellow
$cloudflaredCheck = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredCheck) {
    $cloudflaredVersion = cloudflared --version 2>&1
    Write-Host "[OK] cloudflared is installed" -ForegroundColor Green
    Write-Host "  Version: $cloudflaredVersion" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] cloudflared is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install cloudflared first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host "2. Or use: winget install --id Cloudflare.cloudflared" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Press Enter after installing cloudflared, or type skip to continue anyway"
    if ($continue -eq "skip") {
        Write-Host "Continuing anyway..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[2/8] Please provide the following information:" -ForegroundColor Yellow

# Get domain name
Write-Host ""
Write-Host "Enter your domain name:" -ForegroundColor White
Write-Host "Example: example.com" -ForegroundColor Gray
$domain = Read-Host
if (-not $domain) {
    Write-Host "Domain name is required. Exiting." -ForegroundColor Red
    exit 1
}

# Get tunnel name
Write-Host ""
Write-Host "Enter tunnel name:" -ForegroundColor White
Write-Host "Press Enter for default: cic-website" -ForegroundColor Gray
$tunnelName = Read-Host
if (-not $tunnelName) {
    $tunnelName = "cic-website"
}

# Get port number
Write-Host ""
Write-Host "Enter backend port number:" -ForegroundColor White
Write-Host "Press Enter for default: 3000" -ForegroundColor Gray
$port = Read-Host
if (-not $port) {
    $port = "3000"
}

Write-Host ""
Write-Host "[3/8] Login to Cloudflare..." -ForegroundColor Yellow
Write-Host "This will open your browser to authorize the tunnel." -ForegroundColor Gray
Write-Host ""
Write-Host "Note: If you see a certificate error, you may need to delete existing certificate first." -ForegroundColor Yellow
Write-Host "Certificate location: $env:USERPROFILE\.cloudflared\cert.pem" -ForegroundColor Gray
Write-Host ""
$continue = Read-Host "Press Enter to continue with login"
cloudflared tunnel login

Write-Host ""
Write-Host "[4/8] Creating tunnel: $tunnelName" -ForegroundColor Yellow
$tunnelCreate = cloudflared tunnel create $tunnelName 2>&1
Write-Host $tunnelCreate

# Extract tunnel ID from output - multiple pattern attempts
$tunnelId = $null

# Try pattern 1: "Created tunnel NAME with id UUID"
if ($tunnelCreate -match 'Created tunnel\s+\S+\s+with id\s+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})') {
    $tunnelId = $matches[1]
}

# Try pattern 2: Just UUID pattern anywhere
if (-not $tunnelId -and ($tunnelCreate -match '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})')) {
    $tunnelId = $matches[1]
}

# Try pattern 3: Extract from JSON filename if available
if (-not $tunnelId -and ($tunnelCreate -match '([a-f0-9-]{36})\.json')) {
    $tunnelId = $matches[1]
}

if ($tunnelId) {
    Write-Host "[OK] Tunnel created with ID: $tunnelId" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not extract tunnel ID automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please look at the output above and enter the tunnel ID manually." -ForegroundColor White
    Write-Host "It should look like: f3966405-495c-466c-8c05-3627aa5217c8" -ForegroundColor Gray
    Write-Host ""
    $tunnelId = Read-Host "Enter tunnel ID"
}

if (-not $tunnelId) {
    Write-Host "Tunnel ID is required. Exiting." -ForegroundColor Red
    exit 1
}

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
Write-Host "1. Make sure your domain DNS nameservers are pointing to Cloudflare" -ForegroundColor White
Write-Host "2. Start your backend server:" -ForegroundColor White
Write-Host "   cd c:\Users\PC\Desktop\CIC GROUP\backend" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the tunnel:" -ForegroundColor White
Write-Host "   cloudflared tunnel run $tunnelName" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Or run both together using start-with-tunnel.bat" -ForegroundColor White
Write-Host ""
Write-Host "Your website will be available at:" -ForegroundColor Yellow
Write-Host "   https://$domain" -ForegroundColor Green
Write-Host "   https://www.$domain" -ForegroundColor Green
Write-Host ""
Write-Host "Note: DNS propagation can take up to 24 hours, but usually works within minutes." -ForegroundColor Gray
Write-Host ""









