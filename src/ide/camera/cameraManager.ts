// ============================================================================
// FILE: src/ide/camera/cameraManager.ts
// DESCRIPTION: Professional Camera Manager with Direct Vision API Support
// VERSION: 2.4 - Fixed UI Issues (Capture button color, removed help text, analyze always enabled)
// ============================================================================

// ============================================================================
// IMPORTS - Using IDE's Unified API System
// ============================================================================

import { 
  getCurrentApiConfigurationForced,
  createApiSettingsModal
} from '../aiAssistant/apiProviderManager';

import { sendMessageDirectly } from '../aiAssistant/assistantUI';

// ============================================================================
// IDE CONTEXT GATHERING - For context-aware camera analysis
// ============================================================================

interface IDEContext {
  currentFile: {
    path: string;
    name: string;
    language: string;
    content: string;
  } | null;
  openFiles: string[];
  projectPath: string | null;
  recentCode: string | null;
  conversationSummary: string | null;
}

/**
 * Gather current IDE context for context-aware analysis
 */
function gatherIDEContext(): IDEContext {
  const context: IDEContext = {
    currentFile: null,
    openFiles: [],
    projectPath: null,
    recentCode: null,
    conversationSummary: null
  };
  
  try {
    // Get TabManager
    const tabManager = (window as any).tabManager || 
                       (window as any).ideTabManager ||
                       (window as any).__tabManager__;
    
    // Get active tab info
    if (tabManager?.getActiveTab) {
      const activeTab = tabManager.getActiveTab();
      if (activeTab) {
        context.currentFile = {
          path: activeTab.filePath || activeTab.path || '',
          name: activeTab.title || activeTab.name || 'Untitled',
          language: activeTab.language || detectLanguage(activeTab.filePath || ''),
          content: ''
        };
      }
    }
    
    // Get open files list
    if (tabManager?.getTabs) {
      const tabs = tabManager.getTabs();
      context.openFiles = tabs.map((t: any) => t.filePath || t.title || 'Unknown').slice(0, 10);
    }
    
    // Get Monaco editor content (first 200 lines)
    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      const editors = monaco.editor.getEditors();
      if (editors.length > 0) {
        const model = editors[0].getModel();
        if (model) {
          const fullContent = model.getValue();
          // Get first 200 lines or 5000 chars max
          const lines = fullContent.split('\n').slice(0, 200);
          context.recentCode = lines.join('\n').substring(0, 5000);
          
          if (context.currentFile) {
            context.currentFile.content = context.recentCode;
          }
        }
      }
    }
    
    // Get project path from file explorer or state
    const projectState = (window as any).projectState || 
                         (window as any).ideState ||
                         (window as any).__projectPath__;
    if (projectState?.rootPath) {
      context.projectPath = projectState.rootPath;
    } else if (context.currentFile?.path) {
      // Extract project path from file path
      const parts = context.currentFile.path.split(/[/\\]/);
      if (parts.length > 2) {
        context.projectPath = parts.slice(0, -1).join('/');
      }
    }
    
    // Get recent conversation context (last few messages)
    const chatContainer = document.querySelector('.chat-messages, .ai-chat-container, .conversation-container');
    if (chatContainer) {
      const messages = chatContainer.querySelectorAll('.message, .chat-message, .ai-message, .user-message');
      const recentMessages: string[] = [];
      const lastMessages = Array.from(messages).slice(-5);
      
      lastMessages.forEach((msg: any) => {
        const text = msg.textContent?.trim().substring(0, 200);
        if (text) {
          recentMessages.push(text);
        }
      });
      
      if (recentMessages.length > 0) {
        context.conversationSummary = recentMessages.join(' | ').substring(0, 500);
      }
    }
    
  } catch (error) {
    console.warn('Failed to gather IDE context:', error);
  }
  
  return context;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'TypeScript', 'tsx': 'TypeScript React',
    'js': 'JavaScript', 'jsx': 'JavaScript React',
    'py': 'Python', 'rs': 'Rust', 'go': 'Go',
    'java': 'Java', 'kt': 'Kotlin', 'swift': 'Swift',
    'c': 'C', 'cpp': 'C++', 'h': 'C/C++ Header',
    'cs': 'C#', 'rb': 'Ruby', 'php': 'PHP',
    'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS',
    'json': 'JSON', 'yaml': 'YAML', 'xml': 'XML',
    'md': 'Markdown', 'sql': 'SQL', 'sh': 'Shell',
    'vue': 'Vue', 'svelte': 'Svelte'
  };
  return langMap[ext] || ext.toUpperCase() || 'Unknown';
}

/**
 * Build context-aware prompt for vision analysis
 */
function buildContextAwarePrompt(basePrompt: string): string {
  const context = gatherIDEContext();
  
  let contextSection = '';
  
  if (context.currentFile) {
    contextSection += `\n\n**Current IDE Context:**
- Active File: ${context.currentFile.name} (${context.currentFile.language})
- File Path: ${context.currentFile.path}`;
  }
  
  if (context.openFiles.length > 0) {
    contextSection += `\n- Open Files: ${context.openFiles.slice(0, 5).join(', ')}`;
  }
  
  if (context.projectPath) {
    contextSection += `\n- Project: ${context.projectPath.split(/[/\\]/).pop()}`;
  }
  
  if (context.recentCode && context.recentCode.length > 100) {
    // Include snippet of current code for context
    const codeSnippet = context.recentCode.substring(0, 1000);
    contextSection += `\n\n**Current Code (for reference):**
\`\`\`${context.currentFile?.language?.toLowerCase() || ''}
${codeSnippet}${context.recentCode.length > 1000 ? '\n... (truncated)' : ''}
\`\`\``;
  }
  
  if (context.conversationSummary) {
    contextSection += `\n\n**Recent Conversation Context:**
${context.conversationSummary}`;
  }
  
  // Enhanced prompt with context
  return `${basePrompt}

${contextSection}

**Important Instructions:**
- Relate your analysis to the current IDE context above
- If the image shows code related to the current file, explain the connection
- Suggest specific improvements or integrations with the existing codebase
- Provide actionable next steps that can be implemented in this project
- If you see errors, explain how to fix them in context of the current code`;
}

/**
 * Build context-aware message for AI chat
 */
function buildContextAwareMessage(title: string, analysisContent: string, imageData?: string): string {
  const context = gatherIDEContext();
  
  let message = '';
  
  // Add camera analysis header
  if (title.includes('Code')) {
    message = `📸 **Camera Code Analysis**\n\n`;
  } else if (title.includes('Error') || title.includes('Debug')) {
    message = `🛠 **Camera Error Analysis**\n\n`;
  } else if (title.includes('UI')) {
    message = `🎨 **Camera UI Analysis**\n\n`;
  } else if (title.includes('OCR')) {
    message = `📝 **Camera OCR Extraction**\n\n`;
  } else {
    message = `📸 **Camera Development Analysis**\n\n`;
  }
  
  // Add the analysis content
  message += `${analysisContent}\n\n`;
  
  // Add IDE context
  message += `---\n\n**📂 Current IDE Context:**\n`;
  
  if (context.currentFile) {
    message += `- **Active File:** \`${context.currentFile.name}\` (${context.currentFile.language})\n`;
    message += `- **Path:** \`${context.currentFile.path}\`\n`;
  }
  
  if (context.openFiles.length > 1) {
    message += `- **Other Open Files:** ${context.openFiles.slice(1, 5).map(f => `\`${f.split(/[/\\]/).pop()}\``).join(', ')}\n`;
  }
  
  if (context.projectPath) {
    const projectName = context.projectPath.split(/[/\\]/).pop();
    message += `- **Project:** ${projectName}\n`;
  }
  
  // Add specific prompts based on type
  message += `\n**🤖 Please help me:**\n`;
  
  if (title.includes('Code')) {
    message += `1. How does this relate to my current code in \`${context.currentFile?.name || 'the editor'}\`?\n`;
    message += `2. Can you show me how to integrate or improve this?\n`;
    message += `3. Are there any conflicts or duplications with my existing code?\n`;
  } else if (title.includes('Error') || title.includes('Debug')) {
    message += `1. What's causing this error in my project?\n`;
    message += `2. Show me the exact fix for my codebase\n`;
    message += `3. How can I prevent this error in the future?\n`;
  } else if (title.includes('UI')) {
    message += `1. Generate the React/HTML code for this UI\n`;
    message += `2. How should I integrate this with my current components?\n`;
    message += `3. What styling approach matches my project?\n`;
  } else if (title.includes('OCR')) {
    message += `1. How can I use this extracted text in my project?\n`;
    message += `2. Is this configuration or code I should add?\n`;
    message += `3. What's the proper format for my codebase?\n`;
  } else {
    message += `1. How does this relate to what I'm working on?\n`;
    message += `2. What should I do next with this information?\n`;
    message += `3. Can you help me implement any changes needed?\n`;
  }
  
  // Add current code snippet for reference if available
  if (context.recentCode && context.recentCode.length > 100) {
    const snippet = context.recentCode.substring(0, 800);
    message += `\n**📄 Current Code (for reference):**\n\`\`\`${context.currentFile?.language?.toLowerCase() || ''}\n${snippet}\n\`\`\``;
  }
  
  return message;
}
import { showProcessingOverlay, hideProcessingOverlay } from './cameraProcessingAnimation';
// Import vision module
import {
  isVisionCapable,
  getApiProvider,
  getApiKey,
  hasApiKey,
  analyzeImageSimple,
  extractTextFromImage,
  analyzeUIComponents,
  analyzeImageForDevelopment,
  analyzeImageWithRelevanceCheck,  // ✅ Added for relevance checking
  detectDevelopmentContent,
  detectTechnicalContent,
  analyzeByContentType,
  checkDevelopmentRelevance,
  getContentTypeEmoji,
  formatContentType,
  detectProgrammingLanguage
} from './cameraManager_vision';

// Import queue system
import {
  addToQueue,
  clearQueue,
  getQueueLength,
  showContextDialog
} from './cameraQueueSystem';

// ============================================================================
// SAFE IMPORT UTILITY
// ============================================================================

function safeImport(modulePath: string): Promise<any> {
  return import(modulePath).catch(error => {
    console.warn(`Failed to import ${modulePath}:`, error);
    return {};
  });
}

// ============================================================================
// NOTIFICATION UTILITY
// ============================================================================

function safeShowNotification(type: string, title: string, message: string) {
  try {
    if (typeof (window as any).showNotification === 'function') {
      (window as any).showNotification(type, title, message);
      return;
    }
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    if (type === 'error') {
      alert(`${title}: ${message}`);
    }
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

// ============================================================================
// STATE VARIABLES
// ============================================================================

let currentFacingMode: 'user' | 'environment' = 'user';
let cameraPanel: HTMLElement | null = null;
let cameraEnabled = false;
let autoModeEnabled = true; // Always ON - auto mode permanently enabled
let currentMode: 'camera' | 'screen' = 'camera';
let currentScreenSource: 'fullscreen' | 'window' = 'fullscreen';
let currentStream: MediaStream | null = null;
let isDragging = false;
let panelPosition = { x: 0, y: 0 };
let panelSize = { width: 650, height: 500 };
let lastAnalysisResult: { type: string, content: string } | null = null;
let isMinimized = false;
let isResizing = false;
let resizeDirection: string = '';
// ✅ FIX: Prevent immediate close after opening
let justOpenedTimestamp: number = 0;
const TOGGLE_COOLDOWN_MS = 1500; // 1500ms cooldown (increased from 500ms for stability)
// ✅ NEW: Lock mechanism to prevent auto-close from style scripts
let cameraLocked = false;

// ✅ RESPONSIVE: Compact mode for small panel sizes
let isCompactMode = false;
const COMPACT_WIDTH_THRESHOLD = 250;  // Below this width, switch to compact mode
const COMPACT_HEIGHT_THRESHOLD = 200; // Below this height, switch to compact mode
let resizeRAF: number | null = null;  // For smooth resize with requestAnimationFrame

// ✅ REGION SELECTION - For crop and analyze
let isSelectingRegion = false;
let selectionStart: { x: number, y: number } | null = null;
let selectionEnd: { x: number, y: number } | null = null;
let hasSelection = false;

// ✅ CAPTURE BADGE - Maximum queue size
const MAX_QUEUE_SIZE = 3;

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

function getApiModel(): string {
  try {
    const config = getCurrentApiConfigurationForced();
    return config.model || 'gpt-4o-mini';
  } catch (error) {
    return 'gpt-4o-mini';
  }
}

function promptForApiKey(): void {
  createApiSettingsModal();
  safeShowNotification('info', 'API Settings', 'Configure your AI provider to use camera features');
}

// ============================================================================
// REAL-TIME API MONITORING & VISION CAPABILITY
// ============================================================================

let apiMonitorInterval: number | null = null;
let lastKnownProvider: string = '';

/**
 * Start monitoring API changes and update UI accordingly
 */
function startApiMonitoring(): void {
  // Initial update
  updateProviderBadgeAndButtons();
  
  // Clear existing interval if any
  if (apiMonitorInterval) {
    clearInterval(apiMonitorInterval);
  }
  
  // Check every 2 seconds for API changes
  apiMonitorInterval = window.setInterval(() => {
    const currentProvider = getApiProvider();
    if (currentProvider !== lastKnownProvider) {
      console.log(`📷 API changed: ${lastKnownProvider} → ${currentProvider}`);
      updateProviderBadgeAndButtons();
    }
  }, 2000);
}

/**
 * Stop API monitoring (call when panel closes)
 */
function stopApiMonitoring(): void {
  if (apiMonitorInterval) {
    clearInterval(apiMonitorInterval);
    apiMonitorInterval = null;
  }
}

/**
 * Update provider badge and button states based on current API
 */
function updateProviderBadgeAndButtons(): void {
  const provider = getApiProvider();
  const visionSupported = isVisionCapable();
  const apiKeyConfigured = hasApiKey();
  lastKnownProvider = provider;
  
  // Determine state: 
  // 1. Vision NOT supported → Red
  // 2. Vision supported but no API key → Yellow
  // 3. Vision supported AND API key configured → Blue
  const isFullyReady = visionSupported && apiKeyConfigured;
  const needsApiKey = visionSupported && !apiKeyConfigured;
  
  // Update provider badge with 3 states
  const badge = document.getElementById('camera-provider-badge');
  if (badge) {
    badge.textContent = provider.toUpperCase();
    
    if (!visionSupported) {
      // Red - Vision not supported
      badge.style.background = 'rgba(248, 81, 73, 0.1)';
      badge.style.borderColor = 'rgba(248, 81, 73, 0.25)';
      badge.style.color = '#f85149';
      badge.title = `${provider} - Vision NOT supported ✗`;
    } else if (needsApiKey) {
      // Yellow - Vision supported but no API key
      badge.style.background = 'rgba(255, 193, 7, 0.1)';
      badge.style.borderColor = 'rgba(255, 193, 7, 0.25)';
      badge.style.color = '#ffc107';
      badge.title = `${provider} - API key not configured ⚠`;
    } else {
      // Blue - Fully ready
      badge.style.background = 'rgba(88, 166, 255, 0.1)';
      badge.style.borderColor = 'rgba(88, 166, 255, 0.25)';
      badge.style.color = '#58a6ff';
      badge.title = `${provider} - Vision supported ✓`;
    }
  }
  
  // Update AI action buttons - DON'T disable, just style them
  // We want clicks to still work so we can show the appropriate dialog
  const analyzeBtn = document.querySelector('.side-button-ai[data-action="analyze"]') as HTMLButtonElement;
  const ocrBtn = document.querySelector('.side-button-ai[data-action="ocr"]') as HTMLButtonElement;
  
  [analyzeBtn, ocrBtn].forEach(btn => {
    if (btn) {
      // ✅ NEVER set disabled=true - we want clicks to show the dialog
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      
      if (isFullyReady) {
        // Fully ready - full opacity
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.title = btn.dataset.action === 'analyze' ? 'Analyze image' : 'Extract text (OCR)';
        btn.classList.remove('vision-disabled', 'api-key-missing');
      } else if (needsApiKey) {
        // Vision supported but no API key - show as needing attention
        btn.style.opacity = '0.6';
        btn.style.cursor = 'pointer';
        btn.title = `API key not configured. Click to learn more.`;
        btn.classList.remove('vision-disabled');
        btn.classList.add('api-key-missing');
      } else {
        // Vision not supported
        btn.style.opacity = '0.5';
        btn.style.cursor = 'pointer';
        btn.title = `${provider} does not support vision. Click to learn more.`;
        btn.classList.add('vision-disabled');
        btn.classList.remove('api-key-missing');
      }
    }
  });
  
  console.log(`📷 API: ${provider}, Vision: ${visionSupported ? '✓' : '✗'}, Key: ${apiKeyConfigured ? '✓' : '✗'}`);
}

/**
 * Show dialog when API key is not configured
 */
function showApiKeyNotConfiguredDialog(): void {
  const provider = getApiProvider();
  
  // Remove existing dialog if any
  const existingDialog = document.getElementById('api-key-not-configured-dialog');
  if (existingDialog) existingDialog.remove();
  
  const dialog = document.createElement('div');
  dialog.id = 'api-key-not-configured-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: apiKeyDialogFadeIn 0.2s ease;
  `;
  
  dialog.innerHTML = `
    <style>
      @keyframes apiKeyDialogFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes apiKeyDialogSlideIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .api-key-dialog-card {
        animation: apiKeyDialogSlideIn 0.25s ease;
      }
    </style>
    <div class="api-key-dialog-card" style="
      background: linear-gradient(145deg, #1c2128 0%, #161b22 100%);
      border: 1px solid #30363d;
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 380px;
      width: 90%;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
    ">
      <!-- Icon -->
      <div style="
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.05) 100%);
        border: 1px solid rgba(255, 193, 7, 0.2);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffc107" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      
      <!-- Title -->
      <h3 style="
        color: #f0f6fc;
        margin: 0 0 8px;
        font-size: 17px;
        font-weight: 600;
        text-align: center;
        letter-spacing: -0.3px;
      ">
        API Key Required
      </h3>
      
      <!-- Description -->
      <p style="
        color: #8b949e;
        margin: 0 0 20px;
        font-size: 13px;
        line-height: 1.5;
        text-align: center;
      ">
        <span style="color: #58a6ff; font-weight: 500;">${provider}</span> supports vision, but the API key is not configured
      </p>
      
      <!-- Info box -->
      <div style="
        background: rgba(255, 193, 7, 0.08);
        border: 1px solid rgba(255, 193, 7, 0.2);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 24px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffc107" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div style="
          color: #c9d1d9;
          font-size: 12px;
          line-height: 1.5;
        ">
          Please configure your API key in <strong style="color: #ffc107;">AI Provider Settings</strong> to enable camera features.
        </div>
      </div>
      
      <!-- Close button -->
      <button id="api-key-dialog-close" style="
        width: 100%;
        padding: 11px 20px;
        background: linear-gradient(135deg, #30363d 0%, #21262d 100%);
        border: 1px solid #484f58;
        border-radius: 8px;
        color: #e6edf3;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">
        <span>Got it</span>
      </button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Add hover effect to close button
  const closeBtn = dialog.querySelector('#api-key-dialog-close') as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'linear-gradient(135deg, #3d444d 0%, #2d333b 100%)';
      closeBtn.style.borderColor = '#565e67';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'linear-gradient(135deg, #30363d 0%, #21262d 100%)';
      closeBtn.style.borderColor = '#484f58';
    });
    closeBtn.addEventListener('click', () => {
      dialog.style.animation = 'apiKeyDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
    });
  }
  
  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.style.animation = 'apiKeyDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
    }
  });
  
  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dialog.style.animation = 'apiKeyDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Show dialog when vision is not supported
 */
