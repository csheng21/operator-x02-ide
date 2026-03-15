# scan_observer_and_autoapply.ps1
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

Write-Host "=== MutationObserver callbacks (lines 8270-8370) ===" -ForegroundColor Yellow
for ($i = 8269; $i -le [Math]::Min(8369, $la.Length-1); $i++) {
    Write-Host "$($i+1): $($la[$i])"
}

Write-Host ""
Write-Host "=== autoApplyNewCodeBlock start ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "autoApplyNewCodeBlock") {
        $s = [Math]::Max(0,$i-1); $e = [Math]::Min($la.Length-1,$i+15)
        Write-Host "-- Line $($i+1) --"
        for ($j=$s; $j -le $e; $j++) { Write-Host "  $($j+1): $($la[$j])" }
        break
    }
}

Write-Host ""
Write-Host "=== data-analysis-result occurrences ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "data-analysis-result") {
        Write-Host "  Line $($i+1): $($la[$i].Trim())" -ForegroundColor Cyan
    }
}
