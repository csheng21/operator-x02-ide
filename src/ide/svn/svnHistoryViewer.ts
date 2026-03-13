/**
 * 📜 SVN History Viewer UI Component
 * Visual interface for viewing commit history with AI-powered analysis
 * 🎨 Beautiful modern UI with syntax highlighting
 * 🤖 AI features: Explain, Review, Find Issues, Generate Tests
 */

import { svnHistoryManager, SvnLogEntry } from './svnHistoryManager';
import { callGenericAPI, getCurrentApiConfigurationForced } from '../aiAssistant/apiProviderManager';

export class SvnHistoryViewer {
    private static instance: SvnHistoryViewer;
    private panel: HTMLElement | null = null;
    private entries: SvnLogEntry[] = [];
    private filteredEntries: SvnLogEntry[] = [];
    private searchQuery: string = '';
    private currentLimit: number = 50;
    private isLoading: boolean = false;

    private constructor() {}

    static getInstance(): SvnHistoryViewer {
        if (!SvnHistoryViewer.instance) {
            SvnHistoryViewer.instance = new SvnHistoryViewer();
        }
        return SvnHistoryViewer.instance;
    }

    /**
     * Initialize history viewer
     */
    async initialize(): Promise<void> {
        console.log('📜 Initializing SVN History Viewer');
        
        try {
            const { svnManager } = await import('./svnManager');
            const svnPath = svnManager.currentPath || 
                           localStorage.getItem('currentProjectPath') || 
                           '';
            
            if (svnPath) {
                console.log('📂 Setting history path to:', svnPath);
                svnHistoryManager.setCurrentPath(svnPath);
            } else {
                console.warn('⚠️ No SVN path found');
            }
        } catch (error) {
            console.error('❌ Failed to set history path:', error);
        }
        
        this.createPanel();
        await this.loadHistory();
    }

