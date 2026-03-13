// src/ide/svn/svnDiffViewer.ts
// Professional SVN Diff Viewer with Monaco Editor Integration

import { invoke } from '@tauri-apps/api/core';
import * as monaco from 'monaco-editor';

export class SvnDiffViewer {
    private static instance: SvnDiffViewer;
    private currentContainer: HTMLElement | null = null;
    private diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
    private quickActionsPanel: HTMLElement | null = null;

    private constructor() {
        this.injectStyles();
    }

    static getInstance(): SvnDiffViewer {
        if (!SvnDiffViewer.instance) {
            SvnDiffViewer.instance = new SvnDiffViewer();
        }
        return SvnDiffViewer.instance;
    }

    /**
     * Show diff for a file
     */
    async showDiff(filePath: string): Promise<void> {
        try {
            // Get file contents
            const { original, modified } = await this.getFileContents(filePath);
            
            // Check if files are identical
            if (original === modified) {
                const proceed = confirm(
                    'No changes detected in this file.\n\n' +
                    'The working copy appears identical to the BASE version.\n\n' +
                    'Open diff viewer anyway?'
                );
                
                if (!proceed) return;
            }
            
            // Calculate statistics
            const stats = this.calculateStats(original, modified);
            
            // Create and show viewer
            this.createViewer(filePath, original, modified, stats);
            
        } catch (error) {
            console.error('Error showing diff:', error);
            alert('Failed to show diff: ' + error);
        }
    }

    /**
     * Get file contents (BASE and working copy)
     */
    private async getFileContents(filePath: string): Promise<{ original: string, modified: string }> {
        try {
            // Get BASE version from SVN
            const original = await invoke<string>('svn_cat', { 
                filePath,
                revision: 'BASE' 
            });
            
            // Get working copy
            const modified = await invoke<string>('read_file_content', { 
                path: filePath 
            });
            
            return { original, modified };
            
        } catch (error) {
            console.error('Error getting file contents:', error);
            throw error;
        }
    }

    /**
     * Calculate diff statistics
     */
    private calculateStats(original: string, modified: string): { added: number, deleted: number, modified: number } {
        const origLines = original.split('\n');
        const modLines = modified.split('\n');
        
        let added = 0;
        let deleted = 0;
        let modifiedCount = 0;
        
        const maxLen = Math.max(origLines.length, modLines.length);
        
        for (let i = 0; i < maxLen; i++) {
            const origLine = origLines[i] || '';
            const modLine = modLines[i] || '';
            
            if (i >= origLines.length) {
                added++;
            } else if (i >= modLines.length) {
                deleted++;
            } else if (origLine !== modLine) {
                modifiedCount++;
            }
        }
        
        return { added, deleted, modified: modifiedCount };
    }

