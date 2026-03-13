// src/editor/editorManager.ts
import { FileNode } from '../ide/fileExplorer/types';
import { tabManager } from './tabManager';
import { markFileAsModified, markFileAsSaved } from '../ide/fileExplorer/fileTreeRenderer';

// ============================================================================
// ✅ NEW: AI CODE WRITING FEATURES - Add these imports
// ============================================================================
import { initializeInlineAICodeWriter } from '../ide/aiAssistant/inlineAICodeWriter';
import { initializeSelectionAIEditor } from '../ide/aiAssistant/selectionAIEditor';
import { initializeQuickAICommand } from '../ide/aiAssistant/quickAICommand';
import { initializeAICodeAssistantPanel, AICodeAssistantPanel } from '../ide/aiAssistant/aiCodeAssistantPanel';

// ============================================================================
// Editor state
let monacoEditor: any = null;
let currentFilePath: string = '';
let openFiles: Map<string, {model: any, viewState: any}> = new Map();

// ✅ NEW: Track original content for change detection
const originalContents = new Map<string, string>();

// ✅ NEW: AI Assistant Panel instance
let aiAssistantPanel: AICodeAssistantPanel | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize the Monaco editor
export function initializeEditor(): Promise<void> {
  console.log('Starting editor initialization');
  
  return new Promise((resolve, reject) => {
    // Check if Monaco is available
    if (typeof window.monaco === 'undefined') {
      console.log('Monaco not available yet, waiting...');
      const waitForMonaco = setInterval(() => {
        if (typeof window.monaco !== 'undefined') {
          clearInterval(waitForMonaco);
          createEditor().then(resolve).catch(reject);
        }
      }, 200);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(waitForMonaco);
        reject(new Error('Timeout waiting for Monaco to load'));
      }, 10000);
    } else {
      createEditor().then(resolve).catch(reject);
    }
  });
}

// Create the actual editor instance
async function createEditor(): Promise<void> {
  const editorContainer = document.getElementById('monaco-editor');
  if (!editorContainer) {
    console.error('Editor container not found');
    throw new Error('Editor container not found');
  }
  
  try {
    console.log('Creating Monaco editor instance');
    // Create editor with dark theme
    monacoEditor = monaco.editor.create(editorContainer, {
      value: '// Welcome to operator X02 Code IDE\n// Open a file to start editing\n// Press Ctrl+Shift+I for AI code generation!',
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {
        enabled: true
      },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      tabSize: 2,
      lineNumbers: 'on',
      wordWrap: 'on'
    });
    
    // Connect tab manager to editor
    tabManager.setupChangeTracking(monacoEditor);
    
    // ✅ NEW: Setup modified file tracking
    setupModifiedFileTracking();
    
    // Set up editor events
    monacoEditor.onDidChangeModelContent(() => {
      if (currentFilePath) {
        saveFileState();
        
        // Dispatch a modelChanged event
        const changeEvent = new CustomEvent('editor-content-changed', {
          detail: { path: currentFilePath }
        });
        document.dispatchEvent(changeEvent);
        
        // ✅ NEW: Update AI panel context when content changes
        if (aiAssistantPanel) {
          aiAssistantPanel.setEditor(monacoEditor);
        }
      }
    });
    
    // Listen for tab-driven model changes
    document.addEventListener('tab-activated', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.path) {
        currentFilePath = detail.path;
        console.log(`Editor handling tab activation for ${detail.path}`);
        
        // ✅ NEW: Update AI panel when tab changes
        if (aiAssistantPanel) {
          aiAssistantPanel.setEditor(monacoEditor);
        }
      }
    });

    // Update cursor position in status bar
    monacoEditor.onDidChangeCursorPosition(updateCursorPosition);
    
    // ✅ NEW: Update AI panel on cursor position change
    monacoEditor.onDidChangeCursorPosition(() => {
      if (aiAssistantPanel) {
        aiAssistantPanel.setEditor(monacoEditor);
      }
    });

    // Set up keyboard shortcuts
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrentFile);

    // ============================================================================
    // ✅ NEW: Initialize AI Code Writing Features
    // ============================================================================
    console.log('🤖 Initializing AI Code Writing Features...');
    
    try {
      // Get the monaco instance
      const monacoInstance = (window as any).monaco;
      
      if (monacoInstance) {
        // 1. Inline Code Generator (Ctrl+Shift+I)
        initializeInlineAICodeWriter(monacoInstance);
        console.log('✅ Inline AI Code Writer initialized (Ctrl+Shift+I)');
        
        // 2. Selection Editor (Ctrl+Shift+E)
        initializeSelectionAIEditor(monacoInstance);
        console.log('✅ Selection AI Editor initialized (Ctrl+Shift+E)');
        
        // 3. Quick Command (Ctrl+K)
        initializeQuickAICommand(monacoInstance);
        console.log('✅ Quick AI Command initialized (Ctrl+K)');
        
        // 4. AI Assistant Panel (Ctrl+Alt+A)
        aiAssistantPanel = initializeAICodeAssistantPanel(monacoInstance);
        aiAssistantPanel.setEditor(monacoEditor);
        console.log('✅ AI Assistant Panel initialized (Ctrl+Alt+A)');
        
        console.log('🎉 All AI Code Writing Features initialized successfully!');
        
        // Show welcome notification
        showAIFeaturesWelcome();
        
      } else {
        console.error('❌ Monaco instance not available for AI features');
      }
      
    } catch (error) {
      console.error('❌ Error initializing AI features:', error);
      // Don't fail the whole initialization if AI features fail
    }
    // ============================================================================
    // END OF AI FEATURES INITIALIZATION
    // ============================================================================

    console.log('Monaco editor initialized successfully');
    
    // Set up file integration
    setupFileTreeIntegration();
    
    // ✅ NEW: Make update function globally available
    (window as any).__updateOriginalContent = (uri: string, content: string) => {
      originalContents.set(uri, content);
      console.log(`📝 Updated original content for ${uri}: ${content.length} chars`);
    };
    
  } catch (error) {
    console.error('Error creating Monaco editor:', error);
    throw error;
  }
  
  addForceReloadButton();
}

