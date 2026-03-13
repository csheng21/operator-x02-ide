// src/fileOperations/buildSystemIntegration.ts
// Build System Integration - With Animated Text Progress & Smart Error Suggestions
// Uses same terminal as fileRunner.ts - integrated-terminal-output
// Updated with Preview Tab Integration & Terminal Error Badge

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BuildSystem {
  name: string;
  displayName: string;
  detectFile: string | string[];
  icon: string;
  buildCommand: string;
  runCommand: string;
  cleanCommand?: string;
  testCommand?: string;
  installCommand?: string;
  description: string;
  priority: number;
  // ✅ Arduino-specific fields
  isEmbedded?: boolean;
  boardFqbn?: string;
  requiresCLI?: string;
}

export interface BuildResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  exitCode: number;
}

interface ParsedError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  category: 'reference' | 'import' | 'type' | 'syntax' | 'unknown';
}

// ============================================================================
// BUILD SYSTEMS
// ============================================================================

export const BUILD_SYSTEMS: BuildSystem[] = [
  // ✅ EMBEDDED SYSTEMS (Arduino-based) - Higher priority
  // Using {fqbn} and {port} placeholders - replaced at runtime with user selections
  { name: 'arduino', displayName: 'Arduino', detectFile: '*.ino', icon: '🔌', buildCommand: 'arduino-cli compile --fqbn {fqbn} .', runCommand: 'arduino-cli upload -p {port} --fqbn {fqbn} .', cleanCommand: 'arduino-cli cache clean', installCommand: 'arduino-cli core install arduino:avr', description: 'Arduino Development', priority: 110, isEmbedded: true, boardFqbn: 'arduino:avr:uno', requiresCLI: 'arduino-cli' },
  { name: 'esp32', displayName: 'ESP32', detectFile: '*.ino', icon: '📡', buildCommand: 'arduino-cli compile --fqbn {fqbn} .', runCommand: 'arduino-cli upload -p {port} --fqbn {fqbn} .', cleanCommand: 'arduino-cli cache clean', installCommand: 'arduino-cli core install esp32:esp32', description: 'ESP32 IoT Development', priority: 109, isEmbedded: true, boardFqbn: 'esp32:esp32:esp32', requiresCLI: 'arduino-cli' },
  { name: 'esp8266', displayName: 'ESP8266', detectFile: '*.ino', icon: '📶', buildCommand: 'arduino-cli compile --fqbn {fqbn} .', runCommand: 'arduino-cli upload -p {port} --fqbn {fqbn} .', cleanCommand: 'arduino-cli cache clean', installCommand: 'arduino-cli core install esp8266:esp8266', description: 'ESP8266 WiFi Development', priority: 108, isEmbedded: true, boardFqbn: 'esp8266:esp8266:nodemcuv2', requiresCLI: 'arduino-cli' },
  { name: 'stm32', displayName: 'STM32', detectFile: '*.ino', icon: '🔩', buildCommand: 'arduino-cli compile --fqbn {fqbn} .', runCommand: 'arduino-cli upload -p {port} --fqbn {fqbn} .', cleanCommand: 'arduino-cli cache clean', installCommand: 'arduino-cli core install STMicroelectronics:stm32', description: 'STM32 Development', priority: 107, isEmbedded: true, boardFqbn: 'STMicroelectronics:stm32:GenF4', requiresCLI: 'arduino-cli' },
  // ✅ STANDARD BUILD SYSTEMS
  { name: 'npm', displayName: 'npm (Node.js)', detectFile: 'package.json', icon: '📦', buildCommand: 'npm run build', runCommand: 'npm start', cleanCommand: 'npm run clean', testCommand: 'npm test', installCommand: 'npm install', description: 'Node Package Manager', priority: 100 },
  { name: 'yarn', displayName: 'Yarn', detectFile: 'yarn.lock', icon: '🧶', buildCommand: 'yarn build', runCommand: 'yarn start', cleanCommand: 'yarn clean', testCommand: 'yarn test', installCommand: 'yarn install', description: 'Yarn Package Manager', priority: 95 },
  { name: 'pnpm', displayName: 'pnpm', detectFile: 'pnpm-lock.yaml', icon: '⚡', buildCommand: 'pnpm build', runCommand: 'pnpm start', cleanCommand: 'pnpm clean', testCommand: 'pnpm test', installCommand: 'pnpm install', description: 'pnpm', priority: 98 },
  { name: 'cargo', displayName: 'Cargo (Rust)', detectFile: 'Cargo.toml', icon: '🦀', buildCommand: 'cargo build', runCommand: 'cargo run', cleanCommand: 'cargo clean', testCommand: 'cargo test', description: 'Rust', priority: 100 },
  { name: 'maven', displayName: 'Maven (Java)', detectFile: 'pom.xml', icon: '☕', buildCommand: 'mvn compile', runCommand: 'mvn exec:java', cleanCommand: 'mvn clean', testCommand: 'mvn test', description: 'Java Maven', priority: 100 },
  { name: 'gradle', displayName: 'Gradle', detectFile: ['build.gradle', 'build.gradle.kts'], icon: '🐘', buildCommand: 'gradle build', runCommand: 'gradle run', cleanCommand: 'gradle clean', testCommand: 'gradle test', description: 'Gradle', priority: 95 },
  { name: 'cmake', displayName: 'CMake', detectFile: 'CMakeLists.txt', icon: '🔨', buildCommand: 'cmake --build build', runCommand: './build/main', cleanCommand: 'rm -rf build', testCommand: 'ctest', description: 'CMake C/C++', priority: 100 },
  { name: 'go', displayName: 'Go', detectFile: 'go.mod', icon: '🐹', buildCommand: 'go build', runCommand: 'go run .', cleanCommand: 'go clean', testCommand: 'go test', description: 'Go', priority: 100 },
  { name: 'python', displayName: 'Python', detectFile: 'requirements.txt', icon: '🐍', buildCommand: 'pip install -r requirements.txt', runCommand: 'python main.py', testCommand: 'pytest', description: 'Python', priority: 80 },
  { name: 'flutter', displayName: 'Flutter', detectFile: 'pubspec.yaml', icon: '🎯', buildCommand: 'flutter build', runCommand: 'flutter run', cleanCommand: 'flutter clean', testCommand: 'flutter test', description: 'Flutter', priority: 100 },
  { name: 'dotnet', displayName: '.NET', detectFile: ['*.csproj', '*.fsproj'], icon: '💙', buildCommand: 'dotnet build', runCommand: 'dotnet run', cleanCommand: 'dotnet clean', testCommand: 'dotnet test', description: '.NET', priority: 100 },
];

// ============================================================================
// ANIMATION FRAMES
// ============================================================================

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const PROGRESS = ['▱▱▱▱▱▱▱▱▱▱', '▰▱▱▱▱▱▱▱▱▱', '▰▰▱▱▱▱▱▱▱▱', '▰▰▰▱▱▱▱▱▱▱', '▰▰▰▰▱▱▱▱▱▱', '▰▰▰▰▰▱▱▱▱▱', '▰▰▰▰▰▰▱▱▱▱', '▰▰▰▰▰▰▰▱▱▱', '▰▰▰▰▰▰▰▰▱▱', '▰▰▰▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰▰▰▰'];
const BLOCKS = ['░░░░░░░░░░', '█░░░░░░░░░', '██░░░░░░░░', '███░░░░░░░', '████░░░░░░', '█████░░░░░', '██████░░░░', '███████░░░', '████████░░', '█████████░', '██████████'];

let animationInterval: number | null = null;
let animationLineEl: HTMLElement | null = null;

// ============================================================================
// PROCESS MANAGEMENT - Track and kill running processes
// ============================================================================

interface RunningProcess {
  pid: number;
  command: string;
  startTime: Date;
  projectPath: string;
  type: 'build' | 'run' | 'test' | 'dev-server';
}

let currentProcess: RunningProcess | null = null;
let processCheckInterval: number | null = null;

/**
 * Check if a process is currently running
 */
export function isProcessRunning(): boolean {
  return currentProcess !== null;
}

/**
 * Get current running process info
 */
export function getRunningProcess(): RunningProcess | null {
  return currentProcess;
}

/**
 * Stop the currently running process
 */
export async function stopProject(): Promise<boolean> {
  if (!currentProcess) {
    console.log('[BuildSystem] No process running');
    termLine('⚠️ No process is running', '#d29922');
    return false;
  }
  
  const pid = currentProcess.pid;
  const command = currentProcess.command;
  
  console.log(`[BuildSystem] Stopping process ${pid}: ${command}`);
  termLine(`⏹️ Stopping process...`, '#d29922');
  
  try {
    // Try Tauri kill command first
    try {
      await invoke('kill_build_process', { pid });
      console.log(`[BuildSystem] Process ${pid} killed via Tauri`);
    } catch (tauriError) {
      console.log('[BuildSystem] Tauri kill failed, trying OS command...');
      
      // Fallback: Use OS-specific kill command
      const isWindows = navigator.platform.toLowerCase().includes('win');
      const killCommand = isWindows 
        ? `taskkill /F /T /PID ${pid}` 
        : `kill -9 ${pid}`;
      
      await invoke('execute_build_command', {
        command: killCommand,
        workingDir: currentProcess.projectPath,
        streamOutput: false
      });
    }
    
    // Clear process state
    const processInfo = currentProcess;
    currentProcess = null;
    
    // Stop animation if running
    stopProgress();
    
    // Clear interval
    if (processCheckInterval) {
      clearInterval(processCheckInterval);
      processCheckInterval = null;
    }
    
    // Show stopped message
    const duration = Date.now() - processInfo.startTime.getTime();
    termStatus(false, 'Stopped by user', duration);
    termLine(`⏹️ Process ${pid} terminated`, '#d29922');
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('process-stopped', {
      detail: { pid, command: processInfo.command }
    }));
    
    console.log(`[BuildSystem] ✅ Process ${pid} stopped successfully`);
    return true;
    
  } catch (error) {
    console.error('[BuildSystem] Failed to stop process:', error);
    termLine(`❌ Failed to stop process: ${error}`, '#f85149');
    return false;
  }
}

/**
 * Track a new running process
 */
function trackProcess(pid: number, command: string, projectPath: string, type: RunningProcess['type']): void {
  currentProcess = {
    pid,
    command,
    startTime: new Date(),
    projectPath,
    type
  };
  
  console.log(`[BuildSystem] Tracking process ${pid}: ${command}`);
  
  // Dispatch event for UI updates (show Stop button)
  window.dispatchEvent(new CustomEvent('process-started', {
    detail: { pid, command, type }
  }));
}

/**
 * Clear process tracking (called when process ends naturally)
 */
function clearProcessTracking(): void {
  if (currentProcess) {
    console.log(`[BuildSystem] Process ${currentProcess.pid} completed`);
    const pid = currentProcess.pid;
    currentProcess = null;
    
    // Dispatch event for UI updates (hide Stop button)
    window.dispatchEvent(new CustomEvent('process-ended', {
      detail: { pid }
    }));
  }
  
  if (processCheckInterval) {
    clearInterval(processCheckInterval);
    processCheckInterval = null;
  }
}

// ============================================================================
// PREVIEW TAB INTEGRATION - NEW
// ============================================================================

// Store last detected server URL for preview
let lastDetectedServerUrl: string | null = null;

/**
 * Dispatch server URL detected event for Preview Tab
 */
function dispatchServerUrlEvent(url: string): void {
  lastDetectedServerUrl = url;
  (window as any).__lastServerUrl = url;
  
  // Dispatch event for preview tab auto-open
  window.dispatchEvent(new CustomEvent('server-url-detected', {
    detail: { url }
  }));
  
  console.log('[BuildSystem] Server URL dispatched for preview:', url);
}

/**
 * Open preview tab manually
 */
export function openPreview(url?: string): void {
  const targetUrl = url || lastDetectedServerUrl || 'http://localhost:3000';
  
  if ((window as any).previewTab?.open) {
    (window as any).previewTab.open(targetUrl);
  } else {
    dispatchServerUrlEvent(targetUrl);
  }
}

// ============================================================================
// TERMINAL OUTPUT - Same as fileRunner.ts
// ============================================================================

function getTerminal(): HTMLElement | null {
  const t = document.getElementById('integrated-terminal-output') || 
         document.getElementById('terminal-output') ||
         document.querySelector('.terminal-output');
  
  // IDE-density CSS reset + clickable error styles + preview button styles
  if (t && !document.getElementById('build-system-css-reset')) {
    const style = document.createElement('style');
    style.id = 'build-system-css-reset';
    style.textContent = `
      .bld{display:block;margin:1px 2px;padding:0;line-height:1.1;box-sizing:border-box}
      .bld *{margin:0;padding:0;line-height:inherit;box-sizing:border-box}
      .bld[style*="cursor:pointer"]:hover{background:rgba(248,81,73,0.15);border-radius:2px}
      .terminal-preview-btn{
        display:inline-flex;align-items:center;gap:4px;
        padding:3px 10px;margin-left:8px;
        background:#0e639c;border:none;border-radius:4px;
        color:#fff;cursor:pointer;font-size:11px;
        font-family:'JetBrains Mono',monospace;
        transition:background 0.15s;
      }
      .terminal-preview-btn:hover{background:#1177bb}
      .terminal-server-info{
        display:flex;align-items:center;gap:8px;
        padding:6px 0;
      }
    `;
    document.head.appendChild(style);
  }
  
  return t;
}

function termClear(): void {
  const t = getTerminal();
  if (t) t.innerHTML = '';
  setupErrorNavigation(); // Ensure click handler is available
  clearBuildErrorBadge(); // ✅ Clear error badge when terminal is cleared
}

function termLine(text: string, color: string = '#9cdcfe', options?: { id?: string; className?: string }): HTMLElement {
  const t = getTerminal();
  if (!t) return document.createElement('div');
  
  const el = document.createElement('div');
  el.className = 'bld';
  el.style.cssText = `color:${color};font:11px/1.1 'JetBrains Mono',monospace`;
  
  // Check if line contains clickable error pattern: file.ext(line,col) or file.ext:line:col
  const errorPattern1 = /([^\s(]+\.[a-zA-Z]+)\((\d+),(\d+)\)/;  // src/App.tsx(19,1)
  const errorPattern2 = /([^\s:]+\.[a-zA-Z]+):(\d+):(\d+)/;     // src/App.tsx:19:1
  
  const match = text.match(errorPattern1) || text.match(errorPattern2);
  
  if (match && color === '#f85149') {  // Only make red (error) lines clickable
    setupErrorNavigation(); // Ensure handler exists
    
    const file = match[1];
    const lineNum = parseInt(match[2]);
    const colNum = parseInt(match[3]);
    const projectPath = getCurrentProjectPath();
    
    // Escape HTML
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    el.style.cssText += ';cursor:pointer';
    el.innerHTML = `<span style="color:#f85149">⊙</span> <span style="text-decoration:underline">${escaped}</span>`;
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[BuildSystem] Click detected - File:', file, 'Line:', lineNum, 'Col:', colNum, 'Project:', projectPath);
      
      const goToError = (window as any).__goToError;
      if (goToError) {
        goToError(file, lineNum, colNum, projectPath);
      } else {
        console.error('[BuildSystem] __goToError not found!');
      }
    };
    el.title = `Click to open ${file} at line ${lineNum}`;
  } else {
    el.textContent = text;
  }
  
  if (options?.id) el.id = options.id;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
  return el;
}

function termSeparator(): void {
  const t = getTerminal();
  if (!t) return;
  const el = document.createElement('div');
  el.className = 'bld';
  el.style.cssText = 'height:1px;background:#444';
  t.appendChild(el);
}

