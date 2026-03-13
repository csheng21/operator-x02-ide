// ============================================================================
// pinParser.ts — Static Code Analyzer for Arduino/ESP32 Pin Declarations
// ============================================================================
// Parses .ino, .cpp, .h files to extract:
//   - #define PIN_NAME number
//   - const int pinName = number;
//   - int pinName = number;
//   - pinMode(pin, MODE);
//   - digitalWrite/Read(pin, ...)
//   - analogWrite/Read(pin, ...)
//   - Servo.attach(pin)
//   - Wire.begin(SDA, SCL)
//   - SPI pins
//   - Serial.begin (marks TX/RX as used)
// ============================================================================

export interface PinInfo {
  pin: number;                          // Physical pin number (0-53 for Mega, 0-19 for Uno)
  label: string;                        // User-defined label (e.g., "MOTOR_PIN", "ledPin")
  type: 'digital' | 'analog' | 'pwm' | 'serial' | 'i2c' | 'spi' | 'servo';
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'UNKNOWN';
  usage: PinUsage[];                    // How the pin is used in code
  line: number;                         // Line number of first reference
  source: string;                       // Which file it was found in
  value?: string;                       // Last known written value (e.g., "HIGH", "127")
  warnings: string[];                   // Conflict/issue warnings
}

export interface PinUsage {
  type: 'define' | 'const' | 'var' | 'pinMode' | 'digitalWrite' | 'digitalRead' |
        'analogWrite' | 'analogRead' | 'servoAttach' | 'serialBegin' | 'wireBegin' |
        'spiBegin' | 'tone' | 'pulseIn' | 'shiftOut' | 'softwareSerial';
  line: number;
  raw: string;                          // Original code line (trimmed)
}

export interface ParseResult {
  pins: PinInfo[];
  board: string;                        // Detected board type
  serialBaud: number | null;            // Detected baud rate
  libraries: string[];                  // Detected #include libraries
  warnings: string[];                   // Global warnings
  filesParsed: string[];                // Which files were analyzed
}

// ============================================================================
// ARDUINO SPECIAL PINS (built-in constants)
// ============================================================================
const ARDUINO_CONSTANTS: Record<string, number> = {
  'LED_BUILTIN': 13,
  'LED_BUILTIN_TX': 30,
  'LED_BUILTIN_RX': 31,
  'A0': 14, 'A1': 15, 'A2': 16, 'A3': 17, 'A4': 18, 'A5': 19,
  'A6': 20, 'A7': 21,  // Nano extra analog
  'A8': 62, 'A9': 63, 'A10': 64, 'A11': 65, 'A12': 66, 'A13': 67, 'A14': 68, 'A15': 69, // Mega
  'SDA': 18, 'SCL': 19,
  'SS': 10, 'MOSI': 11, 'MISO': 12, 'SCK': 13,
  'TX': 1, 'RX': 0,
};

// ESP32 pin mapping
const ESP32_CONSTANTS: Record<string, number> = {
  'LED_BUILTIN': 2,
  'A0': 36, 'A3': 39, 'A4': 32, 'A5': 33, 'A6': 34, 'A7': 35,
  'A10': 4, 'A11': 0, 'A12': 2, 'A13': 15, 'A14': 13, 'A15': 12,
  'A16': 14, 'A17': 27, 'A18': 25, 'A19': 26,
  'T0': 4, 'T1': 0, 'T2': 2, 'T3': 15, 'T4': 13, 'T5': 12,
  'T6': 14, 'T7': 27, 'T8': 33, 'T9': 32,
  'SDA': 21, 'SCL': 22,
  'SS': 5, 'MOSI': 23, 'MISO': 19, 'SCK': 18,
  'TX': 1, 'RX': 3,
  'DAC1': 25, 'DAC2': 26,
};

