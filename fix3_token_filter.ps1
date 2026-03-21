# Fix 3 - Token filter and context cap
# No here-strings - avoids all curly brace PS parsing issues

$mainFile = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"
$backup = "$mainFile.fix3.bak"
Copy-Item $mainFile $backup -Force
Write-Host "Backup OK" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($mainFile, [System.Text.Encoding]::UTF8)
Write-Host "Loaded $([math]::Round($content.Length/1024))KB" -ForegroundColor Cyan

if ($content.Contains("FIX3_TOKEN_FILTER")) {
    Write-Host "Already patched" -ForegroundColor Yellow
    exit 0
}

# Write TypeScript snippets to temp files to avoid PS parsing issues
$tempA = "$env:TEMP\fix3a.txt"
$tempB = "$env:TEMP\fix3b.txt"

# Snippet A: the filter function
$linesA = @(
    "",
    "// FIX3_TOKEN_FILTER - rejects CSS/numeric tokens from file mention detection",
    "function isValidFileMention(token) {",
    "  if (!token || token.length < 4) return false;",
    "  if (!token.includes('.')) return false;",
    "  if (/^[\d.]+(%|px|rem|em|s|ms|vw|vh|fr)?$/.test(token)) return false;",
    "  if (/^rgba?|^hsla?|^#[0-9a-f]/i.test(token)) return false;",
    "  if (token.startsWith('e.') || token.startsWith('window.') || token.startsWith('document.')) return false;",
    "  const ext = token.split('.').pop()?.toLowerCase() || '';",
    "  return ['ts','tsx','js','jsx','css','html','json','md','py','rs','cpp','java','go','vue'].includes(ext);",
    "}",
    ""
)
[System.IO.File]::WriteAllLines($tempA, $linesA, [System.Text.Encoding]::UTF8)

# Snippet B: apply filter before the mentions log
$linesB = @(
    "    // FIX3_TOKEN_FILTER - strip CSS/numeric false positives",
    "    if (typeof isValidFileMention === 'function' && Array.isArray(queryFileMentions)) {",
    "      queryFileMentions = queryFileMentions.filter(function(t) { return isValidFileMention(t); });",
    "    }",
    ""
)
[System.IO.File]::WriteAllLines($tempB, $linesB, [System.Text.Encoding]::UTF8)

$snippetA = [System.IO.File]::ReadAllText($tempA, [System.Text.Encoding]::UTF8)
$snippetB = [System.IO.File]::ReadAllText($tempB, [System.Text.Encoding]::UTF8)

# PATCH A: insert filter function after detectWebUIRequestFromDOM
$anchorA = "function detectWebUIRequestFromDOM(): boolean {"
$idxA = $content.IndexOf($anchorA)

if ($idxA -ge 0) {
    $depth = 0
    $funcEnd = -1
    for ($i = $idxA; $i -lt $content.Length; $i++) {
        $ch = $content[$i]
        if ($ch -eq '{') { $depth++ }
        elseif ($ch -eq '}') {
            $depth--
            if ($depth -eq 0) { $funcEnd = $i; break }
        }
    }
    if ($funcEnd -gt 0) {
        $content = $content.Substring(0, $funcEnd + 1) + $snippetA + $content.Substring($funcEnd + 1)
        Write-Host "Patch A OK - isValidFileMention inserted" -ForegroundColor Green
    } else {
        Write-Host "Patch A WARN - could not find function end" -ForegroundColor Yellow
    }
} else {
    Write-Host "Patch A WARN - anchor not found" -ForegroundColor Yellow
}

# PATCH B: apply filter before "Query mentions files:" log
$anchorB = "Query mentions files:"
$idxB = $content.IndexOf($anchorB)
if ($idxB -ge 0) {
    $lineStart = $content.LastIndexOf("`n", $idxB) + 1
    $content = $content.Substring(0, $lineStart) + $snippetB + $content.Substring($lineStart)
    Write-Host "Patch B OK - filter applied before mentions log" -ForegroundColor Green
} else {
    Write-Host "Patch B WARN - anchor not found" -ForegroundColor Yellow
}

# PATCH C: cap context size - find the summary line and add truncation after
$anchorC = "Summary:** Read"
$idxC = $content.IndexOf($anchorC)
if ($idxC -ge 0) {
    $lineEnd = $content.IndexOf("`n", $idxC)
    if ($lineEnd -gt 0) {
        $linesCap = @(
            "",
            "    // FIX3_TOKEN_FILTER - cap context to 10KB",
            "    if (typeof fileContext === 'string' && fileContext.length > 10000) {",
            "      fileContext = fileContext.substring(0, 10000) + '\n\n...[truncated for perf]';",
            "    }"
        )
        $capCode = [string]::Join("`n", $linesCap)
        $content = $content.Substring(0, $lineEnd) + $capCode + $content.Substring($lineEnd)
        Write-Host "Patch C OK - context capped at 10KB" -ForegroundColor Green
    }
} else {
    Write-Host "Patch C WARN - context cap anchor not found (non-critical)" -ForegroundColor Yellow
}

# PATCH D: cap slice counts for file reading
$sliceCaps = @(".slice(0, 7)", ".slice(0, 8)", ".slice(0, 9)", ".slice(0, 10)")
foreach ($sc in $sliceCaps) {
    if ($content.Contains($sc)) {
        $content = $content.Replace($sc, ".slice(0, 4)")
        Write-Host "Patch D OK - capped $sc to slice(0,4)" -ForegroundColor Green
    }
}

# Save
[System.IO.File]::WriteAllText($mainFile, $content, [System.Text.Encoding]::UTF8)
Write-Host "File saved" -ForegroundColor Green

# Cleanup temps
Remove-Item $tempA -Force -ErrorAction SilentlyContinue
Remove-Item $tempB -Force -ErrorAction SilentlyContinue

# Verify
$v = [System.IO.File]::ReadAllText($mainFile, [System.Text.Encoding]::UTF8)
Write-Host ""
Write-Host "--- Verification ---" -ForegroundColor Cyan

$pass = $true
if ($v.Contains("FIX3_TOKEN_FILTER")) { Write-Host "PASS: FIX3_TOKEN_FILTER" -ForegroundColor Green }
else { Write-Host "FAIL: FIX3_TOKEN_FILTER" -ForegroundColor Red; $pass = $false }

if ($v.Contains("isValidFileMention")) { Write-Host "PASS: isValidFileMention" -ForegroundColor Green }
else { Write-Host "FAIL: isValidFileMention" -ForegroundColor Red; $pass = $false }

Write-Host ""
if ($pass) {
    Write-Host "Fix 3 done. Rebuild: npm run tauri dev" -ForegroundColor Green
} else {
    Write-Host "Partial patch. Fix 1+2 already applied - main bottleneck resolved." -ForegroundColor Yellow
    Write-Host "Restore with: Copy-Item $backup $mainFile -Force" -ForegroundColor Gray
}
