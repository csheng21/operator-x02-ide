// src/ide/arduino/arduinoPanel.ts
// Arduino Panel UI - Main interface for Arduino operations
// Includes board selection, compile/upload buttons, and serial monitor

import { arduinoManager, ArduinoState, ArduinoEvent } from './arduinoManager';
import { 
  arduinoService, 
  ArduinoBoard, 
  SerialPortInfo,
  COMMON_BAUD_RATES,
  POPULAR_BOARDS,
  COMMON_BOARD_URLS,
} from './arduinoService';
import './arduino.css';

// ================================
// ARDUINO PANEL CLASS
// ================================

class ArduinoPanel {
  private container: HTMLElement | null = null;
  private isVisible = false;
  private unsubscribe: (() => void) | null = null;
  private serialMonitorEl: HTMLElement | null = null;
  private state: ArduinoState;

  constructor() {
    this.state = arduinoManager.getState();
    this.setupEventListeners();
  }

  // ================================
  // EVENT HANDLING
  // ================================

  private setupEventListeners(): void {
    this.unsubscribe = arduinoManager.on((event) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: ArduinoEvent): void {
    switch (event.type) {
      case 'state-changed':
        this.state = { ...this.state, ...event.state };
        this.updateUI();
        break;
      case 'serial-data':
        this.appendSerialOutput(event.data);
        break;
      case 'compile-started':
      case 'upload-started':
        this.showProgress(event.type === 'compile-started' ? 'Compiling...' : 'Uploading...');
        break;
      case 'compile-complete':
        this.hideProgress();
        this.showCompileResult(event.result);
        break;
      case 'upload-complete':
        this.hideProgress();
        this.showUploadResult(event.result);
        break;
      case 'board-detected':
        this.showNotification(`Board detected: ${event.board.board_name}`, 'success');
        break;
      case 'error':
        this.showNotification(event.message, 'error');
        break;
    }
  }

  // ================================
  // PANEL MANAGEMENT
  // ================================

  /**
   * Show the Arduino panel
   */
  show(): void {
    if (this.isVisible) return;
    
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.isVisible = true;
    
    // Refresh boards when panel opens
    arduinoManager.refreshBoards();
  }

  /**
   * Hide the Arduino panel
   */
  hide(): void {
    if (!this.isVisible || !this.container) return;
    
    this.container.remove();
    this.container = null;
    this.isVisible = false;
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // ================================
  // UI CREATION
  // ================================

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'arduino-panel';
    panel.innerHTML = `
      <div class="arduino-panel-header">
        <div class="arduino-panel-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c1.03.13 2 .45 2.87.93H13v-.93zM13 7h5.24c.25.31.48.65.68 1H13V7zm0 3h6.74c.08.33.15.66.19 1H13v-1zm0 9.93V19h2.87c-.87.48-1.84.8-2.87.93zM18.24 17H13v-1h5.92c-.2.35-.43.69-.68 1zm1.5-3H13v-1h6.93c-.04.34-.11.67-.19 1z"/>
          </svg>
          <span>Arduino</span>
        </div>
        <div class="arduino-panel-actions">
          <button class="arduino-btn arduino-btn-icon" onclick="arduinoPanel.refreshBoards()" title="Refresh Boards">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
          <button class="arduino-btn arduino-btn-icon" onclick="arduinoPanel.showSettings()" title="Settings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button class="arduino-btn arduino-btn-icon" onclick="arduinoPanel.hide()" title="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="arduino-panel-body">
        <!-- CLI Status -->
        <div class="arduino-section" id="arduino-cli-status">
          ${this.renderCliStatus()}
        </div>

        <!-- Board Selection -->
        <div class="arduino-section">
          <div class="arduino-section-title">Board & Port</div>
          <div class="arduino-board-selection">
            ${this.renderBoardSelection()}
          </div>
        </div>

        <!-- Actions -->
        <div class="arduino-section">
          <div class="arduino-actions">
            <button class="arduino-btn arduino-btn-primary" onclick="arduinoPanel.verify()" 
                    ${!this.state.selectedBoard?.fqbn ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Verify
            </button>
            <button class="arduino-btn arduino-btn-success" onclick="arduinoPanel.upload()"
                    ${!this.state.selectedBoard?.fqbn || !this.state.selectedPort ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
              </svg>
              Upload
            </button>
          </div>
        </div>

        <!-- Serial Monitor -->
        <div class="arduino-section arduino-serial-section">
          <div class="arduino-section-title">
            <span>Serial Monitor</span>
            <div class="arduino-serial-controls">
              <select id="arduino-baud-rate" onchange="arduinoPanel.setBaudRate(this.value)">
                ${COMMON_BAUD_RATES.map(rate => 
                  `<option value="${rate}" ${rate === this.state.selectedBaudRate ? 'selected' : ''}>${rate} baud</option>`
                ).join('')}
              </select>
              <button class="arduino-btn arduino-btn-small ${this.state.isSerialConnected ? 'arduino-btn-danger' : 'arduino-btn-success'}"
                      onclick="arduinoPanel.toggleSerial()"
                      ${!this.state.selectedPort ? 'disabled' : ''}>
                ${this.state.isSerialConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
          <div class="arduino-serial-monitor" id="arduino-serial-output">
            ${this.state.serialOutput.map(line => `<div class="arduino-serial-line">${this.escapeHtml(line)}</div>`).join('')}
          </div>
          <div class="arduino-serial-input-row">
            <input type="text" id="arduino-serial-input" placeholder="Enter message..."
                   onkeypress="if(event.key==='Enter') arduinoPanel.sendSerial()"
                   ${!this.state.isSerialConnected ? 'disabled' : ''}>
            <select id="arduino-line-ending" onchange="arduinoPanel.setLineEnding(this.value)">
              <option value="nl" ${this.state.lineEnding === 'nl' ? 'selected' : ''}>Newline</option>
              <option value="cr" ${this.state.lineEnding === 'cr' ? 'selected' : ''}>Carriage Return</option>
              <option value="nlcr" ${this.state.lineEnding === 'nlcr' ? 'selected' : ''}>Both NL & CR</option>
              <option value="none" ${this.state.lineEnding === 'none' ? 'selected' : ''}>No line ending</option>
            </select>
            <button class="arduino-btn arduino-btn-small" onclick="arduinoPanel.sendSerial()"
                    ${!this.state.isSerialConnected ? 'disabled' : ''}>
              Send
            </button>
            <button class="arduino-btn arduino-btn-small" onclick="arduinoPanel.clearSerial()" title="Clear">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
          <div class="arduino-serial-options">
            <label>
              <input type="checkbox" ${this.state.autoScroll ? 'checked' : ''} 
                     onchange="arduinoPanel.setAutoScroll(this.checked)">
              Auto-scroll
            </label>
            <label>
              <input type="checkbox" ${this.state.showTimestamps ? 'checked' : ''} 
                     onchange="arduinoPanel.setShowTimestamps(this.checked)">
              Timestamps
            </label>
          </div>
        </div>

        <!-- Output Console -->
        <div class="arduino-section">
          <div class="arduino-section-title">Output</div>
          <div class="arduino-output" id="arduino-output">
            ${this.renderLastResult()}
          </div>
        </div>
      </div>

      <!-- Progress Overlay -->
      <div class="arduino-progress-overlay" id="arduino-progress" style="display: none;">
        <div class="arduino-progress-spinner"></div>
        <div class="arduino-progress-text">Processing...</div>
      </div>
    `;

    this.serialMonitorEl = panel.querySelector('#arduino-serial-output');
    return panel;
  }

  private renderCliStatus(): string {
    if (!this.state.isCliInstalled) {
      return `
        <div class="arduino-cli-warning">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
          </svg>
          <div class="arduino-cli-warning-text">
            <strong>Arduino CLI not found</strong>
            <p>Please install Arduino CLI to use Arduino features.</p>
            <a href="https://arduino.github.io/arduino-cli/latest/installation/" target="_blank" class="arduino-link">
              Installation Guide →
            </a>
          </div>
        </div>
      `;
    }
    return `
      <div class="arduino-cli-ok">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Arduino CLI installed
      </div>
    `;
  }

  private renderBoardSelection(): string {
    const boards = this.state.connectedBoards;
    const ports = this.state.availablePorts;
    const selectedBoard = this.state.selectedBoard;
    const selectedPort = this.state.selectedPort;

    return `
      <div class="arduino-select-row">
        <label>Board:</label>
        <select id="arduino-board-select" onchange="arduinoPanel.selectBoard(this.value)">
          <option value="">-- Select Board --</option>
          ${boards.length > 0 ? `
            <optgroup label="Connected Boards">
              ${boards.map(b => `
                <option value="${b.port}|${b.fqbn}" 
                        ${selectedBoard?.port === b.port ? 'selected' : ''}>
                  ${b.board_name || 'Unknown'} (${b.port})
                </option>
              `).join('')}
            </optgroup>
          ` : ''}
          <optgroup label="Popular Boards">
            ${POPULAR_BOARDS.map(b => `
              <option value="|${b.fqbn}" ${selectedBoard?.fqbn === b.fqbn && !selectedBoard?.port ? 'selected' : ''}>
                ${b.name}
              </option>
            `).join('')}
          </optgroup>
        </select>
      </div>
      <div class="arduino-select-row">
        <label>Port:</label>
        <select id="arduino-port-select" onchange="arduinoPanel.selectPort(this.value)">
          <option value="">-- Select Port --</option>
          ${ports.map(p => `
            <option value="${p.port_name}" ${selectedPort === p.port_name ? 'selected' : ''}>
              ${p.port_name} ${p.is_arduino_compatible ? `(${p.chip_type})` : ''}
            </option>
          `).join('')}
        </select>
      </div>
      ${selectedBoard?.fqbn ? `
        <div class="arduino-board-info">
          <span class="arduino-fqbn">FQBN: ${selectedBoard.fqbn}</span>
        </div>
      ` : ''}
    `;
  }

  private renderLastResult(): string {
    const compile = this.state.lastCompileResult;
    const upload = this.state.lastUploadResult;

    if (!compile && !upload) {
      return '<div class="arduino-output-empty">No output yet</div>';
    }

    let html = '';

    if (compile) {
      const statusClass = compile.success ? 'success' : 'error';
      html += `
        <div class="arduino-result arduino-result-${statusClass}">
          <div class="arduino-result-header">
            Compilation ${compile.success ? 'Successful' : 'Failed'}
          </div>
          ${compile.memory_usage ? `
            <div class="arduino-memory-usage">
              <div class="arduino-memory-bar">
                <div class="arduino-memory-bar-fill" style="width: ${compile.memory_usage.flash_percent}%"></div>
                <span>Flash: ${arduinoService.formatBytes(compile.memory_usage.flash_used)} / ${arduinoService.formatBytes(compile.memory_usage.flash_total)} (${compile.memory_usage.flash_percent.toFixed(1)}%)</span>
              </div>
              <div class="arduino-memory-bar">
                <div class="arduino-memory-bar-fill" style="width: ${compile.memory_usage.ram_percent}%"></div>
                <span>RAM: ${arduinoService.formatBytes(compile.memory_usage.ram_used)} / ${arduinoService.formatBytes(compile.memory_usage.ram_total)} (${compile.memory_usage.ram_percent.toFixed(1)}%)</span>
              </div>
            </div>
          ` : ''}
          ${!compile.success ? `<pre class="arduino-error-output">${this.escapeHtml(compile.stderr)}</pre>` : ''}
        </div>
      `;
    }

    return html;
  }

  // ================================
  // UI UPDATES
  // ================================

  private updateUI(): void {
    if (!this.container) return;

    // Update CLI status
    const cliStatus = this.container.querySelector('#arduino-cli-status');
    if (cliStatus) {
      cliStatus.innerHTML = this.renderCliStatus();
    }

    // Update board selection
    const boardSelection = this.container.querySelector('.arduino-board-selection');
    if (boardSelection) {
      boardSelection.innerHTML = this.renderBoardSelection();
    }

    // Update action buttons
    const verifyBtn = this.container.querySelector('.arduino-btn-primary') as HTMLButtonElement;
    const uploadBtn = this.container.querySelector('.arduino-btn-success') as HTMLButtonElement;
    if (verifyBtn) {
      verifyBtn.disabled = !this.state.selectedBoard?.fqbn || this.state.isCompiling;
    }
    if (uploadBtn) {
      uploadBtn.disabled = !this.state.selectedBoard?.fqbn || !this.state.selectedPort || this.state.isUploading;
    }

    // Update serial monitor connect button
    const serialBtn = this.container.querySelector('.arduino-serial-controls .arduino-btn-small') as HTMLButtonElement;
    if (serialBtn) {
      serialBtn.textContent = this.state.isSerialConnected ? 'Disconnect' : 'Connect';
      serialBtn.className = `arduino-btn arduino-btn-small ${this.state.isSerialConnected ? 'arduino-btn-danger' : 'arduino-btn-success'}`;
      serialBtn.disabled = !this.state.selectedPort;
    }

    // Update serial input
    const serialInput = this.container.querySelector('#arduino-serial-input') as HTMLInputElement;
    if (serialInput) {
      serialInput.disabled = !this.state.isSerialConnected;
    }

    // Update output
    const output = this.container.querySelector('#arduino-output');
    if (output) {
      output.innerHTML = this.renderLastResult();
    }
  }

  private appendSerialOutput(data: string): void {
    if (!this.serialMonitorEl) return;

    const lines = data.split('\n').filter(l => l);
    lines.forEach(line => {
      const lineEl = document.createElement('div');
      lineEl.className = 'arduino-serial-line';
      lineEl.textContent = this.state.showTimestamps 
        ? `[${new Date().toLocaleTimeString()}] ${line}`
        : line;
      this.serialMonitorEl!.appendChild(lineEl);
    });

    // Trim excess lines
    while (this.serialMonitorEl.children.length > 5000) {
      this.serialMonitorEl.removeChild(this.serialMonitorEl.firstChild!);
    }

    // Auto-scroll
    if (this.state.autoScroll) {
      this.serialMonitorEl.scrollTop = this.serialMonitorEl.scrollHeight;
    }
  }

  // ================================
  // ACTIONS
  // ================================

  async refreshBoards(): Promise<void> {
    await arduinoManager.refreshBoards();
  }

  async verify(): Promise<void> {
    // Get current file from editor
    const currentFile = this.getCurrentSketchPath();
    if (!currentFile) {
      this.showNotification('No Arduino sketch file open', 'error');
      return;
    }

    try {
      await arduinoManager.compile(currentFile);
    } catch (error) {
      this.showNotification(`Compilation failed: ${error}`, 'error');
    }
  }

  async upload(): Promise<void> {
    const currentFile = this.getCurrentSketchPath();
    if (!currentFile) {
      this.showNotification('No Arduino sketch file open', 'error');
      return;
    }

    try {
      await arduinoManager.upload(currentFile);
    } catch (error) {
      this.showNotification(`Upload failed: ${error}`, 'error');
    }
  }

  selectBoard(value: string): void {
    const [port, fqbn] = value.split('|');
    
    if (port) {
      const board = this.state.connectedBoards.find(b => b.port === port);
      if (board) {
        arduinoManager.selectBoard(board);
        return;
      }
    }
    
    if (fqbn) {
      arduinoManager.setFqbn(fqbn);
    }
  }

  selectPort(port: string): void {
    arduinoManager.selectPort(port || null);
  }

  async toggleSerial(): Promise<void> {
    try {
      if (this.state.isSerialConnected) {
        await arduinoManager.disconnectSerial();
      } else {
        await arduinoManager.connectSerial();
      }
    } catch (error) {
      this.showNotification(`Serial error: ${error}`, 'error');
    }
  }

  async sendSerial(): Promise<void> {
    const input = document.getElementById('arduino-serial-input') as HTMLInputElement;
    if (!input || !input.value) return;

    try {
      await arduinoManager.sendSerial(input.value);
      input.value = '';
    } catch (error) {
      this.showNotification(`Send error: ${error}`, 'error');
    }
  }

  clearSerial(): void {
    arduinoManager.clearSerialOutput();
    if (this.serialMonitorEl) {
      this.serialMonitorEl.innerHTML = '';
    }
  }

  setBaudRate(rate: string): void {
    arduinoManager.setSerialOptions({ baudRate: parseInt(rate) });
  }

  setLineEnding(ending: string): void {
    arduinoManager.setSerialOptions({ lineEnding: ending as any });
  }

  setAutoScroll(enabled: boolean): void {
    arduinoManager.setSerialOptions({ autoScroll: enabled });
  }

  setShowTimestamps(enabled: boolean): void {
    arduinoManager.setSerialOptions({ showTimestamps: enabled });
  }

  showSettings(): void {
    this.showSettingsDialog();
  }

  // ================================
  // HELPERS
  // ================================

  private getCurrentSketchPath(): string | null {
    // Integration with your editor - get current file path
    // You'll need to integrate this with your tabManager
    const activeTab = (window as any).tabManager?.getActiveTab?.();
    if (activeTab?.filePath && arduinoService.isArduinoSketch(activeTab.filePath)) {
      return arduinoService.getSketchFolder(activeTab.filePath);
    }
    return null;
  }

  private showProgress(text: string): void {
    const overlay = this.container?.querySelector('#arduino-progress') as HTMLElement;
    const textEl = overlay?.querySelector('.arduino-progress-text');
    if (overlay && textEl) {
      textEl.textContent = text;
      overlay.style.display = 'flex';
    }
  }

  private hideProgress(): void {
    const overlay = this.container?.querySelector('#arduino-progress') as HTMLElement;
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  private showCompileResult(result: any): void {
    this.updateUI();
  }

  private showUploadResult(result: any): void {
    if (result.success) {
      this.showNotification('Upload successful!', 'success');
    } else {
      this.showNotification('Upload failed. Check output for details.', 'error');
    }
    this.updateUI();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    // Simple notification - integrate with your notification system
    console.log(`[Arduino ${type}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `arduino-notification arduino-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('arduino-notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private showSettingsDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'arduino-dialog-overlay';
    dialog.innerHTML = `
      <div class="arduino-dialog">
        <div class="arduino-dialog-header">
          <span>Arduino Settings</span>
          <button class="arduino-btn arduino-btn-icon" onclick="this.closest('.arduino-dialog-overlay').remove()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="arduino-dialog-body">
          <div class="arduino-settings-section">
            <h4>Board Manager URLs</h4>
            <p>Add URLs for additional board support (ESP32, ESP8266, etc.)</p>
            <div class="arduino-url-buttons">
              <button class="arduino-btn arduino-btn-small" onclick="arduinoPanel.setupEsp32()">
                Setup ESP32
              </button>
              <button class="arduino-btn arduino-btn-small" onclick="arduinoPanel.setupEsp8266()">
                Setup ESP8266
              </button>
            </div>
          </div>
          <div class="arduino-settings-section">
            <h4>Update Indexes</h4>
            <button class="arduino-btn" onclick="arduinoPanel.updateIndexes()">
              Update All Indexes
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
  }

  async setupEsp32(): Promise<void> {
    try {
      this.showNotification('Setting up ESP32 support...', 'info');
      await arduinoManager.setupEsp32();
      this.showNotification('ESP32 support installed!', 'success');
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }

  async setupEsp8266(): Promise<void> {
    try {
      this.showNotification('Setting up ESP8266 support...', 'info');
      await arduinoManager.setupEsp8266();
      this.showNotification('ESP8266 support installed!', 'success');
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }

  async updateIndexes(): Promise<void> {
    try {
      this.showNotification('Updating indexes...', 'info');
      await arduinoService.updateAllIndexes();
      this.showNotification('Indexes updated!', 'success');
    } catch (error) {
      this.showNotification(`Failed: ${error}`, 'error');
    }
  }

  // ================================
  // CLEANUP
  // ================================

  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.hide();
  }
}

// Export singleton and make globally accessible
export const arduinoPanel = new ArduinoPanel();
(window as any).arduinoPanel = arduinoPanel;

export default arduinoPanel;
