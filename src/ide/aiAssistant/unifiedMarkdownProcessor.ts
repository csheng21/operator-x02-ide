// unifiedMarkdownProcessor.ts - IMPROVED VERSION
// ============================================================================
// FIXES:
// 1. Regex now handles code blocks without newline after language
// 2. Better preprocessing to recover malformed blocks
// 3. Enhanced UI with VS Code-like styling
// ============================================================================

/**
 * ⭐ FIX: Clean up language identifier prefixes that leaked into code
 * e.g., "t\n// pins.ts" from "typescript\n// pins.ts"
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

interface CodeBlock {
  id: string;
  lang: string;
  code: string;
  index: number;
  filename?: string;
  isNew?: boolean;
}

interface ProcessedMessage {
  html: string;
  codeBlocks: Map<string, CodeBlock>;
  isProcessed: boolean;
}

class UnifiedMarkdownProcessor {
  private static instance: UnifiedMarkdownProcessor;
  private codeBlockCache = new Map<string, Map<string, CodeBlock>>();
  private initialized = false;
  
  private constructor() {}
  
  static getInstance(): UnifiedMarkdownProcessor {
    if (!this.instance) {
      this.instance = new UnifiedMarkdownProcessor();
    }
    return this.instance;
  }
  
  // ============================================================================
  // FIX #1: Preprocess content to fix malformed code blocks
  // ============================================================================
  private preprocessContent(content: string): string {
    let processed = content;
    
    // ⭐ Debug: Log first 200 chars to help diagnose issues
    console.log(`[MarkdownProcessor] Preprocessing content: "${content.substring(0, 200).replace(/\n/g, '↵')}..."`);
    
    // Fix 1: Handle ``` without newline after language
    // ```typescript// becomes ```typescript\n//
    processed = processed.replace(
      /```(\w+)([^\n`])/g, 
      '```$1\n$2'
    );
    
    // Fix 2: Handle missing backtick (`` instead of ```)
    processed = processed.replace(
      /``(typescript|javascript|jsx|tsx|python|rust|go|java|css|scss|html|xml|json|yaml|bash|sh|sql|ruby|php|c|cpp|csharp|swift|kotlin|vue|svelte|markdown|md|plaintext)(\s|\n|\/|#|\{|<)/gi,
      '```$1$2'
    );
    
    // ⭐ FIX 2.5: Handle single backtick with language (malformed fence)
    // `typescript\n code becomes ```typescript\n code
    processed = processed.replace(
      /(?<![`\\])`(typescript|javascript|jsx|tsx|python|rust|go|java|css|scss|html|xml|json|yaml|bash|sh|sql|ruby|php|c|cpp|h|hpp|ino|csharp|swift|kotlin)\s*\n/gi,
      '```$1\n'
    );
    
    // Fix 3: Ensure closing ``` is on its own line
    processed = processed.replace(/([^\n])```$/gm, '$1\n```');
    
    // ⭐ FIX 3.5: Handle case where language tag is on separate line from opening fence
    // ```\ntypescript\ncode becomes ```typescript\ncode
    processed = processed.replace(
      /```\s*\n(typescript|javascript|jsx|tsx|python|rust|go|java|css|scss|html|json|c|cpp|plaintext)\s*\n/gi,
      '```$1\n'
    );
    
    // Fix 4: Count open/close and add missing closing if needed
    const openCount = (processed.match(/```\w*/g) || []).length;
    const closeCount = (processed.match(/\n```(?!\w)/g) || []).length;
    if (openCount > closeCount) {
      processed += '\n```';
    }
    
    // ⭐ FIX 5: If content looks like code but has no fences at all, wrap it
    // Detect: starts with import/export/function/class/const/#include etc with no ``` anywhere
    if (!processed.includes('```')) {
      const looksLikeCode = /^(import |export |function |class |const |let |var |#include |#define |\/\*\*|\/\/ )/m.test(processed);
      const hasCodeStructure = (processed.match(/[\{\}\(\);]/g) || []).length > 5;
      
      if (looksLikeCode && hasCodeStructure) {
        // Try to detect language
        let lang = 'plaintext';
        if (/#include|#define|void\s+\w+\(|int\s+\w+\(/.test(processed)) lang = 'c';
        else if (/import.*from|export\s+(default|const|function|class)/.test(processed)) lang = 'typescript';
        else if (/def\s+\w+\(|import\s+\w+/.test(processed)) lang = 'python';
        
        console.log(`[MarkdownProcessor] Detected unfenced code, wrapping as ${lang}`);
        processed = '```' + lang + '\n' + processed + '\n```';
      }
    }
    
    return processed;
  }
  
  // ============================================================================
  // FIX #2: Improved regex that handles more cases
  // ============================================================================
  processMarkdown(content: string, messageId?: string): ProcessedMessage {
    if (this.isAlreadyProcessed(content)) {
      return {
        html: content,
        codeBlocks: new Map(),
        isProcessed: true
      };
    }
    
    // Preprocess to fix malformed code blocks
    const preprocessed = this.preprocessContent(content);
    
    const msgId = messageId || `msg-${Date.now()}`;
    const codeBlocks = new Map<string, CodeBlock>();
    const codeBlockPlaceholders = new Map<string, string>();
    let codeBlockIndex = 0;
    
    // IMPROVED REGEX: Now handles both with and without newline after language
    // Also handles: ```lang code``` (no newlines at all)
    let processed = preprocessed.replace(
      /```(\w*)\s*([\s\S]*?)```/g, 
      (match, lang, code) => {
        const blockId = `${msgId}-code-${codeBlockIndex}`;
        const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
        
        // Clean up code - remove leading newline if present
        let cleanCode = code.replace(/^\n/, '').replace(/\n$/, '');
        
        // ⭐ FIX: Clean up any language prefix garbage
        cleanCode = cleanLanguagePrefix(cleanCode);
        
        // ⭐ FIX: Auto-detect language if plaintext or empty
        let detectedLang = lang || 'plaintext';
        if (detectedLang === '' || detectedLang === 'plaintext' || detectedLang === 'text') {
          const autoDetected = this.detectLanguageFromCode(cleanCode);
          if (autoDetected !== 'plaintext') {
            console.log(`[MarkdownProcessor] Auto-detected language: ${autoDetected} (was: ${detectedLang})`);
            detectedLang = autoDetected;
          }
        }
        
        // Try to detect filename from context or code comment
        const filename = this.detectFilename(cleanCode, detectedLang);
        
        // If code is on single line but looks like it should be multi-line, format it
        if (!cleanCode.includes('\n') && cleanCode.length > 80) {
          cleanCode = this.restoreNewlines(cleanCode, detectedLang);
        }
        
        const codeBlock: CodeBlock = {
          id: blockId,
          lang: detectedLang,
          code: cleanCode,
          index: codeBlockIndex,
          filename: filename || undefined
        };
        
        codeBlocks.set(blockId, codeBlock);
        codeBlockPlaceholders.set(placeholder, this.renderCodeBlock(codeBlock));
        codeBlockIndex++;
        
        return placeholder;
      }
    );
    
    // Handle inline code
    processed = processed.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
    });
    
    processed = this.processMarkdownFormatting(processed);
    
    // Restore code blocks
    codeBlockPlaceholders.forEach((html, placeholder) => {
      processed = processed.replace(placeholder, html);
    });
    
    this.codeBlockCache.set(msgId, codeBlocks);
    
    return {
      html: processed,
      codeBlocks: codeBlocks,
      isProcessed: false
    };
  }
  
  // ============================================================================
  // NEW: Auto-detect language from code content
  // ============================================================================
  private detectLanguageFromCode(code: string): string {
    // ⭐ C/C++ indicators - CHECK FIRST (preprocessor directives are strongest indicator)
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
      if (/\b(class\s+\w+|namespace|cout|cin|std::|new\s+\w+)/m.test(code)) {
        return 'cpp';
      }
      return 'c';
    }
    
    // Arduino patterns
    if (/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial\.|delay|setup|loop)\s*\(/m.test(code)) {
      return 'cpp';
    }
    
    // TypeScript indicators
    if (/:\s*(string|number|boolean|void|any|unknown|never)\b/.test(code) ||
        /interface\s+\w+/.test(code) ||
        /type\s+\w+\s*=/.test(code)) {
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
        /import\s+\w+/.test(code) && !/{/.test(code)) {
      return 'python';
    }
    
    // Rust indicators
    if (/\bfn\s+\w+\s*\(/.test(code) ||
        /\blet\s+mut\s+/.test(code) ||
        /\bimpl\s+\w+/.test(code)) {
      return 'rust';
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
  // NEW: Detect filename from code or context
  // ============================================================================
  private detectFilename(code: string, lang: string): string | null {
    // Check first line for filename comment
    const firstLine = code.split('\n')[0] || '';
    
    // Patterns: // filename.ts, /* filename.css */, # filename.py
    const patterns = [
      /^\/\/\s*([\w.-]+\.\w+)/,           // // file.ts
      /^\/\*\s*([\w.-]+\.\w+)\s*\*\//,    // /* file.css */
      /^#\s*([\w.-]+\.\w+)/,              // # file.py
      /^<!--\s*([\w.-]+\.\w+)\s*-->/,     // <!-- file.html -->
    ];
    
    for (const pattern of patterns) {
      const match = firstLine.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
  
  // ============================================================================
  // NEW: Restore newlines in collapsed code
  // ============================================================================
  private restoreNewlines(code: string, lang: string): string {
    if (['typescript', 'javascript', 'tsx', 'jsx'].includes(lang)) {
      return code
        .replace(/(\})\s*(interface|type|class|function|const|let|var|export|import|async)/g, '$1\n\n$2')
        .replace(/(from\s+['"][^'"]+['"];?)\s*(import|const|let|var|function|class|export)/g, '$1\n\n$2')
        .replace(/\{\s*(?=[a-zA-Z_$'"<])/g, '{\n  ')
        .replace(/;(?!\s*[)\]'"])\s*(?=[a-zA-Z_$}])/g, ';\n')
        .replace(/\}\s*(?=[a-zA-Z])/g, '}\n')
        .replace(/,\s*(?=[{'"a-zA-Z_$])/g, ',\n  ')
        .replace(/\n{3,}/g, '\n\n');
    }
    
    if (['css', 'scss', 'less'].includes(lang)) {
      return code
        .replace(/\{\s*/g, '{\n  ')
        .replace(/;\s*(?=[a-zA-Z-}])/g, ';\n  ')
        .replace(/\}\s*/g, '\n}\n\n');
    }
    
    if (['html', 'xml', 'svg'].includes(lang)) {
      return code.replace(/>\s*</g, '>\n<');
    }
    
    if (lang === 'json') {
      try {
        return JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        return code;
      }
    }
    
    return code;
  }
  
  private isAlreadyProcessed(content: string): boolean {
    return content.includes('code-block-container') ||
           content.includes('data-code-id=') ||
           content.includes('hidden-code-data') ||
           content.includes('class="cmd-response"');
  }
  
  private processMarkdownFormatting(text: string): string {
    let processed = text;
    
    // ⭐ FIX: Protect JSDoc/multiline comment patterns from markdown processing
    // Save them with placeholders, then restore after
    const protectedBlocks: string[] = [];
    
    // Protect JSDoc blocks: /** ... */
    processed = processed.replace(/\/\*\*[\s\S]*?\*\//g, (match) => {
      const index = protectedBlocks.length;
      protectedBlocks.push(match);
      return `__PROTECTED_BLOCK_${index}__`;
    });
    
    // Protect multi-line comments: /* ... */
    processed = processed.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      const index = protectedBlocks.length;
      protectedBlocks.push(match);
      return `__PROTECTED_BLOCK_${index}__`;
    });
    
    // Protect lines starting with * (JSDoc continuation lines)
    processed = processed.replace(/^\s*\*\s+@\w+.*/gm, (match) => {
      const index = protectedBlocks.length;
      protectedBlocks.push(match);
      return `__PROTECTED_BLOCK_${index}__`;
    });
    
    // Protect lines that look like JSDoc comment lines: " * description"
    processed = processed.replace(/^\s*\*\s+[A-Z@].*/gm, (match) => {
      const index = protectedBlocks.length;
      protectedBlocks.push(match);
      return `__PROTECTED_BLOCK_${index}__`;
    });
    
    // Now apply markdown formatting (safe - JSDoc is protected)
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    processed = processed.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    processed = processed.replace(/^\- (.+)$/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    processed = processed.replace(/\n\n/g, '</p><p>');
    if (!processed.startsWith('<')) {
      processed = '<p>' + processed + '</p>';
    }
    
    // Restore protected blocks
    protectedBlocks.forEach((original, index) => {
      processed = processed.replace(`__PROTECTED_BLOCK_${index}__`, original);
    });
    
    return processed;
  }
  
  // ============================================================================
  // IMPROVED UI: VS Code-like code block rendering
  // ============================================================================
  private renderCodeBlock(block: CodeBlock): string {
    const escapedCode = this.escapeHtml(block.code);
    const lines = block.code.split('\n');
    const lineCount = lines.length;
    
    // v12: Check if this is documentation content
    const isDocumentation = (block.lang === 'plaintext' || block.lang === 'text' || !block.lang) 
      && this.isDocumentationContent(block.code);
    
    // Documentation content should not collapse or show line numbers
    // v13: ALL blocks collapse at 2 lines, including documentation
    const shouldCollapse = lineCount > 2;
    const showLineNumbers = !isDocumentation;
    
    // Language icon based on type
    const langIcon = this.getLanguageIcon(block.lang);
    const langColor = this.getLanguageColor(block.lang);
    
    // File badge if filename detected
    const fileBadge = block.filename 
      ? `<span class="code-filename">${block.filename}</span>` 
      : '';
    
    // Documentation gets simpler rendering
    if (isDocumentation) {
      return `
        <div class="code-block-container documentation-block" 
             data-code-id="${block.id}" 
             data-collapsed="false"
             data-lang="text"
             data-is-documentation="true"
             data-no-insert="true">
          <div class="code-header documentation-header">
            <div class="code-header-left">
              <span class="code-lang-icon" style="color: #6aa3d5">📝</span>
              <span class="code-lang">TEXT</span>
              <span class="code-line-count">${lineCount} lines</span>
            </div>
            <div class="code-actions">
              <button class="copy-code-btn" data-code-id="${block.id}" title="Copy">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="code-content-wrapper documentation-content">
            <pre style="padding: 12px 16px; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12.5px; line-height: 1.5;"><code data-code-id="${block.id}">${escapedCode}</code></pre>
          </div>
          <textarea class="hidden-code-data" data-code-id="${block.id}" style="display:none;">${block.code}</textarea>
        </div>
      `;
    }
    
    // ⭐ FIX: Mark plaintext as no-insert even if not detected as documentation
    const noInsert = block.lang === 'plaintext' || block.lang === 'text' || !block.lang;
    
    return `
      <div class="code-block-container ${shouldCollapse ? 'collapsible' : ''}" 
           data-code-id="${block.id}" 
           data-collapsed="${shouldCollapse}"
           data-lang="${block.lang}"
           data-no-insert="${noInsert}">
        <div class="code-header">
          <div class="code-header-left">
            <span class="code-lang-icon" style="color: ${langColor}">${langIcon}</span>
            <span class="code-lang">${block.lang.toUpperCase()}</span>
            ${fileBadge}
            <span class="code-line-count">${lineCount} line${lineCount > 1 ? 's' : ''}</span>
          </div>
          <div class="code-actions">
            ${shouldCollapse ? `
              <button class="code-toggle-btn" data-code-id="${block.id}" data-state="collapsed" title="Toggle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            ` : ''}
            <button class="copy-code-btn" data-code-id="${block.id}" title="Copy">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            ${!noInsert ? `
            <button class="insert-code-btn" data-code-id="${block.id}" title="Insert to Editor">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </button>
            ` : ''}
          </div>
        </div>
        <div class="code-content-wrapper">
          ${showLineNumbers ? `<div class="code-line-numbers">${this.renderLineNumbers(lineCount)}</div>` : ''}
          <pre><code class="language-${block.lang}" data-code-id="${block.id}">${escapedCode}</code></pre>
        </div>
        ${shouldCollapse ? `
          <div class="code-expand-bar">
            <button class="code-expand-btn" data-code-id="${block.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <span>Show all ${lineCount} lines</span>
            </button>
          </div>
        ` : ''}
        <textarea class="hidden-code-data" data-code-id="${block.id}" style="display:none;">${block.code}</textarea>
      </div>
    `;
  }
  
  // ============================================================================
  // NEW: Line numbers for code blocks
  // ============================================================================
  private renderLineNumbers(count: number): string {
    return Array.from({ length: count }, (_, i) => 
      `<span class="line-number">${i + 1}</span>`
    ).join('\n');
  }
  
  // ============================================================================
  // NEW: Language-specific icons (SVG)
  // ============================================================================
  private getLanguageIcon(lang: string): string {
    const icons: Record<string, string> = {
      typescript: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg>`,
      javascript: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>`,
      python: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/></svg>`,
      rust: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.687 11.709l-.995-.616a13.559 13.559 0 0 0-.028-.29l.855-.797a.344.344 0 0 0-.114-.571l-1.093-.393a8.597 8.597 0 0 0-.086-.282l.682-.947a.344.344 0 0 0-.225-.529l-1.143-.205a8.153 8.153 0 0 0-.14-.261l.48-1.063a.344.344 0 0 0-.326-.477l-1.152.027a7.786 7.786 0 0 0-.188-.227l.256-1.14a.344.344 0 0 0-.41-.41l-1.14.256c-.073-.066-.15-.13-.228-.188l.028-1.152a.344.344 0 0 0-.477-.326l-1.063.48c-.085-.05-.173-.095-.262-.14l-.205-1.143a.344.344 0 0 0-.529-.225l-.947.682a7.928 7.928 0 0 0-.282-.085l-.393-1.093a.344.344 0 0 0-.571-.114l-.797.855a9.316 9.316 0 0 0-.29-.028l-.616-.995a.344.344 0 0 0-.584 0l-.616.995a9.316 9.316 0 0 0-.29.028l-.797-.855a.344.344 0 0 0-.571.114l-.393 1.093c-.094.027-.188.055-.281.085l-.948-.682a.344.344 0 0 0-.529.225l-.205 1.143c-.089.045-.177.09-.262.14l-1.063-.48a.344.344 0 0 0-.477.326l.027 1.152a7.786 7.786 0 0 0-.227.188l-1.14-.256a.344.344 0 0 0-.41.41l.256 1.14c-.066.073-.13.15-.188.228l-1.152-.028a.344.344 0 0 0-.326.477l.48 1.063c-.05.085-.096.173-.14.262l-1.143.205a.344.344 0 0 0-.225.529l.682.947c-.029.093-.058.187-.085.282l-1.093.393a.344.344 0 0 0-.114.571l.855.797c-.01.096-.02.193-.028.29l-.995.616a.344.344 0 0 0 0 .584l.995.616c.008.097.018.194.028.29l-.855.797a.344.344 0 0 0 .114.571l1.093.393c.027.095.056.189.085.282l-.682.947a.344.344 0 0 0 .225.529l1.143.205c.044.089.09.177.14.262l-.48 1.063a.344.344 0 0 0 .326.477l1.152-.028c.058.078.122.155.188.228l-.256 1.14a.344.344 0 0 0 .41.41l1.14-.256c.073.066.15.13.228.188l-.028 1.152a.344.344 0 0 0 .477.326l1.063-.48c.085.05.173.096.262.14l.205 1.143a.344.344 0 0 0 .529.225l.947-.682c.093.029.187.058.282.085l.393 1.093a.344.344 0 0 0 .571.114l.797-.855c.096.01.193.02.29.028l.616.995a.344.344 0 0 0 .584 0l.616-.995c.097-.008.194-.018.29-.028l.797.855a.344.344 0 0 0 .571-.114l.393-1.093c.095-.027.189-.056.282-.085l.947.682a.344.344 0 0 0 .529-.225l.205-1.143c.089-.044.177-.09.262-.14l1.063.48a.344.344 0 0 0 .477-.326l-.027-1.152c.078-.058.155-.122.227-.188l1.14.256a.344.344 0 0 0 .41-.41l-.256-1.14c.066-.073.13-.15.188-.228l1.152.028a.344.344 0 0 0 .326-.477l-.48-1.063c.05-.085.095-.173.14-.262l1.143-.205a.344.344 0 0 0 .225-.529l-.682-.947c.03-.093.058-.187.086-.282l1.093-.393a.344.344 0 0 0 .114-.571l-.855-.797c.01-.096.02-.193.028-.29l.995-.616a.344.344 0 0 0 0-.584zM12 18.543a6.543 6.543 0 1 1 0-13.086 6.543 6.543 0 0 1 0 13.086z"/></svg>`,
      html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/></svg>`,
      css: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z"/></svg>`,
      json: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.759 3.975h1.783V5.76H5.759v4.458A1.783 1.783 0 0 1 3.975 12a1.783 1.783 0 0 1 1.784 1.783v4.459h1.783v1.783H5.759c-.954-.24-1.784-.803-1.784-1.783v-3.567a1.783 1.783 0 0 0-1.783-1.783H1.3v-1.783h.892a1.783 1.783 0 0 0 1.783-1.784V5.758c0-.98.83-1.543 1.784-1.783zm12.483 0c.954.24 1.784.803 1.784 1.783v3.567a1.783 1.783 0 0 0 1.783 1.784h.892v1.783h-.892a1.783 1.783 0 0 0-1.783 1.783v3.567c0 .98-.83 1.543-1.784 1.783h-1.783V18.25h1.783v-4.459A1.783 1.783 0 0 1 20.025 12a1.783 1.783 0 0 1-1.783-1.783V5.759h-1.783V3.975h1.783z"/></svg>`,
      bash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.038 4.9l-7.577-4.63a2.92 2.92 0 0 0-2.968.022L2.953 4.9a2.92 2.92 0 0 0-1.457 2.53v9.2a2.92 2.92 0 0 0 1.457 2.53l7.54 4.607a2.92 2.92 0 0 0 2.968.022l7.577-4.63A2.92 2.92 0 0 0 22.5 16.6V7.43a2.92 2.92 0 0 0-1.462-2.53zM7.875 16.15v1.175H6.7V16.15h1.175zm0-8.1v7.225H6.7V8.05h1.175zm9.9 6.55l-3.125 1.875v-1.1l2.15-1.275-2.15-1.275V11.75l3.125 1.875v.975z"/></svg>`,
      c: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="5" y="17" font-size="14" font-weight="bold">C</text></svg>`,
      h: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="5" y="17" font-size="14" font-weight="bold">H</text></svg>`,
      cpp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" font-size="11" font-weight="bold">C++</text></svg>`,
      hpp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" font-size="10" font-weight="bold">H++</text></svg>`,
    };
    
    return icons[lang] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  }
  
  // ============================================================================
  // NEW: Language-specific colors
  // ============================================================================
  private getLanguageColor(lang: string): string {
    const colors: Record<string, string> = {
      typescript: '#3178c6',
      javascript: '#f7df1e',
      python: '#3776ab',
      rust: '#ce422b',
      // ⭐ C/C++ colors
      c: '#a8b9cc',
      h: '#a8b9cc',
      cpp: '#00599c',
      hpp: '#00599c',
      csharp: '#68217a',
      cs: '#68217a',
      html: '#e34f26',
      css: '#1572b6',
      scss: '#cc6699',
      json: '#292929',
      bash: '#4eaa25',
      sh: '#4eaa25',
      go: '#00add8',
      java: '#ed8b00',
      php: '#777bb4',
      ruby: '#cc342d',
      swift: '#fa7343',
      kotlin: '#7f52ff',
      vue: '#4fc08d',
      svelte: '#ff3e00',
      sql: '#e38c00',
    };
    
    return colors[lang] || '#6e7681';
  }
  
  // ============================================================================
  // v12: Detect documentation/prose content
  // ============================================================================
  private isDocumentationContent(code: string): boolean {
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
      console.log('[MarkdownProcessor] Detected ASCII box diagram');
      return true;
    }
    
    // If has arrows and looks like a layer diagram
    if (arrowLines >= 2 && /layer|level|tier|component|module/i.test(code)) {
      console.log('[MarkdownProcessor] Detected architecture diagram');
      return true;
    }
    
    let docIndicators = 0;
    let codeIndicators = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Documentation indicators
      if (/^#{1,6}\s+/.test(trimmed)) { docIndicators += 2; continue; }
      if (/^[A-Z][A-Za-z\s]+:$/.test(trimmed)) { docIndicators += 3; continue; }
      if (/^[-*•]\s+[A-Z]/.test(trimmed)) { docIndicators += 2; continue; }
      if (/^[-*•]\s+\*\*[^*]+\*\*/.test(trimmed)) { docIndicators += 3; continue; }
      if (/^\d+\.\s+[A-Z][a-z]/.test(trimmed)) { docIndicators += 2; continue; }
      if (/^\d+\.\s+\*\*[^*]+\*\*/.test(trimmed)) { docIndicators += 3; continue; }
      if (/^[A-Z][a-z]+\s+[a-z]+\s+[a-z]+/.test(trimmed)) { docIndicators++; }
      if (/\b(Example|Output|Note|Usage|Features|Benefits|Typical|Architecture|Structure)\b/i.test(trimmed)) { docIndicators += 2; }
      if (/[.!?:]\s*$/.test(trimmed) && trimmed.length > 20) { docIndicators++; }
      if (/\*\*[^*]+\*\*/.test(trimmed)) { docIndicators++; }
      
      // ⭐ v13: C/C++ preprocessor directives - STRONG code indicator
      if (/^#\s*(define|include|ifndef|ifdef|endif|if|elif|else|pragma|undef|warning|error)\b/.test(trimmed)) { codeIndicators += 5; continue; }
      
      // ⭐ v13: C/C++ type keywords and declarations
      if (/\b(int|void|char|float|double|long|short|unsigned|signed|struct|typedef|enum|union|static|const|volatile|extern|register)\s+\w+/.test(trimmed)) { codeIndicators += 3; }
      
      // ⭐ v13: Arduino/embedded specific
      if (/\b(pinMode|digitalWrite|digitalRead|analogWrite|analogRead|Serial|delay|millis|setup|loop)\s*\(/.test(trimmed)) { codeIndicators += 4; }
      
      // ⭐ v13: Common C macros and patterns
      if (/^[A-Z][A-Z0-9_]+\s*[=\(]/.test(trimmed)) { codeIndicators += 2; }
      if (/\bNULL\b|\bTRUE\b|\bFALSE\b/.test(trimmed)) { codeIndicators += 2; }
      
      // Code indicators (JS/TS)
      if (/(?:const|let|var|function|class|interface|type|import|export)\s+\w+/.test(trimmed)) { codeIndicators += 3; }
      if (/[=]{2,3}|[!]=|&&|\|\||=>/.test(trimmed)) { codeIndicators += 2; }
      if (/\{|\}|\[|\]|;$/.test(trimmed)) { codeIndicators++; }
    }
    
    if (docIndicators > 0 && docIndicators >= codeIndicators * 1.5) return true;
    
    let proseLines = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[A-Z#\-*•\d]/.test(trimmed) && 
          trimmed.split(/\s+/).length >= 3 &&
          !/[{};=]$/.test(trimmed) &&
          !/^#\s*(define|include|ifndef|ifdef|endif|if|elif|else)/.test(trimmed)) { // ⭐ v13: Don't count preprocessor as prose
        proseLines++;
      }
    }
    if (proseLines / lines.length >= 0.5) return true;
    
    return false;
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  getOriginalCode(codeId: string): string | null {
    const textarea = document.querySelector(`textarea[data-code-id="${codeId}"]`) as HTMLTextAreaElement;
    if (textarea?.value) return textarea.value;
    
    for (const [msgId, blocks] of this.codeBlockCache) {
      const block = blocks.get(codeId);
      if (block) return block.code;
    }
    
    const codeElement = document.querySelector(`code[data-code-id="${codeId}"]`);
    return codeElement?.textContent || null;
  }
  
  getCodeLanguage(codeId: string): string {
    for (const [msgId, blocks] of this.codeBlockCache) {
      const block = blocks.get(codeId);
      if (block) return block.lang;
    }
    
    const langSpan = document.querySelector(`.code-block-container[data-code-id="${codeId}"] .code-lang`);
    return langSpan?.textContent || 'plaintext';
  }
  
  setupCodeBlockHandlers(container?: HTMLElement): void {
    if (!this.initialized) {
      document.removeEventListener('click', this.handleCodeBlockClick);
      document.addEventListener('click', this.handleCodeBlockClick);
      this.initialized = true;
    }
    this.addCollapsibleCodeStyles();
    console.log('✅ [MarkdownProcessor] Code block handlers setup complete');
  }
  
  private handleCodeBlockClick = async (e: Event) => {
    const target = e.target as HTMLElement;
    
    // Copy button
    if (target.closest('.copy-code-btn')) {
      const btn = target.closest('.copy-code-btn') as HTMLElement;
      const codeId = btn.getAttribute('data-code-id');
      if (codeId) {
        const code = this.getOriginalCode(codeId);
        if (code) this.copyToClipboard(code, btn);
      }
    }
    
    // Insert button
    if (target.closest('.insert-code-btn')) {
      const btn = target.closest('.insert-code-btn') as HTMLElement;
      const codeId = btn.getAttribute('data-code-id');
      if (codeId) {
        const code = this.getOriginalCode(codeId);
        if (code) this.insertToEditor(code, btn);
      }
    }
    
    // Expand/Collapse buttons
    if (target.closest('.code-expand-btn') || target.closest('.code-toggle-btn')) {
      const btn = target.closest('.code-expand-btn, .code-toggle-btn') as HTMLElement;
      const codeId = btn.getAttribute('data-code-id');
      if (codeId) this.toggleCodeBlock(codeId);
    }
  };
  
  private toggleCodeBlock(codeId: string): void {
    const container = document.querySelector(`.code-block-container[data-code-id="${codeId}"]`);
    if (!container) return;
    
    const isCollapsed = container.getAttribute('data-collapsed') === 'true';
    container.setAttribute('data-collapsed', (!isCollapsed).toString());
    
    // Update toggle button icon
    const toggleBtn = container.querySelector('.code-toggle-btn');
    if (toggleBtn) {
      toggleBtn.setAttribute('data-state', isCollapsed ? 'expanded' : 'collapsed');
      toggleBtn.innerHTML = isCollapsed
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    }
  }
  
  private async copyToClipboard(code: string, btn: HTMLElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      btn.classList.add('success');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      
      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = originalHTML;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  private insertToEditor(code: string, btn: HTMLElement): void {
    const editor = (window as any).monaco?.editor?.getModels()?.[0];
    if (editor) {
      const model = (window as any).monaco.editor.getEditors()[0];
      if (model) {
        const selection = model.getSelection();
        model.executeEdits('insert', [{
          range: selection,
          text: code,
          forceMoveMarkers: true
        }]);
      }
    }
    
    btn.classList.add('success');
    setTimeout(() => btn.classList.remove('success'), 2000);
  }
  
  // ============================================================================
  // IMPROVED STYLES: VS Code-inspired design
  // ============================================================================
  private addCollapsibleCodeStyles(): void {
    if (document.getElementById('unified-markdown-styles-v2')) return;
    
    const styles = document.createElement('style');
    styles.id = 'unified-markdown-styles-v2';
    styles.textContent = `
      /* ==========================================
         VS CODE-INSPIRED CODE BLOCKS
      ========================================== */
      
      .code-block-container {
        position: relative; /* CRITICAL: Contains absolute positioned expand bar */
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 6px;
        margin: 8px 0;
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      }
      
      /* Header */
      .code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
        border-bottom: 1px solid #333;
        min-height: 32px;
      }
      
      .code-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .code-lang-icon {
        display: flex;
        align-items: center;
        opacity: 0.9;
      }
      
      .code-lang {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #858585;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .code-filename {
        font-size: 11px;
        color: #4fc3f7;
        font-weight: 500;
        padding: 1px 6px;
        background: rgba(79, 195, 247, 0.1);
        border-radius: 3px;
        font-family: 'JetBrains Mono', monospace;
      }
      
      .code-line-count {
        font-size: 10px;
        color: #5a5a5a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      /* Action buttons */
      .code-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      
      .code-actions button {
        background: transparent;
        border: none;
        color: #6e6e6e;
        padding: 4px 6px;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      
      .code-actions button:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #d4d4d4;
      }
      
      .code-actions button.success {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }
      
      .code-toggle-btn[data-state="expanded"] {
        transform: rotate(180deg);
      }
      
      /* Content wrapper */
      .code-content-wrapper {
        display: flex;
        position: relative;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      
      /* v13: Collapsed state shows 2 lines (~55px) */
      .code-block-container[data-collapsed="true"] .code-content-wrapper {
        max-height: 55px;
      }
      
      .code-block-container[data-collapsed="false"] .code-content-wrapper {
        max-height: none;
      }
      
      /* Line numbers */
      .code-line-numbers {
        display: flex;
        flex-direction: column;
        padding: 10px 0;
        background: #1a1a1a;
        border-right: 1px solid #333;
        user-select: none;
        min-width: 40px;
        text-align: right;
      }
      
      .line-number {
        color: #5a5a5a;
        font-size: 11px;
        line-height: 1.5;
        padding: 0 10px;
        font-family: 'JetBrains Mono', monospace;
      }
      
      /* Code content */
      .code-content-wrapper pre {
        flex: 1;
        margin: 0;
        padding: 10px 12px;
        overflow-x: auto;
        background: transparent;
        border: none;
      }
      
      .code-content-wrapper code {
        font-size: 12px;
        line-height: 1.5;
        color: #d4d4d4;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      }
      
      /* Expand bar */
      .code-expand-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        padding: 8px;
        background: linear-gradient(transparent, rgba(30, 30, 30, 0.95) 40%);
        pointer-events: none;
      }
      
      .code-block-container[data-collapsed="false"] .code-expand-bar {
        position: relative;
        background: #252526;
        border-top: 1px solid #333;
      }
      
      .code-expand-btn {
        pointer-events: auto;
        background: rgba(79, 195, 247, 0.1);
        border: 1px solid rgba(79, 195, 247, 0.3);
        color: #4fc3f7;
        padding: 5px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .code-expand-btn:hover {
        background: rgba(79, 195, 247, 0.2);
        border-color: rgba(79, 195, 247, 0.5);
      }
      
      .code-block-container[data-collapsed="false"] .code-expand-btn svg {
        transform: rotate(180deg);
      }
      
      .code-block-container[data-collapsed="false"] .code-expand-btn span {
        display: none;
      }
      
      .code-block-container[data-collapsed="false"] .code-expand-btn::after {
        content: 'Show less';
      }
      
      /* Hidden textarea */
      .hidden-code-data {
        display: none !important;
      }
      
      /* Inline code */
      .inline-code {
        background: rgba(110, 118, 129, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
        font-size: 0.9em;
        color: #79c0ff;
      }
      
      /* Scrollbar */
      .code-content-wrapper::-webkit-scrollbar {
        height: 6px;
      }
      
      .code-content-wrapper::-webkit-scrollbar-track {
        background: #1e1e1e;
      }
      
      .code-content-wrapper::-webkit-scrollbar-thumb {
        background: #424242;
        border-radius: 3px;
      }
      
      .code-content-wrapper::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .code-line-numbers {
          display: none;
        }
        
        .code-filename {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const markdownProcessor = UnifiedMarkdownProcessor.getInstance();

export const processMarkdown = (content: string, messageId?: string) => 
  markdownProcessor.processMarkdown(content, messageId);

export const setupCodeBlockHandlers = (container?: HTMLElement) => 
  markdownProcessor.setupCodeBlockHandlers(container);

export const getOriginalCode = (codeId: string) => 
  markdownProcessor.getOriginalCode(codeId);

export const getCodeLanguage = (codeId: string) => 
  markdownProcessor.getCodeLanguage(codeId);

export default markdownProcessor;

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).markdownProcessor = markdownProcessor;
  (window as any).processMarkdown = processMarkdown;
  (window as any).setupCodeBlockHandlers = setupCodeBlockHandlers;
  
  const init = () => {
    markdownProcessor.setupCodeBlockHandlers();
    console.log('✅ [UnifiedMarkdownProcessor] V2 Initialized - with code block fixes');
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
}
