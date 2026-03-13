// fileHandlers/fileUploadUI.ts - Enhanced UI components for file uploads with OCR support

import { formatFileSize, getFileIcon } from "./fileUtils";
import { 
  uploadedFiles, 
  removeUploadedFile, 
  removeUploadedFileById,
  ProcessedFile,
  isProcessingOCR,
  ocrProgress
} from "./fileState";
import { sendFileToConversation } from "./fileProcessor";
import { triggerOCRForFile } from "./fileUploadHandler";
import { showOCRSettingsModal } from "./ocrProvider";

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('enhanced-file-upload-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'enhanced-file-upload-styles';
  style.textContent = `
    .file-upload-container {
      margin-bottom: 8px;
    }
    
    .file-preview {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
      padding: 4px 0;
    }
    
    .file-preview:empty {
      display: none;
    }
    
    .file-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(79, 195, 247, 0.08);
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .file-item:hover {
      background: rgba(79, 195, 247, 0.12);
      border-color: rgba(79, 195, 247, 0.3);
    }
    
    .file-item.has-error {
      background: rgba(244, 67, 54, 0.08);
      border-color: rgba(244, 67, 54, 0.3);
    }
    
    .file-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .file-info {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    
    .file-name {
      font-size: 13px;
      font-weight: 500;
      color: #e6edf3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .file-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #7d8590;
      margin-top: 2px;
    }
    
    .file-type-badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .file-type-badge.pdf { background: rgba(244, 67, 54, 0.15); color: #ef5350; }
    .file-type-badge.image { background: rgba(156, 39, 176, 0.15); color: #ce93d8; }
    .file-type-badge.code { background: rgba(76, 175, 80, 0.15); color: #81c784; }
    .file-type-badge.text { background: rgba(33, 150, 243, 0.15); color: #64b5f6; }
    .file-type-badge.document { background: rgba(255, 152, 0, 0.15); color: #ffb74d; }
    
    .extraction-status {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 10px;
    }
    
    .extraction-status.success {
      background: rgba(76, 175, 80, 0.1);
      color: #4caf50;
    }
    
    .extraction-status.ocr {
      background: rgba(156, 39, 176, 0.1);
      color: #ce93d8;
    }
    
    .extraction-status.pending {
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
    }
    
    .extraction-status.failed {
      background: rgba(244, 67, 54, 0.1);
      color: #f44336;
    }
    
    .file-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    
    .file-btn {
      padding: 4px 10px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .file-send-btn {
      background: #4fc3f7;
      color: #000;
    }
    
    .file-send-btn:hover {
      background: #29b6f6;
    }
    
    .file-ocr-btn {
      background: rgba(156, 39, 176, 0.2);
      color: #ce93d8;
    }
    
    .file-ocr-btn:hover {
      background: rgba(156, 39, 176, 0.3);
    }
    
    .file-remove-btn {
      background: transparent;
      color: #7d8590;
      font-size: 16px;
      padding: 2px 6px;
    }
    
    .file-remove-btn:hover {
      color: #f44336;
      background: rgba(244, 67, 54, 0.1);
    }
    
    .file-error-msg {
      font-size: 10px;
      color: #f44336;
      margin-top: 2px;
    }
    
    /* Processing indicator */
    .file-processing-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      color: #4fc3f7;
    }
    
    .processing-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(79, 195, 247, 0.3);
      border-top-color: #4fc3f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .processing-text {
      font-size: 13px;
    }
    
    /* Upload button area */
    .file-upload-btn-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    #file-upload-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 6px;
      color: #4fc3f7;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    #file-upload-btn:hover {
      background: rgba(79, 195, 247, 0.2);
      border-color: rgba(79, 195, 247, 0.5);
    }
    
    #ocr-settings-btn {
      padding: 6px 8px;
      background: transparent;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      color: #7d8590;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    #ocr-settings-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #e6edf3;
    }
    
    /* No files message */
    .no-files {
      color: #7d8590;
      font-size: 12px;
      text-align: center;
      padding: 8px;
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize styles
injectStyles();

// ============================================================================
// UI SETUP
// ============================================================================

/**
 * Creates the file upload UI elements
 * @returns Object containing references to the created elements
 */
export function setupFileUploadUI(): { newUploadBtn: HTMLElement | null, newFilePreview: HTMLElement | null } {
  // Inject styles if not already done
  injectStyles();
  
  const container = document.createElement('div');
  container.className = 'file-upload-container';
  container.innerHTML = `
    <div class="file-upload-btn-area">
      <button id="file-upload-btn">📎 Attach Files</button>
      <button id="ocr-settings-btn" title="OCR Settings">⚙️</button>
    </div>
    <div id="file-preview" class="file-preview"></div>
  `;
  
  // Add it to the page before the input container
  const inputContainer = document.querySelector('.input-container, .chat-input-container, .ai-chat-input');
  if (inputContainer) {
    inputContainer.parentNode?.insertBefore(container, inputContainer);
  } else {
    // Try to find chat panel
    const chatPanel = document.querySelector('.ai-chat-panel, .chat-panel');
    if (chatPanel) {
      const inputArea = chatPanel.querySelector('.input-area, textarea')?.parentElement;
      if (inputArea) {
        inputArea.insertBefore(container, inputArea.firstChild);
      } else {
        chatPanel.appendChild(container);
      }
    } else {
      document.body.appendChild(container);
    }
  }
  
  // Get the elements
  const newUploadBtn = document.getElementById('file-upload-btn');
  const newFilePreview = document.getElementById('file-preview');
  const ocrSettingsBtn = document.getElementById('ocr-settings-btn');
  
  // Setup OCR settings button
  ocrSettingsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showOCRSettingsModal();
  });
  
  return { newUploadBtn, newFilePreview };
}

// ============================================================================
// FILE DISPLAY
// ============================================================================

/**
 * Displays uploaded files in the preview element
 * @param files Array of file objects to display
 * @param filePreview The preview element to display files in
 */
export function displayFilesInPreview(files: ProcessedFile[], filePreview: HTMLElement | null): void {
  if (!filePreview) {
    console.error('File preview element not found');
    return;
  }
  
  // Clear previous preview
  filePreview.innerHTML = '';
  
  if (files.length === 0) {
    return; // Don't show "No files" message, just hide
  }
  
  // Display uploaded files
  files.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${file.error ? 'has-error' : ''}`;
    fileItem.dataset.index = index.toString();
    fileItem.dataset.fileId = file.id;
    
    // Get icon
    const iconChar = getFileIcon(file.type);
    
    // Format file size
    const sizeStr = formatFileSize(file.size);
    
    // Extraction status
    const extractionStatus = getExtractionStatusHTML(file);
    
    // Show OCR button for images/PDFs that haven't been OCR'd
    const showOCRButton = (file.type === 'image' || file.type === 'pdf') && 
                          !file.ocrProcessed && 
                          file.base64Data &&
                          !file.error;
    
    fileItem.innerHTML = `
      <div class="file-icon">${iconChar}</div>
      <div class="file-info">
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">
          <span class="file-type-badge ${file.type}">${file.type}</span>
          <span>${sizeStr}</span>
          ${file.pageCount ? `<span>${file.pageCount} pages</span>` : ''}
          ${extractionStatus}
        </div>
        ${file.error ? `<div class="file-error-msg">${file.error}</div>` : ''}
      </div>
      <div class="file-actions">
        ${showOCRButton ? `<button class="file-btn file-ocr-btn" title="Run OCR">📷 OCR</button>` : ''}
        <button class="file-btn file-send-btn">Send</button>
        <button class="file-btn file-remove-btn" title="Remove">×</button>
      </div>
    `;
    
    // Add to preview
    filePreview.appendChild(fileItem);
    
    // Event: Send button
    const sendBtn = fileItem.querySelector('.file-send-btn');
    sendBtn?.addEventListener('click', async () => {
      sendBtn.textContent = '...';
      (sendBtn as HTMLButtonElement).disabled = true;
      
      try {
        await sendFileToConversation(file);
        fileItem.remove();
        removeUploadedFileById(file.id);
        updateFileIndexes(filePreview);
      } catch (error) {
        console.error('Send failed:', error);
        sendBtn.textContent = 'Send';
        (sendBtn as HTMLButtonElement).disabled = false;
      }
    });
    
    // Event: OCR button
    const ocrBtn = fileItem.querySelector('.file-ocr-btn');
    ocrBtn?.addEventListener('click', async () => {
      ocrBtn.textContent = '⏳';
      (ocrBtn as HTMLButtonElement).disabled = true;
      
      try {
        await triggerOCRForFile(file.id);
        // Refresh display
        displayFilesInPreview(uploadedFiles, filePreview);
      } catch (error) {
        console.error('OCR failed:', error);
        ocrBtn.textContent = '❌';
      }
    });
    
    // Event: Remove button
    const removeBtn = fileItem.querySelector('.file-remove-btn');
    removeBtn?.addEventListener('click', () => {
      fileItem.remove();
      removeUploadedFileById(file.id);
      updateFileIndexes(filePreview);
    });
  });
}

