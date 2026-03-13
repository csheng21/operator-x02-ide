// =============================================================================
// arduinoPinVisualizer.ts
// Phase 2: Live serial data + animated pin states
// Phase 3: AI hover tooltips, conflict detection, wiring suggestions
// =============================================================================
// Integration: Called from buildSystemUI.ts Arduino menu
// Dependencies: serial_commands.rs (existing), apiProviderManager.ts (existing)
// =============================================================================

import { invoke } from '@tauri-apps/api/core';

// =============================================================================
// TYPES
// =============================================================================

interface PinDefinition {
  id: number;
  label: string;
  altLabels: string[];          // e.g. ["A0", "D14"]
  type: 'digital' | 'analog' | 'power' | 'gnd' | 'special';
  capabilities: PinCapability[];
  side: 'left' | 'right' | 'top' | 'bottom';
  position: number;             // Index along that side
  x: number; y: number;        // SVG coordinates (computed)
}

type PinCapability = 'digital_in' | 'digital_out' | 'analog_in' | 'pwm' | 'i2c_sda' | 'i2c_scl' 
  | 'spi_mosi' | 'spi_miso' | 'spi_sck' | 'spi_ss' | 'uart_tx' | 'uart_rx' | 'interrupt' | 'power' | 'gnd';

type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'PWM' | 'ANALOG_IN' | 'SERVO' | 'I2C' | 'SPI' | 'UART' | 'UNUSED';

interface PinState {
  mode: PinMode;
  value: number;              // 0-1 digital, 0-1023 analog, 0-255 PWM
  active: boolean;
  label: string;              // User label from code (e.g. "LED_PIN")
  codeRefs: CodeReference[];
  lastUpdated: number;
  conflict?: PinConflict;
}

interface CodeReference {
  file: string;
  line: number;
  code: string;
  type: 'pinMode' | 'digitalWrite' | 'digitalRead' | 'analogRead' | 'analogWrite' | 'servo' | 'define';
}

interface PinConflict {
  severity: 'error' | 'warning';
  message: string;
  refs: CodeReference[];
}

interface WiringSuggestion {
  pin: number;
  component: string;
  description: string;
  wiring: string;
  code: string;
}

interface SerialPinReport {
  pin: number;
  value: number;
  mode: string;
}

// =============================================================================
// ARDUINO UNO PIN DEFINITIONS
// =============================================================================

