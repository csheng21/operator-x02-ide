# fix_stray_bracket2.ps1 - Direct line removal by content match
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Target: find }); that sits alone between }, 80); and // Wait for render
$fixIdx = -1
for ($i = 3378; $i -le 3390; $i++) {
    if ($lines[$i].Trim() -eq "});" -and $lines[$i-1].Trim() -eq "}, 80);") {
        $fixIdx = $i
        Write-Host "Found stray at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($fixIdx -lt 0) {
    # Brute force: just remove index 3383 (line 3384, 0-indexed = 3383)
    $fixIdx = 3383
    Write-Host "Using direct index 3383 (line 3384)" -ForegroundColor Yellow
}

Write-Host "Removing: [$($lines[$fixIdx])]" -ForegroundColor Red

$before = $lines[0..($fixIdx-1)]
$after  = $lines[($fixIdx+1)..($lines.Length-1)]
$lines  = $before + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines 3379-3390 after fix:" -ForegroundColor Cyan
for ($i = 3378; $i -le 3389; $i++) { Write-Host "  $($i+1): $($v[$i])" }
