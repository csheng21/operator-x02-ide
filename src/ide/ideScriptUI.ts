// src/ide/ideScriptUI.ts
// ============================================================================
// 🧠 IDE SCRIPT UI — Mode Toggle + Status Bar Log Panel
// ============================================================================
//
// Creates:
//  1. A mode selector in the status bar: [📄 Classic] [🔄 Auto]
//  2. A log panel that pops up ABOVE the mode toggle showing real-time activity
//  3. Log entries for: process start, execution, results, AI feedback, errors
//
// Listens to:
//  - 'ide-script-activity' events from ideScriptBridge
//  - 'ide-script-mode-changed' events for mode sync
//  - 'ide-script-log' custom events for two-pass feedback status
// ============================================================================

import { getIdeScriptMode, setIdeScriptMode, type IdeScriptMode, type IdeScriptCallEvent } from './ideScriptBridge';

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('ide-script-ui-styles')) return;

  const style = document.createElement('style');
  style.id = 'ide-script-ui-styles';
  style.textContent = `
    /* ── Mode Toggle (Status Bar) ── */
    .ide-script-mode-toggle {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-secondary, #1e1e2e);
      border: 1px solid var(--border-color, #333);
      border-radius: 4px;
      padding: 1px 1px;
      font-size: 11px;
      margin-left: 4px; margin-right: 4px;
      user-select: none;
      position: relative;
    }
    .ide-script-mode-btn {
      padding: 1px 5px;
      border: none;
      background: transparent;
      color: var(--text-secondary, #888);
      cursor: pointer;
      border-radius: 3px;
      font-size: 11px;
      transition: all 0.15s ease;
      white-space: normal;
    }
    .ide-script-mode-btn:hover {
      background: var(--bg-hover, #2a2a3e);
      color: var(--text-primary, #ccc);
    }
    .ide-script-mode-btn.active {
      background: var(--accent-color, #4fc3f7);
      color: #000;
      font-weight: 600;
    }

    /* ── Log Panel (pops up above toggle) ── */
    .ide-script-log-panel {
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      width: 460px;
      max-height: 220px;
      background: #1a1a2e;
      border: 1px solid #4fc3f7;
      border-radius: 8px;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.5), 0 0 8px rgba(79,195,247,0.15);
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 11px;
      z-index: 10000;
      overflow-y: auto;
      animation: ideLogSlideUp 0.2s ease-out;
      display: flex;
      flex-direction: column;
    }
    .ide-script-log-panel.hidden {
      display: none; /* kept for manual close */
    }

    /* Header */
    .ide-script-log-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 10px;
      background: #12122a;
      border-bottom: 1px solid #333;
      color: #4fc3f7;
      font-weight: 600;
      font-size: 11px;
      flex-shrink: 0;
    }
    .ide-script-log-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ide-script-log-close {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      line-height: 1;
    }
    .ide-script-log-close:hover {
      color: #ef5350;
    }

    /* Spinner in header */
    .ide-script-log-spinner {
      width: 10px;
      height: 10px;
      border: 2px solid #4fc3f7;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: ideLogSpin 0.6s linear infinite;
      flex-shrink: 0;
    }

    /* Log entries container */
    .ide-script-log-entries {
      overflow-y: auto;
      max-height: 180px;
      padding: 4px 0;
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }
    .ide-script-log-entries::-webkit-scrollbar {
      width: 4px;
    }
    .ide-script-log-entries::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 2px;
    }

    /* Individual log entry */
    .ide-script-log-entry {
      padding: 3px 10px;
      color: #aaa;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      line-height: 1.4;
      animation: ideLogFadeIn 0.15s ease-out;
    }
    .ide-script-log-entry:hover {
      background: rgba(255,255,255,0.03);
    }
    .ide-script-log-time {
      color: #555;
      font-size: 10px;
      flex-shrink: 0;
      min-width: 42px;
      padding-top: 1px;
    }
    .ide-script-log-icon {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
    }
    .ide-script-log-text {
      flex: 1;
      word-break: break-word;
    }

    /* Entry types */
    .ide-script-log-entry.info { color: #aaa; }
    .ide-script-log-entry.process { color: #4fc3f7; }
    .ide-script-log-entry.success { color: #81c784; }
    .ide-script-log-entry.error { color: #ef5350; }
    .ide-script-log-entry.result { color: #ce93d8; }
    .ide-script-log-entry.feedback { color: #ffb74d; }

    /* Status dot on mode toggle */
    .ide-script-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: transparent;
      margin-left: 2px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .ide-script-status-dot.active {
      background: #4fc3f7;
      animation: ideLogPulse 1s ease-in-out infinite;
    }
    .ide-script-status-dot.done {
      background: #81c784;
      animation: none;
    }
    .ide-script-status-dot.error {
      background: #ef5350;
      animation: none;
    }

    @keyframes ideLogSlideUp {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes ideLogFadeIn {
      from { opacity: 0; transform: translateX(-4px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes ideLogSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes ideLogPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* ── Help Button ── */
    .ide-script-help-btn {
      width: 16px;
      height: 16px;
      border: 1px solid #555;
      border-radius: 50%;
      background: transparent;
      color: #888;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin-left: 3px;
      line-height: 1;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .ide-script-help-btn:hover {
      border-color: #4fc3f7;
      color: #4fc3f7;
      background: rgba(79,195,247,0.1);
    }

    /* ── Help Popup ── */
    .ide-script-help-popup {
      position: fixed;
      bottom: 32px;
      left: 10px;
      width: 380px;
      max-height: calc(100vh - 50px);
      overflow-y: auto;
      background: #1a1a2e;
      border: 1px solid #4fc3f7;
      border-radius: 8px;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.6), 0 0 10px rgba(79,195,247,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      z-index: 10001;
      animation: ideLogSlideUp 0.2s ease-out;
      color: #ccc;
    }
    .ide-script-help-popup.hidden {
      display: none;
    }
    .ide-script-help-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #12122a;
      border-bottom: 1px solid #333;
      font-weight: 600;
      color: #4fc3f7;
      font-size: 12px;
    }
    .ide-script-help-close {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
    }
    .ide-script-help-close:hover { color: #ef5350; }
    .ide-script-help-body {
      padding: 10px 12px;
      line-height: 1.5;
    }

    /* Comparison table */
    .ide-script-help-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px 0;
      font-size: 10.5px;
    }
    .ide-script-help-table th {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid #444;
      color: #4fc3f7;
      font-weight: 600;
      font-size: 11px;
    }
    .ide-script-help-table td {
      padding: 3px 6px;
      border-bottom: 1px solid #222;
      vertical-align: top;
    }
    .ide-script-help-table tr:last-child td {
      border-bottom: none;
    }
    .ide-script-help-table td:first-child {
      color: #aaa;
      font-weight: 500;
      width: 95px;
    }
    .ide-script-help-table .col-classic { color: #ef9a9a; }
    .ide-script-help-table .col-auto { color: #a5d6a7; }
    .ide-script-help-tip {
      margin-top: 8px;
      padding: 6px 8px;
      background: rgba(79,195,247,0.08);
      border-radius: 4px;
      font-size: 10.5px;
      color: #999;
      line-height: 1.5;
    }
    .ide-script-help-tip strong {
      color: #ccc;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// COMMAND DISPLAY NAMES & ICONS
// ============================================================================

const COMMAND_META: Record<string, { icon: string; label: string }> = {
  ide_analyse:       { icon: '🧠', label: 'Analysing' },
  ide_review:        { icon: '🔍', label: 'Reviewing' },
  ide_search:        { icon: '🔎', label: 'Searching' },
  ide_patch:         { icon: '🩹', label: 'Patching' },
  ide_patch_batch:   { icon: '🩹', label: 'Batch Patching' },
  ide_insert:        { icon: '📥', label: 'Inserting' },
  ide_rollback:      { icon: '↩️', label: 'Rolling Back' },
  ide_script_status: { icon: '📊', label: 'Checking Status' },
  // v2 commands
  ide_create_file:   { icon: '📄', label: 'Creating File' },
  ide_create_folder: { icon: '📁', label: 'Creating Folder' },
  ide_delete:        { icon: '🗑️', label: 'Deleting' },
  ide_rename:        { icon: '✏️', label: 'Renaming' },
  ide_read_file:     { icon: '📖', label: 'Reading File' },
};

// ============================================================================
// MODE TOGGLE
// ============================================================================

function createModeToggle(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ide-script-mode-toggle';
  container.id = 'ide-script-mode-toggle';
  container.title = 'AI Edit Mode: How the AI modifies your code';

  // Status dot (shows activity)
  const dot = document.createElement('div');
  dot.className = 'ide-script-status-dot';
  dot.id = 'ide-script-status-dot';
  container.appendChild(dot);

  const modes: { mode: IdeScriptMode; icon: string; label: string; title: string }[] = [
    { mode: 'classic',  icon: '📄', label: 'Classic',  title: 'AI returns full file replacement (safe, simple)' },
    { mode: 'auto',     icon: '🔄', label: 'Auto',     title: 'AI decides based on task complexity' },
  ];

  const currentMode = getIdeScriptMode();

  // Create log panel (hidden initially)
  const logPanel = createLogPanel();

  // Help popup (created early so mode buttons can reference it)
  const helpPopup = createHelpPopup();

  // Help button (?)
  const helpBtn = document.createElement('button');
  helpBtn.className = 'ide-script-help-btn';
  helpBtn.textContent = '?';
  helpBtn.title = 'Learn about Classic vs Auto mode';

  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    helpPopup.classList.toggle('hidden');
    if (!helpPopup.classList.contains('hidden') && logPanelEl) {
      logPanelEl.classList.add('hidden');
    }
  });

  modes.forEach(({ mode, icon, label, title }) => {
    const btn = document.createElement('button');
    btn.className = `ide-script-mode-btn ${mode === currentMode ? 'active' : ''}`;
    btn.textContent = `${icon} ${label}`;
    btn.title = title;
    btn.dataset.mode = mode;
    btn.addEventListener('click', () => {
      const prevMode = getIdeScriptMode();
      setIdeScriptMode(mode);
      container.querySelectorAll('.ide-script-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Show help popup when switching modes (so user sees the difference)
      if (prevMode !== mode) {
        helpPopup.classList.remove('hidden');
        if (logPanelEl) logPanelEl.classList.add('hidden');
      }
    });
    container.appendChild(btn);
  });

  // Append log panel, help button, help popup in order
  container.appendChild(logPanel);
  container.appendChild(helpBtn);
  container.appendChild(helpPopup);

  // Listen for external mode changes
  window.addEventListener('ide-script-mode-changed', ((e: CustomEvent) => {
    const newMode = e.detail?.mode;
    container.querySelectorAll('.ide-script-mode-btn').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.mode === newMode);
    });
  }) as EventListener);

  return container;
}

// ============================================================================
// HELP POPUP
// ============================================================================

function createHelpPopup(): HTMLElement {
  const popup = document.createElement('div');
  popup.className = 'ide-script-help-popup hidden';
  popup.id = 'ide-script-help-popup';

  // Header
  const header = document.createElement('div');
  header.className = 'ide-script-help-header';
  header.innerHTML = '<span>Classic vs Auto Mode</span>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'ide-script-help-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.add('hidden');
  });
  header.appendChild(closeBtn);
  popup.appendChild(header);

  // Body with comparison table
  const body = document.createElement('div');
  body.className = 'ide-script-help-body';
  body.innerHTML = `
    <table class="ide-script-help-table">
      <tr>
        <th></th>
        <th>📄 Classic</th>
        <th>🔄 Auto</th>
      </tr>
      <tr>
        <td>Precision</td>
        <td class="col-classic">Replaces entire file</td>
        <td class="col-auto">Changes only needed lines</td>
      </tr>
      <tr>
        <td>Safety</td>
        <td class="col-classic">⚠️ Can destroy code</td>
        <td class="col-auto">✅ Minimal risk (surgical)</td>
      </tr>
      <tr>
        <td>AI sees code</td>
        <td class="col-classic">❌ Guesses</td>
        <td class="col-auto">✅ Reads actual file first</td>
      </tr>
      <tr>
        <td>New files</td>
        <td class="col-classic">Code block, manual copy</td>
        <td class="col-auto">✅ Creates on disk directly</td>
      </tr>
      <tr>
        <td>Multi-file</td>
        <td class="col-classic">One at a time</td>
        <td class="col-auto">✅ Atomic batch</td>
      </tr>
      <tr>
        <td>Backup</td>
        <td class="col-classic">Via Surgical Engine</td>
        <td class="col-auto">✅ Built-in per command</td>
      </tr>
      <tr>
        <td>Speed</td>
        <td class="col-classic">⚡ Faster (one big replace)</td>
        <td class="col-auto">Slightly slower (read→patch)</td>
      </tr>
    </table>
    <div class="ide-script-help-tip">
      <strong>Use Classic</strong> when the AI provider doesn't follow ide_script instructions well, or you want full file code blocks to review manually.<br>
      <strong>Use Auto</strong> for everything else — it's safer, smarter, and can read, create, edit, rename, and delete files directly.
    </div>
  `;
  popup.appendChild(body);

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target as Node) && !(e.target as Element)?.classList?.contains('ide-script-help-btn') && !(e.target as Element)?.classList?.contains('ide-script-mode-btn')) {
      popup.classList.add('hidden');
    }
  });

  return popup;
}

// ============================================================================
// LOG PANEL
// ============================================================================

let logPanelEl: HTMLElement | null = null;
let logEntries: HTMLElement | null = null;
let logHideTimer: ReturnType<typeof setTimeout> | null = null;
let isLogActive = false;

function createLogPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'ide-script-log-panel hidden';
  panel.id = 'ide-script-log-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'ide-script-log-header';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'ide-script-log-header-left';
  const modeLabel = getIdeScriptMode() === 'auto' ? '🔄 Auto Mode' : '📄 Classic Mode';
  headerLeft.innerHTML = '<div class="ide-script-log-spinner" id="ide-script-log-spinner" style="display:none"></div><span id="ide-script-log-title">🧠 ' + modeLabel + ' Active</span>';

  // Update header when mode changes
  window.addEventListener('ide-script-mode-changed', ((e: CustomEvent) => {
    const titleEl = document.getElementById('ide-script-log-title');
    if (titleEl) {
      const newLabel = e.detail?.mode === 'auto' ? '🔄 Auto Mode' : '📄 Classic Mode';
      titleEl.textContent = '🧠 ' + newLabel + ' Active';
    }
  }) as EventListener);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ide-script-log-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close log';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideLogPanel();
  });

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Entries container
  const entries = document.createElement('div');
  entries.className = 'ide-script-log-entries';
  entries.id = 'ide-script-log-entries';
  panel.appendChild(entries);

  logPanelEl = panel;
  logEntries = entries;

  return panel;
}

function showLogPanel(): void {
  if (!logPanelEl) return;
  if (logHideTimer) { clearTimeout(logHideTimer); logHideTimer = null; }
  logPanelEl.classList.remove('hidden');
  isLogActive = true;
  setStatusDot('active');
}

function hideLogPanel(): void {
  if (!logPanelEl) return;
  logPanelEl.classList.add('hidden');
  isLogActive = false;
  if (logHideTimer) { clearTimeout(logHideTimer); logHideTimer = null; }
}

function setStatusDot(state: 'active' | 'done' | 'error' | 'off'): void {
  const dot = document.getElementById('ide-script-status-dot');
  if (!dot) return;
  dot.className = 'ide-script-status-dot';
  if (state !== 'off') dot.classList.add(state);
}

function setSpinner(visible: boolean): void {
  const spinner = document.getElementById('ide-script-log-spinner');
  if (spinner) spinner.style.display = visible ? 'block' : 'none';
}

function addLogEntry(
  type: 'info' | 'process' | 'success' | 'error' | 'result' | 'feedback',
  icon: string,
  text: string
): void {
  if (!logEntries) return;

  const entry = document.createElement('div');
  entry.className = `ide-script-log-entry ${type}`;

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  entry.innerHTML = `
    <span class="ide-script-log-time">${time}</span>
    <span class="ide-script-log-icon">${icon}</span>
    <span class="ide-script-log-text">${text}</span>
  `;

    // Auto-show panel when commands execute
    if (logPanelEl && logPanelEl.classList.contains("hidden")) {
      logPanelEl.classList.remove("hidden");
    }
  logEntries.appendChild(entry);

  // Auto-scroll to bottom
  logEntries.scrollTop = logEntries.scrollHeight;
}

function clearLogEntries(): void {
  if (logEntries) logEntries.innerHTML = '';
}

// ============================================================================
// ACTIVITY HANDLER — Drives the log panel
// ============================================================================

function showActivity(event: IdeScriptCallEvent): void {
  // Auto-show panel with proper styling, auto-hide after 15 seconds
  const lp = document.querySelector(".ide-script-log-panel") as HTMLElement;
  if (lp) {
    lp.classList.remove("hidden");
    lp.style.display = "flex";
    lp.style.flexDirection = "column";
    lp.style.minHeight = "120px";
    lp.style.maxHeight = "220px";
    lp.style.position = "absolute";
    lp.style.bottom = "100%";
    lp.style.left = "0";
    lp.style.width = "460px";
    lp.style.zIndex = "9999";
    lp.style.background = "#1a1a2e";
    lp.style.border = "1px solid #4fc3f7";
    lp.style.borderRadius = "8px 8px 0 0";
    // Style entries container
    const entriesEl = lp.querySelector(".ide-script-log-entries") as HTMLElement;
    if (entriesEl) {
      entriesEl.style.flex = "1";
      entriesEl.style.minHeight = "80px";
      entriesEl.style.overflowY = "auto";
      entriesEl.style.display = "block";
      entriesEl.style.padding = "4px 8px";
      // Style each entry for visibility
      entriesEl.querySelectorAll(".ide-script-log-entry").forEach((el: any) => {
        el.style.display = "flex";
        el.style.gap = "6px";
        el.style.padding = "2px 0";
        el.style.color = "#e0e0e0";
        el.style.fontSize = "12px";
        el.querySelectorAll("span").forEach((s: any) => { if (!s.style.color) s.style.color = "#e0e0e0"; });
      });
    }
    // Clear existing auto-hide timer
    if ((window as any).__ideScriptAutoHideTimer) {
      clearTimeout((window as any).__ideScriptAutoHideTimer);
    }
    // Auto-hide after 15 seconds of no activity
    (window as any).__ideScriptAutoHideTimer = setTimeout(() => {
      if (lp) {
        lp.classList.add("hidden");
        lp.style.display = "none";
      }
    }, 15000);
  }
  const meta = COMMAND_META[event.command] || { icon: '⚙️', label: event.command };

  if (logHideTimer) { clearTimeout(logHideTimer); logHideTimer = null; }

  if (event.status === 'started') {
    // New command starting — show panel, clear old entries if fresh session
    if (!isLogActive) {
      clearLogEntries();
    }
    showLogPanel();
    setSpinner(true);

    // Extract detail
    let detail = '';
    if (event.args.file_path) {
      const parts = event.args.file_path.split(/[/\\]/);
      detail = parts[parts.length - 1] || event.args.file_path;
    } else if (event.args.folder_path) {
      const parts = event.args.folder_path.split(/[/\\]/);
      detail = parts[parts.length - 1] || event.args.folder_path;
    } else if (event.args.target_path) {
      const parts = event.args.target_path.split(/[/\\]/);
      detail = parts[parts.length - 1] || event.args.target_path;
    } else if (event.args.old_path) {
      const parts = event.args.old_path.split(/[/\\]/);
      detail = parts[parts.length - 1] || event.args.old_path;
    } else if (event.args.pattern) {
      detail = `"${event.args.pattern}"`;
    }

    addLogEntry('process', meta.icon, `${meta.label}${detail ? ': ' + detail : ''}...`);

  } else if (event.status === 'completed') {
    const duration = event.durationMs ? ` (${event.durationMs}ms)` : '';
    let resultText = '';

    if (event.command === 'ide_patch' && event.result) {
      const r = event.result as any;
      resultText = r.success
        ? `Patched: -${r.lines_removed} +${r.lines_added} lines`
        : `Patch failed: ${r.error || 'unknown'}`;
    } else if (event.command === 'ide_search' && event.result) {
      resultText = `Found ${(event.result as any).total_matches} matches`;
    } else if (event.command === 'ide_analyse' && event.result) {
      const r = event.result as any;
      resultText = `${r.language} | ${r.total_lines} lines | ${r.functions?.length || 0} funcs | ${r.classes?.length || 0} classes`;
    } else if (event.command === 'ide_review' && event.result) {
      const r = event.result as any;
      resultText = `${r.total_issues} issues found`;
    } else if (event.command === 'ide_insert' && event.result) {
      const r = event.result as any;
      resultText = r.success ? `${r.lines_inserted} lines inserted` : `Insert failed`;
    } else if (event.command === 'ide_rollback' && event.result) {
      const r = event.result as any;
      resultText = r.success ? `Restored ${r.lines_restored} lines` : `Rollback failed`;
    // ── v2 commands ──
    } else if (event.command === 'ide_create_file' && event.result) {
      const r = event.result as any;
      resultText = r.success
        ? (r.created_new ? `Created: ${r.bytes_written} bytes` : `Overwritten: ${r.bytes_written} bytes`)
        : `Create failed: ${r.error || 'unknown'}`;
    } else if (event.command === 'ide_create_folder' && event.result) {
      const r = event.result as any;
      resultText = r.success
        ? (r.created_new ? 'Folder created' : 'Folder already exists')
        : `Create failed: ${r.error || 'unknown'}`;
    } else if (event.command === 'ide_delete' && event.result) {
      const r = event.result as any;
      resultText = r.success
        ? (r.was_file ? `File deleted (backup: ${r.backup_id})` : `Deleted ${r.items_deleted} items`)
        : `Delete failed: ${r.error || 'unknown'}`;
    } else if (event.command === 'ide_rename' && event.result) {
      const r = event.result as any;
      const name = r.new_path?.split(/[/\\]/).pop() || r.new_path;
      resultText = r.success ? `Renamed to ${name}` : `Rename failed: ${r.error || 'unknown'}`;
    } else if (event.command === 'ide_read_file' && event.result) {
      const r = event.result as any;
      resultText = r.success ? `Read ${r.total_lines} lines (${r.file_size_bytes} bytes)` : `Read failed: ${r.error || 'unknown'}`;
    } else {
      resultText = 'Completed';
    }

    addLogEntry('result', '📋', `${resultText}${duration}`);
    setSpinner(false);

    // Don't auto-hide yet — wait for feedback phase or timeout
    logHideTimer = setTimeout(() => {
      setStatusDot('done');
      logHideTimer = setTimeout(() => {
        hideLogPanel();
        setStatusDot('off');
      }, 6000);
    }, 1000);

  } else if (event.status === 'failed') {
    addLogEntry('error', '❌', `${meta.label} failed: ${event.error || 'Unknown error'}`);
    setSpinner(false);
    setStatusDot('error');

    logHideTimer = setTimeout(() => {
      hideLogPanel();
      setStatusDot('off');
    }, 8000);
  }
}

// ============================================================================
// CUSTOM LOG EVENTS — For two-pass feedback and other stages
// ============================================================================

function handleCustomLog(e: CustomEvent): void {
  const { type, icon, text } = e.detail || {};
  if (!type || !text) return;

  // Show panel if not already visible
  if (!isLogActive) {
    clearLogEntries();
    showLogPanel();
  }

  // Clear any pending hide timer
  if (logHideTimer) { clearTimeout(logHideTimer); logHideTimer = null; }

  if (type === 'feedback-start') {
    setSpinner(true);
    addLogEntry('feedback', icon || '🤖', text);
  } else if (type === 'feedback-done') {
    setSpinner(false);
    addLogEntry('success', icon || '✅', text);
    setStatusDot('done');
    logHideTimer = setTimeout(() => {
      hideLogPanel();
      setStatusDot('off');
    }, 6000);
  } else if (type === 'feedback-error') {
    setSpinner(false);
    addLogEntry('error', icon || '⚠️', text);
    setStatusDot('error');
    logHideTimer = setTimeout(() => {
      hideLogPanel();
      setStatusDot('off');
    }, 8000);
  } else {
    addLogEntry(type, icon || 'ℹ️', text);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initIdeScriptUI(): void {
  injectStyles();

  // Listen for script activity events (from ideScriptBridge)
  window.addEventListener('ide-script-activity', ((e: CustomEvent<IdeScriptCallEvent>) => {
    showActivity(e.detail);
  }) as EventListener);

  // Listen for custom log events (from main.ts two-pass feedback)
  window.addEventListener('ide-script-log', ((e: CustomEvent) => {
    handleCustomLog(e);
  }) as EventListener);

  // Insert mode toggle into status bar (with retry until DOM is ready)
  let retryCount = 0;
  const maxRetries = 20; // Try for up to 40 seconds
  const tryInsert = () => {
    if (document.getElementById('ide-script-mode-toggle')) return; // Already present
    retryCount++;
    const bottomBar = document.querySelector('.bottom-bar, .status-bar, #status-bar, footer');
    if (bottomBar) {
      insertModeToggleIntoStatusBar();
      console.log(`🧠 [IDE Script UI] Toggle inserted (attempt ${retryCount})`);
      return;
    }
    if (retryCount < maxRetries) {
      setTimeout(tryInsert, 2000);
    } else {
      console.warn('🧠 [IDE Script UI] Could not find status bar after 20 attempts, using fixed position');
      insertModeToggleIntoStatusBar(); // Will use fixed position fallback
    }
  };
  setTimeout(tryInsert, 1500);

  // Watchdog: re-insert if toggle gets removed (HMR, DOM rebuild)
  const watchdog = setInterval(() => {
    if (!document.getElementById('ide-script-mode-toggle')) {
      console.log('🧠 [IDE Script UI] Toggle missing, re-inserting...');
      insertModeToggleIntoStatusBar();
    }
  }, 8000);

  // Expose log API to window for main.ts to use
  (window as any).ideScriptLog = {
    add: (type: string, icon: string, text: string) => {
      window.dispatchEvent(new CustomEvent('ide-script-log', {
        detail: { type, icon, text }
      }));
    },
    show: showLogPanel,
    hide: hideLogPanel,
    clear: clearLogEntries,
  };

  console.log('🧠 [IDE Script UI] Initialized with status bar log panel');
}

function insertModeToggleIntoStatusBar(): void {
  if (document.getElementById('ide-script-mode-toggle')) return;

  const toggle = createModeToggle();

  // Find the Surgical indicator by walking all elements in the bottom bar
  const bottomBar = document.querySelector('.bottom-bar, .status-bar, #status-bar, footer');
  if (!bottomBar) {
    toggle.style.cssText = 'position:fixed; bottom:4px; right:500px; z-index:9998;';
    if (document.body) { document.body.appendChild(toggle); }
    return;
  }

  // Walk direct children to find the one containing "Surgical"
  let surgicalParent: Element | null = null;
  const walk = (el: Element) => {
    if (surgicalParent) return;
    for (const child of el.children) {
      if (child.textContent && child.textContent.includes('Surgical')) {
        surgicalParent = child as Element;
        return;
      }
    }
    for (const child of el.children) {
      walk(child as Element);
    }
  };
  walk(bottomBar);

  if (surgicalParent && surgicalParent.parentElement) {
    surgicalParent.parentElement.insertBefore(toggle, surgicalParent);
    console.log('IDE Script UI: Toggle placed before Surgical');
  } else {
    const rightSection = bottomBar.querySelector('.status-bar-right, .statusbar-right, [class*="right"]');
    if (rightSection && rightSection.firstChild) {
      rightSection.insertBefore(toggle, rightSection.firstChild);
    } else {
      if (bottomBar) { bottomBar.appendChild(toggle); }
    }
    console.log('IDE Script UI: Toggle added to status bar');
  }
}

// ============================================================================
// EXPORTS for external access
// ============================================================================

export { createModeToggle };