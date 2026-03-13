// =============================================================================
import { callGenericAPI } from '../ide/aiAssistant/apiProviderManager';
// =============================================================================
// Serial Monitor AI Features
// =============================================================================
// Provides: Error detection, data logging, AI summary, context menu
// Integration: Called from buildSystemUI.ts serial monitor
// =============================================================================

// --- Helpers ---

function getProviderLabel(): string {
  try {
    const stored = localStorage.getItem('ai-ide-api-configuration') || localStorage.getItem('aiApiConfig');
    if (stored) {
      const config = JSON.parse(stored);
      const provider = config.provider || '';
      const model = config.model || '';
      // Format: "Provider · Model"
      const displayNames: Record<string, string> = {
        operator_x02: 'Operator X02',
        deepseek: 'DeepSeek',
        claude: 'Claude',
        openai: 'OpenAI',
        gemini: 'Gemini',
        groq: 'Groq',
        cohere: 'Cohere',
        kimi: 'Kimi',
        ollama: 'Ollama',
        custom: 'Custom',
      };
      const name = displayNames[provider] || provider;
      return model ? name + ' · ' + model : name;
    }
    return 'AI';
  } catch {
    return 'AI';
  }
}

function getTimestamp(): string {
  const now = new Date();
  const date = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  const time = String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  return date + ' ' + time;
}

// --- Data Types ---

// --- AI Toggle State Manager ---

type AIToggleMode = 'auto' | 'on' | 'off';

const AI_TOGGLE_KEY = 'serial-ai-toggle-mode';
const AUTO_OFF_DELAY = 2 * 60 * 1000; // 2 minutes of clean data before auto-off

let aiToggleMode: AIToggleMode = 'auto';
let aiAutoActive = false;  // whether Auto mode currently has AI active
let lastErrorTime = 0;
let autoOffTimer: ReturnType<typeof setTimeout> | null = null;

function loadAIToggleMode(): AIToggleMode {
  try {
    const saved = localStorage.getItem(AI_TOGGLE_KEY);
    if (saved === 'auto' || saved === 'on' || saved === 'off') return saved;
  } catch { /* ignore */ }
  return 'auto';
}

function saveAIToggleMode(mode: AIToggleMode): void {
  try { localStorage.setItem(AI_TOGGLE_KEY, mode); } catch { /* ignore */ }
}

/** Returns true if AI API calls should be allowed right now */
function isAIEnabled(): boolean {
  if (aiToggleMode === 'on') return true;
  if (aiToggleMode === 'off') return false;
  // Auto mode: active only when errors have been detected recently
  return aiAutoActive;
}

/** Called when an error/anomaly is detected — triggers auto-on */
function onErrorDetectedForToggle(): void {
  lastErrorTime = Date.now();
  if (aiToggleMode === 'auto' && !aiAutoActive) {
    aiAutoActive = true;
    updateToggleUI();
    console.log('[SerialAI] Auto-ON: Error detected, AI activated');
  }
  // Reset auto-off timer
  if (autoOffTimer) clearTimeout(autoOffTimer);
  autoOffTimer = setTimeout(() => {
    if (aiToggleMode === 'auto' && aiAutoActive) {
      aiAutoActive = false;
      updateToggleUI();
      console.log('[SerialAI] Auto-OFF: No errors for 2 minutes');
    }
  }, AUTO_OFF_DELAY);
}

/** Cycle through modes: auto → on → off → auto */
function cycleAIToggle(): void {
  if (aiToggleMode === 'auto') {
    aiToggleMode = 'on';
  } else if (aiToggleMode === 'on') {
    aiToggleMode = 'off';
  } else {
    aiToggleMode = 'auto';
    // Reset auto state based on recent errors
    aiAutoActive = (Date.now() - lastErrorTime) < AUTO_OFF_DELAY && lastErrorTime > 0;
  }
  saveAIToggleMode(aiToggleMode);
  updateToggleUI();
  updateAIBarVisibility();
  console.log('[SerialAI] Toggle mode:', aiToggleMode, '| Active:', isAIEnabled());
}

/** Update the toggle button appearance */
function updateToggleUI(): void {
  const btn = document.getElementById('serial-ai-toggle-btn');
  const dot = document.getElementById('serial-ai-toggle-dot');
  const label = document.getElementById('serial-ai-toggle-label');
  if (!btn || !dot || !label) return;

  if (aiToggleMode === 'on') {
    dot.style.background = '#22c55e';
    dot.style.boxShadow = '0 0 6px rgba(34,197,94,0.5)';
    label.textContent = 'AI ON';
    label.style.color = '#22c55e';
    btn.title = 'AI always active (click to switch to OFF)';
  } else if (aiToggleMode === 'off') {
    dot.style.background = '#555';
    dot.style.boxShadow = 'none';
    label.textContent = 'AI OFF';
    label.style.color = '#555';
    btn.title = 'AI disabled (click to switch to AUTO)';
  } else {
    // Auto mode
    if (aiAutoActive) {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 6px rgba(245,158,11,0.5)';
      label.textContent = 'AI Auto';
      label.style.color = '#f59e0b';
      btn.title = 'AI auto-activated (errors detected) — click to switch to ON';
    } else {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = 'none';
      label.textContent = 'AI Auto';
      label.style.color = '#666';
      btn.title = 'AI auto mode (waiting for errors) — click to switch to ON';
    }
  }
}

/** Show/hide or enable/disable AI bars based on toggle state */
function updateAIBarVisibility(): void {
  const enabled = isAIEnabled();

  // Update inline AI bars in Summary and Errors panels
  ['summary', 'errors'].forEach(ctx => {
    const chips = document.getElementById('serial-ai-chips-' + ctx);
    const resultArea = document.getElementById('serial-ai-result-' + ctx);
    const copyRow = document.getElementById('serial-ai-copy-row-' + ctx);

    // Find input and send button inside the inline AI bar
    const container = chips?.parentElement;
    if (!container) return;
    const input = container.querySelector('input') as HTMLInputElement;
    const sendBtn = document.getElementById('serial-ai-send-' + ctx) as HTMLButtonElement;

    if (enabled) {
      if (chips) chips.style.opacity = '1';
      if (chips) chips.style.pointerEvents = 'auto';
      if (input) { input.disabled = false; input.style.opacity = '1'; input.placeholder = ctx === 'summary' ? 'Ask about your serial data...' : 'Ask about these errors...'; }
      if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
    } else {
      if (chips) chips.style.opacity = '0.35';
      if (chips) chips.style.pointerEvents = 'none';
      if (input) { input.disabled = true; input.style.opacity = '0.35'; input.placeholder = 'AI is off — click toggle to enable'; }
      if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.35'; }
      // Keep showing existing results, just prevent new queries
      if (copyRow) copyRow.style.display = 'none';
    }
  });
}

