// unifiedCodeBlockProcessor.ts
// ============================================================================
// COMPLETE CODE BLOCK PROCESSOR - Single file solution
// v2.0 - Added FILETREE support (different rendering without code controls)
// ============================================================================

console.log('🎨 [CodeBlockProcessor] Loading v2.0 (with FILETREE support)...');

// ============================================================================
// HELPER: Clean language prefix from code
// ============================================================================

/**
 * ⭐ FIX: Clean up language identifier prefixes that leaked into code
 */
function cleanLanguagePrefix(code: string): string {
  let cleaned = code.trim();
  
  const cleanupPatterns = [
    /^`[a-z]+\s*\n/i,      // `c\n, `typescript\n, etc.
    /^`\s*\n/i,            // Just backtick + newline  
    /^```[a-z]*\s*\n/i,    // Triple backtick fence
    /^[a-z]\n/i,           // Single letter + newline (e.g., "t\n" from "typescript")
    /^[a-z]{1,4}\s*\n/i,   // 1-4 letters + newline (c, cpp, html, etc.)
    /^(typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino|java|cs|rb|php|text|plaintext)[\s:]*\n/i,
    /^Copy\s*\n/i,         // "Copy" button text
    /^Copied!\s*\n/i,      // "Copied!" button text
  ];
  
  for (const pattern of cleanupPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      break;
    }
  }
  
  return cleaned.trim();
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  COLLAPSE_THRESHOLD: 2, // v13: Collapse code blocks with more than 2 lines
  COMPACT_MAX_LINES: 2,
  COMPACT_MAX_LENGTH: 120,
  DEBOUNCE_MS: 150,
};

// ============================================================================
// LANGUAGE COLORS
// ============================================================================

const LANG_COLORS: Record<string, string> = {
  typescript: '#3178c6', tsx: '#3178c6',
  javascript: '#f7df1e', jsx: '#f7df1e',
  python: '#3776ab',
  rust: '#ce422b',
  go: '#00add8',
  java: '#ed8b00',
  // ⭐ C/C++ colors
  c: '#a8b9cc', h: '#a8b9cc',           // C - blue-gray
  cpp: '#00599c', hpp: '#00599c',       // C++ - blue
  csharp: '#68217a', cs: '#68217a',     // C# - purple
  html: '#e34f26',
  css: '#1572b6', scss: '#cc6699',
  json: '#6e7681',
  bash: '#4caf50', sh: '#4caf50', shell: '#4caf50',
  sql: '#e38c00',
  php: '#777bb4',
  ruby: '#cc342d',
  plaintext: '#858585',
  // File tree languages - informational content (not code)
  filetree: '#64b5f6',
  tree: '#64b5f6',
  directory: '#64b5f6',
  structure: '#64b5f6',
  output: '#9e9e9e',
  text: '#9e9e9e',
};

// ============================================================================
// INFORMATIONAL BLOCK TYPES (not code - no Apply/Reject)
// ============================================================================

const INFORMATIONAL_LANGUAGES = new Set([
  'filetree', 'tree', 'directory', 'structure',
  'output', 'text', 'log', 'console',
  'markdown', 'md', 'txt'
]);

// ============================================================================
// UTILITIES
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detectLanguage(code: string): string {
  // First check if it looks like a file tree
  if (isFileTreeContent(code)) return 'filetree';
  
  // ⭐ C/C++ indicators - CHECK FIRST (preprocessor directives are strongest indicator)
  if (/^\s*#\s*(include|define|ifndef|ifdef|endif|pragma|if|elif|else|undef)\b/m.test(code)) {
    // Check if it's C++ specifically
    if (/\b(class\s+\w+\s*[:{]|namespace\s+\w+|cout|cin|std::|template\s*<|public:|private:|protected:)/m.test(code)) {
      return 'cpp';
    }
    return 'c';
  }
  
  // C/C++ type patterns
  if (/\b(void|int|char|float|double|unsigned|signed|long|short)\s+\w+\s*\(/m.test(code) ||
      /\b(struct|typedef|enum)\s+\w+/m.test(code)) {
    if (/\b(class\s+\w+|namespace|cout|cin|std::|new\s+\w+)/m.test(code)) {
      return 'cpp';
    }
    return 'c';
  }
  
  // Arduino patterns
  if (/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial\.|delay|setup|loop)\s*\(/m.test(code)) {
    return 'cpp';
  }
  
  if (/\binterface\b|\btype\s+\w+\s*=|:\s*(string|number|boolean|void)/.test(code)) return 'typescript';
  if (/\bfunction\b|\bconst\b|\blet\b|\bvar\b|=>|require\(/.test(code)) return 'javascript';
  if (/\bdef\b|\bclass\b.*:|\bimport\b.*\bfrom\b|print\(/.test(code)) return 'python';
  if (/\bfn\b|\blet\s+mut\b|\bimpl\b/.test(code)) return 'rust';
  if (/\bfunc\b|\bpackage\b/.test(code)) return 'go';
  if (/[.#][\w-]+\s*\{|@media|:\s*[\w-]+;/.test(code)) return 'css';
  if (/<\/?[a-z][\s\S]*>/i.test(code)) return 'html';
  if (/^\s*[\[{]/.test(code) && /[\]}]\s*$/.test(code)) return 'json';
  if (/^\s*[$#]\s|npm |yarn |git |cd |ls /.test(code)) return 'bash';
  if (/\bSELECT\b|\bFROM\b|\bWHERE\b/i.test(code)) return 'sql';
  return 'plaintext';
}

/**
 * Detect if content is a file tree structure (not actual code)
 * Handles multiple formats:
 * - Unicode tree chars: ├── └── │
 * - ASCII tree chars: |-- +-- `--
 * - Emoji-based: 📁 📄 with indentation
 * - Mixed formats with descriptions in parentheses
 */
function isFileTreeContent(code: string): boolean {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return false;
  
  // Check for tree characters: ├── └── │ ┌ ┐ └ ┘
  const treeCharCount = (code.match(/[├└│┬┤┼─┌┐┘]/g) || []).length;
  if (treeCharCount >= 3) return true;
  
  // Check for ASCII tree: |-- +-- `-- 
  const asciiTreeCount = (code.match(/(\|--|\+--|`--|├──|└──|│\s+)/g) || []).length;
  if (asciiTreeCount >= 3) return true;
  
  // Check for emoji-based file trees (📁 📄 📂 etc.)
  // These emojis indicate folder/file structure
  const fileEmojis = /[📁📂📄📋📝🗂️🗃️🗄️📦📑📰📃]/;
  let emojiLineCount = 0;
  let hasIndentedStructure = false;
  let prevIndent = -1;
  
  for (const line of lines) {
    // Check if line contains file/folder emojis
    if (fileEmojis.test(line)) {
      emojiLineCount++;
    }
    
    // Check for indentation pattern (file tree structure)
    const indent = line.search(/\S/);
    if (indent > 0 && prevIndent >= 0 && indent !== prevIndent) {
      hasIndentedStructure = true;
    }
    prevIndent = indent;
  }
  
  // If 50%+ lines have file emojis, it's a file tree
  if (emojiLineCount >= 3 && emojiLineCount / lines.length >= 0.4) return true;
  
  // Check if most lines look like file/folder entries
  let fileEntryCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Pattern 1: Tree chars + filename + optional description
    // "├── filename.ext", "│   └── folder/", "    - file.ts"
    if (/^[├└│|+`\-\s]*[\w.-]+\/?(\s+\([^)]+\))?$/.test(trimmed)) {
      fileEntryCount++;
      continue;
    }
    
    // Pattern 2: Emoji + filename + optional description
    // "📁 folder", "📄 file.ts (description)"
    if (/^[📁📂📄📋📝🗂️🗃️🗄️📦📑📰📃]\s*[\w.-]+/.test(trimmed)) {
      fileEntryCount++;
      continue;
    }
    
    // Pattern 3: Indented filename with extension or trailing slash (folder)
    // "  src/", "    main.ts", "      index.html (Web interface)"
    if (/^\s{2,}[\w.-]+\/?(\s+\([^)]+\))?$/.test(line)) {
      fileEntryCount++;
      continue;
    }
    
    // Pattern 4: Root folder name at start
    // "my-project/", "rrrrrrmy-awesome-app/"
    if (/^[\w.-]+\/\s*$/.test(trimmed)) {
      fileEntryCount++;
      continue;
    }
    
    // Pattern 5: Filename with extension and description
    // "config.h (Pin definitions & constants)"
    if (/^[\w.-]+\.\w+\s+\([^)]+\)$/.test(trimmed)) {
      fileEntryCount++;
      continue;
    }
  }
  
  // If 50%+ of non-empty lines look like file entries, it's a file tree
  const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
  if (nonEmptyLines >= 3 && fileEntryCount / nonEmptyLines >= 0.5) return true;
  
  // Check for common file tree indicators in content
  const hasProjectStructure = /project.structure|file.structure|folder.structure|directory/i.test(code);
  const hasFileExtensions = (code.match(/\.\w{1,5}(\s|\)|$)/g) || []).length >= 3;
  const hasFolderSlashes = (code.match(/\w+\/(\s|$)/g) || []).length >= 2;
  
  if (hasProjectStructure && (hasFileExtensions || hasFolderSlashes)) return true;
  if (hasIndentedStructure && hasFileExtensions && hasFolderSlashes) return true;
  
  return false;
}