    /**
     * Create history viewer panel
     */
    private createPanel(): void {
        const existing = document.getElementById('svn-history-panel');
        if (existing) existing.remove();

        this.panel = document.createElement('div');
        this.panel.id = 'svn-history-panel';
        this.panel.className = 'svn-history-panel';

        this.panel.innerHTML = `
            <div class="history-header">
                <div class="history-title">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>
                    <h3>Commit History</h3>
                    <span class="history-count" id="history-count">0</span>
                </div>
                <button class="history-close-btn" id="history-close-btn" title="Close">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>

            <div class="history-search">
                <div class="search-input-wrapper">
                    <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                    <input 
                        type="text" 
                        id="history-search-input" 
                        class="search-input" 
                        placeholder="Search commits, authors..."
                    />
                    <button class="search-clear-btn" id="search-clear-btn" style="display: none;">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="history-content" id="history-content">
                <div class="history-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading commit history...</p>
                </div>
            </div>

            <div class="history-footer" style="display: none;">
                <button class="load-more-btn" id="load-more-btn">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                    </svg>
                    Load More Commits
                </button>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.attachPanelListeners();
        this.addStyles();
    }

    /**
     * Attach event listeners to panel elements
     */
    private attachPanelListeners(): void {
        const closeBtn = document.getElementById('history-close-btn');
        const searchInput = document.getElementById('history-search-input') as HTMLInputElement;
        const clearBtn = document.getElementById('search-clear-btn');
        const loadMoreBtn = document.getElementById('load-more-btn');

        closeBtn?.addEventListener('click', () => this.close());
        
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = (e.target as HTMLInputElement).value;
            this.filterEntries();
            
            if (clearBtn) {
                clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
            }
        });

        clearBtn?.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                this.searchQuery = '';
                this.filterEntries();
                clearBtn.style.display = 'none';
                searchInput.focus();
            }
        });

        loadMoreBtn?.addEventListener('click', () => this.loadMore());
    }

    /**
     * Load commit history
     */
    async loadHistory(): Promise<void> {
        if (this.isLoading) return;

        this.isLoading = true;
        const content = document.getElementById('history-content');
        if (!content) return;

        try {
            content.innerHTML = `
                <div class="history-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading commit history...</p>
                </div>
            `;

            console.log('🗑️ Clearing history cache to fetch fresh data');
            svnHistoryManager.clearCache();

            this.entries = await svnHistoryManager.getLog(this.currentLimit);
            this.filteredEntries = [...this.entries];
            
            console.log(`📊 Loaded ${this.entries.length} entries to display`);
            
            this.renderEntries();
            this.updateCount();

            const loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn && this.entries.length >= this.currentLimit) {
                loadMoreBtn.parentElement!.style.display = 'flex';
            }

        } catch (error) {
            content.innerHTML = `
                <div class="history-error">
                    <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                    <p>Failed to load commit history</p>
                    <span>${error}</span>
                    <button class="retry-btn" onclick="svnHistoryViewer.loadHistory()">Retry</button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load more commits
     */
    async loadMore(): Promise<void> {
        this.currentLimit += 50;
        await this.loadHistory();
    }

    /**
     * Filter entries based on search query
     */
    private filterEntries(): void {
        if (!this.searchQuery) {
            this.filteredEntries = [...this.entries];
        } else {
            const query = this.searchQuery.toLowerCase();
            this.filteredEntries = this.entries.filter(entry => {
                const searchText = `${entry.message} ${entry.author} ${entry.revision}`.toLowerCase();
                return searchText.includes(query);
            });
        }

        this.renderEntries();
        this.updateCount();
    }

    /**
     * Render commit entries
     */
    private renderEntries(): void {
        const content = document.getElementById('history-content');
        if (!content) return;

        if (this.filteredEntries.length === 0) {
            content.innerHTML = `
                <div class="history-empty">
                    <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" opacity="0.3">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                    </svg>
                    <p>No commits found</p>
                    ${this.searchQuery ? '<span>Try a different search</span>' : ''}
                </div>
            `;
            return;
        }

        content.innerHTML = this.filteredEntries.map(entry => this.renderEntry(entry)).join('');
        this.attachActionListeners();
    }

    /**
     * Render single commit entry
     */
    private renderEntry(entry: SvnLogEntry): string {
        const date = svnHistoryManager.formatDate(entry.date);
        
        const revisionStr = entry.revision.toString();
        const cleanRevision = revisionStr.startsWith('r') 
            ? revisionStr.substring(1) 
            : revisionStr;
        
        const paths = (entry as any).changedPaths || (entry as any).paths || [];
        const changedCount = Array.isArray(paths) ? paths.length : 0;
        
        return `
            <div class="history-entry" data-revision="${cleanRevision}">
                <div class="entry-header">
                    <div class="entry-meta">
                        <span class="entry-revision">${revisionStr}</span>
                        <span class="entry-separator">•</span>
                        <span class="entry-author">${this.escapeHtml(entry.author)}</span>
                        <span class="entry-separator">•</span>
                        <span class="entry-date">${date}</span>
                    </div>
                    <button class="entry-menu-btn" data-revision="${cleanRevision}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                        </svg>
                    </button>
                </div>

                <div class="entry-message">${this.escapeHtml(entry.message) || '<em>No commit message</em>'}</div>

                <div class="entry-stats">
                    <span class="stat-item">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                        </svg>
                        ${changedCount} file${changedCount !== 1 ? 's' : ''}
                    </span>
                </div>

                <div class="entry-files collapsed" id="files-${cleanRevision}">
                    ${this.renderChangedFiles(paths)}
                </div>

                <div class="entry-actions">
                    <button class="action-btn" data-action="toggle-files" data-revision="${cleanRevision}" title="Show changed files">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 1.5A.5.5 0 0 1 2 1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 1 6.586V2a.5.5 0 0 1 .5-.5zM2 2v4.586l7 7L13.586 9l-7-7H2z"/>
                        </svg>
                        <span>Files</span>
                    </button>
                    <button class="action-btn" data-action="view-diff" data-revision="${cleanRevision}" title="View diff">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.5 9a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 6a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
                        </svg>
                        <span>Diff</span>
                    </button>
                    <button class="action-btn action-danger" data-action="revert" data-revision="${cleanRevision}" title="Revert to this revision">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                        <span>Revert</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render changed files list
     */
    private renderChangedFiles(paths: any[]): string {
        if (!paths || paths.length === 0) {
            return '<p class="no-files">No files changed</p>';
        }

        return `
            <div class="changed-files-list">
                ${paths.map(path => {
                    const pathStr = typeof path === 'string' ? path : (path.path || path);
                    const action = typeof path === 'object' && path.action ? path.action : 'M';
                    
                    const icon = svnHistoryManager.getActionIcon(action);
                    const color = svnHistoryManager.getActionColor(action);
                    
                    return `
                        <div class="changed-file-item">
                            <span class="file-action" style="color: ${color}">${icon}</span>
                            <span class="file-path">${this.escapeHtml(pathStr)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Attach event listeners to action buttons
     */
    private attachActionListeners(): void {
        console.log('🔗 Attaching action listeners to buttons');
        
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const button = e.currentTarget as HTMLElement;
                const action = button.getAttribute('data-action');
                const revisionStr = button.getAttribute('data-revision') || '';
                
                console.log('🖱️ Button clicked:', { action, revisionStr });
                
                if (!action || !revisionStr) {
                    console.warn('⚠️ Missing action or revision:', { action, revisionStr });
                    return;
                }

                const revision = revisionStr.startsWith('r') 
                    ? parseInt(revisionStr.substring(1)) 
                    : parseInt(revisionStr);
                
                console.log('📊 Parsed revision:', revision);
                
                if (isNaN(revision)) {
                    console.error('❌ Invalid revision number:', revisionStr);
                    return;
                }

                try {
                    switch (action) {
                        case 'toggle-files':
                            console.log('📁 Toggling files for r' + revision);
                            this.toggleFiles(revision);
                            break;
                        case 'view-diff':
                            console.log('🔄 Viewing diff for r' + revision);
                            await this.viewDiff(revision);
                            break;
                        case 'revert':
                            console.log('⏮️ Reverting to r' + revision);
                            await this.revertToRevision(revision);
                            break;
                        default:
                            console.warn('⚠️ Unknown action:', action);
                    }
                } catch (error) {
                    console.error('❌ Action failed:', error);
                    alert('Action failed: ' + error);
                }
            });
        });
        
        console.log('✅ Attached listeners to', document.querySelectorAll('.action-btn').length, 'buttons');
    }

    /**
     * Toggle files visibility
     */
    private toggleFiles(revision: number): void {
        console.log('📁 toggleFiles called for revision:', revision);
        const filesDiv = document.getElementById(`files-${revision}`);
        console.log('📁 Files div found:', filesDiv ? 'yes' : 'no');
        
        if (filesDiv) {
            filesDiv.classList.toggle('collapsed');
            console.log('✅ Toggled collapsed class. Is collapsed now?', filesDiv.classList.contains('collapsed'));
        } else {
            console.error('❌ Could not find files div with id: files-' + revision);
        }
    }

    /**
     * View diff for revision
     */
    private async viewDiff(revision: number): Promise<void> {
        try {
            console.log('🔄 Getting diff for revision:', revision);
            
            // Get the entry to access commit date
            const entry = this.entries.find(e => {
                const rev = e.revision.toString().replace('r', '');
                return parseInt(rev) === revision;
            });
            
            const diff = await svnHistoryManager.getRevisionDiff(revision);
            
            if (!diff || diff.length === 0) {
                alert('No changes found for this revision');
                return;
            }
            
            this.showDiffModal(revision, diff, entry?.date);

        } catch (error) {
            console.error('❌ Failed to view diff:', error);
            alert('Failed to view diff: ' + error);
        }
    }

    /**
     * Show beautiful diff modal with AI features
     */
    private showDiffModal(revision: number, diffContent: string, commitDate?: string): void {
        const existingModal = document.getElementById('diff-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'diff-modal';
        modal.className = 'diff-modal';
        
        const stats = this.parseDiffStats(diffContent);
        
        modal.innerHTML = `
            <div class="diff-modal-overlay"></div>
            <div class="diff-modal-content">
                <!-- Modern Header -->
                <div class="diff-header">
                    <div class="diff-title-section">
                        <div class="diff-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M2.5 9a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 6a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
                            </svg>
                        </div>
                        <div class="diff-title-text">
                            <h3>Revision r${revision}</h3>
                            <span class="diff-subtitle">${stats.filesChanged} file${stats.filesChanged !== 1 ? 's' : ''} • ${stats.additions} additions • ${stats.deletions} deletions</span>
                        </div>
                    </div>
                    
                    <button class="diff-close-btn" id="close-diff-modal">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Metadata Bar (Commit Info!) -->
                <div class="diff-metadata-bar">
                    <div class="metadata-item">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                        </svg>
                        <span>${this.formatCommitDate(commitDate)}</span>
                    </div>
                    <div class="metadata-item">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                        </svg>
                        <span>${this.formatCommitTime(commitDate)}</span>
                    </div>
                    <div class="metadata-item">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"/>
                        </svg>
                        <span class="diff-stats-inline">
                            <span class="stat-add">+${stats.additions}</span>
                            <span class="stat-del">-${stats.deletions}</span>
                            <span class="stat-total">${stats.additions + stats.deletions} lines</span>
                        </span>
                    </div>
                </div>
                
                <!-- Stats Bar with Visual Graph -->
                <div class="diff-stats-bar">
                    <div class="stats-visual">
                        <div class="stat-graph">
                            <div class="graph-bar graph-additions" style="width: ${this.calculatePercentage(stats.additions, stats.additions + stats.deletions)}%"></div>
                            <div class="graph-bar graph-deletions" style="width: ${this.calculatePercentage(stats.deletions, stats.additions + stats.deletions)}%"></div>
                        </div>
                    </div>
                    <div class="stats-badges">
                        <span class="stat-badge stat-added">
                            <span class="badge-icon">+</span>
                            <span class="badge-count">${stats.additions}</span>
                        </span>
                        <span class="stat-badge stat-removed">
                            <span class="badge-icon">−</span>
                            <span class="badge-count">${stats.deletions}</span>
                        </span>
                    </div>
                </div>
                
                <!-- AI Toolbar -->
                <div class="diff-ai-toolbar">
                    <div class="toolbar-section">
                        <button class="ai-btn" id="ai-explain-changes" data-feature="explain">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                            </svg>
                            <span>Explain Changes</span>
                        </button>
                        
                        <button class="ai-btn" id="ai-review-code" data-feature="review">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
                            </svg>
                            <span>AI Review</span>
                        </button>
                        
                        <button class="ai-btn" id="ai-find-issues" data-feature="issues">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                            </svg>
                            <span>Find Issues</span>
                        </button>
                        
                        <button class="ai-btn" id="ai-generate-tests" data-feature="tests">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                            </svg>
                            <span>Suggest Tests</span>
                        </button>
                    </div>
                    
                    <div class="toolbar-section">
                        <button class="view-toggle-btn active" data-view="enhanced">Enhanced</button>
                        <button class="view-toggle-btn" data-view="unified">Unified</button>
                    </div>
                </div>
                
                <!-- AI Panel (Initially Hidden) -->
                <div class="diff-ai-panel" id="ai-panel" style="display: none;">
                    <div class="ai-panel-header">
                        <div class="ai-panel-title">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
                            </svg>
                            <span id="ai-panel-title-text">AI Analysis</span>
                        </div>
                        <button class="ai-panel-close" id="close-ai-panel">✕</button>
                    </div>
                    <div class="ai-panel-content" id="ai-panel-content">
                        <div class="ai-loading">
                            <div class="loading-spinner"></div>
                            <span>AI is analyzing...</span>
                        </div>
                    </div>
                </div>
                
                <!-- Diff Content -->
                <div class="diff-body-wrapper">
                    <div class="diff-body" id="diff-content">
                        ${this.formatDiffEnhanced(diffContent)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addModernDiffStyles();
        this.setupDiffModalHandlers(modal, revision, diffContent);
    }

    /**
     * Setup diff modal event handlers
     */
    private setupDiffModalHandlers(modal: HTMLElement, revision: number, diffContent: string): void {
        const closeBtn = modal.querySelector('#close-diff-modal');
        const overlay = modal.querySelector('.diff-modal-overlay');
        const closeDiff = () => modal.remove();
        
        closeBtn?.addEventListener('click', closeDiff);
        overlay?.addEventListener('click', closeDiff);
        
        // View toggles
        const viewToggles = modal.querySelectorAll('.view-toggle-btn');
        viewToggles.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                viewToggles.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const diffBody = modal.querySelector('#diff-content');
                if (diffBody && view) {
                    if (view === 'enhanced') {
                        diffBody.innerHTML = this.formatDiffEnhanced(diffContent);
                    } else {
                        diffBody.innerHTML = this.formatDiffUnified(diffContent);
                    }
                }
            });
        });
        
        // AI button handlers
        this.setupAIHandlers(modal, revision, diffContent);
        
        // Keyboard shortcuts
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeDiff();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Format commit date for metadata display
     */
    private formatCommitDate(commitDate?: string): string {
        if (!commitDate) {
            return new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
        
        try {
            // SVN date format: "2024-11-13 20:52:18 +0800"
            const date = new Date(commitDate);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        } catch {
            return commitDate.split(' ')[0] || 'Unknown date';
        }
    }

    /**
     * Format commit time for metadata display
     */
    private formatCommitTime(commitDate?: string): string {
        if (!commitDate) {
            return new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        try {
            // SVN date format: "2024-11-13 20:52:18 +0800"
            const date = new Date(commitDate);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            const timePart = commitDate.split(' ')[1];
            if (timePart) {
                const [hour, minute] = timePart.split(':');
                return `${hour}:${minute}`;
            }
            return 'Unknown time';
        }
    }

    /**
     * Setup AI feature handlers
     */
    private setupAIHandlers(modal: HTMLElement, revision: number, diffContent: string): void {
        const buttons = modal.querySelectorAll('.ai-btn');
        
        // Function to set active button
        const setActiveButton = (activeButton: HTMLElement | null) => {
            buttons.forEach(btn => btn.classList.remove('active'));
            if (activeButton) {
                activeButton.classList.add('active');
            }
        };
        
        // Explain Changes
        modal.querySelector('#ai-explain-changes')?.addEventListener('click', async (e) => {
            const button = e.currentTarget as HTMLElement;
            setActiveButton(button);
            await this.aiExplainChanges(diffContent);
        });
        
        // AI Review
        modal.querySelector('#ai-review-code')?.addEventListener('click', async (e) => {
            const button = e.currentTarget as HTMLElement;
            setActiveButton(button);
            await this.aiReviewCode(diffContent);
        });
        
        // Find Issues
        modal.querySelector('#ai-find-issues')?.addEventListener('click', async (e) => {
            const button = e.currentTarget as HTMLElement;
            setActiveButton(button);
            await this.aiFindIssues(diffContent);
        });
        
        // Generate Tests
        modal.querySelector('#ai-generate-tests')?.addEventListener('click', async (e) => {
            const button = e.currentTarget as HTMLElement;
            setActiveButton(button);
            await this.aiGenerateTests(diffContent);
        });
        
        // Close AI panel - clear active state
        modal.querySelector('#close-ai-panel')?.addEventListener('click', () => {
            const panel = modal.querySelector('#ai-panel') as HTMLElement;
            if (panel) {
                panel.style.display = 'none';
                setActiveButton(null); // Clear active state
            }
        });
    }

    /**
     * AI Feature 1: Explain Changes - ENHANCED
     */
    private async aiExplainChanges(diffContent: string): Promise<void> {
        this.showAIPanel('Analyzing Changes...');
        
        try {
            const prompt = `You are a senior code reviewer. Analyze this diff and provide a concise, professional explanation.

\`\`\`diff
${diffContent}
\`\`\`

Provide a structured response:

## Summary
[One clear sentence describing the overall change]

## Key Changes
[3-5 bullet points of the most important modifications]

## Impact
[Brief assessment of what this changes and why it matters]

Keep it concise and actionable. Use professional tone.`;

            const response = await this.callAI(prompt);
            this.showAIPanelContent('Code Changes Explained', response);
            
        } catch (error) {
            this.showAIPanelError('Failed to explain changes: ' + error);
        }
    }

    /**
     * AI Feature 2: Code Review - ENHANCED
     */
    private async aiReviewCode(diffContent: string): Promise<void> {
        this.showAIPanel('Reviewing Code...');
        
        try {
            const prompt = `You are a senior software engineer conducting a code review. Analyze this diff professionally.

\`\`\`diff
${diffContent}
\`\`\`

Provide a structured review:

## Code Quality: [Rating: ⭐⭐⭐⭐⭐]
[Brief assessment]

## Strengths
- [What was done well]
- [Good practices observed]

## Concerns
- [Issues found, if any]
- [Potential problems]

## Recommendations
- [Specific, actionable suggestions]
- [Best practices to consider]

## Security & Performance
[Any concerns or notes, or "No issues detected"]

Be concise, specific, and constructive. Focus on the most impactful feedback.`;

            const response = await this.callAI(prompt);
            this.showAIPanelContent('Code Review', response);
            
        } catch (error) {
            this.showAIPanelError('Failed to review code: ' + error);
        }
    }

    /**
     * AI Feature 3: Find Issues - ENHANCED
     */
    private async aiFindIssues(diffContent: string): Promise<void> {
        this.showAIPanel('Scanning for Issues...');
        
        try {
            const prompt = `You are a security and quality auditor. Analyze this diff for potential issues.

\`\`\`diff
${diffContent}
\`\`\`

Categorize any findings:

## 🔴 Critical Issues
[High-priority problems that must be fixed]

## 🟡 Warnings
[Medium-priority concerns to address]

## 🔵 Suggestions
[Low-priority improvements]

For each issue:
- **Description**: [What's wrong]
- **Impact**: [Why it matters]
- **Fix**: [How to resolve it]

If no issues found, state: "✅ No significant issues detected. Code looks good!"

Be specific and actionable.`;

            const response = await this.callAI(prompt);
            this.showAIPanelContent('Issue Analysis', response);
            
        } catch (error) {
            this.showAIPanelError('Failed to find issues: ' + error);
        }
    }

    /**
     * AI Feature 4: Generate Tests - ENHANCED
     */
    private async aiGenerateTests(diffContent: string): Promise<void> {
        this.showAIPanel('Generating Test Suggestions...');
        
        try {
            const prompt = `You are a QA engineer. Suggest test cases for this code change.

\`\`\`diff
${diffContent}
\`\`\`

Provide structured test recommendations:

## Test Coverage Needed

### Unit Tests
- [Test case 1: what to test]
- [Test case 2: edge case]
- [Test case 3: error handling]

### Integration Tests
[If applicable, or state "Not applicable"]

### Edge Cases to Cover
- [Boundary condition 1]
- [Error scenario 1]
- [Unexpected input 1]

## Priority
[Rank tests by importance: High/Medium/Low]

## Example Test (if applicable)
\`\`\`javascript
// Brief example of a key test
\`\`\`

Keep recommendations practical and focused on the actual changes.`;

            const response = await this.callAI(prompt);
            this.showAIPanelContent('Test Recommendations', response);
            
        } catch (error) {
            this.showAIPanelError('Failed to generate tests: ' + error);
        }
    }

/**
 * Call AI API - UNIVERSAL VERSION
 * Works with all providers: Claude, OpenAI, DeepSeek, Groq, etc.
 */
private async callAI(prompt: string): Promise<string> {
    try {
        const config = getCurrentApiConfigurationForced();
        if (!config || !config.apiKey) {
            throw new Error('No AI provider configured. Please set up an API key in Settings.');
        }
        
        console.log('🤖 Calling AI...', {
            provider: config.provider,
            model: config.model
        });
        
        // Try Tauri backend first
        try {
            return await this.callAI_Tauri(prompt, config);
        } catch (tauriError) {
            console.warn('⚠️ Tauri backend failed, using browser API...', tauriError.message);
            // Fallback to browser-based API
            return await this.callAI_Browser(prompt, config);
        }
        
    } catch (error) {
        console.error('❌ AI call failed:', error);
        const errorMsg = error?.message || String(error);
        throw new Error('AI analysis failed: ' + errorMsg);
    }
}

/**
 * Call AI via Tauri backend
 */
private async callAI_Tauri(prompt: string, config: any): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Map provider names for Rust backend
    const providerMapping: Record<string, string> = {
        'operator_x02': 'operatorX02',
        'deepseek': 'deepseek',
        'openai': 'openai',
        'claude': 'claude',
        'groq': 'openai',
        'custom': 'custom'
    };
    
    let providerName = providerMapping[config.provider] || config.provider;
    
    // Get base URL
    let baseUrl = config.apiBaseUrl;
    if (!baseUrl) {
        const defaultUrls: Record<string, string> = {
            'openai': 'https://api.openai.com/v1',
            'claude': 'https://api.anthropic.com/v1',
            'deepseek': 'https://api.deepseek.com/v1',
            'operator_x02': 'PROXY',
            'groq': 'https://api.groq.com/openai/v1'
        };
        baseUrl = defaultUrls[config.provider] || '';
    }
    
    const request = {
        provider: providerName,
        model: config.model,
        api_key: config.apiKey,
        base_url: baseUrl,
        message: prompt,
        max_tokens: config.maxTokens || 4000,
        temperature: 0.7
    };
    
    console.log('📤 Tauri request:', {
        provider: request.provider,
        model: request.model,
        baseUrl: request.base_url
    });
    
    const response: any = await invoke('call_ai_api', { request });
    
    console.log('✅ Tauri call successful');
    
    // Parse response
    if (typeof response === 'string') return response;
    if (response?.choices?.[0]?.message?.content) {
        return response.choices[0].message.content;
    }
    if (response?.content) return response.content;
    if (response?.text) return response.text;
    
    return JSON.stringify(response);
}

/**
 * Call AI via browser (fallback)
 */
private async callAI_Browser(prompt: string, config: any): Promise<string> {
    console.log('🌐 Using browser API');
    
    const messages = [{ role: 'user', content: prompt }];
    const response = await callGenericAPI(messages, config);
    
    console.log('✅ Browser API call successful');
    
    if (typeof response === 'string') return response;
    if (response?.choices?.[0]?.message?.content) {
        return response.choices[0].message.content;
    }
    if (response?.content) return response.content;
    
    return JSON.stringify(response);
}

    /**
     * Show AI panel with loading state
     */
    private showAIPanel(title: string): void {
        // Find the modal first
        const modal = document.querySelector('.diff-modal') as HTMLElement;
        if (!modal) {
            console.error('❌ Diff modal not found');
            return;
        }
        
        const panel = modal.querySelector('#ai-panel') as HTMLElement;
        const titleEl = modal.querySelector('#ai-panel-title-text') as HTMLElement;
        const content = modal.querySelector('#ai-panel-content') as HTMLElement;
        
        console.log('🎨 Opening AI panel:', { 
            panelFound: !!panel, 
            titleFound: !!titleEl, 
            contentFound: !!content 
        });
        
        if (panel && titleEl && content) {
            panel.style.display = 'flex';
            titleEl.textContent = title;
            content.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-spinner"></div>
                    <span>AI is thinking...</span>
                </div>
            `;
            console.log('✅ AI panel opened');
        } else {
            console.error('❌ AI panel elements not found:', {
                panel: !!panel,
                titleEl: !!titleEl,
                content: !!content
            });
        }
    }

    /**
     * Show AI panel content
     */
    private showAIPanelContent(title: string, content: string): void {
        const modal = document.querySelector('.diff-modal') as HTMLElement;
        if (!modal) return;
        
        const titleEl = modal.querySelector('#ai-panel-title-text') as HTMLElement;
        const contentEl = modal.querySelector('#ai-panel-content') as HTMLElement;
        
        console.log('📝 Showing AI content:', { 
            titleFound: !!titleEl, 
            contentFound: !!contentEl,
            contentLength: content.length 
        });
        
        if (titleEl && contentEl) {
            titleEl.textContent = title;
            contentEl.innerHTML = `
                <div class="ai-response">
                    <div class="ai-response-content">${this.formatMarkdown(content)}</div>
                </div>
            `;
            console.log('✅ AI content displayed');
        }
    }

    /**
     * Show AI panel error
     */
    private showAIPanelError(error: string): void {
        const modal = document.querySelector('.diff-modal') as HTMLElement;
        if (!modal) return;
        
        const contentEl = modal.querySelector('#ai-panel-content') as HTMLElement;
        
        console.error('❌ Showing AI error:', error);
        
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="ai-error">
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                    </svg>
                    <p>${this.escapeHtml(error)}</p>
                </div>
            `;
        }
    }

    /**
     * Format markdown text - ENHANCED
     */
    private formatMarkdown(text: string): string {
        // Escape HTML first
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Headers with styling
        formatted = formatted.replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h2 class="ai-h2">$1</h2>');
        
        // Bold and italic
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
        
        // Code blocks
        formatted = formatted.replace(
            /```(\w+)?\n([\s\S]+?)```/g,
            '<pre class="ai-code-block"><code>$2</code></pre>'
        );
        
        // Lists
        formatted = formatted.replace(/^- (.+)$/gm, '<li class="ai-list-item">$1</li>');
        formatted = formatted.replace(/(<li class="ai-list-item">[\s\S]+?<\/li>)/g, '<ul class="ai-list">$1</ul>');
        
        // Priority badges
        formatted = formatted.replace(/🔴/g, '<span class="ai-badge ai-badge-critical">🔴 Critical</span>');
        formatted = formatted.replace(/🟡/g, '<span class="ai-badge ai-badge-warning">🟡 Warning</span>');
        formatted = formatted.replace(/🔵/g, '<span class="ai-badge ai-badge-info">🔵 Info</span>');
        
        // Icons
        formatted = formatted.replace(/⭐/g, '<span class="ai-icon">⭐</span>');
        formatted = formatted.replace(/✅/g, '<span class="ai-icon ai-icon-success">✅</span>');
        formatted = formatted.replace(/❌/g, '<span class="ai-icon ai-icon-error">❌</span>');
        formatted = formatted.replace(/⚠️/g, '<span class="ai-icon ai-icon-warning">⚠️</span>');
        
        // Line breaks
        formatted = formatted.replace(/\n\n/g, '<br><br>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    /**
     * Format diff in enhanced view
     */
    private formatDiffEnhanced(diffContent: string): string {
        const lines = diffContent.split('\n');
        let html = '<div class="diff-viewer diff-enhanced">';
        
        for (const line of lines) {
            const escaped = this.escapeHtml(line);
            
            if (line.startsWith('Index:') || line.startsWith('===')) {
                html += `
                    <div class="diff-file-block">
                        <div class="diff-file-header">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3z"/>
                            </svg>
                            <span class="file-path">${escaped}</span>
                        </div>
                `;
            }
            else if (line.startsWith('---') || line.startsWith('+++')) {
                const type = line.startsWith('---') ? 'old' : 'new';
                html += `<div class="diff-meta diff-meta-${type}">${escaped}</div>`;
            }
            else if (line.startsWith('@@')) {
                html += `
                    <div class="diff-hunk-header">
                        <span class="hunk-indicator">@@</span>
                        <span class="hunk-info">${escaped.substring(2)}</span>
                    </div>
                `;
            }
            else if (line.startsWith('+')) {
                html += `
                    <div class="diff-line diff-line-added">
                        <span class="line-gutter gutter-added">+</span>
                        <span class="line-content">${this.syntaxHighlight(escaped.substring(1))}</span>
                    </div>
                `;
            }
            else if (line.startsWith('-')) {
                html += `
                    <div class="diff-line diff-line-removed">
                        <span class="line-gutter gutter-removed">−</span>
                        <span class="line-content">${this.syntaxHighlight(escaped.substring(1))}</span>
                    </div>
                `;
            }
            else if (line.trim()) {
                html += `
                    <div class="diff-line diff-line-context">
                        <span class="line-gutter gutter-context"> </span>
                        <span class="line-content">${this.syntaxHighlight(escaped)}</span>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Format diff in unified view
     */
    private formatDiffUnified(diffContent: string): string {
        return `<pre class="diff-viewer diff-unified">${this.escapeHtml(diffContent)}</pre>`;
    }

    /**
     * Simple syntax highlighting
     */
    private syntaxHighlight(code: string): string {
        if (!code || !code.trim()) return '&nbsp;';
        
        code = code.replace(/\b(const|let|var|function|class|import|export|from|async|await|return|if|else|for|while|try|catch)\b/g, 
            '<span class="syntax-keyword">$1</span>');
        
        code = code.replace(/(['"`])(.*?)\1/g, '<span class="syntax-string">$1$2$1</span>');
        code = code.replace(/(\/\/.*$)/g, '<span class="syntax-comment">$1</span>');
        code = code.replace(/\b(\d+)\b/g, '<span class="syntax-number">$1</span>');
        
        return code;
    }

    /**
     * Parse diff statistics
     */
    private parseDiffStats(diffContent: string): { filesChanged: number; additions: number; deletions: number } {
        const lines = diffContent.split('\n');
        const filesSet = new Set<string>();
        let additions = 0;
        let deletions = 0;
        
        for (const line of lines) {
            if (line.startsWith('Index:')) {
                filesSet.add(line);
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
            }
        }
        
        return { filesChanged: filesSet.size, additions, deletions };
    }

    /**
     * Calculate percentage for stats bar
     */
    private calculatePercentage(value: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    /**
     * Revert to specific revision
     */
    private async revertToRevision(revision: number): Promise<void> {
        console.log('⏮️ Revert requested for revision:', revision);
        
        const confirmed = window.confirm(
            `Are you sure you want to revert to revision ${revision}?\n\n` +
            'This will update your working copy to match that revision.'
        );

        if (!confirmed) {
            console.log('❌ Revert cancelled by user');
            return;
        }

        try {
            console.log('🔄 Reverting to revision:', revision);
            await svnHistoryManager.revertToRevision(revision);
            
            console.log('✅ Revert successful');
            alert(`Successfully reverted to revision ${revision}`);
            
            await this.loadHistory();

        } catch (error) {
            console.error('❌ Failed to revert:', error);
            alert('Failed to revert: ' + error);
        }
    }

    /**
     * Update count display
     */
    private updateCount(): void {
        const countElement = document.getElementById('history-count');
        if (countElement) {
            countElement.textContent = this.filteredEntries.length.toString();
        }
    }

    /**
     * Escape HTML
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Close history panel
     */
    close(): void {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    /**
     * Refresh history panel
     */
    async refresh(): Promise<void> {
        this.currentLimit = 50;
        await this.loadHistory();
    }

    /**
     * Add component styles
     */
    private addStyles(): void {
        if (document.getElementById('svn-history-styles')) return;

        const style = document.createElement('style');
        style.id = 'svn-history-styles';
        style.textContent = `
            .svn-history-panel {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: #1e1e1e;
                border-left: 1px solid #3e3e42;
                display: flex;
                flex-direction: column;
                z-index: 9998;
                box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                }
                to {
                    transform: translateX(0);
                }
            }

            .history-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 18px;
                background: linear-gradient(180deg, #252526 0%, #2a2a2b 100%);
                border-bottom: 1px solid #3e3e42;
            }

            .history-title {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #cccccc;
            }

            .history-title svg {
                color: #4fc3f7;
            }

            .history-title h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }

            .history-count {
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 24px;
                height: 20px;
                padding: 0 6px;
                background: #4fc3f7;
                color: #ffffff;
                font-size: 11px;
                font-weight: 700;
                border-radius: 10px;
            }

            .history-close-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: rgba(255, 70, 70, 0.1);
                border: 1px solid rgba(255, 70, 70, 0.3);
                border-radius: 6px;
                cursor: pointer;
                color: #ff4646;
                transition: all 0.2s;
            }

            .history-close-btn:hover {
                background: rgba(255, 70, 70, 0.2);
                border-color: #ff4646;
                transform: scale(1.05);
            }

            .history-search {
                padding: 12px 16px;
                background: #252526;
                border-bottom: 1px solid #3e3e42;
            }

            .search-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }

            .search-icon {
                position: absolute;
                left: 12px;
                color: #858585;
                pointer-events: none;
            }

            .search-input {
                width: 100%;
                padding: 8px 12px 8px 36px;
                background: #1e1e1e;
                border: 1px solid #3e3e42;
                border-radius: 6px;
                color: #cccccc;
                font-size: 13px;
                transition: all 0.2s;
            }

            .search-input:focus {
                outline: none;
                border-color: #4fc3f7;
                box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
            }

            .search-clear-btn {
                position: absolute;
                right: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: rgba(255, 70, 70, 0.1);
                border: none;
                border-radius: 4px;
                color: #ff4646;
                cursor: pointer;
                transition: all 0.2s;
            }

            .search-clear-btn:hover {
                background: rgba(255, 70, 70, 0.2);
            }

            .history-content {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            .history-content::-webkit-scrollbar {
                width: 8px;
            }

            .history-content::-webkit-scrollbar-track {
                background: #1e1e1e;
            }

            .history-content::-webkit-scrollbar-thumb {
                background: #3e3e42;
                border-radius: 4px;
            }

            .history-content::-webkit-scrollbar-thumb:hover {
                background: #505050;
            }

            .history-loading, .history-empty, .history-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                color: #858585;
                text-align: center;
            }

            .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid #3e3e42;
                border-top-color: #4fc3f7;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-bottom: 16px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .history-entry {
                margin-bottom: 12px;
                padding: 12px;
                background: #252526;
                border: 1px solid #3e3e42;
                border-radius: 8px;
                transition: all 0.2s;
            }

            .history-entry:hover {
                background: #2a2a2b;
                border-color: #4fc3f7;
                box-shadow: 0 2px 8px rgba(79, 195, 247, 0.2);
            }

            .entry-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .entry-meta {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #858585;
            }

            .entry-revision {
                padding: 2px 6px;
                background: rgba(79, 195, 247, 0.15);
                color: #4fc3f7;
                border-radius: 4px;
                font-weight: 700;
                font-family: 'Consolas', monospace;
            }

            .entry-separator {
                color: #3e3e42;
            }

            .entry-message {
                margin-bottom: 8px;
                color: #cccccc;
                font-size: 13px;
                line-height: 1.4;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .entry-stats {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }

            .stat-item {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: rgba(79, 195, 247, 0.1);
                border-radius: 4px;
                font-size: 11px;
                color: #858585;
            }

            .entry-files {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }

            .entry-files:not(.collapsed) {
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 8px;
            }

            .changed-files-list {
                padding: 8px;
                background: #1e1e1e;
                border-radius: 6px;
            }

            .changed-file-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px;
                font-size: 12px;
                color: #cccccc;
            }

            .file-action {
                font-size: 14px;
            }

            .file-path {
                font-family: 'Consolas', monospace;
            }

            .entry-actions {
                display: flex;
                gap: 6px;
            }

            .action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px;
                background: rgba(79, 195, 247, 0.1);
                border: 1px solid rgba(79, 195, 247, 0.3);
                border-radius: 6px;
                color: #4fc3f7;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .action-btn:hover {
                background: rgba(79, 195, 247, 0.2);
                border-color: #4fc3f7;
                transform: translateY(-1px);
            }

            .action-danger {
                background: rgba(255, 70, 70, 0.1);
                border-color: rgba(255, 70, 70, 0.3);
                color: #ff4646;
            }

            .action-danger:hover {
                background: rgba(255, 70, 70, 0.2);
                border-color: #ff4646;
            }

            .history-footer {
                padding: 12px 16px;
                background: #252526;
                border-top: 1px solid #3e3e42;
            }

            .load-more-btn {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px;
                background: rgba(79, 195, 247, 0.1);
                border: 1px solid rgba(79, 195, 247, 0.3);
                border-radius: 6px;
                color: #4fc3f7;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .load-more-btn:hover {
                background: rgba(79, 195, 247, 0.2);
                border-color: #4fc3f7;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Add modern diff viewer styles
     */
    private addModernDiffStyles(): void {
        if (document.getElementById('diff-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'diff-modal-styles';
        style.textContent = `
            /* [ULTRA-MODERN DIFF STYLES - See Part 2 for complete styles] */
            /* Copy all styles from AI_DIFF_VIEWER_PART2.ts here */
            /**
 * 🎨 COMPLETE DIFF MODAL STYLES
 * Add these styles to the addModernDiffStyles() method in svnHistoryViewer.ts
 * Replace the comment "/* Add remaining styles from Part 2... */" with this content
 */

/* Header */
.diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #3e3e42;
    background: linear-gradient(180deg, #252526 0%, #2d2d30 100%);
    border-radius: 12px 12px 0 0;
}

.diff-title-section {
    display: flex;
    align-items: center;
    gap: 14px;
}

.diff-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.diff-icon-wrapper svg {
    color: white;
}

.diff-title-text h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.2px;
}

.diff-subtitle {
    display: block;
    font-size: 12px;
    color: #858585;
    margin-top: 2px;
}

/* NEW: Metadata Section */
/* Metadata Bar - Always Visible */
.diff-metadata-bar {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 10px 20px;
    background: #1e1e1e;
    border-bottom: 1px solid #3e3e42;
    font-size: 12px;
}

.metadata-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #888;
}

.metadata-item svg {
    color: #4fc3f7;
    flex-shrink: 0;
}

.metadata-item span {
    color: #cccccc;
    font-weight: 500;
}

.diff-stats-inline {
    display: flex;
    align-items: center;
    gap: 8px;
}

.stat-add {
    color: #73c991;
    font-weight: 600;
}

.stat-del {
    color: #ff6b6b;
    font-weight: 600;
}

.stat-total {
    color: #888;
}

/* Responsive Metadata Bar */
@media (max-width: 1200px) {
    .diff-metadata-bar {
        flex-wrap: wrap;
        gap: 12px;
    }
    
    .metadata-item {
        font-size: 11px;
    }
}

.diff-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 70, 70, 0.1);
    border: 1px solid rgba(255, 70, 70, 0.2);
    border-radius: 8px;
    cursor: pointer;
    color: #ff4646;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.diff-close-btn:hover {
    background: rgba(255, 70, 70, 0.2);
    border-color: #ff4646;
    transform: scale(1.05);
}

/* Stats Bar */
.diff-stats-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #252526;
    border-bottom: 1px solid #3e3e42;
}

.stats-visual {
    flex: 1;
    max-width: 300px;
}

.stat-graph {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background: #1e1e1e;
}

.graph-bar {
    height: 100%;
    transition: width 0.5s ease;
}

.graph-additions {
    background: linear-gradient(90deg, #28a745 0%, #34d058 100%);
}

.graph-deletions {
    background: linear-gradient(90deg, #dc3545 0%, #ff4757 100%);
}

.stats-badges {
    display: flex;
    gap: 12px;
}

.stat-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Consolas', monospace;
}

.stat-added {
    background: rgba(40, 167, 69, 0.15);
    color: #34d058;
    border: 1px solid rgba(40, 167, 69, 0.3);
}

.stat-removed {
    background: rgba(220, 53, 69, 0.15);
    color: #ff4757;
    border: 1px solid rgba(220, 53, 69, 0.3);
}

.badge-icon {
    font-size: 16px;
    font-weight: 900;
}

/* AI Toolbar */
.diff-ai-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    gap: 16px;
    flex-wrap: wrap;
}

.toolbar-section {
    display: flex;
    gap: 8px;
}

/* AI Buttons - Default State (NOT HIGHLIGHTED) */
.ai-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: transparent;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    color: #888;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.ai-btn svg {
    color: #888;
    transition: color 0.2s;
}

/* Hover State - Subtle, no transform */
.ai-btn:hover:not(.active) {
    background: rgba(79, 195, 247, 0.05);
    border-color: rgba(79, 195, 247, 0.2);
    color: #cccccc;
}

.ai-btn:hover:not(.active) svg {
    color: #4fc3f7;
}

/* ACTIVE State (When Clicked) - Default Blue */
.ai-btn.active {
    background: linear-gradient(135deg, rgba(79, 195, 247, 0.15) 0%, rgba(79, 195, 247, 0.08) 100%);
    border-color: #4fc3f7;
    color: #4fc3f7;
    box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.1);
}

.ai-btn.active svg {
    color: #4fc3f7;
}

/* Active State Bottom Indicator */
.ai-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #4fc3f7;
    border-radius: 2px 2px 0 0;
}

