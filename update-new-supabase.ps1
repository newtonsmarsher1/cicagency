# Update .env with new Supabase project connection string
$envPath = Join-Path $PSScriptRoot ".env"

# New project ref
$newProjectRef = "gkavyanjmbidysinsqaz"

Write-Host "🔄 Updating connection string for new Supabase project..."
Write-Host "   New project ref: $newProjectRef`n"

# Get password from user
Write-Host "Enter your Supabase database password:"
Write-Host "(The password you set when creating the project)"
$password = Read-Host "Password"

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "❌ Password cannot be empty"
    exit 1
}

# URL encode the password
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

# Create connection string
$connectionString = "postgresql://postgres:${encodedPassword}@db.${newProjectRef}.supabase.co:5432/postgres"

Write-Host "`n📝 Connection string created:"
Write-Host "   $($connectionString -replace ':[^:@]+@', ':****@')`n"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove ALL existing POSTGRES_URL lines
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    $content = $content -replace "(?m)^# PostgreSQL.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add the new connection string
    $content = $content.TrimEnd() + "`n`n# PostgreSQL Database Configuration`nPOSTGRES_URL=$connectionString`n"
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Updated .env file with new connection string"
} else {
    # Create new .env file
    $newContent = @"
# PostgreSQL Database Configuration
POSTGRES_URL=$connectionString

# JWT Secret
JWT_SECRET=13efc5e6d8aa86dbcf22f0e60db551e05e5c2c62e6f60bb1b28babc6dd12e4673861eacc414c4c021dd248c9963a91cdb1d4bf2686ab01eb7aa722d6da8b4f29
"@
    Set-Content -Path $envPath -Value $newContent
    Write-Host "✅ Created .env file with new connection string"
}

Write-Host "`n✅ Done! You can now test the connection:"
Write-Host "   node test-connection-simple.js"
Write-Host "   npm start"







