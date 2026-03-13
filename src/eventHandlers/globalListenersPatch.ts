// globalListenersPatch.ts
// PATCH: Prevents PDFs from opening in Monaco editor
// Add this import to your main.ts AFTER the globalListeners import
// ============================================================================

/**
 * Call this function to prevent PDF files from opening in Monaco editor
 * Instead, they will be handled by the PDF handler
 */
export function patchGlobalListenersForPdf(): void {
  console.log('🔧 Patching global file listener for PDF handling...');
  
  // Add a high-priority interceptor that catches PDF files
  document.addEventListener('file-selected', (e) => {
    const detail = (e as CustomEvent).detail;
    
    if (detail?.path) {
      const path = detail.path.toLowerCase();
      
      // Check if it's a PDF
      if (path.endsWith('.pdf')) {
        console.log('📄 Intercepted PDF - preventing Monaco from opening:', detail.path);
        
        // Stop the event from reaching the original handler
        e.stopImmediatePropagation();
        
        // Show the PDF in our viewer instead
        if ((window as any).pdfHandler?.viewPdf) {
          // Find the PDF by path
          const pdfs = (window as any).pdfHandler.uploadedPdfs || [];
          const pdf = pdfs.find((p: any) => p.path === detail.path || p.name === detail.path);
          if (pdf) {
            (window as any).pdfHandler.viewPdf(pdf.id);
          }
        }
        
        return;
      }
      
      // Also prevent other binary files from opening in Monaco
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', 
                                '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
                                '.zip', '.rar', '.7z', '.tar', '.gz',
                                '.exe', '.dll', '.so', '.dylib',
                                '.doc', '.xls', '.ppt']; // Office files without 'x' extension
      
      if (binaryExtensions.some(ext => path.endsWith(ext))) {
        console.log('⚠️ Intercepted binary file - preventing Monaco from opening:', detail.path);
        e.stopImmediatePropagation();
        
        // Show a notification
        showBinaryFileNotification(detail.path);
        return;
      }
    }
  }, true); // Use CAPTURE phase to intercept before other handlers
  
  console.log('✅ Global file listener patched - PDFs and binary files will not open in Monaco');
}

function showBinaryFileNotification(path: string): void {
  const filename = path.split('/').pop() || path;
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: #2d2d2d;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    color: #e6edf3;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 400px;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📦</span>
      <div>
        <div style="font-weight: 500;">${filename}</div>
        <div style="font-size: 12px; color: #7d8590;">Binary file - cannot open in editor</div>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Auto-patch if this file is imported
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(patchGlobalListenersForPdf, 100);
    });
  } else {
    setTimeout(patchGlobalListenersForPdf, 100);
  }
}

export default patchGlobalListenersForPdf;