// ============================================================================
// ✅ NEW: AI FEATURES WELCOME SCREEN
// ============================================================================

/**
 * Show welcome message about AI features
 */
function showAIFeaturesWelcome(): void {
  // Only show once per session
  if (sessionStorage.getItem('ai-features-welcome-shown')) {
    return;
  }
  
  sessionStorage.setItem('ai-features-welcome-shown', 'true');
  
  // Create a welcome overlay
  const welcome = document.createElement('div');
  welcome.className = 'ai-features-welcome';
  welcome.innerHTML = `
    <div class="welcome-overlay"></div>
    <div class="welcome-content">
      <h2>🤖 AI Code Writing Features Ready!</h2>
      <p>Use these keyboard shortcuts to code faster:</p>
      <div class="shortcuts">
        <div class="shortcut-item">
          <kbd>Ctrl+Shift+I</kbd>
          <span>Generate new code at cursor</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl+Shift+E</kbd>
          <span>Edit selected code with AI</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl+K</kbd>
          <span>Quick code generation</span>
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl+Alt+A</kbd>
          <span>Toggle AI Assistant Panel</span>
        </div>
      </div>
      <p class="tip">💡 Tip: Right-click in the editor to see AI options!</p>
      <button id="welcome-close">Get Started</button>
    </div>
    <style>
      .ai-features-welcome {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .welcome-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
      }
      .welcome-content {
        position: relative;
        background: #2d2d2d;
        padding: 32px;
        border-radius: 12px;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .welcome-content h2 {
        margin: 0 0 16px 0;
        color: #cccccc;
        font-size: 24px;
        text-align: center;
      }
      .welcome-content p {
        margin: 12px 0;
        color: #999999;
        text-align: center;
      }
      .shortcuts {
        margin: 24px 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .shortcut-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 6px;
      }
      .shortcut-item kbd {
        background: #3c3c3c;
        color: #cccccc;
        padding: 6px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        min-width: 140px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .shortcut-item span {
        color: #cccccc;
        font-size: 14px;
      }
      .tip {
        margin-top: 24px !important;
        padding: 12px;
        background: #1a3a52;
        border: 1px solid #2d5a7b;
        border-radius: 6px;
        color: #8dd6ff !important;
      }
      .welcome-content button {
        width: 100%;
        margin-top: 24px;
        padding: 12px;
        background: #007acc;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .welcome-content button:hover {
        background: #005a9e;
      }
    </style>
  `;
  
  document.body.appendChild(welcome);
  
  const closeBtn = welcome.querySelector('#welcome-close');
  const overlay = welcome.querySelector('.welcome-overlay');
  
  const closeWelcome = () => {
    welcome.style.opacity = '0';
    setTimeout(() => welcome.remove(), 300);
  };
  
  closeBtn?.addEventListener('click', closeWelcome);
  overlay?.addEventListener('click', closeWelcome);
  
  // Auto-close after 10 seconds
  setTimeout(closeWelcome, 10000);
}

