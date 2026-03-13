// src/ide/aiAssistant/intelligentAssistantUI.ts
// PROFESSIONAL VERSION - SVG Icons, Clean Design
// UI Integration for Intelligent Assistant

import { intelligentAssistant } from './intelligentAssistant';
import { contextManager } from './contextManager';

/**
 * Create professional context status indicator with SVG icons
 * ❌ DISABLED: This indicator is now handled by unified-status-bar in contextStatusBar.ts
 * Returns an empty hidden element to prevent duplicate UI
 */
export function createContextStatusIndicator(): HTMLElement {
  // Return empty hidden element - unified-status-bar handles this now
  const container = document.createElement('div');
  container.id = 'context-status-indicator';
  container.style.display = 'none';  // Hide completely
  return container;
}

/**
 * Original function preserved for reference (disabled)
 */
function _createContextStatusIndicator_DISABLED(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'context-status-indicator';
  container.style.cssText = `
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(37, 37, 38, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    gap: 12px;
    font-size: 13px;
    color: #cccccc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  // Icon row container
  const iconRow = document.createElement('div');
  iconRow.id = 'context-icon-row';
  iconRow.style.cssText = `
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  `;
  
  container.appendChild(iconRow);
  
  // Update icons
  updateContextIcons(iconRow);
  
  // Auto-refresh every 10 seconds
  setInterval(() => updateContextIcons(iconRow), 10000);
  
  return container;
}

/**
 * SVG Icon Library - Professional IDE-style icons
 */
const SVGIcons = {
  statusActive: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#4EC9B0" stroke="#4EC9B0" stroke-width="1" opacity="0.9"/>
    <circle cx="8" cy="8" r="4" fill="#ffffff" opacity="0.8"/>
  </svg>`,
  
  statusInactive: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#569CD6" stroke="#569CD6" stroke-width="1" opacity="0.7"/>
    <circle cx="8" cy="8" r="4" fill="#ffffff" opacity="0.5"/>
  </svg>`,
  
  project: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M14 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5L14 4.5z" fill="none" stroke="#C5C5C5" stroke-width="1.5"/>
    <path d="M9.5 1v3.5H14" fill="none" stroke="#C5C5C5" stroke-width="1.5"/>
  </svg>`,
  
  noProject: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M14 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6.5L14 4.5z" fill="none" stroke="#858585" stroke-width="1.5" opacity="0.5"/>
    <path d="M2 2L14 14" stroke="#f48771" stroke-width="1.5"/>
  </svg>`,
  
  messages: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-3 2v-2H3a1 1 0 0 1-1-1V3z" fill="none" stroke="#4FC3F7" stroke-width="1.5"/>
    <circle cx="5" cy="7" r="1" fill="#4FC3F7"/>
    <circle cx="8" cy="7" r="1" fill="#4FC3F7"/>
    <circle cx="11" cy="7" r="1" fill="#4FC3F7"/>
  </svg>`,
  
  files: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 2v12h10V5l-3-3H3z" fill="none" stroke="#C5C5C5" stroke-width="1.5"/>
    <path d="M10 2v3h3" fill="none" stroke="#C5C5C5" stroke-width="1.5"/>
    <line x1="5" y1="7" x2="11" y2="7" stroke="#569CD6" stroke-width="1.5"/>
    <line x1="5" y1="10" x2="11" y2="10" stroke="#569CD6" stroke-width="1.5"/>
  </svg>`,
  
  decisions: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="#4EC9B0" stroke-width="1.5"/>
    <path d="M5 8l2 2 4-4" fill="none" stroke="#4EC9B0" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  
  viewDetails: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="10" width="2" height="4" fill="currentColor"/>
    <rect x="7" y="6" width="2" height="8" fill="currentColor"/>
    <rect x="11" y="3" width="2" height="11" fill="currentColor"/>
    <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  
settings: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8" cy="2" r="1" fill="currentColor"/>
    <circle cx="8" cy="14" r="1" fill="currentColor"/>
    <circle cx="2" cy="8" r="1" fill="currentColor"/>
    <circle cx="14" cy="8" r="1" fill="currentColor"/>
    <circle cx="3.5" cy="3.5" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="12.5" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="3.5" r="1" fill="currentColor"/>
    <circle cx="3.5" cy="12.5" r="1" fill="currentColor"/>
  </svg>`
};

