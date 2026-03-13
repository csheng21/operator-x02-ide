// projectCreationIntegration.ts
// Integration layer between project creation and AI notification

import { notifyAIWithFileContents, ProjectCreationInfo } from './projectCreationNotifier';
import { getTemplateFiles } from './ide/projectCreation/ui/modernModalTemplates';
import { storeProjectInfo } from './projectCommandHandler';
/**
 * Dispatch project-created event after successful project creation
 * This event will be caught by the notifier to inform the AI
 */
export function dispatchProjectCreatedEvent(
  projectName: string,
  projectPath: string,
  projectType: string,
  template: string
): void {
  console.log('📣 Dispatching project-created event...');
  
  try {
    // Get template files to list what was created
    const templateFiles = getTemplateFiles(template);
    const files = Object.keys(templateFiles || {});
    
    // Calculate full project path
    const separator = projectPath.includes('\\') ? '\\' : '/';
    const fullPath = `${projectPath}${separator}${projectName}`;
    
    // ✅ NEW: Update window.currentFolderPath BEFORE dispatching event
    console.log('📂 [ProjectCreation] Setting currentFolderPath to:', fullPath);
    (window as any).currentFolderPath = fullPath;
    (window as any).__currentFolderPath = fullPath;
    (window as any).currentProjectPath = fullPath;
    (window as any).__currentProjectPath = fullPath;
    localStorage.setItem('currentProjectPath', fullPath);
    localStorage.setItem('lastOpenedFolder', fullPath);
    
    // ✅ NEW: Clear file explorer and load new project
    clearAndLoadNewProject(fullPath, projectName);
    
    // Build project info
    const projectInfo: ProjectCreationInfo = {
      projectName,
      projectPath: fullPath,  // Use full path including project name
      projectType,
      template,
      files,
      timestamp: Date.now()
    };
    
    // Dispatch custom event
    const event = new CustomEvent('project-created', {
      detail: projectInfo,
      bubbles: true
    });
    
    document.dispatchEvent(event);
    
    console.log('✅ project-created event dispatched:', projectInfo);
    
    // ✅ Force refresh build system UI after project creation (single call with delay)
    // Using only one call since buildSystemUI now has debouncing
    setTimeout(() => {
      if ((window as any).__buildSystemUI?.forceRefreshBuildSystem) {
        console.log('🔄 [ProjectCreation] Triggering build system refresh...');
        (window as any).__buildSystemUI.forceRefreshBuildSystem();
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Failed to dispatch project-created event:', error);
  }
}

/**
 * ✅ NEW: Clear file explorer and load new project
 */
function clearAndLoadNewProject(projectPath: string, projectName: string): void {
  console.log('🗑️ [ProjectCreation] Clearing old project and loading new...');
  
  try {
    // Method 1: Use fileExplorer API if available
    if ((window as any).fileExplorer) {
      const fe = (window as any).fileExplorer;
      
      // Clear current tree
      if (fe.clearFiles) {
        fe.clearFiles();
        console.log('🗑️ [ProjectCreation] File explorer cleared via clearFiles()');
      }
      
      // Set project path
      if (fe.setProjectPath) {
        fe.setProjectPath(projectPath);
        console.log('📂 [ProjectCreation] Project path set via setProjectPath()');
      }
      
      // Load new project folder
      setTimeout(() => {
        if (fe.loadFolder) {
          fe.loadFolder(projectPath);
          console.log('📂 [ProjectCreation] New project loaded via loadFolder()');
        }
      }, 200);
      
      // Refresh to ensure tree is populated
      setTimeout(() => {
        if (fe.refresh) {
          fe.refresh();
          console.log('🔄 [ProjectCreation] File explorer refreshed');
        }
      }, 500);
      
      setTimeout(() => {
        if (fe.refresh) {
          fe.refresh();
        }
      }, 1500);
    }
    
    // Method 2: Update project header name
    const headerName = document.querySelector('.fcm-header-name, .project-header .title, .project-name');
    if (headerName) {
      headerName.textContent = projectName.toUpperCase();
      console.log('📝 [ProjectCreation] Header updated to:', projectName);
    }
    
    // Method 3: Dispatch events for other components to react
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('folder-opened', {
        detail: { path: projectPath, name: projectName }
      }));
      
      window.dispatchEvent(new CustomEvent('project-opened', {
        detail: { path: projectPath, name: projectName }
      }));
      
      console.log('📂 [ProjectCreation] folder-opened/project-opened events dispatched');
    }, 100);
    
  } catch (error) {
    console.error('❌ [ProjectCreation] Failed to clear/load project:', error);
  }
}

/**
 * Direct notification (alternative to event-based)
 * Use this if you want to notify the AI immediately without events
 */
export async function notifyAIDirectly(
  projectName: string,
  projectPath: string,
  projectType: string,
  template: string
): Promise<void> {
  console.log('🤖 Directly notifying AI assistant...');
  
  try {
    const templateFiles = getTemplateFiles(template);
    const files = Object.keys(templateFiles || {});
    const separator = projectPath.includes('\\') ? '\\' : '/';
    const fullPath = `${projectPath}${separator}${projectName}`;
    
    // ✅ NEW: Update window.currentFolderPath
    console.log('📂 [ProjectCreation] Setting currentFolderPath to:', fullPath);
    (window as any).currentFolderPath = fullPath;
    (window as any).__currentFolderPath = fullPath;
    (window as any).currentProjectPath = fullPath;
    (window as any).__currentProjectPath = fullPath;
    localStorage.setItem('currentProjectPath', fullPath);
    localStorage.setItem('lastOpenedFolder', fullPath);
    
    const projectInfo: ProjectCreationInfo = {
      projectName,
      projectPath: fullPath,
      projectType,
      template,
      files,
      timestamp: Date.now()
    };
    
    // Store project info for command handler (AFTER creating it!)
    storeProjectInfo(projectInfo);
    
    // Directly notify AI with file contents
    await notifyAIWithFileContents(projectInfo);
    
    console.log('✅ AI notified directly');
    
    // ✅ NEW: Force refresh build system UI
    setTimeout(() => {
      if ((window as any).__buildSystemUI?.forceRefreshBuildSystem) {
        console.log('🔄 [ProjectCreation] Triggering build system refresh...');
        (window as any).__buildSystemUI.forceRefreshBuildSystem();
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Direct AI notification failed:', error);
  }
}

/**
 * Initialize integration and set up event listeners
 */
export function initializeProjectCreationIntegration(): void {
  console.log('🔧 Initializing project creation integration...');
  
  // Make functions globally available for easy access from modal
  if (typeof window !== 'undefined') {
    (window as any).dispatchProjectCreatedEvent = dispatchProjectCreatedEvent;
    (window as any).notifyAIDirectly = notifyAIDirectly;
  }
  
  console.log('✅ Project creation integration initialized');
}