// codeAnalysisManager.ts - Complete Code Analysis with Direct Response and HTML Export
import { analyzeCurrentCode, getCurrentFileInfo } from './codeAnalyzer';
import { getCurrentApiConfiguration, getProviderDisplayName } from '../../state';
import { callGenericAPI } from './apiProviderManager';
// Add this import near the top with other imports
import { displayCodeAsHTML } from './codeViewerHTML';
// Import from other modules
import { showTypingIndicator, hideTypingIndicator } from './typingIndicator';
import { showNotification } from './notificationManager';
import { 
  getCurrentCodeContext, 
  setCodeAnalysisMode, 
  isInCodeAnalysis 
} from './codeContextManager';

// Message-related imports
import { 
  addMessageToChat, 
  addSystemMessage,
  createMessageMetadata,
  setupCodeBlockEventListeners
} from './messageUI';

// UI helper imports
import { 
  generateId,
  formatTime,
  escapeHtml,
  getProviderInfo,
  sendMessageDirectly
} from './assistantUI';

// Track decorations so we can update them later
let currentDecorations: string[] = [];
let currentWarningDecorations: string[] = [];
let currentAutoFixDecorations: string[] = [];

// Add this to track the original code state
let originalCodeState: string | null = null;

// Track auto-fix availability
let autoFixEnabled: boolean = true; // PERMANENT FIX: Always enabled

// Store fix handlers for each line
let fixHandlers: Map<number, () => void> = new Map();



/**
 * Check if autonomous mode is active
 * PERMANENT FIX: Always returns true to enable auto-fix
 */
function isAutonomousActive(): boolean {
  return true;
}

/**
 * Get indentation of a line
 */
function getIndentation(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

/**
 * Generate suggested actions based on the analysis context with multi-select support
 */
/**
 * Generate suggested actions based on the analysis context with multi-select support
 */
function generateSuggestedActions(language: string, hasErrors: boolean, context: 'analysis' | 'debug' = 'analysis'): Array<{text: string, prompt: string, icon: string, id: string}> {
  if (context === 'debug') {
    // Debug-specific suggestions with SVG icons
    const debugSuggestions = [
      {
        text: 'Fix All Errors',
        prompt: 'Help me fix all the syntax errors found in the debug analysis',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>',
        id: 'fix-errors'
      },
      {
        text: 'Explain Errors',
        prompt: 'Explain why these errors occurred and how to prevent them in the future',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        id: 'explain-errors'
      },
      {
        text: 'Generate Fixed Version',
        prompt: 'Generate a completely fixed and improved version of this code',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        id: 'generate-fixed'
      },
      {
        text: 'Add Error Handling',
        prompt: 'Add comprehensive error handling to make this code more robust',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        id: 'add-error-handling'
      }
    ];
    return debugSuggestions;
  }
  
  // Analysis context suggestions with SVG icons
  const suggestions = [
    {
      text: 'Generate Flow Chart',
      prompt: `Create a detailed flow chart diagram for the ${language} code I just analyzed, showing the program flow and logic`,
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      id: 'flow-chart'
    },
    {
      text: 'Generate Test Cases',
      prompt: `Generate comprehensive unit test cases for the ${language} code with edge cases and expected outputs`,
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 2h10v20H7z"/><path d="M7 12h10"/><circle cx="12" cy="6" r="1"/><circle cx="12" cy="18" r="1"/></svg>',
      id: 'test-cases'
    },
    {
      text: 'Create Technical Documentation',
      prompt: `Write detailed technical documentation for this ${language} code including function descriptions, parameters, return values, and usage examples`,
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      id: 'tech-docs'
    },
    {
      text: 'Explain Code Architecture',
      prompt: 'Explain the overall architecture, design patterns, and structural approach used in this code',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="4"/><rect x="3" y="11" width="8" height="4"/><rect x="13" y="11" width="8" height="4"/><rect x="3" y="19" width="18" height="2"/></svg>',
      id: 'architecture'
    },
    {
      text: 'Suggest Refactoring',
      prompt: 'Suggest specific refactoring improvements for better code quality, readability, and maintainability',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      id: 'refactoring'
    },
    {
      text: 'Security Audit',
      prompt: 'Perform a detailed security audit and identify potential vulnerabilities, risks, and mitigation strategies',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      id: 'security'
    },
    {
      text: 'Performance Analysis',
      prompt: 'Analyze the performance characteristics and suggest optimizations for better efficiency',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      id: 'performance'
    },
    {
      text: 'Generate README',
      prompt: 'Create a comprehensive README.md file for this code with installation, usage, and API documentation',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      id: 'readme'
    }
  ];
  
  if (hasErrors) {
    suggestions.unshift({
      text: 'Fix All Errors Step-by-Step',
      prompt: 'Guide me through fixing all the errors found in the analysis step by step',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      id: 'fix-step-by-step'
    });
  }
  
  // Add language-specific suggestions
  if (language.toLowerCase() === 'python') {
    suggestions.push({
      text: 'Add Type Hints',
      prompt: 'Add comprehensive type hints to all functions and variables in this Python code',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>',
      id: 'type-hints'
    });
  } else if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
    suggestions.push({
      text: 'Convert to TypeScript',
      prompt: 'Convert this JavaScript code to TypeScript with proper type definitions',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l2-2-2-2M8 6L6 8l2 2"/><path d="M14.5 4l-5 16"/></svg>',
      id: 'to-typescript'
    });
  }
  
  return suggestions;
}

/**
 * Display suggested actions with toggle multi-select capability and direct execution
 */
// ============================================================================
// COMPLETE ALL-IN-ONE SOLUTION
// ============================================================================
// This fixes BOTH issues:
// 1. Blue icon → Grey icon
// 2. Cancel button not working
// ============================================================================

async function displaySuggestedActions(
  actions: Array<{text: string, prompt: string, icon: string, id: string, subtitle?: string}>
): Promise<void> {
  console.log('🎯 Displaying suggested actions (compact UI):', actions.length, 'actions');
  
  if (!actions || actions.length === 0) {
    console.warn('⚠️ No actions to display');
    return;
  }
  
  // Build list items HTML
  let listItemsHTML = '';
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const number = i + 1;
    
    const subtitle = action.subtitle || generateActionSubtitle(action.text, action.id);
    
    listItemsHTML += 
      '<div class="suggested-action-item" ' +
      'data-prompt="' + encodeURIComponent(action.prompt) + '" ' +
      'data-id="' + action.id + '" ' +
      'data-number="' + number + '" ' +
      'style="' +
        'display: flex; ' +
        'align-items: center; ' +
        'gap: 12px; ' +
        'padding: 12px 16px; ' +
        'background: rgba(30, 41, 59, 0.3); ' +
        'border: 1px solid rgba(51, 65, 85, 0.5); ' +
        'border-radius: 6px; ' +
        'cursor: pointer; ' +
        'transition: all 0.15s ease; ' +
        'margin-bottom: 8px; ' +
      '">' +
        '<div class="item-number" style="' +
          'width: 24px; ' +
          'height: 24px; ' +
          'background: rgba(51, 65, 85, 0.8); ' +
          'border: 1px solid rgba(100, 116, 139, 0.5); ' +
          'border-radius: 4px; ' +
          'display: flex; ' +
          'align-items: center; ' +
          'justify-content: center; ' +
          'font-size: 11px; ' +
          'font-weight: 600; ' +
          'color: #94a3b8; ' +
          'flex-shrink: 0; ' +
        '">' + number + '</div>' +
        '<div style="flex: 1; min-width: 0;">' +
          '<div class="item-title" style="' +
            'color: #e2e8f0; ' +
            'font-size: 13px; ' +
            'font-weight: 500; ' +
            'margin-bottom: 2px; ' +
          '">' + action.text + '</div>' +
          '<div class="item-subtitle" style="' +
            'color: #64748b; ' +
            'font-size: 11px; ' +
          '">' + subtitle + '</div>' +
        '</div>' +
      '</div>';
  }
  
  const panelHTML = 
    '<div class="suggested-actions-panel" style="' +
      'background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); ' +
      'border: 1px solid rgba(51, 65, 85, 0.6); ' +
      'border-radius: 8px; ' +
      'padding: 0; ' +
      'margin: 16px 0; ' +
      'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5); ' +
      'overflow: hidden; ' +
      'font-family: system-ui, -apple-system, sans-serif; ' +
    '">' +
      // HEADER with GREY icon
      '<div class="panel-header" style="' +
        'display: flex; ' +
        'align-items: center; ' +
        'gap: 10px; ' +
        'padding: 12px 16px; ' +
        'background: rgba(15, 23, 42, 0.8); ' +
        'border-bottom: 1px solid rgba(51, 65, 85, 0.5); ' +
      '">' +
        // GREY ICON (not blue!)
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">' +
          '<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#94a3b8" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<div style="color: #f1f5f9; font-size: 13px; font-weight: 600;">Suggested Actions</div>' +
      '</div>' +
      // CONTENT
      '<div class="panel-content" style="padding: 12px; background: rgba(15, 23, 42, 0.4);">' +
        listItemsHTML +
      '</div>' +
      // FOOTER with WORKING cancel button
      '<div class="panel-footer" style="' +
        'padding: 8px 16px; ' +
        'background: rgba(15, 23, 42, 0.8); ' +
        'border-top: 1px solid rgba(51, 65, 85, 0.5); ' +
        'display: flex; ' +
        'align-items: center; ' +
        'justify-content: space-between; ' +
      '">' +
        '<div style="color: #64748b; font-size: 11px;">Press 1-' + Math.min(actions.length, 9) + ' or Esc</div>' +
        // FIXED CANCEL BUTTON with inline onclick
          '<button type="button" class="cancel-btn" ' +
        'onclick="' +
          'var panel = this.closest(\'.suggested-actions-panel\'); ' +
          'if (panel) { ' +
            'var el = panel; ' +
            'for (var i = 0; i < 10; i++) { ' +
              'el = el.parentElement; ' +
              'if (!el) break; ' +
              'if (el.className && el.className.indexOf(\'message\') > -1) { ' +
                'el.remove(); ' +
                'return false; ' +
              '} ' +
            '} ' +
            'panel.remove(); ' +
          '} ' +
          'return false;' +
        '" ' +
        'onmouseenter="this.style.background=\'rgba(51,65,85,0.8)\';this.style.borderColor=\'rgba(100,116,139,0.5)\';" ' +
        'onmouseleave="this.style.background=\'rgba(51,65,85,0.5)\';this.style.borderColor=\'rgba(100,116,139,0.3)\';" ' +
        'style="' +
          'background: rgba(51, 65, 85, 0.5); ' +
          'border: 1px solid rgba(100, 116, 139, 0.3); ' +
          'border-radius: 4px; ' +
          'padding: 4px 10px; ' +
          'color: #94a3b8; ' +
          'cursor: pointer; ' +
          'font-size: 11px; ' +
          'transition: all 0.15s; ' +
          'pointer-events: auto; ' +
        '">Cancel</button>' +
      '</div>' +
    '</div>';
  
  // Remove any existing panels
  const existingPanels = document.querySelectorAll('.suggested-actions-panel, .suggested-actions-container');
  existingPanels.forEach(panel => {
    const messageContainer = panel.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    } else {
      panel.remove();
    }
  });
  
  await addMessageToChat('system', panelHTML);
  console.log('✅ Compact suggested actions panel added');
  
  setTimeout(() => {
    setupCompactPanelEventHandlers(actions);
  }, 100);
}

// ============================================================================
// EVENT HANDLERS (simplified - cancel button uses inline onclick now)
// ============================================================================