function termHeader(icon: string, title: string, subtitle?: string): void {
  const t = getTerminal();
  if (!t) return;
  
  const el = document.createElement('div');
  el.className = 'bld';
  el.innerHTML = `<span>${icon}</span> <span style="color:#4fc3f7;font-weight:600">${title}</span>${subtitle ? ` <span style="color:#666">• ${subtitle}</span>` : ''}`;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

function termCommand(cmd: string): void {
  const t = getTerminal();
  if (!t) return;
  
  const el = document.createElement('div');
  el.className = 'bld';
  el.innerHTML = `<span style="color:#666">$</span> <span style="color:#dcdcaa">${cmd}</span>`;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

function termStatus(success: boolean, message: string, duration?: number): void {
  const t = getTerminal();
  if (!t) return;
  
  const c = success ? '#3fb950' : '#f85149';
  const el = document.createElement('div');
  el.className = 'bld';
  el.innerHTML = `<span style="color:${c};font-weight:bold">${success ? '✓' : '✗'}</span> <span style="color:${c}">${message}</span>${duration ? ` <span style="color:#666;font-size:9px">(${(duration/1000).toFixed(2)}s)</span>` : ''}`;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

// ============================================================================
// ANIMATED PROGRESS - Text Based
// ============================================================================

function startProgress(message: string, type: 'spinner' | 'progress' | 'blocks' = 'spinner'): void {
  stopProgress();
  
  const t = getTerminal();
  if (!t) return;
  
  let frame = 0;
  const frames = type === 'progress' ? PROGRESS : type === 'blocks' ? BLOCKS : SPINNER;
  
  animationLineEl = document.createElement('div');
  animationLineEl.id = 'build-progress-line';
  animationLineEl.className = 'bld';
  animationLineEl.style.cssText = 'color:#4fc3f7;font:11px/1.1 "JetBrains Mono",monospace';
  t.appendChild(animationLineEl);
  
  animationInterval = window.setInterval(() => {
    const f = frames[frame % frames.length];
    animationLineEl!.innerHTML = `<span style="color:#4fc3f7">${f}</span> <span style="color:#9cdcfe">${message}</span>${type === 'spinner' ? `<span style="color:#666">${'.'.repeat(frame % 4)}</span>` : ''}`;
    frame++;
    t.scrollTop = t.scrollHeight;
  }, 100);
}

function stopProgress(): void {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  if (animationLineEl) {
    animationLineEl.remove();
    animationLineEl = null;
  }
}

// ============================================================================
// TERMINAL ERROR BADGE - NEW
// ============================================================================

/**
 * Update terminal error badge with count
 */
function updateBuildErrorBadge(errorCount: number, warningCount: number = 0): void {
  // Try terminalToggleBadge module first
  const badge = (window as any).terminalToggleBadge;
  if (badge?.update) {
    badge.update(errorCount, warningCount);
    return;
  }
  
  // Try terminalContext (existing system)
  const tc = (window as any).terminalContext;
  if (tc?.getStats) {
    // terminalContext handles its own badge via recordError
    return;
  }
  
  // Fallback: dispatch event for any listeners
  window.dispatchEvent(new CustomEvent('build-error', {
    detail: { count: errorCount, warnings: warningCount }
  }));
}

/**
 * Clear terminal error badge
 */
function clearBuildErrorBadge(): void {
  // Try terminalToggleBadge module first
  const badge = (window as any).terminalToggleBadge;
  if (badge?.clear) {
    badge.clear();
    return;
  }
  
  // Try terminalContext
  const tc = (window as any).terminalContext;
  if (tc?.markResolved) {
    tc.markResolved();
    return;
  }
  
  // Fallback: dispatch event
  window.dispatchEvent(new CustomEvent('build-complete', {
    detail: { success: true, errorCount: 0 }
  }));
}

// ============================================================================
// ============================================================================
// COLLAPSIBLE ERROR CARD FOR CHAT
// ============================================================================

/**
 * Replace the last user message (with error text) with a collapsible card
 * Returns true if successful, false if message not found (for retry logic)
 */
function replaceErrorMessageWithCard(errors: ParsedError[]): boolean {
  const errorCount = errors.length;
  
  // Skip if card already exists
  if (document.querySelector('.build-error-card')) {
    console.log('[BuildSystem] Card already exists, skipping');
    return true;
  }
  
  // Add styles if not present
  if (!document.getElementById('error-card-styles')) {
    const style = document.createElement('style');
    style.id = 'error-card-styles';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes slideInCard {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .build-error-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%);
        border: 1px solid #1e3a5f;
        border-left: 3px solid #f85149;
        border-radius: 8px;
        overflow: hidden;
        margin: 8px 0;
        animation: slideInCard 0.3s ease-out;
      }
      .build-error-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        cursor: pointer;
      }
      .build-error-card-header:hover {
        background: rgba(255,255,255,0.02);
      }
      .build-error-card-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease, padding 0.3s ease;
        background: rgba(0,0,0,0.2);
        padding: 0 14px;
      }
      .build-error-card-content.expanded {
        max-height: 350px;
        overflow-y: auto;
        padding: 12px 14px;
      }
      .build-error-card-content::-webkit-scrollbar {
        width: 6px;
      }
      .build-error-card-content::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 3px;
      }
      .error-file-group {
        margin-bottom: 10px;
      }
      .error-file-name {
        color: #4fc3f7;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .error-item {
        color: #bbb;
        font-size: 10px;
        padding: 3px 0 3px 12px;
        border-left: 2px solid #333;
      }
      .error-item:hover {
        background: rgba(255,255,255,0.03);
      }
      .hidden-error-text {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // ✅ FIX: Use the EXACT selectors from debug output
  // Container: ai-chat-container
  // User message: ai-message user-message
  // Content: ai-message-content
  
  const chatContainer = document.querySelector('.ai-chat-container');
  
  if (!chatContainer) {
    // Try alternative selectors
    const altContainer = document.querySelector('.chat-messages, .messages-container, #chat-messages, [class*="chat-content"]');
    if (altContainer) {
      console.log('[BuildSystem] Found alternative container:', altContainer.className);
    }
    console.log('[BuildSystem] ❌ No ai-chat-container found');
    return false;
  }
  
  console.log('[BuildSystem] ✅ Found ai-chat-container');
  
  // Debug: Log all direct children
  const children = chatContainer.children;
  console.log(`[BuildSystem] Container has ${children.length} children`);
  
  // Find the last user message with error content
  const userMessages = chatContainer.querySelectorAll('.ai-message.user-message');
  console.log('[BuildSystem] Found', userMessages.length, 'user messages');
  
  // Also try without compound selector
  if (userMessages.length === 0) {
    const anyMessages = chatContainer.querySelectorAll('[class*="message"]');
    console.log('[BuildSystem] Any messages:', anyMessages.length);
    anyMessages.forEach((m, i) => {
      console.log(`  [${i}] ${m.className} - ${(m.textContent || '').substring(0, 50)}...`);
    });
  }
  
  let targetMessage: Element | null = null;
  
  // Search from bottom up
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const msg = userMessages[i];
    const text = msg.textContent || '';
    console.log(`[BuildSystem] User msg ${i}: ${text.substring(0, 80)}...`);
    
    if ((text.includes('Line') && text.includes('TS')) || 
        text.includes('build-errors') ||
        text.includes('more errors')) {
      // Get the content div inside
      const content = msg.querySelector('.ai-message-content');
      if (content) {
        targetMessage = content;
        console.log('[BuildSystem] ✅ Found user message content to replace');
        break;
      }
    }
  }
  
  // Fallback: search for ai-message-content directly
  if (!targetMessage) {
    const allContents = chatContainer.querySelectorAll('.ai-message-content');
    console.log('[BuildSystem] Fallback: Found', allContents.length, 'ai-message-content elements');
    
    for (let i = allContents.length - 1; i >= 0; i--) {
      const content = allContents[i];
      const text = content.textContent || '';
      // Make sure it's a USER message (parent has user-message class)
      const parent = content.parentElement;
      if (parent?.classList.contains('user-message')) {
        console.log(`[BuildSystem] Content ${i} (user): ${text.substring(0, 80)}...`);
        if ((text.includes('Line') && text.includes('TS')) || 
            text.includes('build-errors')) {
          targetMessage = content;
          console.log('[BuildSystem] ✅ Found ai-message-content via fallback');
          break;
        }
      }
    }
  }
  
  // Ultimate fallback: search ENTIRE document
  if (!targetMessage) {
    console.log('[BuildSystem] 🔍 Searching entire document for error text...');
    const allDivs = document.querySelectorAll('div');
    for (let i = allDivs.length - 1; i >= 0; i--) {
      const div = allDivs[i];
      const text = div.textContent || '';
      // Look for BUILD_ERROR_CARD marker
      if (text.includes('BUILD_ERROR_CARD') && text.includes('build-errors')) {
        // Make sure it's a leaf-ish node (not the whole page)
        if (div.children.length < 10 && text.length < 5000) {
          console.log(`[BuildSystem] 🎯 Found via document search: ${div.className}`);
          targetMessage = div;
          break;
        }
      }
    }
  }
  
  if (!targetMessage) {
    console.log('[BuildSystem] Could not find user error message to replace');
    return false;
  }
  
  // Group errors by file
  const errorsByFile: Record<string, ParsedError[]> = {};
  errors.slice(0, 25).forEach(e => {
    if (!errorsByFile[e.file]) errorsByFile[e.file] = [];
    errorsByFile[e.file].push(e);
  });
  
  // Build error list HTML
  let errorListHTML = '';
  Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
    errorListHTML += `
      <div class="error-file-group">
        <div class="error-file-name">📄 ${escapeHtml(file)}</div>
        ${fileErrors.map(e => `
          <div class="error-item">
            <span style="color: #888;">L${e.line}:</span>
            <span style="color: #f85149;">${e.code}</span> -
            <span>${escapeHtml(e.message.length > 50 ? e.message.substring(0, 50) + '...' : e.message)}</span>
          </div>
        `).join('')}
      </div>
    `;
  });
  
  const remainingErrors = errorCount - 25;
  if (remainingErrors > 0) {
    errorListHTML += `<div style="color: #666; font-size: 10px; text-align: center; padding: 8px 0;">+${remainingErrors} more errors</div>`;
  }
  
  // Create the card
  const cardId = 'error-card-' + Date.now();
  const card = document.createElement('div');
  card.className = 'build-error-card';
  card.id = cardId;
  card.innerHTML = `
    <div class="build-error-card-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="width: 8px; height: 8px; background: #f85149; border-radius: 50%; box-shadow: 0 0 8px rgba(248,81,73,0.5);"></span>
        <span style="color: #fff; font-weight: 600; font-size: 13px;">Build Failed</span>
        <span style="color: #f85149; font-size: 11px; background: rgba(248,81,73,0.15); padding: 2px 8px; border-radius: 10px; font-weight: 500;">${errorCount} error${errorCount > 1 ? 's' : ''}</span>
      </div>
      <span class="expand-toggle" style="color: #4fc3f7; font-size: 11px; padding: 4px 8px; border: 1px solid #333; border-radius: 4px;">▶ Show</span>
    </div>
    <div class="build-error-card-content">
      ${errorListHTML}
    </div>
  `;
  
  // Clear the target and insert the card
  targetMessage.innerHTML = '';
  targetMessage.appendChild(card);
  
  // Add click handler for expand/collapse
  const header = card.querySelector('.build-error-card-header');
  const content = card.querySelector('.build-error-card-content');
  const toggle = card.querySelector('.expand-toggle');
  
  header?.addEventListener('click', () => {
    const isExpanded = content?.classList.contains('expanded');
    if (isExpanded) {
      content?.classList.remove('expanded');
      if (toggle) toggle.textContent = '▶ Show';
    } else {
      content?.classList.add('expanded');
      if (toggle) toggle.textContent = '▼ Hide';
    }
  });
  
  // Scroll to card
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  console.log('[BuildSystem] ✅ Replaced user error message with collapsible card');
}

/**
 * Fallback: Insert card at end of chat
 */
function insertCardAtEndOfChat(errors: ParsedError[]): void {
  const errorCount = errors.length;
  
  const chatContainer = document.querySelector(
    '.ai-chat-messages, .chat-messages, .messages-container, #chat-messages'
  );
  
  if (!chatContainer) {
    console.log('[BuildSystem] No chat container found');
    return;
  }
  
  // Group errors
  const errorsByFile: Record<string, ParsedError[]> = {};
  errors.slice(0, 25).forEach(e => {
    if (!errorsByFile[e.file]) errorsByFile[e.file] = [];
    errorsByFile[e.file].push(e);
  });
  
  let errorListHTML = '';
  Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
    errorListHTML += `
      <div class="error-file-group">
        <div class="error-file-name">📄 ${escapeHtml(file)}</div>
        ${fileErrors.map(e => `
          <div class="error-item">
            <span style="color: #888;">L${e.line}:</span>
            <span style="color: #f85149;">${e.code}</span> - ${escapeHtml(e.message.substring(0, 50))}
          </div>
        `).join('')}
      </div>
    `;
  });
  
  const card = document.createElement('div');
  card.className = 'build-error-card';
  card.style.margin = '12px';
  card.innerHTML = `
    <div class="build-error-card-header" onclick="
      const content = this.nextElementSibling;
      const toggle = this.querySelector('.expand-toggle');
      if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggle.textContent = '▶ Show';
      } else {
        content.classList.add('expanded');
        toggle.textContent = '▼ Hide';
      }
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="width: 8px; height: 8px; background: #f85149; border-radius: 50%;"></span>
        <span style="color: #fff; font-weight: 600; font-size: 13px;">Build Failed</span>
        <span style="color: #f85149; font-size: 11px; background: rgba(248,81,73,0.15); padding: 2px 8px; border-radius: 10px;">${errorCount} errors</span>
      </div>
      <span class="expand-toggle" style="color: #4fc3f7; font-size: 11px; padding: 4px 8px; border: 1px solid #333; border-radius: 4px;">▶ Show</span>
    </div>
    <div class="build-error-card-content">${errorListHTML}</div>
  `;
  
  chatContainer.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth' });
  
  console.log('[BuildSystem] ✅ Inserted error card at end of chat');
}

/**
 * Insert a collapsible error card into the AI chat panel
 * Shows 1-line summary, expandable to see all errors
 */