/* Feature-Specific Active Colors */
.ai-btn.active[data-feature="explain"] {
    border-color: #4fc3f7;
    color: #4fc3f7;
    box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.1);
}

.ai-btn.active[data-feature="explain"]::after {
    background: #4fc3f7;
}

.ai-btn.active[data-feature="review"] {
    background: linear-gradient(135deg, rgba(115, 201, 145, 0.15) 0%, rgba(115, 201, 145, 0.08) 100%);
    border-color: #73c991;
    color: #73c991;
    box-shadow: 0 0 0 2px rgba(115, 201, 145, 0.1);
}

.ai-btn.active[data-feature="review"] svg {
    color: #73c991;
}

.ai-btn.active[data-feature="review"]::after {
    background: #73c991;
}

.ai-btn.active[data-feature="issues"] {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%);
    border-color: #ffc107;
    color: #ffc107;
    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.1);
}

.ai-btn.active[data-feature="issues"] svg {
    color: #ffc107;
}

.ai-btn.active[data-feature="issues"]::after {
    background: #ffc107;
}

.ai-btn.active[data-feature="tests"] {
    background: linear-gradient(135deg, rgba(189, 147, 249, 0.15) 0%, rgba(189, 147, 249, 0.08) 100%);
    border-color: #bd93f9;
    color: #bd93f9;
    box-shadow: 0 0 0 2px rgba(189, 147, 249, 0.1);
}

