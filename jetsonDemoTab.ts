// ============================================================================
// jetsonDemoTab.ts - Dedicated Jetson Panel Tab for Operator X02
// Location: src/jetson/jetsonDemoTab.ts
// Ctrl+Shift+G to open. Calls all 16 Tauri SSH commands.
// ============================================================================
import { invoke } from '@tauri-apps/api/core';

interface DeviceInfo { model: string; jetpack_version: string; l4t_version: string; cuda_version?: string; ram_total_mb: number; cpu_cores?: number; arch?: string; }
interface TegraStats { ram_used_mb: number; ram_total_mb: number; gpu_usage: number; cpu_temp: number; gpu_temp: number; power_draw: number; power_limit: number; cpu_usage?: number[]; }
interface DeployResult { transferred: boolean; compiled: boolean; executed: boolean; transfer_time_ms: number; compile_output: string; run_output: string; run_exit_code: number; error: string | null; }

const TID = '__jetson_tab__';
const G = '#76b900'; const BG = '#0d1117'; const CD = '#161b22'; const BD = '#30363d';
const T = '#e6edf3'; const TD = '#8b949e'; const OK = '#3fb950'; const ER = '#f85149';
const WN = '#d29922'; const BL = '#58a6ff';
let monIv: ReturnType<typeof setInterval> | null = null;
let root: HTMLElement | null = null;
let conn = false;
const iS = `background:${BG};border:1px solid ${BD};border-radius:6px;padding:6px 10px;color:${T};font-size:12px;font-family:monospace;outline:none;width:100%;box-sizing:border-box;`;
const bS = (bg: string, c: string) => `background:${bg};color:${c};border:none;border-radius:6px;padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;`;

