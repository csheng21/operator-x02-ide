# fix_menu_opacity_restore.ps1
# Adds opacity=1 right after visibility:visible restore at line 3454
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Find visibility = visible restore line
$visIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "visibility" -and $lines[$i] -match "visible" -and $lines[$i] -notmatch "hidden" -and $lines[$i] -notmatch "//") {
        $visIdx = $i
        Write-Host "Found visibility:visible at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($visIdx -lt 0) { Write-Host "ERROR: visibility:visible not found" -ForegroundColor Red; exit }

# Check if opacity already set right after
if ($lines[$visIdx+1] -match "opacity") {
    Write-Host "Opacity already set after visibility restore - checking value..." -ForegroundColor Cyan
    Write-Host "  Line $($visIdx+2): $($lines[$visIdx+1].Trim())" -ForegroundColor Cyan
    exit
}

# Show context
Write-Host "Context:" -ForegroundColor Cyan
for ($i = $visIdx-2; $i -le $visIdx+5; $i++) { Write-Host "  $($i+1): $($lines[$i])" }

# Insert opacity=1 + transform reset right after visibility line
$restore = @(
  '    menu.style.opacity = "1";',
  '    menu.style.transform = "translateY(0) scale(1)";'
)

$before = $lines[0..$visIdx]
$after  = $lines[($visIdx+1)..($lines.Length-1)]
$lines  = $before + $restore + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Verified:" -ForegroundColor Cyan
for ($i = $visIdx-1; $i -le $visIdx+5; $i++) { Write-Host "  $($i+1): $($v[$i])" }
