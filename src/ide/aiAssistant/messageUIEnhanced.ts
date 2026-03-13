// ============================================================================
// messageUIEnhanced.ts - Enhanced AI Chat Message Display System
// Version: 2.0 - Complete overhaul for Operator X02 Code IDE
// Features:
//   - VS Code-style code blocks with syntax highlighting
//   - Proper HTML escaping (prevents rendering inside code)
//   - Collapsible code blocks with smooth animations
//   - Line numbers with gutter
//   - Language detection with colored badges
//   - Copy button with feedback
//   - Insert to editor button
//   - File path detection (NEW/EDIT badges)
//   - Better message visual hierarchy
//   - User/Assistant message differentiation
//   - Timestamp and provider badges
//   - Message action buttons (like, copy, delete, etc.)
// ============================================================================

// ============================================================================
// INTERFACES
// ============================================================================

interface CodeBlockOptions {
  language: string;
  fileName?: string;
  status?: 'new' | 'edit' | null;
  lineCount: number;
  isCollapsed?: boolean;
}

interface MessageOptions {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  provider?: string;
  messageId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Language color mapping (VS Code style)
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f7df1e',
  python: '#3776ab',
  rust: '#dea584',
  html: '#e34c26',
  css: '#1572b6',
  scss: '#cc6699',
  json: '#292929',
  yaml: '#cb171e',
  markdown: '#083fa1',
  bash: '#4eaa25',
  shell: '#4eaa25',
  sql: '#e38c00',
  java: '#b07219',
  kotlin: '#a97bff',
  swift: '#fa7343',
  go: '#00add8',
  php: '#4f5d95',
  ruby: '#cc342d',
  csharp: '#178600',
  cpp: '#f34b7d',
  c: '#555555',
  xml: '#0060ac',
  tsx: '#3178c6',
  jsx: '#61dafb',
  vue: '#41b883',
  svelte: '#ff3e00',
  dart: '#00b4ab',
  flet: '#00b4ab',
};

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  js: 'JavaScript',
  jsx: 'JavaScript React',
  py: 'Python',
  rs: 'Rust',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  bash: 'Bash',
  sh: 'Shell',
  sql: 'SQL',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  go: 'Go',
  php: 'PHP',
  rb: 'Ruby',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  xml: 'XML',
  vue: 'Vue',
  svelte: 'Svelte',
  dart: 'Dart',
};

// ============================================================================
// CSS STYLES
// ============================================================================

