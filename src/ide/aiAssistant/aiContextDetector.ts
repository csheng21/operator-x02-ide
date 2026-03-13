// aiContextDetector.ts
// ============================================================================
// INTELLIGENT CONTEXT DETECTION FOR AI
// ============================================================================
// Automatically detects what context the user needs based on their question
// and includes the appropriate information (project files, editor content, 
// terminal errors, etc.)
// ============================================================================

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[🧠 ContextDetector]', ...args);

// ============================================================================
// INTENT TYPES
// ============================================================================

type ContextIntent = 
  | 'project_structure'   // User asking about project files/folders
  | 'editor_content'      // User asking about currently open code
  | 'terminal_output'     // User asking about errors/build issues
  | 'file_specific'       // User mentions specific filename
  | 'general'             // General question, minimal context needed
  | 'multiple';           // Needs multiple contexts

interface DetectionResult {
  intent: ContextIntent;
  confidence: number;      // 0-1 confidence score
  keywords: string[];      // Matched keywords
  suggestedContext: string[];  // What context to include
}

// ============================================================================
// KEYWORD PATTERNS FOR INTENT DETECTION
// ============================================================================

const INTENT_PATTERNS = {
  project_structure: {
    keywords: [
      'which file', 'what file', 'where is', 'where should', 'find file',
      'project structure', 'folder', 'directory', 'create file', 'new file',
      'file to edit', 'file to update', 'file to modify', 'files in',
      'project files', 'all files', 'list files', 'show files',
      'where do i', 'which folder', 'project layout', 'codebase'
    ],
    weight: 1.0
  },
  
  editor_content: {
    keywords: [
      'this code', 'this file', 'current file', 'current code',
      'fix this', 'this function', 'this component', 'this class',
      'line ', 'on line', 'at line', 'the code', 'my code',
      'what does this', 'explain this', 'this error in',
      'the function', 'the variable', 'displayed', 'showing',
      'open file', 'opened', 'viewing', 'looking at',
      'selected', 'highlighted', 'cursor'
    ],
    weight: 1.2  // Higher weight - editor context is very relevant
  },
  
  terminal_output: {
    keywords: [
      'error', 'failed', 'failing', 'not working', 'broken',
      'npm', 'yarn', 'build', 'compile', 'run', 'start',
      'install', 'cannot find', 'module not found', 'undefined',
      'terminal', 'console', 'command', 'output', 'log',
      'exception', 'stack trace', 'crash', 'bug'
    ],
    weight: 1.1
  },
  
  file_specific: {
    // Matches filename patterns like "App.tsx", "index.js", etc.
    patterns: [
      /\b[\w-]+\.(tsx?|jsx?|css|scss|html|json|py|rs|go|java|vue|svelte)\b/i,
      /\b(app|index|main|component|service|util|helper|config)\b/i
    ],
    weight: 0.9
  },
  
  general: {
    keywords: [
      'how to', 'how do i', 'what is', 'explain', 'example',
      'best practice', 'recommend', 'should i', 'difference between',
      'tutorial', 'learn', 'help me understand'
    ],
    weight: 0.5
  }
};

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect user intent from their message
 */
export function detectIntent(message: string): DetectionResult {
  const msgLower = message.toLowerCase();
  const scores: Record<ContextIntent, { score: number; keywords: string[] }> = {
    project_structure: { score: 0, keywords: [] },
    editor_content: { score: 0, keywords: [] },
    terminal_output: { score: 0, keywords: [] },
    file_specific: { score: 0, keywords: [] },
    general: { score: 0, keywords: [] },
    multiple: { score: 0, keywords: [] }
  };
  
  // Check keyword-based intents
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    if ('keywords' in config) {
      for (const keyword of config.keywords) {
        if (msgLower.includes(keyword)) {
          scores[intent as ContextIntent].score += config.weight;
          scores[intent as ContextIntent].keywords.push(keyword);
        }
      }
    }
    
    if ('patterns' in config) {
      for (const pattern of config.patterns) {
        const matches = message.match(pattern);
        if (matches) {
          scores[intent as ContextIntent].score += config.weight;
          scores[intent as ContextIntent].keywords.push(matches[0]);
        }
      }
    }
  }
  
  // Find highest scoring intent
  let maxScore = 0;
  let maxIntent: ContextIntent = 'general';
  let matchedKeywords: string[] = [];
  
  for (const [intent, data] of Object.entries(scores)) {
    if (data.score > maxScore) {
      maxScore = data.score;
      maxIntent = intent as ContextIntent;
      matchedKeywords = data.keywords;
    }
  }
  
  // Check if multiple high-scoring intents (needs multiple contexts)
  const highScorers = Object.entries(scores).filter(([_, d]) => d.score > 0.5);
  if (highScorers.length > 1) {
    maxIntent = 'multiple';
    matchedKeywords = highScorers.flatMap(([_, d]) => d.keywords);
  }
  
  // Determine what context to include
  const suggestedContext = getSuggestedContext(maxIntent, scores);
  
  const result: DetectionResult = {
    intent: maxIntent,
    confidence: Math.min(maxScore / 2, 1), // Normalize to 0-1
    keywords: [...new Set(matchedKeywords)],
    suggestedContext
  };
  
  log('Detected intent:', result);
  return result;
}

