/**
 * ====================================================================================================
 * FILE: src/ide/terminal/terminalInstantFix.ts
 * ROBUST INSTANT FIX - Intercepts at CHAT LEVEL, not just terminalContext
 * ====================================================================================================
 * 
 * PROBLEM: Previous version hooked into terminalContext.askAI, but the actual message
 * flow bypasses that and goes directly to the chat input → AI API.
 * 
 * SOLUTION: This version intercepts at multiple levels:
 * 1. The chat send button click
 * 2. The chat input submission
 * 3. The actual API call (if possible)
 * 
 * ====================================================================================================
 */

console.log('⚡ [TerminalInstantFix v2] Loading...');

// ============================================================================
// INSTANT SOLUTIONS DATABASE
// ============================================================================

interface Solution {
  patterns: RegExp[];
  title: string;
  icon: string;
  solution: string;
}

const INSTANT_SOLUTIONS: Solution[] = [
  // FLUTTER
  {
    patterns: [
      /flutter.*not recognized/i,
      /'flutter' is not recognized/i,
      /flutter.*command not found/i,
      /flutter: command not found/i,
      /flutter run.*failed/i,
    ],
    title: 'Flutter SDK Not Installed',
    icon: '🔴',
    solution: `**Flutter is not installed on your computer.**

## How to Fix:

### 1. Download Flutter SDK
👉 **https://docs.flutter.dev/get-started/install**

### 2. Extract the SDK
- **Windows:** Extract to \`C:\\flutter\`
- **Mac/Linux:** Extract to \`~/development/flutter\`

### 3. Add to PATH

**Windows:**
1. Press \`Win + R\`, type \`sysdm.cpl\`, press Enter
2. Click "Advanced" tab → "Environment Variables"
3. Under "User variables", select "Path" → "Edit"
4. Click "New" and add: \`C:\\flutter\\bin\`
5. Click OK on all dialogs

**Mac/Linux:**
\`\`\`bash
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
\`\`\`

### 4. Verify Installation
Open a **new** terminal and run:
\`\`\`bash
flutter doctor
\`\`\``,
  },

  // NPM
  {
    patterns: [
      /npm.*not recognized/i,
      /'npm' is not recognized/i,
      /npm.*command not found/i,
    ],
    title: 'Node.js/npm Not Installed',
    icon: '🔴',
    solution: `**Node.js (which includes npm) is not installed.**

## How to Fix:

### 1. Download Node.js
👉 **https://nodejs.org/** (choose LTS version)

### 2. Install
Run the installer with default settings. npm is included.

### 3. Restart Terminal
Close and reopen your terminal.

### 4. Verify
\`\`\`bash
node --version
npm --version
\`\`\``,
  },

  // PYTHON
  {
    patterns: [
      /python.*not recognized/i,
      /'python' is not recognized/i,
      /python.*command not found/i,
    ],
    title: 'Python Not Installed',
    icon: '🔴',
    solution: `**Python is not installed or not in PATH.**

## How to Fix:

### 1. Download Python
👉 **https://python.org/downloads/**

### 2. Install
- Run the installer
- ⚠️ **CHECK** "Add Python to PATH" at the bottom!

### 3. Restart Terminal & Verify
\`\`\`bash
python --version
\`\`\``,
  },

  // GIT
  {
    patterns: [
      /git.*not recognized/i,
      /'git' is not recognized/i,
      /git.*command not found/i,
    ],
    title: 'Git Not Installed',
    icon: '🔴',
    solution: `**Git is not installed.**

## How to Fix:

### 1. Download Git
👉 **https://git-scm.com/downloads**

### 2. Install with default options

### 3. Restart Terminal & Verify
\`\`\`bash
git --version
\`\`\``,
  },

  // PERMISSION DENIED
  {
    patterns: [
      /permission denied/i,
      /EACCES/i,
      /access denied/i,
    ],
    title: 'Permission Denied',
    icon: '🔒',
    solution: `**You don't have permission for this operation.**

## How to Fix:

### Windows:
Run terminal as **Administrator** (right-click → Run as Administrator)

### Mac/Linux:
\`\`\`bash
sudo your-command-here
\`\`\``,
  },

  // PORT IN USE
  {
    patterns: [
      /EADDRINUSE/i,
      /address already in use/i,
      /port.*in use/i,
    ],
    title: 'Port Already In Use',
    icon: '🔌',
    solution: `**Another process is using this port.**

## How to Fix:

### Windows:
\`\`\`powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
\`\`\`

### Mac/Linux:
\`\`\`bash
lsof -ti:3000 | xargs kill -9
\`\`\``,
  },

  // MODULE NOT FOUND
  {
    patterns: [
      /cannot find module/i,
      /module not found/i,
      /no module named/i,
    ],
    title: 'Module Not Found',
    icon: '📦',
    solution: `**A required package is not installed.**

## How to Fix:

### Node.js:
\`\`\`bash
npm install
\`\`\`

### Python:
\`\`\`bash
pip install -r requirements.txt
\`\`\``,
  },
];

