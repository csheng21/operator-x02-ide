// plugins/builtin/pythonSupport/src/hover/documentationProvider.ts
import { PluginApi } from '../../../../core/pluginInterface';

export function setupDocumentationProvider(api: PluginApi): void {
  // Register a hover provider for Python files
  api.editor.onDocumentChanged((document) => {
    // Only provide hover for Python files
    if (document.getLanguage() !== 'python') return;
    
    const editor = api.editor.getActiveEditor();
    if (!editor) return;
    
    // Register hover provider
    editor.registerHoverProvider({
      provideHover: (model, position) => {
        // Get the word at position
        const wordAtPosition = model.getWordAtPosition(position);
        if (!wordAtPosition) return null;
        
        // Get documentation for the word
        const documentation = getPythonDocumentation(wordAtPosition.word);
        if (!documentation) return null;
        
        // Return hover content
        return {
          contents: [
            { value: `**${wordAtPosition.word}**` },
            { value: documentation }
          ],
          range: {
            startLineNumber: position.lineNumber,
            startColumn: wordAtPosition.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: wordAtPosition.endColumn
          }
        };
      }
    });
  });
}

function getPythonDocumentation(word: string): string | null {
  // This would typically query a Python documentation database
  // For demonstration, we'll just provide docs for a few built-ins
  const docs: Record<string, string> = {
    'print': 'print(*args, sep=" ", end="\\n", file=sys.stdout, flush=False)\n\nPrint objects to the text stream file, separated by sep and followed by end.',
    'len': 'len(obj)\n\nReturn the length (the number of items) of an object.',
    'range': 'range(stop) or range(start, stop[, step])\n\nReturn a sequence of numbers.',
    'str': 'str(object="") -> str\n\nReturn a string version of object.',
    'int': 'int(x=0) -> integer\n\nConvert a number or string to an integer.',
    'list': 'list() -> new empty list\nlist(iterable) -> new list initialized from iterable\'s items',
    'dict': 'dict() -> new empty dictionary\ndict(mapping) -> new dictionary initialized from a mapping object\'s\n    (key, value) pairs'
  };
  
  return docs[word] || null;
}