function showVisionNotSupportedDialog(): void {
  const provider = getApiProvider();
  
  // Remove existing dialog if any
  const existingDialog = document.getElementById('vision-not-supported-dialog');
  if (existingDialog) existingDialog.remove();
  
  const dialog = document.createElement('div');
  dialog.id = 'vision-not-supported-dialog';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    animation: visionDialogFadeIn 0.2s ease;
  `;
  
  dialog.innerHTML = `
    <style>
      @keyframes visionDialogFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes visionDialogSlideIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .vision-dialog-card {
        animation: visionDialogSlideIn 0.25s ease;
      }
      .vision-provider-chip {
        transition: all 0.2s ease;
      }
      .vision-provider-chip:hover {
        background: rgba(63, 185, 80, 0.2) !important;
        transform: translateY(-1px);
      }
    </style>
    <div class="vision-dialog-card" style="
      background: linear-gradient(145deg, #1c2128 0%, #161b22 100%);
      border: 1px solid #30363d;
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 380px;
      width: 90%;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
    ">
      <!-- Icon -->
      <div style="
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, rgba(248, 81, 73, 0.15) 0%, rgba(248, 81, 73, 0.05) 100%);
        border: 1px solid rgba(248, 81, 73, 0.2);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="1.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
          <line x1="2" y1="2" x2="22" y2="22" stroke-width="2"></line>
        </svg>
      </div>
      
      <!-- Title -->
      <h3 style="
        color: #f0f6fc;
        margin: 0 0 8px;
        font-size: 17px;
        font-weight: 600;
        text-align: center;
        letter-spacing: -0.3px;
      ">
        Vision Not Supported
      </h3>
      
      <!-- Description -->
      <p style="
        color: #8b949e;
        margin: 0 0 20px;
        font-size: 13px;
        line-height: 1.5;
        text-align: center;
      ">
        <span style="color: #f85149; font-weight: 500;">${provider}</span> does not support image analysis
      </p>
      
      <!-- Supported providers -->
      <div style="
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(48, 54, 61, 0.8);
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 24px;
      ">
        <div style="
          color: #6e7681;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
          font-weight: 500;
        ">
          Supported Providers
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <span class="vision-provider-chip" style="
            padding: 6px 12px;
            background: rgba(63, 185, 80, 0.08);
            border: 1px solid rgba(63, 185, 80, 0.25);
            border-radius: 6px;
            font-size: 12px;
            color: #3fb950;
            font-weight: 500;
            cursor: default;
          ">OpenAI</span>
          <span class="vision-provider-chip" style="
            padding: 6px 12px;
            background: rgba(63, 185, 80, 0.08);
            border: 1px solid rgba(63, 185, 80, 0.25);
            border-radius: 6px;
            font-size: 12px;
            color: #3fb950;
            font-weight: 500;
            cursor: default;
          ">Claude</span>
          <span class="vision-provider-chip" style="
            padding: 6px 12px;
            background: rgba(63, 185, 80, 0.08);
            border: 1px solid rgba(63, 185, 80, 0.25);
            border-radius: 6px;
            font-size: 12px;
            color: #3fb950;
            font-weight: 500;
            cursor: default;
          ">Gemini</span>
        </div>
      </div>
      
      <!-- Close button -->
      <button id="vision-dialog-close" style="
        width: 100%;
        padding: 11px 20px;
        background: linear-gradient(135deg, #30363d 0%, #21262d 100%);
        border: 1px solid #484f58;
        border-radius: 8px;
        color: #e6edf3;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">
        <span>Got it</span>
      </button>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Add hover effect to close button
  const closeBtn = dialog.querySelector('#vision-dialog-close') as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'linear-gradient(135deg, #3d444d 0%, #2d333b 100%)';
      closeBtn.style.borderColor = '#565e67';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'linear-gradient(135deg, #30363d 0%, #21262d 100%)';
      closeBtn.style.borderColor = '#484f58';
    });
    closeBtn.addEventListener('click', () => {
      dialog.style.animation = 'visionDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
    });
  }
  
  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.style.animation = 'visionDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
    }
  });
  
  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dialog.style.animation = 'visionDialogFadeIn 0.15s ease reverse';
      setTimeout(() => dialog.remove(), 140);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

function getAutoMode(): boolean {
  try {
    const stored = localStorage.getItem('camera_auto_mode');
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function setAutoMode(enabled: boolean): void {
  try {
    localStorage.setItem('camera_auto_mode', enabled.toString());
    autoModeEnabled = enabled;
  } catch {
    autoModeEnabled = enabled;
  }
}

function savePanelPosition(x: number, y: number): void {
  try {
    localStorage.setItem('camera_panel_position', JSON.stringify({ x, y }));
  } catch (error) {
    console.warn('Failed to save panel position:', error);
  }
}

function loadPanelPosition(): { x: number, y: number } {
  try {
    const stored = localStorage.getItem('camera_panel_position');
    if (stored) {
      const position = JSON.parse(stored);
      return { x: position.x || 0, y: position.y || 0 };
    }
  } catch (error) {
    console.warn('Failed to load panel position:', error);
  }
  return { x: 0, y: 0 };
}

function savePanelSize(width: number, height: number): void {
  try {
    localStorage.setItem('camera_panel_size', JSON.stringify({ width, height }));
  } catch (error) {
    console.warn('Failed to save panel size:', error);
  }
}

function loadPanelSize(): { width: number, height: number } {
  try {
    const stored = localStorage.getItem('camera_panel_size');
    if (stored) {
      const size = JSON.parse(stored);
      return { 
        width: Math.max(120, size.width || 650),  // ✅ Allow compact size (was 400)
        height: Math.max(100, size.height || 500) // ✅ Allow compact size (was 300)
      };
    }
  } catch (error) {
    console.warn('Failed to load panel size:', error);
  }
  return { width: 650, height: 500 };
}

// ============================================================================
// STYLE INJECTION
// ============================================================================

function injectCameraStyles(): void {
  if (!document.getElementById('camera-panel-styles')) {
    const style = document.createElement('style');
    style.id = 'camera-panel-styles';
    style.textContent = `
      .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s ease-in-out infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* ✅ CAPTURE BADGE: Animation for badge updates */
      @keyframes badgePulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      
      /* ✅ MINIMIZED LOADING: Animated border pulse */
      @keyframes borderPulse {
        0%, 100% { 
          border-color: #1f6feb;
          box-shadow: 0 0 12px rgba(31, 111, 235, 0.4);
        }
        50% { 
          border-color: #58a6ff;
          box-shadow: 0 0 20px rgba(88, 166, 255, 0.6);
        }
      }
      
      /* ✅ COMPACT MODE: Responsive styles for small panel */
      .camera-panel.compact-mode {
        min-width: 120px !important;
        min-height: 100px !important;
      }
      
      .camera-panel.compact-mode .video-section {
        display: none !important;
      }
      
      .camera-panel.compact-mode .controls-panel {
        width: 100% !important;
        border-left: none !important;
        min-width: unset !important;
        flex: 1 !important;
      }
      
      .camera-panel.compact-mode .dev-camera-header {
        padding: 4px 8px !important;
        min-height: 32px !important;
      }
      
      .camera-panel.compact-mode .side-button,
      .camera-panel.compact-mode .side-button-ai {
        padding: 6px 10px !important;
        font-size: 11px !important;
      }
      
      .camera-panel.compact-mode .mode-toggle-container {
        padding: 4px !important;
      }
      
      .camera-panel.compact-mode .section-label {
        font-size: 8px !important;
        margin-bottom: 4px !important;
      }
      
      /* ✅ SMOOTH RESIZE: Disable transitions during resize */
      .camera-panel.resizing,
      .camera-panel.resizing * {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================================================
// DRAGGING FUNCTIONALITY
// ============================================================================

function initializeDragging(panel: HTMLElement, dragHandle: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  dragHandle.addEventListener('mousedown', startDrag);
  
  function startDrag(e: MouseEvent): void {
    if (isResizing) return;
    
    isDragging = true;
    dragHandle.style.cursor = 'grabbing';
    
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = panel.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
  }
  
  function drag(e: MouseEvent): void {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    let newX = initialX + deltaX;
    let newY = initialY + deltaY;
    
    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    panel.style.left = `${newX}px`;
    panel.style.top = `${newY}px`;
    
    panelPosition = { x: newX, y: newY };
  }
  
  function stopDrag(): void {
    if (!isDragging) return;
    
    isDragging = false;
    dragHandle.style.cursor = 'grab';
    
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    
    savePanelPosition(panelPosition.x, panelPosition.y);
  }
}

// ============================================================================
// RESIZE FUNCTIONALITY
// ============================================================================

function initializeResizing(panel: HTMLElement): void {
  const minWidth = 120;   // ✅ Smaller minimum for compact mode
  const minHeight = 100;  // ✅ Smaller minimum for compact mode
  const maxWidth = 1200;
  const maxHeight = 900;
  
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;
  let startTop = 0;
  
  const handles = [
    { position: 'right', cursor: 'ew-resize' },
    { position: 'bottom', cursor: 'ns-resize' },
    { position: 'bottom-right', cursor: 'nwse-resize' },
    { position: 'left', cursor: 'ew-resize' },
    { position: 'top', cursor: 'ns-resize' },
    { position: 'top-right', cursor: 'nesw-resize' },
    { position: 'top-left', cursor: 'nwse-resize' },
    { position: 'bottom-left', cursor: 'nesw-resize' }
  ];
  
  handles.forEach(({ position, cursor }) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${position}`;
    handle.style.cssText = getHandleStyle(position, cursor);
    handle.dataset.direction = position;
    
    handle.addEventListener('mousedown', startResize);
    panel.appendChild(handle);
  });
  
  function startResize(e: MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
    
    const handle = e.target as HTMLElement;
    resizeDirection = handle.dataset.direction || '';
    isResizing = true;
    
    startX = e.clientX;
    startY = e.clientY;
    startWidth = panel.offsetWidth;
    startHeight = panel.offsetHeight;
    startLeft = panel.offsetLeft;
    startTop = panel.offsetTop;
    
    // ✅ FIX: Disable ALL transitions during resize for smooth performance
    panel.style.transition = 'none';
    panel.classList.add('resizing');
    panel.querySelectorAll('*').forEach((el) => {
      (el as HTMLElement).style.transition = 'none';
    });
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    document.body.style.cursor = handle.style.cursor;
    document.body.style.userSelect = 'none';
    
    // Prevent video from capturing mouse events during resize
    const video = panel.querySelector('video') as HTMLVideoElement;
    if (video) video.style.pointerEvents = 'none';
  }
  
  function resize(e: MouseEvent): void {
    if (!isResizing) return;
    
    // ✅ FIX: Use requestAnimationFrame for smooth resize
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    
    resizeRAF = requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      if (resizeDirection.includes('right')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      }
      if (resizeDirection.includes('left')) {
        const widthDiff = startWidth - deltaX;
        if (widthDiff >= minWidth && widthDiff <= maxWidth) {
          newWidth = widthDiff;
          newLeft = startLeft + deltaX;
        }
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
      }
      if (resizeDirection.includes('top')) {
        const heightDiff = startHeight - deltaY;
        if (heightDiff >= minHeight && heightDiff <= maxHeight) {
          newHeight = heightDiff;
          newTop = startTop + deltaY;
        }
      }
      
      panel.style.width = `${newWidth}px`;
      panel.style.height = `${newHeight}px`;
      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      
      panelSize = { width: newWidth, height: newHeight };
      panelPosition = { x: newLeft, y: newTop };
      
      // ✅ RESPONSIVE: Update compact mode based on size
      updateCompactMode(panel, newWidth, newHeight);
    });
  }
  
  function stopResize(): void {
    if (!isResizing) return;
    
    isResizing = false;
    resizeDirection = '';
    
    // ✅ FIX: Cancel pending animation frame
    if (resizeRAF) {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = null;
    }
    
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // ✅ FIX: Re-enable transitions after resize
    panel.style.transition = '';
    panel.classList.remove('resizing');
    panel.querySelectorAll('*').forEach((el) => {
      (el as HTMLElement).style.transition = '';
    });
    
    // Re-enable video pointer events
    const video = panel.querySelector('video') as HTMLVideoElement;
    if (video) video.style.pointerEvents = '';
    
    savePanelSize(panelSize.width, panelSize.height);
    savePanelPosition(panelPosition.x, panelPosition.y);
    
    // Final compact mode update
    updateCompactMode(panel, panelSize.width, panelSize.height);
  }
}

function getHandleStyle(position: string, cursor: string): string {
  const baseStyle = `position: absolute; background: transparent; z-index: 1000;`;
  const styles: { [key: string]: string } = {
    'right': `${baseStyle} top: 0; right: -4px; width: 8px; height: 100%; cursor: ${cursor};`,
    'left': `${baseStyle} top: 0; left: -4px; width: 8px; height: 100%; cursor: ${cursor};`,
    'bottom': `${baseStyle} bottom: -4px; left: 0; width: 100%; height: 8px; cursor: ${cursor};`,
    'top': `${baseStyle} top: -4px; left: 0; width: 100%; height: 8px; cursor: ${cursor};`,
    'bottom-right': `${baseStyle} bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: ${cursor};`,
    'bottom-left': `${baseStyle} bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: ${cursor};`,
    'top-right': `${baseStyle} top: -4px; right: -4px; width: 12px; height: 12px; cursor: ${cursor};`,
    'top-left': `${baseStyle} top: -4px; left: -4px; width: 12px; height: 12px; cursor: ${cursor};`
  };
  return styles[position] || baseStyle;
}

// ============================================================================
// RESPONSIVE COMPACT MODE
// ============================================================================

/**
 * Update panel layout based on size - switch to compact mode when small
 */
