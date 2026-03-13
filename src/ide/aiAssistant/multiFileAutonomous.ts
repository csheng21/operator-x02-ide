// multiFileAutonomous.ts - Enhanced Multi-File Sequential Auto-Apply System
// Version 1.1 - WITH TAB CREATION FIX
// ============================================================================
//
// MULTI-FILE AUTONOMOUS CODING SYSTEM
// 
// When user asks: "Update App.tsx and main.tsx"
// AI responds with code for multiple files
// System automatically:
// 1. Detects all mentioned files from AI message
// 2. Opens first file (App.tsx) in editor tab
// 3. Applies code for that file
// 4. Opens next file (main.tsx) in editor tab  
// 5. Applies code for that file
// 6. Shows batch confirmation for all changes
//
// v1.1 FIX: Uses window.openFileInTab to ensure tabs are created
//
// ============================================================================

import { showNotification } from './fileSystem';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FileUpdateTask {
  fileName: string;
  filePath?: string;
  code: string;
  language: string;
  blockElement?: HTMLElement;
  status: 'pending' | 'opening' | 'applying' | 'applied' | 'error' | 'skipped';
  error?: string;
  originalContent?: string;
  lineCount?: number;
}

interface MultiFileSession {
  id: string;
  tasks: FileUpdateTask[];
  currentIndex: number;
  status: 'idle' | 'scanning' | 'processing' | 'awaiting-confirmation' | 'complete' | 'cancelled';
  startTime: number;
  aiMessageElement?: HTMLElement;
  aiMessageId?: string;
}

interface FileQueueProgress {
  current: number;
  total: number;
  currentFile: string;
  status: string;
}

interface CodeBlockInfo {
  code: string;
  language: string;
  targetFile: string | null;
  lineCount: number;
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentSession: MultiFileSession | null = null;
let isMultiFileEnabled = true;
let processedMessageIds: Set<string> = new Set();
let keyboardHandlerAttached = false;

// File extensions we care about
const FILE_EXTENSIONS = 'tsx?|jsx?|py|rs|css|scss|sass|less|cs|java|html|json|xml|vue|svelte|go|rb|php|kt|swift|cpp|hpp|c|h|md|yaml|yml|toml|sql|sh|bash|ps1';

// ============================================================================
// AI MESSAGE FILE DETECTION
// ============================================================================

/**
 * Pre-scan AI message text for file mentions BEFORE code blocks appear
 * This allows us to build the file queue early
 */
export function scanAIMessageForFiles(messageElement: HTMLElement): string[] {
  const messageText = messageElement.textContent || '';
  const detectedFiles: string[] = [];
  
  console.log(`🔍 [MultiFile] Scanning message text (${messageText.length} chars)...`);
  
  // Pattern 1: Explicit file mentions with action verbs
  // "I'll update App.tsx and main.tsx"
  // "Let me modify the config.json file"
  const actionPatterns = [
    new RegExp(`(?:update|modify|edit|change|fix|create|open|work on|updating|modifying|editing|changing|fixing|creating)\\s+(?:the\\s+)?["\`']?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))["\`']?`, 'gi'),
    new RegExp(`(?:for|in)\\s+["\`']?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))["\`']?`, 'gi'),
    new RegExp(`(?:here's|here is|this is)\\s+(?:the\\s+)?(?:updated\\s+)?["\`']?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))["\`']?`, 'gi'),
  ];
  
  // Pattern 2: File lists with "and" connector
  // "update App.tsx and main.tsx"
  // "App.tsx, main.tsx, and index.css"
  const listPattern = new RegExp(`([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))(?:\\s+and\\s+|,\\s*|\\s*&\\s*)([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))`, 'gi');
  
  // Pattern 3: Backtick-wrapped filenames (common in AI responses)
  const backtickPattern = new RegExp(`\`([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))\``, 'gi');
  
  // Pattern 4: Bold or emphasized filenames
  // **App.tsx** or *main.tsx*
  const emphasisPattern = new RegExp(`\\*\\*?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))\\*\\*?`, 'gi');
  
  // Pattern 5: Numbered/bulleted file lists
  // "1. App.tsx" or "- main.tsx"
  const listItemPattern = new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.|[-•*])\\s*["\`']?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))["\`']?`, 'gi');
  
  // Pattern 6: Colon-prefixed (label style)
  // "App.tsx:" or "File: main.tsx"
  const labelPattern = new RegExp(`(?:^|\\n|\\s)([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))\\s*:`, 'gi');
  
  // Pattern 7: Heading patterns (## Updated App.tsx)
  const headingPattern = new RegExp(`(?:##?#?\\s*(?:Updated?\\s+)?)?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))`, 'gi');
  
  // Extract files from all patterns
  let match: RegExpExecArray | null;
  
  for (const pattern of actionPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(messageText)) !== null) {
      if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
        detectedFiles.push(match[1]);
      }
    }
  }
  
  listPattern.lastIndex = 0;
  while ((match = listPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) detectedFiles.push(match[1]);
    if (match[2] && !isCommonConfigFile(match[2]) && !isTechnologyName(match[2])) detectedFiles.push(match[2]);
  }
  
  backtickPattern.lastIndex = 0;
  while ((match = backtickPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
      detectedFiles.push(match[1]);
    }
  }
  
  emphasisPattern.lastIndex = 0;
  while ((match = emphasisPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
      detectedFiles.push(match[1]);
    }
  }
  
  listItemPattern.lastIndex = 0;
  while ((match = listItemPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
      detectedFiles.push(match[1]);
    }
  }
  
  labelPattern.lastIndex = 0;
  while ((match = labelPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
      detectedFiles.push(match[1]);
    }
  }
  
  // Also check for heading patterns (## Updated App.tsx, ## main.tsx)
  headingPattern.lastIndex = 0;
  while ((match = headingPattern.exec(messageText)) !== null) {
    if (match[1] && !isCommonConfigFile(match[1]) && !isTechnologyName(match[1])) {
      detectedFiles.push(match[1]);
    }
  }
  
  // Deduplicate (case-insensitive) while preserving original casing
  const seen = new Map<string, string>();
  for (const file of detectedFiles) {
    const lower = file.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, file);
    }
  }
  
  const uniqueFiles = Array.from(seen.values());
  
  // Sort by order of appearance in message
  uniqueFiles.sort((a, b) => {
    const indexA = messageText.toLowerCase().indexOf(a.toLowerCase());
    const indexB = messageText.toLowerCase().indexOf(b.toLowerCase());
    return indexA - indexB;
  });
  
  if (uniqueFiles.length > 0) {
    console.log(`🔍 [MultiFile] Detected ${uniqueFiles.length} files in AI message:`, uniqueFiles);
  }
  
  return uniqueFiles;
}

/**
 * Check if file is a common config file that's often mentioned but not updated
 */
function isCommonConfigFile(fileName: string): boolean {
  const configFiles = [
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'tsconfig.json', 'jsconfig.json', 'vite.config.ts', 'vite.config.js',
    'webpack.config.js', 'webpack.config.ts', 'babel.config.js', 'babel.config.json',
    '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.prettierrc', '.prettierrc.js',
    'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js',
    'jest.config.js', 'jest.config.ts', 'vitest.config.ts',
    'cargo.toml', 'cargo.lock', 'requirements.txt', 'pyproject.toml',
    '.gitignore', '.dockerignore', 'dockerfile', 'docker-compose.yml',
    'readme.md', 'license', 'license.md', 'changelog.md'
  ];
  return configFiles.includes(fileName.toLowerCase());
}

/**
 * Check if a detected "filename" is actually a technology/framework name
 * These look like filenames but are actually technology references
 */
