// src/ide/projectHeaderMenuIcon.ts
// Adds a clickable menu icon to the project header
// Shows the same context menu as right-click

console.log('📂 [ProjectHeaderIcon] Loading...');

// ============================================================================
// STYLES
// ============================================================================

const styles = `
/* Project Header Menu Icon */
.project-header-menu-btn {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
  vertical-align: middle;
  margin-left: 4px;
}

.project-header-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.project-header-menu-btn:active {
  transform: scale(0.92);
}

.project-header-menu-btn svg {
  width: 14px;
  height: 14px;
}
`;

// Inject styles
if (!document.getElementById('project-header-icon-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'project-header-icon-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// ============================================================================
// ICONS
// ============================================================================

const menuIcon = `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="5" r="2"/>
  <circle cx="12" cy="12" r="2"/>
  <circle cx="12" cy="19" r="2"/>
</svg>`;

// Alternative: horizontal dots
const menuIconAlt = `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="5" cy="12" r="2"/>
  <circle cx="12" cy="12" r="2"/>
  <circle cx="19" cy="12" r="2"/>
</svg>`;

// Alternative: gear icon
const gearIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;

// ============================================================================
// SHOW CONTEXT MENU FUNCTION
// ============================================================================

function getProjectPath(): string {
  let projectPath = '';
  const firstFile = document.querySelector('[data-path]');
  if (firstFile) {
    const path = firstFile.getAttribute('data-path') || '';
    const parts = path.split(/[/\\]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (['src', 'lib', 'app', 'public'].includes(parts[i])) {
        projectPath = parts.slice(0, i).join(path.includes('/') ? '/' : '\\');
        break;
      }
    }
    if (!projectPath) {
      projectPath = parts.slice(0, -2).join(path.includes('/') ? '/' : '\\');
    }
  }
  return projectPath;
}

/**
 * Show the project context menu at specific position
 */
export function showProjectMenu(x: number, y: number): void {
  const projectPath = getProjectPath();
  if (!projectPath) {
    console.warn('[ProjectHeaderIcon] No project path found');
    return;
  }

  console.log('📂 [ProjectHeaderIcon] Showing menu at', x, y, 'for path:', projectPath);

  // Remove existing menus
  document.querySelectorAll('.project-context-menu').forEach(m => {
    m.classList.add('closing');
    setTimeout(() => m.remove(), 180);
  });

  // Try to use the createProjectMenu function if available
  if ((window as any).createProjectMenu) {
    console.log('📂 [ProjectHeaderIcon] Using createProjectMenu');
    const menu = (window as any).createProjectMenu(x, y, projectPath);
    document.body.appendChild(menu);
    
    // Close handler
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.classList.add('closing');
        setTimeout(() => menu.remove(), 180);
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  } else {
    // Fallback: Create a simple menu directly
    console.log('📂 [ProjectHeaderIcon] Creating fallback menu');
    const menu = createFallbackMenu(x, y, projectPath);
    document.body.appendChild(menu);
    
    // Close handler
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.classList.add('closing');
        setTimeout(() => menu.remove(), 180);
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }
}

/**
 * Create a fallback menu if createProjectMenu isn't available
 */
function createFallbackMenu(x: number, y: number, projectPath: string): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'project-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${Math.min(x, window.innerWidth - 260)}px;
    top: ${Math.min(y, window.innerHeight - 300)}px;
    background: linear-gradient(180deg, #2d2d30 0%, #1e1e1e 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 8px;
    min-width: 200px;
    z-index: 10000;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    animation: menuSlideIn 0.2s ease;
  `;

  const items = [
    { icon: '📄', text: 'New File', action: 'new-file' },
    { icon: '📁', text: 'New Folder', action: 'new-folder' },
    { type: 'divider' },
    { icon: '🔄', text: 'Refresh', action: 'refresh' },
    { icon: '📋', text: 'Copy Path', action: 'copy-path' },
  ];

  items.forEach(item => {
    if (item.type === 'divider') {
      const divider = document.createElement('div');
      divider.style.cssText = 'height: 1px; background: rgba(255,255,255,0.1); margin: 6px 0;';
      menu.appendChild(divider);
      return;
    }

    const menuItem = document.createElement('div');
    menuItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      color: #d4d4d4;
      border-radius: 6px;
      transition: background 0.15s;
    `;
    menuItem.innerHTML = `<span>${item.icon}</span><span>${item.text}</span>`;
    
    menuItem.onmouseenter = () => menuItem.style.background = 'rgba(255,255,255,0.1)';
    menuItem.onmouseleave = () => menuItem.style.background = 'transparent';
    
    menuItem.onclick = async () => {
      menu.classList.add('closing');
      setTimeout(() => menu.remove(), 180);
      
      switch (item.action) {
        case 'new-file':
          if ((window as any).createNewFile) {
            (window as any).createNewFile(projectPath);
          } else {
            const fn = prompt('Enter file name:');
            if (fn) {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                const sep = projectPath.includes('\\') ? '\\' : '/';
                await invoke('create_file', { path: projectPath + sep + fn, content: '' });
                document.dispatchEvent(new CustomEvent('file-tree-refresh'));
              } catch (e) { console.error(e); }
            }
          }
          break;
        case 'new-folder':
          if ((window as any).createNewFolder) {
            (window as any).createNewFolder(projectPath);
          } else {
            const dn = prompt('Enter folder name:');
            if (dn) {
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                const sep = projectPath.includes('\\') ? '\\' : '/';
                await invoke('create_directory', { path: projectPath + sep + dn });
                document.dispatchEvent(new CustomEvent('file-tree-refresh'));
              } catch (e) { console.error(e); }
            }
          }
          break;
        case 'refresh':
          document.dispatchEvent(new CustomEvent('file-tree-refresh'));
          break;
        case 'copy-path':
          navigator.clipboard.writeText(projectPath);
          break;
      }
    };
    
    menu.appendChild(menuItem);
  });

  // Add animation keyframes
  if (!document.getElementById('fallback-menu-keyframes')) {
    const style = document.createElement('style');
    style.id = 'fallback-menu-keyframes';
    style.textContent = `
      @keyframes menuSlideIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      .project-context-menu.closing { animation: menuSlideOut 0.15s ease forwards; }
      @keyframes menuSlideOut { to { opacity: 0; transform: scale(0.95); } }
    `;
    document.head.appendChild(style);
  }

  return menu;
}

