# Update POSTGRES_URL in .env file with URL-encoded password
$envPath = Join-Path $PSScriptRoot ".env"

# URL-encode the password: Caroline@2005! becomes Caroline%402005%21
$connectionString = "postgresql://postgres:Caroline%402005%21@db.giwkajkdkyapkrxssuxv.supabase.co:5432/postgres"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove existing POSTGRES_URL lines
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    $content = $content -replace "(?m)^# PostgreSQL.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add the connection string
    $content = $content.TrimEnd() + "`n`n# PostgreSQL Database Configuration`nPOSTGRES_URL=$connectionString`n"
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Updated POSTGRES_URL in .env file"
    Write-Host "   Connection string: $($connectionString -replace ':[^:@]+@', ':****@')"
} else {
    Write-Host "❌ .env file not found"
}








