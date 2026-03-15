// src/ide/aiAssistant/aiAnalysisFeatures.ts
// ALL-IN-ONE: Auto-send + Cache + Menu Badges
// DEBUG VERSION - with logging

console.log('🚀 [AIAnalysis] Loading...');

// ============================================================================
// CACHE SYSTEM
// ============================================================================

const CACHE_KEY = 'ai_analysis_cache';

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return `${Math.abs(hash).toString(36)}_${content.length}`;
}

function getCachedAnalysis(content: string, type: string): any {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if (!cache.entries) return null;
    const contentHash = hashContent(content);
    const key = `${contentHash}:${type}`;
    console.log(`[Cache Check] Looking for key: ${key}`);
    console.log(`[Cache Check] Available keys:`, Object.keys(cache.entries));
    const entry = cache.entries[key];
    if (!entry) {
      console.log(`[Cache Check] NOT FOUND`);
      return null;
    }
    if ((Date.now() - entry.timestamp) / 3600000 > 168) return null; // 7 days
    console.log(`[Cache Check] FOUND!`);
    return entry;
  } catch { return null; }
}

function setCachedAnalysis(content: string, type: string, result: string, fileName: string, provider: string): void {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{"version":"1","entries":{}}');
    const contentHash = hashContent(content);
    const key = `${contentHash}:${type}`;
    console.log(`[Cache Save] Saving with key: ${key}`);
    cache.entries[key] = {
      result, timestamp: Date.now(), fileName, provider, contentHash
    };
    // Limit to 100 entries
    const entries = Object.entries(cache.entries);
    if (entries.length > 100) {
      entries.sort((a: any, b: any) => b[1].timestamp - a[1].timestamp);
      cache.entries = Object.fromEntries(entries.slice(0, 100));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`[Cache Save] Saved!`);
  } catch (e) { console.error('[Cache Save] Error:', e); }
}

// ============================================================================
// API CONFIG
// ============================================================================

// Default provider configs (same as PROVIDER_CONFIGS in main.ts)
// Ensures analysis works even before user configures Quick Switch
const DEFAULT_PROVIDER_CONFIGS: Record<string, any> = {
  operator_x02: {
    provider: 'operator_x02',
    apiKey: 'PROXY',
    apiBaseUrl: 'PROXY',
    model: 'x02-coder',
    maxTokens: 4000,
    temperature: 0.7
  },
  groq: {
    provider: 'groq',
    apiKey: 'PROXY',
    apiBaseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 4000,
    temperature: 0.7
  },
  deepseek: {
    provider: 'deepseek',
    apiKey: 'PROXY',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 4000,
    temperature: 0.7
  }
};

function getApiConfig(): any {
  // Source 1: aiApiConfig (current active provider from Quick Switch)
  try {
    const stored = localStorage.getItem('aiApiConfig');
    if (stored) {
      const config = JSON.parse(stored);
      if (config.apiKey) {
        console.log(`[AIAnalysis] Config from aiApiConfig: ${config.provider}`);
        return config;
      }
    }
  } catch {}

  // Source 2: providerConfigs (per-provider saved configs)
  try {
    const providerConfigsStr = localStorage.getItem('providerConfigs');
    if (providerConfigsStr) {
      const providerConfigs = JSON.parse(providerConfigsStr);
      // Try providers in priority order
      for (const provider of ['operator_x02', 'groq', 'deepseek', 'openai', 'claude', 'gemini']) {
        if (providerConfigs[provider]?.apiKey) {
          console.log(`[AIAnalysis] Config from providerConfigs: ${provider}`);
          return providerConfigs[provider];
        }
      }
    }
  } catch {}

  // Source 3: providerApiKeys (just the keys)
  try {
    const keysStr = localStorage.getItem('providerApiKeys');
    if (keysStr) {
      const keys = JSON.parse(keysStr);
      for (const provider of ['operator_x02', 'groq', 'deepseek', 'openai', 'claude', 'gemini']) {
        if (keys[provider]) {
          const base = DEFAULT_PROVIDER_CONFIGS[provider] || { provider, apiBaseUrl: '', model: '' };
          console.log(`[AIAnalysis] Config from providerApiKeys: ${provider}`);
          return { ...base, apiKey: keys[provider] };
        }
      }
    }
  } catch {}

  // Source 4: Legacy ai-ide-api-configuration
  try {
    const ide = JSON.parse(localStorage.getItem('ai-ide-api-configuration') || '{}');
    if (ide.apiKey) {
      console.log(`[AIAnalysis] Config from ai-ide-api-configuration`);
      return ide;
    }
  } catch {}

  // Source 5: Simple apiKey in localStorage
  const simpleKey = localStorage.getItem('apiKey');
  if (simpleKey) {
    console.log(`[AIAnalysis] Config from simple apiKey`);
    return { provider: 'operator_x02', apiKey: simpleKey, apiBaseUrl: 'PROXY', model: 'x02-coder' };
  }

  // Source 6: Hardcoded defaults (operator_x02 is the default)
  console.log(`[AIAnalysis] Using hardcoded default: operator_x02`);
  return { ...DEFAULT_PROVIDER_CONFIGS.operator_x02 };
}

