// fileHandlers/fileUploadHandler.ts - Enhanced file upload with PDF extraction and OCR

import { 
  isUploading, 
  setUploadingState, 
  addUploadedFiles, 
  uploadedFiles,
  setOCRProcessingState,
  updateOCRProgress,
  generateFileId,
  updateUploadedFile,
  ProcessedFile,
  FileType,
  ExtractionMethod
} from './fileState';
import { displayFilesInPreview, showProcessingIndicator, hideProcessingIndicator } from './fileUploadUI';
import { 
  readFileAsText, 
  readFileAsBase64,
  isTextFileMime, 
  getFileTypeFromMime,
  extractPdfText,
  renderPdfPagesToImages,
  getImageDimensions,
  loadPdfJs,
  detectLanguageFromExtension
} from './fileUtils';
import { performAIOCR, OCROptions, getOCRConfig } from './ocrProvider';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface FileUploadConfig {
  maxFileSizeMB: number;
  enableOCR: boolean;
  autoExtractText: boolean;
  acceptedTypes: string;
}

let config: FileUploadConfig = {
  maxFileSizeMB: 50,
  enableOCR: true,
  autoExtractText: true,
  acceptedTypes: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.txt,.md,.json,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.rs,.go'
};

export function setUploadConfig(newConfig: Partial<FileUploadConfig>): void {
  config = { ...config, ...newConfig };
}

// ============================================================================
// MAIN UPLOAD HANDLER
// ============================================================================

/**
 * Attaches file upload functionality to a button
 * @param uploadBtn The button to attach the handler to
 * @param filePreview The element to display file previews in
 */
