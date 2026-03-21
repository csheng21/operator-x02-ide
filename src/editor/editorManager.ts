// src/editor/editorManager.ts
// ============================================================================
// Monaco Editor Manager with AI Code Writing Features
// INCLUDES FIX: Hover "Loading..." hang for CSS/SCSS/JSON files
// INCLUDES FIX: PDF and binary file blocking
// ============================================================================

import { FileNode } from '../ide/fileExplorer/types';
import { tabManager } from './tabManager';
import { markFileAsModified, markFileAsSaved } from '../ide/fileExplorer/fileTreeRenderer';

// ============================================================================
// ✅ AI CODE WRITING FEATURES - Imports
// ============================================================================
import { initializeInlineAICodeWriter } from '../ide/aiAssistant/inlineAICodeWriter';
import { initializeSelectionAIEditor } from '../ide/aiAssistant/selectionAIEditor';
import { initializeQuickAICommand } from '../ide/aiAssistant/quickAICommand';
import { initializeAICodeAssistantPanel, AICodeAssistantPanel } from '../ide/aiAssistant/aiCodeAssistantPanel';
import { initializeAllAIFeatures } from '../ide/aiAssistant/aiEditorFeatures';
import { initInlineAutocomplete } from './inlineAutocomplete';
// ============================================================================
// Editor state
// ============================================================================
let monacoEditor: any = null;
let currentFilePath: string = '';
let openFiles: Map<string, {model: any, viewState: any}> = new Map();

// Track original content for change detection
const originalContents = new Map<string, string>();

// AI Assistant Panel instance
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

/**
 * Add CSS styles for editor features
 */
