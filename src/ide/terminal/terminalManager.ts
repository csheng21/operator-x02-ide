/**
 * ====================================================================================================
 * FILE: src/ide/terminal/terminalManager.ts - UPDATED WITH ERROR HIGHLIGHTING
 * ====================================================================================================
 * 
 * UPDATES IN THIS VERSION:
 * - ✅ Integrated error highlighting system
 * - ✅ Automatic error detection and formatting
 * - ✅ Clickable file paths that open in editor
 * - ✅ Beautiful error display with color coding
 * - ✅ Stack trace formatting
 * - ✅ Warning detection and highlighting
 * 
 * HOW TO USE:
 * 1. Import this file instead of the old terminalManager.ts
 * 2. Also import the new error system files:
 *    - errorParser.ts
 *    - errorHighlighter.ts
 *    - terminalErrorIntegration.ts
 * 
 * ====================================================================================================
 */

import { TerminalComponent, TerminalOptions } from './terminalComponent';
import { TerminalErrorIntegration } from './terminalErrorIntegration';

// Global type declarations for Tauri
declare global {
  interface Window {
    __TAURI__?: {
      shell: {
        Command: any;
      };
      path: {
        currentDir: () => Promise<string>;
        homeDir: () => Promise<string>;
        appDir: () => Promise<string>;
      };
    };
  }
}

export class TerminalManager {
  private static instance: TerminalManager;
  private terminals: Map<string, TerminalComponent> = new Map();
  private activeTerminalId: string | null = null;
  private isIntegratedMode: boolean = true;
  private workingDirectory: string = '';
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  private constructor() {
    console.log('🖥️ Terminal Manager instance created with ERROR HIGHLIGHTING enabled');
    this.initializeWorkingDirectory();
    this.initializeErrorHighlighting();
  }

