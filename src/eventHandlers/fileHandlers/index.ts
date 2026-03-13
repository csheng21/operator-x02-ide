// fileHandlers/index.ts - Simplified single-file exports (no external dependencies)
// All key functions are inlined here to avoid import issues

// ============================================================================
// RE-EXPORTS FROM CORE FILES
// ============================================================================

// State management
export {
  uploadedFiles,
  isUploading,
  isProcessingOCR,
  ocrProgress,
  addUploadedFiles,
  addUploadedFile,
  removeUploadedFile,
  removeUploadedFileById,
  updateUploadedFile,
  getUploadedFileById,
  setUploadingState,
  setOCRProcessingState,
  updateOCRProgress,
  resetFileState,
  getFilesWithTextContent,
  getImageFiles,
  getTotalUploadedSize,
  onStateChange,
  generateFileId,
  type ProcessedFile,
  type FileType,
  type ExtractionMethod,
  type FileMetadata
} from './fileState';

// Utilities
export {
  loadPdfJs,
  isPdfJsLoaded,
  extractPdfText,
  renderPdfPagesToImages,
  readFileAsText,
  readFileAsBase64,
  readFileAsArrayBuffer,
  readFileAsDataURL,
  isTextFileMime,
  getFileTypeFromMime,
  detectLanguageFromExtension,
  escapeHtml,
  formatFileSize,
  getMimeType,
  getFileIcon,
  getImageDimensions,
  resizeImage,
  type PDFExtractionResult
} from './fileUtils';

// Upload handler
export {
  attachFileUploadHandler,
  setUploadConfig,
  triggerOCRForFile,
  uploadConfig
} from './fileUploadHandler';

// UI
export {
  setupFileUploadUI,
  displayFilesInPreview,
  showProcessingIndicator,
  hideProcessingIndicator,
  updateProcessingMessage
} from './fileUploadUI';

// Processor
export {
  sendFileToConversation,
  formatFileForAIContext,
  prepareMessageWithFiles
} from './fileProcessor';

// OCR provider
export {
  performAIOCR,
  showOCRSettingsModal,
  getOCRConfig,
  saveOCRConfig,
  loadOCRConfig,
  type OCRProvider,
  type OCROptions,
  type OCRResult,
  type OCRConfig
} from './ocrProvider';

// ============================================================================
// INLINED: FILE CONTEXT FOR AI (was conversationIntegration.ts)
// ============================================================================

import { uploadedFiles, resetFileState, ProcessedFile } from './fileState';
import { formatFileSize } from './fileUtils';

/**
 * Builds the file context string to prepend to user messages
 * This is what makes uploaded PDFs readable by the AI
 */
export function buildUploadedFileContext(): string {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return '';
  }
  
  const contextParts: string[] = [];
  contextParts.push('\n=== UPLOADED FILES ===\n');
  
  for (const file of uploadedFiles) {
    contextParts.push(formatSingleFileForContext(file));
  }
  
  contextParts.push('\n=== END UPLOADED FILES ===\n');
  
  return contextParts.join('\n');
}

function formatSingleFileForContext(file: ProcessedFile): string {
  const parts: string[] = [];
  
  parts.push(`\n📄 FILE: ${file.name}`);
  parts.push(`   Type: ${file.type} | Size: ${formatFileSize(file.size)}`);
  
  if (file.pageCount) {
    parts.push(`   Pages: ${file.pageCount}`);
  }
  
  if (file.extractionMethod === 'pdf-ocr' || file.extractionMethod === 'image-ocr') {
    parts.push(`   Note: Text extracted via OCR`);
  }
  
  const textContent = file.textContent || (typeof file.content === 'string' ? file.content : null);
  
  if (textContent && textContent.trim().length > 0) {
    parts.push('\n   CONTENT:');
    parts.push('   ```');
    
    const maxLength = 50000;
    if (textContent.length > maxLength) {
      parts.push('   ' + textContent.substring(0, maxLength).split('\n').join('\n   '));
      parts.push(`\n   ... [Truncated - ${textContent.length - maxLength} more characters]`);
    } else {
      parts.push('   ' + textContent.split('\n').join('\n   '));
    }
    parts.push('   ```');
  } else if (file.type === 'image' && file.base64Data) {
    parts.push('\n   [Image attached - visual content]');
  } else if (file.type === 'pdf' && file.isScanned) {
    parts.push('\n   [Scanned PDF - OCR not performed. Enable OCR in settings.]');
  } else {
    parts.push('\n   [Binary file - no text content]');
  }
  
  return parts.join('\n');
}

/**
 * Gets images for vision-capable APIs
 */
export function getUploadedImages(): Array<{ base64: string; mimeType: string; filename: string }> {
  if (!uploadedFiles) return [];
  
  return uploadedFiles
    .filter(f => f.type === 'image' && f.base64Data)
    .map(f => ({
      base64: f.base64Data!,
      mimeType: f.mimeType || 'image/png',
      filename: f.name
    }));
}

/**
 * Check if there are uploaded files
 */
export function hasUploadedFiles(): boolean {
  return uploadedFiles && uploadedFiles.length > 0;
}

/**
 * Clear uploaded files after sending
 */
export function clearUploadedFiles(): void {
  resetFileState();
}

