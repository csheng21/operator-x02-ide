# scan_menu_show.ps1 - Show full menu build + show block
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "File: $($lines.Length) lines" -ForegroundColor Cyan

# Find appendChild(menu) and show 60 lines before it
$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "document\.body\.appendChild\(menu\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
    }
}
Write-Host "appendChild(menu) at line $($appendIdx+1)" -ForegroundColor Yellow
$s = [Math]::Max(0, $appendIdx - 25)
$e = [Math]::Min($lines.Length-1, $appendIdx + 60)
for ($i = $s; $i -le $e; $i++) { Write-Host "  $($i+1): $($lines[$i])" }

# Also check visibility restore
Write-Host ""
Write-Host "=== visibility lines ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "visibility") { Write-Host "  $($i+1): $($lines[$i].Trim())" }
}
