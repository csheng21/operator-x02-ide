// ============================================================================
// JETSON FEATURES 5 + 6: nvpmodel Power Mode Switcher + TensorRT Converter
// File: src/jetson/jetsonPowerManager.ts
// Uses: jetson_execute, jetson_deploy_and_run, jetson_upload_file
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

interface PowerMode {
  id: number;
  name: string;
  watt: string;
  desc: string;
  cores: string;
}

const POWER_MODES: PowerMode[] = [
  { id: 0, name: 'MAXN',   watt: '25W', desc: 'Maximum performance · All cores · No power limit', cores: '6 CPU / Full GPU' },
  { id: 1, name: '15W',    watt: '15W', desc: 'Balanced performance · 6 CPU cores · GPU limited', cores: '6 CPU / 75% GPU'  },
  { id: 2, name: '10W',    watt: '10W', desc: 'Power saving · 4 CPU cores · Reduced GPU clock',   cores: '4 CPU / 50% GPU'  },
  { id: 3, name: '7W',     watt: '7W',  desc: 'Ultra low power · 2 CPU cores · Minimal GPU',      cores: '2 CPU / 25% GPU'  },
];

let pmPanel: HTMLElement | null = null;
let pmCurrentMode = 0;
let trtLog: string[] = [];

// ── POWER MANAGER ────────────────────────────────────────────

async function queryCurrentMode() {
  try {
    const result = await invoke<any>('jetson_execute', { command: 'sudo nvpmodel -q' });
    const out: string = result?.output || result?.stdout || String(result || '');
    const match = out.match(/NV Power Mode:\s*(\w+)/i) || out.match(/MODE_ID:\s*(\d+)/);
    if (match) {
      const modeName = match[1].toUpperCase();
      const found = POWER_MODES.findIndex(m => m.name === modeName || String(m.id) === match[1]);
      if (found >= 0) pmCurrentMode = found;
    }
    renderPowerModes();
  } catch(_) { renderPowerModes(); }
}

async function setPowerMode(modeId: number) {
  setPmStatus(`Switching to ${POWER_MODES[modeId].name}...`);
  try {
    await invoke('jetson_execute', { command: `sudo nvpmodel -m ${modeId}` });
    pmCurrentMode = modeId;
    renderPowerModes();
    setPmStatus(`✓ Active: ${POWER_MODES[modeId].name} (${POWER_MODES[modeId].watt})`);
  } catch(e: any) {
    setPmStatus('Error: ' + (e?.message || String(e)));
  }
}

