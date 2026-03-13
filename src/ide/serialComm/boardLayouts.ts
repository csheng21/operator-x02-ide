// ============================================================================
// boardLayouts.ts — Board Pin Position Data for Visual Rendering
// ============================================================================
// Contains physical pin positions, labels, and capabilities for each board.
// Coordinates are relative to board SVG viewBox (normalized 0-100 scale).
// ============================================================================

export interface BoardPin {
  pin: number;           // GPIO/digital pin number
  x: number;             // X position (0-100 scale)
  y: number;             // Y position (0-100 scale)
  side: 'left' | 'right' | 'top' | 'bottom';
  label: string;         // Default label (e.g., "D13", "A0")
  altLabel?: string;     // Alternate function (e.g., "SCK", "SDA")
  isPwm: boolean;
  isAnalog: boolean;
  isSerial: boolean;
  isI2C: boolean;
  isSPI: boolean;
  isPower?: boolean;     // VCC/GND/3.3V etc (not GPIO)
  isInputOnly?: boolean; // ESP32: GPIO 34,35,36,39
}

export interface PowerPin {
  label: string;
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
  type: 'vcc' | 'gnd' | '3v3' | '5v' | 'vin' | 'ref' | 'rst';
}

export interface BoardLayout {
  name: string;
  displayName: string;
  chipName: string;
  width: number;          // Aspect ratio width (viewBox)
  height: number;         // Aspect ratio height (viewBox)
  boardColor: string;     // Board PCB color
  boardRadius: number;    // Board corner radius
  chipX: number;          // Chip rectangle position
  chipY: number;
  chipWidth: number;
  chipHeight: number;
  usbX: number;           // USB connector position
  usbY: number;
  usbWidth: number;
  usbHeight: number;
  pins: BoardPin[];
  powerPins: PowerPin[];
  totalDigital: number;
  totalAnalog: number;
  totalPwm: number;
}

// ============================================================================
// ARDUINO UNO
// ============================================================================
export const ARDUINO_UNO: BoardLayout = {
  name: 'uno',
  displayName: 'Arduino Uno',
  chipName: 'ATmega328P',
  width: 220,
  height: 340,
  boardColor: '#00979D',  // Arduino teal
  boardRadius: 6,
  chipX: 65,
  chipY: 120,
  chipWidth: 90,
  chipHeight: 100,
  usbX: 75,
  usbY: 5,
  usbWidth: 50,
  usbHeight: 35,
  totalDigital: 14,
  totalAnalog: 6,
  totalPwm: 6,

  pins: [
    // Right side — Digital pins (top to bottom: D0-D13)
    { pin: 0,  x: 200, y: 60,  side: 'right', label: 'D0',  altLabel: 'RX',   isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 1,  x: 200, y: 76,  side: 'right', label: 'D1',  altLabel: 'TX',   isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 2,  x: 200, y: 92,  side: 'right', label: 'D2',                     isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 3,  x: 200, y: 108, side: 'right', label: 'D3',  altLabel: 'PWM~',  isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 4,  x: 200, y: 124, side: 'right', label: 'D4',                     isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 5,  x: 200, y: 140, side: 'right', label: 'D5',  altLabel: 'PWM~',  isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 6,  x: 200, y: 156, side: 'right', label: 'D6',  altLabel: 'PWM~',  isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 7,  x: 200, y: 172, side: 'right', label: 'D7',                     isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 8,  x: 200, y: 192, side: 'right', label: 'D8',                     isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 9,  x: 200, y: 208, side: 'right', label: 'D9',  altLabel: 'PWM~',  isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 10, x: 200, y: 224, side: 'right', label: 'D10', altLabel: 'PWM~/SS', isPwm: true, isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 11, x: 200, y: 240, side: 'right', label: 'D11', altLabel: 'PWM~/MOSI', isPwm: true, isAnalog: false, isSerial: false, isI2C: false, isSPI: true },
    { pin: 12, x: 200, y: 256, side: 'right', label: 'D12', altLabel: 'MISO',  isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 13, x: 200, y: 272, side: 'right', label: 'D13', altLabel: 'SCK/LED', isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: true },

    // Left side — Analog pins (bottom to top: A0-A5)
    { pin: 14, x: 20, y: 272, side: 'left', label: 'A0',                       isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 15, x: 20, y: 256, side: 'left', label: 'A1',                       isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 16, x: 20, y: 240, side: 'left', label: 'A2',                       isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 17, x: 20, y: 224, side: 'left', label: 'A3',                       isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 18, x: 20, y: 208, side: 'left', label: 'A4',  altLabel: 'SDA',     isPwm: false, isAnalog: true,  isSerial: false, isI2C: true,  isSPI: false },
    { pin: 19, x: 20, y: 192, side: 'left', label: 'A5',  altLabel: 'SCL',     isPwm: false, isAnalog: true,  isSerial: false, isI2C: true,  isSPI: false },
  ],

  powerPins: [
    { label: '5V',    x: 20, y: 60,  side: 'left', type: '5v'  },
    { label: '3.3V',  x: 20, y: 76,  side: 'left', type: '3v3' },
    { label: 'GND',   x: 20, y: 92,  side: 'left', type: 'gnd' },
    { label: 'GND',   x: 20, y: 108, side: 'left', type: 'gnd' },
    { label: 'VIN',   x: 20, y: 124, side: 'left', type: 'vin' },
    { label: 'RESET', x: 20, y: 140, side: 'left', type: 'rst' },
    { label: 'AREF',  x: 20, y: 160, side: 'left', type: 'ref' },
    { label: 'GND',   x: 200, y: 288, side: 'right', type: 'gnd' },
  ],
};