function setupCompactPanelEventHandlers(
  actions: Array<{text: string, prompt: string, icon: string, id: string}>
): void {
  console.log('⚙️ Setting up compact panel event handlers...');
  
  const items = document.querySelectorAll('.suggested-action-item');
  console.log('🔍 Found', items.length, 'action items');
  
  // Action item click handlers
  items.forEach((item) => {
    const element = item as HTMLElement;
    
    element.addEventListener('mouseenter', () => {
      element.style.background = 'rgba(51, 65, 85, 0.6)';
      element.style.borderColor = 'rgba(100, 116, 139, 0.8)';
      element.style.transform = 'translateX(4px)';
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.background = 'rgba(30, 41, 59, 0.3)';
      element.style.borderColor = 'rgba(51, 65, 85, 0.5)';
      element.style.transform = 'translateX(0)';
    });
    
    element.addEventListener('click', () => {
      const prompt = decodeURIComponent(element.getAttribute('data-prompt') || '');
      const id = element.getAttribute('data-id') || '';
      console.log('✅ Action selected:', id);
      executeSelectedAction(prompt, id);
    });
  });
  
  // NOTE: Cancel button now uses inline onclick handler
  // No need for addEventListener here!
  
  // Keyboard shortcuts
 
const keyboardHandler = (e: KeyboardEvent) => {
  const panel = document.querySelector('.suggested-actions-panel');
  if (!panel) {
    document.removeEventListener('keydown', keyboardHandler);
    return;
  }
  
  if (e.key === 'Escape') {
    e.preventDefault();
    
    // IMPROVED: Try multiple selectors to find message container
    const messageContainer = panel.closest('.message') ||
                            panel.closest('.ai-message') ||
                            panel.closest('.system-message') ||
                            panel.closest('[class*="message"]') ||
                            panel.closest('[data-message-id]');
    
    if (messageContainer) {
      console.log('✅ Removing message container (Esc):', messageContainer);
      messageContainer.remove();
    } else {
      console.log('⚠️ Removing panel only (Esc)');
      panel.remove();
    }
    
    // Extra cleanup
    setTimeout(() => {
      document.querySelectorAll('.suggested-actions-panel').forEach(el => {
        if (!el.children.length) el.remove();
      });
    }, 100);
    
    console.log('❌ Panel cancelled with Esc');
    document.removeEventListener('keydown', keyboardHandler);
    return;
  }
    
    const num = parseInt(e.key);
    if (num >= 1 && num <= actions.length && num <= 9) {
      e.preventDefault();
      const action = actions[num - 1];
      console.log('✅ Action selected via keyboard:', num, action.id);
      executeSelectedAction(action.prompt, action.id);
      document.removeEventListener('keydown', keyboardHandler);
    }
  };
  
  document.addEventListener('keydown', keyboardHandler);
  console.log('✅ Keyboard shortcuts activated (1-' + Math.min(actions.length, 9) + ', Esc)');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function executeSelectedAction(prompt: string, actionId: string): void {
  console.log('🚀 Executing action:', actionId);
  
  const panel = document.querySelector('.suggested-actions-panel');
  if (panel) {
    const messageContainer = panel.closest('.message');
    if (messageContainer) {
      messageContainer.remove();
    } else {
      panel.remove();
    }
  }
  
  const messageInput = document.getElementById('ai-assistant-input') as HTMLInputElement | HTMLTextAreaElement;
  if (messageInput) {
    messageInput.value = prompt;
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    setTimeout(() => {
      const sendBtn = document.getElementById('send-btn') || 
                      document.querySelector('[data-action="send"]') ||
                      document.querySelector('.send-button');
      if (sendBtn) {
        (sendBtn as HTMLElement).click();
      }
    }, 100);
  }
  
  console.log('✅ Action executed successfully');
}

function generateActionSubtitle(text: string, id: string): string {
  const subtitles: { [key: string]: string } = {
    'flow-chart': 'Visualize code flow and logic',
    'tests': 'Create comprehensive test suite',
    'test-cases': 'Generate test cases for your code',
    'docs': 'Generate technical documentation',
    'documentation': 'Write complete technical documentation',
    'refactor': 'Improve code quality and structure',
    'security': 'Identify security vulnerabilities',
    'performance': 'Analyze performance bottlenecks',
    'readme': 'Create project README file',
    'explain': 'Get detailed code explanation',
    'architecture': 'Document system architecture',
    'code-analysis': 'Perform detailed code analysis',
    'debug': 'Debug code and find issues',
    'optimize': 'Optimize code performance'
  };
  
  return subtitles[id] || 'Execute this action on your code';
}

// ============================================================================
// WHAT THIS FIXES:
// ============================================================================

/*
✅ Icon is GREY (#94a3b8) not blue (#3b82f6)
✅ Cancel button works with inline onclick
✅ Hover effects work with inline onmouseenter/onmouseleave
✅ Console logs show when cancel is clicked
✅ Panel removes properly when cancelled
✅ Esc key still works
✅ Number keys (1-9) still work
✅ Action items still work

TESTING:
1. Press "=" to show panel
2. Icon should be GREY
3. Click Cancel button - should see "🔘 Cancel clicked" in console
4. Panel should disappear
*/
/*=======================================================*/
function setupCollapseToggle(): void {
  const checkAndSetup = () => {
    const header = document.querySelector('.suggestions-header');
    const container = document.querySelector('.suggested-actions-container');
    const content = document.querySelector('.suggestions-content');
    const expandIcon = document.querySelector('.expand-icon');
    
    if (!header || !container || !content || !expandIcon) {
      console.log('Collapse elements not found, retrying...');
      setTimeout(checkAndSetup, 50);
      return;
    }
    
    console.log('Collapse toggle setup - elements found');
    
// Toggle function
    const toggle = () => {
      console.log('🔄 Toggle clicked');
      
      const isCollapsed = container.classList.contains('collapsed');
      console.log('Current state:', isCollapsed ? 'collapsed' : 'expanded');
      
      if (isCollapsed) {
        console.log('📖 Expanding...');
        container.classList.remove('collapsed');
        container.classList.add('expanded');
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.padding = '0 18px';
        expandIcon.style.transform = 'rotate(180deg)';
        console.log('✅ Expanded!');
      } else {
        console.log('📕 Collapsing...');
        container.classList.add('collapsed');
        container.classList.remove('expanded');
        content.style.maxHeight = '0';
        content.style.padding = '0 18px';
        expandIcon.style.transform = 'rotate(0deg)';
        console.log('✅ Collapsed!');
      }
    };
    
    // ✅ Use onclick to auto-replace old handlers
    header.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    
    // Hover effects using onmouseenter/onmouseleave
    header.onmouseenter = () => {
      header.style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.95), rgba(30, 41, 59, 0.95))';
    };
    
    header.onmouseleave = () => {
      header.style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))';
    };
    
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.pointerEvents = 'auto';
    
    console.log('✨ Collapse toggle setup complete!');
    
    // ✅ Use onclick to auto-replace old handlers
    header.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    };
    
    // Hover effects using onmouseenter/onmouseleave
    header.onmouseenter = () => {
      header.style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.95), rgba(30, 41, 59, 0.95))';
    };
    
    header.onmouseleave = () => {
      header.style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))';
    };
    
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.pointerEvents = 'auto';
    
    console.log('✨ Collapse toggle setup complete!'); 
    
    
    // Remove any existing listeners
  const newHeader = header.cloneNode(true);
header.parentNode?.replaceChild(newHeader, header);
newHeader.addEventListener('click', toggle);
    
    // Add click event
    newHeader.addEventListener('click', toggle);
    
    // Hover effects
    newHeader.addEventListener('mouseenter', () => {
      (newHeader as HTMLElement).style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.95), rgba(30, 41, 59, 0.95))';
    });
    
    newHeader.addEventListener('mouseleave', () => {
      (newHeader as HTMLElement).style.background = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))';
    });
  };
  
  checkAndSetup();
}
/**
 * Setup event handlers for suggestion interactions with HTML document generation
 */