// ============================================================================
// FORMAT RESPONSE - Collapsible Panel (like code blocks)
// ============================================================================

function formatResponse(text: string, type: string = 'analysis'): string {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const shouldCollapse = lineCount > 3; // Collapse if more than 3 lines
  const blockId = `ai-analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Get preview (first 2 lines)
  const previewLines = lines.slice(0, 2).join('\n');
  const previewText = escapeHtmlForPanel(previewLines);
  const fullText = escapeHtmlForPanel(text);
  
  // Type labels and colors
  const typeInfo: Record<string, { label: string; color: string; icon: string }> = {
    explain: { label: 'EXPLANATION', color: '#4fc3f7', icon: '📖' },
    summary: { label: 'SUMMARY', color: '#81c784', icon: '📋' },
    architecture: { label: 'ARCHITECTURE', color: '#ce93d8', icon: '🏗️' },
    dependencies: { label: 'DEPENDENCIES', color: '#ffb74d', icon: '🔗' },
    analysis: { label: 'ANALYSIS', color: '#90caf9', icon: '🔍' }
  };
  
  const info = typeInfo[type] || typeInfo.analysis;
  
  if (!shouldCollapse) {
    // Simple display for short responses
    return `
      <div class="ai-analysis-panel" data-panel-id="${blockId}">
        <div class="ai-analysis-header" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px 8px 0 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:14px;">${info.icon}</span>
          <span style="color:${info.color};font-weight:600;font-size:12px;">${info.label}</span>
          <span style="color:#666;font-size:11px;margin-left:auto;">${lineCount} lines</span>
        </div>
        <div class="ai-analysis-content" style="padding:12px 16px;font-size:13px;line-height:1.6;color:#e6edf3;white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${fullText}</div>
      </div>
    `;
  }
  
  // Collapsible panel for longer responses
  return `
    <div class="ai-analysis-panel collapsible" data-panel-id="${blockId}" data-collapsed="true">
      <style>
        .ai-analysis-panel { background: rgba(30,30,30,0.6); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin: 8px 0; overflow: hidden; }
        .ai-analysis-panel .ai-analysis-content { transition: max-height 0.3s ease; overflow: hidden; }
        .ai-analysis-panel[data-collapsed="true"] .ai-analysis-content { max-height: 80px; }
        .ai-analysis-panel[data-collapsed="false"] .ai-analysis-content { max-height: none; }
        .ai-analysis-panel[data-collapsed="true"] .ai-analysis-full { display: none; }
        .ai-analysis-panel[data-collapsed="false"] .ai-analysis-preview { display: none; }
        .ai-analysis-panel .expand-bar { display: flex; align-items: center; justify-content: center; padding: 8px; background: rgba(0,0,0,0.2); cursor: pointer; border-top: 1px solid rgba(255,255,255,0.06); }
        .ai-analysis-panel .expand-bar:hover { background: rgba(0,0,0,0.3); }
        .ai-analysis-panel .expand-btn { display: flex; align-items: center; gap: 6px; color: #58a6ff; font-size: 12px; background: none; border: none; cursor: pointer; }
        .ai-analysis-panel .expand-btn svg { transition: transform 0.2s; }
        .ai-analysis-panel[data-collapsed="false"] .expand-btn svg { transform: rotate(180deg); }
      </style>
      <div class="ai-analysis-header" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:14px;">${info.icon}</span>
        <span style="color:${info.color};font-weight:600;font-size:12px;">${info.label}</span>
        <span style="color:#666;font-size:11px;margin-left:auto;">${lineCount} lines</span>
      </div>
      <div class="ai-analysis-content" style="padding:12px 16px;font-size:13px;line-height:1.6;color:#e6edf3;white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div class="ai-analysis-preview">${previewText}...</div>
        <div class="ai-analysis-full">${fullText}</div>
      </div>
      <div class="expand-bar" onclick="toggleAnalysisPanel('${blockId}')">
        <button class="expand-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span class="expand-text">Show all ${lineCount} lines</span>
        </button>
      </div>
    </div>
  `;
}

function escapeHtmlForPanel(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Apply markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(110,118,129,0.3);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>')
    .replace(/^### (.+)$/gm, '<div style="color:#4fc3f7;font-weight:600;margin:12px 0 6px;">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#4fc3f7;font-weight:700;font-size:14px;margin:14px 0 8px;">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="color:#4fc3f7;font-weight:700;font-size:16px;margin:16px 0 10px;">$1</div>')
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:16px;">• $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;">$1. $2</div>');
}

// Global toggle function
(window as any).toggleAnalysisPanel = function(panelId: string) {
  const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
  if (!panel) return;
  
  const isCollapsed = panel.getAttribute('data-collapsed') === 'true';
  panel.setAttribute('data-collapsed', isCollapsed ? 'false' : 'true');
  
  const expandText = panel.querySelector('.expand-text');
  if (expandText) {
    const lineCount = panel.querySelector('.ai-analysis-full')?.textContent?.split('\n').length || 0;
    expandText.textContent = isCollapsed ? 'Collapse' : `Show all ${lineCount} lines`;
  }
};

// ============================================================================
// DIRECT ANALYSIS
// ============================================================================

// Store the last analyzed content for menu check
let lastAnalyzedContent: string | null = null;
let lastAnalyzedHash: string | null = null;

async function directAnalysis(type: string, fileName: string, filePath: string): Promise<void> {
  const config = getApiConfig();
  console.log(`[AIAnalysis] Resolved config: provider=${config.provider}, key=${config.apiKey ? config.apiKey.substring(0, 12) + '...' : 'EMPTY'}, model=${config.model || 'default'}`);
  const container = document.querySelector('.ai-chat-container');
  if (!container) return;

  // Get content
  let content = '';
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor?.getModel()) {
      const uri = editor.getModel().uri?.path || '';
      if (uri.includes(fileName) || fileName === 'current') {
        content = editor.getModel().getValue();
        if (fileName === 'current') fileName = uri.split('/').pop() || 'file';
      }
    }
    if (!content && (window as any).__TAURI__ && filePath) {
      const { invoke } = await import('@tauri-apps/api/core');
      content = await invoke('read_file_content', { path: filePath }) as string;
    }
  } catch {}

  if (!content) {
    console.error('[AIAnalysis] No content');
    return;
  }

  // Store for menu check
  lastAnalyzedContent = content;
  lastAnalyzedHash = hashContent(content);
  console.log(`[Analysis] Content hash: ${lastAnalyzedHash}, length: ${content.length}`);

  // Check cache
  const cached = getCachedAnalysis(content, type);
  if (cached) {
    console.log('⚡ [AIAnalysis] Cache hit!');
    showResult(container, type, fileName, cached.result, cached.provider, true);
    return;
  }

  // Show loading
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.innerHTML = `<div class="ai-message-content"><strong>📊 ${type}:</strong> <code>${fileName}</code></div>`;
  container.appendChild(userDiv);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message assistant-message';
  loadingDiv.innerHTML = `<div style="color:#888;display:flex;align-items:center;gap:8px;"><span style="width:16px;height:16px;border:2px solid #444;border-top-color:#0af;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;"></span>Analyzing...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  // Call API
  try {
    if (!config.apiKey) {
      throw new Error('No API key. Please configure a provider in Quick Switch panel (click 🔑 icon).');
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const lang = { ts: 'typescript', js: 'javascript', py: 'python', rs: 'rust' }[ext] || 'code';
    
    const prompts: Record<string, string> = {
      explain: `Explain this ${lang} file "${fileName}":\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nProvide: 1. Purpose 2. Key Components 3. Dependencies 4. Usage 5. Notable Features`,
      summary: `Summarize "${fileName}":\n\n\`\`\`${lang}\n${content}\n\`\`\``,
      architecture: `Analyze architecture of "${fileName}":\n\n\`\`\`${lang}\n${content}\n\`\`\``,
      dependencies: `List dependencies in "${fileName}":\n\n\`\`\`${lang}\n${content}\n\`\`\``
    };

    const { invoke } = await import('@tauri-apps/api/core');
    const response = await invoke('call_ai_api', {
      provider: config.provider || 'groq',
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl || '',
      model: config.model || '',
      message: prompts[type] || prompts.explain,
      maxTokens: 2000,
      temperature: 0.7
    }) as string;

    setCachedAnalysis(content, type, response, fileName, config.provider);
    
    loadingDiv.innerHTML = `
      <div class="ai-message-content">${formatResponse(response, type)}</div>
      <div style="margin-top:8px;font-size:11px;color:#666;">
        ${new Date().toLocaleTimeString()} • ${config.provider} • 💾 cached
      </div>`;
    container.scrollTop = container.scrollHeight;

  } catch (e: any) {
    const errorMsg = e.message || 'Error';
    const providerInfo = config.provider ? ` (${config.provider})` : '';
    loadingDiv.innerHTML = `
      <div style="color:#f55;">❌ <strong>Deep Analysis Failed</strong>${providerInfo}</div>
      <div style="color:#999;font-size:12px;margin-top:4px;">${errorMsg}</div>
    `;
  }
}

function showResult(container: Element, type: string, fileName: string, result: string, provider: string, fromCache: boolean): void {
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.innerHTML = `<div class="ai-message-content"><strong>📊 ${type}:</strong> <code>${fileName}</code></div>`;
  container.appendChild(userDiv);

  const respDiv = document.createElement('div');
  respDiv.className = 'ai-message assistant-message';
  respDiv.innerHTML = `
    <div class="ai-message-content">${formatResponse(result, type)}</div>
    <div style="margin-top:8px;font-size:11px;color:#666;">
      ${fromCache ? '<span style="background:#2a5;color:#5c5;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:bold;">⚡ CACHED</span>' : ''} 
      ${provider}
    </div>`;
  container.appendChild(respDiv);
  container.scrollTop = container.scrollHeight;
}

// ============================================================================
// AUTO-SEND (No Enter key needed)
// ============================================================================

let autoSending = false;

function triggerSend(): void {
  if (autoSending) return;
  autoSending = true;
  
  const btn = document.getElementById('send-btn');
  if (btn) btn.click();
  
  setTimeout(() => autoSending = false, 1000);
}

// Watch for "Press Enter" status
new MutationObserver(mutations => {
  for (const m of mutations) {
    m.addedNodes.forEach(n => {
      if (n instanceof HTMLElement && n.textContent?.includes('Press Enter')) {
        setTimeout(triggerSend, 150);
      }
    });
  }
}).observe(document.body, { childList: true, subtree: true });

// ============================================================================
// MENU CACHE BADGES
// ============================================================================

let menuFileContent: string | null = null;
let menuFileHash: string | null = null;
let badgesAdded = false;

function addMenuBadges(): void {
  return; // DISABLED
  if (badgesAdded) return;
  
  console.log(`[MenuBadge] Adding badges. Content hash: ${menuFileHash}`);
  console.log(`[MenuBadge] Last analyzed hash: ${lastAnalyzedHash}`);
  
  const items = [
    { text: 'Explain this file', type: 'explain' },
    { text: 'High-level summary', type: 'summary' },
    { text: 'Architecture overview', type: 'architecture' },
    { text: 'Show dependencies', type: 'dependencies' }
  ];

  items.forEach(({ text, type }) => {
    // Find by exact text using TreeWalker
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent?.trim() === text) {
        const parent = node.parentElement?.parentElement;
        if (!parent || parent.querySelector('.ai-cache-badge')) continue;
        
        const isCached = menuFileContent ? !!getCachedAnalysis(menuFileContent, type) : false;
        
        console.log(`[MenuBadge] "${text}" isCached: ${isCached}`);
        
        const badge = document.createElement('span');
        badge.className = 'ai-cache-badge';
        badge.style.cssText = isCached
          ? 'margin-left:auto;padding:2px 6px;background:#2a5;color:#5c5;border-radius:6px;font-size:9px;font-weight:bold;'
          : 'margin-left:auto;padding:2px 6px;background:#444;color:#888;border-radius:6px;font-size:9px;';
        badge.textContent = isCached ? '✓ cached' : 'API';
        
        parent.style.display = 'flex';
        parent.style.alignItems = 'center';
        parent.appendChild(badge);
        break;
      }
    }
  });
  
  badgesAdded = true;
}