function insertCollapsibleErrorCard(errors: ParsedError[]): void {
  const errorCount = errors.length;
  
  // Add styles if not present
  if (!document.getElementById('error-card-styles')) {
    const style = document.createElement('style');
    style.id = 'error-card-styles';
    style.textContent = `
      @keyframes errorCardSlideIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .error-card-container {
        animation: errorCardSlideIn 0.25s ease-out;
      }
      .error-card-expand-btn:hover {
        background: rgba(79, 195, 247, 0.15) !important;
      }
      .error-card-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }
      .error-card-content.expanded {
        max-height: 400px;
        overflow-y: auto;
      }
      .error-card-content::-webkit-scrollbar {
        width: 6px;
      }
      .error-card-content::-webkit-scrollbar-track {
        background: #1a1a2e;
      }
      .error-card-content::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Group errors by file
  const errorsByFile: Record<string, ParsedError[]> = {};
  errors.slice(0, 20).forEach(e => {
    if (!errorsByFile[e.file]) errorsByFile[e.file] = [];
    errorsByFile[e.file].push(e);
  });
  
  // Build error list HTML
  let errorListHTML = '';
  Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
    errorListHTML += `
      <div style="margin-bottom: 8px;">
        <div style="color: #4fc3f7; font-size: 11px; font-weight: 600; margin-bottom: 4px;">📄 ${escapeHtml(file)}</div>
        ${fileErrors.map(e => `
          <div style="color: #ccc; font-size: 10px; padding: 2px 0 2px 12px; border-left: 2px solid #333;">
            <span style="color: #888;">L${e.line}:</span> 
            <span style="color: #f85149;">${e.code}</span> - 
            <span style="color: #aaa;">${escapeHtml(e.message.substring(0, 60))}${e.message.length > 60 ? '...' : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  });
  
  const remainingErrors = errorCount - 20;
  if (remainingErrors > 0) {
    errorListHTML += `<div style="color: #666; font-size: 10px; text-align: center; padding: 8px;">... +${remainingErrors} more errors</div>`;
  }
  
  // Create the card
  const card = document.createElement('div');
  card.className = 'error-card-container user-message';
  card.id = 'build-error-card';
  card.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%);
    border: 1px solid #1e3a5f;
    border-left: 3px solid #f85149;
    border-radius: 8px;
    margin: 8px 12px;
    overflow: hidden;
  `;
  
  card.innerHTML = `
    <!-- Header - Always visible (1 line) -->
    <div class="error-card-header" style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      cursor: pointer;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="
          width: 8px;
          height: 8px;
          background: #f85149;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(248, 81, 73, 0.5);
        "></span>
        <span style="color: #fff; font-weight: 600; font-size: 13px;">Build Failed</span>
        <span style="
          color: #f85149;
          font-size: 11px;
          background: rgba(248, 81, 73, 0.15);
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        ">${errorCount} error${errorCount > 1 ? 's' : ''}</span>
      </div>
      <button class="error-card-expand-btn" style="
        background: transparent;
        border: 1px solid #333;
        color: #4fc3f7;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s;
      ">
        <span class="expand-icon">▶</span>
        <span class="expand-text">Show</span>
      </button>
    </div>
    
    <!-- Content - Collapsible -->
    <div class="error-card-content" style="
      background: rgba(0, 0, 0, 0.2);
      padding: 0 14px;
    ">
      <div style="padding: 12px 0;">
        ${errorListHTML}
      </div>
    </div>
  `;
  
  // Find chat panel and insert
  const chatPanel = document.querySelector(
    '.ai-chat-messages, .chat-messages, .messages-container, ' +
    '#chat-messages, [class*="message-list"]'
  );
  
  if (chatPanel) {
    // Remove existing card
    document.getElementById('build-error-card')?.remove();
    
    // Append to chat
    chatPanel.appendChild(card);
    
    // Scroll to card
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    
    // Setup expand/collapse
    const header = card.querySelector('.error-card-header');
    const content = card.querySelector('.error-card-content');
    const expandBtn = card.querySelector('.error-card-expand-btn');
    const expandIcon = card.querySelector('.expand-icon');
    const expandText = card.querySelector('.expand-text');
    
    header?.addEventListener('click', () => {
      const isExpanded = content?.classList.contains('expanded');
      
      if (isExpanded) {
        content?.classList.remove('expanded');
        if (expandIcon) expandIcon.textContent = '▶';
        if (expandText) expandText.textContent = 'Show';
      } else {
        content?.classList.add('expanded');
        if (expandIcon) expandIcon.textContent = '▼';
        if (expandText) expandText.textContent = 'Hide';
      }
    });
    
    console.log('[BuildSystem] ✅ Collapsible error card inserted');
  }
}

// ============================================================================
// DEBUGGING PROGRESS BAR - Shows in AI Chat Panel
// ============================================================================

/**
 * Show debugging progress bar inside AI chat panel
 */
function showDebuggingProgress(errorCount: number): void {
  // Remove existing
  document.getElementById('debugging-progress-bar')?.remove();
  
  // Add keyframe styles
  if (!document.getElementById('debugging-progress-styles')) {
    const style = document.createElement('style');
    style.id = 'debugging-progress-styles';
    style.textContent = `
      @keyframes debugProgressSlide {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes debugProgressPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes debugProgressBar {
        0% { width: 0%; }
        10% { width: 30%; }
        30% { width: 50%; }
        60% { width: 75%; }
        90% { width: 90%; }
        100% { width: 95%; }
      }
      @keyframes debugSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes debugShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes debugGlow {
        0%, 100% { box-shadow: 0 0 5px rgba(79, 195, 247, 0.3); }
        50% { box-shadow: 0 0 15px rgba(79, 195, 247, 0.6); }
      }
      .debug-status-fade-in {
        animation: debugProgressSlide 0.3s ease-out forwards;
      }
      .debug-status-fade-out {
        animation: debugProgressSlide 0.3s ease-out reverse forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  const bar = document.createElement('div');
  bar.id = 'debugging-progress-bar';
  bar.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%);
    border: 1px solid #1e3a5f;
    border-radius: 12px;
    padding: 16px 18px;
    margin: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(79, 195, 247, 0.1);
    animation: debugProgressSlide 0.3s ease-out, debugGlow 2s ease-in-out infinite;
  `;
  
  bar.innerHTML = `
    <!-- Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <!-- Spinner -->
        <div style="
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(79, 195, 247, 0.2);
          border-top-color: #4fc3f7;
          border-radius: 50%;
          animation: debugSpin 0.8s linear infinite;
        "></div>
        <span style="color: #4fc3f7; font-weight: 600; font-size: 14px;">🔍 AI Debugging</span>
      </div>
      <span style="
        color: #f85149; 
        font-size: 12px; 
        background: rgba(248,81,73,0.15); 
        padding: 4px 12px; 
        border-radius: 14px;
        border: 1px solid rgba(248,81,73,0.3);
        font-weight: 600;
      ">${errorCount} error${errorCount > 1 ? 's' : ''}</span>
    </div>
    
    <!-- Status messages area -->
    <div id="debug-status-container" style="
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      min-height: 38px;
      display: flex;
      align-items: center;
      gap: 10px;
    ">
      <div id="debug-status-icon" style="font-size: 16px;">🔍</div>
      <div style="flex: 1;">
        <div id="debug-status-text" style="color: #9cdcfe; font-size: 12px; font-weight: 500;">
          Checking errors...
        </div>
        <div id="debug-status-detail" style="color: #666; font-size: 10px; margin-top: 2px;">
          Parsing build output
        </div>
      </div>
    </div>
    
    <!-- Progress bar -->
    <div style="
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    ">
      <div id="debug-progress-fill" style="
        height: 100%;
        background: linear-gradient(90deg, #4fc3f7, #29b6f6, #03a9f4, #4fc3f7);
        background-size: 200% 100%;
        border-radius: 3px;
        width: 0%;
        transition: width 0.3s ease-out;
      "></div>
    </div>
    
    <!-- Footer -->
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span id="debug-elapsed" style="color: #555; font-size: 10px;">0s elapsed</span>
      <button id="debug-cancel-btn" style="
        background: rgba(248,81,73,0.1);
        border: 1px solid rgba(248,81,73,0.3);
        color: #f85149;
        padding: 5px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
        transition: all 0.15s;
      " onmouseover="this.style.background='rgba(248,81,73,0.2)'" 
         onmouseout="this.style.background='rgba(248,81,73,0.1)'">
        Cancel
      </button>
    </div>
  `;
  
  // Find AI chat panel and insert at top of messages
  const chatPanel = document.querySelector(
    '.ai-chat-messages, .chat-messages, .messages-container, ' +
    '#chat-messages, [class*="chat-content"], [class*="message-list"], ' +
    '.ai-panel-content, .assistant-messages'
  );
  
  if (chatPanel) {
    if (chatPanel.firstChild) {
      chatPanel.insertBefore(bar, chatPanel.firstChild);
    } else {
      chatPanel.appendChild(bar);
    }
    bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    const inputArea = document.querySelector(
      '#ai-assistant-input, .ai-chat-input, .chat-input-container, ' +
      '[class*="input-area"], [class*="chat-input"]'
    );
    
    if (inputArea?.parentElement) {
      inputArea.parentElement.insertBefore(bar, inputArea);
    } else {
      bar.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        width: 380px;
        background: linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%);
        border: 1px solid #1e3a5f;
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        z-index: 999999;
        animation: debugProgressSlide 0.3s ease-out, debugGlow 2s ease-in-out infinite;
      `;
      document.body.appendChild(bar);
    }
  }
  
  // Cancel button handler
  bar.querySelector('#debug-cancel-btn')?.addEventListener('click', () => {
    hideDebuggingProgress();
  });
  
  // ✅ ANIMATED STATUS MESSAGES (continues after status bar states)
  // Status bar handles: checking → analyzing → sending
  // Chat panel continues from there with more detailed states
  const statusMessages = [
    { icon: '📤', text: 'Sending to AI...', detail: 'Preparing request', progress: 60 },
    { icon: '🧠', text: 'AI processing errors...', detail: 'Generating solutions', progress: 70 },
    { icon: '💡', text: 'Finding best fix...', detail: 'Evaluating approaches', progress: 80 },
    { icon: '✍️', text: 'Generating corrected code...', detail: 'Almost done', progress: 90 },
    { icon: '✅', text: 'Finalizing response...', detail: 'Preparing output', progress: 95 }
  ];
  
  let currentStatus = 0;
  let startTime = Date.now();
  
  // Update status periodically - delay start to let status bar sync first
  const statusInterval = setInterval(() => {
    const statusIcon = bar.querySelector('#debug-status-icon');
    const statusText = bar.querySelector('#debug-status-text');
    const statusDetail = bar.querySelector('#debug-status-detail');
    const progressFill = bar.querySelector('#debug-progress-fill') as HTMLElement;
    const elapsed = bar.querySelector('#debug-elapsed');
    
    if (!statusIcon || !statusText || !bar.isConnected) {
      clearInterval(statusInterval);
      return;
    }
    
    // Update elapsed time
    if (elapsed) {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      elapsed.textContent = `${seconds}s elapsed`;
    }
    
    // Advance to next status
    if (currentStatus < statusMessages.length - 1) {
      currentStatus++;
      const msg = statusMessages[currentStatus];
      
      statusIcon.textContent = msg.icon;
      statusText.textContent = msg.text;
      if (statusDetail) statusDetail.textContent = msg.detail;
      if (progressFill) progressFill.style.width = `${msg.progress}%`;
      
      // ✅ Also update the status bar to stay in sync
      const topBar = document.getElementById('build-status-bar');
      if (topBar) {
        const topIcon = topBar.querySelector('div[style*="font-size: 20px"]');
        const topText = topBar.querySelector('span[style*="font-weight: 600"]');
        const topSubtext = topBar.querySelector('div[style*="color: #666"]');
        if (topIcon) topIcon.textContent = msg.icon;
        if (topText) topText.textContent = msg.text;
        if (topSubtext) topSubtext.textContent = msg.detail;
      }
    }
  }, 2000); // Change status every 2 seconds
  
  // Store interval ID for cleanup
  (bar as any)._statusInterval = statusInterval;
  
  console.log('[BuildSystem] 🔍 Debugging progress shown in AI panel');
}

/**
 * Hide debugging progress bar
 */
function hideDebuggingProgress(): void {
  const bar = document.getElementById('debugging-progress-bar');
  if (bar) {
    // Clear status interval if exists
    if ((bar as any)._statusInterval) {
      clearInterval((bar as any)._statusInterval);
    }
    
    // Show completion state briefly
    const statusIcon = bar.querySelector('#debug-status-icon');
    const statusText = bar.querySelector('#debug-status-text');
    const statusDetail = bar.querySelector('#debug-status-detail');
    const progressFill = bar.querySelector('#debug-progress-fill') as HTMLElement;
    
    if (statusIcon) statusIcon.textContent = '✅';
    if (statusText) statusText.textContent = 'Analysis complete!';
    if (statusDetail) statusDetail.textContent = 'AI response ready';
    if (progressFill) progressFill.style.width = '100%';
    
    // Fade out after brief completion display
    setTimeout(() => {
      bar.style.opacity = '0';
      bar.style.transform = 'translateY(-10px)';
      bar.style.transition = 'all 0.3s ease-out';
      setTimeout(() => bar.remove(), 300);
    }, 500);
    
    console.log('[BuildSystem] 🔍 Debugging progress hidden');
  }
  
  // ✅ Also hide the status bar
  hideBuildStatusBar();
}

// Auto-hide when AI responds
if (typeof window !== 'undefined') {
  // Watch for AI response
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check if this is an AI response (look for common patterns)
          const isAIResponse = 
            node.classList.contains('ai-message') || 
            node.classList.contains('assistant-message') ||
            node.classList.contains('claude-message') ||
            node.getAttribute('data-role') === 'assistant' ||
            node.querySelector?.('.ai-message, .assistant-message, [data-role="assistant"]') ||
            (node.textContent && node.textContent.length > 100 && 
             (node.textContent.includes('```') || node.textContent.includes('Here')));
          
          if (isAIResponse) {
            // Delay hiding slightly to ensure message is visible
            setTimeout(() => hideDebuggingProgress(), 500);
          }
        }
      });
    });
  });
  
  // Start observing when DOM is ready
  const startObserver = () => {
    const chatContainer = document.querySelector(
      '.ai-chat-messages, .chat-messages, .messages-container, ' +
      '#chat-messages, [class*="chat-content"], .ai-panel-content'
    );
    if (chatContainer) {
      observer.observe(chatContainer, { childList: true, subtree: true });
      console.log('[BuildSystem] 🔍 AI response observer active');
    }
  };
  
  if (document.readyState === 'complete') {
    setTimeout(startObserver, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(startObserver, 1000));
  }
}

// ============================================================================
// ENHANCED BUILD STATUS NOTIFICATION BAR
// ============================================================================

/**
 * Show an enhanced build status notification bar
 * Appears at the top of the IDE with animated status
 */
