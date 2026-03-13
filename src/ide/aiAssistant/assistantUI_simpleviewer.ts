// assistantUI_simpleviewer.ts - Professional Minimal Response Viewer

import { showNotification } from './notificationManager';
import { getCurrentApiConfigurationForced } from './apiProviderManager';
import { getProviderDisplayName } from '../../state';

/**
 * Generate professional minimal HTML response
 */
export function generateSimpleResponseHTML(
  content: string, 
  aiProvider: string, 
  timestamp: string
): string {
  // Process markdown to HTML
  let htmlContent = processMarkdownToHTML(content);
  
  const formattedTime = new Date(timestamp).toLocaleString('en-US', { 
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get provider icon
  const providerIcon = getProviderIcon(aiProvider.toLowerCase());
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Response</title>
    <style>
      /* ============================================================ */
      /* Professional Minimal Theme */
      /* ============================================================ */
      :root {
        --bg-primary: #0d1117;
        --bg-secondary: #161b22;
        --bg-tertiary: #21262d;
        --border-color: #30363d;
        --text-primary: #e6edf3;
        --text-secondary: #8b949e;
        --text-muted: #6e7681;
        --accent: #58a6ff;
        --accent-subtle: rgba(88, 166, 255, 0.1);
        --success: #3fb950;
        --code-bg: #0d1117;
      }
      
      [data-theme="light"] {
        --bg-primary: #ffffff;
        --bg-secondary: #f6f8fa;
        --bg-tertiary: #eaeef2;
        --border-color: #d0d7de;
        --text-primary: #1f2328;
        --text-secondary: #656d76;
        --text-muted: #8c959f;
        --accent: #0969da;
        --accent-subtle: rgba(9, 105, 218, 0.08);
        --code-bg: #f6f8fa;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
        font-size: 14px;
        padding: 24px;
        min-height: 100vh;
      }
      
      /* Main Container */
      .response-container {
        max-width: 720px;
        margin: 0 auto;
      }
      
      /* Header Bar */
      .header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--border-color);
      }
      
      .provider-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .provider-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--accent-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      .provider-details {
        display: flex;
        flex-direction: column;
      }
      
      .provider-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-primary);
      }
      
      .response-time {
        font-size: 12px;
        color: var(--text-muted);
      }
      
      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .action-btn {
        background: transparent;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 6px 10px;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      
      .action-btn:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border-color: var(--text-muted);
      }
      
      .action-btn svg {
        width: 14px;
        height: 14px;
      }
      
      /* Content Area */
      .content-area {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 24px;
      }
      
      .content-area p {
        margin-bottom: 12px;
        color: var(--text-primary);
      }
      
      .content-area p:last-child {
        margin-bottom: 0;
      }
      
      .content-area strong {
        font-weight: 600;
        color: var(--accent);
      }
      
      .content-area em {
        font-style: italic;
        color: var(--text-secondary);
      }
      
      .content-area a {
        color: var(--accent);
        text-decoration: none;
      }
      
      .content-area a:hover {
        text-decoration: underline;
      }
      
      /* Inline Code */
      .inline-code {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        color: var(--accent);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', 'Consolas', 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
      }
      
      /* Code Blocks */
      .code-block {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin: 16px 0;
        overflow: hidden;
      }
      
      .code-header {
        background: var(--bg-tertiary);
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .code-lang {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 500;
      }
      
      .copy-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s;
      }
      
      .copy-btn:hover {
        background: var(--accent-subtle);
        color: var(--accent);
      }
      
      .code-content {
        padding: 16px;
        overflow-x: auto;
      }
      
      .code-content pre {
        margin: 0;
        font-family: 'SF Mono', 'Consolas', 'Liberation Mono', Menlo, monospace;
        font-size: 13px;
        line-height: 1.5;
        color: var(--text-primary);
      }
      
      /* Lists */
      .content-area ul, .content-area ol {
        margin: 12px 0;
        padding-left: 24px;
      }
      
      .content-area li {
        margin: 6px 0;
        color: var(--text-primary);
      }
      
      /* Blockquotes */
      .content-area blockquote {
        border-left: 3px solid var(--accent);
        padding-left: 16px;
        margin: 16px 0;
        color: var(--text-secondary);
        font-style: italic;
      }
      
      /* Headings */
      .content-area h1, .content-area h2, .content-area h3 {
        margin: 20px 0 12px 0;
        color: var(--text-primary);
        font-weight: 600;
      }
      
      .content-area h1 { font-size: 1.5em; }
      .content-area h2 { font-size: 1.3em; }
      .content-area h3 { font-size: 1.1em; }
      
      /* Footer */
      .footer-bar {
        margin-top: 16px;
        padding-top: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      
      .footer-item {
        font-size: 11px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .footer-item svg {
        width: 12px;
        height: 12px;
        opacity: 0.7;
      }
      
      /* Print Styles */
      @media print {
        body { 
          background: white; 
          color: black;
          padding: 0;
        }
        .header-actions { display: none; }
        .content-area { 
          border: 1px solid #ddd; 
          box-shadow: none;
        }
      }
      
      /* Responsive */
      @media (max-width: 640px) {
        body { padding: 16px; }
        .content-area { padding: 16px; }
        .header-bar { flex-wrap: wrap; gap: 12px; }
      }
    </style>
    <script>
      function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') !== 'light';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        
        const btn = document.querySelector('.theme-btn');
        btn.innerHTML = isDark 
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      }
      
      function copyContent() {
        const content = document.querySelector('.content-area').innerText;
        navigator.clipboard.writeText(content).then(() => {
          const btn = document.querySelector('.copy-content-btn');
          btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
          setTimeout(() => {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          }, 2000);
        });
      }
      
      function copyCode(btn) {
        const codeBlock = btn.closest('.code-block');
        const code = codeBlock.querySelector('pre').innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
          setTimeout(() => {
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          }, 2000);
        });
      }
    </script>
