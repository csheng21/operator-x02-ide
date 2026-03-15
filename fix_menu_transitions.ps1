# fix_menu_transitions.ps1
# Injects smooth opacity/scale pop-in animation before document.body.appendChild(menu)
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: fileClickHandlers.ts not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

# Find document.body.appendChild(menu) - last occurrence
$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "document\.body\.appendChild\(menu\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
    }
}

if ($appendIdx -lt 0) { Write-Host "ERROR: appendChild(menu) not found" -ForegroundColor Red; exit }
Write-Host "Found at line $($appendIdx+1)" -ForegroundColor Yellow

# Check already applied
$alreadyDone = $false
for ($i = [Math]::Max(0,$appendIdx-6); $i -lt $appendIdx; $i++) {
    if ($lines[$i] -match "requestAnimationFrame") { $alreadyDone = $true; break }
}
if ($alreadyDone) { Write-Host "Already applied - skipping." -ForegroundColor Green; exit }

# Insert pop-in BEFORE the appendChild line
$anim = @(
  '  // X02: Pop-in animation',
  '  menu.style.opacity = "0";',
  '  menu.style.transform = "translateY(-6px) scale(0.97)";',
  '  menu.style.transition = "opacity 0.13s ease, transform 0.13s cubic-bezier(0.22,1,0.36,1)";'
)

$before = $lines[0..($appendIdx-1)]
$after  = $lines[$appendIdx..($lines.Length-1)]
$lines  = $before + $anim + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

# Now add the rAF trigger AFTER appendChild (which shifted by $anim.Length lines)
$lines = Get-Content $f.FullName -Encoding UTF8
$newAppendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "document\.body\.appendChild\(menu\)" -and $lines[$i] -notmatch "//") {
        $newAppendIdx = $i
    }
}

$rafBlock = @(
  '  requestAnimationFrame(() => {',
  '    requestAnimationFrame(() => {',
  '      menu.style.opacity = "1";',
  '      menu.style.transform = "translateY(0) scale(1)";',
  '    });',
  '  });'
)

$before = $lines[0..$newAppendIdx]
$after  = $lines[($newAppendIdx+1)..($lines.Length-1)]
$lines  = $before + $rafBlock + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED (final): $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
Write-Host "Pop-in animation complete." -ForegroundColor Green
