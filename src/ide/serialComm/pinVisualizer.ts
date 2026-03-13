// ============================================================================
// pinVisualizer.ts — Live Pin Visualizer Panel
// ============================================================================
// Renders an interactive board diagram showing which GPIO pins are active
// based on static code analysis. Integrates with the IDE editor to highlight
// code references when hovering over pins.
//
// Features:
//   - SVG board diagram (Uno, Nano, ESP32)
//   - Color-coded pin states (input, output, PWM, analog, serial, I2C, etc.)
//   - Hover tooltips with pin details & code references
//   - Click-to-navigate: jump to pin definition in editor
//   - Pin conflict warnings with visual indicators
//   - Summary stats bar (X active, Y warnings)
//   - Auto-refresh when code changes
//   - Floating/dockable panel (reuses Serial Plotter infrastructure)
// ============================================================================

// import { invoke } from '@tauri-apps/api/core';
import { parseArduinoCode, getPinColor, getPinSummary, getPinDisplayName } from './pinParser';
import type { ParseResult, PinInfo } from './pinParser';
import { getBoardLayout, PIN_COLORS } from './boardLayouts';
import type { BoardLayout, BoardPin, PowerPin } from './boardLayouts';

// ============================================================================
// STATE
// ============================================================================
let visualizerPanel: HTMLDivElement | null = null;
let currentParseResult: ParseResult | null = null;
let isMinimized = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let hoveredPin: number | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Panel position persistence
const STORAGE_KEY = 'pinVisualizer_position';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Toggle the Pin Visualizer panel open/closed
 */
export function togglePinVisualizer(): void {
  if (visualizerPanel) {
    closePinVisualizer();
  } else {
    openPinVisualizer();
  }
}

/**
 * Open the Pin Visualizer and analyze current file
 */
export async function openPinVisualizer(): Promise<void> {
  if (visualizerPanel) return;

  createPanel();
  await refreshAnalysis();

  // Watch for editor changes
  startFileWatcher();
}

/**
 * Close the Pin Visualizer
 */
