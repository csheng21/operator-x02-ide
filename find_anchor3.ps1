# Search main.ts for IDE Script injection point

$filePath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`n"

Write-Host "File: $filePath" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($content.Length/1024)) KB, Lines: $($lines.Count)" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== IDE Script lines ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "IDE Script|IDEScript|ide_script") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with 'injected' ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "injected" -and $lines[$i] -match "console") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Context/prompt variable assignments ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "(let|const|var)\s+\w*(context|prompt|system)\w*\s*[\+]?=" -or
        $l -match "\w*(context|prompt|system)\w*\s*\+=") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with 'surgical' or 'autonomous' context ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "surgical|autonomous" -and $lines[$i] -match "context|inject|aware") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== 20 lines around first 'IDE Script' match ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "IDE Script") {
        $start = [Math]::Max(0, $i - 5)
        $end = [Math]::Min($lines.Count - 1, $i + 15)
        for ($j = $start; $j -le $end; $j++) {
            $marker = if ($j -eq $i) { ">>>" } else { "   " }
            Write-Host "  $marker Line $($j+1): $($lines[$j].Trim())" -ForegroundColor $(if ($j -eq $i) { "Green" } else { "Gray" })
        }
        break
    }
}
