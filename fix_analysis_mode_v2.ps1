# fix_analysis_mode_v2.ps1
# Insert __analysisMode=false with 500ms delay AFTER loadingDiv.appendChild(collapsible) line 1161
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Verify guard ON is in place
$guardOnFound = $false
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode.*true") {
        Write-Host "Guard ON at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Cyan
        $guardOnFound = $true
    }
}
if (-not $guardOnFound) { Write-Host "ERROR: guard ON missing!" -ForegroundColor Red; exit }

# Find loadingDiv.appendChild(collapsible)
$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "appendChild\(collapsible\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
        Write-Host "Found appendChild(collapsible) at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($appendIdx -lt 0) { Write-Host "ERROR: appendChild(collapsible) not found" -ForegroundColor Red; exit }

# Check not already applied
if ($lines[$appendIdx+1] -match "__analysisMode") {
    Write-Host "Already applied - skipping." -ForegroundColor Cyan; exit
}

# Insert delayed reset AFTER appendChild(collapsible)
$guardOff = '    setTimeout(() => { (window as any).__analysisMode = false; }, 500); // X02: delayed reset - MutationObserver sees true, blocks AutoApply'

$before = $lines[0..$appendIdx]
$after  = $lines[($appendIdx+1)..($lines.Length-1)]
$lines  = $before + $guardOff + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

# Verify
$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Verified lines around fix:" -ForegroundColor Cyan
for ($i = $appendIdx-1; $i -le $appendIdx+3; $i++) {
    Write-Host "  $($i+1): $($v[$i])"
}
