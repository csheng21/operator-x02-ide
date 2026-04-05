import { initializeGitFeatures, gitFeatures } from '../vsc/gitFeaturesIntegration';
const _GIT_TAB_MAX_RETRIES = 10;
const _GIT_TAB_RETRY_DELAY = 500;
import { GitPanelVirtualized, createGitPanel } from '../vsc/gitPanelVirtualized';
import { gitManager } from '../vsc/gitManager';
import { gitUIEnhanced } from '../vsc/gitUIEnhanced';
import { gitContextMenu } from '../vsc/gitContextMenu';
import { vcsManager } from '../vsc/vcsManager';
// ============================================================
// gitSystem.ts  |  Operator X02
let _gitTabRetryCount = 0;

// Extracted from main.ts by refactor_main.ps1
// initializeGit + all git helpers (~3300 lines)
// ============================================================

// ============================================================================
export async function initializeGit(): Promise<void> {
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
export function setupGitKeyboardShortcuts(): void {
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


export function ensureGitTabInExplorer(): void {
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

// ============================================================================

export function addGitTabToExplorer(): void {
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

export async function checkGitRoot(dirPath: string): Promise<boolean> {
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

export async function findGitRepoForFile(filePath: string): Promise<GitRepoInfo | null> {
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

export function getCurrentOpenFilePath(): string | null {
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

export async function scanForGitRepos(rootPath: string): Promise<GitRepoInfo[]> {
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

export function setupGitAutoDetect(): void {
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

// ============================================================================

export async function loadGitTabStatus(): Promise<void> {
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


export function attachGitTabHandlers(projectPath: string): void {
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
export async function showGitFileDiff(projectPath: string, filePath: string, staged: boolean = false): Promise<void> {
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
export function renderDiff(diff: string, container: HTMLElement): void {
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


export function getGitStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'modified': '#d19a66',
    'added': '#98c379',
    'deleted': '#e06c75',
    'untracked': '#61afef',
    'renamed': '#c678dd'
  };
  return colors[status] || '#888';
}


export function getGitStatusLetter(status: string): string {
  const letters: Record<string, string> = {
    'modified': 'M',
    'added': 'A',
    'deleted': 'D',
    'untracked': 'U',
    'renamed': 'R'
  };
  return letters[status] || '?';
}


export function showGitToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
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
export async function updateGitStatusBar(): Promise<void> {
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

