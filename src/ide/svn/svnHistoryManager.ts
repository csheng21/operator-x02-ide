/**
 * 📜 SVN History Manager
 * Handles all history-related operations using existing svnManager
 */

import { svnManager, SvnLogEntry } from './svnManager';
import { invoke } from '@tauri-apps/api/core';

export interface SvnChangedPath {
    action: 'M' | 'A' | 'D' | 'R';  // Modified, Added, Deleted, Replaced
    path: string;
    copyFromPath?: string;
    copyFromRev?: number;
}

export interface SvnRevisionDetails {
    revision: number;
    author: string;
    date: string;
    message: string;
    changedFiles: SvnChangedPath[];
    diffContent?: string;
}

export class SvnHistoryManager {
    private static instance: SvnHistoryManager;
    private currentPath: string = '';
    private logCache: Map<string, SvnLogEntry[]> = new Map();

    private constructor() {}

    static getInstance(): SvnHistoryManager {
        if (!SvnHistoryManager.instance) {
            SvnHistoryManager.instance = new SvnHistoryManager();
        }
        return SvnHistoryManager.instance;
    }

    setCurrentPath(path: string): void {
        this.currentPath = path;
        console.log('📂 History manager path set to:', path);
    }

    /**
     * Get the working path - tries multiple sources
     */
    private getWorkingPath(): string {
        // Try current path
        if (this.currentPath) {
            return this.currentPath;
        }

        // Try to get from svnManager
        const svnPath = (svnManager as any).currentPath;
        if (svnPath) {
            console.log('📂 Using svnManager path:', svnPath);
            return svnPath;
        }

        // Try to get from localStorage
        const savedPath = localStorage.getItem('currentProjectPath');
        if (savedPath) {
            console.log('📂 Using saved project path:', savedPath);
            return savedPath;
        }

        // Last resort - try current working directory
        console.warn('⚠️ No SVN path set, using current directory');
        return '.';
    }

    /**
     * Get commit history (log) - uses existing svnManager.getLog()
     */
    async getLog(limit: number = 50, startRevision?: number): Promise<SvnLogEntry[]> {
        try {
            const workingPath = this.getWorkingPath();
            console.log(`📜 Getting SVN log for: "${workingPath}" (limit: ${limit})`);

            const cacheKey = `${workingPath}-${limit}-${startRevision || 'HEAD'}`;
            
            // Check cache
            if (this.logCache.has(cacheKey)) {
                console.log('✅ Using cached log');
                return this.logCache.get(cacheKey)!;
            }

            // Use existing svnManager.getLog() method
            console.log('🔄 Calling svnManager.getLog...');
            const entries = await svnManager.getLog(workingPath, limit);
            
            console.log(`📊 Received ${entries ? entries.length : 0} entries`);
            
            if (!entries) {
                console.error('❌ svnManager.getLog returned undefined');
                return [];
            }

            if (entries.length === 0) {
                console.warn('⚠️ No log entries found. Is this an SVN repository?');
                return [];
            }
            
            // Cache the result
            this.logCache.set(cacheKey, entries);
            
            console.log(`✅ Got ${entries.length} log entries`);
            return entries;

        } catch (error) {
            console.error('❌ Failed to get log:', error);
            // Return empty array instead of throwing to prevent UI crash
            return [];
        }
    }

    /**
     * Get log for a specific file
     */
    async getFileHistory(filePath: string, limit: number = 50): Promise<SvnLogEntry[]> {
        try {
            console.log(`📝 Getting file history for: ${filePath}`);
            const entries = await svnManager.getLog(filePath, limit);
            
            if (!entries) {
                console.error('❌ File history returned undefined');
                return [];
            }
            
            console.log(`✅ Got ${entries.length} entries for file`);
            return entries;
        } catch (error) {
            console.error('❌ Failed to get file history:', error);
            return [];
        }
    }

