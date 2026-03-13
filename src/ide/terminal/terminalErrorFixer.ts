/**
 * ====================================================================================================
 * FILE: src/terminalErrorFixer.ts
 * DROP-IN FIX FOR TERMINAL ERROR AI RESPONSES
 * ====================================================================================================
 * 
 * HOW TO USE:
 * 1. Add this file to your src/ folder
 * 2. Add this import to main.ts: import './terminalErrorFixer';
 * 3. That's it! The "Ask AI to fix" button will now give instant solutions
 * 
 * ====================================================================================================
 */

console.log('🔧 [TerminalErrorFixer] Loading...');

// ============================================================================
// INSTANT SOLUTIONS DATABASE
// These are the most common terminal errors with known solutions
// ============================================================================

interface InstantSolution {
  patterns: RegExp[];
  title: string;
  solution: string;
}

const INSTANT_SOLUTIONS: InstantSolution[] = [
  // Flutter not installed
  {
    patterns: [
      /flutter.*not recognized/i,
      /'flutter' is not recognized/i,
      /flutter.*command not found/i,
    ],
    title: '🔴 Flutter SDK Not Installed',
    solution: `**Flutter SDK is not installed on your computer.**

## How to Fix:

### 1. Download Flutter
Go to: **https://docs.flutter.dev/get-started/install**

### 2. Extract the SDK
- **Windows:** Extract to \`C:\\flutter\`
- **Mac:** Extract to \`~/development/flutter\`

### 3. Add to PATH

**Windows:**
1. Press Win + R, type \`sysdm.cpl\` and press Enter
2. Click "Advanced" tab → "Environment Variables"
3. Under "User variables", select "Path" and click "Edit"
4. Click "New" and add: \`C:\\flutter\\bin\`
5. Click OK on all dialogs

**Mac/Linux:**
\`\`\`bash
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
\`\`\`

### 4. Verify Installation
Open a **new terminal** and run:
\`\`\`bash
flutter doctor
\`\`\`

This will verify your installation and show any remaining setup steps.`
  },
  
  // npm not installed
  {
    patterns: [
      /npm.*not recognized/i,
      /'npm' is not recognized/i,
      /npm.*command not found/i,
    ],
    title: '🔴 Node.js/npm Not Installed',
    solution: `**Node.js (which includes npm) is not installed.**

## How to Fix:

### 1. Download Node.js
Go to: **https://nodejs.org/**

Download the **LTS version** (recommended for most users).

### 2. Install
- Run the downloaded installer
- Accept the license agreement
- Use default installation settings
- **Important:** The installer will add Node.js to your PATH automatically

### 3. Restart Your Terminal
Close your current terminal completely and open a new one.

### 4. Verify Installation
\`\`\`bash
node --version
npm --version
\`\`\`

Both should show version numbers (e.g., v20.10.0 and 10.2.0).`
  },
  
  // Python not installed
  {
    patterns: [
      /python.*not recognized/i,
      /'python' is not recognized/i,
      /python.*command not found/i,
      /python3.*not found/i,
    ],
    title: '🔴 Python Not Installed',
    solution: `**Python is not installed or not in PATH.**

## How to Fix:

### 1. Download Python
Go to: **https://python.org/downloads/**

### 2. Install (IMPORTANT!)
- Run the installer
- ⚠️ **CHECK THE BOX** "Add Python to PATH" at the bottom of the installer
- Click "Install Now"

### 3. Restart Your Terminal
Close and reopen your terminal.

### 4. Verify
\`\`\`bash
python --version
\`\`\`

Or on some systems:
\`\`\`bash
python3 --version
\`\`\`

### If Python was installed but not in PATH:
**Windows:** Reinstall Python and make sure to check "Add to PATH"
**Mac/Linux:** Python 3 is usually pre-installed. Try \`python3\` instead of \`python\``
  },
  
  // Git not installed
  {
    patterns: [
      /git.*not recognized/i,
      /'git' is not recognized/i,
      /git.*command not found/i,
    ],
    title: '🔴 Git Not Installed',
    solution: `**Git is not installed on your computer.**

## How to Fix:

### 1. Download Git
Go to: **https://git-scm.com/downloads**

### 2. Install
- Run the installer
- You can use all default options

### 3. Restart Your Terminal
Close and reopen your terminal.

### 4. Verify
\`\`\`bash
git --version
\`\`\``
  },
  
  // Permission denied
  {
    patterns: [
      /permission denied/i,
      /EACCES/i,
      /access denied/i,
      /operation not permitted/i,
    ],
    title: '🔒 Permission Denied',
    solution: `**You don't have permission to perform this operation.**

## How to Fix:

### Windows:
1. Close your terminal
2. Right-click on your terminal (CMD, PowerShell, or VS Code)
3. Click **"Run as Administrator"**
4. Try your command again

### Mac/Linux:
Add \`sudo\` before your command:
\`\`\`bash
sudo your-command-here
\`\`\`

### For npm global installs (better long-term solution):
\`\`\`bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to your PATH (add this to ~/.bashrc or ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH
\`\`\``
  },
  
  // Port in use
  {
    patterns: [
      /EADDRINUSE/i,
      /address already in use/i,
      /port.*already.*use/i,
      /port.*in use/i,
    ],
    title: '🔌 Port Already In Use',
    solution: `**Another process is using the port.**

## How to Fix:

### Option 1: Kill the process using the port

**Windows (run as Admin):**
\`\`\`powershell
# Find what's using port 3000 (change number as needed)
netstat -ano | findstr :3000

# Note the PID (last number), then kill it:
taskkill /PID <PID> /F
\`\`\`

**Mac/Linux:**
\`\`\`bash
# Find and kill in one command (change 3000 to your port)
lsof -ti:3000 | xargs kill -9
\`\`\`

### Option 2: Use a different port

Most frameworks accept a port argument:
\`\`\`bash
# React/Vite
npm run dev -- --port 3001

# Next.js  
npm run dev -- -p 3001

# Angular
ng serve --port 3001
\`\`\``
  },
  
  // Module not found
  {
    patterns: [
      /cannot find module/i,
      /module not found/i,
      /no module named/i,
      /ModuleNotFoundError/i,
    ],
    title: '📦 Module Not Found',
    solution: `**A required package/module is not installed.**

## How to Fix:

### For Node.js projects:
\`\`\`bash
# Install all dependencies
npm install

# Or if using yarn:
yarn install
\`\`\`

### For Python projects:
\`\`\`bash
# Install from requirements file
pip install -r requirements.txt

# Or install specific package:
pip install package-name
\`\`\`

### Common issues:
1. **Wrong directory:** Make sure you're in the project root folder
2. **Deleted node_modules:** Run \`npm install\` again
3. **Package not in package.json:** Run \`npm install package-name\` to add it`
  },
  
  // Cargo/Rust not installed
  {
    patterns: [
      /cargo.*not recognized/i,
      /'cargo' is not recognized/i,
      /cargo.*command not found/i,
      /rustc.*not found/i,
    ],
    title: '🔴 Rust Not Installed',
    solution: `**Rust and Cargo are not installed.**

## How to Fix:

### 1. Install Rust using rustup

**Windows:**
Download and run: **https://rustup.rs/**

**Mac/Linux:**
\`\`\`bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

### 2. Restart Your Terminal
Close and reopen your terminal.

### 3. Verify
\`\`\`bash
cargo --version
rustc --version
\`\`\``
  },
  
  // Java not installed
  {
    patterns: [
      /java.*not recognized/i,
      /'java' is not recognized/i,
      /java.*command not found/i,
      /javac.*not found/i,
    ],
    title: '🔴 Java Not Installed',
    solution: `**Java JDK is not installed or not in PATH.**

## How to Fix:

### 1. Download Java JDK
Go to: **https://adoptium.net/** (recommended)

Or: **https://www.oracle.com/java/technologies/downloads/**

### 2. Install
Run the installer and follow the prompts.

### 3. Set JAVA_HOME (if needed)

**Windows:**
1. Find where Java was installed (e.g., \`C:\\Program Files\\Java\\jdk-21\`)
2. Open System Properties → Environment Variables
3. Create new System Variable:
   - Name: \`JAVA_HOME\`
   - Value: \`C:\\Program Files\\Java\\jdk-21\` (your path)
4. Edit PATH and add: \`%JAVA_HOME%\\bin\`

### 4. Verify
\`\`\`bash
java --version
\`\`\``
  },
];

