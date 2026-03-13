// =============================================================================
import { callGenericAPI } from '../ide/aiAssistant/apiProviderManager';
// =============================================================================
// Serial Plotter AI — Enhanced Plotter with Signal Analysis
// =============================================================================
// Provides: Multi-channel plotter, zoom/pan, cursor, export, AI signal analysis
// Integration: Called from buildSystemUI.ts serial plotter dialog
// Reads data from: serialMonitorAI.ts serialLogger
// =============================================================================

// --- Types ---

interface PlotChannel {
  name: string;
  color: string;
  data: { time: number; value: number }[];  // time = ms since start
  visible: boolean;
  min: number;
  max: number;
}

interface SignalInsight {
  type: 'spike' | 'periodic' | 'drift' | 'noise' | 'correlation' | 'dropout' | 'flatline';
  channel: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

// --- Constants ---

const CHANNEL_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
  '#6366f1', // indigo
];

const MAX_POINTS_PER_CHANNEL = 2000;
const ANALYSIS_INTERVAL = 5000;  // Run AI analysis every 5 seconds

// --- Plotter State ---

let channels: Map<string, PlotChannel> = new Map();
let insights: SignalInsight[] = [];
let plotStartTime = 0;
let plotCanvas: HTMLCanvasElement | null = null;
let plotCtx: CanvasRenderingContext2D | null = null;
let animFrameId: number | null = null;
let isPlotting = false;
let isPaused = false;

// Viewport (zoom/pan)
let viewTimeSpan = 10000;  // visible window in ms (default 10s)
let viewTimeEnd = -1;      // -1 = follow latest
let viewYMin = Infinity;
let viewYMax = -Infinity;
let autoScaleY = true;

// Cursor
let cursorX = -1;
let cursorY = -1;
let showCursor = false;

// Analysis
let analysisTimer: ReturnType<typeof setInterval> | null = null;
let lastAnalysisTime = 0;
let insightsPanel: HTMLElement | null = null;
let aiAnalysisEnabled = true;
let demoTimer: ReturnType<typeof setInterval> | null = null;
let statusLabel: HTMLElement | null = null;

// --- Parse Serial Line into Channels ---

/**
 * Parse a serial line into key:value pairs
 * Supports formats:
 *   temperature:25.3 | humidity:55.0
 *   temp=25.3, hum=55.0
 *   25.3 55.0 1013.2  (space-separated, auto-named ch1, ch2...)
 *   25.3,55.0,1013.2  (comma-separated)
 */
