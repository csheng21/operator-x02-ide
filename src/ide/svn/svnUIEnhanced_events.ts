/**
 * 🎯 SVN UI Enhanced - Event Handlers & Interactions
 * Extracted event handling code to reduce main file size
 * ~10KB of event listeners and UI interactions
 */

import { SvnFileStatus } from './svnManager';

/**
 * Event handler configuration type
 */
export interface EventHandlerContext {
    panel: HTMLElement;
    hide: () => void;
    refresh: () => Promise<void>;
    pullChanges: () => Promise<void>;
    setFilterMode: (mode: 'modified' | 'all') => void;
    toggleSelectAll: () => void;
    switchView: (view: 'commit' | 'diff' | 'history', skipAutoLoad?: boolean) => void;
    switchCommitView: (view: 'filelist' | 'analytics') => void;
    updateCharCounter: () => void;
    commitChanges: () => Promise<void>;
    generateAICommitMessage: () => Promise<void>;
    updateWorkingCopy: () => Promise<void>;
    cleanupWorkingCopy: () => Promise<void>;
    toggleGroupExpanded: (groupName: string) => void;
    toggleGroupSelection: (groupName: string, checked: boolean) => void;
    toggleFileSelection: (filePath: string, checked: boolean) => void;
    showFileDiff: (filePath: string) => Promise<void>;
    openFileInEditor: (filePath: string) => void;
    revertFile: (filePath: string) => Promise<void>;
    loadHistoryForFile: (filePath: string) => Promise<void>;
    searchQuery: string;
    filterFiles: () => void;
    isActive: boolean;
    currentViewMode: 'commit' | 'diff' | 'history';
}

/**
 * Setup all event listeners for the SVN panel
 */
export function setupEventListeners(ctx: EventHandlerContext): void {
    if (!ctx.panel) return;

    // Header actions
    ctx.panel.querySelector('#close-panel-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.hide();
    });
    
    ctx.panel.querySelector('#refresh-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.refresh();
    });
    
    ctx.panel.querySelector('#pull-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.pullChanges();
    });

    // Global AI Panel close button
    const globalAIPanelCloseBtn = document.getElementById('close-ai-panel-btn');
    if (globalAIPanelCloseBtn) {
        globalAIPanelCloseBtn.addEventListener('click', () => {
            const panel = document.getElementById('diff-ai-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        });
    }

    // Search
    const searchInput = ctx.panel.querySelector('#file-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        // Update search query through context
        if (ctx.filterFiles) {
            ctx.filterFiles();
        }
    });

    // Filter buttons
    ctx.panel.querySelector('#filter-modified')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.setFilterMode('modified');
    });
    
    ctx.panel.querySelector('#filter-all')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.setFilterMode('all');
    });

    // Select all
    ctx.panel.querySelector('#select-all-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.toggleSelectAll();
    });

    // View tabs - Use event delegation for tabs
    ctx.panel.querySelector('.view-tabs')?.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.tab-btn');
        if (btn) {
            e.stopPropagation();
            const view = btn.getAttribute('data-view') as 'commit' | 'diff' | 'history';
            if (view) ctx.switchView(view);
        }
    });

    // ✨ Analytics toggle buttons
    const showFileListBtn = ctx.panel.querySelector('#show-file-list-btn');
    const showAnalyticsBtn = ctx.panel.querySelector('#show-analytics-btn');
    
    if (showFileListBtn) {
        showFileListBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.switchCommitView('filelist');
        });
    }
    
    if (showAnalyticsBtn) {
        showAnalyticsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.switchCommitView('analytics');
        });
    }

    // Commit message
    const textarea = ctx.panel.querySelector('#commit-message') as HTMLTextAreaElement;
    if (textarea) {
        textarea.addEventListener('input', () => ctx.updateCharCounter());
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                ctx.commitChanges();
            }
        });
    }

    // AI Generate button - Direct listener
    const aiBtn = ctx.panel.querySelector('#ai-generate-btn');
    if (aiBtn) {
        aiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🤖 AI Generate button clicked');
            ctx.generateAICommitMessage();
        });
    }

    // Commit button - Direct listener
    const commitBtn = ctx.panel.querySelector('#commit-btn');
    if (commitBtn) {
        commitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('💾 Commit button clicked');
            ctx.commitChanges();
        });
    }

    // Bottom action buttons - Direct listeners
    const updateBtn = ctx.panel.querySelector('#update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Update button clicked');
            ctx.updateWorkingCopy();
        });
    }

    const cleanupBtn = ctx.panel.querySelector('#cleanup-btn');
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🗑️ Cleanup button clicked');
            ctx.cleanupWorkingCopy();
        });
    }

    const historyBtn = ctx.panel.querySelector('#history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('📜 History button clicked');
            ctx.switchView('history');
        });
    }

    // Event delegation for file items
    setupFileEventDelegation(ctx);
}

