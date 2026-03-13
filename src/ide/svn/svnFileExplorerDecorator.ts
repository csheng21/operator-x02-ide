// src/ide/svn/svnFileExplorerDecorator.ts
// IMPROVED VERSION - Professional UI with multiple style options

import { svnManager } from './svnManager';

// UI Style Configuration - Choose your preferred style
type DecoratorStyle = 'vscode' | 'minimal' | 'badge' | 'gutter' | 'icon';

export class SvnFileExplorerDecorator {
    private static instance: SvnFileExplorerDecorator;
    private statusMap: Map<string, string> = new Map();
    private updateInterval: number | null = null;
    
    // 🎨 CHANGE THIS to switch UI styles: 'vscode' | 'minimal' | 'badge' | 'gutter' | 'icon'
    private currentStyle: DecoratorStyle = 'vscode'; // Default: VS Code style

    private constructor() {}

    static getInstance(): SvnFileExplorerDecorator {
        if (!SvnFileExplorerDecorator.instance) {
            SvnFileExplorerDecorator.instance = new SvnFileExplorerDecorator();
        }
        return SvnFileExplorerDecorator.instance;
    }

    /**
     * Change decorator style dynamically
     */
    public setStyle(style: DecoratorStyle): void {
        console.log(`🎨 Switching to ${style} style`);
        this.currentStyle = style;
        this.updateFileExplorer();
    }

    /**
     * Initialize the decorator
     */
    initialize(): void {
        console.log('🎨 Initializing SVN File Explorer Decorator (Improved)...');
        
        // Add CSS styles
        this.addStyles();
        
        // Start periodic updates
        this.startPeriodicUpdate();
        
        // Listen for SVN status changes
        this.setupEventListeners();
        
        console.log(`✅ SVN File Explorer Decorator initialized with '${this.currentStyle}' style`);
    }

