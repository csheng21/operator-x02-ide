// utils/messageFormatting.ts - Message formatting utilities

// Format message content for display
export function formatMessage(content: string): string {
  // If content already contains HTML (like command output), return it as is
  if (content.includes('<div class="cmd-response">')) {
    return content;
  }

  // Basic markdown to HTML conversion (you could use a more robust library)
  return content
    // Code blocks
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

// Escape HTML to prevent XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}