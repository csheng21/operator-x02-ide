// src/ide/android/index.ts
// ═══════════════════════════════════════════════════════════════════
// 📱 ANDROID DEVELOPMENT PANEL — Operator X02 Code IDE
// ═══════════════════════════════════════════════════════════════════
// Tabs: Devices | Logcat | Build | 🔌 Bridge (Android + Arduino)
// Keyboard: Ctrl+Shift+D to toggle
// Pattern: Same as ide/arduino/index.ts
// ═══════════════════════════════════════════════════════════════════

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

interface AndroidDevice {
  serial: string;
  state: string;
  model: string;
  product: string;
  transport: string;
  android_version: string;
  api_level: string;
  battery: string;
}

interface LogcatEntry {
  timestamp: string;
  pid: string;
  tid: string;
  level: string;
  tag: string;
  message: string;
}

interface GradleResult {
  stdout: string;
  stderr: string;
  success: boolean;
  apk_path: string | null;
  duration_ms: number;
}

// ============================================================================
// STATE
// ============================================================================

let selectedDevice: AndroidDevice | null = null;
let panelVisible = false;
let panelEl: HTMLElement | null = null;
let currentTab = 'devices';

// ============================================================================
// PANEL CREATION
// ============================================================================

function createPanel(): HTMLElement {
  const p = document.createElement('div');
  p.id = 'android-panel';
  p.style.cssText = `
    position:fixed; right:0; top:40px; bottom:28px; width:420px;
    background:#1e1e1e; border-left:1px solid #333; z-index:9000;
    display:none; flex-direction:column; font-family:'Segoe UI',sans-serif;
    color:#ccc; box-shadow:-2px 0 8px rgba(0,0,0,0.3); overflow:hidden;
  `;

  p.innerHTML = `
    <div id="ap-header" style="display:flex;align-items:center;padding:8px 12px;background:#252526;border-bottom:1px solid #333;">
      <span style="font-size:14px;font-weight:600;flex:1;">📱 Android</span>
      <button id="ap-refresh" title="Refresh" style="background:none;border:none;color:#4fc3f7;cursor:pointer;font-size:15px;padding:2px 6px;">&#x1F504;</button>
      <button id="ap-close" title="Close" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:2px 6px;">&#x2715;</button>
    </div>
    <div id="ap-tabs" style="display:flex;background:#252526;border-bottom:1px solid #333;"></div>
    <div id="ap-body" style="flex:1;overflow-y:auto;padding:8px 12px;"></div>
  `;

  document.body.appendChild(p);

  // Build tabs
  const tabs = [
    { id: 'devices', label: 'Devices' },
    { id: 'logcat', label: 'Logcat' },
    { id: 'build', label: 'Build' },
    { id: 'bridge', label: '\uD83D\uDD0C Bridge' },
  ];
  const tabBar = p.querySelector('#ap-tabs')!;
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'ap-tab';
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    btn.style.cssText = `flex:1;padding:6px 0;background:none;border:none;border-bottom:2px solid ${t.id === 'devices' ? '#4fc3f7' : 'transparent'};color:${t.id === 'devices' ? '#4fc3f7' : '#888'};cursor:pointer;font-size:12px;`;
    btn.addEventListener('click', () => switchTab(t.id));
    tabBar.appendChild(btn);
  });

  p.querySelector('#ap-close')!.addEventListener('click', () => androidPanel.hide());
  p.querySelector('#ap-refresh')!.addEventListener('click', () => {
    if (currentTab === 'devices') refreshDevices();
    else if (currentTab === 'logcat') fetchLogcat();
    else if (currentTab === 'bridge') loadBridgeTab();
  });

  return p;
}

function switchTab(tabId: string) {
  currentTab = tabId;
  panelEl?.querySelectorAll('.ap-tab').forEach(btn => {
    const active = (btn as HTMLElement).dataset.tab === tabId;
    (btn as HTMLElement).style.borderBottomColor = active ? '#4fc3f7' : 'transparent';
    (btn as HTMLElement).style.color = active ? '#4fc3f7' : '#888';
  });

  if (tabId === 'devices') refreshDevices();
  else if (tabId === 'logcat') renderLogcatTab();
  else if (tabId === 'build') renderBuildTab();
  else if (tabId === 'bridge') loadBridgeTab();
}

