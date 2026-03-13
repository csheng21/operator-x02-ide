// projectExplorerLoader.ts
// ============================================================================
// AUTO-LOAD PROJECT FILES INTO IDE EXPLORER
// ============================================================================
//
// Based on modernModal.ts strategy
//
// Usage: After creating project files, call:
//   await loadProjectIntoExplorer(projectPath);
//
// Import in your modal handler:
//   import { loadProjectIntoExplorer, refreshExplorer } from './projectExplorerLoader';
//
// ============================================================================

/**
 * Load a project folder into the IDE file explorer
 * This is the main function to call after creating project files
 * 
 * @param projectPath - Full path to the project folder
 */
export async function loadProjectIntoExplorer(projectPath: string): Promise<void> {
  try {
    console.log('📂 Loading project into file explorer:', projectPath);
    
    // Method 1: Try using fileSystem module (preferred)
    try {
      const fileSystemModule = await import('../../../fileSystem');
      console.log('✅ fileSystem module imported');
      
      // Get directory tree (depth of 5 levels)
      const files = await fileSystemModule.getDirectoryTree(projectPath, 5);
      console.log('✅ Directory tree loaded:', files);
      
      // Store in localStorage for other components
      localStorage.setItem('currentProjectPath', projectPath);
      localStorage.setItem('currentProject', files.name || projectPath.split(/[/\\]/).pop() || 'Project');
      
      // Dispatch events that menuSystem listens for
      dispatchExplorerEvents(projectPath, files);
      
      console.log('✅ Project loaded into explorer successfully!');
      return;
      
    } catch (fsError) {
      console.warn('⚠️ fileSystem module not available, trying Tauri...', fsError);
    }
    
    // Method 2: Try Tauri invoke
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      
      // Try to read directory via Tauri
      const files = await invoke('read_directory_tree', { 
        path: projectPath,
        depth: 5 
      });
      
      console.log('✅ Directory tree loaded via Tauri:', files);
      
      localStorage.setItem('currentProjectPath', projectPath);
      localStorage.setItem('currentProject', (files as any).name || projectPath.split(/[/\\]/).pop() || 'Project');
      
      dispatchExplorerEvents(projectPath, files);
      
      console.log('✅ Project loaded into explorer successfully!');
      return;
      
    } catch (tauriError) {
      console.warn('⚠️ Tauri invoke not available, using manual method...', tauriError);
    }
    
    // Method 3: Fallback - just dispatch event with path
    console.log('📢 Dispatching project-opened event (fallback mode)');
    localStorage.setItem('currentProjectPath', projectPath);
    
    const projectName = projectPath.split(/[/\\]/).pop() || 'Project';
    localStorage.setItem('currentProject', projectName);
    
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: { 
        path: projectPath,
        name: projectName
      }
    }));
    
    // Also try to trigger a refresh
    triggerExplorerRefresh(projectPath);
    
  } catch (error) {
    console.error('❌ Error loading project into explorer:', error);
    throw error;
  }
}

/**
 * Dispatch events that the file explorer listens for
 */
function dispatchExplorerEvents(projectPath: string, files: any): void {
  // Event 1: folder-structure-loaded (menuSystem listens for this)
  console.log('📢 Dispatching folder-structure-loaded event');
  document.dispatchEvent(new CustomEvent('folder-structure-loaded', {
    detail: files
  }));
  
  // Event 2: project-opened (general project open event)
  console.log('📢 Dispatching project-opened event');
  document.dispatchEvent(new CustomEvent('project-opened', {
    detail: { 
      path: projectPath, 
      files: files,
      name: files.name || projectPath.split(/[/\\]/).pop()
    }
  }));
  
  // Event 3: files-changed (some explorers listen for this)
  document.dispatchEvent(new CustomEvent('files-changed', {
    detail: { path: projectPath }
  }));
}

/**
 * Try to trigger explorer refresh through various methods
 */
function triggerExplorerRefresh(projectPath: string): void {
  // Try global refresh function if available
  if ((window as any).refreshFileExplorer) {
    console.log('📢 Calling global refreshFileExplorer()');
    (window as any).refreshFileExplorer(projectPath);
  }
  
  if ((window as any).reloadFileTree) {
    console.log('📢 Calling global reloadFileTree()');
    (window as any).reloadFileTree(projectPath);
  }
  
  if ((window as any).fileExplorer?.refresh) {
    console.log('📢 Calling fileExplorer.refresh()');
    (window as any).fileExplorer.refresh(projectPath);
  }
  
  // Try clicking refresh button if it exists
  const refreshBtn = document.querySelector('.explorer-refresh-btn, [title="Refresh"], .refresh-explorer');
  if (refreshBtn) {
    console.log('📢 Clicking refresh button');
    (refreshBtn as HTMLElement).click();
  }
}

/**
 * Refresh the file explorer with current project
 * Call this after file operations (create, delete, rename)
 */
export async function refreshExplorer(): Promise<void> {
  const projectPath = localStorage.getItem('currentProjectPath');
  if (projectPath) {
    await loadProjectIntoExplorer(projectPath);
  } else {
    console.warn('⚠️ No current project path found');
  }
}

