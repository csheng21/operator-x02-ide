# fix_stray_bracket.ps1 - Remove stray }); at line 3384
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Find the stray }); after the setTimeout 80ms block
$fixIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "^\s*}\s*\);\s*$" -and
        $lines[$i-1] -match "}, 80\);" -and
        $lines[$i+1] -match "Wait for render") {
        $fixIdx = $i
        Write-Host "Found stray }); at line $($i+1): [$($lines[$i])]" -ForegroundColor Yellow
        break
    }
}

if ($fixIdx -lt 0) {
    Write-Host "Showing lines 3380-3392 for manual check:" -ForegroundColor Yellow
    for ($i = 3379; $i -le 3391; $i++) { Write-Host "  $($i+1): $($lines[$i])" }
    exit
}

# Remove that single line
$before = $lines[0..($fixIdx-1)]
$after  = $lines[($fixIdx+1)..($lines.Length-1)]
$lines  = $before + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
for ($i = 3378; $i -le 3390; $i++) { Write-Host "  $($i+1): $($v[$i])" }