.ai-btn.active[data-feature="tests"] svg {
    color: #bd93f9;
}

.ai-btn.active[data-feature="tests"]::after {
    background: #bd93f9;
}

/* Deprecated - Remove ai-btn-primary */
.ai-btn-primary {
    /* This class is no longer used - buttons start unhighlighted */
}

.view-toggle-btn {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid #3e3e42;
    border-radius: 6px;
    color: #858585;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.view-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #cccccc;
}

.view-toggle-btn.active {
    background: #4fc3f7;
    border-color: #4fc3f7;
    color: white;
}

/* AI Panel */
/* AI Panel - Compact Professional Design */
.diff-ai-panel {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 400px;
    background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
    border-left: 1px solid #3e3e42;
    display: none;
    flex-direction: column;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* AI Panel Header - Compact */
.ai-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: linear-gradient(90deg, #2d2d30 0%, #252526 100%);
    border-bottom: 1px solid #3e3e42;
    min-height: 44px;
}

.ai-panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.ai-panel-title svg {
    color: #4fc3f7;
    flex-shrink: 0;
}

.ai-panel-title span {
    font-size: 13px;
    font-weight: 600;
    color: #cccccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ai-panel-close {
    background: transparent;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;
    line-height: 1;
}

.ai-panel-close:hover {
    background: rgba(255, 70, 70, 0.15);
    color: #ff4646;
}

/* AI Panel Content - Optimized */
.ai-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    font-size: 13px;
    line-height: 1.6;
}

