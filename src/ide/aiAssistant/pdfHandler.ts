// pdfHandler.ts - Complete PDF Handler for IDE
// Features:
// 1. PDF Viewer tab (not raw binary in Monaco)
// 2. Text extraction using PDF.js
// 3. AI integration (sends extracted text)
// ============================================================================

// ============================================================================
// STATE
// ============================================================================

interface PdfDocument {
  id: string;
  name: string;
  path: string;
  size: number;
  pageCount: number;
  extractedText: string;
  isScanned: boolean;
  base64Data?: string;
  thumbnailUrl?: string;
}

let uploadedPdfs: PdfDocument[] = [];
let pdfJsLoaded = false;
let currentViewingPdf: PdfDocument | null = null;

// ============================================================================
// PDF.JS LOADER
// ============================================================================

async function loadPdfJs(): Promise<void> {
  if (pdfJsLoaded || (window as any).pdfjsLib) {
    pdfJsLoaded = true;
    return;
  }
  
  return new Promise((resolve, reject) => {
    console.log('📄 Loading PDF.js...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfJsLoaded = true;
        console.log('✅ PDF.js loaded');
        resolve();
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  await loadPdfJs();
  
  const pdfjsLib = (window as any).pdfjsLib;
  
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    let fullText = '';
    let totalChars = 0;
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      fullText += (i > 1 ? `\n\n--- Page ${i} ---\n\n` : '') + pageText;
      totalChars += pageText.length;
    }
    
    const avgCharsPerPage = totalChars / pageCount;
    const isScanned = avgCharsPerPage < 100;
    
    console.log(`📄 Extracted ${totalChars} chars from ${pageCount} pages`);
    
    return { text: fullText, pageCount, isScanned };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return { text: '', pageCount: 0, isScanned: true };
  }
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

async function processPdfFile(file: File): Promise<PdfDocument> {
  console.log(`📎 Processing PDF: ${file.name}`);
  
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  const { text, pageCount, isScanned } = await extractPdfText(arrayBuffer);
  
  const pdfDoc: PdfDocument = {
    id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    path: file.name,
    size: file.size,
    pageCount,
    extractedText: text,
    isScanned,
    base64Data: base64
  };
  
  uploadedPdfs.push(pdfDoc);
  
  return pdfDoc;
}

// ============================================================================
// PDF VIEWER TAB (Instead of Monaco showing binary)
// ============================================================================

function createPdfViewerTab(pdf: PdfDocument): void {
  const tabManager = (window as any).tabManager;
  
  // Create custom tab content
  const viewerHtml = `
    <div class="pdf-viewer-container" style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1e1e1e;
      color: #e6edf3;
    ">
      <!-- Header -->
      <div style="
        padding: 12px 16px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <span style="font-size: 24px;">📄</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px;">${pdf.name}</div>
          <div style="font-size: 12px; color: #7d8590;">
            ${formatFileSize(pdf.size)} • ${pdf.pageCount} pages • 
            ${pdf.extractedText.length > 0 
              ? `✅ ${pdf.extractedText.length.toLocaleString()} characters extracted`
              : pdf.isScanned ? '⚠️ Scanned PDF (OCR needed)' : '⚠️ No text found'}
          </div>
        </div>
        <button onclick="window.pdfHandler.sendToChat('${pdf.id}')" style="
          padding: 6px 16px;
          background: #238636;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 13px;
        ">📤 Send to AI Chat</button>
      </div>
      
      <!-- Content Area -->
      <div style="flex: 1; display: flex; overflow: hidden;">
        <!-- PDF Preview -->
        <div style="flex: 1; display: flex; flex-direction: column; border-right: 1px solid #3c3c3c;">
          <div style="padding: 8px 12px; background: #2d2d2d; font-size: 12px; color: #7d8590;">
            PDF Preview
          </div>
          <div id="pdf-preview-${pdf.id}" style="flex: 1; overflow: auto; padding: 16px; display: flex; justify-content: center;">
            <div style="text-align: center; color: #7d8590;">
              <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
              <div>Loading preview...</div>
            </div>
          </div>
        </div>
        
        <!-- Extracted Text -->
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="padding: 8px 12px; background: #2d2d2d; font-size: 12px; color: #7d8590;">
            Extracted Text (${pdf.extractedText.length.toLocaleString()} characters)
          </div>
          <div style="flex: 1; overflow: auto; padding: 16px;">
            ${pdf.extractedText.length > 0 
              ? `<pre style="
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  font-family: 'Consolas', 'Monaco', monospace;
                  font-size: 13px;
                  line-height: 1.5;
                  margin: 0;
                  color: #e6edf3;
                ">${escapeHtml(pdf.extractedText)}</pre>`
              : `<div style="text-align: center; color: #7d8590; padding: 40px;">
                  <div style="font-size: 48px; margin-bottom: 16px;">📷</div>
                  <div style="font-size: 16px; margin-bottom: 8px;">No Text Extracted</div>
                  <div style="font-size: 13px;">
                    This PDF appears to be scanned or image-based.<br>
                    OCR would be needed to extract text.
                  </div>
                </div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Try to add as a custom tab
  if (tabManager?.addCustomTab) {
    tabManager.addCustomTab(pdf.name, viewerHtml, 'pdf');
  } else if (tabManager?.addTab) {
    // Fallback: Create a special tab that won't show in Monaco
    const container = document.querySelector('.editor-container, .monaco-editor')?.parentElement;
    if (container) {
      // Hide Monaco, show our viewer
      const viewer = document.createElement('div');
      viewer.id = `pdf-viewer-${pdf.id}`;
      viewer.innerHTML = viewerHtml;
      viewer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 100;';
      container.appendChild(viewer);
      
      currentViewingPdf = pdf;
    }
  } else {
    // Last resort: Open in modal
    showPdfModal(pdf);
  }
  
  // Render PDF preview after a short delay
  setTimeout(() => renderPdfPreview(pdf), 100);
}

async function renderPdfPreview(pdf: PdfDocument): Promise<void> {
  if (!pdf.base64Data) return;
  
  const container = document.getElementById(`pdf-preview-${pdf.id}`);
  if (!container) return;
  
  try {
    await loadPdfJs();
    const pdfjsLib = (window as any).pdfjsLib;
    
    // Convert base64 to array buffer
    const binaryString = atob(pdf.base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '16px';
    container.style.alignItems = 'center';
    
    // Render first 3 pages as preview
    const pagesToRender = Math.min(pdfDoc.numPages, 3);
    
    for (let i = 1; i <= pagesToRender; i++) {
      const page = await pdfDoc.getPage(i);
      const scale = 1.0;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.maxWidth = '100%';
      canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      canvas.style.borderRadius = '4px';
      
      await page.render({ canvasContext: context!, viewport }).promise;
      
      const pageLabel = document.createElement('div');
      pageLabel.style.cssText = 'font-size: 11px; color: #7d8590; margin-top: -8px;';
      pageLabel.textContent = `Page ${i} of ${pdfDoc.numPages}`;
      
      container.appendChild(canvas);
      container.appendChild(pageLabel);
    }
    
    if (pdfDoc.numPages > 3) {
      const more = document.createElement('div');
      more.style.cssText = 'color: #7d8590; font-size: 13px; padding: 16px;';
      more.textContent = `... and ${pdfDoc.numPages - 3} more pages`;
      container.appendChild(more);
    }
    
  } catch (error) {
    console.error('Error rendering PDF preview:', error);
    container.innerHTML = `
      <div style="text-align: center; color: #f44336;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div>Failed to render preview</div>
      </div>
    `;
  }
}

function showPdfModal(pdf: PdfDocument): void {
  const modal = document.createElement('div');
  modal.id = `pdf-modal-${pdf.id}`;
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #1e1e1e;
      border-radius: 8px;
      width: 90vw;
      max-width: 1200px;
      height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      <div style="
        padding: 16px;
        background: #252526;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">📄</span>
          <span style="font-weight: 600;">${pdf.name}</span>
          <span style="color: #7d8590; font-size: 13px;">
            ${pdf.pageCount} pages • ${pdf.extractedText.length.toLocaleString()} chars
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.pdfHandler.sendToChat('${pdf.id}')" style="
            padding: 6px 16px;
            background: #238636;
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
          ">📤 Send to AI</button>
          <button onclick="document.getElementById('pdf-modal-${pdf.id}').remove()" style="
            padding: 6px 16px;
            background: #3c3c3c;
            border: none;
            border-radius: 6px;
            color: #e6edf3;
            cursor: pointer;
          ">Close</button>
        </div>
      </div>
      <div style="flex: 1; overflow: auto; padding: 16px;">
        <pre style="
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.5;
          color: #e6edf3;
        ">${escapeHtml(pdf.extractedText || 'No text extracted from this PDF.')}</pre>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
}

// ============================================================================
// AI CHAT INTEGRATION
// ============================================================================

function getPdfContextForAI(): string {
  if (uploadedPdfs.length === 0) return '';
  
  const parts: string[] = [];
  parts.push('\n=== UPLOADED PDF DOCUMENTS ===\n');
  
  for (const pdf of uploadedPdfs) {
    parts.push(`\n📄 PDF: ${pdf.name}`);
    parts.push(`   Pages: ${pdf.pageCount} | Size: ${formatFileSize(pdf.size)}`);
    
    if (pdf.extractedText && pdf.extractedText.length > 0) {
      parts.push('\n   CONTENT:');
      parts.push('   ```');
      const text = pdf.extractedText.length > 50000 
        ? pdf.extractedText.substring(0, 50000) + '\n[...truncated...]'
        : pdf.extractedText;
      parts.push('   ' + text.split('\n').join('\n   '));
      parts.push('   ```');
    } else {
      parts.push('\n   [Scanned PDF - no text could be extracted]');
    }
  }
  
  parts.push('\n=== END PDF DOCUMENTS ===\n');
  
  return parts.join('\n');
}

