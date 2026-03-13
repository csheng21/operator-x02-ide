// editorContextCapture.ts - Automatically capture current editor state for AI context

export interface EditorContext {
  fileName: string;
  filePath: string;
  language: string;
  content: string;
  selectedText?: string;
  cursorPosition?: {
    line: number;
    column: number;
  };
  lineCount: number;
  hasUnsavedChanges?: boolean;
}

// ============================================================================
// CAPTURE CURRENT EDITOR STATE
// ============================================================================

export function getCurrentEditorContext(): EditorContext | null {
  try {
    // Get Monaco editor instance
    const monaco = (window as any).monaco;
    if (!monaco || !monaco.editor) {
      console.warn('⚠️ Monaco editor not found');
      return null;
    }

    // Get the active editor
    const editors = monaco.editor.getEditors();
    if (!editors || editors.length === 0) {
      console.warn('⚠️ No active editor found');
      return null;
    }

    const editor = editors[0]; // Get first/active editor
    const model = editor.getModel();
    
    if (!model) {
      console.warn('⚠️ No model in editor');
      return null;
    }

    // Get file information
    const fileName = getFileName();
    const filePath = getFilePath();
    const language = model.getLanguageId();
    const content = model.getValue();
    
    // Get selection if any
    const selection = editor.getSelection();
    const selectedText = selection && !selection.isEmpty() 
      ? model.getValueInRange(selection)
      : undefined;
    
    // Get cursor position
    const position = editor.getPosition();
    const cursorPosition = position ? {
      line: position.lineNumber,
      column: position.column
    } : undefined;
    
    // Get line count
    const lineCount = model.getLineCount();
    
    // Check for unsaved changes (if available)
    const hasUnsavedChanges = checkUnsavedChanges();

    const context: EditorContext = {
      fileName,
      filePath,
      language,
      content,
      selectedText,
      cursorPosition,
      lineCount,
      hasUnsavedChanges
    };

    console.log('✅ Captured editor context:', {
      fileName,
      language,
      lineCount,
      hasSelection: !!selectedText,
      cursorLine: cursorPosition?.line
    });

    return context;

  } catch (error) {
    console.error('❌ Failed to capture editor context:', error);
    return null;
  }
}

// ============================================================================
// GET FILE NAME
// ============================================================================

function getFileName(): string {
  try {
    // Try to get from tab manager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.currentFile) {
      return tabManager.currentFile.name || 'untitled';
    }

    // Try to get from Monaco URI
    const monaco = (window as any).monaco;
    const editors = monaco?.editor?.getEditors();
    if (editors && editors.length > 0) {
      const model = editors[0].getModel();
      if (model) {
        const uri = model.uri.toString();
        const parts = uri.split('/');
        return parts[parts.length - 1] || 'untitled';
      }
    }

    return 'untitled';
  } catch (error) {
    return 'untitled';
  }
}

// ============================================================================
// GET FILE PATH
// ============================================================================

function getFilePath(): string {
  try {
    // Try to get from tab manager
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.currentFile) {
      return tabManager.currentFile.path || '/untitled';
    }

    // Try to get from Monaco URI
    const monaco = (window as any).monaco;
    const editors = monaco?.editor?.getEditors();
    if (editors && editors.length > 0) {
      const model = editors[0].getModel();
      if (model) {
        return model.uri.toString();
      }
    }

    return '/untitled';
  } catch (error) {
    return '/untitled';
  }
}

// ============================================================================
// CHECK UNSAVED CHANGES
// ============================================================================

