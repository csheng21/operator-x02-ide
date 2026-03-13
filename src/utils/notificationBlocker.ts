// src/utils/notificationBlocker.ts
export class NotificationBlocker {
  private static instance: NotificationBlocker;
  private observer: MutationObserver;
  
  private constructor() {
    this.setupBlocker();
  }
  
  static getInstance(): NotificationBlocker {
    if (!NotificationBlocker.instance) {
      NotificationBlocker.instance = new NotificationBlocker();
    }
    return NotificationBlocker.instance;
  }
  
  private setupBlocker(): void {
    // Block showNotification
    this.overrideShowNotification();
    
    // Monitor DOM
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Periodic cleanup
    setInterval(() => this.cleanupLoadingNotifications(), 500);
    
    console.log('NotificationBlocker active');
  }
  
  private overrideShowNotification(): void {
    const original = (window as any).showNotification;
    (window as any).showNotification = (message: string, type?: string) => {
      if (this.shouldBlock(message)) {
        console.log('Blocked:', message);
        return null;
      }
      return original ? original(message, type) : null;
    };
  }
  
  private shouldBlock(message: string): boolean {
    const blockedPhrases = [
      'loading folder',
      'loading contents',
      'folder contents',
      'opening folder'
    ];
    
    const msg = message?.toLowerCase() || '';
    return blockedPhrases.some(phrase => msg.includes(phrase));
  }
  
  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const el = node as HTMLElement;
          if (this.isLoadingNotification(el)) {
            el.remove();
          }
        }
      });
    });
  }
  
  private isLoadingNotification(el: HTMLElement): boolean {
    const text = el.textContent?.toLowerCase() || '';
    return text === 'loading folder contents...' ||
           text === 'loading folder contents' ||
           (text.includes('loading') && text.includes('folder'));
  }
  
  private cleanupLoadingNotifications(): void {
    const selectors = [
      '.notification',
      '.toast', 
      '.modal',
      '[role="alert"]',
      '[role="status"]',
      'div[style*="position: fixed"]',
      'div[style*="z-index: 9"]'
    ];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (this.isLoadingNotification(el as HTMLElement)) {
          el.remove();
        }
      });
    });
  }
  
  public forceCleanup(): void {
    this.cleanupLoadingNotifications();
    
    // More aggressive cleanup
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim();
      if (text === 'Loading folder contents...' || 
          text === 'Loading folder contents') {
        el.remove();
      }
    });
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  NotificationBlocker.getInstance();
  
  // Export for global access
  (window as any).notificationBlocker = NotificationBlocker.getInstance();
}