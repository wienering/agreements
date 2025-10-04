Write-Host "Email Tracking Migration Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "This script will add email tracking fields to your Agreement table." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Run the SQL migration" -ForegroundColor Cyan
Write-Host "Copy and paste the following SQL commands into your database client (Neon Console, pgAdmin, etc.):" -ForegroundColor White
Write-Host ""
Write-Host "ALTER TABLE \"Agreement\" ADD COLUMN \"lastEmailedAt\" TIMESTAMP(3);" -ForegroundColor Gray
Write-Host "ALTER TABLE \"Agreement\" ADD COLUMN \"emailSendCount\" INTEGER NOT NULL DEFAULT 0;" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: After running the SQL, press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Step 3: Generate Prisma client" -ForegroundColor Cyan
Write-Host "Running: npx prisma generate" -ForegroundColor White
npx prisma generate

Write-Host ""
Write-Host "Step 4: Build the application" -ForegroundColor Cyan
Write-Host "Running: npm run build" -ForegroundColor White
npm run build

Write-Host ""
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host "New features added:" -ForegroundColor Yellow
Write-Host "- Last emailed date display on agreement cards" -ForegroundColor White
Write-Host "- Resend email button for LIVE and SIGNED agreements" -ForegroundColor White
Write-Host "- Different email messaging based on send count" -ForegroundColor White
Write-Host "- Email send count tracking" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
