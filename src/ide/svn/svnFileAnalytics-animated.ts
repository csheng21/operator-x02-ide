/**
 * 📊 SVN FILE ANALYTICS COMPONENT - ANIMATED VERSION
 * Comprehensive file analysis with charts, timelines, metrics, and smooth animations
 */

import { svnManager } from './svnManager';

export interface FileAnalytics {
    filePath: string;
    initialCreated: Date;
    latestChange: Date;
    totalCommits: number;
    linesAdded: number;
    linesDeleted: number;
    contributors: Map<string, number>;
    commitsByMonth: Map<string, number>;
    avgCommitSize: number;
    largestCommit: { revision: number; lines: number };
    churnRate: number;
    activityLevel: 'Low' | 'Medium' | 'High';
}

export class FileAnalyticsView {
    private container: HTMLElement;
    private analytics: FileAnalytics | null = null;
    private animationDelay = 100; // ms between animations

    constructor(container: HTMLElement) {
        this.container = container;
    }

    /**
     * Load analytics for a file
     */
    async loadAnalytics(filePath: string): Promise<void> {
        try {
            // Show loading state with shimmer
            this.showLoading();
            
            // Fetch file history
            const history = await svnManager.getFileHistory(filePath);
            const analytics = await this.calculateAnalytics(filePath, history);
            
            this.analytics = analytics;
            
            // Render with animations
            await this.render();
            this.startAnimations();
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.container.innerHTML = '<div class="error">Failed to load analytics</div>';
        }
    }

    /**
     * Show loading state
     */
    private showLoading(): void {
        this.container.innerHTML = `
            <div class="analytics-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading Analytics...</div>
            </div>
        `;
    }

    /**
     * Calculate analytics from SVN history
     */
    private async calculateAnalytics(filePath: string, history: any[]): Promise<FileAnalytics> {
        const analytics: FileAnalytics = {
            filePath,
            initialCreated: new Date(history[history.length - 1]?.date || Date.now()),
            latestChange: new Date(history[0]?.date || Date.now()),
            totalCommits: history.length,
            linesAdded: 0,
            linesDeleted: 0,
            contributors: new Map(),
            commitsByMonth: new Map(),
            avgCommitSize: 0,
            largestCommit: { revision: 0, lines: 0 },
            churnRate: 0,
            activityLevel: 'Low'
        };

        // Calculate metrics from history
        let totalLines = 0;
        
        for (const commit of history) {
            const author = commit.author || 'Unknown';
            analytics.contributors.set(author, (analytics.contributors.get(author) || 0) + 1);
            
            const diff = await svnManager.getDiff(filePath, commit.revision);
            const stats = this.parseDiffStats(diff);
            
            analytics.linesAdded += stats.added;
            analytics.linesDeleted += stats.deleted;
            totalLines += stats.added + stats.deleted;
            
            if (stats.added + stats.deleted > analytics.largestCommit.lines) {
                analytics.largestCommit = {
                    revision: commit.revision,
                    lines: stats.added + stats.deleted
                };
            }
            
            const month = new Date(commit.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            analytics.commitsByMonth.set(month, (analytics.commitsByMonth.get(month) || 0) + 1);
        }

        analytics.avgCommitSize = totalLines / history.length;
        analytics.churnRate = (analytics.linesAdded + analytics.linesDeleted) / Math.max(analytics.linesAdded - analytics.linesDeleted, 1);
        
        const commitsPerDay = history.length / Math.max((Date.now() - analytics.initialCreated.getTime()) / (1000 * 60 * 60 * 24), 1);
        analytics.activityLevel = commitsPerDay > 0.1 ? 'High' : commitsPerDay > 0.05 ? 'Medium' : 'Low';

        return analytics;
    }

    /**
     * Parse diff to get line stats
     */
    private parseDiffStats(diff: string): { added: number; deleted: number } {
        const lines = diff.split('\n');
        let added = 0;
        let deleted = 0;

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) added++;
            if (line.startsWith('-') && !line.startsWith('---')) deleted++;
        }

