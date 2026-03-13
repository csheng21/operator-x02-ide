// clarificationUI.ts - PROFESSIONAL DEVELOPER UI VERSION WITH CUSTOM INPUT

import { ClarificationRequest, ClarificationOption, clarificationManager } from './clarificationManager';

// ============================================================================
// UI STATE
// ============================================================================

let currentClarificationRequest: ClarificationRequest | null = null;
let onChoiceCallback: ((option: ClarificationOption) => void) | null = null;

// ============================================================================
// SHOW CLARIFICATION UI
// ============================================================================

export function showClarificationDialog(
  request: ClarificationRequest,
  onChoice: (option: ClarificationOption) => void
): void {
  currentClarificationRequest = request;
  onChoiceCallback = onChoice;
  
  const existing = document.getElementById('clarification-dialog');
  if (existing) existing.remove();
  
  const dialog = createClarificationDialog(request);
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (chatContainer) {
    chatContainer.appendChild(dialog);
    dialog.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
      const firstOption = dialog.querySelector('.clarification-option') as HTMLElement;
      if (firstOption) firstOption.focus();
    }, 100);
  }
}

// ============================================================================
// CREATE DIALOG
// ============================================================================

function createClarificationDialog(request: ClarificationRequest): HTMLElement {
  const dialog = document.createElement('div');
  dialog.id = 'clarification-dialog';
  dialog.className = 'clarification-dialog';
  
  dialog.innerHTML = `
    <div class="clarification-header">
      <span class="clarification-icon">⚡</span>
      <span class="clarification-question">${escapeHtml(request.question)}</span>
    </div>
    
    <div class="clarification-options" id="clarification-options">
      ${request.options.map((option, idx) => createOptionHTML(option, idx)).join('')}
    </div>
    
    <div class="clarification-custom-input" id="custom-input-container" style="display: none;">
      <input type="text" 
             id="custom-clarification-input" 
             class="custom-input-field"
             placeholder="Type your clarification here..."
             autocomplete="off" />
      <button class="custom-input-submit" id="custom-input-submit">Send</button>
    </div>
    
    <div class="clarification-footer">
      <span class="clarification-hint">Press 1-${request.options.length} or Esc</span>
      <button class="clarification-cancel-btn" onclick="window.cancelClarification()">Cancel</button>
    </div>
  `;
  
  setupOptionListeners(dialog, request.options);
  setupCustomInput(dialog);
  
  return dialog;
}

function createOptionHTML(option: ClarificationOption, index: number): string {
  return `
    <div class="clarification-option" 
         data-option-id="${option.id}" 
         tabindex="0"
         role="button"
         aria-label="${escapeHtml(option.label)}">
      <div class="option-number">${index + 1}</div>
      <div class="option-content">
        <div class="option-label">${escapeHtml(option.label)}</div>
        <div class="option-description">${escapeHtml(option.description)}</div>
      </div>
    </div>
  `;
}

// ============================================================================
// CUSTOM INPUT SETUP
// ============================================================================

function setupCustomInput(dialog: HTMLElement): void {
  const customInputContainer = dialog.querySelector('#custom-input-container') as HTMLElement;
  const customInput = dialog.querySelector('#custom-clarification-input') as HTMLInputElement;
  const submitButton = dialog.querySelector('#custom-input-submit') as HTMLButtonElement;
  
  // Handle submit button click
  submitButton?.addEventListener('click', () => {
    submitCustomInput(customInput);
  });
  
  // Handle Enter key in input
  customInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustomInput(customInput);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideCustomInput();
    }
  });
}

