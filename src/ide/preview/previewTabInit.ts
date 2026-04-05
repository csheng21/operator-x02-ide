import { setupPreviewAutoDetection, openPreviewTab, parseTerminalForServerUrl, previewTab } from '../preview/PreviewTab';
// ============================================================
// previewTabInit.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// initializePreviewTab
// ============================================================

// ============================================================================
export function initializePreviewTab(): void {
  console.log('?? Initializing Preview Tab system...');
  
  try {
    setupPreviewAutoDetection();
    
    // Ctrl+Shift+P shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const lastUrl = (window as any).__lastServerUrl || 'http://localhost:3000';
        openPreviewTab(lastUrl);
      }
    });
    
    // Auto-open on server start
    window.addEventListener('server-url-detected', ((e: CustomEvent) => {
      const url = e.detail?.url;
      if (url) {
        (window as any).__lastServerUrl = url;
        setTimeout(() => openPreviewTab(url), 500);
      }
    }) as EventListener);
    
    (window as any).previewTab = { open: openPreviewTab, instance: previewTab };
    console.log('? Preview Tab initialized (Ctrl+Shift+P)');
  } catch (error) {
    console.error('? Preview Tab init failed:', error);
  }
}

