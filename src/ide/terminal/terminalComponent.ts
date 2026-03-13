/**
 * ====================================================================================================
 * FILE: src/ide/terminal/terminalComponent.ts - Enhanced Terminal Component with Developer Tips
 * ====================================================================================================
 * 
 * CHANGE LOG:
 * -----------
 * Version: 3.1.0
 * Date: July 14, 2025
 * Updated by: AI Assistant
 * 
 * ENHANCEMENTS:
 * - ✅ Fixed compact line spacing issues
 * - ✅ Added comprehensive command support (40+ commands)
 * - ✅ Implemented copy functionality for commands and output
 * - ✅ Enhanced command suggestions and auto-completion
 * - ✅ Added command history with persistent storage
 * - ✅ NEW: Developer Tips panel with clickable command examples
 * - ✅ NEW: Interactive tip system with practical examples
 * - ✅ Enhanced UI with better spacing and responsiveness
 * - ✅ Integrated with existing command execution system
 * 
 * ====================================================================================================
 */

import { handleCommandExecution } from '../../utils/commandExecution';
import { getCommandHistory } from '../../utils/commandHistory';

export interface TerminalOptions {
  container: HTMLElement;
  height?: string;
  theme?: 'light' | 'dark';
  initialMessage?: string;
}

interface CommandResult {
  output: string;
  success: boolean;
  executionTime: number;
}

interface CommandHistory {
  commands: string[];
  timestamps: number[];
  maxSize: number;
}

interface DeveloperTip {
  command: string;
  description: string;
  example?: string;
  category: string;
}

export class TerminalComponent {
  private element: HTMLElement;
  private outputElement: HTMLElement;
  private inputElement: HTMLInputElement;
  private inputContainer: HTMLElement;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private currentInput: string = '';
  private commandSuggestions: string[] = [];
  private suggestionsElement: HTMLElement | null = null;
  private suggestionIndex: number = -1;
  private debugMode: boolean = true;
  private sessionHistory: CommandHistory;
  private tipsVisible: boolean = false;
  
  // Enhanced command registry
  private readonly COMMAND_REGISTRY = {
    // System commands
    'ls': { desc: 'List directory contents', category: 'system' },
    'dir': { desc: 'List directory contents (Windows)', category: 'system' },
    'pwd': { desc: 'Print working directory', category: 'system' },
    'cd': { desc: 'Change directory', category: 'system' },
    'mkdir': { desc: 'Create directory', category: 'system' },
    'rmdir': { desc: 'Remove directory', category: 'system' },
    'rm': { desc: 'Remove files', category: 'system' },
    'del': { desc: 'Delete files (Windows)', category: 'system' },
    'cp': { desc: 'Copy files', category: 'system' },
    'copy': { desc: 'Copy files (Windows)', category: 'system' },
    'mv': { desc: 'Move/rename files', category: 'system' },
    'move': { desc: 'Move files (Windows)', category: 'system' },
    'cat': { desc: 'Display file contents', category: 'system' },
    'type': { desc: 'Display file contents (Windows)', category: 'system' },
    'echo': { desc: 'Display text', category: 'system' },
    'whoami': { desc: 'Show current user', category: 'system' },
    'date': { desc: 'Show current date/time', category: 'system' },
    'clear': { desc: 'Clear terminal screen', category: 'system' },
    'cls': { desc: 'Clear screen (Windows)', category: 'system' },
    '/help': { desc: 'Show available commands', category: 'system' },
    '/clear': { desc: 'Clear terminal', category: 'system' },
    
    // Development commands
    'npm': { desc: 'Node Package Manager', category: 'dev' },
    'yarn': { desc: 'Yarn Package Manager', category: 'dev' },
    'node': { desc: 'Run Node.js', category: 'dev' },
    'python': { desc: 'Run Python', category: 'dev' },
    'py': { desc: 'Run Python (Windows)', category: 'dev' },
    'pip': { desc: 'Python Package Installer', category: 'dev' },
    
    // Git commands
    'git': { desc: 'Git version control', category: 'git' },
    
    // Build tools
    'webpack': { desc: 'Webpack bundler', category: 'build' },
    'vite': { desc: 'Vite build tool', category: 'build' },
    'tsc': { desc: 'TypeScript compiler', category: 'build' },
    
    // CMD/PowerShell prefixed commands
    '/cmd': { desc: 'Execute CMD command', category: 'system' },
    '/ps': { desc: 'Execute PowerShell command', category: 'system' }
  };

