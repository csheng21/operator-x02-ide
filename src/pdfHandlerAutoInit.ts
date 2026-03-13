// pdfHandlerAutoInit.ts - SELF-INITIALIZING PDF Handler
// Just import this file and it works automatically!
// 
// Usage in main.ts:
//   import './pdfHandlerAutoInit';
// 
// That's it! No other code needed.
// ============================================================================

console.log('📄 PDF Handler Auto-Init loading...');

// ============================================================================
// STATE
// ============================================================================

interface PdfFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  text: string;
  isScanned: boolean;
}

let pdfFiles: PdfFile[] = [];
let pdfJsReady = false;

// ============================================================================
// PDF.JS
// ============================================================================

async function loadPdfJs(): Promise<void> {
  if (pdfJsReady || (window as any).pdfjsLib) {
    pdfJsReady = true;
    return;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfJsReady = true;
        console.log('✅ PDF.js loaded');
        resolve();
      } else {
        reject(new Error('PDF.js init failed'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

async function extractText(file: File): Promise<{ text: string; pages: number; scanned: boolean }> {
  await loadPdfJs();
  const lib = (window as any).pdfjsLib;
  const data = await file.arrayBuffer();
  
  try {
    const pdf = await lib.getDocument({ data }).promise;
    let text = '';
    let chars = 0;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((x: any) => x.str).join(' ').trim();
      text += (i > 1 ? '\n\n' : '') + pageText;
      chars += pageText.length;
    }
    
    return { 
      text, 
      pages: pdf.numPages, 
      scanned: chars / pdf.numPages < 100 
    };
  } catch (e) {
    console.error('PDF extract error:', e);
    return { text: '', pages: 0, scanned: true };
  }
}

// ============================================================================
// INTERCEPT PDF FILES - PREVENT MONACO FROM OPENING
// ============================================================================

function interceptPdfEvents(): void {
  document.addEventListener('file-selected', (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.path?.toLowerCase().endsWith('.pdf')) {
      console.log('📄 Blocked PDF from opening in Monaco:', detail.path);
      e.stopImmediatePropagation();
      e.preventDefault();
      
      // Show notification
      showToast(`📄 PDF files open in viewer, not editor`, 'info');
    }
  }, true); // CAPTURE phase - runs before other handlers
  
  console.log('✅ PDF file interceptor active');
}

// ============================================================================
// UI
// ============================================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
    background: ${type === 'success' ? '#238636' : type === 'error' ? '#da3633' : '#1f6feb'};
    color: white; border-radius: 6px; font-size: 13px; z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function updatePreview(): void {
  let container = document.getElementById('pdf-preview-area');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const pdf of pdfFiles) {
    const card = document.createElement('div');
    card.style.cssText = `
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: rgba(79, 195, 247, 0.1); border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px; margin-bottom: 8px;
    `;
    
    const status = pdf.text.length > 0 
      ? `✅ ${pdf.text.length.toLocaleString()} chars` 
      : pdf.isScanned ? '⚠️ Scanned (no text)' : '⚠️ No text';
    
    card.innerHTML = `
      <span style="font-size: 24px;">📄</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #e6edf3; font-size: 13px;">${pdf.name}</div>
        <div style="font-size: 11px; color: #7d8590;">
          ${formatSize(pdf.size)} • ${pdf.pages} pages • ${status}
        </div>
      </div>
      <button data-action="view" data-id="${pdf.id}" style="
        padding: 4px 10px; background: #3c3c3c; border: none; border-radius: 4px;
        color: #e6edf3; cursor: pointer; font-size: 12px;
      ">👁️ View</button>
      <button data-action="remove" data-id="${pdf.id}" style="
        background: none; border: none; color: #f44336; cursor: pointer; font-size: 18px;
      ">×</button>
    `;
    
    card.querySelector('[data-action="view"]')?.addEventListener('click', () => showPdfViewer(pdf));
    card.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      pdfFiles = pdfFiles.filter(p => p.id !== pdf.id);
      updatePreview();
    });
    
    container.appendChild(card);
  }
}

