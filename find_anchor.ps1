# Find the exact variable/string used for IDE script prompt in autonomousCoding.ts

$filePath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\autonomousCoding.ts"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Write-Host "=== Searching for IDE Script context variable ===" -ForegroundColor Cyan

$patterns = @(
    "ideScript",
    "ideContext",
    "scriptContext",
    "scriptPrompt",
    "IDE Script",
    "ide_script",
    "getIDEScript",
    "buildSystem",
    "systemContext",
    "contextParts",
    "extraContext",
    "injectedContext",
    "autonomousContext",
    "surgicalContext",
    "scriptInstructions"
)

foreach ($p in $patterns) {
    $matches = [regex]::Matches($content, "(?i)$p")
    if ($matches.Count -gt 0) {
        Write-Host "[FOUND x$($matches.Count)] $p" -ForegroundColor Green
        # Show first 2 occurrences with surrounding context
        $shown = 0
        foreach ($m in $matches) {
            if ($shown -ge 2) { break }
            $start = [Math]::Max(0, $m.Index - 60)
            $len = [Math]::Min(160, $content.Length - $start)
            $snippet = $content.Substring($start, $len) -replace "`r`n", " " -replace "`n", " "
            Write-Host "  ...${snippet}..." -ForegroundColor Gray
            $shown++
        }
    }
}

Write-Host ""
Write-Host "=== Lines containing 'injected' ===" -ForegroundColor Cyan
$lines = $content -split "`n"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "injected" -and $lines[$i] -match "console") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Lines containing 'systemPrompt' or 'system_prompt' ===" -ForegroundColor Cyan
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "systemPrompt|system_prompt") {
        Write-Host "  Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}
