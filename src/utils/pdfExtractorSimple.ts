// src/utils/pdfExtractorSimple.ts
// ============================================================================
// SIMPLE PDF TEXT EXTRACTOR - All-in-one solution
// Just import this file and PDFs will auto-extract when dropped
// ============================================================================

console.log('[PDFExtract] Loading...');

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjs: any = null;

// Load PDF.js library
async function loadLib(): Promise<any> {
  if (pdfjs) return pdfjs;
  if ((window as any).pdfjsLib) {
    pdfjs = (window as any).pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
    return pdfjs;
  }
  
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = () => {
      pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      console.log('[PDFExtract] PDF.js loaded');
      resolve(pdfjs);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Extract text from PDF data
async function extract(data: ArrayBuffer): Promise<string> {
  const lib = await loadLib();
  const doc = await lib.getDocument({ data }).promise;
  
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((x: any) => x.str).join(' ');
    parts.push(`--- Page ${i} of ${doc.numPages} ---\n${text}`);
  }
  
  return parts.join('\n\n');
}

// Show toast notification
function toast(msg: string, ok = true): void {
  const el = document.getElementById('pdf-toast');
  if (el) el.remove();
  
  const d = document.createElement('div');
  d.id = 'pdf-toast';
  d.style.cssText = `
    position:fixed; bottom:100px; right:20px;
    background:${ok ? '#22c55e' : '#ef4444'}; color:#fff;
    padding:14px 22px; border-radius:10px; z-index:100001;
    font-size:14px; box-shadow:0 4px 15px rgba(0,0,0,0.3);
    max-width:400px;
  `;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 5000);
}

// Put text in chat input
function toChat(text: string, name: string): void {
  const input = document.querySelector(
    '#user-input, textarea.chat-input, textarea[placeholder*="anything"]'
  ) as HTMLTextAreaElement;
  
  if (!input) {
    toast('Chat input not found!', false);
    return;
  }
  
  // Truncate if needed
  const max = 40000;
  let t = text;
  if (t.length > max) {
    t = t.slice(0, max) + '\n\n[... truncated ...]';
  }
  
  input.value = `PDF: "${name}" (${text.length.toLocaleString()} chars extracted)\n\n\`\`\`\n${t}\n\`\`\`\n\nPlease analyze this document.`;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  
  toast(`Extracted ${text.length.toLocaleString()} characters from PDF!`);
}

// Process a File object
async function processFile(file: File): Promise<void> {
  console.log('[PDFExtract] Processing:', file.name);
  toast('Extracting PDF text...', true);
  
  try {
    const buf = await file.arrayBuffer();
    const text = await extract(buf);
    
    if (!text || text.trim().length < 10) {
      toast('PDF has no text (might be scanned)', false);
      return;
    }
    
    toChat(text, file.name);
  } catch (e) {
    console.error('[PDFExtract] Error:', e);
    toast('Failed: ' + (e as Error).message, false);
  }
}

// Process from Tauri file path
async function processPath(path: string): Promise<void> {
  const name = path.split(/[/\\]/).pop() || 'document.pdf';
  console.log('[PDFExtract] Processing path:', path);
  toast('Extracting PDF text...', true);
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const bytes = await invoke('read_file_binary', { path }) as number[];
    const buf = new Uint8Array(bytes).buffer;
    const text = await extract(buf);
    
    if (!text || text.trim().length < 10) {
      toast('PDF has no text (might be scanned)', false);
      return;
    }
    
    toChat(text, name);
  } catch (e) {
    console.error('[PDFExtract] Error:', e);
    toast('Failed: ' + (e as Error).message, false);
  }
}

// Hook into binary blocker - show prompt when PDF is blocked
function hookBlocker(): void {
  const check = () => {
    const w = window as any;
    if (!w.openFileInTab || w.__pdfExtractHooked) return false;
    
    const orig = w.openFileInTab;
    w.openFileInTab = async function(path: string, ...args: any[]) {
      // Check if it's a PDF that will be blocked
      if (path.toLowerCase().endsWith('.pdf')) {
        // Store for later
        w.__lastPdfPath = path;
        
        // Show extract option after a short delay (after blocker toast)
        setTimeout(() => {
          if (confirm(`PDF detected: ${path.split(/[/\\]/).pop()}\n\nExtract text for AI analysis?`)) {
            processPath(path);
          }
        }, 200);
      }
      return orig.call(this, path, ...args);
    };
    
    w.__pdfExtractHooked = true;
    console.log('[PDFExtract] Hooked into file opener');
    return true;
  };
  
  if (!check()) {
    let n = 0;
    const i = setInterval(() => {
      if (check() || ++n > 30) clearInterval(i);
    }, 200);
  }
}

// Listen for file input (attach button)
document.addEventListener('change', (e) => {
  const inp = e.target as HTMLInputElement;
  if (inp.type !== 'file' || !inp.files) return;
  
  for (const f of Array.from(inp.files)) {
    if (f.name.toLowerCase().endsWith('.pdf')) {
      if (confirm(`Extract text from ${f.name} for AI?`)) {
        processFile(f);
      }
    }
  }
});

// Ctrl+Shift+E to extract last PDF
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    const path = (window as any).__lastPdfPath;
    if (path) {
      processPath(path);
    } else {
      toast('No PDF to extract. Drop a PDF first.', false);
    }
  }
});

// Initialize
hookBlocker();

// Expose globally
(window as any).pdfExtract = {
  processFile,
  processPath,
  extract
};

console.log('[PDFExtract] Ready! Ctrl+Shift+E to extract last PDF');