// Initialize toggle mode from localStorage
aiToggleMode = loadAIToggleMode();

interface SerialLine {
  time: string;
  text: string;
  type: 'normal' | 'error' | 'anomaly';
  lineNum: number;
  raw: string;
}

interface DetectedIssue {
  line: SerialLine;
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions: Array<{ text: string; code: string | null }>;
}

// --- Error Detection Patterns ---

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  message: string;
  severity: 'error' | 'warning';
  suggestions: Array<{ text: string; code: string | null }>;
}> = [
  {
    pattern: /error|fail|fault|exception|panic/i,
    title: 'Error Detected',
    message: 'An error message was reported by the Arduino.',
    severity: 'error',
    suggestions: [
      { text: 'Check the error message for details', code: null },
    ],
  },
  {
    pattern: /NaN|nan|inf|-inf/,
    title: 'Invalid Sensor Value (NaN/Inf)',
    message: 'Sensor returned NaN or Infinity — usually means the sensor is disconnected or not responding.',
    severity: 'error',
    suggestions: [
      { text: 'Add validation before printing', code: 'if (!isnan(value) && !isinf(value)) { Serial.println(value); }' },
      { text: 'Check sensor wiring and power', code: null },
    ],
  },
  {
    pattern: /timeout|timed?\s*out/i,
    title: 'Communication Timeout',
    message: 'A communication timeout occurred — a sensor or module is not responding in time.',
    severity: 'error',
    suggestions: [
      { text: 'Check I2C/SPI wiring connections', code: null },
      { text: 'Add pull-up resistors (4.7K) on SDA/SCL', code: null },
      { text: 'Increase timeout duration', code: 'Wire.setTimeOut(5000); // 5 seconds' },
    ],
  },
  {
    pattern: /checksum|crc|mismatch/i,
    title: 'Checksum Mismatch',
    message: 'Data corruption detected — the received data does not match its checksum.',
    severity: 'error',
    suggestions: [
      { text: 'Add retry logic on failed reads', code: 'for(int i=0; i<3; i++) { val = sensor.read(); if(val != 0) break; delay(100); }' },
      { text: 'Shorten wire length or add pull-up resistor', code: null },
    ],
  },
  {
    pattern: /overflow|stack|heap|memory/i,
    title: 'Memory Issue',
    message: 'Possible memory overflow or stack corruption. Arduino has limited RAM.',
    severity: 'error',
    suggestions: [
      { text: 'Use F() macro for string constants', code: 'Serial.println(F("Hello")); // saves RAM' },
      { text: 'Reduce buffer sizes and global arrays', code: null },
      { text: 'Check for recursive functions', code: null },
    ],
  },
  {
    pattern: /Guru Meditation|LoadProhibited|StoreProhibited|InstrFetchProhibited/,
    title: 'ESP32 Crash (Guru Meditation)',
    message: 'ESP32 crashed due to illegal memory access. Usually a null pointer dereference or array out of bounds.',
    severity: 'error',
    suggestions: [
      { text: 'Check for null pointers before dereferencing', code: 'if (ptr != nullptr) { ptr->doSomething(); }' },
      { text: 'Validate array indices before access', code: 'if (index >= 0 && index < arraySize) { arr[index]; }' },
    ],
  },
  {
    pattern: /watchdog|wdt|rst cause/i,
    title: 'Watchdog Reset',
    message: 'The watchdog timer triggered a reset — your code is blocking for too long.',
    severity: 'error',
    suggestions: [
      { text: 'Add yield() in long loops', code: 'while(condition) { doWork(); yield(); }' },
      { text: 'Avoid delay() in loops, use millis() instead', code: null },
    ],
  },
  {
    pattern: /WARNING|WARN/,
    title: 'Warning',
    message: 'A warning was reported.',
    severity: 'warning',
    suggestions: [],
  },
];

// Anomaly detection for numeric values
const ANOMALY_PATTERNS: Array<{
  pattern: RegExp;
  check: (value: number, history: number[]) => boolean;
  title: string;
}> = [
  {
    pattern: /temp(?:erature)?[:=]\s*(-?\d+\.?\d*)/i,
    check: (val, history) => {
      if (history.length < 3) return false;
      const avg = history.slice(-5).reduce((a, b) => a + b, 0) / Math.min(history.length, 5);
      return Math.abs(val - avg) > 20; // Spike > 20 degrees from average
    },
    title: 'Temperature Spike',
  },
  {
    pattern: /humid(?:ity)?[:=]\s*(-?\d+\.?\d*)/i,
    check: (val, _) => val < 0 || val > 100,
    title: 'Invalid Humidity (out of 0-100%)',
  },
];

// --- Serial Data Logger ---

class SerialDataLogger {
  lines: SerialLine[] = [];
  issues: DetectedIssue[] = [];
  valueHistory: Map<string, number[]> = new Map();
  maxLines: number = 10000;
  lineCounter: number = 0;
  onIssueDetected: ((issue: DetectedIssue) => void) | null = null;
  onLineAdded: ((line: SerialLine) => void) | null = null;

  addLine(rawText: string): SerialLine[] {
    const splitLines = rawText.split('\n');
    const results: SerialLine[] = [];

    for (const text of splitLines) {
      const cleaned = text.replace(/\r/g, '').trim();
      if (cleaned.length === 0) continue;

      this.lineCounter++;
      const now = new Date();
      const time = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0') + ':' +
        now.getSeconds().toString().padStart(2, '0');

      const line: SerialLine = {
        time,
        text: cleaned,
        type: 'normal',
        lineNum: this.lineCounter,
        raw: text,
      };

      // Check error patterns
      for (const ep of ERROR_PATTERNS) {
        if (ep.pattern.test(cleaned)) {
          line.type = 'error';
          const issue: DetectedIssue = {
            line,
            title: ep.title,
            message: ep.message,
            severity: ep.severity,
            suggestions: ep.suggestions,
          };
          this.issues.push(issue);
          if (this.onIssueDetected) this.onIssueDetected(issue);
          onErrorDetectedForToggle();
          break;
        }
      }

      // Check anomaly patterns (numeric spike detection)
      if (line.type === 'normal') {
        for (const ap of ANOMALY_PATTERNS) {
          const match = cleaned.match(ap.pattern);
          if (match) {
            const val = parseFloat(match[1]);
            if (!isNaN(val)) {
              const key = ap.title;
              if (!this.valueHistory.has(key)) this.valueHistory.set(key, []);
              const history = this.valueHistory.get(key)!;

              if (ap.check(val, history)) {
                line.type = 'anomaly';
                const issue: DetectedIssue = {
                  line,
                  title: ap.title,
                  message: `Value ${val} is abnormal compared to recent readings (avg: ${(history.slice(-5).reduce((a, b) => a + b, 0) / Math.min(history.length, 5)).toFixed(1)}).`,
                  severity: 'warning',
                  suggestions: [
                    { text: 'Add value range checking before output', code: `if (value > MIN && value < MAX) { Serial.println(value); }` },
                    { text: 'Check sensor connections', code: null },
                  ],
                };
                this.issues.push(issue);
                if (this.onIssueDetected) this.onIssueDetected(issue);
                onErrorDetectedForToggle();
              }

              history.push(val);
              if (history.length > 100) history.splice(0, 50);
            }
          }
        }
      }

      this.lines.push(line);
      if (this.onLineAdded) this.onLineAdded(line);
      results.push(line);
    }

    // Trim old lines
    if (this.lines.length > this.maxLines) {
      this.lines.splice(0, this.lines.length - this.maxLines);
    }

    return results;
  }

