// clarificationManager.ts - Detects ambiguous queries and manages clarifications

import { contextManager } from './contextManager';
import { conversationManager } from './conversationManager';
import { getCurrentEditorContext } from './editorContextCapture';

// ============================================================================
// TYPES
// ============================================================================

export interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  context: string;
}

export interface ClarificationRequest {
  originalMessage: string;
  question: string;
  options: ClarificationOption[];
  timestamp: number;
}

// ============================================================================
// AMBIGUITY PATTERNS
// ============================================================================

const AMBIGUOUS_PATTERNS = [
  // Code-related ambiguity
  {
    pattern: /what (is|are) (the|this|that) code/i,
    type: 'code_reference'
  },
  {
    pattern: /show (me )?(the )?code/i,
    type: 'code_reference'
  },
  {
    pattern: /fix (the |this |that )?code/i,
    type: 'code_reference'
  },
  {
    pattern: /update (the |this |that )?code/i,
    type: 'code_reference'
  },
  {
    pattern: /change (the |this |that )?code/i,
    type: 'code_reference'
  },
  
  // File-related ambiguity
  {
    pattern: /in (the |this |that )?file/i,
    type: 'file_reference'
  },
  {
    pattern: /what (is|are) (in |the )file/i,
    type: 'file_reference'
  },
  
  // Function/method ambiguity
  {
    pattern: /what (does|is) (the |this |that )?function/i,
    type: 'function_reference'
  },
  {
    pattern: /fix (the |this |that )?function/i,
    type: 'function_reference'
  },
  
  // Bug/error ambiguity
  {
    pattern: /fix (the |this |that )?bug/i,
    type: 'bug_reference'
  },
  {
    pattern: /fix (the |this |that )?error/i,
    type: 'error_reference'
  },
  {
    pattern: /what('s| is) (the |this |that )?error/i,
    type: 'error_reference'
  },
  
  // Component ambiguity
  {
    pattern: /create (a |an |the )?component/i,
    type: 'create_component'
  },
  {
    pattern: /add (a |an |the )?component/i,
    type: 'create_component'
  },
  
  // General "it" references
  {
    pattern: /fix it/i,
    type: 'pronoun_reference'
  },
  {
    pattern: /change it/i,
    type: 'pronoun_reference'
  },
  {
    pattern: /update it/i,
    type: 'pronoun_reference'
  },
  {
    pattern: /how (does|do) (it|this|that) work/i,
    type: 'pronoun_reference'
  }
];

// ============================================================================
// CLARIFICATION DETECTION
// ============================================================================

export function detectAmbiguity(message: string): ClarificationRequest | null {
  try {
    const trimmedMessage = message.trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    
    // Quick check for empty message
    if (!trimmedMessage || trimmedMessage.length === 0) {
      console.log('❌ detectAmbiguity: Empty message received');
      return null;
    }
    
    // Quick triggers - single character shortcuts
    if (lowerMessage === '?' || lowerMessage === '??') {
      console.log('✅ detectAmbiguity: Quick trigger detected:', lowerMessage);
      return buildClarificationRequest(trimmedMessage, 'code_reference');
    }
    
    // Check if message matches any ambiguous pattern
    for (const { pattern, type } of AMBIGUOUS_PATTERNS) {
      // Test against original message for proper regex matching with /i flag
      if (pattern.test(trimmedMessage)) {
        console.log('✅ detectAmbiguity: Pattern matched:', type, 'for message:', trimmedMessage.substring(0, 50));
        return buildClarificationRequest(trimmedMessage, type);
      }
    }
    
    console.log('ℹ️ detectAmbiguity: No ambiguity detected for:', trimmedMessage.substring(0, 50));
    return null;
  } catch (error) {
    console.error('❌ detectAmbiguity error:', error);
    return null;
  }
}

function buildClarificationRequest(
  message: string, 
  ambiguityType: string
): ClarificationRequest | null {
  
  try {
    const context = contextManager.getContextSummary();
    
    console.log(`🔍 Building clarification for type: ${ambiguityType}`);
    
    switch (ambiguityType) {
      case 'code_reference':
        return buildCodeClarification(message, context);
        
      case 'file_reference':
        return buildFileClarification(message, context);
        
      case 'function_reference':
        return buildFunctionClarification(message, context);
        
      case 'bug_reference':
      case 'error_reference':
        return buildErrorClarification(message, context);
        
      case 'create_component':
        return buildCreateClarification(message, context);
        
      case 'pronoun_reference':
        return buildPronounClarification(message, context);
        
      default:
        console.warn(`⚠️ Unknown ambiguity type: ${ambiguityType}`);
        return null;
    }
  } catch (error) {
    console.error('❌ buildClarificationRequest error:', error);
    // Return a basic clarification request as fallback
    return {
      originalMessage: message,
      question: 'What are you referring to?',
      options: [
        {
          id: 'custom_input',
          label: 'Let me specify...',
          description: 'Type your clarification',
          context: 'Custom input'
        }
      ],
      timestamp: Date.now()
    };
  }
}

// ============================================================================
// SPECIFIC CLARIFICATION BUILDERS
// ============================================================================

function buildCodeClarification(message: string, context: any): ClarificationRequest | null {
  const options: ClarificationOption[] = [];
  
  // ========================================================================
  // GET CURRENT EDITOR CONTEXT (reuse existing function!)
  // ========================================================================
  let currentFile: any = null;
  
  try {
    const editorContext = getCurrentEditorContext();
    
    if (editorContext) {
      currentFile = {
        name: editorContext.fileName,
        path: editorContext.filePath,
        language: editorContext.language,
        lineCount: editorContext.lineCount
      };
      console.log('✅ Got file context for clarification:', currentFile.name);
    } else {
      console.log('⚠️ No editor context available');
    }
  } catch (error) {
    console.error('❌ Failed to get editor context:', error);
  }
  
  // ========================================================================
  // BUILD OPTIONS BASED ON AVAILABLE CONTEXT
  // ========================================================================
  
  // Option 1: Code visible in IDE
  if (currentFile) {
    options.push({
      id: 'visible_code',
      label: `Code visible in IDE`,
      description: `Analyze the code currently visible in the editor`,
      context: `Visible code in ${currentFile.name}`
    });
  }
  
  // Option 2: Entire current file
  if (currentFile) {
    options.push({
      id: 'current_file',
      label: `Entire file: ${currentFile.name}`,
      description: `Analyze the complete file currently open (${currentFile.lineCount} lines)`,
      context: `File: ${currentFile.name}, Language: ${currentFile.language}`
    });
  }
  
  // Option 3: Recently modified files (from context manager)
  try {
    if (context?.recentlyModifiedFiles && context.recentlyModifiedFiles.length > 0) {
      const recentFiles = context.recentlyModifiedFiles.slice(0, 2);
      recentFiles.forEach((file: any) => {
        options.push({
          id: `recent_${file.name}`,
          label: `Code in ${file.name}`,
          description: `Analyze recently modified file`,
          context: `File: ${file.name}, Last modified: ${new Date(file.lastModified).toLocaleTimeString()}`
        });
      });
    }
  } catch (error) {
    console.error('❌ Error processing recent files:', error);
  }
  
  // Option 4: Code from conversation
  try {
    const recentMessages = conversationManager.getRecentMessages(5);
    const hasCodeInConversation = recentMessages.some(m => 
      m.content.includes('```') || m.content.includes('function') || m.content.includes('class')
    );
    
    if (hasCodeInConversation) {
      options.push({
        id: 'conversation_code',
        label: 'Code we discussed earlier',
        description: 'Reference code from our conversation',
        context: 'Code mentioned in recent messages'
      });
    }
  } catch (error) {
    console.error('❌ Error checking conversation for code:', error);
  }
  
  // Option 5: Create new code (ALWAYS AVAILABLE)
  options.push({
    id: 'create_new',
    label: 'Create new code',
    description: 'Generate new code based on your requirements',
    context: 'I will create fresh code for you'
  });
  
  // Option 6: Custom input (ALWAYS AVAILABLE)
  options.push({
    id: 'custom_input',
    label: 'Let me specify...',
    description: 'Type your own clarification',
    context: 'Custom clarification'
  });
  
  // This should never happen now since we always add options 5 & 6
  if (options.length === 0) {
    console.error('❌ No clarification options generated!');
    return null;
  }
  
  console.log(`✅ Generated ${options.length} clarification options`);
  
  return {
    originalMessage: message,
    question: 'Which code are you referring to?',
    options,
    timestamp: Date.now()
  };
}

function buildFileClarification(message: string, context: any): ClarificationRequest | null {
  const options: ClarificationOption[] = [];
  
  // Get current file from editor
  let currentFile: any = null;
  try {
    const editorContext = getCurrentEditorContext();
    if (editorContext) {
      currentFile = {
        name: editorContext.fileName,
        path: editorContext.filePath
      };
    }
  } catch (error) {
    console.error('Failed to get editor context:', error);
  }
  
  if (currentFile) {
    options.push({
      id: 'current_file',
      label: currentFile.name,
      description: 'Currently open file in editor',
      context: `File: ${currentFile.name}`
    });
  }
  
  if (context.recentlyModifiedFiles && context.recentlyModifiedFiles.length > 0) {
    context.recentlyModifiedFiles.slice(0, 4).forEach((file: any) => {
      options.push({
        id: `file_${file.name}`,
        label: file.name,
        description: 'Recently modified file',
        context: `File: ${file.name}`
      });
    });
  }
  
  // Custom input option
  options.push({
    id: 'custom_input',
    label: 'Let me specify...',
    description: 'Type the filename',
    context: 'Custom filename'
  });
  
  if (options.length === 0) return null;
  
  return {
    originalMessage: message,
    question: 'Which file are you referring to?',
    options,
    timestamp: Date.now()
  };
}

function buildFunctionClarification(message: string, context: any): ClarificationRequest | null {
  const options: ClarificationOption[] = [];
  
  // Try to extract function names from current file or recent conversation
  const recentMessages = conversationManager.getRecentMessages(5);
  const functionNames = new Set<string>();
  
  recentMessages.forEach(m => {
    const matches = m.content.match(/function\s+(\w+)/g);
    if (matches) {
      matches.forEach(match => {
        const name = match.replace('function ', '').trim();
        functionNames.add(name);
      });
    }
  });
  
  if (context.currentFile && context.currentFile.functions) {
    context.currentFile.functions.forEach((fn: string) => functionNames.add(fn));
  }
  
  if (functionNames.size > 0) {
    Array.from(functionNames).slice(0, 5).forEach(name => {
      options.push({
        id: `function_${name}`,
        label: `${name}()`,
        description: `Reference to ${name} function`,
        context: `Function: ${name}`
      });
    });
  }
  
  options.push({
    id: 'create_new_function',
    label: 'Create new function',
    description: 'Generate a new function',
    context: 'Create fresh function'
  });
  
  // Custom input option
  options.push({
    id: 'custom_input',
    label: 'Let me specify...',
    description: 'Type the function name',
    context: 'Custom function name'
  });
  
  if (options.length === 0) return null;
  
  return {
    originalMessage: message,
    question: 'Which function are you referring to?',
    options,
    timestamp: Date.now()
  };
}

function buildErrorClarification(message: string, context: any): ClarificationRequest | null {
  const options: ClarificationOption[] = [];
  
  // Check console for recent errors
  const recentMessages = conversationManager.getRecentMessages(10);
  const errorsInConversation = recentMessages.filter(m => 
    m.content.toLowerCase().includes('error') || 
    m.content.toLowerCase().includes('exception')
  );
  
  if (errorsInConversation.length > 0) {
    options.push({
      id: 'conversation_error',
      label: 'Error we discussed',
      description: 'Reference to error mentioned in conversation',
      context: 'Recent error from our discussion'
    });
  }
  
  // Get current file from editor
  let currentFile: any = null;
  try {
    const editorContext = getCurrentEditorContext();
    if (editorContext) {
      currentFile = { name: editorContext.fileName };
    }
  } catch (error) {
    console.error('Failed to get editor context:', error);
  }
  
  if (currentFile) {
    options.push({
      id: 'current_file_error',
      label: `Error in ${currentFile.name}`,
      description: 'Debug current file for errors',
      context: `File: ${currentFile.name}`
    });
  }
  
  options.push({
    id: 'describe_error',
    label: 'Let me describe the error',
    description: 'I will provide error details',
    context: 'Provide error information'
  });
  
  // Custom input option
  options.push({
    id: 'custom_input',
    label: 'Let me specify...',
    description: 'Type the error details',
    context: 'Custom error description'
  });
  
  if (options.length === 0) return null;
  
  return {
    originalMessage: message,
    question: 'Which error are you referring to?',
    options,
    timestamp: Date.now()
  };
}

function buildCreateClarification(message: string, context: any): ClarificationRequest | null {
  // Get current file from editor
  let currentFile: any = null;
  try {
    const editorContext = getCurrentEditorContext();
    if (editorContext) {
      currentFile = { name: editorContext.fileName };
    }
  } catch (error) {
    console.error('Failed to get editor context:', error);
  }
  
  const options: ClarificationOption[] = [
    {
      id: 'new_file',
      label: 'Create in new file',
      description: 'Generate component in a new file',
      context: 'Create new file for component'
    },
    {
      id: 'current_file',
      label: currentFile ? `Add to ${currentFile.name}` : 'Add to current file',
      description: 'Add component to existing file',
      context: currentFile ? `File: ${currentFile.name}` : 'Current file'
    },
    {
      id: 'just_show',
      label: 'Just show me the code',
      description: 'Display code without creating file',
      context: 'Show code only'
    },
    {
      id: 'custom_input',
      label: 'Let me specify...',
      description: 'Type custom location or details',
      context: 'Custom specification'
    }
  ];
  
  return {
    originalMessage: message,
    question: 'Where should I create this component?',
    options,
    timestamp: Date.now()
  };
}

function buildPronounClarification(message: string, context: any): ClarificationRequest | null {
  const options: ClarificationOption[] = [];
  const recentMessages = conversationManager.getRecentMessages(3);
  
  // Extract subjects from recent messages
  recentMessages.forEach((msg, idx) => {
    if (msg.role === 'assistant' && idx < 2) {
      // Try to extract what was discussed
      const subjects = extractSubjects(msg.content);
      subjects.forEach(subject => {
        options.push({
          id: `recent_${idx}_${subject}`,
          label: subject,
          description: `From recent discussion`,
          context: `Mentioned ${3 - idx} message(s) ago`
        });
      });
    }
  });
  
  // Get current file from editor
  let currentFile: any = null;
  try {
    const editorContext = getCurrentEditorContext();
    if (editorContext) {
      currentFile = { name: editorContext.fileName };
    }
  } catch (error) {
    console.error('Failed to get editor context:', error);
  }
  
  if (currentFile) {
    options.push({
      id: 'current_file',
      label: currentFile.name,
      description: 'Current file in editor',
      context: `File: ${currentFile.name}`
    });
  }
  
  // Custom input option
  options.push({
    id: 'custom_input',
    label: 'Let me specify...',
    description: 'Type what you mean',
    context: 'Custom clarification'
  });
  
  if (options.length === 0) return null;
  
  return {
    originalMessage: message,
    question: 'What are you referring to?',
    options: options.slice(0, 6),
    timestamp: Date.now()
  };
}

function extractSubjects(content: string): string[] {
  const subjects: string[] = [];
  
  // Extract function names
  const functionMatches = content.match(/`(\w+)\(\)`/g);
  if (functionMatches) {
    functionMatches.forEach(match => {
      subjects.push(match.replace(/`/g, ''));
    });
  }
  
  // Extract file names
  const fileMatches = content.match(/`(\w+\.\w+)`/g);
  if (fileMatches) {
    fileMatches.forEach(match => {
      subjects.push(match.replace(/`/g, ''));
    });
  }
  
  // Extract code keywords
  const keywords = ['function', 'component', 'class', 'interface', 'error', 'bug'];
  keywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) {
      const regex = new RegExp(`the (\\w+) ${keyword}`, 'i');
      const match = content.match(regex);
      if (match) {
        subjects.push(`${match[1]} ${keyword}`);
      }
    }
  });
  
  return [...new Set(subjects)];
}

