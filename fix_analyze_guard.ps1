# fix_analyze_guard.ps1
$files = @(
    "src\ide\projectFolderContextMenu.ts",
    "src\ide\fileExplorer\fileTreeRenderer.ts"
)

foreach ($rel in $files) {
    $f = Join-Path (Get-Location) $rel
    if (-not (Test-Path $f)) { Write-Host "NOT FOUND: $f" -ForegroundColor Red; continue }
    
    $lines = [System.IO.File]::ReadAllText($f) -split "`n"
    $patched = 0

    Write-Host "`n=== $rel ===" -ForegroundColor Cyan

    # Show startQuickAnalysis and startDeepAnalysis function bodies
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "startQuickAnalysis|startDeepAnalysis|Quick.*analyz|Deep.*analyz") {
            Write-Host "Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        }
    }

    # Find lines that call sendToAI or sendMessage or similar WITHIN these functions
    # Look for the pattern: something that sends to AI near Quick/Deep analysis
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "sendToAI|sendMessage|smartAICall|window\.smartAI|callAI|aiCall" -and 
            $lines[$i] -notmatch "__analysisMode" -and
            $lines[$i] -notmatch "//") {
            
            # Check if this is inside a quick/deep analysis context
            # Look back up to 50 lines for the function name
            $inAnalysis = $false
            for ($j = [Math]::Max(0, $i-50); $j -lt $i; $j++) {
                if ($lines[$j] -match "Quick|Deep|startAnalysis|projectAnalysis") {
                    $inAnalysis = $true
                    break
                }
            }
            
            if ($inAnalysis) {
                Write-Host "  → AI send at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Magenta
                # Insert guard before this line
                $indent = $lines[$i] -replace "^(\s*).*", '$1'
                $guard = "${indent}(window as any).__analysisMode = true; // block pipeline during analysis"
                $lines[$i] = $guard + "`n" + $lines[$i]
                $patched++
                Write-Host "  ✅ Guard inserted before line $($i+1)" -ForegroundColor Green
            }
        }
    }

    if ($patched -gt 0) {
        [System.IO.File]::WriteAllText($f, ($lines -join "`n"))
        Write-Host "✅ $patched patch(es) applied to $rel" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No auto-patch applied - showing all AI calls:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "sendToAI|smartAICall|callAI|fetch.*api|proxy") {
                Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor White
            }
        }
    }
}

Write-Host "`nRun: npm run tauri dev" -ForegroundColor Cyan
