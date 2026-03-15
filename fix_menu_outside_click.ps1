# fix_menu_outside_click.ps1
# Injects click-outside + Escape key handler after document.body.appendChild(menu) at line 3347
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: fileClickHandlers.ts not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

# Find document.body.appendChild(menu) - the main menu show line
$appendIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "document\.body\.appendChild\(menu\)" -and $lines[$i] -notmatch "//") {
        $appendIdx = $i
        Write-Host "Found appendChild(menu) at line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

if ($appendIdx -lt 0) {
    Write-Host "ERROR: document.body.appendChild(menu) not found" -ForegroundColor Red; exit
}

Write-Host "Using last match at line $($appendIdx+1)" -ForegroundColor Cyan

# Check if already applied
$alreadyDone = $false
for ($i = $appendIdx; $i -le [Math]::Min($appendIdx+15, $lines.Length-1); $i++) {
    if ($lines[$i] -match "__menuOutsideClick") { $alreadyDone = $true; break }
}
if ($alreadyDone) { Write-Host "Already applied - skipping." -ForegroundColor Green; exit }

$block = @(
  '',
  '  // X02: Click-outside closes menu',
  '  const __menuOutsideClick = (ev: MouseEvent) => {',
  '    if (menu && !menu.contains(ev.target as Node)) {',
  '      menu.style.opacity = "0";',
  '      menu.style.transform = "translateY(-4px) scale(0.97)";',
  '      menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";',
  '      setTimeout(() => { menu?.remove(); }, 120);',
  '      document.removeEventListener("mousedown", __menuOutsideClick, true);',
  '      document.removeEventListener("keydown", __menuKeyHandler, true);',
  '    }',
  '  };',
  '  // X02: Escape key closes menu',
  '  const __menuKeyHandler = (ev: KeyboardEvent) => {',
  '    if (ev.key === "Escape") {',
  '      ev.preventDefault();',
  '      menu.style.opacity = "0";',
  '      menu.style.transform = "translateY(-4px) scale(0.97)";',
  '      menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";',
  '      setTimeout(() => { menu?.remove(); }, 120);',
  '      document.removeEventListener("mousedown", __menuOutsideClick, true);',
  '      document.removeEventListener("keydown", __menuKeyHandler, true);',
  '    }',
  '    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {',
  '      ev.preventDefault();',
  '      const items = Array.from(menu.querySelectorAll(".ctx-item, [data-action]")) as HTMLElement[];',
  '      const cur = items.findIndex(el => el === document.activeElement);',
  '      const nxt = ev.key === "ArrowDown" ? Math.min(cur+1, items.length-1) : Math.max(cur-1, 0);',
  '      items[nxt]?.focus();',
  '    }',
  '  };',
  '  setTimeout(() => {',
  '    document.addEventListener("mousedown", __menuOutsideClick, true);',
  '    document.addEventListener("keydown", __menuKeyHandler, true);',
  '  }, 80);'
)

$before = $lines[0..$appendIdx]
$after  = $lines[($appendIdx+1)..($lines.Length-1)]
$lines  = $before + $block + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green

$v = Get-Content $f.FullName -Encoding UTF8
for ($i=0; $i -lt $v.Length; $i++) {
    if ($v[$i] -match "__menuOutsideClick" -and $v[$i] -match "const") {
        Write-Host "Verified at line $($i+1): $($v[$i].Trim())" -ForegroundColor Cyan
    }
}
