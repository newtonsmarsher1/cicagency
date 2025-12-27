# Update POSTGRES_URL with new connection string (URL-encoded password)
$envPath = Join-Path $PSScriptRoot ".env"

# URL-encode the password: Mirinewton@1 becomes Mirinewton%401
$connectionString = "postgresql://postgres:Mirinewton%401@db.giwkajkdkyapkrxssuxv.supabase.co:5432/postgres"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove existing POSTGRES_URL lines
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add the new connection string
    $content = $content.TrimEnd() + "`n`n# PostgreSQL Database Configuration`nPOSTGRES_URL=$connectionString`n"
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Updated POSTGRES_URL in .env file"
    Write-Host "   Password has been URL-encoded: Mirinewton@1 -> Mirinewton%401"
    Write-Host "`n✅ Connection string updated successfully!"
    Write-Host "   You can now run: npm start"
} else {
    Write-Host "❌ .env file not found. Creating new one..."
    $newContent = @"
# PostgreSQL Database Configuration
POSTGRES_URL=$connectionString

# JWT Secret
JWT_SECRET=13efc5e6d8aa86dbcf22f0e60db551e05e5c2c62e6f60bb1b28babc6dd12e4673861eacc414c4c021dd248c9963a91cdb1d4bf2686ab01eb7aa722d6da8b4f29
"@
    Set-Content -Path $envPath -Value $newContent
    Write-Host "✅ Created .env file with POSTGRES_URL"
}








