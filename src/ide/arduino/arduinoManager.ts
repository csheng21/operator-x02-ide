// src/ide/arduino/arduinoManager.ts
// Arduino Manager - State management and operation coordination
// Manages board connections, compilation state, and serial monitor

import { 
  arduinoService, 
  ArduinoBoard, 
  SerialPortInfo, 
  CompileResult,
  ArduinoResult,
  MemoryUsage,
  COMMON_BAUD_RATES,
  POPULAR_BOARDS,
} from './arduinoService';
import { EventEmitter } from '../../utils/eventEmitter';

// ================================
// TYPES
// ================================

export interface ArduinoState {
  isCliInstalled: boolean;
  selectedBoard: ArduinoBoard | null;
  selectedPort: string | null;
  selectedBaudRate: number;
  connectedBoards: ArduinoBoard[];
  availablePorts: SerialPortInfo[];
  isCompiling: boolean;
  isUploading: boolean;
  isSerialConnected: boolean;
  lastCompileResult: CompileResult | null;
  lastUploadResult: ArduinoResult | null;
  serialOutput: string[];
  autoScroll: boolean;
  showTimestamps: boolean;
  lineEnding: 'none' | 'nl' | 'cr' | 'nlcr';
}

export type ArduinoEvent = 
  | { type: 'state-changed'; state: Partial<ArduinoState> }
  | { type: 'board-detected'; board: ArduinoBoard }
  | { type: 'board-disconnected'; port: string }
  | { type: 'compile-started'; sketchPath: string }
  | { type: 'compile-complete'; result: CompileResult }
  | { type: 'upload-started'; sketchPath: string }
  | { type: 'upload-complete'; result: ArduinoResult }
  | { type: 'serial-connected'; port: string }
  | { type: 'serial-disconnected'; port: string }
  | { type: 'serial-data'; port: string; data: string }
  | { type: 'serial-error'; port: string; error: string }
  | { type: 'error'; message: string };

// ================================
// ARDUINO MANAGER CLASS
// ================================

class ArduinoManager extends EventEmitter<ArduinoEvent> {
  private state: ArduinoState = {
    isCliInstalled: false,
    selectedBoard: null,
    selectedPort: null,
    selectedBaudRate: 9600,
    connectedBoards: [],
    availablePorts: [],
    isCompiling: false,
    isUploading: false,
    isSerialConnected: false,
    lastCompileResult: null,
    lastUploadResult: null,
    serialOutput: [],
    autoScroll: true,
    showTimestamps: false,
    lineEnding: 'nl',
  };

  private serialUnlisteners: (() => void)[] = [];
  private boardPollInterval: NodeJS.Timeout | null = null;
  private maxSerialLines = 5000;

  constructor() {
    super();
    this.initialize();
  }

  // ================================
  // INITIALIZATION
  // ================================

  async initialize(): Promise<void> {
    console.log('🔌 [ArduinoManager] Initializing...');
    
    try {
      // Check if Arduino CLI is installed
      const cliResult = await arduinoService.checkCli();
      this.updateState({ isCliInstalled: cliResult.success });
      
      if (cliResult.success) {
        console.log('✅ [ArduinoManager] Arduino CLI found:', cliResult.stdout.split('\n')[0]);
        
        // Setup serial event listeners
        await this.setupSerialListeners();
        
        // Initial board detection
        await this.refreshBoards();
        
        // Start polling for board changes
        this.startBoardPolling();
      } else {
        console.warn('⚠️ [ArduinoManager] Arduino CLI not found');
      }
    } catch (error) {
      console.error('❌ [ArduinoManager] Initialization failed:', error);
      this.emit({ type: 'error', message: `Initialization failed: ${error}` });
    }
  }