// ============================================================================
// INLINED: sendMessageDirectly PATCH (was assistantUI_fileUploadPatch.ts)
// ============================================================================

let isPatched = false;

/**
 * Patches sendMessageDirectly to automatically include file content
 */
export function initializeFileUploadIntegration(): void {
  if (isPatched) {
    console.log('📎 File upload integration already initialized');
    return;
  }
  
  console.log('📎 Initializing file upload integration...');
  
  const w = window as any;
  
  const tryPatch = () => {
    if (typeof w.sendMessageDirectly === 'function') {
      const originalSend = w.sendMessageDirectly;
      
      w.sendMessageDirectly = async function(message: string): Promise<void> {
        // Check for uploaded files and enhance message
        if (hasUploadedFiles()) {
          const fileContext = buildUploadedFileContext();
          if (fileContext) {
            message = fileContext + '\n\nUSER QUESTION: ' + message;
            console.log('📎 Enhanced message with uploaded file content');
            console.log(`📄 ${uploadedFiles.length} file(s) attached`);
          }
        }
        
        // Call original function
        const result = await originalSend(message);
        
        // Clear files after successful send
        if (hasUploadedFiles()) {
          console.log('📎 Clearing uploaded files after send');
          clearUploadedFiles();
        }
        
        return result;
      };
      
      isPatched = true;
      console.log('✅ File upload integration active - PDFs will now be sent to AI');
      return true;
    }
    return false;
  };
  
  if (!tryPatch()) {
    setTimeout(() => {
      if (!tryPatch()) {
        setTimeout(() => {
          if (!tryPatch()) {
            console.warn('⚠️ Could not auto-patch sendMessageDirectly');
            console.log('📖 Manual integration required - add buildUploadedFileContext() to your send function');
          }
        }, 2000);
      }
    }, 1000);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Gets all attached files formatted for AI context
 */
export function getMessageWithFiles(userMessage: string): {
  text: string;
  images: Array<{ base64: string; mimeType: string }>;
  files: typeof uploadedFiles;
} {
  const fileContext = buildUploadedFileContext();
  const images = getUploadedImages();
  
  let text = userMessage;
  if (fileContext) {
    text = fileContext + '\n\nUSER QUESTION: ' + userMessage;
  }
  
  return { 
    text, 
    images: images.map(i => ({ base64: i.base64, mimeType: i.mimeType })), 
    files: [...uploadedFiles] 
  };
}

/**
 * Gets count of attached files
 */
export function getAttachedFilesCount(): number {
  return uploadedFiles?.length || 0;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

import { setupFileUploadUI } from './fileUploadUI';
import { attachFileUploadHandler } from './fileUploadHandler';
import { loadOCRConfig } from './ocrProvider';
import { loadPdfJs } from './fileUtils';

let initialized = false;

/**
 * Initializes the enhanced file handling system
 * Call this once when your app starts
 */
export function initializeFileHandling(): void {
  if (initialized) {
    console.log('📎 File handling already initialized');
    return;
  }
  
  console.log('📎 Initializing enhanced file handling system...');
  
  // Load OCR configuration
  loadOCRConfig();
  
  // Preload PDF.js
  loadPdfJs().catch(err => console.warn('PDF.js preload failed:', err));
  
  // Setup UI elements
  const setupUI = () => {
    let uploadBtn = document.getElementById('file-upload-btn');
    let filePreview = document.getElementById('file-preview');
    
    if (!uploadBtn || !filePreview) {
      console.log('📎 Creating file upload UI...');
      const { newUploadBtn, newFilePreview } = setupFileUploadUI();
      uploadBtn = newUploadBtn;
      filePreview = newFilePreview;
    }
    
    if (uploadBtn) {
      attachFileUploadHandler(uploadBtn as HTMLElement, filePreview);
      console.log('✅ File upload handler attached');
    } else {
      console.warn('⚠️ Could not find/create upload button');
    }
    
    // 📎 KEY: Initialize file upload integration with sendMessageDirectly
    initializeFileUploadIntegration();
  };
  
  // Setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUI);
  } else {
    setTimeout(setupUI, 100);
  }
  
  initialized = true;
  console.log('✅ Enhanced file handling system initialized');
}

// ============================================================================
// WINDOW EXPORTS (for debugging)
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).fileHandlers = {
    get uploadedFiles() { return uploadedFiles; },
    hasUploadedFiles,
    getAttachedFilesCount,
    getMessageWithFiles,
    buildUploadedFileContext,
    getUploadedImages,
    clearUploadedFiles,
    initializeFileHandling,
    initializeFileUploadIntegration,
    resetFileState,
    
    // Debug helper
    debug: () => {
      console.log('📎 Uploaded files:', uploadedFiles?.length || 0);
      if (uploadedFiles?.length > 0) {
        uploadedFiles.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.name} (${f.type}) - ${formatFileSize(f.size)}`);
          console.log(`     Text: ${f.textContent?.length || 0} chars`);
        });
        console.log('\n📄 Context preview:');
        const ctx = buildUploadedFileContext();
        console.log(ctx.substring(0, 1000) + (ctx.length > 1000 ? '...' : ''));
      }
    }
  };
  
  // Alias for easier access
  (window as any).fileUploadIntegration = (window as any).fileHandlers;
  
  console.log('📎 File handlers available on window.fileHandlers');
}
