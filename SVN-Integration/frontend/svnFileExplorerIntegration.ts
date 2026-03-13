// src/ide/svn/svnFileExplorerIntegration.ts
// Integrate SVN status indicators into file explorer

import { svnManager, SvnFileStatus } from './svnManager';

export class SvnFileExplorerIntegration {
    private static instance: SvnFileExplorerIntegration;
    private fileStatusMap: Map<string, string> = new Map();

    private constructor() {
        this.initialize();
    }

    static getInstance(): SvnFileExplorerIntegration {
        if (!SvnFileExplorerIntegration.instance) {
            SvnFileExplorerIntegration.instance = new SvnFileExplorerIntegration();
        }
        return SvnFileExplorerIntegration.instance;
    }

    // Initialize integration
    private initialize(): void {
        // Subscribe to SVN status changes
        svnManager.onStatusChange((statuses) => {
            this.updateFileStatuses(statuses);
        });
    }

    // Update file statuses
    private updateFileStatuses(statuses: SvnFileStatus[]): void {
        // Clear old statuses
        this.fileStatusMap.clear();

        // Update map
        statuses.forEach(status => {
            this.fileStatusMap.set(status.path, status.status);
        });

        // Update file explorer UI
        this.updateFileExplorerUI();
    }

    // Update file explorer UI with SVN status indicators
    private updateFileExplorerUI(): void {
        // Find all file items in the explorer
        const fileItems = document.querySelectorAll('.file-item, .folder-item');

        fileItems.forEach(item => {
            const filePath = item.getAttribute('data-path');
            if (!filePath) return;

            // Remove existing status indicator
            const existingStatus = item.querySelector('.svn-status');
            if (existingStatus) {
                existingStatus.remove();
            }

            // Get normalized path for comparison
            const normalizedPath = this.normalizePath(filePath);
            
            // Check if this file has SVN status
            let matchedStatus = null;
            for (const [statusPath, status] of this.fileStatusMap.entries()) {
                const normalizedStatusPath = this.normalizePath(statusPath);
                if (normalizedPath.endsWith(normalizedStatusPath) || normalizedStatusPath.endsWith(normalizedPath)) {
                    matchedStatus = status;
                    break;
                }
            }

            if (matchedStatus && matchedStatus !== ' ') {
                // Add status indicator
                const statusIndicator = this.createStatusIndicator(matchedStatus);
                if (statusIndicator) {
                    // Insert after the file name
                    const fileNameEl = item.querySelector('.file-name, .folder-name');
                    if (fileNameEl) {
                        fileNameEl.appendChild(statusIndicator);
                    }
                }
            }
        });
    }

    // Create status indicator element
    private createStatusIndicator(status: string): HTMLElement | null {
        const statusInfo = svnManager.getStatusIcon(status);
        if (!statusInfo.icon) return null;

        const indicator = document.createElement('span');
        indicator.className = `svn-status ${this.getStatusClass(status)}`;
        indicator.style.backgroundColor = statusInfo.color;
        indicator.title = `SVN: ${statusInfo.label}`;
        
        return indicator;
    }

    // Get CSS class for status
    private getStatusClass(status: string): string {
        const classMap: Record<string, string> = {
            'M': 'modified',
            'A': 'added',
            'D': 'deleted',
            'C': 'conflicted',
            '?': 'unversioned',
            '!': 'missing',
            'R': 'replaced'
        };

        return classMap[status] || 'unknown';
    }

    // Normalize path for comparison
    private normalizePath(path: string): string {
        return path.replace(/\\/g, '/').toLowerCase();
    }

    // Add SVN context menu items to file explorer
    addContextMenuItems(filePath: string, menu: HTMLElement): void {
        // Get status for this file
        const status = this.getFileStatus(filePath);

        if (!status) {
            // Not in SVN working copy
            return;
        }

        // Add separator
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        menu.appendChild(separator);

        // SVN submenu
        const svnMenu = this.createSvnSubmenu(filePath, status);
        menu.appendChild(svnMenu);
    }

