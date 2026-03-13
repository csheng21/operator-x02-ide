// src/ide/svn/svnDiffViewer.ts
// SVN Diff Viewer using Monaco Editor

import * as monaco from 'monaco-editor';
import { svnManager } from './svnManager';
import { invoke } from '@tauri-apps/api/core';

let diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
let diffContainer: HTMLElement | null = null;

// Show diff viewer for a file
export async function showSvnDiffViewer(filePath: string): Promise<void> {
    try {
        // Get original content (BASE revision)
        const originalContent = await svnManager.getFileAtRevision(filePath, 'BASE');
        
        // Get modified content (working copy)
        const modifiedContent = await invoke<string>('read_file_content', { path: filePath });

        // Create or reuse diff viewer
        if (!diffContainer) {
            diffContainer = createDiffContainer();
        }

        // Show container
        diffContainer.style.display = 'flex';

        // Create or update diff editor
        if (!diffEditor) {
            diffEditor = monaco.editor.createDiffEditor(
                diffContainer.querySelector('.diff-editor-container') as HTMLElement,
                {
                    enableSplitViewResizing: true,
                    renderSideBySide: true,
                    readOnly: true,
                    originalEditable: false,
                    theme: 'vs-dark',
                    minimap: {
                        enabled: true
                    },
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                }
            );
        }

        // Detect language from file extension
        const language = detectLanguage(filePath);

        // Set models
        const originalModel = monaco.editor.createModel(originalContent, language);
        const modifiedModel = monaco.editor.createModel(modifiedContent, language);

        diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel
        });

        // Update header
        updateDiffHeader(filePath);

    } catch (error) {
        alert('Failed to show diff: ' + error);
        console.error('Error showing diff:', error);
    }
}

// Create diff container
function createDiffContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'svn-diff-viewer';
    container.innerHTML = `
        <div class="diff-header">
            <div class="diff-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                </svg>
                <span class="diff-file-name"></span>
            </div>
            <div class="diff-actions">
                <button class="btn btn-secondary" id="diff-revert-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    </svg>
                    Revert Changes
                </button>
                <button class="btn btn-secondary" id="diff-toggle-inline-btn" title="Toggle Inline View">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                </button>
                <button class="icon-button" id="diff-close-btn" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="diff-editor-container"></div>
    `;

    document.body.appendChild(container);

    // Setup event listeners
    setupDiffEventListeners(container);

    return container;
}

// Setup event listeners for diff viewer
function setupDiffEventListeners(container: HTMLElement): void {
    // Close button
    const closeBtn = container.querySelector('#diff-close-btn');
    closeBtn?.addEventListener('click', () => {
        closeDiffViewer();
    });

    // Revert button
    const revertBtn = container.querySelector('#diff-revert-btn');
    revertBtn?.addEventListener('click', async () => {
        const fileName = container.querySelector('.diff-file-name')?.textContent;
        if (!fileName) return;

        if (confirm(`Are you sure you want to revert "${fileName}"?`)) {
            try {
                await svnManager.revert([fileName]);
                alert('File reverted successfully');
                closeDiffViewer();
            } catch (error) {
                alert('Revert failed: ' + error);
            }
        }
    });

    // Toggle inline view button
    const toggleInlineBtn = container.querySelector('#diff-toggle-inline-btn');
    toggleInlineBtn?.addEventListener('click', () => {
        if (diffEditor) {
            const currentRenderSideBySide = diffEditor.getOptions().get(monaco.editor.EditorOption.renderSideBySide);
            diffEditor.updateOptions({
                renderSideBySide: !currentRenderSideBySide
            });
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && container.style.display === 'flex') {
            closeDiffViewer();
        }
    });
}

// Update diff header
function updateDiffHeader(filePath: string): void {
    if (!diffContainer) return;

    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    const fileNameEl = diffContainer.querySelector('.diff-file-name');
    if (fileNameEl) {
        fileNameEl.textContent = fileName;
        fileNameEl.setAttribute('title', filePath);
    }
}

// Close diff viewer
export function closeDiffViewer(): void {
    if (diffContainer) {
        diffContainer.style.display = 'none';
    }

    if (diffEditor) {
        const model = diffEditor.getModel();
        if (model) {
            model.original?.dispose();
            model.modified?.dispose();
        }
    }
}

// Detect language from file extension
function detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'json': 'json',
        'xml': 'xml',
        'md': 'markdown',
        'sql': 'sql',
        'sh': 'shell',
        'yaml': 'yaml',
        'yml': 'yaml',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'r': 'r',
        'lua': 'lua',
        'perl': 'perl',
        'dart': 'dart'
    };

    return languageMap[extension || ''] || 'plaintext';
}

// Dispose diff editor
export function disposeDiffEditor(): void {
    if (diffEditor) {
        const model = diffEditor.getModel();
        if (model) {
            model.original?.dispose();
            model.modified?.dispose();
        }
        diffEditor.dispose();
        diffEditor = null;
    }

    if (diffContainer) {
        diffContainer.remove();
        diffContainer = null;
    }
}