    /**
     * Create the viewer UI
     */
    private createViewer(
        filePath: string, 
        original: string, 
        modified: string,
        stats: { added: number, deleted: number, modified: number }
    ): void {
        this.closeDiff();
        
        const container = document.createElement('div');
        container.className = 'svn-diff-container';
        container.id = 'svn-diff-viewer';
        
        const fileName = this.getFileName(filePath);
        const language = this.detectLanguage(filePath);
        const totalChanges = stats.added + stats.deleted + stats.modified;
        
        container.innerHTML = `
            <!-- Enhanced Header -->
            <div class="diff-header">
                <div class="header-left">
                    <div class="file-icon">
                        <svg viewBox="0 0 16 16">
                            <path d="M13.5 1.5l.5.5v12l-.5.5h-11l-.5-.5v-12l.5-.5h11zm-1 1h-9v10h9V2.5z"/>
                            <path d="M5 5h6v1H5zm0 2h6v1H5zm0 2h4v1H5z"/>
                        </svg>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${this.escapeHtml(fileName)}</div>
                        <div class="file-path" title="${this.escapeHtml(filePath)}">${this.escapeHtml(filePath)}</div>
                    </div>
                </div>
                
                <div class="header-right">
                    <div class="header-stats">
                        <div class="stat-item">
                            <span class="stat-label">Modified:</span>
                            <span class="stat-value stat-modified">${stats.modified}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Added:</span>
                            <span class="stat-value stat-added">${stats.added}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Deleted:</span>
                            <span class="stat-value stat-deleted">${stats.deleted}</span>
                        </div>
                    </div>
                    
                    <button class="close-button" id="close-diff-btn" data-tooltip="Close (Esc)">
                        <svg viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Enhanced Toolbar -->
            <div class="diff-toolbar">
                <div class="toolbar-section">
                    <button class="toolbar-btn active" id="btn-side-by-side" data-tooltip="Side by Side">
                        <svg viewBox="0 0 16 16">
                            <path d="M1 2h6v12H1V2zm8 0h6v12H9V2z"/>
                        </svg>
                        <span>Split</span>
                    </button>
                    <button class="toolbar-btn" id="btn-inline" data-tooltip="Inline View">
                        <svg viewBox="0 0 16 16">
                            <path d="M2 2h12v12H2V2z"/>
                        </svg>
                        <span>Inline</span>
                    </button>
                    
                    <div class="toolbar-separator"></div>
                    
                    <button class="toolbar-btn" id="btn-prev-change" data-tooltip="Previous Change (Shift+F7)">
                        <svg viewBox="0 0 16 16">
                            <path d="M10 12l-4-4 4-4v8z"/>
                        </svg>
                        <span>Previous</span>
                    </button>
                    <button class="toolbar-btn" id="btn-next-change" data-tooltip="Next Change (F7)">
                        <svg viewBox="0 0 16 16">
                            <path d="M6 4l4 4-4 4V4z"/>
                        </svg>
                        <span>Next</span>
                    </button>

                    <div class="toolbar-separator"></div>
                    
                    <button class="toolbar-btn" id="btn-toggle-whitespace" data-tooltip="Toggle Whitespace">
                        <svg viewBox="0 0 16 16">
                            <circle cx="3" cy="8" r="1.5"/>
                            <circle cx="8" cy="8" r="1.5"/>
                            <circle cx="13" cy="8" r="1.5"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn" id="btn-toggle-minimap" data-tooltip="Toggle Minimap">
                        <svg viewBox="0 0 16 16">
                            <path d="M2 2h4v12H2V2zm6 0h6v12H8V2z"/>
                        </svg>
                    </button>
                </div>

                <div class="toolbar-section">
                    <div class="toolbar-info">
                        <div class="toolbar-info-item">
                            <span class="label">Language:</span>
                            <span class="value">${language}</span>
                        </div>
                        <div class="toolbar-info-item">
                            <span class="label">Changes:</span>
                            <span class="value" id="changes-count">${totalChanges}</span>
                        </div>
                    </div>

                    <div class="toolbar-separator"></div>
                    
                    <button class="toolbar-btn" id="btn-quick-actions" data-tooltip="Quick Actions">
                        <svg viewBox="0 0 16 16">
                            <path d="M3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Monaco Editor Container -->
            <div class="monaco-container">
                <div id="monaco-diff-editor"></div>
            </div>

            <!-- Status Bar -->
            <div class="diff-statusbar">
                <div class="statusbar-left">
                    <div class="statusbar-item">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0zM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0z"/>
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                        </svg>
                        <span>SVN Diff Viewer</span>
                    </div>
                    <div class="statusbar-item" id="current-change-info">
                        <span>Ready</span>
                    </div>
                </div>
                <div class="statusbar-right">
                    <div class="statusbar-item">
                        <span>Monaco Editor</span>
                    </div>
                    <div class="statusbar-item" id="editor-mode">
                        <span>Side-by-Side</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.currentContainer = container;
        
        // Create quick actions panel
        this.createQuickActionsPanel();
        
        // Initialize Monaco after DOM is ready
        setTimeout(() => {
            this.initializeMonaco(original, modified, language);
            this.setupEventListeners();
        }, 100);
    }

    /**
     * Create quick actions slide-in panel
     */
    private createQuickActionsPanel(): void {
        if (!this.currentContainer) return;
        
        const panel = document.createElement('div');
        panel.className = 'quick-actions';
        panel.id = 'quick-actions-panel';
        
        panel.innerHTML = `
            <div class="quick-actions-header">
                <span>Quick Actions</span>
                <button class="close-button" id="close-quick-actions">
                    <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
                    </svg>
                </button>
            </div>
            <div class="quick-actions-content">
                <!-- Navigation Actions -->
                <div class="action-group">
                    <div class="action-group-title">Navigation</div>
                    <button class="action-button" id="action-first-change">
                        <svg viewBox="0 0 16 16">
                            <path d="M3 12V4l8 4-8 4z"/>
                            <path d="M12 12V4h1v8h-1z"/>
                        </svg>
                        <span>Go to First Change</span>
                    </button>
                    <button class="action-button" id="action-last-change">
                        <svg viewBox="0 0 16 16">
                            <path d="M13 4v8l-8-4 8-4z"/>
                            <path d="M4 4v8H3V4h1z"/>
                        </svg>
                        <span>Go to Last Change</span>
                    </button>
                </div>

                <!-- View Options -->
                <div class="action-group">
                    <div class="action-group-title">View Options</div>
                    <button class="action-button" id="action-toggle-wordwrap">
                        <svg viewBox="0 0 16 16">
                            <path d="M2 3h12v1H2zm0 3h12v1H2zm0 3h8v1H2z"/>
                        </svg>
                        <span>Toggle Word Wrap</span>
                    </button>
                    <button class="action-button" id="action-toggle-linenum">
                        <svg viewBox="0 0 16 16">
                            <path d="M3 3h1v10H3zm3 0h9v1H6zm0 3h9v1H6zm0 3h9v1H6zm0 3h9v1H6z"/>
                        </svg>
                        <span>Toggle Line Numbers</span>
                    </button>
                </div>

                <!-- Export Actions -->
                <div class="action-group">
                    <div class="action-group-title">Export</div>
                    <button class="action-button" id="action-copy-diff">
                        <svg viewBox="0 0 16 16">
                            <path d="M4 2h8v2h2v10H6v-2H4V2zm1 1v8h1v3h6V5h-2V3H5z"/>
                        </svg>
                        <span>Copy Diff to Clipboard</span>
                    </button>
                    <button class="action-button" id="action-save-patch">
                        <svg viewBox="0 0 16 16">
                            <path d="M8 1l7 7-7 7V9H1V7h7V1z"/>
                        </svg>
                        <span>Save as Patch File</span>
                    </button>
                </div>

                <!-- Keyboard Shortcuts -->
                <div class="action-group">
                    <div class="action-group-title">Keyboard Shortcuts</div>
                    <div class="shortcuts-panel">
                        <div class="shortcut-item">
                            <span class="shortcut-label">Close Viewer</span>
                            <span class="shortcut-key">Esc</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">Next Change</span>
                            <span class="shortcut-key">F7</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">Previous Change</span>
                            <span class="shortcut-key">Shift+F7</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">Toggle View</span>
                            <span class="shortcut-key">Ctrl+\\</span>
                        </div>
                        <div class="shortcut-item">
                            <span class="shortcut-label">Find</span>
                            <span class="shortcut-key">Ctrl+F</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.currentContainer.appendChild(panel);
        this.quickActionsPanel = panel;
    }

