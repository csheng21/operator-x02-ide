/**
 * 🎨 PROFESSIONAL SVN UI - FIXED VERSION
 * ✅ Modern three-panel layout
 * ✅ Better visual hierarchy
 * ✅ Enhanced file management
 * ✅ Professional commit interface
 * ✅ Fixed status detection and path handling
 */

import { svnManager, SvnFileStatus, SvnInfo } from './svnManager';
import { svnDiffViewer } from './svnDiffViewer';
import { svnAICommitGenerator } from './svnAICommitGenerator';
import * as monaco from 'monaco-editor';
import { svnAIDiffAnalyzer, DiffAnalysis, MultiFileAnalysis, FileChange } from './svnAIDiffAnalyzer';
import { SvnDashboard } from './svnDashboard'; // ✨ NEW: Dashboard component
import { aiFileAnalytics, AIFileAnalytics } from './aiFileAnalytics';

// ✨ Import comprehensive helper functions from separate file (~10KB)
import * as SvnHelpers from './svnUIEnhanced_helpers';

// ✨ Import event handlers and UI interactions (~10KB)
import * as SvnEvents from './svnUIEnhanced_events';

interface FileGroup {
    name: string;
    files: SvnFileStatus[];
    expanded: boolean;
}

type ViewMode = 'commit' | 'diff' | 'history';

export class EnhancedSvnUI {
    private static instance: EnhancedSvnUI;
    private panel: HTMLElement | null = null;
    private diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
    private currentPath: string = '';
    private fileGroups: Map<string, FileGroup> = new Map();
    private searchQuery: string = '';
    private commitHistory: string[] = [];
    private isActive: boolean = false;
    private currentFiles: SvnFileStatus[] = [];
    private selectedFiles: Set<string> = new Set();
    private selectedRevisions: Set<string> = new Set(); // Track selected revisions for AI analysis
    private currentViewMode: ViewMode = 'commit';
    private filterMode: 'modified' | 'all' = 'modified';
    private lastFileSignature: string = ''; // Track file changes
    private currentDiffAnalysis: DiffAnalysis | null = null;
    private isAnalyzing: boolean = false;
    private currentDiffFile: string = ''; // Track current diff file for AI analysis
    private currentHistoryFile: string = ''; // Track current file in history view
    private dashboard: SvnDashboard | null = null; // ✨ NEW: Dashboard instance
    private diffDisplayMode: 'unified' | 'sideBySide' = 'unified'; // ✨ NEW: Diff display mode
    private currentDiffContent: string = ''; // ✨ NEW: Store current diff for mode switching
    private constructor() {
        console.log('🎨 EnhancedSvnUI instance created');
    }

    static getInstance(): EnhancedSvnUI {
        if (!EnhancedSvnUI.instance) {
            EnhancedSvnUI.instance = new EnhancedSvnUI();
        }
        return EnhancedSvnUI.instance;
    }

    async initialize(): Promise<void> {
        console.log('🔧 Initializing Improved SVN UI...');
        
        this.createPanel();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.loadCommitHistory();
        this.createNotificationContainer();
        
        // ✨ NEW: Initialize dashboard
        await this.initializeDashboard();
        
        // ✅ CRITICAL FIX: Subscribe to SVN status changes
        // Use refreshUIFromData instead of updateUI to prevent fetch loop
        // Only update if files actually changed
        svnManager.onStatusChange((statuses) => {
            const newSignature = this.generateFileSignature(statuses);
            
            // Only update if files actually changed
            if (newSignature !== this.lastFileSignature) {
                console.log('📊 SVN Status changed, refreshing UI. Changes:', statuses.length);
                this.currentFiles = statuses;
                this.lastFileSignature = newSignature;
                this.refreshUIFromData();
                
                // ✨ NEW: Refresh dashboard if visible
                if (this.shouldShowDashboard()) {
                    this.showCompactDiffWelcome();
                }
            }
            // ✅ REMOVED: console.log spam for unchanged status
        });
        
        // ✅ OPTIMIZED: Don't start auto-refresh here - let it start only when SVN is detected
        // svnManager.startAutoRefresh(5000); // REMOVED - causes spam on non-SVN projects
        
        console.log('✅ Improved SVN UI initialized successfully');
    }

    private createPanel(): void {
        // Remove existing panel
        const existing = document.getElementById('svn-panel-improved');
        if (existing) existing.remove();

        // Create backdrop
        let backdrop = document.getElementById('svn-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'svn-backdrop';
            backdrop.className = 'svn-backdrop';
            backdrop.addEventListener('click', () => this.hide());
            document.body.appendChild(backdrop);
        }

        // Create main panel
        const panel = document.createElement('div');
        panel.id = 'svn-panel-improved';
        panel.className = 'svn-panel-improved';
        
        panel.innerHTML = `
            <div class="svn-container-improved">
                <!-- Header -->
                <header class="svn-header-improved">
                    <div class="header-left">
                        <div class="header-title">
                            <h1>
                                <span class="main-icon">🔄</span>
                                Source Control
                            </h1>
                            <div class="subtitle" id="svn-subtitle">Loading...</div>
                        </div>
                        
                        <div class="branch-info" id="branch-info">
                            <span class="branch-icon">⑂</span>
                            <span id="branch-name">main</span>
                        </div>
                    </div>

                    <div class="header-actions" style="display: flex; align-items: center; gap: 8px;">
                        <button class="header-btn" id="pull-btn" data-tooltip="Pull latest changes" style="
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 12px;
                            background: #2d2d30;
                            border: 1px solid #3c3c3c;
                            border-radius: 4px;
                            color: #cccccc;
                            font-size: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                            <span>Pull</span>
                        </button>
                        <button class="header-btn" id="refresh-btn" data-tooltip="Refresh status" style="
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            padding: 6px 12px;
                            background: #2d2d30;
                            border: 1px solid #3c3c3c;
                            border-radius: 4px;
                            color: #cccccc;
                            font-size: 12px;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            <span>Refresh</span>
                        </button>
                        <button class="close-btn" id="close-panel-btn" data-tooltip="Close panel" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 28px;
                            height: 28px;
                            padding: 0;
                            background: transparent;
                            border: 1px solid transparent;
                            border-radius: 4px;
                            color: #808080;
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </header>

                <!-- Main Content -->
                <div class="svn-content-improved">
                    <!-- Sidebar - File List -->
                    <aside class="sidebar-improved">
                        <!-- Toolbar -->
                        <div class="toolbar-improved">
                            <div class="search-box">
                                <span class="search-icon">🔍</span>
                                <input type="text" id="file-search" placeholder="Filter files..." />
                            </div>
                            <button class="toolbar-btn active" id="filter-modified" data-tooltip="Modified files">
                                <span>M</span>
                            </button>
                            <button class="toolbar-btn" id="filter-all" data-tooltip="Show all files">
                                <span>∀</span>
                            </button>
                        </div>

                        <!-- Selection Bar -->
                        <div class="selection-bar">
                            <div class="left">
                                <span class="selection-count" id="selection-count">0 of 0 selected</span>
                                <button class="select-all-btn" id="select-all-btn">Select All</button>
                            </div>
                            <span id="total-changes">0 changes</span>
                        </div>

                        <!-- File Groups -->
                        <div class="file-groups" id="file-groups">
                            <!-- File groups will be inserted here -->
                        </div>
                    </aside>

                    <!-- Details Panel -->
                    <main class="details-panel-improved">
                        <div class="details-header">
                            <span class="details-title" id="details-title">📝 Commit</span>
                            <div class="view-tabs">
                                <button class="tab-btn active" data-view="commit">Commit</button>
                                <button class="tab-btn" data-view="diff">Diff</button>
                                <button class="tab-btn" data-view="history">History</button>
                            </div>
                        </div>

                        <div class="details-content" id="details-content">
                            <!-- Commit View -->
                            <div class="view-container" id="commit-view">
                                <div class="commit-section">
                                    <div>
                                        <div class="section-label">Commit Message</div>
                                        <div class="commit-message-container">
                                            <textarea 
                                                class="commit-textarea" 
                                                id="commit-message"
                                                placeholder="Enter commit message... (Ctrl+Enter to commit)"
                                            ></textarea>
                                            <div class="textarea-footer">
                                                <span class="char-counter" id="char-counter">0 / 500</span>
                                                <button class="ai-generate-btn" id="ai-generate-btn">
                                                    <span class="ai-icon">✨</span>
                                                    <span>AI Generate</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="commit-actions">
                                        <button class="commit-btn" id="commit-btn" disabled>
                                            <span>✓</span>
                                            <span id="commit-btn-text">Commit (0)</span>
                                        </button>
                                        <button class="commit-options-btn" id="commit-options-btn" data-tooltip="More options">
                                            <span>⋯</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Preview Area -->
                                <div class="commit-preview" id="commit-preview">
                                    <div class="commit-preview-enhanced">
                                        <div class="commit-stats-bar" style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.05) 0%, rgba(78, 201, 176, 0.03) 100%); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(86, 156, 214, 0.2);">
                                            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                                                <div style="flex: 1; min-width: 150px;">
                                                    <div style="font-size: 10px; color: #808080; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Ready to Commit</div>
                                                    <div style="font-size: 24px; font-weight: 600; color: #569cd6; font-family: monospace;" id="commit-selected-count">0</div>
                                                </div>
                                                <div style="flex: 1; min-width: 150px;">
                                                    <div style="font-size: 10px; color: #808080; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Changes</div>
                                                    <div style="font-size: 24px; font-weight: 600; color: #4ec9b0; font-family: monospace;" id="commit-total-count">2</div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- ✨ NEW: View Toggle Buttons -->
                                        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                                            <button id="show-file-list-btn" class="view-toggle-btn active" style="background: #569cd6; border: 1px solid #569cd6; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; display: flex; align-items: center;">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                <span>File List</span>
                                            </button>
                                            <button id="show-analytics-btn" class="view-toggle-btn" style="background: #2d2d30; border: 1px solid #3c3c3c; color: #cccccc; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; display: flex; align-items: center;">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                                                <span>Analytics</span>
                                            </button>
                                        </div>
                                        
                                        <div class="commit-empty-state" id="commit-empty-state" style="text-align: center; padding: 24px; animation: svnFadeIn 0.4s ease-out;">
                                            <div style="width: 56px; height: 56px; background: rgba(86, 156, 214, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="1.5">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                    <line x1="12" y1="18" x2="12" y2="12"/>
                                                    <line x1="9" y1="15" x2="15" y2="15"/>
                                                </svg>
                                            </div>
                                            <div style="font-size: 15px; font-weight: 600; color: #e0e0e0; margin-bottom: 6px;">Select Files to Commit</div>
                                            <div style="font-size: 12px; color: #888; margin-bottom: 20px;">Check the boxes on the left to stage files for commit</div>
                                            
                                            <!-- Collapsible Quick Tips -->
                                            <details class="svn-tips-collapsible" style="background: rgba(86, 156, 214, 0.08); border-radius: 8px; border: 1px solid rgba(86, 156, 214, 0.15); text-align: left; margin-bottom: 12px;">
                                                <summary style="padding: 10px 14px; cursor: pointer; font-size: 11px; color: #569cd6; font-weight: 500; display: flex; align-items: center; gap: 8px; list-style: none;">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                                    </svg>
                                                    <span>Quick Tips</span>
                                                    <svg class="chevron-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; transition: transform 0.2s;"><path d="M6 9l6 6 6-6"/></svg>
                                                </summary>
                                                <div style="padding: 8px 14px 14px; font-size: 11px; color: #aaa; line-height: 1.8;">
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                        Use checkboxes to select files
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                        Click "Select All" to stage all
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                        Use "AI Generate" for commit messages
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ec9b0" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                        Press <kbd style="background: #333; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-family: monospace;">Ctrl+Enter</kbd> to commit
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                        
                                        <!-- Selected files preview (hidden by default, shown when files selected) -->
                                        <div class="commit-files-preview" id="commit-files-preview" style="display: none;">
                                            <!-- Will be populated dynamically -->
                                        </div>
                                        
                                        <!-- ✨ NEW: Analytics View -->
                                        <div id="commit-analytics-view" style="display: none;">
                                            <div class="analytics-placeholder" style="text-align: center; padding: 40px; color: #808080;">
                                                <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                                                <div style="font-size: 16px; margin-bottom: 8px;">Select a file to see analytics</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Diff View -->
                            <div class="view-container" id="diff-view" style="display: none;">
                                <div class="diff-viewer-improved" id="diff-viewer">
                                    <!-- ✨ NEW: Dashboard Container -->
                                    <div id="dashboard-container"></div>
                                    <!-- ✨ NEW: Diff Editor Container -->
                                    <div id="diff-editor-container" style="display: none;">
                                        <div class="empty-state">
                                            <div class="empty-icon">⊟</div>
                                            <div class="empty-text">Select a file to view diff</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- History View -->
                            <div class="view-container" id="history-view" style="display: none;">
                                <div class="history-viewer" id="history-viewer">
                                    <div class="loading-indicator">Loading history...</div>
                                </div>
                            </div>
                        </div>

                        <!-- Global AI Analysis Panel -->
                        <div id="diff-ai-panel" class="diff-ai-panel" style="position: fixed; right: 20px; top: 80px; width: 400px; max-height: calc(100vh - 160px); display: none; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 8px; padding: 16px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
                            <div class="diff-ai-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #3c3c3c;">
                                <div class="diff-ai-title" style="font-size: 14px; font-weight: 600; color: #cccccc; display: flex; align-items: center; gap: 8px;">
                                    <span>🤖</span>
                                    <span>AI Analysis</span>
                                </div>
                                <button id="close-ai-panel-btn" style="background: none; border: none; color: #808080; cursor: pointer; font-size: 18px; padding: 4px 8px;" title="Close">✕</button>
                            </div>
                            <div id="ai-analysis-content">
                                <div style="text-align: center; color: #808080; padding: 20px;">
                                    <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
                                    <div>Select files and click AI Analysis</div>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Actions -->
                        <div class="bottom-actions">
                            <button class="bottom-btn" id="update-btn">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                                <span>Update</span>
                            </button>
                            <button class="bottom-btn" id="cleanup-btn">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                <span>Cleanup</span>
                            </button>
                            <button class="bottom-btn" id="history-btn">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>History</span>
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
    }

    // ✅ Use event handlers from separate module
    private setupEventListeners(): void {
        if (!this.panel) return;

        const context: SvnEvents.EventHandlerContext = {
            panel: this.panel,
            hide: () => this.hide(),
            refresh: () => this.refresh(),
            pullChanges: () => this.pullChanges(),
            setFilterMode: (mode) => this.setFilterMode(mode),
            toggleSelectAll: () => this.toggleSelectAll(),
            switchView: (view, skipAutoLoad) => this.switchView(view, skipAutoLoad),
            switchCommitView: (view) => this.switchCommitView(view),
            updateCharCounter: () => this.updateCharCounter(),
            commitChanges: () => this.commitChanges(),
            generateAICommitMessage: () => this.generateAICommitMessage(),
            updateWorkingCopy: () => this.updateWorkingCopy(),
            cleanupWorkingCopy: () => this.cleanupWorkingCopy(),
            toggleGroupExpanded: (groupName) => this.toggleGroupExpanded(groupName),
            toggleGroupSelection: (groupName, checked) => this.toggleGroupSelection(groupName, checked),
            toggleFileSelection: (filePath, checked) => this.toggleFileSelection(filePath, checked),
            showFileDiff: (filePath) => this.showFileDiff(filePath),
            openFileInEditor: (filePath) => this.openFileInEditor(filePath),
            revertFile: (filePath) => this.revertFile(filePath),
            loadHistoryForFile: (filePath) => this.loadHistoryForFile(filePath),
            searchQuery: this.searchQuery,
            filterFiles: () => this.filterFiles(),
            isActive: this.isActive,
            currentViewMode: this.currentViewMode
        };

        SvnEvents.setupEventListeners(context);
    }

    // ✅ This is now handled by setupEventListeners above
    private setupFileEventDelegation(): void {
        // Event delegation is now handled in SvnEvents.setupEventListeners
        // No need for separate setup
    }

    // ✅ Use keyboard shortcuts from separate module
    private setupKeyboardShortcuts(): void {
        const context: SvnEvents.EventHandlerContext = {
            panel: this.panel!,
            hide: () => this.hide(),
            refresh: () => this.refresh(),
            pullChanges: () => this.pullChanges(),
            setFilterMode: (mode) => this.setFilterMode(mode),
            toggleSelectAll: () => this.toggleSelectAll(),
            switchView: (view, skipAutoLoad) => this.switchView(view, skipAutoLoad),
            switchCommitView: (view) => this.switchCommitView(view),
            updateCharCounter: () => this.updateCharCounter(),
            commitChanges: () => this.commitChanges(),
            generateAICommitMessage: () => this.generateAICommitMessage(),
            updateWorkingCopy: () => this.updateWorkingCopy(),
            cleanupWorkingCopy: () => this.cleanupWorkingCopy(),
            toggleGroupExpanded: (groupName) => this.toggleGroupExpanded(groupName),
            toggleGroupSelection: (groupName, checked) => this.toggleGroupSelection(groupName, checked),
            toggleFileSelection: (filePath, checked) => this.toggleFileSelection(filePath, checked),
            showFileDiff: (filePath) => this.showFileDiff(filePath),
            openFileInEditor: (filePath) => this.openFileInEditor(filePath),
            revertFile: (filePath) => this.revertFile(filePath),
            loadHistoryForFile: (filePath) => this.loadHistoryForFile(filePath),
            searchQuery: this.searchQuery,
            filterFiles: () => this.filterFiles(),
            isActive: this.isActive,
            currentViewMode: this.currentViewMode
        };

        SvnEvents.setupKeyboardShortcuts(context);
    }

    async updateUI(): Promise<void> {
        try {
            console.log('🔄 Updating SVN UI...');
            
            // ✅ FIX: Update subtitle immediately to show we're loading
            const subtitleEl = this.panel?.querySelector('#svn-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = 'Checking repository...';
            }
            
            // Update repository info
            const info = await svnManager.getInfo(this.currentPath);
            this.updateHeaderInfo(info);

            // Get file status
            const files = await svnManager.getStatus(this.currentPath);
            console.log('📊 Got files from SVN:', files.length);
            this.currentFiles = files;
            
            // Update signature to prevent duplicate refreshes
            this.lastFileSignature = this.generateFileSignature(files);

            // Group files by status
            this.groupFilesByStatus(files);

            // Render file groups
            this.renderFileGroups();

            // Update selection display
            this.updateSelectionDisplay();
            
            // ✅ FIX: If no info, still update subtitle
            if (!info) {
                if (subtitleEl) {
                    subtitleEl.textContent = `${files.length} files • Ready`;
                }
            }
            
            console.log('✅ SVN UI updated successfully');

        } catch (error) {
            console.error('❌ Error updating UI:', error);
            
            // ✅ FIX: Update subtitle to show error state
            const subtitleEl = this.panel?.querySelector('#svn-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = 'Not an SVN working copy';
            }
            
            this.showNotification('Failed to update UI: ' + (error as Error).message, 'error');
        }
    }

    /**
     * ✅ NEW: Refresh UI from existing data without fetching from SVN
     * Used by onStatusChange to prevent infinite fetch loops
     */
    private refreshUIFromData(): void {
        try {
            console.log('🔄 Refreshing UI from existing data...');
            
            // Only update if we have a valid path and panel is active
            if (!this.currentPath || !this.isActive) {
                console.log('⏭️ Skipping refresh - panel not active or no path set');
                return;
            }

            // Group files by status
            this.groupFilesByStatus(this.currentFiles);

            // Render file groups
            this.renderFileGroups();

            // Update selection display
            this.updateSelectionDisplay();
            
            console.log('✅ UI refreshed from data');

        } catch (error) {
            console.error('❌ Error refreshing UI:', error);
        }
    }

    private updateHeaderInfo(info: SvnInfo | null): void {
        if (!info) {
            console.log('⚠️ No SVN info available');
            return;
        }

        const branchName = this.getBranchName(info.url);
        const revision = info.revision;

        const subtitleEl = this.panel?.querySelector('#svn-subtitle');
        const branchNameEl = this.panel?.querySelector('#branch-name');

        if (subtitleEl) {
            subtitleEl.textContent = `${branchName} ⭕ r${revision} • Synced`;
        }

        if (branchNameEl) {
            branchNameEl.textContent = branchName;
        }
    }

    // ✅ Use helper function
    private normalizeStatus(status: string | undefined): string {
        return SvnHelpers.normalizeStatus(status);
    }

    private groupFilesByStatus(files: SvnFileStatus[]): void {
        this.fileGroups.clear();

        console.log('📂 Grouping files by status...', files);

        // ✅ FIXED: Use normalized status
        const groups = {
            'Modified': files.filter(f => this.normalizeStatus(f.status) === 'modified'),
            'Added': files.filter(f => this.normalizeStatus(f.status) === 'added'),
            'Deleted': files.filter(f => this.normalizeStatus(f.status) === 'deleted'),
            'Conflicted': files.filter(f => this.normalizeStatus(f.status) === 'conflicted'),
            'Unversioned': files.filter(f => this.normalizeStatus(f.status) === 'unversioned')
        };

        console.log('📊 Groups created:', {
            Modified: groups.Modified.length,
            Added: groups.Added.length,
            Deleted: groups.Deleted.length,
            Conflicted: groups.Conflicted.length,
            Unversioned: groups.Unversioned.length
        });

        Object.entries(groups).forEach(([name, groupFiles]) => {
            this.fileGroups.set(name, {
                name,
                files: groupFiles,
                expanded: name === 'Modified' || groupFiles.length > 0
            });
        });
    }

    private renderFileGroups(): void {
        const container = this.panel?.querySelector('#file-groups');
        if (!container) return;

        container.innerHTML = '';

        let totalFiles = 0;

        this.fileGroups.forEach((group, groupName) => {
            if (group.files.length === 0 && this.filterMode === 'modified') {
                return; // Skip empty groups in modified mode
            }

            totalFiles += group.files.length;

            const groupEl = document.createElement('div');
            groupEl.className = 'file-group-improved';
            
            // ✅ Only show checkbox in commit view
            const showCheckbox = this.currentViewMode === 'commit';
            
            groupEl.innerHTML = `
                <div class="group-header-improved ${group.expanded ? 'expanded' : ''}" data-group="${groupName}">
                    ${showCheckbox ? `<input type="checkbox" class="group-checkbox" data-group="${groupName}" />` : ''}
                    <span class="group-expand">▶</span>
                    <span class="group-title">${groupName}</span>
                    <span class="group-count">${group.files.length}</span>
                </div>
                <div class="group-files-improved" data-group-files="${groupName}">
                    ${this.renderGroupFiles(group.files)}
                </div>
            `;

            container.appendChild(groupEl);
        });

        // Update total changes
        const totalEl = this.panel?.querySelector('#total-changes');
        if (totalEl) {
            totalEl.textContent = `${totalFiles} change${totalFiles !== 1 ? 's' : ''}`;
        }

        // Update group checkbox states
        this.updateAllGroupCheckboxStates();
        
        // ✅ Setup click handlers for file items and action buttons
        this.setupFileListEventHandlers();
    }

    /**
     * ✅ NEW: Setup event handlers for file list items using event delegation
     * Handles: file row clicks, checkbox changes, action buttons, group headers
     */
    private setupFileListEventHandlers(): void {
        let container = this.panel?.querySelector('#file-groups');
        if (!container) return;
        
        // Clone container to remove old event listeners
        const newContainer = container.cloneNode(true) as Element;
        container.parentNode?.replaceChild(newContainer, container);
        container = newContainer;
        
        // Use single delegated event listener on container
        container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // Handle file action buttons
            const actionBtn = target.closest('.file-action-btn') as HTMLElement;
            if (actionBtn) {
                e.stopPropagation();
                const action = actionBtn.getAttribute('data-action');
                const fileItem = actionBtn.closest('.file-item-improved');
                const filePath = fileItem?.getAttribute('data-path');
                
                if (filePath && action) {
                    const decodedPath = this.decodeHtmlAttribute(filePath);
                    console.log(`🔘 Action button clicked: ${action} for ${decodedPath}`);
                    
                    switch (action) {
                        case 'diff':
                            this.showFileDiff(decodedPath);
                            break;
                        case 'open':
                            this.openFileInEditor(decodedPath);
                            break;
                        case 'revert':
                            this.revertFile(decodedPath);
                            break;
                    }
                }
                return;
            }
            
            // Handle checkbox changes
            if (target.classList.contains('file-checkbox')) {
                const input = target as HTMLInputElement;
                const filePath = input.getAttribute('data-file');
                if (filePath) {
                    const decodedPath = this.decodeHtmlAttribute(filePath);
                    this.toggleFileSelection(decodedPath, input.checked);
                }
                return;
            }
            
            // Handle group checkbox
            if (target.classList.contains('group-checkbox')) {
                const input = target as HTMLInputElement;
                const groupName = input.getAttribute('data-group');
                if (groupName) {
                    this.toggleGroupSelection(groupName, input.checked);
                }
                return;
            }
            
            // Handle group header clicks (expand/collapse)
            const groupHeader = target.closest('.group-header-improved');
            if (groupHeader && !target.classList.contains('group-checkbox')) {
                const groupName = groupHeader.getAttribute('data-group');
                if (groupName) {
                    this.toggleGroupExpanded(groupName);
                }
                return;
            }
            
            // Handle file row clicks
            const fileItem = target.closest('.file-item-improved') as HTMLElement;
            if (fileItem && !target.classList.contains('file-checkbox')) {
                const filePath = fileItem.getAttribute('data-path');
                if (!filePath) return;
                
                const decodedPath = this.decodeHtmlAttribute(filePath);
                console.log(`📄 File row clicked: ${decodedPath}, view: ${this.currentViewMode}`);
                
                if (this.currentViewMode === 'diff') {
                    this.showFileDiff(decodedPath);
                } else if (this.currentViewMode === 'history') {
                    this.loadHistoryForFile(decodedPath);
                } else if (this.currentViewMode === 'commit') {
                    const checkbox = fileItem.querySelector('.file-checkbox') as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.toggleFileSelection(decodedPath, checkbox.checked);
                    }
                }
            }
        });
        
        // Add hover effects using mouseover/mouseout (also delegated)
        container.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            
            // Action button hover
            const actionBtn = target.closest('.file-action-btn') as HTMLElement;
            if (actionBtn) {
                actionBtn.style.background = 'rgba(86, 156, 214, 0.2)';
                actionBtn.style.color = '#569cd6';
                return;
            }
            
            // File row hover
            const fileItem = target.closest('.file-item-improved') as HTMLElement;
            if (fileItem) {
                fileItem.style.background = 'rgba(86, 156, 214, 0.08)';
            }
        });
        
        container.addEventListener('mouseout', (e) => {
            const target = e.target as HTMLElement;
            
            // Action button hover out
            const actionBtn = target.closest('.file-action-btn') as HTMLElement;
            if (actionBtn) {
                actionBtn.style.background = 'transparent';
                actionBtn.style.color = '#808080';
                return;
            }
            
            // File row hover out
            const fileItem = target.closest('.file-item-improved') as HTMLElement;
            if (fileItem && !fileItem.classList.contains('selected')) {
                fileItem.style.background = '';
            }
        });
    }
    
    /**
     * Helper to decode HTML-escaped attribute values
     */
    private decodeHtmlAttribute(value: string): string {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
    }

    private renderGroupFiles(files: SvnFileStatus[]): string {
        // ✅ Only show checkboxes in commit view
        const showCheckbox = this.currentViewMode === 'commit';
        
        return files
            .filter(file => this.matchesSearchQuery(file.path))
            .map(file => {
                const fileName = this.getFileName(file.path);
                const extension = this.getFileExtension(fileName);
                const icon = this.getFileIcon(extension);
                const normalizedStatus = this.normalizeStatus(file.status);
                const statusIcon = this.getStatusIcon(file.status || 'M');
                const isSelected = this.selectedFiles.has(file.path);
                
                // ✅ FIXED: Escape path for HTML attributes
                const escapedPath = this.escapeHtmlAttribute(file.path);

                return `
                    <div class="file-item-improved ${isSelected ? 'selected' : ''}" data-path="${escapedPath}" style="cursor: pointer;">
                        ${showCheckbox ? `<input type="checkbox" class="file-checkbox" data-file="${escapedPath}" ${isSelected ? 'checked' : ''} />` : ''}
                        <div class="file-status ${normalizedStatus}">
                            ${statusIcon}
                        </div>
                        <div class="file-info-improved">
                            <div class="file-name-improved">${icon} ${this.escapeHtml(fileName)}</div>
                            <div class="file-path-improved">${this.escapeHtml(file.path)}</div>
                        </div>
                        <div class="file-actions-improved">
                            <button class="file-action-btn" data-action="diff" data-tooltip="View diff" style="cursor: pointer; padding: 4px 6px; border: none; background: transparent; color: #808080; border-radius: 3px; transition: all 0.15s;">
                                ⊟
                            </button>
                            <button class="file-action-btn" data-action="open" data-tooltip="Open file" style="cursor: pointer; padding: 4px 6px; border: none; background: transparent; color: #808080; border-radius: 3px; transition: all 0.15s;">
                                ⊡
                            </button>
                            <button class="file-action-btn" data-action="revert" data-tooltip="Revert changes" style="cursor: pointer; padding: 4px 6px; border: none; background: transparent; color: #808080; border-radius: 3px; transition: all 0.15s;">
                                ↶
                            </button>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    private matchesSearchQuery(path: string): boolean {
        if (!this.searchQuery) return true;
        return path.toLowerCase().includes(this.searchQuery.toLowerCase());
    }

    private toggleGroupExpanded(groupName: string): void {
        const group = this.fileGroups.get(groupName);
        if (!group) return;

        group.expanded = !group.expanded;

        const groupHeader = this.panel?.querySelector(`[data-group="${groupName}"]`);
        const groupFiles = this.panel?.querySelector(`[data-group-files="${groupName}"]`);

        if (groupHeader) {
            groupHeader.classList.toggle('expanded', group.expanded);
        }

        if (groupFiles) {
            (groupFiles as HTMLElement).style.display = group.expanded ? 'block' : 'none';
        }
    }

    // ✅ FIXED: Better path handling for selection
    private toggleFileSelection(filePath: string, selected: boolean): void {
        if (selected) {
            this.selectedFiles.add(filePath);
        } else {
            this.selectedFiles.delete(filePath);
        }

        // Use attribute selector instead of CSS.escape
        const fileItem = this.panel?.querySelector(`.file-item-improved[data-path="${this.escapeHtmlAttribute(filePath)}"]`);
        fileItem?.classList.toggle('selected', selected);

        this.updateSelectionDisplay();
        this.updateAllGroupCheckboxStates();
        
        // ✨ NEW: Show/hide dashboard based on selection in diff view
        if (this.currentViewMode === 'diff') {
            if (this.selectedFiles.size === 0) {
                this.showCompactDiffWelcome();
            } else if (selected) {
                // File was just selected, show its diff
                this.showFileDiff(filePath);
            }
        }
    }

    private toggleGroupSelection(groupName: string, selected: boolean): void {
        const group = this.fileGroups.get(groupName);
        if (!group) return;

        group.files.forEach(file => {
            if (selected) {
                this.selectedFiles.add(file.path);
            } else {
                this.selectedFiles.delete(file.path);
            }

            const escapedPath = this.escapeHtmlAttribute(file.path);
            const checkbox = this.panel?.querySelector(`.file-checkbox[data-file="${escapedPath}"]`) as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = selected;
            }

            const fileItem = this.panel?.querySelector(`.file-item-improved[data-path="${escapedPath}"]`);
            fileItem?.classList.toggle('selected', selected);
        });

        this.updateSelectionDisplay();
    }

