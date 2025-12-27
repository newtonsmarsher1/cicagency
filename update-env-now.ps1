# Update .env with connection string
$envPath = Join-Path $PSScriptRoot ".env"

$password = "Mirinewton@2005"
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
$connectionString = "postgresql://postgres:$encodedPassword@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres"

Write-Host "`n📝 Updating .env file with connection string...`n"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove old POSTGRES_URL if it exists
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add new POSTGRES_URL
    $content = $content.TrimEnd() + "`n`n# PostgreSQL Database Connection (New Supabase Project)`nPOSTGRES_URL=$connectionString`n"
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Updated POSTGRES_URL in .env"
} else {
    # Create new .env file
    $newContent = @"
# PostgreSQL Database Connection (New Supabase Project)
POSTGRES_URL=$connectionString

# JWT Secret (generate with: node generate-jwt-secret.js)
JWT_SECRET=your-secret-key-here

"@
    Set-Content -Path $envPath -Value $newContent
    Write-Host "✅ Created .env file with POSTGRES_URL"
}

Write-Host "`n✅ Connection string updated!"
Write-Host "   Host: db.gkavyanjmbidysinsqaz.supabase.co"
Write-Host "   Database: postgres`n"







