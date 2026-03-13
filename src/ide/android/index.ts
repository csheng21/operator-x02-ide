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
  // Inject animations stylesheet (once)
  if (!document.getElementById('ap-animations')) {
    const style = document.createElement('style');
    style.id = 'ap-animations';
    style.textContent = `
      @keyframes apSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      @keyframes apPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      @keyframes apSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      @keyframes apScanLine { 0% { left:-40%; } 100% { left:140%; } }
      @keyframes apFadeCard { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
      @keyframes apBattPulse { 0%,100% { opacity:0.8; } 50% { opacity:1; } }
      @keyframes apGlow { 0%,100% { box-shadow:0 0 0 0 rgba(79,195,247,0); } 50% { box-shadow:0 0 12px 2px rgba(79,195,247,0.15); } }
      #android-panel { animation: apSlideUp 0.3s ease; }
      #android-panel .ap-tab { transition: all 0.25s ease; position:relative; }
      #android-panel .ap-tab:hover { color:#4fc3f7 !important; background:rgba(79,195,247,0.06); }
      #android-panel .ap-tab::after { content:''; position:absolute; bottom:0; left:50%; width:0; height:2px; background:#4fc3f7; transition:all 0.3s ease; transform:translateX(-50%); border-radius:1px; }
      #android-panel .ap-tab[data-active="true"]::after { width:60%; }
      #android-panel .ap-dev-card { animation: apFadeCard 0.35s ease both; transition: all 0.2s ease; }
      #android-panel .ap-dev-card:hover { border-color:#4fc3f7 !important; transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.3); }
      #android-panel .ap-action-btn { transition: all 0.2s ease; position:relative; overflow:hidden; }
      #android-panel .ap-action-btn:hover { transform:translateY(-1px); filter:brightness(1.2); box-shadow:0 2px 8px rgba(0,0,0,0.3); }
      #android-panel .ap-action-btn:active { transform:scale(0.96); }
      #android-panel .ap-header-btn { transition: all 0.2s ease; border-radius:6px; }
      #android-panel .ap-header-btn:hover { background:rgba(255,255,255,0.08); }
      #ap-body::-webkit-scrollbar { width:5px; }
      #ap-body::-webkit-scrollbar-track { background:transparent; }
      #ap-body::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
      #ap-body::-webkit-scrollbar-thumb:hover { background:#555; }
    `;
    document.head.appendChild(style);
  }

  const p = document.createElement('div');
  p.id = 'android-panel';
  p.style.cssText = `
    position:fixed; left:16px; bottom:16px; width:390px; height:52vh;
    background:#161618; border:1px solid rgba(255,255,255,0.08); z-index:9000;
    display:none; flex-direction:column; font-family:'Segoe UI',system-ui,sans-serif;
    color:#d0d0d0; box-shadow:0 12px 48px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.03); overflow:hidden;
    border-radius:12px; resize:both; min-width:340px; min-height:300px; backdrop-filter:blur(8px);
  `;

  p.innerHTML = `
    <div id="ap-header" style="display:flex;align-items:center;padding:8px 12px;background:linear-gradient(180deg,#1e1e22,#1a1a1e);border-bottom:1px solid rgba(255,255,255,0.06);border-radius:12px 12px 0 0;cursor:move;user-select:none;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <div style="width:28px;height:28px;background:linear-gradient(135deg,#1a73e8,#4fc3f7);border-radius:7px;display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
        </div>
        <span style="font-size:13px;font-weight:700;color:#e8e8ec;letter-spacing:-0.2px;">Android</span>
      </div>
      <button id="ap-refresh" title="Refresh" class="ap-header-btn" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:14px;padding:4px 7px;line-height:1;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M2.5 11.5a10 10 0 0118.8-4.3M21.5 12.5a10 10 0 01-18.8 4.3"/></svg>
      </button>
      <button id="ap-close" title="Close" class="ap-header-btn" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:14px;padding:4px 7px;line-height:1;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div id="ap-tabs" style="display:flex;background:#161618;border-bottom:1px solid rgba(255,255,255,0.06);padding:0 4px;"></div>
    <div id="ap-body" style="flex:1;overflow-y:auto;padding:10px 12px;background:#131315;"></div>
  `;

  document.body.appendChild(p);

  // Build tabs with icons
  const tabs = [
    { id: 'devices', label: 'Devices', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>' },
    { id: 'logcat', label: 'Logcat', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    { id: 'build', label: 'Build', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>' },
    { id: 'bridge', label: 'Bridge', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 20V10M6 20V10M2 10h20M12 4v6"/><circle cx="12" cy="4" r="2"/></svg>' },
  ];
  const tabBar = p.querySelector('#ap-tabs')!;
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'ap-tab';
    btn.dataset.tab = t.id;
    btn.dataset.active = t.id === 'devices' ? 'true' : 'false';
    btn.innerHTML = `<span style="display:flex;align-items:center;gap:5px;justify-content:center;">${t.icon}<span>${t.label}</span></span>`;
    btn.style.cssText = `flex:1;padding:8px 0;background:none;border:none;border-bottom:none;color:${t.id === 'devices' ? '#4fc3f7' : '#6b7280'};cursor:pointer;font-size:11.5px;font-weight:${t.id === 'devices' ? '600' : '500'};letter-spacing:0.2px;`;
    btn.addEventListener('click', () => switchTab(t.id));
    tabBar.appendChild(btn);
  });

  p.querySelector('#ap-close')!.addEventListener('click', () => androidPanel.hide());
  p.querySelector('#ap-refresh')!.addEventListener('click', () => {
    // Spin animation on refresh
    const refreshBtn = p.querySelector('#ap-refresh') as HTMLElement;
    if (refreshBtn) { refreshBtn.style.animation = 'apSpin 0.6s ease'; setTimeout(() => refreshBtn.style.animation = '', 600); }
    if (currentTab === 'devices') refreshDevices();
    else if (currentTab === 'logcat') fetchLogcat();
    else if (currentTab === 'bridge') loadBridgeTab();
  });

  // Draggable
  let isDragging=false,dragX=0,dragY=0;
  p.querySelector('#ap-header')!.addEventListener('mousedown',(e:any)=>{
    if((e.target as HTMLElement).tagName==='BUTTON'||(e.target as HTMLElement).closest('button'))return;
    isDragging=true;
    dragX=e.clientX-p.getBoundingClientRect().left;
    dragY=e.clientY-p.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove',(e:MouseEvent)=>{
    if(!isDragging)return;
    p.style.left=Math.max(0,e.clientX-dragX)+'px';
    p.style.top=Math.max(0,e.clientY-dragY)+'px';
    p.style.right='auto';
    p.style.transform='none';
  });
  document.addEventListener('mouseup',()=>{isDragging=false;});

  return p;
}

function switchTab(tabId: string) {
  currentTab = tabId;
  panelEl?.querySelectorAll('.ap-tab').forEach(btn => {
    const active = (btn as HTMLElement).dataset.tab === tabId;
    (btn as HTMLElement).dataset.active = active ? 'true' : 'false';
    (btn as HTMLElement).style.color = active ? '#4fc3f7' : '#6b7280';
    (btn as HTMLElement).style.fontWeight = active ? '600' : '500';
  });

  // Remove mirror toolbar when switching away from devices tab
  if (tabId !== 'devices') { const mt = document.getElementById('mirror-ai-toolbar'); if (mt) mt.remove(); }

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
  b.innerHTML = `<div style="text-align:center;padding:28px 16px;">
    <div style="width:40px;height:40px;margin:0 auto 12px;border:2px solid #333;border-top-color:#4fc3f7;border-radius:50%;animation:apSpin 0.8s linear infinite;"></div>
    <div style="font-size:12px;color:#6b7280;font-weight:500;">Scanning devices...</div>
  </div>`;

  try {
    await invoke('android_check_adb');
    const devices = await invoke('android_list_devices') as AndroidDevice[];

    if (devices.length === 0) {
      b.innerHTML = `
        <div style="text-align:center;padding:20px 12px;">
          <div style="width:56px;height:56px;margin:0 auto 14px;background:linear-gradient(135deg,#1a2a3a,#1a1a2e);border:1px solid rgba(79,195,247,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
          </div>
          <div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:4px;">No devices found</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Connect your Android device to get started</div>

          <div style="text-align:left;padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
            <div style="font-size:11px;font-weight:600;color:#4fc3f7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Setup Guide</div>
            <div style="font-size:11.5px;color:#b0b0b0;line-height:2.2;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">1</span> Connect phone via <b style="color:#e0e0e0;">USB cable</b></div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">2</span> Enable <b style="color:#e0e0e0;">Developer Mode</b></div>
              <div style="padding-left:28px;font-size:10px;color:#555;line-height:1.6;">Settings &rarr; About Phone &rarr; Tap Build Number 7x</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">3</span> Enable <b style="color:#e0e0e0;">USB Debugging</b></div>
              <div style="padding-left:28px;font-size:10px;color:#555;line-height:1.6;">Developer Options &rarr; USB Debugging ON</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">4</span> Tap <b style="color:#e0e0e0;">Allow</b> on phone popup</div>
            </div>
          </div>

          <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Wi-Fi Connect</div>
            <div style="display:flex;gap:6px;">
              <input id="ap-wifi-ip" placeholder="192.168.1.x:5555" style="flex:1;padding:7px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#d0d0d0;border-radius:7px;font-size:12px;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='rgba(79,195,247,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'" />
              <button id="ap-wifi-btn" style="padding:7px 14px;background:linear-gradient(135deg,#0e639c,#1a73e8);border:none;color:#fff;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.filter='brightness(1.15)'" onmouseout="this.style.filter='brightness(1)'">Connect</button>
            </div>
          </div>
        </div>`;
      document.getElementById('ap-wifi-btn')?.addEventListener('click', doWifiConnect);
      return;
    }

    let html = '';
    for (let idx = 0; idx < devices.length; idx++) {
      const d = devices[idx];
      const sel = selectedDevice?.serial === d.serial;
      const isOnline = d.state === 'device';
      const statusColor = isOnline ? '#4ec9b0' : (d.state === 'unauthorized' ? '#f44747' : '#e8a838');
      const statusLabel = isOnline ? 'Connected' : (d.state === 'unauthorized' ? 'Unauthorized' : d.state);
      const battNum = parseInt(d.battery) || 0;
      const battColor = battNum > 60 ? '#4ec9b0' : (battNum > 20 ? '#e8a838' : '#f44747');

      // Build device footer based on state
      let deviceFooter = '';
      if (isOnline && sel) {
        deviceFooter = '<div style="display:flex;align-items:center;gap:8px;padding:0 14px 8px;">' +
          '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:' + statusColor + ';"><span style="width:6px;height:6px;background:' + statusColor + ';border-radius:50%;animation:apBattPulse 2s ease infinite;"></span> ' + statusLabel + '</span>' +
          '<span style="width:1px;height:10px;background:rgba(255,255,255,0.08);"></span>' +
          '<span style="font-size:10px;color:#555;">Android ' + d.android_version + '</span>' +
          '<span style="width:1px;height:10px;background:rgba(255,255,255,0.08);"></span>' +
          '<span style="font-size:10px;color:#555;">API ' + d.api_level + '</span></div>' +
          '<div style="padding:8px 14px 12px;background:rgba(255,255,255,0.015);border-top:1px solid rgba(255,255,255,0.04);"><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button class="ap-act ap-action-btn" data-a="logcat" data-s="' + d.serial + '" style="padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#d0d0d8;border-radius:7px;cursor:pointer;font-size:10.5px;font-weight:600;display:flex;align-items:center;gap:5px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Logcat</button>' +
          '<button class="ap-act ap-action-btn" data-a="install" data-s="' + d.serial + '" style="padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#d0d0d8;border-radius:7px;cursor:pointer;font-size:10.5px;font-weight:600;display:flex;align-items:center;gap:5px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Install APK</button>' +
          '<button class="ap-act ap-action-btn" data-a="ai-analyze" data-s="' + d.serial + '" style="padding:6px 14px;background:rgba(78,201,176,0.1);border:1px solid rgba(78,201,176,0.35);color:#4ec9b0;border-radius:7px;cursor:pointer;font-size:10.5px;font-weight:700;display:flex;align-items:center;gap:5px;box-shadow:0 1px 4px rgba(78,201,176,0.1);"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> AI Analyze</button>' +
          '<button class="ap-act ap-action-btn" data-a="mirror" data-s="' + d.serial + '" style="padding:6px 14px;background:rgba(176,78,201,0.1);border:1px solid rgba(176,78,201,0.35);color:#b04ec9;border-radius:7px;cursor:pointer;font-size:10.5px;font-weight:700;display:flex;align-items:center;gap:5px;box-shadow:0 1px 4px rgba(176,78,201,0.1);"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Mirror</button>' +
          '</div></div>';
      } else if (isOnline) {
        deviceFooter = '<div style="display:flex;align-items:center;gap:8px;padding:0 14px 8px;">' +
          '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:' + statusColor + ';"><span style="width:6px;height:6px;background:' + statusColor + ';border-radius:50%;animation:apBattPulse 2s ease infinite;"></span> ' + statusLabel + '</span>' +
          '<span style="width:1px;height:10px;background:rgba(255,255,255,0.08);"></span>' +
          '<span style="font-size:10px;color:#555;">Android ' + d.android_version + '</span>' +
          '<span style="width:1px;height:10px;background:rgba(255,255,255,0.08);"></span>' +
          '<span style="font-size:10px;color:#555;">API ' + d.api_level + '</span></div>' +
          '<div style="padding:6px 14px 10px;"><div style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(79,195,247,0.04);border:1px dashed rgba(79,195,247,0.15);border-radius:7px;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          '<span style="font-size:10.5px;color:#4fc3f7;font-weight:500;">Tap to select this device</span></div></div>';
      } else {
        deviceFooter = '<div style="padding:6px 14px 12px;">' +
          '<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:' + statusColor + ';background:rgba(244,71,71,0.08);padding:3px 8px;border-radius:5px;font-weight:600;">' +
          '<span style="width:5px;height:5px;background:' + statusColor + ';border-radius:50%;"></span> ' + statusLabel + '</span></div>';
      }

      // Battery display
      const battHtml = d.battery ? '<div style="display:flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + battColor + '" stroke-width="2" stroke-linecap="round"><rect x="6" y="4" width="12" height="18" rx="1"/><line x1="10" y1="2" x2="14" y2="2"/></svg><span style="font-size:11px;color:' + battColor + ';font-weight:600;">' + d.battery + '</span></div>' : '';

      html += '<div class="ap-dev ap-dev-card" data-serial="' + d.serial + '" style="padding:0;margin-bottom:10px;background:' + (sel ? 'rgba(79,195,247,0.04)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (sel ? 'rgba(79,195,247,0.25)' : 'rgba(255,255,255,0.06)') + ';border-radius:10px;cursor:pointer;overflow:hidden;animation-delay:' + (idx * 80) + 'ms;">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;">' +
          '<div style="width:36px;height:36px;background:linear-gradient(135deg,' + (sel ? '#1a3a4a' : '#1a1a2e') + ',' + (sel ? '#0e3a5a' : '#222230') + ');border:1px solid ' + (sel ? 'rgba(79,195,247,0.2)' : 'rgba(255,255,255,0.06)') + ';border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + (sel ? '#4fc3f7' : '#6b7280') + '" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:13px;font-weight:600;color:#e8e8ec;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (d.model || d.serial) + '</div>' +
            '<div style="font-size:10.5px;color:#555;margin-top:1px;display:flex;align-items:center;gap:6px;"><span>' + d.serial + '</span><span style="color:#333;">&bull;</span><span>' + d.transport.toUpperCase() + '</span></div>' +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0;">' + battHtml + '</div>' +
        '</div>' +
        deviceFooter +
      '</div>';
    }

    html += `<div style="margin-top:6px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);">
      <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Wi-Fi Connect</div>
      <div style="display:flex;gap:6px;">
        <input id="ap-wifi-ip" placeholder="192.168.1.x:5555" style="flex:1;padding:7px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#d0d0d0;border-radius:7px;font-size:12px;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='rgba(79,195,247,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'" />
        <button id="ap-wifi-btn" style="padding:7px 14px;background:linear-gradient(135deg,#0e639c,#1a73e8);border:none;color:#fff;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.filter='brightness(1.15)'" onmouseout="this.style.filter='brightness(1)'">Connect</button>
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
        else if (action === 'ai-analyze') doAIAnalyzeUI(serial);
        else if (action === 'mirror') doMirrorDevice(serial);
      });
    });

    document.getElementById('ap-wifi-btn')?.addEventListener('click', doWifiConnect);

  } catch (e: any) {
    b.innerHTML = `<div style="text-align:center;padding:20px 12px;">
      <div style="width:56px;height:56px;margin:0 auto 14px;background:linear-gradient(135deg,#3a2a1b,#2e1a1a);border:1px solid rgba(244,71,71,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f44747" stroke-width="1.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div style="font-size:14px;font-weight:600;color:#f44747;margin-bottom:4px;">ADB Not Installed</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:16px;">Android Debug Bridge is required for device communication</div>

      <div style="text-align:left;padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
        <div style="font-size:11px;font-weight:600;color:#4fc3f7;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Quick Install</div>
        <div style="font-size:11.5px;color:#b0b0b0;line-height:2.2;">
          <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">1</span> Download <a href="https://developer.android.com/tools/releases/platform-tools" target="_blank" style="color:#4fc3f7;text-decoration:none;border-bottom:1px dashed rgba(79,195,247,0.3);">Platform Tools</a></div>
          <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">2</span> Extract to <code style="background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px;color:#ffd54f;font-size:10.5px;">C:\\Android\\platform-tools</code></div>
          <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">3</span> Add folder to system <b style="color:#e0e0e0;">PATH</b></div>
          <div style="display:flex;align-items:center;gap:8px;"><span style="width:20px;height:20px;background:rgba(78,201,176,0.1);color:#4ec9b0;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">4</span> <b style="color:#e0e0e0;">Restart the IDE</b></div>
        </div>
      </div>

      <div style="margin-top:12px;padding:10px 12px;background:rgba(255,213,79,0.04);border:1px solid rgba(255,213,79,0.15);border-radius:8px;font-size:11px;color:#e8a838;display:flex;align-items:center;gap:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        After installing, restart IDE and click Refresh
      </div>
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

  async function doMirrorDevice(serial: string) {
    const statusEl = document.getElementById("ap-status");
    const updateStatus = (msg: string) => { if (statusEl) statusEl.innerHTML = msg; };
    updateStatus('<span style="color:#b04ec9;">▶ Launching scrcpy...</span>');
    try {
      const result = await invoke('launch_scrcpy', {
        deviceId: serial,
        maxSize: 1024,
        bitRate: 4,
        title: `X02 Mirror - ${serial}`
      });
      console.log("[Mirror]", result);
      updateStatus('<span style="color:#4ec9b0;">✅ Mirror running</span>');
      // Show floating AI toolbar for mirror mode
      const existingToolbar = document.getElementById('mirror-ai-toolbar');
      if (existingToolbar) existingToolbar.remove();
      const toolbar = document.createElement('div');
      toolbar.id = 'mirror-ai-toolbar';
      toolbar.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);z-index:99998;display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#1a1d23ee,#22262eee);border:1px solid #b04ec955;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);backdrop-filter:blur(8px);animation:msFadeIn 0.3s ease;';
      toolbar.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;padding-right:8px;border-right:1px solid #30363d;">
          <div style="width:8px;height:8px;background:#0d9;border-radius:50%;animation:pulse 2s infinite;"></div>
          <span style="font-size:11px;color:#8b949e;font-weight:600;">MIRROR LIVE</span>
        </div>
        <input id="mirror-ai-input" type="text" placeholder="Ask AI about the screen..." style="width:320px;padding:7px 12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:12px;outline:none;font-family:inherit;" />
        <button id="mirror-ai-capture" style="padding:7px 14px;background:linear-gradient(135deg,#b04ec9,#8b5cf6);border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:all 0.2s;">📸 Capture & Ask AI</button>
        <button id="mirror-ai-close" style="padding:4px 8px;background:none;border:none;color:#8b949e;cursor:pointer;font-size:16px;">✕</button>
      `;
      document.body.appendChild(toolbar);
      // Close toolbar
      toolbar.querySelector('#mirror-ai-close')?.addEventListener('click', () => toolbar.remove());
      // Enter key support
      toolbar.querySelector('#mirror-ai-input')?.addEventListener('keydown', (e: any) => { if (e.key === 'Enter') (toolbar.querySelector('#mirror-ai-capture') as HTMLElement)?.click(); });
      // Capture & Ask AI handler
      toolbar.querySelector('#mirror-ai-capture')?.addEventListener('click', async () => {
        const captureBtn = toolbar.querySelector('#mirror-ai-capture') as HTMLButtonElement;
        const inputEl = toolbar.querySelector('#mirror-ai-input') as HTMLInputElement;
        const userQuestion = inputEl?.value?.trim() || '';
        if (captureBtn) { captureBtn.innerHTML = '⏳ Capturing...'; captureBtn.disabled = true; }
        try {
          // Take screenshot
          const home = await invoke('get_app_home_path') as string;
          const capturePath = home + '/mirror_capture_' + Date.now() + '.png';
          await invoke('android_screenshot', { deviceId: serial, savePath: capturePath });
          if (captureBtn) captureBtn.innerHTML = '🧠 Analyzing...';
          // Read as base64
          const b64 = await invoke('read_file_base64', { filePath: capturePath }) as string;
          // Build collapsible card (same style as AI Analyze)
          const mirrorId = `mirror-ai-${Date.now()}`;
          const questionLabel = userQuestion ? userQuestion.substring(0, 60) + (userQuestion.length > 60 ? '...' : '') : 'Screen Analysis';
          const mirrorCard = `<div class="android-panel-action" style="background:linear-gradient(135deg,#1a0f23,#201430);border:1px solid #6a3a9a;border-radius:10px;padding:0;margin:4px 0;max-width:520px;overflow:hidden;">` +
            `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#1a0e2a,#241636);border-bottom:1px solid #3a1e5a;">` +
            `<div style="width:34px;height:34px;background:linear-gradient(135deg,#b04ec9,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">` +
            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg></div>` +
            `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#e0e0f0;">${questionLabel}</div>` +
            `<div style="font-size:10px;color:#9a6ab5;display:flex;align-items:center;gap:4px;">` +
            `<span style="display:inline-block;width:5px;height:5px;background:#b04ec9;border-radius:50%;"></span> Mirror Capture \u00b7 Live Device</div></div>` +
            `<button id="${mirrorId}-toggle" style="background:none;border:1px solid #b04ec9;color:#b04ec9;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:600;transition:all 0.2s;">\u25B2 Hide</button></div>` +
            `<div id="${mirrorId}-body" style="display:block;padding:10px 14px;background:#120a1a;">` +
            `<img src="data:image/png;base64,${b64}" style="width:100%;max-height:320px;object-fit:contain;border-radius:6px;border:1px solid #3a1e5a;" />` +
            (userQuestion ? `<div style="margin-top:8px;padding:8px 10px;background:#1a1025;border:1px solid #3a1e5a;border-radius:6px;font-size:11px;color:#c0b0d8;"><span style="color:#b04ec9;font-weight:600;">Q:</span> ${userQuestion}</div>` : '') +
            `</div>` +
            `<div style="padding:8px 14px;background:#140c1e;display:flex;align-items:center;gap:8px;">` +
            `<div style="flex:1;height:3px;background:#2a1a3a;border-radius:2px;overflow:hidden;"><div style="width:100%;height:100%;background:linear-gradient(90deg,#b04ec9,#8b5cf6);background-size:200% 200%;animation:bridgeFlow 2s ease infinite;"></div></div>` +
            `<span style="font-size:9px;color:#b04ec9;font-weight:600;letter-spacing:0.5px;">ANALYZING</span></div></div>`;
          // Add card to chat
          const addMsg2 = (window as any).addMessageToChat;
          if (addMsg2) await addMsg2('system', mirrorCard);
          // Toggle handler + auto-collapse
          setTimeout(() => { const tb = document.getElementById(mirrorId + '-toggle'); const bd = document.getElementById(mirrorId + '-body'); if (tb && bd) { tb.addEventListener('click', () => { const isOpen = bd.style.display !== 'none'; bd.style.display = isOpen ? 'none' : 'block'; tb.textContent = isOpen ? '\u25BC Preview' : '\u25B2 Hide'; tb.style.borderColor = isOpen ? '#4a2a6a' : '#b04ec9'; tb.style.color = isOpen ? '#9a6ab5' : '#b04ec9'; }); setTimeout(() => { bd.style.display = 'none'; tb.textContent = '\u25BC Preview'; tb.style.borderColor = '#4a2a6a'; tb.style.color = '#9a6ab5'; }, 5000); } }, 300);
          // Send actual prompt to AI
          const mirrorPrompt = userQuestion
            ? `The user is mirroring their Android device and asks: "${userQuestion}"\n\nAnalyze this screenshot and answer their question. Provide specific, actionable feedback.`
            : 'The user is mirroring their Android device. Analyze this screenshot — describe what you see, identify the current app/screen, and suggest any UI/UX improvements or issues.';
          const mirrorSend = (window as any).sendMessageDirectly;
          if (mirrorSend) await mirrorSend(mirrorPrompt, undefined, b64);
          if (captureBtn) { captureBtn.innerHTML = '✅ Sent to AI'; captureBtn.disabled = false; }
          if (inputEl) inputEl.value = '';
          setTimeout(() => { if (captureBtn) captureBtn.innerHTML = '📸 Capture & Ask AI'; }, 2000);
        } catch (captureErr: any) {
          console.error('[Mirror AI]', captureErr);
          if (captureBtn) { captureBtn.innerHTML = '❌ Error'; captureBtn.disabled = false; }
          setTimeout(() => { if (captureBtn) captureBtn.innerHTML = '📸 Capture & Ask AI'; }, 2000);
        }
      });
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    } catch (err: any) {
      console.error("[Mirror] Error:", err);
      const msg = String(err);
      if (msg.includes("not found")) {
        updateStatus('<span style="color:#b04ec9;">📱 Setup required</span>');
        const existingModal = document.getElementById('mirror-setup-modal');
        if (existingModal) existingModal.remove();
        const modal = document.createElement('div');
        modal.id = 'mirror-setup-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:msFadeIn 0.25s ease;';
        const styleTag = document.createElement('style');
        styleTag.textContent = `
          @keyframes msFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
          @keyframes msSpinPulse{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          @keyframes msProgress{0%{width:0%}100%{width:100%}}
          @keyframes msCheckBounce{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
          @keyframes msDotPulse{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
          .ms-benefit{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#161b22;border-radius:8px;border:1px solid #30363d;transition:border-color 0.2s}
          .ms-benefit:hover{border-color:#b04ec955}
          .ms-benefit-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
          .ms-step{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:12px;color:#8b949e}
          .ms-step-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:all 0.3s}
          .ms-step-dot.pending{background:#21262d;border:1px solid #30363d;color:#8b949e}
          .ms-step-dot.active{background:#b04ec933;border:1.5px solid #b04ec9;color:#b04ec9;animation:msSpinPulse 1s linear infinite}
          .ms-step-dot.done{background:#0d9933;border:1.5px solid #0d9;color:#fff}
          .ms-step-dot.error{background:#f4474733;border:1.5px solid #f44747;color:#f44747}
          .ms-install-btn{padding:12px 32px;background:linear-gradient(135deg,#b04ec9,#8b5cf6);border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;transition:all 0.2s;box-shadow:0 4px 16px rgba(176,78,201,0.3)}
          .ms-install-btn:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(176,78,201,0.4)}
          .ms-install-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none}
        `;
        document.head.appendChild(styleTag);
        modal.innerHTML = `
          <div style="background:linear-gradient(145deg,#1a1d23,#22262e);border:1px solid #30363d;border-radius:14px;width:440px;max-width:90vw;box-shadow:0 20px 80px rgba(0,0,0,0.7);overflow:hidden;">
            <div style="padding:24px 28px 20px;text-align:center;border-bottom:1px solid #30363d22;">
              <div style="width:56px;height:56px;background:linear-gradient(135deg,#b04ec9,#8b5cf6);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;box-shadow:0 8px 24px rgba(176,78,201,0.3);">📱</div>
              <div style="font-size:18px;font-weight:800;color:#e6edf3;margin-bottom:4px;">Screen Mirror</div>
              <div style="font-size:12px;color:#8b949e;">Control your device directly from the IDE</div>
              <button id="ms-close" style="position:absolute;top:16px;right:20px;background:none;border:none;color:#8b949e;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:20px 28px;" id="ms-content">
              <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                <div class="ms-benefit">
                  <div class="ms-benefit-icon" style="background:#b04ec922;">👆</div>
                  <div><div style="font-size:12px;font-weight:600;color:#e6edf3;">Touch Control</div><div style="font-size:11px;color:#8b949e;">Tap, swipe & type on your device from desktop</div></div>
                </div>
                <div class="ms-benefit">
                  <div class="ms-benefit-icon" style="background:#4fc3f722;">⚡</div>
                  <div><div style="font-size:12px;font-weight:600;color:#e6edf3;">Ultra Low Latency</div><div style="font-size:11px;color:#8b949e;">~35ms response — feels native & instant</div></div>
                </div>
                <div class="ms-benefit">
                  <div class="ms-benefit-icon" style="background:#0d922;">🪶</div>
                  <div><div style="font-size:12px;font-weight:600;color:#e6edf3;">Lightweight</div><div style="font-size:11px;color:#8b949e;">Only ~15MB RAM — won't slow your IDE</div></div>
                </div>
              </div>
              <div id="ms-steps" style="display:none;margin-bottom:16px;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:14px 16px;">
                <div class="ms-step" id="ms-s1"><div class="ms-step-dot pending">1</div><span>Checking system requirements...</span></div>
                <div class="ms-step" id="ms-s2"><div class="ms-step-dot pending">2</div><span>Downloading screen mirror driver...</span></div>
                <div class="ms-step" id="ms-s3"><div class="ms-step-dot pending">3</div><span>Installing components...</span></div>
                <div class="ms-step" id="ms-s4"><div class="ms-step-dot pending">4</div><span>Configuring for your device...</span></div>
              </div>
              <div id="ms-progress-wrap" style="display:none;margin-bottom:16px;">
                <div style="background:#21262d;border-radius:6px;height:4px;overflow:hidden;">
                  <div id="ms-progress-bar" style="height:100%;background:linear-gradient(90deg,#b04ec9,#8b5cf6);width:0%;transition:width 0.5s ease;border-radius:6px;"></div>
                </div>
                <div id="ms-progress-text" style="font-size:11px;color:#8b949e;margin-top:6px;text-align:center;">Preparing...</div>
              </div>
              <div id="ms-error" style="display:none;background:#1a0a0a;border:1px solid #f4474744;border-radius:8px;padding:12px 14px;margin-bottom:12px;">
                <div style="font-size:12px;font-weight:600;color:#f44747;margin-bottom:4px;">Installation issue</div>
                <div id="ms-error-text" style="font-size:11px;color:#f4474799;font-family:monospace;"></div>
                <div style="font-size:11px;color:#8b949e;margin-top:8px;">Try running in terminal: <span style="color:#4fc3f7;font-family:monospace;">winget install Genymobile.scrcpy</span></div>
              </div>
              <div id="ms-success" style="display:none;text-align:center;padding:16px 0;">
                <div style="font-size:48px;animation:msCheckBounce 0.5s ease;">✅</div>
                <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:8px;">Ready to Mirror!</div>
                <div style="font-size:12px;color:#8b949e;margin-top:4px;">Click <strong style="color:#b04ec9;">▶ Mirror</strong> on your device to start</div>
              </div>
            </div>
            <div style="padding:16px 28px;border-top:1px solid #30363d22;text-align:center;" id="ms-footer">
              <button class="ms-install-btn" id="ms-install-btn">⚡ Install Screen Mirror</button>
              <div style="font-size:10px;color:#484f58;margin-top:10px;">One-time setup · Free & open source · ~25MB download</div>
            </div>
          </div>`;
        document.body.appendChild(modal);
        // Close handlers
        modal.querySelector('#ms-close')?.addEventListener('click', () => { modal.remove(); styleTag.remove(); });
        modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); styleTag.remove(); } });
        // Install handler
        modal.querySelector('#ms-install-btn')?.addEventListener('click', async () => {
          const btn = modal.querySelector('#ms-install-btn') as HTMLButtonElement;
          const stepsEl = modal.querySelector('#ms-steps') as HTMLElement;
          const progressWrap = modal.querySelector('#ms-progress-wrap') as HTMLElement;
          const progressBar = modal.querySelector('#ms-progress-bar') as HTMLElement;
          const progressText = modal.querySelector('#ms-progress-text') as HTMLElement;
          const benefitsEl = modal.querySelector('#ms-content > div:first-child') as HTMLElement;
          const successEl = modal.querySelector('#ms-success') as HTMLElement;
          const errorEl = modal.querySelector('#ms-error') as HTMLElement;
          const errorText = modal.querySelector('#ms-error-text') as HTMLElement;
          if (btn) { btn.disabled = true; btn.textContent = '⏳ Installing...'; }
          if (benefitsEl) benefitsEl.style.display = 'none';
          if (stepsEl) stepsEl.style.display = 'block';
          if (progressWrap) progressWrap.style.display = 'block';
          // Animate steps
          const setStep = (n: number, state: string) => {
            const dot = modal.querySelector(`#ms-s${n} .ms-step-dot`) as HTMLElement;
            if (dot) { dot.className = 'ms-step-dot ' + state; dot.textContent = state === 'done' ? '✓' : state === 'error' ? '!' : state === 'active' ? '⟳' : String(n); }
            const stepEl = modal.querySelector(`#ms-s${n} span`) as HTMLElement;
            if (stepEl && state === 'active') stepEl.style.color = '#e6edf3';
            if (stepEl && state === 'done') stepEl.style.color = '#4ec9b0';
          };
          const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
          try {
            // Step 1: Check requirements
            setStep(1, 'active'); if (progressBar) progressBar.style.width = '10%'; if (progressText) progressText.textContent = 'Checking system requirements...';
            await delay(800);
            setStep(1, 'done'); if (progressBar) progressBar.style.width = '20%';
            // Step 2: Download
            setStep(2, 'active'); if (progressText) progressText.textContent = 'Downloading screen mirror driver...';
            if (progressBar) progressBar.style.width = '30%';
            await delay(600);
            if (progressBar) progressBar.style.width = '45%';
            // Step 3: Installing (actual install happens here)
            setStep(3, 'active'); if (progressText) progressText.textContent = 'Installing components... this may take a minute';
            if (progressBar) progressBar.style.width = '55%';
            const result = await invoke('install_scrcpy');
            setStep(2, 'done'); setStep(3, 'done');
            if (progressBar) progressBar.style.width = '85%';
            // Step 4: Configure
            setStep(4, 'active'); if (progressText) progressText.textContent = 'Finalizing configuration...';
            await delay(600);
            setStep(4, 'done'); if (progressBar) progressBar.style.width = '100%'; if (progressText) progressText.textContent = 'Installation complete!';
            // Show success
            await delay(500);
            if (stepsEl) stepsEl.style.display = 'none';
            if (progressWrap) progressWrap.style.display = 'none';
            if (successEl) successEl.style.display = 'block';
            if (btn) { btn.textContent = '✅ Done'; btn.style.background = 'linear-gradient(135deg,#0d9,#0a7)'; }
            setTimeout(() => { modal.remove(); styleTag.remove(); }, 3000);
          } catch (err: any) {
            setStep(3, 'error');
            if (progressBar) { progressBar.style.width = '100%'; progressBar.style.background = '#f44747'; }
            if (progressText) progressText.textContent = 'Installation encountered an issue';
            if (errorEl) errorEl.style.display = 'block';
            if (errorText) errorText.textContent = String(err).substring(0, 200);
            if (btn) { btn.textContent = '⚡ Retry Install'; btn.disabled = false; btn.style.background = 'linear-gradient(135deg,#b04ec9,#8b5cf6)'; }
          }
        });
      } else {
        updateStatus(`<span style="color:#f44747;">❌ ${msg.substring(0, 80)}</span>`);
      }
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 5000);
    }
  }

