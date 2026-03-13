// utils/commandFormatting.ts - Command output formatting

import { escapeHtml } from './messageFormatting';

// Enhanced format command output with syntax highlighting
export function formatCommandOutput(output: string): string {
  const escapedOutput = output
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Apply basic syntax highlighting
  return escapedOutput
    // Highlight IP addresses
    .replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g, '<span class="cmd-ip">$1</span>')
    // Highlight dates
    .replace(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g, '<span class="cmd-date">$1</span>')
    // Highlight errors
    .replace(/\b(Error:.*)/g, '<span class="cmd-error">$1</span>')
    // Highlight headers in output
    .replace(/^([A-Z][A-Z\s]+:)/gm, '<span class="cmd-header">$1</span>')
    // Replace newlines with <br>
    .replace(/\n/g, '<br>');
}

// Helper function to set up copy buttons
export function setupCopyButtonsHandler(): void {
  setTimeout(() => {
    const copyButtons = document.querySelectorAll('.cmd-copy');
    copyButtons.forEach(btn => {
      if (btn instanceof HTMLElement) {
        btn.addEventListener('click', () => {
          const content = btn.getAttribute('data-content') || '';
          navigator.clipboard.writeText(content)
            .then(() => {
              btn.textContent = '✓';
              setTimeout(() => { btn.textContent = '📋'; }, 2000);
            })
            .catch(err => console.error('Failed to copy: ', err));
        });
      }
    });
  }, 100);
}