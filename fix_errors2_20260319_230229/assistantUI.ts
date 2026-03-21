// ============================================================================
// INTEGRATED VERSION - IDE Message Styles (January 24, 2026)
// Added:
//   - 🎨 ideMessageStyles import (line ~52)
//   - 🎨 ideMarkdownTransformer import (line ~53)
//   - 🎨 initializeIDEMessageStyles() call in initializeAssistantUI()
//   - 🎨 transformContentForIDE() before addMessageToChat() calls
// ============================================================================

// assistantUI.ts - Main AI Assistant UI Coordinator with File Attachments
// COMPLETE FIXED VERSION with sendMessageDirectly, chat context, and all exports
// 🎯 WITH CALIBRATION INTEGRATION (INLINE VERSION)
// ⚡ WITH INSTANT TERMINAL ERROR SOLUTIONS
// 📜 WITH SMART SCROLL MANAGER
// 📂 WITH PROJECT CONTEXT INTEGRATION (v28)
// ============================================================================

// ============================================================================
// IMPORTS - CLEANED (NO DUPLICATES)
// ============================================================================

import { getCurrentApiConfiguration, getProviderDisplayName, saveApiConfiguration } from '../../state';
import { getCurrentApiConfigurationForced, callGenericAPI, initializeApiSettings, getTemporaryProviderConfig } from './apiProviderManager';
import { initializeCodeAnalysis, handleAnalyzeCode, handleDebugCode } from './codeAnalysisManager';
import './conversationSaveFix';
import { openWYSIWYGEditor } from './assistantUI_wysiwygEditor';
import { interceptProjectQuestions } from '../../projectCommandHandler';
import { initializeProfessionalIcons } from './professionalIcons';
// 🔍 AI FILE EXPLORER - Allows AI to search and read project files
import { 
  initializeAIFileExplorer,
  enhanceWithFileContext,
  getPendingFileContext,
  suggestRelevantFiles,
  showFileSuggestions,
  aiNeedsMoreContext,
  findRelatedFiles,
  readFileContent as readFileForAI,
  searchFilesByName
} from './aiFileExplorer';
// 🎯 CALIBRATION IMPORTS - Try external, fallback to inline
import { ProviderName, TaskType, detectTaskType } from '../../multiProviderOrchestrator';
import { 
  enhanceMessageWithTerminalContext, 
  isTerminalContextEnabled,
  initializeTerminalContext
} from './terminalContext';

// 📜 SCROLL MANAGER IMPORT
import {
  initChatScrollManager,
  scrollChatToBottom,
  forceScrollChatToBottom,
  scrollDuringStreaming,
  startStreamingMode,
  endStreamingMode,
  getScrollManager
} from './chatScrollManager';
import './messageUI_collapse_styles.css';

// 🎨 IDE MESSAGE STYLES - Compact, professional formatting
import { initializeIDEMessageStyles } from './ideMessageStyles';
import { transformContentForIDE, postProcessHTML } from './ideMarkdownTransformer';

// ============================================================================
// ⚡ INSTANT TERMINAL ERROR SOLUTIONS
// Provides immediate solutions for common terminal errors WITHOUT calling AI
// ============================================================================

interface InstantTerminalSolution {
  patterns: RegExp[];
  title: string;
  icon: string;
  solution: string;
}

const INSTANT_TERMINAL_SOLUTIONS: InstantTerminalSolution[] = [
  // FLUTTER
  {
    patterns: [
      /flutter.*not recognized/i,
      /'flutter' is not recognized/i,
      /flutter.*command not found/i,
      /flutter: command not found/i,
    ],
    title: 'Flutter SDK Not Installed',
    icon: '🔴',
    solution: `**Flutter is not installed on your computer.**

## How to Fix:

### 1. Download Flutter SDK
👉 **https://docs.flutter.dev/get-started/install**

### 2. Extract the SDK
- **Windows:** Extract to \`C:\\flutter\`
- **Mac/Linux:** Extract to \`~/development/flutter\`

### 3. Add to PATH

**Windows:**
1. Press \`Win + R\`, type \`sysdm.cpl\`, press Enter
2. Click "Advanced" tab → "Environment Variables"
3. Under "User variables", select "Path" → "Edit"
4. Click "New" and add: \`C:\\flutter\\bin\`
5. Click OK on all dialogs

**Mac/Linux:**
\`\`\`bash
echo 'export PATH="$PATH:$HOME/development/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
\`\`\`

### 4. Verify Installation
Open a **new** terminal and run:
\`\`\`bash
flutter doctor
\`\`\``,
  },

  // NPM
  {
    patterns: [
      /npm.*not recognized/i,
      /'npm' is not recognized/i,
      /npm.*command not found/i,
    ],
    title: 'Node.js/npm Not Installed',
    icon: '🔴',
    solution: `**Node.js (which includes npm) is not installed.**

## How to Fix:

### 1. Download Node.js
👉 **https://nodejs.org/** (choose LTS version)

### 2. Install
- Run the installer
- Use default settings
- npm is included automatically

### 3. Restart Terminal
Close and reopen your terminal.

### 4. Verify
\`\`\`bash
node --version
npm --version
\`\`\``,
  },

  // NODE
  {
    patterns: [
      /node.*not recognized/i,
      /'node' is not recognized/i,
      /node.*command not found/i,
    ],
    title: 'Node.js Not Installed',
    icon: '🔴',
    solution: `**Node.js is not installed.**

## How to Fix:

### 1. Download Node.js
👉 **https://nodejs.org/** (choose LTS version)

### 2. Install & Restart Terminal

### 3. Verify
\`\`\`bash
node --version
\`\`\``,
  },

  // PYTHON
  {
    patterns: [
      /python.*not recognized/i,
      /'python' is not recognized/i,
      /python.*command not found/i,
      /python3.*not found/i,
    ],
    title: 'Python Not Installed',
    icon: '🔴',
    solution: `**Python is not installed or not in PATH.**

## How to Fix:

### 1. Download Python
👉 **https://python.org/downloads/**

### 2. Install
- Run the installer
- ⚠️ **CHECK** "Add Python to PATH" at the bottom!
- Click "Install Now"

### 3. Restart Terminal

### 4. Verify
\`\`\`bash
python --version
\`\`\`
Or try: \`python3 --version\``,
  },

  // PIP
  {
    patterns: [
      /pip.*not recognized/i,
      /'pip' is not recognized/i,
      /pip.*command not found/i,
    ],
    title: 'pip Not Found',
    icon: '🔴',
    solution: `**pip is not installed or Python not in PATH.**

## How to Fix:

### Option 1: Use python -m pip
\`\`\`bash
python -m pip --version
python -m pip install package-name
\`\`\`

### Option 2: Reinstall Python
1. Go to **https://python.org/downloads/**
2. Download and run installer
3. ⚠️ **CHECK** "Add Python to PATH"
4. Restart terminal`,
  },

  // GIT
  {
    patterns: [
      /git.*not recognized/i,
      /'git' is not recognized/i,
      /git.*command not found/i,
    ],
    title: 'Git Not Installed',
    icon: '🔴',
    solution: `**Git is not installed.**

## How to Fix:

### 1. Download Git
👉 **https://git-scm.com/downloads**

### 2. Install
Use default options.

### 3. Restart Terminal

### 4. Verify
\`\`\`bash
git --version
\`\`\``,
  },

  // RUST/CARGO
  {
    patterns: [
      /cargo.*not recognized/i,
      /'cargo' is not recognized/i,
      /cargo.*command not found/i,
      /rustc.*not found/i,
    ],
    title: 'Rust Not Installed',
    icon: '🔴',
    solution: `**Rust/Cargo is not installed.**

## How to Fix:

### Install via rustup
**Windows:** Download from 👉 **https://rustup.rs/**

**Mac/Linux:**
\`\`\`bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
\`\`\`

### Restart Terminal & Verify
\`\`\`bash
cargo --version
\`\`\``,
  },

  // JAVA
  {
    patterns: [
      /java.*not recognized/i,
      /'java' is not recognized/i,
      /java.*command not found/i,
      /javac.*not found/i,
    ],
    title: 'Java Not Installed',
    icon: '🔴',
    solution: `**Java JDK is not installed.**

## How to Fix:

### 1. Download JDK
👉 **https://adoptium.net/** (recommended)

### 2. Install

### 3. Set JAVA_HOME (Windows)
1. Open System Properties → Environment Variables
2. New System Variable: \`JAVA_HOME\` = \`C:\\Program Files\\Java\\jdk-21\`
3. Add to PATH: \`%JAVA_HOME%\\bin\`

### 4. Verify
\`\`\`bash
java --version
\`\`\``,
  },

  // DOCKER
  {
    patterns: [
      /docker.*not recognized/i,
      /'docker' is not recognized/i,
      /docker.*command not found/i,
    ],
    title: 'Docker Not Installed',
    icon: '🔴',
    solution: `**Docker is not installed or not running.**

## How to Fix:

### 1. Download Docker Desktop
👉 **https://docker.com/products/docker-desktop**

### 2. Install & Start
Make sure Docker Desktop is running (whale icon in taskbar).

### 3. Verify
\`\`\`bash
docker --version
\`\`\``,
  },

  // PERMISSION ERRORS
  {
    patterns: [
      /permission denied/i,
      /EACCES/i,
      /access denied/i,
      /operation not permitted/i,
    ],
    title: 'Permission Denied',
    icon: '🔒',
    solution: `**You don't have permission for this operation.**

## How to Fix:

### Windows:
1. Close terminal
2. Right-click terminal → **"Run as Administrator"**
3. Try again

### Mac/Linux:
\`\`\`bash
sudo your-command-here
\`\`\`

### For npm (long-term fix):
\`\`\`bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.bashrc: export PATH=~/.npm-global/bin:$PATH
\`\`\``,
  },

  // PORT IN USE
  {
    patterns: [
      /EADDRINUSE/i,
      /address already in use/i,
      /port.*in use/i,
      /port.*already/i,
    ],
    title: 'Port Already In Use',
    icon: '🔌',
    solution: `**Another process is using this port.**

## How to Fix:

### Windows (PowerShell as Admin):
\`\`\`powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Note the PID (last number), then kill it:
taskkill /PID <PID> /F
\`\`\`

### Mac/Linux:
\`\`\`bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

### Or use different port:
\`\`\`bash
npm run dev -- --port 3001
\`\`\``,
  },

  // MODULE NOT FOUND
  {
    patterns: [
      /cannot find module/i,
      /module not found/i,
      /no module named/i,
      /ModuleNotFoundError/i,
    ],
    title: 'Module Not Found',
    icon: '📦',
    solution: `**A required package/module is not installed.**

## How to Fix:

### Node.js:
\`\`\`bash
npm install
\`\`\`

### Python:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Common Issues:
- Make sure you're in the correct project folder
- Try deleting \`node_modules\` and running \`npm install\` again`,
  },

  // NPM DEPENDENCY CONFLICTS
  {
    patterns: [
      /npm ERR!.*ERESOLVE/i,
      /peer dep/i,
      /dependency conflict/i,
      /could not resolve/i,
    ],
    title: 'npm Dependency Conflict',
    icon: '⚠️',
    solution: `**Package version conflict detected.**

## How to Fix:

### Option 1: Legacy peer deps
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

### Option 2: Force install
\`\`\`bash
npm install --force
\`\`\`

### Option 3: Clean install
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\``,
  },

  // SYNTAX ERRORS
  {
    patterns: [
      /SyntaxError/i,
      /unexpected token/i,
      /unexpected identifier/i,
    ],
    title: 'Syntax Error',
    icon: '⚠️',
    solution: `**There's a typo or syntax mistake in your code.**

## How to Fix:

1. Check the **file and line number** in the error
2. Look for:
   - Missing or extra brackets: \`{ } [ ] ( )\`
   - Missing semicolons or commas
   - Unclosed strings
   - Typos in keywords

3. Use your IDE's error highlighting to find the issue`,
  },

  // OUT OF MEMORY
  {
    patterns: [
      /out of memory/i,
      /JavaScript heap/i,
      /heap out of memory/i,
      /FATAL ERROR.*heap/i,
    ],
    title: 'Out of Memory',
    icon: '💾',
    solution: `**Process ran out of memory.**

## How to Fix:

### Increase Node.js memory:
\`\`\`bash
node --max-old-space-size=4096 your-script.js
\`\`\`

### Or set environment variable:
\`\`\`bash
# Windows
set NODE_OPTIONS=--max-old-space-size=4096

# Mac/Linux
export NODE_OPTIONS=--max-old-space-size=4096
\`\`\``,
  },
];

/**
 * Find instant solution for terminal error
 */
function findInstantTerminalSolution(text: string): InstantTerminalSolution | null {
  if (!text) return null;
  
  for (const solution of INSTANT_TERMINAL_SOLUTIONS) {
    for (const pattern of solution.patterns) {
      if (pattern.test(text)) {
        console.log(`⚡ [InstantFix] Pattern matched: ${pattern}`);
        return solution;
      }
    }
  }
  return null;
}

/**
 * Display instant solution in chat (without calling AI)
 */
