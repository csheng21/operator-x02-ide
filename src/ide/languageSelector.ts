// src/ide/languageSelector.ts
// ============================================================================
// OPERATOR X02 - AI RESPONSE LANGUAGE SELECTOR (custom dropdown, clean)
// ----------------------------------------------------------------------------
// Custom dropdown: a small button in the chat icon row + a position:fixed menu
// on <body> that opens upward and stays inside the viewport, so no option is
// ever clipped by the right-docked panel.
//
// IMPORTANT: this version does NOT touch, restyle, reorder, or wrap the send
// button or the icon row. It only inserts its own button. The send button is
// cloned/replaced periodically by main.ts, so any styling we applied to it was
// being lost anyway and only caused layout breakage.
//
// main.ts calls getLanguageDirective() and appends it to the AI context.
// Pure ASCII labels for PowerShell 5.1 encoding safety.
// ============================================================================

const STORAGE_KEY = 'x02ResponseLanguage';

export interface LangOption { value: string; label: string; }

export const LANGUAGES: LangOption[] = [
  { value: 'auto',                  label: 'Auto' },
  { value: 'English',               label: 'English' },
  { value: 'Bahasa Melayu',         label: 'Bahasa Melayu' },
  { value: 'Chinese (Simplified)',  label: 'Chinese (Simp.)' },
  { value: 'Chinese (Traditional)', label: 'Chinese (Trad.)' },
  { value: 'Japanese',              label: 'Japanese' },
  { value: 'Korean',                label: 'Korean' },
  { value: 'Hindi',                 label: 'Hindi' },
  { value: 'Tamil',                 label: 'Tamil' },
  { value: 'Bengali',               label: 'Bengali' },
  { value: 'Urdu',                  label: 'Urdu' },
  { value: 'Arabic',                label: 'Arabic' },
  { value: 'Indonesian',            label: 'Indonesian' },
  { value: 'Thai',                  label: 'Thai' },
  { value: 'Vietnamese',            label: 'Vietnamese' },
  { value: 'Filipino (Tagalog)',    label: 'Filipino' },
  { value: 'Spanish',               label: 'Spanish' },
  { value: 'Portuguese',            label: 'Portuguese' },
  { value: 'German',                label: 'German' },
  { value: 'French',                label: 'French' },
  { value: 'Russian',               label: 'Russian' },
  { value: 'Italian',               label: 'Italian' },
  { value: 'Turkish',               label: 'Turkish' },
  { value: 'Dutch',                 label: 'Dutch' },
  { value: 'Polish',                label: 'Polish' },
];

export function getResponseLanguage(): string {
  return localStorage.getItem(STORAGE_KEY) || 'auto';
}
export function setResponseLanguage(v: string): void {
  localStorage.setItem(STORAGE_KEY, v);
}

export function getLanguageDirective(): string {
  const lang = getResponseLanguage();
  if (!lang || lang === 'auto') return '';
  return '\n\n[LANGUAGE INSTRUCTION - HIGHEST PRIORITY]\n'
    + 'Respond ONLY in ' + lang + '. Write ALL explanations, headings and prose in ' + lang + '. '
    + 'Do NOT translate code, code comments, file paths, shell/terminal commands, API names '
    + 'or identifiers - leave those exactly as written. '
    + 'Even if the user writes in another language, reply in ' + lang
    + ' unless they explicitly ask for a different language.';
}

let mounted = false;
let healObserver: MutationObserver | null = null;

function labelFor(value: string): string {
  const o = LANGUAGES.find(l => l.value === value);
  return o ? o.label : 'Auto';
}

function closeMenu(menu: HTMLElement): void { menu.style.display = 'none'; }

function openMenu(btn: HTMLElement, menu: HTMLElement): void {
  menu.style.display = 'block';
  menu.style.visibility = 'hidden';
  const r = btn.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const margin = 6;

  let left = r.right - mw;
  if (left < margin) left = margin;
  if (left + mw > window.innerWidth - margin) left = window.innerWidth - margin - mw;

  let top = r.top - mh - 4;            // open upward
  if (top < margin) top = r.bottom + 4; // fall back to downward

  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.visibility = 'visible';
}

