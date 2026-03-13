// src/ide/fileExplorer/index.ts
import { setProjectFiles } from '../explorerButtons';
import { FileNode, fileStructure } from './types';
import { loadProjectFiles } from './fileLoader';
import { renderFileTree } from './fileTreeRenderer';

/**
 * Shows the empty state UI when no project is loaded
 */
export function showEmptyExplorerState(container: HTMLElement): void {
  // Clear any existing content
  container.innerHTML = '';
  
  // Create empty state container
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-explorer';
  emptyState.style.display = 'flex';
  emptyState.style.flexDirection = 'column';
  emptyState.style.alignItems = 'center';
  emptyState.style.justifyContent = 'center';
  emptyState.style.height = '100%';
  emptyState.style.padding = '20px';
  emptyState.style.textAlign = 'center';
  emptyState.style.color = '#999';
  
  // Add folder icon
  const folderIcon = document.createElement('div');
  folderIcon.innerHTML = '📁';
  folderIcon.style.fontSize = '48px';
  folderIcon.style.marginBottom = '15px';
  folderIcon.style.opacity = '0.5';
  
  // Add message
  const message = document.createElement('div');
  message.textContent = 'No folder opened';
  message.style.marginBottom = '15px';
  message.style.fontSize = '16px';
  
  // Add action buttons
  const actionButtons = document.createElement('div');
  actionButtons.style.display = 'flex';
  actionButtons.style.gap = '10px';
  actionButtons.style.flexDirection = 'column';
  
  const openFolderBtn = document.createElement('button');
  openFolderBtn.textContent = 'Open Folder';
  openFolderBtn.className = 'btn-primary';
  openFolderBtn.style.padding = '8px 16px';
  openFolderBtn.style.cursor = 'pointer';
  openFolderBtn.style.backgroundColor = '#1e1e1e';
  openFolderBtn.style.border = '1px solid #404040';
  openFolderBtn.style.color = '#cccccc';
  openFolderBtn.style.borderRadius = '4px';
  openFolderBtn.addEventListener('click', () => {
    openFolder();
  });
  
  const newProjectBtn = document.createElement('button');
  newProjectBtn.textContent = 'Create New Project';
  newProjectBtn.className = 'btn-secondary';
  newProjectBtn.style.padding = '8px 16px';
  newProjectBtn.style.cursor = 'pointer';
  newProjectBtn.style.backgroundColor = '#2d2d2d';
  newProjectBtn.style.border = '1px solid #404040';
  newProjectBtn.style.color = '#cccccc';
  newProjectBtn.style.borderRadius = '4px';
  newProjectBtn.style.marginTop = '8px';
  newProjectBtn.addEventListener('click', () => {
    // Import the project creation module and show dialog
    import('../projectCreation').then(module => {
      if (typeof module.showProjectDialog === 'function') {
        module.showProjectDialog();
      } else {
        // Fallback if function doesn't exist
        console.log('Project creation dialog not available');
        alert('Create Project functionality is coming soon!');
      }
    }).catch(err => {
      console.error('Failed to load project creation module:', err);
    });
  });
  
  // Assemble UI
  actionButtons.appendChild(openFolderBtn);
  actionButtons.appendChild(newProjectBtn);
  
  emptyState.appendChild(folderIcon);
  emptyState.appendChild(message);
  emptyState.appendChild(actionButtons);
  
  container.appendChild(emptyState);
}

/**
 * Opens a folder and loads it in the explorer
 */
function openFolder(): void {
  // Check if Tauri dialog is available
  if (window.dialog) {
    window.dialog.open({
      directory: true,
      multiple: false,
      title: 'Open Folder'
    }).then((result: string | null) => {
      if (result) {
        console.log('Folder selected:', result);
        localStorage.setItem('currentProjectPath', result);
        
        // Load and render the selected folder
        loadProjectFiles(result)
          .then(files => {
            const container = document.querySelector('.file-tree');
            if (container) {
              setProjectFiles(files);
              renderFileTree(container as HTMLElement, files);
              console.log('Project files loaded and rendered');
            }
          })
          .catch(error => console.error('Error loading project files:', error));
      }
    }).catch(error => {
      console.error('Error opening folder dialog:', error);
    });
  } else {
    console.log('Dialog API not available, using fallback');
    // Web fallback - show message that folder opening is not supported
    alert('Opening folders directly is only supported in the desktop app. Please create a new project instead.');
  }
}

/**
 * Initialize the file explorer
 */
export function initializeFileExplorer(): void {
  console.log('Starting file explorer initialization');
  const container = document.querySelector('.file-tree');
  if (!container) {
    console.error('File tree container not found');
    return;
  }
  
  // Listen for refresh events
  document.addEventListener('explorer-refresh', () => {
    console.log('Explorer refresh event received');
    renderFileTree(container as HTMLElement, fileStructure);
  });
  
  // Check if project exists
  const hasActiveProject = localStorage.getItem('currentProjectPath') || 
                          localStorage.getItem('lastOpenedProject');
  
  if (!hasActiveProject) {
    // Show empty state
    showEmptyExplorerState(container as HTMLElement);
    console.log('Showing empty explorer state - no project loaded');
    return;
  }
  
  // Load and render initial file structure for existing project
  loadProjectFiles()
    .then(files => {
      console.log('Project files loaded', files);
      // Share the file structure with the explorer buttons module
      setProjectFiles(files);
      // Render the file tree
      renderFileTree(container as HTMLElement, files);
      console.log('File tree rendered initially');
    })
    .catch(error => console.error('Error loading project files:', error));
}

// Re-export everything in one section, without the .js extension
export type { FileNode } from './types';  // Use type export for interfaces
export { fileStructure } from './types';
export { renderFileTree } from './fileTreeRenderer';
export { loadProjectFiles } from './fileLoader';