.ai-panel-content::-webkit-scrollbar {
    width: 8px;
}

.ai-panel-content::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.ai-panel-content::-webkit-scrollbar-thumb {
    background: #3e3e42;
    border-radius: 4px;
}

.ai-panel-content::-webkit-scrollbar-thumb:hover {
    background: #505050;
}

/* AI Response Container */
.ai-response {
    color: #cccccc;
}

.ai-response-content {
    animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* AI Typography - Professional */
.ai-h2 {
    font-size: 15px;
    font-weight: 700;
    color: #4fc3f7;
    margin: 16px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #3e3e42;
}

.ai-h3 {
    font-size: 14px;
    font-weight: 600;
    color: #73c991;
    margin: 12px 0 8px 0;
    display: flex;
    align-items: center;
    gap: 6px;
}

.ai-h4 {
    font-size: 13px;
    font-weight: 600;
    color: #d4d4d4;
    margin: 10px 0 6px 0;
}

/* AI Lists - Compact */
.ai-list,
.ai-list-numbered {
    margin: 6px 0;
    padding-left: 18px;
}

.ai-list-item {
    margin: 3px 0;
    color: #cccccc;
    position: relative;
    padding-left: 4px;
    list-style: none;
}

.ai-list-item::before {
    content: "▪";
    position: absolute;
    left: -14px;
    color: #4fc3f7;
    font-weight: bold;
}

/* Inline Code - Clean */
.ai-inline-code {
    background: rgba(79, 195, 247, 0.12);
    color: #4fc3f7;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    border: 1px solid rgba(79, 195, 247, 0.25);
}

/* Code Blocks - Professional */
.ai-code-block {
    background: #1a1a1a;
    border: 1px solid #3e3e42;
    border-radius: 6px;
    padding: 10px;
    margin: 10px 0;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #d4d4d4;
}

.ai-code-block::-webkit-scrollbar {
    height: 6px;
}

.ai-code-block::-webkit-scrollbar-track {
    background: #252526;
}

.ai-code-block::-webkit-scrollbar-thumb {
    background: #3e3e42;
    border-radius: 3px;
}

/* Badges - Priority Indicators */
.ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    margin-right: 6px;
}

