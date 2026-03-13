// src/ide/svn/svnManager.ts
// Core SVN management and operations

import { invoke } from '@tauri-apps/api/core';

export interface SvnFileStatus {
    path: string;
    status: string;
    props_status: string;
}

export interface SvnInfo {
    url: string;
    repository_root: string;
    repository_uuid: string;
    revision: string;
    node_kind: string;
    last_changed_author: string;
    last_changed_rev: string;
    last_changed_date: string;
}

export interface SvnLogEntry {
    revision: string;
    author: string;
    date: string;
    message: string;
    paths: string[];
}

export class SvnManager {
    private static instance: SvnManager;
    private currentPath: string = '';
    private statusCache: Map<string, SvnFileStatus> = new Map();
    private autoRefreshInterval: number | null = null;
    private statusListeners: Array<(statuses: SvnFileStatus[]) => void> = [];
    private isSvnInstalled: boolean = false;

    private constructor() {
        this.checkSvnInstalled();
    }

    static getInstance(): SvnManager {
        if (!SvnManager.instance) {
            SvnManager.instance = new SvnManager();
        }
        return SvnManager.instance;
    }

    // Check if SVN is installed
    async checkSvnInstalled(): Promise<boolean> {
        try {
            this.isSvnInstalled = await invoke<boolean>('svn_check_installed');
            return this.isSvnInstalled;
        } catch (error) {
            console.error('Error checking SVN installation:', error);
            this.isSvnInstalled = false;
            return false;
        }
    }

    getSvnInstalled(): boolean {
        return this.isSvnInstalled;
    }

    // Set current working path
    setCurrentPath(path: string) {
        this.currentPath = path;
        this.refreshStatus();
    }

    getCurrentPath(): string {
        return this.currentPath;
    }