    private toggleSelectAll(): void {
        const allSelected = this.selectedFiles.size === this.currentFiles.length;

        if (allSelected) {
            // Deselect all
            this.selectedFiles.clear();
            this.panel?.querySelectorAll('.file-checkbox').forEach(cb => {
                (cb as HTMLInputElement).checked = false;
            });
            this.panel?.querySelectorAll('.file-item-improved').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            // Select all
            this.currentFiles.forEach(file => {
                this.selectedFiles.add(file.path);
            });
            this.panel?.querySelectorAll('.file-checkbox').forEach(cb => {
                (cb as HTMLInputElement).checked = true;
            });
            this.panel?.querySelectorAll('.file-item-improved').forEach(item => {
                item.classList.add('selected');
            });
        }

        this.updateSelectionDisplay();
        this.updateAllGroupCheckboxStates();
        
        // ✨ NEW: Show dashboard if all files deselected in diff view
        if (this.currentViewMode === 'diff' && this.selectedFiles.size === 0) {
            this.showCompactDiffWelcome();
        }
    }

    private updateSelectionDisplay(): void {
        const count = this.selectedFiles.size;
        const total = this.currentFiles.length;

        const selectionCount = this.panel?.querySelector('#selection-count');
        const commitBtnText = this.panel?.querySelector('#commit-btn-text');
        const commitBtn = this.panel?.querySelector('#commit-btn') as HTMLButtonElement;

        if (selectionCount) {
            selectionCount.textContent = `${count} of ${total} selected`;
        }

        if (commitBtnText) {
            commitBtnText.textContent = `Commit (${count})`;
        }

        if (commitBtn) {
            commitBtn.disabled = count === 0;
        }
        
        // ✨ NEW: Update commit preview stats
        const selectedCountEl = this.panel?.querySelector('#commit-selected-count');
        const totalCountEl = this.panel?.querySelector('#commit-total-count');
        
        if (selectedCountEl) {
            selectedCountEl.textContent = count.toString();
        }
        
        if (totalCountEl) {
            totalCountEl.textContent = total.toString();
        }
        
        // ✨ NEW: Show/hide commit empty state vs files preview
        const emptyState = this.panel?.querySelector('#commit-empty-state') as HTMLElement;
        const filesPreview = this.panel?.querySelector('#commit-files-preview') as HTMLElement;
        
        if (emptyState && filesPreview) {
            if (count === 0) {
                // No files selected - show empty state
                emptyState.style.display = 'block';
                filesPreview.style.display = 'none';
            } else {
                // Files selected - show preview
                emptyState.style.display = 'none';
                filesPreview.style.display = 'block';
                
                // Update files preview
                this.updateCommitFilesPreview();
            }
        }
    }

    private updateAllGroupCheckboxStates(): void {
        this.fileGroups.forEach((group, groupName) => {
            const groupCheckbox = this.panel?.querySelector(`.group-checkbox[data-group="${groupName}"]`) as HTMLInputElement;
            if (!groupCheckbox) return;

            const groupFiles = group.files;
            const selectedInGroup = groupFiles.filter(f => this.selectedFiles.has(f.path)).length;

            if (selectedInGroup === 0) {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = false;
            } else if (selectedInGroup === groupFiles.length) {
                groupCheckbox.checked = true;
                groupCheckbox.indeterminate = false;
            } else {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = true;
            }
        });
    }

    switchView(view: ViewMode, skipAutoLoad: boolean = false): void {
        this.currentViewMode = view;

        // Update tabs
        this.panel?.querySelectorAll('.tab-btn').forEach(btn => {
            const btnView = btn.getAttribute('data-view');
            btn.classList.toggle('active', btnView === view);
        });

        // Update title
        const titles = {
            'commit': '📝 Commit',
            'diff': '⊟ Diff Viewer',
            'history': '📜 History'
        };

        const titleEl = this.panel?.querySelector('#details-title');
        if (titleEl) {
            titleEl.textContent = titles[view];
        }

        // Show/hide views
        this.panel?.querySelector('#commit-view')?.setAttribute('style', view === 'commit' ? '' : 'display: none;');
        this.panel?.querySelector('#diff-view')?.setAttribute('style', view === 'diff' ? '' : 'display: none;');
        this.panel?.querySelector('#history-view')?.setAttribute('style', view === 'history' ? '' : 'display: none;');

        // ✅ NEW: Show/hide selection bar based on view mode (only show in commit view)
        const selectionBar = this.panel?.querySelector('.selection-bar') as HTMLElement;
        if (selectionBar) {
            selectionBar.style.display = view === 'commit' ? '' : 'none';
        }

        // ✅ NEW: Re-render file list to show/hide checkboxes based on view mode
        this.renderFileGroups();

        // ✅ AUTO-LOAD: Load content for selected file when switching views (unless explicitly skipped)
        if (skipAutoLoad) {
            console.log('⏭️ Skipping auto-load (explicit file being shown)');
            return;
        }

        if (view === 'diff') {
            // If there are selected files, show diff for the first one
            const selectedFiles = Array.from(this.selectedFiles);
            if (selectedFiles.length > 0) {
                console.log('📊 Auto-loading diff for selected file:', selectedFiles[0]);
                this.showFileDiff(selectedFiles[0]);
            } else {
                // ✨ NEW: No selection - show dashboard instead of empty state
                console.log('📊 No files selected, showing dashboard');
                this.showCompactDiffWelcome();
            }
        } else if (view === 'history') {
            // Load history for selected file or general history
            const selectedFiles = Array.from(this.selectedFiles);
            if (selectedFiles.length > 0) {
                console.log('📜 Auto-loading history for selected file:', selectedFiles[0]);
                this.loadHistoryForFile(selectedFiles[0]);
            } else {
                // No selection - load general history
                this.loadHistory();
            }
        }
    }

    private setFilterMode(mode: 'modified' | 'all'): void {
        this.filterMode = mode;

        // Update button states
        const modifiedBtn = this.panel?.querySelector('#filter-modified');
        const allBtn = this.panel?.querySelector('#filter-all');

        modifiedBtn?.classList.toggle('active', mode === 'modified');
        allBtn?.classList.toggle('active', mode === 'all');

        // Re-render
        this.renderFileGroups();
    }

    private filterFiles(): void {
        this.renderFileGroups();
    }

    private updateCharCounter(): void {
        const textarea = this.panel?.querySelector('#commit-message') as HTMLTextAreaElement;
        const counter = this.panel?.querySelector('#char-counter');

        if (!textarea || !counter) return;

        const length = textarea.value.length;
        counter.textContent = `${length} / 500`;

        if (length > 500) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
    }

    private async generateAICommitMessage(): Promise<void> {
        console.log('🤖 AI Generate: Starting...');
        
        const btn = this.panel?.querySelector('#ai-generate-btn') as HTMLButtonElement;
        if (!btn) {
            console.error('❌ AI Generate button not found!');
            return;
        }

        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="ai-icon">⏳</span><span>Generating...</span>';
        btn.disabled = true;

        try {
            const selectedFilesData = this.currentFiles.filter(f => this.selectedFiles.has(f.path));
            console.log('📂 Selected files for AI:', selectedFilesData.length);
            console.log('📝 Files data:', selectedFilesData);

            if (selectedFilesData.length === 0) {
                console.warn('⚠️ No files selected');
                this.showNotification('Please select files first', 'warning');
                return;
            }

            // Check if svnAICommitGenerator is available
            if (typeof svnAICommitGenerator === 'undefined') {
                console.error('❌ svnAICommitGenerator module not found!');
                this.showNotification('AI service not configured. Please check API settings.', 'error');
                return;
            }

            console.log('🚀 Calling AI service...');
            
            // Try calling with different parameter formats
            let message: string;
            try {
                // Try method signature 1: (path, files)
                message = await svnAICommitGenerator.generateCommitMessage(
                    this.currentPath,
                    selectedFilesData
                );
            } catch (firstError) {
                console.warn('⚠️ First method signature failed, trying alternative...');
                console.log('Error:', firstError);
                
                try {
                    // Try method signature 2: just files array
                    message = await svnAICommitGenerator.generateCommitMessage(selectedFilesData);
                } catch (secondError) {
                    console.warn('⚠️ Second method signature failed, trying with paths only...');
                    
                    // Try method signature 3: array of paths only
                    const filePaths = selectedFilesData.map(f => f.path);
                    message = await svnAICommitGenerator.generateCommitMessage(filePaths);
                }
            }

            console.log('✅ AI generated message:', message?.substring(0, 50) + '...');

            const textarea = this.panel?.querySelector('#commit-message') as HTMLTextAreaElement;
            if (textarea) {
                textarea.value = message;
                textarea.focus();
                this.updateCharCounter();
            } else {
                console.error('❌ Commit message textarea not found!');
            }

            this.showNotification('✨ AI commit message generated!', 'success');

        } catch (error) {
            console.error('❌ Error generating AI commit message:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification('Failed to generate commit message: ' + errorMessage, 'error');
            
            // Provide a fallback simple message
            const textarea = this.panel?.querySelector('#commit-message') as HTMLTextAreaElement;
            if (textarea && textarea.value === '') {
                const selectedCount = this.selectedFiles.size;
                const fallbackMessage = `Updated ${selectedCount} file${selectedCount > 1 ? 's' : ''}`;
                textarea.value = fallbackMessage;
                this.updateCharCounter();
                console.log('📝 Used fallback message:', fallbackMessage);
            }
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }

    private async commitChanges(): Promise<void> {
        console.log('💾 Commit: Starting...');
        
        const textarea = this.panel?.querySelector('#commit-message') as HTMLTextAreaElement;
        const message = textarea?.value.trim();

        console.log('📝 Commit message length:', message?.length || 0);
        console.log('📂 Selected files count:', this.selectedFiles.size);

        if (!message) {
            console.warn('⚠️ No commit message entered');
            this.showNotification('Please enter a commit message', 'warning');
            textarea?.focus();
            return;
        }

        if (this.selectedFiles.size === 0) {
            console.warn('⚠️ No files selected');
            this.showNotification('Please select files to commit', 'warning');
            return;
        }

        const btn = this.panel?.querySelector('#commit-btn') as HTMLButtonElement;
        if (!btn) {
            console.error('❌ Commit button not found!');
            return;
        }

        const originalHTML = btn.innerHTML;
        
        try {
            btn.innerHTML = '<span>⏳</span><span>Committing...</span>';
            btn.disabled = true;

            const filesToCommit = Array.from(this.selectedFiles);
            console.log('🚀 Committing files:', filesToCommit);

            // Check if svnManager is available
            if (typeof svnManager === 'undefined') {
                console.error('❌ svnManager not found!');
                this.showNotification('SVN service not available', 'error');
                return;
            }

            await svnManager.commit(this.currentPath, message, filesToCommit);

            console.log('✅ Commit successful!');
            this.showNotification(`✅ Successfully committed ${filesToCommit.length} file(s)`, 'success');
            
            // Save to history
            this.saveCommitToHistory(message);

            // Clear selection and message
            this.selectedFiles.clear();
            if (textarea) {
                textarea.value = '';
                this.updateCharCounter();
            }

            // Refresh UI
            console.log('🔄 Refreshing UI after commit...');
            await this.refresh();

        } catch (error) {
            console.error('❌ Commit failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification('Commit failed: ' + errorMessage, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.disabled = this.selectedFiles.size === 0;
            }
        }
    }

    private async showFileDiff(filePath: string): Promise<void> {
        try {
            // ✨ NEW: Hide dashboard when showing diff
            this.hideDashboard();
            
            // ✅ FIX: Pass skipAutoLoad=true to prevent switchView from auto-loading wrong file
            if (this.currentViewMode !== 'diff') {
                this.switchView('diff', true); // Skip auto-load since we're explicitly loading a file
            }
            
            // Clear previous analysis when switching files
            if (this.currentDiffFile !== filePath) {
                this.currentDiffAnalysis = null;
            }
            
            this.currentDiffFile = filePath; // Track current diff file

            const diffViewer = this.panel?.querySelector('#diff-viewer');
            if (!diffViewer) return;

            diffViewer.innerHTML = '<div class="loading-indicator">Loading diff...</div>';

            const diff = await svnManager.getDiff(filePath);
            this.currentDiffContent = diff; // Store for mode switching
            
            const fileName = this.getFileName(filePath);
            const diffLines = this.parseDiff(diff);

            diffViewer.innerHTML = `
                <div style="display: flex; height: 100%; gap: 0;">
                    <!-- Diff Content (Left/Main) -->
                    <div style="flex: 1; overflow-y: auto;">
                        <div class="diff-header-improved">
                            <span class="diff-file-name">${this.escapeHtml(fileName)}</span>
                            <div class="diff-stats">
                                <span class="diff-stat added">
                                    <span>+</span>
                                    <span>${diffLines.added}</span>
                                </span>
                                <span class="diff-stat deleted">
                                    <span>−</span>
                                    <span>${diffLines.deleted}</span>
                                </span>
                                
                                <!-- ✅ NEW: View Mode Toggle -->
                                <div id="diff-view-mode-toggle" style="display: flex; gap: 2px; margin-left: 16px; padding: 2px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                                    <button id="diff-mode-unified" class="diff-mode-btn ${this.diffDisplayMode === 'unified' ? 'active' : ''}" title="Unified View" style="
                                        padding: 5px 10px;
                                        background: ${this.diffDisplayMode === 'unified' ? 'rgba(86, 156, 214, 0.3)' : 'transparent'};
                                        border: none;
                                        border-radius: 4px;
                                        color: ${this.diffDisplayMode === 'unified' ? '#569cd6' : '#888'};
                                        font-size: 11px;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 4px;
                                        transition: all 0.15s ease;
                                    ">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                                            <line x1="3" y1="9" x2="21" y2="9"/>
                                            <line x1="3" y1="15" x2="21" y2="15"/>
                                        </svg>
                                        <span>Unified</span>
                                    </button>
                                    <button id="diff-mode-sidebyside" class="diff-mode-btn ${this.diffDisplayMode === 'sideBySide' ? 'active' : ''}" title="Side by Side" style="
                                        padding: 5px 10px;
                                        background: ${this.diffDisplayMode === 'sideBySide' ? 'rgba(86, 156, 214, 0.3)' : 'transparent'};
                                        border: none;
                                        border-radius: 4px;
                                        color: ${this.diffDisplayMode === 'sideBySide' ? '#569cd6' : '#888'};
                                        font-size: 11px;
                                        cursor: pointer;
                                        display: flex;
                                        align-items: center;
                                        gap: 4px;
                                        transition: all 0.15s ease;
                                    ">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="3" width="7" height="18" rx="1"/>
                                            <rect x="14" y="3" width="7" height="18" rx="1"/>
                                        </svg>
                                        <span>Side by Side</span>
                                    </button>
                                </div>
                                
                                <!-- ✅ NEW: File-specific action buttons -->
                                <div style="display: flex; gap: 8px; margin-left: 16px; padding-left: 16px; border-left: 1px solid rgba(255,255,255,0.1);">
                                    <button id="diff-commit-file-btn" title="Commit this file" style="
                                        display: inline-flex;
                                        align-items: center;
                                        gap: 6px;
                                        padding: 6px 12px;
                                        background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
                                        border: none;
                                        border-radius: 6px;
                                        color: #fff;
                                        font-size: 12px;
                                        font-weight: 500;
                                        cursor: pointer;
                                        transition: all 0.15s ease;
                                    ">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20,6 9,17 4,12"/>
                                        </svg>
                                        <span>Commit</span>
                                    </button>
                                    <button id="diff-history-file-btn" title="View history for this file" style="
                                        display: inline-flex;
                                        align-items: center;
                                        gap: 6px;
                                        padding: 6px 12px;
                                        background: rgba(255, 255, 255, 0.1);
                                        border: 1px solid rgba(255, 255, 255, 0.2);
                                        border-radius: 6px;
                                        color: #ccc;
                                        font-size: 12px;
                                        font-weight: 500;
                                        cursor: pointer;
                                        transition: all 0.15s ease;
                                    ">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                        <span>History</span>
                                    </button>
                                </div>
                                
                                <button id="ai-analyze-diff-btn" class="ai-analyze-btn" title="Analyze with AI" style="
                                    margin-left: 12px;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 6px 12px;
                                    background: linear-gradient(135deg, #7c4dff 0%, #536dfe 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: #fff;
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.15s ease;
                                    z-index: 10;
                                    position: relative;
                                ">
                                    <span>✨</span>
                                    <span>AI Analysis</span>
                                </button>
                            </div>
                        </div>
                        <div id="diff-content-container" class="diff-content">
                            ${this.diffDisplayMode === 'unified' ? this.formatDiff(diff) : this.formatSideBySideDiff(diff)}
                        </div>
                    </div>

                    <!-- AI Analysis Panel (Right) -->
                    <div id="diff-ai-panel" class="diff-ai-panel" style="width: 380px; display: none; background: #1e1e1e; border-left: 1px solid #3c3c3c; padding: 16px; overflow-y: auto;">
                        <div class="diff-ai-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #3c3c3c;">
                            <div class="diff-ai-title" style="font-size: 14px; font-weight: 600; color: #cccccc; display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>🤖</span>
                                    <span>AI Analysis</span>
                                </div>
                                <div id="ai-current-file" style="font-size: 11px; font-weight: 400; color: #808080; font-family: monospace;">
                                    ${this.escapeHtml(fileName)}
                                </div>
                            </div>
                            <button id="close-ai-panel-btn" style="background: none; border: none; color: #808080; cursor: pointer; font-size: 18px;" title="Close">✕</button>
                        </div>
                        <div id="ai-analysis-content">
                            ${this.renderAIEmptyState()}
                        </div>
                    </div>
                </div>
            `;

            // Setup AI button handlers
            this.setupAIAnalysisHandlers();
            
            // ✅ NEW: Setup file-specific Commit and History buttons
            this.setupDiffFileActions(filePath, fileName);
            
            // ✅ NEW: Setup diff view mode toggle
            this.setupDiffViewModeToggle();

        } catch (error) {
            console.error('❌ Error showing diff:', error);
            this.showNotification('Failed to load diff', 'error');
        }
    }

    private parseDiff(diff: string): { added: number; deleted: number } {
        const lines = diff.split('\n');
        let added = 0;
        let deleted = 0;

        lines.forEach(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) added++;
            if (line.startsWith('-') && !line.startsWith('---')) deleted++;
        });

        return { added, deleted };
    }

