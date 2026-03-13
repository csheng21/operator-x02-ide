// src/ide/terminal.ts - Windows CMD Style Terminal
import { invoke } from '@tauri-apps/api/core';
import { saveToCommandHistory, getCommandHistory, loadCommandHistory } from '../utils/commandHistory';
import { formatCommandOutput } from '../utils/commandFormatting';
import { getSystemInfo, getUserDisplayName, formatPath } from '../utils/systemInfo';
//import { initializeTerminalToggle } from './terminal/terminalToggle';
// Quick Fix is now integrated inline at the end of this file
// import { attachQuickFixToTerminal, getQuickFixUI, initializeQuickFix } from './terminal/quickFixIntegration';
// ============================================================================
// ANSI ESCAPE CODE PARSER - Converts ANSI codes to HTML/CSS
// ============================================================================

interface AnsiStyle {
  color?: string;
  background?: string;
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
}

// ANSI Color mapping (Windows Terminal colors)
const ANSI_COLORS: { [key: number]: string } = {
  30: '#0C0C0C', // Black
  31: '#C50F1F', // Red
  32: '#13A10E', // Green
  33: '#C19C00', // Yellow
  34: '#0037DA', // Blue
  35: '#881798', // Magenta
  36: '#3A96DD', // Cyan
  37: '#CCCCCC', // White
  90: '#767676', // Bright Black
  91: '#E74856', // Bright Red
  92: '#16C60C', // Bright Green
  93: '#F9F1A5', // Bright Yellow
  94: '#3B78FF', // Bright Blue
  95: '#B4009E', // Bright Magenta
  96: '#61D6D6', // Bright Cyan
  97: '#F2F2F2', // Bright White
};

const ANSI_BG_COLORS: { [key: number]: string } = {
  40: '#0C0C0C',
  41: '#C50F1F',
  42: '#13A10E',
  43: '#C19C00',
  44: '#0037DA',
  45: '#881798',
  46: '#3A96DD',
  47: '#CCCCCC',
  100: '#767676',
  101: '#E74856',
  102: '#16C60C',
  103: '#F9F1A5',
  104: '#3B78FF',
  105: '#B4009E',
  106: '#61D6D6',
  107: '#F2F2F2',
};

/**
 * Parse ANSI escape codes and convert to HTML with inline styles
 */
function parseAnsiToHtml(text: string): string {
  // Regular expression to match ANSI escape sequences
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  
  let result = '';
  let lastIndex = 0;
  let currentStyle: AnsiStyle = {};
  let match;
  
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const textSegment = text.substring(lastIndex, match.index);
      result += applyStyle(escapeHtmlChars(textSegment), currentStyle);
    }
    
    // Parse the escape codes
    const codes = match[1].split(';').map(c => parseInt(c) || 0);
    
    for (const code of codes) {
      if (code === 0) {
        // Reset all styles
        currentStyle = {};
      } else if (code === 1) {
        currentStyle.bold = true;
      } else if (code === 3) {
        currentStyle.italic = true;
      } else if (code === 4) {
        currentStyle.underline = true;
      } else if (code >= 30 && code <= 37 || code >= 90 && code <= 97) {
        currentStyle.color = ANSI_COLORS[code];
      } else if (code >= 40 && code <= 47 || code >= 100 && code <= 107) {
        currentStyle.background = ANSI_BG_COLORS[code];
      } else if (code === 39) {
        delete currentStyle.color; // Default foreground
      } else if (code === 49) {
        delete currentStyle.background; // Default background
      }
    }
    
    lastIndex = ansiRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    result += applyStyle(escapeHtmlChars(text.substring(lastIndex)), currentStyle);
  }
  
  return result || escapeHtmlChars(text);
}

/**
 * Strip all ANSI codes (for plain text output)
 */
function stripAnsiCodes(text: string): string {
  // Match various ANSI escape sequences
  return text
    .replace(/\x1b\[[0-9;]*m/g, '')  // SGR (color/style)
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')  // Other escape sequences
    .replace(/\[([0-9;]*)m/g, '')  // Malformed codes without ESC
    .replace(/\u001b/g, '');  // Raw escape characters
}

/**
 * Apply CSS styles to text
 */
function applyStyle(text: string, style: AnsiStyle): string {
  if (Object.keys(style).length === 0) {
    return text;
  }
  
  let css = '';
  if (style.color) css += `color:${style.color};`;
  if (style.background) css += `background-color:${style.background};`;
  if (style.bold) css += 'font-weight:bold;';
  if (style.italic) css += 'font-style:italic;';
  if (style.underline) css += 'text-decoration:underline;';
  
  return `<span style="${css}">${text}</span>`;
}

/**
 * Escape HTML entities
 */
function escapeHtmlChars(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Current working directory for prompt
let currentWorkingDir = 'C:\\Users\\User';

// Track if terminal has been initialized to prevent duplicate initialization
let terminalInitialized = false;
// Initialize terminal
export async function initializeTerminal(): Promise<void> {
  // Prevent multiple initializations
  if (terminalInitialized) {
    console.log('Terminal already initialized, skipping');
    return;
  }
  
  console.log('Initializing terminal module');
  terminalInitialized = true;
  
  // Initialize command history
  try {
    loadCommandHistory();
  } catch (e) {
    console.warn('Failed to load command history:', e);
  }
  
  // Set up terminal integration
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await setupCommandInput();
      // Initialize terminal toggle after terminal is set up
      setTimeout(() => {
       // initializeTerminalToggle();
      }, 200);
    });
  } else {
    await setupCommandInput();
    // Initialize terminal toggle after terminal is set up
    setTimeout(() => {
      //initializeTerminalToggle();
    }, 200);
  }
}

