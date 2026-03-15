# fix_autoapply_final.ps1
# Fix 1: Change const unprocessed -> let unprocessed (assignment to const error)
# Fix 2: Add data-analysis-result attribute to showHtmlView output

# === FIX 1: autonomousCoding.ts - const -> let ===
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "autonomousCoding.ts: $($la.Length) lines" -ForegroundColor Cyan

$fixed = $false
for ($i = 8340; $i -le 8380; $i++) {
    if ($la[$i] -match "^\s*const unprocessed = getUnprocessedCodeBlocks") {
        Write-Host "Found const at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        $la[$i] = $la[$i] -replace "^\s*const unprocessed", "      let unprocessed"
        Write-Host "Fixed: $($la[$i].Trim())" -ForegroundColor Green
        $fixed = $true
        break
    }
}
if (-not $fixed) { Write-Host "ERROR: const unprocessed not found" -ForegroundColor Red }
else {
    $la -join "`n" | Set-Content $fa.FullName -NoNewline -Encoding UTF8
    Write-Host "Saved autonomousCoding.ts: $((Get-Item $fa.FullName).Length) bytes" -ForegroundColor Green
}

# === FIX 2: projectFolderContextMenu.ts - showHtmlView ===
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8

# Find showHtmlView function and look for an appendChild or container append
$htmlViewIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "function showHtmlView") {
        $htmlViewIdx = $i
        Write-Host "Found showHtmlView at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($htmlViewIdx -lt 0) {
    Write-Host "showHtmlView not found - searching for line 1723 context" -ForegroundColor Yellow
    for ($i = 1718; $i -le 1730; $i++) {
        Write-Host "  $($i+1): $($lines[$i])" -ForegroundColor Cyan
    }
} else {
    # Show surrounding lines
    Write-Host "Lines around showHtmlView:" -ForegroundColor Cyan
    for ($i = $htmlViewIdx; $i -le [Math]::Min($htmlViewIdx+30, $lines.Length-1); $i++) {
        if ($lines[$i] -match "appendChild|\.innerHTML") {
            Write-Host "  ** Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        }
    }
}
