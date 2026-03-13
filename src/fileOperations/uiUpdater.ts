// src/fileOperations/uiUpdater.ts
import { getLanguageFromExtension } from '../utils/fileUtils';

/**
 * Update UI after saving
 * @param filepath Path where the file was saved
 */
export function updateUIAfterSave(filepath: string) {
  // Extract just the filename for display in some cases
  const filename = filepath.split(/[/\\]/).pop() || filepath;
  
  // Update status bar if it exists
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    const statusMsg = document.createElement('div');
    statusMsg.className = 'status-message success';
    statusMsg.textContent = `File saved: ${filepath}`;
    statusBar.appendChild(statusMsg);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (statusMsg.parentNode) {
        statusMsg.parentNode.removeChild(statusMsg);
      }
    }, 3000);
  }
  
  // Update file path in status
  const pathStatus = document.getElementById('file-path-status');
  if (pathStatus) {
    pathStatus.textContent = filepath;
  }
  
  // Update language indicator
  const langStatus = document.getElementById('language-status');
  if (langStatus) {
    const extension = filename.split('.').pop() || '';
    const language = getLanguageFromExtension(extension);
    langStatus.textContent = language;
  }
  
  // Update window title
  try {
    const appName = 'Deepseek Code IDE';
    document.title = `${filename} - ${appName}`;
  } catch (titleError) {
    console.error('Error updating window title:', titleError);
  }
}

/**
 * Show a notification in the UI
 * @param message Message to display
 * @param type Notification type
 * @param duration Duration in milliseconds
 */
export function showNotification(
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  duration: number = 3000
) {
  // Create notification container if it doesn't exist
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style based on type
  let bgColor = '#2196F3'; // info (blue)
  if (type === 'success') bgColor = '#4CAF50'; // green
  if (type === 'warning') bgColor = '#FF9800'; // orange
  if (type === 'error') bgColor = '#F44336'; // red
  
  // Apply styles
  notification.style.backgroundColor = bgColor;
  notification.style.color = 'white';
  notification.style.padding = '12px 16px';
  notification.style.margin = '8px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  
  // Add to container
  container.appendChild(notification);
  
  // Remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
}

/**
 * Update UI after file removal
 * @param path Path of the removed file
 * @param success Whether the operation was successful
 * @param errorMessage Optional error message
 */
export function updateUIAfterRemove(path: string, success: boolean, errorMessage?: string) {
  // Get filename from path
  const filename = path.split(/[/\\]/).pop() || path;
  
  if (success) {
    showNotification(`Successfully removed: ${filename}`, 'success');
    
    // If current file was removed, clear editor
    const pathStatus = document.getElementById('file-path-status');
    if (pathStatus && pathStatus.textContent === path) {
      // Clear editor content
      if (window.monaco && window.editor) {
        window.editor.setValue('');
      }
      
      // Update path status
      pathStatus.textContent = 'Untitled';
      
      // Update window title
      document.title = 'Deepseek Code IDE';
    }
  } else {
    showNotification(`Error removing ${filename}: ${errorMessage}`, 'error');
  }
}