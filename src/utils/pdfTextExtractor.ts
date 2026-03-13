// src/utils/pdfTextExtractor.ts
// ============================================================================
// PDF TEXT EXTRACTOR FOR AI ANALYSIS
// Extracts text from PDF files and sends to AI chat
// ============================================================================

console.log('[PDFExtractor] Loading module...');

// PDF.js library URL (loaded dynamically)
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib: any = null;
let isLoading = false;

// Load PDF.js library dynamically
async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return pdfjsLib;
  }
  
  isLoading = true;
  
  try {
    // Check if already loaded globally
    if ((window as any).pdfjsLib) {
      pdfjsLib = (window as any).pdfjsLib;
      isLoading = false;
      return pdfjsLib;
    }
    
    // Load PDF.js script
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_CDN;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
    
    // Get the library
    pdfjsLib = (window as any).pdfjsLib;
    
    // Set worker
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    }
    
    console.log('[PDFExtractor] PDF.js loaded successfully');
    isLoading = false;
    return pdfjsLib;
  } catch (error) {
    console.error('[PDFExtractor] Failed to load PDF.js:', error);
    isLoading = false;
    throw error;
  }
}

// Extract text from PDF file
export async function extractTextFromPdf(file: File): Promise<string> {
  console.log('[PDFExtractor] Extracting text from:', file.name);
  
  const pdfjs = await loadPdfJs();
  if (!pdfjs) {
    throw new Error('PDF.js not available');
  }
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF document
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  console.log('[PDFExtractor] PDF loaded, pages:', pdf.numPages);
  
  // Extract text from all pages
  const textParts: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Combine text items
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    textParts.push(`--- Page ${i} ---\n${pageText}`);
  }
  
  const fullText = textParts.join('\n\n');
  console.log('[PDFExtractor] Extracted', fullText.length, 'characters');
  
  return fullText;
}

// Extract text from PDF path (for Tauri)
export async function extractTextFromPdfPath(path: string): Promise<string> {
  console.log('[PDFExtractor] Extracting from path:', path);
  
  try {
    // Try to read file via Tauri
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_binary', { path }) as number[];
    const uint8Array = new Uint8Array(content);
    
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    
    const textParts: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(`--- Page ${i} ---\n${pageText}`);
    }
    
    return textParts.join('\n\n');
  } catch (error) {
    console.error('[PDFExtractor] Failed to extract from path:', error);
    throw error;
  }
}

// Send extracted text to AI chat
export function sendToAIChat(text: string, fileName: string): void {
  console.log('[PDFExtractor] Sending to AI chat...');
  
  // Find the chat input
  const chatInput = document.querySelector('#user-input, .chat-input, textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
  
  if (!chatInput) {
    console.error('[PDFExtractor] Chat input not found');
    showNotification('Could not find chat input', 'error');
    return;
  }
  
  // Create message with PDF content
  const message = `I've attached a PDF file: "${fileName}"\n\nHere is the extracted text content:\n\n---\n${text}\n---\n\nPlease analyze this document.`;
  
  // Set the input value
  chatInput.value = message;
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Focus the input
  chatInput.focus();
  
  showNotification(`PDF text extracted (${text.length} chars) - Ready to send!`, 'success');
}

// Show notification toast
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const existing = document.getElementById('pdf-extractor-toast');
  if (existing) existing.remove();
  
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  const toast = document.createElement('div');
  toast.id = 'pdf-extractor-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 100001;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 350px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Process PDF file and send to AI
export async function processPdfForAI(file: File): Promise<void> {
  try {
    showNotification('Extracting PDF text...', 'info');
    
    const text = await extractTextFromPdf(file);
    
    if (!text || text.trim().length < 10) {
      showNotification('PDF appears to be empty or image-based', 'error');
      return;
    }
    
    sendToAIChat(text, file.name);
  } catch (error) {
    console.error('[PDFExtractor] Error processing PDF:', error);
    showNotification('Failed to extract PDF text: ' + (error as Error).message, 'error');
  }
}

// Process PDF from path and send to AI
export async function processPdfPathForAI(path: string): Promise<void> {
  try {
    showNotification('Extracting PDF text...', 'info');
    
    const text = await extractTextFromPdfPath(path);
    const fileName = path.split(/[/\\]/).pop() || 'document.pdf';
    
    if (!text || text.trim().length < 10) {
      showNotification('PDF appears to be empty or image-based', 'error');
      return;
    }
    
    sendToAIChat(text, fileName);
  } catch (error) {
    console.error('[PDFExtractor] Error processing PDF:', error);
    showNotification('Failed to extract PDF text: ' + (error as Error).message, 'error');
  }
}

// Integrate with file drop handler
function setupDropHandler(): void {
  // Listen for PDF files being attached
  document.addEventListener('pdf-file-attached', async (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.file) {
      await processPdfForAI(detail.file);
    } else if (detail?.path) {
      await processPdfPathForAI(detail.path);
    }
  });
  
  // Also listen for binary-file-blocked events (from our blocker)
  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking on a PDF attachment chip
    if (target.closest('[data-file-type="pdf"]') || 
        target.closest('.pdf-attachment') ||
        (target.textContent?.includes('.pdf') && target.closest('.attachment-chip'))) {
      
      const pathAttr = target.closest('[data-path]')?.getAttribute('data-path');
      if (pathAttr) {
        e.preventDefault();
        processPdfPathForAI(pathAttr);
      }
    }
  });
  
  console.log('[PDFExtractor] Drop handler ready');
}

// Initialize
setupDropHandler();

// Export for global access
export const pdfExtractor = {
  extractTextFromPdf,
  extractTextFromPdfPath,
  processPdfForAI,
  processPdfPathForAI,
  sendToAIChat
};

(window as any).__pdfExtractor = pdfExtractor;

console.log('[PDFExtractor] Module loaded! Use window.__pdfExtractor');
