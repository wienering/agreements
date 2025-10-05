# PowerShell script to fix the database schema issue
# This will help you resolve the "column does not exist" error

Write-Host "🔧 Database Schema Fix" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""

Write-Host "The error you're seeing is because the new database fields haven't been added yet." -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Here are your options:" -ForegroundColor Green
Write-Host ""

Write-Host "Option 1: Add the new fields to your database (Recommended)" -ForegroundColor Cyan
Write-Host "1. Run the SQL commands in 'fix_schema_temporarily.sql'" -ForegroundColor White
Write-Host "2. This adds the basic fields needed for the app to work" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Use the full migration (Complete features)" -ForegroundColor Cyan
Write-Host "1. Run the SQL commands in 'add_business_intelligence_features.sql'" -ForegroundColor White
Write-Host "2. This adds all the new business intelligence features" -ForegroundColor White
Write-Host ""

Write-Host "Option 3: Temporarily disable new features" -ForegroundColor Cyan
Write-Host "1. Replace schema.prisma with schema_backup.prisma" -ForegroundColor White
Write-Host "2. This removes the new fields temporarily" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Which option would you like? (1/2/3)"
Write-Host ""

switch ($choice) {
    "1" {
        Write-Host "✅ Option 1: Adding basic fields..." -ForegroundColor Green
        Write-Host ""
        Write-Host "📄 Please run these SQL commands in your database:" -ForegroundColor Yellow
        Write-Host "File: fix_schema_temporarily.sql" -ForegroundColor White
        Write-Host ""
        Write-Host "This will add:" -ForegroundColor Cyan
        Write-Host "• lastModifiedBy, changeSummary, isActive to Template table" -ForegroundColor White
        Write-Host "• packagePrice, estimatedRevenue to Agreement table" -ForegroundColor White
        Write-Host ""
    }
    "2" {
        Write-Host "✅ Option 2: Full business intelligence features..." -ForegroundColor Green
        Write-Host ""
        Write-Host "📄 Please run these SQL commands in your database:" -ForegroundColor Yellow
        Write-Host "File: add_business_intelligence_features.sql" -ForegroundColor White
        Write-Host ""
        Write-Host "This will add all the new features:" -ForegroundColor Cyan
        Write-Host "• Revenue tracking" -ForegroundColor White
        Write-Host "• Client retention" -ForegroundColor White
        Write-Host "• Template version control" -ForegroundColor White
        Write-Host "• Audit logging" -ForegroundColor White
        Write-Host ""
    }
    "3" {
        Write-Host "✅ Option 3: Temporarily disabling new features..." -ForegroundColor Green
        Write-Host ""
        Write-Host "This will replace your current schema with a backup version." -ForegroundColor Yellow
        Write-Host "The new features will be disabled until you run the migration." -ForegroundColor Yellow
        Write-Host ""
        
        $confirm = Read-Host "Are you sure you want to disable the new features? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "🔄 Replacing schema..." -ForegroundColor Yellow
            
            # Backup current schema
            Copy-Item "prisma\schema.prisma" "prisma\schema_current.prisma" -Force
            Write-Host "✅ Current schema backed up to schema_current.prisma" -ForegroundColor Green
            
            # Replace with backup
            Copy-Item "prisma\schema_backup.prisma" "prisma\schema.prisma" -Force
            Write-Host "✅ Schema replaced with backup version" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "🔄 Regenerating Prisma client..." -ForegroundColor Yellow
            npx prisma generate
            
            Write-Host ""
            Write-Host "✅ Done! The app should now work without the new features." -ForegroundColor Green
            Write-Host "To re-enable features later, restore schema_current.prisma and run the migration." -ForegroundColor Cyan
        } else {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
        }
    }
    default {
        Write-Host "Invalid choice. Please run the script again and choose 1, 2, or 3." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📞 Need Help?" -ForegroundColor Yellow
Write-Host "If you need assistance with the database migration:" -ForegroundColor Cyan
Write-Host "• Check your database connection settings" -ForegroundColor White
Write-Host "• Ensure you have the necessary permissions" -ForegroundColor White
Write-Host "• Test the connection before running migrations" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
