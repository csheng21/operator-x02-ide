// src/utils/globalBinaryBlocker.ts
// ============================================================================
// BINARY FILE BLOCKER (v2 - Seamless Integration)
// Blocks binary files from Monaco editor
// PDFs are silently added to context bar - no popup dialogs
// ============================================================================

import { pdfContextManager } from './pdfContextManager';

console.log('[BinaryBlocker] Loading module...');

const BINARY_EXTENSIONS = new Set([
  // Documents (PDFs handled specially)
  'pdf',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg', 'tiff', 'psd',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma',
  // Video
  'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso',
  // Executables
  'exe', 'dll', 'so', 'dylib', 'bin', 'msi', 'dmg', 'apk',
  // Office (binary formats)
  'doc', 'xls', 'ppt',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  // Database & Compiled
  'db', 'sqlite', 'mdb', 'class', 'pyc', 'o', 'obj'
]);

function isBinaryFile(path: string): boolean {
  if (!path) return false;
  const ext = (path.split('.').pop() || '').toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}

// Simple toast for non-PDF binary files
function showBlockedToast(fileName: string, ext: string): void {
  const id = 'binary-blocked-toast';
  document.getElementById(id)?.remove();

  const toast = document.createElement('div');
  toast.id = id;
  toast.style.cssText = `
    position: fixed;
    bottom: 60px;
    right: 20px;
    background: #475569;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    z-index: 100000;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  toast.textContent = `${ext.toUpperCase()} file cannot be opened in editor`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Apply patch to window.openFileInTab
function applyPatch(): boolean {
  const win = window as any;

  if (win.openFileInTab && !win.__binaryBlockerPatched) {
    const original = win.openFileInTab;

    win.openFileInTab = async function (path: string, ...args: any[]) {
      if (isBinaryFile(path)) {
        const fileName = path.split(/[/\\]/).pop() || path;
        const ext = (path.split('.').pop() || '').toLowerCase();

        console.log('[BinaryBlocker] BLOCKED:', path);

        if (isPdf(path)) {
          // ✅ Silently add to PDF context (no popup!)
          pdfContextManager.addPdf(path);
        } else {
          // Show simple toast for other binary files
          showBlockedToast(fileName, ext);
        }

        return; // Block from Monaco
      }
      
      return original.call(this, path, ...args);
    };

    win.__binaryBlockerPatched = true;
    console.log('[BinaryBlocker] Patched successfully!');
    return true;
  }

  return false;
}

// Retry patching
let attempts = 0;
const maxAttempts = 50;

function tryPatch(): void {
  attempts++;
  if (applyPatch()) return;
  
  if (attempts < maxAttempts) {
    setTimeout(tryPatch, 100);
  } else {
    console.warn('[BinaryBlocker] Failed to patch after timeout');
  }
}

tryPatch();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryPatch, 100));
}

// Export
export const binaryBlocker = {
  isBinaryFile,
  isPdf,
  BINARY_EXTENSIONS: Array.from(BINARY_EXTENSIONS),
  isActive: () => !!(window as any).__binaryBlockerPatched
};

(window as any).__binaryBlocker = binaryBlocker;

console.log('[BinaryBlocker] Ready!');
