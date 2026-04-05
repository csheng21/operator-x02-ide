// ============================================================
// main.ts  â€” Operator X02  v1.5.x
// ORCHESTRATOR ONLY after refactor_main.ps1 extraction
//
// This file's only jobs:
//   1. Import all feature modules (order matters!)
//   2. Run the DOMContentLoaded initialization sequence
//   3. Wire up any cross-module event bridges
// ============================================================

// â”€â”€ Must-run-first: side-effect modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import './core/perfManager';                   // â† X02PerfManager IIFE
import './core/loadingScreen';                 // â† shows loading screen immediately
import './core/cleanup';                       // â† beforeunload / HMR cleanup

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import './styles.css';
import './performance.css';
import './modern-ui-enhancements.css';
import './appleInputArea.css';
import './thinScrollbar.css';
import './ide/svn/svnUIEnhanced.css';
import './ide/svn/svnHistoryViewer.css';
import './ide/svn/svn.css';
import './ide/vsc/gitUIStyles.css';
import './ide/vsc/virtualizedGitList.css';
import './ide/vsc/gitPanelVirtualized.css';
import './jetson/jetsonStyles.css';

// â”€â”€ Core utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import './utils/proxyAwareCall';
import './utils/proxyHealthCheck';
import './utils/globalBinaryBlocker';
import './utils/pdfContextManager';
import './utils/pdfContextBridge';
import './utils/pdfExtractorSimple';

// â”€â”€ UI modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeTabBadges, updateGitTabBadge } from './ui/tabBadges';     // â† EXTRACTED

// â”€â”€ IDE subsystems â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeSystemInfo }       from './ide/systemInfo';               // â† EXTRACTED
import { setupDirectEventHandlers }   from './ide/directEventHandlers';      // â† EXTRACTED
import { initializeIdeComponents }    from './ide/ideComponents';            // â† EXTRACTED
import { removeLoadingScreen }        from './core/loadingScreen';           // â† EXTRACTED

// â”€â”€ Surgical Edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import './ide/surgicalEditBridge';
import './ide/changeSummaryPanel';
import { initSurgicalEditUI }         from './ide/surgicalEditUI';
import { initSurgicalEditEngine }     from './ide/surgicalEditEngine';
import { initBackupManager }          from './ide/surgicalBackupManager';

// â”€â”€ IDE Script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initIdeScriptBridge, processAiScriptResponse } from './ide/ideScriptBridge';
import { initIdeScriptUI }            from './ide/ideScriptUI';

// â”€â”€ SVN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { setupEnhancedSVN }           from './ide/svn/svnIntegration';
import { svnManager }                 from './ide/svn/svnManager';
import { svnUIEnhanced }              from './ide/svn/svnUIEnhanced';
import { svnHistoryViewer }           from './ide/svn/svnHistoryViewer';
import { svnFileExplorerIntegration } from './ide/svn/svnFileExplorerIntegration';
import { svnStatusBar }               from './ide/svn/svnStatusBar';
import { svnAutoDetector }            from './ide/svn/svnAutoDetector';

// â”€â”€ Git â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { vcsManager }                 from './ide/vsc/vcsManager';
import { gitManager }                 from './ide/vsc/gitManager';
import { gitUIEnhanced }              from './ide/vsc/gitUIEnhanced';
import { gitContextMenu }             from './ide/vsc/gitContextMenu';
import { gitDiffViewer }              from './ide/vsc/gitDiffViewer';
import { gitBranchManager }           from './ide/vsc/gitBranchManager';
import { gitHistoryViewer }           from './ide/vsc/gitHistoryViewer';
import { gitMergeConflictManager }    from './ide/vsc/gitMergeConflict';
import { gitBlameManager }            from './ide/vsc/gitBlame';
import { gitStashManager }            from './ide/vsc/gitStashManager';
import { initializeGitFeatures }      from './ide/vsc/gitFeaturesIntegration';
import { setupGitMenu, cleanupMenus, setupCompleteFileMenu, setupProjectMenu,
         setupEnhancedViewMenu, setupEnhancedKeyboardShortcuts,
         setupGlobalMenuHandler }      from './menuSystem';
