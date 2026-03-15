# fix_analysis_mode_double_bug.ps1
# FIX 1: autonomousCoding.ts - remove the self-resetting flag (line 6477)
# FIX 2: projectFolderContextMenu.ts - properly wrap quickAnalyzeProject with guard

# ============ FIX 1: autonomousCoding.ts ============
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "autonomousCoding.ts: $($la.Length) lines" -ForegroundColor Cyan

# Find the self-resetting line:
# if ((window as any).__analysisMode) { (window as any).__analysisMode = false; return; }
$resetIdx = -1
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "__analysisMode.*false.*return") {
        $resetIdx = $i
        Write-Host "Found self-reset at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($resetIdx -ge 0) {
    # Replace: remove the =false part, just return
    $la[$resetIdx] = '  if ((window as any).__analysisMode) { console.log(''[AutoApply] Skipped - analysis mode''); return; }'
    $la -join "`n" | Set-Content $fa.FullName -NoNewline -Encoding UTF8
    Write-Host "FIX 1 DONE: removed self-reset from __analysisMode check" -ForegroundColor Green
} else {
    Write-Host "FIX 1: self-reset line not found - checking nearby..." -ForegroundColor Yellow
    for ($i = 0; $i -lt $la.Length; $i++) {
        if ($la[$i] -match "__analysisMode") { Write-Host "  Line $($i+1): $($la[$i].Trim())" }
    }
}

# ============ FIX 2: projectFolderContextMenu.ts ============
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "projectFolderContextMenu.ts: $($lines.Length) lines" -ForegroundColor Cyan

# Check if guard already applied
$guardExists = $false
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode.*true" -and $lines[$i] -notmatch "//") {
        $guardExists = $true
        Write-Host "Guard ON found at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Cyan
    }
}

if (-not $guardExists) {
    # Find function body opening brace
    $funcIdx = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "async function quickAnalyzeProject") { $funcIdx = $i; break }
    }
    $bodyIdx = -1
    for ($i = $funcIdx; $i -le ($funcIdx+3); $i++) {
        if ($lines[$i] -match "\{") { $bodyIdx = $i; break }
    }
    Write-Host "Function body at line $($bodyIdx+1)" -ForegroundColor Yellow
    $guard = '  (window as any).__analysisMode = true;'
    $before = $lines[0..$bodyIdx]
    $after  = $lines[($bodyIdx+1)..($lines.Length-1)]
    $lines  = $before + $guard + $after
    $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
    Write-Host "FIX 2a DONE: inserted __analysisMode=true" -ForegroundColor Green
    $lines = Get-Content $f.FullName -Encoding UTF8
}

# Find where quickAnalyzeProject sends the AI result to chat
# and insert __analysisMode=false BEFORE that call
$sendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "addMessageToChat|sendToAI|addMsg" -and $i -gt 710 -and $i -lt 1200) {
        $sendIdx = $i
        Write-Host "Found send call at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($sendIdx -ge 0) {
    # Check guard off not already there
    if ($lines[$sendIdx-1] -notmatch "__analysisMode.*false") {
        $guardOff = '  (window as any).__analysisMode = false;'
        $before = $lines[0..($sendIdx-1)]
        $after  = $lines[$sendIdx..($lines.Length-1)]
        $lines  = $before + $guardOff + $after
        $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
        Write-Host "FIX 2b DONE: inserted __analysisMode=false before send at line $($sendIdx+1)" -ForegroundColor Green
    } else {
        Write-Host "FIX 2b: guard off already present" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "VERIFY - all __analysisMode in quickAnalyzeProject:" -ForegroundColor Cyan
$v = Get-Content $f.FullName -Encoding UTF8
$inFunc = $false
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "async function quickAnalyzeProject") { $inFunc = $true }
    if ($inFunc -and $v[$i] -match "__analysisMode") { Write-Host "  Line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan }
    if ($inFunc -and $i -gt 720 -and $v[$i] -match "^async function|^export function") { break }
}
