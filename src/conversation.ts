// conversation.ts - Enhanced with Unified Markdown Processing & Smart Context Management

import { Conversation, Message } from './types';
import { 
  conversations, 
  currentConversationId, 
  saveConversations,
  setCurrentConversationId,
  addConversation,
  removeConversation,
  updateConversation,
  apiKey,
  apiBaseUrl
} from './state';
import { callDeepseekAPI, executeCommand, formatCommandOutput, escapeHtml, handleCommandExecution } from './utils';
import { messageInput, sendButton, chatContainer, renderConversationList, renderCurrentConversation, settingsModal } from './ui';
// Update the import path to point to the aiAssistant folder
import { markdownProcessor } from './ide/aiAssistant/unifiedMarkdownProcessor';

console.log('🔵 [CONVERSATION.TS] Module loading... timestamp:', new Date().toISOString());

// ============================================================================
// INTERFACES
// ============================================================================

interface CameraAnalysisContext {
  active: boolean;
  title: string;
  content: string;
  imageData?: string;
  timestamp: number;
  type: 'analysis' | 'ocr' | 'screenshot';
}

interface ConversationMetadata {
  projectPath?: string;
  openFiles: string[];
  currentFile?: {
    name: string;
    language: string;
    content: string;
  };
  topics: string[];
  lastSummary?: {
    content: string;
    messageCount: number;
    timestamp: number;
  };
}

// ============================================================================
// STATE
// ============================================================================

let cameraAnalysisContext: CameraAnalysisContext | null = null;
let contextPersistenceTimer: NodeJS.Timeout | null = null;
let isCreatingNewConversation = false;
let conversationMetadata: Map<string, ConversationMetadata> = new Map();

// ============================================================================
// CODE BLOCK INTERACTION HANDLERS
// ============================================================================

function setupCodeBlockHandlers(): void {
  markdownProcessor.setupCodeBlockHandlers();
}

// ============================================================================
// SYSTEM CONTEXT
// ============================================================================

function getSystemMessage(): { role: 'system'; content: string } {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  const currentFile = (window as any).tabManager?.currentFile;
  const projectPath = (window as any).fileSystem?.currentPath || 'No project open';
  
  let systemContent = `You are an AI assistant integrated into a powerful code IDE with the following capabilities:

**IDE Features:**
- Full code editor with syntax highlighting and IntelliSense
- File system operations (read, write, create, delete files and folders)
- Integrated terminal for command execution
- Plugin system for extensibility
- Multi-file project support
- Camera/OCR integration for image analysis

**Your Responsibilities:**
- Help users write, debug, and understand code
- Explain programming concepts clearly
- Suggest improvements and best practices
- Assist with file operations and project management
- Answer questions about code, algorithms, and software development
- Help with IDE features and workflow

**Current Context:**
- Project: ${projectPath}`;

  if (currentFile && editor) {
    const model = editor.getModel();
    const language = model?.getLanguageId() || 'unknown';
    systemContent += `
- Current File: ${currentFile.name} (${language})`;
  }

  systemContent += `

**CRITICAL Response Guidelines:**
- Be concise but thorough
- When providing code, ALWAYS use markdown code blocks with language specification
- Format: \`\`\`language\\ncode here\\n\`\`\`
- Inside code blocks, ALL characters including asterisks (*) are LITERAL and will be preserved exactly as written
- Regex patterns, pointer syntax, and multiplication operators will be preserved correctly
- NEVER modify asterisks or special characters inside code blocks
- Ask clarifying questions if user intent is unclear
- Reference previous messages in this conversation when relevant

Always maintain continuity with previous messages in this conversation.`;

  return { role: 'system', content: systemContent };
}

// ============================================================================
// IDE CONTEXT
// ============================================================================

