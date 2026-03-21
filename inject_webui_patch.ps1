# ================================================================
# Operator X02 - Web UI Intelligence Patch (FIXED)
# ================================================================

$filePath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\autonomousCoding.ts"
$backupPath = "$filePath.webui_patch.bak"

Copy-Item $filePath $backupPath -Force
Write-Host "[OK] Backup: $backupPath" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$sizekb = [math]::Round($content.Length / 1024)
Write-Host "[OK] Loaded: $sizekb KB" -ForegroundColor Cyan

if ($content -match "detectWebUIRequest") {
    Write-Host "[SKIP] Already patched." -ForegroundColor Yellow
    exit 0
}

# ================================================================
# BLOCK A
# ================================================================
$blockA = @'

// ================================================================
// WEB UI GENERATION INTELLIGENCE - auto-injected by patch script
// ================================================================

function detectWebUIRequest(message: string): boolean {
  const patterns = [
    /\b(create|build|make|generate|design|write)\b.{0,50}\b(ui|page|website|landing|dashboard|component|layout|screen)\b/i,
    /\b(improve|enhance|redesign|update|restyle)\b.{0,40}\b(ui|design|look|style|layout|appearance)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner)\b/i,
    /\b(animat|transition|effect|motion)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant|impressive)/i,
  ];
  return patterns.some(p => p.test(message));
}

const WEB_UI_GENERATION_PROMPT = `
=== WEB UI GENERATION MODE ACTIVE ===

You are generating a COMPLETE, VISUALLY WORKING web UI. The user sees the live preview immediately.

RULE 1 - ALWAYS GENERATE ALL 6 FILES using ide_create_file:
  1. src/App.tsx
  2. src/components/Header.tsx
  3. src/components/Hero.tsx
  4. src/components/Features.tsx
  5. src/components/Footer.tsx
  6. src/App.css
  Also patch src/index.css: body { margin:0; background:#0a0a0a; color:#fff; font-family:Inter,system-ui,sans-serif; }

RULE 2 - EVERY COMPONENT IS SELF-VISIBLE:
- Every section must have its OWN explicit background-color or gradient
- NEVER use transparent background or rely on parent for color
- Dark palette: #0a0a0a | #111827 | #1a1a2e | #16213e
- Accents: #6366f1 | #8b5cf6 | #06b6d4 | #f59e0b
- Use inline styles for all critical layout and color properties

RULE 3 - App.tsx FIXED STRUCTURE:
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';
import './App.css';
const App: React.FC = () => (
  <div style={{ margin:0, padding:0, backgroundColor:'#0a0a0a', minHeight:'100vh' }}>
    <Header />
    <main><Hero /><Features /></main>
    <Footer />
  </div>
);
export default App;

RULE 4 - Header.tsx: position fixed, top 0, zIndex 1000, dark background with blur,
flex row with logo (gradient text) + nav links + CTA button

RULE 5 - Hero.tsx: minHeight 100vh, dark gradient background, flex center,
fade-in animation, large gradient headline, subtitle, 2 CTA buttons (solid + ghost),
decorative glow orbs in background

RULE 6 - Features.tsx: padding 100px 2rem, dark gradient bg, h2 heading centered,
CSS grid auto-fit minmax(300px,1fr), cards with hover lift + color border glow,
each card: emoji icon + title + description + accent bottom line

RULE 7 - Footer.tsx: background #050505, border-top, logo+tagline + 2 link columns + copyright bar

RULE 8 - ADAPT to user domain:
  portfolio = name/role/skills/projects
  SaaS = features/pricing/testimonials
  restaurant = warm amber/orange palette
  medical = blue/teal palette
  e-commerce = product cards
NEVER use generic placeholder text - always match the user intent.
=== END WEB UI GENERATION MODE ===
`;

'@

# ================================================================
# BLOCK B
# ================================================================
$blockB = @'

    // WEB UI MODE - injected by patch
    if (typeof detectWebUIRequest === 'function' && detectWebUIRequest(userMessage || message || '')) {
      ideScriptContext += WEB_UI_GENERATION_PROMPT;
      console.log('[WebUI Mode] UI generation rules injected');
    }
'@

# ================================================================
# STEP 1: Insert Block A
# ================================================================
Write-Host "[..] Inserting Block A..." -ForegroundColor Cyan

$anchorsA = @(
    "console.log.*AutoApply.*LOADED",
    "console.log.*autonomousCoding.*loaded",
    "console.log.*AutoCodeApply.*Loading",
    "function processMultiFile",
    "function autoApply",
    "function detectFile",
    "const autoApply",
    "export function",
    "export const"
)

$insertedA = $false
foreach ($anchor in $anchorsA) {
    $m = [regex]::Match($content, $anchor)
    if ($m.Success) {
        $idx = $m.Index
        $content = $content.Substring(0, $idx) + $blockA + "`n" + $content.Substring($idx)
        Write-Host "[OK] Block A inserted at index $idx (anchor: $anchor)" -ForegroundColor Green
        $insertedA = $true
        break
    }
}

if (-not $insertedA) {
    $content = $blockA + "`n" + $content
    Write-Host "[OK] Block A prepended at start (fallback)" -ForegroundColor Yellow
}

# ================================================================
# STEP 2: Insert Block B
# ================================================================
Write-Host "[..] Inserting Block B..." -ForegroundColor Cyan

$anchorsB = @(
    "IDE Script prompt injected",
    "IDE Script Instructions",
    "ideScriptContext \+= ",
    "ideScriptContext = ",
    "ideScriptPrompt \+= ",
    "You have access to these IDE",
    "Available IDE script commands",
    "ide_create_file.*ide_patch"
)

$insertedB = $false
foreach ($anchor in $anchorsB) {
    $m = [regex]::Match($content, $anchor)
    if ($m.Success) {
        $lineEnd = $content.IndexOf("`n", $m.Index)
        if ($lineEnd -gt 0) {
            $content = $content.Substring(0, $lineEnd) + $blockB + $content.Substring($lineEnd)
            Write-Host "[OK] Block B inserted after index $($m.Index) (anchor: $anchor)" -ForegroundColor Green
            $insertedB = $true
            break
        }
    }
}

if (-not $insertedB) {
    Write-Host "[WARN] Block B anchor not found." -ForegroundColor Yellow
    Write-Host "       Search 'ideScriptContext' in autonomousCoding.ts and add the if-block manually." -ForegroundColor Yellow
}

# ================================================================
# STEP 3: Save
# ================================================================
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "[OK] File saved." -ForegroundColor Green

# ================================================================
# STEP 4: Verify
# ================================================================
$verify = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "--- Verification ---" -ForegroundColor Cyan

$allPass = $true
$checks = @("detectWebUIRequest", "WEB_UI_GENERATION_PROMPT", "WebUI Mode", "WEB UI GENERATION MODE ACTIVE")
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
    Write-Host "[DONE] Patch complete! Rebuild: npm run tauri dev" -ForegroundColor Green
} else {
    Write-Host "[WARN] Some checks failed. To restore backup run:" -ForegroundColor Yellow
    Write-Host "  Copy-Item `"$backupPath`" `"$filePath`" -Force" -ForegroundColor Gray
}
