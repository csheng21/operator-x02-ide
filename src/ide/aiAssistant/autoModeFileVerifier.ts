// autoModeFileVerifier.ts - Enhanced Auto Mode with File Verification
// ============================================================================
// 
// KEY IMPROVEMENT: Before updating any file, this module:
// 1. Scans the project for all actual files
// 2. Matches AI-detected filename against real project files
// 3. Verifies the file exists and is the correct one
// 4. Opens the verified file, then applies code
//
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

console.log('🔍 [AutoMode Verifier] Loading enhanced file verification...');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProjectFile {
  name: string;
  path: string;
  extension: string;
  relativePath: string;
}

interface FileMatchResult {
  found: boolean;
  exactMatch: boolean;
  matchedFile: ProjectFile | null;
  candidates: ProjectFile[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  message: string;
}

interface VerifiedFileTask {
  detectedName: string;      // What AI said (e.g., "app.tsx")
  verifiedName: string;      // Actual file name (e.g., "App.tsx")
  verifiedPath: string;      // Full path
  code: string;
  confidence: 'high' | 'medium' | 'low';
  needsConfirmation: boolean;
}

// ============================================================================
// PROJECT FILE CACHE
// ============================================================================

let projectFilesCache: ProjectFile[] = [];
let lastScanTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Scan project and cache all files
 */
export async function scanProjectFiles(): Promise<ProjectFile[]> {
  const now = Date.now();
  
  // Return cache if fresh
  if (projectFilesCache.length > 0 && (now - lastScanTime) < CACHE_DURATION) {
    console.log(`📁 [Verifier] Using cached files (${projectFilesCache.length} files)`);
    return projectFilesCache;
  }
  
  const projectPath = (window as any).currentFolderPath || 
                      (window as any).currentProjectPath || '';
  
  if (!projectPath) {
    console.warn('⚠️ [Verifier] No project path set');
    return [];
  }
  
  console.log(`📁 [Verifier] Scanning project: ${projectPath}`);
  
  try {
    // Method 1: Try Tauri command
    const files = await invoke('ai_list_directory_recursive', { 
      path: projectPath,
      maxDepth: 10 
    }) as any[];
    
    projectFilesCache = files
      .filter((f: any) => !f.is_directory)
      .map((f: any) => ({
        name: f.name,
        path: f.path,
        extension: getExtension(f.name),
        relativePath: f.path.replace(projectPath, '').replace(/^[/\\]/, '')
      }));
    
    lastScanTime = now;
    console.log(`✅ [Verifier] Scanned ${projectFilesCache.length} files`);
    return projectFilesCache;
    
  } catch (e) {
    console.warn('⚠️ [Verifier] Tauri scan failed, using DOM fallback');
    return scanFilesFromDOM();
  }
}

/**
 * Fallback: Scan files from file tree DOM
 */
function scanFilesFromDOM(): ProjectFile[] {
  const files: ProjectFile[] = [];
  
  const selectors = [
    '#file-tree .file-item[data-path]',
    '.file-tree .tree-file[data-path]',
    '.explorer-panel [data-file-path]',
    '.file-explorer [data-path]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const path = el.getAttribute('data-path') || 
                   el.getAttribute('data-file-path') || '';
      if (path && !path.endsWith('/') && !path.endsWith('\\')) {
        const name = path.split(/[/\\]/).pop() || '';
        if (name && !files.some(f => f.path === path)) {
          files.push({
            name,
            path,
            extension: getExtension(name),
            relativePath: path
          });
        }
      }
    });
  }
  
  projectFilesCache = files;
  lastScanTime = Date.now();
  console.log(`✅ [Verifier] DOM scan found ${files.length} files`);
  return files;
}

/**
 * Get file extension
 */
function getExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Force refresh the file cache
 */
export function invalidateFileCache(): void {
  projectFilesCache = [];
  lastScanTime = 0;
  console.log('🔄 [Verifier] File cache invalidated');
}