function displayInstantSolution(userMessage: string, solution: InstantTerminalSolution): void {
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) return;

  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.style.cssText = 'opacity:1; padding:12px 16px; margin:8px 0;';
  userDiv.innerHTML = `<div class="ai-message-content">${userMessage.substring(0, 300).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>`;
  chatContainer.appendChild(userDiv);

  // Add solution message
  const solutionDiv = document.createElement('div');
  solutionDiv.className = 'ai-message assistant-message';
  solutionDiv.style.cssText = `
    opacity: 1;
    padding: 16px;
    margin: 8px 0;
    background: linear-gradient(135deg, #1a2e1a 0%, #1e1e1e 100%);
    border-radius: 8px;
    border-left: 4px solid #4caf50;
  `;

  // Convert markdown to HTML
  const htmlSolution = solution.solution
    .replace(/^## (.*$)/gm, '<h3 style="color:#4fc3f7; margin:14px 0 10px 0; font-size:15px; font-weight:600;">$1</h3>')
    .replace(/^### (.*$)/gm, '<h4 style="color:#89D185; margin:10px 0 6px 0; font-size:13px; font-weight:600;">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/👉/g, '<span style="margin-right:4px;">→</span>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0d1117; padding:12px; border-radius:6px; margin:8px 0; overflow-x:auto; border:1px solid #30363d;"><code style="color:#c9d1d9; font-family:Consolas,Monaco,monospace; font-size:13px;">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:#21262d; padding:2px 6px; border-radius:4px; color:#79c0ff; font-family:Consolas,monospace; font-size:13px;">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
    .replace(/\n/g, '<br>');

  solutionDiv.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #30363d;">
      <span style="font-size:22px;">⚡</span>
      <div style="flex:1;">
        <div style="color:#4caf50; font-weight:600; font-size:13px;">Instant Solution</div>
        <div style="color:#8b949e; font-size:11px;">From local knowledge base • No API delay</div>
      </div>
    </div>
    <h3 style="color:#f85149; margin:0 0 12px 0; font-size:16px; display:flex; align-items:center; gap:8px;">
      <span>${solution.icon}</span> ${solution.title}
    </h3>
    <div style="color:#c9d1d9; line-height:1.7; font-size:14px;">
      <p style="margin:8px 0;">${htmlSolution}</p>
    </div>
  `;

  chatContainer.appendChild(solutionDiv);
  
  // 📜 SMART SCROLL - Force scroll when showing instant solution
  forceScrollChatToBottom();
  
  console.log(`⚡ [InstantFix] Displayed solution: ${solution.title}`);
}

// Expose instant fix functions globally for debugging
if (typeof window !== 'undefined') {
  (window as any).findInstantTerminalSolution = findInstantTerminalSolution;
  (window as any).displayInstantSolution = displayInstantSolution;
  (window as any).INSTANT_TERMINAL_SOLUTIONS = INSTANT_TERMINAL_SOLUTIONS;
  console.log('⚡ Instant Terminal Solutions loaded:', INSTANT_TERMINAL_SOLUTIONS.length, 'patterns');
}

// ============================================================================
// SELECTION CONTEXT - Explain highlighted code
// ============================================================================

function getSelectionContext(): string {
  const editor = (window as any).monaco?.editor?.getEditors()?.[0];
  if (!editor) return '';
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || selection.isEmpty()) return '';
  const selectedText = model.getValueInRange(selection);
  if (!selectedText.trim()) return '';
  const language = model.getLanguageId() || 'plaintext';
  const fileName = model.uri?.path?.split('/').pop() || 'file';
  return `\n[📌 Selected Code in "${fileName}" - Lines ${selection.startLineNumber}-${selection.endLineNumber}]\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
}

function isAskingAboutSelection(message: string): boolean {
  const keywords = ['this', 'selected', 'highlighted', 'what does', 'explain', 'how does', 'why', 'analyze', 'check', 'review'];
  return keywords.some(k => message.toLowerCase().includes(k));
}
// Try importing external calibration, but we have inline fallback
let externalCalibrationManager: any = null;
let externalRecordResult: any = null;
let externalShowFeedbackWidget: any = null;

try {
  const calibrationModule = require('../../providerCalibration');
  externalCalibrationManager = calibrationModule.getCalibrationManager;
  externalRecordResult = calibrationModule.recordResult;
} catch (e) {
  console.warn('⚠️ External providerCalibration not found, using inline version');
}

try {
  const calibrationUIModule = require('../../calibrationUI');
  externalShowFeedbackWidget = calibrationUIModule.showFeedbackWidget;
} catch (e) {
  console.warn('⚠️ External calibrationUI not found');
}

// ============================================================================
// 🎯 INLINE CALIBRATION SYSTEM (Fallback if external modules not available)
// ============================================================================

interface CalibrationTestResult {
  provider: string;
  taskType: string;
  success: boolean;
  latency: number;
  timestamp: number;
  userFeedback?: 'good' | 'bad' | 'neutral';
}

const CALIBRATION_HISTORY_KEY = 'calibrationTestHistory';
const CALIBRATION_DATA_KEY = 'providerCalibration';

// Get test history from localStorage
function getCalibrationHistory(): CalibrationTestResult[] {
  try {
    const saved = localStorage.getItem(CALIBRATION_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

// Save test result to localStorage
function saveCalibrationResult(result: CalibrationTestResult): void {
  try {
    const history = getCalibrationHistory();
    history.push(result);
    // Keep only last 500 results
    const trimmed = history.slice(-500);
    localStorage.setItem(CALIBRATION_HISTORY_KEY, JSON.stringify(trimmed));
    console.log(`📊 Calibration saved: ${result.provider}/${result.taskType} = ${result.success ? 'SUCCESS' : 'FAIL'} (${result.latency}ms)`);
  } catch (e) {
    console.warn('Failed to save calibration result:', e);
  }
}

// Inline recordResult function
function inlineRecordResult(provider: string, taskType: string, success: boolean, latency: number): void {
  const result: CalibrationTestResult = {
    provider,
    taskType,
    success,
    latency,
    timestamp: Date.now()
  };
  saveCalibrationResult(result);
}

// Use external if available, otherwise inline
function recordResult(provider: ProviderName, taskType: TaskType, success: boolean, latency: number): void {
  if (externalRecordResult) {
    try {
      externalRecordResult(provider, taskType, success, latency);
    } catch (e) {
      console.warn('External recordResult failed, using inline:', e);
      inlineRecordResult(provider, taskType, success, latency);
    }
  } else {
    inlineRecordResult(provider, taskType, success, latency);
  }
}

// Get calibration manager (external or dummy)
function getCalibrationManager(): any {
  if (externalCalibrationManager) {
    try {
      return externalCalibrationManager();
    } catch (e) {
      console.warn('External getCalibrationManager failed:', e);
    }
  }
  // Return dummy manager for config check
  return {
    getConfig: () => ({ enableUserFeedback: false }),
    getTestHistory: getCalibrationHistory
  };
}

// Dummy feedback widget (since external might not exist)
function showFeedbackWidget(provider: ProviderName, taskType: TaskType, latency: number): void {
  if (externalShowFeedbackWidget) {
    try {
      externalShowFeedbackWidget(provider, taskType, latency);
    } catch (e) {
      // Silently fail - feedback widget is optional
    }
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).getCalibrationManager = getCalibrationManager;
  (window as any).recordResult = recordResult;
  (window as any).getCalibrationHistory = getCalibrationHistory;
  console.log('✅ Inline calibration system ready! Use window.getCalibrationHistory() to check results');
}

// Context providers - using intelligentContextProvider version
import { 
  enhanceMessageWithContext as enhanceMessageWithIntelligentContext, 
  shouldAutoProvideProjectInfo,
  generateIntelligentAutoResponse 
} from '../../intelligentContextProvider';

// Project scaffolding (single import)
import { 
  initializeProjectScaffolding, 
  handleProjectScaffoldingRequest,
  isProjectCreationRequest,
  openProjectSettingsModalDirect
} from './projectScaffoldingUI';

// Note: setupProjectScaffoldingShortcut removed - using window-level handler instead

// HTML viewer (single import with all exports)
import { 
  convertResponseToHTML as convertToHTML,
  generateResponseHTML, 
  displayHTMLResponseViewerBlob
} from './assistantUI_htmlviewer';

// UI components (single imports each)
// ❌ REMOVED: No longer needed - using unified-status-bar instead
// import { createContextStatusIndicator } from './intelligentAssistantUI';
import { aiChatFileIntegration } from './aiChatFileIntegration';
import { conversationManager } from './conversationManager';
import { aiDirectEditor } from './aiDirectEditor';
// ❌ DISABLED: Using messageUI.ts built-in collapse system instead (prevents duplicate buttons)
// import { collapsePreviousMessages, initializeMessageCollapse } from './messageCollapse';
import { initializeNoteSystem, showNoteDialog } from './noteManager';

import { 
  queueMessageForSaving, 
  processSaveQueue,
  setIsSavingEnabled 
} from './messageQueueManager';

import {
  addConversationControls,
  showConversationList,
  loadConversationToUI,
  updateConversationTitle,
  updateConversationInfo,
  exportCurrentConversation
} from './conversationUI';

import {
  getCurrentCodeContext,
  setCodeAnalysisMode,
  isInCodeAnalysis,
  enhanceMessageContextForCurrentFile,
  checkCodeAnalysisModeTimeout
} from './codeContextManager';

// ✅ Editor Context - Auto-capture current file/selection
import {
  getCurrentEditorContext,
  getEditorContextForAI,
  formatEditorContextCompact
} from './editorContextCapture';

import {
  addMessageToChat,
  addSystemMessage,
  createMessageActions,
  setupCodeBlockEventListeners,
  processMessageContent
} from './messageUI';

import { showTypingIndicator, hideTypingIndicator } from './typingIndicator';
import { hideProviderIndicator } from '../../multiProviderOrchestrator';
import { showNotification } from './notificationManager';
import { addAllStyles } from './assistantStyles';

// Context integration - use different alias to avoid conflict
import { 
  enhanceMessageWithContext as enhanceWithLocalContext, 
  learnFromInteraction, 
  trackFileChange, 
  trackError, 
  getContextStatus, 
  toggleContextSystem, 
  isContextEnabled 
} from './contextIntegration';

import { clarificationManager, ClarificationRequest, ClarificationOption } from './clarificationManager';
import { showClarificationDialog, hideClarificationDialog, initializeClarificationUI } from './clarificationUI';
import { resolveProjectPurpose } from './simpleAIHandler';
// Note: setupInstantClarificationShortcut and setupSuggestedActionsShortcut removed - using window-level handlers instead

// ============================================================================
// NOTIFICATION SYSTEM - Auto-removal notifications
// ============================================================================
import {
  addSystemMessageWithAutoRemoval,
  clearAllNotifications,
  getActiveNotificationCount,
  getActiveNotifications,
  trackOrphanedNotifications,
  initializeNotificationSystem
} from './notificationSystem';

// Import storage settings manager for save fix
import { storageSettingsManager } from './storageSettingsManager';

// X02: expose typing indicator to window for DevTools testing
if (typeof window !== 'undefined') {
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
}

// Initialize notification system
initializeNotificationSystem();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageNote {
  content: string;
  createdAt: number;
  lastUpdated: number;
}

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
  id: string;
  note?: MessageNote;
  metadata?: {
    fileName?: string;
    language?: string;
    codeContext?: boolean;
    isHtml?: boolean;
    messageType?: 'normal' | 'suggestion' | 'code-analysis' | 'debug';
    code?: string;
    liked?: boolean;
    disliked?: boolean;
    provider?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdated: number;
  metadata?: {
    projectPath?: string;
    tags?: string[];
  };
}

// FILE ATTACHMENT INTERFACE
export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  icon: string;
}

// ============================================================================
// CHAT CONTEXT CONFIGURATION
// ============================================================================

const CHAT_CONTEXT_CONFIG = {
  // Maximum number of previous messages to include for context
  maxContextMessages: 10,
  // Maximum total characters for context
  maxContextLength: 8000,
  // Include system messages in context
  includeSystemMessages: false,
  // Enable context enhancement
  enableContextEnhancement: true
};

// ============================================================================
// UTILITY FUNCTIONS - EXPORTED FOR messageUI.ts and codeAnalysisManager.ts
// ============================================================================

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * ⭐ AUTO-APPLY: Extract and apply code from AI response to editor
 * Called when Auto mode is ON
 */
function autoApplyCodeFromResponse(apiResponse: string): void {
  console.log('🤖 [Auto Mode] Checking for code to auto-apply...');
  
  // Extract code blocks from the response
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let match;
  let bestMatch: { lang: string; code: string; lineCount: number } | null = null;
  
  while ((match = codeBlockRegex.exec(apiResponse)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const code = match[2].trim();
    const lineCount = code.split('\n').length;
    
    // Skip pure documentation/text blocks
    if (['text', 'plaintext', 'markdown', 'md'].includes(lang)) {
      continue;
    }
    
    // Skip if code is too short (likely just an example snippet)
    if (lineCount < 3) {
      continue;
    }
    
    // Skip if it looks like documentation (has lots of markdown)
    const markdownIndicators = (code.match(/^[#*\-•]/gm) || []).length;
    if (markdownIndicators > lineCount * 0.3) {
      continue; // More than 30% lines start with markdown characters
    }
    
    // Prefer longer code blocks and ones with actual language specified
    if (!bestMatch || lineCount > bestMatch.lineCount || (lang && !bestMatch.lang)) {
      bestMatch = { lang, code, lineCount };
    }
  }
  
  if (bestMatch && bestMatch.lineCount >= 5) {
    // Get Monaco editor
    const editors = (window as any).monaco?.editor?.getEditors?.();
    if (editors?.[0]) {
      const editor = editors[0];
      const model = editor.getModel();
      
      if (model) {
        // Replace entire file content with the new code
        const fullRange = model.getFullModelRange();
        editor.executeEdits('auto-apply', [{
          range: fullRange,
          text: bestMatch.code,
          forceMoveMarkers: true
        }]);
        
        console.log(`🤖 [Auto Mode] Applied ${bestMatch.lineCount} lines of ${bestMatch.lang || 'code'}`);
        
        // Show notification
        showAutoApplyNotification(bestMatch.lineCount, bestMatch.lang);
        return;
      }
    }
  }
  
  console.log('🤖 [Auto Mode] No suitable code block found to auto-apply');
}

/**
 * Show auto-apply notification
 */
function showAutoApplyNotification(lineCount: number, lang: string): void {
  const notification = document.createElement('div');
  notification.className = 'auto-apply-notification';
  notification.innerHTML = `
    <span style="color: #4ade80;">✓</span> Auto-applied ${lineCount} lines${lang ? ` of ${lang}` : ''}
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 60px;
    right: 20px;
    background: #1e3a1e;
    border: 1px solid #4ade80;
    color: #4ade80;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeInOut 3s ease-in-out forwards;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Format file size for display (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Escape HTML characters
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get provider info for display
 */
export function getProviderInfo(provider: string): { icon: string; name: string; color: string } {
  const providers: Record<string, { icon: string; name: string; color: string }> = {
    'groq': { icon: '⚡', name: 'Groq', color: '#f97316' },
    'openai': { icon: '🟢', name: 'OpenAI', color: '#10a37f' },
    'claude': { icon: '🟣', name: 'Claude', color: '#8b5cf6' },
    'anthropic': { icon: '🟣', name: 'Anthropic', color: '#8b5cf6' },
    'deepseek': { icon: '🔵', name: 'DeepSeek', color: '#3b82f6' },
    'gemini': { icon: '💎', name: 'Gemini', color: '#4285f4' },
    'cohere': { icon: '🔶', name: 'Cohere', color: '#d97706' },
    'ollama': { icon: '🦙', name: 'Ollama', color: '#64748b' },
    'operator_x02': { icon: '🤖', name: 'Operator X02', color: '#06b6d4' },
    'custom': { icon: '⚙️', name: 'Custom', color: '#6b7280' }
  };
  
  const key = provider.toLowerCase();
  for (const [providerKey, info] of Object.entries(providers)) {
    if (key.includes(providerKey)) {
      return info;
    }
  }
  
  return providers.custom;
}

// ============================================================================
// 🎯 CALIBRATION HELPER FUNCTION
// ============================================================================

/**
 * Map provider names from config to calibration system names
 */
function mapProviderToCalibrationName(provider: string): ProviderName {
  const mapping: Record<string, ProviderName> = {
    'groq': 'groq',
    'openai': 'openai',
    'claude': 'claude',
    'anthropic': 'claude',
    'deepseek': 'deepseek',
    'gemini': 'gemini',
    'operator_x02': 'operator_x02',
    'operator-x02': 'operator_x02',
    'operatorx02': 'operator_x02',
    'custom': 'operator_x02'
  };
  
  const key = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [pattern, mapped] of Object.entries(mapping)) {
    if (key.includes(pattern.replace(/[^a-z0-9]/g, ''))) {
      return mapped;
    }
  }
  
  return 'operator_x02'; // Default fallback
}

// ============================================================================
// GLOBAL STATE - FILE ATTACHMENTS
// ============================================================================

let attachedFiles: AttachedFile[] = [];

// ============================================================================
// API PROVIDER SELECTION MENU (triggered by # key)
// ============================================================================

/**
 * Professional SVG icons for each provider
 */
const PROVIDER_SVG_ICONS: Record<string, string> = {
  operator_x02: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="8.5" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15.5" cy="10" r="1.5" fill="currentColor"/>
    <path d="M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M8 18v2M16 18v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  
  groq: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  
  deepseek: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  
  openai: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.28 9.37a5.87 5.87 0 00-.51-4.87 5.96 5.96 0 00-6.43-2.58A5.9 5.9 0 0010.9.6a5.95 5.95 0 00-5.67 4.12A5.87 5.87 0 001.3 8.58a5.95 5.95 0 00.74 6.98 5.87 5.87 0 00.51 4.87 5.96 5.96 0 006.43 2.58 5.9 5.9 0 004.44 1.32 5.95 5.95 0 005.67-4.12 5.87 5.87 0 003.93-3.86 5.95 5.95 0 00-.74-6.98z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M15 8l-6 8M9 8l6 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  
  claude: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9 9h.01M15 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 13c.5 1.5 2 2.5 4 2.5s3.5-1 4-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  
  gemini: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2 2.4-7.2-6-4.8h7.6L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
};

/**
 * Provider color themes
 */
const PROVIDER_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  operator_x02: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', bg: 'rgba(6, 182, 212, 0.1)' },
  groq: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', bg: 'rgba(249, 115, 22, 0.1)' },
  deepseek: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', bg: 'rgba(59, 130, 246, 0.1)' },
  openai: { primary: '#10a37f', glow: 'rgba(16, 163, 127, 0.4)', bg: 'rgba(16, 163, 127, 0.1)' },
  claude: { primary: '#d97706', glow: 'rgba(217, 119, 6, 0.4)', bg: 'rgba(217, 119, 6, 0.1)' },
  gemini: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', bg: 'rgba(139, 92, 246, 0.1)' }
};

/**
 * Add provider menu styles
 */
function addProviderMenuStyles(): void {
  if (document.getElementById('provider-menu-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'provider-menu-styles';
  style.textContent = `
    @keyframes providerMenuFadeIn {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    @keyframes providerMenuFadeOut {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(10px) scale(0.95); }
    }
    
    @keyframes providerItemSlideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes providerIconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .provider-menu {
      position: fixed;
      z-index: 10001;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.8),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      min-width: 180px;
      overflow: hidden;
      animation: providerMenuFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      backdrop-filter: blur(20px);
    }
    
    .provider-menu.closing {
      animation: providerMenuFadeOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .provider-menu-header {
      padding: 8px 12px;
      background: linear-gradient(90deg, rgba(79, 195, 247, 0.08) 0%, transparent 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .provider-menu-header-text { flex: 1; }
    
    .provider-menu-header-title {
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      margin: 0;
      letter-spacing: -0.01em;
    }
    
    .provider-menu-header-subtitle {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      margin: 1px 0 0 0;
    }
    
    .provider-menu-list {
      padding: 4px;
      max-height: 280px;
      overflow-y: auto;
    }
    
    .provider-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      margin-bottom: 1px;
      border: 1px solid transparent;
    }
    
    .provider-menu-item::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
      background-size: 200% 100%;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .provider-menu-item:hover::before {
      opacity: 1;
      animation: shimmer 1.5s infinite;
    }
    
    .provider-menu-item:hover {
      background: rgba(255, 255, 255, 0.05);
      transform: translateX(4px);
    }
    
    .provider-menu-item.selected {
      background: var(--provider-bg);
      border-color: var(--provider-color);
      box-shadow: 0 0 20px var(--provider-glow);
    }
    
    .provider-menu-item-content { flex: 1; min-width: 0; }
    
    .provider-menu-item-name {
      font-size: 13px;
      font-weight: 500;
      color: #fff;
    }
    
    .provider-menu-item-shortcut {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
      transition: all 0.2s;
    }
    
    .provider-menu-item:hover .provider-menu-item-shortcut,
    .provider-menu-item.selected .provider-menu-item-shortcut {
      background: var(--provider-bg);
      color: var(--provider-color);
      border-color: var(--provider-color);
    }
    
  `;
  document.head.appendChild(style);
}

/**
 * Show provider selection menu above the input
 * When selected, inserts #provider into the input field
 */
function showProviderSelectionMenu(input: HTMLInputElement | HTMLTextAreaElement): void {
  // Add styles
  addProviderMenuStyles();
  
  // Remove existing menu with animation
  const existingMenu = document.getElementById('provider-selection-menu');
  if (existingMenu) {
    existingMenu.classList.add('closing');
    setTimeout(() => existingMenu.remove(), 200);
    return;
  }
  
  // Available providers
  const providers = [
    { id: 'operator_x02', name: 'Operator X02', shortcut: 'x02', badge: 'Default' },
    { id: 'groq', name: 'Groq', shortcut: 'groq', badge: 'Fast' },
    { id: 'deepseek', name: 'DeepSeek', shortcut: 'deepseek', badge: 'Code' },
    { id: 'openai', name: 'OpenAI', shortcut: 'openai', badge: 'GPT-4' },
    { id: 'claude', name: 'Claude', shortcut: 'claude', badge: 'Anthropic' },
    { id: 'gemini', name: 'Gemini', shortcut: 'gemini', badge: 'Google' },
  ];
  
  // Create menu
  const menu = document.createElement('div');
  menu.id = 'provider-selection-menu';
  menu.className = 'provider-menu';
  
  // Position above input
  const inputRect = input.getBoundingClientRect();
  menu.style.bottom = (window.innerHeight - inputRect.top + 12) + 'px';
  menu.style.left = Math.max(10, inputRect.left) + 'px';
  
  let selectedIndex = 0;
  const items: HTMLElement[] = [];
  
  // Header
  const header = document.createElement('div');
  header.className = 'provider-menu-header';
  header.innerHTML = `
    <div class="provider-menu-header-text">
      <div class="provider-menu-header-title">Select AI Provider</div>
      <div class="provider-menu-header-subtitle">Route your question to a specific AI</div>
    </div>
  `;
  menu.appendChild(header);
  
  // List
  const list = document.createElement('div');
  list.className = 'provider-menu-list';
  
  providers.forEach((provider, index) => {
    const colors = PROVIDER_COLORS[provider.id];
    const item = document.createElement('div');
    item.className = 'provider-menu-item' + (index === 0 ? ' selected' : '');
    item.style.cssText = `
      --provider-color: ${colors.primary};
      --provider-glow: ${colors.glow};
      --provider-bg: ${colors.bg};
      animation: providerItemSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.04}s both;
    `;
    
    item.innerHTML = `
      <div class="provider-menu-item-content">
        <div class="provider-menu-item-name">${provider.name}</div>
      </div>
      <div class="provider-menu-item-shortcut">${index + 1}</div>
    `;
    
    item.addEventListener('mouseenter', () => {
      items.forEach((it, i) => it.classList.toggle('selected', i === index));
      selectedIndex = index;
    });
    
    item.addEventListener('click', () => {
      closeMenu(() => insertProviderTag(input, provider.shortcut));
    });
    
    items.push(item);
    list.appendChild(item);
  });
  
  menu.appendChild(list);
  
  document.body.appendChild(menu);
  
  const updateSelection = () => {
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
    items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  
  const closeMenu = (callback?: () => void) => {
    menu.classList.add('closing');
    setTimeout(() => {
      menu.remove();
      document.removeEventListener('keydown', handleKeydown);
      if (callback) callback();
    }, 200);
  };
  
  const handleKeydown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      closeMenu(() => input.focus());
    } else if (e.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % providers.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + providers.length) % providers.length;
      updateSelection();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      closeMenu(() => insertProviderTag(input, providers[selectedIndex].shortcut));
    } else if (e.key >= '1' && e.key <= '6') {
      const index = parseInt(e.key) - 1;
      if (providers[index]) {
        selectedIndex = index;
        updateSelection();
        closeMenu(() => insertProviderTag(input, providers[index].shortcut));
      }
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  setTimeout(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        closeMenu();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    document.addEventListener('click', handleClickOutside);
  }, 100);
}

/**
 * Insert #provider tag into the input field
 */
function insertProviderTag(input: HTMLInputElement | HTMLTextAreaElement, providerShortcut: string): void {
  // If input already has content, append the tag
  const currentValue = input.value;
  if (currentValue && !currentValue.endsWith(' ')) {
    input.value = `${currentValue} #${providerShortcut} `;
  } else {
    input.value = `${currentValue}#${providerShortcut} `;
  }
  input.focus();
  // Move cursor to end
  input.setSelectionRange(input.value.length, input.value.length);
  // Trigger input event
  input.dispatchEvent(new Event('input', { bubbles: true }));
  console.log(`✅ Inserted #${providerShortcut} - Ready to ask question`);
}

/**
 * Provider tag mapping
 */
const PROVIDER_TAG_MAP: Record<string, string> = {
  'x02': 'operator_x02',
  'operator_x02': 'operator_x02',
  'groq': 'groq',
  'grok': 'groq', // Common typo
  'deepseek': 'deepseek',
  'openai': 'openai',
  'gpt': 'openai',
  'claude': 'claude',
  'anthropic': 'claude',
  'gemini': 'gemini',
  'google': 'gemini',
};

/**
 * Parse multiple provider segments from message
 * Example: "#groq how many lines. #gemini review this." 
 * Returns array of { provider, message } segments
 */
export function parseMultiProviderMessage(message: string): Array<{ provider: string; message: string }> {
  const segments: Array<{ provider: string; message: string }> = [];
  
  // More flexible regex: #provider followed by space and content until next # or end
  // This handles: "#groq question #gemini another question"
  const regex = /#(\w+)\s+([^#]+)/g;
  let match;
  
  while ((match = regex.exec(message)) !== null) {
    const tag = match[1].toLowerCase();
    const segmentMessage = match[2].trim();
    const provider = PROVIDER_TAG_MAP[tag];
    
    if (provider && segmentMessage) {
      segments.push({ provider, message: segmentMessage });
      console.log(`🎯 Parsed segment: #${tag} → ${provider}: "${segmentMessage.substring(0, 50)}${segmentMessage.length > 50 ? '...' : ''}"`);
    } else {
      console.log(`⚠️ Skipped invalid segment: #${tag} (provider: ${provider}, message: "${segmentMessage}")`);
    }
  }
  
  console.log(`📊 Total parsed segments: ${segments.length}`);
  return segments;
}

/**
 * Parse provider tag from message and return provider ID and clean message
 * For single provider messages
 * @param message - Full message that may contain #provider prefix
 * @returns { provider: string | null, message: string }
 */
export function parseProviderFromMessage(message: string): { provider: string | null; cleanMessage: string } {
  // Check if message has multiple providers
  if (hasMultipleProviders(message)) {
    // Return null to indicate multi-provider mode should be used
    return { provider: null, cleanMessage: message };
  }
  
  // Single provider match
  const match = message.match(/^#(\w+)\s+(.*)$/s);
  
  if (match) {
    const tag = match[1].toLowerCase();
    const cleanMessage = match[2].trim();
    const provider = PROVIDER_TAG_MAP[tag] || null;
    
    if (provider) {
      console.log(`🎯 Detected provider tag: #${tag} → ${provider}`);
      return { provider, cleanMessage };
    }
  }
  
  return { provider: null, cleanMessage: message };
}

/**
 * Check if message contains multiple provider tags
 */
export function hasMultipleProviders(message: string): boolean {
  // Find all #word patterns
  const matches = message.match(/#(\w+)/g);
  if (!matches || matches.length < 2) return false;
  
  // Check if matched tags are valid providers
  let validCount = 0;
  for (const m of matches) {
    const tag = m.replace('#', '').toLowerCase();
    if (PROVIDER_TAG_MAP[tag] !== undefined) {
      validCount++;
      if (validCount >= 2) {
        console.log(`✅ hasMultipleProviders: Found ${validCount}+ valid provider tags`);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Execute chained provider requests
 * Each provider gets the previous response as context
 * ✅ FIXED: Now properly gets fresh config after provider switch
 */
async function executeChainedProviderRequests(segments: Array<{ provider: string; message: string }>): Promise<void> {
  console.log('🚀 executeChainedProviderRequests starting with', segments.length, 'segments');
  
  let previousResponse = '';
  let previousProvider = '';
  
  // Store original provider to restore after chain completes
  const originalConfig = getCurrentApiConfigurationForced();
  const originalProvider = originalConfig.provider;
  console.log('📌 Original provider:', originalProvider);
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isFirst = i === 0;
    const isLast = i === segments.length - 1;
    
    console.log(`📍 Processing segment ${i + 1}/${segments.length}:`, segment);
    
    // Build message with context from previous response
    let fullMessage = segment.message;
    if (!isFirst && previousResponse) {
      fullMessage = `[Previous response from ${previousProvider}]:\n${previousResponse}\n\n[Your task]: ${segment.message}`;
    }
    
    // ✅ Build temporary config for this provider (does NOT save to localStorage)
    console.log(`🔄 Building temp config for: ${segment.provider} (${i + 1}/${segments.length})`);
    const freshConfig = getTemporaryProviderConfig(segment.provider as any);
    
    if (!freshConfig) {
      console.warn(`⚠️ Could not build config for provider: ${segment.provider}`);
      continue;
    }
    
    console.log('🔧 Temp config for chain segment:', {
      provider: freshConfig.provider,
      hasApiKey: !!freshConfig.apiKey,
      baseUrl: freshConfig.apiBaseUrl?.substring(0, 50)
    });
    
    // Show notification
    const providerInfo = getProviderInfo(segment.provider);
    showNotification(`${providerInfo.icon} Step ${i + 1}/${segments.length}: Asking ${providerInfo.name}...`, 'info');
    
    // Add user message to chat - don't save here, conversationManager handles it
    await addMessageToChat('user', `#${segment.provider} ${segment.message}`, false);
    
    // Save to conversation manager - ONLY save point
    conversationManager.addMessage('user', `#${segment.provider} ${segment.message}`, { 
      messageType: 'normal',
      provider: segment.provider 
    });
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
      // ✅ FIX: Build messages with conversation context
      const messagesWithContext = buildMessagesWithContext(fullMessage);
      console.log(`📚 Built ${messagesWithContext.length} context messages`);
      
      // ✅ FIX: Call API with explicit fresh config and context
      console.log('📞 Calling API with message:', fullMessage.substring(0, 100));
      const response = await callGenericAPI(fullMessage, freshConfig, messagesWithContext);
      console.log('📨 Got response from', segment.provider, ':', response.substring(0, 100));
      
      // Hide typing indicator
      await hideTypingIndicator();
      
      // 🎨 Transform content for IDE display
      const transformedResponse = transformContentForIDE(response);
      
      // Add response to chat with provider badge - don't save here
      await addMessageToChat('assistant', transformedResponse, {
        shouldSave: false,  // ← FIX: Don't double-save
        provider: segment.provider,
        isChained: !isFirst,
        chainStep: i + 1,
        totalSteps: segments.length
      });
      
      // ⭐ AUTO-APPLY: If autonomous mode is ON, auto-apply code to editor
      try {
        const isAutoMode = (window as any).__isAutonomousModeActive === true;
        if (isAutoMode) {
          autoApplyCodeFromResponse(response);
        }
      } catch (autoApplyError) {
        console.error('Auto-apply error:', autoApplyError);
      }
      
      // Hide provider indicator after message is fully rendered
      hideProviderIndicator();
      
      // Save assistant response to conversation - ONLY save point
      conversationManager.addMessage('assistant', response, { 
        messageType: 'normal',
        provider: segment.provider,
        isChained: !isFirst
      });
      
      // Store response for next iteration
      previousResponse = response;
      previousProvider = providerInfo.name;
      
      // 📜 SMART SCROLL after each response
      scrollChatToBottom();
      
      // Small delay between requests
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      await hideTypingIndicator();
      hideProviderIndicator();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addSystemMessage(`❌ Error from ${providerInfo.name}: ${errorMessage}`);
      console.error(`Chain error at step ${i + 1}:`, error);
      
      // No need to restore — we never changed the saved provider
      break; // Stop chain on error
    }
  }
  
  // ✅ No restore needed — per-message override never touched localStorage
  console.log('🔙 Default provider unchanged:', originalProvider);
  
  showNotification('✅ All providers responded!', 'success');
  updateConversationInfo();
}

// ============================================================================
// CHAT CONTEXT FUNCTIONS - For AI to understand conversation history
// ============================================================================

/**
 * Get recent conversation messages for AI context
 * This allows the AI to understand previous conversation
 */
function getConversationContext(): { role: string; content: string }[] {
  try {
    const currentConv = conversationManager.getCurrentConversation();
    if (!currentConv || !currentConv.messages || currentConv.messages.length === 0) {
      return [];
    }
    
    // Get recent messages (excluding system messages unless configured)
    let contextMessages = currentConv.messages
      .filter(msg => CHAT_CONTEXT_CONFIG.includeSystemMessages || msg.role !== 'system')
      .slice(-CHAT_CONTEXT_CONFIG.maxContextMessages);
    
    // Limit by character count
    let totalLength = 0;
    const limitedMessages: { role: string; content: string }[] = [];
    
    // Work backwards from most recent
    for (let i = contextMessages.length - 1; i >= 0; i--) {
      const msg = contextMessages[i];
      const msgLength = msg.content.length;
      
      if (totalLength + msgLength <= CHAT_CONTEXT_CONFIG.maxContextLength) {
        limitedMessages.unshift({
          role: msg.role,
          content: msg.content
        });
        totalLength += msgLength;
      } else {
        break;
      }
    }
    
    console.log(`📚 Chat context: ${limitedMessages.length} messages, ${totalLength} chars`);
    return limitedMessages;
    
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return [];
  }
}

/**
 * Build messages array for API call with conversation context
 */
function buildMessagesWithContext(newMessage: string, imageBase64?: string): { role: string; content: any }[] {
  const messages: { role: string; content: any }[] = [];
  
  // Add system prompt if needed
  const systemPrompt = getSystemPrompt();
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  // Add conversation context (previous messages)
  if (CHAT_CONTEXT_CONFIG.enableContextEnhancement) {
    const contextMessages = getConversationContext();
    // Don't include the last user message if it's the same as newMessage (avoid duplication)
    const filteredContext = contextMessages.filter(msg => 
      !(msg.role === 'user' && msg.content === newMessage)
    );
    messages.push(...filteredContext);
  }
  
  // ✅ NEW: Auto-include editor context with the user message
  let enhancedMessage = newMessage;
  try {
    const editorContext = getEditorContextForAI(newMessage);
    if (editorContext && editorContext.trim().length > 0) {
      enhancedMessage = `${editorContext}\n\n---\n\n**User Question:**\n${newMessage}`;
      console.log('📝 Added editor context to message');
    }
  } catch (e) {
    console.warn('Could not get editor context:', e);
  }
  
  // Add the new user message (with editor context if available)
  // 🖼️ VISION: Build multimodal content when image is attached
  if (imageBase64) {
    messages.push({ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
      { type: 'text', text: enhancedMessage }
    ]});
    console.log('🖼️ [Vision] Built multimodal message with image (' + Math.round(imageBase64.length / 1024) + 'KB base64)');
  } else {
    messages.push({ role: 'user', content: enhancedMessage });
  }
  
  return messages;
}

/**
 * Get system prompt based on current context
 */
function getSystemPrompt(): string {
  let prompt = 'You are a helpful AI coding assistant integrated into an IDE. ';
  
  // Add code context if in code analysis mode
  if (isInCodeAnalysis()) {
    const codeContext = getCurrentCodeContext();
    if (codeContext.code) {
      prompt += `\n\nCurrent file being analyzed: ${codeContext.fileName || 'Unknown'}\n`;
      prompt += `Language: ${codeContext.language || 'Unknown'}\n`;
      prompt += `\nCode:\n\`\`\`${codeContext.language || ''}\n${codeContext.code}\n\`\`\`\n`;
    }
  }
  
  return prompt;
}

// ============================================================================
// COMBINED CONTEXT ENHANCEMENT FUNCTION
// ============================================================================

/**
 * Unified message context enhancement
 * Uses both intelligent context and local context
 */
function enhanceMessageWithContext(message: string): string {
  try {
    // First try intelligent context
    const enhanced = enhanceMessageWithIntelligentContext(message);
    if (enhanced !== message) {
      return enhanced;
    }
    // Fallback to local context
    return enhanceWithLocalContext(message);
  } catch {
    return message;
  }
}

// ============================================================================
// CONTEXT STATUS UI - ICON-ONLY MODE (COMPACT)
// ❌ HIDDEN: Visual bar hidden, functionality preserved
// ============================================================================

function initializeContextStatusUI(): void {
  console.log('Initializing compact context status UI (HIDDEN)...');
  
  const chatContainer = document.querySelector('.ai-chat-container');
  if (!chatContainer) {
    console.warn('Chat container not found for context status');
    return;
  }
  
  // Check if already exists
  if (document.getElementById('context-status-bar')) return;
  
  const contextBar = document.createElement('div');
  contextBar.id = 'context-status-bar';
  contextBar.className = 'context-status-bar';
  contextBar.style.cssText = `
    display: none;  /* ❌ HIDDEN - using unified-status-bar instead */
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: rgba(30, 30, 30, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    gap: 8px;
    min-height: 32px;
  `;
  
  // Left side: Icon indicators
  const iconsContainer = document.createElement('div');
  iconsContainer.id = 'context-icons';
  iconsContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  
  // Context status icon
  const contextIcon = document.createElement('span');
  contextIcon.id = 'context-status-icon';
  contextIcon.style.cssText = `
    font-size: 16px;
    cursor: help;
    transition: all 0.2s;
  `;
  contextIcon.title = 'Context Status';
  
  // Message count icon
  const messageIcon = document.createElement('span');
  messageIcon.id = 'message-count-icon';
  messageIcon.style.cssText = `
    font-size: 14px;
    cursor: help;
    display: flex;
    align-items: center;
    gap: 4px;
    color: #4fc3f7;
  `;
  messageIcon.innerHTML = '💬';
  
  const messageCount = document.createElement('span');
  messageCount.id = 'context-message-count';
  messageCount.style.cssText = 'font-size: 11px; color: #888;';
  messageCount.textContent = '0';
  messageIcon.appendChild(messageCount);
  
  // Settings icon (toggle button)
  const settingsIcon = document.createElement('span');
  settingsIcon.id = 'context-toggle-btn';
  settingsIcon.style.cssText = `
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0.8;
  `;
  settingsIcon.innerHTML = '⚙️';
  settingsIcon.title = 'Toggle Context (Click)';
  
  settingsIcon.addEventListener('click', () => {
    const enabled = !isContextEnabled();
    toggleContextSystem(enabled);
    updateContextInfo();
    
    // Visual feedback
    settingsIcon.style.transform = 'rotate(180deg)';
    setTimeout(() => {
      settingsIcon.style.transform = 'rotate(0deg)';
    }, 300);
  });
  
  iconsContainer.appendChild(contextIcon);
  iconsContainer.appendChild(messageIcon);
  iconsContainer.appendChild(settingsIcon);
  
  contextBar.appendChild(iconsContainer);
  
  // Insert before chat container content
  chatContainer.insertBefore(contextBar, chatContainer.firstChild);
  
  // Initial update
  updateContextInfo();
  
  console.log('✅ Context status UI initialized');
}

/**
 * Update context status display
 */
function updateContextInfo(): void {
  const contextIcon = document.getElementById('context-status-icon');
  const messageCountEl = document.getElementById('context-message-count');
  
  if (!contextIcon) return;
  
  const status = getContextStatus();
  const enabled = isContextEnabled();
  
  if (enabled) {
    contextIcon.innerHTML = '🧠';
    contextIcon.title = `Context: Active\nFiles: ${status.filesTracked || 0}\nErrors: ${status.errorsTracked || 0}`;
  } else {
    contextIcon.innerHTML = '💤';
    contextIcon.title = 'Context: Disabled (Click ⚙️ to enable)';
  }
  
  // Update message count
  const currentConv = conversationManager.getCurrentConversation();
  if (messageCountEl && currentConv) {
    messageCountEl.textContent = String(currentConv.messages.length);
  }
}

// ============================================================================
// 📂 PROJECT CONTEXT FUNCTIONS
// These provide intelligent file context when AI Search (✦) is enabled
// ============================================================================

/**
 * Check if AI Search (✦) is enabled
 */
function isAISearchEnabled(): boolean {
  // Check aiFileExplorer's isEnabled property first
  const aiFileExplorer = (window as any).aiFileExplorer;
  if (aiFileExplorer && typeof aiFileExplorer.isEnabled === 'boolean') {
    return aiFileExplorer.isEnabled;
  }
  // Fallback to localStorage
  return localStorage.getItem('aiFileExplorerEnabled') === 'true';
}

/**
 * Get project files from DOM using [data-path] selector
 */
function getProjectFilesFromDOM(): { name: string; path: string; extension: string }[] {
  const files: { name: string; path: string; extension: string }[] = [];
  const seen = new Set<string>();
  
  document.querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path') || '';
    if (!path || seen.has(path)) return;
    
    const name = path.split(/[/\\]/).pop() || '';
    if (!name || name.startsWith('.') || name === 'node_modules') return;
    
    // Skip folders
    const isFolder = el.classList.contains('folder') || 
                     el.classList.contains('directory') ||
                     el.getAttribute('data-type') === 'folder' ||
                     !name.includes('.');
    
    if (!isFolder) {
      const extension = name.includes('.') ? '.' + name.split('.').pop()! : '';
      files.push({ name, path, extension });
      seen.add(path);
    }
  });
  
  return files;
}

/**
 * Get project root path
 */
function getProjectPath(): string | null {
  const header = document.querySelector('.project-header, .fcm-header-name, .project-name');
  if (header) {
    const path = header.getAttribute('data-path') || header.getAttribute('title');
    if (path) return path;
  }
  
  const firstFile = document.querySelector('[data-path]');
  if (firstFile) {
    const fullPath = firstFile.getAttribute('data-path') || '';
    const parts = fullPath.split(/[/\\]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (['src', 'lib', 'app', 'public'].includes(parts[i])) {
        return parts.slice(0, i).join(fullPath.includes('/') ? '/' : '\\');
      }
    }
    return parts.slice(0, -1).join(fullPath.includes('/') ? '/' : '\\');
  }
  
  return (window as any).currentProjectPath || null;
}

/**
 * Detect project type from files
 */
function detectProjectType(files: { name: string; extension: string }[]): string {
  const fileNames = files.map(f => f.name.toLowerCase());
  const extensions = files.map(f => f.extension.toLowerCase());
  
  if (fileNames.includes('cargo.toml')) return 'Rust';
  if (extensions.some(e => ['.ino', '.pde'].includes(e))) return 'Arduino';
  if (fileNames.includes('package.json')) {
    if (extensions.some(e => ['.tsx', '.jsx'].includes(e))) return 'React/TypeScript';
    if (extensions.some(e => e === '.vue')) return 'Vue.js';
    return 'Node.js';
  }
  if (fileNames.includes('requirements.txt') || extensions.includes('.py')) return 'Python';
  if (fileNames.includes('go.mod')) return 'Go';
  if (extensions.some(e => ['.c', '.cpp', '.h'].includes(e))) return 'C/C++';
  
  return 'Unknown';
}

/**
 * Build project context string
 */
function buildProjectContextString(): string {
  const files = getProjectFilesFromDOM();
  const projectPath = getProjectPath();
  const projectName = projectPath?.split(/[/\\]/).pop() || 'Project';
  const projectType = detectProjectType(files);
  
  if (files.length === 0) return '';
  
  const fileList = files.map(f => f.name).slice(0, 30).join(', ');
  const extra = files.length > 30 ? ` ... +${files.length - 30} more` : '';
  
  console.log(`📂 [ProjectContext] Found ${files.length} files, type: ${projectType}`);
  
  return `[PROJECT CONTEXT]
Project: ${projectName}
Type: ${projectType}
Files (${files.length}): ${fileList}${extra}`;
}

/**
 * Extract file names mentioned in message
 */
function extractMentionedFileNames(message: string): string[] {
  const patterns: string[] = [];
  
  // Match file names with extensions
  const fileRegex = /[\w\-_.]+\.[a-zA-Z0-9]+/g;
  const matches = message.match(fileRegex);
  if (matches) {
    matches.forEach(m => patterns.push(m.toLowerCase()));
  }
  
  return [...new Set(patterns)];
}

/**
 * Find file path by name in DOM
 */
function findFilePathByName(fileName: string): string | null {
  const fileNameLower = fileName.toLowerCase();
  const elements = document.querySelectorAll('[data-path]');
  
  for (const el of elements) {
    const path = el.getAttribute('data-path') || '';
    const name = path.split(/[/\\]/).pop()?.toLowerCase() || '';
    
    if (name === fileNameLower) {
      return path;
    }
  }
  return null;
}

/**
 * Read file content directly via Tauri
 */
async function readProjectFile(filePath: string): Promise<string | null> {
  try {
    const tauri = (window as any).__TAURI__;
    if (!tauri?.core?.invoke) return null;
    
    // Use highlight system if available
    const highlightReading = (window as any).highlightFileReading;
    const highlightIndexed = (window as any).highlightFileIndexed;
    
    if (highlightReading) highlightReading(filePath, 0);
    
    let content: string;
    try {
      content = await tauri.core.invoke('read_file_content', { path: filePath });
    } catch {
      try {
        content = await tauri.core.invoke('read_file', { path: filePath });
      } catch (e) {
        console.error('📄 [ProjectContext] Failed to read:', filePath);
        return null;
      }
    }
    
    if (highlightIndexed) highlightIndexed(filePath);
    const fileName = filePath.split(/[/\\]/).pop() || 'file';
    console.log(`📄 [ProjectContext] Read file: ${fileName} (${content.length} chars)`);
    return content;
  } catch (e) {
    console.error('📄 [ProjectContext] Error:', e);
    return null;
  }
}

// Expose to window for debugging (use different names to avoid recursion)
(window as any).checkAISearchEnabled = isAISearchEnabled;
(window as any).getProjectFilesFromDOM = getProjectFilesFromDOM;
(window as any).buildProjectContextString = buildProjectContextString;

// ============================================================================
// 🔍 AI SCANNING VISUAL FEEDBACK
// Shows developers when AI is reading project files
// ============================================================================

let scanningStatusElement: HTMLElement | null = null;
let scanningFilesList: string[] = [];

/**
 * Show scanning indicator - FIXED AT BOTTOM OF IDE
 */
function showAIScanningIndicator(message: string = 'Scanning project...') {
  // 1. Pulse the AI Search button
  const aiSearchBtn = document.querySelector('[data-ai-search-btn], .ai-search-toggle, [title*="AI Search"], .ai-file-search-btn') as HTMLElement;
  if (aiSearchBtn) {
    aiSearchBtn.classList.add('ai-scanning-pulse');
    aiSearchBtn.setAttribute('data-scanning', 'true');
  }
  
  // Inject styles FIRST
  injectScanningStyles();
  
  // Check if element exists AND is still in DOM
  const existingElement = document.getElementById('ai-scanning-status');
  if (existingElement) {
    // Reuse existing element - just update text and make visible
    existingElement.classList.remove('ai-scan-hiding', 'ai-scan-complete');
    const textEl = existingElement.querySelector('.ai-scanning-text');
    const spinnerEl = existingElement.querySelector('.ai-scanning-spinner') as HTMLElement;
    const stageEl = existingElement.querySelector('.ai-scanning-stage');
    const titleEl = existingElement.querySelector('.ai-scanning-title');
    if (textEl) textEl.textContent = message;
    if (stageEl) stageEl.textContent = 'Initializing...';
    if (titleEl) titleEl.textContent = 'AI Context';
    if (spinnerEl) {
      spinnerEl.style.animation = '';
      spinnerEl.style.border = '2px solid #3d4356';
      spinnerEl.style.borderTopColor = '#3b82f6';
    }
    scanningStatusElement = existingElement;
    scanningFilesList = [];
    console.log(`🔍 [AI Scan] Reusing existing status bar: ${message}`);
    return;
  }
  
  // 2. Create NEW status element - PROFESSIONAL UI
  scanningStatusElement = document.createElement('div');
  scanningStatusElement.id = 'ai-scanning-status';
  scanningStatusElement.innerHTML = `
    <div class="ai-scanning-content">
      <div class="ai-scanning-header">
        <span class="ai-scanning-indicator"></span>
        <span class="ai-scanning-title">AI Context</span>
      </div>
      <div class="ai-scanning-body">
        <div class="ai-scanning-progress">
          <span class="ai-scanning-spinner"></span>
          <div class="ai-scanning-info">
            <span class="ai-scanning-stage">Checking project files...</span>
            <span class="ai-scanning-text">${message}</span>
          </div>
        </div>
        <span class="ai-scanning-files"></span>
      </div>
      <div class="ai-scanning-bar"></div>
    </div>
  `;
  
  // Append to body - CSS will position it at bottom
  document.body.appendChild(scanningStatusElement);
  console.log('🔍 [AI Scan] Status bar added at bottom of IDE');
  
  scanningFilesList = [];
  console.log(`🔍 [AI Scan] ${message}`);
}

/**
 * Update scanning stage message
 */
function updateAIScanningStage(stage: string) {
  if (scanningStatusElement) {
    const stageEl = scanningStatusElement.querySelector('.ai-scanning-stage');
    if (stageEl) stageEl.textContent = stage;
  }
  console.log(`🔍 [AI Scan] Stage: ${stage}`);
}

/**
 * Update scanning status with current file being read
 */
function updateAIScanningFile(fileName: string) {
  // Extract just the filename if it's a full path
  const shortName = fileName.split(/[/\\]/).pop() || fileName;
  scanningFilesList.push(shortName);
  
  if (scanningStatusElement) {
    const filesEl = scanningStatusElement.querySelector('.ai-scanning-files');
    if (filesEl) {
      filesEl.textContent = shortName;
    }
    
    const stageEl = scanningStatusElement.querySelector('.ai-scanning-stage');
    if (stageEl) {
      stageEl.textContent = `Reading file ${scanningFilesList.length}...`;
    }
    
    const textEl = scanningStatusElement.querySelector('.ai-scanning-text');
    if (textEl) {
      textEl.textContent = shortName;
    }
  }
  
  // Highlight file in explorer using multiple methods
  // Method 1: Use existing highlight system
  const highlightReading = (window as any).highlightFileReading;
  if (highlightReading) {
    try { highlightReading(fileName, 0); } catch (e) { /* ignore */ }
  }
  
  // Method 2: Direct DOM highlight - find by exact name or partial path
  const selectors = [
    `[data-path$="${shortName}"]`,
    `[data-path*="${shortName}"]`,
    `[data-path="${fileName}"]`
  ];
  
  for (const selector of selectors) {
    const fileElements = document.querySelectorAll(selector);
    fileElements.forEach(el => {
      el.classList.add('ai-file-scanning');
      // Remove after 1.5 seconds
      setTimeout(() => el.classList.remove('ai-file-scanning'), 1500);
    });
    if (fileElements.length > 0) break;
  }
  
  console.log(`📄 [AI Scan] Reading: ${shortName}`);
}

/**
 * Hide scanning indicator
 */
function hideAIScanningIndicator(fileCount: number = 0) {
  // Remove pulse from button
  const aiSearchBtn = document.querySelector('[data-ai-search-btn], .ai-search-toggle, [title*="AI Search"], .ai-file-search-btn') as HTMLElement;
  if (aiSearchBtn) {
    aiSearchBtn.classList.remove('ai-scanning-pulse');
    aiSearchBtn.removeAttribute('data-scanning');
  }
  
  // Show completion briefly, then hide
  if (scanningStatusElement) {
    const stageEl = scanningStatusElement.querySelector('.ai-scanning-stage');
    const textEl = scanningStatusElement.querySelector('.ai-scanning-text');
    const spinnerEl = scanningStatusElement.querySelector('.ai-scanning-spinner');
    const filesEl = scanningStatusElement.querySelector('.ai-scanning-files');
    const titleEl = scanningStatusElement.querySelector('.ai-scanning-title');
    
    if (stageEl && textEl && spinnerEl) {
      // Spinner becomes checkmark via CSS
      (spinnerEl as HTMLElement).style.animation = 'none';
      
      // Update messages
      if (titleEl) titleEl.textContent = 'Complete';
      stageEl.textContent = fileCount > 0 
        ? `Loaded ${fileCount} file(s)` 
        : 'Context ready';
      textEl.textContent = scanningFilesList.length > 0 
        ? scanningFilesList.slice(-3).join(', ')
        : 'Ready';
      
      // Add success styling
      scanningStatusElement.classList.add('ai-scan-complete');
      
      // Update files badge
      if (filesEl) {
        filesEl.textContent = fileCount > 0 ? `${fileCount}` : '';
      }
    }
    
    // Fade out after 4 seconds (longer display time)
    setTimeout(() => {
      if (scanningStatusElement) {
        scanningStatusElement.classList.add('ai-scan-hiding');
        
        // Remove from DOM after fade animation
        setTimeout(() => {
          if (scanningStatusElement) {
            scanningStatusElement.remove();
            scanningStatusElement = null; // Reset so it recreates next time
          }
        }, 300);
      }
    }, 4000);  // 4 seconds display time
  }
  
  // Mark files as indexed using existing highlight system
  const highlightIndexed = (window as any).highlightFileIndexed;
  if (highlightIndexed) {
    scanningFilesList.forEach(file => {
      try { highlightIndexed(file); } catch (e) { /* ignore */ }
    });
  }
  
  console.log(`✅ [AI Scan] Complete! ${fileCount} file(s) loaded`);
}

/**
 * Inject CSS styles for scanning animation
 */
function injectScanningStyles() {
  if (document.getElementById('ai-scanning-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-scanning-styles';
  style.textContent = `
    /* Pulsing animation for AI Search button */
    .ai-scanning-pulse {
      animation: ai-scan-pulse 1s ease-in-out infinite !important;
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7) !important;
      position: relative;
    }
    
    .ai-scanning-pulse::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      border: 2px solid #3b82f6;
      animation: ai-scan-ring 1s ease-out infinite;
      pointer-events: none;
    }
    
    @keyframes ai-scan-pulse {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.4);
        transform: scale(1.1);
      }
    }
    
    @keyframes ai-scan-ring {
      0% { 
        transform: scale(1);
        opacity: 1;
      }
      100% { 
        transform: scale(1.5);
        opacity: 0;
      }
    }
    
    /* Scanning status bar - PROFESSIONAL DIALOG */
    #ai-scanning-status {
      position: fixed;
      bottom: 55px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      padding: 0;
      background: #1e2030;
      border: 1px solid #2d3348;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 400;
      color: #c8ccd4;
      z-index: 99999;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4),
                  0 0 1px rgba(0, 0, 0, 0.5);
      animation: ai-status-slide-up 0.25s ease-out;
      opacity: 1;
      transition: all 0.25s ease-out;
      min-width: 280px;
      max-width: 380px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }
    
    @keyframes ai-status-slide-up {
      from {
        transform: translateX(-50%) translateY(16px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    
    .ai-scanning-content {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    
    .ai-scanning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #252836;
      border-bottom: 1px solid #2d3348;
    }
    
    .ai-scanning-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      animation: ai-indicator-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes ai-indicator-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
    }
    
    .ai-scanning-title {
      font-size: 11px;
      font-weight: 600;
      color: #8b92a8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .ai-scanning-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      gap: 12px;
    }
    
    .ai-scanning-progress {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    
    .ai-scanning-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #3d4356;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: ai-spin 0.8s linear infinite;
    }
    
    @keyframes ai-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .ai-scanning-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .ai-scanning-stage {
      font-size: 12px;
      font-weight: 500;
      color: #e4e7ed;
    }
    
    .ai-scanning-text {
      font-size: 11px;
      font-weight: 400;
      color: #6b7280;
    }
    
    .ai-scanning-files {
      color: #93c5fd;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 10px;
      font-weight: 500;
      background: #282c3c;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #3d4356;
    }
    
    .ai-scanning-files:empty {
      display: none;
    }
    
    .ai-scanning-bar {
      height: 2px;
      background: #2d3348;
      position: relative;
      overflow: hidden;
    }
    
    .ai-scanning-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, transparent, #3b82f6, transparent);
      animation: ai-progress-bar 1.2s ease-in-out infinite;
    }
    
    @keyframes ai-progress-bar {
      0% { left: -40%; }
      100% { left: 100%; }
    }
    
    /* File explorer highlight for scanned files */
    [data-path].ai-file-scanning {
      background: rgba(59, 130, 246, 0.15) !important;
      border-left: 2px solid #3b82f6 !important;
    }
    
    /* Success state */
    #ai-scanning-status.ai-scan-complete {
      border-color: #2d4a3e;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-header {
      background: #1e2e28;
      border-bottom-color: #2d4a3e;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-indicator {
      background: #22c55e;
      animation: none;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-spinner {
      border: none;
      width: 16px;
      height: 16px;
      background: transparent;
      animation: none;
      position: relative;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-spinner::before {
      content: '✓';
      color: #22c55e;
      font-size: 14px;
      font-weight: 600;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-stage {
      color: #86efac;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-files {
      background: #1e2e28;
      border-color: #2d4a3e;
      color: #86efac;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-bar {
      background: #22c55e;
    }
    
    #ai-scanning-status.ai-scan-complete .ai-scanning-bar::after {
      display: none;
    }
    
    /* HIDING STATE */
    #ai-scanning-status.ai-scan-hiding {
      opacity: 0 !important;
      transform: translateX(-50%) translateY(16px) !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
  console.log('🎨 [AI Scan] Styles injected (explorer panel mode)');
}

// Expose scanning functions to window
(window as any).showAIScanningIndicator = showAIScanningIndicator;
(window as any).updateAIScanningFile = updateAIScanningFile;
(window as any).updateAIScanningStage = updateAIScanningStage;
(window as any).hideAIScanningIndicator = hideAIScanningIndicator;

// ============================================================================
// SEND MESSAGE DIRECTLY - REQUIRED BY codeAnalysisManager.ts
// 🎯 WITH CALIBRATION INTEGRATION
// ⚡ WITH INSTANT TERMINAL ERROR SOLUTIONS
// 📜 WITH SMART SCROLL MANAGER
// 📂 WITH PROJECT CONTEXT INTEGRATION
// ============================================================================

/**
 * Send message directly without user input
 * Used by codeAnalysisManager and other modules for programmatic messaging
 * ✅ Includes conversation context for AI to understand history
 * 🎯 Records results to calibration system
 * ⚡ Checks for instant terminal solutions BEFORE calling AI
 * 📜 Uses smart scroll manager for better UX
 */
export async function sendMessageDirectly(message: string, overrideConfig?: any, imageBase64?: string): Promise<void> {
  // ⭐ AI ANALYSIS CLEAN DISPLAY
  // Format messy AI Analysis messages for cleaner chat display
  let displayMessage = message;
  let aiAnalysisContext: { fileName: string; fileSize: number; code: string; action: string } | null = null;
  
  // Pattern 1: "Please explain this file in detail:\n**File:** filename```code```..."
  const pattern1 = message.match(/^(Please explain this file in detail|Explain this code|Analyze this code|Debug this code|Optimize this code|Review this code|Refactor this code|Document this code|Find bugs in this code|Improve this code)[:\s]*\n?\*\*File:\*\*\s*([^\n`]+?)\s*```[\w]*\n?([\s\S]*?)```/i);
  
  // Pattern 2: "Explain: filename\n```code```"
  const pattern2 = message.match(/^(Explain|Analyze|Debug|Optimize|Review|Refactor|Document|Improve)[:\s]+([^\n`]+?)\s*\n```[\w]*\n?([\s\S]*?)```/i);
  
  // Pattern 3: Direct code with file marker
  const pattern3 = message.match(/^\*\*File:\*\*\s*([^\n`]+?)\s*```[\w]*\n?([\s\S]*?)```/i);
  
  if (pattern1) {
    const action = pattern1[1].replace(/Please |this file |this code |in detail/gi, '').trim();
    const fileName = pattern1[2].trim();
    const code = pattern1[3];
    displayMessage = `📄 **${action}:** \`${fileName}\` (${formatFileSize(code.length)})`;
    aiAnalysisContext = { fileName, fileSize: code.length, code, action };
    console.log(`🎨 [AI Analysis] Cleaned: "${action}" on ${fileName} (${code.length} bytes)`);
  } else if (pattern2) {
    const action = pattern2[1];
    const fileName = pattern2[2].trim();
    const code = pattern2[3];
    displayMessage = `📄 **${action}:** \`${fileName}\` (${formatFileSize(code.length)})`;
    aiAnalysisContext = { fileName, fileSize: code.length, code, action };
    console.log(`🎨 [AI Analysis] Cleaned: "${action}" on ${fileName} (${code.length} bytes)`);
  } else if (pattern3) {
    const fileName = pattern3[1].trim();
    const code = pattern3[2];
    displayMessage = `📄 **Analyze:** \`${fileName}\` (${formatFileSize(code.length)})`;
    aiAnalysisContext = { fileName, fileSize: code.length, code, action: 'Analyze' };
    console.log(`🎨 [AI Analysis] Cleaned: Analyze ${fileName} (${code.length} bytes)`);
  }
  
  // ⚡ INSTANT TERMINAL FIX - Check for known errors BEFORE calling AI
  const instantSolution = findInstantTerminalSolution(message);
  if (instantSolution) {
    console.log('⚡ [InstantFix] Found instant solution, skipping AI call');
    displayInstantSolution(message, instantSolution);
    
    // Mark terminal errors as resolved
    try {
      (window as any).terminalContext?.markResolved?.();
    } catch (e) {
      // Ignore
    }
    
    // Save to conversation for history
    conversationManager.addMessage('user', message, { messageType: 'normal' });
    conversationManager.addMessage('assistant', `⚡ **Instant Solution: ${instantSolution.title}**\n\n${instantSolution.solution}`, { 
      messageType: 'normal',
      provider: 'instant-fix'
    });
    
    return; // Don't call AI!
  }
  // ⚡ END INSTANT TERMINAL FIX

  // 💬 CONVERSATION HISTORY CONTEXT
  if ((window as any).enhanceWithConversationHistory) {
    try {
      const result = (window as any).enhanceWithConversationHistory(message);
      console.log('[💬 ConvHistory] Called!', result?.analysis?.relationshipType);
    } catch (e) {
      console.warn('[ConvHistory] Error:', e);
    }
  }

  // 🔍 AI HISTORY SEARCH - Inject past conversation context into message
  // This allows AI to answer questions about previous conversations
  const originalMessage = message; // Keep original for display
  if ((window as any).enhanceMessageWithHistory) {
    try {
      // ⚡ IMPORTANT: This is async - must await!
      const historyResult = await (window as any).enhanceMessageWithHistory(message);
      if (historyResult?.searchResult?.shouldSearch && historyResult?.searchResult?.results?.length > 0) {
        const contextLen = historyResult.enhancedMessage.length - message.length;
        message = historyResult.enhancedMessage; // Use enhanced message for AI
        console.log(`[🔍 AI History] ✅ Context injected in assistantUI: ${contextLen} chars`);
        console.log(`[🔍 AI History] Results: ${historyResult.searchResult.results.length} conversations`);
      }
    } catch (e) {
      console.warn('[AI History] Error in assistantUI:', e);
    }
  }
  // 🔍 END AI HISTORY SEARCH

  const chatContainer = document.querySelector('.ai-chat-container');
    // Enhance message with terminal context if enabled
  if (isTerminalContextEnabled()) {
    message = enhanceMessageWithTerminalContext(message);
  }
  if (!chatContainer) return;
  
  // Check for project question interception
  const interceptionResult = interceptProjectQuestions(message);
  if (interceptionResult.handled) {
    console.log('✅ Project question handled directly');
    return;
  }
  
  const messageId = generateId();
  // ⭐ Show clean display message in UI (use originalMessage if we injected history context)
  // This ensures users see their clean question, not the injected context
  const cleanDisplayMessage = displayMessage !== message ? displayMessage : (originalMessage || displayMessage);
  // 🔧 FIX: Set shouldSave=false because conversationManager.addMessage handles persistence
  await addMessageToChat('user', cleanDisplayMessage, false, messageId);
  
  // 📜 SMART SCROLL - Force scroll when user sends message
  forceScrollChatToBottom();
  
  // Save ORIGINAL message to conversation manager (NOT the one with history context)
  // This prevents the context from being saved to history and re-injected
  conversationManager.addMessage('user', originalMessage || message, { messageType: 'normal' });
  
  // 🔧 FIX: REMOVED duplicate queueMessageForSaving - conversationManager.addMessage already saves
  // queueMessageForSaving('user', message, { messageType: 'suggestion-response' });
  
  updateConversationInfo();
  updateContextInfo();
  showTypingIndicator();
  
  // 🎯 CALIBRATION: Track timing and detect task type
  const startTime = Date.now();
  let taskType: TaskType = 'general';
  try {
    const detected = detectTaskType(message);
    taskType = detected.taskType;
  } catch (e) {
    console.warn('Could not detect task type:', e);
  }
  
  let currentProvider: string = 'unknown';
  
  try {
    // ✅ PER-MESSAGE OVERRIDE: Use temporary override config if provided (from # tags)
    // Otherwise fall back to the saved default from localStorage
    const config = overrideConfig || getCurrentApiConfigurationForced();
    currentProvider = config.provider || 'unknown';
    
    if (overrideConfig) {
      console.log(`🏷️ Using per-message override config: ${config.provider} (default provider unchanged)`);
    }
    
    if (!config.apiKey || !config.apiBaseUrl) {
      await hideTypingIndicator();
      hideProviderIndicator();
      addSystemMessage(`API not configured`);
      return;
    }
    
    // ✅ FIXED: Build messages with conversation context
    const messagesWithContext = buildMessagesWithContext(message, imageBase64);
    console.log(`📨 Sending message with ${messagesWithContext.length} context messages${imageBase64 ? ' + 🖼️ image' : ''}`);
    
    // 🔍 AI FILE EXPLORER: Enhance message with relevant file context
    let enhancedMessage = message;

    // 📺 TERMINAL CONTEXT: Add terminal logs if enabled
    if (isTerminalContextEnabled()) {
      enhancedMessage = enhanceMessageWithTerminalContext(enhancedMessage);
      console.log('📺 Added terminal context to message');
    }

    // 🔀 GIT CONTEXT: Auto-inject real Git status/info when user asks Git-related questions
    try {
      const gitKeywords = /\b(git|commit|push|pull|merge|branch|staged|unstaged|untracked|diff|stash|rebase|cherry.?pick|checkout|changes|modified files|what changed|status)\b/i;
      if (gitKeywords.test(message)) {
        const projectPath = (window as any).currentProjectPath || 
          (window as any).lastOpenedProjectPath || '';
        const tauriInvoke = (window as any).__TAURI__?.core?.invoke;
        
        if (projectPath && tauriInvoke) {
          let gitContext = '';
          
          try {
            // Check if it's a git repo first
            const isRepo = await tauriInvoke('git_is_repo', { path: projectPath });
            
            if (isRepo) {
              // Fetch real Git info
              const gitInfo = await tauriInvoke('git_info', { path: projectPath }) as any;
              const gitStatus = await tauriInvoke('git_status', { path: projectPath }) as any[];
              
              const staged = gitStatus.filter((f: any) => f.staged);
              const unstaged = gitStatus.filter((f: any) => !f.staged && f.status !== 'untracked');
              const untracked = gitStatus.filter((f: any) => f.status === 'untracked');
              
              gitContext += '\n\n[🔀 LIVE GIT STATUS - Real data from the current project]\n';
              gitContext += `Repository: ${projectPath}\n`;
              gitContext += `Branch: ${gitInfo.branch || 'unknown'}`;
              if (gitInfo.remote) gitContext += ` → tracking ${gitInfo.remote}`;
              if (gitInfo.ahead > 0) gitContext += ` (${gitInfo.ahead} ahead)`;
              if (gitInfo.behind > 0) gitContext += ` (${gitInfo.behind} behind)`;
              gitContext += '\n';
              
              if (gitInfo.last_commit) {
                gitContext += `Last commit: ${gitInfo.last_commit.short_hash} - ${gitInfo.last_commit.message} (${gitInfo.last_commit.relative_date})\n`;
              } else {
                gitContext += 'Last commit: No commits yet (new repository)\n';
              }
              
              if (gitInfo.user_name) {
                gitContext += `Author: ${gitInfo.user_name} <${gitInfo.user_email || ''}>\n`;
              }
              
              gitContext += `\nTotal changes: ${gitStatus.length} file(s)\n`;
              
              if (staged.length > 0) {
                gitContext += `\nStaged (${staged.length}):\n`;
                staged.forEach((f: any) => {
                  gitContext += `  ✅ [${f.status?.toUpperCase() || 'S'}] ${f.path}\n`;
                });
              }
              
              if (unstaged.length > 0) {
                gitContext += `\nModified/Unstaged (${unstaged.length}):\n`;
                unstaged.forEach((f: any) => {
                  gitContext += `  📝 [${f.status?.toUpperCase() || 'M'}] ${f.path}\n`;
                });
              }
              
              if (untracked.length > 0) {
                gitContext += `\nUntracked (${untracked.length}):\n`;
                untracked.forEach((f: any) => {
                  gitContext += `  ❓ [U] ${f.path}\n`;
                });
              }
              
              if (gitStatus.length === 0) {
                gitContext += '\nWorking tree is clean — no changes to commit.\n';
              }
              
              gitContext += '[END GIT STATUS]\n';
              
              enhancedMessage = gitContext + '\n' + enhancedMessage;
              console.log(`🔀 Added live Git context: ${gitStatus.length} files, branch: ${gitInfo.branch}`);
            }
          } catch (gitError) {
            console.warn('🔀 Git context fetch failed (not a git repo?):', gitError);
          }
        }
      }
    } catch (gitDetectError) {
      console.warn('🔀 Git context detection error:', gitDetectError);
    }

    // 📂 PROJECT CONTEXT: Add project overview and file contents when AI Search is ON
    let filesReadCount = 0;
    try {
      if (isAISearchEnabled()) {
        console.log('🔍 [ProjectContext] AI Search enabled, enhancing message...');
        
        // 🔍 VISUAL FEEDBACK: Show scanning indicator
        showAIScanningIndicator('Initializing...');
        
        // Stage 1: Check project file list
        updateAIScanningStage('Checking project file list...');
        await new Promise(r => setTimeout(r, 300)); // Brief delay for UI
        
        // 1. Build project overview (file list)
        const projectContext = buildProjectContextString();
        
        // Stage 2: Analyzing message
        updateAIScanningStage('Analyzing your request...');
        await new Promise(r => setTimeout(r, 200)); // Brief delay for UI
        
        // 2. Find and read any files mentioned in the message
        const mentionedFiles = extractMentionedFileNames(message);
        let fileContents = '';
        
        if (mentionedFiles.length > 0) {
          // Stage 3: Reading files
          updateAIScanningStage(`Found ${mentionedFiles.length} file(s) to read...`);
        }
        
        for (const fileName of mentionedFiles) {
          const filePath = findFilePathByName(fileName);
          if (filePath) {
            // 🔍 VISUAL FEEDBACK: Show which file is being read
            updateAIScanningFile(fileName);
            
            const content = await readProjectFile(filePath);
            if (content) {
              fileContents += `\n\n=== FILE: ${fileName} ===\n`;
              fileContents += content.substring(0, 5000);
              if (content.length > 5000) fileContents += '\n...(truncated)';
              filesReadCount++;
            }
          }
        }
        
        // Stage 4: Building context
        if (projectContext || fileContents) {
          updateAIScanningStage('Building project context...');
          await new Promise(r => setTimeout(r, 200)); // Brief delay for UI
          enhancedMessage = `${projectContext}${fileContents}\n\n---\n\n${enhancedMessage}`;
          console.log('✅ [ProjectContext] Message enhanced with project context');
        }
        
        // 🔍 VISUAL FEEDBACK: Hide scanning indicator with success
        hideAIScanningIndicator(filesReadCount);
      }
    } catch (projectError) {
      console.warn('Failed to add project context:', projectError);
      // Hide indicator on error too
      hideAIScanningIndicator(0);
    }

    // 📎 FILE ATTACHMENTS: Add any manually attached files
    try {
      const pendingContext = getPendingFileContext();
      if (pendingContext) {
        enhancedMessage = `${enhancedMessage}\n\n[📎 User-attached files]\n${pendingContext}`;
        console.log('📎 Added pending file context');
      }
      
      // Fallback: Auto-detect if message might need file context (when AI Search is OFF)
      if (!isAISearchEnabled()) {
        const fileKeywords = ['file', 'code', 'function', 'class', 'component', 'module', 'import', 'error', 'bug', 'fix', 'why', 'how'];
        const mightNeedFiles = fileKeywords.some(k => message.toLowerCase().includes(k));
        
        if (mightNeedFiles && !pendingContext) {
          const relatedFiles = await findRelatedFiles(message);
          if (relatedFiles.length > 0) {
            const fileContents: string[] = [];
            for (const file of relatedFiles.slice(0, 3)) {
              if (file.type === 'file') {
                const content = await readFileForAI(file.path, 4000);
                if (content) {
                  fileContents.push(`📄 **${content.name}**\n\`\`\`${content.language}\n${content.content}\n\`\`\``);
                }
              }
            }
            
            if (fileContents.length > 0) {
              enhancedMessage = `${enhancedMessage}\n\n[🔍 AI File Explorer - Auto-included ${fileContents.length} relevant files]\n${fileContents.join('\n\n---\n\n')}`;
              console.log(`🔍 Auto-included ${fileContents.length} relevant files`);
            }
          }
        }
      }
    } catch (fileError) {
      console.warn('Failed to enhance with file context:', fileError);
      // Continue without file context
    }
    
    // ✅ AUTO-ROUTE FIX: Check if orchestrator Auto-Route is enabled
    
    // 🖼️ VISION SYNC: Update last user message in messagesWithContext with enhanced content + image
    // This is needed because enhancedMessage was enriched with terminal/git/project context AFTER buildMessagesWithContext
    const lastUserIdx = [...messagesWithContext].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx >= 0) {
      const actualIdx = messagesWithContext.length - 1 - lastUserIdx;
      if (imageBase64) {
        messagesWithContext[actualIdx] = { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: 'text', text: enhancedMessage }
        ]};
        console.log('🖼️ [Vision] Synced multimodal content with enhanced context into messages array');
      } else {
        messagesWithContext[actualIdx] = { role: 'user', content: enhancedMessage };
      }
    }
    
    let apiResponse: string;
    const orchestrator = (window as any).orchestrator;
    const orchestratorConfig = orchestrator?.get?.()?.getConfig?.() || orchestrator?.getConfig?.();
    const isAutoRouteEnabled = orchestratorConfig?.enableAutoRouting === true;
    
    // Count active providers (providers with API keys and not disabled)
    let activeProviderCount = 0;
    if (orchestratorConfig?.providers) {
      const providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
      for (const [name, provider] of Object.entries(orchestratorConfig.providers) as any) {
        if (provider?.enabled && provider?.apiKey) {
          const role = providerRoles[name] || 'auto';
          if (role !== 'disabled' && role !== '') {
            activeProviderCount++;
          }
        }
      }
    }
    
    console.log(`🔀 Auto-Route check: enabled=${isAutoRouteEnabled}, activeProviders=${activeProviderCount}`);
    
    if (isAutoRouteEnabled && activeProviderCount >= 2 && orchestrator?.send) {
      // ✅ USE ORCHESTRATOR AUTO-ROUTE
      console.log('🎛️ Using Auto-Route orchestrator for message...');
      try {
        const result = await orchestrator.send(enhancedMessage);
        apiResponse = result.response;
        currentProvider = result.provider;
        taskType = result.taskType || taskType;
        console.log(`✅ Auto-Route completed: ${currentProvider} (${result.latencyMs}ms)`);
      } catch (orchError) {
        console.warn('⚠️ Auto-Route failed, falling back to direct API:', orchError);
        // Fallback to direct API call
        apiResponse = await callGenericAPI(enhancedMessage, config, messagesWithContext);
      }
    } else {
      // ✅ USE DIRECT API CALL (original behavior)
      console.log(`📡 Direct API call to ${config.provider} (Auto-Route: ${isAutoRouteEnabled ? 'ON but <2 providers' : 'OFF'})`);
      apiResponse = await callGenericAPI(enhancedMessage, config, messagesWithContext);
    }
    
    // 🎯 CALIBRATION: Record successful result
    const latency = Date.now() - startTime;
    try {
      const providerName = mapProviderToCalibrationName(currentProvider || config.provider);
      recordResult(providerName, taskType, true, latency);
      console.log(`🎯 Calibration recorded: ${providerName} / ${taskType} = SUCCESS (${latency}ms)`);
      
      // Show feedback widget (if enabled)
      const calibrationManager = getCalibrationManager();
      if (calibrationManager.getConfig().enableUserFeedback) {
        showFeedbackWidget(providerName, taskType, latency);
      }
    } catch (calError) {
      console.warn('Calibration recording failed:', calError);
    }
    
    const responseId = generateId();
    // 🎨 Transform content for IDE display
    const transformedResponse = transformContentForIDE(apiResponse);
    
    // 🔧 FIX: Set shouldSave=false because conversationManager.addMessage handles persistence
    await addMessageToChat('assistant', transformedResponse, {
      shouldSave: false,  // ← FIXED: Don't double-save
      messageId: responseId,
      providerName: currentProvider || config.provider
    });
    
    // ⭐ AUTO-APPLY: If autonomous mode is ON, auto-apply code to editor
    try {
      const isAutoMode = (window as any).__isAutonomousModeActive === true;
      if (isAutoMode) {
        autoApplyCodeFromResponse(apiResponse);
      }
    } catch (autoApplyError) {
      console.error('Auto-apply error:', autoApplyError);
    }
    
    // 🔧 FIXED: Save with actual provider used
    const actualProvider = currentProvider || config.provider;
    
    // Save assistant response to conversation - THIS IS THE ONLY SAVE NEEDED
    conversationManager.addMessage('assistant', apiResponse, { 
      messageType: 'normal',
      provider: actualProvider
    });

    // IDE Script Bridge: Execute ide_script commands from AI response
    if (apiResponse.includes('ide_script') && (window as any).processAiScriptResponse) {
      try {
        const scriptResult = await (window as any).processAiScriptResponse(apiResponse);
        if (scriptResult.executed > 0) {
          console.log('[IDE Script] Executed ' + scriptResult.executed + ' command(s), ' + scriptResult.results.filter((r: any) => r.success).length + ' succeeded');
        }
      } catch (scriptErr) {
        console.error('[IDE Script] Execution error:', scriptErr);
      }
    }
    
    // 🔧 FIX: REMOVED duplicate queueMessageForSaving - conversationManager.addMessage already saves
    // queueMessageForSaving('assistant', apiResponse, {
    //   messageType: 'suggestion-response',
    //   provider: actualProvider
    // });
    
    await hideTypingIndicator();
    hideProviderIndicator();
    updateConversationInfo();
    updateContextInfo();
    
    // Learn from interaction for context system
    try {
      learnFromInteraction(message, apiResponse);
    } catch (e) {
      // Ignore learning errors
    }
    
    // Notify file integration about AI response
    try {
      document.dispatchEvent(new CustomEvent('ai-response-received', {
        detail: {
          response: apiResponse,
          userMessage: message
        }
      }));
      console.log('📨 Dispatched ai-response-received event');
    } catch (error) {
      console.error('Error dispatching event:', error);
    }
    
    // 📜 SMART SCROLL - Scroll after AI response (respects user reading history)
    scrollChatToBottom();
    
  } catch (error) {
    // 🎯 CALIBRATION: Record failure
    const latency = Date.now() - startTime;
    try {
      const providerName = mapProviderToCalibrationName(currentProvider);
      recordResult(providerName, taskType, false, latency);
      console.log(`🎯 Calibration recorded: ${providerName} / ${taskType} = FAILURE`);
    } catch (calError) {
      console.warn('Calibration recording failed:', calError);
    }
    
    // ✅ Stop file processing animation on error
    (window as any).chatFileDrop?.stopProcessing?.();
    
    await hideTypingIndicator();
    hideProviderIndicator();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addSystemMessage(`Error: ${errorMessage}`);
    trackError(errorMessage);
  }
}

// ============================================================================
// HANDLE ENHANCED SEND MESSAGE - Main chat input handler
// ============================================================================
async function handleEnhancedSendMessage(): Promise<void> {
  const messageInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!messageInput) return;
  
  let message = messageInput.value.trim();
  
  // ✅ Use window API instead of import
  const chatFileDrop = (window as any).chatFileDrop;
  const attachedFilesContent = await chatFileDrop?.getFilesForAI() || '';
  const attachedFiles = chatFileDrop?.getFiles() || [];
  const contextFiles = chatFileDrop?.getContextFiles() || [];
  const hasFiles = attachedFiles.length > 0;
  const hasContext = contextFiles.length > 0;
  
  if (!message && !hasFiles) return;
  
  console.log('📨 handleEnhancedSendMessage called with:', message.substring(0, 100));
  
  // Clear input immediately
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // ✅ Check for multiple provider tags (chained requests)
  // Example: "#groq how many lines. #gemini review this."
  const isMultiProvider = hasMultipleProviders(message);
  console.log('🔍 hasMultipleProviders:', isMultiProvider);
  
  if (isMultiProvider) {
    console.log('🔗 Detected chained provider request');
    const segments = parseMultiProviderMessage(message);
    console.log('📊 Parsed segments:', segments);
    
    if (segments.length > 0) {
      // Clear files
      chatFileDrop?.clearFiles();
      
      // Execute chained requests
      await executeChainedProviderRequests(segments);
      return;
    }
  }
  
  // ✅ Parse single #provider tag from message (e.g., "#groq how many lines of code")
  const { provider: targetProvider, cleanMessage } = parseProviderFromMessage(message);
  console.log('🎯 Single provider parse:', { targetProvider, cleanMessage: cleanMessage.substring(0, 50) });
  
  // ✅ Per-message override: build temp config WITHOUT saving to localStorage
  let perMessageOverrideConfig: any = null;
  
  if (targetProvider) {
    console.log(`🏷️ Per-message override: routing to ${targetProvider} (temporary, NOT saved)`);
    perMessageOverrideConfig = getTemporaryProviderConfig(targetProvider as any);
    
    if (!perMessageOverrideConfig) {
      console.warn(`⚠️ Could not build config for provider: ${targetProvider}`);
    }
    
    // Use clean message without the #provider tag
    message = cleanMessage;
    
    // Show notification
    const providerInfo = getProviderInfo(targetProvider);
    showNotification(`${providerInfo.icon} Asking ${providerInfo.name}... (one-time)`, 'info');
  }
  
  // ✅ Start file processing animation
  if (chatFileDrop?.startProcessing) {
    chatFileDrop.startProcessing(message);
  }
  if (hasContext && chatFileDrop?.startAllProcessing && message) {
    const lowerMsg = message.toLowerCase();
    const mentionsFile = lowerMsg.includes('file') || lowerMsg.includes('code') || 
                         lowerMsg.includes('📎') || lowerMsg.includes('analyze') ||
                         lowerMsg.includes('check') || lowerMsg.includes('look') ||
                         lowerMsg.includes('this') || lowerMsg.includes('the');
    if (mentionsFile) {
      chatFileDrop.startAllProcessing();
    }
  }
  
  if (message && isProjectCreationRequest(message)) {
    await handleProjectScaffoldingRequest(message, messageInput);
    chatFileDrop?.clearFiles();
    chatFileDrop?.stopProcessing?.();
    return;
  }
  
 if (message) {
    message = enhanceMessageContextForCurrentFile(message);
    
    // ✅ Selection context for highlighted code
    const selectionContext = getSelectionContext();
    if (selectionContext && isAskingAboutSelection(message)) {
      message = `${selectionContext}\n**Question:** ${message}\n\nFocus on the selected code.`;
      console.log('📌 Added selection context');
    }
  }
  
  // ✅ Append files to message
  if (attachedFilesContent) {
    if (!message) message = 'Please analyze these files:';
    message = message + attachedFilesContent;
    console.log(`📎 Added ${attachedFiles.length} file(s) to message`);
  }
  
  // ✅ ADD PDF CONTEXT from pdfContextManager
  const pdfContext = (window as any).pdfContextManager?.getPdfContextSync?.() || '';
  if (pdfContext) {
    message = pdfContext + '\n\n---\n**User Question:**\n' + message;
    console.log('📕 Added PDF context:', pdfContext.length, 'chars');
  }
  
  await sendMessageDirectly(message, perMessageOverrideConfig);
  
  // ✅ Stop file processing animation
  chatFileDrop?.stopProcessing?.();
  
  // ✅ Clear files after sending
  chatFileDrop?.clearFiles();
}
// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

/**
 * Initialize the AI Assistant UI
 */
export function initializeAssistantUI(): void {
  // X02: expose typing indicator to window
  (window as any).showTypingIndicator = showTypingIndicator;
  (window as any).hideTypingIndicator = hideTypingIndicator;
  console.log('🚀 Initializing AI Assistant UI...');

  // ================================================================
  // FORCE DEFAULTS ON - Auto Mode + AI Search always ON at startup
  // ================================================================
  if (!localStorage.getItem('ideScriptMode')) {
    localStorage.setItem('ideScriptMode', 'auto');
  }
  if (localStorage.getItem('aiFileExplorerEnabled') !== 'true') {
    localStorage.setItem('aiFileExplorerEnabled', 'true');
  }
  console.log('FORCE DEFAULTS ON: Auto Mode + AI Search');
  
  // Add styles
  addAllStyles();
  initializeProfessionalIcons();
  // 🎨 Initialize IDE message styles for compact display
  initializeIDEMessageStyles();
  
  // ⭐ Add auto-apply notification animation styles
  if (!document.getElementById('auto-apply-styles')) {
    const style = document.createElement('style');
    style.id = 'auto-apply-styles';
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
      .auto-apply-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      /* ⭐ AI Analysis Clean Display Styles */
      .user-message p code {
        background: rgba(79, 70, 229, 0.15);
        color: #a5b4fc;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Initialize subsystems
  initializeApiSettings();
  initializeCodeAnalysis();
  initializeProjectScaffolding();
  initializeNoteSystem();
  // ❌ DISABLED: Using messageUI.ts built-in collapse system instead (prevents duplicate buttons)
  // initializeMessageCollapse();
  initializeClarificationUI();
  initializeTerminalContext();
  // Setup context status
  setTimeout(() => {
    initializeContextStatusUI();
  }, 500);
   try {
    if (typeof initChatFileDrop !== 'undefined') { initChatFileDrop(); } else { console.warn('[AssistantUI] initChatFileDrop not available, skipping'); }
    console.log('✅ Chat file drop handler initialized');
  } catch (error) {
    console.error('❌ Failed to initialize chat file drop:', error);
  }
  
  // 📜 SCROLL MANAGER - Initialize smart scroll
  setTimeout(() => {
    initChatScrollManager({
      bottomThreshold: 100,      // Consider "at bottom" within 100px
      userScrollTimeout: 3000,   // Resume auto-scroll after 3s of inactivity
      smoothScroll: true,
      showScrollButton: true,    // Show floating "scroll to bottom" button
    });
    console.log('📜 Chat scroll manager initialized');
  }, 600);
  
  // ✅ Setup "+" key shortcut at WINDOW level (fires before everything else)
  window.addEventListener('keydown', (e) => {
    const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement | HTMLInputElement | null;
    if (input && e.target === input && (e.key === '+' || (e.key === '=' && e.shiftKey)) && !e.ctrlKey && !e.altKey) {
      const val = input.value.trim();
      if (val === '' || val === '+') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        input.value = '';
        console.log('🚀 "+" pressed - Opening project settings card...');
        openProjectSettingsModalDirect();
      }
    }
  }, true); // CAPTURE PHASE - fires first!
  console.log('✅ "+" key shortcut registered at window level');
  
  // ✅ Setup "=" key shortcut at WINDOW level (fires before everything else)
  window.addEventListener('keydown', (e) => {
    const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement | HTMLInputElement | null;
    if (input && e.target === input && e.key === '=' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const val = input.value.trim();
      if (val === '' || val === '=') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        input.value = '';
        console.log('🚀 "=" pressed - Triggering suggested actions...');
        // Dispatch event to codeAnalysisManager.ts
        document.dispatchEvent(new CustomEvent('showSuggestedActions', {
          detail: { trigger: 'keyboard', key: '=' }
        }));
      }
    }
  }, true); // CAPTURE PHASE - fires first!
  console.log('✅ "=" key shortcut registered at window level');
  
  // ✅ Setup "?" key shortcut at WINDOW level (fires before everything else)
  window.addEventListener('keydown', (e) => {
    const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement | HTMLInputElement | null;
    if (input && e.target === input && e.key === '?' && !e.ctrlKey && !e.altKey) {
      const val = input.value.trim();
      if (val === '' || val === '?') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        input.value = '';
        console.log('🚀 "?" pressed - Showing clarification dialog...');
        // Import detectAmbiguity and show dialog
        const clarification = clarificationManager.detectAmbiguity('?');
        if (clarification) {
          showClarificationDialog(clarification);
        }
      }
    }
  }, true); // CAPTURE PHASE - fires first!
  console.log('✅ "?" key shortcut registered at window level');
  
  // ✅ Setup "#" key shortcut for API Provider selection
  // Triggers when: empty input, just "#", or typing "#" after a space (for chaining)
  window.addEventListener('keydown', (e) => {
    const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement | HTMLInputElement | null;
    if (input && e.target === input && e.key === '#' && !e.ctrlKey && !e.altKey) {
      const val = input.value;
      const cursorPos = input.selectionStart || 0;
      
      // Check if we should show the menu:
      // 1. Input is empty
      // 2. Input is just "#"
      // 3. Cursor is at end and last char before cursor is a space (chaining: "#groq hello #")
      // 4. Text ends with " #" pattern
      const isEmpty = val.trim() === '';
      const isJustHash = val.trim() === '#';
      const isAfterSpace = cursorPos > 0 && (val[cursorPos - 1] === ' ' || val[cursorPos - 1] === '\n');
      const isAtEnd = cursorPos === val.length;
      
      if (isEmpty || isJustHash || (isAfterSpace && isAtEnd)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Don't clear input if chaining, just prevent the # from being typed
        if (isEmpty || isJustHash) {
          input.value = '';
        }
        
        console.log('🚀 "#" pressed - Showing API provider selection...');
        showProviderSelectionMenu(input);
      }
    }
  }, true); // CAPTURE PHASE - fires first!
  console.log('✅ "#" key shortcut registered at window level');
  
  // Note: All keyboard shortcuts (+, =, ?, #) now use window-level handlers above
  setupKeyboardShortcuts();
  
  // Initialize AI Direct Editor
  try {
    aiDirectEditor.initialize();
    console.log('✅ AI Direct Editor initialized');
  } catch (error) {
    console.error('❌ Failed to initialize AI Direct Editor:', error);
  }
  
  // Initialize AI Chat File Integration
  try {
    const currentFolder = (window as any).currentFolderPath || '';
    if (currentFolder) {
      aiChatFileIntegration.setCurrentFolder(currentFolder);
    }
    console.log('✅ AI Chat File Integration initialized');
  } catch (error) {
    console.error('❌ Failed to initialize AI Chat File Integration:', error);
  }
  
  // Get UI elements
  const assistantPanel = document.querySelector('.assistant-panel');
  const messageInput = document.getElementById('ai-assistant-input');
  const sendBtn = document.getElementById('send-btn');
  
  if (!assistantPanel || !messageInput || !sendBtn) {
    console.warn('Some assistant panel elements not found, will retry...');
    setTimeout(() => initializeAssistantUI(), 1000);
    return;
  }
  
  // ❌ REMOVED: Context status indicator (duplicate of unified-status-bar)
  // The unified-status-bar from contextStatusBar.ts already provides this functionality
  // try {
  //   const contextIndicator = createContextStatusIndicator();
  //   assistantPanel.insertBefore(contextIndicator, assistantPanel.firstChild);
  // } catch (e) {
  //   console.warn('Could not create context status indicator');
  // }
  
  // Add conversation controls
  addConversationControls();
  
  // =========================================================================
  // 🔧 FIX: Check for open editor tabs - restore them instead of showing welcome
  // =========================================================================
  
  // Check if there are open files in the editor using TabManager
  const tabMgr = (window as any).tabManager;
  
  // Get open tabs from TabManager (multiple methods for compatibility)
  let openTabs: any[] = [];
  try {
    openTabs = tabMgr?.getTabs?.() || tabMgr?.getAllTabs?.() || tabMgr?.tabs || [];
  } catch (e) {
    console.warn('Could not get tabs from tabManager:', e);
  }
  
  const hasOpenTabs = openTabs.length > 0;
  
  // 🆕 Use tabManager's built-in persistence check
  const hasPersistedTabs = tabMgr?.hasPersistedTabs?.() || false;
  
  console.log(`📂 [Init] Tab check - tabManager: ${hasOpenTabs} (${openTabs.length}), persisted: ${hasPersistedTabs}`);
  
  // =========================================================================
  // 🆕 RESTORE TABS FIRST - before loading conversations
  // This ensures tabs are restored regardless of conversation state
  // =========================================================================
  if (hasPersistedTabs && !hasOpenTabs && tabMgr?.restoreTabsFromStorage) {
    console.log('📂 [Init] Restoring persisted tabs FIRST...');
    tabMgr.restoreTabsFromStorage().then((count: number) => {
      console.log(`📂 [Init] Restored ${count} tabs via tabManager`);
    }).catch((err: any) => {
      console.warn('Failed to restore tabs:', err);
    });
  }
  
  // Load current conversation - but only if not already rendered by another module
  const currentConv = conversationManager.getCurrentConversation();
  
  // 🔧 FIX: Also check if there are ANY conversations
  const allConversations = conversationManager.getAllConversations?.() || [];
  const hasExistingConversations = allConversations.length > 0;
  
  if (currentConv) {
    // 🔧 FIX: Check if already rendered to prevent duplicate messages
    if (!(window as any).__conversationRendered) {
      loadConversationToUI(currentConv);
      (window as any).__conversationRendered = true;
    } else {
      console.log('⏳ [Dedup] Skipping loadConversationToUI - already rendered');
    }
  } else if (hasExistingConversations) {
    // Load first existing conversation
    console.log('📂 Found existing conversations, loading first one');
    const firstConv = allConversations[0];
    conversationManager.setCurrentConversation?.(firstConv.id);
    if (!(window as any).__conversationRendered) {
      loadConversationToUI(firstConv);
      (window as any).__conversationRendered = true;
    }
  } else if (hasOpenTabs || hasPersistedTabs) {
    // 🔧 FIX: Has open/persisted files - don't show welcome, create empty chat
    console.log('📂 Files are open/persisted - skipping welcome message');
    conversationManager.createConversation('Chat');
    (window as any).__welcomeMessageShown = true;
    // Note: Tab restoration already happened above
  } else if (!(window as any).__welcomeMessageShown) {
    // No conversations AND no open files - truly fresh start
    (window as any).__welcomeMessageShown = true;
    conversationManager.createConversation('Welcome');
    const config = getCurrentApiConfigurationForced();
    addSystemMessageWithAutoRemoval(`Welcome to AI IDE! Using ${getProviderDisplayName(config.provider)}. Type "create project" to start.`);
  } else {
    console.log('⏳ [Dedup] Skipping welcome message - already shown');
  }
  
  // =========================================================================
  // 🔧 Tab persistence is now handled by TabManager automatically
  // No additional setup needed here - TabManager saves on beforeunload
  // =========================================================================
  console.log('✅ Tab persistence handled by TabManager');
  
  // Setup send button
  sendBtn.addEventListener('click', handleEnhancedSendMessage);
  
  // Setup input handlers
  if (messageInput instanceof HTMLTextAreaElement || messageInput instanceof HTMLInputElement) {
    // ✅ Clone input to remove any existing conflicting listeners
    const parent = messageInput.parentNode;
    if (parent) {
      const newInput = messageInput.cloneNode(true) as HTMLTextAreaElement | HTMLInputElement;
      parent.replaceChild(newInput, messageInput);
      
      // Update reference
      const updatedInput = newInput;
      
      // ✅ Add + key handler FIRST (capture phase)
      updatedInput.addEventListener('keydown', (e) => {
        if ((e.key === '+' || (e.key === '=' && e.shiftKey)) && !e.ctrlKey && !e.altKey) {
          const val = updatedInput.value.trim();
          if (val === '' || val === '+') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            updatedInput.value = '';
            console.log('🚀 "+" pressed - Opening project settings modal...');
            openProjectSettingsModalDirect();
          }
        }
      }, true);
      
      // Handle Enter key to send message
      updatedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleEnhancedSendMessage();
        }
      });
      
      // Auto-resize
      updatedInput.addEventListener('input', () => {
        if (updatedInput instanceof HTMLTextAreaElement) {
          updatedInput.style.height = 'auto';
          updatedInput.style.height = `${Math.min(updatedInput.scrollHeight, 150)}px`;
        }
      });
      
      console.log('✅ Input handlers set up with + key support');
    }
  }
  
  // Setup code analysis buttons
  const analyzeBtn = document.getElementById('analyze-code-btn');
  if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyzeCode);
  
  const debugBtn = document.getElementById('debug-code-btn');
  if (debugBtn) debugBtn.addEventListener('click', handleDebugCode);
  
  // Setup intervals
  setInterval(checkCodeAnalysisModeTimeout, 5 * 60 * 1000);
  setInterval(updateConversationInfo, 60000);
  setInterval(updateContextInfo, 30000); // Update context info periodically
  
  // Setup auto-save on window close
  window.addEventListener('beforeunload', () => {
    processSaveQueue();
    conversationManager.saveConversations();
  });
  
  setupConversationKeyboardShortcuts();
  
  // 🔍 Initialize AI File Explorer - allows AI to search and read project files
  try {
    initializeAIFileExplorer();
    console.log('✅ AI File Explorer initialized - Use Ctrl+Shift+F to search files');
  } catch (error) {
    console.error('❌ Failed to initialize AI File Explorer:', error);
  }
  
  // Setup file suggestion trigger when user types
  setupFileContextSuggestions();
  
  // Expose conversation manager globally for debugging
  (window as any).conversationManager = conversationManager;
  
  console.log('✅ AI Assistant UI initialized with chat context support');
  console.log('🎯 Calibration integration active');
  console.log('🔍 AI File Explorer active - AI can now search and read project files');
  console.log('⚡ Instant Terminal Solutions active - ' + INSTANT_TERMINAL_SOLUTIONS.length + ' patterns loaded');
  console.log('📜 Smart Scroll Manager active');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+H - Export conversation
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
      e.preventDefault();
      document.getElementById('export-conversation-btn')?.click();
    }
  });
}

