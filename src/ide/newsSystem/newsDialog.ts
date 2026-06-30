// newsDialog.ts
// Center popup that shows a Supabase news item when the IDE starts.
// Behavior: shows the PINNED row. Pops up again whenever you CHANGE the
// message (title/content/etc). Stays quiet if the user already dismissed
// the exact same message.
//
// Save as:  src/ide/newsSystem/newsDialog.ts

interface NewsItem {
  id: string
  type?: string
  icon?: string
  title: string
  content: string
  badge?: string
  link_text?: string
  link_url?: string
  version?: string
  is_pinned?: boolean
}

const SEEN_KEY = 'x02_news_seen_sigs'   // remembers which exact messages were dismissed
let stylesInjected = false

function injectStyles(): void {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = `
    .x02-news-overlay {
      position: fixed; inset: 0; z-index: 1000000;
      background: rgba(8, 12, 20, 0.62);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(3px);
    }
    .x02-news-card {
      width: min(460px, 92vw);
      background: #131a26; border: 1px solid #243044; border-radius: 12px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.5);
      color: #e6edf6; font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      overflow: hidden;
    }
    .x02-news-head { display: flex; align-items: center; gap: 10px; padding: 16px 18px 10px 18px; }
    .x02-news-icon { font-size: 22px; line-height: 1; }
    .x02-news-title { font-size: 16px; font-weight: 700; margin: 0; flex: 1; }
    .x02-news-badge {
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
      color: #052b22; background: #1DE9B6; padding: 2px 7px; border-radius: 999px;
    }
    .x02-news-body { padding: 0 18px 16px 18px; font-size: 13.5px; line-height: 1.55; color: #b9c4d4; white-space: pre-wrap; }
    .x02-news-foot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid #1d2636; }
    .x02-news-btn {
      font: inherit; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 8px;
      cursor: pointer; border: 1px solid #2a3650; background: transparent; color: #c4cfdf;
    }
    .x02-news-btn:hover { background: #1a2433; }
    .x02-news-btn.primary { background: #1DE9B6; border-color: #1DE9B6; color: #052b22; }
    .x02-news-version { font-size: 11px; color: #5d6b80; margin-right: auto; align-self: center; }
  `
  document.head.appendChild(style)
}

function getSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') } catch { return [] }
}
function markSeen(sig: string): void {
  const seen = getSeen()
  if (!seen.includes(sig)) { seen.push(sig); try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)) } catch {} }
}

// A "signature" of the visible message. If you edit the row, this changes,
// so the popup treats it as new and shows again.
function newsSignature(item: any): string {
  const url = item.link_url || item.linkUrl || item.url || ''
  const txt = item.link_text || item.linkText || ''
  return [item.id, item.title, item.content, item.icon, item.badge, item.version, txt, url].join('|~|')
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Open an external URL from inside the Tauri webview.
// window.open() is blocked there, so use the Tauri shell plugin first.
async function openExternal(url: string): Promise<void> {
  try {
    const shell: any = await import('@tauri-apps/plugin-shell')
    if (shell && typeof shell.open === 'function') { await shell.open(url); return }
  } catch (e) { /* fall through to window.open */ }
  try { window.open(url, '_blank') } catch (e) {}
}

/** Show a single news item as a popup dialog. */
export function showNewsDialog(item: NewsItem): void {
  injectStyles()
  const sig = newsSignature(item)
  const overlay = document.createElement('div')
  overlay.className = 'x02-news-overlay'
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); markSeen(sig) }
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
  document.addEventListener('keydown', onKey)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  const __linkUrl = (item as any).link_url || (item as any).linkUrl || (item as any).url || ''
  const __linkText = (item as any).link_text || (item as any).linkText || 'Open'
  const linkBtn = __linkUrl
    ? `<button class="x02-news-btn primary" data-act="link">${escapeHtml(__linkText)}</button>` : ''

  overlay.innerHTML = `
    <div class="x02-news-card" role="dialog" aria-modal="true">
      <div class="x02-news-head">
        <span class="x02-news-icon">${item.icon || '📢'}</span>
        <h3 class="x02-news-title">${escapeHtml(item.title)}</h3>
        ${item.badge ? `<span class="x02-news-badge">${escapeHtml(item.badge)}</span>` : ''}
      </div>
      <div class="x02-news-body">${escapeHtml(item.content)}</div>
      <div class="x02-news-foot">
        ${item.version ? `<span class="x02-news-version">v${escapeHtml(item.version)}</span>` : ''}
        <button class="x02-news-btn" data-act="close">Dismiss</button>
        ${linkBtn}
      </div>
    </div>`

  overlay.querySelector('[data-act="close"]')?.addEventListener('click', close)
  overlay.querySelector('[data-act="link"]')?.addEventListener('click', () => {
    if (__linkUrl) { openExternal(__linkUrl) } close()
  })
  document.body.appendChild(overlay)
}

/** Fetch from Supabase and show the pinned row, but only if it's new/changed. */
export async function showLatestNewsDialog(): Promise<void> {
  try {
    const mod: any = await import('./newsService').catch(() => null)
    const fetchFn = mod?.fetchNewsItems
    if (typeof fetchFn !== 'function') {
      console.warn('[NewsDialog] fetchNewsItems not found - skipping startup popup')
      return
    }
    const items: NewsItem[] = await fetchFn()
    if (!items || items.length === 0) return

    const isPinned = (i: any) =>
      i.is_pinned === true || i.isPinned === true || i.pinned === true ||
      i.is_pinned === 'true' || i.isPinned === 'true'
    const item = items.filter(isPinned)[0] || items[0]
    if (!item) return

    // Only pop up if this exact message hasn't been dismissed before.
    // Changing the message in Supabase makes a new signature -> it pops again.
    const sig = newsSignature(item)
    if (getSeen().includes(sig)) {
      console.log('[NewsDialog] message unchanged and already dismissed - not showing')
      return
    }
    showNewsDialog(item)
  } catch (err) {
    console.warn('[NewsDialog] could not load news:', err)
  }
}

// expose for console testing
;(window as any).showNewsDialog = showNewsDialog
;(window as any).showLatestNewsDialog = showLatestNewsDialog

// ---- AUTO-RUN ON STARTUP ---------------------------------------------------
function isLoadingScreenVisible(): boolean {
  const sels = ['.app-loader', '#app-loader', '.loading-screen', '#loading-screen', '.ide-loading']
  for (const s of sels) {
    const el = document.querySelector(s) as HTMLElement | null
    if (el && el.offsetParent !== null) return true
  }
  return false
}
function waitForReadyThenShow(): void {
  let waited = 0
  const step = 400, maxWait = 30000
  const timer = setInterval(() => {
    waited += step
    if (!isLoadingScreenVisible() || waited >= maxWait) {
      clearInterval(timer)
      setTimeout(() => { showLatestNewsDialog() }, 600)
    }
  }, step)
}
if (document.readyState === 'complete') waitForReadyThenShow()
else window.addEventListener('load', waitForReadyThenShow)
