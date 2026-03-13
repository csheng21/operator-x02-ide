// src/ide/svn/svnStatusBar.ts
// SVN Status Bar Integration

import { svnManager, SvnInfo } from './svnManager';
import { svnUI } from './svnUI';

export class SvnStatusBar {
    private static instance: SvnStatusBar;
    private statusBarElement: HTMLElement | null = null;
    private currentInfo: SvnInfo | null = null;

    private constructor() {}

    static getInstance(): SvnStatusBar {
        if (!SvnStatusBar.instance) {
            SvnStatusBar.instance = new SvnStatusBar();
        }
        return SvnStatusBar.instance;
    }

    // Initialize status bar
    initialize(): void {
        this.createStatusBarElement();
        this.setupListeners();
    }

    // Create status bar element
    private createStatusBarElement(): void {
        // Find the status bar
        const statusBar = document.querySelector('.status-bar, #status-bar');
        if (!statusBar) {
            console.warn('Status bar not found');
            return;
        }

        // Create SVN status bar section
        this.statusBarElement = document.createElement('div');
        this.statusBarElement.className = 'status-bar-svn';
        this.statusBarElement.style.display = 'none';
        this.statusBarElement.innerHTML = this.getStatusBarHTML();

        // Insert at the beginning of status bar
        statusBar.insertBefore(this.statusBarElement, statusBar.firstChild);

        // Add click handler to open SVN panel
        this.statusBarElement.addEventListener('click', () => {
            svnUI.toggle();
        });
    }

    // Get status bar HTML
    private getStatusBarHTML(): string {
        return `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
            </svg>
            <span class="svn-branch" id="svn-branch-name">-</span>
            <span class="svn-changes-indicator" id="svn-changes" style="display: none;">
                <span id="svn-changes-count">0</span>
            </span>
        `;
    }

    // Setup listeners
    private setupListeners(): void {
        // Subscribe to SVN status changes
        svnManager.onStatusChange(() => {
            this.updateStatusBar();
        });
    }

    // Update status bar with current SVN info
    async updateStatusBar(): Promise<void> {
        if (!this.statusBarElement) return;

        // Check if SVN is available
        const isSvnInstalled = svnManager.getSvnInstalled();
        if (!isSvnInstalled) {
            this.statusBarElement.style.display = 'none';
            return;
        }

        // Get repository info
        try {
            this.currentInfo = await svnManager.getInfo();
            
            if (this.currentInfo) {
                // Show status bar
                this.statusBarElement.style.display = 'flex';

                // Update branch name
                const branchName = this.getBranchFromUrl(this.currentInfo.url);
                const branchElement = this.statusBarElement.querySelector('#svn-branch-name');
                if (branchElement) {
                    branchElement.textContent = `${branchName} @ r${this.currentInfo.revision}`;
                }

                // Update changes indicator
                this.updateChangesIndicator();
            } else {
                // Not an SVN working copy
                this.statusBarElement.style.display = 'none';
            }
        } catch (error) {
            // Error getting SVN info
            this.statusBarElement.style.display = 'none';
        }
    }

    // Update changes indicator
    private updateChangesIndicator(): void {
        if (!this.statusBarElement) return;

        const changesCount = svnManager.getChangesCount();
        const conflictsCount = svnManager.getConflictsCount();

        const changesIndicator = this.statusBarElement.querySelector('#svn-changes') as HTMLElement;
        const changesCountEl = this.statusBarElement.querySelector('#svn-changes-count');

        if (changesCount > 0 || conflictsCount > 0) {
            // Show changes indicator
            if (changesIndicator) {
                changesIndicator.style.display = 'flex';

                // Change color if there are conflicts
                if (conflictsCount > 0) {
                    changesIndicator.classList.add('has-conflicts');
                    if (changesCountEl) {
                        changesCountEl.textContent = `${changesCount} (${conflictsCount} conflicts)`;
                    }
                } else {
                    changesIndicator.classList.remove('has-conflicts');
                    if (changesCountEl) {
                        changesCountEl.textContent = changesCount.toString();
                    }
                }
            }
        } else {
            // Hide changes indicator
            if (changesIndicator) {
                changesIndicator.style.display = 'none';
            }
        }
    }

    // Get branch name from URL
    private getBranchFromUrl(url: string): string {
        const parts = url.split('/');
        const branchIndex = parts.findIndex(p => p === 'branches' || p === 'trunk' || p === 'tags');
        
        if (branchIndex >= 0) {
            if (parts[branchIndex] === 'trunk') {
                return 'trunk';
            } else if (parts[branchIndex] === 'branches' && branchIndex < parts.length - 1) {
                return parts[branchIndex + 1];
            } else if (parts[branchIndex] === 'tags' && branchIndex < parts.length - 1) {
                return `tag:${parts[branchIndex + 1]}`;
            }
        }

        return 'main';
    }

    // Show status bar
    show(): void {
        if (this.statusBarElement) {
            this.statusBarElement.style.display = 'flex';
        }
    }

    // Hide status bar
    hide(): void {
        if (this.statusBarElement) {
            this.statusBarElement.style.display = 'none';
        }
    }
}

// Export singleton instance
export const svnStatusBar = SvnStatusBar.getInstance();