function showBuildStatusBar(type: 'building' | 'error' | 'success' | 'checking' | 'sending' | 'analyzing', errorCount?: number, customMessage?: string): void {
  // Remove existing
  document.getElementById('build-status-bar')?.remove();
  
  // Add styles
  if (!document.getElementById('build-status-bar-styles')) {
    const style = document.createElement('style');
    style.id = 'build-status-bar-styles';
    style.textContent = `
      @keyframes buildBarSlide {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes buildBarPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes buildBarProgress {
        0% { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes buildBarSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes buildBarShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes buildBarBounce {
        0%, 80%, 100% { transform: scaleY(0.4); }
        40% { transform: scaleY(1); }
      }
      .build-status-bar-shimmer {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        background-size: 200% 100%;
        animation: buildBarShimmer 1.5s linear infinite;
      }
      .build-bar-bounce span {
        display: inline-block;
        width: 3px;
        height: 14px;
        margin: 0 1px;
        background: currentColor;
        animation: buildBarBounce 1s ease-in-out infinite;
      }
      .build-bar-bounce span:nth-child(2) { animation-delay: 0.1s; }
      .build-bar-bounce span:nth-child(3) { animation-delay: 0.2s; }
      .build-bar-bounce span:nth-child(4) { animation-delay: 0.3s; }
      .build-bar-bounce span:nth-child(5) { animation-delay: 0.4s; }
    `;
    document.head.appendChild(style);
  }
  
  const bar = document.createElement('div');
  bar.id = 'build-status-bar';
  
  // Base styles
  bar.style.cssText = `
    position: fixed;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999998;
    background: linear-gradient(135deg, #1e1e2e 0%, #252535 100%);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    animation: buildBarSlide 0.3s ease-out;
    min-width: 320px;
  `;
  
  if (type === 'building') {
    bar.innerHTML = `
      <div style="
        width: 18px; height: 18px;
        border: 2px solid rgba(79,195,247,0.3);
        border-top-color: #4fc3f7;
        border-radius: 50%;
        animation: buildBarSpin 0.8s linear infinite;
      "></div>
      <div style="flex: 1;">
        <div style="color: #4fc3f7; font-weight: 600; font-size: 13px;">Building Project...</div>
        <div style="
          height: 3px;
          background: rgba(79,195,247,0.2);
          border-radius: 2px;
          margin-top: 6px;
          overflow: hidden;
        ">
          <div class="build-status-bar-shimmer" style="
            height: 100%;
            background: linear-gradient(90deg, #4fc3f7, #29b6f6, #4fc3f7);
            background-size: 200% 100%;
            width: 100%;
          "></div>
        </div>
      </div>
    `;
  } else if (type === 'checking' || type === 'analyzing' || type === 'sending') {
    // AI Processing states
    const messages: Record<string, { icon: string; text: string; subtext: string; color: string; progress: number }> = {
      checking: { icon: '🔍', text: 'Checking errors...', subtext: 'Parsing build output', color: '#4fc3f7', progress: 15 },
      analyzing: { icon: '🧠', text: 'AI analyzing...', subtext: 'Finding solutions', color: '#a78bfa', progress: 40 },
      sending: { icon: '📤', text: 'Sending to AI...', subtext: 'Preparing request', color: '#4fc3f7', progress: 60 }
    };
    const msg = messages[type];
    const errorText = errorCount ? (errorCount === 1 ? '1 error' : `${errorCount} errors`) : '';
    
    // ✅ Also update the chat panel progress bar if it exists
    const chatProgressIcon = document.querySelector('#debug-status-icon');
    const chatProgressText = document.querySelector('#debug-status-text');
    const chatProgressDetail = document.querySelector('#debug-status-detail');
    const chatProgressFill = document.querySelector('#debug-progress-fill') as HTMLElement;
    
    if (chatProgressIcon) chatProgressIcon.textContent = msg.icon;
    if (chatProgressText) chatProgressText.textContent = customMessage || msg.text;
    if (chatProgressDetail) chatProgressDetail.textContent = msg.subtext;
    if (chatProgressFill) chatProgressFill.style.width = `${msg.progress}%`;
    
    bar.style.borderColor = `${msg.color}40`;
    bar.innerHTML = `
      <div style="font-size: 20px;">${msg.icon}</div>
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <span style="color: ${msg.color}; font-weight: 600; font-size: 13px;">${customMessage || msg.text}</span>
          ${errorText ? `<span style="
            background: rgba(248,81,73,0.15);
            color: #f85149;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
          ">${errorText}</span>` : ''}
        </div>
        <div style="color: #666; font-size: 11px;">${msg.subtext}</div>
      </div>
      <div class="build-bar-bounce" style="color: ${msg.color}; display: flex; align-items: flex-end; height: 16px;">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    `;
  } else if (type === 'error') {
    const errorText = errorCount === 1 ? '1 error' : `${errorCount} errors`;
    bar.style.borderColor = 'rgba(248,81,73,0.4)';
    bar.innerHTML = `
      <div style="
        width: 12px; height: 12px;
        background: #f85149;
        border-radius: 50%;
        animation: buildBarPulse 1.5s ease-in-out infinite;
        box-shadow: 0 0 10px rgba(248,81,73,0.5);
      "></div>
      <div style="color: #f0f0f0; font-weight: 600; font-size: 13px;">Build Failed</div>
      <div style="
        background: rgba(79,195,247,0.15);
        color: #4fc3f7;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid rgba(79,195,247,0.3);
      ">${errorText}</div>
      <div style="flex: 1;"></div>
      <button id="build-bar-show" style="
        background: linear-gradient(135deg, rgba(79,195,247,0.1), rgba(79,195,247,0.05));
        border: 1px solid rgba(79,195,247,0.3);
        color: #4fc3f7;
        padding: 6px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      " onmouseover="this.style.background='rgba(79,195,247,0.2)';this.style.borderColor='#4fc3f7'" 
         onmouseout="this.style.background='linear-gradient(135deg, rgba(79,195,247,0.1), rgba(79,195,247,0.05))';this.style.borderColor='rgba(79,195,247,0.3)'">
        <span style="font-size: 9px;">▶</span> Show
      </button>
      <button id="build-bar-close" style="
        background: transparent;
        border: none;
        color: #555;
        cursor: pointer;
        font-size: 18px;
        padding: 2px 6px;
        transition: color 0.15s;
        line-height: 1;
      " onmouseover="this.style.color='#999'" onmouseout="this.style.color='#555'">×</button>
    `;
  } else if (type === 'success') {
    bar.style.borderColor = 'rgba(63,185,80,0.4)';
    bar.innerHTML = `
      <div style="
        color: #3fb950; 
        font-size: 18px;
        width: 24px;
        height: 24px;
        background: rgba(63,185,80,0.15);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      ">✓</div>
      <div style="color: #3fb950; font-weight: 600; font-size: 13px;">Build Successful</div>
    `;
    // Auto-hide success after 3 seconds
    setTimeout(() => {
      bar.style.opacity = '0';
      bar.style.transform = 'translateX(-50%) translateY(-100%)';
      bar.style.transition = 'all 0.3s ease-out';
      setTimeout(() => bar.remove(), 300);
    }, 3000);
  }
  
  document.body.appendChild(bar);
  
  // Add click handlers for error state
  if (type === 'error') {
    bar.querySelector('#build-bar-show')?.addEventListener('click', () => {
      const terminal = document.querySelector('.terminal-content, #terminal, .xterm');
      terminal?.scrollIntoView({ behavior: 'smooth' });
      const terminalTab = document.querySelector('[data-tab="terminal"], [data-panel="terminal"]');
      if (terminalTab instanceof HTMLElement) terminalTab.click();
    });
    
    bar.querySelector('#build-bar-close')?.addEventListener('click', () => {
      bar.style.opacity = '0';
      bar.style.transform = 'translateX(-50%) translateY(-100%)';
      bar.style.transition = 'all 0.3s ease-out';
      setTimeout(() => bar.remove(), 300);
    });
  }
}

/**
 * Hide the build status bar
 */
function hideBuildStatusBar(): void {
  const bar = document.getElementById('build-status-bar');
  if (bar) {
    bar.style.opacity = '0';
    bar.style.transform = 'translateX(-50%) translateY(-100%)';
    bar.style.transition = 'all 0.3s ease-out';
    setTimeout(() => bar.remove(), 300);
  }
}

/**
 * Show error popup with Copy and Ask AI buttons
 */
function showBuildErrorPopup(errors: ParsedError[]): void {
  if (errors.length === 0) return;
  
  // Remove existing popup
  document.getElementById('build-error-popup')?.remove();
  
  // ✅ Also remove any other build-related popups that might exist
  document.getElementById('build-status-popup')?.remove();
  document.getElementById('build-notification')?.remove();
  document.getElementById('error-notification')?.remove();
  document.getElementById('preview-error-bar')?.remove();
  document.getElementById('build-error-bar')?.remove();
  
  // ✅ Remove the right-side buildSystemUI popup/notification
  // This typically appears near the AI chat panel
  document.querySelectorAll('[class*="build-popup"], [class*="error-popup"], [class*="build-notification"], [class*="error-bar"]').forEach(el => {
    if (el.id !== 'build-error-popup') {
      console.log('[BuildSystem] Removing other popup:', el.id || el.className);
      el.remove();
    }
  });
  
  // ✅ Remove any floating notification that shows "Error" and "Build Failed"
  document.querySelectorAll('div').forEach(el => {
    const text = el.textContent || '';
    const style = el.getAttribute('style') || '';
    // Look for floating elements with build error content but not our popup
    if (el.id !== 'build-error-popup' && 
        text.includes('Build Failed') && 
        text.includes('Error') &&
        text.includes('Ask AI') &&
        (style.includes('fixed') || style.includes('absolute'))) {
      console.log('[BuildSystem] Removing floating build notification');
      el.remove();
    }
  });
  
  const errorCount = errors.length;
  const firstError = errors[0];
  
  // Full error text for clipboard
  const fullErrorText = errors.map(e => 
    `${e.file}(${e.line},${e.column}): error ${e.code}: ${e.message}`
  ).join('\n');
  
  // Truncated display
  const displayMsg = firstError.message.length > 45 
    ? firstError.message.substring(0, 45) + '...' 
    : firstError.message;
  const displayText = `${firstError.file}(${firstError.line},${firstError.column}): error ${firstError.code}: ${displayMsg}`;
  
  // Add keyframe styles if not exists
  if (!document.getElementById('build-error-popup-styles')) {
    const style = document.createElement('style');
    style.id = 'build-error-popup-styles';
    style.textContent = `
      @keyframes bepSlideUp {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .bep-btn {
        padding: 7px 14px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.15s;
      }
      .bep-btn:hover { filter: brightness(1.15); }
      .bep-btn-primary { 
        background: linear-gradient(135deg, #0078d4, #106ebe); 
        color: white; 
      }
      .bep-btn-secondary { 
        background: #333; 
        color: #ccc; 
      }
      .bep-copy-btn {
        background: transparent;
        color: #888;
        padding: 3px 8px;
        border: 1px solid #444;
        font-size: 11px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .bep-copy-btn:hover { background: #333; color: #ccc; }
      .bep-copy-btn.copied { 
        background: #1a472a; 
        color: #3fb950; 
        border-color: #3fb950; 
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create popup
  const popup = document.createElement('div');
  popup.id = 'build-error-popup';
  popup.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 20px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 14px 16px;
    min-width: 300px;
    max-width: 450px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 999999;
    animation: bepSlideUp 0.2s ease-out;
  `;
  
  popup.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 8px; height: 8px; background: #f85149; border-radius: 50%; box-shadow: 0 0 6px rgba(248,81,73,0.5);"></span>
        <span style="color: #fff; font-weight: 600; font-size: 13px;">${errorCount} Error${errorCount > 1 ? 's' : ''}</span>
      </div>
      <button class="bep-copy-btn" id="bep-copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 3px;">
          <rect x="9" y="9" width="13" height="13" rx="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>Copy
      </button>
    </div>
    
    <div style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: rgba(248,81,73,0.1); border-radius: 5px; border-left: 3px solid #f85149; margin-bottom: 12px;">
      <span style="color: #f85149;">⊙</span>
      <span style="color: #ccc; font-size: 11px; font-family: 'JetBrains Mono', Consolas, monospace; word-break: break-all; line-height: 1.4;" title="${escapeHtml(fullErrorText)}">${escapeHtml(displayText)}</span>
    </div>
    
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button class="bep-btn bep-btn-primary" id="bep-ai" style="flex: 1;">Ask AI to fix</button>
      <button class="bep-btn bep-btn-secondary" id="bep-later">Later</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // ✅ Keep removing any other build popups for 3 seconds
  let cleanupCount = 0;
  const cleanupInterval = setInterval(() => {
    cleanupCount++;
    document.querySelectorAll('div').forEach(el => {
      const text = el.textContent || '';
      const style = el.getAttribute('style') || '';
      // Look for floating elements with build error content but not our popup
      if (el.id !== 'build-error-popup' && 
          el.id !== 'build-error-popup-styles' &&
          text.includes('Build Failed') && 
          text.includes('Ask AI') &&
          (style.includes('fixed') || style.includes('absolute') || el.className.includes('notification') || el.className.includes('popup'))) {
        console.log('[BuildSystem] Cleanup: removing duplicate popup');
        el.remove();
      }
    });
    if (cleanupCount >= 30) clearInterval(cleanupInterval); // Stop after 3 seconds
  }, 100);
  
  // Copy button handler
  const copyBtn = popup.querySelector('#bep-copy') as HTMLButtonElement;
  copyBtn?.addEventListener('click', async () => {
    try {
      // Try Tauri clipboard first
      try {
        await invoke('write_clipboard', { text: fullErrorText });
      } catch {
        // Fallback to browser API
        await navigator.clipboard.writeText(fullErrorText);
      }
      
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 3px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>Copied!
      `;
      copyBtn.classList.add('copied');
      
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 3px;">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>Copy
        `;
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      console.error('[BuildSystem] Copy failed:', e);
    }
  });
  
  // Ask AI button handler - INTEGRATED PROGRESS IN CHAT PANEL
  const aiBtn = popup.querySelector('#bep-ai') as HTMLButtonElement;
  aiBtn?.addEventListener('click', () => {
    // ✅ STEP 1: Fade out and remove the bottom-left popup
    popup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      popup.remove();
      
      // ✅ STEP 2: Create progress element inside AI chat panel
      // ✅ Try multiple selectors - .ai-chat-container is confirmed to exist
      let chatPanel = document.querySelector(
        '.ai-chat-messages, .chat-messages, .messages-container, ' +
        '#chat-messages, [class*="message-list"], ' +
        '.ai-panel-content, .assistant-messages'
      );
      
      // Fallback: If not found, look inside .ai-chat-container
      if (!chatPanel) {
        const container = document.querySelector('.ai-chat-container, #ai-assistant-panel');
        if (container) {
          // Try to find messages area inside
          chatPanel = container.querySelector('[class*="messages"], [class*="chat-content"]');
          // If still not found, use the container itself
          if (!chatPanel) {
            chatPanel = container;
          }
        }
      }
      
      if (!chatPanel) {
        console.log('[BuildSystem] Chat panel not found');
        return;
      }
      
      console.log('[BuildSystem] ✅ Found chat panel:', chatPanel.className || chatPanel.id);
      
      // Remove any existing progress
      document.getElementById('chat-build-progress')?.remove();
      
      const progressEl = document.createElement('div');
      progressEl.id = 'chat-build-progress';
      progressEl.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #0d1b2a 100%);
        border: 1px solid #1e3a5f;
        border-radius: 12px;
        padding: 14px 16px;
        margin: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        animation: chatProgressSlide 0.3s ease-out;
      `;
      
      // Add animation styles
      if (!document.getElementById('chat-progress-styles')) {
        const style = document.createElement('style');
        style.id = 'chat-progress-styles';
        style.textContent = `
          @keyframes chatProgressSlide {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes chatPulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(248,81,73,0.5); }
            50% { opacity: 0.6; box-shadow: 0 0 12px rgba(248,81,73,0.8); }
          }
          @keyframes chatBounce {
            0%, 80%, 100% { height: 4px; }
            40% { height: 14px; }
          }
        `;
        document.head.appendChild(style);
      }
      
      progressEl.innerHTML = `
        <!-- Header: Build Failed + Error Count -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="
              width: 10px; height: 10px; 
              background: #f85149; 
              border-radius: 50%; 
              box-shadow: 0 0 8px rgba(248,81,73,0.5);
              animation: chatPulse 1.5s ease-in-out infinite;
            "></span>
            <span style="color: #f0f0f0; font-weight: 600; font-size: 14px;">Build Failed</span>
          </div>
          <span style="
            background: rgba(248,81,73,0.15);
            color: #f85149;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid rgba(248,81,73,0.3);
          ">${errorCount} error${errorCount > 1 ? 's' : ''}</span>
        </div>
        
        <!-- AI Status Section -->
        <div style="
          background: rgba(79,195,247,0.08);
          border: 1px solid rgba(79,195,247,0.2);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span id="chat-progress-icon" style="font-size: 18px;">🔍</span>
            <div style="flex: 1;">
              <div id="chat-progress-text" style="color: #4fc3f7; font-weight: 600; font-size: 13px;">Checking errors...</div>
              <div id="chat-progress-detail" style="color: #666; font-size: 10px; margin-top: 2px;">Parsing build output</div>
            </div>
            <div style="display: flex; align-items: flex-end; height: 14px; gap: 2px;">
              <span style="width: 3px; background: #4fc3f7; animation: chatBounce 1s ease-in-out infinite;"></span>
              <span style="width: 3px; background: #4fc3f7; animation: chatBounce 1s ease-in-out 0.1s infinite;"></span>
              <span style="width: 3px; background: #4fc3f7; animation: chatBounce 1s ease-in-out 0.2s infinite;"></span>
              <span style="width: 3px; background: #4fc3f7; animation: chatBounce 1s ease-in-out 0.3s infinite;"></span>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div id="chat-progress-bar" style="
              height: 100%;
              width: 5%;
              background: linear-gradient(90deg, #4fc3f7, #29b6f6);
              border-radius: 2px;
              transition: width 0.3s ease-out;
            "></div>
          </div>
        </div>
        
        <!-- Footer: Elapsed + Cancel -->
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span id="chat-progress-elapsed" style="color: #555; font-size: 10px;">0s elapsed</span>
          <button id="chat-progress-cancel" style="
            background: rgba(248,81,73,0.1);
            border: 1px solid rgba(248,81,73,0.3);
            color: #f85149;
            padding: 5px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s;
          ">Cancel</button>
        </div>
      `;
      
      // Insert at end of chat (before input)
      chatPanel.appendChild(progressEl);
      progressEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // ✅ STEP 3: Build error data
      const maxErrorsForAI = 30;
      const errorsForAI = errors.slice(0, maxErrorsForAI);
      
      const errorsByFile: Record<string, ParsedError[]> = {};
      errorsForAI.forEach(e => {
        if (!errorsByFile[e.file]) errorsByFile[e.file] = [];
        errorsByFile[e.file].push(e);
      });
      
      let errorText = '';
      Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
        errorText += `${file}:\n`;
        fileErrors.forEach(e => {
          errorText += `  Line ${e.line}: ${e.code} - ${e.message}\n`;
        });
      });
      
      if (errors.length > maxErrorsForAI) {
        errorText += `\n(+${errors.length - maxErrorsForAI} more errors)\n`;
      }
      
      // Create collapsible message for chat UI
      const fileCount = Object.keys(errorsByFile).length;
      const aiMessage = "```build-errors\n" + errorText.trim() + "\n```\n\nFix the errors above. Provide the corrected code for each affected file.";
      
      // After message is sent, make it collapsible in UI
      const makeCollapsible = () => {
        console.log('[BuildSystem] 🔵 makeCollapsible ENTRY');
        let attempts = 0;
        const maxAttempts = 20; // Increased from 10
        
        const tryCollapse = () => {
          attempts++;
          console.log(`[BuildSystem] 🔄 makeCollapsible attempt ${attempts}/${maxAttempts}`);
          
          // Find chat container first
          const chatContainer = document.querySelector('.ai-chat-container, .chat-container, #ai-assistant-panel');
          if (!chatContainer) {
            console.log('[BuildSystem] ❌ No chat container found');
            if (attempts < maxAttempts) setTimeout(tryCollapse, 200);
            return;
          }
          
          // Debug: List all child elements with their classes
          const allChildren = chatContainer.querySelectorAll('*');
          console.log(`[BuildSystem] 📦 Total elements in chat: ${allChildren.length}`);
          
          // Log first level children
          const directChildren = chatContainer.children;
          console.log(`[BuildSystem] 👶 Direct children: ${directChildren.length}`);
          for (let i = 0; i < Math.min(5, directChildren.length); i++) {
            console.log(`[BuildSystem]   Child ${i}: ${directChildren[i].className || directChildren[i].tagName}`);
          }
          
          // Find any element containing "build-errors" text
          let targetElement: HTMLElement | null = null;
          let foundText = false;
          let buildErrorsElement: HTMLElement | null = null;
          
          for (const el of Array.from(allChildren)) {
            const text = el.textContent || '';
            if (text.includes('build-errors') && !foundText) {
              console.log(`[BuildSystem] 🔍 Found element with "build-errors": tag=${el.tagName} class="${el.className}"`);
              foundText = true;
              buildErrorsElement = el as HTMLElement;
            }
            if ((text.includes('```build-errors') || text.includes('build-errors')) && 
                (text.includes('Fix the errors') || text.includes('TS1005') || text.includes('Line 20'))) {
              // Find the actual message container (parent with reasonable size)
              let parent = el as HTMLElement;
              while (parent && parent !== chatContainer) {
                // Look for message-like container
                if (parent.classList.contains('message') || 
                    parent.classList.contains('ai-message') ||
                    parent.classList.contains('chat-message') ||
                    parent.getAttribute('data-role') === 'user' ||
                    parent.className.includes('user')) {
                  targetElement = parent;
                  break;
                }
                // Or if it's a direct child of chat container
                if (parent.parentElement === chatContainer) {
                  targetElement = parent;
                  break;
                }
                parent = parent.parentElement as HTMLElement;
              }
              if (targetElement) break;
            }
          }
          
          // Fallback: if we found text but not container, use the element's parent
          if (!targetElement && buildErrorsElement) {
            console.log('[BuildSystem] 🔄 Using fallback: parent of build-errors element');
            // Find closest reasonable parent
            let parent = buildErrorsElement.parentElement;
            while (parent && parent !== chatContainer) {
              // Stop at reasonable container size
              if (parent.offsetHeight > 50 && parent.offsetHeight < 2000) {
                targetElement = parent;
                break;
              }
              parent = parent.parentElement;
            }
            // Last resort: direct parent
            if (!targetElement && buildErrorsElement.parentElement) {
              targetElement = buildErrorsElement.parentElement;
            }
          }
          
          if (!targetElement) {
            console.log('[BuildSystem] ⏳ Build-errors element not found yet...');
            if (attempts < maxAttempts) setTimeout(tryCollapse, 200);
            return;
          }
          
          console.log('[BuildSystem] ✅ Found build-errors element:', targetElement.className);
          const msg = targetElement;
          
          // Already collapsed?
          if (msg.querySelector('.build-error-collapse')) {
            console.log('[BuildSystem] ⏭️ Already collapsed');
            return;
          }
          
          // Extract error info from message content
          const errorText = msg.textContent || '';
          const errorLines = errorText.split('\n').filter(l => l.includes('Line') || l.includes('TS'));
          const errorCount = errorLines.length || 1;
          const fileMatches = errorText.match(/^[^\s:]+\.ts/gm) || [];
          const fileCount = new Set(fileMatches).size || 1;
          
          // Clean and format error text for display
          const formatErrorText = (text: string) => {
            // Remove ```build-errors wrapper and fix prompt
            let clean = text
              .replace(/```build-errors\n?/gi, '')
              .replace(/```\s*$/gm, '')
              .replace(/Fix the errors.*$/gim, '')
              .trim();
            
            console.log('[BuildSystem] Raw error text:', clean.substring(0, 200));
            
            // If empty, return placeholder
            if (!clean) {
              return '<div class="err-plain">No error details available</div>';
            }
            
            // Format each line
            const lines = clean.split('\n');
            let html = '';
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const trimmed = line.trim();
              if (!trimmed) continue;
              
              // Escape HTML for this line
              const escaped = trimmed
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              
              // File header (e.g., "index2.ts:" or "src/file.ts:")
              // Match: filename.ext: at the end OR just filename.ext on its own line
              if (/^[\w\-\.\/\\]+\.(ts|tsx|js|jsx|vue|json|css|scss)s*:?\s*$/i.test(trimmed)) {
                const fileName = trimmed.replace(/:?\s*$/, '');
                html += '<div class="err-file">' + 
                  '<svg width="12" height="12" viewBox="0 0 16 16" fill="#58a6ff" style="margin-right:6px;vertical-align:middle;"><path d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V4.664a.25.25 0 00-.073-.177l-2.914-2.914a.25.25 0 00-.177-.073H3.75zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0111.75 16h-8A1.75 1.75 0 012 14.25V1.75z"/></svg>' +
                  fileName + '</div>';
                continue;
              }
              
              // Error line with various formats
              // Format 1: "Line 20: TS1005 - message"
              // Format 2: "  Line 20: TS1005 - message" (indented)
              const errMatch = trimmed.match(/Line\s*(\d+):\s*(TS\d+)\s*[-–]\s*(.+)/i);
              if (errMatch) {
                const lineNum = errMatch[1];
                const code = errMatch[2];
                const msg = errMatch[3]
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                html += '<div class="err-item">' +
                  '<span class="err-ln">Ln ' + lineNum + '</span>' +
                  '<span class="err-code">' + code + '</span>' +
                  '<span class="err-msg">' + msg + '</span>' +
                  '</div>';
                continue;
              }
              
              // +N more errors (various formats)
              const moreMatch = trimmed.match(/\(?[+＋]?\s*(\d+)\s+more\s+errors?\)?/i);
              if (moreMatch) {
                html += '<div class="err-more">+ ' + moreMatch[1] + ' more errors</div>';
                continue;
              }
              
              // Plain line (anything else)
              html += '<div class="err-plain">' + escaped + '</div>';
            }
            
            // If no HTML was generated, show raw text
            if (!html) {
              html = '<div class="err-plain">' + clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>';
            }
            
            return html;
          };
          
          // Create wrapper
          const wrapper = document.createElement('div');
          wrapper.className = 'build-error-collapse';
          wrapper.innerHTML = `
<style>
.build-error-collapse { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.bec-card {
  background: #1a1a2e;
  border: 1px solid #f8514930;
  border-left: 3px solid #f85149;
  border-radius: 10px;
  overflow: hidden;
}
.bec-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}
.bec-header:hover { background: rgba(255,255,255,0.02); }
.bec-dot {
  width: 8px;
  height: 8px;
  background: #f85149;
  border-radius: 50%;
  box-shadow: 0 0 8px #f8514980;
  animation: pulse 2s infinite;
}
@keyframes pulse { 50% { opacity: 0.5; } }
.build-error-collapse.expanded .bec-dot { animation: none; opacity: 0.6; }
.bec-icon svg { display: block; }
.bec-title { flex: 1; color: #f0f0f0; font-size: 14px; font-weight: 600; }
.bec-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #58a6ff15;
  border: 1px solid #58a6ff40;
  border-radius: 6px;
  color: #58a6ff;
  font-size: 12px;
  font-weight: 500;
}
.bec-chevron { transition: transform 0.3s; }
.build-error-collapse.expanded .bec-chevron { transform: rotate(180deg); }
.bec-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.build-error-collapse.expanded .bec-body { max-height: 400px; }
.bec-errors {
  margin: 0 16px 12px 16px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
}
.bec-errors-head {
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  color: #8b949e;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.bec-errors-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
}
.err-file {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(90deg, #58a6ff15 0%, transparent 100%);
  border-left: 2px solid #58a6ff;
  color: #58a6ff;
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', Consolas, monospace;
  margin-top: 4px;
}
.err-file:first-child { margin-top: 0; }
.err-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #21262d50;
  font-size: 12px;
}
.err-item:last-child { border-bottom: none; }
.err-item:hover { background: #f8514908; }
.err-ln {
  color: #d29922;
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 600;
  font-size: 11px;
  min-width: 45px;
  background: #d2992215;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.err-code {
  color: #f85149;
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 600;
  font-size: 11px;
  background: #f8514920;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.err-msg { 
  color: #e6edf3; 
  flex: 1;
  line-height: 1.4;
}
.err-more {
  padding: 10px 12px;
  color: #8b949e;
  font-size: 12px;
  text-align: center;
  background: #21262d40;
  border-top: 1px dashed #30363d;
  font-style: italic;
}
.err-plain {
  padding: 8px 12px;
  color: #c9d1d9;
  font-size: 12px;
  font-family: 'SF Mono', Consolas, monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.bec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #23863615;
  border-top: 1px solid #23863630;
}
.bec-ai {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7ee787;
  font-size: 12px;
}
.bec-copy {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #8b949e;
  font-size: 11px;
  cursor: pointer;
}
.bec-copy:hover { background: #ffffff08; color: #c9d1d9; }
</style>

<div class="bec-card">
  <div class="bec-header">
    <span class="bec-dot"></span>
    <span class="bec-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    </span>
    <span class="bec-title">Build Failed Log</span>
    <div class="bec-btn">
      <span class="bec-btn-text">Show</span>
      <span class="bec-chevron">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 4.5L6 7.5L9 4.5"/>
        </svg>
      </span>
    </div>
  </div>
  <div class="bec-body">
    <div class="bec-errors">
      <div class="bec-errors-head">Error Output</div>
      <div class="bec-errors-list">
        ${formatErrorText(errorText)}
      </div>
    </div>
    <div class="bec-footer">
      <div class="bec-ai">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span>AI is analyzing...</span>
      </div>
      <button class="bec-copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        <span>Copy</span>
      </button>
    </div>
  </div>
</div>
          `;
          
          // Toggle expand/collapse
          const header = wrapper.querySelector('.bec-header');
          const btnText = wrapper.querySelector('.bec-btn-text');
          
          header?.addEventListener('click', () => {
            wrapper.classList.toggle('expanded');
            if (btnText) {
              btnText.textContent = wrapper.classList.contains('expanded') ? 'Hide' : 'Show';
            }
          });
          
          // Copy button
          const copyBtn = wrapper.querySelector('.bec-copy');
          copyBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const cleanText = errorText
              .replace(/```build-errors\n?/g, '')
              .replace(/```\n?$/g, '')
              .trim();
            navigator.clipboard.writeText(cleanText).then(() => {
              const span = copyBtn.querySelector('span');
              if (span) {
                span.textContent = 'Copied!';
                setTimeout(() => { span.textContent = 'Copy'; }, 2000);
              }
            });
          });
              // Replace message content
              msg.innerHTML = '';
              msg.appendChild(wrapper);
              console.log('[BuildSystem] ✅ Collapsible panel applied!');
              return;
        };
        
        // Start after a short delay to let the message render
        setTimeout(tryCollapse, 500);
        
        // Also set up a MutationObserver as fallback for slower renders
        const chatContainer = document.querySelector('.ai-chat-container, .chat-container, #ai-assistant-panel');
        if (chatContainer) {
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLElement) {
                  const text = node.textContent || '';
                  if (text.includes('build-errors') && !document.querySelector('.build-error-collapse')) {
                    console.log('[BuildSystem] 🔔 MutationObserver detected build-errors message');
                    observer.disconnect();
                    setTimeout(tryCollapse, 100);
                    return;
                  }
                }
              }
            }
          });
          observer.observe(chatContainer, { childList: true, subtree: true });
          // Stop observing after 10 seconds
          setTimeout(() => observer.disconnect(), 10000);
        }
      };
      
      // ✅ STEP 4: Status animation
      const statusMessages = [
        { icon: '🔍', text: 'Checking errors...', detail: 'Parsing build output', progress: 10 },
        { icon: '🧠', text: 'AI analyzing...', detail: 'Finding solutions', progress: 25 },
        { icon: '📤', text: 'Sending to AI...', detail: 'Preparing request', progress: 40 },
        { icon: '⚡', text: 'Processing...', detail: 'Generating fix', progress: 60 },
        { icon: '💡', text: 'Finding best fix...', detail: 'Evaluating options', progress: 75 },
        { icon: '✍️', text: 'Writing code...', detail: 'Almost done', progress: 88 },
        { icon: '✅', text: 'Finalizing...', detail: 'Preparing output', progress: 95 }
      ];
      
      let currentStatus = 0;
      const startTime = Date.now();
      
      const statusInterval = setInterval(() => {
        const icon = document.querySelector('#chat-progress-icon');
        const text = document.querySelector('#chat-progress-text');
        const detail = document.querySelector('#chat-progress-detail');
        const progress = document.querySelector('#chat-progress-bar') as HTMLElement;
        const elapsed = document.querySelector('#chat-progress-elapsed');
        const el = document.getElementById('chat-build-progress');
        
        if (!icon || !el?.isConnected) {
          clearInterval(statusInterval);
          return;
        }
        
        // Update elapsed
        if (elapsed) {
          elapsed.textContent = `${Math.floor((Date.now() - startTime) / 1000)}s elapsed`;
        }
        
        // Advance status
        if (currentStatus < statusMessages.length - 1) {
          currentStatus++;
          const msg = statusMessages[currentStatus];
          icon.textContent = msg.icon;
          if (text) text.textContent = msg.text;
          if (detail) detail.textContent = msg.detail;
          if (progress) progress.style.width = `${msg.progress}%`;
        }
      }, 1800);
      
      // Cancel button
      progressEl.querySelector('#chat-progress-cancel')?.addEventListener('click', () => {
        clearInterval(statusInterval);
        progressEl.style.opacity = '0';
        progressEl.style.transform = 'translateY(-10px)';
        progressEl.style.transition = 'all 0.3s ease';
        setTimeout(() => progressEl.remove(), 300);
      });
      
      // ✅ STEP 5: Send to AI
      setTimeout(() => {
        // Update to "Sending" state
        const icon = document.querySelector('#chat-progress-icon');
        const text = document.querySelector('#chat-progress-text');
        const detail = document.querySelector('#chat-progress-detail');
        const progress = document.querySelector('#chat-progress-bar') as HTMLElement;
        if (icon) icon.textContent = '📤';
        if (text) text.textContent = 'Sending to AI...';
        if (detail) detail.textContent = 'Preparing request';
        if (progress) progress.style.width = '40%';
        currentStatus = 2;
        
        const input = document.querySelector('#ai-assistant-input, .ai-chat-input, #ai-input, textarea[placeholder*="message"]') as HTMLTextAreaElement;
        if (!input) {
          clearInterval(statusInterval);
          progressEl.remove();
          return;
        }
        
        input.value = aiMessage;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        
        setTimeout(() => {
          console.log('[BuildSystem] 🎯 Looking for send button...');
          const sendBtn = document.querySelector('#send-btn, .modern-send-btn, button[type="submit"], .send-button') as HTMLButtonElement;
          console.log('[BuildSystem] 🎯 Send button found:', !!sendBtn, sendBtn?.className);
          if (sendBtn) {
            sendBtn.click();
            console.log('[BuildSystem] 🎯 Send button clicked, calling makeCollapsible...');
            
            // Make the error message collapsible in UI
            makeCollapsible();
            console.log('[BuildSystem] 🎯 makeCollapsible called');
            
            // Watch for AI response to hide progress
            const responseObserver = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                  if (node instanceof HTMLElement) {
                    const isResponse = node.classList.contains('ai-message') || 
                                      node.classList.contains('assistant-message') ||
                                      node.querySelector?.('.ai-message, .assistant-message');
                    if (isResponse) {
                      clearInterval(statusInterval);
                      const el = document.getElementById('chat-build-progress');
                      if (el) {
                        // Show completion briefly
                        const icon = el.querySelector('#chat-progress-icon');
                        const text = el.querySelector('#chat-progress-text');
                        const progress = el.querySelector('#chat-progress-bar') as HTMLElement;
                        if (icon) icon.textContent = '✅';
                        if (text) text.textContent = 'Complete!';
                        if (progress) progress.style.width = '100%';
                        
                        setTimeout(() => {
                          el.style.opacity = '0';
                          el.style.transform = 'translateY(-10px)';
                          el.style.transition = 'all 0.3s ease';
                          setTimeout(() => el.remove(), 300);
                        }, 800);
                      }
                      
                      responseObserver.disconnect();
                      return;
                    }
                  }
                }
              }
            });
            
            if (chatPanel) {
              responseObserver.observe(chatPanel, { childList: true, subtree: true });
            }
          }
        }, 50);
      }, 300);
    }, 200);
  });
  
  // Later button handler
  const laterBtn = popup.querySelector('#bep-later') as HTMLButtonElement;
  laterBtn?.addEventListener('click', () => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    popup.style.transition = 'all 0.15s';
    setTimeout(() => popup.remove(), 150);
  });
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.getElementById('build-error-popup')) {
      popup.style.opacity = '0';
      popup.style.transition = 'opacity 0.2s';
      setTimeout(() => popup.remove(), 200);
    }
  }, 15000);
}