function updateCompactMode(panel: HTMLElement, width: number, height: number): void {
  const shouldBeCompact = width < COMPACT_WIDTH_THRESHOLD || height < COMPACT_HEIGHT_THRESHOLD;
  const isVerySmall = width < 180 || height < 150;
  
  // ✅ DEBUG: Log every call to verify function is being triggered
  console.log(`📷 updateCompactMode: ${width}x${height}, shouldBeCompact=${shouldBeCompact}, currentlyCompact=${isCompactMode}`);
  
  // Get panel elements using class names
  const header = panel.querySelector('.dev-camera-header') as HTMLElement;
  const videoSection = panel.querySelector('.video-section') as HTMLElement;
  const controlsPanel = panel.querySelector('.controls-panel') as HTMLElement;
  const headerLeft = panel.querySelector('.header-left') as HTMLElement;
  
  // ✅ DEBUG: Verify elements are found
  if (!videoSection || !controlsPanel) {
    console.warn('📷 WARNING: Elements not found!', { videoSection: !!videoSection, controlsPanel: !!controlsPanel });
  }
  
  if (shouldBeCompact && !isCompactMode) {
    // Switch TO compact mode
    isCompactMode = true;
    panel.classList.add('compact-mode');
    console.log('📷 Switching to COMPACT mode');
    
    // ✅ FIX: Use setProperty with 'important' to override inline styles
    if (videoSection) {
      videoSection.style.setProperty('display', 'none', 'important');
      videoSection.style.setProperty('width', '0', 'important');
      videoSection.style.setProperty('min-width', '0', 'important');
      videoSection.style.setProperty('flex', '0', 'important');
      console.log('📷 Video section HIDDEN for compact mode');
    } else {
      console.error('📷 ERROR: videoSection not found for compact mode!');
    }
    
    // Hide header title elements, keep only close button
    if (headerLeft) {
      headerLeft.style.setProperty('display', 'none', 'important');
    }
    
    // Make controls take full width
    if (controlsPanel) {
      controlsPanel.style.setProperty('width', '100%', 'important');
      controlsPanel.style.setProperty('flex', '1', 'important');
      controlsPanel.style.setProperty('border-left', 'none', 'important');
      controlsPanel.style.setProperty('min-width', 'unset', 'important');
    }
    
    // Compact header
    if (header) {
      header.style.setProperty('padding', '4px 8px', 'important');
      header.style.setProperty('min-height', '28px', 'important');
    }
    
    console.log('📷 COMPACT mode applied');
    
  } else if (!shouldBeCompact && isCompactMode) {
    // Switch BACK to normal mode
    isCompactMode = false;
    panel.classList.remove('compact-mode');
    console.log('📷 Switching to NORMAL mode');
    
    // ✅ FIX: Remove the important overrides to restore original styles
    if (videoSection) {
      videoSection.style.removeProperty('display');
      videoSection.style.removeProperty('width');
      videoSection.style.removeProperty('min-width');
      videoSection.style.removeProperty('flex');
      // Restore original inline styles (without min-width constraint)
      videoSection.style.display = 'flex';
      videoSection.style.flex = '1';
      // ✅ REMOVED: videoSection.style.minWidth = '300px'; - This blocked compact mode
    }
    
    // Show header elements
    if (headerLeft) {
      headerLeft.style.removeProperty('display');
      headerLeft.style.display = 'flex';
    }
    
    // Restore controls width
    if (controlsPanel) {
      controlsPanel.style.removeProperty('width');
      controlsPanel.style.removeProperty('flex');
      controlsPanel.style.removeProperty('border-left');
      controlsPanel.style.removeProperty('min-width');
      const ratio = width / 650;
      const newControlsWidth = Math.max(140, Math.min(220, 185 * ratio)); // ✅ Reduced from 165 for flexibility
      controlsPanel.style.width = `${newControlsWidth}px`;
      controlsPanel.style.borderLeft = '1px solid #21262d';
      // ✅ REMOVED: controlsPanel.style.minWidth = '165px'; - This blocked compact mode
    }
    
    // Restore header
    if (header) {
      header.style.removeProperty('padding');
      header.style.removeProperty('min-height');
      header.style.padding = '8px 12px';
      header.style.minHeight = '40px';
    }
    
    console.log('📷 NORMAL mode applied');
  }
  
  // Ultra compact: Hide button labels when very small
  if (isVerySmall) {
    panel.querySelectorAll('.side-button span, .side-button-ai span').forEach((span) => {
      (span as HTMLElement).style.setProperty('display', 'none', 'important');
    });
  } else {
    panel.querySelectorAll('.side-button span, .side-button-ai span').forEach((span) => {
      (span as HTMLElement).style.removeProperty('display');
    });
  }
}

// ============================================================================
// STREAM MANAGEMENT
// ============================================================================

function stopCurrentStream(): void {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}

// ============================================================================
// AUTO PROCESSING WITH RELEVANCE CHECK
// ============================================================================

async function intelligentAutoProcess(imageData: string): Promise<void> {
  if (!autoModeEnabled) return;
  
  try {
    if (!isMinimized) {
      showProcessingOverlay();
    }
    safeShowNotification('info', 'Auto Mode', '🔍 Checking relevance...');
    
    const relevance = await checkDevelopmentRelevance(imageData);
    
    console.log('🔍 Relevance check result:', relevance);
    
    if (!relevance.isRelevant && relevance.confidence > 0.5) {
      console.log('❌ Content not relevant to development, STOPPING - NO AI COMMUNICATION');
if (!isMinimized) {
hideProcessingOverlay();
}
safeShowNotification('warning', 'Auto Mode Stopped', 'Image not beneficial to development');
      showRelevanceWarningModal(relevance.reason, relevance.suggestedAction);
      return;
    }
    
    if (!relevance.isRelevant) {
      console.log('❌ Content rejected (low confidence), STOPPING - NO AI COMMUNICATION');
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      safeShowNotification('warning', 'Auto Mode', 'Content may not be development-related');
      showRelevanceWarningModal(
        relevance.reason || 'Content does not appear to be development-related',
        relevance.suggestedAction || 'Turn off Auto Mode and analyze manually'
      );
      return;
    }
    
    console.log('✅ Content appears relevant, proceeding with analysis');
    
    safeShowNotification('info', 'Auto Mode', '🔍 Detecting content type...');
    const contentType = await detectTechnicalContent(imageData);
    
    console.log('Technical content detected:', contentType);
    
    const detectionMsg = `${getContentTypeEmoji(contentType)} Detected: ${contentType.description}`;
    showAutoSuggestion(detectionMsg, contentType.subType, imageData);
    
    if (!hasApiKey() || !isVisionCapable()) {
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      if (!isVisionCapable()) {
        safeShowNotification('warning', 'Auto Mode', `${getApiProvider()} doesn't support vision.`);
      }
      return;
    }
    
    setTimeout(async () => {
      const suggestionEl = document.querySelector('.auto-suggestion');
      if (!suggestionEl) {
  if (!isMinimized) {
    hideProcessingOverlay();
  }
  return;
}
      
      try {
        safeShowNotification('info', 'Auto Mode', `Analyzing ${contentType.subType}...`);
        
        const analysis = await analyzeByContentType(imageData, contentType);
        const resultTitle = `${getContentTypeEmoji(contentType)} ${formatContentType(contentType)}`;
        
        lastAnalysisResult = { type: contentType.subType, content: analysis };
        
        console.log('✅ Content passed relevance check, calling displayResult');
        if (!isMinimized) {
          hideProcessingOverlay();
        }
        await displayResult(resultTitle, analysis, imageData);
        
        if (suggestionEl) {
          suggestionEl.remove();
        }
      } catch (error) {
        console.error('Auto specialized analysis error:', error);
        if (!isMinimized) {
          hideProcessingOverlay();
        }
        safeShowNotification('error', 'Auto Mode', 'Analysis failed, try manual analysis');
      }
    }, 3000);
  } catch (error) {
    console.error('Content detection error:', error);
    if (!isMinimized) {
      hideProcessingOverlay();
    }
    safeShowNotification('warning', 'Auto Mode', 'Could not detect content type');
  }
}

// ============================================================================
// AUTO SUGGESTION DISPLAY
// ============================================================================

function showAutoSuggestion(suggestion: string, contentType: string, imageData: string): void {
  if (!cameraPanel || !autoModeEnabled) return;
  
  const viewArea = cameraPanel.querySelector('.view-area, .dev-view-area');
  if (!viewArea) return;
  
  const existingSuggestion = viewArea.querySelector('.auto-suggestion');
  if (existingSuggestion) {
    existingSuggestion.remove();
  }
  
  const suggestionEl = document.createElement('div');
  suggestionEl.className = 'auto-suggestion';
  suggestionEl.style.cssText = `
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    color: white;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
    border: 1px solid rgba(88, 166, 255, 0.3);
    animation: slideUp 0.3s ease;
  `;
  
  suggestionEl.innerHTML = `
    <span style="flex: 1; margin-right: 8px;">🤖 ${suggestion}</span>
    <button class="auto-action-btn" data-action="${contentType}" style="
      background: #58a6ff;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    ">Yes</button>
  `;
  
  viewArea.appendChild(suggestionEl);
  
  setTimeout(() => {
    suggestionEl.remove();
  }, 5000);
}

// ============================================================================
// RELEVANCE WARNING MODAL
// ============================================================================

