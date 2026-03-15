# fix_ai_status_dialog_dismiss.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

$dismissSnippet = '      setTimeout(() => { const d = document.getElementById("ai-status-dialog"); if (d) { d.style.transition = "opacity 0.4s"; d.style.opacity = "0"; setTimeout(() => d.remove(), 420); } }, 3000); // X02: auto-dismiss'

$patched = 0

# Fix location 1: around line 3804 - surgicalPipeline.end(true) in multi-file path
for ($i = 3795; $i -le 3815; $i++) {
    if ($la[$i] -match "surgicalPipeline\.end\(true\)" -and $la[$i+1] -notmatch "auto-dismiss") {
        Write-Host "Patching location 1 at line $($i+1)" -ForegroundColor Yellow
        $before = $la[0..$i]
        $after  = $la[($i+1)..($la.Length-1)]
        $la     = $before + $dismissSnippet + $after
        $patched++
        break
    }
}

# Fix location 2: around line 6713 - surgicalPipeline.end(true) in single-file path  
for ($i = 6705; $i -le 6725; $i++) {
    if ($la[$i] -match "surgicalPipeline\.end\(true\)" -and $la[$i+1] -notmatch "auto-dismiss") {
        Write-Host "Patching location 2 at line $($i+1)" -ForegroundColor Yellow
        $before = $la[0..$i]
        $after  = $la[($i+1)..($la.Length-1)]
        $la     = $before + $dismissSnippet + $after
        $patched++
        break
    }
}

if ($patched -eq 0) {
    Write-Host "ERROR: No patch locations found" -ForegroundColor Red
} else {
    $la -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
    Write-Host "Saved $patched patches: $((Get-Item $f).Length) bytes" -ForegroundColor Green
    # Verify
    $v = Get-Content $f -Encoding UTF8
    for ($i = 0; $i -lt $v.Length; $i++) {
        if ($v[$i] -match "auto-dismiss") {
            Write-Host "  Verified at line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
        }
    }
}