// src/ide/svn/svnAutoDetector.ts
// Automatic SVN Working Directory Detection and Setup
// FIXED VERSION - Added await for updateStatusBar
//Test 

import { svnManager } from './svnManager';
import { svnStatusBar } from './svnStatusBar';
import { enhancedSvnUI } from './svnUIEnhanced';

export class SvnAutoDetector {
    private static instance: SvnAutoDetector;
    private currentPath: string = '';
    private checkInterval: number | null = null;
    private lastCheckedPath: string = '';
    private loadingOverlay: HTMLElement | null = null; // ✅ NEW: Loading overlay reference
    private loadingStartTime: number = 0; // ✅ NEW: Track when loading started
    private readonly MIN_LOADING_TIME = 800; // ✅ NEW: Minimum loading display time (ms)

    private constructor() {}

    static getInstance(): SvnAutoDetector {
        if (!SvnAutoDetector.instance) {
            SvnAutoDetector.instance = new SvnAutoDetector();
        }
        return SvnAutoDetector.instance;
    }

    // ✅ NEW: Show loading overlay
    private showLoading(message: string = 'Checking SVN status...'): void {
        // Remove existing if present
        this.hideLoadingImmediate();
        
        // Track start time
        this.loadingStartTime = Date.now();
        
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'svn-loading-overlay';
        this.loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(30, 30, 30, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            backdrop-filter: blur(8px);
        `;
        
        this.loadingOverlay.innerHTML = `
            <style>
                @keyframes svnRotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes svnDash {
                    0% { stroke-dashoffset: 187; }
                    50% { stroke-dashoffset: 46.75; }
                    100% { stroke-dashoffset: 187; }
                }
                @keyframes svnFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes svnTextPulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                @keyframes svnDotBounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-6px); }
                }
                @keyframes svnGlow {
                    0%, 100% { filter: drop-shadow(0 0 2px #007acc); }
                    50% { filter: drop-shadow(0 0 8px #007acc); }
                }
                @keyframes svnProgressBar {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
            </style>
            
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 24px;
                animation: svnFadeIn 0.3s ease;
            ">
                <!-- Main spinner container -->
                <div style="position: relative; width: 80px; height: 80px;">
                    <!-- Outer rotating ring -->
                    <svg width="80" height="80" viewBox="0 0 80 80" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        animation: svnRotate 2s linear infinite;
                    ">
                        <defs>
                            <linearGradient id="svnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#007acc;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#00bcd4;stop-opacity:0.3" />
                            </linearGradient>
                        </defs>
                        <circle cx="40" cy="40" r="35" fill="none" stroke="#2d2d30" stroke-width="3"/>
                        <circle cx="40" cy="40" r="35" fill="none" stroke="url(#svnGradient)" stroke-width="3" 
                            stroke-linecap="round" stroke-dasharray="165 55"/>
                    </svg>
                    
                    <!-- Inner pulsing ring -->
                    <svg width="80" height="80" viewBox="0 0 80 80" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        animation: svnGlow 2s ease-in-out infinite;
                    ">
                        <circle cx="40" cy="40" r="28" fill="none" stroke="#007acc" stroke-width="1" opacity="0.3"/>
                    </svg>
                    
                    <!-- Center content -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    ">
                        <!-- SVN Icon -->
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="animation: svnGlow 2s ease-in-out infinite;">
                            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="none" stroke="#007acc" stroke-width="1.5" stroke-linejoin="round"/>
                            <path d="M12 22V12" stroke="#007acc" stroke-width="1.5"/>
                            <path d="M2 7l10 5 10-5" stroke="#007acc" stroke-width="1.5"/>
                            <circle cx="12" cy="12" r="2" fill="#007acc"/>
                        </svg>
                    </div>
                </div>
                
                <!-- Loading text -->
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                ">
                    <span id="svn-loading-message" style="
                        color: #e0e0e0;
                        font-size: 13px;
                        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                        animation: svnTextPulse 2s ease-in-out infinite;
                    ">${message}</span>
                    
                    <!-- Progress bar -->
                    <div style="
                        width: 120px;
                        height: 2px;
                        background: #2d2d30;
                        border-radius: 1px;
                        overflow: hidden;
                    ">
                        <div style="
                            height: 100%;
                            background: linear-gradient(90deg, #007acc, #00bcd4);
                            border-radius: 1px;
                            animation: svnProgressBar 2s ease-in-out infinite;
                        "></div>
                    </div>
                    
                    <!-- Bouncing dots -->
                    <div style="display: flex; gap: 4px; margin-top: 4px;">
                        <div style="width: 4px; height: 4px; background: #007acc; border-radius: 50%; animation: svnDotBounce 1.4s ease-in-out infinite;"></div>
                        <div style="width: 4px; height: 4px; background: #007acc; border-radius: 50%; animation: svnDotBounce 1.4s ease-in-out 0.2s infinite;"></div>
                        <div style="width: 4px; height: 4px; background: #007acc; border-radius: 50%; animation: svnDotBounce 1.4s ease-in-out 0.4s infinite;"></div>
                    </div>
                </div>
                
                <!-- Subtle branding -->
                <span style="
                    color: #4a4a4a;
                    font-size: 10px;
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    margin-top: 8px;
                ">Version Control</span>
            </div>
        `;
        
        document.body.appendChild(this.loadingOverlay);
        console.log('⏳ SVN loading overlay shown');
    }
    
    // ✅ NEW: Update loading message
    private updateLoadingMessage(message: string): void {
        const msgEl = document.getElementById('svn-loading-message');
        if (msgEl) {
            msgEl.textContent = message;
        }
    }
    
    // ✅ NEW: Hide loading immediately (internal use)
    private hideLoadingImmediate(): void {
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
        const existing = document.getElementById('svn-loading-overlay');
        if (existing) {
            existing.remove();
        }
    }
    
    // ✅ NEW: Hide loading overlay with minimum display time
    private hideLoading(): void {
        const elapsed = Date.now() - this.loadingStartTime;
        const remaining = this.MIN_LOADING_TIME - elapsed;
        
        if (remaining > 0) {
            // Wait for minimum time before hiding
            setTimeout(() => {
                this.hideLoadingImmediate();
                console.log('✅ SVN loading overlay hidden (after min time)');
            }, remaining);
        } else {
            this.hideLoadingImmediate();
            console.log('✅ SVN loading overlay hidden');
        }
    }

    // Initialize automatic detection
    initialize(): void {
        console.log('🔍 SVN Auto-Detector initialized');
        
        // Monitor DOM for file explorer changes
        this.setupDOMObserver();
        
        // Monitor window object for path changes
        this.setupWindowPathMonitor();
        
        // Check periodically for path changes
        this.startPeriodicCheck();
        
        // Add manual setup button to file explorer
        this.addSetupButton();
    }

    // Setup DOM observer to detect file tree changes
    private setupDOMObserver(): void {
        const observer = new MutationObserver(() => {
            this.detectPathChange();
        });

        // Observe the file explorer for changes
        const fileExplorer = document.querySelector('.files-panel, .explorer-panel, #file-explorer');
        if (fileExplorer) {
            observer.observe(fileExplorer, {
                childList: true,
                subtree: true
            });
            console.log('✅ DOM observer attached to file explorer');
        }
    }

    // Monitor window object for currentProjectPath changes
    // ⚡ OPTIMIZED: Changed from 1s to 10s to reduce spam
    private setupWindowPathMonitor(): void {
        let lastPath = '';
        
        setInterval(() => {
            // Check various possible path locations
            const paths = [
                (window as any).currentProjectPath,
                (window as any).projectPath,
                (window as any).workspacePath,
                (window as any).fileSystem?.currentPath,
                (window as any).explorerManager?.currentPath
            ].filter(Boolean);

            const newPath = paths[0];
            
            if (newPath && newPath !== lastPath) {
                lastPath = newPath;
                console.log('📂 Path change detected:', newPath);
                this.handlePathChange(newPath);
            }
        }, 10000);  // ✅ OPTIMIZED: 10 seconds (was 1 second)
    }

    // Detect path changes from file explorer
    private detectPathChange(): void {
        // Try to get current path from various sources
        const fileExplorer = document.querySelector('.files-panel, .explorer-panel');
        
        if (!fileExplorer) return;

        // Check for path in data attributes
        const pathElement = fileExplorer.querySelector('[data-path], [data-current-path]');
        if (pathElement) {
            const path = pathElement.getAttribute('data-path') || 
                        pathElement.getAttribute('data-current-path');
            if (path && path !== this.currentPath) {
                this.handlePathChange(path);
            }
        }

        // Check for path in breadcrumb
        const breadcrumb = document.querySelector('.breadcrumb-path, .current-path');
        if (breadcrumb && breadcrumb.textContent) {
            const path = breadcrumb.textContent.trim();
            if (path && path !== this.currentPath) {
                this.handlePathChange(path);
            }
        }
    }

    // Start periodic path checking
    // ⚡ OPTIMIZED: Changed from 2s to 30s to reduce spam
    private startPeriodicCheck(): void {
        this.checkInterval = window.setInterval(() => {
            // Check window.currentProjectPath or similar
            const possiblePaths = [
                (window as any).currentProjectPath,
                (window as any).projectPath,
                (window as any).workspacePath
            ];

            for (const path of possiblePaths) {
                if (path && path !== this.currentPath) {
                    this.handlePathChange(path);
                    break;
                }
            }
        }, 30000);  // ✅ OPTIMIZED: 30 seconds (was 2 seconds)
    }

    // Handle path change
    // ✅ FIXED: Now handles both files and folders correctly + prevents duplicates
    private async handlePathChange(newPath: string): Promise<void> {
        // Remove file name if path includes a file
        let folderPath = newPath;
        
        // Check if it's a file path
        if (folderPath.match(/\.[a-zA-Z0-9]+$/)) {
            // Has file extension, get parent folder
            folderPath = folderPath.substring(0, folderPath.lastIndexOf('\\'));
        }
        
        // ✅ CRITICAL FIX: Prevent duplicate setups for the same path
        if (folderPath === this.currentPath) {
            return;  // Already set up for this path, skip
        }
        
        // Update current path
        this.currentPath = folderPath;
        
        // Use folder path
        svnManager.setCurrentPath(folderPath);
        await this.setupSvnForPath(folderPath);
    }

    // Setup SVN for a path
    // ✅ FIX: Added showGuideOnFail parameter - only show guide when user clicks button
    async setupSvnForPath(path: string, showGuideOnFail: boolean = false): Promise<void> {
        try {
            console.log('🔄 Setting up SVN for:', path);

            // Set SVN working directory
            svnManager.setCurrentPath(path);

            // Refresh status
            const statuses = await svnManager.refreshStatus();

            // Update status bar
            const info = await svnManager.getInfo();
            
            if (info) {
                // This is an SVN working copy!
                console.log('✅ SVN working copy detected!');
                console.log('  Repository:', info.repository_root);
                console.log('  Revision:', info.revision);
                
                // ✅ FIXED: Added await here
                await svnStatusBar.updateStatusBar();
                
                // ✅ NEW: Start auto-refresh ONLY for SVN projects
                svnManager.startAutoRefresh(10000); // 10 seconds for SVN projects

                // ✅ OPTIMIZED: Show notification only once per path
                if (this.lastCheckedPath !== path) {
                    this.showNotification(
                        `✅ SVN Detected: ${this.getBranchName(info.url)} @ r${info.revision}`,
                        'success'
                    );
                    this.lastCheckedPath = path;
                }

                // Update setup button
                this.updateSetupButton(true);
            } else {
                console.log('ℹ️ Not an SVN working copy');
                
                // ✅ NEW: Stop auto-refresh for non-SVN projects
                svnManager.stopAutoRefresh();
                
                this.updateSetupButton(false);
                
                // ✅ FIX: Only show guide if user clicked the button (not on auto-detection)
                if (showGuideOnFail) {
                    this.hideLoading();
                    this.showSvnSetupGuide();
                }
            }
        } catch (error) {
            console.error('Error setting up SVN:', error);
            // ✅ NEW: Stop auto-refresh on error
            svnManager.stopAutoRefresh();
        }
    }

    // Add "Setup SVN Here" button to file explorer
    private addSetupButton(): void {
        setTimeout(() => {
            const fileExplorer = document.querySelector('.files-panel, .explorer-panel');
            if (!fileExplorer) {
                console.log('File explorer not found, will retry...');
                return;
            }

            // Check if button already exists
            if (document.getElementById('svn-setup-button')) {
                return;
            }

            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'svn-setup-button';
            buttonContainer.className = 'svn-auto-setup-button';
            buttonContainer.style.cssText = `
                padding: 8px 12px;
                margin: 8px;
                background: #1e1e1e;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                font-size: 12px;
                color: #cccccc;
            `;

            buttonContainer.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                <span id="svn-setup-text">Setup SVN Here</span>
            `;

            // Hover effects
            buttonContainer.addEventListener('mouseenter', () => {
                buttonContainer.style.background = '#2a2d2e';
                buttonContainer.style.borderColor = '#007acc';
            });

            buttonContainer.addEventListener('mouseleave', () => {
                buttonContainer.style.background = '#1e1e1e';
                buttonContainer.style.borderColor = '#3e3e42';
            });

            // Click handler
            buttonContainer.addEventListener('click', async () => {
                console.log('🖱️ SVN button clicked');
                
                // Check if SVN is already active by checking button state
                const text = document.getElementById('svn-setup-text');
                const isActive = text?.textContent?.includes('SVN Active');
                
                console.log('Button state - isActive:', isActive);
                
                if (isActive) {
                    // SVN is active - open the SVN control panel
                    console.log('🎛️ Opening SVN control panel...');
                    
                    // ✅ FIX: Set path and load data before showing panel
                    if (this.currentPath) {
                        console.log('📂 Setting path to:', this.currentPath);
                        await enhancedSvnUI.activate(this.currentPath); // activate() sets path AND loads data
                    } else {
                        console.warn('⚠️ No currentPath available, trying to detect...');
                        // Try to get path from window
                        const path = (window as any).currentProjectPath || 
                                    (window as any).projectPath || 
                                    (window as any).workspacePath;
                        if (path) {
                            console.log('📂 Found path from window:', path);
                            await enhancedSvnUI.activate(path);
                        } else {
                            console.error('❌ No path found, cannot open panel');
                            enhancedSvnUI.show(); // Show anyway, maybe files are already loaded
                        }
                    }
                    
                    // ✅ FIX: Switch to History tab after opening
                    // This ensures history loads when button is clicked
                    console.log('📜 Switching to History tab...');
                    setTimeout(() => {
                        enhancedSvnUI.switchView('history');
                        console.log('✅ Switched to History tab');
                    }, 100); // Small delay to ensure panel is fully shown
                } else {
                    // SVN not active - run setup
                    console.log('⚙️ Running manual setup...');
                    await this.manualSetup();
                }
            });

            // Insert at top of file explorer
            const header = fileExplorer.querySelector('.explorer-header, .files-header');
            if (header && header.parentElement) {
                header.parentElement.insertBefore(buttonContainer, header.nextSibling);
                console.log('✅ SVN setup button added');
            } else {
                fileExplorer.insertBefore(buttonContainer, fileExplorer.firstChild);
                console.log('✅ SVN setup button added (alternate location)');
            }
        }, 1000);
    }

    // Manual setup triggered by button
    private async manualSetup(): Promise<void> {
        console.log('🔧 Manual setup triggered');
        
        // Get current path
        const path = this.currentPath || 
                    (window as any).currentProjectPath || 
                    (window as any).projectPath;

        console.log('📂 Current path:', path);

        if (!path) {
            console.warn('⚠️ No path found');
            this.showNotification('⚠️ No folder opened. Open a folder first.', 'warning');
            // Still show guide even without path to help user understand SVN
            this.showSvnSetupGuide();
            return;
        }

        // ✅ NEW: Show loading overlay
        this.showLoading('Checking SVN status...');

        try {
            // First check if SVN is installed
            console.log('🔍 Checking if SVN is installed...');
            const isSvnInstalled = await svnManager.checkSvnInstalled();
            console.log('SVN installed:', isSvnInstalled);
            
            if (!isSvnInstalled) {
                // SVN not installed - show installation guide
                console.log('📚 SVN not installed, showing guide');
                this.hideLoading(); // ✅ Hide loading before showing guide
                this.showSvnSetupGuide();
                return;
            }

            // SVN is installed - try to setup
            console.log('✅ SVN is installed, attempting setup');
            this.updateLoadingMessage('Setting up SVN...'); // ✅ Update loading message
            await this.setupSvnForPath(path, true);  // ✅ FIX: Pass true to show guide if not SVN
            
            // ✅ Hide loading after setup completes (guide may or may not show)
            this.hideLoading();
        } catch (error) {
            console.error('❌ Error in manual setup:', error);
            this.hideLoading(); // ✅ Hide loading on error
            // Show guide anyway to help user
            this.showSvnSetupGuide();
        }
    }

    // Show comprehensive SVN setup and troubleshooting guide
    private showSvnSetupGuide(): void {
        console.log('📚 Showing SVN setup guide');
        
        // Remove existing guide if present
        const existing = document.getElementById('svn-setup-guide-modal');
        if (existing) {
            console.log('Removing existing guide modal');
            existing.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'svn-setup-guide-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: #1e1e1e;
                border: 1px solid #3e3e42;
                border-radius: 8px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease;
            ">
                <!-- Header -->
                <div style="
                    padding: 20px 24px;
                    border-bottom: 1px solid #3e3e42;
                    background: linear-gradient(180deg, #2d2d30 0%, #252526 100%);
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <h2 style="
                        margin: 0;
                        color: #ffffff;
                        font-size: 18px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        SVN Setup Guide for Windows
                    </h2>
                    <button id="close-svn-guide" style="
                        background: transparent;
                        border: none;
                        color: #cccccc;
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 4px;
                        transition: all 0.2s;
                        font-size: 24px;
                        line-height: 1;
                    ">×</button>
                </div>

                <!-- Content -->
                <div style="padding: 24px; color: #cccccc; line-height: 1.6;">
                    
                    <!-- Auto-Detection Notice -->
                    <div style="
                        background: #252526;
                        border: 1px solid #0e639c;
                        border-left: 3px solid #0e639c;
                        border-radius: 6px;
                        padding: 20px;
                        margin-bottom: 32px;
                    ">
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            margin-bottom: 12px;
                        ">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e639c" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                            <h3 style="
                                margin: 0;
                                color: #0e639c;
                                font-size: 16px;
                                font-weight: 600;
                            ">How This IDE Works with SVN</h3>
                        </div>
                        <p style="margin: 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #4fc3f7;">✨ Automatic Detection:</strong> This IDE will automatically detect SVN when you open a project that has SVN version control. The button will turn green (<strong>"✓ SVN Active"</strong>) and you can immediately start using SVN features.
                        </p>
                        <p style="margin: 12px 0 0 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #4fc3f7;">⚙️ First Time Setup:</strong> If SVN is not yet installed on your computer, follow the steps below to install it. After installation, restart this IDE and open your SVN project.
                        </p>
                    </div>
                    
                    <!-- Step 1: Install SVN -->
                    <div style="margin-bottom: 32px;">
                        <h3 style="
                            color: #4fc3f7;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                width: 28px;
                                height: 28px;
                                background: #0e639c;
                                border-radius: 50%;
                                font-size: 14px;
                                color: white;
                            ">1</span>
                            Download and Install TortoiseSVN
                        </h3>
                        <div style="padding-left: 36px;">
                            
                            <!-- Download Link -->
                            <div style="
                                background: #252526;
                                border: 1px solid #3e3e42;
                                border-radius: 6px;
                                padding: 16px;
                                margin-bottom: 16px;
                            ">
                                <h4 style="margin: 0 0 12px 0; color: #81c784; font-size: 14px;">🪟 Download TortoiseSVN</h4>
                                <p style="margin: 0 0 8px 0; font-size: 13px;">Visit the official TortoiseSVN website:</p>
                                <code style="
                                    display: block;
                                    background: #1e1e1e;
                                    padding: 12px;
                                    border-radius: 4px;
                                    font-family: 'Consolas', monospace;
                                    font-size: 13px;
                                    color: #4fc3f7;
                                    margin-bottom: 12px;
                                    border: 1px solid #3e3e42;
                                ">https://tortoisesvn.net/downloads.html</code>
                                <p style="margin: 0; font-size: 12px; color: #858585;">
                                    Download the latest version for Windows (64-bit or 32-bit based on your system)
                                </p>
                            </div>

                            <!-- IMPORTANT NOTE -->
                            <div style="
                                background: rgba(79, 195, 247, 0.05);
                                border: 1px solid #4fc3f7;
                                border-left: 4px solid #4fc3f7;
                                border-radius: 6px;
                                padding: 16px;
                                margin-bottom: 16px;
                            ">
                                <div style="
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 12px;
                                ">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2" style="flex-shrink: 0;">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    <div>
                                        <h4 style="
                                            margin: 0 0 8px 0;
                                            color: #4fc3f7;
                                            font-size: 15px;
                                            font-weight: 600;
                                        ">💡 Important Note: Select Command Line Tools</h4>
                                        <p style="
                                            margin: 0 0 8px 0;
                                            color: #cccccc;
                                            font-size: 13px;
                                            line-height: 1.5;
                                        ">
                                            During installation, please select <strong style="background: rgba(79, 195, 247, 0.2); padding: 2px 6px; border-radius: 3px; color: #4fc3f7;">"command line client tools"</strong> option.
                                        </p>
                                        <p style="
                                            margin: 0;
                                            color: #9e9e9e;
                                            font-size: 12px;
                                            line-height: 1.5;
                                        ">
                                            This option enables SVN commands to work with this IDE.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Installation Steps -->
                            <div style="
                                background: #252526;
                                border: 1px solid #3e3e42;
                                border-radius: 6px;
                                padding: 16px;
                            ">
                                <h4 style="margin: 0 0 12px 0; color: #ffc107; font-size: 14px;">📋 Installation Steps</h4>
                                <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                                    <li>Run the TortoiseSVN installer</li>
                                    <li><strong style="color: #4fc3f7;">Select the "command line client tools" option in component selection</strong></li>
                                    <li>Complete the installation with default settings</li>
                                    <li>Restart your computer (recommended) or at least close this IDE</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Verify Installation -->
                    <div style="margin-bottom: 32px;">
                        <h3 style="
                            color: #4fc3f7;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                width: 28px;
                                height: 28px;
                                background: #0e639c;
                                border-radius: 50%;
                                font-size: 14px;
                                color: white;
                            ">2</span>
                            Verify Installation
                        </h3>
                        <div style="padding-left: 36px;">
                            <p style="margin: 0 0 12px 0;">Open Command Prompt (cmd) and run:</p>
                            <code style="
                                display: block;
                                background: #1e1e1e;
                                padding: 12px;
                                border-radius: 4px;
                                font-family: 'Consolas', monospace;
                                font-size: 13px;
                                color: #4fc3f7;
                                border-left: 3px solid #28a745;
                            ">svn --version</code>
                            <p style="margin: 12px 0 0 0; font-size: 13px; color: #858585;">
                                ✅ <strong>Success:</strong> You should see SVN version information<br>
                                ❌ <strong>Error:</strong> If you see "command not found", the command line tools were not installed
                            </p>
                        </div>
                    </div>

                    <!-- Step 3: Setup Your Project -->
                    <div style="margin-bottom: 32px;">
                        <h3 style="
                            color: #4fc3f7;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                width: 28px;
                                height: 28px;
                                background: #0e639c;
                                border-radius: 50%;
                                font-size: 14px;
                                color: white;
                            ">3</span>
                            Checkout Your SVN Project
                        </h3>
                        <div style="padding-left: 36px;">
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #858585;">
                                Get your project from the SVN repository:
                            </p>

                            <!-- Option A: Using TortoiseSVN -->
                            <div style="
                                background: #252526;
                                border: 1px solid #3e3e42;
                                border-radius: 6px;
                                padding: 16px;
                                margin-bottom: 12px;
                            ">
                                <h4 style="margin: 0 0 12px 0; color: #ffc107; font-size: 14px;">
                                    📥 Option A: Using TortoiseSVN (Easy)
                                </h4>
                                <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                                    <li>Create a new folder where you want your project</li>
                                    <li>Right-click the folder → TortoiseSVN → Checkout</li>
                                    <li>Enter your repository URL (e.g., https://your-repo/trunk)</li>
                                    <li>Click OK to checkout</li>
                                    <li>Open the folder in this IDE</li>
                                </ol>
                            </div>

                            <!-- Option B: Using Command Line -->
                            <div style="
                                background: #252526;
                                border: 1px solid #3e3e42;
                                border-radius: 6px;
                                padding: 16px;
                            ">
                                <h4 style="margin: 0 0 12px 0; color: #ffc107; font-size: 14px;">
                                    💻 Option B: Using Command Line
                                </h4>
                                <p style="margin: 0 0 8px 0; font-size: 13px;">Open Command Prompt and run:</p>
                                <code style="
                                    display: block;
                                    background: #1e1e1e;
                                    padding: 8px 12px;
                                    border-radius: 4px;
                                    font-family: 'Consolas', monospace;
                                    font-size: 12px;
                                    color: #4fc3f7;
                                ">svn checkout https://your-repo-url/trunk project-folder</code>
                                <p style="margin: 8px 0 0 0; font-size: 12px; color: #858585;">
                                    Then open the project-folder in this IDE.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: Use in IDE -->
                    <div style="margin-bottom: 32px;">
                        <h3 style="
                            color: #4fc3f7;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                width: 28px;
                                height: 28px;
                                background: #0e639c;
                                border-radius: 50%;
                                font-size: 14px;
                                color: white;
                            ">4</span>
                            Start Using SVN in This IDE
                        </h3>
                        <div style="padding-left: 36px;">
                            <div style="
                                background: #252526;
                                border: 1px solid #89d185;
                                border-left: 3px solid #89d185;
                                border-radius: 6px;
                                padding: 16px;
                                color: #cccccc;
                            ">
                                <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                                    <li><strong>Open your SVN project</strong> in this IDE (File → Open Folder)</li>
                                    <li><strong>IDE detects SVN automatically</strong> - button changes to <strong style="color: #89d185;">"✓ SVN Active"</strong> (green)</li>
                                    <li><strong>Click the green button</strong> to open SVN control panel</li>
                                    <li><strong>Start working!</strong> Commit changes, view diffs, see history</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <!-- Common Issues -->
                    <div style="margin-bottom: 0;">
                        <h3 style="
                            color: #e57373;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 0 0 16px 0;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Common Issues & Solutions
                        </h3>
                        <div style="padding-left: 36px;">
                            
                            <!-- Issue 1 -->
                            <div style="
                                background: rgba(229, 115, 115, 0.1);
                                border-left: 3px solid #e57373;
                                padding: 12px;
                                border-radius: 4px;
                                margin-bottom: 12px;
                            ">
                                <h4 style="margin: 0 0 8px 0; color: #e57373; font-size: 13px;">
                                    ❌ "svn: command not found" or "svn is not recognized"
                                </h4>
                                <p style="margin: 0; font-size: 12px; color: #cccccc;">
                                    <strong>Solution:</strong> Command line tools were not installed. Reinstall TortoiseSVN and <strong style="color: #4fc3f7;">select "command line client tools"</strong> during installation.
                                </p>
                            </div>

                            <!-- Issue 2 -->
                            <div style="
                                background: rgba(229, 115, 115, 0.1);
                                border-left: 3px solid #e57373;
                                padding: 12px;
                                border-radius: 4px;
                                margin-bottom: 12px;
                            ">
                                <h4 style="margin: 0 0 8px 0; color: #e57373; font-size: 13px;">
                                    ❌ Button stays gray "Setup SVN Here" after installing
                                </h4>
                                <p style="margin: 0; font-size: 12px; color: #cccccc;">
                                    <strong>Solution:</strong> Restart this IDE after installing SVN. Then open a folder that has SVN (a checked-out working copy).
                                </p>
                            </div>

                            <!-- Issue 3 -->
                            <div style="
                                background: rgba(229, 115, 115, 0.1);
                                border-left: 3px solid #e57373;
                                padding: 12px;
                                border-radius: 4px;
                                margin-bottom: 12px;
                            ">
                                <h4 style="margin: 0 0 8px 0; color: #e57373; font-size: 13px;">
                                    ❌ "Not an SVN working copy"
                                </h4>
                                <p style="margin: 0; font-size: 12px; color: #cccccc;">
                                    <strong>Solution:</strong> The opened folder is not an SVN repository. You need to checkout a project from SVN first (Step 3).
                                </p>
                            </div>

                            <!-- Issue 4 -->
                            <div style="
                                background: rgba(229, 115, 115, 0.1);
                                border-left: 3px solid #e57373;
                                padding: 12px;
                                border-radius: 4px;
                            ">
                                <h4 style="margin: 0 0 8px 0; color: #e57373; font-size: 13px;">
                                    ❌ Authentication errors when accessing repository
                                </h4>
                                <p style="margin: 0; font-size: 12px; color: #cccccc;">
                                    <strong>Solution:</strong> Use TortoiseSVN first to save credentials. Right-click project folder → TortoiseSVN → Repo Browser, then enter credentials and check "Save authentication".
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 24px;
                    border-top: 1px solid #3e3e42;
                    background: #252526;
                    border-radius: 0 0 8px 8px;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                ">
                    <button id="retry-svn-setup" style="
                        padding: 8px 16px;
                        background: #0e639c;
                        border: 1px solid #0e639c;
                        border-radius: 4px;
                        color: white;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: inherit;
                    ">🔄 Retry Setup</button>
                    <button id="close-svn-guide-footer" style="
                        padding: 8px 16px;
                        background: #2d2d30;
                        border: 1px solid #3e3e42;
                        border-radius: 4px;
                        color: #cccccc;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: inherit;
                    ">Close</button>
                </div>
            </div>

            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { 
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes pulse {
                    0%, 100% { 
                        box-shadow: 0 0 0 0 rgba(244, 135, 113, 0.4);
                        border-color: #f48771;
                    }
                    50% { 
                        box-shadow: 0 0 0 8px rgba(244, 135, 113, 0);
                        border-color: #ff6b6b;
                    }
                }
                #close-svn-guide:hover,
                #close-svn-guide-footer:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                #retry-svn-setup:hover {
                    background: #1177bb;
                }
            </style>
        `;
        document.body.appendChild(modal);
        console.log('✅ SVN setup guide modal added to DOM');

        // Close handlers
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        };

        document.getElementById('close-svn-guide')?.addEventListener('click', closeModal);
        document.getElementById('close-svn-guide-footer')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Retry handler
        document.getElementById('retry-svn-setup')?.addEventListener('click', async () => {
            closeModal();
            const path = this.currentPath || 
                        (window as any).currentProjectPath || 
                        (window as any).projectPath;
            if (path) {
                this.showNotification('🔄 Retrying SVN setup...', 'info');
                await this.setupSvnForPath(path, true);  // ✅ FIX: Pass true - user clicked retry
            }
        });
    }

    // Update setup button appearance
    private updateSetupButton(isSvnRepo: boolean): void {
        const button = document.getElementById('svn-setup-button');
        const text = document.getElementById('svn-setup-text');
        
        if (!button || !text) return;

        if (isSvnRepo) {
            button.style.borderColor = '#28a745';
            button.style.background = 'rgba(40, 167, 69, 0.1)';
            button.title = 'Click to open SVN control panel';
            text.textContent = '✓ SVN Active';
            text.style.color = '#28a745';
            text.style.fontWeight = '600';
        } else {
            button.style.borderColor = '#3e3e42';
            button.style.background = '#1e1e1e';
            button.title = 'Click to setup SVN for this folder';
            text.textContent = 'Setup SVN Here';
            text.style.color = '#cccccc';
            text.style.fontWeight = '400';
        }
    }

    // Show notification
    private showNotification(message: string, type: 'success' | 'info' | 'warning' | 'error'): void {
        // Try to use existing notification system
        if ((window as any).showNotification) {
            (window as any).showNotification(message, type);
            return;
        }

        // Fallback: Create our own notification
        const notification = document.createElement('div');
        notification.className = 'svn-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-size: 13px;
            max-width: 400px;
        `;
        notification.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Get notification color
    private getNotificationColor(type: string): string {
        const colors = {
            'success': '#28a745',
            'info': '#007acc',
            'warning': '#ffc107',
            'error': '#dc3545'
        };
        return colors[type as keyof typeof colors] || colors.info;
    }

    // Get branch name from URL
    private getBranchName(url: string): string {
        const parts = url.split('/');
        const branchIndex = parts.findIndex(p => p === 'branches' || p === 'trunk' || p === 'tags');
        
        if (branchIndex >= 0) {
            if (parts[branchIndex] === 'trunk') {
                return 'trunk';
            } else if (parts[branchIndex] === 'branches' && branchIndex < parts.length - 1) {
                return parts[branchIndex + 1];
            } else if (parts[branchIndex] === 'tags' && branchIndex < parts.length - 1) {
                return `tag:${parts[branchIndex + 1]}`;
            }
        }

        return 'main';
    }

    // Force check current path
    async forceCheck(): Promise<void> {
        const path = this.currentPath || 
                    (window as any).currentProjectPath || 
                    (window as any).projectPath;

        if (path) {
            await this.handlePathChange(path);
        } else {
            console.log('ℹ️ No path to check');
        }
    }

    // Cleanup
    cleanup(): void {
        if (this.checkInterval !== null) {
            window.clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Export singleton instance
export const svnAutoDetector = SvnAutoDetector.getInstance();