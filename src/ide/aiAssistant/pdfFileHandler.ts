// pdfFileHandler.ts - SINGLE FILE PDF handler with text extraction
// Just add this ONE file and call initializePdfHandler() in your main.ts
// 
// This file:
// 1. Extracts text from PDFs using PDF.js
// 2. Does NOT open PDFs in the editor
// 3. Sends extracted text to AI automatically
// ============================================================================

// ============================================================================
// STATE
// ============================================================================

interface UploadedPdfFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  extractedText: string;
  isScanned: boolean;
}

let uploadedPdfFiles: UploadedPdfFile[] = [];
let pdfJsLoaded = false;

// ============================================================================
// PDF.JS LOADER
// ============================================================================

async function loadPdfJs(): Promise<void> {
  if (pdfJsLoaded) return;
  if ((window as any).pdfjsLib) {
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

async function extractPdfText(file: File): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
  await loadPdfJs();
  
  const pdfjsLib = (window as any).pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    console.log(`📄 Extracting text from: ${file.name}`);
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
      
      fullText += (i > 1 ? '\n\n--- Page ' + i + ' ---\n\n' : '') + pageText;
      totalChars += pageText.length;
    }
    
    const avgCharsPerPage = totalChars / pageCount;
    const isScanned = avgCharsPerPage < 100;
    
    console.log(`📄 Extracted ${totalChars} chars from ${pageCount} pages (scanned: ${isScanned})`);
    
    return { text: fullText, pageCount, isScanned };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return { text: '', pageCount: 0, isScanned: true };
  }
}

// ============================================================================
// FILE UPLOAD HANDLER
// ============================================================================

async function handlePdfUpload(file: File): Promise<UploadedPdfFile> {
  console.log(`📎 Processing PDF: ${file.name}`);
  
  const { text, pageCount, isScanned } = await extractPdfText(file);
  
  const pdfFile: UploadedPdfFile = {
    id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    pageCount,
    extractedText: text,
    isScanned
  };
  
  uploadedPdfFiles.push(pdfFile);
  
  // Update UI
  updatePdfPreview();
  
  return pdfFile;
}

// ============================================================================
// UI
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updatePdfPreview(): void {
  let container = document.getElementById('pdf-upload-preview');
  if (!container) {
    // Create container if not exists
    const inputArea = document.querySelector('.input-container, .ai-chat-input, .chat-input-container');
    if (inputArea) {
      container = document.createElement('div');
      container.id = 'pdf-upload-preview';
      container.style.cssText = 'padding: 8px; display: flex; flex-wrap: wrap; gap: 8px;';
      inputArea.parentNode?.insertBefore(container, inputArea);
    }
  }
  
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const pdf of uploadedPdfFiles) {
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
    `;
    
    const textStatus = pdf.extractedText.length > 0 
      ? `✅ ${pdf.extractedText.length.toLocaleString()} chars extracted`
      : pdf.isScanned 
        ? '⚠️ Scanned PDF (no text)'
        : '⚠️ No text found';
    
    card.innerHTML = `
      <span style="font-size: 20px;">📄</span>
      <div style="flex: 1;">
        <div style="font-weight: 500; color: #e6edf3;">${pdf.name}</div>
        <div style="font-size: 11px; color: #7d8590;">
          ${formatFileSize(pdf.size)} • ${pdf.pageCount} pages • ${textStatus}
        </div>
      </div>
      <button onclick="window.removePdfFile('${pdf.id}')" style="
        background: transparent;
        border: none;
        color: #f44336;
        cursor: pointer;
        font-size: 16px;
      ">×</button>
    `;
    
    container.appendChild(card);
  }
}

function removePdfFile(id: string): void {
  uploadedPdfFiles = uploadedPdfFiles.filter(f => f.id !== id);
  updatePdfPreview();
}

// ============================================================================
// AI INTEGRATION - THE KEY PART!
// ============================================================================

/**
 * Get PDF content to prepend to user messages
 */
function getPdfContextForAI(): string {
  if (uploadedPdfFiles.length === 0) return '';
  
  const parts: string[] = [];
  parts.push('\n=== UPLOADED PDF FILES ===\n');
  
  for (const pdf of uploadedPdfFiles) {
    parts.push(`\n📄 PDF FILE: ${pdf.name}`);
    parts.push(`   Size: ${formatFileSize(pdf.size)} | Pages: ${pdf.pageCount}`);
    
    if (pdf.extractedText && pdf.extractedText.length > 0) {
      parts.push('\n   EXTRACTED TEXT:');
      parts.push('   ```');
      // Limit to 50k chars per file
      const text = pdf.extractedText.length > 50000 
        ? pdf.extractedText.substring(0, 50000) + '\n[...truncated...]'
        : pdf.extractedText;
      parts.push('   ' + text.split('\n').join('\n   '));
      parts.push('   ```');
    } else if (pdf.isScanned) {
      parts.push('\n   [This PDF appears to be scanned/image-based. No text could be extracted.]');
    } else {
      parts.push('\n   [No text content found in this PDF.]');
    }
  }
  
  parts.push('\n=== END PDF FILES ===\n');
  
  return parts.join('\n');
}

