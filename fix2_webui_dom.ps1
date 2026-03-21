# ================================================================
# FIX 2: WebUI injection reads last user message from DOM
# not the already-cleared input field
# Target: src/main.ts — replace _rawMsg with DOM message read
# ================================================================

$file = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"
$backup = "$file.fix2.bak"
Copy-Item $file $backup -Force
Write-Host "[OK] Backup: $backup" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
Write-Host "[OK] Loaded: $([math]::Round($content.Length/1024))KB" -ForegroundColor Cyan

if ($content -match "FIX2_DOM_MSG") {
    Write-Host "[SKIP] Already patched." -ForegroundColor Yellow
    exit 0
}

# ================================================================
# Replace the broken _rawMsg approach with DOM-based last message read
# Also add the message parameter that main.ts has in scope
# ================================================================
$oldCode = "    // WEB UI MODE - injected by patch
    if (typeof (window as any).detectWebUIRequest === 'function') {
      const _rawMsg = (document.querySelector('#ai-assistant-input, #user-input, textarea[id*=""input""]') as HTMLTextAreaElement)?.value || '';
      if ((window as any).detectWebUIRequest(_rawMsg) || detectWebUIRequestFromDOM()) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected');
      }
    }"

$newCode = "    // WEB UI MODE - injected by patch (FIX2_DOM_MSG)
    try {
      const _domMsg = (
        // Try the message variable in scope first (most reliable)
        (typeof msg !== 'undefined' ? msg : '') ||
        (typeof message !== 'undefined' ? message : '') ||
        (typeof userMessage !== 'undefined' ? userMessage : '') ||
        // Fallback: read last user message from chat DOM
        document.querySelector('.user-message:last-child')?.textContent ||
        document.querySelector('[data-role=""user""]:last-child')?.textContent ||
        document.querySelector('.human-message:last-child')?.textContent ||
        document.querySelector('[class*=""user-msg""]:last-child')?.textContent ||
        // Last resort: input field (may be cleared already)
        (document.querySelector('#ai-assistant-input') as HTMLTextAreaElement)?.value ||
        ''
      ).trim();
      const _webUiFn = (window as any).detectWebUIRequest;
      if (typeof _webUiFn === 'function' && _domMsg && _webUiFn(_domMsg)) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected for: ' + _domMsg.substring(0, 50));
      } else if (detectWebUIRequestFromDOM()) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected via DOM detection');
      }
    } catch (_webUiErr) { /* silent */ }"

# Try exact replace first
if ($content.Contains($oldCode)) {
    $content = $content.Replace($oldCode, $newCode)
    Write-Host "[OK] Exact replace succeeded." -ForegroundColor Green
} else {
    Write-Host "[..] Exact match failed, trying partial anchor..." -ForegroundColor Yellow

    # Find the simpler anchor
    $anchor = "const _rawMsg = (document.querySelector"
    $m = [regex]::Match($content, [regex]::Escape($anchor))

    if ($m.Success) {
        # Find the enclosing if block: go back to find "// WEB UI MODE"
        $blockStart = $content.LastIndexOf("// WEB UI MODE", $m.Index)
        if ($blockStart -gt 0) {
            # Find the closing brace of this if block
            $searchFrom = $m.Index
            $depth = 0
            $blockEnd = -1
            for ($i = $searchFrom; $i -lt $content.Length; $i++) {
                if ($content[$i] -eq '{') { $depth++ }
                elseif ($content[$i] -eq '}') {
                    $depth--
                    if ($depth -lt 0) { $blockEnd = $i; break }
                }
            }

            if ($blockEnd -gt 0) {
                $content = $content.Substring(0, $blockStart) + $newCode + $content.Substring($blockEnd + 1)
                Write-Host "[OK] Block replaced via partial anchor." -ForegroundColor Green
            } else {
                Write-Host "[FAIL] Could not find block end." -ForegroundColor Red
                exit 1
            }
        }
    } else {
        # Last resort: just replace the _rawMsg line specifically
        $lineAnchor = "const _rawMsg = "
        $lineIdx = $content.IndexOf($lineAnchor)
        if ($lineIdx -gt 0) {
            $lineEnd = $content.IndexOf("`n", $lineIdx)
            $nextLineEnd = $content.IndexOf("`n", $lineEnd + 1)
            # Replace just the _rawMsg line with better detection
            $betterLine = "      const _rawMsg = document.querySelector('.user-message:last-child')?.textContent?.trim() || document.querySelector('[data-role=""user""]:last-child')?.textContent?.trim() || ''; // FIX2_DOM_MSG"
            $content = $content.Substring(0, $lineIdx) + $betterLine + $content.Substring($lineEnd)
            Write-Host "[OK] _rawMsg line replaced with DOM reader." -ForegroundColor Green
        } else {
            Write-Host "[FAIL] No anchor found. Check main.ts manually." -ForegroundColor Red
            exit 1
        }
    }
}

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "[OK] File saved." -ForegroundColor Green

$v = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
if ($v.Contains("FIX2_DOM_MSG")) {
    Write-Host "[PASS] FIX2_DOM_MSG present." -ForegroundColor Green
    Write-Host "[DONE] Fix 2 complete. WebUI detection now reads last DOM message." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Verify failed." -ForegroundColor Red
}