export function mountLanguageSelector(): void {
  if (mounted && document.getElementById('x02-lang-btn')) return;

  const input = document.getElementById('ai-assistant-input')
             || document.querySelector('textarea[id*="input"]');
  if (!input) { setTimeout(mountLanguageSelector, 800); return; }

  // Own row, placed right after the .chat-input-actions bar (or after the input
  // container as a fallback). This keeps the control out of the space-between
  // icon cluster entirely, so it cannot overlap the send button or get wrapped.
  const actions = document.querySelector('.chat-input-actions') as HTMLElement | null;
  const anchorRow = actions
                 || (input.closest('.chat-input-area') as HTMLElement)
                 || (input.parentElement as HTMLElement);
  if (!anchorRow || !anchorRow.parentElement) { setTimeout(mountLanguageSelector, 800); return; }
  const container = anchorRow.parentElement as HTMLElement;

  if (container.querySelector('#x02-lang-row')) { mounted = true; return; }

  // The dedicated row.
  const row = document.createElement('div');
  row.id = 'x02-lang-row';
  row.style.cssText =
    'display:flex;align-items:center;justify-content:flex-end;gap:6px;'
    + 'padding:4px 12px 6px;';

  const lbl = document.createElement('span');
  lbl.textContent = 'Language:';
  lbl.style.cssText = 'font-size:10px;color:#7a7a7a;letter-spacing:0.3px;';

  const host = row;  // the button mounts into our row
  const current = getResponseLanguage();

  const btn = document.createElement('button');
  btn.id = 'x02-lang-btn';
  btn.type = 'button';
  btn.title = 'AI response language';
  btn.textContent = labelFor(current) + '  v';
  btn.style.cssText =
    'background:#252526;color:#ccc;border:1px solid #3c3c3c;border-radius:4px;'
    + 'padding:3px 10px;margin:0;font-size:11px;'
    + 'outline:none;cursor:pointer;max-width:120px;overflow:hidden;'
    + 'text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;'
    + 'border-right:1px solid #3c3c3c;flex:0 0 auto;';

  const menu = document.createElement('div');
  menu.id = 'x02-lang-menu';
  menu.style.cssText =
    'position:fixed;z-index:1000050;display:none;background:#1e1e1e;'
    + 'border:1px solid #3c3c3c;border-radius:6px;padding:4px;'
    + 'max-height:320px;overflow-y:auto;min-width:170px;'
    + 'box-shadow:0 6px 24px rgba(0,0,0,0.5);font-size:12px;';

  for (const opt of LANGUAGES) {
    const item = document.createElement('div');
    item.textContent = opt.label;
    item.dataset.value = opt.value;
    item.style.cssText =
      'padding:6px 10px;border-radius:4px;color:#ccc;cursor:pointer;white-space:nowrap;';
    if (opt.value === current) { item.style.background = '#0e639c'; item.style.color = '#fff'; }
    item.addEventListener('mouseenter', () => { if (opt.value !== getResponseLanguage()) item.style.background = '#2a2d2e'; });
    item.addEventListener('mouseleave', () => { if (opt.value !== getResponseLanguage()) item.style.background = 'transparent'; });
    item.addEventListener('click', () => {
      setResponseLanguage(opt.value);
      btn.textContent = opt.label + '  v';
      for (const c of Array.from(menu.children) as HTMLElement[]) {
        const sel = c.dataset.value === opt.value;
        c.style.background = sel ? '#0e639c' : 'transparent';
        c.style.color = sel ? '#fff' : '#ccc';
      }
      closeMenu(menu);
      console.log('[X02] AI response language set to: ' + opt.value);
    });
    menu.appendChild(item);
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.style.display === 'block') { closeMenu(menu); return; }
    openMenu(btn, menu);
  });
  document.addEventListener('click', () => closeMenu(menu));
  window.addEventListener('resize', () => closeMenu(menu));

  document.body.appendChild(menu);

  // Insert our button as the FIRST child of the row. We do not reorder, wrap,
  // or restyle anything else - the send button keeps its native layout.
  row.insertBefore(lbl, row.firstChild);
  host.appendChild(btn);
  container.insertBefore(row, anchorRow.nextSibling);

  (window as any).getX02ResponseLanguage = getResponseLanguage;
  (window as any).getX02LanguageDirective = getLanguageDirective;

  // Self-heal: re-insert our button if a toolbar rebuild removes it. We never
  // touch the send button here.
  if (!healObserver) {
    let pending = false;
    const watchRoot = (document.querySelector('.chat-input-area') as HTMLElement) || document.body;
    healObserver = new MutationObserver(() => {
      if (pending) return;
      if (!document.getElementById('x02-lang-row')) {
        pending = true;
        setTimeout(() => { pending = false; mounted = false; mountLanguageSelector(); }, 200);
      }
    });
    healObserver.observe(watchRoot, { childList: true, subtree: true });
  }

  mounted = true;
  console.log('[X02] Language selector (clean) mounted: ' + current);
}