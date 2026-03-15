# fix_typing_indicator_window_expose.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "assistantUI.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length) | File: $f" -ForegroundColor Cyan

# Find the typingIndicator import line
$targetIdx = -1
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "import.*showTypingIndicator.*hideTypingIndicator.*typingIndicator") {
        $targetIdx = $i
        Write-Host "Found import at line $($i+1): $($la[$i].Trim())" -ForegroundColor Yellow
        break
    }
}

if ($targetIdx -lt 0) { Write-Host "ERROR: import not found" -ForegroundColor Red; exit }

# Check if already patched
if ($la[$targetIdx+1] -match "X02.*window.*expose") {
    Write-Host "Already patched" -ForegroundColor Cyan; exit
}

$expose = @'
// X02: expose typing indicator to window
if (typeof window !== 'undefined') {
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
}
'@

$before = $la[0..$targetIdx]
$after  = $la[($targetIdx+1)..($la.Length-1)]
$newLines = $before + $expose.Split("`n") + $after
$newLines -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
Write-Host "Saved: $((Get-Item $f).Length) bytes" -ForegroundColor Green

# Verify
$v = Get-Content $f -Encoding UTF8
for ($i = $targetIdx; $i -le $targetIdx+6; $i++) {
    Write-Host "  $($i+1): $($v[$i])" -ForegroundColor Cyan
}