function setupSuggestionEventHandlers(): void {
  // Handle multi-select toggle button
  const toggleBtn = document.getElementById('toggle-multi-select');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isMultiSelectMode = !isMultiSelectMode;
      updateMultiSelectUI();
    });
  }
  
  // Handle individual suggestion clicks
  document.querySelectorAll('.suggested-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.currentTarget as HTMLElement;
      const prompt = decodeURIComponent(target.getAttribute('data-prompt') || '');
      const id = target.getAttribute('data-id') || '';
      const text = decodeURIComponent(target.getAttribute('data-text') || '');
      
      if (isMultiSelectMode) {
        // Multi-select mode - toggle selection
        toggleSuggestionSelection(target, id);
      } else {
        // Direct execution mode - send immediately
        if (prompt) {
          // Visual feedback
          target.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';
          target.style.color = 'white';
          target.style.transform = 'scale(0.95)';
          
          // Add a loading indicator (FIX: Use proper string concatenation)
          const originalContent = target.innerHTML;
          const loadingHTML = '<span style="font-size: 18px; animation: spin 1s linear infinite;">⏳</span>' +
                              '<span>Executing...</span>';
          target.innerHTML = loadingHTML;
          
          // Check if this is the technical documentation action
       // Route to appropriate handler based on action ID
switch(id) {
  case 'tech-docs':
    await handleTechnicalDocumentationAction(prompt, text);
    break;
  case 'flow-chart':
    await handleFlowChartAction(prompt, text);
    break;
  case 'test-cases':
    await handleTestCasesAction(prompt, text);
    break;
  case 'architecture':
  case 'refactoring':
  case 'security':
  case 'performance':
  case 'readme':
  case 'fix-step-by-step':
  case 'type-hints':
  case 'to-typescript':
    await handleGenericDocumentationAction(prompt, text, id);
    break;
  default:
    // Fallback for any unhandled actions
    await sendMessageDirectly(prompt);
}
          
          // Remove the entire suggestions container after execution
          const container = document.querySelector('.suggested-actions-container');
          if (container) {
            container.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
              container.remove();
            }, 300);
          }
        }
      }
    });
  });
  
  // Handle Execute Selected button
  const executeBtn = document.getElementById('execute-selected-suggestions');
  if (executeBtn) {
    executeBtn.addEventListener('click', async () => {
      if (selectedSuggestions.size > 0) {
        const combinedPrompts: string[] = [];
        
        document.querySelectorAll('.suggested-action-btn').forEach(btn => {
          const id = btn.getAttribute('data-id') || '';
          if (selectedSuggestions.has(id)) {
            const prompt = decodeURIComponent(btn.getAttribute('data-prompt') || '');
            const text = decodeURIComponent(btn.getAttribute('data-text') || '');
            if (prompt) {
              combinedPrompts.push(text + ': ' + prompt);
            }
          }
        });
        
        if (combinedPrompts.length > 0) {
          const combinedMessage = 'Please help me with the following tasks for the code I just analyzed:\n\n' +
                                  combinedPrompts.map((p, i) => (i + 1) + '. ' + p).join('\n\n');
          
          executeBtn.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
          executeBtn.textContent = 'Executing...';
          
          await sendMessageDirectly(combinedMessage);
          
          selectedSuggestions.clear();
          isMultiSelectMode = false;
          
          // Remove the entire suggestions container after multi-select execution
          const container = document.querySelector('.suggested-actions-container');
          if (container) {
            container.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
              container.remove();
            }, 300);
          }
        }
      }
    });
  }
  
  // Add CSS animation for spinner
  if (!document.getElementById('suggestion-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'suggestion-spinner-style';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulseGreen {
        0%, 100% { 
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
          transform: scale(1);
        }
        50% { 
          box-shadow: 0 2px 16px rgba(76, 175, 80, 0.6);
          transform: scale(1.02);
        }
      }
      
      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

async function handleTechnicalDocumentationAction(prompt: string, actionText: string): Promise<void> {
  try {
    // Get the current code context and file info
    const codeContext = getCurrentCodeContext();
    const fileInfo = getCurrentFileInfo();
    
    // Get the actual code from the editor if code context is empty
    let actualCode = codeContext.code;
    if (!actualCode || actualCode.trim() === '') {
      const editor = window.monaco?.editor?.getEditors?.()?.[0];
      if (editor) {
        actualCode = editor.getValue();
        console.log('[TechDoc] Retrieved code directly from editor');
      }
    }
    
    const actualFileName = codeContext.fileName || fileInfo.name || 'untitled.txt';
    const actualLanguage = codeContext.language || fileInfo.language || 'plaintext';
    
    if (!actualCode || actualCode.trim() === '') {
      showNotification('No code found. Please open and analyze a file first.', 'warning');
      return;
    }
    
    // Show initial notification
    showNotification(`Generating technical documentation for ${actualFileName}...`, 'info');
    
    // Show user message in chat
    await addMessageToChat('user', `Create technical documentation for ${actualFileName}`);
    
    // Show typing indicator
    showTypingIndicator();
    
    const documentationPrompt = `Create comprehensive engineering technical documentation for the following ${actualLanguage} code from file "${actualFileName}".

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

Generate professional engineering documentation following IEEE/ISO standards with these sections:

# 1. EXECUTIVE SUMMARY
Provide a high-level overview suitable for management and stakeholders.

# 2. SYSTEM OVERVIEW
## 2.1 Purpose
Describe the primary purpose and objectives of this software component.

## 2.2 Scope
Define the boundaries and limitations of the system.

## 2.3 System Context
Explain how this component fits within the larger system architecture.

# 3. FUNCTIONAL SPECIFICATIONS
## 3.1 Core Functionality
Detail the main functions and features.

## 3.2 Input/Output Specifications
Define all inputs, outputs, and data formats.

## 3.3 Processing Logic
Describe the algorithms and business logic.

# 4. TECHNICAL ARCHITECTURE
## 4.1 Component Architecture
Describe the structural design and component relationships.

## 4.2 Class/Module Definitions
For each class or module:
- Name and purpose
- Public interfaces
- Method signatures
- Properties/attributes

## 4.3 Data Structures
Define all data structures, their purposes, and relationships.

# 5. API REFERENCE
## 5.1 Public APIs
Document all public interfaces with:
- Method/function name
- Parameters (type, description, constraints)
- Return values (type, description)
- Exceptions/errors
- Usage examples

## 5.2 Internal APIs
Document key internal interfaces.

# 6. DEPENDENCIES
## 6.1 External Dependencies
List all external libraries, frameworks, and services.

## 6.2 System Requirements
Define hardware, software, and environment requirements.

# 7. ERROR HANDLING
## 7.1 Exception Handling
Describe error handling strategies and recovery procedures.

## 7.2 Logging
Define logging levels and diagnostic information.

# 8. PERFORMANCE SPECIFICATIONS
## 8.1 Performance Requirements
Define expected performance metrics.

## 8.2 Resource Utilization
Describe memory, CPU, and other resource usage.

# 9. SECURITY CONSIDERATIONS
## 9.1 Security Features
Document security measures and authentication.

## 9.2 Data Protection
Describe data encryption and privacy measures.

# 10. TESTING & VALIDATION
## 10.1 Test Cases
Provide example test scenarios.

## 10.2 Validation Criteria
Define acceptance criteria.

# 11. DEPLOYMENT & CONFIGURATION
## 11.1 Installation Instructions
Step-by-step deployment guide.

## 11.2 Configuration Parameters
List all configurable parameters.

# 12. MAINTENANCE & SUPPORT
## 12.1 Known Issues
Document any known limitations or issues.

## 12.2 Troubleshooting Guide
Common problems and solutions.

# 13. VERSION HISTORY
Document version, changes, and authors.

# 14. GLOSSARY
Define technical terms and abbreviations.

# 15. REFERENCES
List relevant documentation and resources.

Format as professional engineering documentation with clear sections, proper numbering, and technical precision.`;
    
    const config = getCurrentApiConfiguration();
    
    if (!config.apiKey || !config.apiBaseUrl) {
      hideTypingIndicator();
      showNotification('API not configured. Please configure API settings.', 'error');
      return;
    }
    
    try {
      // Call API to generate documentation
      console.log('[TechDoc] Calling API for documentation...');
      const documentationResponse = await callGenericAPI(documentationPrompt, config);
      
      // Hide typing indicator
      await hideTypingIndicator();
      
      // Create the FULL documentation content
      const fullDocumentationContent = `# Technical Documentation: ${actualFileName}

${documentationResponse}

---

## Source Code

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

---

*Generated on ${new Date().toLocaleString()}*`;
      
      // Store the full documentation in a temporary global variable
      (window as any).__tempFullDocumentation = {
        content: fullDocumentationContent,
        filename: actualFileName
      };
      
      // Create a MINIMAL response for the chat
      const minimalResponse = `Documentation complete for ${actualFileName}.`;
      
      // Display the minimal response in chat
      await addMessageToChat('assistant', minimalResponse);
      
      // After the message is added, find it and update its HTML export button
      setTimeout(() => {
        const messages = document.querySelectorAll('.ai-message.assistant-message');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
          const htmlExportBtn = lastMessage.querySelector('.html-export-btn');
          if (htmlExportBtn) {
            // Update the data-content attribute with the FULL documentation
            htmlExportBtn.setAttribute('data-content', encodeURIComponent(fullDocumentationContent));
            htmlExportBtn.setAttribute('data-filename', actualFileName);
            
            // Also update the click handler to ensure it uses the full content
            const newButton = htmlExportBtn.cloneNode(true) as HTMLElement;
            htmlExportBtn.parentNode?.replaceChild(newButton, htmlExportBtn);
            
            newButton.addEventListener('click', () => {
              // Import and call the HTML viewer with the full documentation
              import('./assistantUI_htmlviewer').then(module => {
                module.convertResponseToHTML(fullDocumentationContent, actualFileName);
              });
            });
          }
        }
      }, 100);
      
      // Show success notification
      showNotification(`Documentation ready! Click "View as HTML" to see full documentation.`, 'success');
      
    } catch (apiError) {
      await hideTypingIndicator();
      console.error('[TechDoc] API call failed:', apiError);
      showNotification(`Failed to generate documentation: ${apiError.message}`, 'error');
      
      // Show error in chat
      addSystemMessage(`Failed to generate documentation: ${apiError.message}`);
    }
    
  } catch (error) {
    console.error('[TechDoc] Failed to generate technical documentation:', error);
    showNotification(
      `Failed to generate documentation: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      'error'
    );
  }
}
/**
 * Handler for Flow Chart action
 */
async function handleFlowChartAction(prompt: string, actionText: string): Promise<void> {
  try {
    const codeContext = getCurrentCodeContext();
    const fileInfo = getCurrentFileInfo();
    
    let actualCode = codeContext.code;
    if (!actualCode || actualCode.trim() === '') {
      const editor = window.monaco?.editor?.getEditors?.()?.[0];
      if (editor) actualCode = editor.getValue();
    }
    
    const actualFileName = codeContext.fileName || fileInfo.name || 'untitled.txt';
    const actualLanguage = codeContext.language || fileInfo.language || 'plaintext';
    
    if (!actualCode || actualCode.trim() === '') {
      showNotification('No code found. Please open and analyze a file first.', 'warning');
      return;
    }
    
    showNotification(`Generating flow chart for ${actualFileName}...`, 'info');
    await addMessageToChat('user', `Create flow chart for ${actualFileName}`);
    showTypingIndicator();
    
    const flowChartPrompt = `Create a detailed Mermaid flow chart for the following ${actualLanguage} code from file "${actualFileName}".

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

Generate a comprehensive flow chart using Mermaid syntax that shows:
1. Program entry points and main execution flow
2. Function calls and their relationships
3. Conditional branches and loops
4. Data flow between components
5. Error handling paths

Format the output as a complete Mermaid diagram with proper syntax.`;
    
    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      hideTypingIndicator();
      showNotification('API not configured. Please configure API settings.', 'error');
      return;
    }
    
    const response = await callGenericAPI(flowChartPrompt, config);
    await hideTypingIndicator();
    
    const fullContent = `# Flow Chart: ${actualFileName}

${response}

---

## Source Code

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

---

*Generated on ${new Date().toLocaleString()}*`;
    
    (window as any).__tempFullDocumentation = {
      content: fullContent,
      filename: actualFileName
    };
    
    const minimalResponse = `Flow chart complete for ${actualFileName}.`;
    await addMessageToChat('assistant', minimalResponse);
    
    setTimeout(() => {
      const messages = document.querySelectorAll('.ai-message.assistant-message');
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage) {
        const htmlExportBtn = lastMessage.querySelector('.html-export-btn');
        if (htmlExportBtn) {
          htmlExportBtn.setAttribute('data-content', encodeURIComponent(fullContent));
          htmlExportBtn.setAttribute('data-filename', actualFileName);
          
          const newButton = htmlExportBtn.cloneNode(true) as HTMLElement;
          htmlExportBtn.parentNode?.replaceChild(newButton, htmlExportBtn);
          
          newButton.addEventListener('click', () => {
            import('./assistantUI_htmlviewer').then(module => {
              module.convertResponseToHTML(fullContent, actualFileName);
            });
          });
        }
      }
    }, 100);
    
    showNotification(`Flow chart ready! Click "View as HTML" to see full diagram.`, 'success');
    
  } catch (error) {
    console.error('[FlowChart] Failed:', error);
    showNotification(`Failed to generate flow chart: ${error.message}`, 'error');
  }
}

/**
 * Handler for Test Cases action
 */
async function handleTestCasesAction(prompt: string, actionText: string): Promise<void> {
  try {
    const codeContext = getCurrentCodeContext();
    const fileInfo = getCurrentFileInfo();
    
    let actualCode = codeContext.code;
    if (!actualCode || actualCode.trim() === '') {
      const editor = window.monaco?.editor?.getEditors?.()?.[0];
      if (editor) actualCode = editor.getValue();
    }
    
    const actualFileName = codeContext.fileName || fileInfo.name || 'untitled.txt';
    const actualLanguage = codeContext.language || fileInfo.language || 'plaintext';
    
    if (!actualCode || actualCode.trim() === '') {
      showNotification('No code found. Please open and analyze a file first.', 'warning');
      return;
    }
    
    showNotification(`Generating test cases for ${actualFileName}...`, 'info');
    await addMessageToChat('user', `Generate test cases for ${actualFileName}`);
    showTypingIndicator();
    
    const testCasesPrompt = `Generate comprehensive unit test cases for the following ${actualLanguage} code from file "${actualFileName}".

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

Create detailed test cases including:
1. Normal/happy path test cases
2. Edge cases and boundary conditions
3. Error handling test cases
4. Performance test cases
5. Integration test scenarios

For each test case, provide:
- Test name and description
- Input parameters
- Expected output
- Test code in ${actualLanguage}
- Assertions to validate

Format as executable test code with proper test framework syntax.`;
    
    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      hideTypingIndicator();
      showNotification('API not configured. Please configure API settings.', 'error');
      return;
    }
    
    const response = await callGenericAPI(testCasesPrompt, config);
    await hideTypingIndicator();
    
    const fullContent = `# Test Cases: ${actualFileName}

${response}

---

## Source Code

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

---

*Generated on ${new Date().toLocaleString()}*`;
    
    (window as any).__tempFullDocumentation = {
      content: fullContent,
      filename: actualFileName
    };
    
    const minimalResponse = `Test cases complete for ${actualFileName}.`;
    await addMessageToChat('assistant', minimalResponse);
    
    setTimeout(() => {
      const messages = document.querySelectorAll('.ai-message.assistant-message');
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage) {
        const htmlExportBtn = lastMessage.querySelector('.html-export-btn');
        if (htmlExportBtn) {
          htmlExportBtn.setAttribute('data-content', encodeURIComponent(fullContent));
          htmlExportBtn.setAttribute('data-filename', actualFileName);
          
          const newButton = htmlExportBtn.cloneNode(true) as HTMLElement;
          htmlExportBtn.parentNode?.replaceChild(newButton, htmlExportBtn);
          
          newButton.addEventListener('click', () => {
            import('./assistantUI_htmlviewer').then(module => {
              module.convertResponseToHTML(fullContent, actualFileName);
            });
          });
        }
      }
    }, 100);
    
    showNotification(`Test cases ready! Click "View as HTML" to see full suite.`, 'success');
    
  } catch (error) {
    console.error('[TestCases] Failed:', error);
    showNotification(`Failed to generate test cases: ${error.message}`, 'error');
  }
}

/**
 * Generic handler for other actions that don't need special formatting
 */
async function handleGenericDocumentationAction(prompt: string, actionText: string, actionId: string): Promise<void> {
  try {
    const codeContext = getCurrentCodeContext();
    const fileInfo = getCurrentFileInfo();
    
    let actualCode = codeContext.code;
    if (!actualCode || actualCode.trim() === '') {
      const editor = window.monaco?.editor?.getEditors?.()?.[0];
      if (editor) actualCode = editor.getValue();
    }
    
    const actualFileName = codeContext.fileName || fileInfo.name || 'untitled.txt';
    const actualLanguage = codeContext.language || fileInfo.language || 'plaintext';
    
    if (!actualCode || actualCode.trim() === '') {
      showNotification('No code found. Please open and analyze a file first.', 'warning');
      return;
    }
    
    showNotification(`${actionText} for ${actualFileName}...`, 'info');
    await addMessageToChat('user', `${actionText} for ${actualFileName}`);
    showTypingIndicator();
    
    const fullPrompt = `${prompt}

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

Provide comprehensive, detailed analysis following professional standards.`;
    
    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      hideTypingIndicator();
      showNotification('API not configured. Please configure API settings.', 'error');
      return;
    }
    
    const response = await callGenericAPI(fullPrompt, config);
    await hideTypingIndicator();
    
    const fullContent = `# ${actionText}: ${actualFileName}

${response}

---

## Source Code

\`\`\`${actualLanguage}
${actualCode}
\`\`\`

---

*Generated on ${new Date().toLocaleString()}*`;
    
    (window as any).__tempFullDocumentation = {
      content: fullContent,
      filename: actualFileName
    };
    
    const minimalResponse = `${actionText} complete for ${actualFileName}.`;
    await addMessageToChat('assistant', minimalResponse);
    
    setTimeout(() => {
      const messages = document.querySelectorAll('.ai-message.assistant-message');
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage) {
        const htmlExportBtn = lastMessage.querySelector('.html-export-btn');
        if (htmlExportBtn) {
          htmlExportBtn.setAttribute('data-content', encodeURIComponent(fullContent));
          htmlExportBtn.setAttribute('data-filename', actualFileName);
          
          const newButton = htmlExportBtn.cloneNode(true) as HTMLElement;
          htmlExportBtn.parentNode?.replaceChild(newButton, htmlExportBtn);
          
          newButton.addEventListener('click', () => {
            import('./assistantUI_htmlviewer').then(module => {
              module.convertResponseToHTML(fullContent, actualFileName);
            });
          });
        }
      }
    }, 100);
    
    showNotification(`${actionText} ready! Click "View as HTML" to see full content.`, 'success');
    
  } catch (error) {
    console.error(`[${actionId}] Failed:`, error);
    showNotification(`Failed to ${actionText.toLowerCase()}: ${error.message}`, 'error');
  }
}
function toggleSuggestionSelection(element: HTMLElement, id: string): void {
  if (selectedSuggestions.has(id)) {
    selectedSuggestions.delete(id);
  } else {
    selectedSuggestions.add(id);
  }
  updateSuggestionVisuals();
}

function updateMultiSelectUI(): void {
  const toggleBtn = document.getElementById('toggle-multi-select');
  const icon = document.getElementById('multi-select-icon');
  const text = document.getElementById('multi-select-text');
  const instructions = document.getElementById('suggestion-instructions');
  
  if (toggleBtn && icon && text) {
    if (isMultiSelectMode) {
      // Multi-select mode is ON
      toggleBtn.style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(33, 150, 243, 0.15))';
      toggleBtn.style.borderColor = '#4fc3f7';
      toggleBtn.style.color = '#4fc3f7';
      icon.textContent = '☑';
      text.textContent = 'Multi-Select ON';
    } else {
      // Multi-select mode is OFF
      toggleBtn.style.background = 'rgba(255, 152, 0, 0.1)';
      toggleBtn.style.borderColor = 'rgba(255, 152, 0, 0.3)';
      toggleBtn.style.color = '#ff9800';
      icon.textContent = '☐';
      text.textContent = 'Multi-Select';
      
      // Clear selections when turning off multi-select
      selectedSuggestions.clear();
      updateSuggestionVisuals();
    }
  }
  
  // Update instructions
  if (instructions) {
    if (isMultiSelectMode) {
      instructions.innerHTML = '<strong>Multi-Select Mode:</strong> Click to select/deselect actions • <strong>Execute Selected</strong> to run multiple actions';
    } else {
      instructions.innerHTML = '<strong>Click</strong> any action to execute immediately';
    }
  }
}

