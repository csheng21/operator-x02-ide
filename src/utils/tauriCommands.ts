import { invoke } from '@tauri-apps/api/core';

export interface TauriCommands {
  getCurrentDir(): Promise<string>;
  setCurrentDir(path: string): Promise<void>;
  getHomeDir(): Promise<string>;
  executeCommand(command: string, isPowerShell?: boolean): Promise<{
    stdout: string;
    stderr: string;
    success: boolean;
  }>;
  readDirectory(path: string): Promise<any[]>;
}

export const tauriCommands: TauriCommands = {
  async getCurrentDir() {
    return await invoke('get_current_dir') as string;
  },
  
  async setCurrentDir(path: string) {
    await invoke('set_current_dir', { path });
  },
  
  async getHomeDir() {
    return await invoke('get_home_dir') as string;
  },
  
  async executeCommand(command: string, isPowerShell = false) {
    return await invoke('execute_command', {
      command,
      isPowershell: isPowerShell
    }) as any;
  },
  
  async readDirectory(path: string) {
    return await invoke('read_directory_contents', { path }) as any[];
  }
};