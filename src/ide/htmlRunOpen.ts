// htmlRunOpen.ts
// One-click "Play" for plain HTML projects — NO server, NO blob URL.
//
// Reads index.html, inlines any local <link rel=stylesheet> and <script src=...>,
// builds one self-contained page, and shows it in an in-IDE overlay iframe using
// `iframe.srcdoc`. We DO NOT use window.previewTab.open() because it prepends
// "http://" to whatever URL it's given (turning a blob URL into the broken
// "http://blob:http://localhost:1420/..."), which is why the preview showed the
// blank "cloud" every time. srcdoc needs no URL at all, so there is nothing to
// mangle and nothing to fail.
//
// Only shows for plain HTML projects (index.html, no package.json).
// Save as:  src/ide/htmlRunOpen.ts

let starting = false

function getProjectPath(): string {
  const w = window as any
  return w.currentFolderPath ||
    localStorage.getItem('currentProjectPath') ||
    localStorage.getItem('lastOpenedFolder') || ''
}

function joinPath(dir: string, file: string): string {
  const sep = dir.includes('\\') ? '\\' : '/'
  const clean = file.replace(/^\.?[\\/]/, '')
  return dir.endsWith(sep) ? dir + clean : dir + sep + clean
}

async function invoke<T = any>(cmd: string, args: any): Promise<T> {
  const core: any = await import('@tauri-apps/api/core')
  return core.invoke(cmd, args)
}

async function fileExists(path: string): Promise<boolean> {
  try { return await invoke<boolean>('file_exists', { path }) } catch { return false }
}

async function readFile(path: string): Promise<string> {
  const w = window as any
  try {
    if (w.fileSystem?.readFile) {
      const r = await w.fileSystem.readFile(path)
      if (typeof r === 'string') return r
      if (r && typeof r.content === 'string') return r.content
    }
  } catch { /* fall through */ }
  try { return await invoke<string>('read_file_content', { path }) } catch { }
  try { return await invoke<string>('read_file', { path }) } catch { }
  return ''
}

const HTML_ENTRIES = ['index.html', 'main.html', 'game.html']

async function findHtmlEntry(proj: string): Promise<string> {
  if (!proj || proj === '.') return ''
  for (const c of HTML_ENTRIES) {
    if (await fileExists(joinPath(proj, c))) return c
  }
  return ''
}

async function isHtmlProject(proj: string): Promise<boolean> {
  if (!proj || proj === '.') return false
  if (await fileExists(joinPath(proj, 'package.json'))) return false
  return (await findHtmlEntry(proj)) !== ''
}

function isLocalRef(ref: string): boolean {
  return !!ref && !/^(https?:)?\/\//i.test(ref) && !ref.startsWith('data:')
}