// PWM-capable pins per board
const PWM_PINS: Record<string, number[]> = {
  'uno':   [3, 5, 6, 9, 10, 11],
  'nano':  [3, 5, 6, 9, 10, 11],
  'mega':  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
  'esp32': Array.from({ length: 40 }, (_, i) => i), // All GPIO pins support PWM on ESP32
};

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parseArduinoCode(
  files: Record<string, string>,  // filename → content
  boardHint?: string              // optional board detection override
): ParseResult {
  const result: ParseResult = {
    pins: [],
    board: boardHint || 'uno',
    serialBaud: null,
    libraries: [],
    warnings: [],
    filesParsed: [],
  };

  // Collect all definitions across files (for cross-reference)
  const definitions: Record<string, number> = {};
  const pinMap: Map<number, PinInfo> = new Map();

  // Phase 1: Detect board from code hints
  const allCode = Object.values(files).join('\n');
  if (!boardHint) {
    result.board = detectBoard(allCode);
  }

  const constants = result.board === 'esp32' ? { ...ESP32_CONSTANTS } : { ...ARDUINO_CONSTANTS };

  // Phase 2: Parse each file
  for (const [filename, content] of Object.entries(files)) {
    if (!filename.match(/\.(ino|cpp|c|h|hpp)$/i)) continue;
    result.filesParsed.push(filename);

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
      // Remove inline comments
      const cleanLine = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
      if (!cleanLine) continue;

      // --- Extract #include libraries ---
      const includeMatch = cleanLine.match(/^#include\s*[<"]([^>"]+)[>"]/);
      if (includeMatch) {
        result.libraries.push(includeMatch[1]);
        continue;
      }

      // --- Extract #define PIN number ---
      const defineMatch = cleanLine.match(/^#define\s+(\w+)\s+(\w+)/);
      if (defineMatch) {
        const [, name, valueStr] = defineMatch;
        const pinNum = resolvePinNumber(valueStr, constants, definitions);
        if (pinNum !== null && isPinNumber(pinNum, result.board)) {
          definitions[name] = pinNum;
          addOrUpdatePin(pinMap, pinNum, {
            label: name,
            type: classifyPinType(pinNum, result.board),
            usage: { type: 'define', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
        continue;
      }

      // --- Extract const int / int pinName = value ---
      const varMatch = cleanLine.match(/^(?:const\s+)?(?:int|uint8_t|byte|unsigned\s+int)\s+(\w+)\s*=\s*(\w+)\s*;/);
      if (varMatch) {
        const [, name, valueStr] = varMatch;
        const pinNum = resolvePinNumber(valueStr, constants, definitions);
        if (pinNum !== null && isPinNumber(pinNum, result.board)) {
          definitions[name] = pinNum;
          addOrUpdatePin(pinMap, pinNum, {
            label: name,
            type: classifyPinType(pinNum, result.board),
            usage: { type: cleanLine.startsWith('const') ? 'const' : 'var', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
        continue;
      }

      // --- Extract pinMode(pin, MODE) ---
      const pinModeMatch = cleanLine.match(/pinMode\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
      if (pinModeMatch) {
        const [, pinStr, modeStr] = pinModeMatch;
        const pinNum = resolvePinNumber(pinStr, constants, definitions);
        if (pinNum !== null) {
          const mode = modeStr as PinInfo['mode'];
          addOrUpdatePin(pinMap, pinNum, {
            label: pinStr,
            type: classifyPinType(pinNum, result.board),
            mode: mode,
            usage: { type: 'pinMode', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
        continue;
      }

      // --- Extract digitalWrite(pin, value) ---
      const dwMatch = cleanLine.match(/digitalWrite\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
      if (dwMatch) {
        const [, pinStr, valStr] = dwMatch;
        const pinNum = resolvePinNumber(pinStr, constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: pinStr,
            type: 'digital',
            mode: 'OUTPUT',
            value: valStr,
            usage: { type: 'digitalWrite', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract digitalRead(pin) ---
      const drMatch = cleanLine.match(/digitalRead\s*\(\s*(\w+)\s*\)/);
      if (drMatch) {
        const pinNum = resolvePinNumber(drMatch[1], constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: drMatch[1],
            type: 'digital',
            mode: 'INPUT',
            usage: { type: 'digitalRead', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract analogWrite(pin, value) — PWM ---
      const awMatch = cleanLine.match(/analogWrite\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
      if (awMatch) {
        const [, pinStr, valStr] = awMatch;
        const pinNum = resolvePinNumber(pinStr, constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: pinStr,
            type: 'pwm',
            mode: 'OUTPUT',
            value: valStr,
            usage: { type: 'analogWrite', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract analogRead(pin) ---
      const arMatch = cleanLine.match(/analogRead\s*\(\s*(\w+)\s*\)/);
      if (arMatch) {
        const pinNum = resolvePinNumber(arMatch[1], constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: arMatch[1],
            type: 'analog',
            mode: 'INPUT',
            usage: { type: 'analogRead', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract Serial.begin(baud) — marks TX/RX as used ---
      const serialMatch = cleanLine.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
      if (serialMatch) {
        result.serialBaud = parseInt(serialMatch[1]);
        const txPin = constants['TX'] ?? 1;
        const rxPin = constants['RX'] ?? 0;
        addOrUpdatePin(pinMap, txPin, {
          label: 'TX (Serial)',
          type: 'serial',
          mode: 'OUTPUT',
          usage: { type: 'serialBegin', line: lineNum, raw: cleanLine },
          line: lineNum,
          source: filename,
        });
        addOrUpdatePin(pinMap, rxPin, {
          label: 'RX (Serial)',
          type: 'serial',
          mode: 'INPUT',
          usage: { type: 'serialBegin', line: lineNum, raw: cleanLine },
          line: lineNum,
          source: filename,
        });
      }

      // --- Extract SoftwareSerial mySerial(rx, tx) ---
      const ssMatch = cleanLine.match(/SoftwareSerial\s+\w+\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
      if (ssMatch) {
        const rxPin = resolvePinNumber(ssMatch[1], constants, definitions);
        const txPin = resolvePinNumber(ssMatch[2], constants, definitions);
        if (rxPin !== null) {
          addOrUpdatePin(pinMap, rxPin, {
            label: `SoftSerial RX`,
            type: 'serial',
            mode: 'INPUT',
            usage: { type: 'softwareSerial', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
        if (txPin !== null) {
          addOrUpdatePin(pinMap, txPin, {
            label: `SoftSerial TX`,
            type: 'serial',
            mode: 'OUTPUT',
            usage: { type: 'softwareSerial', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract Servo.attach(pin) ---
      const servoMatch = cleanLine.match(/\.attach\s*\(\s*(\w+)\s*\)/);
      if (servoMatch) {
        const pinNum = resolvePinNumber(servoMatch[1], constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: servoMatch[1],
            type: 'servo',
            mode: 'OUTPUT',
            usage: { type: 'servoAttach', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract Wire.begin(SDA, SCL) for ESP32 ---
      const wireMatch = cleanLine.match(/Wire\.begin\s*\(\s*(\w+)?\s*(?:,\s*(\w+))?\s*\)/);
      if (wireMatch) {
        const sdaPin = wireMatch[1] ? resolvePinNumber(wireMatch[1], constants, definitions) : (constants['SDA'] ?? null);
        const sclPin = wireMatch[2] ? resolvePinNumber(wireMatch[2], constants, definitions) : (constants['SCL'] ?? null);
        if (sdaPin !== null) {
          addOrUpdatePin(pinMap, sdaPin, {
            label: 'I2C SDA',
            type: 'i2c',
            usage: { type: 'wireBegin', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
        if (sclPin !== null) {
          addOrUpdatePin(pinMap, sclPin, {
            label: 'I2C SCL',
            type: 'i2c',
            usage: { type: 'wireBegin', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract tone(pin, freq) ---
      const toneMatch = cleanLine.match(/tone\s*\(\s*(\w+)\s*,/);
      if (toneMatch) {
        const pinNum = resolvePinNumber(toneMatch[1], constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: toneMatch[1],
            type: 'pwm',
            mode: 'OUTPUT',
            usage: { type: 'tone', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }

      // --- Extract pulseIn(pin, ...) ---
      const pulseMatch = cleanLine.match(/pulseIn\s*\(\s*(\w+)\s*,/);
      if (pulseMatch) {
        const pinNum = resolvePinNumber(pulseMatch[1], constants, definitions);
        if (pinNum !== null) {
          addOrUpdatePin(pinMap, pinNum, {
            label: pulseMatch[1],
            type: 'digital',
            mode: 'INPUT',
            usage: { type: 'pulseIn', line: lineNum, raw: cleanLine },
            line: lineNum,
            source: filename,
          });
        }
      }
    }
  }

  // Phase 3: Detect conflicts & generate warnings
  result.pins = Array.from(pinMap.values());
  detectConflicts(result);

  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function resolvePinNumber(
  value: string,
  constants: Record<string, number>,
  definitions: Record<string, number>
): number | null {
  // Direct number
  const num = parseInt(value);
  if (!isNaN(num)) return num;

  // Arduino constant (A0, LED_BUILTIN, etc.)
  if (constants[value] !== undefined) return constants[value];

  // User-defined constant
  if (definitions[value] !== undefined) return definitions[value];

  return null;
}

function isPinNumber(pin: number, board: string): boolean {
  if (board === 'esp32') return pin >= 0 && pin <= 39;
  if (board === 'mega') return pin >= 0 && pin <= 69;
  return pin >= 0 && pin <= 21; // Uno/Nano
}

function classifyPinType(pin: number, board: string): PinInfo['type'] {
  const pwmPins = PWM_PINS[board] || PWM_PINS['uno'];

  if (board === 'esp32') {
    if (pin === 1 || pin === 3) return 'serial';
    if (pin === 21 || pin === 22) return 'i2c';
    if ([36, 39, 34, 35].includes(pin)) return 'analog'; // Input-only ADC pins
    return 'digital';
  }

  // Arduino boards
  if (pin === 0 || pin === 1) return 'serial';
  if (pin >= 14 && pin <= 21) return 'analog';  // A0-A7
  if (pin === 18 || pin === 19) return 'i2c';   // A4/A5 = SDA/SCL
  if (pwmPins.includes(pin)) return 'pwm';
  return 'digital';
}

function detectBoard(code: string): string {
  const lower = code.toLowerCase();
  if (lower.includes('esp32') || lower.includes('espressif') || lower.includes('wifi.h') ||
      lower.includes('esp_wifi') || lower.includes('bluetooth') || lower.includes('ble')) {
    return 'esp32';
  }
  if (lower.includes('mega') || lower.includes('atmega2560')) return 'mega';
  if (lower.includes('nano') || lower.includes('atmega328p')) return 'nano';
  return 'uno';
}

interface PartialPinUpdate {
  label?: string;
  type?: PinInfo['type'];
  mode?: PinInfo['mode'];
  value?: string;
  usage?: PinUsage;
  line?: number;
  source?: string;
}

function addOrUpdatePin(
  pinMap: Map<number, PinInfo>,
  pinNum: number,
  update: PartialPinUpdate
): void {
  const existing = pinMap.get(pinNum);

  if (existing) {
    // Update existing pin info
    if (update.label && existing.label === `Pin ${pinNum}`) {
      existing.label = update.label;
    }
    // Prefer user-defined label over generic ones
    if (update.label && !update.label.startsWith('Pin ') &&
        !update.label.startsWith('TX') && !update.label.startsWith('RX') &&
        (existing.label.startsWith('TX') || existing.label.startsWith('RX') || existing.label.startsWith('Pin '))) {
      existing.label = update.label;
    }
    if (update.type && existing.type === 'digital') existing.type = update.type;
    if (update.mode && existing.mode === 'UNKNOWN') existing.mode = update.mode;
    if (update.value) existing.value = update.value;
    if (update.usage) existing.usage.push(update.usage);
  } else {
    // Create new pin entry
    pinMap.set(pinNum, {
      pin: pinNum,
      label: update.label || `Pin ${pinNum}`,
      type: update.type || 'digital',
      mode: update.mode || 'UNKNOWN',
      usage: update.usage ? [update.usage] : [],
      line: update.line || 0,
      source: update.source || '',
      value: update.value,
      warnings: [],
    });
  }
}

function detectConflicts(result: ParseResult): void {
  const pinsByNum: Map<number, PinInfo> = new Map();
  for (const pin of result.pins) {
    pinsByNum.set(pin.pin, pin);
  }

  for (const pin of result.pins) {
    // Check: Input/Output conflict (both read and write on same pin)
    const hasRead = pin.usage.some(u => u.type === 'digitalRead' || u.type === 'analogRead' || u.type === 'pulseIn');
    const hasWrite = pin.usage.some(u => u.type === 'digitalWrite' || u.type === 'analogWrite' || u.type === 'tone');
    if (hasRead && hasWrite) {
      pin.warnings.push(`Pin ${pin.pin} is used as both INPUT and OUTPUT — verify this is intentional`);
    }

    // Check: Serial TX/RX conflict
    if ((pin.pin === 0 || pin.pin === 1) && pin.type !== 'serial') {
      const serialUsed = result.serialBaud !== null;
      if (serialUsed) {
        pin.warnings.push(`Pin ${pin.pin} (${pin.pin === 0 ? 'RX' : 'TX'}) is used by Serial — GPIO use will interfere`);
        result.warnings.push(`Pin ${pin.pin} conflict: Serial and GPIO on same pin`);
      }
    }

    // Check: I2C SDA/SCL conflict on Uno (A4/A5 = pin 18/19)
    if ((pin.pin === 18 || pin.pin === 19) && result.board !== 'esp32') {
      const isI2C = pin.type === 'i2c';
      const isAnalog = pin.usage.some(u => u.type === 'analogRead');
      if (isI2C && isAnalog) {
        pin.warnings.push(`Pin ${pin.pin} (${pin.pin === 18 ? 'A4/SDA' : 'A5/SCL'}) used for both I2C and analog — conflict`);
      }
    }

    // Check: ESP32 input-only pins used as output
    if (result.board === 'esp32' && [34, 35, 36, 39].includes(pin.pin)) {
      if (pin.mode === 'OUTPUT') {
        pin.warnings.push(`GPIO ${pin.pin} is INPUT-ONLY on ESP32 — cannot use as OUTPUT`);
        result.warnings.push(`ESP32: GPIO ${pin.pin} is input-only but configured as output`);
      }
    }

    // Check: ESP32 strapping pins
    if (result.board === 'esp32' && [0, 2, 5, 12, 15].includes(pin.pin)) {
      pin.warnings.push(`GPIO ${pin.pin} is a strapping pin on ESP32 — may affect boot if pulled HIGH/LOW`);
    }
  }
}

// ============================================================================
// UTILITY: Get human-readable pin name
// ============================================================================
export function getPinDisplayName(pin: number, board: string): string {
  if (board === 'esp32') {
    if (pin === 1) return 'TX0';
    if (pin === 3) return 'RX0';
    if (pin === 21) return 'SDA';
    if (pin === 22) return 'SCL';
    if (pin === 25) return 'DAC1';
    if (pin === 26) return 'DAC2';
    return `GPIO${pin}`;
  }

  // Arduino
  if (pin === 0) return 'D0/RX';
  if (pin === 1) return 'D1/TX';
  if (pin >= 2 && pin <= 13) return `D${pin}`;
  if (pin >= 14 && pin <= 21) return `A${pin - 14}`;
  return `D${pin}`;
}

// ============================================================================
// UTILITY: Get pin color based on type
// ============================================================================
export function getPinColor(pin: PinInfo): string {
  switch (pin.type) {
    case 'digital': return pin.mode === 'OUTPUT' ? '#4EC9B0' : '#58A6FF';
    case 'analog':  return '#FFD700';
    case 'pwm':     return '#C586C0';
    case 'serial':  return '#F97316';
    case 'i2c':     return '#22D3EE';
    case 'spi':     return '#A78BFA';
    case 'servo':   return '#F472B6';
    default:        return '#6B7280';
  }
}

// ============================================================================
// UTILITY: Summary stats
// ============================================================================
export function getPinSummary(result: ParseResult): {
  total: number;
  digital: number;
  analog: number;
  pwm: number;
  serial: number;
  i2c: number;
  servo: number;
  warnings: number;
} {
  const pins = result.pins;
  return {
    total: pins.length,
    digital: pins.filter(p => p.type === 'digital').length,
    analog: pins.filter(p => p.type === 'analog').length,
    pwm: pins.filter(p => p.type === 'pwm').length,
    serial: pins.filter(p => p.type === 'serial').length,
    i2c: pins.filter(p => p.type === 'i2c').length,
    servo: pins.filter(p => p.type === 'servo').length,
    warnings: pins.reduce((sum, p) => sum + p.warnings.length, 0) + result.warnings.length,
  };
}
