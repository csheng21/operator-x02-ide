# ================================================================
# Operator X02 - Block B injection into main.ts
# Target: after line 9127 (IDE Script prompt injected log)
# Variable: context (the string built up and sent to Claude)
# ================================================================

$mainPath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"
$backupPath = "$mainPath.webui_patch.bak"

# Backup
Copy-Item $mainPath $backupPath -Force
Write-Host "[OK] Backup: $backupPath" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($mainPath, [System.Text.Encoding]::UTF8)

# Guard
if ($content -match "WebUI Mode") {
    Write-Host "[SKIP] Already patched." -ForegroundColor Yellow
    exit 0
}

# ================================================================
# The exact anchor line from the diagnostic output
# ================================================================
$anchor = "console.log('🧠 [Context] IDE Script prompt injected (mode: ' + localStorage.getItem('ideScriptMode') + ')')"

# Block to insert AFTER the anchor line
$blockB = @'

    // WEB UI MODE - injected by patch
    if (typeof (window as any).detectWebUIRequest === 'function') {
      const _rawMsg = (document.querySelector('#ai-assistant-input, #user-input, textarea[id*="input"]') as HTMLTextAreaElement)?.value || '';
      if ((window as any).detectWebUIRequest(_rawMsg) || detectWebUIRequestFromDOM()) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected');
      }
    }
'@

# ================================================================
# Try exact anchor first
# ================================================================
Write-Host "[..] Trying exact anchor..." -ForegroundColor Cyan
$idx = $content.IndexOf($anchor)

if ($idx -ge 0) {
    $lineEnd = $content.IndexOf("`n", $idx)
    if ($lineEnd -lt 0) { $lineEnd = $content.Length }
    $content = $content.Substring(0, $lineEnd) + $blockB + $content.Substring($lineEnd)
    Write-Host "[OK] Exact anchor found at index $idx" -ForegroundColor Green
} else {
    Write-Host "[..] Exact not found, trying partial anchor..." -ForegroundColor Yellow
    
    # Try partial - just the unique part without emoji
    $partials = @(
        "IDE Script prompt injected",
        "Context] IDE Script prompt",
        "getIdeScriptSystemPrompt"
    )
    
    $found = $false
    foreach ($p in $partials) {
        $m = [regex]::Match($content, [regex]::Escape($p))
        if ($m.Success) {
            $lineEnd = $content.IndexOf("`n", $m.Index)
            if ($lineEnd -lt 0) { $lineEnd = $content.Length }
            $content = $content.Substring(0, $lineEnd) + $blockB + $content.Substring($lineEnd)
            Write-Host "[OK] Partial anchor '$p' found at index $($m.Index)" -ForegroundColor Green
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "[FAIL] No anchor found in main.ts" -ForegroundColor Red
        exit 1
    }
}

# ================================================================
# Also expose detectWebUIRequest and WEB_UI_GENERATION_PROMPT
# on window so main.ts can access them from autonomousCoding.ts
# Find a good spot - after autonomousCoding init
# ================================================================
$exposeCode = @'

// Expose WebUI detection globals from autonomousCoding
setTimeout(() => {
  if (typeof detectWebUIRequest === 'function') {
    (window as any).detectWebUIRequest = detectWebUIRequest;
    (window as any).WEB_UI_GENERATION_PROMPT = WEB_UI_GENERATION_PROMPT;
    console.log('[WebUI Mode] globals exposed on window');
  }
}, 2000);

function detectWebUIRequestFromDOM(): boolean {
  const input = document.querySelector('#ai-assistant-input, #user-input, textarea[id*="input"]') as HTMLTextAreaElement;
  const msg = input?.value || '';
  const patterns = [
    /\b(create|build|make|generate|design)\b.{0,50}\b(ui|page|website|landing|dashboard|component|layout)\b/i,
    /\b(improve|enhance|redesign|update|restyle)\b.{0,40}\b(ui|design|look|style|layout)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant|impressive)/i,
  ];
  return patterns.some(p => p.test(msg));
}
'@

# Insert expose code after "initIdeScriptBridge();" line
$exposeAnchor = "initIdeScriptBridge();"
$exposeIdx = $content.IndexOf($exposeAnchor)
if ($exposeIdx -ge 0) {
    $lineEnd2 = $content.IndexOf("`n", $exposeIdx)
    $content = $content.Substring(0, $lineEnd2) + $exposeCode + $content.Substring($lineEnd2)
    Write-Host "[OK] Window expose code inserted after initIdeScriptBridge()" -ForegroundColor Green
} else {
    Write-Host "[WARN] Could not find initIdeScriptBridge() - expose code skipped" -ForegroundColor Yellow
}

# ================================================================
# Save
# ================================================================
[System.IO.File]::WriteAllText($mainPath, $content, [System.Text.Encoding]::UTF8)
Write-Host "[OK] main.ts saved." -ForegroundColor Green

# ================================================================
# Verify
# ================================================================
$verify = [System.IO.File]::ReadAllText($mainPath, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "--- Verification ---" -ForegroundColor Cyan
$checks = @("WebUI Mode", "detectWebUIRequestFromDOM", "WEB_UI_GENERATION_PROMPT")
$allPass = $true
foreach ($c in $checks) {
    if ($verify.Contains($c)) {
        Write-Host "[PASS] $c" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $c" -ForegroundColor Red
        $allPass = $false
    }
}

Write-Host ""
if ($allPass) {
    Write-Host "[DONE] main.ts patched! Rebuild: npm run tauri dev" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test: type 'create a landing page for a coffee shop' in the IDE chat" -ForegroundColor Cyan
} else {
    Write-Host "[WARN] Restore with:" -ForegroundColor Yellow
    Write-Host "  Copy-Item `"$backupPath`" `"$mainPath`" -Force" -ForegroundColor Gray
}