// ============================================================================
// CLARIFICATION LEARNING
// ============================================================================

interface ClarificationChoice {
  originalMessage: string;
  selectedOption: string;
  timestamp: number;
}

const clarificationHistory: ClarificationChoice[] = [];
const MAX_HISTORY = 50;

export function recordClarificationChoice(
  originalMessage: string,
  selectedOption: string
): void {
  clarificationHistory.unshift({
    originalMessage,
    selectedOption,
    timestamp: Date.now()
  });
  
  if (clarificationHistory.length > MAX_HISTORY) {
    clarificationHistory.pop();
  }
  
  // Store in localStorage
  try {
    localStorage.setItem('clarification_history', JSON.stringify(clarificationHistory));
  } catch (e) {
    console.error('Failed to save clarification history:', e);
  }
  
  console.log('📝 Recorded clarification choice:', selectedOption);
}

export function getClarificationPatterns(): Map<string, string> {
  const patterns = new Map<string, string>();
  
  clarificationHistory.forEach(choice => {
    patterns.set(choice.originalMessage.toLowerCase(), choice.selectedOption);
  });
  
  return patterns;
}

// ============================================================================
// EXPORT
// ============================================================================

export const clarificationManager = {
  detectAmbiguity,
  recordClarificationChoice,
  getClarificationPatterns
};