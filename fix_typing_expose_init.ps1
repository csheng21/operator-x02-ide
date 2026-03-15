# fix_typing_expose_init.ps1
$f = (Get-ChildItem -Path "src" -Recurse -Filter "assistantUI.ts" | Sort-Object Length -Descending | Select-Object -First 1).FullName
$la = Get-Content $f -Encoding UTF8
Write-Host "Lines: $($la.Length)" -ForegroundColor Cyan

# Find initializeAssistantUI function opening
$targetIdx = -1
for ($i = 0; $i -lt $la.Length; $i++) {
    if ($la[$i] -match "export.*function initializeAssistantUI|async function initializeAssistantUI") {
        # Find the opening brace line
        for ($j=$i; $j -le $i+5; $j++) {
            if ($la[$j] -match "\{") { $targetIdx = $j; break }
        }
        Write-Host "Found initializeAssistantUI at line $($i+1), brace at $($targetIdx+1)" -ForegroundColor Yellow
        break
    }
}

if ($targetIdx -lt 0) { Write-Host "ERROR: initializeAssistantUI not found" -ForegroundColor Red; exit }
if ($la[$targetIdx+1] -match "X02.*window.*typing") { Write-Host "Already patched" -ForegroundColor Cyan; exit }

$expose = "  // X02: expose typing indicator to window`n  (window as any).showTypingIndicator = showTypingIndicator;`n  (window as any).hideTypingIndicator = hideTypingIndicator;"

$before = $la[0..$targetIdx]
$after  = $la[($targetIdx+1)..($la.Length-1)]
$newLines = $before + $expose.Split("`n") + $after
$newLines -join "`n" | Set-Content $f -NoNewline -Encoding UTF8
Write-Host "Saved: $((Get-Item $f).Length) bytes" -ForegroundColor Green

$v = Get-Content $f -Encoding UTF8
for ($i = $targetIdx-1; $i -le $targetIdx+5; $i++) {
    Write-Host "  $($i+1): $($v[$i])" -ForegroundColor Cyan
}