function addEditorStyles(): void {
  if (document.getElementById('editor-manager-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'editor-manager-styles';
  style.textContent = `
    /* Search result line highlight */
    .search-result-highlight {
      background: rgba(255, 213, 0, 0.25) !important;
      border-left: 3px solid #ffd500 !important;
    }
    
    .search-result-glyph {
      background: #ffd500 !important;
      width: 4px !important;
      margin-left: 3px;
    }
    
    /* Content search highlight */
    .content-search-highlight-line {
      background: rgba(59, 130, 246, 0.2) !important;
      border-left: 3px solid #3b82f6 !important;
    }
    
    .content-search-glyph {
      background: #3b82f6 !important;
      width: 4px !important;
    }
    
    /* Find match highlight animation */
    @keyframes highlightPulse {
      0%, 100% { background: rgba(255, 213, 0, 0.25); }
      50% { background: rgba(255, 213, 0, 0.5); }
    }
    
    .search-result-highlight {
      animation: highlightPulse 1s ease-in-out 2;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ Editor styles added');
}

// ============================================================================
// ✅ FIX: HOVER PROVIDER TIMEOUT PROTECTION
// Prevents "Loading..." hang for CSS/SCSS/JSON when Monaco workers fail
// ============================================================================

/**
 * Apply hover provider fix to prevent infinite "Loading..." tooltip
 * Monaco's language workers (CSS, JSON, etc.) don't load properly in Tauri,
 * causing hover providers to hang indefinitely.
 */
function applyHoverProviderFix(): void {
  const monacoInstance = (window as any).monaco;
  if (!monacoInstance) {
    console.warn('⚠️ Monaco not available for hover fix');
    return;
  }

  console.log('🔧 Applying hover provider timeout protection...');

  // Store original registerHoverProvider
  const originalRegisterHoverProvider = monacoInstance.languages.registerHoverProvider;

  // Override to wrap all hover providers with timeout
  monacoInstance.languages.registerHoverProvider = function(
    selector: any,
    provider: any
  ): any {
    const wrappedProvider = {
      provideHover: async (model: any, position: any, token: any) => {
        // Create a timeout promise (1.5 seconds max)
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 1500);
        });

        try {
          // Race between actual hover and timeout
          const result = await Promise.race([
            Promise.resolve(provider.provideHover(model, position, token)),
            timeoutPromise
          ]);
          return result;
        } catch (e) {
          // Silently fail - don't show "Loading..." forever
          console.debug('Hover provider error (suppressed):', e);
          return null;
        }
      }
    };

    return originalRegisterHoverProvider.call(
      monacoInstance.languages,
      selector,
      wrappedProvider
    );
  };

  // Additionally, register immediate-return hover providers for problematic languages
  // These take priority and prevent the built-in providers from hanging
  const problematicLanguages = ['css', 'scss', 'less', 'json'];
  
  problematicLanguages.forEach(lang => {
    monacoInstance.languages.registerHoverProvider(lang, {
      provideHover: () => null // Return null immediately
    });
  });

  console.log('✅ Hover provider fix applied - no more "Loading..." hang');
  console.log('   Protected languages:', problematicLanguages.join(', '));
}

// ============================================================================
// CREATE EDITOR
// ============================================================================

// Create the actual editor instance
async function createEditor(): Promise<void> {
  const editorContainer = document.getElementById('monaco-editor');
  if (!editorContainer) {
    console.error('Editor container not found');
    throw new Error('Editor container not found');
  }
  
  // Add editor styles
  addEditorStyles();
  
  // ✅ FIX: Apply hover provider fix BEFORE creating editor
  applyHoverProviderFix();
  
  // Professional welcome content for Operator X02 Code IDE
  const welcomeContent = `/*
 *
 *
 *                    ╔═══════════════════════════════════════╗
 *                    ║                                       ║
 *                    ║          OPERATOR X02                 ║
 *                    ║                                       ║
 *                    ║      ⚡ AI-Powered Code IDE ⚡         ║
 *                    ║                                       ║
 *                    ╚═══════════════════════════════════════╝
 *
 *
 *                            Coding is Art
 *
 *
 *    ───────────────────────────────────────────────────────────────
 *
 *       🌟 Open Source       🔒 100% Local       💸 Free Forever
 *
 *    ───────────────────────────────────────────────────────────────
 *
 *
 *       FEATURES
 *
 *       • 8 AI Roles (Architect, Developer, Reviewer, Tester...)
 *       • 6 AI Providers (Claude, OpenAI, Groq, Deepseek, Ollama, Gemini)
 *       • Camera AI & Visual Code Analysis
 *       • Boundless Memory
 *       • Auto Architecture Reports
 *
 *
 *    ───────────────────────────────────────────────────────────────
 *
 *                        www.operatorx02.com
 *
 *    ───────────────────────────────────────────────────────────────
 *
 *
 */
`;

  try {
    console.log('Creating Monaco editor instance');
    // Create editor with dark theme
    monacoEditor = monaco.editor.create(editorContainer, {
      value: welcomeContent,
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
      wordWrap: 'on',
      readOnly: true  // Make welcome screen read-only
    });

    // ---- Inline Autocomplete (Ghost Text) ----
    initInlineAutocomplete(monacoEditor);
    
    // Connect tab manager to editor (if method exists)
    if (tabManager && typeof tabManager.setupChangeTracking === 'function') {
      tabManager.setupChangeTracking(monacoEditor);
    }
    
    // Setup modified file tracking
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
        
        // Update AI panel context when content changes
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
        
        // Update AI panel when tab changes
        if (aiAssistantPanel) {
          aiAssistantPanel.setEditor(monacoEditor);
        }
      }
    });

    // Update cursor position in status bar
    monacoEditor.onDidChangeCursorPosition(updateCursorPosition);
    
    // Update AI panel on cursor position change
    monacoEditor.onDidChangeCursorPosition(() => {
      if (aiAssistantPanel) {
        aiAssistantPanel.setEditor(monacoEditor);
      }
    });

    // Set up keyboard shortcuts
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrentFile);
    
    // ============================================================================
    // Initialize AI Code Writing Features
    // ============================================================================
    console.log('🤖 Initializing AI Code Writing Features...');
    
    try {
      // Get the monaco instance
      const monacoInstance = (window as any).monaco;
      
      if (monacoInstance) {
        // 1. Inline Code Generator (Ctrl+Shift+I)
        initializeInlineAICodeWriter(monacoInstance, monacoEditor);
        console.log('✅ Inline AI Code Writer initialized (Ctrl+Shift+I)');
        
        // 2. Selection Editor (Ctrl+Shift+E)
        initializeSelectionAIEditor(monacoInstance, monacoEditor);
        console.log('✅ Selection AI Editor initialized (Ctrl+Shift+E)');
        
        // 3. Quick Command (Ctrl+K)
        initializeQuickAICommand(monacoInstance, monacoEditor);
        console.log('✅ Quick AI Command initialized (Ctrl+K)');
        
        // 4. AI Assistant Panel (Ctrl+Alt+A)
        aiAssistantPanel = initializeAICodeAssistantPanel(monacoInstance);
        aiAssistantPanel.setEditor(monacoEditor);
        console.log('✅ AI Assistant Panel initialized (Ctrl+Alt+A)');
        
        // 5. Initialize ALL AI Editor Features (hover, code review, tests, etc.)
        try {
          initializeAllAIFeatures(monacoInstance, monacoEditor);
          console.log('✅ AI Editor Features initialized (Ctrl+Shift+R/T/D/F)');
        } catch (aiError) {
          console.warn('⚠️ AI Editor Features partially failed:', aiError);
        }
        
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

    console.log('Monaco editor initialized successfully');
    
    // Set up file integration
    setupFileTreeIntegration();
    
    // Make update function globally available
    (window as any).__updateOriginalContent = (uri: string, content: string) => {
      originalContents.set(uri, content);
      console.log(`📝 Updated original content for ${uri}: ${content.length} chars`);
    };
    
    // Expose openFile globally for content search and other features
    (window as any).openFile = openFile;
    (window as any).editorManager = {
      openFile: openFile,
      saveCurrentFile: saveCurrentFile,
      getMonacoEditor: getMonacoEditor,
      getCurrentFilePath: () => currentFilePath
    };
    console.log('✅ Editor functions exposed globally');
    
  } catch (error) {
    console.error('Error creating Monaco editor:', error);
    throw error;
  }
}

// ============================================================================
// AI FEATURES WELCOME SCREEN
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
 * Setup change tracking for modified files
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
        const isDifferent = currentContent !== storedOriginal;
        
        // ✅ Only log when state actually changes
        if (isDifferent) {
          markFileAsModified(filePath);
        } else {
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
 * Extract file path from Monaco URI
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
 * Export for use elsewhere
 */
export { extractFilePathFromUri };

// ============================================================================
// FILE OPERATIONS
// ============================================================================

// ✅ Debounce tracking to prevent multiple file opens
let lastOpenedPath = '';
let lastOpenTime = 0;
let openInProgress = false;

// Update cursor position in status bar
function updateCursorPosition(event: any): void {
  const position = event.position;
  const statusElement = document.getElementById('position-status');
  
  if (statusElement) {
    statusElement.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
  }
}

// ============================================================================
// 🛑 BINARY FILE EXTENSIONS - Files that should NOT open in Monaco
// ============================================================================
const BINARY_EXTENSIONS = new Set([
  // Documents
  'pdf',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg', 'tiff', 'psd',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  // Video
  'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  // Executables
  'exe', 'dll', 'so', 'dylib', 'bin',
  // Old Office formats (binary)
  'doc', 'xls', 'ppt',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  // Other binary
  'iso', 'dmg', 'msi', 'apk', 'ipa'
]);

/**
 * Check if a file is a binary file that shouldn't be opened in Monaco
 */
function isBinaryFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  return BINARY_EXTENSIONS.has(ext);
}

// Enhanced file opening function with better error handling and logging
export async function openFile(filePath: string, contentOrLine?: string | number, line?: number, forceRefresh?: boolean): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // 🛑 BLOCK PDF AND BINARY FILES - They should NOT open in Monaco editor
  // ═══════════════════════════════════════════════════════════════════════════
  if (isBinaryFile(filePath)) {
    const ext = filePath.toLowerCase().split('.').pop() || '';
    console.log(`📄 [EditorManager] Blocked binary file from opening in Monaco: ${filePath} (${ext})`);
    
    // Show notification for PDF files
    if (ext === 'pdf') {
      const existing = document.getElementById('pdf-block-toast');
      if (!existing) {
        const toast = document.createElement('div');
        toast.id = 'pdf-block-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 60px;
          right: 20px;
          background: linear-gradient(135deg, #1f6feb, #1976d2);
          color: white;
          padding: 14px 24px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 10px;
        `;
        toast.innerHTML = `
          <span style="font-size: 24px;">📄</span>
          <div>
            <div style="font-weight: 600;">PDF File Detected</div>
            <div style="font-size: 12px; opacity: 0.9;">PDF files cannot be displayed in the code editor.</div>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      }
      
      // Dispatch event for PDF handler (if available)
      window.dispatchEvent(new CustomEvent('pdf-file-requested', { 
        detail: { path: filePath } 
      }));
    } else {
      // Show notification for other binary files
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 60px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      toast.textContent = `⚠️ Binary files (.${ext}) cannot be opened in the code editor.`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    
    return; // Don't open in Monaco!
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // END BINARY FILE BLOCKING
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ Debounce: Prevent duplicate opens within 300ms
  const now = Date.now();
  if (filePath === lastOpenedPath && (now - lastOpenTime) < 300 && !forceRefresh) {
    return; // Skip duplicate
  }
  
  // ✅ Prevent concurrent opens
  if (openInProgress && !forceRefresh) {
    return;
  }
  
  openInProgress = true;
  lastOpenedPath = filePath;
  lastOpenTime = now;
  
  console.log('📂 Opening file:', filePath, forceRefresh ? '(force refresh)' : '');
  
  // Handle different parameter combinations
  let content: string | undefined;
  let targetLine: number | undefined;
  
  if (typeof contentOrLine === 'number') {
    targetLine = contentOrLine;
  } else if (typeof contentOrLine === 'string') {
    content = contentOrLine;
    targetLine = line;
  }
  
  if (!monacoEditor) {
    console.error('Editor not initialized');
    return;
  }

  try {
    // Save current file state before switching
    if (currentFilePath && currentFilePath !== filePath && openFiles.has(currentFilePath)) {
      saveFileState();
    }
    
    // Update current file path
    currentFilePath = filePath;

    // Always read fresh content (don't rely on cache for content)
    let fileContent: string;
    if (content !== undefined) {
      fileContent = content;
    } else {
      fileContent = await readFileContent(filePath);
    }
    
    // Check if content looks like mock/error content
    const isMockContent = fileContent.includes('// Mock content for:') || 
                          fileContent.includes('// ❌ ERROR: Could not read file');
    
    if (isMockContent) {
      console.warn('⚠️ WARNING: File content appears to be mock/error content!');
      console.warn('   This means the file could not be read from disk.');
    }

    // Check if model already exists in Monaco before creating
    const uri = monaco.Uri.file(filePath);
    let model = monaco.editor.getModel(uri);
    
    if (model) {
      // ✅ FIX: Only update if content is actually different
      // This prevents incrementing Monaco version counter unnecessarily
      const currentContent = model.getValue();
      if (currentContent !== fileContent) {
        console.log('♻️ Model exists, content changed - updating');
        model.setValue(fileContent);
      } else {
        console.log('♻️ Model exists, content unchanged - skipping setValue');
      }
    } else {
      // Create a new model for this file
      console.log('📝 Creating new model for:', filePath);
      model = monaco.editor.createModel(
        fileContent,
        undefined, // Let Monaco infer the language
        uri
      );
    }

    // Set the model in the editor
    monacoEditor.setModel(model);
    monacoEditor.updateOptions({ readOnly: false }); // Make editor editable when file is opened
    monacoEditor.focus();
    
    // Store in our open files cache (for view state, not content)
    openFiles.set(filePath, { model, viewState: null });
    
    // Store original content for change tracking (only if not mock)
    if (!isMockContent) {
      originalContents.set(uri.toString(), fileContent);
    }
    
    // Jump to line if specified
    if (targetLine) {
      // Small delay to ensure model is fully loaded
      setTimeout(() => goToLineInEditor(targetLine!), 100);
    }
    
    // Update AI panel with new file
    if (aiAssistantPanel) {
      aiAssistantPanel.setEditor(monacoEditor);
    }
    
  } catch (error) {
    console.error('❌ Error opening file:', error);
  } finally {
    // ✅ Always reset the flag
    openInProgress = false;
  }
}

/**
 * Go to a specific line in the editor
 */
function goToLineInEditor(line: number): void {
  if (!monacoEditor) return;
  
  try {
    monacoEditor.revealLineInCenter(line);
    monacoEditor.setPosition({ lineNumber: line, column: 1 });
    monacoEditor.focus();
    
    // Add temporary highlight
    const decorations = monacoEditor.deltaDecorations([], [{
      range: new monaco.Range(line, 1, line, 1000),
      options: {
        isWholeLine: true,
        className: 'search-result-highlight',
        glyphMarginClassName: 'search-result-glyph'
      }
    }]);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      monacoEditor.deltaDecorations(decorations, []);
    }, 2000);
    
    console.log(`✅ Jumped to line ${line}`);
  } catch (error) {
    console.error('Error going to line:', error);
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
  // ============================================================================
  // METHOD 1: Try Tauri v2 invoke command (most reliable)
  // ============================================================================
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_content', { path: filePath }) as string;
    
    if (content && content.length > 0) {
      return content;
    }
  } catch (invokeError: any) {
    // Silent fail - try next method
  }
  
  // ============================================================================
  // METHOD 2: Try Tauri v2 plugin-fs
  // ============================================================================
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile(filePath);
    
    if (content && content.length > 0) {
      return content;
    }
  } catch (pluginError: any) {
    // Silent fail - try next method
  }
  
  // ============================================================================
  // METHOD 3: Try legacy window.fs API (Tauri v1)
  // ============================================================================
  if ((window as any).fs && typeof (window as any).fs.readFile === 'function') {
    try {
      const content = await (window as any).fs.readFile(filePath, { encoding: 'utf8' });
      
      if (content && content.length > 0) {
        return content;
      }
    } catch (legacyError: any) {
      // Silent fail
    }
  }
  
  // ============================================================================
  // METHOD 4: Try fetch for local files (development server)
  // ============================================================================
  try {
    // Convert Windows path to URL format for fetch
    let fetchPath = filePath;
    if (filePath.match(/^[A-Z]:\\/i)) {
      // Windows absolute path - try to convert
      fetchPath = 'file:///' + filePath.replace(/\\/g, '/');
    }
    
    const response = await fetch(fetchPath);
    
    if (response.ok) {
      const content = await response.text();
      if (content && content.length > 0) {
        return content;
      }
    }
  } catch (fetchError: any) {
    // Silent fail
  }

  // ============================================================================
  // FALLBACK: Mock content (only for development without Tauri)
  // ============================================================================
  console.error('❌ ALL FILE READ METHODS FAILED for:', filePath);
  
  // Return mock content with error info
  const escapedPath = filePath.replace(/'/g, "\\'");
  return `// ❌ ERROR: Could not read file: ${filePath}
// 
// All file reading methods failed:
// - Tauri invoke: failed
// - Tauri plugin-fs: failed  
// - Legacy window.fs: not available
// - Fetch: failed
//
// This usually means:
// 1. The app is not running in Tauri environment
// 2. The file path is incorrect
// 3. The file doesn't exist
//
// Check the browser console for detailed error messages.

// Mock placeholder:
function example() {
  console.log('File not loaded: ${escapedPath}');
}
`;
}

// Save the current file
export async function saveCurrentFile(): Promise<void> {
  if (!currentFilePath || !monacoEditor) {
    console.log('No file to save');
    return;
  }

  const content = monacoEditor.getValue();
  console.log('💾 Saving file:', currentFilePath);
  
  let saved = false;
  
  // Check for Tauri v2 properly
  if ((window as any).__TAURI__) {
    try {
      // Try using @tauri-apps/plugin-fs (Tauri v2)
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(currentFilePath, content);
      console.log('✅ File saved via plugin-fs');
      saved = true;
    } catch (pluginError) {
      console.log('plugin-fs write not available, trying invoke...');
      
      try {
        // Fallback to invoke command
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('write_file', { path: currentFilePath, content: content });
        console.log('✅ File saved via invoke');
        saved = true;
      } catch (invokeError) {
        console.error('❌ Tauri invoke error:', invokeError);
        alert('Failed to save file: ' + (invokeError instanceof Error ? invokeError.message : 'Unknown error'));
        return;
      }
    }
  } else if ((window as any).fs && (window as any).fs.writeFile) {
    // Legacy Tauri v1 API
    try {
      await (window as any).fs.writeFile(currentFilePath, content);
      console.log('✅ File saved via legacy API');
      saved = true;
    } catch (error) {
      console.error('❌ Error saving file:', error);
      alert('Failed to save file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return;
    }
  } else {
    // Mock implementation for development
    console.log('💾 Mock save file (Tauri not available):', currentFilePath);
    saved = true; // Pretend it saved in dev mode
  }
  
  if (saved) {
    // Mark file as saved
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
    const { path, line } = customEvent.detail;
    console.log('📂 File selected event received:', path, line ? `(line ${line})` : '');
    
    // Open file and optionally go to line
    openFile(path, line).catch(err => {
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
 * Get AI Assistant Panel instance
 */
export function getAIPanel(): AICodeAssistantPanel | null {
  return aiAssistantPanel;
}

/**
 * Toggle AI Panel programmatically
 */
export function toggleAIPanel(): void {
  if (aiAssistantPanel) {
    aiAssistantPanel.toggle();
  }
}

/**
 * Get original content for a file
 */
export function getOriginalContent(uri: string): string | null {
  return originalContents.get(uri) || null;
}

/**
 * Check if file has unsaved changes
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
 * Force reload a file (discarding changes)
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
 * Debug function to check tracking state
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

/**
 * DEBUG: Clear all file caches (call if files show wrong content)
 */
(window as any).__clearFileCache = () => {
  console.log('🧹 Clearing all file caches...');
  
  // Clear our open files cache
  openFiles.clear();
  console.log('   ✅ openFiles cache cleared');
  
  // Clear original contents
  originalContents.clear();
  console.log('   ✅ originalContents cache cleared');
  
  // Clear all Monaco models
  const models = monaco.editor.getModels();
  models.forEach(model => {
    try {
      model.dispose();
    } catch (e) {
      console.log('   ⚠️ Could not dispose model:', model.uri.toString());
    }
  });
  console.log(`   ✅ Disposed ${models.length} Monaco models`);
  
  console.log('🧹 Cache cleared! Reopen files to load fresh content.');
};

/**
 * DEBUG: Test file reading
 */
(window as any).__testFileRead = async (filePath: string) => {
  console.group('🧪 Testing file read for:', filePath);
  
  try {
    console.log('Testing Tauri invoke...');
    const { invoke } = await import('@tauri-apps/api/core');
    const content = await invoke('read_file_content', { path: filePath }) as string;
    console.log('✅ Tauri invoke SUCCESS:', content.substring(0, 200) + '...');
    console.log('   Content length:', content.length);
  } catch (e: any) {
    console.log('❌ Tauri invoke FAILED:', e.message || e);
  }
  
  try {
    console.log('Testing plugin-fs...');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const content = await readTextFile(filePath);
    console.log('✅ Plugin-fs SUCCESS:', content.substring(0, 200) + '...');
  } catch (e: any) {
    console.log('❌ Plugin-fs FAILED:', e.message || e);
  }
  
  console.groupEnd();
};

/**
 * DEBUG: Force refresh current file
 */
(window as any).__refreshCurrentFile = async () => {
  if (!currentFilePath) {
    console.log('No file currently open');
    return;
  }
  
  console.log('🔄 Force refreshing:', currentFilePath);
  
  // Remove from cache
  openFiles.delete(currentFilePath);
  
  // Dispose Monaco model
  const uri = monaco.Uri.file(currentFilePath);
  const model = monaco.editor.getModel(uri);
  if (model) {
    model.dispose();
  }
  
  // Reopen
  await openFile(currentFilePath);
  console.log('✅ File refreshed');
};

/**
 * DEBUG: Test hover fix
 */
(window as any).__testHoverFix = () => {
  console.log('🔍 Testing hover provider fix...');
  console.log('   Open a CSS file and hover over a property.');
  console.log('   If you see "Loading..." for more than 1.5s, the fix is not working.');
  console.log('   If hover shows nothing or shows quickly, the fix is working.');
};

// ============================================================================
// INITIALIZATION LOG
// ============================================================================

console.log('✅ Editor Manager v2.1 - Debounce + setValue Fix + PDF/Binary Blocking loaded');
console.log('   Debug commands: __clearFileCache(), __refreshCurrentFile()');
console.log('   Blocked extensions:', Array.from(BINARY_EXTENSIONS).join(', '));