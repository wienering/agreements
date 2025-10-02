# Script to enable event fields after database migration
Write-Host "Enabling event fields in API endpoints..." -ForegroundColor Green

# Update clients/route.ts
$content = Get-Content "app/api/clients/route.ts" -Raw
$content = $content -replace "// eventType: eventType \|\| null,", "eventType: eventType || null,"
$content = $content -replace "// eventLocation: eventLocation \|\| null,", "eventLocation: eventLocation || null,"
$content = $content -replace "// eventStartTime: eventStartTime \|\| null,", "eventStartTime: eventStartTime || null,"
$content = $content -replace "// eventDuration: eventDuration \|\| null,", "eventDuration: eventDuration || null,"
$content = $content -replace "// eventPackage: eventPackage \|\| null,", "eventPackage: eventPackage || null,"
Set-Content "app/api/clients/route.ts" -Value $content -NoNewline

# Update clients/update/route.ts
$content = Get-Content "app/api/clients/update/route.ts" -Raw
$content = $content -replace "// eventType: validatedData\.eventType,", "eventType: validatedData.eventType,"
$content = $content -replace "// eventLocation: validatedData\.eventLocation,", "eventLocation: validatedData.eventLocation,"
$content = $content -replace "// eventStartTime: validatedData\.eventStartTime,", "eventStartTime: validatedData.eventStartTime,"
$content = $content -replace "// eventDuration: validatedData\.eventDuration,", "eventDuration: validatedData.eventDuration,"
$content = $content -replace "// eventPackage: validatedData\.eventPackage,", "eventPackage: validatedData.eventPackage,"
Set-Content "app/api/clients/update/route.ts" -Value $content -NoNewline

Write-Host "Event fields enabled! Now run: npm run build" -ForegroundColor Green