// Set up command input system
async function setupCommandInput(): Promise<void> {
  // First, find the command input
  console.log('Setting up command input system');
  
  // First check if we already have an initialized terminal
  const existingOutput = document.getElementById('terminal-output');
  if (existingOutput) {
    // Terminal output already exists, just ensure welcome message isn't duplicated
    console.log('Terminal output already exists');
    const welcomeMessages = existingOutput.querySelectorAll('.terminal-info');
    if (welcomeMessages.length > 1) {
      // Remove all but the first welcome message
      for (let i = 1; i < welcomeMessages.length; i++) {
        if (welcomeMessages[i].textContent?.includes('Terminal ready')) {
          welcomeMessages[i].remove();
        }
      }
    }
    return;
  }
  
  // Check for terminal in existing UI
  const terminalPanel = document.querySelector('.terminal-panel');
  if (terminalPanel) {
    console.log('Using existing terminal panel');
    // Set up terminal in the existing panel
    await setupExistingTerminalPanel(terminalPanel);
    return;
  }
  
  // Create new standalone terminal if none exists
  console.log('Creating new terminal');
  await createStandaloneTerminal();
}
// Quick Fix styles auto-inject on load
// Set up terminal in the existing IDE UI - CMD Style
async function setupExistingTerminalPanel(panel: Element): Promise<void> {
  // Clear any existing content first
  panel.innerHTML = '';
  
  // Get current working directory
  try {
    const dir = await invoke('get_current_dir') as string;
    if (dir) currentWorkingDir = dir;
  } catch (e) {
    // Use default
  }
  
  // Create a terminal container with CMD styling
  const terminalContainer = document.createElement('div');
  terminalContainer.className = 'terminal-container';
  terminalContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: relative;
    background-color: #0C0C0C;
    font-family: 'Consolas', 'Lucida Console', monospace;
  `;
  
  // Create terminal header - Windows title bar style
  const terminalHeader = document.createElement('div');
  terminalHeader.className = 'terminal-header';
  terminalHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 8px;
    background: linear-gradient(180deg, #000080 0%, #1084d0 100%);
    flex-shrink: 0;
    height: 24px;
    min-height: 24px;
    max-height: 24px;
    box-sizing: border-box;
  `;

  // Create terminal title - CMD style
  const terminalTitle = document.createElement('span');
  terminalTitle.className = 'terminal-title';
  terminalTitle.textContent = 'Command Prompt';
  terminalTitle.style.cssText = `
    font-size: 12px;
    font-weight: normal;
    color: #FFFFFF;
    user-select: none;
    font-family: 'Segoe UI', Tahoma, sans-serif;
  `;

  // Create header buttons container
  const headerButtons = document.createElement('div');
  headerButtons.style.cssText = `display: flex; gap: 2px;`;
  
  // Button style
  const btnStyle = `
    width: 20px; height: 20px;
    background: #C0C0C0;
    border: 1px outset #FFFFFF;
    color: #000000;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Minimize button
  const minimizeBtn = document.createElement('button');
  minimizeBtn.innerHTML = '−';
  minimizeBtn.title = 'Minimize';
  minimizeBtn.className = 'terminal-action';
  minimizeBtn.dataset.action = 'minimize';
  minimizeBtn.style.cssText = btnStyle;
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Minimize to files tab
    const filesTab = document.querySelector('.explorer-tab[data-tab="files"]') as HTMLElement;
    const terminalContent = document.getElementById('terminal-content');
    const filesContent = document.getElementById('files-content');
    if (filesTab && terminalContent && filesContent) {
      document.querySelector('.explorer-tab.active')?.classList.remove('active');
      filesTab.classList.add('active');
      terminalContent.style.display = 'none';
      filesContent.style.display = 'block';
    }
  });
  
  // Maximize button
  const maximizeBtn = document.createElement('button');
  maximizeBtn.innerHTML = '□';
  maximizeBtn.title = 'Maximize';
  maximizeBtn.className = 'terminal-action';
  maximizeBtn.dataset.action = 'maximize';
  maximizeBtn.style.cssText = btnStyle;
  maximizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const terminalContainer = panel.querySelector('.terminal-container') as HTMLElement;
    if (terminalContainer) {
      if (terminalContainer.classList.contains('maximized')) {
        terminalContainer.classList.remove('maximized');
        terminalContainer.style.position = '';
        terminalContainer.style.top = '';
        terminalContainer.style.left = '';
        terminalContainer.style.right = '';
        terminalContainer.style.bottom = '';
        terminalContainer.style.zIndex = '';
      } else {
        terminalContainer.classList.add('maximized');
        terminalContainer.style.position = 'fixed';
        terminalContainer.style.top = '0';
        terminalContainer.style.left = '0';
        terminalContainer.style.right = '0';
        terminalContainer.style.bottom = '0';
        terminalContainer.style.zIndex = '10000';
      }
    }
  });
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.title = 'Close';
  closeBtn.className = 'terminal-action';
  closeBtn.dataset.action = 'close';
  closeBtn.style.cssText = btnStyle;
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Switch to files tab
    const filesTab = document.querySelector('.explorer-tab[data-tab="files"]') as HTMLElement;
    const terminalTab = document.querySelector('.explorer-tab[data-tab="terminal"]') as HTMLElement;
    const filesContent = document.getElementById('files-content');
    const terminalContent = document.getElementById('terminal-content');
    
    if (filesTab && terminalTab && filesContent && terminalContent) {
      terminalTab.classList.remove('active');
      filesTab.classList.add('active');
      terminalContent.style.display = 'none';
      filesContent.style.display = 'block';
    }
  });
  
  headerButtons.appendChild(minimizeBtn);
  headerButtons.appendChild(maximizeBtn);
  headerButtons.appendChild(closeBtn);

  // Assemble header
  terminalHeader.appendChild(terminalTitle);
  terminalHeader.appendChild(headerButtons);

  // Make terminal resizable
  makeTerminalResizable(terminalContainer);
  
  // Create output container with CMD styling
  const outputContainer = document.createElement('div');
  outputContainer.id = 'terminal-output';
  outputContainer.className = 'terminal-output';
  outputContainer.style.cssText = `
    flex: 1;
    overflow: auto;
    padding: 8px;
    color: #CCCCCC;
    font-family: 'Consolas', 'Lucida Console', monospace;
    font-size: 12px;
    line-height: 1.2;
    background-color: #0C0C0C;
  `;
  
  // Create input container - CMD style
  const inputContainer = document.createElement('div');
  inputContainer.className = 'terminal-input-container';
  inputContainer.style.cssText = `
    display: flex;
    align-items: center;
    padding: 0 8px 8px 8px;
    background-color: #0C0C0C;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    min-height: 20px;
  `;
  
  // Create CMD prompt - shows current directory
  const cmdIndicator = document.createElement('span');
  cmdIndicator.className = 'cmd-indicator';
  cmdIndicator.textContent = `${currentWorkingDir}>`;
  cmdIndicator.style.cssText = `
    color: #CCCCCC;
    font-family: 'Consolas', 'Lucida Console', monospace;
    font-size: 14px;
    white-space: nowrap;
    user-select: none;
  `;
  
  // Create input element - CMD style
  const inputElement = document.createElement('input');
  inputElement.type = 'text';
  inputElement.className = 'terminal-input';
  inputElement.placeholder = '';
  inputElement.style.cssText = `
    flex: 1;
    background-color: transparent;
    border: none;
    outline: none;
    color: #CCCCCC;
    font-family: 'Consolas', 'Lucida Console', monospace;
    font-size: 14px;
    caret-color: #CCCCCC;
    padding: 0;
    margin: 0;
  `;
  inputElement.dataset.shell = 'cmd';
  
  // Assemble the terminal panel
  inputContainer.appendChild(cmdIndicator);
  inputContainer.appendChild(inputElement);
  
  terminalContainer.appendChild(terminalHeader);
  terminalContainer.appendChild(outputContainer);
  terminalContainer.appendChild(inputContainer);
  panel.appendChild(terminalContainer);
  
  // Set up input handlers
  setupInputHandlers(inputElement as any, outputContainer);
  
  // Focus the input
  inputElement.focus();
  
  // Show CMD-style welcome message
  showCmdWelcome(outputContainer);
  
  // Update prompt after commands
  (window as any).__updateCmdPrompt = (newDir: string) => {
    currentWorkingDir = newDir;
    cmdIndicator.textContent = `${newDir}>`;
  };
}

// Create a standalone terminal - optimized version
async function createStandaloneTerminal(): Promise<void> {
  // Check if terminal container already exists
  if (document.querySelector('.terminal-container')) {
    console.log('Terminal container already exists');
    return;
  }
  
  // Create container for terminal at the bottom
  const terminalContainer = document.createElement('div');
  terminalContainer.className = 'terminal-container';
  terminalContainer.style.position = 'absolute';
  terminalContainer.style.bottom = '40px';
  terminalContainer.style.left = '10%';
  terminalContainer.style.right = '10%';
  terminalContainer.style.width = '80%';
  terminalContainer.style.backgroundColor = '#1e1e1e';
  terminalContainer.style.border = '1px solid #555';
  terminalContainer.style.borderRadius = '4px';
  terminalContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  terminalContainer.style.display = 'flex';
  terminalContainer.style.flexDirection = 'column';
  terminalContainer.style.height = '200px';
  terminalContainer.style.zIndex = '5';
  terminalContainer.style.overflow = 'hidden';
  
  // Make terminal resizable
  makeTerminalResizable(terminalContainer);
  
  // Create output container
  const outputContainer = document.createElement('div');
  outputContainer.id = 'terminal-output';
  outputContainer.className = 'terminal-output';
  outputContainer.style.flex = '1';
  outputContainer.style.overflow = 'auto';
  outputContainer.style.padding = '4px 8px'; // Compact padding
  outputContainer.style.color = '#e1e1e1';
  outputContainer.style.fontFamily = 'Consolas, monospace';
  outputContainer.style.fontSize = '12px'; // Compact font
  outputContainer.style.lineHeight = '1.1'; // Tight line height
  outputContainer.style.maxHeight = 'calc(100% - 28px)'; // Leave room for input
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'terminal-input-container';
  inputContainer.style.display = 'flex';
  inputContainer.style.alignItems = 'center';
  inputContainer.style.padding = '4px 8px'; // Compact padding
  inputContainer.style.borderTop = '1px solid #333';
  inputContainer.style.backgroundColor = '#1a1a1a';
  inputContainer.style.position = 'absolute';
  inputContainer.style.bottom = '0';
  inputContainer.style.left = '0';
  inputContainer.style.right = '0';
  inputContainer.style.height = '28px'; // Compact height
  inputContainer.style.minHeight = '28px';
  inputContainer.style.zIndex = '1000';
  
  // Create close button
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px'; 
  closeButton.style.right = '10px';
  closeButton.style.color = '#999';
  closeButton.style.fontSize = '16px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.zIndex = '1001';
  closeButton.title = 'Close Terminal';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(terminalContainer);
  });
  
  // Create shell indicator
  const cmdIndicator = document.createElement('span');
  cmdIndicator.className = 'cmd-indicator';
  cmdIndicator.textContent = '>';
  cmdIndicator.style.color = '#569cd6';
  cmdIndicator.style.marginRight = '6px'; // Compact margin
  cmdIndicator.style.fontSize = '11px'; // Compact font
  cmdIndicator.style.cursor = 'pointer';
  cmdIndicator.title = 'Click to toggle between CMD and PowerShell';
  
  // Create textarea input
  const inputElement = document.createElement('textarea');
  inputElement.className = 'terminal-input';
  inputElement.placeholder = 'Type commands here...';
  inputElement.style.flex = '1';
  inputElement.style.backgroundColor = 'transparent';
  inputElement.style.border = 'none';
  inputElement.style.outline = 'none';
  inputElement.style.color = '#e1e1e1';
  inputElement.style.fontFamily = 'Consolas, monospace';
  inputElement.style.fontSize = '12px'; // Compact font
  inputElement.style.resize = 'none';
  inputElement.style.overflow = 'hidden';
  inputElement.style.height = '18px'; // Compact height
  inputElement.style.lineHeight = '1.1'; // Tight line height
  inputElement.dataset.shell = 'cmd';
  
  // Auto-resize textarea as user types
  inputElement.addEventListener('input', () => {
    inputElement.style.height = 'auto';
    inputElement.style.height = `${Math.min(18, inputElement.scrollHeight)}px`;
  });
  
  // Assemble the terminal
  inputContainer.appendChild(cmdIndicator);
  inputContainer.appendChild(inputElement);
  
  terminalContainer.appendChild(outputContainer);
  terminalContainer.appendChild(inputContainer);
  terminalContainer.appendChild(closeButton);
  
  // Add to document
  document.body.appendChild(terminalContainer);
  
  // Set up the command shell toggle
  cmdIndicator.addEventListener('click', () => {
    const isCmd = inputElement.dataset.shell === 'cmd';
    inputElement.dataset.shell = isCmd ? 'powershell' : 'cmd';
    cmdIndicator.textContent = isCmd ? 'PS>' : '>';
    inputElement.focus();
  });
  
  // Set up input handlers
  setupInputHandlers(inputElement, outputContainer);
  
  // Make the terminal draggable
  makeElementDraggable(terminalContainer);
  
  // Focus the input
  inputElement.focus();
  
  // Show welcome message with system info
  await showSystemInfoWelcome(outputContainer);
}

// Make an element draggable
function makeElementDraggable(element: HTMLElement): void {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let isDragging = false;
  
  // Create a drag handle that spans the top area
  const dragHandle = document.createElement('div');
  dragHandle.className = 'terminal-drag-handle';
  dragHandle.style.position = 'absolute';
  dragHandle.style.top = '0';
  dragHandle.style.left = '0';
  dragHandle.style.right = '0';
  dragHandle.style.height = '20px';
  dragHandle.style.cursor = 'move';
  dragHandle.style.zIndex = '10';
  
  element.appendChild(dragHandle);
  
  dragHandle.addEventListener('mousedown', dragMouseDown);
  
  function dragMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }
  
  function elementDrag(e: MouseEvent) {
    if (!isDragging) return;
    
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }
  
  function closeDragElement() {
    isDragging = false;
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
  }
}

// Make the terminal resizable with custom handles
function makeTerminalResizable(element: HTMLElement): void {
  console.log('Terminal resize functionality initiated');
  // Add a small indicator in the bottom-right corner
  const resizeIndicator = document.createElement('div');
  resizeIndicator.className = 'resize-indicator';
  resizeIndicator.innerHTML = '⋱';
  resizeIndicator.style.position = 'absolute';
  resizeIndicator.style.bottom = '2px';
  resizeIndicator.style.right = '4px';
  resizeIndicator.style.fontSize = '12px';
  resizeIndicator.style.color = '#666';
  resizeIndicator.style.pointerEvents = 'none'; // Don't block clicks
  
  element.appendChild(resizeIndicator);
  
  // Simple resize functionality can be expanded later if needed
}



// Set up input handlers for command input
function setupInputHandlers(inputElement: HTMLTextAreaElement | HTMLInputElement, outputContainer: HTMLElement): void {
  console.log('Setting up input handlers');
  
  // Handle command history navigation
  let historyIndex = -1;
  const commandHistory = getCommandHistory();
  
  // Handle key events for command input
  inputElement.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Execute command when Enter is pressed
      e.preventDefault();
      
      const command = inputElement.value.trim();
      
      if (command) {
        const isPowerShell = inputElement.dataset.shell === 'powershell';
        
        // Clear input for next command
        inputElement.value = '';
        historyIndex = -1;
        
        // Show command in output with CMD-style prompt
        const prompt = isPowerShell ? `PS ${currentWorkingDir}>` : `${currentWorkingDir}>`;
        addOutputLine(outputContainer, `${prompt}${command}`, 'command');
        
        // Handle special commands
        if (command.toLowerCase() === 'cls' || command === '/clear') {
          // Clear screen - CMD style
          outputContainer.innerHTML = '';
        } else if (command.toLowerCase() === 'help' || command === '/help') {
          // Help command
          showCmdHelp(outputContainer);
        } else if (command.toLowerCase() === '/tips' || command.toLowerCase() === 'tips') {
          showTipsText(outputContainer);
        } else if (command.toLowerCase() === '/sysinfo' || command.toLowerCase() === 'sysinfo') {
          // System info command
          try {
            const sysInfo = await getSystemInfo();
            const infoOutput = `System Information:
OS: ${sysInfo.os_name} ${sysInfo.os_version || ''}
Username: ${sysInfo.username}
Computer Name: ${sysInfo.computer_name || sysInfo.hostname || 'unknown'}
Home Directory: ${sysInfo.home_dir}
Documents: ${sysInfo.documents_dir}
Downloads: ${sysInfo.downloads_dir || 'Not available'}`;
            addOutputLine(outputContainer, infoOutput, 'output');
          } catch (error) {
            addOutputLine(outputContainer, `Error: Failed to get system info - ${error}`, 'error');
          }
        } else if (command === '/userinfo' || command === 'userinfo') {
          // User info command
          try {
            const sysInfo = await getSystemInfo();
            const infoOutput = `User Information:
Username: ${sysInfo.username}
Home Directory: ${sysInfo.home_dir}`;
            addOutputLine(outputContainer, infoOutput, 'output');
          } catch (error) {
            addOutputLine(outputContainer, `Error: Failed to get user info - ${error}`, 'error');
          }
        } else if (command === '/paths' || command === 'paths') {
          // Paths command
          try {
            const sysInfo = await getSystemInfo();
            const infoOutput = `System Paths:
Home: ${sysInfo.home_dir}
Documents: ${sysInfo.documents_dir}
Downloads: ${sysInfo.downloads_dir || 'Not available'}
App Data: ${sysInfo.app_data_dir || 'Not available'}
Temp: ${sysInfo.temp_dir || 'Not available'}`;
            addOutputLine(outputContainer, infoOutput, 'output');
          } catch (error) {
            addOutputLine(outputContainer, `Error: Failed to get path info - ${error}`, 'error');
          }
        } else if (command.toLowerCase() === 'testerror') {
          addOutputLine(outputContainer, "npm ERR! 404 Not Found\nCannot find module 'lodash'", 'error');
        } else {
          // Save to history
          saveToCommandHistory(command, isPowerShell);
          
          try {
            // Execute the command - don't block UI
            executeCommand(command, isPowerShell)
              .then(result => {
                // Display result
                if (result && result.trim()) {
                  addOutputLine(outputContainer, result, 'output');
                }
                
                // Scroll to bottom to show new output
                outputContainer.scrollTop = outputContainer.scrollHeight;
                
                // Make sure input container remains visible and focused
                ensureInputVisibility(inputElement);
              })
              .catch(error => {
                // Show error
                const errorMessage = error instanceof Error 
                  ? error.message 
                  : String(error);
                
                addOutputLine(outputContainer, `Error: ${errorMessage}`, 'error');
                
                // Make sure input container remains visible and focused
                ensureInputVisibility(inputElement);
              });
          } catch (error) {
            // Show error
            const errorMessage = error instanceof Error 
              ? error.message 
              : String(error);
            
            addOutputLine(outputContainer, `Error: ${errorMessage}`, 'error');
            
            // Make sure input container remains visible and focused
            ensureInputVisibility(inputElement);
          }
        }
        
        // Focus back on input to continue typing
        ensureInputVisibility(inputElement);
      }
    } else if (e.key === 'ArrowUp') {
      // Navigate backwards through history
      if (commandHistory.length > 0) {
        e.preventDefault();
        historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        inputElement.value = commandHistory[historyIndex].cmd;
        
        // Move cursor to end
        setTimeout(() => {
          if (inputElement instanceof HTMLInputElement) {
            inputElement.selectionStart = inputElement.value.length;
            inputElement.selectionEnd = inputElement.value.length;
          } else if (inputElement instanceof HTMLTextAreaElement) {
            inputElement.selectionStart = inputElement.value.length;
            inputElement.selectionEnd = inputElement.value.length;
          }
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      // Navigate forwards through history
      if (historyIndex >= 0) {
        e.preventDefault();
        historyIndex--;
        
        if (historyIndex >= 0) {
          inputElement.value = commandHistory[historyIndex].cmd;
        } else {
          inputElement.value = '';
        }
        
        // Move cursor to end
        setTimeout(() => {
          if (inputElement instanceof HTMLInputElement) {
            inputElement.selectionStart = inputElement.value.length;
            inputElement.selectionEnd = inputElement.value.length;
          } else if (inputElement instanceof HTMLTextAreaElement) {
            inputElement.selectionStart = inputElement.value.length;
            inputElement.selectionEnd = inputElement.value.length;
          }
        }, 0);
      }
    }
  });
  
  // Add click handler to focus input when clicking anywhere in terminal output
  outputContainer.addEventListener('click', () => {
    ensureInputVisibility(inputElement);
  });
}

// Helper function to ensure input visibility and focus
function ensureInputVisibility(inputElement: HTMLElement): void {
  // Make sure the container is visible
  const container = inputElement.closest('.terminal-input-container');
  if (container instanceof HTMLElement) {
    // Force container to be visible
    container.style.display = 'flex';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.zIndex = '1000';
    
    // Ensure it's positioned at the bottom
    container.style.position = 'absolute';
    container.style.bottom = '0';
    container.style.left = '0';
    container.style.right = '0';
  }
  
  // Scroll the terminal output to the bottom
  const outputContainer = document.getElementById('terminal-output');
  if (outputContainer) {
    outputContainer.scrollTop = outputContainer.scrollHeight;
  }
  
  // Focus the input after a small delay
  setTimeout(() => {
    inputElement.focus();
  }, 0);
}



// Execute command with system info integration
async function executeCommand(command: string, isPowerShell: boolean): Promise<string> {
  console.log(`Executing ${isPowerShell ? 'PowerShell' : 'CMD'} command:`, command);
  
  // Handle special internal commands
  if (command === '/sysinfo' || command === 'sysinfo') {
    const sysInfo = await getSystemInfo();
    return `System Information:
OS: ${sysInfo.os_name} ${sysInfo.os_version || ''}
Username: ${sysInfo.username}
Hostname: ${sysInfo.hostname || 'unknown'}
Home Directory: ${sysInfo.home_dir}`;
  }
  
  if (command === '/userinfo' || command === 'userinfo') {
    const sysInfo = await getSystemInfo();
    return `User Information:
Username: ${sysInfo.username}
Home Directory: ${sysInfo.home_dir}`;
  }
  
  if (command === '/paths' || command === 'paths') {
    const sysInfo = await getSystemInfo();
    return `System Paths:
Home: ${sysInfo.home_dir}
Documents: ${sysInfo.documents_dir}
Downloads: ${sysInfo.downloads_dir}
App Data: ${sysInfo.app_data_dir}
Temp: ${sysInfo.temp_dir}
Executable: ${sysInfo.exe_dir || 'unknown'}`;
  }
  
  try {
    // Try to use Tauri's invoke mechanism
    return await invoke('execute_command', {
      command,
      isPowershell: isPowerShell
    }) as string;
  } catch (e) {
    console.warn('Falling back to mock execution:', e);
    
    // Mock implementation for testing
    if (isPowerShell) {
      return mockPowerShellExecution(command);
    } else {
      return mockCmdExecution(command);
    }
  }
}

// Mock CMD execution (fallback if Tauri invoke fails)
function mockCmdExecution(command: string): string {
  if (command.startsWith('echo ')) {
    return command.substring(5);
  }
  
  if (command === 'dir') {
    return ` Volume in drive C has no label.
 Volume Serial Number is 1234-5678

 Directory of C:\\Users\\Username

05/01/2023  10:15 AM    <DIR>          .
05/01/2023  10:15 AM    <DIR>          ..
05/01/2023  10:15 AM    <DIR>          Desktop
05/01/2023  10:15 AM    <DIR>          Documents
05/01/2023  10:15 AM    <DIR>          Downloads
05/01/2023  10:15 AM    <DIR>          Pictures
               0 File(s)              0 bytes
               6 Dir(s)  100,000,000,000 bytes free`;
  }
  
  if (command === 'ipconfig') {
    return `Windows IP Configuration

Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : example.com
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`;
  }
  
  if (command === 'ver') {
    return `Microsoft Windows [Version 10.0.19044.2728]`;
  }
  
  if (command === 'help') {
    return `For more information on a specific command, type HELP command-name

ASSOC          Displays or modifies file extension associations.
ATTRIB         Displays or changes file attributes.
BREAK          Sets or clears extended CTRL+C checking.
BCDEDIT        Sets properties in boot database to control boot loading.
CACLS          Displays or modifies access control lists (ACLs) of files.
CALL           Calls one batch program from another.
CD             Displays the name of or changes the current directory.
CHCP           Displays or sets the active code page number.
CHDIR          Displays the name of or changes the current directory.
CHKDSK         Checks a disk and displays a status report.`;
  }
  
  return `Command executed: ${command} (mock mode)`;
}

// Mock PowerShell execution (fallback if Tauri invoke fails)
function mockPowerShellExecution(command: string): string {
  if (command.startsWith('Get-Process')) {
    return `Handles  NPM(K)    PM(K)     WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----     -----     ------     --  -- -----------
   1244      51    27936     82768      25.20   9468   1 chrome
    168      12     2308      9760       0.09   2916   1 cmd
    264      18    20636     38196      15.77  12452   1 Code
    154      15     3576     13088       0.58  14744   1 explorer`;
  }
  
  if (command === 'Get-Date') {
    return `Thursday, May 1, 2025 3:30:45 PM`;
  }
  
  if (command === 'Get-ChildItem') {
    return `    Directory: C:\\Users\\Username

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d----          5/1/2025  10:15 AM                Desktop
d----          5/1/2025  10:15 AM                Documents
d----          5/1/2025  10:15 AM                Downloads
d----          5/1/2025  10:15 AM                Pictures`;
  }
  
  return `Command executed: ${command} (mock mode)`;
}


async function showSystemInfoWelcome(outputContainer: HTMLElement): Promise<void> {
  // Minimal single-line ready message
  addOutputLine(outputContainer, '$ Ready', 'info');
}

// CMD-style help text
function showCmdHelp(outputContainer: HTMLElement): void {
  const helpText = `For more information on a specific command, type HELP command-name
ASSOC          Displays or modifies file extension associations.
ATTRIB         Displays or changes file attributes.
CD             Displays the name of or changes the current directory.
CLS            Clears the screen.
COPY           Copies one or more files to another location.
DEL            Deletes one or more files.
DIR            Displays a list of files and subdirectories in a directory.
ECHO           Displays messages, or turns command echoing on or off.
EXIT           Quits the CMD.EXE program.
FIND           Searches for a text string in a file or files.
MD             Creates a directory.
MKDIR          Creates a directory.
MOVE           Moves one or more files from one directory to another.
PATH           Displays or sets a search path for executable files.
RD             Removes a directory.
REN            Renames a file or files.
RMDIR          Removes a directory.
SET            Displays, sets, or removes environment variables.
START          Starts a separate window to run a specified program.
TITLE          Sets the window title for a CMD.EXE session.
TYPE           Displays the contents of a text file.
VER            Displays the Windows version.`;
  
  addOutputLine(outputContainer, helpText, 'output');
}

// Replace your showHelpText function with this compact version
function showHelpText(outputContainer: HTMLElement): void {
  showCmdHelp(outputContainer);
}

// Replace your showTipsText function with this compact version
function showTipsText(outputContainer: HTMLElement): void {
  const tipsText = `Quick Commands:
dir|cd|pwd|mkdir|echo|type|ipconfig|ping|cls|ver|help`;
  
  addOutputLine(outputContainer, tipsText, 'output');
}

// ============================================================================
// CMD-STYLE OUTPUT - Windows Command Prompt look
// ============================================================================

/**
 * Add output line with ANSI parsing and CMD styling
 */
function addOutputLine(outputContainer: HTMLElement, content: string, type: 'command' | 'output' | 'error' | 'info'): void {
  const line = document.createElement('div');
  line.className = `terminal-${type} cmd-line`;
  
  // CMD-style styling
  const baseStyle = `
    font-family: 'Consolas', 'Lucida Console', monospace;
    font-size: 14px;
    line-height: 1.3;
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  `;
  
  switch (type) {
    case 'command':
      line.style.cssText = baseStyle + `color: #CCCCCC;`;
      break;
    case 'output':
      line.style.cssText = baseStyle + `color: #CCCCCC;`;
      break;
    case 'error':
      line.style.cssText = baseStyle + `color: #FF6B6B;`;
      break;
    case 'info':
      line.style.cssText = baseStyle + `color: #CCCCCC;`;
      break;
  }
  
  // Parse ANSI codes and set content
  const parsedContent = parseAnsiToHtml(content);
  
  // Check if content has ANSI codes (will have <span> tags after parsing)
  if (parsedContent.includes('<span')) {
    line.innerHTML = parsedContent;
  } else {
    // Plain text - also strip any malformed ANSI codes
    line.textContent = stripAnsiCodes(content);
  }
  
  outputContainer.appendChild(line);
  outputContainer.scrollTop = outputContainer.scrollHeight;
  if (type === 'error') {
  triggerQuickFix(content, line, outputContainer);
}
}

