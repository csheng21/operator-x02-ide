// ============================================================================
// FILE: src/ide/aiAssistant/htmlViewerGenerator.ts
// PURPOSE: Generate and display professional HTML reports for code analysis
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================

import { ISO26262Detector } from './iso26262Detector';  // ← NEW IMPORT

// ============================================================================
// HTML VIEWER GENERATOR CLASS
// ============================================================================

export class HTMLViewerGenerator {
  /**
   * Open analysis in a modal HTML viewer (replaces popup window)
   */
  public static openInNewWindow(markdownContent: string, title: string = 'Professional Code Analysis'): void {
    console.log('🚀 openInNewWindow called');
    console.log('📝 Markdown content length:', markdownContent?.length || 0);
    console.log('📌 Title:', title);
    
    const htmlContent = this.generateFullHTMLDocument(markdownContent, title);
    console.log('✅ HTML document generated, length:', htmlContent.length);
    
    // Use modal viewer instead of new window to avoid popup blockers
    this.showInModal(htmlContent, title);
  }

  /**
   * Show HTML content in a modal viewer
   */
  public static showInModal(htmlContent: string, title: string): void {
    console.log('🔍 Opening HTML in modal viewer...');
    
    // Remove existing modal if any
    const existingModal = document.getElementById('html-viewer-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create a Blob URL for the HTML content (more reliable than srcdoc)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'html-viewer-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    `;

    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      width: 100%;
      max-width: 1400px;
      height: 90vh;
      background: #1a1a1a;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
      border: 1px solid rgba(99, 102, 241, 0.3);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
      border-bottom: 1px solid rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    `;

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Add icon
    const icon = document.createElement('span');
    icon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    `;
    icon.style.cssText = 'color: #6366f1; display: flex; align-items: center;';
    titleElement.prepend(icon);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download
    `;
    downloadBtn.style.cssText = `
      padding: 8px 16px;
      background: rgba(99, 102, 241, 0.2);
      color: #6366f1;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    `;
    downloadBtn.onmouseover = () => {
      downloadBtn.style.background = 'rgba(99, 102, 241, 0.3)';
      downloadBtn.style.borderColor = 'rgba(99, 102, 241, 0.5)';
    };
    downloadBtn.onmouseout = () => {
      downloadBtn.style.background = 'rgba(99, 102, 241, 0.2)';
      downloadBtn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    };
    downloadBtn.onclick = () => {
      console.log('📥 Download button clicked');
      this.downloadAsHTML(htmlContent, title);
    };

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.style.cssText = `
      padding: 8px;
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.2)';
      closeBtn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      closeBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    };
    closeBtn.onclick = () => {
      console.log('❌ Close button clicked');
      URL.revokeObjectURL(blobUrl); // Clean up Blob URL
      modal.remove();
    };

    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(closeBtn);
    header.appendChild(titleElement);
    header.appendChild(buttonContainer);

    // Create iframe to display HTML
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
      flex: 1;
    `;
    
    // Set iframe source to Blob URL
    iframe.src = blobUrl;
    
    console.log('📄 Iframe created with Blob URL');

    // Assemble modal
    modalContent.appendChild(header);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);

    // Add animations CSS if not already present
    if (!document.getElementById('html-viewer-animations')) {
      const style = document.createElement('style');
      style.id = 'html-viewer-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('⌨️ ESC key pressed - closing modal');
        URL.revokeObjectURL(blobUrl); // Clean up Blob URL
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('🖱️ Background clicked - closing modal');
        URL.revokeObjectURL(blobUrl); // Clean up Blob URL
        modal.remove();
      }
    });

    // Add to document
    document.body.appendChild(modal);
    
    console.log('✅ HTML viewer modal added to DOM');
    console.log('📊 Modal z-index:', modal.style.zIndex);
    console.log('📐 Modal dimensions:', modalContent.style.maxWidth, 'x', modalContent.style.height);
  }

  /**
   * Generate a complete standalone HTML document
   */
  private static generateFullHTMLDocument(markdownContent: string, title: string): string {
    const htmlBody = this.markdownToHtml(markdownContent);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
    const timestamp = now.toISOString();
    
    // ========================================================================
    // NEW: Detect ISO 26262 / ASIL context
    // ========================================================================
// ========================================================================
// ISO 26262 detection disabled - remove safety notice
// ========================================================================
const asilBadgeHTML = '';
const asilHeaderNote = '';
    // ========================================================================
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="AI Code Assistant">
  <meta name="description" content="Professional code analysis with industry standards reference">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
                   'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.7;
      color: #e0e0e0;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    
    .header {
      text-align: center;
      padding: 40px 40px 30px 40px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05));
      border-bottom: 2px solid rgba(99, 102, 241, 0.3);
      position: relative;
    }
    
    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    
    .header-icon svg {
      width: 64px;
      height: 64px;
      color: #6366f1;
      filter: drop-shadow(0 4px 12px rgba(99, 102, 241, 0.4));
    }
    
    .header h1 {
      color: #6366f1;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
      text-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    
    .header .badge {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 4px;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }
    
    /* ========================================================================
       NEW: Safety Badge Styles for ISO 26262
       ======================================================================== */
    
    .badge.safety-badge {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border: 2px solid rgba(252, 165, 165, 0.5);
      animation: pulseSafety 2s ease-in-out infinite;
      box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
    }
    
    @keyframes pulseSafety {
      0%, 100% { 
        opacity: 1;
        box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
      }
      50% { 
        opacity: 0.85;
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.8);
      }
    }
    
    .safety-notice {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-left: 4px solid #ef4444;
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 20px;
      text-align: left;
    }
    
    .safety-notice svg {
      width: 28px;
      height: 28px;
      color: #ef4444;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .safety-notice strong {
      display: block;
      color: #fca5a5;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .safety-notice p {
      color: #e5e7eb;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
    }
    
    /* ======================================================================== */
    
    .header-timestamp {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(99, 102, 241, 0.2);
      font-size: 13px;
      color: #9ca3af;
    }
    
    .timestamp-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .timestamp-item svg {
      width: 14px;
      height: 14px;
      color: #6366f1;
    }
    
    .save-button {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    
    .save-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    
    .save-button:active {
      transform: translateY(0);
    }
    
    .save-button svg {
      width: 16px;
      height: 16px;
    }
    
    .content {
      padding: 40px;
    }
    
    h1 {
      color: #6366f1;
      font-size: 28px;
      font-weight: 700;
      margin: 32px 0 16px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(99, 102, 241, 0.3);
    }
    
    h2 {
      color: #8b5cf6;
      font-size: 24px;
      font-weight: 600;
      margin: 28px 0 14px 0;
    }
    
    h3 {
      color: #a78bfa;
      font-size: 20px;
      font-weight: 600;
      margin: 24px 0 12px 0;
    }
    
    h4 {
      color: #c4b5fd;
      font-size: 18px;
      font-weight: 600;
      margin: 20px 0 10px 0;
    }
    
    p {
      margin: 12px 0;
      line-height: 1.8;
      color: #e0e0e0;
    }
    
    pre {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-left: 4px solid #6366f1;
      border-radius: 8px;
      padding: 20px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    
    code {
      background: rgba(99, 102, 241, 0.2);
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      color: #c4b5fd;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #e0e0e0;
    }
    
    ul, ol {
      margin: 12px 0;
      padding-left: 32px;
    }
    
    li {
      margin: 8px 0;
      line-height: 1.7;
    }
    
    ul li::marker {
      color: #6366f1;
    }
    
    ol li::marker {
      color: #6366f1;
      font-weight: 600;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    
    th, td {
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-align: left;
    }
    
    th {
      background: rgba(99, 102, 241, 0.2);
      color: #a78bfa;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }
    
    tr:hover {
      background: rgba(99, 102, 241, 0.05);
    }
    
    strong {
      color: #c4b5fd;
      font-weight: 600;
    }
    
    em {
      color: #d4d4d8;
      font-style: italic;
    }
    
    blockquote {
      border-left: 4px solid #6366f1;
      padding-left: 20px;
      margin: 20px 0;
      color: #9ca3af;
      font-style: italic;
      background: rgba(99, 102, 241, 0.05);
      padding: 16px 20px;
      border-radius: 4px;
    }
    
    hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin: 32px 0;
    }
    
    .footer {
      margin-top: 60px;
      padding: 30px 40px;
      border-top: 2px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    
    .footer p {
      margin: 8px 0;
    }
    
    .footer .references {
      margin-top: 20px;
      padding: 20px;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    
    .footer .references h4 {
      color: #8b5cf6;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .footer .references ul {
      list-style: none;
      padding: 0;
      font-size: 12px;
    }
    
    .footer .references li {
      margin: 6px 0;
      color: #9ca3af;
    }
    
    .footer .references li::before {
      content: "📚 ";
      margin-right: 8px;
    }
    
    @media print {
      body {
        background: white;
        color: black;
        padding: 0;
      }
      
      .container {
        border: none;
        box-shadow: none;
      }
      
      .save-button {
        display: none;
      }
      
      h1, h2, h3, h4 {
        color: #1f2937;
        page-break-after: avoid;
      }
      
      p, li {
        color: #374151;
      }
      
      pre {
        background: #f3f4f6;
        border-color: #d1d5db;
        page-break-inside: avoid;
      }
      
      code {
        background: #e5e7eb;
        color: #1f2937;
      }
      
      table {
        page-break-inside: avoid;
      }
      
      .safety-notice {
        border-color: #991b1b;
        background: #fef2f2;
      }
    }
    
    @media (max-width: 768px) {
      body {
        padding: 20px 10px;
      }
      
      .container {
        padding: 0;
      }
      
      .header {
        padding: 30px 20px 20px 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .save-button {
        position: static;
        width: 100%;
        margin-bottom: 16px;
        justify-content: center;
      }
      
      .header-timestamp {
        flex-direction: column;
        gap: 8px;
      }
      
      .content {
        padding: 20px;
      }
      
      h1 {
        font-size: 22px;
      }
      
      h2 {
        font-size: 20px;
      }
      
      h3 {
        font-size: 18px;
      }
      
      .footer {
        padding: 20px;
      }
      
      .safety-notice {
        flex-direction: column;
        gap: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <button class="save-button" onclick="saveDocument()" title="Save this analysis as HTML file">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Save HTML</span>
      </button>
      
      <div class="header-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      
      <h1>${title}</h1>
      <span class="badge">Standards Reference • AI Generated</span>
      ${asilBadgeHTML}
      
     <!-- ${asilHeaderNote} -->
      
      <div class="header-timestamp">
        <div class="timestamp-item">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>${dateStr}</span>
        </div>
        <div class="timestamp-item">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>${timeStr}</span>
        </div>
      </div>
    </div>
    
    <div class="content">
      ${htmlBody}
    </div>
    
    <div class="footer">
      <p><strong>Document Generated:</strong> ${dateStr} at ${timeStr}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p style="margin-top: 8px;">This analysis references Clean Code, SOLID Principles, and Industry Best Practices</p>
      
      <div class="references">
        <h4>📚 Standards Referenced</h4>
        <ul>
          <li>Clean Code: A Handbook of Agile Software Craftsmanship (Robert C. Martin)</li>
          <li>SOLID Principles (Robert C. Martin)</li>
          <li>Effective TypeScript (Dan Vanderkam)</li>
          <li>JavaScript: The Good Parts (Douglas Crockford)</li>
          <li>Design Patterns: Elements of Reusable Object-Oriented Software (Gang of Four)</li>
         ${''}
        </ul>
      </div>
    </div>
  </div>
  
  <script>
    function saveDocument() {
      const timestamp = new Date().getTime();
      const fileName = '${title.toLowerCase().replace(/\s+/g, '-')}-' + timestamp + '.html';
      
      const htmlContent = document.documentElement.outerHTML;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const btn = document.querySelector('.save-button');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = \`
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Saved!</span>
      \`;
      btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 2000);
      
      console.log('✅ Document saved as:', fileName);
    }
    
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    });
    
    console.log('📊 Professional Code Analysis loaded');
    console.log('💡 Press Ctrl+S (or Cmd+S) to save this document');
  </script>
</body>
</html>`;
  }

  /**
   * Convert Markdown to HTML
   */
  private static markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // Wrap list items
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Tables
    html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, (match, header, rows) => {
      const headerCells = header.split('|').filter((cell: string) => cell.trim());
      const headerRow = '<tr>' + headerCells.map((cell: string) => `<th>${cell.trim()}</th>`).join('') + '</tr>';
      
      const bodyRows = rows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((cell: string) => cell.trim());
        return '<tr>' + cells.map((cell: string) => `<td>${cell.trim()}</td>`).join('') + '</tr>';
      }).join('');
      
      return `<table>${headerRow}${bodyRows}</table>`;
    });

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table>)/g, '$1');
    html = html.replace(/(<\/table>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

    return html;
  }

  /**
   * Download HTML as file
   */
  private static downloadAsHTML(htmlContent: string, title: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
    
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ HTML file downloaded: ${fileName}`);
  }
}

if (typeof window !== 'undefined') {
  (window as any).HTMLViewerGenerator = HTMLViewerGenerator;
}