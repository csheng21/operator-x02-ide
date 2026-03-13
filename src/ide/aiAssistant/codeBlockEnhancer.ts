// codeBlockEnhancer.ts
// ============================================================================
// SIMPLE CODE BLOCK ENHANCER - With Download Button!
// FIXED: Remove <br> tags from code content (both HTML and literal text)
// FIXED: High z-index for button clickability
// ============================================================================

console.log('🎨 [CBE] Loading...');

// ============================================================================
// LANGUAGE CONFIGURATIONS
// ============================================================================

const LANG_COLORS: Record<string, string> = {
  typescript: '#3178c6', tsx: '#3178c6',
  javascript: '#f7df1e', jsx: '#f7df1e',
  python: '#3776ab', rust: '#ce422b',
  go: '#00add8', java: '#ed8b00',
  html: '#e34f26', css: '#1572b6',
  json: '#6e7681', bash: '#4caf50',
  sh: '#4caf50', shell: '#4caf50',
  sql: '#e38c00', plaintext: '#858585',
};

const LANG_EXTENSIONS: Record<string, string> = {
  typescript: 'ts', tsx: 'tsx',
  javascript: 'js', jsx: 'jsx',
  python: 'py', rust: 'rs',
  go: 'go', java: 'java',
  html: 'html', css: 'css',
  scss: 'scss', less: 'less',
  json: 'json', xml: 'xml',
  yaml: 'yaml', yml: 'yml',
  markdown: 'md', md: 'md',
  bash: 'sh', sh: 'sh', shell: 'sh',
  sql: 'sql', c: 'c', cpp: 'cpp',
  csharp: 'cs', ruby: 'rb', php: 'php',
  swift: 'swift', kotlin: 'kt',
  plaintext: 'txt', text: 'txt',
};

// ============================================================================
// ICONS (SVG)
// ============================================================================

const ICONS = {
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  expand: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,
  collapse: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="18 15 12 9 6 15"/>
  </svg>`,
  insert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function cbeEscapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Clean code content - remove <br> tags (both as HTML elements AND as literal text)
function cbeCleanCode(pre: HTMLElement): string {
  // Method 1: Clone and replace <br> HTML elements with newlines
  const clone = pre.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('br').forEach(br => {
    const textNode = document.createTextNode('\n');
    br.parentNode?.replaceChild(textNode, br);
  });
  
  // Get text content
  let code = clone.textContent || '';
  
  // Method 2: Also remove literal <br> text that might be in the content
  // This handles cases where <br> appears as actual text, not HTML
  code = code
    .replace(/<br\s*\/?>/gi, '\n')      // <br>, <br/>, <br />
    .replace(/&lt;br\s*\/?&gt;/gi, '\n') // &lt;br&gt;, &lt;br/&gt;
    .replace(/\{<br>\}/gi, '\n')         // {<br>}
    .replace(/<br>/gi, '\n')             // Plain <br>
    .replace(/<\/br>/gi, '\n');          // </br>
  
  // Normalize line endings
  code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove excessive blank lines (more than 2 in a row)
  code = code.replace(/\n{3,}/g, '\n\n');
  
  return code;
}

function cbeDetectLanguage(code: string): string {
  if (/\binterface\b|\btype\s+\w+\s*=|:\s*(string|number|boolean)/.test(code)) return 'typescript';
  if (/\bfunction\b|\bconst\b|\blet\b|=>/.test(code)) return 'javascript';
  if (/\bdef\b|\bclass\b.*:/.test(code)) return 'python';
  if (/\bfn\b|\blet\s+mut\b/.test(code)) return 'rust';
  if (/[.#][\w-]+\s*\{/.test(code)) return 'css';
  if (/<\/?[a-z]/i.test(code)) return 'html';
  if (/^\s*[\[{]/.test(code)) return 'json';
  if (/npm |git |cd /.test(code)) return 'bash';
  return 'plaintext';
}

function cbeGenerateFilename(code: string, lang: string): string {
  const ext = LANG_EXTENSIONS[lang.toLowerCase()] || 'txt';
  
  const patterns = [
    /^\/\/\s*([\w.-]+\.\w+)\s*$/m,
    /^\/\*\s*([\w.-]+\.\w+)\s*\*\/\s*$/m,
    /^#\s*([\w.-]+\.\w+)\s*$/m,
    /^<!--\s*([\w.-]+\.\w+)\s*-->\s*$/m,
    /@file(?:name)?\s+([\w.-]+\.\w+)/i,
    /File:\s*([\w.-]+\.\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  let baseName = 'code';
  
  const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/);
  const classMatch = code.match(/(?:class|interface|type)\s+(\w+)/);
  const functionMatch = code.match(/(?:function|const|let|var)\s+(\w+)\s*[=(]/);
  const moduleMatch = code.match(/module\.exports\s*=\s*{\s*(\w+)/);
  
  if (componentMatch) baseName = componentMatch[1];
  else if (classMatch) baseName = classMatch[1];
  else if (functionMatch) baseName = functionMatch[1];
  else if (moduleMatch) baseName = moduleMatch[1];
  
  baseName = baseName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${baseName}.${ext}`;
}