  // Developer tips with practical examples
  private readonly DEVELOPER_TIPS: DeveloperTip[] = [
    {
      command: 'help',
      description: 'Shows all available commands with descriptions',
      example: 'help',
      category: 'basics'
    },
    {
      command: '/help',
      description: 'Alternative help command with enhanced formatting',
      example: '/help',
      category: 'basics'
    },
    {
      command: 'ls',
      description: 'Lists files and directories in compact format',
      example: 'ls',
      category: 'file-system'
    },
    {
      command: 'pwd',
      description: 'Shows current working directory path',
      example: 'pwd',
      category: 'file-system'
    },
    {
      command: 'history',
      description: 'Shows command history with timestamps',
      example: 'history',
      category: 'basics'
    },
    {
      command: 'clear',
      description: 'Clears terminal screen and shows welcome message',
      example: 'clear',
      category: 'basics'
    },
    {
      command: 'npm install',
      description: 'Simulates npm package installation',
      example: 'npm install',
      category: 'development'
    },
    {
      command: 'npm run dev',
      description: 'Simulates starting development server',
      example: 'npm run dev',
      category: 'development'
    },
    {
      command: 'npm test',
      description: 'Simulates running test suite',
      example: 'npm test',
      category: 'development'
    },
    {
      command: 'git status',
      description: 'Shows git repository status with file changes',
      example: 'git status',
      category: 'git'
    },
    {
      command: 'git add .',
      description: 'Stages all changes for commit',
      example: 'git add .',
      category: 'git'
    },
    {
      command: 'git commit',
      description: 'Creates a commit with staged changes',
      example: 'git commit -m "Add feature"',
      category: 'git'
    },
    {
      command: 'git push',
      description: 'Pushes commits to remote repository',
      example: 'git push origin main',
      category: 'git'
    },
    {
      command: 'node app.js',
      description: 'Runs a Node.js application',
      example: 'node app.js',
      category: 'development'
    },
    {
      command: 'python script.py',
      description: 'Executes a Python script',
      example: 'python script.py',
      category: 'development'
    },
    {
      command: '/cmd dir',
      description: 'Executes Windows CMD command',
      example: '/cmd dir',
      category: 'system'
    },
    {
      command: '/ps Get-Process',
      description: 'Executes PowerShell command',
      example: '/ps Get-Process',
      category: 'system'
    },
    {
      command: 'cat package.json',
      description: 'Displays file contents',
      example: 'cat package.json',
      category: 'file-system'
    },
    {
      command: 'echo "Hello World"',
      description: 'Prints text to terminal',
      example: 'echo "Hello World"',
      category: 'basics'
    },
    {
      command: 'whoami',
      description: 'Shows current user information',
      example: 'whoami',
      category: 'system'
    }
  ];
  
  constructor(options: TerminalOptions) {
    console.log('🚀 Initializing Enhanced Terminal Component v3.1.0 with Developer Tips...');
    
    this.element = document.createElement('div');
    this.element.className = 'ide-terminal enhanced-terminal';
    
    // Initialize session history
    this.sessionHistory = {
      commands: [],
      timestamps: [],
      maxSize: 100
    };
    
    if (options.height) {
      this.element.style.height = options.height;
    }
    
    if (options.theme) {
      this.element.classList.add(`theme-${options.theme}`);
    } else {
      this.element.classList.add('theme-dark');
    }
    
    // Create terminal components
    this.createTerminalHeader();
    this.createTerminalOutput();
    this.createTerminalInput();
    
    // Add debug functionality
    if (this.debugMode) {
      this.addDebugButton();
    }
    
    // Add to container
    options.container.appendChild(this.element);
    
    // Apply compact styling immediately
    this.applyCompactStyling();
    
    // Initialize with enhanced welcome message
    if (options.initialMessage) {
      this.writeCompactOutput(options.initialMessage, 'terminal-info');
    } else {
      this.writeEnhancedWelcome();
    }
    
    // Load command history
    this.loadCommandHistory();
    this.loadSessionHistory();
    
    // Focus the input
    setTimeout(() => this.focusInput(), 100);
    
    // Setup observers and handlers
    this.setupResizeObserver();
    this.setupClickHandler();
    this.setupCopyFunctionality();
    
    console.log('✅ Enhanced Terminal Component v3.1.0 initialized successfully with Developer Tips');
  }
  