function showRelevanceWarningModal(reason: string, suggestedAction: string): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    padding: 30px;
    border-radius: 12px;
    max-width: 500px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 2px solid rgba(255, 152, 0, 0.3);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  `;

  content.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
      <h2 style="margin: 0; color: #ff9800; font-size: 20px;">Auto Mode - Content Not Relevant</h2>
    </div>
    
    <div style="background: rgba(255, 152, 0, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #ffb74d; margin-bottom: 8px; font-weight: 600;">🔍 Detection Result:</div>
      <div style="font-size: 13px; line-height: 1.6; color: #e0e0e0;">${reason}</div>
    </div>
    
    <div style="background: rgba(79, 195, 247, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #4fc3f7; margin-bottom: 8px; font-weight: 600;">💡 Recommendation:</div>
      <div style="font-size: 13px; line-height: 1.6; color: #e0e0e0;">${suggestedAction}</div>
    </div>
    
    <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #4caf50; margin-bottom: 10px; font-weight: 600;">✅ Auto Mode works best with:</div>
      <div style="font-size: 12px; line-height: 1.8; color: #e0e0e0;">
        💻 Code & IDE screenshots<br>
        📌 Hardware schematics & circuits<br>
        〰️ Oscilloscope & signal waveforms<br>
        📊 Architecture & system diagrams<br>
        🛠 Error messages & logs<br>
        📖 Technical documentation
      </div>
    </div>
    
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button id="close-warning-btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #238636, #2ea043); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">OK, Got It</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  document.getElementById('close-warning-btn')?.addEventListener('click', () => modal.remove());

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ============================================================================
// RESULT DISPLAY WITH FULL CONTEXT FOR AI
// ============================================================================
// ============================================================================
// RESULT DISPLAY WITH PREVIEW MODAL - FIXED VERSION
// ============================================================================

async function displayResult(title: string, content: string, imageData?: string): Promise<void> {
  console.log('📤 Displaying result:', title, 'Auto mode:', autoModeEnabled);
  
  // ✅ AUTO MODE OFF → Skip rejection checks, directly send to AI
  if (!autoModeEnabled) {
    console.log('✅ Auto Mode OFF - Skipping rejection checks, sending directly to AI');
    
    // Try to display in AI panel first
    const aiPanelSuccess = tryDisplayInAIPanel(title, content, imageData);
    
    // Build context-aware AI prompt
    const aiPrompt = buildContextAwareMessage(title, content, imageData);
    
    // Send to AI chat immediately
    try {
      console.log('📨 Sending context-aware analysis to AI assistant (Manual Mode)...');
      await sendMessageDirectly(aiPrompt);
      console.log('✅ Message sent to AI successfully');
      safeShowNotification('success', 'Analysis Complete', '✅ Sent to AI Assistant');
    } catch (error: any) {
      console.error('❌ Failed to send to AI:', error);
      safeShowNotification('error', 'Send Failed', 'Could not send to AI assistant');
      // Fallback: Show modal if send fails
      showAnalysisPreviewModal(title, content, imageData, false);
    }
    
    return;
  }
  
  // ✅ AUTO MODE ON → Use rejection checking with whitelist
  console.log('🔍 Auto Mode ON - Checking content relevance...');
  
  // ✅ WHITELIST: Only approve content with these technical keywords
  const approvedKeywords = [
    // Code & Development
    'code', 'programming', 'source code', 'syntax', 'function', 'variable', 'algorithm',
    'debugging', 'compiler', 'ide', 'editor', 'terminal', 'console', 'git', 'repository',
    
    // Hardware & Electronics
    'schematic', 'circuit', 'pcb', 'circuit board', 'breadboard',
    'resistor', 'capacitor', 'inductor', 'transistor', 'diode', 'ic', 'integrated circuit',
    'mcu', 'microcontroller', 'soc', 'system on chip', 'fpga', 'cpu', 'gpu',
    'voltage', 'current', 'power', 'ground', 'vcc', 'gnd',
    
    // Signals & Measurements
    'waveform', 'signal', 'oscilloscope', 'logic analyzer', 'multimeter',
    'frequency', 'amplitude', 'phase', 'pwm', 'adc', 'dac',
    'analog', 'digital', 'timing diagram',
    
    // Diagrams & Architecture
    'block diagram', 'architecture diagram', 'flowchart', 'uml', 'class diagram',
    'sequence diagram', 'state machine', 'data flow',
    
    // Technical Specs
    'datasheet', 'specification', 'api documentation', 'technical document',
    'pin configuration', 'register', 'memory map', 'protocol',
    
    // Development Tools
    'debugger', 'profiler', 'monitor', 'analyzer', 'simulator', 'emulator'
  ];
  
  // ❌ BLACKLIST: Strong rejection indicators
  const rejectionKeywords = [
    'certificate', 'diploma', 'award', 'certification', 'degree',
    'photo of person', 'selfie', 'portrait', 'people', 'face',
    'workspace photo', 'desk photo', 'office photo', 'room',
    'not relevant', 'not development', 'not technical', 'non-technical',
    'not beneficial', 'unrelated to development',
    'general document', 'text document', 'plain text',
    'website screenshot', 'social media', 'chat', 'email',
    'product photo', 'equipment photo', 'blank screen'
  ];
  
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();
  const fullText = contentLower + ' ' + titleLower;
  
  // Check for approved technical keywords
  const hasApprovedKeyword = approvedKeywords.some(kw => fullText.includes(kw));
  
  // Check for rejection keywords
  const hasRejectionKeyword = rejectionKeywords.some(kw => fullText.includes(kw));
  
  // Decision logic:
  // 1. If has rejection keyword AND no approved keyword → REJECT
  // 2. If has strong rejection keyword even with approved → REJECT (e.g., certificate)
  // 3. If has approved keyword and no rejection → ACCEPT
  const strongRejections = ['certificate', 'diploma', 'award', 'selfie', 'portrait'];
  const hasStrongRejection = strongRejections.some(kw => fullText.includes(kw));
  
  const isRejected = hasStrongRejection || (hasRejectionKeyword && !hasApprovedKeyword);
  
  if (isRejected) {
    console.log('⚠️ REJECTION DETECTED (Auto Mode): Content flagged as non-development');
    console.log('  - Has approved keyword:', hasApprovedKeyword);
    console.log('  - Has rejection keyword:', hasRejectionKeyword);
    console.log('  - Has strong rejection:', hasStrongRejection);
  } else {
    console.log('✅ ACCEPTED (Auto Mode): Content appears to be technical/development-related');
  }
  
  // ✅ Show preview modal with rejection flag (Auto Mode only)
  showAnalysisPreviewModal(title, content, imageData, isRejected);
}

// ============================================================================
// NEW: ANALYSIS PREVIEW MODAL WITH SEND TO AI OPTION
// ============================================================================

function showAnalysisPreviewModal(title: string, content: string, imageData?: string, isRejected: boolean = false): void {
  // Inject CSS animations and styles
  const styleId = 'analysis-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes analysisModalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes analysisModalSlideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes analysisPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      /* Compact scrollbar */
      .analysis-content-text::-webkit-scrollbar {
        width: 4px;
      }
      .analysis-content-text::-webkit-scrollbar-track {
        background: transparent;
      }
      .analysis-content-text::-webkit-scrollbar-thumb {
        background: rgba(110, 118, 129, 0.3);
        border-radius: 2px;
      }
      .analysis-content-text::-webkit-scrollbar-thumb:hover {
        background: rgba(110, 118, 129, 0.5);
      }
      
      .analysis-btn-hover:hover { transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
  }

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    animation: analysisModalFadeIn 0.2s ease;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(145deg, #161b22 0%, #0d1117 100%);
    border: 1px solid ${isRejected ? 'rgba(248, 81, 73, 0.4)' : 'rgba(48, 54, 61, 0.8)'};
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 75vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03) inset;
    animation: analysisModalSlideUp 0.25s ease;
  `;

  // Determine icon and colors based on title
  const isOCR = title.includes('OCR');
  const isCode = title.includes('Code');
  const isUI = title.includes('UI');
  const isError = title.includes('Error') || title.includes('Debug');
  
  let iconSVG: string;
  let accentColor: string;
  let iconBgGradient: string;
  
  if (isRejected) {
    accentColor = '#f85149';
    iconBgGradient = 'linear-gradient(135deg, rgba(248, 81, 73, 0.2), rgba(248, 81, 73, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`;
  } else if (isOCR) {
    accentColor = '#a855f7';
    iconBgGradient = 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>`;
  } else if (isCode) {
    accentColor = '#3fb950';
    iconBgGradient = 'linear-gradient(135deg, rgba(63, 185, 80, 0.2), rgba(63, 185, 80, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>`;
  } else if (isUI) {
    accentColor = '#f97316';
    iconBgGradient = 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>`;
  } else if (isError) {
    accentColor = '#ef4444';
    iconBgGradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>`;
  } else {
    accentColor = '#58a6ff';
    iconBgGradient = 'linear-gradient(135deg, rgba(88, 166, 255, 0.2), rgba(88, 166, 255, 0.05))';
    iconSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>`;
  }

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 14px;
    background: ${isRejected ? 'linear-gradient(135deg, rgba(248, 81, 73, 0.08), transparent)' : 'transparent'};
    border-bottom: 1px solid rgba(48, 54, 61, 0.5);
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="
        width: 34px;
        height: 34px;
        background: ${iconBgGradient};
        border: 1px solid ${accentColor}33;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${iconSVG}
      </div>
      <div>
        <h2 style="margin: 0; color: #f0f6fc; font-size: 13px; font-weight: 600; letter-spacing: -0.2px;">
          ${title}
        </h2>
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
          <span style="
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            background: ${isRejected ? 'rgba(248, 81, 73, 0.15)' : 'rgba(63, 185, 80, 0.15)'};
            border: 1px solid ${isRejected ? 'rgba(248, 81, 73, 0.3)' : 'rgba(63, 185, 80, 0.3)'};
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            color: ${isRejected ? '#f85149' : '#3fb950'};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            <span style="
              width: 5px;
              height: 5px;
              background: ${isRejected ? '#f85149' : '#3fb950'};
              border-radius: 50%;
              ${!isRejected ? 'animation: analysisPulse 2s infinite;' : ''}
            "></span>
            ${isRejected ? 'Flagged' : 'Complete'}
          </span>
          <span style="color: #6e7681; font-size: 10px;">
            ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
    <button id="close-preview-btn" style="
      width: 28px;
      height: 28px;
      background: rgba(110, 118, 129, 0.1);
      border: 1px solid rgba(110, 118, 129, 0.2);
      border-radius: 6px;
      color: #8b949e;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  // Content area
  const contentArea = document.createElement('div');
  contentArea.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  `;

  // Rejection warning banner
  if (isRejected) {
    const warningBanner = document.createElement('div');
    warningBanner.style.cssText = `
      background: linear-gradient(135deg, rgba(248, 81, 73, 0.12), rgba(248, 81, 73, 0.04));
      border: 1px solid rgba(248, 81, 73, 0.25);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      gap: 14px;
    `;
    warningBanner.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        background: rgba(248, 81, 73, 0.15);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <div style="flex: 1;">
        <div style="color: #f85149; font-weight: 600; font-size: 13px; margin-bottom: 6px;">
          Non-Technical Content Detected
        </div>
        <div style="color: #b1bac4; font-size: 12px; line-height: 1.6;">
          This image doesn't appear to be development-related content. Camera is optimized for code, circuits, schematics, and technical documentation.
        </div>
      </div>
    `;
    contentArea.appendChild(warningBanner);
  }

  // Thumbnail if image provided
  if (imageData) {
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.style.cssText = `
      margin-bottom: 12px;
      display: flex;
      justify-content: center;
    `;

    const thumbnailWrapper = document.createElement('div');
    thumbnailWrapper.style.cssText = `
      position: relative;
      padding: 6px;
      background: rgba(110, 118, 129, 0.08);
      border: 1px solid rgba(110, 118, 129, 0.12);
      border-radius: 8px;
    `;

    const thumbnail = document.createElement('img');
    thumbnail.src = imageData;
    thumbnail.style.cssText = `
      max-width: 180px;
      max-height: 120px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      object-fit: cover;
      display: block;
    `;

    thumbnail.addEventListener('click', () => {
      showImagePreviewFullscreen(imageData);
    });

    thumbnail.addEventListener('mouseenter', () => {
      thumbnail.style.transform = 'scale(1.02)';
      thumbnail.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    });

    thumbnail.addEventListener('mouseleave', () => {
      thumbnail.style.transform = 'scale(1)';
      thumbnail.style.boxShadow = 'none';
    });

    // Expand icon overlay
    const expandOverlay = document.createElement('div');
    expandOverlay.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 12px;
      width: 24px;
      height: 24px;
      background: rgba(0,0,0,0.65);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;
    expandOverlay.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;

    thumbnailWrapper.appendChild(thumbnail);
    thumbnailWrapper.appendChild(expandOverlay);
    thumbnailContainer.appendChild(thumbnailWrapper);
    contentArea.appendChild(thumbnailContainer);
  }

  // Analysis result - HIDE for rejected content
  if (!isRejected) {
    // Content header with copy button
    const contentHeader = document.createElement('div');
    contentHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    `;
    contentHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 5px;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6e7681" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span style="color: #6e7681; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Analysis Result</span>
      </div>
      <button id="copy-content-btn" style="
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 3px 7px;
        background: transparent;
        border: 1px solid rgba(110, 118, 129, 0.2);
        border-radius: 4px;
        color: #6e7681;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.15s;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </button>
    `;
    contentArea.appendChild(contentHeader);

    const resultDiv = document.createElement('div');
    resultDiv.className = 'analysis-content-text';
    resultDiv.style.cssText = `
      background: rgba(13, 17, 23, 0.6);
      border: 1px solid rgba(48, 54, 61, 0.4);
      border-radius: 6px;
      padding: 12px 14px;
      color: #b1bac4;
      font-size: 11.5px;
      line-height: 1.45;
      font-family: ${isOCR || isCode ? "'SF Mono', Monaco, 'Courier New', monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"};
      max-height: 260px;
      overflow-y: auto;
    `;
    
    // Professional compact markdown rendering
    let formattedContent = content
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e6edf3; font-weight: 600;">$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em style="color: #79c0ff;">$1</em>')
      // Inline code
      .replace(/`(.*?)`/g, '<code style="background: rgba(88, 166, 255, 0.12); padding: 1px 4px; border-radius: 3px; font-size: 10.5px; color: #79c0ff; font-family: SF Mono, Monaco, monospace;">$1</code>')
      // Main title (# heading) - compact with accent bar
      .replace(/^# (.*$)/gm, '<div style="color: #58a6ff; font-weight: 600; font-size: 12px; margin: 0 0 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(88, 166, 255, 0.15);">$1</div>')
      // Section headers (## heading) - very compact
      .replace(/^## (.*$)/gm, '<div style="color: #58a6ff; font-weight: 600; font-size: 11px; margin: 8px 0 3px;">$1</div>')
      // Subsection headers (### heading)
      .replace(/^### (.*$)/gm, '<div style="color: #8b949e; font-weight: 600; font-size: 10px; margin: 6px 0 2px; text-transform: uppercase; letter-spacing: 0.2px;">$1</div>')
      // Numbered list - very compact inline style
      .replace(/^(\d+)\. (.*$)/gm, '<div style="display: flex; gap: 6px; margin: 2px 0;"><span style="color: #58a6ff; font-weight: 600; font-size: 10.5px; min-width: 14px;">$1.</span><span style="flex: 1;">$2</span></div>')
      // Bullet list - compact
      .replace(/^- (.*$)/gm, '<div style="display: flex; gap: 6px; margin: 1px 0; padding-left: 2px;"><span style="color: #3fb950; font-size: 6px; margin-top: 4px;">●</span><span style="flex: 1; color: #9ca3af;">$1</span></div>')
      // Reduce double line breaks
      .replace(/\n\n+/g, '\n')
      // Single line breaks
      .replace(/\n/g, '<br style="line-height: 0.8;">');
    
    resultDiv.innerHTML = formattedContent;
    contentArea.appendChild(resultDiv);

    // Copy button handler
    setTimeout(() => {
      const copyBtn = document.getElementById('copy-content-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(content);
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            `;
            copyBtn.style.color = '#3fb950';
            copyBtn.style.borderColor = 'rgba(63, 185, 80, 0.3)';
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              `;
              copyBtn.style.color = '#8b949e';
              copyBtn.style.borderColor = 'rgba(110, 118, 129, 0.2)';
            }, 2000);
          } catch (err) {
            console.error('Copy failed:', err);
          }
        });
      }
    }, 0);
  }

  // Footer with actions
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 10px 14px;
    border-top: 1px solid rgba(48, 54, 61, 0.5);
    background: rgba(22, 27, 34, 0.4);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.className = 'analysis-btn-hover';
  closeBtn.style.cssText = `
    padding: 6px 12px;
    background: rgba(110, 118, 129, 0.1);
    border: 1px solid rgba(110, 118, 129, 0.2);
    border-radius: 5px;
    color: #b1bac4;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    transition: all 0.15s;
  `;

  closeBtn.addEventListener('click', () => modal.remove());
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(110, 118, 129, 0.2)';
    closeBtn.style.borderColor = 'rgba(110, 118, 129, 0.4)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(110, 118, 129, 0.1)';
    closeBtn.style.borderColor = 'rgba(110, 118, 129, 0.25)';
  });

  // Send to AI button
  const sendToAIBtn = document.createElement('button');
  sendToAIBtn.className = 'analysis-btn-hover';
  
  if (isRejected) {
    sendToAIBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Send Anyway</span>
    `;
    sendToAIBtn.style.cssText = `
      padding: 6px 12px;
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: 5px;
      color: #f85149;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    `;
  } else {
    sendToAIBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
      <span>Send to AI Assistant</span>
    `;
    sendToAIBtn.style.cssText = `
      padding: 6px 12px;
      background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
      border: none;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
      box-shadow: 0 1px 4px rgba(35, 134, 54, 0.2);
    `;
  }

  sendToAIBtn.addEventListener('click', async () => {
    sendToAIBtn.disabled = true;
    sendToAIBtn.style.opacity = '0.7';
    sendToAIBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: analysisSpinner 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
      </svg>
      <span>Sending...</span>
    `;

    try {
      const aiPanelSuccess = tryDisplayInAIPanel(title, content, imageData);
      
      // Use context-aware message with IDE context
      const aiPrompt = buildContextAwareMessage(title, content, imageData);

      await sendMessageDirectly(aiPrompt);

      sendToAIBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Sent!</span>
      `;
      sendToAIBtn.style.background = 'rgba(63, 185, 80, 0.15)';
      sendToAIBtn.style.border = '1px solid rgba(63, 185, 80, 0.3)';
      sendToAIBtn.style.color = '#3fb950';

      safeShowNotification('success', 'Sent', 'Analysis sent to AI Assistant');
      setTimeout(() => modal.remove(), 1200);

    } catch (error: any) {
      console.error('Failed to send:', error);
      safeShowNotification('error', 'Failed', error.message || 'Could not send');
      
      sendToAIBtn.disabled = false;
      sendToAIBtn.style.opacity = '1';
      sendToAIBtn.innerHTML = isRejected ? `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        </svg>
        <span>Retry</span>
      ` : `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
        <span>Retry</span>
      `;
    }
  });

  if (!isRejected) {
    sendToAIBtn.addEventListener('mouseenter', () => {
      sendToAIBtn.style.boxShadow = '0 4px 16px rgba(35, 134, 54, 0.4)';
      sendToAIBtn.style.transform = 'translateY(-1px)';
    });
    sendToAIBtn.addEventListener('mouseleave', () => {
      sendToAIBtn.style.boxShadow = '0 2px 8px rgba(35, 134, 54, 0.25)';
      sendToAIBtn.style.transform = 'translateY(0)';
    });
  } else {
    sendToAIBtn.addEventListener('mouseenter', () => {
      sendToAIBtn.style.background = 'rgba(248, 81, 73, 0.25)';
    });
    sendToAIBtn.addEventListener('mouseleave', () => {
      sendToAIBtn.style.background = 'rgba(248, 81, 73, 0.15)';
    });
  }

  footer.appendChild(closeBtn);
  footer.appendChild(sendToAIBtn);

  // Assemble
  dialog.appendChild(header);
  dialog.appendChild(contentArea);
  dialog.appendChild(footer);
  modal.appendChild(dialog);

  // Append modal FIRST so elements exist in DOM
  document.body.appendChild(modal);

  // Event handlers - now the button exists in DOM
  const closePreviewBtn = dialog.querySelector('#close-preview-btn') as HTMLButtonElement;
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.remove();
    });
    closePreviewBtn.addEventListener('mouseenter', () => {
      closePreviewBtn.style.background = 'rgba(248, 81, 73, 0.1)';
      closePreviewBtn.style.borderColor = 'rgba(248, 81, 73, 0.3)';
      closePreviewBtn.style.color = '#f85149';
    });
    closePreviewBtn.addEventListener('mouseleave', () => {
      closePreviewBtn.style.background = 'rgba(110, 118, 129, 0.1)';
      closePreviewBtn.style.borderColor = 'rgba(110, 118, 129, 0.2)';
      closePreviewBtn.style.color = '#8b949e';
    });
  } else {
    console.error('❌ Close button not found in modal');
  }

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Helper function for fullscreen image preview
function showImagePreviewFullscreen(imageData: string): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10002;
    cursor: pointer;
    animation: fadeIn 0.2s ease;
  `;

  const img = document.createElement('img');
  img.src = imageData;
  img.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  `;

  modal.appendChild(img);
  modal.addEventListener('click', () => modal.remove());

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });

  document.body.appendChild(modal);
}
// ============================================================================
// OCR & ANALYSIS MODALS - ONLY FOR MANUAL MODE
// ============================================================================

function showOCRModal(text: string): void {
  if (autoModeEnabled) {
    console.log('🛑 Blocked: OCR modal suppressed in auto mode');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const header = document.createElement('div');
  header.innerHTML = '📝 <strong>Extracted Text (OCR)</strong>';
  header.style.cssText = `margin-bottom: 15px; color: #9c27b0; font-size: 16px;`;

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.cssText = `
    width: 100%;
    height: 300px;
    background: #333;
    border: 1px solid #555;
    color: white;
    padding: 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    resize: vertical;
    box-sizing: border-box;
  `;
  textArea.readOnly = true;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;`;

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Text';
  copyBtn.style.cssText = `padding: 8px 16px; background: #9c27b0; color: white; border: none; border-radius: 4px; cursor: pointer;`;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      safeShowNotification('success', 'OCR', 'Text copied to clipboard');
    });
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;`;
  closeBtn.addEventListener('click', () => modal.remove());

  buttonContainer.appendChild(copyBtn);
  buttonContainer.appendChild(closeBtn);
  content.appendChild(header);
  content.appendChild(textArea);
  content.appendChild(buttonContainer);
  modal.appendChild(content);

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function showAnalysisModal(title: string, content: string): void {
  if (autoModeEnabled) {
    console.log('🛑 Blocked: Analysis modal suppressed in auto mode');
    return;
  }
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const header = document.createElement('div');
  header.innerHTML = `🤖 <strong>${title}</strong>`;
  header.style.cssText = `margin-bottom: 15px; color: #ff9800; font-size: 16px;`;

  const contentDiv = document.createElement('div');
  contentDiv.textContent = content;
  contentDiv.style.cssText = `line-height: 1.5; margin-bottom: 15px; white-space: pre-wrap;`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; float: right;`;
  closeBtn.addEventListener('click', () => modal.remove());

  modalContent.appendChild(header);
  modalContent.appendChild(contentDiv);
  modalContent.appendChild(closeBtn);
  modal.appendChild(modalContent);

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ============================================================================
// AI PANEL INTEGRATION
// ============================================================================

function findAIAssistantPanel(): HTMLElement | null {
  const selectors = [
    '.ai-assistant-panel',
    '.ai-panel',
    '[data-panel="ai-assistant"]',
    '[data-component="ai-assistant"]',
    '.assistant-panel',
    '.chat-panel'
  ];
  
  for (const selector of selectors) {
    const panel = document.querySelector(selector) as HTMLElement;
    if (panel) return panel;
  }
  
  const panels = document.querySelectorAll('.panel, [class*="panel"], [class*="assistant"]');
  for (const panel of panels) {
    const text = panel.textContent?.toLowerCase() || '';
    if (text.includes('ai assistant') || text.includes('assistant') || text.includes('ai ')) {
      return panel as HTMLElement;
    }
  }
  
  return null;
}

function tryDisplayInAIPanel(title: string, content: string, imageData?: string): boolean {
  try {
    let aiPanel = findAIAssistantPanel();
    if (!aiPanel) return false;
    
    let messagesContainer = aiPanel.querySelector('.messages, .conversation, .chat-messages, .panel-content') as HTMLElement;
    
    if (!messagesContainer) {
      const scrollables = aiPanel.querySelectorAll('div');
      for (const div of scrollables) {
        const style = window.getComputedStyle(div);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          messagesContainer = div as HTMLElement;
          break;
        }
      }
    }
    
    if (!messagesContainer) return false;
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin: 12px 0;
      padding: 16px;
      background: rgba(14, 99, 156, 0.1);
      border-left: 4px solid #0e639c;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;`;
    
    const isOCR = title.includes('OCR');
    const isCode = title.includes('Code');
    const icon = isOCR ? '📝' : isCode ? '💻' : '🤖';
    const headerColor = isOCR ? '#9c27b0' : isCode ? '#4caf50' : '#ff9800';
    
    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = `<strong style="color: ${headerColor};">${icon} Camera ${title}</strong>`;
    
    const timestampSpan = document.createElement('span');
    timestampSpan.textContent = new Date().toLocaleTimeString();
    timestampSpan.style.cssText = `font-size: 11px; color: rgba(255,255,255,0.5);`;
    
    headerDiv.appendChild(titleSpan);
    headerDiv.appendChild(timestampSpan);
    
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `display: flex; gap: 12px; align-items: flex-start;`;
    
    if (imageData) {
      const thumbnailDiv = document.createElement('div');
      thumbnailDiv.style.cssText = `flex-shrink: 0; width: 80px; height: 60px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid #555;`;
      
      const thumbnail = document.createElement('img');
      thumbnail.src = imageData;
      thumbnail.alt = 'Camera capture';
      thumbnail.style.cssText = `width: 100%; height: 100%; object-fit: cover;`;
      
      thumbnail.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10001;
          cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = imageData;
        img.style.cssText = `max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px;`;
        
        modal.appendChild(img);
        modal.addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
      });
      
      thumbnailDiv.appendChild(thumbnail);
      contentDiv.appendChild(thumbnailDiv);
    }
    
    const textDiv = document.createElement('div');
    textDiv.style.cssText = `
      flex: 1;
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.4;
      ${isOCR || isCode ? 'font-family: monospace; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; white-space: pre-wrap;' : ''}
    `;
    textDiv.textContent = content;
    contentDiv.appendChild(textDiv);
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    safeShowNotification('success', title, 'Results sent to AI Assistant');
    return true;
  } catch (error) {
    console.warn('Failed to display in AI panel:', error);
    return false;
  }
}

