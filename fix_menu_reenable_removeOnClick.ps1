# fix_menu_reenable_removeOnClick.ps1
# Re-enables the DISABLED removeOnClick listener (line 2791) with 100ms delay
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: fileClickHandlers.ts not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

$targetIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "DISABLED.*removeOnClick") {
        $targetIdx = $i
        Write-Host "Found DISABLED removeOnClick at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($targetIdx -lt 0) { Write-Host "DISABLED line not found - may already be fixed." -ForegroundColor Cyan; exit }

# Replace the disabled line with a clean short-delay version
$lines[$targetIdx] = '  setTimeout(() => document.addEventListener("click", (e) => { if (e.button !== 2) removeOnClick(e); }, { once: true }), 100);'

$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Verified line $($targetIdx+1): $($v[$targetIdx].Trim())" -ForegroundColor Cyan