.ai-badge-critical {
    background: rgba(220, 53, 69, 0.15);
    color: #ff6b6b;
    border: 1px solid rgba(220, 53, 69, 0.3);
}

.ai-badge-warning {
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.3);
}

.ai-badge-info {
    background: rgba(79, 195, 247, 0.15);
    color: #4fc3f7;
    border: 1px solid rgba(79, 195, 247, 0.3);
}

/* Icons - Enhanced */
.ai-icon {
    display: inline-block;
    margin: 0 2px;
}

.ai-icon-success {
    color: #73c991;
}

.ai-icon-error {
    color: #ff6b6b;
}

.ai-icon-warning {
    color: #ffc107;
}

/* Loading State - Professional */
.ai-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 20px;
    gap: 14px;
}

.loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(79, 195, 247, 0.1);
    border-top-color: #4fc3f7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.ai-loading span {
    color: #888;
    font-size: 12px;
    font-weight: 500;
}

/* Error State - Clean */
.ai-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 36px 20px;
    text-align: center;
}

.ai-error svg {
    color: #ff6b6b;
    opacity: 0.5;
}

.ai-error p {
    color: #ff6b6b;
    font-size: 12px;
    margin: 0;
    max-width: 280px;
}

/* Strong emphasis */
.ai-response-content strong {
    color: #ffffff;
    font-weight: 600;
}

