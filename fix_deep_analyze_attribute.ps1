# fix_deep_analyze_attribute.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
$idx = 1624  # line 1625, 0-indexed = 1624
Write-Host "Line $($idx+1): $($lines[$idx].Trim())" -ForegroundColor Yellow
if ($lines[$idx-1] -match "data-analysis-result") {
    Write-Host "Already patched" -ForegroundColor Cyan; exit
}
$attrLine = '    collapsible.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply (deep)'
$before = $lines[0..($idx-1)]; $after = $lines[$idx..($lines.Length-1)]
$lines = $before + $attrLine + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines $idx to $($idx+3):" -ForegroundColor Cyan
for ($i=$idx-1; $i -le $idx+2; $i++) { Write-Host "  $($i+1): $($v[$i])" }