// ============================================================================
// MODIFIED FILE TRACKING
// ============================================================================

/**
 * ✅ NEW: Setup change tracking for modified files
 */
function setupModifiedFileTracking(): void {
  console.log('🔍 Setting up modified file tracking...');
  
  if (!window.monaco?.editor) {
    console.error('❌ Monaco editor not available for tracking');
    return;
  }
  
  // Listen when new models are created
  window.monaco.editor.onDidCreateModel((model: any) => {
    const uri = model.uri.toString();
    const filePath = extractFilePathFromUri(uri);
    
    if (filePath) {
      console.log(`📄 New model created for: ${filePath}`);
      
      // Store original content
      const originalContent = model.getValue();
      originalContents.set(uri, originalContent);
      console.log(`💾 Stored original content: ${originalContent.length} chars`);
      
      // Listen to content changes
      model.onDidChangeContent(() => {
        const currentContent = model.getValue();
        const storedOriginal = originalContents.get(uri) || '';
        
        console.log(`📝 Content changed for ${filePath}:`, {
          originalLength: storedOriginal.length,
          currentLength: currentContent.length,
          isDifferent: currentContent !== storedOriginal
        });
        
        if (currentContent !== storedOriginal) {
          console.log(`🟠 Marking file as modified: ${filePath}`);
          markFileAsModified(filePath);
        } else {
          console.log(`✅ Content matches original, marking as saved: ${filePath}`);
          markFileAsSaved(filePath);
        }
      });
    }
  });
  
  // Listen for file save events
  window.addEventListener('file-saved', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.path) {
      console.log(`💾 File saved event received: ${detail.path}`);
      
      // Update original content after save
      const editor = monacoEditor;
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const uri = model.uri.toString();
          const currentContent = model.getValue();
          originalContents.set(uri, currentContent);
          console.log(`✅ Updated original content after save: ${currentContent.length} chars`);
        }
      }
      
      markFileAsSaved(detail.path);
    }
  });
  
  console.log('✅ Modified file tracking setup complete');
}

/**
 * ✅ NEW: Extract file path from Monaco URI
 */
function extractFilePathFromUri(uri: string): string | null {
  try {
    // Monaco URI format: file:///C:/path/to/file.ts or inmemory://model/1
    if (uri.startsWith('inmemory://')) {
      return null; // Skip in-memory models
    }
    
    const match = uri.match(/file:\/\/\/(.+)$/);
    if (match) {
      let path = match[1];
      // Decode URI components and normalize path
      path = decodeURIComponent(path);
      path = path.replace(/%20/g, ' ');
      console.log(`🔗 Extracted path from URI: ${uri} -> ${path}`);
      return path;
    }
    
    console.warn(`⚠️ Could not extract path from URI: ${uri}`);
    return null;
  } catch (error) {
    console.error('❌ Error extracting file path from URI:', error);
    return null;
  }
}

/**
 * ✅ NEW: Export for use elsewhere
 */
export { extractFilePathFromUri };

// ============================================================================
// FILE OPERATIONS
// ============================================================================

// Update cursor position in status bar
function updateCursorPosition(event: any): void {
  const position = event.position;
  const statusElement = document.getElementById('position-status');
  
  if (statusElement) {
    statusElement.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
  }
}