// ============================================================================
// ERROR PARSING & SUGGESTIONS
// ============================================================================

function parseErrors(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  
  // TypeScript: src/App.tsx(19,1): error TS2304: Cannot find name 'bbbb'
  const tsPattern1 = /([^\s(]+)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)/g;
  let match;
  
  while ((match = tsPattern1.exec(output)) !== null) {
    errors.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      code: match[4],
      message: match[5],
      category: categorizeError(match[4], match[5])
    });
  }
  
  // TypeScript: src/App.tsx:19:1 - error TS2304
  const tsPattern2 = /([^\s:]+):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)/g;
  while ((match = tsPattern2.exec(output)) !== null) {
    if (!errors.some(e => e.file === match[1] && e.line === parseInt(match[2]))) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: match[4],
        message: match[5],
        category: categorizeError(match[4], match[5])
      });
    }
  }
  
  // Rust: error[E0425]: cannot find value
  const rustPattern = /error\[(E\d+)\]:\s*(.+?)[\r\n]\s*-->\s*([^:]+):(\d+):(\d+)/gs;
  while ((match = rustPattern.exec(output)) !== null) {
    errors.push({
      file: match[3],
      line: parseInt(match[4]),
      column: parseInt(match[5]),
      code: match[1],
      message: match[2],
      category: categorizeError(match[1], match[2])
    });
  }
  
  return errors;
}

