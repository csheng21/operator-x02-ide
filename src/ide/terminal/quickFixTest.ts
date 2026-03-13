/**
 * ====================================================================================================
 * FILE: src/ide/terminal/quickFixTest.ts - Quick Fix Test Module
 * ====================================================================================================
 * 
 * Just import this file to add a Quick Fix test button to your terminal.
 * 
 * USAGE: Add this line to main.ts:
 *   import './ide/terminal/quickFixTest';
 * 
 * ====================================================================================================
 */

// Auto-initialize when imported
(function initQuickFixTest() {
  console.log('🧪 Quick Fix Test module loading...');

  // Wait for DOM to be ready
  function init() {
    // Find terminal header to add button
    const terminalHeader = document.querySelector('.terminal-header');
    const terminalActions = terminalHeader?.querySelector('.terminal-actions') ||
                           document.querySelector('.terminal-actions');
    
    // Also try to find the terminal panel header
    const terminalPanel = document.querySelector('.terminal-panel');
    
    // Create test button
    const testBtn = document.createElement('button');
    testBtn.id = 'quickfix-test-btn';
    testBtn.innerHTML = '🧪';
    testBtn.title = 'Test Quick Fix';
    testBtn.style.cssText = `
      background: #ffd700;
      color: #1a1a1a;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      margin-left: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;
    
    testBtn.addEventListener('click', () => {
      showQuickFixDemo();
    });

    // Try to add to terminal actions
    if (terminalActions && !document.getElementById('quickfix-test-btn')) {
      terminalActions.appendChild(testBtn);
      console.log('✅ Quick Fix test button added to terminal actions');
    } else {
      // Fallback: Add floating button
      addFloatingButton();
    }
  }

  // Add floating button as fallback
  function addFloatingButton() {
    if (document.getElementById('quickfix-floating-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'quickfix-floating-btn';
    btn.innerHTML = '🧪 Test Quick Fix';
    btn.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
      color: #1a1a1a;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      font-family: -apple-system, sans-serif;
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
      z-index: 10000;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 16px rgba(255, 215, 0, 0.5)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)';
    });
    
    btn.addEventListener('click', () => {
      showQuickFixDemo();
    });
    
    document.body.appendChild(btn);
    console.log('✅ Quick Fix floating test button added');
  }

  // Show Quick Fix demo
  function showQuickFixDemo() {
    console.log('🧪 Running Quick Fix demo...');
    
    // Find terminal output
    const terminal = document.querySelector('.terminal-output') ||
                    document.getElementById('terminal-output') ||
                    document.getElementById('integrated-terminal-output') ||
                    document.querySelector('[class*="terminal"]');
    
    if (!terminal) {
      alert('Terminal not found! Make sure terminal panel is visible.');
      console.error('❌ Could not find terminal element');
      return;
    }

    // Clear any existing demo
    const existingDemo = document.querySelectorAll('.quickfix-demo');
    existingDemo.forEach(el => el.remove());

    // Create error message
    const errorLine = document.createElement('div');
    errorLine.className = 'terminal-error quickfix-demo';
    errorLine.style.cssText = `
      color: #ff6b6b;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      padding: 8px;
      margin: 8px 0;
      background: rgba(255, 107, 107, 0.1);
      border-left: 3px solid #ff6b6b;
      border-radius: 4px;
    `;
    errorLine.innerHTML = `
      <div style="color:#888;margin-bottom:4px;">$ npm install nonexistent-package-xyz</div>
      <div style="color:#ff6b6b;">npm ERR! code E404</div>
      <div style="color:#ff6b6b;">npm ERR! 404 Not Found - GET https://registry.npmjs.org/nonexistent-package-xyz</div>
      <div style="color:#ff6b6b;">npm ERR! 404 'nonexistent-package-xyz' is not in the npm registry.</div>
      <div style="color:#ff8a80;margin-top:8px;">Cannot find module 'lodash'</div>
    `;
    terminal.appendChild(errorLine);

    // Create Quick Fix panel
    const panel = document.createElement('div');
    panel.className = 'quickfix-panel quickfix-demo';
    panel.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #333;
      border-left: 3px solid #ffd700;
      border-radius: 6px;
      margin: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      animation: slideDown 0.3s ease;
    `;
    
    panel.innerHTML = `
      <style>
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .qf-item:hover { background: #252525 !important; }
        .qf-apply:hover { background: #1177bb !important; }
        .qf-copy:hover { opacity: 1 !important; }
      </style>
      
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#222;border-bottom:1px solid #333;">
        <span style="font-size:18px;">💡</span>
        <span style="color:#ffd700;font-weight:600;font-size:14px;flex:1;">Quick Fix Available</span>
        <span style="background:#ffd700;color:#1a1a1a;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;">2</span>
      </div>
      
      <!-- Fix Item 1 -->
      <div class="qf-item" style="padding:12px 14px;border-bottom:1px solid #2a2a2a;cursor:pointer;transition:background 0.15s;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:16px;">📦</span>
          <span style="font-weight:600;color:#e0e0e0;font-size:13px;flex:1;">Install Missing Module</span>
          <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:#4caf50;color:white;font-weight:600;">HIGH</span>
        </div>
        <div style="color:#888;font-size:12px;margin-bottom:10px;padding-left:24px;">
          Module "lodash" is not installed in your project
        </div>
        <div style="display:flex;align-items:center;gap:8px;background:#0a0a0a;padding:8px 12px;border-radius:6px;margin:0 0 10px 24px;">
          <code style="flex:1;font-family:'Consolas',monospace;font-size:13px;color:#4fc3f7;">npm install lodash</code>
          <button class="qf-copy" onclick="navigator.clipboard.writeText('npm install lodash');this.innerHTML='✓';setTimeout(()=>this.innerHTML='📋',1500)" 
                  style="background:transparent;border:none;cursor:pointer;font-size:14px;opacity:0.6;transition:opacity 0.2s;padding:4px;">📋</button>
        </div>
        <button class="qf-apply" onclick="runQuickFix('npm install lodash')" 
                style="background:#0e639c;color:white;border:none;padding:8px 16px;border-radius:5px;font-size:12px;font-weight:500;cursor:pointer;margin-left:24px;transition:background 0.2s;">
          ▶ Run Fix
        </button>
      </div>
      
      <!-- Fix Item 2 -->
      <div class="qf-item" style="padding:12px 14px;cursor:pointer;transition:background 0.15s;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:16px;">🔄</span>
          <span style="font-weight:600;color:#e0e0e0;font-size:13px;flex:1;">Clear NPM Cache & Reinstall</span>
          <span style="font-size:10px;padding:3px 8px;border-radius:4px;background:#ff9800;color:white;font-weight:600;">MEDIUM</span>
        </div>
        <div style="color:#888;font-size:12px;margin-bottom:10px;padding-left:24px;">
          NPM cache might be corrupted, try clearing and reinstalling
        </div>
        <div style="display:flex;align-items:center;gap:8px;background:#0a0a0a;padding:8px 12px;border-radius:6px;margin:0 0 10px 24px;">
          <code style="flex:1;font-family:'Consolas',monospace;font-size:13px;color:#4fc3f7;">npm cache clean --force && npm install</code>
          <button class="qf-copy" onclick="navigator.clipboard.writeText('npm cache clean --force && npm install');this.innerHTML='✓';setTimeout(()=>this.innerHTML='📋',1500)" 
                  style="background:transparent;border:none;cursor:pointer;font-size:14px;opacity:0.6;transition:opacity 0.2s;padding:4px;">📋</button>
        </div>
        <button class="qf-apply" onclick="runQuickFix('npm cache clean --force && npm install')" 
                style="background:#0e639c;color:white;border:none;padding:8px 16px;border-radius:5px;font-size:12px;font-weight:500;cursor:pointer;margin-left:24px;transition:background 0.2s;">
          ▶ Run Fix
        </button>
      </div>
    `;
    
    terminal.appendChild(panel);
    terminal.scrollTop = terminal.scrollHeight;
    
    console.log('✅ Quick Fix demo displayed!');
    showNotification('Quick Fix demo added to terminal!', 'success');
  }

  // Run quick fix command
  (window as any).runQuickFix = function(command: string) {
    console.log('🔧 Running Quick Fix:', command);
    
    // Try to find terminal input and run command
    const terminalInput = document.querySelector('.terminal-input') as HTMLInputElement;
    
    if (terminalInput) {
      terminalInput.value = command;
      terminalInput.focus();
      
      // Simulate Enter key
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      });
      terminalInput.dispatchEvent(event);
      
      showNotification(`Running: ${command}`, 'info');
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(command);
      showNotification(`Command copied: ${command}`, 'success');
    }
  };

  // Show notification
  function showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning') {
    const colors: Record<string, string> = {
      info: '#2196f3',
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
    };
    
    // Remove existing
    const existing = document.querySelector('.qf-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'qf-notification';
    notification.style.cssText = `
      position: fixed;
      bottom: 120px;
      right: 20px;
      padding: 12px 20px;
      background: ${colors[type]};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-size: 14px;
      font-family: -apple-system, sans-serif;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    notification.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'all 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize with multiple attempts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 500);
      setTimeout(init, 1500);
      setTimeout(init, 3000);
    });
  } else {
    setTimeout(init, 100);
    setTimeout(init, 500);
    setTimeout(init, 1500);
    setTimeout(init, 3000);
  }

  console.log('✅ Quick Fix Test module loaded');
})();
