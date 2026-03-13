// src/ide/projectCreation/ui/formHandlers.ts
import { invoke } from '@tauri-apps/api/core';
import { updateProjectOptions, currentProjectOptions, validateProjectOptions } from '../projectOptions';
import { updateProjectSummary } from './projectSummary';
import { hideProjectModal, showSuccessMessage } from './modalHandlers';
import { updateFileExplorerWithMockFiles } from '../services/mockFileSystem';

// Setup listeners for form inputs
export function setupFormInputListeners(): void {
  // Project name input
  const projectNameInput = document.getElementById('project-name');
  if (projectNameInput) {
    projectNameInput.addEventListener('input', (e) => {
      updateProjectOptions({ name: (e.target as HTMLInputElement).value });
      updateProjectSummary();
    });
  }
  
  // Project location input
  const projectLocationInput = document.getElementById('project-location');
  if (projectLocationInput) {
    projectLocationInput.addEventListener('input', (e) => {
      updateProjectOptions({ location: (e.target as HTMLInputElement).value });
    });
  }
  
  // Project description input
  const projectDescriptionInput = document.getElementById('project-description');
  if (projectDescriptionInput) {
    projectDescriptionInput.addEventListener('input', (e) => {
      updateProjectOptions({ description: (e.target as HTMLInputElement).value });
    });
  }
  
  // Package manager selection
  document.querySelectorAll('input[name="package-manager"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      updateProjectOptions({ packageManager: value as 'npm' | 'yarn' | 'pnpm' });
    });
  });
  
  // TypeScript checkbox
  const tsCheckbox = document.getElementById('use-typescript');
  if (tsCheckbox) {
    tsCheckbox.addEventListener('change', (e) => {
      updateProjectOptions({ useTypeScript: (e.target as HTMLInputElement).checked });
      updateProjectSummary();
    });
  }
  
  // Browse location button
  const browseBtn = document.getElementById('browse-location');
  if (browseBtn) {
    browseBtn.addEventListener('click', handleBrowseLocation);
  }
  
  // Create project button
  const createBtn = document.getElementById('create-project');
  if (createBtn) {
    createBtn.addEventListener('click', handleCreateProject);
  }
}

// Handle browse location button
export async function handleBrowseLocation(): Promise<void> {
  console.log('Browse location button clicked');
  console.log('Dialog API available:', !!window.dialog);
  
  try {
    // Use Tauri dialog API instead of mock selection
    if (window.dialog) {
      console.log('Using Tauri dialog API');
      // For Tauri app
      const selectedPath = await window.dialog.open({
        directory: true,
        multiple: false,
        title: 'Select Project Location'
      });
      
      console.log('Dialog result:', selectedPath);
      
      if (selectedPath) {
        const locationInput = document.getElementById('project-location') as HTMLInputElement;
        if (locationInput) {
          locationInput.value = selectedPath as string;
          updateProjectOptions({ location: selectedPath as string });
          console.log('Folder selected:', selectedPath);
        }
      }
    } else {
      console.log('Using mock folder selection (dialog API not available)');
      // Fallback to mock for development
      mockFolderSelection();
    }
  } catch (error) {
    console.error('Error selecting folder:', error);
    // Fallback to mock
    mockFolderSelection();
  }
}

// Mock folder selection for development
function mockFolderSelection(): void {
  const defaultPath = '/Users/project';
  const locationInput = document.getElementById('project-location') as HTMLInputElement;
  if (locationInput) {
    locationInput.value = defaultPath;
    updateProjectOptions({ location: defaultPath });
    console.log('Mock folder selected:', defaultPath);
  }
}

// Handle create project button
export async function handleCreateProject(): Promise<void> {
  console.log('Create project button clicked');
  
  // Validate form
  const validation = validateProjectOptions();
  if (!validation.valid) {
    alert(validation.message);
    return;
  }
  
  try {
    // Show a loading indicator
    const createBtn = document.getElementById('create-project') as HTMLButtonElement;
    if (createBtn) {
      const originalText = createBtn.textContent || '';
      createBtn.textContent = 'Creating...';
      createBtn.disabled = true;
      
      // Build the full project path (location + project name)
      const projectPath = `${currentProjectOptions.location}/${currentProjectOptions.name}`;
      
      // Create the actual project files
      await invoke('create_project_files', {
        projectPath: currentProjectOptions.location,
        templateType: currentProjectOptions.template,
        projectName: currentProjectOptions.name
      });
      
      console.log('Project created successfully at:', projectPath);
      
      // Load the created project into file explorer (same as Open Folder flow)
      await loadProjectIntoExplorer(projectPath);
      
      // Hide the modal
      hideProjectModal();
      
      // Show success message
      showSuccessMessage(currentProjectOptions.name);
      
      // Reset button state
      createBtn.textContent = originalText;
      createBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error creating project:', error);
    alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Reset button state
    const createBtn = document.getElementById('create-project') as HTMLButtonElement;
    if (createBtn) {
      createBtn.textContent = 'Create Project';
      createBtn.disabled = false;
    }
  }
}

// Load project into file explorer (same strategy as Open Folder)
async function loadProjectIntoExplorer(projectPath: string): Promise<void> {
  try {
    console.log('Loading project into file explorer:', projectPath);
    
    // Import getDirectoryTree from fileSystem module (same as Open Folder flow)
    const { getDirectoryTree } = await import('../../../fileSystem');
    
    // Read directory structure from backend (max depth: 5 levels)
    const files = await getDirectoryTree(projectPath, 5);
    console.log('Directory tree loaded:', files);
    
    // Import the function to update file explorer
    // This is the same function used in menuSystem.ts for Open Folder
    const menuSystemModule = await import('../../../menuSystem');
    
    if (typeof menuSystemModule.updateFileExplorerWithProject === 'function') {
      // Update file explorer with the actual project files
      menuSystemModule.updateFileExplorerWithProject(projectPath, files);
      console.log('File explorer updated successfully');
    } else {
      console.error('updateFileExplorerWithProject function not found');
      // Fallback: dispatch event
      dispatchProjectLoadedEvent(projectPath, files);
    }
    
  } catch (error) {
    console.error('Error loading project into explorer:', error);
    
    // Fallback: try to dispatch event
    try {
      dispatchProjectLoadedEvent(projectPath, null);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  }
}

// Fallback: dispatch custom event for project loaded
function dispatchProjectLoadedEvent(projectPath: string, files: any): void {
  const event = new CustomEvent('project-loaded', {
    detail: { 
      path: projectPath,
      files: files 
    }
  });
  document.dispatchEvent(event);
  console.log('Dispatched project-loaded event');
}