/**
 * Check if content is ASCII diagram or documentation (not insertable code)
 */
function isDocumentationContent(code: string): boolean {
  // Detect ASCII box drawings
  const boxChars = /[┌┐└┘─│├┤┬┴┼╔╗╚╝═║╠╣╦╩╬┏┓┗┛┃┣┫┳┻╋]/;
  const arrowChars = /[←→↑↓↔↕⇐⇒⇑⇓⬅➡⬆⬇]/;
  
  const lines = code.split('\n');
  let boxCharLines = 0;
  let arrowLines = 0;
  
  for (const line of lines) {
    if (boxChars.test(line)) boxCharLines++;
    if (arrowChars.test(line)) arrowLines++;
  }
  
  // If has multiple box drawing chars, it's a diagram
  if (boxCharLines >= 2) return true;
  
  // If has arrows and looks like a layer diagram
  if (arrowLines >= 2 && /layer|level|tier|component|module/i.test(code)) return true;
  
  return false;
}

/**
 * Check if language should be treated as informational (not code)
 */
function isInformationalBlock(lang: string, code: string): boolean {
  // Check explicit informational languages
  if (INFORMATIONAL_LANGUAGES.has(lang.toLowerCase())) return true;
  
  // Check if content looks like file tree even if not labeled
  if (isFileTreeContent(code)) return true;
  
  // ⭐ FIX: Check for documentation/diagram content
  if (isDocumentationContent(code)) return true;
  
  return false;
}

