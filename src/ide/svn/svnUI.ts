// src/ide/svn/svnUI.ts
// SVN Source Control Panel UI
// FIXED VERSION - Works with new class-based svnDiffViewer

import { svnManager, SvnFileStatus } from './svnManager';
import { svnDiffViewer } from './svnDiffViewer';  // ✅ FIXED: Import the instance, not a function

export class SvnUI {
    private static instance: SvnUI;
    private panel: HTMLElement | null = null;
    private isVisible: boolean = false;

    private constructor() {
        console.log('🎨 SvnUI instance created');
    }

    static getInstance(): SvnUI {
        if (!SvnUI.instance) {
            SvnUI.instance = new SvnUI();
        }
        return SvnUI.instance;
    }

    // Initialize SVN panel
    async initialize(): Promise<void> {
        console.log('🔧 Initializing SVN UI...');
        
        // Check if SVN is installed
        const isInstalled = await svnManager.checkSvnInstalled();
        if (!isInstalled) {
            console.warn('⚠️ SVN is not installed. SVN features will be disabled.');
            return;
        }

        this.createPanel();
        this.setupEventListeners();
        
        // Subscribe to status changes
        svnManager.onStatusChange((statuses) => {
            console.log('📊 Status changed, updating UI. Changes:', statuses.length);
            this.updateChangesUI(statuses);
        });
        
        console.log('✅ SVN UI initialized successfully');
    }