/**
 * Update context icons display - PROFESSIONAL SVG VERSION
 */
function updateContextIcons(iconRow: HTMLElement): void {
  const status = intelligentAssistant.getContextStatus();
  
  // Build tooltip text
  let tooltipText = 'Context Status\n';
  if (status.active && status.project) {
    tooltipText += `📁 ${status.project}\n`;
  } else {
    tooltipText += '❌ No project loaded\n';
  }
  tooltipText += `💬 ${status.messagesCount || 0} messages\n`;
  tooltipText += `📄 ${status.filesCount || 0} files\n`;
  tooltipText += `✓ ${status.decisionsCount || 0} decisions`;
  
  // Clear and rebuild
  iconRow.innerHTML = '';
  
  // 1. Status Indicator (pulsing dot)
  const statusIcon = createIconElement(
    status.active && status.project ? SVGIcons.statusActive : SVGIcons.statusInactive,
    tooltipText,
    'status-icon'
  );
  statusIcon.style.cssText = `
    display: inline-flex;
    align-items: center;
    cursor: help;
    ${status.active && status.project ? 'animation: pulse 2s ease-in-out infinite;' : ''}
  `;
  iconRow.appendChild(statusIcon);
  
  // 2. Project Icon
  const projectIcon = createIconElement(
    status.active && status.project ? SVGIcons.project : SVGIcons.noProject,
    status.active && status.project ? status.project : 'No project loaded',
    'project-icon'
  );
  projectIcon.style.cssText = `
    display: inline-flex;
    align-items: center;
    cursor: help;
    opacity: ${status.active && status.project ? '1' : '0.5'};
    transition: opacity 0.2s;
  `;
  iconRow.appendChild(projectIcon);
  
  // 3. Messages Counter
  const messagesGroup = document.createElement('div');
  messagesGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: help;
    transition: color 0.2s;
  `;
  messagesGroup.title = `${status.messagesCount || 0} messages`;
  messagesGroup.innerHTML = `
    ${SVGIcons.messages}
    <span style="font-size: 12px; color: #858585; font-weight: 500;">${status.messagesCount || 0}</span>
  `;
  messagesGroup.addEventListener('mouseenter', () => {
    messagesGroup.style.color = '#4FC3F7';
  });
  messagesGroup.addEventListener('mouseleave', () => {
    messagesGroup.style.color = '#cccccc';
  });
  iconRow.appendChild(messagesGroup);
  
  // 4. Files Counter
  if (status.filesCount > 0) {
    const filesGroup = document.createElement('div');
    filesGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: help;
      transition: color 0.2s;
    `;
    filesGroup.title = `${status.filesCount} files tracked`;
    filesGroup.innerHTML = `
      ${SVGIcons.files}
      <span style="font-size: 12px; color: #858585; font-weight: 500;">${status.filesCount}</span>
    `;
    filesGroup.addEventListener('mouseenter', () => {
      filesGroup.style.color = '#569CD6';
    });
    filesGroup.addEventListener('mouseleave', () => {
      filesGroup.style.color = '#cccccc';
    });
    iconRow.appendChild(filesGroup);
  }
  
  // 5. Decisions Counter
  if (status.decisionsCount > 0) {
    const decisionsGroup = document.createElement('div');
    decisionsGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: help;
      transition: color 0.2s;
    `;
    decisionsGroup.title = `${status.decisionsCount} decisions`;
    decisionsGroup.innerHTML = `
      ${SVGIcons.decisions}
      <span style="font-size: 12px; color: #858585; font-weight: 500;">${status.decisionsCount}</span>
    `;
    decisionsGroup.addEventListener('mouseenter', () => {
      decisionsGroup.style.color = '#4EC9B0';
    });
    decisionsGroup.addEventListener('mouseleave', () => {
      decisionsGroup.style.color = '#cccccc';
    });
    iconRow.appendChild(decisionsGroup);
  }
  
  // Spacer (push buttons to the right)
  const spacer = document.createElement('div');
  spacer.style.cssText = 'flex: 1;';
  iconRow.appendChild(spacer);
  
  // 6. View Details Button
  const detailsBtn = document.createElement('button');
  detailsBtn.innerHTML = SVGIcons.viewDetails;
  detailsBtn.title = 'View full context details';
  detailsBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    padding: 4px 6px;
    cursor: pointer;
    color: #858585;
    transition: all 0.2s;
  `;
  detailsBtn.addEventListener('mouseenter', () => {
    detailsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    detailsBtn.style.borderColor = '#4FC3F7';
    detailsBtn.style.color = '#4FC3F7';
  });
  detailsBtn.addEventListener('mouseleave', () => {
    detailsBtn.style.background = 'transparent';
    detailsBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    detailsBtn.style.color = '#858585';
  });
  detailsBtn.addEventListener('click', showContextDetails);
  iconRow.appendChild(detailsBtn);
  
  // 7. Settings Button (Optional)
  const settingsBtn = document.createElement('button');
  settingsBtn.innerHTML = SVGIcons.settings;
  settingsBtn.title = 'Context settings';
  settingsBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    padding: 4px 6px;
    cursor: pointer;
    color: #858585;
    transition: all 0.2s;
  `;
  settingsBtn.addEventListener('mouseenter', () => {
    settingsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    settingsBtn.style.borderColor = '#C5C5C5';
    settingsBtn.style.color = '#C5C5C5';
  });
  settingsBtn.addEventListener('mouseleave', () => {
    settingsBtn.style.background = 'transparent';
    settingsBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    settingsBtn.style.color = '#858585';
  });
  settingsBtn.addEventListener('click', () => {
    showContextSettings();
  });
  iconRow.appendChild(settingsBtn);
  
  // Add pulsing animation
  addPulseAnimation();
}

/**
 * Helper: Create icon element
 */
function createIconElement(svgContent: string, tooltip: string, className: string): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = svgContent;
  element.title = tooltip;
  return element;
}

/**
 * Add pulse animation for active status
 */
function addPulseAnimation(): void {
  if (document.getElementById('context-pulse-animation')) return;
  
  const style = document.createElement('style');
  style.id = 'context-pulse-animation';
  style.textContent = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(0.95);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show detailed context information in modal
 */
function showContextDetails(): void {
  const status = intelligentAssistant.getContextStatus();
  const project = contextManager.getProjectContext();
  const files = contextManager.getTrackedFiles();
  const decisions = contextManager.getDecisions();
  const conversation = contextManager.getRecentConversation(10);
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
    animation: fadeIn 0.2s ease;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: #252526;
    border: 1px solid #454545;
    border-radius: 8px;
    padding: 24px;
    max-width: 700px;
    max-height: 85vh;
    overflow-y: auto;
    color: #cccccc;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  // Build content
  let html = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #4FC3F7; font-size: 18px; font-weight: 600;">Context Details</h2>
      <button id="close-modal" style="
        background: transparent;
        border: none;
        color: #858585;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      " onmouseenter="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';" onmouseleave="this.style.background='transparent'; this.style.color='#858585';">×</button>
    </div>
    
    <div style="margin-bottom: 20px; padding: 12px; background: rgba(79, 195, 247, 0.08); border-radius: 6px; border: 1px solid rgba(79, 195, 247, 0.2);">
      <div style="font-size: 13px; color: #cccccc; line-height: 1.6;">
        <strong style="color: #4FC3F7;">🧠 Why Context Matters:</strong><br>
        Context helps the AI understand your project's structure, tech stack, recent decisions, and conversation history. This enables more accurate, relevant assistance tailored to your specific codebase and development patterns.
      </div>
    </div>
    
    <div style="margin-bottom: 20px; padding: 12px; background: rgba(76, 175, 80, 0.08); border-radius: 6px; border: 1px solid rgba(76, 175, 80, 0.2);">
      <div style="font-size: 13px; color: #cccccc; line-height: 1.6;">
        <strong style="color: #4EC9B0;">✨ How It Helps:</strong><br>
        • <strong>Better Code Suggestions:</strong> AI understands your coding patterns<br>
        • <strong>Faster Problem Solving:</strong> Knows your project structure<br>
        • <strong>Consistent Decisions:</strong> Remembers past architectural choices<br>
        • <strong>Personalized Help:</strong> Adapts to your tech stack and preferences
      </div>
    </div>
  `;
  
  if (project) {
    html += `
      <div style="margin-bottom: 20px; padding: 16px; background: rgba(79, 195, 247, 0.1); border-left: 3px solid #4FC3F7; border-radius: 4px;">
        <h3 style="margin: 0 0 12px 0; color: #4FC3F7; font-size: 14px; font-weight: 600;">📁 Project Context</h3>
        <div style="font-size: 13px; color: #cccccc; line-height: 1.8;">
          <div><strong>Name:</strong> ${project.projectName}</div>
          <div><strong>Type:</strong> ${project.projectType}</div>
          <div><strong>Tech Stack:</strong> ${project.techStack.join(', ')}</div>
          <div><strong>Phase:</strong> ${project.developmentPhase}</div>
          <div style="margin-top: 8px; color: #858585; font-style: italic;">${project.purpose}</div>
        </div>
      </div>
    `;
  }
  
  if (files.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: #569CD6; font-size: 14px; font-weight: 600;">📄 Tracked Files (${files.length})</h3>
        <div style="font-size: 12px; color: #858585; max-height: 200px; overflow-y: auto;">
          ${files.map(f => `
            <div style="padding: 8px; margin-bottom: 4px; background: rgba(255, 255, 255, 0.02); border-radius: 3px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #cccccc; font-family: 'Consolas', monospace;">${f.path}</span>
              <span style="color: #4EC9B0; font-size: 11px;">${f.language}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  if (decisions.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: #4EC9B0; font-size: 14px; font-weight: 600;">✓ Recent Decisions (${decisions.length})</h3>
        <div style="font-size: 12px; color: #858585; max-height: 200px; overflow-y: auto;">
          ${decisions.slice(-5).map(d => {
            const date = new Date(d.timestamp).toLocaleDateString();
            return `
              <div style="padding: 10px; margin-bottom: 6px; background: rgba(78, 201, 176, 0.05); border-left: 2px solid #4EC9B0; border-radius: 3px;">
                <div style="color: #4EC9B0; font-weight: 600; margin-bottom: 4px;">${d.topic}</div>
                <div style="color: #cccccc;">${d.decision}</div>
                ${d.reasoning ? `<div style="color: #858585; font-style: italic; margin-top: 4px; font-size: 11px;">${d.reasoning}</div>` : ''}
                <div style="color: #666; font-size: 11px; margin-top: 6px;">${date}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // Action buttons
  html += `
    <div style="display: flex; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #454545;">
      <button id="export-context" style="
        flex: 1;
        padding: 10px;
        background: #0e7490;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      " onmouseenter="this.style.background='#0891b2'" onmouseleave="this.style.background='#0e7490'">
        Export Context
      </button>
      
      <button id="clear-context" style="
        flex: 1;
        padding: 10px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      " onmouseenter="this.style.background='#ef4444'" onmouseleave="this.style.background='#dc2626'">
        Clear Context
      </button>
    </div>
  `;
  
  content.innerHTML = html;
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('export-context')?.addEventListener('click', () => {
    const json = intelligentAssistant.exportContext();
    navigator.clipboard.writeText(json);
    alert('Context exported to clipboard!');
  });
  
  document.getElementById('clear-context')?.addEventListener('click', () => {
    if (confirm('Clear all context? This cannot be undone.')) {
      intelligentAssistant.clearContext();
      modal.remove();
    }
  });
  
  document.getElementById('close-modal')?.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Add fade in animation
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(styleSheet);
}

/**
 * Show context settings modal
 */
function showContextSettings(): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
    animation: fadeIn 0.2s ease;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: #252526;
    border: 1px solid #454545;
    border-radius: 8px;
    padding: 24px;
    max-width: 600px;
    width: 90%;
    color: #cccccc;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  
  content.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #4FC3F7; font-size: 18px; font-weight: 600;">⚙️ Context Settings</h2>
      <button id="close-settings" style="
        background: transparent;
        border: none;
        color: #858585;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      " onmouseenter="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';" onmouseleave="this.style.background='transparent'; this.style.color='#858585';">×</button>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 12px 0; color: #569CD6; font-size: 14px; font-weight: 600;">Context System Status</h3>
      <div style="padding: 12px; background: rgba(79, 195, 247, 0.1); border-left: 3px solid #4FC3F7; border-radius: 4px;">
        <div style="font-size: 13px; color: #cccccc; line-height: 1.8;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Context Tracking:</span>
            <span style="color: #4EC9B0; font-weight: 600;">✓ Active</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Auto-Save:</span>
            <span style="color: #4EC9B0; font-weight: 600;">✓ Enabled</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Update Interval:</span>
            <span style="color: #858585;">10 seconds</span>
          </div>
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 12px 0; color: #569CD6; font-size: 14px; font-weight: 600;">Options</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 4px; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseleave="this.style.background='rgba(255, 255, 255, 0.02)'">
          <input type="checkbox" id="track-decisions" checked style="width: 16px; height: 16px; cursor: pointer;">
          <div>
            <div style="font-size: 13px; color: #cccccc; font-weight: 500;">Track Decisions</div>
            <div style="font-size: 11px; color: #858585;">Record important development decisions automatically</div>
          </div>
        </label>
        
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 4px; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseleave="this.style.background='rgba(255, 255, 255, 0.02)'">
          <input type="checkbox" id="track-files" checked style="width: 16px; height: 16px; cursor: pointer;">
          <div>
            <div style="font-size: 13px; color: #cccccc; font-weight: 500;">Track File Changes</div>
            <div style="font-size: 11px; color: #858585;">Monitor files opened and modified during session</div>
          </div>
        </label>
        
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255, 255, 255, 0.02); border-radius: 4px; transition: background 0.2s;" onmouseenter="this.style.background='rgba(255, 255, 255, 0.05)'" onmouseleave="this.style.background='rgba(255, 255, 255, 0.02)'">
          <input type="checkbox" id="show-notifications" checked style="width: 16px; height: 16px; cursor: pointer;">
          <div>
            <div style="font-size: 13px; color: #cccccc; font-weight: 500;">Show Notifications</div>
            <div style="font-size: 11px; color: #858585;">Display alerts for important context events</div>
          </div>
        </label>
      </div>
    </div>
    
    <div style="display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid #454545;">
      <button id="save-settings" style="
        flex: 1;
        padding: 10px;
        background: #0e7490;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      " onmouseenter="this.style.background='#0891b2'" onmouseleave="this.style.background='#0e7490'">
        Save Settings
      </button>
      
      <button id="reset-settings" style="
        padding: 10px 16px;
        background: #454545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      " onmouseenter="this.style.background='#555'" onmouseleave="this.style.background='#454545'">
        Reset
      </button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('save-settings')?.addEventListener('click', () => {
    const trackDecisions = (document.getElementById('track-decisions') as HTMLInputElement)?.checked;
    const trackFiles = (document.getElementById('track-files') as HTMLInputElement)?.checked;
    const showNotifications = (document.getElementById('show-notifications') as HTMLInputElement)?.checked;
    
    // Save settings (implement your save logic here)
    console.log('Settings saved:', { trackDecisions, trackFiles, showNotifications });
    
    // Show confirmation
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      saveBtn.style.background = '#4EC9B0';
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '#0e7490';
      }, 2000);
    }
  });
  
  document.getElementById('reset-settings')?.addEventListener('click', () => {
    (document.getElementById('track-decisions') as HTMLInputElement).checked = true;
    (document.getElementById('track-files') as HTMLInputElement).checked = true;
    (document.getElementById('show-notifications') as HTMLInputElement).checked = true;
  });
  
  document.getElementById('close-settings')?.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Update context information display (DEPRECATED - kept for compatibility)
 */