    // Create SVN submenu
    private createSvnSubmenu(filePath: string, status: string): HTMLElement {
        const submenu = document.createElement('div');
        submenu.className = 'menu-item submenu';
        submenu.innerHTML = `
            <span>SVN</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
        `;

        const submenuItems = document.createElement('div');
        submenuItems.className = 'submenu-items';

        // Add items based on status
        if (status === 'M' || status === 'A' || status === 'D') {
            // Modified, Added, or Deleted
            submenuItems.appendChild(this.createMenuItem('View Diff', () => {
                this.showDiff(filePath);
            }));
            submenuItems.appendChild(this.createMenuItem('Revert Changes', () => {
                this.revertFile(filePath);
            }));
            submenuItems.appendChild(this.createMenuItem('Commit...', () => {
                this.commitFile(filePath);
            }));
        } else if (status === 'C') {
            // Conflicted
            submenuItems.appendChild(this.createMenuItem('Resolve - Use Mine', () => {
                this.resolveConflict(filePath, 'mine-full');
            }));
            submenuItems.appendChild(this.createMenuItem('Resolve - Use Theirs', () => {
                this.resolveConflict(filePath, 'theirs-full');
            }));
            submenuItems.appendChild(this.createMenuItem('Mark as Resolved', () => {
                this.resolveConflict(filePath, 'working');
            }));
        } else if (status === '?') {
            // Unversioned
            submenuItems.appendChild(this.createMenuItem('Add to SVN', () => {
                this.addFile(filePath);
            }));
        }

        // Common items
        submenuItems.appendChild(this.createMenuSeparator());
        submenuItems.appendChild(this.createMenuItem('Show Log', () => {
            this.showLog(filePath);
        }));

        // TortoiseSVN integration (Windows only)
        if (this.isWindows()) {
            submenuItems.appendChild(this.createMenuSeparator());
            submenuItems.appendChild(this.createMenuItem('TortoiseSVN...', () => {
                this.openTortoiseSVN(filePath);
            }));
        }

        submenu.appendChild(submenuItems);

        // Show/hide submenu on hover
        submenu.addEventListener('mouseenter', () => {
            submenuItems.style.display = 'block';
        });
        submenu.addEventListener('mouseleave', () => {
            submenuItems.style.display = 'none';
        });

        return submenu;
    }

    // Create menu item
    private createMenuItem(label: string, onClick: () => void): HTMLElement {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = label;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return item;
    }

    // Create menu separator
    private createMenuSeparator(): HTMLElement {
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        return separator;
    }

    // Get file status
    private getFileStatus(filePath: string): string | null {
        const normalizedPath = this.normalizePath(filePath);
        
        for (const [statusPath, status] of this.fileStatusMap.entries()) {
            const normalizedStatusPath = this.normalizePath(statusPath);
            if (normalizedPath.endsWith(normalizedStatusPath) || normalizedStatusPath.endsWith(normalizedPath)) {
                return status;
            }
        }

        return null;
    }

    // Show diff for file
    private async showDiff(filePath: string): Promise<void> {
        try {
            const { showSvnDiffViewer } = await import('./svnDiffViewer');
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
        } catch (error) {
            alert('Revert failed: ' + error);
        }
    }

    // Commit file
    private async commitFile(filePath: string): Promise<void> {
        const message = prompt('Enter commit message:');
        if (!message) return;

        try {
            await svnManager.commit(message, [filePath]);
            alert('File committed successfully');
        } catch (error) {
            alert('Commit failed: ' + error);
        }
    }

    // Resolve conflict
    private async resolveConflict(filePath: string, resolution: string): Promise<void> {
        try {
            await svnManager.resolve(filePath, resolution);
            alert('Conflict resolved');
        } catch (error) {
            alert('Resolve failed: ' + error);
        }
    }

    // Add file to SVN
    private async addFile(filePath: string): Promise<void> {
        try {
            await svnManager.add([filePath]);
            alert('File added to SVN');
        } catch (error) {
            alert('Add failed: ' + error);
        }
    }

    // Show log for file
    private async showLog(filePath: string): Promise<void> {
        try {
            const entries = await svnManager.getLog(filePath, 20);
            console.log('Log entries:', entries);
            alert('Log viewer coming soon!\nCheck console for log entries.');
        } catch (error) {
            alert('Failed to get log: ' + error);
        }
    }

    // Open TortoiseSVN
    private async openTortoiseSVN(filePath: string): Promise<void> {
        try {
            await svnManager.openTortoiseSVN('commit', filePath);
        } catch (error) {
            alert('Failed to open TortoiseSVN: ' + error);
        }
    }

    // Check if Windows
    private isWindows(): boolean {
        return navigator.platform.toLowerCase().includes('win');
    }

    // Get file name from path
    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    // Force refresh file explorer
    refreshFileExplorer(): void {
        this.updateFileExplorerUI();
    }
}

// Export singleton instance
export const svnFileExplorerIntegration = SvnFileExplorerIntegration.getInstance();
