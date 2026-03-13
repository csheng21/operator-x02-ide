// src/ide/vsc/gitAICommitMessage.ts
// ============================================================================
// AI COMMIT MESSAGE GENERATOR - Using Operator X02 API
// ============================================================================
// Automatically generates professional commit messages from git diff
// Integrates with the Source Control panel
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { gitManager } from './gitManager';

// ============================================================================
// TYPES
// ============================================================================

export type CommitStyle = 'conventional' | 'simple' | 'detailed' | 'emoji';

interface CommitMessageOptions {
  style: CommitStyle;
  includeBody: boolean;
  maxLength: number;
  language: 'en' | 'zh';
}

interface DiffInfo {
  files: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
    diff?: string;
  }>;
  totalAdditions: number;
  totalDeletions: number;
  summary: string;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: CommitMessageOptions = {
  style: 'conventional',
  includeBody: true,
  maxLength: 72,
  language: 'en'
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

// Uses Operator X02 API (Deepseek-based)
const OPERATOR_X02_CONFIG = {
  apiKey: 'PROXY',
  apiBaseUrl: 'PROXY',
  model: 'x02-coder',
  maxTokens: 500,
  temperature: 0.3 // Lower for more consistent commit messages
};

// ============================================================================
// STYLES
// ============================================================================

function injectStyles(): void {
  if (document.getElementById('ai-commit-styles')) return;

  const style = document.createElement('style');
  style.id = 'ai-commit-styles';
  style.textContent = `
    /* AI Commit Button */
    .ai-commit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .ai-commit-btn:hover {
      background: linear-gradient(135deg, #ab47bc 0%, #8e24aa 100%);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
    }

    .ai-commit-btn:active {
      transform: translateY(0);
    }

    .ai-commit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .ai-commit-btn.loading {
      pointer-events: none;
    }

    .ai-commit-btn .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: ai-commit-spin 0.8s linear infinite;
    }

    @keyframes ai-commit-spin {
      to { transform: rotate(360deg); }
    }

    /* AI Icon */
    .ai-commit-icon {
      width: 14px;
      height: 14px;
    }

    /* Style Dropdown */
    .ai-commit-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: #2d2d2d;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      padding: 4px;
      z-index: 1000;
      min-width: 180px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: ai-dropdown-in 0.15s ease;
    }

    @keyframes ai-dropdown-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ai-commit-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      color: #e0e0e0;
      font-size: 12px;
    }

    .ai-commit-dropdown-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .ai-commit-dropdown-item.selected {
      background: rgba(156, 39, 176, 0.2);
      color: #ce93d8;
    }

    .ai-commit-dropdown-icon {
      font-size: 14px;
    }

    .ai-commit-dropdown-label {
      flex: 1;
    }

    .ai-commit-dropdown-desc {
      font-size: 10px;
      color: #888;
    }

    /* Container for button in Source Control */
    .ai-commit-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      position: relative;
    }

    /* Toast Notification */
    .ai-commit-toast {
      position: fixed;
      bottom: 60px;
      right: 60px;
      padding: 12px 20px;
      background: #2d2d2d;
      border: 1px solid #3c3c3c;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 13px;
      z-index: 99999;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      animation: ai-toast-in 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ai-commit-toast.success {
      border-color: #4caf50;
    }

    .ai-commit-toast.error {
      border-color: #f44336;
    }

    @keyframes ai-toast-in {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Regenerate hint */
    .ai-commit-hint {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// PROMPTS FOR DIFFERENT STYLES
// ============================================================================

function getCommitPrompt(style: CommitStyle, diff: DiffInfo): string {
  const baseContext = `You are a Git commit message generator. Analyze the following code changes and generate a commit message.

Files changed:
${diff.files.map(f => `- ${f.path} (${f.status}): +${f.additions}/-${f.deletions}`).join('\n')}

Total: +${diff.totalAdditions}/-${diff.totalDeletions} lines

Diff summary:
${diff.summary}
`;

  const stylePrompts: Record<CommitStyle, string> = {
    conventional: `${baseContext}

Generate a commit message following Conventional Commits format:
- Format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, chore, build, ci
- Scope: optional, describes the section of codebase
- Description: imperative mood, lowercase, no period at end
- Keep title under 72 characters
- Add body with bullet points if multiple changes

Example:
feat(auth): add OAuth2 login support

- Implement Google OAuth2 provider
- Add token refresh mechanism
- Update user model with provider field

IMPORTANT: Return ONLY the commit message, no explanations.`,

    simple: `${baseContext}

Generate a simple, clear commit message:
- One line, under 72 characters
- Start with a verb (Add, Fix, Update, Remove, Refactor, etc.)
- Be specific about what changed
- No period at end

Example: Add user authentication with JWT tokens

IMPORTANT: Return ONLY the commit message, no explanations.`,

    detailed: `${baseContext}

Generate a detailed commit message with:
- Clear title (under 72 chars)
- Blank line
- Body explaining WHY the change was made
- What problem it solves
- Any important implementation details

Example:
Implement rate limiting for API endpoints

This change adds rate limiting to prevent abuse of our API endpoints.
Previously, users could make unlimited requests which caused server
strain during peak hours.

Changes:
- Add Redis-based rate limiter middleware
- Configure 100 requests per minute per user
- Add rate limit headers to responses
- Update API documentation

IMPORTANT: Return ONLY the commit message, no explanations.`,

    emoji: `${baseContext}

Generate a commit message with a relevant emoji prefix:
- 🎉 Initial commit
- ✨ New feature
- 🐛 Bug fix
- 🔧 Configuration
- 📝 Documentation
- 💄 UI/Style
- ♻️ Refactor
- ⚡ Performance
- 🔒 Security
- 🧪 Tests
- 📦 Dependencies

Format: <emoji> <description>
Keep under 72 characters.

Example: ✨ Add dark mode toggle to settings page

IMPORTANT: Return ONLY the commit message, no explanations.`
  };

  return stylePrompts[style];
}

// ============================================================================
// GIT DIFF HELPER
// ============================================================================

async function getGitDiff(projectPath: string, staged: boolean = true): Promise<DiffInfo> {
  try {
    await gitManager.open(projectPath);
    
    // Get status to know which files changed
    const status = await gitManager.getStatus();
    const files = Array.isArray(status) ? status : ((status as any)?.files || []);
    
    // Separate staged vs unstaged
    const targetFiles = staged 
      ? files.filter((f: any) => f.staged)
      : files;
    
    // If no staged files, use all changed files
    const filesToProcess = targetFiles.length > 0 ? targetFiles : files;
    
    if (filesToProcess.length === 0) {
      throw new Error('No changes to commit');
    }

    // Get diff for each file
    const diffInfo: DiffInfo = {
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
      summary: ''
    };

    const summaryParts: string[] = [];

    for (const file of filesToProcess.slice(0, 10)) { // Limit to 10 files for API
      try {
        // Get file diff
        let diff = '';
        try {
          diff = await gitManager.diff(file.path, staged);
        } catch (e) {
          diff = `[${file.status || 'modified'}]`;
        }

        // Count additions/deletions from diff
        const lines = diff.split('\n');
        let additions = 0;
        let deletions = 0;
        
        for (const line of lines) {
          if (line.startsWith('+') && !line.startsWith('+++')) additions++;
          if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }

        diffInfo.files.push({
          path: file.path,
          status: file.status || 'modified',
          additions,
          deletions,
          diff: diff.substring(0, 1000) // Limit diff size
        });

        diffInfo.totalAdditions += additions;
        diffInfo.totalDeletions += deletions;

        // Build summary
        summaryParts.push(`${file.path}: ${diff.substring(0, 500)}`);
      } catch (e) {
        console.warn(`Failed to get diff for ${file.path}:`, e);
      }
    }

    diffInfo.summary = summaryParts.join('\n\n').substring(0, 3000); // Limit total summary

    return diffInfo;
  } catch (error) {
    console.error('Failed to get git diff:', error);
    throw error;
  }
}

// ============================================================================
// AI API CALL
// ============================================================================

async function callAI(prompt: string): Promise<string> {
  try {
    // Try using Tauri backend first
    if (typeof invoke === 'function') {
      try {
        const result = await invoke<string>('call_ai_api', {
          apiKey: OPERATOR_X02_CONFIG.apiKey,
          apiBaseUrl: OPERATOR_X02_CONFIG.apiBaseUrl,
          model: OPERATOR_X02_CONFIG.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates git commit messages.' },
            { role: 'user', content: prompt }
          ],
          maxTokens: OPERATOR_X02_CONFIG.maxTokens,
          temperature: OPERATOR_X02_CONFIG.temperature
        });
        return result;
      } catch (e) {
        console.log('Tauri API call failed, trying fetch:', e);
      }
    }

    // Fallback to fetch
    const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: OPERATOR_X02_CONFIG.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates git commit messages.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: OPERATOR_X02_CONFIG.maxTokens,
        temperature: OPERATOR_X02_CONFIG.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('AI API call failed:', error);
    throw error;
  }
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export async function generateCommitMessage(
  projectPath?: string,
  options: Partial<CommitMessageOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const path = projectPath || (window as any).currentProjectPath || (window as any).currentFolderPath || '';

  if (!path) {
    throw new Error('No project path available');
  }

  console.log('🤖 Generating AI commit message...');
  console.log('Style:', opts.style);

  // Get diff info
  const diff = await getGitDiff(path, true);
  
  if (diff.files.length === 0) {
    throw new Error('No changes to commit');
  }

  console.log(`📝 Analyzing ${diff.files.length} file(s)...`);

  // Generate prompt based on style
  const prompt = getCommitPrompt(opts.style, diff);

  // Call AI
  const message = await callAI(prompt);

  if (!message) {
    throw new Error('AI returned empty response');
  }

  // Clean up the message
  const cleanedMessage = message
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/^(Commit message:|Here's|Here is).*?:\s*/i, '') // Remove prefixes
    .trim();

  console.log('✅ Commit message generated');
  return cleanedMessage;
}

// ============================================================================
// UI INTEGRATION
// ============================================================================

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.createElement('div');
  toast.className = `ai-commit-toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let currentStyle: CommitStyle = 'conventional';

function createAICommitButton(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ai-commit-container';
  container.id = 'ai-commit-container';

  // Main button
  const btn = document.createElement('button');
  btn.className = 'ai-commit-btn';
  btn.id = 'ai-commit-btn';
  btn.innerHTML = `
    <svg class="ai-commit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
      <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/>
      <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
    </svg>
    <span>AI Message</span>
  `;
  btn.title = 'Generate commit message with AI (Operator X02)';

  // Style selector button
  const styleBtn = document.createElement('button');
  styleBtn.className = 'ai-commit-btn';
  styleBtn.style.cssText = 'padding: 6px 8px; min-width: auto;';
  styleBtn.innerHTML = '▼';
  styleBtn.title = 'Select commit message style';

  // Click handlers
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('loading')) return;

    btn.classList.add('loading');
    btn.innerHTML = `<div class="spinner"></div><span>Generating...</span>`;

    try {
      const message = await generateCommitMessage(undefined, { style: currentStyle });
      
      // Find commit message input
      const input = document.querySelector(
        '.commit-message-input, ' +
        '#commit-message, ' +
        '[placeholder*="commit"], ' +
        '[placeholder*="Message"], ' +
        'textarea[class*="commit"]'
      ) as HTMLTextAreaElement | HTMLInputElement;

      if (input) {
        input.value = message;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        showToast('Commit message generated!', 'success');
      } else {
        // Show in alert if no input found
        console.log('Generated commit message:', message);
        showToast('Message copied to clipboard', 'success');
        navigator.clipboard?.writeText(message);
      }
    } catch (error: any) {
      console.error('Failed to generate commit message:', error);
      showToast(error.message || 'Failed to generate message', 'error');
    } finally {
      btn.classList.remove('loading');
      btn.innerHTML = `
        <svg class="ai-commit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/>
          <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
        </svg>
        <span>AI Message</span>
      `;
    }
  });

  // Style dropdown
  let dropdown: HTMLElement | null = null;

  styleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
      return;
    }

    dropdown = document.createElement('div');
    dropdown.className = 'ai-commit-dropdown';
    dropdown.innerHTML = `
      <div class="ai-commit-dropdown-item ${currentStyle === 'conventional' ? 'selected' : ''}" data-style="conventional">
        <span class="ai-commit-dropdown-icon">📋</span>
        <span class="ai-commit-dropdown-label">Conventional</span>
        <span class="ai-commit-dropdown-desc">feat(scope): msg</span>
      </div>
      <div class="ai-commit-dropdown-item ${currentStyle === 'simple' ? 'selected' : ''}" data-style="simple">
        <span class="ai-commit-dropdown-icon">📝</span>
        <span class="ai-commit-dropdown-label">Simple</span>
        <span class="ai-commit-dropdown-desc">One-liner</span>
      </div>
      <div class="ai-commit-dropdown-item ${currentStyle === 'detailed' ? 'selected' : ''}" data-style="detailed">
        <span class="ai-commit-dropdown-icon">📄</span>
        <span class="ai-commit-dropdown-label">Detailed</span>
        <span class="ai-commit-dropdown-desc">With body</span>
      </div>
      <div class="ai-commit-dropdown-item ${currentStyle === 'emoji' ? 'selected' : ''}" data-style="emoji">
        <span class="ai-commit-dropdown-icon">✨</span>
        <span class="ai-commit-dropdown-label">Emoji</span>
        <span class="ai-commit-dropdown-desc">🎉 Fun style</span>
      </div>
    `;

    container.appendChild(dropdown);

    // Handle selection
    dropdown.querySelectorAll('.ai-commit-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        currentStyle = (item as HTMLElement).dataset.style as CommitStyle;
        localStorage.setItem('ai-commit-style', currentStyle);
        showToast(`Style set to: ${currentStyle}`, 'info');
        dropdown?.remove();
        dropdown = null;
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown() {
        dropdown?.remove();
        dropdown = null;
        document.removeEventListener('click', closeDropdown);
      }, { once: true });
    }, 0);
  });

  container.appendChild(btn);
  container.appendChild(styleBtn);

  return container;
}

