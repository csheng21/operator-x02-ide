// ============================================================================
// JETSON FEATURE 7: Multi-Device Manager
// File: src/jetson/jetsonMultiDevice.ts
// Uses: All SSH commands with per-device connection state
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

interface JetsonDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  model?: string;
  jetpack?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  gpuUsage?: number;
  cpuTemp?: number;
  ramMb?: number;
}

let mdPanel: HTMLElement | null = null;
let mdDevices: JetsonDevice[] = [];
let mdSelectedId: string | null = null;
let mdPollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function genId() { return 'dev-' + Date.now().toString(36); }

function saveDevices() {
  try { localStorage.setItem('x02_md_devices', JSON.stringify(mdDevices)); } catch(_) {}
}

function loadDevices() {
  try {
    const raw = localStorage.getItem('x02_md_devices');
    if (raw) mdDevices = JSON.parse(raw);
  } catch(_) { mdDevices = []; }
  // Reset all statuses on load
  mdDevices.forEach(d => { d.status = 'disconnected'; d.gpuUsage=undefined; d.cpuTemp=undefined; });
}

function renderDeviceList() {
  const list = document.getElementById('jmd-device-list');
  if (!list) return;

  if (mdDevices.length === 0) {
    list.innerHTML = `<div class="jmd-empty">No devices. Click + ADD to add a Jetson.</div>`;
    return;
  }

  list.innerHTML = mdDevices.map(d => {
    const statusColor = d.status==='connected' ? '#76B900' : d.status==='connecting' ? '#ff8800' : d.status==='error' ? '#ff4444' : '#555';
    const statusText = d.status.toUpperCase();
    const isSelected = d.id === mdSelectedId;
    return `
      <div class="jmd-device-row ${isSelected ? 'jmd-selected' : ''}" data-id="${escHtml(d.id)}">
        <div class="jmd-device-indicator" style="background:${statusColor}"></div>
        <div class="jmd-device-info">
          <div class="jmd-device-name">${escHtml(d.name)}</div>
          <div class="jmd-device-addr">${escHtml(d.host)}:${d.port}</div>
        </div>
        <div class="jmd-device-stats">
          ${d.gpuUsage !== undefined ? `<span style="color:#76B900">GPU:${d.gpuUsage}%</span>` : ''}
          ${d.cpuTemp !== undefined ? `<span style="color:#ff8800">${d.cpuTemp}°C</span>` : ''}
        </div>
        <div class="jmd-device-status" style="color:${statusColor}">${statusText}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.jmd-device-row').forEach(row => {
    row.addEventListener('click', () => selectDevice((row as HTMLElement).dataset.id!));
  });
}

function renderDeviceDetail(dev: JetsonDevice | undefined) {
  const detail = document.getElementById('jmd-detail');
  if (!detail) return;

  if (!dev) {
    detail.innerHTML = `<div class="jmd-no-select">Select a device to view details</div>`;
    return;
  }

  const isConn = dev.status === 'connected';
  detail.innerHTML = `
    <div class="jmd-detail-header">
      <div class="jmd-detail-name">${escHtml(dev.name)}</div>
      <div class="jmd-detail-host">${escHtml(dev.host)}:${dev.port} · ${escHtml(dev.username)}</div>
    </div>
    <div class="jmd-detail-stats">
      <div class="jmd-stat"><div class="jmd-stat-l">MODEL</div><div class="jmd-stat-v">${dev.model || '—'}</div></div>
      <div class="jmd-stat"><div class="jmd-stat-l">JETPACK</div><div class="jmd-stat-v">${dev.jetpack || '—'}</div></div>
      <div class="jmd-stat"><div class="jmd-stat-l">GPU UTIL</div><div class="jmd-stat-v" style="color:#76B900">${dev.gpuUsage !== undefined ? dev.gpuUsage + '%' : '—'}</div></div>
      <div class="jmd-stat"><div class="jmd-stat-l">CPU TEMP</div><div class="jmd-stat-v" style="color:#ff8800">${dev.cpuTemp !== undefined ? dev.cpuTemp + '°C' : '—'}</div></div>
      <div class="jmd-stat"><div class="jmd-stat-l">RAM</div><div class="jmd-stat-v">${dev.ramMb !== undefined ? (dev.ramMb/1024).toFixed(1)+'GB' : '—'}</div></div>
    </div>
    <div class="jmd-btn-row">
      ${isConn
        ? `<button class="jmd-action-btn jmd-btn-red" id="jmd-disconnect">DISCONNECT</button>`
        : `<button class="jmd-action-btn jmd-btn-green" id="jmd-connect">CONNECT</button>`}
      <button class="jmd-action-btn" id="jmd-execute-btn">RUN CMD</button>
      <button class="jmd-action-btn jmd-btn-red" id="jmd-remove-btn">REMOVE</button>
    </div>
    <div id="jmd-cmd-area" style="display:${isConn ? '' : 'none'}">
      <div class="jmd-input-row">
        <input class="jmd-input" id="jmd-cmd-input" placeholder="Command to run on this device" />
        <button class="jmd-action-btn jmd-btn-green" id="jmd-run-cmd">▶</button>
      </div>
      <pre id="jmd-cmd-out" class="jmd-cmd-out"></pre>
    </div>
  `;

  detail.querySelector('#jmd-connect')?.addEventListener('click', () => connectDevice(dev.id));
  detail.querySelector('#jmd-disconnect')?.addEventListener('click', () => disconnectDevice(dev.id));
  detail.querySelector('#jmd-remove-btn')?.addEventListener('click', () => removeDevice(dev.id));
  detail.querySelector('#jmd-execute-btn')?.addEventListener('click', () => {
    const area = document.getElementById('jmd-cmd-area');
    if (area) area.style.display = area.style.display === 'none' ? '' : 'none';
  });
  detail.querySelector('#jmd-run-cmd')?.addEventListener('click', async () => {
    const cmd = (document.getElementById('jmd-cmd-input') as HTMLInputElement)?.value.trim();
    const out = document.getElementById('jmd-cmd-out');
    if (!cmd || !out) return;
    out.textContent = 'Running...';
    try {
      const r = await invoke<any>('jetson_execute', { command: cmd });
      out.textContent = r?.output || r?.stdout || String(r || '');
    } catch(e: any) { out.textContent = 'Error: ' + e?.message; }
  });
}

function selectDevice(id: string) {
  mdSelectedId = id;
  renderDeviceList();
  renderDeviceDetail(mdDevices.find(d => d.id === id));
}

async function connectDevice(id: string) {
  const dev = mdDevices.find(d => d.id === id);
  if (!dev) return;

  // Disconnect any existing connection first
  try { await invoke('jetson_disconnect'); } catch(_) {}

  dev.status = 'connecting';
  renderDeviceList();
  if (mdSelectedId === id) renderDeviceDetail(dev);

  try {
    await invoke('jetson_connect', {
      host: dev.host, port: dev.port,
      username: dev.username, password: dev.password,
      authMethod: 'password'
    });
    dev.status = 'connected';

    // Fetch device info
    try {
      const info = await invoke<any>('jetson_device_info');
      dev.model = info?.model?.split(' ').slice(-3).join(' ') || info?.model || '—';
      dev.jetpack = info?.jetpack_version?.split(',')[0] || '—';
      dev.ramMb = info?.ram_total_mb;
    } catch(_) {}

    // Start live polling for this device
    startDevicePoll(id);

  } catch(e: any) {
    dev.status = 'error';
  }

  saveDevices();
  renderDeviceList();
  if (mdSelectedId === id) renderDeviceDetail(dev);
}

async function disconnectDevice(id: string) {
  const dev = mdDevices.find(d => d.id === id);
  if (!dev) return;
  stopDevicePoll(id);
  try { await invoke('jetson_disconnect'); } catch(_) {}
  dev.status = 'disconnected';
  dev.gpuUsage = undefined; dev.cpuTemp = undefined;
  saveDevices();
  renderDeviceList();
  if (mdSelectedId === id) renderDeviceDetail(dev);
}

function startDevicePoll(id: string) {
  stopDevicePoll(id);
  const timer = setInterval(async () => {
    const dev = mdDevices.find(d => d.id === id);
    if (!dev || dev.status !== 'connected') { stopDevicePoll(id); return; }
    try {
      const snap = await invoke<any>('jetson_tegrastats_snapshot');
      dev.gpuUsage = snap?.gpu_usage ?? snap?.gpu_util ?? snap?.gpuUsage ?? 0;
      dev.cpuTemp = snap?.cpu_temp ?? snap?.cpuTemp ?? snap?.cpu_temperature ?? 0;
      dev.ramMb = snap?.ram_used_mb ?? dev.ramMb;
      renderDeviceList();
      if (mdSelectedId === id) {
        const gpuEl = document.querySelector('.jmd-stat-v[style*="76B900"]');
        const tmpEl = document.querySelector('.jmd-stat-v[style*="ff8800"]');
        if (gpuEl) gpuEl.textContent = dev.gpuUsage + '%';
        if (tmpEl) tmpEl.textContent = dev.cpuTemp + '°C';
      }
    } catch(_) {}
  }, 3000);
  mdPollTimers.set(id, timer);
}

function stopDevicePoll(id: string) {
  const t = mdPollTimers.get(id);
  if (t) { clearInterval(t); mdPollTimers.delete(id); }
}

function removeDevice(id: string) {
  if (!confirm('Remove this device?')) return;
  stopDevicePoll(id);
  mdDevices = mdDevices.filter(d => d.id !== id);
  if (mdSelectedId === id) { mdSelectedId = null; renderDeviceDetail(undefined); }
  saveDevices();
  renderDeviceList();
}

function showAddForm() {
  const form = document.getElementById('jmd-add-form');
  if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
}

function addDevice() {
  const name     = (document.getElementById('jmd-add-name') as HTMLInputElement)?.value.trim();
  const host     = (document.getElementById('jmd-add-host') as HTMLInputElement)?.value.trim();
  const port     = parseInt((document.getElementById('jmd-add-port') as HTMLInputElement)?.value) || 22;
  const username = (document.getElementById('jmd-add-user') as HTMLInputElement)?.value.trim();
  const password = (document.getElementById('jmd-add-pass') as HTMLInputElement)?.value;
  if (!name || !host || !username) { alert('Name, host, and username are required'); return; }

  const dev: JetsonDevice = { id: genId(), name, host, port, username, password, status: 'disconnected' };
  mdDevices.push(dev);
  saveDevices();
  renderDeviceList();
  showAddForm();
}

export function openJetsonMultiDevice() {
  if (mdPanel) { mdPanel.style.display = 'flex'; return; }
  loadDevices();

  const panel = document.createElement('div');
  panel.id = 'jmd-panel';
  panel.innerHTML = `
    <style>
      #jmd-panel {
        position:fixed; bottom:60px; right:20px;
        width:620px; height:460px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.15);
        display:flex; flex-direction:column; z-index:10002;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        resize:both; overflow:hidden; min-width:400px; min-height:260px;
      }
      #jmd-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:8px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jmd-titlebar > span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jmd-tbtn { background:none; border:1px solid #333; color:#888; padding:2px 8px; cursor:pointer; font-size:10px; font-family:inherit; letter-spacing:1px; }
      .jmd-tbtn:hover { border-color:#76B900; color:#76B900; }
      #jmd-body { flex:1; display:flex; overflow:hidden; }
      #jmd-sidebar { width:200px; border-right:1px solid #1a1a1a; display:flex; flex-direction:column; flex-shrink:0; }
      #jmd-sidebar-header { padding:8px 10px; border-bottom:1px solid #111; display:flex; align-items:center; justify-content:space-between; }
      #jmd-sidebar-header span { font-size:9px; color:#555; letter-spacing:2px; }
      #jmd-device-list { flex:1; overflow-y:auto; }
      #jmd-device-list::-webkit-scrollbar { width:3px; }
      #jmd-device-list::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jmd-device-row {
        display:flex; align-items:center; gap:8px; padding:8px 10px;
        cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.03);
        transition:background 0.15s;
      }
      .jmd-device-row:hover { background:#0f0f0f; }
      .jmd-device-row.jmd-selected { background:rgba(118,185,0,0.06); border-left:2px solid #76B900; }
      .jmd-device-indicator { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
      .jmd-device-info { flex:1; overflow:hidden; }
      .jmd-device-name { color:#ddd; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .jmd-device-addr { color:#555; font-size:10px; }
      .jmd-device-stats { display:flex; flex-direction:column; gap:2px; font-size:9px; }
      .jmd-device-status { font-size:9px; letter-spacing:1px; flex-shrink:0; }
      .jmd-empty { padding:20px 10px; color:#555; font-size:10px; text-align:center; }
      #jmd-add-form {
        padding:10px; border-top:1px solid #111; font-size:11px; display:none;
        background:#050505;
      }
      .jmd-input { background:#050505; border:1px solid #333; color:#fff; padding:5px 7px; font-family:inherit; font-size:11px; width:100%; outline:none; margin-top:3px; }
      .jmd-input:focus { border-color:#76B900; }
      #jmd-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
      #jmd-detail { flex:1; padding:14px; overflow-y:auto; }
      #jmd-detail::-webkit-scrollbar { width:4px; }
      .jmd-no-select { color:#555; font-size:11px; padding:20px; text-align:center; }
      .jmd-detail-header { margin-bottom:12px; border-bottom:1px solid #1a1a1a; padding-bottom:10px; }
      .jmd-detail-name { color:#fff; font-size:16px; }
      .jmd-detail-host { color:#555; font-size:11px; margin-top:2px; }
      .jmd-detail-stats { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px; }
      .jmd-stat { background:#0a0a0a; border:1px solid #1a1a1a; padding:8px; }
      .jmd-stat-l { font-size:9px; color:#555; letter-spacing:1px; }
      .jmd-stat-v { font-size:14px; color:#ccc; margin-top:3px; }
      .jmd-btn-row { display:flex; gap:6px; margin-bottom:10px; }
      .jmd-action-btn { flex:1; background:none; border:1px solid #333; color:#888; padding:6px; cursor:pointer; font-family:inherit; font-size:10px; letter-spacing:1px; }
      .jmd-action-btn:hover { border-color:#555; color:#ccc; }
      .jmd-btn-green { border-color:#76B900; color:#76B900; }
      .jmd-btn-green:hover { background:rgba(118,185,0,0.1); }
      .jmd-btn-red { border-color:#882200; color:#ff4444; }
      .jmd-btn-red:hover { background:rgba(255,68,68,0.08); }
      .jmd-input-row { display:flex; gap:6px; }
      .jmd-input-row .jmd-input { flex:1; margin:0; }
      .jmd-cmd-out { font-size:10px; color:#888; background:#050505; border:1px solid #111; padding:8px; max-height:100px; overflow-y:auto; margin-top:6px; white-space:pre-wrap; }
    </style>
    <div id="jmd-titlebar">
      <span>MULTI-DEVICE MANAGER</span>
      <button class="jmd-tbtn" id="jmd-close">✕</button>
    </div>
    <div id="jmd-body">
      <div id="jmd-sidebar">
        <div id="jmd-sidebar-header">
          <span>DEVICES</span>
          <button class="jmd-tbtn" id="jmd-add-btn">+ ADD</button>
        </div>
        <div id="jmd-device-list"></div>
        <div id="jmd-add-form">
          <div style="font-size:9px;color:#555;letter-spacing:2px;margin-bottom:8px">ADD DEVICE</div>
          <input class="jmd-input" id="jmd-add-name" placeholder="Name (e.g. Orin Nano #1)" />
          <input class="jmd-input" id="jmd-add-host" placeholder="IP Address" style="margin-top:4px"/>
          <input class="jmd-input" id="jmd-add-port" placeholder="Port (22)" value="22" style="margin-top:4px"/>
          <input class="jmd-input" id="jmd-add-user" placeholder="Username" style="margin-top:4px"/>
          <input class="jmd-input" id="jmd-add-pass" type="password" placeholder="Password" style="margin-top:4px"/>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="jmd-action-btn jmd-btn-green" id="jmd-add-save">SAVE</button>
            <button class="jmd-action-btn" id="jmd-add-cancel">CANCEL</button>
          </div>
        </div>
      </div>
      <div id="jmd-main">
        <div id="jmd-detail"><div class="jmd-no-select">Select a device to view details</div></div>
      </div>
    </div>
  `;

  (document.body || document.documentElement).appendChild(panel);
  mdPanel = panel;

  // Drag
  const tb = panel.querySelector('#jmd-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown',(e:MouseEvent)=>{if((e.target as HTMLElement).tagName==='BUTTON')return;dragging=true;ox=e.clientX-panel.offsetLeft;oy=e.clientY-panel.offsetTop;});
  document.addEventListener('mousemove',(e:MouseEvent)=>{if(!dragging)return;panel.style.left=(e.clientX-ox)+'px';panel.style.top=(e.clientY-oy)+'px';panel.style.bottom='auto';panel.style.right='auto';});
  document.addEventListener('mouseup',()=>{dragging=false;});

  panel.querySelector('#jmd-close')!.addEventListener('click',()=>panel.style.display='none');
  panel.querySelector('#jmd-add-btn')!.addEventListener('click', showAddForm);
  panel.querySelector('#jmd-add-save')!.addEventListener('click', addDevice);
  panel.querySelector('#jmd-add-cancel')!.addEventListener('click', showAddForm);

  renderDeviceList();
}
