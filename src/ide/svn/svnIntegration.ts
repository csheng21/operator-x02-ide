/**
 * SVN Integration Helper - WITH FILE EXPLORER DECORATIONS
 * Seamlessly connects enhanced UI with existing SVN infrastructure
 * AND adds visual indicators to file explorer
 */

import { enhancedSvnUI } from './svnUIEnhanced';
import { svnFileExplorerDecorator } from './svnFileExplorerDecorator';

// Type definitions for existing managers
interface ExistingSVNManager {
    currentPath?: string;
    setCurrentPath?: (path: string) => Promise<void>;
    getStatus?: () => Promise<any[]>;
    getInfo?: () => Promise<any>;
    commit?: (message: string) => Promise<any>;
    update?: () => Promise<any>;
    refreshStatus?: () => Promise<void>;
}

interface SVNAutoDetector {
    onSVNDetected?: (callback: (path: string, info: any) => void) => void;
    onSVNLost?: (callback: () => void) => void;
    startMonitoring?: () => void;
    stopMonitoring?: () => void;
}

class SVNIntegrationHelper {
    private existingManager: ExistingSVNManager | null = null;
    private autoDetector: SVNAutoDetector | null = null;
    private isInitialized: boolean = false;

    /**
     * Initialize the enhanced SVN UI integration WITH decorators
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('SVN Integration already initialized');
            return;
        }

        console.log('🎨 Initializing Enhanced SVN Integration WITH File Decorators...');

        try {
            // Try to get existing managers
            this.existingManager = (window as any).svnManager || null;
            this.autoDetector = (window as any).svnAutoDetector || null;

            // ✅ NEW: Initialize file explorer decorator
            svnFileExplorerDecorator.initialize();

            // Setup integration hooks
            this.setupManagerIntegration();
            this.setupAutoDetection();

            // Expose enhanced UI globally
            (window as any).enhancedSvnUI = enhancedSvnUI;
            (window as any).svnFileExplorerDecorator = svnFileExplorerDecorator;

            // Add helper functions
            this.exposeHelperFunctions();

            this.isInitialized = true;
            console.log('✅ Enhanced SVN Integration WITH decorators initialized successfully');

            return Promise.resolve();
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced SVN Integration:', error);
            throw error;
        }
    }

    /**
     * Setup integration with existing SVN manager
     */
    private setupManagerIntegration(): void {
        if (!this.existingManager) {
            console.log('ℹ️ No existing SVN manager found - Enhanced UI will work independently');
            return;
        }

        console.log('🔗 Connecting enhanced UI with existing SVN manager...');

        // Hook into setCurrentPath
        const originalSetPath = this.existingManager.setCurrentPath?.bind(this.existingManager);
        if (originalSetPath) {
            this.existingManager.setCurrentPath = async (path: string) => {
                await originalSetPath(path);
                await enhancedSvnUI.activate(path);
                
                // ✅ NEW: Update file decorators when path changes
                setTimeout(() => {
                    svnFileExplorerDecorator.forceUpdate();
                }, 500);
            };
        }

        // Hook into refreshStatus
        const originalRefresh = this.existingManager.refreshStatus?.bind(this.existingManager);
        if (originalRefresh) {
            this.existingManager.refreshStatus = async () => {
                await originalRefresh();
                await enhancedSvnUI.updateUI();
                
                // ✅ NEW: Update file decorators when status refreshes
                await svnFileExplorerDecorator.forceUpdate();
                
                // ✅ Emit event for other listeners
                document.dispatchEvent(new CustomEvent('svn-status-updated'));
            };
        }

        console.log('✅ Enhanced UI connected to existing SVN manager');
    }

    /**
     * Setup auto-detection integration
     */
    private setupAutoDetection(): void {
        if (!this.autoDetector) {
            console.log('ℹ️ No auto-detector found - Manual activation required');
            return;
        }

        console.log('🔍 Setting up auto-detection hooks...');

        // Hook into detection events
        if (this.autoDetector.onSVNDetected) {
            this.autoDetector.onSVNDetected(async (path: string, info: any) => {
                console.log('✅ SVN detected at:', path);
                await enhancedSvnUI.activate(path);
                
                // ✅ NEW: Update decorators when SVN is detected
                setTimeout(() => {
                    svnFileExplorerDecorator.forceUpdate();
                }, 1000);
            });
        }

        if (this.autoDetector.onSVNLost) {
            this.autoDetector.onSVNLost(() => {
                console.log('❌ SVN lost - deactivating enhanced UI');
                enhancedSvnUI.hide();
                
                // ✅ NEW: Clear decorators when SVN is lost
                svnFileExplorerDecorator.cleanup();
            });
        }

        // Start monitoring if available
        if (this.autoDetector.startMonitoring) {
            this.autoDetector.startMonitoring();
        }

        console.log('✅ Auto-detection configured');
    }

