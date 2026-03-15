# scan_menu_structure.ps1 - Read hideTimeout + menu show patterns
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "=== hideTimeout lines ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "hideTimeout") {
        $s = [Math]::Max(0, $i-2); $e = [Math]::Min($lines.Length-1, $i+4)
        Write-Host "-- Line $($i+1) --" -ForegroundColor Yellow
        for ($j = $s; $j -le $e; $j++) { Write-Host "  $($j+1): $($lines[$j])" }
    }
}
Write-Host "" 
Write-Host "=== removeOnClick lines ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "removeOnClick") {
        $s = [Math]::Max(0, $i-2); $e = [Math]::Min($lines.Length-1, $i+4)
        Write-Host "-- Line $($i+1) --" -ForegroundColor Yellow
        for ($j = $s; $j -le $e; $j++) { Write-Host "  $($j+1): $($lines[$j])" }
    }
}
Write-Host ""
Write-Host "=== document.body.appendChild(menu) ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "body.appendChild" -or ($lines[$i] -match "appendChild" -and $lines[$i] -match "menu")) {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())"
    }
}
