// autonomousCoding/autoApply/codeBlockParser.ts
// ============================================================================
// CODE BLOCK PARSER - Extract code and file annotations from AI responses
// ============================================================================

import type { CodeBlockInfo, FileAnnotation, ApplyAction } from './types';

console.log('📝 [CodeBlockParser] Loading...');

// ============================================================================
// FILE ANNOTATION PATTERNS
// ============================================================================

/**
 * Patterns to detect file annotations in code comments
 * Supports multiple comment styles and formats
 */
const FILE_ANNOTATION_PATTERNS = [
  // Standard patterns
  /^(?:\/\/|#|--|\/\*)\s*file:\s*(.+?)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*filename:\s*(.+?)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*path:\s*(.+?)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*target:\s*(.+?)(?:\s*\*\/)?$/i,
  
  // With @ prefix
  /^(?:\/\/|#|--|\/\*)\s*@file\s+(.+?)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*@filename\s+(.+?)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*@path\s+(.+?)(?:\s*\*\/)?$/i,
  
  // Markdown style
  /^<!--\s*file:\s*(.+?)\s*-->$/i,
  /^<!--\s*filename:\s*(.+?)\s*-->$/i,
  
  // JSDoc style
  /^\s*\*\s*@file\s+(.+?)$/i,
  /^\s*\*\s*@filename\s+(.+?)$/i,
  
  // Simple formats (no keyword, just path-like string in comment)
  /^(?:\/\/|#)\s*([\w\-\.\/\\]+\.\w+)\s*$/,
];

/**
 * Patterns to detect action hints in code comments
 */
const ACTION_ANNOTATION_PATTERNS = [
  /^(?:\/\/|#|--|\/\*)\s*action:\s*(replace|insert|append|prepend|create|patch|merge)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*@action\s+(replace|insert|append|prepend|create|patch|merge)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*mode:\s*(replace|insert|append|prepend|create|patch|merge)(?:\s*\*\/)?$/i,
];

/**
 * Patterns to detect line range hints
 */
const LINE_RANGE_PATTERNS = [
  /^(?:\/\/|#|--|\/\*)\s*lines?:\s*(\d+)\s*-\s*(\d+)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*@lines?\s+(\d+)\s*-\s*(\d+)(?:\s*\*\/)?$/i,
  /^(?:\/\/|#|--|\/\*)\s*range:\s*(\d+)\s*-\s*(\d+)(?:\s*\*\/)?$/i,
];

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Common language aliases and their canonical names
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'jsx': 'javascript',
  'py': 'python',
  'rb': 'ruby',
  'rs': 'rust',
  'cs': 'csharp',
  'c#': 'csharp',
  'c++': 'cpp',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'dockerfile': 'docker',
  'kt': 'kotlin',
  'swift': 'swift',
  'go': 'golang',
};

/**
 * File extension to language mapping
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  'ts': 'typescript',
  'tsx': 'typescript',
  'js': 'javascript',
  'jsx': 'javascript',
  'py': 'python',
  'rs': 'rust',
  'go': 'go',
  'java': 'java',
  'kt': 'kotlin',
  'swift': 'swift',
  'rb': 'ruby',
  'php': 'php',
  'cs': 'csharp',
  'cpp': 'cpp',
  'c': 'c',
  'h': 'c',
  'hpp': 'cpp',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'md': 'markdown',
  'sql': 'sql',
  'sh': 'bash',
  'bash': 'bash',
  'ps1': 'powershell',
  'vue': 'vue',
  'svelte': 'svelte',
};

// ============================================================================
// EXTRACT FILE ANNOTATION
// ============================================================================

/**
 * Extract file annotation from code block
 */
export function extractFileAnnotation(code: string): FileAnnotation | null {
  const lines = code.split('\n');
  
  // Check first 10 lines for annotations
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    for (const pattern of FILE_ANNOTATION_PATTERNS) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const filename = match[1].trim();
        
        // Validate it looks like a filename
        if (filename && /[\w\-\.\/\\]+\.\w+/.test(filename)) {
          return {
            filename: filename.split(/[\/\\]/).pop() || filename,
            fullPath: filename.includes('/') || filename.includes('\\') ? filename : undefined,
            pattern: pattern.source,
            lineNumber: i + 1,
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract action hint from code block
 */
export function extractActionAnnotation(code: string): ApplyAction | null {
  const lines = code.split('\n');
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    for (const pattern of ACTION_ANNOTATION_PATTERNS) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const action = match[1].toLowerCase();
        if (['replace', 'insert', 'append', 'prepend', 'create', 'patch'].includes(action)) {
          return action as ApplyAction;
        }
        if (action === 'merge') {
          return 'smart-merge';
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract line range hint from code block
 */
export function extractLineRange(code: string): { start: number; end: number } | null {
  const lines = code.split('\n');
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    for (const pattern of LINE_RANGE_PATTERNS) {
      const match = line.match(pattern);
      if (match && match[1] && match[2]) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          return { start, end };
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// DETECT LANGUAGE
// ============================================================================

/**
 * Detect language from code element class or content
 */
export function detectLanguage(codeEl: Element | null, code: string): string {
  // 1. Try from class name
  if (codeEl) {
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      const lang = langMatch[1].toLowerCase();
      return LANGUAGE_ALIASES[lang] || lang;
    }
  }
  
  // 2. Try from header element
  const header = codeEl?.closest('.muf-block, .cbe-wrapper')?.querySelector('.muf-lang-name, .cbe-lang');
  if (header?.textContent) {
    const lang = header.textContent.toLowerCase().trim();
    return LANGUAGE_ALIASES[lang] || lang;
  }
  
  // 3. Detect from code content
  return detectLanguageFromContent(code);
}

/**
 * Detect language from code content
 */
export function detectLanguageFromContent(code: string): string {
  // TypeScript indicators
  if (/:\s*(string|number|boolean|void|any|unknown|never)\b/.test(code) ||
      /interface\s+\w+/.test(code) ||
      /type\s+\w+\s*=/.test(code) ||
      /<\w+>/.test(code) && /:\s*\w+/.test(code)) {
    return 'typescript';
  }
  
  // JavaScript indicators
  if (/(?:const|let|var)\s+\w+\s*=/.test(code) ||
      /function\s+\w+\s*\(/.test(code) ||
      /=>\s*\{/.test(code) ||
      /document\.|window\.|console\./.test(code)) {
    return 'javascript';
  }
  
  // Python indicators
  if (/^def\s+\w+\s*\(/m.test(code) ||
      /^class\s+\w+.*:/m.test(code) ||
      /^import\s+\w+/m.test(code) && !/{/.test(code) ||
      /:\s*$/m.test(code.split('\n')[0] || '')) {
    return 'python';
  }
  
  // Rust indicators
  if (/^fn\s+\w+/m.test(code) ||
      /^(?:pub\s+)?(?:struct|enum|impl|trait)\s+/m.test(code) ||
      /let\s+(?:mut\s+)?\w+/.test(code)) {
    return 'rust';
  }
  
  // Go indicators
  if (/^package\s+\w+/m.test(code) ||
      /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?\w+/m.test(code) ||
      /^import\s+\(/.test(code)) {
    return 'go';
  }
  
  // HTML indicators
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|script|style)\b/i.test(code)) {
    return 'html';
  }
  
  // CSS indicators
  if (/\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}/.test(code) &&
      /(color|background|margin|padding|display|flex|grid):/.test(code)) {
    return 'css';
  }
  
  // JSON indicators
  if (/^\s*\{[\s\S]*"[\w-]+"[\s\S]*:[\s\S]*\}\s*$/m.test(code)) {
    return 'json';
  }
  
  // Bash indicators
  if (/^(#!\/bin\/(ba)?sh|npm|yarn|pip|apt|brew|cd|ls|mkdir|rm|cp|mv|echo|export)\b/m.test(code)) {
    return 'bash';
  }
  
  return 'plaintext';
}

// ============================================================================
// PARSE CODE BLOCKS
// ============================================================================

/**
 * Parse all code blocks in a container
 */
export function parseCodeBlocks(container?: Element): CodeBlockInfo[] {
  const root = container || document;
  const blocks = root.querySelectorAll('.muf-block, .cbe-wrapper, pre:not([data-parsed])');
  
  const results: CodeBlockInfo[] = [];
  
  blocks.forEach((block, index) => {
    const info = parseCodeBlock(block as HTMLElement);
    if (info) {
      results.push(info);
    }
  });
  
  return results;
}

/**
 * Parse a single code block
 */
export function parseCodeBlock(block: HTMLElement): CodeBlockInfo | null {
  // Find code element
  const codeEl = block.querySelector('code') || block.querySelector('.muf-code');
  if (!codeEl) return null;
  
  // Get raw code
  let code = '';
  const rawCode = block.getAttribute('data-raw-code');
  if (rawCode) {
    try {
      code = decodeURIComponent(rawCode);
    } catch {
      code = codeEl.textContent || '';
    }
  } else {
    code = codeEl.textContent || '';
  }
  
  code = code.trim();
  if (!code) return null;
  
  // Detect language
  const language = detectLanguage(codeEl, code);
  
  // Extract annotations
  const fileAnnotation = extractFileAnnotation(code);
  const actionAnnotation = extractActionAnnotation(code);
  const lineRange = extractLineRange(code);
  
  // Generate unique ID
  const id = `acb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Determine action
  let action: ApplyAction = 'replace';
  if (actionAnnotation) {
    action = actionAnnotation;
  } else if (fileAnnotation && !fileAnnotation.fullPath) {
    // If just filename without path, might be creating new file
    action = 'replace';
  }
  
  return {
    id,
    element: block,
    code,
    language,
    filename: fileAnnotation?.filename || null,
    filepath: fileAnnotation?.fullPath || null,
    action,
    lineRange: lineRange || undefined,
    timestamp: Date.now(),
  };
}

/**
 * Remove annotation comments from code
 */
export function stripAnnotations(code: string): string {
  const lines = code.split('\n');
  const cleanLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this line is an annotation
    let isAnnotation = false;
    
    const allPatterns = [
      ...FILE_ANNOTATION_PATTERNS,
      ...ACTION_ANNOTATION_PATTERNS,
      ...LINE_RANGE_PATTERNS,
    ];
    
    for (const pattern of allPatterns) {
      if (pattern.test(trimmed)) {
        isAnnotation = true;
        break;
      }
    }
    
    if (!isAnnotation) {
      cleanLines.push(line);
    }
  }
  
  // Remove leading empty lines
  while (cleanLines.length > 0 && cleanLines[0].trim() === '') {
    cleanLines.shift();
  }
  
  return cleanLines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FILE_ANNOTATION_PATTERNS,
  ACTION_ANNOTATION_PATTERNS,
  LINE_RANGE_PATTERNS,
  LANGUAGE_ALIASES,
  EXTENSION_TO_LANGUAGE,
  detectLanguageFromContent,
};