function parseSerialValues(text: string): Map<string, number> {
  const values = new Map<string, number>();

  // Skip non-data lines (log messages, errors, boot messages, debug)
  const trimmed = text.trim();
  if (/^\[?(BOOT|INFO|ALERT|RECOVERY|ERROR|WARNING|SYSTEM|DEBUG|PHASE|MEMORY|WATCHDOG|I2C|SPI|UART|CRC|TIMEOUT|RESET|LOG)/i.test(trimmed)) return values;
  if (/^(---|===|\*\*\*|>>>|<<<)/i.test(trimmed)) return values;
  if (/^#|^\/\//i.test(trimmed)) return values; // comments

  // Keys that are debug/metadata — NOT sensor data. Never plot these.
  const IGNORED_KEYS = new Set([
    'stack', 'heap', 'block', 'free', 'used', 'alloc', 'size', 'len', 'length',
    'time', 'millis', 'micros', 'uptime', 'elapsed', 'dt', 'ms', 'us', 'tick',
    'cause', 'reason', 'code', 'err', 'error', 'status', 'flag', 'mode', 'state',
    'count', 'total', 'index', 'id', 'pid', 'seq', 'num', 'logged', 'target',
    'line', 'col', 'addr', 'ptr', 'ref', 'crc', 'checksum', 'hash',
    'retry', 'attempt', 'timeout', 'baud', 'rate', 'port', 'pin',
    'version', 'ver', 'rev', 'build', 'cpu', 'mhz', 'freq',
    'warning', 'warn', 'alert', 'info', 'debug', 'critical', 'fatal', 'notice', 'trace',
    'type', 'level', 'tag', 'msg', 'source', 'file', 'func', 'ok', 'fail',
    'rst', 'wdt', 'boot', 'rssi', 'ssid', 'ip', 'mac', 'dns', 'gateway',
  ]);

  // Remove timestamp prefix like [00:01:22]
  let cleaned = text.replace(/^\[[\d:]+\]\s*/, '').trim();

  // Format 1: key:value | key:value  OR  key:value, key:value
  const kvPattern = /([a-zA-Z_][\w]*)\s*[:=]\s*(-?\d+\.?\d*)/g;
  let match;
  let kvCount = 0;
  while ((match = kvPattern.exec(cleaned)) !== null) {
    const key = match[1].toLowerCase();
    if (IGNORED_KEYS.has(key)) continue; // Skip debug/metadata keys
    const val = parseFloat(match[2]);
    if (!isNaN(val) && isFinite(val)) {
      values.set(key, val);
      kvCount++;
    }
  }
  if (kvCount > 0) return values;

  // Format 2: space or comma separated numbers (need 2+ to be sensor data, not debug junk)
  const nums = cleaned.split(/[\s,;|]+/).map(s => parseFloat(s)).filter(n => !isNaN(n) && isFinite(n));
  if (nums.length >= 2 && nums.length <= 8) {
    nums.forEach((n, i) => {
      values.set('ch' + (i + 1), n);
    });
  }

  return values;
}

// --- Feed Data to Plotter ---

function feedPlotterLine(text: string): void {
  if (!isPlotting || isPaused) return;

  const values = parseSerialValues(text);
  if (values.size === 0) return;

  // Update status to show live data
  if (statusLabel && !demoTimer) {
    statusLabel.textContent = '🟢 Live';
    statusLabel.style.color = '#22c55e';
  }

  const now = Date.now();
  if (plotStartTime === 0) plotStartTime = now;
  const t = now - plotStartTime;

  let colorIdx = channels.size;

  const MAX_CHANNELS = 8;

  values.forEach((value, name) => {
    let ch = channels.get(name);
    if (!ch) {
      // Don't create more than MAX_CHANNELS
      if (channels.size >= MAX_CHANNELS) return;
      ch = {
        name,
        color: CHANNEL_COLORS[colorIdx % CHANNEL_COLORS.length],
        data: [],
        visible: true,
        min: Infinity,
        max: -Infinity,
      };
      channels.set(name, ch);
      colorIdx++;
      updateLegend();
    }

    ch.data.push({ time: t, value });
    if (value < ch.min) ch.min = value;
    if (value > ch.max) ch.max = value;

    // Trim old data
    if (ch.data.length > MAX_POINTS_PER_CHANNEL) {
      ch.data.splice(0, ch.data.length - MAX_POINTS_PER_CHANNEL);
    }
  });
}

// --- Canvas Rendering ---

function renderPlot(): void {
  if (!plotCanvas || !plotCtx) return;

  const ctx = plotCtx;
  const W = plotCanvas.width;
  const H = plotCanvas.height;
  const pad = { top: 10, right: 12, bottom: 40, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Clear
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  // Compute time range
  let tEnd: number;
  if (viewTimeEnd === -1) {
    // Follow latest
    let maxT = 0;
    channels.forEach(ch => {
      if (ch.data.length > 0) maxT = Math.max(maxT, ch.data[ch.data.length - 1].time);
    });
    tEnd = maxT;
  } else {
    tEnd = viewTimeEnd;
  }
  const tStart = tEnd - viewTimeSpan;

  // Compute Y range
  let yMin = Infinity;
  let yMax = -Infinity;
  if (autoScaleY) {
    channels.forEach(ch => {
      if (!ch.visible) return;
      for (const pt of ch.data) {
        if (pt.time >= tStart && pt.time <= tEnd) {
          if (pt.value < yMin) yMin = pt.value;
          if (pt.value > yMax) yMax = pt.value;
        }
      }
    });
    if (yMin === Infinity) { yMin = 0; yMax = 100; }
    const yPad = (yMax - yMin) * 0.1 || 5;
    yMin -= yPad;
    yMax += yPad;
    viewYMin = yMin;
    viewYMax = yMax;
  } else {
    yMin = viewYMin;
    yMax = viewYMax;
  }

  // --- Grid Lines ---
  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  // Y grid (5 lines)
  ctx.font = '10px JetBrains Mono, Consolas, monospace';
  ctx.fillStyle = '#555';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    const val = yMax - ((yMax - yMin) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), pad.left - 6, y);
  }

  // X grid (time labels)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xSteps = 5;
  for (let i = 0; i <= xSteps; i++) {
    const x = pad.left + (plotW / xSteps) * i;
    const t = tStart + (viewTimeSpan / xSteps) * i;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.stroke();
    // Format time
    const sec = Math.floor(t / 1000);
    const ms = t % 1000;
    let label: string;
    if (viewTimeSpan > 60000) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      label = m + ':' + String(s).padStart(2, '0');
    } else {
      label = sec + '.' + String(Math.floor(ms / 100));
    }
    ctx.fillText(label + 's', x, pad.top + plotH + 6);
  }

  // --- Axis Labels ---
  // X-axis label
  ctx.fillStyle = '#666';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Time (seconds)', pad.left + plotW / 2, pad.top + plotH + 22);

  // Y-axis label (rotated)
  ctx.save();
  ctx.translate(12, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Value', 0, 0);
  ctx.restore();

  // --- Plot Lines ---
  const mapX = (t: number) => pad.left + ((t - tStart) / viewTimeSpan) * plotW;
  const mapY = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Clip to plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, plotW, plotH);
  ctx.clip();

  channels.forEach(ch => {
    if (!ch.visible || ch.data.length < 2) return;

    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let started = false;
    for (const pt of ch.data) {
      if (pt.time < tStart - viewTimeSpan * 0.1) continue;
      if (pt.time > tEnd + viewTimeSpan * 0.1) break;
      const x = mapX(pt.time);
      const y = mapY(pt.value);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  ctx.restore();

  // --- Cursor Crosshair ---
  if (showCursor && cursorX >= pad.left && cursorX <= pad.left + plotW) {
    // Vertical line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cursorX, pad.top);
    ctx.lineTo(cursorX, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal line
    if (cursorY >= pad.top && cursorY <= pad.top + plotH) {
      ctx.beginPath();
      ctx.moveTo(pad.left, cursorY);
      ctx.lineTo(pad.left + plotW, cursorY);
      ctx.stroke();
    }

    // Value readout at cursor position
    const cursorTime = tStart + ((cursorX - pad.left) / plotW) * viewTimeSpan;
    let tooltipY = pad.top + 8;
    const tooltipX = cursorX + 12;

    channels.forEach(ch => {
      if (!ch.visible || ch.data.length === 0) return;

      // Find nearest point
      let nearest = ch.data[0];
      let minDist = Infinity;
      for (const pt of ch.data) {
        const dist = Math.abs(pt.time - cursorTime);
        if (dist < minDist) { minDist = dist; nearest = pt; }
      }

      // Draw dot on line
      const dotX = mapX(nearest.time);
      const dotY = mapY(nearest.value);
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip text
      ctx.font = '10px JetBrains Mono, Consolas, monospace';
      ctx.fillStyle = ch.color;
      const txt = ch.name + ': ' + nearest.value.toFixed(2);
      const clampedX = Math.min(tooltipX, W - ctx.measureText(txt).width - 8);
      ctx.fillText(txt, clampedX, tooltipY);
      tooltipY += 14;
    });
  }

  // --- Plot Border ---
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  // Continue animation
  if (isPlotting && !isPaused) {
    animFrameId = requestAnimationFrame(renderPlot);
  }
}

// --- Legend ---

let legendContainer: HTMLElement | null = null;

function updateLegend(): void {
  if (!legendContainer) return;
  legendContainer.innerHTML = '';

  channels.forEach((ch, name) => {
    const item = document.createElement('button');
    item.style.cssText = `
      display:flex; align-items:center; gap:5px; padding:2px 8px;
      background:${ch.visible ? 'rgba(255,255,255,0.05)' : 'transparent'};
      border:1px solid ${ch.visible ? ch.color + '66' : '#333'};
      border-radius:10px; cursor:pointer; font-size:10px;
      font-family:'JetBrains Mono',Consolas,monospace;
      color:${ch.visible ? ch.color : '#555'}; transition:all 0.15s;
    `;

    const dot = document.createElement('span');
    dot.style.cssText = `width:8px; height:8px; border-radius:50%; background:${ch.visible ? ch.color : '#333'}; flex-shrink:0;`;
    item.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = name;
    item.appendChild(label);

    // Show latest value
    if (ch.data.length > 0) {
      const val = document.createElement('span');
      val.style.cssText = `color:${ch.visible ? '#aaa' : '#444'}; margin-left:4px;`;
      val.textContent = ch.data[ch.data.length - 1].value.toFixed(1);
      item.appendChild(val);
    }

    item.onclick = () => {
      ch.visible = !ch.visible;
      updateLegend();
    };

    legendContainer.appendChild(item);
  });
}

// --- AI Signal Analysis Engine ---

function runSignalAnalysis(): void {
  if (!aiAnalysisEnabled) return;
  if (channels.size === 0) return;
  if (Date.now() - lastAnalysisTime < ANALYSIS_INTERVAL) return;
  lastAnalysisTime = Date.now();

  const newInsights: SignalInsight[] = [];

  channels.forEach((ch, name) => {
    if (ch.data.length < 10) return;
    const recent = ch.data.slice(-100);
    const values = recent.map(p => p.value);
    const times = recent.map(p => p.time);

    // --- 1. Spike Detection ---
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length);
    const last = values[values.length - 1];
    if (stdDev > 0 && Math.abs(last - avg) > stdDev * 3) {
      newInsights.push({
        type: 'spike',
        channel: name,
        severity: 'warning',
        title: `Spike on "${name}"`,
        message: `Value ${last.toFixed(1)} deviates ${((last - avg) / stdDev).toFixed(1)}σ from mean (${avg.toFixed(1)} ± ${stdDev.toFixed(1)}).`,
        timestamp: Date.now(),
      });
    }

    // --- 2. Periodic Pattern Detection ---
    if (values.length >= 20) {
      // Find peaks (local maxima)
      const peaks: number[] = [];
      for (let i = 1; i < values.length - 1; i++) {
        if (values[i] > values[i - 1] && values[i] > values[i + 1] && values[i] > avg + stdDev * 0.5) {
          peaks.push(times[i]);
        }
      }
      if (peaks.length >= 3) {
        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const intervalVariance = intervals.reduce((sum, iv) => sum + (iv - avgInterval) ** 2, 0) / intervals.length;
        const intervalCV = Math.sqrt(intervalVariance) / avgInterval; // coefficient of variation

        if (intervalCV < 0.25 && avgInterval > 500) {
          // Consistent period detected
          const freqHz = 1000 / avgInterval;
          newInsights.push({
            type: 'periodic',
            channel: name,
            severity: 'info',
            title: `Periodic pattern on "${name}"`,
            message: `Repeating every ${(avgInterval / 1000).toFixed(1)}s (${freqHz.toFixed(2)} Hz). ${peaks.length} peaks detected in window.`,
            timestamp: Date.now(),
          });
        }
      }
    }

    // --- 3. Drift Detection ---
    if (values.length >= 30) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const drift = avgSecond - avgFirst;
      const range = ch.max - ch.min;
      if (range > 0 && Math.abs(drift) > range * 0.15) {
        newInsights.push({
          type: 'drift',
          channel: name,
          severity: 'warning',
          title: `Drift on "${name}"`,
          message: `Signal drifting ${drift > 0 ? 'up' : 'down'} by ${Math.abs(drift).toFixed(1)} (${((Math.abs(drift) / range) * 100).toFixed(0)}% of range). Possible sensor warm-up or calibration issue.`,
          timestamp: Date.now(),
        });
      }
    }

    // --- 4. Noise Level ---
    if (stdDev > 0 && values.length >= 10) {
      const snr = Math.abs(avg) / stdDev;
      if (snr < 3 && Math.abs(avg) > 0.01) {
        newInsights.push({
          type: 'noise',
          channel: name,
          severity: 'warning',
          title: `Noisy signal: "${name}"`,
          message: `SNR is ${snr.toFixed(1)} (poor). StdDev: ±${stdDev.toFixed(2)}. Add hardware filtering (100nF cap) or software averaging.`,
          timestamp: Date.now(),
        });
      }
    }

    // --- 5. Dropout Detection (flat for too long) ---
    if (values.length >= 10) {
      let flatCount = 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i] === values[i - 1]) flatCount++;
      }
      const flatRatio = flatCount / (values.length - 1);
      if (flatRatio > 0.8 && values.length > 15) {
        newInsights.push({
          type: 'flatline',
          channel: name,
          severity: 'error',
          title: `Flatline on "${name}"`,
          message: `${(flatRatio * 100).toFixed(0)}% of readings are identical (${last.toFixed(1)}). Sensor may be disconnected or stuck.`,
          timestamp: Date.now(),
        });
      }
    }
  });

  // --- 6. Cross-Channel Correlation ---
  const channelNames = Array.from(channels.keys());
  for (let i = 0; i < channelNames.length; i++) {
    for (let j = i + 1; j < channelNames.length; j++) {
      const chA = channels.get(channelNames[i])!;
      const chB = channels.get(channelNames[j])!;
      if (chA.data.length < 20 || chB.data.length < 20) continue;

      // Align by time (simple: use last N points assuming same rate)
      const n = Math.min(chA.data.length, chB.data.length, 50);
      const a = chA.data.slice(-n).map(p => p.value);
      const b = chB.data.slice(-n).map(p => p.value);
      const avgA = a.reduce((s, v) => s + v, 0) / n;
      const avgB = b.reduce((s, v) => s + v, 0) / n;
      let num = 0; let denA = 0; let denB = 0;
      for (let k = 0; k < n; k++) {
        const da = a[k] - avgA;
        const db = b[k] - avgB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }
      const den = Math.sqrt(denA * denB);
      const corr = den > 0 ? num / den : 0;

      if (Math.abs(corr) > 0.85) {
        newInsights.push({
          type: 'correlation',
          channel: channelNames[i] + ' & ' + channelNames[j],
          severity: 'info',
          title: `Correlated: "${channelNames[i]}" ↔ "${channelNames[j]}"`,
          message: `${corr > 0 ? 'Positive' : 'Negative'} correlation (r=${corr.toFixed(2)}). These signals move ${corr > 0 ? 'together' : 'inversely'} — may share a common cause.`,
          timestamp: Date.now(),
        });
      }
    }
  }

  // Merge new insights (avoid exact duplicates within 10s)
  for (const ni of newInsights) {
    const isDuplicate = insights.some(
      existing => existing.type === ni.type && existing.channel === ni.channel && (ni.timestamp - existing.timestamp) < 10000
    );
    if (!isDuplicate) {
      insights.push(ni);
      // Keep last 50 insights
      if (insights.length > 50) insights.splice(0, insights.length - 50);
    }
  }

  renderInsightsPanel();
}

