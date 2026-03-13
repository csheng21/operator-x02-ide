// fileHandlers/fileState.ts - Enhanced state management for file uploads with OCR support

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FileType = 
  | 'pdf' 
  | 'image' 
  | 'code' 
  | 'text' 
  | 'document' 
  | 'spreadsheet'
  | 'binary'
  | 'unknown';

export type ExtractionMethod = 
  | 'pdf-text'           // PDF.js text extraction
  | 'pdf-ocr'            // AI Vision OCR for scanned PDFs
  | 'image-ocr'          // AI Vision OCR for images
  | 'direct-read'        // Direct text file read
  | 'base64-only'        // Binary file, no extraction
  | 'pending'            // Not yet processed
  | 'failed';            // Extraction failed

export interface ProcessedFile {
  id: string;
  name: string;
  path: string;
  type: FileType;
  mimeType: string;
  size: number;
  content: string | Uint8Array | null;  // Text content or binary
  textContent: string | null;            // Extracted text (for PDFs/images)
  base64Data: string | null;             // Base64 for images/binary
  previewUrl: string | null;             // Blob URL for preview
  extractionMethod: ExtractionMethod;
  pageCount?: number;                    // For PDFs
  isScanned?: boolean;                   // True if PDF appears scanned
  ocrProcessed?: boolean;                // Whether OCR was performed
  metadata?: FileMetadata;
  error?: string;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  author?: string;
  creationDate?: string;
  modificationDate?: string;
  title?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
}

// ============================================================================
// STATE
// ============================================================================

// Shared state for file uploads - now using ProcessedFile type
export let uploadedFiles: ProcessedFile[] = [];
export let isUploading = false;
export let isProcessingOCR = false;
export let ocrProgress: { current: number; total: number } | null = null;

// ============================================================================
// FILE STATE MANAGEMENT
// ============================================================================

/**
 * Generates a unique file ID
 */
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Updates the uploaded files array
 * @param files Array of files to add to the state
 */
export function addUploadedFiles(files: ProcessedFile[]): void {
  uploadedFiles = [...uploadedFiles, ...files];
  notifyStateChange();
}

/**
 * Adds a single file to the uploaded files
 * @param file File to add
 */
export function addUploadedFile(file: ProcessedFile): void {
  uploadedFiles = [...uploadedFiles, file];
  notifyStateChange();
}

/**
 * Updates a file in the uploaded files array
 * @param id File ID to update
 * @param updates Partial file object with updates
 */
export function updateUploadedFile(id: string, updates: Partial<ProcessedFile>): void {
  uploadedFiles = uploadedFiles.map(file => 
    file.id === id ? { ...file, ...updates } : file
  );
  notifyStateChange();
}

/**
 * Removes a file from the uploaded files array by index
 * @param index Index of the file to remove
 */
export function removeUploadedFile(index: number): void {
  const file = uploadedFiles[index];
  if (file?.previewUrl) {
    URL.revokeObjectURL(file.previewUrl);
  }
  uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
  notifyStateChange();
}

/**
 * Removes a file from the uploaded files array by ID
 * @param id ID of the file to remove
 */
export function removeUploadedFileById(id: string): void {
  const file = uploadedFiles.find(f => f.id === id);
  if (file?.previewUrl) {
    URL.revokeObjectURL(file.previewUrl);
  }
  uploadedFiles = uploadedFiles.filter(f => f.id !== id);
  notifyStateChange();
}

/**
 * Gets a file by ID
 * @param id File ID
 */
export function getUploadedFileById(id: string): ProcessedFile | undefined {
  return uploadedFiles.find(f => f.id === id);
}

/**
 * Sets the uploading state
 * @param state New uploading state
 */
export function setUploadingState(state: boolean): void {
  isUploading = state;
}

/**
 * Sets the OCR processing state
 * @param state New OCR processing state
 */
export function setOCRProcessingState(state: boolean): void {
  isProcessingOCR = state;
  if (!state) {
    ocrProgress = null;
  }
}

/**
 * Updates OCR progress
 * @param current Current file being processed
 * @param total Total files to process
 */
export function updateOCRProgress(current: number, total: number): void {
  ocrProgress = { current, total };
  notifyStateChange();
}

/**
 * Resets all file state (clears uploaded files and resets uploading flag)
 */
export function resetFileState(): void {
  // Revoke all blob URLs
  uploadedFiles.forEach(file => {
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
  
  uploadedFiles = [];
  isUploading = false;
  isProcessingOCR = false;
  ocrProgress = null;
  
  const filePreview = document.getElementById('file-preview');
  if (filePreview) {
    filePreview.innerHTML = '';
  }
  
  notifyStateChange();
}

/**
 * Gets all files that have extracted text content
 */
export function getFilesWithTextContent(): ProcessedFile[] {
  return uploadedFiles.filter(f => f.textContent && f.textContent.length > 0);
}

/**
 * Gets all image files for vision API
 */
export function getImageFiles(): ProcessedFile[] {
  return uploadedFiles.filter(f => f.type === 'image' && f.base64Data);
}

/**
 * Gets total size of all uploaded files
 */
export function getTotalUploadedSize(): number {
  return uploadedFiles.reduce((sum, f) => sum + f.size, 0);
}

// ============================================================================
// STATE CHANGE NOTIFICATION
// ============================================================================

type StateChangeListener = (files: ProcessedFile[]) => void;
const stateChangeListeners: StateChangeListener[] = [];

/**
 * Subscribe to state changes
 * @param listener Callback function
 * @returns Unsubscribe function
 */
export function onStateChange(listener: StateChangeListener): () => void {
  stateChangeListeners.push(listener);
  return () => {
    const index = stateChangeListeners.indexOf(listener);
    if (index > -1) {
      stateChangeListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of state change
 */
function notifyStateChange(): void {
  stateChangeListeners.forEach(listener => {
    try {
      listener([...uploadedFiles]);
    } catch (e) {
      console.error('State change listener error:', e);
    }
  });
  
  // Also dispatch a custom event for broader notification
  window.dispatchEvent(new CustomEvent('file-state-changed', {
    detail: { files: [...uploadedFiles] }
  }));
}

// ============================================================================
// DEBUG & WINDOW EXPORT
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).fileState = {
    get uploadedFiles() { return uploadedFiles; },
    get isUploading() { return isUploading; },
    get isProcessingOCR() { return isProcessingOCR; },
    get ocrProgress() { return ocrProgress; },
    resetFileState,
    getFilesWithTextContent,
    getImageFiles
  };
}
