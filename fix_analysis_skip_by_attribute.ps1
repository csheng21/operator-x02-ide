# fix_analysis_skip_by_attribute.ps1
# NUCLEAR FIX: Mark analysis output with data-analysis-result attribute
# AutoApply checks for this and skips — no timing dependency
#
# Fix 1: projectFolderContextMenu.ts — add attribute to collapsible before append
# Fix 2: autonomousCoding.ts — skip blocks inside [data-analysis-result]

# ============ FIX 1: projectFolderContextMenu.ts ============
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "projectFolderContextMenu.ts: $($lines.Length) lines" -ForegroundColor Cyan

$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "appendChild\(collapsible\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
        Write-Host "Found appendChild(collapsible) at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($appendIdx -lt 0) { Write-Host "ERROR: appendChild(collapsible) not found" -ForegroundColor Red }
else {
    if ($lines[$appendIdx-1] -match "data-analysis-result") {
        Write-Host "Attribute already set - skipping Fix 1" -ForegroundColor Cyan
    } else {
        $attrLine = '    collapsible.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply'
        $before = $lines[0..($appendIdx-1)]
        $after  = $lines[$appendIdx..($lines.Length-1)]
        $lines  = $before + $attrLine + $after
        $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
        Write-Host "Fix 1 DONE: attribute set before append. Saved $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
    }
}

# ============ FIX 2: autonomousCoding.ts ============
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "autonomousCoding.ts: $($la.Length) lines" -ForegroundColor Cyan

# Find autoApplyNewCodeBlock function start
$funcIdx = -1
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "async function autoApplyNewCodeBlock") {
        $funcIdx = $i
        Write-Host "Found autoApplyNewCodeBlock at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($funcIdx -lt 0) { Write-Host "ERROR: autoApplyNewCodeBlock not found" -ForegroundColor Red }
else {
    # Find opening brace of function body
    $bodyIdx = -1
    for ($i = $funcIdx; $i -le ($funcIdx+3); $i++) {
        if ($la[$i] -match "\{") { $bodyIdx = $i; break }
    }

    # Check if attribute check already exists
    $alreadyDone = $false
    for ($i = $bodyIdx; $i -le ($bodyIdx+8); $i++) {
        if ($la[$i] -match "data-analysis-result") { $alreadyDone = $true; break }
    }

    if ($alreadyDone) {
        Write-Host "Fix 2 already applied - skipping" -ForegroundColor Cyan
    } else {
        $guard = @(
          '  // X02: Skip if block is inside an analysis result (Quick/Deep Analyze output)',
          '  if (block && block.closest("[data-analysis-result]")) {',
          '    console.log("[AutoApply] Skipped - inside analysis result");',
          '    return;',
          '  }'
        )
        $before = $la[0..$bodyIdx]
        $after  = $la[($bodyIdx+1)..($la.Length-1)]
        $la     = $before + $guard + $after
        $la -join "`n" | Set-Content $fa.FullName -NoNewline -Encoding UTF8
        Write-Host "Fix 2 DONE: attribute check added to autoApplyNewCodeBlock. Saved $((Get-Item $fa.FullName).Length) bytes" -ForegroundColor Green
    }
}

# ============ VERIFY ============
Write-Host ""
Write-Host "=== VERIFY ===" -ForegroundColor Cyan
$v = Get-Content $f.FullName -Encoding UTF8
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "data-analysis-result") {
        Write-Host "  projectFolderContextMenu.ts line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
    }
}
$va = Get-Content $fa.FullName -Encoding UTF8
for ($i = 0; $i -lt $va.Length; $i++) {
    if ($va[$i] -match "data-analysis-result") {
        Write-Host "  autonomousCoding.ts line $($i+1): $($va[$i].Trim())" -ForegroundColor Cyan
    }
}