/* Emphasis */
.ai-response-content em {
    color: #4fc3f7;
    font-style: normal;
}

/* Responsive - Smaller screens */
@media (max-width: 1400px) {
    .diff-ai-panel {
        width: 340px;
    }
}

@media (max-width: 1200px) {
    .diff-ai-panel {
        width: 300px;
        font-size: 12px;
    }
    
    .ai-h2 {
        font-size: 14px;
    }
    
    .ai-h3 {
        font-size: 13px;
    }
}

/* Diff Body */
.diff-body-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.diff-body {
    flex: 1;
    overflow: auto;
    background: #1e1e1e;
}

.diff-body::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

.diff-body::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.diff-body::-webkit-scrollbar-thumb {
    background: #3e3e42;
    border-radius: 6px;
}

.diff-body::-webkit-scrollbar-thumb:hover {
    background: #505050;
}

/* Enhanced Diff Viewer */
.diff-enhanced {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 20px;
}

.diff-file-block {
    margin-bottom: 20px;
    border: 1px solid #3e3e42;
    border-radius: 8px;
    overflow: hidden;
}

.diff-file-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: linear-gradient(90deg, #2d2d30 0%, #252526 100%);
    color: #4fc3f7;
    font-weight: 700;
    border-bottom: 1px solid #3e3e42;
}