// ============================================================================
// BUTTON LOADING STATES
// ============================================================================

function showButtonLoading(button: HTMLButtonElement, originalText: string): void {
  // Inject clean spinner styles if not already present
  if (!document.getElementById('button-loading-styles-v2')) {
    const style = document.createElement('style');
    style.id = 'button-loading-styles-v2';
    style.textContent = `
      @keyframes btnSpinnerRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes btnSuccessPop {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      .btn-spinner-icon {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.25);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: btnSpinnerRotate 0.7s linear infinite;
        flex-shrink: 0;
      }
      .btn-success-icon {
        animation: btnSuccessPop 0.3s ease forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Check if panel is minimized
  if (isMinimized && cameraPanel) {
    // Minimized mode: Subtle border indicator
    cameraPanel.style.border = '2px solid #58a6ff';
    cameraPanel.style.boxShadow = '0 0 12px rgba(88, 166, 255, 0.3)';
    button.disabled = true;
  } else {
    // Maximized mode: Clean loading state
    if (!(button as any)._originalHTML) {
      (button as any)._originalHTML = button.innerHTML;
    }
    
    button.disabled = true;
    button.style.opacity = '1';
    button.style.background = 'linear-gradient(135deg, #1f6feb, #388bfd)';
    button.style.borderColor = '#388bfd';
    button.style.color = '#ffffff';
    button.innerHTML = `
      <div class="btn-spinner-icon"></div>
      <span>${originalText}...</span>
    `;
  }
}

function hideButtonLoading(button: HTMLButtonElement, originalText: string, showSuccess: boolean = false): void {
  // Check if panel is minimized
  if (isMinimized && cameraPanel) {
    // Minimized mode: Remove border indicator
    cameraPanel.style.border = '1px solid #30363d';
    cameraPanel.style.boxShadow = '0 8px 24px rgba(1,4,9,0.8)';
    button.disabled = false;
  } else {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
    
    if (showSuccess) {
      // Show success state briefly
      button.style.background = 'linear-gradient(135deg, #238636, #2ea043)';
      button.style.borderColor = '#2ea043';
      button.style.color = '#ffffff';
      button.innerHTML = `
        <svg class="btn-success-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Done!</span>
      `;
      
      // Restore original after 1.5 seconds
      setTimeout(() => {
        button.style.background = '';
        button.style.borderColor = '';
        button.style.color = '';
        if ((button as any)._originalHTML) {
          button.innerHTML = (button as any)._originalHTML;
        }
      }, 1500);
    } else {
      // Restore immediately
      button.style.background = '';
      button.style.borderColor = '';
      button.style.color = '';
      if ((button as any)._originalHTML) {
        button.innerHTML = (button as any)._originalHTML;
      }
    }
  }
  
  console.log('✅ Button restored:', originalText);
}

// ============================================================================
// BUTTON STATES UPDATE
// ============================================================================

function updateButtonStates(): void {
  if (!cameraPanel) return;
  
  const hasKey = hasApiKey();
  const visionCapable = isVisionCapable();
  const provider = getApiProvider();
  const buttons = cameraPanel.querySelectorAll('.side-button');
  
  buttons.forEach((btn) => {
    const button = btn as HTMLButtonElement;
    const buttonText = button.textContent?.trim() || '';
    
    // Skip Capture and Switch buttons
    if (buttonText === 'Switch' || buttonText === 'Capture' || buttonText.includes('Capture (')) {
      return;
    }
    
    // ✅ CRITICAL: Analyze button should ALWAYS be enabled (never disabled)
    const isAnalyzeButton = buttonText.includes('Analyze');
    
    if (hasKey && visionCapable) {
      button.classList.remove('disabled-no-api');
      button.disabled = false;
      button.title = '';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    } else {
      button.classList.add('disabled-no-api');
      button.disabled = false;  // Keep enabled even without API
      button.style.cursor = 'pointer';  // Always show as clickable
      
      if (isAnalyzeButton) {
        // Analyze button gets special treatment - slightly dimmed but clearly usable
        button.style.opacity = '0.7';
        button.title = !hasKey 
          ? 'Click API button to configure, then try again'
          : `${provider} doesn't support vision. Switch to OpenAI/Claude/Gemini`;
      } else {
        button.style.opacity = '0.5';
        button.title = !hasKey 
          ? 'Click API button to configure'
          : `${provider} doesn't support vision. Switch to OpenAI/Claude/Gemini`;
      }
    }
  });
  
  updateAutoButtonAppearance();
  updateProviderBadge();
}

function updateAutoButtonAppearance(): void {
  const autoToggle = cameraPanel?.querySelector('.side-toggle');
  if (!autoToggle) return;
  
  updateSideToggle(autoToggle as HTMLElement, autoModeEnabled);
}

function updateProviderBadge(): void {
  if (!cameraPanel) return;
  
  const badge = cameraPanel.querySelector('.provider-badge') as HTMLElement;
  if (!badge) return;
  
  const config = getCurrentApiConfigurationForced();
  const icons: { [key: string]: string } = {
    groq: '🚀', deepseek: '🔥', openai: '⚡',
    claude: '🧠', gemini: '✨', kimi: '🌙',
    ollama: '🦙', cohere: '💫'
  };
  
  const icon = icons[config.provider] || '🤖';
  const visionCapable = isVisionCapable();
  
  badge.textContent = `${icon} ${config.provider.toUpperCase()}`;
  badge.style.background = visionCapable ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)';
  badge.style.borderColor = visionCapable ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)';
  badge.style.color = visionCapable ? '#4caf50' : '#ff9800';
  badge.title = visionCapable 
    ? `Using ${config.provider} for vision AI`
    : `${config.provider} doesn't support vision. Switch to OpenAI/Claude/Gemini`;
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

function createIconButton(svgContent: string, tooltip: string): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'dev-icon-btn';
  btn.title = tooltip;
  btn.innerHTML = svgContent;
  btn.style.cssText = `
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8b949e;
    transition: all 0.15s ease;
  `;
  
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#21262d';
    btn.style.borderColor = '#30363d';
    btn.style.color = '#c9d1d9';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent';
    btn.style.borderColor = 'transparent';
    btn.style.color = '#8b949e';
  });
  
  return btn;
}

function injectDeveloperCameraStyles(): void {
  if (document.getElementById('dev-camera-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dev-camera-styles';
  style.textContent = `
    @keyframes statusPulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px #3fb950; }
      50% { opacity: 0.5; box-shadow: 0 0 4px #3fb950; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.9; }
      50% { opacity: 0.6; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .dev-camera-header:active { cursor: grabbing; }
    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      border-top-color: #58a6ff;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .dev-camera-panel * { box-sizing: border-box; }
    .resize-handle { transition: background 0.15s ease; }
    .resize-handle:hover { background: rgba(88, 166, 255, 0.15) !important; }
    .controls-panel::-webkit-scrollbar { width: 6px; }
    .controls-panel::-webkit-scrollbar-track { background: transparent; }
    .controls-panel::-webkit-scrollbar-thumb { background: rgba(139, 148, 158, 0.3); border-radius: 3px; }
  `;
  
  document.head.appendChild(style);
}

function createSideTab(svgIcon: string, label: string, active: boolean): HTMLElement {
  const tab = document.createElement('button');
  tab.className = `side-tab ${active ? 'active' : ''}`;
  tab.title = label; // Add tooltip
  tab.style.cssText = `
    padding: 7px 10px;
    background: ${active ? '#161b22' : 'transparent'};
    border: 1px solid ${active ? '#30363d' : 'rgba(48, 54, 61, 0.3)'};
    border-radius: 5px;
    color: ${active ? '#58a6ff' : '#8b949e'};
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.12s ease;
    width: 100%;
  `;
  tab.innerHTML = `${svgIcon}<span>${label}</span>`;
  
  tab.addEventListener('mouseenter', () => {
    if (!tab.classList.contains('active')) {
      tab.style.background = '#21262d';
      tab.style.borderColor = '#30363d';
      tab.style.color = '#c9d1d9';
    }
  });
  
  tab.addEventListener('mouseleave', () => {
    if (!tab.classList.contains('active')) {
      tab.style.background = 'transparent';
      tab.style.borderColor = 'rgba(48, 54, 61, 0.3)';
      tab.style.color = '#8b949e';
    }
  });
  
  return tab;
}

function createSideToggle(svgIcon: string, label: string, active: boolean): HTMLElement {
  const toggle = document.createElement('button');
  toggle.className = 'side-toggle';
  toggle.title = label; // Add tooltip
  toggle.style.cssText = `
    padding: 7px 10px;
    background: ${active ? 'rgba(63, 185, 80, 0.12)' : 'rgba(139, 148, 158, 0.06)'};
    border: 1px solid ${active ? 'rgba(63, 185, 80, 0.4)' : 'rgba(139, 148, 158, 0.2)'};
    border-radius: 5px;
    color: ${active ? '#3fb950' : '#8b949e'};
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.12s ease;
    width: 100%;
  `;
  toggle.innerHTML = `${svgIcon}<span>${label}</span>`;
  
  toggle.addEventListener('mouseenter', () => {
    if (toggle.style.background.includes('63, 185, 80')) {
      // Active state hover
      toggle.style.background = 'rgba(63, 185, 80, 0.18)';
      toggle.style.borderColor = 'rgba(63, 185, 80, 0.5)';
    } else {
      // Inactive state hover
      toggle.style.background = 'rgba(139, 148, 158, 0.12)';
      toggle.style.borderColor = 'rgba(139, 148, 158, 0.3)';
      toggle.style.color = '#c9d1d9';
    }
  });
  
  toggle.addEventListener('mouseleave', () => {
    if (toggle.style.background.includes('63, 185, 80')) {
      // Active state
      toggle.style.background = 'rgba(63, 185, 80, 0.12)';
      toggle.style.borderColor = 'rgba(63, 185, 80, 0.4)';
    } else {
      // Inactive state
      toggle.style.background = 'rgba(139, 148, 158, 0.06)';
      toggle.style.borderColor = 'rgba(139, 148, 158, 0.2)';
      toggle.style.color = '#8b949e';
    }
  });
  
  return toggle;
}

function updateSideToggle(toggle: HTMLElement, active: boolean): void {
  toggle.style.background = active ? 'rgba(63, 185, 80, 0.12)' : 'rgba(139, 148, 158, 0.06)';
  toggle.style.borderColor = active ? 'rgba(63, 185, 80, 0.4)' : 'rgba(139, 148, 158, 0.2)';
  toggle.style.color = active ? '#3fb950' : '#8b949e';
}

// ============================================================================
// UPDATE SIDE TABS - Switches between Camera and Screen modes
// ============================================================================

function updateSideTabs(activeTab: HTMLElement, inactiveTab: HTMLElement): void {
  // Set active tab styling
  activeTab.classList.add('active');
  activeTab.style.background = '#161b22';
  activeTab.style.borderColor = '#30363d';
  activeTab.style.color = '#58a6ff';
  
  // Set inactive tab styling
  inactiveTab.classList.remove('active');
  inactiveTab.style.background = 'transparent';
  inactiveTab.style.borderColor = 'rgba(48, 54, 61, 0.3)';
  inactiveTab.style.color = '#8b949e';
}
/**
 * Creates a simple merged toggle showing current mode with icon
 */
/**
 * Creates a simple merged toggle showing NEXT mode (action-oriented UX)
 * When in Camera mode → Shows "Screen" (because clicking switches to Screen)
 * When in Screen mode → Shows "Camera" (because clicking switches to Camera)
 */
function createSimpleMergedModeToggle(currentMode: 'camera' | 'screen'): HTMLElement {
  const button = document.createElement('button');
  button.className = 'mode-toggle-simple';
  
  const cameraIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  `;
  
  const screenIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  `;
  
  button.style.cssText = `
    padding: 7px 10px;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 5px;
    color: #58a6ff;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.12s ease;
    width: 100%;
  `;
  
  // Show NEXT mode (what clicking will do) - Action-oriented UX
  button.innerHTML = `
    ${currentMode === 'camera' ? screenIcon : cameraIcon}
    <span>${currentMode === 'camera' ? 'Screen' : 'Camera'}</span>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; opacity: 0.6;">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  
  button.title = `Switch to ${currentMode === 'camera' ? 'Screen' : 'Camera'} mode`;
  
  button.addEventListener('mouseenter', () => {
    button.style.background = '#21262d';
    button.style.borderColor = '#3d444d';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = '#161b22';
    button.style.borderColor = '#30363d';
  });
  
  return button;
}

/**
 * Updates the simple merged mode toggle to show NEXT mode (action-oriented)
 */
function updateSimpleMergedModeToggle(button: HTMLElement, mode: 'camera' | 'screen'): void {
  const cameraIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  `;
  
  const screenIcon = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  `;
  
  // Show NEXT mode (what clicking will do) - Action-oriented UX
  button.innerHTML = `
    ${mode === 'camera' ? screenIcon : cameraIcon}
    <span>${mode === 'camera' ? 'Screen' : 'Camera'}</span>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; opacity: 0.6;">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  
  button.title = `Switch to ${mode === 'camera' ? 'Screen' : 'Camera'} mode`;
}
function createSideButton(svgIcon: string, label: string, variant: 'primary' | 'secondary' | 'ai', showBadge: boolean = false): HTMLElement {
  const btn = document.createElement('button');
  btn.className = `side-button side-button-${variant}`;
  btn.title = label; // Add tooltip
  
  const colors = {
    primary: { bg: '#238636', hover: '#2ea043', color: '#ffffff', border: '#238636' },
    secondary: { bg: '#21262d', hover: '#30363d', color: '#c9d1d9', border: '#30363d' },
    ai: { bg: 'transparent', hover: 'rgba(88, 166, 255, 0.08)', color: '#8b949e', border: 'rgba(139, 148, 158, 0.25)' }
  };
  
  const color = colors[variant];
  
  btn.style.cssText = `
    padding: 7px 10px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    border-radius: 5px;
    color: ${color.color};
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.12s ease;
    width: 100%;
    position: relative;
  `;
  
  // ✅ CAPTURE BADGE - Add badge if enabled
  const badgeHTML = showBadge ? '<span class="capture-badge" style="display: none; position: absolute; right: 8px; min-width: 18px; height: 18px; padding: 0 5px; background: #1f6feb; color: white; border-radius: 9px; font-size: 10px; font-weight: 700; display: none; align-items: center; justify-content: center;">0</span>' : '';
  
  btn.innerHTML = `${svgIcon}<span style="flex: 1;">${label}</span>${badgeHTML}`;
  
  // Add hover effects
  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) {
      btn.style.background = color.hover;
      if (variant === 'ai') {
        btn.style.borderColor = 'rgba(88, 166, 255, 0.4)';
        btn.style.color = '#58a6ff';
      } else if (variant === 'secondary') {
        btn.style.borderColor = '#484f58';
      }
      btn.style.transform = 'translateY(-1px)';
    }
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = color.bg;
    btn.style.borderColor = color.border;
    btn.style.color = color.color;
    btn.style.transform = 'translateY(0)';
  });
  
  return btn;
}

// ============================================================================
// CAPTURE BADGE MANAGEMENT
// ============================================================================

function updateCaptureBadge(): void {
  const badge = document.querySelector('.capture-badge') as HTMLElement;
  if (!badge) return;
  
  const queueLength = getQueueLength();
  console.log('📊 Updating capture badge, queue length:', queueLength);
  
  if (queueLength > 0) {
    badge.textContent = queueLength.toString();
    badge.style.cssText = `
      display: flex;
      position: absolute;
      right: 8px;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: ${queueLength >= MAX_QUEUE_SIZE ? '#f85149' : '#1f6feb'};
      color: white;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      animation: badgePulse 0.3s ease;
    `;
    
    // Make badge clickable to show queue viewer
    badge.onclick = (e) => {
      e.stopPropagation();
      showQueueViewer();
    };
  } else {
    badge.style.display = 'none';
  }
  
  // Update capture button state
  const captureButtons = document.querySelectorAll('.side-button-secondary');
  captureButtons.forEach((btn) => {
    const button = btn as HTMLButtonElement;
    if (button.textContent?.includes('Capture')) {
      if (queueLength >= MAX_QUEUE_SIZE) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.title = `Queue full (${MAX_QUEUE_SIZE}/${MAX_QUEUE_SIZE}). Click badge to manage.`;
      } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.title = `Capture image (${queueLength}/${MAX_QUEUE_SIZE})`;
      }
    }
    
    // ✅ Show/hide Clear button based on queue length
    if (button.textContent?.includes('Clear')) {
      if (queueLength > 0) {
        button.style.display = 'flex';
      } else {
        button.style.display = 'none';
      }
    }
  });
}

// ============================================================================
// QUEUE VIEWER - Show captured images with remove option
// ============================================================================