// --- Insights Panel ---

function renderInsightsPanel(): void {
  if (!insightsPanel) return;
  const content = insightsPanel.querySelector('#plotter-insights-content');
  const footer = insightsPanel.querySelector('#plotter-ai-footer') as HTMLElement | null;
  if (!content) return;

  if (insights.length === 0) {
    content.innerHTML = `
      <div style="text-align:center; padding:12px; color:#555; font-size:11px;">
        <div style="font-size:16px; margin-bottom:4px;">📊</div>
        Monitoring signals... insights will appear here.
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  // Show footer when insights exist
  if (footer) footer.style.display = 'block';

  // Show latest 8 insights
  const recent = insights.slice(-8).reverse();
  let html = '';

  for (const insight of recent) {
    const sevColor = insight.severity === 'error' ? '#ef4444' : insight.severity === 'warning' ? '#f59e0b' : '#3b82f6';
    const sevIcon = insight.severity === 'error' ? '🔴' : insight.severity === 'warning' ? '🟡' : '🔵';
    const typeIcon: Record<string, string> = {
      spike: '📈', periodic: '🔄', drift: '📉', noise: '📡', correlation: '🔗', dropout: '⚠️', flatline: '➖'
    };
    const age = Math.floor((Date.now() - insight.timestamp) / 1000);
    const ageStr = age < 60 ? age + 's ago' : Math.floor(age / 60) + 'm ago';

    html += `
      <div style="padding:8px 10px; border-bottom:1px solid #1e1e1e; transition:background 0.15s;"
           onmouseenter="this.style.background='rgba(255,255,255,0.02)'" onmouseleave="this.style.background='transparent'">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:11px;">${typeIcon[insight.type] || sevIcon}</span>
            <span style="font-size:11px; font-weight:600; color:${sevColor};">${escapeHtmlPlotter(insight.title)}</span>
          </div>
          <span style="font-size:9px; color:#444;">${ageStr}</span>
        </div>
        <div style="font-size:11px; color:#888; line-height:1.5; padding-left:20px;">
          ${escapeHtmlPlotter(insight.message)}
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
}

// --- AI Helpers ---

function getPlotterProviderLabel(): string {
  try {
    const stored = localStorage.getItem('ai-ide-api-configuration') || localStorage.getItem('aiApiConfig');
    if (stored) {
      const config = JSON.parse(stored);
      const provider = config.provider || '';
      const model = config.model || '';
      const displayNames: Record<string, string> = {
        operator_x02: 'Operator X02', deepseek: 'DeepSeek', claude: 'Claude',
        openai: 'OpenAI', gemini: 'Gemini', groq: 'Groq', cohere: 'Cohere',
        kimi: 'Kimi', ollama: 'Ollama', custom: 'Custom',
      };
      const name = displayNames[provider] || provider;
      return model ? name + ' · ' + model : name;
    }
    return 'AI';
  } catch { return 'AI'; }
}

function getPlotterTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function plotterSendToAIChat(prompt: string): void {
  const input = (document.getElementById('user-input') || document.getElementById('ai-assistant-input')) as HTMLTextAreaElement | null;
  if (!input) { console.error('[PlotterAI] No AI chat input found'); return; }
  input.value = prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => {
    import('../conversation').then((module: any) => {
      module.sendMessage();
      console.log('[PlotterAI] Sent to AI chat');
    }).catch(() => {
      const sendBtn = document.getElementById('send-btn') as HTMLElement;
      if (sendBtn) sendBtn.click();
    });
  }, 150);
}

