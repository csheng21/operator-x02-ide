// contextMenuOptionB.ts - Custom context menu with submenus and animations

let menuEl: HTMLElement | null = null;

export function injectOptionBStyles(): void {
  if (document.getElementById('x02-ctx-optionb')) return;
  const s = document.createElement('style');
  s.id = 'x02-ctx-optionb';
  s.textContent = `
    #x02-ctx-menu {
      position: fixed; z-index: 99999;
      background: #1e1e1e;
      border: 1px solid rgba(245,200,66,0.25);
      border-radius: 10px; padding: 6px 0; min-width: 220px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(245,200,66,0.1);
      animation: ctxOpen 0.14s cubic-bezier(0.2,0,0.13,1.5) forwards;
      transform-origin: top left; font-family: -apple-system, sans-serif;
    }
    @keyframes ctxOpen {
      from { opacity:0; transform:scale(0.93) translateY(-5px); }
      to   { opacity:1; transform:scale(1)    translateY(0);    }
    }
    #x02-ctx-menu .ctx-section {
      color: #f5c842; font-size: 10px; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase;
      padding: 10px 14px 4px; opacity: 0.8; pointer-events: none;
    }
    #x02-ctx-menu .ctx-divider {
      height: 1px; background: rgba(245,200,66,0.12); margin: 4px 10px;
    }
    #x02-ctx-menu .ctx-item {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 14px; color: #d4d4d4; font-size: 13px;
      cursor: pointer; position: relative;
      transition: background 0.12s, color 0.12s;
      border-radius: 4px; margin: 1px 4px; user-select: none;
    }
    #x02-ctx-menu .ctx-item:hover {
      background: rgba(245,200,66,0.1); color: #f5c842;
    }
    #x02-ctx-menu .ctx-item .ctx-icon { font-size: 15px; width: 20px; text-align: center; }
    #x02-ctx-menu .ctx-item .ctx-arrow { margin-left: auto; opacity: 0.45; font-size: 10px; }
    #x02-ctx-menu .ctx-item:hover .ctx-arrow { opacity: 1; color: #f5c842; }
    #x02-ctx-menu .ctx-item .ctx-kbd {
      margin-left: auto; font-size: 11px; opacity: 0.4; font-family: monospace;
    }
    #x02-ctx-menu .ctx-sub {
      display: none; position: absolute; left: 105%; top: -6px;
      background: #1e1e1e; border: 1px solid rgba(245,200,66,0.25);
      border-radius: 10px; padding: 6px 0; min-width: 200px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.7);
      animation: ctxOpen 0.12s ease forwards;
    }
    #x02-ctx-menu .ctx-item:hover > .ctx-sub { display: block; }
  `;
  document.head.appendChild(s);
}

interface SubItem { icon: string; label: string; fn: () => void; }

function makeItem(
  icon: string,
  label: string,
  kbd: string,
  onClick: () => void,
  subItems?: SubItem[]
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ctx-item';
  const hasArrow = subItems && subItems.length > 0;
  const right = hasArrow
    ? '<span class="ctx-arrow">&#9654;</span>'
    : (kbd ? `<span class="ctx-kbd">${kbd}</span>` : '');
  el.innerHTML = `<span class="ctx-icon">${icon}</span><span>${label}</span>${right}`;

  if (subItems && subItems.length > 0) {
    const sub = document.createElement('div');
    sub.className = 'ctx-sub';
    subItems.forEach(si => {
      const subEl = document.createElement('div');
      subEl.className = 'ctx-item';
      subEl.innerHTML = `<span class="ctx-icon">${si.icon}</span><span>${si.label}</span>`;
      subEl.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        closeMenu(); si.fn();
      });
      sub.appendChild(subEl);
    });
    el.appendChild(sub);
  } else {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      closeMenu(); onClick();
    });
  }
  return el;
}

function makeSection(label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ctx-section';
  el.textContent = label;
  return el;
}

function makeDivider(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ctx-divider';
  return el;
}

function closeMenu(): void {
  if (menuEl) { menuEl.remove(); menuEl = null; }
}