.diff-line {
    display: flex;
    align-items: stretch;
}

.line-gutter {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    flex-shrink: 0;
    font-weight: 900;
    font-size: 14px;
    border-right: 1px solid #3e3e42;
}

.line-content {
    flex: 1;
    padding: 2px 16px;
    white-space: pre;
    overflow-x: auto;
}

.diff-line-added {
    background: rgba(40, 167, 69, 0.12);
}

.diff-line-added:hover {
    background: rgba(40, 167, 69, 0.18);
}

.gutter-added {
    background: rgba(40, 167, 69, 0.25);
    color: #34d058;
}

.diff-line-removed {
    background: rgba(220, 53, 69, 0.12);
}

.diff-line-removed:hover {
    background: rgba(220, 53, 69, 0.18);
}

.gutter-removed {
    background: rgba(220, 53, 69, 0.25);
    color: #ff4757;
}

.diff-line-context {
    color: #cccccc;
}

.diff-line-context:hover {
    background: rgba(255, 255, 255, 0.02);
}

.gutter-context {
    background: #252526;
    color: #505050;
}

.diff-hunk-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: #2d2d30;
    color: #4fc3f7;
    font-weight: 700;
    border-top: 1px solid #3e3e42;
    border-bottom: 1px solid #3e3e42;
}

.hunk-indicator {
    color: #667eea;
    font-weight: 900;
}

.diff-meta-old {
    background: rgba(220, 53, 69, 0.1);
    color: #f48771;
    padding: 4px 12px;
    font-size: 12px;
}

.diff-meta-new {
    background: rgba(40, 167, 69, 0.1);
    color: #73c991;
    padding: 4px 12px;
    font-size: 12px;
}

/* Syntax Highlighting */
.syntax-keyword {
    color: #c678dd;
    font-weight: 600;
}

.syntax-string {
    color: #98c379;
}

.syntax-comment {
    color: #5c6370;
    font-style: italic;
}

.syntax-number {
    color: #d19a66;
}

/* Unified View */
.diff-unified {
    padding: 20px;
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #cccccc;
    white-space: pre-wrap;
    background: #1e1e1e;
}

/* Responsive */
@media (max-width: 1200px) {
    .diff-modal-content {
        width: 98%;
        height: 95vh;
    }
    
    .diff-ai-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    
    .toolbar-section {
        width: 100%;
        overflow-x: auto;
    }
}
            .diff-modal {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: fadeIn 0.2s ease-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .diff-modal-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
            }
            
            .diff-modal-content {
                position: relative;
                background: #1e1e1e;
                border: 1px solid #3e3e42;
                border-radius: 12px;
                width: 95%;
                max-width: 1600px;
                height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
                animation: slideUp 0.3s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.98);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            /* Add remaining styles from Part 2... */
            /* For brevity, include all styles from AI_DIFF_VIEWER_PART2.ts */
        `;
        
        document.head.appendChild(style);
    }
}

// Export singleton instance
export const svnHistoryViewer = SvnHistoryViewer.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    (window as any).svnHistoryViewer = svnHistoryViewer;
}