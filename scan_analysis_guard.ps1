# scan_analysis_guard.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines: $($lines.Length)" -ForegroundColor Cyan

Write-Host "=== All __analysisMode occurrences ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode") {
        $s = [Math]::Max(0,$i-2); $e = [Math]::Min($lines.Length-1,$i+3)
        Write-Host "-- Line $($i+1) --" -ForegroundColor Cyan
        for ($j=$s; $j -le $e; $j++) { Write-Host "  $($j+1): $($lines[$j])" }
    }
}
