/**
 * surgicalEditUI.ts — Surgical Edit Engine User-Facing UI
 * 
 * Design B: Detailed Panel (status bar with hover tooltip)
 * Line Highlight: Purple Pulse (Monaco editor decoration)
 * 
 * Usage in main.ts:
 *   import { initSurgicalEditUI } from './ide/surgicalEditUI';
 *   // After surgical bridge init:
 *   initSurgicalEditUI();
 */

// ─── State ───
interface EditRecord {
  file: string;
  line: number;
  description: string;
  timestamp: number;
}

let _seEnabled = true;
let _editCount = 0;
let _lastEdit: EditRecord | null = null;
let _editHistory: EditRecord[] = [];
let _statusBarEl: HTMLElement | null = null;
let _tooltipEl: HTMLElement | null = null;
let _highlightTimers: number[] = [];

// ─── CSS Injection ───
function _injectSurgicalEditCSS(): void {
  if (document.getElementById('surgical-edit-ui-styles')) return;
  const style = document.createElement('style');
  style.id = 'surgical-edit-ui-styles';
  style.textContent = `
    /* ═══ Status Bar Widget ═══ */
    .se-status-widget {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      user-select: none;
    }
    .se-status-widget.se-enabled {
      background: linear-gradient(90deg, rgba(180,142,173,0.10) 0%, transparent 100%);
      border-left: 2px solid #b48ead;
    }
    .se-status-widget.se-disabled {
      background: rgba(30,30,46,0.6);
      border-left: 2px solid #585b70;
    }
    .se-status-widget:hover {
      background: linear-gradient(90deg, rgba(180,142,173,0.18) 0%, rgba(30,30,46,0.95) 100%);
    }

    /* Dot indicator */
    .se-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    .se-enabled .se-status-dot {
      background: #a6e3a1;
      box-shadow: 0 0 6px rgba(166,227,161,0.5);
      animation: sePulse 2.5s infinite ease-in-out;
    }
    .se-disabled .se-status-dot {
      background: #f38ba8;
      box-shadow: 0 0 4px rgba(243,139,168,0.3);
      animation: none;
    }
    @keyframes sePulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(166,227,161,0.5); }
      50% { opacity: 0.6; box-shadow: 0 0 2px rgba(166,227,161,0.2); }
    }

    /* Label */
    .se-status-label {
      font-size: 11px;
      font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
      font-weight: 600;
      transition: color 0.3s;
    }
    .se-enabled .se-status-label { color: #b48ead; }
    .se-disabled .se-status-label { color: #6c7086; }

    /* Expandable details (visible on hover) */
    .se-status-details {
      display: flex;
      align-items: center;
      gap: 6px;
      max-width: 0;
      overflow: hidden;
      transition: max-width 0.35s ease, opacity 0.25s ease;
      opacity: 0;
      white-space: nowrap;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #9399b2;
    }
    .se-status-widget:hover .se-status-details {
      max-width: 250px;
      opacity: 1;
    }
    .se-detail-separator {
      color: #45475a;
    }
    .se-detail-count {
      color: #cba6f7;
      font-weight: 600;
    }
    .se-detail-last {
      color: #6c7086;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ═══ Hover Tooltip ═══ */
    .se-tooltip {
      position: fixed;
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 10px;
      padding: 14px 16px;
      min-width: 240px;
      max-width: 320px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(180,142,173,0.08);
      z-index: 100020;
      font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .se-tooltip.se-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: none;
    }
    .se-tooltip-title {
      font-size: 12px;
      font-weight: 700;
      color: #b48ead;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .se-tooltip-version {
      font-size: 9px;
      color: #585b70;
      background: rgba(180,142,173,0.1);
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 500;
    }
    .se-tooltip-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #9399b2;
      padding: 3px 0;
    }
    .se-tooltip-row-value {
      font-weight: 600;
    }
    .se-tooltip-row-value.se-on { color: #a6e3a1; }
    .se-tooltip-row-value.se-off { color: #f38ba8; }
    .se-tooltip-row-value.se-count { color: #cba6f7; }
    .se-tooltip-divider {
      height: 1px;
      background: #313244;
      margin: 8px 0;
    }
    .se-tooltip-last {
      font-size: 10px;
      color: #6c7086;
    }
    .se-tooltip-last-value {
      color: #cdd6f4;
      font-weight: 500;
    }
    .se-tooltip-hint {
      font-size: 9px;
      color: #45475a;
      margin-top: 10px;
      text-align: center;
    }
    .se-tooltip-history {
      margin-top: 8px;
      max-height: 100px;
      overflow-y: auto;
    }
    .se-tooltip-history-item {
      font-size: 10px;
      color: #6c7086;
      padding: 3px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .se-tooltip-history-item .se-h-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #b48ead;
      flex-shrink: 0;
    }
    .se-tooltip-history-item .se-h-file {
      color: #cdd6f4;
      font-weight: 500;
    }
    .se-tooltip-history-item .se-h-line {
      color: #9399b2;
    }
    .se-tooltip-history-item .se-h-time {
      color: #45475a;
      margin-left: auto;
      flex-shrink: 0;
    }

    /* === Surgical Dialog Overlay === */
    .se-dialog-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      z-index: 100060;
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .se-dialog-overlay.se-show { opacity: 1; }

    .se-dialog {
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 14px;
      padding: 0;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(180,142,173,0.08);
      transform: scale(0.95) translateY(8px);
      transition: transform 0.25s ease, opacity 0.25s ease;
      opacity: 0;
      overflow: hidden;
    }
    .se-dialog-overlay.se-show .se-dialog {
      transform: scale(1) translateY(0);
      opacity: 1;
    }

    .se-dialog-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #313244;
    }
    .se-dialog-title {
      font-size: 14px; font-weight: 700; color: #b48ead;
      font-family: 'JetBrains Mono', monospace;
      display: flex; align-items: center; gap: 8px;
    }
    .se-dialog-version {
      font-size: 9px; color: #585b70;
      background: rgba(180,142,173,0.12);
      padding: 2px 7px; border-radius: 4px;
    }
    .se-dialog-close {
      width: 28px; height: 28px;
      background: transparent; border: none;
      color: #585b70; font-size: 16px;
      cursor: pointer; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .se-dialog-close:hover { background: #313244; color: #f38ba8; }

    .se-dialog-body { padding: 16px 20px; }

    .se-dialog-status {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px;
      background: rgba(30,30,46,0.6);
      border-radius: 8px;
      margin-bottom: 14px;
    }
    .se-dialog-status-label {
      font-size: 11px; color: #9399b2;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-status-value {
      font-size: 12px; font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-status-on { color: #a6e3a1; }
    .se-dialog-status-off { color: #f38ba8; }

    .se-dialog-stats {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; margin-bottom: 14px;
    }
    .se-dialog-stat {
      padding: 10px 12px;
      background: rgba(30,30,46,0.4);
      border-radius: 8px;
      border: 1px solid #313244;
    }
    .se-dialog-stat-num {
      font-size: 18px; font-weight: 700;
      color: #cba6f7;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-stat-label {
      font-size: 9px; color: #585b70;
      margin-top: 2px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .se-dialog-features { margin: 14px 0; }
    .se-dialog-feat {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0;
      font-size: 11px; color: #9399b2;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-feat-icon { width: 20px; text-align: center; flex-shrink: 0; }
    .se-dialog-feat-text { color: #cdd6f4; }

    .se-dialog-divider { height: 1px; background: #313244; margin: 14px 0; }

    .se-dialog-footer {
      padding: 12px 20px 16px;
      display: flex; gap: 10px; justify-content: flex-end;
      border-top: 1px solid #313244;
    }
    .se-dialog-btn {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 11px; font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      border: 1px solid #313244;
      transition: all 0.15s;
    }
    .se-dialog-btn-close { background: #313244; color: #cdd6f4; }
    .se-dialog-btn-close:hover { background: #45475a; }
    .se-dialog-btn-disable {
      background: rgba(243,139,168,0.1); color: #f38ba8;
      border-color: rgba(243,139,168,0.25);
    }
    .se-dialog-btn-disable:hover { background: rgba(243,139,168,0.2); }
    .se-dialog-btn-enable {
      background: rgba(166,227,161,0.1); color: #a6e3a1;
      border-color: rgba(166,227,161,0.25);
    }
    .se-dialog-btn-enable:hover { background: rgba(166,227,161,0.2); }

    /* === Confirm Dialog === */
    .se-confirm-subtitle {
      font-size: 11px; color: #9399b2;
      margin-bottom: 16px;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-compare-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      border-radius: 8px; overflow: hidden;
      border: 1px solid #313244; margin-bottom: 16px;
    }
    .se-compare-table th {
      font-size: 10px; font-weight: 700; padding: 8px 12px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .se-compare-table th:first-child { background: transparent; color: #585b70; text-align: left; }
    .se-compare-table .se-th-on { background: rgba(166,227,161,0.08); color: #a6e3a1; text-align: center; }
    .se-compare-table .se-th-off { background: rgba(243,139,168,0.08); color: #f38ba8; text-align: center; }
    .se-compare-table td {
      font-size: 11px; padding: 7px 12px;
      border-top: 1px solid #313244;
      font-family: 'JetBrains Mono', monospace; color: #9399b2;
    }
    .se-compare-table td:first-child { color: #cdd6f4; }
    .se-compare-table td:nth-child(2) { text-align: center; color: #a6e3a1; }
    .se-compare-table td:nth-child(3) { text-align: center; color: #f38ba8; }

    .se-risk-box {
      padding: 12px 14px;
      background: rgba(243,139,168,0.06);
      border: 1px solid rgba(243,139,168,0.15);
      border-radius: 8px; margin-bottom: 16px;
    }
    .se-risk-title {
      font-size: 11px; font-weight: 700; color: #f38ba8;
      margin-bottom: 6px; font-family: 'JetBrains Mono', monospace;
    }
    .se-risk-item {
      font-size: 10px; color: #9399b2; padding: 2px 0;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-btn-danger {
      background: rgba(243,139,168,0.15); color: #f38ba8;
      border-color: rgba(243,139,168,0.3);
    }
    .se-dialog-btn-danger:hover { background: rgba(243,139,168,0.3); }
    .se-dialog-btn-cancel { background: #313244; color: #cdd6f4; }
    .se-dialog-btn-cancel:hover { background: #45475a; }

    .se-dialog-history-list { max-height: 120px; overflow-y: auto; }
    .se-dialog-history-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0; font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
    }
    .se-dialog-history-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: #b48ead; flex-shrink: 0;
    }
    .se-dialog-history-file { color: #cdd6f4; font-weight: 500; }
    .se-dialog-history-line { color: #9399b2; }
    .se-dialog-history-time { color: #45475a; margin-left: auto; }


    /* ═══ Purple Pulse Line Highlight ═══ */
    .se-line-highlight {
      background: rgba(180,142,173,0.18) !important;
      border-left: 3px solid rgba(180,142,173,0.6) !important;
      animation: sePurplePulse 2s ease-out forwards !important;
    }
    .se-line-highlight-glyph {
      background: rgba(180,142,173,0.25) !important;
    }
    @keyframes sePurplePulse {
      0% {
        background: rgba(180,142,173,0.30);
        border-left-color: rgba(180,142,173,0.9);
      }
      30% {
        background: rgba(180,142,173,0.20);
        border-left-color: rgba(180,142,173,0.7);
      }
      100% {
        background: rgba(180,142,173,0.05);
        border-left-color: rgba(180,142,173,0.15);
      }
    }

    /* Gutter icon for edited lines */
    .se-gutter-icon {
      display: inline-block;
      width: 14px;
      height: 14px;
      margin-left: 2px;
    }
    .se-gutter-icon::after {
      content: '🔬';
      font-size: 10px;
    }

    /* ═══ Toast notification for edits ═══ */
    .se-toast {
      position: fixed;
      bottom: 40px;
      right: 16px;
      background: #1e1e2e;
      border: 1px solid rgba(180,142,173,0.25);
      border-left: 3px solid #b48ead;
      border-radius: 8px;
      padding: 10px 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #cdd6f4;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 100015;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(8px) translateX(8px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .se-toast.se-toast-show {
      opacity: 1;
      transform: translateY(0) translateX(0);
      pointer-events: auto;
    }
    .se-toast-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .se-toast-text {
      flex: 1;
    }
    .se-toast-file {
      color: #b48ead;
      font-weight: 600;
    }
    .se-toast-detail {
      color: #9399b2;
      font-size: 10px;
    }
  `;
  if (document.head) { document.head.appendChild(style) };
}


