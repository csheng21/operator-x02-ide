// ============================================================================
// JETSON FEATURES 3 + 4: Performance History Graph + Thermal Throttle Alert
// File: src/jetson/jetsonPerfGraph.ts
// Uses: jetson_start_monitoring, jetson_tegrastats_snapshot
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

interface StatPoint {
  time: number;
  gpu: number;
  cpu: number;
  ram: number;
  gpuTemp: number;
  cpuTemp: number;
  power: number;
}

const MAX_POINTS = 60;
const POLL_MS = 1000;
const THERMAL_LIMITS = { gpu: 85, cpu: 80, soc: 75 };

let pgPanel: HTMLElement | null = null;
let pgHistory: StatPoint[] = [];
let pgPollTimer: ReturnType<typeof setInterval> | null = null;
let pgIsMonitoring = false;
let pgAlertShown = false;

function normStats(raw: any) {
  return {
    gpu:     raw?.gpu_usage ?? raw?.gpu_util ?? raw?.gpuUsage ?? raw?.gpu_load ?? 0,
    cpu:     Array.isArray(raw?.cpu_usage) ? Math.round(raw.cpu_usage.reduce((a:number,b:number)=>a+b,0)/raw.cpu_usage.length) : (raw?.cpu_usage ?? raw?.cpuUsage ?? 0),
    ram:     raw?.ram_used_mb ?? raw?.ramUsedMb ?? 0,
    ramTotal:raw?.ram_total_mb ?? raw?.ramTotalMb ?? 6480,
    gpuTemp: raw?.gpu_temp ?? raw?.gpuTemp ?? raw?.gpu_temperature ?? 0,
    cpuTemp: raw?.cpu_temp ?? raw?.cpuTemp ?? raw?.cpu_temperature ?? 0,
    socTemp: raw?.soc_temp ?? raw?.socTemp ?? 0,
    power:   raw?.power_draw ?? raw?.powerDraw ?? raw?.power_current ?? 0,
    powerMax:raw?.power_limit ?? raw?.powerLimit ?? raw?.power_max ?? 15,
  };
}

async function pollStats() {
  try {
    const raw = await invoke<any>('jetson_tegrastats_snapshot');
    const s = normStats(raw);
    const point: StatPoint = {
      time: Date.now(),
      gpu: Math.min(100, s.gpu),
      cpu: Math.min(100, s.cpu),
      ram: s.ramTotal > 0 ? Math.round((s.ram / s.ramTotal) * 100) : 0,
      gpuTemp: s.gpuTemp,
      cpuTemp: s.cpuTemp,
      power: s.power,
    };
    pgHistory.push(point);
    if (pgHistory.length > MAX_POINTS) pgHistory.shift();
    updateGraphUI(s);
    checkThermalAlerts(s);
  } catch(e) { /* ignore poll errors */ }
}

function checkThermalAlerts(s: ReturnType<typeof normStats>) {
  const hotGpu = s.gpuTemp > THERMAL_LIMITS.gpu;
  const hotCpu = s.cpuTemp > THERMAL_LIMITS.cpu;
  const alert = document.getElementById('jpg-thermal-alert');

  if ((hotGpu || hotCpu) && !pgAlertShown) {
    pgAlertShown = true;
    if (alert) {
      const zone = hotGpu ? `GPU-THERM ${s.gpuTemp}°C` : `CPU-THERM ${s.cpuTemp}°C`;
      const limit = hotGpu ? THERMAL_LIMITS.gpu : THERMAL_LIMITS.cpu;
      alert.style.display = 'flex';
      alert.querySelector('.jpg-alert-text')!.textContent =
        `⚠ THERMAL THROTTLE — ${zone} / LIMIT ${limit}°C — PERFORMANCE REDUCED`;
    }
    // Also fire a browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('X02 Jetson — Thermal Alert', {
        body: `Thermal throttle detected. GPU: ${s.gpuTemp}°C, CPU: ${s.cpuTemp}°C`,
      });
    }
  } else if (!hotGpu && !hotCpu) {
    pgAlertShown = false;
    if (alert) alert.style.display = 'none';
  }
}

