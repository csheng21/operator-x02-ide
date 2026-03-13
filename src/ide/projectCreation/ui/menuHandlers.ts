// src/ide/projectCreation/ui/menuHandlers.ts
import { showProjectModal } from './modalHandlers';
import { openFolderDialog } from "../../../devModeFallbacks";

// Setup 'New Project' menu item in the File menu
export function setupNewProjectMenuItem(): void {
  // Handle when File menu is clicked
  const fileMenuItem = document.querySelector('.menu-bar .menu-item:first-child');
  if (fileMenuItem) {
    fileMenuItem.addEventListener('click', (e) => {
      // Check if dropdown already exists
      if (document.querySelector('.menu-dropdown')) {
        return;
      }
      
      // Create dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';
      dropdown.innerHTML = `
        <div class="menu-dropdown-item" id="new-project-menu-item">New Project...</div>
        <div class="menu-dropdown-item" id="open-project-menu-item">Open Project...</div>
        <div class="menu-dropdown-item" id="open-file-menu-item">Open File...</div>
        <div class="menu-dropdown-divider"></div>
        <div class="menu-dropdown-item" id="save-menu-item">Save</div>
        <div class="menu-dropdown-item" id="save-as-menu-item">Save As...</div>
        <div class="menu-dropdown-divider"></div>
        <div class="menu-dropdown-item">Exit</div>
      `;
      
      // Position dropdown
      const rect = fileMenuItem.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.backgroundColor = '#252526';
      dropdown.style.border = '1px solid #454545';
      dropdown.style.borderRadius = '3px';
      dropdown.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
      dropdown.style.zIndex = '1000';
      dropdown.style.minWidth = '180px';
      
      // Style dropdown items
      const style = document.createElement('style');
      style.textContent = `
        .menu-dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          color: #e1e1e1;
        }
        .menu-dropdown-item:hover {
          background-color: #0e639c;
        }
        .menu-dropdown-divider {
          height: 1px;
          background-color: #454545;
          margin: 4px 0;
        }
      `;
      document.head.appendChild(style);
      
      // Add to document
      document.body.appendChild(dropdown);
      
      // Add event listener for New Project
      const newProjectMenuItem = dropdown.querySelector('#new-project-menu-item');
      if (newProjectMenuItem) {
        newProjectMenuItem.addEventListener('click', showProjectModal);
      }
      
      // Add event listener for Save As menu item
      const saveAsMenuItem = dropdown.querySelector('#save-as-menu-item');
      if (saveAsMenuItem) {
        saveAsMenuItem.addEventListener('click', handleSaveAs);
      }
      
      // Add event listener for Save menu item
      const saveMenuItem = dropdown.querySelector('#save-menu-item');
      if (saveMenuItem) {
        saveMenuItem.addEventListener('click', handleSave);
      }
      
      // Add event listener for Open File menu item
      const openFileMenuItem = dropdown.querySelector('#open-file-menu-item');
      if (openFileMenuItem) {
        openFileMenuItem.addEventListener('click', handleOpenFile);
      }
      
      // Add event listener for Open Project menu item
      const openProjectMenuItem = dropdown.querySelector('#open-project-menu-item');
      if (openProjectMenuItem) {
        openProjectMenuItem.addEventListener('click', handleOpenProject);
      }
      
      // Close dropdown when clicking outside
      const closeDropdown = (e: MouseEvent) => {
        if (!dropdown.contains(e.target as Node) && e.target !== fileMenuItem) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      };
      
      // Delay adding the event listener to prevent immediate closure
      setTimeout(() => {
        document.addEventListener('click', closeDropdown);
      }, 10);
    });
  }
}

// Create New Project button if it doesn't exist
export function createNewProjectButton(): void {
  // Either add to top menu or file explorer panel
  const explorerHeader = document.querySelector('.panel-header');
  if (explorerHeader) {
    const actionsDiv = explorerHeader.querySelector('.panel-actions');
    if (actionsDiv) {
      const newProjBtn = document.createElement('button');
      newProjBtn.id = 'new-project-btn';
      newProjBtn.className = 'icon-button';
      newProjBtn.title = 'New Project';
      newProjBtn.innerHTML = '📁+';
      newProjBtn.addEventListener('click', showProjectModal);
      actionsDiv.appendChild(newProjBtn);
      console.log('New project button created and added to explorer panel');
    }
  }
}

// Handle Save As menu item click
function handleSaveAs(): void {
  console.log('Save As clicked');
  
  // Trigger keyboard shortcut for Save As (Ctrl+Shift+S)
  const saveAsEvent = new KeyboardEvent('keydown', {
    key: 's',
    code: 'KeyS',
    ctrlKey: true,
    shiftKey: true,
    bubbles: true
  });
  document.dispatchEvent(saveAsEvent);
}

// Handle Save menu item click
function handleSave(): void {
  console.log('Save clicked');
  
  // Trigger keyboard shortcut for Save (Ctrl+S)
  const saveEvent = new KeyboardEvent('keydown', {
    key: 's',
    code: 'KeyS',
    ctrlKey: true,
    bubbles: true
  });
  document.dispatchEvent(saveEvent);
}

