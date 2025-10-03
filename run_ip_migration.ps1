# PowerShell script to help run the IP address migration
# This script will guide you through adding the signedFromIP column

Write-Host "=== IP Address Migration Helper ===" -ForegroundColor Green
Write-Host ""
Write-Host "The database needs to be updated to add the 'signedFromIP' column." -ForegroundColor Yellow
Write-Host ""
Write-Host "You have a few options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Using your database management tool (pgAdmin, DBeaver, etc.):" -ForegroundColor White
Write-Host "   - Connect to your PostgreSQL database" -ForegroundColor Gray
Write-Host "   - Run this SQL command:" -ForegroundColor Gray
Write-Host "   ALTER TABLE ""Agreement"" ADD COLUMN ""signedFromIP"" TEXT;" -ForegroundColor Red
Write-Host ""
Write-Host "2. Using psql command line (if installed):" -ForegroundColor White
Write-Host "   - Connect to your database" -ForegroundColor Gray
Write-Host "   - Run the SQL command above" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Using Neon Console (if using Neon):" -ForegroundColor White
Write-Host "   - Go to your Neon dashboard" -ForegroundColor Gray
Write-Host "   - Open the SQL Editor" -ForegroundColor Gray
Write-Host "   - Run the SQL command above" -ForegroundColor Gray
Write-Host ""
Write-Host "After running the migration, the application will work correctly." -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
