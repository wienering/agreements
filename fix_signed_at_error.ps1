# Fix signedAt column error
Write-Host "Adding signedAt column to Agreement table..." -ForegroundColor Green

# SQL command to add the column
$sqlCommand = @"
ALTER TABLE "Agreement" ADD COLUMN "signedAt" TIMESTAMP(3);
"@

Write-Host "Please run this SQL command in your database admin tool (Neon):" -ForegroundColor Yellow
Write-Host ""
Write-Host $sqlCommand -ForegroundColor Cyan
Write-Host ""
Write-Host "After running the SQL command, the signing functionality will work properly." -ForegroundColor Green
Write-Host ""
Write-Host "Steps:" -ForegroundColor Yellow
Write-Host "1. Go to your Neon database dashboard" -ForegroundColor White
Write-Host "2. Open the SQL editor" -ForegroundColor White
Write-Host "3. Copy and paste the SQL command above" -ForegroundColor White
Write-Host "4. Execute the command" -ForegroundColor White
Write-Host "5. Test the signing functionality" -ForegroundColor White
