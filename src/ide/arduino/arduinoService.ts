// src/ide/arduino/arduinoService.ts
// Arduino Service - TypeScript interface to Tauri backend commands
// Handles all communication with Arduino CLI through the Rust backend

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ================================
// TYPES AND INTERFACES
// ================================

export interface ArduinoBoard {
  port: string;
  fqbn: string;           // Fully Qualified Board Name (e.g., "arduino:avr:uno")
  board_name: string;
  core: string;
  protocol: string;
}

export interface SerialPortInfo {
  port_name: string;
  port_type: string;
  vid: number;
  pid: number;
  manufacturer: string;
  product: string;
  serial_number: string;
  is_arduino_compatible: boolean;
  chip_type: string;
}

export interface ArduinoCore {
  id: string;
  installed: string;
  latest: string;
  name: string;
}

export interface ArduinoLibrary {
  name: string;
  version: string;
  installed: boolean;
  author: string;
  sentence: string;
}

export interface MemoryUsage {
  flash_used: number;
  flash_total: number;
  flash_percent: number;
  ram_used: number;
  ram_total: number;
  ram_percent: number;
}

export interface CompileResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  binary_path?: string;
  binary_size?: number;
  memory_usage?: MemoryUsage;
}

export interface ArduinoResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface SerialDataEvent {
  port: string;
  data: string;
}

export interface SerialErrorEvent {
  port: string;
  error: string;
}

// Common board URLs for quick setup
export const COMMON_BOARD_URLS = {
  esp32: 'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json',
  esp8266: 'http://arduino.esp8266.com/stable/package_esp8266com_index.json',
  stm32: 'https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json',
  attiny: 'http://drazzy.com/package_drazzy.com_index.json',
  rp2040: 'https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json',
  megaavr: 'https://mcudude.github.io/MegaCoreX/package_MCUdude_MegaCoreX_index.json',
  teensy: 'https://www.pjrc.com/teensy/package_teensy_index.json',
} as const;

// Common baud rates for serial monitor
export const COMMON_BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 14400, 19200, 28800,
  38400, 57600, 115200, 230400, 250000, 500000, 1000000, 2000000
] as const;

// Popular Arduino boards with their FQBNs
export const POPULAR_BOARDS: { name: string; fqbn: string; core: string }[] = [
  { name: 'Arduino Uno', fqbn: 'arduino:avr:uno', core: 'arduino:avr' },
  { name: 'Arduino Nano', fqbn: 'arduino:avr:nano', core: 'arduino:avr' },
  { name: 'Arduino Mega 2560', fqbn: 'arduino:avr:mega', core: 'arduino:avr' },
  { name: 'Arduino Leonardo', fqbn: 'arduino:avr:leonardo', core: 'arduino:avr' },
  { name: 'Arduino Micro', fqbn: 'arduino:avr:micro', core: 'arduino:avr' },
  { name: 'Arduino Due', fqbn: 'arduino:sam:arduino_due_x', core: 'arduino:sam' },
  { name: 'Arduino Zero', fqbn: 'arduino:samd:arduino_zero_native', core: 'arduino:samd' },
  { name: 'Arduino MKR WiFi 1010', fqbn: 'arduino:samd:mkrwifi1010', core: 'arduino:samd' },
  { name: 'ESP32 Dev Module', fqbn: 'esp32:esp32:esp32', core: 'esp32:esp32' },
  { name: 'ESP32-S2', fqbn: 'esp32:esp32:esp32s2', core: 'esp32:esp32' },
  { name: 'ESP32-S3', fqbn: 'esp32:esp32:esp32s3', core: 'esp32:esp32' },
  { name: 'ESP32-C3', fqbn: 'esp32:esp32:esp32c3', core: 'esp32:esp32' },
  { name: 'ESP8266 NodeMCU', fqbn: 'esp8266:esp8266:nodemcuv2', core: 'esp8266:esp8266' },
  { name: 'ESP8266 Wemos D1 Mini', fqbn: 'esp8266:esp8266:d1_mini', core: 'esp8266:esp8266' },
  { name: 'Teensy 4.1', fqbn: 'teensy:avr:teensy41', core: 'teensy:avr' },
  { name: 'Teensy 4.0', fqbn: 'teensy:avr:teensy40', core: 'teensy:avr' },
  { name: 'Raspberry Pi Pico', fqbn: 'rp2040:rp2040:rpipico', core: 'rp2040:rp2040' },
  { name: 'STM32 Blue Pill (F103C8)', fqbn: 'STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C8', core: 'STMicroelectronics:stm32' },
];