function showQueueViewer(): void {
  const queue = (window as any).__cameraQueue || [];
  
  if (queue.length === 0) {
    safeShowNotification('info', 'Queue Empty', 'No captured images');
    return;
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(1, 4, 9, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10003;
    backdrop-filter: blur(8px);
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    border: 1px solid #30363d;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px;
    border-bottom: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  header.innerHTML = `
    <div>
      <h3 style="margin: 0; color: #e6edf3; font-size: 18px;">
        📸 Captured Images (${queue.length}/${MAX_QUEUE_SIZE})
      </h3>
      <p style="margin: 4px 0 0 0; color: #7d8590; font-size: 12px;">
        Click on any image to remove it
      </p>
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #8b949e;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(248, 81, 73, 0.1)';
    closeBtn.style.color = '#f85149';
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#8b949e';
  };
  closeBtn.onclick = () => modal.remove();
  header.appendChild(closeBtn);
  
  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  `;
  
  // Add each image
  queue.forEach((item: any, index: number) => {
    const imageCard = document.createElement('div');
    imageCard.style.cssText = `
      position: relative;
      aspect-ratio: 4/3;
      background: rgba(13, 17, 23, 0.6);
      border: 2px solid #30363d;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
    `;
    
    const img = document.createElement('img');
    img.src = item.imageData || item;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    
    const badge = document.createElement('div');
    badge.textContent = `#${index + 1}`;
    badge.style.cssText = `
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(31, 111, 235, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    `;
    
    const removeBtn = document.createElement('div');
    removeBtn.innerHTML = '🗑️';
    removeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(248, 81, 73, 0.9);
      color: white;
      width: 28px;
      height: 28px;
      display: none;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    `;
    
    imageCard.onmouseover = () => {
      imageCard.style.borderColor = '#58a6ff';
      imageCard.style.transform = 'scale(1.05)';
      removeBtn.style.display = 'flex';
    };
    
    imageCard.onmouseout = () => {
      imageCard.style.borderColor = '#30363d';
      imageCard.style.transform = 'scale(1)';
      removeBtn.style.display = 'none';
    };
    
    imageCard.onclick = () => {
      if (confirm(`Remove image #${index + 1}?`)) {
        queue.splice(index, 1);
        updateCaptureBadge();
        modal.remove();
        safeShowNotification('success', 'Removed', `Image #${index + 1} removed`);
        if (queue.length > 0) {
          setTimeout(() => showQueueViewer(), 100);
        }
      }
    };
    
    imageCard.appendChild(img);
    imageCard.appendChild(badge);
    imageCard.appendChild(removeBtn);
    content.appendChild(imageCard);
  });
  
  // Footer with clear all button
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 15px 20px;
    border-top: 1px solid #30363d;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  `;
  
  const clearAllBtn = document.createElement('button');
  clearAllBtn.textContent = 'Clear All';
  clearAllBtn.style.cssText = `
    padding: 8px 16px;
    background: #da3633;
    border: 1px solid #f85149;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `;
  clearAllBtn.onmouseover = () => {
    clearAllBtn.style.background = '#f85149';
  };
  clearAllBtn.onmouseout = () => {
    clearAllBtn.style.background = '#da3633';
  };
  clearAllBtn.onclick = () => {
    queue.length = 0;
    updateCaptureBadge();
    modal.remove();
    safeShowNotification('success', 'Cleared', 'All images removed');
  };
  
  const analyzeBtn = document.createElement('button');
  analyzeBtn.textContent = 'Analyze All';
  analyzeBtn.style.cssText = `
    padding: 8px 16px;
    background: #238636;
    border: 1px solid #2ea043;
    border-radius: 6px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `;
  analyzeBtn.onmouseover = () => {
    analyzeBtn.style.background = '#2ea043';
  };
  analyzeBtn.onmouseout = () => {
    analyzeBtn.style.background = '#238636';
  };
  analyzeBtn.onclick = () => {
    modal.remove();
    showContextDialog();
  };
  
  footer.appendChild(clearAllBtn);
  footer.appendChild(analyzeBtn);
  
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Close on escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ============================================================================
// CAMERA OPERATIONS
// ============================================================================

async function startCamera(videoElement: HTMLVideoElement): Promise<void> {
  try {
    stopCurrentStream();
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(d => d.kind === 'videoinput');
    
    const rearCamera = cameras.find(cam => 
      cam.label.toLowerCase().includes('rear') || 
      cam.label.toLowerCase().includes('back')
    ) || cameras[1];
    
    if (rearCamera) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: rearCamera.deviceId } },
          audio: false
        });
        currentStream = stream;
        currentFacingMode = 'environment';
        videoElement.srcObject = stream;
        safeShowNotification('success', 'Camera', 'Started rear camera');
        return;
      } catch (error) {
        console.error('Failed to start rear camera:', error);
      }
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    currentStream = stream;
    currentFacingMode = 'user';
    videoElement.srcObject = stream;
    
  } catch (error) {
    safeShowNotification('error', 'Camera Error', `Could not access camera: ${(error as Error).message}`);
  }
}

async function startScreenCapture(video: HTMLVideoElement): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: currentScreenSource === 'window' ? 'window' : 'monitor', cursor: 'always' },
      audio: false
    });
    
    currentStream = stream;
    video.srcObject = stream;
    
    stream.getVideoTracks()[0].onended = () => {
      currentMode = 'camera';
      startCamera(video);
    };
    
    safeShowNotification('success', 'Screen Capture', 'Screen capture started');
  } catch (error) {
    safeShowNotification('error', 'Screen Capture', 'Failed to capture screen');
    throw error;
  }
}

function takeScreenshot(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement, selectionCanvasElement?: HTMLCanvasElement): string | null {
  if (!videoElement.srcObject || videoElement.readyState < 2) {
    safeShowNotification('warning', 'Capture', 'Video is not ready yet');
    return null;
  }
  
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return null;
  
  // Debug logging
  console.log('📸 takeScreenshot called');
  console.log('   hasSelection:', hasSelection);
  console.log('   selectionStart:', selectionStart);
  console.log('   selectionEnd:', selectionEnd);
  console.log('   selectionCanvasElement:', !!selectionCanvasElement);
  
  // Check if there's a region selection
  if (hasSelection && selectionStart && selectionEnd && selectionCanvasElement) {
    console.log('✅ Using region selection for capture');
    
    // Calculate selection coordinates relative to video dimensions
    const canvasRect = selectionCanvasElement.getBoundingClientRect();
    const videoWidth = videoElement.videoWidth || 640;
    const videoHeight = videoElement.videoHeight || 480;
    
    console.log('   Canvas rect:', canvasRect.width, 'x', canvasRect.height);
    console.log('   Video size:', videoWidth, 'x', videoHeight);
    
    const scaleX = videoWidth / canvasRect.width;
    const scaleY = videoHeight / canvasRect.height;
    
    const x = Math.min(selectionStart.x, selectionEnd.x) * scaleX;
    const y = Math.min(selectionStart.y, selectionEnd.y) * scaleY;
    const width = Math.abs(selectionEnd.x - selectionStart.x) * scaleX;
    const height = Math.abs(selectionEnd.y - selectionStart.y) * scaleY;
    
    console.log('   Crop region:', {x, y, width, height});
    
    // Set canvas to crop size
    canvasElement.width = Math.round(width);
    canvasElement.height = Math.round(height);
    
    // Draw only the selected region
    ctx.drawImage(
      videoElement,
      Math.round(x), Math.round(y), Math.round(width), Math.round(height),
      0, 0, Math.round(width), Math.round(height)
    );
    
    const imageData = canvasElement.toDataURL('image/png');
    safeShowNotification('success', 'Capture', `Region captured (${Math.round(width)}×${Math.round(height)})`);
    
    // Clear selection after capture
    if (selectionCanvasElement) {
      clearSelection(selectionCanvasElement);
    }
    
    console.log('✅ Region capture complete');
    return imageData;
  }
  
  // Normal full capture
  console.log('📸 Using full frame capture');
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
  
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  
  const imageData = canvasElement.toDataURL('image/png');
  
  safeShowNotification('success', 'Capture', `${currentMode === 'camera' ? 'Camera screenshot' : 'Screen capture'} taken`);
  
  return imageData;
}

async function switchCamera(video: HTMLVideoElement, switchBtn: HTMLButtonElement): Promise<void> {
  // ✅ FIX: Better feedback when not in camera mode
  if (currentMode !== 'camera') {
    console.log('⚠️ Cannot switch camera - currently in', currentMode, 'mode');
    safeShowNotification('info', 'Switch Camera', 'Switch only works in Camera mode');
    return;
  }
  
  try {
    console.log('🔄 Starting camera switch...');
    showButtonLoading(switchBtn, 'Switch');
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    
    console.log('📷 Detected cameras:', cameras.length);
    
    if (cameras.length <= 1) {
      console.log('ℹ️ Only one camera available');
      safeShowNotification('info', 'Camera', 'Only one camera detected');
      hideButtonLoading(switchBtn, 'Switch', false);
      return;
    }
    
    let nextCamera;
    if (currentFacingMode === 'user') {
      nextCamera = cameras.find(cam => 
        cam.label.toLowerCase().includes('rear') || cam.label.toLowerCase().includes('back')
      ) || cameras[1];
      currentFacingMode = 'environment';
    } else {
      nextCamera = cameras.find(cam => 
        cam.label.toLowerCase().includes('front') || cam.label.toLowerCase().includes('user')
      ) || cameras[0];
      currentFacingMode = 'user';
    }
    
    if (nextCamera) {
      console.log('🔄 Switching to camera:', nextCamera.label);
      stopCurrentStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCamera.deviceId } },
        audio: false
      });
      currentStream = stream;
      video.srcObject = stream;
      console.log('✅ Camera switched successfully');
      safeShowNotification('success', 'Camera', `Switched to ${currentFacingMode === 'user' ? 'front' : 'rear'} camera`);
    }
    
  } catch (error: any) {
    console.error('❌ Camera switch failed:', error);
    safeShowNotification('error', 'Camera Switch', error.message || 'Failed to switch camera');
  } finally {
    hideButtonLoading(switchBtn, 'Switch', false);
  }
}

// ============================================================================
// MINIMIZE/MAXIMIZE
// ============================================================================

function toggleMinimize(): void {
  if (!cameraPanel) return;
  
  isMinimized = !isMinimized;
  
  const mainContent = cameraPanel.querySelector('div[style*="display: flex"]') as HTMLElement;
  const videoSection = cameraPanel.querySelector('.video-section') as HTMLElement;
  const controlsPanel = cameraPanel.querySelector('.controls-panel') as HTMLElement;
  const headerLeft = cameraPanel.querySelector('.dev-camera-header > div') as HTMLElement;
  const providerBadge = cameraPanel.querySelector('.provider-badge') as HTMLElement;
  
  if (isMinimized) {
    // Completely remove video section from layout
    if (videoSection) {
      videoSection.style.display = 'none';
      videoSection.style.width = '0';
      videoSection.style.flex = '0';
    }
    
    // Hide title elements in headerLeft
    if (headerLeft) {
      headerLeft.style.display = 'none';
    }
    if (providerBadge) providerBadge.style.display = 'none';
    
    // Make header vertical for stacked buttons
    const header = cameraPanel.querySelector('.dev-camera-header') as HTMLElement;
    const headerRight = cameraPanel.querySelectorAll('.dev-camera-header > div')[1] as HTMLElement;
    if (header) {
      header.style.flexDirection = 'column';
      header.style.padding = '4px';
      header.style.gap = '4px';
    }
    if (headerRight) {
      headerRight.style.flexDirection = 'column';
      headerRight.style.gap = '4px';
    }
    
    // Make controls panel very compact and standalone
    if (controlsPanel) {
      controlsPanel.style.display = 'flex';
      controlsPanel.style.width = '48px';
      controlsPanel.style.padding = '4px 0';
      controlsPanel.style.borderLeft = 'none';
      
      // Compact all sections
      const sections = controlsPanel.querySelectorAll('div[style*="padding"]');
      sections.forEach((section: Element) => {
        const htmlSection = section as HTMLElement;
        if (!htmlSection.classList.contains('side-button-primary') && 
            !htmlSection.classList.contains('side-button-secondary') &&
            !htmlSection.classList.contains('side-button-ai')) {
          htmlSection.style.padding = '4px 0';
          htmlSection.style.gap = '2px';
        }
      });
      
      // Compact button containers
      const buttonContainers = controlsPanel.querySelectorAll('div[style*="gap: 5px"]');
      buttonContainers.forEach((container: Element) => {
        (container as HTMLElement).style.gap = '2px';
      });
      
      // Hide ONLY text spans, keep SVG visible
      const allSpans = controlsPanel.querySelectorAll('span');
      allSpans.forEach((span: Element) => {
        (span as HTMLElement).style.display = 'none';
      });
      
      // Hide section labels (CONTROLS, AI ACTIONS, etc.)
      const labels = controlsPanel.querySelectorAll('div[style*="text-transform: uppercase"]');
      labels.forEach((label: Element) => {
        (label as HTMLElement).style.display = 'none';
      });
      
      // Make buttons icon-only (centered) and add tooltips
      const buttons = controlsPanel.querySelectorAll('button');
      buttons.forEach((btn: Element) => {
        const htmlBtn = btn as HTMLElement;
        htmlBtn.style.justifyContent = 'center';
        htmlBtn.style.padding = '8px';
        htmlBtn.style.minWidth = '40px';
        htmlBtn.style.minHeight = '40px';
        htmlBtn.style.margin = '0';
        htmlBtn.style.position = 'relative';
        
        // Get button text for tooltip
        const span = htmlBtn.querySelector('span');
        const buttonText = span ? span.textContent : '';
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'button-tooltip';
        tooltip.textContent = buttonText || '';
        tooltip.style.cssText = `
          position: absolute;
          left: 52px;
          top: 50%;
          transform: translateY(-50%);
          background: #1c2128;
          color: #c9d1d9;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 1000;
          border: 1px solid #30363d;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        `;
        
        htmlBtn.appendChild(tooltip);
        
        // Show tooltip on hover
        htmlBtn.addEventListener('mouseenter', () => {
          tooltip.style.opacity = '1';
        });
        
        htmlBtn.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });
        
        // Ensure SVG is visible
        const svg = htmlBtn.querySelector('svg');
        if (svg) {
          (svg as SVGElement).style.display = 'block';
        }
      });
    }
    
    // Compact panel size - no extra space
    cameraPanel.style.width = '48px';
    cameraPanel.style.minWidth = '48px';
    
  } else {
    // Restore video section
    if (videoSection) {
      videoSection.style.display = 'flex';
      videoSection.style.width = '';
      videoSection.style.flex = '1';
    }
    
    // Restore header to horizontal layout
    const header = cameraPanel.querySelector('.dev-camera-header') as HTMLElement;
    const headerRight = cameraPanel.querySelectorAll('.dev-camera-header > div')[1] as HTMLElement;
    if (header) {
      header.style.flexDirection = 'row';
      header.style.padding = '8px 12px';
      header.style.gap = '';
    }
    if (headerRight) {
      headerRight.style.flexDirection = 'row';
      headerRight.style.gap = '4px';
    }
    
    // Restore header title elements
    if (headerLeft) {
      headerLeft.style.display = 'flex';
    }
    if (providerBadge) providerBadge.style.display = 'block';
    
    // Restore controls panel
    if (controlsPanel) {
      controlsPanel.style.display = 'flex';
      controlsPanel.style.width = '185px';
      controlsPanel.style.padding = '';
      controlsPanel.style.borderLeft = '1px solid #21262d';
      
      // Restore section padding
      const sections = controlsPanel.querySelectorAll('div[style*="padding"]');
      sections.forEach((section: Element) => {
        const htmlSection = section as HTMLElement;
        if (!htmlSection.classList.contains('side-button-primary') && 
            !htmlSection.classList.contains('side-button-secondary') &&
            !htmlSection.classList.contains('side-button-ai')) {
          htmlSection.style.padding = '';
          htmlSection.style.gap = '';
        }
      });
      
      // Restore button container gaps
      const buttonContainers = controlsPanel.querySelectorAll('div[style*="gap"]');
      buttonContainers.forEach((container: Element) => {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.style.gap === '2px') {
          htmlContainer.style.gap = '5px';
        }
      });
      
      // Show all spans
      const allSpans = controlsPanel.querySelectorAll('span');
      allSpans.forEach((span: Element) => {
        (span as HTMLElement).style.display = 'inline';
      });
      
      // Show section labels
      const labels = controlsPanel.querySelectorAll('div[style*="text-transform: uppercase"]');
      labels.forEach((label: Element) => {
        (label as HTMLElement).style.display = 'block';
      });
      
      // Restore button layout and remove tooltips
      const buttons = controlsPanel.querySelectorAll('button');
      buttons.forEach((btn: Element) => {
        const htmlBtn = btn as HTMLElement;
        htmlBtn.style.justifyContent = 'flex-start';
        htmlBtn.style.padding = '7px 10px';
        htmlBtn.style.minWidth = '';
        htmlBtn.style.minHeight = '';
        htmlBtn.style.position = '';
        htmlBtn.style.margin = '';
        
        // Remove tooltip
        const tooltip = htmlBtn.querySelector('.button-tooltip');
        if (tooltip) {
          tooltip.remove();
        }
      });
    }
    
    // Restore panel size
    cameraPanel.style.width = `${panelSize.width}px`;
    cameraPanel.style.minWidth = '400px';
    
    // ✅ FIX: Update capture badge after maximizing
    updateCaptureBadge();
  }
  
  try {
    localStorage.setItem('camera_panel_minimized', isMinimized.toString());
  } catch (error) {
    console.warn('Failed to save minimize state:', error);
  }
}

// ============================================================================
// REGION SELECTION FUNCTIONS
// ============================================================================

function startRegionSelection(videoElement: HTMLVideoElement, selectionCanvas: HTMLCanvasElement): void {
  isSelectingRegion = true;
  hasSelection = false;
  selectionStart = null;
  selectionEnd = null;
  
  selectionCanvas.style.display = 'block';
  selectionCanvas.style.pointerEvents = 'auto';
  selectionCanvas.style.cursor = 'crosshair';
  
  // Set canvas size to match video display
  const rect = videoElement.getBoundingClientRect();
  selectionCanvas.width = rect.width;
  selectionCanvas.height = rect.height;
  
  console.log('✅ Region selection mode activated');
  safeShowNotification('info', 'Selection Mode', 'Click and drag to select region');
}