function cbeDownloadCode(code: string, filename: string): void {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log(`📥 [CBE] Downloaded: ${filename}`);
}

// ============================================================================
// MAIN ENHANCEMENT FUNCTION
// ============================================================================

function cbeEnhanceBlock(pre: HTMLElement): void {
  // Clean the code - remove <br> tags properly
  let code = cbeCleanCode(pre);
  
  if (!code.trim()) return;
  
  const codeEl = pre.querySelector('code');
  let lang = 'plaintext';
  const langMatch = codeEl?.className.match(/language-(\w+)/);
  if (langMatch) lang = langMatch[1];
  else lang = cbeDetectLanguage(code);
  
  const lines = code.split('\n');
  const lineCount = lines.length;
  const shouldCollapse = lineCount > 5;
  const langColor = LANG_COLORS[lang] || '#858585';
  const id = 'cbe-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  
  const lineNums = lines.map((_, i) => `<div class="cbe-ln">${i + 1}</div>`).join('');
  
  const wrapper = document.createElement('div');
  wrapper.className = 'cbe-wrapper';
  wrapper.setAttribute('data-id', id);
  wrapper.setAttribute('data-lang', lang);
  wrapper.setAttribute('data-collapsed', String(shouldCollapse));
  
  wrapper.innerHTML = `
    <div class="cbe-head">
      <div class="cbe-left">
        <span class="cbe-dot" style="background:${langColor}"></span>
        <span class="cbe-lang">${lang.toUpperCase()}</span>
        <span class="cbe-count">${lineCount} lines</span>
      </div>
      <div class="cbe-btns">
        ${shouldCollapse ? `<button class="cbe-btn" data-act="toggle" title="Expand/Collapse">${ICONS.expand}</button>` : ''}
        <button class="cbe-btn" data-act="download" title="Download">${ICONS.download}</button>
        <button class="cbe-btn" data-act="copy" title="Copy">${ICONS.copy}</button>
        <button class="cbe-btn" data-act="insert" title="Insert to Editor">${ICONS.insert}</button>
      </div>
    </div>
    <div class="cbe-body">
      <div class="cbe-nums">${lineNums}</div>
      <div class="cbe-scroll">
        <pre class="cbe-pre"><code class="cbe-code language-${lang}">${cbeEscapeHtml(code)}</code></pre>
      </div>
    </div>
    ${shouldCollapse ? `
      <div class="cbe-expand">
        <button class="cbe-expand-btn" data-act="toggle">${ICONS.expand} Show all ${lineCount} lines</button>
      </div>
    ` : ''}
    <textarea class="cbe-data">${code}</textarea>
  `;
  
  pre.replaceWith(wrapper);
  console.log(`✅ [CBE] Enhanced: ${lang}, ${lineCount} lines`);
}

// ============================================================================
// PROCESS ALL CODE BLOCKS
// ============================================================================

function cbeProcessAll(): void {
  const allPres = document.querySelectorAll('pre:not([data-cbe])');
  
  allPres.forEach(pre => {
    if (pre.closest('.cbe-wrapper')) return;
    if (pre.classList.contains('cbe-pre')) return;
    
    pre.setAttribute('data-cbe', 'done');
    cbeEnhanceBlock(pre as HTMLElement);
  });
}

// ============================================================================
// CLICK HANDLER
// ============================================================================

