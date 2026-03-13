// ideMessageStyles.ts
// ============================================================================
// IDE-STYLE MESSAGE CONTENT - Compact, Professional, Information-Dense v2.0
// Replaces web-chat styling with proper IDE assistant styling
// ============================================================================

console.log('🎨 [IDEMessageStyles] Loading IDE-style message formatting v2.0...');

/**
 * Inject IDE-appropriate styles for AI message content
 */
export function injectIDEMessageStyles(): void {
  if (document.getElementById('ide-message-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ide-message-styles';
  style.textContent = `
/* ============================================
   IDE MESSAGE STYLES v2.0 - Compact & Professional
============================================ */

/* ============================================
   BASE MESSAGE CONTENT
============================================ */

.ai-message-content,
.assistant-message .ai-message-content,
.message-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important;
  font-size: 12.5px !important;
  line-height: 1.55 !important;
  color: #c8c8c8 !important;
  letter-spacing: 0.01em !important;
}

/* ============================================
   HEADERS - Compact IDE style
============================================ */

.ai-message-content h1,
.ai-message-content h2,
.ai-message-content h3,
.ai-message-content h4,
.ai-message-content h5,
.ai-message-content h6 {
  margin: 10px 0 6px 0 !important;
  padding: 0 !important;
  font-weight: 600 !important;
  color: #e0e0e0 !important;
  border: none !important;
  font-size: 12.5px !important;
  line-height: 1.4 !important;
}

.ai-message-content h1 {
  font-size: 13px !important;
  color: #4fc3f7 !important;
}

.ai-message-content h2 {
  font-size: 12.5px !important;
  color: #81c784 !important;
}

.ai-message-content h3,
.ai-message-content h4,
.ai-message-content h5,
.ai-message-content h6 {
  font-size: 12.5px !important;
  color: #e0e0e0 !important;
}

/* ============================================
   SECTION HEADERS
============================================ */

.ai-message-content .section-header {
  display: block !important;
  margin-top: 12px !important;
  margin-bottom: 4px !important;
}

/* ============================================
   PARAGRAPHS - Compact spacing
============================================ */

.ai-message-content p {
  margin: 4px 0 !important;
  padding: 0 !important;
  line-height: 1.55 !important;
}

.ai-message-content p:first-child {
  margin-top: 0 !important;
}

.ai-message-content p:last-child {
  margin-bottom: 0 !important;
}

/* ============================================
   LISTS - Compact & Information-Dense
============================================ */

.ai-message-content ul,
.ai-message-content ol {
  margin: 4px 0 !important;
  padding-left: 16px !important;
}

.ai-message-content li {
  margin: 2px 0 !important;
  padding: 0 !important;
  line-height: 1.5 !important;
  font-size: 12.5px !important;
}

.ai-message-content li::marker {
  color: #6b7280 !important;
}

/* Nested lists */
.ai-message-content ul ul,
.ai-message-content ol ol,
.ai-message-content ul ol,
.ai-message-content ol ul {
  margin: 2px 0 !important;
  padding-left: 12px !important;
}

/* ============================================
   INLINE CODE - IDE style
============================================ */

.ai-message-content code:not(pre code) {
  background: rgba(79, 195, 247, 0.12) !important;
  color: #4fc3f7 !important;
  padding: 1px 5px !important;
  border-radius: 3px !important;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  border: 1px solid rgba(79, 195, 247, 0.15) !important;
}

/* File paths */
.ai-message-content code.file-path {
  background: rgba(232, 184, 77, 0.12) !important;
  color: #e8b84d !important;
  border-color: rgba(232, 184, 77, 0.15) !important;
}

/* Folder paths */
.ai-message-content code.folder-path {
  background: rgba(129, 199, 132, 0.12) !important;
  color: #81c784 !important;
  border-color: rgba(129, 199, 132, 0.15) !important;
}

/* ============================================
   STRONG & EMPHASIS
============================================ */

.ai-message-content strong,
.ai-message-content b {
  font-weight: 600 !important;
  color: #e8e8e8 !important;
}

.ai-message-content em,
.ai-message-content i {
  font-style: italic !important;
  color: #b8b8b8 !important;
}

/* ============================================
   LINKS
============================================ */

.ai-message-content a {
  color: #4fc3f7 !important;
  text-decoration: none !important;
  border-bottom: 1px dotted rgba(79, 195, 247, 0.3) !important;
}

.ai-message-content a:hover {
  color: #81d4fa !important;
  border-bottom-style: solid !important;
}

/* ============================================
   BLOCKQUOTES - Hint/tip style
============================================ */

.ai-message-content blockquote {
  margin: 6px 0 !important;
  padding: 6px 10px !important;
  border-left: 2px solid #4fc3f7 !important;
  background: rgba(79, 195, 247, 0.05) !important;
  color: #b0b0b0 !important;
  font-size: 12px !important;
  border-radius: 0 4px 4px 0 !important;
}

/* ============================================
   HORIZONTAL RULES - Subtle dividers
============================================ */

.ai-message-content hr {
  margin: 8px 0 !important;
  border: none !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* ============================================
   TABLES - Compact IDE style
============================================ */

.ai-message-content table {
  width: 100% !important;
  margin: 6px 0 !important;
  border-collapse: collapse !important;
  font-size: 11.5px !important;
}

.ai-message-content th,
.ai-message-content td {
  padding: 3px 6px !important;
  border: 1px solid #3c3c3c !important;
  text-align: left !important;
}

.ai-message-content th {
  background: #2d2d30 !important;
  color: #4fc3f7 !important;
  font-weight: 600 !important;
  font-size: 10px !important;
  text-transform: uppercase !important;
}

/* ============================================
   MESSAGE FOOTER
============================================ */

.ai-message-footer,
.message-meta,
.message-meta-inline {
  font-size: 10px !important;
  color: #6b7280 !important;
  margin-top: 6px !important;
}

/* ============================================
   COLLAPSIBLE MESSAGE
============================================ */

.ai-message.ai-message-collapsed .ai-message-content {
  max-height: 80px !important;
  overflow: hidden !important;
}

/* ============================================
   REMOVE WEB-CHAT EXCESS
============================================ */

/* Tighter message bubbles */
.ai-message.assistant-message {
  padding: 8px 10px !important;
  margin: 4px 0 !important;
}

/* Remove excessive gaps */
.ai-message-content > br + br {
  display: none !important;
}

/* ============================================
   SPECIAL PATTERNS
============================================ */

/* Bullet points with bold terms */
.ai-message-content li > strong:first-child {
  color: #4fc3f7 !important;
}

/* File extension badges */
.ai-message-content .file-ext-badge {
  display: inline-block !important;
  background: rgba(79, 195, 247, 0.12) !important;
  color: #4fc3f7 !important;
  padding: 0 4px !important;
  border-radius: 2px !important;
  font-size: 10px !important;
  font-family: 'JetBrains Mono', monospace !important;
}
`;
  
  document.head.appendChild(style);
  console.log('✅ [IDEMessageStyles] IDE-style message formatting injected');
}

/**
 * Process message content to be more IDE-friendly
 * - Replace large emoji headers with compact versions
 * - Convert numbered lists to be more compact
 * - Improve file name formatting
 */
export function processMessageForIDE(content: string): string {
  let processed = content;
  
  // Convert emoji headers to smaller format
  // "📁 Project Files:" → "**📁 Project Files:**"
  processed = processed.replace(/^(#+)\s*([📁📂📄🗂️🗃️🔧⚙️📋✅❌⚠️💡🎯📝🔍📦])\s*(.+)$/gm, 
    (match, hashes, emoji, title) => {
      // Reduce header level for IDE (h1 → h3, h2 → h4, etc.)
      const newHashes = hashes.length <= 2 ? '###' : '####';
      return `${newHashes} ${emoji} ${title}`;
    }
  );
  
  // Convert "1. **filename.ext** - description" to more compact format
  processed = processed.replace(/^(\d+)\.\s*\*\*([^*]+)\*\*\s*[-–]\s*(.+)$/gm, 
    (match, num, file, desc) => {
      return `${num}. \`${file.trim()}\` — ${desc.trim()}`;
    }
  );
  
  // Convert ".ext files: N" to compact format
  processed = processed.replace(/^(\.[a-zA-Z]+)\s*files?:\s*(\d+)/gm, 
    (match, ext, count) => {
      return `**${ext}**: ${count}`;
    }
  );
  
  return processed;
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectIDEMessageStyles);
  } else {
    injectIDEMessageStyles();
  }
}

// ============================================================================
// ADDITIONAL STYLES FOR TRANSFORMED CONTENT
// ============================================================================

export function injectTransformedContentStyles(): void {
  if (document.getElementById('ide-transformed-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ide-transformed-styles';
  style.textContent = `
/* ============================================
   FILE EXTENSION BADGES
============================================ */

.ai-message-content .file-ext-badge {
  display: inline-block;
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(79, 195, 247, 0.05));
  color: #4fc3f7 !important;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'JetBrains Mono', Consolas, monospace;
  border: 1px solid rgba(79, 195, 247, 0.2);
  margin-right: 4px;
}

/* ============================================
   FILE PATH STYLING
============================================ */

.ai-message-content code.file-path {
  background: rgba(232, 184, 77, 0.12) !important;
  color: #e8b84d !important;
  border-color: rgba(232, 184, 77, 0.2) !important;
}

.ai-message-content code.folder-path {
  background: rgba(129, 199, 132, 0.12) !important;
  color: #81c784 !important;
  border-color: rgba(129, 199, 132, 0.2) !important;
}

/* ============================================
   COMPACT BULLET LISTS
============================================ */

.ai-message-content li > strong:first-child {
  color: #4fc3f7;
  margin-right: 4px;
}

/* Type indicators */
.ai-message-content p > strong:first-child {
  color: #81c784;
}

/* ============================================
   IDE DIVIDERS
============================================ */

.ai-message-content hr {
  margin: 10px 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ============================================
   IDE SECTION HEADERS
============================================ */

.ai-message-content .ide-section-header {
  display: block;
  margin: 12px 0 6px 0;
  padding: 4px 0;
  color: #81c784 !important;
  font-size: 12.5px;
  font-weight: 600;
}

/* ============================================
   IDE CALLOUT BOXES
============================================ */

.ai-message-content blockquote.ide-callout {
  background: rgba(79, 195, 247, 0.08);
  border-left: 3px solid #4fc3f7;
  border-radius: 0 6px 6px 0;
  padding: 8px 12px;
  margin: 12px 0;
  font-size: 12px;
}

.ai-message-content blockquote.ide-callout p {
  margin: 0;
}
`;
  
  document.head.appendChild(style);
  console.log('✅ [IDEMessageStyles] Transformed content styles injected');
}

// ============================================================================
// COMPLETE INITIALIZATION
// ============================================================================

export function initializeIDEMessageStyles(): void {
  injectIDEMessageStyles();
  injectTransformedContentStyles();
  console.log('✅ [IDEMessageStyles] All IDE message styles initialized');
}

// Export for use in other modules
export default {
  injectIDEMessageStyles,
  injectTransformedContentStyles,
  initializeIDEMessageStyles,
  processMessageForIDE
};