        return { added, deleted };
    }

    /**
     * Render the analytics view
     */
    private async render(): Promise<void> {
        if (!this.analytics) return;

        const a = this.analytics;
        const daysOld = Math.floor((Date.now() - a.initialCreated.getTime()) / (1000 * 60 * 60 * 24));
        const hoursAgo = Math.floor((Date.now() - a.latestChange.getTime()) / (1000 * 60 * 60));
        const primaryAuthor = Array.from(a.contributors.entries()).sort((x, y) => y[1] - x[1])[0];

        this.container.innerHTML = `
            <div class="file-analytics-dashboard">
                <!-- Header -->
                <div class="analytics-header fade-in">
                    <h2>📊 File Analytics</h2>
                    <div class="file-name">${this.escapeHtml(a.filePath)}</div>
                </div>

                <!-- Stats Grid -->
                <div class="analytics-stats-grid">
                    <div class="analytics-stat-card primary slide-up" style="animation-delay: 0.1s;">
                        <div class="stat-label">📅 Initial Created</div>
                        <div class="stat-value counter" data-target="${daysOld}">0</div>
                        <div class="stat-detail">days ago (${a.initialCreated.toLocaleDateString()})</div>
                    </div>

                    <div class="analytics-stat-card success slide-up" style="animation-delay: 0.2s;">
                        <div class="stat-label">🕐 Latest Change</div>
                        <div class="stat-value counter" data-target="${hoursAgo}">0</div>
                        <div class="stat-detail">hours ago (${a.latestChange.toLocaleString()})</div>
                    </div>

                    <div class="analytics-stat-card warning slide-up" style="animation-delay: 0.3s;">
                        <div class="stat-label">📝 Total Commits</div>
                        <div class="stat-value counter" data-target="${a.totalCommits}">0</div>
                        <div class="stat-detail">~${(a.totalCommits / Math.max(daysOld, 1)).toFixed(2)} commits/day</div>
                    </div>

                    <div class="analytics-stat-card danger slide-up" style="animation-delay: 0.4s;">
                        <div class="stat-label">📏 Lines Changed</div>
                        <div class="stat-value counter" data-target="${a.linesAdded + a.linesDeleted}">0</div>
                        <div class="stat-detail">+${a.linesAdded} / -${a.linesDeleted} lines</div>
                    </div>

                    <div class="analytics-stat-card primary slide-up" style="animation-delay: 0.5s;">
                        <div class="stat-label">👥 Contributors</div>
                        <div class="stat-value counter" data-target="${a.contributors.size}">0</div>
                        <div class="stat-detail">Primary: ${primaryAuthor?.[0] || 'Unknown'} (${Math.round((primaryAuthor?.[1] || 0) / a.totalCommits * 100)}%)</div>
                    </div>

                    <div class="analytics-stat-card success slide-up" style="animation-delay: 0.6s;">
                        <div class="stat-label">🔥 Activity Level</div>
                        <div class="stat-value">${a.activityLevel}</div>
                        <div class="stat-detail">Churn rate: ${a.churnRate.toFixed(2)}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" data-width="${a.activityLevel === 'High' ? 75 : a.activityLevel === 'Medium' ? 50 : 25}"></div>
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="analytics-charts">
                    <div class="chart-container fade-in-scale" style="animation-delay: 0.7s;">
                        <div class="chart-title">📈 Lines Changed Over Time</div>
                        <div class="lines-bar-chart">
                            <div class="bar-item">
                                <div class="bar-label">Added</div>
                                <div class="bar bar-animated" data-width="${(a.linesAdded / (a.linesAdded + a.linesDeleted)) * 100}" style="background: #4ec9b0;"></div>
                                <div class="bar-value">+${a.linesAdded}</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Deleted</div>
                                <div class="bar bar-animated" data-width="${(a.linesDeleted / (a.linesAdded + a.linesDeleted)) * 100}" style="background: #f48771;"></div>
                                <div class="bar-value">-${a.linesDeleted}</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Net</div>
                                <div class="bar bar-animated" data-width="${((a.linesAdded - a.linesDeleted) / (a.linesAdded + a.linesDeleted)) * 100}" style="background: #569cd6;"></div>
                                <div class="bar-value">+${a.linesAdded - a.linesDeleted}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="analytics-metrics fade-in" style="animation-delay: 0.9s;">
                    <div class="metric-item slide-up" style="animation-delay: 1.0s;">
                        <div class="metric-label">Avg Commit Size</div>
                        <div class="metric-value counter" data-target="${a.avgCommitSize.toFixed(1)}" data-decimal="true">0</div>
                        <div class="metric-unit">lines/commit</div>
                    </div>
                    <div class="metric-item slide-up" style="animation-delay: 1.1s;">
                        <div class="metric-label">Largest Commit</div>
                        <div class="metric-value counter" data-target="${a.largestCommit.lines}">0</div>
                        <div class="metric-unit">lines (r${a.largestCommit.revision})</div>
                    </div>
                    <div class="metric-item slide-up" style="animation-delay: 1.2s;">
                        <div class="metric-label">File Age</div>
                        <div class="metric-value counter" data-target="${daysOld}">0</div>
                        <div class="metric-unit">days old</div>
                    </div>
                </div>

                <!-- Mermaid Diagrams -->
                <div class="mermaid-section fade-in" style="animation-delay: 1.3s;">
                    <div class="chart-title">🌳 File Evolution</div>
                    <div class="mermaid">
                        graph TB
                            A[Initial Creation<br/>${a.initialCreated.toLocaleDateString()}<br/>Day 0] --> B[Early Development<br/>Month 1-3]
                            B --> C[Maturation<br/>Month 4-6]
                            C --> D[Current State<br/>${a.latestChange.toLocaleDateString()}<br/>Day ${daysOld}]
                            
                            style D fill:#4ec9b0,stroke:#4ec9b0,color:#000
                            style A fill:#569cd6,stroke:#569cd6,color:#fff
                    </div>
                </div>

                <div class="mermaid-section fade-in" style="animation-delay: 1.5s;">
                    <div class="chart-title">👥 Contributor Distribution</div>
                    <div class="mermaid">
                        pie title Commits by Author
                            ${Array.from(a.contributors.entries()).map(([author, count]) => 
                                `"${author}" : ${count}`
                            ).join('\n                            ')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Start all animations
     */
    private startAnimations(): void {
        // Counter animations
        setTimeout(() => {
            this.container.querySelectorAll('.counter').forEach(element => {
                const target = parseFloat(element.getAttribute('data-target') || '0');
                const isDecimal = element.hasAttribute('data-decimal');
                this.animateCounter(element as HTMLElement, target, 1500, isDecimal);
            });
        }, 300);

        // Progress bar animations
        setTimeout(() => {
            this.container.querySelectorAll('.progress-fill').forEach(element => {
                const width = element.getAttribute('data-width') || '0';
                (element as HTMLElement).style.width = width + '%';
            });
        }, 800);

        // Bar chart animations
        setTimeout(() => {
            this.container.querySelectorAll('.bar-animated').forEach((element, index) => {
                const width = element.getAttribute('data-width') || '0';
                setTimeout(() => {
                    (element as HTMLElement).style.width = width + '%';
                }, index * 200);
            });
        }, 1000);

        // Initialize Mermaid if available
        if (typeof (window as any).mermaid !== 'undefined') {
            setTimeout(() => {
                (window as any).mermaid.init(undefined, this.container.querySelectorAll('.mermaid'));
            }, 1500);
        }
    }

    /**
     * Animate counter from 0 to target
     */
    private animateCounter(element: HTMLElement, target: number, duration: number = 1000, isDecimal: boolean = false): void {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (isDecimal) {
                element.textContent = current.toFixed(1);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    }

    /**
     * Escape HTML
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// CSS for analytics view with animations
export const FILE_ANALYTICS_CSS = `
/* Loading state */
.analytics-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #3c3c3c;
    border-top-color: #569cd6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    color: #cccccc;
    font-size: 14px;
    margin-top: 16px;
}

