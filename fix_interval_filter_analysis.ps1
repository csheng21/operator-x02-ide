# fix_interval_filter_analysis.ps1
# Filter analysis blocks from the setInterval path too (line ~8358-8362)
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
$la = Get-Content $fa.FullName -Encoding UTF8
Write-Host "Loaded: $($la.Length) lines" -ForegroundColor Cyan

# Find: const unprocessed = getUnprocessedCodeBlocks();
$unprocIdx = -1
for ($i = 8340; $i -le 8380; $i++) {
    if ($la[$i] -match "const unprocessed = getUnprocessedCodeBlocks") {
        $unprocIdx = $i
        Write-Host "Found unprocessed at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($unprocIdx -lt 0) {
    Write-Host "Searching broader range..." -ForegroundColor Yellow
    for ($i = 8300; $i -le 8420; $i++) {
        if ($la[$i] -match "getUnprocessedCodeBlocks") {
            Write-Host "  Line $($i+1): $($la[$i].Trim())" -ForegroundColor Cyan
        }
    }
    exit
}

# Check not already patched
if ($la[$unprocIdx+1] -match "data-analysis-result") {
    Write-Host "Already patched" -ForegroundColor Cyan; exit
}

# Insert filter after the unprocessed declaration
$filterLine = '      unprocessed = unprocessed.filter(b => !b.closest("[data-analysis-result]")); // X02: skip analysis'
$before = $la[0..$unprocIdx]
$after  = $la[($unprocIdx+1)..($la.Length-1)]
$la     = $before + $filterLine + $after
$la -join "`n" | Set-Content $fa.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $fa.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $fa.FullName -Encoding UTF8
Write-Host "Lines around fix:" -ForegroundColor Cyan
for ($i = $unprocIdx-1; $i -le $unprocIdx+5; $i++) { Write-Host "  $($i+1): $($v[$i])" }
