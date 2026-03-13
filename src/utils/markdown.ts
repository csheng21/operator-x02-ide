// Add to conversation.ts or create utils/markdown.ts

function parseMarkdown(content: string): string {
  // Protect code blocks first
  const codeBlocks: string[] = [];
  const protectedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang, code });
    return placeholder;
  });
  
  // Process other markdown...
  let html = protectedContent;
  
  // Restore code blocks with proper HTML
  codeBlocks.forEach((block, index) => {
    const codeHtml = `
      <div class="code-block-container">
        <div class="code-header">
          <span>${block.lang || 'code'}</span>
          <button class="copy-code-btn" data-code="${escapeHtml(block.code)}">
            Copy
          </button>
        </div>
        <pre><code class="language-${block.lang}">${escapeHtml(block.code)}</code></pre>
      </div>
    `;
    html = html.replace(`__CODE_BLOCK_${index}__`, codeHtml);
  });
  
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}