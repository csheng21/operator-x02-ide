// src/ide/explorerButtons.ts
import { FileNode } from '../ide/fileExplorer/types'; 

// Track the current project structure
let projectFiles: FileNode[] = [];
let selectedFolder: string | null = null;

// Initialize explorer buttons
export function initializeExplorerButtons(): void {
  const newFileBtn = document.getElementById('new-file-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  
  if (newFileBtn) {
    newFileBtn.addEventListener('click', handleNewFileClick);
    console.log('New file button initialized');
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefreshClick);
    console.log('Refresh button initialized');
  }
}

// Set project files reference
export function setProjectFiles(files: FileNode[]): void {
  projectFiles = files;
}

// Handle new file button click
async function handleNewFileClick(): Promise<void> {
  console.log('New file button clicked');
  
  // Create modal for file name input
  const fileName = await promptForFileName();
  if (!fileName) return; // User canceled
  
  // Determine parent folder path
  const folderPath = selectedFolder || '/';
  
  // Create the file
  try {
    await createNewFile(folderPath, fileName);
    
    // Refresh file explorer
    await refreshFileExplorer();
    
    // Automatically open the new file
    const newFilePath = `${folderPath}/${fileName}`.replace('//', '/');
    openNewFile(newFilePath);
    
  } catch (error) {
    console.error('Error creating file:', error);
    alert(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle refresh button click
async function handleRefreshClick(): Promise<void> {
  console.log('Refresh button clicked');
  await refreshFileExplorer();
}

// Prompt the user for a file name
function promptForFileName(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if we have a modal implementation or use browser prompt
    const modal = document.getElementById('file-name-modal');
    
    if (modal && modal instanceof HTMLElement) {
      // Use the custom modal
      const input = modal.querySelector('#file-name-input') as HTMLInputElement;
      const confirmBtn = modal.querySelector('#confirm-file-name') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#cancel-file-name') as HTMLButtonElement;
      
      const handleConfirm = () => {
        const value = input.value.trim();
        modal.style.display = 'none';
        cleanup();
        resolve(value || null);
      };
      
      const handleCancel = () => {
        modal.style.display = 'none';
        cleanup();
        resolve(null);
      };
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleConfirm();
        } else if (e.key === 'Escape') {
          handleCancel();
        }
      };
      
      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        input.removeEventListener('keydown', handleKeyDown);
      };
      
      // Set up event listeners
      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      input.addEventListener('keydown', handleKeyDown);
      
      // Show the modal and focus input
      input.value = '';
      modal.style.display = 'block';
      input.focus();
    } else {
      // Fall back to browser prompt
      const name = prompt('Enter file name:');
      resolve(name);
    }
  });
}

// Create a new file
async function createNewFile(folderPath: string, fileName: string): Promise<void> {
  // If we're using the Tauri API
  if (window.fs && window.fs.writeFile) {
    try {
      const fullPath = `${folderPath}/${fileName}`.replace('//', '/');
      
      // Create empty file
      await window.fs.writeFile(fullPath, '');
      console.log(`File created: ${fullPath}`);
      
    } catch (error) {
      console.error('Error creating file with Tauri API:', error);
      throw error;
    }
  } else {
    // Mock implementation for development
    console.log(`Mock: Creating file ${fileName} in ${folderPath}`);
    
    // Add to in-memory project structure
    addFileToProjectStructure(folderPath, fileName);
  }
}

// Add file to in-memory project structure
function addFileToProjectStructure(folderPath: string, fileName: string): void {
  // Helper function to find the folder node
  const findFolder = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.isDirectory && node.path === path) {
        return node;
      }
      
      if (node.isDirectory && node.children) {
        const found = findFolder(node.children, path);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  // Find the folder
  const folder = findFolder(projectFiles, folderPath);
  
  if (folder) {
    // Create new file node
    const newFile: FileNode = {
      name: fileName,
      path: `${folderPath}/${fileName}`.replace('//', '/'),
      isDirectory: false
    };
    
    // Add to children
    if (!folder.children) {
      folder.children = [];
    }
    
    folder.children.push(newFile);
    console.log('Added file to project structure:', newFile);
  } else {
    console.error('Folder not found:', folderPath);
  }
}

// Refresh file explorer
async function refreshFileExplorer(): Promise<void> {
  console.log('Refreshing file explorer');
  
  // Create and dispatch a custom event
  const refreshEvent = new CustomEvent('explorer-refresh');
  document.dispatchEvent(refreshEvent);
  
  // If using Tauri API, reload files from disk
  if (window.fs && window.fs.readDir) {
    try {
      // Logic to reload files will go here
      // This would be implemented in the fileExplorer.ts module
    } catch (error) {
      console.error('Error refreshing files:', error);
    }
  }
}

// Open the newly created file
function openNewFile(filePath: string): void {
  // Create and dispatch a custom event
  const openEvent = new CustomEvent('file-selected', {
    detail: { path: filePath }
  });
  
  document.dispatchEvent(openEvent);
}

// Set selected folder when user clicks on a folder in explorer
export function setSelectedFolder(path: string): void {
  selectedFolder = path;
  console.log('Selected folder set to:', path);
}