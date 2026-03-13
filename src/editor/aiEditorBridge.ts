// editor/aiEditorBridge.ts

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface EditorRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface EditorSelection extends EditorRange {
  isEmpty(): boolean;
  getStartPosition(): EditorPosition;
  getEndPosition(): EditorPosition;
}

export interface CodeInsertionOptions {
  position?: 'cursor' | 'start' | 'end' | EditorPosition;
  mode: 'insert' | 'replace' | 'append' | 'prepend';
  selection?: EditorRange;
  preserveIndentation?: boolean;
  autoFormat?: boolean;
  focusAfter?: boolean;
  highlightDuration?: number;
}

export interface InsertionResult {
  success: boolean;
  message: string;
  insertedRange?: EditorRange;
  finalPosition?: EditorPosition;
  error?: string;
}

export interface EditorInfo {
  id: string;
  fileName?: string;
  language: string;
  isActive: boolean;
  model: any;
  instance: any;
}

export interface MonacoEditor {
  getModel(): any;
  getPosition(): EditorPosition;
  setPosition(position: EditorPosition): void;
  getSelection(): EditorSelection | null;
  setSelection(selection: EditorRange): void;
  executeEdits(source: string, edits: any[]): boolean;
  deltaDecorations(oldDecorations: string[], newDecorations: any[]): string[];
  focus(): void;
  getValue(): string;
  setValue(value: string): void;
  getScrollTop(): number;
  setScrollTop(scrollTop: number): void;
  revealLine(lineNumber: number): void;
  revealRange(range: EditorRange): void;
  onDidChangeModelContent(listener: () => void): { dispose(): void };
  onDidChangeCursorPosition(listener: (e: any) => void): { dispose(): void };
  onDidFocusEditorWidget(listener: () => void): { dispose(): void };
  onDidBlurEditorWidget(listener: () => void): { dispose(): void };
}

export class AIEditorBridge {
  private editorManager: any;
  private monaco: any;
  private activeEditor: MonacoEditor | null = null;
  private editorInstances: Map<string, EditorInfo> = new Map();
  private eventListeners: Array<{ dispose(): void }> = [];
  private decorationIds: Map<string, string[]> = new Map();
  private insertionHistory: Array<{
    code: string;
    range: EditorRange;
    timestamp: number;
    editorId: string;
  }> = [];

  constructor(editorManager: any, monaco?: any) {
    this.editorManager = editorManager;
    this.monaco = monaco;
    this.initialize();
  }

  private initialize(): void {
    this.setupEditorTracking();
    this.setupGlobalEventListeners();
    this.refreshEditorInstances();
  }

  private setupEditorTracking(): void {
    // Track active editor changes
    if (this.editorManager.onActiveEditorChanged) {
      const disposable = this.editorManager.onActiveEditorChanged((editor: any) => {
        this.setActiveEditor(editor);
      });
      this.eventListeners.push(disposable);
    }

    // Track new editor creation
    if (this.editorManager.onEditorCreated) {
      const disposable = this.editorManager.onEditorCreated((editor: any) => {
        this.registerEditor(editor);
      });
      this.eventListeners.push(disposable);
    }

    // Track editor disposal
    if (this.editorManager.onEditorDisposed) {
      const disposable = this.editorManager.onEditorDisposed((editorId: string) => {
        this.unregisterEditor(editorId);
      });
      this.eventListeners.push(disposable);
    }
  }

  private setupGlobalEventListeners(): void {
    // Listen for external AI requests
    window.addEventListener('ai-editor-insert', this.handleExternalInsert.bind(this));
    window.addEventListener('ai-editor-replace', this.handleExternalReplace.bind(this));
    window.addEventListener('ai-editor-focus', this.handleExternalFocus.bind(this));
    window.addEventListener('ai-editor-select', this.handleExternalSelect.bind(this));
  }

