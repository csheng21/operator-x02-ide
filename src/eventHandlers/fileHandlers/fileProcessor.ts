// fileHandlers/fileProcessor.ts - File processing for conversation (compact card display)
// NOTE: Files are attached as compact cards, NOT displayed with raw content

import { escapeHtml, formatFileSize } from './fileUtils';
import { ProcessedFile } from './fileState';

// ============================================================================
// SEND FILE TO CONVERSATION
// ============================================================================

/**
 * Sends a file to the conversation
 * NOTE: This ONLY adds file info to the chat - it does NOT open the file in the editor
 * @param file The processed file object to send
 */
export async function sendFileToConversation(file: ProcessedFile): Promise<void> {
  console.log('📤 Processing file for conversation:', file.name, 'Type:', file.type);
  
  let contentToSend: string;
  
  try {
    // Create a COMPACT attachment card - NOT full content display
    // This prevents raw binary from showing and keeps chat clean
    contentToSend = createCompactFileCard(file);
    
    console.log('✅ Attaching file to conversation:', file.name);
    
    // Send the compact card to chat
    await sendCustomMessage(contentToSend);
    
    // The actual file content is available via file.textContent for AI context
    // but we don't display raw content in the chat UI
    
  } catch (error) {
    console.error('❌ Error processing file for conversation:', error);
    const errorMessage = createErrorHTML(file.name, error);
    await sendCustomMessage(errorMessage);
  }
}

/**
 * Creates a compact file attachment card (NO raw content display)
 * This is what shows in the chat - clean and minimal
 */
function createCompactFileCard(file: ProcessedFile): string {
  const icon = getFileIconForType(file.type);
  const statusBadge = getStatusBadge(file);
  
  return `
    <div class="file-attachment-card" style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(79, 195, 247, 0.08);
      border: 1px solid rgba(79, 195, 247, 0.25);
      border-radius: 8px;
      margin: 8px 0;
      max-width: 400px;
    ">
      <div style="font-size: 28px;">${icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-weight: 500;
          color: #e6edf3;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${escapeHtml(file.name)}</div>
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 11px;
          color: #7d8590;
        ">
          <span>${formatFileSize(file.size)}</span>
          ${file.pageCount ? `<span>• ${file.pageCount} pages</span>` : ''}
          ${statusBadge}
        </div>
      </div>
      <div style="
        padding: 4px 8px;
        background: rgba(76, 175, 80, 0.15);
        border-radius: 4px;
        font-size: 10px;
        color: #81c784;
        font-weight: 500;
      ">ATTACHED</div>
    </div>
  `;
}

/**
 * Gets icon for file type
 */
function getFileIconForType(type: string): string {
  const icons: Record<string, string> = {
    'pdf': '📄',
    'image': '🖼️',
    'code': '📝',
    'text': '📃',
    'document': '📋',
    'spreadsheet': '📊',
    'binary': '📦'
  };
  return icons[type] || '📎';
}

/**
 * Gets status badge HTML
 */
function getStatusBadge(file: ProcessedFile): string {
  if (file.error) {
    return `<span style="color: #f44336;">⚠️ Error</span>`;
  }
  
  if (file.ocrProcessed) {
    return `<span style="color: #ce93d8;">📷 OCR</span>`;
  }
  
  if (file.textContent && file.textContent.length > 0) {
    return `<span style="color: #4caf50;">✓ Text extracted</span>`;
  }
  
  if (file.type === 'image') {
    return `<span style="color: #64b5f6;">🖼️ Image</span>`;
  }
  
  return '';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates error HTML
 */
function createErrorHTML(filename: string, error: unknown): string {
  return `
    <div class="file-attachment-card error" style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(244, 67, 54, 0.08);
      border: 1px solid rgba(244, 67, 54, 0.25);
      border-radius: 8px;
      margin: 8px 0;
    ">
      <div style="font-size: 28px;">⚠️</div>
      <div>
        <div style="font-weight: 500; color: #e6edf3;">${escapeHtml(filename)}</div>
        <div style="color: #f44336; font-size: 12px; margin-top: 2px;">
          ${error instanceof Error ? escapeHtml(error.message) : 'Upload failed'}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MESSAGE SENDING
// ============================================================================

/**
 * Sends a custom message to the conversation
 * Tries to use the conversation module's sendCustomMessage function
 */
async function sendCustomMessage(content: string): Promise<void> {
  // Try to use the existing sendCustomMessage from conversation module
  const w = window as any;
  
  if (w.sendCustomMessage) {
    await w.sendCustomMessage(content);
    return;
  }
  
  // Try importing from conversation module
  try {
    const { sendCustomMessage: send } = await import('../../conversation');
    await send(content);
    return;
  } catch (e) {
    // Module not found
  }
  
  // Fallback: Add message directly to chat
  const chatContainer = document.querySelector('.ai-chat-container, .chat-messages, #chat-messages');
  if (chatContainer) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return;
  }
  
  console.error('Could not find method to send message to conversation');
}

// ============================================================================
// EXPORTS FOR AI CONTEXT
// ============================================================================

/**
 * Formats a file for inclusion in AI context/prompt
 */
export function formatFileForAIContext(file: ProcessedFile): string {
  const parts: string[] = [];
  
  parts.push(`📄 **File: ${file.name}**`);
  parts.push(`Type: ${file.type} | Size: ${formatFileSize(file.size)}`);
  
  if (file.pageCount) {
    parts.push(`Pages: ${file.pageCount}`);
  }
  
  if (file.extractionMethod === 'pdf-ocr' || file.extractionMethod === 'image-ocr') {
    parts.push(`Extraction: OCR`);
  }
  
  // Add text content
  const textContent = file.textContent || (typeof file.content === 'string' ? file.content : null);
  
  if (textContent) {
    parts.push('\n**Content:**');
    parts.push('```');
    // Limit content length for context
    const maxLength = 50000;
    if (textContent.length > maxLength) {
      parts.push(textContent.substring(0, maxLength));
      parts.push(`\n... [Truncated, ${textContent.length - maxLength} more characters]`);
    } else {
      parts.push(textContent);
    }
    parts.push('```');
  } else if (file.base64Data) {
    parts.push('\n[Binary file - image/document attached]');
  }
  
  return parts.join('\n');
}

/**
 * Prepares message with attached files for AI API
 */
export function prepareMessageWithFiles(
  message: string, 
  files: ProcessedFile[]
): { text: string; images: Array<{ base64: string; mimeType: string }> } {
  const textParts: string[] = [message];
  const images: Array<{ base64: string; mimeType: string }> = [];
  
  for (const file of files) {
    if (file.type === 'image' && file.base64Data) {
      // Add image for vision API
      images.push({
        base64: file.base64Data,
        mimeType: file.mimeType
      });
      textParts.push(`\n[Image attached: ${file.name}]`);
    } else {
      // Add text content
      textParts.push(`\n\n${formatFileForAIContext(file)}`);
    }
  }
  
  return {
    text: textParts.join('\n'),
    images
  };
}
