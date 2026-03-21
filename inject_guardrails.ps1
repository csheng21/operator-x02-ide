# ================================================================
# Permanent AI guardrails for OperatorX02
# Fixes all root causes seen today:
# 1. HTML entity corruption (&#039; in source files)
# 2. Wrong file targets (component code in main.tsx)
# 3. Wrong file locations (tsconfig.json inside src/)
# 4. External lib hallucination (framer-motion, lucide-react)
# ================================================================

$autoFile = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\autonomousCoding.ts"
$mainFile = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\main.ts"

# ── Read both files ──────────────────────────────────────────────────────
$autoContent = [System.IO.File]::ReadAllText($autoFile, [System.Text.Encoding]::UTF8)
$mainContent = [System.IO.File]::ReadAllText($mainFile, [System.Text.Encoding]::UTF8)

# ── Backup ───────────────────────────────────────────────────────────────
Copy-Item $autoFile "$autoFile.guardrails.bak" -Force
Copy-Item $mainFile "$mainFile.guardrails.bak" -Force
Write-Host "Backups done" -ForegroundColor Green

# ================================================================
# GUARDRAIL BLOCK - injected into WEB_UI_GENERATION_PROMPT
# ================================================================
$guardrails = @'

=== MANDATORY GUARDRAILS - VIOLATIONS BREAK THE BUILD ===

GUARDRAIL 1 - NO EXTERNAL LIBRARIES:
  NEVER use: framer-motion, gsap, react-spring, lodash, axios,
  styled-components, react-icons, lucide-react, recharts, d3,
  @heroicons, react-query, zustand, or ANY lib not in package.json.
  ONLY use: React built-ins, inline styles, CSS transitions, fetch(),
  Unicode emoji for icons, standard browser APIs.

GUARDRAIL 2 - NO UTILITY FILE CREATION:
  NEVER create: utils/animations.ts, utils/helpers.ts, lib/motion.ts
  or any helper file. All code goes directly in components.

GUARDRAIL 3 - CORRECT FILE TARGETS:
  main.tsx = Vite entry point ONLY. NEVER put components or JSX here.
  main.tsx must only contain: ReactDOM.createRoot(...).render(<App/>)
  App.tsx = root component that imports and renders other components.
  Components go in: src/components/ComponentName.tsx ONLY.

GUARDRAIL 4 - CORRECT FILE LOCATIONS:
  NEVER create tsconfig.json, vite.config.ts, or package.json inside src/.
  Config files belong at project ROOT only.
  NEVER create files outside src/ unless explicitly asked.

GUARDRAIL 5 - WRITE CLEAN CODE ONLY:
  NEVER write HTML entities in source files: use ' not &#039;
  NEVER include <span class="..."> highlight tags in code.
  NEVER include markdown backticks inside file content.
  Write raw TypeScript/TSX only - no formatting artifacts.

GUARDRAIL 6 - VERIFY BEFORE PATCHING:
  Before ide_patch: use ide_read_file to confirm current file content.
  Never patch a file you haven't read in this session.
  If file content is unknown, use ide_create_file with overwrite:true.

=== END GUARDRAILS ===
'@

# ── Inject into autonomousCoding.ts WEB_UI_GENERATION_PROMPT ─────────────
$promptAnchor = "=== WEB UI GENERATION MODE ACTIVE ==="
if ($autoContent.Contains($promptAnchor)) {
    if (-not $autoContent.Contains("GUARDRAIL 1")) {
        $autoContent = $autoContent.Replace($promptAnchor, $promptAnchor + $guardrails)
        Write-Host "Guardrails injected into WEB_UI_GENERATION_PROMPT" -ForegroundColor Green
    } else {
        Write-Host "Guardrails already in autonomousCoding.ts" -ForegroundColor Yellow
    }
} else {
    Write-Host "WEB UI anchor not found in autonomousCoding.ts" -ForegroundColor Red
}

# ── Inject into IDE Script system prompt in main.ts ──────────────────────
$ideScriptAnchor = "IDE Script prompt injected"
$idxIde = $mainContent.IndexOf($ideScriptAnchor)
if ($idxIde -gt 0 -and -not $mainContent.Contains("GUARDRAIL 1")) {
    # Find the getIdeScriptSystemPrompt function call and append guardrails to context
    $scriptPromptAnchor = "const scriptPrompt = getIdeScriptSystemPrompt"
    $idxScript = $mainContent.IndexOf($scriptPromptAnchor)
    if ($idxScript -gt 0) {
        # Find end of that line
        $lineEnd = $mainContent.IndexOf("`n", $idxScript)
        $guardrailAppend = "`n  // Guardrails appended to IDE Script prompt`n  const guardrailText = `"" + $guardrails.Replace('"', "'") + "`";`n  context += guardrailText;"
        $mainContent = $mainContent.Substring(0, $lineEnd) + $guardrailAppend + $mainContent.Substring($lineEnd)
        Write-Host "Guardrails appended to IDE Script context in main.ts" -ForegroundColor Green
    } else {
        Write-Host "IDE Script anchor not found in main.ts - skipping" -ForegroundColor Yellow
    }
} else {
    if ($mainContent.Contains("GUARDRAIL 1")) {
        Write-Host "Guardrails already in main.ts" -ForegroundColor Yellow
    }
}

# ── Save both files ──────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($autoFile, $autoContent, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($mainFile, $mainContent, [System.Text.Encoding]::UTF8)
Write-Host "Files saved" -ForegroundColor Green

# ── Verify ───────────────────────────────────────────────────────────────
$v1 = [System.IO.File]::ReadAllText($autoFile, [System.Text.Encoding]::UTF8)
$v2 = [System.IO.File]::ReadAllText($mainFile, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "--- Verification ---" -ForegroundColor Cyan

if ($v1.Contains("GUARDRAIL 1")) { Write-Host "PASS: autonomousCoding.ts has guardrails" -ForegroundColor Green }
else { Write-Host "FAIL: autonomousCoding.ts missing guardrails" -ForegroundColor Red }

if ($v2.Contains("GUARDRAIL 1") -or $v2.Contains("guardrailText")) { Write-Host "PASS: main.ts has guardrails" -ForegroundColor Green }
else { Write-Host "WARN: main.ts guardrails not injected (non-critical)" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Done. Rebuild: npm run tauri dev" -ForegroundColor Green
Write-Host ""
Write-Host "Root causes fixed:" -ForegroundColor Cyan
Write-Host "  1. HTML entities (&#039;) in source files -> GUARDRAIL 5" -ForegroundColor Gray
Write-Host "  2. Component code in main.tsx -> GUARDRAIL 3" -ForegroundColor Gray
Write-Host "  3. Config files in src/ -> GUARDRAIL 4" -ForegroundColor Gray
Write-Host "  4. framer-motion / external libs -> GUARDRAIL 1" -ForegroundColor Gray
Write-Host "  5. Patching unread files -> GUARDRAIL 6" -ForegroundColor Gray
