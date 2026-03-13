// ============================================================================
// FILE: src/ide/aiAssistant/aiCodeAssistantPanel.ts
// PURPOSE: Side panel AI assistant for code generation and help
// ============================================================================

import { callGenericAPI } from './apiProviderManager';
import { showNotification } from './notificationManager';
import { conversationManager } from './conversationManager';

/**
 * ✅ APPROACH 6: AI Code Assistant Side Panel
 * 
 * Persistent panel on the side that:
 * - Shows current file context
 * - Allows describing what you want
 * - Generates code directly into the editor
 * - Keeps conversation history
 * - Shows suggestions based on current code
 */

interface PanelConfig {
  position: 'left' | 'right';
  width: number;
  visible: boolean;
}

export class AICodeAssistantPanel {
  private panel: HTMLElement | null = null;
  private editor: any = null;
  private config: PanelConfig = {
    position: 'right',
    width: 350,
    visible: false
  };
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  
  constructor() {
    this.createPanel();
  }
  
  /**
   * Create the side panel UI
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'ai-code-assistant-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <span class="panel-icon">🤖</span>
          <span>AI Code Assistant</span>
        </div>
        <div class="panel-actions">
          <button class="panel-action-btn" id="ai-panel-clear" title="Clear conversation">
            🗑️
          </button>
          <button class="panel-action-btn" id="ai-panel-close" title="Close panel">
            ✕
          </button>
        </div>
      </div>
      
      <div class="panel-content">
        <!-- Context Section -->
        <div class="context-section">
          <div class="section-header">📄 Current Context</div>
          <div class="context-info" id="ai-context-info">
            <div class="context-item">
              <span class="context-label">File:</span>
              <span class="context-value" id="ai-current-file">No file open</span>
            </div>
            <div class="context-item">
              <span class="context-label">Language:</span>
              <span class="context-value" id="ai-current-language">-</span>
            </div>
            <div class="context-item">
              <span class="context-label">Line:</span>
              <span class="context-value" id="ai-current-line">-</span>
            </div>
          </div>
        </div>
        
        <!-- Conversation Section -->
        <div class="conversation-section">
          <div class="section-header">💬 Conversation</div>
          <div class="conversation-messages" id="ai-conversation-messages">
            <div class="welcome-message">
              <p>👋 Hi! I'm your AI coding assistant.</p>
              <p>I can help you:</p>
              <ul>
                <li>Generate new code</li>
                <li>Modify existing code</li>
                <li>Explain code</li>
                <li>Fix bugs</li>
                <li>Add features</li>
              </ul>
              <p>Just describe what you want!</p>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions-section">
          <div class="section-header">⚡ Quick Actions</div>
          <div class="quick-actions" id="ai-quick-actions">
            <button class="quick-action-btn" data-action="explain">
              📖 Explain Code
            </button>
            <button class="quick-action-btn" data-action="optimize">
              ⚡ Optimize
            </button>
            <button class="quick-action-btn" data-action="add-tests">
              🧪 Add Tests
            </button>
            <button class="quick-action-btn" data-action="add-docs">
              📝 Add Docs
            </button>
            <button class="quick-action-btn" data-action="fix-bugs">
              🐛 Fix Bugs
            </button>
            <button class="quick-action-btn" data-action="typescript">
              📘 Add Types
            </button>
          </div>
        </div>
        
        <!-- Input Section -->
        <div class="input-section">
          <textarea 
            id="ai-panel-input" 
            placeholder="Describe what you want to do..."
            rows="3"
          ></textarea>
          <div class="input-actions">
            <button class="btn-secondary" id="ai-insert-cursor">
              📍 Insert at Cursor
            </button>
            <button class="btn-primary" id="ai-generate-code">
              ✨ Generate
            </button>
          </div>
        </div>
      </div>
      
      <style>
        .ai-code-assistant-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 350px;
          background: #1e1e1e;
          border-left: 1px solid #3c3c3c;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.3s ease;
        }
        
        .ai-code-assistant-panel.visible {
          transform: translateX(0);
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #2d2d2d;
          border-bottom: 1px solid #3c3c3c;
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #cccccc;
        }
        
        .panel-icon {
          font-size: 18px;
        }
        
        .panel-actions {
          display: flex;
          gap: 8px;
        }
        
        .panel-action-btn {
          background: transparent;
          border: none;
          color: #cccccc;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .panel-action-btn:hover {
          background: #3c3c3c;
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        
        .section-header {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        /* Context Section */
        .context-section {
          padding: 16px;
          border-bottom: 1px solid #3c3c3c;
        }
        
