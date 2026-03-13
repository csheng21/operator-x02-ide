// src/ide/arduino/arduinoToolbar.ts
// Arduino Toolbar Integration - Add Arduino button to IDE toolbar

import { arduinoPanel } from './arduinoPanel';
import { arduinoManager } from './arduinoManager';

/**
 * Create the Arduino toolbar button
 */
export function createArduinoToolbarButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'toolbar-btn arduino-toolbar-btn';
  button.title = 'Arduino (Ctrl+Shift+A)';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c1.03.13 2 .45 2.87.93H13v-.93zM13 7h5.24c.25.31.48.65.68 1H13V7zm0 3h6.74c.08.33.15.66.19 1H13v-1zm0 9.93V19h2.87c-.87.48-1.84.8-2.87.93zM18.24 17H13v-1h5.92c-.2.35-.43.69-.68 1zm1.5-3H13v-1h6.93c-.04.34-.11.67-.19 1z"/>
    </svg>
  `;
  
  button.addEventListener('click', () => {
    arduinoPanel.toggle();
  });
  
  // Update button state based on Arduino status
  const updateButtonState = () => {
    const state = arduinoManager.getState();
    
    if (state.isCompiling || state.isUploading) {
      button.classList.add('arduino-btn-active');
    } else {
      button.classList.remove('arduino-btn-active');
    }
    
    if (state.isSerialConnected) {
      button.classList.add('arduino-serial-connected');
    } else {
      button.classList.remove('arduino-serial-connected');
    }
  };
  
  arduinoManager.on((event) => {
    if (event.type === 'state-changed') {
      updateButtonState();
    }
  });
  
  return button;
}

/**
 * Add Arduino button to existing toolbar
 */
export function addArduinoToToolbar(toolbarSelector: string = '.toolbar-actions'): void {
  const toolbar = document.querySelector(toolbarSelector);
  if (!toolbar) {
    console.warn('[Arduino] Toolbar not found:', toolbarSelector);
    return;
  }
  
  const button = createArduinoToolbarButton();
  toolbar.appendChild(button);
  
  console.log('🔌 [Arduino] Toolbar button added');
}

/**
 * Setup Arduino keyboard shortcuts
 */
export function setupArduinoShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A - Toggle Arduino Panel
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      arduinoPanel.toggle();
    }
    
    // Ctrl+R - Verify (when Arduino panel is open)
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
      const state = arduinoManager.getState();
      if (state.isCliInstalled && state.selectedBoard?.fqbn) {
        e.preventDefault();
        arduinoPanel.verify();
      }
    }
    
    // Ctrl+U - Upload (when Arduino panel is open)
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'u') {
      const state = arduinoManager.getState();
      if (state.isCliInstalled && state.selectedBoard?.fqbn && state.selectedPort) {
        e.preventDefault();
        arduinoPanel.upload();
      }
    }
    
    // Ctrl+Shift+M - Toggle Serial Monitor
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      arduinoPanel.toggleSerial();
    }
  });
  
  console.log('⌨️ [Arduino] Keyboard shortcuts registered');
}

// CSS for toolbar button
const toolbarStyles = document.createElement('style');
toolbarStyles.textContent = `
  .arduino-toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    color: #cccccc;
    transition: all 0.15s ease;
  }
  
  .arduino-toolbar-btn:hover {
    background: #3c3c3c;
    color: #00979d;
  }
  
  .arduino-toolbar-btn.arduino-btn-active {
    background: #00979d;
    color: white;
  }
  
  .arduino-toolbar-btn.arduino-serial-connected::after {
    content: '';
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    background: #4ec9b0;
    border-radius: 50%;
    box-shadow: 0 0 4px #4ec9b0;
  }
`;
document.head.appendChild(toolbarStyles);

export default {
  createArduinoToolbarButton,
  addArduinoToToolbar,
  setupArduinoShortcuts,
};