// ================================
// ARDUINO SERVICE CLASS
// ================================

class ArduinoService {
  private serialListeners: Map<string, UnlistenFn[]> = new Map();
  private isCliInstalled: boolean | null = null;

  // ================================
  // CLI DETECTION
  // ================================

  /**
   * Check if Arduino CLI is installed
   */
  async checkCli(): Promise<ArduinoResult> {
    try {
      const result = await invoke<ArduinoResult>('arduino_check_cli');
      this.isCliInstalled = result.success;
      return result;
    } catch (error) {
      this.isCliInstalled = false;
      throw new Error(`Arduino CLI not found: ${error}`);
    }
  }

  /**
   * Check if CLI is available (cached)
   */
  async isCliAvailable(): Promise<boolean> {
    if (this.isCliInstalled === null) {
      try {
        await this.checkCli();
      } catch {
        return false;
      }
    }
    return this.isCliInstalled === true;
  }

  /**
   * Get Arduino CLI configuration
   */
  async getConfig(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_get_config');
  }

  /**
   * Initialize Arduino CLI configuration
   */
  async initConfig(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_init_config');
  }

  // ================================
  // BOARD DETECTION
  // ================================

  /**
   * List all connected Arduino boards
   */
  async listBoards(): Promise<ArduinoBoard[]> {
    return invoke<ArduinoBoard[]>('arduino_list_boards');
  }

  /**
   * List all serial ports (including non-Arduino)
   */
  async listSerialPorts(): Promise<SerialPortInfo[]> {
    return invoke<SerialPortInfo[]>('arduino_list_serial_ports');
  }

  /**
   * Check if CH341 driver is working
   */
  async checkCh341Driver(): Promise<boolean> {
    return invoke<boolean>('arduino_check_ch341_driver');
  }

  /**
   * Auto-detect the best board and port
   */
  async autoDetect(): Promise<{ board: ArduinoBoard | null; ports: SerialPortInfo[] }> {
    const [boards, ports] = await Promise.all([
      this.listBoards().catch(() => [] as ArduinoBoard[]),
      this.listSerialPorts().catch(() => [] as SerialPortInfo[]),
    ]);

    // Find first board with matching port
    const board = boards.find(b => b.fqbn && b.port) || null;

    return { board, ports };
  }

  // ================================
  // COMPILATION
  // ================================

  /**
   * Compile an Arduino sketch
   */
  async compile(
    sketchPath: string,
    fqbn: string,
    options?: {
      outputDir?: string;
      verbose?: boolean;
      buildProperties?: string[];
    }
  ): Promise<CompileResult> {
    return invoke<CompileResult>('arduino_compile', {
      sketch_path: sketchPath,
      fqbn,
      output_dir: options?.outputDir,
      verbose: options?.verbose,
      build_properties: options?.buildProperties,
    });
  }

