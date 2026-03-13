// src/directFileOpener/monaco/editorUtils.ts

/**
 * Setup Monaco validation for JavaScript and TypeScript
 */
function setupMonacoValidation(monaco: any): void {
  try {
    // ✅ Enable JavaScript validation
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,  // Enable semantic checks
      noSyntaxValidation: false,    // Enable syntax checks
      noSuggestionDiagnostics: false
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: true,  // ✅ Enable type checking for JS files
      strict: false,
      lib: ['es2020', 'dom']
    });

    // ✅ Enable TypeScript validation
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: true,
      lib: ['es2020', 'dom']
    });

    console.log('✅ Monaco validation enabled (JS & TS error checking active)');
  } catch (error) {
    console.error('❌ Error setting up Monaco validation:', error);
  }
}

/**
 * Make sure Monaco editor is initialized
 */
export function ensureMonaco(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.monaco) {
      // ✅ Setup validation if Monaco is already loaded
      setupMonacoValidation(window.monaco);
      resolve(window.monaco);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = 100; // ms
    
    const checkMonaco = () => {
      attempts++;
      if (window.monaco) {
        // ✅ Setup validation when Monaco loads
        setupMonacoValidation(window.monaco);
        resolve(window.monaco);
        return;
      }
      
      if (attempts > maxAttempts) {
        reject(new Error(`Monaco not available after ${maxAttempts} attempts`));
        return;
      }
      
      setTimeout(checkMonaco, checkInterval);
    };
    
    checkMonaco();
  });
}

/**
 * Create or update a Monaco editor with the given content
 */
export function createOrUpdateEditor(
  monaco: any,
  container: HTMLElement,
  content: string,
  language: string
): any {
  // Get existing editor or create a new one
  let editor = monaco.editor.getEditors()[0];
  
  if (!editor) {
    // Create new editor
    editor = monaco.editor.create(container, {
      value: content,
      language: language,
      theme: 'vs-dark',
      automaticLayout: true,
      // ✅ Additional editor options for better error display
      minimap: { enabled: true },
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
      },
      glyphMargin: true,  // Show error icons in the margin
      folding: true,
      lineNumbers: 'on',
      renderWhitespace: 'selection'
    });
  } else {
    // Update existing editor
    const model = monaco.editor.createModel(content, language);
    editor.setModel(model);
  }
  
  return editor;
}

// Add type definition for Monaco to the global window
declare global {
  interface Window {
    monaco: any;
  }
}