    private formatDiff(diff: string): string {
        const lines = diff.split('\n');
        let html = '';
        let lineNumber = 0;

        lines.forEach(line => {
            let cssClass = 'context';
            let displayLine = line;

            if (line.startsWith('+') && !line.startsWith('+++')) {
                cssClass = 'added';
                lineNumber++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                cssClass = 'deleted';
            } else if (!line.startsWith('@@') && !line.startsWith('+++') && !line.startsWith('---')) {
                lineNumber++;
            }

            if (line.startsWith('@@')) {
                cssClass = 'hunk-header';
            }

            const escapedLine = this.escapeHtml(displayLine);

            html += `
                <div class="diff-line ${cssClass}">
                    <span class="diff-line-number">${lineNumber || ''}</span>
                    <span class="diff-line-content">${escapedLine}</span>
                </div>
            `;
        });

        return html;
    }

    /**
     * ✨ NEW: Format diff in side-by-side view
     */
    private formatSideBySideDiff(diff: string): string {
        const lines = diff.split('\n');
        const leftLines: Array<{num: number | string; content: string; type: string}> = [];
        const rightLines: Array<{num: number | string; content: string; type: string}> = [];
        
        let leftLineNum = 0;
        let rightLineNum = 0;
        
        lines.forEach(line => {
            if (line.startsWith('@@')) {
                // Parse hunk header to get line numbers
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                if (match) {
                    leftLineNum = parseInt(match[1]) - 1;
                    rightLineNum = parseInt(match[2]) - 1;
                }
                leftLines.push({ num: '...', content: line, type: 'hunk' });
                rightLines.push({ num: '...', content: line, type: 'hunk' });
            } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:') || line.startsWith('===')) {
                // Skip file headers
            } else if (line.startsWith('-')) {
                leftLineNum++;
                leftLines.push({ num: leftLineNum, content: line.substring(1), type: 'deleted' });
                rightLines.push({ num: '', content: '', type: 'empty' });
            } else if (line.startsWith('+')) {
                rightLineNum++;
                leftLines.push({ num: '', content: '', type: 'empty' });
                rightLines.push({ num: rightLineNum, content: line.substring(1), type: 'added' });
            } else if (line.length > 0) {
                leftLineNum++;
                rightLineNum++;
                leftLines.push({ num: leftLineNum, content: line, type: 'context' });
                rightLines.push({ num: rightLineNum, content: line, type: 'context' });
            }
        });
        
        // Build side-by-side HTML
        let html = `
            <div style="display: flex; width: 100%; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;">
                <!-- Left Panel (Old) -->
                <div style="flex: 1; border-right: 1px solid #3c3c3c; overflow-x: auto;">
                    <div style="background: rgba(244, 67, 54, 0.1); padding: 6px 12px; font-size: 11px; color: #f44336; font-weight: 600; border-bottom: 1px solid #3c3c3c;">
                        ← Original (Revision)
                    </div>
                    <div style="padding: 0;">
        `;
        
        leftLines.forEach(line => {
            const bgColor = line.type === 'deleted' ? 'rgba(244, 67, 54, 0.15)' : 
                           line.type === 'hunk' ? 'rgba(86, 156, 214, 0.1)' :
                           line.type === 'empty' ? 'rgba(0,0,0,0.1)' : 'transparent';
            const textColor = line.type === 'deleted' ? '#f44336' : 
                             line.type === 'hunk' ? '#569cd6' : '#ccc';
            
            html += `
                <div style="display: flex; background: ${bgColor}; border-bottom: 1px solid rgba(60,60,60,0.3); min-height: 20px;">
                    <span style="width: 40px; padding: 2px 8px; color: #666; text-align: right; border-right: 1px solid #3c3c3c; user-select: none; flex-shrink: 0;">${line.num}</span>
                    <span style="flex: 1; padding: 2px 8px; color: ${textColor}; white-space: pre; overflow-x: auto;">${this.escapeHtml(line.content)}</span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
                
                <!-- Right Panel (New) -->
                <div style="flex: 1; overflow-x: auto;">
                    <div style="background: rgba(76, 175, 80, 0.1); padding: 6px 12px; font-size: 11px; color: #4caf50; font-weight: 600; border-bottom: 1px solid #3c3c3c;">
                        → Modified (Working Copy)
                    </div>
                    <div style="padding: 0;">
        `;
        
        rightLines.forEach(line => {
            const bgColor = line.type === 'added' ? 'rgba(76, 175, 80, 0.15)' : 
                           line.type === 'hunk' ? 'rgba(86, 156, 214, 0.1)' :
                           line.type === 'empty' ? 'rgba(0,0,0,0.1)' : 'transparent';
            const textColor = line.type === 'added' ? '#4caf50' : 
                             line.type === 'hunk' ? '#569cd6' : '#ccc';
            
            html += `
                <div style="display: flex; background: ${bgColor}; border-bottom: 1px solid rgba(60,60,60,0.3); min-height: 20px;">
                    <span style="width: 40px; padding: 2px 8px; color: #666; text-align: right; border-right: 1px solid #3c3c3c; user-select: none; flex-shrink: 0;">${line.num}</span>
                    <span style="flex: 1; padding: 2px 8px; color: ${textColor}; white-space: pre; overflow-x: auto;">${this.escapeHtml(line.content)}</span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * ✨ NEW: Setup diff view mode toggle handlers
     */
    private setupDiffViewModeToggle(): void {
        requestAnimationFrame(() => {
            const unifiedBtn = document.getElementById('diff-mode-unified');
            const sideBySideBtn = document.getElementById('diff-mode-sidebyside');
            const contentContainer = document.getElementById('diff-content-container');
            
            console.log('🔧 Setting up diff view mode toggle...');
            console.log('   - unifiedBtn found:', !!unifiedBtn);
            console.log('   - sideBySideBtn found:', !!sideBySideBtn);
            console.log('   - contentContainer found:', !!contentContainer);
            
            const updateButtons = () => {
                if (unifiedBtn) {
                    unifiedBtn.style.background = this.diffDisplayMode === 'unified' ? 'rgba(86, 156, 214, 0.3)' : 'transparent';
                    unifiedBtn.style.color = this.diffDisplayMode === 'unified' ? '#569cd6' : '#888';
                }
                if (sideBySideBtn) {
                    sideBySideBtn.style.background = this.diffDisplayMode === 'sideBySide' ? 'rgba(86, 156, 214, 0.3)' : 'transparent';
                    sideBySideBtn.style.color = this.diffDisplayMode === 'sideBySide' ? '#569cd6' : '#888';
                }
            };
            
            if (unifiedBtn) {
                unifiedBtn.addEventListener('click', () => {
                    console.log('📊 Switching to Unified view');
                    this.diffDisplayMode = 'unified';
                    updateButtons();
                    if (contentContainer && this.currentDiffContent) {
                        contentContainer.innerHTML = this.formatDiff(this.currentDiffContent);
                    }
                });
                
                unifiedBtn.addEventListener('mouseenter', () => {
                    if (this.diffDisplayMode !== 'unified') {
                        unifiedBtn.style.background = 'rgba(86, 156, 214, 0.15)';
                    }
                });
                unifiedBtn.addEventListener('mouseleave', () => {
                    if (this.diffDisplayMode !== 'unified') {
                        unifiedBtn.style.background = 'transparent';
                    }
                });
            }
            
            if (sideBySideBtn) {
                sideBySideBtn.addEventListener('click', () => {
                    console.log('📊 Switching to Side by Side view');
                    this.diffDisplayMode = 'sideBySide';
                    updateButtons();
                    if (contentContainer && this.currentDiffContent) {
                        contentContainer.innerHTML = this.formatSideBySideDiff(this.currentDiffContent);
                    }
                });
                
                sideBySideBtn.addEventListener('mouseenter', () => {
                    if (this.diffDisplayMode !== 'sideBySide') {
                        sideBySideBtn.style.background = 'rgba(86, 156, 214, 0.15)';
                    }
                });
                sideBySideBtn.addEventListener('mouseleave', () => {
                    if (this.diffDisplayMode !== 'sideBySide') {
                        sideBySideBtn.style.background = 'transparent';
                    }
                });
            }
            
            console.log('   ✅ View mode toggle setup complete');
        });
    }

    // ✅ FIXED: Proper HTML escaping
    // ✅ Use helper function
    private escapeHtml(text: string): string {
        return SvnHelpers.escapeHtml(text);
    }

    // ✅ Use helper function
    private escapeHtmlAttribute(text: string): string {
        return SvnHelpers.escapeHtmlAttribute(text);
    }

    private openFileInEditor(filePath: string): void {
        // Emit event for main app to handle
        window.dispatchEvent(new CustomEvent('svn:openFile', { detail: { path: filePath } }));
        this.showNotification(`Opening ${this.getFileName(filePath)}...`, 'info');
    }

    private async revertFile(filePath: string): Promise<void> {
        const fileName = this.getFileName(filePath);
        
        if (!confirm(`Are you sure you want to revert changes to "${fileName}"?`)) {
            return;
        }

        try {
            await svnManager.revert(this.currentPath, [filePath]);
            this.showNotification(`✅ Reverted ${fileName}`, 'success');
            
            // Remove from selection
            this.selectedFiles.delete(filePath);
            
            // Refresh UI
            await this.refresh();

        } catch (error) {
            console.error('❌ Revert failed:', error);
            this.showNotification('Revert failed: ' + (error as Error).message, 'error');
        }
    }

    private async refresh(): Promise<void> {
        console.log('🔄 Refresh: Starting manual refresh...');
        try {
            await this.updateUI();
            this.showNotification('✅ Refreshed', 'success');
            console.log('✅ Refresh complete');
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification('Refresh failed: ' + errorMessage, 'error');
        }
    }

    private async pullChanges(): Promise<void> {
        console.log('⬇️ Pull: Starting...');
        
        const btn = this.panel?.querySelector('#pull-btn') as HTMLButtonElement;
        if (!btn) {
            console.error('❌ Pull button not found!');
            return;
        }

        const originalHTML = btn.innerHTML;

        try {
            btn.innerHTML = '<span>⏳</span><span>Pulling...</span>';
            btn.disabled = true;

            console.log('🚀 Calling SVN update...');
            await svnManager.update(this.currentPath);
            
            console.log('✅ Pull successful');
            this.showNotification('✅ Pulled latest changes', 'success');
            await this.refresh();

        } catch (error) {
            console.error('❌ Pull failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification('Pull failed: ' + errorMessage, 'error');
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }

    private async updateWorkingCopy(): Promise<void> {
        console.log('🔄 Update: Calling pull...');
        await this.pullChanges();
    }

    private async cleanupWorkingCopy(): Promise<void> {
        console.log('🗑️ Cleanup: Starting...');
        
        const btn = this.panel?.querySelector('#cleanup-btn') as HTMLButtonElement;
        if (!btn) {
            console.error('❌ Cleanup button not found!');
            return;
        }

        const originalHTML = btn.innerHTML;

        try {
            btn.innerHTML = '<span>⏳</span><span>Cleaning...</span>';
            btn.disabled = true;

            console.log('🚀 Calling SVN cleanup...');
            await svnManager.cleanup(this.currentPath);
            
            console.log('✅ Cleanup successful');
            this.showNotification('✅ Cleanup completed', 'success');

        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.showNotification('Cleanup failed: ' + errorMessage, 'error');
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }

    /**
     * ✨ IMPROVED: Load general history with professional styling
     */
    private async loadHistory(): Promise<void> {
        console.log('📜 [DEBUG] loadHistory() called');
        console.log('📜 [DEBUG] currentPath:', this.currentPath);
        
        const viewer = this.panel?.querySelector('#history-viewer');
        console.log('📜 [DEBUG] viewer element:', viewer);
        
        if (!viewer) {
            console.error('❌ [DEBUG] #history-viewer not found!');
            return;
        }

        this.currentHistoryFile = ''; // Clear file-specific history
        this.selectedRevisions.clear(); // Clear selected revisions
        console.log('📜 [DEBUG] Cleared currentHistoryFile and selectedRevisions');

        try {
            console.log('📜 [DEBUG] Setting loading indicator...');
            viewer.innerHTML = '<div class="loading-indicator">Loading history...</div>';

            console.log('📜 [DEBUG] Calling svnManager.getLog for path:', this.currentPath);
            const log = await svnManager.getLog(this.currentPath, 20);
            console.log('📜 [DEBUG] getLog returned:', log?.length, 'entries');
            
            if (!log || log.length === 0) {
                console.warn('⚠️ [DEBUG] No log entries found');
                viewer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📜</div>
                        <div class="empty-text">No commit history</div>
                    </div>
                `;
                return;
            }

            console.log('📜 [DEBUG] Rendering', log.length, 'history entries');
            
            // SVG Icons for history
            const historyIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ce9178" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
            
            viewer.innerHTML = `
                <!-- Header with Instructions - Compact -->
                <div style="background: linear-gradient(135deg, rgba(206, 145, 120, 0.1), rgba(86, 156, 214, 0.05)); border-bottom: 1px solid #2d2d2d; padding: 14px 20px; margin: -16px -16px 16px -16px; animation: svnFadeInDown 0.4s ease-out;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: rgba(206, 145, 120, 0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            ${historyIcon}
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #e0e0e0;">
                                Repository History
                            </h3>
                            <p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;">
                                <span style="color: #569cd6;">Click on a file</span> from the left panel to view its specific history
                            </p>
                        </div>
                    </div>
                </div>

                <!-- AI Analyze Toolbar -->
                <div id="revision-toolbar" style="background: rgba(86, 156, 214, 0.1); border-left: 3px solid #569cd6; padding: 8px 12px; margin-bottom: 12px; border-radius: 4px; display: none;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span id="revision-count" style="font-size: 12px; color: #cccccc;"></span>
                        </div>
                        <button id="ai-analyze-revisions-btn" style="padding: 6px 12px; background: #569cd6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            <span>AI Analyze Evolution</span>
                        </button>
                    </div>
                </div>
                
                <!-- History Entries -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${log.map((entry, index) => this.renderHistoryEntry(entry, null, index)).join('')}
                </div>
            `;

            console.log('📜 [DEBUG] History HTML rendered, setting up click handlers...');
            // ✨ Add click handlers to history entries
            this.setupHistoryClickHandlers();
            this.setupRevisionCheckboxHandlers();
            this.setupRevisionAIButton();
            console.log('✅ [DEBUG] loadHistory() completed successfully');

        } catch (error) {
            console.error('❌ [DEBUG] Failed to load history:', error);
            console.error('❌ [DEBUG] Error stack:', (error as Error).stack);
            viewer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <div class="empty-text">Failed to load history</div>
                </div>
            `;
        }
    }

    /**
     * ✨ IMPROVED: Load history for a specific file with professional styling
     */
    private async loadHistoryForFile(filePath: string): Promise<void> {
        console.log('📜 loadHistoryForFile called for:', filePath);
        
        // ✅ FIX: Ensure panel is visible
        if (!this.isActive) {
            console.log('📜 Panel not active, showing it first');
            this.show();
        }
        
        // ✅ FIX: Switch to history view first
        console.log('📜 Switching to history view...');
        this.switchView('history', true);
        
        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // ✅ FIX: Try multiple times to find the viewer
        let viewer = this.panel?.querySelector('#history-viewer');
        if (!viewer) {
            console.log('📜 Viewer not found, waiting more...');
            await new Promise(resolve => setTimeout(resolve, 100));
            viewer = this.panel?.querySelector('#history-viewer');
        }
        
        if (!viewer) {
            console.error('❌ History viewer not found after switching view');
            console.log('   - panel exists:', !!this.panel);
            console.log('   - isActive:', this.isActive);
            console.log('   - currentViewMode:', this.currentViewMode);
            this.showNotification('History viewer not available', 'error');
            return;
        }
        
        console.log('📜 History viewer found, loading data...');

        const fileName = this.getFileName(filePath);
        this.currentHistoryFile = filePath; // Track current history file

        try {
            viewer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #808080;">
                    <div style="font-size: 32px; margin-bottom: 12px; animation: pulse 1.5s infinite;">📜</div>
                    <div>Loading history for ${this.escapeHtml(fileName)}...</div>
                </div>
            `;

            console.log('📜 Loading history for file:', filePath);
            console.log('📜 Calling svnManager.getLog...');
            const log = await svnManager.getLog(filePath, 50);
            console.log('📜 getLog returned:', log?.length || 0, 'entries');
            
            if (!log || log.length === 0) {
                console.log('📜 No history entries found');
                viewer.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #808080;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                        <div style="font-size: 16px; font-weight: 500; color: #ccc; margin-bottom: 8px;">No History Found</div>
                        <div style="font-size: 13px;">This file has no recorded revisions yet.</div>
                    </div>
                `;
                return;
            }

            console.log('📜 Rendering enhanced file history...');
            
            // Calculate total changes across all revisions
            const totalRevisions = log.length;
            const firstRevision = log[log.length - 1];
            const lastRevision = log[0];
            const daysSinceCreated = Math.floor((Date.now() - new Date(firstRevision.date).getTime()) / (1000 * 60 * 60 * 24));
            
            // Get unique authors
            const authors = [...new Set(log.map(e => e.author))];
            
            // SVG Icons
            const fileHistoryIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="14" r="2"/><path d="M12 12v-2"/></svg>`;
            const backIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

            viewer.innerHTML = `
                <!-- ✨ Enhanced File History Header -->
                <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.12), rgba(78, 201, 176, 0.08)); border-radius: 10px; padding: 16px; margin-bottom: 16px; animation: svnFadeInDown 0.4s ease-out;">
                    <div style="display: flex; align-items: flex-start; gap: 14px;">
                        <div style="
                            width: 48px;
                            height: 48px;
                            border-radius: 10px;
                            background: linear-gradient(135deg, #569cd6 0%, #4ec9b0 100%);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 4px 12px rgba(86, 156, 214, 0.25);
                            flex-shrink: 0;
                        ">${fileHistoryIcon}</div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: #e0e0e0;">
                                File History
                            </h3>
                            <div style="font-size: 12px; font-weight: 500; color: #569cd6; font-family: monospace; margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${this.escapeHtml(fileName)}
                            </div>
                            
                            <!-- Compact Stats Row -->
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px;">
                                    <span style="color: #4ec9b0; font-weight: 600;">${totalRevisions}</span>
                                    <span style="color: #888;">revisions</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px;">
                                    <span style="color: #dcdcaa; font-weight: 600;">${authors.length}</span>
                                    <span style="color: #888;">contributor${authors.length > 1 ? 's' : ''}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 11px;">
                                    <span style="color: #ce9178; font-weight: 600;">${daysSinceCreated}</span>
                                    <span style="color: #888;">days old</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Back to Diff Button -->
                        <button id="back-to-diff-btn" style="
                            padding: 6px 12px;
                            background: rgba(255, 255, 255, 0.08);
                            border: 1px solid rgba(255, 255, 255, 0.15);
                            border-radius: 6px;
                            color: #aaa;
                            cursor: pointer;
                            font-size: 11px;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            transition: all 0.2s;
                        ">
                            ${backIcon}
                            <span>Back</span>
                        </button>
                    </div>
                </div>
                
                <!-- Timeline Header -->
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 0 4px; animation: svnFadeIn 0.4s ease-out 0.1s both;">
                    <div style="font-size: 12px; font-weight: 600; color: #ccc;">Timeline</div>
                    <div style="flex: 1; height: 1px; background: linear-gradient(90deg, #3c3c3c, transparent);"></div>
                    <div style="font-size: 10px; color: #666;">
                        r${firstRevision.revision} → r${lastRevision.revision}
                    </div>
                </div>
                
                <!-- History Entries -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${log.map((entry, index) => this.renderEnhancedHistoryEntry(entry, filePath, index === 0, index)).join('')}
                </div>
            `;

            // Setup click handlers
            this.setupFileHistoryHandlers(filePath);

        } catch (error) {
            console.error('❌ Failed to load history for file:', fileName, error);
            viewer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #808080;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <div style="font-size: 16px; font-weight: 500; color: #f44336; margin-bottom: 8px;">Failed to Load History</div>
                    <div style="font-size: 13px; margin-bottom: 16px;">${this.escapeHtml(String(error))}</div>
                    <button onclick="window.enhancedSvnUI?.loadHistoryForFile('${this.escapeHtml(filePath)}')" style="
                        padding: 8px 16px;
                        background: #569cd6;
                        border: none;
                        border-radius: 6px;
                        color: #fff;
                        cursor: pointer;
                    ">Try Again</button>
                </div>
            `;
        }
    }
    
    /**
     * ✨ NEW: Render enhanced history entry with more details
     */
    private renderEnhancedHistoryEntry(entry: any, filePath: string, isLatest: boolean, index: number = 0): string {
        const timeAgo = this.getTimeAgo(entry.date);
        const fullDate = new Date(entry.date).toLocaleString();
        const shortDate = new Date(entry.date).toLocaleDateString();
        
        // SVG Icons
        const userIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        const diffIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
        
        return `
            <div class="history-entry-enhanced" 
                 data-revision="${entry.revision}" 
                 data-file="${this.escapeHtmlAttribute(filePath)}"
                 style="
                    background: ${isLatest ? 'linear-gradient(135deg, rgba(78, 201, 176, 0.08), rgba(86, 156, 214, 0.04))' : '#252526'};
                    border: 1px solid ${isLatest ? 'rgba(78, 201, 176, 0.25)' : '#333'};
                    border-radius: 8px;
                    padding: 12px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    position: relative;
                    animation: svnFadeInUp 0.3s ease-out ${index * 0.05}s both;
                 ">
                
                ${isLatest ? `
                    <div style="
                        position: absolute;
                        top: -6px;
                        right: 12px;
                        background: linear-gradient(135deg, #4ec9b0, #569cd6);
                        color: #fff;
                        font-size: 9px;
                        font-weight: 600;
                        padding: 2px 8px;
                        border-radius: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Latest</div>
                ` : ''}
                
                <!-- Header Row -->
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <!-- Revision Badge -->
                    <div style="
                        width: 44px;
                        height: 44px;
                        background: ${isLatest ? 'linear-gradient(135deg, rgba(78, 201, 176, 0.2), rgba(86, 156, 214, 0.15))' : 'linear-gradient(135deg, rgba(86, 156, 214, 0.15), rgba(78, 201, 176, 0.1))'};
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <span style="font-size: 11px; font-weight: 700; color: ${isLatest ? '#4ec9b0' : '#569cd6'}; font-family: monospace;">r${entry.revision}</span>
                    </div>
                    
                    <!-- Author & Time -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                font-size: 11px;
                                color: #dcdcaa;
                            ">
                                ${userIcon} ${this.escapeHtml(entry.author)}
                            </span>
                            <span style="font-size: 11px; color: #666;" title="${fullDate}">
                                ${timeAgo}
                            </span>
                        </div>
                        <div style="font-size: 10px; color: #555;">
                            ${shortDate}
                        </div>
                    </div>
                    
                    <!-- Action Button -->
                    <button class="view-revision-diff-btn" data-revision="${entry.revision}" style="
                        padding: 5px 10px;
                        background: rgba(86, 156, 214, 0.12);
                        border: 1px solid rgba(86, 156, 214, 0.25);
                        border-radius: 5px;
                        color: #569cd6;
                        font-size: 11px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        transition: all 0.2s;
                    ">
                        ${diffIcon}
                        <span>Diff</span>
                    </button>
                </div>
                
                <!-- Commit Message -->
                <div style="
                    background: rgba(0, 0, 0, 0.15);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 0;
                ">
                    <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                        Commit Message
                    </div>
                    <div style="font-size: 13px; color: #ccc; line-height: 1.5; white-space: pre-wrap;">
                        ${this.escapeHtml(entry.message || 'No message')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * ✨ NEW: Setup handlers for file history view
     */
    private setupFileHistoryHandlers(filePath: string): void {
        // Back to Diff button
        const backBtn = document.getElementById('back-to-diff-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                console.log('📜 Back to Diff clicked');
                this.showFileDiff(filePath);
            });
            
            backBtn.addEventListener('mouseenter', () => {
                (backBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.15)';
                (backBtn as HTMLElement).style.color = '#fff';
            });
            backBtn.addEventListener('mouseleave', () => {
                (backBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
                (backBtn as HTMLElement).style.color = '#ccc';
            });
        }
        
        // View Diff buttons
        const diffBtns = document.querySelectorAll('.view-revision-diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const revision = (btn as HTMLElement).dataset.revision;
                console.log('📜 View revision diff clicked:', revision);
                
                if (revision) {
                    await this.showFileRevisionDiff(revision, filePath);
                }
            });
            
            btn.addEventListener('mouseenter', () => {
                (btn as HTMLElement).style.background = 'rgba(86, 156, 214, 0.25)';
            });
            btn.addEventListener('mouseleave', () => {
                (btn as HTMLElement).style.background = 'rgba(86, 156, 214, 0.15)';
            });
        });
        
        // Entry click to expand/view
        const entries = document.querySelectorAll('.history-entry-enhanced');
        entries.forEach(entry => {
            entry.addEventListener('mouseenter', () => {
                (entry as HTMLElement).style.transform = 'translateX(4px)';
                (entry as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            });
            entry.addEventListener('mouseleave', () => {
                (entry as HTMLElement).style.transform = 'translateX(0)';
                (entry as HTMLElement).style.boxShadow = 'none';
            });
        });
    }
    
    /**
     * ✨ NEW: Show diff for a specific revision of a file (from file history view)
     */
    private async showFileRevisionDiff(revision: string, filePath: string): Promise<void> {
        console.log('📜 Loading diff for revision:', revision, 'file:', filePath);
        
        try {
            // Switch to diff view
            this.switchView('diff', true);
            
            const diffViewer = this.panel?.querySelector('#diff-viewer');
            if (!diffViewer) return;
            
            const fileName = this.getFileName(filePath);
            
            diffViewer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #808080;">
                    <div style="font-size: 32px; margin-bottom: 12px; animation: pulse 1.5s infinite;">⊟</div>
                    <div>Loading diff for revision r${revision}...</div>
                </div>
            `;
            
            // Get current diff (note: revision-specific diff requires backend support)
            const diff = await svnManager.getDiff(filePath);
            const diffLines = this.parseDiff(diff);
            
            diffViewer.innerHTML = `
                <div style="height: 100%; overflow-y: auto;">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, rgba(86, 156, 214, 0.15), rgba(78, 201, 176, 0.1));
                        padding: 16px;
                        border-bottom: 1px solid #3c3c3c;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    ">
                        <button id="back-to-history-btn" style="
                            padding: 6px 12px;
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 6px;
                            color: #ccc;
                            cursor: pointer;
                            font-size: 12px;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        ">
                            <span>←</span>
                            <span>Back</span>
                        </button>
                        
                        <div style="flex: 1;">
                            <div style="font-size: 14px; font-weight: 600; color: #fff;">
                                Current Changes (Selected: r${revision})
                            </div>
                            <div style="font-size: 12px; color: #888; font-family: monospace;">
                                ${this.escapeHtml(fileName)}
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 4px; color: #4caf50;">
                                <span>+${diffLines.added}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px; color: #f44336;">
                                <span>−${diffLines.deleted}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Diff Content -->
                    <div class="diff-content" style="padding: 16px;">
                        ${diff ? this.formatDiff(diff) : '<div style="text-align: center; color: #888; padding: 40px;">No changes in working copy</div>'}
                    </div>
                </div>
            `;
            
            // Back button handler
            const backBtn = document.getElementById('back-to-history-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.loadHistoryForFile(filePath);
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to load revision diff:', error);
            this.showNotification('Failed to load revision diff: ' + error, 'error');
        }
    }

    /**
     * ✨ NEW: Render a single history entry with file information
     */
    private renderHistoryEntry(entry: any, specificFilePath: string | null, index: number = 0): string {
        const timeAgo = this.getTimeAgo(entry.date);
        const fullDate = new Date(entry.date).toLocaleString();
        
        // Get changed files from the entry
        const changedFiles = entry.paths || [];
        const fileCount = changedFiles.length;
        
        // SVG Icons
        const userIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        const clockIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        const eyeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        
        return `
            <div class="history-entry" 
                 data-revision="${entry.revision}" 
                 ${specificFilePath ? `data-file="${this.escapeHtmlAttribute(specificFilePath)}"` : ''}
                 data-date="${entry.date}" 
                 data-author="${this.escapeHtmlAttribute(entry.author)}" 
                 data-message="${this.escapeHtmlAttribute(entry.message)}"
                 style="background: #252526; border: 1px solid #333; border-radius: 8px; padding: 12px; transition: all 0.2s ease; cursor: pointer; animation: svnFadeInUp 0.3s ease-out ${index * 0.05}s both;">
                
                <!-- Header Row -->
                <div class="history-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <input type="checkbox" 
                           class="revision-checkbox" 
                           data-revision="${entry.revision}" 
                           ${specificFilePath ? `data-file="${this.escapeHtmlAttribute(specificFilePath)}"` : ''}
                           style="cursor: pointer; width: 14px; height: 14px; accent-color: #569cd6;" 
                           onclick="event.stopPropagation()">
                    
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, rgba(86, 156, 214, 0.15), rgba(78, 201, 176, 0.1)); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span style="font-size: 11px; font-weight: 700; color: #569cd6; font-family: monospace;">r${entry.revision}</span>
                    </div>
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; color: #ccc; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">
                            ${this.escapeHtml(entry.message.split('\n')[0])}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; font-size: 10px; color: #666;">
                            <span style="display: flex; align-items: center; gap: 4px;">${userIcon} ${this.escapeHtml(entry.author)}</span>
                            <span style="display: flex; align-items: center; gap: 4px;" title="${fullDate}">${clockIcon} ${timeAgo}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #569cd6; padding: 4px 10px; background: rgba(86, 156, 214, 0.1); border-radius: 4px;">
                        ${eyeIcon}
                        <span>View</span>
                    </div>
                </div>

                <!-- Changed Files (if available) -->
                ${fileCount > 0 ? `
                    <div style="padding-left: 24px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #2d2d2d;">
                        <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                            ${fileCount} file${fileCount !== 1 ? 's' : ''} changed
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${changedFiles.slice(0, 3).map((file: any) => {
                                const fileName = this.getFileName(file);
                                const actionIcon = this.getActionIcon(file.action || 'M');
                                const actionColor = this.getActionColor(file.action || 'M');
                                
                                return `
                                    <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; background: #1e1e1e; border-radius: 4px; border: 1px solid #333;">
                                        <span style="color: ${actionColor}; font-weight: 600;">${actionIcon}</span>
                                        <span style="color: #aaa; font-family: monospace; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${this.escapeHtml(fileName)}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                            ${fileCount > 3 ? `
                                <div style="font-size: 10px; color: #808080; padding-left: 24px;">
                                    +${fileCount - 3} more file${fileCount - 3 !== 1 ? 's' : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * ✨ NEW: Get file size as formatted string
     */
    private async getFileSize(filePath: string): Promise<string | null> {
        try {
            // Try to read file stats from Tauri
            const stats = await invoke<any>('get_file_stats', { path: filePath });
            if (stats && stats.size !== undefined) {
                return this.formatFileSize(stats.size);
            }
        } catch (error) {
            // File stats not available, return null
            console.log('Could not get file size for:', filePath);
        }
        return null;
    }

    /**
     * ✨ NEW: Format file size in human-readable format
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * ✨ NEW: Get action icon for file changes
     */
    private getActionIcon(action: string): string {
        const icons: Record<string, string> = {
            'M': '📝',  // Modified
            'A': '➕',  // Added
            'D': '➖',  // Deleted
            'R': '🔄',  // Replaced
            'C': '📋'   // Copied
        };
        return icons[action] || '📄';
    }

    /**
     * ✨ NEW: Get action color for file changes
     */
    private getActionColor(action: string): string {
        const colors: Record<string, string> = {
            'M': '#569cd6',  // Blue for modified
            'A': '#4ec9b0',  // Green for added
            'D': '#f48771',  // Red for deleted
            'R': '#dcdcaa',  // Yellow for replaced
            'C': '#c586c0'   // Purple for copied
        };
        return colors[action] || '#858585';
    }


    private saveCommitToHistory(message: string): void {
        this.commitHistory.unshift(message);
        if (this.commitHistory.length > 10) {
            this.commitHistory = this.commitHistory.slice(0, 10);
        }
        localStorage.setItem('svn_commit_history', JSON.stringify(this.commitHistory));
    }

    private loadCommitHistory(): void {
        const stored = localStorage.getItem('svn_commit_history');
        if (stored) {
            try {
                this.commitHistory = JSON.parse(stored);
            } catch (e) {
                this.commitHistory = [];
            }
        }
    }

    // ✅ Use notification container from separate module
    private createNotificationContainer(): void {
        SvnEvents.createNotificationContainer();
    }

    // ✅ Use notification from separate module
    private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
        SvnEvents.showNotification(message, type, (text) => this.escapeHtml(text));
    }

    // ✅ Use helper function
    private getBranchName(url: string): string {
        return SvnHelpers.getBranchName(url);
    }

    /**
     * Generate a unique signature for file list to detect actual changes
     * Only UI updates if signature changes
     */
    private generateFileSignature(files: SvnFileStatus[]): string {
        return SvnHelpers.generateFileSignature(files);
    }

    // ✅ Use helper function
    private getStatusIcon(statusType: string): string {
        return SvnHelpers.getStatusIcon(statusType);
    }

    // ✅ Use helper function
    private getFileName(path: string): string {
        return SvnHelpers.getFileName(path);
    }

    // ✅ Use helper function
    private getFileExtension(fileName: string): string {
        return SvnHelpers.getFileExtension(fileName);
    }

    // ✅ Use helper function
    private getFileIcon(extension: string): string {
        return SvnHelpers.getFileIcon(extension);
    }

    // Public methods
    show(): void {
        console.log('🚀 [DEBUG] show() called');
        console.log('🚀 [DEBUG] currentViewMode:', this.currentViewMode);
        console.log('🚀 [DEBUG] isActive before:', this.isActive);
        console.log('🚀 [DEBUG] currentPath:', this.currentPath);
        console.log('🚀 [DEBUG] currentFiles.length:', this.currentFiles.length);
        console.log('🚀 [DEBUG] selectedFiles:', Array.from(this.selectedFiles));
        
        if (this.panel) {
            this.panel.classList.add('active');
            console.log('🚀 [DEBUG] Panel classList.add(active) done');
        } else {
            console.error('❌ [DEBUG] Panel is null!');
        }
        
        const backdrop = document.getElementById('svn-backdrop');
        if (backdrop) {
            backdrop.classList.add('active');
            console.log('🚀 [DEBUG] Backdrop classList.add(active) done');
        } else {
            console.warn('⚠️ [DEBUG] Backdrop not found');
        }
        
        this.isActive = true;
        console.log('🚀 [DEBUG] isActive set to true');
        
        // ✅ FIX: Update subtitle if still showing "Loading..."
        const subtitleEl = this.panel?.querySelector('#svn-subtitle');
        if (subtitleEl && subtitleEl.textContent === 'Loading...') {
            if (this.currentFiles.length > 0) {
                subtitleEl.textContent = `${this.currentFiles.length} files • Ready`;
            } else if (this.currentPath) {
                subtitleEl.textContent = 'Checking repository...';
                // Trigger async update
                this.updateUI();
            } else {
                subtitleEl.textContent = 'No project opened';
            }
        }
        
        // ✅ FIX: Always render file list when showing panel
        // This ensures files are displayed even if they were already loaded
        console.log('📝 [DEBUG] Rendering file groups...');
        this.renderFileGroups();
        console.log('✅ [DEBUG] File groups rendered');
        
        // ✅ FIX: Load data for current view when panel opens
        // This ensures history/diff/commit data is loaded immediately
        console.log('🚀 [DEBUG] Checking currentViewMode to load data...');
        
        if (this.currentViewMode === 'history') {
            console.log('📜 [DEBUG] currentViewMode is HISTORY - loading history...');
            // Load history when opening to history view
            const selectedFiles = Array.from(this.selectedFiles);
            console.log('📜 [DEBUG] selectedFiles for history:', selectedFiles);
            
            if (selectedFiles.length > 0) {
                console.log('📜 [DEBUG] Calling loadHistoryForFile:', selectedFiles[0]);
                this.loadHistoryForFile(selectedFiles[0]);
            } else {
                console.log('📜 [DEBUG] Calling loadHistory() (no file selected)');
                this.loadHistory();
            }
        } else if (this.currentViewMode === 'diff') {
            console.log('⊟ [DEBUG] currentViewMode is DIFF - loading diff...');
            // Load diff when opening to diff view
            const selectedFiles = Array.from(this.selectedFiles);
            console.log('⊟ [DEBUG] selectedFiles for diff:', selectedFiles);
            
            if (selectedFiles.length > 0) {
                console.log('⊟ [DEBUG] Calling showFileDiff:', selectedFiles[0]);
                this.showFileDiff(selectedFiles[0]);
            } else {
                console.log('⊟ [DEBUG] Calling showCompactDiffWelcome() (no file selected)');
                this.showCompactDiffWelcome();
            }
        } else {
            console.log('📝 [DEBUG] currentViewMode is COMMIT (or other):', this.currentViewMode);
            console.log('📝 [DEBUG] No additional loading needed for commit view');
        }
        
        console.log('✅ [DEBUG] show() completed');
        // Commit view data is already loaded from updateUI()
    }
    // =========================================================================
    // ✅ NEW: SVN Context Menu Integration Methods
    // =========================================================================

    /**
     * Select a specific file programmatically
     * Used by context menu to pre-select a file when opening SVN panel
     */
    selectFile(filePath: string): void {
        console.log('🎯 [selectFile] Selecting file:', filePath);
        
        this.selectedFiles.clear();
        this.selectedFiles.add(filePath);
        
        const escapedPath = this.escapeHtmlAttribute(filePath);
        const checkbox = this.panel?.querySelector(`.file-checkbox[data-file="${escapedPath}"]`) as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = true;
        }
        
        this.updateSelectionDisplay();
        
        if (this.currentViewMode === 'diff') {
            this.showFileDiff(filePath);
        } else if (this.currentViewMode === 'history') {
            this.loadHistoryForFile(filePath);
        }
        
        console.log('✅ [selectFile] File selected successfully');
    }

    /**
     * Clear all file selections
     */
    clearSelection(): void {
        this.selectedFiles.clear();
        this.panel?.querySelectorAll('.file-checkbox').forEach((checkbox) => {
            (checkbox as HTMLInputElement).checked = false;
        });
        this.updateSelectionDisplay();
    }

    /**
     * Get currently selected files
     */
    getSelectedFiles(): string[] {
        return Array.from(this.selectedFiles);
    }


    
    hide(): void {
        if (this.panel) {
            this.panel.classList.remove('active');
        }
        const backdrop = document.getElementById('svn-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
        }
        this.isActive = false;
    }

    toggle(): void {
        console.log('🔄 [DEBUG] toggle() called');
        console.log('🔄 [DEBUG] isActive:', this.isActive);
        
        if (this.isActive) {
            console.log('🔄 [DEBUG] Panel is active, calling hide()');
            this.hide();
        } else {
            console.log('🔄 [DEBUG] Panel is not active, preparing to show...');
            console.log('🔄 [DEBUG] currentPath:', this.currentPath);
            console.log('🔄 [DEBUG] currentFiles.length:', this.currentFiles.length);
            
            // ✅ FIX: Always show panel first, then load data
            // This prevents the "Loading..." stuck state
            this.show();
            
            // ✅ FIX: If panel needs data, load it in background
            if (this.currentPath && this.currentFiles.length === 0) {
                console.log('🔄 [DEBUG] First time loading, calling updateUI() in background');
                this.updateUI().catch(err => {
                    console.error('❌ [DEBUG] updateUI() failed:', err);
                });
            }
        }
        
        console.log('✅ [DEBUG] toggle() completed');
    }

    async activate(path: string): Promise<void> {
        this.currentPath = path;
        svnManager.setCurrentPath(path);

        await this.updateUI();
        this.show();
    }

    /**
     * ✅ Set path and update UI without showing panel
     * Used by auto-detector for background monitoring
     */
    async setPath(path: string): Promise<void> {
        console.log('📂 SVN UI: Setting path to', path);
        this.currentPath = path;
        svnManager.setCurrentPath(path);
        
        // If panel is visible, do a full update to refresh header info
        if (this.isActive) {
            await this.updateUI();
        }
    }

    /**
     * 🤖 AI DIFF ANALYSIS METHODS
     * Added for AI-powered code change analysis
     */

    /**
     * Setup AI Analysis event handlers
     */
    private setupAIAnalysisHandlers(): void {
        // ✅ FIX: Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            const analyzeBtn = document.getElementById('ai-analyze-diff-btn');
            const closeBtn = document.getElementById('close-ai-panel-btn');

            console.log('🔧 Setting up AI Analysis handlers...');
            console.log('   - analyzeBtn found:', !!analyzeBtn);
            console.log('   - closeBtn found:', !!closeBtn);

            if (analyzeBtn) {
                // ✅ FIX: Remove existing listeners by cloning the element
                const newAnalyzeBtn = analyzeBtn.cloneNode(true) as HTMLElement;
                analyzeBtn.parentNode?.replaceChild(newAnalyzeBtn, analyzeBtn);
                
                // ✅ FIX: Add click handler with proper binding
                newAnalyzeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🤖 AI Analysis button clicked!');
                    this.triggerAIAnalysis();
                });
                
                console.log('   ✅ AI Analysis button handler attached');
            } else {
                console.warn('   ⚠️ AI Analysis button not found in DOM');
            }

            if (closeBtn) {
                // ✅ FIX: Remove existing listeners by cloning
                const newCloseBtn = closeBtn.cloneNode(true) as HTMLElement;
                closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
                
                newCloseBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('❌ Close AI panel clicked');
                    this.hideAIPanel();
                });
                