// ─── Status Bar Widget ───
function _createStatusBarWidget(): HTMLElement {
  const widget = document.createElement('div');
  widget.className = 'se-status-widget se-enabled';
  widget.id = 'se-status-widget';

  widget.innerHTML = `
    <div class="se-status-dot"></div>
    <span style="font-size: 13px; flex-shrink: 0;">🔬</span>
    <span class="se-status-label">Surgical</span>
    <div class="se-status-details">
      <span class="se-detail-separator">·</span>
      <span class="se-detail-count" id="se-edit-count">0 edits</span>
      <span class="se-detail-separator">·</span>
      <span class="se-detail-last" id="se-last-edit">—</span>
    </div>
  `;

  // Click to show info dialog
  widget.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('%c\uD83D\uDD2C [SurgicalUI] Widget clicked - opening dialog', 'color: #b48ead');
    _hideTooltip();
    _showSurgicalDialog();
  });

  // Hover tooltip
  widget.addEventListener('mouseenter', () => _showTooltip(widget));
  widget.addEventListener('mouseleave', () => _hideTooltip());

  return widget;
}


// ─── Insert Widget into Status Bar ───
function _insertIntoStatusBar(widget: HTMLElement): void {
  // Try multiple selectors for the IDE status bar
  const selectors = [
    '.status-bar',
    '.statusbar',
    '.ide-status-bar',
    '.bottom-bar',
    '[class*="status-bar"]',
    '[class*="statusbar"]',
  ];

  let statusBar: HTMLElement | null = null;
  for (const sel of selectors) {
    statusBar = document.querySelector(sel);
    if (statusBar) break;
  }

  if (statusBar) {
    // Insert at the right side of the status bar
    const rightSection = statusBar.querySelector('.status-bar-right, .statusbar-right, [class*="right"]');
    if (rightSection) {
      rightSection.insertBefore(widget, rightSection.firstChild);
    } else {
      if (statusBar) { statusBar.appendChild(widget) };
    }
    console.log('%c🔬 [SurgicalUI] Status bar widget inserted', 'color: #b48ead');
    return;
  }

  // Fallback: create a floating status bar widget at bottom-right
  console.log('%c🔬 [SurgicalUI] No status bar found, creating floating widget', 'color: #b48ead');
  widget.style.position = 'fixed';
  widget.style.bottom = '4px';
  widget.style.right = '16px';
  widget.style.zIndex = '99999';
  widget.style.background = '#181825';
  widget.style.border = '1px solid #313244';
  widget.style.borderRadius = '6px';
  widget.style.padding = '0 14px';
  widget.style.height = '26px';
  if (document.body) { document.body.appendChild(widget) };
}