function isTechnologyName(fileName: string): boolean {
  const techNames = [
    // JavaScript frameworks/runtimes
    'node.js', 'react.js', 'vue.js', 'angular.js', 'next.js', 'nuxt.js',
    'express.js', 'nest.js', 'ember.js', 'backbone.js', 'meteor.js',
    'electron.js', 'three.js', 'd3.js', 'chart.js', 'p5.js', 'rx.js',
    'socket.io', 'deno.js', 'bun.js', 'jquery.js', 'lodash.js',
    'moment.js', 'axios.js', 'redux.js', 'mobx.js', 'svelte.js',
    // TypeScript
    'typescript.ts', 'deno.ts',
    // Other tech that might match
    'python.py', 'ruby.rb', 'rust.rs', 'golang.go', 'java.java',
    // Common false positives with capitalized names
    'Node.js', 'React.js', 'Vue.js', 'Angular.js', 'Next.js', 'Nuxt.js',
    'Express.js', 'Nest.js', 'Ember.js', 'Backbone.js', 'Three.js',
    'D3.js', 'Chart.js', 'Socket.io', 'Electron.js', 'jQuery.js'
  ];
  
  // Common words that get incorrectly parsed as filenames
  // e.g., "update all .tsx files" -> "all.tsx", "each .py file" -> "each.py"
  const commonWordFalsePositives = [
    'all.tsx', 'all.ts', 'all.jsx', 'all.js', 'all.py', 'all.css', 'all.json', 'all.html',
    'each.tsx', 'each.ts', 'each.jsx', 'each.js', 'each.py', 'each.css',
    'every.tsx', 'every.ts', 'every.jsx', 'every.js', 'every.py',
    'any.tsx', 'any.ts', 'any.jsx', 'any.js', 'any.py',
    'some.tsx', 'some.ts', 'some.jsx', 'some.js', 'some.py',
    'other.tsx', 'other.ts', 'other.jsx', 'other.js', 'other.py', 'other.css',
    'new.tsx', 'new.ts', 'new.jsx', 'new.js', 'new.py', 'new.css',
    'the.tsx', 'the.ts', 'the.jsx', 'the.js', 'the.py', 'the.css',
    'your.tsx', 'your.ts', 'your.jsx', 'your.js', 'your.py',
    'my.tsx', 'my.ts', 'my.jsx', 'my.js', 'my.py', 'my.css',
    'this.tsx', 'this.ts', 'this.jsx', 'this.js', 'this.py',
    'that.tsx', 'that.ts', 'that.jsx', 'that.js', 'that.py',
    'these.tsx', 'these.ts', 'these.jsx', 'these.js',
    'those.tsx', 'those.ts', 'those.jsx', 'those.js',
    'both.tsx', 'both.ts', 'both.jsx', 'both.js',
    'following.tsx', 'following.ts', 'following.jsx', 'following.js',
    'existing.tsx', 'existing.ts', 'existing.jsx', 'existing.js', 'existing.css',
    'updated.tsx', 'updated.ts', 'updated.jsx', 'updated.js', 'updated.css',
    'modified.tsx', 'modified.ts', 'modified.jsx', 'modified.js',
    'relevant.tsx', 'relevant.ts', 'relevant.jsx', 'relevant.js',
    'specific.tsx', 'specific.ts', 'specific.jsx', 'specific.js',
    'related.tsx', 'related.ts', 'related.jsx', 'related.js',
    'single.tsx', 'single.ts', 'single.jsx', 'single.js',
    'multiple.tsx', 'multiple.ts', 'multiple.jsx', 'multiple.js',
    'separate.tsx', 'separate.ts', 'separate.jsx', 'separate.js'
  ];
  
  const lowerName = fileName.toLowerCase();
  
  // Check against common word false positives
  if (commonWordFalsePositives.includes(lowerName)) {
    console.log(`🚫 [FileDetect] Skipping common word false positive: ${fileName}`);
    return true;
  }
  
  // Check exact match
  if (techNames.map(t => t.toLowerCase()).includes(lowerName)) {
    return true;
  }
  
  // Check if it starts with capital letter and ends with .js (likely technology name)
  if (/^[A-Z][a-z]+\.js$/i.test(fileName) && fileName[0] === fileName[0].toUpperCase()) {
    // If it's a single capitalized word + .js, likely a tech name
    const baseName = fileName.replace(/\.js$/i, '');
    if (baseName.length <= 10 && /^[A-Z][a-z]+$/.test(baseName)) {
      console.log(`🚫 [FileDetect] Skipping likely technology name: ${fileName}`);
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// CODE BLOCK TO FILE MAPPING
// ============================================================================

/**
 * Extract code and target file from a code block element
 */
function extractCodeBlockInfo(block: HTMLElement): CodeBlockInfo | null {
  // Get code content - try multiple selectors
  let codeElement = block.querySelector('code');
  if (!codeElement) codeElement = block.querySelector('pre');
  if (!codeElement) codeElement = block.querySelector('.code-content, [class*="code"]');
  if (!codeElement) codeElement = block;
  
  const code = codeElement?.textContent?.trim() || '';
  
  if (!code || code.length < 10) return null;
  
  // Skip if it's just a command or short snippet
  const lineCount = code.split('\n').length;
  if (lineCount < 3) return null;
  
  // Get language from class or data attribute
  let language = 'unknown';
  
  // Check code element classes
  const codeClasses = codeElement?.className || '';
  const langMatch = codeClasses.match(/language-(\w+)|lang-(\w+)|(\w+)-code/);
  if (langMatch) {
    language = langMatch[1] || langMatch[2] || langMatch[3];
  }
  
  // Check block attributes
  const dataLang = block.getAttribute('data-language') || 
                   block.getAttribute('data-lang') ||
                   block.getAttribute('data-code-lang');
  if (dataLang) language = dataLang;
  
  // Check header for language
  const header = block.querySelector('.cbe-header, .muf-header, [class*="header"]');
  if (header) {
    const headerText = header.textContent?.toLowerCase() || '';
    const langFromHeader = detectLanguageFromText(headerText);
    if (langFromHeader) language = langFromHeader;
  }
  
  // Extract target file name
  const targetFile = extractTargetFileFromBlock(block, code);
  
  return { code, language, targetFile, lineCount };
}

/**
 * Detect programming language from text
 */
function detectLanguageFromText(text: string): string | null {
  const langMap: Record<string, string> = {
    'typescript': 'typescript', 'ts': 'typescript', 'tsx': 'typescript',
    'javascript': 'javascript', 'js': 'javascript', 'jsx': 'javascript',
    'python': 'python', 'py': 'python',
    'rust': 'rust', 'rs': 'rust',
    'java': 'java',
    'csharp': 'csharp', 'c#': 'csharp', 'cs': 'csharp',
    'cpp': 'cpp', 'c++': 'cpp',
    'go': 'go', 'golang': 'go',
    'ruby': 'ruby', 'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin', 'kt': 'kotlin',
    'html': 'html',
    'css': 'css', 'scss': 'scss', 'sass': 'sass',
    'json': 'json',
    'yaml': 'yaml', 'yml': 'yaml',
    'sql': 'sql',
    'bash': 'bash', 'shell': 'bash', 'sh': 'bash',
    'powershell': 'powershell', 'ps1': 'powershell'
  };
  
  const textLower = text.toLowerCase();
  for (const [key, value] of Object.entries(langMap)) {
    if (textLower.includes(key)) return value;
  }
  return null;
}

/**
 * Enhanced target file extraction from code block context
 */
function extractTargetFileFromBlock(block: HTMLElement, code: string): string | null {
  const fileRegex = new RegExp(`([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))`, 'i');
  
  // Helper to validate detected filename
  const isValidFileName = (name: string): boolean => {
    return !isTechnologyName(name) && !isCommonConfigFile(name);
  };
  
  // 1. Check filename label directly above code block
  const prevSibling = block.previousElementSibling;
  if (prevSibling) {
    const siblingText = prevSibling.textContent?.trim() || '';
    
    // Exact filename pattern: "App.tsx:" or "App.tsx"
    const exactMatch = siblingText.match(new RegExp(`^([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS})):?\\s*$`, 'i'));
    if (exactMatch && isValidFileName(exactMatch[1])) {
      console.log(`📄 [MultiFile] Found filename label: ${exactMatch[1]}`);
      return exactMatch[1];
    }
    
    // "for the filename" or "in filename" pattern
    const forMatch = siblingText.match(new RegExp(`(?:for|in|update|modify|the)\\s+["\`']?([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))["\`']?`, 'i'));
    if (forMatch && isValidFileName(forMatch[1])) {
      console.log(`📄 [MultiFile] Found "for file" pattern: ${forMatch[1]}`);
      return forMatch[1];
    }
  }
  
  // 2. Check parent's previous sibling (sometimes label is wrapped)
  const parentPrev = block.parentElement?.previousElementSibling;
  if (parentPrev) {
    const text = parentPrev.textContent?.trim() || '';
    const match = text.match(new RegExp(`([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS})):?\\s*$`, 'i'));
    if (match && isValidFileName(match[1])) {
      console.log(`📄 [MultiFile] Found filename in parent sibling: ${match[1]}`);
      return match[1];
    }
  }
  
  // 3. Check previous 3 siblings for backtick-wrapped filename
  let prevEl = block.previousElementSibling;
  for (let i = 0; i < 3 && prevEl; i++) {
    const prevText = prevEl.textContent || '';
    const backtickMatch = prevText.match(new RegExp('`([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:' + FILE_EXTENSIONS + '))`[^`]*$', 'i'));
    if (backtickMatch && isValidFileName(backtickMatch[1])) {
      console.log(`📄 [MultiFile] Found backtick filename: ${backtickMatch[1]}`);
      return backtickMatch[1];
    }
    prevEl = prevEl.previousElementSibling;
  }
  
  // 4. Check code block header/annotation
  const header = block.querySelector('.cbe-header, .muf-header, [class*="header"], [class*="filename"], [class*="title"]');
  if (header) {
    const headerText = header.textContent || '';
    const match = headerText.match(fileRegex);
    if (match && isValidFileName(match[1])) {
      console.log(`📄 [MultiFile] Found filename in header: ${match[1]}`);
      return match[1];
    }
  }
  
  // 5. Check data attributes
  const dataFile = block.getAttribute('data-file') || 
                   block.getAttribute('data-filename') ||
                   block.getAttribute('data-path') ||
                   block.getAttribute('data-name');
  if (dataFile) {
    const fileName = dataFile.split(/[/\\]/).pop() || dataFile;
    if (fileRegex.test(fileName)) {
      // Don't filter data attributes - they're explicitly set
      console.log(`📄 [MultiFile] Found filename in data attr: ${fileName}`);
      return fileName;
    }
  }
  
  // 6. Check text in code/strong/b tags before block
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (parentMessage) {
    const codeElements = parentMessage.querySelectorAll('code, strong, b, em');
    for (const el of codeElements) {
      // Skip if element is inside or after the block
      if (block.contains(el) || el.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_PRECEDING) {
        continue;
      }
      const text = el.textContent?.trim() || '';
      const match = text.match(new RegExp(`^([a-zA-Z][a-zA-Z0-9_.-]*\\.(?:${FILE_EXTENSIONS}))$`, 'i'));
      if (match && isValidFileName(match[1])) {
        console.log(`📄 [MultiFile] Found filename in ${el.tagName}: ${match[1]}`);
        return match[1];
      }
    }
  }
  
  // 7. Detect from code content patterns
  const codeFileName = detectFileFromCodeContent(code);
  if (codeFileName) {
    console.log(`📄 [MultiFile] Detected filename from code: ${codeFileName}`);
    return codeFileName;
  }
  
  return null;
}

/**
 * Detect likely filename from code content patterns
 */
function detectFileFromCodeContent(code: string): string | null {
  // React component with export - likely .tsx
  if ((code.includes('import React') || code.includes('from "react"') || code.includes("from 'react'")) ||
      (code.includes('useState') || code.includes('useEffect') || code.includes('useRef'))) {
    
    // Try to find component name
    const exportMatch = code.match(/export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/);
    if (exportMatch) {
      return `${exportMatch[1]}.tsx`;
    }
    
    const functionMatch = code.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]+)\s*[=:(<]/);
    if (functionMatch) {
      return `${functionMatch[1]}.tsx`;
    }
  }
  
  // Python main file
  if (code.includes('if __name__ == "__main__"') || code.includes("if __name__ == '__main__'")) {
    return 'main.py';
  }
  
  // Python class definition
  const pythonClassMatch = code.match(/^class\s+([A-Z][a-zA-Z0-9]+)/m);
  if (pythonClassMatch && code.includes('def ')) {
    return `${pythonClassMatch[1].toLowerCase()}.py`;
  }
  
  // HTML document
  if (code.includes('<!DOCTYPE html>') || code.match(/<html[^>]*>/i)) {
    return 'index.html';
  }
  
  // Pure CSS file
  if (code.match(/^[\s\S]*\{[\s\S]*:\s*[\s\S]*;[\s\S]*\}/m) && 
      !code.includes('function') && !code.includes('const ') && !code.includes('let ') &&
      !code.includes('import ') && !code.includes('export ')) {
    if (code.includes('@tailwind') || code.includes('@apply')) return 'styles.css';
    if (code.includes(':root') || code.includes('--')) return 'variables.css';
    return 'index.css';
  }
  
  // Rust main
  if (code.includes('fn main()') && !code.includes('#[tauri::command]')) {
    return 'main.rs';
  }
  
  // Rust lib
  if (code.includes('pub mod') || code.includes('pub fn') && !code.includes('fn main()')) {
    return 'lib.rs';
  }
  
  // Package.json
  if (code.trim().startsWith('{') && code.includes('"name"') && code.includes('"version"')) {
    return 'package.json';
  }
  
  // TypeScript/JavaScript with specific exports
  if (code.includes('export default') || code.includes('module.exports')) {
    const defaultExportMatch = code.match(/export\s+default\s+(?:function\s+)?([a-zA-Z][a-zA-Z0-9]*)/);
    if (defaultExportMatch) {
      const name = defaultExportMatch[1];
      if (name[0] === name[0].toUpperCase()) {
        return `${name}.tsx`; // Component
      }
      return `${name}.ts`;
    }
  }
  
  return null;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Find file element in the project tree by name
 */
function findFileInProjectTree(fileName: string): HTMLElement | null {
  const fileNameLower = fileName.toLowerCase();
  
  console.log(`🔍 [MultiFile] Looking for file: "${fileName}"`);
  
  // Search elements with data-path attribute
  const pathElements = document.querySelectorAll('[data-path]');
  console.log(`🔍 [MultiFile] Checking ${pathElements.length} elements with data-path`);
  
  for (const el of pathElements) {
    const path = el.getAttribute('data-path') || '';
    const pathFileName = path.split(/[/\\]/).pop()?.toLowerCase() || '';
    
    if (pathFileName === fileNameLower) {
      console.log(`✅ [MultiFile] Found file at path: ${path}`);
      
      // Look for clickable child element
      const clickable = el.querySelector('.file-name, .file-label, .filename, span[class*="name"], .tree-item-label');
      if (clickable) {
        return clickable as HTMLElement;
      }
      return el as HTMLElement;
    }
  }
  
  // Fallback: search by text content
  const fileItems = document.querySelectorAll('.file-item, .file-tree-item, .tree-item, [class*="file-entry"], [class*="explorer-item"]');
  console.log(`🔍 [MultiFile] Checking ${fileItems.length} file items by text`);
  
  for (const el of fileItems) {
    const text = el.textContent?.trim().toLowerCase() || '';
    if (text === fileNameLower || text.endsWith(fileNameLower)) {
      console.log(`✅ [MultiFile] Found file by text: ${text}`);
      return el as HTMLElement;
    }
  }
  
  console.log(`❌ [MultiFile] File not found: ${fileName}`);
  return null;
}

/**
 * Open a file in the editor and wait for it to load
 * FIXED v1.1: Uses window.openFileInTab to ensure tab is created
 */
async function openFileInEditor(fileName: string, timeout: number = 6000): Promise<boolean> {
  console.log(`📂 [OpenFile] Opening: ${fileName}`);
  
  const fileElement = findFileInProjectTree(fileName);
  if (!fileElement) {
    console.log(`❌ [OpenFile] File not found in tree: ${fileName}`);
    return false;
  }
  
  // Get full path if available
  const fullPath = fileElement.getAttribute('data-path') || 
                   fileElement.closest('[data-path]')?.getAttribute('data-path');
  console.log(`📂 [OpenFile] Full path: ${fullPath || 'not found'}`);
  
  if (!fullPath) {
    console.log(`❌ [OpenFile] No path found for: ${fileName}`);
    return false;
  }
  
  // Check if file already open
  const currentFile = getCurrentFileName();
  if (currentFile?.toLowerCase() === fileName.toLowerCase()) {
    console.log(`✅ [OpenFile] File already open: ${fileName}`);
    return true;
  }
  
  // ==========================================================================
  // Method 1: Use window.openFileInTab (BEST - creates tab AND opens file)
  // From console: "Global: window.tabManager, window.openFileInTab(path, line)"
  // ==========================================================================
  if (typeof (window as any).openFileInTab === 'function') {
    console.log(`📂 [OpenFile] Using window.openFileInTab (creates tab)`);
    try {
      await (window as any).openFileInTab(fullPath, 1);
      await sleep(300);
      
      const opened = await waitForFileInEditor(fileName, 3000);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via openFileInTab`);
        return true;
      }
    } catch (e) {
      console.warn(`⚠️ [OpenFile] openFileInTab failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 2: Use tabManager.openFile
  // ==========================================================================
  const tabManager = (window as any).tabManager;
  if (tabManager && typeof tabManager.openFile === 'function') {
    console.log(`📂 [OpenFile] Using tabManager.openFile`);
    try {
      await tabManager.openFile(fullPath);
      await sleep(300);
      
      const opened = await waitForFileInEditor(fileName, 3000);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via tabManager.openFile`);
        return true;
      }
    } catch (e) {
      console.warn(`⚠️ [OpenFile] tabManager.openFile failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 3: Double-click on file element (creates tab via event handler)
  // ==========================================================================
  console.log(`📂 [OpenFile] Trying double-click on file tree element...`);
  fileElement.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  await sleep(50);
  
  try {
    const rect = fileElement.getBoundingClientRect();
    fileElement.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + 10,
      clientY: rect.top + 10
    }));
    console.log(`📂 [OpenFile] Double-click dispatched`);
  } catch (e) {
    console.warn(`⚠️ [OpenFile] Double-click failed:`, e);
  }
  
  // Wait for file to appear in editor
  let opened = await waitForFileInEditor(fileName, timeout);
  if (opened) {
    console.log(`✅ [OpenFile] Opened via double-click`);
    return true;
  }
  
  // ==========================================================================
  // Method 4: Fallback - window.openFile + trigger tab creation event
  // ==========================================================================
  if (typeof (window as any).openFile === 'function') {
    console.log(`📂 [OpenFile] Fallback: window.openFile + tab creation event`);
    try {
      await (window as any).openFile(fullPath);
      await sleep(200);
      
      // Dispatch multiple events to try to get a tab created
      document.dispatchEvent(new CustomEvent('file-opened-programmatically', {
        detail: { path: fullPath, fileName, createTab: true }
      }));
      
      document.dispatchEvent(new CustomEvent('create-editor-tab', {
        detail: { path: fullPath, fileName }
      }));
      
      // Try adding tab via tabManager
      if (tabManager && typeof tabManager.addTab === 'function') {
        tabManager.addTab({ path: fullPath, fileName, active: true });
      }
      
      opened = await waitForFileInEditor(fileName, timeout);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via window.openFile`);
        return true;
      }
    } catch (e) {
      console.error(`❌ [OpenFile] window.openFile error:`, e);
    }
  }
  
  // ==========================================================================
  // Method 5: Last resort - single click
  // ==========================================================================
  console.log(`📂 [OpenFile] Last resort: single click`);
  fileElement.click();
  
  return await waitForFileInEditor(fileName, timeout / 2);
}

/**
 * Wait for a specific file to appear in the editor
 */
async function waitForFileInEditor(fileName: string, maxWaitMs: number): Promise<boolean> {
  const fileNameLower = fileName.toLowerCase();
  const fileBase = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const startTime = Date.now();
  
  console.log(`⏳ [WaitFile] Waiting for "${fileName}" to open in editor...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    await sleep(150);
    
    const editor = getMonacoEditor();
    if (editor) {
      const model = editor.getModel();
      const currentPath = model?.uri?.path || model?.uri?.toString() || '';
      const currentFile = currentPath.split('/').pop()?.split('\\').pop()?.toLowerCase() || '';
      const currentBase = currentFile.replace(/\.[^/.]+$/, '');
      
      if (currentFile === fileNameLower || currentBase === fileBase) {
        console.log(`✅ [WaitFile] File detected: "${currentFile}" (path: ${currentPath})`);
        await sleep(200); // Let Monaco settle
        return true;
      }
    }
  }
  
  // Final check
  const editor = getMonacoEditor();
  const currentFile = editor?.getModel()?.uri?.path?.split('/').pop() || 'unknown';
  console.log(`⏳ [WaitFile] Final check - editor has: "${currentFile}"`);
  console.log(`⚠️ [WaitFile] Timeout - "${fileName}" not detected after ${maxWaitMs}ms`);
  
  return false;
}

/**
 * Get Monaco editor instance
 */
function getMonacoEditor(): any {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return null;
  
  const editors = monaco.editor.getEditors();
  if (!editors || editors.length === 0) return null;
  
  // Return first visible/active editor
  for (const editor of editors) {
    if (editor.getDomNode()?.offsetParent !== null) {
      return editor;
    }
  }
  
  return editors[0];
}

/**
 * Get current file name from editor
 */
function getCurrentFileName(): string | null {
  const editor = getMonacoEditor();
  if (!editor) return null;
  
  const model = editor.getModel();
  if (!model) return null;
  
  const path = model.uri?.path || model.uri?.toString() || '';
  return path.split('/').pop()?.split('\\').pop() || null;
}

/**
 * Get current editor content
 */
function getEditorContent(): string {
  const editor = getMonacoEditor();
  return editor?.getValue() || '';
}

// ============================================================================
// MULTI-FILE SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new multi-file update session
 */
export function createSession(aiMessageElement: HTMLElement): MultiFileSession {
  const sessionId = `mf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const session: MultiFileSession = {
    id: sessionId,
    tasks: [],
    currentIndex: 0,
    status: 'idle',
    startTime: Date.now(),
    aiMessageElement,
    aiMessageId: aiMessageElement.getAttribute('data-message-id') || sessionId
  };
  
  console.log(`📚 [MultiFile] Created session: ${sessionId}`);
  return session;
}

/**
 * Add a file update task to the session
 */
function addTaskToSession(session: MultiFileSession, task: FileUpdateTask): void {
  // Check if file already in queue
  const existingIndex = session.tasks.findIndex(
    t => t.fileName.toLowerCase() === task.fileName.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    const existing = session.tasks[existingIndex];
    // Update with newer/longer code if provided
    if (task.code && task.code.length > (existing.code?.length || 0)) {
      existing.code = task.code;
      existing.language = task.language;
      existing.blockElement = task.blockElement;
      existing.lineCount = task.lineCount;
      console.log(`📝 [MultiFile] Updated task for ${task.fileName} (${task.lineCount} lines)`);
    }
  } else {
    session.tasks.push(task);
    console.log(`📝 [MultiFile] Added task for ${task.fileName}`);
  }
}

/**
 * Get current session
 */
export function getCurrentMultiFileSession(): MultiFileSession | null {
  return currentSession;
}

/**
 * Process the current session - open files and apply code sequentially
 */
export async function processSession(session: MultiFileSession): Promise<void> {
  if (session.status === 'processing') {
    console.log('⏳ [MultiFile] Session already processing');
    return;
  }
  
  // Filter tasks that have code
  const tasksWithCode = session.tasks.filter(t => t.code && t.code.trim().length > 0);
  
  if (tasksWithCode.length === 0) {
    console.log('⏭️ [MultiFile] No tasks with code in session');
    session.status = 'complete';
    return;
  }
  
  // Check if auto-apply is enabled
  const autoApplyEnabled = (window as any).isAutoApplyEnabled?.() || 
                           localStorage.getItem('autonomousMode') === 'true';
  
  if (!autoApplyEnabled) {
    console.log('⏸️ [MultiFile] Auto-apply is disabled');
    showMultiFileToast('⏸️ Enable autonomous mode to auto-apply', 'info');
    return;
  }
  
  session.status = 'processing';
  console.log(`\n📚 [MultiFile] ========== PROCESSING ${tasksWithCode.length} FILES ==========`);
  
  showMultiFileProgress({
    current: 0,
    total: tasksWithCode.length,
    currentFile: tasksWithCode[0].fileName,
    status: 'Starting...'
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < tasksWithCode.length; i++) {
    const task = tasksWithCode[i];
    session.currentIndex = i;
    
    console.log(`\n📂 [MultiFile] Processing ${i + 1}/${tasksWithCode.length}: ${task.fileName} (${task.lineCount || '?'} lines)`);
    
    showMultiFileProgress({
      current: i + 1,
      total: tasksWithCode.length,
      currentFile: task.fileName,
      status: 'Opening file...'
    });
    
    task.status = 'opening';
    
    try {
      // Check if file is already open
      const currentFile = getCurrentFileName();
      let fileReady = currentFile?.toLowerCase() === task.fileName.toLowerCase();
      
      if (!fileReady) {
        // Open the file
        const opened = await openFileInEditor(task.fileName, 6000);
        if (!opened) {
          task.status = 'error';
          task.error = 'Could not open file';
          errorCount++;
          showMultiFileToast(`⚠️ Could not open ${task.fileName}`, 'error');
          continue;
        }
        fileReady = true;
      }
      
      // Verify we're in the right file
      const verifyFile = getCurrentFileName();
      if (verifyFile?.toLowerCase() !== task.fileName.toLowerCase()) {
        // Try one more time with base name match
        const verifyBase = verifyFile?.replace(/\.[^/.]+$/, '').toLowerCase();
        const taskBase = task.fileName.replace(/\.[^/.]+$/, '').toLowerCase();
        
        if (verifyBase !== taskBase) {
          task.status = 'error';
          task.error = 'File mismatch after open';
          errorCount++;
          console.log(`⚠️ [MultiFile] File mismatch: expected ${task.fileName}, got ${verifyFile}`);
          continue;
        }
      }
      
      // Save original content for rollback
      task.originalContent = getEditorContent();
      
      // Apply the code
      task.status = 'applying';
      showMultiFileProgress({
        current: i + 1,
        total: tasksWithCode.length,
        currentFile: task.fileName,
        status: 'Applying code...'
      });
      
      const applied = await applyCodeToFile(task.code);
      
      if (applied) {
        task.status = 'applied';
        successCount++;
        console.log(`✅ [MultiFile] Applied code to ${task.fileName}`);
      } else {
        task.status = 'error';
        task.error = 'Failed to apply code';
        errorCount++;
      }
      
      // Delay between files for stability
      if (i < tasksWithCode.length - 1) {
        await sleep(600);
      }
      
    } catch (error) {
      console.error(`❌ [MultiFile] Error processing ${task.fileName}:`, error);
      task.status = 'error';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      errorCount++;
    }
  }
  
  // Processing complete
  hideMultiFileProgress();
  
  console.log(`\n📊 [MultiFile] Complete: ${successCount} updated, ${errorCount} errors`);
  
  if (successCount > 0) {
    session.status = 'awaiting-confirmation';
    showMultiFileConfirmation(session);
  } else {
    session.status = 'complete';
    if (errorCount > 0) {
      showMultiFileToast(`❌ Failed to update files`, 'error');
    }
  }
}

// ============================================================================
// CODE APPLICATION
// ============================================================================

/**
 * Apply code to the current file in editor
 */
async function applyCodeToFile(code: string): Promise<boolean> {
  const editor = getMonacoEditor();
  if (!editor) {
    console.log('❌ [MultiFile] No editor available');
    return false;
  }
  
  try {
    const model = editor.getModel();
    if (!model) {
      console.log('❌ [MultiFile] No model in editor');
      return false;
    }
    
    // Use Monaco's edit operation for undo support
    const fullRange = model.getFullModelRange();
    
    editor.executeEdits('multi-file-apply', [{
      range: fullRange,
      text: code,
      forceMoveMarkers: true
    }]);
    
    // Move cursor to top
    editor.setPosition({ lineNumber: 1, column: 1 });
    editor.revealLine(1);
    
    // Try to format the document
    try {
      const formatAction = editor.getAction('editor.action.formatDocument');
      if (formatAction) {
        await formatAction.run();
      }
    } catch (e) {
      // Format not available, that's ok
    }
    
    return true;
  } catch (error) {
    console.error('❌ [MultiFile] Apply error:', error);
    return false;
  }
}

/**
 * Rollback changes for a task
 */
async function rollbackTask(task: FileUpdateTask): Promise<boolean> {
  if (!task.originalContent) {
    console.log(`⚠️ [MultiFile] No original content to rollback for ${task.fileName}`);
    return false;
  }
  
  // Open the file first if needed
  const currentFile = getCurrentFileName();
  if (currentFile?.toLowerCase() !== task.fileName.toLowerCase()) {
    const opened = await openFileInEditor(task.fileName, 4000);
    if (!opened) {
      console.log(`❌ [MultiFile] Could not open file for rollback: ${task.fileName}`);
      return false;
    }
  }
  
  const editor = getMonacoEditor();
  if (!editor) return false;
  
  try {
    const model = editor.getModel();
    if (!model) return false;
    
    editor.executeEdits('multi-file-rollback', [{
      range: model.getFullModelRange(),
      text: task.originalContent,
      forceMoveMarkers: true
    }]);
    
    console.log(`↩️ [MultiFile] Rolled back: ${task.fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ [MultiFile] Rollback error for ${task.fileName}:`, error);
    return false;
  }
}

/**
 * Trigger file save
 */
function triggerSave(): void {
  // Method 1: Click save button
  const saveSelectors = [
    '[title*="Save"]',
    '[aria-label*="Save"]',
    'button[class*="save"]',
    '.save-btn',
    '#save-btn'
  ];
  
  for (const selector of saveSelectors) {
    const saveBtn = document.querySelector(selector) as HTMLElement;
    if (saveBtn) {
      saveBtn.click();
      console.log(`💾 [MultiFile] Save triggered via button`);
      return;
    }
  }
  
  // Method 2: Ctrl+S keyboard event
  const editor = getMonacoEditor();
  const targetEl = editor?.getDomNode() || document.activeElement || document.body;
  
  targetEl.dispatchEvent(new KeyboardEvent('keydown', {
    key: 's',
    code: 'KeyS',
    ctrlKey: true,
    bubbles: true,
    cancelable: true
  }));
  
  // Method 3: Custom event
  document.dispatchEvent(new CustomEvent('file-save-request'));
  
  // Method 4: Global save function
  if (typeof (window as any).saveCurrentFile === 'function') {
    (window as any).saveCurrentFile();
  }
  
  console.log(`💾 [MultiFile] Save triggered via keyboard/event`);
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Show multi-file progress indicator
 */
function showMultiFileProgress(progress: FileQueueProgress): void {
  injectMultiFileStyles();
  
  let progressBar = document.getElementById('multi-file-progress');
  
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'multi-file-progress';
    progressBar.className = 'mf-progress';
    document.body.appendChild(progressBar);
  }
  
  const percentage = Math.round((progress.current / progress.total) * 100);
  
  progressBar.innerHTML = `
    <div class="mf-progress-content">
      <div class="mf-progress-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div class="mf-progress-info">
        <div class="mf-progress-title">
          Updating <span class="mf-progress-count">${progress.current}/${progress.total}</span>: 
          <strong>${escapeHtml(progress.currentFile)}</strong>
        </div>
        <div class="mf-progress-status">${escapeHtml(progress.status)}</div>
      </div>
      <div class="mf-progress-percent">${percentage}%</div>
    </div>
    <div class="mf-progress-bar">
      <div class="mf-progress-bar-fill" style="width: ${percentage}%"></div>
    </div>
  `;
  
  progressBar.classList.add('visible');
}

/**
 * Hide multi-file progress indicator
 */
function hideMultiFileProgress(): void {
  const progressBar = document.getElementById('multi-file-progress');
  if (progressBar) {
    progressBar.classList.remove('visible');
    setTimeout(() => progressBar.remove(), 300);
  }
}

/**
 * Show multi-file confirmation bar
 */
function showMultiFileConfirmation(session: MultiFileSession): void {
  injectMultiFileStyles();
  
  // Remove existing
  document.getElementById('multi-file-confirm')?.remove();
  
  const appliedTasks = session.tasks.filter(t => t.status === 'applied');
  const errorTasks = session.tasks.filter(t => t.status === 'error');
  
  if (appliedTasks.length === 0) {
    console.log('⚠️ [MultiFile] No applied tasks to confirm');
    return;
  }
  
  const confirmBar = document.createElement('div');
  confirmBar.id = 'multi-file-confirm';
  confirmBar.className = 'mf-confirm';
  
  const filesList = appliedTasks.map(t => t.fileName).join(', ');
  const totalLines = appliedTasks.reduce((sum, t) => sum + (t.lineCount || 0), 0);
  
  confirmBar.innerHTML = `
    <div class="mf-confirm-content">
      <div class="mf-confirm-icon">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      </div>
      <div class="mf-confirm-info">
        <span class="mf-confirm-label">Updated ${appliedTasks.length} file${appliedTasks.length > 1 ? 's' : ''}</span>
        <span class="mf-confirm-files" title="${escapeHtml(filesList)}">${escapeHtml(filesList)}</span>
        ${totalLines > 0 ? `<span class="mf-confirm-lines">(${totalLines} lines)</span>` : ''}
        ${errorTasks.length > 0 ? `<span class="mf-confirm-errors">${errorTasks.length} failed</span>` : ''}
      </div>
      <div class="mf-confirm-actions">
        <button class="mf-confirm-btn accept" title="Accept all changes and save">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
          Accept All
          <kbd>↵</kbd>
        </button>
        <button class="mf-confirm-btn reject" title="Reject all changes and restore originals">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
          Reject All
          <kbd>esc</kbd>
        </button>
      </div>
    </div>
  `;
  
  // Event handlers
  const acceptBtn = confirmBar.querySelector('.accept') as HTMLElement;
  const rejectBtn = confirmBar.querySelector('.reject') as HTMLElement;
  
  acceptBtn.addEventListener('click', () => acceptAllChanges(session));
  rejectBtn.addEventListener('click', () => rejectAllChanges(session));
  
  document.body.appendChild(confirmBar);
  
  // Keyboard shortcuts
  if (!keyboardHandlerAttached) {
    document.addEventListener('keydown', handleConfirmKeyboard);
    keyboardHandlerAttached = true;
  }
  
  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      confirmBar.classList.add('visible');
    });
  });
}

/**
 * Handle keyboard shortcuts for confirmation
 */
function handleConfirmKeyboard(e: KeyboardEvent): void {
  if (!currentSession || currentSession.status !== 'awaiting-confirmation') return;
  
  // Don't interfere with input elements
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }
  
  if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    acceptAllChanges(currentSession);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    rejectAllChanges(currentSession);
  }
}

/**
 * Accept all changes in session
 */
async function acceptAllChanges(session: MultiFileSession): Promise<void> {
  console.log('✅ [MultiFile] Accepting all changes');
  
  const appliedTasks = session.tasks.filter(t => t.status === 'applied');
  
  // Save all files
  for (const task of appliedTasks) {
    const currentFile = getCurrentFileName();
    if (currentFile?.toLowerCase() !== task.fileName.toLowerCase()) {
      await openFileInEditor(task.fileName, 3000);
      await sleep(200);
    }
    triggerSave();
    await sleep(300);
  }
  
  session.status = 'complete';
  hideMultiFileConfirmation();
  
  showMultiFileToast(`✅ Saved ${appliedTasks.length} file${appliedTasks.length > 1 ? 's' : ''}`, 'success');
  
  // Clear session
  if (currentSession?.id === session.id) {
    currentSession = null;
  }
}

/**
 * Reject all changes in session
 */
async function rejectAllChanges(session: MultiFileSession): Promise<void> {
  console.log('❌ [MultiFile] Rejecting all changes');
  
  // Rollback in reverse order
  const appliedTasks = session.tasks.filter(t => t.status === 'applied').reverse();
  
  let rolledBack = 0;
  for (const task of appliedTasks) {
    const success = await rollbackTask(task);
    if (success) rolledBack++;
    await sleep(200);
  }
  
  session.status = 'cancelled';
  hideMultiFileConfirmation();
  
  showMultiFileToast(`↩️ Reverted ${rolledBack} file${rolledBack > 1 ? 's' : ''}`, 'info');
  
  // Clear session
  if (currentSession?.id === session.id) {
    currentSession = null;
  }
}

/**
 * Hide confirmation bar
 */
function hideMultiFileConfirmation(): void {
  const confirmBar = document.getElementById('multi-file-confirm');
  if (confirmBar) {
    confirmBar.classList.remove('visible');
    setTimeout(() => confirmBar.remove(), 300);
  }
  
  // Remove keyboard handler
  if (keyboardHandlerAttached) {
    document.removeEventListener('keydown', handleConfirmKeyboard);
    keyboardHandlerAttached = false;
  }
}

/**
 * Show toast notification
 */
function showMultiFileToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  injectMultiFileStyles();
  
  let toastContainer = document.getElementById('multi-file-toasts');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'multi-file-toasts';
    toastContainer.className = 'mf-toasts';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = `mf-toast mf-toast-${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
  });
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// STYLES
// ============================================================================

function injectMultiFileStyles(): void {
  if (document.getElementById('multi-file-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'multi-file-styles';
  style.textContent = `
    /* ========== Multi-File Progress Bar ========== */
    .mf-progress {
      position: fixed;
      top: 60px;
      right: 20px;
      width: 340px;
      background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
      border: 1px solid #3c3c3c;
      border-radius: 10px;
      padding: 14px 16px;
      z-index: 10001;
      opacity: 0;
      transform: translateX(30px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .mf-progress.visible {
      opacity: 1;
      transform: translateX(0);
    }
    .mf-progress-content {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .mf-progress-icon {
      color: #58a6ff;
      flex-shrink: 0;
      animation: mf-pulse 2s ease-in-out infinite;
    }
    @keyframes mf-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .mf-progress-info {
      flex: 1;
      min-width: 0;
    }
    .mf-progress-title {
      color: #e1e1e1;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mf-progress-title strong {
      color: #fff;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-weight: 600;
    }
    .mf-progress-count {
      color: #58a6ff;
      font-weight: 600;
    }
    .mf-progress-status {
      color: #888;
      font-size: 11px;
      margin-top: 3px;
    }
    .mf-progress-percent {
      color: #3fb950;
      font-size: 14px;
      font-weight: 600;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .mf-progress-bar {
      height: 4px;
      background: #333;
      border-radius: 2px;
      overflow: hidden;
    }
    .mf-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3fb950 0%, #58a6ff 50%, #a371f7 100%);
      border-radius: 2px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px rgba(63, 185, 80, 0.3);
    }
    
    /* ========== Multi-File Confirmation Bar ========== */
    .mf-confirm {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
      border: 1px solid #3c3c3c;
      border-radius: 10px;
      padding: 10px 16px;
      z-index: 10001;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 90vw;
    }
    .mf-confirm.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .mf-confirm-content {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .mf-confirm-icon {
      color: #3fb950;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .mf-confirm-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .mf-confirm-label {
      color: #e1e1e1;
      font-size: 13px;
      font-weight: 500;
    }
    .mf-confirm-files {
      color: #58a6ff;
      font-size: 12px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mf-confirm-lines {
      color: #888;
      font-size: 11px;
    }
    .mf-confirm-errors {
      color: #f85149;
      font-size: 11px;
      background: rgba(248, 81, 73, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .mf-confirm-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
      padding-left: 14px;
      border-left: 1px solid #3c3c3c;
    }
    .mf-confirm-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .mf-confirm-btn kbd {
      padding: 2px 5px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      font-size: 10px;
      font-family: inherit;
      opacity: 0.7;
    }
    .mf-confirm-btn.accept {
      background: #238636;
      color: #fff;
    }
    .mf-confirm-btn.accept:hover {
      background: #2ea043;
      box-shadow: 0 0 12px rgba(46, 160, 67, 0.4);
    }
    .mf-confirm-btn.reject {
      background: #21262d;
      color: #f85149;
      border: 1px solid rgba(248, 81, 73, 0.4);
    }
    .mf-confirm-btn.reject:hover {
      background: rgba(248, 81, 73, 0.15);
      border-color: #f85149;
    }
    
    /* ========== Toasts ========== */
    .mf-toasts {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 10002;
      pointer-events: none;
    }
    .mf-toast {
      padding: 12px 18px;
      background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      color: #e1e1e1;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transform: translateX(30px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
    }
    .mf-toast.visible {
      opacity: 1;
      transform: translateX(0);
    }
    .mf-toast-success {
      border-color: #3fb950;
      color: #3fb950;
    }
    .mf-toast-error {
      border-color: #f85149;
      color: #f85149;
    }
    .mf-toast-info {
      border-color: #58a6ff;
      color: #58a6ff;
    }
    
    /* ========== Responsive ========== */
    @media (max-width: 768px) {
      .mf-progress {
        right: 10px;
        left: 10px;
        width: auto;
      }
      .mf-confirm {
        left: 10px;
        right: 10px;
        transform: translateY(20px);
        bottom: 70px;
      }
      .mf-confirm.visible {
        transform: translateY(0);
      }
      .mf-confirm-actions {
        width: 100%;
        margin-left: 0;
        padding-left: 0;
        border-left: none;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #3c3c3c;
        justify-content: flex-end;
      }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateMessageId(element: HTMLElement): string {
  return element.getAttribute('data-message-id') || 
         `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

// ============================================================================
// MAIN INTEGRATION - AI Message Observer
// ============================================================================

/**
 * Initialize the multi-file autonomous system
 * This hooks into AI message detection and code block observation
 */
export function initMultiFileAutonomous(): void {
  console.log('🚀 [MultiFile] Initializing multi-file autonomous system v1.1 (with tab fix)...');
  
  injectMultiFileStyles();
  
  // Main observer for AI messages and code blocks
  const mainObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        
        // Check for AI messages - expanded class list
        const isAIMessage = node.classList?.contains('ai-message') || 
                           node.classList?.contains('assistant-message') ||
                           node.classList?.contains('claude-message') ||
                           node.classList?.contains('response-message') ||
                           node.classList?.contains('bot-message') ||
                           node.getAttribute('data-role') === 'assistant' ||
                           node.getAttribute('data-sender') === 'assistant' ||
                           node.getAttribute('data-type') === 'ai';
        
        if (isAIMessage) {
          console.log(`🤖 [MultiFile] AI message detected (direct)`);
          handleNewAIMessage(node);
          continue;
        }
        
        // Check if node contains AI message - expanded selectors
        const aiMessageSelectors = [
          '.ai-message', 
          '.assistant-message', 
          '.claude-message',
          '.response-message',
          '.bot-message',
          '[data-role="assistant"]',
          '[data-sender="assistant"]',
          '[data-type="ai"]'
        ];
        
        for (const selector of aiMessageSelectors) {
          const aiMessage = node.querySelector(selector);
          if (aiMessage instanceof HTMLElement) {
            console.log(`🤖 [MultiFile] AI message detected (child: ${selector})`);
            handleNewAIMessage(aiMessage);
            break;
          }
        }
        
        // Check for code blocks (might appear after message)
        const codeBlocks = node.querySelectorAll('.cbe-wrapper, .muf-block, pre:has(code), .code-block');
        if (codeBlocks.length > 0) {
          // Small delay to ensure message context is available
          setTimeout(() => {
            handleNewCodeBlocks(Array.from(codeBlocks) as HTMLElement[]);
          }, 100);
        }
      }
    }
  });
  
  // Find the best container to observe
  const containers = [
    document.querySelector('#chat-messages'),
    document.querySelector('.chat-messages'),
    document.querySelector('.message-list'),
    document.querySelector('[class*="messages-container"]'),
    document.querySelector('[class*="conversation"]'),
    document.body
  ];
  
  const container = containers.find(c => c !== null) || document.body;
  console.log(`👀 [MultiFile] Watching container:`, container.className || container.tagName);
  
  mainObserver.observe(container, {
    childList: true,
    subtree: true
  });
  
  // Periodic check for missed code blocks
  setInterval(() => {
    if (currentSession && currentSession.status === 'idle') {
      const aiMessage = currentSession.aiMessageElement;
      if (aiMessage) {
        const codeBlocks = aiMessage.querySelectorAll('.cbe-wrapper, .muf-block, pre:has(code), .code-block');
        if (codeBlocks.length > 0) {
          handleNewCodeBlocks(Array.from(codeBlocks) as HTMLElement[]);
        }
      }
    }
    
    // Also scan for any new AI messages that might have been missed
    if (!currentSession || currentSession.status === 'complete') {
      const aiMessages = document.querySelectorAll('.ai-message, .assistant-message, .response-message, [data-role="assistant"]');
      for (const msg of aiMessages) {
        if (msg instanceof HTMLElement && !processedMessageIds.has(generateMessageId(msg))) {
          // Check if this message has multi-file mentions
          const files = scanAIMessageForFiles(msg);
          if (files.length >= 2) {
            console.log(`🔄 [MultiFile] Periodic scan found unprocessed multi-file message`);
            handleNewAIMessage(msg);
            break; // Process one at a time
          }
        }
      }
    }
  }, 2000);
  
  console.log('✅ [MultiFile] Ready! Will auto-process multi-file updates.');
  console.log('   📚 Detects: "update App.tsx and main.tsx" patterns');
  console.log('   📂 Opens files automatically in editor tabs');
  console.log('   ✅ Shows batch confirmation after all files updated');
}

/**
 * Handle a new AI message - scan for file mentions
 */
function handleNewAIMessage(messageElement: HTMLElement): void {
  const messageId = generateMessageId(messageElement);
  
  // Skip if already processed
  if (processedMessageIds.has(messageId)) {
    console.log(`⏭️ [MultiFile] Message already processed: ${messageId.substring(0, 20)}...`);
    return;
  }
  
  console.log(`📨 [MultiFile] Scanning AI message for file mentions...`);
  
  // Scan for file mentions
  const mentionedFiles = scanAIMessageForFiles(messageElement);
  
  console.log(`📄 [MultiFile] Found ${mentionedFiles.length} files: ${mentionedFiles.join(', ') || 'none'}`);
  
  // Only create session for multi-file updates (2+ files)
  if (mentionedFiles.length >= 2) {
    console.log(`📚 [MultiFile] ✨ MULTI-FILE UPDATE DETECTED: ${mentionedFiles.join(', ')}`);
    
    // Create new session
    currentSession = createSession(messageElement);
    currentSession.aiMessageId = messageId;
    
    // Pre-populate queue with expected files
    for (const fileName of mentionedFiles) {
      addTaskToSession(currentSession, {
        fileName,
        code: '',
        language: 'unknown',
        status: 'pending'
      });
    }
    
    showMultiFileToast(`📚 Multi-file update: ${mentionedFiles.length} files`, 'info');
    processedMessageIds.add(messageId);
    
    console.log(`📚 [MultiFile] Session created with ${mentionedFiles.length} tasks`);
  } else {
    console.log(`📄 [MultiFile] Single file or no files - not creating session`);
  }
}

/**
 * Handle new code blocks - associate with files in queue
 */
function handleNewCodeBlocks(blocks: HTMLElement[]): void {
  if (!currentSession || currentSession.status !== 'idle') return;
  
  console.log(`🔍 [MultiFile] Processing ${blocks.length} code blocks`);
  
  for (const block of blocks) {
    // Skip if already processed
    if (block.hasAttribute('data-mf-processed')) continue;
    
    const codeInfo = extractCodeBlockInfo(block);
    if (!codeInfo || !codeInfo.code) continue;
    
    // Mark as processed
    block.setAttribute('data-mf-processed', 'true');
    
    // Try to match with a task
    let matchedTask: FileUpdateTask | undefined;
    
    if (codeInfo.targetFile) {
      // Exact match by detected filename
      matchedTask = currentSession.tasks.find(
        t => t.fileName.toLowerCase() === codeInfo.targetFile!.toLowerCase()
      );
    }
    
    if (!matchedTask) {
      // Match to first pending task without code
      matchedTask = currentSession.tasks.find(t => t.status === 'pending' && !t.code);
    }
    
    if (matchedTask) {
      matchedTask.code = codeInfo.code;
      matchedTask.language = codeInfo.language;
      matchedTask.blockElement = block;
      matchedTask.lineCount = codeInfo.lineCount;
      
      if (codeInfo.targetFile) {
        matchedTask.fileName = codeInfo.targetFile;
      }
      
      console.log(`✅ [MultiFile] Matched code to ${matchedTask.fileName} (${codeInfo.lineCount} lines)`);
    } else if (codeInfo.targetFile) {
      // New file not in original queue
      addTaskToSession(currentSession, {
        fileName: codeInfo.targetFile,
        code: codeInfo.code,
        language: codeInfo.language,
        blockElement: block,
        status: 'pending',
        lineCount: codeInfo.lineCount
      });
      console.log(`➕ [MultiFile] Added new file to queue: ${codeInfo.targetFile}`);
    }
  }
  
  // Check if we have enough code to start processing
  checkAndStartProcessing();
}

/**
 * Check if we should start processing the session
 */
function checkAndStartProcessing(): void {
  if (!currentSession || currentSession.status !== 'idle') return;
  
  const tasksWithCode = currentSession.tasks.filter(t => t.code && t.code.trim().length > 0);
  const totalTasks = currentSession.tasks.length;
  
  // Start processing if:
  // 1. All tasks have code, OR
  // 2. We have at least 2 tasks with code and some time has passed (3 seconds)
  const allHaveCode = tasksWithCode.length === totalTasks;
  const timePassed = Date.now() - currentSession.startTime > 3000;
  const hasEnoughCode = tasksWithCode.length >= 2;
  
  if (allHaveCode || (hasEnoughCode && timePassed)) {
    const autoApplyEnabled = (window as any).isAutoApplyEnabled?.() || 
                             localStorage.getItem('autonomousMode') === 'true';
    
    if (autoApplyEnabled) {
      console.log(`🚀 [MultiFile] Starting processing: ${tasksWithCode.length}/${totalTasks} tasks have code`);
      processSession(currentSession);
    } else {
      console.log('⏸️ [MultiFile] Auto-apply disabled, not starting');
    }
  }
}

// ============================================================================
// EXPORTS & GLOBAL ACCESS
// ============================================================================

// Export for module use
export {
  showMultiFileProgress,
  showMultiFileConfirmation,
  showMultiFileToast,
  hideMultiFileProgress,
  hideMultiFileConfirmation,
  findFileInProjectTree,
  openFileInEditor,
  getMonacoEditor,
  getCurrentFileName
};

// Global access
if (typeof window !== 'undefined') {
  (window as any).initMultiFileAutonomous = initMultiFileAutonomous;
  (window as any).scanAIMessageForFiles = scanAIMessageForFiles;
  (window as any).getCurrentMultiFileSession = getCurrentMultiFileSession;
  (window as any).processMultiFileSession = () => currentSession && processSession(currentSession);
  (window as any).setMultiFileEnabled = (enabled: boolean) => { isMultiFileEnabled = enabled; };
  
  // Test utilities
  (window as any).testMultiFile = {
    // Get current state
    status: () => ({
      session: currentSession,
      enabled: isMultiFileEnabled,
      autoApply: (window as any).isAutoApplyEnabled?.() || localStorage.getItem('autonomousMode') === 'true'
    }),
    
    // Show progress UI demo
    showProgress: () => {
      showMultiFileProgress({
        current: 2,
        total: 3,
        currentFile: 'App.tsx',
        status: 'Applying code...'
      });
      setTimeout(hideMultiFileProgress, 3000);
    },
    
    // Show confirmation UI demo
    showConfirm: () => {
      const mockSession: MultiFileSession = {
        id: 'test-session',
        tasks: [
          { fileName: 'App.tsx', code: '// test', language: 'tsx', status: 'applied', lineCount: 45 },
          { fileName: 'main.tsx', code: '// test', language: 'tsx', status: 'applied', lineCount: 120 },
          { fileName: 'styles.css', code: '/* test */', language: 'css', status: 'error', error: 'Not found' }
        ],
        currentIndex: 2,
        status: 'awaiting-confirmation',
        startTime: Date.now()
      };
      currentSession = mockSession;
      showMultiFileConfirmation(mockSession);
    },
    
    // Simulate full multi-file update
    simulate: async (files: string[]) => {
      console.log('🧪 [Test] Simulating multi-file update:', files);
      
      // Enable auto-apply temporarily
      const wasEnabled = localStorage.getItem('autonomousMode');
      localStorage.setItem('autonomousMode', 'true');
      
      const mockSession = createSession(document.body);
      for (const file of files) {
        addTaskToSession(mockSession, {
          fileName: file,
          code: `// Auto-generated test code for ${file}\n// Created at ${new Date().toISOString()}\n\nconsole.log('Hello from ${file}');\n`,
          language: file.endsWith('.tsx') || file.endsWith('.ts') ? 'typescript' : 'javascript',
          status: 'pending',
          lineCount: 5
        });
      }
      
      currentSession = mockSession;
      await processSession(mockSession);
      
      // Restore auto-apply state
      if (wasEnabled === null) {
        localStorage.removeItem('autonomousMode');
      } else {
        localStorage.setItem('autonomousMode', wasEnabled);
      }
    },
    
    // Test file finding
    findFile: (name: string) => {
      const el = findFileInProjectTree(name);
      if (el) {
        console.log('✅ Found:', el);
        el.style.outline = '2px solid #3fb950';
        setTimeout(() => el.style.outline = '', 2000);
      } else {
        console.log('❌ Not found');
      }
      return el;
    },
    
    // Test file opening
    openFile: async (name: string) => {
      console.log('🧪 [Test] Opening file:', name);
      const result = await openFileInEditor(name);
      console.log(result ? '✅ File opened' : '❌ Failed to open');
      return result;
    },
    
    // Clear session
    clear: () => {
      currentSession = null;
      processedMessageIds.clear();
      hideMultiFileProgress();
      hideMultiFileConfirmation();
      console.log('🧹 [Test] Cleared all state');
    }
  };
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  const init = () => {
    // Wait for other systems to initialize first
    setTimeout(() => {
      initMultiFileAutonomous();
    }, 1500);
  };
  
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
}

console.log('📚 [MultiFile] Module loaded v1.1 (with tab creation fix)');
console.log('   Test: testMultiFile.simulate(["App.tsx", "main.tsx"])');
console.log('   Demo: testMultiFile.showProgress() / testMultiFile.showConfirm()');