function sendPdfToChat(pdfId: string): void {
  const pdf = uploadedPdfs.find(p => p.id === pdfId);
  if (!pdf) return;
  
  // Add to the context that will be sent with next message
  console.log(`📤 PDF "${pdf.name}" ready to send to AI`);
  
  // Show notification
  showNotification(`📄 "${pdf.name}" attached. Ask your question and the PDF content will be sent to AI.`, 'success');
  
  // Focus the chat input
  const input = document.querySelector('#ai-assistant-input, .ai-chat-input textarea') as HTMLTextAreaElement;
  if (input) {
    input.focus();
    input.placeholder = `Ask about "${pdf.name}"...`;
  }
}

function hasPdfFiles(): boolean {
  return uploadedPdfs.length > 0;
}

function clearPdfFiles(): void {
  uploadedPdfs = [];
  updatePdfUploadPreview();
}

// ============================================================================
// PATCH sendMessageDirectly
// ============================================================================

let isPatched = false;

function patchSendMessage(): void {
  if (isPatched) return;
  
  const w = window as any;
  
  const tryPatch = () => {
    if (typeof w.sendMessageDirectly === 'function') {
      const originalSend = w.sendMessageDirectly;
      
      w.sendMessageDirectly = async function(message: string): Promise<void> {
        if (hasPdfFiles()) {
          const pdfContext = getPdfContextForAI();
          message = pdfContext + '\nUSER QUESTION: ' + message;
          console.log('📎 Added PDF content to message');
        }
        
        const result = await originalSend(message);
        
        if (hasPdfFiles()) {
          clearPdfFiles();
        }
        
        return result;
      };
      
      isPatched = true;
      console.log('✅ PDF handler patched sendMessageDirectly');
      return true;
    }
    return false;
  };
  
  if (!tryPatch()) {
    setTimeout(() => tryPatch() || setTimeout(() => tryPatch(), 2000), 1000);
  }
}