// ─── Update Widget Display ───
function _updateWidgetState(): void {
  const widget = document.getElementById('se-status-widget');
  if (!widget) return;

  widget.className = `se-status-widget ${_seEnabled ? 'se-enabled' : 'se-disabled'}`;

  const countEl = document.getElementById('se-edit-count');
  if (countEl) {
    countEl.textContent = `${_editCount} edit${_editCount !== 1 ? 's' : ''}`;
  }

  const lastEl = document.getElementById('se-last-edit');
  if (lastEl) {
    if (_lastEdit) {
      lastEl.textContent = `L${_lastEdit.line} ${_lastEdit.file}`;
    } else {
      lastEl.textContent = '—';
    }
  }
}


// ─── Tooltip ───
function _showTooltip(anchor: HTMLElement): void {
  _hideTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'se-tooltip';
  tooltip.id = 'se-tooltip';

  const stateText = _seEnabled
    ? '<span class="se-tooltip-row-value se-on">● Enabled</span>'
    : '<span class="se-tooltip-row-value se-off">● Disabled</span>';

  let historyHTML = '';
  if (_editHistory.length > 0) {
    const recent = _editHistory.slice(-5).reverse();
    historyHTML = `
      <div class="se-tooltip-divider"></div>
      <div style="font-size: 10px; color: #585b70; margin-bottom: 4px;">Recent edits:</div>
      <div class="se-tooltip-history">
        ${recent.map(e => `
          <div class="se-tooltip-history-item">
            <span class="se-h-dot"></span>
            <span class="se-h-file">${e.file}</span>
            <span class="se-h-line">L${e.line}</span>
            <span class="se-h-time">${_timeAgo(e.timestamp)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  tooltip.innerHTML = `
    <div class="se-tooltip-title">
      🔬 Surgical Edit Engine
      <span class="se-tooltip-version">v1.1</span>
    </div>
    <div class="se-tooltip-row">
      <span>Status</span>
      ${stateText}
    </div>
    <div class="se-tooltip-row">
      <span>Edits this session</span>
      <span class="se-tooltip-row-value se-count">${_editCount}</span>
    </div>
    ${_lastEdit ? `
      <div class="se-tooltip-divider"></div>
      <div class="se-tooltip-last">
        Last edit: <span class="se-tooltip-last-value">${_lastEdit.description}</span>
      </div>
    ` : ''}
    ${historyHTML}
    <div class="se-tooltip-hint">Click for details</div>
  `;

  if (document.body) { document.body.appendChild(tooltip) };

  // Position above the widget
  const rect = anchor.getBoundingClientRect();
  const tw = 280;
  let left = rect.left + rect.width / 2 - tw / 2;
  if (left < 8) left = 8;
  if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;

  tooltip.style.left = left + 'px';
  tooltip.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  tooltip.style.width = tw + 'px';

  // Animate in
  requestAnimationFrame(() => tooltip.classList.add('se-visible'));
  _tooltipEl = tooltip;
}

function _hideTooltip(): void {
  if (_tooltipEl) {
    _tooltipEl.classList.remove('se-visible');
    const el = _tooltipEl;
    setTimeout(() => el.remove(), 200);
    _tooltipEl = null;
  }
}


// ─── Toast Notification ───

// --- Surgical Info Dialog ---

function _closeSurgicalDialog(): void {
  const overlay = document.getElementById('se-dialog-overlay');
  if (overlay) {
    overlay.classList.remove('se-show');
    setTimeout(() => overlay.remove(), 250);
  }
}

function _showSurgicalDialog(): void {
  _closeSurgicalDialog();

  const overlay = document.createElement('div');
  overlay.className = 'se-dialog-overlay';
  overlay.id = 'se-dialog-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeSurgicalDialog();
  });

  const ico = {
    microscope: String.fromCodePoint(0x1F52C),
    shield: String.fromCodePoint(0x1F6E1, 0xFE0F),
    disk: String.fromCodePoint(0x1F4BE),
    backup: String.fromCodePoint(0x1F4C2),
    chart: String.fromCodePoint(0x1F4CA),
    eye: String.fromCodePoint(0x1F441, 0xFE0F),
    check: String.fromCodePoint(0x2705),
    x: String.fromCodePoint(0x2716),
  };

  const stateClass = _seEnabled ? 'se-dialog-status-on' : 'se-dialog-status-off';
  const stateLabel = _seEnabled
    ? String.fromCodePoint(0x25CF) + ' Enabled'
    : String.fromCodePoint(0x25CF) + ' Disabled';

  let historyHTML = '';
  if (_editHistory.length > 0) {
    const recent = _editHistory.slice(-5).reverse();
    historyHTML = '<div class="se-dialog-divider"></div>'
      + '<div style="font-size:10px;color:#585b70;margin-bottom:6px;font-family:JetBrains Mono,monospace">RECENT EDITS</div>'
      + '<div class="se-dialog-history-list">'
      + recent.map(function(e: any) {
          return '<div class="se-dialog-history-row">'
            + '<span class="se-dialog-history-dot"></span>'
            + '<span class="se-dialog-history-file">' + e.file + '</span>'
            + '<span class="se-dialog-history-line">L' + e.line + '</span>'
            + '<span class="se-dialog-history-time">' + _timeAgo(e.timestamp) + '</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  const dialog = document.createElement('div');
  dialog.className = 'se-dialog';

  dialog.innerHTML = '<div class="se-dialog-header">'
    + '<div class="se-dialog-title">' + ico.microscope + ' Surgical Edit Engine <span class="se-dialog-version">v1.2</span></div>'
    + '<button class="se-dialog-close" id="se-dialog-close">' + ico.x + '</button>'
    + '</div>'
    + '<div class="se-dialog-body">'
    + '<div class="se-dialog-status">'
    + '<span class="se-dialog-status-label">Engine Status</span>'
    + '<span class="se-dialog-status-value ' + stateClass + '">' + stateLabel + '</span>'
    + '</div>'
    + '<div class="se-dialog-stats">'
    + '<div class="se-dialog-stat"><div class="se-dialog-stat-num">' + _editCount + '</div><div class="se-dialog-stat-label">Edits this session</div></div>'
    + '<div class="se-dialog-stat"><div class="se-dialog-stat-num">' + _editHistory.length + '</div><div class="se-dialog-stat-label">Files modified</div></div>'
    + '</div>'
    + '<div class="se-dialog-divider"></div>'
    + '<div style="font-size:10px;color:#585b70;margin-bottom:6px;font-family:JetBrains Mono,monospace">ACTIVE PROTECTIONS</div>'
    + '<div class="se-dialog-features">'
    + '<div class="se-dialog-feat"><span class="se-dialog-feat-icon">' + ico.disk + '</span><span class="se-dialog-feat-text">Rust backend disk writes (crash-safe)</span></div>'
    + '<div class="se-dialog-feat"><span class="se-dialog-feat-icon">' + ico.backup + '</span><span class="se-dialog-feat-text">Automatic .bak backups before every edit</span></div>'
    + '<div class="se-dialog-feat"><span class="se-dialog-feat-icon">' + ico.shield + '</span><span class="se-dialog-feat-text">Destructive change safety guard</span></div>'
    + '<div class="se-dialog-feat"><span class="se-dialog-feat-icon">' + ico.eye + '</span><span class="se-dialog-feat-text">8-stage pipeline with real-time overlay</span></div>'
    + '<div class="se-dialog-feat"><span class="se-dialog-feat-icon">' + ico.chart + '</span><span class="se-dialog-feat-text">Full audit trail of all AI modifications</span></div>'
    + '</div>'
    + historyHTML
    + '</div>'
    + '<div class="se-dialog-footer">'
    + '<button class="se-dialog-btn se-dialog-btn-close" id="se-dialog-done">Done</button>'
    + (_seEnabled
        ? '<button class="se-dialog-btn se-dialog-btn-disable" id="se-dialog-toggle">Disable Engine</button>'
        : '<button class="se-dialog-btn se-dialog-btn-enable" id="se-dialog-toggle">Enable Engine</button>')
    + '</div>';

  if (overlay) { overlay.appendChild(dialog) };
  if (document.body) { document.body.appendChild(overlay) };
  requestAnimationFrame(function() { overlay.classList.add('se-show'); });

  document.getElementById('se-dialog-close')!.addEventListener('click', _closeSurgicalDialog);
  document.getElementById('se-dialog-done')!.addEventListener('click', _closeSurgicalDialog);

  const escHandler = function(ev: KeyboardEvent) {
    if (ev.key === 'Escape') { _closeSurgicalDialog(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  document.getElementById('se-dialog-toggle')!.addEventListener('click', function() {
    if (_seEnabled) {
      _closeSurgicalDialog();
      setTimeout(function() { _showDisableConfirmDialog(); }, 280);
    } else {
      _seEnabled = true;
      _updateWidgetState();
      const sb = (window as any).sb;
      if (sb && typeof sb.setEnabled === 'function') sb.setEnabled(true);
      _closeSurgicalDialog();
      _showToast(String.fromCodePoint(0x2705), 'Surgical Edit Engine enabled', 'All protections are now active');
    }
  });
}


function _showDisableConfirmDialog(): void {
  const overlay = document.createElement('div');
  overlay.className = 'se-dialog-overlay';
  overlay.id = 'se-dialog-overlay';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) { _closeAndReopen(); }
  });

  function _closeConfirm(): void {
    overlay.classList.remove('se-show');
    setTimeout(function() { overlay.remove(); }, 250);
  }

  function _closeAndReopen(): void {
    _closeConfirm();
    setTimeout(function() { _showSurgicalDialog(); }, 280);
  }

  const ico = {
    warning: String.fromCodePoint(0x26A0, 0xFE0F),
    check: String.fromCodePoint(0x2705),
    cross: String.fromCodePoint(0x274C),
    x: String.fromCodePoint(0x2716),
  };

  const dialog = document.createElement('div');
  dialog.className = 'se-dialog';
  dialog.style.width = '480px';

  dialog.innerHTML = '<div class="se-dialog-header">'
    + '<div class="se-dialog-title" style="color:#f38ba8">' + ico.warning + ' Disable Surgical Edit Engine?</div>'
    + '<button class="se-dialog-close" id="se-confirm-close">' + ico.x + '</button>'
    + '</div>'
    + '<div class="se-dialog-body">'
    + '<div class="se-confirm-subtitle">Disabling removes all safety protections for AI-generated code changes.</div>'
    + '<table class="se-compare-table">'
    + '<thead><tr>'
    + '<th>Feature</th>'
    + '<th class="se-th-on">' + ico.check + ' Enabled</th>'
    + '<th class="se-th-off">' + ico.cross + ' Disabled</th>'
    + '</tr></thead>'
    + '<tbody>'
    + '<tr><td>Code writes</td><td>Rust disk-level</td><td>Browser memory</td></tr>'
    + '<tr><td>Automatic backups</td><td>.bak before edit</td><td>None</td></tr>'
    + '<tr><td>Crash recovery</td><td>File persisted</td><td>Changes lost</td></tr>'
    + '<tr><td>Safety guard</td><td>Blocks truncation</td><td>No protection</td></tr>'
    + '<tr><td>Pipeline overlay</td><td>8-stage tracking</td><td>No visibility</td></tr>'
    + '<tr><td>Audit trail</td><td>Full edit history</td><td>No tracking</td></tr>'
    + '<tr><td>Line highlights</td><td>Purple indicators</td><td>No indicators</td></tr>'
    + '</tbody></table>'
    + '<div class="se-risk-box">'
    + '<div class="se-risk-title">' + ico.warning + ' Risks of Disabling</div>'
    + '<div class="se-risk-item">' + ico.cross + ' AI could overwrite entire file with partial code</div>'
    + '<div class="se-risk-item">' + ico.cross + ' No automatic backup - cannot undo AI changes</div>'
    + '<div class="se-risk-item">' + ico.cross + ' IDE crash or tab close = all unsaved AI edits lost</div>'
    + '<div class="se-risk-item">' + ico.cross + ' No visibility into what the AI changed</div>'
    + '</div>'
    + '</div>'
    + '<div class="se-dialog-footer">'
    + '<button class="se-dialog-btn se-dialog-btn-cancel" id="se-confirm-cancel">Cancel</button>'
    + '<button class="se-dialog-btn se-dialog-btn-danger" id="se-confirm-disable">I understand, disable it</button>'
    + '</div>';

  if (overlay) { overlay.appendChild(dialog) };
  if (document.body) { document.body.appendChild(overlay) };
  requestAnimationFrame(function() { overlay.classList.add('se-show'); });

  document.getElementById('se-confirm-close')!.addEventListener('click', _closeAndReopen);
  document.getElementById('se-confirm-cancel')!.addEventListener('click', _closeAndReopen);

  const escHandler = function(ev: KeyboardEvent) {
    if (ev.key === 'Escape') { _closeAndReopen(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  document.getElementById('se-confirm-disable')!.addEventListener('click', function() {
    _seEnabled = false;
    _updateWidgetState();
    const sb = (window as any).sb;
    if (sb && typeof sb.setEnabled === 'function') sb.setEnabled(false);
    _closeConfirm();
    _showToast(
      String.fromCodePoint(0x23F8, 0xFE0F),
      'Surgical Edit Engine disabled',
      'AI edits will use in-memory mode (no backup)'
    );
  });
}
let _toastTimer: number | null = null;

function _showToast(icon: string, text: string, detail: string): void {
  let toast = document.getElementById('se-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'se-toast';
    toast.id = 'se-toast';
    if (document.body) { document.body.appendChild(toast) };
  }

  toast.innerHTML = `
    <span class="se-toast-icon">${icon}</span>
    <div class="se-toast-text">
      <div>${text}</div>
      ${detail ? `<div class="se-toast-detail">${detail}</div>` : ''}
    </div>
  `;

  // Show
  if (_toastTimer) clearTimeout(_toastTimer);
  requestAnimationFrame(() => toast!.classList.add('se-toast-show'));

  // Auto-hide after 3s
  _toastTimer = window.setTimeout(() => {
    toast!.classList.remove('se-toast-show');
  }, 3000);
}


// ─── Monaco Line Highlight (Purple Pulse) ───
let _decorationIds: string[] = [];

function _highlightLines(startLine: number, endLine: number): void {
  const monacoEditor = _getMonacoEditor();
  if (!monacoEditor) {
    console.warn('[SurgicalUI] Monaco editor not found for line highlight');
    return;
  }

  try {
    // Create decorations for the modified lines
    const newDecorations = [];
    for (let line = startLine; line <= endLine; line++) {
      newDecorations.push({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'se-line-highlight',
          glyphMarginClassName: 'se-line-highlight-glyph',
          glyphMarginHoverMessage: { value: `🔬 Modified by Surgical Edit Engine` },
          overviewRuler: {
            color: 'rgba(180,142,173,0.6)',
            position: 1, // Right
          },
        },
      });
    }

    // Apply decorations
    _decorationIds = monacoEditor.deltaDecorations(_decorationIds, newDecorations);

    // Auto-remove after animation completes (2.5s)
    const timerId = window.setTimeout(() => {
      try {
        _decorationIds = monacoEditor.deltaDecorations(_decorationIds, []);
      } catch (e) { /* editor may have been disposed */ }
    }, 2500);
    _highlightTimers.push(timerId);

    // Scroll to the edited line if not visible
    const visibleRanges = monacoEditor.getVisibleRanges();
    if (visibleRanges && visibleRanges.length > 0) {
      const visible = visibleRanges[0];
      if (startLine < visible.startLineNumber || startLine > visible.endLineNumber) {
        monacoEditor.revealLineInCenter(startLine);
      }
    }
  } catch (e) {
    console.warn('[SurgicalUI] Line highlight error:', e);
  }
}

function _getMonacoEditor(): any {
  // Try various ways to get the Monaco editor instance
  const w = window as any;
  if (w.monacoEditorInstance) return w.monacoEditorInstance;
  if (w.editor) return w.editor;
  if (w.monaco?.editor) {
    const editors = w.monaco.editor.getEditors();
    if (editors && editors.length > 0) return editors[0];
  }
  // Try getting from DOM
  const editorEl = document.getElementById('monaco-editor') || document.querySelector('[class*="monaco-editor"]');
  if (editorEl && (editorEl as any).__monacoEditor) return (editorEl as any).__monacoEditor;
  return null;
}


// ─── Time Ago Helper ───
function _timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}


// ─── Public API ───

/** Record a surgical edit (call this after each edit) */
export function recordSurgicalEdit(
  fileName: string,
  lineNumber: number,
  description: string,
  highlightStart?: number,
  highlightEnd?: number
): void {
  _editCount++;
  _lastEdit = {
    file: fileName,
    line: lineNumber,
    description: description,
    timestamp: Date.now(),
  };
  _editHistory.push({ ..._lastEdit });

  // Keep history to last 50
  if (_editHistory.length > 50) {
    _editHistory = _editHistory.slice(-50);
  }

  // Update widget
  _updateWidgetState();

  // Line highlight in Monaco
  const startLine = highlightStart ?? lineNumber;
  const endLine = highlightEnd ?? lineNumber;
  _highlightLines(startLine, endLine);

  // Toast notification
  _showToast(
    '🔬',
    `<span class="se-toast-file">${fileName}</span>`,
    `Line ${startLine}${endLine > startLine ? `-${endLine}` : ''}: ${description}`
  );

  console.log(
    `%c🔬 [SurgicalUI] Edit #${_editCount}: ${fileName}:${lineNumber} — ${description}`,
    'color: #b48ead'
  );
}

/** Get current status */
export function getSurgicalEditStatus(): {
  enabled: boolean;
  editCount: number;
  lastEdit: EditRecord | null;
  history: EditRecord[];
} {
  return {
    enabled: _seEnabled,
    editCount: _editCount,
    lastEdit: _lastEdit,
    history: [..._editHistory],
  };
}

/** Toggle enabled state */
export function toggleSurgicalEdit(): boolean {
  _seEnabled = !_seEnabled;
  _updateWidgetState();
  const sb = (window as any).sb;
  if (sb && typeof sb.setEnabled === 'function') {
    sb.setEnabled(_seEnabled);
  }
  return _seEnabled;
}

/** Manually trigger a line highlight (for testing) */
export function testSurgicalHighlight(startLine: number, endLine?: number): void {
  _highlightLines(startLine, endLine ?? startLine);
}

/** Reset edit counter */
export function resetSurgicalEditCount(): void {
  _editCount = 0;
  _editHistory = [];
  _lastEdit = null;
  _updateWidgetState();
}


// ─── Initialization ───
export 

// --- Status Bar Race Condition Fix ---
// Wait for unified status bar to be ready before inserting widgets
let _seWidgetPendingInsert: HTMLElement | null = null;
let _seInsertedViaEvent = false;

function _deferredInsertIntoStatusBar(widget: HTMLElement): void {
  _seWidgetPendingInsert = widget;
  
  // If unified status bar already exists, insert immediately
  const existingBar = document.querySelector('.unified-status-bar, .status-bar, [class*="status-bar"]');
  if (existingBar && document.querySelector('.unified-status-bar')) {
    _insertIntoStatusBar(widget);
    _seInsertedViaEvent = true;
    _watchForStatusBarRebuild(widget);
    return;
  }

  // Listen for the unified-statusbar-ready event
  window.addEventListener('unified-statusbar-ready', () => {
    if (_seWidgetPendingInsert && !_seInsertedViaEvent) {
      // Small delay to let the status bar fully render
      setTimeout(() => {
        // Remove any existing widget first (avoid duplicates)
        const existing = document.getElementById('se-status-widget');
        if (existing) existing.remove();
        _insertIntoStatusBar(_seWidgetPendingInsert!);
        _seInsertedViaEvent = true;
        _watchForStatusBarRebuild(_seWidgetPendingInsert!);
      }, 300);
    }
  }, { once: true });

  // Fallback: if event never fires, try after 8 seconds
  setTimeout(() => {
    if (!_seInsertedViaEvent && _seWidgetPendingInsert) {
      const existing = document.getElementById('se-status-widget');
      if (!existing || !existing.parentElement) {
        _insertIntoStatusBar(_seWidgetPendingInsert);
        _seInsertedViaEvent = true;
        _watchForStatusBarRebuild(_seWidgetPendingInsert);
      }
    }
  }, 8000);
}

// Watch for status bar rebuilds and re-insert if our widget was removed
function _watchForStatusBarRebuild(widget: HTMLElement): void {
  const check = () => {
    const el = document.getElementById('se-status-widget');
    if (!el || !el.parentElement) {
      // Widget was removed (status bar rebuild), re-insert
      _insertIntoStatusBar(widget);
    }
  };
  // Check periodically for the first 30 seconds after insert
  let checks = 0;
  const interval = setInterval(() => {
    check();
    checks++;
    if (checks > 15) clearInterval(interval); // Stop after 30s (15 x 2s)
  }, 2000);
}
// --- End Race Condition Fix ---

export function initSurgicalEditUI(): void {
  console.log('%c🔬 [SurgicalUI] Initializing...', 'color: #b48ead');

  // Inject CSS
  _injectSurgicalEditCSS();

  // Create and insert widget
  const widget = _createStatusBarWidget();
  _statusBarEl = widget;

  // Sync with existing bridge state
  const sb = (window as any).sb;
  if (sb && typeof sb.getState === 'function') {
    const state = sb.getState();
    _seEnabled = state?.enabled ?? true;
  }

  // Insert with retry (status bar might not exist yet)
  let retries = 0;
  const tryInsert = () => {
    _deferredInsertIntoStatusBar(widget);
    _updateWidgetState();
  };

  // Try immediately, then retry a few times
  setTimeout(tryInsert, 100);
  setTimeout(tryInsert, 1000);
  setTimeout(tryInsert, 3000);

  // Expose to window for debugging
  (window as any).surgicalEditUI = {
    record: recordSurgicalEdit,
    status: getSurgicalEditStatus,
    toggle: toggleSurgicalEdit,
    showDialog: _showSurgicalDialog,
    testHighlight: testSurgicalHighlight,
    reset: resetSurgicalEditCount,
  };

  console.log('%c🔬 [SurgicalUI] Ready!', 'color: #b48ead; font-weight: bold');

  // Show startup notification so user knows engine is active
  setTimeout(() => {
    if (_seEnabled) {
      _showToast('🔬', 'Surgical Edit Engine active', 'AI edits save to disk with automatic backup');
    }
  }, 2500);
  console.log(
    '%c   • window.surgicalEditUI.record(file, line, desc)',
    'color: #9399b2'
  );
  console.log(
    '%c   • window.surgicalEditUI.testHighlight(42, 43)',
    'color: #9399b2'
  );
  console.log(
    '%c   • window.surgicalEditUI.status()',
    'color: #9399b2'
  );
  console.log(
    '%c   • window.surgicalEditUI.toggle()',
    'color: #9399b2'
  );
}