  /**
   * Preprocess sketch (syntax check only)
   */
  async preprocess(sketchPath: string, fqbn: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_preprocess', {
      sketch_path: sketchPath,
      fqbn,
    });
  }

  // ================================
  // UPLOAD
  // ================================

  /**
   * Upload sketch to board
   */
  async upload(
    sketchPath: string,
    port: string,
    fqbn: string,
    options?: {
      verbose?: boolean;
      verify?: boolean;
    }
  ): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_upload', {
      sketch_path: sketchPath,
      port,
      fqbn,
      verbose: options?.verbose,
      verify: options?.verify,
    });
  }

  /**
   * Compile and upload in one step
   */
  async compileAndUpload(
    sketchPath: string,
    port: string,
    fqbn: string,
    options?: { verbose?: boolean }
  ): Promise<CompileResult> {
    return invoke<CompileResult>('arduino_compile_and_upload', {
      sketch_path: sketchPath,
      port,
      fqbn,
      verbose: options?.verbose,
    });
  }

  // ================================
  // CORE MANAGEMENT
  // ================================

  /**
   * Install an Arduino core
   */
  async installCore(core: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_install_core', { core });
  }

  /**
   * Uninstall an Arduino core
   */
  async uninstallCore(core: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_uninstall_core', { core });
  }

  /**
   * List installed cores
   */
  async listCores(): Promise<ArduinoCore[]> {
    return invoke<ArduinoCore[]>('arduino_list_cores');
  }

  /**
   * Search for cores
   */
  async searchCores(query: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_search_cores', { query });
  }

  /**
   * Update core index
   */
  async updateCoreIndex(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_update_core_index');
  }

  // ================================
  // LIBRARY MANAGEMENT
  // ================================

  /**
   * Install a library
   */
  async installLibrary(library: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_install_library', { library });
  }

  /**
   * Install library from zip
   */
  async installLibraryZip(zipPath: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_install_library_zip', { zip_path: zipPath });
  }

  /**
   * Install library from git
   */
  async installLibraryGit(gitUrl: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_install_library_git', { git_url: gitUrl });
  }

  /**
   * Uninstall a library
   */
  async uninstallLibrary(library: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_uninstall_library', { library });
  }

  /**
   * List installed libraries
   */
  async listLibraries(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_list_libraries');
  }

  /**
   * Search for libraries
   */
  async searchLibraries(query: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_search_libraries', { query });
  }

  /**
   * Update library index
   */
  async updateLibraryIndex(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_update_library_index');
  }

  /**
   * Upgrade all libraries
   */
  async upgradeLibraries(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_upgrade_libraries');
  }

  // ================================
  // BOARD MANAGER URLs
  // ================================

  /**
   * Add a board manager URL
   */
  async addBoardUrl(url: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_add_board_url', { url });
  }

  /**
   * Remove a board manager URL
   */
  async removeBoardUrl(url: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_remove_board_url', { url });
  }

  /**
   * List board manager URLs
   */
  async listBoardUrls(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_list_board_urls');
  }

  /**
   * Add common board URL by name
   */
  async addCommonBoardUrl(name: keyof typeof COMMON_BOARD_URLS): Promise<ArduinoResult> {
    const url = COMMON_BOARD_URLS[name];
    if (!url) {
      throw new Error(`Unknown board URL: ${name}`);
    }
    return this.addBoardUrl(url);
  }

  /**
   * Setup ESP32 support (add URL + install core)
   */
  async setupEsp32(): Promise<void> {
    await this.addBoardUrl(COMMON_BOARD_URLS.esp32);
    await this.updateCoreIndex();
    await this.installCore('esp32:esp32');
  }

  /**
   * Setup ESP8266 support
   */
  async setupEsp8266(): Promise<void> {
    await this.addBoardUrl(COMMON_BOARD_URLS.esp8266);
    await this.updateCoreIndex();
    await this.installCore('esp8266:esp8266');
  }

  // ================================
  // SERIAL MONITOR
  // ================================

  /**
   * Start serial monitor
   */
  async startSerialMonitor(port: string, baudRate: number = 9600): Promise<void> {
    return invoke<void>('arduino_serial_monitor_start', {
      port,
      baud_rate: baudRate,
    });
  }

  /**
   * Stop serial monitor
   */
  async stopSerialMonitor(port: string): Promise<void> {
    // Remove listeners
    const listeners = this.serialListeners.get(port);
    if (listeners) {
      listeners.forEach(unlisten => unlisten());
      this.serialListeners.delete(port);
    }

    return invoke<void>('arduino_serial_monitor_stop', { port });
  }

  /**
   * Send data through serial monitor
   */
  async serialSend(port: string, data: string, addNewline: boolean = true): Promise<void> {
    return invoke<void>('arduino_serial_monitor_send', {
      port,
      data,
      add_newline: addNewline,
    });
  }

  /**
   * Listen for serial data
   */
  async onSerialData(callback: (event: SerialDataEvent) => void): Promise<UnlistenFn> {
    return listen<SerialDataEvent>('arduino-serial-data', (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for serial errors
   */
  async onSerialError(callback: (event: SerialErrorEvent) => void): Promise<UnlistenFn> {
    return listen<SerialErrorEvent>('arduino-serial-error', (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for serial connection
   */
  async onSerialConnected(callback: (port: string) => void): Promise<UnlistenFn> {
    return listen<string>('arduino-serial-connected', (event) => {
      callback(event.payload);
    });
  }

  /**
   * Listen for serial disconnection
   */
  async onSerialDisconnected(callback: (port: string) => void): Promise<UnlistenFn> {
    return listen<string>('arduino-serial-disconnected', (event) => {
      callback(event.payload);
    });
  }

  /**
   * Set DTR signal (for board reset)
   */
  async setDtr(port: string, value: boolean): Promise<void> {
    return invoke<void>('arduino_serial_set_dtr', { port, value });
  }

  /**
   * Reset Arduino board
   */
  async resetBoard(port: string): Promise<void> {
    return invoke<void>('arduino_reset_board', { port });
  }

  // ================================
  // SKETCH MANAGEMENT
  // ================================

  /**
   * Create a new sketch
   */
  async newSketch(sketchName: string, destinationDir: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_new_sketch', {
      sketch_name: sketchName,
      destination_dir: destinationDir,
    });
  }

  /**
   * Get sketch info
   */
  async getSketchInfo(sketchPath: string, fqbn: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_sketch_info', {
      sketch_path: sketchPath,
      fqbn,
    });
  }

  // ================================
  // UPDATE
  // ================================

  /**
   * Update all indexes
   */
  async updateAllIndexes(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_update_all_indexes');
  }

  /**
   * Upgrade Arduino CLI
   */
  async upgradeCli(): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_upgrade_cli');
  }

  // ================================
  // BOOTLOADER
  // ================================

  /**
   * Burn bootloader
   */
  async burnBootloader(port: string, fqbn: string, programmer: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_burn_bootloader', {
      port,
      fqbn,
      programmer,
    });
  }

  /**
   * List programmers
   */
  async listProgrammers(fqbn: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_list_programmers', { fqbn });
  }

  // ================================
  // DEBUG
  // ================================

  /**
   * Check debug support
   */
  async checkDebug(sketchPath: string, fqbn: string, port: string): Promise<ArduinoResult> {
    return invoke<ArduinoResult>('arduino_debug_check', {
      sketch_path: sketchPath,
      fqbn,
      port,
    });
  }

  // ================================
  // HELPERS
  // ================================

  /**
   * Get board by FQBN from popular boards
   */
  getBoardByFqbn(fqbn: string): typeof POPULAR_BOARDS[0] | undefined {
    return POPULAR_BOARDS.find(b => b.fqbn === fqbn);
  }

  /**
   * Check if a file is an Arduino sketch
   */
  isArduinoSketch(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext === 'ino' || ext === 'pde';
  }

  /**
   * Get sketch folder from file path
   */
  getSketchFolder(filePath: string): string {
    // Arduino sketches must be in a folder with the same name
    const parts = filePath.split(/[/\\]/);
    parts.pop(); // Remove filename
    return parts.join('/');
  }

  /**
   * Format memory usage for display
   */
  formatMemoryUsage(usage: MemoryUsage): string {
    return [
      `Flash: ${this.formatBytes(usage.flash_used)} / ${this.formatBytes(usage.flash_total)} (${usage.flash_percent.toFixed(1)}%)`,
      `RAM: ${this.formatBytes(usage.ram_used)} / ${this.formatBytes(usage.ram_total)} (${usage.ram_percent.toFixed(1)}%)`,
    ].join('\n');
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Export singleton instance
export const arduinoService = new ArduinoService();
export default arduinoService;
