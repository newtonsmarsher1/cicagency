# Update .env with new Supabase project connection string
param(
    [Parameter(Mandatory=$false)]
    [string]$Password
)

$envPath = Join-Path $PSScriptRoot ".env"

# New project connection string template
$connectionTemplate = "postgresql://postgres:[YOUR_PASSWORD]@db.gkavyanjmbidysinsqaz.supabase.co:5432/postgres"

Write-Host "`n🔧 Updating Connection String for New Supabase Project`n"
Write-Host "Project: gkavyanjmbidysinsqaz"
Write-Host "Host: db.gkavyanjmbidysinsqaz.supabase.co`n"

# Get password if not provided
if (-not $Password) {
    Write-Host "Enter your Supabase database password:"
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    Write-Host "❌ Password cannot be empty!"
    exit 1
}

# URL encode the password
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($Password)

# Build the connection string
$connectionString = $connectionTemplate -replace "\[YOUR_PASSWORD\]", $encodedPassword

Write-Host "📝 Updating .env file..."

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove old POSTGRES_URL if it exists
    $content = $content -replace "(?m)^POSTGRES_URL=.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add new POSTGRES_URL at the end
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
Write-Host "   Password: [ENCODED]`n"

Write-Host "🧪 Testing connection..."
Write-Host "   Run: node test-connection-simple.js`n"