export function openJetsonDemoTab(): void {
  // If already open, bring to front with bounce
  if (document.getElementById(TID)) {
    const existing = document.getElementById(TID);
    if (existing) {
      existing.style.display = 'block';
      existing.style.animation = 'none';
      existing.offsetHeight; // reflow
      existing.style.animation = 'jt-bounce 0.3s ease';
    }
    return;
  }

  // Inject animations (once)
  if (!document.getElementById('jt-anims')) {
    const style = document.createElement('style');
    style.id = 'jt-anims';
    style.textContent = `
      @keyframes jt-slideIn {
        0% { opacity: 0; transform: translateY(-30px) scale(0.95); }
        60% { opacity: 1; transform: translateY(6px) scale(1.01); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes jt-slideOut {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-20px) scale(0.96); }
      }
      @keyframes jt-bounce {
        0% { transform: scale(1); }
        30% { transform: scale(1.02); }
        60% { transform: scale(0.99); }
        100% { transform: scale(1); }
      }
      @keyframes jt-fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes jt-pulse { 0%,100% { box-shadow: 0 0 0 0 ${G}40; } 50% { box-shadow: 0 0 12px 4px ${G}20; } }
      @keyframes jt-glow { 0%,100% { border-color: ${G}30; } 50% { border-color: ${G}80; } }
      @keyframes jt-barFill { 0% { width: 0%; } }
      @keyframes jt-cardIn {
        0% { opacity: 0; transform: translateY(12px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .jt-card { animation: jt-cardIn 0.4s ease both; }
      .jt-card:nth-child(2) { animation-delay: 0.05s; }
      .jt-card:nth-child(3) { animation-delay: 0.1s; }
      .jt-card:nth-child(4) { animation-delay: 0.15s; }
      .jt-card:nth-child(5) { animation-delay: 0.2s; }
      .jt-card:nth-child(6) { animation-delay: 0.25s; }
      #${TID} { animation: jt-slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      #${TID}.jt-closing { animation: jt-slideOut 0.25s ease forwards; }
      #${TID} .jt-gauge-bar { animation: jt-barFill 0.8s ease both; }
      #${TID}:hover { box-shadow: 0 12px 50px rgba(0,0,0,0.5), 0 0 1px ${G}40; }
      #${TID} .jt-title-icon { animation: jt-pulse 2s ease-in-out infinite; border-radius: 8px; }
      #${TID} .jt-mon-section { animation: jt-glow 3s ease-in-out infinite; }
      @keyframes jt-helpIn {
        0% { opacity: 0; transform: translateY(-8px); max-height: 0; padding-top: 0; padding-bottom: 0; }
        100% { opacity: 1; transform: translateY(0); max-height: 600px; padding-top: 16px; padding-bottom: 16px; }
      }
      @keyframes jt-helpOut {
        0% { opacity: 1; transform: translateY(0); max-height: 600px; }
        100% { opacity: 0; transform: translateY(-8px); max-height: 0; padding-top: 0; padding-bottom: 0; }
      }
      #jt-help-overlay { overflow: hidden; }
      #jt-help-overlay.jt-help-show { animation: jt-helpIn 0.3s ease both; }
      #jt-help-overlay.jt-help-hide { animation: jt-helpOut 0.2s ease both; }
      #jt-help-btn:hover { background: ${G}25 !important; color: ${G} !important; }
      #jt-help-overlay a { color: ${BL}; text-decoration: none; }
      #jt-help-overlay a:hover { text-decoration: underline; }
      #jt-help-overlay h4 { margin: 0 0 6px 0; font-size: 12px; color: ${G}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      #jt-help-overlay p, #jt-help-overlay li { font-size: 11.5px; color: ${TD}; line-height: 1.6; margin: 0; }
      #jt-help-overlay ul { padding-left: 16px; margin: 4px 0 0 0; }
      #jt-help-overlay li { margin-bottom: 3px; }
      #jt-help-overlay .jt-help-section { margin-bottom: 14px; }
      #jt-help-overlay .jt-help-section:last-child { margin-bottom: 0; }
      #jt-help-overlay code { background: ${BD}; padding: 1px 5px; border-radius: 3px; font-size: 11px; color: ${T}; }
    `;
    document.head.appendChild(style);
  }

  // Floating panel
  const panel = document.createElement('div');
  panel.id = TID;
  panel.style.cssText = `
    position: fixed;
    top: 50px; right: 40px;
    width: 680px; max-width: calc(100vw - 80px);
    max-height: calc(100vh - 80px);
    overflow-y: auto; overflow-x: hidden;
    background: ${BG};
    border: 1px solid ${BD};
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.45), 0 0 1px ${G}30;
    color: ${T};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    z-index: 9999;
    resize: both;
  `;

  // Draggable title bar
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; cursor: grab;
    background: linear-gradient(135deg, ${CD}, ${BG});
    border-bottom: 1px solid ${BD};
    border-radius: 14px 14px 0 0;
    user-select: none;
    position: sticky; top: 0; z-index: 2;
    backdrop-filter: blur(10px);
  `;
  titleBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <div class="jt-title-icon" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:${G}18;border-radius:7px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="${G}" stroke-width="1.5" fill="${G}15"/><path d="M8 12h8M12 8v8" stroke="${G}" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
      <span style="font-size:13px;font-weight:700;">Operator X02</span>
      <span style="font-size:13px;font-weight:700;color:${G};">\u00D7 Jetson</span>
      <span style="font-size:10px;color:${TD};padding:2px 6px;background:${TD}15;border-radius:4px;">Phase 2</span>
    </div>
    <div style="display:flex;align-items:center;gap:4px;">
      <div id="jt-help-btn" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:5px;color:${TD};transition:all 0.15s;font-size:13px;font-weight:700;" title="Help &amp; Guide">?</div>
      <div id="jt-minimize" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:5px;color:${TD};transition:all 0.15s;" title="Minimize">
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1.5"/></svg>
      </div>
      <div id="jt-close" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:5px;color:${TD};transition:all 0.15s;" title="Close (Esc)">
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
      </div>
    </div>
  `;

  // Body content
  const body = document.createElement('div');

  // [FEATURE PACK] Toolbar with buttons for all 10 features
  const featureBar = document.createElement('div');
  featureBar.id = 'jt-feature-bar';
  featureBar.style.cssText = [
    'display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;',
    'border-bottom:1px solid #1a2a00;background:#060f00;flex-shrink:0'
  ].join('');
  featureBar.style.cssText = [
    'display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px;',
    'border-bottom:1px solid #1a2a00;background:linear-gradient(180deg,#0a1400,#060a00);flex-shrink:0;',
    'animation:jt-bar-in 0.4s ease'
  ].join('');
  featureBar.innerHTML = `
    <style>
      @keyframes jt-bar-in {
        from { opacity:0; transform:translateY(-8px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes jt-btn-pulse {
        0%,100% { box-shadow:0 0 0px rgba(118,185,0,0); }
        50%      { box-shadow:0 0 8px rgba(118,185,0,0.4); }
      }
      .jt-fb-btn {
        background:#0a1400;
        border:1px solid #2a3a00;
        color:#76B900;
        padding:5px 12px;
        cursor:pointer;
        font-family:'JetBrains Mono',monospace;
        font-size:10px;
        letter-spacing:1.5px;
        transition:all 0.2s ease;
        white-space:nowrap;
        position:relative;
        overflow:hidden;
      }
      .jt-fb-btn::before {
        content:'';
        position:absolute;inset:0;
        background:linear-gradient(90deg,transparent,rgba(118,185,0,0.08),transparent);
        transform:translateX(-100%);
        transition:transform 0.4s ease;
      }
      .jt-fb-btn:hover::before { transform:translateX(100%); }
      .jt-fb-btn:hover {
        background:rgba(118,185,0,0.12);
        border-color:#76B900;
        color:#aeff44;
        transform:translateY(-1px);
        box-shadow:0 4px 12px rgba(118,185,0,0.2);
      }
      .jt-fb-btn:active { transform:translateY(0); }
      .jt-fb-btn .jt-fb-icon {
        display:inline-block;
        margin-right:5px;
        font-size:11px;
        transition:transform 0.2s;
      }
      .jt-fb-btn:hover .jt-fb-icon { transform:scale(1.2); }
      .jt-fb-sep {
        width:1px;background:#1a2a00;margin:0 2px;align-self:stretch;
      }
    </style>
    <style></style>
    <button class="jt-fb-btn" id="jt-fb-term" data-tip="Remote Terminal|Run shell commands directly on your Jetson over SSH. Full bash access â€” run scripts, check logs, install packages."><span class="jt-fb-icon">&gt;_</span>TERMINAL</button>
    <button class="jt-fb-btn" id="jt-fb-files" data-tip="File Browser|Browse, upload, and download files on your Jetson filesystem. Navigate directories and manage remote project files."><span class="jt-fb-icon">[+]</span>FILES</button>
    <div class="jt-fb-sep"></div>
    <button class="jt-fb-btn" id="jt-fb-perf" data-tip="Performance Graph|Live charts of GPU usage, CPU load, RAM, temperature and power draw streamed in real-time via tegrastats."><span class="jt-fb-icon">/\</span>PERF</button>
    <button class="jt-fb-btn" id="jt-fb-power" data-tip="Power and AI Tools|Switch nvpmodel power profiles (MAXN / 15W / 7W) and convert ONNX models to TensorRT engines on the Jetson GPU."><span class="jt-fb-icon">~</span>POWER</button>
    <div class="jt-fb-sep"></div>
    <button class="jt-fb-btn" id="jt-fb-multi" data-tip="Multi-Device Manager|Manage and monitor multiple Jetson boards simultaneously. Switch between devices and run commands on all at once."><span class="jt-fb-icon">::</span>DEVICES</button>
    <button class="jt-fb-btn" id="jt-fb-dev" data-tip="Dev Tools|CUDA kernel profiler (nsys/nvprof), live logs viewer, and OTA deploy â€” push code, compile and run it on Jetson in one click."><span class="jt-fb-icon">{}</span>DEVTOOLS</button>

  `;
  panel.appendChild(featureBar);

  // Wire feature buttons
  setTimeout(() => {
    document.getElementById('jt-fb-term')?.addEventListener('click',  () => (window as any).openJetsonTerminal?.());
    document.getElementById('jt-fb-files')?.addEventListener('click', () => (window as any).openJetsonFileBrowser?.());
    document.getElementById('jt-fb-perf')?.addEventListener('click',  () => (window as any).openJetsonPerfGraph?.());
    document.getElementById('jt-fb-power')?.addEventListener('click', () => (window as any).openJetsonPowerManager?.());
    document.getElementById('jt-fb-multi')?.addEventListener('click', () => (window as any).openJetsonMultiDevice?.());
    document.getElementById('jt-fb-dev')?.addEventListener('click',   () => (window as any).openJetsonDevTools?.());

    // Global floating tooltip for feature bar buttons
    const tip = document.createElement('div');
    tip.id = 'jt-global-tip';
    tip.style.cssText = [
      'position:fixed;display:none;z-index:999999;pointer-events:none;',
      'background:#0d1f00;border:1px solid #76B90060;border-radius:6px;',
      'padding:8px 12px;width:210px;font-family:JetBrains Mono,monospace;',
      'font-size:10px;line-height:1.6;color:#aaa;box-shadow:0 4px 20px rgba(0,0,0,0.7);'
    ].join('');
    document.body.appendChild(tip);

    featureBar.querySelectorAll('.jt-fb-btn[data-tip]').forEach((btn: Element) => {
      const raw = (btn as HTMLElement).dataset.tip || '';
      const [title, desc] = raw.split('|');
      btn.addEventListener('mouseenter', (e: Event) => {
        const rect = (btn as HTMLElement).getBoundingClientRect();
        tip.innerHTML = `<strong style="color:#76B900;display:block;margin-bottom:3px;font-size:11px;">${title}</strong>${desc}`;
        tip.style.display = 'block';
        tip.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';
        tip.style.top = (rect.bottom + 8) + 'px';
      });
      btn.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
  }, 100);

  body.style.cssText = 'padding: 16px 14px;';
  body.innerHTML = html();
  root = body;

  // Add jt-card class to each card section for staggered animation
  body.querySelectorAll(':scope > div > div').forEach(el => el.classList.add('jt-card'));

  panel.appendChild(titleBar);

  // --- Help overlay ---
  const helpOverlay = document.createElement('div');
  helpOverlay.id = 'jt-help-overlay';
  helpOverlay.style.cssText = `
    display: none; padding: 16px 20px; margin: 0 14px;
    background: linear-gradient(135deg, ${CD}, ${BG});
    border: 1px solid ${G}30; border-radius: 10px;
    margin-top: 12px;
  `;
  helpOverlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="${G}" stroke-width="1.5"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.87.8c0 1.7-2.37 2.2-2.37 2.2" stroke="${G}" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="17" r="0.8" fill="${G}"/></svg>
        <span style="font-size:13px;font-weight:700;color:${T};">Jetson Panel Guide</span>
      </div>
      <div id="jt-help-close" style="cursor:pointer;color:${TD};font-size:16px;padding:2px 6px;border-radius:4px;transition:all 0.15s;" title="Close help">\u2715</div>
    </div>

    <div class="jt-help-section">
      <h4>\u26A1 What is this?</h4>
      <p>This panel lets you remotely monitor and deploy code to an <strong style="color:${T};">NVIDIA Jetson</strong> device (Orin Nano, Xavier, etc.) directly from Operator X02. It connects via SSH and streams real-time GPU, RAM, CPU, and power telemetry using <code>tegrastats</code>.</p>
    </div>

    <div class="jt-help-section">
      <h4>\u{1F680} How to use</h4>
      <ul>
        <li><strong style="color:${T};">Connect</strong> \u2014 Enter your Jetson\u2019s IP, port (default 22), username &amp; password, then click <strong style="color:${OK};">Connect</strong>.</li>
        <li><strong style="color:${T};">Device Info</strong> \u2014 Once connected, the panel auto-fetches model, JetPack version, L4T, CUDA version, RAM, and CPU info.</li>
        <li><strong style="color:${T};">Tegrastats</strong> \u2014 Click <strong style="color:${OK};">Start</strong> to begin streaming GPU usage, RAM, temps, and power. Click <strong style="color:${ER};">Stop</strong> to end.</li>
        <li><strong style="color:${T};">Deploy</strong> \u2014 Open a <code>.cu</code> or <code>.py</code> file in the editor, then click <strong style="color:${G};">Deploy</strong> to upload, compile, and run it on the Jetson.</li>
        <li><strong style="color:${T};">Window</strong> \u2014 Drag the title bar to move. Resize from bottom-right corner. Press <strong style="color:${T};">Esc</strong> or \u2715 to close.</li>
      </ul>
    </div>

    <div class="jt-help-section">
      <h4>\u26A0\uFE0F Common issues</h4>
      <ul>
        <li><strong style="color:${WN};">Connection refused</strong> \u2014 Make sure SSH is enabled on the Jetson: <code>sudo systemctl enable ssh && sudo systemctl start ssh</code></li>
        <li><strong style="color:${WN};">Timeout / unreachable</strong> \u2014 Verify both machines are on the same network. Try <code>ping &lt;jetson-ip&gt;</code> from your PC first.</li>
        <li><strong style="color:${WN};">Auth failed</strong> \u2014 Double-check username and password. Default Jetson user is often <code>nvidia</code> or your custom user.</li>
        <li><strong style="color:${WN};">Tegrastats shows 0 / N/A</strong> \u2014 The Jetson may need <code>sudo</code> privileges for tegrastats. Try connecting as root or adding your user to the appropriate group.</li>
        <li><strong style="color:${WN};">IDE feels laggy during streaming</strong> \u2014 Close DevTools console (logging is expensive). The poll interval is 2s to minimize impact. Stop streaming when not actively monitoring.</li>
        <li><strong style="color:${WN};">Deploy fails to compile</strong> \u2014 Ensure CUDA toolkit is installed on the Jetson. Check that <code>nvcc</code> is in PATH.</li>
      </ul>
    </div>

    <div class="jt-help-section">
      <h4>\u{1F4CB} Requirements</h4>
      <p>NVIDIA Jetson with JetPack installed \u2022 SSH enabled \u2022 Same network as your PC \u2022 For CUDA deploys: nvcc in PATH</p>
    </div>
  `;
  panel.appendChild(helpOverlay);

  panel.appendChild(body);
  document.body.appendChild(panel);

  // --- Drag logic ---
  let isDragging = false, offsetX = 0, offsetY = 0;
  titleBar.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('#jt-minimize, #jt-close, #jt-help-btn')) return;
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    titleBar.style.cursor = 'grabbing';
    panel.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offsetX));
    const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offsetY));
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) { isDragging = false; titleBar.style.cursor = 'grab'; }
  });

  // --- Window controls ---
  let minimized = false;
  const minBtn = panel.querySelector('#jt-minimize') as HTMLElement;
  const closeBtn = panel.querySelector('#jt-close') as HTMLElement;

  [minBtn, closeBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = btn.id === 'jt-close' ? '#f8514920' : '#ffffff12';
      btn.style.color = btn.id === 'jt-close' ? ER : T;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent'; btn.style.color = TD;
    });
  });

  minBtn?.addEventListener('click', () => {
    minimized = !minimized;
    body.style.display = minimized ? 'none' : 'block';
    panel.style.maxHeight = minimized ? '44px' : 'calc(100vh - 80px)';
    panel.style.overflow = minimized ? 'hidden' : 'auto';
    panel.style.resize = minimized ? 'none' : 'both';
  });

  closeBtn?.addEventListener('click', () => closeTab());

  // --- Help toggle ---
  const helpBtn = panel.querySelector('#jt-help-btn') as HTMLElement;
  const helpClose = helpOverlay.querySelector('#jt-help-close') as HTMLElement;
  let helpVisible = false;
  const toggleHelp = () => {
    if (!helpVisible) {
      helpOverlay.style.display = 'block';
      helpOverlay.className = 'jt-help-show';
      helpBtn.style.background = G + '25';
      helpBtn.style.color = G;
      helpVisible = true;
    } else {
      helpOverlay.className = 'jt-help-hide';
      helpBtn.style.background = 'transparent';
      helpBtn.style.color = TD;
      helpVisible = false;
      setTimeout(() => { if (!helpVisible) helpOverlay.style.display = 'none'; }, 200);
    }
  };
  helpBtn?.addEventListener('click', toggleHelp);
  helpClose?.addEventListener('click', toggleHelp);
  helpClose?.addEventListener('mouseenter', () => { helpClose.style.background = '#ffffff12'; helpClose.style.color = T; });
  helpClose?.addEventListener('mouseleave', () => { helpClose.style.background = 'transparent'; helpClose.style.color = TD; });

  // Escape to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { closeTab(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  setTimeout(() => wire(), 80);
  console.log('[Jetson] Floating panel opened');
}

export function closeTab(): void {
  const panel = document.getElementById(TID);
  if (panel) {
    panel.classList.add('jt-closing');
    setTimeout(() => { panel.remove(); }, 250);
  }
  stopMon();
  root = null;
}


function html(): string {
  return `<div style="max-width:800px;margin:0 auto;padding:8px 20px 24px;">
  <div style="text-align:center;margin-bottom:16px;">
    <div id="jt-badge" style="display:inline-block;padding:3px 14px;border-radius:10px;font-size:11px;font-weight:600;background:${ER}20;color:${ER};border:1px solid ${ER}30;">\u25CF Disconnected</div>
  </div>
  <div style="background:${CD};border:1px solid ${BD};border-radius:10px;padding:16px;margin-bottom:12px;">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px;">SSH Connection</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><label style="font-size:10px;color:${TD};text-transform:uppercase;">Host</label><input id="jt-host" value="192.168.43.109" style="${iS}"/></div>
      <div><label style="font-size:10px;color:${TD};text-transform:uppercase;">Port</label><input id="jt-port" type="number" value="22" style="${iS}"/></div>
      <div><label style="font-size:10px;color:${TD};text-transform:uppercase;">Username</label><input id="jt-user" value="orin_nano" style="${iS}"/></div>
      <div><label style="font-size:10px;color:${TD};text-transform:uppercase;">Password</label><input id="jt-pass" type="password" value="jetson" style="${iS}"/></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button id="jt-go" style="${bS(G,'#000')}">Connect</button>
      <button id="jt-dc" style="${bS('transparent',TD)};border:1px solid ${BD};opacity:0.5;" disabled>Disconnect</button>
    </div>
    <div id="jt-log" style="margin-top:8px;font-size:11px;color:${TD};font-family:monospace;min-height:16px;"></div>
  </div>
  <div id="jt-dev" style="background:${CD};border:1px solid ${BD};border-radius:10px;padding:16px;margin-bottom:12px;display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Device Information</div>
    <div id="jt-dev-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;"></div>
  </div>
  <div id="jt-mon" class="jt-mon-section" style="background:${CD};border:1px solid ${G}30;border-radius:10px;padding:16px;margin-bottom:12px;display:none;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:13px;font-weight:700;color:${G};">TEGRASTATS</span><span id="jt-mon-badge" style="font-size:10px;padding:2px 8px;border-radius:10px;background:${TD}20;color:${TD};">STOPPED</span></div>
      <div style="display:flex;gap:6px;"><button id="jt-mon-go" style="${bS(G,'#000')};padding:4px 12px;font-size:11px;">Start</button><button id="jt-mon-stop" style="${bS('transparent',TD)};border:1px solid ${BD};padding:4px 12px;font-size:11px;opacity:0.5;" disabled>Stop</button></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><div id="jt-g-gpu"></div><div id="jt-g-ram"></div><div id="jt-g-pwr"></div></div>
      <div><div id="jt-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div><div id="jt-cores" style="margin-top:10px;"></div></div>
    </div>
  </div>
  <div id="jt-dep" style="background:${CD};border:1px solid ${BD};border-radius:10px;padding:16px;margin-bottom:12px;display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Deploy & Run</div>
    <div style="margin-bottom:8px;"><label style="font-size:10px;color:${TD};text-transform:uppercase;">Local File</label><input id="jt-d-path" placeholder="C:\\path\\to\\file.cu" style="${iS}"/></div>
    <div style="margin-bottom:8px;"><label style="font-size:10px;color:${TD};text-transform:uppercase;">Remote Dir</label><input id="jt-d-remote" value="/home/orin_nano/x02-deploy" style="${iS}"/></div>
    <div style="margin-bottom:8px;"><label style="font-size:10px;color:${TD};text-transform:uppercase;">Run Command (auto if empty)</label><input id="jt-d-cmd" placeholder="Auto from extension" style="${iS}"/></div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
      <button id="jt-d-go" style="${bS(G,'#000')}">&#9889; Deploy &amp; Run</button>
      <button id="jt-d-upload" style="${bS('transparent',G)};border:1px solid ${G}40;font-size:11px;">&#8593; Upload Only</button>
      <button id="jt-d-cur" style="${bS('transparent','#8b949e')};border:1px solid #30363d;font-size:11px;">Active File</button>
      <span id="jt-d-stat" style="font-size:10px;color:${TD};margin-left:auto;"></span>
    </div>
    <div id="jt-d-steps" style="display:none;margin-bottom:6px;padding:5px 10px;background:${BG};border-radius:6px;border:1px solid ${BD};display:flex;align-items:center;gap:4px;">
      <span id="jt-step-upload"  style="font-size:10px;font-family:monospace;color:#8b949e;">&#9675; Upload</span>
      <span style="color:#30363d;font-size:10px;">&#8594;</span>
      <span id="jt-step-compile" style="font-size:10px;font-family:monospace;color:#8b949e;">&#9675; Compile</span>
      <span style="color:#30363d;font-size:10px;">&#8594;</span>
      <span id="jt-step-run"     style="font-size:10px;font-family:monospace;color:#8b949e;">&#9675; Run</span>
    </div>
    <div id="jt-d-out" style="display:none;margin-top:4px;background:${BG};border:1px solid ${BD};border-radius:6px;padding:10px 12px;font-family:monospace;font-size:11px;max-height:220px;overflow-y:auto;line-height:1.7;"></div>
  </div>
  <div id="jt-exec" style="background:${CD};border:1px solid ${BD};border-radius:10px;padding:16px;margin-bottom:12px;display:none;">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Remote Execute</div>
    <div style="display:flex;gap:8px;"><input id="jt-e-cmd" placeholder="ls -la /home/orin_nano/" style="${iS};flex:1;"/><button id="jt-e-go" style="${bS(BL,'#000')};padding:6px 14px;">Run</button></div>
    <div id="jt-e-out" style="display:none;margin-top:8px;background:${BG};border:1px solid ${BD};border-radius:6px;padding:10px 12px;font-family:monospace;font-size:11px;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>
  </div>
  <div style="padding:10px 14px;background:${CD};border-radius:8px;border:1px solid ${BD};text-align:center;">
    <div style="color:${TD};font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Pipeline</div>
    <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;font-family:monospace;font-size:11px;">
      <span style="background:${BL}15;padding:3px 8px;border-radius:5px;color:${BL}">X02 UI</span><span style="color:${TD};padding:0 5px;">\u2192</span>
      <span style="background:${WN}15;padding:3px 8px;border-radius:5px;color:${WN}">Tauri IPC</span><span style="color:${TD};padding:0 5px;">\u2192</span>
      <span style="background:#f9718515;padding:3px 8px;border-radius:5px;color:#f97185">Rust ssh2</span><span style="color:${TD};padding:0 5px;">\u2192</span>
      <span style="background:${G}15;padding:3px 8px;border-radius:5px;color:${G}">Jetson GPU</span>
    </div>
  </div>
</div>`;
}

// === Wire Events =============================================================
function wire(): void {
  if (!root) return;
  const q = (id: string) => root!.querySelector('#' + id) as HTMLElement | null;
  const qi = (id: string) => root!.querySelector('#' + id) as HTMLInputElement;
  const qb = (id: string) => root!.querySelector('#' + id) as HTMLButtonElement;

  qb('jt-go')?.addEventListener('click', async () => {
    const btn = qb('jt-go'); const log = q('jt-log');
    if (btn) { btn.textContent = 'Connecting...'; btn.style.opacity = '0.5'; }
    if (log) log.textContent = 'Establishing SSH tunnel...';
    try {
      const r = await invoke('jetson_connect', {
        host: qi('jt-host')?.value || '192.168.43.109', port: parseInt(qi('jt-port')?.value || '22'),
        username: qi('jt-user')?.value || 'orin_nano', password: qi('jt-pass')?.value || 'jetson', authMethod: 'password',
      }) as any;
      if (r.connected) { conn = true; if (log) log.innerHTML = '<span style="color:' + OK + '">\u2713 Connected to ' + (r.profile_id||'') + '</span>'; updUI(true); await devInfo(); }
      else { if (log) log.innerHTML = '<span style="color:' + ER + '">\u2717 Failed</span>'; }
    } catch (e) { if (log) log.innerHTML = '<span style="color:' + ER + '">\u2717 ' + e + '</span>'; }
    if (btn) { btn.textContent = 'Connect'; btn.style.opacity = '1'; }
  });

  qb('jt-dc')?.addEventListener('click', async () => {
    try { await invoke('jetson_disconnect'); } catch(_){}
    conn = false; stopMon(); updUI(false);
    const log = q('jt-log'); if (log) log.innerHTML = '<span style="color:' + TD + '">\u2713 Disconnected</span>';
  });

  qb('jt-mon-go')?.addEventListener('click', () => {
    if (!conn) {
      const b = q('jt-mon-badge');
      if (b) { b.textContent = 'NOT CONNECTED'; b.style.background = ER+'20'; b.style.color = ER; }
      const log = q('jt-log');
      if (log) log.innerHTML = '<span style="color:'+ER+'">Connect via SSH first</span>';
      console.warn('[Jetson] Start clicked but conn=false — not connected');
      return;
    }
    // Fire-and-forget — NEVER await jetson_start_monitoring
    // It blocks 2-5s waiting for tegrastats subprocess, freezing JS entirely
    invoke('jetson_start_monitoring', { intervalMs: 1000 }).catch((e: unknown) => console.warn('[Jetson] start_monitoring:', e));
    startPoll();
    const b = q('jt-mon-badge'); if (b) { b.textContent = '\u25CF STREAMING'; b.style.background = OK+'20'; b.style.color = OK; }
    const s = qb('jt-mon-go'), e = qb('jt-mon-stop');
    if (s) { s.disabled = true; s.style.opacity = '0.5'; } if (e) { e.disabled = false; e.style.opacity = '1'; }
  });
  qb('jt-mon-stop')?.addEventListener('click', () => stopMon());

  qb('jt-d-go')?.addEventListener('click', async () => {
    const p = qi('jt-d-path')?.value;
    if (!p) { const s = q('jt-d-stat'); if (s) s.innerHTML = '<span style="color:'+WN+'">Enter file path</span>'; return; }
    await deploy(p, false);
  });

  qb('jt-d-upload')?.addEventListener('click', async () => {
    const p = qi('jt-d-path')?.value;
    if (!p) { const s = q('jt-d-stat'); if (s) s.innerHTML = '<span style="color:'+WN+'">Enter file path</span>'; return; }
    await deploy(p, true);
  });

  qb('jt-d-cur')?.addEventListener('click', async () => {
    const ed = (window as any).monaco?.editor?.getEditors()?.[0];
    const uri = ed?.getModel()?.uri;
    let fp = '';
    // Try real file paths first (fsPath has drive letter on Windows)
    if (uri?.fsPath && uri.fsPath.length > 5) fp = uri.fsPath;
    else if (uri?.path && uri.path.length > 5) fp = uri.path;
    // Fallback: IDE file tracking systems
    if (!fp) fp = (window as any).currentOpenFilePath || '';
    if (!fp) fp = (window as any).tabManager?.currentFile?.path || '';
    if (!fp) fp = (window as any).tabManager?.activeTab?.path || '';
    if (!fp) fp = document.querySelector('.breadcrumb-path, .file-path, [data-filepath]')?.textContent?.trim() || '';
    if (!fp) fp = document.querySelector('[data-filepath]')?.getAttribute('data-filepath') || '';
    // Fix Monaco URI on Windows: /C:/foo → C:/foo
    if (/^\/[A-Za-z]:/.test(fp)) fp = fp.substring(1);
        if (!fp) {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid '+G+';border-radius:8px;padding:16px 24px;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,0.5);text-align:center;max-width:360px;';
      toast.innerHTML = '<div style="font-size:20px;margin-bottom:8px;">??</div><div style="color:#fff;font-size:13px;font-weight:600;margin-bottom:6px;">No file open in editor</div><div style="color:#aaa;font-size:11px;line-height:1.5;">Open a <span style="color:'+G+';font-weight:600;">.cu</span> or <span style="color:'+G+';font-weight:600;">.py</span> file in the IDE editor first, then click <b>Current File</b> again.</div><div style="color:#666;font-size:10px;margin-top:8px;">Or type the path manually above</div>';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
      const s = q('jt-d-stat'); if (s) s.innerHTML = '<span style="color:'+WN+'">Open a file in editor first</span>';
      return;
    }
    const inp = qi('jt-d-path'); if (inp) inp.value = fp;
    await deploy(fp);
  });

  qb('jt-e-go')?.addEventListener('click', async () => {
    const cmd = qi('jt-e-cmd')?.value; if (!cmd) return;
    const out = q('jt-e-out'); if (out) { out.style.display = 'block'; out.textContent = 'Running...'; out.style.color = TD; }
    try { const r = await invoke('jetson_execute', { command: cmd }) as any;
      if (out) { out.style.color = T; out.textContent = r.stdout || r.output || JSON.stringify(r) || '(none)'; }
    } catch(e) { if (out) { out.style.color = ER; out.textContent = 'Error: ' + e; } }
  });
  qi('jt-e-cmd')?.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') qb('jt-e-go')?.click(); });
}

// === Actions =================================================================
async function devInfo(): Promise<void> {
  if (!root) return;
  try {
    const d = await invoke('jetson_device_info') as DeviceInfo;
    const g = root.querySelector('#jt-dev-grid'); if (!g) return;
    const items = [{l:'Model',v:d.model},{l:'JetPack',v:d.jetpack_version},{l:'L4T',v:d.l4t_version},{l:'CUDA',v:d.cuda_version||'N/A'},{l:'RAM',v:d.ram_total_mb+' MB'},{l:'CPU',v:(d.cpu_cores||'?')+' cores ('+(d.arch||'ARM')+')'}];
    g.innerHTML = items.map(i => '<div style="background:'+BG+';border-radius:6px;padding:8px 10px;border:1px solid '+BD+';"><div style="color:'+TD+';font-size:9px;text-transform:uppercase;margin-bottom:2px;">'+i.l+'</div><div style="color:'+T+';font-size:12px;font-weight:600;font-family:monospace;word-break:break-all;">'+i.v+'</div></div>').join('');
  } catch(e) { console.warn('[Jetson] DevInfo:', e); }
}

// Normalize Rust field names → TS TegraStats (handles multiple naming conventions)
let _loggedOnce = false;
function normStats(raw: any): TegraStats {
  if (!_loggedOnce) { console.log('[Jetson] Raw tegrastats shape:', JSON.stringify(raw, null, 2)); _loggedOnce = true; }
  return {
    ram_used_mb:  raw.ram_used_mb  ?? raw.ram_used  ?? raw.ramUsedMb  ?? 0,
    ram_total_mb: raw.ram_total_mb ?? raw.ram_total ?? raw.ramTotalMb ?? 0,
    gpu_usage:    raw.gpu_percent  ?? raw.gpu_usage ?? raw.gpu_util ?? raw.gpuUsage ?? raw.gpu_load ?? 0,
    cpu_temp:     raw.temp_cpu     ?? raw.cpu_temp ?? raw.cpu_temperature ?? raw.cpuTemp ?? 0,
    gpu_temp:     raw.temp_gpu     ?? raw.gpu_temp ?? raw.gpu_temperature ?? raw.gpuTemp ?? 0,
    power_draw:   raw.power_draw   ?? raw.power_current_mw ?? raw.power_current ?? raw.powerDraw ?? raw.power_mw ?? 0,
    power_limit:  raw.power_limit  ?? raw.power_max ?? raw.power_budget ?? raw.powerLimit ?? 15,
    cpu_usage:    (raw.cpu_usage ?? raw.cpu_cores_usage ?? raw.cpuUsage ?? []).map((c: any) => typeof c === 'number' ? c : (c.usage_percent ?? c.percent ?? 0)),
  };
}

function startPoll(): void {
  document.dispatchEvent(new CustomEvent('jetson-streaming-start')); // X02Perf throttle
  if (monIv) clearInterval(monIv);
  let polling = false;
  let tick = 0;
  console.log('[Jetson] startPoll() conn:', conn, 'root:', !!root);
  monIv = setInterval(async () => {
    tick++;
    if (!root) { if (tick <= 3) console.warn('[Jetson] tick', tick, 'root null'); return; }
    if (!conn) { if (tick <= 3) console.warn('[Jetson] tick', tick, 'not connected'); return; }
    if (polling) { return; }
    polling = true;
    try {
      // 5s timeout race — snapshot blocks forever if tegrastats not ready
      const raw = await Promise.race([
        invoke('jetson_tegrastats_snapshot') as Promise<unknown>,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      const s = normStats(raw);
      requestAnimationFrame(() => renderStats(s));
    } catch(e: unknown) {
      const msg = (e instanceof Error) ? e.message : String(e);
      if (msg !== 'timeout') console.warn('[Jetson] snapshot tick', tick, msg);
    } finally {
      polling = false; // ALWAYS reset — stuck polling=true kills all future ticks
    }
  }, 2000);
}

function stopMon(): void {
  document.dispatchEvent(new CustomEvent('jetson-streaming-stop')); // X02Perf restore
  if (monIv) { clearInterval(monIv); monIv = null; }
  invoke('jetson_stop_monitoring').catch(()=>{});
  if (!root) return;
  const b = root.querySelector('#jt-mon-badge') as HTMLElement;
  if (b) { b.textContent = 'STOPPED'; b.style.background = TD+'20'; b.style.color = TD; }
  const s = root.querySelector('#jt-mon-go') as HTMLButtonElement;
  const e = root.querySelector('#jt-mon-stop') as HTMLButtonElement;
  if (s) { s.disabled = false; s.style.opacity = '1'; } if (e) { e.disabled = true; e.style.opacity = '0.5'; }
}

// Targeted DOM update — only touches .jt-bar width/color and .jt-val text
function updateGauge(id: string, label: string, val: number, max: number, unit: string, color: string): void {
  if (!root) return;
  const container = root.querySelector('#' + id) as HTMLElement;
  if (!container) return;
  const p = Math.min(100, (val / max) * 100);
  const c = p > 80 ? ER : p > 60 ? WN : color;
  let bar = container.querySelector('.jt-bar') as HTMLElement;
  let valSpan = container.querySelector('.jt-val') as HTMLElement;
  if (!bar) {
    // First render only — create structure once
    container.innerHTML = '<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:11px;color:'+TD+';margin-bottom:3px;"><span>'+label+'</span><span style="color:'+T+';font-family:monospace;" class="jt-val">'+val+unit+' <span style="color:'+TD+'">/ '+max+unit+'</span></span></div><div style="background:'+BD+'60;border-radius:4px;height:6px;overflow:hidden;"><div class="jt-bar" style="width:'+p+'%;height:100%;border-radius:4px;background:'+c+';transition:width 0.6s,background 0.4s;"></div></div></div>';
    return;
  }
  // Fast path — two property writes, zero innerHTML
  bar.style.width = p + '%';
  bar.style.background = c;
  if (valSpan) valSpan.innerHTML = val+unit+' <span style="color:'+TD+'">/ '+max+unit+'</span>';
}

// Targeted stat card update — create once, then just change textContent
function updateStatCard(container: HTMLElement, index: number, label: string, value: string, warn: boolean): void {
  let card = container.children[index] as HTMLElement;
  if (!card) {
    card = document.createElement('div');
    card.style.cssText = 'background:'+BG+';border-radius:6px;padding:7px 9px;border:1px solid '+BD+';transition:border-color 0.3s;';
    card.innerHTML = '<div style="color:'+TD+';font-size:9px;margin-bottom:2px;" class="jt-sl"></div><div style="font-size:14px;font-weight:700;font-family:monospace;transition:color 0.3s;" class="jt-sv"></div>';
    container.appendChild(card);
  }
  card.style.borderColor = warn ? WN+'40' : BD;
  const sl = card.querySelector('.jt-sl') as HTMLElement;
  const sv = card.querySelector('.jt-sv') as HTMLElement;
  if (sl) sl.textContent = label;
  if (sv) { sv.textContent = value; sv.style.color = warn ? WN : T; }
}

function renderStats(s: TegraStats): void {
  if (!root) return;
  // Gauges — targeted property updates, no DOM rebuild
  updateGauge('jt-g-gpu', 'GPU Usage', s.gpu_usage, 100, '%', G);
  updateGauge('jt-g-ram', 'RAM', s.ram_used_mb, s.ram_total_mb, ' MB', BL);
  updateGauge('jt-g-pwr', 'Power', s.power_draw, s.power_limit, ' W', WN);

  // Stat cards — textContent only
  const grid = root.querySelector('#jt-stats') as HTMLElement;
  if (grid) {
    const items = [
      {l:'GPU Temp',v:s.gpu_temp+'\u00B0C',w:s.gpu_temp>70},
      {l:'CPU Temp',v:s.cpu_temp+'\u00B0C',w:s.cpu_temp>70},
      {l:'GPU Load',v:s.gpu_usage+'%',w:s.gpu_usage>90},
      {l:'Power',v:s.power_draw+'W',w:s.power_draw>s.power_limit*0.9},
    ];
    items.forEach((item, i) => updateStatCard(grid, i, item.l, item.v, item.w));
  }

  // CPU cores — build skeleton once, then just update heights
  const cores = root.querySelector('#jt-cores') as HTMLElement;
  if (cores && s.cpu_usage?.length) {
    const existingBars = cores.querySelectorAll('.jt-core-bar');
    if (existingBars.length !== s.cpu_usage.length) {
      // Build skeleton once when core count first known
      cores.innerHTML = '<div style="color:'+TD+';font-size:9px;margin-bottom:5px;">CPU per-core</div><div style="display:flex;gap:3px;">' +
        s.cpu_usage.map((_u: number, i: number) => '<div style="flex:1;text-align:center;"><div style="background:'+BD+'60;border-radius:3px;height:30px;position:relative;overflow:hidden;"><div class="jt-core-bar" data-i="'+i+'" style="position:absolute;bottom:0;width:100%;height:0%;border-radius:3px;transition:height 0.5s,background 0.4s;"></div></div><div class="jt-core-pct" style="color:'+TD+';font-size:8px;margin-top:2px;">0%</div></div>').join('') + '</div>';
    }
    // Fast path — just height + color per bar
    s.cpu_usage.forEach((u: number, i: number) => {
      const bar = cores.querySelector('.jt-core-bar[data-i="'+i+'"]') as HTMLElement;
      const pct = cores.querySelectorAll('.jt-core-pct')[i] as HTMLElement;
      if (bar) { bar.style.height = u + '%'; bar.style.background = u > 60 ? WN : G+'80'; }
      if (pct) pct.textContent = u + '%';
    });
  }
}

async function deploy(localPath: string, uploadOnly = false): Promise<void> {
  if (!root) return;
  // Fix Monaco URI on Windows: /C:/foo → C:/foo
  if (/^\/[A-Za-z]:/.test(localPath)) localPath = localPath.substring(1);
  const stat    = root.querySelector('#jt-d-stat')        as HTMLElement;
  const out     = root.querySelector('#jt-d-out')         as HTMLElement;
  const steps   = root.querySelector('#jt-d-steps')       as HTMLElement;
  const sUp     = root.querySelector('#jt-step-upload')   as HTMLElement;
  const sCo     = root.querySelector('#jt-step-compile')  as HTMLElement;
  const sRn     = root.querySelector('#jt-step-run')      as HTMLElement;
  const goBtn   = root.querySelector('#jt-d-go')          as HTMLButtonElement;
  const upBtn   = root.querySelector('#jt-d-upload')      as HTMLButtonElement;
  const remoteDir = (root.querySelector('#jt-d-remote') as HTMLInputElement)?.value || '/home/orin_nano/x02-deploy';
  let cmd = (root.querySelector('#jt-d-cmd') as HTMLInputElement)?.value || '';
  const fn   = localPath.split(/[\\/]/).pop() || '';
  const ext  = fn.split('.').pop()?.toLowerCase() || '';
  const base = fn.replace(/\.[^.]+$/, '');
  const isCompiled = (ext==='cu'||ext==='cpp'||ext==='c');

  if (!uploadOnly && !cmd) {
    if (ext==='cu')              cmd = 'cd '+remoteDir+' && export PATH=/usr/local/cuda/bin:$PATH && nvcc -o '+base+' '+fn+' && ./'+base;
    else if (ext==='py')         cmd = 'cd '+remoteDir+' && python3 '+fn;
    else if (ext==='cpp'||ext==='c') cmd = 'cd '+remoteDir+' && g++ -o '+base+' '+fn+' && ./'+base;
    else                         cmd = 'cd '+remoteDir+' && cat '+fn;
  } else if (uploadOnly) {
    cmd = 'cd '+remoteDir+' && echo "Upload OK: '+fn+'"';
  }

  // Helpers
  function addLine(text: string, color: string): void {
    if (!out) return;
    out.style.display = 'block';
    const d = document.createElement('div');
    d.style.cssText = 'color:'+color+';padding:1px 0;';
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function step(el: HTMLElement|null, state: 'idle'|'active'|'ok'|'err', label: string): void {
    if (!el) return;
    const col: Record<string,string> = { idle:'#8b949e', active:'#d29922', ok:'#3fb950', err:'#f85149' };
    const ico: Record<string,string> = { idle:'\u25CB', active:'\u25CF', ok:'\u2713', err:'\u2717' };
    el.style.color = col[state];
    el.textContent = ico[state]+' '+label;
  }

  // Reset
  if (out) { out.innerHTML = ''; out.style.display = 'none'; }
  if (steps) steps.style.display = 'flex';
  step(sUp,'active','Upload'); step(sCo,'idle','Compile'); step(sRn,'idle','Run');
  if (stat) stat.textContent = 'Working...';
  if (goBtn) { goBtn.disabled = true; goBtn.style.opacity = '0.5'; }
  if (upBtn) { upBtn.disabled = true; upBtn.style.opacity = '0.5'; }

  const t0 = Date.now();
  addLine('File:   '+fn, '#8b949e');
  addLine('Remote: '+remoteDir, '#8b949e');
  addLine('', '#000');

  try {
    const r = await invoke('jetson_deploy_and_run', { localPath, remoteDir, runCommand: cmd }) as DeployResult;
    const elapsed = ((Date.now()-t0)/1000).toFixed(1);

    // Upload
    if (r.transferred) {
      step(sUp,'ok','Upload');
      addLine('\u2713 Upload OK ('+r.transfer_time_ms+'ms)', OK);
    } else {
      step(sUp,'err','Upload');
      addLine('\u2717 Upload FAILED', ER);
      if (r.error) addLine(r.error, ER);
      if (stat) stat.innerHTML = '<span style="color:'+ER+'">Upload failed</span>';
      if (goBtn) { goBtn.disabled=false; goBtn.style.opacity='1'; }
      if (upBtn) { upBtn.disabled=false; upBtn.style.opacity='1'; }
      return;
    }

    if (uploadOnly) {
      if (stat) stat.innerHTML = '<span style="color:'+OK+'">Upload complete ('+elapsed+'s)</span>';
      if (goBtn) { goBtn.disabled=false; goBtn.style.opacity='1'; }
      if (upBtn) { upBtn.disabled=false; upBtn.style.opacity='1'; }
      return;
    }

    // Compile
    if (isCompiled) {
      step(sCo,'active','Compile');
      if (r.compiled) {
        step(sCo,'ok','Compile');
        addLine('\u2713 Compile OK', BL);
        if (r.compile_output?.trim()) r.compile_output.split('\n').forEach((l:string)=>{ if(l.trim()) addLine('  '+l, BL); });
      } else {
        step(sCo,'err','Compile');
        addLine('\u2717 Compile FAILED', ER);
        if (r.compile_output) r.compile_output.split('\n').forEach((l:string)=>{ if(l.trim()) addLine('  '+l, ER); });
        if (r.error) addLine(r.error, ER);
        if (stat) stat.innerHTML = '<span style="color:'+ER+'">Compile failed ('+elapsed+'s)</span>';
        if (goBtn) { goBtn.disabled=false; goBtn.style.opacity='1'; }
        if (upBtn) { upBtn.disabled=false; upBtn.style.opacity='1'; }
        return;
      }
    }

    // Run
    step(sRn,'active','Run');
    if (r.executed && r.run_exit_code === 0) {
      step(sRn,'ok','Run');
      addLine('', '#000');
      addLine('--- Output ---', TD);
      if (r.run_output?.trim()) r.run_output.split('\n').forEach((l:string)=>{ addLine(l, T); });
      else addLine('(no output)', TD);
      if (stat) stat.innerHTML = '<span style="color:'+OK+'">\u2713 Done in '+elapsed+'s</span>';
    } else {
      step(sRn,'err','Run');
      addLine('\u2717 Run FAILED (exit: '+r.run_exit_code+')', ER);
      if (r.run_output?.trim()) r.run_output.split('\n').forEach((l:string)=>{ if(l.trim()) addLine(l, ER); });
      if (r.error) addLine(r.error, ER);
      if (stat) stat.innerHTML = '<span style="color:'+ER+'">Failed ('+elapsed+'s)</span>';
    }
  } catch(e: any) {
    step(sUp,'err','Upload');
    addLine('Error: '+String(e), ER);
    if (stat) stat.innerHTML = '<span style="color:'+ER+'">Error</span>';
  }

  if (goBtn) { goBtn.disabled=false; goBtn.style.opacity='1'; }
  if (upBtn) { upBtn.disabled=false; upBtn.style.opacity='1'; }
}

function updUI(on: boolean): void {
  if (!root) return;
  const badge = root.querySelector('#jt-badge') as HTMLElement;
  if (badge) { badge.innerHTML = on?'\u25CF Connected':'\u25CF Disconnected'; badge.style.background = (on?OK:ER)+'20'; badge.style.color = on?OK:ER; }
  const goBtn = root.querySelector('#jt-go') as HTMLButtonElement;
  const dcBtn = root.querySelector('#jt-dc') as HTMLButtonElement;
  if (goBtn) { goBtn.disabled = on; goBtn.style.opacity = on?'0.5':'1'; }
  if (dcBtn) { dcBtn.disabled = !on; dcBtn.style.opacity = on?'1':'0.5'; }
  ['jt-dev','jt-mon','jt-dep','jt-exec'].forEach(id => { const el = root!.querySelector('#'+id) as HTMLElement; if (el) el.style.display = on?'block':'none'; });
}



// ============================================================================
// CONNECTION DIALOG - injected by add_jetson_connection_dialog.ps1
// ============================================================================

function buildConnectionForm(container: HTMLElement): void {
  const invokeCmd = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI_INVOKE__;

  function loadProfiles(): any[] {
    try { return JSON.parse(localStorage.getItem("jetson_profiles") || "[]"); }
    catch { return []; }
  }
  function saveProfiles(profiles: any[]): void {
    localStorage.setItem("jetson_profiles", JSON.stringify(profiles));
  }

  // Build form HTML
  const formHtml = [
    "<div id=\"jt-connect-form\">",
    "  <div class=\"jt-form-title\">Connect to Jetson</div>",
    "  <div class=\"jt-field-row\">",
    "    <div class=\"jt-field\" style=\"flex:2\">",
    "      <label>Host / IP</label>",
    "      <input id=\"jt-host-input\" type=\"text\" placeholder=\"192.168.1.100\" autocomplete=\"off\" spellcheck=\"false\"/>",
    "    </div>",
    "    <div class=\"jt-field\" style=\"flex:0.6\">",
    "      <label>Port</label>",
    "      <input id=\"jt-port-input\" type=\"number\" placeholder=\"22\" value=\"22\" min=\"1\" max=\"65535\"/>",
    "    </div>",
    "  </div>",
    "  <div class=\"jt-field-row\">",
    "    <div class=\"jt-field\">",
    "      <label>Username</label>",
    "      <input id=\"jt-user-input\" type=\"text\" placeholder=\"orin_nano\" autocomplete=\"off\"/>",
    "    </div>",
    "    <div class=\"jt-field\">",
    "      <label>Password</label>",
    "      <input id=\"jt-pass-input\" type=\"password\" placeholder=\"password\"/>",
    "    </div>",
    "  </div>",
    "  <div class=\"jt-connect-row\">",
    "    <button id=\"jt-connect-btn\">&#9889; Connect</button>",
    "    <button id=\"jt-save-profile-btn\" title=\"Save profile\">&#128190; Save</button>",
    "  </div>",
    "  <div id=\"jt-status-msg\"></div>",
    "  <div class=\"jt-profiles-row\" id=\"jt-profiles-section\" style=\"display:none\">",
    "    <div class=\"jt-profiles-label\">Saved Profiles</div>",
    "    <div id=\"jt-profiles-list\"></div>",
    "  </div>",
    "</div>"
  ].join("\n");

  container.innerHTML = formHtml;

  const hostEl      = container.querySelector("#jt-host-input")       as HTMLInputElement;
  const portEl      = container.querySelector("#jt-port-input")       as HTMLInputElement;
  const userEl      = container.querySelector("#jt-user-input")       as HTMLInputElement;
  const passEl      = container.querySelector("#jt-pass-input")       as HTMLInputElement;
  const connectBtn  = container.querySelector("#jt-connect-btn")      as HTMLButtonElement;
  const saveBtn     = container.querySelector("#jt-save-profile-btn") as HTMLButtonElement;
  const statusEl    = container.querySelector("#jt-status-msg")       as HTMLDivElement;
  const profilesSec = container.querySelector("#jt-profiles-section") as HTMLDivElement;
  const profilesList= container.querySelector("#jt-profiles-list")    as HTMLDivElement;

  function setStatus(msg: string, type: string): void {
    statusEl.textContent = msg;
    statusEl.className   = type;
  }

  function renderProfiles(): void {
    const profiles = loadProfiles();
    if (profiles.length === 0) { profilesSec.style.display = "none"; return; }
    profilesSec.style.display = "block";
    profilesList.innerHTML = profiles.map((p: any, idx: number) => [
      "<div class=\"jt-profile-item\" data-idx=\"" + idx + "\">",
      "  <div>",
      "    <div class=\"jt-profile-name\">" + (p.name || p.username + "@" + p.host) + "</div>",
      "    <div class=\"jt-profile-host\">" + p.host + ":" + p.port + "</div>",
      "  </div>",
      "  <button class=\"jt-profile-del\" data-idx=\"" + idx + "\" title=\"Delete\">x</button>",
      "</div>"
    ].join("\n")).join("\n");

    // Click profile to fill form
    profilesList.querySelectorAll(".jt-profile-item").forEach((el: Element) => {
      el.addEventListener("click", (e: Event) => {
        if ((e.target as HTMLElement).classList.contains("jt-profile-del")) return;
        const idx = parseInt((el as HTMLElement).dataset.idx || "0");
        const p   = profiles[idx];
        hostEl.value = p.host;
        portEl.value = String(p.port);
        userEl.value = p.username;
        passEl.value = p.password || "";
        setStatus("Profile loaded - click Connect", "");
      });
    });

    // Delete profile
    profilesList.querySelectorAll(".jt-profile-del").forEach((btn: Element) => {
      btn.addEventListener("click", (e: Event) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx || "0");
        saveProfiles(profiles.filter((_: any, i: number) => i !== idx));
        renderProfiles();
      });
    });
  }

  // Save profile
  saveBtn.addEventListener("click", () => {
    const host = hostEl.value.trim();
    const user = userEl.value.trim();
    if (!host || !user) { setStatus("Enter host and username first", "error"); return; }
    const profiles = loadProfiles();
    const name     = user + "@" + host;
    const profile  = { name, host, port: parseInt(portEl.value || "22"), username: user, password: passEl.value };
    const exists   = profiles.findIndex((p: any) => p.host === host && p.username === user);
    if (exists >= 0) { profiles[exists] = profile; } else { profiles.push(profile); }
    saveProfiles(profiles);
    renderProfiles();
    setStatus("Profile saved", "success");
    setTimeout(() => setStatus("", ""), 2000);
  });

  // Connect
  connectBtn.addEventListener("click", async () => {
    const host     = hostEl.value.trim();
    const port     = parseInt(portEl.value || "22");
    const username = userEl.value.trim();
    const password = passEl.value;

    if (!host)     { setStatus("Host / IP is required", "error"); return; }
    if (!username) { setStatus("Username is required",  "error"); return; }

    connectBtn.disabled   = true;
    connectBtn.textContent = "Connecting...";
    setStatus("Connecting to " + username + "@" + host + ":" + port + " ...", "connecting");

    try {
      const result = await invokeCmd("jetson_connect", {
        host, port, username, password, authMethod: "password"
      }) as any;

      if (result && result.connected) {
        setStatus("Connected", "success");
        let deviceInfo: any = null;
        try { deviceInfo = await invokeCmd("jetson_device_info"); } catch (e) { /* ignore */ }
        buildConnectedView(container, { host, port, username }, deviceInfo);
      } else {
        setStatus(result?.error || "Connection failed", "error");
        connectBtn.disabled   = false;
        connectBtn.textContent = "Connect";
      }

    } catch (err: any) {
      const raw = typeof err === "string" ? err : (err?.message || JSON.stringify(err));
      const msg = raw.includes("refused")        ? "Connection refused - Is SSH enabled on Jetson?"
                : raw.includes("Authentication") ? "Auth failed - Check username and password"
                : raw.includes("timed out")      ? "Timeout - Check IP and network"
                : raw;
      setStatus(msg, "error");
      connectBtn.disabled   = false;
      connectBtn.textContent = "Connect";
    }
  });

  // Enter key submits
  [hostEl, portEl, userEl, passEl].forEach((el: HTMLInputElement) => {
    el.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") connectBtn.click();
    });
  });

  // Restore last host
  try {
    const last = JSON.parse(localStorage.getItem("jetson_last_host") || "null");
    if (last) {
      hostEl.value = last.host || "";
      portEl.value = String(last.port || 22);
      userEl.value = last.username || "";
    }
  } catch (e) { /* ignore */ }

  renderProfiles();
}

// ---- Connected state view ----
function buildConnectedView(
  container: HTMLElement,
  conn: { host: string; port: number; username: string },
  deviceInfo: any
): void {
  const invokeCmd = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI_INVOKE__;

  localStorage.setItem("jetson_last_host", JSON.stringify(conn));

  const model   = deviceInfo?.model           || "NVIDIA Jetson";
  const jetpack = deviceInfo?.jetpack_version ? "JetPack " + deviceInfo.jetpack_version.split(",")[0] : "";
  const ramGB   = deviceInfo?.ram_total_mb    ? (deviceInfo.ram_total_mb / 1024).toFixed(1) + " GB RAM" : "";
  const subText = [conn.username + "@" + conn.host, jetpack, ramGB].filter(Boolean).join(" | ");

  container.innerHTML = [
    "<div id=\"jt-connected-view\">",
    "  <div class=\"jt-device-row\">",
    "    <div class=\"jt-device-info\">",
    "      <div class=\"jt-device-name\">" + model + "</div>",
    "      <div class=\"jt-device-sub\">"  + subText + "</div>",
    "    </div>",
    "    <button id=\"jt-disconnect-btn\">Disconnect</button>",
    "  </div>",
    "  <div id=\"jt-monitor-area\"></div>",
    "</div>"
  ].join("\n");

  const disconnectBtn = container.querySelector("#jt-disconnect-btn") as HTMLButtonElement;
  disconnectBtn.addEventListener("click", async () => {
    try { await invokeCmd("jetson_disconnect"); } catch (e) { /* ignore */ }
    buildConnectionForm(container);
  });

  // Fire event so existing tegrastats poll can hook in
  document.dispatchEvent(new CustomEvent("jetson-connected", {
    detail: { host: conn.host, port: conn.port, monitorArea: container.querySelector("#jt-monitor-area") }
  }));
  console.log("[Jetson] Connected view ready - jetson-connected event fired");
}

// ---- Public init function ----
export function initJetsonConnectionDialog(bodyEl: HTMLElement): void {
  buildConnectionForm(bodyEl);
  console.log("[Jetson] Connection dialog initialized");
}
export function registerJetsonTabShortcut(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === 'G') { e.preventDefault(); openJetsonDemoTab(); } });
}