  /**
   * Initialize error highlighting system
   */
  private initializeErrorHighlighting(): void {
    try {
      TerminalErrorIntegration.initialize();
      console.log('✅ Error highlighting system ready');
    } catch (error) {
      console.error('Failed to initialize error highlighting:', error);
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  /**
   * Initialize with real working directory
   */
  private async initializeWorkingDirectory(): Promise<void> {
    try {
      if (window.__TAURI__ && window.__TAURI__.path) {
        console.log('🔍 Detecting working directory using Tauri...');
        this.workingDirectory = await window.__TAURI__.path.currentDir();
        console.log('📁 Terminal initialized with real path:', this.workingDirectory);
      } else {
        throw new Error('Tauri not available');
      }
    } catch (error) {
      console.error('Failed to get real path:', error);
      this.workingDirectory = 'C:\\Users\\Developer\\Projects\\ai-ide';
      console.log('📁 Terminal using fallback path:', this.workingDirectory);
    }
  }

  /**
   * Create a new terminal
   */
  public createTerminal(id: string, options: TerminalOptions): TerminalComponent {
    console.log('🖥️ Creating terminal with ID:', id);
    
    if (this.isIntegratedMode) {
      const integratedContainer = this.getIntegratedTerminalContainer();
      if (integratedContainer) {
        options.container = integratedContainer;
      }
    }
    
    const terminal = new TerminalComponent(options);
    this.terminals.set(id, terminal);
    this.activeTerminalId = id;
    return terminal;
  }

  /**
   * Get the integrated terminal container from explorer tabs
   */
  private getIntegratedTerminalContainer(): HTMLElement | null {
    const terminalContent = document.getElementById('terminal-content');
    if (terminalContent) {
      let terminalContainer = terminalContent.querySelector('.integrated-terminal') as HTMLElement;
      if (!terminalContainer) {
        terminalContainer = terminalContent.querySelector('.terminal-container') as HTMLElement;
      }
      return terminalContainer || terminalContent;
    }
    
    return document.querySelector('.terminal-container') as HTMLElement;
  }

  /**
   * Get a terminal by ID
   */
  public getTerminal(id: string): TerminalComponent | undefined {
    return this.terminals.get(id);
  }

  /**
   * Get the active terminal
   */
  public getActiveTerminal(): TerminalComponent | null {
    if (!this.activeTerminalId) return null;
    return this.terminals.get(this.activeTerminalId) || null;
  }

  /**
   * Set the active terminal
   */
  public setActiveTerminal(id: string): boolean {
    if (!this.terminals.has(id)) return false;
    this.activeTerminalId = id;
    return true;
  }

  /**
   * Check if terminal tab is currently active
   */
  public isTerminalTabActive(): boolean {
    const terminalTab = document.querySelector('[data-tab-id="terminal"]');
    return terminalTab?.classList.contains('active') || false;
  }

  /**
   * Switch to terminal tab and focus
   */
  public switchToTerminalTab(): void {
    const terminalTab = document.querySelector('[data-tab-id="terminal"]') as HTMLElement;
    if (terminalTab && !terminalTab.classList.contains('active')) {
      terminalTab.click();
      console.log('🖥️ Switched to terminal tab');
    }
    
    setTimeout(() => {
      this.focusTerminalInput();
    }, 100);
  }

  /**
   * Focus the terminal input
   */
  public focusTerminalInput(): void {
    const terminalInput = document.getElementById('integrated-terminal-input') as HTMLInputElement;
    if (terminalInput) {
      terminalInput.focus();
      console.log('🖥️ Terminal input focused');
    }
  }

  /**
   * Create a default terminal in the integrated layout
   */
  public static createDefaultTerminal(container?: HTMLElement): TerminalComponent {
    console.log('🖥️ Creating default terminal with error highlighting');
    const manager = TerminalManager.getInstance();
    
    if (!container) {
      container = manager.getIntegratedTerminalContainer();
    }
    
    if (!container) {
      console.error('❌ No terminal container found');
      throw new Error('Terminal container not found');
    }
    
    if (!manager.isIntegratedMode) {
      container.innerHTML = '';
    }
    
    return manager.createTerminal('default', { 
      container,
      height: '100%',
      theme: 'dark',
      initialMessage: 'Terminal ready with error highlighting. Type commands below.',
      integrated: true
    });
  }

  /**
   * Initialize the terminal component
   */
  public static initialize(): void {
    console.log('🖥️ TerminalManager.initialize() - WITH ERROR HIGHLIGHTING');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(TerminalManager.initializeIntegratedTerminal, 1000);
      });
    } else {
      setTimeout(TerminalManager.initializeIntegratedTerminal, 500);
    }
  }

  /**
   * Initialize the integrated terminal
   */
  private static initializeIntegratedTerminal(): void {
    console.log('🖥️ Initializing integrated terminal with error highlighting');
    
    const manager = TerminalManager.getInstance();
    
    const terminalContent = document.getElementById('terminal-content');
    const integratedTerminal = document.querySelector('.integrated-terminal');
    
    if (!terminalContent) {
      console.warn('⚠️ Terminal content tab not found');
      return;
    }
    
    if (!integratedTerminal) {
      console.warn('⚠️ Integrated terminal structure not found');
    }
    
    manager.setupIntegratedTerminalFunctionality();
    
    console.log('✅ Integrated terminal initialized with error highlighting');
  }

  /**
   * Setup functionality for the integrated terminal
   */
  private setupIntegratedTerminalFunctionality(): void {
    console.log('🖥️ Setting up integrated terminal functionality');
    
    const terminalInput = document.getElementById('integrated-terminal-input') as HTMLInputElement;
    const terminalOutput = document.getElementById('integrated-terminal-output') as HTMLElement;
    
    if (!terminalInput || !terminalOutput) {
      console.error('❌ Terminal elements not found');
      return;
    }

    // Clear existing listeners
    const newInput = terminalInput.cloneNode(true) as HTMLInputElement;
    terminalInput.parentNode?.replaceChild(newInput, terminalInput);

    // Add command execution
    newInput.addEventListener('keydown', async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const command = newInput.value.trim();
        if (command) {
          this.commandHistory.push(command);
          this.historyIndex = this.commandHistory.length;
          
          await this.executeCommand(command, terminalOutput);
          newInput.value = '';
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          newInput.value = this.commandHistory[this.historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          newInput.value = this.commandHistory[this.historyIndex] || '';
        } else {
          this.historyIndex = this.commandHistory.length;
          newInput.value = '';
        }
      }
    });

    console.log('✅ Terminal functionality setup complete with error highlighting');
  }

  /**
   * Execute command - WITH ERROR HIGHLIGHTING
   */
  private async executeCommand(command: string, outputElement: HTMLElement): Promise<void> {
    // Display command
    this.addTerminalMessage('command', `$ ${command}`);

    if (command === 'clear' || command === 'cls') {
      this.clearTerminal();
      return;
    }

    if (command === 'help') {
      this.addTerminalMessage('info', this.getHelpText());
      return;
    }

    try {
      // Try to execute with Tauri
      if (window.__TAURI__ && window.__TAURI__.shell) {
        console.log('🚀 Executing command with Tauri:', command);
        
        const Command = window.__TAURI__.shell.Command;
        const commandObj = new Command('cmd', ['/c', command], { cwd: this.workingDirectory });
        
        // Execute and capture output
        const output = await commandObj.execute();
        
        if (output.stderr) {
          // ERROR OUTPUT - Use error highlighting!
          this.addHighlightedOutput(output.stderr);
        }
        
        if (output.stdout) {
          // Regular output - still check for errors
          this.addHighlightedOutput(output.stdout);
        }
        
        if (output.code !== 0) {
          this.addTerminalMessage('error', `Command exited with code: ${output.code}`);
        }
        
      } else {
        // Fallback simulation
        const result = this.simulateCommand(command);
        this.addHighlightedOutput(result);
      }
      
    } catch (error: any) {
      this.addTerminalMessage('error', `Error: ${error.message}`);
    }
  }

  /**
   * Add highlighted output - NEW METHOD with error detection
   */
  private addHighlightedOutput(output: string): void {
    const terminalOutput = document.getElementById('integrated-terminal-output');
    if (!terminalOutput) return;

    // Check if output contains errors
    if (TerminalErrorIntegration.hasErrors(output)) {
      console.log('🔴 Error detected in output - applying highlighting');
    }

    // Process with error highlighting
    const highlightedElement = TerminalErrorIntegration.processOutput(output);
    highlightedElement.style.marginBottom = '8px';
    
    terminalOutput.appendChild(highlightedElement);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  /**
   * Simulate command execution (fallback)
   */
  private simulateCommand(command: string): string {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'ls':
      case 'dir':
        return this.simulateLs();
      
      case 'pwd':
        return this.workingDirectory;
      
      case 'echo':
        return args.join(' ');
      
      case 'date':
        return new Date().toString();
      
      case 'whoami':
        return 'developer@ai-ide';
      
      default:
        return `'${command}' is not recognized. Terminal is in simulation mode.`;
    }
  }

  /**
   * Simulate ls/dir command
   */
  private simulateLs(): string {
    return `Directory of ${this.workingDirectory}

src/
build/
package.json
README.md
.gitignore`;
  }

  /**
   * Get help text
   */
  private getHelpText(): string {
    return `✨ Enhanced Terminal with Error Highlighting

Available commands:
• help - Show this help
• clear/cls - Clear terminal
• ls/dir - List files
• pwd - Show directory
• cd [dir] - Change directory
• echo [text] - Echo text

🎨 Error Highlighting Features:
• Automatic error detection
• Color-coded error types
• Clickable file paths
• Stack trace formatting
• Multi-language support (Node.js, Python, TypeScript, Rust, etc.)

Note: Commands are executed using Tauri in desktop mode.`;
  }

  /**
   * Add message to terminal - UPDATED to use error highlighting
   */
  private addTerminalMessage(type: 'command' | 'output' | 'error' | 'info', message: string): void {
    const terminalOutput = document.getElementById('integrated-terminal-output');
    if (!terminalOutput) return;
    
    // For error types, use error highlighting
    if (type === 'error') {
      this.addHighlightedOutput(message);
      return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `terminal-${type}`;
    
    switch (type) {
      case 'command':
        messageElement.style.color = '#64dd17';
        messageElement.style.fontWeight = 'bold';
        break;
      case 'info':
        messageElement.style.color = '#2196f3';
        messageElement.style.fontSize = '0.9em';
        break;
      case 'output':
      default:
        messageElement.style.color = '#f0f0f0';
        messageElement.style.fontFamily = 'Consolas, "Courier New", monospace';
        break;
    }
    
    if (type === 'output' || type === 'info') {
      messageElement.style.whiteSpace = 'pre-wrap';
    }
    
    messageElement.textContent = message;
    messageElement.style.marginBottom = '4px';
    
    terminalOutput.appendChild(messageElement);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  /**
   * Clear terminal output
   */
  public clearTerminal(): void {
    const terminalOutput = document.getElementById('integrated-terminal-output');
    if (terminalOutput) {
      terminalOutput.innerHTML = '<div class="terminal-welcome">Terminal cleared. Error highlighting active.</div>';
      console.log('🖥️ Terminal cleared');
    }
  }

  /**
   * Run a command in the active terminal
   */
  public async runCommand(command: string): Promise<void> {
    console.log('🖥️ Running command with error highlighting:', command);
    
    if (!this.isTerminalTabActive()) {
      this.switchToTerminalTab();
    }
    
    const terminalOutput = document.getElementById('integrated-terminal-output');
    if (terminalOutput) {
      await this.executeCommand(command, terminalOutput);
    } else {
      console.error('❌ Terminal output element not found');
    }
  }

  /**
   * Run a command in a specific terminal
   */
  public runCommandInTerminal(terminalId: string, command: string): void {
    console.log(`🖥️ Running command in terminal ${terminalId}:`, command);
    this.runCommand(command);
  }

  /**
   * Check if integrated terminal exists
   */
  public static checkTerminalExists(): boolean {
    const terminalContent = document.getElementById('terminal-content');
    const integratedTerminal = document.querySelector('.integrated-terminal');
    const terminalInput = document.getElementById('integrated-terminal-input');
    const terminalOutput = document.getElementById('integrated-terminal-output');
    
    return !!(terminalContent && integratedTerminal && terminalInput && terminalOutput);
  }

  /**
   * Rebuild terminal
   */
  public static rebuildTerminal(): void {
    console.log('🖥️ Rebuilding integrated terminal with error highlighting');
    
    const manager = TerminalManager.getInstance();
    manager.setupIntegratedTerminalFunctionality();
    
    console.log('✅ Integrated terminal rebuilt');
  }

  /**
   * Get terminal status
   */
  public getStatus(): {
    mode: string;
    terminalsCount: number;
    activeTerminal: string | null;
    tabActive: boolean;
    domReady: boolean;
    workingDirectory: string;
    tauriAvailable: boolean;
    errorHighlighting: boolean;
  } {
    return {
      mode: this.isIntegratedMode ? 'integrated' : 'standalone',
      terminalsCount: this.terminals.size,
      activeTerminal: this.activeTerminalId,
      tabActive: this.isTerminalTabActive(),
      domReady: TerminalManager.checkTerminalExists(),
      workingDirectory: this.workingDirectory,
      tauriAvailable: !!(window.__TAURI__ && window.__TAURI__.shell),
      errorHighlighting: true, // NEW!
    };
  }

  /**
   * Send text to terminal
   */
  public sendText(text: string): void {
    const terminalInput = document.getElementById('integrated-terminal-input') as HTMLInputElement;
    if (terminalInput) {
      terminalInput.value = text;
      terminalInput.focus();
    }
  }

  /**
   * Get current working directory
   */
  public getCurrentDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set working directory
   */
  public setWorkingDirectory(path: string): void {
    this.workingDirectory = path;
    console.log(`📁 Working directory changed to: ${path}`);
  }
}

// Export singleton
export const terminalManager = TerminalManager.getInstance();

// Make globally available
if (typeof window !== 'undefined') {
  (window as any).terminalManager = terminalManager;
  (window as any).TerminalManager = TerminalManager;
}

console.log('🖥️ Terminal Manager loaded WITH ERROR HIGHLIGHTING! 🎨');