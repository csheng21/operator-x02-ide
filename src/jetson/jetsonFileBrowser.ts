// ============================================================================
// JETSON FEATURE 2: Remote File Browser
// File: src/jetson/jetsonFileBrowser.ts
// Uses: jetson_execute to ls/download/delete remote files
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

interface RemoteFile {
  name: string;
  isDir: boolean;
  size: string;
  perms: string;
  modified: string;
}

let fbPanel: HTMLElement | null = null;
let fbCurrentPath = '/home/orin_nano';
let fbHistory: string[] = ['/home/orin_nano'];
let fbHistIdx = 0;

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatSize(bytes: string): string {
  const n = parseInt(bytes) || 0;
  if (n < 1024) return `${n}B`;
  if (n < 1048576) return `${(n/1024).toFixed(1)}K`;
  return `${(n/1048576).toFixed(1)}M`;
}

function getFileIcon(f: RemoteFile): string {
  if (f.isDir) return '▶';
  const ext = f.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string,string> = {
    cu:'⚡', py:'●', cpp:'◆', c:'◆', h:'◈', sh:'❯', txt:'≡',
    md:'≡', json:'{}', onnx:'🧠', trt:'⚡', jpg:'🖼', png:'🖼',
    log:'≡', yaml:'≡', toml:'≡',
  };
  return map[ext] || '□';
}

function getFileColor(f: RemoteFile): string {
  if (f.isDir) return '#76B900';
  const ext = f.name.split('.').pop()?.toLowerCase() || '';
  if (['cu','cuh'].includes(ext)) return '#00ddcc';
  if (['py'].includes(ext)) return '#ffda44';
  if (['cpp','c','h','hpp'].includes(ext)) return '#88aaff';
  if (['sh'].includes(ext)) return '#ffaa44';
  if (['onnx','trt'].includes(ext)) return '#aa66ff';
  return '#cccccc';
}

async function listDirectory(path: string) {
  setStatus('Loading...');
  try {
    const result = await invoke<any>('jetson_execute', {
      command: `ls -la --time-style=+"%Y-%m-%d" "${path}" 2>&1`
    });
    const raw: string = result?.output || result?.stdout || typeof result === 'string' ? result : JSON.stringify(result ?? '');
    const files = parseLS(raw, path);
    renderFiles(files, path);
    setStatus(`${files.length} items · ${path}`);
  } catch(e: any) {
    setStatus('Error: ' + (e?.message || String(e)));
    renderFiles([], path);
  }
}

function parseLS(raw: string, _path: string): RemoteFile[] {
  const files: RemoteFile[] = [];
  const lines = String(raw).split('\n').filter(l => l.trim() && !l.startsWith('total'));
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;
    const name = parts.slice(8).join(' ');
    if (name === '.' || name === '..') continue;
    files.push({
      name,
      isDir: parts[0].startsWith('d'),
      perms: parts[0],
      size: parts[4],
      modified: parts[6] || '',
    });
  }
  return files.sort((a,b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function renderFiles(files: RemoteFile[], path: string) {
  const list = document.getElementById('jfb-list');
  if (!list) return;

  const pathParts = path.split('/').filter(Boolean);

  // Breadcrumb
  const bc = document.getElementById('jfb-breadcrumb');
  if (bc) {
    bc.innerHTML = '<span class="jfb-bc-root" data-path="/">/</span>' +
      pathParts.map((p, i) => {
        const fp = '/' + pathParts.slice(0, i+1).join('/');
        return `<span class="jfb-bc-sep">›</span><span class="jfb-bc-item" data-path="${escHtml(fp)}">${escHtml(p)}</span>`;
      }).join('');
    bc.querySelectorAll('[data-path]').forEach(el => {
      el.addEventListener('click', () => {
        const p = (el as HTMLElement).dataset.path!;
        navigateTo(p);
      });
    });
  }

  if (files.length === 0) {
    list.innerHTML = '<div class="jfb-empty">Empty directory</div>';
    return;
  }

  list.innerHTML = files.map(f => `
    <div class="jfb-row ${f.isDir ? 'jfb-dir' : 'jfb-file'}" data-name="${escHtml(f.name)}" data-isdir="${f.isDir}">
      <span class="jfb-icon" style="color:${getFileColor(f)}">${getFileIcon(f)}</span>
      <span class="jfb-name" style="color:${getFileColor(f)}">${escHtml(f.name)}</span>
      <span class="jfb-date">${f.modified}</span>
      <span class="jfb-size">${f.isDir ? '—' : formatSize(f.size)}</span>
      <span class="jfb-perms">${f.perms}</span>
    </div>
  `).join('');

  list.querySelectorAll('.jfb-row').forEach(row => {
    row.addEventListener('dblclick', async () => {
      const name = (row as HTMLElement).dataset.name!;
      const isDir = (row as HTMLElement).dataset.isdir === 'true';
      if (isDir) navigateTo(fbCurrentPath.replace(/\/$/, '') + '/' + name);
      else openFile(fbCurrentPath + '/' + name);
    });
    row.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault();
      const name = (row as HTMLElement).dataset.name!;
      const isDir = (row as HTMLElement).dataset.isdir === 'true';
      showContextMenu(e as MouseEvent, fbCurrentPath + '/' + name, isDir);
    });
  });
}