function updateGraphUI(s: ReturnType<typeof normStats>) {
  // Update live gauges
  setVal('jpg-gpu-val', s.gpu + '%', s.gpu > 80 ? '#ff4444' : s.gpu > 50 ? '#ff8800' : '#76B900');
  setVal('jpg-cpu-val', s.cpu + '%', s.cpu > 80 ? '#ff4444' : s.cpu > 50 ? '#ff8800' : '#00aaff');
  setVal('jpg-ram-val', (s.ram).toFixed(0) + 'MB', '#76B900');
  setVal('jpg-temp-val', s.gpuTemp + '°C', s.gpuTemp > 80 ? '#ff4444' : s.gpuTemp > 65 ? '#ff8800' : '#76B900');
  setVal('jpg-pwr-val', s.power.toFixed(1) + 'W', '#aa66ff');

  // Thermal zone bars
  renderThermal('jpg-tz-gpu', 'GPU-THERM', s.gpuTemp, THERMAL_LIMITS.gpu);
  renderThermal('jpg-tz-cpu', 'CPU-THERM', s.cpuTemp, THERMAL_LIMITS.cpu);
  renderThermal('jpg-tz-soc', 'SOC-THERM', s.socTemp, THERMAL_LIMITS.soc);

  // Graphs
  renderGraph('jpg-canvas-gpu', pgHistory.map(p => p.gpu), '#76B900', 'rgba(118,185,0,0.15)');
  renderGraph('jpg-canvas-cpu', pgHistory.map(p => p.cpu), '#00aaff', 'rgba(0,170,255,0.1)');
  renderGraph('jpg-canvas-ram', pgHistory.map(p => p.ram), '#aa66ff', 'rgba(170,102,255,0.1)');
}

function setVal(id: string, text: string, color: string) {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.style.color = color; }
}

function renderThermal(id: string, label: string, temp: number, limit: number) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = Math.min(100, (temp / 110) * 100);
  const color = temp > limit ? '#ff4444' : temp > limit * 0.85 ? '#ff8800' : '#76B900';
  el.innerHTML = `
    <div class="jpg-tz-label">${label}</div>
    <div class="jpg-tz-temp" style="color:${color}">${temp || 0}°C</div>
    <div class="jpg-tz-bar"><div class="jpg-tz-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="jpg-tz-limit">/ ${limit}°C</div>
  `;
}

function renderGraph(canvasId: string, data: number[], strokeColor: string, fillColor: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  [25, 50, 75].forEach(y => {
    const py = H - (y / 100) * H;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  });

  if (data.length < 2) return;
  const pts = data.slice(-MAX_POINTS);
  const xStep = W / (MAX_POINTS - 1);

  const path = new Path2D();
  pts.forEach((v, i) => {
    const x = i * xStep;
    const y = H - (Math.max(0, Math.min(100, v)) / 100) * H;
    i === 0 ? path.moveTo(x, y) : path.lineTo(x, y);
  });

  // Fill
  const fill = new Path2D(path);
  fill.lineTo((pts.length-1)*xStep, H); fill.lineTo(0, H); fill.closePath();
  ctx.fillStyle = fillColor; ctx.fill(fill);

  // Line
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5; ctx.stroke(path);
}

async function startMonitoring() {
  if (pgIsMonitoring) return;
  pgIsMonitoring = true;
  try { await invoke('jetson_start_monitoring', { intervalMs: POLL_MS }); } catch(_) {}
  pgPollTimer = setInterval(pollStats, POLL_MS);
  const btn = document.getElementById('jpg-btn-start');
  const btnStop = document.getElementById('jpg-btn-stop');
  if (btn) btn.style.display = 'none';
  if (btnStop) btnStop.style.display = '';
  setStatus('● MONITORING LIVE');
}

