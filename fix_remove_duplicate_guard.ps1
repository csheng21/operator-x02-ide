# fix_remove_duplicate_guard.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Find and remove duplicate: two __analysisMode=true in a row
$removeIdx = -1
for ($i = 1; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode" -and $lines[$i] -match "true" -and
        $lines[$i-1] -match "__analysisMode" -and $lines[$i-1] -match "true") {
        $removeIdx = $i
        Write-Host "Removing duplicate at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($removeIdx -ge 0) {
    $before = $lines[0..($removeIdx-1)]
    $after  = $lines[($removeIdx+1)..($lines.Length-1)]
    $lines  = $before + $after
    $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
    Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
} else {
    Write-Host "No duplicate found - already clean" -ForegroundColor Cyan
}

# Show final state around line 710
$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines 709-715:" -ForegroundColor Cyan
for ($i = 708; $i -le 714; $i++) { Write-Host "  $($i+1): $($v[$i])" }
