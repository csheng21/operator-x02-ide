// ide/aiAssistant/codeInsertionManager.ts

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  element: HTMLElement;
  isProcessed: boolean;
}

export interface InsertionOptions {
  mode: 'cursor' | 'selection' | 'newFile' | 'append';
  position?: { line: number; column: number };
  fileName?: string;
  createFile?: boolean;
}

export interface InsertionResult {
  success: boolean;
  message: string;
  position?: { line: number; column: number };
  fileName?: string;
}

export class CodeInsertionManager {
  private editorManager: any;
  private fileManager: any;
  private chatContainer: HTMLElement;
  private observer: MutationObserver;
  private codeBlocks: Map<string, CodeBlock> = new Map();
  private insertionHistory: Array<{code: string, position: any, timestamp: number}> = [];

  constructor(editorManager: any, fileManager: any, chatContainer: HTMLElement) {
    this.editorManager = editorManager;
    this.fileManager = fileManager;
    this.chatContainer = chatContainer;
    this.initialize();
  }

  private initialize(): void {
    this.setupMessageObserver();
    this.setupGlobalEventListeners();
    this.injectStyles();
    // Process existing messages
    this.processExistingMessages();
  }

  private setupMessageObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewMessage(node as HTMLElement);
          }
        });
      });
    });

    this.observer.observe(this.chatContainer, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  private setupGlobalEventListeners(): void {
    // Listen for editor events
    window.addEventListener('ai-code-insert', this.handleCodeInsertion.bind(this));
    window.addEventListener('ai-code-replace', this.handleCodeReplacement.bind(this));
    window.addEventListener('ai-code-newfile', this.handleNewFileCreation.bind(this));
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  private processExistingMessages(): void {
    const messages = this.chatContainer.querySelectorAll('.message, [data-message]');
    messages.forEach(message => this.processNewMessage(message as HTMLElement));
  }

  private processNewMessage(messageElement: HTMLElement): void {
    // Skip if already processed
    if (messageElement.hasAttribute('data-code-processed')) return;

    // Find code blocks within this message
    const codeElements = this.findCodeElements(messageElement);
    
    if (codeElements.length > 0) {
      codeElements.forEach((codeElement, index) => {
        this.processCodeBlock(codeElement, messageElement, index);
      });
      
      // Mark message as processed
      messageElement.setAttribute('data-code-processed', 'true');
    }
  }

  private findCodeElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'pre code',
      '.code-block',
      '.hljs',
      '[class*="language-"]',
      'code[class*="language-"]'
    ];

    const codeElements: HTMLElement[] = [];
    
    selectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        if (!codeElements.includes(el as HTMLElement)) {
          codeElements.push(el as HTMLElement);
        }
      });
    });

    return codeElements.filter(el => this.isValidCodeBlock(el));
  }

  private isValidCodeBlock(element: HTMLElement): boolean {
    const code = element.textContent?.trim() || '';
    
    // Filter out very short code snippets (likely inline code)
    if (code.length < 10) return false;
    
    // Check if it contains multiple lines or programming constructs
    const hasMultipleLines = code.includes('\n');
    const hasProgrammingKeywords = /\b(function|class|def|import|const|let|var|if|for|while|return)\b/.test(code);
    
    return hasMultipleLines || hasProgrammingKeywords;
  }

  private processCodeBlock(codeElement: HTMLElement, messageElement: HTMLElement, index: number): void {
    const code = codeElement.textContent?.trim() || '';
    const language = this.detectLanguage(codeElement, code);
    const blockId = this.generateBlockId(messageElement, index);

    const codeBlock: CodeBlock = {
      id: blockId,
      language,
      code,
      element: codeElement,
      isProcessed: false
    };

    this.codeBlocks.set(blockId, codeBlock);
    this.addCodeControls(codeElement, codeBlock);
  }

  private detectLanguage(element: HTMLElement, code: string): string {
    // Check element classes first
    const classList = Array.from(element.classList);
    
    // Look for language indicators in classes
    for (const className of classList) {
      if (className.startsWith('language-')) {
        return className.replace('language-', '');
      }
      if (className.startsWith('hljs-')) {
        return className.replace('hljs-', '');
      }
    }

    // Check parent classes
    const parent = element.parentElement;
    if (parent) {
      for (const className of Array.from(parent.classList)) {
        if (className.startsWith('language-')) {
          return className.replace('language-', '');
        }
      }
    }

    // Fallback to content-based detection
    return this.detectLanguageFromContent(code);
  }

  private detectLanguageFromContent(code: string): string {
    const patterns = {
      python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /print\s*\(/, /class\s+\w+:/],
      javascript: [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /let\s+\w+\s*=/, /var\s+\w+\s*=/, /=>\s*{?/],
      typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*(string|number|boolean)/, /export\s+(interface|type|class)/],
      jsx: [/<\w+[^>]*>/, /className=/, /useState\s*\(/, /useEffect\s*\(/],
      css: [/\{[^}]*\}/, /\.\w+\s*\{/, /#\w+\s*\{/, /@media/],
      json: [/^\s*[\{\[]/, /"\w+":\s*["\d\{\[]/, /^\s*\{.*\}\s*$/],
      bash: [/^\s*\$/, /npm\s+install/, /cd\s+/, /ls\s+/, /mkdir\s+/],
      sql: [/SELECT\s+/, /FROM\s+/, /WHERE\s+/, /INSERT\s+INTO/, /UPDATE\s+/]
    };

    for (const [lang, langPatterns] of Object.entries(patterns)) {
      if (langPatterns.some(pattern => pattern.test(code))) {
        return lang;
      }
    }

    return 'text';
  }

  private generateBlockId(messageElement: HTMLElement, index: number): string {
    const messageId = messageElement.getAttribute('data-message-id') || 
                     messageElement.closest('[data-message-id]')?.getAttribute('data-message-id') ||
                     Date.now().toString();
    return `code-block-${messageId}-${index}`;
  }

  private addCodeControls(codeElement: HTMLElement, codeBlock: CodeBlock): void {
    // Find or create the container
    let container = codeElement.closest('.code-block-container');
    if (!container) {
      container = this.createCodeBlockContainer(codeElement, codeBlock);
    }

    // Add header with controls if not exists
    let header = container.querySelector('.code-block-header');
    if (!header) {
      header = this.createCodeBlockHeader(codeBlock);
      container.insertBefore(header, container.firstChild);
    }

    // Mark as processed
    codeBlock.isProcessed = true;
  }

  private createCodeBlockContainer(codeElement: HTMLElement, codeBlock: CodeBlock): HTMLElement {
    const container = document.createElement('div');
    container.className = 'code-block-container';
    container.setAttribute('data-block-id', codeBlock.id);

    // Wrap the existing code element
    const parent = codeElement.parentElement;
    if (parent) {
      parent.insertBefore(container, codeElement);
      container.appendChild(codeElement);
    }

    return container;
  }

  private createCodeBlockHeader(codeBlock: CodeBlock): HTMLElement {
    const header = document.createElement('div');
    header.className = 'code-block-header';
    
    const languageTag = document.createElement('span');
    languageTag.className = 'language-tag';
    languageTag.textContent = codeBlock.language;

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'code-actions';

    // Insert at cursor button
    const insertBtn = this.createActionButton('Insert', 'cursor', codeBlock.id, 'primary');
    insertBtn.title = 'Insert at cursor position';

    // Replace selection button
    const replaceBtn = this.createActionButton('Replace', 'selection', codeBlock.id);
    replaceBtn.title = 'Replace current selection';

    // New file button
    const newFileBtn = this.createActionButton('New File', 'newFile', codeBlock.id);
    newFileBtn.title = 'Create new file with this code';

    // Copy button
    const copyBtn = this.createActionButton('Copy', 'copy', codeBlock.id);
    copyBtn.title = 'Copy to clipboard';

    actionsContainer.appendChild(insertBtn);
    actionsContainer.appendChild(replaceBtn);
    actionsContainer.appendChild(newFileBtn);
    actionsContainer.appendChild(copyBtn);

    header.appendChild(languageTag);
    header.appendChild(actionsContainer);

    return header;
  }

  private createActionButton(text: string, action: string, blockId: string, variant: string = ''): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `code-btn ${variant}`;
    button.setAttribute('data-action', action);
    button.setAttribute('data-block-id', blockId);
    button.textContent = text;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleButtonClick(action, blockId, button);
    });

    return button;
  }

  private async handleButtonClick(action: string, blockId: string, button: HTMLButtonElement): Promise<void> {
    const codeBlock = this.codeBlocks.get(blockId);
    if (!codeBlock) {
      this.showError('Code block not found');
      return;
    }

    // Visual feedback
    this.showButtonFeedback(button);

    try {
      let result: InsertionResult;

      switch (action) {
        case 'cursor':
          result = await this.insertAtCursor(codeBlock);
          break;
        case 'selection':
          result = await this.replaceSelection(codeBlock);
          break;
        case 'newFile':
          result = await this.createNewFile(codeBlock);
          break;
        case 'copy':
          result = await this.copyToClipboard(codeBlock);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (result.success) {
        this.showSuccess(result.message);
        this.addToHistory(codeBlock, result);
      } else {
        this.showError(result.message);
      }

    } catch (error) {
      this.showError(`Failed to ${action}: ${error.message}`);
    }
  }

  private async insertAtCursor(codeBlock: CodeBlock): Promise<InsertionResult> {
    const editor = this.editorManager.getActiveEditor();
    if (!editor) {
      return { success: false, message: 'No active editor found' };
    }

    try {
      const position = editor.getPosition();
      const model = editor.getModel();
      
      // Get current line for indentation
      const currentLine = model.getLineContent(position.lineNumber);
      const indentation = this.detectIndentation(currentLine);
      
      // Format code with proper indentation
      const formattedCode = this.formatCodeWithIndentation(codeBlock.code, indentation);
      
      // Insert code
      editor.executeEdits('ai-assistant', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: formattedCode
      }]);

      // Move cursor to end of inserted code
      const lines = formattedCode.split('\n');
      const newPosition = {
        lineNumber: position.lineNumber + lines.length - 1,
        column: lines.length === 1 ? position.column + formattedCode.length : lines[lines.length - 1].length + 1
      };
      
      editor.setPosition(newPosition);
      editor.focus();

      // Visual feedback
      this.highlightInsertedCode(editor, position, formattedCode);

      return {
        success: true,
        message: `Code inserted at line ${position.lineNumber}`,
        position: newPosition
      };

    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private async replaceSelection(codeBlock: CodeBlock): Promise<InsertionResult> {
    const editor = this.editorManager.getActiveEditor();
    if (!editor) {
      return { success: false, message: 'No active editor found' };
    }

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      return { success: false, message: 'No text selected. Please select the code you want to replace.' };
    }

    try {
      // Get indentation from the first selected line
      const model = editor.getModel();
      const firstLine = model.getLineContent(selection.startLineNumber);
      const indentation = this.detectIndentation(firstLine);
      
      const formattedCode = this.formatCodeWithIndentation(codeBlock.code, indentation);

      editor.executeEdits('ai-assistant', [{
        range: selection,
        text: formattedCode
      }]);

      editor.focus();

      return {
        success: true,
        message: 'Selection replaced successfully',
        position: { line: selection.startLineNumber, column: selection.startColumn }
      };

    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private async createNewFile(codeBlock: CodeBlock): Promise<InsertionResult> {
    try {
      const fileName = await this.promptForFileName(codeBlock.language);
      if (!fileName) {
        return { success: false, message: 'File creation cancelled' };
      }

      // Use your existing file creation system
      const fileContent = this.addFileHeader(codeBlock.code, fileName, codeBlock.language);
      
      // Integrate with your file system
      await this.fileManager.createFile(fileName, fileContent);
      
      // Open the new file in editor
      await this.editorManager.openFile(fileName);

      return {
        success: true,
        message: `Created new file: ${fileName}`,
        fileName
      };

    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private async copyToClipboard(codeBlock: CodeBlock): Promise<InsertionResult> {
    try {
      await navigator.clipboard.writeText(codeBlock.code);
      return { success: true, message: 'Code copied to clipboard' };
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = codeBlock.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return { success: true, message: 'Code copied to clipboard' };
    }
  }

  private detectIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  private formatCodeWithIndentation(code: string, baseIndentation: string): string {
    const lines = code.split('\n');
    return lines.map((line, index) => {
      if (index === 0 && line.trim() === '') return line;
      if (line.trim() === '') return line;
      return baseIndentation + line;
    }).join('\n');
  }

  private async promptForFileName(language: string): Promise<string | null> {
    const extensions = {
      python: '.py',
      javascript: '.js',
      typescript: '.ts',
      jsx: '.jsx',
      css: '.css',
      json: '.json',
      bash: '.sh',
      sql: '.sql'
    };

    const defaultExt = extensions[language] || '.txt';
    const defaultName = `new_file${defaultExt}`;

    const fileName = prompt(`Enter filename for the new ${language} file:`, defaultName);
    return fileName?.trim() || null;
  }

  private addFileHeader(code: string, fileName: string, language: string): string {
    const headers = {
      python: `#!/usr/bin/env python3\n# ${fileName}\n# Generated by AI Assistant\n\n`,
      javascript: `// ${fileName}\n// Generated by AI Assistant\n\n`,
      typescript: `// ${fileName}\n// Generated by AI Assistant\n\n`
    };

    const header = headers[language] || `// ${fileName}\n// Generated by AI Assistant\n\n`;
    return header + code;
  }

  private highlightInsertedCode(editor: any, position: any, code: string): void {
    const lines = code.split('\n');
    const endPosition = {
      lineNumber: position.lineNumber + lines.length - 1,
      column: lines.length === 1 ? position.column + code.length : lines[lines.length - 1].length + 1
    };

    // Add decoration to highlight inserted code
    const decoration = editor.deltaDecorations([], [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column
      },
      options: {
        className: 'ai-inserted-code',
        isWholeLine: false
      }
    }]);

    // Remove highlight after 2 seconds
    setTimeout(() => {
      editor.deltaDecorations(decoration, []);
    }, 2000);
  }

  private showButtonFeedback(button: HTMLButtonElement): void {
    const originalBg = button.style.backgroundColor;
    button.style.backgroundColor = '#16825d';
    button.style.transform = 'translateY(-1px)';
    
    setTimeout(() => {
      button.style.backgroundColor = originalBg;
      button.style.transform = '';
    }, 200);
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    // Create or update notification system
    const notification = document.createElement('div');
    notification.className = `ai-notification ai-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private addToHistory(codeBlock: CodeBlock, result: InsertionResult): void {
    this.insertionHistory.push({
      code: codeBlock.code,
      position: result.position,
      timestamp: Date.now()
    });

    // Keep only last 50 insertions
    if (this.insertionHistory.length > 50) {
      this.insertionHistory.shift();
    }
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl/Cmd + Shift + I: Insert last copied code
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      this.insertLastCode();
    }
  }

  private async insertLastCode(): Promise<void> {
    const lastEntry = this.insertionHistory[this.insertionHistory.length - 1];
    if (!lastEntry) {
      this.showError('No code in history');
      return;
    }

    const fakeCodeBlock: CodeBlock = {
      id: 'history',
      language: 'text',
      code: lastEntry.code,
      element: null,
      isProcessed: true
    };

    await this.insertAtCursor(fakeCodeBlock);
  }

  private injectStyles(): void {
    if (document.getElementById('ai-code-insertion-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ai-code-insertion-styles';
    styles.textContent = `
      .code-block-container {
        margin: 15px 0;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #404040;
        background: #2d2d30;
      }

      .code-block-header {
        background: #404040;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }

      .language-tag {
        background: #007acc;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
        font-size: 11px;
      }

      .code-actions {
        display: flex;
        gap: 6px;
      }

      .code-btn {
        background: #0e639c;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }

      .code-btn:hover {
        background: #1177bb;
        transform: translateY(-1px);
      }

      .code-btn.primary {
        background: #16825d;
      }

      .code-btn.primary:hover {
        background: #1a9968;
      }

      .ai-inserted-code {
        background: rgba(22, 130, 93, 0.2);
        border: 1px solid rgba(22, 130, 93, 0.5);
      }

      .ai-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      }

      .ai-notification-success {
        background: #16825d;
      }

      .ai-notification-error {
        background: #d73a49;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;

    document.head.appendChild(styles);
  }

  // Public methods for external integration
  public getCodeBlocks(): CodeBlock[] {
    return Array.from(this.codeBlocks.values());
  }

  public getInsertionHistory(): Array<{code: string, position: any, timestamp: number}> {
    return [...this.insertionHistory];
  }

  public async insertCodeManually(code: string, language: string = 'text'): Promise<InsertionResult> {
    const fakeCodeBlock: CodeBlock = {
      id: 'manual',
      language,
      code,
      element: null,
      isProcessed: true
    };

    return this.insertAtCursor(fakeCodeBlock);
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove event listeners
    window.removeEventListener('ai-code-insert', this.handleCodeInsertion.bind(this));
    window.removeEventListener('ai-code-replace', this.handleCodeReplacement.bind(this));
    window.removeEventListener('ai-code-newfile', this.handleNewFileCreation.bind(this));
    
    // Clean up
    this.codeBlocks.clear();
    this.insertionHistory = [];
  }

  private handleCodeInsertion = (event: CustomEvent) => {
    // Handle external insertion requests
  };

  private handleCodeReplacement = (event: CustomEvent) => {
    // Handle external replacement requests
  };

  private handleNewFileCreation = (event: CustomEvent) => {
    // Handle external file creation requests
  };
}