// Build a single self-contained HTML string with local CSS/JS inlined.
async function buildInlineHtml(proj: string, entry: string): Promise<string> {
  let html = await readFile(joinPath(proj, entry))
  if (!html) return ''

  // Inline local stylesheets:  <link rel="stylesheet" href="style.css">
  const linkRe = /<link\b[^>]*>/gi
  const links = html.match(linkRe) || []
  for (const tag of links) {
    if (!/stylesheet/i.test(tag) && !/\.css/i.test(tag)) continue
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i)
    if (!m || !isLocalRef(m[1])) continue
    const css = await readFile(joinPath(proj, m[1]))
    html = html.replace(tag, '<style>\n' + css + '\n</style>')
  }

  // Inline local scripts:  <script src="game.js"></script>  (keep type=module)
  const scriptRe = /<script\b([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)><\/script>/gi
  const scripts: { full: string; src: string; before: string; after: string }[] = []
  let mm: RegExpExecArray | null
  while ((mm = scriptRe.exec(html)) !== null) {
    scripts.push({ full: mm[0], before: mm[1], src: mm[2], after: mm[3] })
  }
  for (const s of scripts) {
    if (!isLocalRef(s.src)) continue
    const js = await readFile(joinPath(proj, s.src))
    const isModule = /type\s*=\s*["']module["']/i.test(s.before + s.after)
    const open = isModule ? '<script type="module">' : '<script>'
    html = html.replace(s.full, open + '\n' + js + '\n</script>')
  }

  return html
}

// A tiny bootstrap injected at the top of the previewed page. It catches
// syntax/runtime errors (which would otherwise leave a silent black canvas)
// and prints them in a red banner INSIDE the preview, so a broken game is
// self-explanatory instead of just blank.
const ERR_BOOTSTRAP =
  '<script>(function(){' +
  'function show(m){var d=document.getElementById("__x02err");' +
  'if(!d){d=document.createElement("div");d.id="__x02err";' +
  'd.style.cssText="position:fixed;left:0;right:0;bottom:0;max-height:50%;overflow:auto;z-index:2147483647;background:#2b0b0b;color:#ffb4b4;font:12px/1.5 monospace;padding:10px 12px;border-top:2px solid #ff5c5c;white-space:pre-wrap";' +
  '(document.body||document.documentElement).appendChild(d);}' +
  'd.textContent="\\u26A0 "+m;}' +
  'window.addEventListener("error",function(e){' +
  'show((e.message||"Error")+(e.filename?("  ("+e.filename+":"+e.lineno+":"+e.colno+")"):""));},true);' +
  'window.addEventListener("unhandledrejection",function(e){' +
  'var r=e.reason;show("Unhandled promise rejection: "+((r&&r.message)||r));});' +
  '})();<\/script>'

// Insert the error reporter as early as possible so it catches later scripts.
function injectErrorReporter(html: string): string {
  const headMatch = html.match(/<head\b[^>]*>/i)
  if (headMatch) {
    return html.replace(headMatch[0], headMatch[0] + '\n' + ERR_BOOTSTRAP)
  }
  const htmlMatch = html.match(/<html\b[^>]*>/i)
  if (htmlMatch) {
    return html.replace(htmlMatch[0], htmlMatch[0] + '\n' + ERR_BOOTSTRAP)
  }
  return ERR_BOOTSTRAP + '\n' + html
}

// Preview handle returned by openPreviewShell — lets the caller fill in the
// title, inject the built HTML, or show an error, all AFTER the loader is
// already on screen.
interface PreviewShell {
  setTitle(entry: string): void
  setContent(html: string): void
  fail(message: string): void
  destroy(): void
}

// Open the preview panel IMMEDIATELY (with the loading animation) so the click
// gets instant feedback. File reading / inlining happens afterwards, then
// setContent() injects the page and the loader fades on first paint.
function openPreviewShell(): PreviewShell {
  ensureStyles()
  const existing = document.getElementById('x02-play-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'x02-play-overlay'
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483000',
    'background:rgba(4,20,17,0.72)', 'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'padding:24px',
    'box-sizing:border-box'
  ].join(';')

  const panel = document.createElement('div')
  panel.className = 'x02-panel'
  panel.style.cssText = [
    'display:flex', 'flex-direction:column', 'width:100%', 'height:100%',
    'max-width:1100px', 'background:#0b0f14', 'border:1px solid #1DE9B6',
    'border-radius:10px', 'overflow:hidden', 'box-shadow:0 12px 48px rgba(0,0,0,0.5)'
  ].join(';')

  const bar = document.createElement('div')
  bar.style.cssText = [
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'padding:8px 12px', 'background:#111820', 'color:#8affd9',
    'font:600 13px system-ui,sans-serif', 'flex:0 0 auto',
    'border-bottom:1px solid #14342b'
  ].join(';')

  const titleEl = document.createElement('span')
  titleEl.textContent = '▶ Preview'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'x02-close'
  closeBtn.textContent = '✕ Close (Esc)'
  closeBtn.style.cssText = [
    'cursor:pointer', 'border:1px solid #1DE9B6', 'border-radius:6px',
    'background:#1DE9B6', 'color:#052b22', 'font:600 12px system-ui,sans-serif',
    'padding:4px 12px'
  ].join(';')

  // Body wraps the iframe + a loading overlay that sits on top until first paint.
  const body = document.createElement('div')
  body.style.cssText = 'position:relative;flex:1 1 auto;width:100%;overflow:hidden'

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'HTML preview')
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#000'

  const loader = document.createElement('div')
  loader.className = 'x02-loader'
  loader.innerHTML =
    '<div class="x02-ring"></div>' +
    '<div class="x02-ltext">Loading preview…</div>' +
    '<div class="x02-bar"></div>'

  let settled = false
  function finishLoad(): void {
    if (settled) return
    settled = true
    loader.classList.add('x02-done')
    setTimeout(() => loader.remove(), 300)
  }
  // Reveal the game only after its first paint (load fires when srcdoc parses).
  iframe.addEventListener('load', () => setTimeout(finishLoad, 150))

  function destroy(): void {
    overlay.remove()
    window.removeEventListener('keydown', onKey)
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') destroy()
  }
  closeBtn.addEventListener('click', destroy)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) destroy() })
  window.addEventListener('keydown', onKey)

  bar.appendChild(titleEl)
  bar.appendChild(closeBtn)
  body.appendChild(iframe)
  body.appendChild(loader)
  panel.appendChild(bar)
  panel.appendChild(body)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  return {
    setTitle(entry: string): void {
      titleEl.textContent = '▶ Preview — ' + entry
    },
    setContent(html: string): void {
      // Safety net: reveal even if the load event never fires.
      setTimeout(finishLoad, 4000)
      iframe.srcdoc = injectErrorReporter(html)
    },
    fail(message: string): void {
      settled = true
      loader.classList.remove('x02-done')
      loader.innerHTML = '<div class="x02-lerr">⚠ ' + message + '</div>'
    },
    destroy
  }
}

