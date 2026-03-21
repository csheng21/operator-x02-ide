// ============================================================================
// FILE: src/ide/aiAssistant/inlineAICodeWriter.ts
// PURPOSE: AI writes code directly into files based on comments/instructions
// ============================================================================

import { callGenericAPI } from './apiProviderManager';
import { invoke } from '@tauri-apps/api/core';
import { showNotification } from './notificationManager';

/**
 * ✅ APPROACH 1: Inline Comment → AI Code Generation
 * 
 * User writes:
 *   // AI: Create a function to validate email addresses
 * 
 * AI generates:
 *   function validateEmail(email: string): boolean {
 *     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 *     return regex.test(email);
 *   }
 */

interface InlineCodeRequest {
  instruction: string;
  language: string;
  contextBefore?: string;  // Code before cursor
  contextAfter?: string;   // Code after cursor
  filePath?: string;
}

interface InlineCodeResponse {
  code: string;
  explanation?: string;
}

/**
 * Main function: Generate code based on inline instruction
 */
export async function generateInlineCode(
  request: InlineCodeRequest
): Promise<InlineCodeResponse | null> {
  
  console.log('🤖 Generating inline code...');
  console.log('Instruction:', request.instruction);
  console.log('Language:', request.language);
  
  try {
    const prompt = buildInlineCodePrompt(request);
    
    const aiResponse = await callGenericAPI(prompt);
    
    // Extract code from response
    const code = extractCodeFromResponse(aiResponse, request.language);
    
    if (!code) {
      console.warn('No code extracted from AI response');
      return null;
    }
    
    return {
      code: code,
      explanation: extractExplanation(aiResponse)
    };
    
  } catch (error) {
    console.error('Error generating inline code:', error);
    showNotification('Failed to generate code', 'error');
    return null;
  }
}

/**
 * Build prompt for AI code generation
 */
function buildInlineCodePrompt(request: InlineCodeRequest): string {
  const { instruction, language, contextBefore, contextAfter } = request;
  
  let prompt = `You are a code generator. Generate ONLY the code, no explanations.

Language: ${language}
Task: ${instruction}

`;

  if (contextBefore) {
    prompt += `Code before (for context):
\`\`\`${language}
${contextBefore}
\`\`\`

`;
  }
  
  if (contextAfter) {
    prompt += `Code after (for context):
\`\`\`${language}
${contextAfter}
\`\`\`

`;
  }
  
  prompt += `Generate the code now. Output ONLY code wrapped in \`\`\`${language} code blocks, nothing else.`;
  
  return prompt;
}

/**
 * Extract code from AI response
 */
function extractCodeFromResponse(response: string, language: string): string | null {
  // Try to find code block
  const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Try generic code block
  const genericMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }
  
  // If no code block, return the whole response (might be just code)
  return response.trim();
}

/**
 * Extract explanation if present
 */
function extractExplanation(response: string): string | undefined {
  const lines = response.split('\n');
  const explanationLines: string[] = [];
  let inCodeBlock = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    
    if (!inCodeBlock && line.trim().length > 0) {
      explanationLines.push(line);
    }
  }
  
  const explanation = explanationLines.join('\n').trim();
  return explanation.length > 0 ? explanation : undefined;
}

// ============================================================================
// MONACO EDITOR INTEGRATION
// ============================================================================

/**
 * Initialize inline AI code writer for Monaco editor
 */
export function initializeInlineAICodeWriter(monaco: any, editorInstance?: any): void {
  console.log('🚀 Initializing Inline AI Code Writer...');
  
  // Register action on the editor instance (addAction only exists on instance, not namespace)
  if (editorInstance) {
    editorInstance.addAction({
      id: 'ai-inline-code-generator',
      label: 'AI: Generate Code Here',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI
      ],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: async (ed: any) => {
        await handleInlineCodeGeneration(ed);
      }
    });
  } else {
    console.warn('[InlineAI] No editor instance - keybinding not registered.');
  }
  
  // ✅ NEW: Auto-detect AI comments
  setupAutoDetection(monaco);
  
  console.log('✅ Inline AI Code Writer initialized');
}

/**
 * Handle inline code generation
 */
async function handleInlineCodeGeneration(editor: any): Promise<void> {
  const position = editor.getPosition();
  const model = editor.getModel();
  
  if (!model) return;
  
  const language = model.getLanguageId();
  
  // Get instruction from user
  const instruction = await showInlineCodeInputDialog();
  
  if (!instruction) return;
  
  // Get context (code before and after cursor)
  const contextBefore = getContextBefore(editor, position);
  const contextAfter = getContextAfter(editor, position);
  
  // Show loading indicator
  showNotification('🤖 AI is writing code...', 'info');
  
  try {
    // Generate code
    const result = await generateInlineCode({
      instruction,
      language,
      contextBefore,
      contextAfter,
      filePath: model.uri?.path
    });
    
    if (!result) {
      showNotification('Failed to generate code', 'error');
      return;
    }
    
    // Insert code at cursor position
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };
    
    editor.executeEdits('ai-inline-code', [{
      range: range,
      text: '\n' + result.code + '\n',
      forceMoveMarkers: true
    }]);
    
    // Show success notification
    showNotification('✅ Code generated successfully', 'success');
    
    // Optionally show explanation in chat
    if (result.explanation) {
      // You can integrate with your AI Chat here
      console.log('Explanation:', result.explanation);
    }
    
  } catch (error) {
    console.error('Error generating code:', error);
    showNotification('Failed to generate code', 'error');
  }
}