export function closePinVisualizer(): void {
  if (visualizerPanel) {
    visualizerPanel.remove();
    visualizerPanel = null;
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Force refresh the analysis (called when files change)
 */
export async function refreshAnalysis(): Promise<void> {
  if (!visualizerPanel) return;

  const files = await collectProjectFiles();
  if (Object.keys(files).length === 0) {
    renderEmptyState();
    return;
  }

  currentParseResult = parseArduinoCode(files);
  renderBoard();
}

// ============================================================================
// PANEL CREATION
// ============================================================================

function createPanel(): void {
  visualizerPanel = document.createElement('div');
  visualizerPanel.id = 'pin-visualizer-panel';

  // Restore position or use default
  const savedPos = loadPosition();
  const top = savedPos?.top ?? 80;
  const left = savedPos?.left ?? (window.innerWidth - 340);

  visualizerPanel.style.cssText = `
    position: fixed;
    top: ${top}px;
    left: ${left}px;
    width: 310px;
    min-height: 200px;
    max-height: 80vh;
    background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(88,166,255,0.3);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Segoe UI', -apple-system, sans-serif;
    user-select: none;
    transition: box-shadow 0.2s;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: linear-gradient(90deg, #1e2a4a, #1a2040);
    border-bottom: 1px solid #2a2a4a;
    cursor: move;
    flex-shrink: 0;
  `;
  header.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4EC9B0" stroke-width="2">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <circle cx="8" cy="8" r="1.5" fill="#4EC9B0"/>
      <circle cx="16" cy="8" r="1.5" fill="#58A6FF"/>
      <circle cx="8" cy="16" r="1.5" fill="#FFD700"/>
      <circle cx="16" cy="16" r="1.5" fill="#C586C0"/>
    </svg>
    <span style="font-size:11px; font-weight:700; color:#E0E0E0; flex:1;">Pin Visualizer</span>
    <span id="pv-board-badge" style="font-size:9px; color:#888; background:#1a1a1a; border:1px solid #333; padding:0 5px; border-radius:3px;">—</span>
    <button id="pv-refresh-btn" style="background:none; border:none; cursor:pointer; padding:2px; color:#888; transition:color 0.15s;" title="Refresh">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
    </button>
    <button id="pv-minimize-btn" style="background:none; border:none; cursor:pointer; padding:2px; color:#888; transition:color 0.15s;" title="Minimize">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
    </button>
    <button id="pv-close-btn" style="background:none; border:none; cursor:pointer; padding:2px; color:#888; transition:color 0.15s;" title="Close">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;

  // Body (scrollable)
  const body = document.createElement('div');
  body.id = 'pv-body';
  body.style.cssText = `
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px;
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  `;

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'pv-tooltip';
  tooltip.style.cssText = `
    display: none;
    position: fixed;
    background: #1e1e2e;
    border: 1px solid #3a3a5a;
    border-radius: 6px;
    padding: 8px 10px;
    max-width: 260px;
    z-index: 10001;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    font-size: 11px;
    color: #D4D4D4;
    pointer-events: none;
  `;

  visualizerPanel.appendChild(header);
  visualizerPanel.appendChild(body);
  document.body.appendChild(visualizerPanel);
  document.body.appendChild(tooltip);

  // Event listeners
  setupDragging(header);
  setupButtons();
}

// ============================================================================
// RENDERING
// ============================================================================

function renderBoard(): void {
  const body = document.getElementById('pv-body');
  const badge = document.getElementById('pv-board-badge');
  if (!body || !currentParseResult) return;

  const result = currentParseResult;
  const layout = getBoardLayout(result.board);
  const summary = getPinSummary(result);

  // Update board badge
  if (badge) {
    badge.textContent = layout.displayName;
    badge.style.color = layout.boardColor === '#00979D' ? '#00979D' : '#6CB4EE';
    badge.style.borderColor = layout.boardColor === '#00979D' ? '#006060' : '#3a5a8a';
  }

  // Build active pin lookup
  const activePins: Map<number, PinInfo> = new Map();
  for (const pin of result.pins) {
    activePins.set(pin.pin, pin);
  }

  // --- Stats bar ---
  const statsHtml = `
    <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:8px;">
      <span style="font-size:9px; color:#4EC9B0; background:#1a2a2a; border:1px solid #2a4a3a; padding:1px 6px; border-radius:3px;">
        ${summary.total} active
      </span>
      ${summary.pwm > 0 ? `<span style="font-size:9px; color:#C586C0; background:#2a1a2a; border:1px solid #4a2a4a; padding:1px 6px; border-radius:3px;">${summary.pwm} PWM</span>` : ''}
      ${summary.analog > 0 ? `<span style="font-size:9px; color:#FFD700; background:#2a2a1a; border:1px solid #4a4a2a; padding:1px 6px; border-radius:3px;">${summary.analog} Analog</span>` : ''}
      ${summary.serial > 0 ? `<span style="font-size:9px; color:#F97316; background:#2a1a1a; border:1px solid #4a2a1a; padding:1px 6px; border-radius:3px;">${summary.serial} Serial</span>` : ''}
      ${summary.i2c > 0 ? `<span style="font-size:9px; color:#22D3EE; background:#1a2a2a; border:1px solid #1a4a4a; padding:1px 6px; border-radius:3px;">${summary.i2c} I2C</span>` : ''}
      ${summary.warnings > 0 ? `<span style="font-size:9px; color:#FBBF24; background:#2a2a1a; border:1px solid #4a3a1a; padding:1px 6px; border-radius:3px;">⚠ ${summary.warnings}</span>` : ''}
    </div>
  `;

  // --- SVG Board Diagram ---
  const svgWidth = layout.width;
  const svgHeight = layout.height;

  let pinsSvg = '';

  // Render power pins
  for (const pp of layout.powerPins) {
    const color = pp.type === 'gnd' ? PIN_COLORS.ground :
                  pp.type === '5v' || pp.type === 'vcc' || pp.type === 'vin' ? PIN_COLORS.power :
                  pp.type === '3v3' ? '#FF6B6B' :
                  pp.type === 'rst' ? '#888' : '#666';
    pinsSvg += renderPowerPin(pp, color);
  }

  // Render GPIO pins
  for (const bp of layout.pins) {
    const active = activePins.get(bp.pin);
    pinsSvg += renderGpioPin(bp, active, layout);
  }

  const boardSvg = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" style="max-height:55vh;"
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pv-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="pv-warning-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feFlood flood-color="#FBBF24" flood-opacity="0.4" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feComposite in="SourceGraphic" in2="glow" operator="over"/>
        </filter>
      </defs>

      <!-- Board body -->
      <rect x="${svgWidth * 0.12}" y="0" width="${svgWidth * 0.76}" height="${svgHeight}"
            rx="${layout.boardRadius}" fill="${layout.boardColor}" opacity="0.15"
            stroke="${layout.boardColor}" stroke-width="1" stroke-opacity="0.4"/>

      <!-- USB connector -->
      <rect x="${layout.usbX}" y="${layout.usbY}" width="${layout.usbWidth}" height="${layout.usbHeight}"
            rx="2" fill="#444" stroke="#666" stroke-width="0.5"/>
      <text x="${layout.usbX + layout.usbWidth/2}" y="${layout.usbY + layout.usbHeight/2 + 3}"
            text-anchor="middle" fill="#888" font-size="7" font-family="monospace">USB</text>

      <!-- MCU chip -->
      <rect x="${layout.chipX}" y="${layout.chipY}" width="${layout.chipWidth}" height="${layout.chipHeight}"
            rx="3" fill="#0a0a15" stroke="#333" stroke-width="0.5"/>
      <text x="${layout.chipX + layout.chipWidth/2}" y="${layout.chipY + layout.chipHeight/2 + 1}"
            text-anchor="middle" fill="#555" font-size="7" font-family="monospace">${layout.chipName}</text>

      <!-- Pins -->
      ${pinsSvg}
    </svg>
  `;

  // --- Warnings list ---
  let warningsHtml = '';
  const allWarnings = [
    ...result.warnings.map(w => ({ text: w, pin: null as number | null })),
    ...result.pins.flatMap(p => p.warnings.map(w => ({ text: w, pin: p.pin }))),
  ];

  if (allWarnings.length > 0) {
    warningsHtml = `
      <div style="margin-top:8px; border-top:1px solid #2a2a3a; padding-top:6px;">
        <div style="font-size:9px; color:#FBBF24; font-weight:600; margin-bottom:4px;">Warnings</div>
        ${allWarnings.map(w => `
          <div style="font-size:10px; color:#ccc; background:#1a1a0a; border:1px solid #2a2a1a; border-radius:4px; padding:4px 6px; margin-bottom:3px; line-height:1.4;">
            <span style="color:#FBBF24;">⚠</span> ${escapeHtml(w.text)}
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- Pin legend ---
  const legendHtml = `
    <div style="margin-top:8px; border-top:1px solid #2a2a3a; padding-top:6px; display:flex; flex-wrap:wrap; gap:3px;">
      <span style="font-size:8px; color:#4EC9B0;">● Output</span>
      <span style="font-size:8px; color:#58A6FF;">● Input</span>
      <span style="font-size:8px; color:#C586C0;">● PWM</span>
      <span style="font-size:8px; color:#FFD700;">● Analog</span>
      <span style="font-size:8px; color:#F97316;">● Serial</span>
      <span style="font-size:8px; color:#22D3EE;">● I2C</span>
      <span style="font-size:8px; color:#A78BFA;">● SPI</span>
      <span style="font-size:8px; color:#F472B6;">● Servo</span>
    </div>
  `;

  // --- Active pins list ---
  let pinsListHtml = '';
  if (result.pins.length > 0) {
    pinsListHtml = `
      <div style="margin-top:8px; border-top:1px solid #2a2a3a; padding-top:6px;">
        <div style="font-size:9px; color:#888; font-weight:600; margin-bottom:4px;">Active Pins (${result.pins.length})</div>
        ${result.pins.map(p => {
          const color = getPinColor(p);
          const displayName = getPinDisplayName(p.pin, result.board);
          const modeIcon = p.mode === 'OUTPUT' ? '→' : p.mode === 'INPUT' ? '←' : p.mode === 'INPUT_PULLUP' ? '⇐' : '?';
          const valueStr = p.value ? ` = ${p.value}` : '';
          const warnIcon = p.warnings.length > 0 ? ' ⚠' : '';
          return `
            <div class="pv-pin-row" data-pin="${p.pin}" data-line="${p.line}" data-source="${escapeHtml(p.source)}"
                 style="display:flex; align-items:center; gap:5px; padding:3px 6px; border-radius:3px; cursor:pointer; transition:background 0.1s; font-size:10px;"
                 onmouseenter="this.style.background='#1a2a3a'"
                 onmouseleave="this.style.background='transparent'">
              <span style="width:6px; height:6px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
              <span style="color:${color}; font-weight:600; min-width:32px; font-family:monospace;">${displayName}</span>
              <span style="color:#aaa; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${escapeHtml(p.label)}${valueStr}
              </span>
              <span style="color:#666; font-size:9px;">${modeIcon}</span>
              <span style="color:${p.warnings.length > 0 ? '#FBBF24' : '#333'}; font-size:9px;">${warnIcon}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- Serial info ---
  let serialHtml = '';
  if (result.serialBaud) {
    serialHtml = `
      <div style="margin-top:4px; font-size:9px; color:#F97316;">
        Serial: ${result.serialBaud} baud
      </div>
    `;
  }

  // Assemble
  body.innerHTML = statsHtml + boardSvg + serialHtml + legendHtml + warningsHtml + pinsListHtml;

  // Attach event listeners
  attachPinEvents();
}

// ============================================================================
// SVG PIN RENDERING
// ============================================================================

function renderGpioPin(bp: BoardPin, active: PinInfo | undefined, layout: BoardLayout): string {
  const isActive = !!active;
  const hasWarning = active ? active.warnings.length > 0 : false;

  // Determine color
  let color = PIN_COLORS.inactive;
  if (active) {
    color = getPinColor(active);
  }

  const radius = isActive ? 4.5 : 3;
  const filter = hasWarning ? 'filter="url(#pv-warning-glow)"' :
                 isActive ? 'filter="url(#pv-glow)"' : '';
  const opacity = isActive ? 1 : 0.4;

  // Label positioning
  const isLeft = bp.side === 'left';
  const labelX = isLeft ? bp.x + 12 : bp.x - 12;
  const labelAnchor = isLeft ? 'start' : 'end';

  // User label (from code)
  const userLabel = active ? active.label : '';
  const userLabelX = isLeft ? bp.x + 40 : bp.x - 40;

  // Connection line from pin to board edge
  const boardEdgeX = isLeft ? layout.width * 0.12 : layout.width * 0.88;
  const lineOpacity = isActive ? 0.6 : 0.15;

  // Mode indicator
  let modeIndicator = '';
  if (active) {
    if (active.type === 'pwm' && active.value) {
      // PWM bar
      const pwmVal = parseInt(active.value) || 128;
      const barWidth = (pwmVal / 255) * 20;
      const barX = isLeft ? bp.x + 8 : bp.x - 28;
      modeIndicator = `<rect x="${barX}" y="${bp.y - 2}" width="${barWidth}" height="4" rx="1" fill="${color}" opacity="0.6"/>`;
    }
    if (active.mode === 'OUTPUT') {
      const arrowX = isLeft ? bp.x + 7 : bp.x - 7;
      const dir = isLeft ? 1 : -1;
      modeIndicator += `<path d="M${arrowX},${bp.y} l${3*dir},-2 l0,4 z" fill="${color}" opacity="0.8"/>`;
    } else if (active.mode === 'INPUT' || active.mode === 'INPUT_PULLUP') {
      const arrowX = isLeft ? bp.x - 2 : bp.x + 2;
      const dir = isLeft ? -1 : 1;
      modeIndicator += `<path d="M${arrowX},${bp.y} l${3*dir},-2 l0,4 z" fill="${color}" opacity="0.8"/>`;
    }
  }

  return `
    <g class="pv-svg-pin" data-pin="${bp.pin}" style="cursor:pointer;">
      <!-- Connection trace -->
      <line x1="${bp.x}" y1="${bp.y}" x2="${boardEdgeX}" y2="${bp.y}"
            stroke="${color}" stroke-width="0.5" opacity="${lineOpacity}"/>
      
      <!-- Pin circle -->
      <circle cx="${bp.x}" cy="${bp.y}" r="${radius}" fill="${color}" opacity="${opacity}" ${filter}
              stroke="${isActive ? color : 'none'}" stroke-width="${isActive ? 0.5 : 0}" stroke-opacity="0.3"/>
      
      <!-- Pin label -->
      <text x="${labelX}" y="${bp.y + 3}" text-anchor="${labelAnchor}" fill="${isActive ? '#E0E0E0' : '#555'}"
            font-size="7" font-family="monospace" font-weight="${isActive ? '700' : '400'}">${bp.label}</text>
      
      ${isActive && userLabel && userLabel !== bp.label ? `
        <text x="${userLabelX}" y="${bp.y + 3}" text-anchor="${labelAnchor}" fill="${color}"
              font-size="6" font-family="monospace" font-weight="600" opacity="0.8">${escapeHtml(userLabel.substring(0, 12))}</text>
      ` : ''}
      
      ${modeIndicator}
      
      ${hasWarning ? `<circle cx="${bp.x}" cy="${bp.y - 6}" r="2" fill="#FBBF24"/>` : ''}
    </g>
  `;
}

function renderPowerPin(pp: PowerPin, color: string): string {
  const isLeft = pp.side === 'left';
  const labelX = isLeft ? pp.x + 12 : pp.x - 12;
  const labelAnchor = isLeft ? 'start' : 'end';

  const shape = pp.type === 'gnd'
    ? `<rect x="${pp.x - 3}" y="${pp.y - 3}" width="6" height="6" fill="${color}" opacity="0.5"/>`
    : `<circle cx="${pp.x}" cy="${pp.y}" r="3" fill="${color}" opacity="0.5"/>`;

  return `
    <g>
      ${shape}
      <text x="${labelX}" y="${pp.y + 3}" text-anchor="${labelAnchor}" fill="${color}"
            font-size="6.5" font-family="monospace" opacity="0.7">${pp.label}</text>
    </g>
  `;
}

// ============================================================================
// EMPTY / LOADING STATES
// ============================================================================

function renderEmptyState(): void {
  const body = document.getElementById('pv-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px 20px; text-align:center;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3a3a5a" stroke-width="1.5">
        <rect x="2" y="2" width="20" height="20" rx="2"/>
        <circle cx="8" cy="8" r="1.5"/>
        <circle cx="16" cy="8" r="1.5"/>
        <circle cx="8" cy="16" r="1.5"/>
        <circle cx="16" cy="16" r="1.5"/>
      </svg>
      <div style="color:#666; font-size:11px; margin-top:12px; font-weight:600;">No Arduino/ESP32 files detected</div>
      <div style="color:#555; font-size:10px; margin-top:6px; line-height:1.5;">
        Open a project with <code style="color:#4EC9B0; background:#1a2a2a; padding:1px 4px; border-radius:2px;">.ino</code> files to see the pin diagram.
      </div>
    </div>
  `;
}

// ============================================================================
// TOOLTIP
// ============================================================================

function showTooltip(pinNum: number, x: number, y: number): void {
  const tooltip = document.getElementById('pv-tooltip');
  if (!tooltip || !currentParseResult) return;

  const pinInfo = currentParseResult.pins.find(p => p.pin === pinNum);
  const layout = getBoardLayout(currentParseResult.board);
  const boardPin = layout.pins.find(bp => bp.pin === pinNum);

  if (!pinInfo && !boardPin) {
    tooltip.style.display = 'none';
    return;
  }

  const displayName = getPinDisplayName(pinNum, currentParseResult.board);
  const color = pinInfo ? getPinColor(pinInfo) : PIN_COLORS.inactive;

  let html = `<div style="font-weight:700; color:${color}; margin-bottom:4px;">${displayName}`;
  if (boardPin?.altLabel) {
    html += ` <span style="color:#888; font-weight:400;">(${boardPin.altLabel})</span>`;
  }
  html += '</div>';

  if (pinInfo) {
    html += `<div style="color:#aaa; margin-bottom:3px;">
      <span style="color:${color};">●</span> ${pinInfo.label}
      ${pinInfo.mode !== 'UNKNOWN' ? `— <b>${pinInfo.mode}</b>` : ''}
      ${pinInfo.value ? `= ${pinInfo.value}` : ''}
    </div>`;

    html += `<div style="color:#888; font-size:10px;">Type: ${pinInfo.type}</div>`;

    if (pinInfo.usage.length > 0) {
      html += `<div style="color:#777; font-size:9px; margin-top:4px; border-top:1px solid #2a2a3a; padding-top:3px;">`;
      for (const u of pinInfo.usage.slice(0, 4)) {
        html += `<div style="margin-top:1px;">
          <span style="color:#555;">${u.line}:</span> 
          <code style="color:#aaa; font-size:9px;">${escapeHtml(u.raw.substring(0, 40))}</code>
        </div>`;
      }
      if (pinInfo.usage.length > 4) {
        html += `<div style="color:#555;">+${pinInfo.usage.length - 4} more</div>`;
      }
      html += `</div>`;
    }

    if (pinInfo.warnings.length > 0) {
      html += `<div style="color:#FBBF24; font-size:9px; margin-top:4px; border-top:1px solid #2a2a1a; padding-top:3px;">`;
      for (const w of pinInfo.warnings) {
        html += `<div>⚠ ${escapeHtml(w)}</div>`;
      }
      html += `</div>`;
    }

    html += `<div style="color:#555; font-size:8px; margin-top:4px;">Click to jump to code</div>`;
  } else {
    html += `<div style="color:#555;">Not used in code</div>`;
    if (boardPin) {
      const caps: string[] = [];
      if (boardPin.isPwm) caps.push('PWM');
      if (boardPin.isAnalog) caps.push('Analog');
      if (boardPin.isSerial) caps.push('Serial');
      if (boardPin.isI2C) caps.push('I2C');
      if (boardPin.isSPI) caps.push('SPI');
      if (boardPin.isInputOnly) caps.push('Input Only');
      if (caps.length > 0) {
        html += `<div style="color:#666; font-size:9px; margin-top:2px;">Capabilities: ${caps.join(', ')}</div>`;
      }
    }
  }

  tooltip.innerHTML = html;
  tooltip.style.display = 'block';

  // Position tooltip (avoid overflow)
  const rect = tooltip.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 10;
  const maxY = window.innerHeight - rect.height - 10;
  tooltip.style.left = `${Math.min(x + 12, maxX)}px`;
  tooltip.style.top = `${Math.min(y - 10, maxY)}px`;
}

function hideTooltip(): void {
  const tooltip = document.getElementById('pv-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function attachPinEvents(): void {
  // SVG pin hover/click
  const svgPins = document.querySelectorAll('.pv-svg-pin');
  svgPins.forEach(el => {
    const pinNum = parseInt(el.getAttribute('data-pin') || '-1');
    
    el.addEventListener('mouseenter', (e: Event) => {
      const me = e as MouseEvent;
      hoveredPin = pinNum;
      showTooltip(pinNum, me.clientX, me.clientY);
      // Highlight pin circle
      const circle = el.querySelector('circle');
      if (circle) {
        circle.setAttribute('r', '6');
        circle.style.transition = 'r 0.15s';
      }
    });

    el.addEventListener('mouseleave', () => {
      hoveredPin = null;
      hideTooltip();
      const circle = el.querySelector('circle');
      if (circle) {
        const active = currentParseResult?.pins.find(p => p.pin === pinNum);
        circle.setAttribute('r', active ? '4.5' : '3');
      }
    });

    el.addEventListener('mousemove', (e: Event) => {
      const me = e as MouseEvent;
      if (hoveredPin === pinNum) {
        showTooltip(pinNum, me.clientX, me.clientY);
      }
    });

    el.addEventListener('click', () => {
      navigateToPin(pinNum);
    });
  });

  // Pin list row click
  const pinRows = document.querySelectorAll('.pv-pin-row');
  pinRows.forEach(row => {
    row.addEventListener('click', () => {
      const line = parseInt(row.getAttribute('data-line') || '0');
      const source = row.getAttribute('data-source') || '';
      if (line > 0 && source) {
        navigateToLine(source, line);
      }
    });
  });
}

function navigateToPin(pinNum: number): void {
  if (!currentParseResult) return;
  const pin = currentParseResult.pins.find(p => p.pin === pinNum);
  if (pin && pin.line > 0 && pin.source) {
    navigateToLine(pin.source, pin.line);
  }
}

function navigateToLine(filename: string, line: number): void {
  // Try to use Monaco editor to jump to line
  try {
    const editors = (window as any).monaco?.editor?.getEditors?.();
    if (editors && editors.length > 0) {
      const editor = editors[0];
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
      console.log(`[PinViz] Jumped to ${filename}:${line}`);
    }
  } catch (e) {
    console.warn('[PinViz] Could not navigate to editor line:', e);
  }
}

// ============================================================================
// DRAGGING
// ============================================================================

function setupDragging(header: HTMLElement): void {
  header.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    isDragging = true;
    const rect = visualizerPanel!.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging || !visualizerPanel) return;
    const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffsetX));
    const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffsetY));
    visualizerPanel.style.left = `${x}px`;
    visualizerPanel.style.top = `${y}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      savePosition();
    }
  });
}

function setupButtons(): void {
  document.getElementById('pv-close-btn')?.addEventListener('click', closePinVisualizer);
  
  document.getElementById('pv-minimize-btn')?.addEventListener('click', () => {
    const body = document.getElementById('pv-body');
    if (!body || !visualizerPanel) return;
    isMinimized = !isMinimized;
    body.style.display = isMinimized ? 'none' : 'block';
    visualizerPanel.style.minHeight = isMinimized ? 'auto' : '200px';
  });

  document.getElementById('pv-refresh-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('pv-refresh-btn');
    if (btn) {
      btn.style.color = '#4EC9B0';
      btn.style.transform = 'rotate(360deg)';
      btn.style.transition = 'transform 0.5s, color 0.3s';
    }
    await refreshAnalysis();
    setTimeout(() => {
      if (btn) {
        btn.style.color = '#888';
        btn.style.transform = '';
      }
    }, 600);
  });

  // Button hover effects
  ['pv-close-btn', 'pv-minimize-btn', 'pv-refresh-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('mouseenter', () => { btn.style.color = id === 'pv-close-btn' ? '#F44336' : '#E0E0E0'; });
      btn.addEventListener('mouseleave', () => { btn.style.color = '#888'; });
    }
  });
}

// ============================================================================
// FILE COLLECTION
// ============================================================================

async function collectProjectFiles(): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  try {
    // Get current project path from the file explorer
    const projectPath = (window as any).__currentProjectPath ||
                        (window as any).currentProjectPath ||
                        (window as any).__projectPath ||
                        localStorage.getItem('lastProjectPath') || '';
    
    if (!projectPath) {
      console.log('[PinViz] No project path found');
      return files;
    }

    // Read project files via Tauri
    if ((window as any).__TAURI__) {
      try {
        const allFiles = await invoke<string[]>('list_directory', { path: projectPath });
        const codeFiles = allFiles.filter((f: string) => /\.(ino|cpp|c|h|hpp)$/i.test(f));

        for (const filename of codeFiles) {
          try {
            const fullPath = `${projectPath}/${filename}`;
            const content = await invoke<string>('read_file', { path: fullPath });
            files[filename] = content;
          } catch (e) {
            console.warn(`[PinViz] Could not read ${filename}:`, e);
          }
        }
      } catch (e) {
        console.warn('[PinViz] Could not list directory:', e);
      }
    }

    // Fallback: try to get content from Monaco editor
    if (Object.keys(files).length === 0) {
      try {
        const editors = (window as any).monaco?.editor?.getEditors?.();
        if (editors) {
          for (const editor of editors) {
            const model = editor.getModel();
            if (model) {
              const uri = model.uri.toString();
              const filename = uri.split('/').pop() || '';
              if (/\.(ino|cpp|c|h|hpp)$/i.test(filename)) {
                files[filename] = model.getValue();
              }
            }
          }
        }
      } catch (e) {
        console.warn('[PinViz] Could not read from Monaco editor:', e);
      }
    }

  } catch (error) {
    console.error('[PinViz] File collection error:', error);
  }

  console.log(`[PinViz] Collected ${Object.keys(files).length} files:`, Object.keys(files));
  return files;
}

// ============================================================================
// FILE WATCHER — Auto-refresh on save
// ============================================================================

function startFileWatcher(): void {
  // Poll for changes every 3 seconds (lightweight — just checks editor dirty state)
  let lastContent = '';

  const checkForChanges = async () => {
    if (!visualizerPanel) return;

    try {
      const editors = (window as any).monaco?.editor?.getEditors?.();
      if (editors && editors.length > 0) {
        const model = editors[0].getModel();
        if (model) {
          const content = model.getValue();
          if (content !== lastContent) {
            lastContent = content;
            await refreshAnalysis();
          }
        }
      }
    } catch (e) {
      // Silently ignore
    }

    if (visualizerPanel) {
      refreshTimer = setTimeout(checkForChanges, 3000);
    }
  };

  refreshTimer = setTimeout(checkForChanges, 3000);
}

// ============================================================================
// POSITION PERSISTENCE
// ============================================================================

function savePosition(): void {
  if (!visualizerPanel) return;
  const rect = visualizerPanel.getBoundingClientRect();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      top: rect.top,
      left: rect.left,
    }));
  } catch (e) {}
}

function loadPosition(): { top: number; left: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

// ============================================================================
// UTILITY
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// TOOLBAR BUTTON (add to IDE toolbar)
// ============================================================================

/**
 * Call this during IDE initialization to add the Pin Visualizer button
 * to the Arduino toolbar section.
 */
export function addPinVisualizerButton(toolbar: HTMLElement): void {
  const btn = document.createElement('button');
  btn.id = 'pin-visualizer-toggle';
  btn.title = 'Pin Visualizer';
  btn.style.cssText = `
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #888;
    font-size: 11px;
    transition: all 0.15s;
  `;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
      <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
    </svg>
    <span>Pins</span>
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.color = '#4EC9B0';
    btn.style.borderColor = '#2a4a3a';
    btn.style.background = 'rgba(78, 201, 176, 0.08)';
  });
  btn.addEventListener('mouseleave', () => {
    const isOpen = !!visualizerPanel;
    btn.style.color = isOpen ? '#4EC9B0' : '#888';
    btn.style.borderColor = isOpen ? '#2a4a3a' : 'transparent';
    btn.style.background = isOpen ? 'rgba(78, 201, 176, 0.08)' : 'none';
  });

  btn.addEventListener('click', () => {
    togglePinVisualizer();
    const isOpen = !!visualizerPanel;
    btn.style.color = isOpen ? '#4EC9B0' : '#888';
    btn.style.borderColor = isOpen ? '#2a4a3a' : 'transparent';
    btn.style.background = isOpen ? 'rgba(78, 201, 176, 0.08)' : 'none';
  });

  toolbar.appendChild(btn);
}
