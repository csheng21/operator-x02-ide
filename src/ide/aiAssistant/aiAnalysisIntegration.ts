// src/ide/fileExplorer/aiAnalysisIntegration.ts
// Simple integration patch - Add this to make AI Analysis auto-send

import { invoke } from '@tauri-apps/api/core';

/**
 * Execute AI analysis and auto-send to chat
 * Call this from your context menu click handlers
 */
export async function triggerAIAnalysis(
  analysisType: string,
  fileName: string,
  filePath: string
): Promise<void> {
  console.log(`🔍 [AI Analysis] ${analysisType} → ${fileName}`);

  // 1. Get file content
  const content = await getFileContent(filePath, fileName);
  const language = getLanguage(fileName);

  // 2. Build prompt
  const prompt = buildPrompt(analysisType, fileName, content, language);

  // 3. Show in chat as user message (collapsed)
  addUserMessageToChat(analysisType, fileName);

  // 4. Show loading
  const loadingEl = showLoading();

  try {
    // 5. Send to AI
    const response = await callAI(prompt);

    // 6. Remove loading & show response
    loadingEl?.remove();
    addResponseToChat(response);

    // 7. Save to conversation
    saveToConversation(prompt, response);

  } catch (error) {
    loadingEl?.remove();
    addResponseToChat(`❌ Error: ${error instanceof Error ? error.message : 'Analysis failed'}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getFileContent(filePath: string, fileName: string): Promise<string> {
  // Try editor first
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  if (editor?.getModel()?.getValue) {
    const uri = editor.getModel().uri.toString();
    if (uri.includes(fileName)) {
      return editor.getModel().getValue();
    }
  }

  // Try Tauri file read
  try {
    const content = await invoke('read_file_content', { path: filePath });
    if (content) return content as string;
  } catch (e) {
    console.warn('Tauri read failed:', e);
  }

  // Try tab manager
  if ((window as any).tabManager?.getTabContent) {
    const content = (window as any).tabManager.getTabContent(fileName);
    if (content) return content;
  }

  return '// Could not read file content';
}

function getLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin',
    cs: 'csharp', cpp: 'cpp', c: 'c', rb: 'ruby', php: 'php',
    html: 'html', css: 'css', json: 'json', md: 'markdown'
  };
  return map[ext] || 'plaintext';
}

function buildPrompt(type: string, fileName: string, content: string, lang: string): string {
  const prompts: Record<string, string> = {
    'explain': `Explain this ${lang} file in detail:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nProvide:\n1. Purpose\n2. Key Components\n3. Dependencies\n4. Usage\n5. Notable Features`,
    
    'summary': `Give a high-level summary of:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nConcise 2-3 paragraphs covering main purpose, key exports, and typical usage.`,
    
    'architecture': `Analyze the architecture:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nDescribe design patterns, structure, data flow, and architectural improvements.`,
    
    'dependencies': `List all dependencies:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nFor each import: what is it, why needed, what's used from it.`,
    
    'improvements': `Suggest improvements:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nAnalyze code quality, performance, best practices, error handling, refactoring opportunities.`,
    
    'bugs': `Find potential bugs:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nLook for logic errors, edge cases, null issues, type problems, security vulnerabilities.`,
    
    'tests': `Generate tests:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nCreate unit tests, edge cases, error cases using appropriate testing framework.`,
    
    'documentation': `Generate documentation:\n\n**File:** \`${fileName}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\nCreate file header, function docs, type definitions, examples, API reference.`
  };
  
  return prompts[type] || prompts['explain'];
}

function addUserMessageToChat(type: string, fileName: string): void {
  const container = document.querySelector('.ai-chat-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'ai-message user-message';
  div.innerHTML = `
    <div class="ai-message-content" style="padding: 8px 12px; background: #2a4a6d; border-radius: 8px;">
      <strong>📊 AI Analysis:</strong> ${type} → <code>${fileName}</code>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showLoading(): HTMLElement | null {
  const container = document.querySelector('.ai-chat-container');
  if (!container) return null;

  const div = document.createElement('div');
  div.className = 'ai-message assistant-message ai-loading';
  div.innerHTML = `
    <div class="ai-message-content" style="display: flex; align-items: center; gap: 10px; color: #888;">
      <span class="spinner" style="
        display: inline-block;
        width: 16px; height: 16px;
        border: 2px solid #444;
        border-top-color: #007acc;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></span>
      Analyzing file...
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function addResponseToChat(response: string): void {
  const container = document.querySelector('.ai-chat-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'ai-message assistant-message';
  
  // Basic markdown processing
  const formatted = response
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#1e1e1e;padding:12px;border-radius:6px;overflow-x:auto;"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#2d2d2d;padding:2px 6px;border-radius:3px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  div.innerHTML = `
    <div class="ai-message-content">${formatted}</div>
    <div style="margin-top:8px;font-size:11px;color:#666;">${new Date().toLocaleTimeString()} • claude</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function callAI(prompt: string): Promise<string> {
  // Try conversation manager first (preserves history)
  const cm = (window as any).conversationManager;
  if (cm?.sendMessage) {
    try {
      const resp = await cm.sendMessage(prompt);
      if (resp) return resp;
    } catch (e) {
      console.warn('ConversationManager failed:', e);
    }
  }

  // Get API config from comprehensive lookup
  const config = getApiConfigForIntegration();

  if (!config.apiKey) {
    throw new Error('No API key found. Please configure a provider in Quick Switch panel.');
  }

  console.log(`[AIAnalysisIntegration] Using provider: ${config.provider}, key: ${config.apiKey.substring(0, 12)}...`);

  // Direct API call
  const response = await invoke('call_ai_api', {
    provider: config.provider || 'operator_x02',
    apiKey: config.apiKey,
    baseUrl: config.apiBaseUrl || config.baseUrl || '',
    model: config.model || 'x02-coder',
    message: prompt,
    maxTokens: 2000,
    temperature: 0.7
  });

  return response as string;
}

// ============================================================================
// COMPREHENSIVE API CONFIG LOOKUP (mirrors main.ts PROVIDER_CONFIGS)
// ============================================================================
function getApiConfigForIntegration(): any {
  const DEFAULTS: Record<string, any> = {
    operator_x02: {
      provider: 'operator_x02',
      apiKey: 'PROXY',
      apiBaseUrl: 'PROXY',
      model: 'x02-coder'
    },
    groq: {
      provider: 'groq',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile'
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat'
    }
  };

  // Source 1: window.__apiSettings (runtime)
  if ((window as any).__apiSettings?.apiKey) return (window as any).__apiSettings;

  // Source 2: aiApiConfig (Quick Switch active provider)
  try { const s = localStorage.getItem('aiApiConfig');
    if (s) { const c = JSON.parse(s); if (c.apiKey) return c; }
  } catch {}

  // Source 3: providerConfigs (per-provider saved configs)
  try { const s = localStorage.getItem('providerConfigs');
    if (s) { const cs = JSON.parse(s);
      for (const p of ['operator_x02', 'groq', 'deepseek', 'openai', 'claude']) {
        if (cs[p]?.apiKey) return cs[p];
      }
    }
  } catch {}

  // Source 4: providerApiKeys + defaults
  try { const s = localStorage.getItem('providerApiKeys');
    if (s) { const ks = JSON.parse(s);
      for (const p of ['operator_x02', 'groq', 'deepseek']) {
        if (ks[p] && DEFAULTS[p]) return { ...DEFAULTS[p], apiKey: ks[p] };
      }
    }
  } catch {}

  // Source 5: ai_api_settings (this file's original location)
  try { const s = localStorage.getItem('ai_api_settings');
    if (s) { const c = JSON.parse(s); if (c.apiKey) return c; }
  } catch {}

  // Source 6: ai-ide-api-configuration (legacy)
  try { const s = localStorage.getItem('ai-ide-api-configuration');
    if (s) { const c = JSON.parse(s); if (c.apiKey) return c; }
  } catch {}

  // Source 7: Hardcoded default
  console.log('[AIAnalysisIntegration] Using hardcoded default: operator_x02');
  return { ...DEFAULTS.operator_x02 };
}

function saveToConversation(prompt: string, response: string): void {
  const cm = (window as any).conversationManager;
  if (!cm) return;

  try {
    cm.addMessage?.('user', prompt);
    cm.addMessage?.('assistant', response);
    cm.saveConversations?.();
  } catch (e) {
    console.warn('Could not save to conversation:', e);
  }
}

// ============================================================================
// CONTEXT MENU INTEGRATION
// ============================================================================

/**
 * Call this in your context menu click handler
 * Example: When user clicks "Explain this file" menu item
 */
export function handleContextMenuClick(menuAction: string, fileInfo: { name: string; path: string }): void {
  // Map menu actions to analysis types
  const actionMap: Record<string, string> = {
    'Explain this file': 'explain',
    'High-level summary': 'summary',
    'Architecture overview': 'architecture',
    'Show dependencies': 'dependencies',
    'Suggest improvements': 'improvements',
    'Find potential bugs': 'bugs',
    'Generate tests': 'tests',
    'Generate documentation': 'documentation',
    // lowercase versions
    'explain': 'explain',
    'summary': 'summary',
    'architecture': 'architecture',
    'dependencies': 'dependencies',
    'improvements': 'improvements',
    'bugs': 'bugs',
    'tests': 'tests',
    'documentation': 'documentation'
  };

  const analysisType = actionMap[menuAction];
  if (analysisType) {
    // Close context menu
    document.querySelectorAll('.context-menu, .context-submenu').forEach(el => el.remove());
    
    // Execute analysis
    triggerAIAnalysis(analysisType, fileInfo.name, fileInfo.path);
  }
}

// ============================================================================
// GLOBAL EXPOSURE
// ============================================================================

// Make available globally
(window as any).aiAnalysisAutoSend = {
  trigger: triggerAIAnalysis,
  handleMenu: handleContextMenuClick
};

console.log('✅ AI Analysis Auto-Send loaded');
console.log('   Usage: window.aiAnalysisAutoSend.trigger("explain", "App.tsx", "/path/App.tsx")');

export default { triggerAIAnalysis, handleContextMenuClick };
