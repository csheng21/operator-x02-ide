// src/utils/systemInfo.ts

/**
 * SystemInfo interface defining the structure of system information
 */
export interface SystemInfo {
  username: string;
  home_dir: string;
  documents_dir: string;
  downloads_dir: string;
  hostname: string;
  os_name: string;
  computer_name: string;
}

// Cache system info to avoid multiple retrievals
let cachedSystemInfo: SystemInfo | null = null;

/**
 * Get system information with fallback to hardcoded values for user "hi"
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  // Return cached info if available
  if (cachedSystemInfo) {
    return cachedSystemInfo;
  }
  
  // Always use hardcoded values for now since Tauri IPC is not working
  cachedSystemInfo = {
    username: "hi",
    home_dir: "C:\\Users\\hi",
    documents_dir: "C:\\Users\\hi\\Documents",
    downloads_dir: "C:\\Users\\hi\\Downloads",
    hostname: "localhost",
    os_name: "windows",
    computer_name: "localhost"
  };
  
  console.log('Using hardcoded system info:', cachedSystemInfo);
  return cachedSystemInfo;
}

/**
 * Format a path with ~ for home directory
 */
export function formatPath(path: string): string {
  const homeDir = cachedSystemInfo?.home_dir;
  
  if (homeDir && path.startsWith(homeDir)) {
    return '~' + path.substring(homeDir.length);
  }
  
  return path;
}

/**
 * Get user display name in the format username@hostname
 */
export async function getUserDisplayName(): Promise<string> {
  const info = await getSystemInfo();
  return `${info.username}@${info.hostname}`;
}

/**
 * Check if the system is Windows
 */
export function isWindows(): boolean {
  return true; // Hardcoded for your Windows system
}

/**
 * Get path separator for current OS
 */
export function getPathSeparator(): string {
  return '\\'; // Hardcoded for Windows
}

/**
 * Join path segments with appropriate separator
 */
export function joinPaths(...segments: string[]): string {
  return segments.join('\\'); // Using Windows separator
}

// Initialize system info at module load time to ensure it's cached
getSystemInfo().catch(err => console.error("Error initializing system info:", err));