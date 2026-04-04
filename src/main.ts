import { showStartupDialog } from './startupDialog';
// ============================================================================
// INTEGRATED VERSION (Using AssistantUI) - January 24, 2026
// Uses existing UI from assistantUI.ts/messageUI.ts:
//   - showTypingIndicator() / hideTypingIndicator() for loading
//   - addMessageToChat() for message rendering
//   - ?? Conversation History Context integration
// ============================================================================

// main.ts - Complete IDE System with Plugin Source Code Detection
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================
// ============================================================================
// X02PerfManager - Interval throttle manager to reduce IDE lag
// Injected by fix_ide_lag.ps1
// Usage:
//   (window as any).X02Perf.throttle(5)   // slow all intervals 5x
//   (window as any).X02Perf.restore()      // back to normal
//   Auto-triggered by jetson-connected / jetson-disconnected events
// ============================================================================
import './utils/perfManager'; // X02PerfManager - extracted to utils/perfManager.ts
import './styles.css';
import './utils/proxyAwareCall';
import './utils/proxyHealthCheck';
import './performance.css';
import './ide/surgicalEditBridge';
import './ide/changeSummaryPanel';
import { initSurgicalEditUI, recordSurgicalEdit } from './ide/surgicalEditUI';
import './modern-ui-enhancements.css';
import './appleInputArea.css';
import './cemReloadFix';
import './chatPagination';  // After cemReloadFix import
import { setupEnhancedSVN } from './ide/svn/svnIntegration';
//import './aiHighlightSystem';  
//import './utils/globalBinaryBlocker';
import './ide/svn/svnUIEnhanced.css';
 import './ide/aiAssistant/conversationMarkdownProcessor';
import { initializeAIDirectEditor } from './ide/aiAssistant/aiDirectEditor';
import { ProjectCreationManager } from './ide/projectCreation';
import { initDomElements, renderConversationList, renderCurrentConversation } from './ui';
import { loadApiSettings, loadConversations, loadCurrentConversationId } from './state';
import { setupEventListeners, setupFileUploadListeners } from './events';
import { initializeProjectCreation } from './ide/projectCreation';
import { initializeFileExplorer } from './ide/fileExplorer';
import { initializeExplorerButtons } from './ide/explorerButtons';
import { initializeEditor } from './editor/editorManager';
import './directFileOpener';
import { initializeFileOperations } from './fileOperations';
import { invoke } from '@tauri-apps/api/core';
import { initializeTerminal } from './ide/terminal';
import persistenceManager from './fileOperations/persistenceManager';
import { initializeAssistantUI } from './ide/aiAssistant/assistantUI';
import { aiFileCreatorUI } from './ide/aiAssistant/aiFileCreatorUI';
import { initChatPanelResizer, addQuickSizeButtons } from './chatPanelResizer';
import { initPerformanceOptimizations } from './performanceOptimizer';
import { initChatFileDrop } from './chatFileDropHandler';
import './thinScrollbar.css';
import './ide/aiAssistant/conversationLoadFix';
import { initializeConversationAutoLoad } from './ide/aiAssistant/conversationLoadAutoFix';
import { 
  isTauriAvailable, 
  getSystemInfo, 
  showNotification 
} from './fileSystem';
import { PluginManager } from './plugins/core/pluginManager';
import { showPluginDevelopmentTools } from './plugins/core/pluginDevelopment';
import { initializeCameraPanel, toggleCameraPanel } from './ide/camera/cameraManager';
import { tabManager } from './editor/tabManager';
import { initializeLayout } from './ide/layout';
import { initFileSystemAPI } from './fileSystemApiHandler';
import { initializeCodeAnalysis } from './ide/aiAssistant/codeAnalysisManager';
import { initializeAutonomousCoding } from './ide/aiAssistant/pythonAutonomous';
import { breadcrumbManager } from './ide/breadcrumb';
import { default as RobustExplorerFilter } from './robustFilterSolution';
import { default as FolderFileToggle } from './folderFileToggle';
import { initializeProjectContextIntegration } from './ide/aiAssistant/projectContextIntegration';
import { getOrchestrator, orchestratedSend, detectTaskType } from './multiProviderOrchestrator';
import { getCurrentApiConfigurationForced } from './ide/aiAssistant/apiProviderManager';
import { initializeOrchestratorUI, showOrchestratorSettings } from './orchestratorUI';
import { initializeCalibration } from './calibrationIntegration';
import { showCalibrationPanel } from './calibrationUI';
//import { initializeAIAnalysisFeatures } from './ide/aiAssistant/aiAnalysisFeatures';
import './ide/aiAssistant/aiAnalysisFeatures';
import { 
  initializeAutonomousSystem,
  toggleAutonomousMode,
  processCurrentFileAutonomous,
  setTypingSpeed,
  emergencyStopTyping,
  testAutonomousSystem
} from './autonomousCoding';
import { cleanupManager } from './cleanup';
import { startAIProcessingScroll, stopAIProcessingScroll, addMessageToChat } from './ide/aiAssistant/messageUI';
(window as any).addMessageToChat = addMessageToChat;
import { showTypingIndicator, hideTypingIndicator, updateTypingIndicatorProvider } from './ide/aiAssistant/typingIndicator';
import { scrollChatToBottom, forceScrollChatToBottom } from './ide/aiAssistant/chatScrollManager';
import {
  cleanupMenus,
  setupCompleteFileMenu,
  setupProjectMenu,
  setupEnhancedViewMenu,
  setupEnhancedKeyboardShortcuts,
  setupGlobalMenuHandler
} from './menuSystem';
import { ExternalPluginManager } from './plugins/core/externalPluginManager';
import { initializeConversationModule } from './conversation';
import { initPiPanel } from './ide/pi/pi_panel';
//import { initializeAssistantUI } from './ide/aiAssistant/assistantUI';
import { initializeChangesExplanation } from './ide/aiAssistant/aiChangesExplanation';  // ? NEW
import './conversationSaveAutoFix';
import './editor/fileModificationManager';
import './ide/aiAssistant/aiHistorySearch';  // ?? Intelligent History Search
import './editor/fileDeletionHandler';
// Add to your imports
import './fileOperations/buildSystemIntegration';
import './ui/buildSystemUI';
import { intelligentAssistant } from './ide/aiAssistant/intelligentAssistant';
// ? DISABLED: Pink icon layer - using unified-status-bar instead
// import { initializeIntelligentAssistantUI } from './ide/aiAssistant/intelligentAssistantUI';
import { contextManager } from './ide/aiAssistant/contextManager';
import { initializeEditorContextIntegration } from './editor/editorContextIntegration';
import './ide/svn/svnHistoryViewer.css';
import { svnManager } from './ide/svn/svnManager';
import { svnUIEnhanced } from './ide/svn/svnUIEnhanced';
import { svnHistoryViewer } from './ide/svn/svnHistoryViewer';
import './ide/terminal/terminalErrorIntegration';
import { initializeErrorIntegrationBridge } from './editor/errorIntegrationBridge';
import './ide/terminal/autoFormatErrors';
import './ide/runMenu';
import { initializeUnifiedStatusBar } from './ide/aiAssistant/contextStatusBar';

  // [GPU] Initialize NVIDIA GPU Status Bar - hidden if no GPU detected
  initNvidiaStatusBar();
import { 
  setupPreviewAutoDetection, 
  openPreviewTab, 
  parseTerminalForServerUrl,
  previewTab
} from './ide/preview/PreviewTab';
// SVN Integration
//import { svnManager } from './ide/svn/svnManager';
// ? REMOVED OLD UI: import { svnUI } from './ide/svn/svnUI';
import { svnFileExplorerIntegration } from './ide/svn/svnFileExplorerIntegration';
import { svnStatusBar } from './ide/svn/svnStatusBar';
import './ide/svn/svn.css';
import { svnAutoDetector } from './ide/svn/svnAutoDetector';
import './monaco.config';  // ? ADD THIS LINE FIRST!
import { initializeProjectFolderContextMenu } from './ide/projectFolderContextMenu';
//import { ProjectCreationManager } from './ide/projectCreation';
import './ide/fileExplorer/fileTreeIntegration';
import './ide/projectPersistence';
import { 
  isContextEnabled, 
  getContextStatus, 
  toggleContextSystem 
} from './ide/aiAssistant/contextIntegration';
import { conversationManager } from './ide/aiAssistant/conversationManager';
import './fileOperations/fileRunnerAI';
import './projectLoadFix';
import './folderExpansionFix';
import './newFileHandler';
import './ide/terminal/terminalTabAnimation';
import './ide/terminal/terminalErrorFixer';
import './ide/terminal/terminalInstantFix';
//import { initializeAITerminalIntegration } from './ide/terminal';
//import './fileOperations/dependencyAnalyzer'; 
//import './ide/aiAssistant/unifiedMarkdownProcessor';
import { initMessageUIFix } from './ide/aiAssistant/messageUIFix';  // ? UNCOMMENT THIS
//import './ide/aiAssistant/codeBlockEnhancer';  // ? COMMENT THIS (not loading anyway)
//import './ide/aiAssistant/unifiedCodeBlockProcessor';
import "./ide/aiAssistant/aiProjectSearchFix";
import './ide/aiAssistant/aiContextDetector';
// ?? Git Integration
import './ide/vsc/gitUIStyles.css';
import { vcsManager } from './ide/vsc/vcsManager';
import { gitManager } from './ide/vsc/gitManager';
import { gitUIEnhanced } from './ide/vsc/gitUIEnhanced';
import { gitContextMenu } from './ide/vsc/gitContextMenu';
// ?? NEW: Git Virtual Scrolling for high performance
import './ide/vsc/virtualizedGitList.css';
import './ide/vsc/gitPanelVirtualized.css';
import { GitPanelVirtualized, createGitPanel } from './ide/vsc/gitPanelVirtualized';
// ?? NEW: Git Advanced Features
import { gitDiffViewer } from './ide/vsc/gitDiffViewer';
import { gitBranchManager } from './ide/vsc/gitBranchManager';
import { gitHistoryViewer } from './ide/vsc/gitHistoryViewer';
import { gitMergeConflictManager } from './ide/vsc/gitMergeConflict';
import { gitBlameManager } from './ide/vsc/gitBlame';
import { gitStashManager } from './ide/vsc/gitStashManager';
import { initializeGitFeatures, gitFeatures } from './ide/vsc/gitFeaturesIntegration';
import { setupGitMenu } from './menuSystem';
import { registerGitMenuHandlers } from './ide/vsc/gitMenuHandlers';
import { initGitMenuFix } from './ide/vsc/gitMenuFix';
import { initAICommitMessage } from './ide/vsc/gitAICommitMessage';
import { initFastContextMenu } from './ide/fileExplorer/fastContextMenu';
import './ide/fileContextMenu'; // CORRECT context menu - professional SVN-aware menu
// import './ide/fileExplorer/instantContextMenuInit'; // DISABLED: was blocking fileContextMenu
import { initializeFileHandling } from './eventHandlers/fileHandlers';
//import { initializePdfHandler } from './aiAssistant/pdfFileHandler';
//import { initializePdfHandler } from './aiAssistant/pdfHandler';
import './eventHandlers/globalListenersPatch';
import './pdfHandlerAutoInit'; 
import './utils/pdfExtractorSimple';
import './utils/pdfContextManager';
import './utils/globalBinaryBlocker';
import './utils/pdfContextBridge';
// ? DISABLED: Using messageUI.ts collapse system instead (prevents duplicate buttons)
// import { initMessageCollapse } from './messageCollapseManager';
import { initMessageCollapse, collapseAllMessages, expandAllMessages } from './ide/aiAssistant/messageCollapseManager';
import { initAutonomousCoding } from './autonomousCoding';
import { initSurgicalEditEngine } from './ide/surgicalEditEngine';
import { initBackupManager, showBackupManagerUI } from './ide/surgicalBackupManager';
import { initIdeScriptBridge, isScriptModeEnabled, getIdeScriptSystemPrompt, processAiScriptResponse } from './ide/ideScriptBridge';
import { initIdeScriptUI } from './ide/ideScriptUI';
import { openJetsonTerminal }     from './jetson/jetsonTerminal';
import { openJetsonFileBrowser }  from './jetson/jetsonFileBrowser';
import { openJetsonPerfGraph }    from './jetson/jetsonPerfGraph';
import { openJetsonPowerManager } from './jetson/jetsonPowerManager';
import { openJetsonMultiDevice }  from './jetson/jetsonMultiDevice';
import { openJetsonDevTools }     from './jetson/jetsonDevTools';
//import './ide/aiAssistant/aiFileExplorerHighlightFix';
var nuclear = document.createElement('style');
nuclear.id = 'nuclear-blue-remover';
nuclear.textContent = '*, *::before, *::after { border-color: transparent !important; } .file-tree *, #file-tree *, #files-content * { box-shadow: none !important; }';
document.head.appendChild(nuclear);
console.log('Nuclear option applied');
import { initializeEditorContextIntegration } from './editor/editorContextIntegration';
import { initFastApply, setSpeedMode } from './fastAutoApply';
import './ide/terminal/terminalToggleBadge';
import { initializeArduino, arduinoPanel } from './ide/arduino';
import { initializeAndroid, androidPanel, createGameProject } from './ide/android';
import './ide/aiAssistant/conversationSearchIntegration';
import './ide/aiAssistant/conversationHistoryContext';
import './ide/aiAssistant/messageUIEnhanced';
import './ide/aiAssistant/conversationMarkdownFix';
import './ide/aiAssistant/conversationUIMarkdownPatch';
import './ide/aiAssistant/conversationCompleteFix';
import './autoSparklesIcon';
import './ide/changeIndicator';

// =======================================================
// [GPU] NVIDIA JETSON / CUDA INTEGRATION
// =======================================================
import { registerCudaLanguage } from './ide/languages/cudaLanguage';
import { initNvidiaStatusBar } from './ide/nvidia/jetsonStatusBar';
initializeJetsonPhase2();  // Phase 2 - SSH + Live Monitor
import { detectJetsonContext, JETSON_TRIGGER_PATTERNS } from './ide/nvidia/jetsonAIContext';

// =======================================================
// [JETSON] Phase 2: SSH Remote Deployment
// =======================================================
import { initializeJetsonPhase2, disposeJetsonPhase2 } from './jetson';
import {
    initializeJetsonRemote,
    disposeJetsonRemote,
    mountStatusBarWidget,
    actionConnectJetson,
    actionDeployCurrentFile,
} from './jetson/jetsonIntegration';
import './jetson/jetsonStyles.css';
import { openJetsonDemoTab, registerJetsonTabShortcut } from './jetson/jetsonDemoTab';
import { initJetsonTabBridge, updateGpuButtonState } from './jetson/jetsonTabBridge';
//import './compactCollapsedGap.css';
//import './ultraCompactCollapsed.css';
//import './ide/aiAssistant/collapsedMessageWithDate';
// ============================================================================
// ============================================================================
// ?? SURGICAL EDIT ENGINE ? AI AWARENESS SYSTEM PROMPT
// ============================================================================
import { SURGICAL_ENGINE_PROMPT } from './prompts/surgicalPrompt'; // extracted
import { initializePluginMenu } from './plugins/ui/pluginManagerUI';
import { showNvidiaSampleModal } from './nvidia/nvidiaSampleModal';

// ?? Fast Apply Initialization
// ============================================================================
setTimeout(() => {
  // Initialize fast apply to override slow applySmartUpdate
  try {
    initFastApply();
    setSpeedMode('turbo'); // Options: 'instant' | 'turbo' | 'fast' | 'visual'
    console.log('? [FastApply] Initialized with turbo mode');
  } catch (e) {
    console.warn('?? [FastApply] Init skipped:', e);
  }
}, 2000);
// ============================================================================
// DUPLICATE PREVENTION - Fix hot reload creating duplicate elements  
// ============================================================================

// ? Hide RobustExplorerFilter search bar BY DEFAULT
// Click the search icon in project header to show/hide it
(function hideSearchBarByDefault() {
  const style = document.createElement('style');
  style.id = 'hide-search-bar-default';
  style.textContent = `
    /* COMPLETELY hide search bar by default */
    .explorer-filter-controls,
    .explorer-filter-controls-persistent {
      display: none !important;
      max-height: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      visibility: hidden !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
    }
    
    /* ALWAYS hide the duplicate buttons and stats (even when expanded) */
    .filter-buttons-row,
    .filter-status-bar,
    .filter-stats,
    .file-count-row,
    .explorer-filter-controls .filter-buttons-row,
    .explorer-filter-controls-persistent .filter-buttons-row,
    .search-expanded .filter-buttons-row,
    .search-expanded .filter-status-bar,
    .search-expanded .filter-stats {
      display: none !important;
      height: 0 !important;
      visibility: hidden !important;
    }
  `;
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  }
  
  // Also forcefully hide with JavaScript
  const hideSearchBar = () => {
    document.querySelectorAll('.explorer-filter-controls, .explorer-filter-controls-persistent').forEach(el => {
      if (!el.classList.contains('search-expanded')) {
        (el as HTMLElement).style.cssText = 'display: none !important; height: 0 !important; visibility: hidden !important; position: absolute !important; left: -9999px !important;';
      }
    });
  };
  
  // Run multiple times to catch dynamically created elements
  if (document.readyState !== 'loading') hideSearchBar();
  document.addEventListener('DOMContentLoaded', hideSearchBar);
  [100, 300, 500, 1000, 2000, 3000].forEach(delay => setTimeout(hideSearchBar, delay));
  
  // Watch for new elements
  const observer = new MutationObserver(hideSearchBar);
  const startObserving = () => {
    const target = document.body;
    if (target) observer.observe(target, { childList: true, subtree: true });
  };
  if (document.readyState !== 'loading') startObserving();
  else document.addEventListener('DOMContentLoaded', startObserving);
})();

/**
 * Clean up duplicate elements created during hot reload
 */
function cleanupDuplicates(): void {
  console.log('?? Cleaning up duplicate elements...');
  
  // Remove duplicate terminals (keep only first)
  const terminals = document.querySelectorAll('.terminal-header');
  if (terminals.length > 1) {
    console.log(`Found ${terminals.length} terminals, keeping first one`);
    for (let i = 1; i < terminals.length; i++) {
      const parent = terminals[i].closest('.tab-content');
      if (parent) parent.remove();
    }
  }
  
  // Remove duplicate explorer tabs (keep only first active)
  const explorers = document.querySelectorAll('.explorer-tab.active');
  if (explorers.length > 1) {
    console.log(`Found ${explorers.length} active explorer tabs, keeping first one`);
    for (let i = 1; i < explorers.length; i++) {
      explorers[i].classList.remove('active');
    }
  }
  
  // Remove duplicate modals (they'll be recreated)
  const modals = document.querySelectorAll('.modal');
  if (modals.length > 1) {
    console.log(`Found ${modals.length} modals, removing duplicates`);
    for (let i = 1; i < modals.length; i++) {
      modals[i].remove();
    }
  }
  
  // Remove duplicate menus
  const menus = document.querySelectorAll('.menu-submenu');
  if (menus.length > 1) {
    console.log(`Found ${menus.length} submenus, keeping first one`);
    for (let i = 1; i < menus.length; i++) {
      menus[i].remove();
    }
  }
  
  console.log('? Duplicate cleanup complete');
}

// ============================================================================
// TAB BADGE COUNTS - Show git changes count on GIT tab
// ============================================================================

/**
 * Initialize tab badge system for GIT tab
 * (Modified files badge is now in the file tree control panel)
 */
import { initializeTabBadges } from './ui/tabBadges'; // extracted from main.ts


// ============================================================================
// LOADING SCREEN - Show immediately for faster perceived startup
// ============================================================================

/**
 * Create and show loading screen immediately
 */
import { showLoadingScreen, removeLoadingScreen } from './ui/loadingScreen'; // extracted

// Show loading screen immediately when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showLoadingScreen);
} else {
  showLoadingScreen();
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface TauriSystemInfo {
  username: string;
  hostname: string;
  os_name: string;
  os_version: string;
  home_dir: string;
  documents_dir?: string;
  downloads_dir?: string;
  app_data_dir?: string;
  temp_dir: string;
}

interface TauriFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
}

// ============================================================================
// GLOBAL STATE
// ============================================================================
let tauriInitialized = false;
let currentProjectPath = '';
let isInitialized = false;
let initializationInProgress = false;

// ============================================================================
// GIT NESTED REPO DETECTION - Variables
// ============================================================================
interface GitRepoInfo {
  repoPath: string;
  repoName: string;
  isSubmodule: boolean;
  parentRepo?: string;
}
let currentGitRepoInfo: GitRepoInfo | null = null;
let allDetectedRepos: GitRepoInfo[] = [];

// ============================================================================
// CLEANUP SYSTEM
// ============================================================================
window.addEventListener('beforeunload', () => {
  console.log('Page unloading, cleaning up...');
  cleanupAll();
});

if (window.performance && window.performance.navigation.type === 1) {
  console.log('Page refreshed, cleaning up old instances...');
  cleanupAll();
}

function cleanupAll(): void {
  if (window.monaco?.editor) {
    window.monaco.editor.getEditors().forEach(editor => {
      editor.dispose();
    });
  }

  if (window.tabManager) {
    window.tabManager.cleanup?.();
  }

  if (window.fileSystem) {
    window.fileSystem.integratedFolderManager?.cleanup?.();
    window.fileSystem.contextMenuManager?.cleanup?.();
  }

  if (window.explorerFilter?.cleanup) {
    window.explorerFilter.cleanup();
  }

  if (window.folderToggle?.cleanup) {
    window.folderToggle.cleanup();
  }

  if (window.breadcrumbManager?.cleanup) {
    window.breadcrumbManager.cleanup();
  }

  // Clean up Backup Manager (intervals, timers, panel)
  if ((window as any).destroyBackupManager) {
    (window as any).destroyBackupManager();
  }

  cleanupManager.cleanup();
  cleanupManager.clearAllTimers();

  isInitialized = false;
  initializationInProgress = false;
}

// ============================================================================
// AUTONOMOUS CODING SYSTEM
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => { 
    console.log('DOM Ready - Initializing autonomous system...');

    // Initialize Surgical Edit Engine
    initSurgicalEditEngine();
    // Initialize Surgical Edit Bridge (loads saved preference, shows banner)
    if ((window as any).surgicalBridge?.init) {
      (window as any).surgicalBridge.init();
    }
    console.log('Surgical Edit Engine ready');
    // Auto-enable surgical mode
    if ((window as any).surgicalBridge) {
      (window as any).surgicalBridge.setEnabled(true);
      console.log('?? Surgical Edit Mode: ENABLED');
    }
  initSurgicalEditUI();

  // ?? Initialize IDE Script system
  initIdeScriptBridge();
// Expose WebUI detection globals from autonomousCoding
setTimeout(() => {
  if (typeof detectWebUIRequest === 'function') {
    (window as any).detectWebUIRequest = detectWebUIRequest;
    (window as any).WEB_UI_GENERATION_PROMPT = (typeof WEB_UI_GENERATION_PROMPT !== 'undefined') ? WEB_UI_GENERATION_PROMPT : '';
    console.log('[WebUI Mode] globals exposed on window');
  }
}, 2000);

function detectWebUIRequestFromDOM(): boolean {
  const input = document.querySelector('#ai-assistant-input, #user-input, textarea[id*="input"]') as HTMLTextAreaElement;
  const msg = input?.value || '';
  const patterns = [
    /\b(create|build|make|generate|design)\b.{0,50}\b(ui|page|website|landing|dashboard|component|layout)\b/i,
    /\b(improve|enhance|redesign|update|restyle)\b.{0,40}\b(ui|design|look|style|layout)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant|impressive)/i,
  ];
  return patterns.some(p => p.test(msg));
}
// Expose WebUI detection to window for console testing
(window as any).detectWebUIRequestFromDOM = detectWebUIRequestFromDOM;
(window as any).detectWebUIRequest = (msg: string) => {
  const patterns = [
    /\b(create|build|make|generate|design)\b.{0,50}\b(ui|page|website|landing|dashboard|component|layout)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant)/i,
  ];
  return patterns.some(p => p.test(msg));
};
console.log('[WebUI] Detection functions exposed on window');

// FIX3_TOKEN_FILTER - rejects CSS/numeric tokens from file mention detection
function isValidFileMention(token) {
  if (!token || token.length < 4) return false;
  if (!token.includes('.')) return false;
  if (/^[\d.]+(%|px|rem|em|s|ms|vw|vh|fr)?$/.test(token)) return false;
  if (/^rgba?|^hsla?|^#[0-9a-f]/i.test(token)) return false;
  if (token.startsWith('e.') || token.startsWith('window.') || token.startsWith('document.')) return false;
  const ext = token.split('.').pop()?.toLowerCase() || '';
  return ['ts','tsx','js','jsx','css','html','json','md','py','rs','cpp','java','go','vue'].includes(ext);
}


        (window as any).processAiScriptResponse = processAiScriptResponse;
  initIdeScriptUI();

  // Initialize Backup Manager (after Surgical Edit Engine)
  initBackupManager();
    
    try {
        if (typeof initializeAutonomousCoding !== 'function') {
            console.warn('initializeAutonomousCoding not available, skipping autonomous init');
            return;
        }

        const autonomousIntegration = initializeAutonomousCoding(
            { 
                generateCode: async (prompt: string) => {
                    console.log('Generate code called:', prompt);
                    return '// Code generation placeholder - API not configured';
                }
            },
            { 
                readFile: async (path: string) => {
                    if ((window as any).fileSystem?.readFile) {
                        return await (window as any).fileSystem.readFile(path);
                    }
                    return '';
                },
                writeFile: async (path: string, content: string) => {
                    if ((window as any).fileSystem?.writeFile) {
                        return await (window as any).fileSystem.writeFile(path, content);
                    }
                    return;
                }
            },
            { 
                executeCommand: async (cmd: string) => {
                    console.log(`Terminal command: ${cmd}`);
                    return { stdout: '', stderr: '', exitCode: 0 };
                }
            }
        );
        
        (window as any).__autonomousCoding = {
            integration: autonomousIntegration,
            system: autonomousIntegration.getAutonomousSystem ? autonomousIntegration.getAutonomousSystem() : null
        };
        
        console.log('Autonomous system initialized (minimal mode)');
        
    } catch (error) {
        console.error('Failed to initialize autonomous system:', error);
    }
       try {
        await setupEnhancedSVN();
    } catch (error) {
        console.error('SVN setup failed:', error);
    }
    
    // Initialize tab badge system (modified files count, git changes)
    try {
      initializeTabBadges();
    } catch (error) {
      console.error('Tab badges setup failed:', error);
    }
    
    console.log('? IDE Ready!');
});

// ============================================================================
// SYSTEM INFORMATION
// ============================================================================
async function initializeSystemInfo(): Promise<TauriSystemInfo | null> {
  try {
    if (!isTauriAvailable()) {
      console.warn('Tauri not available - limited functionality');
      return null;
    }

    console.log('Initializing system information with Tauri...');
    const sysInfo = await getSystemInfo();
    
    if (sysInfo) {
      console.log('System information initialized:', {
        username: sysInfo.username,
        os: sysInfo.os_name,
        hostname: sysInfo.hostname
      });
      
      (window as any).__systemInfo = {
        username: sysInfo.username,
        os: sysInfo.os_name,
        hostname: sysInfo.hostname,
        homedir: sysInfo.home_dir
      };
      
      if (sysInfo.hostname && sysInfo.hostname !== 'unknown') {
        document.title = `AI Code IDE - ${sysInfo.username}@${sysInfo.hostname}`;
      }

      console.log('Initializing breadcrumb navigation...');
      breadcrumbManager.initialize();
      (window as any).breadcrumbManager = breadcrumbManager;
      console.log('Breadcrumb navigation initialized successfully');
      
      return sysInfo;
    } else {
      console.warn('Failed to get system information');
      return null;
    }
  } catch (error) {
    console.error('Error initializing system information:', error);
    return null;
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function setupDirectEventHandlers(): void {
  console.log('Setting up direct event handlers');
  
  const sendBtn = document.getElementById('send-btn');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Send button clicked');
      
      // Get the ACTUAL input element that conversation.ts uses
      const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
      const aiInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
      
      // Try both possible input elements
      const actualInput = userInput || aiInput;
      
      if (!actualInput) {
        console.error('No input element found!');
        return;
      }
      
      const originalMessage = actualInput.value.trim();
      if (!originalMessage) {
        console.log('Empty message, skipping');
        return;
      }
      
      // Check if plugin code is open in editor
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const code = model.getValue();
          
          // Check if it's plugin code
          const isPluginCode = (code: string) => {
            if (!code) return false;
            return (code.includes('exports.manifest') || code.includes('export const manifest')) &&
                   (code.includes('exports.activate') || code.includes('export function activate'));
          };
          
          if (isPluginCode(code)) {
            console.log('[Plugin Detection] Plugin code detected!');
            
            // Create plugin context
            const pluginContext = `[SYSTEM CONTEXT - Plugin Development Mode]
This is plugin source code for the AI IDE Plugin System.

Plugin Structure:
- exports.manifest = { id, name, version, description, author }
- exports.activate = function(context) { ... }
- exports.deactivate = function() { ... } (optional)

Available APIs in context parameter:
- editorApi: getActiveDocument(), insertText(), getSelectedText(), onDocumentChange()
- uiApi: showMessage(), showPanel(), updateStatusBar()
- fileSystemApi: readFile(), writeFile(), getCurrentPath()
- terminalApi: executeCommand()
- createdElements: [] (track UI elements for cleanup)

Best Practices:
- Always track created DOM elements in context.createdElements
- Add data-plugin="\${your-plugin-id}" to all created elements
- Implement deactivate() to clean up resources
- Use context.subscriptions for event listeners

Current plugin code in editor:
\`\`\`javascript
${code}
\`\`\`

The user is developing this plugin. Help them with code improvements, bug fixes, and feature additions.

[END SYSTEM CONTEXT]

User question: ${originalMessage}`;
            
            console.log('[Plugin Detection] Context created, length:', pluginContext.length);
            console.log('[Plugin Detection] Setting textarea value...');
            
            // Set the value in the input
            actualInput.value = pluginContext;
            
            console.log('[Plugin Detection] New textarea value length:', actualInput.value.length);
            console.log('[Plugin Detection] Calling sendMessage...');
            
            // Import and call sendMessage with a delay to ensure value is set
            setTimeout(() => {
              import('./conversation').then(module => {
                module.sendMessage();
              }).catch(err => {
                console.error('Failed to import conversation module:', err);
              });
            }, 150);
            
            return;
          }
        }
      }
      
      console.log('[Plugin Detection] No plugin code detected, sending normally');
      
      // No plugin code detected, send normally
      import('./conversation').then(module => {
        module.sendMessage();
      }).catch(err => {
        console.error('Failed to import conversation module:', err);
      });
    });
  }
  
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.style.display = 'block';
      }
    });
  }
  
  console.log('Direct event handlers setup complete');
}

// Debug 
// Debug function to check what input elements exist
function debugInputElements(): void {
  console.group('?? Input Element Debug');
  
  const userInput = document.getElementById('user-input');
  const aiInput = document.getElementById('ai-assistant-input');
  
  console.log('user-input element:', userInput);
  console.log('ai-assistant-input element:', aiInput);
  
  if (userInput) {
    console.log('user-input value:', (userInput as HTMLTextAreaElement).value);
  }
  
  if (aiInput) {
    console.log('ai-assistant-input value:', (aiInput as HTMLTextAreaElement).value);
  }
  
  console.groupEnd();
}

// Call it after DOM loads
setTimeout(debugInputElements, 300);
// ============================================================================
// IDE COMPONENTS
// ============================================================================
async function initializeIdeComponents(): Promise<void> {
  try {
    console.log('Initializing editor...');
    await initializeEditor();
    console.log('Editor initialized successfully');
    
    setTimeout(() => {
      //applyMonacoContextMenuFix();
      console.log('?? Context menu fix applied');
    }, 1500);
    
  } catch (editorError) {
    console.error('Error initializing editor:', editorError);
  }
}
  
// ?? Listen for file tree refresh events - Remove deleted file only
// ============================================================================
// COMPLETE UPDATED LISTENER FOR main.ts
// Replace your existing file-tree-refresh listener with this
// ============================================================================

  const fileExplorerRef = (window as any).fileExplorer;
console.log('?? Stored fileExplorer reference:', {
exists: !!fileExplorerRef,
hasAddFile: !!fileExplorerRef?.addFile
 });

 try {
    console.log('Setting up file tree refresh listener...');
    document.addEventListener('file-tree-refresh', (event: any) => {
      console.log('?? File tree refresh requested');
      
      const detail = event.detail || {};
      const path = detail.path;
      const action = detail.action; // 'delete', 'create', or undefined
      
      if (action === 'delete' && path) {
        // ============================================================================
        // DELETION: Remove specific file from tree
        // ============================================================================
        console.log('??? Removing deleted file from tree:', path);
        
        const fileName = path.split(/[\\/]/).pop();
        const fileElements = document.querySelectorAll('.file-item, .tree-item');
        
        fileElements.forEach((element: Element) => {
          const htmlElement = element as HTMLElement;
          const elementPath = htmlElement.getAttribute('data-path') || 
                             htmlElement.getAttribute('data-full-path') ||
                             htmlElement.textContent?.trim();
          
          // Check if this element matches the deleted file
          if (elementPath?.includes(fileName) || 
              elementPath === path ||
              htmlElement.textContent?.trim() === fileName) {
            console.log('? Found and removing element:', fileName);
            htmlElement.remove();
          }
        });
        
        console.log('? File removed from tree');
        
} else if (action === 'create') {
        // ============================================================================
        // CREATION: Add file directly to tree using addFile method
        // ============================================================================
        console.log('?? Adding newly created file to tree');
        
        const fileExplorer = (window as any).fileExplorer || fileExplorerRef;
        const fileName = detail.fileName;
        const filePath = detail.filePath;
        
        // Debug logging
        console.log('?? Event detail:', detail);
        console.log('?? Extracted values:', {
          fileName: fileName,
          filePath: filePath,
          hasFileExplorer: !!fileExplorer,
          hasAddFile: !!fileExplorer?.addFile
        });
        
        // Use addFile to add the new file directly to tree
        if (fileName && filePath && fileExplorer?.addFile) {
          console.log('? Adding file to tree:', fileName);
          console.log('?? Full path:', filePath);
          
          try {
            fileExplorer.addFile(fileName, filePath);
            console.log('? File added to tree successfully!');
          } catch (error) {
            console.error('? Error adding file to tree:', error);
          }
        } else {
          console.warn('?? Cannot add file to tree');
          console.log('Missing requirements:', {
            hasFileName: !!fileName,
            hasFilePath: !!filePath,
            hasAddFile: !!fileExplorer?.addFile
          });
        }
}
    });
    console.log('? File tree refresh listener registered');
    
  } catch (listenerError) {
    console.error('Error setting up refresh listener:', listenerError);
  }

// ? NEW - Loads module AND sets up context menu
setTimeout(() => {
  console.log('?? Initializing tree generator with context menu...');
  
  // Load the tree generator module
  import('./fileOperations/treeGenerator').then(treeModule => {
    (window as any).FileTreeGenerator = treeModule.FileTreeGenerator;
    console.log('? Tree generator module loaded');
    
    // Now set up the enhanced context menu
    import('./ide/fileExplorer/fileClickHandlers').then(handlerModule => {
      if (handlerModule.setupContextMenu) {
        handlerModule.setupContextMenu();
        console.log('? Enhanced context menu with tree generator activated');
      } else {
        console.warn('?? setupContextMenu not found in fileClickHandlers');
      }
    }).catch(err => {
      console.error('? Failed to load file click handlers:', err);
    });
    
  }).catch(err => {
    console.error('? Failed to load tree generator:', err);
  });
}, 2500);

  try {
    console.log('Setting up unified tab system...');
    (window as any).tabManager = tabManager;
    
    setTimeout(() => {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor && tabManager.setupChangeTracking) {
        tabManager.setupChangeTracking(editor);
        console.log('TabManager connected to Monaco editor');
        
        // Initialize editor context integration for file tracking
        initializeEditorContextIntegration();
        console.log('Editor context integration initialized');
      }
    }, 1000);
    
    console.log('Unified tab system initialized');
  } catch (error) {
    console.error('Error setting up unified tab system:', error);
  }

  // Enable RobustExplorerFilter for "Search file" bar only
  // Search bar is hidden by default, toggled by search icon in project header
  const hideFilterExtrasStyle = document.createElement('style');
  hideFilterExtrasStyle.id = 'hide-filter-extras';
  hideFilterExtrasStyle.textContent = `
    /* Hide only the buttons row and status bar */
    .filter-buttons-row,
    .filter-status-bar,
    .filter-stats {
      display: none !important;
    }
  `;
  document.head.appendChild(hideFilterExtrasStyle);

  setTimeout(async () => {
    try {
      console.log('Initializing explorer filter system...');
      
      const filesContent = document.querySelector('#files-content, .tab-content, .file-tree');
      if (!filesContent) {
        console.warn('Files content not found, retrying in 2 seconds...');
        setTimeout(() => initializeSingleFilter(), 300);
        return;
      }

      if (document.querySelector('.explorer-filter-controls-persistent')) {
        console.log('Filter already exists, hiding it by default');
        hideSearchBarByDefault();
        return;
      }

      try {
        const { default: RobustExplorerFilter } = await import('./robustFilterSolution');
        
        const robustFilter = new RobustExplorerFilter();
        robustFilter.init();
        (window as any).explorerFilter = robustFilter;
        console.log('Explorer filter initialized');
        
        // IMPORTANT: Hide search bar immediately after init (it will be shown via search icon toggle)
        setTimeout(hideSearchBarByDefault, 50);
        setTimeout(hideSearchBarByDefault, 100);
        setTimeout(hideSearchBarByDefault, 300);
        setTimeout(hideSearchBarByDefault, 500);
        setTimeout(hideSearchBarByDefault, 1000);
        
      } catch (error) {
        console.error('Error initializing filter:', error);
      }
      
      // Function to completely hide the search bar (toggled via search icon)
      function hideSearchBarByDefault() {
        document.querySelectorAll('.explorer-filter-controls, .explorer-filter-controls-persistent').forEach(el => {
          // Only hide if not expanded via search icon
          if (!el.classList.contains('search-expanded')) {
            (el as HTMLElement).style.cssText = 'display: none !important; height: 0 !important; visibility: hidden !important; position: absolute !important; left: -9999px !important;';
          }
        });
      }

    } catch (error) {
      console.error('Error initializing filter system:', error);
    }
  }, 2000);

  // Initialize plugin menu system
  setTimeout(() => initializePluginMenu({ showNvidiaSampleModal }), 2500);

  try {
    console.log('Setting up file runner...');
    import('./fileOperations/fileRunner').then(module => {
      module.setupFileRunner();
    });
  } catch (error) {
    console.error('Error setting up file runner:', error);
  }
  
  try {
    console.log('Initializing explorer buttons...');
    initializeExplorerButtons();
  } catch (error) {
    console.error('Error initializing explorer buttons:', error);
  }
  await setupEnhancedSVN();


async function initializeSingleFilter(): Promise<void> {
  try {
    const filesContent = document.querySelector('#files-content, .tab-content, .file-tree');
    if (!filesContent) return;

    if (document.querySelector('.explorer-filter-controls-persistent')) {
      // Hide search bar by default
      hideSearchBar();
      return;
    }

    const { default: RobustExplorerFilter } = await import('./robustFilterSolution');
    const robustFilter = new RobustExplorerFilter();
    robustFilter.init();
    (window as any).explorerFilter = robustFilter;
    
    // Hide search bar by default after init (toggled via search icon)
    setTimeout(hideSearchBar, 50);
    setTimeout(hideSearchBar, 100);
    setTimeout(hideSearchBar, 300);
  } catch (error) {
    console.error('Error initializing filter on retry:', error);
  }
  
  function hideSearchBar() {
    // Completely hide search bar by default
    document.querySelectorAll('.explorer-filter-controls, .explorer-filter-controls-persistent').forEach(el => {
      if (!el.classList.contains('search-expanded')) {
        (el as HTMLElement).style.cssText = 'display: none !important; height: 0 !important; visibility: hidden !important; position: absolute !important; left: -9999px !important;';
      }
    });
  }
}

function setupGlobalFileListener(): void {
  document.addEventListener('file-selected', (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail && detail.path) {
      import('./editor/editorManager.js').then(module => {
        if (module.openFile) {
          module.openFile(detail.path);
        }
      });
      
      // Track file in context manager
      if ((window as any).contextManager?.trackFile) {
        (window as any).contextManager.trackFile(detail.path);
      }
    }
  });
}

function addAutonomousIntegrationStyles(): void {
  if (!document.getElementById('autonomous-integration-animation-style')) {
    const style = document.createElement('style');
    style.id = 'autonomous-integration-animation-style';
    style.textContent = `
      @keyframes autonomousIntegrationPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(79, 195, 247, 0.3); }
        50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(79, 195, 247, 0.6); }
      }
      .assistant-panel { transition: all 0.3s ease; }
      .assistant-panel:hover { box-shadow: 0 4px 20px rgba(79, 195, 247, 0.2); }
    `;
    document.head.appendChild(style);
  }
}
// ============================================================================
// MONACO EDITOR VALIDATION SETUP
// ============================================================================
/**
 * Setup Monaco validation for JavaScript and TypeScript
 * Enables red error highlights for syntax errors, undefined variables, etc.
 */
function setupMonacoValidation(): void {

  // [GPU] Register CUDA/Jetson language support
  registerCudaLanguage();
  // Wait for Monaco to be available
  const checkAndSetup = () => {
    const monaco = (window as any).monaco;
    
    if (!monaco) {
      // Monaco not ready yet, try again
      setTimeout(checkAndSetup, 100);
      return;
    }
    
    try {
      console.log('?? Setting up Monaco validation...');
      
      // ? Enable JavaScript error checking
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,  // Check for undefined variables
        noSyntaxValidation: false,    // Check for syntax errors
        noSuggestionDiagnostics: false
      });

      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        allowJs: true,
        checkJs: true,  // ? KEY: Enable JS error checking
        strict: false,
        lib: ['es2020', 'dom']
      });

      // ? Enable TypeScript error checking
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false
      });

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
        strict: true,
        lib: ['es2020', 'dom']
      });

      console.log('? Monaco validation enabled! Errors will show red highlights.');
    } catch (error) {
      console.error('? Failed to setup Monaco validation:', error);
    }
  };
  
  // Start checking
  checkAndSetup();
}
// ============================================================================
// SVN INTEGRATION INITIALIZATION
// ============================================================================
async function initializeSVN(): Promise<void> {
  console.log('?? [SVN] Starting initialization...');
  
  try {
    // Check if SVN is installed
    console.log('?? [SVN] Checking if SVN is installed...');
    const isSvnInstalled = await svnManager.checkSvnInstalled();
    console.log('?? [SVN] SVN installed:', isSvnInstalled);
    
    if (isSvnInstalled) {
      console.log('? [SVN] SVN detected - initializing features');
      
      // Initialize SVN UI panel
      console.log('?? [SVN] Initializing UI panel...');
      // ? REMOVED OLD UI: await svnUI.initialize();
      console.log('  ? SVN panel initialized');
      
      // Initialize status bar integration
      console.log('?? [SVN] Initializing status bar...');
      svnStatusBar.initialize();
      console.log('  ? Status bar integration ready');
      
      console.log('?? [SVN] Initializing auto-detector...');
      svnAutoDetector.initialize();
      console.log('  ? Auto-detector initialized');
      
      // Start auto-refresh (every 5 seconds)
      console.log('?? [SVN] Starting auto-refresh...');
      //svnManager.startAutoRefresh(30000);
      console.log('  ? Auto-refresh started (5s interval)');
      
      console.log('?? SVN integration fully initialized!');
      console.log('?? Features enabled:');
      console.log('  ? Automatic folder detection');
      console.log('  ? Manual "Setup SVN Here" button');
      console.log('  ? Real-time status updates');
      console.log('  ? Notification on SVN detection');

      // Make managers globally accessible (CRITICAL!)
      console.log('?? [SVN] Exposing managers to window...');
      (window as any).svnManager = svnManager;
      // ? REMOVED OLD UI: (window as any).svnUI = svnUI;
      (window as any).svnAutoDetector = svnAutoDetector;
      (window as any).svnStatusBar = svnStatusBar;
      console.log('? SVN managers available in console');

    } else {
      console.warn('?? SVN not installed. SVN features disabled.');
    }
  } catch (error) {
    console.error('? [SVN] Error initializing SVN:', error);
    console.error('Stack trace:', error);
  }
}
// ============================================================================
// GIT INTEGRATION INITIALIZATION
// ============================================================================
async function initializeGit(): Promise<void> {
  console.log('?? [Git] Starting initialization...');
  
  try {
    // Check if Git is installed
    const isGitInstalled = await gitManager.checkGitInstalled();
    console.log('?? [Git] Git installed:', isGitInstalled);
    
    if (!isGitInstalled) {
      console.warn('?? Git not installed. Git features disabled.');
      return;
    }
    
    // Get current project path
    const projectPath = (window as any).currentProjectPath || 
                        (window as any).currentFolderPath ||
                        localStorage.getItem('lastProjectPath') || 
                        localStorage.getItem('ide_last_project_path') ||
                        '';
    
    console.log('?? [Git] Project path:', projectPath);
    
    if (projectPath) {
      // Check if it's a Git repository
      const isGitRepo = await gitManager.isGitRepository(projectPath);
      console.log('?? [Git] Is Git repository:', isGitRepo);
      
      if (isGitRepo) {
        // Initialize VCS Manager
        const vcsInfo = await vcsManager.initialize(projectPath);
        console.log(`? [Git] VCS detected: ${vcsInfo.type}`);
        
        // Initialize Git context menu
        await gitContextMenu.initialize(projectPath);
        console.log('? [Git] Context menu initialized');
        
        // Get initial status
        try {
          await gitManager.open(projectPath);
          const status = await gitManager.getStatus();
          console.log(`? [Git] Branch: ${status.branch}, Changes: ${status.files.length}`);
        } catch (e) {
          console.warn('?? [Git] Could not get status:', e);
        }
      }
    }
    
    // Expose Git managers to window (for console access and debugging)
    (window as any).gitManager = gitManager;
    (window as any).gitUI = gitUIEnhanced;
    (window as any).gitUIEnhanced = gitUIEnhanced;
    (window as any).vcsManager = vcsManager;
    (window as any).gitContextMenu = gitContextMenu;
    
    // ?? NEW: Virtualized Git Panel for high-performance (6000+ files)
    (window as any).GitPanelVirtualized = GitPanelVirtualized;
    (window as any).createGitPanel = createGitPanel;
    let virtualizedGitPanel: GitPanelVirtualized | null = null;
    
    // Helper function to open Git panel
    (window as any).showGitPanel = (path?: string) => {
      const targetPath = path || 
                         (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        gitUIEnhanced.show(targetPath);
      } else {
        console.warn('?? No project path available');
      }
    };
    
    // ?? NEW: Show virtualized Git panel (for large repos with 1000+ files)
    (window as any).showVirtualizedGitPanel = (containerSelector?: string, path?: string) => {
      const targetPath = path || 
                         (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      
      if (!targetPath) {
        console.warn('?? No project path available');
        return null;
      }
      
      const selector = containerSelector || '.git-panel-container';
      const container = document.querySelector(selector) as HTMLElement;
      
      if (!container) {
        console.warn(`?? Container not found: ${selector}`);
        return null;
      }
      
      // Destroy existing panel
      if (virtualizedGitPanel) {
        virtualizedGitPanel.destroy();
      }
      
      // Create new virtualized panel
      virtualizedGitPanel = createGitPanel(container, {
        repoPath: targetPath,
        autoRefresh: true,
        refreshInterval: 5000,
        showFilter: true
      });
      
      console.log('?? Virtualized Git panel initialized for:', targetPath);
      return virtualizedGitPanel;
    };
    
    console.log('? [Git] Git managers available in console:');
    console.log('   ? gitManager - Git operations API');
    console.log('   ? gitUI / gitUIEnhanced - Git panel UI');
    console.log('   ? showGitPanel() - Open Git panel');
    console.log('   ? showVirtualizedGitPanel() - ?? High-performance panel for large repos');
    console.log('   ? vcsManager - Unified VCS manager');
    console.log('   ? gitFeatures - ?? Advanced Git features (diff, blame, history, stash, merge)');
    
    // ?? NEW: Expose advanced Git features to window
    (window as any).gitFeatures = gitFeatures;
    (window as any).gitDiffViewer = gitDiffViewer;
    (window as any).gitBranchManager = gitBranchManager;
    (window as any).gitHistoryViewer = gitHistoryViewer;
    (window as any).gitMergeConflictManager = gitMergeConflictManager;
    (window as any).gitBlameManager = gitBlameManager;
    (window as any).gitStashManager = gitStashManager;
    
    // Initialize advanced Git features if project path is available
    if (projectPath) {
      initializeGitFeatures(projectPath);
    }
    
    // ?? NEW: Add advanced Git feature functions to window
    (window as any).showDiffViewer = async (filePath: string, staged: boolean = false) => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath && filePath) {
        await gitDiffViewer.showFileDiff(targetPath, filePath, staged);
      }
    };
    
    (window as any).showBranchManager = async () => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitBranchManager.show({ repoPath: targetPath });
      }
    };
    
    (window as any).showGitHistory = async (filePath?: string) => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitHistoryViewer.show({ repoPath: targetPath, filePath });
      }
    };
    
    (window as any).showMergeConflicts = async () => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitMergeConflictManager.show({ repoPath: targetPath });
      }
    };
    
    (window as any).showGitBlame = async (filePath: string) => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath && filePath) {
        await gitBlameManager.showBlameDialog(targetPath, filePath);
      }
    };
    
    (window as any).showStashManager = async () => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitStashManager.show({ repoPath: targetPath });
      }
    };
    
    (window as any).quickStash = async (message?: string) => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitStashManager.quickStash(targetPath, message);
      }
    };
    
    (window as any).quickPop = async () => {
      const targetPath = (window as any).currentProjectPath || 
                         (window as any).currentFolderPath ||
                         localStorage.getItem('ide_last_project_path') || '';
      if (targetPath) {
        await gitStashManager.quickPop(targetPath);
      }
    };
    
    console.log('   ?? Advanced Git Features:');
    console.log('   ? showDiffViewer(filePath, staged?) - View file diff');
    console.log('   ? showBranchManager() - Branch switching UI');
    console.log('   ? showGitHistory(filePath?) - Commit history viewer');
    console.log('   ? showMergeConflicts() - Resolve merge conflicts');
    console.log('   ? showGitBlame(filePath) - Line-by-line blame');
    console.log('   ? showStashManager() - Manage stashes');
    console.log('   ? quickStash(message?) - Quick stash changes');
    console.log('   ? quickPop() - Pop latest stash');
    
    console.log('?? [Git] Git integration initialized!');
    
  } catch (error) {
    console.error('? [Git] Error initializing Git:', error);
  }
}

// ============================================================================
// GIT KEYBOARD SHORTCUTS
// ============================================================================
function setupGitKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+G - Open Git Panel (like VS Code)
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'G') {
      e.preventDefault();
      e.stopPropagation();
      
      const projectPath = (window as any).currentProjectPath || 
                          (window as any).currentFolderPath ||
                          localStorage.getItem('ide_last_project_path') || '';
      
      if (projectPath) {
        console.log('?? Opening Git panel via Ctrl+Shift+G');
        gitUIEnhanced.show(projectPath);
      } else {
        console.warn('?? No project path - open a folder first');
      }
    }
    
    // Ctrl+Shift+H - Open Git History
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'H') {
      e.preventDefault();
      e.stopPropagation();
      
      const projectPath = (window as any).currentProjectPath || 
                          (window as any).currentFolderPath ||
                          localStorage.getItem('ide_last_project_path') || '';
      
      if (projectPath) {
        console.log('?? Opening Git History via Ctrl+Shift+H');
        gitHistoryViewer.show({ repoPath: projectPath });
      }
    }
    
    // Ctrl+Shift+B - Open Branch Manager (alternative to G for branches)
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'B' && !e.altKey) {
      // Note: Some IDEs use Ctrl+Shift+B for build, so we check !e.altKey
      // You may want to change this shortcut if it conflicts
    }
    
    // Ctrl+Alt+S - Quick Stash
    if (e.ctrlKey && e.altKey && e.key.toUpperCase() === 'S') {
      e.preventDefault();
      e.stopPropagation();
      
      const projectPath = (window as any).currentProjectPath || 
                          (window as any).currentFolderPath ||
                          localStorage.getItem('ide_last_project_path') || '';
      
      if (projectPath) {
        console.log('?? Quick stash via Ctrl+Alt+S');
        gitStashManager.quickStash(projectPath);
      }
    }
    
    // Ctrl+Alt+P - Quick Pop Stash
    if (e.ctrlKey && e.altKey && e.key.toUpperCase() === 'P') {
      e.preventDefault();
      e.stopPropagation();
      
      const projectPath = (window as any).currentProjectPath || 
                          (window as any).currentFolderPath ||
                          localStorage.getItem('ide_last_project_path') || '';
      
      if (projectPath) {
        console.log('?? Quick pop stash via Ctrl+Alt+P');
        gitStashManager.quickPop(projectPath);
      }
    }
  });
  
  console.log('? [Git] Keyboard shortcuts registered:');
  console.log('   Ctrl+Shift+G - Git Panel');
  console.log('   Ctrl+Shift+H - Git History');
  console.log('   Ctrl+Alt+S   - Quick Stash');
  console.log('   Ctrl+Alt+P   - Quick Pop Stash');
}

// ? Close Project shortcut: Ctrl+Shift+W
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'W') {
    e.preventDefault();
    if ((window as any).currentFolderPath || localStorage.getItem('ide_last_project_path')) {
      (window as any).projectPersistence?.closeProject?.();
      console.log('?? Close Project via Ctrl+Shift+W');
    }
  }
});
// ============================================================================
// GIT TAB INTEGRATION - FIXED VERSION
// Replace lines 1471-1564 in main.ts with this code
// ============================================================================

// ============================================================================
// GIT TAB INTEGRATION - COMPLETE FIX
// ============================================================================
// ENSURE GIT TAB IN EXPLORER - Separated from dialog creation to fix race condition
// ============================================================================
// On first load, layout.ts creates .explorer-tabs AFTER main.ts creates the git dialog.
// This function handles tab creation independently with its own retry logic,
// so the dialog-exists check in addGitTabToExplorer() never blocks tab creation.
// ============================================================================

let _gitTabRetryCount = 0;
const _GIT_TAB_MAX_RETRIES = 8; // 15 seconds at 500ms intervals

function ensureGitTabInExplorer(): void {
  // Already exists? Done.
  if (document.querySelector('[data-tab-id="git"]')) {
    console.log('? [Git] Tab already exists');
    _gitTabRetryCount = 0;
    return;
  }

  const tabsContainer = document.querySelector('.explorer-tabs');
  if (!tabsContainer) {
    _gitTabRetryCount++;
    if (_gitTabRetryCount <= _GIT_TAB_MAX_RETRIES) {
      console.warn(`?? [Git] Explorer tabs not found, retry ${_gitTabRetryCount}/${_GIT_TAB_MAX_RETRIES}...`);
      setTimeout(ensureGitTabInExplorer, 200);
    } else {
      console.error('? [Git] Failed to find explorer tabs after max retries');
      _gitTabRetryCount = 0;
    }
    return;
  }

  // Reset retry counter on success
  _gitTabRetryCount = 0;
  console.log('? [Git] Found explorer tabs, creating Git tab...');

  // Create Git tab button
  const gitTab = document.createElement('div');
  gitTab.className = 'explorer-tab';
  gitTab.dataset.tabId = 'git';
  gitTab.innerHTML = `
    <span class="tab-icon git-tab-icon" style="color: #f05033;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
      </svg>
    </span>
    <span class="tab-label">GIT</span>
  `;

  // Add GIT tab specific styles (only once)
  if (!document.getElementById('git-tab-styles')) {
    const gitTabStyles = document.createElement('style');
    gitTabStyles.id = 'git-tab-styles';
    gitTabStyles.textContent = `
      /* GIT Tab click animation */
      [data-tab-id="git"] {
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      [data-tab-id="git"]:hover {
        background: rgba(240, 80, 51, 0.1);
      }
      
      [data-tab-id="git"].active {
        background: rgba(240, 80, 51, 0.15);
        border-bottom: 2px solid #f05033;
      }
      
      /* Icon pulse when active */
      [data-tab-id="git"].active .git-tab-icon {
        animation: gitTabIconPulse 0.5s ease;
      }
      
      @keyframes gitTabIconPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      /* Ripple effect on click */
      [data-tab-id="git"]::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(240, 80, 51, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
      }
      
      [data-tab-id="git"].ripple::after {
        animation: gitTabRipple 0.4s ease-out;
      }
      
      @keyframes gitTabRipple {
        0% {
          width: 0;
          height: 0;
          opacity: 0.5;
        }
        100% {
          width: 100px;
          height: 100px;
          opacity: 0;
        }
      }
      
      /* Changes indicator pulse */
      [data-tab-id="git"] .git-changes-badge {
        animation: gitBadgePulse 2s ease-in-out infinite;
      }
      
      @keyframes gitBadgePulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
    `;
    document.head.appendChild(gitTabStyles);
  }

  tabsContainer.appendChild(gitTab);

  // Tab click handler - toggles floating dialog via DOM lookup (not closure)
  gitTab.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('?? [Git] Tab clicked - toggling dialog');

    // Add ripple effect
    gitTab.classList.add('ripple');
    setTimeout(() => gitTab.classList.remove('ripple'), 400);

    const dlg = document.getElementById('git-floating-dialog');
    const backdrop = document.getElementById('git-dialog-backdrop');
    if (!dlg) return;

    if (dlg.classList.contains('visible')) {
      // Hide dialog
      dlg.classList.add('closing');
      dlg.classList.remove('visible');
      if (backdrop) backdrop.classList.remove('visible');
      gitTab.classList.remove('active');
      setTimeout(() => {
        if (!dlg.classList.contains('visible')) {
          dlg.style.display = 'none';
          dlg.classList.remove('closing');
        }
      }, 250);
    } else {
      // Show dialog
      if (backdrop) backdrop.classList.add('visible');
      dlg.style.display = 'flex';
      dlg.offsetHeight; // Trigger reflow for animation
      dlg.classList.add('visible');
      dlg.classList.remove('closing');
      gitTab.classList.add('active');
      loadGitTabStatus();
    }
  });

  // Keyboard shortcut: Ctrl+Shift+G to toggle, Escape to close
  document.addEventListener('keydown', (e) => {
    const dlg = document.getElementById('git-floating-dialog');
    if (!dlg) return;
    const backdrop = document.getElementById('git-dialog-backdrop');
    const gt = document.querySelector('[data-tab-id="git"]');

    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      if (dlg.classList.contains('visible')) {
        dlg.classList.add('closing');
        dlg.classList.remove('visible');
        if (backdrop) backdrop.classList.remove('visible');
        if (gt) gt.classList.remove('active');
        setTimeout(() => {
          if (!dlg.classList.contains('visible')) {
            dlg.style.display = 'none';
            dlg.classList.remove('closing');
          }
        }, 250);
      } else {
        if (backdrop) backdrop.classList.add('visible');
        dlg.style.display = 'flex';
        dlg.offsetHeight;
        dlg.classList.add('visible');
        dlg.classList.remove('closing');
        if (gt) gt.classList.add('active');
        loadGitTabStatus();
      }
    }
    if (e.key === 'Escape' && dlg.classList.contains('visible')) {
      dlg.classList.add('closing');
      dlg.classList.remove('visible');
      if (backdrop) backdrop.classList.remove('visible');
      if (gt) gt.classList.remove('active');
      setTimeout(() => {
        if (!dlg.classList.contains('visible')) {
          dlg.style.display = 'none';
          dlg.classList.remove('closing');
        }
      }, 250);
    }
  });

  console.log('? [Git] Tab created and attached to explorer!');
}

// Replace the addGitTabToExplorer function in main.ts (around line 1475-1600)
// ============================================================================

function addGitTabToExplorer(): void {
  // Inject global CSS for floating Git dialog
  if (!document.getElementById('git-panel-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'git-panel-styles';
    styleEl.textContent = `
      /* Floating Git Dialog - Independent & Larger */
      #git-floating-dialog {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 480px;
        height: calc(100vh - 100px);
        min-height: 500px;
        max-height: 900px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 12px;
        box-shadow: 0 16px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
        z-index: 9000;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        resize: both;
      }
      #git-floating-dialog.visible {
        display: flex !important;
        opacity: 1;
        transform: translateX(0);
      }
      #git-floating-dialog.closing {
        opacity: 0;
        transform: translateX(20px);
      }
      /* No backdrop - dialog is independent */
      #git-dialog-backdrop {
        display: none !important;
        pointer-events: none;
      }
      /* Dialog Header - Draggable */
      .git-dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: linear-gradient(180deg, #2d2d2d 0%, #252526 100%);
        border-bottom: 1px solid #3c3c3c;
        cursor: move;
        user-select: none;
        flex-shrink: 0;
      }
      .git-dialog-header:active {
        cursor: grabbing;
      }
      .git-dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #e0e0e0;
        font-size: 15px;
        font-weight: 600;
      }
      .git-dialog-title svg {
        filter: drop-shadow(0 0 4px rgba(240, 80, 51, 0.4));
      }
      .git-dialog-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .git-dialog-btn {
        background: transparent;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .git-dialog-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #ccc;
        transform: scale(1.05);
      }
      .git-dialog-close:hover {
        background: #e81123;
        color: white;
      }
      /* Dialog Content */
      .git-dialog-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 14px;
        max-height: calc(80vh - 60px);
      }
      /* Scrollbar styling */
      .git-dialog-content::-webkit-scrollbar {
        width: 8px;
      }
      .git-dialog-content::-webkit-scrollbar-track {
        background: transparent;
      }
      .git-dialog-content::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
      }
      .git-dialog-content::-webkit-scrollbar-thumb:hover {
        background: #666;
      }
      /* File hover buttons */
      .git-file-item {
        transition: background 0.15s ease;
      }
      .git-file-item button {
        opacity: 0;
        transition: opacity 0.15s ease, transform 0.15s ease;
      }
      .git-file-item:hover button {
        opacity: 1;
      }
      .git-file-item button:hover {
        transform: scale(1.1);
      }
      .git-file-item:hover {
        background: rgba(255,255,255,0.05);
      }
      /* Resize handle */
      .git-dialog-resize {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        cursor: se-resize;
        opacity: 0.5;
        transition: opacity 0.15s;
      }
      .git-dialog-resize:hover {
        opacity: 1;
      }
      .git-dialog-resize::after {
        content: '';
        position: absolute;
        bottom: 5px;
        right: 5px;
        width: 8px;
        height: 8px;
        border-right: 2px solid #666;
        border-bottom: 2px solid #666;
      }
      /* Button animations */
      .git-action-btn {
        transition: all 0.15s ease;
      }
      .git-action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      .git-action-btn:active {
        transform: translateY(0);
      }
      /* Section animations */
      .git-section-content {
        transition: max-height 0.2s ease;
        overflow: hidden;
      }
      
      /* ========== PANEL OPEN ANIMATIONS ========== */
      
      /* Staggered fade-in for sections */
      @keyframes gitSectionFadeIn {
        from { 
          opacity: 0; 
          transform: translateY(10px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      
      /* Branch bar animation */
      .git-branch-bar {
        animation: gitSectionFadeIn 0.3s ease forwards;
        animation-delay: 0.1s;
        opacity: 0;
      }
      
      /* Action buttons row animation */
      .git-action-btn {
        animation: gitSectionFadeIn 0.3s ease forwards;
        opacity: 0;
      }
      .git-action-btn:nth-child(1) { animation-delay: 0.15s; }
      .git-action-btn:nth-child(2) { animation-delay: 0.2s; }
      .git-action-btn:nth-child(3) { animation-delay: 0.25s; }
      
      /* After animation completes, ensure buttons stay visible */
      .git-action-btn.animated {
        opacity: 1 !important;
        animation: none;
      }
      
      .git-action-btn:hover {
        background: #3c3c3c !important;
        border-color: #5a5a5a !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      
      /* Commit section animation */
      #git-ai-generate-btn {
        animation: gitSectionFadeIn 0.3s ease forwards;
        animation-delay: 0.3s;
        opacity: 0;
      }
      
      #git-commit-input {
        animation: gitSectionFadeIn 0.3s ease forwards;
        animation-delay: 0.35s;
        opacity: 0;
      }
      
      /* Git section headers animation */
      .git-section {
        animation: gitSectionFadeIn 0.4s ease forwards;
        opacity: 0;
      }
      .git-section:nth-of-type(1) { animation-delay: 0.4s; }
      .git-section:nth-of-type(2) { animation-delay: 0.5s; }
      .git-section:nth-of-type(3) { animation-delay: 0.6s; }
      
      /* File items staggered animation */
      @keyframes gitFileSlideIn {
        from { 
          opacity: 0; 
          transform: translateX(-15px); 
        }
        to { 
          opacity: 1; 
          transform: translateX(0); 
        }
      }
      
      .git-file-item {
        animation: gitFileSlideIn 0.25s ease forwards;
        opacity: 0;
      }
      .git-file-item:nth-child(1) { animation-delay: 0.5s; }
      .git-file-item:nth-child(2) { animation-delay: 0.55s; }
      .git-file-item:nth-child(3) { animation-delay: 0.6s; }
      .git-file-item:nth-child(4) { animation-delay: 0.65s; }
      .git-file-item:nth-child(5) { animation-delay: 0.7s; }
      .git-file-item:nth-child(6) { animation-delay: 0.75s; }
      .git-file-item:nth-child(7) { animation-delay: 0.8s; }
      .git-file-item:nth-child(8) { animation-delay: 0.85s; }
      .git-file-item:nth-child(n+9) { animation-delay: 0.9s; }
      
      /* Title icon glow pulse */
      @keyframes gitIconPulse {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(240, 80, 51, 0.4)); }
        50% { filter: drop-shadow(0 0 10px rgba(240, 80, 51, 0.8)); }
      }
      
      .git-dialog-title svg {
        animation: gitIconPulse 2s ease-in-out;
      }
      
      /* Commit button pulse when staged files exist */
      @keyframes gitCommitPulse {
        0%, 100% { box-shadow: 0 0 0 rgba(14, 99, 156, 0); }
        50% { box-shadow: 0 0 12px rgba(14, 99, 156, 0.5); }
      }
      
      #git-commit-btn:not(:disabled) {
        animation: gitCommitPulse 2s ease-in-out infinite;
      }
      
      /* AI Generate button sparkle */
      @keyframes gitAISparkle {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.2); }
      }
      
      #git-ai-generate-btn:hover svg {
        animation: gitAISparkle 0.8s ease-in-out infinite;
      }
      
      /* Checkbox pop animation */
      @keyframes gitCheckPop {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }
      
      .git-commit-file-checkbox:checked {
        animation: gitCheckPop 0.2s ease;
      }
      
      /* Selected bar slide-in */
      @keyframes gitSelectedBarSlide {
        from { 
          opacity: 0; 
          transform: translateY(-10px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      
      #git-commit-selected-bar {
        animation: gitSelectedBarSlide 0.25s ease forwards;
      }
      
      /* Refresh spin on click */
      @keyframes gitRefreshSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      #git-dialog-refresh.spinning svg {
        animation: gitRefreshSpin 0.6s ease;
      }
      
      /* Section expand animation */
      @keyframes gitExpandSection {
        from { 
          opacity: 0;
          max-height: 0;
        }
        to { 
          opacity: 1;
          max-height: 500px;
        }
      }
      
      .git-section-content.expanding {
        animation: gitExpandSection 0.3s ease forwards;
      }
      
      /* Status badge bounce */
      @keyframes gitBadgeBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
      
      .git-section-header span[style*="border-radius: 10px"] {
        transition: transform 0.2s ease;
      }
      
      .git-section-header:hover span[style*="border-radius: 10px"] {
        animation: gitBadgeBounce 0.4s ease;
      }
      
      /* Loading shimmer effect */
      @keyframes gitShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      .git-loading-shimmer {
        background: linear-gradient(90deg, #2d2d2d 25%, #3c3c3c 50%, #2d2d2d 75%);
        background-size: 200% 100%;
        animation: gitShimmer 1.5s infinite;
      }
      
      /* Toast notification slide */
      @keyframes gitToastSlideIn {
        from { 
          opacity: 0; 
          transform: translateX(100%); 
        }
        to { 
          opacity: 1; 
          transform: translateX(0); 
        }
      }
      
      @keyframes gitToastSlideOut {
        from { 
          opacity: 1; 
          transform: translateX(0); 
        }
        to { 
          opacity: 0; 
          transform: translateX(100%); 
        }
      }
      
      /* Loading spinner */
      @keyframes gitSpinner {
        to { transform: rotate(360deg); }
      }
      .git-loading {
        animation: gitSpinner 1s linear infinite;
      }
    `;
    document.head.appendChild(styleEl);
    console.log('? [Git] Injected floating dialog CSS with animations');
  }
  
  // Check if dialog already exists
  if (document.getElementById('git-floating-dialog')) {
    console.log('? [Git] Floating dialog already exists, ensuring tab...');
    // Dialog exists but tab might not (race condition on first load)
    // Skip dialog creation, fall through to tab creation
    ensureGitTabInExplorer();
    return;
  }
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'git-dialog-backdrop';
  document.body.appendChild(backdrop);
  
  // Create floating dialog
  const dialog = document.createElement('div');
  dialog.id = 'git-floating-dialog';
  dialog.innerHTML = `
    <div class="git-dialog-header">
      <div class="git-dialog-title">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="#f05033">
          <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
        </svg>
        Source Control
      </div>
      <div class="git-dialog-actions">
        <button class="git-dialog-btn" id="git-dialog-refresh" title="Refresh (Ctrl+R)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 2a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 010-1h1.82l-.748-.747A5.5 5.5 0 103.5 11.5a.5.5 0 01-1 0 6.5 6.5 0 1110.348-5.226l.652.652V2.5a.5.5 0 01.5-.5z"/>
          </svg>
        </button>
        <button class="git-dialog-btn" id="git-dialog-minimize" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z"/>
          </svg>
        </button>
        <button class="git-dialog-btn git-dialog-close" id="git-dialog-close" title="Close (Esc)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="git-dialog-content" id="git-tab-status">
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
        <div style="position: relative; width: 60px; height: 60px; margin-bottom: 20px;">
          <div style="position: absolute; inset: 0; border: 3px solid #333; border-top-color: #f05033; border-radius: 50%; animation: gitLoadSpin 0.8s linear infinite;"></div>
          <div style="position: absolute; inset: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="#f05033" style="animation: gitLoadPulse 1s ease-in-out infinite;">
              <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
            </svg>
          </div>
        </div>
        <div style="color: #ccc; font-size: 13px;">Loading Git status...</div>
      </div>
      <style>
        @keyframes gitLoadSpin { to { transform: rotate(360deg); } }
        @keyframes gitLoadPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      </style>
    </div>
    <div class="git-dialog-resize"></div>
  `;
  
  document.body.appendChild(dialog);
  
  // Helper function to show dialog with animation
  const showDialog = () => {
    backdrop.classList.add('visible');
    dialog.style.display = 'flex';
    // Trigger reflow for animation
    dialog.offsetHeight;
    dialog.classList.add('visible');
    dialog.classList.remove('closing');
    const gitTab = document.querySelector('[data-tab-id="git"]');
    if (gitTab) gitTab.classList.add('active');
    loadGitTabStatus();
  };
  
  // Helper function to hide dialog with animation
  const hideDialog = () => {
    dialog.classList.add('closing');
    dialog.classList.remove('visible');
    backdrop.classList.remove('visible');
    const gitTab = document.querySelector('[data-tab-id="git"]');
    if (gitTab) gitTab.classList.remove('active');
    setTimeout(() => {
      if (!dialog.classList.contains('visible')) {
        dialog.style.display = 'none';
        dialog.classList.remove('closing');
        // Reset position to center
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%) scale(0.9)';
      }
    }, 250);
  };
  
  // Make dialog draggable
  const header = dialog.querySelector('.git-dialog-header') as HTMLElement;
  let isDragging = false;
  let hasMoved = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  
  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = dialog.getBoundingClientRect();
    startLeft = rect.left + rect.width / 2;
    startTop = rect.top + rect.height / 2;
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    hasMoved = true;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dialog.style.left = `${startLeft + dx}px`;
    dialog.style.top = `${startTop + dy}px`;
    dialog.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });
  
  // Make dialog resizable
  const resizeHandle = dialog.querySelector('.git-dialog-resize') as HTMLElement;
  let isResizing = false;
  let resizeStartX = 0, resizeStartY = 0, startWidth = 0, startHeight = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    startWidth = dialog.offsetWidth;
    startHeight = dialog.offsetHeight;
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    dialog.style.width = `${Math.max(320, startWidth + dx)}px`;
    dialog.style.maxHeight = `${Math.max(250, startHeight + dy)}px`;
  });
  
  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.userSelect = '';
  });
  
  // Close button
  dialog.querySelector('#git-dialog-close')?.addEventListener('click', hideDialog);
  
  // Minimize button
  dialog.querySelector('#git-dialog-minimize')?.addEventListener('click', hideDialog);
  
  // Backdrop click to close
  backdrop.addEventListener('click', hideDialog);
  
  // Refresh button
  dialog.querySelector('#git-dialog-refresh')?.addEventListener('click', () => {
    const refreshBtn = dialog.querySelector('#git-dialog-refresh') as HTMLElement;
    if (refreshBtn) {
      refreshBtn.classList.add('spinning');
      // Add visual feedback
      const svg = refreshBtn.querySelector('svg');
      if (svg) svg.classList.add('git-loading');
    }
    loadGitTabStatus().finally(() => {
      if (refreshBtn) {
        refreshBtn.classList.remove('spinning');
        const svg = refreshBtn.querySelector('svg');
        if (svg) svg.classList.remove('git-loading');
      }
    });
  });
  
  // Create Git tab button in explorer tabs
  ensureGitTabInExplorer();
  
  console.log('? [Git] Floating dialog created successfully!');
  console.log('?? [Git] Tip: Press Ctrl+Shift+G to toggle Git panel');
  
  // Setup auto-detection when files change
  setupGitAutoDetect();
}

// ============================================================================
// GIT NESTED REPO DETECTION - Helper Functions
// ============================================================================

/**
 * Check if a directory is the ROOT of a git repo (has .git directly in it)
 * Uses multiple fallback methods for compatibility
 */
async function checkGitRoot(dirPath: string): Promise<boolean> {
  try {
    // Method 1: Use git_is_repo_root if available (new command)
    const isRoot = await invoke('git_is_repo_root', { path: dirPath });
    if (isRoot) {
      return true;
    }
  } catch (e) {
    // Command might not exist yet, try fallback methods
    console.log('?? [Git] git_is_repo_root not available, trying fallback...');
  }
  
  try {
    // Method 2: Use git_get_repo_root and compare paths
    const root = await invoke('git_get_repo_root', { path: dirPath }) as string;
    const normalizedDir = dirPath.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
    return normalizedDir === normalizedRoot;
  } catch (e) {
    // Not a git repo or command failed
  }
  
  try {
    // Method 3: Check if .git folder exists using existing path_exists
    const gitPath = `${dirPath}/.git`;
    const exists = await invoke('path_exists', { path: gitPath });
    if (exists) {
      return true;
    }
  } catch (e) {
    // path_exists failed
  }
  
  return false;
}

/**
 * Find the Git repository that contains the given file path
 * Walks up the directory tree to find the nearest .git folder
 */
async function findGitRepoForFile(filePath: string): Promise<GitRepoInfo | null> {
  if (!filePath) return null;
  
  console.log('?? [Git] Finding repo for file:', filePath);
  
  try {
    let currentPath = filePath.replace(/\\/g, '/');
    
    // If it's a file, start from parent directory
    if (!currentPath.endsWith('/')) {
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash > 0) {
        currentPath = currentPath.substring(0, lastSlash);
      }
    }
    
    let foundRepoPath: string | null = null;
    let isSubmodule = false;
    let parentRepo: string | undefined;
    
    // Walk up the directory tree
    while (currentPath && currentPath.length > 3) {
      console.log('?? [Git] Checking directory:', currentPath);
      
      const isRoot = await checkGitRoot(currentPath);
      
      if (isRoot) {
        console.log('? [Git] Found repo root at:', currentPath);
        
        if (!foundRepoPath) {
          foundRepoPath = currentPath;
        } else {
          isSubmodule = true;
          parentRepo = currentPath;
          break;
        }
      }
      
      const lastSlash = currentPath.lastIndexOf('/');
      if (lastSlash <= 0) break;
      currentPath = currentPath.substring(0, lastSlash);
    }
    
    console.log('?? [Git] Result - repo:', foundRepoPath, 'isSubmodule:', isSubmodule, 'parent:', parentRepo);
    
    if (foundRepoPath) {
      return {
        repoPath: foundRepoPath,
        repoName: foundRepoPath.split('/').pop() || foundRepoPath,
        isSubmodule,
        parentRepo
      };
    }
    
    return null;
  } catch (error) {
    console.error('? [Git] Repo detection error:', error);
    return null;
  }
}

/**
 * Get currently open file path from editor
 */
function getCurrentOpenFilePath(): string | null {
  // Try tabManager (most reliable)
  const tabMgr = (window as any).tabManager;
  if (tabMgr?.getActiveTab) {
    const activeTab = tabMgr.getActiveTab();
    if (activeTab?.filePath) {
      return activeTab.filePath;
    }
  }
  
  // Try global currentFilePath
  if ((window as any).currentFilePath) {
    return (window as any).currentFilePath;
  }
  
  // Try localStorage
  const lastFile = localStorage.getItem('ide_last_opened_file');
  if (lastFile) return lastFile;
  
  return null;
}

/**
 * Scan for all Git repos in project folder
 */
async function scanForGitRepos(rootPath: string): Promise<GitRepoInfo[]> {
  const repos: GitRepoInfo[] = [];
  
  try {
    // Check if root is a repo
    const rootIsRepo = await checkGitRoot(rootPath);
    if (rootIsRepo) {
      repos.push({
        repoPath: rootPath,
        repoName: rootPath.split(/[/\\]/).pop() || rootPath,
        isSubmodule: false
      });
    }
    
    // Scan immediate subdirectories for nested repos
    try {
      // Use read_directory_simple which returns array of filenames
      const entries = await invoke('read_directory_simple', { path: rootPath }) as string[];
      console.log('?? [Git] Scanning subdirectories:', entries.filter(e => !e.startsWith('.')));
      
      for (const entryName of entries) {
        // Skip hidden directories
        if (entryName.startsWith('.')) continue;
        
        const subPath = `${rootPath.replace(/\\/g, '/')}/${entryName}`;
        try {
          const hasGit = await checkGitRoot(subPath);
          
          if (hasGit) {
            console.log('? [Git] Found nested repo:', entryName);
            repos.push({
              repoPath: subPath,
              repoName: entryName,
              isSubmodule: rootIsRepo,
              parentRepo: rootIsRepo ? rootPath : undefined
            });
          }
        } catch (e) {
          // Skip this subdirectory (might be a file, not a dir)
        }
      }
    } catch (e) {
      // read_directory_simple might not exist
      console.log('?? [Git] read_directory_simple not available, skipping subdirectory scan');
    }
    
  } catch (error) {
    console.error('? [Git] Scan error:', error);
  }
  
  return repos;
}

/**
 * Setup auto-detection when file/tab changes
 */
function setupGitAutoDetect(): void {
  // Listen for tab changes
  document.addEventListener('tab-activated', () => {
    currentGitRepoInfo = null;
    const gitDialog = document.getElementById('git-floating-dialog');
    if (gitDialog?.classList.contains('visible')) {
      loadGitTabStatus();
    }
  });
  
  // Listen for file open events
  document.addEventListener('file-opened', () => {
    currentGitRepoInfo = null;
    const gitDialog = document.getElementById('git-floating-dialog');
    if (gitDialog?.classList.contains('visible')) {
      loadGitTabStatus();
    }
  });
  
  console.log('? [Git] Auto-detect on file change enabled');
}

// Expose to window for debugging
(window as any).findGitRepoForFile = findGitRepoForFile;
(window as any).currentGitRepoInfo = () => currentGitRepoInfo;
(window as any).allDetectedRepos = () => allDetectedRepos;

// ============================================================================
// GIT TAB STATUS - With Nested Repo Detection
// ============================================================================

async function loadGitTabStatus(): Promise<void> {
  console.log('?? [Git] Loading status with nested repo detection...');
  
  const statusContainer = document.getElementById('git-tab-status');
  if (!statusContainer) {
    console.log('? [Git] Status container not found');
    return;
  }
  
  // Get project path - try multiple sources
  const projectPath = (window as any).currentProjectPath || 
                      (window as any).currentFolderPath ||
                      localStorage.getItem('currentProjectPath') ||
                      localStorage.getItem('ide_last_project_path') || '';
  
  console.log('?? [Git] Project path:', projectPath);
  
  if (!projectPath) {
    statusContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #888;">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="#555" style="margin-bottom: 12px;">
          <path d="M14.5 3H7.71l-.85-.85A.5.5 0 006.5 2h-4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h12a.5.5 0 00.5-.5v-10a.5.5 0 00-.5-.5zm-12 1h5.29l.5.5H14v9H2V4z"/>
        </svg>
        <div style="font-size: 13px;">No project open</div>
        <div style="font-size: 11px; margin-top: 8px; color: #666;">Open a folder to use Git</div>
      </div>
    `;
    return;
  }
  
  statusContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center;">
      <!-- Animated Git Logo -->
      <div class="git-detecting-animation" style="position: relative; width: 80px; height: 80px; margin-bottom: 24px;">
        <!-- Outer ring -->
        <div style="position: absolute; inset: 0; border: 3px solid transparent; border-top-color: #f05033; border-radius: 50%; animation: gitDetectSpin 1s linear infinite;"></div>
        <!-- Middle ring -->
        <div style="position: absolute; inset: 8px; border: 3px solid transparent; border-top-color: #f05033; border-right-color: #f05033; border-radius: 50%; animation: gitDetectSpin 0.8s linear infinite reverse;"></div>
        <!-- Inner ring -->
        <div style="position: absolute; inset: 16px; border: 3px solid transparent; border-top-color: #f05033; border-radius: 50%; animation: gitDetectSpin 0.6s linear infinite;"></div>
        <!-- Center Git icon -->
        <div style="position: absolute; inset: 24px; display: flex; align-items: center; justify-content: center; animation: gitDetectPulse 1.5s ease-in-out infinite;">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="#f05033">
            <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
          </svg>
        </div>
      </div>
      
      <!-- Status text with dots animation -->
      <div style="color: #ccc; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
        <span>Detecting repository</span><span class="git-loading-dots"></span>
      </div>
      
      <!-- Subtle progress bar -->
      <div style="width: 120px; height: 3px; background: #333; border-radius: 2px; overflow: hidden; margin-top: 8px;">
        <div style="width: 40%; height: 100%; background: linear-gradient(90deg, #f05033, #ff7849); border-radius: 2px; animation: gitDetectProgress 1.5s ease-in-out infinite;"></div>
      </div>
      
      <!-- Subtitle -->
      <div style="color: #666; font-size: 11px; margin-top: 16px;">Scanning for Git repository...</div>
    </div>
    
    <style>
      @keyframes gitDetectSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes gitDetectPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
      @keyframes gitDetectProgress {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(150%); }
        100% { transform: translateX(300%); }
      }
      .git-loading-dots::after {
        content: '';
        animation: gitDots 1.5s infinite;
      }
      @keyframes gitDots {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    </style>
  `;
  
  try {
    // ===== SMART REPO DETECTION =====
    let gitRepoPath = projectPath;
    let repoInfo: GitRepoInfo | null = currentGitRepoInfo; // Use stored repo if available
    
    // 1. If no stored repo, detect based on currently open file
    if (!repoInfo) {
      const currentFile = getCurrentOpenFilePath();
      if (currentFile) {
        console.log('?? [Git] Detecting repo for current file:', currentFile);
        repoInfo = await findGitRepoForFile(currentFile);
        
        if (repoInfo) {
          gitRepoPath = repoInfo.repoPath;
          currentGitRepoInfo = repoInfo;
          console.log('? [Git] Detected repo from file:', repoInfo.repoName);
        }
      }
    } else {
      gitRepoPath = repoInfo.repoPath;
    }
    
    // 2. If still no repo, check project root
    if (!repoInfo) {
      const isRootRepo = await invoke('git_is_repo', { path: projectPath });
      if (isRootRepo) {
        repoInfo = {
          repoPath: projectPath,
          repoName: projectPath.split(/[/\\]/).pop() || 'Repository',
          isSubmodule: false
        };
        currentGitRepoInfo = repoInfo;
        gitRepoPath = projectPath;
      }
    }
    
    // 3. Scan for all repos in project
    allDetectedRepos = await scanForGitRepos(projectPath);
    console.log('?? [Git] All repos found:', allDetectedRepos.length);
    
    // Check if target path is a Git repo
    const isRepo = await invoke('git_is_repo', { path: gitRepoPath });
    console.log('?? [Git] Is repo:', isRepo, 'Path:', gitRepoPath);
    
    if (!isRepo) {
      // Build switch repo HTML if other repos exist
      let switchRepoHTML = '';
      if (allDetectedRepos.length > 0) {
        switchRepoHTML = `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #333;">
            <div style="color: #888; font-size: 11px; margin-bottom: 8px;">?? Other repositories found:</div>
            ${allDetectedRepos.map(r => `
              <button class="git-switch-repo" data-path="${r.repoPath}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; margin: 4px 0; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; cursor: pointer; font-size: 12px; text-align: left;">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="${r.isSubmodule ? '#4ec9b0' : '#f05033'}"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
                <span style="flex: 1;">${r.repoName}</span>
                ${r.isSubmodule ? '<span style="color: #4ec9b0; font-size: 10px; background: rgba(78,201,176,0.2); padding: 2px 6px; border-radius: 3px;">submodule</span>' : ''}
              </button>
            `).join('')}
          </div>
        `;
      }
      
      statusContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="#555" style="margin-bottom: 12px;">
            <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
          </svg>
          <div style="color: #ccc; margin-bottom: 8px; font-size: 13px;">Not a Git repository</div>
          <div style="color: #888; margin-bottom: 16px; font-size: 11px;">Initialize Git to track changes</div>
          <button id="git-init-btn" style="padding: 8px 20px; background: #0e639c; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <span style="margin-right: 6px;">+</span> Initialize Repository
          </button>
          ${switchRepoHTML}
        </div>
      `;
      
      // Init button handler
      document.getElementById('git-init-btn')?.addEventListener('click', async () => {
        try {
          await invoke('git_init', { path: gitRepoPath });
          showGitToast('Repository initialized!', 'success');
          loadGitTabStatus();
        } catch (error) {
          showGitToast(`Init failed: ${error}`, 'error');
        }
      });
      
      // Switch repo handlers
      statusContainer.querySelectorAll('.git-switch-repo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const path = (e.currentTarget as HTMLElement).getAttribute('data-path');
          if (path) {
            currentGitRepoInfo = allDetectedRepos.find(r => r.repoPath === path) || null;
            loadGitTabStatus();
          }
        });
        btn.addEventListener('mouseenter', () => {
          (btn as HTMLElement).style.background = '#3c3c3c';
          (btn as HTMLElement).style.borderColor = '#505050';
        });
        btn.addEventListener('mouseleave', () => {
          (btn as HTMLElement).style.background = '#2d2d2d';
          (btn as HTMLElement).style.borderColor = '#3c3c3c';
        });
      });
      
      return;
    }
    
    // Check if Git user is configured
    let gitUserName = '';
    let gitUserEmail = '';
    let needsConfig = false;
    
    try {
      gitUserName = await invoke('git_get_config', { path: gitRepoPath, key: 'user.name' }) as string || '';
      gitUserEmail = await invoke('git_get_config', { path: gitRepoPath, key: 'user.email' }) as string || '';
      needsConfig = !gitUserName.trim() || !gitUserEmail.trim();
    } catch (e) {
      console.log('?? [Git] Config check failed, assuming needs config:', e);
      needsConfig = true;
    }
    
    // Show config form if needed
    if (needsConfig) {
      statusContainer.innerHTML = `
        <div style="padding: 20px;">
          <!-- Repo indicator -->
          ${repoInfo ? `
            <div style="background: rgba(240, 80, 51, 0.1); border: 1px solid rgba(240, 80, 51, 0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#f05033"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
              <span style="color: #ccc; font-size: 12px;">${repoInfo.repoName}</span>
              ${repoInfo.isSubmodule ? '<span style="color: #888; font-size: 10px; background: #333; padding: 2px 6px; border-radius: 3px;">submodule</span>' : ''}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-bottom: 20px;">
            <svg width="40" height="40" viewBox="0 0 16 16" fill="#f05033" style="margin-bottom: 12px;">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12z"/>
              <path d="M7.5 4.5a.5.5 0 011 0v4a.5.5 0 01-1 0v-4zm.5 6a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
            </svg>
            <div style="color: #ccc; font-size: 14px; font-weight: 500; margin-bottom: 6px;">Git Configuration Required</div>
            <div style="color: #888; font-size: 12px;">Please set your identity for commits</div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <label style="display: block; color: #888; font-size: 11px; margin-bottom: 4px; text-transform: uppercase;">Your Name</label>
            <input type="text" id="git-config-name" value="${gitUserName}" placeholder="John Doe" 
              style="width: 100%; padding: 10px 12px; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 6px; color: #ccc; font-size: 13px; box-sizing: border-box;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; color: #888; font-size: 11px; margin-bottom: 4px; text-transform: uppercase;">Email Address</label>
            <input type="email" id="git-config-email" value="${gitUserEmail}" placeholder="john@example.com" 
              style="width: 100%; padding: 10px 12px; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 6px; color: #ccc; font-size: 13px; box-sizing: border-box;">
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="git-config-save-global" style="flex: 1; padding: 10px; background: #0e639c; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
              Save Globally
            </button>
            <button id="git-config-save-local" style="flex: 1; padding: 10px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 6px; color: #ccc; cursor: pointer; font-size: 12px;">
              Save for This Repo
            </button>
          </div>
          
          <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="color: #888; font-size: 11px; line-height: 1.5;">
              <strong style="color: #aaa;">?? Tip:</strong> Global settings apply to all repositories. Local settings only apply to this repository.
            </div>
          </div>
        </div>
      `;
      
      // Focus on first empty field
      setTimeout(() => {
        const nameInput = document.getElementById('git-config-name') as HTMLInputElement;
        const emailInput = document.getElementById('git-config-email') as HTMLInputElement;
        if (!nameInput?.value) nameInput?.focus();
        else if (!emailInput?.value) emailInput?.focus();
      }, 100);
      
      // Save global config
      document.getElementById('git-config-save-global')?.addEventListener('click', async () => {
        const name = (document.getElementById('git-config-name') as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById('git-config-email') as HTMLInputElement)?.value?.trim();
        
        if (!name || !email) {
          showGitToast('Please enter both name and email', 'warning');
          return;
        }
        
        try {
          await invoke('git_set_config', { path: gitRepoPath, key: 'user.name', value: name, global: true });
          await invoke('git_set_config', { path: gitRepoPath, key: 'user.email', value: email, global: true });
          showGitToast('Git configured globally!', 'success');
          loadGitTabStatus();
        } catch (error) {
          showGitToast(`Config failed: ${error}`, 'error');
        }
      });
      
      // Save local config
      document.getElementById('git-config-save-local')?.addEventListener('click', async () => {
        const name = (document.getElementById('git-config-name') as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById('git-config-email') as HTMLInputElement)?.value?.trim();
        
        if (!name || !email) {
          showGitToast('Please enter both name and email', 'warning');
          return;
        }
        
        try {
          await invoke('git_set_config', { path: gitRepoPath, key: 'user.name', value: name, global: false });
          await invoke('git_set_config', { path: gitRepoPath, key: 'user.email', value: email, global: false });
          showGitToast('Git configured for this repo!', 'success');
          loadGitTabStatus();
        } catch (error) {
          showGitToast(`Config failed: ${error}`, 'error');
        }
      });
      
      return;
    }
    
    const info = await invoke('git_info', { path: gitRepoPath }) as any;
    const status = await invoke('git_status', { path: gitRepoPath }) as any[];
    
    console.log('?? [Git] Info:', info);
    console.log('?? [Git] Status:', status.length, 'files');
    
    const staged = status.filter((f: any) => f.staged);
    const unstaged = status.filter((f: any) => !f.staged);
    
    // Store git status globally and dispatch event for badge update
    (window as any).gitStatus = {
      staged: staged,
      modified: unstaged,
      untracked: status.filter((f: any) => f.status === 'untracked'),
      total: status.length
    };
    document.dispatchEvent(new CustomEvent('git-status-updated', { 
      detail: (window as any).gitStatus 
    }));
    
    // Build repo switcher if multiple repos
    let repoSwitcherHTML = '';
    if (allDetectedRepos.length > 1) {
      repoSwitcherHTML = `
        <div style="position: relative; display: inline-block;">
          <button id="git-repo-switcher" style="background: transparent; border: 1px solid #3c3c3c; border-radius: 4px; padding: 4px 8px; color: #ccc; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="${repoInfo?.isSubmodule ? '#4ec9b0' : '#f05033'}"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
            <span>${repoInfo?.repoName || 'Repository'}</span>
            ${repoInfo?.isSubmodule ? '<span style="font-size: 9px; color: #4ec9b0; margin-left: 4px;">(sub)</span>' : ''}
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#888"><path d="M4 6l4 4 4-4"/></svg>
          </button>
          <div id="git-repo-dropdown" style="display: none; position: absolute; top: 100%; left: 0; margin-top: 4px; background: #252526; border: 1px solid #3c3c3c; border-radius: 6px; min-width: 220px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.4); overflow: hidden;">
            <div style="padding: 8px 12px; border-bottom: 1px solid #333; color: #888; font-size: 10px; text-transform: uppercase;">Switch Repository</div>
            ${allDetectedRepos.map(r => `
              <div class="git-repo-option" data-path="${r.repoPath}" style="padding: 10px 12px; cursor: pointer; font-size: 12px; color: ${r.repoPath === gitRepoPath ? '#4ec9b0' : '#ccc'}; display: flex; align-items: center; gap: 10px; transition: background 0.15s;">
                ${r.repoPath === gitRepoPath ? 
                  '<svg width="12" height="12" viewBox="0 0 16 16" fill="#4ec9b0"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>' : 
                  '<svg width="12" height="12" viewBox="0 0 16 16" fill="transparent"></svg>'}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="${r.isSubmodule ? '#4ec9b0' : '#f05033'}"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
                <span style="flex: 1;">${r.repoName}</span>
                ${r.isSubmodule ? '<span style="color: #4ec9b0; font-size: 9px; background: rgba(78,201,176,0.15); padding: 2px 5px; border-radius: 3px;">sub</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    statusContainer.innerHTML = `
      <!-- Repository Indicator (if submodule or multiple repos) -->
      ${repoInfo?.isSubmodule ? `
        <div style="background: rgba(78, 201, 176, 0.1); border: 1px solid rgba(78, 201, 176, 0.3); border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#4ec9b0"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/></svg>
          <div style="flex: 1;">
            <div style="color: #4ec9b0; font-size: 13px; font-weight: 500;">${repoInfo.repoName}</div>
            <div style="color: #888; font-size: 10px;">Submodule of ${repoInfo.parentRepo?.split(/[/\\]/).pop() || 'parent'}</div>
          </div>
          ${allDetectedRepos.length > 1 ? repoSwitcherHTML : ''}
        </div>
      ` : allDetectedRepos.length > 1 ? `
        <div style="margin-bottom: 12px;">
          ${repoSwitcherHTML}
        </div>
      ` : ''}
      
      <!-- Branch Selector -->
      <div class="git-branch-bar" style="display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #333; margin-bottom: 12px;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#888">
          <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
        </svg>
        <span style="color: #ccc; font-size: 13px; font-weight: 500;">${info.branch || 'master'}</span>
        <div style="flex: 1;"></div>
        <button id="git-fetch-btn" title="Fetch" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px; border-radius: 3px;">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 01.5.5v11.793l3.146-3.147a.5.5 0 01.708.708l-4 4a.5.5 0 01-.708 0l-4-4a.5.5 0 01.708-.708L7.5 13.293V1.5A.5.5 0 018 1z"/>
          </svg>
        </button>
      </div>
      
      <!-- Action Buttons Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 12px;">
        <button class="git-action-btn" data-action="pull" title="Pull from remote" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; cursor: pointer; font-size: 11px;">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a.5.5 0 01.5.5v11.793l3.146-3.147a.5.5 0 01.708.708l-4 4a.5.5 0 01-.708 0l-4-4a.5.5 0 01.708-.708L7.5 13.293V1.5A.5.5 0 018 1z"/></svg>
          Pull
        </button>
        <button class="git-action-btn" data-action="push" title="Push to remote" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; cursor: pointer; font-size: 11px;">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15a.5.5 0 01-.5-.5V2.707L4.354 5.854a.5.5 0 11-.708-.708l4-4a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L8.5 2.707V14.5a.5.5 0 01-.5.5z"/></svg>
          Push
        </button>
        <button class="git-action-btn" data-action="stash" title="Stash changes" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; cursor: pointer; font-size: 11px;">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1A1.5 1.5 0 001 2.5v11A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0013.5 1h-11zm0 1h11a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5z"/></svg>
          Stash
        </button>
      </div>
      
      <!-- Commit Section -->
      <div style="background: #252526; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
        <!-- AI Generate Button - Colored Star Icon -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <button id="git-ai-generate-btn" style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: transparent; border: 1px solid #4a4a4a; border-radius: 3px; color: #b0b0b0; font-size: 11px; cursor: pointer; transition: all 0.15s;" title="Generate or enhance commit message with AI">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="url(#aiStarGradient)">
              <defs>
                <linearGradient id="aiStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#a78bfa"/>
                  <stop offset="100%" style="stop-color:#7c3aed"/>
                </linearGradient>
              </defs>
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
            </svg>
            <span>AI Generate</span>
          </button>
          <button id="git-ai-select-files-btn" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: transparent; border: 1px solid #3c3c3c; border-radius: 3px; color: #888; font-size: 10px; cursor: pointer; transition: all 0.15s;" title="Select specific files for AI to analyze">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2.5A1.5 1.5 0 014.5 1h5.793a1.5 1.5 0 011.06.44l2.207 2.207a1.5 1.5 0 01.44 1.06V12.5A1.5 1.5 0 0112.5 14h-8A1.5 1.5 0 013 12.5v-10zm1.5-.5a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V4.707a.5.5 0 00-.146-.353L10.146 2.146A.5.5 0 009.793 2H4.5z"/>
              <path d="M6 7.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z"/>
            </svg>
            <span id="git-ai-file-count">All Files</span>
          </button>
        </div>
        <!-- Hidden file selector panel -->
        <div id="git-ai-file-selector" style="display: none; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 4px; padding: 8px; margin-bottom: 8px; max-height: 150px; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #333;">
            <span style="color: #888; font-size: 10px; text-transform: uppercase;">Select files for AI analysis</span>
            <div style="display: flex; gap: 8px;">
              <button id="git-ai-select-all" style="background: none; border: none; color: #4fc3f7; font-size: 10px; cursor: pointer; padding: 0;">All</button>
              <button id="git-ai-select-none" style="background: none; border: none; color: #888; font-size: 10px; cursor: pointer; padding: 0;">None</button>
            </div>
          </div>
          <div id="git-ai-file-list" style="display: flex; flex-direction: column; gap: 4px;"></div>
        </div>
        <textarea id="git-commit-input" placeholder="Message (press Ctrl+Enter to commit)" rows="4" style="width: 100%; padding: 10px; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; font-size: 12px; box-sizing: border-box; resize: vertical; font-family: 'Consolas', 'Monaco', monospace; line-height: 1.4; min-height: 80px;"></textarea>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button id="git-commit-btn" style="flex: 1; padding: 8px 12px; background: ${(staged.length + unstaged.length) > 0 ? '#0e639c' : '#3c3c3c'}; border: none; border-radius: 4px; color: ${(staged.length + unstaged.length) > 0 ? 'white' : '#888'}; cursor: ${(staged.length + unstaged.length) > 0 ? 'pointer' : 'not-allowed'}; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
            ${staged.length > 0 ? `Commit (${staged.length})` : unstaged.length > 0 ? `Commit All (${unstaged.length})` : 'Commit'}
          </button>
          <button id="git-commit-amend" title="Amend last commit" style="padding: 8px 10px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #888; cursor: pointer; font-size: 11px;">
            Amend
          </button>
        </div>
      </div>
      
      <!-- Staged Changes -->
      <div class="git-section" style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer;" class="git-section-header" data-section="staged">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#888" class="git-chevron" style="transition: transform 0.15s;"><path d="M6 4l4 4-4 4"/></svg>
            <span style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600;">Staged Changes</span>
            <span style="background: #0e639c; color: white; font-size: 10px; padding: 1px 6px; border-radius: 10px;">${staged.length}</span>
          </div>
          ${staged.length > 0 ? `
            <button id="git-unstage-all" title="Unstage All" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 3h7a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5zm0-1A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0011.5 2h-7zM6 6h4v1H6V6zm0 3h4v1H6V9z"/></svg>
            </button>
          ` : ''}
        </div>
        <div class="git-section-content" data-section="staged" style="margin-left: 16px;">
          ${staged.length > 0 ? staged.map((f: any) => `
            <div class="git-file-item" data-path="${f.path}" data-staged="true" style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; padding-left: 6px; border-left: 2px solid transparent; border-radius: 4px; cursor: pointer; margin: 2px 0; transition: all 0.15s;">
              <span style="color: ${getGitStatusColor(f.status)}; font-weight: 600; font-size: 11px; width: 14px;">${getGitStatusLetter(f.status)}</span>
              <span style="flex: 1; color: #ccc; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.path}">${f.path.split(/[/\\]/).pop()}</span>
              <button class="git-unstage-btn" data-path="${f.path}" title="Unstage" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px; border-radius: 3px; opacity: 0; transition: opacity 0.15s;">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z"/></svg>
              </button>
            </div>
          `).join('') : '<div style="color: #666; font-size: 11px; padding: 8px 0;">No staged changes</div>'}
        </div>
      </div>
      
      <!-- Unstaged Changes -->
      <div class="git-section" style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer;" class="git-section-header" data-section="changes">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#888" class="git-chevron" style="transition: transform 0.15s;"><path d="M6 4l4 4-4 4"/></svg>
            <span style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600;">Changes</span>
            <span style="background: ${unstaged.length > 0 ? '#d19a66' : '#555'}; color: ${unstaged.length > 0 ? '#1e1e1e' : '#888'}; font-size: 10px; padding: 1px 6px; border-radius: 10px;">${unstaged.length}</span>
          </div>
          ${unstaged.length > 0 ? `
            <div style="display: flex; gap: 4px; align-items: center;">
              <button id="git-select-all-files" title="Select All" style="background: transparent; border: none; color: #4fc3f7; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 10px;">All</button>
              <button id="git-clear-all-files" title="Clear Selection" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 10px;">None</button>
              <span style="color: #444; margin: 0 2px;">|</span>
              <button id="git-discard-all" title="Discard All" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
              </button>
              <button id="git-stage-all" title="Stage All" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
              </button>
            </div>
          ` : ''}
        </div>
        <div class="git-section-content" data-section="changes" style="margin-left: 16px;">
          ${unstaged.length > 0 ? unstaged.map((f: any) => `
            <div class="git-file-item" data-path="${f.path}" style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; padding-left: 6px; border-left: 2px solid transparent; border-radius: 4px; cursor: pointer; margin: 2px 0; transition: all 0.15s;">
              <input type="checkbox" class="git-commit-file-checkbox" data-path="${f.path}" style="accent-color: #0e639c; cursor: pointer; width: 13px; height: 13px; margin: 0;" title="Select for commit">
              <span style="color: ${getGitStatusColor(f.status)}; font-weight: 600; font-size: 11px; width: 14px;">${getGitStatusLetter(f.status)}</span>
              <span style="flex: 1; color: #ccc; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.path}">${f.path.split(/[/\\]/).pop()}</span>
              <button class="git-stage-btn" data-path="${f.path}" title="Stage" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px; border-radius: 3px; opacity: 0; transition: opacity 0.15s;">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/></svg>
              </button>
              <button class="git-discard-btn" data-path="${f.path}" title="Discard" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px; border-radius: 3px; opacity: 0; transition: opacity 0.15s;">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>
              </button>
            </div>
          `).join('') : '<div style="color: #666; font-size: 11px; padding: 8px 0;">No changes</div>'}
        </div>
        ${unstaged.length > 0 ? `
        <div id="git-commit-selected-bar" style="display: none; margin: 8px 0 0 16px; padding: 8px 10px; background: #1a3a1a; border: 1px solid #2d5a2d; border-radius: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="color: #6fbf6f; font-size: 11px;"><span id="git-selected-count">0</span> file(s) selected</span>
            <div style="display: flex; gap: 6px;">
              <button id="git-commit-selected-btn" style="padding: 4px 10px; background: #2ea043; border: none; border-radius: 3px; color: white; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>
                Commit Selected
              </button>
              <button id="git-clear-selection-btn" style="padding: 4px 8px; background: transparent; border: 1px solid #444; border-radius: 3px; color: #888; font-size: 11px; cursor: pointer;">
                Clear
              </button>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
      
      <!-- Recent Commits (collapsed by default) -->
      <div class="git-section">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; cursor: pointer;" class="git-section-header" data-section="commits">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#888" class="git-chevron" style="transform: rotate(-90deg); transition: transform 0.15s;"><path d="M6 4l4 4-4 4"/></svg>
            <span style="color: #888; font-size: 11px; text-transform: uppercase; font-weight: 600;">Recent Commits</span>
          </div>
          <button id="git-view-log" title="View Full Log" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8.75 1.5a.75.75 0 00-1.5 0v6.69L4.354 5.293a.75.75 0 10-1.061 1.06l4 4a.75.75 0 001.061 0l4-4a.75.75 0 00-1.061-1.06L8.75 8.19V1.5z"/></svg>
          </button>
        </div>
        <div class="git-section-content" data-section="commits" style="margin-left: 16px; display: none;">
          ${info.last_commit ? `
            <div style="padding: 8px 0; border-bottom: 1px solid #333;">
              <div style="color: #ccc; font-size: 12px; margin-bottom: 4px;">${info.last_commit.message || 'No message'}</div>
              <div style="color: #666; font-size: 10px;">${info.last_commit.author || 'Unknown'} ? ${info.last_commit.date || ''}</div>
            </div>
          ` : '<div style="color: #666; font-size: 11px; padding: 8px 0;">No commits yet</div>'}
        </div>
      </div>
    `;
    
    // Attach all handlers with the correct repo path
    attachGitTabHandlers(gitRepoPath);
    
    // Setup repo switcher dropdown
    const switcher = document.getElementById('git-repo-switcher');
    const dropdown = document.getElementById('git-repo-dropdown');
    if (switcher && dropdown) {
      switcher.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });
      
      // Handle repo selection
      dropdown.querySelectorAll('.git-repo-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const path = (e.currentTarget as HTMLElement).getAttribute('data-path');
          if (path && path !== gitRepoPath) {
            currentGitRepoInfo = allDetectedRepos.find(r => r.repoPath === path) || null;
            loadGitTabStatus();
          }
          dropdown.style.display = 'none';
        });
        
        // Hover effects
        opt.addEventListener('mouseenter', () => {
          (opt as HTMLElement).style.background = '#3c3c3c';
        });
        opt.addEventListener('mouseleave', () => {
          (opt as HTMLElement).style.background = 'transparent';
        });
      });
    }
    
    console.log('? [Git] Status loaded for:', gitRepoPath);
    
  } catch (error) {
    console.error('? [Git] Error:', error);
    statusContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="#f14c4c" style="margin-bottom: 12px;">
          <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/>
          <path d="M7.002 11a1 1 0 112 0 1 1 0 01-2 0zM7.1 4.995a.905.905 0 111.8 0l-.35 3.507a.552.552 0 01-1.1 0L7.1 4.995z"/>
        </svg>
        <div style="color: #f14c4c; font-size: 13px; margin-bottom: 8px;">Error loading Git status</div>
        <div style="color: #888; font-size: 11px;">${error}</div>
        <button onclick="loadGitTabStatus()" style="margin-top: 16px; padding: 6px 16px; background: #2d2d2d; border: 1px solid #3c3c3c; border-radius: 4px; color: #ccc; cursor: pointer; font-size: 12px;">Retry</button>
      </div>
    `;
  }
}

function attachGitTabHandlers(projectPath: string): void {
  const statusContainer = document.getElementById('git-tab-status');
  if (!statusContainer) return;
  
  // Mark all animated elements as visible after animation completes
  setTimeout(() => {
    statusContainer.querySelectorAll('.git-action-btn, .git-section, .git-file-item, #git-ai-generate-btn, #git-commit-input').forEach(el => {
      (el as HTMLElement).style.opacity = '1';
      el.classList.add('animated');
    });
  }, 1000);
  
  // Action buttons (Pull, Push, Stash)
  statusContainer.querySelectorAll('.git-action-btn').forEach(btn => {
    // Ensure button is visible
    (btn as HTMLElement).style.opacity = '1';
    
    btn.addEventListener('click', async () => {
      const action = (btn as HTMLElement).dataset.action;
      const originalContent = btn.innerHTML;
      btn.innerHTML = '<span style="opacity: 0.7;">...</span>';
      (btn as HTMLButtonElement).disabled = true;
      
      try {
        if (action === 'pull') {
          await invoke('git_pull', { path: projectPath });
          showGitToast('Pull complete!', 'success');
        } else if (action === 'push') {
          await invoke('git_push', { path: projectPath });
          showGitToast('Push complete!', 'success');
        } else if (action === 'stash') {
          await invoke('git_stash', { path: projectPath });
          showGitToast('Changes stashed!', 'success');
        }
        loadGitTabStatus();
      } catch (error) {
        showGitToast(`${action} failed: ${error}`, 'error');
        btn.innerHTML = originalContent;
        (btn as HTMLButtonElement).disabled = false;
      }
    });
  });
  
  // Fetch button
  const fetchBtn = statusContainer.querySelector('#git-fetch-btn');
  fetchBtn?.addEventListener('click', async () => {
    try {
      await invoke('git_fetch', { path: projectPath });
      showGitToast('Fetch complete!', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Fetch failed: ${error}`, 'error');
    }
  });
  fetchBtn?.addEventListener('mouseenter', () => {
    (fetchBtn as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
    (fetchBtn as HTMLElement).style.color = '#ccc';
  });
  fetchBtn?.addEventListener('mouseleave', () => {
    (fetchBtn as HTMLElement).style.background = 'transparent';
    (fetchBtn as HTMLElement).style.color = '#888';
  });
  
  // Commit button
  const commitBtn = statusContainer.querySelector('#git-commit-btn');
  const commitInput = statusContainer.querySelector('#git-commit-input') as HTMLTextAreaElement;
  
  const doCommit = async () => {
    const message = commitInput?.value?.trim();
    if (!message) {
      showGitToast('Enter a commit message', 'warning');
      commitInput?.focus();
      return;
    }
    
    try {
      // Check current staged/unstaged status
      const currentStatus = await invoke('git_status', { path: projectPath }) as any[];
      const stagedFiles = currentStatus.filter((f: any) => f.staged);
      const unstagedFiles = currentStatus.filter((f: any) => !f.staged);
      
      // ? KEY FIX: If nothing staged but there ARE changes, auto-stage all
      if (stagedFiles.length === 0 && unstagedFiles.length > 0) {
        // Check if this is an initial commit (no previous commits)
        let isInitialCommit = false;
        try {
          const repoInfo = await invoke('git_info', { path: projectPath }) as any;
          isInitialCommit = !repoInfo.last_commit;
        } catch (e) {
          isInitialCommit = true;
        }
        
        if (isInitialCommit) {
          // Initial commit ? auto-stage all without asking
          console.log(`[Git] Initial commit ? auto-staging all ${unstagedFiles.length} files`);
          await invoke('git_add_all', { path: projectPath });
          showGitToast(`Staged ${unstagedFiles.length} files for initial commit`, 'info');
        } else {
          // Not initial commit ? confirm with user first
          const userConfirmed = await new Promise<boolean>((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#252526;border:1px solid #3c3c3c;border-radius:8px;padding:20px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
            dialog.innerHTML = `
              <div style="font-size:14px;font-weight:600;color:#e0e0e0;margin-bottom:12px;">No Staged Changes</div>
              <div style="font-size:13px;color:#aaa;margin-bottom:20px;">There are no staged changes. Stage all ${unstagedFiles.length} changed files and commit?</div>
              <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button id="git-confirm-cancel" style="padding:6px 16px;border:1px solid #555;border-radius:4px;background:transparent;color:#ccc;cursor:pointer;font-size:13px;">Cancel</button>
                <button id="git-confirm-ok" style="padding:6px 16px;border:none;border-radius:4px;background:#0e639c;color:white;cursor:pointer;font-size:13px;">Stage All & Commit</button>
              </div>`;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            dialog.querySelector('#git-confirm-ok')!.addEventListener('click', () => { document.body.removeChild(overlay); resolve(true); });
            dialog.querySelector('#git-confirm-cancel')!.addEventListener('click', () => { document.body.removeChild(overlay); resolve(false); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(false); } });
          });
          
          if (!userConfirmed) return;
          
          console.log(`[Git] User confirmed ? staging all ${unstagedFiles.length} files`);
          await invoke('git_add_all', { path: projectPath });
        }
      }
      
      await invoke('git_commit', { path: projectPath, message });
      commitInput.value = '';
      showGitToast('Committed successfully!', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Commit failed: ${error}`, 'error');
    }
  };
  
  commitBtn?.addEventListener('click', doCommit);
  
  // Ctrl+Enter to commit
  commitInput?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      doCommit();
    }
  });
  
  // Amend button
  const amendBtn = statusContainer.querySelector('#git-commit-amend');
  amendBtn?.addEventListener('click', async () => {
    const message = commitInput?.value?.trim();
    try {
      await invoke('git_commit_amend', { path: projectPath, message: message || undefined });
      if (commitInput) commitInput.value = '';
      showGitToast('Commit amended!', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Amend failed: ${error}`, 'error');
    }
  });
  amendBtn?.addEventListener('mouseenter', () => {
    (amendBtn as HTMLElement).style.background = '#3c3c3c';
    (amendBtn as HTMLElement).style.color = '#ccc';
  });
  amendBtn?.addEventListener('mouseleave', () => {
    (amendBtn as HTMLElement).style.background = '#2d2d2d';
    (amendBtn as HTMLElement).style.color = '#888';
  });
  
  // File selection state for AI commit (declared early for use in AI handler)
  let selectedFiles: Set<string> = new Set();
  let allChangedFiles: any[] = [];
  
  // AI Generate commit message button
  const aiGenerateBtn = statusContainer.querySelector('#git-ai-generate-btn');
  aiGenerateBtn?.addEventListener('click', async () => {
    const btn = aiGenerateBtn as HTMLButtonElement;
    const originalContent = btn.innerHTML;
    const userInput = commitInput?.value?.trim() || '';
    
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="url(#aiStarGradient)" style="animation: spin 1s linear infinite;">
        <defs>
          <linearGradient id="aiStarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#a78bfa"/>
            <stop offset="100%" style="stop-color:#7c3aed"/>
          </linearGradient>
        </defs>
        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
      </svg>
      <span>${userInput ? 'Enhancing...' : 'Analyzing...'}</span>
    `;
    
    try {
      // Get changed files
      await gitManager.open(projectPath);
      const status = await gitManager.getStatus();
      const allFiles = Array.isArray(status) ? status : ((status as any)?.files || []);
      
      if (allFiles.length === 0) {
        showGitToast('No changes to commit', 'warning');
        return;
      }
      
      // Check commit checkboxes first, then AI file selector
      const commitCheckboxes = statusContainer.querySelectorAll('.git-commit-file-checkbox:checked');
      let files = allFiles;
      
      if (commitCheckboxes.length > 0) {
        // Use commit-selected files
        const checkedPaths = Array.from(commitCheckboxes).map(cb => (cb as HTMLInputElement).dataset.path);
        files = allFiles.filter((f: any) => checkedPaths.includes(f.path));
        console.log(`?? AI analyzing ${files.length} commit-selected files`);
      } else if (selectedFiles.size > 0 && selectedFiles.size < allFiles.length) {
        // Use AI file selector
        files = allFiles.filter((f: any) => selectedFiles.has(f.path));
        console.log(`?? AI analyzing ${files.length} AI-selected files`);
      }
      
      if (files.length === 0) {
        showGitToast('No files selected for AI analysis', 'warning');
        return;
      }
      
      // Build detailed diff analysis
      let diffAnalysis = '';
      let fileTypes: string[] = [];
      let addedLines = 0;
      let removedLines = 0;
      
      // Categorize files by type
      const fileCategories: Record<string, string[]> = {
        frontend: [],
        backend: [],
        config: [],
        docs: [],
        tests: [],
        styles: [],
        other: []
      };
      
      for (const file of files) {
        const ext = file.path.split('.').pop()?.toLowerCase() || '';
        const name = file.path.toLowerCase();
        
        if (['test', 'spec', '__test__'].some(t => name.includes(t))) {
          fileCategories.tests.push(file.path);
        } else if (['css', 'scss', 'less', 'sass'].includes(ext)) {
          fileCategories.styles.push(file.path);
        } else if (['md', 'txt', 'rst', 'doc'].includes(ext) || name.includes('readme')) {
          fileCategories.docs.push(file.path);
        } else if (['json', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext) || name.includes('config')) {
          fileCategories.config.push(file.path);
        } else if (['tsx', 'jsx', 'vue', 'svelte', 'html'].includes(ext)) {
          fileCategories.frontend.push(file.path);
        } else if (['py', 'rs', 'go', 'java', 'rb', 'php'].includes(ext)) {
          fileCategories.backend.push(file.path);
        } else if (['ts', 'js'].includes(ext)) {
          // Check if it's likely frontend or backend
          if (name.includes('component') || name.includes('page') || name.includes('view')) {
            fileCategories.frontend.push(file.path);
          } else {
            fileCategories.backend.push(file.path);
          }
        } else {
          fileCategories.other.push(file.path);
        }
        
        fileTypes.push(ext);
      }
      
      // Build summary of file changes
      diffAnalysis = `Files changed (${files.length} total):\n`;
      for (const [category, categoryFiles] of Object.entries(fileCategories)) {
        if (categoryFiles.length > 0) {
          diffAnalysis += `\n[${category.toUpperCase()}]:\n`;
          categoryFiles.forEach(f => {
            const file = files.find((x: any) => x.path === f);
            diffAnalysis += `  - ${f} (${file?.status || 'modified'})\n`;
          });
        }
      }
      
      // Get actual diff content for accurate analysis
      diffAnalysis += '\n\nACTUAL CODE CHANGES (+ = added, - = removed):\n';
      diffAnalysis += '='.repeat(50) + '\n';
      
      for (const file of files.filter(function(fp){ return !/(tsconfig|package-lock|\.lock$)/.test(fp); }).slice(0, 5)) {
        try {
          // Try multiple methods to get the diff
          let diff = '';
          
          // Method 1: Try gitManager.diff (unstaged)
          try {
            diff = await gitManager.diff(file.path, false);
          } catch (e) { }
          
          // Method 2: Try gitManager.diff (staged)
          if (!diff || diff.trim() === '') {
            try {
              diff = await gitManager.diff(file.path, true);
            } catch (e) { }
          }
          
          // Method 3: Try invoke git_diff directly (most reliable)
          if (!diff || diff.trim() === '') {
            try {
              diff = await invoke('git_diff', { path: projectPath, file: file.path, staged: false }) as string;
            } catch (e) { }
          }
          
          // Method 4: Try invoke git_diff staged
          if (!diff || diff.trim() === '') {
            try {
              diff = await invoke('git_diff', { path: projectPath, file: file.path, staged: true }) as string;
            } catch (e) { }
          }
          
          console.log(`?? [AI Commit] Diff for ${file.path} (${diff?.length || 0} chars):`, diff?.substring(0, 300));
          
          if (diff && diff.trim() !== '') {
            // Count additions/deletions
            const lines = diff.split('\n');
            let fileAdded = 0;
            let fileRemoved = 0;
            
            // Extract ALL change lines (+ and -) - including comments, whitespace, everything
            const changeLines: string[] = [];
            lines.forEach(line => {
              // Capture added lines (but not the +++ header)
              if (line.startsWith('+') && !line.startsWith('+++')) {
                fileAdded++;
                addedLines++;
                changeLines.push(line);
              }
              // Capture removed lines (but not the --- header)
              if (line.startsWith('-') && !line.startsWith('---')) {
                fileRemoved++;
                removedLines++;
                changeLines.push(line);
              }
            });
            
            if (changeLines.length > 0) {
              diffAnalysis += `\n?? ${file.path} (+${fileAdded}/-${fileRemoved}):\n`;
              // Show ALL changes, limit to 30 lines per file
              diffAnalysis += changeLines.slice(0, 30).join('\n') + '\n';
              if (changeLines.length > 30) {
                diffAnalysis += `... and ${changeLines.length - 30} more lines\n`;
              }
            } else {
              // No +/- lines found, show raw diff for context
              diffAnalysis += `\n?? ${file.path} (file modified but no line changes in diff):\n`;
              diffAnalysis += `Status: ${file.status || 'modified'}\n`;
            }
          } else {
            // No diff available - file might be new, binary, or permissions change
            diffAnalysis += `\n?? ${file.path}:\n`;
            diffAnalysis += `Status: ${file.status || 'modified'} (no diff content available - may be binary or new file)\n`;
          }
        } catch (e) {
          console.warn(`[AI Commit] Failed to get diff for ${file.path}:`, e);
          diffAnalysis += `\n?? ${file.path} (${file.status || 'modified'})\n`;
        }
      }
      
      diffAnalysis += '\n' + '='.repeat(50);
      diffAnalysis += `\nTOTAL: +${addedLines} lines added, -${removedLines} lines removed`;
      
      // If no actual changes detected, provide helpful note
      if (addedLines === 0 && removedLines === 0) {
        diffAnalysis += '\n\n?? Note: Could not extract line-by-line changes. Files are marked as modified but diff content unavailable.';
        diffAnalysis += '\nPlease write a commit message based on the file list above.';
      }
      
      console.log('?? [AI Commit] Full diff analysis:', diffAnalysis);
      
      // Call Operator X02 API
      const OPERATOR_X02_CONFIG = {
        apiKey: 'PROXY',
        apiBaseUrl: 'PROXY',
        model: 'x02-coder'
      };
      
      // Smart prompt based on whether user has input
      let prompt: string;
      
      // Check if we have actual diff content
      const hasDiffContent = addedLines > 0 || removedLines > 0;
      
      if (userInput) {
        // ENHANCE MODE
        prompt = `You are a senior software developer writing a commit message after completing your coding work.

The developer wrote this draft: "${userInput}"

Here are the code changes:
${diffAnalysis}

CRITICAL RULES:
1. ${hasDiffContent ? 'ONLY describe what ACTUALLY changed in the diff (+ and - lines)' : 'Use the file list and developer draft to write an appropriate message'}
2. DO NOT invent or hallucinate features that aren't mentioned
3. ALL changes matter - including comments, formatting, variable names
4. Match the commit type to the actual change:
   - Comment added/changed = chore or docs
   - Typo/spelling fix = fix or chore
   - Formatting/whitespace = style
   - New code functionality = feat
   - Bug fix = fix
   - Code cleanup = refactor
5. Be specific about what the change IS, even if it's small

Examples for small changes:
- Comment added "//test1123" ? "chore(webcam): add test comment in initializeWebcam"
- Typo fix in comment ? "docs(webcam): fix typo in comment"  
- Variable renamed ? "refactor(webcam): rename variable for clarity"

Return ONLY the commit message. Be HONEST about what changed.`;
      } else {
        // GENERATE MODE
        prompt = `You are a senior software developer. Write an ACCURATE commit message based on the code changes.

Here are the code changes:
${diffAnalysis}

CRITICAL RULES:
${hasDiffContent ? `1. READ THE DIFF CAREFULLY - describe what actually changed
2. Lines with + are ADDITIONS, lines with - are DELETIONS
3. ALL changes count - including comments, whitespace, small edits` : `1. Diff content is not available, use the file list to write an appropriate message
2. Keep it generic but accurate based on file names/types`}
4. DO NOT describe existing code as if it's new
5. DO NOT invent features that aren't shown
6. Be accurate about what changed, even if small:
   - Comment change ? "chore: update comment" or "docs: add explanation"
   - Added "//test123" ? "chore: add test comment"
   - Whitespace fix ? "style: fix formatting"
   - Real new code ? "feat: implement X"
   - Bug fix ? "fix: resolve issue with X"

Commit types:
- feat: NEW functionality (real new code logic)
- fix: bug fix or correction
- refactor: code restructuring
- style: formatting, whitespace only
- chore: minor changes, comments, maintenance
- docs: documentation or comment changes
- test: test changes

Format: type(scope): short description

${hasDiffContent ? `IMPORTANT: Even small changes like adding a comment "//test1123www" should be described accurately as:
chore(webcam): add test comment` : 'Keep the message generic but appropriate for the files modified.'}

Return ONLY the commit message. Be accurate, not impressive.`;
      }
      
      // ? PROXY INTERCEPT for commit message
      let message: string | undefined;
      if (OPERATOR_X02_CONFIG.apiKey === 'PROXY' && (window as any).smartAICall) {
        console.log('?? [CommitMsg] Using proxy for commit message');
        const rawResp = await (window as any).smartAICall({
          provider: 'operator_x02',
          apiKey: 'PROXY',
          model: OPERATOR_X02_CONFIG.model,
          message: prompt,
          maxTokens: 500,
          temperature: 0.2
        });
        message = typeof rawResp === 'string' ? rawResp.trim() : rawResp?.choices?.[0]?.message?.content?.trim();
      } else {
      const response = await fetch(`${OPERATOR_X02_CONFIG.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPERATOR_X02_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: OPERATOR_X02_CONFIG.model,
          messages: [
            { role: 'system', content: 'You are a Git commit message writer. You MUST accurately describe what actually changed. ALL changes matter - including comments, formatting, and small edits. Never invent features. If a comment like "//test123" was added, say so. Accuracy over impressiveness.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.2
        })
      });
      
      const data = await response.json();
      message = data.choices?.[0]?.message?.content?.trim();
      } // close non-proxy path
      
      // Clean up the message
      if (message) {
        message = message
          .replace(/^["'`]|["'`]$/g, '')  // Remove quotes
          .replace(/^(Here|This|The commit message|Commit message|Message).*?:\s*/i, '')  // Remove prefixes
          .trim();
      }
      
      if (message && commitInput) {
        commitInput.value = message;
        commitInput.dispatchEvent(new Event('input', { bubbles: true }));
        showGitToast(userInput ? '? Message enhanced!' : '? Message generated!', 'success');
      } else {
        showGitToast('Failed to generate message', 'error');
      }
    } catch (error) {
      console.error('AI Generate failed:', error);
      showGitToast(`AI Error: ${error}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalContent;
      btn.style.opacity = '1';
    }
  });
  
  // Add hover effect for AI Generate button - matching IDE style
  aiGenerateBtn?.addEventListener('mouseenter', () => {
    (aiGenerateBtn as HTMLElement).style.background = '#3c3c3c';
    (aiGenerateBtn as HTMLElement).style.borderColor = '#5a5a5a';
    (aiGenerateBtn as HTMLElement).style.color = '#e0e0e0';
  });
  aiGenerateBtn?.addEventListener('mouseleave', () => {
    (aiGenerateBtn as HTMLElement).style.background = 'transparent';
    (aiGenerateBtn as HTMLElement).style.borderColor = '#4a4a4a';
    (aiGenerateBtn as HTMLElement).style.color = '#b0b0b0';
  });

  // File selector for AI commit
  const selectFilesBtn = statusContainer.querySelector('#git-ai-select-files-btn');
  const fileSelector = statusContainer.querySelector('#git-ai-file-selector') as HTMLElement;
  const fileList = statusContainer.querySelector('#git-ai-file-list') as HTMLElement;
  const fileCountLabel = statusContainer.querySelector('#git-ai-file-count') as HTMLElement;
  const selectAllBtn = statusContainer.querySelector('#git-ai-select-all');
  const selectNoneBtn = statusContainer.querySelector('#git-ai-select-none');
  
  // Toggle file selector panel
  selectFilesBtn?.addEventListener('click', async () => {
    if (fileSelector.style.display === 'none') {
      // Load files and show selector
      try {
        await gitManager.open(projectPath);
        const status = await gitManager.getStatus();
        allChangedFiles = Array.isArray(status) ? status : ((status as any)?.files || []);
        
        if (allChangedFiles.length === 0) {
          showGitToast('No changed files', 'warning');
          return;
        }
        
        // Initialize all files as selected if first time
        if (selectedFiles.size === 0) {
          allChangedFiles.forEach(f => selectedFiles.add(f.path));
        }
        
        // Render file list with checkboxes
        fileList.innerHTML = allChangedFiles.map(f => `
          <label style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 3px; cursor: pointer; transition: background 0.1s;" 
                 onmouseenter="this.style.background='#2d2d2d'" onmouseleave="this.style.background='transparent'">
            <input type="checkbox" class="ai-file-checkbox" data-path="${f.path}" 
                   ${selectedFiles.has(f.path) ? 'checked' : ''}
                   style="accent-color: #7c3aed; cursor: pointer;">
            <span style="color: ${getGitStatusColor(f.status)}; font-weight: 600; font-size: 10px; width: 12px;">${getGitStatusLetter(f.status)}</span>
            <span style="color: #ccc; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.path}">${f.path}</span>
          </label>
        `).join('');
        
        // Add checkbox change listeners
        fileList.querySelectorAll('.ai-file-checkbox').forEach(cb => {
          cb.addEventListener('change', (e) => {
            const checkbox = e.target as HTMLInputElement;
            const path = checkbox.dataset.path!;
            if (checkbox.checked) {
              selectedFiles.add(path);
            } else {
              selectedFiles.delete(path);
            }
            updateFileCountLabel();
          });
        });
        
        fileSelector.style.display = 'block';
        (selectFilesBtn as HTMLElement).style.borderColor = '#7c3aed';
        (selectFilesBtn as HTMLElement).style.color = '#a78bfa';
      } catch (error) {
        showGitToast('Failed to load files', 'error');
      }
    } else {
      fileSelector.style.display = 'none';
      (selectFilesBtn as HTMLElement).style.borderColor = '#3c3c3c';
      (selectFilesBtn as HTMLElement).style.color = '#888';
    }
  });
  
  // Update file count label
  const updateFileCountLabel = () => {
    const total = allChangedFiles.length;
    const selected = selectedFiles.size;
    if (selected === 0) {
      fileCountLabel.textContent = 'None';
      fileCountLabel.style.color = '#f44336';
    } else if (selected === total) {
      fileCountLabel.textContent = 'All Files';
      fileCountLabel.style.color = '#888';
    } else {
      fileCountLabel.textContent = `${selected}/${total} Files`;
      fileCountLabel.style.color = '#a78bfa';
    }
  };
  
  // Select all files
  selectAllBtn?.addEventListener('click', () => {
    allChangedFiles.forEach(f => selectedFiles.add(f.path));
    fileList.querySelectorAll('.ai-file-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = true;
    });
    updateFileCountLabel();
  });
  
  // Select no files
  selectNoneBtn?.addEventListener('click', () => {
    selectedFiles.clear();
    fileList.querySelectorAll('.ai-file-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });
    updateFileCountLabel();
  });
  
  // Hover effects for select files button
  selectFilesBtn?.addEventListener('mouseenter', () => {
    if (fileSelector.style.display === 'none') {
      (selectFilesBtn as HTMLElement).style.background = '#2d2d2d';
      (selectFilesBtn as HTMLElement).style.color = '#b0b0b0';
    }
  });
  selectFilesBtn?.addEventListener('mouseleave', () => {
    if (fileSelector.style.display === 'none') {
      (selectFilesBtn as HTMLElement).style.background = 'transparent';
      (selectFilesBtn as HTMLElement).style.color = '#888';
    }
  });
  
  // Stage all button
  const stageAllBtn = statusContainer.querySelector('#git-stage-all');
  stageAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await invoke('git_add_all', { path: projectPath });
      showGitToast('All changes staged', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Stage all failed: ${error}`, 'error');
    }
  });
  
  // Unstage all button
  const unstageAllBtn = statusContainer.querySelector('#git-unstage-all');
  unstageAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await invoke('git_unstage', { path: projectPath, files: [] }); // Empty = all
      showGitToast('All changes unstaged', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Unstage all failed: ${error}`, 'error');
    }
  });
  
  // Discard all button
  const discardAllBtn = statusContainer.querySelector('#git-discard-all');
  discardAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Discard ALL changes? This cannot be undone!')) return;
    try {
      await invoke('git_discard', { path: projectPath, files: [] }); // Empty = all
      showGitToast('All changes discarded', 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Discard failed: ${error}`, 'error');
    }
  });
  
  // Individual stage buttons
  statusContainer.querySelectorAll('.git-stage-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filePath = (btn as HTMLElement).dataset.path;
      try {
        await invoke('git_add', { path: projectPath, files: [filePath] });
        loadGitTabStatus();
      } catch (error) {
        showGitToast(`Stage failed: ${error}`, 'error');
      }
    });
  });
  
  // Unstage buttons
  statusContainer.querySelectorAll('.git-unstage-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filePath = (btn as HTMLElement).dataset.path;
      try {
        await invoke('git_unstage', { path: projectPath, files: [filePath] });
        loadGitTabStatus();
      } catch (error) {
        showGitToast(`Unstage failed: ${error}`, 'error');
      }
    });
  });
  
  // Discard buttons
  statusContainer.querySelectorAll('.git-discard-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filePath = (btn as HTMLElement).dataset.path;
      const fileName = filePath?.split(/[/\\]/).pop();
      if (!confirm(`Discard changes to "${fileName}"?`)) return;
      
      try {
        await invoke('git_discard', { path: projectPath, files: [filePath] });
        showGitToast('Changes discarded', 'success');
        loadGitTabStatus();
      } catch (error) {
        showGitToast(`Discard failed: ${error}`, 'error');
      }
    });
  });
  
  // File selection checkboxes for commit
  const commitSelectedBar = statusContainer.querySelector('#git-commit-selected-bar') as HTMLElement;
  const selectedCountSpan = statusContainer.querySelector('#git-selected-count') as HTMLElement;
  const commitSelectedBtn = statusContainer.querySelector('#git-commit-selected-btn');
  const clearSelectionBtn = statusContainer.querySelector('#git-clear-selection-btn');
  let commitSelectedFiles: Set<string> = new Set();
  
  const updateCommitSelectedUI = () => {
    const count = commitSelectedFiles.size;
    if (count > 0) {
      commitSelectedBar.style.display = 'block';
      selectedCountSpan.textContent = count.toString();
    } else {
      commitSelectedBar.style.display = 'none';
    }
  };
  
  // Checkbox change handlers
  statusContainer.querySelectorAll('.git-commit-file-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const cb = e.target as HTMLInputElement;
      const filePath = cb.dataset.path!;
      if (cb.checked) {
        commitSelectedFiles.add(filePath);
      } else {
        commitSelectedFiles.delete(filePath);
      }
      updateCommitSelectedUI();
    });
    
    // Prevent checkbox click from triggering file item click
    checkbox.addEventListener('click', (e) => e.stopPropagation());
  });
  
  // Commit Selected button
  commitSelectedBtn?.addEventListener('click', async () => {
    if (commitSelectedFiles.size === 0) {
      showGitToast('No files selected', 'warning');
      return;
    }
    
    const message = commitInput?.value?.trim();
    if (!message) {
      showGitToast('Enter a commit message first', 'warning');
      commitInput?.focus();
      return;
    }
    
    const filesToCommit = Array.from(commitSelectedFiles);
    const btn = commitSelectedBtn as HTMLButtonElement;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>Committing...</span>';
    btn.disabled = true;
    
    try {
      // Stage selected files first
      for (const file of filesToCommit) {
        await invoke('git_add', { path: projectPath, files: [file] });
      }
      
      // Then commit
      await invoke('git_commit', { path: projectPath, message });
      
      commitInput.value = '';
      commitSelectedFiles.clear();
      updateCommitSelectedUI();
      
      showGitToast(`? Committed ${filesToCommit.length} file(s)`, 'success');
      loadGitTabStatus();
    } catch (error) {
      showGitToast(`Commit failed: ${error}`, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
  
  // Clear selection button
  clearSelectionBtn?.addEventListener('click', () => {
    commitSelectedFiles.clear();
    statusContainer.querySelectorAll('.git-commit-file-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });
    updateCommitSelectedUI();
  });
  
  // Select All files button (in header)
  const selectAllFilesBtn = statusContainer.querySelector('#git-select-all-files');
  selectAllFilesBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent section toggle
    statusContainer.querySelectorAll('.git-commit-file-checkbox').forEach(cb => {
      const checkbox = cb as HTMLInputElement;
      checkbox.checked = true;
      const filePath = checkbox.dataset.path;
      if (filePath) commitSelectedFiles.add(filePath);
    });
    updateCommitSelectedUI();
    showGitToast(`Selected ${commitSelectedFiles.size} file(s)`, 'info');
  });
  
  // Clear All files button (in header)
  const clearAllFilesBtn = statusContainer.querySelector('#git-clear-all-files');
  clearAllFilesBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent section toggle
    statusContainer.querySelectorAll('.git-commit-file-checkbox').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });
    commitSelectedFiles.clear();
    updateCommitSelectedUI();
  });
  
  // Section toggle (expand/collapse)
  statusContainer.querySelectorAll('.git-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = (header as HTMLElement).dataset.section;
      const content = statusContainer.querySelector(`.git-section-content[data-section="${section}"]`) as HTMLElement;
      const chevron = header.querySelector('.git-chevron') as HTMLElement;
      
      if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        if (chevron) {
          chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
      }
    });
  });
  
  // Initialize chevrons for expanded sections
  statusContainer.querySelectorAll('.git-section-content').forEach(content => {
    if ((content as HTMLElement).style.display !== 'none') {
      const section = (content as HTMLElement).dataset.section;
      const chevron = statusContainer.querySelector(`.git-section-header[data-section="${section}"] .git-chevron`) as HTMLElement;
      if (chevron) {
        chevron.style.transform = 'rotate(90deg)';
      }
    }
  });
  
  // File item hover effects (show buttons on hover)
  statusContainer.querySelectorAll('.git-file-item').forEach(item => {
    // Add title to show it's clickable
    (item as HTMLElement).title = 'Click to view diff';
    
    item.addEventListener('mouseenter', () => {
      (item as HTMLElement).style.background = 'rgba(240, 80, 51, 0.08)';
      (item as HTMLElement).style.borderLeft = '2px solid #f05033';
      (item as HTMLElement).style.paddingLeft = '6px';
      item.querySelectorAll('button').forEach(btn => {
        (btn as HTMLElement).style.opacity = '1';
      });
    });
    item.addEventListener('mouseleave', () => {
      (item as HTMLElement).style.background = 'transparent';
      (item as HTMLElement).style.borderLeft = '2px solid transparent';
      (item as HTMLElement).style.paddingLeft = '6px';
      item.querySelectorAll('button').forEach(btn => {
        (btn as HTMLElement).style.opacity = '0';
      });
    });
    
    // Click on file item to show diff
    item.addEventListener('click', async (e) => {
      // Don't trigger if clicking on checkbox or buttons
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'BUTTON' ||
          (e.target as HTMLElement).closest('button')) {
        return;
      }
      
      const filePath = (item as HTMLElement).dataset.path;
      const isStaged = (item as HTMLElement).dataset.staged === 'true';
      if (!filePath) return;
      
      console.log('?? [Git] Opening diff viewer for:', filePath, isStaged ? '(staged)' : '(unstaged)');
      
      // Add visual feedback
      (item as HTMLElement).style.background = 'rgba(240, 80, 51, 0.2)';
      setTimeout(() => {
        (item as HTMLElement).style.background = 'transparent';
      }, 200);
      
      try {
        // Use the existing showDiffViewer function
        const showDiffViewer = (window as any).showDiffViewer;
        if (showDiffViewer) {
          await showDiffViewer(filePath, isStaged);
        } else {
          // Fallback: Show diff in a modal
          await showGitFileDiff(projectPath, filePath, isStaged);
        }
      } catch (error) {
        console.error('Failed to show diff:', error);
        showGitToast(`Failed to show diff: ${error}`, 'error');
      }
    });
  });
  
  // Button hover effects for section buttons
  statusContainer.querySelectorAll('#git-stage-all, #git-unstage-all, #git-discard-all, #git-view-log').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      (btn as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
      (btn as HTMLElement).style.color = '#ccc';
    });
    btn.addEventListener('mouseleave', () => {
      (btn as HTMLElement).style.background = 'transparent';
      (btn as HTMLElement).style.color = '#888';
    });
  });
  
  // Hover effects for Select All / Clear All buttons
  statusContainer.querySelector('#git-select-all-files')?.addEventListener('mouseenter', (e) => {
    (e.target as HTMLElement).style.background = 'rgba(79, 195, 247, 0.2)';
    (e.target as HTMLElement).style.color = '#4fc3f7';
  });
  statusContainer.querySelector('#git-select-all-files')?.addEventListener('mouseleave', (e) => {
    (e.target as HTMLElement).style.background = 'transparent';
    (e.target as HTMLElement).style.color = '#4fc3f7';
  });
  statusContainer.querySelector('#git-clear-all-files')?.addEventListener('mouseenter', (e) => {
    (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
    (e.target as HTMLElement).style.color = '#ccc';
  });
  statusContainer.querySelector('#git-clear-all-files')?.addEventListener('mouseleave', (e) => {
    (e.target as HTMLElement).style.background = 'transparent';
    (e.target as HTMLElement).style.color = '#888';
  });
}

// Show file diff in a modal dialog
async function showGitFileDiff(projectPath: string, filePath: string, staged: boolean = false): Promise<void> {
  // Remove existing diff modal if any
  document.getElementById('git-diff-modal')?.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'git-diff-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: gitDiffFadeIn 0.2s ease;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    width: 90%;
    max-width: 1000px;
    height: 80%;
    max-height: 700px;
    background: #1e1e1e;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 64px rgba(0,0,0,0.5);
    animation: gitDiffSlideIn 0.25s ease;
  `;
  
  // Get file name
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #252526;
    border-bottom: 1px solid #3c3c3c;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="#f05033">
        <path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.57 5.953v4.27a1.223 1.223 0 11-1.008-.036V5.88a1.223 1.223 0 01-.664-1.607L5.09 2.465.302 7.253a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.03 1.03 0 000-1.457z"/>
      </svg>
      <span style="color: #e0e0e0; font-size: 14px; font-weight: 500;">${fileName}</span>
      <span style="background: ${staged ? '#2ea043' : '#d19a66'}; color: ${staged ? 'white' : '#1e1e1e'}; font-size: 10px; padding: 2px 6px; border-radius: 3px;">${staged ? 'Staged' : 'Modified'}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="git-diff-ai-review" style="display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); border: none; border-radius: 4px; color: white; font-size: 11px; cursor: pointer; transition: all 0.15s;" title="AI Review - Analyze changes">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
        </svg>
        AI Review
      </button>
      <button id="git-diff-close" style="background: transparent; border: none; color: #888; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 18px; line-height: 1; transition: all 0.15s;" onmouseenter="this.style.background='#3c3c3c';this.style.color='#fff'" onmouseleave="this.style.background='transparent';this.style.color='#888'">?</button>
    </div>
  `;
  
  // AI Review Panel (initially hidden)
  const aiReviewPanel = document.createElement('div');
  aiReviewPanel.id = 'git-diff-ai-panel';
  aiReviewPanel.style.cssText = `
    display: none;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    border-bottom: 1px solid #3c3c3c;
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  // Content area with loading
  const content = document.createElement('div');
  content.id = 'git-diff-content';
  content.style.cssText = `
    flex: 1;
    overflow: auto;
    padding: 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
  `;
  content.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">
      <div style="text-align: center;">
        <div style="width: 40px; height: 40px; border: 3px solid #333; border-top-color: #f05033; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px;"></div>
        <div>Loading diff...</div>
      </div>
    </div>
  `;
  
  dialog.appendChild(header);
  dialog.appendChild(aiReviewPanel);
  dialog.appendChild(content);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Add styles
  if (!document.getElementById('git-diff-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'git-diff-modal-styles';
    style.textContent = `
      @keyframes gitDiffFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes gitDiffSlideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .diff-line { padding: 0 12px; white-space: pre-wrap; word-break: break-all; }
      .diff-line-add { background: rgba(46, 160, 67, 0.2); color: #98c379; }
      .diff-line-del { background: rgba(248, 81, 73, 0.2); color: #e06c75; }
      .diff-line-info { background: rgba(79, 195, 247, 0.1); color: #4fc3f7; }
      .diff-line-num { display: inline-block; width: 50px; color: #666; text-align: right; padding-right: 12px; margin-right: 8px; border-right: 1px solid #333; user-select: none; }
    `;
    document.head.appendChild(style);
  }
  
  // Close handlers
  const closeModal = () => {
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.15s';
    setTimeout(() => modal.remove(), 150);
  };
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  header.querySelector('#git-diff-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
  
  // Load diff content
  try {
    // Try the specified staged/unstaged first
    let diff = await invoke('git_diff', { path: projectPath, file: filePath, staged: staged }) as string;
    
    if (!diff || diff.trim() === '') {
      // Try the opposite (staged/unstaged)
      diff = await invoke('git_diff', { path: projectPath, file: filePath, staged: !staged }) as string;
    }
    
    if (!diff || diff.trim() === '') {
      content.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888;">
          <div style="text-align: center;">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="#444" style="margin-bottom: 12px;">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13A6 6 0 118 2a6 6 0 010 12zm.5-9v4.5H10a.5.5 0 010 1H8a.5.5 0 01-.5-.5V5a.5.5 0 011 0z"/>
            </svg>
            <div>No diff available</div>
            <div style="font-size: 11px; margin-top: 8px; color: #666;">This file may be binary, new, or have no changes.</div>
          </div>
        </div>
      `;
      return;
    }
    
    renderDiff(diff, content);
  } catch (error) {
    content.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f14c4c;">
        <div style="text-align: center;">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="margin-bottom: 12px;">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5a1 1 0 112 0v3a1 1 0 11-2 0V5zm1 7a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
          <div>Failed to load diff</div>
          <div style="font-size: 11px; margin-top: 8px; color: #888;">${error}</div>
        </div>
      </div>
    `;
  }
}

// Render diff content with syntax highlighting
function renderDiff(diff: string, container: HTMLElement): void {
  const lines = diff.split('\n');
  let html = '<div style="padding: 8px 0;">';
  let lineNumOld = 0;
  let lineNumNew = 0;
  
  lines.forEach((line, index) => {
    let className = 'diff-line';
    let prefix = ' ';
    let lineNumDisplay = '';
    
    if (line.startsWith('@@')) {
      // Parse line numbers from @@ -X,Y +A,B @@
      const match = line.match(/@@ -(\d+)/);
      if (match) {
        lineNumOld = parseInt(match[1]) - 1;
        lineNumNew = parseInt(match[1]) - 1;
      }
      className += ' diff-line-info';
      lineNumDisplay = '...';
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      className += ' diff-line-add';
      prefix = '+';
      lineNumNew++;
      lineNumDisplay = String(lineNumNew);
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      className += ' diff-line-del';
      prefix = '-';
      lineNumOld++;
      lineNumDisplay = String(lineNumOld);
    } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      className += ' diff-line-info';
      lineNumDisplay = '';
    } else {
      lineNumOld++;
      lineNumNew++;
      lineNumDisplay = String(lineNumNew);
    }
    
    // Escape HTML
    const escapedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    html += `<div class="${className}"><span class="diff-line-num">${lineNumDisplay}</span>${escapedLine}</div>`;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function getGitStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'modified': '#d19a66',
    'added': '#98c379',
    'deleted': '#e06c75',
    'untracked': '#61afef',
    'renamed': '#c678dd'
  };
  return colors[status] || '#888';
}

function getGitStatusLetter(status: string): string {
  const letters: Record<string, string> = {
    'modified': 'M',
    'added': 'A',
    'deleted': 'D',
    'untracked': 'U',
    'renamed': 'R'
  };
  return letters[status] || '?';
}

function showGitToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
  const colors: Record<string, string> = {
    success: '#4ec9b0',
    error: '#f14c4c',
    warning: '#cca700',
    info: '#4fc3f7'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 60px;
    right: 20px;
    padding: 10px 16px;
    background: #252526;
    border-left: 3px solid ${colors[type]};
    color: #ccc;
    font-size: 13px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    z-index: 10001;
    animation: gitToastSlide 0.2s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Add animation keyframes if not exists
  if (!document.getElementById('git-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'git-toast-styles';
    style.textContent = `
      @keyframes gitToastSlide {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

// ============================================================================
// INITIALIZE GIT TAB
// ============================================================================
// Call this after DOM is ready (use setTimeout for safety)
setTimeout(addGitTabToExplorer, 1500);

// ============================================================================
// GIT STATUS BAR INDICATOR (Optional but nice!)
// ============================================================================
async function updateGitStatusBar(): Promise<void> {
  const statusBar = document.querySelector('.status-bar-left') || 
                    document.querySelector('.status-bar') ||
                    document.querySelector('#status-bar');
  
  if (!statusBar) return;
  
  // Create or get indicator
  let gitIndicator = document.getElementById('git-status-indicator');
  if (!gitIndicator) {
    gitIndicator = document.createElement('div');
    gitIndicator.id = 'git-status-indicator';
    gitIndicator.style.cssText = `
      display: none;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      height: 100%;
      cursor: pointer;
      color: #cccccc;
      font-size: 12px;
      transition: all 0.2s;
    `;
    gitIndicator.onmouseenter = () => {
      gitIndicator!.style.background = 'rgba(255,255,255,0.1)';
    };
    gitIndicator.onmouseleave = () => {
      gitIndicator!.style.background = 'transparent';
    };
    gitIndicator.onclick = () => {
      const path = (window as any).currentProjectPath || 
                   localStorage.getItem('ide_last_project_path') || '';
      if (path) gitUIEnhanced.show(path);
    };
    
    // Insert at the beginning of status bar
    statusBar.insertBefore(gitIndicator, statusBar.firstChild);
  }
  
  // Update content
  try {
    const projectPath = (window as any).currentProjectPath || 
                        (window as any).currentFolderPath ||
                        localStorage.getItem('ide_last_project_path') || '';
    
    if (!projectPath) {
      gitIndicator.style.display = 'none';
      return;
    }
    
    const isGitRepo = await gitManager.isGitRepository(projectPath);
    
    if (isGitRepo) {
      await gitManager.open(projectPath);
      const status = await gitManager.getStatus();
      const branch = status.branch || 'main';
      const changesCount = status.files.length;
      const syncStatus = (status.ahead > 0 || status.behind > 0) 
        ? ` ?${status.ahead} ?${status.behind}` 
        : '';
      
      gitIndicator.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="18" r="3"/>
          <circle cx="6" cy="6" r="3"/>
          <path d="M6 21V9a9 9 0 0 0 9 9"/>
        </svg>
        <span>${branch}</span>
        ${changesCount > 0 ? `<span style="color: #dcdcaa; margin-left: 4px;">${changesCount}*</span>` : ''}
        ${syncStatus ? `<span style="color: #808080; font-size: 10px;">${syncStatus}</span>` : ''}
      `;
      gitIndicator.title = `Branch: ${branch}\nChanges: ${changesCount}\nAhead: ${status.ahead}, Behind: ${status.behind}\n\nClick to open Source Control`;
      gitIndicator.style.display = 'flex';
    } else {
      gitIndicator.style.display = 'none';
    }
  } catch {
    gitIndicator.style.display = 'none';
  }
}
// ============================================================================
// PREVIEW TAB SYSTEM
// ============================================================================
function initializePreviewTab(): void {
  console.log('?? Initializing Preview Tab system...');
  
  try {
    setupPreviewAutoDetection();
    
    // Ctrl+Shift+P shortcut
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const lastUrl = (window as any).__lastServerUrl || 'http://localhost:3000';
        openPreviewTab(lastUrl);
      }
    });
    
    // Auto-open on server start
    window.addEventListener('server-url-detected', ((e: CustomEvent) => {
      const url = e.detail?.url;
      if (url) {
        (window as any).__lastServerUrl = url;
        setTimeout(() => openPreviewTab(url), 500);
      }
    }) as EventListener);
    
    (window as any).previewTab = { open: openPreviewTab, instance: previewTab };
    console.log('? Preview Tab initialized (Ctrl+Shift+P)');
  } catch (error) {
    console.error('? Preview Tab init failed:', error);
  }
}
// === AUTO MODE ICON SYSTEM v2 ===
(window as any).forceAutoModeIcons = function() {
  const mode = localStorage.getItem('ideScriptMode') || 'auto';
  if (mode === 'auto') {
    localStorage.setItem('aiFileExplorerEnabled', 'true');
    (window as any).aiFileExplorerEnabled = true;
    (window as any).aiSearchEnabled = true;
    if ((window as any).aiFileExplorer) (window as any).aiFileExplorer.isEnabled = function() { return localStorage.getItem('aiFileExplorerEnabled') === 'true'; };
    const searchBtn = document.getElementById('ai-search-btn');
    if (searchBtn) { searchBtn.classList.add('active'); searchBtn.style.color = '#4fc3f7'; searchBtn.style.textShadow = '0 0 8px rgba(79,195,247,0.6)'; }
    const searchToggle = document.getElementById('ai-search-toggle');
    if (searchToggle) searchToggle.classList.add('active');

    // === AUTO MODE: Enable the actual engine (not just visuals) ===
    localStorage.setItem('autonomousModeEnabled', 'true');

    // === AUTO-UPDATE RECENT FOLDERS ON PROJECT OPEN ===
    console.log('[RecentFolders] Listener registered');
    document.addEventListener('project-opened', (e: any) => {
      const pp = e.detail?.path || e.detail?.projectPath;
      if (!pp || typeof pp !== 'string') return;
      try {
        // Use PathManager via window.fileSystem (module-scoped, not global)
        const pm = (window as any).fileSystem?.PathManager;
        if (pm && pm.updateLastFolder) {
          pm.updateLastFolder(pp, 'project');
          console.log('[RecentFolders] Updated via PathManager:', pp);
        } else {
          // Fallback to localStorage
          const key = 'ai_ide_path_memory';
          const raw = localStorage.getItem(key);
          const mem = raw ? JSON.parse(raw) : {};
          if (!mem.recentFolders) mem.recentFolders = [];
          mem.recentFolders = mem.recentFolders.filter((f: string) => f !== pp);
          mem.recentFolders.unshift(pp);
          mem.recentFolders = mem.recentFolders.slice(0, 4);
          mem.lastProject = pp;
          localStorage.setItem(key, JSON.stringify(mem));
          console.log('[RecentFolders] Updated via localStorage:', pp);
        }
      } catch(err) { console.warn('[RecentFolders] Error:', err); }
    });
    localStorage.setItem('autonomousMode', 'true');
    try {
      if ((window as any).setAutoApply) {
        (window as any).setAutoApply(true);
      } else if ((window as any).setAutoApplyState) {
        (window as any).setAutoApplyState(true);
      } else if ((window as any).toggleAutoApply) {
        const alreadyOn = (window as any).isAutoApplyEnabled?.() || (window as any).getAutoApplyState?.() || false;
        if (!alreadyOn) (window as any).toggleAutoApply();
      }
      window.dispatchEvent(new CustomEvent('autoModeToggled', { detail: { enabled: true }}));
    } catch (e) { console.warn('[forceAutoMode] Auto Apply enable error:', e); }

    // === Update button visuals ===
    const autoBtn = document.querySelector('.autonomous-mode-toggle') as HTMLElement;
    if (autoBtn) { autoBtn.classList.add('active'); autoBtn.style.color = '#4fc3f7'; autoBtn.style.textShadow = '0 0 8px rgba(79,195,247,0.6)'; }
    const autoToggleBtn = document.getElementById('autonomous-mode-toggle');
    if (autoToggleBtn) { autoToggleBtn.classList.add('active', 'auto-active'); (autoToggleBtn as HTMLElement).style.color = '#10b981'; }
    document.querySelectorAll('.aca-auto-toggle').forEach(b => { b.classList.add('active'); });
    document.querySelectorAll('.ide-script-mode-btn').forEach(b => { (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.mode === 'auto'); });
    if ((window as any).syncAutoModeButton) (window as any).syncAutoModeButton();
    // === TERMINAL CONTEXT: OFF by default ===
    try {
      const tc2 = (window as any).terminalContext;
      if (tc2 && tc2.isEnabled?.()) {
        tc2.toggle(false);
        
      }
    } catch(e) { /* ignore */ }
    console.log('AUTO MODE: Project Search + Auto Apply BOTH forced ON');
  } else { console.log('CLASSIC MODE: Icons freely toggleable'); }
};
(window as any).guardAutoModeToggle = function(buttonName: string): boolean {
  const mode = localStorage.getItem('ideScriptMode') || 'auto';
  if (mode === 'auto') { console.log('LOCKED: ' + buttonName + ' locked ON in Auto Mode.'); return false; }
  return true;
};

// === AUTO_MODE_LOCK_GUARD === (v2 - Added by auto_mode_lock_guard.ps1)
// Locks Auto + Project Search + Auto Apply + Surgical ON in Auto mode.
// Capture-phase click interception - fires BEFORE any button handler.
(function initAutoModeLockGuard() {
  // --- Inject lock CSS ---
  if (!document.getElementById("auto-mode-lock-style")) {
    const lockStyle = document.createElement("style");
    lockStyle.id = "auto-mode-lock-style";
    lockStyle.textContent = [
      ".auto-mode-locked {",
      "  opacity: 0.7 !important;",
      "  cursor: not-allowed !important;",
      "}",
      ".auto-mode-locked:hover {",
      "  opacity: 0.7 !important;",
      "}",
      ".auto-lock-toast {",
      "  position: fixed;",
      "  bottom: 32px;",
      "  left: 50%;",
      "  transform: translateX(-50%);",
      "  background: rgba(30, 30, 30, 0.95);",
      "  border: 1px solid rgba(79, 195, 247, 0.4);",
      "  color: #4fc3f7;",
      "  padding: 6px 16px;",
      "  border-radius: 6px;",
      "  font-size: 12px;",
      "  font-family: system-ui, sans-serif;",
      "  z-index: 99999;",
      "  pointer-events: none;",
      "  animation: autoLockFadeIn 0.2s ease-out;",
      "}",
      "@keyframes autoLockFadeIn {",
      "  from { opacity: 0; transform: translateX(-50%) translateY(8px); }",
      "  to   { opacity: 1; transform: translateX(-50%) translateY(0); }",
      "}"
    ].join("\n");
    document.head.appendChild(lockStyle);
  }

  // --- Toast ---
  function showLockToast(label: string): void {
    const existing = document.querySelector(".auto-lock-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "auto-lock-toast";
    toast.textContent = "\uD83D\uDD12 " + label + " is locked in Auto Mode";
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2000);
  }

  // --- Helper: is element the Surgical badge in status bar? ---
  function isSurgicalElement(el: HTMLElement): boolean {
    // Walk up to 3 levels checking for "surgical" in id/class/text
    let node: HTMLElement | null = el;
    for (let depth = 0; depth < 4 && node; depth++) {
      const id = (node.id || "").toLowerCase();
      const cls = (node.className && typeof node.className === "string") ? node.className.toLowerCase() : "";
      if (id.includes("surgical") || cls.includes("surgical")) return true;
      // Check text content only for small elements (badges, not entire page)
      if (node.children.length < 10) {
        const text = (node.textContent || "").trim().toLowerCase();
        if (text.includes("surgical") && text.length < 100) return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  // --- Capture-phase click interceptor ---
  document.addEventListener("click", function autoModeLockHandler(e: MouseEvent) {
    const mode = localStorage.getItem("ideScriptMode") || "auto";
    if (mode !== "auto") return;

    const target = e.target as HTMLElement;
    if (!target) return;

    // Guard 1: IDE Script Mode Buttons (Classic / Auto / Surgical)
    const modeBtn = target.closest(".ide-script-mode-btn") as HTMLElement;
    if (modeBtn) {
      const btnMode = modeBtn.dataset?.mode || modeBtn.getAttribute("data-mode") || "";
      if (btnMode === "auto") {
        e.stopImmediatePropagation();
        e.preventDefault();
        showLockToast("Auto Mode");
        return;
      }
      // Classic / Surgical mode buttons = allowed (switches mode)
      return;
    }

    // Guard 2: Autonomous Mode Toggle
    const autoToggle = target.closest("#autonomous-mode-toggle, .autonomous-mode-toggle, .aca-auto-toggle") as HTMLElement;
    if (autoToggle) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showLockToast("Auto Apply");
      return;
    }

    // Guard 3: AI Project Search Toggle
    const searchSel = "#ai-search-btn, #ai-search-toggle, [data-ai-search-toggle], .ai-search-toggle, #ai-search-status-toggle, #ai-file-explorer-toggle";
    const searchToggle = target.closest(searchSel) as HTMLElement;
    if (searchToggle) {
      const isOn = localStorage.getItem("aiFileExplorerEnabled") === "true";
      if (isOn) {
        e.stopImmediatePropagation();
        e.preventDefault();
        showLockToast("Project Search");
        return;
      }

    // Guard 5: Terminal Context Toggle (user can freely toggle)
    // No longer locked - terminal context is OFF by default
    }

    // Guard 4: Surgical Edit Engine badge (block ALL clicks in Auto mode)
    if (isSurgicalElement(target)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showLockToast("Surgical Edit Engine");
      return;
    }
  }, true); // capture phase

  // --- Guard surgicalBridge.setEnabled(false) API call ---
  function guardSurgicalBridge(): void {
    const bridge = (window as any).surgicalBridge;
    if (!bridge || bridge.__autoModeLockPatched) return;
    const origSetEnabled = bridge.setEnabled;
    if (typeof origSetEnabled === "function") {
      bridge.setEnabled = function(enabled: boolean) {
        const mode = localStorage.getItem("ideScriptMode") || "auto";
        if (mode === "auto" && !enabled) {
          console.log("\uD83D\uDD12 [Lock Guard] Blocked surgicalBridge.setEnabled(false)");
          return;
        }
        return origSetEnabled.call(bridge, enabled);
      };
      bridge.__autoModeLockPatched = true;
      console.log("\uD83D\uDD12 [Lock Guard] surgicalBridge.setEnabled() guarded");
    }
  }
  guardSurgicalBridge();
  setTimeout(guardSurgicalBridge, 2000);
  setTimeout(guardSurgicalBridge, 5000);

  // --- Visual lock indicators ---
  function applyLockVisuals(): void {
    const mode = localStorage.getItem("ideScriptMode") || "auto";
    const isAuto = mode === "auto";

    // Auto mode button
    document.querySelectorAll(".ide-script-mode-btn").forEach(function(btn) {
      const bMode = (btn as HTMLElement).dataset?.mode || btn.getAttribute("data-mode") || "";
      if (bMode === "auto") {
        btn.classList.toggle("auto-mode-locked", isAuto);
        (btn as HTMLElement).title = isAuto ? "\uD83D\uDD12 Auto Mode: ON (locked)" : "Switch to Auto Mode";
      }
    });

    // Autonomous toggle
    document.querySelectorAll("#autonomous-mode-toggle, .autonomous-mode-toggle").forEach(function(btn) {
      btn.classList.toggle("auto-mode-locked", isAuto);
    });

    // Project Search toggle
    document.querySelectorAll("#ai-search-btn, #ai-search-toggle, [data-ai-search-toggle]").forEach(function(btn) {
      const isOn = localStorage.getItem("aiFileExplorerEnabled") === "true";
      btn.classList.toggle("auto-mode-locked", isAuto && isOn);
    });

    // Surgical badge
    document.querySelectorAll("[id*=surgical], [class*=surgical]").forEach(function(el) {
      el.classList.toggle("auto-mode-locked", isAuto);
    });
  }

  window.addEventListener("ide-script-mode-changed", function() { setTimeout(applyLockVisuals, 100); });
  setInterval(applyLockVisuals, 10000); // X02-lagfix: slowed from 3s
  setTimeout(applyLockVisuals, 2000);


  // === Auto Mode Watchdog: Re-enforce ALL toggles every 3s ===
  setInterval(function autoModeWatchdog() {
    const mode = localStorage.getItem("ideScriptMode") || "auto";
    if (mode !== "auto") return;

    // 1. Project Search: keep localStorage + window state ON
    if (localStorage.getItem("aiFileExplorerEnabled") !== "true") {
      localStorage.setItem("aiFileExplorerEnabled", "true");
      console.log("[Watchdog] Re-enforced Project Search ON");
    }
    (window as any).aiFileExplorerEnabled = true;
    (window as any).aiSearchEnabled = true;
    if ((window as any).aiFileExplorer) {
      const afe = (window as any).aiFileExplorer;
      if (typeof afe.isEnabled === "function" && !afe.isEnabled()) {
        afe.isEnabled = function() { return localStorage.getItem("aiFileExplorerEnabled") === "true"; };
      }
    }

    // 2. Terminal Context: keep enabled
    try {
      const tc = (window as any).terminalContext;
      // Terminal context no longer forced ON by watchdog
        // tc.toggle(true);
    } catch(e) { /* ignore */ }

    // 3. Auto Apply: keep enabled
    if (localStorage.getItem("autonomousModeEnabled") !== "true") {
      localStorage.setItem("autonomousModeEnabled", "true");
    }
    if (localStorage.getItem("autonomousMode") !== "true") {
      localStorage.setItem("autonomousMode", "true");
    }
  }, 3000);

  console.log("\uD83D\uDD12 [Auto Mode Lock Guard v2] Active");
})();
// === END AUTO_MODE_LOCK_GUARD ===

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================
async function init(): Promise<void> {
  // Show startup dialog
  setTimeout(() => showStartupDialog(), 1500);
  try {
    console.log('Application initialization started');
    // === FORCE AUTO MODE ON EVERY STARTUP ===
    localStorage.setItem('ideScriptMode', 'auto');
    localStorage.setItem('aiFileExplorerEnabled', 'true');
    localStorage.setItem('autonomousModeEnabled', 'true');
    localStorage.setItem('autonomousMode', 'true');
    // Prevent duplicate initialization on hot reload
    if (isInitialized) {
      console.log('?? Already initialized, cleaning up duplicates only...');
      cleanupDuplicates();
  return;
}
    aiFileCreatorUI.initialize();
console.log('? AI File Creator initialized');

initializePreviewTab();  // ? ADD THIS LINE

  // [X02 Prod Fix] Ensure terminal tab opens on startup using MutationObserver
  // Works in both dev and production � watches DOM until terminal tab appears
  // [X02 Prod Fix] Ensure terminal tab opens AFTER layout init
  setTimeout(function ensureTerminalTabOpen() {
    const tryClick = () => {
      const t = document.querySelector('[data-tab="terminal"]') as HTMLElement;
      if (t && !t.classList.contains('active')) { t.click(); return true; }
      if (t && t.classList.contains('active')) return true;
      return false;
    };
    if (tryClick()) return;
    const obs = new MutationObserver(() => {
      if (tryClick()) { obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
  }, 2000);  // 2s delay � waits for layout system to finish
  // [X02 Prod Fix] Retry terminal poller after 3s for production builds
  setTimeout(() => startX02TerminalPoller(), 3000);
  setTimeout(() => startX02TerminalPoller(), 6000);

// // initializeProjectFolderContextMenu(); // REMOVED: duplicate call // REMOVED: duplicate
    // Clean up any existing duplicates before initialization
    cleanupDuplicates();

    
    tauriInitialized = isTauriAvailable();
    console.log(`Tauri status: ${tauriInitialized ? 'Available' : 'Not available'}`);
    
    if (!tauriInitialized) {
      showNotification('Warning: Tauri not available - limited functionality', 'error');
    }
    
    const sysInfo = await initializeSystemInfo();
    
    initDomElements();
    initializeProjectCreation();
     await initializeFileExplorer();  
    initializeLayout();
  // [X02 v7] Start terminal tab poller immediately after layout init
  setTimeout(function() {
    if (typeof (window as any).startX02TerminalPoller === 'function') {
      (window as any).startX02TerminalPoller();
    } else if (typeof startX02TerminalPoller !== 'undefined') {
      startX02TerminalPoller();
    }
  }, 0);
    initializeUnifiedStatusBar();
    initializeArduino();
    initializeAndroid();

    // [JETSON] Phase 2: SSH Remote Deployment
    try {
      await initializeJetsonRemote();
      console.log('[GPU] Jetson Phase 2 initialized');
      initJetsonTabBridge();  // GPU widget click + Run menu
      updateGpuButtonState(); // Set initial grey/green state

      // Auto-enable GPU button for NVIDIA sample projects (no .cu files but still GPU)
      const _nvidiaSampleFolders = ['cuda-hello-world','cuda-tensorrt','cuda-multi-gpu',
        'object-detection','cuda-image-processing','pose-estimation',
        'cuda-particles','jetson-camera-pipeline'];
      document.addEventListener('project-opened', (e: any) => {
        const p: string = e?.detail?.path || '';
        const folderName = p.split(/[\\/]/).pop() || '';
        if (_nvidiaSampleFolders.some(f => folderName === f) || (window as any).__forceJetsonGpu) {
          setTimeout(() => updateGpuButtonState(true), 200);
          (window as any).__forceJetsonGpu = false;
        }
      });
      // Mount status bar widget next to Phase 1 GPU widget
      const statusBarRight = document.querySelector('.status-bar-right') as HTMLElement
        || document.querySelector('.status-bar') as HTMLElement;
      if (statusBarRight) mountStatusBarWidget(statusBarRight);
    } catch (e) {
      console.warn('[GPU] Jetson Phase 2 init skipped:', e);
    }

    // Initialize code block styling (compact mode + syntax highlighting)
    try {
      await initMessageUIFix();
      console.log('? Message UI Fix initialized');
    } catch (e) {
      console.warn('?? Message UI Fix skipped:', e);
    }
    
    initChatPanelResizer();
    initPerformanceOptimizations();
    initChatFileDrop();
   // initializePdfHandler();
   // initializePdfHandler();//  initializeAITerminalIntegration();
    await initializeSVN();      // Initialize base system first
    await setupEnhancedSVN();   // Add enhanced UI on top
    await initializeGit();
    setupGitKeyboardShortcuts();
    setTimeout(addGitTabToExplorer, 2000);
    
    // Update Git status bar periodically
    setTimeout(updateGitStatusBar, 3000);   // Initial update
    setInterval(updateGitStatusBar, 30000); // Every 30 seconds
    aiFileCreatorUI.initialize();
    console.log('? AI File Creator initialized');
    initializeProjectFolderContextMenu();
    //setupGitMenu();
    registerGitMenuHandlers();
    initGitMenuFix();
    initAICommitMessage();
    // // initFastContextMenu(); // DISABLED: was overriding correct context menu // DISABLED: was overriding correct context menu
    setTimeout(() => setupGitMenu(), 500);
     // ? DISABLED: Using messageUI.ts collapse system instead (prevents duplicate buttons)
     // initMessageCollapse();
     initAutonomousCoding();
     initFastApply();
     setSpeedMode('turbo');
     // === AUTO ON: Force Project Search + Auto Mode ON after init ===
     setTimeout(() => {
       localStorage.setItem('ideScriptMode', 'auto');
       localStorage.setItem('aiFileExplorerEnabled', 'true');
       localStorage.setItem('autonomousModeEnabled', 'true');
       localStorage.setItem('autonomousMode', 'true');
       (window as any).aiFileExplorerEnabled = true;
       (window as any).aiSearchEnabled = true;
       if ((window as any).forceAutoModeIcons) (window as any).forceAutoModeIcons();
       // === TERMINAL CONTEXT: Disabled by default ===
       try {
         const tc = (window as any).terminalContext;
         if (tc && !tc.isEnabled?.()) {
           // tc.toggle(true); // DISABLED: terminal OFF by default


         }
       } catch(e) { console.warn('[Startup] Terminal context enable error:', e); }
       console.log('[Startup] Project Search + Auto Mode forced ON');
     }, 1500);
     initializeEditorContextIntegration();
initMessageCollapse();
// ??? REMOVE: Auto Mode button from terminal header (not needed)
setTimeout(() => {
  removeAutoModeButton();
}, 1000);


// ============================================================================
// SHORTCUT HELP CARD  (patch_shortcut_help_card.ps1)
// Press ? to show / hide. Escape or backdrop click to dismiss.
// ============================================================================
function showShortcutHelpCard(): void {
  if (document.getElementById('x02-help-card')) {
    dismissShortcutHelpCard();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'x02-help-card';
  overlay.style.cssText = [
    'position:fixed','top:0','left:0','right:0','bottom:0',
    'z-index:99999','display:flex','align-items:center','justify-content:center',
    'background:rgba(0,0,0,0.6)','animation:x02FadeIn 0.15s ease'
  ].join(';');

  const nl2 = '\n';
  const card = document.createElement('div');
  card.style.cssText = [
    'background:#1e1e1e','border:1px solid #3c3c3c','border-radius:10px',
    'padding:28px 32px','max-width:720px','width:90%','max-height:85vh',
    'overflow-y:auto','box-shadow:0 20px 60px rgba(0,0,0,0.7)',
    'font-family:"Cascadia Code","Fira Code",Consolas,monospace','color:#cccccc',
    'animation:x02SlideUp 0.15s ease'
  ].join(';');

  const groups = [
    {
      title: 'AI Code Writing',
      color: '#4ec9b0',
      items: [
        ['Ctrl+Shift+I', 'Generate code at cursor from description'],
        ['Ctrl+Shift+E', 'Edit selected code with AI instruction'],
        ['Ctrl+K',       'Quick AI code generation popup'],
        ['Ctrl+Alt+A',   'AI Code Assistant Panel'],
        ['Ctrl+Shift+R', 'AI Code Review'],
        ['Ctrl+Shift+T', 'Generate Tests'],
        ['Ctrl+Shift+D', 'Generate Documentation'],
        ['Ctrl+Shift+F', 'Refactor Suggestions']
      ]
    },
    {
      title: 'Editor',
      color: '#569cd6',
      items: [
        ['Ctrl+S',       'Save file'],
        ['Ctrl+N',       'New file'],
        ['Ctrl+Shift+N', 'New folder'],
        ['F5',           'Run project'],
        ['Shift+F5',     'Stop project'],
        ['Ctrl+L',       'Clear terminal']
      ]
    },
    {
      title: 'Panels & Views',
      color: '#ce9178',
      items: [
        ['Ctrl+Shift+G', 'Toggle Git / SVN panel'],
        ['Ctrl+Shift+H', 'Git history'],
        ['Ctrl+Shift+T', 'Toggle terminal context'],
        ['Ctrl+Shift+P', 'Preview tab'],
        ['Ctrl+Shift+O', 'Multi-provider settings'],
        ['Ctrl+Shift+C', 'Calibration panel'],
        ['Ctrl+Shift+A', 'Toggle AI chat']
      ]
    },
    {
      title: 'AI Chat',
      color: '#dcdcaa',
      items: [
        ['+',            'Attach file to message'],
        ['=',            'Insert current file as context'],
        ['#provider',    'Route message to specific AI (e.g. #groq hello)'],
        ['Ctrl+Shift+F', 'Search project files (AI)'],
        ['Ctrl+Shift+[', 'Chat panel narrower'],
        ['Ctrl+Shift+]', 'Chat panel wider']
      ]
    }
  ];

  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-size:18px;font-weight:700;color:#fff;">Operator X02 - Keyboard Shortcuts</div>' +
    '<div style="font-size:12px;color:#666;cursor:pointer;" id="x02-help-close">Press ? or Esc to close</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

  for (const g of groups) {
    html += '<div><div style="font-size:11px;font-weight:700;color:' + g.color +
      ';letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:6px;">' +
      g.title + '</div><table style="width:100%;border-collapse:collapse;">';
    for (const [key, desc] of g.items) {
      html += '<tr style="line-height:1.9;">' +
        '<td style="padding-right:14px;white-space:nowrap;">' +
        '<kbd style="background:#2d2d2d;border:1px solid #555;border-radius:3px;padding:2px 7px;font-size:11px;color:#fff;font-family:inherit;">' +
        key + '</kbd></td>' +
        '<td style="font-size:12px;color:#aaa;">' + desc + '</td></tr>';
    }
    html += '</table></div>';
  }

  html += '</div><div style="margin-top:20px;text-align:center;font-size:11px;color:#444;">' +
    'Coding is Art. Feel it. Enjoy it. &nbsp;&middot;&nbsp; operatorx02.com</div>';

  card.innerHTML = html;

  if (!document.getElementById('x02-help-styles')) {
    const style = document.createElement('style');
    style.id = 'x02-help-styles';
    style.textContent = '@keyframes x02FadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes x02SlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) dismissShortcutHelpCard();
  });
  const closeBtn = overlay.querySelector('#x02-help-close') as HTMLElement;
  if (closeBtn) closeBtn.addEventListener('click', dismissShortcutHelpCard);

  console.log('[X02] Shortcut help card shown. Press Ctrl+? or Esc to close.');
}

function dismissShortcutHelpCard(): void {
  const el = document.getElementById('x02-help-card');
  if (el) el.remove();
}

// Register ? key globally (no modifier needed)
document.addEventListener('keydown', function(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName?.toLowerCase() || '';
  if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
  if (e.ctrlKey && e.shiftKey && e.key === '/') {
    e.preventDefault();
    showShortcutHelpCard();
  }
  if (e.key === 'Escape') dismissShortcutHelpCard();
});

// Also expose on window for programmatic access

// --- Status bar "Ctrl+?" hint label (added by patch_shortcut_help_card_update.ps1) ---
setTimeout(function() {
  if (document.getElementById('x02-shortcut-hint')) return;
  const statusRight = document.querySelector('.status-bar-right') as HTMLElement
    || document.querySelector('.status-bar') as HTMLElement;
  if (!statusRight) return;
  const hint = document.createElement('div');
  hint.id = 'x02-shortcut-hint';
  hint.title = 'Keyboard Shortcuts (Ctrl+?)';
  hint.style.cssText = [
    'display:inline-flex','align-items:center','gap:5px',
    'padding:0 10px','height:100%','cursor:pointer',
    'font-size:11px','color:#555',
    'border-left:1px solid #2a2a2a',
    'transition:color 0.15s','user-select:none',
    'font-family:"Cascadia Code","Fira Code",Consolas,monospace'
  ].join(';');
  hint.innerHTML =
    '<kbd style="background:#252525;border:1px solid #3a3a3a;border-radius:3px;' +
    'padding:1px 5px;font-size:10px;font-family:inherit;">Ctrl+?</kbd>' +
    '<span>Shortcuts</span>';
  hint.onmouseenter = function() { hint.style.color = '#aaa'; };
  hint.onmouseleave = function() { hint.style.color = '#555'; };
  hint.addEventListener('click', function() {
    if (typeof (window as any).showShortcutHelp === 'function') {
      (window as any).showShortcutHelp();
    }
  });
  statusRight.appendChild(hint);
  console.log('[X02] Ctrl+? hint label added to status bar.');
}, 3000);
(window as any).showShortcutHelp    = showShortcutHelpCard;
(window as any).dismissShortcutHelp = dismissShortcutHelpCard;

// Remove Auto Mode button from terminal - function definition
function removeAutoModeButton(): void {
  // Inject CSS to hide any Auto Mode buttons that might be added later
  if (!document.getElementById('hide-auto-mode-styles')) {
    const style = document.createElement('style');
    style.id = 'hide-auto-mode-styles';
    style.textContent = `
      /* Hide Auto Mode buttons in terminal */
      #autonomous-mode-toggle,
      .autonomous-mode-toggle,
      .terminal-action[title*="Auto Mode"],
      .terminal-action[title*="Auto Apply"],
      [data-action="toggle-auto-mode"],
      [data-action="auto-mode"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    console.log('?? Auto Mode button hide styles injected');
  }
  
  // Find and remove by ID
  const autoModeBtn = document.getElementById('autonomous-mode-toggle');
  if (autoModeBtn) {
    autoModeBtn.remove();
    console.log('??? Removed Auto Mode button (#autonomous-mode-toggle)');
  }
  
  // Find and remove by class
  document.querySelectorAll('.autonomous-mode-toggle').forEach(btn => {
    btn.remove();
    console.log('??? Removed Auto Mode button (.autonomous-mode-toggle)');
  });
  
  // Find by title containing "Auto Mode"
  document.querySelectorAll('.terminal-action[title*="Auto Mode"], .terminal-action[title*="Auto Apply"]').forEach(btn => {
    btn.remove();
    console.log('??? Removed Auto Mode button (by title)');
  });
  
  // Find by data attribute
  document.querySelectorAll('[data-action="toggle-auto-mode"], [data-action="auto-mode"]').forEach(btn => {
    btn.remove();
    console.log('??? Removed Auto Mode button (by data-action)');
  });
}


// ============================================================================
// TERMINAL WELCOME UI + DEFAULT TAB  (patch_terminal_welcome_ui.ps1 v7)
// ============================================================================

// --- Welcome banner (injected once terminal panel is visible) ---
function injectTerminalWelcomeUI(): void {
  if ((window as any).__terminalWelcomeDone) return;

  const selectors = ['.terminal-body','.terminal-output','.terminal-content','.xterm-rows','.term-output'];
  let out: HTMLElement | null = null;
  for (const s of selectors) { out = document.querySelector(s) as HTMLElement; if (out) break; }
  if (!out) return; // will retry via poller

  // Only inject if the terminal panel is actually visible to the user
  const panelVisible = out.offsetParent !== null || out.offsetHeight > 0 || out.offsetWidth > 0;
  if (!panelVisible) return; // panel hidden, skip for now

  if (out.querySelector('#x02-terminal-welcome')) return;
  (window as any).__terminalWelcomeDone = true;

  const now  = new Date();
  const dStr = now.toLocaleDateString('en-MY', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  const tStr = now.toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const el = document.createElement('div');
  el.id = 'x02-terminal-welcome';
  el.style.cssText = [
    'font-family:"Cascadia Code","Fira Code",Consolas,monospace',
    'font-size:13px','line-height:1.7','padding:10px 16px 8px',
    'color:#4ec94e','user-select:none',
    'border-bottom:1px solid rgba(78,201,78,0.15)','margin-bottom:4px'
  ].join(';');

  const hr  = '<span style="color:#2ea043">' + '\u2500'.repeat(42) + '</span>';
  const dot = '<span style="color:#4ec94e">  \u25b8 </span>';
  const tl  = '\u250c' + '\u2500'.repeat(46) + '\u2510';
  const bl  = '\u2514' + '\u2500'.repeat(46) + '\u2518';

  el.innerHTML = '<div style="font-family:Consolas,Monaco,\"Courier New\",monospace;font-size:11px;line-height:1.6;padding:3px 0 3px 8px;border-left:2px solid #1a5c1a"><span style="color:#4ec94e;font-weight:700;letter-spacing:.5px">&#9889; OPERATOR X02</span><br><span style="color:#2a5a2a;font-size:10px">' + new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) + '  ' + new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).toLowerCase() + '</span><br><span style="color:#1a3a1a;font-size:10px">-------------------------------</span><br><span style="color:#3a7a3a;font-size:10px">run<span style="color:#1a3a1a">...........<\/span><span style="color:#4ec94e">Ctrl+Shift+B<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">chat<span style="color:#1a3a1a">.........<\/span><span style="color:#4ec94e">Ctrl+Shift+A<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">surgical<span style="color:#1a3a1a">.....<\/span><span style="color:#4ec94e">active<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">gpu<span style="color:#1a3a1a">............<\/span><span style="color:#4ec94e">live<\/span><\/span><br><span style="color:#1a3a1a;font-size:10px">-------------------------------<\/span><br><span style="color:#2a4a2a;font-style:italic;font-size:10px">Coding is Art. Feel it. Enjoy it.<\/span><\/div>';

  out.insertBefore(el, out.firstChild);
  console.log('[X02] Terminal welcome UI injected.');
}

// --- Single tick: click terminal tab + attempt banner injection ---
function x02TerminalTick(): boolean {
  // 1. Find and click the TERMINAL tab if not already active
  const termTab = document.querySelector('[data-tab="terminal"]') as HTMLElement;
  const isActive = termTab && termTab.classList.contains('active');

  if (termTab && !isActive) {
    termTab.click();
    console.log('[X02] Tick: terminal tab clicked.');
  }

  // 2. Try injecting the welcome banner
  if (!(window as any).__terminalWelcomeDone) {
    injectTerminalWelcomeUI();
  }

  // Return true if both jobs are done
  return !!(isActive && (window as any).__terminalWelcomeDone);
}

// --- MAIN: Start polling loop immediately after initializeLayout() ---
function startX02TerminalPoller(): void {
  // Guard: prevent multiple pollers running in parallel
  if ((window as any).__x02PollerRunning) {
    console.log('[X02] Terminal poller already running, skipping.');
    return;
  }
  (window as any).__x02PollerRunning = true;

  const startTime = Date.now();
  const maxDuration = 15000; // poll for 15 seconds max (production needs more time)
  const interval   = 100;  // every 100ms

  let ticks = 0;
  const timer = setInterval(function() {
    ticks++;
    const done = x02TerminalTick();
    const elapsed = Date.now() - startTime;

    if (done || elapsed > maxDuration) {
      clearInterval(timer);
      (window as any).__x02PollerRunning = false;
      if (done) {
        console.log('[X02] Terminal poller done after ' + ticks + ' ticks (' + elapsed + 'ms).');
      } else {
        console.warn('[X02] Terminal poller timed out after ' + ticks + ' ticks. Forcing one last time.');
        const t = document.querySelector('[data-tab="terminal"]') as HTMLElement;
        if (t) t.click();
        injectTerminalWelcomeUI();
      }
    }
  }, interval);

  console.log('[X02] Terminal poller started (100ms x 50 ticks max).');
}
(window as any).injectTerminalWelcomeUI = injectTerminalWelcomeUI;
(window as any).startX02TerminalPoller  = startX02TerminalPoller;
(window as any).x02TerminalTick         = x02TerminalTick;

// === PROJECT PERSISTENCE ===
const restoreProject = async (attempt: number = 1): Promise<void> => {
  const savedPath = localStorage.getItem('ide_last_project_path');
  if (!savedPath) {
    console.log('?? [Persist] No saved project path');
    return;
  }
  
  const invoke = (window as any).__TAURI__?.core?.invoke;
  const hasUpdateFn = typeof (window as any).updateFileExplorerWithProject === 'function';
  
  console.log(`? [Persist] Attempt ${attempt}: invoke=${!!invoke}, updateFn=${hasUpdateFn}`);
  
  // Retry if dependencies not ready (max 10 attempts)
  if ((!invoke || !hasUpdateFn) && attempt < 10) {
    setTimeout(() => restoreProject(attempt + 1), 500);
    return;
  }
  
  if (!invoke) {
    console.error('? [Persist] Tauri invoke not available');
    return;
  }
  
  if (!hasUpdateFn) {
    console.error('? [Persist] updateFileExplorerWithProject not available');
    return;
  }
  
  console.log('?? [Persist] Restoring project:', savedPath);
  (window as any).__isRestoringProject = true;
  
  try {
    // ? FIX: Use recursive directory reading to get ALL children including subfolders
    // Helper function to recursively read directory
    const readDirectoryRecursive = async (dirPath: string): Promise<any[]> => {
      const items = await invoke('read_directory_detailed', { path: dirPath });
      
      // For each directory, recursively read its children
      const itemsWithChildren = await Promise.all(
        (items || []).map(async (item: any) => {
          if (item.is_directory) {
            try {
              const children = await readDirectoryRecursive(item.path);
              return { ...item, children };
            } catch (err) {
              console.warn(`?? [Persist] Could not read children of ${item.path}:`, err);
              return { ...item, children: [] };
            }
          }
          return item;
        })
      );
      
      return itemsWithChildren;
    };
    
    console.log('?? [Persist] Reading directory RECURSIVELY...');
    const files = await readDirectoryRecursive(savedPath);
    console.log(`? [Persist] Got ${files?.length || 0} files from directory (recursive)`);
    
    // Log subfolder children for verification
    files?.forEach((item: any) => {
      if (item.is_directory && item.children?.length > 0) {
        console.log(`?? [Persist] Folder "${item.name}" has ${item.children.length} children`);
      }
    });
    
    const projectName = savedPath.split(/[/\\]/).pop() || 'Project';
    
    const projectData = {
      name: projectName,
      path: savedPath,
      is_directory: true,
      children: files
    };
    
    (window as any).updateFileExplorerWithProject(projectData, savedPath);
    console.log('? [Persist] Project restored successfully!');
    
    // Also set currentFolderPath for SVN and other features
    (window as any).currentFolderPath = savedPath;
    
    // Dispatch event for other systems
    document.dispatchEvent(new CustomEvent('project-opened', {
      detail: { path: savedPath, files: projectData, restored: true }
    }));
  } catch (e) {
    console.error('? [Persist] Failed to restore:', e);
  } finally {
    setTimeout(() => { (window as any).__isRestoringProject = false; }, 2000);
  }
};

// Start restore after initial delay
setTimeout(() => restoreProject(1), 1500);

// Auto-save project path when folder is opened
document.addEventListener('project-opened', (event: any) => {
  const path = event.detail?.path;
  if (path) { (window as any).currentProjectPath = path; }
  if (path && !event.detail?.restored) {
    console.log('?? [Persist] Saved project path:', path);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    arduinoPanel.toggle();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    androidPanel.toggle();
  }
});
// Also listen for folder-opened events
document.addEventListener('folder-opened', (event: any) => {
  const path = event.detail?.path || (window as any).currentFolderPath;
  if (path) {
    localStorage.setItem('ide_last_project_path', path);
    console.log('?? [Persist] Saved folder path:', path);
  }
});

// Expose persistence API globally
(window as any).projectPersistence = {
  save: (path: string) => localStorage.setItem('ide_last_project_path', path),
  get: () => localStorage.getItem('ide_last_project_path'),
  clear: () => {
    localStorage.removeItem('ide_last_project_path');
    localStorage.removeItem('currentProjectPath');
    localStorage.removeItem('lastProjectPath');
    localStorage.removeItem('ide_last_opened_file');
    (window as any).currentFolderPath = null;
    (window as any).currentProjectPath = '';
    console.log('?? [Persist] All project data cleared');
  },
  restore: () => restoreProject(1),
  closeProject: () => {
    // Full close: clear state + UI
    (window as any).tabManager?.closeAllTabs?.();
    const tree = document.getElementById('file-tree');
    if (tree) tree.innerHTML = '';
    const header = document.getElementById('ai-project-header');
    if (header) header.remove();
    (window as any).projectPersistence.clear();
    document.dispatchEvent(new CustomEvent('project-closed'));
    console.log('? [Persist] Project closed and cleared');
  }
};

// ? Listen for project-closed from any source ? always clear persistence
document.addEventListener('project-closed', () => {
  if ((window as any).__isRestoringProject) { console.log('BLOCKED project-closed during restore'); return; }
  // ??? Guard: Don't clear during restore
  if ((window as any).__isRestoringProject) {
    console.log('??? [Event] project-closed BLOCKED during restore');
    return;
  }
  localStorage.removeItem('ide_last_project_path');
  localStorage.removeItem('currentProjectPath');
  localStorage.removeItem('lastProjectPath');
  (window as any).currentFolderPath = null;
  (window as any).currentProjectPath = '';
  console.log('?? [Event] project-closed ? persistence cleared');
});

    // Add menu button
 //   addAIFileCreatorButton();
window.addEventListener('folder-opened', async (event: any) => {
    const path = event.detail?.path || window.currentFolderPath;
    if (path) {
        console.log('?? Folder opened, activating SVN:', path);
        await window.activateSVN(path);
    }
});

/**
 * Add AI File Creator button to menu bar
 */
function addAIFileCreatorButton(): void {
  setTimeout(() => {
    const menuBar = document.querySelector('.menu-bar');
    if (!menuBar) {
      console.error('Menu bar not found');
      return;
    }
    
    // Remove existing button if any
    const existingBtn = document.getElementById('ai-file-creator-btn');
    if (existingBtn) existingBtn.remove();
    
    // Create button
    const btn = document.createElement('div');
    btn.id = 'ai-file-creator-btn';
    btn.style.cssText = `
      padding: 0 16px;
      height: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: #969696;
      font-size: 13px;
      transition: all 0.2s;
      user-select: none;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    `;
    
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="color: #667eea;">
        <path d="M8 0L10 5L15 5L11 9L13 14L8 11L3 14L5 9L1 5L6 5L8 0Z"/>
      </svg>
      <span>AI Create Files</span>
      <span style="font-size: 10px; opacity: 0.6;">Ctrl+Shift+N</span>
    `;
    
    // Hover effects
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))';
      btn.style.color = '#fff';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))';
      btn.style.color = '#969696';
    });
    
    // Click handler
    btn.addEventListener('click', () => {
      aiFileCreatorUI.show();
    });
    
    // Insert at beginning of menu bar (or after File menu)
    const firstChild = menuBar.firstChild;
    if (firstChild) {
      menuBar.insertBefore(btn, firstChild);
    } else {
      menuBar.appendChild(btn);
    }
    
    console.log('? AI File Creator button added to menu bar');
  }, 1500); // Wait for menu bar to be ready
}
// ========================================================================
// EXPLORER TOGGLE BUTTON - Add hamburger menu to toggle file explorer
// ========================================================================
setTimeout(() => {
  const menuBar = document.querySelector('.menu-bar');
  if (!menuBar) {
    console.error('Menu bar not found');
    return;
  }
  
  // Remove existing button if any
  const existingBtn = document.getElementById('explorer-toggle-btn');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Create toggle button
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'explorer-toggle-btn';
  toggleBtn.style.cssText = `
    padding: 0 12px;
    height: 30px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: #969696;
    font-size: 18px;
    transition: all 0.2s;
    user-select: none;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  `;
toggleBtn.innerHTML = '&#9776;';
  toggleBtn.title = 'Toggle Explorer (Ctrl+B)';
  
  // Hover effects
  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.background = 'rgba(255,255,255,0.1)';
    toggleBtn.style.color = '#cccccc';
  });
  
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.background = 'transparent';
    toggleBtn.style.color = '#969696';
  });
  
  // Click handler
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Explorer toggle clicked');
    
    const panel = document.querySelector('.explorer-panel') as HTMLElement;
    if (panel) {
      // Add hide style if not present
      if (!document.getElementById('explorer-hide-style')) {
        const style = document.createElement('style');
        style.id = 'explorer-hide-style';
        style.innerHTML = `
          .explorer-panel.force-hidden {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            overflow: hidden !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Toggle visibility
      if (panel.classList.contains('force-hidden')) {
        panel.classList.remove('force-hidden');
        panel.style.removeProperty('display');
        localStorage.setItem('explorerHidden', 'false');
        console.log('Explorer shown');
      } else {
        panel.classList.add('force-hidden');
        localStorage.setItem('explorerHidden', 'true');
        console.log('Explorer hidden');
      }
    } else {
      console.error('Explorer panel not found');
    }
  });
  
  // Insert at the start of menu bar
  menuBar.insertBefore(toggleBtn, menuBar.firstChild);
  console.log('? Explorer toggle button added');
  
  // Restore saved state
  if (localStorage.getItem('explorerHidden') === 'true') {
    const explorerPanel = document.querySelector('.explorer-panel') as HTMLElement;
    if (explorerPanel) {
      explorerPanel.classList.add('force-hidden');
      console.log('Restored hidden state from localStorage');
    }
  }
}, 1500);

cleanupMenus();

    cleanupMenus();
    setTimeout(() => setupCompleteFileMenu(), 100);
    setTimeout(() => setupEnhancedViewMenu(), 200);
    setTimeout(() => setupProjectMenu(), 300);
    setupEnhancedKeyboardShortcuts();
    setupGlobalMenuHandler();
    
    addAutonomousIntegrationStyles();
    
    initializeCameraPanel();
    
    // ? Expose camera toggle to window for toolbar button
    (window as any).toggleCameraPanel = toggleCameraPanel;
    console.log('?? Camera toggle exposed to window');
    
// Add modern project creation modal
setTimeout(() => {
  import('./ide/projectCreation/ui/modernModal').then(module => {
    (window as any).ModernProjectModal = module.ModernProjectModal;
    console.log('? Modern project modal loaded');
    
    // Make the modal show function globally available
    (window as any).showModernProjectModal = function() {
      const modal = new module.ModernProjectModal();
      modal.show();
    };
    
    console.log('? Modern project modal functions registered');
    console.log('?? Project menu dropdown handled by setupProjectMenu()');
  }).catch(err => {
    console.error('? Failed to load modern modal:', err);
  });
}, 1500);



try {
  initializeAssistantUI();
  
  // ? Initialize Multi-Provider Orchestrator UI
  try {
    initializeOrchestratorUI();
    console.log('? Multi-Provider Orchestrator initialized');
  } catch (e) {
    console.warn('?? Orchestrator UI not available:', e);
  }
    initializeCalibration();
  console.log('? Provider Calibration System initialized');
  initializeChangesExplanation();
  // initializeContextStatusBar renamed to initializeUnifiedStatusBar in contextStatusBar.ts
  // (fixed by patch_fix_startup_errors.ps1)
  try {
    initializeUnifiedStatusBar();
  } catch(_e) {
    console.warn('[X02] initializeUnifiedStatusBar not available:', _e);
  }
  // ? ADD THIS CODE
if (import.meta.env.DEV) {
  // Make sure you have these imports at top:
  // import { contextManager } from './ide/aiAssistant/contextManager';
  // import { conversationManager } from './ide/aiAssistant/conversationManager';
  // import { isContextEnabled, getContextStatus, toggleContextSystem } from './ide/aiAssistant/contextIntegration';
  
  (window as any).contextManager = contextManager;
  (window as any).conversationManager = conversationManager;
  (window as any).isContextEnabled = isContextEnabled;
  (window as any).getContextStatus = getContextStatus;
  (window as any).toggleContextSystem = toggleContextSystem;
  (window as any).showCalibrationPanel = showCalibrationPanel
  try {
    (window as any).debugContext = {
      showStatus: () => {
        console.log('?? Context Status:');
        console.log('  Enabled:', isContextEnabled());
        console.log('  Status:', getContextStatus());
        console.log('  Project:', contextManager.getProjectContext());
        console.log('  Messages:', conversationManager.getCurrentConversation()?.messages?.length || 0);
      },
      enable: () => {
        toggleContextSystem(true);
        console.log('? Context enabled');
      }
    };
  } catch(e) { console.warn('[Init] debugContext skipped:', e?.message); }
  
  console.log('?? Debug commands available: debugContext.showStatus()');
}
  console.log('?? Initializing Intelligent Assistant...');
  await intelligentAssistant.initialize();
  console.log('? Intelligent Assistant core initialized');
  
  (window as any).intelligentAssistant = intelligentAssistant;
  (window as any).contextManager = contextManager;
  
  setTimeout(() => {
    try {
      // ? DISABLED: Pink icon layer now handled by unified-status-bar in contextStatusBar.ts
      // initializeIntelligentAssistantUI();
      // console.log('? Intelligent Assistant UI initialized');
      console.log('?? Intelligent Assistant UI disabled (using unified-status-bar instead)');
    } catch (uiError) {
      console.error('Error initializing Intelligent Assistant UI:', uiError);
    }
  }, 2000);
  
  setTimeout(() => {
    if (!(window as any).__conversationModuleLoaded) {
      import('./conversation').then(module => {
        if (module.initializeConversationModule) {
          module.initializeConversationModule();
        }
      });
    }
  }, 2000);
} catch (aiError) {
  console.error('Error initializing AI Assistant:', aiError);
}

    try {
      await persistenceManager.initialize();
    } catch (error) {
      console.error('Failed to initialize persistence manager:', error);
    }
    
    loadApiSettings();
    loadConversations();
    loadCurrentConversationId();

    renderConversationList();
    // ? FIX: Removed renderCurrentConversation() - replaced by coordinated render
    // renderCurrentConversation();

    setupEventListeners();
    initializeConversationModule();

    // ? FIX: Single coordinated render replaces 5+ competing paths
    import('./ide/aiAssistant/conversationRenderCoordinator').then(async (mod) => {
      setTimeout(async () => {
        const success = await mod.coordinatedRender();
        if (!success) {
          setTimeout(() => mod.coordinatedRender(), 1500);
        }
      }, 2000);
    }).catch(e => console.warn('[RenderCoord] Import failed, falling back:', e));
    //setupDirectEventHandlers();
    setupFileUploadListeners();
    
    await initializeIdeComponents();
setupMonacoValidation();
    setTimeout(() => {
      initializeAutonomousSystem();
      showNotification('Autonomous coding ready!', 'success');
    }, 4000);
    
   setTimeout(() => {
  initializeTerminal();
  
  // Start error formatting AFTER terminal is ready
  setTimeout(() => {
    if ((window as any).errorFormatting) {
      (window as any).errorFormatting.reinitialize();
      (window as any).__errorFormattingDone = true; 
      console.log('? Auto error formatting started');
    }
  }, 2000);
}, 2000);


setTimeout(() => {
  initializeErrorIntegrationBridge();
  console.log('? Error highlighting system integrated');
}, 1000);
    setupGlobalFileListener();
    initializeFileOperations();
// Initialize auto error formatting after terminal is ready
setTimeout(() => {
  if ((window as any).errorFormatting?.reinitialize) {
    (window as any).errorFormatting.reinitialize();
    (window as any).__errorFormattingDone = true; 
    console.log('? Auto error formatting activated');
  }
}, 3000);
    const embeddedPluginScript = document.createElement('script');
    embeddedPluginScript.src = 'assets/embedded-plugin.js';
    document.body.appendChild(embeddedPluginScript);
    
    try {
      const pluginManager = PluginManager.getInstance();
      await pluginManager.initialize();
      
      const projectCreationManager = ProjectCreationManager.getInstance();
      
      (window as any).__pluginManager = pluginManager;
      (window as any).__projectCreationManager = projectCreationManager;
    } catch (error) {
      console.error('Error initializing plugin system:', error);
    }

    // External Plugin System
    try {
      const externalPluginManager = new ExternalPluginManager();
      (window as any).externalPluginManager = externalPluginManager;

      const pluginAPIs = {
        editorApi: {
          registerCommand: (id: string, handler: Function) => {
            (window as any)[`plugin_cmd_${id}`] = handler;
            return { dispose: () => delete (window as any)[`plugin_cmd_${id}`] };
          },
          getActiveDocument: () => {
            const editor = (window as any).monaco?.editor?.getEditors()?.[0];
            if (!editor) return null;
            const model = editor.getModel();
            if (!model) return null;
            return {
              fileName: (window as any).tabManager?.currentFile?.name || 'Untitled',
              language: model.getLanguageId(),
              content: model.getValue()
            };
          },
          onDocumentChange: (callback: Function) => {
            const editor = (window as any).monaco?.editor?.getEditors()?.[0];
            if (!editor) return { dispose: () => {} };
            const model = editor.getModel();
            if (!model) return { dispose: () => {} };
            const listener = model.onDidChangeContent(() => {
              callback({
                fileName: (window as any).tabManager?.currentFile?.name || 'Untitled',
                content: model.getValue()
              });
            });
            return { dispose: () => listener.dispose() };
          },
          insertText: (text: string) => {
            const editor = (window as any).monaco?.editor?.getEditors()?.[0];
            if (!editor) return;
            const selection = editor.getSelection();
            editor.executeEdits('plugin', [{ range: selection, text: text }]);
          },
          getSelectedText: () => {
            const editor = (window as any).monaco?.editor?.getEditors()?.[0];
            if (!editor) return '';
            const selection = editor.getSelection();
            const model = editor.getModel();
            if (!model || !selection) return '';
            return model.getValueInRange(selection);
          }
        },
        uiApi: {
          showMessage: (message: string, type: string = 'info') => {
            if ((window as any).showNotification) {
              (window as any).showNotification(message, type);
            } else {
              alert(message);
            }
          },
          addMenuItem: (menu: string, label: string, handler: Function) => {
            if (!(window as any).__pluginMenuItems) {
              (window as any).__pluginMenuItems = [];
            }
            (window as any).__pluginMenuItems.push({ menu, label, handler });
          },
          updateStatusBar: (text: string) => {
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) statusBar.textContent = text;
          },
          showPanel: (title: string, content: string) => {
            const panel = document.createElement('div');
            panel.style.cssText = `
              position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
              background: #1e1e1e; border: 1px solid #3e3e42; border-radius: 8px;
              padding: 20px; min-width: 400px; max-width: 600px; z-index: 10000;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5); color: #d4d4d4;
            `;
            panel.innerHTML = `
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h3 style="margin: 0; color: white;">${title}</h3>
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: none; border: none; color: #969696; cursor: pointer; font-size: 20px;">?</button>
              </div>
              <div>${content}</div>
            `;
            document.body.appendChild(panel);
          }
        },
        fileSystemApi: {
          readFile: async (path: string) => {
            if ((window as any).fileSystem?.readFile) {
              return await (window as any).fileSystem.readFile(path);
            }
            return '';
          },
          writeFile: async (path: string, content: string) => {
            if ((window as any).fileSystem?.writeFile) {
              await (window as any).fileSystem.writeFile(path, content);
            }
          },
          getCurrentPath: () => {
            return (window as any).fileSystem?.currentPath || '';
          }
        },
        terminalApi: {
          executeCommand: async (command: string) => {
            if ((window as any).executeCommand) {
              await (window as any).executeCommand(command);
            }
          }
        }
      };

      (window as any).pluginAPIs = pluginAPIs;
      
    } catch (error) {
      console.error('Error initializing external plugin system:', error);
    }

    if (tauriInitialized) {
      try {
        const testResult = await (window as any).fileSystem?.testTauriConnection();
        if (testResult) {
          showNotification('IDE ready with full functionality!', 'success');
        }
      } catch (error) {
        console.error('Tauri connection test failed:', error);
      }
    }
// ========================================================================
// PLUGIN SOURCE CODE AUTO-DETECTION
// ========================================================================
setTimeout(() => {
  console.log('[Plugin Detection] Initializing...');
  
  const isPluginCode = (code: string) => {
    if (!code) return false;
    return (code.includes('exports.manifest') || code.includes('export const manifest')) &&
           (code.includes('exports.activate') || code.includes('export function activate'));
  };
  
  const getPluginContext = (code: string) => {
    if (!isPluginCode(code)) return null;
    return `
[SYSTEM CONTEXT - Plugin Development Mode]
This is plugin source code for the AI IDE Plugin System.

Plugin Structure:
- exports.manifest = { id, name, version, description, author }
- exports.activate = function(context) { ... }
- exports.deactivate = function() { ... } (optional)

Available APIs in context parameter:
- editorApi: getActiveDocument(), insertText(), getSelectedText(), onDocumentChange()
- uiApi: showMessage(), showPanel(), updateStatusBar()
- fileSystemApi: readFile(), writeFile(), getCurrentPath()
- terminalApi: executeCommand()
- createdElements: [] (track UI elements for cleanup)

Best Practices:
- Always track created DOM elements in context.createdElements
- Add data-plugin="\${your-plugin-id}" to all created elements
- Implement deactivate() to clean up resources
- Use context.subscriptions for event listeners

The user is developing this plugin. Help them with code improvements, bug fixes, and feature additions.

[END SYSTEM CONTEXT]

`;
  };
  
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
  
  if (sendBtn && userInput) {
    const originalHandler = sendBtn.onclick;
    
    sendBtn.onclick = function(e) {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const code = model.getValue();
          const context = getPluginContext(code);
          
          if (context && userInput.value.trim()) {
            userInput.value = context + userInput.value;
            console.log('[Plugin Detection] Plugin code detected, context injected');
          }
        }
      }
      
      if (originalHandler) originalHandler.call(sendBtn, e);
    };
  }
  
  const checkFile = () => {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (!editor) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const currentFileName = (window as any).tabManager?.currentFile?.name || 'untitled';
    const dismissKey = `pluginIndicator_dismissed_${currentFileName}`;
    
    if (sessionStorage.getItem(dismissKey) === 'true') {
      return;
    }
    
    const isPlugin = isPluginCode(model.getValue());
    let indicator = document.getElementById('plugin-file-indicator');
    
    const chatContainer = document.querySelector('.ai-chat-container');
    if (!chatContainer) return;
    
    if (isPlugin && !indicator) {
      indicator = document.createElement('div');
      indicator.id = 'plugin-file-indicator';
      indicator.style.cssText = `
        position: sticky; top: 0; 
        background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(103, 58, 183, 0.15));
        border: 1px solid #9C27B0;
        border-radius: 8px; 
        padding: 10px 14px;
        margin-bottom: 12px;
        color: #e1b3ff; 
        font-size: 12px; 
        z-index: 100;
        box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        animation: pluginDetectedSlideIn 0.4s ease;
      `;
      indicator.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9C27B0" stroke-width="2">
          <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
          <path d="M2 17L12 22L22 17"></path>
          <path d="M2 12L12 17L22 12"></path>
        </svg>
        <span style="flex: 1;">Plugin code detected - AI ready to help</span>
        <button id="close-plugin-indicator" style="
          background: none;
          border: none;
          color: #9C27B0;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          width: 20px;
          height: 20px;
        " title="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      
      chatContainer.insertBefore(indicator, chatContainer.firstChild);
      
      const closeBtn = document.getElementById('close-plugin-indicator');
      if (closeBtn) {
        closeBtn.addEventListener('mouseenter', () => {
          closeBtn.style.background = 'rgba(156, 39, 176, 0.2)';
        });
        closeBtn.addEventListener('mouseleave', () => {
          closeBtn.style.background = 'none';
        });
        closeBtn.addEventListener('click', () => {
          if (indicator) {
            indicator.style.animation = 'pluginDetectedSlideOut 0.3s ease';
            setTimeout(() => {
              indicator?.remove();
              sessionStorage.setItem(dismissKey, 'true');
            }, 300);
          }
        });
      }
      
      if (!document.getElementById('plugin-indicator-animation')) {
        const style = document.createElement('style');
        style.id = 'plugin-indicator-animation';
        style.textContent = `
          @keyframes pluginDetectedSlideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pluginDetectedSlideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }
        `;
        document.head.appendChild(style);
      }
    } else if (!isPlugin && indicator) {
      indicator.style.animation = 'pluginDetectedSlideOut 0.3s ease';
      setTimeout(() => indicator?.remove(), 300);
    }
  };
  
  checkFile();
  setInterval(checkFile, 8000); // X02-lagfix: slowed from 2s
  
  console.log('[Plugin Detection] System active');
}, 1000);

    
setTimeout(() => {
  console.log('[AI FINAL] Registering AI actions...');
  const monaco = (window as any).monaco;
  if (monaco?.editor) {
    const editors = monaco.editor.getEditors();
    if (editors?.length > 0) {
      editors.forEach((editor: any) => {
        try {
          if (!editor.__aiRegistered) {
            // Clear any existing AI actions from context menu
const editor = editors[0];
const actionsMap = (editor as any)._actions;
if (actionsMap) {
  const aiActionIds = ['ai-edit-selection', 'ai-refactor', 'ai-add-comments', 
                       'ai-add-error-handling', 'ai-add-iso26262-compliance'];
  aiActionIds.forEach(id => {
    const fullId = `vs.editor.ICodeEditor:1:${id}`;
    actionsMap.delete(fullId);
    actionsMap.delete(id);
  });
}
            initializeAIDirectEditor(editor);
            editor.__aiRegistered = true;
            console.log('[AI FINAL] Registered successfully');
          } else {
            console.log('[AI FINAL] Already registered, skipping');
          }
        } catch (e) {
          console.error('[AI FINAL] Error:', e);
        }
      });
    } else {
      console.warn('[AI FINAL] No editors found');
    }
  } else {
    console.warn('[AI FINAL] Monaco not available');
  }
}, 3000);
    isInitialized = true;
  initPiPanel(); // Raspberry Pi Panel - Ctrl+Shift+B
console.log('Application initialization complete!');

  // [X02 Version] Inject version into status bar
  setTimeout(() => {
    import(/* @vite-ignore */ "./version").then(({ APP_VERSION }) => {
      // Try bottom status bar first
      let el = document.getElementById("version-status");
      if (!el) {
        // Create and append to status bar
        const bar = document.querySelector(".status-bar");
        if (bar) {
          el = document.createElement("div");
          el.id = "version-status";
          el.className = "status-item right";
          el.style.cssText = "color:#4ec9b0;font-weight:600;cursor:default;";
          bar.appendChild(el);
        }
      }
      if (el) el.textContent = APP_VERSION;
    }).catch(() => {
      const bar = document.querySelector(".status-bar");
      if (bar && !document.getElementById("version-status")) {
        const el = document.createElement("div");
        el.id = "version-status";
        el.className = "status-item right";
        el.style.cssText = "color:#4ec9b0;font-weight:600;";
        el.textContent = "v1.5.1";
        bar.appendChild(el);
      }
    });
  }, 3000);
// Trigger build system indicator after everything else is ready
setTimeout(() => {
  if (window.__buildSystemUI?.initializeBuildSystemUI) {
    window.__buildSystemUI.initializeBuildSystemUI();
  }
}, 3000);  // 3 seconds - after status bar is stable
  // AUTO-RENDER SAVED CONVERSATIONS
function autoRenderSavedConversation(): boolean {
  // ? FIX: Skip if coordinator already rendered
  if ((window as any).__conversationRendered) {
    console.log('[AutoRender] Skipping - coordinator already rendered');
    return true;
  }
  const cm = (window as any).conversationManager;
  if (!cm) return false;
  
  const current = cm.getCurrentConversation?.();
  if (!current?.messages?.length) return false;
  
  const container = document.querySelector('.ai-chat-container');
  if (!container) return false;
  
  const existingMessages = container.querySelectorAll('.ai-message, .user-message, .assistant-message');
  if (existingMessages.length >= current.messages.length) return true;
  
  console.log(`?? [AutoRender] Rendering ${current.messages.length} saved messages...`);
  container.innerHTML = '';
  
  // Provider map for display names and colors
  const providerMap: { [key: string]: { name: string; color: string } } = {
    'operator_x02': { name: 'X02', color: '#8b5cf6' },
    'deepseek': { name: 'DeepSeek', color: '#0066ff' },
    'openai': { name: 'OpenAI', color: '#10a37f' },
    'claude': { name: 'Claude', color: '#cc785c' },
    'groq': { name: 'Groq', color: '#f55036' },
    'anthropic': { name: 'Claude', color: '#cc785c' },
    'gemini': { name: 'Gemini', color: '#4285f4' },
    'ollama': { name: 'Ollama', color: '#888888' }
  };
  
  current.messages.forEach((msg: any, i: number) => {
    const msgId = msg.id || `msg-${i}`;
    const div = document.createElement('div');
    div.className = `ai-message ${msg.role}-message`;
    div.setAttribute('data-message-id', msgId);
    
    // Set data-timestamp for collapse manager
    if (msg.timestamp) {
      div.setAttribute('data-timestamp', String(msg.timestamp));
    }
    
    // Set data-provider from message metadata (for collapse manager)
    const msgProvider = msg.metadata?.provider || '';
    if (msg.role === 'assistant' && msgProvider) {
      div.setAttribute('data-provider', msgProvider);
    }
    
    div.style.opacity = '1';
    
    // Message content
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    content.innerHTML = (msg.content || '')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => { const e = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); return `<pre class="code-block"><code class="language-${lang||'plaintext'}">${e}</code></pre>`; })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    
    div.appendChild(content);
    
    // Add action footer for assistant messages (clean compact layout)
    if (msg.role === 'assistant') {
      const timeStr = msg.timestamp 
        ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      
      // Get provider from message metadata (not global config!)
      const msgProviderKey = msg.metadata?.provider || '';
      const providerInfo = providerMap[msgProviderKey] || { name: '', color: '#808080' };
      const displayProviderName = providerInfo.name;
      const displayProviderColor = providerInfo.color;
      
      // Only show provider badge if we have valid provider info
      const providerBadgeHtml = displayProviderName ? `
        <span class="provider-badge" style="
          color: ${displayProviderColor};
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          background: ${displayProviderColor}15;
          border-radius: 4px;
          border: 1px solid ${displayProviderColor}30;
        ">${displayProviderName}</span>
      ` : '';
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'message-actions';
      actionsDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0 4px 0;
        margin-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.06);
      `;
      
      actionsDiv.innerHTML = `
        <div class="message-footer-left" style="display: flex; align-items: center; gap: 8px;">
          <span class="message-time" style="color: #6b6b6b; font-size: 11px;">${timeStr}</span>
          ${providerBadgeHtml}
        </div>
        <div class="message-action-buttons" style="display: flex; gap: 2px; opacity: 0.6; transition: opacity 0.2s;">
          <button class="message-action-btn copy-btn" title="Copy" style="
            width: 28px; height: 28px; border: none; background: transparent;
            border-radius: 4px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="message-action-btn like-btn" title="Good response" style="
            width: 28px; height: 28px; border: none; background: transparent;
            border-radius: 4px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
          </button>
          <button class="message-action-btn dislike-btn" title="Bad response" style="
            width: 28px; height: 28px; border: none; background: transparent;
            border-radius: 4px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
            </svg>
          </button>
          <button class="message-action-btn note-btn" title="Add note" style="
            width: 28px; height: 28px; border: none; background: transparent;
            border-radius: 4px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="message-action-btn html-view-btn" title="View as document" style="
            width: 28px; height: 28px; border: none; background: transparent;
            border-radius: 4px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #808080; transition: all 0.15s; position: relative; z-index: 1;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </button>
        </div>
      `;
      
      div.appendChild(actionsDiv);
      
      // Add hover effects
      const buttonsContainer = actionsDiv.querySelector('.message-action-buttons') as HTMLElement;
      if (buttonsContainer) {
        actionsDiv.addEventListener('mouseenter', () => { buttonsContainer.style.opacity = '1'; });
        actionsDiv.addEventListener('mouseleave', () => { buttonsContainer.style.opacity = '0.6'; });
      }
      
      // Add button hover effects and click handlers
      const buttons = actionsDiv.querySelectorAll('.message-action-btn');
      buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          (btn as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
          (btn as HTMLElement).style.color = '#ffffff';
        });
        btn.addEventListener('mouseleave', () => {
          (btn as HTMLElement).style.background = 'transparent';
          const isLiked = btn.classList.contains('like-btn') && btn.getAttribute('data-liked') === 'true';
          const isDisliked = btn.classList.contains('dislike-btn') && btn.getAttribute('data-disliked') === 'true';
          (btn as HTMLElement).style.color = isLiked ? '#4caf50' : isDisliked ? '#ff6b6b' : '#808080';
        });
      });
      
      // Copy button handler
      const copyBtn = actionsDiv.querySelector('.copy-btn') as HTMLElement;
      if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('?? Copy button clicked');
          try {
            const plainText = (msg.content || '').replace(/<[^>]*>/g, '');
            await navigator.clipboard.writeText(plainText);
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2" style="pointer-events: none;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
              copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            }, 2000);
            if ((window as any).showNotification) {
              (window as any).showNotification('Copied to clipboard', 'success');
            }
          } catch (err) { console.error('Copy failed:', err); }
        });
      }
      
      // Like button handler
      const likeBtn = actionsDiv.querySelector('.like-btn') as HTMLElement;
      if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('?? Like button clicked');
          const isLiked = likeBtn.getAttribute('data-liked') === 'true';
          likeBtn.setAttribute('data-liked', isLiked ? 'false' : 'true');
          likeBtn.style.color = isLiked ? '#808080' : '#4caf50';
          // Reset dislike
          const dislikeBtnEl = actionsDiv.querySelector('.dislike-btn') as HTMLElement;
          if (dislikeBtnEl && !isLiked) {
            dislikeBtnEl.setAttribute('data-disliked', 'false');
            dislikeBtnEl.style.color = '#808080';
          }
        });
      }
      
      // Dislike button handler
      const dislikeBtn = actionsDiv.querySelector('.dislike-btn') as HTMLElement;
      if (dislikeBtn) {
        dislikeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('?? Dislike button clicked');
          const isDisliked = dislikeBtn.getAttribute('data-disliked') === 'true';
          dislikeBtn.setAttribute('data-disliked', isDisliked ? 'false' : 'true');
          dislikeBtn.style.color = isDisliked ? '#808080' : '#ff6b6b';
          // Reset like
          const likeBtnEl = actionsDiv.querySelector('.like-btn') as HTMLElement;
          if (likeBtnEl && !isDisliked) {
            likeBtnEl.setAttribute('data-liked', 'false');
            likeBtnEl.style.color = '#808080';
          }
        });
      }
      
      // Note button handler
      const noteBtn = actionsDiv.querySelector('.note-btn') as HTMLElement;
      if (noteBtn) {
        noteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('?? Note button clicked');
          const note = prompt('Add a note for this response:');
          if (note) {
            noteBtn.setAttribute('data-has-note', 'true');
            noteBtn.style.color = '#ffd700';
            if ((window as any).showNotification) {
              (window as any).showNotification('Note added', 'success');
            }
          }
        });
      }
      
      // HTML view button handler
      const htmlViewBtn = actionsDiv.querySelector('.html-view-btn') as HTMLElement;
      if (htmlViewBtn) {
        htmlViewBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('?? HTML view button clicked');
          
          // Try global function first
          const convertFn = (window as any).convertResponseToHTML;
          if (typeof convertFn === 'function') {
            convertFn(msg.content || '', 'ai-response');
            return;
          }
          
          // Fallback: Create modal overlay
          const existingModal = document.getElementById('html-view-modal');
          if (existingModal) existingModal.remove();
          
          const modal = document.createElement('div');
          modal.id = 'html-view-modal';
          modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85); z-index: 100000;
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
          `;
          
          const content = document.createElement('div');
          content.style.cssText = `
            background: #1e1e1e; border-radius: 8px; max-width: 900px;
            max-height: 90vh; overflow: auto; position: relative;
            border: 1px solid #3c3c3c; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          `;
          
          // Header
          const header = document.createElement('div');
          header.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 16px; border-bottom: 1px solid #3c3c3c;
            background: #252526; position: sticky; top: 0; z-index: 1;
          `;
          header.innerHTML = `
            <span style="color: #e0e0e0; font-weight: 500;">Message Content</span>
            <button id="close-html-modal" style="
              width: 28px; height: 28px; border: none; background: transparent;
              border-radius: 4px; cursor: pointer; display: flex; align-items: center;
              justify-content: center; color: #808080; transition: all 0.15s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
          `;
          
          // Body
          const body = document.createElement('div');
          body.style.cssText = `
            padding: 20px; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6; font-size: 14px;
          `;
          body.innerHTML = `
            <style>
              #html-view-modal pre { background: #0d0d0d; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
              #html-view-modal code { font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px; }
              #html-view-modal p { margin: 0 0 12px 0; }
              #html-view-modal ul, #html-view-modal ol { margin: 12px 0; padding-left: 24px; }
              #html-view-modal li { margin: 4px 0; }
              #html-view-modal strong { color: #4fc3f7; }
            </style>
            ${msg.content || ''}
          `;
          
          content.appendChild(header);
          content.appendChild(body);
          modal.appendChild(content);
          document.body.appendChild(modal);
          
          // Close handlers
          const closeBtn = modal.querySelector('#close-html-modal');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
            closeBtn.addEventListener('mouseenter', () => {
              (closeBtn as HTMLElement).style.background = '#c42b1c';
              (closeBtn as HTMLElement).style.color = '#ffffff';
            });
            closeBtn.addEventListener('mouseleave', () => {
              (closeBtn as HTMLElement).style.background = 'transparent';
              (closeBtn as HTMLElement).style.color = '#808080';
            });
          }
          
          modal.addEventListener('click', (evt) => {
            if (evt.target === modal) modal.remove();
          });
          
          // Escape key
          const escHandler = (evt: KeyboardEvent) => {
            if (evt.key === 'Escape') {
              modal.remove();
              document.removeEventListener('keydown', escHandler);
            }
          };
          document.addEventListener('keydown', escHandler);
          
          if ((window as any).showNotification) {
            (window as any).showNotification('Document view opened', 'info');
          }
        });
      }
    }
    
    // Add delete button for user messages
    if (msg.role === 'user') {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'user-msg-delete-btn';
      deleteBtn.title = 'Delete message';
      deleteBtn.style.cssText = `
        position: absolute; top: 8px; right: 8px; width: 24px; height: 24px;
        border: none; background: transparent; border-radius: 4px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; color: #808080;
        opacity: 0; transition: all 0.15s;
      `;
      deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>';
      
      div.style.position = 'relative';
      div.appendChild(deleteBtn);
      
      div.addEventListener('mouseenter', () => { deleteBtn.style.opacity = '1'; });
      div.addEventListener('mouseleave', () => { deleteBtn.style.opacity = '0'; });
      deleteBtn.addEventListener('mouseenter', () => { 
        deleteBtn.style.background = 'rgba(255,100,100,0.2)'; 
        deleteBtn.style.color = '#ff6b6b'; 
      });
      deleteBtn.addEventListener('mouseleave', () => { 
        deleteBtn.style.background = 'transparent'; 
        deleteBtn.style.color = '#808080'; 
      });
      
      deleteBtn.addEventListener('click', () => {
        if (confirm('Delete this message?')) {
          const conv = cm.getCurrentConversation?.();
          if (conv?.messages) {
            const idx = conv.messages.findIndex((m: any) => m.id === msgId);
            if (idx !== -1) {
              conv.messages.splice(idx, 1);
              div.style.opacity = '0';
              div.style.transform = 'translateX(-20px)';
              setTimeout(() => div.remove(), 200);
              cm.saveConversations?.();
            }
          }
        }
      });
    }
    
    container.appendChild(div);
  });
  
  // ?? AUTO-COLLAPSE: Collapse all previous assistant messages (keep last one expanded)
  setTimeout(() => {
    const assistantMessages = container.querySelectorAll('.assistant-message');
    const totalAssistant = assistantMessages.length;
    
    if (totalAssistant > 1) {
      // Collapse all except the last one
      assistantMessages.forEach((msg, idx) => {
        if (idx < totalAssistant - 1) {
          collapseMessageElement(msg as HTMLElement);
        }
      });
      console.log(`?? [AutoRender] Collapsed ${totalAssistant - 1} previous AI messages`);
    }
  }, 100);
  
  // ?? Use scroll manager instead of direct scroll
  scrollChatToBottom();
  document.getElementById('conversation-title')!.textContent = current.title;
  console.log(`? [AutoRender] Done`);
  return true;
}

/**
 * Collapse a message element (for saved conversation rendering)
 */
function collapseMessageElement(messageElement: HTMLElement): void {
  if (messageElement.classList.contains('ai-message-collapsed')) return;
  
  const contentDiv = messageElement.querySelector('.ai-message-content');
  const actionsDiv = messageElement.querySelector('.message-actions');
  
  if (!contentDiv) return;
  
  // Get preview text (first ~80 chars)
  const originalText = contentDiv.textContent || '';
  const previewText = originalText.substring(0, 80).replace(/\s+/g, ' ').trim() + (originalText.length > 80 ? '...' : '');
  
  // Get timestamp from actions
  const timeElement = actionsDiv?.querySelector('.message-time');
  const timestamp = timeElement?.textContent || '';
  
  // Get provider info
  const providerBadge = actionsDiv?.querySelector('.provider-badge');
  const providerName = providerBadge?.textContent || 'AI';
  const providerColor = (providerBadge as HTMLElement)?.style.color || '#4fc3f7';
  
  // Create collapsed header
  const collapsedHeader = document.createElement('div');
  collapsedHeader.className = 'ai-message-collapsed-header';
  collapsedHeader.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.15s;
  `;
  
  collapsedHeader.innerHTML = `
    <div class="collapsed-indicator" style="display: flex; align-items: center; color: #808080;">
      <svg class="collapsed-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
    <div class="collapsed-preview" style="flex: 1; min-width: 0;">
      <span class="collapsed-preview-text" style="
        color: #a0a0a0;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      ">${previewText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
    </div>
    <div class="collapsed-meta" style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
      <span class="collapsed-provider" style="
        color: ${providerColor};
        font-size: 11px;
        font-weight: 500;
        padding: 2px 6px;
        background: ${providerColor}15;
        border-radius: 4px;
      ">${providerName}</span>
      <span class="collapsed-time" style="color: #6b6b6b; font-size: 11px;">${timestamp}</span>
    </div>
  `;
  
  // Hover effect
  collapsedHeader.addEventListener('mouseenter', () => {
    collapsedHeader.style.background = 'rgba(255,255,255,0.05)';
    const previewText = collapsedHeader.querySelector('.collapsed-preview-text') as HTMLElement;
    if (previewText) previewText.style.color = '#e0e0e0';
  });
  collapsedHeader.addEventListener('mouseleave', () => {
    collapsedHeader.style.background = 'transparent';
    const previewText = collapsedHeader.querySelector('.collapsed-preview-text') as HTMLElement;
    if (previewText) previewText.style.color = '#a0a0a0';
  });
  
  // Add click handler to expand
  collapsedHeader.addEventListener('click', () => {
    expandMessageElement(messageElement);
  });
  
  // Hide content and actions
  (contentDiv as HTMLElement).style.display = 'none';
  if (actionsDiv) (actionsDiv as HTMLElement).style.display = 'none';
  
  // Add collapsed header and class
  messageElement.insertBefore(collapsedHeader, messageElement.firstChild);
  messageElement.classList.add('ai-message-collapsed');
  
  // Compact styling for collapsed message
  messageElement.style.padding = '4px 8px';
  messageElement.style.margin = '2px 0';
}

/**
 * Expand a collapsed message element
 */
function expandMessageElement(messageElement: HTMLElement): void {
  if (!messageElement.classList.contains('ai-message-collapsed')) return;
  
  const collapsedHeader = messageElement.querySelector('.ai-message-collapsed-header');
  const contentDiv = messageElement.querySelector('.ai-message-content');
  const actionsDiv = messageElement.querySelector('.message-actions');
  
  // Remove collapsed header
  if (collapsedHeader) {
    collapsedHeader.remove();
  }
  
  // Show content and actions
  if (contentDiv) (contentDiv as HTMLElement).style.display = '';
  if (actionsDiv) (actionsDiv as HTMLElement).style.display = '';
  
  // Remove collapsed class and restore styling
  messageElement.classList.remove('ai-message-collapsed');
  messageElement.style.padding = '';
  messageElement.style.margin = '';
}

// ? FIX: Removed competing auto-render retries (now handled by conversationRenderCoordinator)
// setTimeout(() => { if (!autoRenderSavedConversation()) setTimeout(autoRenderSavedConversation, 500); }, 1000);
// setTimeout(autoRenderSavedConversation, 2000);
// setTimeout(autoRenderSavedConversation, 3000);  
    // Force Auto Mode icons ON after all init completes
    setTimeout(() => { localStorage.setItem('ideScriptMode', 'auto'); (window as any).forceAutoModeIcons(); console.log('FORCE AUTO+SEARCH ON (post-init)'); }, 5000);


    // === MODE INDICATOR: Design E - Gradient Top Bar ===
    console.log('[ModeIndicator] Initializing Design E...');
    (function initModeIndicator() {
      // Remove any old indicator elements
      document.querySelectorAll('.mode-indicator-badge').forEach(el => el.remove());
      
      // Remove old style if exists
      const oldStyle = document.getElementById('mode-indicator-styles');
      if (oldStyle) oldStyle.remove();
      
      const style = document.createElement('style');
      style.id = 'mode-indicator-styles';
      style.textContent = `
        .chat-input-area {
          position: relative !important;
          overflow: visible !important;
          border-top: none !important;
        }
        .mode-gradient-bar {
          height: 3px;
          border-radius: 12px 12px 0 0;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          transition: all 0.4s ease;
        }
        .mode-gradient-bar[data-mode="auto"] {
          background: linear-gradient(90deg, transparent 0%, #0288d1 25%, #4fc3f7 50%, #0288d1 75%, transparent 100%);
          box-shadow: 0 1px 10px rgba(79,195,247,0.3);
          animation: modeBarShimmer 3s ease-in-out infinite;
        }
        .mode-gradient-bar[data-mode="classic"] {
          background: linear-gradient(90deg, transparent 0%, #444 25%, #555 50%, #444 75%, transparent 100%);
          box-shadow: none;
          animation: none;
        }
        @keyframes modeBarShimmer {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .mode-indicator-label {
          position: absolute;
          top: 6px;
          right: 10px;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1px;
          pointer-events: none;
          z-index: 11;
          transition: all 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
        }
        .mode-indicator-label[data-mode="auto"] {
          color: rgba(79,195,247,0.45);
        }
        .mode-indicator-label[data-mode="classic"] {
          color: rgba(255,255,255,0.12);
        }
      `;
      document.head.appendChild(style);

      function updateModeIndicator() {
        const mode = localStorage.getItem('ideScriptMode') || 'auto';
        const inputArea = document.querySelector('.chat-input-area') as HTMLElement;
        if (!inputArea) return;
        inputArea.setAttribute('data-mode', mode);
        // Remove old badge if present
        inputArea.querySelectorAll('.mode-indicator-badge').forEach(el => el.remove());
        // Gradient bar
        let bar = inputArea.querySelector('.mode-gradient-bar') as HTMLElement;
        if (!bar) {
          bar = document.createElement('div');
          bar.className = 'mode-gradient-bar';
          inputArea.insertBefore(bar, inputArea.firstChild);
        }
        bar.setAttribute('data-mode', mode);
        // Label
        let label = inputArea.querySelector('.mode-indicator-label') as HTMLElement;
        if (!label) {
          label = document.createElement('div');
          label.className = 'mode-indicator-label';
          inputArea.appendChild(label);
        }
        label.setAttribute('data-mode', mode);
        label.textContent = mode === 'auto' ? '\u26a1 AUTO' : '\u25c6 CLASSIC';
      }

      updateModeIndicator();
      setTimeout(updateModeIndicator, 1000);
      setTimeout(updateModeIndicator, 3000);
      setTimeout(updateModeIndicator, 6000);

      const origSetItem = localStorage.setItem;
      localStorage.setItem = function(key: string, value: string) {
        origSetItem.call(localStorage, key, value);
        if (key === 'ideScriptMode') {
          console.log('[ModeIndicator] Mode changed:', value);
          setTimeout(updateModeIndicator, 100);
        }
      };

      (window as any).updateModeIndicator = updateModeIndicator;

      const observer = new MutationObserver(() => {
        const bar = document.querySelector('.mode-gradient-bar');
        if (!bar) updateModeIndicator();
      });
      const inputArea = document.querySelector('.chat-input-area');
      if (inputArea) observer.observe(inputArea, { childList: true });

      console.log('[ModeIndicator] Design E Ready!');
    })();
    // Terminal Context: delayed enable (it initializes late)
    setTimeout(() => {
      try {
        const tc3 = (window as any).terminalContext;
        if (tc3 && !tc3.isEnabled?.()) {
          // tc3.toggle(true); // DISABLED: terminal OFF by default
          
          console.log('[Startup] Terminal Context forced ON (delayed)');
        }
      } catch(e) { /* ignore */ }
    }, 7000);

    // Remove loading screen - IDE is ready!
    setTimeout(() => {
      removeLoadingScreen();
    }, 300); // Small delay to ensure everything is rendered

  } catch (error) {
    console.error('Error during initialization:', error);
    showNotification('Initialization error - check console', 'error');
  }
}
// ============================================================================
// EXPORTS
// ============================================================================
(window as any).testAutonomousSystem = testAutonomousSystem;
(window as any).setTypingSpeed = setTypingSpeed;
(window as any).emergencyStopTyping = emergencyStopTyping;
(window as any).toggleAutonomousMode = toggleAutonomousMode;
(window as any).processCurrentFileAutonomous = processCurrentFileAutonomous;

export { 
  toggleAutonomousMode, 
  processCurrentFileAutonomous, 
  setTypingSpeed, 
  emergencyStopTyping, 
  testAutonomousSystem
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================
window.addEventListener("DOMContentLoaded", init);

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

window.onerror = function(message: string, source?: string, lineno?: number, colno?: number, error?: Error) {
  console.error('Global error:', message, 'at', source, lineno, colno, error);
  return false;
};

// DISABLED - Prevents duplicate terminal: document.addEventListener('DOMContentLoaded', () => {
// DISABLED - Prevents duplicate terminal:   setTimeout(() => {
// DISABLED - Prevents duplicate terminal:     try {
// DISABLED - Prevents duplicate terminal:       initializeTerminal();
// DISABLED - Prevents duplicate terminal:     } catch (e) {
// DISABLED - Prevents duplicate terminal:       console.error('Error re-initializing terminal:', e);
// DISABLED - Prevents duplicate terminal:     }
// DISABLED - Prevents duplicate terminal:   }, 1000);
// DISABLED - Prevents duplicate terminal:   initFileSystemAPI();
// DISABLED - Prevents duplicate terminal: });

// ============================================================================
// GLOBAL DECLARATIONS
// ============================================================================
declare global {
  interface Window {
    __TAURI__?: any;
    __systemInfo?: any;
    __simpleAutonomous?: any;
    __simpleAutonomousUI?: any;
    __isAutonomousModeActive?: boolean;
    intelligentAssistant?: any;
    contextManager?: any;
    showIntelligentContext?: () => void;
    showEnhancedPrompt?: (message: string) => void;
    testAutonomousSystem?: () => void;
    toggleExplorer?: () => void;
    explorerFilter?: any;
    folderToggle?: any;
    breadcrumbManager?: any;
    tabManager?: any;
    fileSystem?: any;
    monaco?: any;
    externalPluginManager?: any;
    pluginAPIs?: any;
  }
}

window.addEventListener('beforeunload', () => {
  if (window.explorerFilter?.cleanup) window.explorerFilter.cleanup();
  if (window.folderToggle?.cleanup) window.folderToggle.cleanup();
  
  const maxId = window.setInterval(() => {}, 0);
  for (let i = 0; i < maxId; i++) {
    window.clearInterval(i);
  }
});

// [JETSON] Keyboard shortcuts: Ctrl+Shift+J (connect), Ctrl+Shift+R (deploy)
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    e.preventDefault();
    actionConnectJetson();
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    const filePath = editor?.getModel()?.uri?.path || '';
    actionDeployCurrentFile(filePath);
  }
});

// [JETSON] Ctrl+Shift+G opens Jetson Demo Tab
registerJetsonTabShortcut();

// [JETSON] Advanced Feature Pack
(window as any).openJetsonTerminal     = openJetsonTerminal;
(window as any).openJetsonFileBrowser  = openJetsonFileBrowser;
(window as any).openJetsonPerfGraph    = openJetsonPerfGraph;
(window as any).openJetsonPowerManager = openJetsonPowerManager;
(window as any).openJetsonMultiDevice  = openJetsonMultiDevice;
(window as any).openJetsonDevTools     = openJetsonDevTools;


// [JETSON] Cleanup on app close
window.addEventListener('beforeunload', () => {
  try { disposeJetsonRemote(); } catch(e) {}
});

console.log('Main.ts loaded - IDE with Plugin Detection');

// Wait for Run button to exist, then add dropdown
   function initializeBuildSystemDropdown() {
     console.log('?? Initializing Build System Dropdown...');
     
     const checkInterval = setInterval(() => {
       const allButtons = document.querySelectorAll('button');
       let runButtonExists = false;
       
       for (const btn of allButtons) {
         const text = (btn.textContent || '').toLowerCase();
         if (text.includes('run') || text.includes('?')) {
           runButtonExists = true;
           break;
         }
       }
       
       if (runButtonExists) {
         console.log('? Run button found, adding dropdown...');
         clearInterval(checkInterval);
         
         const existingDropdown = document.querySelector('.build-system-dropdown');
         if (existingDropdown) {
           console.log('??  Dropdown already exists, skipping');
           return;
         }
         
      if ((window as any).__buildSystemUI && typeof (window as any).__buildSystemUI.replaceRunButton === 'function') {
           if (window.__buildSystemUI && typeof window.__buildSystemUI.replaceRunButton === 'function') { (window as any).__buildSystemUI.replaceRunButton(); }
           console.log('? Dropdown initialized via module');
         } else {
           if (window.__buildSystemUI && typeof window.__buildSystemUI.replaceRunButton === 'function') { console.warn('??  __buildSystemUI.replaceRunButton not available - check buildSystemUI.ts exports'); }
         }
       }
     }, 2000);
     
     setTimeout(() => clearInterval(checkInterval), 30000);
   }
   
   setTimeout(() => {
     initializeBuildSystemDropdown();
   }, 2000);
   

// ============================================================================
// HOT MODULE REPLACEMENT - CLEANUP ON RELOAD
// ============================================================================
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('?? Hot reload detected - cleaning up...');
    
    // Reset initialization flag so init() can run again
    isInitialized = false;
    cleanupDuplicates();
    console.log('? HMR cleanup complete');
  });
  console.log('?? HMR enabled - duplicates will be cleaned on hot reload');
}


console.log('Main.ts loaded - IDE with Plugin Detection');
// ============================================================================
// BULLETPROOF AI CONTEXT FIX - Added to main.ts to ensure it runs
// ============================================================================
console.log('?? [MAIN.TS] Loading bulletproof AI fix...');

if (typeof window !== 'undefined') {
  
  // The working send handler with IDE context
  // Helper function to show HTML in a modal
  const showHTMLModal = (rawContent: string, formattedContent: string) => {
    // Remove existing modal
    const existing = document.getElementById('html-view-modal');
    if (existing) existing.remove();
    
    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>AI Response</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#1e1e1e;color:#e0e0e0;padding:40px;max-width:800px;margin:0 auto;line-height:1.7;}
h1,h2,h3{color:#4fc3f7;}
pre{background:#2d2d2d;padding:16px;border-radius:8px;overflow-x:auto;border:1px solid #444;}
code{color:#4fc3f7;font-family:'Consolas','Monaco',monospace;}
strong{color:#fff;}
ul,ol{padding-left:24px;}
li{margin:8px 0;}
</style>
</head><body>${formattedContent}</body></html>`;
    
    const modal = document.createElement('div');
    modal.id = 'html-view-modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 20px; animation: fadeIn 0.2s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        width: 100%; max-width: 900px; height: 85vh;
        background: #1e1e1e; border-radius: 12px;
        display: flex; flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        border: 1px solid #333; overflow: hidden;
      ">
        <div style="
          padding: 12px 16px; background: #252525;
          border-bottom: 1px solid #333;
          display: flex; justify-content: space-between; align-items: center;
        ">
          <span style="color: #4fc3f7; font-weight: 600;">?? AI Response - HTML View</span>
          <div style="display: flex; gap: 8px;">
            <button id="html-download-btn" style="
              padding: 6px 12px; background: #0e639c; color: white;
              border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
            ">?? Download</button>
            <button id="html-close-btn" style="
              padding: 6px 12px; background: #444; color: #fff;
              border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
            ">? Close</button>
          </div>
        </div>
        <iframe id="html-preview-iframe" style="flex:1;border:none;background:white;"></iframe>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set iframe content
    const iframe = modal.querySelector('#html-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.srcdoc = htmlContent;
    }
    
    // Close button
    modal.querySelector('#html-close-btn')?.addEventListener('click', () => modal.remove());
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Escape to close
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Download button
    modal.querySelector('#html-download-btn')?.addEventListener('click', () => {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-response-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
    
    console.log('? HTML modal opened');
  };

  // Helper function to get provider color
  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      'groq': '#f55036',
      'openai': '#10a37f',
      'claude': '#c96442',
      'anthropic': '#c96442',
      'deepseek': '#4fc3f7',
      'gemini': '#4285f4',
      'ollama': '#ffffff',
      'openrouter': '#9c27b0'
    };
    return colors[provider?.toLowerCase()] || '#4fc3f7';
  };

// ============================================================================
// EXECUTE CHAINED PROVIDER REQUESTS
// Handles multiple #provider tags with context passing between providers
// Example: "#groq question1 #claude question2"
// Second provider sees first provider's response as context
// ============================================================================
async function executeChainedProviderRequests(
  segments: Array<{provider: string, message: string, tag: string}>,
  input: HTMLTextAreaElement,
  originalUserText: string
): Promise<void> {
  console.log('?? [CHAIN] Starting chained provider execution with', segments.length, 'segments');
  
  const chat = document.querySelector('.ai-chat-container') as HTMLElement;
  if (!chat) return;
  
  // Clear input
  input.value = '';
  input.style.height = 'auto';
  
  // Add user message to chat (show original message with tags)
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'user-message';
  userMsgEl.innerHTML = `<div class="user-message-content">${escapeHtml(originalUserText)}</div>`;
  chat.appendChild(userMsgEl);
  // ?? Use scroll manager - force scroll for user message
  forceScrollChatToBottom();
  
  // Provider configs (same as in contextAwareSendHandler)
  const PROVIDER_CONFIGS: Record<string, any> = {
    'operator_x02': {
      provider: 'operator_x02',
      apiKey: 'PROXY',
      apiBaseUrl: 'PROXY',
      model: 'x02-coder',
      maxTokens: 4000,
      temperature: 0.7
    },
    'groq': {
      provider: 'groq',
      apiKey: 'PROXY',
      apiBaseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4000,
      temperature: 0.7
    },
    'openai': {
      provider: 'openai',
      apiKey: '',
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      maxTokens: 4000,
      temperature: 0.7
    },
    'deepseek': {
      provider: 'deepseek',
      apiKey: 'PROXY',
      apiBaseUrl: 'PROXY',
      model: 'deepseek-chat',
      maxTokens: 4000,
      temperature: 0.7
    },
    'claude': {
      provider: 'claude',
      apiKey: '',
      apiBaseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-20250514',  // ? Updated to correct model
      maxTokens: 4000,
      temperature: 0.7
    },
    'gemini': {
      provider: 'gemini',
      apiKey: '',
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash-exp',
      maxTokens: 4000,
      temperature: 0.7
    }
  };
  
  // ============================================================================
  // ? Get API keys AND configs from providerApiKeys + aiApiConfig
  // This ensures #provider tag uses EXACT same settings as API Settings panel
  // ============================================================================
  
  // Helper function to get saved API key
  const getProviderApiKey = (provider: string): string | null => {
    try {
      const saved = localStorage.getItem('providerApiKeys');
      if (saved) {
        const keys = JSON.parse(saved);
        return keys[provider] || null;
      }
    } catch (e) {
      console.warn('[CHAIN] Error reading providerApiKeys:', e);
    }
    return null;
  };
  
  // ? Get saved FULL config for a provider
  // Checks: 1) providerConfigs (per-provider storage), 2) aiApiConfig (if matches)
  const getSavedProviderConfig = (provider: string): any | null => {
    // Source 1: Check providerConfigs (stores each provider's full config)
    try {
      const providerConfigsStr = localStorage.getItem('providerConfigs');
      if (providerConfigsStr) {
        const providerConfigs = JSON.parse(providerConfigsStr);
        if (providerConfigs[provider] && providerConfigs[provider].apiKey) {
          console.log(`?? [CHAIN] Found full config in providerConfigs for ${provider}`);
          return providerConfigs[provider];
        }
      }
    } catch (e) {}
    
    // Source 2: Check aiApiConfig (current active provider)
    try {
      const configStr = localStorage.getItem('aiApiConfig');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config.provider === provider && config.apiKey) {
          console.log(`?? [CHAIN] Found full config in aiApiConfig for ${provider}`);
          // Also save to providerConfigs for future use
          saveProviderConfig(provider, config);
          return config;
        }
      }
    } catch (e) {}
    
    return null;
  };
  
  // ? Save provider config for future use
  const saveProviderConfig = (provider: string, config: any): void => {
    try {
      const providerConfigs = JSON.parse(localStorage.getItem('providerConfigs') || '{}');
      providerConfigs[provider] = config;
      localStorage.setItem('providerConfigs', JSON.stringify(providerConfigs));
      console.log(`?? [CHAIN] Saved config for ${provider} to providerConfigs`);
    } catch (e) {}
  };
  
  // Log all available keys for debugging
  try {
    const allSavedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
    console.log('?? [CHAIN] Keys in providerApiKeys:', Object.keys(allSavedKeys).map(k => 
      `${k}: ${allSavedKeys[k] ? '?' : '?'}`
    ));
    
    // Show saved provider configs
    const providerConfigs = JSON.parse(localStorage.getItem('providerConfigs') || '{}');
    console.log('?? [CHAIN] Saved providerConfigs:', Object.keys(providerConfigs).map(k =>
      `${k}: ${providerConfigs[k]?.apiKey ? '?' : '?'} (${providerConfigs[k]?.model || 'no model'})`
    ));
    
    // Also show current aiApiConfig
    const currentConfig = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    console.log('?? [CHAIN] Current aiApiConfig:', currentConfig.provider, '- model:', currentConfig.model);
  } catch (e) {}
  
  // ============================================================================
  
  // Track previous responses for context
  let previousResponses: Array<{provider: string, response: string}> = [];
  
  // Execute each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isFirst = i === 0;
    const isLast = i === segments.length - 1;
    
    console.log(`?? [CHAIN ${i + 1}/${segments.length}] Calling ${segment.provider}...`);
    
    // ? Get config for this provider - prefer saved config from aiApiConfig
    const savedFullConfig = getSavedProviderConfig(segment.provider);
    let cfg: any;
    
    if (savedFullConfig) {
      // Use EXACT config from API Settings (same model, baseUrl, etc.)
      cfg = { ...savedFullConfig };
      console.log(`? [CHAIN] Using saved config for ${segment.provider}: model=${cfg.model}`);
    } else {
      // Fall back to default config
      cfg = { ...PROVIDER_CONFIGS[segment.provider] };
      if (!cfg || !cfg.provider) {
        console.error(`Unknown provider: ${segment.provider}`);
        continue;
      }
      
      // Get API key from providerApiKeys
      const savedKey = getProviderApiKey(segment.provider);
      if (savedKey && savedKey.length > 5) {
        cfg.apiKey = savedKey;
        console.log(`?? [CHAIN] Using saved key for ${segment.provider}: ${cfg.apiKey.substring(0, 15)}...`);
      } else if (cfg.apiKey && cfg.apiKey.length > 5) {
        console.log(`?? [CHAIN] Using default key for ${segment.provider}: ${cfg.apiKey.substring(0, 15)}...`);
      } else {
        console.log(`?? [CHAIN] No API key for ${segment.provider}`);
      }
    }
    
    // ? Validate API key before making call
    const hasValidKey = cfg.apiKey && cfg.apiKey.length > 5 && !cfg.apiKey.includes('YOUR_');
    if (!hasValidKey) {
      // Show error for missing API key
      const errorEl = document.createElement('div');
      errorEl.className = 'ai-message assistant-message';
      errorEl.innerHTML = `
        <div class="ai-message-content" style="color: #ff6b6b;">
          ? <strong>${segment.provider}</strong>: API key not configured
          <br><small style="opacity: 0.7;">?? Set your API key in Quick Switch panel (click ?? icon on ${segment.provider})</small>
        </div>
        <div class="ai-message-footer" style="margin-top: 8px; font-size: 11px; opacity: 0.5;">
          Step ${i + 1}/${segments.length} skipped
        </div>
      `;
      chat.appendChild(errorEl);
      // ?? Use scroll manager
      scrollChatToBottom();
      continue; // Skip to next provider
    }
    
    // Build message with context from previous responses
    let fullMessage = segment.message;
    if (!isFirst && previousResponses.length > 0) {
      const contextFromPrevious = previousResponses.map(p => 
        `[Previous response from ${p.provider}]:\n${p.response}`
      ).join('\n\n');
      
      fullMessage = `${contextFromPrevious}\n\n[Your question]: ${segment.message}`;
      console.log(`?? [CHAIN] Added context from ${previousResponses.length} previous response(s)`);
    }
    
    // Show typing indicator
    const typingId = `typing-chain-${i}`;
    const typingEl = document.createElement('div');
    typingEl.id = typingId;
    typingEl.className = 'ai-message assistant-message';
    typingEl.innerHTML = `
      <div class="ai-message-content" style="opacity: 0.7;">
        <span style="color: ${getProviderColor(segment.provider)}; font-weight: bold;">${segment.provider}</span>
        <span class="typing-dots"> is thinking...</span>
      </div>
    `;
    chat.appendChild(typingEl);
    // ?? Use scroll manager
    scrollChatToBottom();
    
    try {
      let aiResp: string;
      
      // Call the provider's API
      if (cfg.provider === 'gemini') {
        // Gemini API with retry for rate limits
        console.log(`?? [CHAIN] Calling Gemini...`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
        
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            const r = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: fullMessage }] }],
                generationConfig: { maxOutputTokens: cfg.maxTokens, temperature: cfg.temperature }
              })
            });
            
            if (r.status === 429) {
              // Rate limited - wait and retry
              retries++;
              const waitTime = 2000 * retries; // 2s, 4s, 6s
              console.log(`? [CHAIN] Gemini rate limited, waiting ${waitTime}ms (retry ${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            if (!r.ok) {
              const errText = await r.text();
              throw new Error(`Gemini API Error ${r.status}: ${errText.substring(0, 100)}`);
            }
            
            const data = await r.json();
            aiResp = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
            break; // Success, exit retry loop
            
          } catch (fetchError: any) {
            if (retries >= maxRetries - 1) throw fetchError;
            retries++;
          }
        }
        
        if (!aiResp) throw new Error('Gemini failed after retries');
        
      } else if (cfg.provider === 'claude') {
        // Claude API via Tauri with retry
        console.log(`?? [CHAIN] Calling Claude via Tauri...`);
        
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            aiResp = await invoke('call_claude_api', {
              request: {
                api_key: cfg.apiKey,
                model: cfg.model,
                message: fullMessage,
                max_tokens: cfg.maxTokens,
                temperature: cfg.temperature
              }
            });
            if (aiResp) break; // Success
            throw new Error('Claude returned empty response');
            
          } catch (claudeError: any) {
            // Check if rate limited
            if (claudeError?.message?.includes('429') || claudeError?.toString()?.includes('429')) {
              retries++;
              const waitTime = 2000 * retries;
              console.log(`? [CHAIN] Claude rate limited, waiting ${waitTime}ms (retry ${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            if (retries >= maxRetries - 1) throw claudeError;
            retries++;
          }
        }
        
        if (!aiResp) throw new Error('Claude failed after retries');
        
      } else {
        // OpenAI-compatible (Groq, DeepSeek, OpenAI, Operator) with retry
        console.log(`?? [CHAIN] Calling ${cfg.provider}...`);
        
        // ? PROXY INTERCEPT for chain calls
        if (cfg.apiKey === 'PROXY' && (window as any).smartAICall) {
          console.log(`?? [CHAIN] Routing ${cfg.provider} through proxy`);
          aiResp = await (window as any).smartAICall({
            provider: cfg.provider,
            apiKey: 'PROXY',
            model: cfg.model,
            message: fullMessage,
            maxTokens: cfg.maxTokens,
            temperature: cfg.temperature
          });
        } else {
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            // Try Tauri backend first
            aiResp = await invoke('call_ai_api', {
              request: {
                provider: cfg.provider,
                api_key: cfg.apiKey,
                base_url: cfg.apiBaseUrl,
                model: cfg.model,
                message: fullMessage,
                max_tokens: cfg.maxTokens,
                temperature: cfg.temperature
              }
            });
            if (aiResp) break; // Success
            throw new Error(`${cfg.provider} returned empty response`);
            
          } catch (tauriError: any) {
            // Check if rate limited
            if (tauriError?.message?.includes('429') || tauriError?.toString()?.includes('429')) {
              retries++;
              const waitTime = 2000 * retries;
              console.log(`? [CHAIN] ${cfg.provider} rate limited, waiting ${waitTime}ms (retry ${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            // Fallback to browser fetch
            console.log('?? [CHAIN] Falling back to browser fetch...');
            try {
              const r = await fetch(cfg.apiBaseUrl + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
                body: JSON.stringify({
                  model: cfg.model,
                  messages: [
                    { role: 'system', content: 'You are an AI coding assistant in Operator X02 Code IDE. Provide COMPLETE file contents in code blocks -- they are auto-applied to disk.' },
                    { role: 'user', content: fullMessage }
                  ],
                  max_tokens: cfg.maxTokens
                })
              });
              
              if (r.status === 429) {
                retries++;
                const waitTime = 2000 * retries;
                console.log(`? [CHAIN] ${cfg.provider} rate limited (browser), waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
              
              if (!r.ok) throw new Error(`API Error ${r.status}`);
              const d = await r.json();
              aiResp = d.choices?.[0]?.message?.content || 'No response';
              break; // Success
              
            } catch (fetchError) {
              if (retries >= maxRetries - 1) throw fetchError;
              retries++;
            }
          }
        }
        
        if (!aiResp) throw new Error(`${cfg.provider} failed after retries`);
        } // close non-proxy chain path
      }
      
      console.log(`? [CHAIN ${i + 1}] Got response from ${segment.provider} (${aiResp.length} chars)`);
      
      // Save response for next provider's context
      previousResponses.push({ provider: segment.provider, response: aiResp });
      
      // Remove typing indicator
      document.getElementById(typingId)?.remove();
      
      // Format and display response
      const formatted = formatAIResponse(aiResp);
      const aiMsgEl = document.createElement('div');
      aiMsgEl.className = 'ai-message assistant-message';
      aiMsgEl.innerHTML = `
        <div class="ai-message-content">${formatted}</div>
        <div class="ai-message-footer" style="margin-top: 8px; font-size: 11px; opacity: 0.7;">
          <span style="color: ${getProviderColor(segment.provider)}; font-weight: bold;">${segment.provider}</span>
          <span style="opacity: 0.5;"> ? Step ${i + 1}/${segments.length}</span>
        </div>
      `;
      chat.appendChild(aiMsgEl);
      // ?? Use scroll manager
      scrollChatToBottom();
      
      // ? Hide provider indicator after chain step completes
      if (typeof (window as any).hideProviderIndicator === 'function') {
        (window as any).hideProviderIndicator();
      }
      
    } catch (error: any) {
      console.error(`? [CHAIN ${i + 1}] ${segment.provider} failed:`, error);
      
      // Remove typing indicator
      document.getElementById(typingId)?.remove();
      
      // Get error message properly
      const errorMsg = error?.message || error?.toString() || 'Unknown error - check console';
      
      // Show error with helpful message
      const errorEl = document.createElement('div');
      errorEl.className = 'ai-message assistant-message';
      
      // Check if it's an API key issue
      const isApiKeyError = errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('apikey');
      const helpText = isApiKeyError 
        ? `<br><small style="opacity: 0.7;">?? Set your API key in Quick Switch panel (?? icon) or run: setApiKey("${segment.provider}", "YOUR_KEY")</small>`
        : '';
      
      errorEl.innerHTML = `
        <div class="ai-message-content" style="color: #ff6b6b;">
          ? <strong>${segment.provider}</strong> error: ${errorMsg}${helpText}
        </div>
        <div class="ai-message-footer" style="margin-top: 8px; font-size: 11px; opacity: 0.5;">
          Step ${i + 1}/${segments.length} failed
        </div>
      `;
      chat.appendChild(errorEl);
      // ?? Use scroll manager
      scrollChatToBottom();
      
      // ? Hide provider indicator on chain error
      if (typeof (window as any).hideProviderIndicator === 'function') {
        (window as any).hideProviderIndicator();
      }
      
      // Continue to next provider or stop?
      // For now, continue to try remaining providers
    }
    
    // Delay between providers to avoid rate limits
    if (!isLast) {
      console.log('? [CHAIN] Waiting 1.5s before next provider...');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('? [CHAIN] Completed all', segments.length, 'provider requests');
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to format AI response
function formatAIResponse(text: string): string {
  // Process code blocks first - handle multiple patterns
  let result = text;
  
  // Pattern 1: ```lang\n code \n``` (standard)
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const language = lang || 'plaintext';
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-${language}">${escapedCode}</code></pre>`;
  });
  
  // Pattern 2: ```lang code``` (no newline after lang) - common AI output
  result = result.replace(/```(\w+)([^`]+)```/g, (_, lang: string, code: string) => {
    const language = lang || 'plaintext';
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-${language}">${escapedCode}</code></pre>`;
  });
  
  // Pattern 3: ``` code ``` (no language)
  result = result.replace(/```\n?([\s\S]*?)```/g, (_, code: string) => {
    const escapedCode = escapeHtml(code.trim());
    return `<pre class="code-block-pending"><code class="language-plaintext">${escapedCode}</code></pre>`;
  });
  
  // Process inline code (but not already processed pre blocks)
  result = result.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  
  // Process bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Process italic (single asterisk, but not if part of bold)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Process headers
  result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Process unordered lists
  result = result.replace(/^- (.+)$/gm, '<li class="ul-item">$1</li>');
  result = result.replace(/(<li class="ul-item">[\s\S]*?<\/li>)(\s*<li class="ul-item">)/g, '$1$2');
  result = result.replace(/(<li class="ul-item">.*<\/li>)/s, '<ul>$1</ul>');
  
  // Process numbered lists  
  result = result.replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>');
  
  // Convert line breaks (but not inside pre blocks)
  const parts = result.split(/(<pre[^>]*>[\s\S]*?<\/pre>)/g);
  result = parts.map((part) => {
    if (part.startsWith('<pre')) return part;
    // Convert double newlines to paragraph breaks
    return part
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }).join('');
  
  // Clean up empty paragraphs
  result = result.replace(/<p>\s*<\/p>/g, '');
  result = result.replace(/<br>\s*<br>/g, '<br>');
  
  // Wrap loose text in paragraph if needed
  if (!result.match(/^<(h[1-6]|pre|ul|ol|p|div)/)) {
    result = '<p>' + result + '</p>';
  }
  
  return result;
}

const contextAwareSendHandler = async () => {
  const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!input) return;
  
  let msg = input.value.trim();

  // ?? CONVERSATION HISTORY CONTEXT
  if ((window as any).enhanceWithConversationHistory) {
    try {
      const result = (window as any).enhanceWithConversationHistory(msg);
      console.log('[?? ConvHistory] Context detected:', result?.analysis?.relationshipType || 'none');
    } catch (e) {
      console.warn('[ConvHistory] Error:', e);
    }
  }
  // ?? END CONVERSATION HISTORY CONTEXT
  
  // ? Store original user text BEFORE any context injection (for clean UI display)
  // ? FIX: Ensure msg is always a string, never a Promise/object
  if (typeof msg !== 'string') {
    if (msg && typeof msg === 'object' && typeof (msg as any).then === 'function') {
      try { msg = await (msg as any); } catch { msg = ''; }
    }
    msg = String(msg || '');
  }
  const originalUserText = msg;
  
  // ?? INTELLIGENT HISTORY SEARCH - AI decides when to search past conversations
  if ((window as any).enhanceMessageWithHistory) {
    try {
      // ? IMPORTANT: This is async - must await!
      const historyResult = await (window as any).enhanceMessageWithHistory(msg);
      if (historyResult.searchResult?.shouldSearch && historyResult.searchResult?.results?.length > 0) {
        console.log(`[?? AI History] Found ${historyResult.searchResult.results.length} relevant conversation(s)`);
        console.log(`[?? AI History] Reason: ${historyResult.searchResult.triggerReason}`);
        console.log(`[?? AI History] ? Context injected: ${historyResult.enhancedMessage.length - msg.length} chars`);
        // Prepend history context to message (only for AI, not displayed to user)
        msg = historyResult.enhancedMessage;
      }
    } catch (e) {
      console.warn('[AI History] Error:', e);
    }
  }
  // ?? END INTELLIGENT HISTORY SEARCH
  
  // Note: originalUserText is already captured above (before context injection)
  // This ensures users see their clean message while AI gets full context
  
  // ============================================================================
  // ? PROVIDER TAG DETECTION - Detect #provider tags and force that provider
  // ============================================================================
  // ============================================================================
  // PROVIDER TAG MAP - Synced with Quick Switch Panel
  // ============================================================================
  const PROVIDER_TAG_MAP: Record<string, string> = {
    // Operator X02 (DEFAULT)
    'x02': 'operator_x02',
    'operator_x02': 'operator_x02',
    'operator': 'operator_x02',
    // Groq
    'groq': 'groq',
    'grok': 'groq',
    'llama': 'groq',
    // OpenAI
    'openai': 'openai',
    'gpt': 'openai',
    'chatgpt': 'openai',
    // Deepseek
    'deepseek': 'deepseek',
    'ds': 'deepseek',
    // Claude
    'claude': 'claude',
    'anthropic': 'claude',
    // Gemini
    'gemini': 'gemini',
    'google': 'gemini',
  };
  
  // ============================================================================
  // ? MULTI-PROVIDER CHAINING - Detect multiple #provider tags
  // Format: "#groq question1 #claude question2" 
  // Second provider sees first provider's response as context
  // ============================================================================
  const multiProviderPattern = /#(\w+)\s+/g;
  const providerMatches = [...msg.matchAll(multiProviderPattern)];
  
  if (providerMatches.length > 1) {
    console.log(`?? [MULTI-PROVIDER] Detected ${providerMatches.length} provider tags - starting chained execution`);
    
    // Parse segments: [{provider: 'groq', message: 'question1'}, {provider: 'claude', message: 'question2'}]
    const segments: Array<{provider: string, message: string, tag: string}> = [];
    let lastIndex = 0;
    
    for (let i = 0; i < providerMatches.length; i++) {
      const match = providerMatches[i];
      const tag = match[1].toLowerCase();
      const mappedProvider = PROVIDER_TAG_MAP[tag];
      
      if (mappedProvider) {
        const startPos = match.index! + match[0].length;
        const endPos = i < providerMatches.length - 1 
          ? providerMatches[i + 1].index! 
          : msg.length;
        const segmentMessage = msg.substring(startPos, endPos).trim();
        
        segments.push({
          provider: mappedProvider,
          message: segmentMessage,
          tag: tag
        });
        console.log(`   ?? Segment ${i + 1}: #${tag} ? ${mappedProvider} - "${segmentMessage.substring(0, 30)}..."`);
      }
    }
    
    if (segments.length > 1) {
      // Execute chained requests
      await executeChainedProviderRequests(segments, input, originalUserText);
      return;  // Exit after chained execution
    }
  }
  // ============================================================================
  
  let forcedProvider: string | null = null;
  let cleanMessage = msg;
  
  // Check for single #provider tag at start of message
  const providerMatch = msg.match(/^#(\w+)\s+(.*)$/s);
  if (providerMatch) {
    const tag = providerMatch[1].toLowerCase();
    const mappedProvider = PROVIDER_TAG_MAP[tag];
    if (mappedProvider) {
      forcedProvider = mappedProvider;
      cleanMessage = providerMatch[2].trim();
      console.log(`?? [PROVIDER TAG] Detected #${tag} ? forcing provider: ${forcedProvider}`);
      console.log(`?? [PROVIDER TAG] Clean message: "${cleanMessage.substring(0, 50)}..."`);
      
      // Update msg to use clean message (without the tag)
      msg = cleanMessage;
    }
  }
  // ============================================================================
  
  // ? Check for attached files
  const chatFileDrop = (window as any).chatFileDrop;
  const attachedFilesContent = chatFileDrop?.getFilesForAI() || '';
  const attachedFilesUI = chatFileDrop?.getFilesForUI?.() || '';  // Collapsible cards
  const hasFiles = (chatFileDrop?.getFiles()?.length || 0) > 0;
  
  // Allow sending with just files
  if (!msg && !hasFiles) return;
  
  // ? Start file processing animation
  // 1. For files mentioned in message
  if (chatFileDrop?.startProcessing) {
    chatFileDrop.startProcessing(msg);
  }
  // 2. For ALL attached files (pending files being sent)
  if (hasFiles && chatFileDrop?.startAttachedProcessing) {
    chatFileDrop.startAttachedProcessing();
  }
  
  // Add file content to message FOR AI (full content)
  if (attachedFilesContent) {
    if (!msg) msg = 'Please analyze these files:';
    msg = msg + attachedFilesContent;
    console.log('?? Added attached files to message');
  }
  
  // ? ADD PDF CONTEXT from pdfContextManager
  // ? FIX: Type guard against Promise objects being concatenated as "[object Promise]"
  const pdfMgr = (window as any).pdfContextManager;
  let pdfContext: any = pdfMgr?.getPdfContextSync?.() || '';
  if (pdfContext && typeof pdfContext === 'object' && typeof pdfContext.then === 'function') {
    try { pdfContext = await pdfContext; } catch { pdfContext = ''; }
  }
  if (typeof pdfContext === 'string' && pdfContext.trim()) {
    msg = pdfContext + '\n\n---\n**User Question:**\n' + msg;
    console.log('?? Added PDF context:', pdfContext.length, 'chars');
  }
  
  // ? NEW: Auto-enhance with file context for follow-up questions
  // ? FIX: Type guard against Promise return value
  if (!hasFiles && msg && chatFileDrop?.enhanceWithContext) {
    let enhanced: any = chatFileDrop.enhanceWithContext(msg);
    if (enhanced && typeof enhanced === 'object' && typeof enhanced.then === 'function') {
      try { enhanced = await enhanced; } catch { enhanced = msg; }
    }
    if (typeof enhanced === 'string' && enhanced !== msg) {
      msg = enhanced;
      console.log('?? Auto-added file context from memory');
    }
  }
  
  // ? SELECTION CONTEXT - Include highlighted code in message
  try {
    const editor = (window as any).monaco?.editor?.getEditors()?.[0];
    if (editor) {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && !selection.isEmpty()) {
        const selectedText = model.getValueInRange(selection);
        if (selectedText.trim()) {
          const lang = model.getLanguageId() || 'plaintext';
          const fname = model.uri?.path?.split('/').pop() || 'file';
          const selectionContext = `\n[?? SELECTED CODE in "${fname}" - Lines ${selection.startLineNumber}-${selection.endLineNumber}]\n\`\`\`${lang}\n${selectedText}\n\`\`\`\n`;
          msg = selectionContext + '\n**User Question:** ' + msg + '\n\nFocus ONLY on the selected code above.';
          console.log('?? Added selection context to message');
        }
      }
    }
  } catch (e) {
    console.warn('Selection context error:', e);
  }
    
  console.log('?? [CONTEXT-FIX] Sending with IDE context...');
    
  console.log('?? [CONTEXT-FIX] Sending with IDE context...');
    input.value = '';
    input.style.height = 'auto';
    
    const chat = document.querySelector('.ai-chat-container') as HTMLElement;
    if (!chat) return;
    
    // Collect IDE context
    let context = '';
    let fileName = 'Untitled';
    let language = 'plaintext';
    
    try {
      // ========================================
      // ?? CURRENT FOLDER CONTEXT (PRIORITY!)
      // ========================================
      const currentFolder = (window as any).__currentFolder;
      if (currentFolder && currentFolder.files?.length > 0) {
        const folderFiles = currentFolder.files || [];
        
        context += `[?? Current Project Folder]
?? Project: ${currentFolder.name}
?? Path: ${currentFolder.path}
?? Files (${folderFiles.length} total):
${folderFiles.slice(0, 30).map((f: string) => '  ? ' + f).join('\n')}
${folderFiles.length > 30 ? '  ... and ' + (folderFiles.length - 30) + ' more files' : ''}

`;
        
        // Include file contents if available
        const fileContents = currentFolder.fileContents || {};
        const contentKeys = Object.keys(fileContents);
        if (contentKeys.length > 0) {
          context += `[?? File Contents (${contentKeys.length} files read from disk)]
`;
          for (const fileName of contentKeys.slice(0, 4)) {
            const content = fileContents[fileName];
            const ext = fileName.split('.').pop() || 'txt';
            const lines = content.split('\n').length;
            const truncated = content.length > 2000 
              ? content.substring(0, 2000) + '\n... (truncated)'
              : content;
            context += `
??? ${fileName} (${lines} lines) ???
\`\`\`${ext}
${truncated}
\`\`\`
`;
          }
          context += '\n';
          console.log('?? [CONTEXT-FIX] Including contents of', contentKeys.length, 'files');
        }
        
        console.log('?? [CONTEXT-FIX] Including current folder:', currentFolder.name);
      }
      
      // ========================================
      // PROJECT CREATION CONTEXT (only if no currentFolder)
      // ========================================
      const lastProject = (window as any).__lastProject;
      if (lastProject && !currentFolder) {
        const timeSinceCreation = Date.now() - (lastProject.timestamp || 0);
        const minutesAgo = Math.floor(timeSinceCreation / 60000);
        
        // Include project context if created recently (within 60 minutes)
        if (minutesAgo < 60) {
          const projectFiles = lastProject.files || [];
          context += `[?? Recently Created Project]
?? Project: ${lastProject.projectName}
?? Template: ${lastProject.template}
?? Location: ${lastProject.projectPath}
? Created: ${minutesAgo < 1 ? 'just now' : minutesAgo + ' minutes ago'}
?? Files Created (${projectFiles.length} total):
${projectFiles.slice(0, 20).map((f: string) => '  ? ' + f).join('\n')}
${projectFiles.length > 20 ? '  ... and ' + (projectFiles.length - 20) + ' more files' : ''}

`;
          console.log('?? [CONTEXT-FIX] Including project context:', lastProject.projectName);
        }
      }
      
      // ========================================
      // ?? RECENTLY CREATED FILE CONTEXT  
      // ========================================
      const lastCreatedFile = (window as any).__lastCreatedFile;
      if (lastCreatedFile) {
        const timeSinceFile = Date.now() - (lastCreatedFile.timestamp || 0);
        const minutesAgo = Math.floor(timeSinceFile / 60000);
        
        if (minutesAgo < 30) {
          context += `[?? Recently Created File]
?? File: ${lastCreatedFile.name}
?? Path: ${lastCreatedFile.path}
? Created: ${minutesAgo < 1 ? 'just now' : minutesAgo + ' minutes ago'}

`;
          console.log('?? [CONTEXT-FIX] Including file context:', lastCreatedFile.name);
        }
      }
      
      // ========================================
      // EDITOR CONTEXT
      // ========================================
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        const editors = monaco.editor.getEditors();
        if (editors?.[0]) {
          const model = editors[0].getModel();
          if (model) {
            fileName = model.uri.toString().split('/').pop() || 'Untitled';
            language = model.getLanguageId() || 'plaintext';
            const code = model.getValue();
            const lines = model.getLineCount();
            
            const sel = editors[0].getSelection();
            let selected = '';
            if (sel && !sel.isEmpty()) {
              selected = model.getValueInRange(sel);
            }
            
            // Only add editor context if there's actual code
            if (code && code.trim().length > 0) {
              context += `[IDE Editor]
?? Open File: ${fileName}
?? Language: ${language}
?? Lines: ${lines}
${selected ? `?? Selected:\n\`\`\`${language}\n${selected}\n\`\`\`\n` : ''}
?? Code (first 100 lines):
\`\`\`${language}
${code.split('\n').slice(0, 100).join('\n')}
\`\`\`

`;
            }
          }
        }
      }
      
      const projPath = (window as any).currentProjectPath || 
                      (window as any).__currentFolderPath ||
                      localStorage.getItem('lastProjectPath');
      if (projPath) context += `??? Current Folder: ${projPath}\n`;
    } catch (e) { 
      console.warn('Context collection error:', e);
    }
    

    // ?? Inject Surgical Engine awareness when autonomous mode is ON
    const autonomousEnabled = localStorage.getItem('autonomousModeEnabled') === 'true';
    if (autonomousEnabled && typeof SURGICAL_ENGINE_PROMPT !== 'undefined') {
      context = SURGICAL_ENGINE_PROMPT + '\n' + context;
      console.log('?? [Context] Surgical Engine awareness injected');
    }

    // ?? Inject IDE Script system prompt when script mode is enabled
    if (isScriptModeEnabled()) {
      const projPath = (window as any).currentProjectPath || 
                       (window as any).__currentFolderPath ||
                       localStorage.getItem('lastProjectPath') || '';
      const scriptPrompt = getIdeScriptSystemPrompt(projPath);

      if (scriptPrompt) {
        context = scriptPrompt + '\n' + context;
        console.log('?? [Context] IDE Script prompt injected (mode: ' + localStorage.getItem('ideScriptMode') + ')');
    // WEB UI MODE - injected by patch (FIX2_DOM_MSG)
    try {
      const _domMsg = (
        // Try the message variable in scope first (most reliable)
        (typeof msg !== 'undefined' ? msg : '') ||
        (typeof message !== 'undefined' ? message : '') ||
        (typeof userMessage !== 'undefined' ? userMessage : '') ||
        // Fallback: read last user message from chat DOM
        document.querySelector('.user-message:last-child')?.textContent ||
        document.querySelector('[data-role="user"]:last-child')?.textContent ||
        document.querySelector('.human-message:last-child')?.textContent ||
        document.querySelector('[class*="user-msg"]:last-child')?.textContent ||
        // Last resort: input field (may be cleared already)
        (document.querySelector('#ai-assistant-input') as HTMLTextAreaElement)?.value ||
        ''
      ).trim();
      const _webUiFn = (window as any).detectWebUIRequest;
      if (typeof _webUiFn === 'function' && _domMsg && _webUiFn(_domMsg)) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected for: ' + _domMsg.substring(0, 50));
      } else if (detectWebUIRequestFromDOM()) {
        context += (window as any).WEB_UI_GENERATION_PROMPT || '';
        console.log('[WebUI Mode] UI generation rules injected via DOM detection');
      }
    } catch (_webUiErr) { /* silent */ }
      }
    }

    let fullMessage = context ? `${context}\n[User]\n${msg}` : msg;

// Add project context for follow-up questions
const projectHelper = (window as any).projectContextHelper;
if (projectHelper?.shouldInclude?.(msg)) {
  const pc = projectHelper.get?.();
  if (pc) {
    fullMessage = `[PROJECT: ${pc.projectName}]\nFiles: ${pc.files.map((f:any)=>f.name).join(', ')}\nAnalysis: ${pc.analysisResult.substring(0,1500)}\n---\n${fullMessage}`;
    console.log('?? Added project context');
  }
}

// ?? TERMINAL CONTEXT: Add terminal logs if enabled
try {
  const terminalCtx = (window as any).terminalContext;
  if (terminalCtx?.isEnabled?.()) {
    fullMessage = terminalCtx.enhance(fullMessage);
    console.log('?? [CONTEXT-FIX] Added terminal context to message');
  }
} catch (termErr) {
  console.warn('Terminal context error:', termErr);
}

// ?? AI FILE EXPLORER: Smart auto-include with better detection
try {
  const aiFileExplorer = (window as any).aiFileExplorer;
  if (aiFileExplorer && !fullMessage.includes('[?? AI File Explorer')) {
    const msgLower = msg.toLowerCase();
    
    // ============================================
    // CHECK: Is AI Search mode enabled?
    // When ON: ALL messages search project files
    // ============================================
    const aiSearchEnabled = localStorage.getItem('aiFileExplorerEnabled') === 'true';
    
    let shouldIncludeFiles = false;
    let matchedProjectFiles: any[] = [];
    
    // ?? Start explorer animation if AI Search is enabled
    if (aiSearchEnabled && (window as any).startExplorerScanAnimation) {
      (window as any).startExplorerScanAnimation();
    }
    
    if (aiSearchEnabled) {
      // ============================================
      // AI SEARCH MODE: ON
      // Always search for relevant files
      // ============================================
      console.log('?? AI Search Mode: ON - searching project files...');
      
      // ?? Show scanning indicator at bottom of IDE
      if ((window as any).showAIScanningIndicator) {
        (window as any).showAIScanningIndicator('Scanning project...');
      }
      if ((window as any).updateAIScanningStage) {
        (window as any).updateAIScanningStage('Checking project file list...');
      }
      
      // Search based on message content
      // -- INTENT GUARD: skip file search for pure conversational messages --
      const _conversationalPatterns = [
        /^(hi|hello|hey|ok|okay|thanks|thank you|bye|goodbye|yes|no|yep|nope|sure|got it|i see|understood|great|good|nice|cool|wow|lol|haha)\b/i,
        /\b(what (time|date|day|hour|minute|second)|what.*discuss|what.*talk|when.*discuss|when.*talk|yesterday|last week|last month|summary|summarize|summarise)\b/i,
        /^(who are you|what are you|tell me about yourself|what can you do|how are you)\b/i,
        /\b(in minutes|in hours|in seconds|how long ago|time ago|timestamp|conversation history)\b/i
      ];
      const _isConversational = !((window as any).currentProjectPath || '').trim() ||
        _conversationalPatterns.some(p => p.test(msg.trim()));
      if (_isConversational) {
        console.log('[Intent] Conversational message - skipping file search');
        matchedProjectFiles = [];
        shouldIncludeFiles = false;
      } else {

      matchedProjectFiles = await aiFileExplorer.findRelated(msg);
      shouldIncludeFiles = matchedProjectFiles && matchedProjectFiles.length > 0;
      }
      
      // ?? Highlight all found files as "scanning"
      if (shouldIncludeFiles) {
        matchedProjectFiles.forEach((file: any) => {
          if ((window as any).highlightFileScanning) {
            (window as any).highlightFileScanning(file.path);
          }
        });
      }
      
    } else {
      // ============================================
      // AI SEARCH MODE: OFF
      // INTELLIGENT DETECTION: Project files vs Open code
      // ============================================
      console.log('?? AI Search Mode: OFF - using intelligent detection');
      shouldIncludeFiles = false;
      
      // ============================================
      // SMART KEYWORDS DETECTION
      // ============================================
      
      // Keywords indicating user is asking about PROJECT FILES/STRUCTURE
      const projectKeywords = [
        'project', 'files', 'folder', 'how many', 'structure', 'list', 
        'directory', 'all files', 'file count', 'what files', 'show files',
        'project structure', 'file tree', 'folders', 'workspace'
      ];
      
      // Keywords indicating user is asking about CURRENTLY OPEN CODE
      const openCodeKeywords = [
        'this code', 'this file', 'current file', 'current code', 'open file',
        'explain', 'fix', 'error', 'bug', 'refactor', 'improve', 'optimize',
        'what does', 'how does', 'why', 'help me', 'review', 'debug',
        'add', 'remove', 'change', 'modify', 'update', 'implement',
        'function', 'class', 'method', 'variable', 'import', 'export',
        'typescript', 'javascript', 'react', 'component', 'hook',
        'line', 'syntax', 'compile', 'build', 'run', 'test'
      ];
      
      const isAskingAboutProject = projectKeywords.some(w => msgLower.includes(w));
      const isAskingAboutOpenCode = openCodeKeywords.some(w => msgLower.includes(w));
      
      // ============================================
      // CASE 1: User asking about OPEN CODE in editor
      // ? Include current editor content, no AI Search prompt needed
      // ============================================
      if (isAskingAboutOpenCode && !isAskingAboutProject) {
        console.log('??? User asking about OPEN CODE - including editor content');
        
        // Get current editor content
        const editor = (window as any).monaco?.editor?.getEditors()?.[0];
        const currentFile = (window as any).tabManager?.currentFile;
        
        if (editor) {
          const model = editor.getModel();
          if (model) {
            const code = model.getValue();
            const fileName = currentFile?.name || model.uri?.path?.split('/').pop() || 'current file';
            const language = model.getLanguageId() || 'plaintext';
            
            // Get selected text if any
            const selection = editor.getSelection();
            let selectedCode = '';
            if (selection && !selection.isEmpty()) {
              selectedCode = model.getValueInRange(selection);
            }
            
            if (selectedCode) {
              // User has selected specific code
              fullMessage += `\n\n[??? SELECTED CODE in ${fileName}]\n\`\`\`${language}\n${selectedCode}\n\`\`\`\n`;
              fullMessage += `\n[?? FULL FILE CONTEXT - ${fileName}]\n\`\`\`${language}\n${code.substring(0, 3000)}${code.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\``;
              console.log('? Added selected code + file context');
            } else if (code) {
              // Include full file
              fullMessage += `\n\n[??? CURRENTLY OPEN FILE: ${fileName}]\n\`\`\`${language}\n${code.substring(0, 4000)}${code.length > 4000 ? '\n... (truncated)' : ''}\n\`\`\``;
              console.log('? Added current open file content');
            }
            
            // Add cursor position context
            const position = editor.getPosition();
            if (position) {
              fullMessage += `\n*Cursor at line ${position.lineNumber}, column ${position.column}*`;
            }
          }
        } else {
          fullMessage += `\n\n*[No file currently open in editor. Please open a file first.]*`;
          console.log('?? No editor content available');
        }
        
      // ============================================
      // CASE 2: User asking about PROJECT FILES/STRUCTURE  
      // ? Show basic info + suggest enabling AI Search
      // ============================================
      } else if (isAskingAboutProject) {
        console.log('?? User asking about PROJECT FILES - providing basic info + suggest AI Search');
        
        const projectPath = (window as any).currentFolderPath || '';
        const projectName = projectPath.split(/[/\\]/).pop() || '';
        
        // Count files from DOM even when search is OFF
        let fileCount = 0;
        const fileList: string[] = [];
        document.querySelectorAll('[data-path]').forEach(el => {
          const p = el.getAttribute('data-path') || '';
          if (p.includes('.') && !p.includes('node_modules') && p.split(/[/\\]/).length >= 4) {
            const fileName = p.split(/[/\\]/).pop() || '';
            if (fileName.includes('.') && !fileName.startsWith('.git')) {
              fileCount++;
              if (fileList.length < 5) fileList.push(fileName); // Show first 5 files
            }
          }
        });
        
        // ============================================
        // OPTION 1 & 2: Basic info + Auto-suggest in AI context
        // ============================================
        if (projectName || fileCount > 0) {
          fullMessage += `\n\n[?? Project Quick Info - AI Search OFF]\n`;
          if (projectName) fullMessage += `**Project:** ${projectName}\n`;
          if (projectPath) fullMessage += `**Path:** \`${projectPath}\`\n`;
          if (fileCount > 0) {
            fullMessage += `**Files found:** ${fileCount}\n`;
            if (fileList.length > 0) {
              fullMessage += `**Sample files:** ${fileList.join(', ')}${fileCount > 5 ? '...' : ''}\n`;
            }
          }
          fullMessage += `\n?? *AI Search is currently OFF. For detailed file contents and better project analysis, the user can enable it using the ?? toggle.*`;
          console.log('? Added basic project info (AI Search OFF)');
        }
        
        // ============================================
        // OPTION 3: Visual prompt in chat UI - Show AFTER AI response
        // Auto-dismiss when AI response is complete
        // ============================================
        const chatContainer = document.querySelector('.ai-chat-container') || 
                             document.querySelector('#chat-container') ||
                             document.querySelector('.chat-messages') as HTMLElement;
        
        if (chatContainer) {
          const showEnablePrompt = () => {
            // Check if prompt already exists (don't duplicate)
            const existingPrompt = document.getElementById('ai-search-enable-prompt');
            if (existingPrompt) return;
            
            // Check if AI Search is still OFF (user might have enabled it)
            if (localStorage.getItem('aiFileExplorerEnabled') === 'true') return;
            if (localStorage.getItem('aiFileExplorerEnabled') === 'true') return;
            
            const promptEl = document.createElement('div');
            promptEl.id = 'ai-search-enable-prompt';
            promptEl.className = 'ai-search-suggestion-prompt';
            promptEl.innerHTML = `
              <div style="
                background: linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(79, 195, 247, 0.05));
                border: 1px solid rgba(79, 195, 247, 0.3);
                border-left: 4px solid #4fc3f7;
                padding: 12px 16px;
                margin: 12px 0;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideIn 0.3s ease-out;
                position: relative;
              ">
                <div style="font-size: 24px;">??</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #4fc3f7; margin-bottom: 4px;">
                    Enable AI Project Search?
                  </div>
                  <div style="font-size: 12px; color: #aaa;">
                    Get detailed file analysis, code context, and smarter answers about your project.
                  </div>
                </div>
                <button id="enable-ai-search-btn" style="
                  background: linear-gradient(135deg, #4fc3f7, #29b6f6);
                  border: none;
                  padding: 8px 16px;
                  border-radius: 6px;
                  color: #000;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  white-space: nowrap;
                " onmouseover="this.style.transform='scale(1.05)'" 
                   onmouseout="this.style.transform='scale(1)'">
                  Enable Now
                </button>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <button style="
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 6px 10px;
                    border-radius: 4px;
                    color: #888;
                    cursor: pointer;
                    font-size: 11px;
                  " onclick="this.closest('#ai-search-enable-prompt').remove()">
                    Dismiss
                  </button>
                  <span id="ai-search-countdown" style="
                    font-size: 10px;
                    color: #666;
                    font-family: monospace;
                  ">5s</span>
                </div>
              </div>
              <style>
                @keyframes slideIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeOut {
                  from { opacity: 1; transform: translateY(0); }
                  to { opacity: 0; transform: translateY(-10px); }
                }
              </style>
            `;
            
            chatContainer.appendChild(promptEl);
            promptEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
            
            // Add click handler for Enable button
            const enableBtn = document.getElementById('enable-ai-search-btn');
            if (enableBtn) {
              enableBtn.addEventListener('click', () => {
                // Clear countdown interval
                if ((promptEl as any).__countdownInterval) {
                  clearInterval((promptEl as any).__countdownInterval);
                }
                
                // Enable AI Search via localStorage
                localStorage.setItem('aiFileExplorerEnabled', 'true');
                
                // ? FIX: Also enable Auto Mode to sync with AI Project Search
                localStorage.setItem('autonomousMode', 'true');
                
                // Try to activate Auto Mode via the autonomousCoding module
                try {
                  // Method 1: Direct function call via window.setAutoApply
                  if ((window as any).setAutoApply) {
                    (window as any).setAutoApply(true);
                    console.log('? Auto Mode enabled via window.setAutoApply');
                  }
                  // Method 2: Try setAutoApplyState (newer API)
                  else if ((window as any).setAutoApplyState) {
                    (window as any).setAutoApplyState(true);
                    console.log('? Auto Mode enabled via window.setAutoApplyState');
                  }
                  // Method 3: Try toggleAutoApply if not already on
                  else if ((window as any).toggleAutoApply) {
                    const isCurrentlyOn = (window as any).isAutoApplyEnabled?.() || 
                                         (window as any).getAutoApplyState?.() || false;
                    if (!isCurrentlyOn) {
                      (window as any).toggleAutoApply();
                      console.log('? Auto Mode enabled via window.toggleAutoApply');
                    }
                  }
                  
                  // Dispatch event for autonomous module listeners
                  window.dispatchEvent(new CustomEvent('autoModeToggled', { detail: { enabled: true }}));
                  
                  // ? Update Auto Mode toggle button UI - ID: autonomous-mode-toggle
                  const autoToggleBtn = document.getElementById('autonomous-mode-toggle');
                  if (autoToggleBtn) {
                    autoToggleBtn.classList.add('active', 'auto-active');
                    autoToggleBtn.setAttribute('title', 'Auto Mode: ON');
                    (autoToggleBtn as HTMLElement).style.color = '#10b981';
                    console.log('? Auto Mode button UI updated (#autonomous-mode-toggle)');
                  }
                  
                  // Also sync any class-based .autonomous-mode-toggle buttons
                  document.querySelectorAll('.autonomous-mode-toggle').forEach(btn => {
                    btn.classList.add('active');
                  });
                  
                  // Also sync .aca-auto-toggle buttons
                  document.querySelectorAll('.aca-auto-toggle').forEach(btn => {
                    btn.classList.add('active');
                    btn.setAttribute('title', 'Auto-Apply ON');
                  });
                  
                  // Call syncAutoModeButton if available
                  if ((window as any).syncAutoModeButton) {
                    (window as any).syncAutoModeButton();
                  }
                  
                } catch (e) {
                  console.warn('[EnableNow] Could not enable Auto Mode:', e);
                }
                
                // Try to find and click the toggle button to update UI
                const toggleBtn = document.querySelector('[data-ai-search-toggle]') ||
                                 document.getElementById('ai-search-toggle') ||
                                 document.querySelector('.ai-search-toggle') ||
                                 document.querySelector('.file-explorer-toggle');
                
                if (toggleBtn) {
                  (toggleBtn as HTMLElement).click();
                }
                
                // ? Update Project Search button UI - ID: ai-search-btn
                const aiSearchBtn = document.getElementById('ai-search-btn');
                if (aiSearchBtn) {
                  aiSearchBtn.classList.add('active', 'ai-active');
                  aiSearchBtn.setAttribute('title', 'Project Search: ON');
                  (aiSearchBtn as HTMLElement).style.color = '#10b981';
                  console.log('? Project Search button UI updated (#ai-search-btn)');
                }
                
                // Also update ai-search-tool-btn if exists
                const aiSearchToolBtn = document.getElementById('ai-search-tool-btn');
                if (aiSearchToolBtn) {
                  aiSearchToolBtn.classList.add('active');
                  aiSearchToolBtn.setAttribute('title', 'AI Project: ON');
                }
                
                // Dispatch event for any listeners
                window.dispatchEvent(new CustomEvent('aiSearchToggled', { detail: { enabled: true }}));
                
                // Update status bar toggle if exists
                const statusToggle = document.querySelector('#ai-search-status-toggle');
                if (statusToggle) {
                  statusToggle.textContent = '? AI Project Search: ON';
                  (statusToggle as HTMLElement).style.color = '#4fc3f7';
                }
                
                // Show success message
                promptEl.innerHTML = `
                  <div style="
                    background: rgba(76, 175, 80, 0.15);
                    border: 1px solid rgba(76, 175, 80, 0.3);
                    border-left: 4px solid #4caf50;
                    padding: 12px 16px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                  ">
                    <div style="font-size: 24px;">?</div>
                    <div style="color: #4caf50; font-weight: 500;">
                      AI Project Search + Auto Mode enabled! Ask your question again for detailed results.
                    </div>
                  </div>
                `;
                // Auto-remove after 5 seconds
                setTimeout(() => promptEl.remove(), 5000);
                console.log('? AI Search + Auto Mode enabled via prompt button');
              });
            }
            
            console.log('? AI Search enable prompt shown in chat');
            
            // ============================================
            // COUNTDOWN TIMER: Visual countdown before auto-dismiss
            // ============================================
            let countdown = 5;
            const countdownEl = document.getElementById('ai-search-countdown');
            const countdownInterval = setInterval(() => {
              countdown--;
              if (countdownEl) {
                countdownEl.textContent = `${countdown}s`;
              }
              if (countdown <= 0) {
                clearInterval(countdownInterval);
                // Auto-dismiss with fade animation
                const prompt = document.getElementById('ai-search-enable-prompt');
                if (prompt) {
                  prompt.style.animation = 'fadeOut 0.3s ease-out forwards';
                  setTimeout(() => prompt.remove(), 300);
                  console.log('? AI Search prompt auto-dismissed (countdown)');
                }
              }
            }, 1000);
            
            // Store interval so we can clear it if user clicks Enable/Dismiss
            (promptEl as any).__countdownInterval = countdownInterval;
          };
          
          // Show prompt 1.5s after message sent
          setTimeout(() => {
            showEnablePrompt();
          }, 1500);
          
        } else {
          console.warn('?? Chat container not found for AI Search prompt');
        }
      }
    }
    
    if (shouldIncludeFiles && matchedProjectFiles && matchedProjectFiles.length > 0) {
      console.log('?? AI File Explorer: Found', matchedProjectFiles.length, 'relevant files');
      
      // ?? Update scanning indicator with found count
      if ((window as any).updateAIScanningStage) {
        (window as any).updateAIScanningStage(`Analyzing ${matchedProjectFiles.length} file(s)...`);
      }
      
      // ============================================
      // PHASE 1: Always include PROJECT TREE STRUCTURE
      // This is lightweight and gives AI full architecture view
      // ============================================
      let fileContext = '\n\n[?? PROJECT STRUCTURE]\n';
      
      // Get all project files for tree view
      const allProjectFiles = aiFileExplorer.getFiles?.() || [];
      const projectPath = (window as any).currentFolderPath || localStorage.getItem('ide_last_project_path') || '';
      const projectName = projectPath.split(/[/\\]/).pop() || 'Project';
      
      fileContext += `?? **${projectName}** (${allProjectFiles.length} files)\n`;
      fileContext += '```\n';
      
      // Build tree structure from all files
      const tree: Record<string, any> = {};
      for (const file of allProjectFiles) {
        const relativePath = file.path.replace(projectPath, '').replace(/^[/\\]/, '');
        const parts = relativePath.split(/[/\\]/);
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            // File
            current[part] = null;
          } else {
            // Folder
            if (!current[part]) current[part] = {};
            current = current[part];
          }
        }
      }
      
      // Render tree
      const renderTree = (node: any, prefix = '', isLast = true): string => {
        let result = '';
        const entries = Object.entries(node).sort((a, b) => {
          // Folders first
          const aIsFolder = a[1] !== null;
          const bIsFolder = b[1] !== null;
          if (aIsFolder && !bIsFolder) return -1;
          if (!aIsFolder && bIsFolder) return 1;
          return a[0].localeCompare(b[0]);
        });
        
        entries.forEach(([name, children], index) => {
          const isLastItem = index === entries.length - 1;
          const connector = isLastItem ? '+-- ' : '+-- ';
          const icon = children !== null ? '??' : '??';
          result += `${prefix}${connector}${icon} ${name}\n`;
          
          if (children !== null) {
            const newPrefix = prefix + (isLastItem ? '    ' : '?   ');
            result += renderTree(children, newPrefix, isLastItem);
          }
        });
        return result;
      };
      
      fileContext += renderTree(tree);
      fileContext += '```\n';
      
      // ============================================
      // PHASE 2: Smart content reading with BUDGET
      // Read most relevant files up to character limit
      // ============================================
      const MAX_CONTENT_CHARS = 15000; // ~3750 tokens budget for file contents
      const MIN_CHARS_PER_FILE = 500;  // Minimum chars to read per file
      let totalCharsUsed = 0;
      const includedFiles: string[] = [];
      const skippedFiles: string[] = [];
      const importedFiles: string[] = [];
      
      fileContext += '\n[?? FILE CONTENTS - Most Relevant]\n';
      
      // Sort by score and process
      const sortedFiles = [...matchedProjectFiles].sort((a, b) => b.score - a.score);
      
      // ?? Update scanning indicator for reading phase
      if ((window as any).updateAIScanningStage) {
        (window as any).updateAIScanningStage(`Reading ${sortedFiles.length} file(s)...`);
      }
      
      for (const file of sortedFiles) {
        if (includedFiles.includes(file.path)) continue;
        
        // Check budget
        const remainingBudget = MAX_CONTENT_CHARS - totalCharsUsed;
        if (remainingBudget < MIN_CHARS_PER_FILE) {
          skippedFiles.push(file.name);
          continue;
        }
        
        // ?? Highlight file being read
        if ((window as any).highlightFileReading) {
          (window as any).highlightFileReading(file.path, 0);
        }
        
        // ?? Update scanning indicator with current file name
        if ((window as any).updateAIScanningFile) {
          (window as any).updateAIScanningFile(file.name);
        }
        
        // Calculate how much to read from this file
        const charsToRead = Math.min(4000, remainingBudget);
        const content = await aiFileExplorer.read(file.path, charsToRead);
        
        // ?? Mark file as indexed after reading
        if ((window as any).highlightFileIndexed) {
          (window as any).highlightFileIndexed(file.path);
        }
        
        if (content && typeof content === 'string' && !content.startsWith('// Could not read')) {
          const actualLength = content.length;
          totalCharsUsed += actualLength;
          includedFiles.push(file.path);
          
          // Determine language from extension
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          const langMap: Record<string, string> = {
            'ts': 'typescript', 'tsx': 'tsx', 'js': 'javascript', 'jsx': 'jsx',
            'json': 'json', 'css': 'css', 'scss': 'scss', 'html': 'html',
            'md': 'markdown', 'py': 'python', 'rs': 'rust', 'go': 'go',
            'java': 'java', 'c': 'c', 'cpp': 'cpp', 'h': 'c', 'vue': 'vue'
          };
          const language = langMap[ext] || ext || 'plaintext';
          
          // Check if content was truncated
          const wasTruncated = actualLength >= charsToRead - 10;
          const truncateNote = wasTruncated ? ' *(truncated)*' : '';
          
          fileContext += `\n?? **${file.name}**${truncateNote}\n\`\`\`${language}\n${content}\n\`\`\`\n`;
          
          // Find imports for related files
          const importPatterns = [
            /import\s+.*?\s+from\s+['"]\.?\/?([^'"]+)['"]/g,
            /require\s*\(\s*['"]\.?\/?([^'"]+)['"]\s*\)/g,
            /import\s+['"]\.?\/?([^'"]+)['"]/g,
          ];
          
          for (const pattern of importPatterns) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
              let importPath = match[1];
              if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
              const importName = importPath.split('/').pop() || '';
              if (importName && !importedFiles.includes(importName)) {
                importedFiles.push(importName);
              }
            }
          }
        } else {
          skippedFiles.push(file.name);
        }
      }
      
      // Include some imported files if budget allows
      if (importedFiles.length > 0 && totalCharsUsed < MAX_CONTENT_CHARS - 1000) {
        console.log('?? Found imports:', importedFiles);
        for (const importName of importedFiles.slice(0, 3)) {
          if (totalCharsUsed >= MAX_CONTENT_CHARS - MIN_CHARS_PER_FILE) break;
          
          const found = await aiFileExplorer.search(importName);
          if (found && found.length > 0 && !includedFiles.includes(found[0].path)) {
            if ((window as any).highlightFileReading) {
              (window as any).highlightFileReading(found[0].path, 0);
            }
            
            const remainingBudget = MAX_CONTENT_CHARS - totalCharsUsed;
            const importContent = await aiFileExplorer.read(found[0].path, Math.min(2000, remainingBudget));
            
            // ?? Mark import file as indexed after reading
            if ((window as any).highlightFileIndexed) {
              (window as any).highlightFileIndexed(found[0].path);
            }
            
            if (importContent && typeof importContent === 'string' && !importContent.startsWith('// Could not read')) {
              totalCharsUsed += importContent.length;
              includedFiles.push(found[0].path);
              const ext = found[0].name.split('.').pop()?.toLowerCase() || '';
              const langMap: Record<string, string> = {
                'ts': 'typescript', 'tsx': 'tsx', 'js': 'javascript', 'jsx': 'jsx',
                'json': 'json', 'css': 'css', 'scss': 'scss', 'html': 'html'
              };
              const language = langMap[ext] || ext || 'plaintext';
              fileContext += `\n?? **${found[0].name}** *(imported)*\n\`\`\`${language}\n${importContent}\n\`\`\`\n`;
            }
          }
        }
      }
      
      // ============================================
      // PHASE 3: Report what was NOT read
      // AI can offer to read more if user wants
      // ============================================
      const unreadFiles = sortedFiles
        .filter(f => !includedFiles.includes(f.path))
        .map(f => f.name);
      
      if (unreadFiles.length > 0 || skippedFiles.length > 0) {
        const allUnread = [...new Set([...unreadFiles, ...skippedFiles])];
        fileContext += `\n?? **Files found but not fully read** (${allUnread.length} files):\n`;
        fileContext += allUnread.slice(0, 15).join(', ');
        if (allUnread.length > 15) {
          fileContext += `, ... and ${allUnread.length - 15} more`;
        }
        fileContext += '\n\n*?? I can read any of these files in detail if you need - just ask!*\n';
      }
      
      // Summary
      fileContext += `\n---\n?? **Summary:** Read ${includedFiles.length} files (${Math.round(totalCharsUsed/1000)}KB), ${allProjectFiles.length} total files in project\n`;
    // FIX3_TOKEN_FILTER - cap context to 10KB
    if (typeof fileContext === 'string' && fileContext.length > 10000) {
      fileContext = fileContext.substring(0, 10000) + '\n\n...[truncated for perf]';
    }
      
      fullMessage = fullMessage + fileContext;
      console.log(`? AI File Explorer: Read ${includedFiles.length} files (${totalCharsUsed} chars), ${unreadFiles.length} files available on request`);
      
      // ?? Hide scanning indicator with success count
      if ((window as any).hideAIScanningIndicator) {
        (window as any).hideAIScanningIndicator(includedFiles.length);
      }
      
      // ?? Animation continues until AI responds
    } else if (aiSearchEnabled) {
      // ============================================
      // AI Search ON but no files matched via keyword search
      // Still add project overview so AI knows the project
      // ============================================
      console.log('?? AI File Explorer: No keyword matches, adding project overview...');
      
      const projectFilesDOM: string[] = [];
      document.querySelectorAll('[data-path]').forEach(el => {
        const path = el.getAttribute('data-path') || '';
        if (path && path.includes('.') && !path.includes('node_modules')) {
          const parts = path.split(/[/\\]/);
          if (parts.length >= 4) {
            const fileName = parts[parts.length - 1];
            if (fileName.includes('.') && !fileName.startsWith('.git')) {
              projectFilesDOM.push(path);
            }
          }
        }
      });
      
      if (projectFilesDOM.length > 0) {
        const projectPath = (window as any).currentFolderPath || '';
        const projectName = projectPath.split(/[/\\]/).pop() || 'Project';
        
        let overviewContext = '\n\n[?? Project Overview - AI Search Mode]\n';
        overviewContext += `**Project:** ${projectName}\n`;
        overviewContext += `**Path:** \`${projectPath}\`\n`;
        overviewContext += `**Total Files:** ${projectFilesDOM.length}\n\n`;
        overviewContext += '**Project Structure:**\n```\n';
        
        const byFolder: Record<string, string[]> = {};
        projectFilesDOM.forEach(fp => {
          const relativePath = fp.replace(projectPath, '').replace(/^[/\\]/, '');
          const parts = relativePath.split(/[/\\]/);
          const fileName = parts.pop() || '';
          const folder = parts.length > 0 ? parts.join('/') : '/';
          if (!byFolder[folder]) byFolder[folder] = [];
          byFolder[folder].push(fileName);
        });
        
        for (const folder of Object.keys(byFolder).sort()) {
          const files = byFolder[folder].sort();
          overviewContext += `?? ${folder}\n`;
          files.forEach(f => {
            const ext = f.split('.').pop()?.toLowerCase() || '';
            const icons: Record<string, string> = {
              'ts': '??', 'tsx': '??', 'js': '??', 'jsx': '??',
              'css': '??', 'scss': '??', 'html': '??',
              'json': '??', 'md': '??', 'txt': '??'
            };
            overviewContext += `   ${icons[ext] || '??'} ${f}\n`;
          });
        }
        
        overviewContext += '```\n';
        fullMessage = fullMessage + overviewContext;
        console.log('? Added project overview with', projectFilesDOM.length, 'files');
        
        // ?? Hide scanning indicator (overview only, no files read)
        if ((window as any).hideAIScanningIndicator) {
          (window as any).hideAIScanningIndicator(0);
        }
      } else {
        // No project files found - still hide indicator
        if ((window as any).hideAIScanningIndicator) {
          (window as any).hideAIScanningIndicator(0);
        }
      }
      
      // ?? Highlights will auto-clear after 5 seconds via the highlight system
      // No need to manually stop animation - indexed files auto-fade
    } else {
      // AI Search is OFF
      console.log('?? AI File Explorer: Skipped (AI Search disabled)');
    }
  }
} catch (fileExplorerError) {
  console.warn('AI File Explorer error:', fileExplorerError);
  // Clear highlights on error
  if ((window as any).clearAllHighlights) {
    (window as any).clearAllHighlights();
  }
  // ?? Hide scanning indicator on error
  if ((window as any).hideAIScanningIndicator) {
    (window as any).hideAIScanningIndicator(0);
  }
  // ?? NOTE: Don't clear highlights here - let them persist until AI response
}

    console.log('?? Message length with context:', fullMessage.length);
    
    // ? FIX: Use addMessageToChat for consistent rendering (live = loaded)
    const userMsgId = 'ctx-user-' + Date.now().toString(36);
    const userDisplayText = originalUserText + (attachedFilesUI || '');
    await addMessageToChat('user', userDisplayText, {
      shouldSave: false,  // Manual save block below handles persistence
      messageId: userMsgId
    });
    
    // Get provider color
    const cfg = getCurrentApiConfigurationForced();
    const providerColors: Record<string, string> = {
      'openai': '#10a37f', 'claude': '#cc785c', 'gemini': '#4285f4',
      'groq': '#f55036', 'deepseek': '#0066ff', 'cohere': '#ff6b6b'
    };
    const accentColor = providerColors[cfg.provider] || '#4fc3f7';
    
    // ?? USE ASSISTANT UI TYPING INDICATOR
    showTypingIndicator();
    console.log('[?? AssistantUI] Typing indicator shown');
    // ?? END ASSISTANT UI TYPING INDICATOR
    
    // ?? Use scroll manager
    scrollChatToBottom();
    
    // ?? Start auto-scroll to keep loading indicator visible
    // ?? Start auto-scroll to keep loading indicator visible
    startAIProcessingScroll();
    
    try {
      // ? Check if Orchestrator mode is enabled
      // FIX: Use orchestrator singleton (merges defaults) instead of raw localStorage
      // This ensures enableAutoRouting is always properly resolved even if
      // the localStorage config was created without it (e.g., by role changes)
      let useOrchestrator = false;
      try {
        const orchInstance = getOrchestrator();
        const orchConfig = orchInstance.getConfig();
        useOrchestrator = orchConfig.enableAutoRouting === true;
        
        // Also check raw localStorage as fallback (in case toggle wrote directly)
        if (!useOrchestrator) {
          const rawConfig = localStorage.getItem('multiProviderOrchestratorConfig');
          if (rawConfig) {
            const parsed = JSON.parse(rawConfig);
            useOrchestrator = parsed.enableAutoRouting === true;
          }
        }
      } catch (e) {
        console.warn('?? Failed to read orchestrator config:', e);
        useOrchestrator = false;
      }
      
      // ============================================================================
      // ? FORCED PROVIDER OVERRIDE - Skip orchestrator when #provider tag is used
      // ============================================================================
      if (forcedProvider) {
        console.log(`?? [FORCED PROVIDER] Overriding orchestrator - using ${forcedProvider}`);
        useOrchestrator = false;  // Force legacy mode
        
        // Set up the config for the forced provider
        // ============================================================================
        // PROVIDER CONFIGS - Synced with Quick Switch Panel
        // ============================================================================
        const PROVIDER_CONFIGS: Record<string, any> = {
          // ? Operator X02 - DEFAULT (has key)
          'operator_x02': {
            provider: 'operator_x02',
            apiKey: 'PROXY',
            apiBaseUrl: 'PROXY',
            model: 'x02-coder',
            maxTokens: 4000,
            temperature: 0.7
          },
          // ? Groq - Task-based routing (has key)
          'groq': {
            provider: 'groq',
            apiKey: 'PROXY',
            apiBaseUrl: 'https://api.groq.com/openai/v1',
            model: 'llama-3.3-70b-versatile',
            maxTokens: 4000,
            temperature: 0.7
          },
          // ?? OpenAI - GPT-4o Ready (needs user key)
          'openai': {
            provider: 'openai',
            apiKey: '',  // User sets via Quick Switch panel
            apiBaseUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o',
            maxTokens: 4000,
            temperature: 0.7
          },
          // ? Deepseek - AI Reasoning (uses same DeepSeek API as operator_x02)
          'deepseek': {
            provider: 'deepseek',
            apiKey: 'PROXY',  // Same as operator_x02
            apiBaseUrl: 'PROXY',
            model: 'deepseek-chat',
            maxTokens: 4000,
            temperature: 0.7
          },
          // ?? Claude - Task-based routing (needs user key)
          'claude': {
            provider: 'claude',
            apiKey: '',  // User sets via Quick Switch panel
            apiBaseUrl: 'https://api.anthropic.com/v1',
            model: 'claude-sonnet-4-20250514',  // ? Fixed model name
            maxTokens: 4000,
            temperature: 0.7
          },
          // ?? Gemini - Task-based routing (needs user key)
          'gemini': {
            provider: 'gemini',
            apiKey: '',  // User sets via Quick Switch panel
            apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.0-flash-exp',
            maxTokens: 4000,
            temperature: 0.7
          }
        };
        
        // ? FIRST: Try to get FULL config from providerConfigs or aiApiConfig
        let baseConfig: any = null;
        
        // Check providerConfigs first (stores all provider configs)
        try {
          const providerConfigsStr = localStorage.getItem('providerConfigs');
          if (providerConfigsStr) {
            const providerConfigs = JSON.parse(providerConfigsStr);
            if (providerConfigs[forcedProvider] && providerConfigs[forcedProvider].apiKey) {
              baseConfig = { ...providerConfigs[forcedProvider] };
              console.log(`? [FORCED PROVIDER] Using saved config from providerConfigs for ${forcedProvider}`);
              console.log(`   Model: ${baseConfig.model}, Key: ${baseConfig.apiKey.substring(0, 15)}...`);
            }
          }
        } catch (e) {}
        
        // If not found in providerConfigs, try aiApiConfig
        if (!baseConfig) {
          try {
            const currentConfigStr = localStorage.getItem('aiApiConfig');
            if (currentConfigStr) {
              const currentConfig = JSON.parse(currentConfigStr);
              if (currentConfig.provider === forcedProvider && currentConfig.apiKey) {
                baseConfig = { ...currentConfig };
                console.log(`? [FORCED PROVIDER] Using EXACT config from aiApiConfig for ${forcedProvider}`);
                console.log(`   Model: ${baseConfig.model}, Key: ${baseConfig.apiKey.substring(0, 15)}...`);
                
                // Save to providerConfigs for future use
                const providerConfigs = JSON.parse(localStorage.getItem('providerConfigs') || '{}');
                providerConfigs[forcedProvider] = baseConfig;
                localStorage.setItem('providerConfigs', JSON.stringify(providerConfigs));
                console.log(`?? [FORCED PROVIDER] Saved config to providerConfigs for future use`);
              }
            }
          } catch (e) {}
        }
        
        // If not found in aiApiConfig, use default config + saved key
        if (!baseConfig) {
          // Get saved API key for this provider (if user has one saved)
          const savedKeys = JSON.parse(localStorage.getItem('providerApiKeys') || '{}');
          console.log(`?? [FORCED PROVIDER] providerApiKeys contains:`, Object.keys(savedKeys).map(k => `${k}: ${savedKeys[k] ? '?' : '?'}`));
          
          const savedKey = savedKeys[forcedProvider];
          
          // Get the base config for the forced provider
          baseConfig = { ...PROVIDER_CONFIGS[forcedProvider] } || { ...PROVIDER_CONFIGS['operator_x02'] };
          
          // Use saved key if available
          if (savedKey && savedKey.length > 5) {
            baseConfig.apiKey = savedKey;
            console.log(`?? [FORCED PROVIDER] Using saved API key for ${forcedProvider}: ${savedKey.substring(0, 15)}...`);
          } else if (baseConfig.apiKey && baseConfig.apiKey.length > 5) {
            console.log(`?? [FORCED PROVIDER] Using default API key for ${forcedProvider}: ${baseConfig.apiKey.substring(0, 15)}...`);
          } else {
            console.log(`?? [FORCED PROVIDER] No API key found for ${forcedProvider}!`);
          }
        }
        
        // Save to localStorage so legacy path uses it
        localStorage.setItem('aiApiConfig', JSON.stringify(baseConfig));
        console.log(`?? [FORCED PROVIDER] Config saved:`, {
          provider: baseConfig.provider,
          baseUrl: baseConfig.apiBaseUrl,
          model: baseConfig.model,
          hasKey: !!baseConfig.apiKey,
          keyLength: baseConfig.apiKey?.length || 0
        });
      }
      // ============================================================================
      
      let aiResp: string;
      let actualProvider: string = 'AI';  // Track which provider actually responded
      
      if (useOrchestrator && !forcedProvider) {
        // ??? Use Multi-Provider Orchestrator (only if NOT forced)
        console.log('??? Using Multi-Provider Orchestrator...');
        const { taskType } = detectTaskType(originalUserText);  // ? Use clean user input
        console.log(`?? Task detected: ${taskType}`);
        
        try {
          const result = await orchestratedSend(fullMessage, false, originalUserText);  // ? Pass ORIGINAL user text (before AI History/context injection)
          aiResp = result.response;
          actualProvider = result.provider;  // ? Capture actual provider
          
          // ?? FIXED: Update typing indicator to show actual provider used
          updateTypingIndicatorProvider(actualProvider);
          
          console.log(`? Response from ${result.provider} (${result.latencyMs}ms)`);
          if (result.fallbackUsed) {
            console.log(`?? Fallback chain: ${result.fallbackChain.join(' ? ')}`);
          }
        } catch (orchError: any) {
          console.error('? Orchestrator failed:', orchError);
          throw orchError;
        }
        
      } else {
        // ?? Use single provider (legacy mode) OR forced provider
        const cfg = getCurrentApiConfigurationForced();
        if (!cfg.apiBaseUrl || !cfg.apiKey) throw new Error('API not configured');
        
        actualProvider = cfg.provider || 'AI';  // ? Set for legacy mode
        console.log('?? Calling API:', cfg.provider, cfg.model);
        
        let r: Response;
        
        // ? Handle different API formats
        if (cfg.provider === 'gemini') {
        // Gemini uses different URL and format
        // Always use v1beta for all gemini models
        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        // Use gemini-2.0-flash-exp as default (most reliable)
        const model = cfg.model || 'gemini-2.0-flash-exp';
        const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${cfg.apiKey}`;
        console.log('?? Gemini URL:', geminiUrl);
        
        if (!cfg.apiKey) {
          throw new Error('Gemini API key required. Run: setApiKey("gemini", "YOUR_KEY") in console');
        }
        
        r = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { 
                role: 'user', 
                parts: [{ text: 'You are an AI coding assistant in an IDE. ' + fullMessage }]
              }
            ],
            generationConfig: {
              maxOutputTokens: cfg.maxTokens || 4000,
              temperature: 0.7
            }
          })
        });
        
        if (!r.ok) {
          const errText = await r.text();
          throw new Error(`Gemini API Error ${r.status}: ${errText}`);
        }
        const geminiData = await r.json();
        aiResp = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
        
      } else if (cfg.provider === 'claude') {
        // Claude API - Use Tauri backend to bypass CORS
        if (!cfg.apiKey) {
          throw new Error('Claude API key required. Run: setApiKey("claude", "YOUR_KEY") in console');
        }
        console.log('?? Using Tauri backend for Claude API (CORS bypass)');
        try {
          aiResp = await invoke('call_claude_api', {
            request: {
              api_key: cfg.apiKey,
              model: cfg.model || 'claude-sonnet-4-20250514',
              message: 'You are an AI coding assistant in Operator X02 Code IDE with surgical code editing. ' + fullMessage,
              max_tokens: cfg.maxTokens || 4000,
              temperature: 0.7
            }
          });
          console.log('? Claude API response received via Tauri');

          // ?? IDE Script interceptor ? detect and execute script commands
          if (isScriptModeEnabled() && aiResp) {
            try {
              const scriptResult = await processAiScriptResponse(aiResp);
              if (scriptResult.hasScripts) {
                console.log('?? [IDE Script] Processed', scriptResult.results.length, 'script call(s)');
                // UI LOG: pump each result into the ideScriptUI log panel
                scriptResult.results.forEach(function(r) {
                  var _ok = !r.error && !(r.result && r.result.error);
                  var _cmd = r.command || 'unknown';
                  var _detail = r.error ? r.error : (r.result && r.result.error ? r.result.error : 'completed');
                  window.dispatchEvent(new CustomEvent('ide-script-log', {
                    detail: { type: _ok ? 'exec-done' : 'exec-error', icon: _ok ? '\u2705' : '\u274c', text: _ok ? (_cmd + ': ' + _detail) : (_cmd + ' failed: ' + _detail) }
                  }));
                });
                // Append results summary to the response
                const summaries = scriptResult.results.map(r => {
                  if (r.error) return '? ' + r.command + ': ' + r.error;
                  const res = r.result;
                  if (r.command === 'ide_patch' && res) return res.success ? '? Patched: ' + res.description + ' (-' + res.lines_removed + ' +' + res.lines_added + ')' : '? Patch failed: ' + (res.error || 'unknown');
                  if (r.command === 'ide_search' && res) return '?? Found ' + res.total_matches + ' matches for "' + res.pattern + '"';
                  if (r.command === 'ide_analyse' && res) return '?? ' + res.summary;
                  if (r.command === 'ide_review' && res) return '?? ' + res.summary;
                  if (r.command === 'ide_insert' && res) return res.success ? '?? Inserted ' + res.lines_inserted + ' lines' : '? Insert failed';
                  if (r.command === 'ide_rollback' && res) return res.success ? '?? Rolled back ' + res.lines_restored + ' lines' : '? Rollback failed';
                  // ? FIX 3: ide_read_file result summary was missing � swallowed silently
                  if (r.command === 'ide_read_file' && res) return res.error ? '? Read failed: ' + res.error : '?? Read: ' + res.file_path + ' (' + (res.length || 0) + ' chars, ' + (res.lines || 0) + ' lines)';
                  if (r.command === 'ide_list_dir' && res) return '?? Listed ' + (Array.isArray(res) ? res.length : '?') + ' entries';
                  if (r.command === 'ide_create_file' && res) return res.success !== false ? '? Created: ' + (res.path || args?.file_path || '') : '? Create failed: ' + (res.error || 'unknown');
                  if (r.command === 'ide_delete' && res) return res.success !== false ? '??? Deleted' : '? Delete failed: ' + (res.error || 'unknown');
                  if (r.command === 'ide_rename' && res) return res.success !== false ? '?? Renamed' : '? Rename failed: ' + (res.error || 'unknown');
                  if (r.error) return '? ' + r.command + ' failed: ' + r.error;
                  return '? ' + r.command;
                }).join('\n');
                aiResp = scriptResult.cleanResponse + '\n\n---\n?? **Script Results:**\n' + summaries;
              }
            } catch (scriptErr) {
              console.warn('?? [IDE Script] Processing error:', scriptErr);
            }
          }
        } catch (tauriError: any) {
          console.error('? Tauri Claude API error:', tauriError);
          throw new Error(`Claude API Error: ${tauriError}`);
        }
        
      } else if (cfg.provider === 'groq' || cfg.provider === 'operator_x02' || cfg.provider === 'deepseek') {
        // ? PROXY INTERCEPT: Route through Supabase proxy when key is PROXY
        if (cfg.apiKey === 'PROXY' && (window as any).smartAICall) {
          console.log(`?? [Proxy] Routing ${cfg.provider} through secure proxy`);
          try {
            aiResp = await (window as any).smartAICall({
              provider: cfg.provider,
              apiKey: 'PROXY',
              model: cfg.model,
              message: fullMessage,
              maxTokens: cfg.maxTokens || 4000,
              temperature: cfg.temperature || 0.7
            });
            console.log(`? ${cfg.provider} API response received via proxy`);

            // IDE Script interceptor - proxy path (Two-pass feedback v2)
            if (isScriptModeEnabled() && aiResp) {
              try {
                const scriptResult = await processAiScriptResponse(aiResp);
                if (scriptResult.hasScripts && scriptResult.results.length > 0) {
                  console.log("[IDE Script] Processed", scriptResult.results.length, "script call(s) via proxy");
                  // UI LOG: pump each proxy-path result into the ideScriptUI log panel
                  scriptResult.results.forEach(function(r) {
                    var _ok = !r.error && !(r.result && r.result.error);
                    var _cmd = r.command || 'unknown';
                    var _detail = r.error ? r.error : (r.result && r.result.error ? r.result.error : 'completed');
                    window.dispatchEvent(new CustomEvent('ide-script-log', {
                      detail: { type: _ok ? 'exec-done' : 'exec-error', icon: _ok ? '\u2705' : '\u274c', text: _ok ? (_cmd + ': ' + _detail) : (_cmd + ' failed: ' + _detail) }
                    }));
                  });

                  // Build detailed results for AI feedback
                  const detailedResults = scriptResult.results.map((r: any) => {
                    if (r.error) return { command: r.command, status: "failed", error: r.error };
                    return { command: r.command, status: "success", data: r.result };
                  });

                  // Two-pass: Send results back to AI for expert feedback
                  try {
                    console.log("[IDE Script] Requesting AI feedback on results...");
                    window.dispatchEvent(new CustomEvent('ide-script-log', { detail: { type: 'feedback-start', icon: '?', text: 'Requesting AI expert feedback...' } }));
                    const feedbackPrompt = "You are an expert code analyst in Operator X02 Code IDE. " +
                      "The user asked: " + (fullMessage.length > 500 ? fullMessage.substring(0, 500) + "..." : fullMessage) + "\n\n" +
                      "The IDE Script system executed commands and got these results:\n" +
                      JSON.stringify(detailedResults, null, 2) + "\n\n" +
                      "Based on these results, provide detailed expert analysis and feedback. " +
                      "Highlight important findings, potential issues, suggestions for improvement, " +
                      "and any actionable recommendations. Be specific and reference actual data from the results. " +
                      "Do NOT output any ide_script blocks - just provide your analysis in plain text/markdown.";

                    const feedbackResp = await (window as any).smartAICall({
                      provider: cfg.provider,
                      apiKey: "PROXY",
                      model: cfg.model,
                      message: feedbackPrompt,
                      maxTokens: cfg.maxTokens || 4000,
                      temperature: cfg.temperature || 0.7
                    });

                    if (feedbackResp && feedbackResp.trim().length > 20) {
                      console.log("[IDE Script] AI feedback received:", feedbackResp.length, "chars");
                      window.dispatchEvent(new CustomEvent('ide-script-log', { detail: { type: 'feedback-done', icon: '?', text: 'AI feedback ready' } }));
                      aiResp = feedbackResp;
                    } else {
                      // Fallback: use simple summaries if feedback call fails
                      console.warn("[IDE Script] Feedback too short, using summaries");
                      window.dispatchEvent(new CustomEvent('ide-script-log', { detail: { type: 'feedback-error', icon: '?', text: 'Using summary fallback' } }));
                      const summaries = scriptResult.results.map((r: any) => {
                        if (r.error) return r.command + ": " + r.error;
                        const res = r.result;
                        if (res && res.summary) return res.summary;
                        return r.command + " completed";
                      }).join("\n");
                      aiResp = scriptResult.cleanResponse + "\n\n---\nScript Results:\n" + summaries;
                    }
                  } catch (feedbackErr) {
                    console.warn("[IDE Script] Feedback call failed, using summaries:", feedbackErr);
                      window.dispatchEvent(new CustomEvent('ide-script-log', { detail: { type: 'feedback-error', icon: '?', text: 'Feedback failed, using summaries' } }));
                    const summaries = scriptResult.results.map((r: any) => {
                      if (r.error) return r.command + ": " + r.error;
                      const res = r.result;
                      if (res && res.summary) return res.summary;
                      return r.command + " completed";
                    }).join("\n");
                    aiResp = scriptResult.cleanResponse + "\n\n---\nScript Results:\n" + summaries;
                  }
                }
              } catch (scriptErr) {
                console.warn("[IDE Script] Processing error (proxy):", scriptErr);
              }
            }
          } catch (proxyErr: any) {
            console.error(`? Proxy ${cfg.provider} error:`, proxyErr);
            throw new Error(`Proxy Error: ${proxyErr.message}`);
          }
        } else {
        // ? Use Tauri backend for Groq/Operator/Deepseek (CORS bypass and consistent behavior)
        console.log(`?? Using Tauri backend for ${cfg.provider} API`);
        try {
          aiResp = await invoke('call_ai_api', {
            request: {
              provider: cfg.provider,
              api_key: cfg.apiKey,
              base_url: cfg.apiBaseUrl,
              model: cfg.model,
              message: 'You are an AI coding assistant in Operator X02 Code IDE with surgical code editing. ' + fullMessage,
              max_tokens: cfg.maxTokens || 4000,
              temperature: cfg.temperature || 0.7
            }
          });
          console.log(`? ${cfg.provider} API response received via Tauri`);
        } catch (tauriError: any) {
          console.error(`? Tauri ${cfg.provider} API error:`, tauriError);
          // Fallback to browser fetch
          console.log('?? Falling back to browser fetch...');
          r = await fetch(cfg.apiBaseUrl + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
            body: JSON.stringify({
              model: cfg.model,
              messages: [
                { role: 'system', content: 'You are an AI coding assistant in Operator X02 Code IDE. When providing code, always give COMPLETE file contents with the correct filename. Your code is auto-applied to disk via the Surgical Edit Engine.' },
                { role: 'user', content: fullMessage }
              ],
              max_tokens: cfg.maxTokens || 4000
            })
          });
          if (!r.ok) throw new Error(`API Error ${r.status}: ${await r.text()}`);
          const d = await r.json();
          aiResp = d.choices?.[0]?.message?.content || 'No response';
        }
        } // close else (non-PROXY Tauri path)
        
      } else {
        // OpenAI-compatible format (OpenAI, etc.)
        if (cfg.apiKey === 'PROXY' && (window as any).smartAICall) {
          console.log(`?? [Proxy] Routing ${cfg.provider} through secure proxy`);
          aiResp = await (window as any).smartAICall({
            provider: cfg.provider,
            apiKey: 'PROXY',
            model: cfg.model,
            message: fullMessage,
            maxTokens: cfg.maxTokens || 4000,
            temperature: cfg.temperature || 0.7
          });
        } else {
        if (!cfg.apiKey) {
          throw new Error(`${cfg.provider} API key required. Run: setApiKey("${cfg.provider}", "YOUR_KEY") in console`);
        }
        r = await fetch(cfg.apiBaseUrl + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
          body: JSON.stringify({
            model: cfg.model,
            messages: [
              { role: 'system', content: 'You are an AI coding assistant in Operator X02 Code IDE with Surgical Edit Engine. You have full context of the user\'s current file and code. IMPORTANT: Your code blocks are AUTO-APPLIED to disk with backup. Rules: 1) ALWAYS provide COMPLETE file content, never partial 2) Include filename before each code block 3) Use correct language tags 4) One code block per file 5) Reference their actual code 6) Be specific and actionable' },
              { role: 'user', content: fullMessage }
            ],
            max_tokens: cfg.maxTokens || 4000
          })
        });
        
        if (!r.ok) throw new Error(`API Error ${r.status}`);
        const d = await r.json();
        aiResp = d.choices?.[0]?.message?.content || 'No response';
        } // close non-proxy OpenAI path
      }
      } // End of legacy single-provider mode
      
      // ?? Hide typing indicator (AssistantUI style)
      await hideTypingIndicator();
      
      // ? USE ASSISTANT UI MESSAGE RENDERING
      // IDE Script: Auto-execute ide_script blocks in AI response
      if ((window as any).ideScript && aiResp.includes('```ide_script')) {
        try {
          const ideScriptMode = (window as any).ideScript.getMode?.();
          if (ideScriptMode === 'auto') {
            // ? FIX 1: Was using new RegExp() with quadruple-escaped backslashes �
            // inside new RegExp() strings, \\\\ becomes \\ in the pattern, which matches
            // a literal backslash, NOT whitespace. This caused scriptMatch to always be
            // null and the entire auto-execute block was silently dead code.
            // Fixed: use a regex literal instead, which needs no escaping.
            const scriptRegex = /```ide_script\s*\n?([\s\S]*?)\n?```/;
            const scriptMatch = aiResp.match(scriptRegex);
            if (scriptMatch && scriptMatch[1]) {
              const scriptJson = JSON.parse(scriptMatch[1].trim());
              const cmd = scriptJson.command;
              const args = scriptJson.args || {};

              // ? Known commands whitelist � any command not listed here surfaces a clear
              // error immediately rather than a cryptic "command is not defined" from deep
              // inside ideScriptBridge or the Tauri invoke layer.
              const KNOWN_COMMANDS = [
                'ide_analyse', 'ide_review', 'ide_search',
                'ide_patch', 'ide_insert', 'ide_rollback',
                'ide_read_file', 'ide_create_file', 'ide_create_folder',
                'ide_delete', 'ide_rename', 'ide_list_dir',
              ];

              console.log('[IDE Script] Executing:', cmd, args);
              // UI LOG: fire exec-start so ideScriptUI panel shows activity
              window.dispatchEvent(new CustomEvent('ide-script-log', {
                detail: { type: 'exec-start', icon: '\u2699\ufe0f', text: 'Running ' + cmd + '...' }
              }));
              let result: any = null;

              if (!KNOWN_COMMANDS.includes(cmd)) {
                // ? FIX: Surface unknown commands immediately instead of silently ignoring
                result = {
                  error: `Unknown IDE Script command: "${cmd}". Available: ${KNOWN_COMMANDS.join(', ')}`,
                  hint: 'Check the ide_script system prompt for the correct command names.',
                };
                console.warn('[IDE Script] Unknown command:', cmd);
                // UI LOG: show unknown command warning in ideScriptUI panel
                window.dispatchEvent(new CustomEvent('ide-script-log', {
                  detail: { type: 'exec-error', icon: '\u26a0\ufe0f', text: 'Unknown command: ' + cmd }
                }));
              } else if (cmd === 'ide_analyse' && args.file_path) {
                result = await (window as any).ideScript.analyse(args.file_path);
              } else if (cmd === 'ide_review' && args.file_path) {
                result = await (window as any).ideScript.review(args.file_path);
              } else if (cmd === 'ide_search') {
                result = await (window as any).ideScript.search(args.scope, args.pattern, args.file_glob || '*.ts', args.max_results || 20);
              } else if (cmd === 'ide_patch') {
                result = await (window as any).ideScript.patch(args.file_path, args.find, args.replace, args.reason || 'AI edit');
              } else if (cmd === 'ide_insert') {
                result = await (window as any).ideScript.insert(args.file_path, args.after_line, args.content, args.reason || 'AI insert');
              } else if (cmd === 'ide_rollback') {
                result = await (window as any).ideScript.rollback(args.backup_id);
              } else if (cmd === 'ide_read_file') {
                // ? FIX 2: ide_read_file was registered in Rust (ide_script_commands_v2)
                // but the frontend had NO handler for it, causing "command is not defined".
                // Now invokes the Tauri backend directly and returns structured result.
                if (!args.file_path) {
                  result = { error: 'ide_read_file requires args.file_path' };
                } else {
                  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
                  const content = await tauriInvoke<string>('ide_read_file', { path: args.file_path });
                  result = {
                    file_path: args.file_path,
                    content,
                    length: (content || '').length,
                    lines: (content || '').split('\n').length,
                  };
                }
              } else if (cmd === 'ide_list_dir') {
                // Forward to the existing ai_list_directory_recursive Tauri command
                if (!args.path && !args.file_path) {
                  result = { error: 'ide_list_dir requires args.path' };
                } else {
                  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
                  result = await tauriInvoke('ai_list_directory_recursive', {
                    path: args.path || args.file_path,
                    maxDepth: args.max_depth || 3,
                  });
                }
              } else if (cmd === 'ide_create_file' || cmd === 'ide_create_folder' || cmd === 'ide_delete' || cmd === 'ide_rename') {
                // These are registered in ide_script_commands_v2 � invoke directly
                const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
                result = await tauriInvoke(cmd, args);
              }

              if (result) {
                // UI LOG: fire exec-done/error so panel shows outcome
                var _logIcon = (result && result.error) ? '\u274c' : '\u2705';
                var _logText = (result && result.error) ? (cmd + ' failed: ' + result.error) : (cmd + ' OK');
                window.dispatchEvent(new CustomEvent('ide-script-log', {
                  detail: { type: (result && result.error) ? 'exec-error' : 'exec-done', icon: _logIcon, text: _logText }
                }));
                console.log('[IDE Script] Result:', result);
                const blockStart = aiResp.indexOf('```ide_script');
                const blockEnd = aiResp.indexOf('```', blockStart + 14);
                const textBefore = aiResp.substring(0, blockStart);
                const textAfter = blockEnd >= 0 ? aiResp.substring(blockEnd + 3) : '';
                const resultJson = JSON.stringify(result, null, 2);
                aiResp = textBefore + '**IDE Script Result** (' + cmd + '):\n```json\n' + resultJson + '\n```' + textAfter;
              }
            }
          }
        } catch (ideScriptErr: any) {
          console.warn('[IDE Script] Error:', ideScriptErr);
          aiResp += '\n\n> ?? IDE Script error: ' + (ideScriptErr?.message || String(ideScriptErr));
        }
      }

      // Use addMessageToChat from messageUI.ts for consistent styling
      // ?? FIXED: Pass actualProvider so correct provider name shows in footer
      // ? FIX: shouldSave: false ? manual save block below handles persistence with metadata
      await addMessageToChat('assistant', aiResp, {
        shouldSave: false,
        providerName: actualProvider  // Use actual provider from orchestrator or legacy mode
      });
      console.log(`? Response displayed via AssistantUI (provider: ${actualProvider})`);
      
      // ?? Scroll handled by addMessageToChat
      
      // ? Hide provider indicator - message is now rendered
      if (typeof (window as any).hideProviderIndicator === 'function') {
        (window as any).hideProviderIndicator();
      }
      
      // ?? Clear file highlights after AI response (with delay so user sees results)
      setTimeout(() => {
        if ((window as any).clearAllHighlights) {
          (window as any).clearAllHighlights();
        }
      }, 3000);
      
      // ? Stop file processing animation
      chatFileDrop?.stopProcessing?.();
      
      // Save to conversation
      try {
        const cm = (window as any).conversationManager;
        if (cm?.getCurrentConversation) {
          const conv = cm.getCurrentConversation();
          if (conv) {
            const id = Date.now().toString(36);
            conv.messages.push({ role: 'user', content: msg, timestamp: Date.now(), id: 'u' + id, metadata: { fileName, language } });
            // ?? FIXED: Save actual provider, not just config provider
            conv.messages.push({ role: 'assistant', content: aiResp, timestamp: Date.now(), id: 'a' + id, metadata: { provider: actualProvider || cfg.provider } });
            conv.lastUpdated = Date.now();
            cm.saveConversations?.();
            console.log('?? Conversation saved');
          }
        }
      } catch (e) { }
      
  // ? Clear attached files after sending
      chatFileDrop?.markAsRead();
      
      // ? FIX: Clear PDF context after sending (prevents stale PDF injection on next message)
      const pdfMgrCleanup = (window as any).pdfContextManager;
      if (pdfMgrCleanup?.hasAttachments?.()) {
        console.log('?? [PDFContext] Clearing PDF attachments after send');
        pdfMgrCleanup.clearAll();
      }
      
      // ?? Stop auto-scroll - AI complete
      stopAIProcessingScroll();
      
      } catch (e: any) {
      console.error('? API Error:', e);
      // ?? Hide typing indicator (AssistantUI style)
      await hideTypingIndicator();
      
      // ? Hide provider indicator on error
      if (typeof (window as any).hideProviderIndicator === 'function') {
        (window as any).hideProviderIndicator();
      }
      
      // ?? Clear file highlights on error
      if ((window as any).clearAllHighlights) {
        (window as any).clearAllHighlights();
      }
      
      // ? Stop file processing animation on error
      chatFileDrop?.stopProcessing?.();
      
      // ?? Stop auto-scroll on error
      stopAIProcessingScroll();
      // ?? Use AssistantUI for error message
      await addMessageToChat('assistant', `? Error: ${e.message}`, true);
      // ?? Use scroll manager
      scrollChatToBottom();
      
      // ? Also clear files on error
      chatFileDrop?.clearFiles();
      
      // ? FIX: Clear PDF context on error too
      const pdfMgrError = (window as any).pdfContextManager;
      if (pdfMgrError?.hasAttachments?.()) {
        console.log('?? [PDFContext] Clearing PDF attachments after error');
        pdfMgrError.clearAll();
      }
    }
  };
  
  // Function to attach handler by cloning
  const attachContextHandler = () => {
    const oldBtn = document.getElementById('send-btn');
    const oldInput = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
    
    if (!oldBtn || !oldInput) {
      console.log('? [CONTEXT-FIX] Elements not ready...');
      return false;
    }
    
    // Check if already attached
    if ((oldBtn as any).__contextFixAttached) {
      return true;
    }
    
    console.log('?? [CONTEXT-FIX] Cloning elements to remove old listeners...');
    
    // Clone to remove ALL existing listeners
    const newBtn = oldBtn.cloneNode(true) as HTMLButtonElement;
    const newInput = oldInput.cloneNode(true) as HTMLTextAreaElement;
    
    oldBtn.parentNode?.replaceChild(newBtn, oldBtn);
    oldInput.parentNode?.replaceChild(newInput, oldInput);
    
    // Mark as attached
    (newBtn as any).__contextFixAttached = true;
    
    // Attach our handler
    newBtn.onclick = contextAwareSendHandler;
    
    // Enter key on new input
    newInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        contextAwareSendHandler();
      }
    };
    
    // Auto-resize
    newInput.oninput = () => {
      newInput.style.height = 'auto';
      newInput.style.height = Math.min(newInput.scrollHeight, 150) + 'px';
    };
    
    console.log('? [CONTEXT-FIX] Handler attached successfully!');
    console.log('   ?? IDE context: YES');
    console.log('   ?? Code content: YES');
    console.log('   ?? Conversation save: YES');
    return true;
  };
  
  // Try at multiple intervals
  [2000, 4000, 6000, 8000, 10000].forEach(delay => {
    setTimeout(() => {
      const btn = document.getElementById('send-btn');
      if (btn && !(btn as any).__contextFixAttached) {
        attachContextHandler();
      }
    }, delay);
  });
  
  // Keep checking every 15 seconds in case something overrides
  setInterval(() => {
    const btn = document.getElementById('send-btn');
    if (btn && !(btn as any).__contextFixAttached) {
      console.log('?? [CONTEXT-FIX] Re-attaching (was lost)...');
      attachContextHandler();
    }
  }, 15000);
  
  console.log('? [MAIN.TS] Bulletproof AI fix scheduled');
  
  // ========================================
  // ?? FILE CREATION TRACKING
  // ========================================
  
  /**
   * Store file creation info for AI context
   * Call this whenever a file is created by AI or user
   */
  (window as any).storeFileCreation = (name: string, path: string, content?: string) => {
    (window as any).__lastCreatedFile = {
      name,
      path,
      content: content?.substring(0, 500), // First 500 chars only
      timestamp: Date.now()
    };
    console.log('?? [CONTEXT] File creation stored:', name);
  };
  
  /**
   * Store project creation info for AI context
   * This is a backup in case projectCommandHandler isn't loaded
   */
  // ================================================
  // [GPU] NVIDIA JETSON AI CONTEXT
  // ================================================
  // Expose Jetson context detection for AI assistant
  (window as any).detectJetsonContext = detectJetsonContext;
  (window as any).jetsonTriggerPatterns = JETSON_TRIGGER_PATTERNS;
  console.log("[JETSON] " + JETSON_TRIGGER_PATTERNS.length + " AI trigger patterns loaded");

  (window as any).storeProjectCreation = (projectName: string, projectPath: string, template: string, files: string[]) => {
    (window as any).__lastProject = {
      projectName,
      projectPath,
      template,
      files,
      timestamp: Date.now()
    };
    console.log('?? [CONTEXT] Project creation stored:', projectName);
    
    // Set project context for context manager
    if ((window as any).contextManager?.setProjectContext) {
      (window as any).contextManager.setProjectContext(projectName, projectPath);
    }
  };
  
  // ========================================
  // ?? PROJECT CREATION EVENT LISTENER
  // ========================================
  
  // Listen for project-created events (from modernModal.ts)
  document.addEventListener('project-created', (event: any) => {
    console.log('?? [CONTEXT] project-created event received!');
    const info = event.detail;
    if (info) {
      (window as any).__lastProject = {
        projectName: info.projectName,
        projectPath: info.projectPath,
        template: info.template,
        files: info.files || [],
        timestamp: info.timestamp || Date.now()
      };
      console.log('? [CONTEXT] Project info stored:', info.projectName);
      
      // Set project context for context manager
      if ((window as any).contextManager?.setProjectContext) {
        (window as any).contextManager.setProjectContext(info.projectName, info.projectPath);
      }
    }
  });
  
  // Listen for file-created events
  document.addEventListener('file-created', (event: any) => {
    console.log('?? [CONTEXT] file-created event received!');
    const info = event.detail;
    if (info) {
      (window as any).__lastCreatedFile = {
        name: info.name,
        path: info.path,
        timestamp: Date.now()
      };
      console.log('? [CONTEXT] File info stored:', info.name);
    }
  });
  
  // ========================================
  // ?? FOLDER CHANGE DETECTION
  // ========================================
  
  // ========================================
  // ?? FILE CONTENT READING HELPER
  // ========================================
  
  /**
   * Read file contents from disk using Tauri
   */
  const readFileContents = async (folderPath: string, fileNames: string[]): Promise<Record<string, string>> => {
    const contents: Record<string, string> = {};
    const separator = folderPath.includes('\\') ? '\\' : '/';
    
    // File types to read (code files)
    const readableExtensions = ['.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.json', '.py', '.java', '.c', '.cpp', '.h', '.md', '.txt', '.xml', '.yaml', '.yml', '.toml', '.ini', '.sh', '.bat', '.ps1', '.sql', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte'];
    
    // Skip large/binary files
    const skipFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', 'Thumbs.db'];
    
    // Max files to read to avoid overload
    const maxFiles = 15;
    let filesRead = 0;
    
    for (const fileName of fileNames) {
      if (filesRead >= maxFiles) break;
      
      // Check if it's a readable file type
      const ext = '.' + fileName.split('.').pop()?.toLowerCase();
      if (!readableExtensions.includes(ext)) continue;
      if (skipFiles.includes(fileName)) continue;
      
      try {
        const filePath = `${folderPath}${separator}${fileName}`;
        
        // Try Tauri invoke
        if ((window as any).__TAURI__?.invoke) {
          const content = await (window as any).__TAURI__.invoke('read_file_content', { path: filePath });
          if (content && content.length < 10000) { // Max 10KB per file
            contents[fileName] = content;
            filesRead++;
            console.log(`?? [CONTEXT] Read file: ${fileName} (${content.length} chars)`);
          }
        }
      } catch (e) {
        // File might be in subfolder or unreadable, skip silently
      }
    }
    
    console.log(`?? [CONTEXT] Read ${filesRead} files from ${folderPath}`);
    return contents;
  };
  
  // Listen for project-opened events (when user opens a different folder)
  document.addEventListener('project-opened', (event: any) => {
    console.log('?? [CONTEXT] project-opened event received!');
    const info = event.detail;
    if (info?.path) {
      const folderName = info.path.split(/[/\\]/).pop() || 'Unknown';
      
      // Check if this is a DIFFERENT folder than last created project
      const lastProject = (window as any).__lastProject;
      if (lastProject && !info.path.includes(lastProject.projectName)) {
        console.log('?? [CONTEXT] Different folder opened, clearing old project context');
        // Clear the old project since user opened a different folder
        (window as any).__lastProject = null;
      }
      
      // Extract file names from tree structure
      const extractFileNames = (items: any[]): string[] => {
        const names: string[] = [];
        const walk = (item: any) => {
          if (typeof item === 'string') {
            names.push(item);
          } else if (item?.name) {
            names.push(item.name);
            if (item.children) item.children.forEach(walk);
          } else if (item?.path) {
            names.push(item.path.split(/[/\\]/).pop() || item.path);
          }
        };
        if (Array.isArray(items)) { items.forEach(walk); } else if (items && typeof items === 'object') { walk(items); }
        return names;
      };
      
      const fileNames = info.files ? extractFileNames(info.files) : [];
      
      // Store current folder info
      (window as any).__currentFolder = {
        path: info.path,
        name: folderName,
        files: fileNames,
        fileContents: {}, // Will be populated async
        timestamp: Date.now()
      };
      (window as any).__currentFolderPath = info.path;
      
      console.log('? [CONTEXT] Current folder stored:', folderName, 'with', fileNames.length, 'files');
      
      // ?? Read file contents asynchronously
      readFileContents(info.path, fileNames).then(contents => {
        (window as any).__currentFolder.fileContents = contents;
        console.log('? [CONTEXT] File contents loaded for', Object.keys(contents).length, 'files');
      }).catch(e => console.warn('?? Could not read file contents:', e));
    }
  });
  
  // Listen for folder-opened events (alternative event name)
  document.addEventListener('folder-opened', (event: any) => {
    console.log('?? [CONTEXT] folder-opened event received!');
    const info = event.detail;
    if (info?.path) {
      const folderName = info.path.split(/[/\\]/).pop() || 'Unknown';
      
      // Clear old project if different folder
      const lastProject = (window as any).__lastProject;
      if (lastProject && !info.path.includes(lastProject.projectName)) {
        (window as any).__lastProject = null;
      }
      
      // Extract file names from tree structure
      const extractFileNames = (items: any[]): string[] => {
        const names: string[] = [];
        const walk = (item: any) => {
          if (typeof item === 'string') {
            names.push(item);
          } else if (item?.name) {
            names.push(item.name);
            if (item.children) item.children.forEach(walk);
          } else if (item?.path) {
            names.push(item.path.split(/[/\\]/).pop() || item.path);
          }
        };
        if (Array.isArray(items)) { items.forEach(walk); } else if (items && typeof items === 'object') { walk(items); }
        return names;
      };
      
      const fileNames = info.files ? extractFileNames(info.files) : [];
      
      (window as any).__currentFolder = {
        path: info.path,
        name: folderName,
        files: fileNames,
        fileContents: {},
        timestamp: Date.now()
      };
      (window as any).__currentFolderPath = info.path;
      
      console.log('? [CONTEXT] Current folder stored:', folderName, 'with', fileNames.length, 'files');
      
      // ?? Read file contents asynchronously
      readFileContents(info.path, fileNames).then(contents => {
        (window as any).__currentFolder.fileContents = contents;
        console.log('? [CONTEXT] File contents loaded for', Object.keys(contents).length, 'files');
      }).catch(e => console.warn('?? Could not read file contents:', e));
    }
  });
  
  console.log('? [MAIN.TS] Context tracking initialized');
  
  // ========================================
  // ?? GLOBAL HELPER FUNCTIONS
  // ========================================
  
  /**
   * Manually refresh file contents for current folder
   * User can call: window.refreshFolderContents()
   */
  (window as any).refreshFolderContents = async () => {
    const folder = (window as any).__currentFolder;
    if (!folder) {
      console.log('? No folder currently open');
      return;
    }
    
    console.log('?? Refreshing file contents for:', folder.name);
    const contents = await readFileContents(folder.path, folder.files);
    folder.fileContents = contents;
    console.log('? Refreshed', Object.keys(contents).length, 'files');
    return contents;
  };
  
  /**
   * Read a specific file from disk
   * User can call: window.readFile('App.js') or window.readFile('C:/path/to/file.js')
   */
  (window as any).readFile = async (filePathOrName: string) => {
    console.log('?? Reading file:', filePathOrName);
    
    let fullPath = filePathOrName;
    
    // If just a filename, try to find it in current folder
    if (!filePathOrName.includes('/') && !filePathOrName.includes('\\')) {
      const folder = (window as any).__currentFolder;
      const lastProject = (window as any).__lastProject;
      const basePath = folder?.path || lastProject?.projectPath || '';
      
      if (basePath) {
        const separator = basePath.includes('\\') ? '\\' : '/';
        fullPath = basePath + separator + filePathOrName;
      }
    }
    
    try {
      if ((window as any).__TAURI__?.invoke) {
        const content = await (window as any).__TAURI__.invoke('read_file_content', { path: fullPath });
        const lines = content.split('\n').length;
        console.log(`? Read ${filePathOrName}: ${lines} lines, ${content.length} chars`);
        
        // Store in currentFolder.fileContents
        const folder = (window as any).__currentFolder;
        if (folder) {
          if (!folder.fileContents) folder.fileContents = {};
          folder.fileContents[filePathOrName] = content;
        }
        
        return { content, lines, chars: content.length };
      } else {
        console.log('? Tauri not available');
        return null;
      }
    } catch (e) {
      console.error('? Failed to read file:', e);
      return null;
    }
  };
  
  /**
   * Read ALL files in current folder (force read)
   */
  (window as any).readAllFiles = async () => {
    const folder = (window as any).__currentFolder;
    const lastProject = (window as any).__lastProject;
    
    const basePath = folder?.path || lastProject?.projectPath;
    const files = folder?.files || lastProject?.files || [];
    
    if (!basePath) {
      console.log('? No folder path available');
      return;
    }
    
    console.log('?? Reading all files from:', basePath);
    console.log('?? Files to read:', files);
    
    const contents: Record<string, string> = {};
    const separator = basePath.includes('\\') ? '\\' : '/';
    
    for (const fileName of files) {
      try {
        const filePath = basePath + separator + fileName;
        if ((window as any).__TAURI__?.invoke) {
          const content = await (window as any).__TAURI__.invoke('read_file_content', { path: filePath });
          if (content && content.length < 50000) {
            contents[fileName] = content;
            console.log(`? Read: ${fileName} (${content.split('\n').length} lines)`);
          }
        }
      } catch (e) {
        // Skip files that can't be read (folders, binary, etc)
      }
    }
    
    // Store
    if ((window as any).__currentFolder) {
      (window as any).__currentFolder.fileContents = contents;
    } else {
      (window as any).__currentFolder = {
        path: basePath,
        name: basePath.split(/[/\\]/).pop() || 'Unknown',
        files: files,
        fileContents: contents,
        timestamp: Date.now()
      };
    }
    
    console.log('? Read', Object.keys(contents).length, 'files total');
    return contents;
  };
  
  /**
   * Get current AI context (for debugging)
   * User can call: window.getAIContext()
   */
  (window as any).getAIContext = () => {
    return {
      lastProject: (window as any).__lastProject,
      currentFolder: (window as any).__currentFolder,
      lastCreatedFile: (window as any).__lastCreatedFile,
      currentFolderPath: (window as any).__currentFolderPath
    };
  };
  
  /**
   * Clear all AI context
   * User can call: window.clearAIContext()
   */
  (window as any).clearAIContext = () => {
    (window as any).__lastProject = null;
    (window as any).__currentFolder = null;
    (window as any).__lastCreatedFile = null;
    console.log('??? AI context cleared');
  };
  
  console.log('?? [MAIN.TS] Helper functions available:');
  console.log('   - window.readFile("App.js") - Read specific file');
  console.log('   - window.readAllFiles() - Read all files in folder');
  console.log('   - window.scanFileExplorer() - Scan file explorer DOM');
  console.log('   - window.getAIContext() - View current AI context');
  console.log('   - window.clearAIContext() - Clear all context');
  console.log('   - window.refreshFolderContents() - Alias for readAllFiles');
  
  // ========================================
  // ?? SCAN FILE EXPLORER AS FALLBACK
  // ========================================
  
  /**
   * Scan the file explorer DOM to get current folder and files
   * This works even if events don't fire
   */
  (window as any).scanFileExplorer = () => {
    console.log('?? Scanning file explorer DOM...');
    
    let folderName = 'Unknown';
    let folderPath = '';
    
    // Method 1: Look for folder name in file explorer header/title area
    // Try multiple common selectors
    const headerSelectors = [
      '.file-explorer-header',
      '.folder-name', 
      '.project-name',
      '.file-tree-header',
      '.explorer-title',
      '.folder-title',
      '#file-explorer h3',
      '#file-explorer h4',
      '.sidebar h3',
      '.sidebar h4',
      '.file-panel-header'
    ];
    
    for (const selector of headerSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 50 && !text.includes('of') && !text.includes('files')) {
          folderName = text.toUpperCase() === text ? text : text; // Keep original case
          console.log('?? Found folder name via:', selector, '?', folderName);
          break;
        }
      }
    }
    
    // Method 2: Look for any element that looks like a project/folder title at top of file tree
    if (folderName === 'Unknown') {
      const fileExplorer = document.querySelector('.file-explorer, #file-explorer, .sidebar, .file-panel');
      if (fileExplorer) {
        // Get first few text elements - folder name is usually first
        const walker = document.createTreeWalker(fileExplorer, NodeFilter.SHOW_TEXT);
        let node;
        let attempts = 0;
        while ((node = walker.nextNode()) && attempts < 10) {
          const text = node.textContent?.trim();
          // Folder names: no spaces typically, reasonable length, not file sizes, not "of X"
          if (text && text.length >= 3 && text.length < 40 && 
              !text.includes('KB') && !text.includes('of') && !text.includes('files') &&
              !text.includes('Search') && !text.match(/^\d+$/)) {
            // Check if this looks like a folder/project name (usually UPPERCASE or kebab-case)
            if (text === text.toUpperCase() || text.includes('-') || text.includes('_')) {
              folderName = text;
              console.log('?? Found folder name via text walk:', folderName);
              break;
            }
          }
          attempts++;
        }
      }
    }
    
    // Method 3: Look for breadcrumb/path that contains folder path
    const pathElements = document.querySelectorAll('[class*="path"], [class*="breadcrumb"], .location-bar, .path-bar');
    pathElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && (text.includes('/') || text.includes('\\'))) {
        folderPath = text;
        const pathName = text.split(/[/\\]/).filter(p => p.length > 0).pop();
        if (pathName && folderName === 'Unknown') {
          folderName = pathName;
        }
      }
    });
    
    // Method 4: Check window variables that might have folder info
    if (folderName === 'Unknown') {
      const windowPath = (window as any).currentProjectPath || 
                        (window as any).__currentFolderPath ||
                        (window as any).projectPath;
      if (windowPath) {
        folderPath = windowPath;
        folderName = windowPath.split(/[/\\]/).filter((p: string) => p.length > 0).pop() || 'Unknown';
        console.log('?? Found folder from window variable:', folderName);
      }
    }
    
    // Method 5: Use lastProject name if available and matches file tree
    const lastProject = (window as any).__lastProject;
    if (folderName === 'Unknown' && lastProject?.projectName) {
      folderName = lastProject.projectName;
      folderPath = lastProject.projectPath || '';
      console.log('?? Using lastProject name:', folderName);
    }
    
    // Get all file items from the tree
    const fileSelectors = [
      '.file-tree-item',
      '.file-item', 
      '.tree-item',
      '.file-entry',
      '.explorer-item',
      '[data-file]',
      '.file-row'
    ];
    
    const files: string[] = [];
    
    // Try each selector
    for (const selector of fileSelectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        items.forEach(item => {
          const nameEl = item.querySelector('.file-name, .item-name, .name, span:first-child') || item;
          let name = nameEl.textContent?.trim() || '';
          
          // Clean up: remove size info, icons, etc
          name = name.replace(/[\d.]+\s*KB/gi, '').trim();
          name = name.replace(/[\d.]+\s*MB/gi, '').trim();
          name = name.split('\n')[0].trim(); // Take first line only
          
          if (name && name.length > 0 && name.length < 100 && !files.includes(name)) {
            files.push(name);
          }
        });
        if (files.length > 0) break;
      }
    }
    
    // Fallback: scan all elements with file-like names (has extension)
    if (files.length === 0) {
      const allElements = document.querySelectorAll('.file-explorer *, .sidebar *, #file-explorer *');
      allElements.forEach(el => {
        if (el.children.length === 0) { // Leaf nodes only
          const text = el.textContent?.trim();
          if (text && text.match(/\.\w{1,5}$/) && text.length < 50) {
            // Has file extension
            const cleanName = text.replace(/[\d.]+\s*KB/gi, '').trim();
            if (cleanName && !files.includes(cleanName)) {
              files.push(cleanName);
            }
          }
        }
      });
    }
    
    console.log('?? Found folder:', folderName);
    console.log('?? Found files:', files.length, files.filter(function(fp){ return !/(tsconfig|package-lock|\.lock$)/.test(fp); }).slice(0, 5));
    
    // Store it
    if (files.length > 0 || folderName !== 'Unknown') {
      (window as any).__currentFolder = {
        path: folderPath || folderName,
        name: folderName,
        files: files,
        fileContents: {},
        timestamp: Date.now(),
        source: 'dom-scan'
      };
      
      console.log('? Folder context updated from DOM scan');
      
      // Try to read file contents if we have a real path
      if (folderPath && folderPath.includes('/') || folderPath.includes('\\')) {
        readFileContents(folderPath, files).then(contents => {
          (window as any).__currentFolder.fileContents = contents;
          console.log('? File contents loaded:', Object.keys(contents).length, 'files');
        }).catch(e => console.warn('Could not read files:', e));
      }
    }
    
    return { folderName, folderPath, files };
  };
  
  /**
   * Auto-scan file explorer periodically to keep context fresh
   */
  let lastScannedFolder = '';
  setInterval(() => {
    // Method 1: Check if we have lastProject but no currentFolder
    const lastProject = (window as any).__lastProject;
    const currentFolder = (window as any).__currentFolder;
    
    if (lastProject && !currentFolder) {
      console.log('?? [AUTO-SCAN] Have project but no folder, syncing...');
      (window as any).__currentFolder = {
        path: lastProject.projectPath,
        name: lastProject.projectName,
        files: lastProject.files || [],
        fileContents: {},
        timestamp: Date.now(),
        source: 'lastProject-sync'
      };
      
      // Try to read contents
      if (lastProject.projectPath) {
        readFileContents(lastProject.projectPath, lastProject.files || []).then(contents => {
          (window as any).__currentFolder.fileContents = contents;
        }).catch(() => {});
      }
    }
    
    // Method 2: Check window variables for folder path changes
    const windowPath = (window as any).currentProjectPath || 
                      (window as any).__currentFolderPath ||
                      localStorage.getItem('lastProjectPath');
    
    if (windowPath && windowPath !== lastScannedFolder) {
      console.log('?? [AUTO-SCAN] Folder path changed:', windowPath);
      lastScannedFolder = windowPath;
      
      const folderName = windowPath.split(/[/\\]/).filter((p: string) => p).pop() || 'Unknown';
      
      // Clear old project if different
      if (lastProject && !windowPath.includes(lastProject.projectName)) {
        console.log('??? Clearing old project context (folder mismatch)');
        (window as any).__lastProject = null;
      }
      
      // Trigger full scan
      (window as any).scanFileExplorer();
    }
  }, 15000); // Check every 15 seconds (path changes are infrequent)
  
  console.log('   - window.scanFileExplorer() - Manually scan file explorer');
}

// ============================================================================
// COMPREHENSIVE CONVERSATION FIX - PREVENTS DATA LOSS
// ============================================================================
// This fix:
// 1. Syncs localStorage data to manager BEFORE any save
// 2. Prevents saving if it would result in data loss
// 3. Patches getCurrentConversation to not create empty conversations
// 4. Auto-renders saved messages on startup
// ============================================================================

(function COMPREHENSIVE_CONVERSATION_FIX() {
  // ? FIX: Disabled - all rendering now through conversationRenderCoordinator.ts
  console.log('?? [ConversationFix] DISABLED - using conversationRenderCoordinator');
  return;
  // --- Original code below (unreachable) ---
  console.log('?? [ConversationFix] Starting...');
  
  // Get best data from localStorage
  function getLocalStorageData() {
    try {
      const saved = localStorage.getItem('ai_conversations');
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      let totalMessages = 0;
      let bestConv: any = null;
      let bestCount = 0;
      
      if (data.conversations) {
        for (const [id, conv] of data.conversations) {
          const count = conv.messages?.length || 0;
          totalMessages += count;
          if (count > bestCount) {
            bestCount = count;
            bestConv = conv;
          }
        }
      }
      
      return { raw: data, totalMessages, bestConv, bestCount };
    } catch (e) {
      return null;
    }
  }
  
  // Sync localStorage to manager
  function syncLocalStorageToManager() {
    const cm = (window as any).conversationManager;
    if (!cm || !(cm.conversations instanceof Map)) return false;
    
    const localData = getLocalStorageData();
    if (!localData || !localData.raw.conversations) return false;
    
    // Count manager messages
    let managerMsgs = 0;
    cm.conversations.forEach((c: any) => managerMsgs += (c.messages?.length || 0));
    
    // Only sync if localStorage has MORE messages
    if (localData.totalMessages > managerMsgs) {
      console.log(`?? [ConversationFix] Syncing localStorage (${localData.totalMessages} msgs) to manager (${managerMsgs} msgs)`);
      
      cm.conversations.clear();
      for (const [id, conv] of localData.raw.conversations) {
        cm.conversations.set(id, conv);
      }
      
      if (localData.bestConv?.id) {
        cm.currentConversationId = localData.bestConv.id;
      }
      return true;
    }
    return false;
  }
  
  // Render messages to UI
  function renderMessages(conv: any): boolean {
    if (!conv?.messages?.length) return false;
    
    const container = document.querySelector('.ai-chat-container');
    if (!container) return false;
    
    container.innerHTML = '';
    
    conv.messages.forEach((msg: any, i: number) => {
      const div = document.createElement('div');
      div.className = `ai-message ${msg.role}-message`;
      div.setAttribute('data-message-id', msg.id || `msg-${i}`);
      div.style.opacity = '1';
      
      const content = document.createElement('div');
      content.className = 'ai-message-content';
      content.innerHTML = (msg.content || '')
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => { const e = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); return `<pre class="code-block"><code class="language-${lang||'plaintext'}">${e}</code></pre>`; })
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      
      div.appendChild(content);
      container.appendChild(div);
    });
    
    // ?? Use scroll manager
    scrollChatToBottom();
    
    const titleEl = document.getElementById('conversation-title');
    if (titleEl && conv.title) titleEl.textContent = conv.title;
    
    return true;
  }
  
  // Apply patches and render
  function initialize() {
    const cm = (window as any).conversationManager;
    if (!cm) return;
    
    // PATCH 1: Prevent auto-creation in getCurrentConversation
    if (!cm.__getCurrentPatched) {
      cm.__getCurrentPatched = true;
      cm.getCurrentConversation = function() {
        syncLocalStorageToManager();
        if (this.currentConversationId && this.conversations.has(this.currentConversationId)) {
          return this.conversations.get(this.currentConversationId);
        }
        if (this.conversations.size > 0) {
          this.currentConversationId = this.conversations.keys().next().value;
          return this.conversations.get(this.currentConversationId);
        }
        return null;
      };
    }
    
    // PATCH 2: Block saves that would lose data
    if (!cm.__savePatched) {
      cm.__savePatched = true;
      const originalSave = cm.saveConversations.bind(cm);
      
      cm.saveConversations = async function() {
        syncLocalStorageToManager();
        
        let managerMsgs = 0;
        this.conversations.forEach((c: any) => managerMsgs += (c.messages?.length || 0));
        
        let localMsgs = 0;
        try {
          const local = JSON.parse(localStorage.getItem('ai_conversations') || '{}');
          if (local.conversations) {
            local.conversations.forEach(([id, c]: [string, any]) => localMsgs += (c.messages?.length || 0));
          }
        } catch(e) {}
        
        if (managerMsgs < localMsgs) {
          console.log(`?? [ConversationFix] BLOCKED save: would lose ${localMsgs - managerMsgs} messages`);
          return;
        }
        
        return originalSave();
      };
    }
    
// Sync and render - but respect current conversation
syncLocalStorageToManager();
const localData = getLocalStorageData();
if (localData?.bestConv) {
  const container = document.querySelector('.ai-chat-container');
  const uiCount = container?.querySelectorAll('.ai-message, .user-message, .assistant-message').length || 0;
  
  // ? FIX: Only render if same conversation AND fewer messages
  const currentConv = (window as any).conversationManager?.getCurrentConversation?.();
  const isSameConversation = currentConv?.id === localData.bestConv.id;
  
  if (isSameConversation && uiCount < localData.bestCount) {
    renderMessages(localData.bestConv);
    console.log(`? [ConversationFix] Rendered ${localData.bestCount} messages`);
  } else if (!isSameConversation) {
    console.log(`?? [ConversationFix] Different conversation active, not overriding`);
  }
}
  }
  
  // Run at multiple intervals
  setTimeout(initialize, 500);
  setTimeout(initialize, 1000);
  setTimeout(initialize, 2000);
  setTimeout(initialize, 3000);
  setTimeout(initialize, 5000);
  
  // Protection for 60 seconds
  let checks = 0;
  const protectInterval = setInterval(() => {
    checks++;
    initialize();
    if (checks >= 30) {
      clearInterval(protectInterval);
      console.log('? [ConversationFix] Protection period ended');
    }
  }, 2000);
  
  console.log('? [ConversationFix] Initialized with data loss protection');
})();

// ============================================================================
// FILE HIGHLIGHT SYSTEM - Blue dot indicators for AI-analyzed files
// ============================================================================
// Shows blue dots + highlight bar next to files being analyzed, clears after AI response
// ============================================================================

(function initializeFileHighlightSystem() {
  console.log('?? Initializing File Highlight System...');
  
  // Add CSS for file highlight indicators
  if (!document.getElementById('file-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'file-highlight-styles';
    style.textContent = `
      /* Blue dot indicator + highlight bar for AI-analyzed files */
      .ai-file-reading {
        background: linear-gradient(90deg, rgba(79, 195, 247, 0.3) 0%, rgba(79, 195, 247, 0.1) 60%, transparent 100%) !important;
        border-left: 3px solid #4fc3f7 !important;
        position: relative;
        animation: aiFileHighlightPulse 1.5s ease-in-out infinite;
        border-radius: 3px;
      }
      
      .ai-file-reading::after {
        content: ' ?';
        color: #4fc3f7;
        font-size: 10px;
        animation: aiFileDotPulse 1s ease-in-out infinite;
        text-shadow: 0 0 6px rgba(79, 195, 247, 0.8);
      }
      
      @keyframes aiFileHighlightPulse {
        0%, 100% { 
          background: linear-gradient(90deg, rgba(79, 195, 247, 0.25) 0%, rgba(79, 195, 247, 0.08) 60%, transparent 100%) !important;
        }
        50% { 
          background: linear-gradient(90deg, rgba(79, 195, 247, 0.45) 0%, rgba(79, 195, 247, 0.18) 60%, transparent 100%) !important;
        }
      }
      
      @keyframes aiFileDotPulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.3); }
      }
      
      /* Ensure text stays visible on highlight */
      .ai-file-reading > span,
      .ai-file-reading > .file-name {
        color: #4fc3f7 !important;
      }
      
      /* Icon color on highlighted files */
      .ai-file-reading svg {
        filter: drop-shadow(0 0 4px rgba(79, 195, 247, 0.5));
      }
    `;
    document.head.appendChild(style);
    console.log('? File highlight styles injected');
  }
  
  // Track highlighted files (for backwards compatibility)
  const highlightedFiles = new Set<string>();
  
  /**
   * File Highlight System v2 - Bridges to aiFileExplorer highlight system
   * These functions connect the old API to the new multi-state highlight system
   */
  
  // Bridge: highlightFileBeingRead -> highlightFileReading
  (window as any).highlightFileBeingRead = (filePath: string) => {
    if (!filePath) return;
    const fileName = filePath.split(/[\\/]/).pop() || '';
    console.log('?? [v2] Highlighting file:', fileName);
    
    // Use new highlight system
    if ((window as any).highlightFileReading) {
      (window as any).highlightFileReading(filePath, 50);
    } else if ((window as any).aiHighlight?.reading) {
      (window as any).aiHighlight.reading(filePath, 50);
    } else {
      // Fallback to old class-based system
      document.querySelectorAll('[data-path]').forEach(el => {
        const elPath = el.getAttribute('data-path') || '';
        const elFileName = elPath.split(/[\\/]/).pop() || '';
        if (elFileName === fileName) {
          el.classList.add('ai-file-reading');
          highlightedFiles.add(filePath);
        }
      });
    }
  };
  
  // Bridge: clearFileHighlights -> clearAllHighlights
  (window as any).clearFileHighlights = () => {
    console.log('?? [v2] Clearing file highlights...');
    
    // Use new system
    if ((window as any).clearAllHighlights) {
      (window as any).clearAllHighlights();
    } else if ((window as any).aiHighlight?.clearAll) {
      (window as any).aiHighlight.clearAll();
    }
    
    // Also clear old-style highlights for backwards compatibility
    document.querySelectorAll('.ai-file-reading').forEach(el => {
      el.classList.remove('ai-file-reading');
    });
    highlightedFiles.clear();
  };
  
  // Get list of currently highlighted files
  (window as any).getHighlightedFiles = () => {
    return Array.from(highlightedFiles);
  };
  
  // Test highlight function - uses new multi-state animation
  (window as any).testFileHighlight = (fileName: string = 'package.json') => {
    console.log('?? Testing highlight on:', fileName);
    
    if ((window as any).aiHighlight) {
      // New system: show full animation cycle
      (window as any).aiHighlight.scanning(fileName);
      setTimeout(() => (window as any).aiHighlight.reading(fileName, 30), 800);
      setTimeout(() => (window as any).aiHighlight.reading(fileName, 70), 1600);
      setTimeout(() => (window as any).aiHighlight.reading(fileName, 100), 2400);
      setTimeout(() => (window as any).aiHighlight.indexed(fileName), 3000);
      console.log('?? Test running - will auto-clear after 8 seconds');
    } else {
      // Fallback
      (window as any).highlightFileBeingRead(fileName);
      setTimeout(() => {
        (window as any).clearFileHighlights();
        console.log('?? Test complete - highlights cleared');
      }, 5000);
    }
  };
  
  console.log('? File Highlight System v2 ready (bridges to aiFileExplorer)');
  console.log('   ? window.highlightFileBeingRead(path) - Start reading highlight');
  console.log('   ? window.highlightFileScanning(path) - Mark as scanning');
  console.log('   ? window.highlightFileReading(path, progress) - Mark as reading');
  console.log('   ? window.highlightFileIndexed(path) - Mark as complete');
  console.log('   ? window.clearFileHighlights() / window.clearAllHighlights() - Clear all');
  console.log('   ? window.testFileHighlight("file.ts") - Test animation cycle');
})();

// ============================================================================
// TOOLBAR BUTTON FIXES - Terminal Animation + AI Search Tooltip
// Add this to the END of your main.ts file
// FIXED: Clears inline styles every poll for consistent appearance
// ============================================================================

// Wait for DOM to be ready
setTimeout(() => {
  console.log('?? [main.ts] Applying toolbar button fixes...');
  
  // ========================================
  // 1. TERMINAL BUTTON ANIMATION
  // ========================================
  if (!document.getElementById('terminal-btn-fix-styles')) {
    const style = document.createElement('style');
    style.id = 'terminal-btn-fix-styles';
    style.textContent = `
      @keyframes terminalPulse {
        0%, 100% { 
          transform: scale(1);
          box-shadow: 0 0 8px rgba(79, 195, 247, 0.6);
        }
        50% { 
          transform: scale(1.15);
          box-shadow: 0 0 24px rgba(79, 195, 247, 1);
        }
      }
      
      #terminal-ctx-btn.btn-fix-on {
        color: #4fc3f7 !important;
        background: rgba(79, 195, 247, 0.25) !important;
        border: 2px solid #4fc3f7 !important;
        border-radius: 6px !important;
        animation: terminalPulse 1.2s ease-in-out infinite !important;
      }
      
      #terminal-ctx-btn.btn-fix-on svg {
        color: #4fc3f7 !important;
        filter: drop-shadow(0 0 8px rgba(79, 195, 247, 1)) !important;
      }
      
      #terminal-ctx-btn.btn-fix-off {
        color: #707070 !important;
        background: transparent !important;
        border: 1px solid transparent !important;
        border-radius: 6px !important;
        animation: none !important;
        box-shadow: none !important;
        transform: scale(1) !important;
      }
      
      #terminal-ctx-btn.btn-fix-off svg {
        filter: none !important;
        color: #707070 !important;
      }
      
      #terminal-ctx-btn.btn-fix-off:hover {
        color: #aaa !important;
        background: rgba(255,255,255,0.08) !important;
        border-color: #555 !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Poll for terminal button state
  let lastTerminalState: boolean | null = null;
  
  setInterval(() => {
    const btn = document.getElementById('terminal-ctx-btn');
    if (!btn) return;
    
    const tc = (window as any).terminalContext;
    const isOn = tc?.isEnabled?.() || false;
    
    // ALWAYS clear inline styles (original code keeps re-adding them)
    btn.style.color = '';
    btn.style.background = '';
    btn.style.border = '';
    btn.style.boxShadow = '';
    btn.style.animation = '';
    btn.style.transform = '';
    btn.style.borderRadius = '';
    
    // Only update classes if state changed
    if (isOn !== lastTerminalState) {
      lastTerminalState = isOn;
      
      // Remove ALL animation classes
      btn.classList.remove(
        'btn-fix-on', 'btn-fix-off',
        'btn-anim-on', 'btn-anim-off',
        'anim-on', 'anim-off',
        'terminal-on', 'terminal-off',
        'icon-anim-on', 'icon-anim-off',
        'terminal-ctx-on', 'terminal-ctx-off'
      );
      
      btn.classList.add(isOn ? 'btn-fix-on' : 'btn-fix-off');
      btn.title = isOn 
        ? '? Terminal Context: ON\nAI will see terminal errors\nClick to disable'
        : '? Terminal Context: OFF\nClick to enable (Ctrl+Shift+T)';
      
      console.log('?? Terminal:', isOn ? '?? ON (pulsing)' : '? OFF (static)');
    }
  }, 1000); // 1s polling ? no need for 100ms, state changes are infrequent
  
  // ========================================
  // 2. AI PROJECT SEARCH TOOLTIP
  // ========================================
  let lastAISearchState: boolean | null = null;
  
  setInterval(() => {
    // Find AI Search button - the sparkle icon
    const aiSearchBtn = document.getElementById('ai-search-toggle') ||
                        document.getElementById('ai-file-explorer-toggle') ||
                        document.querySelector('.ai-search-btn') ||
                        document.querySelector('[data-feature="ai-search"]');
    
    if (!aiSearchBtn) return;
    
    // Check state from localStorage
    const isOn = localStorage.getItem('aiFileExplorerEnabled') === 'true';
    
    if (isOn === lastAISearchState) return;
    lastAISearchState = isOn;
    
    // Update tooltip
    (aiSearchBtn as HTMLElement).title = isOn 
      ? '? AI Project Search: ON\nAI will search project files\nClick to disable'
      : '? AI Project Search: OFF\nClick to enable';
    
    console.log('?? AI Search:', isOn ? '?? ON' : '? OFF');
  }, 2000); // 2s is plenty ? state only changes on user click
  
  console.log('? [main.ts] Toolbar button fixes applied!');
}, 2000); // Reduced to 2 seconds

// ============================================================================
// AI FILE EXPLORER CLASS - Automatic Project Scanning for AI Context
// ============================================================================
// When ?AI is enabled, this scans project files and provides context to AI
// ============================================================================

(function initializeAIFileExplorerSystem() {
  console.log('?? Initializing AI File Explorer System...');

  // ALWAYS patch - don't skip even if exists (existing one might be broken)
  const existing = (window as any).aiFileExplorer;
  if (existing) {
    // Test if it's working
    const testEnabled = existing.isEnabled?.();
    const testFiles = existing.getFiles?.()?.length || 0;
    console.log('?? Existing aiFileExplorer - isEnabled:', testEnabled, 'files:', testFiles);
    
    // If working properly, skip
    if (testEnabled !== undefined && testFiles > 0) {
      console.log('? AI File Explorer already working, skipping');
      return;
    }
    
    // Otherwise, patch the broken one
    console.log('?? Existing aiFileExplorer is broken, patching...');
  }

  // Create/patch the AI File Explorer
  class AIFileExplorer {
    private projectFiles: any[] = [];
    private fileContents: Map<string, string> = new Map();
    private lastScanTime: number = 0;
    private isScanning: boolean = false;

    constructor() {
      this.setupListeners();
      setTimeout(() => this.scanProject(), 2000);
    }

    private setupListeners(): void {
      document.addEventListener('project-opened', () => {
        console.log('?? Project opened - triggering AI scan');
        this.scanProject();
      });
      document.addEventListener('folder-opened', () => this.scanProject());
      document.addEventListener('file-saved', () => this.fileContents.clear());
    }

    isEnabled(): boolean {
      return localStorage.getItem('aiFileExplorerEnabled') === 'true';
    }

    async scanProject(): Promise<any[]> {
      if (this.isScanning) return this.projectFiles;
      
      const now = Date.now();
      if (now - this.lastScanTime < 30000 && this.projectFiles.length > 0) {
        return this.projectFiles;
      }

      this.isScanning = true;
      
      try {
        const projectPath = (window as any).currentFolderPath || 
                           localStorage.getItem('ide_last_project_path') || '';
        
        if (!projectPath) {
          this.isScanning = false;
          return [];
        }

        // Get files from DOM
        const domFiles = this.getFilesFromDOM();
        
        // Get from window.__projectFiles if available
        const windowFiles = (window as any).__projectFiles?.getPaths?.() || [];
        
        const allPaths = new Set([...domFiles, ...windowFiles]);
        
        this.projectFiles = Array.from(allPaths).map(path => ({
          path,
          name: (path as string).split(/[/\\]/).pop() || '',
          extension: ((path as string).split('.').pop() || '').toLowerCase()
        }));

        // Try Tauri scan for more complete file list
        if ((window as any).__TAURI__) {
          try {
            const tauriFiles = await this.scanDir(projectPath, 0);
            tauriFiles.forEach((f: any) => {
              if (!this.projectFiles.find(pf => pf.path === f.path)) {
                this.projectFiles.push(f);
              }
            });
          } catch (e) { }
        }

        this.lastScanTime = now;
        console.log(`? AI File Explorer: Scanned ${this.projectFiles.length} files`);
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('ai-files-scanned', {
          detail: { count: this.projectFiles.length }
        }));
        
      } catch (e) {
        console.error('AI File Explorer scan error:', e);
      }

      this.isScanning = false;
      return this.projectFiles;
    }

    private getFilesFromDOM(): string[] {
      const files: string[] = [];
      const selectors = ['[data-path]', '.tree-item[data-file-path]', '.file-item[data-path]'];
      
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          const path = el.getAttribute('data-path') || el.getAttribute('data-file-path') || '';
          if (path && !path.includes('node_modules') && !path.includes('.git')) {
            files.push(path);
          }
        });
      });
      
      return [...new Set(files)];
    }

    private async scanDir(dirPath: string, depth: number): Promise<any[]> {
      if (depth > 5) return [];
      const files: any[] = [];
      
      try {
        const items = await invoke('read_directory_detailed', { path: dirPath });
        for (const item of (items as any[])) {
          if (this.shouldIgnore(item.name)) continue;
          
          if (item.is_dir) {
            const subFiles = await this.scanDir(item.path, depth + 1);
            files.push(...subFiles);
          } else {
            files.push({
              path: item.path,
              name: item.name,
              extension: (item.name.split('.').pop() || '').toLowerCase()
            });
          }
        }
      } catch (e) { }
      
      return files;
    }

    private shouldIgnore(name: string): boolean {
      return ['node_modules', '.git', '.svn', 'dist', 'build', '.next', '__pycache__', 'target'].some(p => name.includes(p));
    }

    async findRelated(query: string): Promise<any[]> {
      if (!this.isEnabled()) return [];
      
      await this.scanProject();
      
      const keywords = this.extractKeywords(query);
      const matches: any[] = [];

      for (const file of this.projectFiles) {
        const score = this.calculateScore(file, keywords, query);
        if (score > 0) {
          matches.push({ path: file.path, name: file.name, score });
        }
      }

      return matches.sort((a, b) => b.score - a.score).slice(0, 4);
    }

    private extractKeywords(query: string): string[] {
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'be', 'have', 'has', 
        'do', 'does', 'will', 'would', 'could', 'should', 'can', 'this', 'that', 'i', 'you',
        'my', 'your', 'what', 'how', 'why', 'when', 'where', 'please', 'help', 'me', 'with',
        'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'file', 'code']);
      
      return query.toLowerCase()
        .replace(/[^\w\s.-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
    }

    private calculateScore(file: any, keywords: string[], query: string): number {
      let score = 0;
      const fileName = file.name.toLowerCase();
      const filePath = file.path.toLowerCase();
      const queryLower = query.toLowerCase();

      for (const kw of keywords) {
        if (fileName === kw || fileName === kw + '.ts' || fileName === kw + '.tsx') score += 100;
        else if (fileName.includes(kw)) score += 50;
        if (filePath.includes(kw)) score += 20;
      }

      // Context-based scoring
      if (queryLower.includes('style') && (file.extension === 'css' || file.extension === 'scss')) score += 30;
      if (queryLower.includes('component') && (file.extension === 'tsx' || file.extension === 'jsx')) score += 30;
      if (queryLower.includes('config') && fileName.includes('config')) score += 30;
      if (queryLower.includes('test') && (fileName.includes('test') || fileName.includes('spec'))) score += 30;
      if (queryLower.includes('api') && (filePath.includes('api') || filePath.includes('service'))) score += 30;
      
      // ? ADD: Boost important project files for general questions
      if (queryLower.includes('project') || queryLower.includes('what') || queryLower.includes('structure')) {
        if (fileName === 'package.json') score += 100;
        if (fileName.includes('vite.config')) score += 80;
        if (fileName.includes('tsconfig')) score += 80;
        if (fileName.startsWith('main.') || fileName.startsWith('index.') || fileName.startsWith('app.')) score += 60;
        if (fileName === 'readme.md') score += 50;
      }
      
      // Always give small boost to key config files
      if (fileName === 'package.json') score += 20;
      if (fileName.includes('tsconfig')) score += 15;
      if (fileName.includes('vite.config')) score += 15;

      return score;
    }

    async read(filePath: string, maxChars: number = 4000): Promise<string> {
      const cached = this.fileContents.get(filePath);
      if (cached) return cached.substring(0, maxChars);

      try {
        let content = '';
        
        if ((window as any).__TAURI__) {
          try {
            content = await invoke('read_file_content', { path: filePath }) as string;
          } catch (e) {
            try {
              const { readTextFile } = await import('@tauri-apps/plugin-fs');
              content = await readTextFile(filePath);
            } catch (e2) { }
          }
        }

        if (content) {
          this.fileContents.set(filePath, content);
          return content.substring(0, maxChars);
        }
      } catch (e) {
        console.error('Failed to read:', filePath);
      }

      return `// Could not read: ${filePath}`;
    }

    async search(term: string): Promise<any[]> {
      await this.scanProject();
      const termLower = term.toLowerCase();
      
      return this.projectFiles
        .filter(f => f.name.toLowerCase().includes(termLower) || f.path.toLowerCase().includes(termLower))
        .map(f => ({ path: f.path, name: f.name, score: f.name.toLowerCase() === termLower ? 100 : 50 }))
        .sort((a, b) => b.score - a.score);
    }

    getFiles(): any[] {
      return this.projectFiles;
    }

    async getProjectSummary(): Promise<string> {
      await this.scanProject();
      const path = (window as any).currentFolderPath || '';
      const name = path.split(/[/\\]/).pop() || 'Project';
      
      const byExt: Record<string, number> = {};
      this.projectFiles.forEach(f => byExt[f.extension] = (byExt[f.extension] || 0) + 1);
      
      return `?? Project: ${name}\n?? Files: ${this.projectFiles.length}\n?? Types: ${Object.entries(byExt).map(([e,c]) => `${e}(${c})`).join(', ')}`;
    }

    async rescan(): Promise<void> {
      this.lastScanTime = 0;
      this.fileContents.clear();
      await this.scanProject();
    }
  }

  // Create and expose globally
  const aiFileExplorer = new AIFileExplorer();
  (window as any).aiFileExplorer = aiFileExplorer;

  console.log('? AI File Explorer System ready!');
  console.log('   window.aiFileExplorer.findRelated(query) - Find relevant files');
  console.log('   window.aiFileExplorer.read(path) - Read file content');
  console.log('   window.aiFileExplorer.search(term) - Search by name');
  console.log('   window.aiFileExplorer.getProjectSummary() - Get project overview');
})();

// ============================================================================
// AI PROJECT HEADER - ?AI Badge for File Tree
// ============================================================================

(function initializeAIProjectHeader() {
  console.log('?? Initializing AI Project Header...');
  
  function createAIBadge(): HTMLElement {
    const badge = document.createElement('span');
    badge.id = 'tree-ai-badge';
    badge.setAttribute('data-ai-search-toggle', 'true');
    
    // Check AI state from multiple sources
    const isEnabled = () => {
      // Check window state first (most up-to-date)
      if (typeof (window as any).aiFileExplorerEnabled === 'boolean') {
        return (window as any).aiFileExplorerEnabled;
      }
      // Fall back to localStorage
      return localStorage.getItem('aiFileExplorerEnabled') === 'true';
    };
    
    const update = () => {
      const on = isEnabled();
      // Simple text style: "?AI" when on (cyan), "AI" when off (gray)
      badge.innerHTML = on 
        ? `<span style="color: #4fc3f7;">?</span><span style="color: #4fc3f7;">AI</span>`
        : `<span style="color: #666;">AI</span>`;
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        margin-left: 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        background: transparent;
        border: none;
        transition: opacity 0.15s ease;
        user-select: none;
      `;
      badge.title = on 
        ? '?? AI Search: ON - Click to disable' 
        : '? AI Search: OFF - Click to enable';
    };
    
    update();
    
    // Hover effect - just opacity
    badge.onmouseover = () => { badge.style.opacity = '0.7'; };
    badge.onmouseout = () => { badge.style.opacity = '1'; };
    
    badge.onclick = (e) => {
      e.stopPropagation();
      const newState = !isEnabled();
      // Update both storage locations
      localStorage.setItem('aiFileExplorerEnabled', newState ? 'true' : 'false');
      (window as any).aiFileExplorerEnabled = newState;
      update();
      window.dispatchEvent(new CustomEvent('aiSearchToggled', { detail: { enabled: newState }}));
      
      if (newState && (window as any).aiFileExplorer) {
        (window as any).aiFileExplorer.scanProject();
      }
      
      console.log(`?? AI Search: ${newState ? 'ON' : 'OFF'}`);
    };
    
    // Listen for external toggle changes
    window.addEventListener('aiSearchToggled', () => {
      setTimeout(update, 50);
    });
    
    // Listen for storage changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'aiFileExplorerEnabled') {
        update();
      }
    });
    
    // Periodic sync removed - events handle updates
    // setInterval(update, 1000);  // ? DISABLED: caused visual flicker
    
    return badge;
  }
  
  function createHeaderBtn(title: string, svg: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.title = title;
    btn.innerHTML = svg;
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: #808080;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      width: 22px;
      height: 22px;
      transition: all 0.15s ease;
    `;
    btn.onmouseover = () => { btn.style.background = '#3c3c3c'; btn.style.color = '#fff'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#808080'; };
    btn.onclick = onClick;
    return btn;
  }
  
  function getProjectName(): string {
    const path = (window as any).currentFolderPath || localStorage.getItem('ide_last_project_path') || '';
    if (!path) return '';
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Project';
  }
  
  function createProjectHeader(name: string): HTMLElement {
    const header = document.createElement('div');
    header.id = 'ai-project-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: linear-gradient(180deg, #2d2d30 0%, #252526 100%);
      border-bottom: 1px solid #3c3c3c;
      font-size: 11px;
      color: #ccc;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: sticky;
      top: 0;
      z-index: 10;
      min-height: 28px;
    `;
    
    const left = document.createElement('div');
    left.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 1; overflow: hidden; min-height: 20px;';
    
    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    nameEl.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1;';
    left.appendChild(nameEl);
    
    // ?? FIX: Only add AI badge if none exists anywhere (prevents duplicate with aiFileExplorer.ts)
    const existingBadge = document.querySelector('#tree-ai-badge, #project-ai-badge, .project-ai-indicator');
    if (!existingBadge) {
      left.appendChild(createAIBadge());
    }
    
    header.appendChild(left);
    
    const right = document.createElement('div');
    right.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-left: 12px;';
    
    right.appendChild(createHeaderBtn('Refresh', 
      `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" stroke-width="1.5"/><path d="M8 2V5L11 3" fill="currentColor"/></svg>`,
      () => {
        document.dispatchEvent(new CustomEvent('refresh-file-tree'));
        if ((window as any).aiFileExplorer) {
          (window as any).aiFileExplorer.rescan();
        }
      }
    ));
    
    right.appendChild(createHeaderBtn('Close Project', 
      `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>`,
      () => {
        // Close all open tabs
        (window as any).tabManager?.closeAllTabs?.();
        
        // Clear the file tree
        const tree = document.getElementById('file-tree');
        if (tree) tree.innerHTML = '';
        
        // Clear all project path state
        (window as any).currentFolderPath = null;
        (window as any).currentProjectPath = '';
        
        // ? FIX: Clear localStorage so project won't auto-restore on restart
        localStorage.removeItem('ide_last_project_path');
        localStorage.removeItem('currentProjectPath');
        localStorage.removeItem('lastProjectPath');
        localStorage.removeItem('ide_last_opened_file');
        console.log('?? [Close] Cleared all project persistence data');
        
        // Remove the project header itself
        const header = document.getElementById('ai-project-header');
        if (header) header.remove();
        
        // Notify other systems
        document.dispatchEvent(new CustomEvent('project-closed'));
      }
    ));
    
    header.appendChild(right);
    return header;
  }
  
  function ensureHeader(): void {
    // ?? FIX: Don't create duplicate headers
    // Check for ANY existing project header, not just our specific one
    const existingHeaders = document.querySelectorAll(
      '#ai-project-header, ' +
      '.project-header, ' +
      '.fcm-header, ' +
      '[class*="project-header"], ' +
      '.explorer-header, ' +
      '.tree-project-header'
    );
    
    // ?? FIX: Check for ANY existing AI badge (from main.ts OR aiFileExplorer.ts)
    const existingBadge = document.querySelector(
      '#tree-ai-badge, #project-ai-badge, .project-ai-indicator, .ai-badge'
    );
    
    // If any header already exists that shows the project name, don't add another
    if (existingHeaders.length > 0) {
      // Only add badge if NO badge exists anywhere
      if (!existingBadge) {
        const projectName = getProjectName();
        existingHeaders.forEach(header => {
          const text = header.textContent || '';
          if (text.includes(projectName)) {
            // Add AI badge to existing header if not present
            const badge = createAIBadge();
            const nameEl = header.querySelector('.fcm-header-name, .project-name, span');
            if (nameEl) {
              nameEl.parentNode?.insertBefore(badge, nameEl.nextSibling);
            }
          }
        });
      }
      return;
    }
    
    const tree = document.querySelector('#file-tree, .file-tree, #files-content');
    if (!tree) return;
    
    const hasFiles = tree.querySelector('.tree-item, .file-item, [data-path], .tree-node');
    if (!hasFiles) return;
    
    const name = getProjectName();
    if (!name) return;
    
    const header = createProjectHeader(name);
    tree.insertBefore(header, tree.firstChild);
    console.log('? AI Project Header added:', name);
  }
  
  // Listen for project events
  document.addEventListener('project-opened', () => setTimeout(ensureHeader, 500));
  document.addEventListener('folder-opened', () => setTimeout(ensureHeader, 500));
  
  // ?? FIX: Reduced frequency - check less often since headers don't change much
  // Only check once on load, no need for constant polling
  setTimeout(ensureHeader, 2000);
  
  // Animation for scanning
  (window as any).startExplorerScanAnimation = () => {
    const badge = document.getElementById('tree-ai-badge');
    if (badge) {
      badge.style.animation = 'pulse 0.5s ease-in-out infinite';
      // Auto-stop after 5s safety net
      setTimeout(() => { if (badge) badge.style.animation = ''; }, 5000);
    }
  };
  
  (window as any).stopExplorerScanAnimation = () => {
    const badge = document.getElementById('tree-ai-badge');
    if (badge) badge.style.animation = '';
  };

  // Add pulse animation style
  if (!document.getElementById('ai-badge-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-badge-styles';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  console.log('? AI Project Header ready!');
})();

console.log('? [main.ts] AI File Explorer + Project Header integration complete!');

// ============================================================================
// FINAL FIX: Ensure aiFileExplorer works (runs AFTER all other modules)
// ============================================================================
setTimeout(() => {
  console.log('?? [FINAL FIX] Checking aiFileExplorer...');
  
  const existing = (window as any).aiFileExplorer;
  if (!existing) {
    console.error('? aiFileExplorer not found!');
    return;
  }

  // Test if it's working
  const testEnabled = existing.isEnabled?.();
  const testFiles = existing.getFiles?.()?.length || 0;
  console.log('?? aiFileExplorer status - isEnabled:', testEnabled, 'files:', testFiles);

  // If broken, patch it
  if (testEnabled === undefined || testFiles === 0) {
    console.log('?? aiFileExplorer is broken, applying fix...');
    
    let cachedFiles: any[] = [];
    const fileContents = new Map<string, string>();

    // Patch isEnabled
    existing.isEnabled = function() {
      return localStorage.getItem('aiFileExplorerEnabled') === 'true';
    };

    // Patch getFiles
    existing.getFiles = function() {
      return cachedFiles;
    };

    // Patch scanProject
    existing.scanProject = async function() {
      console.log('?? Scanning project files...');
      
      // Get from DOM
      const domFiles: string[] = [];
      document.querySelectorAll('[data-path]').forEach(el => {
        const path = el.getAttribute('data-path');
        if (path && !path.includes('node_modules') && !path.includes('.git')) {
          domFiles.push(path);
        }
      });

      cachedFiles = [...new Set(domFiles)].map(path => ({
        path,
        name: path.split(/[/\\]/).pop() || '',
        extension: (path.split('.').pop() || '').toLowerCase()
      }));

      // Try Tauri scan
      try {
        const projectPath = (window as any).currentFolderPath || 
                           localStorage.getItem('ide_last_project_path');
        
        if (projectPath && (window as any).__TAURI__) {
          const { invoke } = await import('@tauri-apps/api/core');
          
          const scanDir = async (dir: string, depth = 0): Promise<any[]> => {
            if (depth > 4) return [];
            const results: any[] = [];
            try {
              const items = await invoke('read_directory_detailed', { path: dir }) as any[];
              for (const item of items) {
                if (['node_modules', '.git', 'dist', 'build', 'target'].includes(item.name)) continue;
                if (item.is_dir) {
                  results.push(...await scanDir(item.path, depth + 1));
                } else {
                  results.push({
                    path: item.path,
                    name: item.name,
                    extension: (item.name.split('.').pop() || '').toLowerCase()
                  });
                }
              }
            } catch(e) {}
            return results;
          };
          
          const tauriFiles = await scanDir(projectPath);
          tauriFiles.forEach((f: any) => {
            if (!cachedFiles.find(cf => cf.path === f.path)) {
              cachedFiles.push(f);
            }
          });
        }
      } catch(e) {
        console.log('Tauri scan skipped');
      }

      console.log('? Scanned', cachedFiles.length, 'files');
      return cachedFiles;
    };

    // Patch findRelated - SMART matching for all project files
    existing.findRelated = async function(query: string) {
      if (!this.isEnabled()) return [];
      await this.scanProject();
      
      const queryLower = query.toLowerCase();
      const matches: any[] = [];
      
      // Extract potential file names from query (e.g., "main.tsx", "App.css")
      const fileNameMatches = query.match(/\b[\w.-]+\.(ts|tsx|js|jsx|css|scss|json|html|md|py|rs|go|java|c|cpp|h|vue|svelte)\b/gi) || [];
      
      // Extract keywords (filter out common words)
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'be', 'have', 'has', 'do', 'does', 'will', 'would', 'could', 'should', 'can', 'this', 'that', 'i', 'you', 'my', 'your', 'what', 'how', 'why', 'when', 'where', 'please', 'help', 'me', 'with', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'show', 'tell', 'explain', 'find', 'get', 'look', 'see', 'check', 'want', 'need', 'about', 'from']);
      const keywords = queryLower.split(/\s+/).filter((w: string) => w.length > 2 && !stopWords.has(w));
      
      for (const file of cachedFiles) {
        let score = 0;
        const nameLower = file.name.toLowerCase();
        const pathLower = file.path.toLowerCase();
        const ext = file.extension;
        
        // 1. EXACT file name match (highest priority)
        for (const fileName of fileNameMatches) {
          if (nameLower === fileName.toLowerCase()) {
            score += 500; // Exact match
          } else if (nameLower.includes(fileName.toLowerCase().split('.')[0])) {
            score += 200; // Partial match (e.g., "main" matches "main.tsx")
          }
        }
        
        // 2. Keyword matches in file name
        for (const kw of keywords) {
          if (nameLower === kw) score += 150;
          else if (nameLower.startsWith(kw)) score += 100;
          else if (nameLower.includes(kw)) score += 50;
          if (pathLower.includes(kw)) score += 20;
        }
        
        // 3. File type context matching
        // Style/CSS queries
        if ((queryLower.includes('style') || queryLower.includes('css') || queryLower.includes('design') || queryLower.includes('color') || queryLower.includes('layout')) && 
            ['css', 'scss', 'sass', 'less', 'styled'].some(e => ext === e || nameLower.includes(e))) {
          score += 100;
        }
        
        // Component queries
        if ((queryLower.includes('component') || queryLower.includes('react') || queryLower.includes('ui') || queryLower.includes('view')) && 
            ['tsx', 'jsx', 'vue', 'svelte'].includes(ext)) {
          score += 80;
        }
        
        // Config queries
        if ((queryLower.includes('config') || queryLower.includes('setting') || queryLower.includes('setup') || queryLower.includes('configure')) && 
            (nameLower.includes('config') || ext === 'json' || nameLower.includes('.rc'))) {
          score += 100;
        }
        
        // Package/dependency queries
        if ((queryLower.includes('package') || queryLower.includes('depend') || queryLower.includes('install') || queryLower.includes('npm') || queryLower.includes('yarn')) && 
            nameLower === 'package.json') {
          score += 300;
        }
        
        // TypeScript config
        if ((queryLower.includes('typescript') || queryLower.includes('tsconfig') || queryLower.includes('ts config')) && 
            nameLower.includes('tsconfig')) {
          score += 300;
        }
        
        // Main/entry file queries  
        if ((queryLower.includes('main') || queryLower.includes('entry') || queryLower.includes('start') || queryLower.includes('index')) && 
            (nameLower.startsWith('main') || nameLower.startsWith('index') || nameLower === 'app.tsx' || nameLower === 'app.jsx')) {
          score += 150;
        }
        
        // Test queries
        if ((queryLower.includes('test') || queryLower.includes('spec') || queryLower.includes('testing')) && 
            (nameLower.includes('test') || nameLower.includes('spec'))) {
          score += 100;
        }
        
        // API/service queries
        if ((queryLower.includes('api') || queryLower.includes('service') || queryLower.includes('fetch') || queryLower.includes('request') || queryLower.includes('http')) && 
            (pathLower.includes('api') || pathLower.includes('service') || nameLower.includes('api') || nameLower.includes('service'))) {
          score += 100;
        }
        
        // Hook queries (React)
        if ((queryLower.includes('hook') || queryLower.includes('usehook') || queryLower.includes('use ')) && 
            (nameLower.startsWith('use') || pathLower.includes('hook'))) {
          score += 100;
        }
        
        // Util/helper queries
        if ((queryLower.includes('util') || queryLower.includes('helper') || queryLower.includes('common') || queryLower.includes('shared')) && 
            (nameLower.includes('util') || nameLower.includes('helper') || pathLower.includes('util') || pathLower.includes('helper'))) {
          score += 80;
        }
        
        // Type/interface queries
        if ((queryLower.includes('type') || queryLower.includes('interface') || queryLower.includes('model')) && 
            (nameLower.includes('type') || nameLower.includes('interface') || nameLower.includes('model') || nameLower.endsWith('.d.ts'))) {
          score += 100;
        }
        
        // HTML queries
        if ((queryLower.includes('html') || queryLower.includes('template') || queryLower.includes('markup')) && 
            ext === 'html') {
          score += 100;
        }
        
        // Vite/build queries
        if ((queryLower.includes('vite') || queryLower.includes('build') || queryLower.includes('bundle')) && 
            nameLower.includes('vite')) {
          score += 200;
        }
        
        // README/docs queries
        if ((queryLower.includes('readme') || queryLower.includes('doc') || queryLower.includes('documentation')) && 
            (nameLower.includes('readme') || ext === 'md')) {
          score += 150;
        }
        
        // 4. Boost important project files when asking general questions
        if (queryLower.includes('project') || queryLower.includes('folder') || queryLower.includes('structure') || queryLower.includes('file') || queryLower.includes('what')) {
          if (nameLower === 'package.json') score += 150;
          if (nameLower.startsWith('main')) score += 80;
          if (nameLower.startsWith('index')) score += 80;
          if (nameLower === 'readme.md') score += 70;
          if (nameLower.startsWith('app.')) score += 70;
          // ? ADD: Config files for complete project understanding
          if (nameLower.includes('vite.config')) score += 90;
          if (nameLower.includes('tsconfig')) score += 90;
          if (nameLower.includes('eslint')) score += 60;
          if (nameLower.includes('.config.')) score += 50;
        }
        
        // 5. ALWAYS include key config files for any code-related question
        if (nameLower === 'package.json') score += 50; // Always relevant
        if (nameLower.includes('tsconfig') && ext === 'json') score += 40;
        if (nameLower.includes('vite.config')) score += 40;
        
        if (score > 0) {
          matches.push({ path: file.path, name: file.name, score });
        }
      }
      
      // Sort by score and return top matches
      const sorted = matches.sort((a, b) => b.score - a.score).slice(0, 15);
      console.log('?? AI File Search found:', sorted.length, 'relevant files for query:', query.substring(0, 50));
      return sorted;
    };

    // Patch read
    existing.read = async function(filePath: string, maxChars = 4000) {
      const cached = fileContents.get(filePath);
      if (cached) return cached.substring(0, maxChars);

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const content = await invoke('read_file_content', { path: filePath }) as string;
        if (content) {
          fileContents.set(filePath, content);
          return content.substring(0, maxChars);
        }
      } catch(e) {
        try {
          const { readTextFile } = await import('@tauri-apps/plugin-fs');
          const content = await readTextFile(filePath);
          if (content) {
            fileContents.set(filePath, content);
            return content.substring(0, maxChars);
          }
        } catch(e2) {}
      }
      return '// Could not read file: ' + filePath;
    };

    // Patch search
    existing.search = async function(term: string) {
      await this.scanProject();
      const termLower = term.toLowerCase();
      return cachedFiles
        .filter((f: any) => f.name.toLowerCase().includes(termLower))
        .map((f: any) => ({ path: f.path, name: f.name, score: 50 }));
    };

    // Patch getProjectSummary
    existing.getProjectSummary = async function() {
      await this.scanProject();
      const path = (window as any).currentFolderPath || '';
      const name = path.split(/[/\\]/).pop() || 'Project';
      return `?? Project: ${name}\n?? Files: ${cachedFiles.length}`;
    };

    console.log('? aiFileExplorer patched! isEnabled:', existing.isEnabled());
    
    // Trigger initial scan
    existing.scanProject();
  } else {
    console.log('? aiFileExplorer is working properly');
  }
}, 3000); // Run 3 seconds after everything else loads

// ============================================================================
// 3. UNDO/REDO COUNT TRACKING
// Hooks into Monaco editor content changes to update ?/? counters in toolbar
// ============================================================================
setTimeout(() => {
  console.log('?? [UndoRedo] Initializing undo/redo count tracking...');
  
  let undoCount = 0;
  let redoCount = 0;
  let contentChangeDisposable: any = null;
  let modelChangeDisposable: any = null;
  let currentModelUri: string = '';
  
  // Per-file undo/redo counts (persist across tab switches)
  const fileUndoCounts = new Map<string, number>();
  const fileRedoCounts = new Map<string, number>();
  
  /**
   * Find undo/redo count elements in the DOM
   * Searches for elements with ?/? text or specific class/id patterns
   */
  function findUndoRedoElements(): { undoEl: HTMLElement | null; redoEl: HTMLElement | null } {
    let undoEl: HTMLElement | null = null;
    let redoEl: HTMLElement | null = null;
    
    // Method 1: By ID
    undoEl = document.getElementById('undo-count') || document.getElementById('undoCount');
    redoEl = document.getElementById('redo-count') || document.getElementById('redoCount');
    if (undoEl && redoEl) return { undoEl, redoEl };
    
    // Method 2: By class
    undoEl = document.querySelector('.undo-count, .undo-badge, [data-undo-count]') as HTMLElement;
    redoEl = document.querySelector('.redo-count, .redo-badge, [data-redo-count]') as HTMLElement;
    if (undoEl && redoEl) return { undoEl, redoEl };
    
    // Method 3: By button structure - find buttons with ?/? and their count spans
    const allButtons = document.querySelectorAll('button, .btn, [role="button"]');
    for (const btn of allButtons) {
      const text = btn.textContent || '';
      if (text.includes('?') || text.includes('?')) {
        // Find the count element inside (usually a span with just a number)
        const spans = btn.querySelectorAll('span, .count, .badge');
        for (const span of spans) {
          const spanText = (span.textContent || '').trim();
          if (/^\d+$/.test(spanText)) {
            undoEl = span as HTMLElement;
            break;
          }
        }
        // If no nested count span, the button itself shows the count
        if (!undoEl) {
          undoEl = btn as HTMLElement;
        }
      }
      if (text.includes('?') || text.includes('?')) {
        const spans = btn.querySelectorAll('span, .count, .badge');
        for (const span of spans) {
          const spanText = (span.textContent || '').trim();
          if (/^\d+$/.test(spanText)) {
            redoEl = span as HTMLElement;
            break;
          }
        }
        if (!redoEl) {
          redoEl = btn as HTMLElement;
        }
      }
    }
    
    // Method 4: Search all elements for ? and ? patterns with numbers
    if (!undoEl || !redoEl) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const el = walker.currentNode as HTMLElement;
        const text = el.textContent || '';
        const children = el.children.length;
        
        // Look for leaf-ish elements that contain ? N or ? N
        if (children <= 3 && text.length < 20) {
          if (!undoEl && /\d+/.test(text)) {
            // Find the specific number element
            const numSpan = Array.from(el.querySelectorAll('*')).find(
              c => /^\d+$/.test((c.textContent || '').trim())
            ) as HTMLElement;
            undoEl = numSpan || el;
          }
          if (!redoEl && /\d+/.test(text)) {
            const numSpan = Array.from(el.querySelectorAll('*')).find(
              c => /^\d+$/.test((c.textContent || '').trim())
            ) as HTMLElement;
            redoEl = numSpan || el;
          }
        }
      }
    }
    
    return { undoEl, redoEl };
  }
  
  /**
   * Update the undo/redo count display in the toolbar
   */
  function updateUndoRedoUI(): void {
    const { undoEl, redoEl } = findUndoRedoElements();
    
    if (undoEl) {
      // Check if element contains just a number or "? N" pattern
      const currentText = undoEl.textContent || '';
      if (/^\d+$/.test(currentText.trim())) {
        // Element contains just the number
        undoEl.textContent = String(undoCount);
      } else if (/\d+/.test(currentText)) {
        // Element contains "? N" - replace the number part
        undoEl.textContent = currentText.replace(/\d+/, String(undoCount));
      }
      
      // Visual feedback - highlight when count > 0
      if (undoCount > 0) {
        undoEl.style.color = '#4fc3f7';
        undoEl.style.fontWeight = '600';
      } else {
        undoEl.style.color = '';
        undoEl.style.fontWeight = '';
      }
    }
    
    if (redoEl) {
      const currentText = redoEl.textContent || '';
      if (/^\d+$/.test(currentText.trim())) {
        redoEl.textContent = String(redoCount);
      } else if (/\d+/.test(currentText)) {
        redoEl.textContent = currentText.replace(/\d+/, String(redoCount));
      }
      
      if (redoCount > 0) {
        redoEl.style.color = '#81c784';
        redoEl.style.fontWeight = '600';
      } else {
        redoEl.style.color = '';
        redoEl.style.fontWeight = '';
      }
    }
    
    // Also expose counts to window for other systems
    (window as any).__undoRedoCount = { undo: undoCount, redo: redoCount };
  }
  
  /**
   * Save current file's undo/redo counts before switching
   */
  function saveCurrentFileCounts(): void {
    if (currentModelUri) {
      fileUndoCounts.set(currentModelUri, undoCount);
      fileRedoCounts.set(currentModelUri, redoCount);
    }
  }
  
  /**
   * Restore file's undo/redo counts after switching
   */
  function restoreFileCounts(uri: string): void {
    undoCount = fileUndoCounts.get(uri) || 0;
    redoCount = fileRedoCounts.get(uri) || 0;
    currentModelUri = uri;
    updateUndoRedoUI();
  }
  
  /**
   * Attach content change listener to the current editor model
   */
  function attachContentListener(): void {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) return;
    
    const editors = monaco.editor.getEditors();
    const editor = editors?.[0];
    if (!editor) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const modelUri = model.uri?.toString() || '';
    
    // Skip if already listening to this model
    if (modelUri === currentModelUri && contentChangeDisposable) return;
    
    // Save old file counts
    saveCurrentFileCounts();
    
    // Dispose old listener
    if (contentChangeDisposable) {
      try { contentChangeDisposable.dispose(); } catch (e) {}
      contentChangeDisposable = null;
    }
    
    // Restore counts for this file
    restoreFileCounts(modelUri);
    
    // Listen for content changes
    contentChangeDisposable = model.onDidChangeContent((e: any) => {
      if (e.isUndoing) {
        // Undo operation
        undoCount = Math.max(0, undoCount - 1);
        redoCount++;
      } else if (e.isRedoing) {
        // Redo operation
        undoCount++;
        redoCount = Math.max(0, redoCount - 1);
      } else if (e.isFlush) {
        // Full content reset (e.g., setValue or file reload)
        // Don't change counts - this may be auto-apply or file watcher
      } else {
        // Normal edit by user
        undoCount++;
        redoCount = 0; // Clear redo stack on new edit
      }
      
      // Save and update UI
      if (currentModelUri) {
        fileUndoCounts.set(currentModelUri, undoCount);
        fileRedoCounts.set(currentModelUri, redoCount);
      }
      updateUndoRedoUI();
    });
    
    // Listen for model change (file switch via tabs)
    if (!modelChangeDisposable) {
      modelChangeDisposable = editor.onDidChangeModel((e: any) => {
        console.log('?? [UndoRedo] Model changed, re-attaching listener...');
        // Small delay for model to be fully loaded
        setTimeout(() => attachContentListener(), 50);
      });
    }
    
    console.log(`?? [UndoRedo] Attached to: ${modelUri.split('/').pop()} (undo: ${undoCount}, redo: ${redoCount})`);
    updateUndoRedoUI();
  }
  
  // Also intercept Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard shortcuts
  // to ensure counts update even if Monaco's event doesn't fire
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only process when editor is focused
    const activeEl = document.activeElement;
    const isInEditor = activeEl?.closest('.monaco-editor') || 
                       activeEl?.classList.contains('inputarea');
    if (!isInEditor) return;
    
    // Let Monaco handle the actual undo/redo, we just update UI via debounce
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Ctrl+Z = Undo ? content listener will handle count
      setTimeout(updateUndoRedoUI, 50);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      // Ctrl+Shift+Z = Redo
      setTimeout(updateUndoRedoUI, 50);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      // Ctrl+Y = Redo
      setTimeout(updateUndoRedoUI, 50);
    }
  });
  
  // Listen for file save events ? reset undo count on save
  document.addEventListener('file-saved', () => {
    console.log('?? [UndoRedo] File saved, resetting undo count');
    undoCount = 0;
    redoCount = 0;
    if (currentModelUri) {
      fileUndoCounts.set(currentModelUri, 0);
      fileRedoCounts.set(currentModelUri, 0);
    }
    updateUndoRedoUI();
  });
  
  // Listen for tab changes
  document.addEventListener('tab-changed', () => {
    setTimeout(() => attachContentListener(), 100);
  });
  document.addEventListener('file-opened', () => {
    setTimeout(() => attachContentListener(), 100);
  });
  
  // Initial attachment with retry
  function tryAttach(retries: number): void {
    attachContentListener();
    const { undoEl, redoEl } = findUndoRedoElements();
    if ((!undoEl || !redoEl) && retries > 0) {
      setTimeout(() => tryAttach(retries - 1), 1000);
    } else if (undoEl && redoEl) {
      console.log('? [UndoRedo] Count tracking active');
    } else {
      console.warn('?? [UndoRedo] Could not find undo/redo UI elements');
    }
  }
  
  tryAttach(5);
  
  // Periodic check: re-attach if editor model changed without event
  setInterval(() => {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) return;
    const editor = monaco.editor.getEditors()?.[0];
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const uri = model.uri?.toString() || '';
    if (uri !== currentModelUri) {
      attachContentListener();
    }
  }, 2000);
  
  // Expose to window for debugging and other systems
  (window as any).__undoRedoTracker = {
    getUndoCount: () => undoCount,
    getRedoCount: () => redoCount,
    reset: () => {
      undoCount = 0;
      redoCount = 0;
      updateUndoRedoUI();
    },
    refresh: () => attachContentListener()
  };
  
}, 2000);
