# fix_menu_click_response.ps1
# ROOT CAUSE FIX:
#   1. Replace mousedown capture with click non-capture (was intercepting before items fire)
#   2. Add menu.stopPropagation so inside clicks dont trigger outside handler
#   3. Remove rAF pop-in that conflicts with existing positioning rAF at line 3395+
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: fileClickHandlers.ts not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

# ---- STEP 1: Find the injected block start (X02: Pop-in animation) ----
$blockStart = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "X02: Pop-in animation") {
        $blockStart = $i
        Write-Host "Found injected block start at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($blockStart -lt 0) { Write-Host "ERROR: injected block not found" -ForegroundColor Red; exit }

# ---- STEP 2: Find end of injected block (last }, after the setTimeout) ----
$blockEnd = -1
for ($i = $blockStart; $i -le ($blockStart + 60); $i++) {
    if ($lines[$i] -match "^\s*}\s*\);\s*$" -and $lines[$i-1] -match "keydown.*__menuKeyHandler") {
        $blockEnd = $i
        Write-Host "Found injected block end at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

# Fallback: find the rAF block end
if ($blockEnd -lt 0) {
    for ($i = $blockStart; $i -le ($blockStart + 60); $i++) {
        if ($lines[$i] -match "requestAnimationFrame" -and $lines[$i+3] -match "^\s*}\s*\);\s*$") {
            $blockEnd = $i + 3
            Write-Host "Found rAF block end at line $($blockEnd+1)" -ForegroundColor Yellow
            break
        }
    }
}

if ($blockEnd -lt 0) {
    Write-Host "Showing injected block for manual check:" -ForegroundColor Yellow
    for ($i = $blockStart; $i -le ($blockStart+50); $i++) { Write-Host "  $($i+1): $($lines[$i])" }
    exit
}

Write-Host "Replacing lines $($blockStart+1) to $($blockEnd+1)" -ForegroundColor Cyan

# ---- STEP 3: New clean block ----
# Uses click (not mousedown), stopPropagation on menu, no rAF conflict
$newBlock = @(
  '  // X02: Pop-in animation (visibility restored after positioning rAF)',
  '  menu.style.opacity = "0";',
  '  menu.style.transform = "translateY(-6px) scale(0.97)";',
  '  menu.style.transition = "opacity 0.13s ease, transform 0.13s cubic-bezier(0.22,1,0.36,1)";',
  '',
  '  // X02: Stop propagation so item clicks dont trigger outside handler',
  '  menu.addEventListener("click", (ev) => ev.stopPropagation());',
  '',
  '  // X02: Click-outside closes menu (uses click not mousedown - safe for item actions)',
  '  const __menuOutsideClick = (_ev: MouseEvent) => {',
  '    if (!menu) return;',
  '    menu.style.opacity = "0";',
  '    menu.style.transform = "translateY(-4px) scale(0.97)";',
  '    menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";',
  '    setTimeout(() => { menu?.remove(); }, 120);',
  '    document.removeEventListener("click", __menuOutsideClick);',
  '    document.removeEventListener("keydown", __menuKeyHandler, true);',
  '  };',
  '  // X02: Escape key + arrow navigation',
  '  const __menuKeyHandler = (ev: KeyboardEvent) => {',
  '    if (ev.key === "Escape") {',
  '      ev.preventDefault();',
  '      __menuOutsideClick(ev as any);',
  '    }',
  '    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {',
  '      ev.preventDefault();',
  '      const items = Array.from(menu.querySelectorAll(".ctx-item, [data-action]")) as HTMLElement[];',
  '      const cur = items.findIndex(el => el === document.activeElement);',
  '      const nxt = ev.key === "ArrowDown" ? Math.min(cur+1, items.length-1) : Math.max(cur-1, 0);',
  '      items[nxt]?.focus();',
  '    }',
  '  };',
  '  // 80ms delay so the right-click that opened menu doesnt immediately close it',
  '  setTimeout(() => {',
  '    document.addEventListener("click", __menuOutsideClick);',
  '    document.addEventListener("keydown", __menuKeyHandler, true);',
  '  }, 80);'
)

$before = $lines[0..($blockStart - 1)]
$after  = $lines[($blockEnd + 1)..($lines.Length - 1)]
$lines  = $before + $newBlock + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

# ---- STEP 4: Verify pop-in restore is wired to positioning rAF ----
# Find the positioning rAF (visibility restore) and inject opacity=1 there
$lines = Get-Content $f.FullName -Encoding UTF8
$visRestoreIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "style\.visibility\s*=\s*[`"']visible" -and $lines[$i] -notmatch "//") {
        $visRestoreIdx = $i
        Write-Host "Found visibility restore at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($visRestoreIdx -ge 0) {
    # Check if opacity=1 already wired here
    if ($lines[$visRestoreIdx+1] -notmatch "opacity.*1") {
        $opacityLines = @(
          '      menu.style.opacity = "1";',
          '      menu.style.transform = "translateY(0) scale(1)";'
        )
        $before = $lines[0..$visRestoreIdx]
        $after  = $lines[($visRestoreIdx+1)..($lines.Length-1)]
        $lines  = $before + $opacityLines + $after
        $lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
        Write-Host "Wired opacity pop-in to visibility restore." -ForegroundColor Green
    } else {
        Write-Host "Opacity already wired to visibility restore." -ForegroundColor Cyan
    }
} else {
    Write-Host "visibility:visible not found - menu may use display instead." -ForegroundColor Yellow
    Write-Host "Showing lines after appendChild for manual check:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "body\.appendChild\(menu\)") {
            for ($j = $i+1; $j -le ($i+30); $j++) { Write-Host "  $($j+1): $($lines[$j])" }
            break
        }
    }
}

Write-Host ""
Write-Host "DONE. Verify by checking lines around appendChild(menu):" -ForegroundColor Green
$v = Get-Content $f.FullName -Encoding UTF8
for ($i = 0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "body\.appendChild\(menu\)") {
        $s = [Math]::Max(0,$i-4); $e = [Math]::Min($v.Length-1,$i+45)
        for ($j=$s; $j -le $e; $j++) { Write-Host "  $($j+1): $($v[$j])" }
        break
    }
}