/**
 * Get suggested context based on intent
 */
function getSuggestedContext(
  intent: ContextIntent, 
  scores: Record<ContextIntent, { score: number; keywords: string[] }>
): string[] {
  const contexts: string[] = [];
  
  switch (intent) {
    case 'project_structure':
      contexts.push('project_files');
      break;
      
    case 'editor_content':
      contexts.push('editor_content');
      contexts.push('editor_filename');
      break;
      
    case 'terminal_output':
      contexts.push('terminal_errors');
      contexts.push('terminal_recent');
      break;
      
    case 'file_specific':
      contexts.push('specific_file');
      contexts.push('project_files'); // Also show structure for context
      break;
      
    case 'multiple':
      // Include all high-scoring contexts
      if (scores.project_structure.score > 0.5) contexts.push('project_files');
      if (scores.editor_content.score > 0.5) contexts.push('editor_content');
      if (scores.terminal_output.score > 0.5) contexts.push('terminal_errors');
      break;
      
    case 'general':
    default:
      // Minimal context - maybe just current file name
      contexts.push('editor_filename');
      break;
  }
  
  return contexts;
}

// ============================================================================
// CONTEXT GATHERERS
// ============================================================================

/**
 * Get current editor content
 */
export function getEditorContext(): string {
  try {
    const monaco = (window as any).monaco;
    const editor = monaco?.editor?.getEditors()?.[0];
    
    if (!editor) return '';
    
    const model = editor.getModel();
    if (!model) return '';
    
    const uri = model.uri?.path || 'unknown';
    const fileName = uri.split('/').pop() || 'unknown';
    const content = model.getValue();
    const lineCount = model.getLineCount();
    const language = model.getLanguageId() || 'plaintext';
    
    // Get cursor position
    const position = editor.getPosition();
    const cursorLine = position?.lineNumber || 1;
    
    // Get selection if any
    const selection = editor.getSelection();
    let selectedText = '';
    if (selection && !selection.isEmpty()) {
      selectedText = model.getValueInRange(selection);
    }
    
    // Build context
    let context = `\n\n---\n📄 **Currently Open: ${fileName}**\n`;
    context += `📍 Language: ${language} | Lines: ${lineCount} | Cursor at line ${cursorLine}\n`;
    
    if (selectedText) {
      context += `\n**Selected Code:**\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
    }
    
    // Include relevant portion of file (around cursor)
    const startLine = Math.max(1, cursorLine - 20);
    const endLine = Math.min(lineCount, cursorLine + 20);
    const visibleContent = model.getValueInRange({
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine)
    });
    
    context += `\n**Code (lines ${startLine}-${endLine}):**\n\`\`\`${language}\n${visibleContent}\n\`\`\`\n---\n`;
    
    return context;
  } catch (e) {
    log('Failed to get editor context:', e);
    return '';
  }
}

/**
 * Get project files context
 */
export function getProjectContext(): string {
  // Use existing function if available
  if ((window as any).buildProjectContext) {
    return (window as any).buildProjectContext();
  }
  
  // Fallback: build from DOM
  const files: string[] = [];
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path') || '';
    if (path && path.includes('.') && !path.includes('node_modules')) {
      files.push(path);
    }
  });
  
  if (files.length === 0) return '';
  
  const projectPath = (window as any).currentFolderPath || '';
  const projectName = projectPath.split(/[/\\]/).pop() || 'Project';
  
  let context = `\n\n---\n📁 **Project: ${projectName}**\n`;
  context += `📊 Files: ${files.length}\n\`\`\`\n`;
  
  files.slice(0, 20).forEach(f => {
    const name = f.split(/[/\\]/).pop();
    context += `📄 ${name}\n`;
  });
  
  if (files.length > 20) {
    context += `... and ${files.length - 20} more files\n`;
  }
  
  context += `\`\`\`\n---\n`;
  return context;
}