/**
 * Show CMD-style welcome message
 */
function showCmdWelcome(outputContainer: HTMLElement): void {
  const welcomeLines = [
    'Microsoft Windows [Version 10.0.19045.3803]',
    '(c) Microsoft Corporation. All rights reserved.',
    '',
  ];
  
  welcomeLines.forEach(line => {
    addOutputLine(outputContainer, line, 'info');
  });
}

/**
 * Get CMD-style prompt
 */
function getCmdPrompt(): string {
  return `${currentWorkingDir}>`;
}

/**
 * Update current working directory from command output
 */
function updateWorkingDir(output: string, command: string): void {
  // Try to detect cd command results
  if (command.toLowerCase().startsWith('cd ') || command.toLowerCase() === 'cd') {
    // Look for path patterns in output or extract from command
    const cdPath = command.substring(3).trim();
    if (cdPath && !cdPath.startsWith('/') && cdPath !== '..') {
      // Simple path - might be relative
      if (cdPath.includes(':')) {
        currentWorkingDir = cdPath;
      }
    }
  }
  
  // Try to get actual working directory
  try {
    invoke('get_current_dir').then((dir: unknown) => {
      if (typeof dir === 'string' && dir) {
        currentWorkingDir = dir;
      }
    }).catch(() => {});
  } catch (e) {
    // Ignore errors
  }
}

