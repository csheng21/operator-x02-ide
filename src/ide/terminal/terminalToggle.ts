// src/ide/terminal/terminalToggle.ts - Fixed with better DOM targeting

interface TerminalState {
  isCollapsed: boolean;
  originalHeight: string;
  minimizedHeight: string;
}

class TerminalToggleManager {
  private state: TerminalState = {
    isCollapsed: false,
    originalHeight: '300px',
    minimizedHeight: '28px'
  };

  private terminalContainer: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private terminalContent: HTMLElement | null = null;

  constructor() {
    // Initialize after a short delay to ensure DOM is ready
    setTimeout(() => this.initializeToggle(), 200);
  }

  private initializeToggle(): void {
    this.setupToggleElements();
  }

  private setupToggleElements(): void {
    console.log('Setting up terminal toggle elements...');
    
    // Find the terminal container with multiple fallbacks
    this.terminalContainer = this.findTerminalContainer();
    console.log('Found terminal container:', this.terminalContainer);
    
    // Find terminal content
    this.terminalContent = document.querySelector('.terminal-output') ||
                          document.querySelector('.integrated-terminal');

    // Look for existing toggle button or create one
    this.toggleButton = this.findOrCreateToggleButton();
    console.log('Found/created toggle button:', this.toggleButton);

    if (this.toggleButton && this.terminalContainer) {
      this.setupToggleButton();
      this.updateArrowIcon();
      this.loadTerminalState();
      console.log('Terminal toggle setup complete');
    } else {
      console.warn('Could not set up terminal toggle - missing elements');
    }
  }

  private findTerminalContainer(): HTMLElement | null {
    // Try multiple selectors to find the terminal container
    const selectors = [
      '.terminal-panel',
      '.terminal-container', 
      '#terminal-content',
      '[class*="terminal"]',
      // Look for TERMINAL tab content
      '.tab-content.active', // If terminal tab is active
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        console.log(`Found terminal container with selector: ${selector}`);
        return element;
      }
    }

    // Look for any element containing terminal output
    const terminalOutput = document.querySelector('#terminal-output');
    if (terminalOutput) {
      let parent = terminalOutput.parentElement;
      while (parent && parent !== document.body) {
        if (parent.offsetHeight > 100) { // Reasonable height for terminal container
          console.log('Found terminal container as parent of terminal-output');
          return parent;
        }
        parent = parent.parentElement;
      }
    }

