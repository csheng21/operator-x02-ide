/**
 * 🎨 SVN DASHBOARD IMPLEMENTATION
 * Replaces empty "Select files to see changes" with useful repository overview
 */

import { svnManager, SvnFileStatus, SvnInfo, SvnLogEntry } from './svnManager';

export class SvnDashboard {
    private container: HTMLElement | null = null;
    private recentCommits: SvnLogEntry[] = [];
    private currentInfo: SvnInfo | null = null;
    private currentFiles: SvnFileStatus[] = [];

    constructor(container: HTMLElement) {
        this.container = container;
    }

    /**
     * Render the complete dashboard
     */
    async render(): Promise<void> {
        if (!this.container) return;

        // Fetch latest data
        await this.fetchData();

        // Render dashboard
        this.container.innerHTML = `
            <div class="svn-dashboard">
                ${this.renderStatsBar()}
                ${this.renderRecentActivity()}
                ${this.renderModifiedFiles()}
                ${this.renderQuickActions()}
            </div>
        `;

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Fetch dashboard data
     */
    private async fetchData(): Promise<void> {
        try {
            const path = svnManager.getCurrentPath();
            if (!path) return;

            // Fetch in parallel
            const [info, commits, files] = await Promise.all([
                svnManager.getInfo(path),
                svnManager.getLog(path, 5),
                svnManager.getStatus(path)
            ]);

            this.currentInfo = info;
            this.recentCommits = commits || [];
            this.currentFiles = files || [];
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
    }

    /**
     * Render stats bar with key metrics
     */
    private renderStatsBar(): string {
        const modifiedCount = this.currentFiles.filter(f => f.status === 'M').length;
        const addedCount = this.currentFiles.filter(f => f.status === 'A').length;
        const deletedCount = this.currentFiles.filter(f => f.status === 'D').length;
        const unversionedCount = this.currentFiles.filter(f => f.status === '?').length;
        
        const totalChanges = modifiedCount + addedCount + deletedCount;
        const hasChanges = totalChanges > 0;

        const branchName = this.getBranchName();
        const revision = this.currentInfo?.revision || '?';

        return `
            <div class="dashboard-stats-bar">
                <!-- Repository Info -->
                <div class="stat-group repo-info">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <div class="stat-label">Repository</div>
                        <div class="stat-value">${this.escapeHtml(branchName)} • r${revision}</div>
                    </div>
                </div>

                <!-- Status Indicator -->
                <div class="stat-group status-indicator">
                    <div class="stat-icon">${hasChanges ? '🔴' : '✅'}</div>
                    <div class="stat-content">
                        <div class="stat-label">Status</div>
                        <div class="stat-value">${hasChanges ? `${totalChanges} Changes` : 'Clean'}</div>
                    </div>
                </div>

                <!-- Modified Files -->
                ${modifiedCount > 0 ? `
                    <div class="stat-item stat-modified">
                        <div class="stat-icon">📝</div>
                        <div class="stat-content">
                            <div class="stat-value">${modifiedCount}</div>
                            <div class="stat-label">Modified</div>
                        </div>
                    </div>
                ` : ''}

                <!-- Added Files -->
                ${addedCount > 0 ? `
                    <div class="stat-item stat-added">
                        <div class="stat-icon">➕</div>
                        <div class="stat-content">
                            <div class="stat-value">${addedCount}</div>
                            <div class="stat-label">Added</div>
                        </div>
                    </div>
                ` : ''}

                <!-- Deleted Files -->
                ${deletedCount > 0 ? `
                    <div class="stat-item stat-deleted">
                        <div class="stat-icon">➖</div>
                        <div class="stat-content">
                            <div class="stat-value">${deletedCount}</div>
                            <div class="stat-label">Deleted</div>
                        </div>
                    </div>
                ` : ''}

                <!-- Unversioned Files -->
                ${unversionedCount > 0 ? `
                    <div class="stat-item stat-unversioned">
                        <div class="stat-icon">❓</div>
                        <div class="stat-content">
                            <div class="stat-value">${unversionedCount}</div>
                            <div class="stat-label">Unversioned</div>
                        </div>
                    </div>
                ` : ''}

                <!-- Last Commit Info -->
                ${this.recentCommits.length > 0 ? `
                    <div class="stat-group last-commit">
                        <div class="stat-icon">📌</div>
                        <div class="stat-content">
                            <div class="stat-label">Last Commit</div>
                            <div class="stat-value">${this.getRelativeTime(this.recentCommits[0].date)} by ${this.escapeHtml(this.recentCommits[0].author)}</div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render recent activity timeline
     */
    private renderRecentActivity(): string {
        if (this.recentCommits.length === 0) {
            return `
                <div class="dashboard-section">
                    <h3 class="section-title">🕐 Recent Activity</h3>
                    <div class="empty-state-small">
                        <div class="empty-icon">📜</div>
                        <div class="empty-text">No recent commits</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="dashboard-section recent-activity">
                <div class="section-header">
                    <h3 class="section-title">🕐 Recent Commits</h3>
                    <button class="view-all-btn" data-action="view-history">
                        View All →
                    </button>
                </div>
                <div class="commit-timeline">
                    ${this.recentCommits.map(commit => this.renderCommitCard(commit)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render individual commit card
     */
    private renderCommitCard(commit: SvnLogEntry): string {
        const relativeTime = this.getRelativeTime(commit.date);
        const fileCount = commit.paths?.length || 0;

        return `
            <div class="commit-card" data-revision="${commit.revision}">
                <div class="commit-header">
                    <span class="commit-rev">r${commit.revision}</span>
                    <span class="commit-dot">•</span>
                    <span class="commit-time">${relativeTime}</span>
                    <span class="commit-dot">•</span>
                    <span class="commit-author">${this.escapeHtml(commit.author)}</span>
                </div>
                <div class="commit-message">${this.escapeHtml(this.truncateText(commit.message, 80))}</div>
                ${fileCount > 0 ? `
                    <div class="commit-files">
                        ${commit.paths.slice(0, 3).map(path => 
                            `<span class="file-badge">${this.escapeHtml(this.getFileName(path))}</span>`
                        ).join('')}
                        ${fileCount > 3 ? `<span class="file-badge more">+${fileCount - 3} more</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render modified files preview
     */
    private renderModifiedFiles(): string {
        const modifiedFiles = this.currentFiles.filter(f => f.status !== '?' && f.status !== ' ');

        if (modifiedFiles.length === 0) {
            return `
                <div class="dashboard-section">
                    <h3 class="section-title">📝 Pending Changes</h3>
                    <div class="clean-state">
                        <div class="clean-icon">✨</div>
                        <div class="clean-title">Working Copy is Clean</div>
                        <div class="clean-subtitle">No pending changes detected</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="dashboard-section modified-files">
                <div class="section-header">
                    <h3 class="section-title">📝 Pending Changes (${modifiedFiles.length})</h3>
                    <button class="view-all-btn" data-action="view-commit">
                        View Details →
                    </button>
                </div>
                <div class="file-preview-grid">
                    ${modifiedFiles.slice(0, 6).map(file => this.renderFilePreviewCard(file)).join('')}
                    ${modifiedFiles.length > 6 ? `
                        <div class="file-card more-files" data-action="view-commit">
                            <div class="more-count">+${modifiedFiles.length - 6}</div>
                            <div class="more-text">more files</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render file preview card
     */
    private renderFilePreviewCard(file: SvnFileStatus): string {
        const statusIcon = this.getStatusIcon(file.status);
        const statusClass = this.getStatusClass(file.status);
        const fileName = this.getFileName(file.path);
        const fileIcon = this.getFileIcon(fileName);

        return `
            <div class="file-card ${statusClass}" data-path="${this.escapeHtml(file.path)}" data-action="view-diff">
                <div class="file-card-header">
                    <div class="file-status-badge">${statusIcon}</div>
                    <div class="file-icon">${fileIcon}</div>
                </div>
                <div class="file-card-body">
                    <div class="file-name" title="${this.escapeHtml(file.path)}">
                        ${this.escapeHtml(fileName)}
                    </div>
                    <div class="file-path">${this.escapeHtml(this.truncatePath(file.path))}</div>
                </div>
                <div class="file-card-actions">
                    <button class="mini-btn" data-action="view-diff" title="View Diff">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 1h13l.5.5v13l-.5.5h-13l-.5-.5v-13l.5-.5zM2 2v12h12V2H2z"/>
                        </svg>
                    </button>
                    <button class="mini-btn" data-action="revert" title="Revert">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1a7 7 0 0 1 7 7h-1.5A5.5 5.5 0 1 0 8 13.5V12l4 3-4 3v-1.5A7 7 0 0 1 8 1z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render quick actions panel
     */
    private renderQuickActions(): string {
        return `
            <div class="dashboard-section quick-actions">
                <h3 class="section-title">⚡ Quick Actions</h3>
                <div class="action-grid">
                    <button class="action-btn primary" data-action="update">
                        <div class="action-icon">🔄</div>
                        <div class="action-label">Update</div>
                        <div class="action-subtitle">Pull latest changes</div>
                    </button>
                    
                    <button class="action-btn" data-action="commit">
                        <div class="action-icon">📤</div>
                        <div class="action-label">Commit</div>
                        <div class="action-subtitle">Save changes</div>
                    </button>
                    
                    <button class="action-btn" data-action="cleanup">
                        <div class="action-icon">🧹</div>
                        <div class="action-label">Cleanup</div>
                        <div class="action-subtitle">Clean working copy</div>
                    </button>
                    
                    <button class="action-btn" data-action="history">
                        <div class="action-icon">📜</div>
                        <div class="action-label">History</div>
                        <div class="action-subtitle">View commit log</div>
                    </button>
                    
                    <button class="action-btn" data-action="search">
                        <div class="action-icon">🔍</div>
                        <div class="action-label">Search</div>
                        <div class="action-subtitle">Find in logs</div>
                    </button>
                    
                    <button class="action-btn" data-action="tortoise">
                        <div class="action-icon">🐢</div>
                        <div class="action-label">TortoiseSVN</div>
                        <div class="action-subtitle">Open external tool</div>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for dashboard interactions
     */
    private setupEventListeners(): void {
        if (!this.container) return;

        // Handle all click events with delegation
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const actionElement = target.closest('[data-action]') as HTMLElement;
            
            if (!actionElement) return;

            const action = actionElement.dataset.action;
            const path = actionElement.dataset.path;
            const revision = actionElement.dataset.revision;

            this.handleAction(action!, path, revision);
        });
    }

    /**
     * Handle dashboard actions
     */
    private handleAction(action: string, path?: string, revision?: string): void {
        console.log('Dashboard action:', action, path, revision);

        switch (action) {
            case 'view-diff':
                this.dispatchEvent('viewDiff', { path });
                break;
            case 'view-commit':
                this.dispatchEvent('switchTab', { tab: 'commit' });
                break;
            case 'view-history':
                this.dispatchEvent('switchTab', { tab: 'history' });
                break;
            case 'update':
                this.dispatchEvent('update', {});
                break;
            case 'commit':
                this.dispatchEvent('switchTab', { tab: 'commit' });
                break;
            case 'cleanup':
                this.dispatchEvent('cleanup', {});
                break;
            case 'history':
                this.dispatchEvent('switchTab', { tab: 'history' });
                break;
            case 'revert':
                this.dispatchEvent('revert', { path });
                break;
            case 'tortoise':
                this.dispatchEvent('openTortoise', {});
                break;
            default:
                console.warn('Unknown dashboard action:', action);
        }
    }

    /**
     * Dispatch custom event
     */
    private dispatchEvent(type: string, detail: any): void {
        const event = new CustomEvent('dashboard-action', {
            detail: { type, ...detail },
            bubbles: true
        });
        this.container?.dispatchEvent(event);
    }

    // Helper methods
    private getBranchName(): string {
        if (!this.currentInfo) return 'Unknown';
        
        const url = this.currentInfo.url;
        const parts = url.split('/');
        
        // Try to extract branch name from URL
        const branchIndex = parts.indexOf('branches');
        if (branchIndex !== -1 && parts.length > branchIndex + 1) {
            return parts[branchIndex + 1];
        }
        
        // Check if it's trunk
        if (url.includes('/trunk')) {
            return 'trunk';
        }
        
        // Check if it's a tag
        const tagIndex = parts.indexOf('tags');
        if (tagIndex !== -1 && parts.length > tagIndex + 1) {
            return `tag: ${parts[tagIndex + 1]}`;
        }
        
        return 'main';
    }

    private getRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    private truncatePath(path: string): string {
        const parts = path.split(/[/\\]/);
        if (parts.length <= 2) return path;
        return '...' + parts.slice(-2).join('/');
    }

    private getFileName(path: string): string {
        return path.split(/[/\\]/).pop() || path;
    }

    private getFileIcon(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const iconMap: Record<string, string> = {
            'ts': '📘', 'tsx': '📘',
            'js': '📒', 'jsx': '📒',
            'css': '🎨', 'scss': '🎨',
            'html': '🌐',
            'json': '📋',
            'md': '📝',
            'png': '🖼️', 'jpg': '🖼️', 'svg': '🖼️',
            'rs': '🦀',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️', 'c': '⚙️',
        };
        return iconMap[ext || ''] || '📄';
    }

    private getStatusIcon(status: string): string {
        const iconMap: Record<string, string> = {
            'M': '●', 'A': '+', 'D': '−', 
            'C': '!', '?': '?', '!': '⚠'
        };
        return iconMap[status] || '•';
    }

    private getStatusClass(status: string): string {
        const classMap: Record<string, string> = {
            'M': 'modified',
            'A': 'added',
            'D': 'deleted',
            'C': 'conflicted',
            '?': 'unversioned'
        };
        return classMap[status] || '';
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}