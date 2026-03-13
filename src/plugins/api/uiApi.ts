// src/plugins/api/uiApi.ts

export class UiApi {
  private commands: Map<string, { title: string, callback: () => void }> = new Map();
  private views: Map<string, () => HTMLElement> = new Map();
  
  constructor() {
    console.log('UI API initialized');
  }
  
  showNotification(options: any): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#333';
    notification.style.color = '#eee';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    
    // Set color based on type
    if (options.type === 'error') {
      notification.style.backgroundColor = '#d32f2f';
    } else if (options.type === 'warning') {
      notification.style.backgroundColor = '#f57c00';
    } else if (options.type === 'success') {
      notification.style.backgroundColor = '#388e3c';
    }
    
    // Add title if provided
    let content = '';
    if (options.title) {
      content += `<div style="font-weight:bold;margin-bottom:5px;">${options.title}</div>`;
    }
    
    // Add message
    content += `<div>${options.message}</div>`;
    
    // Add actions if provided
    if (options.actions && options.actions.length > 0) {
      content += '<div style="margin-top:10px;display:flex;gap:10px;">';
      options.actions.forEach((action: any, index: number) => {
        content += `<button id="action-${index}" style="padding:5px 10px;background:#444;color:#eee;border:none;border-radius:3px;cursor:pointer;">${action.title}</button>`;
      });
      content += '</div>';
    }
    
    notification.innerHTML = content;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add action event listeners
    if (options.actions && options.actions.length > 0) {
      options.actions.forEach((action: any, index: number) => {
        const btn = document.getElementById(`action-${index}`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (action.action) action.action();
            document.body.removeChild(notification);
          });
        }
      });
    }
    
    // Remove after specified duration
    if (options.duration !== 0) {
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, options.duration || 5000);
    }
  }
  
  registerCommand(id: string, title: string, callback: () => void): void {
    this.commands.set(id, { title, callback });
    console.log(`Registered command: ${id} - ${title}`);
  }
  
  executeCommand(id: string): void {
    const command = this.commands.get(id);
    if (command) {
      command.callback();
    } else {
      console.error(`Command not found: ${id}`);
    }
  }
  
  registerView(id: string, createView: () => HTMLElement): void {
    this.views.set(id, createView);
    console.log(`Registered view: ${id}`);
  }
  
  showView(id: string): void {
    const createView = this.views.get(id);
    if (!createView) {
      console.error(`View not found: ${id}`);
      return;
    }
    
    // Create a modal to display the view
    const modal = document.createElement('div');
    modal.className = 'plugin-view-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    // Create view container
    const container = document.createElement('div');
    container.style.backgroundColor = '#252525';
    container.style.borderRadius = '5px';
    container.style.width = '80%';
    container.style.height = '80%';
    container.style.maxWidth = '1000px';
    container.style.maxHeight = '800px';
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#999';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '1';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Create view content
    const content = createView();
    content.style.flex = '1';
    content.style.overflow = 'auto';
    
    // Assemble modal
    container.appendChild(closeBtn);
    container.appendChild(content);
    modal.appendChild(container);
    
    // Add to document
    document.body.appendChild(modal);
  }
  
  openUrl(url: string): void {
    window.open(url, '_blank');
  }
}