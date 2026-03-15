# fix_showHtmlView_final.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines: $($lines.Length)" -ForegroundColor Cyan

# Line 1656: overlay.className = 'html-view-overlay'; (index 1655)
# Insert setAttribute after className line
$targetIdx = 1655  # 0-indexed

if ($lines[$targetIdx] -notmatch "overlay.className") {
    # Search for it
    for ($i = 1640; $i -le 1670; $i++) {
        if ($lines[$i] -match "overlay\.className") { $targetIdx = $i; break }
    }
}

Write-Host "Target line $($targetIdx+1): $($lines[$targetIdx].Trim())" -ForegroundColor Yellow

if ($lines[$targetIdx+1] -match "data-analysis-result") {
    Write-Host "Already patched" -ForegroundColor Cyan; exit
}

$attrLine = '  overlay.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply'
$before = $lines[0..$targetIdx]
$after  = $lines[($targetIdx+1)..($lines.Length-1)]
$lines  = $before + $attrLine + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines $targetIdx to $($targetIdx+3):" -ForegroundColor Cyan
for ($i = $targetIdx; $i -le $targetIdx+2; $i++) { Write-Host "  $($i+1): $($v[$i])" }