function categorizeError(code: string, message: string): ParsedError['category'] {
  const msg = message.toLowerCase();
  if (code === 'TS2304' || code === 'TS2552' || msg.includes('cannot find name')) return 'reference';
  if (code === 'TS2307' || msg.includes('cannot find module')) return 'import';
  if (msg.includes('type') && msg.includes('not assignable')) return 'type';
  if (msg.includes('unexpected') || msg.includes('expected')) return 'syntax';
  return 'unknown';
}

function getSuggestions(error: ParsedError): string[] {
  const name = error.message.match(/['"`]([^'"`]+)['"`]/)?.[1] || 'identifier';
  
  switch (error.category) {
    case 'reference':
      return [
        `Check spelling of the identifier`,
        `Define '${name}' before using it`,
        `Add import: import { ${name} } from '...'`
      ];
    case 'import':
      return [
        `Run npm install to install dependencies`,
        `Check the import path is correct`,
        `Verify the module/file exists`
      ];
    case 'type':
      return [
        `Check expected vs actual type`,
        `Add explicit type annotation`,
        `Use type assertion: value as Type`
      ];
    case 'syntax':
      return [
        `Check brackets and parentheses`,
        `Look at the line above for issues`,
        `Format code with Shift+Alt+F`
      ];
    default:
      return [
        `Search the error message online`,
        `Check the documentation`
      ];
  }
}

function showErrorHelp(errors: ParsedError[]): void {
  if (errors.length === 0) return;
  
  const t = getTerminal();
  if (!t) return;
  
  const projectPath = getCurrentProjectPath();
  setupErrorNavigation();
  
  // Header
  termLine(`💡 How to Fix (${errors.length})`, '#d29922');
  
  errors.slice(0, 5).forEach((error) => {
    const suggestions = getSuggestions(error);
    const escapedPath = projectPath.replace(/\\/g, '\\\\');
    
    // File - clickable
    const fileEl = document.createElement('div');
    fileEl.className = 'bld';
    fileEl.style.cssText = 'cursor:pointer';
    fileEl.innerHTML = `<span style="color:#f85149">⊙</span> <span style="color:#f85149;text-decoration:underline">${error.file}:${error.line}:${error.column}</span>`;
    fileEl.onclick = () => (window as any).__goToError?.(error.file, error.line, error.column, projectPath);
    t.appendChild(fileEl);
    
    // Error code & message
    termLine(`  ${error.code || 'ERR'}: ${error.message}`, '#e0e0e0');
    
    // Suggestions
    suggestions.forEach((s) => {
      termLine(`  ▸ ${s}`, '#4ec9b0');
    });
  });
  
  if (errors.length > 5) {
    termLine(`  +${errors.length - 5} more errors`, '#666');
  }
  
  t.scrollTop = t.scrollHeight;
}

function setupErrorNavigation(): void {
  if ((window as any).__goToError) return;
  
  (window as any).__goToError = async (file: string, line: number, column: number, basePath: string) => {
    let fullPath = file;
    
    // Build full path if file is relative
    if (!file.match(/^[A-Za-z]:/) && !file.startsWith('/')) {
      const sep = basePath.includes('\\') ? '\\' : '/';
      const cleanFile = file.replace(/^\.?[\/\\]/, '');
      fullPath = basePath + sep + cleanFile;
    }
    
    console.log('[BuildSystem] Opening:', fullPath, 'Line:', line, 'Col:', column);
    
    try {
      const w = window as any;
      
      // Use openFileInTab - this reads file, creates tab, and jumps to line
      if (w.openFileInTab) {
        console.log('[BuildSystem] Using window.openFileInTab');
        await w.openFileInTab(fullPath, line);
        
        // Add error highlight after a short delay
        setTimeout(() => {
          const editor = w.monaco?.editor?.getEditors?.()?.[0];
          if (editor) {
            // Set cursor column
            editor.setPosition({ lineNumber: line, column: column || 1 });
            
            // Add red error highlight
            const decs = editor.deltaDecorations([], [{
              range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1000 },
              options: { isWholeLine: true, className: 'error-line-highlight' }
            }]);
            setTimeout(() => editor.deltaDecorations(decs, []), 3000);
          }
        }, 300);
      } else {
        console.error('[BuildSystem] window.openFileInTab not found!');
      }
    } catch (e) {
      console.error('[BuildSystem] Failed to open:', e);
    }
  };
  
  // Add highlight style
  if (!document.getElementById('error-highlight-css')) {
    const style = document.createElement('style');
    style.id = 'error-highlight-css';
    style.textContent = `.error-line-highlight{background:rgba(248,81,73,0.2)!important}`;
    document.head.appendChild(style);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// FILE SYSTEM
// ============================================================================

async function fileExists(dirPath: string, fileName: string | string[]): Promise<boolean> {
  try {
    const files = Array.isArray(fileName) ? fileName : [fileName];
    const sep = dirPath.includes('\\') ? '\\' : '/';
    
    for (const file of files) {
      // ✅ Handle wildcard patterns like *.ino
      if (file.includes('*')) {
        // For wildcard patterns, try to list directory
        try {
          const pattern = file.replace('*', '');
          let dirContents: any[] = [];
          
          // Try different possible directory listing commands
          try {
            dirContents = await invoke<any[]>('list_directory', { path: dirPath });
          } catch {
            try {
              dirContents = await invoke<any[]>('list_files', { path: dirPath });
            } catch {
              try {
                dirContents = await invoke<any[]>('get_files', { path: dirPath });
              } catch {
                // No directory listing command - skip wildcard check
                continue;
              }
            }
          }
          
          const hasMatch = dirContents.some((f: any) => {
            const name = typeof f === 'string' ? f : (f.name || f.path || '');
            return name.endsWith(pattern);
          });
          if (hasMatch) return true;
        } catch { continue; }
      } else {
        try {
          const exists = await invoke<boolean>('file_exists', { path: `${dirPath}${sep}${file}` });
          if (exists) return true;
        } catch { continue; }
      }
    }
    return false;
  } catch { return false; }
}

export async function detectBuildSystem(projectPath: string): Promise<BuildSystem | null> {
  if (!projectPath || projectPath === '.') return null;
  
  const sep = projectPath.includes('\\') ? '\\' : '/';
  const folderName = projectPath.split(sep).pop() || '';
  
  // ✅ ARDUINO DETECTION - Check for .ino files first
  // Arduino convention: sketch file has same name as folder (e.g., MyProject/MyProject.ino)
  try {
    const sketchPath = `${projectPath}${sep}${folderName}.ino`;
    const hasSketch = await invoke<boolean>('file_exists', { path: sketchPath });
    
    // Also check for common sketch names
    let hasInoFile = hasSketch;
    if (!hasInoFile) {
      const commonNames = ['sketch.ino', 'main.ino', 'program.ino'];
      for (const name of commonNames) {
        try {
          const exists = await invoke<boolean>('file_exists', { path: `${projectPath}${sep}${name}` });
          if (exists) {
            hasInoFile = true;
            break;
          }
        } catch { /* continue */ }
      }
    }
    
    // Also try to list directory if command exists
    if (!hasInoFile) {
      try {
        // Try different possible command names
        let dirContents: any[] = [];
        try {
          dirContents = await invoke<any[]>('list_directory', { path: projectPath });
        } catch {
          try {
            dirContents = await invoke<any[]>('list_files', { path: projectPath });
          } catch {
            try {
              dirContents = await invoke<any[]>('get_files', { path: projectPath });
            } catch { /* No directory listing command available */ }
          }
        }
        
        if (dirContents && dirContents.length > 0) {
          hasInoFile = dirContents.some((f: any) => {
            const name = typeof f === 'string' ? f : (f.name || f.path || '');
            return name.endsWith('.ino');
          });
        }
      } catch { /* No directory listing */ }
    }
    
    if (hasInoFile) {
      const folderLower = folderName.toLowerCase();
      
      // Determine board type from folder name
      if (folderLower.includes('esp32')) {
        console.log('[BuildSystem] ✅ Detected: ESP32 (folder name)');
        return BUILD_SYSTEMS.find(s => s.name === 'esp32') || null;
      }
      if (folderLower.includes('esp8266')) {
        console.log('[BuildSystem] ✅ Detected: ESP8266 (folder name)');
        return BUILD_SYSTEMS.find(s => s.name === 'esp8266') || null;
      }
      if (folderLower.includes('stm32')) {
        console.log('[BuildSystem] ✅ Detected: STM32 (folder name)');
        return BUILD_SYSTEMS.find(s => s.name === 'stm32') || null;
      }
      
      // Check arduino.json for board config
      try {
        const configPath = `${projectPath}${sep}arduino.json`;
        const configContent = await invoke<string>('read_file_content', { path: configPath });
        const config = JSON.parse(configContent);
        if (config.board) {
          if (config.board.includes('esp32')) {
            console.log('[BuildSystem] ✅ Detected: ESP32 (arduino.json)');
            return BUILD_SYSTEMS.find(s => s.name === 'esp32') || null;
          }
          if (config.board.includes('esp8266')) {
            console.log('[BuildSystem] ✅ Detected: ESP8266 (arduino.json)');
            return BUILD_SYSTEMS.find(s => s.name === 'esp8266') || null;
          }
          if (config.board.toLowerCase().includes('stm')) {
            console.log('[BuildSystem] ✅ Detected: STM32 (arduino.json)');
            return BUILD_SYSTEMS.find(s => s.name === 'stm32') || null;
          }
        }
      } catch { /* No arduino.json */ }
      
      // Default to Arduino
      console.log('[BuildSystem] ✅ Detected: Arduino (default)');
      return BUILD_SYSTEMS.find(s => s.name === 'arduino') || null;
    }
  } catch (e) {
    console.log('[BuildSystem] Arduino detection error:', e);
  }
  
  // ✅ STANDARD BUILD SYSTEM DETECTION
  for (const system of [...BUILD_SYSTEMS].sort((a, b) => b.priority - a.priority)) {
    // Skip embedded systems (already handled above)
    if (system.isEmbedded) continue;
    
    if (await fileExists(projectPath, system.detectFile)) {
      console.log('[BuildSystem] ✅ Detected:', system.displayName);
      return system;
    }
  }
  return null;
}

export function getCurrentProjectPath(): string {
  return (window as any).currentFolderPath || 
         localStorage.getItem('currentProjectPath') || 
         localStorage.getItem('lastOpenedFolder') || '.';
}

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

// Check if dependencies need to be installed
async function checkNeedsInstall(projectPath: string, buildSystem: BuildSystem): Promise<boolean> {
  try {
    const sep = projectPath.includes('\\') ? '\\' : '/';
    let depsFolder = '';
    
    // Determine dependencies folder based on build system
    switch (buildSystem.name) {
      case 'npm':
      case 'yarn':
      case 'pnpm':
        depsFolder = 'node_modules';
        break;
      case 'cargo':
        depsFolder = 'target';
        break;
      case 'maven':
        depsFolder = 'target';
        break;
      case 'gradle':
        depsFolder = 'build';
        break;
      case 'go':
        return false; // Go modules download on build
      case 'pip':
      case 'python':
        return false; // pip install is quick enough
      case 'flutter':
        depsFolder = '.dart_tool';
        break;
      case 'dotnet':
        depsFolder = 'obj';
        break;
      // ✅ Arduino-based systems don't need install check
      case 'arduino':
      case 'esp32':
      case 'esp8266':
      case 'stm32':
        return false; // Arduino CLI handles cores separately
      default:
        return true; // Unknown, always install
    }
    
    if (!depsFolder) return false;
    
    const fullPath = `${projectPath}${sep}${depsFolder}`;
    const exists = await invoke<boolean>('file_exists', { path: fullPath });
    return !exists; // Need install if folder doesn't exist
  } catch {
    return true; // On error, install to be safe
  }
}

// Smart script detection from package.json
async function getSmartCommand(projectPath: string, buildSystem: BuildSystem, type: 'build' | 'run' | 'test' | 'clean'): Promise<string> {
  // Only apply smart detection for npm/yarn/pnpm
  if (!['npm', 'yarn', 'pnpm'].includes(buildSystem.name)) {
    switch (type) {
      case 'build': return buildSystem.buildCommand;
      case 'run': return buildSystem.runCommand;
      case 'test': return buildSystem.testCommand || '';
      case 'clean': return buildSystem.cleanCommand || '';
    }
  }
  
  try {
    const sep = projectPath.includes('\\') ? '\\' : '/';
    const packageJsonPath = `${projectPath}${sep}package.json`;
    const content = await invoke<string>('read_file_content', { path: packageJsonPath });
    const pkg = JSON.parse(content);
    const scripts = pkg.scripts || {};
    
    const pm = buildSystem.name; // npm, yarn, or pnpm
    const run = pm === 'npm' ? 'npm run' : pm; // yarn/pnpm don't need 'run'
    
    if (type === 'build') {
      // Priority: build > compile > tsc
      if (scripts.build) return `${run} build`;
      if (scripts.compile) return `${run} compile`;
      if (scripts.tsc) return `${run} tsc`;
      return buildSystem.buildCommand;
    }
    
    if (type === 'run') {
      // Priority: dev > start > serve > preview
      if (scripts.dev) return `${run} dev`;
      if (scripts.start) return `${pm} start`;
      if (scripts.serve) return `${run} serve`;
      if (scripts.preview) return `${run} preview`;
      return buildSystem.runCommand;
    }
    
    if (type === 'test') {
      if (scripts.test) return `${pm} test`;
      return buildSystem.testCommand || '';
    }
    
    if (type === 'clean') {
      if (scripts.clean) return `${run} clean`;
      return buildSystem.cleanCommand || '';
    }
  } catch (e) {
    console.log('[BuildSystem] Could not read package.json, using defaults');
  }
  
  // Fallback to defaults
  switch (type) {
    case 'build': return buildSystem.buildCommand;
    case 'run': return buildSystem.runCommand;
    case 'test': return buildSystem.testCommand || '';
    case 'clean': return buildSystem.cleanCommand || '';
  }
}

async function executeCommand(command: string, workingDir: string, type: RunningProcess['type'] = 'run'): Promise<BuildResult> {
  const startTime = Date.now();
  
  // Generate a pseudo-PID for tracking (real PID comes from Rust)
  const trackingPid = Date.now();
  trackProcess(trackingPid, command, workingDir, type);
  
  try {
    const result = await invoke<any>('execute_build_command', {
      command,
      workingDir,
      streamOutput: true
    });
    
    const duration = Date.now() - startTime;
    
    // Clear tracking when done
    clearProcessTracking();
    
    // Handle different result formats
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    
    if (typeof result === 'string') {
      stdout = result;
    } else if (result && typeof result === 'object') {
      stdout = result.stdout || result.output || '';
      stderr = result.stderr || result.error || '';
      exitCode = result.exit_code ?? result.exitCode ?? (result.success === false ? 1 : 0);
      
      // If Rust returns a PID, update our tracking
      if (result.pid) {
        trackProcess(result.pid, command, workingDir, type);
      }
    }
    
    return {
      success: exitCode === 0,
      output: stdout + (stderr ? '\n' + stderr : ''),
      error: exitCode !== 0 ? stderr : undefined,
      duration,
      exitCode
    };
  } catch (error: any) {
    clearProcessTracking();
    return {
      success: false,
      output: error.stdout || error.output || '',
      error: error.stderr || error.message || String(error),
      duration: Date.now() - startTime,
      exitCode: error.exitCode || 1
    };
  }
}

// ============================================================================
// BUILD FUNCTIONS
// ============================================================================

// Shared Gradle redirect helper - opens Android Panel Build tab
function redirectGradleToPanel(action: string): BuildResult {
  termClear();
  termLine('\u{1F4F1} Android/Gradle project detected', '#4fc3f7');
  termLine('', '#555');
  termLine('\u{2192} Use the Android Panel for ' + action + ':', '#4ec9b0');
  termLine('  \u{2022} Press Ctrl+Shift+D to open Android Panel', '#888');
  termLine('  \u{2022} Use the Build tab for all Gradle operations', '#888');
  termLine('', '#555');
  termLine('Opening Android Panel \u{2192} Build tab...', '#4ec9b0');
  try {
    const ap = (window as any).androidPanel;
    if (ap) { ap.show(); }
    setTimeout(() => {
      const panel = document.getElementById('android-panel');
      if (panel) {
        panel.querySelectorAll('.ap-tab').forEach((btn: any) => {
          if (btn.dataset?.tab === 'build') btn.click();
        });
      }
    }, 300);
  } catch(e) { console.log('Could not auto-open Android Panel', e); }
  return { success: true, output: 'Redirected to Android Panel', error: '', duration: 0, exitCode: 0 };
}

export async function buildProject(buildSystem?: BuildSystem): Promise<BuildResult> {
  const projectPath = getCurrentProjectPath();
  
  if (!buildSystem) {
    buildSystem = await detectBuildSystem(projectPath);
    if (!buildSystem) {
      termClear();
      termLine('❌ No build system detected', '#f85149');
      termLine('💡 Open a folder with package.json, Cargo.toml, etc.', '#9cdcfe');
      return { success: false, output: '', error: 'No build system', duration: 0, exitCode: 1 };
    }
  }
  
  // Redirect Gradle/Android projects to Android Panel
  if (buildSystem.name === 'gradle') {
    termClear();
    termLine('\u{1F4F1} Android/Gradle project detected', '#4fc3f7');
    termLine('', '#555');
    termLine('\u{2192} Use the Android Panel for build, run, and deploy:', '#4ec9b0');
    termLine('  \u{2022} Debug / Release / Clean builds', '#888');
    termLine('  \u{2022} Build + Run on connected device', '#888');
    termLine('  \u{2022} Logcat, Mirror, AI Analyze', '#888');
    termLine('', '#555');
    termLine('Opening Android Panel...', '#4ec9b0');
    try {
      const ap = (window as any).androidPanel;
      if (ap) { ap.show(); }
      setTimeout(() => {
        const panel = document.getElementById('android-panel');
        if (panel) {
          panel.querySelectorAll('.ap-tab').forEach((btn: any) => {
            if (btn.dataset?.tab === 'build') btn.click();
          });
        }
      }, 300);
    } catch(e) { console.log('Could not auto-open Android Panel', e); }
    return { success: true, output: 'Redirected to Android Panel', error: '', duration: 0, exitCode: 0 };
  }

  termClear();
  
  // Header
  const projectName = projectPath.split(/[/\\]/).pop() || 'project';
  termHeader(buildSystem.icon, `Building with ${buildSystem.displayName}`, projectName);
  
  // Check if dependencies need to be installed
  if (buildSystem.installCommand) {
    const needsInstall = await checkNeedsInstall(projectPath, buildSystem);
    
    if (needsInstall) {
      termLine('📦 Installing dependencies...', '#9cdcfe');
      termCommand(buildSystem.installCommand);
      
      startProgress('Installing packages', 'spinner');
      const installResult = await executeCommand(buildSystem.installCommand, projectPath);
      stopProgress();
      
      if (installResult.output) {
        const lines = installResult.output.split('\n').filter(l => l.trim());
        lines.slice(0, 3).forEach(line => termLine(line, '#6a737d'));
        if (lines.length > 3) termLine(`... ${lines.length - 3} more lines`, '#4a4a4a');
      }
    } else {
      termLine('✓ Dependencies already installed', '#3fb950');
    }
  }
  
  // Get smart build command from package.json
  let buildCommand = await getSmartCommand(projectPath, buildSystem, 'build');
  
  // Replace {fqbn} placeholder with selected board (or buildSystem default)
  if (buildCommand.includes('{fqbn}')) {
    const selectedBoard = (window as any).arduinoSelectedBoard || buildSystem.boardFqbn || 'arduino:avr:uno';
    buildCommand = buildCommand.replace(/{fqbn}/g, selectedBoard);
  }
  
  // Build
  termLine('🔨 Building...', '#9cdcfe');
  termCommand(buildCommand);
  
  startProgress('Compiling', 'progress');
  const buildResult = await executeCommand(buildCommand, projectPath);
  stopProgress();
  
  // Output
  if (buildResult.output) {
    buildResult.output.split('\n').forEach(line => {
      if (line.trim()) {
        const isError = /error|failed|✗/i.test(line);
        const isWarn = /warning|warn/i.test(line);
        termLine(line, isError ? '#f85149' : isWarn ? '#d29922' : '#9cdcfe');
      }
    });
  }
  
  // Result - WITH BADGE INTEGRATION
  if (buildResult.success) {
    termStatus(true, 'Build Successful', buildResult.duration);
    clearBuildErrorBadge(); // ✅ Clear badge on success
  } else {
    termStatus(false, 'Build Failed', buildResult.duration);
    
    // Show error suggestions
    const errors = parseErrors(buildResult.output + (buildResult.error || ''));
    if (errors.length > 0) {
      showErrorHelp(errors);
      updateBuildErrorBadge(errors.length); // ✅ Update badge with error count
      showBuildErrorPopup(errors);          // ✅ Show popup with Copy/AI buttons
      
      // ✅ Remove any other build popups that might appear after ours
      setTimeout(() => {
        document.querySelectorAll('[id*="build"][id*="popup"], [id*="error"][id*="bar"], [class*="build-notification"]').forEach(el => {
          if (el.id !== 'build-error-popup' && el.id !== 'build-error-popup-styles') {
            console.log('[BuildSystem] Removing duplicate popup:', el.id || el.className);
            el.remove();
          }
        });
      }, 100);
    } else {
      updateBuildErrorBadge(1); // ✅ At least 1 error occurred
    }
  }
  
  return buildResult;
}

export async function runProject(buildSystem?: BuildSystem): Promise<BuildResult> {
  const projectPath = getCurrentProjectPath();
  
  if (!buildSystem) {
    buildSystem = await detectBuildSystem(projectPath);
    if (!buildSystem) {
      termClear();
      termLine('❌ No build system detected', '#f85149');
      return { success: false, output: '', error: 'No build system', duration: 0, exitCode: 1 };
    }
  }
  
  termClear();
  const projectName = projectPath.split(/[/\\]/).pop() || 'project';
  
  // Get smart run command from package.json
  let runCommand = await getSmartCommand(projectPath, buildSystem, 'run');
  
  // Replace {port} placeholder with actual selected port for Arduino/embedded systems
  if (runCommand.includes('{port}')) {
    const selectedPort = (window as any).arduinoSelectedPort || '';
    if (!selectedPort) {
      termLine('⚠️ No port selected! Please select a port first.', '#f0a000');
      termLine('💡 Go to Arduino menu → Select Port...', '#888');
      return { success: false, output: '', error: 'No port selected', duration: 0, exitCode: 1 };
    }
    runCommand = runCommand.replace(/{port}/g, selectedPort);
  }
  
  // Replace {fqbn} placeholder with selected board (or buildSystem default)
  if (runCommand.includes('{fqbn}')) {
    const selectedBoard = (window as any).arduinoSelectedBoard || buildSystem.boardFqbn || 'arduino:avr:uno';
    runCommand = runCommand.replace(/{fqbn}/g, selectedBoard);
  }
  
  // Check if this is a dev server command (long-running)
  const isDevServer = /\b(dev|start|serve)\b/.test(runCommand);
  
  termHeader('▶️', `Running with ${buildSystem.displayName}`, projectName);
  termCommand(runCommand);
  
  if (isDevServer) {
    // Use streaming for dev servers
    return await runDevServer(runCommand, projectPath);
  } else {
    // Use normal execution for one-time commands
    startProgress('Running', 'spinner');
    const result = await executeCommand(runCommand, projectPath);
    stopProgress();
    
    if (result.output) {
      result.output.split('\n').forEach(line => {
        if (line.trim()) termLine(line, '#9cdcfe');
      });
    }
    
    termStatus(result.success, result.success ? 'Done' : 'Failed', result.duration);
    
    // WITH BADGE INTEGRATION
    if (result.success) {
      clearBuildErrorBadge(); // ✅ Clear badge on success
    } else {
      const errors = parseErrors(result.output + (result.error || ''));
      if (errors.length > 0) {
        showErrorHelp(errors);
        updateBuildErrorBadge(errors.length); // ✅ Update badge
        showBuildErrorPopup(errors);          // ✅ Show popup
        
        // ✅ Remove any other build popups that might appear after ours
        setTimeout(() => {
          document.querySelectorAll('[id*="build"][id*="popup"], [id*="error"][id*="bar"], [class*="build-notification"]').forEach(el => {
            if (el.id !== 'build-error-popup' && el.id !== 'build-error-popup-styles') {
              console.log('[BuildSystem] Removing duplicate popup:', el.id || el.className);
              el.remove();
            }
          });
        }, 100);
      } else {
        updateBuildErrorBadge(1); // ✅ At least 1 error
      }
    }
    
    return result;
  }
}

// Dev server state
let devServerProcess: any = null;

// Run dev server with streaming output
async function runDevServer(command: string, workingDir: string): Promise<BuildResult> {
  const startTime = Date.now();
  
  // Stop any existing dev server
  await stopDevServer();
  
  // Track as dev-server process
  const trackingPid = Date.now();
  trackProcess(trackingPid, command, workingDir, 'dev-server');
  
  startProgress('Starting server', 'spinner');
  
  // Detect likely port from command or defaults
  const port = detectPort(command, workingDir);
  
  try {
    // Start the process (don't await - it won't return for long-running processes)
    const executePromise = invoke<any>('execute_build_command', {
      command,
      workingDir,
      streamOutput: true
    });
    
    // Race between command output and timeout
    const timeoutPromise = new Promise<{timeout: true}>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), 5000); // 5 second timeout
    });
    
    const result = await Promise.race([executePromise, timeoutPromise]);
    
    stopProgress();
    
    if ('timeout' in result) {
      // Timeout reached - server is probably running
      const url = `http://localhost:${port}`;
      
      // Keep process tracked (it's still running)
      // Update PID if available from result
      if (result.pid) {
        trackProcess(result.pid, command, workingDir, 'dev-server');
        devServerProcess = result.pid;
      }
      
      termStatus(true, 'Server Started', Date.now() - startTime);
      showServerInfo(url);
      termLine(`💡 Press Ctrl+C or click Stop to terminate`, '#666');
      
      clearBuildErrorBadge(); // ✅ Server started successfully
      
      return {
        success: true,
        output: 'Dev server started',
        duration: Date.now() - startTime,
        exitCode: 0
      };
    }
    
    // Got actual result - process ended
    clearProcessTracking();
    
    const output = result.stdout || result.output || result || '';
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    
    // Parse output for URLs
    processServerOutput(outputStr, port);
    
    return {
      success: true,
      output: outputStr,
      duration: Date.now() - startTime,
      exitCode: 0
    };
    
  } catch (error: any) {
    stopProgress();
    clearProcessTracking();
    
    // Check if error contains output (server might still be running)
    const errorOutput = error.stdout || error.output || '';
    const errorMsg = error.stderr || error.message || String(error);
    
    // Check for URLs in error output
    const urlMatch = (errorOutput + errorMsg).match(/(https?:\/\/localhost[:\d]*)/i);
    
    if (urlMatch || error.message?.includes('timeout')) {
      // Server is running - keep tracking
      trackProcess(trackingPid, command, workingDir, 'dev-server');
      
      const url = urlMatch ? urlMatch[1] : `http://localhost:${port}`;
      termStatus(true, 'Server Started', Date.now() - startTime);
      showServerInfo(url);
      termLine(`💡 Press Ctrl+C or click Stop to terminate`, '#666');
      
      clearBuildErrorBadge(); // ✅ Server started
      
      return {
        success: true,
        output: errorOutput,
        duration: Date.now() - startTime,
        exitCode: 0
      };
    }
    
    // Actual error
    if (errorOutput) {
      errorOutput.split('\n').forEach((line: string) => {
        if (line.trim()) termLine(line, '#f85149');
      });
    }
    termLine(errorMsg, '#f85149');
    termStatus(false, 'Failed', Date.now() - startTime);
    
    updateBuildErrorBadge(1); // ✅ Server failed to start
    
    return {
      success: false,
      output: errorOutput,
      error: errorMsg,
      duration: Date.now() - startTime,
      exitCode: 1
    };
  }
}