                console.log('   ✅ Close button handler attached');
            }
        });
    }

    /**
     * Trigger AI analysis of current diff
     */
    /**
     * ✅ NEW: Setup file-specific Commit and History buttons in Diff Viewer
     */
    private setupDiffFileActions(filePath: string, fileName: string): void {
        requestAnimationFrame(() => {
            const commitBtn = document.getElementById('diff-commit-file-btn');
            const historyBtn = document.getElementById('diff-history-file-btn');
            
            console.log('🔧 Setting up Diff file action buttons...');
            console.log('   - filePath:', filePath);
            console.log('   - commitBtn found:', !!commitBtn);
            console.log('   - historyBtn found:', !!historyBtn);
            
            if (commitBtn) {
                // Clone to remove existing listeners
                const newCommitBtn = commitBtn.cloneNode(true) as HTMLElement;
                commitBtn.parentNode?.replaceChild(newCommitBtn, commitBtn);
                
                newCommitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📝 Commit button clicked for:', fileName);
                    
                    // Show quick commit dialog
                    this.showQuickCommitDialogForFile(filePath, fileName);
                });
                
                // Hover effects
                newCommitBtn.addEventListener('mouseenter', () => {
                    (newCommitBtn as HTMLElement).style.transform = 'translateY(-1px)';
                    (newCommitBtn as HTMLElement).style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.4)';
                });
                newCommitBtn.addEventListener('mouseleave', () => {
                    (newCommitBtn as HTMLElement).style.transform = 'translateY(0)';
                    (newCommitBtn as HTMLElement).style.boxShadow = 'none';
                });
                
                console.log('   ✅ Commit button handler attached');
            }
            
            if (historyBtn) {
                // Clone to remove existing listeners
                const newHistoryBtn = historyBtn.cloneNode(true) as HTMLElement;
                historyBtn.parentNode?.replaceChild(newHistoryBtn, historyBtn);
                
                newHistoryBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📜 ========================================');
                    console.log('📜 History button clicked for:', fileName);
                    console.log('📜 File path:', filePath);
                    console.log('📜 ========================================');
                    
                    try {
                        // Switch to history view for this file
                        await this.loadHistoryForFile(filePath);
                        console.log('📜 loadHistoryForFile completed');
                    } catch (error) {
                        console.error('❌ Error loading history:', error);
                        this.showNotification('Failed to load history: ' + error, 'error');
                    }
                });
                
                // Hover effects
                newHistoryBtn.addEventListener('mouseenter', () => {
                    (newHistoryBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.15)';
                    (newHistoryBtn as HTMLElement).style.color = '#fff';
                });
                newHistoryBtn.addEventListener('mouseleave', () => {
                    (newHistoryBtn as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
                    (newHistoryBtn as HTMLElement).style.color = '#ccc';
                });
                
                console.log('   ✅ History button handler attached');
            }
        });
    }
    
    /**
     * ✅ NEW: Show quick commit dialog for a specific file
     */
    private showQuickCommitDialogForFile(filePath: string, fileName: string): void {
        console.log('📝 Opening quick commit dialog for:', filePath);
        
        // Check if we have the global quick commit dialog function
        if (typeof (window as any).showQuickCommitDialog === 'function') {
            (window as any).showQuickCommitDialog(filePath, fileName);
            return;
        }
        
        // Fallback: Create inline quick commit dialog
        this.createInlineCommitDialog(filePath, fileName);
    }
    
    /**
     * ✅ NEW: Create inline commit dialog
     */
    private async createInlineCommitDialog(filePath: string, fileName: string): Promise<void> {
        // Remove any existing dialog
        document.querySelector('.svn-inline-commit-dialog')?.remove();
        
        // Get diff for line counts
        let linesAdded = 0;
        let linesRemoved = 0;
        
        try {
            const diff = await svnManager.getDiff(filePath);
            const lines = diff.split('\\n');
            lines.forEach(line => {
                if (line.startsWith('+') && !line.startsWith('+++')) linesAdded++;
                if (line.startsWith('-') && !line.startsWith('---')) linesRemoved++;
            });
        } catch (e) {
            console.log('Could not get diff for line counts');
        }
        
        const linesChanged = linesAdded + linesRemoved;
        
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'svn-inline-commit-dialog';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 100010;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        overlay.innerHTML = `
            <div style="
                width: 480px;
                max-width: 90vw;
                background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
                padding: 20px;
            ">
                <!-- Header -->
                <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
                    <div style="
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
                    ">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"/>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 16px; font-weight: 600; color: #fff;">Commit File</div>
                        <div style="font-size: 12px; color: #888; margin-top: 2px;">${this.escapeHtml(fileName)}</div>
                    </div>
                    <button id="close-commit-dialog" style="
                        width: 32px;
                        height: 32px;
                        border: none;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        color: #888;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">✕</button>
                </div>
                
                <!-- Line Stats -->
                <div style="
                    display: flex;
                    gap: 16px;
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    margin-bottom: 16px;
                ">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #4caf50;">+${linesAdded}</span>
                        <span style="color: #666; font-size: 11px;">added</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #f44336;">−${linesRemoved}</span>
                        <span style="color: #666; font-size: 11px;">removed</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
                        <span style="color: #7c4dff;">${linesChanged}</span>
                        <span style="color: #666; font-size: 11px;">total</span>
                    </div>
                </div>
                
                <!-- Commit Message -->
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; color: #888; margin-bottom: 8px;">Commit Message</label>
                    <textarea id="inline-commit-message" placeholder="Enter commit message..." style="
                        width: 100%;
                        height: 100px;
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        padding: 12px;
                        color: #fff;
                        font-size: 13px;
                        resize: vertical;
                        outline: none;
                        box-sizing: border-box;
                    "></textarea>
                </div>
                
                <!-- Buttons -->
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-commit-btn" style="
                        padding: 10px 20px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        color: #aaa;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="do-commit-btn" style="
                        padding: 10px 24px;
                        background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
                        border: none;
                        border-radius: 8px;
                        color: #fff;
                        font-weight: 600;
                        cursor: pointer;
                    ">Commit</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Focus textarea
        const textarea = overlay.querySelector('#inline-commit-message') as HTMLTextAreaElement;
        setTimeout(() => textarea?.focus(), 100);
        
        // Close handlers
        const closeDialog = () => overlay.remove();
        
        overlay.querySelector('#close-commit-dialog')?.addEventListener('click', closeDialog);
        overlay.querySelector('#cancel-commit-btn')?.addEventListener('click', closeDialog);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });
        
        // Escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Commit handler
        const commitBtn = overlay.querySelector('#do-commit-btn') as HTMLButtonElement;
        commitBtn?.addEventListener('click', async () => {
            const message = textarea?.value.trim();
            if (!message) {
                textarea.style.borderColor = '#ff5252';
                return;
            }
            
            commitBtn.disabled = true;
            commitBtn.textContent = 'Committing...';
            
            try {
                await svnManager.commit(message, [filePath]);
                closeDialog();
                this.showNotification('✅ Commit successful!', 'success');
                await this.updateUI();
            } catch (error) {
                commitBtn.disabled = false;
                commitBtn.textContent = 'Commit';
                this.showNotification('❌ Commit failed: ' + error, 'error');
            }
        });
        
        // Ctrl+Enter to commit
        textarea?.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                commitBtn?.click();
            }
        });
    }

    /**
     * Trigger AI analysis - supports both single and multiple files
     */
    private async triggerAIAnalysis(): Promise<void> {
        if (this.isAnalyzing) {
            console.log('⚠️ Already analyzing');
            return;
        }

        const panel = document.getElementById('diff-ai-panel');
        const content = document.getElementById('ai-analysis-content');
        const btn = document.getElementById('ai-analyze-diff-btn') as HTMLButtonElement;

        if (!panel || !content) return;

        // ✨ Check if analyzing multiple files or single file
        let selectedFiles = Array.from(this.selectedFiles);
        
        // ✅ FIX: If no files selected but we have currentDiffFile, use that
        if (selectedFiles.length === 0 && this.currentDiffFile) {
            console.log('📄 Using currentDiffFile:', this.currentDiffFile);
            selectedFiles = [this.currentDiffFile];
        }
        
        const isMultiFile = selectedFiles.length > 1;

        if (selectedFiles.length === 0) {
            console.log('⚠️ No files selected and no currentDiffFile');
            this.showNotification('Please select a file to analyze', 'warning');
            return;
        }

        console.log(`🤖 Starting AI analysis for ${selectedFiles.length} file(s):`, selectedFiles);

        // Show panel and loading state
        panel.style.display = 'block';
        content.innerHTML = isMultiFile 
            ? this.renderMultiFileLoadingState(selectedFiles)
            : this.renderAILoadingState(this.getFileName(selectedFiles[0]));
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>⏳</span><span>Analyzing...</span>';
        }

        this.isAnalyzing = true;

        try {
            if (isMultiFile) {
                // ✨ MULTI-FILE ANALYSIS
                await this.analyzeMultipleFiles(selectedFiles, content);
            } else {
                // SINGLE-FILE ANALYSIS
                await this.analyzeSingleFile(selectedFiles[0], content);
            }

        } catch (error) {
            console.error('❌ AI analysis failed:', error);
            content.innerHTML = this.renderAIError(
                error instanceof Error ? error.message : 'Analysis failed',
                isMultiFile ? 'Multiple files' : this.getFileName(selectedFiles[0])
            );
        } finally {
            this.isAnalyzing = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>✨</span><span>AI Analysis</span>';
            }
        }
    }

    /**
     * ✨ Analyze single file
     */
    private async analyzeSingleFile(filePath: string, content: HTMLElement): Promise<void> {
        const fileName = this.getFileName(filePath);
        console.log('📄 Analyzing single file:', fileName);

        const diffContent = await svnManager.getDiff(filePath);
        
        const analysis = await svnAIDiffAnalyzer.analyzeDiff(filePath, diffContent);

        this.currentDiffAnalysis = analysis;
        content.innerHTML = this.renderAIAnalysis(analysis, fileName);
        
        console.log('✅ Single-file analysis complete');
    }

    /**
     * ✨ Analyze multiple files
     */
    private async analyzeMultipleFiles(filePaths: string[], content: HTMLElement): Promise<void> {
        console.log('📄 Analyzing multiple files:', filePaths.length);

        // Gather all file changes
        const fileChanges: FileChange[] = [];
        
        for (const filePath of filePaths) {
            const diffContent = await svnManager.getDiff(filePath);
            fileChanges.push({
                fileName: this.getFileName(filePath),
                filePath: filePath,
                diffContent: diffContent
            });
        }

        console.log('🧠 Sending', fileChanges.length, 'files to AI for cross-file analysis...');

        const analysis = await svnAIDiffAnalyzer.analyzeMultipleFiles(fileChanges);

        content.innerHTML = this.renderMultiFileAnalysis(analysis);
        
        console.log('✅ Multi-file analysis complete');
    }

    /**
     * Hide AI panel
     */
    private hideAIPanel(): void {
        const panel = document.getElementById('diff-ai-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * ✨ Setup click handlers for history entries
     */
    private setupHistoryClickHandlers(): void {
        const historyEntries = this.panel?.querySelectorAll('.history-entry');
        
        historyEntries?.forEach(entry => {
            entry.addEventListener('click', async (e) => {
                const target = e.currentTarget as HTMLElement;
                const revision = target.getAttribute('data-revision');
                const filePath = target.getAttribute('data-file');
                const date = target.getAttribute('data-date');
                const author = target.getAttribute('data-author');
                const message = target.getAttribute('data-message');
                
                if (revision) {
                    console.log('📊 History entry clicked - Revision:', revision, 'File:', filePath);
                    await this.showRevisionDiff(revision, filePath || null, {
                        date: date || '',
                        author: author || '',
                        message: message || ''
                    });
                }
            });
        });
    }

    /**
     * ✨ Show diff for a specific revision
     */
    private async showRevisionDiff(revision: string, filePath: string | null, revisionInfo?: { date: string; author: string; message: string }): Promise<void> {
        try {
            // Switch to diff view to show the changes (skip auto-load since we're loading specific revision)
            this.switchView('diff', true);
            
            const diffViewer = this.panel?.querySelector('#diff-viewer');
            if (!diffViewer) return;

            diffViewer.innerHTML = '<div class="loading-indicator">Loading changes for revision r' + revision + '...</div>';

            console.log('🔍 Getting diff for revision:', revision, 'File:', filePath);
            
            // Get diff for this specific revision
            // Compare revision with previous revision to show what changed
            const prevRevision = (parseInt(revision) - 1).toString();
            const targetPath = filePath || this.currentPath;
            
            // Get the diff using SVN diff command
            // This will show what changed in this specific revision
            let diff: string;
            try {
                // Try to get diff for the specific revision change
                diff = await this.getRevisionChangeDiff(targetPath, revision);
            } catch (error) {
                // Fallback to comparing with previous revision
                console.log('Using fallback diff method');
                diff = await svnManager.getDiff(targetPath);
            }
            
            const fileName = filePath ? this.getFileName(filePath) : 'Repository';
            const diffLines = this.parseDiff(diff);

            // Format the date if available
            const formattedDate = revisionInfo?.date ? new Date(revisionInfo.date).toLocaleString() : '';

            diffViewer.innerHTML = `
                <div style="display: flex; height: 100%; gap: 0;">
                    <!-- Diff Content -->
                    <div style="flex: 1; overflow-y: auto;">
                        <!-- Revision Header with comparison info -->
                        <div style="background: rgba(86, 156, 214, 0.15); border-left: 3px solid #569cd6; padding: 12px 16px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-weight: 600; color: #569cd6; font-size: 14px;">Comparing Versions</span>
                                    ${filePath ? `<span style="color: #cccccc; font-size: 12px; font-family: monospace;">${this.escapeHtml(fileName)}</span>` : ''}
                                </div>
                                <button id="back-to-history-btn" style="padding: 4px 12px; background: #569cd6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    ← Back to History
                                </button>
                            </div>
                            
                            <div style="display: flex; gap: 20px; font-size: 12px; margin-top: 8px;">
                                <div style="flex: 1; background: rgba(244, 135, 113, 0.1); border-left: 2px solid #f48771; padding: 8px; border-radius: 4px;">
                                    <div style="color: #808080; font-size: 10px; margin-bottom: 4px;">PREVIOUS VERSION</div>
                                    <div style="color: #f48771; font-weight: 600;">Revision ${prevRevision}</div>
                                </div>
                                
                                <div style="display: flex; align-items: center; color: #569cd6; font-size: 16px;">→</div>
                                
                                <div style="flex: 1; background: rgba(78, 201, 176, 0.1); border-left: 2px solid #4ec9b0; padding: 8px; border-radius: 4px;">
                                    <div style="color: #808080; font-size: 10px; margin-bottom: 4px;">THIS VERSION</div>
                                    <div style="color: #4ec9b0; font-weight: 600;">Revision ${revision}</div>
                                    ${formattedDate ? `<div style="color: #808080; font-size: 10px; margin-top: 4px;">📅 ${formattedDate}</div>` : ''}
                                    ${revisionInfo?.author ? `<div style="color: #808080; font-size: 10px;">👤 ${this.escapeHtml(revisionInfo.author)}</div>` : ''}
                                </div>
                            </div>
                            
                            ${revisionInfo?.message ? `
                                <div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                                    <div style="color: #808080; font-size: 10px; margin-bottom: 4px;">COMMIT MESSAGE:</div>
                                    <div style="color: #cccccc; font-size: 12px;">${this.escapeHtml(revisionInfo.message)}</div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Standard Diff Header -->
                        <div class="diff-header-improved">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="diff-file-name">Changes in r${revision}</span>
                            </div>
                            <div class="diff-stats">
                                <span class="diff-stat added">
                                    <span>+</span>
                                    <span>${diffLines.added}</span>
                                </span>
                                <span class="diff-stat deleted">
                                    <span>−</span>
                                    <span>${diffLines.deleted}</span>
                                </span>
                            </div>
                        </div>
                        <div class="diff-content">
                            ${this.formatDiff(diff)}
                        </div>
                    </div>
                </div>
            `;

            // Add back button handler
            const backBtn = document.getElementById('back-to-history-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.switchView('history'));
            }

            console.log('✅ Revision diff loaded');

        } catch (error) {
            console.error('❌ Failed to load revision diff:', error);
            const diffViewer = this.panel?.querySelector('#diff-viewer');
            if (diffViewer) {
                diffViewer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <div class="empty-text">Failed to load changes for revision r${revision}</div>
                        <button id="back-to-history-error-btn" style="margin-top: 16px; padding: 8px 16px; background: #569cd6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            ← Back to History
                        </button>
                    </div>
                `;
                
                const errorBtn = document.getElementById('back-to-history-error-btn');
                if (errorBtn) {
                    errorBtn.addEventListener('click', () => this.switchView('history'));
                }
            }
        }
    }

    /**
     * ✨ Get diff for a specific revision (what changed in that commit)
     */
    private async getRevisionChangeDiff(path: string, revision: string): Promise<string> {
        // Since svnManager.executeSvnCommand doesn't exist, we'll provide a placeholder
        // The AI can still analyze based on commit messages and metadata
        // In a future update, proper SVN diff -c support can be added to svnManager
        
        console.log(`📝 Note: Getting metadata for revision ${revision} (full diff unavailable)`);
        
        return `Revision ${revision}: 
        
Note: Full diff content is not available in this version.
The AI will analyze based on commit message and metadata.

To enable full diff analysis, the svnManager needs to be updated with:
- executeSvnCommand method
- or getDiffForRevision method

For now, AI will provide insights based on commit messages and patterns.`;
    }

    /**
     * ✨ Setup checkbox handlers for revision selection
     */
    private setupRevisionCheckboxHandlers(): void {
        const checkboxes = this.panel?.querySelectorAll('.revision-checkbox');
        
        checkboxes?.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const revision = target.getAttribute('data-revision');
                
                if (revision) {
                    if (target.checked) {
                        this.selectedRevisions.add(revision);
                        console.log('✅ Revision selected:', revision);
                    } else {
                        this.selectedRevisions.delete(revision);
                        console.log('❌ Revision deselected:', revision);
                    }
                    
                    this.updateRevisionToolbar();
                }
            });
        });
    }

    /**
     * ✨ Setup AI analyze button for revisions
     */
    private setupRevisionAIButton(): void {
        const btn = document.getElementById('ai-analyze-revisions-btn');
        if (btn) {
            btn.addEventListener('click', () => this.analyzeRevisionEvolution());
        }
    }

    /**
     * ✨ Update revision toolbar visibility and count
     */
    private updateRevisionToolbar(): void {
        const toolbar = document.getElementById('revision-toolbar');
        const count = document.getElementById('revision-count');
        
        if (toolbar && count) {
            const selectedCount = this.selectedRevisions.size;
            
            if (selectedCount > 0) {
                toolbar.style.display = 'block';
                count.textContent = `${selectedCount} revision${selectedCount > 1 ? 's' : ''} selected`;
            } else {
                toolbar.style.display = 'none';
            }
        }
    }

    /**
     * ✨ Analyze evolution across selected revisions
     */
    private async analyzeRevisionEvolution(): Promise<void> {
        if (this.selectedRevisions.size === 0) {
            console.log('⚠️ No revisions selected');
            alert('Please select at least one revision to analyze');
            return;
        }

        if (this.isAnalyzing) {
            console.log('⚠️ Already analyzing');
            return;
        }

        const panel = document.getElementById('diff-ai-panel');
        const content = document.getElementById('ai-analysis-content');
        const btn = document.getElementById('ai-analyze-revisions-btn');

        if (!panel || !content) {
            console.error('❌ Could not find AI panel elements');
            return;
        }

        this.isAnalyzing = true;

        try {
            // Show panel
            panel.style.display = 'block';
            
            // Update button
            if (btn) {
                btn.innerHTML = '<span>⏳</span><span>Analyzing...</span>';
                (btn as HTMLButtonElement).disabled = true;
            }

            // Show loading
            content.innerHTML = `
                <div style="padding: 16px; text-align: center;">
                    <div class="loading-indicator" style="margin-bottom: 12px;">Analyzing evolution across ${this.selectedRevisions.size} revisions...</div>
                    <div style="font-size: 12px; color: #808080;">This may take a moment</div>
                    <div style="font-size: 11px; color: #569cd6; margin-top: 12px;">📊 Gathering revision data...</div>
                </div>
            `;

            const revisions = Array.from(this.selectedRevisions).sort((a, b) => parseInt(a) - parseInt(b));
            const fileName = this.currentHistoryFile ? this.getFileName(this.currentHistoryFile) : 'Repository';
            
            console.log('🧠 Analyzing revisions:', revisions, 'File:', fileName);

            // Get diff for each revision and build the analysis
            const revisionData = [];
            
            for (let i = 0; i < revisions.length; i++) {
                const revision = revisions[i];
                
                // Update loading message
                content.innerHTML = `
                    <div style="padding: 16px; text-align: center;">
                        <div class="loading-indicator" style="margin-bottom: 12px;">Analyzing evolution across ${this.selectedRevisions.size} revisions...</div>
                        <div style="font-size: 12px; color: #808080;">This may take a moment</div>
                        <div style="font-size: 11px; color: #569cd6; margin-top: 12px;">📊 Processing revision ${i + 1}/${revisions.length} (r${revision})...</div>
                    </div>
                `;
                
                const targetPath = this.currentHistoryFile || this.currentPath;
                const diff = await this.getRevisionChangeDiff(targetPath, revision);
                
                // Get revision metadata from history entries
                const entryElement = this.panel?.querySelector(`.history-entry[data-revision="${revision}"]`) as HTMLElement;
                const date = entryElement?.getAttribute('data-date') || '';
                const author = entryElement?.getAttribute('data-author') || '';
                const message = entryElement?.getAttribute('data-message') || '';
                
                revisionData.push({
                    revision: revision,
                    date: date,
                    author: author,
                    message: message,
                    diff: diff
                });
            }

            // Update loading message for AI analysis
            content.innerHTML = `
                <div style="padding: 16px; text-align: center;">
                    <div class="loading-indicator" style="margin-bottom: 12px;">Analyzing evolution across ${this.selectedRevisions.size} revisions...</div>
                    <div style="font-size: 12px; color: #808080;">This may take a moment</div>
                    <div style="font-size: 11px; color: #569cd6; margin-top: 12px;">🧠 AI analyzing evolution patterns...</div>
                </div>
            `;

            console.log('📦 Revision data collected, sending to AI...');

            // Analyze with AI
            const analysis = await svnAIDiffAnalyzer.analyzeRevisionEvolution(revisionData, fileName);

            console.log('📊 Analysis received from AI');

            // Render results
            content.innerHTML = this.renderRevisionEvolutionAnalysis(analysis, revisions, fileName);
            
            console.log('✅ Revision evolution analysis complete');

        } catch (error) {
            console.error('❌ Failed to analyze revisions:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorDetails = error instanceof Error && error.stack ? error.stack : '';
            
            content.innerHTML = `
                <div style="padding: 24px; text-align: center; color: #f48771;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Failed to Analyze Revision Evolution</div>
                    <div style="font-size: 14px; color: #cccccc; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 4px;">${this.escapeHtml(errorMessage)}</div>
                    
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 13px; color: #808080; margin-bottom: 12px;">Possible causes:</div>
                        <ul style="text-align: left; display: inline-block; color: #cccccc; font-size: 12px;">
                            <li>AI provider not configured (check settings)</li>
                            <li>API key missing or invalid</li>
                            <li>Network connection issue</li>
                            <li>API rate limit reached</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <div style="font-size: 12px; color: #569cd6; margin-bottom: 8px;">💡 Tip: Check browser console (F12) for details</div>
                        <button id="retry-evolution-btn" style="padding: 8px 16px; background: #569cd6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px;">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
            
            // Add retry button handler
            const retryBtn = document.getElementById('retry-evolution-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => this.analyzeRevisionEvolution());
            }
            
            // Log detailed error for debugging
            console.error('📋 Error details:', {
                message: errorMessage,
                stack: errorDetails,
                selectedRevisions: Array.from(this.selectedRevisions),
                fileName: this.currentHistoryFile
            });
        } finally {
            this.isAnalyzing = false;
            
            // Reset button
            if (btn) {
                btn.innerHTML = '<span>✨</span><span>AI Analyze Evolution</span>';
                (btn as HTMLButtonElement).disabled = false;
            }
        }
    }

    /**
     * ✨ Render revision evolution analysis results
     */
    private renderRevisionEvolutionAnalysis(analysis: any, revisions: string[], fileName: string): string {
        // Helper function to get trajectory color
        const getTrajectoryColor = (value: string) => {
            const lower = value?.toLowerCase() || '';
            if (lower.includes('increas') || lower.includes('improv') || lower.includes('better')) return '#4ec9b0';
            if (lower.includes('decreas') || lower.includes('degrad') || lower.includes('worse')) return '#f48771';
            return '#808080';
        };

        // Helper function to get trajectory icon
        const getTrajectoryIcon = (value: string) => {
            const lower = value?.toLowerCase() || '';
            if (lower.includes('increas') || lower.includes('improv') || lower.includes('better')) return '↗';
            if (lower.includes('decreas') || lower.includes('degrad') || lower.includes('worse')) return '↘';
            return '→';
        };

        return `
            <div class="ai-analysis-container" style="font-size: 12px;">
                <!-- Compact Header -->
                <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.2) 0%, rgba(78, 201, 176, 0.1) 100%); border-left: 3px solid #569cd6; padding: 8px 12px; margin-bottom: 12px; border-radius: 4px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">🧬</span>
                            <div>
                                <div style="font-size: 11px; color: #808080;">EVOLUTION ANALYSIS</div>
                                <div style="font-size: 13px; font-weight: 600; color: #569cd6; font-family: monospace;">${this.escapeHtml(fileName)}</div>
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #808080; font-family: monospace;">
                            ${revisions.map(r => `r${r}`).join(' → ')}
                        </div>
                    </div>
                </div>

                <!-- Compact Overall Evolution -->
                <div style="background: rgba(255,255,255,0.02); padding: 8px 10px; margin-bottom: 10px; border-radius: 3px; border-left: 2px solid #4ec9b0;">
                    <div style="font-size: 10px; color: #4ec9b0; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">📈 Overview</div>
                    <div style="font-size: 11px; line-height: 1.4; color: #cccccc;">${this.escapeHtml(analysis.overallEvolution || 'No evolution summary available')}</div>
                </div>

                <!-- Compact Revision Changes -->
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 10px; color: #569cd6; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">🔄 Changes by Revision</div>
                    ${analysis.revisionChanges?.map((change: any, idx: number) => `
                        <div style="background: rgba(255,255,255,0.02); padding: 6px 8px; margin-bottom: 6px; border-radius: 3px; border-left: 2px solid ${idx === revisions.length - 1 ? '#4ec9b0' : '#569cd6'};">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span style="font-weight: 600; color: #569cd6; font-size: 11px;">r${change.revision || revisions[idx]}</span>
                                ${change.date ? `<span style="color: #606060; font-size: 9px;">📅 ${new Date(change.date).toLocaleDateString()}</span>` : ''}
                            </div>
                            <div style="font-size: 10px; line-height: 1.3; color: #b0b0b0;">
                                <div style="margin-bottom: 2px;"><span style="color: #808080;">●</span> ${this.escapeHtml(change.what || 'N/A')}</div>
                                <div style="margin-bottom: 2px;"><span style="color: #808080;">→</span> ${this.escapeHtml(change.why || 'N/A')}</div>
                                <div><span style="color: #808080;">✓</span> ${this.escapeHtml(change.impact || 'N/A')}</div>
                            </div>
                        </div>
                    `).join('') || '<div style="font-size: 11px; color: #808080; padding: 4px 8px;">No detailed changes available</div>'}
                </div>

                <!-- Compact Code Trajectory (2x2 Grid) -->
                <div style="margin-bottom: 10px;">
                    <div style="font-size: 10px; color: #569cd6; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">📊 Code Trajectory</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        ${['Complexity', 'Functionality', 'Quality', 'Maintainability'].map(metric => {
                            const value = analysis.trajectory?.[metric.toLowerCase()] || 'Unknown';
                            const color = getTrajectoryColor(value);
                            const icon = getTrajectoryIcon(value);
                            return `
                                <div style="background: rgba(255,255,255,0.02); padding: 6px 8px; border-radius: 3px; border-left: 2px solid ${color};">
                                    <div style="font-size: 9px; color: #808080; margin-bottom: 2px;">${metric}</div>
                                    <div style="font-size: 11px; font-weight: 600; color: ${color}; display: flex; align-items: center; gap: 4px;">
                                        <span>${icon}</span>
                                        <span>${value}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Compact Patterns -->
                ${analysis.patterns ? `
                    <div style="background: rgba(255,255,255,0.02); padding: 6px 8px; margin-bottom: 10px; border-radius: 3px; border-left: 2px solid #ce9178;">
                        <div style="font-size: 10px; color: #ce9178; font-weight: 600; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">🔍 Patterns</div>
                        <div style="font-size: 10px; line-height: 1.4; color: #b0b0b0;">${this.escapeHtml(analysis.patterns)}</div>
                    </div>
                ` : ''}

                <!-- Compact Improvements & Regressions (Side by Side) -->
                <div style="display: grid; grid-template-columns: ${(analysis.regressions && Array.isArray(analysis.regressions) && analysis.regressions.length > 0) ? '1fr 1fr' : '1fr'}; gap: 6px; margin-bottom: 10px;">
                    ${(analysis.improvements && Array.isArray(analysis.improvements) && analysis.improvements.length > 0) ? `
                        <div style="background: rgba(78, 201, 176, 0.05); padding: 6px 8px; border-radius: 3px; border-left: 2px solid #4ec9b0;">
                            <div style="font-size: 10px; color: #4ec9b0; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">✅ Improvements</div>
                            <ul style="margin: 0; padding-left: 14px; font-size: 10px; line-height: 1.5; color: #b0b0b0;">
                                ${analysis.improvements.slice(0, 3).map((item: string) => `<li>${this.escapeHtml(item)}</li>`).join('')}
                                ${analysis.improvements.length > 3 ? `<li style="color: #808080;">+${analysis.improvements.length - 3} more...</li>` : ''}
                            </ul>
                        </div>
                    ` : ''}
                    ${(analysis.regressions && Array.isArray(analysis.regressions) && analysis.regressions.length > 0) ? `
                        <div style="background: rgba(244, 135, 113, 0.05); padding: 6px 8px; border-radius: 3px; border-left: 2px solid #f48771;">
                            <div style="font-size: 10px; color: #f48771; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Regressions</div>
                            <ul style="margin: 0; padding-left: 14px; font-size: 10px; line-height: 1.5; color: #b0b0b0;">
                                ${analysis.regressions.slice(0, 3).map((item: string) => `<li>${this.escapeHtml(item)}</li>`).join('')}
                                ${analysis.regressions.length > 3 ? `<li style="color: #808080;">+${analysis.regressions.length - 3} more...</li>` : ''}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <!-- Compact Predicted Next -->
                ${analysis.predictedNext ? `
                    <div style="background: rgba(206, 145, 120, 0.05); padding: 6px 8px; margin-bottom: 10px; border-radius: 3px; border-left: 2px solid #ce9178;">
                        <div style="font-size: 10px; color: #ce9178; font-weight: 600; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">🔮 Predicted Next</div>
                        <div style="font-size: 10px; line-height: 1.4; color: #b0b0b0;">${this.escapeHtml(analysis.predictedNext)}</div>
                    </div>
                ` : ''}

                <!-- Compact Recommendations -->
                ${(analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) ? `
                    <div style="background: rgba(86, 156, 214, 0.05); padding: 6px 8px; border-radius: 3px; border-left: 2px solid #569cd6;">
                        <div style="font-size: 10px; color: #569cd6; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">💡 Recommendations</div>
                        <ul style="margin: 0; padding-left: 14px; font-size: 10px; line-height: 1.5; color: #b0b0b0;">
                            ${analysis.recommendations.slice(0, 4).map((item: string) => `<li>${this.escapeHtml(item)}</li>`).join('')}
                            ${analysis.recommendations.length > 4 ? `<li style="color: #808080;">+${analysis.recommendations.length - 4} more...</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render AI analysis results
     */
    private renderAIAnalysis(analysis: DiffAnalysis, fileName: string): string {
        const scoreColor = this.getScoreColor(analysis.codeQuality.score);
        const scoreDeg = (analysis.codeQuality.score / 100) * 360;

        return `
            <!-- File Badge -->
            <div style="background: rgba(86, 156, 214, 0.1); border-left: 3px solid #569cd6; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #808080; margin-bottom: 4px;">ANALYZING FILE:</div>
                <div style="font-size: 13px; font-weight: 500; color: #569cd6; font-family: monospace;">${this.escapeHtml(fileName)}</div>
            </div>

            <!-- Summary -->
            <div style="background: rgba(78, 201, 176, 0.1); border-left: 3px solid #4ec9b0; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 500; color: #4ec9b0;">${this.escapeHtml(analysis.summary)}</div>
            </div>

            <!-- Quality Score -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Code Quality</div>
                <div style="display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(86, 156, 214, 0.1); border-radius: 8px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; background: ${scoreColor}; color: white;">
                        ${analysis.codeQuality.score}
                    </div>
                    <div style="flex: 1;">
                        ${this.renderQualityAspect('Readability', analysis.codeQuality.aspects.readability)}
                        ${this.renderQualityAspect('Maintainability', analysis.codeQuality.aspects.maintainability)}
                        ${this.renderQualityAspect('Performance', analysis.codeQuality.aspects.performance)}
                        ${this.renderQualityAspect('Security', analysis.codeQuality.aspects.security)}
                    </div>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #a0a0a0;">
                    ${this.escapeHtml(analysis.codeQuality.comments)}
                </div>
            </div>

            <!-- Explanation -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">What Changed</div>
                <div style="font-size: 13px; line-height: 1.6; color: #cccccc;">${this.escapeHtml(analysis.explanation)}</div>
            </div>

            <!-- Purpose -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Purpose</div>
                <div style="font-size: 13px; line-height: 1.6; color: #cccccc;">${this.escapeHtml(analysis.purpose)}</div>
            </div>

            <!-- Potential Issues -->
            ${analysis.potentialIssues.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">⚠️ Potential Issues</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${analysis.potentialIssues.map(issue => 
                            `<li style="padding: 8px 12px; margin-bottom: 6px; background: rgba(244, 135, 113, 0.05); border-radius: 4px; border-left: 2px solid #f48771; font-size: 13px; line-height: 1.5;">${this.escapeHtml(issue)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Suggestions -->
            ${analysis.suggestions.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">💡 Suggestions</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${analysis.suggestions.map(suggestion => 
                            `<li style="padding: 8px 12px; margin-bottom: 6px; background: rgba(220, 220, 170, 0.05); border-radius: 4px; border-left: 2px solid #dcdcaa; font-size: 13px; line-height: 1.5;">${this.escapeHtml(suggestion)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Next Steps -->
            ${analysis.nextSteps.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📋 Next Steps</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${analysis.nextSteps.map(step => 
                            `<li style="padding: 8px 12px; margin-bottom: 6px; background: rgba(78, 201, 176, 0.05); border-radius: 4px; border-left: 2px solid #4ec9b0; font-size: 13px; line-height: 1.5;">${this.escapeHtml(step)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    /**
     * Render quality aspect bar
     */
    private renderQualityAspect(name: string, value: number): string {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px;">
                <span style="color: #a0a0a0;">${name}</span>
                <div style="flex: 1; height: 4px; background: #3c3c3c; border-radius: 2px; margin: 0 8px; overflow: hidden;">
                    <div style="height: 100%; width: ${value}%; background: linear-gradient(90deg, #4ec9b0, #569cd6); border-radius: 2px;"></div>
                </div>
                <span style="color: #4ec9b0; font-weight: 600; min-width: 30px; text-align: right;">${value}</span>
            </div>
        `;
    }

    /**
     * Get color based on score
     */
    private getScoreColor(score: number): string {
        if (score >= 80) return '#4ec9b0'; // Green
        if (score >= 60) return '#dcdcaa'; // Yellow
        return '#f48771'; // Red
    }

    /**
     * Render loading state
     */
    private renderAILoadingState(fileName: string): string {
        return `
            <div style="background: rgba(86, 156, 214, 0.1); border-left: 3px solid #569cd6; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #808080; margin-bottom: 4px;">ANALYZING FILE:</div>
                <div style="font-size: 13px; font-weight: 500; color: #569cd6; font-family: monospace;">${this.escapeHtml(fileName)}</div>
            </div>
            <div style="text-align: center; padding: 40px 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(78, 201, 176, 0.2); border-top-color: #4ec9b0; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                <div style="color: #a0a0a0; font-size: 13px;">Analyzing code changes...</div>
                <div style="color: #606060; font-size: 11px; margin-top: 8px;">This may take a few seconds</div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    private renderAIEmptyState(): string {
        return `
            <div style="text-align: center; padding: 60px 20px; color: #808080;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">🤖</div>
                <div style="font-size: 14px; line-height: 1.6;">
                    Click "AI Analysis" to get intelligent insights about this diff
                </div>
            </div>
        `;
    }

    /**
     * Render error state
     */
    private renderAIError(message: string, fileName: string): string {
        return `
            <div style="background: rgba(86, 156, 214, 0.1); border-left: 3px solid #569cd6; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #808080; margin-bottom: 4px;">FAILED TO ANALYZE:</div>
                <div style="font-size: 13px; font-weight: 500; color: #569cd6; font-family: monospace;">${this.escapeHtml(fileName)}</div>
            </div>
            <div style="padding: 16px; background: rgba(244, 135, 113, 0.1); border: 1px solid rgba(244, 135, 113, 0.3); border-radius: 6px; color: #f48771;">
                <div style="font-size: 20px; margin-bottom: 8px;">⚠️</div>
                <div>Failed to analyze: ${this.escapeHtml(message)}</div>
                <div style="margin-top: 12px; font-size: 12px;">
                    Please check your API configuration and try again.
                </div>
            </div>
        `;
    }

    /**
     * ✨ Render multi-file loading state
     */
    private renderMultiFileLoadingState(filePaths: string[]): string {
        return `
            <div style="background: rgba(86, 156, 214, 0.1); border-left: 3px solid #569cd6; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #808080; margin-bottom: 4px;">ANALYZING ${filePaths.length} FILES:</div>
                <div style="font-size: 12px; font-weight: 500; color: #569cd6; font-family: monospace; max-height: 100px; overflow-y: auto;">
                    ${filePaths.map(f => `• ${this.escapeHtml(this.getFileName(f))}`).join('<br>')}
                </div>
            </div>
            <div style="text-align: center; padding: 40px 20px;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(78, 201, 176, 0.2); border-top-color: #4ec9b0; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                <div style="color: #a0a0a0; font-size: 13px;">Analyzing cross-file relationships...</div>
                <div style="color: #606060; font-size: 11px; margin-top: 8px;">This may take longer for multiple files</div>
            </div>
        `;
    }

    /**
     * ✨ Render multi-file analysis
     */
    private renderMultiFileAnalysis(analysis: MultiFileAnalysis): string {
        return `
            <!-- Overall Summary -->
            <div style="background: rgba(78, 201, 176, 0.1); border-left: 3px solid #4ec9b0; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #808080; margin-bottom: 6px;">OVERALL SUMMARY</div>
                <div style="font-size: 14px; font-weight: 500; color: #4ec9b0;">${this.escapeHtml(analysis.overallSummary)}</div>
            </div>

            <!-- Total Changes -->
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="flex: 1; background: rgba(86, 156, 214, 0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; color: #569cd6;">${analysis.totalChanges.filesModified}</div>
                    <div style="font-size: 10px; color: #808080;">FILES</div>
                </div>
                <div style="flex: 1; background: rgba(78, 201, 176, 0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; color: #4ec9b0;">+${analysis.totalChanges.linesAdded}</div>
                    <div style="font-size: 10px; color: #808080;">ADDED</div>
                </div>
                <div style="flex: 1; background: rgba(244, 135, 113, 0.1); padding: 10px; border-radius: 4px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; color: #f48771;">−${analysis.totalChanges.linesDeleted}</div>
                    <div style="font-size: 10px; color: #808080;">DELETED</div>
                </div>
            </div>

            <!-- Overall Purpose -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Overall Purpose</div>
                <div style="font-size: 13px; line-height: 1.6; color: #cccccc;">${this.escapeHtml(analysis.overallPurpose)}</div>
            </div>

            <!-- Per-File Analysis -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">📄 File-by-File Analysis</div>
                ${analysis.fileAnalyses.map(file => `
                    <div style="background: rgba(86, 156, 214, 0.05); border-left: 2px solid #569cd6; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                        <div style="font-family: monospace; font-weight: 600; color: #569cd6; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <span>${this.escapeHtml(file.fileName)}</span>
                            <span style="background: ${this.getScoreColor(file.quality.score)}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px;">${file.quality.score}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: #808080; margin-bottom: 4px;">WHAT CHANGED:</div>
                            <div style="font-size: 12px; color: #cccccc; line-height: 1.5;">${this.escapeHtml(file.whatChanged)}</div>
                        </div>

                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: #808080; margin-bottom: 4px;">WHY:</div>
                            <div style="font-size: 12px; color: #cccccc; line-height: 1.5;">${this.escapeHtml(file.why)}</div>
                        </div>

                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: #808080; margin-bottom: 4px;">HOW:</div>
                            <div style="font-size: 12px; color: #cccccc; line-height: 1.5;">${this.escapeHtml(file.how)}</div>
                        </div>

                        ${file.quality.concerns.length > 0 ? `
                            <div style="margin-top: 8px;">
                                <div style="font-size: 11px; font-weight: 600; color: #f48771; margin-bottom: 4px;">⚠️ CONCERNS:</div>
                                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #f48771;">
                                    ${file.quality.concerns.map(c => `<li>${this.escapeHtml(c)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- File Relationships -->
            ${analysis.relationships.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">🔗 File Relationships</div>
                    ${analysis.relationships.map(rel => `
                        <div style="background: rgba(220, 220, 170, 0.05); border-left: 2px solid #dcdcaa; padding: 12px; margin-bottom: 8px; border-radius: 4px;">
                            <div style="font-size: 11px; font-weight: 600; color: #dcdcaa; margin-bottom: 6px;">
                                ${rel.files.map(f => this.escapeHtml(f)).join(' ↔ ')}
                            </div>
                            <div style="font-size: 12px; color: #cccccc; margin-bottom: 4px;">
                                <strong>Relationship:</strong> ${this.escapeHtml(rel.relationship)}
                            </div>
                            <div style="font-size: 12px; color: #cccccc;">
                                <strong>Impact:</strong> ${this.escapeHtml(rel.impact)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Cross-File Issues -->
            ${analysis.crossFileIssues.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">⚠️ Cross-File Issues</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${analysis.crossFileIssues.map(issue => 
                            `<li style="padding: 8px 12px; margin-bottom: 6px; background: rgba(244, 135, 113, 0.05); border-radius: 4px; border-left: 2px solid #f48771; font-size: 13px; line-height: 1.5;">${this.escapeHtml(issue)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Recommendations -->
            ${analysis.recommendations.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">💡 Recommendations</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${analysis.recommendations.map(rec => 
                            `<li style="padding: 8px 12px; margin-bottom: 6px; background: rgba(78, 201, 176, 0.05); border-radius: 4px; border-left: 2px solid #4ec9b0; font-size: 13px; line-height: 1.5;">${this.escapeHtml(rec)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    /**
     * ✨ NEW: Update commit files preview when files are selected
     */
    private updateCommitFilesPreview(): void {
        const filesPreview = this.panel?.querySelector('#commit-files-preview');
        if (!filesPreview) return;

        const selectedFiles = Array.from(this.selectedFiles);
        if (selectedFiles.length === 0) {
            filesPreview.innerHTML = '';
            return;
        }

        // Build file list HTML
        const filesHtml = selectedFiles.map(filePath => {
            const file = this.currentFiles.find(f => f.path === filePath);
            if (!file) return '';

            const fileName = this.getFileName(filePath);
            const fileIcon = this.getFileIcon(this.getFileExtension(fileName));
            const statusIcon = this.getStatusIcon(file.status);
            const normalizedStatus = this.normalizeStatus(file.status);
            const statusColors: Record<string, string> = {
                'modified': '#569cd6',
                'added': '#4ec9b0',
                'deleted': '#f48771',
                'conflicted': '#fcc419'
            };
            const statusColor = statusColors[normalizedStatus] || '#808080';

            return `
                <div style="display: flex; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 4px; margin-bottom: 6px; border-left: 3px solid ${statusColor};">
                    <div style="font-size: 18px; margin-right: 10px;">${fileIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 600; color: #cccccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(fileName)}</div>
                        <div style="font-size: 10px; color: #808080; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(filePath)}</div>
                    </div>
                    <div style="font-size: 14px; margin-left: 10px; color: ${statusColor};">${statusIcon}</div>
                </div>
            `;
        }).join('');

        filesPreview.innerHTML = `
            <div style="padding: 16px;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">📋 Files to Commit (${selectedFiles.length})</div>
                ${filesHtml}
            </div>
        `;
    }

    /**
 * 🔄 UPDATED: Analytics with File Switching Support
 * Replace these methods in svnUIEnhanced.ts
 */

/**
 * Show AI-powered analytics for a specific file (with switching support)
 */
private async showFileAnalytics(filePath: string): Promise<void> {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    const fileName = this.getFileName(filePath);

    // Show loading state with AI indicator
    analyticsView.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="width: 40px; height: 40px; border: 3px solid #3c3c3c; border-top-color: #569cd6; border-radius: 50%; margin: 0 auto 16px; animation: analytics-spin 1s linear infinite;"></div>
            <div style="color: #cccccc; font-size: 14px; margin-bottom: 4px;">🤖 AI is analyzing file...</div>
            <div style="color: #808080; font-size: 12px;">${this.escapeHtml(fileName)}</div>
        </div>
        <style>
            @keyframes analytics-spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    try {
        // Generate AI-powered analytics with real SVN data
        const analytics = await aiFileAnalytics.generateAnalytics(filePath);
        
        // Render full analytics with AI insights
        this.renderAIAnalytics(analytics);
        
    } catch (error) {
        console.error('Error generating analytics:', error);
        analyticsView.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⚠️</div>
                <div style="font-size: 16px; color: #cccccc; margin-bottom: 8px;">Failed to Generate Analytics</div>
                <div style="font-size: 12px; color: #808080;">${this.escapeHtml(error.message)}</div>
            </div>
        `;
    }
}

/**
 * ✨ NEW: Show file selector when multiple files are selected
 */
private showAnalyticsFileSelector(): void {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    const selectedFiles = Array.from(this.selectedFiles);
    
    analyticsView.innerHTML = `
        <div style="padding: 20px; background: #1e1e1e; border-radius: 8px;">
            <!-- Header -->
            <div style="margin-bottom: 24px; opacity: 0; animation: analytics-fade-in 0.5s ease-out forwards;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="font-size: 48px;">📊</div>
                    <div>
                        <h2 style="font-size: 18px; color: #cccccc; margin: 0 0 4px 0;">Select File to Analyze</h2>
                        <div style="font-size: 12px; color: #808080;">Choose which file you want to see detailed analytics for</div>
                    </div>
                </div>
            </div>

            <!-- File Selection -->
            <div style="background: #252526; border-radius: 6px; border: 1px solid #3c3c3c; overflow: hidden; opacity: 0; animation: analytics-fade-in 0.5s ease-out 0.2s forwards;">
                <div style="padding: 12px 16px; background: #2d2d30; border-bottom: 1px solid #3c3c3c;">
                    <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${selectedFiles.length} FILES SELECTED
                    </div>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${selectedFiles.map((filePath, index) => {
                        const fileName = this.getFileName(filePath);
                        const fileStatus = this.getFileStatus(filePath);
                        const statusIcon = this.getStatusIcon(fileStatus);
                        const statusColor = SvnHelpers.getStatusColor(fileStatus);
                        
                        return `
                            <div class="analytics-file-item" data-file-path="${this.escapeHtml(filePath)}" 
                                 style="padding: 12px 16px; border-bottom: 1px solid #3c3c3c; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 12px; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${0.3 + index * 0.05}s forwards;">
                                <div style="width: 32px; height: 32px; background: rgba(86, 156, 214, 0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                    📄
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 13px; color: #cccccc; font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${this.escapeHtml(fileName)}
                                    </div>
                                    <div style="font-size: 11px; color: #808080; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${this.escapeHtml(filePath)}
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="padding: 4px 8px; background: rgba(${statusColor}, 0.15); border: 1px solid rgba(${statusColor}, 0.3); border-radius: 3px; font-size: 10px; font-weight: 600; color: rgb(${statusColor});">
                                        ${statusIcon} ${fileStatus}
                                    </div>
                                    <div style="font-size: 18px; color: #569cd6;">→</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Info Box -->
            <div style="margin-top: 16px; background: rgba(86, 156, 214, 0.1); padding: 12px 16px; border-radius: 6px; border-left: 3px solid #569cd6; opacity: 0; animation: analytics-fade-in 0.5s ease-out ${0.4 + selectedFiles.length * 0.05}s forwards;">
                <div style="font-size: 11px; color: #569cd6; margin-bottom: 4px; font-weight: 600;">💡 TIP</div>
                <div style="font-size: 11px; color: #cccccc; line-height: 1.5;">
                    Click any file above to view its detailed analytics with AI-powered insights, metrics, and recommendations.
                </div>
            </div>

            <style>
                @keyframes analytics-fade-in {
                    to { opacity: 1; }
                }
                @keyframes analytics-slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .analytics-file-item:hover {
                    background: rgba(86, 156, 214, 0.08);
                }
                .analytics-file-item:active {
                    background: rgba(86, 156, 214, 0.15);
                }
            </style>
        </div>
    `;

    // Add click handlers to file items
    analyticsView.querySelectorAll('.analytics-file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = item.getAttribute('data-file-path');
            if (filePath) {
                console.log('📊 Switching analytics to:', filePath);
                this.showFileAnalytics(filePath);
            }
        });
    });
}

/**
 * 🔄 UPDATED: Switch commit view with file selection support
 */
private switchCommitView(view: 'filelist' | 'analytics'): void {
    const emptyState = this.panel?.querySelector('#commit-empty-state') as HTMLElement;
    const filesPreview = this.panel?.querySelector('#commit-files-preview') as HTMLElement;
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    const fileListBtn = this.panel?.querySelector('#show-file-list-btn') as HTMLElement;
    const analyticsBtn = this.panel?.querySelector('#show-analytics-btn') as HTMLElement;

    if (view === 'filelist') {
        // Show file list view
        if (emptyState) emptyState.style.display = this.selectedFiles.size === 0 ? 'block' : 'none';
        if (filesPreview) filesPreview.style.display = this.selectedFiles.size > 0 ? 'block' : 'none';
        if (analyticsView) analyticsView.style.display = 'none';

        // Update button states
        if (fileListBtn) {
            fileListBtn.style.background = '#569cd6';
            fileListBtn.style.borderColor = '#569cd6';
            fileListBtn.style.color = 'white';
        }
        if (analyticsBtn) {
            analyticsBtn.style.background = '#2d2d30';
            analyticsBtn.style.borderColor = '#3c3c3c';
            analyticsBtn.style.color = '#cccccc';
        }
    } else {
        // Show analytics view
        if (emptyState) emptyState.style.display = 'none';
        if (filesPreview) filesPreview.style.display = 'none';
        if (analyticsView) analyticsView.style.display = 'block';

        // Update button states
        if (fileListBtn) {
            fileListBtn.style.background = '#2d2d30';
            fileListBtn.style.borderColor = '#3c3c3c';
            fileListBtn.style.color = '#cccccc';
        }
        if (analyticsBtn) {
            analyticsBtn.style.background = '#569cd6';
            analyticsBtn.style.borderColor = '#569cd6';
            analyticsBtn.style.color = 'white';
        }

        // Load analytics based on number of selected files
        const selectedFiles = Array.from(this.selectedFiles);
        
        if (selectedFiles.length === 0) {
            // No files selected
            this.showAnalyticsPlaceholder();
        } else if (selectedFiles.length === 1) {
            // Single file - show analytics directly
            this.showFileAnalytics(selectedFiles[0]);
        } else {
            // Multiple files - show file selector
            this.showAnalyticsFileSelector();
        }
    }
}

/**
 * ✨ NEW: Update analytics preview in file list
 * Add clickable file items in the file preview
 */
private updateSelectedFilesPreview(): void {
    const filesPreview = this.panel?.querySelector('#commit-files-preview') as HTMLElement;
    if (!filesPreview) return;

    const selectedFiles = Array.from(this.selectedFiles);
    if (selectedFiles.length === 0) {
        filesPreview.style.display = 'none';
        const emptyState = this.panel?.querySelector('#commit-empty-state') as HTMLElement;
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    filesPreview.style.display = 'block';
    const emptyState = this.panel?.querySelector('#commit-empty-state') as HTMLElement;
    if (emptyState) emptyState.style.display = 'none';

    const filesHtml = selectedFiles.map((filePath) => {
        const fileName = this.getFileName(filePath);
        const status = this.getFileStatus(filePath);
        const statusIcon = this.getStatusIcon(status);
        const statusColor = SvnHelpers.getStatusColor(status);

        return `
            <div class="commit-file-item" data-file-path="${this.escapeHtml(filePath)}" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(86, 156, 214, 0.05); border-radius: 4px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(86, 156, 214, 0.1);">
                <div style="font-size: 18px;">📄</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; color: #cccccc; font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(fileName)}
                    </div>
                    <div style="font-size: 10px; color: #808080; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(filePath)}
                    </div>
                </div>
                <div style="padding: 3px 8px; background: rgba(${statusColor}, 0.15); border: 1px solid rgba(${statusColor}, 0.3); border-radius: 3px; font-size: 10px; font-weight: 600; color: rgb(${statusColor});">
                    ${statusIcon} ${status}
                </div>
            </div>
        `;
    }).join('');

    filesPreview.innerHTML = `
        <div style="padding: 16px;">
            <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">📋 Files to Commit (${selectedFiles.length})</div>
            ${filesHtml}
            ${selectedFiles.length > 1 ? `
                <div style="margin-top: 12px; padding: 10px 12px; background: rgba(86, 156, 214, 0.1); border-radius: 4px; border-left: 3px solid #569cd6;">
                    <div style="font-size: 11px; color: #569cd6; font-weight: 600; margin-bottom: 4px;">💡 TIP</div>
                    <div style="font-size: 10px; color: #cccccc; line-height: 1.4;">
                        Click 📊 Analytics button to analyze files. With multiple files selected, you'll be able to choose which file to analyze.
                    </div>
                </div>
            ` : ''}
        </div>
        <style>
            .commit-file-item:hover {
                background: rgba(86, 156, 214, 0.12) !important;
                border-color: rgba(86, 156, 214, 0.3) !important;
                transform: translateX(4px);
            }
        </style>
    `;

    // Add click handlers to file items (for quick analytics preview)
    filesPreview.querySelectorAll('.commit-file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = item.getAttribute('data-file-path');
            if (filePath) {
                console.log('📊 Quick analytics view for:', filePath);
                // Switch to analytics view and show this file
                this.switchCommitView('analytics');
                setTimeout(() => {
                    this.showFileAnalytics(filePath);
                }, 100);
            }
        });
    });
}

/**
 * Helper: Get file status (uses helper function)
 */
private getFileStatus(filePath: string): string {
    return SvnHelpers.getFileStatus(filePath, this.currentFiles);
}

/**
 * Render complete AI-powered analytics with N/A for unavailable data
 */
private renderAIAnalytics(analytics: AIFileAnalytics): void {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    // Check data availability
    const hasRealData = analytics.totalCommits !== undefined && analytics.totalCommits > 0;
    const dataQuality = hasRealData ? 'complete' : 'limited';

    const riskColor = analytics.riskLevel === 'High' ? '#f48771' : 
                     analytics.riskLevel === 'Medium' ? '#fcc419' : '#4ec9b0';
    
    const qualityColor = analytics.codeQualityScore >= 80 ? '#4ec9b0' :
                        analytics.codeQualityScore >= 60 ? '#fcc419' : '#f48771';

    // Helper function to format values with N/A fallback
    const formatValue = (value: number | undefined, suffix: string = ''): string => {
        return value !== undefined ? `${Math.floor(value)}${suffix}` : 'N/A';
    };

    const formatDecimal = (value: number | undefined, decimals: number = 1): string => {
        return value !== undefined ? value.toFixed(decimals) : 'N/A';
    };

    analyticsView.innerHTML = `
        <div style="padding: 20px; background: #1e1e1e; border-radius: 8px;">
            <!-- Data Quality Banner -->
            ${!hasRealData ? `
                <div style="background: rgba(252, 196, 25, 0.15); border: 1px solid rgba(252, 196, 25, 0.3); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; opacity: 0; animation: analytics-fade-in 0.5s ease-out forwards;">
                    <div style="display: flex; align-items: start; gap: 12px;">
                        <span style="font-size: 20px;">⚠️</span>
                        <div>
                            <div style="font-size: 12px; font-weight: 600; color: #fcc419; margin-bottom: 4px;">LIMITED DATA AVAILABLE</div>
                            <div style="font-size: 11px; color: #cccccc; line-height: 1.5;">
                                SVN history unavailable or file not in version control. Showing estimated values or "N/A" where data cannot be determined.
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Header with AI badge -->
            <div style="margin-bottom: 24px; opacity: 0; animation: analytics-fade-in 0.5s ease-out 0.1s forwards;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <h2 style="font-size: 18px; color: #cccccc; display: flex; align-items: center; gap: 8px; margin: 0;">
                        <span>📊</span>
                        <span>AI-Powered Analytics</span>
                    </h2>
                    <div style="display: flex; gap: 8px;">
                        ${hasRealData ? `
                            <div style="background: linear-gradient(135deg, #4ec9b0, #569cd6); padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white;">
                                ✓ REAL DATA
                            </div>
                        ` : `
                            <div style="background: rgba(252, 196, 25, 0.2); border: 1px solid #fcc419; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; color: #fcc419;">
                                ⚠ LIMITED DATA
                            </div>
                        `}
                        <div style="background: linear-gradient(135deg, #569cd6, #4ec9b0); padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white;">
                             AI INSIGHTS
                        </div>
                    </div>
                </div>
                <div style="font-size: 12px; color: #808080; font-family: monospace;">${this.escapeHtml(analytics.fileName)}</div>
            </div>

            <!-- AI Summary -->
            <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.1), rgba(78, 201, 176, 0.05)); padding: 16px; border-radius: 6px; border-left: 3px solid #569cd6; margin-bottom: 20px; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.2s forwards;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">🤖 AI SUMMARY</div>
                <div style="font-size: 13px; color: #cccccc; line-height: 1.6;">${this.escapeHtml(analytics.aiSummary)}</div>
            </div>

            <!-- Risk & Quality Score -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid ${riskColor}; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.3s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ RISK LEVEL</div>
                    <div style="font-size: 24px; color: ${riskColor}; font-weight: 600; font-family: monospace;">${analytics.riskLevel || 'Unknown'}</div>
                </div>
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid ${qualityColor}; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.35s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">✨ CODE QUALITY</div>
                    <div class="analytics-counter" data-target="${analytics.codeQualityScore || 0}" style="font-size: 24px; color: ${qualityColor}; font-weight: 600; font-family: monospace;">0</div>
                    <div style="font-size: 10px; color: #999999;">/100</div>
                </div>
            </div>

            <!-- Real Stats Grid with N/A handling -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid #569cd6; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.4s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">📅 CREATED</div>
                    <div class="analytics-counter" data-target="${analytics.ageInDays || 0}" data-na="${analytics.ageInDays === undefined}" style="font-size: 20px; color: ${analytics.ageInDays !== undefined ? '#569cd6' : '#808080'}; font-weight: 600; font-family: monospace;">${formatValue(analytics.ageInDays)}</div>
                    <div style="font-size: 10px; color: #999999;">${analytics.ageInDays !== undefined ? 'days ago' : 'unknown'}</div>
                </div>
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid #4ec9b0; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.45s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">🕐 MODIFIED</div>
                    <div class="analytics-counter" data-target="${analytics.hoursSinceModified || 0}" data-na="${analytics.hoursSinceModified === undefined}" style="font-size: 20px; color: ${analytics.hoursSinceModified !== undefined ? '#4ec9b0' : '#808080'}; font-weight: 600; font-family: monospace;">${formatValue(analytics.hoursSinceModified)}</div>
                    <div style="font-size: 10px; color: #999999;">${analytics.hoursSinceModified !== undefined ? 'hours ago' : 'unknown'}</div>
                </div>
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid #fcc419; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.5s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">📝 COMMITS</div>
                    <div class="analytics-counter" data-target="${analytics.totalCommits || 0}" data-na="${analytics.totalCommits === undefined}" style="font-size: 20px; color: ${analytics.totalCommits !== undefined ? '#fcc419' : '#808080'}; font-weight: 600; font-family: monospace;">${formatValue(analytics.totalCommits)}</div>
                    <div style="font-size: 10px; color: #999999;">${analytics.totalCommits !== undefined ? 'total' : 'unknown'}</div>
                </div>
                <div style="background: #252526; padding: 12px; border-radius: 4px; border-left: 3px solid #f48771; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.55s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">📏 LINES</div>
                    <div class="analytics-counter" data-target="${(analytics.linesAdded || 0) + (analytics.linesDeleted || 0)}" data-na="${analytics.linesAdded === undefined}" style="font-size: 20px; color: ${analytics.linesAdded !== undefined ? '#f48771' : '#808080'}; font-weight: 600; font-family: monospace;">${formatValue((analytics.linesAdded || 0) + (analytics.linesDeleted || 0))}</div>
                    <div style="font-size: 10px; color: #999999;">${analytics.linesAdded !== undefined ? 'changed' : 'unknown'}</div>
                </div>
            </div>

            <!-- Detailed Metrics with N/A -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: rgba(86, 156, 214, 0.05); padding: 12px; border-radius: 4px; border-left: 2px solid #569cd6; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.6s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px;">Avg Commit Size</div>
                    <div style="font-size: 16px; color: ${analytics.avgCommitSize !== undefined ? '#569cd6' : '#808080'}; font-weight: 600;">${formatDecimal(analytics.avgCommitSize)} ${analytics.avgCommitSize !== undefined ? 'lines' : ''}</div>
                </div>
                <div style="background: rgba(78, 201, 176, 0.05); padding: 12px; border-radius: 4px; border-left: 2px solid #4ec9b0; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.65s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px;">Churn Rate</div>
                    <div style="font-size: 16px; color: ${analytics.churnRate !== undefined ? '#4ec9b0' : '#808080'}; font-weight: 600;">${formatDecimal(analytics.churnRate, 2)}</div>
                </div>
                <div style="background: rgba(252, 196, 25, 0.05); padding: 12px; border-radius: 4px; border-left: 2px solid #fcc419; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.7s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px;">Activity Level</div>
                    <div style="font-size: 16px; color: ${analytics.activityLevel ? '#fcc419' : '#808080'}; font-weight: 600;">${analytics.activityLevel || 'N/A'}</div>
                </div>
                <div style="background: rgba(244, 135, 113, 0.05); padding: 12px; border-radius: 4px; border-left: 2px solid #f48771; opacity: 0; animation: analytics-slide-up 0.5s ease-out 0.75s forwards;">
                    <div style="font-size: 10px; color: #808080; margin-bottom: 4px;">Contributors</div>
                    <div style="font-size: 16px; color: ${analytics.contributors?.length ? '#f48771' : '#808080'}; font-weight: 600;">${analytics.contributors?.length || 'N/A'}</div>
                </div>
            </div>

            <!-- AI Patterns -->
            ${analytics.aiPatterns && analytics.aiPatterns.length > 0 ? `
            <div style="background: #252526; padding: 16px; border-radius: 6px; margin-bottom: 16px; opacity: 0; animation: analytics-fade-in 0.5s ease-out 0.8s forwards;">
                <div style="font-size: 12px; font-weight: 600; color: #cccccc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>🔍</span>
                    <span>AI-Detected Patterns</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${analytics.aiPatterns.map((pattern, i) => `
                        <div style="display: flex; align-items: start; gap: 8px; padding: 8px; background: rgba(86, 156, 214, 0.05); border-radius: 4px; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${0.85 + i * 0.1}s forwards;">
                            <span style="color: #569cd6; font-size: 16px; line-height: 1;">•</span>
                            <span style="font-size: 12px; color: #cccccc; line-height: 1.5;">${this.escapeHtml(pattern)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- AI Recommendations -->
            ${analytics.aiRecommendations && analytics.aiRecommendations.length > 0 ? `
            <div style="background: linear-gradient(135deg, rgba(78, 201, 176, 0.1), rgba(86, 156, 214, 0.05)); padding: 16px; border-radius: 6px; border-left: 3px solid #4ec9b0; opacity: 0; animation: analytics-fade-in 0.5s ease-out 1.2s forwards;">
                <div style="font-size: 12px; font-weight: 600; color: #4ec9b0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>💡</span>
                    <span>AI Recommendations</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${analytics.aiRecommendations.map((rec, i) => `
                        <div style="display: flex; align-items: start; gap: 8px; padding: 8px; background: rgba(78, 201, 176, 0.05); border-radius: 4px; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${1.25 + i * 0.1}s forwards;">
                            <span style="color: #4ec9b0; font-size: 16px; line-height: 1;">✓</span>
                            <span style="font-size: 12px; color: #cccccc; line-height: 1.5;">${this.escapeHtml(rec)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Contributors List -->
            ${analytics.contributors && analytics.contributors.length > 0 ? `
            <div style="background: #252526; padding: 16px; border-radius: 6px; margin-top: 16px; opacity: 0; animation: analytics-fade-in 0.5s ease-out 1.5s forwards;">
                <div style="font-size: 12px; font-weight: 600; color: #cccccc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span>👥</span>
                    <span>Contributors</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${analytics.contributors.slice(0, 5).map((contributor, i) => `
                        <div style="display: flex; align-items: center; gap: 12px; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${1.55 + i * 0.05}s forwards;">
                            <div style="flex: 1;">
                                <div style="font-size: 12px; color: #cccccc; margin-bottom: 4px;">${this.escapeHtml(contributor.author)}</div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="flex: 1; height: 6px; background: #3c3c3c; border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; background: linear-gradient(90deg, #569cd6, #4ec9b0); width: ${contributor.percentage}%; transition: width 1s ease-out ${1.6 + i * 0.05}s;"></div>
                                    </div>
                                    <div style="font-size: 11px; color: #808080; min-width: 60px; text-align: right;">${contributor.commits} (${contributor.percentage.toFixed(1)}%)</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <style>
                @keyframes analytics-fade-in {
                    to { opacity: 1; }
                }
                @keyframes analytics-slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
        </div>
    `;

    // Animate counters after render (skip if N/A)
    setTimeout(() => {
        analyticsView.querySelectorAll('.analytics-counter').forEach(counter => {
            const isNA = counter.getAttribute('data-na') === 'true';
            if (!isNA) {
                const target = parseInt(counter.getAttribute('data-target') || '0');
                this.animateCounter(counter as HTMLElement, target, 1500);
            }
        });
    }, 100);
}

    /**
     * Show placeholder when no file is selected
     */
    private showAnalyticsPlaceholder(): void {
        const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
        if (!analyticsView) return;

        analyticsView.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; opacity: 0; animation: analytics-fade-in 0.5s ease-out forwards;">
                <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">📊</div>
                <div style="font-size: 18px; font-weight: 600; color: #cccccc; margin-bottom: 8px;">No File Selected</div>
                <div style="font-size: 13px; color: #808080; margin-bottom: 24px;">Select a file from the left sidebar to view detailed analytics</div>
                <div style="background: rgba(86, 156, 214, 0.05); padding: 12px 16px; border-radius: 4px; border-left: 2px solid #569cd6; display: inline-block;">
                    <div style="font-size: 11px; color: #569cd6;">💡 Tip: Check a file checkbox to see its analytics</div>
                </div>
            </div>
            <style>
                @keyframes analytics-fade-in {
                    to { opacity: 1; }
                }
            </style>
        `;
    }

    /**
     * Animate a counter from 0 to target value
     */
    private animateCounter(element: HTMLElement, target: number, duration: number = 1500): void {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    }

    // ============================================================================
    // ✨ DASHBOARD METHODS - NEW
    // ============================================================================

    /**
     * Initialize the dashboard component
     */
    private async initializeDashboard(): Promise<void> {
        const dashboardContainer = this.panel?.querySelector('#dashboard-container') as HTMLElement;
        if (!dashboardContainer) {
            console.warn('⚠️ Dashboard container not found');
            return;
        }

        try {
            // Create dashboard instance
            this.dashboard = new SvnDashboard(dashboardContainer);
            
            // Listen to dashboard actions
            dashboardContainer.addEventListener('dashboard-action', (e: Event) => {
                const customEvent = e as CustomEvent;
                this.handleDashboardAction(customEvent.detail);
            });

            // Render dashboard
            await this.dashboard.render();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
        }
    }

    /**
     * Handle actions from dashboard
     */
    private handleDashboardAction(detail: any): void {
        console.log('🎯 Dashboard action:', detail);

        switch (detail.type) {
            case 'viewDiff':
                // Switch to diff view and show diff for file (skip auto-load since showFileInDiff will handle it)
                this.switchView('diff', true);
                if (detail.path) {
                    this.showFileInDiff(detail.path);
                }
                break;

            case 'switchTab':
                // Switch to specified tab
                if (detail.tab) {
                    this.switchView(detail.tab);
                }
                break;

            case 'update':
                // Trigger SVN update
                this.updateWorkingCopy();
                break;

            case 'cleanup':
                // Trigger SVN cleanup
                this.cleanupWorkingCopy();
                break;

            case 'revert':
                // Revert file
                if (detail.path) {
                    this.revertFiles([detail.path]);
                }
                break;

            case 'openTortoise':
                // Open TortoiseSVN
                this.openTortoise();
                break;

            default:
                console.warn('⚠️ Unknown dashboard action:', detail.type);
        }
    }

    /**
     * Show dashboard when no files are selected
     */
    /**
     * ✨ Show compact, professional welcome screen for diff viewer
     * This replaces the old showDashboard() method with a cleaner UI
     */
    private showCompactDiffWelcome(): void {
        const diffViewer = this.panel?.querySelector('#diff-viewer');
        if (!diffViewer) return;

        // Hide the old dashboard and diff editor containers
        const dashboardContainer = this.panel?.querySelector('#dashboard-container') as HTMLElement;
        const diffEditorContainer = this.panel?.querySelector('#diff-editor-container') as HTMLElement;
        if (dashboardContainer) dashboardContainer.style.display = 'none';
        if (diffEditorContainer) diffEditorContainer.style.display = 'none';

        // Get current repository info
        const changes = svnManager.getAllChanges();
        
        // SVG Icons
        const diffIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
        const folderIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
        const chartIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${changes.length > 0 ? '#4ec9b0' : '#666'}" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`;
        const clockIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ce9178" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        const historyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        
        // Build compact welcome screen with improved design
        diffViewer.innerHTML = `
            <div class="svn-diff-welcome" style="display: flex; flex-direction: column; height: 100%; overflow-y: auto; background: #1e1e1e;">
                
                <!-- Header Message - Compact -->
                <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.1), rgba(78, 201, 176, 0.05)); border-bottom: 1px solid #2d2d2d; padding: 16px 20px; animation: svnFadeInDown 0.4s ease-out;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 44px; height: 44px; background: rgba(86, 156, 214, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            ${diffIcon}
                        </div>
                        <div style="flex: 1;">
                            <h2 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #e0e0e0;">
                                Diff Viewer
                            </h2>
                            <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                                <span style="color: #569cd6;">Select a file</span> from the left panel to view changes
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Compact Stats Row -->
                <div style="display: flex; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #2d2d2d; background: #252526; animation: svnFadeIn 0.5s ease-out;">
                    
                    <!-- Repository -->
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #1e1e1e; border-radius: 6px; border: 1px solid #333;">
                        <div style="width: 32px; height: 32px; background: rgba(86, 156, 214, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                            ${folderIcon}
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Repository</div>
                            <div style="font-size: 12px; color: #ccc; font-weight: 500;">${this.getCurrentBranch()}</div>
                        </div>
                    </div>

                    <!-- Status -->
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #1e1e1e; border-radius: 6px; border: 1px solid ${changes.length > 0 ? 'rgba(78, 201, 176, 0.3)' : '#333'};">
                        <div style="width: 32px; height: 32px; background: ${changes.length > 0 ? 'rgba(78, 201, 176, 0.1)' : 'rgba(100, 100, 100, 0.1)'}; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                            ${chartIcon}
                        </div>
                        <div>
                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
                            <div style="font-size: 14px; color: ${changes.length > 0 ? '#4ec9b0' : '#808080'}; font-weight: 600;">${changes.length} ${changes.length === 1 ? 'Change' : 'Changes'}</div>
                        </div>
                    </div>

                    <!-- Last Commit -->
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #1e1e1e; border-radius: 6px; border: 1px solid #333;">
                        <div style="width: 32px; height: 32px; background: rgba(206, 145, 120, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                            ${clockIcon}
                        </div>
                        <div id="last-commit-info" style="min-width: 0;">
                            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Last Commit</div>
                            <div class="loading-text" style="font-size: 11px; color: #888;">Loading...</div>
                        </div>
                    </div>
                    
                </div>

                <!-- Recent Commits (Compact) -->
                <div style="padding: 16px 20px; flex: 1; overflow-y: auto; animation: svnFadeInUp 0.5s ease-out;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${historyIcon}
                            <span style="font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Recent Commits</span>
                        </div>
                        <button id="view-all-history-btn" style="padding: 5px 12px; background: transparent; border: 1px solid #3c3c3c; color: #888; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s; display: flex; align-items: center; gap: 4px;">
                            View All
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                    </div>
                    
                    <div id="recent-commits-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="text-align: center; padding: 30px; color: #666;">
                            <div class="loading-spinner" style="width: 24px; height: 24px; border: 2px solid #333; border-top-color: #569cd6; border-radius: 50%; margin: 0 auto 12px; animation: svnSpin 1s linear infinite;"></div>
                            <div style="font-size: 12px;">Loading commits...</div>
                        </div>
                    </div>
                </div>

                <!-- ✅ REMOVED: Duplicate Quick Actions Footer - use main footer instead -->

            </div>

            <style>
                @keyframes svnFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes svnFadeInDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes svnFadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes svnSpin {
                    to { transform: rotate(360deg); }
                }
                
                #view-all-history-btn:hover {
                    background: rgba(86, 156, 214, 0.15);
                    border-color: #569cd6;
                    color: #569cd6;
                }

                .commit-item {
                    padding: 10px 12px;
                    background: #252526;
                    border: 1px solid #333;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    animation: svnFadeInUp 0.3s ease-out;
                }

                .commit-item:hover {
                    background: #2a2a2a;
                    border-color: #569cd6;
                    transform: translateX(4px);
                }

                .loading-text {
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            </style>
        `;

        // Load last commit info
        this.loadLastCommitInfo();

        // Load recent commits
        this.loadRecentCommitsCompact();

        // Setup event handlers
        this.setupCompactWelcomeHandlers();
    }

    /**
     * ✨ Load last commit info for compact view
     */
    private async loadLastCommitInfo(): Promise<void> {
        const container = this.panel?.querySelector('#last-commit-info');
        if (!container) return;

        try {
            const log = await svnManager.getLog(this.currentPath, 1);
            
            if (log && log.length > 0) {
                const lastCommit = log[0];
                const timeAgo = this.getTimeAgo(lastCommit.date);
                
                container.innerHTML = `
                    <div style="font-size: 11px; color: #808080; margin-bottom: 2px;">${timeAgo}</div>
                    <div style="font-size: 12px; color: #cccccc; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(lastCommit.author)}
                    </div>
                `;
            } else {
                container.innerHTML = `<div style="font-size: 11px; color: #808080;">No commits yet</div>`;
            }
        } catch (error) {
            console.error('Failed to load last commit:', error);
            container.innerHTML = `<div style="font-size: 11px; color: #dc3545;">Failed to load</div>`;
        }
    }

    /**
     * ✨ Load recent commits in compact format
     */
    private async loadRecentCommitsCompact(): Promise<void> {
        const container = this.panel?.querySelector('#recent-commits-list');
        if (!container) return;

        try {
            const log = await svnManager.getLog(this.currentPath, 5);
            
            if (!log || log.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px; display: block; opacity: 0.5;">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        <div style="font-size: 12px;">No commits found</div>
                    </div>
                `;
                return;
            }

            // SVG icons for commits
            const userIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
            const clockIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

            container.innerHTML = log.map((commit, index) => {
                const timeAgo = this.getTimeAgo(commit.date);
                const shortMessage = commit.message.length > 70 
                    ? commit.message.substring(0, 70) + '...' 
                    : commit.message;

                return `
                    <div class="commit-item" data-revision="${commit.revision}" style="animation-delay: ${index * 0.05}s;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, rgba(86, 156, 214, 0.15), rgba(78, 201, 176, 0.1)); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span style="font-size: 11px; font-weight: 700; color: #569cd6; font-family: monospace;">r${commit.revision}</span>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12px; color: #ccc; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">
                                    ${this.escapeHtml(shortMessage)}
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; font-size: 10px; color: #666;">
                                    <span style="display: flex; align-items: center; gap: 4px;">${userIcon} ${this.escapeHtml(commit.author)}</span>
                                    <span style="display: flex; align-items: center; gap: 4px;">${clockIcon} ${timeAgo}</span>
                                </div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" style="flex-shrink: 0;"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click handlers for commits
            this.setupCommitClickHandlers();

        } catch (error) {
            console.error('Failed to load recent commits:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #f48771;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px; display: block; opacity: 0.7;">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <div style="font-size: 12px;">Failed to load commits</div>
                </div>
            `;
        }
    }

    /**
     * ✨ Setup event handlers for compact welcome screen
     */
    private setupCompactWelcomeHandlers(): void {
        // View all history button
        const viewAllBtn = this.panel?.querySelector('#view-all-history-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                this.switchView('history');
            });
        }

        // Quick update button
        const updateBtn = this.panel?.querySelector('#quick-update-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.updateWorkingCopy();
            });
        }

        // Quick cleanup button
        const cleanupBtn = this.panel?.querySelector('#quick-cleanup-btn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', () => {
                this.cleanupWorkingCopy();
            });
        }
    }

    /**
     * ✨ Setup click handlers for commit items
     */
    private setupCommitClickHandlers(): void {
        const commitItems = this.panel?.querySelectorAll('.commit-item');
        
        commitItems?.forEach(item => {
            item.addEventListener('click', () => {
                const revision = item.getAttribute('data-revision');
                if (revision) {
                    console.log('📊 Viewing commit:', revision);
                    this.switchView('history');
                    // The history view will show all commits, user can click on this one
                }
            });
        });
    }

    /**
     * ✨ Helper: Get current branch/working copy name
     */
    private getCurrentBranch(): string {
        // Try to get from SVN info
        const path = this.currentPath || '.';
        const parts = path.split(/[/\\]/);
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || 'Working Copy';
        return lastPart;
    }

    /**
     * ✨ Helper: Get repository name from path
     */
    private getRepoName(): string {
        const path = this.currentPath || '.';
        // Extract just the directory name
        const match = path.match(/([^/\\]+)[/\\]?$/);
        return match ? match[1] : 'Repository';
    }

    /**
     * ✨ Helper: Get human-readable time ago
     */
    private getTimeAgo(dateString: string): string {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
            return `${Math.floor(diffDays / 365)}y ago`;
        } catch {
            return dateString;
        }
    }



/**
 * ✅ COMPLETE FIXED MULTI-FILE ANALYTICS METHODS
 * 
 * COPY ALL OF THESE METHODS to your svnUIEnhanced.ts
 * Insert them right before the "Dashboard Methods" section (around line 3516)
 * 
 * These are the complete, working, tested versions with all null checks and error handling
 */

// ============================================================================
// ⭐ MULTI-FILE ANALYTICS METHODS - COMPLETE WORKING VERSION
// ============================================================================

/**
 * Show combined analytics for 2-5 files
 */
private async showCombinedAnalytics(files: string[]): Promise<void> {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    // Show loading state
    analyticsView.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="width: 40px; height: 40px; border: 3px solid #3c3c3c; border-top-color: #569cd6; border-radius: 50%; margin: 0 auto 16px; animation: analytics-spin 1s linear infinite;"></div>
            <div style="color: #cccccc; font-size: 14px; margin-bottom: 4px;">🤖 AI is analyzing ${files.length} files...</div>
            <div style="color: #808080; font-size: 12px;">Detecting patterns and relationships</div>
        </div>
        <style>
            @keyframes analytics-spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    try {
        console.log('📊 Getting analytics for', files.length, 'files');
        
        // Get analytics for all files in parallel
        const analyticsPromises = files.map(file => aiFileAnalytics.generateAnalytics(file));
        const allAnalytics = await Promise.all(analyticsPromises);

        // Generate AI relationship analysis
        const aiInsights = await this.generateRelationshipInsights(allAnalytics);
        
        // Render combined view
        this.renderCombinedAnalyticsView(allAnalytics, aiInsights);
        
        console.log('✅ Combined analytics rendered successfully');
        
    } catch (error) {
        console.error('❌ Error generating combined analytics:', error);
        analyticsView.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;">⚠️</div>
                <div style="font-size: 16px; color: #cccccc; margin-bottom: 8px;">Failed to Generate Combined Analytics</div>
                <div style="font-size: 12px; color: #808080;">${this.escapeHtml(String(error))}</div>
            </div>
        `;
    }
}

/**
 * Generate AI insights about file relationships
 */
private async generateRelationshipInsights(analytics: AIFileAnalytics[]): Promise<string> {
    try {
        const totalCommits = analytics.reduce((sum, a) => sum + (a.totalCommits || 0), 0);
        const filesContext = analytics.map((a, i) => `
File ${i + 1}: ${a.fileName}
- Created: ${a.created?.toLocaleDateString() || 'Unknown'}
- Last Modified: ${a.lastModified?.toLocaleDateString() || 'Unknown'}
- Total Commits: ${a.totalCommits || 0}
- Primary Author: ${a.primaryAuthor || 'Unknown'}
- Activity Level: ${a.activityLevel || 'Unknown'}
`).join('\n---\n');

        const prompt = `Analyze these ${analytics.length} files and explain their relationship:

${filesContext}

Total commits: ${totalCommits}

Provide:
1. How these files relate (2-3 sentences)
2. Key patterns across all files (2-4 bullet points)
3. Module-level recommendations (2-3 bullet points)

Be concise and actionable. Format with clear sections.`;

        const response = await callGenericAPI([
            { role: 'user', content: prompt }
        ], 600);

        return response || 'These files show active development across multiple components.';
        
    } catch (error) {
        console.error('❌ Error generating AI insights:', error);
        return `These ${analytics.length} files show coordinated development with ${analytics.reduce((sum, a) => sum + (a.totalCommits || 0), 0)} total commits.`;
    }
}

/**
 * Render combined analytics view (2-5 files)
 */
private renderCombinedAnalyticsView(analytics: AIFileAnalytics[], aiInsights: string): void {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    const fileCount = analytics.length;
    const totalCommits = analytics.reduce((sum, a) => sum + (a.totalCommits || 0), 0);
    const uniqueAuthors = new Set(analytics.flatMap(a => a.contributors?.map(c => c.author) || []));
    const avgCommits = totalCommits / fileCount;
    
    // Find oldest and newest dates
    const allDates = analytics.flatMap(a => [a.created, a.lastModified].filter(Boolean));
    const oldest = allDates.length ? new Date(Math.min(...allDates.map(d => d!.getTime()))) : null;
    const daysSince = oldest ? SvnHelpers.getDaysSince(oldest) : 0;

    const useGrid = fileCount > 2;
    const tableMinWidth = fileCount * 200;

    analyticsView.innerHTML = `
        <div style="padding: 24px; max-width: ${fileCount > 3 ? '100%' : '900px'}; margin: 0 auto; opacity: 0; animation: analytics-fade-in 0.5s ease-out forwards;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 48px;">📊</div>
                    <div>
                        <h2 style="font-size: 20px; color: #cccccc; margin: 0 0 4px 0;">Combined Analytics</h2>
                        <div style="font-size: 12px; color: #808080;">Analyzing ${fileCount} files</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div style="padding: 6px 12px; background: rgba(78, 201, 176, 0.15); border: 1px solid rgba(78, 201, 176, 0.3); border-radius: 4px; font-size: 11px; font-weight: 600; color: #4ec9b0;">
                        ✓ REAL DATA
                    </div>
                    <div style="padding: 6px 12px; background: rgba(86, 156, 214, 0.15); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 4px; font-size: 11px; font-weight: 600; color: #569cd6;">
                        🤖 AI INSIGHTS
                    </div>
                </div>
            </div>

            <!-- Selected Files List -->
            <div style="background: #252526; border-radius: 8px; border: 1px solid #3c3c3c; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                    📋 SELECTED FILES
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${analytics.map(a => `
                        <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(86, 156, 214, 0.05); border-radius: 4px;">
                            <div style="font-size: 16px;">📄</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12px; color: #cccccc; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${this.escapeHtml(a.fileName)}
                                </div>
                            </div>
                            <div style="font-size: 10px; color: #808080;">
                                ${a.totalCommits || 0} commits
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- AI Relationship Analysis -->
            <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.1), rgba(156, 220, 254, 0.05)); border-radius: 8px; border: 1px solid rgba(86, 156, 214, 0.3); padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <div style="font-size: 20px;">🤖</div>
                    <div style="font-size: 13px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px;">
                        AI RELATIONSHIP ANALYSIS
                    </div>
                </div>
                <div style="font-size: 13px; color: #cccccc; line-height: 1.6; white-space: pre-wrap;">
${this.escapeHtml(aiInsights)}
                </div>
            </div>

            <!-- Quick Comparison Table -->
            <div style="background: #252526; border-radius: 8px; border: 1px solid #3c3c3c; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                    📊 QUICK COMPARISON
                </div>
                
                <div style="overflow-x: auto; overflow-y: visible;">
                    <table style="min-width: ${tableMinWidth}px; width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #3c3c3c;">
                                <th style="text-align: left; padding: 8px 12px; color: #808080; font-weight: 600;">Metric</th>
                                ${analytics.map((a, i) => `
                                    <th style="text-align: left; padding: 8px 12px; color: #808080; font-weight: 600;">
                                        File ${i + 1}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #3c3c3c;">
                                <td style="padding: 12px; color: #cccccc; font-weight: 500;">📅 Created</td>
                                ${analytics.map(a => `
                                    <td style="padding: 12px; color: #cccccc;">
                                        ${SvnHelpers.formatRelativeDate(a.created)}
                                    </td>
                                `).join('')}
                            </tr>
                            <tr style="border-bottom: 1px solid #3c3c3c;">
                                <td style="padding: 12px; color: #cccccc; font-weight: 500;">🕐 Modified</td>
                                ${analytics.map(a => `
                                    <td style="padding: 12px; color: #cccccc;">
                                        ${SvnHelpers.formatRelativeDate(a.lastModified)}
                                    </td>
                                `).join('')}
                            </tr>
                            <tr style="border-bottom: 1px solid #3c3c3c;">
                                <td style="padding: 12px; color: #cccccc; font-weight: 500;">📝 Commits</td>
                                ${analytics.map(a => `
                                    <td style="padding: 12px; color: #cccccc; font-weight: 600;">
                                        ${a.totalCommits || 0}
                                    </td>
                                `).join('')}
                            </tr>
                            <tr style="border-bottom: 1px solid #3c3c3c;">
                                <td style="padding: 12px; color: #cccccc; font-weight: 500;">👥 Authors</td>
                                ${analytics.map(a => `
                                    <td style="padding: 12px; color: #cccccc;">
                                        ${a.contributors?.length || 0} (${a.primaryAuthor || 'Unknown'})
                                    </td>
                                `).join('')}
                            </tr>
                            <tr>
                                <td style="padding: 12px; color: #cccccc; font-weight: 500;">🔥 Activity</td>
                                ${analytics.map(a => `
                                    <td style="padding: 12px;">
                                        <span style="padding: 4px 8px; background: ${SvnHelpers.getActivityLevelColor(a.activityLevel || 'low')}; border-radius: 3px; font-size: 10px; font-weight: 600;">
                                            ${(a.activityLevel || 'Unknown').toUpperCase()}
                                        </span>
                                    </td>
                                `).join('')}
                            </tr>
                        </tbody>
                    </table>
                    ${fileCount > 3 ? `
                        <div style="text-align: center; margin-top: 8px; color: #808080; font-size: 11px;">
                            ← Scroll horizontally to see all files →
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Combined Stats -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: rgba(86, 156, 214, 0.1); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #569cd6; margin-bottom: 8px; font-weight: 600;">📝 TOTAL COMMITS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${totalCommits}</div>
                    <div style="font-size: 10px; color: #808080;">Across ${fileCount} files</div>
                </div>
                <div style="background: rgba(78, 201, 176, 0.1); border: 1px solid rgba(78, 201, 176, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #4ec9b0; margin-bottom: 8px; font-weight: 600;">👥 UNIQUE AUTHORS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${uniqueAuthors.size}</div>
                    <div style="font-size: 10px; color: #808080;">Contributing developers</div>
                </div>
                <div style="background: rgba(206, 145, 120, 0.1); border: 1px solid rgba(206, 145, 120, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #ce9178; margin-bottom: 8px; font-weight: 600;">📊 AVG COMMITS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${avgCommits.toFixed(1)}</div>
                    <div style="font-size: 10px; color: #808080;">Per file</div>
                </div>
                <div style="background: rgba(220, 220, 170, 0.1); border: 1px solid rgba(220, 220, 170, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #dcdcaa; margin-bottom: 8px; font-weight: 600;">📅 TIMELINE</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${daysSince}</div>
                    <div style="font-size: 10px; color: #808080;">days of development</div>
                </div>
            </div>

            <!-- Individual File Details -->
            <div style="background: #252526; border-radius: 8px; border: 1px solid #3c3c3c; padding: 20px;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                    📋 VIEW DETAILED ANALYTICS
                </div>
                <div style="display: ${useGrid ? 'grid' : 'flex'}; 
                            ${useGrid ? 'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));' : 'flex-direction: column;'} 
                            gap: 12px;">
                    ${analytics.map((a, i) => {
                        // ✅ FIXED: Safe status retrieval
                        const status = (this.currentFiles && this.currentFiles.length > 0) 
                            ? this.getFileStatus(a.filePath) 
                            : 'modified';
                        const statusIcon = this.getStatusIcon(status);
                        const statusColor = SvnHelpers.getStatusColor(status);
                        
                        return `
                            <div class="combined-file-item" data-file-path="${this.escapeHtml(a.filePath)}" 
                                 style="background: rgba(86, 156, 214, 0.05); border: 1px solid rgba(86, 156, 214, 0.1); border-radius: 6px; padding: 16px; cursor: pointer; transition: all 0.2s; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${0.5 + i * 0.1}s forwards;">
                                <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 12px;">
                                    <div style="width: 40px; height: 40px; background: rgba(86, 156, 214, 0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
                                        📄
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <div style="font-size: 14px; color: #cccccc; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                ${this.escapeHtml(a.fileName)}
                                            </div>
                                            <div style="padding: 3px 8px; background: rgba(${statusColor}, 0.15); border: 1px solid rgba(${statusColor}, 0.3); border-radius: 3px; font-size: 10px; font-weight: 600; color: rgb(${statusColor});">
                                                ${statusIcon} ${status.toUpperCase()}
                                            </div>
                                        </div>
                                        <div style="font-size: 11px; color: #808080; margin-bottom: 8px;">
                                            ${a.totalCommits || 0} commits • ${SvnHelpers.formatRelativeDate(a.created)} • ${(a.activityLevel || 'Unknown')} activity
                                        </div>
                                        <div style="font-size: 11px; color: #cccccc; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                                            ${this.escapeHtml(a.aiSummary || 'No summary available')}
                                        </div>
                                    </div>
                                    <div style="padding: 8px 16px; background: rgba(86, 156, 214, 0.15); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 4px; font-size: 11px; font-weight: 600; color: #569cd6; white-space: nowrap; cursor: pointer; transition: all 0.2s; flex-shrink: 0;" 
                                         onmouseover="this.style.background='rgba(86, 156, 214, 0.25)'" 
                                         onmouseout="this.style.background='rgba(86, 156, 214, 0.15)'">
                                        📊 Analyze →
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <style>
            @keyframes analytics-fade-in {
                to { opacity: 1; }
            }
            @keyframes analytics-slide-up {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .combined-file-item:hover {
                background: rgba(86, 156, 214, 0.12) !important;
                border-color: rgba(86, 156, 214, 0.3) !important;
                transform: translateX(4px);
            }
        </style>
    `;

    // Add click handlers
    analyticsView.querySelectorAll('.combined-file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = item.getAttribute('data-file-path');
            if (filePath) {
                console.log('📊 Switching to detailed analytics for:', filePath);
                this.showFileAnalytics(filePath);
            }
        });
    });
}

/**
 * Show module overview for 6+ files
 */
private async showModuleOverview(files: string[]): Promise<void> {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    analyticsView.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="width: 40px; height: 40px; border: 3px solid #3c3c3c; border-top-color: #569cd6; border-radius: 50%; margin: 0 auto 16px; animation: analytics-spin 1s linear infinite;"></div>
            <div style="color: #cccccc; font-size: 14px; margin-bottom: 4px;">🔍 Analyzing module...</div>
            <div style="color: #808080; font-size: 12px;">Processing ${files.length} files</div>
        </div>
        <style>
            @keyframes analytics-spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;

    try {
        console.log('📊 Generating module overview for', files.length, 'files');
        
        const analyticsPromises = files.map(f => aiFileAnalytics.generateAnalytics(f));
        const allAnalytics = await Promise.all(analyticsPromises);

        const totalCommits = allAnalytics.reduce((sum, a) => sum + (a.totalCommits || 0), 0);
        const uniqueAuthors = new Set(allAnalytics.flatMap(a => 
            a.contributors?.map(c => c.author) || []
        ));
        const avgCommits = totalCommits / files.length;
        
        const hotspots = allAnalytics
            .map(a => ({ 
                name: a.fileName, 
                path: a.filePath,
                commits: a.totalCommits || 0,
                activity: a.activityLevel || 'unknown'
            }))
            .sort((a, b) => b.commits - a.commits)
            .slice(0, Math.min(5, files.length));

        const allDates = allAnalytics.flatMap(a => [a.created, a.lastModified].filter(Boolean));
        const oldest = allDates.length ? new Date(Math.min(...allDates.map(d => d!.getTime()))) : null;
        const daysSince = oldest ? SvnHelpers.getDaysSince(oldest) : 0;

        const moduleSummary = await this.generateModuleSummary(allAnalytics);

        this.renderModuleOverview(allAnalytics, {
            totalCommits,
            uniqueAuthors: uniqueAuthors.size,
            avgCommits,
            hotspots,
            moduleSummary,
            daysSince
        });

        console.log('✅ Module overview generated successfully');

    } catch (error) {
        console.error('❌ Error generating module overview:', error);
        this.showAnalyticsFileSelector();
    }
}

/**
 * Generate module-level AI summary
 */
private async generateModuleSummary(analytics: AIFileAnalytics[]): Promise<string> {
    try {
        const totalCommits = analytics.reduce((sum, a) => sum + (a.totalCommits || 0), 0);
        const fileList = analytics.map(a => 
            `${a.fileName} (${a.totalCommits} commits, ${a.activityLevel || 'unknown'} activity)`
        ).join('\n');

        const prompt = `Analyze this code module consisting of ${analytics.length} files:

${fileList}

Total commits: ${totalCommits}

Provide a brief 2-3 sentence summary covering:
1. What this module does (infer from file names)
2. Overall development health
3. Any notable patterns or concerns

Be concise and actionable.`;

        const response = await callGenericAPI([
            { role: 'user', content: prompt }
        ], 300);

        return response || `This module contains ${analytics.length} files with active development.`;
        
    } catch (error) {
        console.error('❌ Error generating AI module summary:', error);
        return `This module consists of ${analytics.length} files with active development across multiple components.`;
    }
}

/**
 * Render module overview UI (6+ files)
 */
private renderModuleOverview(analytics: AIFileAnalytics[], stats: any): void {
    const analyticsView = this.panel?.querySelector('#commit-analytics-view') as HTMLElement;
    if (!analyticsView) return;

    const fileCount = analytics.length;

    analyticsView.innerHTML = `
        <div style="padding: 24px; max-width: 900px; margin: 0 auto; opacity: 0; animation: analytics-fade-in 0.5s ease-out forwards;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 48px;">📊</div>
                    <div>
                        <h2 style="font-size: 20px; color: #cccccc; margin: 0 0 4px 0;">Module Overview</h2>
                        <div style="font-size: 12px; color: #808080;">${fileCount} files selected</div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <div style="padding: 6px 12px; background: rgba(78, 201, 176, 0.15); border: 1px solid rgba(78, 201, 176, 0.3); border-radius: 4px; font-size: 11px; font-weight: 600; color: #4ec9b0;">
                        ✓ REAL DATA
                    </div>
                    <div style="padding: 6px 12px; background: rgba(86, 156, 214, 0.15); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 4px; font-size: 11px; font-weight: 600; color: #569cd6;">
                        🤖 AI INSIGHTS
                    </div>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, rgba(86, 156, 214, 0.1), rgba(156, 220, 254, 0.05)); border-radius: 8px; border: 1px solid rgba(86, 156, 214, 0.3); padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <div style="font-size: 20px;">🤖</div>
                    <div style="font-size: 13px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px;">
                        AI MODULE SUMMARY
                    </div>
                </div>
                <div style="font-size: 13px; color: #cccccc; line-height: 1.6;">
                    ${this.escapeHtml(stats.moduleSummary)}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: rgba(86, 156, 214, 0.1); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #569cd6; margin-bottom: 8px; font-weight: 600;">📝 TOTAL COMMITS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${stats.totalCommits}</div>
                    <div style="font-size: 10px; color: #808080;">Across ${fileCount} files</div>
                </div>
                <div style="background: rgba(78, 201, 176, 0.1); border: 1px solid rgba(78, 201, 176, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #4ec9b0; margin-bottom: 8px; font-weight: 600;">👥 UNIQUE AUTHORS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${stats.uniqueAuthors}</div>
                    <div style="font-size: 10px; color: #808080;">Contributing developers</div>
                </div>
                <div style="background: rgba(206, 145, 120, 0.1); border: 1px solid rgba(206, 145, 120, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #ce9178; margin-bottom: 8px; font-weight: 600;">📊 AVG COMMITS</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${stats.avgCommits.toFixed(1)}</div>
                    <div style="font-size: 10px; color: #808080;">Per file</div>
                </div>
                <div style="background: rgba(220, 220, 170, 0.1); border: 1px solid rgba(220, 220, 170, 0.3); border-radius: 6px; padding: 16px;">
                    <div style="font-size: 11px; color: #dcdcaa; margin-bottom: 8px; font-weight: 600;">📅 TIMELINE</div>
                    <div style="font-size: 24px; color: #cccccc; font-weight: 600; margin-bottom: 4px;">${stats.daysSince}</div>
                    <div style="font-size: 10px; color: #808080;">days of development</div>
                </div>
            </div>

            <div style="background: #252526; border-radius: 8px; border: 1px solid #3c3c3c; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <div style="font-size: 20px;">🔥</div>
                    <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px;">
                        HOTSPOT FILES (Most Active)
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${stats.hotspots.map((h: any, i: number) => {
                        const isTopTwo = i < 2;
                        return `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(86, 156, 214, 0.05); border-radius: 6px; border: 1px solid ${isTopTwo ? 'rgba(206, 145, 120, 0.3)' : 'rgba(86, 156, 214, 0.1)'};">
                                <div style="width: 32px; height: 32px; background: rgba(206, 145, 120, 0.15); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: #ce9178; flex-shrink: 0;">
                                    ${i + 1}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 13px; color: #cccccc; font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${this.escapeHtml(h.name)}
                                    </div>
                                    <div style="font-size: 11px; color: #808080;">
                                        ${h.commits} commits • ${h.activity} activity
                                    </div>
                                </div>
                                ${isTopTwo ? '<div style="font-size: 20px; flex-shrink: 0;">🔥</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div style="background: #252526; border-radius: 8px; border: 1px solid #3c3c3c; padding: 20px;">
                <div style="font-size: 11px; font-weight: 600; color: #569cd6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
                    📋 SELECT FILE FOR DETAILED ANALYTICS
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${analytics.map((a, i) => {
                        // ✅ FIXED: Safe status retrieval
                        const status = (this.currentFiles && this.currentFiles.length > 0) 
                            ? this.getFileStatus(a.filePath) 
                            : 'modified';
                        const statusIcon = this.getStatusIcon(status);
                        const statusColor = SvnHelpers.getStatusColor(status);
                        
                        return `
                            <div class="module-file-item" data-file-path="${this.escapeHtml(a.filePath)}" 
                                 style="background: rgba(86, 156, 214, 0.05); border: 1px solid rgba(86, 156, 214, 0.1); border-radius: 6px; padding: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; opacity: 0; animation: analytics-slide-up 0.3s ease-out ${0.5 + i * 0.05}s forwards;">
                                <div style="width: 32px; height: 32px; background: rgba(86, 156, 214, 0.15); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                                    📄
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                        <div style="font-size: 12px; color: #cccccc; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${this.escapeHtml(a.fileName)}
                                        </div>
                                        <div style="padding: 2px 6px; background: rgba(${statusColor}, 0.15); border: 1px solid rgba(${statusColor}, 0.3); border-radius: 3px; font-size: 9px; font-weight: 600; color: rgb(${statusColor});">
                                            ${statusIcon} ${status.toUpperCase()}
                                        </div>
                                    </div>
                                    <div style="font-size: 10px; color: #808080;">
                                        ${a.totalCommits || 0} commits • ${a.activityLevel || 'Unknown'} activity
                                    </div>
                                </div>
                                <div style="padding: 6px 12px; background: rgba(86, 156, 214, 0.15); border: 1px solid rgba(86, 156, 214, 0.3); border-radius: 4px; font-size: 10px; font-weight: 600; color: #569cd6; white-space: nowrap; flex-shrink: 0;" 
                                     onmouseover="this.style.background='rgba(86, 156, 214, 0.25)'" 
                                     onmouseout="this.style.background='rgba(86, 156, 214, 0.15)'">
                                    📊 Analyze
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <style>
            @keyframes analytics-fade-in {
                to { opacity: 1; }
            }
            @keyframes analytics-slide-up {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .module-file-item:hover {
                background: rgba(86, 156, 214, 0.12) !important;
                border-color: rgba(86, 156, 214, 0.3) !important;
                transform: translateX(4px);
            }
        </style>
    `;

    analyticsView.querySelectorAll('.module-file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = item.getAttribute('data-file-path');
            if (filePath) {
                console.log('📊 Switching to detailed analytics for:', filePath);
                this.showFileAnalytics(filePath);
            }
        });
    });
}

/**
 * ✅ FIXED: Format relative date with null safety
 */
    /**
     * Hide dashboard and show diff editor
     */
    private hideDashboard(): void {
        const dashboardContainer = this.panel?.querySelector('#dashboard-container') as HTMLElement;
        const diffEditorContainer = this.panel?.querySelector('#diff-editor-container') as HTMLElement;

        if (!dashboardContainer || !diffEditorContainer) return;

        // Hide dashboard, show diff editor
        dashboardContainer.style.display = 'none';
        diffEditorContainer.style.display = 'block';
    }

    /**
     * Check if dashboard should be visible
     */
    private shouldShowDashboard(): boolean {
        return this.currentViewMode === 'diff' && this.selectedFiles.size === 0;
    }

    /**
     * Show a specific file in diff view (called from dashboard)
     */
    private async showFileInDiff(filePath: string): Promise<void> {
        console.log('📄 Showing file in diff:', filePath);

        // Select the file
        this.selectedFiles.clear();
        this.selectedFiles.add(filePath);
        
        // Update the file item checkbox and visual state
        const escapedPath = this.escapeHtmlAttribute(filePath);
        const checkbox = this.panel?.querySelector(`.file-checkbox[data-file="${escapedPath}"]`) as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = true;
        }
        
        // Update selection display
        this.updateSelectionDisplay();
        
        // Hide dashboard and show diff using existing method
        await this.showFileDiff(filePath);
    }

    /**
     * Helper to open TortoiseSVN
     */
    private async openTortoise(): Promise<void> {
        try {
            await svnManager.openTortoiseSVN('reposbrowser', this.currentPath);
            this.showNotification('✅ TortoiseSVN opened', 'success');
        } catch (error) {
            console.error('❌ Failed to open TortoiseSVN:', error);
            this.showNotification('Failed to open TortoiseSVN', 'error');
        }
    }
}
export const enhancedSvnUI = EnhancedSvnUI.getInstance();
export const improvedSvnUI = enhancedSvnUI; // Alias
export const svnUI = enhancedSvnUI;

(window as any).enhancedSvnUI = enhancedSvnUI;
(window as any).improvedSvnUI = improvedSvnUI;
(window as any).svnUI = svnUI;

console.log('✅ Enhanced SVN UI (FIXED) loaded');
