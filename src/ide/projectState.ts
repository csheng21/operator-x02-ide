// src/ide/projectState.ts

// Global state to track if a project is currently open
let projectOpen = false;

// Interface for project information
interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  template: string;
}

// Current project info
let currentProject: ProjectInfo | null = null;

/**
 * Clear the file explorer and show empty state
 */
export function showEmptyFileExplorer(): void {
  console.log('Showing empty file explorer state');
  
  // Set project state to closed
  projectOpen = false;
  currentProject = null;
  
  // Get the file tree container
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.error('File tree container not found');
    return;
  }
  
  // Clear all file nodes
  fileTree.innerHTML = '';
  
  // Add a placeholder message
  const placeholder = document.createElement('div');
  placeholder.className = 'file-tree-placeholder';
  placeholder.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📁</div>
      <div class="empty-message">No project open</div>
      <div class="empty-action">
        <button id="empty-new-project-btn">Create New Project</button>
        <button id="empty-open-project-btn">Open Project</button>
      </div>
    </div>
  `;
  
  // Add styles for the empty state
  ensureEmptyStateStyles();
  
  // Add to container
  fileTree.appendChild(placeholder);
  
  // Add event listeners to buttons
  setupEmptyStateButtons();
}

/**
 * Ensure styles for empty state are added to the document
 */
function ensureEmptyStateStyles(): void {
  // Check if styles already exist
  if (document.getElementById('empty-state-styles')) {
    return;
  }
  
  // Add styles
  const style = document.createElement('style');
  style.id = 'empty-state-styles';
  style.textContent = `
    .file-tree-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      color: #888;
    }
    
    .empty-state {
      text-align: center;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .empty-message {
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .empty-action {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .empty-action button {
      background-color: #2d2d30;
      border: 1px solid #3e3e42;
      color: #cccccc;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
      width: 160px;
    }
    
    .empty-action button:hover {
      background-color: #3e3e42;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Set up event listeners for empty state buttons
 */
function setupEmptyStateButtons(): void {
  // Create New Project button
  const newProjectBtn = document.getElementById('empty-new-project-btn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      // Show the new project modal
      const newProjectModal = document.getElementById('new-project-modal');
      if (newProjectModal) {
        newProjectModal.style.display = 'block';
      } else {
        console.error('New project modal not found');
        
        // Dispatch a custom event that can be caught elsewhere
        document.dispatchEvent(new CustomEvent('menu-new-project'));
      }
    });
  }
  
  // Open Project button
  const openProjectBtn = document.getElementById('empty-open-project-btn');
  if (openProjectBtn) {
    openProjectBtn.addEventListener('click', () => {
      openProject();
    });
  }
}

/**
 * Open an existing project
 */
async function openProject(): Promise<void> {
  // Trigger open project dialog
  if (window.dialog && window.dialog.open) {
    try {
      const selected = await window.dialog.open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder'
      });
      
      if (selected) {
        console.log('Selected project folder:', selected);
        // In a real app, you would load the project here
        simulateProjectOpen(selected as string);
      }
    } catch (err) {
      console.error('Error selecting project folder:', err);
    }
  } else {
    // Mock for development
    const mockPath = '/Users/username/Projects/my-awesome-app';
    simulateProjectOpen(mockPath);
  }
}

/**
 * Simulate opening a project (for development)
 */
function simulateProjectOpen(path: string): void {
  // Set project state to open
  projectOpen = true;
  
  // Extract project name from path
  const pathParts = path.split('/');
  const projectName = pathParts[pathParts.length - 1];
  
  // Set current project info
  currentProject = {
    name: projectName,
    path: path,
    type: 'web',
    template: 'react'
  };
  
  // Show success message
  alert(`Project would be loaded from: ${path}`);
  
  // In a real application, you would load the project structure
  // and update the file explorer
}

/**
 * Check if a project is currently open
 */
export function isProjectOpen(): boolean {
  return projectOpen;
}

/**
 * Get current project info
 */
export function getCurrentProject(): ProjectInfo | null {
  return currentProject;
}

/**
 * Set project as open with the given information
 */
export function setProjectOpen(info: ProjectInfo): void {
  projectOpen = true;
  currentProject = info;
}

/**
 * Override the default file explorer initialization
 * This should be added to your main.ts
 */
export function initializeProjectState(): void {
  console.log('Initializing project state');
  
  // Delay slightly to ensure DOM is ready
  setTimeout(() => {
    // Check if we should show the empty state
    if (!isProjectOpen()) {
      showEmptyFileExplorer();
    }
    
    // Override the fileExplorer initialization
    const originalInitFileExplorer = window.initializeFileExplorer;
    if (originalInitFileExplorer) {
      window.initializeFileExplorer = function() {
        // Only initialize real file explorer if a project is open
        if (isProjectOpen()) {
          console.log('Project open, initializing file explorer');
          originalInitFileExplorer();
        } else {
          console.log('No project open, showing empty state');
          showEmptyFileExplorer();
        }
      };
    }
  }, 100);
}

// Add to window object for type safety
declare global {
  interface Window {
    initializeFileExplorer?: Function;
    dialog?: {
      open: (options: { directory: boolean, multiple: boolean, title: string }) => Promise<string | string[]>;
    };
  }
}

// Initialize when imported
document.addEventListener('DOMContentLoaded', initializeProjectState);