// ============================================================================
// FIND SOLUTION
// ============================================================================

function findInstantSolution(errorText: string): InstantSolution | null {
  for (const solution of INSTANT_SOLUTIONS) {
    for (const pattern of solution.patterns) {
      if (pattern.test(errorText)) {
        return solution;
      }
    }
  }
  return null;
}

// ============================================================================
// RENDER SOLUTION IN CHAT
// ============================================================================

function renderSolutionInChat(userMessage: string, solution: InstantSolution): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.warn('[TerminalErrorFixer] Chat container not found');
    return;
  }
  
  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.style.cssText = 'opacity: 1; padding: 12px 16px; margin: 8px 0; background: #2d3748; border-radius: 8px;';
  userDiv.innerHTML = `<div class="ai-message-content" style="color: #e6edf3;">${escapeHtml(userMessage).replace(/\n/g, '<br>')}</div>`;
  chatContainer.appendChild(userDiv);
  
  // Add solution message
  const assistantDiv = document.createElement('div');
  assistantDiv.className = 'ai-message assistant-message';
  assistantDiv.style.cssText = `
    opacity: 1;
    padding: 16px;
    margin: 8px 0;
    background: linear-gradient(135deg, #1a2e1a 0%, #252526 100%);
    border-radius: 8px;
    border-left: 4px solid #4caf50;
  `;
  
  // Convert markdown to HTML
  let htmlContent = solution.solution
    .replace(/^## (.*$)/gm, '<h2 style="color: #4fc3f7; margin: 16px 0 12px 0; font-size: 18px;">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 style="color: #89D185; margin: 14px 0 8px 0; font-size: 15px;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: #0d1117; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; border: 1px solid #30363d;"><code style="color: #c9d1d9; font-family: Consolas, monospace; font-size: 13px;">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background: #161b22; padding: 2px 6px; border-radius: 4px; color: #79c0ff; font-family: Consolas, monospace;">$1</code>')
    .replace(/\n/g, '<br>');
  
  assistantDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #30363d;">
      <span style="font-size: 20px;">⚡</span>
      <div>
        <div style="color: #4caf50; font-weight: 600; font-size: 14px;">Instant Solution</div>
        <div style="color: #8b949e; font-size: 11px;">From local knowledge base • No AI delay</div>
      </div>
    </div>
    <h2 style="color: #f0f6fc; margin: 0 0 16px 0; font-size: 16px;">${solution.title}</h2>
    <div class="ai-message-content" style="color: #c9d1d9; line-height: 1.7; font-size: 14px;">
      ${htmlContent}
    </div>
  `;
  
  chatContainer.appendChild(assistantDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// INTERCEPT "ASK AI TO FIX" FUNCTIONALITY
// ============================================================================

function interceptAskAIToFix(): void {
  // Override the global askAIToFixErrors if it exists
  const originalAskAI = (window as any).terminalContext?.askAI;
  
  if (originalAskAI) {
    (window as any).terminalContext.askAI = function() {
      console.log('🔍 [TerminalErrorFixer] Intercepting askAI...');
      
      // Get the error text
      const errors = (window as any).terminalContext.getUnresolved?.() || 
                     (window as any).terminalContext.getErrors?.() || [];
      
      if (errors.length === 0) {
        console.log('[TerminalErrorFixer] No errors found');
        return originalAskAI.call(this);
      }
      
      const errorText = errors.map((e: any) => e.content).join(' ');
      const command = errors[0]?.command || '';
      
      // Check for instant solution
      const solution = findInstantSolution(errorText);
      
      if (solution) {
        console.log('⚡ [TerminalErrorFixer] Found instant solution:', solution.title);
        renderSolutionInChat(
          `Help me fix this terminal error:\n${errorText.substring(0, 200)}`,
          solution
        );
        
        // Mark errors as resolved
        (window as any).terminalContext.markResolved?.();
        return;
      }
      
      // No instant solution, fall back to AI
      console.log('[TerminalErrorFixer] No instant solution, using AI...');
      return originalAskAI.call(this);
    };
    
    console.log('✅ [TerminalErrorFixer] Hooked into terminalContext.askAI');
  }
  
  // Also intercept the popup button click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'popup-ask-ai' || target.textContent?.includes('Ask AI to fix')) {
      // Give our interceptor a chance to handle it
      setTimeout(() => {
        const errors = (window as any).terminalContext?.getUnresolved?.() || [];
        if (errors.length > 0) {
          const errorText = errors.map((e: any) => e.content).join(' ');
          const solution = findInstantSolution(errorText);
          
          if (solution) {
            e.preventDefault();
            e.stopPropagation();
            console.log('⚡ [TerminalErrorFixer] Button click - using instant solution');
            renderSolutionInChat(
              `Fix this error: ${errorText.substring(0, 100)}`,
              solution
            );
            (window as any).terminalContext?.markResolved?.();
          }
        }
      }, 10);
    }
  }, true);
}

// ============================================================================
// INTERCEPT SEND MESSAGE
// ============================================================================

function interceptSendMessage(): void {
  // Find the input and send button
  const setupIntercept = () => {
    const sendBtn = document.querySelector('#send-btn, .modern-send-btn, button[type="submit"]') as HTMLButtonElement;
    const input = document.querySelector('#ai-assistant-input, .ai-chat-input') as HTMLTextAreaElement;
    
    if (!sendBtn || !input) {
      setTimeout(setupIntercept, 2000);
      return;
    }
    
    // Add click interceptor
    sendBtn.addEventListener('click', (e) => {
      const message = input.value;
      
      // Check if message contains terminal error
      const solution = findInstantSolution(message);
      
      if (solution) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('⚡ [TerminalErrorFixer] Intercepted send - using instant solution');
        renderSolutionInChat(message, solution);
        input.value = '';
        return false;
      }
    }, true);
    
    console.log('✅ [TerminalErrorFixer] Send button interceptor ready');
  };
  
  setTimeout(setupIntercept, 2000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initialize(): void {
  console.log('🚀 [TerminalErrorFixer] Initializing...');
  
  // Wait for terminalContext to be ready
  const waitForContext = () => {
    if ((window as any).terminalContext) {
      interceptAskAIToFix();
    } else {
      setTimeout(waitForContext, 1000);
    }
  };
  
  waitForContext();
  interceptSendMessage();
  
  // Expose for debugging
  (window as any).terminalErrorFixer = {
    findSolution: findInstantSolution,
    solutions: INSTANT_SOLUTIONS,
    render: renderSolutionInChat,
  };
  
  console.log('✅ [TerminalErrorFixer] Ready!');
  console.log(`   📚 ${INSTANT_SOLUTIONS.length} instant solutions loaded`);
  console.log('   💡 Test: window.terminalErrorFixer.findSolution("flutter not recognized")');
}

// Auto-init
if (document.readyState === 'complete') {
  initialize();
} else {
  window.addEventListener('load', initialize);
}

export { findInstantSolution, INSTANT_SOLUTIONS };
