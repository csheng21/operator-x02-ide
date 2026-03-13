// fileHandlers/fileUtils.ts - Enhanced utilities for file handling with PDF.js and OCR

import { FileType, FileMetadata } from './fileState';

// ============================================================================
// PDF.JS LOADER
// ============================================================================

let pdfJsLoaded = false;
let pdfJsLoadPromise: Promise<void> | null = null;

/**
 * Loads PDF.js library from CDN
 */
export async function loadPdfJs(): Promise<void> {
  if (pdfJsLoaded) return;
  if (pdfJsLoadPromise) return pdfJsLoadPromise;
  
  pdfJsLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).pdfjsLib) {
      pdfJsLoaded = true;
      resolve();
      return;
    }
    
    console.log('📄 Loading PDF.js...');
    
    // Load PDF.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfJsLoaded = true;
        console.log('✅ PDF.js loaded successfully');
        resolve();
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
  
  return pdfJsLoadPromise;
}

/**
 * Check if PDF.js is loaded
 */
export function isPdfJsLoaded(): boolean {
  return pdfJsLoaded && !!(window as any).pdfjsLib;
}

// ============================================================================
// PDF TEXT EXTRACTION
// ============================================================================

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: FileMetadata;
  isScanned: boolean;
  pages: string[];
}

/**
 * Extracts text from a PDF file using PDF.js
 * @param file The PDF file to extract text from
 * @returns Extraction result with text, metadata, and scanned status
 */
export async function extractPdfText(file: File): Promise<PDFExtractionResult> {
  await loadPdfJs();
  
  const pdfjsLib = (window as any).pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    console.log(`📄 Extracting text from PDF: ${file.name}`);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    const pages: string[] = [];
    let fullText = '';
    let totalChars = 0;
    
    // Extract metadata
    const metadata = await pdf.getMetadata().catch(() => null);
    const fileMetadata: FileMetadata = {
      pageCount,
      title: metadata?.info?.Title || undefined,
      author: metadata?.info?.Author || undefined,
      creationDate: metadata?.info?.CreationDate || undefined,
    };
    
    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      pages.push(pageText);
      fullText += (i > 1 ? '\n\n--- Page ' + i + ' ---\n\n' : '') + pageText;
      totalChars += pageText.length;
    }
    
    // Determine if PDF is likely scanned (very little extractable text)
    const avgCharsPerPage = totalChars / pageCount;
    const isScanned = avgCharsPerPage < 100; // Less than 100 chars per page suggests scanned
    
    fileMetadata.wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(`📄 PDF extracted: ${pageCount} pages, ${totalChars} chars, scanned: ${isScanned}`);
    
    return {
      text: fullText,
      pageCount,
      metadata: fileMetadata,
      isScanned,
      pages
    };
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract PDF text: ${error}`);
  }
}

/**
 * Renders PDF pages to images for OCR
 * @param file The PDF file
 * @param maxPages Maximum number of pages to render
 * @returns Array of page images as base64
 */
export async function renderPdfPagesToImages(
  file: File, 
  maxPages: number = 5
): Promise<Array<{ page: number; base64: string; width: number; height: number }>> {
  await loadPdfJs();
  
  const pdfjsLib = (window as any).pdfjsLib;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images: Array<{ page: number; base64: string; width: number; height: number }> = [];
  const pageCount = Math.min(pdf.numPages, maxPages);
  
  console.log(`📄 Rendering ${pageCount} PDF pages to images...`);
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const scale = 2.0; // Higher scale for better OCR
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    images.push({ 
      page: i, 
      base64,
      width: viewport.width,
      height: viewport.height
    });
    
    console.log(`📄 Rendered page ${i}/${pageCount}`);
  }
  
  return images;
}

// ============================================================================
// FILE READING UTILITIES
// ============================================================================

/**
 * Reads a file as text
 * @param file The file to read
 * @returns Promise resolving to the file content as string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Reads a file as ArrayBuffer
 * @param file The file to read
 * @returns Promise resolving to the file content as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Reads a file as base64 string
 * @param file The file to read
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a file as data URL
 * @param file The file to read
 * @returns Promise resolving to data URL string
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// FILE TYPE DETECTION
// ============================================================================

const MIME_TYPE_MAP: Record<string, FileType> = {
  // PDFs
  'application/pdf': 'pdf',
  
  // Images
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/svg+xml': 'image',
  
  // Code files
  'text/javascript': 'code',
  'application/javascript': 'code',
  'text/typescript': 'code',
  'text/x-python': 'code',
  'text/x-java': 'code',
  'text/x-c': 'code',
  'text/x-csharp': 'code',
  'text/x-rust': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/json': 'code',
  'application/xml': 'code',
  'text/xml': 'code',
  'text/x-yaml': 'code',
  
  // Text
  'text/plain': 'text',
  'text/markdown': 'text',
  'text/csv': 'text',
  
  // Documents
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/rtf': 'document',
  
  // Spreadsheets
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
};

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'rs', 'go', 'rb', 'php', 'swift', 'kt', 'scala', 'r',
  'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
  'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
  'md', 'markdown', 'rst', 'tex', 'dockerfile'
]);

/**
 * Checks if a file is text based on MIME type
 * @param mimeType The MIME type to check
 * @returns Boolean indicating if the file is a text file
 */
export function isTextFileMime(mimeType: string): boolean {
  return mimeType.startsWith('text/') || 
         mimeType === 'application/json' || 
         mimeType === 'application/xml';
}

/**
 * Determines file type from MIME type and extension
 * @param mimeType The MIME type
 * @param filename The filename (optional, for extension fallback)
 * @returns FileType
 */
export function getFileTypeFromMime(mimeType: string, filename?: string): FileType {
  // Check MIME type first
  if (MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }
  
  // Legacy compatibility
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('pdf') || 
      mimeType.includes('msword') || 
      mimeType.includes('officedocument')) return 'document';
  
  // Fall back to extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (CODE_EXTENSIONS.has(ext)) return 'code';
    if (['txt', 'log'].includes(ext)) return 'text';
    if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'document';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
  }
  
  return 'binary';
}

/**
 * Detects programming language from file extension
 * @param filename The filename
 * @returns Language identifier
 */
export function detectLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'rs': 'rust',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell'
  };
  return langMap[ext] || 'plaintext';
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Escapes HTML special characters to prevent XSS
 * @param text The text to escape
 * @returns Escaped HTML string
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns Formatted string (e.g., "2.5 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Gets the MIME type from a file extension
 * @param extension The file extension (without the dot)
 * @returns The MIME type for the extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'py': 'text/x-python',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Gets file icon emoji based on file type
 * @param type FileType
 * @returns Emoji icon
 */
export function getFileIcon(type: FileType): string {
  const icons: Record<FileType, string> = {
    pdf: '📄',
    image: '🖼️',
    code: '📝',
    text: '📃',
    document: '📋',
    spreadsheet: '📊',
    binary: '📦',
    unknown: '📎'
  };
  return icons[type] || '📎';
}

// ============================================================================
// IMAGE UTILITIES
// ============================================================================

/**
 * Gets image dimensions from a URL
 * @param url Image URL or data URL
 * @returns Promise with width and height
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

/**
 * Resizes an image to reduce file size
 * @param dataUrl The data URL of the image
 * @param maxWidth Maximum width
 * @param maxHeight Maximum height
 * @param quality JPEG quality (0-1)
 * @returns Promise resolving to resized image data URL
 */
export function resizeImage(
  dataUrl: string, 
  maxWidth: number = 400, 
  maxHeight: number = 300, 
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  loadPdfJs as ensurePdfJsLoaded
};
