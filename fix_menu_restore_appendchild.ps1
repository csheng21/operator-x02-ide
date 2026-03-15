# fix_menu_restore_appendchild.ps1
# Restores the missing document.body.appendChild(menu) before the positioning rAF
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($lines.Length) lines" -ForegroundColor Cyan

# Find the positioning rAF line (Wait for render)
$rafIdx = -1
for ($i = 3380; $i -le 3400; $i++) {
    if ($lines[$i] -match "Wait for render") {
        $rafIdx = $i
        Write-Host "Found positioning rAF comment at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($rafIdx -lt 0) { Write-Host "ERROR: rAF block not found" -ForegroundColor Red; exit }

# Check appendChild not already there just above
$alreadyThere = $false
for ($i = $rafIdx-3; $i -lt $rafIdx; $i++) {
    if ($lines[$i] -match "body.appendChild") { $alreadyThere = $true; break }
}
if ($alreadyThere) { Write-Host "appendChild already present - no change needed." -ForegroundColor Green; exit }

# Insert appendChild(menu) on blank line before the rAF comment
$insert = @(
  '  document.body.appendChild(menu);',
  ''
)

$before = $lines[0..($rafIdx-1)]
$after  = $lines[$rafIdx..($lines.Length-1)]
$lines  = $before + $insert + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
Write-Host "Verified lines around fix:" -ForegroundColor Cyan
for ($i = $rafIdx-2; $i -le $rafIdx+5; $i++) { Write-Host "  $($i+1): $($v[$i])" }