import { registerGitMenuHandlers }    from './ide/vsc/gitMenuHandlers';
import { initGitMenuFix }             from './ide/vsc/gitMenuFix';
import { initAICommitMessage }        from './ide/vsc/gitAICommitMessage';
import { GitPanelVirtualized }        from './ide/vsc/gitPanelVirtualized';

// â”€â”€ Jetson / NVIDIA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { registerCudaLanguage }       from './ide/languages/cudaLanguage';
import { initNvidiaStatusBar }        from './ide/nvidia/jetsonStatusBar';
import { detectJetsonContext }        from './ide/nvidia/jetsonAIContext';
import { initializeJetsonPhase2 }     from './jetson';
import { initializeJetsonRemote, mountStatusBarWidget } from './jetson/jetsonIntegration';
import { initJetsonTabBridge }        from './jetson/jetsonTabBridge';

// â”€â”€ AI Assistant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeAssistantUI }      from './ide/aiAssistant/assistantUI';
import { addMessageToChat }           from './ide/aiAssistant/messageUI';
import { showTypingIndicator, hideTypingIndicator } from './ide/aiAssistant/typingIndicator';
import { initializeCodeAnalysis }     from './ide/aiAssistant/codeAnalysisManager';
import { initializeAutonomousCoding } from './ide/aiAssistant/pythonAutonomous';
import { initMessageCollapse }        from './ide/aiAssistant/messageCollapseManager';
import { conversationManager }        from './ide/aiAssistant/conversationManager';
import { initializeConversationAutoLoad } from './ide/aiAssistant/conversationLoadAutoFix';
import './ide/aiAssistant/aiAnalysisFeatures';
import './ide/aiAssistant/conversationHistoryContext';
import './ide/aiAssistant/messageUIEnhanced';
import './ide/aiAssistant/conversationMarkdownFix';
import './ide/aiAssistant/conversationMarkdownProcessor';
import './ide/aiAssistant/conversationSearchIntegration';
import './ide/aiAssistant/aiProjectSearchFix';
import './ide/aiAssistant/aiContextDetector';

// â”€â”€ Autonomous Coding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeAutonomousSystem } from './autonomousCoding';

// â”€â”€ File system / Explorer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeFileExplorer }     from './ide/fileExplorer';
import { initializeExplorerButtons }  from './ide/explorerButtons';
import { initializeFileOperations }   from './fileOperations';
import { initFileSystemAPI }          from './fileSystemApiHandler';
import './ide/fileExplorer/fileTreeIntegration';
import './ide/projectPersistence';
import './ide/fileContextMenu';

// â”€â”€ Plugin system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { PluginManager }              from './plugins/core/pluginManager';
import { ExternalPluginManager }      from './plugins/core/externalPluginManager';

// â”€â”€ Misc IDE modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { initializeLayout }           from './ide/layout';
import { initializeTerminal }         from './ide/terminal';
import { initializeArduino }          from './ide/arduino';
import { initializeAndroid }          from './ide/android';
import { initPiPanel }                from './ide/pi/pi_panel';
import { initializeCameraPanel }      from './ide/camera/cameraManager';
import { initChatPanelResizer }       from './chatPanelResizer';
import { initPerformanceOptimizations } from './performanceOptimizer';
import { initChatFileDrop }           from './chatFileDropHandler';
import { initFastApply }              from './fastAutoApply';
import './monaco.config';
import './cemReloadFix';
import './chatPagination';
import './conversationSaveAutoFix';
import './projectLoadFix';
import './folderExpansionFix';
import './newFileHandler';
import './pdfHandlerAutoInit';
import './eventHandlers/globalListenersPatch';
import './ide/runMenu';
import './ide/changeIndicator';
import './autoSparklesIcon';

