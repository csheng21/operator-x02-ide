// contextStatusBar_unified.ts - Unified Collapsible Context Status Bar
// ============================================================================
// Combines enhancedContextUI and contextStatusBar into one clean interface

// TypeScript declarations
declare global {
  interface Window {
    monacoEditor?: any;
    monaco?: any;
    intelligentAssistant?: any;
    contextIntegration?: any;
    contextManager?: any;
    conversationManager?: any;
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

interface StatusBarConfig {
  updateInterval?: number;
  defaultExpanded?: boolean;
  showAnimation?: boolean;
}

let config: StatusBarConfig = {
  updateInterval: 5000,
  defaultExpanded: false,
  showAnimation: true
};

// State
let isExpanded = false;

// Activity Indicator State
let lastActivityUpdate = Date.now();
let currentMessageIndex = 0;
let activityUpdateInterval: number | null = null;

// ============================================================================
// SAFE HELPER FUNCTIONS
// ============================================================================

function safeIsContextEnabled(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      // Try window.isContextEnabled
      if (w.isContextEnabled && typeof w.isContextEnabled === 'function') {
        return w.isContextEnabled();
      }
      
      // Try contextIntegration module
      if (w.contextIntegration && w.contextIntegration.isContextEnabled) {
        return w.contextIntegration.isContextEnabled();
      }
      
      // Check localStorage
      const stored = localStorage.getItem('contextSystemEnabled');
      if (stored !== null) {
        return stored === 'true';
      }
    }
    
    return true;
  } catch (e) {
    console.warn('Error checking context status:', e);
    return true;
  }
}

function safeToggleContext(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      // Try window.toggleContextSystem
      if (w.toggleContextSystem && typeof w.toggleContextSystem === 'function') {
        w.toggleContextSystem(enabled);
        return;
      }
      
      // Try contextIntegration module
      if (w.contextIntegration && w.contextIntegration.toggleContext) {
        w.contextIntegration.toggleContext(enabled);
        return;
      }
      
      // Fallback to localStorage
      localStorage.setItem('contextSystemEnabled', enabled.toString());
      window.dispatchEvent(new CustomEvent('contextSystemToggled', { 
        detail: { enabled } 
      }));
    }
  } catch (e) {
    console.warn('Could not toggle context:', e);
  }
}

function safeGetContextStatus(): any {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      if (w.getContextStatus && typeof w.getContextStatus === 'function') {
        return w.getContextStatus();
      }
      if (w.contextManager && w.contextManager.getStatus) {
        return w.contextManager.getStatus();
      }
    }
    return { filesTracked: 0, errorsTracked: 0, sessionFiles: 0 };
  } catch (e) {
    return { filesTracked: 0, errorsTracked: 0, sessionFiles: 0 };
  }
}

function safeGetProjectContext(): any {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any;
      
      if (w.contextManager && w.contextManager.getProjectContext) {
        return w.contextManager.getProjectContext();
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getMessagesCount(): number {
  try {
    // Try conversationManager
    const w = window as any;
    if (w.conversationManager && w.conversationManager.getCurrentConversation) {
      const conv = w.conversationManager.getCurrentConversation();
      if (conv && conv.messages && conv.messages.length > 0) {
        return conv.messages.length;
      }
    }
    
    // Try localStorage
    const stored = localStorage.getItem('currentConversation');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.messages) {
        return parsed.messages.length;
      }
    }
    
    // Count DOM messages
    const chatContainer = document.querySelector('.ai-chat-container');
    if (chatContainer) {
      const selectors = [
        '.message:not(.system)',
        '.chat-message',
        '.user-message, .assistant-message',
        '[data-role="user"], [data-role="assistant"]'
      ];
      
      for (const selector of selectors) {
        const messages = chatContainer.querySelectorAll(selector);
        if (messages.length > 0) {
          return messages.length;
        }
      }
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

function getTrackedFilesCount(): number {
  try {
    const intelligentAssistant = (window as any).intelligentAssistant;
    if (intelligentAssistant && intelligentAssistant.getTrackedFiles) {
      const files = intelligentAssistant.getTrackedFiles();
      return Array.isArray(files) ? files.length : 0;
    }
    
    // Try context manager
    const status = safeGetContextStatus();
    return status.sessionFiles || status.filesTracked || 0;
  } catch (e) {
    return 0;
  }
}

// ============================================================================
// ACTIVITY INDICATOR HELPERS
// ============================================================================

function getActivityMessages(): string[] {
  const filesCount = getTrackedFilesCount();
  const messagesCount = getMessagesCount();
  
  const messages: string[] = [];
  
  if (filesCount > 0) {
    messages.push(`Tracking ${filesCount} file${filesCount === 1 ? '' : 's'}...`);
  }
  
  if (messagesCount > 0) {
    messages.push(`${messagesCount} message${messagesCount === 1 ? '' : 's'} captured`);
  }
  
  messages.push('Context active');
  messages.push('Monitoring changes...');
  
  if (filesCount === 0 && messagesCount === 0) {
    messages.push('Ready to assist');
  }
  
  return messages;
}

function getTimeIndicator(): string {
  const elapsed = (Date.now() - lastActivityUpdate) / 1000;
  
  if (elapsed < 5) {
    return 'Now';
  } else if (elapsed < 15) {
    return '5s ago';
  } else {
    return 'Active';
  }
}

function updateActivityIndicator(): void {
  const pulseDot = document.querySelector('.pulse-dot');
  const activityMessage = document.querySelector('.activity-message');
  const activityTime = document.querySelector('.activity-time');
  
  if (!pulseDot || !activityMessage || !activityTime) {
    return;
  }
  
  // Update pulse dot based on context status
  const enabled = safeIsContextEnabled();
  if (enabled) {
    pulseDot.classList.remove('inactive');
  } else {
    pulseDot.classList.add('inactive');
  }
  
  // Update time indicator
  activityTime.textContent = getTimeIndicator();
  
  // Rotate message with 30% chance every 5 seconds
  if (Math.random() < 0.3) {
    const messages = getActivityMessages();
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    activityMessage.textContent = messages[currentMessageIndex];
    lastActivityUpdate = Date.now();
  }
}

function showNotification(message: string): void {
  try {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4fc3f7, #42a5f5);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  } catch (e) {
    console.log(message);
  }
}

// ============================================================================
// UPLOAD CONFIRMATION MODAL
// ============================================================================

function showUploadConfirmModal(contextData: any, onConfirm: () => void): void {
  // Remove existing modal if any
  const existingModal = document.querySelector('.ctx-upload-confirm-modal');
  if (existingModal) existingModal.remove();
  
  // Extract data safely - handle various data formats
  let projectName = 'None';
  if (contextData.project) {
    if (typeof contextData.project === 'string') {
      projectName = contextData.project;
    } else if (typeof contextData.project.projectName === 'string') {
      projectName = contextData.project.projectName;
    } else if (typeof contextData.project.name === 'string') {
      projectName = contextData.project.name;
    }
  }
  
  let projectPath = '';
  if (contextData.project) {
    if (typeof contextData.project.projectPath === 'string') {
      projectPath = contextData.project.projectPath;
    } else if (typeof contextData.project.path === 'string') {
      projectPath = contextData.project.path;
    }
  }
  
  const trackedFiles = contextData.trackedFiles || [];
  const decisions = contextData.decisions || [];
  const filesCount = trackedFiles.length;
  const decisionsCount = decisions.length;
  const sizeKB = contextData.contextSizeKB || 0;
  const exportDate = contextData.timestamp ? new Date(contextData.timestamp).toLocaleString() : 'Unknown';
  
  // Build files list HTML
  let filesListHTML = '';
  if (trackedFiles.length > 0) {
    trackedFiles.slice(0, 20).forEach((f: any, i: number) => {
      const name = f.name || (f.path ? f.path.split(/[\\/]/).pop() : 'Unknown');
      const lang = f.language || (f.extension ? f.extension.toUpperCase() : '');
      const path = f.path || '';
      filesListHTML += `
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: ${i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};
          border-radius: 4px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2" style="flex-shrink: 0;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #ddd; font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${name}
            </div>
            <div style="color: #666; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${path}
            </div>
          </div>
          ${lang ? `<span style="color: #888; font-size: 10px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 3px;">${lang}</span>` : ''}
        </div>
      `;
    });
    if (trackedFiles.length > 20) {
      filesListHTML += `<div style="color: #888; font-size: 11px; padding: 8px 10px; text-align: center;">... and ${trackedFiles.length - 20} more files</div>`;
    }
  } else {
    filesListHTML = '<div style="color: #666; font-size: 12px; padding: 16px; text-align: center; font-style: italic;">No files in this context</div>';
  }
  
  // Build decisions list HTML
  let decisionsListHTML = '';
  const decisionIcons: Record<string, string> = {
    'create': '➕',
    'modify': '✏️',
    'delete': '🗑️',
    'refactor': '🔄',
    'rename': '📝',
    'move': '📦',
    'ai-suggestion': '🤖',
    'user-action': '👤'
  };
  
  if (decisions.length > 0) {
    decisions.slice(0, 20).forEach((d: any, i: number) => {
      const icon = decisionIcons[d.type] || '•';
      const desc = d.description || d.type || 'Action';
      const time = d.timestamp ? new Date(d.timestamp).toLocaleString() : '';
      decisionsListHTML += `
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          background: ${i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'};
          border-radius: 4px;
        ">
          <span style="font-size: 12px; flex-shrink: 0;">${icon}</span>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #ddd; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${desc}
            </div>
            ${time ? `<div style="color: #666; font-size: 10px;">${time}</div>` : ''}
          </div>
        </div>
      `;
    });
    if (decisions.length > 20) {
      decisionsListHTML += `<div style="color: #888; font-size: 11px; padding: 8px 10px; text-align: center;">... and ${decisions.length - 20} more decisions</div>`;
    }
  } else {
    decisionsListHTML = '<div style="color: #666; font-size: 12px; padding: 16px; text-align: center; font-style: italic;">No decisions in this context</div>';
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'ctx-upload-confirm-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    animation: ctxFadeIn 0.2s ease;
  `;
  
  // Add keyframe animation if not exists
  if (!document.querySelector('#ctx-modal-animations')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'ctx-modal-animations';
    animStyle.textContent = `
      @keyframes ctxFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ctxSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(animStyle);
  }
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 12px;
      width: 520px;
      max-width: 90vw;
      max-height: 85vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
      animation: ctxSlideUp 0.25s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    ">
      <!-- Header -->
      <div style="
        padding: 20px 24px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      ">
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <div>
          <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">Upload Context</h3>
          <p style="margin: 4px 0 0; color: #888; font-size: 12px;">Review the context data before restoring</p>
        </div>
      </div>
      
      <!-- Scrollable Content -->
      <div style="overflow-y: auto; flex: 1;">
        <div style="padding: 20px 24px;">
          <!-- Summary Cards -->
          <div style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          ">
            <!-- Project -->
            <div style="
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 8px;
              padding: 12px;
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span style="color: #888; font-size: 11px; text-transform: uppercase;">Project</span>
              </div>
              <div style="color: #fff; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${projectName}
              </div>
            </div>
            
            <!-- Files -->
            <div style="
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 8px;
              padding: 12px;
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span style="color: #888; font-size: 11px; text-transform: uppercase;">Files</span>
              </div>
              <div style="color: #2196f3; font-size: 18px; font-weight: 600;">${filesCount}</div>
            </div>
            
            <!-- Decisions -->
            <div style="
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 8px;
              padding: 12px;
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span style="color: #888; font-size: 11px; text-transform: uppercase;">Decisions</span>
              </div>
              <div style="color: #ff9800; font-size: 18px; font-weight: 600;">${decisionsCount}</div>
            </div>
            
            <!-- Size -->
            <div style="
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.06);
              border-radius: 8px;
              padding: 12px;
            ">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                <span style="color: #888; font-size: 11px; text-transform: uppercase;">Size</span>
              </div>
              <div style="color: #9c27b0; font-size: 18px; font-weight: 600;">${sizeKB} KB</div>
            </div>
          </div>
          
          <!-- Export Date -->
          <div style="
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            padding: 10px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style="color: #888; font-size: 12px;">Exported: </span>
            <span style="color: #ccc; font-size: 12px;">${exportDate}</span>
          </div>
          
          <!-- View Details Button -->
          <button id="ctx-view-details-btn" style="
            width: 100%;
            padding: 10px 14px;
            background: rgba(79, 195, 247, 0.08);
            border: 1px solid rgba(79, 195, 247, 0.2);
            border-radius: 6px;
            color: #4fc3f7;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 12px;
          ">
            <svg id="ctx-details-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease;">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span id="ctx-details-text">View Details</span>
          </button>
          
          <!-- Collapsible Details Section -->
          <div id="ctx-details-section" style="
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
          ">
            <!-- Files Tab -->
            <div style="
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              margin-bottom: 12px;
              overflow: hidden;
            ">
              <div style="
                padding: 10px 14px;
                background: rgba(33, 150, 243, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span style="color: #2196f3; font-size: 12px; font-weight: 600;">Tracked Files (${filesCount})</span>
              </div>
              <div style="max-height: 200px; overflow-y: auto;">
                ${filesListHTML}
              </div>
            </div>
            
            <!-- Decisions Tab -->
            <div style="
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              margin-bottom: 12px;
              overflow: hidden;
            ">
              <div style="
                padding: 10px 14px;
                background: rgba(255, 152, 0, 0.1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span style="color: #ff9800; font-size: 12px; font-weight: 600;">Decisions (${decisionsCount})</span>
              </div>
              <div style="max-height: 200px; overflow-y: auto;">
                ${decisionsListHTML}
              </div>
            </div>
          </div>
          
          <!-- Warning -->
          <div style="
            background: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.2);
            border-radius: 6px;
            padding: 12px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span style="color: #ffb74d; font-size: 12px; line-height: 1.4;">
              This will <strong>replace</strong> your current context data. This action cannot be undone.
            </span>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      ">
        <button id="ctx-confirm-cancel" style="
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          color: #aaa;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Cancel</button>
        <button id="ctx-confirm-restore" style="
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(76, 175, 80, 0.6) 100%);
          color: white;
          border: 1px solid rgba(76, 175, 80, 0.5);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Restore Context
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // View Details toggle
  const viewDetailsBtn = modal.querySelector('#ctx-view-details-btn') as HTMLButtonElement;
  const detailsSection = modal.querySelector('#ctx-details-section') as HTMLElement;
  const detailsArrow = modal.querySelector('#ctx-details-arrow') as SVGElement;
  const detailsText = modal.querySelector('#ctx-details-text') as HTMLElement;
  let detailsExpanded = false;
  
  viewDetailsBtn?.addEventListener('click', () => {
    detailsExpanded = !detailsExpanded;
    if (detailsExpanded) {
      detailsSection.style.maxHeight = '500px';
      detailsArrow.style.transform = 'rotate(180deg)';
      detailsText.textContent = 'Hide Details';
      viewDetailsBtn.style.background = 'rgba(79, 195, 247, 0.15)';
      viewDetailsBtn.style.borderColor = 'rgba(79, 195, 247, 0.3)';
    } else {
      detailsSection.style.maxHeight = '0';
      detailsArrow.style.transform = 'rotate(0deg)';
      detailsText.textContent = 'View Details';
      viewDetailsBtn.style.background = 'rgba(79, 195, 247, 0.08)';
      viewDetailsBtn.style.borderColor = 'rgba(79, 195, 247, 0.2)';
    }
  });
  
  viewDetailsBtn?.addEventListener('mouseenter', () => {
    viewDetailsBtn.style.background = 'rgba(79, 195, 247, 0.15)';
    viewDetailsBtn.style.borderColor = 'rgba(79, 195, 247, 0.3)';
  });
  viewDetailsBtn?.addEventListener('mouseleave', () => {
    if (!detailsExpanded) {
      viewDetailsBtn.style.background = 'rgba(79, 195, 247, 0.08)';
      viewDetailsBtn.style.borderColor = 'rgba(79, 195, 247, 0.2)';
    }
  });
  
  // Add hover effects for buttons
  const cancelBtn = modal.querySelector('#ctx-confirm-cancel') as HTMLButtonElement;
  const restoreBtn = modal.querySelector('#ctx-confirm-restore') as HTMLButtonElement;
  
  cancelBtn?.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    cancelBtn.style.color = '#fff';
  });
  cancelBtn?.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.color = '#aaa';
  });
  
  restoreBtn?.addEventListener('mouseenter', () => {
    restoreBtn.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 1) 0%, rgba(76, 175, 80, 0.8) 100%)';
    restoreBtn.style.transform = 'translateY(-1px)';
    restoreBtn.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
  });
  restoreBtn?.addEventListener('mouseleave', () => {
    restoreBtn.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.8) 0%, rgba(76, 175, 80, 0.6) 100%)';
    restoreBtn.style.transform = 'translateY(0)';
    restoreBtn.style.boxShadow = 'none';
  });
  
  // Event handlers
  cancelBtn?.addEventListener('click', () => {
    modal.remove();
  });
  
  restoreBtn?.addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// ============================================================================
