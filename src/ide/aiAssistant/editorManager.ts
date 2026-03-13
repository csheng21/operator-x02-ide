// ============================================================================
// FILE: editorManager.ts - COMPLETE INTEGRATION EXAMPLE
// PURPOSE: Shows how to integrate all AI code writing features into Monaco
// ============================================================================

import * as monaco from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';

// ✅ STEP 1: Import all AI code writing features
import { initializeInlineAICodeWriter } from '../ide/aiAssistant/inlineAICodeWriter';
import { initializeSelectionAIEditor } from '../ide/aiAssistant/selectionAIEditor';
import { initializeQuickAICommand } from '../ide/aiAssistant/quickAICommand';
import { initializeAICodeAssistantPanel } from '../ide/aiAssistant/aiCodeAssistantPanel';

// Your existing editor instance
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let aiAssistantPanel: any = null;

/**
 * Initialize Monaco Editor with AI features
 */
export function initializeEditor(container: HTMLElement): void {
  console.log('🚀 Initializing Monaco Editor with AI features...');
  
  // ============================================================================
  // STEP 2: Create Monaco editor (your existing code)
  // ============================================================================
  
  editorInstance = monaco.editor.create(container, {
    value: '// Start coding with AI assistance!\n',
    language: 'typescript',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: false,
    cursorStyle: 'line',
    wordWrap: 'on',
    // ... your other editor options
  });
  
  // ============================================================================
  // STEP 3: Initialize AI code writing features ✅
  // ============================================================================
  
  console.log('🤖 Initializing AI Code Writing Features...');
  
  // Initialize all AI features
  try {
    // 1. Inline Code Generator (Ctrl+Shift+I)
    initializeInlineAICodeWriter(monaco);
    console.log('✅ Inline AI Code Writer initialized');
    
    // 2. Selection Editor (Ctrl+Shift+E)
    initializeSelectionAIEditor(monaco);
    console.log('✅ Selection AI Editor initialized');
    
    // 3. Quick Command (Ctrl+K)
    initializeQuickAICommand(monaco);
    console.log('✅ Quick AI Command initialized');
    
    // 4. AI Assistant Panel (Ctrl+Alt+A)
    aiAssistantPanel = initializeAICodeAssistantPanel(monaco);
    aiAssistantPanel.setEditor(editorInstance);
    console.log('✅ AI Assistant Panel initialized');
    
    console.log('🎉 All AI Code Writing Features initialized successfully!');
    
    // Show welcome notification
    showAIFeaturesWelcome();
    
  } catch (error) {
    console.error('❌ Error initializing AI features:', error);
  }
  
  // ============================================================================
  // STEP 4: Set up editor event listeners
  // ============================================================================
  
  // Update AI panel context when cursor moves
  editorInstance.onDidChangeCursorPosition(() => {
    if (aiAssistantPanel) {
      aiAssistantPanel.setEditor(editorInstance);
    }
  });
  
  // Update AI panel when content changes
  editorInstance.onDidChangeModelContent(() => {
    // Optional: Track changes for AI context
    console.log('Content changed');
  });
  
  // Update AI panel when file changes
  editorInstance.onDidChangeModel(() => {
    if (aiAssistantPanel) {
      aiAssistantPanel.setEditor(editorInstance);
    }
  });
  
  console.log('✅ Editor initialized with AI features');
}

/**
 * Show welcome message about AI features
 */
function showAIFeaturesWelcome(): void {
  // Create a welcome overlay (optional)
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
  closeBtn?.addEventListener('click', () => {
    welcome.remove();
  });
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    welcome.remove();
  }, 10000);
}

/**
 * Open file in editor
 */
export async function openFile(filePath: string): Promise<void> {
  if (!editorInstance) return;
  
  try {
    // Read file content from Rust backend
    const content = await invoke<string>('read_file', { path: filePath });
    
    // Detect language from file extension
    const language = detectLanguage(filePath);
    
    // Create or get model
    const uri = monaco.Uri.file(filePath);
    let model = monaco.editor.getModel(uri);
    
    if (!model) {
      model = monaco.editor.createModel(content, language, uri);
    } else {
      model.setValue(content);
    }
    
    // Set model in editor
    editorInstance.setModel(model);
    
    // Update AI panel
    if (aiAssistantPanel) {
      aiAssistantPanel.setEditor(editorInstance);
    }
    
    console.log(`✅ Opened file: ${filePath}`);
    
  } catch (error) {
    console.error('Error opening file:', error);
  }
}

/**
 * Detect language from file path
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'rs': 'rust',
    'go': 'go',
    'php': 'php',
    'rb': 'ruby',
    'md': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}

/**
 * Save current file
 */
export async function saveCurrentFile(): Promise<void> {
  if (!editorInstance) return;
  
  const model = editorInstance.getModel();
  if (!model) return;
  
  const filePath = model.uri.path;
  const content = model.getValue();
  
  try {
    await invoke('write_file', { 
      path: filePath, 
      contents: content 
    });
    
    console.log(`✅ Saved file: ${filePath}`);
    
  } catch (error) {
    console.error('Error saving file:', error);
  }
}

/**
 * Get current editor instance
 */
export function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return editorInstance;
}

/**
 * Get AI assistant panel
 */
export function getAIPanel(): any {
  return aiAssistantPanel;
}

/**
 * Dispose editor
 */
export function disposeEditor(): void {
  if (editorInstance) {
    editorInstance.dispose();
    editorInstance = null;
  }
}

// ============================================================================
// ADDITIONAL UTILITIES
// ============================================================================

/**
 * Show AI help dialog
 */
export function showAIHelp(): void {
  if (aiAssistantPanel) {
    aiAssistantPanel.show();
  }
}

/**
 * Toggle AI panel
 */
export function toggleAIPanel(): void {
  if (aiAssistantPanel) {
    aiAssistantPanel.toggle();
  }
}

// Export for use in other parts of the app
export {
  monaco
};