    console.warn('Could not find terminal container');
    return null;
  }

  private findOrCreateToggleButton(): HTMLElement | null {
    // Look for existing toggle button
    let button = document.querySelector('.terminal-toggle') as HTMLElement;
    
    if (!button) {
      console.log('Creating new toggle button');
      button = this.createToggleButton();
    } else {
      console.log('Found existing toggle button');
    }

    return button;
  }

  private createToggleButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = 'terminal-toggle';
    button.innerHTML = '&#8593;'; // Up arrow
    button.title = 'Collapse Terminal';
    
    // Style the button
    this.styleToggleButton(button);

    // Find where to insert the button - be more flexible
    const insertionPoint = this.findButtonInsertionPoint();
    if (insertionPoint) {
      insertionPoint.appendChild(button);
      console.log('Inserted toggle button into:', insertionPoint);
    } else {
      console.warn('Could not find insertion point for toggle button');
    }

    return button;
  }

  private findButtonInsertionPoint(): HTMLElement | null {
    // Try to find terminal header
    let header = document.querySelector('.terminal-header') as HTMLElement;
    if (header) {
      return header;
    }

    // Try to find or create a header
    if (this.terminalContainer) {
      // Look for any header-like element in the container
      const possibleHeaders = this.terminalContainer.querySelectorAll('div');
      for (const div of possibleHeaders) {
        const style = getComputedStyle(div);
        if (style.display === 'flex' && div.offsetHeight < 50) {
          console.log('Found potential header element');
          return div as HTMLElement;
        }
      }

      // Create a header if none exists
      header = this.createTerminalHeader();
      return header;
    }

    return null;
  }

  private createTerminalHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'terminal-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background-color: rgba(0, 0, 0, 0.15);
      border-bottom: 1px solid #333;
      flex-shrink: 0;
      height: 28px;
      min-height: 28px;
      max-height: 28px;
      box-sizing: border-box;
      position: relative;
    `;

    const title = document.createElement('span');
    title.className = 'terminal-title';
    title.textContent = 'Terminal';
    title.style.cssText = `
      font-size: 11px;
      font-weight: 500;
      color: #cccccc;
      user-select: none;
    `;

    header.appendChild(title);

    // Insert header at the top of terminal container
    if (this.terminalContainer) {
      this.terminalContainer.insertBefore(header, this.terminalContainer.firstChild);
      console.log('Created and inserted terminal header');
    }

    return header;
  }

  private styleToggleButton(button: HTMLElement): void {
    button.style.cssText = `
      width: 20px;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
      color: #cccccc;
      transition: all 0.3s ease;
      user-select: none;
      z-index: 1000;
      position: relative;
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.4)';
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      const isCollapsed = this.state.isCollapsed;
      button.style.background = isCollapsed ? 'rgba(100, 221, 23, 0.3)' : 'rgba(255, 255, 255, 0.1)';
      button.style.borderColor = isCollapsed ? 'rgba(100, 221, 23, 0.5)' : 'rgba(255, 255, 255, 0.2)';
      button.style.transform = 'scale(1)';
    });
  }

  private setupToggleButton(): void {
    if (!this.toggleButton) return;

    console.log('Setting up toggle button click handler');

    // Remove any existing click listeners by cloning
    const newButton = this.toggleButton.cloneNode(true) as HTMLElement;
    this.toggleButton.parentNode?.replaceChild(newButton, this.toggleButton);
    this.toggleButton = newButton;

    // Re-apply styling since we cloned the button
    this.styleToggleButton(this.toggleButton);

    // Add click handler
    this.toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Toggle button clicked!');
      this.toggleTerminal();
    });
  }

  private toggleTerminal(): void {
    if (!this.terminalContainer) {
      console.warn('Cannot toggle terminal - no container found');
      return;
    }

    this.state.isCollapsed = !this.state.isCollapsed;
    console.log('Toggling terminal - collapsed:', this.state.isCollapsed);
    
    if (this.state.isCollapsed) {
      this.collapseTerminal();
    } else {
      this.expandTerminal();
    }

    this.updateArrowIcon();
    this.saveTerminalState();
  }

  private collapseTerminal(): void {
    if (!this.terminalContainer) return;

    console.log('Collapsing terminal');

    // Store original height if not already stored
    const currentHeight = this.terminalContainer.style.height || 
                         getComputedStyle(this.terminalContainer).height;
    
    if (currentHeight && currentHeight !== this.state.minimizedHeight) {
      this.state.originalHeight = currentHeight;
      console.log('Stored original height:', this.state.originalHeight);
    }

    // Animate collapse
    this.terminalContainer.style.transition = 'height 0.3s ease, min-height 0.3s ease';
    this.terminalContainer.style.height = this.state.minimizedHeight;
    this.terminalContainer.style.minHeight = this.state.minimizedHeight;
    this.terminalContainer.style.overflow = 'hidden';

    // Hide terminal content with more selectors
    const elementsToHide = [
      '.terminal-output',
      '.terminal-input-container',
      '.integrated-terminal',
      '#terminal-output',
      'textarea.terminal-input',
      '.cmd-indicator'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const el = element as HTMLElement;
        el.style.transition = 'opacity 0.2s ease';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      });
    });

    // Add collapsed class
    this.terminalContainer.classList.add('terminal-collapsed');
  }

  private expandTerminal(): void {
    if (!this.terminalContainer) return;

    console.log('Expanding terminal');

    // Animate expand
    this.terminalContainer.style.transition = 'height 0.3s ease, min-height 0.3s ease';
    this.terminalContainer.style.height = this.state.originalHeight;
    this.terminalContainer.style.minHeight = '200px';
    this.terminalContainer.style.overflow = 'hidden';

    // Show terminal content after a short delay
    setTimeout(() => {
      const elementsToShow = [
        '.terminal-output',
        '.terminal-input-container',
        '.integrated-terminal',
        '#terminal-output',
        'textarea.terminal-input',
        '.cmd-indicator'
      ];

      elementsToShow.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const el = element as HTMLElement;
          el.style.transition = 'opacity 0.3s ease';
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        });
      });
    }, 150);

    // Remove collapsed class
    this.terminalContainer.classList.remove('terminal-collapsed');

    // Clean up after animation
    setTimeout(() => {
      if (this.terminalContainer) {
        this.terminalContainer.style.overflow = 'auto';
      }
    }, 300);
  }

  private updateArrowIcon(): void {
    if (!this.toggleButton) return;

    const isCollapsed = this.state.isCollapsed;
    console.log('Updating arrow icon - collapsed:', isCollapsed);
    
    // Update arrow direction
    this.toggleButton.innerHTML = isCollapsed ? '&#8595;' : '&#8593;'; // Down : Up
    
    // Update title/tooltip
    this.toggleButton.title = isCollapsed ? 'Expand Terminal' : 'Collapse Terminal';

    // Update visual state classes
    this.toggleButton.classList.toggle('collapsed', isCollapsed);
    this.toggleButton.classList.toggle('expanded', !isCollapsed);

    // Update background color to indicate state
    if (isCollapsed) {
      this.toggleButton.style.background = 'rgba(100, 221, 23, 0.3)';
      this.toggleButton.style.borderColor = 'rgba(100, 221, 23, 0.5)';
      this.toggleButton.style.color = '#64dd17';
    } else {
      this.toggleButton.style.background = 'rgba(255, 255, 255, 0.1)';
      this.toggleButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      this.toggleButton.style.color = '#cccccc';
    }
  }

  private saveTerminalState(): void {
    try {
      localStorage.setItem('terminalState', JSON.stringify({
        isCollapsed: this.state.isCollapsed,
        originalHeight: this.state.originalHeight
      }));
    } catch (e) {
      console.warn('Could not save terminal state:', e);
    }
  }

  private loadTerminalState(): void {
    try {
      const saved = localStorage.getItem('terminalState');
      if (saved) {
        const state = JSON.parse(saved);
        this.state.isCollapsed = state.isCollapsed || false;
        this.state.originalHeight = state.originalHeight || '300px';
        
        // Apply saved state
        if (this.state.isCollapsed) {
          setTimeout(() => this.collapseTerminal(), 100);
        }
      }
    } catch (e) {
      console.warn('Could not load terminal state:', e);
    }
  }

  // Public methods
  public collapse(): void {
    if (!this.state.isCollapsed) {
      this.toggleTerminal();
    }
  }

  public expand(): void {
    if (this.state.isCollapsed) {
      this.toggleTerminal();
    }
  }

  public isCollapsed(): boolean {
    return this.state.isCollapsed;
  }

  public reinitialize(): void {
    console.log('Reinitializing terminal toggle');
    this.setupToggleElements();
  }

  // Debug method
  public debug(): void {
    console.log('=== Terminal Toggle Debug Info ===');
    console.log('Terminal Container:', this.terminalContainer);
    console.log('Toggle Button:', this.toggleButton);
    console.log('Terminal Content:', this.terminalContent);
    console.log('State:', this.state);
    console.log('=== End Debug Info ===');
  }
}