export function showOptionBMenu(x: number, y: number, editor: any): void {
  closeMenu();
  injectOptionBStyles();

  const menu = document.createElement('div');
  menu.id = 'x02-ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const getCode = (): string => {
    try {
      const sel = editor.getSelection();
      const selected = editor.getModel()?.getValueInRange(sel) || '';
      if (selected.trim()) return selected;
      return editor.getModel()?.getLineContent(sel?.startLineNumber || 1) || '';
    } catch (_) { return ''; }
  };

  const send = (prompt: string): void => {
    const code = getCode();
    const msg = prompt + (code ? ':\n' + code.substring(0, 400) : '');
    const fn = (window as any).sendPrompt
      || ((window as any).aiAutoSend?.direct
        ? (m: string) => (window as any).aiAutoSend.direct('explain', 'selection', m)
        : null);
    if (fn) fn(msg);
    else {
      const inp = document.querySelector('#ai-assistant-input') as HTMLTextAreaElement;
      if (inp) {
        inp.value = msg;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = document.querySelector('.send-button, #send-btn, button[data-action="send"]') as HTMLButtonElement;
        if (btn) btn.click();
      }
    }
  };

  // ── AI ACTIONS ─────────────────────────────────────────────────────────
  menu.appendChild(makeSection('⚡ AI Actions'));

  menu.appendChild(makeItem('🔍', 'Explain Code', '', () => send('Explain this code')));

  menu.appendChild(makeItem('🔧', 'Fix & Improve', '', () => {}, [
    { icon: '⚡', label: 'Quick Fix Error',     fn: () => send('Fix the error in this code') },
    { icon: '🔄', label: 'Refactor',            fn: () => send('Refactor and improve this code') },
    { icon: '🛡️', label: 'Add Error Handling',  fn: () => send('Add robust error handling to') },
    { icon: '✅', label: 'Optimize',            fn: () => send('Optimize the performance of') },
    { icon: '🐛', label: 'Debug',               fn: () => send('Find and fix bugs in') },
  ]));

  menu.appendChild(makeItem('📝', 'Generate', '', () => {}, [
    { icon: '🧪', label: 'Unit Tests',      fn: () => send('Generate unit tests for') },
    { icon: '📖', label: 'Documentation',   fn: () => send('Generate JSDoc documentation for') },
    { icon: '💬', label: 'Add Comments',    fn: () => send('Add clear inline comments to') },
    { icon: '🏗️', label: 'Boilerplate',     fn: () => send('Generate complete boilerplate for') },
  ]));

  menu.appendChild(makeItem('🛡️', 'Compliance', '', () => {}, [
    { icon: '🚗', label: 'ISO 26262 ASIL', fn: () => send('Add ISO 26262 ASIL compliance annotations to') },
    { icon: '📏', label: 'MISRA C',        fn: () => send('Apply MISRA C coding rules to') },
    { icon: '📋', label: 'AUTOSAR',        fn: () => send('Add AUTOSAR compliance to') },
  ]));

  menu.appendChild(makeDivider());

  // ── EDITOR ─────────────────────────────────────────────────────────────
  menu.appendChild(makeSection('📋 Editor'));

  menu.appendChild(makeItem('✏️', 'Edit with AI', 'Ctrl+Shift+I', () => {
    const fn = (window as any).triggerInlineAIEdit
      || (window as any).aiDirectEditor?.open
      || (() => send('Edit this code:'));
    fn();
  }));

  menu.appendChild(makeItem('⚠️', 'Explain Error', '', () => {
    const marker = (window as any).__lastErrorMarker;
    if (marker) send('Explain and fix this error: ' + marker.message);
    else send('Explain the error at cursor');
  }));

  menu.appendChild(makeDivider());

  menu.appendChild(makeItem('🖥️', 'Command Palette', 'F1', () => {
    editor.trigger('keyboard', 'editor.action.quickCommand', {});
  }));

  document.body.appendChild(menu);
  menuEl = menu;

  // Clamp to viewport edges
  requestAnimationFrame(() => {
    if (!menuEl) return;
    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10)
      menuEl.style.left = Math.max(10, x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight - 10)
      menuEl.style.top = Math.max(10, y - rect.height) + 'px';
  });

  setTimeout(() => {
    document.addEventListener('mousedown', closeMenu, { once: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    }, { once: true });
  }, 50);
}

export function registerOptionBMenu(
  editor: any,
  _showNotification: Function,
  _explainError: Function,
  _showErrorExplanationPanel: Function
): void {
  injectOptionBStyles();
  const domNode = editor.getDomNode?.();
  if (!domNode) return;
  domNode.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showOptionBMenu(e.clientX, e.clientY, editor);
  }, true);
  console.log('Option B custom context menu registered');
}
