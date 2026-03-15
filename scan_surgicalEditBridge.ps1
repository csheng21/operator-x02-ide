# scan_surgicalEditBridge.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "surgicalEditBridge.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Find where content is written / validated
Write-Host "=== Write / apply locations ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "write_file|writeFile|string_replace|full_replace|newContent|replacement|apply.*content") {
        Write-Host "  $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
    }
}

# Find fullReplace or applySmartUpdate entry point
Write-Host ""
Write-Host "=== fullReplace / applySmartUpdate ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "fullReplace|fullReplaceSurgical|surgicalApplySmartUpdate|function.*apply") {
        Write-Host "  $($i+1): $($la[$i].Trim())" -ForegroundColor Green
        for ($j=$i+1; $j -le [Math]::Min($la.Length-1,$i+8); $j++) {
            Write-Host "    $($j+1): $($la[$j].Trim())"
        }
    }
}