function getIDEContext(): string {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  const openFile = (window as any).tabManager?.currentFile;
  const projectPath = (window as any).fileSystem?.currentPath;
  
  if (!editor || !openFile) return '';
  
  const model = editor.getModel();
  const code = model?.getValue() || '';
  const language = model?.getLanguageId() || 'unknown';
  const lineCount = code.split('\n').length;
  
  if (lineCount > 500) {
    return `\n[Current File: ${openFile.name} (${language}, ${lineCount} lines) - file too large to include]`;
  }
  
  return `\n[Current File: ${openFile.name} (${language})]
\`\`\`${language}
${code}
\`\`\``;
}

// ============================================================================
// SMART CONTEXT SELECTION
// ============================================================================

function selectRelevantMessages(
  allMessages: Message[], 
  currentQuery: string
): Message[] {
  const recentCount = 10;
  const recentMessages = allMessages.slice(-recentCount);
  
  if (allMessages.length <= recentCount) {
    return allMessages;
  }
  
  const keywords = currentQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['what', 'this', 'that', 'with', 'from', 'have', 'been'].includes(word));
  
  if (keywords.length === 0) {
    return recentMessages;
  }
  
  const olderMessages = allMessages.slice(0, -recentCount);
  const relevantOld = olderMessages
    .map((msg, idx) => ({ msg, idx, score: 0 }))
    .map(item => {
      let score = 0;
      const contentLower = item.msg.content.toLowerCase();
      
      keywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          score += 2;
        }
      });
      
      score += (item.idx / olderMessages.length) * 0.5;
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.idx - b.idx)
    .map(item => item.msg);
  
  return [...relevantOld, ...recentMessages];
}

// ============================================================================
// CONVERSATION SUMMARIZATION
// ============================================================================

async function summarizeIfNeeded(conversation: Conversation): Promise<string | null> {
  const metadata = conversationMetadata.get(conversation.id);
  const messageCount = conversation.messages.length;
  
  if (messageCount < 50) return null;
  
  if (metadata?.lastSummary && messageCount - metadata.lastSummary.messageCount < 20) {
    return metadata.lastSummary.content;
  }
  
  const messagesToSummarize = conversation.messages.slice(0, -20);
  if (messagesToSummarize.length === 0) return null;
  
  const summaryText = messagesToSummarize
    .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
    .join('\n');
  
  try {
    const summaryResponse = await callDeepseekAPI(apiKey, apiBaseUrl, [
      {
        role: 'user',
        content: `Summarize this conversation history in 150 words, focusing on key topics, decisions, and code discussed:\n\n${summaryText}`
      }
    ]);
    
    const summary = summaryResponse.choices?.[0]?.message?.content || '';
    
    if (!conversationMetadata.has(conversation.id)) {
      conversationMetadata.set(conversation.id, {
        openFiles: [],
        topics: []
      });
    }
    
    const meta = conversationMetadata.get(conversation.id)!;
    meta.lastSummary = {
      content: summary,
      messageCount: messagesToSummarize.length,
      timestamp: Date.now()
    };
    
    return summary;
  } catch (error) {
    console.error('Failed to create summary:', error);
    return null;
  }
}

// ============================================================================
// BUILD API MESSAGES WITH FULL CONTEXT
// ============================================================================

async function buildAPIMessages(
  conversation: Conversation,
  currentMessage: string
): Promise<Array<{ role: string; content: string }>> {
  const messages: Array<{ role: string; content: string }> = [];
  
  messages.push(getSystemMessage());
  
  const summary = await summarizeIfNeeded(conversation);
  if (summary) {
    messages.push({
      role: 'system',
      content: `[Previous Conversation Summary]: ${summary}`
    });
  }
  
  const relevantMessages = selectRelevantMessages(
    conversation.messages,
    currentMessage
  );
  
  // Strip HTML from messages before sending to API
  const cleanMessages = relevantMessages.map(msg => {
    if (msg.content.includes('<') && msg.content.includes('>')) {
      // Extract text content from HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = msg.content;
      return {
        ...msg,
        content: tempDiv.textContent || tempDiv.innerText || msg.content
      };
    }
    return msg;
  });
  
  messages.push(...cleanMessages);
  
  const enhancedMessage = buildSystemPromptWithCameraContext(currentMessage);
  
  const isCodeRelated = /code|function|class|variable|error|bug|implement|file|debug/i.test(currentMessage);
  if (isCodeRelated) {
    const ideContext = getIDEContext();
    if (ideContext) {
      messages.push({
        role: 'system',
        content: ideContext
      });
    }
  }
  
  messages.push({
    role: 'user',
    content: enhancedMessage
  });
  
  return messages;
}