/* Dashboard container */
.file-analytics-dashboard {
    background: #1e1e1e;
    padding: 20px;
    border-radius: 8px;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fadeInScale {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
}

.slide-up {
    opacity: 0;
    animation: slideUp 0.5s ease-out forwards;
}

.fade-in-scale {
    opacity: 0;
    animation: fadeInScale 0.6s ease-out forwards;
}

/* Header */
.analytics-header {
    margin-bottom: 24px;
}

.analytics-header h2 {
    font-size: 20px;
    color: #cccccc;
    margin-bottom: 8px;
}

.analytics-header .file-name {
    font-size: 13px;
    color: #808080;
    font-family: monospace;
}

/* Stats Grid */
.analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.analytics-stat-card {
    background: #252526;
    padding: 16px;
    border-radius: 6px;
    border-left: 3px solid;
    transition: transform 0.3s, box-shadow 0.3s;
}

.analytics-stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(86, 156, 214, 0.3);
}

.analytics-stat-card.primary { border-color: #569cd6; }
.analytics-stat-card.success { border-color: #4ec9b0; }
.analytics-stat-card.warning { border-color: #fcc419; }
.analytics-stat-card.danger { border-color: #f48771; }

.analytics-stat-card .stat-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #808080;
    margin-bottom: 8px;
}

.analytics-stat-card .stat-value {
    font-size: 28px;
    font-weight: 600;
    font-family: monospace;
    margin-bottom: 4px;
}

.analytics-stat-card.primary .stat-value { color: #569cd6; }
.analytics-stat-card.success .stat-value { color: #4ec9b0; }
.analytics-stat-card.warning .stat-value { color: #fcc419; }
.analytics-stat-card.danger .stat-value { color: #f48771; }

.analytics-stat-card .stat-detail {
    font-size: 11px;
    color: #999999;
}

/* Progress Bar */
.progress-bar {
    height: 8px;
    background: #3c3c3c;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #569cd6, #4ec9b0);
    width: 0;
    transition: width 1.5s ease-out;
}

/* Charts */
.analytics-charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.chart-container {
    background: #252526;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #3c3c3c;
}

.chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #cccccc;
    margin-bottom: 16px;
}

/* Bar Chart */
.lines-bar-chart {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.bar-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.bar-label {
    min-width: 60px;
    font-size: 12px;
    color: #cccccc;
}

.bar {
    height: 24px;
    border-radius: 4px;
}

.bar-animated {
    width: 0;
    transition: width 1s ease-out;
}

.bar-value {
    min-width: 60px;
    font-size: 12px;
    color: #cccccc;
    font-family: monospace;
    text-align: right;
}

/* Metrics */
.analytics-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
}

.metric-item {
    background: rgba(86, 156, 214, 0.05);
    padding: 12px;
    border-radius: 4px;
    border-left: 2px solid #569cd6;
    text-align: center;
}

.metric-label {
    font-size: 10px;
    color: #808080;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.metric-value {
    font-size: 24px;
    font-weight: 600;
    color: #569cd6;
    font-family: monospace;
    margin: 8px 0 4px 0;
}

.metric-unit {
    font-size: 11px;
    color: #999999;
}

/* Mermaid */
.mermaid-section {
    background: #252526;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #3c3c3c;
    margin-bottom: 16px;
    text-align: center;
}
`;