  private refreshEditorInstances(): void {
    // Get all current editors from editor manager
    const editors = this.editorManager.getAllEditors?.() || [];
    
    editors.forEach((editor: any) => {
      this.registerEditor(editor);
    });

    // Set active editor
    const activeEditor = this.editorManager.getActiveEditor?.();
    if (activeEditor) {
      this.setActiveEditor(activeEditor);
    }
  }

  private registerEditor(editor: any): void {
    const editorId = this.generateEditorId(editor);
    const model = editor.getModel();
    
    const editorInfo: EditorInfo = {
      id: editorId,
      fileName: model?.uri?.path || `untitled-${editorId}`,
      language: model?.getLanguageId() || 'text',
      isActive: false,
      model: model,
      instance: editor
    };

    this.editorInstances.set(editorId, editorInfo);
    this.setupEditorEventListeners(editor, editorId);
  }

  private unregisterEditor(editorId: string): void {
    this.editorInstances.delete(editorId);
    this.decorationIds.delete(editorId);
    
    if (this.activeEditor && this.getEditorId(this.activeEditor) === editorId) {
      this.activeEditor = null;
    }
  }

  private setupEditorEventListeners(editor: MonacoEditor, editorId: string): void {
    // Track cursor position changes
    const cursorDisposable = editor.onDidChangeCursorPosition((e: any) => {
      this.emitEditorEvent('cursor-changed', { editorId, position: e.position });
    });
    this.eventListeners.push(cursorDisposable);

    // Track content changes
    const contentDisposable = editor.onDidChangeModelContent(() => {
      this.emitEditorEvent('content-changed', { editorId });
    });
    this.eventListeners.push(contentDisposable);

    // Track focus changes
    const focusDisposable = editor.onDidFocusEditorWidget(() => {
      this.setActiveEditor(editor);
      this.emitEditorEvent('editor-focused', { editorId });
    });
    this.eventListeners.push(focusDisposable);

    const blurDisposable = editor.onDidBlurEditorWidget(() => {
      this.emitEditorEvent('editor-blurred', { editorId });
    });
    this.eventListeners.push(blurDisposable);
  }

  private setActiveEditor(editor: MonacoEditor | null): void {
    // Update previous active editor
    if (this.activeEditor) {
      const prevId = this.getEditorId(this.activeEditor);
      const prevInfo = this.editorInstances.get(prevId);
      if (prevInfo) {
        prevInfo.isActive = false;
      }
    }

    this.activeEditor = editor;

    // Update new active editor
    if (editor) {
      const editorId = this.getEditorId(editor);
      const editorInfo = this.editorInstances.get(editorId);
      if (editorInfo) {
        editorInfo.isActive = true;
      }
    }
  }