// â”€â”€ Global expose â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(window as any).addMessageToChat = addMessageToChat;

// â”€â”€ Nuclear border remover (inline - intentionally stays in main) â”€â”€
const nuclear = document.createElement('style');
nuclear.id = 'nuclear-blue-remover';
nuclear.textContent = '*, *::before, *::after { border-color: transparent !important; } .file-tree *, #file-tree *, #files-content * { box-shadow: none !important; }';
document.head.appendChild(nuclear);

// ============================================================
// INITIALIZATION SEQUENCE
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Main] DOM Ready - Starting initialization...');

  // 1. Surgical Edit
  initSurgicalEditEngine();
  if ((window as any).surgicalBridge?.init) (window as any).surgicalBridge.init();
  if ((window as any).surgicalBridge)       (window as any).surgicalBridge.setEnabled(true);
  initSurgicalEditUI();
  console.log('[Main] Surgical Edit Engine: READY');

  // 2. IDE Script
  initIdeScriptBridge();
  (window as any).processAiScriptResponse = processAiScriptResponse;
  initIdeScriptUI();

  // 3. Backup Manager
  initBackupManager();

  // 4. Autonomous system
  try {
    const autonomousIntegration = initializeAutonomousCoding(
      { generateCode: async (prompt: string) => '// Code generation placeholder' },
      {
        readFile:  async (path: string) => (window as any).fileSystem?.readFile?.(path) ?? '',
        writeFile: async (path: string, content: string) => (window as any).fileSystem?.writeFile?.(path, content),
      },
      { executeCommand: async (cmd: string) => ({ stdout: '', stderr: '', exitCode: 0 }) }
    );
    (window as any).__autonomousCoding = { integration: autonomousIntegration };
    console.log('[Main] Autonomous system: READY');
  } catch (error) {
    console.error('[Main] Autonomous system failed:', error);
  }

  // 5. SVN
  try { await setupEnhancedSVN(); }
  catch (e) { console.error('[Main] SVN setup failed:', e); }

  // 6. Tab badges
  try { initializeTabBadges(); }
  catch (e) { console.error('[Main] Tab badges failed:', e); }

  // 7. System info
  await initializeSystemInfo();

  // 8. Editor + IDE components
  await initializeIdeComponents();

  // 9. Event handlers
  setupDirectEventHandlers();

  // 10. NVIDIA / Jetson
  registerCudaLanguage();
  initNvidiaStatusBar();
  initializeJetsonPhase2();
  initJetsonTabBridge();

  // 11. Git
  initializeGitFeatures();
  setupGitMenu();
  registerGitMenuHandlers();
  initGitMenuFix();
  initAICommitMessage();

  // 12. Menus
  cleanupMenus();
  setupCompleteFileMenu();
  setupProjectMenu();
  setupEnhancedViewMenu();
  setupEnhancedKeyboardShortcuts();
  setupGlobalMenuHandler();

  // 13. File Explorer
  initializeFileExplorer();
  initializeExplorerButtons();
  initializeFileOperations();
  initFileSystemAPI();

  // 14. AI panels
  initializeAssistantUI();
  initializeCodeAnalysis();
  initMessageCollapse();
  initializeConversationAutoLoad();

  // 15. Layout, terminals, devices
  initializeLayout();
  initializeTerminal();
  initializeArduino();
  initializeAndroid();
  initPiPanel();
  initializeCameraPanel();

  // 16. Performance
  initChatPanelResizer();
  initPerformanceOptimizations();
  initChatFileDrop();
  initFastApply();

  // 17. Plugin system
  const pluginManager = new PluginManager();
  pluginManager.initialize();
  (window as any).pluginManager = pluginManager;

  // 18. Remove loading screen
  removeLoadingScreen();

  console.log('[Main] âœ… IDE Ready!');
});
