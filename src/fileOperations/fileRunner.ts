// src/fileOperations/fileRunner.ts
// COMPACT + APPEND MODE + RUN BUTTON

import { invoke } from '@tauri-apps/api/core';

const EXECUTION_COMMANDS: Record<string, string> = {
  '.py': 'python', '.py3': 'python3', '.js': 'node', '.mjs': 'node',
  '.ts': 'ts-node', '.tsx': 'tsx', '.jsx': 'node', '.rb': 'ruby',
  '.pl': 'perl', '.php': 'php', '.lua': 'lua', '.r': 'Rscript',
  '.R': 'Rscript', '.jl': 'julia', '.groovy': 'groovy',
  '.ps1': 'powershell -File',
  '.sh': 'bash', '.bash': 'bash', '.zsh': 'zsh',
  '.bat': 'cmd /c', '.cmd': 'cmd /c',
  '.java': 'java', '.c': 'gcc -o temp && ./temp',
  '.cpp': 'g++ -o temp && ./temp', '.cs': 'dotnet run',
  '.go': 'go run', '.rs': 'cargo run', '.dart': 'dart', '.swift': 'swift',
  '.kt': 'kotlinc -script', '.scala': 'scala',
  '.hs': 'runhaskell', '.ml': 'ocaml', '.ex': 'elixir', '.exs': 'elixir',
  '.json': 'cat', '.yaml': 'cat', '.yml': 'cat', '.toml': 'cat',
};

// ============================================================================
// COMPACT TERMINAL OUTPUT - APPEND MODE
// ============================================================================

function getTerminal(): HTMLElement | null {
  return document.getElementById('integrated-terminal-output') || 
         document.querySelector('.terminal-output');
}

function getTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Separator between runs
function termSeparator(): void {
  const t = getTerminal();
  if (!t) return;
  const el = document.createElement('div');
  el.style.cssText = 'height:1px;background:#333;margin:4px 8px;';
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

// Single line output
function termLine(text: string, color: string = '#c9d1d9'): void {
  const t = getTerminal();
  if (!t) return;
  const el = document.createElement('div');
  el.style.cssText = `color:${color};font:11px 'JetBrains Mono',monospace;line-height:1.2;padding:0 8px;margin:0;`;
  el.textContent = text;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

// Header with file and time
function termHeader(fileName: string): void {
  const t = getTerminal();
  if (!t) return;
  const el = document.createElement('div');
  el.style.cssText = `color:#4ec9b0;font:600 11px 'JetBrains Mono',monospace;line-height:1.2;padding:2px 8px 0;margin:0;`;
  el.textContent = `▶ RUN ${fileName} [${getTime()}]`;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

// Status line
function termStatus(success: boolean, text: string): void {
  const t = getTerminal();
  if (!t) return;
  const el = document.createElement('div');
  const color = success ? '#3fb950' : '#f85149';
  const icon = success ? '✓' : '✕';
  el.style.cssText = `color:${color};font:600 11px 'JetBrains Mono',monospace;line-height:1.2;padding:0 8px 2px;margin:0;`;
  el.textContent = `${icon} ${text}`;
  t.appendChild(el);
  t.scrollTop = t.scrollHeight;
}

// Manual clear (user can call this)
export function clearTerminal(): void {
  const t = getTerminal();
  if (t) t.innerHTML = '';
}

// ============================================================================
// HELPERS
// ============================================================================

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    if (typeof e.stderr === 'string') return e.stderr;
  }
  return 'Unknown error';
}

function isReactComponent(content: string, fileName: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (ext !== '.tsx' && ext !== '.jsx') return false;
  const hasJSX = /<[A-Za-z][^>]*>/.test(content);
  const hasReact = /from\s+['"]react['"]/.test(content);
  const hasHooks = content.includes('useState') || content.includes('useEffect');
  return hasJSX && (hasReact || hasHooks);
}

function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window && (window as any).__TAURI__?.core?.invoke;
}

function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
  const colors = { success: '#238636', error: '#da3633', info: '#1f6feb', warning: '#9e6a03' };
  const n = document.createElement('div');
  n.style.cssText = `position:fixed;top:20px;right:20px;padding:8px 14px;border-radius:4px;color:white;font-size:11px;z-index:10001;background:${colors[type]};box-shadow:0 2px 8px rgba(0,0,0,0.3);`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2000);
}

// ============================================================================
// FILE INFO
// ============================================================================

