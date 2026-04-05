// ============================================================
// ide/systemInfo.ts
// Tauri system information initializer
// Extracted from main.ts | Operator X02
// ============================================================

import { isTauriAvailable, getSystemInfo } from '../fileSystem';
import { breadcrumbManager } from './breadcrumb';

export interface TauriSystemInfo {
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  home_dir: string;
  documents_dir?: string;
  downloads_dir?: string;
  app_data_dir?: string;
  temp_dir: string;
}

export interface TauriFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

/**
 * Initialize system information from Tauri.
 * Sets window.__systemInfo and updates the document title.
 * Returns null if Tauri is unavailable.
 */
export async function initializeSystemInfo(): Promise<TauriSystemInfo | null> {
  try {
    if (!isTauriAvailable()) {
      console.warn('[SystemInfo] Tauri not available - limited functionality');
      return null;
    }

    console.log('[SystemInfo] Fetching system info...');
    const sysInfo = await getSystemInfo();

    if (sysInfo) {
      console.log('[SystemInfo] Initialized:', {
        username: sysInfo.username,
        os: sysInfo.os_name,
        hostname: sysInfo.hostname,
      });

      (window as any).__systemInfo = {
        username: sysInfo.username,
        os:       sysInfo.os_name,
        hostname: sysInfo.hostname,
        homedir:  sysInfo.home_dir,
      };

      if (sysInfo.hostname && sysInfo.hostname !== 'unknown') {
        document.title = `AI Code IDE - ${sysInfo.username}@${sysInfo.hostname}`;
      }

      console.log('[SystemInfo] Initializing breadcrumb navigation...');
      breadcrumbManager.initialize();
      (window as any).breadcrumbManager = breadcrumbManager;
      console.log('[SystemInfo] Breadcrumb navigation initialized');

      return sysInfo;
    } else {
      console.warn('[SystemInfo] Failed to get system information');
      return null;
    }
  } catch (error) {
    console.error('[SystemInfo] Error:', error);
    return null;
  }
}
