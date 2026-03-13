/**
 * 🛠️ SVN UI Enhanced - Helper Utilities
 * Extracted utility functions to reduce main file size
 * ~10KB of reusable functions
 */

import { SvnFileStatus } from './svnManager';

// ============================================================================
// HTML ESCAPING UTILITIES
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape HTML attribute values
 */
export function escapeHtmlAttribute(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Normalize SVN status codes to consistent categories
 */
export function normalizeStatus(status: string | undefined): string {
    if (!status) return 'unknown';
    
    const normalized = status.trim().toLowerCase();
    
    // Map various SVN status codes to our categories
    const statusMap: Record<string, string> = {
        'm': 'modified',
        'modified': 'modified',
        'a': 'added',
        'added': 'added',
        'd': 'deleted',
        'deleted': 'deleted',
        'c': 'conflicted',
        'conflicted': 'conflicted',
        '?': 'unversioned',
        'unversioned': 'unversioned',
        '!': 'missing',
        'missing': 'missing',
        'r': 'replaced',
        'replaced': 'replaced',
    };
    
    return statusMap[normalized] || 'unknown';
}

/**
 * Get status icon character
 */
export function getStatusIcon(statusType: string): string {
    const normalized = normalizeStatus(statusType);
    const icons: Record<string, string> = {
        'modified': 'M',
        'added': 'A',
        'deleted': 'D',
        'conflicted': '⚠',
        'unversioned': '?',
        'missing': '!',
        'replaced': 'R'
    };
    return icons[normalized] || 'M';
}

/**
 * Get RGB color values for status (for use in rgba())
 */
export function getStatusColor(statusType: string): string {
    const normalized = normalizeStatus(statusType);
    const colors: Record<string, string> = {
        'modified': '0, 122, 204',      // Blue
        'added': '40, 167, 69',         // Green
        'deleted': '220, 53, 69',       // Red
        'conflicted': '255, 193, 7',    // Yellow
        'unversioned': '108, 117, 125', // Gray
        'missing': '253, 126, 20',      // Orange
        'replaced': '23, 162, 184'      // Cyan
    };
    return colors[normalized] || '0, 122, 204';
}

/**
 * Get full status information including icon, color, and label
 */
export function getStatusInfo(status: string): { icon: string; color: string; label: string } {
    const normalized = normalizeStatus(status);
    const icon = getStatusIcon(status);
    const color = getStatusColor(status);
    
    const labels: Record<string, string> = {
        'modified': 'Modified',
        'added': 'Added',
        'deleted': 'Deleted',
        'conflicted': 'Conflicted',
        'unversioned': 'Unversioned',
        'missing': 'Missing',
        'replaced': 'Replaced',
        'unknown': 'Unknown'
    };
    
    return {
        icon,
        color,
        label: labels[normalized] || 'Unknown'
    };
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Extract filename from full path
 */
export function getFileName(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    return normalized.split('/').pop() || path;
}

/**
 * Get file extension without dot
 */
export function getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
}

/**
 * Get emoji icon for file based on extension
 */
export function getFileIcon(extension: string): string {
    const icons: Record<string, string> = {
        // JavaScript/TypeScript
        'ts': '📘',
        'tsx': '⚛️',
        'js': '📜',
        'jsx': '⚛️',
        'mjs': '📜',
        'cjs': '📜',
        
        // Web
        'html': '🌐',
        'htm': '🌐',
        'css': '🎨',
        'scss': '🎨',
        'sass': '🎨',
        'less': '🎨',
        
        // Data
        'json': '{}',
        'xml': '📋',
        'yaml': '📋',
        'yml': '📋',
        'toml': '📋',
        
        // Documents
        'md': '📝',
        'txt': '📄',
        'pdf': '📕',
        'doc': '📄',
        'docx': '📄',
        
        // Programming Languages
        'rs': '🦀',
        'py': '🐍',
        'java': '☕',
        'cpp': '⚙️',
        'c': '⚙️',
        'h': '⚙️',
        'hpp': '⚙️',
        'go': '🐹',
        'rb': '💎',
        'php': '🐘',
        'swift': '🦅',
        'kt': '🟣',
        'scala': '⚖️',
        'lua': '🌙',
        'r': '📊',
        
        // Images
        'svg': '🖼️',
        'png': '🖼️',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'gif': '🖼️',
        'webp': '🖼️',
        'ico': '🖼️',
        
        // Others
        'sh': '🐚',
        'bash': '🐚',
        'bat': '⚙️',
        'cmd': '⚙️',
        'ps1': '💙',
        'sql': '🗄️',
        'lock': '🔒',
        'env': '🔐'
    };
    return icons[extension.toLowerCase()] || '📄';
}

/**
 * Get directory name from path
 */
export function getDirectoryName(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    parts.pop(); // Remove filename
    return parts.join('/') || '/';
}

// ============================================================================
// SIGNATURE AND COMPARISON
// ============================================================================

/**
 * Generate a unique signature for file list to detect actual changes
 * Used to prevent unnecessary UI updates
 */
export function generateFileSignature(files: SvnFileStatus[]): string {
    return files
        .map(f => `${f.path}:${f.status}:${f.props_status}`)
        .sort()
        .join('|');
}

// ============================================================================
// SVN BRANCH/URL UTILITIES
// ============================================================================

/**
 * Extract branch name from SVN URL
 */
export function getBranchName(url: string): string {
    const parts = url.split('/');
    const branchIndex = parts.findIndex(p => p === 'branches' || p === 'trunk' || p === 'tags');

    if (branchIndex >= 0) {
        if (parts[branchIndex] === 'trunk') return 'trunk';
        if (parts[branchIndex] === 'branches' && branchIndex < parts.length - 1) {
            return parts[branchIndex + 1];
        }
        if (parts[branchIndex] === 'tags' && branchIndex < parts.length - 1) {
            return `tag:${parts[branchIndex + 1]}`;
        }
    }

    return 'main';
}

/**
 * Get repository name from URL
 */
export function getRepositoryName(url: string): string {
    const parts = url.split('/');
    // Find the repository name (usually comes after the domain)
    const repoIndex = parts.findIndex(p => p.includes('://')) + 1;
    if (repoIndex > 0 && repoIndex < parts.length) {
        return parts[repoIndex];
    }
    return 'Repository';
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffWeek = Math.floor(diffDay / 7);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);

        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
        if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
        if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
        if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
        return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
    } catch (error) {
        return dateString;
    }
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
        return dateString;
    }
}