const ENHANCED_MESSAGE_STYLES = `
/* ============================================================================
   ENHANCED MESSAGE UI STYLES - Operator X02 Code IDE
   ============================================================================ */

/* Message Container Base */
.ai-message {
  margin: 8px 0;
  padding: 0;
  border-radius: 8px;
  position: relative;
  animation: messageSlideIn 0.2s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* User Message Styling */
.ai-message.user-message {
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.08) 0%, rgba(79, 195, 247, 0.04) 100%);
  border: 1px solid rgba(79, 195, 247, 0.15);
  margin-left: 24px;
}

.ai-message.user-message::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 12px;
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, #4fc3f7 0%, rgba(79, 195, 247, 0.3) 100%);
  border-radius: 2px;
}

/* Assistant Message Styling */
.ai-message.assistant-message {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-message.assistant-message::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 12px;
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, #4caf50 0%, rgba(76, 175, 80, 0.3) 100%);
  border-radius: 2px;
}

/* System Message Styling */
.ai-message.system-message {
  background: rgba(255, 193, 7, 0.08);
  border: 1px solid rgba(255, 193, 7, 0.2);
  text-align: center;
  font-size: 12px;
  color: #ffc107;
  padding: 8px 16px;
}

/* Message Content */
.ai-message-content {
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #e0e0e0;
  overflow-wrap: break-word;
}

.ai-message-content p {
  margin: 0 0 12px 0;
}

.ai-message-content p:last-child {
  margin-bottom: 0;
}

/* Inline Code */
.ai-message-content code:not(.enh-code),
.ai-message-content code.inline-code {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
  font-size: 12px;
  color: #f8f8f2;
}

/* Markdown Headings */
.ai-message-content .md-heading {
  margin: 16px 0 8px 0;
  color: #e6edf3;
  font-weight: 600;
}

.ai-message-content h3.md-heading {
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

.ai-message-content h4.md-heading {
  font-size: 14px;
}

/* Markdown Lists */
.ai-message-content .md-list-item {
  margin: 4px 0;
  padding-left: 8px;
  list-style-type: disc;
  list-style-position: inside;
  display: list-item;
}

/* ============================================================================
   ENHANCED CODE BLOCK STYLES
   ============================================================================ */

.enh-code-block {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  margin: 12px 0;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
}

/* Code Block Header */
.enh-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
  border-bottom: 1px solid #30363d;
  min-height: 36px;
}

.enh-code-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.enh-lang-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.enh-lang-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.enh-lang-name {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8b949e;
}

/* File Status Badges */
.enh-file-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.enh-file-status.new {
  background: rgba(63, 185, 80, 0.15);
  color: #3fb950;
  border: 1px solid rgba(63, 185, 80, 0.3);
}

.enh-file-status.edit {
  background: rgba(210, 153, 34, 0.15);
  color: #d29922;
  border: 1px solid rgba(210, 153, 34, 0.3);
}

.enh-filename {
  font-size: 11px;
  color: #58a6ff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.enh-line-count {
  font-size: 10px;
  color: #6e7681;
  white-space: nowrap;
}

/* Code Block Actions */
.enh-code-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.enh-code-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
}

.enh-code-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #e6edf3;
}

.enh-code-btn.copied {
  background: rgba(63, 185, 80, 0.2);
  border-color: rgba(63, 185, 80, 0.4);
  color: #3fb950;
}

.enh-code-btn.inserted {
  background: rgba(79, 195, 247, 0.2);
  border-color: rgba(79, 195, 247, 0.4);
  color: #4fc3f7;
}

/* Code Body */
.enh-code-body {
  display: flex;
  position: relative;
  max-height: 400px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.enh-code-body.collapsed {
  max-height: 120px;
}

.enh-code-body.expanded {
  max-height: none;
}

/* Line Numbers */
.enh-line-numbers {
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid #30363d;
  text-align: right;
  user-select: none;
  font-size: 12px;
  line-height: 1.5;
  color: #484f58;
  min-width: 40px;
  flex-shrink: 0;
}

/* Code Content */
.enh-code-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  padding: 12px 16px;
}

.enh-code-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.enh-code-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.enh-code-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.enh-code-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.enh-pre {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.enh-code {
  font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #e6edf3;
  white-space: pre;
  tab-size: 2;
}

/* Fade Overlay for Collapsed */
.enh-fade-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to bottom, transparent, #0d1117);
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;
}

.enh-code-body.expanded .enh-fade-overlay {
  opacity: 0;
}

/* Expand Bar */
.enh-expand-bar {
  display: flex;
  justify-content: center;
  padding: 8px;
  background: #161b22;
  border-top: 1px solid #30363d;
}

.enh-expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(88, 166, 255, 0.1);
  border: 1px solid rgba(88, 166, 255, 0.2);
  border-radius: 4px;
  color: #58a6ff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.enh-expand-btn:hover {
  background: rgba(88, 166, 255, 0.2);
  border-color: rgba(88, 166, 255, 0.4);
}

.enh-expand-btn .arrow {
  transition: transform 0.2s ease;
}

.enh-expand-btn.expanded .arrow {
  transform: rotate(180deg);
}

/* ============================================================================
   SYNTAX HIGHLIGHTING (VS Code Dark+ Theme)
   ============================================================================ */

.enh-code .keyword { color: #569cd6; }
.enh-code .string { color: #ce9178; }
.enh-code .number { color: #b5cea8; }
.enh-code .comment { color: #6a9955; font-style: italic; }
.enh-code .function { color: #dcdcaa; }
.enh-code .variable { color: #9cdcfe; }
.enh-code .type { color: #4ec9b0; }
.enh-code .operator { color: #d4d4d4; }
.enh-code .punctuation { color: #d4d4d4; }
.enh-code .property { color: #9cdcfe; }
.enh-code .tag { color: #569cd6; }
.enh-code .attribute { color: #9cdcfe; }
.enh-code .attr-value { color: #ce9178; }
.enh-code .decorator { color: #dcdcaa; }
.enh-code .constant { color: #4fc1ff; }
.enh-code .class-name { color: #4ec9b0; }
.enh-code .builtin { color: #c586c0; }
.enh-code .regex { color: #d16969; }

/* ============================================================================
   MESSAGE ACTIONS
   ============================================================================ */

.enh-message-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.ai-message:hover .enh-message-actions {
  opacity: 1;
}

.enh-message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #6e7681;
}

.enh-message-time {
  color: #6e7681;
}

.enh-provider-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  font-size: 10px;
  color: #8b949e;
  text-transform: capitalize;
}

.enh-action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.enh-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #6e7681;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
}

.enh-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e6edf3;
}

.enh-action-btn.liked {
  color: #3fb950;
}

.enh-action-btn.disliked {
  color: #f85149;
}

.enh-action-btn.copied {
  color: #58a6ff;
}

/* ============================================================================
   RESPONSIVE ADJUSTMENTS
   ============================================================================ */

@media (max-width: 600px) {
  .enh-code-header {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .enh-code-header-left {
    flex-wrap: wrap;
  }
  
  .enh-filename {
    max-width: 100px;
  }
}
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML to prevent XSS and code rendering issues
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '`': '&#x60;',
    '$': '&#36;',
  };
  return text.replace(/[&<>"'`$]/g, (char) => map[char] || char);
}

/**
 * Detect language from code fence or file extension
 */
function detectLanguage(langHint: string | null, code: string): string {
  if (langHint) {
    const normalized = langHint.toLowerCase().trim();
    // Map common aliases
    const aliases: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml',
      'md': 'markdown',
      'rs': 'rust',
      'kt': 'kotlin',
      'cs': 'csharp',
    };
    return aliases[normalized] || normalized;
  }
  
  // Auto-detect from content
  if (code.includes('import React') || code.includes('useState')) return 'typescript';
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('fn ') && code.includes('->')) return 'rust';
  if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
  if (code.includes('SELECT ') || code.includes('FROM ')) return 'sql';
  if (code.startsWith('{') && code.endsWith('}')) return 'json';
  
  return 'plaintext';
}

