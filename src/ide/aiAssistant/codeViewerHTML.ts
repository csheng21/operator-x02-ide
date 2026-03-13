// codeViewerHTML.ts - Professional Code HTML Viewer

import { escapeHtml } from './assistantUI';

/**
 * Main function to display code in HTML viewer
 */
export async function displayCodeAsHTML(code: string, language: string): Promise<void> {
  const lines = code.split('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `code-${language}-${timestamp}.html`;
  
  // Generate syntax-highlighted HTML
  const highlightedCode = syntaxHighlightCode(code, language);
  
  // Create professional code HTML document
  const htmlContent = generateCodeHTMLDocument(highlightedCode, language, lines.length, filename, code);
  
  // Create and show viewer modal
  createCodeViewerModal(htmlContent, filename);
}

/**
 * Basic syntax highlighting for common languages
 */
function syntaxHighlightCode(code: string, language: string): string {
  const lines = code.split('\n');
  
  return lines.map(line => {
    let highlighted = escapeHtml(line);
    
    // Comments (must be first to avoid conflicts)
    highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="comment">$1</span>');
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    
    // Strings (with proper escaping)
    highlighted = highlighted.replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="string">$1</span>');
    
    // Keywords based on language
    const keywords = getLanguageKeywords(language);
    if (keywords.length > 0) {
      const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
      highlighted = highlighted.replace(keywordRegex, '<span class="keyword">$1</span>');
    }
    
    // Numbers
    highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
    
    // Functions (before other identifiers)
    highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
    
    return highlighted;
  }).join('\n');
}

/**
 * Get keywords for specific programming language
 */
function getLanguageKeywords(language: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'new', 'this', 'super', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'finally', 'typeof', 'instanceof', 'delete', 'in', 'of', 'void', 'null', 'undefined', 'true', 'false'],
    
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'new', 'this', 'super', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'finally', 'typeof', 'instanceof', 'interface', 'type', 'enum', 'namespace', 'public', 'private', 'protected', 'readonly', 'static', 'abstract', 'implements', 'as', 'any', 'unknown', 'never', 'void', 'null', 'undefined', 'true', 'false'],
    
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'break', 'continue', 'pass', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'assert', 'del', 'global', 'nonlocal', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'async', 'await'],
    
    java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'abstract', 'final', 'static', 'void', 'int', 'long', 'short', 'byte', 'char', 'float', 'double', 'boolean', 'String', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'try', 'catch', 'throw', 'throws', 'finally', 'import', 'package', 'true', 'false', 'null'],
    
    cpp: ['class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'void', 'int', 'long', 'short', 'char', 'float', 'double', 'bool', 'auto', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'namespace', 'using', 'template', 'typename', 'const', 'static', 'extern', 'inline', 'constexpr', 'nullptr', 'true', 'false', 'new', 'delete', 'this'],
    
    c: ['void', 'int', 'long', 'short', 'char', 'float', 'double', 'unsigned', 'signed', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'goto', 'struct', 'union', 'enum', 'typedef', 'const', 'static', 'extern', 'register', 'sizeof', 'volatile', 'auto'],
    
    go: ['package', 'import', 'func', 'var', 'const', 'type', 'struct', 'interface', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break', 'continue', 'defer', 'go', 'chan', 'select', 'map', 'make', 'new', 'nil', 'true', 'false'],
    
    rust: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl', 'pub', 'use', 'mod', 'crate', 'super', 'self', 'Self', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'break', 'continue', 'where', 'async', 'await', 'move', 'ref', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],
    
    php: ['function', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'namespace', 'use', 'try', 'catch', 'throw', 'new', 'this', 'parent', 'self', 'true', 'false', 'null', 'array', 'echo', 'print', 'require', 'include'],
    
    ruby: ['def', 'end', 'class', 'module', 'return', 'if', 'else', 'elsif', 'unless', 'case', 'when', 'for', 'while', 'until', 'break', 'next', 'redo', 'retry', 'rescue', 'ensure', 'raise', 'yield', 'self', 'super', 'true', 'false', 'nil', 'and', 'or', 'not', 'begin', 'do'],
    
    swift: ['func', 'var', 'let', 'class', 'struct', 'enum', 'protocol', 'extension', 'return', 'if', 'else', 'guard', 'switch', 'case', 'for', 'while', 'repeat', 'break', 'continue', 'fallthrough', 'import', 'init', 'deinit', 'self', 'Self', 'super', 'true', 'false', 'nil', 'try', 'catch', 'throw', 'throws', 'async', 'await'],
    
    kotlin: ['fun', 'val', 'var', 'class', 'interface', 'object', 'data', 'sealed', 'return', 'if', 'else', 'when', 'for', 'while', 'do', 'break', 'continue', 'try', 'catch', 'throw', 'finally', 'import', 'package', 'public', 'private', 'protected', 'internal', 'abstract', 'open', 'override', 'this', 'super', 'true', 'false', 'null'],
    
    html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'label', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main'],
    
    css: ['color', 'background', 'font', 'margin', 'padding', 'border', 'width', 'height', 'display', 'position', 'top', 'right', 'bottom', 'left', 'flex', 'grid', 'align', 'justify', 'transition', 'animation', 'transform', 'opacity', 'z-index', 'overflow', 'cursor', 'box-shadow', 'text-align', 'font-size', 'font-weight', 'line-height'],
    
    sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'DISTINCT', 'LIMIT', 'OFFSET'],
    
    json: ['true', 'false', 'null']
  };
  
  return keywordMap[language.toLowerCase()] || [];
}