// Enhanced file opening function with better error handling and logging
export async function openFile(filePath: string, content?: string): Promise<void> {
  console.log('Opening file:', filePath);
  
  if (!monacoEditor) {
    console.error('Editor not initialized');
    return;
  }

  try {
    // Update current file path
    currentFilePath = filePath;
    
    // Save current file state if needed
    if (currentFilePath && openFiles.has(currentFilePath)) {
      saveFileState();
    }

    // Check if we already have this file open
    if (openFiles.has(filePath)) {
      console.log('File already open, restoring state');
      const fileData = openFiles.get(filePath)!;
      monacoEditor.setModel(fileData.model);
      if (fileData.viewState) {
        monacoEditor.restoreViewState(fileData.viewState);
      }
      monacoEditor.focus();
      return;
    }

    // Read file content
    let fileContent: string;
    if (content !== undefined) {
      fileContent = content;
    } else {
      fileContent = await readFileContent(filePath);
    }

    // Create a new model for this file
    const uri = monaco.Uri.file(filePath);
    const model = monaco.editor.createModel(
      fileContent,
      undefined, // Let Monaco infer the language
      uri
    );

    // Set the model in the editor
    monacoEditor.setModel(model);
    monacoEditor.focus();

    console.log('✅ File opened successfully:', filePath);
    
    // ✅ NEW: Update AI panel with new file
    if (aiAssistantPanel) {
      aiAssistantPanel.setEditor(monacoEditor);
    }
    
  } catch (error) {
    console.error('❌ Error opening file:', error);
    alert(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Detect language from file extension
function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'xml': 'xml',
    'svg': 'xml',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
  };
  
  return languageMap[extension || ''] || 'plaintext';
}

// Generate mock content for development
function generateMockContent(filePath: string): string {
  return `// Mock content for: ${filePath}\n// This is placeholder content for development\n\nfunction example() {\n  console.log('Hello from ${filePath}');\n}\n`;
}

// Save the current file state
function saveFileState(): void {
  if (!currentFilePath || !monacoEditor) return;

  const model = monacoEditor.getModel();
  const viewState = monacoEditor.saveViewState();

  openFiles.set(currentFilePath, { model, viewState });
}

// Read file content using Tauri API or fallback
async function readFileContent(filePath: string): Promise<string> {
  console.log('Reading file content:', filePath);
  
  // Try to use Tauri's API if available
  if (window.fs && window.fs.readFile) {
    try {
      console.log('Using Tauri fs.readFile API');
      const content = await window.fs.readFile(filePath, { encoding: 'utf8' });
      console.log(`✅ File read successfully: ${content.length} chars`);
      return content;
    } catch (error) {
      console.error('❌ Tauri API error:', error);
      throw error; // Re-throw to let caller handle
    }
  }

  // Fallback for development mode
  console.warn('⚠️ Tauri not available, using mock content');
  return generateMockContent(filePath);
}

// Save the current file
export async function saveCurrentFile(): Promise<void> {
  if (!currentFilePath || !monacoEditor) {
    console.log('No file to save');
    return;
  }

  const content = monacoEditor.getValue();
  console.log('Saving file:', currentFilePath);
  
  // Try to use Tauri's API if available
  if (window.fs && window.fs.writeFile) {
    try {
      await window.fs.writeFile(currentFilePath, content);
      console.log('✅ File saved successfully');
      
      // ✅ UPDATE: Mark file as saved
      markFileAsSaved(currentFilePath);
      
      // Update original content
      const model = monacoEditor.getModel();
      if (model) {
        const uri = model.uri.toString();
        originalContents.set(uri, content);
        console.log(`💾 Updated original content after save: ${content.length} chars`);
      }
      
      // Dispatch an event for the tab system to know the file was saved
      const saveEvent = new CustomEvent('file-saved', {
        detail: { path: currentFilePath }
      });
      document.dispatchEvent(saveEvent);
      
    } catch (error) {
      console.error('❌ Error saving file:', error);
      alert('Failed to save file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  } else {
    // Mock implementation for development
    console.log('💾 Mock save file:', currentFilePath);
    
    // ✅ UPDATE: Mark file as saved even in mock mode
    markFileAsSaved(currentFilePath);
    
    // Update original content
    const model = monacoEditor.getModel();
    if (model) {
      const uri = model.uri.toString();
      originalContents.set(uri, content);
    }
    
    // Still dispatch the event so tab system updates
    const saveEvent = new CustomEvent('file-saved', {
      detail: { path: currentFilePath }
    });
    document.dispatchEvent(saveEvent);
  }
}

// ============================================================================
// FILE TREE INTEGRATION
// ============================================================================

// Handle file tree integration
function setupFileTreeIntegration(): void {
  console.log('Setting up file tree integration');
  
  // Remove any existing listeners to avoid duplicates
  document.removeEventListener('file-selected', handleFileSelected);
  
  // Add the event listener
  document.addEventListener('file-selected', handleFileSelected);
}

// File selected event handler
function handleFileSelected(e: Event): void {
  const customEvent = e as CustomEvent;
  if (customEvent.detail && customEvent.detail.path) {
    console.log('File selected event received in editor:', customEvent.detail.path);
    openFile(customEvent.detail.path).catch(err => {
      console.error('Error handling file-selected event:', err);
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Expose editor instance
export function getMonacoEditor(): any {
  return monacoEditor;
}

/**
 * ✅ NEW: Get AI Assistant Panel instance
 */
export function getAIPanel(): AICodeAssistantPanel | null {
  return aiAssistantPanel;
}

/**
 * ✅ NEW: Toggle AI Panel programmatically
 */
export function toggleAIPanel(): void {
  if (aiAssistantPanel) {
    aiAssistantPanel.toggle();
  }
}

/**
 * ✅ NEW: Get original content for a file
 */
export function getOriginalContent(uri: string): string | null {
  return originalContents.get(uri) || null;
}

/**
 * ✅ NEW: Check if file has unsaved changes
 */
export function hasUnsavedChanges(filePath: string): boolean {
  if (!monacoEditor) return false;
  
  const model = monacoEditor.getModel();
  if (!model) return false;
  
  const uri = model.uri.toString();
  const currentPath = extractFilePathFromUri(uri);
  
  if (currentPath !== filePath) return false;
  
  const currentContent = model.getValue();
  const originalContent = originalContents.get(uri) || '';
  
  return currentContent !== originalContent;
}

/**
 * ✅ NEW: Force reload a file (discarding changes)
 */
export async function reloadFile(filePath: string): Promise<void> {
  console.log('🔄 Reloading file:', filePath);
  
  try {
    const content = await readFileContent(filePath);
    
    // Find the tab and update it
    const tab = tabManager.getTabs().find(t => t.path === filePath);
    if (tab) {
      // Update the model
      if (tab.model) {
        tab.model.setValue(content);
        
        // Update original content
        const uri = tab.model.uri.toString();
        originalContents.set(uri, content);
        
        // Mark as saved
        markFileAsSaved(filePath);
        
        console.log('✅ File reloaded successfully');
      }
    }
  } catch (error) {
    console.error('❌ Failed to reload file:', error);
    alert(`Failed to reload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// DEBUG & UTILITIES
// ============================================================================

/**
 * Add force reload button for debugging
 */
function addForceReloadButton(): void {
  // Only add in development mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const btn = document.createElement('button');
    btn.textContent = '🔄 Reload';
    btn.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      z-index: 10000;
      padding: 8px 16px;
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    btn.onclick = () => {
      if (currentFilePath) {
        reloadFile(currentFilePath);
      }
    };
    document.body.appendChild(btn);
  }
}

/**
 * ✅ NEW: Debug function to check tracking state
 */
(window as any).__debugEditorTracking = () => {
  console.group('🔍 Editor Tracking Debug');
  console.log('Current file path:', currentFilePath);
  console.log('Original contents stored:', originalContents.size);
  
  originalContents.forEach((content, uri) => {
    console.log(`  ${uri}: ${content.length} chars`);
  });
  
  if (monacoEditor) {
    const model = monacoEditor.getModel();
    if (model) {
      const uri = model.uri.toString();
      const currentContent = model.getValue();
      const originalContent = originalContents.get(uri);
      
      console.log('Current model:', {
        uri,
        currentLength: currentContent.length,
        originalLength: originalContent?.length || 0,
        hasChanges: currentContent !== originalContent
      });
    }
  }
  
  console.groupEnd();
};

console.log('✅ Editor Manager with AI Code Writing Features loaded');