/**
 * Update explorer directly by manipulating DOM
 * Use this as a fallback if events don't work
 */
export function updateExplorerDirectly(projectPath: string, files: any): void {
  console.log('🎨 Updating explorer DOM directly...');
  
  // Find file tree container
  const fileTree = document.querySelector('.file-tree') || 
                   document.querySelector('.explorer-content') ||
                   document.querySelector('#file-explorer') ||
                   document.querySelector('.file-explorer');
  
  if (!fileTree) {
    console.error('❌ File tree container not found');
    return;
  }
  
  console.log('✅ Found file tree container');
  
  // Clear and rebuild
  fileTree.innerHTML = '';
  
  // Create header
  const projectName = files.name || projectPath.split(/[/\\]/).pop();
  const header = document.createElement('div');
  header.className = 'project-header';
  header.style.cssText = `
    padding: 8px 12px;
    font-weight: 600;
    color: #ccc;
    background: #252526;
    border-bottom: 1px solid #3e3e42;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  header.innerHTML = `<span style="color: #dcb67a;">📁</span> ${projectName}`;
  fileTree.appendChild(header);
  
  // Create file container
  const container = document.createElement('div');
  container.className = 'file-container';
  container.style.cssText = 'padding: 4px 0;';
  
  // Render files recursively
  if (files.children && files.children.length > 0) {
    renderFileTree(container, files.children, projectPath, 0);
  }
  
  fileTree.appendChild(container);
  console.log('✅ Explorer updated directly');
}

/**
 * Recursively render file tree
 */
function renderFileTree(container: HTMLElement, items: any[], basePath: string, depth: number): void {
  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `file-item ${item.isDirectory ? 'folder' : 'file'}`;
    itemEl.style.cssText = `
      padding: 4px 8px 4px ${12 + depth * 16}px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ccc;
      font-size: 13px;
      transition: background 0.1s;
    `;
    
    // Icon
    const icon = item.isDirectory ? '📁' : getFileIcon(item.name);
    
    itemEl.innerHTML = `
      <span style="font-size: 14px;">${icon}</span>
      <span class="file-name">${item.name}</span>
    `;
    
    // Hover effect
    itemEl.addEventListener('mouseenter', () => {
      itemEl.style.background = 'rgba(255,255,255,0.05)';
    });
    itemEl.addEventListener('mouseleave', () => {
      itemEl.style.background = 'transparent';
    });
    
    // Click handler
    const fullPath = `${basePath}/${item.name}`;
    itemEl.setAttribute('data-path', fullPath);
    
    if (!item.isDirectory) {
      itemEl.addEventListener('click', () => {
        // Dispatch file-open event
        document.dispatchEvent(new CustomEvent('file-open', {
          detail: { path: fullPath, name: item.name }
        }));
      });
    }
    
    container.appendChild(itemEl);
    
    // Render children for directories
    if (item.isDirectory && item.children && item.children.length > 0) {
      renderFileTree(container, item.children, fullPath, depth + 1);
    }
  });
}

/**
 * Get file icon based on extension
 */
function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    'ts': '🔷',
    'tsx': '⚛️',
    'js': '🟨',
    'jsx': '⚛️',
    'json': '📋',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'md': '📝',
    'py': '🐍',
    'rs': '🦀',
    'go': '🐹',
    'java': '☕',
    'kt': '🟣',
    'swift': '🍎',
    'c': '🔵',
    'cpp': '🔵',
    'h': '📄',
    'vue': '💚',
    'svelte': '🧡',
    'yaml': '⚙️',
    'yml': '⚙️',
    'toml': '⚙️',
    'env': '🔐',
    'gitignore': '🔒',
    'lock': '🔒',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'svg': '🎨',
    'gif': '🖼️',
  };
  
  return icons[ext] || '📄';
}

/**
 * Show success notification after loading
 */
export function showLoadSuccessNotification(projectName: string): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 30000;
    animation: slideInUp 0.3s ease;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  notification.innerHTML = `
    <div style="font-size: 24px;">✅</div>
    <div>
      <div style="font-weight: 600; margin-bottom: 4px;">Project Loaded!</div>
      <div style="opacity: 0.9; font-size: 13px;">${projectName}</div>
    </div>
  `;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('loader-animations')) {
    const style = document.createElement('style');
    style.id = 'loader-animations';
    style.textContent = `
      @keyframes slideInUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slideOutDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================================================
// EXPOSE GLOBALLY
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).loadProjectIntoExplorer = loadProjectIntoExplorer;
  (window as any).refreshExplorer = refreshExplorer;
  (window as any).updateExplorerDirectly = updateExplorerDirectly;
  (window as any).showLoadSuccessNotification = showLoadSuccessNotification;
  
  console.log('✅ Project Explorer Loader initialized');
  console.log('   - loadProjectIntoExplorer(path)');
  console.log('   - refreshExplorer()');
}

export default { loadProjectIntoExplorer, refreshExplorer, updateExplorerDirectly };