/**
 * Setup event delegation for file list items
 * Uses event delegation for better performance with large file lists
 */
export function setupFileEventDelegation(ctx: EventHandlerContext): void {
    ctx.panel?.addEventListener('click', async (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Group header click (expand/collapse)
        const groupHeader = target.closest('.group-header-improved') as HTMLElement;
        if (groupHeader && !target.closest('.group-checkbox')) {
            e.stopPropagation();
            const groupName = groupHeader.getAttribute('data-group');
            if (groupName) {
                ctx.toggleGroupExpanded(groupName);
            }
            return;
        }

        // Group checkbox
        const groupCheckbox = target.closest('.group-checkbox') as HTMLInputElement;
        if (groupCheckbox) {
            e.stopPropagation();
            const groupName = groupCheckbox.getAttribute('data-group');
            if (groupName) {
                ctx.toggleGroupSelection(groupName, groupCheckbox.checked);
            }
            return;
        }

        // File checkbox - MUST check this before file item
        const fileCheckbox = target.closest('.file-checkbox') as HTMLInputElement;
        if (fileCheckbox) {
            e.stopPropagation();
            const filePath = fileCheckbox.getAttribute('data-file');
            if (filePath) {
                ctx.toggleFileSelection(filePath, fileCheckbox.checked);
            }
            return;
        }

        // File action buttons - Check this BEFORE file item click
        const actionBtn = target.closest('.file-action-btn') as HTMLElement;
        if (actionBtn) {
            e.preventDefault();
            e.stopPropagation();
            const action = actionBtn.getAttribute('data-action');
            const fileItem = actionBtn.closest('.file-item-improved') as HTMLElement;
            const filePath = fileItem?.getAttribute('data-path');

            console.log('🎯 File action clicked:', action, filePath);

            if (action && filePath) {
                switch (action) {
                    case 'diff':
                        await ctx.showFileDiff(filePath);
                        break;
                    case 'open':
                        ctx.openFileInEditor(filePath);
                        break;
                    case 'revert':
                        await ctx.revertFile(filePath);
                        break;
                }
            }
            return;
        }

        // File name/icon click - Show diff or history
        const fileName = target.closest('.file-name-improved, .file-icon') as HTMLElement;
        if (fileName) {
            e.stopPropagation();
            const fileItem = fileName.closest('.file-item-improved') as HTMLElement;
            const filePath = fileItem?.getAttribute('data-path');
            
            if (filePath) {
                // ✅ Respect current view mode
                if (ctx.currentViewMode === 'history') {
                    console.log('📜 File name clicked, showing history:', filePath);
                    ctx.switchView('history', true); // Skip auto-load since we're explicitly loading a file
                    await ctx.loadHistoryForFile(filePath);
                } else {
                    console.log('📄 File name clicked, showing diff:', filePath);
                    await ctx.showFileDiff(filePath);
                }
            }
            return;
        }

        // File item click (as fallback - toggle selection)
        // Only if not clicking checkbox, actions, or file name
        const fileItem = target.closest('.file-item-improved') as HTMLElement;
        if (fileItem && !target.closest('.file-actions-improved')) {
            e.stopPropagation();
            const checkbox = fileItem.querySelector('.file-checkbox') as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                const filePath = checkbox.getAttribute('data-file');
                if (filePath) {
                    ctx.toggleFileSelection(filePath, checkbox.checked);
                }
            }
            return;
        }
    });
}

/**
 * Setup keyboard shortcuts for the SVN panel
 */
export function setupKeyboardShortcuts(ctx: EventHandlerContext): void {
    document.addEventListener('keydown', (e) => {
        if (!ctx.isActive) return;

        // Ctrl+R: Refresh
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            ctx.refresh();
        }

        // Escape: Close panel
        if (e.key === 'Escape') {
            ctx.hide();
        }

        // Ctrl+A: Select all (when not in textarea)
        if (e.ctrlKey && e.key === 'a' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            ctx.toggleSelectAll();
        }
    });
}

