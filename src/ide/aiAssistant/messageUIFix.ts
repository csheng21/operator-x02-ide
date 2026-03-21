// messageUIFix.ts - FIXED VERSION v15
// ============================================================================
// v15 FIXES:
// - Removed .code-block-container skip that blocked MUF from processing MarkdownProcessor blocks
// - MarkdownProcessor container replacement (replaces entire MP container, not just pre)
// - Improved restoreNewlines with HTML/CSS/SVG patterns + IDE-style indentation
// - Enhanced cleanCodeContent using textContent ONLY (removed corrupt fallbacks)
// - Language detection from multiple sources (class, data-attr, parent header)
// - HTML detection BEFORE TypeScript in detectLanguage (prevents false matches)
// - Ancestor skip logic only checks for MUF/CBE specific classes
// - Added diagnostic logging to every skip condition
// ============================================================================
// Previous fixes (v1-v14):
// 1. Proper HTML escaping (prevents ${variable} from being interpreted)
// 2. No double-processing (checks for existing enhancement)
// 3. Clean VS Code-style code blocks
// 4. Header protection - doesn't interfere with header buttons
// 5. SVG pointer-events fix - prevents SVGs from blocking clicks
// 6. Scoped observer - only watches chat containers, not entire body
// 7. Smart click handler - ignores header area completely
// 8. <br> tag removal - converts <br> to newlines in code blocks
// 9. Fixed .muf-header click blocking - buttons now work!
// 10. Capture phase click handler - gets priority over other handlers
// 11. Skip cbe-wrapper to prevent double wrapping with autonomousCoding
// 12. Enhanced ancestor checking for existing wrappers
// 13. Initialization guard to prevent multiple setups
// 14. WeakSet tracking for enhanced elements
// 15. More aggressive retry (2s interval, more initial attempts)
// 16. Broader selector to catch all code block types
// 17. ⭐ v9: Fixed AI message collapse/expand click blocking

// ⭐ v15: Module load banner - if you see this, the v15 file IS in the build
console.log('🔥🔥🔥 [MUF v15] messageUIFix v15 LOADED 🔥🔥🔥');
// 18. ⭐ v9: Fixed code collapse button click handling
// 19. ⭐ v9: Added filetree language detection for folder structures
// 20. ⭐ v10: Added isFileTreeContent()
// 21. ⭐ v11: Added isDocumentationContent()
// 22. ⭐ v12: Documentation content no longer shows line numbers or collapse button
// 23. ⭐ v13: Code blocks collapse at 2 lines (shows 2 lines by default)
// 24. ⭐ v14: Language correction (cs→css when content is CSS)
// 25. ⭐ v14: Streaming protection - skip blocks in streaming messages
// 26. ⭐ v14: HTML fragment detection in cleanCodeContent
// ============================================================================

console.log('🎨 [MessageUIFix] Loading v14 (language correction + streaming protection)...');

// Track enhanced elements to prevent re-enhancement
const enhancedPreElements = new WeakSet<Element>();

// ============================================================================
// EXCLUDED AREAS - Areas that should NEVER be touched by this module
// ============================================================================

const EXCLUDED_SELECTORS = [
  // Header areas
  '.header',
  '#header',
  '[class*="header"]',
  '.titlebar',
  '#titlebar',
  '.toolbar',
  '#toolbar',
  '.nav',
  '#nav',
  '.navigation',
  // Button areas
  '.conv-ctrl-btn',
  '.conversation-controls',
  '#new-conversation-btn',
  '#export-btn',
  '#conversation-history-btn',
  '#menu-btn',
  '[class*="control-btn"]',
  '[class*="header-btn"]',
  // SVN/Git panels
  '.svn-panel',
  '#svn-panel',
  '.git-panel',
  '#git-panel',
  '[class*="vcs-"]',
  // Floating dialogs
  '.floating-dialog',
  '[class*="floating"]',
  '[class*="dialog"]',
  '[class*="modal"]',
  // Menu areas
  '.menu',
  '#menu',
  '[class*="menu"]',
  '.dropdown',
  '[class*="dropdown"]',
].join(', ');

// Chat container selectors - where we SHOULD operate
const CHAT_CONTAINER_SELECTORS = [
  '#chat-container',
  '.chat-container',
  '#chat-messages',
  '.chat-messages',
  '#messages-container',
  '.messages-container',
  '.ai-chat',
  '[class*="chat-content"]',
  '[class*="message-list"]',
].join(', ');

// ============================================================================
// HELPER: Check if element is in excluded area
// ============================================================================

function isInExcludedArea(element: HTMLElement | null): boolean {
  if (!element) return false;
  
  // ⭐ IMPORTANT: Allow clicks inside .muf-block (code block enhancer)
  // These have their own .muf-header which should NOT be excluded
  if (element.closest('.muf-block')) {
    return false;  // Allow all clicks inside code blocks
  }
  
  // ⭐ IMPORTANT: Allow clicks on AI message collapse/expand elements
  if (element.closest('.ai-message-collapsed-header, .collapsed-indicator, .collapsed-preview, .collapsed-chevron')) {
    return false;  // Allow collapsed message header clicks
  }
  
  // ⭐ IMPORTANT: Allow clicks on message collapse/expand elements
  if (element.closest('.collapsed-message, .message-collapse-btn, .expand-btn, .collapse-toggle, [data-expand], [data-collapse]')) {
    return false;  // Allow message expand/collapse clicks
  }
  
  // ⭐ IMPORTANT: Allow clicks on code collapse buttons
  if (element.closest('.code-collapse-btn, .code-block-wrapper')) {
    return false;  // Allow code collapse clicks
  }
  
  // ⭐ IMPORTANT: Allow clicks on collapsed AI messages for expansion
  if (element.closest('.ai-message.ai-message-collapsed')) {
    return false;  // Allow collapsed message clicks
  }
  
  // Check if element or any parent matches excluded selectors
  let current: HTMLElement | null = element;
  while (current) {
    // ⭐ Skip muf- prefixed classes (code block elements)
    const className = current.className || '';
    if (typeof className === 'string' && className.includes('muf-')) {
      current = current.parentElement;
      continue;  // Skip this element, check parent
    }
    
    // Check by ID
    const id = current.id?.toLowerCase() || '';
    if (id.includes('header') || id.includes('toolbar') || id.includes('nav') ||
        id.includes('menu') || id.includes('control') || id.includes('titlebar')) {
      return true;
    }
    
    // Check by class
    if (typeof className === 'string') {
      const classLower = className.toLowerCase();
      
      // Skip if this is a collapsed header (allowed)
      if (classLower.includes('collapsed-header') || classLower.includes('ai-message-collapsed')) {
        current = current.parentElement;
        continue;
      }
      
      if (classLower.includes('header') || classLower.includes('toolbar') ||
          classLower.includes('nav') || classLower.includes('menu') ||
          classLower.includes('control') || classLower.includes('titlebar') ||
          classLower.includes('conv-ctrl') || classLower.includes('floating')) {
        return true;
      }
    }
    
    // Check if matches excluded selectors
    try {
      if (current.matches && current.matches(EXCLUDED_SELECTORS)) {
        return true;
      }
    } catch (e) {
      // Ignore selector errors
    }
    
    current = current.parentElement;
  }
  
  return false;
}

// ============================================================================
// HELPER: Check if element is in chat area (where we should operate)
// ============================================================================

function isInChatArea(element: HTMLElement | null): boolean {
  if (!element) return false;
  
  // Must be inside a chat container
  try {
    const chatContainer = element.closest(CHAT_CONTAINER_SELECTORS);
    return chatContainer !== null;
  } catch (e) {
    return false;
  }
}

// ============================================================================
// HTML ESCAPE - CRITICAL FIX
// ============================================================================
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * ⭐ FIX: Clean up language identifier prefixes that leaked into code
 * e.g., "t\n// pins.ts" from "typescript\n// pins.ts"
 * e.g., "`c\n#ifndef" from markdown code fence
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

