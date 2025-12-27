# PowerShell script to update .env file
$envPath = Join-Path $PSScriptRoot ".env"

$password = "Mirinewton@2005"
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
$connectionString = "postgresql://postgres:$encodedPassword@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres"

Write-Host ""
Write-Host "🔧 Updating .env file..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $envPath) {
    Write-Host "✓ Found existing .env file" -ForegroundColor Green
    
    # Read content
    $content = Get-Content $envPath -Raw
    
    # Remove old POSTGRES_URL
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    $content = $content -replace "(?m)^#.*PostgreSQL.*$", ""
    
    # Clean up blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    $content = $content.TrimEnd()
    
    # Add new connection string
    $content += "`n`n# PostgreSQL Database Connection (New Supabase Project)`nPOSTGRES_URL=$connectionString`n"
    
    # Write back
    Set-Content -Path $envPath -Value $content -NoNewline
    
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
} else {
    Write-Host "✓ Creating new .env file" -ForegroundColor Green
    
    $content = @"
# PostgreSQL Database Connection (New Supabase Project)
POSTGRES_URL=$connectionString

# JWT Secret (generate with: node generate-jwt-secret.js)
JWT_SECRET=your-secret-key-here

"@
    
    Set-Content -Path $envPath -Value $content
    
    Write-Host "✅ .env file created successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Connection details:" -ForegroundColor Cyan
Write-Host "   Host: db.gkavyanjmbidysinsqaz.supabase.co"
Write-Host "   Database: postgres"
Write-Host "   Password: [ENCODED]"
Write-Host ""

# Verify
$verifyContent = Get-Content $envPath -Raw
if ($verifyContent -match "gkavyanjmbidysinsqaz") {
    Write-Host "✅ Verification: Connection string found in file" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Could not verify update" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Test connection with: node test-connection-simple.js" -ForegroundColor Cyan
Write-Host ""







