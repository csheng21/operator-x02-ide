// assistantStyles.ts - Complete Styles Management for AI Assistant UI
// ============================================================================

// ============================================================================
// MAIN STYLES INITIALIZATION
// ============================================================================

/**
 * Add all styles to the document
 * This is the main entry point for all styling
 */
export function addAllStyles(): void {
  addAssistantStyles();
  addConversationStyles();
  addLoadingStyles();
  addNoteDialogStyles();
  addExportDialogStyles();
  addFileAttachmentStyles();
  addMessageExpandCollapseStyles();
  addChangesExplanationStyles();
  if (!document.getElementById('changes-explanation-styles')) {
    const style = document.createElement('style');
    style.id = 'changes-explanation-styles';
    style.textContent = `
      .explanation-button-container {
        display: flex; gap: 8px; padding: 12px 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
        background: rgba(0,0,0,0.2);
      }
      .detailed-explanation-btn {
        flex: 1; display: flex; align-items: center; justify-content: center;
        padding: 10px 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white; border: none; border-radius: 6px; font-size: 13px;
        font-weight: 600; cursor: pointer; transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(99,102,241,0.3);
      }
      .detailed-explanation-btn:hover {
        transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.5);
      }
    `;
    document.head.appendChild(style);
  }
}



// ============================================================================
// EXPORT DIALOG STYLES
// ============================================================================

/**
 * Styles for the export dialog modal
 */
function addExportDialogStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'export-dialog-styles';
  styles.textContent = `
    .export-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      animation: fadeIn 0.2s ease;
    }
    
    .export-dialog {
      background: #2d2d2d;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 400px;
      max-width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    
    .export-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .export-dialog-body {
      padding: 20px;
    }
    
    .export-option {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      cursor: pointer;
      color: #e1e1e1;
    }
    
    .export-format {
      margin-top: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .export-format select {
      flex: 1;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #e1e1e1;
    }
    
    .export-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// MAIN ASSISTANT PANEL STYLES
// ============================================================================

/**
 * Core styles for the AI Assistant panel, messages, input, and buttons
 */
function addAssistantStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'assistant-ui-styles';
  styles.textContent = `
    /* ============================================================================ */
    /* ASSISTANT PANEL LAYOUT */
    /* ============================================================================ */
    
    .assistant-panel {
      display: flex !important;
      flex-direction: column;
      height: 100%;
      background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
      border-left: 1px solid #333;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
    }
    
    .assistant-header {
      padding: 4px 8px !important;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
    }
    
    .ai-chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    /* ============================================================================ */
    /* INPUT CONTAINER */
    /* ============================================================================ */
    
    .assistant-input-container,
    .chat-input-area {
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    #ai-assistant-input {
      width: 100%;
      min-height: 40px !important;
      max-height: 120px !important;
      padding: 10px 12px !important;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #e1e1e1;
      font-size: 13px;
      resize: none;
      outline: none;
      font-family: 'Inter', sans-serif;
      line-height: 1.5;
      transition: all 0.2s;
    }

    #ai-assistant-input:focus {
      border-color: #4fc3f7;
      background: rgba(255, 255, 255, 0.08);
    }

    /* ============================================================================ */
    /* TOOL BUTTONS AND SEND BUTTON */
    /* ============================================================================ */

    .input-tools,
    .chat-input-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .tool-buttons-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }

    .tool-button {
      width: 36px !important;
      height: 36px !important;
      padding: 0 !important;
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-radius: 8px;
      background: rgba(79, 195, 247, 0.05);
      color: #4fc3f7;
      cursor: pointer;
      font-size: 16px !important;
      transition: all 0.2s;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tool-button:hover {
      background: rgba(79, 195, 247, 0.15);
      border-color: rgba(79, 195, 247, 0.3);
      transform: translateY(-1px);
    }

    .tool-button:active {
      transform: translateY(0);
    }

    /* ============================================================================ */
    /* 3D ANIMATED TOOL BUTTONS */
    /* ============================================================================ */

    .tool-button {
      position: relative;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-style: preserve-3d;
      perspective: 1000px;
    }

    .tool-button span {
      display: inline-block;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-style: preserve-3d;
    }

    /* Hover Effect - 3D Scale Up */
    .tool-button:hover {
      transform: translateY(-4px) scale(1.1);
      box-shadow: 
        0 8px 20px rgba(79, 195, 247, 0.4),
        0 4px 10px rgba(79, 195, 247, 0.2),
        inset 0 -2px 8px rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.25), rgba(79, 195, 247, 0.15));
      border-color: rgba(79, 195, 247, 0.5);
    }

    /* Icon 3D Scale Animation */
    .tool-button:hover span {
      transform: scale(1.4) rotateY(10deg) translateZ(10px);
      text-shadow: 
        0 4px 8px rgba(0, 0, 0, 0.5),
        0 8px 16px rgba(79, 195, 247, 0.3),
        2px 2px 4px rgba(0, 0, 0, 0.3);
      filter: 
        drop-shadow(0 0 8px rgba(79, 195, 247, 0.6))
        drop-shadow(0 0 12px rgba(79, 195, 247, 0.4));
    }

    /* Active/Click Effect */
    .tool-button:active {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 
        0 4px 10px rgba(79, 195, 247, 0.3),
        inset 0 2px 4px rgba(0, 0, 0, 0.4);
    }

    .tool-button:active span {
      transform: scale(1.2) rotateY(0deg) translateZ(5px);
    }

    /* Glow Animation on Hover */
    @keyframes glow {
      0%, 100% {
        box-shadow: 
          0 8px 20px rgba(79, 195, 247, 0.4),
          0 0 20px rgba(79, 195, 247, 0.3);
      }
      50% {
        box-shadow: 
          0 8px 20px rgba(79, 195, 247, 0.6),
          0 0 30px rgba(79, 195, 247, 0.5);
      }
    }

    .tool-button:hover {
      animation: glow 1.5s infinite;
    }

    /* Individual Button Colors (Optional Enhancement) */
    #analyze-code-btn:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.15));
      border-color: rgba(59, 130, 246, 0.5);
    }

    #analyze-code-btn:hover span {
      filter: 
        drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))
        drop-shadow(0 0 12px rgba(59, 130, 246, 0.4));
    }

    #assistant-upload:hover {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(168, 85, 247, 0.15));
      border-color: rgba(168, 85, 247, 0.5);
    }

    #assistant-upload:hover span {
      filter: 
        drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))
        drop-shadow(0 0 12px rgba(168, 85, 247, 0.4));
    }

    /* Ripple Effect on Click */
    .tool-button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(79, 195, 247, 0.5);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s, opacity 0.6s;
      opacity: 0;
      pointer-events: none;
    }

    .tool-button:active::after {
      width: 100px;
      height: 100px;
      opacity: 1;
      transition: 0s;
    }

    /* ============================================================================ */
    /* HIDE RELOAD BUTTON */
    /* ============================================================================ */

    /* Hide Reload button by various selectors */
    button:has-text("Reload"),
    button[title*="Reload"],
    .reload-button,
    #reload-btn,
    .tool-button:nth-last-child(1):contains("Reload") {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Hide any button with Reload emoji */
    .tool-button:has(span:contains("🔄")),
    button:contains("🔄") {
      display: none !important;
    }

    /* ============================================================================ */
    /* SEND BUTTON STYLES */
    /* ============================================================================ */

    #send-btn,
    .send-button {
      padding: 0 20px !important;
      height: 40px !important;
      min-width: 90px !important;
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      color: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px !important;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
    }

    #send-btn::before,
    .send-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.5s;
    }

    #send-btn:hover::before,
    .send-button:hover::before {
      left: 100%;
    }

    #send-btn:hover,
    .send-button:hover {
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
      border-color: rgba(79, 195, 247, 0.3);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    #send-btn:active,
    .send-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    #send-btn:disabled,
    .send-button:disabled {
      background: rgba(45, 55, 72, 0.5);
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* ============================================================================ */
    /* USER MESSAGE STYLES */
    /* ============================================================================ */
    
    .user-message {
      width: calc(100% - 8px) !important;
      max-width: 100% !important;
      align-self: stretch !important;
      background: rgba(79, 195, 247, 0.08) !important;
      border: none !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      color: #9ca3af !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding: 10px 14px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
      margin-bottom: 8px;
      position: relative;
    }

    .user-message:hover {
      background: rgba(79, 195, 247, 0.12) !important;
      border: none !important;
      color: #b8bfc7 !important;
    }

    .user-message-delete-btn {
      position: absolute !important;
      top: 6px !important;
      right: 6px !important;
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.3) !important;
      cursor: pointer !important;
      padding: 4px !important;
      border-radius: 4px !important;
      transition: all 0.2s !important;
      opacity: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .user-message:hover .user-message-delete-btn {
      opacity: 1 !important;
    }

    .user-message-delete-btn:hover {
      background: rgba(244, 67, 54, 0.15) !important;
      color: #ff6b6b !important;
    }

    .user-message .message-actions {
      display: none !important;
    }

    .user-message .ai-message-content {
      padding-right: 28px;
    }

    /* ============================================================================ */
    /* ASSISTANT MESSAGE STYLES */
    /* ============================================================================ */

    .assistant-message {
      max-width: 95% !important;
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.05);
      color: #e1e1e1;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 12px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
      margin-bottom: 4px;
      position: relative;
    }

    .ai-message-content {
      word-wrap: break-word;
    }

    /* ============================================================================ */
    /* MESSAGE ACTIONS */
    /* ============================================================================ */

    .message-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .message-action-buttons {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .message-action-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .message-action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
    }

    .message-action-btn.like-btn[data-liked="true"] {
      color: #4caf50 !important;
    }

    .message-action-btn.dislike-btn[data-disliked="true"] {
      color: #f44336 !important;
    }

    .message-action-btn.note-btn[data-has-note="true"] {
      color: #ffd700 !important;
    }

    .message-action-btn.delete-message-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      color: #ff6b6b;
    }

    .ai-message .message-action-btn {
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .ai-message:hover .message-action-btn {
      opacity: 1;
    }

    .message-meta-inline {
      display: flex;
      align-items: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }

    .message-time {
      color: rgba(255, 255, 255, 0.35);
    }

    .provider-separator {
      margin: 0 4px;
      opacity: 0.5;
    }

    .provider-text-minimal {
      font-weight: 500;
      opacity: 0.8;
    }
    
    /* ============================================================================ */
    /* SYSTEM MESSAGES */
    /* ============================================================================ */
    
    .system-message {
      padding: 6px 10px;
      font-size: 11px;
      border-radius: 6px;
      background: rgba(79, 195, 247, 0.1);
      border-left: 3px solid #4fc3f7;
      color: rgba(255, 255, 255, 0.7);
      margin: 4px 0;
    }

    /* ============================================================================ */
    /* CODE BLOCKS */
    /* ============================================================================ */

    .code-block {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      margin: 8px 0;
      overflow: hidden;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .code-language {
      font-size: 11px;
      color: #4fc3f7;
      font-weight: 600;
    }

    .code-actions {
      display: flex;
      gap: 4px;
    }

    .code-action {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .code-action:hover {
      opacity: 1;
    }

    .code-block pre {
      margin: 0;
      padding: 10px;
      overflow-x: auto;
      font-size: 11px;
      line-height: 1.4;
    }

    .code-block code {
      font-family: 'JetBrains Mono', 'Monaco', 'Courier New', monospace;
      color: #e1e1e1;
    }

    /* ============================================================================ */
    /* TYPING INDICATOR - SIMPLE LINE WAVE */
    /* ============================================================================ */

    .typing-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 24px;
      padding: 16px;
    }

    .typing-indicator span {
      width: 3px;
      height: 8px;
      background: var(--accent-color, #4fc3f7);
      border-radius: 2px;
      animation: waveAnimation 1s ease-in-out infinite;
    }

    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.1s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(4) { animation-delay: 0.3s; }
    .typing-indicator span:nth-child(5) { animation-delay: 0.4s; }

    @keyframes waveAnimation {
      0%, 100% { height: 8px; opacity: 0.5; }
      50% { height: 20px; opacity: 1; }
    }

    /* Cursor blink for streaming */
    .cursor-blink {
      animation: cursorBlink 1s step-end infinite;
      color: #4fc3f7;
    }

    @keyframes cursorBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .typing-fade-out {
      animation: fadeOut 0.3s ease forwards;
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    /* ============================================================================ */
    /* SCROLLBAR */
    /* ============================================================================ */

    .ai-chat-container::-webkit-scrollbar {
      width: 4px;
    }

    .ai-chat-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .ai-chat-container::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }

    .ai-chat-container::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* ============================================================================ */
    /* ANIMATIONS */
    /* ============================================================================ */

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// CONVERSATION UI STYLES
// ============================================================================

/**
 * Styles for conversation management UI (header, list, modal)
 */
function addConversationStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'conversation-ui-styles';
  styles.textContent = `
    /* ============================================================================ */
    /* CONVERSATION HEADER */
    /* ============================================================================ */
    
    .conversation-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(40, 40, 40, 0.95));
      backdrop-filter: blur(10px);
      position: relative;
      z-index: 100;
    }

    .conversation-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      min-height: 36px;
    }
/* Conversation Header - Compact Inline Design with Bullet Separators */

.conversation-title-section {
  display: flex;
  align-items: center;
  gap: 0;
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 600;
  color: #e1e1e1;
  white-space: nowrap;
  flex-shrink: 0;
  margin-right: 4px;
}

.title-edit-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 11px;
  color: #858585;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-right: 8px;
}

.title-edit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e1e1e1;
  transform: scale(1.1);
}

.conversation-info-inline {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 10px;
  color: #757575;
  white-space: nowrap;
  flex-shrink: 1;
  overflow: hidden;
  margin-left: 0;
}

.conversation-info-inline .info-item {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-size: 10px;
  padding: 0;
}

.conversation-info-inline .info-separator {
  color: #555;
  font-size: 10px;
  margin: 0 8px;
  font-weight: bold;
}

.conversation-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
}

.conversation-info {
  display: none !important;
}

/* Additional styles for controls if needed */
.conversation-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.conv-ctrl-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  color: #858585;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conv-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e1e1e1;
}

.control-separator {
  width: 1px;
  height: 16px;
  background: #454545;
  margin: 0 4px;
}
    .conversation-title-section {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .conversation-title {
      font-size: 13px;
      font-weight: 600;
      color: #4fc3f7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: default;
      line-height: 20px;
    }

    .title-edit-btn {
      opacity: 0;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 2px;
      font-size: 12px;
      transition: all 0.2s;
      border-radius: 4px;
    }

    .conversation-header:hover .title-edit-btn {
      opacity: 1;
    }

    .title-edit-btn:hover {
      color: #4fc3f7;
      background: rgba(79, 195, 247, 0.1);
    }

    .conversation-controls {
      display: flex;
      gap: 2px;
      align-items: center;
    }

    .conv-ctrl-btn {
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .conv-ctrl-btn:hover {
      background: rgba(79, 195, 247, 0.1);
      border-color: rgba(79, 195, 247, 0.2);
      color: #4fc3f7;
    }

    .conv-ctrl-btn:active {
      transform: scale(0.95);
    }

    .conv-ctrl-btn svg {
      width: 14px;
      height: 14px;
      stroke-width: 2;
    }

    .control-separator {
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.1);
      margin: 0 4px;
    }

    .conversation-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px 6px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .info-icon {
      font-size: 10px;
      opacity: 0.6;
    }

    .info-separator {
      opacity: 0.3;
    }

    /* ============================================================================ */
    /* DROPDOWN MENU */
    /* ============================================================================ */

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 8px;
      background: rgba(35, 35, 35, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 8px 0;
      z-index: 9999;
      min-width: 220px;
      max-width: 250px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      animation: dropdownSlide 0.2s ease;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 16px;
      margin: 0;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-item:hover {
      background: rgba(79, 195, 247, 0.12);
      color: #ffffff;
      padding-left: 18px;
    }

    .dropdown-item.danger {
      color: rgba(255, 120, 120, 0.9);
    }

    .dropdown-item.danger:hover {
      background: rgba(244, 67, 54, 0.12);
      color: #ff6b6b;
    }

    .dropdown-icon {
      font-size: 15px;
      min-width: 22px;
      text-align: center;
      flex-shrink: 0;
    }

    .dropdown-separator {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 6px 16px;
      display: block;
    }

    /* ============================================================================ */
    /* CONVERSATION MODAL */
    /* ============================================================================ */

    .conversation-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
    }

    .modal-content {
      position: relative;
      background: #1e1e1e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 720px;
      max-width: 90%;
      height: 600px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(25, 25, 25, 0.95));
    }

    .modal-header h2 {
      margin: 0;
      color: #4fc3f7;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }

    .modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ff6b6b;
    }

    /* ============================================================================ */
    /* SEARCH BAR */
    /* ============================================================================ */

    .modal-search-bar {
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 32px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.5;
      pointer-events: none;
    }

    .modal-search-bar input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }

    .modal-search-bar input:focus {
      border-color: #4fc3f7;
      background: rgba(255, 255, 255, 0.08);
    }

    /* ============================================================================ */
    /* STORAGE STATS */
    /* ============================================================================ */

    .storage-stats-bar {
      padding: 10px 20px;
      background: linear-gradient(90deg, rgba(79, 195, 247, 0.03), rgba(33, 150, 243, 0.01));
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.5);
    }

    .stat-value {
      color: #4fc3f7;
      font-weight: 600;
    }

    .stat-divider {
      width: 1px;
      height: 14px;
      background: rgba(255, 255, 255, 0.1);
    }

    /* ============================================================================ */
    /* CONVERSATION LIST */
    /* ============================================================================ */

    .conversation-list-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .list-toolbar {
      padding: 8px 20px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .list-info {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toolbar-btn:hover {
      background: rgba(79, 195, 247, 0.1);
      border-color: rgba(79, 195, 247, 0.3);
      color: #4fc3f7;
    }

    .toolbar-btn.active {
      background: rgba(79, 195, 247, 0.15);
      border-color: rgba(79, 195, 247, 0.3);
      color: #4fc3f7;
    }

    .selection-toolbar {
      padding: 8px 20px;
      background: rgba(79, 195, 247, 0.05);
      border-bottom: 1px solid rgba(79, 195, 247, 0.2);
      display: flex;
      align-items: center;
      gap: 16px;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .select-all-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .delete-selected-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
      border-radius: 6px;
      color: #ff6b6b;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .delete-selected-btn:not(:disabled):hover {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.5);
    }

    .delete-selected-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .conversation-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .conversation-item {
      display: flex;
      align-items: center;
      padding: 10px;
      margin-bottom: 4px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      gap: 10px;
    }

    .conversation-item:hover {
      background: rgba(79, 195, 247, 0.05);
      border-color: rgba(79, 195, 247, 0.15);
    }

    .conversation-item.current {
      background: rgba(79, 195, 247, 0.08);
      border-color: rgba(79, 195, 247, 0.25);
    }

    .conversation-item.selected {
      background: rgba(79, 195, 247, 0.06);
      border-color: rgba(79, 195, 247, 0.2);
    }

    .item-checkbox {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 20px;
    }

    .item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      opacity: 0.7;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .item-title {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .current-badge {
      background: linear-gradient(135deg, #4fc3f7, #2196f3);
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .item-preview {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .item-metadata {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-item svg {
      opacity: 0.6;
    }

    .item-delete-btn {
      opacity: 0;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 6px;
      transition: all 0.2s;
      border-radius: 4px;
    }

    .conversation-item:hover .item-delete-btn {
      opacity: 1;
    }

    .item-delete-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      color: #ff6b6b;
    }

    .no-conversations {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
    }

    .no-conversations p {
      margin: 16px 0 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }

    .empty-hint {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    .conversation-list::-webkit-scrollbar {
      width: 6px;
    }

    .conversation-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .conversation-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    .conversation-list::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// LOADING ANIMATION STYLES
// ============================================================================

/**
 * Styles for loading overlays and animations
 */
function addLoadingStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'loading-styles';
  styles.textContent = `
    .conversation-loading-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 1000;
      background: rgba(30, 30, 30, 0.95);
      padding: 20px;
      border-radius: 12px;
      opacity: 1;
      transition: opacity 0.3s ease;
      min-width: 200px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(79, 195, 247, 0.2);
    }

    .loading-animation {
      padding: 20px;
      background: rgba(79, 195, 247, 0.05);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .loading-dots .dot {
      width: 12px;
      height: 12px;
      background: #4fc3f7;
      border-radius: 50%;
      animation: loadingBounce 1.4s infinite ease-in-out;
      box-shadow: 0 2px 8px rgba(79, 195, 247, 0.4);
    }

    .loading-dots .dot:nth-child(1) {
      animation-delay: 0s;
      background: linear-gradient(135deg, #4fc3f7, #42a5f5);
    }

    .loading-dots .dot:nth-child(2) {
      animation-delay: 0.2s;
      background: linear-gradient(135deg, #42a5f5, #2196f3);
    }

    .loading-dots .dot:nth-child(3) {
      animation-delay: 0.4s;
      background: linear-gradient(135deg, #2196f3, #1e88e5);
    }

    @keyframes loadingBounce {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
        box-shadow: 0 2px 8px rgba(79, 195, 247, 0.2);
      }
      40% {
        transform: scale(1.2);
        opacity: 1;
        box-shadow: 0 4px 16px rgba(79, 195, 247, 0.6);
      }
    }

    .loading-text {
      color: #4fc3f7;
      font-size: 14px;
      font-weight: 500;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.5px;
      opacity: 0.9;
      animation: loadingTextPulse 2s infinite;
    }

    @keyframes loadingTextPulse {
      0%, 100% {
        opacity: 0.9;
      }
      50% {
        opacity: 0.6;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// NOTE DIALOG STYLES
// ============================================================================

/**
 * Styles for the note-taking dialog
 */
function addNoteDialogStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'note-dialog-styles';
  styles.textContent = `
    .note-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      animation: fadeIn 0.2s ease;
    }

    .note-dialog-container {
      background: #2d2d2d;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    .note-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .note-dialog-header h3 {
      margin: 0;
      color: #4fc3f7;
      font-size: 16px;
      font-weight: 600;
    }

    .note-dialog-close {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .note-dialog-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ff6b6b;
    }

    .note-dialog-body {
      padding: 20px;
    }

    .note-input {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #e1e1e1;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      outline: none;
      transition: all 0.2s;
    }

    .note-input:focus {
      border-color: #4fc3f7;
      background: rgba(0, 0, 0, 0.4);
    }

    .note-metadata {
      margin-top: 8px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }

    .note-dialog-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .note-dialog-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .note-cancel-btn, .note-save-btn, .note-delete-btn {
      padding: 8px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .note-cancel-btn {
      background: transparent;
      color: rgba(255, 255, 255, 0.6);
    }

    .note-cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .note-save-btn {
      background: #4fc3f7;
      color: #1e1e1e;
      border: none;
    }

    .note-save-btn:hover {
      background: #42a5f5;
    }

    .note-delete-btn {
      background: transparent;
      color: #ff6b6b;
      border-color: rgba(244, 67, 54, 0.3);
    }

    .note-delete-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.5);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .message-action-btn.note-btn[data-has-note="true"] {
      color: #ffd700 !important;
    }

    .message-action-btn.note-btn[data-has-note="true"]:hover {
      background: rgba(255, 215, 0, 0.1);
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// FILE ATTACHMENT DISPLAY STYLES
// ============================================================================

/**
 * Styles for file attachment chips and display
 */
function addFileAttachmentStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'file-attachment-styles';
  styles.textContent = `
    /* ============================================================================ */
    /* ATTACHMENT DISPLAY CONTAINER */
    /* ============================================================================ */
    
    #attachment-display {
      display: none;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 12px;
      background: rgba(30, 30, 30, 0.95);
      border-bottom: 1px solid rgba(79, 195, 247, 0.2);
      min-height: 0;
      max-height: 120px;
      overflow-y: auto;
      overflow-x: hidden;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    /* ============================================================================ */
    /* SCROLLBAR FOR ATTACHMENT DISPLAY */
    /* ============================================================================ */
    
    #attachment-display::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    #attachment-display::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    #attachment-display::-webkit-scrollbar-thumb {
      background: rgba(79, 195, 247, 0.3);
      border-radius: 3px;
      transition: background 0.2s;
    }

    #attachment-display::-webkit-scrollbar-thumb:hover {
      background: rgba(79, 195, 247, 0.5);
    }

    /* ============================================================================ */
    /* FILE ATTACHMENT CHIP */
    /* ============================================================================ */
    
    .file-attachment-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(79, 195, 247, 0.08));
      border: 1px solid rgba(79, 195, 247, 0.4);
      border-radius: 20px;
      color: #4fc3f7;
      font-size: 13px;
      font-weight: 500;
      cursor: default;
      transition: all 0.2s ease;
      max-width: 280px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: chipSlideIn 0.3s ease;
    }

    .file-attachment-chip:hover {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.3), rgba(79, 195, 247, 0.15));
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
    }

    /* File icon */
    .file-attachment-chip > span:first-child {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    /* File name */
    .file-attachment-chip > span:nth-child(2) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      font-weight: 500;
    }

    /* File size */
    .file-attachment-chip > span:nth-child(3) {
      font-size: 11px;
      opacity: 0.7;
      font-weight: normal;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ============================================================================ */
    /* REMOVE BUTTON */
    /* ============================================================================ */
    
    .remove-attachment {
      background: none;
      border: none;
      color: #4fc3f7;
      cursor: pointer;
      padding: 2px;
      margin-left: 4px;
      font-size: 18px;
      line-height: 1;
      opacity: 0.7;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .remove-attachment:hover {
      opacity: 1;
      background: rgba(255, 82, 82, 0.2);
      color: #ff5252;
      transform: scale(1.1);
    }

    .remove-attachment:active {
      transform: scale(0.95);
    }

    /* ============================================================================ */
    /* ANIMATIONS */
    /* ============================================================================ */
    
    @keyframes chipSlideIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
      to {
        opacity: 1;
        max-height: 120px;
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }

    @keyframes badgePop {
      0% {
        transform: scale(0);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }

    @keyframes spin {
      to {
        transform: translate(-50%, -50%) rotate(360deg);
      }
    }

    /* ============================================================================ */
    /* EMPTY STATE */
    /* ============================================================================ */
    
    #attachment-display:empty {
      display: none !important;
    }

    #attachment-display[style*="display: flex"] {
      animation: slideDown 0.3s ease;
    }

    /* ============================================================================ */
    /* DRAG FEEDBACK */
    /* ============================================================================ */
    
    .assistant-panel.dragging-files #attachment-display {
      border-color: rgba(79, 195, 247, 0.6);
      background: rgba(79, 195, 247, 0.08);
    }

    /* ============================================================================ */
    /* INTEGRATION WITH INPUT CONTAINER */
    /* ============================================================================ */
    
    .input-container,
    .assistant-input-container,
    .chat-input-area {
      position: relative;
    }

    /* ============================================================================ */
    /* FILE COUNT BADGE (OPTIONAL) */
    /* ============================================================================ */
    
    .file-count-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: linear-gradient(135deg, #4fc3f7, #2196f3);
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(79, 195, 247, 0.4);
      animation: badgePop 0.3s ease;
    }

    /* ============================================================================ */
    /* LOADING STATE */
    /* ============================================================================ */
    
    .file-attachment-chip.processing {
      opacity: 0.6;
      pointer-events: none;
    }

    .file-attachment-chip.processing::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      border: 2px solid rgba(79, 195, 247, 0.3);
      border-top-color: #4fc3f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* ============================================================================ */
    /* RESPONSIVE DESIGN */
    /* ============================================================================ */
    
    @media (max-width: 768px) {
      .file-attachment-chip {
        max-width: 200px;
        font-size: 12px;
        padding: 6px 10px;
      }

      .file-attachment-chip > span:first-child {
        font-size: 16px;
      }

      .file-attachment-chip > span:nth-child(3) {
        font-size: 10px;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// CHANGES EXPLANATION STYLES
// ============================================================================

/**
 * Styles for AI Changes Detailed Explanation feature
 */
function addChangesExplanationStyles(): void {
  if (document.getElementById('changes-explanation-styles')) {
    return; // Already added
  }

  const styles = document.createElement('style');
  styles.id = 'changes-explanation-styles';
  styles.textContent = `
    /* ============================================================================ */
    /* EXPLANATION BUTTON CONTAINER */
    /* ============================================================================ */
    
    .explanation-button-container {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }
    
    /* ============================================================================ */
    /* DETAILED EXPLANATION BUTTON */
    /* ============================================================================ */
    
    .detailed-explanation-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    
    .detailed-explanation-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
      background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
    }
    
    .detailed-explanation-btn:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
    }
    
    .detailed-explanation-btn svg {
      margin-right: 6px;
      flex-shrink: 0;
    }
    
    /* ============================================================================ */
    /* EXPLANATION PANEL */
    /* ============================================================================ */
    
    .detailed-explanation-panel {
      margin: 16px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      overflow: hidden;
      animation: slideDown 0.4s ease-out;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
    }
    
    /* ============================================================================ */
    /* PANEL HEADER */
    /* ============================================================================ */
    
    .detailed-explanation-panel > div:first-child {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .close-explanation-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 20px;
      font-weight: bold;
    }
    
    .close-explanation-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    .close-explanation-btn:active {
      transform: scale(0.95);
    }
    
    /* ============================================================================ */
    /* PANEL CONTENT */
    /* ============================================================================ */
    
    .detailed-explanation-panel > div:last-child {
      padding: 20px;
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.7;
      max-height: 600px;
      overflow-y: auto;
    }
    
    /* Content scrollbar */
    .detailed-explanation-panel > div:last-child::-webkit-scrollbar {
      width: 8px;
    }
    
    .detailed-explanation-panel > div:last-child::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    .detailed-explanation-panel > div:last-child::-webkit-scrollbar-thumb {
      background: #6366f1;
      border-radius: 4px;
    }
    
    .detailed-explanation-panel > div:last-child::-webkit-scrollbar-thumb:hover {
      background: #8b5cf6;
    }
    
    /* ============================================================================ */
    /* RENDERED CONTENT STYLES */
    /* ============================================================================ */
    
    .detailed-explanation-panel h1 {
      color: #6366f1;
      font-size: 20px;
      font-weight: 700;
      margin: 24px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid rgba(99, 102, 241, 0.3);
    }
    
    .detailed-explanation-panel h2 {
      color: #8b5cf6;
      font-size: 18px;
      font-weight: 600;
      margin: 20px 0 10px 0;
    }
    
    .detailed-explanation-panel h3 {
      color: #a78bfa;
      font-size: 16px;
      font-weight: 600;
      margin: 16px 0 8px 0;
    }
    
    .detailed-explanation-panel h4 {
      color: #c4b5fd;
      font-size: 14px;
      font-weight: 600;
      margin: 12px 0 6px 0;
    }
    
    .detailed-explanation-panel pre {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      margin: 12px 0;
    }
    
    .detailed-explanation-panel code {
      background: rgba(99, 102, 241, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #c4b5fd;
    }
    
    .detailed-explanation-panel pre code {
      background: transparent;
      padding: 0;
      color: #e1e1e1;
    }
    
    .detailed-explanation-panel ul {
      margin: 8px 0;
      padding-left: 24px;
    }
    
    .detailed-explanation-panel li {
      margin: 4px 0;
      line-height: 1.6;
    }
    
    .detailed-explanation-panel table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      overflow: hidden;
    }
    
    .detailed-explanation-panel td,
    .detailed-explanation-panel th {
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .detailed-explanation-panel th {
      background: rgba(99, 102, 241, 0.2);
      font-weight: 600;
      color: #c4b5fd;
    }
    
    .detailed-explanation-panel strong {
      color: #c4b5fd;
      font-weight: 600;
    }
    
    .detailed-explanation-panel p {
      margin: 8px 0;
      line-height: 1.7;
    }
    
    .detailed-explanation-panel blockquote {
      margin: 12px 0;
      padding: 12px 16px;
      border-left: 4px solid #6366f1;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 4px;
    }
    
    .detailed-explanation-panel a {
      color: #6366f1;
      text-decoration: none;
      border-bottom: 1px solid rgba(99, 102, 241, 0.3);
      transition: all 0.2s;
    }
    
    .detailed-explanation-panel a:hover {
      color: #8b5cf6;
      border-bottom-color: #8b5cf6;
    }
    
    /* ============================================================================ */
    /* ANIMATIONS */
    /* ============================================================================ */
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
    
    /* ============================================================================ */
    /* LOADING STATE */
    /* ============================================================================ */
    
    .detailed-explanation-btn[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  
  document.head.appendChild(styles);
}
// ============================================================================
// MESSAGE EXPAND/COLLAPSE STYLES
// ============================================================================

function addMessageExpandCollapseStyles(): void {
  const styles = document.createElement('style');
  styles.id = 'message-expand-collapse-styles';
  styles.textContent = `
    /* ============================================================================ */
    /* MESSAGE EXPAND/COLLAPSE - MINIMAL STYLES */
    /* ============================================================================ */

    .ai-message-content.message-collapsed {
      position: relative;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ai-message-content.message-collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20px;
      background: linear-gradient(to bottom, transparent, rgba(79, 195, 247, 0.1));
      pointer-events: none;
    }

    .message-expand-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      padding: 3px 8px;
      margin-top: 6px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      align-self: flex-start;
    }

    .message-expand-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.8);
    }

    .message-expand-btn svg {
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .message-expand-btn:active {
      transform: scale(0.95);
    }

    .light-theme .ai-message-content.message-collapsed::after {
      background: linear-gradient(to bottom, transparent, rgba(79, 195, 247, 0.15));
    }

    .light-theme .message-expand-btn {
      border-color: rgba(0, 0, 0, 0.15);
      color: rgba(0, 0, 0, 0.6);
    }

    .light-theme .message-expand-btn:hover {
      background: rgba(0, 0, 0, 0.03);
      border-color: rgba(0, 0, 0, 0.2);
      color: rgba(0, 0, 0, 0.8);
    }
  `;
  
  document.head.appendChild(styles);
}