async function doScreenshot(serial: string) {
  try {
    const home = await invoke('get_app_home_path') as string;
    const path = `${home}\\android_screenshot_${Date.now()}.png`;
    await invoke('android_screenshot', { deviceId: serial, savePath: path });
    console.log('Screenshot saved:', path);
  } catch (e) { console.error('Screenshot failed:', e); }
}

async function doAIAnalyzeUI(serial: string) {
  const b = body();
  const statusEl = document.getElementById('ai-analyze-status');
  const updateStatus = (msg: string) => {
    if (statusEl) statusEl.innerHTML = msg;
    console.log('[AI Analyze]', msg.replace(/<[^>]*>/g, ''));
  };

  try {
    updateStatus('<span style="color:#4fc3f7;">📸 Capturing screenshot...</span>');
    const home = await invoke('get_app_home_path') as string;
    const path = `${home}\\android_ui_${Date.now()}.png`;
    await invoke('android_screenshot', { deviceId: serial, savePath: path });

    updateStatus('<span style="color:#4fc3f7;">🔍 Reading image...</span>');
    // Read file as base64 via Rust
    let base64Data = '';
    try {
      base64Data = await invoke('read_file_base64', { filePath: path }) as string;
      console.log('[AI Analyze] Image loaded, base64 length:', base64Data.length);
    } catch (b64Err) {
      console.warn('[AI Analyze] read_file_base64 failed:', b64Err);
    }

    // Open screenshot in Preview Tab for side-by-side viewing
    try {
      const previewHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI UI Analysis</title><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
        .header{padding:12px 16px;background:#161b22;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:12px;flex-shrink:0}
        .header-icon{width:32px;height:32px;background:linear-gradient(135deg,#1a73e8,#4fc3f7);border-radius:8px;display:flex;align-items:center;justify-content:center}
        .header-icon svg{width:18px;height:18px}
        .header-title{font-size:14px;font-weight:700;color:#e6edf3}
        .header-sub{font-size:11px;color:#8b949e}
        .badge{display:inline-block;padding:2px 8px;background:#1a73e822;border:1px solid #1a73e844;border-radius:4px;font-size:10px;color:#4fc3f7;font-weight:600;margin-left:8px}
        .img-container{flex:1;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;background:#0d1117}
        .img-container img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;border:1px solid #30363d;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
        .footer{padding:8px 16px;background:#161b22;border-top:1px solid #30363d;display:flex;align-items:center;gap:12px;font-size:11px;color:#8b949e;flex-shrink:0}
        .dot{width:6px;height:6px;background:#4ec9b0;border-radius:50%;animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .zoom-controls{margin-left:auto;display:flex;gap:6px}
        .zoom-btn{padding:3px 10px;background:#21262d;border:1px solid #30363d;color:#8b949e;border-radius:4px;cursor:pointer;font-size:11px}
        .zoom-btn:hover{background:#30363d;color:#e6edf3}
      </style></head><body>
        <div class="header">
          <div class="header-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></div>
          <div><div class="header-title">UI Analysis<span class="badge">LIVE</span></div>
          <div class="header-sub">Screenshot captured from device · AI analyzing in chat →</div></div>
        </div>
        <div class="img-container">
          ${base64Data ? `<img id="ss" src="data:image/png;base64,${base64Data}" alt="Android UI Screenshot"/>` : `<div style="color:#8b949e;text-align:center;"><div style="font-size:48px;margin-bottom:12px">📱</div><div>Screenshot saved to:</div><div style="color:#4fc3f7;margin-top:4px;font-size:12px">${path}</div></div>`}
        </div>
        <div class="footer">
          <span class="dot"></span>
          <span>AI analysis in progress — check the chat panel for results</span>
          <div class="zoom-controls">
            <button class="zoom-btn" onclick="var i=document.getElementById(String.fromCharCode(115,115));if(i)i.style.maxWidth=parseInt(i.style.maxWidth||100)-20+String.fromCharCode(37)">−</button>
            <button class="zoom-btn" onclick="var i=document.getElementById(String.fromCharCode(115,115));if(i)i.style.maxWidth=String.fromCharCode(49,48,48,37)">Fit</button>
            <button class="zoom-btn" onclick="var i=document.getElementById(String.fromCharCode(115,115));if(i)i.style.maxWidth=parseInt(i.style.maxWidth||100)+20+String.fromCharCode(37)">+</button>
          </div>
        </div>
      </body></html>`;
      const pt = (window as any).previewTab;
      if (pt && pt.open) {
        pt.open("about:blank");
        setTimeout(() => {
          const iframe = document.getElementById("preview-frame") as HTMLIFrameElement;
          if (iframe) {
            iframe.srcdoc = previewHtml;
            console.log("[AI Analyze] Screenshot opened in Preview Tab via srcdoc");
          }
        }, 500);
      }
    } catch (previewErr) {
      console.warn("[AI Analyze] Preview Tab open failed:", previewErr);
    }
    updateStatus('<span style="color:#4ec9b0;">🤖 Sending to AI for analysis...</span>');

    // Build display HTML with embedded screenshot
    const imgHtml = base64Data
      ? `<img src="data:image/png;base64,${base64Data}" style="width:100%;max-height:300px;object-fit:contain;border-radius:6px;border:1px solid #333;margin:6px 0;" />`
      : `<div style="padding:8px;background:#252526;border-radius:4px;font-size:10px;color:#888;">📁 Screenshot saved: ${path}</div>`;

    const prompt = `Analyze this Android app UI screenshot. Provide:
1. **UI Layout Review** - Component hierarchy, spacing, alignment issues
2. **UX Issues** - Usability problems, touch target sizes, navigation flow
3. **Accessibility** - Color contrast, text sizes, missing labels
4. **Design Suggestions** - Modern Material Design improvements
5. **Code Fix** - Specific Kotlin/Compose or XML layout fixes

Be specific and actionable. Reference exact UI elements you see.`;

    // If we have the image, attach it to chat
    if (base64Data) {
      // Try to attach image via the chat's file attachment system
      try {
        const chatInput = document.querySelector('.chat-input textarea, #chat-input, [data-chat-input]') as HTMLTextAreaElement;
        if (chatInput) {
          // Create a File object from base64
          const byteString = atob(base64Data);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: 'image/png' });
          const file = new File([blob], 'android_ui_screenshot.png', { type: 'image/png' });

          // Dispatch file to chat attachment system
          const dt = new DataTransfer();
          dt.items.add(file);
          const dropEvent = new DragEvent('drop', { dataTransfer: dt, bubbles: true });
          chatInput.dispatchEvent(dropEvent);

          // Small delay then send the analysis prompt
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (attachErr) {
        console.warn('[AI Analyze] Image attach failed:', attachErr);
      }
    }

    // Send custom AI Analyze card (collapsible, professional)
    const analyzeId = `ai-analyze-${Date.now()}`;
    const analyzeCard = `<div class="android-panel-action" style="background:linear-gradient(135deg,#0f1923,#141e2b);border:1px solid #2a5a8a;border-radius:10px;padding:0;margin:4px 0;max-width:520px;overflow:hidden;">` +
      `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#0e1b2a,#162436);border-bottom:1px solid #1e3a5a;">` +
      `<div style="width:34px;height:34px;background:linear-gradient(135deg,#1a73e8,#4fc3f7);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">` +
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg></div>` +
      `<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#e0e8f0;">UI Analysis</div>` +
      `<div style="font-size:10px;color:#5a8ab5;display:flex;align-items:center;gap:4px;">` +
      `<span style="display:inline-block;width:5px;height:5px;background:#4ec9b0;border-radius:50%;"></span> Android Panel \u00b7 Screenshot Captured</div></div>` +
      `<button id="${analyzeId}-toggle" style="background:none;border:1px solid #4ec9b0;color:#4ec9b0;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:600;transition:all 0.2s;">\u25B2 Hide</button></div>` +
      `<div id="${analyzeId}-body" style="display:block;padding:10px 14px;background:#0a1018;">` +
      (base64Data ? `<img src="data:image/png;base64,${base64Data}" style="width:100%;max-height:320px;object-fit:contain;border-radius:6px;border:1px solid #1e3a5a;" />` : `<div style="padding:8px;background:#111820;border-radius:4px;font-size:10px;color:#5a8ab5;">\uD83D\uDCC1 ${path}</div>`) +
      `</div>` +
      `<div style="padding:8px 14px;background:#0c1520;display:flex;align-items:center;gap:8px;">` +
      `<div style="flex:1;height:3px;background:#1a2a3a;border-radius:2px;overflow:hidden;"><div style="width:100%;height:100%;background:linear-gradient(90deg,#1a73e8,#4ec9b0);background-size:200% 200%;animation:bridgeFlow 2s ease infinite;"></div></div>` +
      `<span style="font-size:9px;color:#4ec9b0;font-weight:600;letter-spacing:0.5px;">ANALYZING</span></div></div>`;
    const addMsg = (window as any).addMessageToChat;
    if (addMsg) await addMsg('system', analyzeCard);
    setTimeout(() => { const tb = document.getElementById(analyzeId + '-toggle'); const bd = document.getElementById(analyzeId + '-body'); if (tb && bd) { tb.addEventListener('click', () => { const isOpen = bd.style.display !== 'none'; bd.style.display = isOpen ? 'none' : 'block'; tb.textContent = isOpen ? '\u25BC Preview' : '\u25B2 Hide'; tb.style.borderColor = isOpen ? '#2a4a6a' : '#4ec9b0'; tb.style.color = isOpen ? '#5a8ab5' : '#4ec9b0'; }); setTimeout(() => { bd.style.display = 'none'; tb.textContent = '\u25BC Preview'; tb.style.borderColor = '#2a4a6a'; tb.style.color = '#5a8ab5'; }, 5000); } }, 300);

    // Send the actual prompt to AI
    const analyzePrompt = base64Data ? prompt + '\n\n[Screenshot attached above]' : prompt + `\n\nScreenshot saved at: ${path}\nPlease analyze the UI based on standard Android/Material Design guidelines.`;
    const send = (window as any).sendMessageDirectly;
    if (send) await send(analyzePrompt, undefined, base64Data || undefined);



    updateStatus('<span style="color:#4ec9b0;">✅ Sent to AI</span>');
    setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);

  } catch (e) {
    updateStatus(`<span style="color:#f44747;">❌ ${e}</span>`);
    console.error('[AI Analyze] Error:', e);
  }
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

  // Show loading while checking environment
  b.innerHTML = '<div style="text-align:center;padding:20px;"><div style="color:#4fc3f7;font-size:12px;">Checking environment...</div><div style="margin:10px auto;width:24px;height:24px;border:2px solid #333;border-top:2px solid #4fc3f7;border-radius:50%;animation:spin 1s linear infinite;"></div></div><style>@keyframes spin{to{transform:rotate(360deg);}}</style>';

  invoke('android_check_environment', { projectPath: proj }).then((env: any) => {
    if (env.all_ready) {
      renderNormalBuildUI(b, proj);
    } else if (env.fresh_install) {
      renderFreshInstallUI(b, proj, env);
    } else {
      renderPartialSetupUI(b, proj, env);
    }
  }).catch(() => {
    renderNormalBuildUI(b, proj);
  });
}

// --- Fresh Install: No SDK at all ---
function renderFreshInstallUI(container: HTMLElement, proj: string, env: any) {
  const jdkIcon = env.jdk.installed ? '\u2705' : '\u274C';
  const jdkColor = env.jdk.installed ? '#4ec9b0' : '#f44747';
  container.innerHTML = '<div style="padding:10px;">' +
    '<div style="text-align:center;padding:16px 0 12px;"><div style="font-size:36px;margin-bottom:6px;">\uD83D\uDCF1</div><div style="font-size:14px;font-weight:600;color:#e0e0e0;">Android Setup Required</div><div style="font-size:11px;color:#888;margin-top:4px;">No Android SDK detected. Let\'s set things up!</div></div>' +
    '<div style="background:#1a2733;border:1px solid #0e639c;border-radius:6px;padding:14px;margin-bottom:10px;"><div style="display:flex;align-items:flex-start;gap:10px;"><span style="font-size:24px;">\uD83C\uDFD7\uFE0F</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:#4fc3f7;">Recommended: Install Android Studio</div><div style="font-size:11px;color:#999;margin-top:3px;line-height:1.4;">One install gives you everything: SDK, Build Tools, Emulator, ADB, and SDK Manager.</div><button id="install-studio-btn" style="margin-top:10px;padding:8px 20px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;width:100%;">\uD83D\uDCE6 Install Android Studio</button><div style="font-size:10px;color:#666;margin-top:4px;text-align:center;">winget install Google.AndroidStudio (~1GB)</div></div></div></div>' +
    '<div style="background:#252526;border-radius:4px;padding:10px;margin-bottom:8px;border-left:3px solid ' + jdkColor + ';"><div style="display:flex;align-items:center;justify-content:space-between;"><div><span style="margin-right:6px;">' + jdkIcon + '</span><span style="font-size:12px;color:' + jdkColor + ';">JDK 17</span> <span style="font-size:10px;color:#666;">' + esc(env.jdk.version || 'Not found') + '</span></div>' + (!env.jdk.installed ? '<button id="install-jdk-btn" style="padding:3px 10px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:10px;">Install</button>' : '') + '</div></div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin:12px 0;"><div style="flex:1;height:1px;background:#333;"></div><span style="font-size:10px;color:#555;">OR</span><div style="flex:1;height:1px;background:#333;"></div></div>' +
    '<button id="manual-sdk-btn" style="width:100%;padding:8px 12px;background:#333;border:1px solid #555;color:#999;border-radius:4px;cursor:pointer;font-size:11px;">\uD83D\uDCC2 I already have the SDK \u2014 Set path manually</button>' +
    '<div style="display:flex;gap:6px;margin-top:10px;"><button id="refresh-btn" style="flex:1;padding:6px;background:#252526;border:1px solid #444;color:#888;border-radius:3px;cursor:pointer;font-size:11px;">\uD83D\uDD04 Re-check</button><button id="skip-btn" style="flex:1;padding:6px;background:#252526;border:1px solid #444;color:#666;border-radius:3px;cursor:pointer;font-size:11px;">Skip \u2192</button></div>' +
    '<div id="setup-output" style="display:none;font-family:\'Cascadia Code\',monospace;font-size:11px;background:#1a1a1a;padding:8px;border-radius:4px;max-height:250px;overflow-y:auto;color:#888;margin-top:10px;"></div></div>';

  container.querySelector('#install-studio-btn')?.addEventListener('click', async () => {
    const btn = container.querySelector('#install-studio-btn') as HTMLElement;
    const out = container.querySelector('#setup-output') as HTMLElement;
    if (btn) { btn.innerHTML = '\u23F3 Installing...'; btn.style.background = '#555'; }
    if (out) { out.style.display = 'block'; out.innerHTML += '\uD83D\uDCE6 Installing Android Studio via winget...\n'; }
    try {
      const r = await invoke('android_setup_install_studio') as any;
      if (out) out.innerHTML += (r.success ? '\u2705 ' : '\u274C ') + esc(r.message) + '\n';
      if (r.success && btn) { btn.innerHTML = '\uD83C\uDF89 Installed! Open Studio to finish'; btn.style.background = '#388e3c'; }
    } catch (e) { if (out) out.innerHTML += '\u274C ' + esc(String(e)) + '\n'; }
  });

  container.querySelector('#install-jdk-btn')?.addEventListener('click', async () => {
    const out = container.querySelector('#setup-output') as HTMLElement;
    if (out) { out.style.display = 'block'; out.innerHTML += '\uD83D\uDCE6 Installing JDK 17...\n'; }
    try {
      const r = await invoke('android_setup_install_jdk') as any;
      if (out) out.innerHTML += (r.success ? '\u2705 ' : '\u274C ') + esc(r.message) + '\n';
      if (r.success) setTimeout(() => renderBuildTab(), 1500);
    } catch (e) { if (out) out.innerHTML += '\u274C ' + esc(String(e)) + '\n'; }
  });

  container.querySelector('#refresh-btn')?.addEventListener('click', () => renderBuildTab());
  container.querySelector('#skip-btn')?.addEventListener('click', () => renderNormalBuildUI(container, proj));
}

// --- Partial Setup: SDK exists but missing components ---
function renderPartialSetupUI(container: HTMLElement, proj: string, env: any) {
  const comps = [env.jdk, env.android_sdk, env.sdk_platform, env.build_tools, env.gradle_wrapper, env.adb];
  const missing = comps.filter((c: any) => c.required && !c.installed).length;

  let rows = '';
  for (const c of comps) {
    const icon = c.installed ? '\u2705' : (c.required ? '\u274C' : '\u26A0\uFE0F');
    const color = c.installed ? '#4ec9b0' : (c.required ? '#f44747' : '#dcdcaa');
    rows += '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:#252526;border-radius:3px;border-left:3px solid ' + color + ';">' +
      '<span style="font-size:12px;">' + icon + '</span>' +
      '<div style="flex:1;"><div style="font-size:11px;color:' + color + ';font-weight:500;">' + esc(c.name) + (!c.required ? ' <span style="color:#555;font-size:9px;">(optional)</span>' : '') + '</div>' +
      '<div style="font-size:10px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.version || (c.installed ? 'OK' : 'Not found')) + '</div></div>' +
      (!c.installed && c.required ? '<button class="comp-install-btn" data-comp="' + esc(c.name) + '" style="padding:2px 8px;background:#0e639c;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:10px;">Install</button>' : '') +
      '</div>';
  }

  container.innerHTML = '<div style="padding:8px;">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #333;"><span style="font-size:18px;">\uD83D\uDEE0\uFE0F</span><div><div style="font-size:13px;font-weight:600;color:#e0e0e0;">Android Setup</div><div style="font-size:11px;color:#f44747;">' + missing + ' component' + (missing > 1 ? 's' : '') + ' need' + (missing === 1 ? 's' : '') + ' attention</div></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px;">' + rows + '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:8px;">' +
    '<button id="setup-all-btn" style="flex:1;padding:8px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">\u26A1 Fix All (' + missing + ')</button>' +
    (env.android_studio.installed ? '<button id="open-studio-btn" style="padding:8px 10px;background:#333;border:1px solid #555;color:#ccc;border-radius:4px;cursor:pointer;font-size:11px;">\uD83C\uDFD7\uFE0F SDK Mgr</button>' : '') +
    '<button id="refresh-btn2" style="padding:8px 10px;background:#333;border:1px solid #555;color:#888;border-radius:4px;cursor:pointer;font-size:11px;">\uD83D\uDD04</button>' +
    '<button id="skip-btn2" style="padding:8px 10px;background:#333;border:1px solid #555;color:#666;border-radius:4px;cursor:pointer;font-size:11px;">Skip</button></div>' +
    '<div id="setup-output" style="display:none;font-family:\'Cascadia Code\',monospace;font-size:11px;background:#1a1a1a;padding:8px;border-radius:4px;max-height:300px;overflow-y:auto;color:#888;"></div></div>';

  container.querySelector('#setup-all-btn')?.addEventListener('click', async () => {
    const out = container.querySelector('#setup-output') as HTMLElement;
    const btn = container.querySelector('#setup-all-btn') as HTMLElement;
    if (out) { out.style.display = 'block'; out.innerHTML = '\uD83D\uDE80 Running setup...\n'; }
    if (btn) { btn.innerHTML = '\u23F3 Setting up...'; btn.style.background = '#555'; }
    try {
      const results = await invoke('android_setup_all', { projectPath: proj }) as any[];
      for (const r of results) {
        if (out) out.innerHTML += (r.success ? '\u2705 ' : '\u274C ') + esc(r.component) + ': ' + esc(r.message) + '\n';
      }
      const allOk = results.every((r: any) => r.success);
      if (allOk) {
        if (out) out.innerHTML += '\n\uD83C\uDF89 All set! Refreshing...\n';
        setTimeout(() => renderBuildTab(), 1500);
      } else {
        if (btn) { btn.innerHTML = '\uD83D\uDD04 Retry'; btn.style.background = '#0e639c'; }
      }
    } catch (e) { if (out) out.innerHTML += '\u274C ' + esc(String(e)) + '\n'; if (btn) { btn.innerHTML = '\uD83D\uDD04 Retry'; btn.style.background = '#0e639c'; } }
  });

  container.querySelector('#open-studio-btn')?.addEventListener('click', async () => {
    const out = container.querySelector('#setup-output') as HTMLElement;
    if (out) { out.style.display = 'block'; }
    try { const r = await invoke('android_setup_open_sdk_manager') as any; if (out) out.innerHTML += '\u2705 ' + esc(r.message) + '\n'; } catch (e) { if (out) out.innerHTML += '\u274C ' + esc(String(e)) + '\n'; }
  });

  container.querySelector('#refresh-btn2')?.addEventListener('click', () => renderBuildTab());
  container.querySelector('#skip-btn2')?.addEventListener('click', () => renderNormalBuildUI(container, proj));

  container.querySelectorAll('.comp-install-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const comp = (btn as HTMLElement).dataset.comp || '';
      const out = container.querySelector('#setup-output') as HTMLElement;
      if (out) { out.style.display = 'block'; out.innerHTML += '\uD83D\uDCE6 Installing ' + esc(comp) + '...\n'; }
      try {
        let r: any;
        if (comp === 'JDK 17') r = await invoke('android_setup_install_jdk');
        else if (comp === 'Gradle Wrapper') r = await invoke('android_setup_download_gradle_wrapper', { projectPath: proj });
        else if (comp.includes('SDK Platform')) r = await invoke('android_setup_install_sdk_component', { component: 'platforms;android-34' });
        else if (comp === 'Build Tools') r = await invoke('android_setup_install_sdk_component', { component: 'build-tools;34.0.0' });
        else r = { success: false, message: 'Use Android Studio SDK Manager' };
        if (out) out.innerHTML += (r.success ? '\u2705 ' : '\u274C ') + esc(r.message) + '\n';
        if (r.success) setTimeout(() => renderBuildTab(), 1200);
      } catch (e) { if (out) out.innerHTML += '\u274C ' + esc(String(e)) + '\n'; }
    });
  });
}

// --- Gradle Runner with Build Animation ---
async function runGradle(proj: string, task: string) {
  const out = document.getElementById('build-out'); if (!out || !proj) return;

  // Build steps for animation
  const steps = [
    { icon: '\uD83D\uDD0D', text: 'Checking Gradle wrapper...', time: 800 },
    { icon: '\u2699\uFE0F', text: 'Configuring project...', time: 1500 },
    { icon: '\uD83D\uDCE6', text: 'Resolving dependencies...', time: 3000 },
    { icon: '\uD83D\uDCBE', text: 'Downloading libraries (first build may take longer)...', time: 4000 },
    { icon: '\uD83D\uDD27', text: 'Compiling Kotlin sources...', time: 5000 },
    { icon: '\uD83C\uDFA8', text: 'Processing Compose UI...', time: 3000 },
    { icon: '\uD83D\uDCC4', text: 'Processing resources & manifest...', time: 2000 },
    { icon: '\uD83D\uDCE6', text: 'Packaging APK...', time: 2000 },
    { icon: '\u2705', text: 'Finalizing build...', time: 1500 },
  ];

  // Render initial build UI
  const startTime = Date.now();
  out.innerHTML = '<div id="build-progress" style="padding:4px 0;">' +
    '<div id="build-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
    '<div id="build-spinner" style="width:16px;height:16px;border:2px solid #333;border-top:2px solid #4fc3f7;border-radius:50%;animation:bspin 0.8s linear infinite;flex-shrink:0;"></div>' +
    '<div style="flex:1;"><div id="build-task" style="font-size:12px;color:#4fc3f7;font-weight:600;">gradle ' + esc(task) + '</div>' +
    '<div id="build-timer" style="font-size:10px;color:#666;">0s elapsed</div></div></div>' +
    '<div id="build-steps" style="margin-left:4px;border-left:2px solid #333;padding-left:10px;"></div>' +
    '</div>' +
    '<style>@keyframes bspin{to{transform:rotate(360deg);}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}</style>';

  const stepsEl = document.getElementById('build-steps');
  const timerEl = document.getElementById('build-timer');

  // Timer updater
  const timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    if (timerEl) timerEl.textContent = (min > 0 ? min + 'm ' : '') + sec + 's elapsed';
  }, 1000);

  // Animate steps progressively
  let stepIndex = 0;
  let animationDone = false;
  const stepInterval = setInterval(() => {
    if (stepIndex >= steps.length || animationDone) {
      clearInterval(stepInterval);
      return;
    }
    const step = steps[stepIndex];
    if (stepsEl) {
      stepsEl.innerHTML += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;animation:fadeIn 0.3s ease-out;">' +
        '<span style="font-size:11px;">' + step.icon + '</span>' +
        '<span style="font-size:11px;color:#aaa;">' + step.text + '</span>' +
        '</div>';
      stepsEl.scrollTop = stepsEl.scrollHeight;
    }
    stepIndex++;
  }, 2500);

  // Run actual build
  try {
    const r = await invoke('android_gradle_build', { projectPath: proj, task }) as GradleResult;
    animationDone = true;
    clearInterval(stepInterval);
    clearInterval(timerInterval);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (r.success) {

      // AUTO DEPLOY: install + launch on device (fast - no device scan)
      if (r.apk_path) {
        try {
            if (stepsEl) stepsEl.innerHTML += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;animation:fadeIn 0.3s ease-out;"><span style="font-size:11px;">📲</span><span style="font-size:11px;color:#aaa;">Installing APK...</span></div>';
            await invoke('android_adb_command', { args: ['install', '-r', r.apk_path] });
            if (stepsEl) stepsEl.innerHTML += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;animation:fadeIn 0.3s ease-out;"><span style="font-size:11px;">🚀</span><span style="font-size:11px;color:#aaa;">Launching app...</span></div>';
            // Extract package name from project
            const manifestPath = proj + '/app/src/main/AndroidManifest.xml';
            try {
              const manifestContent = await invoke('read_file_content', { path: manifestPath }) as string;
              const pkgMatch = manifestContent.match(/android:name="\.(\w+)"/);
              const nsMatch = manifestContent.match(/package="([^"]+)"/);
              let launchPkg = '';
              let launchActivity = '';
              // Get namespace from build.gradle.kts
              try {
                const buildGradle = await invoke('read_file_content', { path: proj + '/app/build.gradle.kts' }) as string;
                const nsMatch2 = buildGradle.match(/namespace\s*=\s*"([^"]+)"/);
                if (nsMatch2) launchPkg = nsMatch2[1];
              } catch(_) {}
              if (!launchPkg && nsMatch) launchPkg = nsMatch[1];
              if (pkgMatch) launchActivity = pkgMatch[1];
              if (launchPkg && launchActivity) {
                await invoke('android_adb_command', { args: ['shell', 'am', 'start', '-n', launchPkg + '/.' + launchActivity] });
              }
            } catch(_) {}
        } catch (deployErr) { console.warn('[Deploy] Auto-deploy failed:', deployErr); }
      }

      out.innerHTML = '<div style="padding:4px 0;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:#1a2e1a;border:1px solid #2d5a2d;border-radius:4px;">' +
        '<span style="font-size:20px;">\u2705</span>' +
        '<div><div style="font-size:13px;font-weight:600;color:#4ec9b0;">BUILD SUCCESS</div>' +
        '<div style="font-size:11px;color:#888;">' + esc(task) + ' completed in ' + elapsed + 's</div></div></div>' +
        (r.apk_path ? '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#252526;border-radius:3px;margin-bottom:6px;">' +
          '<span style="font-size:12px;">\uD83D\uDCE6</span><div><div style="font-size:10px;color:#666;">APK Output:</div>' +
          '<div style="font-size:11px;color:#4fc3f7;word-break:break-all;">' + esc(r.apk_path) + '</div></div></div>' : '') +
        '<details style="margin-top:6px;"><summary style="font-size:10px;color:#666;cursor:pointer;">Build log (' + r.stdout.length + ' chars)</summary>' +
        '<pre style="color:#888;margin-top:4px;white-space:pre-wrap;font-size:10px;max-height:200px;overflow-y:auto;">' + esc(r.stdout.slice(-3000)) + '</pre></details></div>';
    } else {
      // Parse errors from stderr
      const errorLines = (r.stderr || r.stdout || '').split('\n').filter((l: string) => l.includes('error:') || l.includes('ERROR') || l.includes('FAILURE') || l.includes('Exception'));
      const errorSummary = errorLines.slice(0, 5).map((l: string) => '<div style="color:#f44747;font-size:11px;margin-bottom:2px;">\u2022 ' + esc(l.trim()) + '</div>').join('');

      out.innerHTML = '<div style="padding:4px 0;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:#2e1a1a;border:1px solid #5a2d2d;border-radius:4px;">' +
        '<span style="font-size:20px;">\u274C</span>' +
        '<div><div style="font-size:13px;font-weight:600;color:#f44747;">BUILD FAILED</div>' +
        '<div style="font-size:11px;color:#888;">' + esc(task) + ' failed after ' + elapsed + 's</div></div></div>' +
        (errorSummary ? '<div style="padding:6px 8px;background:#1e1e1e;border-radius:3px;border-left:3px solid #f44747;margin-bottom:6px;">' +
          '<div style="font-size:10px;color:#f44747;margin-bottom:4px;font-weight:600;">Errors:</div>' + errorSummary + '</div>' : '') +
        '<details open style="margin-top:6px;"><summary style="font-size:10px;color:#666;cursor:pointer;">Full output</summary>' +
        '<pre style="color:#f44747;margin-top:4px;white-space:pre-wrap;font-size:10px;max-height:300px;overflow-y:auto;">' + esc((r.stderr || '').slice(-2000)) + '</pre>' +
        '<pre style="color:#888;white-space:pre-wrap;font-size:10px;max-height:200px;overflow-y:auto;">' + esc(r.stdout.slice(-2000)) + '</pre></details></div>';
    }
  } catch (e) {
    animationDone = true;
    clearInterval(stepInterval);
    clearInterval(timerInterval);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    out.innerHTML = '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#2e1a1a;border:1px solid #5a2d2d;border-radius:4px;">' +
      '<span style="font-size:20px;">\u274C</span>' +
      '<div><div style="font-size:13px;font-weight:600;color:#f44747;">BUILD ERROR</div>' +
      '<div style="font-size:11px;color:#888;">Failed after ' + elapsed + 's</div>' +
      '<div style="font-size:11px;color:#f44747;margin-top:4px;">' + esc(String(e)) + '</div></div></div>';
  }
}


// --- Normal Build UI (all ready) ---
function renderNormalBuildUI(container: HTMLElement, proj: string) {
  container.innerHTML = '<div style="padding:10px 12px;">' +
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:9px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Project</div>' +
    '<div style="font-size:11px;color:#b0b0b0;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:7px;word-break:break-all;border:1px solid rgba(255,255,255,0.06);font-family:\'Cascadia Code\',monospace;">' + esc(proj || 'No project open') + '</div></div>' +
    '<div style="display:flex;gap:6px;margin-bottom:12px;">' +
    '<button class="gr-btn ap-action-btn" data-task="assembleDebug" style="flex:1;padding:8px 12px;background:linear-gradient(135deg,#0e639c,#1a73e8);border:none;color:#fff;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 8px rgba(14,99,156,0.3);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> Debug</button>' +
    '<button class="gr-btn ap-action-btn" data-task="assembleRelease" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#d0d0d8;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> Release</button>' +
    '<button class="gr-btn ap-action-btn" data-task="clean" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#d0d0d8;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg> Clean</button></div>' +
    (selectedDevice ? '<button id="ap-run" class="ap-action-btn" style="width:100%;padding:10px;background:linear-gradient(135deg,#2d7a3a,#388e3c);border:none;color:#fff;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 8px rgba(56,142,60,0.25);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg> Build + Run on ' + esc(selectedDevice.model || selectedDevice.serial) + '</button>' : '<div style="padding:8px 12px;margin-bottom:12px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:7px;text-align:center;"><span style="font-size:10.5px;color:#555;">Select a device in Devices tab for Build & Run</span></div>') +
    '<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px;">' +
    '<button id="env-check-btn" class="ap-action-btn" style="padding:5px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:#6b7280;border-radius:6px;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> Environment</button>' +
    '<button id="guide-btn" class="ap-action-btn" style="padding:5px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:#6b7280;border-radius:6px;cursor:pointer;font-size:10px;display:flex;align-items:center;gap:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Help</button></div>' +
    '<div id="build-out" style="font-family:\'Cascadia Code\',monospace;font-size:11px;background:rgba(0,0,0,0.2);padding:10px 12px;border-radius:8px;max-height:400px;overflow-y:auto;color:#6b7280;border:1px solid rgba(255,255,255,0.04);">Ready</div></div>';

  container.querySelectorAll('.gr-btn').forEach(btn => {
    btn.addEventListener('click', () => runGradle(proj, (btn as HTMLElement).dataset.task || 'assembleDebug'));
  });

  container.querySelector('#env-check-btn')?.addEventListener('click', () => renderBuildTab());
  container.querySelector('#guide-btn')?.addEventListener('click', () => showAndroidGuide());

  document.getElementById('ap-run')?.addEventListener('click', async () => {
    if (!selectedDevice || !proj) return;
    const out = document.getElementById('build-out'); if (!out) return;
    const startTime = Date.now();
    const steps = [
      { icon: '\uD83D\uDD0D', text: 'Checking Gradle wrapper...' },
      { icon: '\u2699\uFE0F', text: 'Configuring project...' },
      { icon: '\uD83D\uDCE6', text: 'Resolving dependencies...' },
      { icon: '\uD83D\uDCBE', text: 'Downloading libraries...' },
      { icon: '\uD83D\uDD27', text: 'Compiling Kotlin sources...' },
      { icon: '\uD83C\uDFA8', text: 'Processing Compose UI...' },
      { icon: '\uD83D\uDCC4', text: 'Processing resources & manifest...' },
      { icon: '\uD83D\uDCE6', text: 'Packaging APK...' },
      { icon: '\uD83D\uDCF2', text: 'Installing on ' + esc(selectedDevice.model || selectedDevice.serial) + '...' },
      { icon: '\uD83D\uDE80', text: 'Launching app...' },
    ];
    out.innerHTML = '<div>' +
      '<div style="padding:8px 10px;background:#1a2733;border:1px solid #0e639c44;border-radius:4px;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span>\uD83D\uDCA1</span><span style="font-size:11px;color:#4fc3f7;font-weight:600;">First Build Info</span></div>' +
      '<div style="font-size:10px;color:#999;line-height:1.5;">First build takes <strong style="color:#dcdcaa;">2\u20135 min</strong> (downloads Gradle + Kotlin + Compose + deps).<br><span style="color:#4ec9b0;">\u26A1 Next runs will be <strong>10\u201330s</strong> \u2014 everything gets cached!</span></div></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      '<div id="run-spinner" style="width:18px;height:18px;border:2px solid #333;border-top:2px solid #388e3c;border-radius:50%;animation:bspin 0.8s linear infinite;"></div>' +
      '<div><div style="font-size:12px;color:#4ec9b0;font-weight:600;">\uD83D\uDE80 Build + Run on ' + esc(selectedDevice.model || selectedDevice.serial) + '</div>' +
      '<div id="run-timer" style="font-size:10px;color:#666;">0s</div></div></div>' +
      '<div style="height:3px;background:#252526;border-radius:2px;margin-bottom:10px;overflow:hidden;">' +
      '<div id="run-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#388e3c,#4ec9b0);border-radius:2px;transition:width 0.5s ease;"></div></div>' +
      '<div id="run-steps" style="margin-left:4px;border-left:2px solid #333;padding-left:10px;"></div>' +
      '<div id="run-pulse" style="display:flex;gap:4px;margin-top:8px;margin-left:16px;">' +
      '<div style="width:6px;height:6px;background:#4ec9b0;border-radius:50%;animation:pulse 1.4s ease-in-out infinite;"></div>' +
      '<div style="width:6px;height:6px;background:#4ec9b0;border-radius:50%;animation:pulse 1.4s ease-in-out 0.2s infinite;"></div>' +
      '<div style="width:6px;height:6px;background:#4ec9b0;border-radius:50%;animation:pulse 1.4s ease-in-out 0.4s infinite;"></div>' +
      '<span id="run-status" style="font-size:10px;color:#555;margin-left:6px;">Working...</span></div></div>' +
      '<style>@keyframes bspin{to{transform:rotate(360deg);}}@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8);}50%{opacity:1;transform:scale(1.2);}}@keyframes fadeSlideIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}</style>';
    const stepsEl=document.getElementById('run-steps'),timerEl=document.getElementById('run-timer'),barEl=document.getElementById('run-bar'),statusEl=document.getElementById('run-status');
    const timerInt=setInterval(()=>{const s=Math.floor((Date.now()-startTime)/1000);const m=Math.floor(s/60);if(timerEl)timerEl.textContent=(m>0?m+'m ':'')+s%60+'s elapsed';},1000);
    const barInt=setInterval(()=>{const e=(Date.now()-startTime)/1000;if(barEl)barEl.style.width=Math.min(92,Math.sqrt(e/300)*92)+'%';},500);
    const statusTexts=['Working...','Compiling...','Please wait...','Almost there...','Installing...','Launching...','Optimizing...'];
    let sIdx=0;const statusInt=setInterval(()=>{sIdx=(sIdx+1)%statusTexts.length;if(statusEl)statusEl.textContent=statusTexts[sIdx];},3000);
    let stepIdx=0,animDone=false;
    const extras=['\uD83D\uDD04 Gradle daemon running...','\u23F3 Downloading remaining deps...','\uD83D\uDCBE Caching for faster builds...','\uD83D\uDD27 Dexing classes...','\uD83D\uDCE6 Merging resources...','\u2699\uFE0F Optimizing bytecode...'];
    const stepInt=setInterval(()=>{if(animDone)return;if(stepIdx<steps.length){const s=steps[stepIdx];if(stepsEl){const prev=stepsEl.querySelectorAll('.rs-item');if(prev.length>0){const l=prev[prev.length-1] as HTMLElement;const ic=l.querySelector('.rs-icon') as HTMLElement;if(ic)ic.textContent='\u2705';l.style.opacity='0.6';}stepsEl.innerHTML+='<div class="rs-item" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;animation:fadeSlideIn 0.3s ease-out;"><span class="rs-icon" style="font-size:11px;">'+s.icon+'</span><span style="font-size:11px;color:#aaa;">'+s.text+'</span><div style="flex:1;"></div><div style="width:12px;height:12px;border:1.5px solid #333;border-top:1.5px solid #4ec9b0;border-radius:50%;animation:bspin 0.8s linear infinite;"></div></div>';stepsEl.scrollTop=stepsEl.scrollHeight;}stepIdx++;}else{if(stepsEl){const ex=extras[Math.floor(Math.random()*extras.length)];stepsEl.innerHTML+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;animation:fadeSlideIn 0.3s ease-out;"><span style="font-size:11px;color:#555;">'+ex+'</span></div>';stepsEl.scrollTop=stepsEl.scrollHeight;}}},2500);
    try {
      const r = await invoke('android_build_and_run', { projectPath: proj, deviceId: selectedDevice.serial, buildType: 'debug' }) as string;
      animDone=true;clearInterval(stepInt);clearInterval(timerInt);clearInterval(barInt);clearInterval(statusInt);
      const el=((Date.now()-startTime)/1000);const es=el>=60?Math.floor(el/60)+'m '+Math.floor(el%60)+'s':el.toFixed(1)+'s';
      out.innerHTML='<div style="padding:4px 0;">'+
        '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:linear-gradient(135deg,#1a2e1a,#1e2e1e);border:1px solid #2d5a2d;border-radius:6px;margin-bottom:10px;">'+
        '<div style="font-size:28px;">\u2705</div>'+
        '<div><div style="font-size:14px;font-weight:700;color:#4ec9b0;">DEPLOYED SUCCESSFULLY</div>'+
        '<div style="font-size:11px;color:#888;">Built + installed + launched in '+es+'</div>'+
        '<div style="font-size:11px;color:#4fc3f7;margin-top:2px;">Running on '+esc(selectedDevice.model||selectedDevice.serial)+'</div></div></div>'+
        (el>30?'<div style="padding:6px 10px;background:#252526;border-radius:3px;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span>\u26A1</span><span style="font-size:10px;color:#4ec9b0;">Dependencies cached. Next deploy will be much faster!</span></div>':'')+
        '<pre style="color:#888;font-size:10px;background:#1a1a1a;padding:6px;border-radius:3px;max-height:150px;overflow-y:auto;white-space:pre-wrap;">'+esc(r)+'</pre></div>';
    } catch (e) {
      animDone=true;clearInterval(stepInt);clearInterval(timerInt);clearInterval(barInt);clearInterval(statusInt);
      const el=((Date.now()-startTime)/1000).toFixed(1);
      out.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:12px;background:linear-gradient(135deg,#2e1a1a,#2e1e1e);border:1px solid #5a2d2d;border-radius:6px;">'+
        '<div style="font-size:28px;">\u274C</div>'+
        '<div><div style="font-size:14px;font-weight:700;color:#f44747;">DEPLOY FAILED</div>'+
        '<div style="font-size:11px;color:#888;">Failed after '+el+'s</div>'+
        '<div style="font-size:11px;color:#f44747;margin-top:4px;max-height:200px;overflow-y:auto;">'+esc(String(e))+'</div></div></div>';
    }
  });
}

// --- Android Help & Guide ---
function showAndroidGuide() {
  const b = body(); if (!b) return;

  b.innerHTML = '<div style="padding:8px;overflow-y:auto;max-height:calc(100vh - 120px);">' +

    // Header
    '<div style="text-align:center;padding:10px 0 8px;border-bottom:1px solid #333;margin-bottom:10px;position:relative;">' +
    '<div style="font-size:28px;margin-bottom:4px;">\uD83D\uDCF1</div>' +
    '<div style="font-size:14px;font-weight:600;color:#e0e0e0;">Android Development Guide</div><button id="guide-close-x" style="position:absolute;right:8px;top:8px;background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:2px 6px;">&times;</button>' +
    '<div style="font-size:11px;color:#888;">Everything you need to build Android apps</div></div>' +

    // Quick Start
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\u26A1 Quick Start <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #0e639c;">' +
    '<div style="font-size:11px;color:#aaa;line-height:1.6;">' +
    '<div style="margin-bottom:4px;"><span style="color:#4ec9b0;">1.</span> Open Android panel <kbd style="background:#333;padding:1px 4px;border-radius:2px;font-size:10px;">Ctrl+Shift+D</kbd></div>' +
    '<div style="margin-bottom:4px;"><span style="color:#4ec9b0;">2.</span> Create new project: <span style="color:#dcdcaa;">Plugin \u2192 Android \u2192 New Project</span></div>' +
    '<div style="margin-bottom:4px;"><span style="color:#4ec9b0;">3.</span> Click <span style="color:#4fc3f7;">\uD83D\uDD28 Debug</span> to build your APK</div>' +
    '<div style="margin-bottom:4px;"><span style="color:#4ec9b0;">4.</span> Connect phone via USB (enable USB Debugging)</div>' +
    '<div style="margin-bottom:4px;"><span style="color:#4ec9b0;">5.</span> Click <span style="color:#4ec9b0;">\uD83D\uDE80 Build + Run</span> to deploy to device</div>' +
    '</div></div></div>' +

    // Requirements
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\uD83D\uDCCB Requirements <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #0e639c;">' +
    '<table style="font-size:11px;color:#aaa;width:100%;border-collapse:collapse;">' +
    '<tr><td style="padding:3px 8px 3px 0;color:#dcdcaa;white-space:nowrap;">JDK 17</td><td style="padding:3px 0;">Java Development Kit (OpenJDK recommended)</td></tr>' +
    '<tr><td style="padding:3px 8px 3px 0;color:#dcdcaa;white-space:nowrap;">Android SDK 34</td><td style="padding:3px 0;">Included with Android Studio</td></tr>' +
    '<tr><td style="padding:3px 8px 3px 0;color:#dcdcaa;white-space:nowrap;">Build Tools 34</td><td style="padding:3px 0;">Compiles and packages your app</td></tr>' +
    '<tr><td style="padding:3px 8px 3px 0;color:#dcdcaa;white-space:nowrap;">Gradle Wrapper</td><td style="padding:3px 0;">Auto-included in project templates</td></tr>' +
    '<tr><td style="padding:3px 8px 3px 0;color:#dcdcaa;white-space:nowrap;">ADB</td><td style="padding:3px 0;">For device deploy (optional for build)</td></tr>' +
    '</table>' +
    '<div style="margin-top:6px;padding:6px;background:#1a2733;border-radius:3px;font-size:10px;color:#4fc3f7;">' +
    '\uD83D\uDCA1 Easiest setup: Install <strong>Android Studio</strong> \u2014 it includes everything above.</div>' +
    '</div></div>' +

    // Installation Guide
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\uD83D\uDCE6 Installation Guide <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #0e639c;font-size:11px;color:#aaa;line-height:1.6;">' +

    '<div style="font-weight:600;color:#dcdcaa;margin:6px 0 3px;">Option A: Android Studio (Recommended)</div>' +
    '<div style="background:#1e1e1e;padding:6px 8px;border-radius:3px;font-family:\'Cascadia Code\',monospace;font-size:10px;color:#ce9178;margin-bottom:6px;">winget install Google.AndroidStudio</div>' +
    '<div style="margin-bottom:8px;">Then open Android Studio \u2192 Follow Setup Wizard \u2192 Choose "Standard" \u2192 Wait for SDK download</div>' +

    '<div style="font-weight:600;color:#dcdcaa;margin:6px 0 3px;">Option B: Manual Setup</div>' +
    '<div style="background:#1e1e1e;padding:6px 8px;border-radius:3px;font-family:\'Cascadia Code\',monospace;font-size:10px;color:#ce9178;margin-bottom:4px;">' +
    'winget install Microsoft.OpenJDK.17<br>' +
    'setx JAVA_HOME "C:\\Program Files\\Microsoft\\jdk-17..."<br>' +
    'setx ANDROID_HOME "%LOCALAPPDATA%\\Android\\Sdk"</div>' +

    '<div style="font-weight:600;color:#dcdcaa;margin:8px 0 3px;">Environment Variables</div>' +
    '<table style="font-size:10px;color:#888;width:100%;border-collapse:collapse;">' +
    '<tr><td style="padding:2px 6px 2px 0;color:#ce9178;font-family:monospace;">JAVA_HOME</td><td style="padding:2px 0;">Path to JDK installation</td></tr>' +
    '<tr><td style="padding:2px 6px 2px 0;color:#ce9178;font-family:monospace;">ANDROID_HOME</td><td style="padding:2px 0;">Path to Android SDK folder</td></tr>' +
    '</table>' +
    '<div style="margin-top:4px;font-size:10px;color:#666;">\uD83D\uDD27 Use Environment Setup button to auto-detect & fix these</div>' +
    '</div></div>' +

    // Features
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\u2728 Features <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #0e639c;font-size:11px;color:#aaa;line-height:1.6;">' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Build</strong> \u2014 Debug & Release APK builds via Gradle</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Devices</strong> \u2014 USB & wireless device management</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Deploy</strong> \u2014 One-click build, install & launch on device</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Logcat</strong> \u2014 Real-time device log viewer with filters</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Setup Wizard</strong> \u2014 Auto-detect & install missing components</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Gradle Scripts</strong> \u2014 Menu bar dropdown with all tasks</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Arduino Bridge</strong> \u2014 Connect Android + Arduino projects</div>' +
    '<div style="margin-bottom:3px;">\u2705 <strong>Templates</strong> \u2014 Kotlin + Jetpack Compose + Material 3</div>' +
    '</div></div>' +

    // Limitations
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#dcdcaa;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\u26A0\uFE0F Limitations <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #dcdcaa;font-size:11px;color:#aaa;line-height:1.6;">' +
    '<div style="margin-bottom:3px;">\u2022 Windows only (macOS/Linux planned)</div>' +
    '<div style="margin-bottom:3px;">\u2022 No built-in emulator \u2014 use Android Studio emulator or physical device</div>' +
    '<div style="margin-bottom:3px;">\u2022 No XML layout editor \u2014 use Compose (code-based UI) instead</div>' +
    '<div style="margin-bottom:3px;">\u2022 No APK signing wizard \u2014 use Gradle signing config in build.gradle.kts</div>' +
    '<div style="margin-bottom:3px;">\u2022 No visual Gradle dependency manager \u2014 edit build.gradle.kts directly</div>' +
    '<div style="margin-bottom:3px;">\u2022 First build takes longer (downloads Gradle + dependencies)</div>' +
    '</div></div>' +

    // Troubleshooting
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#f44747;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\uD83D\uDD27 Troubleshooting <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="padding-left:8px;border-left:2px solid #f44747;font-size:11px;color:#aaa;">' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">Build fails: "compileSdk version X required"</div>' +
    '<div style="color:#888;font-size:10px;">Install the required SDK platform via Android Studio SDK Manager, or click \uD83D\uDD27 Environment Setup to auto-adapt.</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">Build fails: "JAVA_HOME not set"</div>' +
    '<div style="color:#888;font-size:10px;">Click \uD83D\uDD27 Environment Setup \u2192 it will auto-detect and set JAVA_HOME. Or manually: setx JAVA_HOME "C:\\Program Files\\Microsoft\\jdk-17..."</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">No devices showing in Devices tab</div>' +
    '<div style="color:#888;font-size:10px;">1. Enable USB Debugging on phone (Settings \u2192 Developer Options)<br>2. Connect USB cable<br>3. Accept "Allow USB Debugging" popup on phone<br>4. Click Refresh in Devices tab</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">Wireless debugging not connecting</div>' +
    '<div style="color:#888;font-size:10px;">Phone and PC must be on same WiFi network. Go to Developer Options \u2192 Wireless Debugging \u2192 Pair device with pairing code.</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">Build slow or downloading every time</div>' +
    '<div style="color:#888;font-size:10px;">First build downloads Gradle + all dependencies (~200MB). Subsequent builds are much faster. Check your internet connection if it seems stuck.</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">App installs but crashes on launch</div>' +
    '<div style="color:#888;font-size:10px;">Check Logcat tab for crash details. Common causes: missing permissions in AndroidManifest.xml, or minSdk too high for your device.</div></div>' +

    '<div style="margin-bottom:8px;padding:6px;background:#1e1e1e;border-radius:3px;">' +
    '<div style="color:#f44747;font-weight:600;margin-bottom:2px;">gradle-wrapper.jar missing</div>' +
    '<div style="color:#888;font-size:10px;">Click \uD83D\uDD27 Environment Setup \u2192 it auto-downloads the jar. Or manually download from gradle.org.</div></div>' +

    '</div></div>' +

    // USB Debugging Guide
    '<div style="margin-bottom:12px;">' +
    '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">\uD83D\uDCF2 Enable USB Debugging <span style="font-size:10px;color:#666;">\u25BC</span></div>' +
    '<div style="display:none;padding-left:8px;border-left:2px solid #0e639c;font-size:11px;color:#aaa;line-height:1.6;">' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">1.</span> Go to <strong>Settings \u2192 About Phone</strong></div>' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">2.</span> Tap <strong>Build Number</strong> 7 times</div>' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">3.</span> Go back to <strong>Settings \u2192 Developer Options</strong></div>' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">4.</span> Enable <strong>USB Debugging</strong></div>' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">5.</span> Connect phone via USB cable</div>' +
    '<div style="margin-bottom:3px;"><span style="color:#4ec9b0;">6.</span> Tap <strong>Allow</strong> on the USB debugging popup</div>' +
    '</div></div>' +

    // Buttons
    '<div style="display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #333;">' +
    '<button id="guide-back-btn" style="flex:1;padding:8px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">\u2190 Back to Build</button>' +
    '<button id="guide-setup-btn" style="flex:1;padding:8px;background:#333;border:1px solid #555;color:#ccc;border-radius:4px;cursor:pointer;font-size:11px;">\uD83D\uDD27 Environment Setup</button></div>' +

    '</div>';

  b.querySelector('#guide-back-btn')?.addEventListener('click', () => renderBuildTab());
  b.querySelector('#guide-close-x')?.addEventListener('click', () => renderBuildTab());
  b.querySelector('#guide-setup-btn')?.addEventListener('click', () => renderBuildTab());
}


// ============================================================================
// 🔌 BRIDGE TAB (Android + Arduino)
// ============================================================================

// --- Android Panel AI Message ---
async function sendAndroidPanelMessage(title: string, icon: string, description: string, prompt: string) {
  const addMsg = (window as any).addMessageToChat;
  const send = (window as any).sendMessageDirectly;

  // Show styled block as system message (supports HTML rendering)
  if (addMsg) {
    const styledHtml = '<div class="android-panel-action" style="background:linear-gradient(135deg,#1a2733,#1e2830);border:1px solid #0e639c;border-radius:8px;padding:12px;margin:4px 0;max-width:500px;">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
      '<div style="width:36px;height:36px;background:linear-gradient(135deg,#0e639c,#1177bb);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' + icon + '</div>' +
      '<div><div style="font-size:13px;font-weight:700;color:#4fc3f7;">' + title + '</div>' +
      '<div style="font-size:10px;color:#666;display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:6px;height:6px;background:#4ec9b0;border-radius:50%;"></span> Android Panel</div></div></div>' +
      (description ? '<div style="font-size:11px;color:#bbb;line-height:1.6;padding:10px;background:#1e1e1e;border-radius:6px;border-left:3px solid #0e639c;">' + description + '</div>' : '') +
      '</div>';
    await addMsg('system', styledHtml);
  }

  // Auto-enable AI Project Search + File Explorer before sending
  if (prompt) {
    try {
      // 1. Enable AI File Explorer (the star button)
      localStorage.setItem('aiFileExplorerEnabled', 'true');
      (window as any).aiFileExplorerEnabled = true;

      // 2. Trigger project scan so AI sees all files
      const afe = (window as any).aiFileExplorer;
      if (afe && afe.scanProject) { afe.scanProject(); }

      // 3. Update the star button UI to show active state
      const starBtn = document.querySelector('[data-action="toggle-ai-search"], .ai-search-toggle, #ai-search-btn');
      if (starBtn) {
        (starBtn as HTMLElement).style.color = '#4ec9b0';
        starBtn.classList.add('active');
      }

      // 4. Dispatch storage event so other modules sync
      window.dispatchEvent(new StorageEvent('storage', { key: 'aiFileExplorerEnabled', newValue: 'true' }));

      (window as any).__bridgeAutoEnabled = true;
      console.log('[Bridge] Auto-enabled AI Project Search for IoT generation');
      // Clear flag after toolbar settles
      setTimeout(() => { (window as any).__bridgeAutoEnabled = false; }, 3000);
    } catch(e) { console.log('[Bridge] AI Search enable error:', e); }

    // 5. Enable Autonomous/Auto Mode (only if currently OFF)
    try {
      const isAutoActive = (window as any).__isAutonomousModeActive || false;
      if (!isAutoActive) {
        // Method 1: Click the toggle button (handles all state + UI)
        const autoBtn = document.querySelector('.autonomous-mode-toggle') ||
                        document.getElementById('autonomous-mode-toggle');
        if (autoBtn) {
          (autoBtn as HTMLElement).click();
          console.log('[Bridge] Auto Mode activated via toggle button');
        }
        // Method 2: Call toggleAutonomousMode directly
        else if (typeof (window as any).toggleAutonomousMode === 'function') {
          (window as any).toggleAutonomousMode();
          console.log('[Bridge] Auto Mode activated via toggleAutonomousMode()');
        }
      } else {
        console.log('[Bridge] Auto Mode already active, skipping');
      }
    } catch(e) { console.log('[Bridge] Auto Mode enable error:', e); }
  }

  // Trigger AI to process the actual prompt
  if (prompt && send) {
    await send(prompt);
  }
}

async function loadBridgeTab() {
  const b = body(); if (!b) return;
  b.innerHTML = '<div style="color:#4fc3f7;text-align:center;padding:20px;">Checking bridge...</div>';
  try {
    const s = await invoke('android_arduino_bridge_status') as any;
    // Inject animations
    if (!document.getElementById('bridge-animations')) {
      const style = document.createElement('style');
      style.id = 'bridge-animations';
      style.textContent = `
        @keyframes bridgeFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bridgePulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes bridgeGlow { 0%,100% { box-shadow:0 0 4px #0e639c33; } 50% { box-shadow:0 0 12px #0e639c66; } }
        @keyframes bridgeFlow { 0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
        @keyframes bridgeDot { 0%,20% { opacity:0.3; } 10% { opacity:1; } }
        .bridge-section { animation: bridgeFadeIn 0.3s ease-out both; }
        .bridge-section:nth-child(2) { animation-delay: 0.05s; }
        .bridge-section:nth-child(3) { animation-delay: 0.1s; }
        .bridge-section:nth-child(4) { animation-delay: 0.15s; }
        .bridge-section:nth-child(5) { animation-delay: 0.2s; }
        .bridge-section:nth-child(6) { animation-delay: 0.25s; }
        .bridge-section:nth-child(7) { animation-delay: 0.3s; }
        .bridge-btn { transition: all 0.2s ease; position:relative; overflow:hidden; }
        .bridge-btn:hover { transform:translateY(-1px); filter:brightness(1.2); }
        .bridge-btn:active { transform:translateY(0); filter:brightness(0.9); }
        .bridge-btn::after { content:''; position:absolute; top:50%; left:50%; width:0; height:0; background:rgba(255,255,255,0.15); border-radius:50%; transform:translate(-50%,-50%); transition:width 0.4s,height 0.4s; }
        .bridge-btn:active::after { width:200px; height:200px; }
        .bridge-device-card { transition: all 0.2s ease; cursor:default; }
        .bridge-device-card:hover { border-color:#0e639c !important; background:#252530 !important; transform:translateX(2px); }
        .bridge-coming-card { transition: all 0.2s ease; }
        .bridge-coming-card:hover { opacity:1 !important; border-color:#dcdcaa55 !important; }
        .arch-flow-dot { display:inline-block; animation: bridgeDot 2s infinite; }
        .arch-flow-dot:nth-child(2) { animation-delay:0.4s; }
        .arch-flow-dot:nth-child(3) { animation-delay:0.8s; }
        .arch-flow-dot:nth-child(4) { animation-delay:1.2s; }
      `;
      document.head.appendChild(style);
    }

    b.innerHTML = `
      <div style="padding:2px 0;">

        <!-- HEADER -->
        <div class="bridge-section" style="text-align:center;padding:10px 0 8px;background:linear-gradient(180deg,#1a2733 0%,transparent 100%);border-radius:6px;margin-bottom:6px;">
          <div style="font-size:15px;font-weight:700;color:#e0e0e0;letter-spacing:0.5px;">IoT Bridge</div>
          <div style="font-size:10px;color:#888;margin-top:2px;">Android \u2194 Hardware Devices</div>
        </div>

        <!-- STATUS ROW -->
        <div class="bridge-section" style="display:flex;gap:5px;margin-bottom:8px;">
          <div style="flex:1;padding:6px;background:linear-gradient(135deg,#2d2d2d,#252526);border:1px solid ${s.android_devices > 0 ? '#4ec9b044' : '#333'};border-radius:6px;text-align:center;">
            <div style="font-size:16px;">${s.android_devices > 0 ? '\u{1F4F1}' : '\u{1F4F1}'}</div>
            <div style="font-size:9px;color:${s.android_devices > 0 ? '#4ec9b0' : '#666'};margin-top:2px;font-weight:600;">${s.android_devices > 0 ? s.android_devices + ' Connected' : 'No Device'}</div>
          </div>
          <div style="flex:1;padding:6px;background:linear-gradient(135deg,#2d2d2d,#252526);border:1px solid ${s.arduino_cli_available ? '#00979D44' : '#333'};border-radius:6px;text-align:center;">
            <div style="font-size:16px;">\u{1F527}</div>
            <div style="font-size:9px;color:${s.arduino_cli_available ? '#4ec9b0' : '#666'};margin-top:2px;font-weight:600;">${s.arduino_cli_available ? 'CLI Ready' : 'CLI Missing'}</div>
          </div>
          <div style="flex:1;padding:6px;background:${s.bridge_ready ? 'linear-gradient(135deg,#1b3a2a,#1e2e1e)' : 'linear-gradient(135deg,#2d2d2d,#252526)'};border:1px solid ${s.bridge_ready ? '#4ec9b0' : '#333'};border-radius:6px;text-align:center;${s.bridge_ready ? 'animation:bridgeGlow 3s infinite;' : ''}">
            <div style="font-size:9px;font-weight:700;color:${s.bridge_ready ? '#4ec9b0' : '#666'};">${s.bridge_ready ? '\u2705 READY' : '\u23F3 SETUP'}</div>
          </div>
        </div>

        <!-- AVAILABLE NOW -->
        <div class="bridge-section" style="margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;color:#4fc3f7;margin-bottom:5px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.8px;">
            <span style="display:inline-block;width:6px;height:6px;background:#4ec9b0;border-radius:50%;animation:bridgePulse 2s infinite;"></span> Available Now</div>
          <div class="bridge-device-card" style="display:flex;align-items:center;gap:10px;padding:10px;background:linear-gradient(135deg,#252526,#2a2d2e);border:1px solid #00979D44;border-radius:6px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#00979D22,#00979D11);border:1px solid #00979D55;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">\u{1F527}</div>
            <div style="flex:1;"><div style="font-size:12px;font-weight:600;color:#e0e0e0;">Arduino</div><div style="font-size:9px;color:#888;margin-top:1px;">Uno \u2022 Nano \u2022 Mega \u2022 Leonardo</div></div>
            <div style="text-align:right;"><div style="font-size:9px;color:#00979D;font-weight:600;">Serial/USB</div><div style="font-size:8px;color:#4ec9b0;font-weight:700;">\u2713 Active</div></div>
          </div>
        </div>

        <!-- CREATE IOT PROJECT + PORT BUTTONS -->
        <div class="bridge-section" style="margin-bottom:8px;">
          <button id="br-project" class="bridge-btn" style="width:100%;padding:9px;background:linear-gradient(135deg,#0e639c,#1177bb);border:none;color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;letter-spacing:0.3px;margin-bottom:5px;">\u{1F680} Create IoT Project</button>
          ${s.bridge_ready ? `<div style="display:flex;gap:4px;">
            <button id="br-reverse" class="bridge-btn" style="flex:1;padding:6px;background:linear-gradient(135deg,#333,#2d2d2d);border:1px solid #444;color:#ccc;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;">\u{1F504} Reverse Port</button>
            <button id="br-forward" class="bridge-btn" style="flex:1;padding:6px;background:linear-gradient(135deg,#333,#2d2d2d);border:1px solid #444;color:#ccc;border-radius:4px;cursor:pointer;font-size:10px;font-weight:600;">\u27A1 Forward Port</button>
          </div>` : ''}
        </div>

        <!-- ARCHITECTURE -->
        <div class="bridge-section" style="padding:10px;background:linear-gradient(135deg,#1a2733,#1e1e2e);border:1px solid #0e639c33;border-radius:6px;margin-bottom:10px;">
          <div style="font-size:9px;font-weight:700;color:#4fc3f7;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Architecture</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
            <div style="padding:4px 8px;background:#0e639c22;border:1px solid #0e639c44;border-radius:4px;font-size:9px;color:#4fc3f7;font-weight:600;">\u{1F4F1} Android</div>
            <span class="arch-flow-dot" style="color:#0e639c;font-size:10px;">\u2192</span>
            <div style="padding:4px 8px;background:#4ec9b022;border:1px solid #4ec9b044;border-radius:4px;font-size:9px;color:#4ec9b0;font-weight:600;">adb</div>
            <span class="arch-flow-dot" style="color:#4ec9b0;font-size:10px;">\u2192</span>
            <div style="padding:4px 8px;background:#dcdcaa22;border:1px solid #dcdcaa44;border-radius:4px;font-size:9px;color:#dcdcaa;font-weight:600;">\u{1F5A5} X02</div>
            <span class="arch-flow-dot" style="color:#dcdcaa;font-size:10px;">\u2192</span>
            <div style="padding:4px 8px;background:#ce914822;border:1px solid #ce914844;border-radius:4px;font-size:9px;color:#ce9148;font-weight:600;">Serial</div>
            <span class="arch-flow-dot" style="color:#ce9148;font-size:10px;">\u2192</span>
            <div style="padding:4px 8px;background:#00979D22;border:1px solid #00979D44;border-radius:4px;font-size:9px;color:#00979D;font-weight:600;">\u{1F527} Device</div>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="bridge-section" style="border-top:1px solid #333;margin:4px 0;"></div>

        <!-- COMING SOON -->
        <div class="bridge-section" style="margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;color:#dcdcaa;margin-bottom:5px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.8px;">
            <span style="display:inline-block;width:6px;height:6px;background:#dcdcaa;border-radius:50%;"></span> Coming Soon</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div class="bridge-coming-card" style="padding:6px;background:#252526;border:1px solid #333;border-radius:4px;opacity:0.7;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;">\u{1F4E1}</span><span style="font-size:10px;font-weight:600;color:#ccc;">ESP32</span></div><div style="font-size:7px;color:#555;">WiFi / BLE / Serial</div></div>
            <div class="bridge-coming-card" style="padding:6px;background:#252526;border:1px solid #333;border-radius:4px;opacity:0.7;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;">\u{1F4A0}</span><span style="font-size:10px;font-weight:600;color:#ccc;">RPi Pico</span></div><div style="font-size:7px;color:#555;">MicroPython</div></div>
            <div class="bridge-coming-card" style="padding:6px;background:#252526;border:1px solid #333;border-radius:4px;opacity:0.7;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;">\u2699</span><span style="font-size:10px;font-weight:600;color:#ccc;">STM32</span></div><div style="font-size:7px;color:#555;">Serial / SWD</div></div>
            <div class="bridge-coming-card" style="padding:6px;background:#252526;border:1px solid #333;border-radius:4px;opacity:0.7;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;">\u{1F3AE}</span><span style="font-size:10px;font-weight:600;color:#ccc;">Micro:bit</span></div><div style="font-size:7px;color:#555;">BLE / Serial</div></div>
            <div class="bridge-coming-card" style="padding:6px;background:#252526;border:1px solid #333;border-radius:4px;opacity:0.7;"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;"><span style="font-size:11px;">\u26A1</span><span style="font-size:10px;font-weight:600;color:#ccc;">Teensy</span></div><div style="font-size:7px;color:#555;">USB / MIDI</div></div>
          </div>
        </div>

        <!-- PLANNED -->
        <div class="bridge-section">
          <div style="font-size:10px;font-weight:700;color:#c586c0;margin-bottom:5px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.8px;">
            <span style="display:inline-block;width:6px;height:6px;background:#c586c0;border-radius:50%;"></span> Planned</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
            <div style="padding:5px;background:#1e1e1e;border:1px solid #2d2d2d;border-radius:4px;text-align:center;opacity:0.5;"><div style="font-size:13px;">\u{1F353}</div><div style="font-size:8px;font-weight:600;color:#999;">RPi</div></div>
            <div style="padding:5px;background:#1e1e1e;border:1px solid #2d2d2d;border-radius:4px;text-align:center;opacity:0.5;"><div style="font-size:13px;">\u{1F916}</div><div style="font-size:8px;font-weight:600;color:#999;">Jetson</div></div>
            <div style="padding:5px;background:#1e1e1e;border:1px solid #2d2d2d;border-radius:4px;text-align:center;opacity:0.5;"><div style="font-size:13px;">\u{1F436}</div><div style="font-size:8px;font-weight:600;color:#999;">Beagle</div></div>
          </div>
        </div>

      </div>`;

    // Create IoT Project
    document.getElementById('br-project')?.addEventListener('click', () => {
      const existing = document.getElementById('bridge-project-form');
      if (existing) { existing.remove(); return; }
      const form = document.createElement('div');
      form.id = 'bridge-project-form';
      form.style.cssText = 'margin-top:8px;padding:10px;background:#1a2733;border:1px solid #0e639c;border-radius:6px;';
      form.innerHTML = '<div style="font-size:12px;font-weight:600;color:#4fc3f7;margin-bottom:6px;">\u{1F680} Create IoT Project</div>' +
        '<div style="font-size:10px;color:#666;margin-bottom:6px;">Target device:</div>' +
        '<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;" id="device-select">' +
        '<button class="dev-sel selected" data-dev="arduino" style="padding:4px 10px;background:#00979D33;border:1px solid #00979D;color:#4ec9b0;border-radius:3px;cursor:pointer;font-size:10px;">\u{1F527} Arduino</button>' +
        '<button class="dev-sel" data-dev="esp32" style="padding:4px 10px;background:#252526;border:1px solid #444;color:#888;border-radius:3px;cursor:pointer;font-size:10px;">\u{1F4E1} ESP32</button>' +
        '<button class="dev-sel" data-dev="pico" style="padding:4px 10px;background:#252526;border:1px solid #444;color:#888;border-radius:3px;cursor:pointer;font-size:10px;">\u{1F4A0} Pico</button>' +
        '<button class="dev-sel" data-dev="raspi" style="padding:4px 10px;background:#252526;border:1px solid #444;color:#888;border-radius:3px;cursor:pointer;font-size:10px;">\u{1F353} RPi</button>' +
        '<button class="dev-sel" data-dev="stm32" style="padding:4px 10px;background:#252526;border:1px solid #444;color:#888;border-radius:3px;cursor:pointer;font-size:10px;">\u2699 STM32</button></div>' +
        '<textarea id="bridge-desc" placeholder="Describe your IoT project...\nExample: Temperature monitor, LED controller, robot car..." style="width:100%;min-height:50px;background:#1e1e1e;border:1px solid #444;border-radius:4px;color:#ccc;padding:8px;font-size:11px;font-family:inherit;resize:vertical;box-sizing:border-box;"></textarea>' +
        '<div style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;">' +
        '<button class="bridge-idea" data-idea="Temperature monitor with DHT22 showing live readings" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F321} Temp</button>' +
        '<button class="bridge-idea" data-idea="LED strip controller with color picker and brightness" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F4A1} LED</button>' +
        '<button class="bridge-idea" data-idea="Soil moisture monitor with automatic plant watering" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F331} Plant</button>' +
        '<button class="bridge-idea" data-idea="Robot car with joystick control, motor speed and direction" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F697} Car</button>' +
        '<button class="bridge-idea" data-idea="Smart door lock with RFID and remote unlock" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F512} Lock</button>' +
        '<button class="bridge-idea" data-idea="Weather station with BME280 - temp, humidity, pressure" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u26C5 Weather</button>' +
        '<button class="bridge-idea" data-idea="Motion detector with PIR sensor and push notifications" style="padding:2px 6px;background:#252526;border:1px solid #333;color:#888;border-radius:3px;cursor:pointer;font-size:9px;">\u{1F440} Motion</button></div>' +
        '<div style="display:flex;gap:6px;">' +
        '<button id="bridge-gen" style="flex:1;padding:7px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">\u{1F680} Generate</button>' +
        '<button id="bridge-cancel" style="padding:7px 12px;background:#333;border:1px solid #555;color:#888;border-radius:4px;cursor:pointer;font-size:11px;">Cancel</button></div>';
      document.getElementById('br-project')?.after(form);
      let selectedDev = 'arduino';
      form.querySelectorAll('.dev-sel').forEach(btn => {
        btn.addEventListener('click', () => {
          form.querySelectorAll('.dev-sel').forEach(b => { (b as HTMLElement).style.background='#252526'; (b as HTMLElement).style.borderColor='#444'; (b as HTMLElement).style.color='#888'; });
          (btn as HTMLElement).style.background='#0e639c33'; (btn as HTMLElement).style.borderColor='#0e639c'; (btn as HTMLElement).style.color='#4fc3f7';
          selectedDev = (btn as HTMLElement).dataset.dev || 'arduino';
        });
      });
      form.querySelectorAll('.bridge-idea').forEach(btn => { btn.addEventListener('click', () => { const ta = document.getElementById('bridge-desc') as HTMLTextAreaElement; if (ta) ta.value = (btn as HTMLElement).dataset.idea || ''; }); });
      document.getElementById('bridge-cancel')?.addEventListener('click', () => form.remove());
      document.getElementById('bridge-gen')?.addEventListener('click', async () => {
        const desc = (document.getElementById('bridge-desc') as HTMLTextAreaElement)?.value?.trim();
        if (!desc) return;
        const genBtn = document.getElementById('bridge-gen') as HTMLButtonElement;
        if (genBtn) { genBtn.disabled=true; genBtn.innerHTML='\u{1F50D} Searching X02 memory...'; genBtn.style.opacity='0.7'; }
        const devNames: Record<string,string> = { arduino:'Arduino', esp32:'ESP32', pico:'Raspberry Pi Pico', raspi:'Raspberry Pi', stm32:'STM32' };
        const devLang: Record<string,string> = { arduino:'Arduino C++', esp32:'Arduino/ESP-IDF C++', pico:'MicroPython', raspi:'Python', stm32:'C/HAL' };
        const dn = devNames[selectedDev]||'Arduino', dl = devLang[selectedDev]||'C++';
        let found = false;
        try {
          const cs=(window as any).conversationSearch, hs=(window as any).aiHistorySearch;
          if (cs&&cs.search) { const r=cs.search(dn+' '+desc); if(r&&r.length>0) found=true; }
          if (!found&&hs&&hs.searchHistory) { const r=hs.searchHistory(dn+' '+desc); if(r&&r.length>0) found=true; }
        } catch(e) {}
        if(genBtn){genBtn.innerHTML='\u{1F680} Generate';genBtn.disabled=false;genBtn.style.opacity='1';}
        const existH=document.getElementById('bridge-history-status'); if(existH)existH.remove();
        const hd=document.createElement('div'); hd.id='bridge-history-status';

        if (found) {
          hd.style.cssText='margin-top:8px;padding:10px;background:#1b3a2a;border:1px solid #4ec9b0;border-radius:6px;';
          hd.innerHTML='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'+
            '<div style="width:28px;height:28px;background:#4ec9b022;border:1px solid #4ec9b055;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;">\u{1F4DA}</div>'+
            '<div><div style="font-size:11px;font-weight:700;color:#4ec9b0;">Previous Project Found!</div>'+
            '<div style="font-size:9px;color:#888;">X02 memory has a similar project</div></div></div>'+
            '<div style="font-size:10px;color:#aaa;line-height:1.5;padding:6px 8px;background:#252526;border-radius:4px;margin-bottom:8px;border-left:3px solid #4ec9b0;">'+
            'A similar <strong style="color:#4fc3f7;">'+dn+'</strong> project was found in your conversation history. '+
            'You can continue building on it or start completely fresh.</div>'+
            '<div style="display:flex;gap:6px;">'+
            '<button id="bridge-continue" style="flex:1;padding:7px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">\u{1F504} Continue Previous</button>'+
            '<button id="bridge-fresh" style="flex:1;padding:7px;background:#333;border:1px solid #555;color:#ccc;border-radius:4px;cursor:pointer;font-size:11px;">\u2728 Start Fresh</button></div>';
          genBtn?.parentElement?.after(hd);
          document.getElementById('bridge-continue')?.addEventListener('click',()=>{form.remove();sendAndroidPanelMessage('Continue '+dn+' Project','\u{1F504}','Continuing from X02 memory:<br><strong>'+dn+'</strong> \u2022 '+desc.replace(/</g,'&lt;').replace(/\n/g,'<br>'),'Continue my previous '+dn+' project: '+desc+'. Search my conversation history and build on previous work. Generate: 1) '+dn+' firmware in '+dl+', 2) Android Kotlin+Compose UI, 3) Shared protocol.');});
          document.getElementById('bridge-fresh')?.addEventListener('click',()=>{form.remove();sendAndroidPanelMessage('New '+dn+' Project','\u2728','Starting fresh:<br><strong>'+dn+'</strong> \u2022 '+desc.replace(/</g,'&lt;').replace(/\n/g,'<br>'),'Create a brand new Android+'+dn+' IoT project: '+desc+'. Ignore previous conversations. Generate: 1) '+dn+' firmware in '+dl+', 2) Android Kotlin+Compose UI, 3) Shared JSON protocol. Include wiring diagram and setup.');});
        } else {
          hd.style.cssText='margin-top:8px;padding:10px;background:#1a2733;border:1px solid #0e639c55;border-radius:6px;';
          hd.innerHTML='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'+
            '<div style="width:28px;height:28px;background:#0e639c22;border:1px solid #0e639c55;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;">\u{1F195}</div>'+
            '<div><div style="font-size:11px;font-weight:700;color:#4fc3f7;">New Project</div>'+
            '<div style="font-size:9px;color:#888;">No similar project in X02 memory</div></div></div>'+
            '<div style="font-size:10px;color:#aaa;line-height:1.5;padding:6px 8px;background:#252526;border-radius:4px;margin-bottom:8px;border-left:3px solid #0e639c;">'+
            'This will be a new <strong style="color:#4fc3f7;">'+dn+'</strong> project. '+
            'AI will generate complete firmware + Android app from scratch.</div>'+
            '<div style="display:flex;gap:6px;">'+
            '<button id="bridge-proceed" style="flex:1;padding:7px;background:#0e639c;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">\u{1F680} Proceed</button>'+
            '<button id="bridge-back" style="padding:7px 12px;background:#333;border:1px solid #555;color:#888;border-radius:4px;cursor:pointer;font-size:11px;">\u{2190} Back</button></div>';
          genBtn?.parentElement?.after(hd);
          document.getElementById('bridge-proceed')?.addEventListener('click',()=>{form.remove();sendAndroidPanelMessage(dn+' IoT Project','\u{1F680}','<strong>'+dn+'</strong> \u2022 '+desc.replace(/</g,'&lt;').replace(/\n/g,'<br>'),'Create Android+'+dn+' IoT project: '+desc+'. Generate: 1) '+dn+' firmware in '+dl+' with Serial JSON, 2) Android Kotlin+Compose UI, 3) Shared JSON protocol. Include wiring diagram and setup instructions.');});
          document.getElementById('bridge-back')?.addEventListener('click',()=>{hd.remove();});
        }
      });
    });

    // Port buttons
    document.getElementById('br-reverse')?.addEventListener('click', async () => {
      if (!selectedDevice) { sendAndroidPanelMessage('Device Required','\u26A0','Select Android device in <strong>Devices</strong> tab first.',''); return; }
      try { await invoke('android_reverse_port',{deviceId:selectedDevice.serial,devicePort:8080,localPort:8080}); sendAndroidPanelMessage('Reverse Port Set','\u{1F504}','Device:8080 \u2192 localhost:8080',''); } catch(e) { sendAndroidPanelMessage('Error','\u274C',String(e).replace(/</g,'&lt;'),''); }
    });
    document.getElementById('br-forward')?.addEventListener('click', async () => {
      if (!selectedDevice) { sendAndroidPanelMessage('Device Required','\u26A0','Select Android device in <strong>Devices</strong> tab first.',''); return; }
      try { await invoke('android_forward_port',{deviceId:selectedDevice.serial,localPort:8080,remotePort:8080}); sendAndroidPanelMessage('Forward Port Set','\u27A1','localhost:8080 \u2192 Device:8080',''); } catch(e) { sendAndroidPanelMessage('Error','\u274C',String(e).replace(/</g,'&lt;'),''); }
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
    // Remove mirror toolbar when panel closes
    const mt = document.getElementById('mirror-ai-toolbar'); if (mt) mt.remove();
  },
  toggle() { if (panelVisible) this.hide(); else this.show(); },
  isVisible() { return panelVisible; },
  getSelectedDevice() { return selectedDevice; },
};

// ============================================================================
// 🎮 GAME PROJECT TEMPLATE — Snake Game (Kotlin + Jetpack Compose Canvas)
// ============================================================================

export async function createGameProject(basePath?: string) {
  let projPath = basePath || (window as any).currentFolderPath;
  if (!projPath) {
    // Auto-create default Android projects folder on Desktop
    try {
      const rawHome = (window as any).__systemInfo?.home_dir || ('C:/Users/' + ((window as any).__systemInfo?.username || 'user'));
      const homeDir = String(rawHome).split('\\').join('/').split('//').join('/');
      projPath = homeDir + '/Desktop/AndroidX02';
      await invoke('create_directory', { path: projPath }).catch(() => {});
      (window as any).currentFolderPath = projPath;
      console.log('[GameTemplate] Auto-created project folder:', projPath);
    } catch(_) {
      // Fallback: ask user to pick
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const picked = await open({ directory: true, title: 'Choose where to create your game project' });
        if (!picked) return;
        projPath = typeof picked === 'string' ? picked : (picked as any).path || String(picked);
        (window as any).currentFolderPath = projPath;
      } catch(__) {
        alert('Choose a folder first, then try again.');
        return;
      }
    }
  }

  const existing = document.getElementById('game-template-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'game-template-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:apSlideUp 0.25s ease;';
  modal.innerHTML = `
    <div style="background:linear-gradient(145deg,#1a1d23,#22262e);border:1px solid #30363d;border-radius:14px;width:460px;max-width:90vw;box-shadow:0 20px 80px rgba(0,0,0,0.7);overflow:hidden;position:relative;">
      <div style="padding:24px 28px 16px;text-align:center;border-bottom:1px solid #30363d22;">
        <div style="font-size:40px;margin-bottom:8px;">🎮</div>
        <div style="font-size:18px;font-weight:800;color:#e6edf3;">New Game Project</div>
        <div style="font-size:12px;color:#8b949e;margin-top:4px;">Kotlin + Jetpack Compose Canvas</div>
        <button id="gtm-close" style="position:absolute;top:16px;right:20px;background:none;border:none;color:#8b949e;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div style="padding:20px 28px;">
        <div style="margin-bottom:14px;">
          <label style="font-size:11px;color:#8b949e;font-weight:600;display:block;margin-bottom:5px;">GAME NAME</label>
          <input id="gtm-name" type="text" value="SnakeGame" placeholder="MyGame" style="width:100%;padding:9px 12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:13px;outline:none;box-sizing:border-box;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:11px;color:#8b949e;font-weight:600;display:block;margin-bottom:5px;">PACKAGE NAME</label>
          <input id="gtm-pkg" type="text" value="com.x02.snakegame" placeholder="com.example.mygame" style="width:100%;padding:9px 12px;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6edf3;font-size:13px;outline:none;box-sizing:border-box;" />
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:11px;color:#8b949e;font-weight:600;display:block;margin-bottom:8px;">GAME TYPE</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;" id="gtm-types">
            <button class="gtm-type" data-type="snake" style="padding:14px 12px;background:#b04ec922;border:2px solid #b04ec9;color:#e6edf3;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🐍</div>
              <div style="font-size:12px;font-weight:700;">Snake</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Classic arcade</div>
            </button>
            <button class="gtm-type" data-type="pong" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🏓</div>
              <div style="font-size:12px;font-weight:700;">Pong</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">2-player paddle</div>
            </button>
            <button class="gtm-type" data-type="flappy" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🐦</div>
              <div style="font-size:12px;font-weight:700;">Flappy</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Tap to fly</div>
            </button>
            <button class="gtm-type" data-type="memory" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🃏</div>
              <div style="font-size:12px;font-weight:700;">Memory</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Card matching</div>
            </button>
            <button class="gtm-type" data-type="platformer" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🏃</div>
              <div style="font-size:12px;font-weight:700;">Platformer</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Jump & collect</div>
            </button>
            <button class="gtm-type" data-type="breakout" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🧱</div>
              <div style="font-size:12px;font-weight:700;">Breakout</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Brick breaker</div>
            </button>
            <button class="gtm-type" data-type="shooter" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🚀</div>
              <div style="font-size:12px;font-weight:700;">Shooter</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Space combat</div>
            </button>
            <button class="gtm-type" data-type="runner" style="padding:14px 12px;background:#0d1117;border:2px solid #30363d;color:#8b949e;border-radius:10px;cursor:pointer;text-align:center;transition:all 0.2s;">
              <div style="font-size:24px;margin-bottom:4px;">🏃‍♂️</div>
              <div style="font-size:12px;font-weight:700;">Runner</div>
              <div style="font-size:9px;color:#8b949e;margin-top:2px;">Endless run</div>
            </button>
          </div>
        </div>
        <button id="gtm-create" style="width:100%;padding:12px;background:linear-gradient(135deg,#b04ec9,#8b5cf6);border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(176,78,201,0.3);">
          🚀 Create Game Project
        </button>
        <div id="gtm-status" style="text-align:center;margin-top:10px;min-height:16px;font-size:11px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedType = 'snake';

  modal.querySelectorAll('.gtm-type').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.gtm-type').forEach(b => {
        (b as HTMLElement).style.background = '#0d1117';
        (b as HTMLElement).style.borderColor = '#30363d';
        (b as HTMLElement).style.color = '#8b949e';
      });
      (btn as HTMLElement).style.background = '#b04ec922';
      (btn as HTMLElement).style.borderColor = '#b04ec9';
      (btn as HTMLElement).style.color = '#e6edf3';
      selectedType = (btn as HTMLElement).dataset.type || 'snake';
          // Auto-update name and package based on game type
          const typeNames: Record<string,string> = { snake: 'SnakeGame', pong: 'PongGame', flappy: 'FlappyGame', memory: 'MemoryGame', platformer: 'PlatformerGame', breakout: 'BreakoutGame', shooter: 'ShooterGame', runner: 'RunnerGame' };
          const typePkgs: Record<string,string> = { snake: 'com.x02.snakegame', pong: 'com.x02.ponggame', flappy: 'com.x02.flappygame', memory: 'com.x02.memorygame', platformer: 'com.x02.platformergame', breakout: 'com.x02.breakoutgame', shooter: 'com.x02.shootergame', runner: 'com.x02.runnergame' };
          const nameInput = document.getElementById('gtm-name') as HTMLInputElement;
          const pkgInput = document.getElementById('gtm-pkg') as HTMLInputElement;
          if (nameInput) nameInput.value = typeNames[selectedType] || 'MyGame';
          if (pkgInput) pkgInput.value = typePkgs[selectedType] || 'com.x02.mygame';
    });
  });

  modal.querySelector('#gtm-close')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#gtm-create')?.addEventListener('click', async () => {
    const name = (document.getElementById('gtm-name') as HTMLInputElement)?.value?.trim() || 'SnakeGame';
    const pkg = (document.getElementById('gtm-pkg') as HTMLInputElement)?.value?.trim() || 'com.x02.snakegame';
    const statusEl = document.getElementById('gtm-status');
    const createBtn = document.getElementById('gtm-create') as HTMLButtonElement;
    const pkgPath = pkg.replace(/\./g, '/');

    if (createBtn) { createBtn.disabled = true; createBtn.innerHTML = '⏳ Creating project...'; }
    if (statusEl) statusEl.innerHTML = '<span style="color:#4fc3f7;">Generating files...</span>';

    try {
      const files = generateGameFiles(name, pkg, pkgPath, selectedType);
      const baseDir = projPath + '/' + name;

      await invoke('create_files_batch', { baseDir, files });

      if (statusEl) statusEl.innerHTML = '<span style="color:#4ec9b0;">✅ Game project created!</span>';
      if (createBtn) { createBtn.innerHTML = '✅ Created!'; createBtn.style.background = '#2ea043'; }

      setTimeout(() => {
        const refreshBtn = document.querySelector('.refresh-btn, [title="Refresh"]') as HTMLElement;
        if (refreshBtn) refreshBtn.click();
        (window as any).currentFolderPath = baseDir;
        // Read actual directory tree then open project
        const doOpen = () => {
          const fs = (window as any).fileSystem;
          if (fs && fs.getDirectoryTree) {
            fs.getDirectoryTree(baseDir).then((dirContents: any) => {
              const fileTree = dirContents && dirContents.children ? dirContents : { name: name, children: [] };
              document.dispatchEvent(new CustomEvent('project-opened', { detail: { path: baseDir, files: fileTree, restored: false } }));
            }).catch(() => {
              document.dispatchEvent(new CustomEvent('project-opened', { detail: { path: baseDir, files: { name: name, children: [] }, restored: false } }));
            });
          } else {
            document.dispatchEvent(new CustomEvent('project-opened', { detail: { path: baseDir, files: { name: name, children: [] }, restored: false } }));
          }
          setTimeout(() => {
            const rb = document.querySelector('.refresh-btn, [title*="Refresh"], button[id*="refresh"]') as HTMLElement;
            if (rb) rb.click();
            window.dispatchEvent(new CustomEvent('file-tree-refresh', { detail: { path: baseDir } }));
          }, 800);
        };
        doOpen();
      }, 500);

      const addMsg = (window as any).addMessageToChat;
      if (addMsg) {
        addMsg('system',
          '<div style="background:linear-gradient(135deg,#1a0f23,#201430);border:1px solid #6a3a9a;border-radius:10px;padding:14px;margin:4px 0;">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
          '<span style="font-size:28px;">🎮</span>' +
          '<div><div style="font-size:14px;font-weight:700;color:#e0e0f0;">' + name + ' Created!</div>' +
          '<div style="font-size:11px;color:#9a6ab5;">' + selectedType.charAt(0).toUpperCase() + selectedType.slice(1) + ' Game \u2022 Kotlin + Compose Canvas</div></div></div>' +
          '<div style="font-size:11px;color:#aaa;line-height:1.6;">' +
          '\ud83d\udcc1 <strong>' + name + '/</strong> \u2014 Ready to build<br>' +
          '\ud83d\udd28 Use <strong>Build + Run</strong> to play on your device<br>' +
          '\ud83d\udcac Tell me what to change: <em>"add power-ups"</em>, <em>"change colors"</em>, <em>"add sound effects"</em></div></div>'
        );
      }

      setTimeout(() => modal.remove(), 2000);
    } catch (e) {
      if (statusEl) statusEl.innerHTML = '<span style="color:#f44747;">\u274c ' + String(e) + '</span>';
      if (createBtn) { createBtn.disabled = false; createBtn.innerHTML = '\ud83d\ude80 Create Game Project'; }
    }
  });
}

function generateGameFiles(name: string, pkg: string, pkgPath: string, gameType: string): Array<{path: string, content: string}> {
  const files: Array<{path: string, content: string}> = [];

  files.push({ path: 'build.gradle.kts', content:
`plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}`});

  files.push({ path: 'settings.gradle.kts', content:
`pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
include(":app")`});

  files.push({ path: 'gradle.properties', content:
`android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8`});

  files.push({ path: 'gradle/wrapper/gradle-wrapper.properties', content:
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`});

  // Gradle wrapper scripts (needed for build system detection + "Fix All" to work)
  files.push({ path: 'gradlew.bat', content:
`@rem
@rem Copyright 2015 the original author or authors.
@rem Licensed under the Apache License, Version 2.0
@rem
@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
@rem This is normally unused
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here.
set DEFAULT_JVM_OPTS="-Xmx64m" "-Xms64m"

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. 1>&2
echo. 1>&2
echo Please set the JAVA_HOME variable in your environment to match the 1>&2
echo location of your Java installation. 1>&2

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2

goto fail

:execute
@rem Setup the command line
set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar

@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% "-Dorg.gradle.appname=%APP_BASE_NAME%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:end
@rem End local scope for the variables with windows NT shell
if %OS%==Windows_NT endlocal

:omega
@exit /b %ERRORLEVEL%

:fail
@exit /b 1`});

  files.push({ path: 'gradlew', content:
`#!/bin/sh
# Gradle wrapper script for UNIX
APP_NAME="Gradle"
APP_BASE_NAME=\`basename "$0"\`
DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'
MAX_FD="maximum"
warn () { echo "$*"; }
die () { echo; echo "$*"; echo; exit 1; }
# OS specific support
cygwin=false
msys=false
darwin=false
nonstop=false
case "\`uname\`" in
  CYGWIN* ) cygwin=true ;;
  Darwin* ) darwin=true ;;
  MINGW* ) msys=true ;;
  NONSTOP* ) nonstop=true ;;
esac
CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar
# Determine the Java command to use
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/bin/java" ] ; then
        JAVACMD="$JAVA_HOME/bin/java"
    else
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME"
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH."
fi
# Escape application args
save () { for i do printf %s\\\\n "$i" | sed "s/'/'\\\\\\\\''/g;1s/^/'/;\\$s/\\$/'/" ; done; }
APP_ARGS=\`save "$@"\`
CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar
exec "$JAVACMD" $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS \\
  "-Dorg.gradle.appname=$APP_BASE_NAME" \\
  -classpath "$CLASSPATH" \\
  org.gradle.wrapper.GradleWrapperMain \\
  "$@"`});

  files.push({ path: 'app/build.gradle.kts', content:
`plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "${pkg}"
    compileSdk = 34
    defaultConfig {
        applicationId = "${pkg}"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures { compose = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.8" }
    kotlinOptions { jvmTarget = "17" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
}`});

  files.push({ path: 'app/src/main/AndroidManifest.xml', content:
`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:label="${name}"
        android:supportsRtl="true"
        android:theme="@style/Theme.${name}">
        <activity
            android:name=".GameActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`});

  files.push({ path: 'app/src/main/res/values/themes.xml', content:
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.${name}" parent="android:Theme.Material.NoActionBar">
        <item name="android:statusBarColor">#FF0D1117</item>
        <item name="android:navigationBarColor">#FF0D1117</item>
    </style>
</resources>`});

  const gameFiles = getGameTypeFiles(gameType, pkg, pkgPath, name);
  files.push(...gameFiles);

  files.push({ path: 'README.md', content:
`# ${name} \ud83c\udfae

**${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Game** built with Kotlin + Jetpack Compose Canvas

Created with **Operator X02 Code IDE**

## Build & Run
1. Open this folder in X02 IDE
2. Press **Ctrl+Shift+D** \u2192 Build tab \u2192 **Build + Run**
3. Play on your device!

## Customize with AI
Tell the AI assistant what to change:
- "Add power-ups"
- "Change the colors to neon"
- "Add a main menu"
- "Make it faster"
- "Add sound effects"
`});

  return files;
}

function getGameTypeFiles(type: string, pkg: string, pkgPath: string, name: string): Array<{path: string, content: string}> {
  const basePath = 'app/src/main/java/' + pkgPath;
  const files: Array<{path: string, content: string}> = [];

  files.push({ path: basePath + '/GameActivity.kt', content: getGameActivityCode(pkg, name, type) });

  if (type === 'snake') {
    files.push({ path: basePath + '/GameScreen.kt', content: getSnakeGameCode(pkg) });
  } else if (type === 'pong') {
    files.push({ path: basePath + '/GameScreen.kt', content: getPongGameCode(pkg) });
  } else if (type === 'flappy') {
    files.push({ path: basePath + '/GameScreen.kt', content: getFlappyGameCode(pkg) });
  } else if (type === 'memory') {
    files.push({ path: basePath + '/GameScreen.kt', content: getMemoryGameCode(pkg) });
  } else if (type === 'platformer') {
    files.push({ path: basePath + '/GameScreen.kt', content: getPlatformerGameCode(pkg) });
  } else if (type === 'breakout') {
    files.push({ path: basePath + '/GameScreen.kt', content: getBreakoutGameCode(pkg) });
  } else if (type === 'shooter') {
    files.push({ path: basePath + '/GameScreen.kt', content: getShooterGameCode(pkg) });
  } else if (type === 'runner') {
    files.push({ path: basePath + '/GameScreen.kt', content: getRunnerGameCode(pkg) });
  } else if (type === 'platformer') {
    files.push({ path: basePath + '/GameScreen.kt', content: getPlatformerGameCode(pkg) });
  } else if (type === 'breakout') {
    files.push({ path: basePath + '/GameScreen.kt', content: getBreakoutGameCode(pkg) });
  } else if (type === 'shooter') {
    files.push({ path: basePath + '/GameScreen.kt', content: getShooterGameCode(pkg) });
  } else if (type === 'runner') {
    files.push({ path: basePath + '/GameScreen.kt', content: getRunnerGameCode(pkg) });
  }

  return files;
}

function getGameActivityCode(pkg: string, name: string, type: string): string {
  return `package ${pkg}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class GameActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var gameState by remember { mutableStateOf(GameState.MENU) }
            var score by remember { mutableIntStateOf(0) }
            var highScore by remember { mutableIntStateOf(0) }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0D1117))
            ) {
                when (gameState) {
                    GameState.MENU -> MenuScreen(
                        highScore = highScore,
                        onPlay = { gameState = GameState.PLAYING; score = 0 }
                    )
                    GameState.PLAYING -> GameScreen(
                        onScoreChange = { score = it },
                        onGameOver = {
                            if (score > highScore) highScore = score
                            gameState = GameState.GAME_OVER
                        }
                    )
                    GameState.GAME_OVER -> GameOverScreen(
                        score = score,
                        highScore = highScore,
                        onRestart = { gameState = GameState.PLAYING; score = 0 },
                        onMenu = { gameState = GameState.MENU }
                    )
                }
            }
        }
    }
}

enum class GameState { MENU, PLAYING, GAME_OVER }

@Composable
fun MenuScreen(highScore: Int, onPlay: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("${name}", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color(0xFFB04EC9))
            Spacer(Modifier.height(8.dp))
            Text("${type.toUpperCase()}", fontSize = 14.sp, color = Color(0xFF8B949E), letterSpacing = 4.sp)
            Spacer(Modifier.height(40.dp))
            Button(
                onClick = onPlay,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB04EC9))
            ) {
                Text("\\u25b6  PLAY", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            if (highScore > 0) {
                Spacer(Modifier.height(16.dp))
                Text("High Score: \\$highScore", fontSize = 14.sp, color = Color(0xFF4FC3F7))
            }
            Spacer(Modifier.height(32.dp))
            Text("Made with X02 IDE", fontSize = 10.sp, color = Color(0xFF30363D))
        }
    }
}

@Composable
fun GameOverScreen(score: Int, highScore: Int, onRestart: () -> Unit, onMenu: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("GAME OVER", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF44747))
            Spacer(Modifier.height(16.dp))
            Text("Score: \\$score", fontSize = 24.sp, color = Color(0xFFE6EDF3))
            if (score >= highScore && highScore > 0) {
                Spacer(Modifier.height(8.dp))
                Text("\\ud83c\\udfc6 NEW HIGH SCORE!", fontSize = 16.sp, color = Color(0xFFFFD700))
            }
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onRestart,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFB04EC9))
            ) {
                Text("\\ud83d\\udd04  PLAY AGAIN", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onMenu) {
                Text("Menu", color = Color(0xFF8B949E))
            }
        }
    }
}
`;
}

function getSnakeGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.abs
import kotlin.random.Random

data class Point(val x: Int, val y: Int)
enum class Direction { UP, DOWN, LEFT, RIGHT }

@Composable
fun GameScreen(onScoreChange: (Int) -> Unit, onGameOver: () -> Unit) {
    val gridSize = 20
    var snake by remember { mutableStateOf(listOf(Point(10, 10), Point(9, 10), Point(8, 10))) }
    var food by remember { mutableStateOf(Point(15, 15)) }
    var direction by remember { mutableStateOf(Direction.RIGHT) }
    var score by remember { mutableIntStateOf(0) }
    var speed by remember { mutableLongStateOf(150L) }
    var isRunning by remember { mutableStateOf(true) }
    var dragStartX by remember { mutableFloatStateOf(0f) }
    var dragStartY by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(isRunning) {
        while (isRunning) {
            delay(speed)
            val head = snake.first()
            val newHead = when (direction) {
                Direction.UP -> Point(head.x, head.y - 1)
                Direction.DOWN -> Point(head.x, head.y + 1)
                Direction.LEFT -> Point(head.x - 1, head.y)
                Direction.RIGHT -> Point(head.x + 1, head.y)
            }
            if (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize || snake.contains(newHead)) {
                isRunning = false
                onGameOver()
                return@LaunchedEffect
            }
            snake = if (newHead == food) {
                score++
                onScoreChange(score)
                if (score % 5 == 0 && speed > 60) speed -= 15
                food = generateFood(gridSize, snake + newHead)
                listOf(newHead) + snake
            } else {
                listOf(newHead) + snake.dropLast(1)
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("SCORE", fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
            Text("\\$score", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4FC3F7))
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(8.dp)
                .pointerInput(Unit) {
                    detectDragGestures(
                        onDragStart = { offset -> dragStartX = offset.x; dragStartY = offset.y },
                        onDrag = { change, _ ->
                            val dx = change.position.x - dragStartX
                            val dy = change.position.y - dragStartY
                            if (abs(dx) > 40 || abs(dy) > 40) {
                                direction = if (abs(dx) > abs(dy)) {
                                    if (dx > 0 && direction != Direction.LEFT) Direction.RIGHT
                                    else if (dx < 0 && direction != Direction.RIGHT) Direction.LEFT
                                    else direction
                                } else {
                                    if (dy > 0 && direction != Direction.UP) Direction.DOWN
                                    else if (dy < 0 && direction != Direction.DOWN) Direction.UP
                                    else direction
                                }
                                dragStartX = change.position.x
                                dragStartY = change.position.y
                            }
                        }
                    )
                }
        ) {
            val cellSize = minOf(size.width, size.height) / gridSize
            val offsetX = (size.width - cellSize * gridSize) / 2
            val offsetY = (size.height - cellSize * gridSize) / 2

            drawRect(Color(0xFF161B22), topLeft = Offset(offsetX, offsetY), size = Size(cellSize * gridSize, cellSize * gridSize))

            for (i in 0..gridSize) {
                drawLine(Color(0xFF21262D), Offset(offsetX + i * cellSize, offsetY), Offset(offsetX + i * cellSize, offsetY + gridSize * cellSize), 0.5f)
                drawLine(Color(0xFF21262D), Offset(offsetX, offsetY + i * cellSize), Offset(offsetX + gridSize * cellSize, offsetY + i * cellSize), 0.5f)
            }

            val foodX = offsetX + food.x * cellSize
            val foodY = offsetY + food.y * cellSize
            drawCircle(Color(0x33F44747), cellSize * 0.8f, Offset(foodX + cellSize / 2, foodY + cellSize / 2))
            drawRoundRect(Color(0xFFF44747), Offset(foodX + 2, foodY + 2), Size(cellSize - 4, cellSize - 4), cornerRadius = CornerRadius(4f))

            snake.forEachIndexed { index, point ->
                val x = offsetX + point.x * cellSize
                val y = offsetY + point.y * cellSize
                val color = if (index == 0) Color(0xFF4EC9B0) else Color(0xFF2EA043).copy(alpha = 1f - index * 0.02f)
                drawRoundRect(color, Offset(x + 1, y + 1), Size(cellSize - 2, cellSize - 2), cornerRadius = CornerRadius(4f))
                if (index == 0) {
                    drawRoundRect(Color(0x334EC9B0), Offset(x - 2, y - 2), Size(cellSize + 4, cellSize + 4), cornerRadius = CornerRadius(6f))
                }
            }
        }

        Text("Swipe to move", fontSize = 11.sp, color = Color(0xFF30363D),
            modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
            textAlign = TextAlign.Center)
    }
}

private fun generateFood(gridSize: Int, occupied: List<Point>): Point {
    var food: Point
    do { food = Point(Random.nextInt(gridSize), Random.nextInt(gridSize)) } while (occupied.contains(food))
    return food
}
`;
}

function getPongGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.abs

@Composable
fun GameScreen(onScoreChange: (Int) -> Unit, onGameOver: () -> Unit) {
    var ballX by remember { mutableFloatStateOf(0.5f) }
    var ballY by remember { mutableFloatStateOf(0.5f) }
    var ballDX by remember { mutableFloatStateOf(0.012f) }
    var ballDY by remember { mutableFloatStateOf(0.008f) }
    var paddleX by remember { mutableFloatStateOf(0.4f) }
    var aiPaddleX by remember { mutableFloatStateOf(0.4f) }
    var score by remember { mutableIntStateOf(0) }
    val paddleW = 0.2f; val paddleH = 0.02f; val ballR = 0.015f

    LaunchedEffect(Unit) {
        while (true) {
            delay(16L)
            ballX += ballDX; ballY += ballDY
            if (ballX <= ballR || ballX >= 1f - ballR) ballDX = -ballDX
            val aiCenter = aiPaddleX + paddleW / 2
            if (aiCenter < ballX - 0.01f) aiPaddleX += 0.006f
            else if (aiCenter > ballX + 0.01f) aiPaddleX -= 0.006f
            aiPaddleX = aiPaddleX.coerceIn(0f, 1f - paddleW)
            if (ballY <= 0.06f + ballR && ballX >= aiPaddleX && ballX <= aiPaddleX + paddleW) { ballDY = abs(ballDY) }
            if (ballY >= 0.92f - ballR && ballX >= paddleX && ballX <= paddleX + paddleW) {
                ballDY = -abs(ballDY); score++; onScoreChange(score)
                ballDX *= 1.02f; ballDY *= 1.02f
            }
            if (ballY > 1f) { onGameOver(); return@LaunchedEffect }
            if (ballY < 0f) { ballDY = abs(ballDY) }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("PONG", fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
            Text("\\$score", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4FC3F7))
        }
        Canvas(Modifier.fillMaxWidth().weight(1f).padding(8.dp)
            .pointerInput(Unit) { detectDragGestures { change, _ -> paddleX = (change.position.x / size.width - paddleW / 2).coerceIn(0f, 1f - paddleW) } }
        ) {
            drawRect(Color(0xFF161B22))
            drawLine(Color(0xFF30363D), Offset(0f, size.height / 2), Offset(size.width, size.height / 2), 1f)
            drawRoundRect(Color(0xFFF44747), Offset(aiPaddleX * size.width, size.height * 0.04f), Size(paddleW * size.width, paddleH * size.height), cornerRadius = CornerRadius(8f))
            drawRoundRect(Color(0xFF4EC9B0), Offset(paddleX * size.width, size.height * 0.94f), Size(paddleW * size.width, paddleH * size.height), cornerRadius = CornerRadius(8f))
            drawCircle(Color(0xFF4FC3F7), ballR * size.width, Offset(ballX * size.width, ballY * size.height))
            drawCircle(Color(0x334FC3F7), ballR * size.width * 2, Offset(ballX * size.width, ballY * size.height))
        }
    }
}
`;
}

function getFlappyGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.random.Random

data class Pipe(var x: Float, val gapY: Float, val gapSize: Float = 0.25f, var scored: Boolean = false)

@Composable
fun GameScreen(onScoreChange: (Int) -> Unit, onGameOver: () -> Unit) {
    var birdY by remember { mutableFloatStateOf(0.5f) }
    var velocity by remember { mutableFloatStateOf(0f) }
    var pipes by remember { mutableStateOf(listOf(Pipe(1.2f, Random.nextFloat() * 0.4f + 0.2f))) }
    var score by remember { mutableIntStateOf(0) }
    val gravity = 0.0012f; val jumpForce = -0.022f; val birdX = 0.2f; val birdR = 0.025f; val pipeW = 0.1f

    LaunchedEffect(Unit) {
        while (true) {
            delay(16L)
            velocity += gravity; birdY += velocity
            pipes = pipes.map { it.copy(x = it.x - 0.005f) }.toMutableList().also { list ->
                list.removeAll { it.x < -pipeW }
                if (list.isEmpty() || list.last().x < 0.6f) list.add(Pipe(1.2f, Random.nextFloat() * 0.4f + 0.2f))
            }
            pipes.forEach { pipe -> if (!pipe.scored && pipe.x + pipeW < birdX) { pipe.scored = true; score++; onScoreChange(score) } }
            if (birdY < 0f || birdY > 1f) { onGameOver(); return@LaunchedEffect }
            for (pipe in pipes) {
                if (birdX + birdR > pipe.x && birdX - birdR < pipe.x + pipeW) {
                    if (birdY - birdR < pipe.gapY || birdY + birdR > pipe.gapY + pipe.gapSize) { onGameOver(); return@LaunchedEffect }
                }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("FLAPPY", fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
            Text("\\$score", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF4FC3F7))
        }
        Canvas(Modifier.fillMaxWidth().weight(1f).padding(8.dp)
            .pointerInput(Unit) { detectTapGestures { velocity = jumpForce } }
        ) {
            drawRect(Color(0xFF161B22))
            for (pipe in pipes) {
                val px = pipe.x * size.width; val pw = pipeW * size.width
                val gapTop = pipe.gapY * size.height; val gapBot = (pipe.gapY + pipe.gapSize) * size.height
                drawRoundRect(Color(0xFF2EA043), Offset(px, 0f), Size(pw, gapTop), cornerRadius = CornerRadius(6f))
                drawRoundRect(Color(0xFF2EA043), Offset(px, gapBot), Size(pw, size.height - gapBot), cornerRadius = CornerRadius(6f))
            }
            drawCircle(Color(0xFFFFD700), birdR * size.width, Offset(birdX * size.width, birdY * size.height))
            drawCircle(Color(0x44FFD700), birdR * size.width * 1.8f, Offset(birdX * size.width, birdY * size.height))
        }
        Text("Tap to fly", fontSize = 11.sp, color = Color(0xFF30363D),
            modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
            textAlign = TextAlign.Center)
    }
}
`;
}

function getMemoryGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class Card(val id: Int, val emoji: String, var isFlipped: Boolean = false, var isMatched: Boolean = false)

@Composable
fun GameScreen(onScoreChange: (Int) -> Unit, onGameOver: () -> Unit) {
    val emojis = listOf("\\ud83d\\udc36","\\ud83d\\udc31","\\ud83d\\udc38","\\ud83e\\udd8a","\\ud83d\\udc3b","\\ud83d\\udc3c","\\ud83d\\udc28","\\ud83e\\udd81")
    var cards by remember { mutableStateOf((emojis + emojis).mapIndexed { i, e -> Card(i, e) }.shuffled()) }
    var firstFlipped by remember { mutableStateOf<Int?>(null) }
    var score by remember { mutableIntStateOf(0) }
    var moves by remember { mutableIntStateOf(0) }
    var checking by remember { mutableStateOf(false) }

    LaunchedEffect(cards) {
        if (cards.all { it.isMatched }) { delay(500); onGameOver() }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("MEMORY", fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
            Text("Moves: \\$moves", fontSize = 14.sp, color = Color(0xFF4FC3F7))
        }
        Spacer(Modifier.height(16.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            itemsIndexed(cards) { index, card ->
                val rotation by animateFloatAsState(if (card.isFlipped || card.isMatched) 180f else 0f, label = "flip")
                Box(
                    Modifier
                        .aspectRatio(0.75f)
                        .clip(RoundedCornerShape(12.dp))
                        .graphicsLayer { rotationY = rotation; cameraDistance = 12f * density }
                        .background(
                            if (rotation > 90f) {
                                if (card.isMatched) Color(0xFF2EA043) else Color(0xFF1A73E8)
                            } else Color(0xFF21262D)
                        )
                        .clickable {
                            if (checking || card.isFlipped || card.isMatched) return@clickable
                            cards = cards.toMutableList().also { it[index] = it[index].copy(isFlipped = true) }
                            if (firstFlipped == null) {
                                firstFlipped = index
                            } else {
                                moves++
                                onScoreChange(moves)
                                val first = firstFlipped!!
                                if (cards[first].emoji == cards[index].emoji) {
                                    cards = cards.toMutableList().also {
                                        it[first] = it[first].copy(isMatched = true)
                                        it[index] = it[index].copy(isMatched = true)
                                    }
                                    score += 2
                                    firstFlipped = null
                                } else {
                                    checking = true
                                    MainScope().launch {
                                        delay(800)
                                        cards = cards.toMutableList().also {
                                            it[first] = it[first].copy(isFlipped = false)
                                            it[index] = it[index].copy(isFlipped = false)
                                        }
                                        firstFlipped = null
                                        checking = false
                                    }
                                }
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (rotation > 90f) Text(card.emoji, fontSize = 28.sp)
                    else Text("?", fontSize = 24.sp, color = Color(0xFF30363D), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
`;
}



export function initializeAndroid() {
  console.log('📱 Android panel initialized (Ctrl+Shift+D to toggle)');
  (window as any).androidPanel = androidPanel;
}

function getPlatformerGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

data class Platform(val x: Float, val y: Float, val width: Float)
data class Coin(val x: Float, val y: Float, var collected: Boolean = false)
data class Enemy(val x: Float, val y: Float, var dx: Float, val width: Float)

@Composable
fun GameScreen(onGameOver: () -> Unit, onScore: (Int) -> Unit) {
    var playerX by remember { mutableStateOf(0.15f) }
    var playerY by remember { mutableStateOf(0.7f) }
    var velocityY by remember { mutableStateOf(0f) }
    var isGrounded by remember { mutableStateOf(false) }
    var score by remember { mutableStateOf(0) }
    var cameraX by remember { mutableStateOf(0f) }
    var moveDir by remember { mutableStateOf(0) } // -1 left, 0 stop, 1 right

    val platforms = remember { mutableStateListOf(
        Platform(0f, 0.85f, 0.5f), Platform(0.3f, 0.7f, 0.2f),
        Platform(0.6f, 0.6f, 0.25f), Platform(0.9f, 0.5f, 0.2f),
        Platform(1.2f, 0.65f, 0.3f), Platform(1.5f, 0.45f, 0.2f),
        Platform(1.8f, 0.55f, 0.25f), Platform(2.1f, 0.4f, 0.2f),
        Platform(2.5f, 0.7f, 0.3f), Platform(2.8f, 0.35f, 0.2f),
        Platform(3.2f, 0.6f, 0.25f), Platform(3.5f, 0.5f, 0.2f)
    ) }

    val coins = remember { mutableStateListOf(
        Coin(0.35f, 0.62f), Coin(0.65f, 0.52f), Coin(0.95f, 0.42f),
        Coin(1.25f, 0.57f), Coin(1.55f, 0.37f), Coin(1.85f, 0.47f),
        Coin(2.15f, 0.32f), Coin(2.55f, 0.62f), Coin(2.85f, 0.27f),
        Coin(3.25f, 0.52f)
    ) }

    val enemies = remember { mutableStateListOf(
        Enemy(0.6f, 0.55f, 0.002f, 0.15f),
        Enemy(1.2f, 0.6f, 0.003f, 0.2f),
        Enemy(2.5f, 0.65f, 0.002f, 0.2f)
    ) }

    val gravity = 0.0015f
    val jumpForce = -0.028f
    val moveSpeed = 0.004f
    val playerSize = 0.04f

    LaunchedEffect(Unit) {
        while (true) {
            delay(16)
            velocityY += gravity
            playerY += velocityY
            playerX += moveDir * moveSpeed

            isGrounded = false
            for (p in platforms) {
                if (playerX + playerSize > p.x && playerX < p.x + p.width &&
                    playerY + playerSize >= p.y && playerY + playerSize <= p.y + 0.03f && velocityY >= 0) {
                    playerY = p.y - playerSize
                    velocityY = 0f
                    isGrounded = true
                    break
                }
            }

            for (c in coins) {
                if (!c.collected && kotlin.math.abs(playerX - c.x) < 0.04f && kotlin.math.abs(playerY - c.y) < 0.04f) {
                    c.collected = true
                    score += 10
                    onScore(score)
                }
            }

            for (e in enemies) {
                e.dx.let { dx ->
                    val newX = e.x + dx
                    if (kotlin.math.abs(playerX - e.x) < 0.04f && kotlin.math.abs(playerY - e.y) < 0.04f) {
                        if (velocityY > 0 && playerY < e.y) {
                            score += 50
                            onScore(score)
                        } else {
                            onGameOver()
                            return@LaunchedEffect
                        }
                    }
                }
            }

            for (i in enemies.indices) {
                val e = enemies[i]
                var nx = e.x + e.dx
                val plat = platforms.find { e.y + 0.04f >= it.y && e.y + 0.04f <= it.y + 0.05f && nx >= it.x && nx <= it.x + it.width }
                if (plat == null) enemies[i] = e.copy(dx = -e.dx)
                else enemies[i] = e.copy(x = nx)
            }

            cameraX = (playerX - 0.2f).coerceAtLeast(0f)
            if (playerY > 1.1f) { onGameOver(); return@LaunchedEffect }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0D1117))) {
        Canvas(modifier = Modifier.fillMaxSize().pointerInput(Unit) {
            detectTapGestures { offset ->
                val third = size.width / 3f
                when {
                    offset.x < third -> moveDir = -1
                    offset.x > third * 2 -> moveDir = 1
                    else -> if (isGrounded) velocityY = jumpForce
                }
            }
        }) {
            val w = size.width; val h = size.height
            // Sky gradient
            drawRect(Color(0xFF0D1117), Offset.Zero, Size(w, h))
            // Stars
            for (i in 0..20) {
                val sx = ((i * 137 + 50) % 1000) / 1000f * w
                val sy = ((i * 97 + 30) % 600) / 600f * h * 0.5f
                drawCircle(Color(0x88FFFFFF), 1.5f, Offset(sx, sy))
            }

            val ox = cameraX * w
            // Platforms
            for (p in platforms) {
                drawRoundRect(Color(0xFF2EA043), Offset(p.x * w - ox, p.y * h), Size(p.width * w, 12f), androidx.compose.ui.geometry.CornerRadius(4f))
                drawRoundRect(Color(0xFF3FB950), Offset(p.x * w - ox, p.y * h), Size(p.width * w, 6f), androidx.compose.ui.geometry.CornerRadius(4f))
            }
            // Coins
            for (c in coins) {
                if (!c.collected) {
                    drawCircle(Color(0xFFFFD700), 10f, Offset(c.x * w - ox, c.y * h))
                    drawCircle(Color(0xFFFFF3B0), 5f, Offset(c.x * w - ox - 2f, c.y * h - 2f))
                }
            }
            // Enemies
            for (e in enemies) {
                drawRoundRect(Color(0xFFE74C3C), Offset(e.x * w - ox, e.y * h), Size(0.04f * w, 0.04f * h), androidx.compose.ui.geometry.CornerRadius(6f))
                drawCircle(Color.White, 3f, Offset(e.x * w - ox + 6f, e.y * h + 8f))
                drawCircle(Color.White, 3f, Offset(e.x * w - ox + 18f, e.y * h + 8f))
            }
            // Player (Mario-like)
            val px = playerX * w - ox; val py = playerY * h
            drawRoundRect(Color(0xFFE74C3C), Offset(px, py - 8f), Size(playerSize * w, 8f), androidx.compose.ui.geometry.CornerRadius(4f)) // hat
            drawRoundRect(Color(0xFF4FC3F7), Offset(px, py), Size(playerSize * w, playerSize * h), androidx.compose.ui.geometry.CornerRadius(4f)) // body
            drawRect(Color(0xFF2196F3), Offset(px + 4f, py + playerSize * h * 0.6f), Size(playerSize * w - 8f, playerSize * h * 0.4f)) // pants
        }

        // Controls hint
        Row(modifier = Modifier.align(Alignment.BottomCenter).padding(12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Text("<< LEFT", fontSize = 10.sp, color = Color(0x66FFFFFF))
            Text("^ JUMP ^", fontSize = 10.sp, color = Color(0x66FFFFFF))
            Text("RIGHT >>", fontSize = 10.sp, color = Color(0x66FFFFFF))
        }
        // Score
        Text("Coins: ${'$'}score", modifier = Modifier.align(Alignment.TopEnd).padding(12.dp), fontSize = 14.sp, color = Color(0xFFFFD700), fontWeight = FontWeight.Bold)
    }
}`;
}

function getBreakoutGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.abs

data class Brick(val row: Int, val col: Int, var alive: Boolean = true, val color: Color)

@Composable
fun GameScreen(onGameOver: () -> Unit, onScore: (Int) -> Unit) {
    var paddleX by remember { mutableStateOf(0.4f) }
    var ballX by remember { mutableStateOf(0.5f) }
    var ballY by remember { mutableStateOf(0.75f) }
    var ballDX by remember { mutableStateOf(0.006f) }
    var ballDY by remember { mutableStateOf(-0.008f) }
    var score by remember { mutableStateOf(0) }
    val paddleW = 0.2f
    val ballR = 0.012f

    val brickColors = listOf(
        Color(0xFFE74C3C), Color(0xFFE67E22), Color(0xFFF1C40F),
        Color(0xFF2ECC71), Color(0xFF3498DB), Color(0xFF9B59B6)
    )

    val bricks = remember {
        mutableStateListOf<Brick>().apply {
            for (row in 0..5) for (col in 0..7) {
                add(Brick(row, col, true, brickColors[row]))
            }
        }
    }

    val brickW = 1f / 8f
    val brickH = 0.035f
    val brickTop = 0.1f

    LaunchedEffect(Unit) {
        while (true) {
            delay(16)
            ballX += ballDX
            ballY += ballDY

            // Wall bounces
            if (ballX <= ballR || ballX >= 1f - ballR) ballDX = -ballDX
            if (ballY <= ballR) ballDY = -ballDY

            // Paddle bounce
            if (ballY + ballR >= 0.88f && ballY + ballR <= 0.92f &&
                ballX >= paddleX && ballX <= paddleX + paddleW) {
                ballDY = -abs(ballDY)
                val hitPos = (ballX - paddleX) / paddleW - 0.5f
                ballDX = hitPos * 0.015f
            }

            // Brick collision
            for (i in bricks.indices) {
                val b = bricks[i]
                if (!b.alive) continue
                val bx = b.col * brickW
                val by = brickTop + b.row * (brickH + 0.008f)
                if (ballX + ballR > bx && ballX - ballR < bx + brickW &&
                    ballY + ballR > by && ballY - ballR < by + brickH) {
                    bricks[i] = b.copy(alive = false)
                    ballDY = -ballDY
                    score += 10
                    onScore(score)
                    break
                }
            }

            // Check win
            if (bricks.none { it.alive }) {
                score += 100
                onScore(score)
                onGameOver()
                return@LaunchedEffect
            }

            // Ball lost
            if (ballY > 1.05f) { onGameOver(); return@LaunchedEffect }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0D1117))) {
        Canvas(modifier = Modifier.fillMaxSize().pointerInput(Unit) {
            detectDragGestures { change, _ ->
                paddleX = (change.position.x / size.width - paddleW / 2).coerceIn(0f, 1f - paddleW)
            }
        }) {
            val w = size.width; val h = size.height
            // Bricks
            for (b in bricks) {
                if (!b.alive) continue
                val bx = b.col * brickW * w + 2f
                val by = (brickTop + b.row * (brickH + 0.008f)) * h
                drawRoundRect(b.color, Offset(bx, by), Size(brickW * w - 4f, brickH * h),
                    androidx.compose.ui.geometry.CornerRadius(4f))
            }
            // Paddle
            drawRoundRect(Color(0xFF4FC3F7), Offset(paddleX * w, 0.88f * h), Size(paddleW * w, 14f),
                androidx.compose.ui.geometry.CornerRadius(7f))
            // Ball
            drawCircle(Color.White, ballR * w, Offset(ballX * w, ballY * h))
            // Ball glow
            drawCircle(Color(0x334FC3F7), ballR * w * 2.5f, Offset(ballX * w, ballY * h))
        }
        Text("Score: ${'$'}score", modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
            fontSize = 14.sp, color = Color(0xFF4FC3F7), fontWeight = FontWeight.Bold)
        Text("BREAKOUT", modifier = Modifier.align(Alignment.TopStart).padding(12.dp),
            fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
    }
}`;
}

function getShooterGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.sin

data class Bullet(var x: Float, var y: Float)
data class Alien(var x: Float, var y: Float, var alive: Boolean = true, val type: Int = 0)
data class Star(val x: Float, val y: Float, val speed: Float, val size: Float)

@Composable
fun GameScreen(onGameOver: () -> Unit, onScore: (Int) -> Unit) {
    var shipX by remember { mutableStateOf(0.45f) }
    var score by remember { mutableStateOf(0) }
    var frame by remember { mutableStateOf(0L) }
    val bullets = remember { mutableStateListOf<Bullet>() }
    val shipW = 0.08f

    val aliens = remember {
        mutableStateListOf<Alien>().apply {
            for (row in 0..3) for (col in 0..6) {
                add(Alien(0.08f + col * 0.12f, 0.08f + row * 0.07f, true, row % 2))
            }
        }
    }

    val stars = remember {
        List(40) { Star((it * 73 % 100) / 100f, (it * 37 % 100) / 100f, 0.001f + (it % 3) * 0.001f, 1f + (it % 3)) }
    }
    val starPositions = remember { mutableStateListOf(*stars.map { it.y }.toTypedArray()) }

    var alienDX by remember { mutableStateOf(0.002f) }
    var lastShot by remember { mutableStateOf(0L) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(16)
            frame++

            // Stars scroll
            for (i in starPositions.indices) {
                starPositions[i] = (starPositions[i] + stars[i].speed) % 1f
            }

            // Move bullets
            val toRemove = mutableListOf<Int>()
            for (i in bullets.indices) {
                bullets[i] = bullets[i].copy(y = bullets[i].y - 0.015f)
                if (bullets[i].y < -0.05f) toRemove.add(i)
            }
            toRemove.sortedDescending().forEach { bullets.removeAt(it) }

            // Move aliens
            var hitEdge = false
            for (a in aliens) {
                if (!a.alive) continue
                if (a.x + alienDX < 0.02f || a.x + alienDX > 0.92f) { hitEdge = true; break }
            }
            if (hitEdge) {
                alienDX = -alienDX
                for (i in aliens.indices) {
                    if (aliens[i].alive) aliens[i] = aliens[i].copy(y = aliens[i].y + 0.03f)
                }
            } else {
                val wobble = sin(frame * 0.05) * 0.001
                for (i in aliens.indices) {
                    if (aliens[i].alive) aliens[i] = aliens[i].copy(x = aliens[i].x + alienDX + wobble.toFloat())
                }
            }

            // Collision: bullets vs aliens
            val deadBullets = mutableListOf<Int>()
            for (bi in bullets.indices) {
                for (ai in aliens.indices) {
                    if (!aliens[ai].alive) continue
                    val a = aliens[ai]; val b = bullets[bi]
                    if (kotlin.math.abs(b.x - a.x) < 0.04f && kotlin.math.abs(b.y - a.y) < 0.03f) {
                        aliens[ai] = a.copy(alive = false)
                        deadBullets.add(bi)
                        score += if (a.type == 0) 10 else 20
                        onScore(score)
                        break
                    }
                }
            }
            deadBullets.sortedDescending().forEach { if (it < bullets.size) bullets.removeAt(it) }

            // Auto-fire every 15 frames
            if (frame - lastShot > 15) {
                bullets.add(Bullet(shipX + shipW / 2, 0.85f))
                lastShot = frame
            }

            // Check: aliens reach bottom
            if (aliens.any { it.alive && it.y > 0.8f }) { onGameOver(); return@LaunchedEffect }
            // Check: all aliens dead = win
            if (aliens.none { it.alive }) {
                score += 200
                onScore(score)
                onGameOver()
                return@LaunchedEffect
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0D1117))) {
        Canvas(modifier = Modifier.fillMaxSize().pointerInput(Unit) {
            detectDragGestures { change, _ ->
                shipX = (change.position.x / size.width - shipW / 2).coerceIn(0f, 1f - shipW)
            }
        }) {
            val w = size.width; val h = size.height
            // Stars
            for (i in stars.indices) {
                drawCircle(Color(0x66FFFFFF), stars[i].size, Offset(stars[i].x * w, starPositions[i] * h))
            }
            // Aliens
            for (a in aliens) {
                if (!a.alive) continue
                val color = if (a.type == 0) Color(0xFF2ECC71) else Color(0xFFE74C3C)
                drawRoundRect(color, Offset(a.x * w, a.y * h), Size(0.06f * w, 0.04f * h),
                    androidx.compose.ui.geometry.CornerRadius(4f))
                // Eyes
                drawCircle(Color.White, 3f, Offset(a.x * w + 0.015f * w, a.y * h + 0.015f * h))
                drawCircle(Color.White, 3f, Offset(a.x * w + 0.045f * w, a.y * h + 0.015f * h))
            }
            // Bullets
            for (b in bullets) {
                drawRoundRect(Color(0xFF4FC3F7), Offset(b.x * w - 2f, b.y * h), Size(4f, 14f),
                    androidx.compose.ui.geometry.CornerRadius(2f))
            }
            // Ship (triangle)
            val sx = shipX * w; val sy = 0.88f * h
            val path = Path().apply {
                moveTo(sx + shipW * w / 2, sy - 10f)
                lineTo(sx, sy + 16f)
                lineTo(sx + shipW * w, sy + 16f)
                close()
            }
            drawPath(path, Color(0xFF4FC3F7))
            drawPath(Path().apply {
                moveTo(sx + shipW * w / 2, sy + 16f)
                lineTo(sx + shipW * w * 0.3f, sy + 26f)
                lineTo(sx + shipW * w * 0.7f, sy + 26f)
                close()
            }, Color(0xFFE74C3C))
        }
        Text("Score: ${'$'}score", modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
            fontSize = 14.sp, color = Color(0xFF4FC3F7), fontWeight = FontWeight.Bold)
        Text("SPACE SHOOTER", modifier = Modifier.align(Alignment.TopStart).padding(12.dp),
            fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
    }
}`;
}

function getRunnerGameCode(pkg: string): string {
  return `package ${pkg}

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.sin

data class Obstacle(var x: Float, val height: Float, val isFlying: Boolean = false)
data class CloudObj(var x: Float, val y: Float, val speed: Float, val width: Float)

@Composable
fun GameScreen(onGameOver: () -> Unit, onScore: (Int) -> Unit) {
    var playerY by remember { mutableStateOf(0f) }
    var velocityY by remember { mutableStateOf(0f) }
    var isJumping by remember { mutableStateOf(false) }
    var score by remember { mutableStateOf(0) }
    var speed by remember { mutableStateOf(0.008f) }
    var frame by remember { mutableStateOf(0L) }
    val groundY = 0.75f
    val playerX = 0.15f
    val playerW = 0.05f
    val playerH = 0.08f
    val gravity = 0.0018f
    val jumpForce = -0.032f

    val obstacles = remember { mutableStateListOf(
        Obstacle(1.2f, 0.06f), Obstacle(1.8f, 0.09f),
        Obstacle(2.5f, 0.05f, true), Obstacle(3.0f, 0.07f)
    ) }

    val clouds = remember { mutableStateListOf(
        CloudObj(0.2f, 0.15f, 0.001f, 0.12f), CloudObj(0.5f, 0.25f, 0.0015f, 0.1f),
        CloudObj(0.8f, 0.1f, 0.0008f, 0.15f)
    ) }

    var groundOffset by remember { mutableStateOf(0f) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(16)
            frame++

            // Gravity + jump
            if (isJumping) {
                velocityY += gravity
                playerY += velocityY
                if (playerY >= 0f) { playerY = 0f; velocityY = 0f; isJumping = false }
            }

            // Move obstacles
            for (i in obstacles.indices) {
                obstacles[i] = obstacles[i].copy(x = obstacles[i].x - speed)
                if (obstacles[i].x < -0.1f) {
                    obstacles[i] = obstacles[i].copy(x = 1.1f + (i * 0.4f))
                    score += 10
                    onScore(score)
                }
            }

            // Move clouds
            for (i in clouds.indices) {
                clouds[i] = clouds[i].copy(x = clouds[i].x - clouds[i].speed)
                if (clouds[i].x < -0.2f) clouds[i] = clouds[i].copy(x = 1.2f)
            }

            groundOffset = (groundOffset + speed) % 0.1f

            // Speed increase
            if (frame % 300 == 0L) speed = (speed + 0.0005f).coerceAtMost(0.02f)

            // Collision
            for (obs in obstacles) {
                val obsLeft = obs.x
                val obsRight = obs.x + 0.04f
                val obsBottom = if (obs.isFlying) groundY - 0.06f - obs.height else groundY
                val obsTop = obsBottom - obs.height

                val pLeft = playerX
                val pRight = playerX + playerW
                val pBottom = groundY + playerY
                val pTop = pBottom - playerH

                if (pRight > obsLeft + 0.01f && pLeft < obsRight - 0.01f &&
                    pBottom > obsTop + 0.01f && pTop < obsBottom - 0.01f) {
                    onGameOver()
                    return@LaunchedEffect
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0D1117)).pointerInput(Unit) {
        detectTapGestures {
            if (!isJumping) { isJumping = true; velocityY = jumpForce }
        }
    }) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width; val h = size.height
            val gy = groundY * h

            // Sky gradient (dark to slightly lighter)
            drawRect(Color(0xFF161B22), Offset.Zero, Size(w, gy))

            // Moon
            drawCircle(Color(0x33C9D1D9), 40f, Offset(w * 0.8f, h * 0.12f))
            drawCircle(Color(0x22C9D1D9), 55f, Offset(w * 0.8f, h * 0.12f))

            // Clouds
            for (c in clouds) {
                drawRoundRect(Color(0x22C9D1D9), Offset(c.x * w, c.y * h), Size(c.width * w, 20f),
                    androidx.compose.ui.geometry.CornerRadius(10f))
            }

            // Ground
            drawRect(Color(0xFF21262D), Offset(0f, gy), Size(w, h - gy))
            drawLine(Color(0xFF30363D), Offset(0f, gy), Offset(w, gy), strokeWidth = 3f)

            // Ground texture
            var gx = -groundOffset * w
            while (gx < w) {
                drawLine(Color(0xFF30363D), Offset(gx, gy + 10f), Offset(gx + 15f, gy + 10f), strokeWidth = 1f)
                gx += 40f
            }

            // Player (dino-like)
            val py = (groundY + playerY) * h
            val px = playerX * w
            // Body
            drawRoundRect(Color(0xFF4FC3F7), Offset(px, py - playerH * h), Size(playerW * w, playerH * h),
                androidx.compose.ui.geometry.CornerRadius(6f))
            // Eye
            drawCircle(Color.White, 4f, Offset(px + playerW * w - 8f, py - playerH * h + 10f))
            drawCircle(Color(0xFF0D1117), 2f, Offset(px + playerW * w - 7f, py - playerH * h + 10f))
            // Legs (animated)
            val legOffset = if (isJumping) 0f else sin(frame * 0.3) * 4f
            drawRect(Color(0xFF4FC3F7), Offset(px + 4f, py), Size(6f, 8f + legOffset.toFloat()))
            drawRect(Color(0xFF4FC3F7), Offset(px + playerW * w - 10f, py), Size(6f, 8f - legOffset.toFloat()))

            // Obstacles
            for (obs in obstacles) {
                val ox = obs.x * w
                val oy = if (obs.isFlying) gy - 0.06f * h - obs.height * h else gy - obs.height * h
                val color = if (obs.isFlying) Color(0xFFE74C3C) else Color(0xFF2EA043)
                drawRoundRect(color, Offset(ox, oy), Size(0.04f * w, obs.height * h),
                    androidx.compose.ui.geometry.CornerRadius(4f))
                if (!obs.isFlying) {
                    // Cactus spikes
                    drawRect(color, Offset(ox - 4f, oy + obs.height * h * 0.3f), Size(4f, obs.height * h * 0.3f))
                    drawRect(color, Offset(ox + 0.04f * w, oy + obs.height * h * 0.2f), Size(4f, obs.height * h * 0.4f))
                }
            }
        }

        // Score
        Text("${'$'}score", modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
            fontSize = 18.sp, color = Color(0xFF8B949E), fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        Text("TAP TO JUMP", modifier = Modifier.align(Alignment.BottomCenter).padding(12.dp),
            fontSize = 10.sp, color = Color(0x44FFFFFF))
        // Speed indicator
        Text("RUNNER", modifier = Modifier.align(Alignment.TopStart).padding(12.dp),
            fontSize = 12.sp, color = Color(0xFF8B949E), letterSpacing = 2.sp)
    }
}`;
}
