# scan_quick_analyse.ps1 - Find Quick Analysis function and __analysisMode guard
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "File: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

# Find quickAnalyzeProject function
Write-Host "=== quickAnalyzeProject start ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "quickAnalyzeProject|quickAnalyze") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())"
    }
}

# Find __analysisMode guard
Write-Host ""
Write-Host "=== __analysisMode occurrences ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__analysisMode") {
        $s = [Math]::Max(0,$i-2); $e = [Math]::Min($lines.Length-1,$i+4)
        Write-Host "-- Line $($i+1) --" -ForegroundColor Cyan
        for ($j=$s; $j -le $e; $j++) { Write-Host "  $($j+1): $($lines[$j])" }
    }
}

# Find sendToAI / addMessageToChat calls in quick analysis
Write-Host ""
Write-Host "=== autonomousCoding.ts __analysisMode ===" -ForegroundColor Yellow
$fa = Get-ChildItem -Path "src" -Recurse -Filter "autonomousCoding.ts" | Sort-Object Length -Descending | Select-Object -First 1
if ($fa) {
    $la = Get-Content $fa.FullName -Encoding UTF8
    for ($i = 0; $i -lt $la.Length; $i++) {
        if ($la[$i] -match "__analysisMode") {
            $s = [Math]::Max(0,$i-3); $e = [Math]::Min($la.Length-1,$i+5)
            Write-Host "-- Line $($i+1) --" -ForegroundColor Cyan
            for ($j=$s; $j -le $e; $j++) { Write-Host "  $($j+1): $($la[$j])" }
        }
    }
}
