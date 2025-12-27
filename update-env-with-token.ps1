# Update .env with Supabase API token (optional, for Supabase client usage)
$envPath = Join-Path $PSScriptRoot ".env"

$supabaseUrl = "https://gkavyanjmbidysinsqaz.supabase.co"
$supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYXZ5YW5qbWJpZHlzaW5zcWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTI0ODAsImV4cCI6MjA4MDY2ODQ4MH0.MMiEhZLEepHB_sRJxOGJT9w6JkklYGEAiH-O2GtWbAU"

Write-Host "📝 Adding Supabase API configuration to .env..."
Write-Host "   (This is for Supabase client library, not database connection)`n"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Remove existing SUPABASE_URL and SUPABASE_ANON_KEY if they exist
    $content = $content -replace "(?m)^SUPABASE_URL=.*$", ""
    $content = $content -replace "(?m)^SUPABASE_ANON_KEY=.*$", ""
    $content = $content -replace "(?m)^SUPABASE_SERVICE_ROLE_KEY=.*$", ""
    
    # Clean up extra blank lines
    $content = $content -replace "(`r?`n){3,}", "`r`n`r`n"
    
    # Add Supabase API config
    $content = $content.TrimEnd() + "`n`n# Supabase API Configuration (for @supabase/supabase-js client)`nSUPABASE_URL=$supabaseUrl`nSUPABASE_ANON_KEY=$supabaseAnonKey`n"
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Added Supabase API configuration"
} else {
    Write-Host "❌ .env file not found. Please create it first with POSTGRES_URL"
}

Write-Host "`n⚠️  IMPORTANT: You still need POSTGRES_URL for database connection!"
Write-Host "   Get it from: Supabase Dashboard → Settings → Database → Connection string (URI)"
Write-Host "`n"







