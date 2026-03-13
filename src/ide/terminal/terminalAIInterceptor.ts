/**
 * ====================================================================================================
 * FILE: src/ide/aiAssistant/terminalAIInterceptor.ts
 * AI MESSAGE INTERCEPTOR - Ensures terminal errors get specific solutions, not generic questions
 * ====================================================================================================
 * 
 * PROBLEM: AI asks "Could you share more details?" for obvious errors like "flutter not recognized"
 * SOLUTION: Intercept AI calls and inject strong instructions that force specific answers
 * 
 * This module:
 * 1. Intercepts messages before they go to AI
 * 2. Detects terminal error context
 * 3. Injects system-level instructions that FORCE specific answers
 * 4. Prevents AI from asking clarifying questions for common errors
 * 
 * ====================================================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface InterceptResult {
  modified: boolean;
  messages: AIMessage[];
  systemPromptAddition?: string;
}

// ============================================================================
// TERMINAL ERROR SYSTEM PROMPT INJECTION
// This gets prepended to force AI to give specific answers
// ============================================================================

const TERMINAL_ERROR_SYSTEM_PROMPT = `
CRITICAL INSTRUCTION FOR TERMINAL ERRORS:
When the user shares a terminal error, you MUST:

1. **NEVER ask clarifying questions** like "Could you share more details?" or "What command did you run?"
   - The error message contains ALL the information you need
   - Asking questions wastes time and frustrates users

2. **Immediately identify the root cause** from the error text:
   - "not recognized" / "command not found" = Tool NOT INSTALLED
   - "permission denied" / "EACCES" = Need admin/sudo privileges
   - "Cannot find module" = Missing dependency, run npm install
   - "EADDRINUSE" = Port already in use
   - "SyntaxError" = Code has typo/bug at specific line

3. **Provide the EXACT solution** with commands:
   - For missing tools: Give download URL + installation steps
   - For permissions: Give the exact sudo/admin command
   - For missing deps: Give the exact npm/pip install command

4. **Be platform-aware**:
   - Windows: Use PowerShell/CMD syntax, %PATH%, .exe installers
   - Mac/Linux: Use bash syntax, $PATH, brew/apt commands

EXAMPLES OF CORRECT RESPONSES:

User: "'flutter' is not recognized as an internal or external command"
CORRECT: "Flutter SDK is not installed. Here's how to fix it:
1. Download from https://docs.flutter.dev/get-started/install
2. Extract to C:\\flutter
3. Add C:\\flutter\\bin to your PATH
4. Restart terminal and run: flutter doctor"

WRONG: "Could you share more details about your project?"

User: "npm ERR! EACCES permission denied"
CORRECT: "Permission error. Fix with:
- Windows: Run terminal as Administrator
- Mac/Linux: Use sudo npm install or fix npm permissions"

WRONG: "What were you trying to install?"
`;

// ============================================================================
// ERROR PATTERN DETECTION
// ============================================================================

const TERMINAL_ERROR_PATTERNS = [
  // Command not found errors
  /not recognized as an internal or external command/i,
  /command not found/i,
  /is not recognized/i,
  /'[\w]+' is not recognized/i,
  
  // Permission errors
  /permission denied/i,
  /access denied/i,
  /EACCES/i,
  
  // Module/dependency errors
  /cannot find module/i,
  /module not found/i,
  /no module named/i,
  
  // Build/compile errors
  /error\s*:/i,
  /failed/i,
  /FATAL/i,
  /exception/i,
  
  // Common error markers
  /npm ERR!/i,
  /error\[E\d+\]/i,
  /Traceback/i,
];

/**
 * Check if message contains terminal error context
 */