async function stopMonitoring() {
  if (!pgIsMonitoring) return;
  pgIsMonitoring = false;
  if (pgPollTimer) { clearInterval(pgPollTimer); pgPollTimer = null; }
  try { await invoke('jetson_stop_monitoring'); } catch(_) {}
  const btn = document.getElementById('jpg-btn-start');
  const btnStop = document.getElementById('jpg-btn-stop');
  if (btn) btn.style.display = '';
  if (btnStop) btnStop.style.display = 'none';
  setStatus('○ STOPPED');
}

function setStatus(s: string) {
  const el = document.getElementById('jpg-status');
  if (el) el.textContent = s;
}

export function openJetsonPerfGraph() {
  if (pgPanel) { pgPanel.style.display = 'flex'; return; }

  const panel = document.createElement('div');
  panel.id = 'jpg-panel';
  panel.innerHTML = `
    <style>
      #jpg-panel {
        position:fixed; top:60px; left:20px;
        width:480px; height:520px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.15);
        display:flex; flex-direction:column; z-index:9997;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        resize:both; overflow:hidden; min-width:360px; min-height:300px;
      }
      #jpg-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:8px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jpg-titlebar > span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jpg-btn { background:#0f1a00; border:1px solid #333; color:#888; padding:3px 10px; cursor:pointer; font-size:10px; letter-spacing:1px; font-family:inherit; }
      .jpg-btn:hover { border-color:#76B900; color:#76B900; }
      .jpg-btn-green { border-color:#76B900; color:#76B900; }
      .jpg-btn-red { border-color:#aa3300; color:#ff4444; }
      #jpg-thermal-alert {
        background:rgba(255,68,68,0.08); border-bottom:1px solid rgba(255,68,68,0.4);
        padding:7px 12px; color:#ff4444; font-size:10px; letter-spacing:0.5px;
        display:none; align-items:center; gap:8px; flex-shrink:0;
        animation:jpg-blink 1.5s infinite;
      }
      @keyframes jpg-blink { 0%,100%{opacity:1} 50%{opacity:0.6} }
      #jpg-body { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:12px; }
      #jpg-body::-webkit-scrollbar { width:4px; }
      #jpg-body::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jpg-section-title { font-size:9px; color:#555; letter-spacing:2px; margin-bottom:6px; }
      .jpg-gauges { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
      .jpg-gauge { background:#0a0a0a; border:1px solid #222; padding:8px 6px; text-align:center; }
      .jpg-gauge-label { font-size:8px; color:#555; letter-spacing:1px; }
      .jpg-gauge-val { font-size:18px; font-weight:500; margin-top:4px; }
      .jpg-graph-row { display:flex; flex-direction:column; gap:4px; }
      .jpg-graph-label { display:flex; justify-content:space-between; font-size:9px; color:#555; }
      canvas.jpg-canvas { width:100%; height:50px; background:#050505; border:1px solid #1a1a1a; display:block; }
      .jpg-thermal-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .jpg-tz { background:#0a0a0a; border:1px solid #222; padding:8px; }
      .jpg-tz-label { font-size:8px; color:#555; letter-spacing:1px; }
      .jpg-tz-temp { font-size:20px; font-weight:500; margin:4px 0; }
      .jpg-tz-bar { height:3px; background:#1a1a1a; }
      .jpg-tz-fill { height:100%; transition:width 0.3s; }
      .jpg-tz-limit { font-size:9px; color:#444; margin-top:3px; }
      #jpg-status { padding:4px 12px; font-size:10px; color:#555; border-top:1px solid #111; flex-shrink:0; letter-spacing:1px; }
    </style>
    <div id="jpg-titlebar">
      <span>PERFORMANCE MONITOR</span>
      <button class="jpg-btn jpg-btn-green" id="jpg-btn-start">▶ START</button>
      <button class="jpg-btn jpg-btn-red" id="jpg-btn-stop" style="display:none">■ STOP</button>
      <button class="jpg-btn" id="jpg-close">✕</button>
    </div>
    <div id="jpg-thermal-alert">
      <span class="jpg-alert-text">⚠ THERMAL THROTTLE DETECTED</span>
    </div>
    <div id="jpg-body">
      <div>
        <div class="jpg-section-title">LIVE METRICS</div>
        <div class="jpg-gauges">
          <div class="jpg-gauge"><div class="jpg-gauge-label">GPU</div><div class="jpg-gauge-val" id="jpg-gpu-val">—</div></div>
          <div class="jpg-gauge"><div class="jpg-gauge-label">CPU</div><div class="jpg-gauge-val" id="jpg-cpu-val">—</div></div>
          <div class="jpg-gauge"><div class="jpg-gauge-label">RAM</div><div class="jpg-gauge-val" id="jpg-ram-val">—</div></div>
          <div class="jpg-gauge"><div class="jpg-gauge-label">TEMP</div><div class="jpg-gauge-val" id="jpg-temp-val">—</div></div>
          <div class="jpg-gauge"><div class="jpg-gauge-label">POWER</div><div class="jpg-gauge-val" id="jpg-pwr-val">—</div></div>
        </div>
      </div>
      <div>
        <div class="jpg-section-title">HISTORY — LAST 60s</div>
        <div class="jpg-graph-row">
          <div class="jpg-graph-label"><span style="color:#76B900">GPU %</span><span id="jpg-gpu-minmax">—</span></div>
          <canvas id="jpg-canvas-gpu" class="jpg-canvas" width="440" height="50"></canvas>
        </div>
        <div class="jpg-graph-row" style="margin-top:8px">
          <div class="jpg-graph-label"><span style="color:#00aaff">CPU %</span><span id="jpg-cpu-minmax">—</span></div>
          <canvas id="jpg-canvas-cpu" class="jpg-canvas" width="440" height="50"></canvas>
        </div>
        <div class="jpg-graph-row" style="margin-top:8px">
          <div class="jpg-graph-label"><span style="color:#aa66ff">RAM %</span><span></span></div>
          <canvas id="jpg-canvas-ram" class="jpg-canvas" width="440" height="50"></canvas>
        </div>
      </div>
      <div>
        <div class="jpg-section-title">THERMAL ZONES</div>
        <div class="jpg-thermal-grid">
          <div class="jpg-tz" id="jpg-tz-gpu"></div>
          <div class="jpg-tz" id="jpg-tz-cpu"></div>
          <div class="jpg-tz" id="jpg-tz-soc"></div>
        </div>
      </div>
    </div>
    <div id="jpg-status">○ IDLE — CLICK START TO BEGIN MONITORING</div>
  `;

  document.body.appendChild(panel);
  pgPanel = panel;

  // Init thermal zones
  renderThermal('jpg-tz-gpu', 'GPU-THERM', 0, THERMAL_LIMITS.gpu);
  renderThermal('jpg-tz-cpu', 'CPU-THERM', 0, THERMAL_LIMITS.cpu);
  renderThermal('jpg-tz-soc', 'SOC-THERM', 0, THERMAL_LIMITS.soc);

  // Drag
  const tb = panel.querySelector('#jpg-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown', (e:MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    dragging=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop;
  });
  document.addEventListener('mousemove', (e:MouseEvent) => {
    if (!dragging) return;
    panel.style.left=(e.clientX-ox)+'px'; panel.style.top=(e.clientY-oy)+'px';
  });
  document.addEventListener('mouseup', () => { dragging=false; });

  panel.querySelector('#jpg-close')!.addEventListener('click', () => {
    stopMonitoring();
    panel.style.display = 'none';
  });
  panel.querySelector('#jpg-btn-start')!.addEventListener('click', startMonitoring);
  panel.querySelector('#jpg-btn-stop')!.addEventListener('click', stopMonitoring);
}