function updateSuggestionVisuals(): void {
  // Update each button's visual state
  document.querySelectorAll('.suggested-action-btn').forEach(btn => {
    const id = btn.getAttribute('data-id') || '';
    const indicator = btn.querySelector('.selection-indicator') as HTMLElement;
    
    if (selectedSuggestions.has(id)) {
      // Selected state
      (btn as HTMLElement).style.background = 'linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(33, 150, 243, 0.15))';
      (btn as HTMLElement).style.borderColor = '#4fc3f7';
      (btn as HTMLElement).style.transform = 'scale(0.98)';
      if (indicator) {
        indicator.style.opacity = '1';
        indicator.style.background = 'rgba(79, 195, 247, 0.8)';
        indicator.style.borderColor = '#4fc3f7';
      }
    } else {
      // Unselected state
      (btn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
      (btn as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.15)';
      (btn as HTMLElement).style.transform = 'scale(1)';
      if (indicator) {
        indicator.style.opacity = '0';
      }
    }
  });
  
  // Update execute button
  const executeBtn = document.getElementById('execute-selected-suggestions');
  const countSpan = document.getElementById('selected-count');
  
  if (executeBtn && countSpan) {
    const count = selectedSuggestions.size;
    countSpan.textContent = count.toString();
    
    if (count > 0 && isMultiSelectMode) {
      executeBtn.style.display = 'inline-block';
    } else {
      executeBtn.style.display = 'none';
    }
  }
}

/**
 * Initialize code analysis functionality
 */
export function initializeCodeAnalysis(): void {
  console.log('Initializing Code Analysis Manager with Auto-Fix and Direct Response...');
  
  // Add CSS for error/warning highlighting and code blocks
  addHighlightingStyles();
  addCodeBlockActionStyles();
  addAutoFixStyles();
  addCameraButtonStyles();
  addSuggestedActionsStyles();
  addHTMLDocumentViewerStyles();
  
  // Set up analyze code button
  setupCodeAnalysisButton();
  
  // Set up debug button
  setupDebugButton();
  
  // Set up camera button
  setupCameraButton();
  
  // Periodically check camera panel state
  setInterval(() => {
    const cameraPanel = document.querySelector('.camera-panel');
    const cameraBtn = document.getElementById('camera-btn');
    
    if (cameraBtn) {
      if (cameraPanel) {
        // Panel exists - should be green
        if (!cameraBtn.classList.contains('camera-active')) {
          cameraBtn.classList.add('camera-active');
          cameraBtn.classList.remove('camera-inactive');
          cameraBtn.title = 'Close Camera/Screen Capture';
        }
      } else {
        // Panel doesn't exist - should be default
        if (!cameraBtn.classList.contains('camera-inactive')) {
          cameraBtn.classList.remove('camera-active');
          cameraBtn.classList.add('camera-inactive');
          cameraBtn.title = 'Open Camera/Screen Capture';
        }
      }
    }
  }, 500);
  
  // Listen for autonomous mode changes
  setupAutonomousListeners();
  
  // Set up Monaco editor click handlers for auto-fix
  setupMonacoAutoFixHandlers();
  
  // PERMANENT FIX: Always enable auto-fix UI on initialization
  document.body.classList.add('autonomous-active');
  updateAutoFixUI(true);
  
  console.log('Code Analysis Manager initialized successfully');
}

/**
 * Setup listeners for autonomous mode changes
 */
function setupAutonomousListeners(): void {
  document.addEventListener('autonomous-mode-changed', (event: CustomEvent) => {
    const isActive = event.detail.active;
    autoFixEnabled = true; // Always enabled
    
    console.log(`Autonomous mode ${isActive ? 'enabled' : 'disabled'}, auto-fix remains enabled`);
    
    updateAutoFixUI(true);
    
    const editor = window.monaco?.editor?.getEditors?.()?.[0];
    if (editor && editor.getValue()) {
      refreshErrorMarkers(editor);
    }
  });
}

/**
 * Setup Monaco editor handlers for auto-fix clicks
 */
function setupMonacoAutoFixHandlers(): void {
  const setupInterval = setInterval(() => {
    if (window.monaco) {
      clearInterval(setupInterval);
      
      // Listen for editor creation
      window.monaco.editor.onDidCreateEditor((editor: any) => {
        // Add mouse down handler for glyph margin clicks
        editor.onMouseDown((e: any) => {
          if (e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
            const lineNumber = e.target.position.lineNumber;
            console.log('Glyph clicked at line:', lineNumber);
            handleGlyphClick(editor, lineNumber);
          }
        });
        
        // Also add click handler for the decorations
        editor.onDidChangeModelDecorations(() => {
          // Re-setup click handlers when decorations change
          setupFixClickHandlers(editor);
        });
      });
      
      // Setup for existing editors
      const editors = window.monaco.editor.getEditors();
      editors.forEach((editor: any) => {
        editor.onMouseDown((e: any) => {
          if (e.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
            const lineNumber = e.target.position.lineNumber;
            console.log('Glyph clicked at line:', lineNumber);
            handleGlyphClick(editor, lineNumber);
          }
        });
      });
    }
  }, 100);
}

/**
 * Setup fix click handlers
 */
function setupFixClickHandlers(editor: any): void {
  // Clear old handlers
  fixHandlers.clear();
  
  const errors = (window as any).__currentErrors || [];
  errors.forEach((error: any) => {
    if (error.fix) {
      fixHandlers.set(error.line, () => {
        applyAutoFix(editor, error);
      });
    }
  });
}

/**
 * Handle glyph margin clicks for auto-fix
 */
async function handleGlyphClick(editor: any, lineNumber: number): Promise<void> {
  console.log('Handling glyph click for line:', lineNumber);
  
  // Find if there's an error on this line with a fix
  const errorWithFix = findErrorForLine(lineNumber);
  console.log('Found error:', errorWithFix);
  
  if (errorWithFix && errorWithFix.fix) {
    await applyAutoFix(editor, errorWithFix);
  } else {
    // Try the stored handler
    const handler = fixHandlers.get(lineNumber);
    if (handler) {
      handler();
    }
  }
}

/**
 * Find error for a specific line
 */
function findErrorForLine(lineNumber: number): any {
  const storedErrors = (window as any).__currentErrors || [];
  return storedErrors.find((error: any) => error.line === lineNumber);
}

/**
 * Enhanced: Add error markers with auto-fix support
 */
function addErrorMarkersToEditor(editor: any, errors: Array<{line: number, description: string, fix: string, fixCode?: string}>): void {
  const model = editor.getModel();
  if (!model) return;
  
  // Store errors globally for reference
  (window as any).__currentErrors = errors;
  
  // Clear existing error decorations
  currentDecorations = editor.deltaDecorations(currentDecorations, []);
  currentAutoFixDecorations = editor.deltaDecorations(currentAutoFixDecorations, []);
  
  // Create markers array for Monaco
  const markers = errors.map(error => {
    const lineContent = model.getLineContent(error.line);
    
    return {
      severity: monaco.MarkerSeverity.Error,
      message: error.description + (error.fix ? '\n\nQuick Fix Available (Click the lightning icon)' : ''),
      startLineNumber: error.line,
      startColumn: 1,
      endLineNumber: error.line,
      endColumn: lineContent.length + 1,
      source: 'Code Analysis'
    };
  });
  
  // Set markers on the model
  monaco.editor.setModelMarkers(model, 'syntax-errors', markers);
  
  // Apply decorations for visual highlighting
  const decorations = errors.map(error => {
    const lineContent = model.getLineContent(error.line);
    return {
      range: new monaco.Range(error.line, 1, error.line, lineContent.length + 1),
      options: {
        inlineClassName: 'error-highlight',
        hoverMessage: { 
          value: error.description + (error.fix ? `\n\n**Auto-Fix:** ${error.fix}\n\n*Click the lightning icon to apply*` : ''),
          isTrusted: true
        }
      }
    };
  });
  
  currentDecorations = editor.deltaDecorations([], decorations);
  
  // Always add auto-fix glyphs
  addAutoFixGlyphs(editor, errors);
  
  // Setup click handlers after adding glyphs
  setupFixClickHandlers(editor);
}

/**
 * Add auto-fix glyphs in the margin
 */
function addAutoFixGlyphs(editor: any, errors: Array<{line: number, description: string, fix: string, fixCode?: string}>): void {
  const autoFixDecorations = errors
    .filter(error => error.fix)
    .map(error => ({
      range: new monaco.Range(error.line, 1, error.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'auto-fix-glyph clickable-glyph',
        glyphMarginHoverMessage: {
          value: `**Click to Auto-Fix**\n\n${error.fix}\n\n*Line ${error.line}*`,
          isTrusted: true
        }
      }
    }));
  
  currentAutoFixDecorations = editor.deltaDecorations([], autoFixDecorations);
}

/**
 * Enhanced auto-fix function with proper indentation and line handling
 */
async function applyAutoFix(editor: any, issue: any): Promise<boolean> {
  try {
    const model = editor.getModel();
    if (!model) {
      console.error('No model found in editor');
      showNotification('Failed to apply fix: No editor model', 'error');
      return false;
    }
    
    const lineNumber = issue.line;
    const lineContent = model.getLineContent(lineNumber);
    const indentation = getIndentation(lineContent);
    
    console.log(`Applying auto-fix for line ${lineNumber}:`);
    console.log('Current content:', lineContent);
    console.log('Fix instruction:', issue.fix);
    console.log('Indentation:', JSON.stringify(indentation));
    
    showNotification(`Applying auto-fix on line ${lineNumber}...`, 'info');
    
    // Handle different types of fixes
    let fixApplied = false;
    
    // Case 1: Remove line entirely
    if (issue.fix.toLowerCase().includes('remove line') || 
        issue.fix.toLowerCase().includes('delete line') ||
        issue.fix.toLowerCase().includes('remove the line') ||
        (issue.description.toLowerCase().includes('undefined variable') && 
         issue.fix.toLowerCase().includes('remove'))) {
      
      console.log('Removing line', lineNumber);
      
      // Delete the entire line including the line break
      editor.executeEdits('ai-auto-fix', [{
        range: new monaco.Range(
          lineNumber,
          1,
          lineNumber + 1,
          1
        ),
        text: '' // Empty text to delete the line
      }]);
      
      fixApplied = true;
      showNotification(`Line ${lineNumber} removed`, 'success');
      
    } 
    // Case 2: Comment out the line
    else if (issue.fix.toLowerCase().includes('comment out') ||
             issue.fix.toLowerCase().includes('comment the line')) {
      
      console.log('Commenting out line', lineNumber);
      
      // Add comment while preserving indentation
      const commentedLine = indentation + '# ' + lineContent.trim();
      
      editor.executeEdits('ai-auto-fix', [{
        range: new monaco.Range(
          lineNumber,
          1,
          lineNumber,
          lineContent.length + 1
        ),
        text: commentedLine
      }]);
      
      fixApplied = true;
      showNotification(`Line ${lineNumber} commented out`, 'success');
      
    }
    // Case 3: Specific code replacement
    else if (issue.fixCode) {
      
      console.log('Applying specific fix code');
      
      // Apply the fix code with proper indentation
      const fixedCode = indentation + issue.fixCode.trim();
      
      editor.executeEdits('ai-auto-fix', [{
        range: new monaco.Range(
          lineNumber,
          1,
          lineNumber,
          lineContent.length + 1
        ),
        text: fixedCode
      }]);
      
      fixApplied = true;
      showNotification(`Fix applied on line ${lineNumber}`, 'success');
      
    }
    // Case 4: Try to generate fix using AI (as fallback)
    else if (issue.fix) {
      
      console.log('Attempting to generate fix with AI');
      
      // For simple undefined variable errors, just remove the line
      if (issue.description.toLowerCase().includes('undefined') && 
          issue.description.toLowerCase().includes('variable')) {
        
        console.log('Undefined variable detected, removing line');
        
        editor.executeEdits('ai-auto-fix', [{
          range: new monaco.Range(
            lineNumber,
            1,
            lineNumber + 1,
            1
          ),
          text: ''
        }]);
        
        fixApplied = true;
        showNotification(`Undefined variable line removed`, 'success');
        
      } else {
        // Try AI generation as last resort
        const generatedFix = await generateFixWithAI(lineContent, issue.fix, issue.description, indentation);
        
        if (generatedFix) {
          editor.executeEdits('ai-auto-fix', [{
            range: new monaco.Range(
              lineNumber,
              1,
              lineNumber,
              lineContent.length + 1
            ),
            text: generatedFix
          }]);
          
          fixApplied = true;
          showNotification(`AI-generated fix applied on line ${lineNumber}`, 'success');
        }
      }
    }
    
    if (fixApplied) {
      markLineAsFixed(editor, lineNumber);
      logAutoFix(lineNumber, lineContent, model.getLineContent(lineNumber));
      
      // Re-analyze after fix to update markers
      setTimeout(() => {
        refreshErrorMarkers(editor);
        updateAutoFixUI(true);
      }, 500);
      
      return true;
    } else {
      showNotification('Failed to generate fix', 'error');
      return false;
    }
    
  } catch (error) {
    console.error('Failed to apply fix:', error);
    showNotification('Failed to apply auto-fix: ' + error.message, 'error');
    return false;
  }
}

/**
 * Generate fix using AI with proper indentation
 */
async function generateFixWithAI(currentLine: string, fixInstruction: string, errorDescription: string, indentation: string): Promise<string | null> {
  try {
    const config = getCurrentApiConfiguration();
    const fileInfo = getCurrentFileInfo();
    
    const prompt = `Fix this ${fileInfo.language} code line according to the error and instruction.

Error: ${errorDescription}
Current line: ${currentLine}
Fix instruction: ${fixInstruction}
Required indentation: ${indentation.length} spaces

Return ONLY the fixed line of code with the same indentation, no explanations or markdown.`;
    
    const response = await callGenericAPI(prompt, config);
    
    // Clean the response
    let fixedCode = response.trim();
    fixedCode = fixedCode.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    
    // Ensure proper indentation
    fixedCode = indentation + fixedCode.trim();
    
    return fixedCode;
  } catch (error) {
    console.error('AI fix generation failed:', error);
    return null;
  }
}

/**
 * Apply multiple auto-fixes at once
 */
async function applyAllAutoFixes(editor: any): Promise<void> {
  const errors = (window as any).__currentErrors || [];
  const fixableErrors = errors.filter((e: any) => e.fix);
  
  if (fixableErrors.length === 0) {
    showNotification('No auto-fixable errors found', 'info');
    return;
  }
  
  showNotification(`Applying ${fixableErrors.length} auto-fixes...`, 'info');
  
  let successCount = 0;
  
  // Sort errors by line number in reverse to avoid line number shifts
  fixableErrors.sort((a: any, b: any) => b.line - a.line);
  
  for (const error of fixableErrors) {
    const success = await applyAutoFix(editor, error);
    if (success) successCount++;
    
    // Small delay between fixes
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  showNotification(`Applied ${successCount}/${fixableErrors.length} fixes`, 'success');
  
  // Re-analyze after all fixes
  setTimeout(() => {
    const model = editor.getModel();
    if (model) {
      clearErrorMarkers(editor);
    }
    updateAutoFixUI(true);
  }, 500);
}

/**
 * Mark a line as fixed with green highlight
 */
function markLineAsFixed(editor: any, line: number): void {
  const model = editor.getModel();
  if (!model) return;
  
  // Check if line still exists (might have been deleted)
  const lineCount = model.getLineCount();
  if (line > lineCount) {
    line = Math.min(line, lineCount);
  }
  
  if (line > 0) {
    const lineContent = model.getLineContent(line);
    
    // Add success decoration temporarily
    const successDecoration = editor.deltaDecorations([], [{
      range: new monaco.Range(line, 1, line, Math.max(1, lineContent.length + 1)),
      options: {
        inlineClassName: 'success-highlight',
        hoverMessage: { value: 'Fixed!' }
      }
    }]);
    
    // Remove success decoration after 3 seconds
    setTimeout(() => {
      editor.deltaDecorations(successDecoration, []);
    }, 3000);
  }
  
  // Remove error decoration for this line
  removeErrorDecorationForLine(editor, line);
}

/**
 * Remove error decoration for a specific line
 */
function removeErrorDecorationForLine(editor: any, line: number): void {
  // Update stored errors
  const errors = (window as any).__currentErrors || [];
  (window as any).__currentErrors = errors.filter((e: any) => e.line !== line);
  
  // Re-apply markers without the fixed error
  const model = editor.getModel();
  if (model) {
    const remainingErrors = (window as any).__currentErrors;
    const markers = remainingErrors.map((error: any) => {
      const lineContent = model.getLineContent(error.line);
      return {
        severity: monaco.MarkerSeverity.Error,
        message: error.description,
        startLineNumber: error.line,
        startColumn: 1,
        endLineNumber: error.line,
        endColumn: lineContent.length + 1,
        source: 'Code Analysis'
      };
    });
    
    monaco.editor.setModelMarkers(model, 'syntax-errors', markers);
  }
}

/**
 * Clear all error markers from the editor
 */
function clearErrorMarkers(editor: any): void {
  const model = editor.getModel();
  
  if (model) {
    monaco.editor.setModelMarkers(model, 'syntax-errors', []);
    monaco.editor.setModelMarkers(model, 'logical-warnings', []);
    
    currentDecorations = editor.deltaDecorations(currentDecorations || [], []);
    currentWarningDecorations = editor.deltaDecorations(currentWarningDecorations || [], []);
    currentAutoFixDecorations = editor.deltaDecorations(currentAutoFixDecorations || [], []);
  }
  
  // Clear stored errors
  (window as any).__currentErrors = [];
  fixHandlers.clear();
  
  // Update button to default state
  updateAutoFixUI(true);
}

/**
 * Refresh error markers
 */
function refreshErrorMarkers(editor: any): void {
  const errors = (window as any).__currentErrors || [];
  if (errors.length > 0) {
    addErrorMarkersToEditor(editor, errors);
  }
  // Update button state after refreshing markers
  updateAutoFixUI(true);
}

/**
 * Add warning markers to editor
 */
function addWarningMarkersToEditor(editor: any, warnings: Array<{line: number, description: string, type: 'logical' | 'suggestion'}>): void {
  const model = editor.getModel();
  if (!model) return;
  
  const markers = warnings.map(warning => {
    const lineContent = model.getLineContent(warning.line);
    
    return {
      severity: monaco.MarkerSeverity.Warning,
      message: warning.description,
      startLineNumber: warning.line,
      startColumn: 1,
      endLineNumber: warning.line,
      endColumn: lineContent.length + 1
    };
  });
  
  monaco.editor.setModelMarkers(model, 'logical-warnings', markers);
  
  const decorations = warnings.map(warning => {
    const lineContent = model.getLineContent(warning.line);
    return {
      range: new monaco.Range(warning.line, 1, warning.line, lineContent.length + 1),
      options: {
        inlineClassName: 'warning-highlight',
        hoverMessage: { value: warning.description }
      }
    };
  });
  
  currentWarningDecorations = editor.deltaDecorations(currentWarningDecorations || [], decorations);
}

/**
 * Log auto-fix for undo capability
 */
function logAutoFix(line: number, originalCode: string, fixedCode: string): void {
  const fixHistory = (window as any).__autoFixHistory || [];
  fixHistory.push({
    line,
    originalCode,
    fixedCode,
    timestamp: Date.now()
  });
  (window as any).__autoFixHistory = fixHistory;
  
  // Keep only last 50 fixes
  if (fixHistory.length > 50) {
    fixHistory.shift();
  }
}

/**
 * Update UI to reflect auto-fix availability
 */
function updateAutoFixUI(isActive: boolean): void {
  document.body.classList.add('autonomous-active');
  
  // Check if there are fixable errors
  const errors = (window as any).__currentErrors || [];
  const hasFixableErrors = errors.some((e: any) => e.fix);
  
  // Always add/update fix-all button
  let fixAllBtn = document.getElementById('fix-all-btn');
  
  if (!fixAllBtn) {
    const toolsContainer = document.querySelector('.input-tools');
    if (toolsContainer) {
      fixAllBtn = document.createElement('button');
      fixAllBtn.id = 'fix-all-btn';
      fixAllBtn.className = 'tool-button auto-fix-tool';
      fixAllBtn.title = 'Fix All Errors';
      fixAllBtn.innerHTML = '⚡';
      fixAllBtn.addEventListener('click', () => {
        const editor = window.monaco?.editor?.getEditors?.()?.[0];
        if (editor) applyAllAutoFixes(editor);
      });
      toolsContainer.appendChild(fixAllBtn);
    }
  }
  
  // Update button state based on errors
  if (fixAllBtn) {
    if (hasFixableErrors) {
      fixAllBtn.classList.add('has-fixes');
      fixAllBtn.classList.remove('no-fixes');
      fixAllBtn.title = `Fix ${errors.filter((e: any) => e.fix).length} Error${errors.filter((e: any) => e.fix).length > 1 ? 's' : ''}`;
    } else {
      fixAllBtn.classList.remove('has-fixes');
      fixAllBtn.classList.add('no-fixes');
      fixAllBtn.title = 'No Errors to Fix';
    }
  }
}

/**
 * Format debug analysis with better styling
 */
function formatDebugAnalysis(analysis: string): string {
  let formatted = analysis.replace(/SYNTAX_ERROR:/g, '<span style="color: #ff5252; font-weight: bold; font-size: 14px;">SYNTAX ERROR:</span>');
  formatted = formatted.replace(/LOGICAL_ISSUE:|Potential Logical Bugs\/Issues:/g, 
    '<span style="color: #ffeb3b; font-weight: bold; font-size: 14px;">LOGICAL ISSUE:</span>');
  formatted = formatted.replace(/SUGGESTION:|Suggested Improvements:/g, 
    '<span style="color: #ffeb3b; font-weight: bold; font-size: 14px;">SUGGESTION:</span>');
  formatted = formatted.replace(/Line (\d+)(-\d+)?:/g, '<strong style="color: #64dd17;">Line $1$2:</strong>');
  formatted = formatted.replace(/DESCRIPTION:/g, '<span style="color: #2196f3; font-weight: bold;">DESCRIPTION:</span>');
  formatted = formatted.replace(/FIX:/g, '<span style="color: #ff5252; font-weight: bold;">FIX:</span>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background-color: rgba(0,0,0,0.2); padding: 2px 4px; border-radius: 3px;">$1</code>');
  formatted = formatted.replace(/(SYNTAX ERROR:[\s\S]*?)(SYNTAX ERROR:|LOGICAL_ISSUE:|SUGGESTION:|$)/g, 
    '$1<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">$2');
  
  return formatted;
}

/**
 * Parse syntax errors from analysis text
 */
function parseSyntaxErrorsFromAnalysis(analysis: string): Array<{line: number, description: string, fix: string, fixCode?: string}> {
  const errors = [];
  
  const syntaxErrorRegex = /SYNTAX_ERROR:\s*\n\s*LINE:\s*(\d+)(?:-(\d+))?\s*\n\s*DESCRIPTION:\s*([\s\S]*?)(?:\n\s*FIX:\s*([\s\S]*?))?(?=\n\s*SYNTAX_ERROR:|$|\n\s*No other)/g;
  
  let match;
  while ((match = syntaxErrorRegex.exec(analysis)) !== null) {
    const startLine = parseInt(match[1].trim(), 10);
    const endLine = match[2] ? parseInt(match[2].trim(), 10) : startLine;
    const description = match[3].trim();
    const fix = match[4] ? match[4].trim() : '';
    
    for (let line = startLine; line <= endLine; line++) {
      const existingErrorIndex = errors.findIndex(err => err.line === line);
      
      if (existingErrorIndex === -1) {
        errors.push({
          line,
          description,
          fix,
          fixCode: undefined
        });
      } else {
        const existingError = errors[existingErrorIndex];
        errors[existingErrorIndex] = {
          line,
          description: `${existingError.description}\n${description}`,
          fix: fix.length > existingError.fix.length ? fix : existingError.fix,
          fixCode: undefined
        };
      }
    }
  }
  
  return errors;
}

/**
 * Parse logical issues and suggestions from analysis text
 */
function parseLogicalIssuesAndSuggestions(analysis: string): {
  logicalIssues: Array<{line: number, description: string, type: 'logical'}>,
  suggestions: Array<{line: number, description: string, type: 'suggestion'}>
} {
  const logicalIssues = [];
  const suggestions = [];
  
  const logicalIssueRegex = /LOGICAL_ISSUE:\s*\n\s*LINE:\s*(\d+)(?:-(\d+))?\s*\n\s*DESCRIPTION:\s*([\s\S]*?)(?:\n\s*FIX:\s*([\s\S]*?))?(?=\n\s*(?:LOGICAL_ISSUE:|SYNTAX_ERROR:|SUGGESTION:|$))/g;
  
  let match;
  while ((match = logicalIssueRegex.exec(analysis)) !== null) {
    const line = parseInt(match[1].trim(), 10);
    const description = match[3].trim();
    
    logicalIssues.push({
      line,
      description,
      type: 'logical'
    });
  }
  
  const suggestionRegex = /SUGGESTION:\s*\n\s*LINE:\s*(\d+)(?:-(\d+))?\s*\n\s*DESCRIPTION:\s*([\s\S]*?)(?:\n\s*IMPLEMENTATION:\s*([\s\S]*?))?(?=\n\s*(?:LOGICAL_ISSUE:|SYNTAX_ERROR:|SUGGESTION:|$))/g;
  
  while ((match = suggestionRegex.exec(analysis)) !== null) {
    const line = parseInt(match[1].trim(), 10);
    const description = match[3].trim();
    
    suggestions.push({
      line,
      description,
      type: 'suggestion'
    });
  }
  
  return { logicalIssues, suggestions };
}

/**
 * Get file extension based on language
 */
function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    'python': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'html': 'html',
    'css': 'css',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'ruby': 'rb',
    'go': 'go',
    'rust': 'rs',
    'swift': 'swift',
    'kotlin': 'kt',
    'dart': 'dart',
    'sql': 'sql',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yml',
    'yml': 'yml',
    'markdown': 'md',
    'md': 'md',
    'bash': 'sh',
    'shell': 'sh',
    'powershell': 'ps1',
    'dockerfile': 'dockerfile',
    'text': 'txt'
  };
  
  return extensions[language.toLowerCase()] || 'txt';
}

