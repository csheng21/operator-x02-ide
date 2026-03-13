// folderFileToggle.ts - Click chevron to hide/show files in folders
// Fixed to work with .file-item.folder-item structure
// Now with smooth animations!

type AnimationType = 'slide' | 'fade' | 'scale' | 'stagger' | 'accordion';

export class FolderFileToggle {
  // Track which folders have files hidden
  private collapsedFolders = new Set<string>();
  
  // Animation settings
  private animationType: AnimationType = 'stagger';
  private animationDuration: number = 200; // ms
  private staggerDelay: number = 30; // ms between each item
  
  public init(): void {
    console.log('[FolderToggle] Initializing folder file toggle...');
    
    // Add click handlers to folders
    this.setupFolderHandlers();
    
    // Watch for new folders
    this.observeNewFolders();
    
    // Add styles
    this.addStyles();
  }
  
  /**
   * Set animation type
   * Options: 'slide' | 'fade' | 'scale' | 'stagger' | 'accordion'
   */
  public setAnimation(type: AnimationType, duration?: number): void {
    this.animationType = type;
    if (duration) this.animationDuration = duration;
    console.log(`[FolderToggle] Animation set to: ${type} (${this.animationDuration}ms)`);
  }

  /**
   * Set up click handlers for all folders
   */
  private setupFolderHandlers(): void {
    // Process existing folders
    this.attachHandlers();
    
    // Re-attach periodically for dynamically added folders
    setInterval(() => this.attachHandlers(), 2000);
  }

