Write-Host "=== Agreement Cancellation Migration ===" -ForegroundColor Green
Write-Host ""
Write-Host "This script will add cancellation fields to your database." -ForegroundColor Yellow
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found. Please create one first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "The following SQL commands will be executed:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ALTER TABLE \"Agreement\" ADD COLUMN \"cancelledAt\" TIMESTAMP(3);" -ForegroundColor White
Write-Host "2. ALTER TABLE \"Agreement\" ADD COLUMN \"cancelledBy\" TEXT;" -ForegroundColor White
Write-Host "3. ALTER TABLE \"Agreement\" ADD COLUMN \"cancellationReason\" TEXT;" -ForegroundColor White
Write-Host "4. ALTER TYPE \"AgreementStatus\" ADD VALUE 'CANCELLED';" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Do you want to proceed? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Please run these SQL commands in your database client (Neon Console, pgAdmin, etc.):" -ForegroundColor Cyan
Write-Host ""
Write-Host "--- COPY AND PASTE THESE COMMANDS ---" -ForegroundColor Green
Write-Host ""
Get-Content "add_cancellation_fields.sql"
Write-Host ""
Write-Host "--- END OF COMMANDS ---" -ForegroundColor Green
Write-Host ""

Write-Host "After running the SQL commands, press Enter to continue..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "Testing database connection..." -ForegroundColor Cyan

# Test the connection
try {
    npx prisma db pull
    Write-Host "✓ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Database connection failed. Please check your DATABASE_URL in .env" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
try {
    npx prisma generate
    Write-Host "✓ Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to generate Prisma client" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Migration Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The cancellation feature is now ready to use." -ForegroundColor Cyan
Write-Host "You can now cancel signed agreements from the admin panel." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run dev' to start the development server" -ForegroundColor White
Write-Host "2. Go to the agreements page in the admin panel" -ForegroundColor White
Write-Host "3. Find a signed agreement and click the 'Cancel Agreement' button" -ForegroundColor White
Write-Host ""