export function attachFileUploadHandler(uploadBtn: HTMLElement, filePreview: HTMLElement | null): void {
  console.log('📎 Attaching enhanced upload handler to button', uploadBtn);
  
  // Preload PDF.js
  loadPdfJs().catch(err => console.warn('PDF.js preload failed:', err));
  
  uploadBtn.addEventListener('click', async (event) => {
    console.log('📥 UPLOAD BUTTON CLICKED');
    console.log('📊 Current isUploading state:', isUploading);
    
    event.preventDefault();
    event.stopPropagation();
    
    // Prevent multiple file dialogs from opening
    if (isUploading) {
      console.log('⚠️ Upload already in progress, force resetting...');
      setUploadingState(false);
    }
    
    setUploadingState(true);
    console.log('✅ Set uploading state to true');
    
    try {
      // Use browser's file input
      console.log('📂 Creating file input...');
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = config.acceptedTypes;
      
      input.onchange = async (e) => {
        console.log('✅ File input onChange fired');
        const fileList = (e.target as HTMLInputElement).files;
        if (!fileList || fileList.length === 0) {
          console.log('❌ No files selected');
          setUploadingState(false);
          return;
        }
        
        console.log(`📁 ${fileList.length} files selected`);
        
        // Show processing indicator
        showProcessingIndicator(filePreview, 'Processing files...');
        
        try {
          // Process files with enhanced handling
          const files = await processSelectedFiles(fileList, filePreview);
          
          // Add to tracked files
          addUploadedFiles(files);
          
          // Display files in preview
          displayFilesInPreview(uploadedFiles, filePreview);
          
          console.log('✅ Upload complete');
        } catch (error) {
          console.error('❌ Error processing files:', error);
          hideProcessingIndicator();
        } finally {
          setUploadingState(false);
        }
      };
      
      // Add handler for dialog cancellation
      const resetTimer = window.setTimeout(() => {
        console.log('⏰ File dialog timeout - resetting state');
        setUploadingState(false);
      }, 60000);
      
      // Track when dialog closes
      window.addEventListener('focus', function onFocus() {
        console.log('🔍 Window regained focus - dialog likely closed');
        clearTimeout(resetTimer);
        setTimeout(() => {
          if (isUploading) {
            console.log('🔄 Auto-resetting isUploading flag');
            setUploadingState(false);
          }
        }, 300);
        window.removeEventListener('focus', onFocus);
      }, { once: true });
      
      console.log('🚀 Opening file dialog...');
      input.click();
      
    } catch (error) {
      console.error('❌ Error handling file upload:', error);
      alert('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setUploadingState(false);
    }
  });
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

/**
 * Processes selected files from the file input with enhanced PDF/OCR support
 * @param fileList The FileList object from the file input
 * @param filePreview Preview element for status updates
 * @returns Array of processed file objects
 */
async function processSelectedFiles(
  fileList: FileList, 
  filePreview: HTMLElement | null
): Promise<ProcessedFile[]> {
  const files: ProcessedFile[] = [];
  const totalFiles = fileList.length;
  
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const fileType = getFileTypeFromMime(file.type, file.name);
    
    showProcessingIndicator(filePreview, `Processing ${file.name} (${i + 1}/${totalFiles})...`);
    
    try {
      // Check file size
      if (file.size > config.maxFileSizeMB * 1024 * 1024) {
        files.push(createErrorFile(file, `File too large. Maximum size is ${config.maxFileSizeMB}MB.`));
        continue;
      }
      
      let processedFile: ProcessedFile;
      
      switch (fileType) {
        case 'pdf':
          processedFile = await processPdfFile(file, filePreview);
          break;
        case 'image':
          processedFile = await processImageFile(file);
          break;
        case 'code':
        case 'text':
          processedFile = await processTextFile(file, fileType);
          break;
        default:
          processedFile = await processBinaryFile(file, fileType);
      }
      
      files.push(processedFile);
      
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      files.push(createErrorFile(file, `Processing failed: ${error}`));
    }
  }
  
  hideProcessingIndicator();
  return files;
}

/**
 * Creates an error file entry
 */
function createErrorFile(file: File, errorMessage: string): ProcessedFile {
  return {
    id: generateFileId(),
    name: file.name,
    path: file.name,
    type: getFileTypeFromMime(file.type, file.name),
    mimeType: file.type,
    size: file.size,
    content: null,
    textContent: null,
    base64Data: null,
    previewUrl: null,
    extractionMethod: 'failed',
    error: errorMessage
  };
}

// ============================================================================
// PDF PROCESSING
// ============================================================================

/**
 * Processes a PDF file with text extraction and optional OCR
 */
async function processPdfFile(file: File, filePreview: HTMLElement | null): Promise<ProcessedFile> {
  console.log(`📄 Processing PDF: ${file.name}`);
  
  const base64Data = await readFileAsBase64(file);
  const previewUrl = URL.createObjectURL(file);
  
  // First, try PDF.js text extraction
  let pdfResult;
  try {
    showProcessingIndicator(filePreview, `Extracting text from ${file.name}...`);
    pdfResult = await extractPdfText(file);
  } catch (error) {
    console.error('PDF.js extraction failed:', error);
    pdfResult = {
      text: '',
      pageCount: 0,
      metadata: {},
      isScanned: true,
      pages: []
    };
  }
  
  const processedFile: ProcessedFile = {
    id: generateFileId(),
    name: file.name,
    path: file.name,
    type: 'pdf',
    mimeType: file.type,
    size: file.size,
    content: pdfResult.text || null,
    textContent: pdfResult.text || null,
    base64Data,
    previewUrl,
    extractionMethod: 'pdf-text',
    pageCount: pdfResult.pageCount,
    isScanned: pdfResult.isScanned,
    ocrProcessed: false,
    metadata: pdfResult.metadata
  };
  
  // If PDF appears to be scanned and OCR is enabled, use AI Vision
  if (pdfResult.isScanned && config.enableOCR && config.autoExtractText) {
    console.log('📷 PDF appears to be scanned, attempting AI OCR...');
    showProcessingIndicator(filePreview, `Running OCR on ${file.name}...`);
    
    try {
      setOCRProcessingState(true);
      
      // Render PDF pages to images for OCR
      const pdfImages = await renderPdfPagesToImages(file, 5); // First 5 pages
      const ocrTexts: string[] = [];
      
      for (let i = 0; i < pdfImages.length; i++) {
        updateOCRProgress(i + 1, pdfImages.length);
        showProcessingIndicator(filePreview, `OCR page ${i + 1}/${pdfImages.length} of ${file.name}...`);
        
        const ocrResult = await performAIOCR(
          pdfImages[i].base64, 
          'image/png',
          { prompt: `Extract all text from page ${i + 1} of this PDF document. Preserve layout and structure.` }
        );
        ocrTexts.push(`--- Page ${i + 1} (OCR) ---\n${ocrResult.text}`);
      }
      
      processedFile.textContent = ocrTexts.join('\n\n');
      processedFile.content = processedFile.textContent;
      processedFile.extractionMethod = 'pdf-ocr';
      processedFile.ocrProcessed = true;
      
      console.log('✅ PDF OCR complete');
      
    } catch (error) {
      console.error('PDF OCR failed:', error);
      processedFile.error = `PDF appears to be scanned. OCR failed: ${error}`;
    } finally {
      setOCRProcessingState(false);
    }
  }
  
  return processedFile;
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Processes an image file with optional OCR
 */
async function processImageFile(file: File): Promise<ProcessedFile> {
  console.log(`🖼️ Processing image: ${file.name}`);
  
  const base64Data = await readFileAsBase64(file);
  const previewUrl = URL.createObjectURL(file);
  const dimensions = await getImageDimensions(previewUrl);
  
  const processedFile: ProcessedFile = {
    id: generateFileId(),
    name: file.name,
    path: file.name,
    type: 'image',
    mimeType: file.type,
    size: file.size,
    content: null,
    textContent: null,
    base64Data,
    previewUrl,
    extractionMethod: 'base64-only',
    ocrProcessed: false,
    metadata: {
      width: dimensions.width,
      height: dimensions.height
    }
  };
  
  // Optionally perform OCR on images if enabled
  if (config.enableOCR && config.autoExtractText && getOCRConfig().autoOCRImages) {
    try {
      console.log('📷 Running OCR on image...');
      setOCRProcessingState(true);
      
      const ocrResult = await performAIOCR(base64Data, file.type);
      
      if (ocrResult.text && ocrResult.text.trim().length > 0) {
        processedFile.textContent = ocrResult.text;
        processedFile.extractionMethod = 'image-ocr';
        processedFile.ocrProcessed = true;
        console.log('✅ Image OCR complete');
      }
    } catch (error) {
      console.warn('Image OCR failed:', error);
      // Don't set as error, image is still usable
    } finally {
      setOCRProcessingState(false);
    }
  }
  
  return processedFile;
}

// ============================================================================
// TEXT FILE PROCESSING
// ============================================================================

/**
 * Processes a text or code file
 */
async function processTextFile(file: File, fileType: FileType): Promise<ProcessedFile> {
  console.log(`📝 Processing text file: ${file.name}`);
  
  const content = await readFileAsText(file);
  
  return {
    id: generateFileId(),
    name: file.name,
    path: file.name,
    type: fileType,
    mimeType: file.type || 'text/plain',
    size: file.size,
    content,
    textContent: content,
    base64Data: null,
    previewUrl: null,
    extractionMethod: 'direct-read',
    metadata: {
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      language: detectLanguageFromExtension(file.name)
    }
  };
}

// ============================================================================
// BINARY FILE PROCESSING
// ============================================================================

/**
 * Processes a binary file (documents, archives, etc.)
 */
async function processBinaryFile(file: File, fileType: FileType): Promise<ProcessedFile> {
  console.log(`📦 Processing binary file: ${file.name}`);
  
  const base64Data = await readFileAsBase64(file);
  const previewUrl = URL.createObjectURL(file);
  
  return {
    id: generateFileId(),
    name: file.name,
    path: file.name,
    type: fileType,
    mimeType: file.type,
    size: file.size,
    content: null,
    textContent: null,
    base64Data,
    previewUrl,
    extractionMethod: 'base64-only'
  };
}

// ============================================================================
// MANUAL OCR TRIGGER
// ============================================================================

/**
 * Manually triggers OCR on a file
 * @param fileId The ID of the file to OCR
 * @param options OCR options
 */
export async function triggerOCRForFile(fileId: string, options?: OCROptions): Promise<void> {
  const file = uploadedFiles.find(f => f.id === fileId);
  if (!file) {
    console.error('File not found:', fileId);
    return;
  }
  
  if (!file.base64Data) {
    console.error('File has no base64 data for OCR');
    return;
  }
  
  try {
    setOCRProcessingState(true);
    console.log(`📷 Running OCR on ${file.name}...`);
    
    const ocrResult = await performAIOCR(file.base64Data, file.mimeType, options);
    
    updateUploadedFile(fileId, {
      textContent: ocrResult.text,
      extractionMethod: file.type === 'pdf' ? 'pdf-ocr' : 'image-ocr',
      ocrProcessed: true
    });
    
    console.log('✅ Manual OCR complete');
    
  } catch (error) {
    console.error('OCR failed:', error);
    updateUploadedFile(fileId, {
      error: `OCR failed: ${error}`
    });
  } finally {
    setOCRProcessingState(false);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { config as uploadConfig };