        .context-info {
          background: #252525;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          padding: 8px;
        }
        
        .context-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }
        
        .context-label {
          color: #888;
        }
        
        .context-value {
          color: #4ec9b0;
          font-family: 'Consolas', monospace;
        }
        
        /* Conversation Section */
        .conversation-section {
          flex: 1;
          padding: 16px;
          border-bottom: 1px solid #3c3c3c;
          overflow-y: auto;
        }
        
        .conversation-messages {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .welcome-message {
          background: #252525;
          border: 1px solid #3c3c3c;
          border-radius: 6px;
          padding: 12px;
          color: #cccccc;
          font-size: 13px;
        }
        
        .welcome-message p {
          margin: 8px 0;
        }
        
        .welcome-message ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .welcome-message li {
          margin: 4px 0;
        }
        
        .message {
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .message.user {
          background: #1a3a52;
          border: 1px solid #2d5a7b;
          color: #cccccc;
          margin-left: 20px;
        }
        
        .message.assistant {
          background: #252525;
          border: 1px solid #3c3c3c;
          color: #cccccc;
          margin-right: 20px;
        }
        
        .message pre {
          background: #1e1e1e;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 8px 0;
          font-size: 12px;
        }
        
        /* Quick Actions */
        .quick-actions-section {
          padding: 16px;
          border-bottom: 1px solid #3c3c3c;
        }
        
        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .quick-action-btn {
          background: #2d2d2d;
          border: 1px solid #3c3c3c;
          color: #cccccc;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          text-align: left;
          transition: all 0.2s;
        }
        
        .quick-action-btn:hover {
          background: #3c3c3c;
          border-color: #007acc;
        }
        
        /* Input Section */
        .input-section {
          padding: 16px;
          background: #2d2d2d;
        }
        
        .input-section textarea {
          width: 100%;
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          color: #cccccc;
          padding: 12px;
          border-radius: 4px;
          font-family: 'Consolas', monospace;
          font-size: 13px;
          resize: vertical;
          margin-bottom: 12px;
        }
        
        .input-section textarea:focus {
          outline: none;
          border-color: #007acc;
        }
        
        .input-actions {
          display: flex;
          gap: 8px;
        }
        
        .input-actions button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        
        .btn-primary {
          background: #007acc;
          color: white;
        }
        
        .btn-primary:hover {
          background: #005a9e;
        }
        
        .btn-secondary {
          background: #3c3c3c;
          color: #cccccc;
        }
        
        .btn-secondary:hover {
          background: #4e4e4e;
        }
        
        /* Loading indicator */
        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #252525;
          border: 1px solid #3c3c3c;
          border-radius: 6px;
          color: #cccccc;
          font-size: 13px;
        }
        
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #3c3c3c;
          border-top-color: #007acc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    this.panel = panel;
    document.body.appendChild(panel);
    
    this.attachEventListeners();
  }
  
  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.panel) return;
    
    // Close button
    const closeBtn = this.panel.querySelector('#ai-panel-close');
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Clear button
    const clearBtn = this.panel.querySelector('#ai-panel-clear');
    clearBtn?.addEventListener('click', () => this.clearConversation());
    
    // Generate button
    const generateBtn = this.panel.querySelector('#ai-generate-code');
    generateBtn?.addEventListener('click', () => this.handleGenerate());
    
    // Insert at cursor button
    const insertBtn = this.panel.querySelector('#ai-insert-cursor');
    insertBtn?.addEventListener('click', () => this.handleInsertAtCursor());
    
    // Quick actions
    const quickActions = this.panel.querySelectorAll('.quick-action-btn');
    quickActions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).getAttribute('data-action');
        if (action) this.handleQuickAction(action);
      });
    });
    
    // Input keyboard shortcuts
    const input = this.panel.querySelector('#ai-panel-input') as HTMLTextAreaElement;
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleGenerate();
      }
    });
  }
  
  /**
   * Show the panel
   */
  public show(): void {
    if (this.panel) {
      this.panel.classList.add('visible');
      this.config.visible = true;
      this.updateContext();
    }
  }
  
  /**
   * Hide the panel
   */
  public hide(): void {
    if (this.panel) {
      this.panel.classList.remove('visible');
      this.config.visible = false;
    }
  }
  
  /**
   * Toggle panel visibility
   */
  public toggle(): void {
    if (this.config.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Set the current editor
   */
  public setEditor(editor: any): void {
    this.editor = editor;
    this.updateContext();
  }
  
  /**
   * Update context information
   */
  private updateContext(): void {
    if (!this.panel || !this.editor) return;
    
    const model = this.editor.getModel();
    if (!model) return;
    
    const position = this.editor.getPosition();
    const fileName = model.uri?.path?.split('/').pop() || 'Unknown';
    const language = model.getLanguageId();
    
    const fileEl = this.panel.querySelector('#ai-current-file');
    const langEl = this.panel.querySelector('#ai-current-language');
    const lineEl = this.panel.querySelector('#ai-current-line');
    
    if (fileEl) fileEl.textContent = fileName;
    if (langEl) langEl.textContent = language;
    if (lineEl) lineEl.textContent = position ? `${position.lineNumber}` : '-';
  }
  
  /**
   * Handle code generation
   */
  private async handleGenerate(): Promise<void> {
    const input = this.panel?.querySelector('#ai-panel-input') as HTMLTextAreaElement;
    if (!input) return;
    
    const instruction = input.value.trim();
    if (!instruction) {
      showNotification('Please enter an instruction', 'warning');
      return;
    }
    
    // Add user message to conversation
    this.addMessage('user', instruction);
    
    // Clear input
    input.value = '';
    
    // Show loading
    this.addLoadingIndicator();
    
    try {
      const model = this.editor?.getModel();
      const language = model?.getLanguageId() || 'javascript';
      
      const prompt = `Generate ${language} code: ${instruction}

Output ONLY code in a \`\`\`${language} code block, no explanations.`;

      const response = await callGenericAPI(prompt);
      
      // Remove loading
      this.removeLoadingIndicator();
      
      // Extract code
      const code = this.extractCode(response, language);
      
      // Add AI response
      this.addMessage('assistant', code ? `\`\`\`${language}\n${code}\n\`\`\`` : response);
      
      // Store for easy insertion
      (this.panel as any).lastGeneratedCode = code;
      
    } catch (error) {
      this.removeLoadingIndicator();
      this.addMessage('assistant', 'Sorry, I encountered an error generating code.');
      console.error('Error generating code:', error);
    }
  }
  
  /**
   * Handle insert at cursor
   */
  private handleInsertAtCursor(): void {
    const lastCode = (this.panel as any).lastGeneratedCode;
    
    if (!lastCode) {
      showNotification('No code to insert', 'warning');
      return;
    }
    
    if (!this.editor) {
      showNotification('No editor available', 'error');
      return;
    }
    
    const position = this.editor.getPosition();
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };
    
    this.editor.executeEdits('ai-panel-insert', [{
      range: range,
      text: '\n' + lastCode + '\n',
      forceMoveMarkers: true
    }]);
    
    showNotification('✅ Code inserted', 'success');
  }
  
  /**
   * Handle quick actions
   */
  private async handleQuickAction(action: string): Promise<void> {
    const selection = this.editor?.getSelection();
    const model = this.editor?.getModel();
    
    if (!selection || !model) {
      showNotification('Please select some code first', 'warning');
      return;
    }
    
    const selectedCode = model.getValueInRange(selection);
    
    if (!selectedCode) {
      showNotification('Please select some code first', 'warning');
      return;
    }
    
    const actionInstructions: Record<string, string> = {
      'explain': 'Explain this code in detail',
      'optimize': 'Optimize this code for performance',
      'add-tests': 'Create unit tests for this code',
      'add-docs': 'Add comprehensive documentation comments',
      'fix-bugs': 'Find and fix potential bugs in this code',
      'typescript': 'Convert this to TypeScript with proper types'
    };
    
    const instruction = actionInstructions[action];
    
    if (!instruction) return;
    
    // Add to input
    const input = this.panel?.querySelector('#ai-panel-input') as HTMLTextAreaElement;
    if (input) {
      input.value = `${instruction}\n\nCode:\n${selectedCode}`;
      this.handleGenerate();
    }
  }
  
  /**
   * Add message to conversation
   */
  private addMessage(role: 'user' | 'assistant', content: string): void {
    const messagesContainer = this.panel?.querySelector('#ai-conversation-messages');
    if (!messagesContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    
    // Process markdown code blocks
    const processedContent = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });
    
    messageEl.innerHTML = processedContent.replace(/\n/g, '<br>');
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.conversationHistory.push({ role, content });
  }
  
  /**
   * Add loading indicator
   */
  private addLoadingIndicator(): void {
    const messagesContainer = this.panel?.querySelector('#ai-conversation-messages');
    if (!messagesContainer) return;
    
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.id = 'ai-loading-indicator';
    loader.innerHTML = '<div class="loading-spinner"></div><span>Generating code...</span>';
    
    messagesContainer.appendChild(loader);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Remove loading indicator
   */
  private removeLoadingIndicator(): void {
    const loader = this.panel?.querySelector('#ai-loading-indicator');
    loader?.remove();
  }
  
  /**
   * Clear conversation
   */
  private clearConversation(): void {
    const messagesContainer = this.panel?.querySelector('#ai-conversation-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = `
      <div class="welcome-message">
        <p>👋 Conversation cleared!</p>
        <p>What would you like to build?</p>
      </div>
    `;
    
    this.conversationHistory = [];
  }
  
  /**
   * Extract code from response
   */
  private extractCode(response: string, language: string): string | null {
    const regex = new RegExp(`\`\`\`(?:${language})?\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
    const match = response.match(regex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    const genericMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
    if (genericMatch && genericMatch[1]) {
      return genericMatch[1].trim();
    }
    
    return null;
  }
  
  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Initialize AI Code Assistant Panel
 */
export function initializeAICodeAssistantPanel(monaco: any): AICodeAssistantPanel {
  const panel = new AICodeAssistantPanel();
  
  // Add command to toggle panel
  monaco.editor.addCommand({
    id: 'ai-toggle-panel',
    label: 'AI: Toggle Assistant Panel',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyA
    ],
    run: () => {
      panel.toggle();
    }
  });
  
  // Update panel when editor changes
  monaco.editor.onDidCreateEditor((editor: any) => {
    panel.setEditor(editor);
    
    // Update context on cursor changes
    editor.onDidChangeCursorPosition(() => {
      if (panel) {
        (panel as any).updateContext();
      }
    });
  });
  
  console.log('✅ AI Code Assistant Panel initialized (Ctrl+Alt+A)');
  
  return panel;
}

export default {
  AICodeAssistantPanel,
  initializeAICodeAssistantPanel
};
