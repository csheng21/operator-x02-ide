# scan_dialog_dismiss.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $f.FullName -Encoding UTF8

# Find all references to ai-status-dialog removal/hide/complete
Write-Host "=== Dialog dismiss/remove/hide references ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "ai-status-dialog|asd-|PipelineUI" -and
        $la[$i] -match "remove|hide|dismiss|complete|success|close|timeout|fadeOut|display.*none") {
        Write-Host "  $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
    }
}

# Find PipelineUI class / removeOverlay
Write-Host "" 
Write-Host "=== PipelineUI / removeOverlay ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "removeOverlay|hideOverlay|pipelineUI.*remove|class PipelineUI|function.*PipelineUI") {
        Write-Host "  $($i+1): $($la[$i].Trim())" -ForegroundColor Green
        # Show next 5 lines
        for ($j = $i+1; $j -le [Math]::Min($la.Length-1,$i+5); $j++) {
            Write-Host "    $($j+1): $($la[$j].Trim())"
        }
    }
}

# Find where dialog gets its "complete/success" state set
Write-Host ""
Write-Host "=== Dialog complete/success state ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "asd-" -and $la[$i] -match "complete|success|done|finish|stage.*7|confirm") {
        Write-Host "  $($i+1): $($la[$i].Trim())" -ForegroundColor Magenta
    }
}
