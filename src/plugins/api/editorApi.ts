// src/plugins/api/editorApi.ts

export class EditorApi {
  constructor() {
    console.log('Editor API initialized');
  }
  
  getActiveEditor(): any {
    // Get the Monaco editor instance
    return window.monaco?.editor?.getEditors?.()?.[0] || null;
  }
  
  getDocument(id?: string): any {
    const editor = this.getActiveEditor();
    if (!editor) return null;
    
    // Return a document-like interface
    return {
      getText: () => editor.getValue(),
      setText: (text: string) => editor.setValue(text),
      getFileName: () => {
        const tab = document.querySelector('.editor-tab.active .tab-title');
        return tab?.textContent || 'untitled';
      },
      getLanguage: () => editor.getModel()?.getLanguageId() || 'plaintext'
    };
  }
  
  getSelectedText(): string {
    const editor = this.getActiveEditor();
    if (!editor) return '';
    
    const selection = editor.getSelection();
    if (!selection) return '';
    
    return editor.getModel()?.getValueInRange(selection) || '';
  }
  
  insertText(text: string): void {
    const editor = this.getActiveEditor();
    if (!editor) return;
    
    const selection = editor.getSelection();
    editor.executeEdits('plugin', [{
      range: selection,
      text: text
    }]);
  }
  
  insertSnippet(snippet: string): void {
    // Simple implementation just inserts the text
    // A real implementation would handle snippet placeholders
    this.insertText(snippet);
  }
  
  onDocumentChanged(callback: (document: any) => void): void {
    const editor = this.getActiveEditor();
    if (!editor) return;
    
    // Monaco editor event
    editor.onDidChangeModelContent(() => {
      callback(this.getDocument());
    });
  }
}