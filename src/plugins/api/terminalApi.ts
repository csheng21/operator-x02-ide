// src/plugins/api/terminalApi.ts

export class TerminalApi {
  private outputListeners: Array<(output: string, isError: boolean) => void> = [];
  
  constructor() {
    console.log('Terminal API initialized');
  }
  
  write(text: string): void {
    // Find terminal element
    const terminal = document.getElementById('terminal');
    if (!terminal) {
      console.error('Terminal element not found');
      return;
    }
    
    // Add output to terminal
    const outputLine = document.createElement('div');
    outputLine.className = 'terminal-line';
    outputLine.innerHTML = `<span class="output">${text}</span>`;
    terminal.appendChild(outputLine);
    
    // Scroll to bottom
    terminal.scrollTop = terminal.scrollHeight;
  }
  
  async execute(command: string): Promise<string> {
    // Check if Tauri is available
    if (!window.__TAURI__) {
      throw new Error('Terminal execution is only available in desktop environment');
    }
    
    try {
      // Execute command using invoke from Tauri
      const { invoke } = window.__TAURI__.core || window.__TAURI__;
      
      // Execute command
      const output = await invoke('execute_command', {
        command,
        isPowershell: navigator.platform.indexOf('Win') > -1
      });
      
      // Notify listeners
      this.notifyListeners(output, false);
      
      return output;
    } catch (error) {
      // Notify listeners
      this.notifyListeners(error.message || 'Command execution failed', true);
      
      throw error;
    }
  }
  
  onOutput(callback: (output: string, isError: boolean) => void): void {
    this.outputListeners.push(callback);
  }
  
  private notifyListeners(output: string, isError: boolean): void {
    for (const listener of this.outputListeners) {
      listener(output, isError);
    }
  }
}