function containsTerminalError(message: string): boolean {
  return TERMINAL_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check if message is asking AI to fix something
 */
function isAskingForHelp(message: string): boolean {
  const helpPatterns = [
    /fix\s*(this|the|my)/i,
    /help\s*(me|with)/i,
    /what('s| is)\s*wrong/i,
    /why\s*(is|does|am)/i,
    /how\s*(do|can|to)\s*(i|we)?\s*fix/i,
    /error/i,
    /failed/i,
    /not working/i,
  ];
  return helpPatterns.some(p => p.test(message));
}

// ============================================================================
// KNOWN ERROR → INSTANT RESPONSE
// Skip AI entirely for well-known errors
// ============================================================================

interface KnownError {
  pattern: RegExp;
  commandHint?: RegExp;
  response: string;
}

const KNOWN_ERRORS: KnownError[] = [
  {
    pattern: /flutter.*not recognized|'flutter' is not recognized/i,
    response: `## 🔴 Flutter SDK Not Installed

**The Problem:** Flutter is not installed on your computer, or it's not in your system PATH.

**Solution:**

### Step 1: Download Flutter SDK
Go to: **https://docs.flutter.dev/get-started/install**

### Step 2: Extract the SDK
- **Windows:** Extract to \`C:\\flutter\`
- **Mac/Linux:** Extract to \`~/flutter\`

### Step 3: Add to PATH
**Windows:**
1. Open Start Menu → Search "Environment Variables"
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Under "System Variables", find PATH and click "Edit"
5. Click "New" and add: \`C:\\flutter\\bin\`
6. Click OK on all dialogs

**Mac/Linux:**
Add this line to your \`~/.bashrc\` or \`~/.zshrc\`:
\`\`\`bash
export PATH="$PATH:$HOME/flutter/bin"
\`\`\`
Then run: \`source ~/.bashrc\`

### Step 4: Verify Installation
Open a **new terminal** and run:
\`\`\`bash
flutter doctor
\`\`\`

This will check your setup and tell you if anything else needs to be configured.`
  },
  {
    pattern: /npm.*not recognized|'npm' is not recognized/i,
    response: `## 🔴 Node.js/npm Not Installed

**The Problem:** Node.js is not installed on your computer. npm comes bundled with Node.js.

**Solution:**

### Step 1: Download Node.js
Go to: **https://nodejs.org/**
- Download the **LTS** version (recommended)

### Step 2: Install
- Run the installer
- Accept all default options
- **Important:** Make sure "Add to PATH" is checked

### Step 3: Restart Terminal
Close your current terminal and open a new one.

### Step 4: Verify
\`\`\`bash
node --version
npm --version
\`\`\`

Both commands should show version numbers.`
  },
  {
    pattern: /python.*not recognized|'python' is not recognized|python3.*not found/i,
    response: `## 🔴 Python Not Installed

**The Problem:** Python is not installed, or it wasn't added to your system PATH during installation.

**Solution:**

### Step 1: Download Python
Go to: **https://python.org/downloads/**
- Download the latest version

### Step 2: Install (IMPORTANT!)
- Run the installer
- ⚠️ **CHECK THE BOX** that says "Add Python to PATH"
- Click "Install Now"

### Step 3: Restart Terminal
Close your current terminal and open a new one.

### Step 4: Verify
\`\`\`bash
python --version
\`\`\`
or on some systems:
\`\`\`bash
python3 --version
\`\`\``
  },
  {
    pattern: /git.*not recognized|'git' is not recognized/i,
    response: `## 🔴 Git Not Installed

**The Problem:** Git is not installed on your computer.

**Solution:**

### Step 1: Download Git
Go to: **https://git-scm.com/downloads**

### Step 2: Install
- Run the installer
- Use default options (they're fine for most users)

### Step 3: Restart Terminal
Close and reopen your terminal.

### Step 4: Verify
\`\`\`bash
git --version
\`\`\``
  },
  {
    pattern: /EADDRINUSE|address already in use|port.*in use/i,
    response: `## 🔌 Port Already In Use

**The Problem:** Another application is using the port your app needs.

**Solution:**

### Option 1: Find and Kill the Process

**Windows (PowerShell as Admin):**
\`\`\`powershell
# Find what's using port 3000 (change number as needed)
netstat -ano | findstr :3000

# Kill the process (replace 12345 with the PID from above)
taskkill /PID 12345 /F
\`\`\`

**Mac/Linux:**
\`\`\`bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace 12345 with the PID)
kill -9 12345
\`\`\`

### Option 2: Use a Different Port
Most frameworks let you specify a port:
\`\`\`bash
# React/Vite
npm run dev -- --port 3001

# Next.js
npm run dev -- -p 3001

# Flask
flask run --port 5001
\`\`\``
  },
  {
    pattern: /permission denied|EACCES|access denied/i,
    response: `## 🔒 Permission Denied

**The Problem:** You don't have permission to perform this operation.

**Solution:**

### Windows:
1. Close your terminal
2. Right-click on your terminal app (CMD, PowerShell, or VS Code)
3. Select **"Run as Administrator"**
4. Try your command again

### Mac/Linux:
Add \`sudo\` before your command:
\`\`\`bash
sudo npm install
# or
sudo pip install package-name
\`\`\`

### For npm specifically (better long-term fix):
\`\`\`bash
# Change npm's default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to PATH in ~/.bashrc:
export PATH=~/.npm-global/bin:$PATH
\`\`\``
  },
  {
    pattern: /cannot find module|module not found|no module named/i,
    response: `## 📦 Missing Module/Dependency

**The Problem:** A required package is not installed in your project.

**Solution:**

### For Node.js/npm projects:
\`\`\`bash
# Install all dependencies from package.json
npm install

# Or install a specific package
npm install <package-name>
\`\`\`

### For Python projects:
\`\`\`bash
# Install from requirements.txt
pip install -r requirements.txt

# Or install a specific package
pip install <package-name>
\`\`\`

### If you're in the wrong directory:
Make sure you're in the project root folder:
\`\`\`bash
cd path/to/your/project
ls  # Should see package.json or requirements.txt
\`\`\``
  },
];

/**
 * Check if we have a known instant response for this error
 */
function getKnownErrorResponse(message: string): string | null {
  for (const error of KNOWN_ERRORS) {
    if (error.pattern.test(message)) {
      return error.response;
    }
  }
  return null;
}

// ============================================================================
// MESSAGE INTERCEPTOR
// ============================================================================

/**
 * Intercept and modify message before sending to AI
 * Returns modified message with injected instructions
 */
export function interceptTerminalErrorMessage(userMessage: string): InterceptResult {
  const hasTerminalError = containsTerminalError(userMessage);
  const isHelpRequest = isAskingForHelp(userMessage);
  
  // Check for known error with instant response
  const knownResponse = getKnownErrorResponse(userMessage);
  if (knownResponse) {
    console.log('⚡ [TerminalAI] Known error detected - returning instant response');
    return {
      modified: true,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: knownResponse }
      ],
    };
  }
  
  // If it looks like a terminal error, inject system prompt
  if (hasTerminalError || isHelpRequest) {
    console.log('🔧 [TerminalAI] Injecting terminal error instructions');
    return {
      modified: true,
      messages: [{ role: 'user', content: userMessage }],
      systemPromptAddition: TERMINAL_ERROR_SYSTEM_PROMPT,
    };
  }
  
  // No modification needed
  return {
    modified: false,
    messages: [{ role: 'user', content: userMessage }],
  };
}