function preprocessMalformedMarkdown(): void {
  // Find AI message containers - ONLY in chat areas, exclude headers
  const containers = document.querySelectorAll(
    '.ai-message:not([data-muf-preprocessed-v2]), ' +
    '.assistant-message:not([data-muf-preprocessed-v2]), ' +
    '.ai-message-content:not([data-muf-preprocessed-v2])'
  );
  
  containers.forEach(container => {
    // Skip if in excluded area
    if (isInExcludedArea(container as HTMLElement)) {
      return;
    }
    
    // Skip if not in chat area
    if (!isInChatArea(container as HTMLElement)) {
      return;
    }
    
    if (container.getAttribute('data-muf-preprocessed-v2')) return;
    
    const html = container.innerHTML;
    
    // Check for malformed markdown patterns
    // ⭐ FIX: Added c, cpp, h for C/C++ support
    const hasMalformedCode = 
      /[`]{1,3}\s*(typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino)/i.test(html) ||
      /^[`]\s*\w+\s/m.test(html) ||
      html.includes('```') ||
      html.includes('`typescript') ||
      html.includes('`javascript') ||
      html.includes('`python') ||
      html.includes('`c\n') ||  // ⭐ FIX: Detect `c code blocks
      html.includes('`cpp') ||  // ⭐ FIX: Detect `cpp code blocks
      html.includes('`css') ||
      html.includes('`html');
    
    // ⭐ FIX: Also detect JSDoc/code that got rendered as HTML with <em> tags
    // e.g., "* @param" became "<em>@param</em>" 
    const hasMangledjSDoc = 
      /<em>@(param|returns?|throws?|file|brief|note|example|see|since|deprecated|author|version|todo)<\/em>/i.test(html) ||
      /<em>[\s\S]*?<\/em>/.test(html) && html.includes('/**') ||
      /\*\s+<em>/.test(html) ||  // " * <em>" - JSDoc line that got em-ified
      html.includes('typescrip t') ||  // Telltale sign of mangled content
      html.includes('javascrip t');
    
    if (hasMalformedCode || hasMangledjSDoc) {
      console.log('🔧 [MessageUIFix] Found malformed markdown' + (hasMangledjSDoc ? ' (JSDoc mangling detected)' : '') + ', fixing...');
      
      let fixed = html;
      
      // ========================================================================
      // FIX 1: Triple backtick code blocks: ```language ... ```
      // ========================================================================
      fixed = fixed.replace(
        /[`]{3}\s*(typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|sh|shell|sql|java|c|cpp|csharp|ruby|php|swift|kotlin|xml|yaml|yml|markdown|md|text|plaintext)?\s*([\s\S]*?)[`]{3}/gi,
        (match, lang, code) => {
          const language = lang || 'plaintext';
          const cleanCode = code.trim();
          if (cleanCode.length < 5) return match; // Skip if too short
          return `<pre data-muf-fixed="triple"><code class="language-${language}">${escapeHtml(cleanCode)}</code></pre>`;
        }
      );
      
      // ========================================================================
      // FIX 2: Single backtick with language - MUST find the end too!
      // Pattern: `typescript\ncode here...` or `typescript\ncode here\n\n
      // ========================================================================
      
      // First try: `language ... ` (with closing backtick)
      // ⭐ FIX: Added c, cpp, h, hpp, ino for C/C++/Arduino support
      fixed = fixed.replace(
        /[`](typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino|java|cs|rb|php)\s+([\s\S]*?)[`]/gi,
        (match, lang, code) => {
          const cleanCode = code.trim();
          if (cleanCode.length < 5) return match;
          return `<pre data-muf-fixed="single-closed"><code class="language-${lang}">${escapeHtml(cleanCode)}</code></pre>`;
        }
      );
      
      // Second try: `language\n...code... (no closing backtick - find end by patterns)
      // Look for code ending at: </p>, </div>, <br>, double newline, or another code block
      // ⭐ FIX: Added c, cpp, h, hpp, ino for C/C++/Arduino support
      fixed = fixed.replace(
        /[`](typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino|java|cs|rb|php)\s*\n([\s\S]*?)(?=<\/p>|<\/div>|<br|<pre|\n\n\n|$)/gi,
        (match, lang, code) => {
          const cleanCode = code.trim();
          if (cleanCode.length < 5) return match;
          // Don't double-process if already has pre tag nearby
          if (match.includes('<pre')) return match;
          return `<pre data-muf-fixed="single-unclosed"><code class="language-${lang}">${escapeHtml(cleanCode)}</code></pre>`;
        }
      );
      
      // ========================================================================
      // FIX 3: Visible backticks with language name as text (already rendered)
      // When you see: ` typescript followed by code
      // ========================================================================
      
      // Handle case where backtick is converted to text or HTML entity
      // ⭐ FIX: Added c, cpp, h, hpp, ino for C/C++/Arduino support
      fixed = fixed.replace(
        /(?:&#96;|&#x60;|`)\s*(typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino|java|cs|rb|php)\s*(?:<br\s*\/?>|\n)/gi,
        (match, lang) => {
          // Find the code content after this
          return `<pre data-muf-fixed="visible-backtick"><code class="language-${lang}">`;
        }
      );
      
      // ========================================================================
      // FIX 3.5: Un-mangle JSDoc comments that got converted to <em> tags
      // Pattern: " * <em>@param</em>" should be " * @param"
      // ========================================================================
      
      // Restore JSDoc annotations that got italicized
      fixed = fixed.replace(/<em>(@\w+)<\/em>/g, '$1');
      
      // Restore content between * markers that should be JSDoc lines
      // e.g., " * <em>description</em>" -> " * description"
      fixed = fixed.replace(/(\s\*\s*)<em>([^<]*)<\/em>/g, '$1$2');
      
      // If we see "typescrip t" or similar, try to fix the split content
      if (fixed.includes('typescrip t') || fixed.includes('javascrip t')) {
        console.log('🔧 [MessageUIFix] Detected split language tag, attempting recovery...');
        // This is a sign that content was badly split - log for debugging
        // The fix here is limited since the content is already mangled
        fixed = fixed.replace(/typescrip t/g, 'typescript');
        fixed = fixed.replace(/javascrip t/g, 'javascript');
      }
      
      // ========================================================================
      // FIX 4: Clean up any unclosed <pre> tags by finding where code logically ends
      // ========================================================================
      
      // Find unclosed <pre> tags and close them before the next block element
      const hasUnclosedPre = /<pre[^>]*><code[^>]*>[^<]*$/.test(fixed) ||
                             (fixed.match(/<pre/g) || []).length > (fixed.match(/<\/pre>/g) || []).length;
      
      if (hasUnclosedPre) {
        console.log('🔧 [MessageUIFix] Fixing unclosed pre tags...');
        
        // Simple approach: close any pre that doesn't have a closing tag
        // by finding the next paragraph or div
        fixed = fixed.replace(
          /(<pre[^>]*><code[^>]*>)([\s\S]*?)(<\/div>|<p>|<h[1-6]>|$)/gi,
          (match, preOpen, content, nextTag) => {
            // Check if already closed
            if (content.includes('</code></pre>')) return match;
            // Close it
            return `${preOpen}${content}</code></pre>${nextTag}`;
          }
        );
      }
      
      // ========================================================================
      // FIX 5: Handle the specific case in the screenshot
      // Text like: ` typescript\n// DOM Elements\nconst...
      // ========================================================================
      
      // Find pattern where there's a visible backtick character followed by language
      const lines = fixed.split('\n');
      let inMalformedBlock = false;
      let malformedLang = '';
      let malformedCode: string[] = [];
      let fixedLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for start of malformed block: ` typescript or `typescript
        // ⭐ FIX: Added c, cpp, h, hpp, ino for C/C++/Arduino support
        const startMatch = line.match(/^[`\s]*(typescript|javascript|python|css|html|json|bash|rust|go|jsx|tsx|c|cpp|h|hpp|ino|java|cs|rb|php)\s*$/i);
        
        if (startMatch && !inMalformedBlock) {
          inMalformedBlock = true;
          malformedLang = startMatch[1].toLowerCase();
          malformedCode = [];
          continue; // Skip this line
        }
        
        if (inMalformedBlock) {
          // Check for end: empty line followed by non-code, or start of new section
          const isCodeLine = /^\s*(const|let|var|function|class|import|export|if|for|while|return|\/\/|\/\*|\*|#|def |async |await )/.test(line) ||
                            /^\s*[}\]);\s]*$/.test(line) ||
                            /^\s+/.test(line);
          
          if (isCodeLine || line.trim() === '' && malformedCode.length < 3) {
            malformedCode.push(line);
          } else if (malformedCode.length > 0) {
            // End of block - output fixed version
            const code = malformedCode.join('\n').trim();
            if (code.length > 10) {
              fixedLines.push(`<pre data-muf-fixed="line-scan"><code class="language-${malformedLang}">${escapeHtml(code)}</code></pre>`);
            } else {
              // Too short, put back as-is
              fixedLines.push(...malformedCode);
            }
            inMalformedBlock = false;
            malformedCode = [];
            fixedLines.push(line);
          } else {
            inMalformedBlock = false;
            fixedLines.push(line);
          }
        } else {
          fixedLines.push(line);
        }
      }
      
      // Handle case where block extends to end
      if (inMalformedBlock && malformedCode.length > 0) {
        const code = malformedCode.join('\n').trim();
        if (code.length > 10) {
          fixedLines.push(`<pre data-muf-fixed="line-scan-end"><code class="language-${malformedLang}">${escapeHtml(code)}</code></pre>`);
        } else {
          fixedLines.push(...malformedCode);
        }
      }
      
      fixed = fixedLines.join('\n');
      
      // ========================================================================
      // APPLY FIX
      // ========================================================================
      
      if (fixed !== html) {
        container.innerHTML = fixed;
        container.setAttribute('data-muf-preprocessed-v2', 'true');
        console.log('✅ [MessageUIFix] Fixed malformed markdown');
      }
    }
  });
  
  // ============================================================================
  // ORPHANED CODE ELEMENTS - Only in chat areas
  // Also look for orphaned code elements that have syntax highlighting but no container
  // ============================================================================
  
  const orphanedCode = document.querySelectorAll(
    'code.hljs:not(.muf-code):not([data-muf-checked]),' +
    'code[class*="language-"]:not(.muf-code):not([data-muf-checked]),' +
    '.hljs:not(.muf-code):not([data-muf-checked])'
  );
  
  orphanedCode.forEach(code => {
    // Skip if in excluded area
    if (isInExcludedArea(code as HTMLElement)) {
      return;
    }
    
    code.setAttribute('data-muf-checked', 'true');
    
    // If this code element is not inside a pre, wrap it
    if (!code.closest('pre') && !code.closest('.muf-block') && !code.closest('.cbe-wrapper')) {
      console.log('🔧 [MessageUIFix] Wrapping orphaned code element...');
      const pre = document.createElement('pre');
      pre.setAttribute('data-muf-wrapped', 'true');
      code.parentNode?.insertBefore(pre, code);
      pre.appendChild(code);
    }
  });
}

// Export for use
export { preprocessMalformedMarkdown };

// ============================================================================
// LOAD HIGHLIGHT.JS
// ============================================================================

function loadHighlightJS(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).hljs) {
      resolve();
      return;
    }
    
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css';
    document.head.appendChild(cssLink);
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
      console.log('✅ [MessageUIFix] Highlight.js loaded');
      resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

// ============================================================================
// ICONS (SVG) - WITH POINTER-EVENTS FIX
// ============================================================================

const ICONS = {
  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <rect x="9" y="9" width="13" height="13" rx="2" style="pointer-events: none;"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" style="pointer-events: none;"></path>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <polyline points="20 6 9 17 4 12" style="pointer-events: none;"></polyline>
  </svg>`,
  expand: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <polyline points="6 9 12 15 18 9" style="pointer-events: none;"></polyline>
  </svg>`,
  insert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M12 5v14M5 12h14" style="pointer-events: none;"></path>
  </svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" style="pointer-events: none;"/>
    <polyline points="7 10 12 15 17 10" style="pointer-events: none;"/>
    <line x1="12" y1="15" x2="12" y2="3" style="pointer-events: none;"/>
  </svg>`,
  view: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" style="pointer-events: none;"/>
    <circle cx="12" cy="12" r="3" style="pointer-events: none;"/>
  </svg>`,
  folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" style="pointer-events: none;"/>
  </svg>`,
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
  filetree: '#dcb67a',  // Folder yellow/gold color
  plaintext: '#858585',
};

// Language to file extension mapping
const LANG_EXTENSIONS: Record<string, string> = {
  typescript: 'ts', tsx: 'tsx',
  javascript: 'js', jsx: 'jsx',
  python: 'py', rust: 'rs',
  go: 'go', java: 'java',
  html: 'html', css: 'css',
  scss: 'scss', less: 'less',
  json: 'json', xml: 'xml',
  yaml: 'yaml', yml: 'yml',
  bash: 'sh', sh: 'sh', shell: 'sh',
  sql: 'sql', c: 'c', cpp: 'cpp',
  csharp: 'cs', ruby: 'rb', php: 'php',
  filetree: 'txt',  // File tree as text
  plaintext: 'txt', text: 'txt',
};

// ⭐ FIX v14: Language display names for headers and viewers
const LANG_DISPLAY_NAMES: Record<string, string> = {
  typescript: 'TypeScript', tsx: 'TSX',
  javascript: 'JavaScript', jsx: 'JSX',
  python: 'Python', rust: 'Rust', go: 'Go',
  java: 'Java', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++',
  csharp: 'C#', cs: 'C#',
  css: 'CSS', scss: 'SCSS', less: 'LESS',
  html: 'HTML', xml: 'XML',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  bash: 'Bash', sh: 'Shell', shell: 'Shell',
  sql: 'SQL', ruby: 'Ruby', php: 'PHP',
  swift: 'Swift', kotlin: 'Kotlin',
  markdown: 'Markdown', md: 'Markdown',
  plaintext: 'TEXT', text: 'TEXT',
  filetree: 'File Tree',
};

function getLangDisplayName(lang: string): string {
  return LANG_DISPLAY_NAMES[lang] || lang.toUpperCase();
}

// ============================================================================
// DOWNLOAD FUNCTIONS
// ============================================================================

// Generate filename from code content
function generateFilename(code: string, lang: string): string {
  const ext = LANG_EXTENSIONS[lang.toLowerCase()] || 'txt';
  
  // Try to find filename in comments
  const patterns = [
    /^\/\/\s*([\w.-]+\.\w+)\s*$/m,           // // filename.ts
    /^\/\*\s*([\w.-]+\.\w+)\s*\*\/\s*$/m,    // /* filename.ts */
    /^#\s*([\w.-]+\.\w+)\s*$/m,               // # filename.py
    /^<!--\s*([\w.-]+\.\w+)\s*-->\s*$/m,      // <!-- filename.html -->
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Try to extract from class/function/component name
  let baseName = 'code';
  
  const componentMatch = code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/);
  const classMatch = code.match(/(?:class|interface|type)\s+(\w+)/);
  const functionMatch = code.match(/(?:function|const|let|var)\s+(\w+)\s*[=(]/);
  
  if (componentMatch) {
    baseName = componentMatch[1];
  } else if (classMatch) {
    baseName = classMatch[1];
  } else if (functionMatch) {
    baseName = functionMatch[1];
  }
  
  // Convert to kebab-case
  baseName = baseName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${baseName}.${ext}`;
}

// Download code as file
function downloadCode(code: string, filename: string): void {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log(`📥 [MessageUIFix] Downloaded: ${filename}`);
}

// ============================================================================
// NEWLINE RESTORATION - Fix collapsed code (IMPROVED v2)
// ============================================================================

function restoreNewlines(code: string, language: string): string {
  // If code already has proper newlines, don't modify
  if (code.split('\n').length > 5) return code;
  
  // Language-specific patterns for line breaks
  const patterns: Record<string, RegExp[]> = {
    typescript: [
      /(?<=;)\s*(?=(?:const|let|var|function|class|interface|type|import|export|if|for|while|return|async|await))/g,
      /(?<=\{)\s*(?=\S)/g,
      /(?<=\})\s*(?=\S)/g,
    ],
    javascript: [
      /(?<=;)\s*(?=(?:const|let|var|function|class|import|export|if|for|while|return|async|await))/g,
      /(?<=\{)\s*(?=\S)/g,
      /(?<=\})\s*(?=\S)/g,
    ],
    python: [
      /(?<=:)\s*(?=\S)/g,
      /(?<=\n)(?=(?:def |class |if |for |while |import |from |return |async ))/g,
    ],
    // ⭐ v15 FIX: HTML/markup patterns - split before opening tags and after closing tags
    html: [
      /(?<=>)\s*(?=<)/g,  // Between > and < (most common HTML split point)
    ],
    xml: [
      /(?<=>)\s*(?=<)/g,
    ],
    svg: [
      /(?<=>)\s*(?=<)/g,
    ],
    // ⭐ v15 FIX: CSS patterns
    css: [
      /(?<=\})\s*(?=\S)/g,
      /(?<=;)\s*(?=\S)/g,
    ],
    default: [
      /(?<=;)\s*(?=\S)/g,
      /(?<=\{)\s*(?=\S)/g,
      /(?<=\})\s*(?=\S)/g,
    ]
  };
  
  // ⭐ v15+ FIX: Auto-detect HTML-like content REGARDLESS of language label
  // Language detection can be wrong when syntax highlighting artifacts leak into text
  let effectiveLang = language;
  const looksLikeHTML = code.includes('<!doctype') || code.includes('<!DOCTYPE') || 
                        code.includes('<html') || code.includes('<head') || 
                        code.includes('<body') || code.includes('<div') ||
                        (code.includes('</') && code.includes('/>')) ||
                        (/<[a-zA-Z][a-zA-Z0-9]*[\s>]/.test(code) && /<\/[a-zA-Z]/.test(code));
  
  if (looksLikeHTML) {
    effectiveLang = 'html';
    console.log(`🔄 [MUF] restoreNewlines: Content looks like HTML (detected as "${language}"), using HTML patterns`);
  }
  
  const langPatterns = patterns[effectiveLang] || patterns.default;
  let result = code;
  
  for (const pattern of langPatterns) {
    result = result.replace(pattern, '\n');
  }
  
  // ⭐ v15+ FIX: If HTML splitting worked, also add indentation for readability
  if (effectiveLang === 'html' && result.split('\n').length > 1) {
    // Add proper indentation based on tag nesting (IDE-style formatting)
    const lines = result.split('\n');
    let indent = 0;
    const indented: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Decrease indent before closing tags
      if (/^<\//.test(trimmed)) {
        indent = Math.max(0, indent - 1);
      }
      indented.push('  '.repeat(indent) + trimmed);
      // Increase indent after opening tags (not self-closing, not void elements, not comments)
      if (/^<[a-zA-Z][^>]*[^/]>$/.test(trimmed) && 
          !/^<(!--|!doctype|meta|link|br|hr|img|input|title|base|col|embed|source|track|wbr)/i.test(trimmed)) {
        indent++;
      }
    }
    
    // ⭐ Merge empty elements back to single line: <tag>\n</tag> → <tag></tag>
    // This keeps elements like <div id="root"></div> and <script src="..."></script> on one line
    for (let i = indented.length - 1; i > 0; i--) {
      const curr = indented[i].trim();
      const prev = indented[i - 1].trim();
      if (/^<\/\w+>$/.test(curr)) {
        const tagName = curr.match(/<\/(\w+)>/)?.[1];
        if (tagName && new RegExp('^<' + tagName + '[\\s>]').test(prev) && !prev.endsWith('/>')) {
          // Merge: keep prev's indentation, append closing tag
          indented[i - 1] = indented[i - 1].trimEnd() + curr;
          indented.splice(i, 1);
          // Fix indent since we merged (the opening tag didn't really increase depth)
        }
      }
    }
    
    result = indented.join('\n');
    console.log(`✅ [MUF] restoreNewlines: Restored ${indented.length} lines from HTML content`);
  }
  
  return result;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

/**
 * Detect if content is a file tree structure (not actual code)
 * These should be rendered differently - no line numbers, no insert button
 */
function isFileTreeContent(code: string): boolean {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return false;
  
  // Check for tree characters
  const treeCharCount = (code.match(/[├└│┬┤┼─┌┐┘]/g) || []).length;
  if (treeCharCount >= 3) return true;
  
  // Check for ASCII tree
  const asciiTreeCount = (code.match(/(\|--|\+--|`--|├──|└──|│\s+)/g) || []).length;
  if (asciiTreeCount >= 3) return true;
  
  // Check for emoji-based file trees
  const fileEmojis = /[📁📂📄📋📝🗂️🗃️🗄️📦📑📰📃]/;
  let emojiLineCount = 0;
  for (const line of lines) {
    if (fileEmojis.test(line)) emojiLineCount++;
  }
  if (emojiLineCount >= 3 && emojiLineCount / lines.length >= 0.4) return true;
  
  // Check for file/folder patterns
  let fileEntryCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Folder paths: "src/", "components/", etc.
    if (/^[\w.-]+\/\s*$/.test(trimmed)) { fileEntryCount++; continue; }
    // Files with extensions and descriptions: "config.h (Pin definitions)"
    if (/^[\w.-]+\.\w+\s+\([^)]+\)$/.test(trimmed)) { fileEntryCount++; continue; }
    // Indented file entries
    if (/^\s{2,}[\w.-]+\/?/.test(line)) { fileEntryCount++; continue; }
  }
  const nonEmpty = lines.filter(l => l.trim()).length;
  if (nonEmpty >= 3 && fileEntryCount / nonEmpty >= 0.5) return true;
  
  return false;
}

/**
 * Detect if content is documentation/prose text (NOT code)
 * This prevents text explanations from being inserted into the editor
 */
function isDocumentationContent(code: string): boolean {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return false;
  
  // ⭐ FIX: Detect ASCII art diagrams (box drawings, arrows)
  const boxChars = /[┌┐└┘─│├┤┬┴┼╔╗╚╝═║╠╣╦╩╬┏┓┗┛┃┣┫┳┻╋]/;
  const arrowChars = /[←→↑↓↔↕⇐⇒⇑⇓⬅➡⬆⬇]/;
  
  let boxCharLines = 0;
  let arrowLines = 0;
  
  for (const line of lines) {
    if (boxChars.test(line)) boxCharLines++;
    if (arrowChars.test(line)) arrowLines++;
  }
  
  // If has multiple box drawing chars, it's a diagram
  if (boxCharLines >= 2) {
    console.log('[MUF] Detected ASCII box diagram - marking as documentation');
    return true;
  }
  
  // If has arrows and looks like a layer diagram
  if (arrowLines >= 2 && /layer|level|tier|component|module/i.test(code)) {
    console.log('[MUF] Detected architecture diagram - marking as documentation');
    return true;
  }
  
  let docIndicators = 0;
  let codeIndicators = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // ============================================
    // DOCUMENTATION INDICATORS (prose/markdown)
    // ============================================
    
    // Markdown headers
    if (/^#{1,6}\s+/.test(trimmed)) { docIndicators += 2; continue; }
    
    // Section headers ending with colon: "Key Technologies Used:"
    if (/^[A-Z][A-Za-z\s]+:$/.test(trimmed)) { docIndicators += 3; continue; }
    
    // Bullet points starting with capital
    if (/^[-*•]\s+[A-Z]/.test(trimmed)) { docIndicators += 2; continue; }
    
    // Bullet points with bold term: "• **Modularity:** description"
    if (/^[-*•]\s+\*\*[^*]+\*\*/.test(trimmed)) { docIndicators += 3; continue; }
    
    // Numbered lists with prose: "1. A detailed tree with..."
    if (/^\d+\.\s+[A-Z][a-z]/.test(trimmed)) { docIndicators += 2; continue; }
    
    // Numbered lists with bold: "1. **Remote GPIO Control:**"
    if (/^\d+\.\s+\*\*[^*]+\*\*/.test(trimmed)) { docIndicators += 3; continue; }
    
    // Lines with "Term: description" format
    if (/^[A-Z][a-zA-Z\s]+:\s+[A-Z]/.test(trimmed)) { docIndicators += 2; continue; }
    
    // Lines starting with capital letter and containing spaces (prose)
    if (/^[A-Z][a-z]+\s+[a-z]+\s+[a-z]+/.test(trimmed)) { docIndicators++; }
    
    // Common documentation phrases
    if (/\b(Example|Output|Note|Usage|When executed|This (is|will|could|would)|To use|How to|Features|Benefits|Typical|Architecture|Structure)\b/i.test(trimmed)) { 
      docIndicators += 2; 
    }
    
    // Lines ending with punctuation (sentences)
    if (/[.!?:]\s*$/.test(trimmed) && trimmed.length > 20) { docIndicators++; }
    
    // Contains "**bold**" markdown
    if (/\*\*[^*]+\*\*/.test(trimmed)) { docIndicators++; }
    
    // Technology names with descriptions: "ESP8266 or ESP32 (for WiFi)"
    if (/\([^)]{5,}\)/.test(trimmed) && /^[A-Z]/.test(trimmed)) { docIndicators++; }
    
    // ============================================
    // CODE INDICATORS
    // ============================================
    
    // ⭐ v13: C/C++ preprocessor directives - STRONG code indicator
    if (/^#\s*(define|include|ifndef|ifdef|endif|if|elif|else|pragma|undef|warning|error)\b/.test(trimmed)) { codeIndicators += 5; continue; }
    
    // ⭐ v13: C/C++ type keywords and declarations
    if (/\b(int|void|char|float|double|long|short|unsigned|signed|struct|typedef|enum|union|static|const|volatile|extern|register)\s+\w+/.test(trimmed)) { codeIndicators += 3; }
    
    // ⭐ v13: Arduino/embedded specific
    if (/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial|delay|millis|setup|loop)\s*\(/.test(trimmed)) { codeIndicators += 4; }
    
    // ⭐ v13: Common C macros and patterns
    if (/^[A-Z][A-Z0-9_]+\s*[=\(]/.test(trimmed)) { codeIndicators += 2; } // MACRO_NAME = or MACRO(
    if (/\bNULL\b|\bTRUE\b|\bFALSE\b/.test(trimmed)) { codeIndicators += 2; }
    
    // Function/variable declarations (JS/TS)
    if (/(?:const|let|var|function|class|interface|type|import|export)\s+\w+/.test(trimmed)) { codeIndicators += 3; }
    // Programming operators
    if (/[=]{2,3}|[!]=|&&|\|\||=>/.test(trimmed)) { codeIndicators += 2; }
    // Brackets typical in code
    if (/\{|\}|\[|\]|;$/.test(trimmed)) { codeIndicators++; }
    // Function calls (but not prose sentences)
    if (/\w+\([^)]*\)/.test(trimmed) && !/^[A-Z][a-z]+\s/.test(trimmed) && !/\(for\s/.test(trimmed)) { codeIndicators++; }
  }
  
  // If documentation indicators significantly outweigh code indicators, it's documentation
  if (docIndicators > 0 && docIndicators >= codeIndicators * 1.5) {
    return true;
  }
  
  // Check if mostly prose (lines that look like English sentences)
  let proseLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Line is prose if it:
    // - Starts with capital letter, bullet, or number
    // - Contains multiple words
    // - Doesn't look like code syntax
    // ⭐ v13: Exclude C/C++ preprocessor directives from prose detection
    if (/^[A-Z#\-*•\d]/.test(trimmed) && 
        trimmed.split(/\s+/).length >= 3 &&
        !/[{};=]$/.test(trimmed) &&
        !/^\s*(const|let|var|function|if|for|while|return|import|export)\s/.test(trimmed) &&
        !/^#\s*(define|include|ifndef|ifdef|endif|if|elif|else|pragma|undef)/.test(trimmed)) {
      proseLines++;
    }
  }
  
  // If more than 50% of lines look like prose, it's documentation
  if (proseLines / lines.length >= 0.5) {
    return true;
  }
  
  return false;
}

// ============================================================================

function detectLanguage(code: string): string {
  // File tree indicators (folder icons, file structure)
  if (/^[\s]*[📁📂📄📝🗂️🗃️├└│─┬┤┼]\s*/m.test(code) ||
      /^[\s]*(?:├──|└──|│\s+)/m.test(code) ||
      /^\s*(?:components\/|src\/|public\/|dist\/|node_modules\/)/m.test(code)) {
    return 'filetree';
  }
  
  // ⭐ C/C++ indicators - CHECK FIRST (before JS which also uses {})
  // Preprocessor directives are the strongest indicator
  if (/^\s*#\s*(include|define|ifndef|ifdef|endif|pragma|if|elif|else|undef)\b/m.test(code)) {
    // Check if it's C++ specifically
    if (/\b(class\s+\w+\s*[:{]|namespace\s+\w+|cout|cin|std::|template\s*<|public:|private:|protected:)/m.test(code)) {
      return 'cpp';
    }
    return 'c';
  }
  
  // C/C++ type patterns (without preprocessor)
  if (/\b(void|int|char|float|double|unsigned|signed|long|short)\s+\w+\s*\(/m.test(code) ||
      /\b(struct|typedef|enum)\s+\w+/m.test(code) ||
      /\bmain\s*\(\s*(void|int\s+argc|)\s*[,)]/.test(code)) {
    // Check for C++ specific
    if (/\b(class\s+\w+|namespace|cout|cin|std::|new\s+\w+|delete\s+)/m.test(code)) {
      return 'cpp';
    }
    return 'c';
  }
  
  // Arduino-specific patterns
  if (/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial\.|delay|setup|loop)\s*\(/m.test(code)) {
    return 'cpp'; // Arduino is C++
  }
  
  // ⭐ v15+ FIX: HTML indicators - CHECK BEFORE TypeScript!
  // TypeScript's `/<\w+>/` pattern falsely matches HTML tags like <html>, <head>, etc.
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|script|style)\b/i.test(code)) {
    return 'html';
  }
  
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
  if (/def\s+\w+\s*\(/.test(code) ||
      /import\s+\w+/.test(code) && !/{/.test(code) ||
      /:\s*$/.test(code.split('\n')[0] || '')) {
    return 'python';
  }
  
  // Rust indicators
  if (/\bfn\s+\w+\s*\(/.test(code) ||
      /\blet\s+mut\s+/.test(code) ||
      /\bimpl\s+\w+/.test(code) ||
      /\buse\s+\w+::/.test(code)) {
    return 'rust';
  }
  
  // HTML indicators (moved to earlier in function - before TypeScript)
  // Kept as comment for reference
  
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
// FILENAME DETECTION
// ============================================================================

function detectFilename(code: string): string | null {
  // Look for filename in comments
  const patterns = [
    /^\/\/\s*([\w.-]+\.\w+)\s*$/m,
    /^\/\*\s*([\w.-]+\.\w+)\s*\*\/\s*$/m,
    /^#\s*([\w.-]+\.\w+)\s*$/m,
    /^<!--\s*([\w.-]+\.\w+)\s*-->\s*$/m,
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// ============================================================================
// EXTRACT RAW CODE - Get original code from enhanced block
// ============================================================================

function extractRawCode(block: Element): string {
  // Try to get from data attribute first (most reliable)
  const storedCode = block.getAttribute('data-raw-code');
  if (storedCode) {
    try {
      return decodeURIComponent(storedCode);
    } catch (e) {
      // Fall through to other methods
    }
  }
  
  // Try the code element
  const codeEl = block.querySelector('.muf-code');
  if (codeEl) {
    // Get text content, preserving whitespace
    const text = codeEl.textContent || '';
    return text;
  }
  
  // Fallback to any pre/code
  const pre = block.querySelector('pre');
  const code = pre?.querySelector('code') || pre;
  return code?.textContent || '';
}

// ============================================================================
// CLEAN CODE CONTENT - Remove <br> tags and convert to newlines
// FIXES the issue where <br> tags appear in code blocks
// ============================================================================

function cleanCodeContent(element: Element): string {
  // ⭐ v15+ REWRITE: Follow guide's architecture (AI-Message-UI-Enhancement-Guide.md)
  // ONLY use textContent — it NEVER includes HTML attributes like class="string"
  // The old approach had innerHTML/innerText/TreeWalker fallbacks that introduced corruption
  
  // Step 1: Clone and replace <br> elements with newlines
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('br').forEach(br => {
    br.parentNode?.replaceChild(document.createTextNode('\n'), br);
  });
  
  // Step 2: Get clean text via textContent (the ONLY reliable extraction method)
  // textContent recursively gets text from ALL child nodes, never includes attributes
  let code = clone.textContent || '';
  
  // Step 3: Handle literal <br> text and HTML entities
  code = code
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/<\/br>/gi, '\n');
  
  // Decode remaining HTML entities
  const temp = document.createElement('textarea');
  temp.innerHTML = code;
  code = temp.value;
  
  // Normalize line endings
  code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Step 4: Clean up language prefix garbage  
  code = cleanLanguagePrefix(code);
  
  // Step 5: Log if single-line detected (Vite stripped whitespace text nodes)
  if (code.split('\n').length <= 2 && code.length > 200) {
    console.log(`ℹ️ [MUF] cleanCodeContent: ${code.length} chars, ${code.split('\n').length} lines (will format in enhancement step)`);
  }
  
  return code;
}

// ============================================================================
// ENHANCE CODE BLOCKS
// ============================================================================

function enhanceCodeBlocks(): void {
  // First, preprocess any malformed markdown
  preprocessMalformedMarkdown();
  
  // Find all unprocessed pre elements - ONLY in chat areas, exclude floating panels
  // Also look for code blocks that might use different structures
  const preElements = document.querySelectorAll(
    'pre:not([data-muf-done]):not(.cvp-pre):not(.muf-pre), ' +
    'div[class*="code"]:not([data-muf-done]) > code:not(.muf-code), ' +
    '.markdown pre:not([data-muf-done]), ' +
    '[class*="message"] pre:not([data-muf-done])'
  );
  
  let enhancedCount = 0;
  
  // ⭐ v15: Log when we find pre elements to track MUF activity
  if (preElements.length > 0) {
    const newPres = Array.from(preElements).filter(el => {
      const p = el.tagName === 'PRE' ? el : (el as HTMLElement).closest('pre');
      return p && !p.closest('.muf-block') && !p.closest('.cbe-wrapper');
    });
    if (newPres.length > 0) {
      console.log(`🔍 [MUF] Found ${newPres.length} unprocessed pre elements`);
    }
  }
  
  preElements.forEach((element) => {
    // Get the actual pre element (might be the element itself or its parent)
    let pre: HTMLElement;
    if (element.tagName === 'PRE') {
      pre = element as HTMLElement;
    } else if (element.tagName === 'CODE' && element.parentElement?.tagName !== 'PRE') {
      // Code inside a div, not a pre - wrap it
      pre = element.parentElement as HTMLElement;
    } else if (element.tagName === 'CODE') {
      pre = element.parentElement as HTMLElement;
    } else {
      pre = element as HTMLElement;
    }
    
    if (!pre || pre.tagName !== 'PRE') {
      // If it's a code block without pre, create a wrapper check
      const codeEl = element.tagName === 'CODE' ? element : element.querySelector('code');
      if (!codeEl) return;
      pre = (codeEl.closest('pre') || codeEl.parentElement) as HTMLElement;
      if (!pre) return;
    }
    
    // ⭐ v15: Diagnostic logging for EVERY skip check
    const preId = pre.id || pre.className?.substring(0, 30) || 'no-id';
    const parentClass = pre.parentElement?.className?.substring(0, 50) || 'none';
    
    // Skip if already tracked as enhanced
    if (enhancedPreElements.has(pre)) {
      return;
    }
    
    // Skip if in excluded area (headers, toolbars, etc.)
    if (isInExcludedArea(pre as HTMLElement)) {
      console.log(`⛔ [MUF v15] SKIP: isInExcludedArea=true | parent="${parentClass}"`);
      return;
    }
    
    // ⭐ FIX: Skip if already inside ANY enhanced container
    if (pre.closest('.muf-block')) { console.log(`⛔ [MUF v15] SKIP: inside .muf-block`); return; }
    if (pre.closest('.cbe-wrapper')) { console.log(`⛔ [MUF v15] SKIP: inside .cbe-wrapper`); return; }
    if (pre.closest('[class*="code-block-enhanced"]')) { console.log(`⛔ [MUF v15] SKIP: inside code-block-enhanced`); return; }
    if (pre.closest('[data-code-enhanced]')) { console.log(`⛔ [MUF v15] SKIP: inside data-code-enhanced`); return; }
    // ⭐ v15 FIX: Do NOT skip .code-block-container or .ucp-block!
    // The unifiedMarkdownProcessor creates these containers but its rendering
    // breaks in production builds (code collapses to 1 line). MUF must REPLACE
    // these broken containers with properly enhanced blocks.
    // (Previously: if (pre.closest('.code-block-container')) return; ← caused silent skip)
    
    // ⭐ Skip if already has muf-done
    if (pre.hasAttribute('data-muf-done')) { return; }
    
    console.log(`🔄 [MUF v15] Processing pre element | parent="${parentClass}" | textLen=${pre.textContent?.length || 0}`);
    
    // ⭐ v15 FIX: Only skip if inside OUR OWN MUF/CBE containers (specific class check)
    let ancestor: HTMLElement | null = pre.parentElement;
    for (let level = 0; level < 3 && ancestor; level++) {
      const ancestorClass = ancestor.className || '';
      
      // ONLY skip if ancestor has our specific MUF/CBE class markers
      if (ancestorClass.match(/\b(muf-block|cbe-wrapper|code-enhanced)\b/i)) {
        console.log(`⛔ [MUF v15] SKIP: ancestor has MUF/CBE class "${ancestorClass.substring(0, 40)}"`);
        pre.setAttribute('data-muf-done', 'true');
        return;
      }
      
      // Skip if ancestor has a child with our specific header class
      if (ancestor.querySelector(':scope > .muf-header, :scope > .cbe-header')) {
        console.log(`⛔ [MUF v15] SKIP: ancestor has muf-header/cbe-header child`);
        pre.setAttribute('data-muf-done', 'true');
        return;
      }
      
      ancestor = ancestor.parentElement;
    }
    
    // ⭐ v15 FIX: Only skip if siblings have MUF/CBE specific classes
    const siblings = pre.parentElement?.children;
    if (siblings && siblings.length > 1) {
      for (const sibling of siblings) {
        if (sibling === pre) continue;
        const sibClass = (sibling as HTMLElement).className || '';
        if (sibClass.includes('muf-header') || 
            sibClass.includes('cbe-header') ||
            sibClass.includes('muf-line-numbers')) {
          console.log(`⛔ [MUF v15] SKIP: sibling has MUF/CBE class "${sibClass.substring(0, 40)}"`);
          pre.setAttribute('data-muf-done', 'true');
          return;
        }
      }
    }
    
    // ⭐ Skip if inside a container that already has MUF or CBE header
    const container = pre.parentElement;
    if (container) {
      if (container.querySelector(':scope > .muf-header, :scope > .cbe-header')) {
        console.log(`⛔ [MUF v15] SKIP: container has muf-header/cbe-header direct child`);
        pre.setAttribute('data-muf-done', 'true');
        return;
      }
    }
    
    // Skip if parent already has our specific header
    const parent = pre.parentElement;
    if (parent && parent.querySelector('.cbe-header, .muf-header')) {
      console.log(`⛔ [MUF v15] SKIP: parent has cbe-header/muf-header descendant`);
      pre.setAttribute('data-muf-done', 'true');
      return;
    }
    
    // Skip if inside a floating code viewer panel
    if (pre.closest('.cvp-panel')) { console.log(`⛔ [MUF v15] SKIP: inside cvp-panel`); return; }
    
    console.log(`✅ [MUF v15] PASSED all skip checks! Enhancing pre | parent="${parentClass}"`);
    // [X02Fix MUF Size] Block oversized pre (re-render loop guard)
    if (pre.textContent && pre.textContent.length > 500000) { return; }
    
    // Mark as processed FIRST to prevent race conditions
    pre.setAttribute('data-muf-done', 'true');
    
    // ⭐ FIX v14: Streaming protection - don't enhance blocks in messages still being streamed
    const parentMessage = pre.closest('.ai-message, .assistant-message, .response-message, [data-role="assistant"]');
    if (parentMessage) {
      const isStreaming = parentMessage.classList.contains('streaming') || 
                          parentMessage.getAttribute('data-streaming') === 'true' ||
                          parentMessage.querySelector('.typing-indicator, .cursor-blink, .stream-cursor');
      if (isStreaming) {
        console.log('[MUF] Skipping - message is still streaming');
        return;
      }
    }
    
    // ⭐ CRITICAL: Final check - only skip if we find our own muf/cbe elements
    if (pre.parentElement?.querySelector('.muf-header, .muf-line-numbers, .cbe-header')) {
      console.log('[MUF] Skipping - found existing muf/cbe element');
      return;
    }
    
    // Get code element
    const codeEl = pre.querySelector('code');
    
    // FIXED v5: Extract code with proper <br> tag handling
    let codeText = '';
    if (codeEl) {
      codeText = cleanCodeContent(codeEl);
    } else {
      codeText = cleanCodeContent(pre);
    }
    
    codeText = codeText.trim();
    
    // ⭐ FIX: Clean up language identifier prefixes that leaked into code
    // e.g., "t\n// pins.ts" from "typescript\n// pins.ts"
    // e.g., "`c\n#ifndef" from markdown code fence
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
      if (pattern.test(codeText)) {
        const before = codeText.substring(0, 30).replace(/\n/g, '↵');
        codeText = codeText.replace(pattern, '');
        console.log(`🧹 [MUF] Cleaned prefix: "${before}" → "${codeText.substring(0, 30).replace(/\n/g, '↵')}"`);
        break;
      }
    }
    
    codeText = codeText.trim();
    
    if (!codeText) return;
    
    // ⭐ FIX v14: Content-based streaming detection
    // If cleanCodeContent returned very little text but the element has lots of HTML,
    // the content is still being streamed/rendered with syntax highlighting
    const rawHtmlLength = (codeEl || pre).innerHTML?.length || 0;
    if (codeText.length < 20 && rawHtmlLength > 200) {
      console.log(`⏳ [MUF] Content streaming detected: text=${codeText.length} chars but HTML=${rawHtmlLength} chars. Deferring...`);
      pre.removeAttribute('data-muf-done'); // Allow re-processing later
      return;
    }
    
    // Detect language - check multiple sources
    let language = 'plaintext';
    
    // ⭐ v15+ FIX: Check multiple sources for language info
    // Source 1: code element class (standard: language-xxx, hljs: hljs-xxx, direct: xxx)
    const langMatch = codeEl?.className.match(/language-(\w+)/) || 
                       codeEl?.className.match(/\bhljs[- ](\w+)/) ||
                       codeEl?.getAttribute('data-lang')?.match(/^(\w+)$/);
    if (langMatch) {
      language = langMatch[1];
    }
    
    // Source 2: pre element class or data attributes
    if (language === 'plaintext') {
      const preLangMatch = pre.className.match(/language-(\w+)/) ||
                           pre.getAttribute('data-lang')?.match(/^(\w+)$/);
      if (preLangMatch) {
        language = preLangMatch[1];
      }
    }
    
    // Source 3: MarkdownProcessor parent container (enh-code-block header shows language)
    if (language === 'plaintext') {
      const enhBlock = pre.closest('.enh-code-block, .code-block-container');
      if (enhBlock) {
        const header = enhBlock.querySelector('.enh-code-header, .code-block-header');
        if (header) {
          const headerText = header.textContent || '';
          // Extract language from header like "HTML", "TYPESCRIPT", "● HTML index.html 20 lines"
          const headerLangMatch = headerText.match(/\b(HTML|CSS|TYPESCRIPT|JAVASCRIPT|PYTHON|RUST|JSON|BASH|C\+\+|JAVA|GO|PHP|RUBY|SQL|XML|SVG|YAML|TOML|MARKDOWN)\b/i);
          if (headerLangMatch) {
            language = headerLangMatch[1].toLowerCase();
            if (language === 'c++') language = 'cpp';
            console.log(`🔍 [MUF] Language from parent header: ${language}`);
          }
        }
      }
    }
    
    // ⭐ FIX v14: Correct common language misdetections
    // AI sometimes writes ```cs when it means ```css
    if (language === 'cs' || language === 'csharp') {
      // Check if content actually looks like CSS (not C#)
      const looksLikeCSS = /(color|background|margin|padding|display|flex|grid|border|font-size|width|height|position)\s*:/m.test(codeText) &&
        /[{};]/.test(codeText) &&
        !/\b(class\s+\w+|namespace\s+\w+|using\s+System|void\s+\w+\s*\(|public\s+|private\s+|static\s+)/m.test(codeText);
      if (looksLikeCSS) {
        console.log(`🔧 [MUF] Language correction: "${language}" → "css" (content is CSS, not C#)`);
        language = 'css';
      }
    }
    
    // ⭐ FIX v14: Check for documentation/diagram content FIRST (before language detection changes it)
    // This prevents diagrams from being auto-applied even if they stay as plaintext
    if (language === 'plaintext' || language === 'text' || language === '') {
      if (isDocumentationContent(codeText)) {
        console.log('[MUF] Detected documentation/diagram content - marking as non-insertable');
        pre.setAttribute('data-is-documentation', 'true');
        pre.setAttribute('data-no-insert', 'true');
        // Keep language as plaintext for diagrams
        language = 'plaintext';
      } else {
        // Only try to auto-detect language if it's NOT documentation
        const detected = detectLanguage(codeText);
        if (detected !== 'plaintext') {
          console.log(`[MUF] Auto-detected language: ${detected} (was: ${language})`);
          language = detected;
        }
      }
    }

    // ⭐ v10: Skip file trees - let unifiedCodeBlockProcessor handle them
    if (language === 'filetree' || language === 'tree' || language === 'directory') {
      console.log('[MUF] Skipping file tree - will be handled by unifiedCodeBlockProcessor');
      pre.setAttribute('data-is-filetree', 'true');
      pre.setAttribute('data-muf-skip', 'true');
      return;
    }
    
    // Also check for file tree content patterns even if language tag is different
    if (isFileTreeContent(codeText)) {
      console.log('[MUF] Detected file tree content - skipping');
      pre.setAttribute('data-is-filetree', 'true');
      pre.setAttribute('data-muf-skip', 'true');
      return;
    }
    
    // Note: Documentation check moved earlier (before language auto-detection)
    
    // CRITICAL: Restore newlines if code was collapsed
    let processedCode = codeText;
    const originalLines = codeText.split('\n');
    if (originalLines.length <= 2 && codeText.length > 200) {
      processedCode = restoreNewlines(codeText, language);
    }
    
    const lines = processedCode.split('\n');
    const lineCount = lines.length;
    
    // ⭐ FIX v14: Secondary streaming validation
    // Very few lines of code but many child spans = still rendering syntax highlighting
    if (lineCount <= 2 && processedCode.length < 50) {
      const childSpanCount = (codeEl || pre).querySelectorAll('span').length;
      if (childSpanCount > 10) {
        console.log(`⏳ [MUF] Streaming detected: ${lineCount} lines but ${childSpanCount} spans. Deferring...`);
        pre.removeAttribute('data-muf-done');
        return;
      }
    }
    const langColor = LANG_COLORS[language] || '#858585';
    const filename = detectFilename(processedCode);
    const blockId = `muf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Build filename badge
    const filenameBadge = filename 
      ? `<span class="muf-filename">${escapeHtml(filename)}</span>` 
      : '';
    
    // ⭐ v11: Check if insert should be disabled (documentation content)
    const noInsert = pre.getAttribute('data-no-insert') === 'true';
    const isDocumentation = pre.getAttribute('data-is-documentation') === 'true';
    
    // ⭐ v12: Documentation content should NOT collapse and NOT show line numbers
    // ⭐ v13: ALL blocks collapse at 2 lines, including documentation
    const shouldCollapse = lineCount > 2;
    const showLineNumbers = !isDocumentation;
    
    // CRITICAL: Escape the code text properly!
    const escapedCode = escapeHtml(processedCode);
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `muf-block ${shouldCollapse ? 'muf-collapsible' : ''} ${isDocumentation ? 'muf-documentation' : ''}`;
    wrapper.setAttribute('data-muf-id', blockId);
    wrapper.setAttribute('data-collapsed', shouldCollapse.toString());
    wrapper.setAttribute('data-raw-code', encodeURIComponent(processedCode));
    wrapper.setAttribute('data-markdown-processed', 'true');
    wrapper.setAttribute('data-code-enhanced', 'true');
    
    // Build line numbers (only for non-documentation)
    const lineNumbers = showLineNumbers 
      ? lines.map((_, i) => `<span class="muf-line-num">${i + 1}</span>`).join('')
      : '';
    
    // Build wrapper HTML
    wrapper.innerHTML = `
      <div class="muf-header">
        <div class="muf-header-left">
          <span class="muf-lang-dot" style="background: ${langColor};"></span>
          <span class="muf-lang-name">${isDocumentation ? '📝 TEXT' : getLangDisplayName(language)}</span>
          ${filenameBadge}
          <span class="muf-line-count">${lineCount} lines</span>
        </div>
        <div class="muf-header-actions">
          <button class="muf-btn muf-copy-btn" data-action="copy" title="Copy code">
            ${ICONS.copy}
          </button>
          ${!isDocumentation ? `
          <button class="muf-btn muf-download-btn" data-action="download" title="Download file">
            ${ICONS.download}
          </button>
          ` : ''}
          ${!noInsert ? `
          <button class="muf-btn muf-insert-btn" data-action="insert" title="Insert into editor">
            ${ICONS.insert}
          </button>
          ` : ''}
          ${!isDocumentation ? `
          <button class="muf-btn muf-view-btn" data-action="view" title="Open in viewer">
            ${ICONS.view}
          </button>
          ` : ''}
          ${shouldCollapse ? `
            <button class="muf-btn muf-toggle-btn" data-action="toggle" title="Expand/Collapse">
              ${ICONS.expand}
            </button>
          ` : ''}
        </div>
      </div>
      <div class="muf-body ${isDocumentation ? 'muf-body-no-lines' : ''}">
        ${showLineNumbers ? `<div class="muf-line-numbers">${lineNumbers}</div>` : ''}
        <div class="muf-code-scroll">
          <pre class="muf-pre"><code class="muf-code language-${language}">${escapedCode}</code></pre>
        </div>
      </div>
      ${shouldCollapse ? `
        <div class="muf-expand-bar">
          <button class="muf-expand-btn" data-action="toggle">
            ${ICONS.expand}
            <span class="muf-expand-text">Show all ${lineCount} lines</span>
          </button>
        </div>
      ` : ''}
    `;
    
    // ⭐ FINAL SAFETY CHECK: Verify pre is still in DOM and hasn't been wrapped
    if (!pre.parentNode) {
      console.log('[MUF] Pre element no longer in DOM, skipping');
      return;
    }
    if (pre.closest('.muf-block')) {
      console.log('[MUF] Pre already inside muf-block, skipping');
      return;
    }
    
    // ⭐ v15 FIX: Detect MarkdownProcessor/UMP container and replace it entirely
    // UMP creates nested structure:
    //   div.code-block-container > div.code-block-header + div.code-block-body > pre > code
    // We need to find the OUTERMOST container and replace it to avoid double headers
    let replaceTarget: Node = pre;
    
    // Walk up from pre to find the outermost MP/UMP container (up to 5 levels)
    const messageEl = pre.closest('.ai-message, .assistant-message, .response-message, [data-role="assistant"], .message-content');
    let candidate: HTMLElement | null = pre.parentElement;
    let bestMPContainer: HTMLElement | null = null;
    
    for (let depth = 0; depth < 5 && candidate && candidate !== messageEl; depth++) {
      const cls = candidate.className || '';
      
      // Skip if it's our own MUF/CBE container
      if (cls.includes('muf-block') || cls.includes('cbe-wrapper')) break;
      
      // ⭐ v15+: Check for known MP/UMP container classes at ANY level
      if (candidate.classList.contains('code-block-container') || 
          candidate.classList.contains('ucp-block') ||
          candidate.classList.contains('code-block-wrapper') ||
          cls.match(/\bcode[-_]?block/i)) {
        bestMPContainer = candidate;
        console.log(`🔄 [MUF v15] Found MP container at depth ${depth}: class="${cls.substring(0, 50)}"`);
        // Don't break - keep walking up to find the OUTERMOST one
      }
      
      // Also detect generic containers that have a header child with language/lines text
      if (!bestMPContainer) {
        const headerChild = candidate.querySelector(':scope > div, :scope > span, :scope > header');
        if (headerChild && candidate.children.length >= 2) {
          const headerText = (headerChild as HTMLElement).textContent?.toLowerCase() || '';
          if (headerText.match(/\b\d+\s*(lines?|行)/i) || 
              headerText.match(/\b(htm|html?|css|scss|js|jsx|ts|tsx|json|py|java|cpp?|rust|go|rb|php|sql|sh|bash|yaml|yml|xml|svg|md|toml|ini)\b/i)) {
            bestMPContainer = candidate;
            console.log(`🔄 [MUF v15] Found MP container via header text: "${headerText.trim().substring(0, 40)}" at depth ${depth}`);
          }
        }
      }
      
      candidate = candidate.parentElement;
    }
    
    if (bestMPContainer) {
      console.log(`🔄 [MUF v15] Replacing entire MP container (class="${(bestMPContainer.className || '').substring(0, 50)}")`);
      replaceTarget = bestMPContainer;
    } else {
      // Log for debugging when no MP container found
      const parentInfo = pre.parentElement ? `class="${(pre.parentElement.className || '').substring(0, 50)}", tag=${pre.parentElement.tagName}` : 'none';
      console.log(`ℹ️ [MUF v15] No MP container found, replacing pre directly (parent: ${parentInfo})`);
    }
    
    // Replace original pre (or MP container) with enhanced block
    replaceTarget.parentNode?.replaceChild(wrapper, replaceTarget);
    enhancedCount++;
    
    // Track that we've enhanced this element
    enhancedPreElements.add(pre);
    
    // Apply syntax highlighting
    const codeBlock = wrapper.querySelector('.muf-code');
    if (codeBlock && (window as any).hljs) {
      try {
        (window as any).hljs.highlightElement(codeBlock);
      } catch (e) {
        // Ignore highlighting errors
      }
    }
  });
  
  if (enhancedCount > 0) {
    console.log(`✅ [MessageUIFix] Enhanced ${enhancedCount} code blocks`);
    
    // ⭐ FIX v14: Mark parent AI messages as MUF-rendered to prevent MarkdownFix reprocessing
    // MarkdownFix destroys code blocks by re-processing already-rendered HTML as markdown
    document.querySelectorAll('.muf-block').forEach(block => {
      const parentMessage = block.closest('.ai-message, .assistant-message, .response-message, [data-role="assistant"]');
      if (parentMessage && !parentMessage.hasAttribute('data-muf-rendered')) {
        parentMessage.setAttribute('data-muf-rendered', 'true');
        parentMessage.setAttribute('data-markdown-processed', 'true');
        console.log(`🛡️ [MUF] Marked message as rendered (prevents MarkdownFix reprocessing)`);
      }
    });
    
    // ⭐ v16 FIX: Clean up ghost panels created by MP re-wrapping
    // Run immediately and also after a short delay (MP observer may fire after us)
    cleanupGhostPanels();
    setTimeout(cleanupGhostPanels, 150);
    setTimeout(cleanupGhostPanels, 500);
  }
}

// ============================================================================
// ⭐ v16 FIX: GHOST PANEL CLEANUP (JS-based, not CSS :has() dependent)
// ============================================================================
// When MarkdownProcessor's MutationObserver detects MUF replaced a container,
// it re-creates its own container AROUND the .muf-block. This causes:
//   enh-code-block (ghost) > enh-code-header (ghost) + muf-block (real)
// or:
//   code-block-container (ghost) > code-block-header (ghost) + muf-block (real)
//
// This function finds and neutralizes these ghost wrappers using JS,
// which is more reliable than CSS :has() (not supported in all WebViews).
// ============================================================================

function cleanupGhostPanels(): void {
  const mufBlocks = document.querySelectorAll('.muf-block');
  let cleaned = 0;
  
  mufBlocks.forEach(mufBlock => {
    // Walk up from .muf-block to find ghost MP containers
    let parent = mufBlock.parentElement;
    
    for (let depth = 0; depth < 6 && parent; depth++) {
      const cls = parent.className || '';
      
      // Stop if we hit the message boundary
      if (parent.classList.contains('ai-message') || 
          parent.classList.contains('assistant-message') ||
          parent.classList.contains('response-message') ||
          parent.classList.contains('message-content') ||
          parent.classList.contains('ai-message-content') ||
          parent.getAttribute('data-role') === 'assistant') {
        break;
      }
      
      // Skip if already cleaned
      if (parent.hasAttribute('data-ghost-killed')) {
        parent = parent.parentElement;
        continue;
      }
      
      // Detect ghost MP containers
      const isGhostContainer = 
        parent.classList.contains('code-block-container') ||
        parent.classList.contains('enh-code-block') ||
        parent.classList.contains('code-block-wrapper') ||
        parent.classList.contains('ucp-block') ||
        /\bcode[-_]?block/i.test(cls);
      
      if (isGhostContainer) {
        // Mark as killed to avoid re-processing
        parent.setAttribute('data-ghost-killed', 'true');
        
        // Strategy: Neutralize the ghost container's visuals
        // and hide its header elements
        parent.style.background = 'none';
        parent.style.border = 'none';
        parent.style.padding = '0';
        parent.style.margin = '0';
        parent.style.boxShadow = 'none';
        parent.style.borderRadius = '0';
        parent.style.overflow = 'visible';
        
        // Find and hide ALL header elements in this ghost container
        // (but NOT inside .muf-block which has its own header)
        const ghostHeaders = parent.querySelectorAll(
          ':scope > .code-block-header, ' +
          ':scope > .enh-code-header, ' +
          ':scope > .code-block-actions, ' +
          ':scope > .code-block-collapse, ' +
          ':scope > .collapse-btn, ' +
          ':scope > .code-block-footer, ' +
          ':scope > .enh-code-actions'
        );
        
        ghostHeaders.forEach(header => {
          (header as HTMLElement).style.display = 'none';
        });
        
        cleaned++;
        console.log(`🧹 [MUF Ghost] Killed ghost container: ${cls.substring(0, 40)} (depth ${depth})`);
      }
      
      parent = parent.parentElement;
    }
  });
  
  if (cleaned > 0) {
    console.log(`✅ [MUF Ghost] Cleaned ${cleaned} ghost panel(s)`);
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).cleanupGhostPanels = cleanupGhostPanels;
}

// ============================================================================
// FLOATING CODE VIEWER PANEL
// ============================================================================

interface CodeViewerPanel {
  id: string;
  element: HTMLElement;
}

const openPanels: Map<string, CodeViewerPanel> = new Map();

function openCodeViewer(code: string, language: string, filename: string): void {
  const panelId = `cvp-${Date.now()}`;
  const langColor = LANG_COLORS[language] || '#858585';
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'cvp-panel';
  panel.id = panelId;
  panel.setAttribute('data-cvp-id', panelId);
  
  // Build line numbers
  const lines = code.split('\n');
  const lineNumbers = lines.map((_, i) => 
    `<span class="cvp-line-num">${i + 1}</span>`
  ).join('');
  
  // Escape code
  const escapedCode = escapeHtml(code);
  
  panel.innerHTML = `
    <div class="cvp-titlebar">
      <div class="cvp-titlebar-left">
        <span class="cvp-lang-dot" style="background: ${langColor};"></span>
        <span class="cvp-lang-name">${getLangDisplayName(language)}</span>
        <span class="cvp-filename">${filename}</span>
      </div>
      <div class="cvp-titlebar-right">
        <button class="cvp-titlebar-btn cvp-minimize-btn" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
            <line x1="5" y1="12" x2="19" y2="12" style="pointer-events: none;"/>
          </svg>
        </button>
        <button class="cvp-titlebar-btn cvp-close-btn" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
            <line x1="18" y1="6" x2="6" y2="18" style="pointer-events: none;"/>
            <line x1="6" y1="6" x2="18" y2="18" style="pointer-events: none;"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="cvp-toolbar">
      <button class="cvp-tool-btn" data-cvp-action="copy">
        ${ICONS.copy}
        <span>Copy</span>
      </button>
      <button class="cvp-tool-btn" data-cvp-action="download">
        ${ICONS.download}
        <span>Download</span>
      </button>
      <button class="cvp-tool-btn cvp-primary" data-cvp-action="insert">
        ${ICONS.insert}
        <span>Insert</span>
      </button>
    </div>
    <div class="cvp-code-area">
      <div class="cvp-line-numbers">${lineNumbers}</div>
      <div class="cvp-code-content">
        <pre class="cvp-pre"><code class="cvp-code language-${language}">${escapedCode}</code></pre>
      </div>
    </div>
    <div class="cvp-statusbar">
      <span>${getLangDisplayName(language)}</span>
      <span>${lines.length} lines</span>
      <span>${code.length} chars</span>
    </div>
    <div class="cvp-resize-handle"></div>
  `;
  
  document.body.appendChild(panel);
  
  // Store panel reference
  openPanels.set(panelId, { id: panelId, element: panel });
  
  // Make draggable
  makeDraggable(panel);
  
  // Make resizable
  makeResizable(panel);
  
  // Setup panel event handlers
  setupPanelEvents(panel, code, language, filename);
  
  // Highlight code
  const codeEl = panel.querySelector('.cvp-code');
  if (codeEl && (window as any).hljs) {
    (window as any).hljs.highlightElement(codeEl);
  }
  
  console.log(`📂 [CodeViewer] Opened panel: ${panelId}`);
}

function closeCodeViewer(panelId: string): void {
  const panel = openPanels.get(panelId);
  if (panel) {
    panel.element.remove();
    openPanels.delete(panelId);
    console.log(`📂 [CodeViewer] Closed panel: ${panelId}`);
  }
}

function closeAllCodeViewers(): void {
  openPanels.forEach((panel) => {
    panel.element.remove();
  });
  openPanels.clear();
  console.log('📂 [CodeViewer] Closed all panels');
}

function makeDraggable(panel: HTMLElement): void {
  const titlebar = panel.querySelector('.cvp-titlebar') as HTMLElement;
  if (!titlebar) return;
  
  let isDragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  
  titlebar.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('.cvp-titlebar-btn')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = panel.offsetLeft;
    startTop = panel.offsetTop;
    
    panel.style.transition = 'none';
  });
  
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    panel.style.left = `${startLeft + dx}px`;
    panel.style.top = `${startTop + dy}px`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.transition = '';
    }
  });
}

function makeResizable(panel: HTMLElement): void {
  const handle = panel.querySelector('.cvp-resize-handle') as HTMLElement;
  if (!handle) return;
  
  let isResizing = false;
  let startX = 0, startY = 0;
  let startWidth = 0, startHeight = 0;
  
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = panel.offsetWidth;
    startHeight = panel.offsetHeight;
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);
    
    panel.style.width = `${Math.max(400, newWidth)}px`;
    panel.style.height = `${Math.max(300, newHeight)}px`;
  });
  
  document.addEventListener('mouseup', () => {
    isResizing = false;
  });
}

function setupPanelEvents(panel: HTMLElement, code: string, language: string, filename: string): void {
  const panelId = panel.id;
  
  // Close button
  panel.querySelector('.cvp-close-btn')?.addEventListener('click', () => {
    closeCodeViewer(panelId);
  });
  
  // Minimize button
  panel.querySelector('.cvp-minimize-btn')?.addEventListener('click', () => {
    panel.classList.toggle('cvp-minimized');
  });
  
  // Toolbar actions
  panel.querySelectorAll('[data-cvp-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-cvp-action');
      
      if (action === 'copy') {
        navigator.clipboard.writeText(code).then(() => {
          btn.classList.add('cvp-success');
          setTimeout(() => btn.classList.remove('cvp-success'), 2000);
        });
      }
      
      if (action === 'download') {
        downloadCode(code, filename);
      }
      
      if (action === 'insert') {
        const editors = (window as any).monaco?.editor?.getEditors?.();
        if (editors?.[0]) {
          const editor = editors[0];
          const selection = editor.getSelection();
          editor.executeEdits('insert', [{
            range: selection,
            text: code,
            forceMoveMarkers: true
          }]);
          editor.focus();
        }
      }
    });
  });
}

// ============================================================================
// CLICK HANDLER - WITH HEADER PROTECTION
// ============================================================================

function handleClick(e: Event): void {
  const target = e.target as HTMLElement;
  
  // ⭐ CRITICAL: Never block AI message collapse/expand functionality
  if (target.closest('.ai-message-collapsed-header, .collapsed-indicator, .collapsed-preview, .collapsed-chevron, .ai-message.ai-message-collapsed')) {
    return;  // Let event propagate normally for AI message collapse
  }
  
  // ⭐ CRITICAL: Never block code collapse button clicks
  if (target.closest('.code-collapse-btn, .code-block-wrapper .collapse-icon')) {
    return;  // Let event propagate normally for code collapse
  }
  
  // ⭐ CRITICAL: Never block message collapse/expand functionality
  if (target.closest('.collapsed-message, .message-collapse-btn, .expand-btn, .collapse-toggle, [data-expand], [data-collapse], .message-preview')) {
    return;  // Let event propagate normally for message collapse
  }
  
  // ⭐ First check if this is a click inside a code block (.muf-block)
  // If so, handle it and stop propagation
  const mufBlock = target.closest('.muf-block');
  if (mufBlock) {
    const btn = target.closest('[data-action]') as HTMLElement;
    if (btn) {
      // Stop the event from bubbling to other handlers
      e.preventDefault();
      e.stopPropagation();
      
      const action = btn.getAttribute('data-action');
      const block = mufBlock;
      
      console.log(`🔘 [MUF] Button clicked: ${action}`);
      
      if (action === 'copy') {
        const code = extractRawCode(block);
        
        navigator.clipboard.writeText(code).then(() => {
          btn.innerHTML = ICONS.check;
          btn.classList.add('muf-success');
          
          setTimeout(() => {
            btn.innerHTML = ICONS.copy;
            btn.classList.remove('muf-success');
          }, 2000);
        });
        return;
      }
      
      if (action === 'toggle') {
        const isCollapsed = block.getAttribute('data-collapsed') === 'true';
        block.setAttribute('data-collapsed', (!isCollapsed).toString());
        
        const expandText = block.querySelector('.muf-expand-text');
        const lineCount = block.querySelectorAll('.muf-line-num').length;
        
        if (expandText) {
          expandText.textContent = isCollapsed ? 'Show less' : `Show all ${lineCount} lines`;
        }
        
        // Rotate icons
        block.querySelectorAll('.muf-toggle-btn svg, .muf-expand-btn svg').forEach(svg => {
          (svg as HTMLElement).style.transform = isCollapsed ? 'rotate(180deg)' : '';
        });
        return;
      }
      
      if (action === 'insert') {
        const code = extractRawCode(block);
        
        const editors = (window as any).monaco?.editor?.getEditors?.();
        if (editors?.[0]) {
          const editor = editors[0];
          const selection = editor.getSelection();
          editor.executeEdits('insert', [{
            range: selection,
            text: code,
            forceMoveMarkers: true
          }]);
          editor.focus();
        }
        
        btn.classList.add('muf-success');
        setTimeout(() => btn.classList.remove('muf-success'), 2000);
        return;
      }
      
      if (action === 'download') {
        const code = extractRawCode(block);
        const langEl = block.querySelector('.muf-lang-name');
        const lang = langEl?.textContent?.toLowerCase() || 'plaintext';
        
        const filename = generateFilename(code, lang);
        downloadCode(code, filename);
        
        btn.innerHTML = ICONS.folder;
        btn.classList.add('muf-success');
        btn.setAttribute('data-action', 'open-folder');
        btn.setAttribute('data-filename', filename);
        btn.setAttribute('title', 'Open Downloads folder');
        return;
      }
      
      if (action === 'open-folder') {
        btn.innerHTML = `<svg class="muf-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" style="pointer-events: none;"/>
        </svg>`;
        
        const resetButton = () => {
          btn.innerHTML = ICONS.download;
          btn.setAttribute('data-action', 'download');
          btn.setAttribute('title', 'Download file');
          btn.classList.remove('muf-success');
        };
        
        const showSuccess = () => {
          btn.innerHTML = ICONS.check;
          setTimeout(resetButton, 2000);
        };
        
        console.log('📂 [MUF] Opening Downloads folder...');
        
        // Tauri v2 API - use core.invoke
        (async () => {
          try {
            const tauri = (window as any).__TAURI__;
            
            // In Tauri v2, invoke is at __TAURI__.core.invoke
            const invoke = tauri?.core?.invoke;
            
            if (!invoke) {
              console.log('⚠️ [MUF] Tauri core.invoke not available');
              console.log('   Available keys:', tauri ? Object.keys(tauri) : 'none');
              resetButton();
              return;
            }
            
            // Call the Rust command
            console.log('📂 [MUF] Calling open_downloads_folder...');
            await invoke('open_downloads_folder');
            console.log('✅ [MUF] Downloads folder opened successfully');
            showSuccess();
            
          } catch (err) {
            console.error('❌ [MUF] Error opening folder:', err);
            resetButton();
          }
        })();
        return;
      }
      
      if (action === 'view') {
        const code = extractRawCode(block);
        const langEl = block.querySelector('.muf-lang-name');
        const lang = langEl?.textContent?.toLowerCase() || 'plaintext';
        const filename = generateFilename(code, lang);
        
        console.log(`👁️ [View] Opening viewer - ${code.length} chars, lang: ${lang}`);
        openCodeViewer(code, lang, filename);
        return;
      }
    }
    return;  // Click was inside muf-block, don't process further
  }
  
  // ⭐ CRITICAL: Skip if click is in excluded area (headers, buttons, etc.)
  if (isInExcludedArea(target)) {
    return; // Let the event propagate normally
  }
  
  const btn = target.closest('[data-action]') as HTMLElement;
  if (!btn) return;
  
  // Double-check the button is not in excluded area
  if (isInExcludedArea(btn)) {
    return;
  }
  
  const action = btn.getAttribute('data-action');
  const block = btn.closest('.muf-block');
  if (!block) return;

  // Actions handled above in muf-block section
}

// ============================================================================
// STYLES - WITH SVG POINTER-EVENTS FIX
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('muf-styles-v4')) return;
  
  const style = document.createElement('style');
  style.id = 'muf-styles-v4';
  style.textContent = `
/* ============================================================
   MESSAGE UI FIX - VS Code Style Code Blocks v5 (Button Click Fix)
============================================================ */

/* ⭐ CRITICAL: SVG pointer-events fix for ALL module elements */
.muf-block svg,
.muf-block svg *,
.cvp-panel svg,
.cvp-panel svg * {
  pointer-events: none !important;
}

/* Spin animation for loading state */
@keyframes muf-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.muf-spin {
  animation: muf-spin 1s linear infinite;
}

.muf-block {
  background: #1e1e1e !important;
  border: 1px solid #3c3c3c !important;
  border-radius: 6px !important;
  margin: 2px 0 !important;
  overflow: hidden !important;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace !important;
  contain: content !important;
  isolation: isolate !important;
}

/* ⭐ v15+ FIX: Kill ghost MarkdownProcessor panels that overlap MUF blocks */
/* When MP re-wraps a MUF block, the MP container shows behind with its own background */

/* Case 1: MP elements that end up INSIDE .muf-block (shouldn't happen but safety) */
.muf-block .enh-code-block,
.muf-block .enh-code-header,
.muf-block .enh-code-scroll,
.muf-block .code-block-container,
.muf-block .code-block-header,
.muf-block .code-block-body {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
}

/* Case 2: MP container wraps AROUND .muf-block (MP re-created after MUF) */
/* CSS :has() version - works in modern browsers */
.code-block-container:has(.muf-block),
.enh-code-block:has(.muf-block),
.code-block-wrapper:has(.muf-block) {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

/* ⭐ v16 FIX: JS-applied fallback (doesn't need :has() support) */
[data-ghost-killed] {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

[data-ghost-killed] > .code-block-header,
[data-ghost-killed] > .enh-code-header,
[data-ghost-killed] > .code-block-actions,
[data-ghost-killed] > .enh-code-actions,
[data-ghost-killed] > .code-block-collapse,
[data-ghost-killed] > .collapse-btn,
[data-ghost-killed] > .code-block-footer {
  display: none !important;
}

/* Hide MP headers when they wrap around MUF blocks */
.code-block-container:has(.muf-block) > .code-block-header,
.code-block-container:has(.muf-block) > .code-block-actions,
.enh-code-block:has(.muf-block) > .enh-code-header,
.code-block-wrapper:has(.muf-block) > .code-block-header {
  display: none !important;
}

/* Hide MP collapse/expand controls when MUF has its own */
.code-block-container:has(.muf-block) > .code-block-collapse,
.code-block-container:has(.muf-block) > .collapse-btn,
.code-block-container:has(.muf-block) > .code-block-footer {
  display: none !important;
}

/* Documentation/Prose blocks - different styling */
.muf-block.muf-documentation {
  background: linear-gradient(135deg, #1a2332 0%, #1e1e1e 100%) !important;
  border-color: #2a4a6a !important;
}

.muf-block.muf-documentation .muf-header {
  background: linear-gradient(180deg, #243447 0%, #1e2a3a 100%) !important;
  border-bottom-color: #2a4a6a !important;
}

.muf-block.muf-documentation .muf-lang-name {
  color: #6aa3d5 !important;
}

.muf-block.muf-documentation .muf-lang-name::before {
  content: "📝 ";
}

/* Header */
.muf-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 3px 8px !important;
  background: linear-gradient(180deg, #2d2d2d 0%, #262626 100%) !important;
  border-bottom: 1px solid #3c3c3c !important;
  min-height: 24px !important;
}

.muf-header-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.muf-lang-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
}

.muf-lang-name {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px !important;
  color: #a0a0a0 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

.muf-filename {
  font-size: 10px !important;
  color: #4fc3f7 !important;
  font-weight: 500 !important;
  padding: 1px 6px !important;
  background: rgba(79, 195, 247, 0.12) !important;
  border-radius: 4px !important;
}

.muf-line-count {
  font-size: 10px !important;
  color: #666 !important;
}

/* Header Actions */
.muf-header-actions {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
}

.muf-btn {
  background: transparent !important;
  border: none !important;
  color: #808080 !important;
  padding: 4px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.15s ease !important;
}

.muf-btn svg {
  width: 12px !important;
  height: 12px !important;
  pointer-events: none !important;
}

.muf-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #e0e0e0 !important;
}

.muf-btn.muf-success {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4caf50 !important;
}

.muf-btn svg {
  transition: transform 0.2s ease !important;
  pointer-events: none !important;
}

/* Body */
.muf-body {
  display: flex !important;
  overflow: hidden !important;
  transition: max-height 0.3s ease !important;
  position: relative !important;
}

/* Documentation content - no line numbers */
.muf-body.muf-body-no-lines {
  display: block !important;
}

.muf-body.muf-body-no-lines .muf-code-scroll {
  width: 100% !important;
}

.muf-body.muf-body-no-lines .muf-pre {
  padding: 12px 16px !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
}

.muf-body.muf-body-no-lines .muf-code {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 12.5px !important;
  line-height: 1.5 !important;
}

/* ⭐ v13: Collapsed state shows 2 lines (~55px) */
.muf-block[data-collapsed="true"] .muf-body {
  max-height: 55px !important;
  overflow: hidden !important;
}

.muf-block[data-collapsed="false"] .muf-body {
  max-height: none !important;
}

/* Line Numbers */
.muf-line-numbers {
  display: flex !important;
  flex-direction: column !important;
  padding: 4px 0 !important;
  background: #1a1a1a !important;
  border-right: 1px solid #3c3c3c !important;
  min-width: 36px !important;
  user-select: none !important;
  overflow: hidden !important;
}

.muf-line-num {
  color: #606060 !important;
  font-size: 11px !important;
  line-height: 1.5 !important;
  padding: 0 8px !important;
  text-align: right !important;
  display: block !important;
}

/* Code Content */
.muf-code-scroll {
  flex: 1 !important;
  overflow: hidden !important;
}

.muf-block[data-collapsed="false"] .muf-code-scroll {
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

.muf-pre {
  margin: 0 !important;
  padding: 4px 10px !important;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

.muf-code {
  font-size: 12px !important;
  line-height: 1.5 !important;
  color: #d4d4d4 !important;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace !important;
  white-space: pre !important;
}

/* Expand Bar */
.muf-expand-bar {
  display: flex !important;
  justify-content: center !important;
  padding: 3px !important;
  background: #1e1e1e !important;
  border-top: 1px solid #3c3c3c !important;
}

.muf-expand-btn {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  background: transparent !important;
  border: none !important;
  color: #606060 !important;
  font-size: 11px !important;
  cursor: pointer !important;
  padding: 2px 8px !important;
  border-radius: 4px !important;
}

.muf-expand-btn:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #a0a0a0 !important;
}

.muf-expand-btn svg {
  transition: transform 0.2s ease !important;
  pointer-events: none !important;
}

/* Syntax Highlighting */
.muf-code .hljs-keyword { color: #569cd6; }
.muf-code .hljs-string { color: #ce9178; }
.muf-code .hljs-number { color: #b5cea8; }
.muf-code .hljs-comment { color: #6a9955; font-style: italic; }
.muf-code .hljs-function { color: #dcdcaa; }
.muf-code .hljs-variable { color: #9cdcfe; }
.muf-code .hljs-type { color: #4ec9b0; }
.muf-code .hljs-class { color: #4ec9b0; }
.muf-code .hljs-attr { color: #9cdcfe; }
.muf-code .hljs-tag { color: #569cd6; }
.muf-code .hljs-name { color: #4ec9b0; }
.muf-code .hljs-attribute { color: #9cdcfe; }

/* ============================================================
   FLOATING CODE VIEWER PANEL
============================================================ */

.cvp-panel {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 500px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

.cvp-panel.cvp-minimized {
  height: auto;
}

.cvp-panel.cvp-minimized .cvp-toolbar,
.cvp-panel.cvp-minimized .cvp-code-area,
.cvp-panel.cvp-minimized .cvp-statusbar {
  display: none;
}

/* Titlebar */
.cvp-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  cursor: move;
  user-select: none;
}

.cvp-titlebar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cvp-lang-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cvp-lang-name {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  letter-spacing: 0.5px;
}

.cvp-filename {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cvp-titlebar-right {
  display: flex;
  gap: 4px;
}

.cvp-titlebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.cvp-titlebar-btn svg {
  pointer-events: none !important;
}

.cvp-titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.cvp-close-btn:hover {
  background: #e81123;
  color: #fff;
}

/* Toolbar */
.cvp-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  background: #252526;
  border-bottom: 1px solid #1e1e1e;
}

.cvp-tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.cvp-tool-btn svg {
  pointer-events: none !important;
}

.cvp-tool-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.cvp-tool-btn.cvp-success {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
  color: #4caf50;
}

.cvp-tool-btn.cvp-primary {
  background: rgba(79, 195, 247, 0.12);
  border-color: rgba(79, 195, 247, 0.25);
  color: #4fc3f7;
}

.cvp-tool-btn.cvp-primary:hover {
  background: rgba(79, 195, 247, 0.2);
}

/* Code Area */
.cvp-code-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.cvp-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  background: #1a1a1a;
  border-right: 1px solid #2d2d2d;
  min-width: 45px;
  user-select: none;
  overflow-y: auto;
}

.cvp-line-num {
  padding: 0 10px;
  text-align: right;
  color: #555;
  font-size: 12px;
}

.cvp-code-content {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

.cvp-pre {
  margin: 0;
  background: transparent;
}

.cvp-code {
  color: #d4d4d4;
  white-space: pre;
}

/* Status Bar */
.cvp-statusbar {
  display: flex;
  gap: 16px;
  padding: 4px 12px;
  background: #007acc;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
}

/* Resize Handle */
.cvp-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.1) 50%);
}

.cvp-resize-handle:hover {
  background: linear-gradient(135deg, transparent 50%, rgba(79, 195, 247, 0.3) 50%);
}

/* Floating Panel Syntax Highlighting */
.cvp-code .hljs-keyword { color: #569cd6; }
.cvp-code .hljs-string { color: #ce9178; }
.cvp-code .hljs-number { color: #b5cea8; }
.cvp-code .hljs-comment { color: #6a9955; font-style: italic; }
.cvp-code .hljs-function { color: #dcdcaa; }
.cvp-code .hljs-variable { color: #9cdcfe; }
.cvp-code .hljs-type { color: #4ec9b0; }
`;
  
  document.head.appendChild(style);
  console.log('✅ [MessageUIFix] Styles injected (v4 - Header-Safe)');
}

// ============================================================================
// SCOPED OBSERVER - Only watch chat containers, NOT entire body
// ============================================================================

let debounceTimer: number | null = null;
let observerInstance: MutationObserver | null = null;

// ============================================================================
// ⭐ FIX v14: MARKDOWN FIX GUARD
// Prevents MarkdownFix from re-processing already-rendered messages
// which destroys code blocks by double-escaping HTML
// ============================================================================

function installMarkdownFixGuard(): void {
  console.log('🛡️ [MUF] Installing MarkdownFix guard...');
  
  // Store enhanced message HTML snapshots for recovery
  const enhancedSnapshots = new WeakMap<Element, string>();
  
  // Watch for AI messages having their innerHTML replaced after MUF enhancement
  const guardObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      
      const target = mutation.target as HTMLElement;
      if (!target) continue;
      
      // Check if this is a message that was MUF-rendered
      const message = target.closest?.('[data-muf-rendered="true"]');
      if (!message) continue;
      
      // Check if MUF blocks were destroyed (removed from DOM)
      const hasBlocks = message.querySelector('.muf-block');
      if (!hasBlocks && mutation.removedNodes.length > 0) {
        // Check if removed nodes contained MUF blocks
        let hadMufBlocks = false;
        mutation.removedNodes.forEach(node => {
          if (node instanceof HTMLElement && 
              (node.classList?.contains('muf-block') || node.querySelector?.('.muf-block'))) {
            hadMufBlocks = true;
          }
        });
        
        if (hadMufBlocks) {
          console.warn('🛡️ [MUF Guard] Code blocks destroyed by reprocessing! Re-enhancing...');
          // Re-enhance after a short delay to let the DOM settle
          setTimeout(() => {
            // Remove muf-done flags so blocks can be re-enhanced
            message.querySelectorAll('[data-muf-done]').forEach(el => {
              el.removeAttribute('data-muf-done');
            });
            enhanceCodeBlocks();
            // ⭐ v16: Clean ghost panels after re-enhancement
            setTimeout(cleanupGhostPanels, 150);
          }, 100);
        }
      }
    }
  });
  
  // Observe the chat container for changes to AI messages
  const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTORS);
  if (chatContainer) {
    guardObserver.observe(chatContainer, { childList: true, subtree: true });
  } else {
    // Retry when chat container becomes available
    setTimeout(() => {
      const container = document.querySelector(CHAT_CONTAINER_SELECTORS);
      if (container) {
        guardObserver.observe(container, { childList: true, subtree: true });
      }
    }, 2000);
  }
  
  // Also patch window.fixMessages / fixRawMarkdownMessages if they exist
  // These are MarkdownFix's entry points
  const patchMarkdownFix = () => {
    const win = window as any;
    
    // Patch fixMessages
    if (typeof win.fixMessages === 'function' && !win._mufPatchedFixMessages) {
      const originalFixMessages = win.fixMessages;
      win.fixMessages = function() {
        // Before running, mark all MUF-enhanced messages to skip
        document.querySelectorAll('[data-muf-rendered="true"]').forEach(msg => {
          msg.setAttribute('data-markdown-processed', 'true');
          msg.setAttribute('data-skip-reprocess', 'true');
        });
        return originalFixMessages.apply(this, arguments);
      };
      win._mufPatchedFixMessages = true;
      console.log('🛡️ [MUF Guard] Patched window.fixMessages');
    }
    
    // Patch fixRawMarkdownMessages
    if (typeof win.fixRawMarkdownMessages === 'function' && !win._mufPatchedFixRaw) {
      const originalFixRaw = win.fixRawMarkdownMessages;
      win.fixRawMarkdownMessages = function() {
        document.querySelectorAll('[data-muf-rendered="true"]').forEach(msg => {
          msg.setAttribute('data-markdown-processed', 'true');
          msg.setAttribute('data-skip-reprocess', 'true');
        });
        return originalFixRaw.apply(this, arguments);
      };
      win._mufPatchedFixRaw = true;
      console.log('🛡️ [MUF Guard] Patched window.fixRawMarkdownMessages');
    }
  };
  
  // Patch immediately and retry (MarkdownFix may load later)
  patchMarkdownFix();
  setTimeout(patchMarkdownFix, 1000);
  setTimeout(patchMarkdownFix, 3000);
  setTimeout(patchMarkdownFix, 5000);
  
  console.log('🛡️ [MUF Guard] Installed');
}

function setupObserver(): void {
  // Clean up any existing observer
  if (observerInstance) {
    observerInstance.disconnect();
  }
  
  observerInstance = new MutationObserver((mutations) => {
    // Check if any mutation is in the chat area
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      const target = mutation.target as HTMLElement;
      
      // Skip if mutation is in excluded area
      if (isInExcludedArea(target)) {
        continue;
      }
      
      // Only process if mutation is in chat area or adds nodes to chat area
      if (isInChatArea(target)) {
        shouldProcess = true;
        break;
      }
      
      // Check added nodes
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement) {
          if (!isInExcludedArea(node) && (isInChatArea(node) || node.querySelector('pre'))) {
            shouldProcess = true;
            break;
          }
        }
      }
      
      if (shouldProcess) break;
    }
    
    if (shouldProcess) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        enhanceCodeBlocks();
        // ⭐ v16: Also clean ghost panels after each enhancement cycle
        // MP observer may re-wrap blocks, so clean after a delay too
        cleanupGhostPanels();
        setTimeout(cleanupGhostPanels, 200);
      }, 150); // Slightly longer debounce
    }
  });
  
  // Try to find chat container first
  const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTORS);
  
  if (chatContainer) {
    // Watch only the chat container
    observerInstance.observe(chatContainer, { childList: true, subtree: true });
    console.log('✅ [MessageUIFix] Observer active (scoped to chat container)');
  } else {
    // Fallback: watch body but with filtering
    observerInstance.observe(document.body, { childList: true, subtree: true });
    console.log('⚠️ [MessageUIFix] Observer active (body fallback - will filter mutations)');
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let mufInitialized = false;

export async function initMessageUIFix(): Promise<void> {
  // Prevent double initialization
  if (mufInitialized) {
    console.log('⚠️ [MessageUIFix] Already initialized, skipping');
    return;
  }
  mufInitialized = true;
  
  console.log('🚀 [MessageUIFix] Initializing v16 (Ghost Panel Cleanup + Language Fix + Streaming Protection + MarkdownFix Guard)...');
  
  // Inject styles
  injectStyles();
  
  // Load highlight.js
  await loadHighlightJS();
  
  // Setup click handler with CAPTURE phase for priority
  document.removeEventListener('click', handleClick, true);
  document.addEventListener('click', handleClick, true);  // true = capture phase
  
  // ⭐ FIX v14: Install MarkdownFix guard to prevent code block destruction
  installMarkdownFixGuard();
  
  // Initial enhancement (more aggressive attempts)
  setTimeout(enhanceCodeBlocks, 100);
  setTimeout(enhanceCodeBlocks, 300);
  setTimeout(enhanceCodeBlocks, 500);
  setTimeout(enhanceCodeBlocks, 800);
  setTimeout(enhanceCodeBlocks, 1200);
  setTimeout(enhanceCodeBlocks, 2000);
  
  // Setup scoped observer
  setupObserver();
  
  // Periodic backup - More frequent (2 seconds)
  setInterval(enhanceCodeBlocks, 2000);
  
  console.log('✅ [MessageUIFix] Ready! (v14 - Language Fix + MarkdownFix Guard)');
}

// Expose globally
if (typeof window !== 'undefined') {
  (window as any).enhanceCodeBlocks = enhanceCodeBlocks;
  (window as any).initMessageUIFix = initMessageUIFix;
  (window as any).mufPreprocess = preprocessMalformedMarkdown;
  (window as any).openCodeViewer = openCodeViewer;
  (window as any).closeCodeViewer = closeCodeViewer;
  (window as any).closeAllCodeViewers = closeAllCodeViewers;
  (window as any).isInExcludedArea = isInExcludedArea; // Expose for debugging
}

// Auto-initialize (with guard)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!mufInitialized) initMessageUIFix();
  });
} else {
  setTimeout(() => {
    if (!mufInitialized) initMessageUIFix();
  }, 100);
}

export { enhanceCodeBlocks, openCodeViewer, closeCodeViewer, closeAllCodeViewers };