// CSS styles for Windows CMD-style terminal
export function applyTerminalCSSFixes(): void {
  // Remove existing terminal styles
  const existingStyle = document.getElementById('cmd-terminal-styles');
  if (existingStyle) existingStyle.remove();
  
  const style = document.createElement('style');
  style.id = 'cmd-terminal-styles';
  style.textContent = `
    /* ============================================================================
       WINDOWS CMD STYLE TERMINAL
       ============================================================================ */
    
    /* Main Container - Classic CMD black */
    .terminal-container {
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      background-color: #0C0C0C !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
    }

    /* Terminal Header - Windows title bar blue */
    .terminal-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 2px 8px !important;
      background: linear-gradient(180deg, #000080 0%, #1084d0 100%) !important;
      border-bottom: none !important;
      flex-shrink: 0 !important;
      height: 24px !important;
      min-height: 24px !important;
      max-height: 24px !important;
      box-sizing: border-box !important;
    }

    .terminal-title {
      font-size: 12px !important;
      font-weight: normal !important;
      color: #FFFFFF !important;
      user-select: none !important;
      font-family: 'Segoe UI', Tahoma, sans-serif !important;
    }
    
    /* Terminal Output Area */
    .terminal-output {
      flex: 1 !important;
      overflow: auto !important;
      padding: 8px !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
      font-size: 14px !important;
      line-height: 1.3 !important;
      background-color: #0C0C0C !important;
      color: #CCCCCC !important;
    }
    
    /* Input Container */
    .terminal-input-container {
      display: flex !important;
      align-items: center !important;
      padding: 0 8px 8px 8px !important;
      background-color: #0C0C0C !important;
      border-top: none !important;
      min-height: 20px !important;
    }
    
    /* Terminal Input */
    .terminal-input {
      flex: 1 !important;
      background-color: transparent !important;
      border: none !important;
      outline: none !important;
      color: #CCCCCC !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
      font-size: 14px !important;
      caret-color: #CCCCCC !important;
    }
    
    .terminal-input::placeholder {
      color: #666666 !important;
    }
    
    /* CMD Prompt Indicator */
    .terminal-prompt, .cmd-indicator {
      color: #CCCCCC !important;
      font-size: 14px !important;
      font-weight: normal !important;
      margin-right: 0 !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
    }
    
    /* Output line types - All use same CMD gray */
    .terminal-command,
    .terminal-output,
    .terminal-info,
    .cmd-line {
      color: #CCCCCC !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
      font-size: 14px !important;
      line-height: 1.3 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: none !important;
      border: none !important;
    }
    
    /* Error - Red */
    .terminal-error {
      color: #FF6B6B !important;
      font-family: 'Consolas', 'Lucida Console', monospace !important;
      font-size: 14px !important;
      line-height: 1.3 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: none !important;
      border: none !important;
    }
    
    /* Remove all fancy formatting */
    .cmd-response,
    .cmd-header,
    .formatted-error {
      background: none !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .cmd-header {
      display: none !important;
    }

    /* Scrollbar - Windows style */
    .terminal-output::-webkit-scrollbar {
      width: 16px !important;
      background: #0C0C0C !important;
    }

    .terminal-output::-webkit-scrollbar-track {
      background: #1E1E1E !important;
    }

    .terminal-output::-webkit-scrollbar-thumb {
      background: #4D4D4D !important;
      border: 1px solid #3D3D3D !important;
    }

    .terminal-output::-webkit-scrollbar-thumb:hover {
      background: #5D5D5D !important;
    }
    
    /* Selection */
    .terminal-output::selection,
    .terminal-output *::selection {
      background: #264F78 !important;
      color: #FFFFFF !important;
    }
    
    /* Terminal toggle button - Windows style */
    .terminal-toggle {
      background: #C0C0C0 !important;
      border: 1px outset #FFFFFF !important;
      color: #000000 !important;
      border-radius: 0 !important;
      width: 18px !important;
      height: 18px !important;
      font-size: 10px !important;
    }
    
    .terminal-toggle:hover {
      background: #E0E0E0 !important;
    }
    
    /* Terminal action buttons */
    .terminal-action {
      background: #C0C0C0 !important;
      border: 1px outset #FFFFFF !important;
      color: #000000 !important;
      border-radius: 0 !important;
    }
    
    .terminal-action:hover {
      background: #E0E0E0 !important;
    }
    
    .terminal-action:active {
      border-style: inset !important;
    }
    
    /* Remove transitions for snappy CMD feel */
    .terminal-container *,
    .terminal-panel *,
    .terminal-output * {
      transition: none !important;
    }
    
    /* Blinking cursor animation */
    @keyframes blink-caret {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    
    .terminal-input:focus::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 14px;
      background: #CCCCCC;
      animation: blink-caret 1s step-end infinite;
    }
  `;
  document.head.appendChild(style);
  console.log('✅ CMD-style terminal CSS applied');
}