/**
 * Set up the code analysis button
 */
function setupCodeAnalysisButton(): void {
  console.log('Setting up code analysis button');
  
  let toolsContainer = document.querySelector('.input-tools');
  
  if (!toolsContainer) {
    console.error('Tool container not found');
    return;
  }
  
  if (toolsContainer.querySelector('#analyze-code-btn')) {
    console.log('Code analysis button already exists');
    return;
  }
  
  const analyzeButton = document.createElement('button');
  analyzeButton.className = 'tool-button';
  analyzeButton.id = 'analyze-code-btn';
  analyzeButton.title = 'Analyze Current Code';
  analyzeButton.innerHTML = '🔍';
  analyzeButton.addEventListener('click', handleAnalyzeCode);
  
  toolsContainer.appendChild(analyzeButton);
  
  console.log('Code analysis button added successfully');
}

/**
 * Set up debug button
 */
function setupDebugButton(): void {
  console.log('Setting up debug button');
  
  let toolsContainer = document.querySelector('.input-tools');
  
  if (!toolsContainer) {
    console.error('Tool container not found');
    return;
  }
  
  if (toolsContainer.querySelector('#debug-code-btn')) {
    console.log('Debug button already exists');
    return;
  }
  
  const debugButton = document.createElement('button');
  debugButton.className = 'tool-button';
  debugButton.id = 'debug-code-btn';
  debugButton.title = 'Debug Current Code';
  debugButton.innerHTML = '🐞';
  debugButton.addEventListener('click', handleDebugCode);
  
  const analyzeButton = toolsContainer.querySelector('#analyze-code-btn');
  
  if (analyzeButton) {
    if (analyzeButton.nextSibling) {
      toolsContainer.insertBefore(debugButton, analyzeButton.nextSibling);
    } else {
      toolsContainer.appendChild(debugButton);
    }
    console.log('Debug button added next to analyze button');
  } else {
    toolsContainer.appendChild(debugButton);
    console.log('Analyze button not found, debug button appended to container');
  }
  
  console.log('Debug button added successfully');
}

function setupCameraButton(): void {
  console.log('Setting up camera button');
  
  let toolsContainer = document.querySelector('.input-tools');
  
  if (!toolsContainer) {
    console.error('Tool container not found');
    return;
  }
  
  // Check if button already exists
  let cameraButton = document.getElementById('camera-btn') as HTMLButtonElement;
  if (cameraButton) {
    console.log('Camera button already exists, removing old one');
    cameraButton.remove();
  }
  
  cameraButton = document.createElement('button');
  cameraButton.className = 'tool-button camera-inactive';
  cameraButton.id = 'camera-btn';
  cameraButton.title = 'Open Camera/Screen Capture';
  cameraButton.innerHTML = '📷';
  
  const clickHandler = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Camera button handler triggered');
    handleCameraToggle();
  };
  
  cameraButton.addEventListener('click', clickHandler, { capture: true });
  
  // Listen for camera panel closed event
  document.addEventListener('camera-panel-closed', () => {
    console.log('Camera panel closed externally');
    cameraIsOpen = false;
    const btn = document.getElementById('camera-btn');
    if (btn) {
      btn.classList.remove('camera-active');
      btn.classList.add('camera-inactive');
      btn.title = 'Open Camera/Screen Capture';
    }
  });
  
  // Insert after debug button if it exists
  const debugButton = toolsContainer.querySelector('#debug-code-btn');
  
  if (debugButton && debugButton.nextSibling) {
    toolsContainer.insertBefore(cameraButton, debugButton.nextSibling);
  } else {
    toolsContainer.appendChild(cameraButton);
  }
  
  console.log('Camera button added successfully');
}

/**
 * Handle camera button click
 */
