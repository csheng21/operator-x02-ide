// src/directFileOpenerCore.ts
import { setupFileClickHandlers, setupDirectoryClickHandlers } from './directFileOpenerHandlers';

/**
 * Direct file opener that bypasses normal file loading and shows mock content
 */
export function initializeDirectFileOpener(): void {
  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDirectFileOpener);
  } else {
    setupDirectFileOpener();
  }
}

/**
 * Setup direct handlers for file clicks
 */
function setupDirectFileOpener(): void {
  console.log('Setting up direct file opener');
  
  // Listen for file-selected events
  document.addEventListener('file-selected', handleFileSelectedEvent);
  
  // Set up click handlers for all items
  setInterval(() => {
    setupFileClickHandlers();
    setupDirectoryClickHandlers();
  }, 2000);
}


// Handle file-selected event
function handleFileSelectedEvent(e: Event): void {
  const customEvent = e as CustomEvent;
  if (customEvent.detail && customEvent.detail.path) {
    const filePath = customEvent.detail.path;
    console.log('Direct file opener: Opening file', filePath);
    
    // Get the monaco editor
    const editorContainer = document.getElementById('monaco-editor');
    if (!editorContainer) {
      console.error('Editor container not found');
      return;
    }
    
    // Wait for Monaco to be available
    ensureMonaco().then(monaco => {
      // Generate mock content based on file type
      const content = generateFileContent(filePath);
      const language = getLanguageFromPath(filePath);
      
      // Get existing editor or create a new one
      let editor = monaco.editor.getEditors()[0];
      if (!editor) {
        editor = monaco.editor.create(editorContainer, {
          value: content,
          language: language,
          theme: 'vs-dark',
          automaticLayout: true
        });
      } else {
        // Create a new model with the content
        const model = monaco.editor.createModel(content, language);
        editor.setModel(model);
      }
      
      // Update status bar
      updateStatusBar(language, filePath);
      
      console.log('File opened with mock content');
    }).catch(error => {
      console.error('Error opening file:', error);
    });
  }
}

// Re-export everything from other modules
export { 
  setupFileClickHandlers, 
  setupDirectoryClickHandlers 
} from './directFileOpenerHandlers';

export {
  generateFileContent,
  getLanguageFromPath,
  updateStatusBar,
  ensureMonaco
} from './directFileOpenerUtils';