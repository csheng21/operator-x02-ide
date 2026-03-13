// src/ide/svn/svnUI.ts
// SVN Source Control Panel UI

import { svnManager, SvnFileStatus } from './svnManager';
import { showSvnDiffViewer } from './svnDiffViewer';

export class SvnUI {
    private static instance: SvnUI;
    private panel: HTMLElement | null = null;
    private isVisible: boolean = false;

    private constructor() {}

    static getInstance(): SvnUI {
        if (!SvnUI.instance) {
            SvnUI.instance = new SvnUI();
        }
        return SvnUI.instance;
    }

    // Initialize SVN panel
    async initialize(): Promise<void> {
        // Check if SVN is installed
        const isInstalled = await svnManager.checkSvnInstalled();
        if (!isInstalled) {
            console.warn('SVN is not installed. SVN features will be disabled.');
            return;
        }

        this.createPanel();
        this.setupEventListeners();
        
        // Subscribe to status changes
        svnManager.onStatusChange((statuses) => {
            this.updateChangesUI(statuses);
        });
    }

    // Create SVN panel
    private createPanel(): void {
        // Find or create the SVN tab button in the left sidebar
        const leftSidebar = document.querySelector('.files-panel') || document.querySelector('.sidebar-left');
        if (!leftSidebar) {
            console.error('Could not find left sidebar');
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
        svnTab.addEventListener('click', () => this.toggle());
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

                <!-- Commit Message -->
                <div class="svn-commit-section">
                    <textarea 
                        id="svn-commit-message" 
                        class="commit-message" 
                        placeholder="Commit message (Ctrl+Enter to commit)"
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
                                <path d="M8 15A7 7 0 1 1 8 1v1a6 6 0 1 0 0 12v1z"/>
                                <path d="M8 4v5.5l4 2.25"/>
                            </svg>
                            Update
                        </button>
                    </div>
                </div>

                <!-- Changes List -->
                <div class="svn-changes" id="svn-changes">
                    <div class="changes-header">
                        <span class="changes-title">Changes</span>
                        <span class="changes-count" id="changes-count">0</span>
                    </div>
                    <div class="changes-list" id="changes-list">
                        <div class="empty-state">No changes</div>
                    </div>
                </div>

                <!-- Conflicts (shown when there are conflicts) -->
                <div class="svn-conflicts" id="svn-conflicts" style="display: none;">
                    <div class="conflicts-header">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        <span class="conflicts-title">Conflicts</span>
                        <span class="conflicts-count" id="conflicts-count">0</span>
                    </div>
                    <div class="conflicts-list" id="conflicts-list"></div>
                </div>

                <!-- Unversioned Files -->
                <div class="svn-unversioned" id="svn-unversioned" style="display: none;">
                    <div class="unversioned-header" id="unversioned-header">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
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
        if (!this.panel) return;

        // Refresh button
        const refreshBtn = this.panel.querySelector('#svn-refresh');
        refreshBtn?.addEventListener('click', () => this.refresh());

        // More actions menu
        const moreBtn = this.panel.querySelector('#svn-more');
        moreBtn?.addEventListener('click', (e) => this.showMoreMenu(e));

        // Commit button
        const commitBtn = this.panel.querySelector('#svn-commit-btn');
        commitBtn?.addEventListener('click', () => this.handleCommit());

        // Update button
        const updateBtn = this.panel.querySelector('#svn-update-btn');
        updateBtn?.addEventListener('click', () => this.handleUpdate());

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
                this.handleCommit();
            }
        });

        // Unversioned collapse toggle
        const unversionedHeader = this.panel.querySelector('#unversioned-header');
        unversionedHeader?.addEventListener('click', () => this.toggleUnversioned());
    }

    // Toggle panel visibility
    toggle(): void {
        this.isVisible = !this.isVisible;
        if (this.panel) {
            this.panel.style.display = this.isVisible ? 'block' : 'none';
        }

        if (this.isVisible) {
            this.refresh();
        }
    }

    // Show panel
    show(): void {
        this.isVisible = true;
        if (this.panel) {
            this.panel.style.display = 'block';
        }
        this.refresh();
    }

    // Hide panel
    hide(): void {
        this.isVisible = false;
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    // Refresh SVN status
    async refresh(): Promise<void> {
        if (!this.panel) return;

        const refreshBtn = this.panel.querySelector('#svn-refresh');
        refreshBtn?.classList.add('spinning');

        try {
            // Get repository info
            const info = await svnManager.getInfo();
            this.updateInfoUI(info);

            // Get status
            await svnManager.refreshStatus();
        } catch (error) {
            console.error('Error refreshing SVN status:', error);
        } finally {
            refreshBtn?.classList.remove('spinning');
        }
    }

    // Update repository info UI
    private updateInfoUI(info: any): void {
        if (!this.panel) return;

        const infoContainer = this.panel.querySelector('#svn-info');
        if (!infoContainer) return;

        if (info) {
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

    // Update changes list
    private updateChangesList(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const changesList = this.panel.querySelector('#changes-list');
        if (!changesList) return;

        const changes = statuses.filter(s => s.status !== ' ' && s.status !== '?' && s.status !== 'C');

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
                                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                            </svg>
                        </button>
                        <button class="icon-button" data-action="revert" title="Revert">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to action buttons
        changesList.querySelectorAll('.change-item').forEach(item => {
            const path = item.getAttribute('data-path');
            if (!path) return;

            item.querySelector('[data-action="diff"]')?.addEventListener('click', () => {
                this.showDiff(path);
            });

            item.querySelector('[data-action="revert"]')?.addEventListener('click', () => {
                this.revertFile(path);
            });
        });
    }

    // Update conflicts list
    private updateConflictsList(statuses: SvnFileStatus[]): void {
        if (!this.panel) return;

        const conflictsList = this.panel.querySelector('#conflicts-list');
        if (!conflictsList) return;

        const conflicts = statuses.filter(s => s.status === 'C');

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
                this.resolveConflict(path, 'mine-full');
            });

            item.querySelector('[data-action="resolve-theirs"]')?.addEventListener('click', () => {
                this.resolveConflict(path, 'theirs-full');
            });

            item.querySelector('[data-action="resolve-manual"]')?.addEventListener('click', () => {
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
                this.addFile(path);
            });
        });
    }

    // Handle commit
    private async handleCommit(): Promise<void> {
        const commitMessage = this.panel?.querySelector('#svn-commit-message') as HTMLTextAreaElement;
        if (!commitMessage) return;

        const message = commitMessage.value.trim();
        if (!message) {
            alert('Please enter a commit message');
            return;
        }

        const changes = svnManager.getAllChanges();
        if (changes.length === 0) {
            alert('No changes to commit');
            return;
        }

        try {
            const result = await svnManager.commit(message, []);
            alert('Committed successfully:\n' + result);
            commitMessage.value = '';
            this.refresh();
        } catch (error) {
            alert('Commit failed: ' + error);
        }
    }

    // Handle update
    private async handleUpdate(): Promise<void> {
        try {
            const result = await svnManager.update();
            alert('Updated successfully:\n' + result);
            this.refresh();
        } catch (error) {
            alert('Update failed: ' + error);
        }
    }

    // Show diff for file
    private async showDiff(filePath: string): Promise<void> {
        try {
            showSvnDiffViewer(filePath);
        } catch (error) {
            alert('Failed to show diff: ' + error);
        }
    }

    // Revert file
    private async revertFile(filePath: string): Promise<void> {
        if (!confirm(`Are you sure you want to revert "${this.getFileName(filePath)}"?`)) {
            return;
        }

        try {
            await svnManager.revert([filePath]);
            alert('File reverted successfully');
            this.refresh();
        } catch (error) {
            alert('Revert failed: ' + error);
        }
    }

    // Resolve conflict
    private async resolveConflict(filePath: string, resolution: string): Promise<void> {
        try {
            await svnManager.resolve(filePath, resolution);
            alert('Conflict resolved');
            this.refresh();
        } catch (error) {
            alert('Resolve failed: ' + error);
        }
    }

    // Add file to SVN
    private async addFile(filePath: string): Promise<void> {
        try {
            await svnManager.add([filePath]);
            alert('File added to SVN');
            this.refresh();
        } catch (error) {
            alert('Add failed: ' + error);
        }
    }

    // Show more actions menu
    private showMoreMenu(event: Event): void {
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
                this.handleMoreAction(action);
                menu.remove();
            });
        });

        // Remove menu on click outside
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    // Handle more actions
    private async handleMoreAction(action: string | null): Promise<void> {
        if (!action) return;

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
            }
        } catch (error) {
            alert('Action failed: ' + error);
        }
    }

    // Show log
    private async showLog(): Promise<void> {
        const entries = await svnManager.getLog();
        // TODO: Implement log viewer dialog
        console.log('Log entries:', entries);
        alert('Log viewer coming soon!\nCheck console for log entries.');
    }

    // Cleanup
    private async cleanup(): Promise<void> {
        try {
            const result = await svnManager.cleanup();
            alert(result);
            this.refresh();
        } catch (error) {
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
