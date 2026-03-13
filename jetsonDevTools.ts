// ============================================================================
// JETSON FEATURES 8 + 9 + 10: CUDA Profiler + Log Viewer + OTA Deploy
// File: src/jetson/jetsonDevTools.ts
// Uses: jetson_execute, jetson_deploy_and_run, jetson_upload_file
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

let dtPanel: HTMLElement | null = null;
let logPollTimer: ReturnType<typeof setInterval> | null = null;
let logIsLive = false;
let otaTargets: OtaTarget[] = [];

// ── TYPES ────────────────────────────────────────────────────

interface ProfileKernel {
  name: string;
  timeMs: number;
  pct: number;
  calls: number;
  color: string;
}

interface OtaTarget {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  version: string;
  progress: number;
  status: 'idle' | 'deploying' | 'done' | 'error';
}

// ── CUDA PROFILER ────────────────────────────────────────────

async function runProfiler(remoteFile: string, remoteDir: string) {
  setStatus('Running nvprof...');
  updateProfilerUI([], 'Profiling...');

  const fname = remoteFile.split('/').pop() || 'app';
  const exeName = fname.replace(/\.\w+$/, '');

  try {
    // Build then profile
    const cmd = `export PATH=/usr/local/cuda/bin:$PATH && cd ${remoteDir} && nvcc -o ${exeName} ${fname} 2>&1 && nvprof --csv --print-gpu-trace ./${exeName} 2>&1`;
    const result = await invoke<any>('jetson_execute', { command: cmd });
    const output: string = result?.output || result?.stdout || String(result || '');

    const kernels = parseNvprof(output);
    if (kernels.length > 0) {
      updateProfilerUI(kernels, null);
      setStatus(`Profiling complete · ${kernels.length} kernels · ${exeName}`);
    } else {
      // Try nsys as fallback
      const nsysCmd = `export PATH=/usr/local/cuda/bin:$PATH && cd ${remoteDir} && nsys profile --stats=true ./${exeName} 2>&1 | grep -A 50 "CUDA Kernel Statistics"`;
      const nsysResult = await invoke<any>('jetson_execute', { command: nsysCmd });
      const nsysOut: string = nsysResult?.output || '';
      const nsysKernels = parseNsys(nsysOut);
      updateProfilerUI(nsysKernels.length > 0 ? nsysKernels : [], nsysKernels.length === 0 ? output.slice(0,300) : null);
      setStatus(nsysKernels.length > 0 ? `Profiling complete · ${nsysKernels.length} kernels` : 'No CUDA kernels found');
    }
  } catch(e: any) {
    updateProfilerUI([], 'Error: ' + (e?.message || String(e)));
    setStatus('Profiling failed');
  }
}

function parseNvprof(output: string): ProfileKernel[] {
  const kernels: ProfileKernel[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    // nvprof CSV: "Time(%),Time,Calls,Avg,Min,Max,Name"
    const parts = line.split(',');
    if (parts.length >= 7 && !isNaN(parseFloat(parts[0])) && parseFloat(parts[0]) > 0) {
      const pct = parseFloat(parts[0]);
      const timeUs = parseFloat(parts[1]?.replace(/[^0-9.]/g,'') || '0');
      const calls = parseInt(parts[2]) || 1;
      const name = parts[6]?.trim() || 'kernel';
      if (name && pct > 0) {
        kernels.push({ name, timeMs: timeUs/1000, pct, calls, color: kernelColor(pct) });
      }
    }
  }
  return kernels.sort((a,b) => b.timeMs - a.timeMs).slice(0,12);
}

function parseNsys(output: string): ProfileKernel[] {
  const kernels: ProfileKernel[] = [];
  const lines = output.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (line.includes('Time (%)') || line.includes('Avg (ns)')) { inTable = true; continue; }
    if (!inTable) continue;
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 5 && !isNaN(parseFloat(parts[0]))) {
      const pct = parseFloat(parts[0]);
      const timeNs = parseFloat(parts[2]) || 0;
      const name = parts[parts.length-1] || 'kernel';
      if (name && pct > 0) {
        kernels.push({ name, timeMs: timeNs/1e6, pct, calls: parseInt(parts[1])||1, color: kernelColor(pct) });
      }
    }
  }
  return kernels.sort((a,b) => b.timeMs - a.timeMs).slice(0,12);
}

