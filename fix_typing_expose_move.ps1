# fix_typing_expose_move.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "assistantUI.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Step 1: Remove the bad block inserted between imports (lines 824-828)
$removeStart = -1
$removeEnd = -1
for ($i = 820; $i -le 835; $i++) {
    if ($la[$i] -match "X02: expose typing indicator") { $removeStart = $i }
    if ($removeStart -ge 0 -and $la[$i] -match "^\}$") { $removeEnd = $i; break }
}
if ($removeStart -lt 0) { Write-Host "Block not found to remove" -ForegroundColor Red; exit }
Write-Host "Removing lines $($removeStart+1) to $($removeEnd+1)" -ForegroundColor Yellow

# Remove block
$clean = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($i -ge $removeStart -and $i -le $removeEnd) { continue }
    $clean.Add($la[$i])
}

# Step 2: Find last import line
$lastImport = -1
for ($i = 0; $i -lt $clean.Count; $i++) {
    if ($clean[$i] -match "^import ") { $lastImport = $i }
}
Write-Host "Last import at line $($lastImport+1): $($clean[$lastImport].Trim())" -ForegroundColor Yellow

# Step 3: Insert window expose after last import
$expose = @'

// X02: expose typing indicator to window for DevTools testing
if (typeof window !== 'undefined') {
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
}
'@

$before = $clean.GetRange(0, $lastImport+1)
$after  = $clean.GetRange($lastImport+1, $clean.Count - $lastImport - 1)
$result = [System.Collections.Generic.List[string]]::new()
$result.AddRange($before)
$result.AddRange($expose.Split("`n"))
$result.AddRange($after)

$result -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
Write-Host "Saved: $((Get-Item $f).Length) bytes | $($result.Count) lines" -ForegroundColor Green

# Verify
$v = Get-Content $f -Encoding UTF8
for ($i = $lastImport-1; $i -le $lastImport+8; $i++) {
    Write-Host "  $($i+1): $($v[$i])" -ForegroundColor Cyan
}