// Detect port from command or package.json
function detectPort(command: string, workingDir: string): number {
  // Check command for port
  const portMatch = command.match(/--port[=\s]+(\d+)|PORT[=\s]+(\d+)|-p[=\s]+(\d+)/i);
  if (portMatch) {
    return parseInt(portMatch[1] || portMatch[2] || portMatch[3]);
  }
  
  // Default ports by framework
  if (command.includes('vite')) return 5173;
  if (command.includes('next')) return 3000;
  if (command.includes('nuxt')) return 3000;
  if (command.includes('vue')) return 8080;
  if (command.includes('angular') || command.includes('ng ')) return 4200;
  if (command.includes('svelte')) return 5000;
  if (command.includes('react-scripts')) return 3000;
  
  // Default
  return 3000;
}

// Process server output and show URLs - WITH PREVIEW INTEGRATION
function processServerOutput(output: string, defaultPort: number): void {
  const lines = output.split('\n');
  let foundUrl = false;
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    // Detect URLs
    const urlMatch = line.match(/(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[:\d]*)/i);
    
    if (urlMatch) {
      showClickableUrl(line, urlMatch[1]);
      foundUrl = true;
    } else {
      const isError = /error|failed/i.test(line);
      const isWarn = /warning|warn/i.test(line);
      termLine(line, isError ? '#f85149' : isWarn ? '#d29922' : '#9cdcfe');
    }
  });
  
  // If no URL found but output looks like server started
  if (!foundUrl && /ready|started|listening|running|compiled/i.test(output)) {
    const url = `http://localhost:${defaultPort}`;
    showServerInfo(url);
  }
}

