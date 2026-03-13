// Enhanced UI Manager - Replace verbose welcome text with useful logs
// Add this to your assistantUI.ts file or create a new uiManager.ts

// Log management system
class LogManager {
  private logs: Array<{timestamp: Date, level: string, message: string}> = [];
  private maxLogs = 10;
  
  addLog(level: 'info' | 'success' | 'warning' | 'error', message: string) {
    this.logs.push({
      timestamp: new Date(),
      level,
      message
    });
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.updateLogDisplay();
  }
  
  getRecentLogs() {
    return this.logs.slice(-5); // Show last 5 logs
  }
  
updateLogDisplay() {
  // Update main welcome area
  const welcomeArea = document.querySelector('.assistant-welcome') || 
                     document.querySelector('.assistant-content .system-message') ||
                     document.querySelector('.assistant-message');
  
  if (welcomeArea) {
    this.replaceWelcomeWithLogs(welcomeArea as HTMLElement);
  }
  
  // Also update bottom area
  this.updateBottomLogDisplay();
}
  
  replaceWelcomeWithLogs(container: HTMLElement) {
    const recentLogs = this.getRecentLogs();
    
    if (recentLogs.length === 0) {
      // Show minimal welcome instead of verbose text
      container.innerHTML = `
        <div class="clean-welcome">
          <div class="welcome-header">
            <span class="welcome-icon">🤖</span>
            <span class="welcome-title">AI Coding Assistant Ready</span>
          </div>
          <div class="welcome-subtitle">
            Ask me about code, debugging, or any programming questions
          </div>
        </div>
      `;
    } else {
      // Show recent logs
      const logsHtml = recentLogs.map(log => {
        const icon = this.getLogIcon(log.level);
        const timeStr = log.timestamp.toLocaleTimeString().slice(0, 5);
        return `
          <div class="log-entry log-${log.level}">
            <span class="log-time">${timeStr}</span>
            <span class="log-icon">${icon}</span>
            <span class="log-message">${log.message}</span>
          </div>
        `;
      }).join('');
      
      container.innerHTML = `
        <div class="logs-container">
          <div class="logs-header">
            <span class="logs-icon">📋</span>
            <span class="logs-title">Recent Activity</span>
            <span class="logs-count">${recentLogs.length}</span>
          </div>
          <div class="logs-content">
            ${logsHtml}
          </div>
        </div>
      `;
    }
  }
  
  getLogIcon(level: string): string {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[level] || 'ℹ️';
  }
}

// Global log manager instance
const logManager = new LogManager();

// Enhanced system message function that also logs
export function showSystemMessageWithLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  // Add to log system
  logManager.addLog(type, message);
  
  // Still show the popup message for important notifications
  if (type === 'success' || type === 'error') {
    const existingMessages = document.querySelectorAll('.system-message');
    existingMessages.forEach(msg => {
      if (msg.textContent?.includes(message.substring(0, 20))) {
        msg.remove();
      }
    });

    const messageDiv = document.createElement('div');
    messageDiv.className = `system-message ${type}`;
    messageDiv.textContent = message;

    const assistantPanel = document.querySelector('.assistant-panel');
    const assistantContent = assistantPanel?.querySelector('.assistant-content') || assistantPanel;
    
    if (assistantContent) {
      assistantContent.insertBefore(messageDiv, assistantContent.firstChild);
      
      // Auto-remove after 3 seconds for cleaner UI
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.style.opacity = '0';
          messageDiv.style.transform = 'translateY(-20px)';
          setTimeout(() => messageDiv.remove(), 300);
        }
      }, 3000);
    }
  }
}

// Hook into console for automatic logging
function setupConsoleLogging() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  console.log = (...args) => {
    originalConsole.log(...args);
    const message = args.join(' ');
    if (message.includes('✅') || message.includes('Provider') || message.includes('API')) {
      logManager.addLog('info', message.substring(0, 60));
    }
  };
  
  console.warn = (...args) => {
    originalConsole.warn(...args);
    const message = args.join(' ');
    logManager.addLog('warning', message.substring(0, 60));
  };
  
  console.error = (...args) => {
    originalConsole.error(...args);
    const message = args.join(' ');
    logManager.addLog('error', message.substring(0, 60));
  };
}

// Clean welcome message generator
export function createCleanWelcome(): void {
  const assistantContent = document.querySelector('.assistant-content');
  if (!assistantContent) return;
  
  // Remove verbose welcome text
  const existingWelcome = assistantContent.querySelector('.assistant-message, .system-message');
  if (existingWelcome && existingWelcome.textContent?.includes('programming')) {
    existingWelcome.remove();
  }
  
  // Add clean welcome
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'assistant-welcome';
  
  // Check if we have recent logs to show
  logManager.updateLogDisplay();
  
  assistantContent.insertBefore(welcomeDiv, assistantContent.firstChild);
}

// Provider switch logging
export function logProviderSwitch(fromProvider: string, toProvider: string): void {
  const message = `Switched from ${fromProvider} to ${toProvider}`;
  logManager.addLog('success', message);
}