  getStats(): {
    totalLines: number;
    errorCount: number;
    anomalyCount: number;
    duration: string;
    values: Map<string, { avg: number; min: number; max: number; count: number }>;
  } {
    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const anomalyCount = this.issues.filter(i => i.severity === 'warning').length;

    // Calculate duration
    let duration = '0s';
    if (this.lines.length >= 2) {
      const first = this.lines[0].time;
      const last = this.lines[this.lines.length - 1].time;
      const [h1, m1, s1] = first.split(':').map(Number);
      const [h2, m2, s2] = last.split(':').map(Number);
      const totalSec = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
      if (totalSec >= 60) {
        duration = Math.floor(totalSec / 60) + 'm ' + (totalSec % 60) + 's';
      } else {
        duration = totalSec + 's';
      }
    }

    // Aggregate numeric values
    const values = new Map<string, { avg: number; min: number; max: number; count: number }>();
    for (const [key, history] of this.valueHistory) {
      if (history.length > 0) {
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        const min = Math.min(...history);
        const max = Math.max(...history);
        values.set(key, { avg, min, max, count: history.length });
      }
    }

    return { totalLines: this.lines.length, errorCount, anomalyCount, duration, values };
  }

  clear() {
    this.lines = [];
    this.issues = [];
    this.valueHistory.clear();
    this.lineCounter = 0;
  }

  getLastNLines(n: number): string {
    return this.lines.slice(-n).map(l => `[${l.time}] ${l.text}`).join('\n');
  }

  generateAIPrompt(type: 'summary' | 'analyze' | 'selected', selectedText?: string): string {
    const stats = this.getStats();
    const lastLines = this.getLastNLines(50);
    const errorLines = this.issues.slice(-10).map(i => `[${i.line.time}] ${i.severity.toUpperCase()}: ${i.line.text}`).join('\n');

    if (type === 'selected' && selectedText) {
      return `[Serial Monitor - AI Analysis]

The user selected this text from the Arduino serial output and wants you to explain it:

"${selectedText}"

Recent serial context (last 50 lines):
${lastLines}

Please explain:
1. What this output means
2. If there are any errors or issues, explain the cause
3. Suggest code fixes if applicable
4. Keep explanations practical and Arduino-focused`;
    }

    if (type === 'analyze') {
      return `[Serial Monitor - Error Analysis]

Detected issues in Arduino serial output:

${errorLines || 'No errors detected'}

Recent output (last 50 lines):
${lastLines}

Please analyze:
1. Root cause of each error
2. Whether errors are related
3. Specific code fixes with examples
4. Prevention tips`;
    }

    // Summary
    return `[Serial Monitor - AI Session Summary]

Session Stats:
- Duration: ${stats.duration}
- Total lines: ${stats.totalLines}
- Errors: ${stats.errorCount}
- Anomalies: ${stats.anomalyCount}

Recent output (last 50 lines):
${lastLines}

${errorLines ? 'Errors detected:\n' + errorLines : 'No errors detected.'}

Please provide:
1. Summary of what the Arduino is doing
2. Analysis of sensor data trends (if any)
3. Explanation of any errors or anomalies
4. Recommendations for improvement
5. Overall health assessment`;
  }
}

// --- Global Logger Instance ---
const serialLogger = new SerialDataLogger();

// --- Send to AI Chat ---
function sendToAIChat(prompt: string): void {
  // Find the AI input textarea
  const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
  const aiInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  const input = userInput || aiInput;

  if (!input) {
    console.error('[SerialAI] No AI chat input found');
    return;
  }

  // Set the prompt
  input.value = prompt;

  // Trigger input event so frameworks detect the change
  input.dispatchEvent(new Event('input', { bubbles: true }));

  // Send the message
  setTimeout(() => {
    import('../conversation').then((module: any) => {
      module.sendMessage();
      console.log('[SerialAI] Sent to AI chat');
    }).catch((err: Error) => {
      console.error('[SerialAI] Failed to send:', err);
      // Fallback: try clicking send button
      const sendBtn = document.getElementById('send-btn') as HTMLElement;
      if (sendBtn) sendBtn.click();
    });
  }, 150);
}