    // Create SVN panel
    private createPanel(): void {
        console.log('🎨 Creating SVN panel...');
        
        // Find or create the SVN tab button in the left sidebar
        const leftSidebar = document.querySelector('.files-panel') || document.querySelector('.sidebar-left');
        if (!leftSidebar) {
            console.error('❌ Could not find left sidebar');
            return;
        }

        // Add SVN tab button
        const tabsContainer = leftSidebar.querySelector('.tabs') || this.createTabsContainer(leftSidebar as HTMLElement);
        const svnTab = document.createElement('button');
        svnTab.className = 'tab-button';
        svnTab.id = 'svn-tab-button';
        svnTab.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            <span>SVN</span>
        `;
        svnTab.title = 'Source Control (SVN)';
        tabsContainer.appendChild(svnTab);

        // Create SVN panel
        this.panel = document.createElement('div');
        this.panel.className = 'svn-panel';
        this.panel.id = 'svn-panel';
        this.panel.style.display = 'none';
        this.panel.innerHTML = this.getPanelHTML();

        leftSidebar.appendChild(this.panel);

        // Add click handler to tab
        svnTab.addEventListener('click', () => {
            console.log('🎯 SVN tab clicked');
            this.toggle();
        });
        
        console.log('✅ SVN panel created successfully');
    }

    // Create tabs container if it doesn't exist
    private createTabsContainer(sidebar: HTMLElement): HTMLElement {
        const tabs = document.createElement('div');
        tabs.className = 'tabs';
        sidebar.insertBefore(tabs, sidebar.firstChild);
        return tabs;
    }

    // Get panel HTML
    private getPanelHTML(): string {
        return `
            <div class="svn-container">
                <!-- Header -->
                <div class="svn-header">
                    <div class="svn-title">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                        </svg>
                        <span>Source Control (SVN)</span>
                    </div>
                    <div class="svn-actions">
                        <button class="icon-button" id="svn-refresh" title="Refresh">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                            </svg>
                        </button>
                        <button class="icon-button" id="svn-more" title="More Actions">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Repository Info -->
                <div class="svn-info" id="svn-info">
                    <div class="info-loading">Loading repository info...</div>
                </div>

                <!-- Commit Section -->
                <div class="svn-commit-section">
                    <textarea 
                        class="commit-message" 
                        id="svn-commit-message" 
                        placeholder="Enter commit message (Ctrl+Enter to commit)..."
                        rows="3"
                    ></textarea>
                    <div class="commit-actions">
                        <button class="btn btn-primary" id="svn-commit-btn" disabled>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                            </svg>
                            Commit
                        </button>
                        <button class="btn btn-secondary" id="svn-update-btn">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            </svg>
                            Update
                        </button>
                    </div>
                </div>

                <!-- Changes Section -->
                <div class="svn-changes">
                    <div class="changes-header">
                        <span class="changes-title">Changes</span>
                        <span class="changes-count" id="changes-count">0</span>
                    </div>
                    <div class="changes-list" id="changes-list">
                        <div class="empty-state">No changes</div>
                    </div>
                </div>

                <!-- Conflicts Section -->
                <div class="svn-conflicts" id="svn-conflicts" style="display: none;">
                    <div class="conflicts-header">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        <span>Conflicts</span>
                        <span class="conflicts-count" id="conflicts-count">0</span>
                    </div>
                    <div class="conflicts-list" id="conflicts-list"></div>
                </div>

                <!-- Unversioned Section -->
                <div class="svn-unversioned" id="svn-unversioned" style="display: none;">
                    <div class="unversioned-header" id="unversioned-header">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z"/>
                        </svg>
                        <span class="unversioned-title">Unversioned</span>
                        <span class="unversioned-count" id="unversioned-count">0</span>
                        <span class="collapse-icon">▼</span>
                    </div>
                    <div class="unversioned-list" id="unversioned-list"></div>
                </div>
            </div>
        `;
    }

    // Setup event listeners
    private setupEventListeners(): void {
        if (!this.panel) {
            console.error('❌ Cannot setup event listeners - panel is null');
            return;
        }

        console.log('🔗 Setting up event listeners...');

        // Refresh button
        const refreshBtn = this.panel.querySelector('#svn-refresh');
        refreshBtn?.addEventListener('click', () => {
            console.log('🔄 Refresh button clicked');
            this.refresh();
        });

        // More actions button
        const moreBtn = this.panel.querySelector('#svn-more');
        moreBtn?.addEventListener('click', (e) => {
            console.log('⚙️ More actions button clicked');
            this.showMoreMenu(e);
        });

        // Commit button
        const commitBtn = this.panel.querySelector('#svn-commit-btn');
        commitBtn?.addEventListener('click', () => {
            console.log('💾 Commit button clicked');
            this.handleCommit();
        });

        // Update button
        const updateBtn = this.panel.querySelector('#svn-update-btn');
        updateBtn?.addEventListener('click', () => {
            console.log('⬇️ Update button clicked');
            this.handleUpdate();
        });

        // Commit message textarea
        const commitMessage = this.panel.querySelector('#svn-commit-message') as HTMLTextAreaElement;
        commitMessage?.addEventListener('input', () => {
            const hasMessage = commitMessage.value.trim().length > 0;
            const hasChanges = svnManager.getChangesCount() > 0;
            (commitBtn as HTMLButtonElement).disabled = !hasMessage || !hasChanges;
        });

        // Ctrl+Enter to commit
        commitMessage?.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                console.log('⌨️ Ctrl+Enter pressed - committing');
                this.handleCommit();
            }
        });

        // Unversioned collapse toggle
        const unversionedHeader = this.panel.querySelector('#unversioned-header');
        unversionedHeader?.addEventListener('click', () => {
            console.log('📁 Unversioned header clicked');
            this.toggleUnversioned();
        });
        
        console.log('✅ Event listeners setup complete');
    }

    // Toggle panel visibility
    toggle(): void {
        this.isVisible = !this.isVisible;
        console.log(`👁️ Toggling SVN panel: ${this.isVisible ? 'visible' : 'hidden'}`);
        
        if (this.panel) {
            this.panel.style.display = this.isVisible ? 'block' : 'none';
        }

        if (this.isVisible) {
            this.refresh();
        }
    }

    // Show panel
    show(): void {
        console.log('👁️ Showing SVN panel');
        this.isVisible = true;
        if (this.panel) {
            this.panel.style.display = 'block';
        }
        this.refresh();
    }

    // Hide panel
    hide(): void {
        console.log('👁️ Hiding SVN panel');
        this.isVisible = false;
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    // Refresh SVN status
    async refresh(): Promise<void> {
        if (!this.panel) {
            console.warn('⚠️ Cannot refresh - panel is null');
            return;
        }

        console.log('🔄 Refreshing SVN status...');

        const refreshBtn = this.panel.querySelector('#svn-refresh');
        refreshBtn?.classList.add('spinning');

        try {
            // Get repository info
            const info = await svnManager.getInfo();
            this.updateInfoUI(info);

            // Get status
            await svnManager.refreshStatus();
            
            console.log('✅ SVN status refreshed successfully');
        } catch (error) {
            console.error('❌ Error refreshing SVN status:', error);
        } finally {
            refreshBtn?.classList.remove('spinning');
        }
    }

    // Update repository info UI
    private updateInfoUI(info: any): void {
        if (!this.panel) return;

        const infoContainer = this.panel.querySelector('#svn-info');
        if (!infoContainer) {
            console.warn('⚠️ Info container not found');
            return;
        }

        if (info) {
            console.log('📊 Updating repository info:', {
                repo: info.repository_root,
                revision: info.revision,
                branch: this.getBranchFromUrl(info.url)
            });
            
            infoContainer.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Repository:</span>
                    <span class="info-value" title="${info.repository_root}">${this.truncateUrl(info.repository_root)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Revision:</span>
                    <span class="info-value">${info.revision}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Branch:</span>
                    <span class="info-value">${this.getBranchFromUrl(info.url)}</span>
                </div>
            `;
        } else {
            console.warn('⚠️ No SVN repository info available');
            infoContainer.innerHTML = `
                <div class="info-error">Not an SVN working copy</div>
            `;
        }
    }

    // Update changes UI
    private updateChangesUI(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const changesCount = svnManager.getChangesCount();
        const conflictsCount = svnManager.getConflictsCount();
        const unversionedCount = svnManager.getUnversionedCount();

        console.log('📊 Updating UI:', {
            changes: changesCount,
            conflicts: conflictsCount,
            unversioned: unversionedCount
        });

        // Update counts
        const changesCountEl = this.panel.querySelector('#changes-count');
        if (changesCountEl) changesCountEl.textContent = changesCount.toString();

        const conflictsCountEl = this.panel.querySelector('#conflicts-count');
        if (conflictsCountEl) conflictsCountEl.textContent = conflictsCount.toString();

        const unversionedCountEl = this.panel.querySelector('#unversioned-count');
        if (unversionedCountEl) unversionedCountEl.textContent = unversionedCount.toString();

        // Update lists
        this.updateChangesList(statuses);
        this.updateConflictsList(statuses);
        this.updateUnversionedList(statuses);

        // Show/hide sections
        const conflictsSection = this.panel.querySelector('#svn-conflicts');
        if (conflictsSection) {
            (conflictsSection as HTMLElement).style.display = conflictsCount > 0 ? 'block' : 'none';
        }

        const unversionedSection = this.panel.querySelector('#svn-unversioned');
        if (unversionedSection) {
            (unversionedSection as HTMLElement).style.display = unversionedCount > 0 ? 'block' : 'none';
        }

        // Update commit button state
        const commitBtn = this.panel.querySelector('#svn-commit-btn') as HTMLButtonElement;
        const commitMessage = this.panel.querySelector('#svn-commit-message') as HTMLTextAreaElement;
        if (commitBtn && commitMessage) {
            commitBtn.disabled = changesCount === 0 || commitMessage.value.trim().length === 0;
        }
    }

    // Update changes list - ENHANCED WITH DEBUGGING
    private updateChangesList(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const changesList = this.panel.querySelector('#changes-list');
        if (!changesList) {
            console.error('❌ #changes-list element not found!');
            return;
        }

        const changes = statuses.filter(s => s.status !== ' ' && s.status !== '?' && s.status !== 'C');

        console.log(`📝 Updating changes list with ${changes.length} files`);

        if (changes.length === 0) {
            changesList.innerHTML = '<div class="empty-state">No changes</div>';
            return;
        }

        changesList.innerHTML = changes.map(status => {
            const statusInfo = svnManager.getStatusIcon(status.status);
            return `
                <div class="change-item" data-path="${status.path}">
                    <span class="status-icon" style="color: ${statusInfo.color}" title="${statusInfo.label}">
                        ${statusInfo.icon}
                    </span>
                    <span class="change-path" title="${status.path}">${this.getFileName(status.path)}</span>
                    <div class="change-actions">
                        <button class="icon-button" data-action="diff" title="View Diff">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5-10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                                <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                        </button>
                        <button class="icon-button" data-action="revert" title="Revert">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to action buttons - ENHANCED WITH DEBUGGING
        const items = changesList.querySelectorAll('.change-item');
        console.log(`🔗 Attaching event listeners to ${items.length} change items...`);
        
        items.forEach((item, index) => {
            const path = item.getAttribute('data-path');
            if (!path) {
                console.warn(`⚠️ Item ${index} has no data-path attribute`);
                return;
            }

            const diffBtn = item.querySelector('[data-action="diff"]');
            const revertBtn = item.querySelector('[data-action="revert"]');
            
            if (!diffBtn) {
                console.warn(`⚠️ No diff button found for ${path}`);
            }
            
            if (!revertBtn) {
                console.warn(`⚠️ No revert button found for ${path}`);
            }

            // Diff button with enhanced logging
            diffBtn?.addEventListener('click', (e) => {
                console.log('🎯 DIFF BUTTON CLICKED!');
                console.log('   File:', path);
                console.log('   File name:', this.getFileName(path));
                e.preventDefault();
                e.stopPropagation();
                this.showDiff(path);
            });

            // Revert button with enhanced logging
            revertBtn?.addEventListener('click', (e) => {
                console.log('🔄 REVERT BUTTON CLICKED!');
                console.log('   File:', path);
                e.preventDefault();
                e.stopPropagation();
                this.revertFile(path);
            });
        });
        
        console.log('✅ Event listeners attached successfully to all change items');
    }

    // Update conflicts list
    private updateConflictsList(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const conflictsList = this.panel.querySelector('#conflicts-list');
        if (!conflictsList) return;

        const conflicts = statuses.filter(s => s.status === 'C');

        console.log(`⚠️ Updating conflicts list with ${conflicts.length} files`);

        conflictsList.innerHTML = conflicts.map(status => {
            return `
                <div class="conflict-item" data-path="${status.path}">
                    <span class="status-icon" style="color: #ffc107" title="Conflicted">⚠</span>
                    <span class="conflict-path" title="${status.path}">${this.getFileName(status.path)}</span>
                    <div class="conflict-actions">
                        <button class="btn-small" data-action="resolve-mine">Mine</button>
                        <button class="btn-small" data-action="resolve-theirs">Theirs</button>
                        <button class="btn-small" data-action="resolve-manual">Manual</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        conflictsList.querySelectorAll('.conflict-item').forEach(item => {
            const path = item.getAttribute('data-path');
            if (!path) return;

            item.querySelector('[data-action="resolve-mine"]')?.addEventListener('click', () => {
                console.log('✅ Resolving conflict (mine):', path);
                this.resolveConflict(path, 'mine-full');
            });

            item.querySelector('[data-action="resolve-theirs"]')?.addEventListener('click', () => {
                console.log('✅ Resolving conflict (theirs):', path);
                this.resolveConflict(path, 'theirs-full');
            });

            item.querySelector('[data-action="resolve-manual"]')?.addEventListener('click', () => {
                console.log('✅ Resolving conflict (manual):', path);
                this.resolveConflict(path, 'working');
            });
        });
    }

    // Update unversioned list
    private updateUnversionedList(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const unversionedList = this.panel.querySelector('#unversioned-list');
        if (!unversionedList) return;

        const unversioned = statuses.filter(s => s.status === '?');

        console.log(`📄 Updating unversioned list with ${unversioned.length} files`);

        unversionedList.innerHTML = unversioned.map(status => {
            return `
                <div class="unversioned-item" data-path="${status.path}">
                    <span class="status-icon" style="color: #6c757d" title="Unversioned">●</span>
                    <span class="unversioned-path" title="${status.path}">${this.getFileName(status.path)}</span>
                    <div class="unversioned-actions">
                        <button class="icon-button" data-action="add" title="Add to SVN">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        unversionedList.querySelectorAll('.unversioned-item').forEach(item => {
            const path = item.getAttribute('data-path');
            if (!path) return;

            item.querySelector('[data-action="add"]')?.addEventListener('click', () => {
                console.log('➕ Adding file to SVN:', path);
                this.addFile(path);
            });
        });
    }

    // Handle commit
    private async handleCommit(): Promise<void> {
        console.log('💾 [1/5] Starting commit process...');
        
        const commitMessage = this.panel?.querySelector('#svn-commit-message') as HTMLTextAreaElement;
        if (!commitMessage) {
            console.error('❌ Commit message textarea not found');
            return;
        }

        const message = commitMessage.value.trim();
        console.log('💾 [2/5] Commit message:', message ? `"${message}"` : '(empty)');
        
        if (!message) {
            alert('Please enter a commit message');
            return;
        }

        const changes = svnManager.getAllChanges();
        console.log('💾 [3/5] Files to commit:', changes.length);
        
        if (changes.length === 0) {
            alert('No changes to commit');
            return;
        }

        try {
            console.log('💾 [4/5] Calling svnManager.commit...');
            const result = await svnManager.commit(message, []);
            console.log('💾 [5/5] ✅ Commit successful!');
            console.log('   Result:', result);
            
            alert('Committed successfully:\n' + result);
            commitMessage.value = '';
            this.refresh();
        } catch (error) {
            console.error('❌ Commit failed:', error);
            alert('Commit failed: ' + error);
        }
    }

    // Handle update
    private async handleUpdate(): Promise<void> {
        console.log('⬇️ [1/3] Starting update process...');
        
        try {
            console.log('⬇️ [2/3] Calling svnManager.update...');
            const result = await svnManager.update();
            console.log('⬇️ [3/3] ✅ Update successful!');
            console.log('   Result:', result);
            
            alert('Updated successfully:\n' + result);
            this.refresh();
        } catch (error) {
            console.error('❌ Update failed:', error);
            alert('Update failed: ' + error);
        }
    }

    // Show diff for file - ✅ FIXED TO USE NEW svnDiffViewer
    private async showDiff(filePath: string): Promise<void> {
        console.log('🔍 ========================================');
        console.log('🔍 [1/5] showDiff called');
        console.log('🔍    File path:', filePath);
        console.log('🔍    File name:', this.getFileName(filePath));
        
        try {
            console.log('🔍 [2/5] Calling svnDiffViewer.showDiff...');
            await svnDiffViewer.showDiff(filePath);  // ✅ FIXED: Use instance method
            
            console.log('🔍 [3/5] svnDiffViewer.showDiff returned successfully');
            console.log('🔍 [4/5] ✅ Diff viewer should now be visible!');
            console.log('🔍 ========================================');
        } catch (error) {
            console.error('❌ ========================================');
            console.error('❌ Error showing diff!');
            console.error('❌    File:', filePath);
            console.error('❌    Error:', error);
            console.error('❌    Error type:', typeof error);
            console.error('❌    Error message:', error instanceof Error ? error.message : String(error));
            console.error('❌    Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('❌ ========================================');
            
            alert('Failed to show diff: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    // Revert file
    private async revertFile(filePath: string): Promise<void> {
        console.log('🔄 [1/4] Revert file requested:', filePath);
        
        if (!confirm(`Are you sure you want to revert "${this.getFileName(filePath)}"?`)) {
            console.log('🔄 [2/4] User cancelled revert');
            return;
        }

        console.log('🔄 [2/4] User confirmed, reverting...');

        try {
            console.log('🔄 [3/4] Calling svnManager.revert...');
            await svnManager.revert([filePath]);
            console.log('🔄 [4/4] ✅ File reverted successfully');
            
            alert('File reverted successfully');
            this.refresh();
        } catch (error) {
            console.error('❌ Revert failed:', error);
            alert('Revert failed: ' + error);
        }
    }

    // Resolve conflict
    private async resolveConflict(filePath: string, resolution: string): Promise<void> {
        console.log('⚠️ Resolving conflict:', { path: filePath, resolution });
        
        try {
            await svnManager.resolve(filePath, resolution);
            console.log('✅ Conflict resolved successfully');
            alert('Conflict resolved');
            this.refresh();
        } catch (error) {
            console.error('❌ Resolve failed:', error);
            alert('Resolve failed: ' + error);
        }
    }

    // Add file to SVN
    private async addFile(filePath: string): Promise<void> {
        console.log('➕ Adding file to SVN:', filePath);
        
        try {
            await svnManager.add([filePath]);
            console.log('✅ File added to SVN successfully');
            alert('File added to SVN');
            this.refresh();
        } catch (error) {
            console.error('❌ Add failed:', error);
            alert('Add failed: ' + error);
        }
    }

    // Show more actions menu
    private showMoreMenu(event: Event): void {
        console.log('⚙️ Opening more actions menu');
        
        // Create context menu with more actions
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="log">View Log</div>
            <div class="menu-item" data-action="cleanup">Cleanup</div>
            <div class="menu-separator"></div>
            <div class="menu-item" data-action="tortoise-update">TortoiseSVN Update</div>
            <div class="menu-item" data-action="tortoise-commit">TortoiseSVN Commit</div>
            <div class="menu-item" data-action="tortoise-log">TortoiseSVN Log</div>
            <div class="menu-item" data-action="tortoise-repobrowser">Repository Browser</div>
        `;

        // Position menu
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '10000';

        document.body.appendChild(menu);

        // Add event listeners
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                console.log('⚙️ Menu action selected:', action);
                this.handleMoreAction(action);
                menu.remove();
            });
        });

        // Remove menu on click outside
        setTimeout(() => {
            document.addEventListener('click', () => {
                console.log('⚙️ Closing more actions menu');
                menu.remove();
            }, { once: true });
        }, 100);
    }

    // Handle more actions
    private async handleMoreAction(action: string | null): Promise<void> {
        if (!action) return;

        console.log('⚙️ Executing action:', action);

        try {
            switch (action) {
                case 'log':
                    await this.showLog();
                    break;
                case 'cleanup':
                    await this.cleanup();
                    break;
                case 'tortoise-update':
                    await svnManager.openTortoiseSVN('update');
                    break;
                case 'tortoise-commit':
                    await svnManager.openTortoiseSVN('commit');
                    break;
                case 'tortoise-log':
                    await svnManager.openTortoiseSVN('log');
                    break;
                case 'tortoise-repobrowser':
                    await svnManager.openTortoiseSVN('repobrowser');
                    break;
                default:
                    console.warn('⚠️ Unknown action:', action);
            }
        } catch (error) {
            console.error('❌ Action failed:', action, error);
            alert('Action failed: ' + error);
        }
    }

    // Show log
    private async showLog(): Promise<void> {
        console.log('📜 Fetching SVN log...');
        
        try {
            const entries = await svnManager.getLog();
            console.log('📜 Log entries:', entries);
            // TODO: Implement log viewer dialog
            alert('Log viewer coming soon!\nCheck console for log entries.');
        } catch (error) {
            console.error('❌ Failed to get log:', error);
            alert('Failed to get log: ' + error);
        }
    }

    // Cleanup
    private async cleanup(): Promise<void> {
        console.log('🧹 Running SVN cleanup...');
        
        try {
            const result = await svnManager.cleanup();
            console.log('✅ Cleanup successful:', result);
            alert(result);
            this.refresh();
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            alert('Cleanup failed: ' + error);
        }
    }

    // Toggle unversioned section
    private toggleUnversioned(): void {
        if (!this.panel) return;

        const unversionedList = this.panel.querySelector('#unversioned-list');
        const collapseIcon = this.panel.querySelector('#unversioned-header .collapse-icon');
        
        if (unversionedList && collapseIcon) {
            const isVisible = (unversionedList as HTMLElement).style.display !== 'none';
            (unversionedList as HTMLElement).style.display = isVisible ? 'none' : 'block';
            collapseIcon.textContent = isVisible ? '▶' : '▼';
            console.log(`📁 Unversioned section: ${isVisible ? 'collapsed' : 'expanded'}`);
        }
    }

    // Helper: Get file name from path
    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    // Helper: Truncate URL
    private truncateUrl(url: string, maxLength: number = 40): string {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    // Helper: Get branch from URL
    private getBranchFromUrl(url: string): string {
        const parts = url.split('/');
        const branchIndex = parts.findIndex(p => p === 'branches' || p === 'trunk' || p === 'tags');
        if (branchIndex >= 0 && branchIndex < parts.length - 1) {
            return parts[branchIndex] + '/' + parts[branchIndex + 1];
        }
        return 'trunk';
    }
}

// Export singleton instance
export const svnUI = SvnUI.getInstance();

// Expose to window for debugging
(window as any).svnUI = svnUI;

console.log('✅ svnUI module loaded and exported');
console.log('   - Class: SvnUI');
console.log('   - Instance: svnUI');
console.log('   - Window.svnUI:', typeof (window as any).svnUI);