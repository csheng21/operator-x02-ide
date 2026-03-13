// ideMarkdownTransformer.ts
// ============================================================================
// IDE-STYLE MARKDOWN TRANSFORMER v7.0 - PASSTHROUGH
// Does NOTHING to content to prevent any corruption
// Only post-processes HTML for styling
// ============================================================================

console.log('🔄 [IDEMarkdownTransformer] Loading v7.0 (passthrough mode)...');

/**
 * Transform markdown content - PASSTHROUGH
 * Returns content unchanged to prevent any corruption
 */
export function transformForIDE(content: string): string {
  // DO NOTHING - return content unchanged
  return content;
}

/**
 * Post-process HTML after markdown rendering
 * Add CSS classes for styling (safe - only adds classes)
 */
export function postProcessHTML(html: string): string {
  let processed = html;
  
  // File extension badges: **.ext** → styled
  processed = processed.replace(
    /<strong>(\.[a-zA-Z0-9]+)<\/strong>/g,
    '<strong class="file-ext-badge">$1</strong>'
  );
  
  // File paths in code tags
  processed = processed.replace(
    /<code>([^<]+\.[a-zA-Z0-9]+)<\/code>/g,
    '<code class="file-path">$1</code>'
  );
  
  // Folder paths in code tags
  processed = processed.replace(
    /<code>([^<]+\/)<\/code>/g,
    '<code class="folder-path">$1</code>'
  );

  return processed;
}

/**
 * Complete IDE transformation pipeline
 */
export function transformContentForIDE(content: string): string {
  return transformForIDE(content);
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).ideMarkdownTransformer = {
    transformForIDE,
    postProcessHTML,
    transformContentForIDE
  };
}

export default {
  transformForIDE,
  postProcessHTML,
  transformContentForIDE
};
