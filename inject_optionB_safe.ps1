# Option B - writes a separate TS module then imports it
# Avoids all PowerShell string escaping issues

$srcPath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\editor"

# ── Step 1: Write the new context menu module as a separate TS file ──────
$moduleContent = @"
// contextMenuOptionB.ts - Grouped Professional Menu with Animations

export function injectOptionBStyles(): void {
  if (document.getElementById('x02-ctx-optionb')) return;
  const s = document.createElement('style');
  s.id = 'x02-ctx-optionb';
  s.textContent = [
    '.monaco-menu .monaco-action-bar.vertical {',
    '  animation: ctxOpen 0.15s cubic-bezier(0.2,0,0.13,1.5) forwards;',
    '  transform-origin: top left; }',
    '@keyframes ctxOpen {',
    '  from { opacity:0; transform:scale(0.94) translateY(-6px); }',
    '  to   { opacity:1; transform:scale(1)    translateY(0); } }',
    '.monaco-menu { box-shadow:0 8px 32px rgba(0,0,0,0.5),0 2px 8px rgba(245,200,66,0.08) !important;',
    '  border:1px solid rgba(245,200,66,0.18) !important;',
    '  border-radius:8px !important; overflow:hidden !important; }',
    '.monaco-menu .action-item a {',
    '  transition: background 0.15s ease, color 0.15s ease !important;',
    '  border-radius:4px !important; position:relative; overflow:hidden; }',
    '.monaco-menu .action-item a::before {',
    '  content:""; position:absolute; left:-100%; top:0; bottom:0; width:100%;',
    '  background:linear-gradient(90deg,rgba(245,200,66,0.12) 0%,transparent 100%);',
    '  transition:left 0.18s ease; }',
    '.monaco-menu .action-item a:hover::before { left:0; }',
    '.monaco-menu .action-item a:hover {',
    '  background:rgba(245,200,66,0.08) !important; color:#f5c842 !important; }',
    '.monaco-menu .action-item:nth-child(1){animation-delay:0ms}',
    '.monaco-menu .action-item:nth-child(2){animation-delay:20ms}',
    '.monaco-menu .action-item:nth-child(3){animation-delay:40ms}',
    '.monaco-menu .action-item:nth-child(4){animation-delay:60ms}',
    '.monaco-menu .action-item:nth-child(5){animation-delay:80ms}',
    '.monaco-menu .action-item:nth-child(6){animation-delay:100ms}',
    '.monaco-menu .action-item:nth-child(7){animation-delay:120ms}',
    '.monaco-menu .action-item:nth-child(8){animation-delay:140ms}',
  ].join(' ');
  document.head.appendChild(s);
}

export function registerOptionBMenu(editor: any, showNotification: Function, explainError: Function, showErrorExplanationPanel: Function): void {
  injectOptionBStyles();

  const run = (ed: any, prompt: string) => {
    const sel = ed.getSelection();
    const code = ed.getModel()?.getValueInRange(sel) || ed.getModel()?.getLineContent(sel.startLineNumber) || '';
    showNotification('AI processing...', 'info');
    const fn = (window as any).aiAutoSend?.direct || (window as any).sendPrompt;
    if (fn) fn(prompt + (code ? ': ' + code.substring(0, 200) : ''));
  };

  // ── Section: AI ACTIONS ───────────────────────────────────────────────
  editor.addAction({
    id: 'optb-header-ai', label: '\u2500\u2500 \u26A1 AI ACTIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    contextMenuGroupId: '1_ai', contextMenuOrder: 0.1, run: () => {}
  });
  editor.addAction({
    id: 'optb-explain', label: '\uD83D\uDD0D  Explain This Code',
    contextMenuGroupId: '1_ai', contextMenuOrder: 1,
    run: (ed: any) => run(ed, 'Explain this code')
  });
  editor.addAction({
    id: 'optb-tests', label: '\uD83E\uDDEA  Generate Tests',
    contextMenuGroupId: '1_ai', contextMenuOrder: 2,
    keybindings: [],
    run: (ed: any) => run(ed, 'Generate unit tests for')
  });
  editor.addAction({
    id: 'optb-docs', label: '\uD83D\uDCDD  Generate Docs',
    contextMenuGroupId: '1_ai', contextMenuOrder: 3,
    keybindings: [],
    run: (ed: any) => run(ed, 'Generate documentation for')
  });
  editor.addAction({
    id: 'optb-refactor', label: '\uD83D\uDD04  Refactor',
    contextMenuGroupId: '1_ai', contextMenuOrder: 4,
    keybindings: [],
    run: (ed: any) => run(ed, 'Refactor and improve')
  });
  editor.addAction({
    id: 'optb-comments', label: '\uD83D\uDCAC  Add Comments',
    contextMenuGroupId: '1_ai', contextMenuOrder: 5,
    keybindings: [],
    run: (ed: any) => run(ed, 'Add clear comments to')
  });
  editor.addAction({
    id: 'optb-iso', label: '\uD83D\uDEE1\uFE0F  Add ISO 26262',
    contextMenuGroupId: '1_ai', contextMenuOrder: 6,
    keybindings: [],
    run: (ed: any) => run(ed, 'Add ISO 26262 ASIL compliance annotations to')
  });

  // ── Section: EDITOR ───────────────────────────────────────────────────
  editor.addAction({
    id: 'optb-header-editor', label: '\u2500\u2500 \uD83D\uDCCB EDITOR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
    contextMenuGroupId: '2_editor_ai', contextMenuOrder: 0.1, run: () => {}
  });
  editor.addAction({
    id: 'optb-quickfix', label: '\uD83D\uDD27  Quick Fix Error',
    contextMenuGroupId: '2_editor_ai', contextMenuOrder: 1,
    run: async (ed: any) => {
      const marker = (window as any).__lastErrorMarker;
      if (!marker) { showNotification('No error at cursor', 'warning'); return; }
      const code = ed.getModel()?.getLineContent(marker.startLineNumber) || '';
      run(ed, 'Fix this error: ' + marker.message);
    }
  });
  editor.addAction({
    id: 'optb-explain-error', label: '\u26A0\uFE0F  Explain Error',
    contextMenuGroupId: '2_editor_ai', contextMenuOrder: 2,
    run: async (ed: any) => {
      const marker = (window as any).__lastErrorMarker;
      if (!marker) { showNotification('No error selected', 'warning'); return; }
      const code = ed.getModel()?.getLineContent(marker.startLineNumber) || '';
      showNotification('Analyzing error...', 'info');
      const explanation = await explainError(marker.message, code, ed.getModel()?.getLanguageId() || '');
      showErrorExplanationPanel(explanation);
    }
  });

  console.log('Option B context menu registered');
}
"@