/**
 * Gets HTML for extraction status badge
 */
function getExtractionStatusHTML(file: ProcessedFile): string {
  switch (file.extractionMethod) {
    case 'pdf-text':
      return `<span class="extraction-status success">✓ text extracted</span>`;
    case 'pdf-ocr':
      return `<span class="extraction-status ocr">📷 OCR</span>`;
    case 'image-ocr':
      return `<span class="extraction-status ocr">📷 OCR</span>`;
    case 'direct-read':
      return `<span class="extraction-status success">✓ readable</span>`;
    case 'base64-only':
      return file.type === 'image' 
        ? `<span class="extraction-status pending">image</span>`
        : `<span class="extraction-status pending">binary</span>`;
    case 'pending':
      return `<span class="extraction-status pending">⏳ processing</span>`;
    case 'failed':
      return `<span class="extraction-status failed">✗ failed</span>`;
    default:
      return '';
  }
}

/**
 * Updates data-index attributes after removal
 */
function updateFileIndexes(filePreview: HTMLElement): void {
  const items = filePreview.querySelectorAll('.file-item');
  items.forEach((item, i) => {
    if (item instanceof HTMLElement) {
      item.dataset.index = i.toString();
    }
  });
}

// ============================================================================
// PROCESSING INDICATOR
// ============================================================================

let processingIndicator: HTMLElement | null = null;

/**
 * Shows a processing indicator
 * @param container Container element
 * @param message Message to display
 */
export function showProcessingIndicator(container: HTMLElement | null, message: string = 'Processing...'): void {
  hideProcessingIndicator();
  
  processingIndicator = document.createElement('div');
  processingIndicator.className = 'file-processing-indicator';
  processingIndicator.innerHTML = `
    <div class="processing-spinner"></div>
    <span class="processing-text">${message}</span>
  `;
  
  if (container) {
    container.insertBefore(processingIndicator, container.firstChild);
  }
}

/**
 * Updates the processing indicator message
 */
export function updateProcessingMessage(message: string): void {
  if (processingIndicator) {
    const text = processingIndicator.querySelector('.processing-text');
    if (text) {
      text.textContent = message;
    }
  }
}

/**
 * Hides the processing indicator
 */
export function hideProcessingIndicator(): void {
  processingIndicator?.remove();
  processingIndicator = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { injectStyles as ensureStyles };
