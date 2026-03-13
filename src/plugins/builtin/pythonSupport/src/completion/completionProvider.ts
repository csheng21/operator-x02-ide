// plugins/builtin/pythonSupport/src/completion/completionProvider.ts
import { PluginApi } from '../../../../core/pluginInterface';
import { getPythonBuiltins, getPythonKeywords } from './completionItems';

export function setupCompletionProvider(api: PluginApi): void {
  // Register a listener for editor changes
  api.editor.onDocumentChanged((document) => {
    // Only provide completions for Python files
    if (document.getLanguage() !== 'python') return;
    
    // Get the current position and text
    const editor = api.editor.getActiveEditor();
    if (!editor) return;
    
    // Register completion provider
    editor.registerCompletionProvider({
      provideCompletionItems: (model, position) => {
        // Get the text before the cursor
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        // Simple word extraction (would be more sophisticated in a real plugin)
        const wordMatch = textUntilPosition.match(/[\w\d]+$/);
        if (!wordMatch) return [];
        
        const word = wordMatch[0];
        
        // Get completions based on context
        return getCompletionsForWord(word);
      }
    });
  });
}

function getCompletionsForWord(word: string): any[] {
  // Get built-ins and keywords that match
  const builtins = getPythonBuiltins().filter(item => 
    item.label.startsWith(word)
  );
  
  const keywords = getPythonKeywords().filter(item => 
    item.label.startsWith(word)
  );
  
  // Combine results
  return [...builtins, ...keywords];
}