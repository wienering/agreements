# Read the file content
$content = Get-Content -Path "app/admin/page.tsx" -Raw -Encoding UTF8

# Replace the icon placeholders with simple text
$replacements = @{
    "dY`"S" = "📊"
    'dY",' = "📄"  
    'dY"<' = "📝"
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

# Handle the problematic one separately by its position
$content = $content -replace "dY.\x60.", "👥"

# Write back
Set-Content -Path "app/admin/page.tsx" -Value $content -Encoding UTF8 -NoNewline

Write-Host "Icons fixed!"