function getCurrentFileInfo(): { path: string; name: string; content: string } | null {
  try {
    const tabManager = (window as any).tabManager;
    if (tabManager?.getActiveTab) {
      const tab = tabManager.getActiveTab();
      if (tab?.path && tab.path !== 'Untitled') {
        return { path: tab.path, name: tab.fileName || tab.name || tab.path.split(/[/\\]/).pop(), content: tab.content || '' };
      }
    }
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor) {
      const content = editor.getModel()?.getValue() || '';
      const path = localStorage.getItem('currentFilePath') || '';
      const name = localStorage.getItem('currentFileName') || document.querySelector('.tab-item.active')?.textContent?.trim().replace(/[*\s]+$/, '') || 'untitled.txt';
      return { path: path || `temp_${Date.now()}_${name}`, name, content };
    }
    return null;
  } catch { return null; }
}

async function saveToTempFile(content: string, fileName: string): Promise<string> {
  const sysInfo = await invoke('get_system_info') as any;
  const tempDir = sysInfo?.temp_dir || (navigator.platform.includes('Win') ? 'C:\\temp' : '/tmp');
  const sep = navigator.platform.includes('Win') ? '\\' : '/';
  const tempPath = `${tempDir}${sep}ide_run_${Date.now()}_${fileName}`;
  await invoke('write_file', { path: tempPath, content });
  return tempPath;
}

// ============================================================================
// EXECUTE FILE - APPEND MODE (no clear!)
// ============================================================================

async function executeFile(filePath: string, fileName: string, content?: string): Promise<void> {
  if (!isTauriAvailable()) {
    showNotification('Requires Tauri desktop app', 'error');
    return;
  }
  
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (!EXECUTION_COMMANDS[ext]) {
    showNotification(`Unknown file type: ${ext}`, 'error');
    return;
  }
  
  // NO CLEAR - just add separator and continue
  termSeparator();
  termHeader(fileName);
  
  // Check React
  if (content && isReactComponent(content, fileName)) {
    termLine('React component - cannot run directly', '#61dafb');
    termLine('Use: npm run dev', '#61dafb');
    termStatus(false, 'Skipped');
    return;
  }
  
  try {
    let actualPath = filePath;
    if (filePath.startsWith('temp_') || filePath.startsWith('handle://') || filePath.startsWith('browser://')) {
      if (!content) throw new Error('No content');
      actualPath = await saveToTempFile(content, fileName);
    }
    
    let cmd = EXECUTION_COMMANDS[ext];
    const isWin = navigator.platform.includes('Win');
    
    if (ext === '.java') {
      cmd = `javac "${actualPath}" && java ${fileName.replace('.java', '')}`;
    } else if (ext === '.cpp' || ext === '.c') {
      cmd = `${ext === '.cpp' ? 'g++' : 'gcc'} "${actualPath}" -o temp && ./temp`;
    } else {
      cmd = `${cmd} "${actualPath}"`;
    }
    
    termLine(`$ ${cmd}`, '#7ee787');
    
    const result = await invoke('execute_command', {
      command: cmd,
      is_powershell: isWin && ext === '.ps1'
    }) as { stdout: string; stderr: string; success: boolean };
    
    if (result.stdout) {
      result.stdout.split('\n').forEach(line => { if (line.trim()) termLine(line); });
    }
    if (result.stderr) {
      result.stderr.split('\n').forEach(line => { if (line.trim()) termLine(line, '#f85149'); });
    }
    
    termStatus(result.success, result.success ? 'Done' : 'Failed');
    
    // Cleanup temp
    if (actualPath !== filePath && actualPath.includes('ide_run_')) {
      try { await invoke('delete_file', { path: actualPath }); } catch {}
    }
    
  } catch (error) {
    termLine(extractErrorMessage(error), '#f85149');
    termStatus(false, 'Error');
  }
}

// ============================================================================
// AUTO-SAVE & RUN
// ============================================================================

async function autoSaveBeforeRun(): Promise<boolean> {
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (!editor) return false;
    const content = editor.getValue();
    const tab = (window as any).tabManager?.getActiveTab();
    if (!tab) return false;
    const { saveFile } = await import('../fileSystem');
    if (tab.path && tab.path !== 'Untitled' && !tab.path.startsWith('temp_')) {
      await saveFile(content, tab.path);
      (window as any).tabManager?.markTabAsSaved?.(tab.id);
      return true;
    } else {
      const savedPath = await saveFile(content, undefined, tab?.fileName || 'untitled.py');
      if (savedPath) {
        (window as any).tabManager?.updateTabPath?.(tab.id, savedPath);
        return true;
      }
      return false;
    }
  } catch { return false; }
}