// ============================================================================
// ADD MENU BUTTON TO PROJECT HEADER
// ============================================================================

function addMenuButtonToHeader(): void {
  console.log('📂 [ProjectHeaderIcon] Looking for project header...');
  
  const fileTree = document.querySelector('.file-tree, #file-tree');
  if (!fileTree) {
    console.log('⚠️ [ProjectHeaderIcon] File tree not found');
    return;
  }
  
  // Skip if already has menu button
  if (fileTree.querySelector('.project-header-menu-btn')) {
    console.log('📂 [ProjectHeaderIcon] Menu button already exists');
    return;
  }
  
  // Find the project-header div
  const projectHeader = fileTree.querySelector('.project-header') as HTMLElement;
  if (!projectHeader) {
    console.log('⚠️ [ProjectHeaderIcon] .project-header not found');
    return;
  }
  
  console.log('📂 [ProjectHeaderIcon] Found .project-header');
  
  // Find the close button (button containing ×)
  const closeButton = projectHeader.querySelector('button');
  
  if (closeButton) {
    console.log('📂 [ProjectHeaderIcon] Found close button, inserting menu before it');
    
    const btn = createMenuButton();
    projectHeader.insertBefore(btn, closeButton);
    
    console.log('✅ [ProjectHeaderIcon] Menu button added!');
  } else {
    console.log('📂 [ProjectHeaderIcon] No close button found, appending to header');
    
    const btn = createMenuButton();
    projectHeader.appendChild(btn);
    
    console.log('✅ [ProjectHeaderIcon] Menu button appended!');
  }
}

function createMenuButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'project-header-menu-btn';
  btn.title = 'Project menu';
  btn.innerHTML = menuIcon;
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: #888;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
    margin: 0 4px;
    vertical-align: middle;
    transition: all 0.15s ease;
  `;
  
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📂 [ProjectHeaderIcon] Menu button clicked!');
    const rect = btn.getBoundingClientRect();
    showProjectMenu(rect.left, rect.bottom + 4);
  });
  
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(255, 255, 255, 0.15)';
    btn.style.color = '#fff';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent';
    btn.style.color = '#888';
  });
  
  return btn;
}

// ============================================================================
// OBSERVER - Watch for new project headers
// ============================================================================

let observer: MutationObserver | null = null;
let retryCount = 0;

function startObserver(): void {
  if (observer) return;
  
  const fileTree = document.querySelector('.file-tree, #file-tree');
  if (!fileTree) {
    retryCount++;
    if (retryCount < 20) {
      console.log('📂 [ProjectHeaderIcon] File tree not found, retrying...', retryCount);
      setTimeout(startObserver, 500);
    }
    return;
  }
  
  console.log('📂 [ProjectHeaderIcon] File tree found, starting observer');
  
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Check if any added node contains × (close button indicator)
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.textContent?.includes('×') || node.innerHTML?.includes('×')) {
              console.log('📂 [ProjectHeaderIcon] Detected header change, adding button...');
              setTimeout(addMenuButtonToHeader, 100);
              return;
            }
          }
        }
      }
    }
  });
  
  observer.observe(fileTree, {
    childList: true,
    subtree: true
  });
  
  // Initial check
  setTimeout(addMenuButtonToHeader, 100);
}

// ============================================================================
// INITIALIZE
// ============================================================================

export function initializeProjectHeaderIcon(): void {
  console.log('📂 [ProjectHeaderIcon] Initializing...');
  
  // Start observer when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startObserver, 500);
    });
  } else {
    setTimeout(startObserver, 500);
  }
  
  // Also check on project-opened events
  document.addEventListener('project-opened', () => {
    console.log('📂 [ProjectHeaderIcon] project-opened event received');
    setTimeout(addMenuButtonToHeader, 200);
    setTimeout(addMenuButtonToHeader, 500);
    setTimeout(addMenuButtonToHeader, 1000);
  });
  
  // Listen for file-tree updates
  document.addEventListener('file-tree-refresh', () => {
    console.log('📂 [ProjectHeaderIcon] file-tree-refresh event');
    setTimeout(addMenuButtonToHeader, 300);
  });
  
  // Periodic check (in case mutations are missed)
  setInterval(() => {
    const hasButton = document.querySelector('.project-header-menu-btn');
    if (!hasButton) {
      addMenuButtonToHeader();
    }
  }, 3000);
  
  // Expose function globally
  (window as any).showProjectMenu = showProjectMenu;
  (window as any).addProjectMenuButton = addMenuButtonToHeader;
  
  console.log('✅ [ProjectHeaderIcon] Initialized!');
  console.log('💡 [ProjectHeaderIcon] Call window.addProjectMenuButton() to manually add the button');
}

// Auto-initialize after a delay
setTimeout(() => {
  initializeProjectHeaderIcon();
}, 500);

export default initializeProjectHeaderIcon;