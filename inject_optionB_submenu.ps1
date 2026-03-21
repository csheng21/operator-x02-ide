# Step 1: Hide ALL remaining old context menu items across all files
$srcPath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src"

$groups = @(
    "contextMenuGroupId: 'ai',",
    'contextMenuGroupId: "ai",',
    "contextMenuGroupId: 'navigation',",
    'contextMenuGroupId: "navigation",',
    "contextMenuGroupId: '1_modification',",
    'contextMenuGroupId: "1_modification",'
)

$hidden = "contextMenuGroupId: 'z_hidden_optionb',"

Get-ChildItem -Path $srcPath -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $original = $content
    foreach ($g in $groups) {
        $content = $content.Replace($g, $hidden)
    }
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Patched: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "Step 1 done - all old items hidden" -ForegroundColor Cyan

# Step 2: Write new contextMenuOptionB.ts with submenus + better icons
$modulePath = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\ide\aiAssistant\contextMenuOptionB.ts"

$lines = @(
"// contextMenuOptionB.ts - Grouped Professional Menu with Submenus + Animations",
"",
"let menuEl: HTMLElement | null = null;",
"",
"export function injectOptionBStyles(): void {",
"  if (document.getElementById('x02-ctx-optionb')) return;",
"  const s = document.createElement('style');",
"  s.id = 'x02-ctx-optionb';",
"  const css = [",
"    '#x02-ctx-menu { position:fixed; z-index:99999; background:#1e1e1e; border:1px solid rgba(245,200,66,0.25);',",
"    '  border-radius:10px; padding:6px 0; min-width:220px; box-shadow:0 12px 40px rgba(0,0,0,0.7),0 2px 8px rgba(245,200,66,0.1);',",
"    '  animation:ctxOpen 0.14s cubic-bezier(0.2,0,0.13,1.5) forwards; transform-origin:top left; }',",
"    '@keyframes ctxOpen { from{opacity:0;transform:scale(0.93) translateY(-5px)} to{opacity:1;transform:scale(1) translateY(0)} }',",
"    '#x02-ctx-menu .ctx-section { color:#f5c842; font-size:10px; font-weight:700; letter-spacing:1.5px;',",
"    '  text-transform:uppercase; padding:10px 14px 4px; opacity:0.8; pointer-events:none; }',",
"    '#x02-ctx-menu .ctx-divider { height:1px; background:rgba(245,200,66,0.12); margin:4px 10px; }',",
"    '#x02-ctx-menu .ctx-item { display:flex; align-items:center; gap:10px; padding:7px 14px;',",
"    '  color:#d4d4d4; font-size:13px; cursor:pointer; position:relative; transition:background 0.12s; border-radius:4px; margin:1px 4px; }',",
"    '#x02-ctx-menu .ctx-item:hover { background:rgba(245,200,66,0.1); color:#f5c842; }',",
"    '#x02-ctx-menu .ctx-item .ctx-icon { font-size:15px; width:20px; text-align:center; }',",
"    '#x02-ctx-menu .ctx-item .ctx-arrow { margin-left:auto; opacity:0.5; font-size:11px; }',",
"    '#x02-ctx-menu .ctx-item:hover .ctx-arrow { opacity:1; }',",
"    '#x02-ctx-menu .ctx-sub { display:none; position:absolute; left:100%; top:-6px;',",
"    '  background:#1e1e1e; border:1px solid rgba(245,200,66,0.25); border-radius:10px;',",
"    '  padding:6px 0; min-width:200px; box-shadow:0 12px 40px rgba(0,0,0,0.7);',",
"    '  animation:ctxOpen 0.12s ease forwards; }',",
"    '#x02-ctx-menu .ctx-item:hover > .ctx-sub { display:block; }',",
"    '#x02-ctx-menu .ctx-item .ctx-kbd { margin-left:auto; font-size:11px; opacity:0.4; font-family:monospace; }'",
"  ].join(' ');",
"  s.textContent = css;",
"  document.head.appendChild(s);",
"}",
"",
"function makeItem(icon: string, label: string, kbd: string, onClick: () => void, subItems?: Array<{icon:string,label:string,fn:()=>void}>): HTMLElement {",
"  const el = document.createElement('div');",
"  el.className = 'ctx-item';",
"  const hasArrow = subItems && subItems.length > 0;",
"  el.innerHTML = `<span class='ctx-icon'>${icon}</span><span>${label}</span>${hasArrow ? `<span class='ctx-arrow'>&#9654;</span>` : kbd ? `<span class='ctx-kbd'>${kbd}</span>` : ''}`;",
"  if (subItems && subItems.length > 0) {",
"    const sub = document.createElement('div');",
"    sub.className = 'ctx-sub';",
"    subItems.forEach(si => {",
"      const subEl = document.createElement('div');",
"      subEl.className = 'ctx-item';",
"      subEl.innerHTML = `<span class='ctx-icon'>${si.icon}</span><span>${si.label}</span>`;",
"      subEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); closeMenu(); si.fn(); });",
"      sub.appendChild(subEl);",
"    });",
"    el.appendChild(sub);",
"  } else {",
"    el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); closeMenu(); onClick(); });",
"  }",
"  return el;",
"}",
"",
"function makeSectionHeader(label: string): HTMLElement {",
"  const el = document.createElement('div');",
"  el.className = 'ctx-section';",
"  el.textContent = label;",
"  return el;",
"}",
"",
"function makeDivider(): HTMLElement {",
"  const el = document.createElement('div');",
"  el.className = 'ctx-divider';",
"  return el;",
"}",
"",
"function closeMenu(): void {",
"  if (menuEl) { menuEl.remove(); menuEl = null; }",
"}",
"",
"export function showOptionBMenu(x: number, y: number, editor: any): void {",
"  closeMenu();",
"  injectOptionBStyles();",
"  const menu = document.createElement('div');",
"  menu.id = 'x02-ctx-menu';",
"  menu.style.left = x + 'px';",
"  menu.style.top = y + 'px';",
"",
"  const getCode = () => {",
"    const sel = editor.getSelection();",
"    return editor.getModel()?.getValueInRange(sel) || editor.getModel()?.getLineContent(sel?.startLineNumber || 1) || '';",
"  };",
"  const send = (prompt: string) => {",
"    const code = getCode();",
"    const fn = (window as any).sendPrompt || (window as any).aiAutoSend?.direct;",
"    if (fn) fn(prompt + (code ? ': ' + code.substring(0, 300) : ''));",
"  };",
"",
"  // ── AI ACTIONS section ────────────────────────────────────────────────",
"  menu.appendChild(makeSectionHeader('⚡ AI Actions'));",
"  menu.appendChild(makeItem('🔍', 'Explain', 'Ctrl+Shift+E', () => send('Explain this code')));",
"  menu.appendChild(makeItem('🔧', 'Fix & Improve', '', () => {}, [",
"    { icon: '⚡', label: 'Quick Fix Error',    fn: () => send('Fix the error in') },",
"    { icon: '🔄', label: 'Refactor',           fn: () => send('Refactor and improve') },",
"    { icon: '🛡️', label: 'Add Error Handling', fn: () => send('Add error handling to') },",
"    { icon: '✅', label: 'Optimize',           fn: () => send('Optimize performance of') },",
"  ]));",
"  menu.appendChild(makeItem('📝', 'Generate', '', () => {}, [",
"    { icon: '🧪', label: 'Unit Tests',      fn: () => send('Generate unit tests for') },",
"    { icon: '📖', label: 'Documentation',   fn: () => send('Generate documentation for') },",
"    { icon: '💬', label: 'Add Comments',    fn: () => send('Add clear comments to') },",
"    { icon: '🏗️', label: 'Boilerplate',     fn: () => send('Generate boilerplate code for') },",
"  ]));",
"  menu.appendChild(makeItem('🛡️', 'Compliance', '', () => {}, [",
"    { icon: '🚗', label: 'ISO 26262 ASIL',     fn: () => send('Add ISO 26262 ASIL compliance to') },",
"    { icon: '🔒', label: 'MISRA C',            fn: () => send('Apply MISRA C rules to') },",
"    { icon: '📋', label: 'AUTOSAR',            fn: () => send('Add AUTOSAR compliance to') },",
"  ]));",
"",
"  menu.appendChild(makeDivider());",
"",
"  // ── EDITOR section ────────────────────────────────────────────────────",
"  menu.appendChild(makeSectionHeader('📋 Editor'));",
"  menu.appendChild(makeItem('✏️', 'Edit with AI', 'Ctrl+Shift+I', () => {",
"    const fn = (window as any).triggerInlineAIEdit || (window as any).aiDirectEditor?.open;",
"    if (fn) fn(); else send('Edit this code:');",
"  }));",
"  menu.appendChild(makeItem('⚠️', 'Explain Error', '', () => {",
"    const marker = (window as any).__lastErrorMarker;",
"    if (marker) send('Explain this error: ' + marker.message);",
"  }));",
"",
"  menu.appendChild(makeDivider());",
"  menu.appendChild(makeItem('🖥️', 'Command Palette', 'F1', () => {",
"    editor.trigger('keyboard', 'editor.action.quickCommand', {});",
"  }));",
"",
"  document.body.appendChild(menu);",
"  menuEl = menu;",
"",
"  // Clamp to viewport",
"  const rect = menu.getBoundingClientRect();",
"  if (rect.right > window.innerWidth)  menu.style.left = (x - rect.width) + 'px';",
"  if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';",
"",
"  // Close on outside click",
"  setTimeout(() => {",
"    document.addEventListener('mousedown', closeMenu, { once: true });",
"    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); }, { once: true });",
"  }, 50);",
"}",
"",
"export function registerOptionBMenu(editor: any, _sn: Function, _ee: Function, _sep: Function): void {",
"  injectOptionBStyles();",
"  // Intercept right-click on Monaco editor",
"  const domNode = editor.getDomNode();",
"  if (!domNode) return;",
"  domNode.addEventListener('contextmenu', (e: MouseEvent) => {",
"    e.preventDefault();",
"    e.stopPropagation();",
"    showOptionBMenu(e.clientX, e.clientY, editor);",
"  }, true);",
"  console.log('Option B context menu (custom) registered');",
"}"
)

$moduleContent = $lines -join "`n"
[System.IO.File]::WriteAllText($modulePath, $moduleContent, [System.Text.Encoding]::UTF8)
Write-Host "contextMenuOptionB.ts written" -ForegroundColor Green

# Copy to editor folder too
$modulePath2 = "C:\Users\hi\PycharmProjects\SVN_25\dev\App_Chatgpt\App_AI\src\editor\contextMenuOptionB.ts"
[System.IO.File]::WriteAllText($modulePath2, $moduleContent, [System.Text.Encoding]::UTF8)
Write-Host "editor/contextMenuOptionB.ts written" -ForegroundColor Green

Write-Host ""
Write-Host "All done. Rebuild: npm run tauri dev" -ForegroundColor Cyan
Write-Host "Right-click in Monaco to see the new custom menu with submenus" -ForegroundColor Gray