export async function runCurrentFile(): Promise<void> {
  try {
    if (!isTauriAvailable()) {
      showNotification('Requires Tauri', 'error');
      return;
    }
    
    const fileInfo = getCurrentFileInfo();
    if (!fileInfo) {
      termSeparator();
      termLine('No file open', '#f85149');
      return;
    }
    
    const saved = await autoSaveBeforeRun();
    if (!saved) {
      showNotification('Save cancelled', 'warning');
      return;
    }
    
    await new Promise(r => setTimeout(r, 150));
    
    if (!fileInfo.content) {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) fileInfo.content = editor.getValue();
    }
    
    await executeFile(fileInfo.path, fileInfo.name, fileInfo.content);
    
  } catch (error) {
    termLine(extractErrorMessage(error), '#f85149');
  }
}

// ============================================================================
// FIND TOOLBAR
// ============================================================================

function findToolbar(): HTMLElement | null {
  const selectors = [
    '.menu-bar',
    '.toolbar',
    '.ide-controls',
    '.main-toolbar',
    '.editor-toolbar',
    '.top-bar',
    'header .toolbar',
    '.app-header',
    '[data-toolbar]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.offsetWidth > 0) {
      return element;
    }
  }
  return null;
}

// ============================================================================
// SETUP - WITH RUN BUTTON
// ============================================================================

export function setupFileRunner(): void {
  console.log('🔧 Setting up file runner...');
  
  if (!isTauriAvailable()) {
    console.warn('⚠️ Tauri not available');
  }
  
  const toolbar = findToolbar();
  
  if (toolbar) {
    // Check if Run button already exists
    const existingRunBtn = toolbar.querySelector('.run-button, [title*="Run"], button[data-action="run"]');
    
    if (existingRunBtn) {
      console.log('🔄 Run button exists, updating handler...');
      existingRunBtn.removeEventListener('click', runCurrentFile as EventListener);
      existingRunBtn.addEventListener('click', runCurrentFile as EventListener);
    } else {
      // Create Run button
      const runButton = document.createElement('button');
      runButton.className = 'run-button toolbar-button';
      runButton.title = 'Run current file (F5)';
      runButton.style.cssText = `
        display: flex;
        align-items: center;
        padding: 4px 10px;
        background: transparent;
        color: #cccccc;
        border: none;
        cursor: pointer;
        font-size: 13px;
        margin: 0 4px;
      `;

      runButton.innerHTML = `<span style="color:#3fb950;margin-right:4px;">▶</span>Run`;

      runButton.addEventListener('mouseenter', () => {
        runButton.style.background = '#37373d';
      });

      runButton.addEventListener('mouseleave', () => {
        runButton.style.background = 'transparent';
      });
      
      runButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        runCurrentFile();
      });
      
      // Insert after Plugin menu or at end
      const pluginBtn = Array.from(toolbar.querySelectorAll('button')).find(
        btn => btn.textContent?.includes('Plugin')
      );
      
      if (pluginBtn && pluginBtn.nextSibling) {
        toolbar.insertBefore(runButton, pluginBtn.nextSibling);
      } else {
        toolbar.appendChild(runButton);
      }
      
      console.log('✅ Run button added to toolbar');
    }
  } else {
    console.warn('⚠️ Could not find toolbar');
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // F5 to run
    if (e.key === 'F5' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      runCurrentFile();
    }
    // Ctrl+L to clear terminal
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      clearTerminal();
    }
  });
  
  console.log('✅ File runner setup complete (F5=run, Ctrl+L=clear)');
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getSupportedExtensions(): string[] { return Object.keys(EXECUTION_COMMANDS); }

export function isFileTypeSupported(fileName: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return !!EXECUTION_COMMANDS[ext];
}

export function getCommandForFile(fileName: string): string | null {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return EXECUTION_COMMANDS[ext] || null;
}

export function enforceFixedTerminalHeight(): void {
  ['.terminal-panel', '.terminal-container', '.ide-terminal'].forEach(sel => {
    document.querySelectorAll(sel).forEach((el: any) => {
      el.style.height = el.style.maxHeight = el.style.minHeight = '250px';
    });
  });
}

export function initializeFixedTerminal(): void { enforceFixedTerminalHeight(); }

// Does nothing - logs should accumulate
export function clearTerminalBeforeRun(): void {}

// ============================================================================
// GLOBAL
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).fileRunner = {
    runCurrentFile,
    setupFileRunner,
    getSupportedExtensions,
    isFileTypeSupported,
    getCommandForFile,
    initializeFixedTerminal,
    enforceFixedTerminalHeight,
    clearTerminal,
    clearTerminalBeforeRun
  };
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 FileRunner loaded');
});