function kernelColor(pct: number): string {
  if (pct > 60) return 'rgba(255,68,68,0.7)';
  if (pct > 30) return 'rgba(255,136,0,0.7)';
  if (pct > 10) return 'rgba(255,220,68,0.7)';
  return 'rgba(118,185,0,0.7)';
}

function updateProfilerUI(kernels: ProfileKernel[], error: string | null) {
  const container = document.getElementById('jdt-prof-chart');
  if (!container) return;

  if (error) {
    container.innerHTML = `<pre class="jdt-prof-error">${error.slice(0,400)}</pre>`;
    return;
  }
  if (kernels.length === 0) {
    container.innerHTML = `<div class="jdt-prof-empty">No CUDA kernels detected. Ensure nvcc and nvprof/nsys are installed.</div>`;
    return;
  }

  const maxTime = Math.max(...kernels.map(k => k.timeMs));
  container.innerHTML = `
    <div class="jdt-prof-total">Total kernel time: ${kernels.reduce((a,k)=>a+k.timeMs,0).toFixed(3)}ms · ${kernels.length} kernels</div>
    ${kernels.map(k => {
      const pct = Math.max(2, (k.timeMs / maxTime) * 100);
      return `
        <div class="jdt-prof-row">
          <div class="jdt-prof-name" title="${k.name}">${k.name.length > 30 ? k.name.slice(0,27)+'...' : k.name}</div>
          <div class="jdt-prof-barwrap">
            <div class="jdt-prof-bar" style="width:${pct}%;background:${k.color}">
              ${k.timeMs.toFixed(3)}ms
            </div>
          </div>
          <div class="jdt-prof-pct">${k.pct.toFixed(1)}%</div>
        </div>
      `;
    }).join('')}
  `;
}

// ── LOG VIEWER ───────────────────────────────────────────────

async function fetchLogs(source: string, filter: string, lines: number) {
  const logEl = document.getElementById('jdt-log-output');
  if (!logEl) return;

  let cmd = '';
  if (source === 'journalctl') cmd = `journalctl -n ${lines} --no-pager 2>&1`;
  else if (source === 'dmesg') cmd = `dmesg --color=never | tail -n ${lines} 2>&1`;
  else if (source === 'syslog') cmd = `tail -n ${lines} /var/log/syslog 2>&1`;
  else cmd = `journalctl -u ${source} -n ${lines} --no-pager 2>&1`;

  if (filter) cmd += ` | grep -i "${filter.replace(/"/g,'\\"')}"`;

  try {
    const result = await invoke<any>('jetson_execute', { command: cmd });
    const output: string = result?.output || result?.stdout || String(result || '');
    logEl.innerHTML = colorizeLog(output);
    logEl.scrollTop = logEl.scrollHeight;
  } catch(e: any) {
    logEl.textContent = 'Error: ' + (e?.message || String(e));
  }
}

function colorizeLog(raw: string): string {
  return raw.split('\n').map(line => {
    const esc = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (/error|fail|critical|panic|oops/i.test(line)) return `<span class="jdt-log-err">${esc}</span>`;
    if (/warn|alert/i.test(line)) return `<span class="jdt-log-warn">${esc}</span>`;
    if (/info|started|loaded|success|ok\b/i.test(line)) return `<span class="jdt-log-info">${esc}</span>`;
    return `<span class="jdt-log-norm">${esc}</span>`;
  }).join('\n');
}

function startLiveLog(source: string, filter: string) {
  if (logIsLive) return;
  logIsLive = true;
  const btn = document.getElementById('jdt-log-live-btn');
  if (btn) { btn.textContent = '■ STOP'; btn.classList.add('jdt-btn-red'); }
  setStatus('● LOG LIVE');
  logPollTimer = setInterval(() => {
    fetchLogs(source, filter, 50);
  }, 2000);
}