/**
 * Check if there are PDFs to send
 */
function hasPdfFiles(): boolean {
  return uploadedPdfFiles.length > 0;
}

/**
 * Clear PDFs after sending
 */
function clearPdfFiles(): void {
  uploadedPdfFiles = [];
  updatePdfPreview();
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
        // Add PDF content to message
        if (hasPdfFiles()) {
          const pdfContext = getPdfContextForAI();
          message = pdfContext + '\nUSER QUESTION: ' + message;
          console.log('📎 Added PDF content to message');
          console.log(`📄 ${uploadedPdfFiles.length} PDF(s), total ${uploadedPdfFiles.reduce((s, f) => s + f.extractedText.length, 0)} chars`);
        }
        
        // Call original
        const result = await originalSend(message);
        
        // Clear PDFs after send
        if (hasPdfFiles()) {
          clearPdfFiles();
          console.log('📎 Cleared PDFs after send');
        }
        
        return result;
      };
      
      isPatched = true;
      console.log('✅ PDF integration patched into sendMessageDirectly');
      return true;
    }
    return false;
  };
  
  if (!tryPatch()) {
    setTimeout(() => tryPatch() || setTimeout(() => tryPatch(), 2000), 1000);
  }
}

// ============================================================================
// UPLOAD BUTTON SETUP
// ============================================================================

function createUploadButton(): void {
  // Check if already exists
  if (document.getElementById('pdf-upload-btn')) return;
  
  const inputArea = document.querySelector('.input-container, .ai-chat-input, .chat-input-container, .assistant-input-container');
  if (!inputArea) {
    console.warn('Could not find input area for PDF upload button');
    return;
  }
  
  const btn = document.createElement('button');
  btn.id = 'pdf-upload-btn';
  btn.innerHTML = '📄 PDF';
  btn.title = 'Upload PDF file';
  btn.style.cssText = `
    padding: 6px 12px;
    background: rgba(79, 195, 247, 0.15);
    border: 1px solid rgba(79, 195, 247, 0.3);
    border-radius: 6px;
    color: #4fc3f7;
    cursor: pointer;
    font-size: 13px;
    margin-right: 8px;
  `;
  
  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      
      btn.innerHTML = '⏳ Loading...';
      btn.style.opacity = '0.7';
      
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          await handlePdfUpload(file);
        }
      }
      
      btn.innerHTML = '📄 PDF';
      btn.style.opacity = '1';
    };
    
    input.click();
  };
  
  // Insert before the input area
  inputArea.parentNode?.insertBefore(btn, inputArea);
  
  // Also create preview container
  const preview = document.createElement('div');
  preview.id = 'pdf-upload-preview';
  preview.style.cssText = 'padding: 8px; display: flex; flex-wrap: wrap; gap: 8px;';
  inputArea.parentNode?.insertBefore(preview, inputArea);
  
  console.log('✅ PDF upload button created');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializePdfHandler(): void {
  console.log('📄 Initializing PDF handler...');
  
  // Preload PDF.js
  loadPdfJs().catch(err => console.warn('PDF.js preload failed:', err));
  
  // Setup UI when ready
  const setup = () => {
    createUploadButton();
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
    handlePdfUpload,
    getPdfContextForAI,
    hasPdfFiles,
    clearPdfFiles,
    get uploadedFiles() { return uploadedPdfFiles; },
    
    debug: () => {
      console.log('📄 Uploaded PDFs:', uploadedPdfFiles.length);
      uploadedPdfFiles.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} - ${f.pageCount} pages, ${f.extractedText.length} chars`);
      });
      if (uploadedPdfFiles.length > 0) {
        console.log('\n📄 Context preview:');
        console.log(getPdfContextForAI().substring(0, 2000));
      }
    }
  };
  
  // Expose remove function
  (window as any).removePdfFile = removePdfFile;
}

export default initializePdfHandler;