// ============================================================================
// SOLUTION FINDER
// ============================================================================

function findSolution(text: string): Solution | null {
  if (!text) return null;
  
  for (const solution of INSTANT_SOLUTIONS) {
    for (const pattern of solution.patterns) {
      if (pattern.test(text)) {
        console.log(`⚡ [TerminalInstantFix] Pattern matched: ${pattern}`);
        return solution;
      }
    }
  }
  return null;
}

// ============================================================================
// CHECK IF MESSAGE IS A TERMINAL ERROR HELP REQUEST
// ============================================================================

function isTerminalErrorRequest(message: string): boolean {
  const errorIndicators = [
    /not recognized/i,
    /command not found/i,
    /failed.*\d+\.\d+s/i,
    /error.*fix/i,
    /help.*error/i,
    /permission denied/i,
    /EACCES/i,
    /EADDRINUSE/i,
    /module not found/i,
  ];
  
  return errorIndicators.some(pattern => pattern.test(message));
}

// ============================================================================
// RENDER SOLUTION IN CHAT
// ============================================================================

function renderSolution(userQuery: string, solution: Solution): boolean {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.error('[TerminalInstantFix] Chat container not found');
    return false;
  }

  // Remove any "typing" indicators
  document.querySelectorAll('.typing-indicator, .ai-typing').forEach(el => el.remove());

  // Create user message (if not already shown)
  const existingMessages = chatContainer.querySelectorAll('.user-message');
  const lastUserMsg = existingMessages[existingMessages.length - 1];
  const alreadyShown = lastUserMsg?.textContent?.includes(userQuery.substring(0, 50));
  
  if (!alreadyShown) {
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-message user-message';
    userDiv.style.cssText = 'opacity:1; padding:12px 16px; margin:8px 0; background:#2d3748; border-radius:8px;';
    userDiv.innerHTML = `<div class="ai-message-content" style="color:#e6edf3;">${escapeHtml(userQuery.substring(0, 200)).replace(/\n/g, '<br>')}</div>`;
    chatContainer.appendChild(userDiv);
  }

  // Create solution message
  const solutionDiv = document.createElement('div');
  solutionDiv.className = 'ai-message assistant-message';
  solutionDiv.setAttribute('data-instant-solution', 'true');
  solutionDiv.style.cssText = `
    opacity: 1;
    padding: 16px;
    margin: 8px 0;
    background: linear-gradient(135deg, #1a2e1a 0%, #1e1e1e 100%);
    border-radius: 8px;
    border-left: 4px solid #4caf50;
  `;

  // Convert markdown to HTML
  const htmlContent = solution.solution
    .replace(/^## (.*$)/gm, '<h2 style="color:#4fc3f7; margin:16px 0 10px 0; font-size:16px; font-weight:600;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="color:#89D185; margin:12px 0 8px 0; font-size:14px; font-weight:600;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/👉/g, '<span style="margin-right:4px;">👉</span>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0d1117; padding:12px; border-radius:6px; margin:8px 0; overflow-x:auto; border:1px solid #30363d;"><code style="color:#c9d1d9; font-family:Consolas,Monaco,monospace; font-size:13px;">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#21262d; padding:2px 6px; border-radius:4px; color:#79c0ff; font-family:Consolas,monospace; font-size:13px;">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
    .replace(/\n/g, '<br>');

  solutionDiv.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #30363d;">
      <span style="font-size:24px;">⚡</span>
      <div style="flex:1;">
        <div style="color:#4caf50; font-weight:600; font-size:13px;">Instant Solution</div>
        <div style="color:#8b949e; font-size:11px;">From local knowledge base • No API delay</div>
      </div>
    </div>
    <h2 style="color:#f85149; margin:0 0 12px 0; font-size:17px; display:flex; align-items:center; gap:8px;">
      <span>${solution.icon}</span> ${solution.title}
    </h2>
    <div style="color:#c9d1d9; line-height:1.7; font-size:14px;">
      <p style="margin:8px 0;">${htmlContent}</p>
    </div>
  `;

  chatContainer.appendChild(solutionDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  console.log(`⚡ [TerminalInstantFix] Displayed solution: ${solution.title}`);
  return true;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// INTERCEPT SEND BUTTON - This is the key fix!
// ============================================================================

function interceptSendButton(): void {
  // Use event delegation on document to catch all clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check if it's a send button
    const isSendButton = 
      target.id === 'send-btn' ||
      target.classList.contains('modern-send-btn') ||
      target.classList.contains('send-button') ||
      target.closest('#send-btn') ||
      target.closest('.modern-send-btn') ||
      target.closest('.send-button') ||
      (target.tagName === 'BUTTON' && target.closest('.chat-input-container'));
    
    if (!isSendButton) return;
    
    // Get the input
    const input = document.querySelector('#ai-assistant-input, .ai-chat-input, textarea[placeholder*="Ask"]') as HTMLTextAreaElement;
    if (!input || !input.value.trim()) return;
    
    const message = input.value;
    console.log('🔍 [TerminalInstantFix] Intercepted send:', message.substring(0, 100));
    
    // Check if this looks like a terminal error
    if (isTerminalErrorRequest(message)) {
      const solution = findSolution(message);
      
      if (solution) {
        // PREVENT the default send!
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('⚡ [TerminalInstantFix] Blocking AI call, using instant solution');
        
        // Clear input
        const userMessage = input.value;
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Show solution
        renderSolution(userMessage, solution);
        
        // Mark terminal errors as resolved
        (window as any).terminalContext?.markResolved?.();
        
        return false;
      }
    }
  }, true); // Use CAPTURE phase to intercept before other handlers
  
  console.log('✅ [TerminalInstantFix] Send button interceptor ready');
}

// ============================================================================
// INTERCEPT ENTER KEY IN INPUT
// ============================================================================

function interceptEnterKey(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    
    const target = e.target as HTMLElement;
    const isInput = 
      target.id === 'ai-assistant-input' ||
      target.classList.contains('ai-chat-input') ||
      (target.tagName === 'TEXTAREA' && target.closest('.chat-input-container'));
    
    if (!isInput) return;
    
    const input = target as HTMLTextAreaElement;
    const message = input.value;
    
    if (!message.trim()) return;
    
    console.log('🔍 [TerminalInstantFix] Enter key detected');
    
    if (isTerminalErrorRequest(message)) {
      const solution = findSolution(message);
      
      if (solution) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('⚡ [TerminalInstantFix] Blocking AI call (Enter key)');
        
        const userMessage = input.value;
        input.value = '';
        
        renderSolution(userMessage, solution);
        (window as any).terminalContext?.markResolved?.();
        
        return false;
      }
    }
  }, true);
  
  console.log('✅ [TerminalInstantFix] Enter key interceptor ready');
}

// ============================================================================
// INTERCEPT TERMINAL ERROR POPUP BUTTON
// ============================================================================

function interceptPopupButton(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Check for popup button
    if (target.id === 'popup-ask-ai' || 
        target.textContent?.includes('Ask AI') ||
        target.textContent?.includes('Instant Fix')) {
      
      console.log('🔍 [TerminalInstantFix] Popup button clicked');
      
      const tc = (window as any).terminalContext;
      const errors = tc?.getUnresolved?.() || tc?.getErrors?.() || [];
      
      if (errors.length > 0) {
        const errorText = errors.map((err: any) => err.content || err).join('\n');
        const command = errors[0]?.command || '';
        
        const solution = findSolution(errorText + ' ' + command);
        
        if (solution) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          console.log('⚡ [TerminalInstantFix] Popup - using instant solution');
          
          // Close popup first
          document.getElementById('terminal-error-popup')?.remove();
          
          // Show solution
          renderSolution(`Fix error: ${command}\n${errorText.substring(0, 100)}`, solution);
          tc?.markResolved?.();
          
          return false;
        }
      }
    }
  }, true);
  
  console.log('✅ [TerminalInstantFix] Popup button interceptor ready');
}

// ============================================================================
// INTERCEPT TERMINAL CONTEXT BUTTON
// ============================================================================

function interceptTerminalButton(): void {
  const setupButton = () => {
    const btn = document.getElementById('terminal-ctx-btn');
    if (!btn) {
      setTimeout(setupButton, 2000);
      return;
    }
    
    // Remove existing listeners by cloning
    const newBtn = btn.cloneNode(true) as HTMLElement;
    btn.parentNode?.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', (e) => {
      const tc = (window as any).terminalContext;
      const hasErrors = tc?.getUnresolved?.()?.length > 0 || tc?.getStats?.()?.unresolvedErrors > 0;
      
      if (hasErrors) {
        const errors = tc.getUnresolved?.() || tc.getErrors?.() || [];
        const errorText = errors.map((err: any) => err.content || err).join('\n');
        
        const solution = findSolution(errorText);
        
        if (solution) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('⚡ [TerminalInstantFix] Terminal button - instant solution');
          renderSolution('Fix terminal error', solution);
          tc?.markResolved?.();
          return;
        }
      }
      
      // No solution found, toggle context
      tc?.toggle?.();
    }, true);
    
    console.log('✅ [TerminalInstantFix] Terminal button interceptor ready');
  };
  
  setTimeout(setupButton, 1000);
}

// ============================================================================
// PATCH handleSendMessage IF IT EXISTS
// ============================================================================

function patchSendMessage(): void {
  // Try to patch various send functions
  const functionsToTry = [
    'handleSendMessage',
    'sendMessage', 
    'sendChatMessage',
    'sendMessageDirectly',
  ];
  
  for (const fnName of functionsToTry) {
    const fn = (window as any)[fnName];
    if (typeof fn === 'function' && !(fn as any).__instantFixPatched) {
      const original = fn;
      
      (window as any)[fnName] = function(message: string, ...args: any[]) {
        console.log(`🔍 [TerminalInstantFix] Patched ${fnName} called`);
        
        if (isTerminalErrorRequest(message)) {
          const solution = findSolution(message);
          if (solution) {
            console.log('⚡ [TerminalInstantFix] Intercepted via patched function');
            renderSolution(message, solution);
            (window as any).terminalContext?.markResolved?.();
            return Promise.resolve();
          }
        }
        
        return original.apply(this, [message, ...args]);
      };
      
      ((window as any)[fnName] as any).__instantFixPatched = true;
      console.log(`✅ [TerminalInstantFix] Patched ${fnName}`);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initialize(): void {
  console.log('🚀 [TerminalInstantFix v2] Initializing with multiple intercepts...');
  
  // Set up all intercepts
  interceptSendButton();
  interceptEnterKey();
  interceptPopupButton();
  interceptTerminalButton();
  
  // Patch send functions after a delay
  setTimeout(patchSendMessage, 2000);
  setTimeout(patchSendMessage, 5000);
  
  // Expose for debugging
  (window as any).terminalInstantFix = {
    findSolution,
    renderSolution,
    solutions: INSTANT_SOLUTIONS,
    isTerminalError: isTerminalErrorRequest,
    test: (text: string) => {
      const s = findSolution(text);
      if (s) {
        console.log(`✅ Found: ${s.title}`);
        return s;
      }
      console.log('❌ No solution found');
      return null;
    },
    forceShow: (text: string) => {
      const s = findSolution(text);
      if (s) {
        renderSolution(text, s);
        return true;
      }
      return false;
    }
  };
  
  console.log('✅ [TerminalInstantFix v2] Ready!');
  console.log(`   📚 ${INSTANT_SOLUTIONS.length} instant solutions`);
  console.log('   🧪 Test: window.terminalInstantFix.test("flutter not recognized")');
  console.log('   🎯 Force: window.terminalInstantFix.forceShow("flutter not recognized")');
}

// Auto-initialize with multiple attempts
if (document.readyState === 'complete') {
  initialize();
} else {
  window.addEventListener('load', initialize);
}

// Also try immediately and after delays
setTimeout(initialize, 500);
setTimeout(initialize, 2000);

export { findSolution, INSTANT_SOLUTIONS, renderSolution };
