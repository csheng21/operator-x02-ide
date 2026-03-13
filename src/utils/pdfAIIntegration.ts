// src/utils/pdfAIIntegration.ts
// ============================================================================
// PDF AI INTEGRATION
// Automatically extracts PDF text and sends to AI when PDF is dropped
// ============================================================================

import { extractTextFromPdf, extractTextFromPdfPath } from './pdfTextExtractor';

console.log('[PDF-AI] Loading integration...');

// PDF.js CDN URLs
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib: any = null;

// Load PDF.js
async function ensurePdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if ((window as any).pdfjsLib) {
    pdfjsLib = (window as any).pdfjsLib;
    return pdfjsLib;
  }
  
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
  
  pdfjsLib = (window as any).pdfjsLib;
  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  }
  
  return pdfjsLib;
}

// Extract text from PDF ArrayBuffer
async function extractText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await ensurePdfJs();
  const pdf = await pdfjs.getDocument({ data }).promise;
  
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(`[Page ${i}]\n${text}`);
  }
  
  return pages.join('\n\n');
}

// Show status toast
function showStatus(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const id = 'pdf-ai-status';
  document.getElementById(id)?.remove();
  
  const colors = { info: '#3b82f6', success: '#22c55e', error: '#ef4444' };
  const icons = { info: '&#128196;', success: '&#9989;', error: '&#10060;' };
  
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 14px 20px;
    border-radius: 10px;
    z-index: 100001;
    font-size: 13px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 400px;
  `;
  div.innerHTML = `<span style="font-size:20px">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(div);
  
  if (type !== 'info') {
    setTimeout(() => div.remove(), 5000);
  }
}

// Insert text into AI chat
function insertIntoChat(text: string, fileName: string): void {
  // Find chat input
  const input = document.querySelector(
    '#user-input, textarea.chat-input, [data-testid="chat-input"], textarea[placeholder*="anything"]'
  ) as HTMLTextAreaElement;
  
  if (!input) {
    console.error('[PDF-AI] Chat input not found');
    showStatus('Chat input not found!', 'error');
    return;
  }
  
  // Truncate if too long (AI context limits)
  const maxChars = 50000;
  let content = text;
  if (content.length > maxChars) {
    content = content.substring(0, maxChars) + '\n\n[... truncated due to length ...]';
  }
  
  // Format message
  const message = `I've uploaded a PDF document: "${fileName}"

Here is the extracted text content:

\`\`\`
${content}
\`\`\`

Please analyze this document and provide a summary.`;
  
  // Set value
  input.value = message;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  
  // Scroll to bottom of chat
  const chatContainer = document.querySelector('.chat-messages, .messages-container, #chat-messages');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  showStatus(`PDF extracted! ${text.length.toLocaleString()} chars ready to send.`, 'success');
}

// Process PDF file
async function processPdf(file: File): Promise<void> {
  console.log('[PDF-AI] Processing:', file.name);
  showStatus(`Extracting text from ${file.name}...`, 'info');
  
  try {
    const buffer = await file.arrayBuffer();
    const text = await extractText(buffer);
    
    if (!text || text.trim().length < 20) {
      showStatus('PDF has no extractable text (might be scanned/image-based)', 'error');
      return;
    }
    
    insertIntoChat(text, file.name);
  } catch (error) {
    console.error('[PDF-AI] Extraction failed:', error);
    showStatus('Failed to extract PDF: ' + (error as Error).message, 'error');
  }
}

// Process PDF from Tauri path
async function processPdfFromPath(path: string): Promise<void> {
  console.log('[PDF-AI] Processing path:', path);
  const fileName = path.split(/[/\\]/).pop() || 'document.pdf';
  showStatus(`Extracting text from ${fileName}...`, 'info');
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const bytes = await invoke('read_file_binary', { path }) as number[];
    const buffer = new Uint8Array(bytes).buffer;
    const text = await extractText(buffer);
    
    if (!text || text.trim().length < 20) {
      showStatus('PDF has no extractable text', 'error');
      return;
    }
    
    insertIntoChat(text, fileName);
  } catch (error) {
    console.error('[PDF-AI] Extraction failed:', error);
    showStatus('Failed to extract PDF: ' + (error as Error).message, 'error');
  }
}