  private generateEditorId(editor: any): string {
    // Try to get unique identifier from editor or model
    const model = editor.getModel();
    if (model?.uri?.path) {
      return model.uri.path;
    }
    
    // Fallback to instance-based ID
    return `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEditorId(editor: MonacoEditor): string {
    for (const [id, info] of this.editorInstances.entries()) {
      if (info.instance === editor) {
        return id;
      }
    }
    return this.generateEditorId(editor);
  }

  // Public API Methods

  public getActiveEditor(): MonacoEditor | null {
    return this.activeEditor;
  }

  public getEditorById(editorId: string): MonacoEditor | null {
    const info = this.editorInstances.get(editorId);
    return info?.instance || null;
  }

  public getAllEditors(): EditorInfo[] {
    return Array.from(this.editorInstances.values());
  }

  public getActiveEditorInfo(): EditorInfo | null {
    if (!this.activeEditor) return null;
    const editorId = this.getEditorId(this.activeEditor);
    return this.editorInstances.get(editorId) || null;
  }

  public async insertCode(
    code: string, 
    options: CodeInsertionOptions = { mode: 'insert' }
  ): Promise<InsertionResult> {
    const editor = this.activeEditor;
    if (!editor) {
      return { success: false, message: 'No active editor available' };
    }

    try {
      const model = editor.getModel();
      if (!model) {
        return { success: false, message: 'Editor model not available' };
      }

      // Determine insertion position
      const insertPosition = this.resolveInsertionPosition(editor, options.position);
      
      // Format code if needed
      const formattedCode = await this.formatCode(code, editor, insertPosition, options);
      
      // Perform insertion
      const range = this.createInsertionRange(insertPosition, options);
      const insertionRange = await this.performInsertion(editor, formattedCode, range, options.mode);
      
      // Handle post-insertion tasks
      await this.handlePostInsertion(editor, insertionRange, options);
      
      // Track in history
      this.addToHistory(code, insertionRange, this.getEditorId(editor));

      return {
        success: true,
        message: `Code ${options.mode}ed successfully`,
        insertedRange: insertionRange,
        finalPosition: editor.getPosition()
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to ${options.mode} code: ${error.message}`,
        error: error.message
      };
    }
  }

  public async replaceSelection(code: string, options: Partial<CodeInsertionOptions> = {}): Promise<InsertionResult> {
    const editor = this.activeEditor;
    if (!editor) {
      return { success: false, message: 'No active editor available' };
    }

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      return { success: false, message: 'No text selected for replacement' };
    }

    return this.insertCode(code, {
      ...options,
      mode: 'replace',
      selection: selection
    });
  }

  public async insertAtPosition(code: string, position: EditorPosition, options: Partial<CodeInsertionOptions> = {}): Promise<InsertionResult> {
    return this.insertCode(code, {
      ...options,
      position,
      mode: 'insert'
    });
  }

  public async appendToEnd(code: string, options: Partial<CodeInsertionOptions> = {}): Promise<InsertionResult> {
    return this.insertCode(code, {
      ...options,
      position: 'end',
      mode: 'append'
    });
  }

  public async prependToStart(code: string, options: Partial<CodeInsertionOptions> = {}): Promise<InsertionResult> {
    return this.insertCode(code, {
      ...options,
      position: 'start',
      mode: 'prepend'
    });
  }

  private resolveInsertionPosition(editor: MonacoEditor, position?: 'cursor' | 'start' | 'end' | EditorPosition): EditorPosition {
    switch (position) {
      case 'start':
        return { lineNumber: 1, column: 1 };
      
      case 'end':
        const model = editor.getModel();
        const lineCount = model.getLineCount();
        return { lineNumber: lineCount, column: model.getLineMaxColumn(lineCount) };
      
      case 'cursor':
      case undefined:
        return editor.getPosition();
      
      default:
        return position as EditorPosition;
    }
  }

  private async formatCode(
    code: string, 
    editor: MonacoEditor, 
    position: EditorPosition, 
    options: CodeInsertionOptions
  ): Promise<string> {
    if (!options.preserveIndentation) {
      return code;
    }

    const model = editor.getModel();
    const currentLine = model.getLineContent(position.lineNumber);
    const indentation = this.detectIndentation(currentLine);
    
    return this.applyIndentation(code, indentation);
  }

  private detectIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  private applyIndentation(code: string, baseIndentation: string): string {
    const lines = code.split('\n');
    return lines.map((line, index) => {
      if (index === 0 || line.trim() === '') return line;
      return baseIndentation + line;
    }).join('\n');
  }

  private createInsertionRange(position: EditorPosition, options: CodeInsertionOptions): EditorRange {
    if (options.selection) {
      return options.selection;
    }

    return {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };
  }

  private async performInsertion(
    editor: MonacoEditor, 
    code: string, 
    range: EditorRange, 
    mode: 'insert' | 'replace' | 'append' | 'prepend'
  ): Promise<EditorRange> {
    const model = editor.getModel();
    
    let finalRange: EditorRange;
    
    switch (mode) {
      case 'insert':
      case 'replace':
        editor.executeEdits('ai-assistant', [{
          range: range,
          text: code
        }]);
        finalRange = this.calculateInsertedRange(range, code);
        break;
        
      case 'append':
        const appendText = '\n' + code;
        editor.executeEdits('ai-assistant', [{
          range: range,
          text: appendText
        }]);
        finalRange = this.calculateInsertedRange(range, appendText);
        break;
        
      case 'prepend':
        const prependText = code + '\n';
        editor.executeEdits('ai-assistant', [{
          range: range,
          text: prependText
        }]);
        finalRange = this.calculateInsertedRange(range, prependText);
        break;
        
      default:
        throw new Error(`Unknown insertion mode: ${mode}`);
    }

    return finalRange;
  }

  private calculateInsertedRange(originalRange: EditorRange, insertedText: string): EditorRange {
    const lines = insertedText.split('\n');
    const lineCount = lines.length;
    
    if (lineCount === 1) {
      return {
        startLineNumber: originalRange.startLineNumber,
        startColumn: originalRange.startColumn,
        endLineNumber: originalRange.startLineNumber,
        endColumn: originalRange.startColumn + insertedText.length
      };
    } else {
      return {
        startLineNumber: originalRange.startLineNumber,
        startColumn: originalRange.startColumn,
        endLineNumber: originalRange.startLineNumber + lineCount - 1,
        endColumn: lines[lines.length - 1].length + 1
      };
    }
  }

  private async handlePostInsertion(
    editor: MonacoEditor, 
    insertedRange: EditorRange, 
    options: CodeInsertionOptions
  ): Promise<void> {
    // Auto-format if requested
    if (options.autoFormat) {
      await this.formatInsertedCode(editor, insertedRange);
    }

    // Focus editor if requested
    if (options.focusAfter !== false) {
      editor.focus();
    }

    // Highlight inserted code
    if (options.highlightDuration !== 0) {
      this.highlightRange(editor, insertedRange, options.highlightDuration || 2000);
    }

    // Move cursor to end of insertion
    const endPosition: EditorPosition = {
      lineNumber: insertedRange.endLineNumber,
      column: insertedRange.endColumn
    };
    editor.setPosition(endPosition);

    // Reveal the inserted code
    editor.revealRange(insertedRange);
  }

  private async formatInsertedCode(editor: MonacoEditor, range: EditorRange): Promise<void> {
    try {
      // Use Monaco's formatting provider if available
      const model = editor.getModel();
      const languageId = model.getLanguageId();
      
      if (this.monaco?.languages?.getDocumentFormattingEdits) {
        const edits = await this.monaco.languages.getDocumentFormattingEdits(
          model.uri,
          { insertSpaces: true, tabSize: 2 }
        );
        
        if (edits && edits.length > 0) {
          editor.executeEdits('ai-assistant-format', edits);
        }
      }
    } catch (error) {
      console.warn('Auto-formatting failed:', error);
    }
  }

  private highlightRange(editor: MonacoEditor, range: EditorRange, duration: number): void {
    const editorId = this.getEditorId(editor);
    
    const decorations = editor.deltaDecorations([], [{
      range: range,
      options: {
        className: 'ai-inserted-code-highlight',
        stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        isWholeLine: false
      }
    }]);

    // Store decoration IDs for cleanup
    if (!this.decorationIds.has(editorId)) {
      this.decorationIds.set(editorId, []);
    }
    this.decorationIds.get(editorId)!.push(...decorations);

    // Remove highlight after duration
    setTimeout(() => {
      editor.deltaDecorations(decorations, []);
      const editorDecorations = this.decorationIds.get(editorId) || [];
      decorations.forEach(id => {
        const index = editorDecorations.indexOf(id);
        if (index > -1) {
          editorDecorations.splice(index, 1);
        }
      });
    }, duration);
  }

  // Selection and cursor management
  public selectRange(range: EditorRange, editorId?: string): boolean {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return false;

    editor.setSelection(range);
    editor.revealRange(range);
    return true;
  }

  public moveCursor(position: EditorPosition, editorId?: string): boolean {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return false;

    editor.setPosition(position);
    editor.revealLine(position.lineNumber);
    return true;
  }

  public getCurrentSelection(editorId?: string): EditorSelection | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    return editor.getSelection();
  }

  public getCurrentPosition(editorId?: string): EditorPosition | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    return editor.getPosition();
  }

  // Content management
  public getEditorContent(editorId?: string): string | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    return editor.getValue();
  }

  public getSelectedText(editorId?: string): string | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return null;

    const model = editor.getModel();
    return model.getValueInRange(selection);
  }

  public getRangeText(range: EditorRange, editorId?: string): string | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    const model = editor.getModel();
    return model.getValueInRange(range);
  }

  // History and undo management
  private addToHistory(code: string, range: EditorRange, editorId: string): void {
    this.insertionHistory.push({
      code,
      range,
      timestamp: Date.now(),
      editorId
    });

    // Keep only last 100 insertions
    if (this.insertionHistory.length > 100) {
      this.insertionHistory.shift();
    }
  }

  public getInsertionHistory(): Array<{
    code: string;
    range: EditorRange;
    timestamp: number;
    editorId: string;
  }> {
    return [...this.insertionHistory];
  }

  public getLastInsertion(): { code: string; range: EditorRange; timestamp: number; editorId: string } | null {
    return this.insertionHistory[this.insertionHistory.length - 1] || null;
  }

  // Event handling
  private emitEditorEvent(eventType: string, data: any): void {
    const event = new CustomEvent(`ai-editor-${eventType}`, { detail: data });
    window.dispatchEvent(event);
  }

  private handleExternalInsert = async (event: CustomEvent) => {
    const { code, options } = event.detail;
    const result = await this.insertCode(code, options);
    this.emitEditorEvent('insert-complete', { result });
  };

  private handleExternalReplace = async (event: CustomEvent) => {
    const { code, options } = event.detail;
    const result = await this.replaceSelection(code, options);
    this.emitEditorEvent('replace-complete', { result });
  };

  private handleExternalFocus = (event: CustomEvent) => {
    const { editorId } = event.detail;
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (editor) {
      editor.focus();
    }
  };

  private handleExternalSelect = (event: CustomEvent) => {
    const { range, editorId } = event.detail;
    this.selectRange(range, editorId);
  };

  // Utility methods
  public isEditorActive(editorId: string): boolean {
    const info = this.editorInstances.get(editorId);
    return info?.isActive || false;
  }

  public hasActiveEditor(): boolean {
    return this.activeEditor !== null;
  }

  public getEditorLanguage(editorId?: string): string | null {
    const editor = editorId ? this.getEditorById(editorId) : this.activeEditor;
    if (!editor) return null;

    const model = editor.getModel();
    return model?.getLanguageId() || null;
  }

  public canInsertCode(): boolean {
    return this.hasActiveEditor();
  }

  // Cleanup
  public dispose(): void {
    // Dispose all event listeners
    this.eventListeners.forEach(listener => listener.dispose());
    this.eventListeners = [];

    // Clear decorations
    this.decorationIds.forEach((decorations, editorId) => {
      const editor = this.getEditorById(editorId);
      if (editor && decorations.length > 0) {
        editor.deltaDecorations(decorations, []);
      }
    });

    // Clear data
    this.editorInstances.clear();
    this.decorationIds.clear();
    this.insertionHistory = [];
    this.activeEditor = null;

    // Remove global event listeners
    window.removeEventListener('ai-editor-insert', this.handleExternalInsert);
    window.removeEventListener('ai-editor-replace', this.handleExternalReplace);
    window.removeEventListener('ai-editor-focus', this.handleExternalFocus);
    window.removeEventListener('ai-editor-select', this.handleExternalSelect);
  }
}