// ============================================================================
// FILE MATCHING & VERIFICATION
// ============================================================================

/**
 * Find the best matching file in the project
 * This is the KEY function for verification
 */
export async function verifyFileName(detectedName: string): Promise<FileMatchResult> {
  // Ensure we have project files
  const projectFiles = await scanProjectFiles();
  
  if (projectFiles.length === 0) {
    return {
      found: false,
      exactMatch: false,
      matchedFile: null,
      candidates: [],
      confidence: 'none',
      message: 'No project files found. Open a folder first.'
    };
  }
  
  const detectedLower = detectedName.toLowerCase();
  const detectedBase = detectedName.replace(/\.[^/.]+$/, '').toLowerCase();
  const detectedExt = getExtension(detectedName);
  
  console.log(`🔍 [Verifier] Looking for: "${detectedName}"`);
  
  // Strategy 1: Exact match (case-insensitive)
  const exactMatch = projectFiles.find(f => 
    f.name.toLowerCase() === detectedLower
  );
  
  if (exactMatch) {
    console.log(`✅ [Verifier] Exact match: ${exactMatch.name} (${exactMatch.path})`);
    return {
      found: true,
      exactMatch: true,
      matchedFile: exactMatch,
      candidates: [exactMatch],
      confidence: 'high',
      message: `Found: ${exactMatch.name}`
    };
  }
  
  // Strategy 2: Base name match (same name, different case)
  const baseMatches = projectFiles.filter(f => {
    const fileBase = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
    return fileBase === detectedBase && f.extension === detectedExt;
  });
  
  if (baseMatches.length === 1) {
    console.log(`✅ [Verifier] Base match: ${baseMatches[0].name}`);
    return {
      found: true,
      exactMatch: false,
      matchedFile: baseMatches[0],
      candidates: baseMatches,
      confidence: 'high',
      message: `Found: ${baseMatches[0].name} (case corrected from "${detectedName}")`
    };
  }
  
  // Strategy 3: Fuzzy match - similar names
  const fuzzyMatches = projectFiles.filter(f => {
    const fileBase = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
    const fileLower = f.name.toLowerCase();
    
    // Same extension and similar base name
    if (f.extension !== detectedExt) return false;
    
    // Check similarity
    return fileBase.includes(detectedBase) || 
           detectedBase.includes(fileBase) ||
           levenshteinDistance(fileBase, detectedBase) <= 2;
  });
  
  if (fuzzyMatches.length === 1) {
    console.log(`✅ [Verifier] Fuzzy match: ${fuzzyMatches[0].name}`);
    return {
      found: true,
      exactMatch: false,
      matchedFile: fuzzyMatches[0],
      candidates: fuzzyMatches,
      confidence: 'medium',
      message: `Possible match: ${fuzzyMatches[0].name} (did you mean this instead of "${detectedName}"?)`
    };
  }
  
  if (fuzzyMatches.length > 1) {
    console.log(`⚠️ [Verifier] Multiple matches for "${detectedName}":`, fuzzyMatches.map(f => f.name));
    return {
      found: true,
      exactMatch: false,
      matchedFile: null,
      candidates: fuzzyMatches,
      confidence: 'low',
      message: `Multiple files match "${detectedName}". Please select the correct one.`
    };
  }
  
  // Strategy 4: Extension-only match
  const sameExtension = projectFiles.filter(f => f.extension === detectedExt);
  
  if (sameExtension.length > 0 && sameExtension.length <= 5) {
    return {
      found: false,
      exactMatch: false,
      matchedFile: null,
      candidates: sameExtension.slice(0, 5),
      confidence: 'none',
      message: `"${detectedName}" not found. Did you mean one of these?`
    };
  }
  
  // No match found
  return {
    found: false,
    exactMatch: false,
    matchedFile: null,
    candidates: [],
    confidence: 'none',
    message: `File "${detectedName}" not found in project.`
  };
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// ============================================================================
// VERIFIED AUTO-APPLY FLOW
// ============================================================================

/**
 * Process AI code block with file verification
 * This is the main entry point for Auto Mode
 */
export async function processWithVerification(
  detectedFileName: string, 
  code: string
): Promise<{ success: boolean; message: string; appliedTo?: string }> {
  
  console.log(`\n🔍 [AutoMode] ========== VERIFYING FILE ==========`);
  console.log(`🔍 [AutoMode] AI detected file: "${detectedFileName}"`);
  
  // Step 1: Verify the file exists
  const verification = await verifyFileName(detectedFileName);
  
  if (!verification.found) {
    console.log(`❌ [AutoMode] File not found: ${detectedFileName}`);
    console.log(`❌ [AutoMode] ${verification.message}`);
    
    // Show error notification
    showVerificationError(detectedFileName, verification);
    
    return {
      success: false,
      message: verification.message
    };
  }
  
  // Step 2: Get the verified file
  let targetFile: ProjectFile;
  
  if (verification.matchedFile) {
    targetFile = verification.matchedFile;
  } else if (verification.candidates.length > 0) {
    // Multiple candidates - need user selection
    console.log(`⚠️ [AutoMode] Multiple matches, showing selection dialog`);
    
    const selected = await showFileSelectionDialog(
      detectedFileName, 
      verification.candidates
    );
    
    if (!selected) {
      return {
        success: false,
        message: 'File selection cancelled'
      };
    }
    
    targetFile = selected;
  } else {
    return {
      success: false,
      message: 'No matching file found'
    };
  }
  
  console.log(`✅ [AutoMode] Verified file: ${targetFile.name}`);
  console.log(`📂 [AutoMode] Path: ${targetFile.path}`);
  
  // Step 3: Check if case was corrected
  if (targetFile.name !== detectedFileName) {
    console.log(`📝 [AutoMode] Name corrected: "${detectedFileName}" → "${targetFile.name}"`);
  }
  
  // Step 4: Open the verified file
  const opened = await openVerifiedFile(targetFile);
  
  if (!opened) {
    return {
      success: false,
      message: `Could not open file: ${targetFile.name}`
    };
  }
  
  // Step 5: Verify we're in the correct file before applying
  const currentFile = getCurrentEditorFileName();
  if (!currentFile || currentFile.toLowerCase() !== targetFile.name.toLowerCase()) {
    console.log(`⚠️ [AutoMode] File mismatch after open!`);
    console.log(`   Expected: ${targetFile.name}`);
    console.log(`   Got: ${currentFile}`);
    
    return {
      success: false,
      message: `File mismatch: expected ${targetFile.name}, got ${currentFile}`
    };
  }
  
  console.log(`✅ [AutoMode] File verified in editor: ${currentFile}`);
  
  // Step 6: Apply the code
  const applied = await applyCodeToEditor(code);
  
  if (applied) {
    console.log(`✅ [AutoMode] Code applied to ${targetFile.name}`);
    showSuccessNotification(targetFile.name);
    
    return {
      success: true,
      message: `Updated ${targetFile.name}`,
      appliedTo: targetFile.path
    };
  } else {
    return {
      success: false,
      message: `Failed to apply code to ${targetFile.name}`
    };
  }
}

/**
 * Open a verified file in the editor
 */
async function openVerifiedFile(file: ProjectFile): Promise<boolean> {
  console.log(`📂 [AutoMode] Opening: ${file.name}`);
  
  // Method 1: Use window.openFile if available
  if (typeof (window as any).openFile === 'function') {
    try {
      await (window as any).openFile(file.path);
      await sleep(300);
      
      const current = getCurrentEditorFileName();
      if (current?.toLowerCase() === file.name.toLowerCase()) {
        console.log(`✅ [AutoMode] Opened via window.openFile`);
        return true;
      }
    } catch (e) {
      console.warn('openFile failed:', e);
    }
  }
  
  // Method 2: Use window.openFileInEditor
  if (typeof (window as any).openFileInEditor === 'function') {
    try {
      await (window as any).openFileInEditor(file.path);
      await sleep(300);
      
      const current = getCurrentEditorFileName();
      if (current?.toLowerCase() === file.name.toLowerCase()) {
        console.log(`✅ [AutoMode] Opened via openFileInEditor`);
        return true;
      }
    } catch (e) {
      console.warn('openFileInEditor failed:', e);
    }
  }
  
  // Method 3: Find and double-click in file tree
  const fileElement = findFileInTree(file);
  if (fileElement) {
    fileElement.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    await sleep(50);
    
    const rect = fileElement.getBoundingClientRect();
    fileElement.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 10,
      clientY: rect.top + 10
    }));
    
    // Wait for file to open
    for (let i = 0; i < 20; i++) {
      await sleep(150);
      const current = getCurrentEditorFileName();
      if (current?.toLowerCase() === file.name.toLowerCase()) {
        console.log(`✅ [AutoMode] Opened via double-click`);
        return true;
      }
    }
  }
  
  console.log(`❌ [AutoMode] Failed to open file: ${file.name}`);
  return false;
}