$modulePath = "$srcPath\contextMenuOptionB.ts"
[System.IO.File]::WriteAllText($modulePath, $moduleContent, [System.Text.Encoding]::UTF8)
Write-Host "Module written: $modulePath" -ForegroundColor Green

# ── Step 2: Import and call from aiEditorFeatures.ts ────────────────────
$featureFile = "$srcPath\aiEditorFeatures.ts"
$content = [System.IO.File]::ReadAllText($featureFile, [System.Text.Encoding]::UTF8)
Copy-Item $featureFile "$featureFile.optionb2.bak" -Force

if ($content.Contains("contextMenuOptionB")) {
    Write-Host "Already imported - skipping" -ForegroundColor Yellow
} else {
    # Add import at top of file
    $firstImport = $content.IndexOf("import ")
    if ($firstImport -ge 0) {
        $importLine = "import { registerOptionBMenu } from './contextMenuOptionB';" + "`n"
        $content = $content.Substring(0, $firstImport) + $importLine + $content.Substring($firstImport)
        Write-Host "Import added" -ForegroundColor Green
    }

    # Find the anchor to call registerOptionBMenu after existing explain-error action
    $anchor = "console.log('✅ AI Error Explainer initialized');"
    $idx = $content.IndexOf($anchor)
    if ($idx -lt 0) {
        $anchor = "console.log('✅ AI Code Actions initialized');"
        $idx = $content.IndexOf($anchor)
    }

    if ($idx -gt 0) {
        $call = "`n  // Register Option B grouped menu`n  registerOptionBMenu(editor, showNotification, explainError, showErrorExplanationPanel);`n"
        $lineEnd = $content.IndexOf("`n", $idx)
        $content = $content.Substring(0, $lineEnd) + $call + $content.Substring($lineEnd)
        Write-Host "Call injected after anchor" -ForegroundColor Green
    } else {
        Write-Host "Anchor not found - adding at end of initializeAIErrorExplainer function" -ForegroundColor Yellow
        $funcAnchor = "export function initializeAIErrorExplainer"
        $fi = $content.IndexOf($funcAnchor)
        if ($fi -gt 0) {
            $depth = 0; $funcEnd = -1
            for ($i = $fi; $i -lt $content.Length; $i++) {
                if ($content[$i] -eq '{') { $depth++ }
                elseif ($content[$i] -eq '}') { $depth--; if ($depth -eq 0) { $funcEnd = $i; break } }
            }
            if ($funcEnd -gt 0) {
                $call = "`n  registerOptionBMenu(editor, showNotification, explainError, showErrorExplanationPanel);`n"
                $content = $content.Substring(0, $funcEnd) + $call + $content.Substring($funcEnd)
                Write-Host "Call injected at function end" -ForegroundColor Green
            }
        }
    }

    [System.IO.File]::WriteAllText($featureFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "aiEditorFeatures.ts updated" -ForegroundColor Green
}

# ── Also patch the ide/aiAssistant copy ─────────────────────────────────
$f2 = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\aiAssistant\aiEditorFeatures.ts"
if (Test-Path $f2) {
    $c2 = [System.IO.File]::ReadAllText($f2, [System.Text.Encoding]::UTF8)
    Copy-Item $f2 "$f2.optionb2.bak" -Force
    if (-not $c2.Contains("contextMenuOptionB")) {
        # Copy module there too
        $modulePath2 = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\aiAssistant\contextMenuOptionB.ts"
        [System.IO.File]::WriteAllText($modulePath2, $moduleContent, [System.Text.Encoding]::UTF8)
        $importLine2 = "import { registerOptionBMenu } from './contextMenuOptionB';" + "`n"
        $fi2 = $c2.IndexOf("import ")
        if ($fi2 -ge 0) { $c2 = $c2.Substring(0, $fi2) + $importLine2 + $c2.Substring($fi2) }
        $anchor2 = "console.log('✅ AI Error Explainer initialized');"
        $idx2 = $c2.IndexOf($anchor2)
        if ($idx2 -gt 0) {
            $lineEnd2 = $c2.IndexOf("`n", $idx2)
            $call2 = "`n  registerOptionBMenu(editor, showNotification, explainError, showErrorExplanationPanel);`n"
            $c2 = $c2.Substring(0, $lineEnd2) + $call2 + $c2.Substring($lineEnd2)
        }
        [System.IO.File]::WriteAllText($f2, $c2, [System.Text.Encoding]::UTF8)
        Write-Host "ide/aiAssistant copy also patched" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done. Rebuild: npm run tauri dev" -ForegroundColor Cyan
