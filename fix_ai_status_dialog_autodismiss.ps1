# fix_ai_status_dialog_autodismiss.ps1
# Find the ai-status-dialog initialization and add auto-dismiss + close button
$f = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $f.FullName -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Find ai-status-dialog creation
$dialogIdx = -1
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "ai-status-dialog" -and $la[$i] -match "createElement|id.*=|className.*=") {
        $dialogIdx = $i
        Write-Host "Found at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($dialogIdx -lt 0) {
    Write-Host "Searching for ai-status-dialog..." -ForegroundColor Yellow
    for ($i = 0; $i -lt $la.Length; $i++) {
        if ($la[$i] -match "ai-status-dialog") {
            Write-Host "  Line $($i+1): $($la[$i].Trim())" -ForegroundColor Cyan
        }
    }
} else {
    # Show context
    for ($i = [Math]::Max(0,$dialogIdx-2); $i -le [Math]::Min($la.Length-1,$dialogIdx+20); $i++) {
        Write-Host "  $($i+1): $($la[$i])"
    }
}
