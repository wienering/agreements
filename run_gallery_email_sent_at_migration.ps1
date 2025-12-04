Write-Host "Gallery Email Sent At Migration Script" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

Write-Host "This script will add the galleryEmailSentAt field to track when gallery emails are sent." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Run the SQL migration" -ForegroundColor Cyan
Write-Host "Copy and paste the following SQL command into your Neon Console (or database client):" -ForegroundColor White
Write-Host ""
Write-Host "ALTER TABLE `"Agreement`" ADD COLUMN `"galleryEmailSentAt`" TIMESTAMP(3);" -ForegroundColor Gray
Write-Host ""
Write-Host "You can run this in:" -ForegroundColor White
Write-Host "  - Neon Console: https://console.neon.tech -> SQL Editor" -ForegroundColor Cyan
Write-Host "  - Or any PostgreSQL client connected to your Neon database" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 2: After running the SQL, press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Step 3: Generate Prisma client" -ForegroundColor Cyan
Write-Host "Running: npx prisma generate" -ForegroundColor White
npx prisma generate

Write-Host ""
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host "New features added:" -ForegroundColor Yellow
Write-Host "- Gallery email sent timestamp tracking" -ForegroundColor White
Write-Host "- Visual notice in admin UI when gallery email has been sent" -ForegroundColor White
Write-Host "- Prevents accidentally sending gallery emails twice" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