    /**
     * Add CSS styles for all UI variations
     */
    private addStyles(): void {
        const styleId = 'svn-file-decorator-styles';
        
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ========================================== */
            /* VS CODE STYLE - Clean and professional */
            /* ========================================== */
            .file-item .svn-indicator-vscode {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 14px;
                height: 14px;
                margin-right: 6px;
                font-size: 9px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                flex-shrink: 0;
            }

            .file-item .svn-indicator-vscode.modified {
                color: #4ec9b0;
            }

            .file-item .svn-indicator-vscode.added {
                color: #89d185;
            }

            .file-item .svn-indicator-vscode.deleted {
                color: #f48771;
            }

            .file-item .svn-indicator-vscode.conflicted {
                color: #ffc107;
            }

            /* VS Code style file name colors (subtle) */
            .file-item[data-svn-status="modified"] .file-name {
                color: #4ec9b0 !important;
            }

            .file-item[data-svn-status="added"] .file-name {
                color: #89d185 !important;
            }

            .file-item[data-svn-status="deleted"] .file-name {
                color: #f48771 !important;
                text-decoration: line-through;
            }

            .file-item[data-svn-status="conflicted"] .file-name {
                color: #ffc107 !important;
            }

            /* ========================================== */
            /* MINIMAL STYLE - Just small dots */
            /* ========================================== */
            .file-item .svn-indicator-minimal {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                margin-right: 8px;
                flex-shrink: 0;
            }

            .file-item .svn-indicator-minimal.modified {
                background: #4ec9b0;
            }

            .file-item .svn-indicator-minimal.added {
                background: #89d185;
            }

            .file-item .svn-indicator-minimal.deleted {
                background: #f48771;
            }

            .file-item .svn-indicator-minimal.conflicted {
                background: #ffc107;
                animation: pulse-minimal 1.5s ease-in-out infinite;
            }

            @keyframes pulse-minimal {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.3); }
            }

            /* ========================================== */
            /* BADGE STYLE - Small rounded badges */
            /* ========================================== */
            .file-item .svn-indicator-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 16px;
                height: 16px;
                padding: 0 4px;
                margin-right: 6px;
                font-size: 9px;
                font-weight: 700;
                border-radius: 3px;
                flex-shrink: 0;
            }

            .file-item .svn-indicator-badge.modified {
                background: rgba(78, 201, 176, 0.2);
                color: #4ec9b0;
                border: 1px solid #4ec9b0;
            }

            .file-item .svn-indicator-badge.added {
                background: rgba(137, 209, 133, 0.2);
                color: #89d185;
                border: 1px solid #89d185;
            }

            .file-item .svn-indicator-badge.deleted {
                background: rgba(244, 135, 113, 0.2);
                color: #f48771;
                border: 1px solid #f48771;
            }

            .file-item .svn-indicator-badge.conflicted {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
                border: 1px solid #ffc107;
            }

            /* ========================================== */
            /* GUTTER STYLE - Git-style left bar */
            /* ========================================== */
            .file-item.svn-gutter {
                position: relative;
                padding-left: 8px !important;
            }

            .file-item.svn-gutter::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                border-radius: 0 2px 2px 0;
            }

            .file-item.svn-gutter[data-svn-status="modified"]::before {
                background: #4ec9b0;
            }

            .file-item.svn-gutter[data-svn-status="added"]::before {
                background: #89d185;
            }

            .file-item.svn-gutter[data-svn-status="deleted"]::before {
                background: #f48771;
            }

            .file-item.svn-gutter[data-svn-status="conflicted"]::before {
                background: #ffc107;
                animation: pulse-gutter 1.5s ease-in-out infinite;
            }

            @keyframes pulse-gutter {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            /* ========================================== */
            /* ICON STYLE - Icon + colored text */
            /* ========================================== */
            .file-item .svn-indicator-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                margin-right: 6px;
                flex-shrink: 0;
            }

            .file-item .svn-indicator-icon svg {
                width: 12px;
                height: 12px;
            }

            .file-item .svn-indicator-icon.modified svg {
                fill: #4ec9b0;
            }

            .file-item .svn-indicator-icon.added svg {
                fill: #89d185;
            }

            .file-item .svn-indicator-icon.deleted svg {
                fill: #f48771;
            }

            .file-item .svn-indicator-icon.conflicted svg {
                fill: #ffc107;
            }

            /* ========================================== */
            /* COMMON STYLES */
            /* ========================================== */
            
            /* Hover effect for all styles */
            .file-item:hover {
                background: rgba(255, 255, 255, 0.05) !important;
            }

            /* Ensure file items have proper layout */
            .file-item {
                display: flex;
                align-items: center;
            }
        `;

        document.head.appendChild(style);
        console.log('✅ SVN decorator styles added (all variations)');
    }

    /**
     * Setup event listeners for SVN changes
     */
    private setupEventListeners(): void {
        document.addEventListener('svn-status-updated', (event: any) => {
            console.log('🔄 SVN status updated, refreshing decorators...');
            this.updateFileExplorer();
        });

        document.addEventListener('file-tree-refresh', () => {
            console.log('🌳 File tree refreshed, updating SVN decorators...');
            setTimeout(() => this.updateFileExplorer(), 500);
        });
    }

    /**
     * Start periodic updates
     */
    private startPeriodicUpdate(): void {
        this.updateInterval = window.setInterval(() => {
            this.updateFileExplorer();
        }, 5000);
    }

    /**
     * Stop periodic updates
     */
    stopPeriodicUpdate(): void {
        if (this.updateInterval !== null) {
            window.clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update SVN status map from svnManager
     */
    async updateStatusMap(): Promise<void> {
        try {
            const statuses = await svnManager.getStatus();
            
            if (!statuses || statuses.length === 0) {
                this.statusMap.clear();
                return;
            }

            this.statusMap.clear();

            statuses.forEach((status: any) => {
                const fileName = this.getFileName(status.path);
                const statusChar = status.status || status.status_char || '?';
                
                let statusType = 'unknown';
                
                switch (statusChar) {
                    case 'M':
                        statusType = 'modified';
                        break;
                    case 'A':
                        statusType = 'added';
                        break;
                    case 'D':
                        statusType = 'deleted';
                        break;
                    case 'C':
                        statusType = 'conflicted';
                        break;
                    case '?':
                        statusType = 'unversioned';
                        break;
                }

                this.statusMap.set(fileName, statusType);
                this.statusMap.set(status.path, statusType);
            });

            console.log(`📊 Status map updated: ${this.statusMap.size} files tracked`);
        } catch (error) {
            console.error('Error updating status map:', error);
        }
    }

    /**
     * Update file explorer with SVN indicators
     */
    async updateFileExplorer(): Promise<void> {
        try {
            await this.updateStatusMap();

            const fileItems = document.querySelectorAll('.file-item');
            
            if (fileItems.length === 0) {
                return;
            }

            let updatedCount = 0;

            fileItems.forEach((fileItem: Element) => {
                const htmlElement = fileItem as HTMLElement;
                
                if (htmlElement.classList.contains('folder-item') || 
                    htmlElement.classList.contains('directory')) {
                    return;
                }

                const fileName = this.getFileNameFromElement(htmlElement);
                
                if (!fileName) {
                    return;
                }

                const status = this.getStatusForFile(fileName);
                
                if (status && status !== 'unknown') {
                    this.addStatusIndicator(htmlElement, status);
                    updatedCount++;
                } else {
                    this.removeStatusIndicator(htmlElement);
                }
            });

            if (updatedCount > 0) {
                console.log(`✅ Updated ${updatedCount} file indicators (${this.currentStyle} style)`);
            }
        } catch (error) {
            console.error('Error updating file explorer:', error);
        }
    }

    /**
     * Add status indicator based on current style
     */
    private addStatusIndicator(fileElement: HTMLElement, status: string): void {
        this.removeStatusIndicator(fileElement);
        fileElement.setAttribute('data-svn-status', status);

        switch (this.currentStyle) {
            case 'vscode':
                this.addVSCodeIndicator(fileElement, status);
                break;
            case 'minimal':
                this.addMinimalIndicator(fileElement, status);
                break;
            case 'badge':
                this.addBadgeIndicator(fileElement, status);
                break;
            case 'gutter':
                this.addGutterIndicator(fileElement, status);
                break;
            case 'icon':
                this.addIconIndicator(fileElement, status);
                break;
        }
    }

    /**
     * VS Code style: Letter on the left, colored filename
     */
    private addVSCodeIndicator(fileElement: HTMLElement, status: string): void {
        const indicator = document.createElement('span');
        indicator.className = `svn-indicator-vscode ${status}`;
        indicator.textContent = this.getStatusLetter(status);
        indicator.title = `SVN: ${this.getStatusText(status)}`;

        // Insert at the beginning
        const firstChild = fileElement.firstChild;
        if (firstChild) {
            fileElement.insertBefore(indicator, firstChild);
        } else {
            fileElement.appendChild(indicator);
        }
    }

    /**
     * Minimal style: Just a small dot
     */
    private addMinimalIndicator(fileElement: HTMLElement, status: string): void {
        const indicator = document.createElement('span');
        indicator.className = `svn-indicator-minimal ${status}`;
        indicator.title = `SVN: ${this.getStatusText(status)}`;

        const firstChild = fileElement.firstChild;
        if (firstChild) {
            fileElement.insertBefore(indicator, firstChild);
        } else {
            fileElement.appendChild(indicator);
        }
    }

    /**
     * Badge style: Small rounded badge with letter
     */
    private addBadgeIndicator(fileElement: HTMLElement, status: string): void {
        const indicator = document.createElement('span');
        indicator.className = `svn-indicator-badge ${status}`;
        indicator.textContent = this.getStatusLetter(status);
        indicator.title = `SVN: ${this.getStatusText(status)}`;

        const firstChild = fileElement.firstChild;
        if (firstChild) {
            fileElement.insertBefore(indicator, firstChild);
        } else {
            fileElement.appendChild(indicator);
        }
    }

    /**
     * Gutter style: Colored bar on the left
     */
    private addGutterIndicator(fileElement: HTMLElement, status: string): void {
        fileElement.classList.add('svn-gutter');
    }

    /**
     * Icon style: SVG icon
     */
    private addIconIndicator(fileElement: HTMLElement, status: string): void {
        const indicator = document.createElement('span');
        indicator.className = `svn-indicator-icon ${status}`;
        indicator.title = `SVN: ${this.getStatusText(status)}`;
        
        // SVG icons for different statuses
        const icons = {
            modified: '<svg viewBox="0 0 16 16"><path d="M13 3L8 13L3 3h10z"/></svg>',
            added: '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></svg>',
            deleted: '<svg viewBox="0 0 16 16"><path d="M3 8h10"/></svg>',
            conflicted: '<svg viewBox="0 0 16 16"><path d="M8 3l2 5-2 5-2-5z"/></svg>'
        };

        indicator.innerHTML = icons[status as keyof typeof icons] || icons.modified;

        const firstChild = fileElement.firstChild;
        if (firstChild) {
            fileElement.insertBefore(indicator, firstChild);
        } else {
            fileElement.appendChild(indicator);
        }
    }

    /**
     * Remove status indicator
     */
    private removeStatusIndicator(fileElement: HTMLElement): void {
        // Remove all types of indicators
        const indicators = fileElement.querySelectorAll(
            '.svn-indicator-vscode, .svn-indicator-minimal, .svn-indicator-badge, .svn-indicator-icon'
        );
        indicators.forEach(ind => ind.remove());
        
        fileElement.classList.remove('svn-gutter');
        fileElement.removeAttribute('data-svn-status');
    }

    /**
     * Get file name from element
     */
    private getFileNameFromElement(element: HTMLElement): string | null {
        const dataPath = element.getAttribute('data-path') || 
                        element.getAttribute('data-full-path') ||
                        element.getAttribute('data-file-path');
        
        if (dataPath) {
            return this.getFileName(dataPath);
        }

        const nameElement = element.querySelector('.file-name');
        if (nameElement && nameElement.textContent) {
            return nameElement.textContent.trim();
        }

        const textContent = element.textContent?.trim();
        if (textContent) {
            return textContent.split(/\s+/)[0];
        }

        return null;
    }

    /**
     * Get status for file
     */
    private getStatusForFile(fileName: string): string | null {
        if (this.statusMap.has(fileName)) {
            return this.statusMap.get(fileName) || null;
        }

        for (const [path, status] of this.statusMap.entries()) {
            if (path.endsWith(fileName) || path.endsWith(`\\${fileName}`) || path.endsWith(`/${fileName}`)) {
                return status;
            }
        }

        return null;
    }

    /**
     * Get file name from path
     */
    private getFileName(path: string): string {
        const parts = path.split(/[\\/]/);
        return parts[parts.length - 1];
    }

    /**
     * Get status letter
     */
    private getStatusLetter(status: string): string {
        const letters: { [key: string]: string } = {
            'modified': 'M',
            'added': 'A',
            'deleted': 'D',
            'conflicted': 'C',
            'unversioned': '?'
        };
        return letters[status] || '?';
    }

    /**
     * Get status text
     */
    private getStatusText(status: string): string {
        const texts: { [key: string]: string } = {
            'modified': 'Modified',
            'added': 'Added',
            'deleted': 'Deleted',
            'conflicted': 'Conflicted',
            'unversioned': 'Unversioned'
        };
        return texts[status] || 'Unknown';
    }

    /**
     * Force immediate update
     */
    async forceUpdate(): Promise<void> {
        console.log('🔄 Force updating SVN file decorators...');
        await this.updateFileExplorer();
    }

    /**
     * Cleanup
     */
    cleanup(): void {
        this.stopPeriodicUpdate();
        this.statusMap.clear();
    }
}

// Export singleton instance
export const svnFileExplorerDecorator = SvnFileExplorerDecorator.getInstance();

// Expose style switcher to window for easy testing
(window as any).setSVNStyle = (style: DecoratorStyle) => {
    svnFileExplorerDecorator.setStyle(style);
    console.log(`🎨 Switched to ${style} style. Try: 'vscode', 'minimal', 'badge', 'gutter', 'icon'`);
};