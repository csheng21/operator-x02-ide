// src/utils/platformDetection.ts

/**
 * Check if Tauri APIs are available
 * @returns boolean indicating whether Tauri is available
 */
export function detectTauriAvailability(): boolean {
  try {
    // This will throw an error if Tauri isn't available
    const hasTauri = typeof window.__TAURI__ !== 'undefined';
    console.log('Tauri availability check:', hasTauri ? 'Available' : 'Not available');
    
    if (hasTauri) {
      console.log('Tauri dialog available:', typeof window.__TAURI__.dialog !== 'undefined');
      console.log('Tauri fs available:', typeof window.__TAURI__.fs !== 'undefined');
    }
    return hasTauri;
  } catch (error) {
    console.log('Tauri not available:', error);
    return false;
  }
}

/**
 * Checks if the application is running in a browser environment
 * @returns boolean indicating if running in browser
 */
export function isBrowserEnvironment(): boolean {
  return !detectTauriAvailability();
}

// Add to Window interface for Monaco and Tauri
declare global {
  interface Window {
    monaco: any;
    __TAURI__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
      dialog?: {
        open: (options?: any) => Promise<string | string[]>;
        save: (options?: any) => Promise<string | null>;
      };
      fs?: {
        readTextFile: (path: string) => Promise<string>;
        writeTextFile: (path: string, contents: string) => Promise<void>;
        removeFile: (path: string) => Promise<void>;
        removeDir: (path: string, options?: { recursive: boolean }) => Promise<void>;
      };
    }
  }
}