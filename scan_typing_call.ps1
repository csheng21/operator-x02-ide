# scan_typing_call.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "assistantUI.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8

Write-Host "=== showTypingIndicator calls ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "showTypingIndicator\(\)") {
        Write-Host "  Line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        for ($j=$i-3; $j -le $i+3; $j++) { Write-Host "    $($j+1): $($la[$j].Trim())" }
    }
}

Write-Host ""
Write-Host "=== sendMessageDirectly location ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "async function sendMessageDirectly|export.*sendMessageDirectly") {
        Write-Host "  Line $($i+1): $($la[$i].Trim())" -ForegroundColor Green
    }
}