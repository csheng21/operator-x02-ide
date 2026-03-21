# Option B - Grouped Professional context menu with animations
# Patches both aiEditorFeatures.ts files

$targets = @(
    "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\editor\aiEditorFeatures.ts",
    "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\aiAssistant\aiEditorFeatures.ts"
)

# ── New grouped CSS + menu injection code ────────────────────────────────
$newMenuCode = @'

  // ── Option B: Grouped Professional Context Menu with Animations ──────
  // Inject CSS for animated grouped menu
  if (!document.getElementById('x02-ctx-menu-style')) {
    const style = document.createElement('style');
    style.id = 'x02-ctx-menu-style';
    style.textContent = `
      /* Animate Monaco context menu open */
      .monaco-menu .monaco-action-bar.vertical {
        animation: ctxMenuOpen 0.15s cubic-bezier(0.2, 0, 0.13, 1.5) forwards;
        transform-origin: top left;
      }
      @keyframes ctxMenuOpen {
        from { opacity: 0; transform: scale(0.94) translateY(-6px); }
        to   { opacity: 1; transform: scale(1)    translateY(0);    }
      }

      /* Section header items */
      .monaco-menu .action-item.ai-section-header .action-label {
        color: #f5c842 !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 1.2px !important;
        text-transform: uppercase !important;
        opacity: 0.9 !important;
        padding: 8px 12px 4px !important;
        cursor: default !important;
        pointer-events: none !important;
      }

      /* AI action items hover - slide glow from left */
      .monaco-menu .action-item.ai-action a {
        position: relative;
        overflow: hidden;
        transition: color 0.15s ease, background 0.15s ease !important;
        border-radius: 4px !important;
      }
      .monaco-menu .action-item.ai-action a::before {
        content: '';
        position: absolute;
        left: -100%;
        top: 0; bottom: 0;
        width: 100%;
        background: linear-gradient(90deg, rgba(245,200,66,0.12) 0%, transparent 100%);
        transition: left 0.18s ease;
      }
      .monaco-menu .action-item.ai-action a:hover::before {
        left: 0;
      }
      .monaco-menu .action-item.ai-action a:hover {
        background: rgba(245,200,66,0.08) !important;
        color: #f5c842 !important;
      }

      /* Icon bounce on hover */
      .monaco-menu .action-item.ai-action a:hover .codicon,
      .monaco-menu .action-item.ai-action a:hover .action-label {
        animation: iconBounce 0.3s ease;
      }
      @keyframes iconBounce {
        0%   { transform: scale(1);    }
        40%  { transform: scale(1.15); }
        70%  { transform: scale(0.95); }
        100% { transform: scale(1);    }
      }

      /* Separator slide in */
      .monaco-menu .action-item.separator {
        animation: separatorSlide 0.2s ease forwards;
      }
      @keyframes separatorSlide {
        from { width: 0; opacity: 0; }
        to   { width: 100%; opacity: 1; }
      }

      /* Stagger AI items */
      .monaco-menu .action-item:nth-child(1) { animation-delay: 0ms;  }
      .monaco-menu .action-item:nth-child(2) { animation-delay: 20ms; }
      .monaco-menu .action-item:nth-child(3) { animation-delay: 40ms; }
      .monaco-menu .action-item:nth-child(4) { animation-delay: 60ms; }
      .monaco-menu .action-item:nth-child(5) { animation-delay: 80ms; }
      .monaco-menu .action-item:nth-child(6) { animation-delay: 100ms;}
      .monaco-menu .action-item:nth-child(7) { animation-delay: 120ms;}

      /* Drop shadow on the menu */
      .monaco-menu {
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(245,200,66,0.08) !important;
        border: 1px solid rgba(245,200,66,0.15) !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Section header helper ─────────────────────────────────────────────
  const addSectionHeader = (ed: any, id: string, label: string, order: number) => {
    ed.addAction({
      id,
      label,
      contextMenuGroupId: '1_ai',
      contextMenuOrder: order,
      run: () => {},
      // Mark as header for CSS targeting
      keybindings: []
    });
  };

  // ── AI ACTIONS GROUP ─────────────────────────────────────────────────
  editor.addAction({
    id: 'ai-group-header',
    label: '── ⚡ AI ACTIONS ──────────────',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 0.1,
    run: () => {}
  });

  editor.addAction({
    id: 'ai-explain-code-b',
    label: '🔍  Explain This Code',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 1,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const text = ed.getModel()?.getValueInRange(sel) || '';
      const line = ed.getModel()?.getLineContent(sel.startLineNumber) || '';
      const code = text || line;
      showNotification('🔍 Analyzing...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('explain', 'selection', code);
      }
    }
  });

  editor.addAction({
    id: 'ai-generate-tests-b',
    label: '🧪  Generate Tests',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 2,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const code = ed.getModel()?.getValueInRange(sel) || '';
      showNotification('🧪 Generating tests...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('test', 'selection', code);
      }
    }
  });

  editor.addAction({
    id: 'ai-generate-docs-b',
    label: '📝  Generate Docs',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 3,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const code = ed.getModel()?.getValueInRange(sel) || '';
      showNotification('📝 Generating documentation...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('document', 'selection', code);
      }
    }
  });

  editor.addAction({
    id: 'ai-refactor-b',
    label: '🔄  Refactor',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 4,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const code = ed.getModel()?.getValueInRange(sel) || '';
      showNotification('🔄 Refactoring...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('refactor', 'selection', code);
      }
    }
  });

  editor.addAction({
    id: 'ai-add-comments-b',
    label: '💬  Add Comments',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 5,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const code = ed.getModel()?.getValueInRange(sel) || '';
      showNotification('💬 Adding comments...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('comment', 'selection', code);
      }
    }
  });

  editor.addAction({
    id: 'ai-iso-compliance-b',
    label: '🛡️  Add ISO 26262',
    contextMenuGroupId: '1_ai',
    contextMenuOrder: 6,
    run: async (ed: any) => {
      const sel = ed.getSelection();
      const code = ed.getModel()?.getValueInRange(sel) || '';
      showNotification('🛡️ Adding ISO 26262 compliance...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('iso26262', 'selection', code);
      }
    }
  });

  // ── EDITOR GROUP ─────────────────────────────────────────────────────
  editor.addAction({
    id: 'editor-group-header',
    label: '── 📋 EDITOR ──────────────────',
    contextMenuGroupId: '2_editor',
    contextMenuOrder: 0.1,
    run: () => {}
  });

  editor.addAction({
    id: 'editor-quick-fix-b',
    label: '🔧  Quick Fix',
    contextMenuGroupId: '2_editor',
    contextMenuOrder: 1,
    keybindings: [],
    run: async (ed: any) => {
      const marker = (window as any).__lastErrorMarker;
      if (!marker) { showNotification('No error at cursor', 'warning'); return; }
      const code = ed.getModel()?.getLineContent(marker.startLineNumber) || '';
      showNotification('🔧 Fixing error...', 'info');
      if ((window as any).aiAutoSend?.direct) {
        (window as any).aiAutoSend.direct('fix', 'error', marker.message + '\n' + code);
      }
    }
  });

  editor.addAction({
    id: 'editor-error-explain-b',
    label: '⚠️  Explain Error',
    contextMenuGroupId: '2_editor',
    contextMenuOrder: 2,
    run: async (ed: any) => {
      const marker = (window as any).__lastErrorMarker;
      if (!marker) { showNotification('No error selected', 'warning'); return; }
      const code = ed.getModel()?.getLineContent(marker.startLineNumber) || '';
      showNotification('⚠️ Analyzing error...', 'info');
      const explanation = await explainError(marker.message, code, ed.getModel()?.getLanguageId() || '');
      showErrorExplanationPanel(explanation);
    }
  });

  console.log('✅ Option B context menu initialized');
  // ── END Option B ──────────────────────────────────────────────────────
'@

# ── Inject into both files ───────────────────────────────────────────────
foreach ($target in $targets) {
    if (-not (Test-Path $target)) {
        Write-Host "Not found: $target" -ForegroundColor Red
        continue
    }

    $content = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
    Copy-Item $target "$target.optionb.bak" -Force

    if ($content.Contains("Option B: Grouped Professional")) {
        Write-Host "Already patched: $target" -ForegroundColor Yellow
        continue
    }

    # Find the closing of the first editor.addAction block (ai-explain-error)
    $anchor = "console.log('✅ AI Error Explainer initialized');"
    $idx = $content.IndexOf($anchor)

    if ($idx -gt 0) {
        $content = $content.Substring(0, $idx) + $newMenuCode + "`n  " + $content.Substring($idx)
        [System.IO.File]::WriteAllText($target, $content, [System.Text.Encoding]::UTF8)
        Write-Host "PASS: Patched $([System.IO.Path]::GetFileName($target))" -ForegroundColor Green
    } else {
        # Fallback: inject before export function initializeAICodeActions
        $anchor2 = "export function initializeAICodeActions"
        $idx2 = $content.IndexOf($anchor2)
        if ($idx2 -gt 0) {
            $content = $content.Substring(0, $idx2) + $newMenuCode + "`n`n" + $content.Substring($idx2)
            [System.IO.File]::WriteAllText($target, $content, [System.Text.Encoding]::UTF8)
            Write-Host "PASS (fallback): Patched $([System.IO.Path]::GetFileName($target))" -ForegroundColor Green
        } else {
            Write-Host "FAIL: anchor not found in $([System.IO.Path]::GetFileName($target))" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Done. Rebuild: npm run tauri dev" -ForegroundColor Cyan
Write-Host "Right-click in Monaco editor to see Option B menu." -ForegroundColor Cyan