// Store last analysis for send-to-chat
let lastAnalysisPrompt = '';
let lastAnalysisResponse = '';

// --- AI Explain ---

async function askAIAboutInsights(): Promise<void> {
  const btn = document.getElementById('plotter-ai-explain-btn');
  if (btn) {
    btn.textContent = '⏳ Analyzing...';
    (btn as HTMLButtonElement).disabled = true;
  }

  const channelSummary = Array.from(channels.entries()).map(([name, ch]) => {
    const vals = ch.data.slice(-50).map(p => p.value);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return `${name}: avg=${avg.toFixed(1)}, min=${min.toFixed(1)}, max=${max.toFixed(1)}, points=${ch.data.length}`;
  }).join('\n');

  const insightSummary = insights.slice(-10).map(i =>
    `[${i.severity.toUpperCase()}] ${i.title}: ${i.message}`
  ).join('\n');

  const systemPrompt = 'You are an embedded systems expert analyzing serial plotter data from an Arduino/ESP32 project. '
    + 'Give a SHORT, practical analysis (3-5 sentences). Explain what the signal patterns mean, '
    + 'what hardware/software issue likely causes them, and one specific fix. '
    + 'Do NOT use code blocks or markdown. Keep it plain text and conversational.';

  const userPrompt = `Channel data:\n${channelSummary}\n\nDetected insights:\n${insightSummary}\n\nExplain what is happening and what to fix.`;

  lastAnalysisPrompt = userPrompt;

  try {
    const result = await callGenericAPI(systemPrompt + '\n\n' + userPrompt);
    const cleaned = result
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    lastAnalysisResponse = cleaned;

    const provider = escapeHtmlPlotter(getPlotterProviderLabel());
    const timestamp = getPlotterTimestamp();
    const formatted = escapeHtmlPlotter(cleaned).replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

    // Show result in dedicated AI response box
    if (insightsPanel) {
      const responseBox = insightsPanel.querySelector('#plotter-ai-response');
      if (responseBox) {
        (responseBox as HTMLElement).style.display = 'block';
        responseBox.innerHTML = `
          <div style="margin:6px 8px; padding:0; background:linear-gradient(135deg,#1a2a3a,#1a3050);
            border:1px solid #2a4a6a; border-radius:6px; overflow:hidden;">
            <div style="padding:5px 8px; display:flex; align-items:center; gap:6px; border-bottom:1px solid #2a4a6a33; flex-wrap:wrap;">
              <span style="font-size:10px; color:#58A6FF; font-weight:700;">🧠 AI Analysis</span>
              <span style="background:#1a2a1a; border:1px solid #2a4a2a; padding:0px 5px; border-radius:3px; color:#6ABF69; font-size:9px;">${provider}</span>
              <span style="font-size:9px; color:#555; margin-left:auto;">${timestamp}</span>
            </div>
            <div style="padding:8px 10px; font-size:11px; color:#D4D4D4; line-height:1.6;">${formatted}</div>
            <div id="plotter-ai-sendchat" style="padding:6px 10px; border-top:1px solid #2a4a6a33; display:flex; align-items:center; gap:5px; cursor:pointer; color:#58A6FF; font-size:10px; font-weight:600; transition:all 0.15s;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Send to AI Chat for further discussion →
            </div>
          </div>
        `;

        // Bind send-to-chat
        const sendLink = document.getElementById('plotter-ai-sendchat');
        if (sendLink) {
          sendLink.onmouseenter = () => { sendLink.style.color = '#79B8FF'; sendLink.style.background = 'rgba(88,166,255,0.05)'; };
          sendLink.onmouseleave = () => { sendLink.style.color = '#58A6FF'; sendLink.style.background = 'transparent'; };
          sendLink.onclick = () => {
            const chatPrompt = `[Serial Plotter AI Analysis]\n\n${lastAnalysisPrompt}\n\nAI Analysis Result:\n${lastAnalysisResponse}\n\nPlease help me debug this further. What specific code changes or hardware fixes would you recommend?`;
            plotterSendToAIChat(chatPrompt);
            sendLink.innerHTML = '<span style="color:#4EC9B0;">✅ Sent to AI Chat</span>';
            setTimeout(() => {
              sendLink.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Send to AI Chat for further discussion →`;
            }, 2000);
          };
        }

        responseBox.scrollIntoView({ behavior: 'smooth' });
      }
    }
  } catch (err) {
    console.error('[PlotterAI] Analysis failed:', err);
    if (insightsPanel) {
      const responseBox = insightsPanel.querySelector('#plotter-ai-response');
      if (responseBox) {
        (responseBox as HTMLElement).style.display = 'block';
        responseBox.innerHTML = `
          <div style="margin:6px 8px; padding:8px 10px; background:#2a1a1a; border:1px solid #5a2a2a; border-radius:6px; font-size:11px; color:#FF6B6B;">
            Analysis failed. Check your AI provider settings.
          </div>
        `;
      }
    }
  }

  if (btn) {
    btn.textContent = '🧠 Ask AI to Explain All Insights';
    (btn as HTMLButtonElement).disabled = false;
  }
}

// --- Export Functions ---

function exportCSV(): void {
  if (channels.size === 0) return;

  const names = Array.from(channels.keys());
  let csv = 'time_ms,' + names.join(',') + '\n';

  // Collect all timestamps
  const allTimes = new Set<number>();
  channels.forEach(ch => ch.data.forEach(pt => allTimes.add(pt.time)));
  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);

  // Build time-aligned rows
  const latestByChannel = new Map<string, number>();
  const dataIndex = new Map<string, number>();
  names.forEach(n => dataIndex.set(n, 0));

  for (const t of sortedTimes) {
    const row: string[] = [String(t)];
    for (const name of names) {
      const ch = channels.get(name)!;
      const idx = dataIndex.get(name)!;
      // Advance index to current time
      while (idx < ch.data.length - 1 && ch.data[idx + 1].time <= t) {
        dataIndex.set(name, idx + 1);
      }
      const currentIdx = dataIndex.get(name)!;
      if (currentIdx < ch.data.length && Math.abs(ch.data[currentIdx].time - t) < 200) {
        row.push(ch.data[currentIdx].value.toFixed(3));
        latestByChannel.set(name, ch.data[currentIdx].value);
      } else if (latestByChannel.has(name)) {
        row.push(latestByChannel.get(name)!.toFixed(3));
      } else {
        row.push('');
      }
    }
    csv += row.join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = 'serial_plot_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportPNG(): void {
  if (!plotCanvas) return;
  const dataUrl = plotCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  const now = new Date();
  a.href = dataUrl;
  a.download = 'serial_plot_' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + '.png';
  a.click();
}

// --- Utility ---

function escapeHtmlPlotter(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Build Plotter UI ---

function createSerialPlotter(container: HTMLElement): {
  start: () => void;
  stop: () => void;
  feedLine: (text: string) => void;
  destroy: () => void;
} {
  container.innerHTML = '';
  container.style.cssText = 'display:flex; flex-direction:column; height:100%; background:#0d0d0d; font-family:inherit;';

  // --- Toolbar ---
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display:flex; align-items:center; gap:6px; padding:6px 10px;
    background:#1a1a1a; border-bottom:1px solid #2a2a2a; flex-shrink:0; flex-wrap:wrap;
  `;

  // Zoom controls
  const zoomOutBtn = createToolBtn('−', 'Zoom Out (wider time window)', () => {
    viewTimeSpan = Math.min(viewTimeSpan * 1.5, 300000);
  });
  const zoomInBtn = createToolBtn('+', 'Zoom In (narrower time window)', () => {
    viewTimeSpan = Math.max(viewTimeSpan / 1.5, 1000);
  });
  const resetViewBtn = createToolBtn('⟲', 'Reset view to follow latest', () => {
    viewTimeSpan = 10000;
    viewTimeEnd = -1;
    autoScaleY = true;
  });

  // Pause/Resume
  const pauseBtn = createToolBtn('⏸', 'Pause', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '▶' : '⏸';
    pauseBtn.title = isPaused ? 'Resume' : 'Pause';
    if (!isPaused) {
      viewTimeEnd = -1; // Re-follow latest
      animFrameId = requestAnimationFrame(renderPlot);
    }
  });

  // Clear
  const clearBtn = createToolBtn('🗑', 'Clear all data', () => {
    channels.clear();
    insights.length = 0;
    plotStartTime = 0;
    updateLegend();
    renderInsightsPanel();
  });

  // Export
  const csvBtn = createToolBtn('CSV', 'Export data as CSV', exportCSV);
  csvBtn.style.fontSize = '9px';
  csvBtn.style.fontWeight = '700';
  csvBtn.style.letterSpacing = '0.05em';

  const pngBtn = createToolBtn('PNG', 'Export chart as image', exportPNG);
  pngBtn.style.fontSize = '9px';
  pngBtn.style.fontWeight = '700';
  pngBtn.style.letterSpacing = '0.05em';

  // AI toggle
  const aiBtn = createToolBtn('🧠', 'Toggle AI signal analysis', () => {
    aiAnalysisEnabled = !aiAnalysisEnabled;
    aiBtn.style.borderColor = aiAnalysisEnabled ? '#22c55e55' : '#333';
    aiBtn.style.color = aiAnalysisEnabled ? '#22c55e' : '#555';
    aiBtn.title = aiAnalysisEnabled ? 'AI Analysis: ON (click to disable)' : 'AI Analysis: OFF (click to enable)';
  });
  aiBtn.style.borderColor = '#22c55e55';
  aiBtn.style.color = '#22c55e';

  // Status label
  statusLabel = document.createElement('span');
  statusLabel.style.cssText = 'font-size:10px; color:#555; font-family:JetBrains Mono,Consolas,monospace;';
  statusLabel.textContent = 'Waiting for data...';

  // Time window label
  const timeLabel = document.createElement('span');
  timeLabel.style.cssText = 'font-size:10px; color:#555; margin-left:auto; font-family:JetBrains Mono,Consolas,monospace;';
  const updateTimeLabel = () => {
    const sec = (viewTimeSpan / 1000).toFixed(1);
    timeLabel.textContent = sec + 's window';
    requestAnimationFrame(updateTimeLabel);
  };
  requestAnimationFrame(updateTimeLabel);

  toolbar.append(zoomOutBtn, zoomInBtn, resetViewBtn, pauseBtn, clearBtn, csvBtn, pngBtn, aiBtn, statusLabel, timeLabel);
  container.appendChild(toolbar);

  // --- Legend Row ---
  legendContainer = document.createElement('div');
  legendContainer.style.cssText = `
    display:flex; gap:4px; padding:4px 10px; flex-wrap:wrap;
    background:#111; border-bottom:1px solid #1e1e1e; flex-shrink:0;
    min-height:24px; max-height:52px; overflow-x:auto; overflow-y:hidden;
  `;
  container.appendChild(legendContainer);

  // --- Main Content (plot + insights side by side) ---
  const mainContent = document.createElement('div');
  mainContent.style.cssText = 'display:flex; flex:1; overflow:hidden;';

  // Canvas
  const canvasWrapper = document.createElement('div');
  canvasWrapper.style.cssText = 'flex:1; position:relative; min-width:0;';

  plotCanvas = document.createElement('canvas');
  plotCanvas.style.cssText = 'width:100%; height:100%; display:block;';
  canvasWrapper.appendChild(plotCanvas);

  // Resize observer for canvas
  const resizeObserver = new ResizeObserver(() => {
    if (plotCanvas) {
      const dpr = window.devicePixelRatio || 1;
      plotCanvas.width = canvasWrapper.clientWidth * dpr;
      plotCanvas.height = canvasWrapper.clientHeight * dpr;
      plotCtx = plotCanvas.getContext('2d');
      if (plotCtx) plotCtx.scale(dpr, dpr);
      if (isPaused) renderPlot(); // re-render on resize even if paused
    }
  });
  resizeObserver.observe(canvasWrapper);

  // Canvas mouse events
  plotCanvas.addEventListener('mousemove', (e) => {
    const rect = plotCanvas!.getBoundingClientRect();
    cursorX = e.clientX - rect.left;
    cursorY = e.clientY - rect.top;
    showCursor = true;
    if (isPaused) renderPlot();
  });

  plotCanvas.addEventListener('mouseleave', () => {
    showCursor = false;
    if (isPaused) renderPlot();
  });

  // Zoom with mouse wheel
  plotCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      viewTimeSpan = Math.max(viewTimeSpan / 1.2, 1000);
    } else {
      viewTimeSpan = Math.min(viewTimeSpan * 1.2, 300000);
    }
    if (isPaused) renderPlot();
  }, { passive: false });

  // Pan with mouse drag
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTimeEnd = 0;

  plotCanvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    // Switch to manual time end
    if (viewTimeEnd === -1) {
      let maxT = 0;
      channels.forEach(ch => {
        if (ch.data.length > 0) maxT = Math.max(maxT, ch.data[ch.data.length - 1].time);
      });
      viewTimeEnd = maxT;
    }
    dragStartTimeEnd = viewTimeEnd;
    plotCanvas!.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !plotCanvas) return;
    const dx = e.clientX - dragStartX;
    const pxPerMs = plotCanvas.clientWidth / viewTimeSpan;
    viewTimeEnd = dragStartTimeEnd - dx / pxPerMs;
    if (isPaused) renderPlot();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (plotCanvas) plotCanvas.style.cursor = 'crosshair';
    }
  });

  // Double-click to re-follow
  plotCanvas.addEventListener('dblclick', () => {
    viewTimeEnd = -1;
  });

  plotCanvas.style.cursor = 'crosshair';
  mainContent.appendChild(canvasWrapper);

  // --- Insights Panel (right side) ---
  insightsPanel = document.createElement('div');
  insightsPanel.style.cssText = `
    width:260px; flex-shrink:0; position:relative;
    background:#111; border-left:1px solid #1e1e1e;
    font-family:inherit; overflow:hidden;
  `;
  // Header (fixed at top)
  const insightsHeader = document.createElement('div');
  insightsHeader.style.cssText = `
    position:absolute; top:0; left:0; right:0; z-index:2;
    padding:8px 10px; border-bottom:1px solid #1e1e1e;
    font-size:11px; font-weight:700; color:#888;
    display:flex; align-items:center; gap:6px;
    background:#111;
  `;
  insightsHeader.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#f59e0b;">
      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-1.38 3.02A4 4 0 0 1 16 14v0a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4v0a4 4 0 0 1 1.38-3.02A4 4 0 0 1 8 7V6a4 4 0 0 1 4-4z"/>
      <path d="M12 2v20"/>
    </svg>
    AI Signal Insights
  `;
  insightsPanel.appendChild(insightsHeader);

  // Scrollable insights list (between header and footer)
  const insightsList = document.createElement('div');
  insightsList.id = 'plotter-insights-list';
  insightsList.style.cssText = `
    position:absolute; top:32px; left:0; right:0; bottom:44px;
    overflow-y:auto; overflow-x:hidden;
  `;

  // Inside the scroll area: insights + AI response
  const insightsContent = document.createElement('div');
  insightsContent.id = 'plotter-insights-content';
  insightsList.appendChild(insightsContent);

  const aiResponseBox = document.createElement('div');
  aiResponseBox.id = 'plotter-ai-response';
  aiResponseBox.style.cssText = 'display:none;';
  insightsList.appendChild(aiResponseBox);

  insightsPanel.appendChild(insightsList);

  // Ask AI button (pinned to bottom, ALWAYS visible)
  const askAiFooter = document.createElement('div');
  askAiFooter.id = 'plotter-ai-footer';
  askAiFooter.style.cssText = `
    position:absolute; bottom:0; left:0; right:0; z-index:2;
    padding:6px 8px; border-top:1px solid #2a2a2a;
    background:#111;
  `;
  askAiFooter.innerHTML = `
    <button id="plotter-ai-explain-btn" style="
      width:100%; background:linear-gradient(135deg,#1a2a3a,#1a3050); border:1px solid #2a4a6a;
      border-radius:5px; color:#58A6FF; padding:7px; font-size:10px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:all 0.15s;
    ">🧠 Ask AI to Explain All Insights</button>
  `;
  askAiFooter.style.display = 'none'; // hidden until there are insights
  insightsPanel.appendChild(askAiFooter);

  // Bind Ask AI button once (persists across re-renders)
  askAiFooter.querySelector('#plotter-ai-explain-btn')?.addEventListener('click', () => {
    askAIAboutInsights();
  });

  renderInsightsPanel();
  mainContent.appendChild(insightsPanel);

  container.appendChild(mainContent);

  // Get context
  const dpr = window.devicePixelRatio || 1;
  plotCanvas.width = canvasWrapper.clientWidth * dpr || 800;
  plotCanvas.height = canvasWrapper.clientHeight * dpr || 400;
  plotCtx = plotCanvas.getContext('2d');
  if (plotCtx) plotCtx.scale(dpr, dpr);

  // Auto-start rendering (ready to receive data immediately)
  isPlotting = true;
  animFrameId = requestAnimationFrame(renderPlot);
  analysisTimer = setInterval(runSignalAnalysis, ANALYSIS_INTERVAL);

  // --- Demo Data Generator ---
  let demoStartTime = 0;

  function startDemo() {
    if (demoTimer) return;
    // Make sure plotter is running
    if (!isPlotting) {
      isPlotting = true;
      isPaused = false;
      plotStartTime = 0;
      channels.clear();
      insights.length = 0;
      updateLegend();
      renderInsightsPanel();
      animFrameId = requestAnimationFrame(renderPlot);
      if (!analysisTimer) analysisTimer = setInterval(runSignalAnalysis, ANALYSIS_INTERVAL);
    }

    demoStartTime = Date.now();
    if (statusLabel) { statusLabel.textContent = '📊 Demo Mode'; statusLabel.style.color = '#3b82f6'; }
    console.log('[PlotterAI] Demo started — 60s of simulated sensor data');

    demoTimer = setInterval(() => {
      const elapsed = (Date.now() - demoStartTime) / 1000;
      let temp: number, humidity: number, pressure: number, voltage: number, light: number;

      // Phase 1: Normal stable (0-15s)
      if (elapsed < 15) {
        temp = 24.5 + Math.random() * 1.5;
        humidity = 55 + Math.random() * 3;
        pressure = 1013 + Math.random() * 0.5;
        voltage = 3.30 + Math.random() * 0.02;
        light = 500 + Math.random() * 30;
      }
      // Phase 2: Temperature spike (15-25s)
      else if (elapsed < 25) {
        const p = (elapsed - 15) / 10;
        temp = 25 + p * 60;
        humidity = 55 + Math.random() * 3;
        pressure = 1013 + Math.random() * 0.5;
        voltage = 3.30 - p * 0.5;
        light = 500 + Math.random() * 30;
      }
      // Phase 3: Periodic oscillation (25-35s)
      else if (elapsed < 35) {
        const t = elapsed - 25;
        temp = 25 + Math.sin(t * Math.PI) * 15;
        humidity = 55 + Math.cos(t * Math.PI) * 10;
        pressure = 1013 + Math.random() * 0.5;
        voltage = 3.30 + Math.sin(t * Math.PI * 2) * 0.3;
        light = 500 + Math.sin(t * Math.PI) * 200;
      }
      // Phase 4: Correlated channels (35-45s)
      else if (elapsed < 45) {
        const base = Math.sin((elapsed - 35) * 0.8) * 20;
        temp = 25 + base;
        humidity = 55 + base * 0.8 + Math.random() * 0.5;
        pressure = 1013 - base * 0.1;
        voltage = 3.30 + Math.random() * 0.02;
        light = 500 + base * 5;
      }
      // Phase 5: Noisy signal (45-55s)
      else if (elapsed < 55) {
        temp = 25 + (Math.random() - 0.5) * 40;
        humidity = 55 + (Math.random() - 0.5) * 60;
        pressure = 1013 + Math.random() * 0.5;
        voltage = 3.30 + (Math.random() - 0.5) * 2;
        light = 500 + (Math.random() - 0.5) * 400;
      }
      // Phase 6: Flatline (55-65s)
      else if (elapsed < 65) {
        temp = 0; humidity = 0; pressure = 0; voltage = 0; light = 0;
      }
      // Loop
      else {
        demoStartTime = Date.now(); // restart cycle
        return;
      }

      const line = `temperature:${temp.toFixed(1)} | humidity:${humidity.toFixed(1)} | pressure:${pressure.toFixed(1)} | voltage:${voltage.toFixed(2)} | light:${Math.round(light)}`;
      feedPlotterLine(line);
    }, 100); // 10Hz
  }

  function stopDemo() {
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    if (statusLabel) { statusLabel.textContent = 'Waiting for data...'; statusLabel.style.color = '#555'; }
    console.log('[PlotterAI] Demo stopped');
  }

  // --- Control Methods ---
  return {
    start() {
      isPlotting = true;
      isPaused = false;
      plotStartTime = 0;
      channels.clear();
      insights.length = 0;
      updateLegend();
      renderInsightsPanel();
      animFrameId = requestAnimationFrame(renderPlot);
      // Start analysis interval
      analysisTimer = setInterval(runSignalAnalysis, ANALYSIS_INTERVAL);
    },

    stop() {
      isPlotting = false;
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      if (analysisTimer) { clearInterval(analysisTimer); analysisTimer = null; }
      // Final render
      renderPlot();
    },

    feedLine(text: string) {
      feedPlotterLine(text);
    },

    startDemo() {
      startDemo();
    },

    stopDemo() {
      stopDemo();
    },

    destroy() {
      isPlotting = false;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (analysisTimer) clearInterval(analysisTimer);
      if (demoTimer) clearInterval(demoTimer);
      demoTimer = null;
      resizeObserver.disconnect();
      container.innerHTML = '';
      channels.clear();
      insights.length = 0;
      plotCanvas = null;
      plotCtx = null;
      legendContainer = null;
      insightsPanel = null;
      statusLabel = null;
    },
  };
}

// --- Toolbar Button Helper ---

function createToolBtn(label: string, tooltip: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.title = tooltip;
  btn.style.cssText = `
    width:28px; height:28px; display:flex; align-items:center; justify-content:center;
    background:transparent; border:1px solid #333; border-radius:4px;
    color:#888; cursor:pointer; font-size:13px; font-family:inherit;
    transition:all 0.15s; padding:0;
  `;
  btn.onmouseenter = () => { btn.style.borderColor = '#555'; btn.style.color = '#D4D4D4'; btn.style.background = 'rgba(255,255,255,0.05)'; };
  btn.onmouseleave = () => { btn.style.borderColor = '#333'; btn.style.color = '#888'; btn.style.background = 'transparent'; };
  btn.onclick = onClick;
  return btn;
}

// --- Exports ---

export {
  createSerialPlotter,
  feedPlotterLine,
  parseSerialValues,
  exportCSV,
  exportPNG,
};

export type {
  PlotChannel,
  SignalInsight,
};