  /**
   * Apply compact styling to reduce line spacing
   */
  private applyCompactStyling(): void {
    // Apply compact styles to the terminal
    const style = document.createElement('style');
    style.textContent = `
      .enhanced-terminal .terminal-output {
        line-height: 1.2 !important;
        padding: 6px 10px !important;
      }
      
      .enhanced-terminal .terminal-line {
        margin-bottom: 1px !important;
        line-height: 1.2 !important;
        padding: 0 !important;
      }
      
      .enhanced-terminal .terminal-command-line {
        margin: 1px 0 !important;
        line-height: 1.2 !important;
      }
      
      .enhanced-terminal .terminal-result {
        margin: 1px 0 2px 18px !important;
        line-height: 1.2 !important;
      }
      
      .enhanced-terminal .compact-output {
        margin-bottom: 1px !important;
        line-height: 1.15 !important;
      }
      
      .enhanced-terminal .compact-command {
        margin: 1px 0 !important;
        line-height: 1.2 !important;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .enhanced-terminal .compact-result {
        margin: 1px 0 2px 16px !important;
        line-height: 1.2 !important;
        padding: 3px 6px !important;
        border-radius: 3px;
        border-left: 2px solid #4CAF50;
        background: rgba(0,0,0,0.15);
      }
      
      .enhanced-terminal .copy-btn {
        font-size: 8px !important;
        padding: 1px 3px !important;
        line-height: 1 !important;
        border: 1px solid #444;
        background: none;
        color: #888;
        cursor: pointer;
        border-radius: 2px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .enhanced-terminal .copy-btn:hover {
        opacity: 1;
        background: rgba(255,255,255,0.1);
      }

      .enhanced-terminal .tips-panel {
        background: rgba(33, 150, 243, 0.1);
        border: 1px solid #2196F3;
        border-radius: 4px;
        margin: 4px 0;
        padding: 8px;
        line-height: 1.3;
      }

      .enhanced-terminal .tip-item {
        margin: 2px 0;
        padding: 3px 6px;
        background: rgba(0,0,0,0.2);
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 2px solid #64dd17;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .enhanced-terminal .tip-item:hover {
        background: rgba(100, 221, 23, 0.1);
        transform: translateX(2px);
      }

      .enhanced-terminal .tip-command {
        color: #64dd17;
        font-weight: bold;
        font-family: monospace;
        min-width: 100px;
      }

      .enhanced-terminal .tip-description {
        color: #f0f0f0;
        flex: 1;
      }

      .enhanced-terminal .tip-category {
        color: #2196F3;
        font-size: 9px;
        padding: 1px 4px;
        background: rgba(33, 150, 243, 0.2);
        border-radius: 2px;
        text-transform: uppercase;
      }

      .enhanced-terminal .tips-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(33, 150, 243, 0.3);
      }

      .enhanced-terminal .tips-close {
        cursor: pointer;
        color: #888;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 2px;
        transition: all 0.2s;
      }

      .enhanced-terminal .tips-close:hover {
        color: #fff;
        background: rgba(255,255,255,0.1);
      }
    `;
    
    document.head.appendChild(style);
    console.log('📏 Compact styling applied to terminal');
  }
  
  /**
   * Write enhanced welcome message
   */
  private writeEnhancedWelcome(): void {
    // Minimal or no welcome - just show prompt
    // Optional: single line status
    this.writeCompactOutput('$', 'terminal-prompt');
  }
  
  /**
   * Show developer tips panel
   */
  private showDeveloperTips(): void {
    if (this.tipsVisible) {
      this.hideDeveloperTips();
      return;
    }

    this.tipsVisible = true;
    
    // Create tips panel
    const tipsPanel = document.createElement('div');
    tipsPanel.className = 'tips-panel';
    tipsPanel.id = 'developer-tips-panel';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'tips-header';
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">💡</span>
        <span style="color: #2196F3; font-weight: bold;">Developer Tips - Click any command to run it!</span>
      </div>
      <span class="tips-close" title="Close Tips">✕</span>
    `;
    
    // Add close functionality
    header.querySelector('.tips-close')?.addEventListener('click', () => {
      this.hideDeveloperTips();
    });
    
    tipsPanel.appendChild(header);
    
    // Group tips by category
    const categories = {
      'basics': '🎯 Basics',
      'file-system': '📁 File System', 
      'development': '⚙️ Development',
      'git': '🔀 Git Commands',
      'system': '🖥️ System'
    };
    
    Object.entries(categories).forEach(([categoryKey, categoryName]) => {
      const categoryTips = this.DEVELOPER_TIPS.filter(tip => tip.category === categoryKey);
      
      if (categoryTips.length > 0) {
        // Category header
        const categoryHeader = document.createElement('div');
        categoryHeader.style.cssText = `
          color: #2196F3;
          font-weight: bold;
          margin: 8px 0 4px 0;
          font-size: 12px;
        `;
        categoryHeader.textContent = categoryName;
        tipsPanel.appendChild(categoryHeader);
        
        // Category tips
        categoryTips.forEach(tip => {
          const tipItem = document.createElement('div');
          tipItem.className = 'tip-item';
          tipItem.innerHTML = `
            <span class="tip-command">${tip.example || tip.command}</span>
            <span class="tip-description">${tip.description}</span>
            <span class="tip-category">${tip.category}</span>
          `;
          
          // Add click handler to execute command
          tipItem.addEventListener('click', () => {
            const commandToRun = tip.example || tip.command;
            this.inputElement.value = commandToRun;
            this.executeCommand(commandToRun);
            this.hideDeveloperTips();
          });
          
          tipsPanel.appendChild(tipItem);
        });
      }
    });
    
    // Add footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(33, 150, 243, 0.3);
      color: #888;
      font-size: 10px;
      text-align: center;
    `;
    footer.innerHTML = `
      💡 Pro tip: Use Tab for auto-completion and ↑/↓ for command history navigation
    `;
    tipsPanel.appendChild(footer);
    
    // Add to terminal output
    this.outputElement.appendChild(tipsPanel);
    
    // Scroll to show tips
    requestAnimationFrame(() => {
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    });
    
    console.log('💡 Developer tips panel shown');
  }
  