function setupConversationKeyboardShortcuts(): void {
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const currentConv = conversationManager.getCurrentConversation();
      if (!currentConv) {
        alert('No conversation to delete');
        return;
      }
      await (window as any).deleteConversation(currentConv.id);
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      showConversationList();
    }
  });
}

// ============================================================================
// 🔍 AI FILE EXPLORER - FILE CONTEXT SUGGESTIONS
// ============================================================================

/**
 * Setup file context suggestions when user types
 * Shows related files as clickable chips when message might need file context
 */
function setupFileContextSuggestions(): void {
  const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!input) {
    console.warn('Could not find AI input for file suggestions');
    return;
  }
  
  let suggestionTimeout: number | null = null;
  
  input.addEventListener('input', () => {
    // Debounce
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    
    suggestionTimeout = window.setTimeout(async () => {
      const message = input.value.trim();
      // Only suggest if message is long enough and might need files
      if (message.length > 20) {
        const fileKeywords = ['file', 'code', 'function', 'class', 'component', 'error', 'bug', 'fix', 'why', 'where', 'find'];
        const mightNeedFiles = fileKeywords.some(k => message.toLowerCase().includes(k));
        
        if (mightNeedFiles) {
          try {
            const suggestions = await suggestRelevantFiles(message);
            if (suggestions.length > 0) {
              showFileSuggestions(suggestions);
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
    }, 800); // Wait 800ms after typing stops
  });
  
  console.log('✅ File context suggestions setup');
}

// ============================================================================
// HTML EXPORT
// ============================================================================

/**
 * Convert response to HTML wrapper
 */
async function convertResponseToHTML(content: string): Promise<void> {
  try {
    let fileName = undefined;
    if (isInCodeAnalysis()) {
      const codeContext = getCurrentCodeContext();
      fileName = codeContext.fileName;
    }
    
    await convertToHTML(content, fileName);
    
  } catch (error) {
    console.error('Failed to convert response to HTML:', error);
    showNotification('Failed to convert to HTML: ' + (error as Error).message, 'error');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for other modules
export { convertResponseToHTML };

// Export chat context functions for external use
export { getConversationContext, buildMessagesWithContext };

// Export functions that other modules need
export { 
  addMessageToChat,
  addSystemMessage 
} from './messageUI';

// ============================================================================
// NOTIFICATION SYSTEM EXPORTS
// ============================================================================
export {
  addSystemMessageWithAutoRemoval,
  clearAllNotifications,
  getActiveNotificationCount,
  getActiveNotifications,
  trackOrphanedNotifications
};

// ============================================================================
// CONVERSATION DELETE FUNCTIONS
// ============================================================================

(window as any).deleteConversation = async function(conversationId: string) {
  const conv = conversationManager.getConversationById(conversationId);
  if (!conv) {
    console.error('Conversation not found:', conversationId);
    return false;
  }
  
  const confirmed = confirm(`Delete "${conv.title}"?\n\nThis cannot be undone.`);
  if (!confirmed) return false;
  
  try {
    await conversationManager.deleteConversation(conversationId);
    console.log('✅ Conversation deleted:', conv.title);
    
    const currentConv = conversationManager.getCurrentConversation();
    if (currentConv) {
      loadConversationToUI(currentConv);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    alert('Failed to delete conversation');
    return false;
  }
};

(window as any).deleteAllConversations = async function() {
  const conversations = conversationManager.getAllConversations();
  const count = conversations.length;
  
  const confirmed = confirm(
    `⚠️ Delete ALL ${count} conversations?\n\n` +
    `This will permanently delete all conversation history.\n\n` +
    `This action CANNOT be undone!`
  );
  
  if (!confirmed) return false;
  
  try {
    await conversationManager.clearAllConversations();
    console.log('✅ All conversations cleared');
    
    const currentConv = conversationManager.getCurrentConversation();
    if (currentConv) {
      loadConversationToUI(currentConv);
    }
    
    alert('All conversations have been cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear conversations:', error);
    alert('Failed to clear conversations');
    return false;
  }
};

(window as any).showConversationsWithDelete = function() {
  const conversations = conversationManager.getAllConversations();
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   CONVERSATION LIST WITH DELETE COMMANDS');
  console.log('═══════════════════════════════════════════════════════');
  
  if (conversations.length === 0) {
    console.log('📭 No conversations found');
  } else {
    conversations.forEach((conv, index) => {
      const isCurrent = conversationManager.getCurrentConversation()?.id === conv.id;
      const star = isCurrent ? ' ⭐ (current)' : '';
      
      console.log(`${index + 1}. ${conv.title}${star}`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   Messages: ${conv.messages.length}`);
      console.log(`   🗑️  Delete: deleteConversation('${conv.id}')`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════');
};

// ============================================================================
// AUTO-FIX: Make save work properly
// ============================================================================

setTimeout(() => {
  console.log('🔧 Installing conversation save fix...');
  
  const originalSave = conversationManager.saveConversations.bind(conversationManager);
  
  conversationManager.saveConversations = async function() {
    try {
      await originalSave();
    } catch (e) {
      console.warn('Original save failed, using fallback');
    }
    
    // Fallback save mechanism
    const data = {
      conversations: Array.from(conversationManager.getAllConversations().map((c: any) => [c.id, c])),
      currentConversationId: conversationManager.getCurrentConversation()?.id,
      lastUpdated: Date.now()
    };
    
    console.log(`💾 Saving ${data.conversations.length} conversations...`);
    
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { writeTextFile } = (window as any).__TAURI__.fs;
        const settings = storageSettingsManager.getSettings();
        
        if (settings.customPath) {
          const filePath = `${settings.customPath}/ai_conversations.json`;
          await writeTextFile(filePath, JSON.stringify(data, null, 2));
          console.log(`✅ Saved to: ${filePath}`);
        }
      } catch (error) {
        console.error('❌ Save failed:', error);
      }
    }
  };
  
  console.log('✅ Conversation save fix installed');
}, 1000);

// ============================================================================
// EXPOSE FOR MESSAGE UI (fixes circular import issue)
// ============================================================================

(window as any).convertResponseToHTML = convertResponseToHTML;
(window as any).viewResponseAsHTML = convertResponseToHTML;
(window as any).getConversationContext = getConversationContext;
(window as any).buildMessagesWithContext = buildMessagesWithContext;

// ✅ Expose editor context functions for debugging
(window as any).getCurrentEditorContext = getCurrentEditorContext;
(window as any).getEditorContextForAI = getEditorContextForAI;
(window as any).formatEditorContextCompact = formatEditorContextCompact;

// ⚡ Expose sendMessageDirectly for external use
(window as any).sendMessageDirectly = sendMessageDirectly;

// 📜 Expose scroll manager for debugging
(window as any).getScrollManager = getScrollManager;
(window as any).scrollChatToBottom = scrollChatToBottom;
(window as any).forceScrollChatToBottom = forceScrollChatToBottom;

console.log('✅ HTML viewer and chat context functions exposed on window');
console.log('✅ Editor context functions exposed on window');
console.log('🗑️  Conversation Delete Functions Loaded');
console.log('🎯 Calibration integration loaded');
console.log('⚡ Instant Terminal Solutions integrated');
console.log('📜 Smart Scroll Manager integrated');