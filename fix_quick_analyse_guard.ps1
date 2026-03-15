# fix_quick_analyse_guard.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: file not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# ---- Find quickAnalyzeProject function ----
$funcIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "async function quickAnalyzeProject") {
        $funcIdx = $i
        Write-Host "Found at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}
if ($funcIdx -lt 0) { Write-Host "ERROR: function not found" -ForegroundColor Red; exit }

# ---- Check already applied ----
$alreadyDone = $false
for ($i = $funcIdx; $i -le ($funcIdx + 5); $i++) {
    if ($lines[$i] -match "__analysisMode.*true") { $alreadyDone = $true }
}
if ($alreadyDone) { Write-Host "Already applied." -ForegroundColor Green; exit }

# ---- Find opening brace of function body ----
$bodyStart = -1
for ($i = $funcIdx; $i -le ($funcIdx + 3); $i++) {
    if ($lines[$i] -match "\{") { $bodyStart = $i; break }
}
Write-Host "Body open at line $($bodyStart+1)" -ForegroundColor Yellow

# ---- Insert __analysisMode = true after opening brace ----
$guardOn = '  (window as any).__analysisMode = true; // X02: block AutoApply during analysis'
$before = $lines[0..$bodyStart]
$after  = $lines[($bodyStart+1)..($lines.Length-1)]
$lines  = $before + $guardOn + $after
Write-Host "Inserted guard ON after line $($bodyStart+1)" -ForegroundColor Green

# ---- Find try/catch/finally inside the function (re-scan with updated array) ----
$catchIdx = -1
$finallyIdx = -1
for ($i = $bodyStart+1; $i -lt [Math]::Min($bodyStart+420, $lines.Length); $i++) {
    if ($lines[$i] -match "^\s*} finally\s*\{") {
        $finallyIdx = $i
        break
    }
    if ($lines[$i] -match "^\s*} catch\s*\(") {
        $catchIdx = $i
    }
}

# Prefer finally, else use first catch
$insertBefore = -1
if ($finallyIdx -ge 0) {
    $insertBefore = $finallyIdx
    Write-Host "Will insert guard OFF before finally at line $($finallyIdx+1)" -ForegroundColor Yellow
} elseif ($catchIdx -ge 0) {
    $insertBefore = $catchIdx
    Write-Host "Will insert guard OFF before catch at line $($catchIdx+1)" -ForegroundColor Yellow
} else {
    # No try/catch - find closing } of function (next top-level function)
    Write-Host "No try/catch - searching for function end..." -ForegroundColor Yellow
    for ($i = $bodyStart+20; $i -lt [Math]::Min($bodyStart+420, $lines.Length); $i++) {
        if ($lines[$i] -match "^async function |^export function |^function ") {
            # walk back to find closing }
            for ($j = $i-1; $j -ge $bodyStart; $j--) {
                if ($lines[$j].Trim() -eq "}") { $insertBefore = $j; break }
            }
            break
        }
    }
    if ($insertBefore -ge 0) {
        Write-Host "Will insert guard OFF before function close at line $($insertBefore+1)" -ForegroundColor Yellow
    }
}

if ($insertBefore -lt 0) { 
    Write-Host "ERROR: Could not find insertion point for guard OFF" -ForegroundColor Red
    Write-Host "Saving guard ON only..."
    $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
    Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
    exit
}

# ---- Insert __analysisMode = false ----
$guardOff = '  (window as any).__analysisMode = false; // X02: restore after analysis'
$before2 = $lines[0..($insertBefore-1)]
$after2  = $lines[$insertBefore..($lines.Length-1)]
$lines   = $before2 + $guardOff + $after2
Write-Host "Inserted guard OFF before line $($insertBefore+1)" -ForegroundColor Green

$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

# ---- Verify ----
$v = Get-Content $f.FullName -Encoding UTF8
Write-Host ""
Write-Host "Verify:" -ForegroundColor Cyan
$inFunc = $false
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "async function quickAnalyzeProject") { $inFunc = $true }
    if ($inFunc -and $v[$i] -match "__analysisMode") {
        Write-Host "  Line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
    }
    if ($inFunc -and $i -gt ($funcIdx+10) -and $v[$i] -match "^async function |^export function ") { break }
}