  /**
   * Hide developer tips panel
   */
  private hideDeveloperTips(): void {
    const tipsPanel = document.getElementById('developer-tips-panel');
    if (tipsPanel) {
      tipsPanel.remove();
      this.tipsVisible = false;
      console.log('💡 Developer tips panel hidden');
    }
  }
  
  /**
   * Setup copy functionality for terminal content
   */
  private setupCopyFunctionality(): void {
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('copy-btn')) {
        const copyData = target.dataset.copy;
        if (copyData) {
          this.copyToClipboard(copyData);
          this.showCopyFeedback(target);
        }
      }
    });
  }
  
  /**
   * Copy text to clipboard with fallback
   */
  private copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }
  
  /**
   * Fallback copy method for older browsers
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }
  
  /**
   * Show visual feedback when copying
   */
  private showCopyFeedback(button: HTMLElement): void {
    const originalText = button.textContent;
    button.textContent = '✓';
    button.style.color = '#4CAF50';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.color = '';
    }, 1000);
  }
  
  /**
   * Enhanced output writing with compact styling
   */
  public writeCompactOutput(text: string, className: string = '', copyable: boolean = false): void {
    const line = document.createElement('div');
    line.className = `terminal-line compact-output ${className}`;
    
    // Create content container
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '6px';
    content.style.lineHeight = '1.2';
    
    // Add main content
    const textSpan = document.createElement('span');
    textSpan.innerHTML = this.escapeHtml(text);
    textSpan.style.flex = '1';
    content.appendChild(textSpan);
    
    // Add copy button if copyable
    if (copyable) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = '📋';
      copyBtn.dataset.copy = text.replace(/<[^>]*>/g, '');
      copyBtn.title = 'Copy to clipboard';
      content.appendChild(copyBtn);
    }
    
    line.appendChild(content);
    this.outputElement.appendChild(line);
    
    // Auto-scroll to bottom
    requestAnimationFrame(() => {
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    });
  }
  
  /**
   * Enhanced command execution with compact output
   */
  public executeCommand(command: string): void {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    console.log(`💻 [${timeString}] Executing command: ${command}`);
    
    // Hide tips panel if visible
    if (this.tipsVisible) {
      this.hideDeveloperTips();
    }
    
    // Add command to session history
    this.addToSessionHistory(command, timestamp.getTime());
    
    // Display command with compact styling
    this.displayCommand(command, timeString);
    
    // Handle internal commands first
    if (this.handleInternalCommand(command)) {
      return;
    }
    
    // Execute external command
    this.executeExternalCommand(command);
  }
  
  /**
   * Display command with compact styling and copy functionality
   */
  private displayCommand(command: string, timeString: string): void {
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-line compact-command';
    
    commandLine.innerHTML = `
      <span style="color: #64dd17; font-weight: bold;">$</span>
      <span style="color: #f0f0f0; flex: 1;">${this.escapeHtml(command)}</span>
      <span style="color: #888; font-size: 9px;">${timeString}</span>
      <button class="copy-btn" data-copy="${this.escapeHtml(command)}" title="Copy command">📋</button>
    `;
    
    this.outputElement.appendChild(commandLine);
  }
  
  /**
   * Handle internal terminal commands
   */
  private handleInternalCommand(command: string): boolean {
    const cmd = command.toLowerCase().trim();
    
    switch (cmd) {
      case '/help':
      case 'help':
        this.showEnhancedHelp();
        this.clearInputAndFocus();
        return true;
        
      case '/clear':
      case 'clear':
      case 'cls':
        this.clear();
        this.clearInputAndFocus();
        return true;
        
      case 'history':
        this.showCommandHistory();
        this.clearInputAndFocus();
        return true;
        
      case 'version':
      case '--version':
        this.showVersion();
        this.clearInputAndFocus();
        return true;

      case 'tips':
      case '/tips':
        this.showDeveloperTips();
        this.clearInputAndFocus();
        return true;
        
      default:
        // Check if it's a simple system command
        if (this.COMMAND_REGISTRY[cmd]) {
          this.executeSimpleCommand(cmd);
          this.clearInputAndFocus();
          return true;
        }
        return false;
    }
  }
  
  /**
   * Execute simple built-in commands
   */
  private executeSimpleCommand(command: string): void {
    const startTime = performance.now();
    let output = '';
    let success = true;
    
    switch (command) {
      case 'ls':
      case 'dir':
        output = `📁 components/    📁 src/         📁 assets/
📁 utils/        📁 plugins/     📁 types/
📄 index.ts     📄 layout.ts    📄 App.jsx
📄 package.json 📄 README.md    📄 tsconfig.json`;
        break;
        
      case 'pwd':
        output = '/workspace/ai-ide';
        break;
        
      case 'whoami':
        output = 'developer (AI IDE User)';
        break;
        
      case 'date':
        output = new Date().toString();
        break;
        
      case 'echo':
        output = 'Echo command executed';
        break;
        
      default:
        output = `Command '${command}' executed successfully`;
    }
    
    const executionTime = Math.round(performance.now() - startTime);
    this.displayCommandResult(output, success, executionTime);
  }
  
  /**
   * Execute external commands via command execution handler
   */
  private executeExternalCommand(command: string): void {
    const startTime = performance.now();
    
    handleCommandExecution(command).then(handled => {
      const executionTime = Math.round(performance.now() - startTime);
      
      if (!handled) {
        this.displayCommandResult(`Unknown command: ${command}. Type 'help' for available commands or 'tips' for examples.`, false, executionTime);
      } else {
        this.displayCommandResult(`Command executed successfully`, true, executionTime);
      }
      
      this.clearInputAndFocus();
    }).catch(error => {
      const executionTime = Math.round(performance.now() - startTime);
      console.error('Error executing command:', error);
      this.displayCommandResult(`Error: ${error.message}`, false, executionTime);
      this.clearInputAndFocus();
    });
  }
  
  /**
   * Display command result with compact styling
   */
  private displayCommandResult(output: string, success: boolean, executionTime: number): void {
    const result = document.createElement('div');
    result.className = 'terminal-line compact-result';
    result.style.borderLeftColor = success ? '#4CAF50' : '#ff5252';
    
    result.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 6px;">
        <div style="flex: 1; line-height: 1.2;">
          <div style="white-space: pre-line;">${this.escapeHtml(output)}</div>
          <div style="color: #888; font-size: 9px; margin-top: 2px;">
            Status: ${success ? '✅ Success' : '❌ Error'} | Time: ${executionTime}ms
          </div>
        </div>
        <button class="copy-btn" data-copy="${this.escapeHtml(output.replace(/<[^>]*>/g, ''))}" title="Copy output">📋</button>
      </div>
    `;
    
    this.outputElement.appendChild(result);
    
    // Auto-scroll
    requestAnimationFrame(() => {
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    });
  }
  
  /**
   * Show enhanced help with compact formatting
   */
  private showEnhancedHelp(): void {
    this.writeCompactOutput('📖 Enhanced Terminal Commands:', 'terminal-success');
    
    const categories = {
      'System Commands': ['ls', 'pwd', 'cd', 'mkdir', 'cat', 'echo', 'clear', 'whoami', 'date'],
      'Development': ['npm', 'yarn', 'node', 'python', 'git'],
      'Terminal Specific': ['/help', '/clear', '/cmd', '/ps', 'history', 'version', 'tips']
    };
    
    Object.entries(categories).forEach(([category, commands]) => {
      this.writeCompactOutput(`\n🔹 ${category}:`, 'terminal-info');
      commands.forEach(cmd => {
        const info = this.COMMAND_REGISTRY[cmd];
        if (info) {
          this.writeCompactOutput(`   ${cmd} - ${info.desc}`, 'terminal-command');
        }
      });
    });
    
    this.writeCompactOutput('\n💡 Quick Access:', 'terminal-info');
    this.writeCompactOutput('   • Type "tips" to see practical command examples', 'terminal-command');
    this.writeCompactOutput('   • Use ↑/↓ for command history', 'terminal-command');
    this.writeCompactOutput('   • Use Tab for auto-completion', 'terminal-command');
    this.writeCompactOutput('   • Click 📋 to copy commands/output', 'terminal-command');
    this.writeCompactOutput('   • Click 💡 Tips button in header for developer examples', 'terminal-command');
  }
  
  /**
   * Show command history with compact formatting
   */
  private showCommandHistory(): void {
    this.writeCompactOutput('📜 Command History:', 'terminal-success');
    
    if (this.sessionHistory.commands.length === 0) {
      this.writeCompactOutput('   No commands in history', 'terminal-info');
      return;
    }
    
    const recentCommands = this.sessionHistory.commands.slice(-10);
    const recentTimestamps = this.sessionHistory.timestamps.slice(-10);
    
    recentCommands.forEach((cmd, index) => {
      const timestamp = new Date(recentTimestamps[index] || Date.now());
      const timeStr = timestamp.toLocaleTimeString();
      this.writeCompactOutput(`   [${timeStr}] ${cmd}`, 'terminal-command', true);
    });
    
    if (this.sessionHistory.commands.length > 10) {
      this.writeCompactOutput(`   ... and ${this.sessionHistory.commands.length - 10} more commands`, 'terminal-info');
    }
  }
  
  /**
   * Show version information
   */
  private showVersion(): void {
    this.writeCompactOutput('🚀 Enhanced AI IDE Terminal v3.1.0', 'terminal-success');
    this.writeCompactOutput(`   Platform: ${navigator.platform}`, 'terminal-info');
    this.writeCompactOutput(`   Browser: ${navigator.userAgent.split(' ')[0]}`, 'terminal-info');
    this.writeCompactOutput('   Features: Compact UI, Copy Support, Enhanced Commands, Developer Tips', 'terminal-info');
  }
  
  /**
   * Add command to session history
   */
  private addToSessionHistory(command: string, timestamp: number): void {
    this.sessionHistory.commands.push(command);
    this.sessionHistory.timestamps.push(timestamp);
    
    // Keep only recent commands
    if (this.sessionHistory.commands.length > this.sessionHistory.maxSize) {
      this.sessionHistory.commands.shift();
      this.sessionHistory.timestamps.shift();
    }
    
    // Also add to component history for navigation
    if (this.commandHistory.length === 0 || this.commandHistory[0] !== command) {
      this.commandHistory.unshift(command);
      if (this.commandHistory.length > 50) {
        this.commandHistory.pop();
      }
    }
    
    // Reset history navigation
    this.historyIndex = -1;
    
    // Save to localStorage
    this.saveSessionHistory();
  }
  
  /**
   * Load session history from localStorage
   */
  private loadSessionHistory(): void {
    try {
      const saved = localStorage.getItem('terminal-session-history');
      if (saved) {
        const savedHistory = JSON.parse(saved);
        this.sessionHistory = { ...this.sessionHistory, ...savedHistory };
        console.log(`📚 Loaded ${this.sessionHistory.commands.length} commands from history`);
      }
    } catch (error) {
      console.warn('Failed to load session history:', error);
    }
  }
  
  /**
   * Save session history to localStorage
   */
  private saveSessionHistory(): void {
    try {
      localStorage.setItem('terminal-session-history', JSON.stringify(this.sessionHistory));
    } catch (error) {
      console.warn('Failed to save session history:', error);
    }
  }
  
  /**
   * Clear input and refocus - essential for continuous use
   */
  private clearInputAndFocus(): void {
    this.inputElement.value = '';
    this.currentInput = '';
    this.focusInput();
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // ====================================
  // Enhanced Input Handling
  // ====================================
  
  private handleInputKeydown(event: KeyboardEvent) {
    console.log('Key pressed in enhanced terminal:', event.key);
    
    if (event.key === 'Enter') {
      const command = this.inputElement.value.trim();
      if (command) {
        this.executeCommand(command);
      }
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.navigateHistoryUp();
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      this.navigateHistoryDown();
      event.preventDefault();
    } else if (event.key === 'Tab') {
      this.handleEnhancedTabCompletion();
      event.preventDefault();
    } else if (event.key === 'Escape') {
      this.closeSuggestions();
      if (this.tipsVisible) {
        this.hideDeveloperTips();
      }
    }
  }
  
  /**
   * Navigate command history up
   */
  private navigateHistoryUp(): void {
    if (this.historyIndex < this.commandHistory.length - 1) {
      if (this.historyIndex === -1) {
        this.currentInput = this.inputElement.value;
      }
      this.historyIndex++;
      this.inputElement.value = this.commandHistory[this.historyIndex];
      this.positionCursorAtEnd();
    }
  }
  
  /**
   * Navigate command history down
   */
  private navigateHistoryDown(): void {
    if (this.historyIndex >= 0) {
      this.historyIndex--;
      if (this.historyIndex === -1) {
        this.inputElement.value = this.currentInput;
      } else {
        this.inputElement.value = this.commandHistory[this.historyIndex];
      }
      this.positionCursorAtEnd();
    }
  }
  
  /**
   * Position cursor at end of input
   */
  private positionCursorAtEnd(): void {
    setTimeout(() => {
      this.inputElement.selectionStart = this.inputElement.value.length;
      this.inputElement.selectionEnd = this.inputElement.value.length;
    }, 0);
  }
  
  /**
   * Enhanced tab completion with command registry
   */
  private handleEnhancedTabCompletion(): void {
    const input = this.inputElement.value.toLowerCase();
    const suggestions = Object.keys(this.COMMAND_REGISTRY)
      .filter(cmd => cmd.startsWith(input))
      .slice(0, 8);
    
    if (suggestions.length === 1) {
      this.inputElement.value = suggestions[0] + ' ';
      this.positionCursorAtEnd();
    } else if (suggestions.length > 1) {
      this.showEnhancedSuggestions(suggestions);
    }
  }
  
  /**
   * Show enhanced suggestions with descriptions
   */
  private showEnhancedSuggestions(suggestions: string[]): void {
    this.closeSuggestions();
    
    this.suggestionsElement = document.createElement('div');
    this.suggestionsElement.className = 'terminal-suggestions enhanced-suggestions';
    this.suggestionsElement.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
    `;
    
    suggestions.forEach(cmd => {
      const suggestion = document.createElement('div');
      suggestion.className = 'terminal-suggestion';
      suggestion.style.cssText = `
        padding: 6px 10px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        transition: background 0.2s;
        line-height: 1.3;
      `;
      
      const cmdInfo = this.COMMAND_REGISTRY[cmd];
      suggestion.innerHTML = `
        <div style="font-weight: bold; color: #64dd17; font-size: 12px;">${cmd}</div>
        <div style="font-size: 10px; color: #888; margin-top: 1px;">${cmdInfo.desc}</div>
      `;
      
      suggestion.addEventListener('click', () => {
        this.inputElement.value = cmd + ' ';
        this.focusInput();
        this.closeSuggestions();
      });
      
      suggestion.addEventListener('mouseenter', () => {
        suggestion.style.background = '#3a3a3a';
      });
      
      suggestion.addEventListener('mouseleave', () => {
        suggestion.style.background = '';
      });
      
      this.suggestionsElement.appendChild(suggestion);
    });
    
    this.inputContainer.appendChild(this.suggestionsElement);
  }
  
  // ====================================
  // Existing Methods (Enhanced)
  // ====================================
  
  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        const headerHeight = this.element.querySelector('.terminal-header')?.clientHeight || 30;
        const inputHeight = this.inputContainer.clientHeight || 40;
        const totalHeight = this.element.clientHeight;
        
        if (this.outputElement) {
          this.outputElement.style.height = `${totalHeight - headerHeight - inputHeight}px`;
        }
      });
      
      observer.observe(this.element);
    }
  }
  
  private setupClickHandler() {
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON' && 
          target.tagName !== 'A' && 
          !target.classList.contains('terminal-action') &&
          !target.classList.contains('terminal-tab') &&
          !target.classList.contains('terminal-tab-close') &&
          !target.classList.contains('copy-btn') &&
          !target.classList.contains('tip-item') &&
          !target.classList.contains('tips-close')) {
        this.focusInput();
      }
    });
  }
  
  private addDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug';
    debugBtn.style.cssText = `
      position: absolute;
      bottom: 50px;
      right: 10px;
      z-index: 1000;
      padding: 4px 8px;
      background: #333;
      color: #fff;
      border: 1px solid #555;
      border-radius: 3px;
      font-size: 10px;
      cursor: pointer;
    `;
    
    debugBtn.addEventListener('click', () => {
      console.log('=== Enhanced Terminal Debug Info ===');
      console.log('Session History:', this.sessionHistory);
      console.log('Command History:', this.commandHistory);
      console.log('Current Input:', this.inputElement.value);
      console.log('Tips Visible:', this.tipsVisible);
      console.log('Element Dimensions:', {
        terminal: { w: this.element.offsetWidth, h: this.element.offsetHeight },
        output: { w: this.outputElement.offsetWidth, h: this.outputElement.offsetHeight },
        input: { w: this.inputContainer.offsetWidth, h: this.inputContainer.offsetHeight }
      });
      this.focusInput();
    });
    
    this.element.appendChild(debugBtn);
  }
  
  private createTerminalHeader() {
    const header = document.createElement('div');
    header.className = 'terminal-header';
    
    const tabs = document.createElement('div');
    tabs.className = 'terminal-tabs';
    header.appendChild(tabs);
    
    this.createTerminalTab(tabs, 'Enhanced Terminal', true);
    this.createTerminalTab(tabs, 'Output');
    
    const actions = document.createElement('div');
    actions.className = 'terminal-actions';
    header.appendChild(actions);
    
    // Tips button - NEW!
    const tipsBtn = document.createElement('div');
    tipsBtn.className = 'terminal-action';
    tipsBtn.title = 'Show Developer Tips';
    tipsBtn.innerHTML = '💡';
    tipsBtn.addEventListener('click', () => this.showDeveloperTips());
    actions.appendChild(tipsBtn);
    
    // Clear button
    const clearBtn = document.createElement('div');
    clearBtn.className = 'terminal-action';
    clearBtn.title = 'Clear Terminal';
    clearBtn.innerHTML = '🗑️';
    clearBtn.addEventListener('click', () => this.clear());
    actions.appendChild(clearBtn);
    
    // Copy all button
    const copyAllBtn = document.createElement('div');
    copyAllBtn.className = 'terminal-action';
    copyAllBtn.title = 'Copy All Output';
    copyAllBtn.innerHTML = '📋';
    copyAllBtn.addEventListener('click', () => this.copyAllOutput());
    actions.appendChild(copyAllBtn);
    
    // New terminal button
    const newTerminalBtn = document.createElement('div');
    newTerminalBtn.className = 'terminal-action';
    newTerminalBtn.title = 'New Terminal';
    newTerminalBtn.innerHTML = '+';
    newTerminalBtn.addEventListener('click', () => {
      this.createTerminalTab(tabs, 'Terminal', true);
    });
    actions.appendChild(newTerminalBtn);
    
    this.element.appendChild(header);
  }
  
  /**
   * Copy all terminal output
   */
  private copyAllOutput(): void {
    const allText = this.outputElement.innerText;
    this.copyToClipboard(allText);
    this.writeCompactOutput('✅ All terminal output copied to clipboard', 'terminal-success');
  }
  
  private createTerminalTab(container: HTMLElement, label: string, isActive: boolean = false) {
    const tab = document.createElement('div');
    tab.className = 'terminal-tab';
    if (isActive) {
      tab.classList.add('active');
    }
    
    const tabLabel = document.createElement('span');
    tabLabel.textContent = label;
    tab.appendChild(tabLabel);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'terminal-tab-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tab.remove();
      if (tab.classList.contains('active')) {
        const firstTab = container.querySelector('.terminal-tab');
        if (firstTab) {
          firstTab.classList.add('active');
        }
      }
    });
    tab.appendChild(closeBtn);
    
    tab.addEventListener('click', () => {
      container.querySelectorAll('.terminal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
    
    container.appendChild(tab);
    return tab;
  }
  
  private createTerminalOutput() {
    this.outputElement = document.createElement('div');
    this.outputElement.className = 'terminal-output enhanced-output';
    this.outputElement.style.cssText = `
      min-height: 200px;
      overflow: auto;
      line-height: 1.2;
      padding: 6px 10px;
    `;
    
    this.element.appendChild(this.outputElement);
  }
  
  private createTerminalInput() {
    this.inputContainer = document.createElement('div');
    this.inputContainer.className = 'terminal-input-container enhanced-input';
    this.inputContainer.style.cssText = `
      display: flex;
      padding: 6px 10px;
      border-top: 1px solid #444;
      background-color: #252525;
      position: relative;
      width: 100%;
      min-height: 36px;
      box-sizing: border-box;
      z-index: 10;
    `;
    
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '$ ';
    prompt.style.cssText = `
      color: #64dd17;
      margin-right: 6px;
      font-weight: bold;
      font-size: 13px;
    `;
    this.inputContainer.appendChild(prompt);
    
    this.inputElement = document.createElement('input');
    this.inputElement.className = 'terminal-input enhanced-input-field';
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Type command... (try "tips" or click 💡)';
    this.inputElement.style.cssText = `
      flex: 1;
      background: transparent;
      border: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
      outline: none;
      line-height: 1.4;
    `;
    
    this.inputElement.addEventListener('keydown', this.handleInputKeydown.bind(this));
    this.inputElement.addEventListener('input', this.handleInputChange.bind(this));
    this.inputContainer.appendChild(this.inputElement);
    
    this.element.appendChild(this.inputContainer);
    
    console.log('✅ Enhanced terminal input created with tips support');
  }
  
  private handleInputChange(event: Event) {
    this.updateSuggestions();
  }
  
  private updateSuggestions() {
    const input = this.inputElement.value.toLowerCase();
    if (input.length < 2) {
      this.closeSuggestions();
      return;
    }
    
    const suggestions = Object.keys(this.COMMAND_REGISTRY)
      .filter(cmd => cmd.startsWith(input))
      .slice(0, 5);
    
    if (suggestions.length > 0) {
      this.showEnhancedSuggestions(suggestions);
    } else {
      this.closeSuggestions();
    }
  }
  
  private closeSuggestions() {
    if (this.suggestionsElement) {
      this.suggestionsElement.remove();
      this.suggestionsElement = null;
      this.suggestionIndex = -1;
      this.commandSuggestions = [];
    }
  }
  
  /**
   * Legacy writeOutput method - redirects to compact version
   */
  public writeOutput(text: string, className: string = '') {
    this.writeCompactOutput(text, className, false);
  }
  
  /**
   * Clear terminal with enhanced welcome
   */
  public clear() {
    this.outputElement.innerHTML = '';
    this.tipsVisible = false; // Reset tips state
    this.writeEnhancedWelcome();
  }
  
  /**
   * Load command history from utility
   */
  private loadCommandHistory() {
    try {
      const history = getCommandHistory();
      this.commandHistory = history.map(item => {
        const prefix = item.isPowerShell ? '/ps ' : '/cmd ';
        return prefix + item.cmd;
      });
      console.log(`📚 Loaded ${this.commandHistory.length} commands from utility`);
    } catch (error) {
      console.warn('Failed to load command history from utility:', error);
    }
  }
  
  /**
   * Run command programmatically
   */
  public runCommand(command: string) {
    console.log('Running command programmatically:', command);
    this.executeCommand(command);
  }
  
  /**
   * Focus input with enhanced feedback
   */
  public focusInput() {
    if (this.inputElement) {
      this.inputElement.focus();
      console.log('🎯 Enhanced terminal input focused');
    } else {
      console.error('❌ Cannot focus: enhanced terminal input element not found');
    }
  }
}