// ============================================================================
// INTEGRATION WITH SOURCE CONTROL PANEL
// ============================================================================

export function integrateWithSourceControl(): void {
  injectStyles();

  // Load saved style
  const savedStyle = localStorage.getItem('ai-commit-style') as CommitStyle;
  if (savedStyle) currentStyle = savedStyle;

  // Find the commit message area and inject button
  const injectButton = () => {
    // Remove existing button if any
    document.getElementById('ai-commit-container')?.remove();

    // Find commit message container
    const commitArea = document.querySelector(
      '.commit-section, ' +
      '.git-commit-area, ' +
      '.source-control-commit, ' +
      '[class*="commit-message"], ' +
      '.git-panel-commit'
    );

    if (commitArea) {
      const button = createAICommitButton();
      
      // Insert before the input or at the start
      const input = commitArea.querySelector('textarea, input[type="text"]');
      if (input) {
        input.parentElement?.insertBefore(button, input);
      } else {
        commitArea.prepend(button);
      }
      
      console.log('✅ AI Commit button injected');
      return true;
    }

    // Alternative: Find by the textarea directly
    const textarea = document.querySelector(
      'textarea[placeholder*="commit"], ' +
      'textarea[placeholder*="Message"], ' +
      'input[placeholder*="commit"]'
    );

    if (textarea && textarea.parentElement) {
      const button = createAICommitButton();
      textarea.parentElement.insertBefore(button, textarea);
      console.log('✅ AI Commit button injected (fallback)');
      return true;
    }

    return false;
  };

  // Try to inject immediately and also observe for changes
  if (!injectButton()) {
    // Set up observer to wait for Source Control panel
    const observer = new MutationObserver(() => {
      if (injectButton()) {
        // Keep observing in case panel is recreated
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👀 Watching for Source Control panel...');
  }
}

// ============================================================================
// KEYBOARD SHORTCUT
// ============================================================================

export function setupCommitMessageShortcut(): void {
  document.addEventListener('keydown', async (e) => {
    // Ctrl+Shift+G: Generate commit message
    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      
      const btn = document.getElementById('ai-commit-btn') as HTMLButtonElement;
      if (btn) {
        btn.click();
      } else {
        // Generate directly if button not visible
        try {
          showToast('Generating commit message...', 'info');
          const message = await generateCommitMessage();
          await navigator.clipboard?.writeText(message);
          showToast('Commit message copied to clipboard!', 'success');
          console.log('Generated commit message:', message);
        } catch (error: any) {
          showToast(error.message || 'Failed to generate', 'error');
        }
      }
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initAICommitMessage(): void {
  console.log('🤖 Initializing AI Commit Message Generator...');
  
  injectStyles();
  integrateWithSourceControl();
  setupCommitMessageShortcut();

  // Register global function
  (window as any).generateCommitMessage = generateCommitMessage;
  (window as any).aiCommitMessage = {
    generate: generateCommitMessage,
    setStyle: (style: CommitStyle) => { currentStyle = style; },
    getStyle: () => currentStyle
  };

  console.log('✅ AI Commit Message Generator ready!');
  console.log('📋 Shortcut: Ctrl+Shift+G');
  console.log('🎨 Styles: conventional, simple, detailed, emoji');
}

// Auto-initialize when Source Control panel is open
if (typeof window !== 'undefined') {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    initAICommitMessage();
  }, 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  currentStyle,
  CommitStyle,
  CommitMessageOptions,
  DEFAULT_OPTIONS
};
