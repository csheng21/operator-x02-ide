// ============================================================================
// OperatorX02 - Inline Autocomplete (Ghost Text)
// ============================================================================
// Copilot-style ghost text using X02 existing AI system (smartAICall/invoke).
// USAGE: import { initInlineAutocomplete } from './inlineAutocomplete';
//        initInlineAutocomplete(editor);
// ============================================================================

import * as monaco from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';

interface AutocompleteSettings {
  enabled: boolean;
  provider: string;
  model: string;
  debounceMs: number;
  maxTokens: number;
  temperature: number;
  contextLinesBefore: number;
  contextLinesAfter: number;
  minCharsToTrigger: number;
  useProxy: boolean;
}

const SETTINGS_KEY = 'x02_inline_autocomplete';

const DEFAULT_SETTINGS: AutocompleteSettings = {
  enabled: true,
  provider: 'groq',
  model: '',
  debounceMs: 150,
  maxTokens: 128,
  temperature: 0.1,
  contextLinesBefore: 30,
  contextLinesAfter: 10,
  minCharsToTrigger: 3,
  useProxy: false,
};

function loadSettings(): AutocompleteSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AutocompleteSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let settings = loadSettings();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let isActive = false;
let isPaused = false;
let lastLatencyMs = 0;
let lastProvider = '';
let statsAccepted = 0;
let statsTotal = 0;
let statusElement: HTMLElement | null = null;

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'kt', 'c', 'h',
  'cpp', 'hpp', 'cs', 'rb', 'php', 'swift', 'dart', 'lua', 'sql', 'sh',
  'html', 'css', 'scss', 'vue', 'svelte', 'ino', 'pde', 'md',
]);

const SKIP_EXTENSIONS = new Set([
  'json', 'lock', 'env', 'yml', 'yaml', 'toml', 'svg', 'png', 'jpg',
  'gif', 'ico', 'woff', 'woff2', 'map',
]);

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
  py: 'Python', rs: 'Rust', go: 'Go', java: 'Java', kt: 'Kotlin',
  c: 'C', h: 'C/C++ Header', cpp: 'C++', cs: 'C#', rb: 'Ruby', php: 'PHP',
  swift: 'Swift', dart: 'Dart', lua: 'Lua', sql: 'SQL', sh: 'Bash',
  html: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue', svelte: 'Svelte',
  ino: 'Arduino C++', pde: 'Arduino C++', md: 'Markdown',
};

function buildPrompt(
  language: string, filename: string, fileHeader: string,
  textBefore: string, textAfter: string
): string {
  return 'You are an inline code completion engine for ' + language + '.\n' +
    'Complete the code at <CURSOR>. Rules:\n' +
    '- Output ONLY the completion text, no wrapping\n' +
    '- No markdown, no backticks, no explanation\n' +
    '- Match the existing code style (indentation, naming conventions)\n' +
    '- Keep completions concise (1-5 lines for expressions, up to 10 for functions)\n' +
    '- If the cursor is mid-word, complete the word and continue logically\n' +
    '- If unsure, output nothing\n\n' +
    'File: ' + filename + '\n' +
    (fileHeader ? 'Imports:\n' + fileHeader + '\n\n' : '\n') +
    textBefore + '<CURSOR>' + textAfter;
}