function stopRegionSelection(selectionCanvas: HTMLCanvasElement): void {
  isSelectingRegion = false;
  selectionCanvas.style.pointerEvents = 'none';
  selectionCanvas.style.cursor = 'default';
  
  console.log('❌ Region selection mode deactivated');
}

function clearSelection(selectionCanvas: HTMLCanvasElement): void {
  hasSelection = false;
  selectionStart = null;
  selectionEnd = null;
  
  const ctx = selectionCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  }
  
  stopRegionSelection(selectionCanvas);
  selectionCanvas.style.display = 'none';
}

function drawSelection(selectionCanvas: HTMLCanvasElement): void {
  if (!selectionStart || !selectionEnd) return;
  
  const ctx = selectionCanvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  
  const x = Math.min(selectionStart.x, selectionEnd.x);
  const y = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);
  
  // Darken outside selection
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  
  // Clear selection area
  ctx.clearRect(x, y, width, height);
  
  // Draw selection border
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, width, height);
  
  // Draw corner handles
  const handleSize = 8;
  ctx.fillStyle = '#58a6ff';
  ctx.setLineDash([]);
  
  // Top-left
  ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
  // Top-right
  ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
  // Bottom-left
  ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
  // Bottom-right
  ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
  
  // Draw dimensions
  ctx.fillStyle = '#58a6ff';
  ctx.font = '12px monospace';
  ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + 5, y - 10);
}

function initializeSelectionEvents(viewArea: HTMLElement, videoElement: HTMLVideoElement, selectionCanvas: HTMLCanvasElement): void {
  let isDraggingSelection = false;
  
  viewArea.addEventListener('mousedown', (e) => {
    if (!isSelectingRegion) return;
    
    const rect = selectionCanvas.getBoundingClientRect();
    selectionStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    selectionEnd = { ...selectionStart };
    isDraggingSelection = true;
    hasSelection = false;
  });
  
  viewArea.addEventListener('mousemove', (e) => {
    if (!isSelectingRegion || !isDraggingSelection || !selectionStart) return;
    
    const rect = selectionCanvas.getBoundingClientRect();
    selectionEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    drawSelection(selectionCanvas);
  });
  
  viewArea.addEventListener('mouseup', (e) => {
    if (!isSelectingRegion || !isDraggingSelection) return;
    
    isDraggingSelection = false;
    
    if (selectionStart && selectionEnd) {
      const width = Math.abs(selectionEnd.x - selectionStart.x);
      const height = Math.abs(selectionEnd.y - selectionStart.y);
      
      console.log('🖱️ Selection complete:', {
        start: selectionStart,
        end: selectionEnd,
        width,
        height
      });
      
      if (width > 10 && height > 10) {
        hasSelection = true;
        stopRegionSelection(selectionCanvas);
        console.log('✅ Valid selection created. hasSelection =', hasSelection);
        safeShowNotification('success', 'Region Selected', 'Click Capture or Analyze to use selection');
      } else {
        clearSelection(selectionCanvas);
        safeShowNotification('warning', 'Selection Too Small', 'Draw a larger selection area');
      }
    }
  });
  
  // Cancel on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSelectingRegion) {
      clearSelection(selectionCanvas);
      safeShowNotification('info', 'Selection Cancelled', '');
    }
  });
}

// ============================================================================
// PANEL INITIALIZATION
// ============================================================================

export function initializeCameraPanel(): boolean {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('Camera API not supported');
    return false;
  }
  
  try {
    // Auto Mode is always ON
    autoModeEnabled = true;
    panelPosition = loadPanelPosition();
    panelSize = loadPanelSize();
    
    try {
      const minimized = localStorage.getItem('camera_panel_minimized');
      isMinimized = minimized === 'true';
    } catch {
      isMinimized = false;
    }
    
    return true;
  } catch (error) {
    console.error('Error during camera panel initialization:', error);
    return false;
  }
}

export function toggleCameraPanel(): boolean {
  const now = Date.now();
  
  console.log(`📷 toggleCameraPanel called at ${now}`);
  console.log(`  📷 Current state: cameraEnabled=${cameraEnabled}, cameraLocked=${cameraLocked}`);
  console.log(`  📷 justOpenedTimestamp=${justOpenedTimestamp}, elapsed=${now - justOpenedTimestamp}ms`);
  
  // ✅ FIX: Ignore toggle if camera is locked (just opened)
  if (cameraLocked) {
    console.log('📷 Toggle BLOCKED - camera is locked (recently opened)');
    return cameraEnabled;
  }
  
  // ✅ FIX: Ignore toggle if within cooldown period
  if (justOpenedTimestamp > 0 && (now - justOpenedTimestamp) < TOGGLE_COOLDOWN_MS) {
    console.log(`📷 Toggle BLOCKED - cooldown active (${TOGGLE_COOLDOWN_MS - (now - justOpenedTimestamp)}ms remaining)`);
    return cameraEnabled;
  }
  
  const existingPanel = document.querySelector('.camera-panel');
  console.log(`  📷 existingPanel found: ${!!existingPanel}`);
  
  if (existingPanel) {
    // Close panel - only if explicitly requested (not during cooldown)
    console.log('📷 Closing camera panel...');
    stopCurrentStream();
    stopApiMonitoring(); // ✅ Stop API monitoring
    
    // ✅ Cleanup style observer if exists
    if ((existingPanel as any).__styleObserver) {
      (existingPanel as any).__styleObserver.disconnect();
    }
    
    existingPanel.remove();
    cameraPanel = null;
    cameraEnabled = false;
    justOpenedTimestamp = 0;
    cameraLocked = false;
    document.dispatchEvent(new CustomEvent('camera-panel-closed'));
    // ✅ Update status bar
    updateStatusBarCamera(false);
    // ✅ Sync toolbar camera button state to OFF
    if (typeof (window as any).syncCameraButtonState === 'function') {
      (window as any).syncCameraButtonState(false);
      console.log('📷 Camera button synced to OFF');
    }
    console.log('📷 Camera panel CLOSED');
  } else {
    // Open panel
    try {
      console.log('📷 Opening camera panel...');
      justOpenedTimestamp = now; // Set BEFORE creating
      cameraLocked = true; // Lock while opening
      createCameraPanel();
      cameraEnabled = true;
      // ✅ Update status bar
      updateStatusBarCamera(true);
      // ✅ Sync toolbar camera button state to ON
      if (typeof (window as any).syncCameraButtonState === 'function') {
        (window as any).syncCameraButtonState(true);
        console.log('📷 Camera button synced to ON');
      }
      console.log('📷 Camera panel OPENED');
      
      // ✅ Unlock after a safe delay
      setTimeout(() => {
        cameraLocked = false;
        console.log('📷 Camera unlocked - now accepting toggle requests');
      }, TOGGLE_COOLDOWN_MS);
    } catch (error) {
      console.error('Error creating camera panel:', error);
      cameraEnabled = false;
      justOpenedTimestamp = 0;
      cameraLocked = false;
      return false;
    }
  }
  
  return cameraEnabled;
}

// ✅ Helper function to update status bar camera indicator
function updateStatusBarCamera(isEnabled: boolean): void {
  const cameraStatusItem = document.getElementById('status-camera');
  if (cameraStatusItem) {
    cameraStatusItem.textContent = isEnabled ? '📷 Camera: On' : '📷 Camera: Off';
    console.log(`📷 Status bar updated: Camera ${isEnabled ? 'On' : 'Off'}`);
  }
}
// ============================================================================
// CREATE CAMERA PANEL - COMPLETE IMPLEMENTATION
// ============================================================================