function checkUnsavedChanges(): boolean {
  try {
    const tabManager = (window as any).tabManager;
    if (tabManager && tabManager.currentFile) {
      return tabManager.currentFile.hasUnsavedChanges || false;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// FORMAT EDITOR CONTEXT FOR AI (EXPORTED)
// ============================================================================

export function formatEditorContextForAI(context: EditorContext): string {
  const parts: string[] = [];

  parts.push('# Current Editor Context');
  parts.push('');
  parts.push(`**File:** ${context.fileName}`);
  parts.push(`**Path:** ${context.filePath}`);
  parts.push(`**Language:** ${context.language}`);
  parts.push(`**Lines:** ${context.lineCount}`);
  
  if (context.hasUnsavedChanges) {
    parts.push(`**Status:** ⚠️ Unsaved changes`);
  }
  
  if (context.cursorPosition) {
    parts.push(`**Cursor:** Line ${context.cursorPosition.line}, Column ${context.cursorPosition.column}`);
  }
  
  parts.push('');

  // Include selected text if available
  if (context.selectedText && context.selectedText.trim().length > 0) {
    parts.push('## Selected Code');
    parts.push('```' + context.language);
    parts.push(context.selectedText);
    parts.push('```');
    parts.push('');
  }

  // Include full content
  parts.push('## Full File Content');
  parts.push('```' + context.language);
  parts.push(context.content);
  parts.push('```');
  parts.push('');

  return parts.join('\n');
}

// ============================================================================
// FORMAT EDITOR CONTEXT COMPACT (EXPORTED)
// ============================================================================

export function formatEditorContextCompact(context: EditorContext): string {
  const parts: string[] = [];

  parts.push(`📄 **File:** \`${context.fileName}\``);
  parts.push(`🔤 **Language:** ${context.language}`);
  parts.push(`📏 **Lines:** ${context.lineCount}`);
  
  if (context.selectedText) {
    const selectedLines = context.selectedText.split('\n').length;
    parts.push(`✂️ **Selected:** ${selectedLines} line(s)`);
  }
  
  if (context.cursorPosition) {
    parts.push(`📍 **Cursor:** Line ${context.cursorPosition.line}`);
  }

  return parts.join(' • ');
}

// ============================================================================
// GET RELEVANT CODE SNIPPET (EXPORTED)
// ============================================================================

export function getRelevantCodeSnippet(context: EditorContext, linesAround: number = 10): string {
  if (!context.cursorPosition) {
    return context.content;
  }

  const lines = context.content.split('\n');
  const currentLine = context.cursorPosition.line - 1; // 0-indexed
  
  const startLine = Math.max(0, currentLine - linesAround);
  const endLine = Math.min(lines.length, currentLine + linesAround + 1);
  
  const snippet = lines.slice(startLine, endLine);
  
  const parts: string[] = [];
  parts.push(`\`\`\`${context.language}`);
  
  // Add line numbers
  for (let i = 0; i < snippet.length; i++) {
    const lineNum = startLine + i + 1;
    const isCurrentLine = lineNum === context.cursorPosition.line;
    const marker = isCurrentLine ? '→' : ' ';
    parts.push(`${marker} ${lineNum.toString().padStart(4, ' ')} | ${snippet[i]}`);
  }
  
  parts.push('```');
  
  return parts.join('\n');
}

// ============================================================================
// AUTO-DETECT CONTEXT MODE (EXPORTED)
// ============================================================================

export enum ContextMode {
  NONE = 'none',           // Don't include file context
  COMPACT = 'compact',     // Just file info (name, language, lines)
  SNIPPET = 'snippet',     // Include code around cursor
  SELECTED = 'selected',   // Only selected text
  FULL = 'full'           // Full file content
}

export function detectContextMode(userMessage: string, context: EditorContext): ContextMode {
  const message = userMessage.toLowerCase();
  
  // ============================================================================
  // ABSOLUTE RULE: If ANYTHING is selected, ONLY use that selection
  // This overrides ALL other rules - no exceptions!
  // ============================================================================
  if (context.selectedText && context.selectedText.trim().length > 0) {
    console.log('🎯 Mode: SELECTED (ABSOLUTE - user has text selected, ignoring all other rules)');
    console.log('   Selected:', context.selectedText.length, 'chars,', context.selectedText.split('\n').length, 'lines');
    console.log('   AI will ONLY see the selected code');
    return ContextMode.SELECTED;
  }
  
  // ============================================================================
  // Only check other modes if NOTHING is selected
  // ============================================================================
  
  console.log('ℹ️ No selection detected, checking other modes...');
  
  // Check for explicit file requests
  if (message.includes('entire file') || message.includes('whole file') || message.includes('full file')) {
    console.log('📄 Mode: FULL (explicit full file request)');
    return ContextMode.FULL;
  }
  
  if (message.includes('around cursor') || message.includes('this area')) {
    console.log('📍 Mode: SNIPPET (cursor area request)');
    return ContextMode.SNIPPET;
  }
  
  // Check for code-related questions
  const codeKeywords = [
    'what does', 'how does', 'explain', 'why', 'what is',
    'fix', 'debug', 'error', 'bug', 'issue', 'problem',
    'refactor', 'improve', 'optimize', 'change',
    'add', 'create', 'implement', 'write',
    'this function', 'this class', 'this variable',
    'security', 'remove', 'delete', 'enhance',
    // NEW: Keywords for requesting code output
    'provide', 'give me', 'show me', 'generate', 'make',
    'full code', 'complete code', 'the code', 'my code',
    'update', 'modify', 'edit', 'rewrite', 'convert',
    'line', 'function', 'class', 'method', 'component',
    'comment', 'import', 'export', 'return', 'variable',
    // Code actions
    'move', 'rename', 'extract', 'inline', 'merge', 'split',
    'format', 'lint', 'type', 'interface', 'async', 'await'
  ];
  
  const needsContext = codeKeywords.some(keyword => message.includes(keyword));
  
  if (needsContext) {
    if (context.lineCount < 300) {
      console.log('📄 Mode: FULL (small/medium file + code question)');
      return ContextMode.FULL;
    }
    if (context.lineCount < 1000) {
      console.log('📍 Mode: SNIPPET (large file + code question)');
      return ContextMode.SNIPPET;
    }
    console.log('📋 Mode: COMPACT (very large file)');
    return ContextMode.COMPACT;
  }
  
  console.log('📋 Mode: COMPACT (generic question)');
  return ContextMode.COMPACT;
}

// ============================================================================
// BUILD CONTEXT STRING (EXPORTED)
// ============================================================================

export function buildContextString(context: EditorContext, mode: ContextMode): string {
  switch (mode) {
    case ContextMode.NONE:
      return '';
    
    case ContextMode.COMPACT:
      return formatEditorContextCompact(context);
    
    case ContextMode.SNIPPET:
      return `# Current File Context\n\n` +
             `${formatEditorContextCompact(context)}\n\n` +
             `## Code Around Cursor\n${getRelevantCodeSnippet(context)}`;
    
    case ContextMode.SELECTED:
      return `# Current File Context\n\n` +
             `${formatEditorContextCompact(context)}\n\n` +
             `## Selected Code\n\`\`\`${context.language}\n${context.selectedText}\n\`\`\``;
    
    case ContextMode.FULL:
      return formatEditorContextForAI(context);
    
    default:
      return formatEditorContextCompact(context);
  }
}

// ============================================================================
// MAIN FUNCTION: Get Context for AI Message (EXPORTED)
// ============================================================================

export function getEditorContextForAI(userMessage: string): string {
  const context = getCurrentEditorContext();
  
  if (!context) {
    console.log('ℹ️ No editor context available');
    return '';
  }
  
  // Auto-detect what context to include
  const mode = detectContextMode(userMessage, context);
  
  console.log(`📋 Using context mode: ${mode}`);
  
  return buildContextString(context, mode);
}