function detectFilename(code: string, lang: string): string | null {
  const firstLine = code.split('\n')[0] || '';
  const patterns = [
    /^\/\/\s*([\w.-]+\.\w+)/,
    /^\/\*\s*([\w.-]+\.\w+)/,
    /^#\s*([\w.-]+\.\w+)/,
  ];
  for (const p of patterns) {
    const m = firstLine.match(p);
    if (m) return m[1];
  }
  return null;
}

function restoreNewlines(code: string, lang: string): string {
  // Don't modify file trees
  if (isInformationalBlock(lang, code)) return code;
  
  if (code.split('\n').length > 2) return code;
  if (code.length < 60) return code;
  
  if (['typescript', 'javascript', 'tsx', 'jsx'].includes(lang)) {
    return code
      .replace(/(\})\s*(interface|type|class|function|const|let|var|export|import)/g, '$1\n\n$2')
      .replace(/\{\s*(?=[a-zA-Z])/g, '{\n  ')
      .replace(/;(?!\s*[)\]])\s*(?=[a-zA-Z_}])/g, ';\n')
      .replace(/,\s*(?=\w)/g, ',\n  ');
  }
  
  if (['css', 'scss'].includes(lang)) {
    return code
      .replace(/\{\s*/g, '{\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\}\s*/g, '\n}\n');
  }
  
  if (lang === 'json') {
    try { return JSON.stringify(JSON.parse(code), null, 2); }
    catch { return code; }
  }
  
  return code;
}

// ============================================================================
// FILE TREE / INFORMATIONAL BLOCK RENDERER
// ============================================================================

let blockId = 0;

/**
 * Render file tree or other informational content
 * - No line numbers
 * - No Apply/Reject/Insert buttons
 * - Just Copy button and collapsible
 * - Different visual style
 */
function createFileTreeHTML(code: string, lang: string): string {
  const id = `filetree-${Date.now()}-${blockId++}`;
  const lines = code.split('\n');
  const lineCount = lines.length;
  const shouldCollapse = lineCount > CONFIG.COLLAPSE_THRESHOLD;
  const langColor = LANG_COLORS[lang] || LANG_COLORS.filetree;
  
  // Convert to styled file tree with icons
  const styledContent = convertToStyledFileTree(code);
  
  const labelText = lang.toLowerCase() === 'filetree' || lang.toLowerCase() === 'tree' 
    ? 'FILE STRUCTURE' 
    : lang.toUpperCase();

  return `
<div class="ucp-filetree ${shouldCollapse ? 'ucp-collapsible' : ''}" data-ucp-id="${id}" data-collapsed="${shouldCollapse}" data-not-code="true" data-content-type="filetree" data-no-insert="true">
  <div class="ucp-filetree-header">
    <div class="ucp-filetree-header-left">
      <span class="ucp-filetree-icon">📁</span>
      <span class="ucp-filetree-label">${labelText}</span>
      <span class="ucp-filetree-count">${lineCount} items</span>
    </div>
    <div class="ucp-filetree-actions">
      ${shouldCollapse ? `
        <button class="ucp-btn ucp-toggle-btn" data-action="toggle" title="Expand/Collapse">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      ` : ''}
      <button class="ucp-btn ucp-copy-btn" data-action="copy" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  </div>
  <div class="ucp-filetree-body">
    <div class="ucp-filetree-content">${styledContent}</div>
  </div>
  ${shouldCollapse ? `
    <div class="ucp-expand-bar">
      <button class="ucp-expand-btn" data-action="toggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="ucp-expand-text">Show all ${lineCount} items</span>
      </button>
    </div>
  ` : ''}
  <textarea class="ucp-hidden-code" data-not-code="true">${escapeHtml(code)}</textarea>
</div>`;
}

/**
 * Convert plain text file tree to styled HTML with icons
 */
