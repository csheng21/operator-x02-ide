# fix_observer_filter_analysis.ps1
# Filter out analysis-result blocks BEFORE autoApplyNewCodeBlock is called
# Line 8285: if (newBlocks.length > 0 && autoApplyEnabled && !isProcessingMultiFile)
# Add filter just before this check to remove blocks inside [data-analysis-result]

$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "Loaded: $($la.Length) lines" -ForegroundColor Cyan

# Find the exact line with the newBlocks.length > 0 check inside the MutationObserver
$checkIdx = -1
for ($i = 8280; $i -le 8295; $i++) {
    if ($la[$i] -match "newBlocks\.length.*autoApplyEnabled") {
        $checkIdx = $i
        Write-Host "Found check at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($checkIdx -lt 0) {
    Write-Host "ERROR: newBlocks check not found in range 8281-8296" -ForegroundColor Red
    # Show actual lines
    for ($i = 8280; $i -le 8295; $i++) { Write-Host "  $($i+1): $($la[$i])" }
    exit
}

# Check not already patched
if ($la[$checkIdx-1] -match "data-analysis-result") {
    Write-Host "Already patched at line $($checkIdx)" -ForegroundColor Cyan; exit
}

# Insert filter line before the check
$filterLine = '    newBlocks = newBlocks.filter(b => !b.closest("[data-analysis-result]")); // X02: skip analysis output'

$before = $la[0..($checkIdx-1)]
$after  = $la[$checkIdx..($la.Length-1)]
$la     = $before + $filterLine + $after

$la -join "`n" | Set-Content $fa.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $fa.FullName).Length) bytes" -ForegroundColor Green

# Verify context
$v = Get-Content $fa.FullName -Encoding UTF8
Write-Host "Lines around fix:" -ForegroundColor Cyan
for ($i = $checkIdx-2; $i -le $checkIdx+4; $i++) {
    Write-Host "  $($i+1): $($v[$i])"
}
