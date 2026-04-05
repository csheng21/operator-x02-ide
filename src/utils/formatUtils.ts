// ============================================================
// formatUtils.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// escapeHtml / formatAIResponse
// ============================================================

// Helper function to escape HTML
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to format AI response
export function formatAIResponse(text: string): string {
  // Process code blocks first - handle multiple patterns
  let result = text;
  
  // Pattern 1: ```lang\n code \n``` (standard)
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const language = lang || 'plaintext';
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-${language}">${escapedCode}</code></pre>`;
  });
  
  // Pattern 2: ```lang code``` (no newline after lang) - common AI output
  result = result.replace(/```(\w+)([^`]+)```/g, (_, lang: string, code: string) => {
    const language = lang || 'plaintext';
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-${language}">${escapedCode}</code></pre>`;
  });
  
  // Pattern 3: ``` code ``` (no language)
  result = result.replace(/```\n?([\s\S]*?)```/g, (_, code: string) => {
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-plaintext">${escapedCode}</code></pre>`;
  });
  
  // Process inline code (but not already processed pre blocks)
  result = result.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  // Process bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Process italic (single asterisk, but not if part of bold)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Process headers
  result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Process unordered lists
  result = result.replace(/^- (.+)$/gm, '<li class="ul-item">$1</li>');
  result = result.replace(/(<li class="ul-item">[\s\S]*?<\/li>)(\s*<li class="ul-item">)/g, '$1$2');
  result = result.replace(/(<li class="ul-item">.*<\/li>)/s, '<ul>$1</ul>');
  
  // Process numbered lists  
  result = result.replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>');
  
  // Convert line breaks (but not inside pre blocks)
  const parts = result.split(/(<pre[^>]*>[\s\S]*?<\/pre>)/g);
  result = parts.map((part) => {
    if (part.startsWith('<pre')) return part;
    // Convert double newlines to paragraph breaks
    return part
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }).join('');
  
  // Clean up empty paragraphs
  result = result.replace(/<p>\s*<\/p>/g, '');
  result = result.replace(/<br>\s*<br>/g, '<br>');
  
  // Wrap loose text in paragraph if needed
  if (!result.match(/^<(h[1-6]|pre|ul|ol|p|div)/)) {
    result = '<p>' + result + '</p>';
  }
  
  return result;
}