/**
 * Get language color
 */
function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] || '#6e7681';
}

/**
 * Get language display name
 */
function getLanguageName(language: string): string {
  return LANGUAGE_NAMES[language] || language.toUpperCase();
}

/**
 * Apply basic syntax highlighting
 */
function applySyntaxHighlighting(code: string, language: string): string {
  // First escape HTML
  let highlighted = escapeHtml(code);
  
  // Keywords for different languages
  const keywordPatterns: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly', 'abstract', 'enum', 'namespace', 'module', 'declare', 'as', 'is', 'in', 'of', 'typeof', 'instanceof', 'keyof', 'true', 'false', 'null', 'undefined', 'void', 'never', 'any', 'unknown', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'default', 'break', 'continue', 'do', 'with', 'yield', 'delete', 'debugger'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'extends', 'static', 'true', 'false', 'null', 'undefined', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'default', 'break', 'continue', 'do', 'with', 'yield', 'delete', 'debugger', 'typeof', 'instanceof', 'in', 'of'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'assert', 'yield', 'lambda', 'pass', 'break', 'continue', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'async', 'await', 'del', 'print', 'self'],
    rust: ['fn', 'let', 'mut', 'const', 'static', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'struct', 'enum', 'impl', 'trait', 'pub', 'mod', 'use', 'crate', 'self', 'super', 'where', 'as', 'async', 'await', 'dyn', 'move', 'ref', 'type', 'unsafe', 'extern', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'Self'],
    html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'label', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'main', 'section', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    css: ['@import', '@media', '@keyframes', '@font-face', '@supports', '@page', '!important'],
    sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'SET', 'VALUES', 'INTO'],
  };
  
  const keywords = keywordPatterns[language] || keywordPatterns.javascript || [];
  
  // Apply highlighting
  
  // 1. Comments (single-line)
  highlighted = highlighted.replace(
    /(\/\/.*$|#.*$)/gm,
    '<span class="comment">$1</span>'
  );
  
  // 2. Multi-line comments
  highlighted = highlighted.replace(
    /(\/\*[\s\S]*?\*\/)/g,
    '<span class="comment">$1</span>'
  );
  
  // 3. Strings (double quotes)
  highlighted = highlighted.replace(
    /(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g,
    '<span class="string">$1</span>'
  );
  
  // 4. Strings (single quotes)
  highlighted = highlighted.replace(
    /(&#039;(?:[^&]|&(?!#039;))*?&#039;)/g,
    '<span class="string">$1</span>'
  );
  
  // 5. Template strings
  highlighted = highlighted.replace(
    /(&#x60;[\s\S]*?&#x60;)/g,
    '<span class="string">$1</span>'
  );
  
  // 6. Numbers
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="number">$1</span>'
  );
  
  // 7. Keywords
  if (keywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    highlighted = highlighted.replace(keywordRegex, '<span class="keyword">$1</span>');
  }
  
  // 8. Function calls
  highlighted = highlighted.replace(
    /\b([a-zA-Z_]\w*)\s*\(/g,
    '<span class="function">$1</span>('
  );
  
  // 9. Decorators (Python, TypeScript)
  highlighted = highlighted.replace(
    /(@\w+)/g,
    '<span class="decorator">$1</span>'
  );
  
  // 10. Types (capitalized words in certain contexts)
  highlighted = highlighted.replace(
    /:\s*([A-Z][a-zA-Z0-9_]*)/g,
    ': <span class="type">$1</span>'
  );
  
  return highlighted;
}

/**
 * Generate line numbers HTML
 */
function generateLineNumbers(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
}

/**
 * Detect file info from surrounding context
 */
function detectFileInfo(codeBlock: Element | null): { fileName: string | null; status: 'new' | 'edit' | null } {
  if (!codeBlock) return { fileName: null, status: null };
  
  const message = codeBlock.closest('.ai-message, .assistant-message');
  if (!message) return { fileName: null, status: null };
  
  const text = message.textContent || '';
  const textLower = text.toLowerCase();
  
  // Detect status
  let status: 'new' | 'edit' | null = null;
  const newPatterns = ['create', 'new file', 'add file', 'make file', 'creating', 'here\'s a new', 'here is a new'];
  const editPatterns = ['edit', 'modify', 'update', 'fix', 'change', 'replace', 'add to', 'modify the', 'update the'];
  
  if (newPatterns.some(p => textLower.includes(p))) {
    status = 'new';
  } else if (editPatterns.some(p => textLower.includes(p))) {
    status = 'edit';
  }
  
  // Detect filename
  let fileName: string | null = null;
  const filePatterns = [
    /`([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)`/,
    /file[:\s]+([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/i,
    /([a-zA-Z0-9_\-]+\.(ts|tsx|js|jsx|py|rs|html|css|json|yaml|md|sql|java|kt|swift|go|php|rb|cs|cpp|c|xml|vue|svelte|dart))/
  ];
  
  for (const pattern of filePatterns) {
    const match = text.match(pattern);
    if (match) {
      fileName = match[1];
      break;
    }
  }
  
  return { fileName, status };
}

/**
 * Format timestamp
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Create enhanced code block HTML
 */
export function createEnhancedCodeBlock(
  code: string,
  options: Partial<CodeBlockOptions> = {}
): string {
  const {
    language = 'plaintext',
    fileName = null,
    status = null,
    lineCount = code.split('\n').length,
    isCollapsed = lineCount > 10
  } = options;
  
  const langColor = getLanguageColor(language);
  const langName = getLanguageName(language);
  const highlightedCode = applySyntaxHighlighting(code, language);
  const lineNumbers = generateLineNumbers(lineCount);
  const blockId = `code-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <div class="enh-code-block" data-block-id="${blockId}" data-language="${language}">
      <div class="enh-code-header">
        <div class="enh-code-header-left">
          <div class="enh-lang-indicator">
            <span class="enh-lang-dot" style="background: ${langColor}"></span>
            <span class="enh-lang-name">${langName}</span>
          </div>
          ${status ? `<span class="enh-file-status ${status}">${status === 'new' ? '📄 NEW' : '✏️ EDIT'}</span>` : ''}
          ${fileName ? `<span class="enh-filename" title="${fileName}">${fileName}</span>` : ''}
          <span class="enh-line-count">${lineCount} line${lineCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="enh-code-header-actions">
          <button class="enh-code-btn enh-toggle-btn" title="Expand/Collapse" data-block-id="${blockId}">
            ${isCollapsed ? '▼' : '▲'}
          </button>
          <button class="enh-code-btn enh-copy-btn" title="Copy code" data-block-id="${blockId}">
            📋
          </button>
          <button class="enh-code-btn enh-insert-btn" title="Insert to editor" data-block-id="${blockId}">
            ➕
          </button>
        </div>
      </div>
      <div class="enh-code-body ${isCollapsed ? 'collapsed' : 'expanded'}" data-block-id="${blockId}">
        <div class="enh-line-numbers">${lineNumbers}</div>
        <div class="enh-code-scroll">
          <pre class="enh-pre"><code class="enh-code">${highlightedCode}</code></pre>
        </div>
        ${isCollapsed ? '<div class="enh-fade-overlay"></div>' : ''}
      </div>
      ${isCollapsed || lineCount > 10 ? `
        <div class="enh-expand-bar">
          <button class="enh-expand-btn ${!isCollapsed ? 'expanded' : ''}" data-block-id="${blockId}">
            <span class="arrow">▼</span>
            ${isCollapsed ? `Show all ${lineCount} lines` : 'Collapse'}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Process markdown content and enhance code blocks
 */
export function processMessageContent(content: string): string {
  // Match code blocks with optional language
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  
  let processed = content;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [fullMatch, langHint, codeContent] = match;
    const code = codeContent.trim();
    const language = detectLanguage(langHint || null, code);
    const lineCount = code.split('\n').length;
    
    const enhancedBlock = createEnhancedCodeBlock(code, {
      language,
      lineCount,
      isCollapsed: lineCount > 10
    });
    
    processed = processed.replace(fullMatch, enhancedBlock);
  }
  
  // Process inline code (but not inside enhanced blocks)
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code>$1</code>'
  );
  
  // Process bold
  processed = processed.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  // Process italic
  processed = processed.replace(
    /\*([^*]+)\*/g,
    '<em>$1</em>'
  );
  
  // Process line breaks
  processed = processed.replace(/\n\n/g, '</p><p>');
  processed = processed.replace(/\n/g, '<br>');
  
  // Wrap in paragraphs if not already
  if (!processed.startsWith('<')) {
    processed = `<p>${processed}</p>`;
  }
  
  return processed;
}

/**
 * Create message actions HTML
 */
export function createMessageActions(
  role: 'user' | 'assistant',
  timestamp: Date,
  provider?: string,
  messageId?: string
): string {
  if (role === 'user') {
    return `
      <div class="enh-message-actions">
        <div class="enh-message-meta">
          <span class="enh-message-time">${formatTimestamp(timestamp)}</span>
        </div>
        <div class="enh-action-buttons">
          <button class="enh-action-btn enh-edit-btn" title="Edit" data-message-id="${messageId}">✏️</button>
          <button class="enh-action-btn enh-delete-btn" title="Delete" data-message-id="${messageId}">🗑️</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="enh-message-actions">
      <div class="enh-message-meta">
        <span class="enh-message-time">${formatTimestamp(timestamp)}</span>
        ${provider ? `<span class="enh-provider-badge">⚡ ${provider}</span>` : ''}
      </div>
      <div class="enh-action-buttons">
        <button class="enh-action-btn enh-like-btn" title="Good response" data-message-id="${messageId}">👍</button>
        <button class="enh-action-btn enh-dislike-btn" title="Bad response" data-message-id="${messageId}">👎</button>
        <button class="enh-action-btn enh-copy-msg-btn" title="Copy message" data-message-id="${messageId}">📋</button>
        <button class="enh-action-btn enh-html-btn" title="View as HTML" data-message-id="${messageId}">👁️</button>
        <button class="enh-action-btn enh-note-btn" title="Add note" data-message-id="${messageId}">📝</button>
        <button class="enh-action-btn enh-delete-btn" title="Delete" data-message-id="${messageId}">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Create complete message HTML
 */
export function createMessageHTML(options: MessageOptions): string {
  const {
    role,
    content,
    timestamp = new Date(),
    provider,
    messageId = `msg-${Date.now()}`
  } = options;
  
  const processedContent = processMessageContent(content);
  const actions = createMessageActions(role, timestamp, provider, messageId);
  
  return `
    <div class="ai-message ${role}-message" data-message-id="${messageId}">
      <div class="ai-message-content">
        ${processedContent}
      </div>
      ${actions}
    </div>
  `;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Setup code block event handlers
 */
export function setupCodeBlockEvents(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Toggle expand/collapse
    if (target.classList.contains('enh-toggle-btn') || target.classList.contains('enh-expand-btn')) {
      const blockId = target.dataset.blockId;
      if (!blockId) return;
      
      const codeBody = document.querySelector(`.enh-code-body[data-block-id="${blockId}"]`);
      const toggleBtn = document.querySelector(`.enh-toggle-btn[data-block-id="${blockId}"]`);
      const expandBtn = document.querySelector(`.enh-expand-btn[data-block-id="${blockId}"]`);
      
      if (codeBody) {
        const isCollapsed = codeBody.classList.contains('collapsed');
        codeBody.classList.toggle('collapsed', !isCollapsed);
        codeBody.classList.toggle('expanded', isCollapsed);
        
        if (toggleBtn) {
          toggleBtn.textContent = isCollapsed ? '▲' : '▼';
        }
        
        if (expandBtn) {
          expandBtn.classList.toggle('expanded', isCollapsed);
          const lineCount = expandBtn.closest('.enh-code-block')?.querySelector('.enh-line-count')?.textContent?.match(/\d+/)?.[0] || '';
          expandBtn.innerHTML = `<span class="arrow">▼</span> ${isCollapsed ? 'Collapse' : `Show all ${lineCount} lines`}`;
        }
      }
    }
    
    // Copy code
    if (target.classList.contains('enh-copy-btn')) {
      const blockId = target.dataset.blockId;
      if (!blockId) return;
      
      const codeElement = document.querySelector(`.enh-code-block[data-block-id="${blockId}"] .enh-code`);
      if (codeElement) {
        const code = codeElement.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          target.classList.add('copied');
          target.textContent = '✓';
          setTimeout(() => {
            target.classList.remove('copied');
            target.textContent = '📋';
          }, 2000);
        });
      }
    }
    
    // Insert to editor
    if (target.classList.contains('enh-insert-btn')) {
      const blockId = target.dataset.blockId;
      if (!blockId) return;
      
      const codeElement = document.querySelector(`.enh-code-block[data-block-id="${blockId}"] .enh-code`);
      if (codeElement) {
        const code = codeElement.textContent || '';
        // Try to insert into Monaco editor
        if ((window as any).insertCodeToEditor) {
          (window as any).insertCodeToEditor(code);
          target.classList.add('inserted');
          target.textContent = '✓';
          setTimeout(() => {
            target.classList.remove('inserted');
            target.textContent = '➕';
          }, 2000);
        }
      }
    }
    
    // Message action buttons
    if (target.classList.contains('enh-like-btn')) {
      target.classList.toggle('liked');
    }
    
    if (target.classList.contains('enh-dislike-btn')) {
      target.classList.toggle('disliked');
    }
    
    if (target.classList.contains('enh-copy-msg-btn')) {
      const messageId = target.dataset.messageId;
      const messageContent = target.closest('.ai-message')?.querySelector('.ai-message-content');
      if (messageContent) {
        const text = messageContent.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          target.classList.add('copied');
          setTimeout(() => target.classList.remove('copied'), 2000);
        });
      }
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the enhanced message UI system
 */
export function initializeEnhancedMessageUI(): void {
  console.log('🎨 [EnhancedMessageUI] Initializing...');
  
  // Inject styles
  if (!document.getElementById('enhanced-message-ui-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'enhanced-message-ui-styles';
    styleElement.textContent = ENHANCED_MESSAGE_STYLES;
    document.head.appendChild(styleElement);
    console.log('✅ [EnhancedMessageUI] Styles injected');
  }
  
  // Setup event handlers
  setupCodeBlockEvents();
  console.log('✅ [EnhancedMessageUI] Event handlers attached');
  
  // Watch for new messages and enhance them
  const observer = new MutationObserver((mutations) => {
    let shouldEnhance = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('ai-message') || 
              node.querySelector?.('.ai-message') ||
              node.querySelector?.('pre code:not(.enh-code)')) {
            shouldEnhance = true;
          }
        }
      });
    });
    
    if (shouldEnhance) {
      enhanceExistingCodeBlocks();
    }
  });
  
  // Start observing
  const chatContainer = document.querySelector('.ai-chat-container');
  if (chatContainer) {
    observer.observe(chatContainer, { childList: true, subtree: true });
    console.log('✅ [EnhancedMessageUI] Mutation observer started');
  }
  
  // Enhance any existing code blocks
  setTimeout(enhanceExistingCodeBlocks, 500);
  
  console.log('✅ [EnhancedMessageUI] Initialization complete');
}

/**
 * Enhance existing code blocks that weren't processed
 */
export function enhanceExistingCodeBlocks(): void {
  // 1. First, process raw markdown in message content
  processRawMarkdownInMessages();
  
  // 2. Then enhance any pre code blocks
  const unenhancedBlocks = document.querySelectorAll('pre code:not(.enh-code):not(.enhanced)');
  
  unenhancedBlocks.forEach((block) => {
    // Mark as processed to avoid double processing
    block.classList.add('enhanced');
    
    const pre = block.parentElement;
    if (!pre || pre.closest('.enh-code-block') || pre.closest('.muf-block')) return;
    
    const code = block.textContent || '';
    if (!code.trim()) return;
    
    // Detect language from class
    const langClass = Array.from(block.classList).find(c => c.startsWith('language-'));
    const language = langClass ? langClass.replace('language-', '') : detectLanguage(null, code);
    
    // Detect file info
    const { fileName, status } = detectFileInfo(pre);
    
    // Create enhanced block
    const lineCount = code.split('\n').length;
    const enhancedHTML = createEnhancedCodeBlock(code, {
      language,
      fileName,
      status,
      lineCount,
      isCollapsed: lineCount > 10
    });
    
    // Replace original
    const wrapper = document.createElement('div');
    wrapper.innerHTML = enhancedHTML;
    pre.replaceWith(wrapper.firstElementChild!);
  });
}

/**
 * Process raw markdown code blocks in message content
 * Handles cases where markdown wasn't parsed before insertion
 */
function processRawMarkdownInMessages(): void {
  // Find message content divs that haven't been processed
  const messageContents = document.querySelectorAll('.ai-message-content:not(.markdown-processed)');
  
  messageContents.forEach((contentDiv) => {
    // Get raw text/HTML content
    let html = contentDiv.innerHTML;
    
    // Check if there are raw markdown code blocks
    if (!html.includes('`' + '`' + '`')) return;
    
    // Mark as processed
    contentDiv.classList.add('markdown-processed');
    
    // Match code blocks: ```lang\ncode``` or ```\ncode```
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    
    let processed = html;
    const replacements: Array<{original: string, replacement: string}> = [];
    
    let match;
    while ((match = codeBlockRegex.exec(html)) !== null) {
      const [fullMatch, langHint, codeContent] = match;
      
      // Decode HTML entities
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = codeContent;
      let code = tempDiv.textContent || codeContent;
      code = code.trim();
      
      if (!code) continue;
      
      const language = detectLanguage(langHint || null, code);
      const lineCount = code.split('\n').length;
      
      const enhancedBlock = createEnhancedCodeBlock(code, {
        language,
        lineCount,
        isCollapsed: lineCount > 15
      });
      
      replacements.push({ original: fullMatch, replacement: enhancedBlock });
    }
    
    // Apply replacements
    replacements.forEach(({ original, replacement }) => {
      processed = processed.replace(original, replacement);
    });
    
    // Process inline code
    processed = processed.replace(
      /`([^`]+)`/g,
      '<code class="inline-code">$1</code>'
    );
    
    // Process bold **text**
    processed = processed.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong>$1</strong>'
    );
    
    // Process headers
    processed = processed.replace(
      /^### (.+)$/gm,
      '<h4 class="md-heading">$1</h4>'
    );
    processed = processed.replace(
      /^## (.+)$/gm,
      '<h3 class="md-heading">$1</h3>'
    );
    
    // Process list items
    processed = processed.replace(
      /^- (.+)$/gm,
      '<li class="md-list-item">$1</li>'
    );
    
    // Add proper line breaks
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = processed.replace(/\n/g, '<br>');
    
    contentDiv.innerHTML = processed;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  escapeHtml,
  detectLanguage,
  getLanguageColor,
  getLanguageName,
  applySyntaxHighlighting,
  generateLineNumbers,
  detectFileInfo,
  formatTimestamp,
  ENHANCED_MESSAGE_STYLES,
  LANGUAGE_COLORS,
  LANGUAGE_NAMES,
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedMessageUI);
  } else {
    setTimeout(initializeEnhancedMessageUI, 100);
  }
  
  // Expose for debugging
  (window as any).enhancedMessageUI = {
    init: initializeEnhancedMessageUI,
    enhance: enhanceExistingCodeBlocks,
    createCodeBlock: createEnhancedCodeBlock,
    processContent: processMessageContent,
    createMessage: createMessageHTML,
  };
}

console.log('📦 [EnhancedMessageUI] Module loaded');