# scan_menu_block_raw.ps1 - Show raw lines 3330-3470
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "=== Lines 3330-3470 ===" -ForegroundColor Cyan
for ($i = 3329; $i -le 3469; $i++) { Write-Host "  $($i+1): $($lines[$i])" }