let isProcessingCameraToggle = false;
let cameraIsOpen = false;

async function handleCameraToggle(): Promise<void> {
  // Prevent rapid toggles
  if (isProcessingCameraToggle) {
    console.log('Camera toggle already in progress, ignoring');
    return;
  }
  
  isProcessingCameraToggle = true;
  console.log('Camera button clicked');
  
  try {
    const cameraModule = await import('../camera/cameraManager');
    const isOpen = cameraModule.toggleCameraPanel();
    cameraIsOpen = isOpen;
    
    // Update button appearance based on state
    const cameraBtn = document.getElementById('camera-btn');
    if (cameraBtn) {
      if (isOpen) {
        // Camera is open - green with animation
        cameraBtn.classList.add('camera-active');
        cameraBtn.classList.remove('camera-inactive');
        cameraBtn.title = 'Close Camera/Screen Capture';
      } else {
        // Camera is closed - default button style
        cameraBtn.classList.remove('camera-active');
        cameraBtn.classList.add('camera-inactive');
        cameraBtn.title = 'Open Camera/Screen Capture';
      }
    }
  } catch (error) {
    console.error('Failed to toggle camera:', error);
    addSystemMessage('Failed to open camera panel');
  } finally {
    // Reset flag after a short delay
    setTimeout(() => {
      isProcessingCameraToggle = false;
    }, 100);
  }
}

/**
 * Handle analyze code button click
 */
export async function handleAnalyzeCode(): Promise<void> {
  console.log('Analyze code button clicked');
  
  try {
    const editor = window.monaco?.editor?.getEditors?.()?.[0];
    if (!editor) {
      addSystemMessage('No active editor found. Please open a file first.');
      return;
    }
    
    const currentCode = editor.getValue();
    if (!currentCode || currentCode.trim() === '') {
      addSystemMessage('No code found in the editor. Please write some code to analyze.');
      return;
    }
    
    let currentFileInfo: { name: string; language: string; lines: number };
    
    try {
      currentFileInfo = getCurrentFileInfo();
      currentFileInfo.lines = currentCode.split('\n').length;
    } catch (e) {
      console.error('Error getting file info:', e);
      currentFileInfo = {
        name: 'untitled.txt',
        language: 'plaintext',
        lines: currentCode.split('\n').length
      };
    }
    
    console.log('Current file info:', currentFileInfo);
    
    setCodeAnalysisMode(false);
    setCodeAnalysisMode(true, {
      code: currentCode,
      language: currentFileInfo.language,
      fileName: currentFileInfo.name,
      lastAnalyzedTimestamp: Date.now()
    });
    
    await addMessageToChat('user', `Analyze my code in ${currentFileInfo.name} for overview and detailed analysis`);
    
    showTypingIndicator();
    
    const config = getCurrentApiConfiguration();
    
    if (!config.apiKey || !config.apiBaseUrl) {
      await hideTypingIndicator();
      addSystemMessage(`${getProviderDisplayName(config.provider)} API credentials not configured. Please click the settings button to configure your API.`);
      return;
    }
    
    const codeLines = currentCode.split('\n');
    const codeWithLineNumbers = codeLines.map((line, index) => `${index + 1}: ${line}`).join('\n');
    
    const analysisPrompt = `Analyze this ${currentFileInfo.language} code from file "${currentFileInfo.name}":

\`\`\`${currentFileInfo.language}
${codeWithLineNumbers}
\`\`\`

Provide a comprehensive analysis including:
1. Code overview and purpose
2. Any syntax errors (format: SYNTAX_ERROR: LINE: X DESCRIPTION: ... FIX: ...)
3. Logical issues
4. Improvement suggestions
5. Security considerations
6. Performance notes`;
    
    const analysis = await callGenericAPI(analysisPrompt, config);
    
    const formattedAnalysis = formatEnhancedAnalysis(analysis);
    
    const errors = parseSyntaxErrorsFromAnalysis(analysis);
    const { logicalIssues, suggestions } = parseLogicalIssuesAndSuggestions(analysis);
    
    if (errors.length > 0) {
      addErrorMarkersToEditor(editor, errors);
      updateAutoFixUI(true);
    }
    
    if (logicalIssues.length > 0 || suggestions.length > 0) {
      const warnings = [...logicalIssues, ...suggestions];
      addWarningMarkersToEditor(editor, warnings);
    }
    
    // If no errors, still update button to ensure proper state
    if (errors.length === 0) {
      updateAutoFixUI(true);
    }
    
    const messageElement = await addMessageToChat('assistant', formattedAnalysis);
    
    await hideTypingIndicator(100);
    
    updateCodeAnalysisModeIndicator();
    
    // Show auto-fix availability
    if (errors.length > 0) {
      const fixableCount = errors.filter(e => e.fix).length;
      if (fixableCount > 0) {
        addSystemMessage(`${fixableCount} auto-fixable error${fixableCount > 1 ? 's' : ''} found. Click the lightning icons in the margin or use the Fix All button to apply fixes.`);
      }
    }
    
    // Display suggested next actions with direct response capability
    const suggestedActions = generateSuggestedActions(currentFileInfo.language, errors.length > 0, 'analysis');
    await displaySuggestedActions(suggestedActions);
    
  } catch (error) {
    await hideTypingIndicator();
    
    const config = getCurrentApiConfiguration();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addSystemMessage(`Failed to analyze code: ${errorMessage}`);
    
    console.error('Code analysis failed:', error);
  }
}

/**
 * Handle debug button click
 */
export async function handleDebugCode(): Promise<void> {
  console.log('Debug code button clicked');
  
  try {
    const editor = window.monaco?.editor?.getEditors?.()?.[0];
    if (!editor) {
      addSystemMessage('No active editor found. Please open a file first.');
      return;
    }
    
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'syntax-errors', []);
      monaco.editor.setModelMarkers(model, 'logical-warnings', []);
      
      if (Array.isArray(currentDecorations) && currentDecorations.length > 0) {
        currentDecorations = editor.deltaDecorations(currentDecorations, []);
      }
      if (Array.isArray(currentWarningDecorations) && currentWarningDecorations.length > 0) {
        currentWarningDecorations = editor.deltaDecorations(currentWarningDecorations, []);
      }
      if (Array.isArray(currentAutoFixDecorations) && currentAutoFixDecorations.length > 0) {
        currentAutoFixDecorations = editor.deltaDecorations(currentAutoFixDecorations, []);
      }
    }
    
    const code = editor.getValue();
    originalCodeState = code;
    
    if (!code || code.trim() === '') {
      addSystemMessage('No code found in the editor. Please write some code to debug.');
      return;
    }
    
    let fileInfo;
    try {
      fileInfo = getCurrentFileInfo();
    } catch (e) {
      const activeTab = document.querySelector('.editor-tab.active');
      const fileName = activeTab?.querySelector('.tab-title')?.textContent || 'untitled.txt';
      const ext = fileName.split('.').pop() || 'txt';
      
      fileInfo = {
        name: fileName,
        language: ext,
        lines: code.split('\n').length
      };
    }
    
    setCodeAnalysisMode(true, {
      code: code,
      language: fileInfo.language,
      fileName: fileInfo.name,
      lastAnalyzedTimestamp: Date.now()
    });
    
    addMessageToChat('user', `Debug my code in ${fileInfo.name}`);
    
    showTypingIndicator();
    
    const config = getCurrentApiConfiguration();
    if (!config.apiKey || !config.apiBaseUrl) {
      hideTypingIndicator();
      addSystemMessage(`${getProviderDisplayName(config.provider)} API credentials not configured. Please click the settings button to configure your API.`);
      return;
    }
    
    const codeLines = code.split('\n');
    const codeWithLineNumbers = codeLines.map((line, index) => `${index + 1}: ${line}`).join('\n');
    
    const debugPrompt = `Debug this ${fileInfo.language} code and identify ONLY syntax errors and undefined variables:

\`\`\`${fileInfo.language}
${codeWithLineNumbers}
\`\`\`

For each syntax error, use this format:
SYNTAX_ERROR:
LINE: [line number]
DESCRIPTION: [error description]
FIX: [specific fix instruction]

If there are no syntax errors, respond with "Debug successful! No syntax errors found."`;
    
    const analysis = await callGenericAPI(debugPrompt, config);
    
    let formattedAnalysis = formatDebugAnalysis(analysis);
    
    const errors = parseSyntaxErrorsFromAnalysis(analysis);
    
    if (errors.length > 0) {
      addErrorMarkersToEditor(editor, errors);
      
      // Update the auto-fix button state to show green animation
      updateAutoFixUI(true);
      
      const fixableCount = errors.filter(e => e.fix).length;
      if (fixableCount > 0) {
        formattedAnalysis += `<br><br><div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(76, 175, 80, 0.3);">
          <strong>Auto-Fix Available:</strong> ${fixableCount} error${fixableCount > 1 ? 's' : ''} can be automatically fixed. 
          Click the lightning icons in the margin or use the Fix All button.
        </div>`;
      }
    } else {
      // No errors found, ensure button is in default state
      updateAutoFixUI(true);
    }
    
    hideTypingIndicator();
    
    addMessageToChat('assistant', formattedAnalysis);
    
    updateCodeAnalysisModeIndicator();
    
    // Display debug-specific suggested actions with direct response capability
    const debugSuggestions = generateSuggestedActions(fileInfo.language, errors.length > 0, 'debug');
    await displaySuggestedActions(debugSuggestions);
    
  } catch (error) {
    hideTypingIndicator();
    
    const config = getCurrentApiConfiguration();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addSystemMessage(`Failed to debug code: ${errorMessage}`);
    
    console.error('Code debugging failed:', error);
  }
}

/**
 * Update the UI indicator for code analysis mode
 */
function updateCodeAnalysisModeIndicator(): void {
  const existingIndicator = document.querySelector('.code-analysis-mode-indicator');
  if (existingIndicator) existingIndicator.remove();
  
  if (isInCodeAnalysis()) {
    const currentCodeContext = getCurrentCodeContext();
    
    const indicator = document.createElement('div');
    indicator.className = 'code-analysis-mode-indicator';
    indicator.innerHTML = `<span>${currentCodeContext.fileName}</span> <a href="#" id="exit-code-analysis">×</a>`;
    
    const inputArea = document.getElementById('ai-assistant-input')?.parentNode;
    
    if (inputArea) {
      inputArea.insertBefore(indicator, inputArea.firstChild);
    }
    
    document.getElementById('exit-code-analysis')?.addEventListener('click', (e) => {
      e.preventDefault();
      exitCodeAnalysisMode();
    });
  }
}

/**
 * Exit code analysis mode
 */
function exitCodeAnalysisMode(): void {
  setCodeAnalysisMode(false, {
    code: '',
    language: '',
    fileName: '',
    lastAnalyzedTimestamp: 0
  });
  updateCodeAnalysisModeIndicator();
  addSystemMessage('Exited code analysis mode. Conversation will no longer reference the previously analyzed code.');
}

/**
 * Format enhanced analysis
 */
function formatEnhancedAnalysis(analysis: string): string {
  let formatted = analysis;
  
  formatted = formatted.replace(/## CODE OVERVIEW/g, '<div style="background: linear-gradient(135deg, #1e88e5, #1565c0); padding: 12px; border-radius: 8px; color: white; font-weight: bold; margin: 12px 0;">CODE OVERVIEW</div>');
  formatted = formatted.replace(/## DETAILED ANALYSIS/g, '<div style="background: linear-gradient(135deg, #43a047, #2e7d32); padding: 12px; border-radius: 8px; color: white; font-weight: bold; margin: 12px 0;">DETAILED ANALYSIS</div>');
  formatted = formatted.replace(/### (.+)/g, '<div style="background: rgba(79, 195, 247, 0.1); padding: 8px; border-left: 4px solid #4fc3f7; margin: 8px 0; border-radius: 4px;"><strong style="color: #4fc3f7;">$1</strong></div>');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #4fc3f7;">$1</strong>');
  formatted = formatted.replace(/---/g, '<hr style="border: none; border-top: 2px solid rgba(79, 195, 247, 0.3); margin: 20px 0;">');
  
  return formatted;
}

/**
 * Setup code block event listeners WITH HTML EXPORT BUTTON
 */
export function setupCodeBlockEventListeners(messageElement: HTMLElement): void {
  const copyButtons = messageElement.querySelectorAll('.copy-code');
  copyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const codeString = decodeURIComponent(target.getAttribute('data-code') || '');
      
      if (codeString) {
        navigator.clipboard.writeText(codeString)
          .then(() => {
            const originalText = target.textContent;
            target.textContent = '✓';
            setTimeout(() => {
              target.textContent = originalText;
            }, 2000);
            addSystemMessage('Code copied to clipboard');
          })
          .catch(err => {
            console.error('Failed to copy code:', err);
            addSystemMessage('Failed to copy code to clipboard');
          });
      }
    });
  });

  
  const insertButtons = messageElement.querySelectorAll('.insert-code');
  insertButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const codeString = decodeURIComponent(target.getAttribute('data-code') || '');
      const language = target.getAttribute('data-language') || 'text';
      
      if (codeString) {
        const success = insertCodeToCurrentEditor(codeString, language);
        if (success) {
          const originalText = target.textContent;
          target.textContent = '✓';
          setTimeout(() => {
            target.textContent = originalText;
          }, 2000);
        }
      }
    });
  });
  
  const newFileButtons = messageElement.querySelectorAll('.insert-new-file');
  newFileButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const codeString = decodeURIComponent(target.getAttribute('data-code') || '');
      const language = target.getAttribute('data-language') || 'text';
      
      if (codeString) {
        const success = createNewFileWithCode(codeString, language);
        if (success) {
          const originalText = target.textContent;
          target.textContent = '✓';
          setTimeout(() => {
            target.textContent = originalText;
          }, 2000);
        }
      }
    });
  });
  
// NEW: Add HTML export button handler
const htmlExportButtons = messageElement.querySelectorAll('.html-export-btn');
htmlExportButtons.forEach(button => {
  button.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const codeString = decodeURIComponent(target.getAttribute('data-code') || '');
    const language = target.getAttribute('data-language') || 'text';
    
    if (codeString) {
      // Visual feedback
      const originalContent = target.textContent;
      target.textContent = '⏳';
      
      // Use dedicated code viewer
      await displayCodeAsHTML(codeString, language);
      
      // Restore button
      setTimeout(() => {
        target.textContent = originalContent;
      }, 500);
    }
  });
});
}