    /**
     * Expose helpful utility functions to window
     */
    private exposeHelperFunctions(): void {
        // Quick activate function
        (window as any).activateSVN = async (path: string) => {
            console.log('🚀 Manually activating SVN for:', path);
            await enhancedSvnUI.activate(path);
            setTimeout(() => svnFileExplorerDecorator.forceUpdate(), 500);
        };

        // Quick deactivate function
        (window as any).deactivateSVN = () => {
            console.log('🛑 Manually deactivating SVN');
            enhancedSvnUI.hide();
        };

        // Toggle panel function
        (window as any).toggleSVNPanel = () => {
            enhancedSvnUI.toggle();
        };

        // ✅ NEW: Force update decorators
        (window as any).updateSVNDecorators = async () => {
            console.log('🔄 Manually updating SVN decorators...');
            await svnFileExplorerDecorator.forceUpdate();
        };

        // Recreate panel function
        (window as any).recreateSVNPanel = () => {
            console.log('🔧 Recreating SVN panel...');
            const panel = document.getElementById('svn-enhanced-panel');
            if (panel) panel.remove();
            const backdrop = document.getElementById('svn-backdrop');
            if (backdrop) backdrop.remove();
            console.log('✅ Panel removed - will recreate on next activation');
        };

        // Status check function
        (window as any).checkSVNStatus = () => {
            console.log('📊 SVN Status:');
            console.log('- Active:', (enhancedSvnUI as any).isActive);
            console.log('- Current Path:', (enhancedSvnUI as any).currentPath);
            console.log('- File Count:', (enhancedSvnUI as any).fileStatuses?.length || 0);
            const panel = document.getElementById('svn-enhanced-panel');
            console.log('- Panel Exists:', !!panel);
            console.log('- Panel Visible:', panel?.classList.contains('active'));
            console.log('- Decorator Active:', !!(window as any).svnFileExplorerDecorator);
        };

        console.log('✅ Helper functions exposed to window');
        console.log('Available commands:');
        console.log('  - window.activateSVN(path)');
        console.log('  - window.deactivateSVN()');
        console.log('  - window.toggleSVNPanel()');
        console.log('  - window.updateSVNDecorators()  ← NEW!');
        console.log('  - window.recreateSVNPanel()');
        console.log('  - window.checkSVNStatus()');
    }

    /**
     * Manual activation (for folders without auto-detection)
     */
    public async manualActivation(path: string): Promise<void> {
        console.log('📂 Manual SVN activation for:', path);
        await enhancedSvnUI.activate(path);
        setTimeout(() => svnFileExplorerDecorator.forceUpdate(), 500);
    }

    /**
     * Get current integration status
     */
    public getStatus(): {
        initialized: boolean;
        hasExistingManager: boolean;
        hasAutoDetector: boolean;
        uiActive: boolean;
        decoratorActive: boolean;
    } {
        return {
            initialized: this.isInitialized,
            hasExistingManager: this.existingManager !== null,
            hasAutoDetector: this.autoDetector !== null,
            uiActive: (enhancedSvnUI as any).isActive || false,
            decoratorActive: !!(window as any).svnFileExplorerDecorator
        };
    }
}

// Create singleton instance
export const svnIntegration = new SVNIntegrationHelper();

// Expose to window for debugging
(window as any).svnIntegration = svnIntegration;

/**
 * Quick initialization function for main.ts
 */
export async function initializeEnhancedSVN(): Promise<void> {
    await svnIntegration.initialize();
}

/**
 * Enhanced SVN setup for folder change events
 */