// ============================================================================
// CAMERA CONTEXT FUNCTIONS
// ============================================================================

function initializeCameraContextBridge(): void {
  window.addEventListener('cameraContextChange', (event: CustomEvent) => {
    const contextData = event.detail;
    if (contextData) {
      setCameraAnalysisContext(contextData);
    } else {
      clearCameraAnalysisContext();
    }
  });

  (window as any).setCameraAnalysisContext = setCameraAnalysisContext;
  (window as any).getCameraAnalysisContext = getCameraAnalysisContext;
  (window as any).clearCameraAnalysisContext = clearCameraAnalysisContext;
}

export function setCameraAnalysisContext(context: CameraAnalysisContext | null): void {
  cameraAnalysisContext = context;
  
  if (context) {
    enhanceMessageInputWithContext(context);
    
    if (contextPersistenceTimer) {
      clearTimeout(contextPersistenceTimer);
    }
    
    contextPersistenceTimer = setTimeout(() => {
      clearCameraAnalysisContext();
    }, 10 * 60 * 1000);
    
    (window as any).globalCameraContext = context;
  } else {
    clearContextEnhancements();
    (window as any).globalCameraContext = null;
  }
}

export function getCameraAnalysisContext(): CameraAnalysisContext | null {
  return cameraAnalysisContext;
}

export function clearCameraAnalysisContext(): void {
  cameraAnalysisContext = null;
  
  if (contextPersistenceTimer) {
    clearTimeout(contextPersistenceTimer);
    contextPersistenceTimer = null;
  }
  
  clearContextEnhancements();
  (window as any).globalCameraContext = null;
}