const ARDUINO_UNO_PINS: PinDefinition[] = [
  // Left side (top to bottom) - Digital pins
  { id: 13, label: 'D13', altLabels: ['SCK', 'LED_BUILTIN'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'spi_sck'], side: 'right', position: 0, x: 0, y: 0 },
  { id: 12, label: 'D12', altLabels: ['MISO'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'spi_miso'], side: 'right', position: 1, x: 0, y: 0 },
  { id: 11, label: 'D11', altLabels: ['MOSI', '~11'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm', 'spi_mosi'], side: 'right', position: 2, x: 0, y: 0 },
  { id: 10, label: 'D10', altLabels: ['SS', '~10'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm', 'spi_ss'], side: 'right', position: 3, x: 0, y: 0 },
  { id: 9,  label: 'D9',  altLabels: ['~9'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm'], side: 'right', position: 4, x: 0, y: 0 },
  { id: 8,  label: 'D8',  altLabels: [], type: 'digital', capabilities: ['digital_in', 'digital_out'], side: 'right', position: 5, x: 0, y: 0 },
  { id: 7,  label: 'D7',  altLabels: [], type: 'digital', capabilities: ['digital_in', 'digital_out'], side: 'right', position: 6, x: 0, y: 0 },
  { id: 6,  label: 'D6',  altLabels: ['~6'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm'], side: 'right', position: 7, x: 0, y: 0 },
  { id: 5,  label: 'D5',  altLabels: ['~5'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm'], side: 'right', position: 8, x: 0, y: 0 },
  { id: 4,  label: 'D4',  altLabels: [], type: 'digital', capabilities: ['digital_in', 'digital_out'], side: 'right', position: 9, x: 0, y: 0 },
  { id: 3,  label: 'D3',  altLabels: ['~3', 'INT1'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'pwm', 'interrupt'], side: 'right', position: 10, x: 0, y: 0 },
  { id: 2,  label: 'D2',  altLabels: ['INT0'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'interrupt'], side: 'right', position: 11, x: 0, y: 0 },
  { id: 1,  label: 'D1',  altLabels: ['TX'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'uart_tx'], side: 'right', position: 12, x: 0, y: 0 },
  { id: 0,  label: 'D0',  altLabels: ['RX'], type: 'digital', capabilities: ['digital_in', 'digital_out', 'uart_rx'], side: 'right', position: 13, x: 0, y: 0 },

  // Left side - Analog pins + power
  { id: 14, label: 'A0', altLabels: ['D14'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out'], side: 'left', position: 0, x: 0, y: 0 },
  { id: 15, label: 'A1', altLabels: ['D15'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out'], side: 'left', position: 1, x: 0, y: 0 },
  { id: 16, label: 'A2', altLabels: ['D16'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out'], side: 'left', position: 2, x: 0, y: 0 },
  { id: 17, label: 'A3', altLabels: ['D17'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out'], side: 'left', position: 3, x: 0, y: 0 },
  { id: 18, label: 'A4', altLabels: ['D18', 'SDA'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out', 'i2c_sda'], side: 'left', position: 4, x: 0, y: 0 },
  { id: 19, label: 'A5', altLabels: ['D19', 'SCL'], type: 'analog', capabilities: ['analog_in', 'digital_in', 'digital_out', 'i2c_scl'], side: 'left', position: 5, x: 0, y: 0 },

  // Power pins
  { id: -1, label: '5V', altLabels: [], type: 'power', capabilities: ['power'], side: 'left', position: 7, x: 0, y: 0 },
  { id: -2, label: '3.3V', altLabels: [], type: 'power', capabilities: ['power'], side: 'left', position: 8, x: 0, y: 0 },
  { id: -3, label: 'GND', altLabels: [], type: 'gnd', capabilities: ['gnd'], side: 'left', position: 9, x: 0, y: 0 },
  { id: -4, label: 'GND', altLabels: [], type: 'gnd', capabilities: ['gnd'], side: 'right', position: 14, x: 0, y: 0 },
  { id: -5, label: 'VIN', altLabels: [], type: 'power', capabilities: ['power'], side: 'left', position: 10, x: 0, y: 0 },
  { id: -6, label: 'RESET', altLabels: [], type: 'special', capabilities: [], side: 'left', position: 11, x: 0, y: 0 },
  { id: -7, label: 'AREF', altLabels: [], type: 'special', capabilities: [], side: 'right', position: 15, x: 0, y: 0 },
];


// =============================================================================
// CODE PARSER - Extracts pin usage from .ino files
// =============================================================================

class ArduinoCodeParser {
  private defines: Map<string, number> = new Map();
  public detectedBaudRate: number = 0; // Extracted from Serial.begin()
  public pinDefineNames: Map<number, string[]> = new Map(); // pin → [user define names]
  
  // Names that are built-in — don't show as user labels
  private builtinNames = new Set([
    'LED_BUILTIN', 'LED_PIN',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    'SDA', 'SCL', 'SS', 'MOSI', 'MISO', 'SCK',
    'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
  ]);
  
  /**
   * Parse all .ino and .h files to extract pin usage
   */
  parseCode(files: { name: string; content: string }[]): Map<number, PinState> {
    const pinStates = new Map<number, PinState>();
    this.defines.clear();
    this.pinDefineNames.clear();
    
    // Built-in defines
    this.defines.set('LED_BUILTIN', 13);
    this.defines.set('LED_PIN', 13);
    this.defines.set('A0', 14); this.defines.set('A1', 15);
    this.defines.set('A2', 16); this.defines.set('A3', 17);
    this.defines.set('A4', 18); this.defines.set('A5', 19);
    this.defines.set('SDA', 18); this.defines.set('SCL', 19);
    this.defines.set('SS', 10);  this.defines.set('MOSI', 11);
    this.defines.set('MISO', 12); this.defines.set('SCK', 13);
    
    // Pass 1: Extract #define and const int pin definitions
    for (const file of files) {
      this.extractDefines(file.name, file.content);
    }
    
    // Build reverse mapping: pin number → user define names
    this.defines.forEach((pinNum, name) => {
      if (this.builtinNames.has(name)) return;
      // Also skip if it resolves to a non-pin value (>25 is not a valid Uno pin)
      if (pinNum < 0 || pinNum > 25) return;
      if (!this.pinDefineNames.has(pinNum)) this.pinDefineNames.set(pinNum, []);
      this.pinDefineNames.get(pinNum)!.push(name);
    });
    
    // Pass 2: Extract pin usage
    for (const file of files) {
      this.extractPinUsage(file.name, file.content, pinStates);
    }
    
    // Pass 3: Apply define names as labels where not already set
    this.pinDefineNames.forEach((names, pinNum) => {
      if (pinStates.has(pinNum)) {
        const state = pinStates.get(pinNum)!;
        if (!state.label || state.label === 'RX' || state.label === 'TX') {
          // Keep RX/TX but prepend user name
          const userLabel = names[0]; // Use first define name
          if (state.label === 'RX' || state.label === 'TX') {
            state.label = `${userLabel} (${state.label})`;
          } else {
            state.label = userLabel;
          }
        }
      }
    });
    
    return pinStates;
  }
  
  private extractDefines(fileName: string, code: string): void {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // #define PIN_NAME value (numeric)
      const defineMatch = line.match(/^#define\s+(\w+)\s+(\d+)/);
      if (defineMatch) {
        this.defines.set(defineMatch[1], parseInt(defineMatch[2]));
        continue;
      }
      
      // #define PIN_NAME A0..A5 (analog pin reference)
      const defineAnalogMatch = line.match(/^#define\s+(\w+)\s+(A[0-5])\b/);
      if (defineAnalogMatch) {
        const pinNum = 14 + parseInt(defineAnalogMatch[2][1]);
        this.defines.set(defineAnalogMatch[1], pinNum);
        continue;
      }
      
      // const int pinName = value;
      const constMatch = line.match(/(?:const\s+)?(?:int|uint8_t|byte)\s+(\w+)\s*=\s*(\d+)/);
      if (constMatch) {
        this.defines.set(constMatch[1], parseInt(constMatch[2]));
        continue;
      }
      
      // const int pinName = A0..A5;
      const constAnalogMatch = line.match(/(?:const\s+)?(?:int|uint8_t|byte)\s+(\w+)\s*=\s*(A[0-5])\s*;/);
      if (constAnalogMatch) {
        const pinNum = 14 + parseInt(constAnalogMatch[2][1]);
        this.defines.set(constAnalogMatch[1], pinNum);
      }
    }
  }
  
  private resolvePin(expr: string): number | null {
    const trimmed = expr.trim();
    const num = parseInt(trimmed);
    if (!isNaN(num)) return num;
    
    // Check analog pin shorthand
    const analogMatch = trimmed.match(/^A(\d+)$/);
    if (analogMatch) return 14 + parseInt(analogMatch[1]);
    
    // Check defines
    if (this.defines.has(trimmed)) return this.defines.get(trimmed)!;
    
    return null;
  }
  
  private extractPinUsage(fileName: string, code: string, pinStates: Map<number, PinState>): void {
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;
      
      // pinMode(pin, MODE)
      const pinModeMatch = line.match(/pinMode\s*\(\s*([^,]+)\s*,\s*(INPUT|OUTPUT|INPUT_PULLUP)\s*\)/);
      if (pinModeMatch) {
        const pin = this.resolvePin(pinModeMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          state.mode = pinModeMatch[2] as PinMode;
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'pinMode' });
          
          // Try to find user label
          const labelMatch = pinModeMatch[1].trim();
          if (isNaN(parseInt(labelMatch)) && labelMatch !== 'LED_BUILTIN') {
            state.label = labelMatch;
          }
        }
      }
      
      // digitalWrite(pin, value)
      const dwMatch = line.match(/digitalWrite\s*\(\s*([^,]+)\s*,\s*(HIGH|LOW|0|1|\w+)\s*\)/);
      if (dwMatch) {
        const pin = this.resolvePin(dwMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          if (state.mode === 'UNUSED') state.mode = 'OUTPUT';
          state.value = (dwMatch[2] === 'HIGH' || dwMatch[2] === '1') ? 1 : 0;
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'digitalWrite' });
        }
      }
      
      // digitalRead(pin)
      const drMatch = line.match(/digitalRead\s*\(\s*([^)]+)\s*\)/);
      if (drMatch) {
        const pin = this.resolvePin(drMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          if (state.mode === 'UNUSED') state.mode = 'INPUT';
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'digitalRead' });
        }
      }
      
      // analogRead(pin)
      const arMatch = line.match(/analogRead\s*\(\s*([^)]+)\s*\)/);
      if (arMatch) {
        const pin = this.resolvePin(arMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          state.mode = 'ANALOG_IN';
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'analogRead' });
        }
      }
      
      // analogWrite(pin, value) - PWM
      const awMatch = line.match(/analogWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
      if (awMatch) {
        const pin = this.resolvePin(awMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          state.mode = 'PWM';
          const val = parseInt(awMatch[2]);
          if (!isNaN(val)) state.value = val;
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'analogWrite' });
        }
      }
      
      // Servo.attach(pin)
      const servoMatch = line.match(/\.attach\s*\(\s*(\d+|[A-Z_]+)\s*\)/);
      if (servoMatch) {
        const pin = this.resolvePin(servoMatch[1]);
        if (pin !== null) {
          this.ensurePinState(pinStates, pin);
          const state = pinStates.get(pin)!;
          state.mode = 'SERVO';
          state.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'servo' });
        }
      }
      
      // Wire.begin() - I2C
      if (line.match(/Wire\.begin\s*\(/)) {
        this.ensurePinState(pinStates, 18); // SDA
        this.ensurePinState(pinStates, 19); // SCL
        pinStates.get(18)!.mode = 'I2C';
        pinStates.get(19)!.mode = 'I2C';
        pinStates.get(18)!.label = 'SDA';
        pinStates.get(19)!.label = 'SCL';
        pinStates.get(18)!.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'define' });
        pinStates.get(19)!.codeRefs.push({ file: fileName, line: lineNum, code: line.trim(), type: 'define' });
      }
      
      // SPI.begin()
      if (line.match(/SPI\.begin\s*\(/)) {
        [10, 11, 12, 13].forEach(p => {
          this.ensurePinState(pinStates, p);
          pinStates.get(p)!.mode = 'SPI';
        });
      }
      
      // Serial.begin() - marks D0/D1 and extract baud rate
      const serialMatch = line.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
      if (serialMatch) {
        this.ensurePinState(pinStates, 0);
        this.ensurePinState(pinStates, 1);
        pinStates.get(0)!.mode = 'UART';
        pinStates.get(1)!.mode = 'UART';
        pinStates.get(0)!.label = 'RX';
        pinStates.get(1)!.label = 'TX';
        this.detectedBaudRate = parseInt(serialMatch[1]);
      }
    }
  }
  
  private ensurePinState(pinStates: Map<number, PinState>, pin: number): void {
    if (!pinStates.has(pin)) {
      pinStates.set(pin, {
        mode: 'UNUSED',
        value: 0,
        active: false,
        label: '',
        codeRefs: [],
        lastUpdated: Date.now(),
      });
    }
  }
}


// =============================================================================
// CONFLICT DETECTOR
// =============================================================================

class PinConflictDetector {
  detect(pinStates: Map<number, PinState>): PinConflict[] {
    const conflicts: PinConflict[] = [];
    
    pinStates.forEach((state, pin) => {
      if (state.mode === 'UNUSED') return;
      
      // Check mode conflicts within same pin
      const modeTypes = new Set<string>();
      state.codeRefs.forEach(ref => {
        if (ref.type === 'pinMode') {
          const m = ref.code.match(/(INPUT|OUTPUT|INPUT_PULLUP)/);
          if (m) modeTypes.add(m[1]);
        }
        if (ref.type === 'digitalRead') modeTypes.add('READ');
        if (ref.type === 'digitalWrite') modeTypes.add('WRITE');
        if (ref.type === 'analogRead') modeTypes.add('ANALOG_READ');
        if (ref.type === 'analogWrite') modeTypes.add('PWM_WRITE');
      });
      
      // Conflict: Writing to an INPUT pin
      if (modeTypes.has('INPUT') && modeTypes.has('WRITE')) {
        const conflict: PinConflict = {
          severity: 'error',
          message: `Pin ${pin}: digitalWrite() on INPUT pin — set to OUTPUT first`,
          refs: state.codeRefs,
        };
        conflicts.push(conflict);
        state.conflict = conflict;
      }
      
      // Conflict: Reading from an OUTPUT pin (warning)
      if (modeTypes.has('OUTPUT') && modeTypes.has('READ')) {
        const conflict: PinConflict = {
          severity: 'warning',
          message: `Pin ${pin}: digitalRead() on OUTPUT pin — this reads back the output state, is this intentional?`,
          refs: state.codeRefs,
        };
        conflicts.push(conflict);
        state.conflict = conflict;
      }
      
      // Conflict: analogWrite on non-PWM pin
      if (modeTypes.has('PWM_WRITE')) {
        const def = ARDUINO_UNO_PINS.find(p => p.id === pin);
        if (def && !def.capabilities.includes('pwm')) {
          const conflict: PinConflict = {
            severity: 'error',
            message: `Pin ${pin}: analogWrite() used but this pin does NOT support PWM. Use pins 3, 5, 6, 9, 10, or 11.`,
            refs: state.codeRefs,
          };
          conflicts.push(conflict);
          state.conflict = conflict;
        }
      }
      
      // Conflict: Using TX/RX pins while Serial is active
      if ((pin === 0 || pin === 1) && state.mode !== 'UART' && state.mode !== 'UNUSED') {
        // Check if Serial is being used
        let serialActive = false;
        pinStates.forEach((s) => {
          if (s.mode === 'UART') serialActive = true;
        });
        if (serialActive) {
          const conflict: PinConflict = {
            severity: 'warning',
            message: `Pin ${pin} (${pin === 0 ? 'RX' : 'TX'}): Used for both Serial communication and GPIO — may cause upload/communication issues.`,
            refs: state.codeRefs,
          };
          conflicts.push(conflict);
          state.conflict = conflict;
        }
      }
      
      // Conflict: I2C pins used as regular GPIO while Wire is active
      if ((pin === 18 || pin === 19)) {
        let i2cActive = false;
        pinStates.forEach((s) => {
          if (s.mode === 'I2C') i2cActive = true;
        });
        if (i2cActive && state.mode !== 'I2C') {
          const conflict: PinConflict = {
            severity: 'error',
            message: `Pin ${pin} (${pin === 18 ? 'SDA' : 'SCL'}): Wire (I2C) is active but pin is also used as GPIO — this will break I2C.`,
            refs: state.codeRefs,
          };
          conflicts.push(conflict);
          state.conflict = conflict;
        }
      }
    });
    
    return conflicts;
  }
}


// =============================================================================
// SVG BOARD RENDERER
// =============================================================================

class BoardRenderer {
  private svgNS = 'http://www.w3.org/2000/svg';
  private width = 680;
  private height = 460;
  private boardX = 140;
  private boardY = 30;
  private boardW = 400;
  private boardH = 400;
  private pinElements: Map<number, SVGElement> = new Map();
  private glowElements: Map<number, SVGElement> = new Map();
  private valueElements: Map<number, SVGTextElement> = new Map();
  private barElements: Map<number, SVGRectElement> = new Map();
  private userLabelElements: Map<number, SVGTextElement> = new Map();
  
  createSVG(container: HTMLElement): SVGSVGElement {
    const svg = document.createElementNS(this.svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'max-width: 680px; max-height: 460px;';
    
    // Defs: filters, gradients
    const defs = document.createElementNS(this.svgNS, 'defs');
    
    // Glow filter
    defs.innerHTML = `
      <filter id="pin-glow-high" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="pin-glow-low" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="board-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      <linearGradient id="board-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a6b50"/>
        <stop offset="100%" stop-color="#0d4a35"/>
      </linearGradient>
      <linearGradient id="chip-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2a2a2a"/>
        <stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient>
    `;
    svg.appendChild(defs);
    
    // Board body
    this.drawBoard(svg);
    
    // Compute pin positions
    this.computePinPositions();
    
    // Draw pins
    ARDUINO_UNO_PINS.forEach(pin => {
      this.drawPin(svg, pin);
    });
    
    container.appendChild(svg);
    return svg;
  }
  
  private drawBoard(svg: SVGSVGElement): void {
    // PCB
    const pcb = document.createElementNS(this.svgNS, 'rect');
    pcb.setAttribute('x', String(this.boardX));
    pcb.setAttribute('y', String(this.boardY));
    pcb.setAttribute('width', String(this.boardW));
    pcb.setAttribute('height', String(this.boardH));
    pcb.setAttribute('rx', '8');
    pcb.setAttribute('fill', 'url(#board-gradient)');
    pcb.setAttribute('stroke', '#0a3525');
    pcb.setAttribute('stroke-width', '2');
    pcb.setAttribute('filter', 'url(#board-shadow)');
    svg.appendChild(pcb);
    
    // Board label
    const label = document.createElementNS(this.svgNS, 'text');
    label.setAttribute('x', String(this.boardX + this.boardW / 2));
    label.setAttribute('y', String(this.boardY + 30));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#7cc9a8');
    label.setAttribute('font-size', '16');
    label.setAttribute('font-weight', '700');
    label.setAttribute('font-family', "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace");
    label.textContent = 'ARDUINO UNO';
    svg.appendChild(label);
    
    // ATmega328P chip
    const chipX = this.boardX + 150;
    const chipY = this.boardY + 130;
    const chip = document.createElementNS(this.svgNS, 'rect');
    chip.setAttribute('x', String(chipX));
    chip.setAttribute('y', String(chipY));
    chip.setAttribute('width', '100');
    chip.setAttribute('height', '120');
    chip.setAttribute('rx', '4');
    chip.setAttribute('fill', 'url(#chip-gradient)');
    chip.setAttribute('stroke', '#444');
    chip.setAttribute('stroke-width', '1');
    svg.appendChild(chip);
    
    // Chip label
    const chipLabel = document.createElementNS(this.svgNS, 'text');
    chipLabel.setAttribute('x', String(chipX + 50));
    chipLabel.setAttribute('y', String(chipY + 55));
    chipLabel.setAttribute('text-anchor', 'middle');
    chipLabel.setAttribute('fill', '#888');
    chipLabel.setAttribute('font-size', '8');
    chipLabel.setAttribute('font-family', 'monospace');
    chipLabel.textContent = 'ATmega328P';
    svg.appendChild(chipLabel);
    
    // Chip notch
    const notch = document.createElementNS(this.svgNS, 'circle');
    notch.setAttribute('cx', String(chipX + 50));
    notch.setAttribute('cy', String(chipY + 8));
    notch.setAttribute('r', '4');
    notch.setAttribute('fill', 'none');
    notch.setAttribute('stroke', '#555');
    notch.setAttribute('stroke-width', '1');
    svg.appendChild(notch);
    
    // USB connector
    const usbX = this.boardX + this.boardW / 2 - 25;
    const usbY = this.boardY + this.boardH - 40;
    const usb = document.createElementNS(this.svgNS, 'rect');
    usb.setAttribute('x', String(usbX));
    usb.setAttribute('y', String(usbY));
    usb.setAttribute('width', '50');
    usb.setAttribute('height', '35');
    usb.setAttribute('rx', '3');
    usb.setAttribute('fill', '#c0c0c0');
    usb.setAttribute('stroke', '#999');
    usb.setAttribute('stroke-width', '1');
    svg.appendChild(usb);
    
    const usbLabel = document.createElementNS(this.svgNS, 'text');
    usbLabel.setAttribute('x', String(usbX + 25));
    usbLabel.setAttribute('y', String(usbY + 20));
    usbLabel.setAttribute('text-anchor', 'middle');
    usbLabel.setAttribute('fill', '#666');
    usbLabel.setAttribute('font-size', '7');
    usbLabel.setAttribute('font-family', 'monospace');
    usbLabel.textContent = 'USB';
    svg.appendChild(usbLabel);
    
    // Power LED
    const ledX = this.boardX + 80;
    const ledY = this.boardY + this.boardH - 60;
    const led = document.createElementNS(this.svgNS, 'circle');
    led.setAttribute('cx', String(ledX));
    led.setAttribute('cy', String(ledY));
    led.setAttribute('r', '4');
    led.setAttribute('fill', '#33ff33');
    led.setAttribute('opacity', '0.9');
    led.setAttribute('filter', 'url(#pin-glow-high)');
    svg.appendChild(led);
    
    const ledLabel = document.createElementNS(this.svgNS, 'text');
    ledLabel.setAttribute('x', String(ledX));
    ledLabel.setAttribute('y', String(ledY + 14));
    ledLabel.setAttribute('text-anchor', 'middle');
    ledLabel.setAttribute('fill', '#7cc9a8');
    ledLabel.setAttribute('font-size', '7');
    ledLabel.setAttribute('font-family', 'monospace');
    ledLabel.textContent = 'PWR';
    svg.appendChild(ledLabel);
    
    // Reset button
    const rstX = this.boardX + this.boardW - 80;
    const rstY = this.boardY + this.boardH - 60;
    const rst = document.createElementNS(this.svgNS, 'circle');
    rst.setAttribute('cx', String(rstX));
    rst.setAttribute('cy', String(rstY));
    rst.setAttribute('r', '8');
    rst.setAttribute('fill', '#c44');
    rst.setAttribute('stroke', '#922');
    rst.setAttribute('stroke-width', '1');
    svg.appendChild(rst);
    
    const rstLabel = document.createElementNS(this.svgNS, 'text');
    rstLabel.setAttribute('x', String(rstX));
    rstLabel.setAttribute('y', String(rstY + 22));
    rstLabel.setAttribute('text-anchor', 'middle');
    rstLabel.setAttribute('fill', '#7cc9a8');
    rstLabel.setAttribute('font-size', '7');
    rstLabel.setAttribute('font-family', 'monospace');
    rstLabel.textContent = 'RESET';
    svg.appendChild(rstLabel);
  }
  
  private computePinPositions(): void {
    const leftPins = ARDUINO_UNO_PINS.filter(p => p.side === 'left').sort((a, b) => a.position - b.position);
    const rightPins = ARDUINO_UNO_PINS.filter(p => p.side === 'right').sort((a, b) => a.position - b.position);
    
    const pinSpacing = 22;
    const leftStartY = this.boardY + 55;
    const rightStartY = this.boardY + 55;
    
    leftPins.forEach((pin, i) => {
      pin.x = this.boardX - 6;
      pin.y = leftStartY + i * pinSpacing;
    });
    
    rightPins.forEach((pin, i) => {
      pin.x = this.boardX + this.boardW + 6;
      pin.y = rightStartY + i * pinSpacing;
    });
  }
  
  private drawPin(svg: SVGSVGElement, pin: PinDefinition): void {
    const g = document.createElementNS(this.svgNS, 'g');
    g.setAttribute('class', `pin-group pin-${pin.id}`);
    g.setAttribute('data-pin-id', String(pin.id));
    g.style.cursor = 'pointer';
    
    const isLeft = pin.side === 'left';
    
    // Pin header hole (gold circle)
    const hole = document.createElementNS(this.svgNS, 'circle');
    hole.setAttribute('cx', String(pin.x));
    hole.setAttribute('cy', String(pin.y));
    hole.setAttribute('r', '5');
    hole.setAttribute('stroke-width', '1.5');
    
    // Color by type
    const baseColor = this.getPinBaseColor(pin);
    hole.setAttribute('fill', baseColor);
    hole.setAttribute('stroke', this.darken(baseColor));
    svg.appendChild(hole);
    this.pinElements.set(pin.id, hole);
    
    // Glow element (hidden by default)
    const glow = document.createElementNS(this.svgNS, 'circle');
    glow.setAttribute('cx', String(pin.x));
    glow.setAttribute('cy', String(pin.y));
    glow.setAttribute('r', '8');
    glow.setAttribute('fill', 'transparent');
    glow.setAttribute('stroke', 'transparent');
    glow.setAttribute('stroke-width', '2');
    glow.setAttribute('opacity', '0');
    svg.appendChild(glow);
    this.glowElements.set(pin.id, glow);
    
    // Pin label (D13, A0, etc.)
    const label = document.createElementNS(this.svgNS, 'text');
    label.setAttribute('x', String(isLeft ? pin.x - 14 : pin.x + 14));
    label.setAttribute('y', String(pin.y + 4));
    label.setAttribute('text-anchor', isLeft ? 'end' : 'start');
    label.setAttribute('fill', '#ccc');
    label.setAttribute('font-size', '10');
    label.setAttribute('font-weight', '600');
    label.setAttribute('font-family', "'JetBrains Mono', monospace");
    label.textContent = pin.label;
    svg.appendChild(label);
    
    // User label (shows #define name from code, e.g. "DIGITAL_PIN_2")
    // Positioned above the pin label
    const userLabel = document.createElementNS(this.svgNS, 'text');
    userLabel.setAttribute('x', String(isLeft ? pin.x - 14 : pin.x + 14));
    userLabel.setAttribute('y', String(pin.y - 8));
    userLabel.setAttribute('text-anchor', isLeft ? 'end' : 'start');
    userLabel.setAttribute('fill', '#58A6FF');
    userLabel.setAttribute('font-size', '7');
    userLabel.setAttribute('font-weight', '600');
    userLabel.setAttribute('font-family', "'JetBrains Mono', monospace");
    userLabel.setAttribute('opacity', '0');
    svg.appendChild(userLabel);
    this.userLabelElements.set(pin.id, userLabel);
    
    // Value text (hidden by default)
    const valueTxt = document.createElementNS(this.svgNS, 'text');
    valueTxt.setAttribute('x', String(isLeft ? pin.x - 50 : pin.x + 50));
    valueTxt.setAttribute('y', String(pin.y + 4));
    valueTxt.setAttribute('text-anchor', 'middle');
    valueTxt.setAttribute('fill', '#4EC9B0');
    valueTxt.setAttribute('font-size', '9');
    valueTxt.setAttribute('font-weight', '700');
    valueTxt.setAttribute('font-family', 'monospace');
    valueTxt.setAttribute('opacity', '0');
    svg.appendChild(valueTxt);
    this.valueElements.set(pin.id, valueTxt);
    
    // Analog bar (for analog/PWM pins)
    if (pin.type === 'analog' || pin.capabilities.includes('pwm')) {
      const barWidth = 40;
      const barX = isLeft ? pin.x - 95 : pin.x + 32;
      const bar = document.createElementNS(this.svgNS, 'rect');
      bar.setAttribute('x', String(barX));
      bar.setAttribute('y', String(pin.y - 3));
      bar.setAttribute('width', '0');
      bar.setAttribute('height', '6');
      bar.setAttribute('rx', '2');
      bar.setAttribute('fill', '#4EC9B0');
      bar.setAttribute('opacity', '0');
      svg.appendChild(bar);
      this.barElements.set(pin.id, bar);
    }
    
    // PWM wave indicator (~)
    if (pin.capabilities.includes('pwm')) {
      const pwmLabel = document.createElementNS(this.svgNS, 'text');
      pwmLabel.setAttribute('x', String(isLeft ? pin.x - 14 : pin.x + 14));
      pwmLabel.setAttribute('y', String(pin.y - 6));
      pwmLabel.setAttribute('text-anchor', isLeft ? 'end' : 'start');
      pwmLabel.setAttribute('fill', '#569CD6');
      pwmLabel.setAttribute('font-size', '8');
      pwmLabel.setAttribute('font-family', 'monospace');
      pwmLabel.setAttribute('opacity', '0.4');
      pwmLabel.textContent = '~';
      svg.appendChild(pwmLabel);
    }
    
    // Trace line from pin to board edge
    const traceLine = document.createElementNS(this.svgNS, 'line');
    traceLine.setAttribute('x1', String(pin.x));
    traceLine.setAttribute('y1', String(pin.y));
    traceLine.setAttribute('x2', String(isLeft ? this.boardX : this.boardX + this.boardW));
    traceLine.setAttribute('y2', String(pin.y));
    traceLine.setAttribute('stroke', baseColor);
    traceLine.setAttribute('stroke-width', '1');
    traceLine.setAttribute('opacity', '0.15');
    svg.appendChild(traceLine);
    
    // Invisible hit area for hover/click
    const hitArea = document.createElementNS(this.svgNS, 'rect');
    hitArea.setAttribute('x', String(isLeft ? pin.x - 100 : pin.x - 8));
    hitArea.setAttribute('y', String(pin.y - 10));
    hitArea.setAttribute('width', '108');
    hitArea.setAttribute('height', '20');
    hitArea.setAttribute('fill', 'transparent');
    hitArea.style.cursor = 'pointer';
    g.appendChild(hitArea);
    
    svg.appendChild(g);
  }
  
  private getPinBaseColor(pin: PinDefinition): string {
    switch (pin.type) {
      case 'digital': return '#D4A843'; // Gold
      case 'analog': return '#4EC9B0';  // Teal
      case 'power': return '#E74C3C';   // Red
      case 'gnd': return '#555';        // Dark gray
      case 'special': return '#888';    // Gray
      default: return '#888';
    }
  }
  
  private darken(hex: string): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // =========================================================================
  // ANIMATION: Update pin visual state
  // =========================================================================
  
  updatePinState(pinId: number, state: PinState): void {
    const hole = this.pinElements.get(pinId);
    const glow = this.glowElements.get(pinId);
    const valueTxt = this.valueElements.get(pinId);
    const bar = this.barElements.get(pinId);
    
    if (!hole) return;
    
    // Mode colors
    const modeColors: Record<string, string> = {
      'OUTPUT':       '#E8B839',
      'INPUT':        '#4EC9B0',
      'INPUT_PULLUP': '#3CB371',
      'ANALOG_IN':    '#569CD6',
      'PWM':          '#CE9178',
      'SERVO':        '#C586C0',
      'I2C':          '#DCDCAA',
      'SPI':          '#D7BA7D',
      'UART':         '#F48771',
      'UNUSED':       '#666',
    };
    
    const color = modeColors[state.mode] || '#666';
    hole.setAttribute('fill', color);
    hole.setAttribute('stroke', this.darken(color));
    
    // Glow based on value
    if (glow) {
      if (state.mode === 'OUTPUT' && state.value > 0) {
        // HIGH = bright glow
        glow.setAttribute('stroke', '#FFD700');
        glow.setAttribute('fill', 'rgba(255, 215, 0, 0.15)');
        glow.setAttribute('opacity', '1');
        glow.setAttribute('filter', 'url(#pin-glow-high)');
      } else if (state.mode === 'PWM') {
        // PWM = pulsing glow intensity
        const intensity = state.value / 255;
        glow.setAttribute('stroke', `rgba(206, 145, 120, ${intensity})`);
        glow.setAttribute('fill', `rgba(206, 145, 120, ${intensity * 0.15})`);
        glow.setAttribute('opacity', String(intensity));
        glow.setAttribute('filter', 'url(#pin-glow-low)');
      } else if (state.mode === 'ANALOG_IN' && state.value > 0) {
        const intensity = state.value / 1023;
        glow.setAttribute('stroke', `rgba(86, 156, 214, ${intensity})`);
        glow.setAttribute('fill', `rgba(86, 156, 214, ${intensity * 0.1})`);
        glow.setAttribute('opacity', String(Math.max(0.3, intensity)));
        glow.setAttribute('filter', 'url(#pin-glow-low)');
      } else if (state.mode !== 'UNUSED') {
        glow.setAttribute('stroke', color);
        glow.setAttribute('opacity', '0.3');
        glow.setAttribute('fill', 'transparent');
        glow.removeAttribute('filter');
      } else {
        glow.setAttribute('opacity', '0');
      }
    }
    
    // Value text
    if (valueTxt) {
      if (state.mode === 'UNUSED') {
        valueTxt.setAttribute('opacity', '0');
      } else {
        valueTxt.setAttribute('opacity', '1');
        valueTxt.setAttribute('fill', color);
        
        if (state.mode === 'OUTPUT') {
          valueTxt.textContent = state.value > 0 ? 'HIGH' : 'LOW';
        } else if (state.mode === 'ANALOG_IN') {
          valueTxt.textContent = String(Math.round(state.value));
        } else if (state.mode === 'PWM') {
          valueTxt.textContent = `${Math.round(state.value / 255 * 100)}%`;
        } else if (state.mode === 'INPUT' || state.mode === 'INPUT_PULLUP') {
          valueTxt.textContent = state.value > 0 ? 'HIGH' : 'LOW';
        } else {
          valueTxt.textContent = state.mode;
        }
      }
    }
    
    // Analog bar
    if (bar) {
      if (state.mode === 'ANALOG_IN') {
        const maxWidth = 40;
        const w = (state.value / 1023) * maxWidth;
        bar.setAttribute('width', String(w));
        bar.setAttribute('fill', '#569CD6');
        bar.setAttribute('opacity', '0.7');
      } else if (state.mode === 'PWM') {
        const maxWidth = 40;
        const w = (state.value / 255) * maxWidth;
        bar.setAttribute('width', String(w));
        bar.setAttribute('fill', '#CE9178');
        bar.setAttribute('opacity', '0.7');
      } else {
        bar.setAttribute('opacity', '0');
      }
    }
    
    // Conflict indicator
    if (state.conflict) {
      hole.setAttribute('stroke', state.conflict.severity === 'error' ? '#FF4444' : '#FFAA00');
      hole.setAttribute('stroke-width', '3');
      hole.setAttribute('stroke-dasharray', '3,2');
    } else {
      hole.setAttribute('stroke-width', '1.5');
      hole.removeAttribute('stroke-dasharray');
    }
  }
  
  /**
   * Set a user-defined label on a pin (from #define or const int in code)
   */
  setUserLabel(pinId: number, label: string): void {
    const el = this.userLabelElements.get(pinId);
    if (!el) return;
    
    // Truncate long names
    const display = label.length > 14 ? label.substring(0, 13) + '…' : label;
    el.textContent = display;
    el.setAttribute('opacity', '1');
  }
}


// =============================================================================
// LIVE SERIAL BRIDGE - Connects to COM port for pin data
// =============================================================================

class LiveSerialBridge {
  private interval: ReturnType<typeof setInterval> | null = null;
  private port: string;
  private baudRate: number;
  private onData: (reports: SerialPinReport[]) => void;
  private fallbackMode = false;
  
  constructor(port: string, baudRate: number, onData: (reports: SerialPinReport[]) => void) {
    this.port = port;
    this.baudRate = baudRate;
    this.onData = onData;
  }
  
  start(): void {
    if (this.interval) return;
    
    // Poll every 500ms (matches existing serial monitor cadence)
    this.interval = setInterval(() => this.poll(), 500);
    this.poll(); // Immediate first read
    console.log(`[PinViz] Serial bridge started on ${this.port} @ ${this.baudRate}`);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[PinViz] Serial bridge stopped');
  }
  
  private async poll(): Promise<void> {
    try {
      const data = await invoke<Array<{ values: number[]; raw: string; timestamp: number }>>('serial_read_values', {
        port: this.port,
        baudRate: this.baudRate,
      });
      
      if (!data || data.length === 0) {
        if (!this.fallbackMode) {
          this.fallbackMode = true;
          console.log('[PinViz] No serial data — using code analysis only');
        }
        return;
      }
      
      this.fallbackMode = false;
      
      // Parse pin reports from serial data
      // Supports formats:
      //   "PIN:13:HIGH" or "PIN:13:1" or "P13=1"
      //   "A0:512" or "A0=512"
      //   Or just raw values: "512,480,1,0"
      const reports: SerialPinReport[] = [];
      
      for (const datum of data) {
        const raw = datum.raw;
        
        // Format: PIN:13:HIGH or PIN:13:255
        const pinMatch = raw.match(/PIN:(\d+):(\w+)/gi);
        if (pinMatch) {
          for (const m of pinMatch) {
            const parts = m.split(':');
            const pin = parseInt(parts[1]);
            const val = parts[2] === 'HIGH' ? 1 : parts[2] === 'LOW' ? 0 : parseInt(parts[2]);
            if (!isNaN(pin) && !isNaN(val)) {
              reports.push({ pin, value: val, mode: val > 1 ? 'analog' : 'digital' });
            }
          }
          continue;
        }
        
        // Format: A0:512 or A0=512
        const analogMatch = raw.match(/A(\d+)[=:](\d+)/gi);
        if (analogMatch) {
          for (const m of analogMatch) {
            const parts = m.split(/[=:]/);
            const pin = 14 + parseInt(parts[0].replace(/[aA]/, ''));
            const val = parseInt(parts[1]);
            if (!isNaN(pin) && !isNaN(val)) {
              reports.push({ pin, value: val, mode: 'analog' });
            }
          }
          continue;
        }
        
        // Format: D13:1 or D13=HIGH
        const digitalMatch = raw.match(/D(\d+)[=:](\w+)/gi);
        if (digitalMatch) {
          for (const m of digitalMatch) {
            const parts = m.split(/[=:]/);
            const pin = parseInt(parts[0].replace(/[dD]/, ''));
            const val = parts[1] === 'HIGH' ? 1 : parts[1] === 'LOW' ? 0 : parseInt(parts[1]);
            if (!isNaN(pin) && !isNaN(val)) {
              reports.push({ pin, value: val, mode: 'digital' });
            }
          }
          continue;
        }
        
        // Fallback: raw CSV values map to A0, A1, A2...
        if (datum.values.length > 0) {
          datum.values.forEach((v, i) => {
            reports.push({ pin: 14 + i, value: v, mode: 'analog' });
          });
        }
      }
      
      if (reports.length > 0) {
        this.onData(reports);
      }
    } catch (e: any) {
      // Silent — port may not be open or available
      if (!this.fallbackMode) {
        this.fallbackMode = true;
        console.log('[PinViz] Serial read failed (using code analysis):', e.message || e);
      }
    }
  }
}


// =============================================================================
// AI TOOLTIP ENGINE
// =============================================================================

class PinDetailPanel {
  private cache: Map<string, string> = new Map();
  private currentPinId: number = -999;
  
  /**
   * Render pin detail into a static container in the sidebar
   */
  renderDetail(
    pin: PinDefinition,
    state: PinState | undefined,
  ): void {
    // Don't re-render if same pin
    if (pin.id === this.currentPinId) return;
    this.currentPinId = pin.id;
    
    const container = document.getElementById('pinviz-pin-detail');
    if (!container) return;
    
    container.innerHTML = '';
    
    const modeColor = this.getModeColor(state?.mode || 'UNUSED');
    const pinIcon = pin.type === 'power' ? '🔴' : pin.type === 'gnd' ? '⚫' : pin.type === 'analog' ? '📊' : '📌';
    
    // --- Pin Header ---
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    `;
    header.innerHTML = `
      <span style="font-size: 14px;">${pinIcon}</span>
      <div style="flex:1; min-width: 0;">
        <div style="color: #fff; font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pin.label}${state?.label ? ` — ${state.label}` : ''}</div>
        <div style="color: #666; font-size: 9px; margin-top: 1px;">${pin.altLabels.join(' / ') || 'Pin ' + pin.id}</div>
      </div>
      <span style="
        background: ${modeColor}22;
        color: ${modeColor};
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        font-family: monospace;
        flex-shrink: 0;
      ">${state?.mode || 'UNUSED'}</span>
    `;
    container.appendChild(header);
    
    // --- Capabilities ---
    const capsRow = document.createElement('div');
    capsRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 8px;';
    pin.capabilities.forEach(cap => {
      const badge = document.createElement('span');
      badge.style.cssText = `
        background: #2a2d2e;
        color: #8a8a8a;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 8px;
        font-family: monospace;
        border: 1px solid #3c3c3c;
      `;
      badge.textContent = cap.replace(/_/g, ' ').toUpperCase();
      capsRow.appendChild(badge);
    });
    container.appendChild(capsRow);
    
    // --- Current Value ---
    if (state && state.mode !== 'UNUSED') {
      const valueRow = document.createElement('div');
      valueRow.style.cssText = `
        background: #1a2332;
        border: 1px solid #2a4060;
        border-radius: 5px;
        padding: 8px 10px;
        margin-bottom: 8px;
      `;
      
      let valueDisplay = '';
      if (state.mode === 'OUTPUT') {
        const isHigh = state.value > 0;
        valueDisplay = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${isHigh ? '#33ff33' : '#333'}; ${isHigh ? 'box-shadow: 0 0 6px #33ff33;' : ''}"></div>
            <span style="color: ${isHigh ? '#4EC9B0' : '#888'}; font-weight: 700; font-family: monospace; font-size: 12px;">${isHigh ? 'HIGH (5V)' : 'LOW (0V)'}</span>
          </div>
        `;
      } else if (state.mode === 'ANALOG_IN') {
        const pct = ((state.value / 1023) * 100).toFixed(1);
        const voltage = ((state.value / 1023) * 5).toFixed(2);
        valueDisplay = `
          <div style="color: #569CD6; font-family: monospace; font-size: 13px; font-weight: 700; margin-bottom: 3px;">${Math.round(state.value)} <span style="color: #888; font-size: 9px;">/ 1023</span></div>
          <div style="display: flex; gap: 10px; color: #888; font-size: 9px; margin-bottom: 4px;">
            <span>≈ ${voltage}V</span>
            <span>${pct}%</span>
          </div>
          <div style="background: #1e1e1e; border-radius: 3px; height: 5px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #569CD6; border-radius: 3px; transition: width 0.3s;"></div>
          </div>
        `;
      } else if (state.mode === 'PWM') {
        const pct = ((state.value / 255) * 100).toFixed(1);
        valueDisplay = `
          <div style="color: #CE9178; font-family: monospace; font-size: 13px; font-weight: 700; margin-bottom: 3px;">~${Math.round(state.value)} <span style="color: #888; font-size: 9px;">/ 255</span></div>
          <div style="color: #888; font-size: 9px; margin-bottom: 4px;">Duty cycle: ${pct}%</div>
          <div style="background: #1e1e1e; border-radius: 3px; height: 5px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #CE9178; border-radius: 3px;"></div>
          </div>
        `;
      } else {
        valueDisplay = `<div style="color: ${modeColor}; font-family: monospace; font-size: 11px;">${state.mode} mode active</div>`;
      }
      
      valueRow.innerHTML = valueDisplay;
      container.appendChild(valueRow);
    }
    
    // --- Conflict ---
    if (state?.conflict) {
      const isError = state.conflict.severity === 'error';
      const conflictRow = document.createElement('div');
      conflictRow.style.cssText = `
        background: ${isError ? '#3a1515' : '#3a2a15'};
        border: 1px solid ${isError ? '#f44' : '#fa0'};
        border-radius: 5px;
        padding: 8px 10px;
        margin-bottom: 8px;
      `;
      conflictRow.innerHTML = `
        <div style="color: ${isError ? '#f44' : '#fa0'}; font-weight: 700; font-size: 10px; margin-bottom: 3px;">
          ${isError ? '⛔' : '⚠️'} ${isError ? 'CONFLICT' : 'WARNING'}
        </div>
        <div style="color: #ccc; font-size: 10px; line-height: 1.4;">${state.conflict.message}</div>
      `;
      container.appendChild(conflictRow);
    }
    
    // --- Code References ---
    if (state && state.codeRefs.length > 0) {
      const refsLabel = document.createElement('div');
      refsLabel.style.cssText = 'color: #888; font-size: 9px; font-weight: 600; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;';
      refsLabel.textContent = 'Code References';
      container.appendChild(refsLabel);
      
      const maxRefs = Math.min(state.codeRefs.length, 4);
      for (let i = 0; i < maxRefs; i++) {
        const ref = state.codeRefs[i];
        const refEl = document.createElement('div');
        refEl.style.cssText = `
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 5px 7px;
          margin-bottom: 3px;
          font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
          font-size: 9px;
          color: #ccc;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: background 0.1s;
        `;
        refEl.innerHTML = `
          <span style="color: #666; font-size: 8px;">${ref.file}:${ref.line}</span>
          <code style="color: #d4d4d4; margin-left: 4px;">${this.escapeHtml(ref.code.substring(0, 40))}</code>
        `;
        refEl.addEventListener('click', () => this.jumpToCode(ref));
        refEl.addEventListener('mouseenter', () => { refEl.style.background = '#252525'; });
        refEl.addEventListener('mouseleave', () => { refEl.style.background = '#1a1a1a'; });
        container.appendChild(refEl);
      }
      
      if (state.codeRefs.length > 4) {
        const more = document.createElement('div');
        more.style.cssText = 'color: #569CD6; font-size: 9px; text-align: center; padding: 2px;';
        more.textContent = `+${state.codeRefs.length - 4} more`;
        container.appendChild(more);
      }
    }
    
    // --- AI Button ---
    const aiBtn = document.createElement('button');
    aiBtn.style.cssText = `
      width: 100%;
      padding: 7px;
      background: linear-gradient(135deg, #1a3050, #1a2a40);
      border: 1px solid #2a5080;
      border-radius: 5px;
      color: #58A6FF;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-family: inherit;
      margin-top: 8px;
      transition: border-color 0.15s;
    `;
    aiBtn.innerHTML = '🤖 Ask AI about this pin';
    aiBtn.addEventListener('mouseenter', () => { aiBtn.style.borderColor = '#58A6FF'; });
    aiBtn.addEventListener('mouseleave', () => { aiBtn.style.borderColor = '#2a5080'; });
    aiBtn.addEventListener('click', () => this.askAI(pin, state, container, aiBtn));
    container.appendChild(aiBtn);
  }
  
  /**
   * Show default "hover a pin" placeholder
   */
  showPlaceholder(): void {
    const container = document.getElementById('pinviz-pin-detail');
    if (!container) return;
    this.currentPinId = -999;
    container.innerHTML = `
      <div style="text-align: center; padding: 16px 8px; color: #555; font-size: 11px;">
        <div style="font-size: 20px; margin-bottom: 6px; opacity: 0.4;">📌</div>
        Hover over a pin to see details
      </div>
    `;
  }
  
  private getModeColor(mode: string): string {
    const colors: Record<string, string> = {
      'OUTPUT': '#E8B839', 'INPUT': '#4EC9B0', 'INPUT_PULLUP': '#3CB371',
      'ANALOG_IN': '#569CD6', 'PWM': '#CE9178', 'SERVO': '#C586C0',
      'I2C': '#DCDCAA', 'SPI': '#D7BA7D', 'UART': '#F48771', 'UNUSED': '#666',
    };
    return colors[mode] || '#666';
  }
  
  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  private jumpToCode(ref: CodeReference): void {
    document.dispatchEvent(new CustomEvent('file-selected', {
      detail: { path: ref.file, line: ref.line }
    }));
    console.log(`[PinViz] Jump to ${ref.file}:${ref.line}`);
  }
  
  private async askAI(pin: PinDefinition, state: PinState | undefined, container: HTMLElement, btn: HTMLElement): Promise<void> {
    btn.innerHTML = '<div style="width:10px;height:10px;border:2px solid #58A6FF;border-top-color:transparent;border-radius:50%;animation:spinAI 0.8s linear infinite;"></div> Analyzing...';
    btn.style.pointerEvents = 'none';
    
    if (!document.getElementById('spin-ai-style')) {
      const s = document.createElement('style');
      s.id = 'spin-ai-style';
      s.textContent = '@keyframes spinAI { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }
    
    const cacheKey = `${pin.id}-${state?.mode || 'none'}`;
    if (this.cache.has(cacheKey)) {
      this.showAIResponse(container, this.cache.get(cacheKey)!, btn);
      return;
    }
    
    const prompt = this.buildAIPrompt(pin, state);
    
    try {
      const { callGenericAPI } = await import('../ide/aiAssistant/apiProviderManager');
      
      const systemPrompt = `You are an Arduino hardware expert. Give a brief, practical response about this pin. Keep it under 80 words. Include: what the pin does, best practices, and one tip. If there's a conflict, explain how to fix it.`;
      const fullPrompt = systemPrompt + '\n\n' + prompt;
      const response = await callGenericAPI(fullPrompt);
      
      const text = typeof response === 'string' ? response : 'No response';
      
      this.cache.set(cacheKey, text);
      this.showAIResponse(container, text, btn);
    } catch (e: any) {
      btn.innerHTML = '⚠️ AI unavailable';
      btn.style.pointerEvents = 'auto';
      console.error('[PinViz] AI error:', e);
    }
  }
  
  private buildAIPrompt(pin: PinDefinition, state: PinState | undefined): string {
    let prompt = `Arduino Uno Pin ${pin.label} (Pin ${pin.id}).\n`;
    prompt += `Capabilities: ${pin.capabilities.join(', ')}.\n`;
    prompt += `Alt names: ${pin.altLabels.join(', ') || 'none'}.\n`;
    
    if (state) {
      prompt += `Current mode: ${state.mode}.\n`;
      prompt += `Current value: ${state.value}.\n`;
      if (state.label) prompt += `User label: "${state.label}".\n`;
      if (state.conflict) {
        prompt += `⚠️ CONFLICT: ${state.conflict.message}\n`;
        state.conflict.refs.forEach(r => { prompt += `  ${r.file}:${r.line} → ${r.code}\n`; });
      }
      if (state.codeRefs.length > 0) {
        prompt += `Code usage:\n`;
        state.codeRefs.slice(0, 5).forEach(r => { prompt += `  ${r.file}:${r.line} → ${r.code}\n`; });
      }
    } else {
      prompt += 'Currently unused.\n';
    }
    
    prompt += 'Give advice for this pin.';
    return prompt;
  }
  
  private showAIResponse(container: HTMLElement, text: string, btn: HTMLElement): void {
    btn.remove();
    
    const aiBox = document.createElement('div');
    aiBox.style.cssText = `
      background: linear-gradient(135deg, #0d1b2a, #132238);
      border: 1px solid #1e4070;
      border-radius: 5px;
      padding: 8px 10px;
      margin-top: 6px;
    `;
    aiBox.innerHTML = `
      <div style="color: #58A6FF; font-size: 9px; font-weight: 600; margin-bottom: 4px;">🤖 AI Insight</div>
      <div style="color: #ccc; font-size: 10px; line-height: 1.5;">${this.escapeHtml(text)}</div>
    `;
    container.appendChild(aiBox);
  }
}


// =============================================================================
// WIRING SUGGESTION ENGINE
// =============================================================================

const WIRING_SUGGESTIONS: WiringSuggestion[] = [
  { pin: 13, component: 'LED', description: 'Built-in LED — no extra wiring needed', wiring: 'Pin 13 → Built-in LED (onboard)', code: 'pinMode(13, OUTPUT);\ndigitalWrite(13, HIGH);' },
  { pin: 2,  component: 'Button', description: 'External interrupt — ideal for buttons', wiring: 'Pin 2 → Button → GND (use INPUT_PULLUP)', code: 'pinMode(2, INPUT_PULLUP);\nif (digitalRead(2) == LOW) { /* pressed */ }' },
  { pin: 3,  component: 'Servo', description: 'PWM + interrupt — great for servo control', wiring: 'Pin 3 → Servo signal (orange wire)', code: '#include <Servo.h>\nServo s;\ns.attach(3);\ns.write(90);' },
  { pin: 9,  component: 'RGB LED (R)', description: 'PWM pin for red channel', wiring: 'Pin 9 → 220Ω → Red LED → GND', code: 'analogWrite(9, 128); // 50% brightness' },
  { pin: 10, component: 'RGB LED (G)', description: 'PWM pin for green channel', wiring: 'Pin 10 → 220Ω → Green LED → GND', code: 'analogWrite(10, 128);' },
  { pin: 11, component: 'RGB LED (B)', description: 'PWM pin for blue channel', wiring: 'Pin 11 → 220Ω → Blue LED → GND', code: 'analogWrite(11, 128);' },
  { pin: 14, component: 'Potentiometer', description: 'Analog input for variable resistance', wiring: '5V → Pot pin 1, A0 → Pot wiper, GND → Pot pin 3', code: 'int val = analogRead(A0); // 0-1023' },
  { pin: 15, component: 'Temperature Sensor', description: 'LM35/TMP36 temperature sensor', wiring: 'A1 → TMP36 output, 5V → Vcc, GND → GND', code: 'float tempC = analogRead(A1) * 5.0 / 1024.0 * 100;' },
  { pin: 18, component: 'I2C Device', description: 'I2C SDA — LCD, OLED, sensors', wiring: 'A4 (SDA) → Device SDA + 4.7kΩ pullup to 5V', code: '#include <Wire.h>\nWire.begin();' },
  { pin: 19, component: 'I2C Device', description: 'I2C SCL — LCD, OLED, sensors', wiring: 'A5 (SCL) → Device SCL + 4.7kΩ pullup to 5V', code: '' },
];

function getWiringSuggestion(pinId: number): WiringSuggestion | undefined {
  return WIRING_SUGGESTIONS.find(s => s.pin === pinId);
}


// =============================================================================
// MAIN VISUALIZER - Ties everything together
// =============================================================================

export async function showPinVisualizer(): Promise<void> {
  // Remove existing
  document.getElementById('arduino-pin-visualizer')?.remove();
  
  const currentPort = (window as any).arduinoSelectedPort || 'COM3';
  let baudRate = (window as any).arduinoBaudRate || 9600;
  
  // Create floating container (no backdrop)
  const modal = document.createElement('div');
  modal.id = 'arduino-pin-visualizer';
  modal.style.cssText = `
    position: fixed;
    top: 40px;
    left: 60px;
    z-index: 10003;
    pointer-events: none;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1e1e1e;
    border: 1px solid #454545;
    border-radius: 8px;
    width: 860px;
    height: 560px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    resize: both;
    overflow: hidden;
    min-width: 600px;
    min-height: 400px;
  `;
  
  // =========================================================================
  // HEADER (draggable)
  // =========================================================================
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px 14px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
    border-radius: 8px 8px 0 0;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: move;
    user-select: none;
  `;
  header.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4EC9B0" stroke-width="2">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <circle cx="7" cy="8" r="1.5" fill="#4EC9B0"/>
      <circle cx="12" cy="8" r="1.5" fill="#4EC9B0"/>
      <circle cx="17" cy="8" r="1.5" fill="#4EC9B0"/>
      <line x1="7" y1="13" x2="7" y2="17"/>
      <line x1="12" y1="13" x2="12" y2="17"/>
      <line x1="17" y1="13" x2="17" y2="17"/>
    </svg>
    <span style="color: #fff; font-weight: 700; font-size: 13px; flex: 1;">Pin Visualizer</span>
    <span id="pinviz-status" style="color: #888; font-size: 10px;">Analyzing code...</span>
    <span id="pinviz-serial-badge" style="
      background: #2d2d2d;
      color: #888;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-family: monospace;
    ">${currentPort} @ ${baudRate}</span>
    <button id="pinviz-live-btn" style="
      background: #2d2d2d;
      border: 1px solid #555;
      border-radius: 4px;
      color: #4EC9B0;
      padding: 3px 9px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    ">▶ Live</button>
    <button id="pinviz-close" style="
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      line-height: 1;
    ">×</button>
  `;
  dialog.appendChild(header);
  
  // --- Drag logic ---
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  
  header.addEventListener('mousedown', (e: MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT') return;
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });
  
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    modal.style.left = (e.clientX - dragOffsetX) + 'px';
    modal.style.top = (e.clientY - dragOffsetY) + 'px';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
  };
  const onMouseUp = () => { isDragging = false; };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  // =========================================================================
  // BODY: SVG board + sidebar
  // =========================================================================
  const body = document.createElement('div');
  body.style.cssText = `
    flex: 1;
    display: flex;
    overflow: hidden;
  `;
  
  // Left: SVG board
  const boardContainer = document.createElement('div');
  boardContainer.style.cssText = `
    flex: 1;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  `;
  
  // Right: Sidebar (conflicts + suggestions)
  const sidebar = document.createElement('div');
  sidebar.style.cssText = `
    width: 240px;
    border-left: 1px solid #3c3c3c;
    background: #252526;
    overflow-y: auto;
    font-size: 12px;
  `;
  
  body.appendChild(boardContainer);
  body.appendChild(sidebar);
  dialog.appendChild(body);
  
  // =========================================================================
  // FOOTER: Legend
  // =========================================================================
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 6px 14px;
    background: #252526;
    border-top: 1px solid #3c3c3c;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  `;
  
  const legendItems = [
    { color: '#E8B839', label: 'OUTPUT' },
    { color: '#4EC9B0', label: 'INPUT' },
    { color: '#569CD6', label: 'ANALOG' },
    { color: '#CE9178', label: 'PWM' },
    { color: '#C586C0', label: 'SERVO' },
    { color: '#DCDCAA', label: 'I2C' },
    { color: '#F48771', label: 'UART' },
    { color: '#666', label: 'UNUSED' },
  ];
  
  legendItems.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = 'display: flex; align-items: center; gap: 4px;';
    el.innerHTML = `
      <div style="width: 7px; height: 7px; border-radius: 50%; background: ${item.color};"></div>
      <span style="color: #888; font-size: 9px; font-family: monospace;">${item.label}</span>
    `;
    footer.appendChild(el);
  });
  
  dialog.appendChild(footer);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // =========================================================================
  // RENDER BOARD
  // =========================================================================
  const renderer = new BoardRenderer();
  const svg = renderer.createSVG(boardContainer);
  
  // =========================================================================
  // PARSE CODE
  // =========================================================================
  const parser = new ArduinoCodeParser();
  const conflictDetector = new PinConflictDetector();
  const pinDetailPanel = new PinDetailPanel();
  let pinStates = new Map<number, PinState>();
  let conflicts: PinConflict[] = [];
  let serialBridge: LiveSerialBridge | null = null;
  let isLive = false;
  
  // Shared handler: update pin states from serial reports
  const handlePinReports = (reports: SerialPinReport[]) => {
    for (const report of reports) {
      if (!pinStates.has(report.pin)) {
        pinStates.set(report.pin, {
          mode: report.mode === 'analog' ? 'ANALOG_IN' : (report.value > 1 ? 'PWM' : 'OUTPUT'),
          value: 0,
          active: true,
          label: '',
          codeRefs: [],
          lastUpdated: Date.now(),
        });
      }
      const state = pinStates.get(report.pin)!;
      state.value = report.value;
      state.active = true;
      state.lastUpdated = Date.now();
      renderer.updatePinState(report.pin, state);
    }
  };
  
  // Read project files
  try {
    const projectFiles = await readProjectInoFiles();
    if (projectFiles.length > 0) {
      pinStates = parser.parseCode(projectFiles);
      conflicts = conflictDetector.detect(pinStates);
      
      // Use baud rate from code if detected
      if (parser.detectedBaudRate > 0) {
        baudRate = parser.detectedBaudRate;
        const badge = document.getElementById('pinviz-serial-badge');
        if (badge) badge.textContent = `${currentPort} @ ${baudRate}`;
        console.log(`[PinViz] Detected baud rate from code: ${baudRate}`);
      }
      
      // Apply to renderer
      pinStates.forEach((state, pinId) => {
        renderer.updatePinState(pinId, state);
      });
      
      // Apply user-defined pin names from #define / const int
      parser.pinDefineNames.forEach((names, pinId) => {
        renderer.setUserLabel(pinId, names[0]);
      });
      
      const statusEl = document.getElementById('pinviz-status');
      if (statusEl) {
        const usedCount = Array.from(pinStates.values()).filter(s => s.mode !== 'UNUSED').length;
        statusEl.textContent = `${usedCount} pins used · ${conflicts.length} issue${conflicts.length !== 1 ? 's' : ''}`;
        statusEl.style.color = conflicts.some(c => c.severity === 'error') ? '#f48771' : '#4EC9B0';
      }
    }
  } catch (e) {
    console.warn('[PinViz] Code parsing failed:', e);
  }
  
  // =========================================================================
  // RENDER SIDEBAR
  // =========================================================================
  renderSidebar(sidebar, pinStates, conflicts);
  
  // =========================================================================
  // HOVER → Update Pin Detail in sidebar
  // =========================================================================
  pinDetailPanel.showPlaceholder(); // Show default state
  
  const pinGroups = svg.querySelectorAll('[data-pin-id]');
  pinGroups.forEach(group => {
    const pinId = parseInt(group.getAttribute('data-pin-id') || '-99');
    const pinDef = ARDUINO_UNO_PINS.find(p => p.id === pinId);
    if (!pinDef) return;
    
    group.addEventListener('mouseenter', () => {
      pinDetailPanel.renderDetail(pinDef, pinStates.get(pinId));
    });
  });
  
  // =========================================================================
  // LIVE SERIAL BUTTON
  // =========================================================================
  const liveBtn = document.getElementById('pinviz-live-btn') as HTMLButtonElement;
  
  liveBtn?.addEventListener('click', () => {
    if (isLive) {
      // Stop
      serialBridge?.stop();
      serialBridge = null;
      isLive = false;
      liveBtn.textContent = '▶ Live';
      liveBtn.style.color = '#4EC9B0';
      liveBtn.style.background = '#2d2d2d';
      const badge = document.getElementById('pinviz-serial-badge');
      if (badge) { badge.style.color = '#888'; badge.style.background = '#2d2d2d'; }
    } else {
      // Start
      serialBridge = new LiveSerialBridge(currentPort, baudRate, handlePinReports);
      serialBridge.start();
      isLive = true;
      liveBtn.textContent = '⏹ Stop';
      liveBtn.style.color = '#f48771';
      liveBtn.style.background = '#3a1515';
      const badge = document.getElementById('pinviz-serial-badge');
      if (badge) { badge.style.color = '#4EC9B0'; badge.style.background = '#1a3020'; }
    }
  });
  
  // =========================================================================
  // CLOSE
  // =========================================================================
  const closeViz = () => {
    serialBridge?.stop();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', escHandler);
    modal.remove();
  };
  
  document.getElementById('pinviz-close')?.addEventListener('click', closeViz);
  
  // Escape key
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeViz();
    }
  };
  document.addEventListener('keydown', escHandler);
}


// =============================================================================
// SIDEBAR RENDERER
// =============================================================================

function renderSidebar(
  sidebar: HTMLElement,
  pinStates: Map<number, PinState>,
  conflicts: PinConflict[]
): void {
  sidebar.innerHTML = '';
  
  // Section: Conflicts
  const conflictsSection = document.createElement('div');
  conflictsSection.style.cssText = 'padding: 12px;';
  
  const conflictsHeader = document.createElement('div');
  conflictsHeader.style.cssText = 'color: #fff; font-weight: 700; font-size: 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;';
  conflictsHeader.innerHTML = `
    <span>⚡ Issues</span>
    <span style="
      background: ${conflicts.length > 0 ? '#5a1d1d' : '#1a3020'};
      color: ${conflicts.length > 0 ? '#f48771' : '#4EC9B0'};
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
    ">${conflicts.length}</span>
  `;
  conflictsSection.appendChild(conflictsHeader);
  
  if (conflicts.length === 0) {
    const noConflicts = document.createElement('div');
    noConflicts.style.cssText = `
      background: #1a3020;
      border: 1px solid #2a5030;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      color: #4EC9B0;
      font-size: 11px;
    `;
    noConflicts.textContent = '✓ No pin conflicts detected';
    conflictsSection.appendChild(noConflicts);
  } else {
    conflicts.forEach(conflict => {
      const isError = conflict.severity === 'error';
      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isError ? '#2a1515' : '#2a2515'};
        border: 1px solid ${isError ? '#5a2020' : '#5a4020'};
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 6px;
      `;
      card.innerHTML = `
        <div style="color: ${isError ? '#f48771' : '#DCDCAA'}; font-size: 11px; font-weight: 600; margin-bottom: 4px;">
          ${isError ? '⛔' : '⚠️'} ${conflict.severity.toUpperCase()}
        </div>
        <div style="color: #bbb; font-size: 10px; line-height: 1.4;">${conflict.message}</div>
      `;
      conflictsSection.appendChild(card);
    });
  }
  
  sidebar.appendChild(conflictsSection);
  
  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = 'height: 1px; background: #3c3c3c; margin: 0 12px;';
  sidebar.appendChild(divider);
  
  // Section: Pin Usage Summary
  const usageSection = document.createElement('div');
  usageSection.style.cssText = 'padding: 12px;';
  
  const usageHeader = document.createElement('div');
  usageHeader.style.cssText = 'color: #fff; font-weight: 700; font-size: 12px; margin-bottom: 10px;';
  usageHeader.textContent = '📋 Pin Usage';
  usageSection.appendChild(usageHeader);
  
  // Group by mode
  const modeGroups = new Map<PinMode, number[]>();
  pinStates.forEach((state, pinId) => {
    if (state.mode === 'UNUSED') return;
    if (!modeGroups.has(state.mode)) modeGroups.set(state.mode, []);
    modeGroups.get(state.mode)!.push(pinId);
  });
  
  const modeColors: Record<string, string> = {
    'OUTPUT': '#E8B839', 'INPUT': '#4EC9B0', 'INPUT_PULLUP': '#3CB371',
    'ANALOG_IN': '#569CD6', 'PWM': '#CE9178', 'SERVO': '#C586C0',
    'I2C': '#DCDCAA', 'SPI': '#D7BA7D', 'UART': '#F48771',
  };
  
  if (modeGroups.size === 0) {
    const noPins = document.createElement('div');
    noPins.style.cssText = 'color: #666; font-size: 11px; text-align: center; padding: 8px;';
    noPins.textContent = 'No pins configured in code';
    usageSection.appendChild(noPins);
  } else {
    modeGroups.forEach((pins, mode) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        margin-bottom: 3px;
      `;
      row.addEventListener('mouseenter', () => { row.style.background = '#2a2d2e'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });
      
      const color = modeColors[mode] || '#888';
      const pinLabels = pins.map(p => {
        const def = ARDUINO_UNO_PINS.find(d => d.id === p);
        return def?.label || `D${p}`;
      }).join(', ');
      
      row.innerHTML = `
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></div>
        <span style="color: ${color}; font-size: 10px; font-weight: 700; font-family: monospace; min-width: 60px;">${mode}</span>
        <span style="color: #888; font-size: 10px; font-family: monospace;">${pinLabels}</span>
      `;
      usageSection.appendChild(row);
    });
  }
  
  sidebar.appendChild(usageSection);
  
  // Divider
  const divider2 = document.createElement('div');
  divider2.style.cssText = 'height: 1px; background: #3c3c3c; margin: 0 12px;';
  sidebar.appendChild(divider2);
  
  // Section: Wiring Suggestions
  const suggestSection = document.createElement('div');
  suggestSection.style.cssText = 'padding: 12px;';
  
  const suggestHeader = document.createElement('div');
  suggestHeader.style.cssText = 'color: #fff; font-weight: 700; font-size: 12px; margin-bottom: 10px;';
  suggestHeader.textContent = '💡 Wiring Tips';
  suggestSection.appendChild(suggestHeader);
  
  // Show suggestions for used pins
  let suggestCount = 0;
  pinStates.forEach((state, pinId) => {
    if (state.mode === 'UNUSED') return;
    const suggestion = getWiringSuggestion(pinId);
    if (!suggestion) return;
    suggestCount++;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a2332;
      border: 1px solid #2a4060;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: border-color 0.15s;
    `;
    card.addEventListener('mouseenter', () => { card.style.borderColor = '#58A6FF'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = '#2a4060'; });
    
    const def = ARDUINO_UNO_PINS.find(d => d.id === pinId);
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <span style="color: #58A6FF; font-weight: 700; font-family: monospace; font-size: 11px;">${def?.label || 'D' + pinId}</span>
        <span style="color: #888; font-size: 10px;">→</span>
        <span style="color: #ccc; font-size: 11px; font-weight: 600;">${suggestion.component}</span>
      </div>
      <div style="color: #888; font-size: 10px; line-height: 1.4;">${suggestion.description}</div>
      <div style="color: #569CD6; font-size: 9px; margin-top: 4px; font-family: monospace;">${suggestion.wiring}</div>
    `;
    
    // Click to show code snippet
    card.addEventListener('click', () => {
      if (suggestion.code && card.querySelector('.code-snippet')) {
        card.querySelector('.code-snippet')?.remove();
        return;
      }
      if (!suggestion.code) return;
      const codeEl = document.createElement('div');
      codeEl.className = 'code-snippet';
      codeEl.style.cssText = `
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 4px;
        padding: 8px;
        margin-top: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: #d4d4d4;
        white-space: pre;
        overflow-x: auto;
      `;
      codeEl.textContent = suggestion.code;
      card.appendChild(codeEl);
    });
    
    suggestSection.appendChild(card);
  });
  
  if (suggestCount === 0) {
    const noSuggestions = document.createElement('div');
    noSuggestions.style.cssText = 'color: #666; font-size: 11px; text-align: center; padding: 8px;';
    noSuggestions.textContent = 'Configure pins in code to see suggestions';
    suggestSection.appendChild(noSuggestions);
  }
  
  sidebar.appendChild(suggestSection);
  
  // Divider
  const divider3 = document.createElement('div');
  divider3.style.cssText = 'height: 1px; background: #3c3c3c; margin: 0 12px;';
  sidebar.appendChild(divider3);
  
  // Section: Pin Detail (updated on hover)
  const detailSection = document.createElement('div');
  detailSection.style.cssText = 'padding: 12px;';
  
  const detailHeader = document.createElement('div');
  detailHeader.style.cssText = 'color: #fff; font-weight: 700; font-size: 12px; margin-bottom: 10px;';
  detailHeader.textContent = '📌 Pin Detail';
  detailSection.appendChild(detailHeader);
  
  const detailContainer = document.createElement('div');
  detailContainer.id = 'pinviz-pin-detail';
  detailSection.appendChild(detailContainer);
  
  sidebar.appendChild(detailSection);
}


// =============================================================================
// HELPER: Read .ino and .h files from project
// =============================================================================

async function readProjectInoFiles(): Promise<{ name: string; content: string }[]> {
  const files: { name: string; content: string }[] = [];
  
  try {
    // Get project path from file explorer DOM
    const explorerItems = document.querySelectorAll('[data-path]');
    const inoFiles: string[] = [];
    const headerFiles: string[] = [];
    
    explorerItems.forEach(el => {
      const path = el.getAttribute('data-path') || '';
      if (path.endsWith('.ino')) inoFiles.push(path);
      if (path.endsWith('.h')) headerFiles.push(path);
    });
    
    // Read each file
    for (const filePath of [...inoFiles, ...headerFiles]) {
      try {
        const content = await invoke<string>('read_file_content', { path: filePath });
        const name = filePath.split(/[/\\]/).pop() || filePath;
        files.push({ name, content });
      } catch (e) {
        // Try fallback
        try {
          const content = await invoke<string>('read_file', { path: filePath });
          const name = filePath.split(/[/\\]/).pop() || filePath;
          files.push({ name, content });
        } catch {
          console.warn(`[PinViz] Could not read ${filePath}`);
        }
      }
    }
    
    // If no files from DOM, try window.fileSystem
    if (files.length === 0 && (window as any).fileSystem?.readFile) {
      const projectPath = (window as any).currentProjectPath || '';
      if (projectPath) {
        try {
          const dirFiles = await invoke<string[]>('list_directory', { path: projectPath });
          const relevantFiles = dirFiles.filter((f: string) => f.endsWith('.ino') || f.endsWith('.h'));
          for (const f of relevantFiles) {
            try {
              const fullPath = `${projectPath}/${f}`;
              const content = await (window as any).fileSystem.readFile(fullPath);
              files.push({ name: f, content });
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
    }
  } catch (e) {
    console.error('[PinViz] Error reading project files:', e);
  }
  
  console.log(`[PinViz] Read ${files.length} files for analysis`);
  return files;
}


// =============================================================================
// EXPORTS
// =============================================================================

export {
  ArduinoCodeParser,
  PinConflictDetector,
  BoardRenderer,
  LiveSerialBridge,
  PinDetailPanel,
  ARDUINO_UNO_PINS,
  WIRING_SUGGESTIONS,
};