export function setupFolderChangeListener(): void {
    // Listen for folder changes
    window.addEventListener('folder-changed', async (event: any) => {
        const path = event.detail?.path;
        if (path) {
            console.log('📂 Folder changed:', path);
            
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const isSVN = await invoke('path_exists', { 
                    path: `${path}/.svn` 
                });
                
                if (isSVN) {
                    console.log('✅ SVN folder detected - activating enhanced UI');
                    await enhancedSvnUI.activate(path);
                    setTimeout(() => svnFileExplorerDecorator.forceUpdate(), 500);
                } else {
                    console.log('ℹ️ Not an SVN folder - hiding UI');
                    enhancedSvnUI.hide();
                }
            } catch (error) {
                console.error('Error checking SVN status:', error);
            }
        }
    });

    console.log('✅ Folder change listener configured');
}

/**
 * Setup keyboard shortcuts for SVN operations
 */
export function setupSVNKeyboardShortcuts(): void {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+Shift+G - Toggle Source Control panel
        if (e.ctrlKey && e.shiftKey && e.key === 'G') {
            e.preventDefault();
            
            try {
                const panel = document.getElementById('svn-enhanced-panel');
                const isVisible = panel?.classList.contains('active');
                
                if (!isVisible) {
                    const currentPath = (window as any).svnManager?.currentPath || 
                                       (window as any).currentFolderPath ||
                                       enhancedSvnUI.currentPath;
                    
                    if (currentPath) {
                        console.log('🚀 Activating SVN panel with path:', currentPath);
                        await enhancedSvnUI.activate(currentPath);
                        setTimeout(() => svnFileExplorerDecorator.forceUpdate(), 500);
                    } else {
                        console.warn('⚠️ No current path found');
                        enhancedSvnUI.show();
                    }
                } else {
                    console.log('👋 Hiding SVN panel');
                    enhancedSvnUI.hide();
                }
            } catch (error) {
                console.error('❌ Error toggling SVN panel:', error);
                enhancedSvnUI.toggle();
            }
        }

        // Ctrl+Shift+R - Refresh SVN status
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            
            try {
                console.log('🔄 Refreshing SVN status...');
                
                if ((window as any).svnManager?.refreshStatus) {
                    await (window as any).svnManager.refreshStatus();
                }
                
                await enhancedSvnUI.updateUI();
                await svnFileExplorerDecorator.forceUpdate();
                
                console.log('✅ SVN status refreshed');
            } catch (error) {
                console.error('❌ Error refreshing SVN status:', error);
            }
        }

        // ✅ NEW: Ctrl+Shift+D - Force update decorators
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            console.log('🎨 Forcing decorator update...');
            await svnFileExplorerDecorator.forceUpdate();
        }
    });

    console.log('✅ SVN keyboard shortcuts configured:');
    console.log('  - Ctrl+Shift+G: Toggle Source Control panel');
    console.log('  - Ctrl+Shift+R: Refresh status');
    console.log('  - Ctrl+Shift+D: Force update file decorators');
}

/**
 * Complete setup - call this from main.ts
 */
export async function setupEnhancedSVN(): Promise<void> {
    console.log('🚀 Setting up Enhanced SVN UI WITH FILE DECORATORS...');

    try {
        // Initialize integration
        await initializeEnhancedSVN();
        
        // Initialize the panel DOM
        await enhancedSvnUI.initialize();
        console.log('✅ Enhanced SVN panel initialized');

        // Setup folder change listener
        setupFolderChangeListener();

        // Setup keyboard shortcuts
        setupSVNKeyboardShortcuts();

        console.log('✅ Enhanced SVN UI setup complete!');
        console.log('');
        console.log('🎨 File Explorer Decorations Active:');
        console.log('  - Modified files show blue "M" badge');
        console.log('  - Added files show green "A" badge');
        console.log('  - Deleted files show red "D" badge');
        console.log('  - Conflicted files show yellow "C" badge');
        console.log('');
        console.log('Usage:');
        console.log('1. Open any folder with SVN (.svn directory)');
        console.log('2. Enhanced UI will auto-activate');
        console.log('3. File explorer will show SVN status badges');
        console.log('4. Press Ctrl+Shift+G to toggle panel');
        console.log('5. Press Ctrl+Shift+D to refresh decorators');
        console.log('');

        return Promise.resolve();
    } catch (error) {
        console.error('❌ Failed to setup Enhanced SVN UI:', error);
        throw error;
    }
}