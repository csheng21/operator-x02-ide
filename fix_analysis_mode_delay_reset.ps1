# fix_analysis_mode_delay_reset.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "projectFolderContextMenu.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Target line 1117 (index 1116) directly
$idx = 1116
Write-Host "Line $($idx+1) before: $($lines[$idx].Trim())" -ForegroundColor Yellow

$lines[$idx] = '  setTimeout(() => { (window as any).__analysisMode = false; }, 500); // X02: delayed reset so MutationObserver fires while blocked'

$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Line $($idx+1) after: $($v[$idx].Trim())" -ForegroundColor Cyan