  /**
   * Setup serial port event listeners
   */
  private async setupSerialListeners(): Promise<void> {
    // Clean up existing listeners
    this.serialUnlisteners.forEach(unlisten => unlisten());
    this.serialUnlisteners = [];

    // Serial data
    const dataUnlisten = await arduinoService.onSerialData((event) => {
      this.handleSerialData(event.port, event.data);
    });
    this.serialUnlisteners.push(dataUnlisten);

    // Serial errors
    const errorUnlisten = await arduinoService.onSerialError((event) => {
      this.emit({ type: 'serial-error', port: event.port, error: event.error });
      console.error(`❌ [Serial] Error on ${event.port}: ${event.error}`);
    });
    this.serialUnlisteners.push(errorUnlisten);

    // Serial connected
    const connectedUnlisten = await arduinoService.onSerialConnected((port) => {
      this.updateState({ isSerialConnected: true });
      this.emit({ type: 'serial-connected', port });
      console.log(`✅ [Serial] Connected to ${port}`);
    });
    this.serialUnlisteners.push(connectedUnlisten);

    // Serial disconnected
    const disconnectedUnlisten = await arduinoService.onSerialDisconnected((port) => {
      this.updateState({ isSerialConnected: false });
      this.emit({ type: 'serial-disconnected', port });
      console.log(`🔌 [Serial] Disconnected from ${port}`);
    });
    this.serialUnlisteners.push(disconnectedUnlisten);
  }

  /**
   * Start polling for board changes
   */
  private startBoardPolling(): void {
    if (this.boardPollInterval) {
      clearInterval(this.boardPollInterval);
    }

    // Poll every 3 seconds
    this.boardPollInterval = setInterval(() => {
      this.refreshBoards(true);
    }, 3000);
  }

  /**
   * Stop board polling
   */
  stopBoardPolling(): void {
    if (this.boardPollInterval) {
      clearInterval(this.boardPollInterval);
      this.boardPollInterval = null;
    }
  }

  // ================================
  // STATE MANAGEMENT
  // ================================

  getState(): Readonly<ArduinoState> {
    return { ...this.state };
  }

  private updateState(partial: Partial<ArduinoState>): void {
    this.state = { ...this.state, ...partial };
    this.emit({ type: 'state-changed', state: partial });
  }

  // ================================
  // BOARD MANAGEMENT
  // ================================

  /**
   * Refresh connected boards
   */
  async refreshBoards(silent = false): Promise<void> {
    try {
      const [boards, ports] = await Promise.all([
        arduinoService.listBoards().catch(() => []),
        arduinoService.listSerialPorts().catch(() => []),
      ]);

      // Detect new boards
      const previousPorts = new Set(this.state.connectedBoards.map(b => b.port));
      const newBoards = boards.filter(b => !previousPorts.has(b.port));
      
      // Detect disconnected boards
      const currentPorts = new Set(boards.map(b => b.port));
      const disconnected = this.state.connectedBoards.filter(b => !currentPorts.has(b.port));

      // Update state
      this.updateState({ 
        connectedBoards: boards,
        availablePorts: ports,
      });

      // Emit events for new boards
      newBoards.forEach(board => {
        if (!silent) {
          console.log(`🔌 [ArduinoManager] Board detected: ${board.board_name} on ${board.port}`);
        }
        this.emit({ type: 'board-detected', board });
      });

      // Emit events for disconnected boards
      disconnected.forEach(board => {
        if (!silent) {
          console.log(`🔌 [ArduinoManager] Board disconnected: ${board.port}`);
        }
        this.emit({ type: 'board-disconnected', port: board.port });
        
        // Clear selection if disconnected board was selected
        if (this.state.selectedPort === board.port) {
          this.updateState({ selectedBoard: null, selectedPort: null });
        }
      });

      // Auto-select first board if nothing selected
      if (!this.state.selectedBoard && boards.length > 0) {
        const firstValidBoard = boards.find(b => b.fqbn);
        if (firstValidBoard) {
          this.selectBoard(firstValidBoard);
        }
      }
    } catch (error) {
      if (!silent) {
        console.error('❌ [ArduinoManager] Failed to refresh boards:', error);
      }
    }
  }

  /**
   * Select a board
   */
  selectBoard(board: ArduinoBoard | null): void {
    this.updateState({ 
      selectedBoard: board,
      selectedPort: board?.port || null,
    });
    console.log(`📌 [ArduinoManager] Selected: ${board?.board_name || 'None'} on ${board?.port || 'N/A'}`);
  }