// EXPORT RENAME MODAL
// ============================================================================

function showExportRenameModal(contextData: any, onConfirm: (filename: string, savePath?: string) => void | Promise<void>): void {
  // Remove existing modal if any
  const existingModal = document.querySelector('.ctx-export-rename-modal');
  if (existingModal) existingModal.remove();
  
  // Generate default filename - handle various data formats
  let projectName = 'context';
  if (contextData.project) {
    if (typeof contextData.project === 'string') {
      projectName = contextData.project;
    } else if (typeof contextData.project.projectName === 'string') {
      projectName = contextData.project.projectName;
    } else if (typeof contextData.project.name === 'string') {
      projectName = contextData.project.name;
    }
  }
  
  // Sanitize project name for filename
  const sanitizedProjectName = String(projectName).replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const defaultFilename = sanitizedProjectName + '-context-' + dateStr;
  
  // Escape for HTML attribute
  const escapedFilename = defaultFilename.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'ctx-export-rename-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    animation: ctxFadeIn 0.2s ease;
  `;
  
  // Add keyframe animation if not exists
  if (!document.querySelector('#ctx-modal-animations')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'ctx-modal-animations';
    animStyle.textContent = `
      @keyframes ctxFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ctxSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(animStyle);
  }
  
  // Get display project name for summary
  let displayProjectName = 'No Project';
  let displayProjectPath = '';
  if (contextData.project) {
    if (typeof contextData.project === 'string') {
      displayProjectName = contextData.project;
    } else if (typeof contextData.project.projectName === 'string') {
      displayProjectName = contextData.project.projectName;
    } else if (typeof contextData.project.name === 'string') {
      displayProjectName = contextData.project.name;
    }
    
    // Get project path
    if (typeof contextData.project.projectPath === 'string') {
      displayProjectPath = contextData.project.projectPath;
    } else if (typeof contextData.project.path === 'string') {
      displayProjectPath = contextData.project.path;
    }
  }
  
  // Escape HTML for path display
  const escapedProjectPath = displayProjectPath.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
      border: 1px solid rgba(33, 150, 243, 0.3);
      border-radius: 12px;
      width: 450px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
      animation: ctxSlideUp 0.25s ease;
      overflow: hidden;
    ">
      <!-- Header -->
      <div style="
        padding: 20px 24px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%);
          border: 1px solid rgba(33, 150, 243, 0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div>
          <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">Export Context</h3>
          <p style="margin: 4px 0 0; color: #888; font-size: 12px;">Choose a name for your exported context file</p>
        </div>
      </div>
      
      <!-- Content -->
      <div style="padding: 20px 24px;">
        <!-- Filename Input -->
        <div style="margin-bottom: 16px;">
          <label style="
            display: block;
            color: #aaa;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Filename</label>
          <div style="
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            overflow: hidden;
            transition: border-color 0.2s ease;
          " id="ctx-filename-wrapper">
            <input 
              type="text" 
              id="ctx-export-filename"
              value="${escapedFilename}"
              style="
                flex: 1;
                background: transparent;
                border: none;
                padding: 12px 14px;
                color: #fff;
                font-size: 14px;
                font-family: 'Consolas', 'Monaco', monospace;
                outline: none;
              "
              spellcheck="false"
              autocomplete="off"
            />
            <span style="
              padding: 12px 14px;
              color: #666;
              font-size: 14px;
              font-family: 'Consolas', 'Monaco', monospace;
              background: rgba(255, 255, 255, 0.03);
              border-left: 1px solid rgba(255, 255, 255, 0.1);
            ">.json</span>
          </div>
        </div>
        
        <!-- Export Summary -->
        <div style="
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 16px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: #888;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Export Summary
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span style="color: #ccc; font-size: 12px;">${contextData.trackedFiles?.length || 0} Files</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9800" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span style="color: #ccc; font-size: 12px;">${contextData.decisions?.length || 0} Decisions</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span style="color: #ccc; font-size: 12px;">${displayProjectName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span style="color: #ccc; font-size: 12px;">${contextData.contextSizeKB || 0} KB</span>
            </div>
          </div>
        </div>
        
        <!-- Project Location -->
        ${displayProjectPath ? `
        <div style="
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 16px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            color: #888;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Project Location
          </div>
          <div style="
            color: #aaa;
            font-size: 11px;
            font-family: 'Consolas', 'Monaco', monospace;
            word-break: break-all;
            line-height: 1.4;
          ">${escapedProjectPath}</div>
        </div>
        ` : ''}
        
        <!-- Save Location -->
        <div style="margin-bottom: 16px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 6px;
            color: #888;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Save Location (optional)
          </label>
          <div style="
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            overflow: hidden;
          ">
            <input 
              type="text" 
              id="ctx-export-path"
              value="${escapedProjectPath}"
              placeholder="Leave empty for Downloads folder, or enter path..."
              style="
                flex: 1;
                padding: 10px 12px;
                background: transparent;
                color: ${displayProjectPath ? '#4fc3f7' : '#ccc'};
                border: none;
                outline: none;
                font-size: 12px;
                font-family: 'Consolas', 'Monaco', monospace;
              "
            />
            <button id="ctx-browse-btn" style="
              padding: 8px 12px;
              background: rgba(255, 255, 255, 0.05);
              color: #888;
              border: none;
              border-left: 1px solid rgba(255, 255, 255, 0.1);
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              Browse
            </button>
          </div>
          <div style="
            color: #666;
            font-size: 10px;
            margin-top: 6px;
            padding-left: 2px;
          ">
            ${displayProjectPath ? '💡 Pre-filled with project folder. Change if needed.' : 'Example: C:\\\\Users\\\\YourName\\\\Documents\\\\backups'}
          </div>
        </div>
        
        <!-- Tip -->
        <div style="
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: #666;
          font-size: 11px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Tip: Use descriptive names like "project-name-backup-2025" for easy identification.</span>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: rgba(0, 0, 0, 0.2);
      ">
        <button id="ctx-export-cancel" style="
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          color: #aaa;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Cancel</button>
        <button id="ctx-export-confirm" style="
          padding: 10px 20px;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.8) 0%, rgba(33, 150, 243, 0.6) 100%);
          color: white;
          border: 1px solid rgba(33, 150, 243, 0.5);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Get elements
  const filenameInput = modal.querySelector('#ctx-export-filename') as HTMLInputElement;
  const filenameWrapper = modal.querySelector('#ctx-filename-wrapper') as HTMLElement;
  const pathInput = modal.querySelector('#ctx-export-path') as HTMLInputElement;
  const browseBtn = modal.querySelector('#ctx-browse-btn') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('#ctx-export-cancel') as HTMLButtonElement;
  const confirmBtn = modal.querySelector('#ctx-export-confirm') as HTMLButtonElement;
  
  // Focus input and select text
  setTimeout(() => {
    filenameInput?.focus();
    filenameInput?.select();
  }, 100);
  
  // Input focus effects
  filenameInput?.addEventListener('focus', () => {
    if (filenameWrapper) {
      filenameWrapper.style.borderColor = 'rgba(33, 150, 243, 0.5)';
      filenameWrapper.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.1)';
    }
  });
  filenameInput?.addEventListener('blur', () => {
    if (filenameWrapper) {
      filenameWrapper.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      filenameWrapper.style.boxShadow = 'none';
    }
  });
  
  // Browse button - open folder dialog
  browseBtn?.addEventListener('click', async () => {
    // Add spin animation if not exists
    if (!document.querySelector('#ctx-spin-style')) {
      const spinStyle = document.createElement('style');
      spinStyle.id = 'ctx-spin-style';
      spinStyle.textContent = `
        @keyframes ctx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(spinStyle);
    }
    
    // Show loading state
    const originalContent = browseBtn.innerHTML;
    browseBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: ctx-spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
    `;
    browseBtn.style.pointerEvents = 'none';
    
    try {
      const w = window as any;
      const currentPath = pathInput?.value.trim() || '';
      
      // Use existing Tauri command for folder dialog
      let selectedPath: string | null = null;
      
      if (w.__TAURI__?.core?.invoke) {
        selectedPath = await w.__TAURI__.core.invoke('open_folder_dialog_with_path', {
          default_path: currentPath || null
        });
      } else if (w.__TAURI__?.invoke) {
        selectedPath = await w.__TAURI__.invoke('open_folder_dialog_with_path', {
          default_path: currentPath || null
        });
      }
      
      if (selectedPath && pathInput) {
        pathInput.value = selectedPath;
        pathInput.style.color = '#4fc3f7';
      }
    } catch (err) {
      console.error('Browse dialog error:', err);
      // Show hint to user
      if (pathInput) {
        pathInput.placeholder = 'Enter folder path manually...';
        pathInput.focus();
      }
    } finally {
      // Restore button
      browseBtn.innerHTML = originalContent;
      browseBtn.style.pointerEvents = 'auto';
    }
  });
  
  // Browse button hover
  browseBtn?.addEventListener('mouseenter', () => {
    browseBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    browseBtn.style.color = '#fff';
  });
  browseBtn?.addEventListener('mouseleave', () => {
    browseBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    browseBtn.style.color = '#888';
  });
  
  // Helper function to get values
  const getExportValues = () => {
    const filename = filenameInput?.value.trim() || defaultFilename;
    const savePath = pathInput?.value.trim() || undefined;
    return { filename, savePath };
  };
  
  // Enter key to confirm
  filenameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { filename, savePath } = getExportValues();
      modal.remove();
      onConfirm(filename, savePath);
    }
  });
  
  // Enter on path input also confirms
  pathInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const { filename, savePath } = getExportValues();
      modal.remove();
      onConfirm(filename, savePath);
    }
  });
  
  // Button hover effects
  cancelBtn?.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    cancelBtn.style.color = '#fff';
  });
  cancelBtn?.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    cancelBtn.style.color = '#aaa';
  });
  
  confirmBtn?.addEventListener('mouseenter', () => {
    confirmBtn.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 1) 0%, rgba(33, 150, 243, 0.8) 100%)';
    confirmBtn.style.transform = 'translateY(-1px)';
    confirmBtn.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
  });
  confirmBtn?.addEventListener('mouseleave', () => {
    confirmBtn.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.8) 0%, rgba(33, 150, 243, 0.6) 100%)';
    confirmBtn.style.transform = 'translateY(0)';
    confirmBtn.style.boxShadow = 'none';
  });
  
  // Event handlers
  cancelBtn?.addEventListener('click', () => {
    modal.remove();
  });
  
  confirmBtn?.addEventListener('click', () => {
    const { filename, savePath } = getExportValues();
    modal.remove();
    onConfirm(filename, savePath);
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// ============================================================================
// STYLES
// ============================================================================

function addStatusBarStyles(): void {
  if (document.getElementById('unified-status-bar-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'unified-status-bar-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes expandWidth {
      from {
        max-width: 0;
        opacity: 0;
      }
      to {
        max-width: 500px;
        opacity: 1;
      }
    }
    
    @keyframes collapseWidth {
      from {
        max-width: 500px;
        opacity: 1;
      }
      to {
        max-width: 0;
        opacity: 0;
      }
    }
    
    .unified-status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      font-size: 13px;
      color: #858585;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      user-select: none;
    }
    
    .unified-status-bar:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    
    .status-compact-view {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      overflow: hidden;
    }
    
    .status-compact-view:hover {
      color: #CCCCCC;
    }
    
    .status-icon {
      font-size: 14px;
      line-height: 1;
      transition: all 0.3s;
    }
    
    .status-icon.active {
      color: #4CAF50;
      filter: drop-shadow(0 0 3px rgba(76, 175, 80, 0.6));
    }
    
    .status-icon.inactive {
      color: #F44336;
      filter: drop-shadow(0 0 3px rgba(244, 67, 54, 0.6));
    }
    
    .status-expand-arrow {
      opacity: 0.5;
      font-size: 10px;
      transition: transform 0.3s ease;
    }
    
    .status-expand-arrow.expanded {
      transform: rotate(180deg);
    }
    
    .status-expanded-view {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .status-expanded-view.hidden {
      max-width: 0;
      opacity: 0;
    }
    
    .status-expanded-view.visible {
      max-width: 500px;
      opacity: 1;
      animation: expandWidth 0.3s ease;
    }
    
    .status-info-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      font-size: 12px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .status-info-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #CCCCCC;
    }
    
    .status-action-btn {
      background: rgba(79, 195, 247, 0.15);
      border: 1px solid rgba(79, 195, 247, 0.3);
      color: #4fc3f7;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .status-action-btn:hover {
      background: rgba(79, 195, 247, 0.25);
      border-color: rgba(79, 195, 247, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(79, 195, 247, 0.3);
    }
    
    .status-action-btn:active {
      transform: translateY(0);
    }
    
    .status-separator {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.2);
      margin: 0 4px;
    }
    
    /* Activity Indicator Styles */
    .activity-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      opacity: 1;
      transition: opacity 0.3s ease, max-width 0.3s ease;
      overflow: hidden;
      flex-shrink: 1;
      min-width: 0;
    }
    
    .activity-indicator.hidden {
      opacity: 0;
      max-width: 0;
      overflow: hidden;
    }
    
    .activity-indicator.visible {
      opacity: 1;
      max-width: 300px;
    }
    
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4fc3f7;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      flex-shrink: 0;
    }
    
    .pulse-dot.inactive {
      background: #666666;
      animation: none;
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(79, 195, 247, 0.7);
      }
      50% {
        transform: scale(1.2);
        opacity: 0.8;
        box-shadow: 0 0 0 4px rgba(79, 195, 247, 0);
      }
    }
    
    .activity-message {
      color: #888888;
      font-size: 11px;
      font-weight: 400;
      white-space: nowrap;
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    
    .activity-time {
      color: #666666;
      font-size: 10px;
      font-weight: 400;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `;
  
  document.head.appendChild(style);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function isStatusBarInitialized(): boolean {
  return (window as any).__unifiedStatusBarInitialized === true;
}

function markStatusBarInitialized(): void {
  (window as any).__unifiedStatusBarInitialized = true;
}

function removeAllStatusBars(): void {
  // Clear activity update interval
  if (activityUpdateInterval) {
    clearInterval(activityUpdateInterval);
    activityUpdateInterval = null;
  }
  
  // Remove unified bars
  document.querySelectorAll('#unified-status-bar').forEach(bar => bar.remove());
  document.querySelectorAll('.unified-status-bar').forEach(bar => bar.remove());
  
  // Remove old bars
  document.querySelectorAll('#context-status-bar').forEach(bar => bar.remove());
  document.querySelectorAll('#context-status-indicator').forEach(bar => bar.remove());
  
  console.log('🗑️ Removed all existing status bars');
}

export function initializeUnifiedStatusBar(userConfig?: Partial<StatusBarConfig>): void {
  console.log('🚀 Initializing unified status bar...');
  
  // Merge config
  if (userConfig) {
    config = { ...config, ...userConfig };
  }
  
  // Guard against double initialization
  if (isStatusBarInitialized()) {
    console.log('⚠️ Status bar already initialized, updating instead');
    updateUnifiedStatusBar();
    return;
  }
  
  // Add styles
  addStatusBarStyles();
  
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(createUnifiedStatusBar, 100);
    });
  } else {
    setTimeout(createUnifiedStatusBar, 100);
  }
  
  markStatusBarInitialized();
}

// ============================================================================
// CREATE STATUS BAR
// ============================================================================

function createUnifiedStatusBar(): void {
  console.log('🔨 Creating unified status bar...');
  
  // Find assistant panel
  const assistantPanel = document.querySelector('.assistant-panel');
  if (!assistantPanel) {
    console.warn('⚠️ Assistant panel not found, retrying...');
    setTimeout(createUnifiedStatusBar, 1000);
    return;
  }
  
  // Remove any existing bars
  removeAllStatusBars();
  
  // Create main container
  const statusBar = document.createElement('div');
  statusBar.id = 'unified-status-bar';
  statusBar.style.display = 'none';
  statusBar.className = 'unified-status-bar';
  
  // Create compact view (always visible)
  const compactView = document.createElement('div');
  compactView.className = 'status-compact-view';
  
  // Get initial activity message
  const initialMessages = getActivityMessages();
  const initialMessage = initialMessages.length > 0 ? initialMessages[0] : 'Ready to assist';
  
  compactView.innerHTML = `
    <span class="status-icon ${safeIsContextEnabled() ? 'active' : 'inactive'}" 
          id="status-icon" 
          title="Context Status: ${safeIsContextEnabled() ? 'ON' : 'OFF'}">
      ●
    </span>
    <span title="Messages in conversation">
      💬 <span id="message-count" style="font-weight: 500;">0</span>
    </span>
    <span class="status-expand-arrow" id="expand-arrow">▼</span>
    
    <div class="activity-indicator visible" id="activity-indicator">
      <div class="pulse-dot ${safeIsContextEnabled() ? '' : 'inactive'}"></div>
      <span class="activity-message">${initialMessage}</span>
      <span class="activity-time">Now</span>
    </div>
  `;
  
  // Create expanded view (hidden by default)
  const expandedView = document.createElement('div');
  expandedView.className = 'status-expanded-view hidden';
  expandedView.id = 'expanded-view';
  
  const project = safeGetProjectContext();
  const status = safeGetContextStatus();
  const filesCount = getTrackedFilesCount();
  
  expandedView.innerHTML = `
    <span class="status-separator"></span>
    
    <span class="status-info-item" id="project-info" title="${project ? project.projectName : 'No project loaded'}">
      ${project ? '📁' : '❌'} <span>${project ? (String(project.projectName || "")).substring(0, 15) + ((String(project.projectName || "")).length > 15 ? '...' : '') : 'No Project'}</span>
    </span>
    
    <span class="status-info-item" id="files-info" title="${filesCount} files tracked">
      📄 <span id="files-count">${filesCount}</span>
    </span>
    
    <span class="status-separator"></span>
    
    <button class="status-action-btn" id="context-setup-btn" title="Setup Context">
      ⚙️ Setup
    </button>
    
    <button class="status-action-btn" id="context-view-btn" title="View Context Details">
      👁️ View
    </button>
  `;
  
  // Assemble status bar
  statusBar.appendChild(compactView);
  statusBar.appendChild(expandedView);
  
  // Insert into DOM - at the very top of assistant panel
  assistantPanel.insertBefore(statusBar, assistantPanel.firstChild);
  
  // Attach event listeners
  attachEventListeners();
  
  // Initial update
  updateUnifiedStatusBar();
  updateActivityIndicator();
  
  // Set up auto-update
  setInterval(updateUnifiedStatusBar, config.updateInterval);
  
  // Set up activity indicator updates every 5 seconds
  if (activityUpdateInterval) {
    clearInterval(activityUpdateInterval);
  }
  activityUpdateInterval = window.setInterval(updateActivityIndicator, 5000);
  
  // Listen for context changes
  window.addEventListener('contextSystemToggled', updateUnifiedStatusBar);
  
  console.log('✅ Unified status bar created successfully');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function attachEventListeners(): void {
  // Toggle expand/collapse
  const compactView = document.querySelector('.status-compact-view');
  const expandArrow = document.getElementById('expand-arrow');
  const expandedView = document.getElementById('expanded-view');
  const activityIndicator = document.getElementById('activity-indicator');
  
  compactView?.addEventListener('click', (e) => {
    e.stopPropagation();
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      // Expanding - hide activity indicator
      activityIndicator?.classList.remove('visible');
      activityIndicator?.classList.add('hidden');
      
      expandedView?.classList.remove('hidden');
      expandedView?.classList.add('visible');
      expandArrow?.classList.add('expanded');
    } else {
      // Collapsing - show activity indicator
      activityIndicator?.classList.remove('hidden');
      activityIndicator?.classList.add('visible');
      
      expandedView?.classList.remove('visible');
      expandedView?.classList.add('hidden');
      expandArrow?.classList.remove('expanded');
    }
    
    console.log('📊 Status bar', isExpanded ? 'expanded' : 'collapsed');
  });
  
  // Setup button
  const setupBtn = document.getElementById('context-setup-btn');
  setupBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    showContextSetupModal();
  });
  
  // View button
  const viewBtn = document.getElementById('context-view-btn');
  viewBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    showContextDetailsModal();
  });
  
  // Click status icon to toggle context
  const statusIcon = document.getElementById('status-icon');
  statusIcon?.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentState = safeIsContextEnabled();
    safeToggleContext(!currentState);
    setTimeout(updateUnifiedStatusBar, 100);
  });
  
  // Expose modal functions globally for unified header buttons
  (window as any).showContextSetupModal = showContextSetupModal;
  (window as any).showContextViewModal = showContextDetailsModal;
  (window as any).showContextDashboard = showContextDetailsModal;
}

// ============================================================================
// UPDATE FUNCTION
// ============================================================================

export function updateUnifiedStatusBar(): void {
  const statusIcon = document.getElementById('status-icon');
  const messageCount = document.getElementById('message-count');
  const projectInfo = document.getElementById('project-info');
  const filesCount = document.getElementById('files-count');
  
  if (!statusIcon || !messageCount) {
    console.warn('⚠️ Status bar elements not found');
    return;
  }
  
  // Update context status icon
  const enabled = safeIsContextEnabled();
  statusIcon.className = `status-icon ${enabled ? 'active' : 'inactive'}`;
  statusIcon.title = `Context Status: ${enabled ? 'ON' : 'OFF'}`;
  
  // Update message count
  const count = getMessagesCount();
  messageCount.textContent = count.toString();
  
  // Update project info
  const project = safeGetProjectContext();
  if (projectInfo) {
    const projectName = project ? project.projectName : 'No Project';
    const shortName = (String(projectName || '')).substring(0, 15) + (projectName.length > 15 ? '...' : '');
    projectInfo.innerHTML = `${project ? '📁' : '❌'} <span>${shortName}</span>`;
    projectInfo.title = project ? projectName : 'No project loaded';
  }
  
  // Update files count
  const files = getTrackedFilesCount();
  if (filesCount) {
    filesCount.textContent = files.toString();
  }
  
  // Update activity indicator
  updateActivityIndicator();
  
  console.log('📊 Status bar updated - Messages:', count, 'Files:', files, 'Context:', enabled ? 'ON' : 'OFF');
}

// ============================================================================
// CONTEXT SETUP MODAL
// ============================================================================

function showContextSetupModal(): void {
  const modal = document.createElement('div');
  modal.className = 'context-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;
  
  const isEnabled = safeIsContextEnabled();
  
  // Get settings from localStorage
  const trackDecisions = localStorage.getItem('contextTrackDecisions') !== 'false';
  const trackFileChanges = localStorage.getItem('contextTrackFileChanges') !== 'false';
  const showNotifications = localStorage.getItem('contextShowNotifications') !== 'false';
  const autoSave = localStorage.getItem('contextAutoSave') !== 'false';
  const updateInterval = localStorage.getItem('contextUpdateInterval') || '10';
  
  modal.innerHTML = `
    <div style="
      background: #2b2b2b;
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      color: #e0e0e0;
    ">
      <!-- Header -->
      <div style="
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(30, 30, 30, 0.5);
      ">
        <h2 style="margin: 0; color: #4fc3f7; font-size: 18px; font-weight: 600;">
          ⚙️ Context Settings
        </h2>
        <button class="modal-close-btn" style="
          background: none;
          border: none;
          color: #999;
          font-size: 28px;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>
      
      <!-- Body -->
      <div style="padding: 24px;">
        <!-- Context System Status -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            margin: 0 0 16px 0;
            color: #4fc3f7;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Context System Status</h3>
          
          <div style="
            background: rgba(40, 40, 40, 0.8);
            border-left: 3px solid #4fc3f7;
            border-radius: 4px;
            padding: 16px;
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #b0b0b0; font-size: 14px;">Context Tracking:</span>
              <span style="color: #4caf50; font-size: 14px; font-weight: 600;">
                ✓ ${isEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #b0b0b0; font-size: 14px;">Auto-Save:</span>
              <span style="color: #4caf50; font-size: 14px; font-weight: 600;">
                ✓ ${autoSave ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #b0b0b0; font-size: 14px;">Update Interval:</span>
              <span style="color: #e0e0e0; font-size: 14px; font-weight: 600;">
                ${updateInterval} seconds
              </span>
            </div>
          </div>
        </div>
        
        <!-- Options -->
        <div style="margin-bottom: 24px;">
          <h3 style="
            margin: 0 0 16px 0;
            color: #4fc3f7;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Options</h3>
          
          <!-- Track Decisions -->
          <label style="
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
            cursor: pointer;
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
            transition: background 0.2s;
          " class="option-item">
            <input type="checkbox" id="track-decisions" ${trackDecisions ? 'checked' : ''} style="
              margin-right: 12px;
              margin-top: 2px;
              cursor: pointer;
              width: 18px;
              height: 18px;
              accent-color: #4fc3f7;
            ">
            <div>
              <div style="color: #e0e0e0; font-size: 14px; font-weight: 600; margin-bottom: 4px;">
                Track Decisions
              </div>
              <div style="color: #888; font-size: 12px; line-height: 1.5;">
                Record important development decisions automatically
              </div>
            </div>
          </label>
          
          <!-- Track File Changes -->
          <label style="
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
            cursor: pointer;
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
            transition: background 0.2s;
          " class="option-item">
            <input type="checkbox" id="track-file-changes" ${trackFileChanges ? 'checked' : ''} style="
              margin-right: 12px;
              margin-top: 2px;
              cursor: pointer;
              width: 18px;
              height: 18px;
              accent-color: #4fc3f7;
            ">
            <div>
              <div style="color: #e0e0e0; font-size: 14px; font-weight: 600; margin-bottom: 4px;">
                Track File Changes
              </div>
              <div style="color: #888; font-size: 12px; line-height: 1.5;">
                Monitor files opened and modified during session
              </div>
            </div>
          </label>
          
          <!-- Show Notifications -->
          <label style="
            display: flex;
            align-items: flex-start;
            cursor: pointer;
            padding: 12px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
            transition: background 0.2s;
          " class="option-item">
            <input type="checkbox" id="show-notifications" ${showNotifications ? 'checked' : ''} style="
              margin-right: 12px;
              margin-top: 2px;
              cursor: pointer;
              width: 18px;
              height: 18px;
              accent-color: #4fc3f7;
            ">
            <div>
              <div style="color: #e0e0e0; font-size: 14px; font-weight: 600; margin-bottom: 4px;">
                Show Notifications
              </div>
              <div style="color: #888; font-size: 12px; line-height: 1.5;">
                Display alerts for important context events
              </div>
            </div>
          </label>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: rgba(30, 30, 30, 0.5);
      ">
        <button id="reset-settings-btn" style="
          padding: 10px 24px;
          background: rgba(255, 255, 255, 0.08);
          color: #ccc;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        ">Reset</button>
        
        <button id="save-settings-btn" style="
          padding: 10px 24px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        ">Save Settings</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add hover effects
  const style = document.createElement('style');
  style.textContent = `
    .option-item:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    #save-settings-btn:hover {
      background: #1976D2 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
    }
    #reset-settings-btn:hover {
      background: rgba(255, 255, 255, 0.12) !important;
      color: #fff;
    }
    .modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
    }
  `;
  document.head.appendChild(style);
  
  // Event handlers
  const closeButtons = modal.querySelectorAll('.modal-close-btn');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.remove();
      style.remove();
    });
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      style.remove();
    }
  });
  
  // Save settings button
  const saveBtn = modal.querySelector('#save-settings-btn');
  saveBtn?.addEventListener('click', () => {
    const trackDecisionsInput = modal.querySelector('#track-decisions') as HTMLInputElement;
    const trackFileChangesInput = modal.querySelector('#track-file-changes') as HTMLInputElement;
    const showNotificationsInput = modal.querySelector('#show-notifications') as HTMLInputElement;
    
    // Save to localStorage
    localStorage.setItem('contextTrackDecisions', trackDecisionsInput?.checked.toString() || 'true');
    localStorage.setItem('contextTrackFileChanges', trackFileChangesInput?.checked.toString() || 'true');
    localStorage.setItem('contextShowNotifications', showNotificationsInput?.checked.toString() || 'true');
    
    showNotification('✅ Settings saved successfully');
    modal.remove();
    style.remove();
  });
  
  // Reset button
  const resetBtn = modal.querySelector('#reset-settings-btn');
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.removeItem('contextTrackDecisions');
      localStorage.removeItem('contextTrackFileChanges');
      localStorage.removeItem('contextShowNotifications');
      localStorage.removeItem('contextAutoSave');
      localStorage.removeItem('contextUpdateInterval');
      
      showNotification('🔄 Settings reset to defaults');
      modal.remove();
      style.remove();
      
      // Reopen to show updated values
      setTimeout(() => showContextSetupModal(), 100);
    }
  });
}
  