function cbeHandleClick(e: Event): void {
  const target = e.target as HTMLElement;
  const btn = target.closest('.cbe-btn, .cbe-expand-btn') as HTMLElement;
  if (!btn) return;
  
  const act = btn.getAttribute('data-act');
  if (!act) return;
  
  const wrapper = btn.closest('.cbe-wrapper') as HTMLElement;
  if (!wrapper) return;
  
  // Stop event from bubbling
  e.preventDefault();
  e.stopPropagation();
  
  const textarea = wrapper.querySelector('.cbe-data') as HTMLTextAreaElement;
  const code = textarea?.value || '';
  const lang = wrapper.getAttribute('data-lang') || 'plaintext';
  
  // COPY
  if (act === 'copy') {
    navigator.clipboard.writeText(code).then(() => {
      btn.innerHTML = ICONS.check;
      btn.classList.add('success');
      setTimeout(() => { 
        btn.innerHTML = ICONS.copy;
        btn.classList.remove('success');
      }, 2000);
    });
  }
  
  // DOWNLOAD
  if (act === 'download') {
    const filename = cbeGenerateFilename(code, lang);
    cbeDownloadCode(code, filename);
    btn.innerHTML = ICONS.check;
    btn.classList.add('success');
    setTimeout(() => { 
      btn.innerHTML = ICONS.download;
      btn.classList.remove('success');
    }, 2000);
  }
  
  // INSERT
  if (act === 'insert') {
    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      const editors = monaco.editor.getEditors?.() || [];
      if (editors.length > 0) {
        const editor = editors[0];
        const selection = editor.getSelection();
        const position = selection ? selection.getStartPosition() : editor.getPosition();
        
        editor.executeEdits('cbe-insert', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: code,
          forceMoveMarkers: true
        }]);
        
        btn.innerHTML = ICONS.check;
        btn.classList.add('success');
        setTimeout(() => { 
          btn.innerHTML = ICONS.insert;
          btn.classList.remove('success');
        }, 2000);
      } else {
        navigator.clipboard.writeText(code);
        btn.innerHTML = ICONS.copy;
        setTimeout(() => { btn.innerHTML = ICONS.insert; }, 2000);
      }
    } else {
      navigator.clipboard.writeText(code);
      btn.innerHTML = ICONS.copy;
      setTimeout(() => { btn.innerHTML = ICONS.insert; }, 2000);
    }
  }
  
  // TOGGLE
  if (act === 'toggle') {
    const isCollapsed = wrapper.getAttribute('data-collapsed') === 'true';
    wrapper.setAttribute('data-collapsed', String(!isCollapsed));
    
    const expandBtn = wrapper.querySelector('.cbe-expand-btn');
    const lineCount = wrapper.querySelectorAll('.cbe-ln').length;
    if (expandBtn) {
      expandBtn.innerHTML = isCollapsed 
        ? `${ICONS.collapse} Show less` 
        : `${ICONS.expand} Show all ${lineCount} lines`;
    }
    
    const toggleBtn = wrapper.querySelector('.cbe-btn[data-act="toggle"]');
    if (toggleBtn) {
      toggleBtn.innerHTML = isCollapsed ? ICONS.collapse : ICONS.expand;
    }
  }
}

// ============================================================================
// INJECT STYLES - HIGH Z-INDEX FOR BUTTONS
// ============================================================================