// Listen for PDF attachments in the chat area
function setupChatAttachmentListener(): void {
  // Watch for PDF chips appearing in attachment area
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement) {
          // Check for PDF attachment chip
          const pdfChip = node.querySelector?.('[data-file-type="pdf"], .pdf-chip') || 
                         (node.textContent?.toLowerCase().includes('.pdf') ? node : null);
          
          if (pdfChip) {
            const path = pdfChip.getAttribute?.('data-path') || 
                        node.getAttribute?.('data-path');
            if (path) {
              console.log('[PDF-AI] PDF attachment detected:', path);
              // Add extract button
              addExtractButton(pdfChip as HTMLElement, path);
            }
          }
        }
      }
    }
  });
  
  // Observe attachment area
  const attachArea = document.querySelector('.attachments-container, .file-attachments, #attachments');
  if (attachArea) {
    observer.observe(attachArea, { childList: true, subtree: true });
  }
  
  // Also observe chat input area
  const chatArea = document.querySelector('.chat-input-container, .input-area, #chat-input-area');
  if (chatArea) {
    observer.observe(chatArea, { childList: true, subtree: true });
  }
  
  // Observe entire document as fallback
  observer.observe(document.body, { childList: true, subtree: true });
}

// Add extract button to PDF chip
function addExtractButton(chip: HTMLElement, path: string): void {
  if (chip.querySelector('.pdf-extract-btn')) return;
  
  const btn = document.createElement('button');
  btn.className = 'pdf-extract-btn';
  btn.innerHTML = '&#128270;'; // Magnifying glass
  btn.title = 'Extract PDF text for AI analysis';
  btn.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 2px 6px;
    margin-left: 6px;
    cursor: pointer;
    font-size: 12px;
  `;
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    processPdfFromPath(path);
  };
  
  chip.appendChild(btn);
}

// Listen for file input changes (when user attaches via button)
function setupFileInputListener(): void {
  document.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    if (input.type !== 'file') return;
    
    const files = input.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        console.log('[PDF-AI] PDF selected via input:', file.name);
        
        // Ask user if they want to extract
        const extract = confirm(
          `PDF detected: ${file.name}\n\nExtract text for AI analysis?\n\n` +
          `Click OK to extract text, Cancel to attach as-is.`
        );
        
        if (extract) {
          await processPdf(file);
        }
      }
    }
  });
}

// Listen for Tauri drag-drop events
function setupTauriDropListener(): void {
  // Custom event from chatFileDropHandler
  document.addEventListener('pdf-dropped', async (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.path) {
      await processPdfFromPath(detail.path);
    } else if (detail?.file) {
      await processPdf(detail.file);
    }
  });
}

// Global keyboard shortcut: Ctrl+Shift+P to extract from clipboard/last PDF
function setupKeyboardShortcut(): void {
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      
      // Check for last blocked PDF
      const lastPdf = (window as any).__lastBlockedPdf;
      if (lastPdf) {
        console.log('[PDF-AI] Extracting last blocked PDF:', lastPdf);
        await processPdfFromPath(lastPdf);
      } else {
        showStatus('No PDF to extract. Drop a PDF first.', 'info');
      }
    }
  });
}

// Modify the binary blocker to store last blocked PDF
function hookIntoBinaryBlocker(): void {
  const checkBlocker = () => {
    const win = window as any;
    if (win.__binaryBlockerPatched && win.openFileInTab) {
      // Already patched, add our hook
      const currentFn = win.openFileInTab;
      win.openFileInTab = async function(path: string, ...args: any[]) {
        if (path.toLowerCase().endsWith('.pdf')) {
          win.__lastBlockedPdf = path;
          
          // Show option to extract
          setTimeout(() => {
            const extract = confirm(
              `PDF blocked from editor: ${path.split(/[/\\]/).pop()}\n\n` +
              `Extract text for AI analysis?`
            );
            if (extract) {
              processPdfFromPath(path);
            }
          }, 100);
        }
        return currentFn.call(this, path, ...args);
      };
      console.log('[PDF-AI] Hooked into binary blocker');
      return true;
    }
    return false;
  };
  
  // Try immediately and with retries
  if (!checkBlocker()) {
    let attempts = 0;
    const interval = setInterval(() => {
      if (checkBlocker() || ++attempts > 50) {
        clearInterval(interval);
      }
    }, 200);
  }
}

// Initialize everything
function initialize(): void {
  setupChatAttachmentListener();
  setupFileInputListener();
  setupTauriDropListener();
  setupKeyboardShortcut();
  hookIntoBinaryBlocker();
  
  console.log('[PDF-AI] Integration ready!');
  console.log('[PDF-AI] Shortcuts: Ctrl+Shift+P to extract last PDF');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export
export const pdfAI = {
  processPdf,
  processPdfFromPath,
  extractText
};

(window as any).__pdfAI = pdfAI;

console.log('[PDF-AI] Module loaded!');