// Handle Open File menu item click
function handleOpenFile(): void {
  console.log('Open File clicked');
  
  // Trigger keyboard shortcut for Open (Ctrl+O)
  const openEvent = new KeyboardEvent('keydown', {
    key: 'o',
    code: 'KeyO',
    ctrlKey: true,
    bubbles: true
  });
  document.dispatchEvent(openEvent);
}

// Handle Open Project menu item click
function handleOpenProject(): void {
  console.log('Open Project clicked');
  
  // Use Tauri dialog API to open a folder
  openProjectFolder().catch(error => {
    console.error('Error opening project folder:', error);
  });
}

// Function to open project folder with proper error handling
async function openProjectFolder(): Promise<void> {
  try {
    console.log('Opening project folder...');
    
    // Check if we're in a development environment
    const isDev = process.env.NODE_ENV === 'development' || 
                 window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';
    
    let selectedPath: string | null = null;
    
    if (isDev) {
      console.log('Running in development mode, using fallback dialog');
      selectedPath = await openFolderDialog();
    } else if (window.__TAURI__) {
      try {
        // FIXED: Use Tauri v2 plugin API instead of v1 API
        const { open } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
          directory: true,
          multiple: false,
          title: 'Select Project Folder'
        });
        selectedPath = Array.isArray(result) ? result[0] : result;
      } catch (tauriError) {
        console.error('Error using Tauri dialog:', tauriError);
        // Fallback to our dev dialog even in production if Tauri fails
        selectedPath = await openFolderDialog();
      }
    } else {
      console.warn('No Tauri environment detected, using fallback');
      selectedPath = await openFolderDialog();
    }
    
    if (!selectedPath) {
      console.log('No folder selected or operation canceled');
      return;
    }
    
    // Handle the selected folder
    await handleSelectedFolder(selectedPath);
    
  } catch (error) {
    console.error('Error in openProjectFolder:', error);
    
    // Show user-friendly error message
    try {
      // Try to use Tauri v2 message dialog
      const { message } = await import('@tauri-apps/plugin-dialog');
      await message(`Error opening folder: ${error.message}`, {
        title: 'Error',
        kind: 'error'
      });
    } catch (dialogError) {
      // Fallback to browser alert
      alert('Error opening folder: ' + error.message);
    }
  }
}

// Helper function to handle the selected folder
async function handleSelectedFolder(folderPath: string | string[]): Promise<void> {
  const path = Array.isArray(folderPath) ? folderPath[0] : folderPath;
  
  if (!path) {
    console.log('No valid path found');
    return;
  }
  
  console.log(`Selected project folder: ${path}`);
  
  // Store the path immediately
  localStorage.setItem('currentProjectPath', path);
  
  // Try to import the fileExplorer module
  try {
    // Use a simple dynamic import without trying to destructure immediately
    const fileExplorerModule = await import('../../fileExplorer');
    
    // Check if the module has the openFolder function
    if (typeof fileExplorerModule.openFolder === 'function') {
      await fileExplorerModule.openFolder(path);
    } else {
      console.error('openFolder function not found in imported module');
      // Dispatch an event as fallback
      dispatchFolderSelectedEvent(path);
    }
  } catch (importError) {
    console.error('Error importing fileExplorer:', importError);
    // Dispatch an event as fallback
    dispatchFolderSelectedEvent(path);
  }
}

// Helper function to dispatch the folder selected event
function dispatchFolderSelectedEvent(path: string): void {
  const event = new CustomEvent('project-folder-selected', {
    detail: { path: path }
  });
  document.dispatchEvent(event);
  
  console.log('Dispatched project-folder-selected event');
  
  // Try to refresh the explorer UI
  const refreshEvent = new Event('explorer-refresh');
  document.dispatchEvent(refreshEvent);
}

// Helper function to show fallback message
function showFallbackMessage(): void {
  alert('Opening project folders requires the desktop app. If you are in the desktop app, there might be an issue with the Tauri integration.');
}

// Add a fallback method for web environment
function fallbackFolderSelection(): void {
  alert('Opening project folders requires the desktop app. You appear to be running in a web browser where this feature is limited.');
  
  // Optionally, you could show a mock folder selection here
  // For demonstration purposes, this could just load a sample project
  const useMockProject = confirm('Would you like to load a sample project instead?');
  
  if (useMockProject) {
    // Import the file explorer module and use its mock data function
    import("../../fileExplorer").then(module => {
      if (typeof module.resetFileExplorer === 'function') {
        module.resetFileExplorer();
      }
      
      // Trigger a refresh to show mock data
      const refreshEvent = new Event('explorer-refresh');
      document.dispatchEvent(refreshEvent);
    }).catch(err => {
      console.error('Failed to import fileExplorer module:', err);
    });
  }
}

// Add global declaration for Tauri
declare global {
  interface Window {
    __TAURI__?: any;
  }
}