async function callAI(prompt: string): Promise<string> {
  const s = settings;
  let provider = s.provider || 'groq';
  let model = s.model || '';
  let apiKey = '';

  try {
    const savedKeys = JSON.parse(localStorage.getItem('savedApiKeys') || '{}');
    apiKey = savedKeys[provider] || '';
    // Fallback: read from aiApiConfig (legacy X02 format)
    if (!apiKey) {
      const legacyConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
      if (legacyConfig.provider === provider && legacyConfig.apiKey && legacyConfig.apiKey !== 'PROXY') {
        apiKey = legacyConfig.apiKey;
      }
    }
  } catch { /* ignore */ }

  // Route 1: Direct API call with user key (fastest)
  if (!s.useProxy && apiKey) {
    console.log('[Autocomplete] Using invoke -> ' + provider);
    try {
      const response = await invoke('call_ai_api', {
        request: {
          provider: provider,
          api_key: apiKey,
          base_url: '',
          model: model || getDefaultModel(provider),
          message: prompt,
          max_tokens: s.maxTokens,
          temperature: s.temperature,
        }
      }) as string;
      return response || '';
    } catch (err) {
      console.warn('[Autocomplete] invoke failed:', err);
    }
  }

  // Route 2: smartAICall proxy
  if (s.useProxy && (window as any).smartAICall) {
    console.log('[Autocomplete] Using smartAICall proxy');
    const response = await (window as any).smartAICall({
      provider: 'operator_x02',
      apiKey: 'PROXY',
      model: model || 'x02-coder',
      message: prompt,
      maxTokens: s.maxTokens,
      temperature: s.temperature,
    });
    return typeof response === 'string' ? response : '';
  }

  // Route 3: Tauri invoke with user API key (fallback)
  if (apiKey) {
    console.log('[Autocomplete] Using invoke -> ' + provider);
    try {
      const response = await invoke('call_ai_api', {
        request: {
          provider: provider,
          api_key: apiKey,
          base_url: '',
          model: model || getDefaultModel(provider),
          message: prompt,
          max_tokens: s.maxTokens,
          temperature: s.temperature,
        }
      }) as string;
      return response || '';
    } catch (err) {
      console.warn('[Autocomplete] invoke failed:', err);
      return '';
    }
  }

  // Route 3: Fallback to proxy
  if ((window as any).smartAICall) {
    const response = await (window as any).smartAICall({
      provider: 'operator_x02',
      apiKey: 'PROXY',
      model: 'x02-coder',
      message: prompt,
      maxTokens: s.maxTokens,
      temperature: s.temperature,
    });
    return typeof response === 'string' ? response : '';
  }

  console.warn('[Autocomplete] No AI provider available');
  return '';
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
    ollama: 'codellama:7b',
    openai: 'gpt-4o-mini',
    claude: 'claude-haiku-4-5-20251001',
    gemini: 'gemini-2.0-flash',
    operator_x02: 'x02-coder',
  };
  return defaults[provider] || 'x02-coder';
}

function cleanResponse(raw: string): string | null {
  if (!raw) return null;
  let text = raw;
  text = text.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
  const prefixes = [
    'Here is the completion:', "Here's the completion:",
    'Completion:', 'Sure, here', 'The completion is:',
  ];
  const lower = text.toLowerCase();
  for (const p of prefixes) {
    if (lower.startsWith(p.toLowerCase())) text = text.slice(p.length);
  }
  text = text.replace(/^\n+/, '').replace(/\n+$/, '');
  if (text.trim().length < 2) return null;
  if (text.includes('<CURSOR>')) return null;
  const lines = text.split('\n');
  if (lines.length > 15) text = lines.slice(0, 10).join('\n');
  return text || null;
}

const cache = new Map<string, { text: string; time: number }>();
const CACHE_TTL = 30000;
const CACHE_MAX = 50;

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.text;
}

function setCache(key: string, text: string): void {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { text, time: Date.now() });
}