async function playCurrentHtml(): Promise<void> {
  if (starting) return
  const proj = getProjectPath()
  if (!proj || proj === '.') { alert('Open a project folder first, then press Play.'); return }

  starting = true
  // Save modified tabs before previewing so Play shows current code, not stale disk files.
  try { await (window as any).tabManager?.saveAllTabs?.(); } catch (e) { console.warn('[htmlRunOpen] saveAllTabs before play failed:', e); }
  const btn = getButton()
  if (btn) setButtonLoading(btn, true)
  const startedAt = Date.now()

  // Open the panel with the loading animation IMMEDIATELY — before any file
  // reads — so the click gets instant on-screen feedback.
  const shell = openPreviewShell()

  try {
    const entry = await findHtmlEntry(proj)
    if (!entry) { shell.fail('No index.html found in this project.'); return }
    shell.setTitle(entry)
    const html = await buildInlineHtml(proj, entry)
    if (!html) { shell.fail('Could not read ' + entry + '.'); return }
    shell.setContent(html)
  } catch (e) {
    console.error('[Play] failed:', e)
    shell.fail('Play failed: ' + ((e as any)?.message || e))
  } finally {
    // Keep the button spinner visible briefly so fast reads still register.
    const wait = Math.max(0, 350 - (Date.now() - startedAt))
    setTimeout(() => {
      if (btn) setButtonLoading(btn, false)
      starting = false
    }, wait)
  }
}

;(window as any).playCurrentHtml = playCurrentHtml

