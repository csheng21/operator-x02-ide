// assistantUI_fileUploadPatch.ts
// PATCH: Integrates uploaded file content (PDFs, images, etc.) into AI messages
// 
// HOW TO USE:
// Option 1: Import and call at startup: initializeFileUploadIntegration()
// Option 2: Manually add the integration code to sendMessageDirectly()
// ============================================================================

import { 
  uploadedFiles, 
  getFilesWithTextContent,
  getImageFiles,
  resetFileState,
  ProcessedFile 
} from './eventHandlers/fileHandlers/fileState';

import { formatFileSize } from './eventHandlers/fileHandlers/fileUtils';

// ============================================================================
// FILE CONTEXT BUILDER
// ============================================================================

/**
 * Builds the file context string to prepend to user messages
 * This is what makes uploaded PDFs readable by the AI
 */
export function buildUploadedFileContext(): string {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    return '';
  }
  
  const contextParts: string[] = [];
  contextParts.push('\n\n=== UPLOADED FILES ===\n');
  
  for (const file of uploadedFiles) {
    contextParts.push(formatFileForContext(file));
  }
  
  contextParts.push('\n=== END UPLOADED FILES ===\n');
  
  return contextParts.join('\n');
}

/**
 * Formats a single file for AI context
 */
function formatFileForContext(file: ProcessedFile): string {
  const parts: string[] = [];
  
  // File header
  parts.push(`\n📄 FILE: ${file.name}`);
  parts.push(`   Type: ${file.type} | Size: ${formatFileSize(file.size)}`);
  
  if (file.pageCount) {
    parts.push(`   Pages: ${file.pageCount}`);
  }
  
  if (file.extractionMethod === 'pdf-ocr' || file.extractionMethod === 'image-ocr') {
    parts.push(`   Note: Text extracted via OCR`);
  }
  
  // Get text content
  const textContent = file.textContent || (typeof file.content === 'string' ? file.content : null);
  
  if (textContent && textContent.trim().length > 0) {
    parts.push('\n   CONTENT:');
    parts.push('   ```');
    
    // Truncate if too long (50k chars max per file)
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
    parts.push('\n   [Scanned PDF - OCR not performed or failed. Enable OCR in settings.]');
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
// INTEGRATION PATCH
// ============================================================================

/**
 * This is the code to ADD to your sendMessageDirectly function
 * Add it around line 1969 (after terminal context, before the fileKeywords check)
 * 
 * COPY THIS BLOCK INTO sendMessageDirectly():
 */
export const INTEGRATION_CODE = `
    // 📎 UPLOADED FILES INTEGRATION (PDF, Images, etc.)
    try {
      const { buildUploadedFileContext, hasUploadedFiles, clearUploadedFiles, getUploadedImages } = 
        await import('./eventHandlers/fileHandlers');
      
      if (hasUploadedFiles()) {
        const fileContext = buildUploadedFileContext();
        if (fileContext) {
          enhancedMessage = fileContext + '\\n\\nUSER QUESTION: ' + enhancedMessage;
          console.log('📎 Added uploaded file context to message');
        }
        
        // Get images for vision API (if provider supports it)
        const uploadedImages = getUploadedImages();
        if (uploadedImages.length > 0) {
          console.log(\`🖼️ \${uploadedImages.length} images available for vision API\`);
          // Note: Pass these to callGenericAPI if it supports images
        }
      }
    } catch (fileUploadError) {
      console.warn('File upload integration not available:', fileUploadError);
    }
`;

// ============================================================================
// AUTO-PATCH FUNCTION
// ============================================================================

let isPatched = false;

/**
 * Automatically patches sendMessageDirectly to include file context
 * Call this once during app initialization
 */
export function initializeFileUploadIntegration(): void {
  if (isPatched) {
    console.log('📎 File upload integration already initialized');
    return;
  }
  
  console.log('📎 Initializing file upload integration...');
  
  const w = window as any;
  
  // Wait for sendMessageDirectly to be available
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
      console.log('✅ File upload integration active - PDFs and images will now be sent to AI');
      return true;
    }
    return false;
  };
  
  // Try immediately
  if (!tryPatch()) {
    // Retry after delays
    setTimeout(() => {
      if (!tryPatch()) {
        setTimeout(() => {
          if (!tryPatch()) {
            console.warn('⚠️ Could not auto-patch sendMessageDirectly');
            console.log('📖 Manual integration required - see INTEGRATION_CODE export');
          }
        }, 2000);
      }
    }, 1000);
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).fileUploadIntegration = {
    buildUploadedFileContext,
    getUploadedImages,
    hasUploadedFiles,
    clearUploadedFiles,
    initializeFileUploadIntegration,
    
    // Debug
    debug: () => {
      console.log('📎 Uploaded files:', uploadedFiles?.length || 0);
      if (uploadedFiles?.length > 0) {
        uploadedFiles.forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.name} (${f.type}) - ${formatFileSize(f.size)}`);
          console.log(`     Text content: ${f.textContent?.length || 0} chars`);
        });
        console.log('\n📄 Context preview:');
        console.log(buildUploadedFileContext().substring(0, 1000) + '...');
      }
    }
  };
}

export default initializeFileUploadIntegration;
