# diagnose_menu_click.ps1 - Show exactly what was injected around line 3347
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "File: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

# Show 40 lines around the main menu appendChild
$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "document\.body\.appendChild\(menu\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
    }
}
Write-Host "=== Lines around appendChild(menu) at $($appendIdx+1) ===" -ForegroundColor Yellow
$s = [Math]::Max(0, $appendIdx - 10)
$e = [Math]::Min($lines.Length-1, $appendIdx + 50)
for ($i = $s; $i -le $e; $i++) { Write-Host "  $($i+1): $($lines[$i])" }

# Check if pointer-events is set anywhere near menu items
Write-Host ""
Write-Host "=== pointer-events occurrences ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "pointer-events|pointerEvents") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())"
    }
}

# Show menu item click handler setup
Write-Host ""
Write-Host "=== Menu item click handlers (lines 3200-3360) ===" -ForegroundColor Yellow
for ($i = 3199; $i -le [Math]::Min(3359, $lines.Length-1); $i++) {
    if ($lines[$i] -match "click|action|addEventListener") {
        Write-Host "  $($i+1): $($lines[$i].Trim())"
    }
}