// API call logging
export function logApiCall(provider: string, success: boolean, message?: string): void {
  const status = success ? 'success' : 'error';
  const logMessage = success 
    ? `${provider} API call successful`
    : `${provider} API failed: ${message?.substring(0, 30) || 'Unknown error'}`;
  
  logManager.addLog(status, logMessage);
}

// Clean UI styles
export function addCleanUIStyles(): void {
  const styleElement = document.createElement('style');
  styleElement.id = 'clean-ui-styles';
  styleElement.textContent = `
    /* Clean Welcome Styles */
    .clean-welcome {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(79, 195, 247, 0.05));
      border: 1px solid rgba(79, 195, 247, 0.2);
      border-radius: 8px;
      padding: 20px;
      margin: 16px;
      text-align: center;
    }
    
    .welcome-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .welcome-icon {
      font-size: 24px;
      filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.3));
    }
    
    .welcome-title {
      font-size: 18px;
      font-weight: 600;
      color: #4fc3f7;
    }
    
    .welcome-subtitle {
      font-size: 14px;
      color: #888;
      margin-top: 4px;
    }
    
    /* Logs Container Styles */
    .logs-container {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
      border: 1px solid rgba(76, 175, 80, 0.2);
      border-radius: 8px;
      margin: 16px;
      overflow: hidden;
    }
    
    .logs-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(76, 175, 80, 0.1);
      border-bottom: 1px solid rgba(76, 175, 80, 0.2);
    }
    
    .logs-icon {
      font-size: 16px;
    }
    
    .logs-title {
      font-size: 14px;
      font-weight: 600;
      color: #4caf50;
      flex: 1;
    }
    
    .logs-count {
      font-size: 12px;
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 16px;
      text-align: center;
    }
    
    .logs-content {
      padding: 8px 0;
    }
    
    .log-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      font-size: 13px;
      border-left: 3px solid transparent;
      transition: background-color 0.2s ease;
    }
    
    .log-entry:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .log-time {
      font-size: 11px;
      color: #666;
      min-width: 35px;
      font-family: monospace;
    }
    
    .log-icon {
      font-size: 14px;
      min-width: 16px;
    }
    
    .log-message {
      color: #ccc;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .log-info {
      border-left-color: #4fc3f7;
    }
    
    .log-success {
      border-left-color: #4caf50;
    }
    
    .log-warning {
      border-left-color: #ffc107;
    }
    
    .log-error {
      border-left-color: #f44336;
    }
    
    .log-success .log-message {
      color: #4caf50;
    }
    
    .log-warning .log-message {
      color: #ffc107;
    }
    
    .log-error .log-message {
      color: #f44336;
    }
    
    /* Hide verbose assistant messages */
    .assistant-message:has-text("Web development"),
    .assistant-message:has-text("Mobile app development"),
    .assistant-message:has-text("Game development") {
      display: none !important;
    }
    
    /* Make system messages more compact */
    .system-message {
      margin: 4px 16px;
      padding: 8px 12px;
      font-size: 13px;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      .clean-welcome {
        margin: 8px;
        padding: 16px;
      }
      
      .logs-container {
        margin: 8px;
      }
      
      .log-entry {
        padding: 4px 12px;
        font-size: 12px;
      }
      
      .log-time {
        display: none; /* Hide timestamps on mobile */
      }
    }
  `;
  
  document.head.appendChild(styleElement);
}

// Initialize clean UI
export function initializeCleanUI(): void {
  // Add styles
  addCleanUIStyles();
  
  // Setup console logging
  setupConsoleLogging();
  
  // Create clean welcome
  setTimeout(() => {
    createCleanWelcome();
  }, 1000);
  
  // Log initial status
  const config = JSON.parse(localStorage.getItem('ai-api-config') || '{}');
  if (config.provider) {
    logManager.addLog('info', `${config.provider} provider ready`);
  }
  
  console.log('🎨 Clean UI initialized with log display');
}

// Export log manager for external use
export { logManager };

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Add to window for console access
  (window as any).logManager = logManager;
  (window as any).showLog = (level: string, message: string) => {
    logManager.addLog(level as any, message);
  };
  
  console.log('🛠️ Clean UI functions available:');
  console.log('- logManager.addLog(level, message)');
  console.log('- showLog("info", "message") - Quick logging');
}

// Add to bottom log display
function updateBottomLogDisplay() {
  const bottomLogContent = document.getElementById('bottom-log-content');
  const bottomLogCount = document.getElementById('bottom-log-count');
  
  if (!bottomLogContent || !bottomLogCount) return;
  
  const recentLogs = this.getRecentLogs();
  bottomLogCount.textContent = recentLogs.length.toString();
  
  if (recentLogs.length === 0) {
    bottomLogContent.innerHTML = '<div class="log-placeholder">No recent messages</div>';
    return;
  }
  
  const logsHtml = recentLogs.slice(-3).map(log => { // Show last 3 logs
    const icon = this.getLogIcon(log.level);
    const timeStr = log.timestamp.toLocaleTimeString().slice(0, 5);
    return `
      <div class="bottom-log-entry log-${log.level}">
        <span class="bottom-log-time">${timeStr}</span>
        <span class="bottom-log-icon">${icon}</span>
        <span class="bottom-log-message">${log.message}</span>
      </div>
    `;
  }).join('');
  
  bottomLogContent.innerHTML = logsHtml;
}