function showPdfViewer(pdf: PdfFile): void {
  // Remove existing viewer
  document.getElementById('pdf-viewer-modal')?.remove();
  
  const modal = document.createElement('div');
  modal.id = 'pdf-viewer-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #1e1e1e; border-radius: 12px; width: 90vw; max-width: 1000px;
      height: 80vh; display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #3c3c3c;
    ">
      <div style="
        padding: 16px 20px; background: #252526; border-bottom: 1px solid #3c3c3c;
        display: flex; align-items: center; justify-content: space-between;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px;">📄</span>
          <div>
            <div style="font-weight: 600; font-size: 15px; color: #e6edf3;">${pdf.name}</div>
            <div style="font-size: 12px; color: #7d8590;">
              ${pdf.pages} pages • ${pdf.text.length.toLocaleString()} characters extracted
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="pdf-send-btn" style="
            padding: 8px 16px; background: #238636; border: none; border-radius: 6px;
            color: white; cursor: pointer; font-size: 13px; font-weight: 500;
          ">📤 Ready for AI</button>
          <button id="pdf-close-btn" style="
            padding: 8px 16px; background: #3c3c3c; border: none; border-radius: 6px;
            color: #e6edf3; cursor: pointer; font-size: 13px;
          ">Close</button>
        </div>
      </div>
      <div style="flex: 1; overflow: auto; padding: 20px;">
        ${pdf.text.length > 0 ? `
          <pre style="
            white-space: pre-wrap; word-wrap: break-word; font-family: 'Consolas', monospace;
            font-size: 13px; line-height: 1.6; color: #e6edf3; margin: 0;
          ">${escapeHtml(pdf.text)}</pre>
        ` : `
          <div style="text-align: center; padding: 60px; color: #7d8590;">
            <div style="font-size: 64px; margin-bottom: 20px;">📷</div>
            <div style="font-size: 18px; margin-bottom: 10px;">No Text Extracted</div>
            <div style="font-size: 14px;">This PDF appears to be scanned or image-based.</div>
          </div>
        `}
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
  
  modal.querySelector('#pdf-close-btn')?.addEventListener('click', () => modal.remove());
  modal.querySelector('#pdf-send-btn')?.addEventListener('click', () => {
    showToast('📄 PDF attached! Ask your question and the content will be sent to AI.', 'success');
    modal.remove();
    
    // Focus chat input
    const input = document.querySelector('#ai-assistant-input, textarea') as HTMLElement;
    input?.focus();
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createUploadUI(): void {
  // Find input area
  const inputArea = document.querySelector('.assistant-input-container, .input-container, .ai-chat-input');
  if (!inputArea || document.getElementById('pdf-upload-btn')) return;
  
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'pdf-upload-wrapper';
  wrapper.style.cssText = 'margin-bottom: 10px;';
  
  // Preview area
  const preview = document.createElement('div');
  preview.id = 'pdf-preview-area';
  
  // Upload button
  const btn = document.createElement('button');
  btn.id = 'pdf-upload-btn';
  btn.innerHTML = '📄 Upload PDF';
  btn.style.cssText = `
    padding: 8px 16px; background: linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.1));
    border: 1px solid rgba(79, 195, 247, 0.4); border-radius: 8px; color: #4fc3f7;
    cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;
  `;
  btn.onmouseenter = () => btn.style.background = 'rgba(79, 195, 247, 0.3)';
  btn.onmouseleave = () => btn.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.1))';
  
  btn.onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.multiple = true;
    
    input.onchange = async () => {
      if (!input.files?.length) return;
      
      btn.innerHTML = '⏳ Processing...';
      btn.style.opacity = '0.7';
      
      for (const file of Array.from(input.files)) {
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;
        
        try {
          const { text, pages, scanned } = await extractText(file);
          
          pdfFiles.push({
            id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: file.size,
            pageCount: pages,
            text,
            isScanned: scanned
          });
          
          console.log(`📄 Processed: ${file.name} - ${pages} pages, ${text.length} chars`);
        } catch (e) {
          console.error('PDF process error:', e);
          showToast(`Failed to process ${file.name}`, 'error');
        }
      }
      
      btn.innerHTML = '📄 Upload PDF';
      btn.style.opacity = '1';
      updatePreview();
      
      if (pdfFiles.length > 0) {
        showToast(`✅ ${pdfFiles.length} PDF(s) ready. Ask your question!`, 'success');
      }
    };
    
    input.click();
  };
  
  wrapper.appendChild(preview);
  wrapper.appendChild(btn);
  inputArea.parentNode?.insertBefore(wrapper, inputArea);
  
  console.log('✅ PDF upload UI created');
}

// ============================================================================
// AI INTEGRATION - THE KEY PART!
// ============================================================================

function getPdfContext(): string {
  if (pdfFiles.length === 0) return '';
  
  let ctx = '\n=== ATTACHED PDF FILES ===\n';
  
  for (const pdf of pdfFiles) {
    ctx += `\n📄 ${pdf.name} (${pdf.pageCount} pages)\n`;
    if (pdf.text) {
      ctx += '```\n';
      ctx += pdf.text.length > 50000 ? pdf.text.substring(0, 50000) + '\n[...truncated...]' : pdf.text;
      ctx += '\n```\n';
    } else {
      ctx += '[Scanned PDF - no text extracted]\n';
    }
  }
  
  ctx += '\n=== END PDF FILES ===\n';
  return ctx;
}

function patchSendMessage(): void {
  const w = window as any;
  
  const tryPatch = () => {
    if (typeof w.sendMessageDirectly !== 'function') return false;
    
    const original = w.sendMessageDirectly;
    
    w.sendMessageDirectly = async function(msg: string): Promise<void> {
      if (pdfFiles.length > 0) {
        const ctx = getPdfContext();
        msg = ctx + '\nUSER QUESTION: ' + msg;
        console.log(`📎 Sending ${pdfFiles.length} PDF(s) to AI (${msg.length} chars)`);
      }
      
      const result = await original(msg);
      
      // Clear PDFs after send
      if (pdfFiles.length > 0) {
        pdfFiles = [];
        updatePreview();
      }
      
      return result;
    };
    
    console.log('✅ sendMessageDirectly patched for PDF support');
    return true;
  };
  
  if (!tryPatch()) {
    setTimeout(() => tryPatch() || setTimeout(() => tryPatch(), 2000), 1000);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init(): void {
  console.log('📄 Initializing PDF handler...');
  
  // Preload PDF.js
  loadPdfJs().catch(e => console.warn('PDF.js preload:', e));
  
  // Intercept PDF file events
  interceptPdfEvents();
  
  // Create UI when DOM ready
  const setup = () => {
    createUploadUI();
    patchSendMessage();
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 500));
  } else {
    setTimeout(setup, 500);
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as any).pdfHandler = {
  get files() { return pdfFiles; },
  getPdfContext,
  clear: () => { pdfFiles = []; updatePreview(); },
  
  debug: () => {
    console.log('📄 PDF Handler Status');
    console.log('  Files:', pdfFiles.length);
    pdfFiles.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - ${p.pageCount} pages, ${p.text.length} chars`);
    });
    if (pdfFiles.length) {
      console.log('\n📄 Context preview:');
      console.log(getPdfContext().substring(0, 1500));
    }
  }
};

// AUTO-INITIALIZE
init();

console.log('✅ PDF Handler ready! Use window.pdfHandler.debug() to check status');