// Create global instance
const terminalToggle = new TerminalToggleManager();

// Initialize function for external use
export function initializeTerminalToggle(): void {
  console.log('Initializing terminal toggle...');
  
  // Apply CSS
  applyTerminalToggleCSS();
  
  // Reinitialize the toggle manager
  terminalToggle.reinitialize();
  
  // Debug info
  setTimeout(() => {
    terminalToggle.debug();
  }, 500);
}

// Apply CSS styles
function applyTerminalToggleCSS(): void {
  const styleId = 'terminal-toggle-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Terminal Toggle Styles */
      .terminal-toggle {
        width: 20px !important;
        height: 20px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 3px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        font-size: 12px !important;
        color: #cccccc !important;
        transition: all 0.3s ease !important;
        user-select: none !important;
        z-index: 1000 !important;
        position: relative !important;
      }

      .terminal-toggle:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.4) !important;
        transform: scale(1.1) !important;
      }

      .terminal-toggle.collapsed {
        background: rgba(100, 221, 23, 0.3) !important;
        border-color: rgba(100, 221, 23, 0.5) !important;
        color: #64dd17 !important;
      }

      .terminal-toggle.expanded {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
      }

      /* Terminal header styles */
      .terminal-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 4px 8px !important;
        background-color: rgba(0, 0, 0, 0.15) !important;
        border-bottom: 1px solid #333 !important;
        flex-shrink: 0 !important;
        height: 28px !important;
        min-height: 28px !important;
        max-height: 28px !important;
        box-sizing: border-box !important;
        position: relative !important;
      }

      .terminal-title {
        font-size: 11px !important;
        font-weight: 500 !important;
        color: #cccccc !important;
        user-select: none !important;
      }

      /* Terminal collapsed state */
      .terminal-container.terminal-collapsed,
      .terminal-panel.terminal-collapsed,
      #terminal-content.terminal-collapsed,
      [class*="terminal"].terminal-collapsed {
        height: 28px !important;
        min-height: 28px !important;
        max-height: 28px !important;
        overflow: hidden !important;
      }

      .terminal-collapsed .terminal-output,
      .terminal-collapsed .integrated-terminal,
      .terminal-collapsed .terminal-input-container,
      .terminal-collapsed #terminal-output,
      .terminal-collapsed textarea.terminal-input,
      .terminal-collapsed .cmd-indicator {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Ensure header remains visible when collapsed */
      .terminal-collapsed .terminal-header {
        opacity: 1 !important;
        pointer-events: auto !important;
        background: rgba(0, 0, 0, 0.3) !important;
      }

      /* Smooth transitions */
      .terminal-container,
      .terminal-panel,
      #terminal-content,
      [class*="terminal"] {
        transition: height 0.3s ease, min-height 0.3s ease !important;
      }

      .terminal-output,
      .integrated-terminal,
      .terminal-input-container,
      #terminal-output,
      textarea.terminal-input,
      .cmd-indicator {
        transition: opacity 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Export the toggle manager instance
export { terminalToggle };

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTerminalToggle);
} else {
  setTimeout(initializeTerminalToggle, 200);
}