# scan_verify_attribute.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8

Write-Host "=== data-analysis-result in projectFolderContextMenu.ts ===" -ForegroundColor Yellow
$found = $false
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "data-analysis-result|appendChild\(collapsible\)") {
        $s = [Math]::Max(0,$i-2); $e = [Math]::Min($lines.Length-1,$i+2)
        Write-Host "-- Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Cyan
        $found = $true
    }
}
if (-not $found) { Write-Host "NOT FOUND - attribute fix missing!" -ForegroundColor Red }
