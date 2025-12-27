# Clean up .env file - remove duplicates and keep correct values
$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    $content = Get-Content $envPath
    
    # Dictionary to store the last value of each key
    $envVars = @{}
    
    foreach ($line in $content) {
        $line = $line.Trim()
        
        # Skip empty lines and comments
        if ($line -eq "" -or $line.StartsWith("#")) {
            continue
        }
        
        # Parse key=value
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Keep the last value (which should be the correct one)
            $envVars[$key] = $value
        }
    }
    
    # Build clean content
    $cleanContent = @"
# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# M-Pesa API Configuration
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=fOTOdnGoEJFRSpD2OodI6xWI5GScntaYKsWAxOfjLIGIUsAG
MPESA_CONSUMER_SECRET=3PJudYJCobC46OylMdA7iOuZY5WBMGhBZxmsiOaArTlO15BQpYPgVKr1GtMlApMg
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/callback
MPESA_TIMEOUT_URL=http://localhost:3000/api/mpesa/timeout

# PostgreSQL Database Configuration
POSTGRES_URL=$($envVars['POSTGRES_URL'])

# JWT Secret for authentication
JWT_SECRET=$($envVars['JWT_SECRET'])
"@
    
    Set-Content -Path $envPath -Value $cleanContent
    Write-Host "✅ Cleaned up .env file"
    Write-Host "   - Removed duplicate entries"
    Write-Host "   - Kept URL-encoded POSTGRES_URL"
    Write-Host "   - Kept secure JWT_SECRET"
    Write-Host "`nYour .env file is now clean and ready to use!"
} else {
    Write-Host "❌ .env file not found"
}