// Debug terminal focus button
export function addDebugTerminalFocusButton(): void {
  const button = document.createElement('button');
  button.textContent = 'Focus Terminal';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '5px 10px';
  button.style.backgroundColor = '#007acc';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    const terminalInput = document.querySelector('.terminal-input') as HTMLElement;
    if (terminalInput) {
      console.log('Focusing terminal input via debug button');
      ensureInputVisibility(terminalInput);
    } else {
      console.error('No terminal input found');
      alert('Terminal input not found. Terminal may not be initialized.');
    }
  });
  
  document.body.appendChild(button);
}

// ============================================================================
// QUICK FIX SYSTEM - ULTRA COMPACT VS CODE STYLE
// ============================================================================

/**
 * Quick Fix error patterns - detects common errors and suggests fixes
 */
const QUICK_FIX_PATTERNS = [
  // NPM / Node.js
  {
    pattern: /Cannot find module ['"]([^'"]+)['"]/i,
    title: 'Install Module',
    getCommand: (match: RegExpMatchArray) => {
      const pkg = match[1].startsWith('@') 
        ? match[1].split('/').slice(0, 2).join('/') 
        : match[1].split('/')[0];
      return `npm install ${pkg}`;
    },
    icon: '📦',
    confidence: 'HIGH'
  },
  {
    pattern: /npm ERR!.*E404|npm ERR!.*not found/i,
    title: 'Check Package',
    getCommand: () => 'npm search <package-name>',
    icon: '🔍',
    confidence: 'MED'
  },
  {
    pattern: /ENOENT.*package\.json/i,
    title: 'Init Project',
    getCommand: () => 'npm init -y',
    icon: '📄',
    confidence: 'HIGH'
  },
  {
    pattern: /node_modules.*ENOENT|Cannot find module/i,
    title: 'Install Deps',
    getCommand: () => 'npm install',
    icon: '📥',
    confidence: 'HIGH'
  },
  {
    pattern: /ERESOLVE.*peer dep|peer dependency/i,
    title: 'Legacy Deps',
    getCommand: () => 'npm install --legacy-peer-deps',
    icon: '🔗',
    confidence: 'MED'
  },
  {
    pattern: /npm ERR!.*EINTEGRITY|npm cache/i,
    title: 'Clear Cache',
    getCommand: () => 'npm cache clean --force',
    icon: '🧹',
    confidence: 'MED'
  },
  
  // TypeScript
  {
    pattern: /error TS2307.*Cannot find module ['"]([^'"]+)['"]/i,
    title: 'Install Types',
    getCommand: (match: RegExpMatchArray) => {
      const mod = match[1];
      return mod.startsWith('@types/') ? `npm i -D ${mod}` : `npm i -D @types/${mod}`;
    },
    icon: '🔷',
    confidence: 'HIGH'
  },
  {
    pattern: /error TS\d+/i,
    title: 'TS Error',
    getCommand: () => 'npx tsc --noEmit',
    icon: '🔷',
    confidence: 'LOW'
  },
  
  // Python
  {
    pattern: /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/i,
    title: 'Pip Install',
    getCommand: (match: RegExpMatchArray) => `pip install ${match[1]}`,
    icon: '🐍',
    confidence: 'HIGH'
  },
  {
    pattern: /pip.*No matching distribution/i,
    title: 'Update Pip',
    getCommand: () => 'pip install --upgrade pip',
    icon: '🐍',
    confidence: 'MED'
  },
  
  // Git
  {
    pattern: /fatal: not a git repository/i,
    title: 'Git Init',
    getCommand: () => 'git init',
    icon: '📚',
    confidence: 'HIGH'
  },
  {
    pattern: /error:.*Your local changes.*would be overwritten/i,
    title: 'Stash Changes',
    getCommand: () => 'git stash',
    icon: '📚',
    confidence: 'HIGH'
  },
  {
    pattern: /CONFLICT.*Merge conflict/i,
    title: 'View Conflicts',
    getCommand: () => 'git diff --name-only --diff-filter=U',
    icon: '⚠️',
    confidence: 'HIGH'
  },
  {
    pattern: /fatal:.*refusing to merge unrelated/i,
    title: 'Allow Unrelated',
    getCommand: () => 'git pull origin main --allow-unrelated-histories',
    icon: '📚',
    confidence: 'MED'
  },
  
  // Rust / Cargo
  {
    pattern: /error\[E\d+\].*unresolved import `([^`]+)`/i,
    title: 'Cargo Add',
    getCommand: (match: RegExpMatchArray) => `cargo add ${match[1].split('::')[0]}`,
    icon: '🦀',
    confidence: 'HIGH'
  },
  
  // System / Ports
  {
    pattern: /EADDRINUSE.*port\s*(\d+)|address already in use.*:(\d+)/i,
    title: 'Kill Port',
    getCommand: (match: RegExpMatchArray) => `npx kill-port ${match[1] || match[2]}`,
    icon: '🔌',
    confidence: 'HIGH'
  },
  {
    pattern: /EACCES.*permission denied/i,
    title: 'Run as Admin',
    getCommand: () => 'sudo !!',
    icon: '🔒',
    confidence: 'MED'
  },
  {
    pattern: /heap out of memory|JavaScript heap/i,
    title: 'More Memory',
    getCommand: () => 'NODE_OPTIONS=--max-old-space-size=4096',
    icon: '💾',
    confidence: 'HIGH'
  },
  
  // Docker
  {
    pattern: /docker:.*Cannot connect|docker daemon/i,
    title: 'Start Docker',
    getCommand: () => 'systemctl start docker',
    icon: '🐳',
    confidence: 'HIGH'
  },
];

/**
 * Inject ultra-compact Quick Fix styles
 */
function injectQuickFixStyles(): void {
  if (document.getElementById('qf-styles-v2')) return;
  
  const style = document.createElement('style');
  style.id = 'qf-styles-v2';
  style.textContent = `
    /* ===== QUICK FIX - GITHUB DARK STYLE ===== */
    
    .qf-panel {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 4px;
      margin: 4px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;
      overflow: hidden;
      animation: qf-fade 0.15s ease-out;
    }
    
    @keyframes qf-fade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Header */
    .qf-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: #21262d;
      cursor: pointer;
      user-select: none;
    }
    
    .qf-header:hover { background: #30363d; }
    
    .qf-icon { font-size: 11px; line-height: 1; color: #d29922; }
    
    .qf-title {
      color: #d29922;
      font-size: 11px;
      font-weight: 600;
      flex: 1;
    }
    
    .qf-count {
      background: #d29922;
      color: #0d1117;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 8px;
      min-width: 14px;
      text-align: center;
    }
    
    .qf-close {
      color: #8b949e;
      font-size: 14px;
      line-height: 1;
      padding: 0 2px;
      cursor: pointer;
      transition: color 0.15s;
    }
    
    .qf-close:hover { color: #c9d1d9; }
    
    /* Items Container */
    .qf-items {
      max-height: 150px;
      overflow-y: auto;
    }
    
    .qf-items::-webkit-scrollbar { width: 5px; }
    .qf-items::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
    .qf-items::-webkit-scrollbar-thumb:hover { background: #484f58; }
    
    /* Single Item Row */
    .qf-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-top: 1px solid #21262d;
      transition: background 0.15s;
    }
    
    .qf-row:hover { background: #21262d; }
    
    .qf-row-icon {
      font-size: 11px;
      opacity: 0.9;
      width: 14px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .qf-row-title {
      color: #c9d1d9;
      font-size: 11px;
      white-space: nowrap;
      min-width: 80px;
    }
    
    /* Confidence Badge */
    .qf-conf {
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 8px;
      text-transform: lowercase;
      flex-shrink: 0;
    }
    
    .qf-conf-high { background: rgba(35, 134, 54, 0.2); color: #3fb950; }
    .qf-conf-med { background: rgba(210, 153, 34, 0.2); color: #d29922; }
    .qf-conf-low { background: rgba(139, 148, 158, 0.2); color: #8b949e; }
    
    /* Command Display */
    .qf-cmd {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 3px;
      padding: 2px 6px;
      min-width: 0;
    }
    
    .qf-cmd code {
      color: #79c0ff;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
      font-size: 10px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .qf-copy {
      background: none;
      border: none;
      color: #484f58;
      cursor: pointer;
      font-size: 10px;
      padding: 0 2px;
      transition: color 0.15s;
    }
    
    .qf-copy:hover { color: #c9d1d9; }
    
    /* Run Button */
    .qf-run {
      background: #238636;
      color: #ffffff;
      border: none;
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    
    .qf-run:hover { background: #2ea043; }
    .qf-run:active { background: #238636; transform: scale(0.98); }
    .qf-run:disabled { background: #21262d; color: #484f58; cursor: default; }
    .qf-run.done { background: #238636; }
    
    /* Collapsed State */
    .qf-panel.collapsed .qf-items { display: none; }
    .qf-panel.collapsed .qf-header { border-bottom: none; }
    .qf-panel.collapsed .qf-icon::before { content: '▶'; }
    .qf-panel:not(.collapsed) .qf-icon::before { content: '▼'; }
    
    /* Toast Notification */
    .qf-toast {
      position: fixed;
      bottom: 48px;
      right: 12px;
      padding: 8px 16px;
      background: #21262d;
      border: 1px solid #30363d;
      color: #c9d1d9;
      border-radius: 3px;
      font-size: 11px;
      font-family: -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      z-index: 10000;
      animation: qf-toast-in 0.2s ease-out;
    }
    
    @keyframes qf-toast-in {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;
  
  document.head.appendChild(style);
}

// Inject styles on load
injectQuickFixStyles();

/**
 * Trigger Quick Fix check for error output
 */
function triggerQuickFix(errorText: string, errorElement: HTMLElement, container: HTMLElement): void {
  // Find matching patterns
  const matches: Array<{
    pattern: typeof QUICK_FIX_PATTERNS[0];
    match: RegExpMatchArray;
    command: string;
  }> = [];
  
  for (const pattern of QUICK_FIX_PATTERNS) {
    const match = errorText.match(pattern.pattern);
    if (match) {
      matches.push({
        pattern,
        match,
        command: pattern.getCommand(match)
      });
    }
  }
  
  if (matches.length === 0) return;
  
  console.log(`💡 Quick Fix: ${matches.length} suggestion(s)`);
  
  // Remove any existing panel near this error
  errorElement.nextElementSibling?.classList.contains('qf-panel') && 
    errorElement.nextElementSibling.remove();
  
  // Create and insert panel
  const panel = createQuickFixPanel(matches, container);
  
  if (errorElement.nextSibling) {
    container.insertBefore(panel, errorElement.nextSibling);
  } else {
    container.appendChild(panel);
  }
  
  container.scrollTop = container.scrollHeight;
}

/**
 * Create ultra-compact Quick Fix panel
 */
function createQuickFixPanel(
  matches: Array<{pattern: typeof QUICK_FIX_PATTERNS[0]; match: RegExpMatchArray; command: string}>,
  container: HTMLElement
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'qf-panel';
  
  // Header
  const header = document.createElement('div');
  header.className = 'qf-header';
  header.innerHTML = `
    <span class="qf-icon"></span>
    <span class="qf-title">Quick Fix</span>
    <span class="qf-count">${matches.length}</span>
    <span class="qf-close">×</span>
  `;
  
  // Toggle collapse on header click
  header.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('qf-close')) {
      panel.remove();
    } else {
      panel.classList.toggle('collapsed');
    }
  });
  
  panel.appendChild(header);
  
  // Items container
  const items = document.createElement('div');
  items.className = 'qf-items';
  
  matches.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'qf-row';
    
    const confClass = `qf-conf qf-conf-${item.pattern.confidence.toLowerCase()}`;
    
    row.innerHTML = `
      <span class="qf-row-icon" style="width:18px;text-align:center;">${item.pattern.icon}</span>
      <span class="qf-row-title" style="min-width:100px;">${item.pattern.title}</span>
      <span class="${confClass}" style="min-width:40px;text-align:center;">${item.pattern.confidence.toLowerCase()}</span>
      <div class="qf-cmd" style="flex:1;">
        <code title="${item.command}">${item.command}</code>
        <button class="qf-copy" title="Copy">📋</button>
      </div>
      <button class="qf-run">▶ Run</button>
    `;
    
    // Copy handler
    const copyBtn = row.querySelector('.qf-copy') as HTMLButtonElement;
    copyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.command);
      copyBtn.textContent = '✓';
      setTimeout(() => copyBtn.textContent = '📋', 800);
    });
    
    // Run handler
    const runBtn = row.querySelector('.qf-run') as HTMLButtonElement;
    runBtn?.addEventListener('click', () => {
      runQuickFixCommand(item.command, runBtn);
    });
    
    items.appendChild(row);
  });
  
  panel.appendChild(items);
  
  return panel;
}

/**
 * Run Quick Fix command
 */
function runQuickFixCommand(command: string, button: HTMLButtonElement): void {
  console.log('🔧 Running:', command);
  
  button.textContent = '⏳';
  button.disabled = true;
  
  const terminalInput = document.querySelector('.terminal-input') as HTMLInputElement;
  
  if (terminalInput) {
    terminalInput.value = command;
    terminalInput.focus();
    
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    terminalInput.dispatchEvent(event);
    
    setTimeout(() => {
      button.textContent = '✓';
      button.classList.add('done');
    }, 200);
  } else {
    navigator.clipboard.writeText(command);
    button.textContent = '📋';
    showQuickFixToast(`Copied: ${command}`);
  }
}

/**
 * Show toast notification
 */
function showQuickFixToast(message: string): void {
  document.querySelector('.qf-toast')?.remove();
  
  const toast = document.createElement('div');
  toast.className = 'qf-toast';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

console.log('✅ Quick Fix v2 loaded:', QUICK_FIX_PATTERNS.length, 'patterns');

// Expose to window
(window as any).triggerQuickFix = triggerQuickFix;
(window as any).createQuickFixPanel = createQuickFixPanel;