function renderPowerModes() {
  const list = document.getElementById('jpm-modes');
  if (!list) return;
  list.innerHTML = POWER_MODES.map(m => `
    <div class="jpm-mode ${pmCurrentMode === m.id ? 'jpm-active' : ''}" data-id="${m.id}">
      <div class="jpm-mode-left">
        <div class="jpm-mode-name">${m.name}</div>
        <div class="jpm-mode-desc">${m.desc}</div>
        <div class="jpm-mode-cores">${m.cores}</div>
      </div>
      <div class="jpm-mode-right">
        <div class="jpm-mode-watt">${m.watt}</div>
        ${pmCurrentMode === m.id
          ? '<div class="jpm-badge-active">● ACTIVE</div>'
          : `<button class="jpm-switch-btn" data-id="${m.id}">SWITCH</button>`}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.jpm-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => setPowerMode(Number((btn as HTMLElement).dataset.id)));
  });
}

function setPmStatus(s: string) {
  const el = document.getElementById('jpm-status');
  if (el) el.textContent = s;
}

// ── TENSORRT CONVERTER ────────────────────────────────────────

const TRT_STEPS = [
  { id: 'upload',    label: 'Upload model to Jetson' },
  { id: 'parse',     label: 'Parse ONNX graph' },
  { id: 'build',     label: 'Build TensorRT engine (FP16)' },
  { id: 'benchmark', label: 'Benchmark FPS' },
];

function setTrtStep(stepId: string, status: 'done' | 'running' | 'wait' | 'error', extra?: string) {
  const el = document.getElementById(`jpm-trt-step-${stepId}`);
  if (!el) return;
  const icon = el.querySelector('.jpm-trt-icon')!;
  const label = el.querySelector('.jpm-trt-label')!;
  const time = el.querySelector('.jpm-trt-time')!;
  if (status === 'done')    { icon.textContent='✓'; icon.className='jpm-trt-icon jpm-trt-done'; }
  if (status === 'running') { icon.textContent='◌'; icon.className='jpm-trt-icon jpm-trt-run'; }
  if (status === 'wait')    { icon.textContent='○'; icon.className='jpm-trt-icon jpm-trt-wait'; }
  if (status === 'error')   { icon.textContent='✕'; icon.className='jpm-trt-icon jpm-trt-err'; }
  if (extra) { time.textContent = extra; }
  if (status === 'running') { label.setAttribute('style','color:#ff8800'); }
  else if (status === 'done') { label.setAttribute('style','color:#76B900'); }
  else if (status === 'error') { label.setAttribute('style','color:#ff4444'); }
  else { label.setAttribute('style',''); }
}

function trtLog2(msg: string) {
  trtLog.push(msg);
  const el = document.getElementById('jpm-trt-log');
  if (el) {
    el.textContent = trtLog.slice(-6).join('\n');
    el.scrollTop = el.scrollHeight;
  }
}

async function runTrtConversion(onnxPath: string, remoteDir: string, precision: string) {
  trtLog = [];
  TRT_STEPS.forEach(s => setTrtStep(s.id, 'wait'));
  setTrtStep('upload', 'running');
  trtLog2('Starting TRT conversion...');

  const fname = onnxPath.split(/[/\\]/).pop() || 'model.onnx';
  const engineName = fname.replace('.onnx', '.trt');
  const t0 = Date.now();

  // Step 1: Upload
  try {
    trtLog2(`Uploading ${fname}...`);
    await invoke('jetson_upload_file', { localPath: onnxPath, remotePath: `${remoteDir}/${fname}` });
    setTrtStep('upload', 'done', `${((Date.now()-t0)/1000).toFixed(1)}s`);
    trtLog2(`Upload OK (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  } catch(e: any) {
    setTrtStep('upload', 'error', 'Failed');
    trtLog2('Upload failed: ' + e?.message);
    return;
  }

  // Step 2: Parse (trtexec --onnx parses automatically, simulate info)
  setTrtStep('parse', 'running');
  const t1 = Date.now();
  try {
    const info = await invoke<any>('jetson_execute', {
      command: `python3 -c "import onnx; m=onnx.load('${remoteDir}/${fname}'); print(f'{len(m.graph.node)} nodes, opset {m.opset_import[0].version}')" 2>&1 || echo "onnx not available"`
    });
    const infoStr = info?.output?.trim() || '';
    setTrtStep('parse', 'done', `${((Date.now()-t1)/1000).toFixed(1)}s`);
    trtLog2(`Parse OK: ${infoStr || 'graph loaded'}`);
  } catch(_) {
    setTrtStep('parse', 'done', '—');
  }

  // Step 3: Build engine
  setTrtStep('build', 'running');
  const t2 = Date.now();
  trtLog2(`Building ${precision.toUpperCase()} engine... (may take 1-3 min)`);
  try {
    const precFlag = precision === 'fp16' ? '--fp16' : precision === 'int8' ? '--int8' : '';
    const buildResult = await invoke<any>('jetson_deploy_and_run', {
      localPath: onnxPath,
      remoteDir,
      runCommand: `export PATH=/usr/local/cuda/bin:$PATH && cd ${remoteDir} && trtexec --onnx=${fname} --saveEngine=${engineName} ${precFlag} --workspace=2048 2>&1 | tail -5`
    });
    const buildOut: string = buildResult?.run_output || buildResult?.output || '';
    const elapsed = ((Date.now()-t2)/1000).toFixed(1);
    if (buildResult?.run_exit_code === 0 || buildOut.includes('Engine')) {
      setTrtStep('build', 'done', `${elapsed}s`);
      trtLog2(`Build OK (${elapsed}s)`);
    } else {
      setTrtStep('build', 'error', `${elapsed}s`);
      trtLog2('Build error: ' + buildOut.slice(0,200));
      return;
    }
  } catch(e: any) {
    setTrtStep('build', 'error', 'Error');
    trtLog2('Build failed: ' + e?.message);
    return;
  }

  // Step 4: Benchmark
  setTrtStep('benchmark', 'running');
  const t3 = Date.now();
  trtLog2('Running FPS benchmark...');
  try {
    const bmResult = await invoke<any>('jetson_execute', {
      command: `export PATH=/usr/local/cuda/bin:$PATH && cd ${remoteDir} && trtexec --loadEngine=${engineName} --iterations=50 2>&1 | grep -E "mean|Throughput|Latency"` 
    });
    const bmOut: string = bmResult?.output?.trim() || '';
    const elapsed = ((Date.now()-t3)/1000).toFixed(1);
    setTrtStep('benchmark', 'done', `${elapsed}s`);
    trtLog2(`Benchmark: ${bmOut.slice(0,100) || 'complete'}`);

    // Show result
    const result = document.getElementById('jpm-trt-result');
    if (result) {
      const fps = bmOut.match(/Throughput:\s*([\d.]+)/)?.[1] || '—';
      const lat = bmOut.match(/mean = ([\d.]+)/)?.[1] || '—';
      result.innerHTML = `
        <div class="jpm-trt-res-row"><span>Engine</span><span style="color:#76B900">${engineName}</span></div>
        <div class="jpm-trt-res-row"><span>Precision</span><span style="color:#76B900">${precision.toUpperCase()}</span></div>
        <div class="jpm-trt-res-row"><span>Throughput</span><span style="color:#76B900">${fps} qps</span></div>
        <div class="jpm-trt-res-row"><span>Latency</span><span style="color:#76B900">${lat} ms</span></div>
      `;
      result.style.display = '';
    }
  } catch(_) {
    setTrtStep('benchmark', 'done', '—');
  }
}

export function openJetsonPowerManager() {
  if (pmPanel) { pmPanel.style.display = 'flex'; queryCurrentMode(); return; }

  const panel = document.createElement('div');
  panel.id = 'jpm-panel';
  panel.innerHTML = `
    <style>
      #jpm-panel {
        position:fixed; top:60px; right:560px;
        width:480px; height:560px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.15);
        display:flex; flex-direction:column; z-index:9996;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        overflow:hidden; resize:both; min-width:360px; min-height:300px;
      }
      #jpm-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:8px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jpm-titlebar > span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jpm-tbtn { background:none; border:1px solid #333; color:#888; width:24px; height:20px; cursor:pointer; font-size:10px; }
      .jpm-tbtn:hover { border-color:#76B900; color:#76B900; }
      #jpm-tabs { display:flex; border-bottom:1px solid #222; flex-shrink:0; }
      .jpm-tab {
        padding:8px 20px; font-size:10px; letter-spacing:1px; cursor:pointer;
        border-bottom:2px solid transparent; color:#666; flex:1; text-align:center;
        transition:all 0.15s;
      }
      .jpm-tab.active { color:#76B900; border-color:#76B900; }
      .jpm-tab:hover:not(.active) { color:#aaa; }
      .jpm-pane { display:none; flex:1; overflow-y:auto; padding:14px; flex-direction:column; gap:10px; }
      .jpm-pane.active { display:flex; }
      .jpm-pane::-webkit-scrollbar { width:4px; }
      .jpm-pane::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jpm-section-title { font-size:9px; color:#555; letter-spacing:2px; margin-bottom:6px; }
      .jpm-mode {
        border:1px solid #222; padding:10px 14px; display:flex;
        justify-content:space-between; align-items:center;
        cursor:default; transition:all 0.15s; gap:10px;
      }
      .jpm-mode:hover { border-color:#3a4a00; background:#0a0a0a; }
      .jpm-mode.jpm-active { border-color:#76B900; background:rgba(118,185,0,0.06); }
      .jpm-mode-left { flex:1; }
      .jpm-mode-name { color:#fff; font-size:14px; font-weight:600; }
      .jpm-mode-desc { color:#666; font-size:10px; margin-top:2px; }
      .jpm-mode-cores { color:#555; font-size:10px; margin-top:1px; }
      .jpm-mode-right { text-align:right; flex-shrink:0; }
      .jpm-mode-watt { color:#aa66ff; font-size:16px; }
      .jpm-badge-active { color:#76B900; font-size:10px; margin-top:4px; }
      .jpm-switch-btn {
        background:none; border:1px solid #333; color:#888;
        padding:4px 10px; cursor:pointer; font-size:10px; font-family:inherit;
        letter-spacing:1px; margin-top:4px;
      }
      .jpm-switch-btn:hover { border-color:#76B900; color:#76B900; }
      .jpm-trt-form { display:flex; flex-direction:column; gap:8px; }
      .jpm-input-row { display:flex; gap:6px; align-items:center; }
      .jpm-input-row label { font-size:10px; color:#666; width:90px; flex-shrink:0; }
      .jpm-input {
        flex:1; background:#050505; border:1px solid #333; color:#fff;
        padding:6px 8px; font-family:inherit; font-size:11px; outline:none;
      }
      .jpm-input:focus { border-color:#76B900; }
      .jpm-select {
        background:#050505; border:1px solid #333; color:#fff;
        padding:5px 8px; font-family:inherit; font-size:11px; outline:none;
        cursor:pointer;
      }
      .jpm-run-btn {
        background:rgba(118,185,0,0.1); border:1px solid #76B900; color:#76B900;
        padding:8px; cursor:pointer; font-family:inherit; font-size:11px; letter-spacing:2px;
      }
      .jpm-run-btn:hover { background:rgba(118,185,0,0.2); }
      .jpm-trt-steps { display:flex; flex-direction:column; gap:4px; border:1px solid #1a1a1a; padding:10px; }
      .jpm-trt-step { display:flex; align-items:center; gap:10px; padding:4px 0; border-bottom:1px solid #111; }
      .jpm-trt-step:last-child { border:none; }
      .jpm-trt-icon {
        width:18px; height:18px; border-radius:50%; display:flex;
        align-items:center; justify-content:center; font-size:10px; flex-shrink:0;
        border:1px solid #333; color:#555;
      }
      .jpm-trt-done { background:rgba(118,185,0,0.15); color:#76B900; border-color:#76B900; }
      .jpm-trt-run  { background:rgba(255,136,0,0.15); color:#ff8800; border-color:#804400; animation:jpm-spin 1s linear infinite; }
      .jpm-trt-wait { background:#0a0a0a; color:#555; }
      .jpm-trt-err  { background:rgba(255,68,68,0.15); color:#ff4444; border-color:#882200; }
      @keyframes jpm-spin { to { transform:rotate(360deg); } }
      .jpm-trt-label { flex:1; font-size:11px; color:#aaa; }
      .jpm-trt-time  { font-size:10px; color:#555; }
      .jpm-trt-log {
        background:#050505; border:1px solid #1a1a1a; padding:8px;
        font-size:10px; color:#666; white-space:pre; overflow-y:auto; max-height:80px; line-height:1.6;
      }
      .jpm-trt-result { border:1px solid #2a3a00; padding:10px; display:none; }
      .jpm-trt-res-row { display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #111; font-size:11px; }
      .jpm-trt-res-row:last-child { border:none; }
      #jpm-status { padding:4px 12px; font-size:10px; color:#555; border-top:1px solid #111; flex-shrink:0; letter-spacing:1px; }
    </style>
    <div id="jpm-titlebar">
      <span>POWER & AI TOOLS</span>
      <button class="jpm-tbtn" id="jpm-close">✕</button>
    </div>
    <div id="jpm-tabs">
      <div class="jpm-tab active" data-tab="power">⚡ POWER MODE</div>
      <div class="jpm-tab" data-tab="trt">🧠 TENSORRT</div>
    </div>
    <!-- POWER MODE PANE -->
    <div class="jpm-pane active" id="jpm-pane-power">
      <div>
        <div class="jpm-section-title">NVPMODEL — POWER PROFILES</div>
        <div id="jpm-modes"></div>
      </div>
      <button class="jpm-switch-btn" id="jpm-query-btn" style="width:100%;margin-top:4px">↺ QUERY CURRENT MODE</button>
    </div>
    <!-- TENSORRT PANE -->
    <div class="jpm-pane" id="jpm-pane-trt">
      <div>
        <div class="jpm-section-title">CONVERT ONNX → TENSORRT ENGINE</div>
        <div class="jpm-trt-form">
          <div class="jpm-input-row">
            <label>ONNX File</label>
            <input class="jpm-input" id="jpm-onnx-path" type="text" placeholder="C:\\path\\to\\model.onnx"/>
          </div>
          <div class="jpm-input-row">
            <label>Remote Dir</label>
            <input class="jpm-input" id="jpm-remote-dir" type="text" value="/home/orin_nano/x02-deploy"/>
          </div>
          <div class="jpm-input-row">
            <label>Precision</label>
            <select class="jpm-select" id="jpm-precision">
              <option value="fp32">FP32 (Default)</option>
              <option value="fp16" selected>FP16 (Faster)</option>
              <option value="int8">INT8 (Fastest, needs calibration)</option>
            </select>
          </div>
          <button class="jpm-run-btn" id="jpm-trt-run">▶ START CONVERSION</button>
        </div>
      </div>
      <div>
        <div class="jpm-section-title">PROGRESS</div>
        <div class="jpm-trt-steps">
          ${TRT_STEPS.map(s => `
            <div class="jpm-trt-step" id="jpm-trt-step-${s.id}">
              <div class="jpm-trt-icon jpm-trt-wait">○</div>
              <div class="jpm-trt-label">${s.label}</div>
              <div class="jpm-trt-time">—</div>
            </div>
          `).join('')}
        </div>
        <pre class="jpm-trt-log" id="jpm-trt-log">Ready. Select .onnx file and click START.</pre>
        <div class="jpm-trt-result" id="jpm-trt-result"></div>
      </div>
    </div>
    <div id="jpm-status">Ready</div>
  `;

  document.body.appendChild(panel);
  pmPanel = panel;

  // Drag
  const tb = panel.querySelector('#jpm-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown',(e:MouseEvent)=>{if((e.target as HTMLElement).tagName==='BUTTON')return;dragging=true;ox=e.clientX-panel.offsetLeft;oy=e.clientY-panel.offsetTop;});
  document.addEventListener('mousemove',(e:MouseEvent)=>{if(!dragging)return;panel.style.left=(e.clientX-ox)+'px';panel.style.top=(e.clientY-oy)+'px';panel.style.right='auto';});
  document.addEventListener('mouseup',()=>{dragging=false;});

  panel.querySelector('#jpm-close')!.addEventListener('click',()=>panel.style.display='none');
  panel.querySelector('#jpm-query-btn')!.addEventListener('click', queryCurrentMode);

  // Tabs
  panel.querySelectorAll('.jpm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.jpm-tab').forEach(t=>t.classList.remove('active'));
      panel.querySelectorAll('.jpm-pane').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const pane = panel.querySelector(`#jpm-pane-${(tab as HTMLElement).dataset.tab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // TRT
  panel.querySelector('#jpm-trt-run')!.addEventListener('click', () => {
    const onnx = (panel.querySelector('#jpm-onnx-path') as HTMLInputElement).value.trim();
    const dir = (panel.querySelector('#jpm-remote-dir') as HTMLInputElement).value.trim();
    const prec = (panel.querySelector('#jpm-precision') as HTMLSelectElement).value;
    if (!onnx) { setPmStatus('Enter ONNX file path first'); return; }
    runTrtConversion(onnx, dir, prec);
  });

  renderPowerModes();
  queryCurrentMode();
}