// ============================================================================
// INTERCEPT FILE-SELECTED EVENT FOR PDFs
// ============================================================================

function interceptPdfFileEvents(): void {
  // Intercept the file-selected event to prevent PDFs from opening in Monaco
  document.addEventListener('file-selected', (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.path?.toLowerCase().endsWith('.pdf')) {
      console.log('📄 Intercepted PDF file-selected event:', detail.path);
      e.stopImmediatePropagation();
      e.preventDefault();
      
      // Instead, show PDF in our viewer
      const existingPdf = uploadedPdfs.find(p => p.path === detail.path);
      if (existingPdf) {
        showPdfModal(existingPdf);
      }
      
      return false;
    }
  }, true); // Use capture phase to intercept before other handlers
  
  console.log('✅ PDF file-selected interceptor installed');
}

// ============================================================================
// UPLOAD UI
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#238636' : type === 'error' ? '#da3633' : '#1f6feb'};
    color: white;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    max-width: 400px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

function updatePdfUploadPreview(): void {
  let container = document.getElementById('pdf-upload-preview');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const pdf of uploadedPdfs) {
    const card = document.createElement('div');
    card.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 8px;
    `;
    
    const status = pdf.extractedText.length > 0 
      ? `✅ ${pdf.extractedText.length.toLocaleString()} chars`
      : '⚠️ No text';
    
    card.innerHTML = `
      <span style="font-size: 20px;">📄</span>
      <div style="flex: 1;">
        <div style="font-weight: 500; color: #e6edf3;">${pdf.name}</div>
        <div style="font-size: 11px; color: #7d8590;">
          ${formatFileSize(pdf.size)} • ${pdf.pageCount} pages • ${status}
        </div>
      </div>
      <button onclick="window.pdfHandler.viewPdf('${pdf.id}')" style="
        padding: 4px 8px;
        background: #3c3c3c;
        border: none;
        border-radius: 4px;
        color: #e6edf3;
        cursor: pointer;
        font-size: 12px;
      ">View</button>
      <button onclick="window.pdfHandler.removePdf('${pdf.id}')" style="
        background: transparent;
        border: none;
        color: #f44336;
        cursor: pointer;
        font-size: 18px;
      ">×</button>
    `;
    
    container.appendChild(card);
  }
}

function createUploadButton(): void {
  if (document.getElementById('pdf-upload-btn')) return;
  
  const inputArea = document.querySelector('.input-container, .ai-chat-input, .chat-input-container, .assistant-input-container');
  if (!inputArea) {
    console.warn('Could not find input area for PDF button');
    return;
  }
  
  // Create container
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;';
  
  // Preview area
  const preview = document.createElement('div');
  preview.id = 'pdf-upload-preview';
  
  // Button
  const btn = document.createElement('button');
  btn.id = 'pdf-upload-btn';
  btn.innerHTML = '📄 Upload PDF';
  btn.title = 'Upload PDF file';
  btn.style.cssText = `
    padding: 8px 16px;
    background: rgba(79, 195, 247, 0.15);
    border: 1px solid rgba(79, 195, 247, 0.3);
    border-radius: 6px;
    color: #4fc3f7;
    cursor: pointer;
    font-size: 13px;
    align-self: flex-start;
  `;
  
  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.multiple = true;
    
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      
      btn.innerHTML = '⏳ Processing...';
      btn.style.opacity = '0.7';
      
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const pdf = await processPdfFile(file);
          updatePdfUploadPreview();
          
          // Open in viewer
          createPdfViewerTab(pdf);
        }
      }
      
      btn.innerHTML = '📄 Upload PDF';
      btn.style.opacity = '1';
    };
    
    input.click();
  };
  
  wrapper.appendChild(preview);
  wrapper.appendChild(btn);
  inputArea.parentNode?.insertBefore(wrapper, inputArea);
  
  console.log('✅ PDF upload button created');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializePdfHandler(): void {
  console.log('📄 Initializing PDF handler...');
  
  // Preload PDF.js
  loadPdfJs().catch(err => console.warn('PDF.js preload failed:', err));
  
  const setup = () => {
    // Intercept PDF file events (prevent Monaco from showing binary)
    interceptPdfFileEvents();
    
    // Create upload UI
    createUploadButton();
    
    // Patch send message
    patchSendMessage();
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 500));
  } else {
    setTimeout(setup, 500);
  }
  
  console.log('✅ PDF handler initialized');
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).pdfHandler = {
    initializePdfHandler,
    processPdfFile,
    getPdfContextForAI,
    hasPdfFiles,
    clearPdfFiles,
    sendToChat: sendPdfToChat,
    viewPdf: (id: string) => {
      const pdf = uploadedPdfs.find(p => p.id === id);
      if (pdf) showPdfModal(pdf);
    },
    removePdf: (id: string) => {
      uploadedPdfs = uploadedPdfs.filter(p => p.id !== id);
      updatePdfUploadPreview();
    },
    get uploadedPdfs() { return uploadedPdfs; },
    
    debug: () => {
      console.log('📄 PDF Handler Debug');
      console.log('  Uploaded PDFs:', uploadedPdfs.length);
      uploadedPdfs.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
        console.log(`     Pages: ${p.pageCount}, Text: ${p.extractedText.length} chars`);
      });
      if (uploadedPdfs.length > 0) {
        console.log('\n📄 AI Context Preview:');
        console.log(getPdfContextForAI().substring(0, 2000));
      }
    }
  };
}

export default initializePdfHandler;