// ============================================================================
// ARDUINO NANO
// ============================================================================
export const ARDUINO_NANO: BoardLayout = {
  name: 'nano',
  displayName: 'Arduino Nano',
  chipName: 'ATmega328P',
  width: 120,
  height: 380,
  boardColor: '#00979D',
  boardRadius: 4,
  chipX: 30,
  chipY: 130,
  chipWidth: 60,
  chipHeight: 80,
  usbX: 25,
  usbY: 5,
  usbWidth: 50,
  usbHeight: 30,
  totalDigital: 14,
  totalAnalog: 8,
  totalPwm: 6,

  pins: [
    // Left side (top to bottom)
    { pin: 0,  x: 10, y: 55,  side: 'left', label: 'D0',  altLabel: 'RX',    isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 1,  x: 10, y: 73,  side: 'left', label: 'D1',  altLabel: 'TX',    isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 2,  x: 10, y: 91,  side: 'left', label: 'D2',                      isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 3,  x: 10, y: 109, side: 'left', label: 'D3',  altLabel: 'PWM~',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 4,  x: 10, y: 127, side: 'left', label: 'D4',                      isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 5,  x: 10, y: 145, side: 'left', label: 'D5',  altLabel: 'PWM~',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 6,  x: 10, y: 163, side: 'left', label: 'D6',  altLabel: 'PWM~',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 7,  x: 10, y: 181, side: 'left', label: 'D7',                      isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 8,  x: 10, y: 199, side: 'left', label: 'D8',                      isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 9,  x: 10, y: 217, side: 'left', label: 'D9',  altLabel: 'PWM~',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: false },
    { pin: 10, x: 10, y: 235, side: 'left', label: 'D10', altLabel: 'PWM~/SS', isPwm: true, isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 11, x: 10, y: 253, side: 'left', label: 'D11', altLabel: 'MOSI',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 12, x: 10, y: 271, side: 'left', label: 'D12', altLabel: 'MISO',   isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 13, x: 10, y: 289, side: 'left', label: 'D13', altLabel: 'SCK',    isPwm: false, isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },

    // Right side (bottom to top) — Analog
    { pin: 14, x: 110, y: 289, side: 'right', label: 'A0',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 15, x: 110, y: 271, side: 'right', label: 'A1',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 16, x: 110, y: 253, side: 'right', label: 'A2',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 17, x: 110, y: 235, side: 'right', label: 'A3',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 18, x: 110, y: 217, side: 'right', label: 'A4',  altLabel: 'SDA',   isPwm: false, isAnalog: true,  isSerial: false, isI2C: true,  isSPI: false },
    { pin: 19, x: 110, y: 199, side: 'right', label: 'A5',  altLabel: 'SCL',   isPwm: false, isAnalog: true,  isSerial: false, isI2C: true,  isSPI: false },
    { pin: 20, x: 110, y: 181, side: 'right', label: 'A6',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 21, x: 110, y: 163, side: 'right', label: 'A7',                     isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
  ],

  powerPins: [
    { label: '5V',    x: 110, y: 55,  side: 'right', type: '5v'  },
    { label: '3.3V',  x: 110, y: 73,  side: 'right', type: '3v3' },
    { label: 'GND',   x: 110, y: 91,  side: 'right', type: 'gnd' },
    { label: 'GND',   x: 110, y: 109, side: 'right', type: 'gnd' },
    { label: 'VIN',   x: 110, y: 127, side: 'right', type: 'vin' },
    { label: 'RST',   x: 110, y: 145, side: 'right', type: 'rst' },
    { label: 'GND',   x: 10,  y: 307, side: 'left',  type: 'gnd' },
  ],
};

// ============================================================================
// ESP32 DevKit V1 (30-pin)
// ============================================================================
export const ESP32_DEVKIT: BoardLayout = {
  name: 'esp32',
  displayName: 'ESP32 DevKit V1',
  chipName: 'ESP32-WROOM-32',
  width: 140,
  height: 420,
  boardColor: '#1a1a2e',  // Dark blue-black
  boardRadius: 4,
  chipX: 25,
  chipY: 60,
  chipWidth: 90,
  chipHeight: 70,
  usbX: 30,
  usbY: 5,
  usbWidth: 55,
  usbHeight: 28,
  totalDigital: 25,
  totalAnalog: 18,
  totalPwm: 16,

  pins: [
    // Left side (top to bottom)
    { pin: 3,  x: 10, y: 150, side: 'left', label: 'RX0',  altLabel: 'GPIO3',  isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 1,  x: 10, y: 168, side: 'left', label: 'TX0',  altLabel: 'GPIO1',  isPwm: false, isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 21, x: 10, y: 186, side: 'left', label: 'D21',  altLabel: 'SDA',    isPwm: true,  isAnalog: false, isSerial: false, isI2C: true,  isSPI: false },
    { pin: 19, x: 10, y: 204, side: 'left', label: 'D19',  altLabel: 'MISO',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 18, x: 10, y: 222, side: 'left', label: 'D18',  altLabel: 'SCK',    isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 5,  x: 10, y: 240, side: 'left', label: 'D5',   altLabel: 'SS',     isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 17, x: 10, y: 258, side: 'left', label: 'D17',  altLabel: 'TX2',    isPwm: true,  isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 16, x: 10, y: 276, side: 'left', label: 'D16',  altLabel: 'RX2',    isPwm: true,  isAnalog: false, isSerial: true,  isI2C: false, isSPI: false },
    { pin: 4,  x: 10, y: 294, side: 'left', label: 'D4',   altLabel: 'ADC10',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 2,  x: 10, y: 312, side: 'left', label: 'D2',   altLabel: 'LED',    isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 15, x: 10, y: 330, side: 'left', label: 'D15',  altLabel: 'ADC13',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },

    // Right side (top to bottom)
    { pin: 22, x: 130, y: 150, side: 'right', label: 'D22',  altLabel: 'SCL',   isPwm: true,  isAnalog: false, isSerial: false, isI2C: true,  isSPI: false },
    { pin: 23, x: 130, y: 168, side: 'right', label: 'D23',  altLabel: 'MOSI',  isPwm: true,  isAnalog: false, isSerial: false, isI2C: false, isSPI: true  },
    { pin: 13, x: 130, y: 186, side: 'right', label: 'D13',  altLabel: 'ADC14', isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 12, x: 130, y: 204, side: 'right', label: 'D12',  altLabel: 'ADC15', isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 14, x: 130, y: 222, side: 'right', label: 'D14',  altLabel: 'ADC16', isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 27, x: 130, y: 240, side: 'right', label: 'D27',  altLabel: 'ADC17', isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 26, x: 130, y: 258, side: 'right', label: 'D26',  altLabel: 'DAC2',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 25, x: 130, y: 276, side: 'right', label: 'D25',  altLabel: 'DAC1',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 33, x: 130, y: 294, side: 'right', label: 'D33',  altLabel: 'ADC5',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 32, x: 130, y: 312, side: 'right', label: 'D32',  altLabel: 'ADC4',  isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
    { pin: 35, x: 130, y: 330, side: 'right', label: 'D35',  altLabel: 'ADC7',  isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false, isInputOnly: true },
    { pin: 34, x: 130, y: 348, side: 'right', label: 'D34',  altLabel: 'ADC6',  isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false, isInputOnly: true },
    { pin: 36, x: 130, y: 366, side: 'right', label: 'VP',   altLabel: 'ADC0',  isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false, isInputOnly: true },
    { pin: 39, x: 130, y: 384, side: 'right', label: 'VN',   altLabel: 'ADC3',  isPwm: false, isAnalog: true,  isSerial: false, isI2C: false, isSPI: false, isInputOnly: true },
    { pin: 0,  x: 10, y: 348, side: 'left',  label: 'D0',   altLabel: 'BOOT',   isPwm: true,  isAnalog: true,  isSerial: false, isI2C: false, isSPI: false },
  ],

  powerPins: [
    { label: '3.3V', x: 10,  y: 135, side: 'left',  type: '3v3' },
    { label: 'GND',  x: 10,  y: 365, side: 'left',  type: 'gnd' },
    { label: '5V',   x: 130, y: 135, side: 'right', type: '5v'  },
    { label: 'GND',  x: 130, y: 400, side: 'right', type: 'gnd' },
  ],
};

// ============================================================================
// BOARD REGISTRY
// ============================================================================
export const BOARD_LAYOUTS: Record<string, BoardLayout> = {
  'uno':   ARDUINO_UNO,
  'nano':  ARDUINO_NANO,
  'mega':  ARDUINO_UNO,   // Use Uno layout as base (TODO: full Mega layout)
  'esp32': ESP32_DEVKIT,
};

export function getBoardLayout(boardName: string): BoardLayout {
  return BOARD_LAYOUTS[boardName.toLowerCase()] || ARDUINO_UNO;
}

// ============================================================================
// PIN TYPE ICONS (SVG paths for inline rendering)
// ============================================================================
export const PIN_TYPE_ICONS: Record<string, string> = {
  digital:  '<path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" stroke-width="2" fill="none"/>',
  analog:   '<path d="M2 12c2-4 4-8 6-8s4 4 6 8 4 8 6 8" stroke="currentColor" stroke-width="2" fill="none"/>',
  pwm:      '<path d="M2 16h4v-8h4v8h4v-8h4v8h4" stroke="currentColor" stroke-width="2" fill="none"/>',
  serial:   '<path d="M8 4l-4 8 4 8M16 4l4 8-4 8" stroke="currentColor" stroke-width="2" fill="none"/>',
  i2c:      '<circle cx="8" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="16" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M11 12h2" stroke="currentColor" stroke-width="2"/>',
  spi:      '<path d="M4 8h16M4 12h16M4 16h16" stroke="currentColor" stroke-width="2" fill="none"/>',
  servo:    '<circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 6v6l4 3" stroke="currentColor" stroke-width="2" fill="none"/>',
};

// ============================================================================
// PIN MODE COLORS
// ============================================================================
export const PIN_COLORS = {
  inactive:    '#3a3a4a',  // Unused pin
  output:      '#4EC9B0',  // Digital output - teal
  input:       '#58A6FF',  // Digital input - blue
  inputPullup: '#6CB4EE',  // Input with pullup - light blue
  pwm:         '#C586C0',  // PWM output - purple
  analog:      '#FFD700',  // Analog input - gold
  serial:      '#F97316',  // Serial TX/RX - orange
  i2c:         '#22D3EE',  // I2C SDA/SCL - cyan
  spi:         '#A78BFA',  // SPI - violet
  servo:       '#F472B6',  // Servo - pink
  power:       '#EF4444',  // VCC/5V - red
  ground:      '#6B7280',  // GND - gray
  warning:     '#FBBF24',  // Has warnings - amber
};