// --- UI Creation Functions ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Create the tab bar for the serial monitor
function createTabBar(dialog: HTMLElement, outputEl: HTMLElement): HTMLElement {
  const tabBar = document.createElement('div');
  tabBar.id = 'serial-ai-tabs';
  tabBar.style.cssText = 'display:flex; border-bottom:1px solid #333; background:#1E1E1E; flex-shrink:0;';

  const tabs = [
    { id: 'monitor', label: 'Monitor', icon: '\u{1F4DF}' },
    { id: 'summary', label: 'AI Summary', icon: '\u{1F4CA}' },
    { id: 'errors', label: 'Errors', icon: '\u26A0\uFE0F', countFn: () => serialLogger.issues.length },
  ];

  const panels = new Map<string, HTMLElement>();

  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.id = `serial-tab-${tab.id}`;
    btn.style.cssText = `
      padding: 7px 14px; background: transparent; border: none;
      border-bottom: 2px solid transparent; color: #888; cursor: pointer;
      font-size: 12px; font-family: inherit; display: flex; align-items: center; gap: 5px;
    `;
    btn.innerHTML = `<span>${tab.icon}</span> ${tab.label}`;

    if (tab.countFn) {
      const badge = document.createElement('span');
      badge.id = `serial-tab-badge-${tab.id}`;
      badge.style.cssText = `
        background: #FF6B6B; color: #fff; font-size: 9px; font-weight: 700;
        padding: 1px 5px; border-radius: 8px; min-width: 14px; text-align: center;
        display: none;
      `;
      btn.appendChild(badge);
    }

    btn.onclick = () => {
      // Update tab styles
      tabBar.querySelectorAll('button').forEach(b => {
        (b as HTMLElement).style.borderBottomColor = 'transparent';
        (b as HTMLElement).style.color = '#888';
        (b as HTMLElement).style.background = 'transparent';
      });
      btn.style.borderBottomColor = '#569CD6';
      btn.style.color = '#D4D4D4';
      btn.style.background = '#2D2D2D';

      // Show/hide panels
      if (tab.id === 'monitor') {
        outputEl.style.display = 'block';
        panels.forEach(p => p.style.display = 'none');
      } else {
        outputEl.style.display = 'none';
        panels.forEach(p => p.style.display = 'none');
        const panel = panels.get(tab.id);
        if (panel) {
          panel.style.display = 'block';
          if (tab.id === 'summary') updateSummaryPanel(panel);
          if (tab.id === 'errors') updateErrorsPanel(panel);
        }
      }
    };

    tabBar.appendChild(btn);
  });

  // --- AI Toggle Button (pushed to right) ---
  const spacer = document.createElement('div');
  spacer.style.cssText = 'flex:1;';
  tabBar.appendChild(spacer);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'serial-ai-toggle-btn';
  toggleBtn.style.cssText = `
    display:flex; align-items:center; gap:5px; padding:4px 10px;
    background:transparent; border:1px solid #333; border-radius:12px;
    cursor:pointer; font-size:11px; font-family:inherit; margin:3px 8px;
    transition: all 0.2s; user-select:none;
  `;
  toggleBtn.onmouseenter = () => { toggleBtn.style.borderColor = '#555'; toggleBtn.style.background = 'rgba(255,255,255,0.03)'; };
  toggleBtn.onmouseleave = () => { toggleBtn.style.borderColor = '#333'; toggleBtn.style.background = 'transparent'; };
  toggleBtn.onclick = (e) => { e.stopPropagation(); cycleAIToggle(); };

  // Brain SVG icon
  const brainIcon = document.createElement('span');
  brainIcon.style.cssText = 'display:flex; align-items:center;';
  brainIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#888;">
    <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-1.38 3.02A4 4 0 0 1 16 14v0a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4v0a4 4 0 0 1 1.38-3.02A4 4 0 0 1 8 7V6a4 4 0 0 1 4-4z"/>
    <path d="M12 2v20"/>
  </svg>`;
  toggleBtn.appendChild(brainIcon);

  // Status dot
  const dot = document.createElement('span');
  dot.id = 'serial-ai-toggle-dot';
  dot.style.cssText = 'width:6px; height:6px; border-radius:50%; transition: all 0.3s;';
  toggleBtn.appendChild(dot);

  // Label
  const toggleLabel = document.createElement('span');
  toggleLabel.id = 'serial-ai-toggle-label';
  toggleLabel.style.cssText = 'font-weight:600; font-size:10px; letter-spacing:0.03em; transition: color 0.3s;';
  toggleBtn.appendChild(toggleLabel);

  tabBar.appendChild(toggleBtn);

  // Initialize toggle UI
  setTimeout(() => { updateToggleUI(); }, 0);

  // Click monitor tab by default
  const monitorTab = tabBar.querySelector('#serial-tab-monitor') as HTMLElement;
  if (monitorTab) {
    monitorTab.style.borderBottomColor = '#569CD6';
    monitorTab.style.color = '#D4D4D4';
    monitorTab.style.background = '#2D2D2D';
  }

  // Create panels
  const summaryPanel = document.createElement('div');
  summaryPanel.id = 'serial-summary-panel';
  summaryPanel.style.cssText = 'display:none; height:100%; overflow:auto; padding:16px; box-sizing:border-box;';
  panels.set('summary', summaryPanel);

  const errorsPanel = document.createElement('div');
  errorsPanel.id = 'serial-errors-panel';
  errorsPanel.style.cssText = 'display:none; height:100%; overflow:auto; padding:16px; box-sizing:border-box;';
  panels.set('errors', errorsPanel);

  // Insert panels after output
  outputEl.parentElement?.appendChild(summaryPanel);
  outputEl.parentElement?.appendChild(errorsPanel);

  return tabBar;
}

function updateErrorBadge(): void {
  const badge = document.getElementById('serial-tab-badge-errors');
  if (badge) {
    const count = serialLogger.issues.length;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

// Update the AI Summary panel
function updateSummaryPanel(panel: HTMLElement): void {
  const stats = serialLogger.getStats();

  if (serialLogger.lines.length === 0) {
    panel.innerHTML = `
      <style>@keyframes pulse2 { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.1); } }</style>
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#666;">
        <div style="font-size:36px; margin-bottom:12px; animation: pulse2 2s ease-in-out infinite;">📊</div>
        <div style="font-size:14px; font-weight:600;">No Data Yet</div>
        <div style="font-size:12px; margin-top:4px;">Start monitoring to collect serial data for AI analysis</div>
      </div>
    `;
    return;
  }

  // Show loading animation immediately
  panel.innerHTML = `
    <style>
      @keyframes spinAI { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes progressBar { from { width: 0%; } to { width: 100%; } }
      @keyframes dotPulse { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
    </style>
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:14px;">
      <div style="width:36px; height:36px; border:3px solid #2563EB; border-top-color:transparent; border-radius:50%; animation: spinAI 0.8s linear infinite;"></div>
      <div style="font-size:13px; color:#58A6FF; font-weight:600;">
        Analyzing ${stats.totalLines} lines<span style="animation: dotPulse 1.5s ease-in-out infinite;">.</span><span style="animation: dotPulse 1.5s ease-in-out 0.3s infinite;">.</span><span style="animation: dotPulse 1.5s ease-in-out 0.6s infinite;">.</span>
      </div>
      <div style="width:220px; height:3px; background:#333; border-radius:3px; overflow:hidden;">
        <div style="height:100%; background:linear-gradient(90deg,#2563EB,#3B82F6,#2563EB); background-size:200% 100%; animation: shimmer 1.5s linear infinite, progressBar 1s ease-out forwards;"></div>
      </div>
      <div style="font-size:11px; color:#555;">${stats.errorCount} errors · ${stats.anomalyCount} anomalies found</div>
    </div>
  `;

  // Show results after loading animation
  setTimeout(() => {
    renderAnalysisResults(panel, stats);
  }, 1000);
}

function renderAnalysisResults(panel: HTMLElement, stats: { totalLines: number; errorCount: number; anomalyCount: number; duration: string; values: Map<string, { avg: number; min: number; max: number; count: number }> }): void {
  let statsHTML = '';
  if (stats.values.size > 0) {
    statsHTML += '<div class="summary-card" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; margin-bottom:14px;">';
    for (const [label, v] of stats.values) {
      const range = v.max - v.min;
      const status = range > 50 ? 'warning' : 'ok';
      statsHTML += `
        <div style="background:#252526; border:1px solid ${status === 'warning' ? '#5a4a1a' : '#333'}; border-radius:6px; padding:10px 12px;">
          <div style="font-size:11px; color:#888; margin-bottom:3px; display:flex; justify-content:space-between; align-items:center;">
            ${escapeHtml(label)}
            <span style="width:8px; height:8px; border-radius:50%; background:${status === 'ok' ? '#2EA043' : '#FFD93D'};"></span>
          </div>
          <div style="font-size:18px; font-weight:700; color:${status === 'ok' ? '#4EC9B0' : '#FFD93D'};">${v.avg.toFixed(1)}</div>
          <div style="font-size:10px; color:#666; margin-top:2px;">Range: ${v.min.toFixed(1)} - ${v.max.toFixed(1)} (${v.count} readings)</div>
        </div>
      `;
    }
    statsHTML += '</div>';
  }

  let issueHTML = '';
  if (stats.errorCount > 0 || stats.anomalyCount > 0) {
    issueHTML = `
      <div class="summary-card" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
        <div style="background:rgba(255,107,107,0.08); border:1px solid rgba(255,107,107,0.2); border-radius:6px; padding:10px 12px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px; color:#FF6B6B; font-weight:700;">${stats.errorCount}</span>
          <div style="font-size:12px; font-weight:600; color:#FF6B6B;">Errors</div>
        </div>
        <div style="background:rgba(255,217,61,0.06); border:1px solid rgba(255,217,61,0.15); border-radius:6px; padding:10px 12px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px; color:#FFD93D; font-weight:700;">${stats.anomalyCount}</span>
          <div style="font-size:12px; font-weight:600; color:#FFD93D;">Anomalies</div>
        </div>
      </div>
    `;
  }

  // Generate download text
  const summaryLines: string[] = [];
  summaryLines.push('=== Serial Monitor AI Summary ===');
  summaryLines.push('Duration: ' + stats.duration);
  summaryLines.push('Total Lines: ' + stats.totalLines);
  summaryLines.push('Errors: ' + stats.errorCount + '  |  Anomalies: ' + stats.anomalyCount);
  summaryLines.push('');
  if (stats.values.size > 0) {
    summaryLines.push('-- Sensor Data --');
    for (const [label, v] of stats.values) {
      summaryLines.push('  ' + label + ': avg=' + v.avg.toFixed(2) + ', min=' + v.min.toFixed(2) + ', max=' + v.max.toFixed(2) + ' (' + v.count + ' readings)');
    }
    summaryLines.push('');
  }
  if (serialLogger.issues.length > 0) {
    summaryLines.push('-- Detected Issues --');
    for (const issue of serialLogger.issues) {
      summaryLines.push('  [' + issue.severity.toUpperCase() + '] ' + issue.title + ': ' + issue.line.text);
      summaryLines.push('    ' + issue.message);
      for (const s of issue.suggestions) {
        summaryLines.push('    -> ' + s.text + (s.code ? '  Code: ' + s.code : ''));
      }
    }
    summaryLines.push('');
  }
  summaryLines.push('-- Recent Output (last 20 lines) --');
  for (const l of serialLogger.lines.slice(-20)) {
    summaryLines.push((l.type === 'error' ? 'ERR' : l.type === 'anomaly' ? 'WRN' : '   ') + ' [' + l.time + '] ' + l.text);
  }
  const summaryText = summaryLines.join('\n');

  // Build insight
  let insightHTML = '';
  if (stats.errorCount === 0 && stats.anomalyCount === 0) {
    insightHTML = '<div style="color:#4EC9B0; font-size:13px; margin-bottom:4px;">✅ System Healthy</div><div style="color:#aaa; font-size:12px; line-height:1.6;">No errors or anomalies detected. All readings within expected ranges.</div>';
  } else {
    let details = '';
    const errorTypes = new Map<string, number>();
    serialLogger.issues.filter(i => i.severity === 'error').forEach(i => {
      errorTypes.set(i.title, (errorTypes.get(i.title) || 0) + 1);
    });
    for (const [type, count] of errorTypes) {
      details += '<div style="color:#FF6B6B; font-size:12px; margin-bottom:2px;">• ' + escapeHtml(type) + ' (x' + count + ')</div>';
    }
    if (stats.anomalyCount > 0) {
      details += '<div style="color:#FFD93D; font-size:12px; margin-bottom:2px;">• ' + stats.anomalyCount + ' anomalous reading(s)</div>';
    }
    for (const [label, v] of stats.values) {
      if ((v.max - v.min) > 20) {
        details += '<div style="color:#FFD93D; font-size:12px; margin-bottom:2px;">• ' + escapeHtml(label) + ' unstable (range: ' + (v.max - v.min).toFixed(1) + ')</div>';
      }
    }
    insightHTML = '<div style="color:#FF6B6B; font-size:13px; margin-bottom:6px;">⚠️ Issues Found</div>' + details + '<div style="color:#888; font-size:11px; margin-top:8px;">Check Errors tab for fix suggestions.</div>';
  }

  panel.innerHTML = `
    <style>
      @keyframes fadeSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      .summary-card { animation: fadeSlideIn 0.4s ease-out both; }
      .summary-card:nth-child(1) { animation-delay: 0.05s; }
      .summary-card:nth-child(2) { animation-delay: 0.15s; }
      .summary-card:nth-child(3) { animation-delay: 0.25s; }
      .summary-card:nth-child(4) { animation-delay: 0.35s; }
      .summary-card:nth-child(5) { animation-delay: 0.45s; }
      .sai-icon-btn { width:28px; height:28px; border-radius:4px; border:1px solid #3C3C3C; background:#252526; color:#aaa; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:13px; transition:all 0.15s; padding:0; position:relative; }
      .sai-icon-btn:hover { background:#3A3A3A; border-color:#58A6FF; color:#58A6FF; }
      .sai-icon-btn .sai-tooltip { display:none; position:absolute; bottom:-26px; left:50%; transform:translateX(-50%); background:#1a1a1a; border:1px solid #444; color:#ccc; font-size:10px; padding:2px 6px; border-radius:3px; white-space:nowrap; pointer-events:none; z-index:10; }
      .sai-icon-btn:hover .sai-tooltip { display:block; }
    </style>

    <div class="summary-card" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px;">📊</span>
        <span style="font-weight:600; font-size:14px;">Analysis Results</span>
        <span style="font-size:11px; color:#888;">${stats.duration} · ${stats.totalLines} lines</span>
      </div>
      <div style="display:flex; align-items:center; gap:4px;">
        <button id="serial-ai-download-btn" class="sai-icon-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="sai-tooltip">Download</span>
        </button>
        <button id="serial-ai-copy-btn" class="sai-icon-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span class="sai-tooltip">Copy</span>
        </button>
        <button id="serial-ai-chat-btn" class="sai-icon-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="sai-tooltip">AI Chat</span>
        </button>
      </div>
    </div>

    ${statsHTML}
    ${issueHTML}

    <div class="summary-card" style="background:linear-gradient(135deg,#1a2a3a,#1a3050); border:1px solid #2a4a6a; border-radius:6px; padding:14px; margin-bottom:2px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div style="font-size:12px; font-weight:600; color:#58A6FF; display:flex; align-items:center; gap:6px;">✨ AI Analysis</div>
        <div style="font-size:10px; color:#555; display:flex; align-items:center; gap:6px;">
          <span style="background:#1a2a1a; border:1px solid #2a4a2a; padding:1px 6px; border-radius:3px; color:#6ABF69;">${escapeHtml(getProviderLabel())}</span>
          <span>${getTimestamp()}</span>
        </div>
      </div>
      ${insightHTML}
    </div>

    <div id="serial-summary-status" style="font-size:11px; color:#555; text-align:center;"></div>

    <div id="serial-inline-ai-container" style="padding-top:4px; margin-top:2px;"></div>
  `;

  // Add inline AI chat bar


  document.getElementById('serial-ai-download-btn')?.addEventListener('click', () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    a.href = url;
    a.download = 'serial_summary_' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    const s = document.getElementById('serial-summary-status');
    if (s) { s.textContent = '✅ Downloaded!'; s.style.color = '#4EC9B0'; }
  });

  document.getElementById('serial-ai-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText).then(() => {
      const s = document.getElementById('serial-summary-status');
      if (s) { s.textContent = '✅ Copied!'; s.style.color = '#4EC9B0'; }
      setTimeout(() => { const el = document.getElementById('serial-summary-status'); if (el) el.textContent = ''; }, 3000);
    });
  });

  document.getElementById('serial-ai-chat-btn')?.addEventListener('click', () => {
    const prompt = serialLogger.generateAIPrompt('summary');
    sendToAIChat(prompt);
    const s = document.getElementById('serial-summary-status');
    if (s) { s.textContent = '💬 Sent to AI Chat'; s.style.color = '#58A6FF'; }
  });

  // Add inline AI bar
  const aiContainer = document.getElementById('serial-inline-ai-container');
  if (aiContainer) aiContainer.appendChild(createInlineAIBar('summary'));
}

// Inline AI query bar for Summary/Errors tabs (query → result style)
function createInlineAIBar(context: 'summary' | 'errors'): HTMLElement {
  const container = document.createElement('div');
  container.className = 'serial-ai-inline';
  container.style.cssText = 'padding-top:4px;';

  // Result area — shows AI response (replaces previous)
  const resultArea = document.createElement('div');
  resultArea.id = 'serial-ai-result-' + context;
  resultArea.style.cssText = `
    max-height: 280px; overflow-y: auto; margin-bottom: 4px;
    background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px;
    padding: 12px 14px; font-size: 12px; color: #888; line-height: 1.6;
    display: none;
  `;
  container.appendChild(resultArea);

  // Copy result button (hidden until result shown)
  const copyRow = document.createElement('div');
  copyRow.id = 'serial-ai-copy-row-' + context;
  copyRow.style.cssText = 'display:none; justify-content:flex-end; margin-bottom:4px;';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy';
  copyBtn.style.cssText = `
    background:#252526; border:1px solid #3C3C3C; border-radius:4px;
    color:#aaa; padding:3px 10px; font-size:10px; cursor:pointer;
    font-family:inherit; transition:all 0.15s;
  `;
  copyBtn.onmouseenter = () => { copyBtn.style.borderColor = '#58A6FF'; copyBtn.style.color = '#58A6FF'; };
  copyBtn.onmouseleave = () => { copyBtn.style.borderColor = '#3C3C3C'; copyBtn.style.color = '#aaa'; };
  copyBtn.onclick = () => {
    const text = resultArea.innerText || resultArea.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅ Copied';
      setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
    });
  };
  copyRow.appendChild(copyBtn);
  container.appendChild(copyRow);

  // Suggestion chips
  const chips = document.createElement('div');
  chips.id = 'serial-ai-chips-' + context;
  chips.style.cssText = 'display:flex; gap:5px; flex-wrap:wrap; margin-bottom:4px;';

  const suggestions = context === 'summary' ? [
    { label: '💡 Why no errors?', prompt: 'Why are there no errors in my serial output? Is everything running correctly?' },
    { label: '📊 What to monitor?', prompt: 'What values should I monitor and what Serial.print statements should I add?' },
    { label: '🔧 Optimize', prompt: 'How can I optimize my Arduino code based on this serial output?' },
  ] : [
    { label: '🔍 Explain errors', prompt: 'Explain why these errors are happening and what is the root cause.' },
    { label: '🔧 Fix code', prompt: 'Give me the complete code fix for all detected errors.' },
    { label: '🛡️ Prevent', prompt: 'How to prevent these errors from happening again?' },
  ];

  suggestions.forEach(s => {
    const chip = document.createElement('button');
    chip.textContent = s.label;
    chip.style.cssText = `
      background:#252526; border:1px solid #3C3C3C; border-radius:12px;
      color:#aaa; padding:4px 10px; font-size:11px; cursor:pointer;
      font-family:inherit; transition:all 0.15s; white-space:nowrap;
    `;
    chip.onmouseenter = () => { chip.style.borderColor = '#58A6FF'; chip.style.color = '#58A6FF'; };
    chip.onmouseleave = () => { chip.style.borderColor = '#3C3C3C'; chip.style.color = '#aaa'; };
    chip.onclick = () => {
      const input = container.querySelector('input') as HTMLInputElement;
      if (input) input.value = '';
      handleInlineAsk(s.prompt, context, resultArea);
    };
    chips.appendChild(chip);
  });
  container.appendChild(chips);

  // Input row
  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:flex; gap:6px; align-items:center;';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = context === 'summary' ? 'Ask about your serial data...' : 'Ask about these errors...';
  input.style.cssText = `
    flex:1; background:#1a1a1a; border:1px solid #3C3C3C; border-radius:4px;
    color:#D4D4D4; padding:7px 10px; font-size:12px; font-family:inherit;
    outline:none; transition:border-color 0.2s;
  `;
  input.onfocus = () => { input.style.borderColor = '#58A6FF'; };
  input.onblur = () => { input.style.borderColor = '#3C3C3C'; };
  input.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && input.value.trim()) {
      handleInlineAsk(input.value.trim(), context, resultArea);
      input.value = '';
    }
  };

  const sendBtn = document.createElement('button');
  sendBtn.id = 'serial-ai-send-' + context;
  sendBtn.textContent = '✨ Ask';
  sendBtn.style.cssText = `
    background:linear-gradient(135deg,#2563EB,#3B82F6); border:none;
    border-radius:4px; color:#fff; padding:7px 14px; font-size:12px;
    font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s;
  `;
  sendBtn.onmouseenter = () => { sendBtn.style.filter = 'brightness(1.15)'; };
  sendBtn.onmouseleave = () => { sendBtn.style.filter = 'none'; };
  sendBtn.onclick = () => {
    if (input.value.trim()) {
      handleInlineAsk(input.value.trim(), context, resultArea);
      input.value = '';
    }
  };

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  container.appendChild(inputRow);

  // Apply initial AI toggle state
  setTimeout(() => updateAIBarVisibility(), 50);

  return container;
}

function handleInlineAsk(question: string, context: string, resultArea: HTMLElement): void {
  // Check AI toggle
  if (!isAIEnabled()) {
    resultArea.style.display = 'block';
    resultArea.style.color = '#888';
    resultArea.style.borderColor = '#333';
    resultArea.innerHTML = `<div style="font-size:12px; color:#666; padding:4px 0;">AI is currently off. Click the <b style="color:#f59e0b;">AI Auto</b> toggle in the tab bar to enable.</div>`;
    return;
  }

  // Show result area with loading state
  resultArea.style.display = 'block';
  resultArea.style.color = '#D4D4D4';
  resultArea.style.borderColor = '#2563EB';
  resultArea.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; color:#58A6FF;">
      <div style="width:14px; height:14px; border:2px solid #58A6FF; border-top-color:transparent; border-radius:50%; animation:spinAI 0.8s linear infinite; flex-shrink:0;"></div>
      <span style="font-size:12px;">Analyzing...</span>
    </div>
  `;

  // Show copy row
  const copyRow = document.getElementById('serial-ai-copy-row-' + context);
  if (copyRow) copyRow.style.display = 'none'; // hide until result ready

  // Build context
  const stats = serialLogger.getStats();
  const lastLines = serialLogger.getLastNLines(30);
  const errorInfo = serialLogger.issues.slice(-5).map(i =>
    '[' + i.severity.toUpperCase() + '] ' + i.title + ': ' + i.line.text
  ).join('\n');

  let systemPrompt = 'You are an embedded systems expert helping debug Arduino serial output. ';
  systemPrompt += 'Keep your answer SHORT (2-4 sentences max). Give a simple, plain-text comment explaining the situation. ';
  systemPrompt += 'Do NOT include any code blocks, code snippets, or code examples. Do NOT use markdown formatting, headers, bullet points, or backticks. ';
  systemPrompt += 'If code changes are needed, just briefly mention what to change in words (e.g. "add a delay" or "check your wiring") without writing actual code. ';
  systemPrompt += 'Keep it conversational and concise like a quick tooltip message.';

  let userPrompt = 'Serial session: ' + stats.totalLines + ' lines, ' + stats.duration + ', ';
  userPrompt += stats.errorCount + ' errors, ' + stats.anomalyCount + ' anomalies.\n\n';
  if (errorInfo) userPrompt += 'Detected issues:\n' + errorInfo + '\n\n';
  userPrompt += 'Recent output:\n' + lastLines + '\n\n';
  userPrompt += 'Question: ' + question;

  // Call AI API directly
  callSerialAI(systemPrompt, userPrompt, resultArea, context);
}

async function callSerialAI(systemPrompt: string, userPrompt: string, resultArea: HTMLElement, context: string): Promise<void> {
  try {
    const fullPrompt = systemPrompt + '\n\n' + userPrompt;
    const result = await callGenericAPI(fullPrompt);

    // Strip any code blocks/backticks that AI might still include
    const cleaned = result
      .replace(/```[\s\S]*?```/g, '')       // remove fenced code blocks
      .replace(/`([^`]+)`/g, '$1')           // remove inline backticks
      .replace(/#{1,6}\s/g, '')              // remove markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1')     // remove bold markers
      .replace(/\n{3,}/g, '\n\n')            // collapse excess newlines
      .trim();

    const formatted = cleaned
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    // Render result + metadata + "Send to AI Chat" link
    const provider = escapeHtml(getProviderLabel());
    const timestamp = getTimestamp();
    resultArea.innerHTML = `
      <div style="color:#ccc; font-size:12px; line-height:1.6;">${formatted}</div>
      <div style="margin-top:8px; display:flex; align-items:center; gap:6px; font-size:10px; color:#555;">
        <span style="background:#1a2a1a; border:1px solid #2a4a2a; padding:1px 5px; border-radius:3px; color:#6ABF69; font-size:9px;">${provider}</span>
        <span>${timestamp}</span>
      </div>
      <div id="serial-ai-sendchat-${context}" style="margin-top:8px; padding-top:8px; border-top:1px solid #333; display:flex; align-items:center; gap:6px; cursor:pointer; color:#58A6FF; font-size:11px; font-weight:600; transition:color 0.15s;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Send to AI Chat for further discussion →
      </div>
    `;
    resultArea.style.borderColor = '#2a2a2a';

    // Bind "Send to AI Chat" click
    const sendChatLink = document.getElementById('serial-ai-sendchat-' + context);
    if (sendChatLink) {
      sendChatLink.onmouseenter = () => { sendChatLink.style.color = '#79B8FF'; };
      sendChatLink.onmouseleave = () => { sendChatLink.style.color = '#58A6FF'; };
      sendChatLink.onclick = () => {
        const prompt = serialLogger.generateAIPrompt(context === 'summary' ? 'summary' : context === 'errors' ? 'analyze' : 'summary');
        sendToAIChat(prompt);
        sendChatLink.innerHTML = '<span style="color:#4EC9B0;">✅ Sent to AI Chat</span>';
      };
    }

    // Show copy button
    const copyRow = document.getElementById('serial-ai-copy-row-' + context);
    if (copyRow) copyRow.style.display = 'flex';
  } catch (err: any) {
    console.error('[SerialAI] API error:', err);
    resultArea.innerHTML = '<div style="color:#FF6B6B; font-size:12px;">Error: ' + (err.message || 'AI request failed') + '</div><div style="color:#888; font-size:11px; margin-top:4px;">Check your AI provider settings.</div>';
    resultArea.style.borderColor = '#5a2a2a';
  }
}

function sendInlineQuestion(question: string, context: 'summary' | 'errors'): void {
  const resultArea = document.getElementById('serial-ai-result-' + context);
  if (resultArea) {
    handleInlineAsk(question, context, resultArea);
  } else {
    const prompt = serialLogger.generateAIPrompt(context === 'summary' ? 'summary' : 'analyze');
    sendToAIChat(prompt);
  }
}

// Update the Errors panel
function updateErrorsPanel(panel: HTMLElement): void {
  if (serialLogger.issues.length === 0) {
    panel.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#666;">
        <div style="font-size:36px; margin-bottom:12px;">✅</div>
        <div style="font-size:14px; font-weight:600;">No Errors Detected</div>
        <div style="font-size:12px; margin-top:4px;">AI is monitoring serial output for errors and anomalies</div>
        <div style="margin-top:16px; display:flex; align-items:center; gap:8px; font-size:11px; color:#6ABF69;">
          <span style="width:8px; height:8px; border-radius:50%; background:#2EA043; display:inline-block;"></span>
          Real-time monitoring active
        </div>
      </div>
    `;

  // Add inline AI chat bar
  panel.appendChild(createInlineAIBar('errors'));
    return;
  }

  let html = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px;">⚠️</span>
        <span style="font-weight:600; font-size:14px;">Auto Error Detection</span>
        <span style="background:#1a3a5c; color:#58A6FF; font-size:9px; font-weight:700; padding:2px 8px; border-radius:10px;">AI POWERED</span>
      </div>
      <button id="serial-ai-fix-all" style="
        background:#2563EB; border:none; border-radius:4px; color:#fff;
        padding:5px 12px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;
      ">✨ Ask AI to Fix All</button>
    </div>
  `;

  // Show last 20 issues (newest first)
  const recentIssues = serialLogger.issues.slice(-20).reverse();

  for (const issue of recentIssues) {
    const borderColor = issue.severity === 'error' ? '#FF6B6B' : '#FFD93D';
    const bgColor = issue.severity === 'error' ? 'rgba(255,107,107,0.08)' : 'rgba(255,217,61,0.06)';
    const icon = issue.severity === 'error' ? '🔴' : '⚠️';

    html += `
      <div style="background:#252526; border:1px solid ${bgColor}; border-left:4px solid ${borderColor}; border-radius:6px; margin-bottom:10px; overflow:hidden;">
        <div style="padding:10px 12px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between;">
            <div style="font-size:13px; font-weight:600; color:${borderColor}; margin-bottom:4px;">
              ${icon} ${escapeHtml(issue.title)}
            </div>
            <span style="font-size:10px; color:#555; white-space:nowrap; margin-left:8px;">Line ${issue.line.lineNum} · ${issue.line.time}</span>
          </div>
          <div style="font-size:11px; color:#888; margin-bottom:4px; font-family:Consolas,monospace; padding:4px 8px; background:#1a1a1a; border-radius:3px;">
            ${escapeHtml(issue.line.text)}
          </div>
          <div style="font-size:12px; color:#aaa; line-height:1.5;">
            ${escapeHtml(issue.message)}
          </div>
        </div>
    `;

    if (issue.suggestions.length > 0) {
      html += '<div style="padding:0 12px 10px; display:flex; flex-direction:column; gap:4px;">';
      for (const s of issue.suggestions) {
        html += `
          <div style="display:flex; align-items:flex-start; gap:6px; padding:5px 8px; background:#1E1E1E; border-radius:4px; border:1px solid #333;">
            <span style="color:#569CD6; font-size:11px; margin-top:1px;">→</span>
            <div style="flex:1;">
              <div style="font-size:11px; color:#ccc;">${escapeHtml(s.text)}</div>
              ${s.code ? `<div style="margin-top:3px; font-family:Consolas,monospace; font-size:11px; color:#4EC9B0; padding:3px 6px; background:#1a2a1a; border-radius:3px;">${escapeHtml(s.code)}</div>` : ''}
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    html += '</div>';
  }

  // Real-time monitoring indicator
  html += `
    <div style="margin-top:12px; padding:8px 12px; background:#1a2a1a; border:1px solid #2a4a2a; border-radius:6px; display:flex; align-items:center; gap:8px; font-size:11px; color:#6ABF69;">
      <span style="width:8px; height:8px; border-radius:50%; background:#2EA043; display:inline-block;"></span>
      AI is monitoring serial output in real-time
    </div>
  `;

  panel.innerHTML = html;

  // Bind "Fix All" button
  const fixAllBtn = document.getElementById('serial-ai-fix-all');
  if (fixAllBtn) {
    fixAllBtn.onclick = () => {
      const prompt = serialLogger.generateAIPrompt('analyze');
      sendToAIChat(prompt);
      
    };
  }
}

// Create right-click context menu
function showSerialContextMenu(x: number, y: number, selectedText: string): void {
  // Remove existing menu
  document.getElementById('serial-context-menu')?.remove();

  const menu = document.createElement('div');
  menu.id = 'serial-context-menu';
  menu.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px; z-index: 10005;
    background: #2D2D2D; border: 1px solid #454545; border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4); padding: 4px 0; min-width: 200px;
  `;

  const items = [
    { icon: '✨', label: 'Ask AI About This', color: '#58A6FF', weight: '600', action: () => {
      const prompt = serialLogger.generateAIPrompt('selected', selectedText);
      sendToAIChat(prompt);
      
    }},
    { icon: '📋', label: 'Copy Selected', color: '#ccc', weight: '400', action: () => {
      navigator.clipboard.writeText(selectedText);
    }},
    { divider: true },
    { icon: '📊', label: 'AI Summary', color: '#ccc', weight: '400', action: () => {
      const prompt = serialLogger.generateAIPrompt('summary');
      sendToAIChat(prompt);
      
    }},
    { icon: '🔍', label: 'Analyze Errors', color: '#ccc', weight: '400', action: () => {
      const prompt = serialLogger.generateAIPrompt('analyze');
      sendToAIChat(prompt);
      
    }},
  ];

  for (const item of items) {
    if ((item as any).divider) {
      const div = document.createElement('div');
      div.style.cssText = 'height:1px; background:#3C3C3C; margin:2px 0;';
      menu.appendChild(div);
      continue;
    }

    const row = document.createElement('div');
    row.style.cssText = `
      padding: 7px 14px; cursor: pointer; display: flex; align-items: center;
      gap: 8px; font-size: 12px; color: ${item.color}; font-weight: ${item.weight};
    `;
    row.innerHTML = `<span style="font-size:14px;">${item.icon}</span> ${item.label}`;
    row.onmouseenter = () => row.style.background = '#3A3A3A';
    row.onmouseleave = () => row.style.background = 'transparent';
    row.onclick = () => {
      menu.remove();
      if (item.action) item.action();
    };
    menu.appendChild(row);
  }

  document.body.appendChild(menu);

  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 50);
}

// --- Exports ---

export {
  serialLogger,
  sendToAIChat,
  createTabBar,
  updateErrorBadge,
  showSerialContextMenu,
  SerialDataLogger,
  isAIEnabled,
  cycleAIToggle,
};