/**
 * Create notification container element
 */
export function createNotificationContainer(): void {
    if (document.getElementById('svn-notification-container')) {
        return; // Already exists
    }

    const container = document.createElement('div');
    container.id = 'svn-notification-container';
    container.className = 'svn-notification-container';
    document.body.appendChild(container);
}

/**
 * Show a notification message
 */
export function showNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info',
    escapeHtmlFn: (text: string) => string
): void {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const container = document.getElementById('svn-notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `svn-notification svn-notification-${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type]}</span>
            <span class="notification-message">${escapeHtmlFn(message)}</span>
        </div>
        <button class="notification-close">✕</button>
    `;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Update character counter for textarea
 */
export function updateCharCounter(textarea: HTMLTextAreaElement, counterElement: HTMLElement | null): void {
    if (!counterElement) return;
    
    const length = textarea.value.length;
    const max = 500;
    counterElement.textContent = `${length} / ${max}`;
    
    // Visual feedback when approaching limit
    if (length > max * 0.9) {
        counterElement.style.color = '#ffc107'; // Warning yellow
    } else if (length > max) {
        counterElement.style.color = '#dc3545'; // Error red
    } else {
        counterElement.style.color = '#808080'; // Default gray
    }
}

/**
 * Toggle button active state
 */
export function toggleButtonActive(button: HTMLElement, active: boolean): void {
    if (active) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

/**
 * Toggle buttons in a group (only one active at a time)
 */
export function toggleButtonGroup(container: HTMLElement, selector: string, activeButton: HTMLElement): void {
    container.querySelectorAll(selector).forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * Disable/enable a button
 */
export function setButtonDisabled(button: HTMLButtonElement, disabled: boolean): void {
    button.disabled = disabled;
    if (disabled) {
        button.classList.add('disabled');
    } else {
        button.classList.remove('disabled');
    }
}

/**
 * Update button text and icon
 */
export function updateButtonContent(button: HTMLElement, icon: string, text: string): void {
    button.innerHTML = `<span>${icon}</span><span>${text}</span>`;
}

/**
 * Show/hide element
 */
export function toggleElement(element: HTMLElement, show: boolean): void {
    if (show) {
        element.style.display = '';
        element.classList.remove('hidden');
    } else {
        element.style.display = 'none';
        element.classList.add('hidden');
    }
}

/**
 * Scroll element into view smoothly
 */
export function scrollIntoView(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
    element.scrollIntoView({ behavior, block: 'nearest' });
}

/**
 * Add loading state to button
 */
export function setButtonLoading(button: HTMLButtonElement, loading: boolean, originalHTML?: string): string {
    if (loading) {
        const original = button.innerHTML;
        button.innerHTML = '<span>⏳</span><span>Loading...</span>';
        button.disabled = true;
        return original;
    } else if (originalHTML) {
        button.innerHTML = originalHTML;
        button.disabled = false;
        return originalHTML;
    }
    return '';
}

/**
 * Confirm action with user
 */
export function confirmAction(message: string, title: string = 'Confirm'): boolean {
    return confirm(`${title}\n\n${message}`);
}

/**
 * Get form data as object
 */
export function getFormData(form: HTMLFormElement): Record<string, string> {
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    
    formData.forEach((value, key) => {
        data[key] = value.toString();
    });
    
    return data;
}

/**
 * Debounce function for input events
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function(...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function for frequent events
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    
    return function(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Add CSS class with animation
 */
export function addClassWithAnimation(element: HTMLElement, className: string, duration: number = 300): void {
    element.classList.add(className);
    
    // Remove class after animation completes
    setTimeout(() => {
        element.classList.remove(className);
    }, duration);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }
}

/**
 * Export all functions as default
 */
export default {
    setupEventListeners,
    setupFileEventDelegation,
    setupKeyboardShortcuts,
    createNotificationContainer,
    showNotification,
    updateCharCounter,
    toggleButtonActive,
    toggleButtonGroup,
    setButtonDisabled,
    updateButtonContent,
    toggleElement,
    scrollIntoView,
    setButtonLoading,
    confirmAction,
    getFormData,
    debounce,
    throttle,
    addClassWithAnimation,
    copyToClipboard
};