function updateContextInfo(infoElement: HTMLElement): void {
  const status = intelligentAssistant.getContextStatus();
  
  const lines: string[] = [];
  
  if (status.active && status.project) {
    lines.push(`📁 <strong>${status.project}</strong>`);
  } else {
    lines.push('❌ <em>No project loaded</em>');
  }
  
  if (status.filesCount > 0) {
    lines.push(`📄 ${status.filesCount} files tracked`);
  }
  
  if (status.messagesCount > 0) {
    lines.push(`💬 ${status.messagesCount} messages`);
  }
  
  if (status.decisionsCount > 0) {
    lines.push(`✓ ${status.decisionsCount} decisions`);
  }
  
  infoElement.innerHTML = lines.join('<br>');
}

/**
 * Add context-aware quick actions - REMOVED FOR ULTRA-MINIMAL MODE
 */
export function addContextActions(): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'display: none;'; // Hidden in ultra-minimal mode
  return container;
}


// ============================================================================
// INITIALIZATION GUARD - Prevent duplicates on hot reload
// ============================================================================

/**
 * Check if UI is already initialized (survives hot reload)
 */
function isUIInitialized(): boolean {
  return (window as any).__intelligentAssistantUIInitialized === true;
}

/**
 * Mark UI as initialized
 */
function markUIInitialized(): void {
  (window as any).__intelligentAssistantUIInitialized = true;
  console.log('✅ Intelligent Assistant UI marked as initialized');
}

