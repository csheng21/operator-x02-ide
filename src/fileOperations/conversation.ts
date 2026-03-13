// conversation.ts - Enhanced with Markdown Parsing & Smart Context Management

import { Conversation, Message } from './types';
import { getFileActionSystemPrompt } from '../aiFileActionInterceptor';
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

interface CodeBlock {
  lang: string;
  code: string;
  index: number;
}

// ============================================================================
// STATE
// ============================================================================

let cameraAnalysisContext: CameraAnalysisContext | null = null;
let contextPersistenceTimer: NodeJS.Timeout | null = null;
let isCreatingNewConversation = false;
let conversationMetadata: Map<string, ConversationMetadata> = new Map();
let codeBlocksCache: Map<string, CodeBlock[]> = new Map();

// ============================================================================
// MARKDOWN & CODE BLOCK PARSING
// ============================================================================

function safeEscapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function unescapeHtml(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function parseMarkdown(content: string, messageId?: string): string {
  const codeBlocks: CodeBlock[] = [];
  
  // Extract and protect code blocks
  let processed = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang: lang || 'plaintext', code, index });
    return `__CODE_BLOCK_${index}__`;
  });
  
  // Store code blocks for later retrieval
  if (messageId) {
    codeBlocksCache.set(messageId, codeBlocks);
  }
  
  // Process inline code
  processed = processed.replace(/`([^`]+)`/g, (match, code) => {
    return `<code class="inline-code">${safeEscapeHtml(code)}</code>`;
  });
  
  // Process bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Process italic
  processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Process headers
  processed = processed.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  processed = processed.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  processed = processed.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Process lists
  processed = processed.replace(/^\- (.+)$/gm, '<li>$1</li>');
  processed = processed.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Process line breaks
  processed = processed.replace(/\n\n/g, '</p><p>');
  processed = '<p>' + processed + '</p>';
  
  // Restore code blocks with interactive UI
  codeBlocks.forEach((block, index) => {
    const escapedCode = safeEscapeHtml(block.code);
    const codeId = `code-${messageId || Date.now()}-${index}`;
    
    const codeBlockHtml = `
      <div class="code-block-container" data-code-id="${codeId}">
        <div class="code-header">
          <span class="code-lang">${block.lang}</span>
          <div class="code-actions">
            <button class="copy-code-btn" data-code-id="${codeId}" title="Copy code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy
            </button>
            <button class="insert-code-btn" data-code-id="${codeId}" title="Insert to editor">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Insert
            </button>
          </div>
        </div>
        <pre><code class="language-${block.lang}" data-code-id="${codeId}">${escapedCode}</code></pre>
        <textarea class="hidden-code-data" data-code-id="${codeId}" style="display:none;">${safeEscapeHtml(block.code)}</textarea>
      </div>
    `;
    
    processed = processed.replace(`__CODE_BLOCK_${index}__`, codeBlockHtml);
  });
  
  return processed;
}

function getCodeFromElement(codeId: string): string | null {
  const textarea = document.querySelector(`textarea[data-code-id="${codeId}"]`) as HTMLTextAreaElement;
  if (textarea) {
    return unescapeHtml(textarea.value);
  }
  
  const codeElement = document.querySelector(`code[data-code-id="${codeId}"]`);
  if (codeElement && codeElement.textContent) {
    return codeElement.textContent;
  }
  
  return null;
}

// ============================================================================
// CODE BLOCK INTERACTION HANDLERS
// ============================================================================

function setupCodeBlockHandlers(): void {
  document.removeEventListener('click', handleCodeBlockClick);
  document.addEventListener('click', handleCodeBlockClick);
}

function handleCodeBlockClick(e: Event): void {
  const target = e.target as HTMLElement;
  
  // Handle copy button
  if (target.closest('.copy-code-btn')) {
    const btn = target.closest('.copy-code-btn') as HTMLElement;
    const codeId = btn.getAttribute('data-code-id');
    
    if (codeId) {
      const code = getCodeFromElement(codeId);
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          const originalHtml = btn.innerHTML;
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!
          `;
          btn.classList.add('success');
          
          setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('success');
          }, 2000);
        }).catch(err => {
          console.error('Copy failed:', err);
          alert('Failed to copy code');
        });
      }
    }
  }
  
  // Handle insert button
  if (target.closest('.insert-code-btn')) {
    const btn = target.closest('.insert-code-btn') as HTMLElement;
    const codeId = btn.getAttribute('data-code-id');
    
    if (codeId) {
      const code = getCodeFromElement(codeId);
      if (code) {
        const editor = (window as any).monaco?.editor?.getEditors()?.[0];
        if (editor) {
          const model = editor.getModel();
          if (model) {
            model.setValue(code);
            
            if ((window as any).showNotification) {
              (window as any).showNotification('Code inserted to editor', 'success');
            }
            
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Inserted!
            `;
            btn.classList.add('success');
            
            setTimeout(() => {
              btn.innerHTML = originalHtml;
              btn.classList.remove('success');
            }, 2000);
          }
        } else {
          alert('No editor available');
        }
      }
    }
  }
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
- NEVER use asterisks for emphasis outside code blocks
- Inside code blocks, asterisks are literal characters and will be preserved
- All regex patterns must use literal asterisks, not HTML entities
- Ask clarifying questions if user intent is unclear
- Reference previous messages in this conversation when relevant

` + getFileActionSystemPrompt() + `
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
  
  messages.push(...relevantMessages);
  
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
  const newConversation: Conversation = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString()
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
// SEND MESSAGE
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
      const userMessage: Message = { role: 'user', content };
      conversation.messages.push(userMessage);
      
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
        const processedContent = parseMarkdown(assistantMessage.content, messageId);
        
        conversation.messages.push({
          role: 'assistant',
          content: processedContent,
          id: messageId
        });
      }
    }

    saveConversations();
    renderCurrentConversation();
    
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
      content: `<div class="error-message">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
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

export async function sendCustomMessage(content: string): Promise<void> {
  if (!currentConversationId) {
    createNewConversation();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const conversationIndex = conversations.findIndex(c => c.id === currentConversationId);
  if (conversationIndex === -1) return;

  const conversation = conversations[conversationIndex];
  const userMessage: Message = { role: 'user', content };
  conversation.messages.push(userMessage);

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
  const userMessage: Message = { role: 'user', content };
  conversation.messages.push(userMessage);

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
        const processedContent = parseMarkdown(assistantMessage.content, messageId);
        
        conversation.messages.push({
          role: 'assistant',
          content: processedContent,
          id: messageId
        });
      }
    }

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
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    renderCurrentConversation();
  }
}

// ============================================================================
// ADD CODE BLOCK STYLES
// ============================================================================

function addCodeBlockStyles(): void {
  if (document.getElementById('code-block-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'code-block-styles';
  styles.textContent = `
    .code-block-container {
      margin: 12px 0;
      border-radius: 8px;
      overflow: hidden;
      background: #1e1e1e;
      border: 1px solid #3e3e42;
    }
    
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #2d2d30;
      border-bottom: 1px solid #3e3e42;
    }
    
    .code-lang {
      color: #858585;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    .code-actions {
      display: flex;
      gap: 6px;
    }
    
    .copy-code-btn, .insert-code-btn {
      background: #007acc;
      color: white;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .copy-code-btn:hover, .insert-code-btn:hover {
      background: #005a9e;
      transform: translateY(-1px);
    }
    
    .copy-code-btn:active, .insert-code-btn:active {
      transform: translateY(0);
    }
    
    .copy-code-btn.success, .insert-code-btn.success {
      background: #4CAF50;
    }
    
    .code-block-container pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      background: #1e1e1e;
    }
    
    .code-block-container pre::-webkit-scrollbar {
      height: 8px;
    }
    
    .code-block-container pre::-webkit-scrollbar-track {
      background: #2d2d30;
    }
    
    .code-block-container pre::-webkit-scrollbar-thumb {
      background: #3e3e42;
      border-radius: 4px;
    }
    
    .code-block-container pre::-webkit-scrollbar-thumb:hover {
      background: #4e4e52;
    }
    
    .code-block-container code {
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    
    .inline-code {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #f92672;
    }
    
    .error-message {
      background: #f443361a;
      border-left: 4px solid #f44336;
      padding: 12px;
      border-radius: 4px;
      color: #ff6b6b;
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeConversationModule(): void {
  console.log('Initializing conversation module with markdown parsing');
  initializeCameraContextBridge();
  addCodeBlockStyles();
  setupCodeBlockHandlers();
  
  (window as any).debugCameraContext = () => {
    console.group('Camera Context Debug');
    console.log('Current context:', cameraAnalysisContext);
    console.log('Context timer active:', !!contextPersistenceTimer);
    console.log('Message input enhanced:', !!document.getElementById('camera-context-indicator'));
    console.groupEnd();
  };
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      clearCameraAnalysisContext();
    }
  });
  
  console.log('Conversation module initialized with code block support');
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConversationModule);
  } else {
    initializeConversationModule();
  }
}