function convertToStyledFileTree(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];
  
  for (const line of lines) {
    if (!line.trim()) {
      result.push('<div class="ucp-tree-line ucp-tree-empty">&nbsp;</div>');
      continue;
    }
    
    // Extract the tree prefix (├── │ └── etc) and the name
    const match = line.match(/^([\s│|├└┬┼─+`\-]*)(.*)$/);
    if (!match) {
      result.push(`<div class="ucp-tree-line">${escapeHtml(line)}</div>`);
      continue;
    }
    
    const [, prefix, name] = match;
    const trimmedName = name.trim();
    
    // Determine if folder or file
    const isFolder = trimmedName.endsWith('/') || 
                     trimmedName.includes('(') && trimmedName.includes('files)') ||
                     /^[📁📂🗂️]/.test(trimmedName) ||
                     !trimmedName.includes('.');
    
    // Get appropriate icon
    const icon = getFileIcon(trimmedName, isFolder);
    
    // Style the prefix (tree lines)
    const styledPrefix = escapeHtml(prefix)
      .replace(/[├└┬┼]/g, '<span class="ucp-tree-branch">$&</span>')
      .replace(/[─]/g, '<span class="ucp-tree-dash">$&</span>')
      .replace(/[│|]/g, '<span class="ucp-tree-pipe">$&</span>');
    
    // Clean the name (remove existing emojis)
    const cleanName = trimmedName.replace(/^[📁📂📄🗂️🗃️]\s*/, '');
    
    // Style based on file type
    const nameClass = isFolder ? 'ucp-tree-folder' : 'ucp-tree-file';
    const extension = cleanName.split('.').pop()?.toLowerCase() || '';
    const extClass = extension ? `ucp-tree-ext-${extension}` : '';
    
    result.push(`
      <div class="ucp-tree-line">
        <span class="ucp-tree-prefix">${styledPrefix}</span>
        <span class="ucp-tree-icon">${icon}</span>
        <span class="${nameClass} ${extClass}">${escapeHtml(cleanName)}</span>
      </div>
    `);
  }
  
  return result.join('');
}

/**
 * Get appropriate icon for file/folder
 */
function getFileIcon(name: string, isFolder: boolean): string {
  if (isFolder) {
    if (name.includes('node_modules')) return '📦';
    if (name.includes('src')) return '📂';
    if (name.includes('test')) return '🧪';
    if (name.includes('dist') || name.includes('build')) return '📤';
    if (name.includes('config')) return '⚙️';
    return '📁';
  }
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    // Code files
    ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️',
    py: '🐍', rs: '🦀', go: '🔵', java: '☕',
    html: '🌐', css: '🎨', scss: '🎨', sass: '🎨',
    json: '📋', yaml: '📋', yml: '📋', toml: '📋',
    md: '📝', txt: '📄', 
    // Config files
    gitignore: '🙈', env: '🔐', lock: '🔒',
    // Arduino/embedded
    ino: '🔌', h: '📘', c: '📘', cpp: '📘',
    // Other
    svg: '🖼️', png: '🖼️', jpg: '🖼️', gif: '🖼️',
    sh: '⚡', bash: '⚡',
  };
  
  return iconMap[ext] || '📄';
}

// ============================================================================
// CODE BLOCK RENDERER (unchanged for actual code)
// ============================================================================

function createCodeBlockHTML(code: string, lang: string, noInsert: boolean = false): string {
  const id = `codeblock-${Date.now()}-${blockId++}`;
  const lines = code.split('\n');
  const lineCount = lines.length;
  const shouldCollapse = lineCount > CONFIG.COLLAPSE_THRESHOLD;
  const filename = detectFilename(code, lang);
  const langColor = LANG_COLORS[lang] || '#858585';
  
  const lineNumbersHTML = lines.map((_, i) => 
    `<div class="ucp-line-num">${i + 1}</div>`
  ).join('');
  
  const escapedCode = escapeHtml(code);
  
  const filenameBadge = filename 
    ? `<span class="ucp-filename">${filename}</span>` 
    : '';

  // ⭐ FIX: Skip insert button for plaintext/documentation
  const insertButton = noInsert ? '' : `
      <button class="ucp-btn ucp-insert-btn" data-action="insert" title="Insert to editor">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"></path>
        </svg>
      </button>`;

  return `
<div class="ucp-block ${shouldCollapse ? 'ucp-collapsible' : ''}" data-ucp-id="${id}" data-collapsed="${shouldCollapse}" data-no-insert="${noInsert}" data-language="${lang}">
  <div class="ucp-header">
    <div class="ucp-header-left">
      <span class="ucp-lang-dot" style="background-color: ${langColor}"></span>
      <span class="ucp-lang-name">${lang.toUpperCase()}</span>
      ${filenameBadge}
      <span class="ucp-line-count">${lineCount} lines</span>
    </div>
    <div class="ucp-header-actions">
      ${shouldCollapse ? `
        <button class="ucp-btn ucp-toggle-btn" data-action="toggle" title="Expand/Collapse">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      ` : ''}
      <button class="ucp-btn ucp-copy-btn" data-action="copy" title="Copy code">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>${insertButton}
    </div>
  </div>
  <div class="ucp-body">
    <div class="ucp-line-numbers">${lineNumbersHTML}</div>
    <div class="ucp-code-scroll">
      <pre class="ucp-pre"><code class="ucp-code language-${lang}">${escapedCode}</code></pre>
    </div>
  </div>
  ${shouldCollapse ? `
    <div class="ucp-expand-bar">
      <button class="ucp-expand-btn" data-action="toggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="ucp-expand-text">Show all ${lineCount} lines</span>
      </button>
    </div>
  ` : ''}
  <textarea class="ucp-hidden-code">${code}</textarea>
</div>`;
}

function createCompactCodeHTML(code: string, lang: string, noInsert: boolean = false): string {
  const id = `codeblock-${Date.now()}-${blockId++}`;
  const langColor = LANG_COLORS[lang] || '#858585';
  const isBash = ['bash', 'sh', 'shell'].includes(lang);
  const prefix = isBash ? '<span class="ucp-terminal-prefix">$</span>' : '';
  
  return `
<div class="ucp-compact" data-ucp-id="${id}" data-no-insert="${noInsert}" data-language="${lang}">
  <span class="ucp-lang-dot" style="background-color: ${langColor}"></span>
  <span class="ucp-lang-name">${lang.toUpperCase()}</span>
  <span class="ucp-compact-code">${prefix}${escapeHtml(code.trim())}</span>
  <button class="ucp-btn ucp-copy-btn" data-action="copy" title="Copy">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  </button>
  <textarea class="ucp-hidden-code">${code}</textarea>
</div>`;
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

function processCodeBlocks(): void {
  const preElements = document.querySelectorAll('pre:not([data-ucp-done])');
  
  if (preElements.length > 0) {
    console.log(`🔧 [CodeBlockProcessor] Processing ${preElements.length} code blocks...`);
  }
  
  preElements.forEach((pre) => {
    pre.setAttribute('data-ucp-done', 'true');
    
    const codeEl = pre.querySelector('code');
    let code = codeEl?.textContent || pre.textContent || '';
    code = code.trim();
    
    // ⭐ FIX: Clean up any language prefix garbage
    code = cleanLanguagePrefix(code);
    
    if (!code) return;
    
    let lang = 'plaintext';
    const langClass = codeEl?.className.match(/language-(\w+)/);
    if (langClass) {
      lang = langClass[1];
    }
    
    // ⭐ FIX: Auto-detect language if plaintext/text/empty
    if (lang === 'plaintext' || lang === 'text' || lang === '') {
      const detected = detectLanguage(code);
      if (detected !== 'plaintext') {
        console.log(`[CodeBlockProcessor] Auto-detected language: ${detected} (was: ${lang})`);
        lang = detected;
      }
    }
    
    // Check if this is informational content (file tree, output, etc.)
    const isInformational = isInformationalBlock(lang, code);
    
    if (isInformational) {
      // Use file tree renderer (no code controls)
      console.log(`📁 [CodeBlockProcessor] Rendering as file tree: ${lang}`);
      const html = createFileTreeHTML(code, lang);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const newElement = wrapper.firstElementChild;
      if (newElement) {
        pre.replaceWith(newElement);
      }
      return;
    }
    
    // Regular code processing
    code = restoreNewlines(code, lang);
    
    // ⭐ FIX: Don't allow insert for plaintext/documentation content
    const noInsert = lang === 'plaintext' || lang === 'text' || lang === '';
    if (noInsert) {
      console.log(`[CodeBlockProcessor] Marking ${lang} as no-insert (not real code)`);
    }
    
    const lines = code.split('\n');
    const isCompact = lines.length <= CONFIG.COMPACT_MAX_LINES && 
                      code.length < CONFIG.COMPACT_MAX_LENGTH;
    
    const html = isCompact 
      ? createCompactCodeHTML(code, lang, noInsert)
      : createCodeBlockHTML(code, lang, noInsert);
    
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const newElement = wrapper.firstElementChild;
    
    if (newElement) {
      pre.replaceWith(newElement);
    }
  });
}

// ============================================================================
// EVENT HANDLING
// ============================================================================

function handleClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const btn = target.closest('[data-action]') as HTMLElement;
  if (!btn) return;
  
  const action = btn.getAttribute('data-action');
  // Support both ucp-block and ucp-filetree containers
  const block = btn.closest('.ucp-block, .ucp-compact, .ucp-filetree') as HTMLElement;
  if (!block) return;
  
  const hiddenCode = block.querySelector('.ucp-hidden-code') as HTMLTextAreaElement;
  const code = hiddenCode?.value || '';
  
  switch (action) {
    case 'copy':
      navigator.clipboard.writeText(code).then(() => {
        btn.classList.add('ucp-success');
        setTimeout(() => btn.classList.remove('ucp-success'), 1500);
      });
      break;
      
    case 'toggle':
      const isCollapsed = block.getAttribute('data-collapsed') === 'true';
      block.setAttribute('data-collapsed', String(!isCollapsed));
      break;
      
    case 'insert':
      // Only for code blocks, not file trees
      if (block.classList.contains('ucp-filetree')) return;
      
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const selection = editor.getSelection();
        editor.executeEdits('', [{
          range: selection,
          text: code,
          forceMoveMarkers: true
        }]);
        btn.classList.add('ucp-success');
        setTimeout(() => btn.classList.remove('ucp-success'), 1500);
      }
      break;
  }
}

// ============================================================================
// HIGHLIGHT.JS LOADING
// ============================================================================

async function loadHighlightJS(): Promise<void> {
  if ((window as any).hljs) {
    console.log('✅ [CodeBlockProcessor] highlight.js already loaded');
    return;
  }
  
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css';
    document.head.appendChild(link);
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    document.head.appendChild(script);
    
    await new Promise((resolve) => {
      script.onload = resolve;
      setTimeout(resolve, 3000);
    });
    
    if ((window as any).hljs) {
      console.log('✅ [CodeBlockProcessor] highlight.js loaded');
    }
  } catch (e) {
    console.warn('[CodeBlockProcessor] highlight.js failed to load:', e);
  }
}

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('ucp-styles-v2')) return;
  
  const style = document.createElement('style');
  style.id = 'ucp-styles-v2';
  style.textContent = `
/* ============================================
   UNIFIED CODE BLOCK PROCESSOR v2.0 STYLES
   With FILETREE support
============================================ */

/* ============================================
   CODE BLOCK - For actual code
============================================ */

.ucp-block {
  position: relative !important;
  margin: 12px 0 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: #1e1e1e !important;
  border: 1px solid #3c3c3c !important;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace !important;
}

.ucp-block .ucp-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 8px 12px !important;
  background: #252526 !important;
  border-bottom: 1px solid #3c3c3c !important;
}

.ucp-block .ucp-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.ucp-block .ucp-lang-dot {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
}

.ucp-block .ucp-lang-name {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #e0e0e0 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-block .ucp-filename {
  font-size: 11px !important;
  color: #4fc3f7 !important;
  background: rgba(79, 195, 247, 0.1) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
}

.ucp-block .ucp-line-count {
  font-size: 10px !important;
  color: #808080 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-block .ucp-header-actions {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.ucp-block .ucp-btn {
  background: transparent !important;
  border: 1px solid transparent !important;
  color: #808080 !important;
  padding: 4px 6px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.15s ease !important;
}

.ucp-block .ucp-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #e0e0e0 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.ucp-block .ucp-btn.ucp-success {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4caf50 !important;
  border-color: rgba(76, 175, 80, 0.4) !important;
}

.ucp-block .ucp-body {
  display: flex !important;
  max-height: 400px !important;
  overflow: auto !important;
}

.ucp-block[data-collapsed="true"] .ucp-body {
  max-height: 55px !important; /* v13: Show 2 lines when collapsed */
  overflow: hidden !important;
}

.ucp-block .ucp-line-numbers {
  padding: 12px 0 !important;
  background: #1a1a1a !important;
  border-right: 1px solid #3c3c3c !important;
  text-align: right !important;
  user-select: none !important;
  flex-shrink: 0 !important;
}

.ucp-block .ucp-line-num {
  padding: 0 12px !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
  color: #5a5a5a !important;
}

.ucp-block .ucp-code-scroll {
  flex: 1 !important;
  overflow-x: auto !important;
}

.ucp-block .ucp-pre {
  margin: 0 !important;
  padding: 12px 16px !important;
  background: transparent !important;
}

.ucp-block .ucp-code {
  font-size: 13px !important;
  line-height: 1.5 !important;
  color: #d4d4d4 !important;
  font-family: inherit !important;
  white-space: pre !important;
}

.ucp-block[data-collapsed="true"] .ucp-body::after {
  content: '' !important;
  position: absolute !important;
  bottom: 44px !important;
  left: 0 !important;
  right: 0 !important;
  height: 60px !important;
  background: linear-gradient(to bottom, transparent, #1e1e1e) !important;
  pointer-events: none !important;
}

.ucp-block .ucp-expand-bar {
  display: flex !important;
  justify-content: center !important;
  padding: 8px !important;
  background: #252526 !important;
  border-top: 1px solid #3c3c3c !important;
}

.ucp-block[data-collapsed="false"] .ucp-expand-bar {
  display: none !important;
}

.ucp-block[data-collapsed="false"] .ucp-body {
  max-height: none !important;
}

.ucp-block .ucp-toggle-btn svg {
  transition: transform 0.2s ease !important;
}

.ucp-block[data-collapsed="false"] .ucp-toggle-btn svg {
  transform: rotate(180deg) !important;
}

.ucp-block .ucp-expand-btn {
  background: rgba(79, 195, 247, 0.1) !important;
  border: 1px solid rgba(79, 195, 247, 0.3) !important;
  color: #4fc3f7 !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  transition: all 0.2s ease !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-block .ucp-expand-btn:hover {
  background: rgba(79, 195, 247, 0.2) !important;
  border-color: rgba(79, 195, 247, 0.5) !important;
}

.ucp-hidden-code {
  display: none !important;
  visibility: hidden !important;
  position: absolute !important;
  pointer-events: none !important;
}

/* ============================================
   FILE TREE / INFORMATIONAL BLOCK
   No line numbers, no Apply/Reject buttons
============================================ */

.ucp-filetree {
  position: relative !important;
  margin: 12px 0 !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  background: linear-gradient(135deg, #1a2332 0%, #1e1e2e 100%) !important;
  border: 1px solid rgba(100, 181, 246, 0.2) !important;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace !important;
}

.ucp-filetree-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 10px 14px !important;
  background: linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(100, 181, 246, 0.05) 100%) !important;
  border-bottom: 1px solid rgba(100, 181, 246, 0.15) !important;
}

.ucp-filetree-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
}

.ucp-filetree-icon {
  font-size: 16px !important;
}

.ucp-filetree-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #64b5f6 !important;
  letter-spacing: 0.5px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-filetree-count {
  font-size: 10px !important;
  color: #808080 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  padding: 2px 8px !important;
  border-radius: 10px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-filetree-actions {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.ucp-filetree .ucp-btn {
  background: transparent !important;
  border: 1px solid transparent !important;
  color: #64b5f6 !important;
  padding: 4px 6px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.15s ease !important;
  opacity: 0.7 !important;
}

.ucp-filetree .ucp-btn:hover {
  background: rgba(100, 181, 246, 0.1) !important;
  opacity: 1 !important;
}

.ucp-filetree .ucp-btn.ucp-success {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4caf50 !important;
}

.ucp-filetree-body {
  padding: 12px 16px !important;
  max-height: 350px !important;
  overflow: auto !important;
}

.ucp-filetree[data-collapsed="true"] .ucp-filetree-body {
  max-height: 55px !important; /* v13: Show 2 lines when collapsed */
  overflow: hidden !important;
}

.ucp-filetree[data-collapsed="true"] .ucp-filetree-body::after {
  content: '' !important;
  position: absolute !important;
  bottom: 44px !important;
  left: 0 !important;
  right: 0 !important;
  height: 50px !important;
  background: linear-gradient(to bottom, transparent, #1a2332) !important;
  pointer-events: none !important;
}

.ucp-filetree[data-collapsed="false"] .ucp-filetree-body {
  max-height: 500px !important;
}

.ucp-filetree .ucp-expand-bar {
  display: flex !important;
  justify-content: center !important;
  padding: 8px !important;
  background: rgba(100, 181, 246, 0.05) !important;
  border-top: 1px solid rgba(100, 181, 246, 0.1) !important;
}

.ucp-filetree[data-collapsed="false"] .ucp-expand-bar {
  display: none !important;
}

.ucp-filetree .ucp-expand-btn {
  background: rgba(100, 181, 246, 0.1) !important;
  border: 1px solid rgba(100, 181, 246, 0.25) !important;
  color: #64b5f6 !important;
  padding: 6px 14px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  transition: all 0.2s ease !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-filetree .ucp-expand-btn:hover {
  background: rgba(100, 181, 246, 0.2) !important;
}

.ucp-filetree .ucp-toggle-btn svg {
  transition: transform 0.2s ease !important;
}

.ucp-filetree[data-collapsed="false"] .ucp-toggle-btn svg {
  transform: rotate(180deg) !important;
}

/* File tree content styling */
.ucp-filetree-content {
  font-size: 13px !important;
  line-height: 1.6 !important;
}

.ucp-tree-line {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 2px 0 !important;
  white-space: nowrap !important;
}

.ucp-tree-line:hover {
  background: rgba(100, 181, 246, 0.05) !important;
  border-radius: 4px !important;
  margin: 0 -8px !important;
  padding: 2px 8px !important;
}

.ucp-tree-empty {
  height: 8px !important;
}

.ucp-tree-prefix {
  color: #4a5568 !important;
  font-family: inherit !important;
}

.ucp-tree-branch {
  color: #64b5f6 !important;
}

.ucp-tree-dash {
  color: #4a5568 !important;
}

.ucp-tree-pipe {
  color: #4a5568 !important;
}

.ucp-tree-icon {
  font-size: 14px !important;
  width: 18px !important;
  text-align: center !important;
  flex-shrink: 0 !important;
}

.ucp-tree-folder {
  color: #64b5f6 !important;
  font-weight: 500 !important;
}

.ucp-tree-file {
  color: #d4d4d4 !important;
}

/* File extension colors */
.ucp-tree-ext-ts, .ucp-tree-ext-tsx { color: #3178c6 !important; }
.ucp-tree-ext-js, .ucp-tree-ext-jsx { color: #f7df1e !important; }
.ucp-tree-ext-py { color: #3776ab !important; }
.ucp-tree-ext-rs { color: #ce422b !important; }
.ucp-tree-ext-html { color: #e34f26 !important; }
.ucp-tree-ext-css, .ucp-tree-ext-scss { color: #1572b6 !important; }
.ucp-tree-ext-json { color: #6e7681 !important; }
.ucp-tree-ext-md { color: #083fa1 !important; }
.ucp-tree-ext-ino, .ucp-tree-ext-h, .ucp-tree-ext-c { color: #00979d !important; }

/* ============================================
   COMPACT CODE BLOCK
============================================ */

.ucp-compact {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 10px 14px !important;
  background: #1e1e1e !important;
  border: 1px solid #3c3c3c !important;
  border-radius: 6px !important;
  margin: 8px 0 !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.ucp-compact .ucp-lang-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
}

.ucp-compact .ucp-lang-name {
  font-size: 10px !important;
  font-weight: 600 !important;
  color: #808080 !important;
  padding-right: 10px !important;
  border-right: 1px solid #3c3c3c !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.ucp-compact .ucp-compact-code {
  flex: 1 !important;
  font-size: 13px !important;
  color: #d4d4d4 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ucp-compact .ucp-terminal-prefix {
  color: #4caf50 !important;
  margin-right: 8px !important;
}

.ucp-compact .ucp-btn {
  background: transparent !important;
  border: none !important;
  color: #808080 !important;
  padding: 4px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  display: flex !important;
  flex-shrink: 0 !important;
  transition: all 0.15s ease !important;
}

.ucp-compact .ucp-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #e0e0e0 !important;
}

.ucp-compact .ucp-btn.ucp-success {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4caf50 !important;
}

/* ============================================
   INLINE CODE
============================================ */

code.ucp-inline,
.ai-message code:not(.ucp-code):not(.hljs),
.message-content code:not(.ucp-code):not(.hljs),
.assistant-message code:not(.ucp-code):not(.hljs) {
  background: rgba(110, 118, 129, 0.25) !important;
  color: #79c0ff !important;
  padding: 3px 7px !important;
  border-radius: 4px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.9em !important;
}

/* ============================================
   SYNTAX HIGHLIGHTING
============================================ */

.ucp-code.hljs { background: transparent !important; }
.ucp-code .hljs-keyword { color: #569cd6 !important; }
.ucp-code .hljs-built_in { color: #4ec9b0 !important; }
.ucp-code .hljs-type { color: #4ec9b0 !important; }
.ucp-code .hljs-string { color: #ce9178 !important; }
.ucp-code .hljs-number { color: #b5cea8 !important; }
.ucp-code .hljs-literal { color: #569cd6 !important; }
.ucp-code .hljs-comment { color: #6a9955 !important; font-style: italic; }
.ucp-code .hljs-function { color: #dcdcaa !important; }
.ucp-code .hljs-title { color: #dcdcaa !important; }
.ucp-code .hljs-params { color: #9cdcfe !important; }
.ucp-code .hljs-variable { color: #9cdcfe !important; }
.ucp-code .hljs-property { color: #9cdcfe !important; }
.ucp-code .hljs-attr { color: #9cdcfe !important; }
.ucp-code .hljs-class { color: #4ec9b0 !important; }
.ucp-code .hljs-tag { color: #569cd6 !important; }

/* ============================================
   SCROLLBAR
============================================ */

.ucp-code-scroll::-webkit-scrollbar,
.ucp-body::-webkit-scrollbar,
.ucp-filetree-body::-webkit-scrollbar {
  height: 8px !important;
  width: 8px !important;
}

.ucp-code-scroll::-webkit-scrollbar-track,
.ucp-body::-webkit-scrollbar-track,
.ucp-filetree-body::-webkit-scrollbar-track {
  background: #1e1e1e !important;
}

.ucp-code-scroll::-webkit-scrollbar-thumb,
.ucp-body::-webkit-scrollbar-thumb,
.ucp-filetree-body::-webkit-scrollbar-thumb {
  background: #4a4a4a !important;
  border-radius: 4px !important;
}

/* ============================================
   HIDE OLD PROCESSOR ELEMENTS
============================================ */

.code-block-container:not([data-ucp-done]),
.code-block-header,
.code-content-wrapper {
  display: none !important;
}

/* ============================================
   RESPONSIVE
============================================ */

@media (max-width: 768px) {
  .ucp-block .ucp-line-numbers { display: none !important; }
  .ucp-block .ucp-filename { display: none !important; }
}
`;
  
  document.head.appendChild(style);
  console.log('✅ [CodeBlockProcessor] Styles v2.0 injected (with FILETREE support)');
}

// ============================================================================
// OBSERVER
// ============================================================================

let debounceTimer: number | null = null;

function setupObserver(): void {
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(processCodeBlocks, CONFIG.DEBOUNCE_MS);
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('✅ [CodeBlockProcessor] Observer active');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init(): Promise<void> {
  console.log('🚀 [CodeBlockProcessor] Initializing v2.0...');
  
  injectStyles();
  await loadHighlightJS();
  
  document.removeEventListener('click', handleClick);
  document.addEventListener('click', handleClick);
  
  processCodeBlocks();
  setupObserver();
  
  setInterval(processCodeBlocks, 2000);
  
  console.log('✅ [CodeBlockProcessor] Ready! (with FILETREE support)');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const codeBlockProcessor = {
  process: processCodeBlocks,
  refresh: processCodeBlocks,
  isFileTree: isFileTreeContent,
  isInformational: isInformationalBlock,
};

export { init as initCodeBlockProcessor };

if (typeof window !== 'undefined') {
  (window as any).codeBlockProcessor = codeBlockProcessor;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }
}

export default codeBlockProcessor;