/**
 * Get terminal context
 */
export function getTerminalContext(): string {
  try {
    const tc = (window as any).terminalContext;
    if (tc && tc.getContext) {
      return tc.getContext();
    }
    
    // Fallback: read from terminal DOM
    const terminalOutput = document.querySelector('.terminal-output, #integrated-terminal-output');
    if (terminalOutput) {
      const text = terminalOutput.textContent || '';
      const lastLines = text.split('\n').slice(-30).join('\n');
      
      if (lastLines.trim()) {
        return `\n\n---\n🖥️ **Recent Terminal Output:**\n\`\`\`\n${lastLines}\n\`\`\`\n---\n`;
      }
    }
    
    return '';
  } catch (e) {
    log('Failed to get terminal context:', e);
    return '';
  }
}

// ============================================================================
// MAIN CONTEXT BUILDER
// ============================================================================

/**
 * Build appropriate context based on user message
 */
export function buildSmartContext(message: string): string {
  const detection = detectIntent(message);
  let context = '';
  
  log('Building context for intent:', detection.intent);
  
  for (const ctxType of detection.suggestedContext) {
    switch (ctxType) {
      case 'project_files':
        context += getProjectContext();
        break;
        
      case 'editor_content':
      case 'editor_filename':
        context += getEditorContext();
        break;
        
      case 'terminal_errors':
      case 'terminal_recent':
        context += getTerminalContext();
        break;
        
      case 'specific_file':
        // Try to find and include the mentioned file
        const fileMatch = message.match(/\b([\w-]+\.(tsx?|jsx?|css|json|html|py|rs))\b/i);
        if (fileMatch) {
          const fileName = fileMatch[1];
          // Try to read the file...
          const aiFileExplorer = (window as any).aiFileExplorer;
          if (aiFileExplorer?.read) {
            // This is async, so we'll need to handle it differently
            log('Would search for file:', fileName);
          }
        }
        context += getProjectContext(); // Fallback to project structure
        break;
    }
  }
  
  return context;
}

// ============================================================================
// MESSAGE ENHANCER
// ============================================================================

/**
 * Enhance message with smart context
 */
export async function enhanceWithSmartContext(message: string): Promise<string> {
  // Skip if AI Search is disabled
  const aiSearchEnabled = localStorage.getItem('aiFileExplorerEnabled') === 'true';
  if (!aiSearchEnabled) {
    log('AI Search disabled');
    return message;
  }
  
  // Skip if already has context
  if (message.includes('---\n📁') || message.includes('---\n📄') || message.includes('---\n🖥️')) {
    log('Already has context');
    return message;
  }
  
  const context = buildSmartContext(message);
  
  if (context) {
    log('Added smart context');
    return message + context;
  }
  
  return message;
}

// ============================================================================
// INTEGRATION
// ============================================================================

/**
 * Install smart context detection
 */
export function installSmartContext(): void {
  log('Installing smart context detection...');
  
  const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!input) {
    setTimeout(installSmartContext, 1000);
    return;
  }
  
  // Intercept Enter key
  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const enhanced = await enhanceWithSmartContext(input.value);
      if (enhanced !== input.value) {
        input.value = enhanced;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, true);
  
  // Intercept send button
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const enhanced = await enhanceWithSmartContext(input.value);
      if (enhanced !== input.value) {
        input.value = enhanced;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, true);
  }
  
  log('✅ Smart context detection installed!');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  // Expose functions globally
  (window as any).detectIntent = detectIntent;
  (window as any).buildSmartContext = buildSmartContext;
  (window as any).enhanceWithSmartContext = enhanceWithSmartContext;
  (window as any).getEditorContext = getEditorContext;
  (window as any).getProjectContext = getProjectContext;
  (window as any).getTerminalContext = getTerminalContext;
  (window as any).installSmartContext = installSmartContext;
  
  // Auto-install
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(installSmartContext, 1500));
  } else {
    setTimeout(installSmartContext, 1500);
  }
  
  log('Smart context detector loaded');
}

export default {
  detectIntent,
  buildSmartContext,
  enhanceWithSmartContext,
  getEditorContext,
  getProjectContext,
  getTerminalContext,
  installSmartContext
};