/**
 * Find file element in DOM tree
 */
function findFileInTree(file: ProjectFile): HTMLElement | null {
  const selectors = [
    `[data-path="${file.path}"]`,
    `[data-file-path="${file.path}"]`,
    `[data-path$="${file.name}"]`,
    `[title="${file.name}"]`
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
  }
  
  // Search by text content
  const allFiles = document.querySelectorAll(
    '.file-item, .tree-file, [data-path]'
  );
  
  for (const el of allFiles) {
    const text = el.textContent?.trim() || '';
    if (text === file.name || text.endsWith(file.name)) {
      return el as HTMLElement;
    }
  }
  
  return null;
}

/**
 * Get current file name from Monaco editor
 */
function getCurrentEditorFileName(): string | null {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return null;
  
  const editors = monaco.editor.getEditors();
  if (!editors || editors.length === 0) return null;
  
  for (const editor of editors) {
    if (editor.getDomNode()?.offsetParent !== null) {
      const model = editor.getModel();
      if (model) {
        const path = model.uri?.path || model.uri?.toString() || '';
        return path.split('/').pop()?.split('\\').pop() || null;
      }
    }
  }
  
  return null;
}

/**
 * Apply code to current editor
 */
async function applyCodeToEditor(code: string): Promise<boolean> {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return false;
  
  const editors = monaco.editor.getEditors();
  if (!editors || editors.length === 0) return false;
  
  // Find active editor
  let editor = null;
  for (const e of editors) {
    if (e.getDomNode()?.offsetParent !== null) {
      editor = e;
      break;
    }
  }
  
  if (!editor) editor = editors[0];
  
  const model = editor.getModel();
  if (!model) return false;
  
  try {
    // Use Monaco edit operation (supports undo)
    const fullRange = model.getFullModelRange();
    
    editor.executeEdits('auto-mode-apply', [{
      range: fullRange,
      text: code,
      forceMoveMarkers: true
    }]);
    
    // Move cursor to top
    editor.setPosition({ lineNumber: 1, column: 1 });
    editor.revealLine(1);
    
    return true;
  } catch (e) {
    console.error('Apply error:', e);
    return false;
  }
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Show file verification error
 */
function showVerificationError(fileName: string, result: FileMatchResult): void {
  // Remove existing
  const existing = document.getElementById('auto-mode-verification-error');
  if (existing) existing.remove();
  
  const dialog = document.createElement('div');
  dialog.id = 'auto-mode-verification-error';
  dialog.className = 'am-verification-dialog';
  
  let candidatesHtml = '';
  if (result.candidates.length > 0) {
    candidatesHtml = `
      <div class="am-candidates">
        <div class="am-candidates-label">Did you mean:</div>
        ${result.candidates.map(f => `
          <button class="am-candidate-btn" data-path="${f.path}" data-name="${f.name}">
            ${f.name}
          </button>
        `).join('')}
      </div>
    `;
  }
  
  dialog.innerHTML = `
    <div class="am-dialog-content">
      <div class="am-dialog-icon">⚠️</div>
      <div class="am-dialog-message">
        <strong>File not found: "${fileName}"</strong>
        <p>${result.message}</p>
      </div>
      ${candidatesHtml}
      <button class="am-close-btn">Close</button>
    </div>
  `;
  
  // Add styles
  injectVerificationStyles();
  
  document.body.appendChild(dialog);
  
  // Handle candidate clicks
  dialog.querySelectorAll('.am-candidate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-path');
      const name = btn.getAttribute('data-name');
      console.log(`User selected: ${name} (${path})`);
      dialog.remove();
      
      // TODO: Re-trigger with selected file
      document.dispatchEvent(new CustomEvent('auto-mode-file-selected', {
        detail: { path, name }
      }));
    });
  });
  
  // Close button
  dialog.querySelector('.am-close-btn')?.addEventListener('click', () => {
    dialog.remove();
  });
  
  // Auto-close after 10 seconds
  setTimeout(() => dialog.remove(), 10000);
}