function createCameraPanel(): HTMLElement | null {
  console.log('Creating camera panel...');
  
  if (!initializeCameraPanel()) {
    safeShowNotification('error', 'Camera Error', 'Camera API is not supported');
    return null;
  }
  
  const existingPanel = document.querySelector('.camera-panel');
  if (existingPanel) existingPanel.remove();
  
  injectDeveloperCameraStyles();
  injectCameraStyles();
  
  currentFacingMode = 'environment';
  
  // Main panel
  cameraPanel = document.createElement('div');
  cameraPanel.className = 'camera-panel dev-camera-panel';
  cameraPanel.style.cssText = `
    position: absolute;
    left: ${panelPosition.x}px;
    top: ${panelPosition.y === 0 ? 60 : panelPosition.y}px;
    width: ${panelSize.width}px;
    height: ${panelSize.height}px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 12px;
    z-index: 1000;
    font-family: 'SF Mono', Monaco, Consolas, monospace;
    color: #c9d1d9;
    box-shadow: 0 16px 70px rgba(0, 0, 0, 0.8);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 120px;
    max-width: 1200px;
    min-height: 100px;
    max-height: 900px;
  `;
  
  // Header
  const header = document.createElement('div');
  header.className = 'dev-camera-header drag-handle';
  header.style.cssText = `
    background: #161b22;
    border-bottom: 1px solid #21262d;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
    user-select: none;
    min-height: 40px;
  `;
  
  // Header Left - Title, version, and API badge (compact inline)
  const headerLeft = document.createElement('div');
  headerLeft.className = 'header-left';
  headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
  
  // Camera icon
  const cameraIcon = document.createElement('div');
  cameraIcon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  `;
  cameraIcon.style.cssText = 'display: flex; align-items: center;';
  
  // Title with version inline
  const titleText = document.createElement('div');
  titleText.style.cssText = 'display: flex; align-items: center; gap: 6px;';
  titleText.innerHTML = `
    <span style="font-size: 13px; font-weight: 600; color: #c9d1d9;">camera.capture</span>
    <span style="font-size: 9px; color: #6e7681;">v2.4.0</span>
  `;
  
  // Status indicator
  const statusDot = document.createElement('div');
  statusDot.style.cssText = `
    width: 6px;
    height: 6px;
    background: #3fb950;
    border-radius: 50%;
    animation: statusPulse 2s infinite;
  `;
  
  // API Provider badge (compact) - shows current API and vision capability
  const providerBadge = document.createElement('div');
  providerBadge.className = 'provider-badge';
  providerBadge.id = 'camera-provider-badge';
  
  // Get current provider info
  const currentProvider = getApiProvider();
  const visionSupported = isVisionCapable();
  const apiKeyConfigured = hasApiKey();
  const isFullyReady = visionSupported && apiKeyConfigured;
  const needsApiKey = visionSupported && !apiKeyConfigured;
  
  // Determine badge color based on state
  let badgeBg, badgeBorder, badgeColor, badgeTitle;
  if (!visionSupported) {
    // Red - Vision not supported
    badgeBg = 'rgba(248, 81, 73, 0.1)';
    badgeBorder = 'rgba(248, 81, 73, 0.25)';
    badgeColor = '#f85149';
    badgeTitle = `${currentProvider} - Vision NOT supported ✗`;
  } else if (needsApiKey) {
    // Yellow - Vision supported but no API key
    badgeBg = 'rgba(255, 193, 7, 0.1)';
    badgeBorder = 'rgba(255, 193, 7, 0.25)';
    badgeColor = '#ffc107';
    badgeTitle = `${currentProvider} - API key not configured ⚠`;
  } else {
    // Blue - Fully ready
    badgeBg = 'rgba(88, 166, 255, 0.1)';
    badgeBorder = 'rgba(88, 166, 255, 0.25)';
    badgeColor = '#58a6ff';
    badgeTitle = `${currentProvider} - Vision supported ✓`;
  }
  
  providerBadge.style.cssText = `
    padding: 2px 6px;
    background: ${badgeBg};
    border: 1px solid ${badgeBorder};
    border-radius: 3px;
    font-size: 8px;
    color: ${badgeColor};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  providerBadge.textContent = currentProvider.toUpperCase();
  providerBadge.title = badgeTitle;
  
  // Click to show API info or change
  providerBadge.addEventListener('click', () => {
    if (!isVisionCapable()) {
      showVisionNotSupportedDialog();
    } else if (!hasApiKey()) {
      showApiKeyNotConfiguredDialog();
    } else {
      safeShowNotification('info', 'API Provider', `Using ${getApiProvider()} - Vision supported ✓`);
    }
  });
  
  // Start real-time API monitoring
  startApiMonitoring();
  
  headerLeft.appendChild(cameraIcon);
  headerLeft.appendChild(titleText);
  headerLeft.appendChild(statusDot);
  headerLeft.appendChild(providerBadge);
  
  // Header Right - Control buttons (minimize, close)
  const headerRight = document.createElement('div');
  headerRight.style.cssText = 'display: flex; align-items: center; gap: 4px;';
  
  const minimizeBtn = createIconButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `, 'Minimize');
  
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMinimize();
  });
  
  const closeBtn = createIconButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `, 'Close');
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (cameraPanel) {
      stopCurrentStream();
      stopApiMonitoring(); // ✅ Stop API monitoring
      cameraPanel.remove();
      cameraPanel = null;
      cameraEnabled = false;
      clearQueue();
      // ✅ Update status bar when closing via X button
      updateStatusBarCamera(false);
      // ✅ Sync toolbar camera button state to OFF
      if (typeof (window as any).syncCameraButtonState === 'function') {
        (window as any).syncCameraButtonState(false);
        console.log('📷 Camera button synced to OFF');
      }
    }
  });
  
  headerRight.appendChild(minimizeBtn);
  headerRight.appendChild(closeBtn);
  
  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  
  // Main content
  const mainContent = document.createElement('div');
  mainContent.style.cssText = 'display: flex; flex: 1; overflow: hidden;';
  
  // Video section
  const videoSection = document.createElement('div');
  videoSection.className = 'video-section';
  videoSection.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #010409;
    position: relative;
    min-width: 0;
  `;
  
  const previewLabel = document.createElement('div');
  previewLabel.style.cssText = `
    padding: 12px 16px;
    font-size: 11px;
    color: #8b949e;
    text-transform: uppercase;
    background: #0d1117;
    border-bottom: 1px solid #21262d;
    display: flex;
    justify-content: space-between;
  `;
  previewLabel.innerHTML = `
    <span>Video Preview</span>
    <span id="preview-resolution" style="font-size: 10px; color: #58a6ff;">640×480</span>
  `;
  
  const viewArea = document.createElement('div');
  viewArea.className = 'dev-view-area';
  viewArea.style.cssText = `
    flex: 1;
    background: #000;
    position: relative;
    overflow: hidden;
  `;
  
  // Status overlay
  const statusOverlay = document.createElement('div');
  statusOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 10px 12px;
    background: linear-gradient(180deg, rgba(1, 4, 9, 0.9) 0%, transparent 100%);
    display: flex;
    justify-content: space-between;
    z-index: 10;
    pointer-events: none;
  `;
  
  const statusLeft = document.createElement('div');
  statusLeft.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; color: #3fb950; font-weight: 600;">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="#3fb950"><circle cx="12" cy="12" r="10"></circle></svg>
      LIVE
    </div>
  `;
  
  const statusRight = document.createElement('div');
  statusRight.innerHTML = `
    <div id="dev-auto-indicator" style="display: ${autoModeEnabled ? 'flex' : 'none'}; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(63, 185, 80, 0.15); border: 1px solid rgba(63, 185, 80, 0.3); border-radius: 4px; font-size: 10px; color: #3fb950; font-weight: 600;">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      AUTO
    </div>
  `;
  
  statusOverlay.appendChild(statusLeft);
  statusOverlay.appendChild(statusRight);
  
  // Video element
  const video = document.createElement('video');
  video.className = 'camera-video';
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  `;
  
  // Canvas for screenshots
  const canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  
  // ✅ REGION SELECTION - Overlay canvas for drawing selection rectangle
  const selectionCanvas = document.createElement('canvas');
  selectionCanvas.className = 'selection-canvas';
  selectionCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 15;
    display: none;
  `;
  
  // Screen options (hidden by default)
  const screenOptions = document.createElement('div');
  screenOptions.className = 'screen-options';
  screenOptions.style.cssText = `
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(1, 4, 9, 0.95);
    padding: 20px;
    z-index: 5;
  `;
  
  viewArea.appendChild(video);
  viewArea.appendChild(statusOverlay);
  viewArea.appendChild(screenOptions);
  viewArea.appendChild(canvas);
  viewArea.appendChild(selectionCanvas);
  
  videoSection.appendChild(previewLabel);
  videoSection.appendChild(viewArea);
  
  // Controls panel
  const controlsPanel = document.createElement('div');
  controlsPanel.className = 'controls-panel';
  controlsPanel.style.cssText = `
    width: 185px;
    background: #0d1117;
    border-left: 1px solid #21262d;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
  `;
  
 // Mode toggle button - Merged Camera/Screen
const modeSection = document.createElement('div');
modeSection.style.cssText = 'padding: 10px; border-bottom: 1px solid #21262d;';

const modeToggle = createSimpleMergedModeToggle(currentMode);

modeToggle.addEventListener('click', async () => {
  // Toggle between camera and screen
  if (currentMode === 'camera') {
    currentMode = 'screen';
    await startScreenCapture(video);
  } else {
    currentMode = 'camera';
    await startCamera(video);
  }
  
  // Update button to show new mode
  updateSimpleMergedModeToggle(modeToggle, currentMode);
  
  console.log(`✅ Switched to ${currentMode} mode`);
});

modeSection.appendChild(modeToggle);

  // Auto Mode is always ON - no toggle needed
  
  // ✅ FIX 1: Controls with Capture as 'secondary' (gray)
  const controlsSection = document.createElement('div');
  controlsSection.style.cssText = 'padding: 10px; border-bottom: 1px solid #21262d;';
  
  const controlsLabel = document.createElement('div');
  controlsLabel.style.cssText = `
    font-size: 9px;
    color: #6e7681;
    text-transform: uppercase;
    margin-bottom: 6px;
    font-weight: 700;
  `;
  controlsLabel.textContent = 'CONTROLS';
  
  const switchBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  `, 'Switch', 'secondary');
  
  // ✅ FIX: Ensure Switch button is always clickable
  (switchBtn as HTMLButtonElement).disabled = false;
  switchBtn.style.pointerEvents = 'auto';
  switchBtn.style.cursor = 'pointer';
  
  switchBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Switch button clicked - Mode:', currentMode);
    await switchCamera(video, switchBtn as HTMLButtonElement);
  });
  
  // ✅ SELECT REGION BUTTON
  const selectRegionBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <path d="M9 3v18"></path>
      <path d="M15 3v18"></path>
      <path d="M3 9h18"></path>
      <path d="M3 15h18"></path>
    </svg>
  `, 'Select', 'secondary');
  
  selectRegionBtn.title = 'Select region to capture';
  (selectRegionBtn as HTMLButtonElement).disabled = false;
  selectRegionBtn.style.pointerEvents = 'auto';
  selectRegionBtn.style.cursor = 'pointer';
  
  selectRegionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSelectingRegion) {
      // Cancel selection
      clearSelection(selectionCanvas);
      (selectRegionBtn as HTMLElement).style.background = '#21262d';
      (selectRegionBtn as HTMLElement).style.borderColor = '#30363d';
    } else {
      // Start selection
      startRegionSelection(video, selectionCanvas);
      (selectRegionBtn as HTMLElement).style.background = 'rgba(88, 166, 255, 0.1)';
      (selectRegionBtn as HTMLElement).style.borderColor = '#58a6ff';
    }
  });
  
  // ✅ FIX 1: Changed from 'primary' to 'secondary' to make it gray
  // ✅ CAPTURE BADGE: Added badge support (4th parameter = true)
  const captureBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `, 'Capture', 'secondary', true);
  
  // ✅ CAPTURE BADGE: Enhanced click handler with logging and queue management
  captureBtn.addEventListener('click', () => {
    console.log('🎯 Capture button clicked!');
    
    // Check queue size first
    const queueLength = getQueueLength();
    console.log('📊 Current queue length:', queueLength);
    
    if (queueLength >= MAX_QUEUE_SIZE) {
      console.log('⚠️ Queue is full!');
      safeShowNotification('warning', 'Queue Full', 
        `Maximum ${MAX_QUEUE_SIZE} images reached. Click the badge or analyze first.`);
      return;
    }
    
    console.log('📸 Taking screenshot...');
    const imageData = takeScreenshot(video, canvas, selectionCanvas);
    
    if (imageData) {
      console.log('✅ Screenshot captured, adding to queue...');
      
      // Initialize queue if needed
      if (!(window as any).__cameraQueue) {
        (window as any).__cameraQueue = [];
      }
      
      // Add to internal queue first
      (window as any).__cameraQueue.push({ imageData, timestamp: new Date() });
      
      // Then add to external queue system
      addToQueue(imageData);
      
      // Update badge
      updateCaptureBadge();
      
      console.log('✅ Image added to queue successfully');
      safeShowNotification('success', 'Captured', `Image ${queueLength + 1}/${MAX_QUEUE_SIZE} added. Click badge to view.`);
    } else {
      console.log('❌ Screenshot failed - video not ready');
      safeShowNotification('warning', 'Capture Failed', 'Video is not ready yet. Please wait a moment.');
    }
  });
  
  // ✅ CLEAR BUTTON - Clear all captures directly
  const clearBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `, 'Clear', 'secondary', false);
  
  // Style as danger/red button
  clearBtn.style.cssText = `
    padding: 7px 10px;
    background: #21262d;
    border: 1px solid #da3633;
    border-radius: 5px;
    color: #f85149;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    display: none;
    align-items: center;
    gap: 7px;
    transition: all 0.12s ease;
    width: 100%;
  `;
  
  clearBtn.addEventListener('mouseenter', () => {
    if (!clearBtn.disabled) {
      clearBtn.style.background = '#da3633';
      clearBtn.style.borderColor = '#f85149';
      clearBtn.style.color = '#ffffff';
      clearBtn.style.transform = 'translateY(-1px)';
    }
  });
  
  clearBtn.addEventListener('mouseleave', () => {
    clearBtn.style.background = '#21262d';
    clearBtn.style.borderColor = '#da3633';
    clearBtn.style.color = '#f85149';
    clearBtn.style.transform = 'translateY(0)';
  });
  
  clearBtn.addEventListener('click', () => {
    const queueLength = getQueueLength();
    if (queueLength === 0) {
      safeShowNotification('info', 'Queue Empty', 'No images to clear');
      return;
    }
    
    // ⚡ INSTANT CLEAR - No confirmation dialog
    // 💡 To enable confirmation, uncomment the line below and remove the direct clear code
    // if (confirm(`Clear all ${queueLength} captured image${queueLength > 1 ? 's' : ''}?`)) {
    
    console.log('🗑️ Clearing all captures...');
    
    // Clear internal queue
    if ((window as any).__cameraQueue) {
      (window as any).__cameraQueue.length = 0;
    }
    
    // Clear external queue
    clearQueue();
    
    // Update badge and button visibility
    updateCaptureBadge();
    clearBtn.style.display = 'none';
    
    console.log('✅ All captures cleared');
    safeShowNotification('success', 'Cleared', 'All captures removed');
  });
  
  const controlButtons = document.createElement('div');
  controlButtons.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
  controlButtons.appendChild(switchBtn);
  controlButtons.appendChild(selectRegionBtn);
  controlButtons.appendChild(captureBtn);
  controlButtons.appendChild(clearBtn);
  controlsSection.appendChild(controlsLabel);
  controlsSection.appendChild(controlButtons);
  
  // AI Actions
  const aiSection = document.createElement('div');
  aiSection.style.cssText = 'padding: 10px; flex: 1;';
  
  const aiLabel = document.createElement('div');
  aiLabel.style.cssText = `
    font-size: 9px;
    color: #6e7681;
    text-transform: uppercase;
    margin-bottom: 6px;
    font-weight: 700;
  `;
  aiLabel.textContent = 'AI ACTIONS';
  
  const analyzeBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  `, 'Analyze', 'ai');
  
  // ✅ Add data-action for API monitoring
  analyzeBtn.dataset.action = 'analyze';
  
  // ✅ Set initial visual state based on vision capability and API key (but keep clickable)
  const initialVisionCapable = isVisionCapable();
  const initialApiKeyConfigured = hasApiKey();
  const initialFullyReady = initialVisionCapable && initialApiKeyConfigured;
  
  if (!initialVisionCapable) {
    analyzeBtn.style.opacity = '0.5';
    analyzeBtn.title = `${getApiProvider()} does not support vision. Click to learn more.`;
    analyzeBtn.classList.add('vision-disabled');
  } else if (!initialApiKeyConfigured) {
    analyzeBtn.style.opacity = '0.6';
    analyzeBtn.title = `API key not configured. Click to learn more.`;
    analyzeBtn.classList.add('api-key-missing');
  }
  
  // ✅ FIX 3: Analyze button - ALWAYS works in ANY mode (Auto or Manual)
  analyzeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔍 Analyze button clicked - Auto Mode:', autoModeEnabled, 'Queue:', getQueueLength());
    
    // ✅ Check vision capability first - show dialog if not supported
    if (!isVisionCapable()) {
      console.warn('⚠️ Provider not vision capable');
      showVisionNotSupportedDialog();
      return;
    }
    
    // ✅ Check API key - show different dialog if not configured
    if (!hasApiKey()) { 
      console.warn('⚠️ No API key configured');
      showApiKeyNotConfiguredDialog();
      return; 
    }
    
    const queueCount = getQueueLength();
    
    // If queue has images, show context dialog (works in both modes)
    if (queueCount > 0) {
      console.log('📋 Queue has', queueCount, 'images - showing context dialog');
      showContextDialog();
      return;
    }
    
    // No queue: Take screenshot immediately and analyze (works in both modes)
    console.log('📸 No queue - taking immediate screenshot for analysis');
    
    // Show loading state
    showButtonLoading(analyzeBtn as HTMLButtonElement, 'Analyze');
    if (!isMinimized) {
      showProcessingOverlay();
    }
    
    let analysisSuccess = false;
    
    try {
      // Take screenshot from current video frame
      const imageData = takeScreenshot(video, canvas, selectionCanvas);
      if (!imageData) {
        safeShowNotification('warning', 'Analyze', 'Video is not ready yet');
        hideButtonLoading(analyzeBtn as HTMLButtonElement, 'Analyze', false);
        if (!isMinimized) {
          hideProcessingOverlay();
        }
        return;

      }
      
      console.log('✅ Screenshot captured, starting analysis...');
      
      // ✅ FIXED: Analyze with relevance check - works in both Auto and Manual mode
      safeShowNotification('info', 'Analyzing', '🔍 Processing current frame...');
      const result = await analyzeImageWithRelevanceCheck(imageData);
      
      // Check if content is relevant for development
      if (!result.isRelevant) {
        console.log('⚠️ Content not relevant for development:', result.rejection.reason);
        if (!isMinimized) {
          hideProcessingOverlay();
        }
        showRelevanceWarningModal(result.rejection.reason, result.rejection.suggestedAction);
        hideButtonLoading(analyzeBtn as HTMLButtonElement, 'Analyze', false);
        return; // STOP - Don't analyze irrelevant content
      }
      
      console.log('✅ Analysis complete, displaying result...');
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      await displayResult('Development Analysis', result.data, imageData);
      analysisSuccess = true;
      
    } catch (error: any) {
      console.error('❌ Immediate analysis error:', error);
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      safeShowNotification('error', 'Analysis Failed', error.message || 'Unknown error');
    } finally {
      hideButtonLoading(analyzeBtn as HTMLButtonElement, 'Analyze', analysisSuccess);
    }
  });
  
  const ocrBtn = createSideButton(`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  `, 'OCR', 'ai');
  
  // ✅ Add data-action for API monitoring
  ocrBtn.dataset.action = 'ocr';
  
  // ✅ Set initial visual state based on vision capability and API key (but keep clickable)
  if (!initialVisionCapable) {
    ocrBtn.style.opacity = '0.5';
    ocrBtn.title = `${getApiProvider()} does not support vision. Click to learn more.`;
    ocrBtn.classList.add('vision-disabled');
  } else if (!initialApiKeyConfigured) {
    ocrBtn.style.opacity = '0.6';
    ocrBtn.title = `API key not configured. Click to learn more.`;
    ocrBtn.classList.add('api-key-missing');
  }
  
  ocrBtn.addEventListener('click', async () => {
    // ✅ Check vision capability first - show dialog if not supported
    if (!isVisionCapable()) {
      showVisionNotSupportedDialog();
      return;
    }
    
    // ✅ Check API key - show different dialog if not configured
    if (!hasApiKey()) { 
      showApiKeyNotConfiguredDialog();
      return; 
    }
    
    showButtonLoading(ocrBtn as HTMLButtonElement, 'OCR');
    if (!isMinimized) {
      showProcessingOverlay();
    }
    
    let ocrSuccess = false;
    
    try {
      const imageData = takeScreenshot(video, canvas, selectionCanvas);
       if (imageData) {
      const text = await extractTextFromImage(imageData);
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      if (text && text.trim()) {
        displayResult('OCR Results', text, imageData);
        ocrSuccess = true;
      }
    } else {
      if (!isMinimized) {
        hideProcessingOverlay();
      }
    }
 
    } catch (error: any) {
      if (!isMinimized) {
        hideProcessingOverlay();
      }
      safeShowNotification('error', 'Failed', error.message);
    } finally {
      hideButtonLoading(ocrBtn as HTMLButtonElement, 'OCR', ocrSuccess);
    }
  });
  
  
  const aiButtons = document.createElement('div');
  aiButtons.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
  aiButtons.appendChild(analyzeBtn);
  aiButtons.appendChild(ocrBtn);
  aiSection.appendChild(aiLabel);
  aiSection.appendChild(aiButtons);
  
  // Assemble controls panel
  controlsPanel.appendChild(modeSection);
  // Auto Mode section removed - always ON
  controlsPanel.appendChild(controlsSection);
  controlsPanel.appendChild(aiSection);
  
  // Assemble main content
  mainContent.appendChild(videoSection);
  mainContent.appendChild(controlsPanel);
  
  // Assemble panel
  cameraPanel.appendChild(header);
  cameraPanel.appendChild(mainContent);
  
  // Add to DOM
  document.body.appendChild(cameraPanel);
  
  // ============================================================================
  // ✅ CRITICAL: Protect camera panel styles from being overridden by other scripts
  // Some scripts (like professionalIcons) may try to style elements with "camera" in class name
  // ============================================================================
  const protectCameraPanelStyles = () => {
    if (!cameraPanel) return;
    
    // Remove any accidentally added classes that shrink the panel
    cameraPanel.classList.remove('tool-button');
    
    // Re-apply correct styles with !important to override any interference
    cameraPanel.style.setProperty('width', `${panelSize.width}px`, 'important');
    cameraPanel.style.setProperty('height', `${panelSize.height}px`, 'important');
    cameraPanel.style.setProperty('min-width', '120px', 'important');
    cameraPanel.style.setProperty('min-height', '100px', 'important');
    cameraPanel.style.setProperty('max-width', '1200px', 'important');
    cameraPanel.style.setProperty('max-height', '900px', 'important');
    cameraPanel.style.setProperty('background', '#0d1117', 'important');
    cameraPanel.style.setProperty('border', '1px solid #30363d', 'important');
    cameraPanel.style.setProperty('border-radius', '12px', 'important');
    cameraPanel.style.setProperty('display', 'flex', 'important');
    cameraPanel.style.setProperty('flex-direction', 'column', 'important');
    cameraPanel.style.setProperty('overflow', 'hidden', 'important');
    cameraPanel.style.setProperty('box-shadow', '0 16px 70px rgba(0, 0, 0, 0.8)', 'important');
  };
  
  // Initial protection
  protectCameraPanelStyles();
  
  // Watch for style changes and revert if needed
  const styleObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
        // Check if tool-button was added or if panel is too small
        if (cameraPanel?.classList.contains('tool-button') ||
            cameraPanel?.offsetWidth < 100 ||
            cameraPanel?.offsetHeight < 100) {
          console.log('📷 Panel styles were modified externally - restoring correct styles...');
          protectCameraPanelStyles();
        }
      }
    }
  });
  
  styleObserver.observe(cameraPanel, { 
    attributes: true, 
    attributeFilter: ['class', 'style'] 
  });
  
  // Store observer for cleanup when panel closes
  (cameraPanel as any).__styleObserver = styleObserver;
  
  // Also protect after delays (in case other scripts run after us)
  setTimeout(protectCameraPanelStyles, 100);
  setTimeout(protectCameraPanelStyles, 500);
  setTimeout(protectCameraPanelStyles, 1000);
  // ============================================================================
  
  // Initialize interactions
  initializeDragging(cameraPanel, header);
  initializeResizing(cameraPanel);
  
  // Start camera
  console.log('Starting camera...');
  startCamera(video).catch(error => {
    console.error('Failed to start camera:', error);
    safeShowNotification('error', 'Camera', 'Failed to start camera');
  });
  
  // Update resolution display
  video.addEventListener('loadedmetadata', () => {
    const resolutionEl = document.getElementById('preview-resolution');
    if (resolutionEl) {
      resolutionEl.textContent = `${video.videoWidth}×${video.videoHeight}`;
    }
  });
  
  // Update button states
  updateButtonStates();
  
  // ✅ CRITICAL: Final check - ensure Analyze button is always enabled
  setTimeout(() => {
    const buttons = cameraPanel?.querySelectorAll('.side-button-ai');
    const analyzeButton = Array.from(buttons || []).find(btn => 
      btn.textContent?.includes('Analyze')
    ) as HTMLButtonElement;
    
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.style.cursor = 'pointer';
      analyzeButton.style.pointerEvents = 'auto';
      console.log('✅ Analyze button final check: ENABLED and READY');
    }
  }, 200);
  
  // ✅ CAPTURE BADGE: Initialize badge and make update function globally accessible
  setTimeout(() => {
    // Initialize internal queue if not exists
    if (!(window as any).__cameraQueue) {
      (window as any).__cameraQueue = [];
    }
    
    // Make update function globally accessible
    (window as any).updateCaptureBadge = updateCaptureBadge;
    
    // Initial badge update
    updateCaptureBadge();
    
    console.log('✅ Capture badge initialized');
  }, 250);
  
  // ✅ REGION SELECTION: Initialize selection events
  initializeSelectionEvents(viewArea, video, selectionCanvas);
  console.log('✅ Region selection events initialized');
  
  // Apply minimized state if needed
  if (isMinimized) {
    setTimeout(() => toggleMinimize(), 100);
  }
  
  console.log('Camera panel created successfully');
  return cameraPanel;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  cameraEnabled,
  cameraPanel,
  takeScreenshot,
  switchCamera,
  currentMode,
  lastAnalysisResult,
  intelligentAutoProcess
};