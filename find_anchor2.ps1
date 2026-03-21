# Deep search for message/prompt building in autonomousCoding.ts

$filePath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\autonomousCoding.ts"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`n"

Write-Host "=== Lines with 'context' variable assignments ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "^\s*(let|const|var)\s+\w*[Cc]ontext\w*\s*=" -or
        $l -match "^\s*\w*[Cc]ontext\w*\s*\+?=\s*[``'\`"]") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with 'prompt' variable assignments ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "(let|const|var)\s+\w*[Pp]rompt\w*\s*=" -or
        $l -match "\w*[Pp]rompt\w*\s*\+?=\s*[``'\`"]") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with 'messages' array push ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "messages.*push|push.*role.*user|push.*role.*system|system.*content") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Functions containing 'send' or 'call' or 'api' ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "^(async\s+)?function\s+\w*(send|call|api|request|invoke|ask|query)\w*\s*\(" -or
        $l -match "^(const|let)\s+\w*(send|call|api|request|invoke|ask|query)\w*\s*=\s*(async\s+)?\(") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with 'userMessage' or 'user_message' ===" -ForegroundColor Cyan
$count = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "userMessage|user_message") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
        $count++
        if ($count -ge 15) { Write-Host "  ...(truncated)" -ForegroundColor Gray; break }
    }
}

Write-Host ""
Write-Host "=== Lines with 'enhanceMessage' or 'buildMessage' or 'prepareMessage' ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "enhanceMessage|buildMessage|prepareMessage|enrichMessage|augmentMessage|buildPrompt|preparePrompt") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with IDE Script string literal ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "IDE Script|ide_script|IDEScript") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines with surgical or autonomous context injection ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    $l = $lines[$i].Trim()
    if ($l -match "surgical.*inject|autonomous.*inject|inject.*context|inject.*prompt|awareness.*inject") {
        Write-Host "  Line $($i+1): $l" -ForegroundColor Yellow
    }
}