// ============================================================================
// CONTEXT DETAILS MODAL
// ============================================================================

function showContextDetailsModal(): void {
  const modal = document.createElement('div');
  modal.className = 'context-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;
  
  const project = safeGetProjectContext();
  const filesCount = getTrackedFilesCount();
  const messagesCount = getMessagesCount();
  const isEnabled = safeIsContextEnabled();
  
  // Get tracked files info
  const w = window as any;
  let trackedFiles: any[] = [];
  let decisions: any[] = [];
  try {
    if (w.intelligentAssistant && w.intelligentAssistant.getTrackedFiles) {
      trackedFiles = w.intelligentAssistant.getTrackedFiles() || [];
    } else if (w.contextManager && w.contextManager.getTrackedFiles) {
      trackedFiles = w.contextManager.getTrackedFiles() || [];
    }
    
    // Get decisions
    if (w.contextManager && w.contextManager.getDecisions) {
      decisions = w.contextManager.getDecisions() || [];
    }
  } catch (e) {
    console.warn('Could not get context data:', e);
  }
  
  // Calculate file type distribution
  const fileTypeDistribution: Record<string, number> = {};
  trackedFiles.forEach((file: any) => {
    const filePath = file.path || file.name || file;
    if (typeof filePath === 'string') {
      const ext = filePath.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypeDistribution[ext] = (fileTypeDistribution[ext] || 0) + 1;
    }
  });
  
  // Calculate total context size (estimate)
  const contextSizeEstimate = (messagesCount * 500) + (trackedFiles.length * 1000);
  const contextSizeKB = Math.round(contextSizeEstimate / 1024);
  
  // Get top 3 file types for chart
  const topFileTypes = Object.entries(fileTypeDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const totalFiles = trackedFiles.length || 1; // Avoid division by zero
  
  modal.innerHTML = `
    <div style="
      background: #2b2b2b;
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 8px;
      width: 90%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      color: #e0e0e0;
    ">
      <!-- Header -->
      <div style="
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(30, 30, 30, 0.5);
        position: sticky;
        top: 0;
        z-index: 1;
        backdrop-filter: blur(10px);
      ">
        <h2 style="margin: 0; color: #4fc3f7; font-size: 18px; font-weight: 600;">
          📊 Context Analytics Dashboard
        </h2>
        <button class="modal-close-btn" style="
          background: none;
          border: none;
          color: #999;
          font-size: 28px;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          padding: 0;
          line-height: 1;
        ">×</button>
      </div>
      
      <!-- Body -->
      <div style="padding: 24px;">
        <!-- Key Metrics Grid -->
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        ">
          <!-- Messages Card -->
          <div id="metric-card-messages" class="metric-card-clickable" style="
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05));
            border: 1px solid rgba(76, 175, 80, 0.3);
            border-radius: 8px;
            padding: 20px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              position: absolute;
              top: -10px;
              right: -10px;
              font-size: 60px;
              opacity: 0.1;
            ">💬</div>
            <div style="color: #4caf50; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              Messages
            </div>
            <div style="color: #fff; font-size: 32px; font-weight: 700; margin-bottom: 4px;">
              ${messagesCount}
            </div>
            <div style="color: #888; font-size: 11px;">
              In conversation
            </div>
            <div style="position: absolute; bottom: 8px; right: 12px; color: rgba(76, 175, 80, 0.5); font-size: 10px;">Click for details</div>
          </div>
          
          <!-- Files Card -->
          <div id="metric-card-files" class="metric-card-clickable" style="
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05));
            border: 1px solid rgba(33, 150, 243, 0.3);
            border-radius: 8px;
            padding: 20px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              position: absolute;
              top: -10px;
              right: -10px;
              font-size: 60px;
              opacity: 0.1;
            ">📄</div>
            <div style="color: #2196f3; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              Tracked Files
            </div>
            <div style="color: #fff; font-size: 32px; font-weight: 700; margin-bottom: 4px;">
              ${filesCount}
            </div>
            <div style="color: #888; font-size: 11px;">
              Files monitored
            </div>
            <div style="position: absolute; bottom: 8px; right: 12px; color: rgba(33, 150, 243, 0.5); font-size: 10px;">Click for details</div>
          </div>
          
          <!-- Decisions Card -->
          <div id="metric-card-decisions" class="metric-card-clickable" style="
            background: linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 152, 0, 0.05));
            border: 1px solid rgba(255, 152, 0, 0.3);
            border-radius: 8px;
            padding: 20px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              position: absolute;
              top: -10px;
              right: -10px;
              font-size: 60px;
              opacity: 0.1;
            ">✓</div>
            <div style="color: #ff9800; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              Decisions
            </div>
            <div style="color: #fff; font-size: 32px; font-weight: 700; margin-bottom: 4px;">
              ${decisions.length}
            </div>
            <div style="color: #888; font-size: 11px;">
              Key decisions made
            </div>
            <div style="position: absolute; bottom: 8px; right: 12px; color: rgba(255, 152, 0, 0.5); font-size: 10px;">Click for details</div>
          </div>
          
          <!-- Context Size Card -->
          <div id="metric-card-size" class="metric-card-clickable" style="
            background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05));
            border: 1px solid rgba(156, 39, 176, 0.3);
            border-radius: 8px;
            padding: 20px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="
              position: absolute;
              top: -10px;
              right: -10px;
              font-size: 60px;
              opacity: 0.1;
            ">💾</div>
            <div style="color: #9c27b0; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
              Context Size
            </div>
            <div style="color: #fff; font-size: 32px; font-weight: 700; margin-bottom: 4px;">
              ${contextSizeKB}
            </div>
            <div style="color: #888; font-size: 11px;">
              KB (estimated)
            </div>
            <div style="position: absolute; bottom: 8px; right: 12px; color: rgba(156, 39, 176, 0.5); font-size: 10px;">Click for details</div>
          </div>
        </div>
        
        <!-- Charts Section -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        ">
          <!-- File Types Distribution (Bar Chart) -->
          <div style="
            background: rgba(40, 40, 40, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 20px;
          ">
            <h3 style="
              margin: 0 0 16px 0;
              color: #4fc3f7;
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">📊 File Types Distribution</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${topFileTypes.length > 0 ? topFileTypes.map(([type, count]) => {
                const percentage = ((count / totalFiles) * 100).toFixed(1);
                const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];
                const color = colors[topFileTypes.indexOf([type, count])] || '#666';
                
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                      <span style="color: #ccc; font-size: 12px; text-transform: uppercase;">
                        .${type}
                      </span>
                      <span style="color: #fff; font-size: 12px; font-weight: 600;">
                        ${count} (${percentage}%)
                      </span>
                    </div>
                    <div style="
                      width: 100%;
                      height: 8px;
                      background: rgba(255, 255, 255, 0.05);
                      border-radius: 4px;
                      overflow: hidden;
                    ">
                      <div style="
                        width: ${percentage}%;
                        height: 100%;
                        background: ${color};
                        border-radius: 4px;
                        transition: width 0.5s ease;
                      "></div>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div style="text-align: center; padding: 20px; color: #666;">
                  No files tracked yet
                </div>
              `}
            </div>
          </div>
          
          <!-- Context Activity (Pie Chart) -->
          <div style="
            background: rgba(40, 40, 40, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 20px;
          ">
            <h3 style="
              margin: 0 0 16px 0;
              color: #4fc3f7;
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">🎯 Context Composition</h3>
            
            <div style="display: flex; align-items: center; gap: 20px;">
              <!-- Pie Chart -->
              <div style="position: relative; width: 140px; height: 140px; flex-shrink: 0;">
                <svg width="140" height="140" viewBox="0 0 140 140" style="transform: rotate(-90deg);">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="20"/>
                  ${messagesCount > 0 ? `
                    <circle 
                      cx="70" 
                      cy="70" 
                      r="60" 
                      fill="none" 
                      stroke="#4caf50" 
                      stroke-width="20"
                      stroke-dasharray="${(messagesCount / (messagesCount + filesCount + decisions.length)) * 377} 377"
                      stroke-dashoffset="0"
                    />
                  ` : ''}
                  ${filesCount > 0 ? `
                    <circle 
                      cx="70" 
                      cy="70" 
                      r="60" 
                      fill="none" 
                      stroke="#2196f3" 
                      stroke-width="20"
                      stroke-dasharray="${(filesCount / (messagesCount + filesCount + decisions.length)) * 377} 377"
                      stroke-dashoffset="${-(messagesCount / (messagesCount + filesCount + decisions.length)) * 377}"
                    />
                  ` : ''}
                  ${decisions.length > 0 ? `
                    <circle 
                      cx="70" 
                      cy="70" 
                      r="60" 
                      fill="none" 
                      stroke="#ff9800" 
                      stroke-width="20"
                      stroke-dasharray="${(decisions.length / (messagesCount + filesCount + decisions.length)) * 377} 377"
                      stroke-dashoffset="${-((messagesCount + filesCount) / (messagesCount + filesCount + decisions.length)) * 377}"
                    />
                  ` : ''}
                </svg>
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  text-align: center;
                ">
                  <div style="color: #fff; font-size: 24px; font-weight: 700;">
                    ${messagesCount + filesCount + decisions.length}
                  </div>
                  <div style="color: #888; font-size: 10px; text-transform: uppercase;">
                    Total
                  </div>
                </div>
              </div>
              
              <!-- Legend -->
              <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 12px; height: 12px; background: #4caf50; border-radius: 2px;"></div>
                  <span style="color: #ccc; font-size: 12px; flex: 1;">Messages</span>
                  <span style="color: #fff; font-size: 12px; font-weight: 600;">${messagesCount}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 12px; height: 12px; background: #2196f3; border-radius: 2px;"></div>
                  <span style="color: #ccc; font-size: 12px; flex: 1;">Files</span>
                  <span style="color: #fff; font-size: 12px; font-weight: 600;">${filesCount}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 12px; height: 12px; background: #ff9800; border-radius: 2px;"></div>
                  <span style="color: #ccc; font-size: 12px; flex: 1;">Decisions</span>
                  <span style="color: #fff; font-size: 12px; font-weight: 600;">${decisions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Technical Details -->
        <div style="
          background: rgba(40, 40, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        ">
          <h3 style="
            margin: 0 0 16px 0;
            color: #4fc3f7;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">🔧 Technical Details</h3>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div>
              <div style="color: #888; font-size: 11px; margin-bottom: 4px;">System Status</div>
              <div style="color: #fff; font-size: 14px; font-weight: 600;">
                ${isEnabled ? '🟢 Active' : '🔴 Inactive'}
              </div>
            </div>
            
            <div>
              <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Update Frequency</div>
              <div style="color: #fff; font-size: 14px; font-weight: 600;">
                Every 5s
              </div>
            </div>
            
            <div>
              <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Storage Method</div>
              <div style="color: #fff; font-size: 14px; font-weight: 600;">
                localStorage
              </div>
            </div>
            
            <div>
              <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Auto-Save</div>
              <div style="color: #fff; font-size: 14px; font-weight: 600;">
                ${localStorage.getItem('contextAutoSave') !== 'false' ? '✓ Enabled' : '✗ Disabled'}
              </div>
            </div>
            
            ${project ? `
              <div>
                <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Project Type</div>
                <div style="color: #fff; font-size: 14px; font-weight: 600;">
                  ${project.projectType || 'Not set'}
                </div>
              </div>
            ` : ''}
            
            ${project && project.techStack ? `
              <div style="grid-column: 1 / -1;">
                <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Tech Stack</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
                  ${project.techStack.map((tech: string) => `
                    <span style="
                      background: rgba(79, 195, 247, 0.15);
                      color: #4fc3f7;
                      padding: 4px 10px;
                      border-radius: 4px;
                      font-size: 11px;
                      font-weight: 600;
                      border: 1px solid rgba(79, 195, 247, 0.3);
                    ">${tech}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Tracked Files List -->
        ${trackedFiles.length > 0 ? `
          <div style="
            background: rgba(40, 40, 40, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
          ">
            <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <h3 style="
                margin: 0;
                color: #4fc3f7;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">📁 Tracked Files (${trackedFiles.length})</h3>
            </div>
            <div style="max-height: 250px; overflow-y: auto;">
              ${trackedFiles.slice(0, 10).map((file: any, index: number) => {
                const filePath = file.path || file.name || file;
                const fileName = typeof filePath === 'string' ? filePath.split('/').pop() : 'Unknown';
                const fileExt = typeof filePath === 'string' ? filePath.split('.').pop()?.toLowerCase() : '';
                
                let language = file.language || 'text';
                if (fileExt === 'js') language = 'javascript';
                else if (fileExt === 'ts') language = 'typescript';
                else if (fileExt === 'py') language = 'python';
                else if (fileExt === 'java') language = 'java';
                
                return `
                  <div style="
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.2s;
                  " class="file-row">
                    <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;">
                      <div style="
                        color: #888;
                        font-size: 11px;
                        font-weight: 600;
                        width: 24px;
                        text-align: right;
                      ">${index + 1}</div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="
                          color: #e0e0e0;
                          font-size: 13px;
                          font-family: 'Consolas', 'Monaco', monospace;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        ">${filePath}</div>
                      </div>
                    </div>
                    <div style="
                      background: rgba(79, 195, 247, 0.15);
                      color: #4fc3f7;
                      padding: 4px 10px;
                      border-radius: 4px;
                      font-size: 10px;
                      font-weight: 600;
                      text-transform: lowercase;
                      margin-left: 12px;
                      white-space: nowrap;
                    ">${language}</div>
                  </div>
                `;
              }).join('')}
              ${trackedFiles.length > 10 ? `
                <div style="
                  padding: 12px 20px;
                  text-align: center;
                  color: #888;
                  font-size: 12px;
                ">
                  ... and ${trackedFiles.length - 10} more files
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Footer -->
      <div style="
        padding: 16px 24px !important;
        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        display: flex !important;
        gap: 10px !important;
        background: linear-gradient(180deg, rgba(35, 35, 35, 0.95) 0%, rgba(28, 28, 28, 0.98) 100%) !important;
        position: sticky !important;
        bottom: 0 !important;
        backdrop-filter: blur(10px) !important;
      ">
        <button id="export-context-btn" style="
          flex: 1 !important;
          min-width: 100px !important;
          height: 38px !important;
          padding: 0 16px !important;
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.08) 100%) !important;
          color: #64b5f6 !important;
          border: 1px solid rgba(33, 150, 243, 0.3) !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-family: inherit !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          box-sizing: border-box !important;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Export</span>
        </button>
        
        <button id="ctx-restore-btn" style="
          flex: 1 !important;
          min-width: 100px !important;
          height: 38px !important;
          padding: 0 16px !important;
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.08) 100%) !important;
          color: #81c784 !important;
          border: 1px solid rgba(76, 175, 80, 0.3) !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-family: inherit !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          box-sizing: border-box !important;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload</span>
        </button>
        
        <button id="clear-context-btn" style="
          flex: 1 !important;
          min-width: 100px !important;
          height: 38px !important;
          padding: 0 16px !important;
          background: linear-gradient(135deg, rgba(244, 67, 54, 0.15) 0%, rgba(244, 67, 54, 0.08) 100%) !important;
          color: #e57373 !important;
          border: 1px solid rgba(244, 67, 54, 0.3) !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          font-family: inherit !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          box-sizing: border-box !important;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>Clear</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add hover effects
  const style = document.createElement('style');
  style.textContent = `
    .file-row:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    .modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
    }
    
    /* Footer button hover effects */
    #export-context-btn:hover {
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.25) 0%, rgba(33, 150, 243, 0.15) 100%) !important;
      border-color: rgba(33, 150, 243, 0.5) !important;
      color: #90caf9 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
    }
    
    #ctx-restore-btn:hover {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.25) 0%, rgba(76, 175, 80, 0.15) 100%) !important;
      border-color: rgba(76, 175, 80, 0.5) !important;
      color: #a5d6a7 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
    }
    
    #clear-context-btn:hover {
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.25) 0%, rgba(244, 67, 54, 0.15) 100%) !important;
      border-color: rgba(244, 67, 54, 0.5) !important;
      color: #ef9a9a !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(244, 67, 54, 0.2);
    }
  `;
  document.head.appendChild(style);
  
  // Event handlers
  const closeButtons = modal.querySelectorAll('.modal-close-btn');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.remove();
      style.remove();
    });
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      style.remove();
    }
  });
  
  // Export context button
  const exportBtn = modal.querySelector('#export-context-btn');
  exportBtn?.addEventListener('click', () => {
    try {
      const contextData = {
        project: safeGetProjectContext(),
        trackedFiles: trackedFiles,
        messagesCount: messagesCount,
        decisions: decisions,
        fileTypeDistribution: fileTypeDistribution,
        contextSizeKB: contextSizeKB,
        timestamp: new Date().toISOString(),
        enabled: safeIsContextEnabled()
      };
      
      // Show export rename modal
      try {
        showExportRenameModal(contextData, async (filename, userSavePath) => {
          try {
            const dataStr = JSON.stringify(contextData, null, 2);
            const finalFilename = filename.toLowerCase().indexOf('.json') === filename.length - 5 ? filename : filename + '.json';
            
            const w = window as any;
            let saved = false;
            
            // If user provided a save path, try to write there using Tauri
            if (userSavePath && userSavePath.trim()) {
              try {
                // Build full file path
                let fullPath = userSavePath.trim();
                // Ensure path ends with separator
                if (!fullPath.endsWith('\\') && !fullPath.endsWith('/')) {
                  fullPath += '\\';
                }
                fullPath += finalFilename;
                
                // Try to write using Tauri write_file command
                if (w.__TAURI__?.core?.invoke) {
                  await w.__TAURI__.core.invoke('write_file', {
                    path: fullPath,
                    content: dataStr
                  });
                  showNotification('✅ Exported to: ' + fullPath);
                  saved = true;
                } else if (w.__TAURI__?.invoke) {
                  await w.__TAURI__.invoke('write_file', {
                    path: fullPath,
                    content: dataStr
                  });
                  showNotification('✅ Exported to: ' + fullPath);
                  saved = true;
                }
              } catch (writeErr) {
                console.error('Failed to write to specified path:', writeErr);
                showNotification('⚠️ Could not write to path. Using browser download...');
                // Fall through to browser download
              }
            }
            
            if (saved) return;
            
            // Fallback: Browser download
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('✅ Context exported to Downloads');
          } catch (downloadErr) {
            console.error('Error downloading file:', downloadErr);
            showNotification('⚠️ Error downloading file');
          }
        });
      } catch (modalErr) {
        console.error('Error showing export modal:', modalErr);
        showNotification('⚠️ Error showing export dialog');
      }
    } catch (err) {
      console.error('Error exporting context:', err);
      showNotification('⚠️ Error exporting context');
    }
  });
  
  // Upload context button
  const uploadBtn = modal.querySelector('#ctx-restore-btn') as HTMLButtonElement;
  uploadBtn?.addEventListener('click', () => {
    // Store original button content
    const originalContent = uploadBtn.innerHTML;
    
    // Show loading state on button
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: ctx-spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Preparing...</span>
    `;
    uploadBtn.style.opacity = '0.7';
    uploadBtn.style.cursor = 'wait';
    
    // Add spin animation if not exists
    if (!document.querySelector('#ctx-spin-style')) {
      const spinStyle = document.createElement('style');
      spinStyle.id = 'ctx-spin-style';
      spinStyle.textContent = `
        @keyframes ctx-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(spinStyle);
    }
    
    // Function to restore button
    const restoreButton = () => {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = originalContent;
      uploadBtn.style.opacity = '1';
      uploadBtn.style.cursor = 'pointer';
    };
    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    // Track if file was selected
    let fileSelected = false;
    
    fileInput.addEventListener('change', (e) => {
      fileSelected = true;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        restoreButton();
        return;
      }
      
      // Update button to show processing
      uploadBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: ctx-spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Processing...</span>
      `;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const contextData = JSON.parse(content);
          
          // Restore button before showing confirm dialog
          restoreButton();
          
          // Validate the uploaded data
          if (!contextData.timestamp) {
            showNotification('⚠️ Invalid context file format');
            return;
          }
          
          // Show custom styled confirmation modal
          showUploadConfirmModal(contextData, () => {
            // On confirm - proceed with restore
            
            // Show restoring state
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: ctx-spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.3"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
              </svg>
              <span>Restoring...</span>
            `;
            uploadBtn.style.opacity = '0.7';
            
            // Apply the uploaded context
            const w = window as any;
            
            // Restore project context
            if (contextData.project && w.contextManager?.setProjectContext) {
              // Handle different project data formats
              let restoreProjectName = '';
              let restoreProjectPath = '';
              
              if (typeof contextData.project === 'string') {
                restoreProjectName = contextData.project;
              } else {
                restoreProjectName = contextData.project.projectName || contextData.project.name || '';
                restoreProjectPath = contextData.project.projectPath || contextData.project.path || '';
              }
              
              if (restoreProjectName) {
                w.contextManager.setProjectContext(restoreProjectName, restoreProjectPath);
              }
            }
            
            // Restore tracked files
            if (contextData.trackedFiles && w.contextManager?.trackFile) {
              // Clear existing first
              if (w.contextManager.clearContext) {
                w.contextManager.clearContext();
              }
              
              // Re-add tracked files
              contextData.trackedFiles.forEach((file: any) => {
                w.contextManager.trackFile(file.path, {
                  name: file.name,
                  extension: file.extension,
                  language: file.language,
                  lineCount: file.lineCount,
                  size: file.size
                });
              });
            }
            
            // Restore decisions
            if (contextData.decisions && w.contextManager?.addDecision) {
              contextData.decisions.reverse().forEach((decision: any) => {
                w.contextManager.addDecision(decision);
              });
            }
            
            // Update UI
            if (w.updateUnifiedStatusBar) {
              w.updateUnifiedStatusBar();
            }
            
            showNotification(`✅ Context restored: ${contextData.trackedFiles?.length || 0} files, ${contextData.decisions?.length || 0} decisions`);
            
            // Refresh the dashboard
            modal.remove();
            style.remove();
            setTimeout(() => {
              if (w.showContextViewModal) {
                w.showContextViewModal();
              }
            }, 300);
          });
          
        } catch (err) {
          console.error('Error parsing context file:', err);
          restoreButton();
          showNotification('⚠️ Error reading context file. Make sure it is a valid JSON export.');
        }
      };
      
      reader.onerror = () => {
        restoreButton();
        showNotification('⚠️ Error reading file');
      };
      
      reader.readAsText(file);
    });
    
    // Handle cancel (when dialog closes without selection)
    fileInput.addEventListener('cancel', () => {
      restoreButton();
    });
    
    // Note: The focus handler below will restore the button when dialog closes
    
    // Restore when window regains focus (user closed dialog without selecting)
    const handleFocus = () => {
      setTimeout(() => {
        if (!fileSelected) {
          restoreButton();
        }
        window.removeEventListener('focus', handleFocus);
      }, 500); // Small delay after focus to ensure change event fires first if file was selected
    };
    window.addEventListener('focus', handleFocus);
    
    // Delay before showing file picker - let user see the loading state
    setTimeout(() => {
      document.body.appendChild(fileInput);
      fileInput.click();
      fileInput.remove();
    }, 600); // 600ms delay to show loading state
  });
  
  // Clear context button
  const clearBtn = modal.querySelector('#clear-context-btn');
  clearBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all context data? This cannot be undone.')) {
      try {
        const w = window as any;
        if (w.contextManager && w.contextManager.clearContext) {
          w.contextManager.clearContext();
        }
        if (w.intelligentAssistant && w.intelligentAssistant.clearTrackedFiles) {
          w.intelligentAssistant.clearTrackedFiles();
        }
        
        // Clear localStorage
        localStorage.removeItem('contextSystemEnabled');
        localStorage.removeItem('projectContext');
        localStorage.removeItem('trackedFiles');
        
        showNotification('🗑️ Context cleared successfully');
        updateUnifiedStatusBar();
        modal.remove();
        style.remove();
      } catch (err) {
        console.error('Error clearing context:', err);
        showNotification('⚠️ Error clearing context');
      }
    }
  });
  
  // =========================================================================
  // METRIC CARD CLICK HANDLERS - Show detailed explanations
  // =========================================================================
  
  // Helper function to show detail popup
  function showMetricDetail(title: string, color: string, icon: string, content: string): void {
    const detailPopup = document.createElement('div');
    detailPopup.id = 'metric-detail-popup';
    detailPopup.innerHTML = `
      <style>
        #metric-detail-popup {
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
          animation: fadeIn 0.15s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .metric-detail-modal {
          background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
          border: 1px solid ${color}40;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${color}20;
          animation: slideIn 0.2s ease-out;
        }
        .metric-detail-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, ${color}20, transparent);
        }
        .metric-detail-icon {
          font-size: 32px;
        }
        .metric-detail-title {
          color: ${color};
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .metric-detail-close {
          margin-left: auto;
          background: transparent;
          border: none;
          color: #888;
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .metric-detail-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .metric-detail-body {
          padding: 24px;
          color: #e0e0e0;
          font-size: 14px;
          line-height: 1.6;
        }
        .metric-detail-body h4 {
          color: ${color};
          font-size: 13px;
          font-weight: 600;
          margin: 16px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-detail-body h4:first-child {
          margin-top: 0;
        }
        .metric-detail-body p {
          margin: 8px 0;
          color: #bbb;
        }
        .metric-detail-body ul {
          margin: 8px 0;
          padding-left: 20px;
          color: #999;
        }
        .metric-detail-body li {
          margin: 4px 0;
        }
        .metric-detail-body code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
          color: ${color};
        }
        .metric-detail-body .data-list {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          padding: 12px;
          margin: 12px 0;
          max-height: 200px;
          overflow-y: auto;
        }
        .metric-detail-body .data-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
        }
        .metric-detail-body .data-item:last-child {
          border-bottom: none;
        }
        .metric-detail-body .data-item .name {
          color: #ddd;
        }
        .metric-detail-body .data-item .value {
          color: ${color};
          font-weight: 500;
        }
        .metric-detail-body .empty-state {
          text-align: center;
          color: #666;
          padding: 20px;
          font-style: italic;
        }
      </style>
      <div class="metric-detail-modal">
        <div class="metric-detail-header">
          <span class="metric-detail-icon">${icon}</span>
          <h3 class="metric-detail-title">${title}</h3>
          <button class="metric-detail-close" title="Close">×</button>
        </div>
        <div class="metric-detail-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(detailPopup);
    
    // Close handlers
    const closeBtn = detailPopup.querySelector('.metric-detail-close');
    closeBtn?.addEventListener('click', () => detailPopup.remove());
    
    detailPopup.addEventListener('click', (e) => {
      if (e.target === detailPopup) detailPopup.remove();
    });
    
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        detailPopup.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }
  
  // Messages card click - uses 'w' already declared above
  const messagesCard = modal.querySelector('#metric-card-messages');
  messagesCard?.addEventListener('click', () => {
    let messagesList = '';
    try {
      const conv = w.conversationManager?.getCurrentConversation();
      if (conv && conv.messages && conv.messages.length > 0) {
        const recentMsgs = conv.messages.slice(-10).reverse();
        messagesList = `
          <h4>Recent Messages (Last 10)</h4>
          <div class="data-list">
            ${recentMsgs.map((m: any, i: number) => `
              <div class="data-item">
                <span class="name">${m.role === 'user' ? '👤 You' : '🤖 AI'}: ${(m.content || '').substring(0, 50)}${(m.content || '').length > 50 ? '...' : ''}</span>
                <span class="value">${new Date(m.timestamp || Date.now()).toLocaleTimeString()}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        messagesList = '<div class="empty-state">No messages in current conversation</div>';
      }
    } catch (e) {
      messagesList = '<div class="empty-state">Unable to load messages</div>';
    }
    
    showMetricDetail('Messages', '#4caf50', '💬', `
      <h4>What are Messages?</h4>
      <p>Messages represent the conversation history between you and the AI assistant. Each question you ask and each response the AI provides counts as a message.</p>
      
      <h4>Why it matters</h4>
      <ul>
        <li>Longer conversations give the AI more context about your project</li>
        <li>The AI can reference earlier parts of the conversation</li>
        <li>More messages = better understanding of your needs</li>
      </ul>
      
      <h4>How it's calculated</h4>
      <p>Counts all messages in the current conversation from <code>conversationManager</code>.</p>
      
      ${messagesList}
    `);
  });
  
  // Files card click
  const filesCard = modal.querySelector('#metric-card-files');
  filesCard?.addEventListener('click', () => {
    let filesList = '';
    try {
      const files = w.contextManager?.getTrackedFiles() || [];
      if (files.length > 0) {
        filesList = `
          <h4>Currently Tracked Files</h4>
          <div class="data-list">
            ${files.slice(0, 15).map((f: any) => `
              <div class="data-item">
                <span class="name">📄 ${f.name || f.path?.split(/[/\\]/).pop() || 'Unknown'}</span>
                <span class="value">${f.language || f.extension?.toUpperCase() || '?'}</span>
              </div>
            `).join('')}
            ${files.length > 15 ? `<div class="data-item"><span class="name">... and ${files.length - 15} more files</span></div>` : ''}
          </div>
        `;
      } else {
        filesList = '<div class="empty-state">No files being tracked yet. Open files in the editor to track them.</div>';
      }
    } catch (e) {
      filesList = '<div class="empty-state">Unable to load tracked files</div>';
    }
    
    showMetricDetail('Tracked Files', '#2196f3', '📄', `
      <h4>What are Tracked Files?</h4>
      <p>Tracked files are the source code files you've opened or edited in the IDE. The context system monitors these files to provide the AI with relevant code context.</p>
      
      <h4>Why it matters</h4>
      <ul>
        <li>The AI knows which files you're working on</li>
        <li>Enables intelligent code suggestions based on your project</li>
        <li>Helps the AI understand your codebase structure</li>
      </ul>
      
      <h4>How files get tracked</h4>
      <ul>
        <li>Opening a file in the editor</li>
        <li>Editing file contents</li>
        <li>Switching between tabs</li>
        <li>Saving files</li>
      </ul>
      
      ${filesList}
    `);
  });
  
  // Decisions card click
  const decisionsCard = modal.querySelector('#metric-card-decisions');
  decisionsCard?.addEventListener('click', () => {
    let decisionsList = '';
    try {
      const decisions = w.contextManager?.getDecisions() || [];
      if (decisions.length > 0) {
        decisionsList = `
          <h4>Recent Decisions</h4>
          <div class="data-list">
            ${decisions.slice(0, 15).map((d: any) => `
              <div class="data-item">
                <span class="name">${getDecisionIcon(d.type)} ${d.description?.substring(0, 40) || 'Unknown action'}${(d.description || '').length > 40 ? '...' : ''}</span>
                <span class="value">${formatTimeAgo(d.timestamp)}</span>
              </div>
            `).join('')}
            ${decisions.length > 15 ? `<div class="data-item"><span class="name">... and ${decisions.length - 15} more decisions</span></div>` : ''}
          </div>
        `;
      } else {
        decisionsList = '<div class="empty-state">No decisions recorded yet. Start coding to track your actions.</div>';
      }
    } catch (e) {
      decisionsList = '<div class="empty-state">Unable to load decisions</div>';
    }
    
    function getDecisionIcon(type: string): string {
      const icons: Record<string, string> = {
        'create': '➕',
        'modify': '✏️',
        'delete': '🗑️',
        'refactor': '🔄',
        'rename': '📝',
        'move': '📦',
        'ai-suggestion': '🤖',
        'user-action': '👤'
      };
      return icons[type] || '📌';
    }
    
    function formatTimeAgo(timestamp: number): string {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    }
    
    showMetricDetail('Decisions', '#ff9800', '✓', `
      <h4>What are Decisions?</h4>
      <p>Decisions are significant actions you take while coding - like creating files, making edits, applying AI suggestions, or refactoring code.</p>
      
      <h4>Why it matters</h4>
      <ul>
        <li>Tracks your coding workflow and patterns</li>
        <li>Helps the AI understand what changes you've made</li>
        <li>Provides context about your recent activities</li>
      </ul>
      
      <h4>Types of decisions tracked</h4>
      <ul>
        <li>➕ <strong>Create</strong> - New files or code added</li>
        <li>✏️ <strong>Modify</strong> - Edits and saves</li>
        <li>🗑️ <strong>Delete</strong> - Removed files or code</li>
        <li>🔄 <strong>Refactor</strong> - Code restructuring</li>
        <li>🤖 <strong>AI Suggestion</strong> - Applied AI recommendations</li>
      </ul>
      
      ${decisionsList}
    `);
  });
  
  // Context Size card click
  const sizeCard = modal.querySelector('#metric-card-size');
  sizeCard?.addEventListener('click', () => {
    let sizeBreakdown = '';
    try {
      const messages = w.conversationManager?.getCurrentConversation()?.messages || [];
      const files = w.contextManager?.getTrackedFiles() || [];
      const decisions = w.contextManager?.getDecisions() || [];
      
      const msgSize = messages.reduce((acc: number, m: any) => acc + (m.content?.length || 0), 0);
      const filesSize = files.reduce((acc: number, f: any) => acc + (f.size || 0), 0);
      const decisionsSize = JSON.stringify(decisions).length;
      
      const formatSize = (bytes: number): string => {
        if (bytes < 1000) return `${bytes} B`;
        if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} KB`;
        return `${(bytes / 1000000).toFixed(1)} MB`;
      };
      
      sizeBreakdown = `
        <h4>Size Breakdown</h4>
        <div class="data-list">
          <div class="data-item">
            <span class="name">💬 Messages content</span>
            <span class="value">${formatSize(msgSize)}</span>
          </div>
          <div class="data-item">
            <span class="name">📄 Tracked files metadata</span>
            <span class="value">${formatSize(filesSize)}</span>
          </div>
          <div class="data-item">
            <span class="name">✓ Decisions log</span>
            <span class="value">${formatSize(decisionsSize)}</span>
          </div>
          <div class="data-item" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; margin-top: 4px;">
            <span class="name"><strong>Total estimated</strong></span>
            <span class="value"><strong>${formatSize(msgSize + filesSize + decisionsSize)}</strong></span>
          </div>
        </div>
      `;
    } catch (e) {
      sizeBreakdown = '<div class="empty-state">Unable to calculate size breakdown</div>';
    }
    
    showMetricDetail('Context Size', '#9c27b0', '💾', `
      <h4>What is Context Size?</h4>
      <p>Context size represents the estimated amount of data that makes up your current AI context - including conversation history, tracked files, and decisions.</p>
      
      <h4>Why it matters</h4>
      <ul>
        <li>AI models have context limits (token limits)</li>
        <li>Larger contexts may require summarization</li>
        <li>Helps you understand how much information the AI can "see"</li>
      </ul>
      
      <h4>How it's calculated</h4>
      <p>Estimated by adding:</p>
      <ul>
        <li>Message content sizes</li>
        <li>Tracked file metadata</li>
        <li>Decisions log size</li>
      </ul>
      
      ${sizeBreakdown}
    `);
  });
  
  // Add hover effects for metric cards
  const metricCards = modal.querySelectorAll('.metric-card-clickable');
  metricCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      (card as HTMLElement).style.transform = 'translateY(-2px)';
      (card as HTMLElement).style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    });
    card.addEventListener('mouseleave', () => {
      (card as HTMLElement).style.transform = 'translateY(0)';
      (card as HTMLElement).style.boxShadow = 'none';
    });
  });
}

// ============================================================================
// GLOBAL EXPOSURE - Make modal functions accessible from anywhere
// ============================================================================
(window as any).showContextSetupModal = showContextSetupModal;
(window as any).showContextViewModal = showContextDetailsModal;
(window as any).showContextDashboard = showContextDetailsModal;

// Export functions for module use
export { showContextSetupModal, showContextDetailsModal };