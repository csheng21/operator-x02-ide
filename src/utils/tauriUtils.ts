// utils/tauriUtils.ts
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && 
         '__TAURI__' in window && 
         typeof window.__TAURI__ === 'object' &&
         typeof window.__TAURI__.invoke === 'function';
}

export async function isTauriWorking(): Promise<boolean> {
  if (!isTauriAvailable()) return false;
  
  try {
    // Try a simple command to see if Tauri is working
    await window.__TAURI__.invoke('get_env_vars');
    return true;
  } catch (error) {
    console.error("Tauri test command failed:", error);
    return false;
  }
}