/**
 * Get file extension based on language
 */
function getFileExtension(language: string): string {
  const extensions: { [key: string]: string } = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    yaml: 'yml',
    markdown: 'md',
    bash: 'sh',
    powershell: 'ps1'
  };
  
  return extensions[language.toLowerCase()] || 'txt';
}

/**
 * Generate complete HTML document for code viewing
 */
function generateCodeHTMLDocument(
  highlightedCode: string, 
  language: string, 
  lineCount: number, 
  filename: string,
  originalCode: string
): string {
  const fileExtension = getFileExtension(language);
  const downloadFilename = filename.replace('.html', `.${fileExtension}`);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
      background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
      color: #e1e1e1;
      min-height: 100vh;
      padding: 0;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #1e1e1e;
      min-height: 100vh;
      box-shadow: 0 0 60px rgba(0, 0, 0, 0.5);
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #252526 0%, #2d2d2d 100%);
      padding: 20px 30px;
      border-bottom: 2px solid #4fc3f7;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .language-badge {
      background: linear-gradient(135deg, #4fc3f7, #42a5f5);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
    }
    
    .file-info {
      color: #858585;
      font-size: 13px;
    }
    
    .file-info .filename {
      color: #4fc3f7;
      font-weight: 600;
      margin-right: 12px;
    }
    
    .file-info .line-count {
      color: #999;
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-btn {
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.3);
      color: #4fc3f7;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .action-btn:hover {
      background: rgba(79, 195, 247, 0.2);
      border-color: #4fc3f7;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 195, 247, 0.3);
    }
    
    .action-btn:active {
      transform: translateY(0);
    }
    
    .action-btn.success {
      background: rgba(76, 175, 80, 0.2);
      border-color: #4caf50;
      color: #4caf50;
    }
    
    /* Code Container */
    .code-wrapper {
      display: flex;
      background: #1e1e1e;
      overflow-x: auto;
    }
    
    /* Line Numbers */
    .line-numbers {
      background: #252526;
      color: #858585;
      padding: 20px 0;
      text-align: right;
      user-select: none;
      border-right: 2px solid #333;
      min-width: 60px;
      font-size: 13px;
    }
    
    .line-numbers .line-number {
      padding: 0 16px;
      display: block;
      line-height: 1.6;
      transition: all 0.2s;
    }
    
    .line-numbers .line-number:hover {
      background: rgba(79, 195, 247, 0.08);
      color: #4fc3f7;
    }
    
    /* Code Content */
    .code-content {
      flex: 1;
      padding: 20px 24px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.6;
    }
    
    .code-content pre {
      margin: 0;
      font-family: inherit;
      color: #d4d4d4;
      white-space: pre;
    }
    
    /* Syntax Highlighting */
    .keyword {
      color: #569cd6;
      font-weight: 600;
    }
    
    .string {
      color: #ce9178;
    }
    
    .comment {
      color: #6a9955;
      font-style: italic;
    }
    
    .number {
      color: #b5cea8;
    }
    
    .function {
      color: #dcdcaa;
      font-weight: 500;
    }
    
    /* Scrollbars */
    .code-wrapper::-webkit-scrollbar,
    .code-content::-webkit-scrollbar {
      height: 12px;
      width: 12px;
    }
    
    .code-wrapper::-webkit-scrollbar-track,
    .code-content::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    .code-wrapper::-webkit-scrollbar-thumb,
    .code-content::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, #4fc3f7, #42a5f5);
      border-radius: 6px;
      border: 2px solid #1e1e1e;
    }
    
    .code-wrapper::-webkit-scrollbar-thumb:hover,
    .code-content::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(135deg, #42a5f5, #2196f3);
    }
    
    /* Footer */
    .footer {
      background: #252526;
      padding: 16px 30px;
      border-top: 1px solid #333;
      text-align: center;
      color: #858585;
      font-size: 12px;
    }
    
    .footer a {
      color: #4fc3f7;
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .footer a:hover {
      color: #42a5f5;
    }
    
    /* Print Styles */
    @media print {
      .header-actions,
      .footer {
        display: none;
      }
      
      .header {
        position: static;
        border: none;
      }
      
      body {
        background: white;
      }
      
      .container {
        box-shadow: none;
      }
      
      .code-content {
        color: black;
      }
      
      .keyword { color: #0000cd; }
      .string { color: #a31515; }
      .comment { color: #008000; }
      .number { color: #098658; }
      .function { color: #795e26; }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 16px;
        padding: 16px 20px;
      }
      
      .header-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
      }
      
      .header-actions {
        width: 100%;
        justify-content: space-between;
      }
      
      .action-btn {
        flex: 1;
        justify-content: center;
        padding: 12px 16px;
        font-size: 12px;
      }
      
      .line-numbers {
        min-width: 40px;
        font-size: 11px;
      }
      
      .code-content {
        padding: 16px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <div class="language-badge">${language.toUpperCase()}</div>
        <div class="file-info">
          <span class="filename">${downloadFilename}</span>
          <span class="line-count">${lineCount} lines</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" onclick="copyCode()" id="copy-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy Code
        </button>
        <button class="action-btn" onclick="downloadCode()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download
        </button>
        <button class="action-btn" onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print
        </button>
      </div>
    </div>
    
    <div class="code-wrapper">
      <div class="line-numbers">
        ${Array.from({ length: lineCount }, (_, i) => 
          `<span class="line-number">${i + 1}</span>`
        ).join('')}
      </div>
      <div class="code-content">
        <pre><code>${highlightedCode}</code></pre>
      </div>
    </div>
    
    <div class="footer">
      Generated on ${new Date().toLocaleString()} • Powered by AI IDE Code Viewer
    </div>
  </div>
  
  <script>
    const codeContent = ${JSON.stringify(originalCode)};
    const fileName = ${JSON.stringify(downloadFilename)};
    
    function copyCode() {
      navigator.clipboard.writeText(codeContent).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        btn.classList.add('success');
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('success');
        }, 2000);
      }).catch(err => {
        alert('Failed to copy code: ' + err);
      });
    }
    
    function downloadCode() {
      const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection().toString()) {
        e.preventDefault();
        copyCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>`;
}
/**
 * Create and display code viewer modal
 */
function createCodeViewerModal(htmlContent: string, filename: string): void {
  // Remove any existing viewer
  const existingViewer = document.getElementById('code-html-viewer');
  if (existingViewer) {
    existingViewer.remove();
  }
  
  const viewer = document.createElement('div');
  viewer.id = 'code-html-viewer';
  viewer.className = 'code-html-viewer-modal';
  
  // DON'T escape htmlContent - it's already valid HTML
  // Instead, escape only for attribute safety
  const escapedForAttribute = htmlContent.replace(/"/g, '&quot;');
  
  viewer.innerHTML = `
    <div class="code-viewer-overlay"></div>
    <div class="code-viewer-container">
      <div class="code-viewer-header">
        <div class="viewer-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>Code Preview</span>
          <span class="viewer-filename">${escapeHtml(filename)}</span>
        </div>
        <button class="viewer-close-btn" onclick="this.closest('.code-html-viewer-modal').remove()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="code-viewer-content">
        <iframe id="code-preview-iframe" style="width: 100%; height: 100%; border: none;"></iframe>
      </div>
    </div>
  `;
  
  document.body.appendChild(viewer);
  
  // Set iframe content AFTER it's in the DOM
  const iframe = viewer.querySelector('#code-preview-iframe') as HTMLIFrameElement;
  if (iframe) {
    // Use srcdoc directly without escaping
    iframe.srcdoc = htmlContent;
  }
  
  // Add styles for modal
  addCodeViewerModalStyles();
  
  // Close on overlay click
  const overlay = viewer.querySelector('.code-viewer-overlay');
  overlay?.addEventListener('click', () => viewer.remove());
  
  // ESC key to close
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      viewer.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Animate in
  setTimeout(() => {
    viewer.classList.add('active');
  }, 10);
}

/**
 * Add styles for code viewer modal
 */
function addCodeViewerModalStyles(): void {
  if (document.getElementById('code-viewer-modal-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'code-viewer-modal-styles';
  styles.textContent = `
    .code-html-viewer-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .code-html-viewer-modal.active {
      opacity: 1;
    }
    
    .code-viewer-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
    }
    
    .code-viewer-container {
      position: relative;
      width: 95%;
      height: 90%;
      max-width: 1600px;
      max-height: 900px;
      background: #1e1e1e;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }
    
    .code-html-viewer-modal.active .code-viewer-container {
      transform: scale(1);
    }
    
    .code-viewer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #252526, #2d2d2d);
      border-bottom: 2px solid #4fc3f7;
    }
    
    .viewer-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #4fc3f7;
      font-weight: 600;
      font-size: 14px;
    }
    
    .viewer-filename {
      color: #858585;
      font-weight: 400;
      font-size: 12px;
    }
    
    .viewer-close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .viewer-close-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      color: #ff6b6b;
    }
    
    .code-viewer-content {
      flex: 1;
      overflow: hidden;
    }
    
    @media (max-width: 768px) {
      .code-viewer-container {
        width: 98%;
        height: 95%;
        border-radius: 8px;
      }
    }
  `;
  
  document.head.appendChild(styles);
}