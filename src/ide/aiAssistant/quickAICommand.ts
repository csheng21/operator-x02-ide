// ============================================================================
// FILE: src/ide/aiAssistant/quickAICommand.ts
// PURPOSE: Quick command (Ctrl+K) for fast AI code generation
// ============================================================================

import { callGenericAPI } from './apiProviderManager';
import { showNotification } from './notificationManager';

/**
 * ✅ APPROACH 3: Quick Command (Ctrl+K)
 * 
 * User presses Ctrl+K
 * Input box appears: "What code do you want?"
 * User types: "function to fetch user data from API"
 * AI generates code at cursor position
 */

/**
 * Initialize quick AI command (Ctrl+K)
 */
export function initializeQuickAICommand(monaco: any): void {
  console.log('🚀 Initializing Quick AI Command...');
  
  // Register Ctrl+K command
  monaco.editor.addCommand({
    id: 'ai-quick-command',
    label: 'AI: Quick Code Generation',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK
    ],
    run: async (editor: any) => {
      await handleQuickCommand(editor);
    }
  });
  
  console.log('✅ Quick AI Command initialized (Ctrl+K)');
}

/**
 * Handle quick command
 */
async function handleQuickCommand(editor: any): Promise<void> {
  const model = editor.getModel();
  if (!model) return;
  
  const language = model.getLanguageId();
  const position = editor.getPosition();
  
  // Show quick input
  const instruction = await showQuickInput();
  
  if (!instruction) return;
  
  // Show loading
  showNotification('🤖 Generating code...', 'info');
  
  try {
    // Generate code
    const code = await generateCodeQuick(instruction, language);
    
    if (!code) {
      showNotification('Failed to generate code', 'error');
      return;
    }
    
    // Insert at cursor
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };
    
    editor.executeEdits('ai-quick', [{
      range: range,
      text: '\n' + code + '\n',
      forceMoveMarkers: true
    }]);
    
    showNotification('✅ Code generated', 'success');
    
  } catch (error) {
    console.error('Error generating code:', error);
    showNotification('Failed to generate code', 'error');
  }
}

/**
 * Show quick input box (lightweight, fast)
 */
function showQuickInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('div');
    input.className = 'quick-ai-input';
    input.innerHTML = `
      <div class="quick-input-overlay"></div>
      <div class="quick-input-box">
        <div class="quick-input-header">
          <span>🤖 AI Quick Code</span>
          <span class="quick-input-hint">Ctrl+K</span>
        </div>
        <input 
          type="text" 
          id="quick-ai-input-field"
          placeholder="Describe the code you want..."
          autofocus
        />
      </div>
      <style>
        .quick-ai-input {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
        }
        .quick-ai-input .quick-input-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
        }
        .quick-ai-input .quick-input-box {
          position: absolute;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: #2d2d2d;
          border: 1px solid #007acc;
          border-radius: 6px;
          width: 600px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .quick-ai-input .quick-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #3c3c3c;
          font-size: 12px;
          color: #cccccc;
        }
        .quick-ai-input .quick-input-hint {
          font-size: 11px;
          color: #666;
        }
        .quick-ai-input input {
          width: 100%;
          background: #1e1e1e;
          border: none;
          color: #cccccc;
          padding: 16px;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 14px;
        }
        .quick-ai-input input:focus {
          outline: none;
        }
      </style>
    `;
    
    document.body.appendChild(input);
    
    const inputField = input.querySelector('#quick-ai-input-field') as HTMLInputElement;
    const overlay = input.querySelector('.quick-input-overlay') as HTMLElement;
    
    inputField.focus();
    
    const cleanup = () => input.remove();
    
    overlay.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = inputField.value.trim();
        cleanup();
        resolve(value || null);
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Generate code quickly (simpler prompt for speed)
 */
async function generateCodeQuick(instruction: string, language: string): Promise<string | null> {
  const prompt = `Generate ${language} code: ${instruction}

Output ONLY code in a \`\`\`${language} code block, no explanations.`;

  try {
    const response = await callGenericAPI(prompt);
    
    // Extract code
    const codeMatch = response.match(/```(?:\w+)?\s*\n([\s\S]*?)\n```/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }
    
    return response.trim();
    
  } catch (error) {
    console.error('Error generating quick code:', error);
    return null;
  }
}

export default {
  initializeQuickAICommand
};