function body(): HTMLElement { return panelEl?.querySelector('#ap-body') as HTMLElement; }
function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ============================================================================
// DEVICES TAB
// ============================================================================

async function refreshDevices() {
  const b = body(); if (!b) return;
  b.innerHTML = '<div style="color:#4fc3f7;text-align:center;padding:20px;">Scanning devices...</div>';

  try {
    await invoke('android_check_adb');
    const devices = await invoke('android_list_devices') as AndroidDevice[];

    if (devices.length === 0) {
      b.innerHTML = `
        <div style="text-align:center;padding:16px;">
          <div style="font-size:24px;margin-bottom:8px;">📱</div>
          <div style="color:#888;margin-bottom:12px;">No Android devices found</div>
          <div style="font-size:11px;color:#666;line-height:1.7;">
            1. Enable <b>USB Debugging</b> in Developer Options<br>
            2. Connect via USB cable<br>
            3. Accept the prompt on your phone
          </div>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid #333;">
            <div style="font-size:11px;color:#888;margin-bottom:6px;">Wi-Fi Connect:</div>
            <div style="display:flex;gap:4px;">
              <input id="ap-wifi-ip" placeholder="192.168.1.x" style="flex:1;padding:4px 8px;background:#2d2d2d;border:1px solid #444;color:#ccc;border-radius:3px;font-size:12px;"/>
              <button id="ap-wifi-btn" style="padding:4px 10px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:12px;">Connect</button>
            </div>
          </div>
        </div>`;
      document.getElementById('ap-wifi-btn')?.addEventListener('click', doWifiConnect);
      return;
    }

    let html = '';
    for (const d of devices) {
      const sel = selectedDevice?.serial === d.serial;
      const icon = d.state === 'device' ? '\uD83D\uDFE2' : (d.state === 'unauthorized' ? '\uD83D\uDD34' : '\uD83D\uDFE1');
      html += `
        <div class="ap-dev" data-serial="${d.serial}" style="padding:10px;margin-bottom:8px;background:${sel ? '#1a3a4a' : '#2d2d2d'};border:1px solid ${sel ? '#4fc3f7' : '#3e3e3e'};border-radius:4px;cursor:pointer;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span>${icon}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;color:#e0e0e0;">${d.model || d.serial}</div>
              <div style="font-size:11px;color:#888;">${d.serial} &bull; ${d.transport.toUpperCase()}</div>
            </div>
            ${d.battery ? `<span style="font-size:11px;color:#888;">\uD83D\uDD0B ${d.battery}</span>` : ''}
          </div>
          ${d.state === 'device' ? `
            <div style="display:flex;gap:4px;margin-top:6px;">
              <span style="font-size:10px;color:#888;background:#252526;padding:2px 6px;border-radius:3px;">Android ${d.android_version}</span>
              <span style="font-size:10px;color:#888;background:#252526;padding:2px 6px;border-radius:3px;">API ${d.api_level}</span>
            </div>
            <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
              <button class="ap-act" data-a="logcat" data-s="${d.serial}" style="padding:3px 8px;background:#333;border:1px solid #444;color:#ccc;border-radius:3px;cursor:pointer;font-size:11px;">Logcat</button>
              <button class="ap-act" data-a="install" data-s="${d.serial}" style="padding:3px 8px;background:#333;border:1px solid #444;color:#ccc;border-radius:3px;cursor:pointer;font-size:11px;">Install APK</button>
              <button class="ap-act" data-a="screenshot" data-s="${d.serial}" style="padding:3px 8px;background:#333;border:1px solid #444;color:#ccc;border-radius:3px;cursor:pointer;font-size:11px;">Screenshot</button>
            </div>
          ` : ''}
        </div>`;
    }

    html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #333;">
      <div style="font-size:11px;color:#888;margin-bottom:6px;">Wi-Fi Connect:</div>
      <div style="display:flex;gap:4px;">
        <input id="ap-wifi-ip" placeholder="192.168.1.x:5555" style="flex:1;padding:4px 8px;background:#2d2d2d;border:1px solid #444;color:#ccc;border-radius:3px;font-size:12px;"/>
        <button id="ap-wifi-btn" style="padding:4px 10px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:12px;">Connect</button>
      </div>
    </div>`;

    b.innerHTML = html;

    b.querySelectorAll('.ap-dev').forEach(card => {
      card.addEventListener('click', () => {
        const s = (card as HTMLElement).dataset.serial!;
        selectedDevice = devices.find(d => d.serial === s) || null;
        refreshDevices();
      });
    });

    b.querySelectorAll('.ap-act').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.a!;
        const serial = (btn as HTMLElement).dataset.s!;
        if (action === 'logcat') { selectedDevice = devices.find(d => d.serial === serial) || null; switchTab('logcat'); }
        else if (action === 'install') doInstallApk(serial);
        else if (action === 'screenshot') doScreenshot(serial);
      });
    });

    document.getElementById('ap-wifi-btn')?.addEventListener('click', doWifiConnect);

  } catch (e: any) {
    b.innerHTML = `<div style="text-align:center;padding:16px;">
      <div style="color:#f44747;margin-bottom:8px;">ADB not found</div>
      <div style="font-size:11px;color:#888;">Install Android SDK Platform Tools or set ANDROID_HOME</div>
    </div>`;
  }
}

async function doWifiConnect() {
  const ip = (document.getElementById('ap-wifi-ip') as HTMLInputElement)?.value;
  if (!ip) return;
  try { await invoke('android_connect_wireless', { ip }); refreshDevices(); }
  catch (e) { console.error('WiFi connect failed:', e); }
}

async function doInstallApk(serial: string) {
  try {
    const path = await invoke('open_file_dialog_with_path', { defaultPath: null }) as string | null;
    if (path && path.endsWith('.apk')) {
      const r = await invoke('android_install_apk', { deviceId: serial, apkPath: path });
      console.log('Installed:', r);
    }
  } catch (e) { console.error('Install failed:', e); }
}

async function doScreenshot(serial: string) {
  try {
    const home = await invoke('get_app_home_path') as string;
    const path = `${home}\\android_screenshot_${Date.now()}.png`;
    await invoke('android_screenshot', { deviceId: serial, savePath: path });
    console.log('Screenshot saved:', path);
  } catch (e) { console.error('Screenshot failed:', e); }
}

// ============================================================================
// LOGCAT TAB
// ============================================================================

function renderLogcatTab() {
  const b = body(); if (!b) return;
  if (!selectedDevice) { b.innerHTML = '<div style="color:#888;padding:16px;text-align:center;">Select a device in Devices tab first</div>'; return; }

  b.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;">
      <select id="lc-level" style="padding:3px 6px;background:#2d2d2d;border:1px solid #444;color:#ccc;border-radius:3px;font-size:11px;">
        <option value="">All</option><option value="V">Verbose</option><option value="D">Debug</option>
        <option value="I" selected>Info</option><option value="W">Warn</option><option value="E">Error</option>
      </select>
      <input id="lc-filter" placeholder="Filter tag..." style="flex:1;padding:3px 6px;background:#2d2d2d;border:1px solid #444;color:#ccc;border-radius:3px;font-size:11px;"/>
      <button id="lc-go" style="padding:3px 8px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:11px;">Fetch</button>
      <button id="lc-clear" style="padding:3px 8px;background:#333;border:1px solid #444;color:#ccc;border-radius:3px;cursor:pointer;font-size:11px;">Clear</button>
      <button id="lc-ai" style="padding:3px 8px;background:#6a1b9a;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:11px;">AI Analyze</button>
    </div>
    <div id="lc-entries" style="font-family:'Cascadia Code','Fira Code',monospace;font-size:11px;line-height:1.5;background:#1a1a1a;padding:6px;border-radius:3px;max-height:calc(100vh - 220px);overflow-y:auto;">Loading...</div>
  `;

  document.getElementById('lc-go')?.addEventListener('click', fetchLogcat);
  document.getElementById('lc-clear')?.addEventListener('click', async () => {
    if (selectedDevice) { await invoke('android_logcat_clear', { deviceId: selectedDevice.serial }); fetchLogcat(); }
  });
  document.getElementById('lc-ai')?.addEventListener('click', aiAnalyzeErrors);

  fetchLogcat();
}

async function fetchLogcat() {
  if (!selectedDevice) return;
  const el = document.getElementById('lc-entries'); if (!el) return;

  const level = (document.getElementById('lc-level') as HTMLSelectElement)?.value || undefined;
  const filter = (document.getElementById('lc-filter') as HTMLInputElement)?.value || undefined;

  try {
    const entries = await invoke('android_logcat_dump', {
      deviceId: selectedDevice.serial,
      packageFilter: filter || null,
      level: level || null,
      maxLines: 300,
    }) as LogcatEntry[];

    const colors: Record<string,string> = { V:'#888', D:'#4fc3f7', I:'#4ec9b0', W:'#ffd54f', E:'#f44747', F:'#ff1744' };
    el.innerHTML = entries.map(e => {
      const c = colors[e.level] || '#888';
      const bg = (e.level === 'E' || e.level === 'F') ? 'rgba(244,71,71,0.08)' : 'transparent';
      return `<div style="color:${c};background:${bg};padding:1px 4px;white-space:pre-wrap;word-break:break-all;"><span style="color:#666;">${e.timestamp}</span> <b>${e.level}</b> <span style="color:#4fc3f7;">${esc(e.tag)}</span>: ${esc(e.message)}</div>`;
    }).join('') || '<div style="color:#666;">No entries</div>';

    el.scrollTop = el.scrollHeight;
  } catch (e) { el.innerHTML = `<div style="color:#f44747;">Error: ${e}</div>`; }
}

async function aiAnalyzeErrors() {
  if (!selectedDevice) return;
  try {
    const entries = await invoke('android_logcat_dump', { deviceId: selectedDevice.serial, level: 'E', maxLines: 50 }) as LogcatEntry[];
    if (entries.length === 0) { alert('No errors in logcat'); return; }
    const errorText = entries.map(e => `${e.timestamp} ${e.level} ${e.tag}: ${e.message}`).join('\n');
    const addMsg = (window as any).addMessageToChat;
    if (addMsg) { addMsg('user', `Analyze these Android logcat errors and suggest fixes:\n\n\`\`\`\n${errorText}\n\`\`\``); }
  } catch (e) { console.error(e); }
}

// ============================================================================
// BUILD TAB
// ============================================================================

function renderBuildTab() {
  const b = body(); if (!b) return;
  const proj = (window as any).currentFolderPath || '';

  b.innerHTML = `
    <div style="margin-bottom:10px;">
      <div style="font-size:11px;color:#888;margin-bottom:3px;">Project:</div>
      <div style="font-size:12px;color:#ccc;padding:4px 8px;background:#2d2d2d;border-radius:3px;word-break:break-all;">${proj || 'No project open'}</div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
      <button class="gr-btn" data-task="assembleDebug" style="padding:6px 12px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:12px;font-weight:600;">Build Debug</button>
      <button class="gr-btn" data-task="assembleRelease" style="padding:6px 12px;background:#333;border:1px solid #555;color:#ccc;border-radius:3px;cursor:pointer;font-size:12px;">Build Release</button>
      <button class="gr-btn" data-task="clean" style="padding:6px 12px;background:#333;border:1px solid #555;color:#ccc;border-radius:3px;cursor:pointer;font-size:12px;">Clean</button>
    </div>
    ${selectedDevice ? `<button id="ap-run" style="width:100%;padding:8px;background:#388e3c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:13px;font-weight:600;margin-bottom:10px;">
      \uD83D\uDE80 Build + Install + Run on ${selectedDevice.model || selectedDevice.serial}</button>` : '<div style="font-size:11px;color:#666;margin-bottom:10px;">Select a device for Build & Run</div>'}
    <div id="build-out" style="font-family:'Cascadia Code',monospace;font-size:11px;background:#1a1a1a;padding:8px;border-radius:3px;max-height:400px;overflow-y:auto;color:#888;">Ready</div>
  `;

  b.querySelectorAll('.gr-btn').forEach(btn => {
    btn.addEventListener('click', () => runGradle(proj, (btn as HTMLElement).dataset.task || 'assembleDebug'));
  });

  document.getElementById('ap-run')?.addEventListener('click', async () => {
    if (!selectedDevice || !proj) return;
    const out = document.getElementById('build-out');
    if (out) out.innerHTML = '<span style="color:#4fc3f7;">Building, installing, launching...</span>';
    try {
      const r = await invoke('android_build_and_run', { projectPath: proj, deviceId: selectedDevice.serial, buildType: 'debug' }) as string;
      if (out) out.innerHTML = `<span style="color:#4ec9b0;">${esc(r)}</span>`;
    } catch (e) { if (out) out.innerHTML = `<span style="color:#f44747;">${esc(String(e))}</span>`; }
  });
}

async function runGradle(proj: string, task: string) {
  const out = document.getElementById('build-out'); if (!out || !proj) return;
  out.innerHTML = `<span style="color:#4fc3f7;">gradle ${task}...</span>`;
  try {
    const r = await invoke('android_gradle_build', { projectPath: proj, task }) as GradleResult;
    let h = r.success
      ? `<div style="color:#4ec9b0;font-weight:bold;">BUILD SUCCESS (${(r.duration_ms/1000).toFixed(1)}s)</div>`
      : `<div style="color:#f44747;font-weight:bold;">BUILD FAILED</div>`;
    if (r.apk_path) h += `<div style="color:#888;margin-top:4px;">APK: ${r.apk_path}</div>`;
    h += `<pre style="color:#888;margin-top:8px;white-space:pre-wrap;">${esc(r.stdout.slice(-2000))}</pre>`;
    if (r.stderr) h += `<pre style="color:#f44747;white-space:pre-wrap;">${esc(r.stderr.slice(-1000))}</pre>`;
    out.innerHTML = h;
  } catch (e) { out.innerHTML = `<span style="color:#f44747;">${esc(String(e))}</span>`; }
}

// ============================================================================
// 🔌 BRIDGE TAB (Android + Arduino)
// ============================================================================

async function loadBridgeTab() {
  const b = body(); if (!b) return;
  b.innerHTML = '<div style="color:#4fc3f7;text-align:center;padding:20px;">Checking bridge...</div>';

  try {
    const s = await invoke('android_arduino_bridge_status') as any;

    b.innerHTML = `
      <div style="text-align:center;padding:12px 0;">
        <div style="font-size:32px;margin-bottom:4px;">\uD83D\uDD0C</div>
        <div style="font-size:14px;font-weight:600;color:#e0e0e0;">Android + Arduino Bridge</div>
        <div style="font-size:11px;color:#888;">Build both sides of your IoT project</div>
      </div>

      <div style="display:flex;gap:8px;margin:12px 0;">
        <div style="flex:1;padding:10px;background:#2d2d2d;border-radius:4px;text-align:center;">
          <div style="font-size:22px;">${s.android_devices > 0 ? '\uD83D\uDCF1' : '\uD83D\uDCF1\u274C'}</div>
          <div style="font-size:11px;color:${s.android_devices > 0 ? '#4ec9b0' : '#888'};margin-top:4px;">
            ${s.android_devices} Android</div>
        </div>
        <div style="flex:1;padding:10px;background:#2d2d2d;border-radius:4px;text-align:center;">
          <div style="font-size:22px;">${s.arduino_cli_available ? '\uD83D\uDD0C' : '\uD83D\uDD0C\u274C'}</div>
          <div style="font-size:11px;color:${s.arduino_cli_available ? '#4ec9b0' : '#888'};margin-top:4px;">
            Arduino CLI ${s.arduino_cli_available ? 'Ready' : 'Missing'}</div>
        </div>
      </div>

      <div style="padding:10px;background:${s.bridge_ready ? '#1b3a2a' : '#3a1b1b'};border:1px solid ${s.bridge_ready ? '#4ec9b0' : '#f44747'};border-radius:4px;text-align:center;margin-bottom:14px;">
        <div style="font-size:13px;font-weight:600;color:${s.bridge_ready ? '#4ec9b0' : '#f44747'};">
          ${s.bridge_ready ? 'Bridge Ready!' : 'Connect both devices'}</div>
      </div>

      ${s.bridge_ready ? `
      <div style="font-size:12px;font-weight:600;color:#e0e0e0;margin-bottom:8px;">Quick Actions</div>
      <button id="br-project" style="width:100%;padding:8px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:12px;margin-bottom:6px;">
        Create Android + Arduino Project</button>
      <button id="br-reverse" style="width:100%;padding:8px;background:#333;border:1px solid #555;color:#ccc;border-radius:3px;cursor:pointer;font-size:12px;margin-bottom:6px;">
        Reverse Port (Android reaches PC serial)</button>
      <button id="br-forward" style="width:100%;padding:8px;background:#333;border:1px solid #555;color:#ccc;border-radius:3px;cursor:pointer;font-size:12px;">
        Forward Port (PC reaches Android)</button>
      ` : ''}

      <div style="margin-top:16px;padding:10px;background:#252526;border-radius:4px;">
        <div style="font-size:12px;font-weight:600;color:#e0e0e0;margin-bottom:6px;">How it works</div>
        <div style="font-size:11px;color:#888;line-height:1.7;">
          <b style="color:#4fc3f7;">Arduino</b> reads sensors &rarr; sends via Serial<br>
          <b style="color:#4fc3f7;">PC (X02)</b> receives serial data + builds both<br>
          <b style="color:#4fc3f7;">Android app</b> connects via USB/BLE/TCP<br><br>
          Use <code style="background:#333;padding:1px 4px;border-radius:2px;">adb reverse</code> so Android app reaches<br>
          the PC serial server on localhost.
        </div>
      </div>
    `;

    document.getElementById('br-project')?.addEventListener('click', () => {
      const addMsg = (window as any).addMessageToChat;
      if (addMsg) {
        addMsg('user', 'Create an Android + Arduino IoT bridge project with: 1) Arduino sketch reading DHT22 temperature sensor via Serial JSON, 2) Android Kotlin app with Compose UI showing live sensor data via USB serial, 3) Shared JSON protocol definition.');
      }
    });
    document.getElementById('br-reverse')?.addEventListener('click', async () => {
      if (!selectedDevice) { alert('Select Android device in Devices tab first'); return; }
      try {
        const r = await invoke('android_reverse_port', { deviceId: selectedDevice.serial, devicePort: 8080, localPort: 8080 });
        console.log('Reverse port:', r);
        alert('Reverse port set: device:8080 -> localhost:8080');
      } catch (e) { alert('Failed: ' + e); }
    });
    document.getElementById('br-forward')?.addEventListener('click', async () => {
      if (!selectedDevice) { alert('Select Android device in Devices tab first'); return; }
      try {
        const r = await invoke('android_forward_port', { deviceId: selectedDevice.serial, localPort: 8080, remotePort: 8080 });
        console.log('Forward port:', r);
        alert('Forward port set: localhost:8080 -> device:8080');
      } catch (e) { alert('Failed: ' + e); }
    });

  } catch (e) { b.innerHTML = `<div style="color:#f44747;padding:12px;">Error: ${e}</div>`; }
}

// ============================================================================
// PUBLIC API (matches arduinoPanel pattern)
// ============================================================================

export const androidPanel = {
  show() {
    if (!panelEl) panelEl = createPanel();
    panelEl.style.display = 'flex';
    panelVisible = true;
    refreshDevices();
  },
  hide() {
    if (panelEl) panelEl.style.display = 'none';
    panelVisible = false;
  },
  toggle() { if (panelVisible) this.hide(); else this.show(); },
  isVisible() { return panelVisible; },
  getSelectedDevice() { return selectedDevice; },
};

export function initializeAndroid() {
  console.log('📱 Android panel initialized (Ctrl+Shift+D to toggle)');
  (window as any).androidPanel = androidPanel;
}