/**
 * Create enhanced system prompt with terminal error instructions
 */
export function getEnhancedSystemPrompt(basePrompt: string, hasTerminalError: boolean): string {
  if (!hasTerminalError) {
    return basePrompt;
  }
  
  return `${basePrompt}

${TERMINAL_ERROR_SYSTEM_PROMPT}`;
}

// ============================================================================
// DIRECT RESPONSE INJECTION
// For when we want to bypass AI entirely
// ============================================================================

/**
 * Display a response directly in the chat without calling AI
 */
export function displayDirectResponse(response: string): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.warn('[TerminalAI] Chat container not found');
    return;
  }
  
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = 'ai-message assistant-message';
  messageDiv.setAttribute('data-source', 'local-solution');
  messageDiv.style.cssText = `
    opacity: 1;
    padding: 16px;
    margin: 8px 0;
    background: linear-gradient(135deg, #1a2e1a 0%, #252526 100%);
    border-radius: 8px;
    border-left: 3px solid #4caf50;
  `;
  
  // Convert markdown to HTML (basic conversion)
  let htmlContent = response
    // Headers
    .replace(/^## (.*$)/gm, '<h3 style="color: #4fc3f7; margin: 16px 0 8px 0;">$1</h3>')
    .replace(/^### (.*$)/gm, '<h4 style="color: #89D185; margin: 12px 0 6px 0;">$1</h4>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: #1e1e1e; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #1e1e1e; padding: 2px 6px; border-radius: 4px; color: #ce9178;">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');
  
  // Add instant solution badge
  htmlContent = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #333;">
      <span style="background: #4caf50; color: #fff; font-size: 10px; padding: 3px 8px; border-radius: 10px; font-weight: 600;">⚡ INSTANT SOLUTION</span>
      <span style="color: #666; font-size: 11px;">From local knowledge base (no AI delay)</span>
    </div>
    <div class="ai-message-content" style="color: #e6edf3; line-height: 1.6;">
      ${htmlContent}
    </div>
  `;
  
  messageDiv.innerHTML = htmlContent;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ============================================================================
// HOOK INTO SEND MESSAGE FUNCTION
// ============================================================================

let originalSendMessage: Function | null = null;

/**
 * Hook into the chat's send message function
 * This intercepts messages BEFORE they go to AI
 */
export function hookSendMessage(): void {
  // Try to find the send message function
  const possibleFunctions = [
    (window as any).sendMessageDirectly,
    (window as any).sendChatMessage,
    (window as any).sendMessage,
    (window as any).handleSendMessage,
  ];
  
  for (const fn of possibleFunctions) {
    if (typeof fn === 'function' && !fn.__terminalIntercepted) {
      originalSendMessage = fn;
      
      // Create intercepted version
      const interceptedFn = async function(message: string, ...args: any[]) {
        console.log('🔍 [TerminalAI] Intercepting message:', message.substring(0, 100));
        
        // Check for known error
        const knownResponse = getKnownErrorResponse(message);
        if (knownResponse) {
          console.log('⚡ [TerminalAI] Using instant local response');
          
          // Display user message
          const chatContainer = document.querySelector('.ai-chat-container');
          if (chatContainer) {
            const userDiv = document.createElement('div');
            userDiv.className = 'ai-message user-message';
            userDiv.style.cssText = 'opacity: 1; padding: 12px 16px; margin: 8px 0;';
            userDiv.innerHTML = `<div class="ai-message-content">${message.replace(/\n/g, '<br>')}</div>`;
            chatContainer.appendChild(userDiv);
          }
          
          // Display instant response
          displayDirectResponse(knownResponse);
          return;
        }
        
        // Otherwise, call original with potentially enhanced message
        return originalSendMessage!.call(this, message, ...args);
      };
      
      // Mark as intercepted to prevent double-hooking
      (interceptedFn as any).__terminalIntercepted = true;
      
      // Replace the function
      const fnName = Object.keys(window).find(k => (window as any)[k] === fn);
      if (fnName) {
        (window as any)[fnName] = interceptedFn;
        console.log(`✅ [TerminalAI] Hooked into ${fnName}`);
      }
      
      break;
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeTerminalAIInterceptor(): void {
  console.log('🚀 [TerminalAI] Initializing interceptor...');
  
  // Hook send message after a delay to ensure chat is ready
  setTimeout(hookSendMessage, 2000);
  setTimeout(hookSendMessage, 5000); // Retry in case chat loads late
  
  console.log('✅ [TerminalAI] Interceptor ready');
  console.log(`   📚 ${KNOWN_ERRORS.length} instant responses loaded`);
}

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).terminalAIInterceptor = {
    intercept: interceptTerminalErrorMessage,
    getKnownResponse: getKnownErrorResponse,
    displayDirect: displayDirectResponse,
    hook: hookSendMessage,
    init: initializeTerminalAIInterceptor,
    KNOWN_ERRORS,
    TERMINAL_ERROR_SYSTEM_PROMPT,
  };
  
  // Auto-initialize
  if (document.readyState === 'complete') {
    initializeTerminalAIInterceptor();
  } else {
    window.addEventListener('load', initializeTerminalAIInterceptor);
  }
}

export default {
  interceptTerminalErrorMessage,
  getKnownErrorResponse,
  getEnhancedSystemPrompt,
  displayDirectResponse,
  hookSendMessage,
  initializeTerminalAIInterceptor,
  KNOWN_ERRORS,
};