function cbeInjectStyles(): void {
  if (document.getElementById('cbe-css-v5')) return;
  
  // Remove old versions
  ['cbe-css', 'cbe-css-v2', 'cbe-css-v3', 'cbe-css-v4'].forEach(id => {
    const old = document.getElementById(id);
    if (old) old.remove();
  });
  
  const style = document.createElement('style');
  style.id = 'cbe-css-v5';
  style.textContent = `
    .cbe-wrapper {
      background: #1e1e1e !important;
      border: 1px solid #3c3c3c !important;
      border-radius: 8px !important;
      margin: 12px 0 !important;
      overflow: hidden !important;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
      position: relative !important;
      z-index: 10 !important;
    }
    
    .cbe-head {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 6px 12px !important;
      background: #2d2d2d !important;
      border-bottom: 1px solid #3c3c3c !important;
      min-height: 32px !important;
      position: relative !important;
      z-index: 100 !important;
    }
    
    .cbe-left {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    
    .cbe-dot {
      width: 10px !important;
      height: 10px !important;
      border-radius: 50% !important;
      flex-shrink: 0 !important;
    }
    
    .cbe-lang {
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #a0a0a0 !important;
      letter-spacing: 0.5px !important;
    }
    
    .cbe-count {
      font-size: 11px !important;
      color: #666 !important;
    }
    
    .cbe-btns {
      display: flex !important;
      gap: 4px !important;
      align-items: center !important;
      position: relative !important;
      z-index: 110 !important;
    }
    
    .cbe-btn {
      background: transparent !important;
      border: none !important;
      color: #888 !important;
      padding: 5px 7px !important;
      cursor: pointer !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.15s ease !important;
      position: relative !important;
      z-index: 120 !important;
      pointer-events: auto !important;
    }
    
    .cbe-btn:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
    }
    
    .cbe-btn:active {
      transform: scale(0.95) !important;
    }
    
    .cbe-btn.success {
      color: #4caf50 !important;
      background: rgba(76, 175, 80, 0.15) !important;
    }
    
    .cbe-btn svg {
      width: 14px !important;
      height: 14px !important;
      pointer-events: none !important;
    }
    
    .cbe-body {
      display: flex !important;
      overflow: hidden !important;
      transition: max-height 0.3s ease !important;
    }
    
    .cbe-wrapper[data-collapsed="true"] .cbe-body {
      max-height: 120px !important;
    }
    
    .cbe-wrapper[data-collapsed="false"] .cbe-body {
      max-height: none !important;
    }
    
    .cbe-nums {
      display: flex !important;
      flex-direction: column !important;
      padding: 12px 0 !important;
      background: #1a1a1a !important;
      border-right: 1px solid #3c3c3c !important;
      min-width: 40px !important;
      user-select: none !important;
    }
    
    .cbe-ln {
      color: #606060 !important;
      font-size: 12px !important;
      line-height: 1.5 !important;
      padding: 0 10px !important;
      text-align: right !important;
    }
    
    .cbe-scroll {
      flex: 1 !important;
      overflow-x: auto !important;
    }
    
    .cbe-pre {
      margin: 0 !important;
      padding: 12px !important;
      background: transparent !important;
      border: none !important;
    }
    
    .cbe-code {
      font-size: 13px !important;
      line-height: 1.5 !important;
      color: #d4d4d4 !important;
      white-space: pre !important;
    }
    
    .cbe-expand {
      display: flex !important;
      justify-content: center !important;
      padding: 8px !important;
      background: linear-gradient(transparent, #1e1e1e 30%) !important;
      margin-top: -40px !important;
      padding-top: 50px !important;
      position: relative !important;
      z-index: 50 !important;
    }
    
    .cbe-wrapper[data-collapsed="false"] .cbe-expand {
      background: #262626 !important;
      border-top: 1px solid #3c3c3c !important;
      margin-top: 0 !important;
      padding-top: 8px !important;
    }
    
    .cbe-expand-btn {
      background: rgba(79, 195, 247, 0.1) !important;
      border: 1px solid rgba(79, 195, 247, 0.3) !important;
      color: #4fc3f7 !important;
      padding: 6px 14px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      transition: all 0.15s ease !important;
      position: relative !important;
      z-index: 60 !important;
      pointer-events: auto !important;
    }
    
    .cbe-expand-btn:hover {
      background: rgba(79, 195, 247, 0.2) !important;
    }
    
    .cbe-expand-btn svg {
      width: 12px !important;
      height: 12px !important;
      pointer-events: none !important;
    }
    
    .cbe-data {
      display: none !important;
    }
    
    /* Syntax Highlighting */
    .cbe-code .hljs-keyword { color: #569cd6 !important; }
    .cbe-code .hljs-string { color: #ce9178 !important; }
    .cbe-code .hljs-number { color: #b5cea8 !important; }
    .cbe-code .hljs-comment { color: #6a9955 !important; }
    .cbe-code .hljs-function { color: #dcdcaa !important; }
    .cbe-code .hljs-variable { color: #9cdcfe !important; }
    .cbe-code .hljs-type { color: #4ec9b0 !important; }
    .cbe-code .hljs-attr { color: #9cdcfe !important; }
    .cbe-code .hljs-built_in { color: #4ec9b0 !important; }
    .cbe-code .hljs-class { color: #4ec9b0 !important; }
  `;
  
  document.head.appendChild(style);
  console.log('✅ [CBE] Styles injected (v5)');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function cbeInit(): void {
  console.log('🚀 [CBE] Initializing...');
  
  cbeInjectStyles();
  
  // Remove old listener and add new with CAPTURE phase
  document.removeEventListener('click', cbeHandleClick, true);
  document.addEventListener('click', cbeHandleClick, true);
  
  cbeProcessAll();
  
  const observer = new MutationObserver(() => {
    setTimeout(cbeProcessAll, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  setInterval(cbeProcessAll, 2000);
  
  console.log('✅ [CBE] Ready!');
}

// Expose globally
(window as any).cbeProcess = cbeProcessAll;
(window as any).cbeInit = cbeInit;
(window as any).cbeDownload = cbeDownloadCode;

// Auto-start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cbeInit);
} else {
  setTimeout(cbeInit, 100);
}

export { cbeInit, cbeProcessAll, cbeDownloadCode, cbeGenerateFilename };
