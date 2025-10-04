# Fix Database Connection Pool Timeout
# This script helps you update your DATABASE_URL with proper connection pooling

Write-Host "=== Database Connection Pool Fix ===" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "Found .env file" -ForegroundColor Yellow
    
    # Read current DATABASE_URL
    $envContent = Get-Content ".env"
    $databaseUrlLine = $envContent | Where-Object { $_ -match "^DATABASE_URL=" }
    
    if ($databaseUrlLine) {
        Write-Host "Current DATABASE_URL found" -ForegroundColor Yellow
        Write-Host "Current URL: $databaseUrlLine" -ForegroundColor Gray
        
        # Extract the base URL without parameters
        $baseUrl = $databaseUrlLine -replace '^DATABASE_URL="([^?]+).*"$', '$1'
        
        if ($baseUrl -ne $databaseUrlLine) {
            Write-Host ""
            Write-Host "Base URL extracted: $baseUrl" -ForegroundColor Cyan
            
            # Create new URL with connection pooling parameters
            $newUrl = "${baseUrl}?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=60&connect_timeout=30"
            
            Write-Host ""
            Write-Host "New URL with connection pooling:" -ForegroundColor Green
            Write-Host "DATABASE_URL=`"$newUrl`"" -ForegroundColor White
            
            Write-Host ""
            Write-Host "Would you like to update your .env file? (y/n)" -ForegroundColor Yellow
            $response = Read-Host
            
            if ($response -eq "y" -or $response -eq "Y") {
                # Update the .env file
                $newEnvContent = $envContent | ForEach-Object {
                    if ($_ -match "^DATABASE_URL=") {
                        "DATABASE_URL=`"$newUrl`""
                    } else {
                        $_
                    }
                }
                
                $newEnvContent | Set-Content ".env"
                Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
            } else {
                Write-Host "❌ Update cancelled" -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Could not extract base URL from current DATABASE_URL" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ DATABASE_URL not found in .env file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file with your DATABASE_URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Make sure your DATABASE_URL includes these parameters:" -ForegroundColor White
Write-Host "   ?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=60&connect_timeout=30" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart your development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Try updating the template again" -ForegroundColor White