function showCustomInput(): void {
  const customInputContainer = document.getElementById('custom-input-container');
  const customInput = document.getElementById('custom-clarification-input') as HTMLInputElement;
  
  if (customInputContainer && customInput) {
    customInputContainer.style.display = 'flex';
    customInput.focus();
    
    // Scroll into view
    customInputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideCustomInput(): void {
  const customInputContainer = document.getElementById('custom-input-container');
  const customInput = document.getElementById('custom-clarification-input') as HTMLInputElement;
  
  if (customInputContainer && customInput) {
    customInputContainer.style.display = 'none';
    customInput.value = '';
  }
}

function submitCustomInput(input: HTMLInputElement): void {
  const customText = input.value.trim();
  
  if (!customText) {
    input.style.borderColor = '#ff0000';
    setTimeout(() => {
      input.style.borderColor = '';
    }, 500);
    return;
  }
  
  // Create custom option
  const customOption: ClarificationOption = {
    id: 'custom',
    label: 'Custom clarification',
    description: customText,
    context: customText
  };
  
  console.log('📝 Custom clarification:', customText);
  
  selectOption(customOption);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupOptionListeners(dialog: HTMLElement, options: ClarificationOption[]): void {
  const optionElements = dialog.querySelectorAll('.clarification-option');
  
  optionElements.forEach((element, index) => {
    const option = options[index];
    
    element.addEventListener('click', () => {
      // Check if this is the custom input option
      if (option.id === 'custom_input') {
        showCustomInput();
      } else {
        selectOption(option);
      }
    });
    
    element.addEventListener('keydown', (e: Event) => {
      const kbd = e as KeyboardEvent;
      if (kbd.key === 'Enter' || kbd.key === ' ') {
        e.preventDefault();
        if (option.id === 'custom_input') {
          showCustomInput();
        } else {
          selectOption(option);
        }
      } else if (kbd.key === 'ArrowDown') {
        e.preventDefault();
        const next = element.nextElementSibling as HTMLElement;
        if (next) next.focus();
      } else if (kbd.key === 'ArrowUp') {
        e.preventDefault();
        const prev = element.previousElementSibling as HTMLElement;
        if (prev) prev.focus();
      } else if (kbd.key === 'Escape') {
        e.preventDefault();
        hideClarificationDialog();
      }
    });
  });
  
  // Number key shortcuts
  const handleNumberKey = (e: KeyboardEvent) => {
    if (document.getElementById('clarification-dialog')) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        e.preventDefault();
        const selectedOption = options[num - 1];
        if (selectedOption.id === 'custom_input') {
          showCustomInput();
        } else {
          selectOption(selectedOption);
        }
        document.removeEventListener('keydown', handleNumberKey);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideClarificationDialog();
        document.removeEventListener('keydown', handleNumberKey);
      }
    }
  };
  
  document.addEventListener('keydown', handleNumberKey);
}

function selectOption(option: ClarificationOption): void {
  if (!currentClarificationRequest || !onChoiceCallback) return;
  
  clarificationManager.recordClarificationChoice(
    currentClarificationRequest.originalMessage,
    option.id
  );
  
  const optionElement = document.querySelector(`[data-option-id="${option.id}"]`);
  if (optionElement) {
    optionElement.classList.add('selected');
  }
  
  console.log('✅ Selected option:', option.label);
  console.log('📋 Context:', option.context);
  
  setTimeout(() => {
    if (onChoiceCallback) {
      onChoiceCallback(option);
    }
    hideClarificationDialog();
  }, 150);
}

// ============================================================================
// HIDE DIALOG
// ============================================================================

export function hideClarificationDialog(): void {
  const dialog = document.getElementById('clarification-dialog');
  if (dialog) {
    dialog.classList.add('fade-out');
    setTimeout(() => dialog.remove(), 200);
  }
  
  currentClarificationRequest = null;
  onChoiceCallback = null;
}

(window as any).cancelClarification = hideClarificationDialog;

// ============================================================================
// PROFESSIONAL DEVELOPER STYLES
// ============================================================================

export function addClarificationStyles(): void {
  if (document.getElementById('clarification-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'clarification-styles';
  style.textContent = `
    .clarification-dialog {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-left: 3px solid #007acc;
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.2s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .clarification-dialog.fade-out {
      animation: fadeOut 0.15s ease-out;
    }
    
    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: scale(0.98);
      }
    }
    
    .clarification-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #3c3c3c;
    }
    
    .clarification-icon {
      font-size: 16px;
      color: #007acc;
    }
    
    .clarification-question {
      font-size: 13px;
      font-weight: 600;
      color: #cccccc;
      flex: 1;
    }
    
    .clarification-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }
    
    .clarification-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 3px;
      padding: 8px 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      outline: none;
    }
    
    .clarification-option:hover {
      background: #2a2d2e;
      border-color: #007acc;
    }
    
    .clarification-option:focus {
      background: #2a2d2e;
      border-color: #007acc;
      box-shadow: 0 0 0 1px #007acc;
    }
    
    .clarification-option.selected {
      background: #0e4e0e;
      border-color: #00bc00;
    }
    
    .option-number {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      background: #3c3c3c;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      color: #cccccc;
      flex-shrink: 0;
      margin-top: 1px;
    }
    
    .clarification-option:hover .option-number,
    .clarification-option:focus .option-number {
      background: #007acc;
      color: #ffffff;
    }
    
    .clarification-option.selected .option-number {
      background: #00bc00;
      color: #ffffff;
    }
    
    .option-content {
      flex: 1;
      min-width: 0;
    }
    
    .option-label {
      font-size: 13px;
      font-weight: 500;
      color: #cccccc;
      margin-bottom: 2px;
      line-height: 1.4;
    }
    
    .option-description {
      font-size: 11px;
      color: #858585;
      line-height: 1.3;
    }
    
    /* Custom Input Section */
    .clarification-custom-input {
      display: flex;
      gap: 8px;
      padding: 10px;
      background: #252526;
      border: 1px solid #007acc;
      border-radius: 3px;
      margin-bottom: 8px;
      animation: slideIn 0.2s ease-out;
    }
    
    .custom-input-field {
      flex: 1;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 3px;
      padding: 6px 10px;
      color: #cccccc;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      outline: none;
      transition: border-color 0.15s;
    }
    
    .custom-input-field:focus {
      border-color: #007acc;
      box-shadow: 0 0 0 1px #007acc;
    }
    
    .custom-input-field::placeholder {
      color: #858585;
    }
    
    .custom-input-submit {
      background: #007acc;
      border: none;
      border-radius: 3px;
      color: #ffffff;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    
    .custom-input-submit:hover {
      background: #005a9e;
    }
    
    .custom-input-submit:active {
      transform: scale(0.98);
    }
    
    .clarification-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid #3c3c3c;
    }
    
    .clarification-hint {
      font-size: 11px;
      color: #858585;
      font-style: italic;
    }
    
    .clarification-cancel-btn {
      background: transparent;
      border: 1px solid #3c3c3c;
      color: #cccccc;
      padding: 4px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: all 0.15s;
    }
    
    .clarification-cancel-btn:hover {
      background: #3c3c3c;
      border-color: #007acc;
    }
    
    /* Dark mode adjustments */
    @media (prefers-color-scheme: dark) {
      .clarification-dialog {
        background: #1e1e1e;
        border-color: #3c3c3c;
      }
    }
    
    /* Compact mode for smaller screens */
    @media (max-width: 600px) {
      .clarification-dialog {
        padding: 10px;
      }
      
      .option-label {
        font-size: 12px;
      }
      
      .option-description {
        font-size: 10px;
      }
      
      .custom-input-field {
        font-size: 11px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// ============================================================================
// UTILITY
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// INITIALIZE
// ============================================================================

export function initializeClarificationUI(): void {
  addClarificationStyles();
  console.log('✅ Clarification UI initialized (Professional Dev Mode with Custom Input)');
}