function stopLiveLog() {
  logIsLive = false;
  if (logPollTimer) { clearInterval(logPollTimer); logPollTimer = null; }
  const btn = document.getElementById('jdt-log-live-btn');
  if (btn) { btn.textContent = '● LIVE'; btn.classList.remove('jdt-btn-red'); }
  setStatus('Log live stopped');
}

// ── OTA DEPLOY ───────────────────────────────────────────────

function renderOtaTargets() {
  const list = document.getElementById('jdt-ota-targets');
  if (!list) return;

  if (otaTargets.length === 0) {
    list.innerHTML = `<div class="jdt-ota-empty">No targets. Add devices below.</div>`;
    return;
  }

  list.innerHTML = otaTargets.map(t => {
    const statusColor = t.status==='done' ? '#76B900' : t.status==='deploying' ? '#ff8800' : t.status==='error' ? '#ff4444' : '#555';
    return `
      <div class="jdt-ota-row" data-id="${t.id}">
        <div class="jdt-ota-name">${t.name}</div>
        <div class="jdt-ota-host">${t.host}</div>
        <div class="jdt-ota-bar"><div class="jdt-ota-fill" style="width:${t.progress}%;background:${statusColor}"></div></div>
        <div class="jdt-ota-pct" style="color:${statusColor}">
          ${t.status === 'done' ? '✓ DONE' : t.status === 'error' ? 'ERROR' : t.status === 'deploying' ? t.progress+'%' : 'IDLE'}
        </div>
        <button class="jdt-ota-remove" data-id="${t.id}" style="background:none;border:none;color:#555;cursor:pointer;font-size:11px">✕</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.jdt-ota-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id!;
      otaTargets = otaTargets.filter(t => t.id !== id);
      renderOtaTargets();
    });
  });
}

async function runOtaDeploy(localFiles: string[], remoteDir: string, runCmd: string) {
  if (otaTargets.length === 0) { setStatus('Add at least one OTA target'); return; }

  const version = new Date().toISOString().slice(0,16).replace('T',' ');

  for (const target of otaTargets) {
    target.status = 'deploying';
    target.progress = 0;
    target.version = version;
    renderOtaTargets();

    try {
      // Connect to this target
      await invoke('jetson_disconnect').catch(()=>{});
      await invoke('jetson_connect', {
        host: target.host, port: 22,
        username: target.username, password: target.password,
        authMethod: 'password'
      });

      // Upload each file
      const fileArr = localFiles.filter(f=>f.trim());
      for (let i = 0; i < fileArr.length; i++) {
        const fname = fileArr[i].trim().split(/[/\\]/).pop() || 'file';
        await invoke('jetson_upload_file', {
          localPath: fileArr[i].trim(),
          remotePath: `${remoteDir}/${fname}`
        });
        target.progress = Math.round(((i+1) / fileArr.length) * (runCmd ? 80 : 100));
        renderOtaTargets();
      }

      // Run post-deploy command if specified
      if (runCmd) {
        await invoke('jetson_execute', { command: `cd ${remoteDir} && ${runCmd}` });
        target.progress = 100;
      }

      target.status = 'done';
    } catch(e: any) {
      target.status = 'error';
    }

    renderOtaTargets();
  }

  setStatus(`OTA deploy complete · ${otaTargets.filter(t=>t.status==='done').length}/${otaTargets.length} succeeded`);
}

// ── SHARED ───────────────────────────────────────────────────

function setStatus(s: string) {
  const el = document.getElementById('jdt-status');
  if (el) el.textContent = s;
}

// ── PANEL ────────────────────────────────────────────────────

export function openJetsonDevTools() {
  if (dtPanel) { dtPanel.style.display = 'flex'; return; }

  const panel = document.createElement('div');
  panel.id = 'jdt-panel';
  panel.innerHTML = `
    <style>
      #jdt-panel {
        position:fixed; bottom:60px; left:20px;
        width:600px; height:520px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.15);
        display:flex; flex-direction:column; z-index:9994;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        resize:both; overflow:hidden; min-width:400px; min-height:300px;
      }
      #jdt-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:8px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jdt-titlebar > span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jdt-tbtn { background:none; border:1px solid #333; color:#888; padding:2px 8px; cursor:pointer; font-size:10px; font-family:inherit; }
      .jdt-tbtn:hover { border-color:#76B900; color:#76B900; }
      .jdt-btn-green { border-color:#76B900!important; color:#76B900!important; }
      .jdt-btn-red { border-color:#882200!important; color:#ff4444!important; }
      #jdt-tabs { display:flex; border-bottom:1px solid #222; flex-shrink:0; }
      .jdt-tab { padding:7px 0; font-size:10px; letter-spacing:1px; cursor:pointer; border-bottom:2px solid transparent; color:#666; flex:1; text-align:center; }
      .jdt-tab.active { color:#76B900; border-color:#76B900; }
      .jdt-tab:hover:not(.active) { color:#aaa; }
      .jdt-pane { display:none; flex:1; overflow-y:auto; padding:12px; flex-direction:column; gap:10px; }
      .jdt-pane.active { display:flex; }
      .jdt-pane::-webkit-scrollbar { width:4px; }
      .jdt-pane::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jdt-section-title { font-size:9px; color:#555; letter-spacing:2px; margin-bottom:6px; }
      .jdt-input { background:#050505; border:1px solid #333; color:#fff; padding:5px 8px; font-family:inherit; font-size:11px; outline:none; }
      .jdt-input:focus { border-color:#76B900; }
      .jdt-run-btn {
        background:rgba(118,185,0,0.08); border:1px solid #76B900; color:#76B900;
        padding:7px; cursor:pointer; font-family:inherit; font-size:10px; letter-spacing:2px; width:100%;
      }
      .jdt-run-btn:hover { background:rgba(118,185,0,0.15); }
      .jdt-row { display:flex; gap:8px; align-items:center; }
      .jdt-row label { font-size:10px; color:#666; width:100px; flex-shrink:0; }
      .jdt-row .jdt-input { flex:1; }
      /* PROFILER */
      .jdt-prof-error { color:#ff4444; font-size:10px; white-space:pre-wrap; }
      .jdt-prof-empty { color:#555; padding:20px; text-align:center; }
      .jdt-prof-total { font-size:10px; color:#555; margin-bottom:8px; letter-spacing:1px; }
      .jdt-prof-row { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
      .jdt-prof-name { width:130px; font-size:10px; color:#aaa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex-shrink:0; }
      .jdt-prof-barwrap { flex:1; height:18px; background:#0a0a0a; border:1px solid #1a1a1a; }
      .jdt-prof-bar { height:100%; font-size:9px; color:#000; display:flex; align-items:center; padding-left:4px; min-width:30px; font-weight:bold; }
      .jdt-prof-pct { width:40px; text-align:right; font-size:10px; color:#555; }
      /* LOGS */
      #jdt-log-output {
        flex:1; background:#050505; border:1px solid #1a1a1a;
        padding:8px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;
        font-size:10px; line-height:1.7; min-height:200px; max-height:300px;
      }
      #jdt-log-output::-webkit-scrollbar { width:4px; }
      #jdt-log-output::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jdt-log-err { color:#ff4444; }
      .jdt-log-warn { color:#ff8800; }
      .jdt-log-info { color:#76B900; }
      .jdt-log-norm { color:#777; }
      /* OTA */
      .jdt-ota-empty { color:#555; padding:10px; text-align:center; font-size:11px; }
      .jdt-ota-row { display:grid; grid-template-columns:120px 1fr 100px 70px 20px; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid #111; }
      .jdt-ota-name { color:#ccc; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .jdt-ota-host { color:#555; font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .jdt-ota-bar { height:4px; background:#1a1a1a; }
      .jdt-ota-fill { height:100%; transition:width 0.3s; }
      .jdt-ota-pct { font-size:10px; text-align:right; }
      #jdt-status { padding:4px 12px; font-size:10px; color:#555; border-top:1px solid #111; flex-shrink:0; letter-spacing:1px; }
    </style>
    <div id="jdt-titlebar">
      <span>DEV TOOLS</span>
      <button class="jdt-tbtn" id="jdt-close">✕</button>
    </div>
    <div id="jdt-tabs">
      <div class="jdt-tab active" data-tab="profiler">🔬 PROFILER</div>
      <div class="jdt-tab" data-tab="logs">📋 LOGS</div>
      <div class="jdt-tab" data-tab="ota">🚀 OTA DEPLOY</div>
    </div>

    <!-- PROFILER PANE -->
    <div class="jdt-pane active" id="jdt-pane-profiler">
      <div>
        <div class="jdt-section-title">CUDA KERNEL PROFILER (nvprof / nsys)</div>
        <div class="jdt-row">
          <label>Source File</label>
          <input class="jdt-input" id="jdt-prof-file" placeholder="/home/orin_nano/x02-deploy/hello.cu" style="flex:1"/>
        </div>
        <div class="jdt-row" style="margin-top:4px">
          <label>Remote Dir</label>
          <input class="jdt-input" id="jdt-prof-dir" value="/home/orin_nano/x02-deploy" style="flex:1"/>
        </div>
        <button class="jdt-run-btn" id="jdt-prof-run" style="margin-top:8px">▶ PROFILE KERNEL</button>
      </div>
      <div id="jdt-prof-chart"><div class="jdt-prof-empty">Run profiler to see kernel timing breakdown</div></div>
    </div>

    <!-- LOGS PANE -->
    <div class="jdt-pane" id="jdt-pane-logs">
      <div>
        <div class="jdt-section-title">SYSTEM LOG VIEWER</div>
        <div class="jdt-row">
          <label>Source</label>
          <select class="jdt-input" id="jdt-log-source" style="flex:1">
            <option value="journalctl">journalctl (system)</option>
            <option value="dmesg">dmesg (kernel)</option>
            <option value="syslog">/var/log/syslog</option>
            <option value="x02-agent">x02-agent service</option>
            <option value="nvargus-daemon">nvargus-daemon</option>
          </select>
        </div>
        <div class="jdt-row" style="margin-top:4px">
          <label>Filter</label>
          <input class="jdt-input" id="jdt-log-filter" placeholder="grep filter (optional)" style="flex:1"/>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="jdt-run-btn" id="jdt-log-fetch" style="flex:1">FETCH LOGS</button>
          <button class="jdt-tbtn" id="jdt-log-live-btn" style="padding:0 14px">● LIVE</button>
          <button class="jdt-tbtn" id="jdt-log-clear">CLEAR</button>
        </div>
      </div>
      <div id="jdt-log-output">Select source and click FETCH LOGS.</div>
    </div>

    <!-- OTA PANE -->
    <div class="jdt-pane" id="jdt-pane-ota">
      <div>
        <div class="jdt-section-title">OTA DEPLOY — FLEET PUSH</div>
        <div class="jdt-row">
          <label>Files (one per line)</label>
          <textarea class="jdt-input" id="jdt-ota-files" rows="3" placeholder="C:\\path\\to\\file1.py&#10;C:\\path\\to\\model.trt" style="flex:1;resize:vertical"></textarea>
        </div>
        <div class="jdt-row" style="margin-top:4px">
          <label>Remote Dir</label>
          <input class="jdt-input" id="jdt-ota-dir" value="/home/orin_nano/x02-deploy" style="flex:1"/>
        </div>
        <div class="jdt-row" style="margin-top:4px">
          <label>Post-Deploy Cmd</label>
          <input class="jdt-input" id="jdt-ota-cmd" placeholder="Optional: restart service, etc." style="flex:1"/>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <div style="flex:1">
            <div class="jdt-section-title" style="margin-bottom:4px">ADD TARGET</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <input class="jdt-input" id="jdt-ota-tname" placeholder="Name" style="width:100px"/>
              <input class="jdt-input" id="jdt-ota-thost" placeholder="IP" style="width:110px"/>
              <input class="jdt-input" id="jdt-ota-tuser" placeholder="User" style="width:80px"/>
              <input class="jdt-input" id="jdt-ota-tpass" type="password" placeholder="Pass" style="width:80px"/>
              <button class="jdt-tbtn jdt-btn-green" id="jdt-ota-add-target">+ ADD</button>
            </div>
          </div>
        </div>
        <button class="jdt-run-btn" id="jdt-ota-deploy" style="margin-top:8px">🚀 DEPLOY TO ALL TARGETS</button>
      </div>
      <div>
        <div class="jdt-section-title">TARGETS</div>
        <div id="jdt-ota-targets"><div class="jdt-ota-empty">No targets added yet.</div></div>
      </div>
    </div>

    <div id="jdt-status">Ready</div>
  `;

  document.body.appendChild(panel);
  dtPanel = panel;

  // Drag
  const tb = panel.querySelector('#jdt-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown',(e:MouseEvent)=>{if((e.target as HTMLElement).tagName==='BUTTON')return;dragging=true;ox=e.clientX-panel.offsetLeft;oy=e.clientY-panel.offsetTop;});
  document.addEventListener('mousemove',(e:MouseEvent)=>{if(!dragging)return;panel.style.left=(e.clientX-ox)+'px';panel.style.top=(e.clientY-oy)+'px';panel.style.bottom='auto';});
  document.addEventListener('mouseup',()=>{dragging=false;});

  panel.querySelector('#jdt-close')!.addEventListener('click', () => {
    stopLiveLog(); panel.style.display='none';
  });

  // Tabs
  panel.querySelectorAll('.jdt-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.jdt-tab').forEach(t=>t.classList.remove('active'));
      panel.querySelectorAll('.jdt-pane').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const pane = panel.querySelector(`#jdt-pane-${(tab as HTMLElement).dataset.tab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Profiler
  panel.querySelector('#jdt-prof-run')!.addEventListener('click', () => {
    const file = (panel.querySelector('#jdt-prof-file') as HTMLInputElement).value.trim();
    const dir = (panel.querySelector('#jdt-prof-dir') as HTMLInputElement).value.trim();
    if (!file) { setStatus('Enter remote source file path'); return; }
    runProfiler(file, dir);
  });

  // Logs
  const getLogParams = () => ({
    source: (panel.querySelector('#jdt-log-source') as HTMLSelectElement).value,
    filter: (panel.querySelector('#jdt-log-filter') as HTMLInputElement).value.trim(),
  });
  panel.querySelector('#jdt-log-fetch')!.addEventListener('click', () => {
    const {source,filter} = getLogParams();
    fetchLogs(source, filter, 100);
    setStatus('Fetching logs...');
  });
  panel.querySelector('#jdt-log-live-btn')!.addEventListener('click', () => {
    const {source,filter} = getLogParams();
    if (logIsLive) stopLiveLog();
    else startLiveLog(source, filter);
  });
  panel.querySelector('#jdt-log-clear')!.addEventListener('click', () => {
    const el = document.getElementById('jdt-log-output');
    if (el) el.innerHTML = '';
  });

  // OTA
  panel.querySelector('#jdt-ota-add-target')!.addEventListener('click', () => {
    const name = (panel.querySelector('#jdt-ota-tname') as HTMLInputElement).value.trim();
    const host = (panel.querySelector('#jdt-ota-thost') as HTMLInputElement).value.trim();
    const user = (panel.querySelector('#jdt-ota-tuser') as HTMLInputElement).value.trim();
    const pass = (panel.querySelector('#jdt-ota-tpass') as HTMLInputElement).value;
    if (!name || !host) { setStatus('Name and host required'); return; }
    otaTargets.push({ id: Date.now().toString(), name, host, username:user, password:pass, version:'', progress:0, status:'idle' });
    renderOtaTargets();
    (panel.querySelector('#jdt-ota-tname') as HTMLInputElement).value = '';
    (panel.querySelector('#jdt-ota-thost') as HTMLInputElement).value = '';
  });
  panel.querySelector('#jdt-ota-deploy')!.addEventListener('click', () => {
    const filesRaw = (panel.querySelector('#jdt-ota-files') as HTMLTextAreaElement).value;
    const files = filesRaw.split('\n').filter(f=>f.trim());
    const dir = (panel.querySelector('#jdt-ota-dir') as HTMLInputElement).value.trim();
    const cmd = (panel.querySelector('#jdt-ota-cmd') as HTMLInputElement).value.trim();
    if (files.length === 0) { setStatus('Enter files to deploy'); return; }
    runOtaDeploy(files, dir, cmd);
  });

  renderOtaTargets();
}