</head>
<body>
    <div class="response-container">
      <!-- Header -->
      <div class="header-bar">
        <div class="provider-info">
          <div class="provider-icon">${providerIcon}</div>
          <div class="provider-details">
            <span class="provider-name">${aiProvider}</span>
            <span class="response-time">${formattedTime}</span>
          </div>
        </div>
        
        <div class="header-actions">
          <button class="action-btn copy-content-btn" onclick="copyContent()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <button class="action-btn theme-btn" onclick="toggleTheme()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="content-area">
        ${htmlContent}
      </div>
      
      <!-- Footer -->
      <div class="footer-bar">
        <span class="footer-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${formattedTime}
        </span>
        <span class="footer-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          AI Response
        </span>
      </div>
    </div>
</body>
</html>`;
}

/**
 * Process markdown content to HTML
 */
function processMarkdownToHTML(content: string): string {
  let html = content;
  
  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (```lang ... ```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    return `<div class="code-block">
      <div class="code-header">
        <span class="code-lang">${language}</span>
        <button class="copy-btn" onclick="copyCode(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
      <div class="code-content"><pre>${code.trim()}</pre></div>
    </div>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('1.')) {
      return `<ol>${match}</ol>`;
    }
    return `<ul>${match}</ul>`;
  });
  
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Paragraphs - wrap lines that aren't already wrapped
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line; // Already HTML
    return `<p>${trimmed}</p>`;
  });
  
  html = processedLines.join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  return html;
}

/**
 * Get provider icon emoji
 */
function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    'groq': '⚡',
    'openai': '🟢',
    'claude': '🟣',
    'anthropic': '🟣',
    'deepseek': '🔵',
    'gemini': '💎',
    'cohere': '🔶',
    'ollama': '🦙',
    'operator_x02': '🤖',
    'default': '✨'
  };
  
  for (const [key, icon] of Object.entries(icons)) {
    if (provider.includes(key)) {
      return icon;
    }
  }
  
  return icons.default;
}

/**
 * Display the response viewer modal
 */
export function displaySimpleResponseViewer(content: string, fileName: string): void {
  // Remove existing viewer
  const existingViewer = document.getElementById('simple-response-viewer');
  if (existingViewer) {
    existingViewer.remove();
  }
  
  // Remove existing styles
  const existingStyle = document.getElementById('simple-viewer-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const config = getCurrentApiConfigurationForced();
  const aiProvider = getProviderDisplayName(config.provider);
  const timestamp = new Date().toISOString();
  
  const simpleHTML = generateSimpleResponseHTML(content, aiProvider, timestamp);
  
  // Create viewer container
  const viewer = document.createElement('div');
  viewer.id = 'simple-response-viewer';
  
  viewer.innerHTML = `
    <div class="viewer-backdrop"></div>
    <div class="viewer-modal">
      <div class="viewer-header">
        <div class="viewer-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>Response Preview</span>
        </div>
        <button class="viewer-close" title="Close (Esc)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="viewer-content">
        <iframe id="response-iframe" sandbox="allow-scripts"></iframe>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.id = 'simple-viewer-styles';
  style.textContent = `
    #simple-response-viewer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
    }
    
    #simple-response-viewer.open {
      opacity: 1;
      visibility: visible;
    }
    
    #simple-response-viewer .viewer-backdrop {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }
    
    #simple-response-viewer .viewer-modal {
      position: relative;
      width: 90%;
      max-width: 800px;
      height: 85vh;
      max-height: 700px;
      background: #0d1117;
      border-radius: 12px;
      border: 1px solid #30363d;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95) translateY(10px);
      transition: transform 0.2s ease;
    }
    
    #simple-response-viewer.open .viewer-modal {
      transform: scale(1) translateY(0);
    }
    
    #simple-response-viewer .viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      flex-shrink: 0;
    }
    
    #simple-response-viewer .viewer-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e6edf3;
      font-size: 14px;
      font-weight: 500;
    }
    
    #simple-response-viewer .viewer-title svg {
      color: #58a6ff;
    }
    
    #simple-response-viewer .viewer-close {
      background: transparent;
      border: none;
      color: #8b949e;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    
    #simple-response-viewer .viewer-close:hover {
      background: rgba(248, 81, 73, 0.1);
      color: #f85149;
    }
    
    #simple-response-viewer .viewer-content {
      flex: 1;
      overflow: hidden;
    }
    
    #simple-response-viewer #response-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #0d1117;
    }
    
    @media (max-width: 640px) {
      #simple-response-viewer .viewer-modal {
        width: 95%;
        height: 90vh;
        border-radius: 8px;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(viewer);
  
  // Set iframe content
  const iframe = viewer.querySelector('#response-iframe') as HTMLIFrameElement;
  if (iframe) {
    iframe.srcdoc = simpleHTML;
  }
  
  // Close handlers
  const closeViewer = () => {
    viewer.classList.remove('open');
    setTimeout(() => {
      viewer.remove();
      style.remove();
    }, 200);
  };
  
  const closeBtn = viewer.querySelector('.viewer-close');
  const backdrop = viewer.querySelector('.viewer-backdrop');
  
  closeBtn?.addEventListener('click', closeViewer);
  backdrop?.addEventListener('click', closeViewer);
  
  // Keyboard handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeViewer();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // Open with animation
  requestAnimationFrame(() => {
    viewer.classList.add('open');
  });
}