/**
 * Show file selection dialog when multiple matches found
 */
async function showFileSelectionDialog(
  detectedName: string, 
  candidates: ProjectFile[]
): Promise<ProjectFile | null> {
  return new Promise((resolve) => {
    const existing = document.getElementById('auto-mode-selection-dialog');
    if (existing) existing.remove();
    
    const dialog = document.createElement('div');
    dialog.id = 'auto-mode-selection-dialog';
    dialog.className = 'am-selection-dialog';
    
    dialog.innerHTML = `
      <div class="am-dialog-content">
        <div class="am-dialog-header">
          <div class="am-dialog-icon">📁</div>
          <div class="am-dialog-title">Select the correct file</div>
        </div>
        <div class="am-dialog-body">
          <p>AI mentioned <strong>"${detectedName}"</strong> but found multiple matches:</p>
          <div class="am-file-list">
            ${candidates.map((f, i) => `
              <button class="am-file-option" data-index="${i}">
                <span class="am-file-icon">📄</span>
                <span class="am-file-name">${f.name}</span>
                <span class="am-file-path">${f.relativePath}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="am-dialog-footer">
          <button class="am-cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    
    injectVerificationStyles();
    document.body.appendChild(dialog);
    
    // Handle selection
    dialog.querySelectorAll('.am-file-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index') || '0');
        dialog.remove();
        resolve(candidates[index]);
      });
    });
    
    // Cancel
    dialog.querySelector('.am-cancel-btn')?.addEventListener('click', () => {
      dialog.remove();
      resolve(null);
    });
    
    // Click outside to cancel
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
        resolve(null);
      }
    });
  });
}

