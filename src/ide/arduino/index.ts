// src/ide/arduino/index.ts
// Arduino Module - Main entry point
// Export all Arduino-related functionality

export { arduinoService, COMMON_BAUD_RATES, COMMON_BOARD_URLS, POPULAR_BOARDS } from './arduinoService';
export type { 
  ArduinoBoard, 
  SerialPortInfo, 
  ArduinoCore, 
  ArduinoLibrary,
  MemoryUsage,
  CompileResult,
  ArduinoResult,
  SerialDataEvent,
  SerialErrorEvent,
} from './arduinoService';

export { arduinoManager } from './arduinoManager';
export type { ArduinoState, ArduinoEvent } from './arduinoManager';

export { arduinoPanel } from './arduinoPanel';

// Re-export CSS import for convenience
import './arduino.css';

/**
 * Initialize Arduino support
 * Call this in your main.ts after DOM is ready
 */
export function initializeArduino(): void {
  console.log('🔌 [Arduino] Module initialized');
  
  // Arduino manager auto-initializes
  // Panel can be opened via arduinoPanel.show()
}

/**
 * Add Arduino menu item to your IDE
 */
export function getArduinoMenuItems() {
  return [
    {
      label: 'Arduino',
      submenu: [
        { label: 'Open Arduino Panel', action: () => (window as any).arduinoPanel?.toggle() },
        { type: 'separator' },
        { label: 'Verify/Compile', action: () => (window as any).arduinoPanel?.verify(), shortcut: 'Ctrl+R' },
        { label: 'Upload', action: () => (window as any).arduinoPanel?.upload(), shortcut: 'Ctrl+U' },
        { type: 'separator' },
        { label: 'Serial Monitor', action: () => (window as any).arduinoPanel?.toggleSerial() },
        { type: 'separator' },
        { label: 'Refresh Boards', action: () => (window as any).arduinoPanel?.refreshBoards() },
      ],
    },
  ];
}

/**
 * Arduino keyboard shortcuts
 */
export const ARDUINO_SHORTCUTS = {
  'Ctrl+Shift+A': () => (window as any).arduinoPanel?.toggle(),
  'Ctrl+R': () => (window as any).arduinoPanel?.verify(),
  'Ctrl+U': () => (window as any).arduinoPanel?.upload(),
  'Ctrl+Shift+M': () => (window as any).arduinoPanel?.toggleSerial(),
};