  /**
   * Check if element is part of Quick Access Panel
   */
  private isQuickAccessElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    return !!(
      element.classList.contains('qa-folder-item') ||
      element.classList.contains('quick-access-panel') ||
      element.classList.contains('qa-recent-list') ||
      element.closest('.quick-access-panel') ||
      element.closest('.qa-recent-list') ||
      element.closest('.qa-folder-item') ||
      Array.from(element.classList).some(cls => cls.startsWith('qa-'))
    );
  }

  /**
   * Attach handlers to folders
   */
  private attachHandlers(): void {
    // Target the actual folder elements in file explorer
    const folders = document.querySelectorAll(
      '.file-item.folder-item:not([data-toggle-attached]), ' +
      '.file-item.directory:not([data-toggle-attached]), ' +
      '.directory:not([data-toggle-attached])'
    );

    folders.forEach(folder => {
      const folderElement = folder as HTMLElement;
      
      // Skip Quick Access Panel items
      if (this.isQuickAccessElement(folderElement)) {
        return;
      }
      
      // Mark as processed
      folderElement.dataset.toggleAttached = 'true';
      
      // Get folder path as identifier
      const folderPath = folderElement.dataset.path || folderElement.getAttribute('data-path') || '';
      if (!folderPath) return;
      
      // Add or update chevron
      this.addChevron(folderElement, folderPath);
      
      // Restore collapsed state if previously collapsed
      if (this.collapsedFolders.has(folderPath)) {
        this.hideFolderChildren(folderPath, folderElement, false);
      }
    });
  }

  /**
   * Add clickable chevron to folder
   */
  private addChevron(folderElement: HTMLElement, folderPath: string): void {
    // Check if chevron already exists
    let chevron = folderElement.querySelector('.folder-toggle-chevron') as HTMLElement;
    
    if (!chevron) {
      chevron = document.createElement('span');
      chevron.className = 'folder-toggle-chevron';
      chevron.innerHTML = '▼';
      chevron.title = 'Click to collapse/expand';
      
      // Insert at the beginning
      const firstChild = folderElement.firstChild;
      if (firstChild) {
        folderElement.insertBefore(chevron, firstChild);
      } else {
        folderElement.appendChild(chevron);
      }
    }
    
    // Update chevron state
    const isCollapsed = this.collapsedFolders.has(folderPath);
    chevron.innerHTML = isCollapsed ? '▶' : '▼';
    chevron.classList.toggle('collapsed', isCollapsed);
    
    // Add click handler to chevron only
    chevron.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.toggleFolder(folderPath, folderElement);
    };
  }

  /**
   * Toggle folder children visibility
   */
  private toggleFolder(folderPath: string, folderElement: HTMLElement): void {
    const isCollapsed = this.collapsedFolders.has(folderPath);
    
    if (isCollapsed) {
      // Expand - show children
      this.collapsedFolders.delete(folderPath);
      this.showFolderChildren(folderPath, folderElement);
    } else {
      // Collapse - hide children
      this.collapsedFolders.add(folderPath);
      this.hideFolderChildren(folderPath, folderElement);
    }
    
    // Update chevron
    const chevron = folderElement.querySelector('.folder-toggle-chevron') as HTMLElement;
    if (chevron) {
      chevron.innerHTML = this.collapsedFolders.has(folderPath) ? '▶' : '▼';
      chevron.classList.toggle('collapsed', this.collapsedFolders.has(folderPath));
    }
    
    // Update folder class
    folderElement.classList.toggle('children-hidden', this.collapsedFolders.has(folderPath));
    
    console.log(`[FolderToggle] ${this.collapsedFolders.has(folderPath) ? 'Collapsed' : 'Expanded'}: ${folderPath}`);
  }

  /**
   * Hide all children of a folder with animation
   */
  private hideFolderChildren(folderPath: string, folderElement: HTMLElement, animate: boolean = true): void {
    const children = this.getFolderChildren(folderPath);
    
    if (!animate) {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
      });
      folderElement.classList.add('children-hidden');
      return;
    }
    
    // Apply animation based on type
    switch (this.animationType) {
      case 'stagger':
        this.animateStaggerHide(children, folderElement);
        break;
      case 'slide':
        this.animateSlideHide(children, folderElement);
        break;
      case 'scale':
        this.animateScaleHide(children, folderElement);
        break;
      case 'accordion':
        this.animateAccordionHide(children, folderElement);
        break;
      case 'fade':
      default:
        this.animateFadeHide(children, folderElement);
        break;
    }
  }

  /**
   * Show all children of a folder with animation
   */
  private showFolderChildren(folderPath: string, folderElement: HTMLElement): void {
    const children = this.getFolderChildren(folderPath);
    
    // First make them visible but transparent
    children.forEach(child => {
      child.style.display = '';
      child.classList.remove('folder-child-hidden');
    });
    
    folderElement.classList.remove('children-hidden');
    
    // Apply animation based on type
    switch (this.animationType) {
      case 'stagger':
        this.animateStaggerShow(children);
        break;
      case 'slide':
        this.animateSlideShow(children);
        break;
      case 'scale':
        this.animateScaleShow(children);
        break;
      case 'accordion':
        this.animateAccordionShow(children);
        break;
      case 'fade':
      default:
        this.animateFadeShow(children);
        break;
    }
  }
  
  // ═══════════════════════════════════════════
  // ANIMATION METHODS - HIDE
  // ═══════════════════════════════════════════
  
  private animateFadeHide(children: HTMLElement[], folderElement: HTMLElement): void {
    children.forEach(child => {
      child.style.transition = `opacity ${this.animationDuration}ms ease`;
      child.style.opacity = '0';
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
      });
      folderElement.classList.add('children-hidden');
    }, this.animationDuration);
  }
  
  private animateSlideHide(children: HTMLElement[], folderElement: HTMLElement): void {
    children.forEach(child => {
      child.style.transition = `all ${this.animationDuration}ms ease`;
      child.style.opacity = '0';
      child.style.transform = 'translateX(-20px)';
      child.style.maxHeight = '0';
      child.style.overflow = 'hidden';
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
        child.style.transform = '';
        child.style.maxHeight = '';
      });
      folderElement.classList.add('children-hidden');
    }, this.animationDuration);
  }
  
  private animateScaleHide(children: HTMLElement[], folderElement: HTMLElement): void {
    children.forEach(child => {
      child.style.transition = `all ${this.animationDuration}ms ease`;
      child.style.opacity = '0';
      child.style.transform = 'scale(0.8)';
      child.style.transformOrigin = 'left center';
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
        child.style.transform = '';
      });
      folderElement.classList.add('children-hidden');
    }, this.animationDuration);
  }
  
  private animateStaggerHide(children: HTMLElement[], folderElement: HTMLElement): void {
    // Reverse order for hide (bottom to top)
    const reversedChildren = [...children].reverse();
    
    reversedChildren.forEach((child, index) => {
      setTimeout(() => {
        child.style.transition = `all ${this.animationDuration}ms ease`;
        child.style.opacity = '0';
        child.style.transform = 'translateX(-10px) scale(0.95)';
      }, index * this.staggerDelay);
    });
    
    const totalTime = (children.length * this.staggerDelay) + this.animationDuration;
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
        child.style.transform = '';
      });
      folderElement.classList.add('children-hidden');
    }, totalTime);
  }
  
  private animateAccordionHide(children: HTMLElement[], folderElement: HTMLElement): void {
    // Wrap children in a container for height animation
    children.forEach(child => {
      const height = child.offsetHeight;
      child.style.maxHeight = height + 'px';
      child.style.overflow = 'hidden';
      child.style.transition = `all ${this.animationDuration}ms ease`;
      
      requestAnimationFrame(() => {
        child.style.maxHeight = '0';
        child.style.opacity = '0';
        child.style.paddingTop = '0';
        child.style.paddingBottom = '0';
        child.style.marginTop = '0';
        child.style.marginBottom = '0';
      });
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.display = 'none';
        child.classList.add('folder-child-hidden');
        child.style.maxHeight = '';
        child.style.overflow = '';
        child.style.paddingTop = '';
        child.style.paddingBottom = '';
        child.style.marginTop = '';
        child.style.marginBottom = '';
      });
      folderElement.classList.add('children-hidden');
    }, this.animationDuration);
  }
  
  // ═══════════════════════════════════════════
  // ANIMATION METHODS - SHOW
  // ═══════════════════════════════════════════
  
  private animateFadeShow(children: HTMLElement[]): void {
    children.forEach(child => {
      child.style.opacity = '0';
      child.style.transition = `opacity ${this.animationDuration}ms ease`;
      
      requestAnimationFrame(() => {
        child.style.opacity = '1';
      });
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.transition = '';
      });
    }, this.animationDuration);
  }
  
  private animateSlideShow(children: HTMLElement[]): void {
    children.forEach(child => {
      child.style.opacity = '0';
      child.style.transform = 'translateX(-20px)';
      child.style.transition = `all ${this.animationDuration}ms ease`;
      
      requestAnimationFrame(() => {
        child.style.opacity = '1';
        child.style.transform = 'translateX(0)';
      });
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.transition = '';
        child.style.transform = '';
      });
    }, this.animationDuration);
  }
  
  private animateScaleShow(children: HTMLElement[]): void {
    children.forEach(child => {
      child.style.opacity = '0';
      child.style.transform = 'scale(0.8)';
      child.style.transformOrigin = 'left center';
      child.style.transition = `all ${this.animationDuration}ms ease`;
      
      requestAnimationFrame(() => {
        child.style.opacity = '1';
        child.style.transform = 'scale(1)';
      });
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.transition = '';
        child.style.transform = '';
      });
    }, this.animationDuration);
  }
  
  private animateStaggerShow(children: HTMLElement[]): void {
    children.forEach((child, index) => {
      child.style.opacity = '0';
      child.style.transform = 'translateX(-10px) scale(0.95)';
      
      setTimeout(() => {
        child.style.transition = `all ${this.animationDuration}ms ease`;
        child.style.opacity = '1';
        child.style.transform = 'translateX(0) scale(1)';
      }, index * this.staggerDelay);
    });
    
    const totalTime = (children.length * this.staggerDelay) + this.animationDuration;
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.transition = '';
        child.style.transform = '';
      });
    }, totalTime);
  }
  
  private animateAccordionShow(children: HTMLElement[]): void {
    children.forEach(child => {
      child.style.maxHeight = '0';
      child.style.opacity = '0';
      child.style.overflow = 'hidden';
      child.style.transition = `all ${this.animationDuration}ms ease`;
      
      requestAnimationFrame(() => {
        child.style.maxHeight = '50px'; // Approximate row height
        child.style.opacity = '1';
      });
    });
    
    setTimeout(() => {
      children.forEach(child => {
        child.style.maxHeight = '';
        child.style.overflow = '';
        child.style.transition = '';
      });
    }, this.animationDuration);
  }

  /**
   * Get all direct children of a folder by path
   */
  private getFolderChildren(folderPath: string): HTMLElement[] {
    const children: HTMLElement[] = [];
    
    // Normalize path separators
    const normalizedPath = folderPath.replace(/\\/g, '\\');
    
    // Find all file items whose path starts with this folder path
    const allItems = document.querySelectorAll('.file-item[data-path]');
    
    allItems.forEach(item => {
      const itemPath = item.getAttribute('data-path') || '';
      
      // Check if this item is a direct child of the folder
      // Direct child: folderPath\itemName (no additional path separators)
      if (itemPath.startsWith(folderPath) && itemPath !== folderPath) {
        // Get the remaining path after folder
        const remaining = itemPath.substring(folderPath.length);
        
        // Remove leading separator
        const cleanRemaining = remaining.replace(/^[\\\/]/, '');
        
        // Direct child has no more separators
        const isDirectChild = !cleanRemaining.includes('\\') && !cleanRemaining.includes('/');
        
        if (isDirectChild) {
          children.push(item as HTMLElement);
        }
      }
    });
    
    return children;
  }

  /**
   * Observe for new folders
   */
  private observeNewFolders(): void {
    const observer = new MutationObserver(() => {
      this.attachHandlers();
    });

    // Observe file explorer areas
    const containers = document.querySelectorAll('#files-content, .file-tree, #file-tree');
    containers.forEach(container => {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    });
  }

  /**
   * Add styles
   */
  private addStyles(): void {
    if (document.getElementById('folder-toggle-styles')) return;

    const style = document.createElement('style');
    style.id = 'folder-toggle-styles';
    style.textContent = `
      /* Chevron styling */
      .folder-toggle-chevron {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-right: 2px;
        cursor: pointer;
        color: #888;
        font-size: 10px;
        transition: transform 0.2s ease, color 0.2s;
        user-select: none;
        flex-shrink: 0;
      }
      
      .folder-toggle-chevron:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      
      .folder-toggle-chevron.collapsed {
        transform: rotate(0deg);
      }
      
      /* Hidden children */
      .folder-child-hidden {
        display: none !important;
      }
      
      /* Folder with hidden children indicator */
      .children-hidden {
        opacity: 0.95;
      }
      
      /* Smooth base transitions for file items */
      .file-item {
        will-change: transform, opacity;
      }
      
      /* Exclude Quick Access Panel */
      .quick-access-panel .folder-toggle-chevron,
      .qa-folder-item .folder-toggle-chevron {
        display: none !important;
      }
      
      /* Chevron rotation animation */
      .folder-item .folder-toggle-chevron,
      .directory .folder-toggle-chevron {
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .folder-item.children-hidden .folder-toggle-chevron,
      .directory.children-hidden .folder-toggle-chevron {
        transform: rotate(-90deg);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Expand all folders
   */
  public expandAll(): void {
    this.collapsedFolders.forEach(folderPath => {
      const folderElement = document.querySelector(`.file-item[data-path="${CSS.escape(folderPath)}"]`) as HTMLElement;
      if (folderElement) {
        this.toggleFolder(folderPath, folderElement);
      }
    });
    console.log('[FolderToggle] Expanded all folders');
  }

  /**
   * Collapse all folders
   */
  public collapseAll(): void {
    const folders = document.querySelectorAll('.file-item.folder-item[data-path], .file-item.directory[data-path]');
    folders.forEach(folder => {
      const folderElement = folder as HTMLElement;
      const folderPath = folderElement.dataset.path || '';
      
      if (folderPath && !this.collapsedFolders.has(folderPath) && !this.isQuickAccessElement(folderElement)) {
        this.collapsedFolders.add(folderPath);
        this.hideFolderChildren(folderPath, folderElement, false);
        
        const chevron = folderElement.querySelector('.folder-toggle-chevron') as HTMLElement;
        if (chevron) {
          chevron.innerHTML = '▶';
          chevron.classList.add('collapsed');
        }
        folderElement.classList.add('children-hidden');
      }
    });
    console.log('[FolderToggle] Collapsed all folders');
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    document.getElementById('folder-toggle-styles')?.remove();
    this.collapsedFolders.clear();
    console.log('[FolderToggle] Cleaned up');
  }
}

// Auto-initialize
const folderToggle = new FolderFileToggle();
folderToggle.init();

// Make globally accessible
(window as any).folderToggle = folderToggle;

console.log('[FolderToggle] Click ▼/▶ chevron to hide/show folder contents');
console.log('[FolderToggle] Commands:');
console.log('  folderToggle.collapseAll()');
console.log('  folderToggle.expandAll()');
console.log('  folderToggle.setAnimation("stagger")  // Options: slide, fade, scale, stagger, accordion');

export default FolderFileToggle;