function enhanceMessageInputWithContext(context: CameraAnalysisContext): void {
  if (!messageInput) return;
  
  const existingIndicator = document.getElementById('camera-context-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'camera-context-indicator';
  indicator.style.cssText = `
    position: absolute; top: -30px; left: 0; right: 0;
    background: linear-gradient(45deg, #6366f1, #8b5cf6);
    color: white; padding: 6px 12px; border-radius: 6px 6px 0 0;
    font-size: 11px; font-weight: 600; z-index: 1001;
    animation: contextGlow 2s ease-in-out infinite;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 -2px 10px rgba(99, 102, 241, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  const contextType = context.type === 'ocr' ? 'OCR Text' : 'Image Analysis';
  const textSpan = document.createElement('span');
  textSpan.textContent = `Camera ${contextType} Context Active`;
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '✕';
  clearBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.2); border: none; color: white;
    padding: 2px 6px; border-radius: 3px; cursor: pointer;
    font-size: 10px; margin-left: 8px; transition: background 0.2s ease;
  `;
  clearBtn.onclick = () => clearCameraAnalysisContext();
  clearBtn.title = 'Clear camera context';
  
  indicator.appendChild(textSpan);
  indicator.appendChild(clearBtn);
  
  const inputContainer = messageInput.parentElement;
  if (inputContainer) {
    if (window.getComputedStyle(inputContainer).position === 'static') {
      inputContainer.style.position = 'relative';
    }
    inputContainer.appendChild(indicator);
  }
  
  const originalPlaceholder = messageInput.placeholder;
  messageInput.placeholder = `Ask about the ${contextType.toLowerCase()}...`;
  messageInput.setAttribute('data-original-placeholder', originalPlaceholder);

  if (!document.getElementById('camera-context-indicator-styles')) {
    const style = document.createElement('style');
    style.id = 'camera-context-indicator-styles';
    style.textContent = `
      @keyframes contextGlow {
        0%, 100% { box-shadow: 0 -2px 10px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 -4px 20px rgba(99, 102, 241, 0.6); }
      }
    `;
    document.head.appendChild(style);
  }
}

function clearContextEnhancements(): void {
  const indicator = document.getElementById('camera-context-indicator');
  if (indicator) {
    indicator.remove();
  }
  
  if (messageInput) {
    const originalPlaceholder = messageInput.getAttribute('data-original-placeholder');
    if (originalPlaceholder) {
      messageInput.placeholder = originalPlaceholder;
      messageInput.removeAttribute('data-original-placeholder');
    }
  }
}

function buildSystemPromptWithCameraContext(userMessage: string): string {
  if (!cameraAnalysisContext || !cameraAnalysisContext.active) {
    return userMessage;
  }

  const context = cameraAnalysisContext;
  const contextKeywords = [
    'this', 'it', 'that', 'what', 'how', 'why', 'where', 'when', 'which',
    'explain', 'analyze', 'tell me', 'describe', 'help me', 'show me'
  ];
  
  const messageLower = userMessage.toLowerCase();
  const isCameraRelated = contextKeywords.some(keyword => messageLower.includes(keyword)) || 
                         userMessage.length < 50;

  if (isCameraRelated) {
    if (contextPersistenceTimer) {
      clearTimeout(contextPersistenceTimer);
      contextPersistenceTimer = setTimeout(() => {
        clearCameraAnalysisContext();
      }, 10 * 60 * 1000);
    }

    const isOCR = context.type === 'ocr';
    const enhancedPrompt = `[CAMERA CONTEXT - ${context.type.toUpperCase()}]
${isOCR ? 'OCR Text' : 'Image Analysis'}: "${context.content}"

User Question: ${userMessage}

Instructions: Answer the user's question about this ${isOCR ? 'extracted text' : 'image analysis'}. Reference the specific content when answering.`;

    return enhancedPrompt;
  }

  return userMessage;
}

export function extendCameraContext(): void {
  if (cameraAnalysisContext && contextPersistenceTimer) {
    clearTimeout(contextPersistenceTimer);
    contextPersistenceTimer = setTimeout(() => {
      clearCameraAnalysisContext();
    }, 10 * 60 * 1000);
  }
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export function createNewConversation(): void {
  if (isCreatingNewConversation) return;
  
  isCreatingNewConversation = true;
  if (sendButton) {
    sendButton.disabled = true;
  }
  
  const id = Date.now().toString();
  const now = Date.now();
  const newConversation: Conversation = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: now,
    lastUpdated: now
  };

  addConversation(newConversation);
  setCurrentConversationId(id);
  
  conversationMetadata.set(id, {
    openFiles: [],
    topics: []
  });
  
  renderConversationList();
  renderCurrentConversation();
  
  if (messageInput) {
    messageInput.focus();
  }
  
  if (sendButton) {
    sendButton.disabled = false;
  }
  
  setTimeout(() => {
    isCreatingNewConversation = false;
  }, 500);
}

// ============================================================================
// SEND MESSAGE - MAIN FUNCTION WITH UNIFIED PROCESSOR
// ============================================================================

export async function sendMessage(): Promise<void> {
  if (!messageInput || !sendButton || !chatContainer) return;
  
  const content = messageInput.value.trim();
  if (!content && !hasPendingUploads()) return;

  if (content) {
    const isCommand = await handleCommandExecution(content);
    if (isCommand) {
      messageInput.value = '';
      return;
    }
  }

  if (!apiKey) {
    alert('Please set your Deepseek API key in Settings');
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
    return;
  }

  if (!currentConversationId) {
    createNewConversation();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const conversationIndex = conversations.findIndex(c => c.id === currentConversationId);
  if (conversationIndex === -1) {
    console.error('Current conversation not found');
    return;
  }
  const conversation = conversations[conversationIndex];

  if (sendButton) {
    sendButton.disabled = true;
    sendButton.innerHTML = '<div class="loading"></div>';
  }

  try {
    if (content) {
      const userMessage: Message = { role: 'user', content, timestamp: Date.now() };
      conversation.messages.push(userMessage);
      
      conversation.lastUpdated = Date.now();
      
      if (conversation.messages.length <= 2) {
        updateConversationTitle(conversation, content);
      }
    }

    messageInput.value = '';
    renderCurrentConversation();
    renderConversationList();
    saveConversations();
    
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    const apiMessages = await buildAPIMessages(conversation, content);
    const response = await callDeepseekAPI(apiKey, apiBaseUrl, apiMessages);

    if (response.choices && response.choices.length > 0) {
      const assistantMessage = response.choices[0].message;
      if (assistantMessage && assistantMessage.content) {
        const messageId = `msg-${Date.now()}`;
        
        // Use the unified markdown processor - THIS IS THE FIX
        const processed = markdownProcessor.processMarkdown(
          assistantMessage.content, 
          messageId
        );
        
        // ⭐ FIX v14: Wrap processed HTML with marker to prevent MarkdownFix reprocessing
        const markedHtml = `<div data-markdown-processed="true" data-original-render="true">${processed.html}</div>`;
        
        // Store the processed HTML
        conversation.messages.push({
          role: 'assistant',
          content: markedHtml,
          id: messageId,
          timestamp: Date.now()
        });
      }
    }

    conversation.lastUpdated = Date.now();
    saveConversations();
    renderCurrentConversation();
    
    // Setup code block handlers after rendering
    setTimeout(() => {
      setupCodeBlockHandlers();
    }, 100);

    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    if (cameraAnalysisContext && cameraAnalysisContext.active) {
      extendCameraContext();
    }
  } catch (error) {
    console.error('Error in message processing:', error);
    
    conversation.messages.push({
      role: 'assistant',
      content: `<div class="error-message">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`,
      timestamp: Date.now()
    });
    
    renderCurrentConversation();
    alert('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hasPendingUploads(): boolean {
  const filePreview = document.getElementById('file-preview');
  return filePreview ? filePreview.querySelectorAll('.file-item').length > 0 : false;
}

function updateConversationTitle(conversation: Conversation, content: string): void {
  let title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
  
  if (cameraAnalysisContext) {
    const contextType = cameraAnalysisContext.type === 'ocr' ? 'OCR' : 'Analysis';
    title = `Camera ${contextType}: ${title}`;
  }
  
  updateConversation(conversation.id, { title });
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

export async function exportConversations(): Promise<void> {
  if (conversations.length === 0) {
    alert('No conversations to export');
    return;
  }

  try {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deepseek-conversations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Conversations exported successfully');
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export conversations');
  }
}

export async function importConversations(): Promise<void> {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedConversations = JSON.parse(event.target?.result as string);
          
          if (confirm('Replace all existing conversations? Click Cancel to merge.')) {
            conversations.length = 0;
            for (const conv of importedConversations) {
              addConversation(conv);
            }
          } else {
            for (const conv of importedConversations) {
              addConversation(conv);
            }
          }
          
          if (importedConversations.length > 0) {
            setCurrentConversationId(importedConversations[0].id);
          }
          
          renderConversationList();
          renderCurrentConversation();
          setupCodeBlockHandlers();
          alert('Conversations imported successfully');
        } catch (error) {
          console.error('Error parsing imported file:', error);
          alert('Failed to import conversations: Invalid file format');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  } catch (error) {
    console.error('Import error:', error);
    alert('Failed to import conversations');
  }
}

// ============================================================================
// CUSTOM MESSAGE FUNCTIONS
// ============================================================================

export async function sendCustomMessage(content: string): Promise<void> {
  if (!currentConversationId) {
    createNewConversation();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const conversationIndex = conversations.findIndex(c => c.id === currentConversationId);
  if (conversationIndex === -1) return;

  const conversation = conversations[conversationIndex];
  const userMessage: Message = { role: 'user', content, timestamp: Date.now() };
  conversation.messages.push(userMessage);

  conversation.lastUpdated = Date.now();
  renderCurrentConversation();
  saveConversations();

  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

export async function sendCustomMessageWithCameraContext(content: string, cameraContext?: CameraAnalysisContext): Promise<void> {
  if (cameraContext) {
    setCameraAnalysisContext(cameraContext);
  }

  if (!currentConversationId) {
    createNewConversation();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const conversationIndex = conversations.findIndex(c => c.id === currentConversationId);
  if (conversationIndex === -1) return;

  const conversation = conversations[conversationIndex];
  const userMessage: Message = { role: 'user', content, timestamp: Date.now() };
  conversation.messages.push(userMessage);

  conversation.lastUpdated = Date.now();
  renderCurrentConversation();
  saveConversations();

  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  try {
    const apiMessages = await buildAPIMessages(conversation, content);
    const response = await callDeepseekAPI(apiKey, apiBaseUrl, apiMessages);
    
    if (response.choices && response.choices.length > 0) {
      const assistantMessage = response.choices[0].message;
      if (assistantMessage && assistantMessage.content) {
        const messageId = `msg-${Date.now()}`;
        
        // Use the unified markdown processor
        const processed = markdownProcessor.processMarkdown(
          assistantMessage.content, 
          messageId
        );
        
        // ⭐ FIX v14: Wrap processed HTML with marker to prevent MarkdownFix reprocessing
        const markedHtml = `<div data-markdown-processed="true" data-original-render="true">${processed.html}</div>`;
        
        conversation.messages.push({
          role: 'assistant',
          content: markedHtml,
          id: messageId,
          timestamp: Date.now()
        });
      }
    }

    conversation.lastUpdated = Date.now();
    saveConversations();
    renderCurrentConversation();
    setupCodeBlockHandlers();

    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    if (cameraAnalysisContext) {
      extendCameraContext();
    }
  } catch (error) {
    console.error('Error:', error);
    conversation.messages.push({
      role: 'assistant',
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now()
    });
    renderCurrentConversation();
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeConversationModule(): void {
  console.log('🚀 [INIT] Initializing conversation module with unified markdown processor');
  console.log('🚀 [INIT] Timestamp:', new Date().toISOString());
  console.log('🚀 [INIT] markdownProcessor available:', typeof markdownProcessor !== 'undefined');
  
  initializeCameraContextBridge();
  setupCodeBlockHandlers();
  
  // Debug helper
  (window as any).debugCameraContext = () => {
    console.group('Camera Context Debug');
    console.log('Current context:', cameraAnalysisContext);
    console.log('Context timer active:', !!contextPersistenceTimer);
    console.log('Message input enhanced:', !!document.getElementById('camera-context-indicator'));
    console.groupEnd();
  };
  
  // Keyboard shortcut to clear camera context
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      clearCameraAnalysisContext();
    }
  });
  
  console.log('✅ [INIT] Conversation module initialized successfully');
  console.log('✅ [INIT] Using unified markdown processor for code preservation');
  
  (window as any).__CONVERSATION_DEBUG_ENABLED = true;
  (window as any).__CONVERSATION_MODULE_VERSION = '4.0-UNIFIED-PROCESSOR';
  (window as any).__conversationModuleLoaded = true;
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConversationModule);
  } else {
    initializeConversationModule();
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export default {
  createNewConversation,
  sendMessage,
  exportConversations,
  importConversations,
  setCameraAnalysisContext,
  getCameraAnalysisContext,
  clearCameraAnalysisContext,
  extendCameraContext,
  sendCustomMessage,
  sendCustomMessageWithCameraContext
};