    // Get status for a path
    async getStatus(path?: string): Promise<SvnFileStatus[]> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            return [];
        }

        try {
            const statuses = await invoke<SvnFileStatus[]>('svn_status', { path: targetPath });
            
            // Update cache
            this.statusCache.clear();
            statuses.forEach(status => {
                this.statusCache.set(status.path, status);
            });

            // Notify listeners
            this.notifyStatusListeners(statuses);

            return statuses;
        } catch (error) {
            console.error('Error getting SVN status:', error);
            return [];
        }
    }

    // Get info for a path
    async getInfo(path?: string): Promise<SvnInfo | null> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            return null;
        }

        try {
            return await invoke<SvnInfo>('svn_info', { path: targetPath });
        } catch (error) {
            console.error('Error getting SVN info:', error);
            return null;
        }
    }

    // Commit files
    async commit(message: string, files: string[] = []): Promise<string> {
        if (!this.currentPath) {
            throw new Error('No current path set');
        }

        try {
            const result = await invoke<string>('svn_commit', {
                path: this.currentPath,
                message,
                files
            });
            
            // Refresh status after commit
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Commit failed: ${error}`);
        }
    }

    // Update working copy
    async update(path?: string): Promise<string> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            throw new Error('No path specified');
        }

        try {
            const result = await invoke<string>('svn_update', { path: targetPath });
            
            // Refresh status after update
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Update failed: ${error}`);
        }
    }

    // Revert files
    async revert(files: string[]): Promise<string> {
        if (files.length === 0) {
            throw new Error('No files specified');
        }

        try {
            const result = await invoke<string>('svn_revert', { files });
            
            // Refresh status after revert
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Revert failed: ${error}`);
        }
    }

    // Add files to SVN
    async add(files: string[]): Promise<string> {
        if (files.length === 0) {
            throw new Error('No files specified');
        }

        try {
            const result = await invoke<string>('svn_add', { files });
            
            // Refresh status after add
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Add failed: ${error}`);
        }
    }

    // Delete files from SVN
    async delete(files: string[]): Promise<string> {
        if (files.length === 0) {
            throw new Error('No files specified');
        }

        try {
            const result = await invoke<string>('svn_delete', { files });
            
            // Refresh status after delete
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Delete failed: ${error}`);
        }
    }

    // Get diff for a file
    async getDiff(filePath: string): Promise<string> {
        try {
            return await invoke<string>('svn_diff', { filePath });
        } catch (error) {
            throw new Error(`Failed to get diff: ${error}`);
        }
    }

    // Get log entries
    async getLog(path?: string, limit: number = 50): Promise<SvnLogEntry[]> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            return [];
        }

        try {
            return await invoke<SvnLogEntry[]>('svn_log', { path: targetPath, limit });
        } catch (error) {
            console.error('Error getting SVN log:', error);
            return [];
        }
    }

    // Resolve conflicts
    async resolve(file: string, resolution: string): Promise<string> {
        try {
            const result = await invoke<string>('svn_resolve', { file, resolution });
            
            // Refresh status after resolve
            await this.refreshStatus();
            
            return result;
        } catch (error) {
            throw new Error(`Resolve failed: ${error}`);
        }
    }

    // Get file content at specific revision
    async getFileAtRevision(filePath: string, revision: string): Promise<string> {
        try {
            return await invoke<string>('svn_cat', { filePath, revision });
        } catch (error) {
            throw new Error(`Failed to get file content: ${error}`);
        }
    }

    // Open TortoiseSVN
    async openTortoiseSVN(action: string, path?: string): Promise<void> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            throw new Error('No path specified');
        }

        try {
            await invoke('open_tortoise_svn', { action, path: targetPath });
        } catch (error) {
            throw new Error(`Failed to open TortoiseSVN: ${error}`);
        }
    }

    // Cleanup working copy
    async cleanup(path?: string): Promise<string> {
        const targetPath = path || this.currentPath;
        if (!targetPath) {
            throw new Error('No path specified');
        }

        try {
            return await invoke<string>('svn_cleanup', { path: targetPath });
        } catch (error) {
            throw new Error(`Cleanup failed: ${error}`);
        }
    }

    // Get status for specific file from cache
    getFileStatus(filePath: string): SvnFileStatus | undefined {
        return this.statusCache.get(filePath);
    }

    // Get status icon/color for file
    getStatusIcon(status: string): { icon: string; color: string; label: string } {
        const statusMap: Record<string, { icon: string; color: string; label: string }> = {
            'M': { icon: '●', color: '#007acc', label: 'Modified' },
            'A': { icon: '●', color: '#28a745', label: 'Added' },
            'D': { icon: '●', color: '#dc3545', label: 'Deleted' },
            'C': { icon: '⚠', color: '#ffc107', label: 'Conflicted' },
            '?': { icon: '●', color: '#6c757d', label: 'Unversioned' },
            '!': { icon: '●', color: '#fd7e14', label: 'Missing' },
            'R': { icon: '●', color: '#17a2b8', label: 'Replaced' },
            'I': { icon: '●', color: '#868e96', label: 'Ignored' },
            '~': { icon: '●', color: '#e83e8c', label: 'Type Changed' },
        };

        return statusMap[status] || { icon: '', color: '', label: 'Unknown' };
    }

    // Refresh status
    async refreshStatus(): Promise<void> {
        if (this.currentPath) {
            await this.getStatus(this.currentPath);
        }
    }

    // Start auto-refresh
    startAutoRefresh(intervalMs: number = 5000): void {
        this.stopAutoRefresh();
        this.autoRefreshInterval = window.setInterval(() => {
            this.refreshStatus();
        }, intervalMs);
    }

    // Stop auto-refresh
    stopAutoRefresh(): void {
        if (this.autoRefreshInterval !== null) {
            window.clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    // Subscribe to status changes
    onStatusChange(listener: (statuses: SvnFileStatus[]) => void): () => void {
        this.statusListeners.push(listener);
        return () => {
            const index = this.statusListeners.indexOf(listener);
            if (index > -1) {
                this.statusListeners.splice(index, 1);
            }
        };
    }

    // Notify status listeners
    private notifyStatusListeners(statuses: SvnFileStatus[]): void {
        this.statusListeners.forEach(listener => {
            try {
                listener(statuses);
            } catch (error) {
                console.error('Error in status listener:', error);
            }
        });
    }

    // Get changes count
    getChangesCount(): number {
        let count = 0;
        this.statusCache.forEach(status => {
            if (status.status !== ' ' && status.status !== '?') {
                count++;
            }
        });
        return count;
    }

    // Get unversioned count
    getUnversionedCount(): number {
        let count = 0;
        this.statusCache.forEach(status => {
            if (status.status === '?') {
                count++;
            }
        });
        return count;
    }

    // Get conflicts count
    getConflictsCount(): number {
        let count = 0;
        this.statusCache.forEach(status => {
            if (status.status === 'C') {
                count++;
            }
        });
        return count;
    }

    // Get changes by status
    getChangesByStatus(statusType: string): SvnFileStatus[] {
        const changes: SvnFileStatus[] = [];
        this.statusCache.forEach(status => {
            if (status.status === statusType) {
                changes.push(status);
            }
        });
        return changes;
    }

    // Get all changes
    getAllChanges(): SvnFileStatus[] {
        const changes: SvnFileStatus[] = [];
        this.statusCache.forEach(status => {
            if (status.status !== ' ' && status.status !== '?') {
                changes.push(status);
            }
        });
        return changes;
    }
}

// Export singleton instance
export const svnManager = SvnManager.getInstance();