  /**
   * Select a port
   */
  selectPort(port: string | null): void {
    this.updateState({ selectedPort: port });
    
    // Find matching board
    if (port) {
      const board = this.state.connectedBoards.find(b => b.port === port);
      if (board) {
        this.updateState({ selectedBoard: board });
      }
    }
  }

  /**
   * Set FQBN manually (for unknown boards)
   */
  setFqbn(fqbn: string): void {
    if (this.state.selectedBoard) {
      this.updateState({
        selectedBoard: { ...this.state.selectedBoard, fqbn },
      });
    } else if (this.state.selectedPort) {
      // Create a virtual board entry
      this.updateState({
        selectedBoard: {
          port: this.state.selectedPort,
          fqbn,
          board_name: POPULAR_BOARDS.find(b => b.fqbn === fqbn)?.name || 'Manual Selection',
          core: fqbn.split(':').slice(0, 2).join(':'),
          protocol: 'serial',
        },
      });
    }
  }

  // ================================
  // COMPILATION
  // ================================

  /**
   * Compile current sketch
   */
  async compile(sketchPath: string, options?: { verbose?: boolean }): Promise<CompileResult> {
    if (!this.state.selectedBoard?.fqbn) {
      throw new Error('No board selected');
    }

    this.updateState({ isCompiling: true });
    this.emit({ type: 'compile-started', sketchPath });

    try {
      const result = await arduinoService.compile(
        sketchPath,
        this.state.selectedBoard.fqbn,
        { verbose: options?.verbose }
      );

      this.updateState({ 
        isCompiling: false,
        lastCompileResult: result,
      });

      this.emit({ type: 'compile-complete', result });
      
      if (result.success) {
        console.log('✅ [ArduinoManager] Compilation successful');
        if (result.memory_usage) {
          console.log(arduinoService.formatMemoryUsage(result.memory_usage));
        }
      } else {
        console.error('❌ [ArduinoManager] Compilation failed:', result.stderr);
      }

      return result;
    } catch (error) {
      this.updateState({ isCompiling: false });
      throw error;
    }
  }

  /**
   * Verify sketch (compile without uploading)
   */
  async verify(sketchPath: string): Promise<CompileResult> {
    return this.compile(sketchPath);
  }

  // ================================
  // UPLOAD
  // ================================

  /**
   * Upload sketch to board
   */
  async upload(sketchPath: string, options?: { verbose?: boolean; compileFirst?: boolean }): Promise<ArduinoResult | CompileResult> {
    if (!this.state.selectedBoard?.fqbn) {
      throw new Error('No board selected');
    }
    if (!this.state.selectedPort) {
      throw new Error('No port selected');
    }

    // Stop serial monitor if connected
    if (this.state.isSerialConnected) {
      await this.disconnectSerial();
    }

    this.updateState({ isUploading: true });
    this.emit({ type: 'upload-started', sketchPath });

    try {
      let result: ArduinoResult | CompileResult;

      if (options?.compileFirst !== false) {
        // Compile and upload
        result = await arduinoService.compileAndUpload(
          sketchPath,
          this.state.selectedPort,
          this.state.selectedBoard.fqbn,
          { verbose: options?.verbose }
        );
      } else {
        // Upload only
        result = await arduinoService.upload(
          sketchPath,
          this.state.selectedPort,
          this.state.selectedBoard.fqbn,
          { verbose: options?.verbose }
        );
      }

      this.updateState({ 
        isUploading: false,
        lastUploadResult: result,
      });

      this.emit({ type: 'upload-complete', result });

      if (result.success) {
        console.log('✅ [ArduinoManager] Upload successful');
      } else {
        console.error('❌ [ArduinoManager] Upload failed:', result.stderr);
      }

      return result;
    } catch (error) {
      this.updateState({ isUploading: false });
      throw error;
    }
  }

  // ================================
  // SERIAL MONITOR
  // ================================

  /**
   * Connect to serial monitor
   */
  async connectSerial(baudRate?: number): Promise<void> {
    if (!this.state.selectedPort) {
      throw new Error('No port selected');
    }

    const baud = baudRate || this.state.selectedBaudRate;
    this.updateState({ selectedBaudRate: baud });

    await arduinoService.startSerialMonitor(this.state.selectedPort, baud);
  }

