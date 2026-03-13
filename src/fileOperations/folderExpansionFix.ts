// folderExpansionFix.ts - Fix for folders appearing collapsed after project creation
// ============================================================================
// The issue: src folder is rendered but collapsed (children hidden) on first load
// This fix ensures all folders are expanded after project creation
// ============================================================================
// Add to main.ts: import './folderExpansionFix';
// ============================================================================

(function() {
  console.log('📂 [FolderExpansionFix] Initializing...');
  
  /**
   * Expand all folders in the file tree
   */
  function expandAllFolders(): void {
    console.log('📂 [FolderExpansionFix] Expanding all folders...');
    
    // Method 1: Remove collapsed class
    const collapsedFolders = document.querySelectorAll('.folder-item.collapsed, .directory.collapsed');
    collapsedFolders.forEach(folder => {
      folder.classList.remove('collapsed');
      console.log('   ↳ Uncollapsed:', (folder as HTMLElement).getAttribute('data-name'));
    });
    
    // Method 2: Show hidden children
    const hiddenChildren = document.querySelectorAll('.file-tree .file-item[style*="display: none"], .file-tree .folder-item[style*="display: none"]');
    hiddenChildren.forEach(item => {
      (item as HTMLElement).style.display = '';
      console.log('   ↳ Unhid:', (item as HTMLElement).getAttribute('data-name'));
    });
    
    // Method 3: Expand folder content containers
    const folderContents = document.querySelectorAll('.folder-contents, .folder-children, .tree-children');
    folderContents.forEach(content => {
      (content as HTMLElement).style.display = '';
      (content as HTMLElement).style.visibility = 'visible';
      (content as HTMLElement).classList.remove('collapsed', 'hidden');
    });
    
    // Method 4: Update chevron icons to expanded state
    const chevrons = document.querySelectorAll('.folder-chevron, .tree-chevron, .expand-icon');
    chevrons.forEach(chevron => {
      const el = chevron as HTMLElement;
      // Change ▶ to ▼
      if (el.textContent?.includes('▶')) {
        el.textContent = el.textContent.replace('▶', '▼');
      }
      // Or rotate the chevron
      el.style.transform = 'rotate(90deg)';
      el.classList.add('expanded');
      el.classList.remove('collapsed');
    });
    
    // Method 5: Click on collapsed folders to expand them
    const foldersWithChevron = document.querySelectorAll('.folder-item, .directory');
    foldersWithChevron.forEach(folder => {
      const folderEl = folder as HTMLElement;
      const text = folderEl.textContent || '';
      
      // If folder shows ▶ (collapsed), it needs to be expanded
      if (text.includes('▶') && !text.includes('▼')) {
        // Find the clickable chevron element
        const clickable = folderEl.querySelector('.folder-chevron, .tree-chevron, [class*="chevron"]') as HTMLElement;
        if (clickable) {
          console.log('   ↳ Clicking to expand:', folderEl.getAttribute('data-name'));
          clickable.click();
        }
      }
    });
    
    // Method 6: Check for src folder specifically
    const srcFolder = document.querySelector('[data-name="src"]') as HTMLElement;
    if (srcFolder) {
      srcFolder.classList.remove('collapsed');
      srcFolder.classList.add('expanded');
      
      // Find and show its children
      let nextSibling = srcFolder.nextElementSibling as HTMLElement;
      while (nextSibling) {
        const path = nextSibling.getAttribute('data-path') || '';
        if (path.includes('\\src\\') || path.includes('/src/')) {
          nextSibling.style.display = '';
          console.log('   ↳ Showing src child:', nextSibling.getAttribute('data-name'));
        } else if (nextSibling.classList.contains('folder-item')) {
          // Reached another top-level folder
          break;
        }
        nextSibling = nextSibling.nextElementSibling as HTMLElement;
      }
    }
    
    // ✅ Method 7: Click folder toggle elements
    document.querySelectorAll('.folder-toggle, .tree-toggle, [data-folder-toggle]').forEach(toggle => {
      const parent = toggle.closest('.folder-item, .directory, [data-type="folder"]');
      if (parent && parent.classList.contains('collapsed')) {
        console.log('   ↳ Clicking toggle for:', (parent as HTMLElement).getAttribute('data-name'));
        (toggle as HTMLElement).click();
      }
    });
    
    // ✅ Method 8: Use fileExplorer API if available
    if ((window as any).fileExplorer?.expandAll) {
      console.log('   ↳ Using fileExplorer.expandAll()');
      (window as any).fileExplorer.expandAll();
    }
    
    // ✅ Method 9: Trigger refresh on file tree
    if ((window as any).fileExplorer?.refresh) {
      // Don't call refresh as it might reset the tree
      // (window as any).fileExplorer.refresh();
    }
    
    console.log('✅ [FolderExpansionFix] Folders expanded');
  }
  
  /**
   * Count visible files
   */
  function countVisibleFiles(): number {
    const items = document.querySelectorAll('.file-tree .file-item, .file-tree [data-path]:not(.folder-item)');
    let visible = 0;
    items.forEach(item => {
      const el = item as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        visible++;
      }
    });
    return visible;
  }
  
  /**
   * Handle project creation events
   */
  function setupEventListeners(): void {
    // After project-opened event
    document.addEventListener('project-opened', () => {
      console.log('📂 [FolderExpansionFix] project-opened event detected');
      
      // Expand folders after a short delay to ensure rendering is complete
      setTimeout(expandAllFolders, 100);
      setTimeout(expandAllFolders, 300);
      setTimeout(expandAllFolders, 500);
      setTimeout(expandAllFolders, 1000);
      
      // Check if files are visible
      setTimeout(() => {
        const visible = countVisibleFiles();
        console.log(`📂 [FolderExpansionFix] Visible files after expansion: ${visible}`);
        
        if (visible < 8) {
          console.warn('⚠️ [FolderExpansionFix] Few files visible, trying force expansion...');
          forceExpandAllFolders();
        }
      }, 1500);
    });
    
    // After project-created event
    document.addEventListener('project-created', () => {
      console.log('📂 [FolderExpansionFix] project-created event detected');
      
      // Wait for rendering then expand
      setTimeout(expandAllFolders, 500);
      setTimeout(expandAllFolders, 1000);
      setTimeout(expandAllFolders, 2000);
    });
    
    // After folder-structure-loaded event
    document.addEventListener('folder-structure-loaded', () => {
      console.log('📂 [FolderExpansionFix] folder-structure-loaded event detected');
      setTimeout(expandAllFolders, 200);
      setTimeout(expandAllFolders, 500);
    });
    
    // ✅ NEW: After IDE state restored (page refresh/reset)
    document.addEventListener('ide-state-restored', () => {
      console.log('📂 [FolderExpansionFix] ide-state-restored event detected');
      setTimeout(expandAllFolders, 300);
      setTimeout(expandAllFolders, 700);
      setTimeout(expandAllFolders, 1500);
    });
  }
  
  /**
   * Force expand by modifying CSS directly
   */
  function forceExpandAllFolders(): void {
    console.log('📂 [FolderExpansionFix] Force expanding...');
    
    // Add CSS to force show all items
    let style = document.getElementById('folder-expansion-fix-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'folder-expansion-fix-style';
      style.textContent = `
        .file-tree .file-item,
        .file-tree .folder-item,
        .file-tree [data-path] {
          display: flex !important;
          visibility: visible !important;
        }
        .file-tree .folder-contents,
        .file-tree .folder-children,
        .file-tree .tree-children {
          display: block !important;
          visibility: visible !important;
          height: auto !important;
          overflow: visible !important;
        }
      `;
      document.head.appendChild(style);
      console.log('✅ [FolderExpansionFix] Force expand CSS added');
    }
    
    // Remove after 3 seconds to allow normal collapse/expand
    setTimeout(() => {
      style?.remove();
      console.log('📂 [FolderExpansionFix] Force expand CSS removed');
    }, 3000);
  }
  
  // Initialize
  setupEventListeners();
  
  // Also expand on initial load if project is already open
  setTimeout(() => {
    const projectPath = localStorage.getItem('currentProjectPath');
    if (projectPath) {
      console.log('📂 [FolderExpansionFix] Project already open, expanding folders...');
      expandAllFolders();
    }
  }, 1000);
  
  // ✅ NEW: Additional expansion attempts after page load (for IDE reset)
  setTimeout(() => {
    const projectPath = localStorage.getItem('currentProjectPath') || 
                        (window as any).__currentProjectPath;
    if (projectPath) {
      console.log('📂 [FolderExpansionFix] Delayed expansion check (1.5s)...');
      const visible = countVisibleFiles();
      console.log(`📂 [FolderExpansionFix] Currently visible files: ${visible}`);
      
      // If we have a project but few visible files, force expand
      if (visible < 5) {
        console.log('📂 [FolderExpansionFix] Few files visible, forcing expansion...');
        expandAllFolders();
        forceExpandAllFolders();
      }
    }
  }, 1500);
  
  // ✅ NEW: Final expansion attempt at 3 seconds
  setTimeout(() => {
    const projectPath = localStorage.getItem('currentProjectPath') || 
                        (window as any).__currentProjectPath;
    if (projectPath) {
      const visible = countVisibleFiles();
      if (visible < 5) {
        console.log('📂 [FolderExpansionFix] Final expansion attempt (3s)...');
        expandAllFolders();
        forceExpandAllFolders();
      }
    }
  }, 3000);
  
  // Export for manual use
  (window as any).folderExpansionFix = {
    expand: expandAllFolders,
    forceExpand: forceExpandAllFolders,
    countVisible: countVisibleFiles
  };
  
  console.log('✅ [FolderExpansionFix] Ready');
  console.log('   Use window.folderExpansionFix.expand() to manually expand folders');
})();

// ============================================================================
// ADDITIONAL FIX: Force expand on any file tree DOM change
// ============================================================================

// Watch for file tree changes and force expansion
const observer = new MutationObserver(() => {
  const isNewProject = (window as any).__autoExpandNewProject || 
                       (window as any).__newProjectGracePeriod;
  if (isNewProject) {
    // Force show all folder children
    document.querySelectorAll('.folder-children, div[style*="margin-left"]').forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });
  }
});

// Start observing when file tree exists
const waitForTree = setInterval(() => {
  const fileTree = document.querySelector('.file-tree');
  if (fileTree) {
    clearInterval(waitForTree);
    observer.observe(fileTree, { childList: true, subtree: true });
    console.log('✅ [FolderExpansionFix] MutationObserver watching file tree');
  }
}, 100);

// Set flag for new projects
document.addEventListener('project-created', () => {
  (window as any).__autoExpandNewProject = true;
  setTimeout(() => {
    (window as any).__autoExpandNewProject = false;
  }, 10000);
});