    /**
     * Get detailed information about a specific revision
     */
    async getRevisionDetails(revision: number): Promise<SvnRevisionDetails | null> {
        try {
            console.log(`📋 Getting details for revision ${revision}`);

            const workingPath = this.getWorkingPath();
            const entries = await svnManager.getLog(workingPath, 1);
            
            if (!entries || entries.length === 0) {
                console.error('❌ No entries found for revision');
                return null;
            }

            const entry = entries[0];
            return {
                revision: entry.revision,
                author: entry.author,
                date: entry.date,
                message: entry.message,
                changedFiles: entry.changedPaths as SvnChangedPath[]
            };

        } catch (error) {
            console.error('❌ Failed to get revision details:', error);
            return null;
        }
    }

    /**
     * Get diff for a specific revision
     */
    async getRevisionDiff(revision: number, filePath?: string): Promise<string> {
        try {
            console.log(`🔄 Getting diff for revision ${revision}`);

            const path = filePath || this.getWorkingPath();
            const diff = await svnManager.getDiff(path);
            
            console.log('✅ Got diff');
            return diff || '';

        } catch (error) {
            console.error('❌ Failed to get diff:', error);
            return '';
        }
    }

    /**
     * Compare two revisions
     */
    async compareTwoRevisions(rev1: number, rev2: number): Promise<string> {
        try {
            console.log(`🔄 Comparing r${rev1} with r${rev2}`);

            const path = this.getWorkingPath();
            const diff = await svnManager.getDiff(path);
            
            console.log('✅ Got comparison diff');
            return diff || '';

        } catch (error) {
            console.error('❌ Failed to compare revisions:', error);
            return '';
        }
    }

    /**
     * Revert working copy to a specific revision
     */
    async revertToRevision(revision: number, filePath?: string): Promise<void> {
        try {
            console.log(`⏮️ Reverting to revision ${revision}`);

            const files = filePath ? [filePath] : [];
            if (files.length > 0) {
                await svnManager.revert(files);
            }
            
            console.log('✅ Reverted successfully');

        } catch (error) {
            console.error('❌ Failed to revert:', error);
            throw new Error('Failed to revert to revision: ' + error);
        }
    }

    /**
     * Search through commit messages
     */
    async searchHistory(query: string, limit: number = 100): Promise<SvnLogEntry[]> {
        try {
            console.log(`🔍 Searching history for: "${query}"`);

            const entries = await this.getLog(limit);
            
            if (!entries || entries.length === 0) {
                return [];
            }
            
            const filtered = entries.filter(entry => {
                const searchText = `${entry.message} ${entry.author}`.toLowerCase();
                return searchText.includes(query.toLowerCase());
            });

            console.log(`✅ Found ${filtered.length} matching entries`);
            return filtered;

        } catch (error) {
            console.error('❌ Search failed:', error);
            return [];
        }
    }

    /**
     * Get changed files for a specific revision
     */
    async getChangedFiles(revision: number): Promise<SvnChangedPath[]> {
        try {
            const details = await this.getRevisionDetails(revision);
            return details?.changedFiles || [];
        } catch (error) {
            console.error('❌ Failed to get changed files:', error);
            return [];
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        } catch {
            return dateString;
        }
    }

    /**
     * Get action icon for changed path
     */
    getActionIcon(action: string): string {
        const icons: Record<string, string> = {
            'M': '📝',  // Modified
            'A': '✨',  // Added
            'D': '🗑️',  // Deleted
            'R': '🔄'   // Replaced
        };
        return icons[action] || '📄';
    }

    /**
     * Get action color for UI
     */
    getActionColor(action: string): string {
        const colors: Record<string, string> = {
            'M': '#007acc',  // Blue for modified
            'A': '#28a745',  // Green for added
            'D': '#dc3545',  // Red for deleted
            'R': '#ffc107'   // Yellow for replaced
        };
        return colors[action] || '#858585';
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.logCache.clear();
        console.log('🗑️ History cache cleared');
    }
}

// Export singleton instance
export const svnHistoryManager = SvnHistoryManager.getInstance();

// Re-export SvnLogEntry from svnManager for convenience
export type { SvnLogEntry };

// Expose to window for debugging
if (typeof window !== 'undefined') {
    (window as any).svnHistoryManager = svnHistoryManager;
}