/**
 * Display code as HTML document in viewer
 */
async function displayCodeAsHTML(code: string, language: string): Promise<void> {
  // Create HTML document with syntax highlighting
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code - ${language}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      line-height: 1.6;
    }
    .header {
      background: #252526;
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      border-bottom: 2px solid #4fc3f7;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .language {
      color: #4fc3f7;
      font-weight: 600;
      font-size: 14px;
    }
    .actions button {
      background: #4fc3f7;
      color: #1e1e1e;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      transition: all 0.2s;
      margin-left: 8px;
    }
    .actions button:hover {
      background: #42a5f5;
      transform: translateY(-2px);
    }
    pre {
      background: #1e1e1e;
      padding: 20px;
      border-radius: 0 0 8px 8px;
      overflow-x: auto;
      border: 1px solid #3d3d3d;
      border-top: none;
    }
    code {
      font-size: 13px;
      color: #d4d4d4;
    }
    ::-webkit-scrollbar {
      height: 8px;
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    ::-webkit-scrollbar-thumb {
      background: #4fc3f7;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="language">${language.toUpperCase()}</span>
    <div class="actions">
      <button onclick="copyCode()">Copy Code</button>
      <button onclick="downloadCode()">Download</button>
    </div>
  </div>
  <pre><code id="code-content">${escapeHtml(code)}</code></pre>
  
  <script>
    function copyCode() {
      const code = document.getElementById('code-content').textContent;
      navigator.clipboard.writeText(code).then(() => {
        alert('Code copied to clipboard!');
      });
    }
    
    function downloadCode() {
      const code = document.getElementById('code-content').textContent;
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code.${getFileExtension(language)}';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;

  // Use existing HTML viewer or create modal
  const viewer = document.createElement('div');
  viewer.className = 'code-html-viewer';
  viewer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  viewer.innerHTML = `
    <div style="position: relative; width: 90%; height: 90%; max-width: 1200px; background: #1e1e1e; border-radius: 12px; overflow: hidden;">
      <button onclick="this.closest('.code-html-viewer').remove()" 
              style="position: absolute; top: 10px; right: 10px; z-index: 1; background: #f44336; color: white; border: none; 
                     padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Close ×
      </button>
      <iframe srcdoc="${escapeHtml(htmlContent)}" 
              style="width: 100%; height: 100%; border: none;"></iframe>
    </div>
  `;
  
  document.body.appendChild(viewer);
  
  // Close on background click
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) viewer.remove();
  });
}

/**
 * Create new file with code
 */
function createNewFileWithCode(code: string, language: string): boolean {
  try {
    const extension = getFileExtension(language);
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const filename = `ai-generated-${timestamp}.${extension}`;
    
    console.log(`Attempting to create new file: ${filename}`);
    
    addSystemMessage(`File creation attempted: ${filename}. Please implement createNewFileWithCode in your file system.`);
    
    return false;
    
  } catch (error) {
    console.error('Error in createNewFileWithCode:', error);
    addSystemMessage('Failed to create new file');
    return false;
  }
}

/**
 * Insert code to current editor
 */
function insertCodeToCurrentEditor(code: string, language: string): boolean {
  try {
    const editor = window.monaco?.editor?.getEditors?.()?.[0];
    
    if (!editor) {
      addSystemMessage('No active editor found. Please open a file first.');
      return false;
    }
    
    const position = editor.getPosition();
    
    if (position) {
      editor.executeEdits('insert-ai-code', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: code
      }]);
      
      const lines = code.split('\n');
      const lastLine = position.lineNumber + lines.length - 1;
      const lastColumn = lines.length === 1 ? 
        position.column + code.length : 
        lines[lines.length - 1].length + 1;
      
      editor.setPosition({ lineNumber: lastLine, column: lastColumn });
      editor.focus();
      
      addSystemMessage(`${language} code inserted at cursor position`);
      return true;
    } else {
      const model = editor.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        const lastLineLength = model.getLineContent(lineCount).length;
        
        editor.executeEdits('insert-ai-code', [{
          range: new monaco.Range(lineCount, lastLineLength + 1, lineCount, lastLineLength + 1),
          text: '\n' + code
        }]);
        
        editor.focus();
        addSystemMessage(`${language} code appended to end of file`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error inserting code to editor:', error);
    addSystemMessage('Failed to insert code to editor');
    return false;
  }
}