function showSettingsPanel(): void {
  const existing = document.getElementById('x02-ac-settings-overlay');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'x02-ac-settings-overlay';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999998;' +
    'background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);' +
    'display:flex;align-items:center;justify-content:center;' +
    'animation:acOverlayIn 0.3s ease;';

  const panel = document.createElement('div');
  panel.id = 'x02-ac-settings';
  panel.style.cssText =
    'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);' +
    'border:1px solid #3b82f6;border-radius:14px;' +
    'padding:24px 28px;max-width:520px;width:92%;font-family:system-ui,sans-serif;' +
    'color:#e0e0e0;font-size:13px;line-height:1.6;' +
    'box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 40px rgba(59,130,246,0.15);' +
    'animation:acToastIn 0.4s cubic-bezier(0.16,1,0.3,1);' +
    'max-height:85vh;overflow-y:auto;';

  const s = settings;
  const stats = getAutocompleteStats();

  panel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:24px;">&#9889;</span>' +
        '<span style="font-weight:700;font-size:17px;color:#60a5fa;">Inline Autocomplete</span>' +
      '</div>' +
      '<button id="x02-ac-settings-close" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:4px;">&times;</button>' +
    '</div>' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:14px 16px;margin-bottom:14px;">' +
      '<div style="font-weight:600;color:#93c5fd;margin-bottom:10px;font-size:13px;">Keyboard Shortcuts</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;align-items:center;">' +
        '<kbd style="background:#2a2a3e;padding:3px 10px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #444;color:#93c5fd;font-weight:600;text-align:center;">Tab</kbd>' +
        '<span style="color:#ccc;font-size:12px;">Accept ghost text suggestion</span>' +
        '<kbd style="background:#2a2a3e;padding:3px 10px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #444;color:#93c5fd;font-weight:600;text-align:center;">Esc</kbd>' +
        '<span style="color:#ccc;font-size:12px;">Dismiss suggestion</span>' +
        '<kbd style="background:#2a2a3e;padding:3px 10px;border-radius:4px;font-family:monospace;font-size:11px;border:1px solid #444;color:#93c5fd;font-weight:600;text-align:center;">Alt+\\</kbd>' +
        '<span style="color:#ccc;font-size:12px;">Manually trigger a suggestion</span>' +
      '</div>' +
    '</div>' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:14px 16px;margin-bottom:14px;">' +
      '<div style="font-weight:600;color:#93c5fd;margin-bottom:10px;font-size:13px;">Settings</div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">' +
        '<span style="color:#ccc;font-size:12px;">Enabled</span>' +
        '<label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">' +
          '<input type="checkbox" id="x02-ac-toggle" ' + (s.enabled ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">' +
          '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (s.enabled ? '#3b82f6' : '#444') + ';border-radius:22px;transition:0.3s;"></span>' +
          '<span style="position:absolute;top:2px;left:' + (s.enabled ? '20px' : '2px') + ';width:18px;height:18px;background:#fff;border-radius:50%;transition:0.3s;"></span>' +
        '</label>' +
      '</div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">' +
        '<span style="color:#ccc;font-size:12px;">Provider</span>' +
        '<select id="x02-ac-provider" style="background:#2a2a3e;color:#e0e0e0;border:1px solid #444;border-radius:6px;padding:4px 8px;font-size:12px;outline:none;cursor:pointer;">' +
          '<option value="groq"' + (s.provider === 'groq' ? ' selected' : '') + '>Groq (Free, Fast)</option>' +
          '<option value="openai"' + (s.provider === 'openai' ? ' selected' : '') + '>OpenAI</option>' +
          '<option value="deepseek"' + (s.provider === 'deepseek' ? ' selected' : '') + '>DeepSeek</option>' +
          '<option value="ollama"' + (s.provider === 'ollama' ? ' selected' : '') + '>Ollama (Local)</option>' +
          '<option value="gemini"' + (s.provider === 'gemini' ? ' selected' : '') + '>Gemini</option>' +
        '</select>' +
      '</div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">' +
        '<span style="color:#ccc;font-size:12px;">Delay (ms)</span>' +
        '<input type="range" id="x02-ac-delay" min="200" max="1000" step="50" value="' + s.debounceMs + '" ' +
          'style="width:120px;accent-color:#3b82f6;cursor:pointer;">' +
        '<span id="x02-ac-delay-val" style="color:#93c5fd;font-size:11px;min-width:40px;text-align:right;">' + s.debounceMs + 'ms</span>' +
      '</div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">' +
        '<span style="color:#ccc;font-size:12px;">Use Proxy</span>' +
        '<label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;">' +
          '<input type="checkbox" id="x02-ac-proxy" ' + (s.useProxy ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">' +
          '<span style="position:absolute;top:0;left:0;right:0;bottom:0;background:' + (s.useProxy ? '#3b82f6' : '#444') + ';border-radius:22px;transition:0.3s;"></span>' +
          '<span style="position:absolute;top:2px;left:' + (s.useProxy ? '20px' : '2px') + ';width:18px;height:18px;background:#fff;border-radius:50%;transition:0.3s;"></span>' +
        '</label>' +
      '</div>' +
    '</div>' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:14px 16px;margin-bottom:14px;">' +
      '<div style="font-weight:600;color:#93c5fd;margin-bottom:8px;font-size:13px;">Stats</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">' +
        '<div style="background:rgba(59,130,246,0.1);border-radius:8px;padding:10px 6px;">' +
          '<div style="font-size:20px;font-weight:700;color:#60a5fa;">' + stats.total + '</div>' +
          '<div style="font-size:10px;color:#888;margin-top:2px;">Suggestions</div>' +
        '</div>' +
        '<div style="background:rgba(16,185,129,0.1);border-radius:8px;padding:10px 6px;">' +
          '<div style="font-size:20px;font-weight:700;color:#34d399;">' + stats.accepted + '</div>' +
          '<div style="font-size:10px;color:#888;margin-top:2px;">Accepted</div>' +
        '</div>' +
        '<div style="background:rgba(245,158,11,0.1);border-radius:8px;padding:10px 6px;">' +
          '<div style="font-size:20px;font-weight:700;color:#fbbf24;">' + (stats.lastLatency > 0 ? stats.lastLatency + 'ms' : '--') + '</div>' +
          '<div style="font-size:10px;color:#888;margin-top:2px;">Latency</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="text-align:center;color:#666;font-size:10px;">' +
      'Operator X02 Inline Autocomplete v1.0 &bull; Right-click AC in status bar to open this panel' +
    '</div>';

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const closePanel = () => {
    panel.style.animation = 'acToastOut 0.3s ease forwards';
    overlay.style.animation = 'acOverlayOut 0.3s ease forwards';
    setTimeout(() => overlay.remove(), 350);
  };

  const closeBtn = document.getElementById('x02-ac-settings-close');
  if (closeBtn) closeBtn.onclick = closePanel;
  overlay.onclick = (e: MouseEvent) => { if (e.target === overlay) closePanel(); };

  const toggleEl = document.getElementById('x02-ac-toggle') as HTMLInputElement;
  if (toggleEl) {
    toggleEl.onchange = () => {
      settings.enabled = toggleEl.checked;
      saveSettings(settings);
      updateStatusBar();
      closePanel();
      showSettingsPanel();
    };
  }

  const providerEl = document.getElementById('x02-ac-provider') as HTMLSelectElement;
  if (providerEl) {
    providerEl.onchange = () => {
      settings.provider = providerEl.value;
      saveSettings(settings);
      updateStatusBar();
      closePanel();
      showSettingsPanel();
    };
  }

  const delayEl = document.getElementById('x02-ac-delay') as HTMLInputElement;
  const delayVal = document.getElementById('x02-ac-delay-val');
  if (delayEl) {
    delayEl.oninput = () => {
      const v = parseInt(delayEl.value);
      settings.debounceMs = v;
      saveSettings(settings);
      if (delayVal) delayVal.textContent = v + 'ms';
    };
  }

  const proxyEl = document.getElementById('x02-ac-proxy') as HTMLInputElement;
  if (proxyEl) {
    proxyEl.onchange = () => {
      settings.useProxy = proxyEl.checked;
      saveSettings(settings);
      closePanel();
      showSettingsPanel();
    };
  }
}

function updateStatusBar(): void {
  if (!statusElement) {
    const bar = document.querySelector(
      '.bottom-status-bar, .status-bar, [class*="statusBar"], [class*="status-bar"], footer'
    );
    if (!bar) return;
    statusElement = document.getElementById('x02-ac-status');
    if (!statusElement) {
      statusElement = document.createElement('span');
      statusElement.id = 'x02-ac-status';
      statusElement.style.cssText =
        'display:inline-flex;align-items:center;gap:4px;padding:1px 8px;' +
        'border-radius:3px;font-size:10px;font-weight:600;cursor:pointer;' +
        'user-select:none;transition:all 0.15s;margin-left:8px;';
      statusElement.title = 'Left-click: toggle | Right-click: settings';
      statusElement.onclick = () => {
        settings.enabled = !settings.enabled;
        saveSettings(settings);
        updateStatusBar();
      };
      statusElement.oncontextmenu = (e: MouseEvent) => {
        e.preventDefault();
        showSettingsPanel();
      };
      bar.appendChild(statusElement);
    }
  }
  if (!settings.enabled) {
    statusElement.textContent = 'AC Off';
    statusElement.style.color = '#565c6e';
    statusElement.style.background = 'transparent';
  } else if (isPaused) {
    statusElement.textContent = 'AC Paused';
    statusElement.style.color = '#f59e0b';
    statusElement.style.background = 'rgba(245,158,11,0.06)';
  } else if (isActive) {
    statusElement.textContent = 'AC ...';
    statusElement.style.color = '#3b82f6';
    statusElement.style.background = 'rgba(59,130,246,0.06)';
  } else {
    const prov = lastProvider || settings.provider || 'AI';
    const lbl = prov.charAt(0).toUpperCase() + prov.slice(1);
    const lat = lastLatencyMs > 0 ? ' | ' + lastLatencyMs + 'ms' : '';
    statusElement.textContent = 'AC: ' + lbl + lat;
    statusElement.style.color = lastLatencyMs > 500 ? '#f59e0b' : '#10b981';
    statusElement.style.background = 'rgba(16,185,129,0.06)';
  }
}

const WELCOME_KEY = 'x02_ac_welcome_shown';
let welcomeShown = false;

function showWelcomeToast(): void {
  if (welcomeShown || localStorage.getItem(WELCOME_KEY)) return;
  welcomeShown = true;
  localStorage.setItem(WELCOME_KEY, '1');

  const overlay = document.createElement('div');
  overlay.id = 'x02-ac-welcome-overlay';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999998;' +
    'background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);' +
    'display:flex;align-items:center;justify-content:center;' +
    'animation:acOverlayIn 0.3s ease;';

  const toast = document.createElement('div');
  toast.id = 'x02-ac-welcome';
  toast.style.cssText =
    'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);' +
    'border:1px solid #3b82f6;border-radius:14px;' +
    'padding:28px 32px;max-width:420px;width:90%;font-family:system-ui,sans-serif;' +
    'color:#e0e0e0;font-size:13px;line-height:1.6;' +
    'box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 40px rgba(59,130,246,0.15);' +
    'animation:acToastIn 0.4s cubic-bezier(0.16,1,0.3,1);';

  const style = document.createElement('style');
  style.textContent =
    '@keyframes acOverlayIn{from{opacity:0}to{opacity:1}}' +
    '@keyframes acOverlayOut{from{opacity:1}to{opacity:0}}' +
    '@keyframes acToastIn{from{opacity:0;transform:scale(0.9) translateY(20px)}' +
    'to{opacity:1;transform:scale(1) translateY(0)}}' +
    '@keyframes acToastOut{from{opacity:1;transform:scale(1)}' +
    'to{opacity:0;transform:scale(0.9)}}' +
    '#x02-ac-welcome kbd{background:#2a2a3e;padding:3px 8px;border-radius:4px;' +
    'font-family:monospace;font-size:11px;border:1px solid #444;' +
    'color:#93c5fd;font-weight:600;min-width:20px;text-align:center;display:inline-block;}' +
    '#x02-ac-welcome .ac-shortcut-row{display:flex;align-items:center;gap:10px;padding:5px 0;}' +
    '#x02-ac-welcome .ac-shortcut-desc{color:#aaa;font-size:12px;}';
  document.head.appendChild(style);

  toast.innerHTML =
    '<div style="text-align:center;margin-bottom:16px;">' +
    '<div style="font-size:36px;margin-bottom:8px;">&#9889;</div>' +
    '<div style="font-weight:700;font-size:18px;color:#60a5fa;">' +
    'Inline Autocomplete</div>' +
    '<div style="font-size:12px;color:#888;margin-top:4px;">' +
    'AI-powered code suggestions are now active</div></div>' +

    '<div style="margin-bottom:16px;text-align:center;color:#ccc;font-size:13px;">' +
    'Ghost text suggestions appear as you type.<br>' +
    'A suggestion just appeared - here is how to use it:</div>' +

    '<div style="background:rgba(255,255,255,0.04);border-radius:8px;' +
    'padding:12px 16px;margin-bottom:16px;">' +
    '<div class="ac-shortcut-row">' +
    '<kbd>Tab</kbd><span class="ac-shortcut-desc">Accept the suggestion</span></div>' +
    '<div class="ac-shortcut-row">' +
    '<kbd>Esc</kbd><span class="ac-shortcut-desc">Dismiss the suggestion</span></div>' +
    '<div class="ac-shortcut-row">' +
    '<kbd>Alt+\\</kbd><span class="ac-shortcut-desc">Trigger suggestion manually</span></div>' +
    '<div class="ac-shortcut-row">' +
    '<kbd>Click AC</kbd><span class="ac-shortcut-desc">Toggle on/off in status bar</span></div>' +
    '</div>' +

    '<div style="text-align:center;">' +
    '<button id="x02-ac-welcome-close" style="background:linear-gradient(135deg,#3b82f6,#2563eb);' +
    'color:#fff;border:none;border-radius:8px;padding:10px 36px;font-size:14px;' +
    'cursor:pointer;font-weight:600;letter-spacing:0.3px;' +
    'transition:all 0.2s;box-shadow:0 4px 12px rgba(59,130,246,0.3);">' +
    'Got it!</button></div>';

  overlay.appendChild(toast);
  document.body.appendChild(overlay);

  const closeToast = () => {
    toast.style.animation = 'acToastOut 0.3s ease forwards';
    overlay.style.animation = 'acOverlayOut 0.3s ease forwards';
    setTimeout(() => { overlay.remove(); style.remove(); }, 350);
  };

  const btn = document.getElementById('x02-ac-welcome-close');
  if (btn) {
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
    btn.onclick = closeToast;
  }
  overlay.onclick = (e: MouseEvent) => { if (e.target === overlay) closeToast(); };
  setTimeout(closeToast, 15000);
}

// ============================================================================
// Custom CSS for inline autocomplete UI
// ============================================================================
function injectAutocompleteStyles(): void {
  const id = 'x02-autocomplete-styles';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    /* ===== GHOST TEXT STYLING ===== */
    .ghost-text-decoration,
    .suggest-preview-text,
    .ghost-text,
    .monaco-editor .ghost-text-decoration {
      color: #4a6a8a !important;
      font-style: italic !important;
      opacity: 0.65 !important;
    }

    /* ===== INLINE SUGGEST TOOLBAR ===== */
    /* Parent toolbar container */
    .monaco-editor .monaco-toolbar .actions-container:has(.codicon-inline-suggestion-hints-previous),
    .monaco-editor ul:has(> .action-item .codicon-inline-suggestion-hints-previous) {
      background: linear-gradient(135deg, #1a1f35 0%, #151a2e 100%) !important;
      border: 1px solid rgba(59, 130, 246, 0.3) !important;
      border-radius: 10px !important;
      padding: 3px 6px !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(59, 130, 246, 0.08) !important;
      backdrop-filter: blur(12px) !important;
      gap: 2px !important;
      margin-top: 4px !important;
      z-index: 100 !important;
    }

    /* ===== ALL TOOLBAR BUTTONS ===== */
    /* Counter label */
    .action-item.availableSuggestionCount > .action-label {
      color: #8899bb !important;
      font-size: 11px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-weight: 500 !important;
      padding: 3px 8px !important;
      border-radius: 6px !important;
      transition: all 0.15s ease !important;
      background: transparent !important;
      border: none !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      letter-spacing: 0.2px !important;
      cursor: pointer !important;
    }

    /* ===== ACCEPT BUTTON â€” PRIMARY (highlighted) ===== */
    /* Accept button - primary blue */
    .action-item.menu-entry:first-of-type > .action-label {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.15)) !important;
      color: #60a5fa !important;
      font-weight: 600 !important;
      border: 1px solid rgba(59, 130, 246, 0.25) !important;
    }

    .action-item.menu-entry:first-of-type > .action-label:hover {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(37, 99, 235, 0.25)) !important;
      color: #93c5fd !important;
      border-color: rgba(59, 130, 246, 0.5) !important;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2) !important;
    }

    /* ===== ACCEPT WORD BUTTON â€” SECONDARY ===== */
    /* Accept Word button - secondary */
    .action-item.menu-entry:nth-of-type(2) > .action-label {
      background: rgba(255, 255, 255, 0.04) !important;
      color: #7888a4 !important;
    }

    .action-item.menu-entry:nth-of-type(2) > .action-label:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #a0b4cc !important;
    }

    /* ===== BUTTON HOVER (general) ===== */
    .action-item.availableSuggestionCount > .action-label:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #c0d0e0 !important;
    }

    /* ===== KEYBOARD SHORTCUT BADGES ===== */
    /* Keybinding badges */
    .action-item.menu-entry .monaco-keybinding-key {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #556688 !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace !important;
      padding: 1px 5px !important;
      border-radius: 4px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      margin-left: 3px !important;
      letter-spacing: 0.3px !important;
    }

    .action-item.menu-entry .monaco-keybinding-key {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #556688 !important;
      font-size: 9.5px !important;
      font-weight: 600 !important;
      padding: 1px 5px !important;
      border-radius: 3px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: none !important;
    }

    /* ===== NAVIGATION ARROWS ===== */
    .codicon-inline-suggestion-hints-previous,
    .codicon-inline-suggestion-hints-next {
      font-size: 12px !important;
      color: #556688 !important;
      padding: 2px !important;
      border-radius: 4px !important;
      transition: all 0.15s ease !important;
    }

    .codicon-inline-suggestion-hints-previous:hover,
    .codicon-inline-suggestion-hints-next:hover {
      color: #8899bb !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }

    /* ===== COUNTER (1/1) ===== */
    .action-item.availableSuggestionCount .action-label {
      color: #445566 !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      padding: 0 2px !important;
      min-width: auto !important;
    }

    /* ===== MORE ACTIONS (...) BUTTON ===== */
    .codicon-toolbar-more {
      color: #445566 !important;
      font-size: 13px !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      transition: all 0.15s ease !important;
    }

    .codicon-toolbar-more:hover {
      color: #8899bb !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }

    /* ===== SEPARATOR ===== */
    .action-item.separator {
      background: rgba(255, 255, 255, 0.06) !important;
      width: 1px !important;
      margin: 2px 3px !important;
    }

    /* ===== ANIMATION ON APPEAR ===== */
    @keyframes acToolbarSlideIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .monaco-editor ul:has(> .action-item .codicon-inline-suggestion-hints-previous) {
      animation: acToolbarSlideIn 0.2s ease !important;
    }

    /* ===== STATUS BAR AC INDICATOR ===== */
    #x02-ac-status {
      font-family: system-ui, -apple-system, sans-serif !important;
      letter-spacing: 0.3px !important;
      transition: all 0.2s ease !important;
    }

    #x02-ac-status:hover {
      opacity: 0.85 !important;
    }
  `;

  document.head.appendChild(style);
  console.log('[Autocomplete] UI styles injected');
}
export function initInlineAutocomplete(
  editor: monaco.editor.IStandaloneCodeEditor
): () => void {
  console.log('[Autocomplete] Initializing...');
  settings = loadSettings();
  injectAutocompleteStyles();

  editor.updateOptions({
    inlineSuggest: { enabled: true, mode: 'subwordSmart' },
  });

  const providerDisposable = monaco.languages.registerInlineCompletionsProvider(
    { pattern: '**' },
    {
      provideInlineCompletions: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _context: monaco.languages.InlineCompletionContext,
        token: monaco.CancellationToken
      ): Promise<monaco.languages.InlineCompletions> => {
        const EMPTY: monaco.languages.InlineCompletions = { items: [] };
        if (!settings.enabled || isPaused || token.isCancellationRequested) return EMPTY;

        const uri = model.uri.toString();
        const filename = uri.split('/').pop() || 'untitled';
        const ext = filename.includes('.') ? filename.split('.').pop() || '' : '';
        if (SKIP_EXTENSIONS.has(ext)) return EMPTY;
        if (CODE_EXTENSIONS.size > 0 && !CODE_EXTENSIONS.has(ext)) return EMPTY;

        const currentLine = model.getValueInRange({
          startLineNumber: position.lineNumber, startColumn: 1,
          endLineNumber: position.lineNumber, endColumn: position.column,
        });
        if (currentLine.trim().length < settings.minCharsToTrigger) return EMPTY;

        const startLine = Math.max(1, position.lineNumber - settings.contextLinesBefore);
        const textBefore = model.getValueInRange({
          startLineNumber: startLine, startColumn: 1,
          endLineNumber: position.lineNumber, endColumn: position.column,
        });
        const endLine = Math.min(model.getLineCount(), position.lineNumber + settings.contextLinesAfter);
        const textAfter = model.getValueInRange({
          startLineNumber: position.lineNumber, startColumn: position.column,
          endLineNumber: endLine, endColumn: model.getLineMaxColumn(endLine),
        });
        if (!textBefore.trim()) return EMPTY;

        const cacheKey = filename + ':' + position.lineNumber + ':' + textBefore.slice(-200);
        const cached = getCached(cacheKey);
        if (cached) {
          return {
            items: [{
              insertText: cached,
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            }],
          };
        }

        if (abortController) abortController.abort();
        if (debounceTimer) clearTimeout(debounceTimer);

        return new Promise<monaco.languages.InlineCompletions>((resolve) => {
          debounceTimer = setTimeout(async () => {
            if (token.isCancellationRequested) { resolve(EMPTY); return; }
            try {
              isActive = true;
              updateStatusBar();
              abortController = new AbortController();
              const startTime = performance.now();

              const language = LANG_MAP[ext] || ext || 'code';
              const headerEnd = Math.min(10, model.getLineCount());
              const fileHeader = model.getValueInRange({
                startLineNumber: 1, startColumn: 1,
                endLineNumber: headerEnd, endColumn: model.getLineMaxColumn(headerEnd),
              });
              const prompt = buildPrompt(language, filename, fileHeader, textBefore, textAfter);
              const rawResponse = await callAI(prompt);
              const latency = Math.round(performance.now() - startTime);

              if (token.isCancellationRequested) { resolve(EMPTY); return; }
              const completion = cleanResponse(rawResponse);
              if (!completion) { resolve(EMPTY); return; }

              lastLatencyMs = latency;
              lastProvider = settings.provider;
              statsTotal++;
              setCache(cacheKey, completion);
              console.log('[Autocomplete] ' + settings.provider + ' in ' + latency + 'ms');

              showWelcomeToast();
              resolve({
                items: [{
                  insertText: completion,
                  range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                }],
              });
            } catch (err: any) {
              if (err?.name !== 'AbortError') console.warn('[Autocomplete] Error:', err);
              resolve(EMPTY);
            } finally {
              isActive = false;
              updateStatusBar();
            }
          }, settings.debounceMs);
        });
      },
      freeInlineCompletions(): void { },
      disposeInlineCompletions(): void { },
    }
  );

  const triggerAction = editor.addAction({
    id: 'x02.autocomplete.trigger',
    label: 'Trigger Inline Autocomplete',
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Backslash],
    run: () => { editor.trigger('x02', 'editor.action.inlineSuggest.trigger', {}); },
  });

  const statusInterval = setInterval(updateStatusBar, 5000);
  setTimeout(updateStatusBar, 1000);
  console.log('[Autocomplete] Ready - provider: ' + settings.provider);



  return () => {
    providerDisposable.dispose();
    if (triggerAction) triggerAction.dispose();
    clearInterval(statusInterval);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (abortController) abortController.abort();
    if (statusElement) statusElement.remove();
  };
}

export function pauseAutocomplete(): void {
  isPaused = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (abortController) abortController.abort();
  updateStatusBar();
}

export function resumeAutocomplete(): void {
  isPaused = false;
  updateStatusBar();
}

export function toggleAutocomplete(): void {
  settings.enabled = !settings.enabled;
  saveSettings(settings);
  updateStatusBar();
}

export function updateAutocompleteSettings(update: Partial<AutocompleteSettings>): void {
  settings = { ...settings, ...update };
  saveSettings(settings);
  updateStatusBar();
}

export function getAutocompleteSettings(): AutocompleteSettings {
  return { ...settings };
}

export function getAutocompleteStats() {
  return {
    total: statsTotal, accepted: statsAccepted,
    rate: statsTotal > 0 ? Math.round((statsAccepted / statsTotal) * 100) : 0,
    lastLatency: lastLatencyMs, lastProvider,
  };
}

(window as any).x02Autocomplete = {
  toggle: toggleAutocomplete,
  pause: pauseAutocomplete,
  resume: resumeAutocomplete,
  settings: () => settings,
  stats: getAutocompleteStats,
  updateSettings: updateAutocompleteSettings,
};