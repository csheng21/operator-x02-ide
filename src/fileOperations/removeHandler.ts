// src/fileOperations/removeHandler.ts
import { isBrowserEnvironment } from '../utils/platformDetection';

/**
 * Removes a file from the filesystem
 * @param filePath Full path to the file to be removed
 * @returns Promise resolving to true if successful, or an error message
 */
export async function removeFile(filePath: string): Promise<boolean | string> {
  try {
    // Check if using Tauri (desktop) or browser environment
    if (window.__TAURI__) {
      // Use Tauri's fs API for file removal
      await window.__TAURI__.fs.removeFile(filePath);
    } else {
      // For browser environment, use the mock file system
      const fs = await import('../ide/projectCreation/services/mockFileSystem');
      await fs.removeFile(filePath);
    }
    
    // Update file explorer view after successful removal
    const eventData = { path: filePath, type: 'remove', isFile: true };
    dispatchCustomEvent('file-system-changed', eventData);
    
    return true;
  } catch (error) {
    console.error('Error removing file:', error);
    return error.toString();
  }
}

/**
 * Removes a directory and all its contents recursively
 * @param dirPath Full path to the directory to be removed
 * @param isProject Whether this is a project root directory
 * @returns Promise resolving to true if successful, or an error message
 */
export async function removeDirectory(dirPath: string, isProject = false): Promise<boolean | string> {
  try {
    // Check if using Tauri (desktop) or browser environment
    if (window.__TAURI__) {
      // Use Tauri's fs API for directory removal
      await window.__TAURI__.fs.removeDir(dirPath, { recursive: true });
    } else {
      // For browser environment, use the mock file system
      const fs = await import('../ide/projectCreation/services/mockFileSystem');
      await fs.removeDirectory(dirPath);
    }
    
    // Update file explorer view after successful removal
    const eventType = isProject ? 'project-removed' : 'file-system-changed';
    const eventData = { path: dirPath, type: 'remove', isFile: false };
    dispatchCustomEvent(eventType, eventData);
    
    // If this was a project, also update project state
    if (isProject) {
      await updateProjectState(null);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing directory:', error);
    return error.toString();
  }
}

/**
 * Removes an entire project
 * @param projectPath Path to the project root directory
 * @returns Promise resolving to true if successful, or an error message
 */
export async function removeProject(projectPath: string): Promise<boolean | string> {
  try {
    // First clear editor and close all open files from this project
    clearEditorContent();
    closeAllFilesFromProject(projectPath);
    
    // Then remove the project directory
    const result = await removeDirectory(projectPath, true);
    
    // Update local storage to remove this project from recently opened projects
    removeProjectFromHistory(projectPath);
    
    return result;
  } catch (error) {
    console.error('Error removing project:', error);
    return error.toString();
  }
}

/**
 * Helper function to close all files from a specific project
 * @param projectPath Path to the project
 */
function closeAllFilesFromProject(projectPath: string): void {
  // This implementation depends on how you're tracking open files
  // Here's a simplified version based on your existing code structure
  const state = window.appState || {};
  if (state.openFiles && Array.isArray(state.openFiles)) {
    state.openFiles = state.openFiles.filter(file => !file.path.startsWith(projectPath));
  }
  
  // Update state
  if (window.updateState) {
    window.updateState({ openFiles: state.openFiles });
  }
}

/**
 * Helper function to remove project from history in localStorage
 * @param projectPath Path to the project
 */
function removeProjectFromHistory(projectPath: string): void {
  try {
    const recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');
    const updatedProjects = recentProjects.filter(path => path !== projectPath);
    localStorage.setItem('recentProjects', JSON.stringify(updatedProjects));
  } catch (error) {
    console.error('Error updating recent projects:', error);
  }
}

/**
 * Helper function to update project state
 * @param projectPath Project path or null to clear
 */
async function updateProjectState(projectPath: string | null): Promise<void> {
  // Import the project state module
  const projectState = await import('../ide/projectState');
  
  if (projectPath === null) {
    // Clear current project if null is passed
    projectState.clearCurrentProject();
  }
}

/**
 * Helper function to dispatch custom events
 * @param eventName Name of the event
 * @param detail Event details
 */
function dispatchCustomEvent(eventName: string, detail: any): void {
  const event = new CustomEvent(eventName, { detail });
  document.dispatchEvent(event);
}

/**
 * Helper function to clear editor content
 */
function clearEditorContent(): void {
  // This implementation depends on how your editor is structured
  if (window.monaco && window.editor) {
    window.editor.setValue('');
  }
}

// Add to Window interface
declare global {
  interface Window {
    appState?: any;
    updateState?: (updates: any) => void;
    editor?: any;
  }
}