    /**
     * Initialize Monaco diff editor
     */
    private initializeMonaco(original: string, modified: string, language: string): void {
        const editorContainer = document.getElementById('monaco-diff-editor');
        if (!editorContainer) return;
        
        try {
            this.diffEditor = monaco.editor.createDiffEditor(editorContainer, {
                enableSplitViewResizing: true,
                renderSideBySide: true,
                readOnly: true,
                theme: 'vs-dark',
                minimap: { enabled: true },
                fontSize: 13,
                lineHeight: 20,
                renderWhitespace: 'selection',
                renderIndicators: true,
                ignoreTrimWhitespace: false,
                diffAlgorithm: 'advanced',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                wordWrap: 'off'
            });
            
            const originalModel = monaco.editor.createModel(original, language);
            const modifiedModel = monaco.editor.createModel(modified, language);
            
            this.diffEditor.setModel({
                original: originalModel,
                modified: modifiedModel
            });
            
            // Update change count after Monaco analyzes the diff
            setTimeout(() => {
                this.updateChangeInfo();
            }, 300);
            
        } catch (error) {
            console.error('Monaco initialization error:', error);
            alert('Failed to initialize diff editor: ' + error);
        }
    }

    /**
     * Setup all event listeners
     */
    private setupEventListeners(): void {
        if (!this.currentContainer) return;
        
        // Close button
        const closeBtn = this.currentContainer.querySelector('#close-diff-btn');
        closeBtn?.addEventListener('click', () => this.closeDiff());
        
        // View toggle buttons
        const sideBySideBtn = this.currentContainer.querySelector('#btn-side-by-side');
        const inlineBtn = this.currentContainer.querySelector('#btn-inline');
        
        sideBySideBtn?.addEventListener('click', () => {
            if (!this.diffEditor) return;
            this.diffEditor.updateOptions({ renderSideBySide: true });
            sideBySideBtn.classList.add('active');
            inlineBtn?.classList.remove('active');
            const modeEl = this.currentContainer?.querySelector('#editor-mode');
            if (modeEl) modeEl.textContent = 'Side-by-Side';
        });
        
        inlineBtn?.addEventListener('click', () => {
            if (!this.diffEditor) return;
            this.diffEditor.updateOptions({ renderSideBySide: false });
            inlineBtn.classList.add('active');
            sideBySideBtn?.classList.remove('active');
            const modeEl = this.currentContainer?.querySelector('#editor-mode');
            if (modeEl) modeEl.textContent = 'Inline';
        });
        
        // Navigation buttons
        this.currentContainer.querySelector('#btn-prev-change')?.addEventListener('click', () => {
            this.diffEditor?.getActions().find(a => a.id === 'editor.action.diffReview.prev')?.run();
        });
        
        this.currentContainer.querySelector('#btn-next-change')?.addEventListener('click', () => {
            this.diffEditor?.getActions().find(a => a.id === 'editor.action.diffReview.next')?.run();
        });
        
        // Toggle buttons
        this.currentContainer.querySelector('#btn-toggle-whitespace')?.addEventListener('click', (e) => {
            if (!this.diffEditor) return;
            const btn = e.currentTarget as HTMLElement;
            const current = this.diffEditor.getOptions().get(monaco.editor.EditorOption.renderWhitespace);
            const newValue = current === 'all' ? 'selection' : 'all';
            this.diffEditor.updateOptions({ renderWhitespace: newValue });
            btn.classList.toggle('active');
        });
        
        this.currentContainer.querySelector('#btn-toggle-minimap')?.addEventListener('click', (e) => {
            if (!this.diffEditor) return;
            const btn = e.currentTarget as HTMLElement;
            const current = this.diffEditor.getOptions().get(monaco.editor.EditorOption.minimap);
            this.diffEditor.updateOptions({ minimap: { enabled: !current.enabled } });
            btn.classList.toggle('active');
        });
        
        // Quick actions panel toggle
        this.currentContainer.querySelector('#btn-quick-actions')?.addEventListener('click', () => {
            this.quickActionsPanel?.classList.toggle('visible');
        });
        
        this.currentContainer.querySelector('#close-quick-actions')?.addEventListener('click', () => {
            this.quickActionsPanel?.classList.remove('visible');
        });
        
        // Quick action buttons
        this.setupQuickActionButtons();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Setup quick action button handlers
     */
    private setupQuickActionButtons(): void {
        if (!this.currentContainer) return;
        
        // First change
        this.currentContainer.querySelector('#action-first-change')?.addEventListener('click', () => {
            const lineChanges = this.diffEditor?.getLineChanges();
            if (lineChanges && lineChanges.length > 0) {
                const firstChange = lineChanges[0];
                this.diffEditor?.revealLineInCenter(firstChange.modifiedStartLineNumber);
            }
        });
        
        // Last change
        this.currentContainer.querySelector('#action-last-change')?.addEventListener('click', () => {
            const lineChanges = this.diffEditor?.getLineChanges();
            if (lineChanges && lineChanges.length > 0) {
                const lastChange = lineChanges[lineChanges.length - 1];
                this.diffEditor?.revealLineInCenter(lastChange.modifiedStartLineNumber);
            }
        });
        
        // Word wrap
        this.currentContainer.querySelector('#action-toggle-wordwrap')?.addEventListener('click', () => {
            if (!this.diffEditor) return;
            const current = this.diffEditor.getOptions().get(monaco.editor.EditorOption.wordWrap);
            this.diffEditor.updateOptions({ wordWrap: current === 'off' ? 'on' : 'off' });
        });
        
        // Line numbers
        this.currentContainer.querySelector('#action-toggle-linenum')?.addEventListener('click', () => {
            if (!this.diffEditor) return;
            const current = this.diffEditor.getOptions().get(monaco.editor.EditorOption.lineNumbers);
            this.diffEditor.updateOptions({ lineNumbers: current.renderType === 1 ? 'off' : 'on' });
        });
        
        // Copy diff
        this.currentContainer.querySelector('#action-copy-diff')?.addEventListener('click', () => {
            const model = this.diffEditor?.getModel();
            if (!model) return;
            
            const original = model.original.getValue();
            const modified = model.modified.getValue();
            const diff = this.generateUnifiedDiff(original, modified);
            
            navigator.clipboard.writeText(diff).then(() => {
                alert('Diff copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy diff to clipboard');
            });
        });
        
        // Save patch
        this.currentContainer.querySelector('#action-save-patch')?.addEventListener('click', () => {
            const model = this.diffEditor?.getModel();
            if (!model) return;
            
            const original = model.original.getValue();
            const modified = model.modified.getValue();
            const diff = this.generateUnifiedDiff(original, modified);
            
            // Create download
            const blob = new Blob([diff], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'changes.patch';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupKeyboardShortcuts(): void {
        const handler = (e: KeyboardEvent) => {
            if (!this.currentContainer) return;
            
            if (e.key === 'Escape') {
                this.closeDiff();
                document.removeEventListener('keydown', handler);
            } else if (e.key === 'F7' && !e.shiftKey) {
                e.preventDefault();
                this.diffEditor?.getActions().find(a => a.id === 'editor.action.diffReview.next')?.run();
            } else if (e.key === 'F7' && e.shiftKey) {
                e.preventDefault();
                this.diffEditor?.getActions().find(a => a.id === 'editor.action.diffReview.prev')?.run();
            } else if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                const sideBySideBtn = this.currentContainer.querySelector('#btn-side-by-side');
                const inlineBtn = this.currentContainer.querySelector('#btn-inline');
                if (sideBySideBtn?.classList.contains('active')) {
                    (inlineBtn as HTMLElement)?.click();
                } else {
                    (sideBySideBtn as HTMLElement)?.click();
                }
            }
        };
        
        document.addEventListener('keydown', handler);
    }

    /**
     * Update change information in status bar
     */
    private updateChangeInfo(): void {
        if (!this.diffEditor) return;
        
        const lineChanges = this.diffEditor.getLineChanges();
        const changeCount = lineChanges?.length || 0;
        
        const infoEl = this.currentContainer?.querySelector('#current-change-info');
        if (infoEl) {
            infoEl.textContent = changeCount > 0 
                ? `${changeCount} change${changeCount !== 1 ? 's' : ''} detected`
                : 'No changes detected';
        }
        
        const countEl = this.currentContainer?.querySelector('#changes-count');
        if (countEl) {
            countEl.textContent = changeCount.toString();
        }
    }

    /**
     * Generate unified diff format
     */
    private generateUnifiedDiff(original: string, modified: string): string {
        const origLines = original.split('\n');
        const modLines = modified.split('\n');
        
        let diff = '--- Original\n+++ Modified\n';
        
        for (let i = 0; i < Math.max(origLines.length, modLines.length); i++) {
            const origLine = origLines[i] || '';
            const modLine = modLines[i] || '';
            
            if (origLine !== modLine) {
                if (origLine) diff += `- ${origLine}\n`;
                if (modLine) diff += `+ ${modLine}\n`;
            } else {
                diff += `  ${origLine}\n`;
            }
        }
        
        return diff;
    }

    /**
     * Detect language from file extension
     */
    private detectLanguage(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'cpp',
            'hpp': 'cpp',
            'css': 'css',
            'scss': 'scss',
            'html': 'html',
            'xml': 'xml',
            'json': 'json',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
            'bat': 'bat',
            'ps1': 'powershell',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'kt': 'kotlin',
            'swift': 'swift',
            'yaml': 'yaml',
            'yml': 'yaml',
            'txt': 'plaintext'
        };
        
        return languageMap[ext || ''] || 'plaintext';
    }

    /**
     * Get file name from path
     */
    private getFileName(path: string): string {
        return path.split(/[\\/]/).pop() || path;
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Inject CSS styles
     */
    private injectStyles(): void {
        if (document.getElementById('svn-diff-viewer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'svn-diff-viewer-styles';
        style.textContent = `
            .svn-diff-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                flex-direction: column;
                background: #1e1e1e;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                color: #cccccc;
            }

            /* Header */
            .diff-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 16px;
                background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
                border-bottom: 1px solid #007acc;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                min-height: 50px;
            }

            .header-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
                min-width: 0;
            }

            .file-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .file-icon svg {
                width: 100%;
                height: 100%;
                fill: #007acc;
            }

            .file-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
                flex: 1;
            }

            .file-name {
                font-size: 14px;
                font-weight: 600;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .file-path {
                font-size: 11px;
                color: #858585;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-family: 'Consolas', 'Courier New', monospace;
            }

            .header-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .header-stats {
                display: flex;
                gap: 16px;
                padding: 6px 12px;
                background: rgba(0, 122, 204, 0.1);
                border-radius: 4px;
                font-size: 12px;
                border: 1px solid rgba(0, 122, 204, 0.3);
            }

            .stat-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .stat-label {
                color: #858585;
            }

            .stat-value {
                font-weight: 600;
            }

            .stat-added { color: #4ec9b0; }
            .stat-deleted { color: #f48771; }
            .stat-modified { color: #dcdcaa; }

            .close-button {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: #cccccc;
                transition: all 0.2s;
            }

            .close-button:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
            }

            .close-button svg {
                width: 16px;
                height: 16px;
            }

            /* Toolbar */
            .diff-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                background: #252526;
                border-bottom: 1px solid #3c3c3c;
                gap: 12px;
            }

            .toolbar-section {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .toolbar-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: transparent;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                color: #cccccc;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .toolbar-btn:hover {
                background: #2a2d2e;
                border-color: #007acc;
                color: #ffffff;
            }

            .toolbar-btn:active {
                transform: translateY(1px);
            }

            .toolbar-btn.active {
                background: #007acc;
                border-color: #007acc;
                color: #ffffff;
            }

            .toolbar-btn svg {
                width: 14px;
                height: 14px;
                fill: currentColor;
            }

            .toolbar-separator {
                width: 1px;
                height: 20px;
                background: #3c3c3c;
            }

            .toolbar-info {
                display: flex;
                gap: 16px;
                font-size: 11px;
                color: #858585;
                padding: 0 8px;
            }

            .toolbar-info-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .toolbar-info-item .label {
                color: #858585;
            }

            .toolbar-info-item .value {
                color: #cccccc;
                font-weight: 500;
            }

            /* Monaco Container */
            .monaco-container {
                flex: 1;
                overflow: hidden;
                position: relative;
                background: #1e1e1e;
            }

            #monaco-diff-editor {
                width: 100%;
                height: 100%;
            }

            /* Status Bar */
            .diff-statusbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 16px;
                background: #007acc;
                color: #ffffff;
                font-size: 11px;
                height: 24px;
            }

            .statusbar-left,
            .statusbar-right {
                display: flex;
                gap: 16px;
                align-items: center;
            }

            .statusbar-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            /* Quick Actions Panel */
            .quick-actions {
                position: absolute;
                top: 50px;
                right: -300px;
                width: 280px;
                background: #252526;
                border-left: 1px solid #3c3c3c;
                border-bottom: 1px solid #3c3c3c;
                box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.3);
                transition: right 0.3s ease;
                z-index: 100;
                max-height: calc(100vh - 124px);
                overflow-y: auto;
            }

            .quick-actions.visible {
                right: 0;
            }

            .quick-actions-header {
                padding: 12px 16px;
                background: #2d2d30;
                border-bottom: 1px solid #3c3c3c;
                font-size: 12px;
                font-weight: 600;
                color: #ffffff;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .quick-actions-content {
                padding: 12px;
            }

            .action-group {
                margin-bottom: 16px;
            }

            .action-group-title {
                font-size: 11px;
                color: #858585;
                text-transform: uppercase;
                margin-bottom: 8px;
                font-weight: 600;
            }

            .action-button {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: transparent;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                color: #cccccc;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                margin-bottom: 6px;
                text-align: left;
            }

            .action-button:hover {
                background: #2a2d2e;
                border-color: #007acc;
                color: #ffffff;
            }

            .action-button svg {
                width: 14px;
                height: 14px;
                fill: currentColor;
                flex-shrink: 0;
            }

            .shortcuts-panel {
                background: #1e1e1e;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                padding: 12px;
            }

            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                font-size: 11px;
            }

            .shortcut-label {
                color: #cccccc;
            }

            .shortcut-key {
                background: #3c3c3c;
                padding: 2px 8px;
                border-radius: 3px;
                color: #ffffff;
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 10px;
            }

            /* Tooltips */
            [data-tooltip] {
                position: relative;
            }

            [data-tooltip]:hover::before {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 6px 10px;
                background: #2d2d30;
                color: #ffffff;
                font-size: 11px;
                white-space: nowrap;
                border-radius: 4px;
                margin-bottom: 6px;
                border: 1px solid #3c3c3c;
                z-index: 1001;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .header-stats { display: none; }
                .toolbar-info { display: none; }
                .quick-actions { width: 100%; right: -100%; }
            }

            /* Scrollbar */
            .quick-actions::-webkit-scrollbar {
                width: 10px;
            }

            .quick-actions::-webkit-scrollbar-track {
                background: #1e1e1e;
            }

            .quick-actions::-webkit-scrollbar-thumb {
                background: #424242;
                border-radius: 5px;
            }

            .quick-actions::-webkit-scrollbar-thumb:hover {
                background: #4e4e4e;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Close the diff viewer
     */
    closeDiff(): void {
        if (this.diffEditor) {
            const model = this.diffEditor.getModel();
            model?.original?.dispose();
            model?.modified?.dispose();
            this.diffEditor.dispose();
            this.diffEditor = null;
        }
        
        if (this.currentContainer) {
            this.currentContainer.remove();
            this.currentContainer = null;
        }
        
        this.quickActionsPanel = null;
    }
}

// Export singleton instance
export const svnDiffViewer = SvnDiffViewer.getInstance();

// Expose to window for debugging
(window as any).svnDiffViewer = svnDiffViewer;