# PowerShell script to run the business intelligence database migration
# This script will help you add the new fields and models to your database

Write-Host "🚀 Business Intelligence Database Migration" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

Write-Host "This script will add the following features to your database:" -ForegroundColor Yellow
Write-Host "• Revenue tracking fields (packagePrice, estimatedRevenue)" -ForegroundColor Cyan
Write-Host "• Template version control (lastModifiedBy, changeSummary, isActive)" -ForegroundColor Cyan
Write-Host "• Client retention tracking (ClientRetention model)" -ForegroundColor Cyan
Write-Host "• Agreement view tracking (AgreementView model)" -ForegroundColor Cyan
Write-Host "• Audit trail improvements" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANT: Make sure you have a database backup before proceeding!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Do you want to proceed with the migration? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "📋 Migration Steps:" -ForegroundColor Green
Write-Host "1. Copy the SQL commands from 'add_business_intelligence_features.sql'"
Write-Host "2. Run them in your database management tool (pgAdmin, DBeaver, etc.)"
Write-Host "3. Or use psql command line if you have it installed"
Write-Host ""

Write-Host "📄 SQL Migration File Location:" -ForegroundColor Yellow
Write-Host "File: add_business_intelligence_features.sql" -ForegroundColor White
Write-Host "Full Path: $PSScriptRoot\add_business_intelligence_features.sql" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Alternative: Use Prisma Studio" -ForegroundColor Green
Write-Host "If you have database access, you can also run:" -ForegroundColor Cyan
Write-Host "npx prisma studio" -ForegroundColor White
Write-Host "Then manually execute the SQL commands in the SQL editor"
Write-Host ""

Write-Host "✅ After running the migration:" -ForegroundColor Green
Write-Host "1. Test the application to ensure everything works"
Write-Host "2. Check that the new fields are visible in the admin interface"
Write-Host "3. Verify that the enhanced dashboard loads correctly"
Write-Host ""

Write-Host "📞 Need Help?" -ForegroundColor Yellow
Write-Host "If you encounter any issues, check:" -ForegroundColor Cyan
Write-Host "• Database connection settings in .env file"
Write-Host "• Database permissions for the user"
Write-Host "• Network connectivity to your database"
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "🎯 Migration completed! Your business intelligence features are ready to use." -ForegroundColor Green