  /**
   * Disconnect from serial monitor
   */
  async disconnectSerial(): Promise<void> {
    if (this.state.selectedPort) {
      await arduinoService.stopSerialMonitor(this.state.selectedPort);
    }
    this.updateState({ isSerialConnected: false });
  }

  /**
   * Send data through serial
   */
  async sendSerial(data: string): Promise<void> {
    if (!this.state.selectedPort || !this.state.isSerialConnected) {
      throw new Error('Serial not connected');
    }

    // Add line ending
    let finalData = data;
    switch (this.state.lineEnding) {
      case 'nl':
        finalData += '\n';
        break;
      case 'cr':
        finalData += '\r';
        break;
      case 'nlcr':
        finalData += '\r\n';
        break;
    }

    await arduinoService.serialSend(this.state.selectedPort, finalData, false);
  }

  /**
   * Handle incoming serial data
   */
  private handleSerialData(port: string, data: string): void {
    const lines = [...this.state.serialOutput];
    
    // Add timestamp if enabled
    const prefix = this.state.showTimestamps 
      ? `[${new Date().toLocaleTimeString()}] `
      : '';

    // Split data into lines
    const newLines = data.split('\n').filter(line => line.length > 0);
    
    newLines.forEach(line => {
      lines.push(prefix + line);
    });

    // Trim to max lines
    while (lines.length > this.maxSerialLines) {
      lines.shift();
    }

    this.updateState({ serialOutput: lines });
    this.emit({ type: 'serial-data', port, data });
  }

  /**
   * Clear serial output
   */
  clearSerialOutput(): void {
    this.updateState({ serialOutput: [] });
  }

  /**
   * Set serial options
   */
  setSerialOptions(options: {
    baudRate?: number;
    autoScroll?: boolean;
    showTimestamps?: boolean;
    lineEnding?: 'none' | 'nl' | 'cr' | 'nlcr';
  }): void {
    this.updateState({
      selectedBaudRate: options.baudRate ?? this.state.selectedBaudRate,
      autoScroll: options.autoScroll ?? this.state.autoScroll,
      showTimestamps: options.showTimestamps ?? this.state.showTimestamps,
      lineEnding: options.lineEnding ?? this.state.lineEnding,
    });
  }

  /**
   * Reset board
   */
  async resetBoard(): Promise<void> {
    if (!this.state.selectedPort) {
      throw new Error('No port selected');
    }
    await arduinoService.resetBoard(this.state.selectedPort);
    console.log('🔄 [ArduinoManager] Board reset');
  }

  // ================================
  // CORE & LIBRARY MANAGEMENT
  // ================================

  /**
   * Install core for selected board
   */
  async installRequiredCore(): Promise<ArduinoResult> {
    if (!this.state.selectedBoard?.core) {
      throw new Error('No board selected or core unknown');
    }
    return arduinoService.installCore(this.state.selectedBoard.core);
  }

  /**
   * Setup ESP32 support
   */
  async setupEsp32(): Promise<void> {
    console.log('🔧 [ArduinoManager] Setting up ESP32...');
    await arduinoService.setupEsp32();
    console.log('✅ [ArduinoManager] ESP32 setup complete');
  }

  /**
   * Setup ESP8266 support
   */
  async setupEsp8266(): Promise<void> {
    console.log('🔧 [ArduinoManager] Setting up ESP8266...');
    await arduinoService.setupEsp8266();
    console.log('✅ [ArduinoManager] ESP8266 setup complete');
  }

  // ================================
  // CLEANUP
  // ================================

  async dispose(): Promise<void> {
    this.stopBoardPolling();
    
    // Disconnect serial
    if (this.state.isSerialConnected && this.state.selectedPort) {
      await this.disconnectSerial();
    }

    // Remove listeners
    this.serialUnlisteners.forEach(unlisten => unlisten());
    this.serialUnlisteners = [];
  }
}

// Export singleton instance
export const arduinoManager = new ArduinoManager();
export default arduinoManager;