// Get file content on right-click
  // DISABLED: fileClickHandlers.ts handles context menu (full menu with AI Analysis submenu)
  // Original listener disabled to prevent AI-only popup from appearing
  // [DISABLED] const __disabledListener = async (e: MouseEvent) => { return; }; // was: document.addEventListener('contextmenu', async (e) => {
  // [DISABLED] badgesAdded = false;
  // [DISABLED] document.querySelectorAll('.ai-cache-badge').forEach(b => b.remove());
  // [DISABLED] 
  // [DISABLED] const target = e.target as HTMLElement;
  // [DISABLED] const fileEl = target.closest('[data-path]');
  // [DISABLED] 
  // [DISABLED] console.log('[MenuBadge] Right-click detected');
  // [DISABLED] console.log('[MenuBadge] File element:', fileEl);
  // [DISABLED] 
  // [DISABLED] if (fileEl) {
  // [DISABLED] const path = fileEl.getAttribute('data-path') || '';
  // [DISABLED] console.log('[MenuBadge] File path:', path);
  // [DISABLED] 
  // [DISABLED] if (path && (window as any).__TAURI__) {
  // [DISABLED] try {
  // [DISABLED] const { invoke } = await import('@tauri-apps/api/core');
  // [DISABLED] menuFileContent = await invoke('read_file_content', { path }) as string;
  // [DISABLED] menuFileHash = hashContent(menuFileContent);
  // [DISABLED] console.log(`[MenuBadge] Got file content, hash: ${menuFileHash}, length: ${menuFileContent.length}`);
  // [DISABLED] } catch (e) { 
  // [DISABLED] console.error('[MenuBadge] Error reading file:', e);
  // [DISABLED] menuFileContent = null; 
  // [DISABLED] menuFileHash = null;
  // [DISABLED] }
  // [DISABLED] }
  // [DISABLED] }
  // [DISABLED] 
  // Fallback to editor
  // [DISABLED] if (!menuFileContent) {
  // [DISABLED] try {
  // [DISABLED] const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  // [DISABLED] if (editor?.getModel()) {
  // [DISABLED] menuFileContent = editor.getModel().getValue();
  // [DISABLED] menuFileHash = hashContent(menuFileContent);
  // [DISABLED] console.log(`[MenuBadge] Got editor content, hash: ${menuFileHash}, length: ${menuFileContent.length}`);
  // [DISABLED] }
  // [DISABLED] } catch {}
  // [DISABLED] }
  // [DISABLED] 
  // [DISABLED] setTimeout(addMenuBadges, 100);
  // [DISABLED] setTimeout(addMenuBadges, 250);
  // }, true); // DISABLED - was closing the contextmenu listener

