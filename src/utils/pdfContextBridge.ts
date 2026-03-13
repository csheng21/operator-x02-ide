// pdfContextBridge.ts - Automatically injects PDF text into AI messages
// ============================================================================
// DROP THIS FILE IN: src/utils/pdfContextBridge.ts
// IMPORT IN main.ts: import './utils/pdfContextBridge';
// 
// This automatically patches the message sending to include PDF context.
// No other changes needed!
// ============================================================================

console.log('[PDFBridge] Initializing...');

/**
 * Get formatted PDF context from pdfContextManager
 */
function getPdfContext(): string {
  try {
    const pdfManager = (window as any).pdfContextManager;
    if (!pdfManager) return '';
    
    // Method 1: Use getPdfContextSync if available (preferred - synchronous)
    if (typeof pdfManager.getPdfContextSync === 'function') {
      const ctx = pdfManager.getPdfContextSync();
      if (ctx && ctx.length > 100) {
        console.log('[PDFBridge] Using getPdfContextSync:', ctx.length, 'chars');
        return ctx;
      }
    }
    
    // Method 2: Build context from attachments directly
    if (typeof pdfManager.getAttachments === 'function') {
      const attachments = pdfManager.getAttachments();
      if (!attachments || attachments.length === 0) return '';
      
      let context = '\n\n# 📄 Attached PDF Documents\n';
      let hasContent = false;
      
      for (const att of attachments) {
        if (att.extractedText && att.extractedText.length > 0) {
          hasContent = true;
          const lines = (att.extractedText.match(/\n/g) || []).length + 1;
          context += `\n## 📕 ${att.fileName} (${lines} lines)\n`;
          context += '```text\n';
          context += att.extractedText.substring(0, 50000);
          if (att.extractedText.length > 50000) {
            context += '\n... [truncated]';
          }
          context += '\n```\n';
        }
      }
      
      if (hasContent) {
        console.log('[PDFBridge] Built context from attachments:', context.length, 'chars');
        return context;
      }
    }
    
    return '';
  } catch (e) {
    console.warn('[PDFBridge] Error:', e);
    return '';
  }
}

/**
 * Check if there are any PDFs with extracted text
 */
function hasPdfContent(): boolean {
  try {
    const pdfManager = (window as any).pdfContextManager;
    if (!pdfManager) return false;
    
    if (typeof pdfManager.hasAttachments === 'function') {
      if (!pdfManager.hasAttachments()) return false;
    }
    
    const attachments = pdfManager.getAttachments?.() || [];
    return attachments.some((a: any) => a.extractedText && a.extractedText.length > 0);
  } catch {
    return false;
  }
}

// ============================================================================
// AUTO-INJECTION: Patch the chatFileDrop.getFilesForAI function
// ============================================================================

function patchChatFileDrop(): void {
  const chatFileDrop = (window as any).chatFileDrop;
  if (!chatFileDrop) {
    console.log('[PDFBridge] chatFileDrop not found, retrying...');
    setTimeout(patchChatFileDrop, 1000);
    return;
  }
  
  // Store original function
  const originalGetFilesForAI = chatFileDrop.getFilesForAI;
  
  // Replace with enhanced version
  chatFileDrop.getFilesForAI = async function(): Promise<string> {
    // Get original attached files content
    let content = '';
    if (typeof originalGetFilesForAI === 'function') {
      const result = originalGetFilesForAI.call(chatFileDrop);
      // Handle both sync and async
      content = (result instanceof Promise) ? await result : result;
    }
    
    // Add PDF context if available
    if (hasPdfContent()) {
      const pdfContent = getPdfContext();
      if (pdfContent) {
        console.log('[PDFBridge] 📕 Injecting PDF content:', pdfContent.length, 'chars');
        content = pdfContent + content;
      }
    }
    
    return content || '';
  };
  
  // Also add sync version
  chatFileDrop.getFilesForAIWithPdf = function(): string {
    let content = '';
    if (typeof originalGetFilesForAI === 'function') {
      content = originalGetFilesForAI.call(chatFileDrop) || '';
    }
    
    if (hasPdfContent()) {
      const pdfContent = getPdfContext();
      if (pdfContent) {
        console.log('[PDFBridge] 📕 Injecting PDF content (sync):', pdfContent.length, 'chars');
        content = pdfContent + content;
      }
    }
    
    return content;
  };
  
  console.log('[PDFBridge] ✅ Patched chatFileDrop.getFilesForAI');
}

// ============================================================================
// ALTERNATIVE: Direct message enhancement
// ============================================================================

/**
 * Enhance a message with PDF context
 * Call this before sending to AI: message = enhanceWithPdf(message);
 */
function enhanceMessageWithPdf(message: string): string {
  if (!hasPdfContent()) return message;
  
  const pdfContent = getPdfContext();
  if (!pdfContent) return message;
  
  console.log('[PDFBridge] 📕 Enhancing message with PDF:', pdfContent.length, 'chars');
  
  // Prepend PDF content before the user's message
  return `${pdfContent}\n\n---\n**User Question:**\n${message}`;
}

// Expose globally
(window as any).pdfContextBridge = {
  getPdfContext,
  hasPdfContent,
  enhanceMessageWithPdf,
};

// ============================================================================
// Initialize
// ============================================================================

// Wait for DOM and patch
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(patchChatFileDrop, 500);
  });
} else {
  setTimeout(patchChatFileDrop, 500);
}

console.log('[PDFBridge] Ready - PDF context will be auto-injected');

export { getPdfContext, hasPdfContent, enhanceMessageWithPdf };