/**
 * Show success notification
 */
function showSuccessNotification(fileName: string): void {
  // Use existing notification system if available
  if (typeof (window as any).showNotification === 'function') {
    (window as any).showNotification(`✅ Updated ${fileName}`, 'success');
    return;
  }
  
  // Fallback
  const toast = document.createElement('div');
  toast.className = 'am-success-toast';
  toast.innerHTML = `✅ Updated <strong>${fileName}</strong>`;
  
  injectVerificationStyles();
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Inject styles for verification dialogs
 */
function injectVerificationStyles(): void {
  if (document.getElementById('auto-mode-verifier-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'auto-mode-verifier-styles';
  style.textContent = `
    /* Verification Dialog */
    .am-verification-dialog,
    .am-selection-dialog {
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
      animation: fadeIn 0.2s ease;
    }
    
    .am-dialog-content {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
    
    .am-dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .am-dialog-icon {
      font-size: 32px;
    }
    
    .am-dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: #e6edf3;
    }
    
    .am-dialog-message {
      color: #c9d1d9;
      margin-bottom: 16px;
    }
    
    .am-dialog-message strong {
      color: #ff6b6b;
    }
    
    .am-dialog-message p {
      margin-top: 8px;
      color: #8b949e;
      font-size: 13px;
    }
    
    .am-candidates {
      margin: 16px 0;
    }
    
    .am-candidates-label {
      color: #8b949e;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .am-candidate-btn {
      display: block;
      width: 100%;
      padding: 10px 14px;
      margin: 6px 0;
      background: #2d333b;
      border: 1px solid #444c56;
      border-radius: 6px;
      color: #58a6ff;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .am-candidate-btn:hover {
      background: #3d444d;
      border-color: #58a6ff;
    }
    
    .am-close-btn,
    .am-cancel-btn {
      padding: 8px 20px;
      background: #3c3c3c;
      border: none;
      border-radius: 6px;
      color: #e6edf3;
      cursor: pointer;
      margin-top: 16px;
    }
    
    .am-close-btn:hover,
    .am-cancel-btn:hover {
      background: #4c4c4c;
    }
    
    /* File selection */
    .am-file-list {
      margin: 16px 0;
    }
    
    .am-file-option {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px;
      margin: 6px 0;
      background: #2d333b;
      border: 1px solid #444c56;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .am-file-option:hover {
      background: #3d444d;
      border-color: #10b981;
    }
    
    .am-file-icon {
      font-size: 20px;
    }
    
    .am-file-name {
      font-weight: 500;
      color: #e6edf3;
      flex: 1;
    }
    
    .am-file-path {
      font-size: 11px;
      color: #6e7681;
    }
    
    .am-dialog-footer {
      text-align: right;
    }
    
    /* Success toast */
    .am-success-toast {
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 12px 20px;
      background: rgba(16, 185, 129, 0.95);
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
      animation: slideUp 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .am-success-toast.fade-out {
      animation: fadeOut 0.3s ease forwards;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  
  document.head.appendChild(style);
}

// ============================================================================
// UTILITY
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// INTEGRATION WITH EXISTING SYSTEM
// ============================================================================

/**
 * Enhanced version of processMultiFileApply that uses verification
 */
export async function processMultiFileApplyWithVerification(
  tasks: Array<{ fileName: string; code: string }>
): Promise<{ success: number; failed: number; skipped: number }> {
  
  console.log(`\n📚 [AutoMode] ========== PROCESSING WITH VERIFICATION ==========`);
  console.log(`📚 [AutoMode] ${tasks.length} file(s) to process`);
  
  // Pre-scan project files
  await scanProjectFiles();
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const task of tasks) {
    console.log(`\n📂 [AutoMode] Processing: ${task.fileName}`);
    
    const result = await processWithVerification(task.fileName, task.code);
    
    if (result.success) {
      success++;
    } else {
      failed++;
      console.log(`❌ [AutoMode] Failed: ${result.message}`);
    }
    
    // Delay between files
    if (tasks.indexOf(task) < tasks.length - 1) {
      await sleep(500);
    }
  }
  
  console.log(`\n📊 [AutoMode] Complete: ${success} updated, ${failed} failed, ${skipped} skipped`);
  
  return { success, failed, skipped };
}

// ============================================================================
// EXPORTS & GLOBAL ACCESS
// ============================================================================

export {
  scanProjectFiles,
  verifyFileName,
  openVerifiedFile,
  getCurrentEditorFileName,
  applyCodeToEditor
};

// Global access
if (typeof window !== 'undefined') {
  (window as any).autoModeVerifier = {
    scan: scanProjectFiles,
    verify: verifyFileName,
    process: processWithVerification,
    processMultiple: processMultiFileApplyWithVerification,
    invalidateCache: invalidateFileCache,
    getCache: () => projectFilesCache
  };
  
  // Hook into existing auto-apply system
  (window as any).verifiedAutoApply = processWithVerification;
}

console.log('✅ [AutoMode Verifier] Loaded');
console.log('   Usage: autoModeVerifier.verify("App.tsx")');
console.log('   Usage: autoModeVerifier.process("App.tsx", code)');
