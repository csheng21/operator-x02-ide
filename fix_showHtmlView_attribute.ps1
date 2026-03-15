# fix_showHtmlView_attribute.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines: $($lines.Length)" -ForegroundColor Cyan

# Find showHtmlView function
$funcIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "function showHtmlView") { $funcIdx = $i; break }
}
if ($funcIdx -lt 0) { Write-Host "ERROR: showHtmlView not found"; exit }
Write-Host "showHtmlView at line $($funcIdx+1)" -ForegroundColor Yellow

# Show next 50 lines to find the DOM insert point
Write-Host "=== Function body ===" -ForegroundColor Cyan
for ($i = $funcIdx; $i -le [Math]::Min($funcIdx+60, $lines.Length-1); $i++) {
    if ($lines[$i] -match "appendChild|\.innerHTML|insertBefore|container\.append") {
        Write-Host "** Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    } else {
        Write-Host "   Line $($i+1): $($lines[$i].Trim())"
    }
}
