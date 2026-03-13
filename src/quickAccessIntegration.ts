// quickAccessIntegration.ts - FIXED VERSION
// Properly handles folder paths vs file paths

import { quickAccessPanel } from './quickAccessPanel';
import { invoke } from '@tauri-apps/api/core';

// Simple path memory manager (works independently)
class SimplePathManager {
  private static readonly STORAGE_KEY = 'ai_ide_recent_folders';

  static getRecentFolders(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load recent folders:', error);
      return [];
    }
  }

  /**
   * ✅ FIXED: Extract folder path if given a file path
   */
  static addRecentFolder(path: string): void {
    try {
      // Extract folder path if this is a file
      const folderPath = this.extractFolderPath(path);
      
      let recent = this.getRecentFolders();
      // Remove if already exists
      recent = recent.filter(p => p !== folderPath);
      // Add to front
      recent.unshift(folderPath);
      // Keep only last 10
      recent = recent.slice(0, 10);
      // Save
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
      console.log('✅ Saved folder to recent:', folderPath);
    } catch (error) {
      console.error('Failed to save recent folder:', error);
    }
  }

  /**
   * ✅ NEW: Extract folder path from a path (handles both files and folders)
   */
  private static extractFolderPath(path: string): string {
    if (!path) return path;
    
    // Normalize path separators
    const normalizedPath = path.replace(/\//g, '\\');
    
    // Check if path looks like a file (has extension)
    const lastSegment = normalizedPath.split('\\').pop() || '';
    const hasExtension = lastSegment.includes('.') && !lastSegment.startsWith('.');
    
    if (hasExtension) {
      // It's a file - extract the directory
      const segments = normalizedPath.split('\\');
      segments.pop(); // Remove filename
      const folderPath = segments.join('\\');
      console.log(`📁 Extracted folder from file: ${path} → ${folderPath}`);
      return folderPath;
    }
    
    // It's already a folder
    return path;
  }

  /**
   * ✅ NEW: Validate if a path is a folder (not a file)
   */
  static isFolder(path: string): boolean {
    if (!path) return false;
    const lastSegment = path.split(/[/\\]/).pop() || '';
    // If it has an extension, it's probably a file
    return !(lastSegment.includes('.') && !lastSegment.startsWith('.'));
  }

  static clearRecentFolders(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Cleared recent folders');
    } catch (error) {
      console.error('Failed to clear recent folders:', error);
    }
  }
}

/**
 * Enhanced folder opening with Quick Access Panel
 * Replaces your current openFolderDialog() calls
 */
export async function openFolderWithQuickAccess(): Promise<string | null> {
  console.log('🚀 Quick Access Panel: Starting...');
  
  return new Promise((resolve) => {
    try {
      const recentFolders = SimplePathManager.getRecentFolders();
      console.log('📂 Recent folders loaded:', recentFolders.length);
      
      // Show the Quick Access Panel
      quickAccessPanel.show({
        onSelect: async (selectedPath) => {
          if (selectedPath === null) {
            // User cancelled
            console.log('❌ User cancelled folder selection');
            resolve(null);
          } else {
            // User selected a recent folder
            console.log('✅ User selected recent folder:', selectedPath);
            
            // ✅ CRITICAL: Ensure we're working with a folder path
            const folderPath = SimplePathManager.isFolder(selectedPath) 
              ? selectedPath 
              : SimplePathManager['extractFolderPath'](selectedPath);
            
            console.log('📁 Final folder path:', folderPath);
            
            SimplePathManager.addRecentFolder(folderPath);
            resolve(folderPath);
          }
        },
        onBrowse: async () => {
          // User wants to browse for a new folder
          try {
            console.log('📁 Opening native folder dialog...');
            
            const folderPath = await invoke<string | null>('open_folder_dialog', {});
            
            if (folderPath) {
              console.log('✅ Folder selected from dialog:', folderPath);
              SimplePathManager.addRecentFolder(folderPath);
              resolve(folderPath);
            } else {
              console.log('📂 Native dialog cancelled');
              resolve(null);
            }
          } catch (error) {
            console.error('❌ Failed to open folder dialog:', error);
            showErrorNotification('Failed to open folder dialog');
            resolve(null);
          }
        },
        maxRecentFolders: 10
      });
      
      console.log('✅ Quick Access Panel shown successfully');
      
    } catch (error) {
      console.error('❌ Error showing Quick Access Panel:', error);
      // Fallback to regular dialog if panel fails
      console.log('⚠️ Falling back to regular folder dialog');
      
      invoke<string | null>('open_folder_dialog', {})
        .then(path => {
          if (path) {
            SimplePathManager.addRecentFolder(path);
          }
          resolve(path);
        })
        .catch(err => {
          console.error('❌ Fallback dialog also failed:', err);
          resolve(null);
        });
    }
  });
}

/**
 * Show error notification
 */
function showErrorNotification(message: string): void {
  const notification = document.createElement('div');
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #f44336, #e53935);
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    animation: slideInRight 0.3s ease;
    font-size: 13px;
    font-family: 'Segoe UI', sans-serif;
  `;

  notification.innerHTML = `
    <span style="font-size: 18px;">✗</span>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * ✅ NEW: Clean up existing recent folders - remove file paths
 */
export function cleanupRecentFolders(): void {
  try {
    const recent = SimplePathManager.getRecentFolders();
    const cleaned = recent.filter(path => SimplePathManager.isFolder(path));
    
    if (cleaned.length !== recent.length) {
      localStorage.setItem('ai_ide_recent_folders', JSON.stringify(cleaned));
      console.log(`🧹 Cleaned recent folders: ${recent.length} → ${cleaned.length}`);
    }
  } catch (error) {
    console.error('Failed to clean recent folders:', error);
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).SimplePathManager = SimplePathManager;
  (window as any).cleanupRecentFolders = cleanupRecentFolders;
  console.log('✅ SimplePathManager available in console');
  
  // Auto-cleanup on load
  cleanupRecentFolders();
}

// Export the manager for use in other modules if needed
export { SimplePathManager };