// Show clickable URL in terminal - WITH PREVIEW BUTTON
function showClickableUrl(line: string, url: string): void {
  const t = getTerminal();
  if (!t) return;
  
  const el = document.createElement('div');
  el.className = 'bld terminal-server-info';
  
  // Escape HTML
  const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Replace URL with clickable link + preview button
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<span onclick="window.open('$1','_blank')" style="color:#4fc3f7;cursor:pointer;text-decoration:underline">$1</span>`
  );
  
  el.innerHTML = `
    ${linked}
    <button class="terminal-preview-btn" onclick="event.stopPropagation();window.previewTab?.open('${url}')" title="Open in Preview Tab">
      🌐 Preview
    </button>
  `;
  
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
  
  // Dispatch event for preview tab auto-open
  dispatchServerUrlEvent(url);
}

// Show server info - WITH PREVIEW BUTTON
function showServerInfo(url: string): void {
  const t = getTerminal();
  if (!t) return;
  
  const el = document.createElement('div');
  el.className = 'bld terminal-server-info';
  el.innerHTML = `
    <span style="color:#3fb950">✓</span>
    <span style="color:#3fb950;font-weight:600">Server Started</span>
    <span onclick="window.open('${url}','_blank')" style="color:#4fc3f7;cursor:pointer;text-decoration:underline">${url}</span>
    <button class="terminal-preview-btn" onclick="event.stopPropagation();window.previewTab?.open('${url}')" title="Open in Preview Tab">
      🌐 Preview
    </button>
  `;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
  
  // Dispatch event for preview tab auto-open
  dispatchServerUrlEvent(url);
}

// Stop dev server
async function stopDevServer(): Promise<void> {
  if (devServerProcess) {
    try {
      await invoke('kill_process', { pid: devServerProcess });
    } catch (e) {
      // Process may already be stopped
    }
    devServerProcess = null;
  }
}

export async function buildAndRun(): Promise<void> {
  const projectPath = getCurrentProjectPath();
  const buildSystem = await detectBuildSystem(projectPath);
  
  if (!buildSystem) {
    termClear();
    termLine('❌ No build system detected', '#f85149');
    termLine('💡 Open a project folder first', '#9cdcfe');
    return;
  }
  
  const buildResult = await buildProject(buildSystem);
  
  if (!buildResult.success) {
    termLine('⚠️  Fix errors above and try again', '#d29922');
    return;
  }
  
  await new Promise(r => setTimeout(r, 500));
  termSeparator();
  await runProject(buildSystem);
}

export async function testProject(buildSystem?: BuildSystem): Promise<BuildResult> {
  const projectPath = getCurrentProjectPath();
  
  if (!buildSystem) {
    buildSystem = await detectBuildSystem(projectPath);
    if (!buildSystem?.testCommand) {
      termClear();
      termLine('❌ No test command available', '#f85149');
      return { success: false, output: '', error: 'No test command', duration: 0, exitCode: 1 };
    }
  }
  
  termClear();
  termHeader('🧪', `Testing with ${buildSystem!.displayName}`);
  termCommand(buildSystem!.testCommand!);
  
  startProgress('Running tests', 'blocks');
  const result = await executeCommand(buildSystem!.testCommand!, projectPath);
  stopProgress();
  
  if (result.output) {
    result.output.split('\n').forEach(line => {
      if (line.trim()) termLine(line, '#9cdcfe');
    });
  }
  
  termStatus(result.success, result.success ? 'Tests Passed' : 'Tests Failed', result.duration);
  
  // WITH BADGE INTEGRATION
  if (result.success) {
    clearBuildErrorBadge(); // ✅ Clear badge on success
  } else {
    // Count test failures
    const failCount = (result.output.match(/fail|error|✗/gi) || []).length || 1;
    updateBuildErrorBadge(failCount); // ✅ Update badge
  }
  
  return result;
}

export async function cleanProject(buildSystem?: BuildSystem): Promise<BuildResult> {
  const projectPath = getCurrentProjectPath();
  
  if (!buildSystem) {
    buildSystem = await detectBuildSystem(projectPath);
    if (!buildSystem?.cleanCommand) {
      termClear();
      termLine('❌ No clean command available', '#f85149');
      return { success: false, output: '', error: 'No clean command', duration: 0, exitCode: 1 };
    }
  }
  
  termClear();
  termHeader('🧹', `Cleaning with ${buildSystem!.displayName}`);
  termCommand(buildSystem!.cleanCommand!);
  
  startProgress('Cleaning', 'spinner');
  const result = await executeCommand(buildSystem!.cleanCommand!, projectPath);
  stopProgress();
  
  termStatus(result.success, result.success ? 'Clean Complete' : 'Clean Failed', result.duration);
  
  if (result.success) {
    clearBuildErrorBadge(); // ✅ Clear badge on clean
  }
  
  return result;
}

export async function showBuildSystemInfo(): Promise<void> {
  const projectPath = getCurrentProjectPath();
  const buildSystem = await detectBuildSystem(projectPath);
  
  termClear();
  termHeader('📊', 'Build System Info', projectPath);
  
  if (buildSystem) {
    termLine(`${buildSystem.icon} ${buildSystem.displayName}`, '#4ec9b0');
    termLine(`   ${buildSystem.description}`, '#9cdcfe');
    
    // Get smart commands
    const buildCmd = await getSmartCommand(projectPath, buildSystem, 'build');
    const runCmd = await getSmartCommand(projectPath, buildSystem, 'run');
    const testCmd = await getSmartCommand(projectPath, buildSystem, 'test');
    const cleanCmd = await getSmartCommand(projectPath, buildSystem, 'clean');
    
    termLine('Commands (from package.json):', '#9cdcfe');
    termLine(`   Build: ${buildCmd}`, '#dcdcaa');
    termLine(`   Run:   ${runCmd}`, '#dcdcaa');
    if (testCmd) termLine(`   Test:  ${testCmd}`, '#dcdcaa');
    if (cleanCmd) termLine(`   Clean: ${cleanCmd}`, '#dcdcaa');
  } else {
    termLine('❌ No build system detected', '#f85149');
    termLine('Supported: npm, yarn, cargo, maven, gradle, cmake, go...', '#9cdcfe');
  }
}

// ============================================================================
// PROJECT CHANGE LISTENER - Refresh build system when project changes
// ============================================================================

let currentDetectedBuildSystem: BuildSystem | null = null;
let cachedProjectPath: string = '';

/**
 * Refresh build system detection and notify UI to update
 * Call this when project changes
 */
export async function refreshBuildSystem(): Promise<void> {
  const projectPath = getCurrentProjectPath();
  
  // Skip if same project
  if (projectPath === cachedProjectPath && currentDetectedBuildSystem) {
    console.log('[BuildSystem] Same project, skipping refresh');
    return;
  }
  
  console.log('[BuildSystem] 🔄 Refreshing build system for:', projectPath);
  
  // Clear cache
  cachedProjectPath = projectPath;
  currentDetectedBuildSystem = await detectBuildSystem(projectPath);
  
  // Dispatch event for UI components to update
  const event = new CustomEvent('build-system-changed', {
    detail: {
      projectPath,
      buildSystem: currentDetectedBuildSystem,
      scripts: await loadProjectScripts(projectPath)
    }
  });
  document.dispatchEvent(event);
  
  console.log('[BuildSystem] ✅ Dispatched build-system-changed event');
  
  // Also dispatch for legacy listeners
  document.dispatchEvent(new CustomEvent('npm-scripts-updated'));
  document.dispatchEvent(new CustomEvent('build-system-refresh'));
}

/**
 * Load npm scripts from package.json
 */
async function loadProjectScripts(projectPath: string): Promise<Record<string, string>> {
  try {
    const sep = projectPath.includes('\\') ? '\\' : '/';
    const packageJsonPath = `${projectPath}${sep}package.json`;
    const content = await invoke<string>('read_file', { path: packageJsonPath });
    const pkg = JSON.parse(content);
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

/**
 * Force refresh - clears cache and reloads
 */
export function forceRefreshBuildSystem(): void {
  cachedProjectPath = '';
  currentDetectedBuildSystem = null;
  refreshBuildSystem();
}

// Setup project change listeners
function setupProjectChangeListeners(): void {
  // Listen for project opened
  document.addEventListener('project-opened', () => {
    console.log('[BuildSystem] 📂 project-opened event');
    setTimeout(refreshBuildSystem, 100);
    setTimeout(refreshBuildSystem, 500);
  });
  
  // Listen for folder opened  
  document.addEventListener('folder-opened', () => {
    console.log('[BuildSystem] 📂 folder-opened event');
    setTimeout(refreshBuildSystem, 100);
  });
  
  // Listen for project created
  document.addEventListener('project-created', () => {
    console.log('[BuildSystem] 🆕 project-created event');
    setTimeout(refreshBuildSystem, 500);
    setTimeout(refreshBuildSystem, 1500);
  });
  
  // Listen for explicit refresh requests
  document.addEventListener('refresh-build-system', () => {
    console.log('[BuildSystem] 🔄 refresh-build-system event');
    forceRefreshBuildSystem();
  });
  
  // Watch for project path changes in localStorage
  let lastKnownPath = localStorage.getItem('currentProjectPath') || '';
  setInterval(() => {
    const currentPath = localStorage.getItem('currentProjectPath') || 
                        (window as any).currentFolderPath || '';
    if (currentPath && currentPath !== lastKnownPath) {
      console.log('[BuildSystem] 📂 Project path changed:', lastKnownPath, '->', currentPath);
      lastKnownPath = currentPath;
      setTimeout(refreshBuildSystem, 100);
    }
  }, 1000);
  
  console.log('[BuildSystem] 👂 Project change listeners ready');
}

// Initialize listeners
if (typeof window !== 'undefined') {
  setupProjectChangeListeners();
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).buildSystem = {
    // Build functions
    buildAndRun,
    buildProject,
    runProject,
    testProject,
    cleanProject,
    showBuildSystemInfo,
    
    // Detection
    detectBuildSystem,
    getCurrentProjectPath,
    BUILD_SYSTEMS,
    
    // Process management
    stopProject,
    isProcessRunning,
    getRunningProcess,
    
    // Preview integration
    openPreview,
    getLastServerUrl: () => lastDetectedServerUrl,
    
    // Refresh
    refresh: refreshBuildSystem,
    forceRefresh: forceRefreshBuildSystem,
    loadProjectScripts,
    
    // ✅ NEW: Badge control
    updateErrorBadge: updateBuildErrorBadge,
    clearErrorBadge: clearBuildErrorBadge,
    showErrorPopup: showBuildErrorPopup,
    
    // ✅ NEW: Status bar control
    showStatusBar: showBuildStatusBar,
    hideStatusBar: hideBuildStatusBar,
  };
  
  console.log('[BuildSystem] ✅ Build System ready');
  console.log('[BuildSystem] ⏹️ Stop function available: window.buildSystem.stopProject()');
  console.log('[BuildSystem] 🔄 Refresh: window.buildSystem.refresh()');
  console.log('[BuildSystem] 🔴 Badge: window.buildSystem.updateErrorBadge(count)');
}