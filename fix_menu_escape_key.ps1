# fix_menu_escape_key.ps1
$f = Get-ChildItem -Path "src" -Recurse -Filter "fileClickHandlers.ts" | Sort-Object Length -Descending | Select-Object -First 1
if (-not $f) { Write-Host "ERROR: fileClickHandlers.ts not found" -ForegroundColor Red; exit }
$lines = Get-Content $f.FullName -Encoding UTF8
Write-Host "Loaded: $($f.FullName) ($($lines.Length) lines)" -ForegroundColor Cyan

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__menuKeyHandler") {
        Write-Host "Already applied at line $($i+1) - skipping." -ForegroundColor Green
        exit
    }
}

$insertAfter = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "__menuOutsideClick" -and $lines[$i] -match "const") {
        $insertAfter = $i - 1
        Write-Host "Inserting before __menuOutsideClick at line $($i+1)" -ForegroundColor Yellow
        break
    }
}

if ($insertAfter -lt 0) {
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "body.appendChild" -and $lines[$i] -match "menu") {
            $insertAfter = $i
            Write-Host "Fallback: after body.appendChild at line $($i+1)" -ForegroundColor Yellow
            break
        }
    }
}

if ($insertAfter -lt 0) { Write-Host "ERROR: No insertion point found" -ForegroundColor Red; exit }

$escBlock = @(
  '  // X02 FIX: Escape key + arrow navigation',
  '  const __menuKeyHandler = (ev: KeyboardEvent) => {',
  '    if (ev.key === "Escape") {',
  '      ev.preventDefault();',
  '      menu.style.opacity = "0";',
  '      menu.style.transform = "translateY(-4px) scale(0.97)";',
  '      menu.style.transition = "opacity 0.12s ease, transform 0.12s ease";',
  '      setTimeout(() => { menu?.remove(); }, 120);',
  '      document.removeEventListener("keydown", __menuKeyHandler, true);',
  '    }',
  '    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {',
  '      ev.preventDefault();',
  '      const items = Array.from(menu.querySelectorAll(".ctx-item, [data-action]")) as HTMLElement[];',
  '      const cur = items.findIndex(el => el === document.activeElement);',
  '      const nxt = ev.key === "ArrowDown" ? Math.min(cur + 1, items.length - 1) : Math.max(cur - 1, 0);',
  '      items[nxt]?.focus();',
  '    }',
  '  };',
  '  document.addEventListener("keydown", __menuKeyHandler, true);'
)

$before = $lines[0..$insertAfter]
$after  = $lines[($insertAfter + 1)..($lines.Length - 1)]
$lines  = $before + $escBlock + $after
$lines -join "`n" | Set-Content $f.FullName -NoNewline -Encoding UTF8
Write-Host "SAVED: $((Get-Item $f.FullName).Length) bytes" -ForegroundColor Green
Write-Host 'Escape key + arrow navigation injected.' -ForegroundColor Green
