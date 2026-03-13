/**
 * 📊 SVN FILE ANALYTICS COMPONENT
 * Comprehensive file analysis with charts, timelines, and metrics
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

    constructor(container: HTMLElement) {
        this.container = container;
    }

    /**
     * Load analytics for a file
     */
    async loadAnalytics(filePath: string): Promise<void> {
        try {
            this.container.innerHTML = '<div class="loading">Loading analytics...</div>';
            
            // Fetch file history
            const history = await svnManager.getFileHistory(filePath);
            const analytics = await this.calculateAnalytics(filePath, history);
            
            this.analytics = analytics;
            this.render();
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.container.innerHTML = '<div class="error">Failed to load analytics</div>';
        }
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
            // Count contributors
            const author = commit.author || 'Unknown';
            analytics.contributors.set(author, (analytics.contributors.get(author) || 0) + 1);
            
            // Get diff stats
            const diff = await svnManager.getDiff(filePath, commit.revision);
            const stats = this.parseDiffStats(diff);
            
            analytics.linesAdded += stats.added;
            analytics.linesDeleted += stats.deleted;
            totalLines += stats.added + stats.deleted;
            
            // Track largest commit
            if (stats.added + stats.deleted > analytics.largestCommit.lines) {
                analytics.largestCommit = {
                    revision: commit.revision,
                    lines: stats.added + stats.deleted
                };
            }
            
            // Group by month
            const month = new Date(commit.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            analytics.commitsByMonth.set(month, (analytics.commitsByMonth.get(month) || 0) + 1);
        }

        // Calculate averages
        analytics.avgCommitSize = totalLines / history.length;
        analytics.churnRate = (analytics.linesAdded + analytics.linesDeleted) / Math.max(analytics.linesAdded - analytics.linesDeleted, 1);
        
        // Determine activity level
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
    private render(): void {
        if (!this.analytics) return;

        const a = this.analytics;
        const daysOld = Math.floor((Date.now() - a.initialCreated.getTime()) / (1000 * 60 * 60 * 24));
        const hoursAgo = Math.floor((Date.now() - a.latestChange.getTime()) / (1000 * 60 * 60));
        const primaryAuthor = Array.from(a.contributors.entries()).sort((x, y) => y[1] - x[1])[0];

        this.container.innerHTML = `
            <div class="file-analytics-dashboard">
                <!-- Header -->
                <div class="analytics-header">
                    <h2>📊 File Analytics</h2>
                    <div class="file-name">${this.escapeHtml(a.filePath)}</div>
                </div>

                <!-- Stats Grid -->
                <div class="analytics-stats-grid">
                    <div class="analytics-stat-card primary">
                        <div class="stat-label">📅 Initial Created</div>
                        <div class="stat-value">${daysOld}</div>
                        <div class="stat-detail">days ago (${a.initialCreated.toLocaleDateString()})</div>
                    </div>

                    <div class="analytics-stat-card success">
                        <div class="stat-label">🕐 Latest Change</div>
                        <div class="stat-value">${hoursAgo}h</div>
                        <div class="stat-detail">ago (${a.latestChange.toLocaleString()})</div>
                    </div>

                    <div class="analytics-stat-card warning">
                        <div class="stat-label">📝 Total Commits</div>
                        <div class="stat-value">${a.totalCommits}</div>
                        <div class="stat-detail">~${(a.totalCommits / Math.max(daysOld, 1)).toFixed(2)} commits/day</div>
                    </div>

                    <div class="analytics-stat-card danger">
                        <div class="stat-label">📏 Lines Changed</div>
                        <div class="stat-value">${a.linesAdded + a.linesDeleted}</div>
                        <div class="stat-detail">+${a.linesAdded} / -${a.linesDeleted} lines</div>
                    </div>

                    <div class="analytics-stat-card primary">
                        <div class="stat-label">👥 Contributors</div>
                        <div class="stat-value">${a.contributors.size}</div>
                        <div class="stat-detail">Primary: ${primaryAuthor?.[0] || 'Unknown'} (${Math.round((primaryAuthor?.[1] || 0) / a.totalCommits * 100)}%)</div>
                    </div>

                    <div class="analytics-stat-card success">
                        <div class="stat-label">🔥 Activity Level</div>
                        <div class="stat-value">${a.activityLevel}</div>
                        <div class="stat-detail">Churn rate: ${a.churnRate.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="analytics-charts">
                    <div class="chart-container">
                        <div class="chart-title">📈 Commits Over Time</div>
                        <canvas id="commits-timeline-chart"></canvas>
                    </div>

                    <div class="chart-container">
                        <div class="chart-title">📊 Lines Changed</div>
                        <div class="lines-bar-chart">
                            <div class="bar-item">
                                <div class="bar-label">Added</div>
                                <div class="bar" style="width: ${(a.linesAdded / (a.linesAdded + a.linesDeleted)) * 100}%; background: #4ec9b0;"></div>
                                <div class="bar-value">+${a.linesAdded}</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Deleted</div>
                                <div class="bar" style="width: ${(a.linesDeleted / (a.linesAdded + a.linesDeleted)) * 100}%; background: #f48771;"></div>
                                <div class="bar-value">-${a.linesDeleted}</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Net</div>
                                <div class="bar" style="width: ${((a.linesAdded - a.linesDeleted) / (a.linesAdded + a.linesDeleted)) * 100}%; background: #569cd6;"></div>
                                <div class="bar-value">+${a.linesAdded - a.linesDeleted}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Metrics Grid -->
                <div class="analytics-metrics">
                    <div class="metric-item">
                        <div class="metric-label">Avg Commit Size</div>
                        <div class="metric-value">${a.avgCommitSize.toFixed(1)}</div>
                        <div class="metric-unit">lines/commit</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Largest Commit</div>
                        <div class="metric-value">${a.largestCommit.lines}</div>
                        <div class="metric-unit">lines (r${a.largestCommit.revision})</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">File Age</div>
                        <div class="metric-value">${daysOld}</div>
                        <div class="metric-unit">days old</div>
                    </div>
                </div>

                <!-- Mermaid Diagrams -->
                <div class="mermaid-section">
                    <div class="chart-title">🌳 File Evolution</div>
                    <div class="mermaid">
                        graph TB
                            A[Initial Creation<br/>${a.initialCreated.toLocaleDateString()}<br/>Day 0] --> B[Early Development<br/>Month 1-3<br/>${this.getCommitCount(a.commitsByMonth, 0, 3)} commits]
                            B --> C[Maturation<br/>Month 4-6<br/>${this.getCommitCount(a.commitsByMonth, 3, 6)} commits]
                            C --> D[Stabilization<br/>Month 7-9<br/>${this.getCommitCount(a.commitsByMonth, 6, 9)} commits]
                            D --> E[Current State<br/>${a.latestChange.toLocaleDateString()}<br/>Day ${daysOld}]
                            
                            style E fill:#4ec9b0,stroke:#4ec9b0,color:#000
                            style A fill:#569cd6,stroke:#569cd6,color:#fff
                    </div>
                </div>

                <div class="mermaid-section">
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

        // Initialize Mermaid if available
        if (typeof (window as any).mermaid !== 'undefined') {
            (window as any).mermaid.init(undefined, this.container.querySelectorAll('.mermaid'));
        }
    }

    /**
     * Get commit count for a time range
     */
    private getCommitCount(commitsByMonth: Map<string, number>, startMonth: number, endMonth: number): number {
        let count = 0;
        Array.from(commitsByMonth.values()).slice(startMonth, endMonth).forEach(c => count += c);
        return count;
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

// CSS for analytics view
export const FILE_ANALYTICS_CSS = `
.file-analytics-dashboard {
    background: #1e1e1e;
    padding: 20px;
    border-radius: 8px;
}

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
    transition: width 0.3s;
}

.bar-value {
    min-width: 60px;
    font-size: 12px;
    color: #cccccc;
    font-family: monospace;
    text-align: right;
}

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

.mermaid-section {
    background: #252526;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #3c3c3c;
    margin-bottom: 16px;
    text-align: center;
}
`;