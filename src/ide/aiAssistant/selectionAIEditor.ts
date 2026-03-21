// ============================================================================
// FILE: src/ide/aiAssistant/selectionAIEditor.ts
// PURPOSE: AI edits/modifies selected code based on instructions
// ============================================================================

import { callGenericAPI } from './apiProviderManager';
import { showNotification } from './notificationManager';

/**
 * ✅ APPROACH 2: Selection + AI Edit
 * 
 * User selects code:
 *   function hello() {
 *     console.log("Hi");
 *   }
 * 
 * User describes: "Add error handling and TypeScript types"
 * 
 * AI generates:
 *   function hello(): void {
 *     try {
 *       console.log("Hi");
 *     } catch (error) {
 *       console.error("Error in hello():", error);
 *     }
 *   }
 */

interface SelectionEditRequest {
  selectedCode: string;
  instruction: string;
  language: string;
  filePath?: string;
}

/**
 * Edit selected code based on instruction
 */
export async function editSelectedCode(
  request: SelectionEditRequest
): Promise<string | null> {
  
  console.log('✏️ Editing selected code with AI...');
  console.log('Selected code length:', request.selectedCode.length);
  console.log('Instruction:', request.instruction);
  
  try {
    const prompt = `You are a code editor. Modify the given code according to the instruction.

Language: ${request.language}
Instruction: ${request.instruction}

Original code:
\`\`\`${request.language}
${request.selectedCode}
\`\`\`

Modified code (output ONLY the modified code in a code block, no explanations):`;

    const aiResponse = await callGenericAPI(prompt);
    
    // Extract modified code
    const modifiedCode = extractCode(aiResponse, request.language);
    
    if (!modifiedCode) {
      console.warn('No code extracted from AI response');
      return null;
    }
    
    return modifiedCode;
    
  } catch (error) {
    console.error('Error editing code:', error);
    showNotification('Failed to edit code', 'error');
    return null;
  }
}

/**
 * Extract code from AI response
 */
function extractCode(response: string, language: string): string | null {
  // Try language-specific code block
  const langRegex = new RegExp(`\`\`\`(?:${language})?\\s*\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = response.match(langRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Try generic code block
  const genericMatch = response.match(/```\s*\n([\s\S]*?)\n```/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }
  
  // Return whole response if no code block
  return response.trim();
}

/**
 * Initialize selection-based AI editor for Monaco
 */
export function initializeSelectionAIEditor(monaco: any, editorInstance?: any): void {
  console.log('🚀 Initializing Selection AI Editor...');
  
  // Add context menu action - only when text is selected
  if (editorInstance) editorInstance.addAction({
    id: 'ai-edit-selection',
    label: '✏️ AI: Edit Selection',
    contextMenuGroupId: 'ai-actions',
    contextMenuOrder: 1,
    precondition: 'editorHasSelection',
    run: async (editor: any) => {
      await handleSelectionEdit(editor);
    }
  });
  
  // Add keyboard shortcut: Ctrl+Shift+E
  
  console.log('✅ Selection AI Editor initialized');
}

/**
 * Handle selection editing
 */
async function handleSelectionEdit(editor: any): Promise<void> {
  const selection = editor.getSelection();
  const model = editor.getModel();
  
  if (!selection || !model) return;
  
  const selectedCode = model.getValueInRange(selection);
  
  if (!selectedCode) {
    showNotification('Please select some code first', 'warning');
    return;
  }
  
  const language = model.getLanguageId();
  
  // Get instruction from user
  const instruction = await showEditInstructionDialog(selectedCode);
  
  if (!instruction) return;
  
  // Show loading
  showNotification('🤖 AI is editing your code...', 'info');
  
  try {
    // Get modified code from AI
    const modifiedCode = await editSelectedCode({
      selectedCode,
      instruction,
      language,
      filePath: model.uri?.path
    });
    
    if (!modifiedCode) {
      showNotification('Failed to edit code', 'error');
      return;
    }
    
    // Replace selected code with modified code
    editor.executeEdits('ai-edit', [{
      range: selection,
      text: modifiedCode,
      forceMoveMarkers: true
    }]);
    
    showNotification('✅ Code edited successfully', 'success');
    
  } catch (error) {
    console.error('Error editing selection:', error);
    showNotification('Failed to edit code', 'error');
  }
}

/**
 * Show dialog for edit instruction
 */
function showEditInstructionDialog(selectedCode: string): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'edit-instruction-dialog';
    
    const codePreview = selectedCode.length > 100 
      ? selectedCode.substring(0, 100) + '...'
      : selectedCode;
    
    dialog.innerHTML = `
      <div class="dialog-backdrop"></div>
      <div class="dialog-content">
        <h3>✏️ AI Code Editor</h3>
        <div class="code-preview">
          <strong>Selected code:</strong>
          <pre>${escapeHtml(codePreview)}</pre>
        </div>
        <p>What changes do you want to make?</p>
        <textarea 
          id="edit-instruction" 
          placeholder="Examples:
• Add error handling
• Convert to TypeScript
• Add comments and documentation
• Optimize performance
• Add input validation"
          rows="4"
          autofocus
        ></textarea>
        <div class="dialog-buttons">
          <button id="edit-cancel" class="btn-secondary">Cancel</button>
          <button id="edit-apply" class="btn-primary">Apply Changes</button>
        </div>
      </div>
      <style>
        .edit-instruction-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
        }
        .edit-instruction-dialog .dialog-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        .edit-instruction-dialog .dialog-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #2d2d2d;
          padding: 24px;
          border-radius: 8px;
          min-width: 550px;
          max-width: 700px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .edit-instruction-dialog h3 {
          margin: 0 0 16px 0;
          color: #cccccc;
          font-size: 18px;
        }
        .edit-instruction-dialog .code-preview {
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .edit-instruction-dialog .code-preview strong {
          color: #4ec9b0;
          font-size: 12px;
        }
        .edit-instruction-dialog .code-preview pre {
          margin: 8px 0 0 0;
          color: #d4d4d4;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 12px;
          white-space: pre-wrap;
        }
        .edit-instruction-dialog p {
          margin: 0 0 12px 0;
          color: #999999;
          font-size: 14px;
        }
        .edit-instruction-dialog textarea {
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
        .edit-instruction-dialog textarea:focus {
          outline: none;
          border-color: #007acc;
        }
        .edit-instruction-dialog .dialog-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .edit-instruction-dialog button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .edit-instruction-dialog .btn-primary {
          background: #007acc;
          color: white;
        }
        .edit-instruction-dialog .btn-primary:hover {
          background: #005a9e;
        }
        .edit-instruction-dialog .btn-secondary {
          background: #3c3c3c;
          color: #cccccc;
        }
        .edit-instruction-dialog .btn-secondary:hover {
          background: #4e4e4e;
        }
      </style>
    `;
    
    document.body.appendChild(dialog);
    
    const textarea = dialog.querySelector('#edit-instruction') as HTMLTextAreaElement;
    const cancelBtn = dialog.querySelector('#edit-cancel') as HTMLButtonElement;
    const applyBtn = dialog.querySelector('#edit-apply') as HTMLButtonElement;
    
    textarea.focus();
    
    const cleanup = () => dialog.remove();
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    applyBtn.addEventListener('click', () => {
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
 * Escape HTML for display
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default {
  editSelectedCode,
  initializeSelectionAIEditor
};