/**
 * Show input dialog for code instruction
 */
function showInlineCodeInputDialog(): Promise<string | null> {
  return new Promise((resolve) => {
    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.className = 'inline-code-input-dialog';
    dialog.innerHTML = `
      <div class="dialog-backdrop"></div>
      <div class="dialog-content">
        <h3>🤖 AI Code Generator</h3>
        <p>Describe what code you want to generate:</p>
        <textarea 
          id="inline-code-instruction" 
          placeholder="Example: Create a function to sort an array of objects by name"
          rows="4"
          autofocus
        ></textarea>
        <div class="dialog-buttons">
          <button id="inline-code-cancel" class="btn-secondary">Cancel</button>
          <button id="inline-code-generate" class="btn-primary">Generate Code</button>
        </div>
      </div>
      <style>
        .inline-code-input-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
        }
        .inline-code-input-dialog .dialog-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        .inline-code-input-dialog .dialog-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #2d2d2d;
          padding: 24px;
          border-radius: 8px;
          min-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .inline-code-input-dialog h3 {
          margin: 0 0 16px 0;
          color: #cccccc;
          font-size: 18px;
        }
        .inline-code-input-dialog p {
          margin: 0 0 12px 0;
          color: #999999;
          font-size: 14px;
        }
        .inline-code-input-dialog textarea {
          width: 100%;
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          color: #cccccc;
          padding: 12px;
          border-radius: 4px;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 16px;
        }
        .inline-code-input-dialog textarea:focus {
          outline: none;
          border-color: #007acc;
        }
        .inline-code-input-dialog .dialog-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .inline-code-input-dialog button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .inline-code-input-dialog .btn-primary {
          background: #007acc;
          color: white;
        }
        .inline-code-input-dialog .btn-primary:hover {
          background: #005a9e;
        }
        .inline-code-input-dialog .btn-secondary {
          background: #3c3c3c;
          color: #cccccc;
        }
        .inline-code-input-dialog .btn-secondary:hover {
          background: #4e4e4e;
        }
      </style>
    `;
    
    document.body.appendChild(dialog);
    
    const textarea = dialog.querySelector('#inline-code-instruction') as HTMLTextAreaElement;
    const cancelBtn = dialog.querySelector('#inline-code-cancel') as HTMLButtonElement;
    const generateBtn = dialog.querySelector('#inline-code-generate') as HTMLButtonElement;
    
    textarea.focus();
    
    const cleanup = () => {
      dialog.remove();
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    generateBtn.addEventListener('click', () => {
      const instruction = textarea.value.trim();
      cleanup();
      resolve(instruction || null);
    });
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const instruction = textarea.value.trim();
        cleanup();
        resolve(instruction || null);
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
  });
}

/**
 * Get code context before cursor
 */
function getContextBefore(editor: any, position: any, maxLines: number = 20): string {
  const model = editor.getModel();
  const startLine = Math.max(1, position.lineNumber - maxLines);
  const endLine = position.lineNumber - 1;
  
  if (endLine < startLine) return '';
  
  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(model.getLineContent(i));
  }
  
  return lines.join('\n');
}

/**
 * Get code context after cursor
 */
function getContextAfter(editor: any, position: any, maxLines: number = 20): string {
  const model = editor.getModel();
  const startLine = position.lineNumber + 1;
  const endLine = Math.min(model.getLineCount(), position.lineNumber + maxLines);
  
  if (startLine > endLine) return '';
  
  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(model.getLineContent(i));
  }
  
  return lines.join('\n');
}

// ============================================================================
// AUTO-DETECTION OF AI COMMENTS
// ============================================================================

/**
 * Setup auto-detection for AI comment triggers
 */
function setupAutoDetection(monaco: any): void {
  // Listen for content changes
  monaco.editor.onDidCreateEditor((editor: any) => {
    const model = editor.getModel();
    if (!model) return;
    
    model.onDidChangeContent((e: any) => {
      checkForAIComments(editor);
    });
  });
}

/**
 * Check for AI comment triggers like:
 * // AI: Create a function...
 * // TODO: AI implement this
 */
function checkForAIComments(editor: any): void {
  const model = editor.getModel();
  if (!model) return;
  
  const position = editor.getPosition();
  const line = model.getLineContent(position.lineNumber);
  
  // Check if line contains AI trigger
  const aiTriggerRegex = /\/\/\s*AI:\s*(.+)/i;
  const todoAiRegex = /\/\/\s*TODO:\s*AI\s+(.+)/i;
  
  const aiMatch = line.match(aiTriggerRegex);
  const todoMatch = line.match(todoAiRegex);
  
  if (aiMatch || todoMatch) {
    const instruction = (aiMatch || todoMatch)![1].trim();
    
    // Show inline suggestion
    showInlineAISuggestion(editor, position.lineNumber, instruction);
  }
}

/**
 * Show inline AI suggestion (Code Lens style)
 */
function showInlineAISuggestion(editor: any, lineNumber: number, instruction: string): void {
  // This would show a clickable "Generate code" button above the comment
  // Implementation depends on Monaco's decoration API
  
  console.log(`🤖 AI trigger detected on line ${lineNumber}: "${instruction}"`);
  showNotification(`AI detected: "${instruction}". Press Ctrl+Shift+I to generate`, 'info');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateInlineCode,
  initializeInlineAICodeWriter
};
