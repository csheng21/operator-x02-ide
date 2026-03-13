// cemReloadFix.ts - Reconstruct Compact Edit Messages After IDE Reset
// ====================================================================
// 
// PROBLEM: aiDirectEditor saves compact notification bars as markdown text,
// but after IDE reset, whichever renderer wins the race (there are 5 competing
// paths) just renders the raw markdown as regular chat bubbles.
//
// SOLUTION: Post-render interceptor that scans for ai-edit markdown patterns
// and replaces them with compact CEM HTML. Works regardless of which 
// renderer actually runs.
//
// USAGE: Just import this file in main.ts or conversationUI.ts:
//   import './cemReloadFix';
// ====================================================================

(function initCEMReloadFix() {
  console.log('🔧 [CEMFix] Loading...');

  // ── Pattern matchers for ai-edit markdown content ──────────────────
  const PATTERNS = {
    editRequest: /🤖\s*\*{0,2}AI Edit Request\*{0,2}\s*\(Rev\.\s*(\d+)\)[\s\S]*?\*{0,2}Instruction:\*{0,2}\s*(.+?)(?:\n|$)/,
    accepted:    /✅\s*\*{0,2}Changes Applied\*{0,2}\s*\(Rev\.\s*(\d+)\)[\s\S]*?lines?\s*([\d\-]+)[\s\S]*?\*{0,2}Instruction:\*{0,2}\s*(.+?)(?:\n|$)/,
    rejected:    /❌\s*\*{0,2}Changes Rejected\*{0,2}\s*\(Rev\.\s*(\d+)\)[\s\S]*?lines?\s*([\d\-]+)[\s\S]*?\*{0,2}Instruction:\*{0,2}\s*(.+?)(?:\n|$)/,
    error:       /⚠️\s*\*{0,2}Edit Failed\*{0,2}[\s\S]*?\*{0,2}Instruction:\*{0,2}\s*(.+?)(?:\n|$)/,
    cancelled:   /🚫\s*\*{0,2}Edit Cancelled\*{0,2}\s*\(Rev\.\s*(\d+)\)/,
  };

  // ── Escape HTML helper ─────────────────────────────────────────────
  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shorten(s: string, max = 50): string {
    return s.length > max ? s.substring(0, max - 3) + '…' : s;
  }

  // ── Build CEM HTML from matched pattern ────────────────────────────
  function buildCEM(
    type: 'sent' | 'applied' | 'rejected' | 'error' | 'cancelled',
    rev: string,
    instruction: string,
    lines?: string,
    timeStr?: string
  ): string {
    const iconMap = {
      sent:      '<span class="cem-icon cem-icon-ok">✓</span>',
      applied:   '<span class="cem-icon cem-icon-ok">✓</span>',
      rejected:  '<span class="cem-icon cem-icon-err">✕</span>',
      error:     '<span class="cem-icon cem-icon-err">⚠</span>',
      cancelled: '<span class="cem-icon cem-icon-err">⏹</span>',
    };
    const labelMap = {
      sent: 'Sent', applied: 'Applied', rejected: 'Rejected',
      error: 'Failed', cancelled: 'Cancelled',
    };
    const stateClass = (type === 'sent' || type === 'applied') ? 'success' : 'rejected';
    const short = shorten(instruction);

    return `
      <div class="cem-row">
        ${iconMap[type]}
        <span class="cem-label">${labelMap[type]}</span>
        <span class="cem-rev">R${rev}</span>
        ${lines ? `<span class="cem-lines">L${lines}</span>` : ''}
        <span class="cem-detail" title="${esc(instruction)}">${esc(short)}</span>
        ${timeStr ? `<span class="cem-time">${timeStr}</span>` : ''}
      </div>
    `;
  }

  // ── Try to match a DOM element's text content against edit patterns ─
  function tryConvertToCEM(el: HTMLElement): boolean {
    // Get the raw text content (strips HTML tags)
    const text = el.textContent || '';
    // Also check innerHTML for markdown patterns with ** bold
    const html = el.innerHTML || '';
    const combined = text + ' ' + html;

    // Skip if already a CEM element
    if (el.classList.contains('ai-edit-message') || el.querySelector('.cem-row')) {
      return false;
    }

    // Skip if doesn't look like an ai-edit message at all
    if (!combined.includes('AI Edit') && 
        !combined.includes('Changes Applied') && 
        !combined.includes('Changes Rejected') &&
        !combined.includes('Edit Failed') &&
        !combined.includes('Edit Cancelled')) {
      return false;
    }

    let m: RegExpMatchArray | null;

    // Try: Edit Request (completed → show as "Sent")
    m = combined.match(PATTERNS.editRequest);
    if (m) {
      const [, rev, instruction] = m;
      replaceToCEM(el, 'sent', rev || '?', instruction.replace(/\*/g, '').trim(), undefined);
      return true;
    }

    // Try: Changes Applied
    m = combined.match(PATTERNS.accepted);
    if (m) {
      const [, rev, lines, instruction] = m;
      replaceToCEM(el, 'applied', rev || '?', instruction.replace(/\*/g, '').trim(), lines);
      return true;
    }

    // Try: Changes Rejected
    m = combined.match(PATTERNS.rejected);
    if (m) {
      const [, rev, lines, instruction] = m;
      replaceToCEM(el, 'rejected', rev || '?', instruction.replace(/\*/g, '').trim(), lines);
      return true;
    }

    // Try: Edit Failed
    m = combined.match(PATTERNS.error);
    if (m) {
      const [, instruction] = m;
      replaceToCEM(el, 'error', '?', instruction.replace(/\*/g, '').trim(), undefined);
      return true;
    }

    // Try: Edit Cancelled
    m = combined.match(PATTERNS.cancelled);
    if (m) {
      const [, rev] = m;
      replaceToCEM(el, 'cancelled', rev || '?', 'Cancelled', undefined);
      return true;
    }

    return false;
  }

  // ── Replace a message element with CEM compact bar ─────────────────
  function replaceToCEM(
    el: HTMLElement,
    type: 'sent' | 'applied' | 'rejected' | 'error' | 'cancelled',
    rev: string,
    instruction: string,
    lines?: string
  ): void {
    const stateClass = (type === 'sent' || type === 'applied') ? 'success' : 'rejected';

    // Create replacement element
    const cemDiv = document.createElement('div');
    cemDiv.className = `system-message ai-edit-message ${stateClass}`;
    cemDiv.setAttribute('data-cem-protected', 'true');
    cemDiv.setAttribute('data-no-collapse', 'true');
    cemDiv.innerHTML = buildCEM(type, rev, instruction, lines);

    // Replace the original element (could be the message-content, or the whole message wrapper)
    // Walk up to find the actual message wrapper
    let target = el;
    // If el is a .message-content or inner div, find the parent message container
    const parentMsg = el.closest('.assistant-message, .system-message, .message, [class*="message"]');
    if (parentMsg && parentMsg !== el) {
      target = parentMsg as HTMLElement;
    }

    target.replaceWith(cemDiv);
    console.log(`✅ [CEMFix] Converted "${type}" R${rev}: ${shorten(instruction, 30)}`);
  }

  // ── Scan the entire chat container for ai-edit messages ────────────
  function scanAndFix(): number {
    const container = document.querySelector('.ai-chat-container');
    if (!container) return 0;

    let fixed = 0;

    // Target all message elements that could contain ai-edit content
    // Cast to array to avoid live-collection issues during replacement
    const candidates = Array.from(container.querySelectorAll(
      '.assistant-message, .system-message, .message, [class*="message"]'
    )) as HTMLElement[];

    for (const el of candidates) {
      // Skip if already processed or is a child of something we'll process
      if (el.getAttribute('data-cem-protected') === 'true') continue;
      if (el.querySelector('[data-cem-protected="true"]')) continue;

      if (tryConvertToCEM(el)) {
        fixed++;
      }
    }

    return fixed;
  }

  // ── Inject CEM styles if not already present ───────────────────────
  function ensureCEMStyles(): void {
    if (document.getElementById('cem-reload-styles')) return;

    const style = document.createElement('style');
    style.id = 'cem-reload-styles';
    style.textContent = `
      /* CEM Compact Edit Messages - Reload Fix */
      .system-message.ai-edit-message {
        margin: 3px 8px !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
        border-radius: 6px !important;
        overflow: hidden;
      }
      .cem-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1;
        transition: filter 0.15s ease;
        white-space: nowrap;
        overflow: hidden;
      }
      .cem-row:hover { filter: brightness(1.15); }
      
      /* Icon */
      .cem-icon {
        width: 18px; height: 18px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 4px; font-size: 11px; font-weight: 700;
        flex-shrink: 0;
      }
      .cem-icon-ok { background: rgba(80, 200, 120, 0.2); color: #50c878; }
      .cem-icon-err { background: rgba(240, 80, 80, 0.2); color: #f05050; }
      
      /* Spinner (for in-progress, shouldn't appear on reload but just in case) */
      .cem-spinner {
        width: 12px; height: 12px;
        border: 2px solid rgba(126, 200, 240, 0.3);
        border-top-color: #7ec8f0;
        border-radius: 50%;
        animation: cem-spin 0.8s linear infinite;
      }
      @keyframes cem-spin { to { transform: rotate(360deg); } }
      
      /* Labels */
      .cem-label { font-weight: 600; min-width: 52px; }
      .cem-rev {
        font-size: 10px; font-weight: 700;
        padding: 1px 5px; border-radius: 3px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      .cem-lines {
        font-size: 10px; font-weight: 500;
        padding: 1px 5px; border-radius: 3px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      .cem-detail {
        flex: 1; overflow: hidden; text-overflow: ellipsis;
        opacity: 0.75; min-width: 0;
      }
      .cem-time {
        font-size: 10px; opacity: 0.5; margin-left: auto; flex-shrink: 0;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      
      /* Processing state (blue) */
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-row {
        background: linear-gradient(135deg, rgba(30, 60, 90, 0.9), rgba(20, 45, 70, 0.95));
        border: 1px solid rgba(126, 200, 240, 0.25);
      }
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-label { color: #7ec8f0; }
      .system-message.ai-edit-message:not(.success):not(.rejected) .cem-rev {
        background: rgba(126, 200, 240, 0.15); color: #7ec8f0;
      }
      
      /* Success state (green) */
      .system-message.ai-edit-message.success .cem-row {
        background: linear-gradient(135deg, rgba(25, 60, 40, 0.9), rgba(20, 50, 35, 0.95));
        border: 1px solid rgba(80, 200, 120, 0.25);
      }
      .system-message.ai-edit-message.success .cem-label { color: #8fd4a0; }
      .system-message.ai-edit-message.success .cem-rev {
        background: rgba(80, 200, 120, 0.15); color: #8fd4a0;
      }
      .system-message.ai-edit-message.success .cem-lines {
        background: rgba(80, 200, 120, 0.1); color: #8fd4a0;
      }
      
      /* Rejected state (red) */
      .system-message.ai-edit-message.rejected .cem-row {
        background: linear-gradient(135deg, rgba(70, 25, 30, 0.9), rgba(55, 20, 25, 0.95));
        border: 1px solid rgba(240, 100, 100, 0.25);
      }
      .system-message.ai-edit-message.rejected .cem-label { color: #f0a0a8; }
      .system-message.ai-edit-message.rejected .cem-rev {
        background: rgba(240, 100, 100, 0.15); color: #f0a0a8;
      }
      .system-message.ai-edit-message.rejected .cem-lines {
        background: rgba(240, 100, 100, 0.1); color: #f0a0a8;
      }
    `;
    document.head.appendChild(style);
    console.log('✅ [CEMFix] Styles injected');
  }

  // ── Main: Run fix on various triggers ──────────────────────────────

  // 1. Inject styles immediately
  ensureCEMStyles();

  // 2. Run after conversation load events
  const events = [
    'conversation-loaded',
    'conversations-rendered',
    'conversation-switched',
    'DOMContentLoaded'
  ];

  for (const evt of events) {
    document.addEventListener(evt, () => {
      // Small delay to let the renderer finish
      setTimeout(() => {
        const fixed = scanAndFix();
        if (fixed > 0) {
          console.log(`✅ [CEMFix] Fixed ${fixed} message(s) after "${evt}"`);
        }
      }, 200);
    });
  }

  // 3. MutationObserver as safety net — catches any renderer
  let scanTimeout: number | null = null;
  const observer = new MutationObserver((mutations) => {
    // Only react to childList changes in the chat container
    let relevant = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        const target = m.target as HTMLElement;
        if (target.classList?.contains('ai-chat-container') ||
            target.closest?.('.ai-chat-container')) {
          relevant = true;
          break;
        }
      }
    }
    if (!relevant) return;

    // Debounce: wait for rendering to settle
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = window.setTimeout(() => {
      const fixed = scanAndFix();
      if (fixed > 0) {
        console.log(`✅ [CEMFix] Fixed ${fixed} message(s) via observer`);
      }
      scanTimeout = null;
    }, 500);
  });

  // Start observing when chat container exists
  function attachObserver() {
    const container = document.querySelector('.ai-chat-container');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
      console.log('✅ [CEMFix] Observer attached to chat container');
      return true;
    }
    return false;
  }

  if (!attachObserver()) {
    // Retry until container exists
    const retryInterval = setInterval(() => {
      if (attachObserver()) {
        clearInterval(retryInterval);
      }
    }, 500);
    // Give up after 30 seconds
    setTimeout(() => clearInterval(retryInterval), 30000);
  }

  // 4. Initial scan after a delay (catches the startup render)
  setTimeout(() => {
    const fixed = scanAndFix();
    if (fixed > 0) {
      console.log(`✅ [CEMFix] Fixed ${fixed} message(s) on startup`);
    }
  }, 2000);

  // Second pass for late renderers
  setTimeout(() => {
    const fixed = scanAndFix();
    if (fixed > 0) {
      console.log(`✅ [CEMFix] Fixed ${fixed} message(s) on delayed scan`);
    }
  }, 5000);

  // 5. Expose for manual use
  if (typeof window !== 'undefined') {
    (window as any).cemFix = {
      scan: scanAndFix,
      convert: tryConvertToCEM,
    };
    console.log('✅ [CEMFix] Ready! Manual: window.cemFix.scan()');
  }
})();
