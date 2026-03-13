// utils/browserUtils.ts
// Browser utilities for file system operations and compatibility

/**
 * Generate a mock file path for browser environment
 */
export function generateMockPath(filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  return `/mock/projects/${timestamp}_${randomId}/${filename}`;
}

/**
 * Check if browser supports modern File System Access API
 */
export function checkFileSystemAPISupport(): {
  directoryPicker: boolean;
  filePicker: boolean;
  fileSystemAccess: boolean;
} {
  return {
    directoryPicker: 'showDirectoryPicker' in window,
    filePicker: 'showOpenFilePicker' in window,
    fileSystemAccess: 'FileSystemHandle' in window
  };
}

/**
 * Check if browser supports drag and drop
 */
export function checkDragDropSupport(): boolean {
  return 'DataTransfer' in window && 'FileList' in window && 'webkitGetAsEntry' in DataTransferItem.prototype;
}

/**
 * Get browser information
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
} {
  const userAgent = navigator.userAgent;
  
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  // Chrome
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Firefox
  else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Safari
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  // Edge
  else if (userAgent.includes('Edg/')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) browserVersion = match[1];
  }
  
  return {
    name: browserName,
    version: browserVersion,
    isChrome: browserName === 'Chrome',
    isFirefox: browserName === 'Firefox',
    isSafari: browserName === 'Safari',
    isEdge: browserName === 'Edge'
  };
}

/**
 * Check if current environment is development
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('dev');
}

/**
 * Check if Tauri is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Show browser compatibility warning if needed
 */
export function showBrowserCompatibilityInfo(): void {
  const support = checkFileSystemAPISupport();
  const browserInfo = getBrowserInfo();
  
  if (!support.directoryPicker) {
    console.warn('Browser does not support File System Access API');
    
    // Show user-friendly message for specific browsers
    if (browserInfo.isFirefox) {
      console.info('Firefox users: File System Access API is not yet supported. Use manual path input or drag & drop.');
    } else if (browserInfo.isSafari) {
      console.info('Safari users: File System Access API is not yet supported. Use manual path input or drag & drop.');
    } else if (browserInfo.isChrome && parseInt(browserInfo.version) < 86) {
      console.info('Chrome users: Please update to Chrome 86+ for File System Access API support.');
    }
  }
}

/**
 * Show notification toast
 */
export function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration: number = 4000): void {
  const notification = document.createElement('div');
  notification.className = `browser-notification notification-${type}`;
  
  const colors = {
    info: '#4a9eff',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 400px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  });
  
  // Auto remove
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique ID
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Download file content
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Simple localStorage wrapper with error handling
 */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },
  
  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Failed to write to localStorage:', error);
      return false;
    }
  },
  
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
      return false;
    }
  }
};