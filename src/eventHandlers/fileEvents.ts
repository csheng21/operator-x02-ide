// eventHandlers/fileEvents.ts - File upload event listeners setup

import { initializeFileHandling } from './fileHandlers';

/**
 * Sets up file upload event listeners
 * This now uses the enhanced file handling system with PDF/OCR support
 */
export function setupFileUploadEventListeners(): void {
  console.log('🔧 Setting up enhanced file upload listeners...');
  
  // Use the new initialization function
  initializeFileHandling();
  
  console.log('✅ Enhanced file upload system ready');
  console.log('   Features:');
  console.log('   - PDF text extraction');
  console.log('   - AI OCR for scanned documents');
  console.log('   - Multi-provider support (Claude, OpenAI, DeepSeek, Replicate)');
  console.log('   - Image processing with Vision APIs');
}

// Re-export everything from the file handlers for backward compatibility
export * from './fileHandlers';