/**
 * Format date to ISO string for comparison
 */
export function formatDateISO(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toISOString();
    } catch (error) {
        return dateString;
    }
}

// ============================================================================
// NOTIFICATION UTILITIES
// ============================================================================

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: 'success' | 'error' | 'warning' | 'info'): string {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type];
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: 'success' | 'error' | 'warning' | 'info'): string {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#007acc'
    };
    return colors[type];
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncate string to max length with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Check if path is valid
 */
export function isValidPath(path: string): boolean {
    return path && path.trim().length > 0;
}

/**
 * Check if commit message is valid
 */
export function isValidCommitMessage(message: string): boolean {
    const trimmed = message.trim();
    return trimmed.length >= 3; // Minimum 3 characters
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Group array items by a key function
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    
    for (const item of array) {
        const key = keyFn(item);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }
    
    return groups;
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
    return [...new Set(array)];
}

// ============================================================================
// FILE SIZE UTILITIES
// ============================================================================

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // HTML
    escapeHtml,
    escapeHtmlAttribute,
    
    // Status
    normalizeStatus,
    getStatusIcon,
    getStatusColor,
    getStatusInfo,
    
    // Files
    getFileName,
    getFileExtension,
    getFileIcon,
    getDirectoryName,
    
    // Signature
    generateFileSignature,
    
    // SVN
    getBranchName,
    getRepositoryName,
    
    // Date/Time
    formatRelativeDate,
    formatDate,
    formatDateISO,
    
    // Notifications
    getNotificationIcon,
    getNotificationColor,
    
    // Strings
    truncateString,
    capitalize,
    toKebabCase,
    
    // Validation
    isValidPath,
    isValidCommitMessage,
    
    // Arrays
    groupBy,
    unique,
    
    // File Size
    formatFileSize
};