// ============================================================================
// GLOBAL API
// ============================================================================

(window as any).aiAutoSend = { 
  trigger: triggerSend,
  direct: directAnalysis 
};

(window as any).aiCache = {
  stats: () => {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const entries = Object.entries(c.entries || {});
      return { 
        count: entries.length,
        keys: Object.keys(c.entries || {}),
        entries: entries.map(([k, v]: [string, any]) => ({ key: k, file: v.fileName, hash: v.contentHash }))
      };
    } catch { return { count: 0 }; }
  },
  clear: () => localStorage.removeItem(CACHE_KEY),
  get: getCachedAnalysis,
  hash: hashContent
};

(window as any).aiMenuCache = {
  addBadges: addMenuBadges,
  reset: () => { badgesAdded = false; document.querySelectorAll('.ai-cache-badge').forEach(b => b.remove()); },
  getContent: () => ({ hash: menuFileHash, length: menuFileContent?.length }),
  compareWithAnalyzed: () => ({
    menuHash: menuFileHash,
    analyzedHash: lastAnalyzedHash,
    match: menuFileHash === lastAnalyzedHash
  })
};

console.log('✅ [AIAnalysis] Ready (DEBUG VERSION)!');
console.log('   • window.aiAutoSend.direct("explain", "current", "")');
console.log('   • window.aiCache.stats()');
console.log('   • window.aiMenuCache.compareWithAnalyzed()');
