// ============================================================================
// JETSON FEATURE 1: Remote Interactive Terminal
// File: src/jetson/jetsonTerminal.ts
// Uses: jetson_execute (existing command) in command-queue mode
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

interface TerminalEntry {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: number;
}

let terminalPanel: HTMLElement | null = null;
let terminalHistory: string[] = [];
let historyIndex = -1;
let currentDir = '/home/orin_nano';
let terminalEntries: TerminalEntry[] = [];

function addEntry(type: TerminalEntry['type'], text: string) {
  terminalEntries.push({ type, text, timestamp: Date.now() });
  const output = document.getElementById('jterm-output');
  if (!output) return;

  const line = document.createElement('div');
  line.className = `jterm-line jterm-${type}`;

  if (type === 'input') {
    line.innerHTML = `<span class="jterm-prompt">${escHtml(currentDir.split('/').pop() || 'orin')}$</span> <span class="jterm-cmd">${escHtml(text)}</span>`;
  } else if (type === 'system') {
    line.innerHTML = `<span class="jterm-sys">${escHtml(text)}</span>`;
  } else if (type === 'error') {
    line.innerHTML = `<span class="jterm-err">${escHtml(text)}</span>`;
  } else {
    line.innerHTML = text.split('\n').map(l => `<span>${escHtml(l)}</span>`).join('<br>');
  }

  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function executeCommand(cmd: string) {
  if (!cmd.trim()) return;

  terminalHistory.unshift(cmd);
  historyIndex = -1;
  addEntry('input', cmd);

  // Handle cd locally (update display dir)
  if (cmd.startsWith('cd ')) {
    const target = cmd.slice(3).trim();
    const fullCmd = `cd ${currentDir} && cd ${target} && pwd`;
    try {
      const res = await invoke<string>('jetson_execute', { command: fullCmd });
      currentDir = (res as any)?.output?.trim() || currentDir;
      updatePrompt();
    } catch(e: any) {
      addEntry('error', `cd: ${target}: No such file or directory`);
    }
    return;
  }

  if (cmd === 'clear') {
    terminalEntries = [];
    const output = document.getElementById('jterm-output');
    if (output) output.innerHTML = '';
    return;
  }

  try {
    const result = await invoke<any>('jetson_execute', {
      command: `cd ${currentDir} && ${cmd}`
    });
    const out = result?.output || result?.stdout || String(result || '');
    const err = result?.stderr || '';
    if (out.trim()) addEntry('output', out.trim());
    if (err.trim()) addEntry('error', err.trim());
  } catch (e: any) {
    addEntry('error', e?.message || String(e));
  }
}

function updatePrompt() {
  const prompt = document.getElementById('jterm-prompt-label');
  const dirName = currentDir.split('/').pop() || 'orin';
  if (prompt) prompt.textContent = `${dirName}$`;
}

export function openJetsonTerminal() {
  if (terminalPanel) {
    terminalPanel.style.display = 'flex';
    focusInput();
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'jterm-panel';
  panel.innerHTML = `
    <style>
      #jterm-panel {
        position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
        width:700px; height:420px; background:#080808;
        border:1px solid #76B900; box-shadow:0 0 30px rgba(118,185,0,0.2);
        display:flex; flex-direction:column; z-index:9999;
        font-family:'JetBrains Mono','Consolas',monospace; font-size:12px;
        resize:both; overflow:hidden; min-width:400px; min-height:200px;
      }
      #jterm-titlebar {
        background:#0f1a00; border-bottom:1px solid #2a3a00;
        padding:7px 12px; display:flex; align-items:center; gap:10px;
        cursor:move; user-select:none; flex-shrink:0;
      }
      #jterm-titlebar span { color:#76B900; font-size:11px; letter-spacing:2px; flex:1; }
      .jterm-tbtn {
        background:none; border:1px solid #333; color:#888;
        width:20px; height:20px; cursor:pointer; font-size:10px;
        display:flex; align-items:center; justify-content:center;
      }
      .jterm-tbtn:hover { border-color:#76B900; color:#76B900; }
      #jterm-output {
        flex:1; overflow-y:auto; padding:10px 14px;
        background:#050505; display:flex; flex-direction:column; gap:2px;
      }
      #jterm-output::-webkit-scrollbar { width:4px; }
      #jterm-output::-webkit-scrollbar-thumb { background:#2a3a00; }
      .jterm-line { line-height:1.7; word-break:break-all; }
      .jterm-prompt { color:#76B900; }
      .jterm-cmd { color:#ffffff; }
      .jterm-output { color:#cccccc; }
      .jterm-error .jterm-err { color:#ff4444; }
      .jterm-system .jterm-sys { color:#888888; font-style:italic; }
      #jterm-inputrow {
        display:flex; align-items:center; padding:8px 14px; gap:8px;
        border-top:1px solid #1a2a00; background:#080808; flex-shrink:0;
      }
      #jterm-prompt-label { color:#76B900; white-space:nowrap; }
      #jterm-input {
        flex:1; background:none; border:none; outline:none;
        color:#ffffff; font-family:inherit; font-size:12px; caret-color:#76B900;
      }
      #jterm-status {
        padding:4px 14px; font-size:10px; color:#555; border-top:1px solid #111;
        background:#060606; letter-spacing:1px; flex-shrink:0;
      }
    </style>
    <div id="jterm-titlebar">
      <span>JETSON TERMINAL — REMOTE SSH</span>
      <button class="jterm-tbtn" id="jterm-clear" title="Clear">✕</button>
      <button class="jterm-tbtn" id="jterm-min" title="Minimize">—</button>
      <button class="jterm-tbtn" id="jterm-close" title="Close">✕</button>
    </div>
    <div id="jterm-output"></div>
    <div id="jterm-inputrow">
      <span id="jterm-prompt-label">orin_nano$</span>
      <input id="jterm-input" type="text" placeholder="Enter command..." autocomplete="off" spellcheck="false"/>
    </div>
    <div id="jterm-status">CONNECTED · TYPE COMMANDS · ↑↓ HISTORY · CTRL+L CLEAR</div>
  `;

  document.body.appendChild(panel);
  terminalPanel = panel;

  // Drag
  const tb = panel.querySelector('#jterm-titlebar') as HTMLElement;
  let ox=0,oy=0,dragging=false;
  tb.addEventListener('mousedown', (e:MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    dragging=true; ox=e.clientX-panel.offsetLeft; oy=e.clientY-panel.offsetTop;
  });
  document.addEventListener('mousemove', (e:MouseEvent) => {
    if (!dragging) return;
    panel.style.left = (e.clientX-ox)+'px';
    panel.style.top = (e.clientY-oy)+'px';
    panel.style.transform = 'none';
    panel.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => { dragging=false; });

  // Buttons
  panel.querySelector('#jterm-close')!.addEventListener('click', () => { panel.style.display='none'; });
  panel.querySelector('#jterm-min')!.addEventListener('click', () => {
    const out = panel.querySelector('#jterm-output') as HTMLElement;
    const inp = panel.querySelector('#jterm-inputrow') as HTMLElement;
    const collapsed = out.style.display === 'none';
    out.style.display = collapsed ? '' : 'none';
    inp.style.display = collapsed ? '' : 'none';
  });
  panel.querySelector('#jterm-clear')!.addEventListener('click', () => {
    const output = document.getElementById('jterm-output');
    if (output) { output.innerHTML = ''; terminalEntries = []; }
  });

  // Input handling
  const input = panel.querySelector('#jterm-input') as HTMLInputElement;
  input.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      input.value = '';
      await executeCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < terminalHistory.length - 1) {
        historyIndex++;
        input.value = terminalHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) { historyIndex--; input.value = terminalHistory[historyIndex]; }
      else { historyIndex = -1; input.value = ''; }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      const output = document.getElementById('jterm-output');
      if (output) { output.innerHTML = ''; terminalEntries = []; }
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      addEntry('system', '^C');
      input.value = '';
    }
  });

  addEntry('system', '── Operator X02 Jetson Remote Terminal ──');
  addEntry('system', `Connected · ${currentDir}`);
  addEntry('system', 'Type commands. Use ↑↓ for history. Ctrl+L to clear.');
  focusInput();
}

function focusInput() {
  setTimeout(() => {
    const input = document.getElementById('jterm-input') as HTMLInputElement;
    if (input) input.focus();
  }, 50);
}