/**
 * Remove ALL existing context status indicators (including duplicates)
 */
function removeAllStatusIndicators(): void {
  // Remove by ID
  const indicatorsById = document.querySelectorAll('#context-status-indicator');
  if (indicatorsById.length > 0) {
    console.log(`🗑️ Removing ${indicatorsById.length} status indicator(s) by ID`);
    indicatorsById.forEach(indicator => indicator.remove());
  }
  
  // Remove by parent check (backup - find any orphaned ones)
  const allIndicators = Array.from(document.querySelectorAll('[id*="context"]')).filter(el => 
    el.id === 'context-status-indicator'
  );
  if (allIndicators.length > 0) {
    console.log(`🗑️ Removing ${allIndicators.length} additional indicator(s)`);
    allIndicators.forEach(el => el.remove());
  }
}

/**
 * Initialize intelligent assistant UI - PROFESSIONAL VERSION
 */
export function initializeIntelligentAssistantUI(): void {
  console.log('🎨 Initializing Intelligent Assistant UI (Professional Mode)...');
  
  // CRITICAL: Check if already initialized (survives hot reload!)
  if (isUIInitialized()) {
    console.warn('⚠️ Intelligent Assistant UI already initialized, skipping...');
    return;
  }
  
  // Find AI assistant panel
  const assistantPanel = document.querySelector('.assistant-panel, #assistant-panel, .ai-panel');
  
  if (!assistantPanel) {
    console.warn('AI assistant panel not found - will try again later');
    // Only retry if not initialized yet
    setTimeout(initializeIntelligentAssistantUI, 2000);
    return;
  }
  
  // CLEANUP: Remove ALL existing indicators before creating new one
  removeAllStatusIndicators();
  
  // Add professional context status indicator at the top
  const statusIndicator = createContextStatusIndicator();
  assistantPanel.insertBefore(statusIndicator, assistantPanel.firstChild);
  
  // Mark as initialized
  markUIInitialized();
  
  console.log('✅ Intelligent Assistant UI initialized (Professional SVG Mode)');
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeIntelligentAssistantUI, 1000);
    });
  } else {
    setTimeout(initializeIntelligentAssistantUI, 1000);
  }
}
// ============================================================================
// HOT MODULE REPLACEMENT - CLEANUP ON RELOAD
// ============================================================================
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('🔥 [Intelligent Assistant UI] Hot reload detected - cleaning up...');
    
    // Reset initialization flag so it can be re-initialized
    (window as any).__intelligentAssistantUIInitialized = false;
    
    // Remove all status indicators
    removeAllStatusIndicators();
    
    console.log('✅ [Intelligent Assistant UI] HMR cleanup complete');
  });
  
  console.log('🔥 [Intelligent Assistant UI] HMR enabled');
}