async function openFile(remotePath: string) {
  try {
    const result = await invoke<any>('jetson_execute', {
      command: `cat "${remotePath}" 2>&1 | head -200`
    });
    const content = result?.output || result?.stdout || typeof result === 'string' ? result : JSON.stringify(result ?? '');
    showFilePreview(remotePath, content);
  } catch(e: any) {
    setStatus('Cannot read file: ' + remotePath);
  }
}

function showFilePreview(path: string, content: string) {
  const existing = document.getElementById('jfb-preview');
  if (existing) existing.remove();

  const preview = document.createElement('div');
  preview.id = 'jfb-preview';
  preview.innerHTML = `
    <div class="jfb-preview-header">
      <span>${escHtml(path.split('/').pop() || path)}</span>
      <button onclick="document.getElementById('jfb-preview').remove()">✕</button>
    </div>
    <pre class="jfb-preview-content">${escHtml(content)}</pre>
  `;
  document.getElementById('jfb-panel')?.appendChild(preview);
}

function showContextMenu(e: MouseEvent, path: string, isDir: boolean) {
  const existing = document.getElementById('jfb-ctxmenu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'jfb-ctxmenu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;
    background:#111;border:1px solid #76B900;z-index:10001;
    font-family:'JetBrains Mono',monospace;font-size:11px;min-width:160px;`;

  const items = isDir
    ? [['Open', () => navigateTo(path)], ['Delete Folder', () => deleteRemote(path, true)]]
    : [['View', () => openFile(path)], ['Download', () => downloadFile(path)], ['Delete', () => deleteRemote(path, false)]];

  items.forEach(([label, action]) => {
    const item = document.createElement('div');
    item.textContent = label as string;
    item.style.cssText = 'padding:8px 14px;cursor:pointer;color:#ccc;';
    item.addEventListener('mouseover', () => item.style.background = 'rgba(118,185,0,0.1)');
    item.addEventListener('mouseout', () => item.style.background = '');
    item.addEventListener('click', () => { menu.remove(); (action as Function)(); });
    menu.appendChild(item);
  });

  (document.body || document.documentElement).appendChild(menu);
  document.addEventListener('click', () => menu.remove(), { once: true });
}

async function deleteRemote(path: string, isDir: boolean) {
  if (!confirm(`Delete ${isDir ? 'folder' : 'file'}: ${path}?`)) return;
  try {
    const cmd = isDir ? `rm -rf "${path}"` : `rm "${path}"`;
    await invoke('jetson_execute', { command: cmd });
    await listDirectory(fbCurrentPath);
  } catch(e: any) { setStatus('Delete failed: ' + e?.message); }
}

async function downloadFile(remotePath: string) {
  setStatus('Downloading ' + remotePath.split('/').pop() + '...');
  try {
    const result = await invoke<any>('jetson_execute', {
      command: `base64 "${remotePath}"`
    });
    const b64 = result?.output || result?.stdout || '';
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = remotePath.split('/').pop() || 'file';
    a.click();
    setStatus('Downloaded: ' + a.download);
  } catch(e: any) { setStatus('Download failed: ' + e?.message); }
}

function navigateTo(path: string) {
  fbCurrentPath = path;
  if (fbHistory[fbHistIdx] !== path) {
    fbHistory = fbHistory.slice(0, fbHistIdx + 1);
    fbHistory.push(path);
    fbHistIdx = fbHistory.length - 1;
  }
  updateNavButtons();
  listDirectory(path);
}

function updateNavButtons() {
  const back = document.getElementById('jfb-back') as HTMLButtonElement;
  const fwd = document.getElementById('jfb-fwd') as HTMLButtonElement;
  if (back) back.disabled = fbHistIdx <= 0;
  if (fwd) fwd.disabled = fbHistIdx >= fbHistory.length - 1;
}

function setStatus(msg: string) {
  const s = document.getElementById('jfb-status');
  if (s) s.textContent = msg;
}

export function openJetsonFileBrowser() {
  if (fbPanel) {
    fbPanel.style.display = 'flex';
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'jfb-panel';
  panel.innerHTML = `
    <style>
      #jfb-panel {
        position:fixed; top:60px; right:20px;
        width:520px; height:500px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.15);
        display:flex; flex-direction:column; z-index:10001;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        resize:both; overflow:hidden; min-width:320px; min-height:200px;
      }
      #jfb-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:8px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jfb-titlebar > span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jfb-tbtn { background:none; border:1px solid #333; color:#888; width:20px; height:20px; cursor:pointer; font-size:10px; }
      .jfb-tbtn:hover { border-color:#76B900; color:#76B900; }
      .jfb-tbtn:disabled { opacity:0.3; cursor:default; }
      #jfb-toolbar {
        display:flex; align-items:center; gap:6px; padding:6px 10px;
        border-bottom:1px solid #1a2200; background:#0a0a0a; flex-shrink:0;
      }
      #jfb-breadcrumb {
        flex:1; color:#888; font-size:11px; display:flex; align-items:center; flex-wrap:wrap; gap:2px;
      }
      .jfb-bc-root,.jfb-bc-item { cursor:pointer; color:#76B900; }
      .jfb-bc-root:hover,.jfb-bc-item:hover { text-decoration:underline; }
      .jfb-bc-sep { color:#444; }
      #jfb-list { flex:1; overflow-y:auto; padding:4px 0; }
      #jfb-list::-webkit-scrollbar { width:4px; }
      #jfb-list::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jfb-row {
        display:grid; grid-template-columns:20px 1fr 80px 60px 90px;
        align-items:center; gap:6px; padding:5px 10px;
        cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.03);
      }
      .jfb-row:hover { background:rgba(118,185,0,0.06); }
      .jfb-icon { font-size:11px; text-align:center; }
      .jfb-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .jfb-date,.jfb-size,.jfb-perms { color:#555; font-size:10px; text-align:right; }
      .jfb-empty { padding:30px; color:#555; text-align:center; }
      #jfb-status { padding:4px 10px; font-size:10px; color:#555; border-top:1px solid #111; flex-shrink:0; letter-spacing:1px; }
      #jfb-preview {
        position:absolute; bottom:30px; left:0; right:0;
        background:#0a0a0a; border-top:1px solid #76B900; max-height:50%; overflow:hidden; display:flex; flex-direction:column;
      }
      .jfb-preview-header {
        padding:6px 10px; background:#0f1a00; display:flex; justify-content:space-between; align-items:center;
        color:#76B900; font-size:10px; letter-spacing:1px; border-bottom:1px solid #2a3a00; flex-shrink:0;
      }
      .jfb-preview-header button { background:none; border:none; color:#888; cursor:pointer; }
      .jfb-preview-content { flex:1; overflow:auto; padding:10px; color:#aaa; font-size:11px; line-height:1.6; white-space:pre; margin:0; }
    </style>
    <div id="jfb-titlebar">
      <span>REMOTE FILE BROWSER</span>
      <button class="jfb-tbtn" id="jfb-close" title="Close">✕</button>
    </div>
    <div id="jfb-toolbar">
      <button class="jfb-tbtn" id="jfb-back" title="Back">←</button>
      <button class="jfb-tbtn" id="jfb-fwd" title="Forward">→</button>
      <button class="jfb-tbtn" id="jfb-up" title="Up">↑</button>
      <button class="jfb-tbtn" id="jfb-home" title="Home">⌂</button>
      <button class="jfb-tbtn" id="jfb-refresh" title="Refresh">↺</button>
      <div id="jfb-breadcrumb"></div>
    </div>
    <div id="jfb-list"></div>
    <div id="jfb-status">Loading...</div>
  `;

  (document.body || document.documentElement).appendChild(panel);
  fbPanel = panel;

  // Drag
  const tb = panel.querySelector('#jfb-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown', (e:MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    dragging=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop;
  });
  document.addEventListener('mousemove', (e:MouseEvent) => {
    if (!dragging) return;
    panel.style.left=(e.clientX-ox)+'px'; panel.style.top=(e.clientY-oy)+'px';
    panel.style.right='auto';
  });
  document.addEventListener('mouseup', () => { dragging=false; });

  panel.querySelector('#jfb-close')!.addEventListener('click', () => panel.style.display='none');
  panel.querySelector('#jfb-back')!.addEventListener('click', () => {
    if (fbHistIdx > 0) { fbHistIdx--; navigateTo(fbHistory[fbHistIdx]); }
  });
  panel.querySelector('#jfb-fwd')!.addEventListener('click', () => {
    if (fbHistIdx < fbHistory.length-1) { fbHistIdx++; navigateTo(fbHistory[fbHistIdx]); }
  });
  panel.querySelector('#jfb-up')!.addEventListener('click', () => {
    const parent = fbCurrentPath.split('/').slice(0,-1).join('/') || '/';
    navigateTo(parent);
  });
  panel.querySelector('#jfb-home')!.addEventListener('click', () => navigateTo('/home/orin_nano'));
  panel.querySelector('#jfb-refresh')!.addEventListener('click', () => listDirectory(fbCurrentPath));

  updateNavButtons();
  listDirectory(fbCurrentPath);
}