// ---- Styling (hover / press / loading states + overlay animations) ----
const STYLE_ID = 'x02-play-style'
const STYLE_CSS = `
#x02-play-html-btn{
  margin-left:6px; padding:4px 12px;
  font:600 12px system-ui,-apple-system,sans-serif; line-height:1;
  cursor:pointer; border:1px solid #1DE9B6; border-radius:6px;
  background:#1DE9B6; color:#052b22;
  display:inline-flex; align-items:center; gap:6px;
  box-shadow:0 1px 3px rgba(29,233,182,.35);
  transition:transform .08s ease, box-shadow .15s ease, filter .15s ease, opacity .15s ease;
  -webkit-user-select:none; user-select:none;
}
#x02-play-html-btn.x02-hidden{ display:none !important; }
#x02-play-html-btn:hover{ filter:brightness(1.08); box-shadow:0 3px 10px rgba(29,233,182,.5); transform:translateY(-1px); }
#x02-play-html-btn:active{ transform:translateY(0) scale(.96); box-shadow:0 1px 2px rgba(29,233,182,.4); }
#x02-play-html-btn:focus-visible{ outline:2px solid #8affd9; outline-offset:2px; }
#x02-play-html-btn.x02-loading{ cursor:progress; filter:none; transform:none; opacity:.9; }
#x02-play-html-btn .x02-spin{
  width:11px; height:11px; border:2px solid rgba(5,43,34,.3);
  border-top-color:#052b22; border-radius:50%; display:inline-block;
  animation:x02spin .6s linear infinite;
}
@keyframes x02spin{ to{ transform:rotate(360deg); } }
@keyframes x02fade{ from{ opacity:0; } to{ opacity:1; } }
@keyframes x02pop{ from{ opacity:0; transform:scale(.985); } to{ opacity:1; transform:scale(1); } }
#x02-play-overlay{ animation:x02fade .14s ease both; }
#x02-play-overlay .x02-panel{ animation:x02pop .18s cubic-bezier(.2,.7,.3,1) both; }
#x02-play-overlay .x02-close{ transition:filter .12s ease, transform .08s ease; }
#x02-play-overlay .x02-close:hover{ filter:brightness(1.1); }
#x02-play-overlay .x02-close:active{ transform:scale(.95); }
#x02-play-overlay .x02-loader{
  position:absolute; inset:0; z-index:2;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
  background:#0b0f14; color:#8affd9;
  transition:opacity .3s ease;
}
#x02-play-overlay .x02-loader.x02-done{ opacity:0; pointer-events:none; }
#x02-play-overlay .x02-loader .x02-ring{
  width:44px; height:44px; border-radius:50%;
  border:4px solid rgba(29,233,182,.18); border-top-color:#1DE9B6;
  animation:x02spin .8s linear infinite;
}
#x02-play-overlay .x02-loader .x02-ltext{
  font:600 13px system-ui,-apple-system,sans-serif; letter-spacing:.3px; opacity:.85;
}
#x02-play-overlay .x02-loader .x02-bar{
  position:relative; width:180px; height:4px; border-radius:3px; overflow:hidden;
  background:rgba(29,233,182,.15);
}
#x02-play-overlay .x02-loader .x02-bar::after{
  content:''; position:absolute; top:0; left:-40%; height:100%; width:40%;
  background:linear-gradient(90deg,transparent,#1DE9B6,transparent);
  animation:x02slide 1.1s ease-in-out infinite;
}
@keyframes x02slide{ 0%{ left:-40%; } 100%{ left:100%; } }
#x02-play-overlay .x02-loader .x02-lerr{
  max-width:80%; color:#ffb4b4; font:13px/1.5 monospace; text-align:center;
  white-space:pre-wrap; padding:0 16px;
}
`

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = STYLE_CSS
  document.head.appendChild(s)
}

const PLAY_LABEL = '▶ Play'

function setButtonLoading(btn: HTMLElement, loading: boolean): void {
  const b = btn as HTMLButtonElement
  if (loading) {
    b.classList.add('x02-loading')
    b.disabled = true
    b.innerHTML = '<span class="x02-spin"></span>Opening…'
  } else {
    b.classList.remove('x02-loading')
    b.disabled = false
    b.textContent = PLAY_LABEL
  }
}

function makeButton(): HTMLButtonElement {
  ensureStyles()
  const btn = document.createElement('button')
  btn.id = 'x02-play-html-btn'
  btn.className = 'x02-hidden'
  btn.title = 'Play HTML project in an in-IDE preview'
  btn.textContent = PLAY_LABEL
  btn.addEventListener('click', (e) => { e.preventDefault(); playCurrentHtml() })
  return btn
}

function getButton(): HTMLElement | null { return document.getElementById('x02-play-html-btn') }

function installButton(): boolean {
  if (getButton()) return true
  const runBtn =
    document.querySelector('.run-button') ||
    document.querySelector('#run-button') ||
    document.querySelector('[class*="run-button"]')
  if (runBtn && runBtn.parentElement) {
    runBtn.parentElement.insertBefore(makeButton(), runBtn.nextSibling)
    return true
  }
  return false
}

async function updateVisibility(): Promise<void> {
  const btn = getButton()
  if (!btn) return
  const show = await isHtmlProject(getProjectPath())
  btn.classList.toggle('x02-hidden', !show)
}

function start(): void {
  let tries = 0
  const timer = setInterval(() => {
    tries++
    if (installButton()) { updateVisibility(); clearInterval(timer) }
    else if (tries > 40) clearInterval(timer)
  }, 500)
  window.addEventListener('project-opened', () => { setTimeout(updateVisibility, 300) })
  setInterval(updateVisibility, 4000)
}

if (document.readyState === 'complete') start()
else window.addEventListener('load', start)