function addHighlightingStyles(): void {
  if (document.getElementById('assistant-highlighting-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'assistant-highlighting-styles';
  styleElement.textContent = `
    .error-highlight {
      background-color: rgba(255, 82, 82, 0.15);
      border-bottom: 2px wavy #ff5252;
      border-radius: 2px;
      animation: errorPulse 2s infinite;
    }
    
    @keyframes errorPulse {
      0%, 100% { background-color: rgba(255, 82, 82, 0.15); }
      50% { background-color: rgba(255, 82, 82, 0.25); }
    }
    
    .warning-highlight {
      background-color: rgba(255, 193, 7, 0.15);
      border-bottom: 2px wavy #ffc107;
      border-radius: 2px;
    }
    
    .success-highlight {
      background-color: rgba(76, 175, 80, 0.2);
      border-bottom: 2px solid #4caf50;
      border-radius: 2px;
      animation: successGlow 1s ease-out;
    }
    
    @keyframes successGlow {
      0% { 
        background-color: rgba(76, 175, 80, 0.4);
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.6);
      }
      100% { 
        background-color: rgba(76, 175, 80, 0.2);
        box-shadow: none;
      }
    }
    
    /* COMPACT Code Analysis Mode Indicator */
    .code-analysis-mode-indicator {
      padding: 4px 10px !important;
      background: rgba(79, 195, 247, 0.08);
      color: #4fc3f7;
      border: 1px solid rgba(79, 195, 247, 0.15);
      border-radius: 6px;
      margin: 4px 0 !important;
      position: relative;
      z-index: 100;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: none;
    }
    
    .code-analysis-mode-indicator span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .code-analysis-mode-indicator a {
      color: #4fc3f7;
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .code-analysis-mode-indicator a:hover {
      background: rgba(79, 195, 247, 0.15);
      text-decoration: none;
    }
  `;
  
  document.head.appendChild(styleElement);
}

function addCodeBlockActionStyles(): void {
  if (document.getElementById('code-block-action-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'code-block-action-styles';
  styleElement.textContent = `
    /* Compact Code Block */
    .code-block {
      margin: 10px 0;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #2d2d2d;
      background: #1e1e1e;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.4;
    }
    
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #252526;
      padding: 4px 8px;
      border-bottom: 1px solid #2d2d2d;
      min-height: 26px;
    }
    
    .code-language {
      font-size: 9px;
      color: #858585;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .code-actions {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    
    .code-action {
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      transition: all 0.12s ease;
      color: #b0b0b0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      line-height: 1;
      position: relative;
      opacity: 1 !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      min-width: 24px;
      height: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .code-action:hover {
      background: #4fc3f7;
      color: #ffffff;
      border-color: #4fc3f7;
      transform: translateY(-1px);
    }
    
    .code-action:active {
      transform: translateY(0);
    }
    
    .code-truncated-notice {
      background: rgba(79, 195, 247, 0.1);
      border-top: 1px solid rgba(79, 195, 247, 0.3);
      padding: 4px 8px;
      font-size: 10px;
      color: #4fc3f7;
      text-align: center;
      font-family: -apple-system, sans-serif;
    }
    
    .code-block pre {
      margin: 0;
      padding: 10px;
      background: #1e1e1e;
      overflow-x: auto;
      font-family: inherit;
      font-size: 11px;
      line-height: 1.5;
    }
    
    .code-viewer-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    
    .code-viewer-action {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      padding: 2px 6px;
      color: #b0b0b0;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s ease;
    }
    
    .code-viewer-action:hover {
      background: #4fc3f7;
      color: #ffffff;
      border-color: #4fc3f7;
    }
    
    .code-block code {
      font-family: inherit;
      color: #d4d4d4;
    }
    
    /* MODAL VIEWER */
    .code-viewer-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .code-viewer-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
    }
    
    .code-viewer-container {
      position: relative;
      background: #1e1e1e;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      width: 90%;
      max-width: 1000px;
      height: 80%;
      max-height: 700px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
    
    .code-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #252526;
      border-bottom: 1px solid #3d3d3d;
    }
    
    .code-viewer-title {
      font-size: 11px;
      color: #4fc3f7;
      font-weight: 600;
      font-family: -apple-system, sans-serif;
    }
    
    .code-viewer-close {
      background: none;
      border: none;
      color: #999;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    
    .code-viewer-close:hover {
      color: #f44336;
    }
    
    .code-viewer-content {
      flex: 1;
      overflow: auto;
      padding: 12px;
      background: #1e1e1e;
    }
    
    .code-viewer-content pre {
      margin: 0;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.5;
    }
    
    .code-viewer-content code {
      color: #d4d4d4;
    }
    
    /* Scrollbars */
    .code-block pre::-webkit-scrollbar,
    .code-viewer-content::-webkit-scrollbar {
      height: 5px;
      width: 5px;
    }
    
    .code-block pre::-webkit-scrollbar-track,
    .code-viewer-content::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    .code-block pre::-webkit-scrollbar-thumb,
    .code-viewer-content::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 3px;
    }
  `;
  
  document.head.appendChild(styleElement);
}

function addSuggestedActionsStyles(): void {
  if (document.getElementById('suggested-actions-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'suggested-actions-styles';
  styleElement.textContent = `
    .suggested-actions-container {
      animation: fadeIn 0.6s ease;
      margin: 20px 0;
    }
    
    @keyframes fadeIn {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    .suggested-action-btn {
      animation: slideUp 0.4s ease;
      animation-fill-mode: both;
      user-select: none;
      -webkit-user-select: none;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    /* Staggered animation delays */
    .suggested-action-btn:nth-child(1) { animation-delay: 0.1s; }
    .suggested-action-btn:nth-child(2) { animation-delay: 0.15s; }
    .suggested-action-btn:nth-child(3) { animation-delay: 0.2s; }
    .suggested-action-btn:nth-child(4) { animation-delay: 0.25s; }
    .suggested-action-btn:nth-child(5) { animation-delay: 0.3s; }
    .suggested-action-btn:nth-child(6) { animation-delay: 0.35s; }
    .suggested-action-btn:nth-child(7) { animation-delay: 0.4s; }
    .suggested-action-btn:nth-child(8) { animation-delay: 0.45s; }
    .suggested-action-btn:nth-child(9) { animation-delay: 0.5s; }
    .suggested-action-btn:nth-child(10) { animation-delay: 0.55s; }
    
    @keyframes slideUp {
      from { 
        opacity: 0; 
        transform: translateY(30px) scale(0.95); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    .suggested-action-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(79, 195, 247, 0.1), transparent);
      transition: left 0.5s;
    }
    
    .suggested-action-btn:hover::before {
      left: 100%;
    }
    
    .suggested-action-btn:hover {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(33, 150, 243, 0.1)) !important;
      border-color: #4fc3f7 !important;
      transform: translateY(-3px) scale(1.02) !important;
      box-shadow: 0 8px 24px rgba(79, 195, 247, 0.25) !important;
    }
    
    .suggested-action-btn:active {
      transform: translateY(-1px) scale(0.98) !important;
      transition: transform 0.1s ease;
    }
    
    /* Enhanced selection indicator */
    .selection-indicator {
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    }
    
    .suggested-action-btn.selected .selection-indicator {
      animation: checkmarkBounce 0.5s ease;
    }
    
    @keyframes checkmarkBounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    
    /* Multi-select mode styles */
    .suggested-action-btn.selected {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(33, 150, 243, 0.15)) !important;
      border-color: #4fc3f7 !important;
      box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.3) !important;
    }
    
    /* Toggle button enhancements */
    #toggle-multi-select {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    #toggle-multi-select::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.5s;
    }
    
    #toggle-multi-select:hover::before {
      left: 100%;
    }
    
    #toggle-multi-select:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    
    #toggle-multi-select:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* Execute button enhancements */
    #execute-selected-suggestions {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      position: relative;
      overflow: hidden;
    }
    
    #execute-selected-suggestions::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.6s;
    }
    
    #execute-selected-suggestions:hover::before {
      left: 100%;
    }
    
    /* Instructions styling */
    #suggestion-instructions {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      font-size: 12px;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      transition: color 0.2s;
    }
    
    #suggestion-instructions:hover {
      color: rgba(255, 255, 255, 0.7);
    }
    
    /* Responsive improvements */
    @media (max-width: 768px) {
      .suggested-action-btn {
        font-size: 12px !important;
        padding: 8px 12px !important;
        min-height: 40px !important;
      }
      
      .suggested-action-btn span:first-child {
        font-size: 16px !important;
      }
    }
    
    /* Dark mode enhancements */
    @media (prefers-color-scheme: dark) {
      .suggested-action-btn {
        border-color: rgba(255, 255, 255, 0.12) !important;
        background: rgba(255, 255, 255, 0.03) !important;
      }
      
      .suggested-action-btn:hover {
        border-color: rgba(79, 195, 247, 0.4) !important;
        background: rgba(79, 195, 247, 0.08) !important;
      }
    }

    /* ADD THESE AT THE END */
.suggested-actions-container.collapsed .suggestions-content {
  max-height: 0 !important;
  padding: 0 16px !important;
}

.suggested-actions-container.expanded .suggestions-content {
  max-height: 2000px !important;
  padding: 0 16px !important;
}

.suggestions-header {
  user-select: none;
}

.suggestions-header:hover {
  background: rgba(79, 195, 247, 0.1) !important;
}

.suggestions-header:active {
  background: rgba(79, 195, 247, 0.15) !important;
}

.expand-icon {
  transition: transform 0.3s ease !important;
}
  `;
  
  document.head.appendChild(styleElement);
}

function addAutoFixStyles(): void {
  if (document.getElementById('auto-fix-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'auto-fix-styles';
  styleElement.textContent = `
    /* Enhanced auto-fix glyph */
    .auto-fix-glyph::before {
      content: '⚡';
      color: #4caf50;
      font-size: 18px;
      cursor: pointer;
      display: inline-block;
      animation: pulseGlow 2.5s infinite;
      position: relative;
      z-index: 1000;
      transition: all 0.3s ease;
      text-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
    }
    
    .auto-fix-glyph.clickable-glyph {
      cursor: pointer !important;
      pointer-events: all !important;
    }
    
    @keyframes pulseGlow {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
        filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.6));
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.15);
        filter: drop-shadow(0 0 8px rgba(76, 175, 80, 1));
      }
    }
    
    .auto-fix-glyph:hover::before {
      color: #66bb6a;
      transform: scale(1.3);
      filter: drop-shadow(0 0 12px rgba(76, 175, 80, 1));
      animation-play-state: paused;
    }
    
    /* Enhanced auto-fix tool button states */
    .auto-fix-tool.no-fixes {
      padding: 6px 10px !important;
      border: 1px solid rgba(79, 195, 247, 0.2) !important;
      border-radius: 8px !important;
      background: rgba(79, 195, 247, 0.05) !important;
      color: #4fc3f7 !important;
      cursor: pointer !important;
      font-size: 16px !important;
      transition: all 0.3s ease !important;
      animation: none !important;
      opacity: 0.7;
      font-family: 'Inter', sans-serif;
    }
    
    .auto-fix-tool.no-fixes:hover {
      background: rgba(79, 195, 247, 0.15) !important;
      border-color: #4fc3f7 !important;
      transform: translateY(-2px);
      opacity: 1;
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.2);
    }
    
    .auto-fix-tool.has-fixes {
      padding: 6px 10px !important;
      border: 1px solid rgba(76, 175, 80, 0.4) !important;
      border-radius: 8px !important;
      background: linear-gradient(135deg, #4caf50, #45a049) !important;
      color: white !important;
      cursor: pointer !important;
      font-size: 16px !important;
      animation: urgentPulse 2s infinite !important;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
      position: relative;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
    }
    
    @keyframes urgentPulse {
      0% { 
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.7);
        transform: scale(1.08);
      }
      100% { 
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        transform: scale(1);
      }
    }
    
    /* Enhanced shimmer effect */
    .auto-fix-tool.has-fixes::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 70%
      );
      animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
      0% { transform: rotate(0deg) scale(0.8); }
      100% { transform: rotate(360deg) scale(1.2); }
    }
    
    .auto-fix-tool.has-fixes:hover {
      background: linear-gradient(135deg, #66bb6a, #4caf50) !important;
      transform: scale(1.12);
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.6);
      animation-play-state: paused !important;
    }
    
    .auto-fix-tool.has-fixes:active {
      transform: scale(1.05);
      transition: transform 0.1s ease;
    }
    
    /* Enhanced notification styling */
    .auto-fix-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.4s ease;
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    
    @keyframes slideInRight {
      from { 
        transform: translateX(100%) scale(0.9); 
        opacity: 0; 
      }
      to { 
        transform: translateX(0) scale(1); 
        opacity: 1; 
      }
    }
    
    @keyframes slideOutRight {
      from { 
        transform: translateX(0) scale(1); 
        opacity: 1; 
      }
      to { 
        transform: translateX(100%) scale(0.9); 
        opacity: 0; 
      }
    }
    
    /* Success highlight improvements */
    .success-highlight {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(129, 199, 132, 0.15)) !important;
      border-bottom: 2px solid #4caf50 !important;
      border-radius: 4px !important;
      animation: successGlow 1.5s ease-out !important;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
    }
    
    @keyframes successGlow {
      0% { 
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(129, 199, 132, 0.3));
        box-shadow: 0 0 16px rgba(76, 175, 80, 0.6);
      }
      100% { 
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(129, 199, 132, 0.15));
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
      }
    }
  `;
  
  document.head.appendChild(styleElement);
}

function addCameraButtonStyles(): void {
  if (document.getElementById('camera-button-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'camera-button-styles';
  styleElement.textContent = `
    /* Camera button default state - matches other tool buttons */
    #camera-btn.camera-inactive {
      padding: 4px 8px !important;
      border: 1px solid rgba(79, 195, 247, 0.2) !important;
      border-radius: 4px !important;
      background: rgba(79, 195, 247, 0.05) !important;
      color: #4fc3f7 !important;
      cursor: pointer !important;
      font-size: 16px !important;
      transition: all 0.2s !important;
    }
    
    #camera-btn.camera-inactive:hover {
      background: rgba(79, 195, 247, 0.15) !important;
      border-color: #4fc3f7 !important;
      transform: translateY(-1px);
    }
    
    /* Camera button active state - green with animation */
    #camera-btn.camera-active {
      padding: 4px 8px !important;
      border: 1px solid rgba(76, 175, 80, 0.4) !important;
      border-radius: 4px !important;
      background: linear-gradient(135deg, #4caf50, #45a049) !important;
      color: white !important;
      cursor: pointer !important;
      font-size: 16px !important;
      animation: cameraPulse 1.5s infinite !important;
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    @keyframes cameraPulse {
      0% { 
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 2px 12px rgba(76, 175, 80, 0.6);
        transform: scale(1.05);
      }
      100% { 
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        transform: scale(1);
      }
    }
    
    /* Shimmer effect for active state */
    #camera-btn.camera-active::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(255, 255, 255, 0.2) 50%,
        transparent 70%
      );
      animation: shimmer 3s infinite;
    }
    
    #camera-btn.camera-active:hover {
      background: linear-gradient(135deg, #66bb6a, #4caf50) !important;
      transform: scale(1.08);
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.5);
      animation-play-state: paused !important;
    }
  `;
  
  document.head.appendChild(styleElement);
}

function addHTMLDocumentViewerStyles(): void {
  if (document.getElementById('html-document-viewer-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'html-document-viewer-styles';
  styleElement.textContent = `
    /* HTML Document Viewer Modal */
    .html-document-viewer {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      font-family: 'Inter', sans-serif;
    }
    
    .html-document-viewer.viewer-open {
      opacity: 1;
      visibility: visible;
    }
    
    .doc-viewer-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
    }
    
    .doc-viewer-container {
      position: relative;
      background: linear-gradient(135deg, #1e1e1e, #2d2d2d);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      width: 95%;
      height: 90%;
      max-width: 1400px;
      max-height: 900px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }
    
    .html-document-viewer.viewer-open .doc-viewer-container {
      transform: scale(1);
    }
    
    .doc-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(33, 150, 243, 0.05));
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    
    .doc-info h2 {
      margin: 0 0 4px 0;
      color: #4fc3f7;
      font-size: 18px;
      font-weight: 600;
    }
    
    .doc-filename {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-family: 'JetBrains Mono', monospace;
    }
    
    .doc-actions {
      display: flex;
      gap: 8px;
    }
    
    .doc-action-btn {
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: #e0e0e0;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }
    
    .doc-action-btn:hover {
      background: rgba(79, 195, 247, 0.15);
      border-color: rgba(79, 195, 247, 0.4);
      color: #4fc3f7;
      transform: translateY(-1px);
    }
    
    .doc-action-btn.active {
      background: linear-gradient(135deg, #4fc3f7, #42a5f5);
      color: white;
      border-color: transparent;
    }
    
    .doc-action-btn.close-btn {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.3);
      color: #f44336;
    }
    
    .doc-action-btn.close-btn:hover {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.5);
    }
    
    .doc-viewer-content {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .doc-preview-container,
    .doc-code-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    
    .doc-preview-container.active,
    .doc-code-container.active {
      opacity: 1;
      visibility: visible;
    }
    
    #doc-preview-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    
    .doc-code-container {
      padding: 20px;
      overflow-y: auto;
    }
    
    .doc-code-container .code-block {
      height: 100%;
      margin: 0;
    }
    
    .doc-code-container .code-block pre {
      height: calc(100% - 60px);
      margin: 0;
      overflow: auto;
    }
    
    /* Enhanced scrollbars for code view */
    .doc-code-container::-webkit-scrollbar,
    .doc-code-container .code-block pre::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    
    .doc-code-container::-webkit-scrollbar-track,
    .doc-code-container .code-block pre::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }
    
    .doc-code-container::-webkit-scrollbar-thumb,
    .doc-code-container .code-block pre::-webkit-scrollbar-thumb {
      background: linear-gradient(45deg, #4fc3f7, #42a5f5);
      border-radius: 6px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    
    .doc-code-container::-webkit-scrollbar-thumb:hover,
    .doc-code-container .code-block pre::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(45deg, #42a5f5, #4fc3f7);
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .doc-viewer-container {
        width: 98%;
        height: 95%;
        border-radius: 12px;
      }
      
      .doc-viewer-header {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
      
      .doc-actions {
        justify-content: center;
      }
      
      .doc-action-btn {
        flex: 1;
        text-align: center;
      }
      
      .doc-code-container {
        padding: 16px;
      }
    }
    
    /* Loading animation for iframe */
    #doc-preview-frame {
      transition: opacity 0.3s ease;
    }
    
    #doc-preview-frame:not([src]) {
      background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
      background-size: 20px 20px;
      animation: loadingPattern 1s linear infinite;
    }
    
    @keyframes loadingPattern {
      0% { background-position: 0 0; }
      100% { background-position: 20px 20px; }
    }
    
    /* Print styles for documentation */
    @media print {
      .html-document-viewer {
        position: static;
        background: white;
      }
      
      .doc-viewer-overlay,
      .doc-viewer-header {
        display: none;
      }
      
      .doc-viewer-container {
        box-shadow: none;
        border: none;
        background: white;
        width: 100%;
        height: auto;
      }
      
      .doc-preview-container {
        position: static;
        opacity: 1;
        visibility: visible;
      }
    }
  `;
  
  document.head.appendChild(styleElement);
}

document.addEventListener('showSuggestedActions', async (event: any) => {
  console.log('🎯 Received showSuggestedActions event from "=" keyboard shortcut');
  
  try {
    // Get current editor and language
    let language = 'javascript';
    let hasErrors = false;
    
    // Try to get Monaco editor info
    if (typeof window !== 'undefined' && (window as any).monaco?.editor) {
      const models = (window as any).monaco.editor.getModels();
      if (models && models.length > 0) {
        const editor = models[0];
        language = editor.getLanguageId() || 'javascript';
        
        // Check for errors in markers
        const markers = (window as any).monaco?.editor?.getModelMarkers?.({ owner: 'typescript' }) || [];
        hasErrors = markers.some((m: any) => m.severity === 8); // 8 = Error severity
      }
    }
    
    console.log('📝 Code context:', { language, hasErrors });
    
    // Generate actions using your existing function
    const actions = generateSuggestedActions(language, hasErrors, 'analysis');
    
    console.log('✅ Generated', actions.length, 'actions');
    
    // Display the panel using your existing function
    await displaySuggestedActions(actions);
    
    console.log('🎉 Suggested actions panel displayed successfully!');
    
  } catch (error) {
    console.error('❌ Error showing suggested actions:', error);
    
    // Try to show notification if available
    if (typeof (window as any).showNotification === 'function') {
      (window as any).showNotification('Failed to show suggested actions', 'error');
    }
  }
});

console.log('✅ Keyboard shortcut listener for "=" registered');

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: Expose to window (backup method)
// ═══════════════════════════════════════════════════════════════════════════

// This allows the keyboard shortcut to call it directly as a fallback
(window as any).triggerSuggestedActionsFromShortcut = async () => {
  console.log('🌐 Direct call from keyboard shortcut');
  
  // Dispatch the event to use the listener above
  document.dispatchEvent(new CustomEvent('showSuggestedActions', {
    detail: { trigger: 'keyboard', key: '=' }
  }));
};

console.log('✅ Window.triggerSuggestedActionsFromShortcut exposed');

// ═══════════════════════════════════════════════════════════════════════════
// EXPOSE ANALYSIS FUNCTIONS TO WINDOW FOR BUTTON CLICKS
// ═══════════════════════════════════════════════════════════════════════════
(window as any).handleAnalyzeCode = handleAnalyzeCode;
(window as any).handleDebugCode = handleDebugCode;
console.log('✅ Window.handleAnalyzeCode exposed');
console.log('✅ Window.handleDebugCode exposed');

// ═══════════════════════════════════════════════════════════════════════════
// RECONNECT BUTTON CLICK HANDLERS (in case they weren't attached)
// ═══════════════════════════════════════════════════════════════════════════
function reconnectButtonHandlers(): void {
  // Analyze button
  const analyzeBtn = document.getElementById('analyze-code-btn');
  if (analyzeBtn) {
    // Remove existing listeners to avoid duplicates
    analyzeBtn.replaceWith(analyzeBtn.cloneNode(true));
    const newAnalyzeBtn = document.getElementById('analyze-code-btn');
    if (newAnalyzeBtn) {
      newAnalyzeBtn.addEventListener('click', () => {
        console.log('🔍 Analyze button clicked');
        handleAnalyzeCode();
      });
      console.log('✅ Analyze button click handler reconnected');
    }
  }
  
  // Debug button
  const debugBtn = document.getElementById('debug-code-btn');
  if (debugBtn) {
    debugBtn.replaceWith(debugBtn.cloneNode(true));
    const newDebugBtn = document.getElementById('debug-code-btn');
    if (newDebugBtn) {
      newDebugBtn.addEventListener('click', () => {
        console.log('🐛 Debug button clicked');
        handleDebugCode();
      });
      console.log('✅ Debug button click handler reconnected');
    }
  }
}

// Run reconnection after DOM is ready
if (document.readyState === 'complete') {
  setTimeout(reconnectButtonHandlers, 500);
} else {
  window.addEventListener('load', () => {
    setTimeout(reconnectButtonHandlers, 500);
  });
}

// Also expose reconnect function
(window as any).reconnectAnalysisButtons = reconnectButtonHandlers;

console.log('Code Analysis Manager loaded with HTML Export and Toggle Multi-Select. Use window.debugAutoFix(lineNumber) to test fixes.');