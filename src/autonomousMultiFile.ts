// autonomousMultiFile.ts - Multi-File Operations
// ============================================================================
// This file contains multi-file operations: file detection, status dialog, 
// code block processing, auto-apply main logic
// 
// SPLIT FROM: autonomousCoding.ts (master file - keep unchanged)
// COMPANION: autonomousCore.ts (core functionality)
// ============================================================================
// When updating: Update autonomousCoding.ts first, then sync here
// ============================================================================

import { showNotification } from './fileSystem';

// Import from core module
import {
  // State variables
  autoApplyEnabled,
  processedBlockIds,
  isTypingInProgress,
  stopTypingFlag,
  lineDelay,
  originalCodeBeforeApply,
  hasUnapprovedChanges,
  lastChangeLines,
  activeHighlightDecorations,
  pendingMultiFileDecorations,
  AUTO_APPLY_ICONS,
  
  // Helper functions
  getMonacoEditorForApply,
  getCurrentFileName,
  getCurrentFilePath,
  showAutoApplyToast,
  getProgressiveDelay,
  
  // Decoration functions
  clearPendingDecorations,
  storePendingDecorations,
  clearAllDecorations,
  clearHighlightDecorations,
  injectHighlightStyles,
  
  // Confirmation functions
  acceptChanges,
  rejectChanges,
  showConfirmationBar,
  removeConfirmationBar,
  waitForConfirmation,
  highlightChangeLines,
  injectConfirmationStyles,
  
  // Save functions
  updateSaveState,
  triggerFileSave,
  
  // State setters
  setAutoApplyEnabled,
  setIsTypingInProgress,
  setStopTypingFlag,
  setHasUnapprovedChanges,
  setOriginalCodeBeforeApply,
  addProcessedBlockId,
  clearProcessedBlockIds,
  
  // Diff and update functions
  applySmartUpdate,
  applyCodeInstant,
  computeLineDiff,
  computeLCS,
  generateBlockId,
  sleep,
  updateAutoApplyIndicator,
  
  // Style and init functions
  injectAutoApplyStyles,
} from './autonomousCore';

// ============================================================================
// FILE NAME VALIDATION
// ============================================================================

interface FileValidation {
  isValid: boolean;
  detectedFileName: string | null;
  currentFileName: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}

function extractTargetFileName(block: HTMLElement, code: string): string | null {
  const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php))/i;
  
  console.log(`🔍 [FileDetect] Starting detection for block...`);
  
  // 1. Check block's data attributes first (highest priority)
  const dataFile = block.getAttribute('data-file') || block.getAttribute('data-filename') || block.getAttribute('data-path');
  if (dataFile) {
    const fileName = dataFile.split('/').pop() || dataFile;
    // Don't filter data attributes - they're explicitly set by the system
    console.log(`📄 [FileDetect] Found in data attribute: ${fileName}`);
    return fileName;
  }
  
  // 2. Check the block's header element (e.g., "TYPESCRIPT" with filename)
  const header = block.querySelector('.cbe-header, .muf-header, [class*="header"]');
  if (header) {
    const headerText = header.textContent || '';
    const headerMatch = headerText.match(FILE_EXT_PATTERN);
    if (headerMatch && !isTechnologyNameNotFile(headerMatch[1])) {
      console.log(`📄 [FileDetect] Found in header: ${headerMatch[1]}`);
      return headerMatch[1];
    }
  }
  
  // 3. CRITICAL: Walk UP through ancestors to find the closest heading with filename
  // This is key for distinguishing "## Updated App.tsx" from "## Updated main.tsx"
  let currentEl: Element | null = block;
  let searchedElements = 0;
  
  while (currentEl && searchedElements < 20) {
    // Check previous siblings of current element
    let sibling = currentEl.previousElementSibling;
    let siblingCount = 0;
    
    while (sibling && siblingCount < 10) {
      // Stop if we hit another code block - wrong section
      if (sibling.classList?.contains('cbe-wrapper') || 
          sibling.classList?.contains('muf-block') || 
          sibling.querySelector('pre code')) {
        console.log(`📄 [FileDetect] Hit another code block, stopping sibling search`);
        break;
      }
      
      const sibText = sibling.textContent?.trim() || '';
      
      // Check for headings with filename (## Updated App.tsx, ### main.tsx, etc.)
      if (sibling.tagName?.match(/^H[1-6]$/) || sibText.startsWith('#')) {
        const headingMatch = sibText.match(/(?:Updated?\s+)?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))/i);
        if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
          console.log(`📄 [FileDetect] Found in heading "${sibText}": ${headingMatch[1]}`);
          return headingMatch[1];
        }
      }
      
      // Check for bold filename (**App.tsx**)
      const boldMatch = sibText.match(/\*\*([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))\*\*/i);
      if (boldMatch && !isTechnologyNameNotFile(boldMatch[1])) {
        console.log(`📄 [FileDetect] Found bold filename: ${boldMatch[1]}`);
        return boldMatch[1];
      }
      
      // Check for backtick filename in short text
      if (sibText.length < 200) {
        const backtickMatch = sibText.match(/`([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))`/i);
        if (backtickMatch && !isTechnologyNameNotFile(backtickMatch[1])) {
          console.log(`📄 [FileDetect] Found backtick: ${backtickMatch[1]}`);
          return backtickMatch[1];
        }
      }
      
      // Check for standalone filename
      const standaloneMatch = sibText.match(/^([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))[:.]?\s*$/i);
      if (standaloneMatch && !isTechnologyNameNotFile(standaloneMatch[1])) {
        console.log(`📄 [FileDetect] Found standalone: ${standaloneMatch[1]}`);
        return standaloneMatch[1];
      }
      
      sibling = sibling.previousElementSibling;
      siblingCount++;
    }
    
    // Move up to parent
    currentEl = currentEl.parentElement;
    searchedElements++;
  }
  
  // 4. Check code content for hints
  const codeFileName = detectFileNameFromCode(code);
  if (codeFileName) {
    console.log(`📄 [FileDetect] Detected from code content: ${codeFileName}`);
    return codeFileName;
  }
  
  // 5. LAST RESORT: Use block position to map to file mentions in message
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (parentMessage) {
    // Get all code blocks in this message - use multiple selectors to catch all formats
    const allBlocks = parentMessage.querySelectorAll('.cbe-wrapper, .muf-block, pre, [class*="code-block"], div[class*="highlight"]');
    const blockArray = Array.from(allBlocks).filter(b => {
      // Filter out blocks that are nested inside other blocks
      const parent = b.parentElement;
      if (parent?.closest('.cbe-wrapper, .muf-block')) return false;
      return true;
    });
    const blockIndex = blockArray.findIndex(b => b === block || b.contains(block) || block.contains(b));
    
    console.log(`📄 [FileDetect] Block index: ${blockIndex} of ${blockArray.length}`);
    
    // ⭐ NEW: Check if there's a heading directly before this block with a filename
    const prevSibling = block.previousElementSibling;
    if (prevSibling) {
      const prevText = prevSibling.textContent?.trim() || '';
      const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php))/i;
      const headingMatch = prevText.match(FILE_EXT_PATTERN);
      if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
        console.log(`📄 [FileDetect] Found in preceding sibling: ${headingMatch[1]}`);
        return headingMatch[1];
      }
    }
    
    // ⭐ NEW: Check parent's previous sibling (for nested structures)
    const parentPrevSibling = block.parentElement?.previousElementSibling;
    if (parentPrevSibling) {
      const prevText = parentPrevSibling.textContent?.trim() || '';
      const FILE_EXT_PATTERN = /([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json|xml|vue|svelte|go|rb|php))/i;
      const headingMatch = prevText.match(FILE_EXT_PATTERN);
      if (headingMatch && !isTechnologyNameNotFile(headingMatch[1])) {
        console.log(`📄 [FileDetect] Found in parent's preceding sibling: ${headingMatch[1]}`);
        return headingMatch[1];
      }
    }
    
    // Get all file mentions in the message (in order)
    const messageText = parentMessage.textContent || '';
    const filePattern = /\b([a-zA-Z][a-zA-Z0-9_.-]*\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))\b/gi;
    const allMentions: string[] = [];
    let match;
    while ((match = filePattern.exec(messageText)) !== null) {
      const fileName = match[1];
      // Skip common config files unless they're the only mentions
      if (!['package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js'].includes(fileName.toLowerCase())) {
        // Skip technology names that look like filenames (Node.js, React.js, etc.)
        if (!isTechnologyNameNotFile(fileName)) {
          if (!allMentions.map(f => f.toLowerCase()).includes(fileName.toLowerCase())) {
            allMentions.push(fileName);
          }
        }
      }
    }
    
    console.log(`📄 [FileDetect] All file mentions: ${allMentions.join(', ') || '(none)'}`);
    
    // Map block index to file mention
    if (allMentions.length > 0 && blockIndex >= 0) {
      // ⭐ FIX: Even if there are more blocks than mentions, try to map
      // Use modulo or direct index if within bounds
      if (blockIndex < allMentions.length) {
        console.log(`📄 [FileDetect] Mapped block ${blockIndex} -> "${allMentions[blockIndex]}"`);
        return allMentions[blockIndex];
      }
      
      // ⭐ NEW: Try to detect from preceding text for this specific block
      // Walk backwards from block to find nearest file mention
      let prevEl = block.previousElementSibling;
      let searchDepth = 0;
      while (prevEl && searchDepth < 5) {
        // Skip other code blocks
        if (prevEl.querySelector('pre, code') || prevEl.tagName === 'PRE') {
          prevEl = prevEl.previousElementSibling;
          searchDepth++;
          continue;
        }
        
        const prevText = prevEl.textContent || '';
        const fileMatch = prevText.match(/\b([a-zA-Z][a-zA-Z0-9_.-]*\.(tsx?|jsx?|py|css|html|json|xml))\b/i);
        if (fileMatch && !isTechnologyNameNotFile(fileMatch[1])) {
          console.log(`📄 [FileDetect] Found in preceding element: ${fileMatch[1]}`);
          return fileMatch[1];
        }
        
        prevEl = prevEl.previousElementSibling;
        searchDepth++;
      }
      
      // If we have command blocks (npm install, npm run), don't map to a file
      const codePreview = block.textContent?.substring(0, 50) || '';
      if (codePreview.match(/^\s*(npm|yarn|pnpm|npx)\s+/)) {
        console.log(`📄 [FileDetect] Skipping command block: "${codePreview.substring(0, 30)}..."`);
        return null;
      }
      
      // Otherwise return first mention as fallback
      console.log(`📄 [FileDetect] Using first mention (fallback): ${allMentions[0]}`);
      return allMentions[0];
    }
  }
  
  console.log(`📄 [FileDetect] No file name detected for block`);
  return null;
}

/**
 * Check if a detected "filename" is actually a technology/framework name
 * These look like filenames but are actually technology references (Node.js, React.js, etc.)
 */
function isTechnologyNameNotFile(fileName: string): boolean {
  const techNames = [
    // JavaScript frameworks/runtimes - these are NOT files
    'node.js', 'react.js', 'vue.js', 'angular.js', 'next.js', 'nuxt.js',
    'express.js', 'nest.js', 'ember.js', 'backbone.js', 'meteor.js',
    'electron.js', 'three.js', 'd3.js', 'chart.js', 'p5.js', 'rx.js',
    'socket.io', 'deno.js', 'bun.js', 'jquery.js', 'lodash.js',
    'moment.js', 'axios.js', 'redux.js', 'mobx.js', 'svelte.js',
    'gatsby.js', 'remix.js', 'solid.js', 'preact.js', 'alpine.js',
    'lit.js', 'stimulus.js', 'turbo.js', 'hotwire.js'
  ];
  
  // Common words that get incorrectly parsed as filenames
  // e.g., "update all .tsx files" -> "all.tsx", "each .py file" -> "each.py"
  const commonWordFalsePositives = [
    'all.tsx', 'all.ts', 'all.jsx', 'all.js', 'all.py', 'all.css', 'all.json', 'all.html',
    'each.tsx', 'each.ts', 'each.jsx', 'each.js', 'each.py', 'each.css',
    'every.tsx', 'every.ts', 'every.jsx', 'every.js', 'every.py',
    'any.tsx', 'any.ts', 'any.jsx', 'any.js', 'any.py',
    'some.tsx', 'some.ts', 'some.jsx', 'some.js', 'some.py',
    'other.tsx', 'other.ts', 'other.jsx', 'other.js', 'other.py', 'other.css',
    'new.tsx', 'new.ts', 'new.jsx', 'new.js', 'new.py', 'new.css',
    'the.tsx', 'the.ts', 'the.jsx', 'the.js', 'the.py', 'the.css',
    'your.tsx', 'your.ts', 'your.jsx', 'your.js', 'your.py',
    'my.tsx', 'my.ts', 'my.jsx', 'my.js', 'my.py', 'my.css',
    'this.tsx', 'this.ts', 'this.jsx', 'this.js', 'this.py',
    'that.tsx', 'that.ts', 'that.jsx', 'that.js', 'that.py',
    'these.tsx', 'these.ts', 'these.jsx', 'these.js',
    'those.tsx', 'those.ts', 'those.jsx', 'those.js',
    'both.tsx', 'both.ts', 'both.jsx', 'both.js',
    'following.tsx', 'following.ts', 'following.jsx', 'following.js',
    'existing.tsx', 'existing.ts', 'existing.jsx', 'existing.js', 'existing.css',
    'updated.tsx', 'updated.ts', 'updated.jsx', 'updated.js', 'updated.css',
    'modified.tsx', 'modified.ts', 'modified.jsx', 'modified.js',
    'relevant.tsx', 'relevant.ts', 'relevant.jsx', 'relevant.js',
    'specific.tsx', 'specific.ts', 'specific.jsx', 'specific.js',
    'related.tsx', 'related.ts', 'related.jsx', 'related.js',
    'single.tsx', 'single.ts', 'single.jsx', 'single.js',
    'multiple.tsx', 'multiple.ts', 'multiple.jsx', 'multiple.js',
    'separate.tsx', 'separate.ts', 'separate.jsx', 'separate.js'
  ];
  
  const lowerName = fileName.toLowerCase();
  
  // Check against common word false positives
  if (commonWordFalsePositives.includes(lowerName)) {
    console.log(`🚫 [FileDetect] Skipping common word false positive: ${fileName}`);
    return true;
  }
  
  // Check exact match against known tech names
  if (techNames.includes(lowerName)) {
    console.log(`🚫 [FileDetect] Skipping technology name: ${fileName}`);
    return true;
  }
  
  // Check if it's a capitalized single word + .js (likely technology name like "Node.js")
  // Real files are usually lowercase or camelCase like "nodeUtils.js", "myNode.js"
  if (/^[A-Z][a-z]+\.js$/i.test(fileName) && fileName[0] === fileName[0].toUpperCase()) {
    const baseName = fileName.replace(/\.js$/i, '');
    // Single capitalized word under 12 chars = likely tech name
    if (baseName.length <= 12 && /^[A-Z][a-z]+$/.test(baseName)) {
      console.log(`🚫 [FileDetect] Skipping likely technology name: ${fileName}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Check if code content is a terminal command (not a file to apply)
 */
function isTerminalCommand(code: string): boolean {
  const trimmedCode = code.trim();
  
  // Check for common command prefixes
  const commandPrefixes = [
    'npm ', 'yarn ', 'pnpm ', 'npx ',
    'node ', 'deno ', 'bun ',
    'cd ', 'mkdir ', 'rm ', 'cp ', 'mv ', 'ls ', 'cat ',
    'git ', 'svn ',
    'pip ', 'python ', 'python3 ',
    'cargo ', 'rustup ',
    'flutter ', 'dart ',
    'dotnet ', 'nuget ',
    'docker ', 'kubectl ',
    'brew ', 'apt ', 'yum ', 'pacman ',
    'curl ', 'wget ',
    'sudo '
  ];
  
  for (const prefix of commandPrefixes) {
    if (trimmedCode.startsWith(prefix) || trimmedCode.startsWith(prefix.trim())) {
      return true;
    }
  }
  
  // Check for shell-style commands
  if (trimmedCode.match(/^\$\s+/)) return true;  // $ npm install
  if (trimmedCode.match(/^>\s+/)) return true;   // > npm install
  if (trimmedCode.match(/^#.*\n?$/)) return true; // Just a comment
  
  return false;
}

function detectFileNameFromCode(code: string): string | null {
  if (code.includes('if __name__ == "__main__"') || code.includes("if __name__ == '__main__'")) return 'main.py';
  if (code.trim().startsWith('{') && code.includes('"name"') && code.includes('"version"')) return 'package.json';
  if (code.includes('<!DOCTYPE html>') || code.includes('<html')) return 'index.html';
  return null;
}

function checkAIMessageForDifferentFile(block: HTMLElement, currentFileName: string): { mentionsDifferentFile: boolean; mentionedFile: string | null } {
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (!parentMessage) return { mentionsDifferentFile: false, mentionedFile: null };
  
  const messageText = parentMessage.textContent || '';
  const messageLower = messageText.toLowerCase();
  const currentFileBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  
  const fileRegex = /\b([a-zA-Z][a-zA-Z0-9_-]*\.(tsx?|jsx?|py|rs|css|scss|cs|java|html|json))\b/gi;
  
  const allMentionedFiles: string[] = [];
  let match;
  while ((match = fileRegex.exec(messageText)) !== null) {
    const fileName = match[1];
    // Skip config files and technology names
    if (!['package.json', 'tsconfig.json', 'index.html', 'index.css', 'styles.css'].includes(fileName.toLowerCase())) {
      if (!isTechnologyNameNotFile(fileName)) {
        allMentionedFiles.push(fileName);
      }
    }
  }
  
  const uniqueFiles = [...new Set(allMentionedFiles.map(f => f.toLowerCase()))];
  
  for (const mentionedFile of uniqueFiles) {
    const mentionedBase = mentionedFile.replace(/\.[^/.]+$/, '').toLowerCase();
    if (mentionedBase !== currentFileBase) {
      console.log(`⚠️ [FileCheck] AI mentions "${mentionedFile}" but current file is "${currentFileName}"`);
      return { mentionsDifferentFile: true, mentionedFile };
    }
  }
  
  const differentFileIndicators = ['is not currently open', "isn't currently open", 'not open', "i'll open", 'will open', 'should open', 'need to open', 'please open', 'switch to', 'navigate to'];
  
  for (const indicator of differentFileIndicators) {
    if (messageLower.includes(indicator)) {
      console.log(`⚠️ [FileCheck] AI indicates file needs to be opened: "${indicator}"`);
      for (const file of uniqueFiles) {
        if (file.toLowerCase() !== currentFileName.toLowerCase()) {
          return { mentionsDifferentFile: true, mentionedFile: file };
        }
      }
      return { mentionsDifferentFile: true, mentionedFile: uniqueFiles[0] || null };
    }
  }
  
  return { mentionsDifferentFile: false, mentionedFile: null };
}

function validateFileMatch(block: HTMLElement, code: string): FileValidation {
  const editor = getMonacoEditorForApply();
  if (!editor) return { isValid: false, detectedFileName: null, currentFileName: '', confidence: 'none', reason: 'No editor open' };
  
  const model = editor.getModel();
  if (!model) return { isValid: false, detectedFileName: null, currentFileName: '', confidence: 'none', reason: 'No file open' };
  
  const uri = model.uri?.toString() || '';
  const currentFileName = uri.split('/').pop()?.split('\\').pop() || '';
  const currentFileBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const currentFileExt = currentFileName.split('.').pop()?.toLowerCase() || '';
  
  const detectedFileName = extractTargetFileName(block, code);
  
  if (!detectedFileName) {
    return { isValid: true, detectedFileName: null, currentFileName, confidence: 'low', reason: 'No specific file mentioned - assuming current file' };
  }
  
  const detectedFileBase = detectedFileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const detectedFileExt = detectedFileName.split('.').pop()?.toLowerCase() || '';
  
  if (detectedFileName.toLowerCase() === currentFileName.toLowerCase()) {
    return { isValid: true, detectedFileName, currentFileName, confidence: 'high', reason: 'Exact filename match' };
  }
  
  if (detectedFileBase === currentFileBase) {
    const tsExtensions = ['ts', 'tsx', 'js', 'jsx'];
    if (tsExtensions.includes(detectedFileExt) && tsExtensions.includes(currentFileExt)) {
      return { isValid: true, detectedFileName, currentFileName, confidence: 'medium', reason: `Similar file (${detectedFileName} → ${currentFileName})` };
    }
  }
  
  return { isValid: false, detectedFileName, currentFileName, confidence: 'high', reason: `File mismatch: AI code is for "${detectedFileName}" but "${currentFileName}" is open` };
}

function showFileMismatchWarning(validation: FileValidation, onProceed: () => void, onCancel: () => void): void {
  document.getElementById('aca-file-mismatch-warning')?.remove();
  
  const warning = document.createElement('div');
  warning.id = 'aca-file-mismatch-warning';
  warning.className = 'aca-file-mismatch-warning';
  warning.innerHTML = `
    <div class="aca-warning-icon">⚠️</div>
    <div class="aca-warning-content">
      <div class="aca-warning-title">File Mismatch Detected</div>
      <div class="aca-warning-text">
        AI code is for <strong>${validation.detectedFileName}</strong><br>
        but <strong>${validation.currentFileName}</strong> is currently open
      </div>
    </div>
    <div class="aca-warning-actions">
      <button class="aca-warning-btn proceed">Apply Anyway</button>
      <button class="aca-warning-btn cancel">Cancel</button>
      <button class="aca-warning-btn open-file">Open ${validation.detectedFileName}</button>
    </div>
  `;
  
  warning.querySelector('.proceed')?.addEventListener('click', () => { warning.remove(); onProceed(); });
  warning.querySelector('.cancel')?.addEventListener('click', () => { warning.remove(); onCancel(); });
  warning.querySelector('.open-file')?.addEventListener('click', () => { warning.remove(); tryOpenFile(validation.detectedFileName!); onCancel(); });
  
  document.body.appendChild(warning);
  setTimeout(() => warning.remove(), 10000);
}

function tryOpenFile(fileName: string): void {
  console.log(`📂 [FileValidation] Attempting to open: ${fileName}`);
  
  if (typeof (window as any).openFile === 'function') {
    (window as any).openFile(fileName);
    return;
  }
  
  const fileItems = document.querySelectorAll('[class*="file-item"], [class*="tree-item"], [data-filename]');
  for (const item of fileItems) {
    const itemName = item.getAttribute('data-filename') || item.getAttribute('data-name') || item.textContent?.trim();
    if (itemName?.toLowerCase().includes(fileName.toLowerCase())) {
      (item as HTMLElement).click();
      showAutoApplyToast(`📂 Opening ${fileName}...`, 'success');
      return;
    }
  }
  
  showAutoApplyToast(`⚠️ Could not find ${fileName}`, 'error');
}

// ============================================================================
// AUTO-OPEN FILE AND APPLY FEATURE
// ============================================================================

function isAIProjectSearchEnabled(): boolean {
  try {
    if ((window as any).aiSearchEnabled === true) return true;
    const stored = localStorage.getItem('aiProjectSearchEnabled') || localStorage.getItem('aiFileExplorerEnabled');
    if (stored === 'true') return true;
    if ((window as any).aiFileExplorerEnabled === true) return true;
    return false;
  } catch (e) {
    console.warn('⚠️ [AutoOpen] Error checking AI Search state:', e);
    return false;
  }
}

(window as any).setAIProjectSearchEnabled = (enabled: boolean) => {
  (window as any).aiSearchEnabled = enabled;
  localStorage.setItem('aiProjectSearchEnabled', enabled.toString());
  console.log(`🔍 [AutoOpen] AI Project Search set to: ${enabled ? 'ON' : 'OFF'}`);
};

(window as any).isAIProjectSearchEnabled = isAIProjectSearchEnabled;

function findFileInProject(fileName: string): { element: HTMLElement; path: string; actualFileName: string } | null {
  const fileNameLower = fileName.toLowerCase();
  console.log(`🔍 [FindFile] Looking for: "${fileName}"`);
  
  const elements = document.querySelectorAll('[data-path]');
  console.log(`🔍 [FindFile] Checking ${elements.length} elements with data-path`);
  
  for (const el of elements) {
    const path = el.getAttribute('data-path') || '';
    const pathFileName = path.split(/[/\\]/).pop() || '';
    const pathFileNameLower = pathFileName.toLowerCase();
    
    if (pathFileNameLower === fileNameLower) {
      console.log(`✅ [FindFile] FOUND: ${path} (actual: ${pathFileName})`);
      // Return clickable element but keep the path AND actual filename
      const clickableChild = el.querySelector('.file-name, .file-label, .filename, span[class*="name"]');
      return { 
        element: (clickableChild || el) as HTMLElement, 
        path: path,
        actualFileName: pathFileName  // Return actual case-correct filename
      };
    }
  }
  
  const allFileItems = document.querySelectorAll('.file-item, .file-tree-item, .tree-item, [class*="file"]');
  for (const el of allFileItems) {
    const textContent = el.textContent?.trim().toLowerCase() || '';
    // Only match if the text content IS the filename, or ends with the filename
    // This prevents "Node.js" from matching "tsconfig.node.json"
    const isExactMatch = textContent === fileNameLower;
    const endsWithFileName = textContent.endsWith(fileNameLower) && 
      (textContent.length === fileNameLower.length || textContent[textContent.length - fileNameLower.length - 1] === '/');
    
    if (isExactMatch || endsWithFileName) {
      const pathEl = (el as HTMLElement).closest('[data-path]') || el;
      const path = pathEl.getAttribute('data-path');
      if (path) {
        // Double check the path ends with our filename
        const pathFileName = path.split(/[/\\]/).pop() || '';
        const pathFileNameLower = pathFileName.toLowerCase();
        if (pathFileNameLower === fileNameLower) {
          console.log(`✅ [FindFile] FOUND by text: ${path} (actual: ${pathFileName})`);
          return { element: el as HTMLElement, path: path, actualFileName: pathFileName };
        }
      }
    }
  }
  
  console.log(`❌ [FindFile] NOT FOUND: ${fileName}`);
  return null;
}

// Normalize filename to match actual file in project (case-sensitive match)
function normalizeFileNameCase(fileName: string): string {
  const result = findFileInProject(fileName);
  if (result?.actualFileName) {
    console.log(`🔄 [NormalizeCase] "${fileName}" → "${result.actualFileName}"`);
    return result.actualFileName;
  }
  return fileName; // Return original if not found
}

// ============================================================================
// NEW FILE CREATION - Detect and create new files mentioned by AI
// ============================================================================

interface NewFileInfo {
  fileName: string;
  relativePath: string;  // e.g., "src/Game.tsx"
  fullPath: string;      // Full system path
  isNewFile: boolean;
}

// Detect if AI is asking to create a new file
function detectNewFileIntent(block: HTMLElement): NewFileInfo | null {
  // Find the message container
  const message = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (!message) return null;
  
  const messageText = message.textContent || '';
  
  // Check for creation intent keywords
  const hasCreateIntent = /\b(create|make|add|write|new file|let'?s create|let us create)\b/i.test(messageText);
  if (!hasCreateIntent) return null;
  
  console.log(`🔍 [NewFile] Checking for new file intent in message...`);
  
  // Patterns to extract filename - ordered by specificity
  const fileNamePatterns = [
    // "create a new file called Game.tsx" or "create a file called `Game.tsx`"
    /(?:create|make|add|write)\s+(?:a\s+)?(?:new\s+)?file\s+(?:called|named)\s*[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
    // "let's create Game.tsx" or "create `Game.tsx`"
    /(?:let'?s?\s+)?(?:create|make)\s+[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
    // "new file Game.tsx"
    /new\s+file\s+[`"']?([a-zA-Z0-9_.-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))[`"']?/i,
  ];
  
  // Patterns to extract directory
  const dirPatterns = [
    // "in the src directory" or "in the `src` directory"
    /in\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?\s+(?:directory|folder)/i,
    // "inside src" or "inside the src folder"
    /inside\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?/i,
  ];
  
  // Try to find the file name
  let fileName: string | null = null;
  for (const pattern of fileNamePatterns) {
    const match = messageText.match(pattern);
    if (match) {
      fileName = match[1];
      console.log(`🆕 [NewFile] Found filename: ${fileName}`);
      break;
    }
  }
  
  if (!fileName) {
    console.log(`📂 [NewFile] No filename found in message`);
    return null;
  }
  
  // Check if this file already exists in project
  const existing = findFileInProject(fileName);
  if (existing) {
    console.log(`📂 [NewFile] File "${fileName}" already exists in project`);
    return null;
  }
  
  // Try to find the directory
  let targetDir = '';
  for (const pattern of dirPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      targetDir = match[1].replace(/[`"']/g, '');
      console.log(`🆕 [NewFile] Found directory: ${targetDir}`);
      break;
    }
  }
  
  // Default to src if mentioned but not captured
  if (!targetDir && messageText.toLowerCase().includes('src')) {
    targetDir = 'src';
    console.log(`🆕 [NewFile] Defaulting to src directory`);
  }
  
  // Construct relative path
  let relativePath = targetDir ? `${targetDir}/${fileName}` : fileName;
  relativePath = relativePath.replace(/\\/g, '/').replace(/\/+/g, '/');
  
  // Get project path
  const projectPath = (window as any).currentProjectPath || 
                     (window as any).currentFolderPath || '';
  
  const fullPath = projectPath ? 
    `${projectPath}/${relativePath}`.replace(/\\/g, '/').replace(/\/+/g, '/') : 
    relativePath;
  
  console.log(`🆕 [NewFile] Detected new file: ${fileName} at ${fullPath}`);
  
  return {
    fileName,
    relativePath,
    fullPath,
    isNewFile: true
  };
}

// Create a new file in the file system
async function createNewFile(fullPath: string, content: string): Promise<boolean> {
  console.log(`🆕 [CreateFile] Creating: ${fullPath}`);
  
  try {
    const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
    
    if (invoke) {
      // First try to create parent directories if needed
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      try {
        await invoke('create_dir_all', { path: dirPath });
      } catch (e) {
        // Directory might already exist, continue
      }
      
      // Write the file
      await invoke('write_file', { path: fullPath, content: content });
      console.log(`✅ [CreateFile] File created successfully: ${fullPath}`);
      
      // Trigger file tree refresh
      document.dispatchEvent(new CustomEvent('refresh-file-tree'));
      document.dispatchEvent(new CustomEvent('file-created', { detail: { path: fullPath } }));
      
      // Try to refresh the file explorer
      const refreshBtn = document.querySelector('.refresh-btn, [title*="Refresh"], [data-action="refresh"]');
      if (refreshBtn) {
        (refreshBtn as HTMLElement).click();
      }
      
      return true;
    }
    
    // Fallback: try window.createFile if available
    const createFile = (window as any).createFile;
    if (createFile) {
      await createFile(fullPath, content);
      console.log(`✅ [CreateFile] File created via window.createFile`);
      return true;
    }
    
    // Fallback: try fs plugin
    const fs = (window as any).__TAURI__?.fs;
    if (fs?.writeTextFile) {
      await fs.writeTextFile(fullPath, content);
      console.log(`✅ [CreateFile] File created via fs plugin`);
      return true;
    }
    
    console.error('❌ [CreateFile] No file creation method available');
    return false;
  } catch (e: any) {
    console.error(`❌ [CreateFile] Failed to create file:`, e?.message || e);
    return false;
  }
}

// Extract target path from code block context (checks for // src/filename.tsx comments)
function extractTargetPath(block: HTMLElement, code: string): string | null {
  // Check first few lines for path comments like "// src/Game.tsx" or "// src/components/Button.tsx"
  const lines = code.split('\n').slice(0, 5);
  for (const line of lines) {
    const pathMatch = line.match(/^\/\/\s*([a-zA-Z0-9_./\\-]+\.(tsx?|jsx?|py|rs|css|scss|html|json|vue|svelte))\s*$/);
    if (pathMatch) {
      console.log(`📂 [TargetPath] Found path comment: ${pathMatch[1]}`);
      return pathMatch[1];
    }
  }
  
  // Also check for path in message context
  const message = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (message) {
    const messageText = message.textContent || '';
    // Look for "in the src directory" or similar
    const dirMatch = messageText.match(/in\s+(?:the\s+)?[`"']?([a-zA-Z0-9_./\\-]+)[`"']?\s+(?:directory|folder)/i);
    if (dirMatch) {
      const fileName = extractTargetFileName(block, code);
      if (fileName) {
        return `${dirMatch[1]}/${fileName}`;
      }
    }
  }
  
  return null;
}

/**
 * Opens a file in the editor and waits for it to be ready
 * FIXED v1.1: Uses window.openFileInTab to ensure tab is created
 */
async function openFileAndWait(fileName: string, maxWaitMs: number = 5000): Promise<boolean> {
  // Normalize filename case to match actual file in project
  const normalizedName = normalizeFileNameCase(fileName);
  if (normalizedName !== fileName) {
    console.log(`📂 [OpenFile] Case normalized: "${fileName}" → "${normalizedName}"`);
    fileName = normalizedName;
  }
  
  console.log(`📂 [OpenFile] Opening: ${fileName}`);
  
  // Check if file is already open
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    const currentFile = model?.uri?.path?.split('/').pop()?.toLowerCase() || '';
    if (currentFile === fileName.toLowerCase()) {
      console.log(`✅ [OpenFile] File already open: ${fileName}`);
      return true;
    }
  }
  
  // Find full path first (needed for openFileInTab)
  const fileResult = findFileInProject(fileName);
  const fullPath = fileResult?.path || '';
  
  // ==========================================================================
  // Method 0: Use window.openFileInTab (BEST - creates tab AND opens file)
  // This is the PRIMARY fix! Must be tried FIRST.
  // ==========================================================================
  if (fullPath && typeof (window as any).openFileInTab === 'function') {
    console.log(`📂 [OpenFile] Using window.openFileInTab (creates tab): ${fullPath}`);
    try {
      await (window as any).openFileInTab(fullPath, 1);
      await new Promise(r => setTimeout(r, 300));
      
      const opened = await waitForFileInEditor(fileName, 3000);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via openFileInTab (with tab!)`);
        return true;
      }
    } catch (e) {
      console.warn(`⚠️ [OpenFile] openFileInTab failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 1: Use tabManager.openFile or openFileByName
  // ==========================================================================
  const tabManager = (window as any).tabManager;
  
  // Try tabManager.openFile with full path (preferred)
  if (fullPath && tabManager?.openFile) {
    try {
      console.log(`📂 [OpenFile] Using tabManager.openFile: ${fullPath}`);
      await tabManager.openFile(fullPath);
      await new Promise(r => setTimeout(r, 300));
      
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via tabManager.openFile`);
        return true;
      }
    } catch (e) {
      console.log(`⚠️ [OpenFile] tabManager.openFile failed:`, e);
    }
  }
  
  // Try tabManager.openFileByName
  if (tabManager?.openFileByName) {
    try {
      console.log(`📂 [OpenFile] Using tabManager.openFileByName: ${fileName}`);
      await tabManager.openFileByName(fileName);
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`✅ [OpenFile] Opened via tabManager.openFileByName`);
        return true;
      }
    } catch (e) {
      console.log(`⚠️ [OpenFile] tabManager.openFileByName failed:`, e);
    }
  }
  
  // ==========================================================================
  // Method 2: Find file in project tree and double-click
  // ==========================================================================
  if (fileResult) {
    const { element: fileElement, path: foundPath } = fileResult;
    console.log(`📂 [OpenFile] Found in tree: ${foundPath}`);
    
    try {
      fileElement.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      await new Promise(r => setTimeout(r, 50));
      
      // Dispatch double-click
      fileElement.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true, cancelable: true, view: window,
        clientX: fileElement.getBoundingClientRect().left + 10,
        clientY: fileElement.getBoundingClientRect().top + 10
      }));
      
      console.log(`📂 [OpenFile] Double-click dispatched`);
      
      const opened = await waitForFileInEditor(fileName, maxWaitMs);
      if (opened) {
        console.log(`✅ [OpenFile] File opened via double-click`);
        return true;
      }
    } catch (err) {
      console.error(`⚠️ [OpenFile] Double-click method failed:`, err);
    }
    
    // ==========================================================================
    // Method 3: Fallback - window.openFile (NO TAB - last resort only!)
    // ==========================================================================
    if (foundPath && typeof (window as any).openFile === 'function') {
      try {
        console.log(`📂 [OpenFile] Fallback: window.openFile (no tab): ${foundPath}`);
        await (window as any).openFile(foundPath);
        
        // Try to create a tab manually after opening
        document.dispatchEvent(new CustomEvent('file-opened-programmatically', { 
          detail: { path: foundPath, fileName, createTab: true } 
        }));
        
        await new Promise(r => setTimeout(r, 200));
        const opened = await waitForFileInEditor(fileName, maxWaitMs);
        if (opened) {
          console.log(`✅ [OpenFile] Opened via window.openFile`);
          return true;
        }
      } catch (err) {
        console.error(`❌ [OpenFile] window.openFile error:`, err);
      }
    }
    
    // Try single click as fallback
    fileElement.click();
    await new Promise(r => setTimeout(r, 500));
    const openedAfterClick = await waitForFileInEditor(fileName, 2000);
    if (openedAfterClick) {
      console.log(`✅ [OpenFile] Opened via single click`);
      return true;
    }
  }
  
  // ==========================================================================
  // Method 4: Dispatch custom event for file system to handle
  // ==========================================================================
  document.dispatchEvent(new CustomEvent('request-open-file', { 
    detail: { fileName, name: fileName }
  }));
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Final verification
  const finalCheck = await waitForFileInEditor(fileName, 2000);
  if (finalCheck) {
    console.log(`✅ [OpenFile] File opened after custom event`);
    return true;
  }
  
  console.log(`❌ [OpenFile] All methods failed for: ${fileName}`);
  return false;
}

async function waitForFileInEditor(fileName: string, maxWaitMs: number): Promise<boolean> {
  const fileNameLower = fileName.toLowerCase();
  const fileBase = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
  const startTime = Date.now();
  
  console.log(`⏳ [WaitFile] Waiting for "${fileName}" to open in editor...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, 100));
    
    // Try multiple ways to get the current file
    let currentFile = '';
    let currentPath = '';
    
    // Method 1: Monaco editor model
    const editor = getMonacoEditorForApply();
    if (editor) {
      const model = editor.getModel();
      if (model?.uri?.path) {
        currentPath = model.uri.path;
        currentFile = currentPath.split('/').pop()?.toLowerCase() || '';
      }
    }
    
    // Method 2: Check active tab
    if (!currentFile) {
      const tabManager = (window as any).tabManager;
      if (tabManager?.getActiveTab) {
        const activeTab = tabManager.getActiveTab();
        if (activeTab?.path || activeTab?.fileName) {
          const tabPath = activeTab.path || activeTab.fileName;
          currentPath = tabPath;
          currentFile = tabPath.split(/[/\\]/).pop()?.toLowerCase() || '';
        }
      }
    }
    
    // Method 3: Check breadcrumb path attribute or text
    if (!currentFile) {
      const breadcrumb = document.querySelector('.breadcrumb-container, .breadcrumb, [class*="breadcrumb"]');
      if (breadcrumb) {
        // Try data attribute first
        const pathAttr = breadcrumb.getAttribute('data-path') || breadcrumb.getAttribute('data-file-path');
        if (pathAttr) {
          currentPath = pathAttr;
          currentFile = pathAttr.split(/[/\\]/).pop()?.toLowerCase() || '';
        } else {
          // Try text content
          const lastPart = breadcrumb.querySelector('.breadcrumb-filename, span:last-child, .filename');
          if (lastPart) {
            currentFile = lastPart.textContent?.trim().toLowerCase() || '';
          }
        }
      }
    }
    
    // Method 4: Check tab bar active tab
    if (!currentFile) {
      const activeTab = document.querySelector('.tab.active, .editor-tab.active, [class*="tab"][class*="active"]');
      if (activeTab) {
        const tabName = activeTab.querySelector('.tab-name, .tab-title, span')?.textContent?.trim() || 
                        activeTab.getAttribute('data-filename') ||
                        activeTab.getAttribute('title');
        if (tabName) {
          currentFile = tabName.toLowerCase().replace(/[•*]/g, '').trim();
        }
      }
    }
    
    // Method 5: Check window title
    if (!currentFile && document.title) {
      const titleMatch = document.title.match(/([^/\\]+\.\w+)/);
      if (titleMatch) {
        currentFile = titleMatch[1].toLowerCase();
      }
    }
    
    // Check if we found the file
    if (currentFile) {
      const currentBase = currentFile.replace(/\.[^/.]+$/, '').toLowerCase();
      
      // Various matching strategies
      const isMatch = 
        currentFile === fileNameLower ||
        currentBase === fileBase ||
        currentFile.endsWith(fileNameLower) ||
        currentPath.toLowerCase().endsWith(fileNameLower) ||
        currentPath.toLowerCase().includes(fileName.toLowerCase());
      
      if (isMatch) {
        console.log(`✅ [WaitFile] File detected: "${currentFile}" (path: ${currentPath || 'n/a'})`);
        await new Promise(r => setTimeout(r, 150)); // Brief stabilization delay
        return true;
      }
    }
  }
  
  // Final check - just verify we have an editor with content
  const editor = getMonacoEditorForApply();
  if (editor) {
    const model = editor.getModel();
    if (model) {
      const finalPath = model.uri?.path || '';
      const finalFile = finalPath.split('/').pop()?.toLowerCase() || '';
      console.log(`⏳ [WaitFile] Final check - editor has: "${finalFile}"`);
      
      // If the file matches OR if we just have some editor open, consider it success
      // (the file detection might have race conditions)
      if (finalFile === fileNameLower || finalFile.replace(/\.[^/.]+$/, '') === fileBase) {
        console.log(`✅ [WaitFile] File found on final check`);
        return true;
      }
    }
  }
  
  console.log(`⚠️ [WaitFile] Timeout - "${fileName}" not detected after ${maxWaitMs}ms`);
  return false;
}

interface PendingAutoApply {
  fileName: string;
  code: string;
  blockId: string;
  block: HTMLElement;
}
let pendingAutoApply: PendingAutoApply | null = null;

interface MultiFileApplyItem {
  fileName: string;
  code: string;
  blockId: string;
  block: HTMLElement;
  language: string;
}
let multiFileQueue: MultiFileApplyItem[] = [];
let isProcessingMultiFile = false;

// ============================================================================
// 🆕 MULTI-FILE CHECK FUNCTION FOR INTEGRATION
// ============================================================================

/**
 * Check if this is a multi-file update that should be handled by multiFileAutonomous
 * Returns true if multi-file system will handle it, false for single-file processing
 */
function shouldUseMultiFileSystem(block: HTMLElement | null): boolean {
  if (!block) return false;
  
  // Find the AI message containing this block
  const aiMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]') as HTMLElement;
  if (!aiMessage) return false;
  
  // Check if multi-file system is already handling a session
  const currentSession = getCurrentMultiFileSession?.();
  if (currentSession) {
    const status = currentSession.status;
    if (status === 'processing' || status === 'awaiting-confirmation') {
      console.log('📚 [AutoApply] Multi-file session active, deferring to multi-file system');
      return true;
    }
  }
  
  // Scan for multiple file mentions in the AI message
  const mentionedFiles = scanAIMessageForFiles?.(aiMessage) || [];
  
  if (mentionedFiles.length >= 2) {
    console.log(`📚 [AutoApply] Multi-file update detected (${mentionedFiles.length} files): ${mentionedFiles.join(', ')}`);
    console.log('📚 [AutoApply] Deferring to multi-file autonomous system');
    return true;
  }
  
  return false;
}

async function processMultiFileApply(): Promise<void> {
  // ========== GUARDS ==========
  if (!autoApplyEnabled) {
    console.log('⏸️ [MultiFile] Auto-apply is disabled');
    return;
  }
  
  if (isProcessingMultiFile) {
    return; // Silent skip - already processing
  }
  
  if (isTypingInProgress) {
    return; // Skip if typing in progress
  }
  
  isProcessingMultiFile = true;
  console.log(`\n📚 [MultiFile] ========== STARTING MULTI-FILE APPLY ==========`);
  
  // Show the status dialog immediately
  showStatusDialog();
  updateStatusText('Scanning code blocks...');
  updateProgress(5);
  
  // Remove any existing confirmation bar
  const existingBar = document.querySelector('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar');
  if (existingBar) {
    existingBar.remove();
    hasUnapprovedChanges = false;
  }
  
  // Track changes for final confirmation
  interface FileChange {
    fileName: string;
    fullPath: string;
    originalContent: string;
    newContent: string;
    changesSummary: string;
    block: HTMLElement;
    blockId: string;
  }
  const appliedChanges: FileChange[] = [];
  
  try {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length === 0) {
      console.log('⏭️ [MultiFile] No unprocessed blocks');
      addStatusLog('No code blocks to process', 'warning');
      updateStatusText('No code blocks found');
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false;
      return;
    }
    
    console.log(`📦 [MultiFile] Found ${unprocessedBlocks.length} unprocessed block(s)`);
    addStatusLog(`Found ${unprocessedBlocks.length} code block(s)`, 'info');
    updateProgress(10);
    
    // Group blocks by target file
    const fileBlocks: Map<string, MultiFileApplyItem[]> = new Map();
    
    let blockNum = 0;
    for (const block of unprocessedBlocks) {
      blockNum++;
      console.log(`\n📦 [MultiFile] Analyzing block ${blockNum}/${unprocessedBlocks.length}...`);
      
      const codeInfo = extractCodeFromBlockForApply(block);
      if (!codeInfo || !codeInfo.code.trim()) {
        console.log(`  ⏭️ Skipping: No code content found`);
        continue;
      }
      
      console.log(`  📝 Code: ${codeInfo.code.substring(0, 80).replace(/\n/g, '↵')}...`);
      console.log(`  🔤 Language: ${codeInfo.language}`);
      console.log(`  📏 Lines: ${codeInfo.code.split('\n').length}`);
      
      // ⭐ NEW: Skip terminal commands (npm, yarn, etc.)
      if (isTerminalCommand(codeInfo.code)) {
        console.log(`  ⏭️ Skipping: Terminal command detected`);
        const cmdId = generateBlockId(block);
        processedBlockIds.add(cmdId);
        markBlockAsChecked(block, cmdId);
        continue;
      }
      
      let detectedFileName = extractTargetFileName(block, codeInfo.code);
      console.log(`  📄 Detected filename: ${detectedFileName || '(none)'}`);
      
      if (!detectedFileName) {
        console.log(`  ⏭️ Skipping: Could not detect target file`);
        continue;
      }
      
      if (isTechnologyNameNotFile(detectedFileName)) {
        console.log(`  ⏭️ Skipping: "${detectedFileName}" is a technology name, not a file`);
        continue;
      }
      
      // ===== NORMALIZE FILENAME CASE =====
      // AI might say "app.css" but actual file is "App.css"
      const normalizedFileName = normalizeFileNameCase(detectedFileName);
      if (normalizedFileName !== detectedFileName) {
        console.log(`🔄 [MultiFile] Case normalized: "${detectedFileName}" → "${normalizedFileName}"`);
        detectedFileName = normalizedFileName;
      }
      
      // ===== SNIPPET FILTER: Skip tiny code blocks that are just examples =====
      const codeLines = codeInfo.code.trim().split('\n').filter(line => line.trim());
      const minLines = 5; // Minimum lines to be considered a real file update (increased from 3)
      
      if (codeLines.length < minLines) {
        console.log(`⏭️ [Apply] Skipping snippet (${codeLines.length} lines < ${minLines} min): ${detectedFileName}`);
        // Mark as processed so it doesn't keep trying
        const snippetId = generateBlockId(block);
        processedBlockIds.add(snippetId);
        markBlockAsChecked(block, snippetId);
        continue;
      }
      
      // Skip PLAINTEXT blocks ONLY if they have very few lines and filename doesn't have a code extension
      // This prevents skipping valid code that just wasn't detected properly
      if (codeInfo.language?.toLowerCase() === 'plaintext') {
        const hasCodeExtension = /\.(tsx?|jsx?|py|rs|css|scss|html|json|xml|vue|svelte|go|rb|php|cs|java)$/i.test(detectedFileName);
        if (!hasCodeExtension || codeLines.length < 5) {
          console.log(`⏭️ [Apply] Skipping PLAINTEXT block (no code extension or < 5 lines): ${detectedFileName}`);
          const plaintextId = generateBlockId(block);
          processedBlockIds.add(plaintextId);
          markBlockAsChecked(block, plaintextId);
          continue;
        }
        // If it has a code extension and enough lines, try to infer language from extension
        const ext = detectedFileName.split('.').pop()?.toLowerCase();
        if (ext) {
          const extLangMap: Record<string, string> = {
            'tsx': 'typescript', 'ts': 'typescript',
            'jsx': 'javascript', 'js': 'javascript',
            'css': 'css', 'scss': 'scss',
            'html': 'html', 'json': 'json',
            'py': 'python', 'rs': 'rust',
            'vue': 'vue', 'svelte': 'svelte'
          };
          if (extLangMap[ext]) {
            codeInfo.language = extLangMap[ext];
            console.log(`🔤 [Apply] Inferred language from extension: ${codeInfo.language}`);
          }
        }
      }
      
      // Skip if the code is just an import statement (common in AI explanations)
      const trimmedCode = codeInfo.code.trim();
      if (trimmedCode.startsWith('import ') && codeLines.length <= 3) {
        console.log(`⏭️ [Apply] Skipping import-only snippet: ${detectedFileName}`);
        const importId = generateBlockId(block);
        processedBlockIds.add(importId);
        markBlockAsChecked(block, importId);
        continue;
      }
      
      // ===== NEW: Skip "explanation" snippets =====
      // Detect when AI is just showing existing code, not providing new code
      const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
      if (parentMessage) {
        const messageText = parentMessage.textContent?.toLowerCase() || '';
        
        // Patterns that indicate AI is explaining/showing code, not replacing
        const explanationPatterns = [
          /line\s*\d+\s*(is|shows?|contains?|has)/i,
          /this\s+line\s+(is|imports?|exports?|defines?)/i,
          /here('s| is)\s+(the\s+)?(line|code)/i,
          /the\s+code\s+(at|on|in)\s+line/i,
          /currently\s+(shows?|has|contains?)/i,
          /this\s+(imports?|exports?|defines?)/i,
        ];
        
        const isExplanation = explanationPatterns.some(p => p.test(messageText));
        
        if (isExplanation && codeLines.length <= 5) {
          console.log(`⏭️ [Apply] Skipping explanation snippet: ${detectedFileName} (AI is explaining, not replacing)`);
          const explainId = generateBlockId(block);
          processedBlockIds.add(explainId);
          markBlockAsChecked(block, explainId);
          continue;
        }
      }
      
      // ===== NEW: Skip if code already exists in target file =====
      // This prevents AI "quoting" existing code from being applied as replacement
      const existingFile = findFileInProject(detectedFileName);
      if (existingFile) {
        try {
          // Try to check if this exact code already exists in the file
          const editor = getMonacoEditorForApply();
          if (editor) {
            const model = editor.getModel();
            const currentFile = model?.uri?.path?.split('/').pop()?.toLowerCase() || '';
            
            // If we can check the current open file
            if (currentFile === detectedFileName.toLowerCase()) {
              const existingContent = model?.getValue() || '';
              const newCodeNormalized = trimmedCode.replace(/\s+/g, ' ').trim();
              const existingNormalized = existingContent.replace(/\s+/g, ' ').trim();
              
              // If the new code is a subset of existing code (AI is quoting)
              if (existingNormalized.includes(newCodeNormalized) && codeLines.length < 10) {
                console.log(`⏭️ [Apply] Skipping quoted code - already exists in file: ${detectedFileName}`);
                const quoteId = generateBlockId(block);
                processedBlockIds.add(quoteId);
                markBlockAsChecked(block, quoteId);
                continue;
              }
            }
          }
        } catch (e) {
          // Ignore errors, continue with normal processing
        }
      }
      // ===== END SNIPPET FILTER =====
      
      const blockId = generateBlockId(block);
      if (processedBlockIds.has(blockId)) {
        console.log(`  ⏭️ Block already processed (${blockId})`);
        continue;
      }
      
      console.log(`  ✅ Adding to file: ${detectedFileName}`);
      
      const key = detectedFileName.toLowerCase();
      if (!fileBlocks.has(key)) fileBlocks.set(key, []);
      fileBlocks.get(key)!.push({
        fileName: detectedFileName,
        code: codeInfo.code,
        blockId,
        block,
        language: codeInfo.language
      });
    }
    
    // ⭐ Summary of detected files
    console.log(`\n📊 [MultiFile] === FILE DETECTION SUMMARY ===`);
    console.log(`📊 Total blocks found: ${unprocessedBlocks.length}`);
    console.log(`📊 Files detected: ${fileBlocks.size}`);
    if (fileBlocks.size > 0) {
      const fileList = Array.from(fileBlocks.keys()).map(k => {
        const blocks = fileBlocks.get(k)!;
        return `${blocks[0].fileName} (${blocks.length} block(s), ${blocks[0].code.split('\n').length} lines)`;
      });
      fileList.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    console.log(`📊 ==============================\n`);
    
    if (fileBlocks.size === 0) {
      console.log('⏭️ [MultiFile] No valid file targets');
      addStatusLog('No valid files to process', 'warning');
      updateStatusText('No valid files found');
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false;
      return;
    }
    
    console.log(`📚 [MultiFile] Processing ${fileBlocks.size} file(s)`);
    addStatusLog(`Processing ${fileBlocks.size} file(s)`, 'info');
    updateStatusText(`Applying changes to ${fileBlocks.size} file(s)...`);
    updateProgress(20);
    
    // Initialize file list display - use actual filename from first block (not the lowercase key)
    const fileKeys = Array.from(fileBlocks.keys());
    const fileStatusList = fileKeys.map(key => {
      const blocks = fileBlocks.get(key)!;
      return { fileName: blocks[0].fileName, status: 'pending' as const };  // Use actual case-correct filename
    });
    updateFileList(fileStatusList);
    
    let errorCount = 0;
    
    // PHASE 1: Apply all changes (no saving yet)
    for (let i = 0; i < fileKeys.length; i++) {
      const blocks = fileBlocks.get(fileKeys[i])!;
      blocks.sort((a, b) => b.code.length - a.code.length);
      const item = blocks[0];
      
      // Update progress
      const progressPercent = 20 + ((i / fileKeys.length) * 60);
      updateProgress(progressPercent);
      
      // Update file status to processing
      fileStatusList[i].status = 'processing';
      updateFileList(fileStatusList);
      
      console.log(`\n📂 [MultiFile] File ${i + 1}/${fileKeys.length}: ${item.fileName}`);
      addStatusLog(`[${i + 1}/${fileKeys.length}] Processing ${item.fileName}`, 'info');
      updateStatusText(`Processing ${item.fileName}...`);
      
      try {
        // Check if file is already open
        const editor = getMonacoEditorForApply();
        const currentFile = editor?.getModel()?.uri?.path?.split('/').pop()?.toLowerCase() || '';
        
        // Open file if needed
        let fileOpened = currentFile === item.fileName.toLowerCase();
        
        if (!fileOpened) {
          console.log(`📂 [MultiFile] Opening: ${item.fileName}`);
          addStatusLog(`Opening ${item.fileName}...`, 'info');
          
          // Try opening with longer timeout
          fileOpened = await openFileAndWait(item.fileName, 6000);
          
          if (!fileOpened) {
            // ===== NEW FILE CREATION =====
            // Check if AI wants to create a new file
            const newFileInfo = detectNewFileIntent(item.block);
            const targetPath = extractTargetPath(item.block, item.code);
            
            if (newFileInfo || targetPath) {
              console.log(`🆕 [MultiFile] File doesn't exist - attempting to create new file`);
              addStatusLog(`Creating new file: ${item.fileName}`, 'info');
              
              // Determine full path for new file
              const projectPath = (window as any).currentProjectPath || 
                                 (window as any).currentFolderPath || '';
              
              let fullNewPath = '';
              if (newFileInfo?.fullPath) {
                fullNewPath = newFileInfo.fullPath;
              } else if (targetPath) {
                fullNewPath = projectPath ? `${projectPath}/${targetPath}` : targetPath;
              } else {
                // Default to src folder
                fullNewPath = projectPath ? `${projectPath}/src/${item.fileName}` : `src/${item.fileName}`;
              }
              
              // Normalize path
              fullNewPath = fullNewPath.replace(/\\/g, '/').replace(/\/+/g, '/');
              
              console.log(`🆕 [MultiFile] Creating file at: ${fullNewPath}`);
              
              // Show toast notification
              showAutoApplyToast(`🆕 Creating new file: ${item.fileName}`, 'info');
              
              // Create the new file with the code content
              const created = await createNewFile(fullNewPath, item.code);
              
              if (created) {
                addStatusLog(`✅ Created: ${item.fileName}`, 'success');
                
                // Wait for file tree to refresh
                await new Promise(r => setTimeout(r, 500));
                
                // Try to open the newly created file
                fileOpened = await openFileAndWait(item.fileName, 5000);
                
                if (fileOpened) {
                  console.log(`✅ [MultiFile] New file created and opened: ${item.fileName}`);
                  
                  // Mark as success - file is already created with content
                  fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: `+${item.code.split('\n').length} lines (new file)` };
                  updateFileList(fileStatusList);
                  
                  // Track this change
                  appliedChanges.push({
                    fileName: item.fileName,
                    fullPath: fullNewPath,
                    originalContent: '',
                    newContent: item.code,
                    changesSummary: `+${item.code.split('\n').length} -0 ~0`,
                    block: item.block,
                    blockId: item.blockId
                  });
                  
                  // Mark block as processed
                  processedBlockIds.add(item.blockId);
                  markBlockAsApplied(item.block);
                  
                  continue; // Skip to next file
                }
              } else {
                addStatusLog(`❌ Failed to create ${item.fileName}`, 'error');
              }
            }
            // ===== END NEW FILE CREATION =====
            
            // Wait a bit more and check again - file might be loading
            console.log(`⏳ [MultiFile] First attempt failed, waiting additional 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            
            // Re-check if file is now in editor
            const editorCheck = getMonacoEditorForApply();
            const modelCheck = editorCheck?.getModel();
            const checkFile = modelCheck?.uri?.path?.split('/').pop()?.toLowerCase() || '';
            
            if (checkFile === item.fileName.toLowerCase()) {
              console.log(`✅ [MultiFile] File appeared after extra wait`);
              fileOpened = true;
            } else if (modelCheck && modelCheck.getValue().length > 0) {
              // Editor has content - might be the right file with different detection
              console.log(`⚠️ [MultiFile] Editor has content (${modelCheck.getValue().length} chars), proceeding...`);
              addStatusLog(`Proceeding with current editor content...`, 'warning');
              fileOpened = true;
            } else {
              console.log(`❌ [MultiFile] Could not open: ${item.fileName}`);
              addStatusLog(`Failed to open ${item.fileName}`, 'error');
              fileStatusList[i].status = 'error';
              updateFileList(fileStatusList);
              errorCount++;
              continue;
            }
          }
          
          // Extra stabilization delay after opening
          await new Promise(r => setTimeout(r, 300));
        }
        
        // Store original content BEFORE applying
        const editorNow = getMonacoEditorForApply();
        const modelNow = editorNow?.getModel();
        const originalContent = modelNow?.getValue() || '';
        
        // Get full path
        let fullPath = modelNow?.uri?.path || '';
        if (fullPath.startsWith('/') && fullPath.charAt(2) === ':') {
          fullPath = fullPath.substring(1);
        }
        
        addStatusLog(`Analyzing changes...`, 'info');
        
        // Apply code (but don't save yet)
        const result = await applySmartUpdate(item.code);
        
        if (result.success && result.message !== 'No changes needed') {
          console.log(`✅ [Apply] Applied to ${item.fileName}: ${result.message}`);
          addStatusLog(`Applied: ${result.message}`, 'success');
          
          // Update file status
          fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: result.message };
          updateFileList(fileStatusList);
          
          // Remove any existing confirmation bar (we'll show unified bar at the end)
          document.querySelectorAll('.aca-confirm-bar, #aca-confirm-bar, .multi-file-confirm-bar').forEach(b => b.remove());
          
          // Store this change for later
          appliedChanges.push({
            fileName: item.fileName,
            fullPath,
            originalContent,
            newContent: editorNow?.getModel()?.getValue() || '',
            changesSummary: result.message,
            block: item.block,
            blockId: item.blockId
          });
          
          for (const b of blocks) processedBlockIds.add(b.blockId);
          
        } else if (result.message === 'No changes needed') {
          console.log(`⏭️ [Apply] ${item.fileName}: No changes needed`);
          addStatusLog(`No changes needed`, 'info');
          fileStatusList[i] = { fileName: item.fileName, status: 'done', summary: 'No changes' };
          updateFileList(fileStatusList);
          markBlockAsChecked(item.block, item.blockId);
          processedBlockIds.add(item.blockId);
          for (const b of blocks) processedBlockIds.add(b.blockId);
        } else {
          console.log(`⚠️ [MultiFile] ${item.fileName}: ${result.message}`);
          addStatusLog(`${result.message}`, 'warning');
          fileStatusList[i].status = 'error';
          updateFileList(fileStatusList);
          errorCount++;
        }
        
        // Brief delay between files
        if (i < fileKeys.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
        
      } catch (error) {
        console.error(`❌ [MultiFile] Error with ${item.fileName}:`, error);
        fileStatusList[i].status = 'error';
        updateFileList(fileStatusList);
        errorCount++;
      }
    }
    
    // Mark message as processed
    markMessageProcessed();
    
    // Update progress to 90%
    updateProgress(90);
    
    // PHASE 2: Show confirmation dialog for all changes (unified UI)
    if (appliedChanges.length > 0) {
      console.log(`\n📋 [Confirm] Showing confirmation for ${appliedChanges.length} file(s)`);
      addStatusLog(`Ready: ${appliedChanges.length} file(s) modified`, 'success');
      updateStatusText('Changes applied - awaiting confirmation');
      updateProgress(100);
      
      // Extend dialog to show Accept/Reject buttons
      showMultiFileConfirmationBar(appliedChanges, errorCount);
    } else if (errorCount === 0) {
      addStatusLog('No changes needed', 'info');
      updateStatusText('No changes needed');
      updateProgress(100);
      setTimeout(() => closeStatusDialog(), 1500);
      isProcessingMultiFile = false;
    } else {
      addStatusLog(`Completed with ${errorCount} error(s)`, 'error');
      updateStatusText(`Errors: ${errorCount}`);
      updateProgress(100);
      setTimeout(() => closeStatusDialog(), 2000);
      isProcessingMultiFile = false;
    }
    
  } catch (error) {
    console.error('❌ [MultiFile] Fatal error:', error);
    addStatusLog(`Fatal error: ${error}`, 'error');
    updateStatusText('Error occurred');
    setTimeout(() => closeStatusDialog(), 2000);
    isProcessingMultiFile = false;
  }
  // Note: isProcessingMultiFile is reset in the confirmation handlers
}

// ============================================================================
// PROFESSIONAL DRAGGABLE STATUS DIALOG
// ============================================================================

// Status log entries
let statusLogEntries: string[] = [];
let statusDialog: HTMLElement | null = null;
let pendingChanges: Array<{
  fileName: string;
  fullPath: string;
  originalContent: string;
  newContent: string;
  changesSummary: string;
  block: HTMLElement;
  blockId: string;
}> = [];

// Show the status dialog (called at start of processing)
function showStatusDialog(): void {
  // Remove existing dialog
  if (statusDialog) {
    statusDialog.remove();
  }
  
  // Clear previous logs
  statusLogEntries = [];
  
  // Inject styles
  injectStatusDialogStyles();
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'ai-status-dialog';
  dialog.id = 'ai-status-dialog';
  dialog.innerHTML = `
    <div class="asd-header" id="asd-drag-handle">
      <div class="asd-title">
        <span class="asd-spinner"></span>
        <span class="asd-title-text">AI Code Assistant</span>
      </div>
      <div class="asd-controls">
        <button class="asd-minimize" title="Minimize">─</button>
      </div>
    </div>
    <div class="asd-body">
      <div class="asd-status-text">Initializing...</div>
      <div class="asd-progress">
        <div class="asd-progress-bar"></div>
      </div>
      <div class="asd-log"></div>
      <div class="asd-files"></div>
      <div class="asd-summary" style="display:none;"></div>
    </div>
    <div class="asd-footer" style="display:none;">
      <div class="asd-hint">
        <kbd>Enter</kbd> Accept · <kbd>Esc</kbd> Reject
      </div>
      <div class="asd-actions">
        <button class="asd-btn asd-btn-reject">
          <span>✕</span> Reject
        </button>
        <button class="asd-btn asd-btn-accept">
          <span>✓</span> Accept & Save
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  statusDialog = dialog;
  
  // Make draggable
  makeDraggable(dialog, dialog.querySelector('#asd-drag-handle') as HTMLElement);
  
  // Minimize button
  dialog.querySelector('.asd-minimize')?.addEventListener('click', () => {
    dialog.classList.toggle('minimized');
  });
  
  // Initial log
  addStatusLog('AI Code Assistant started', 'info');
}

// Update status text
function updateStatusText(text: string): void {
  const el = statusDialog?.querySelector('.asd-status-text');
  if (el) el.textContent = text;
}

// Update progress bar (0-100)
function updateProgress(percent: number): void {
  const bar = statusDialog?.querySelector('.asd-progress-bar') as HTMLElement;
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
}

// Add status message to the log
function addStatusLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const icons: Record<string, string> = {
    info: '●',
    success: '✓',
    warning: '⚠',
    error: '✗'
  };
  const entry = `<div class="log-entry ${type}"><span class="log-time">${timestamp}</span><span class="log-icon">${icons[type]}</span><span class="log-msg">${message}</span></div>`;
  statusLogEntries.push(entry);
  
  // Update the log display
  const logContainer = statusDialog?.querySelector('.asd-log');
  if (logContainer) {
    logContainer.innerHTML = statusLogEntries.slice(-10).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

// Clear status log
function clearStatusLog(): void {
  statusLogEntries = [];
  const logContainer = statusDialog?.querySelector('.asd-log');
  if (logContainer) logContainer.innerHTML = '';
}

// Update file list in dialog
function updateFileList(files: Array<{fileName: string; status: 'pending' | 'processing' | 'done' | 'error'; summary?: string}>): void {
  const container = statusDialog?.querySelector('.asd-files');
  if (!container) return;
  
  container.innerHTML = files.map(f => {
    const isNewFile = f.summary?.includes('new file');
    const newBadge = isNewFile ? '<span class="asd-file-new">NEW</span>' : '';
    return `
    <div class="asd-file ${f.status}" data-filename="${f.fileName}" style="cursor: pointer;">
      <span class="asd-file-icon">${f.status === 'done' ? '✓' : f.status === 'error' ? '✗' : f.status === 'processing' ? '◐' : '○'}</span>
      <span class="asd-file-name">${f.fileName}</span>
      ${newBadge}
      ${f.summary ? `<span class="asd-file-stats">${f.summary.replace(' (new file)', '')}</span>` : ''}
    </div>
  `}).join('');
  
  // Add click handlers to open files
  container.querySelectorAll('.asd-file').forEach(item => {
    item.addEventListener('click', async () => {
      const fileName = item.getAttribute('data-filename');
      if (fileName) {
        console.log(`📂 [StatusDialog] Opening file: ${fileName}`);
        await openFileAndWait(fileName, 3000);
      }
    });
  });
}

// Show completion state with Accept/Reject buttons
function showCompletionState(changes: typeof pendingChanges, errorCount: number): void {
  if (!statusDialog) return;
  
  pendingChanges = changes;
  
  // Calculate totals
  let totalAdded = 0, totalDeleted = 0, totalModified = 0;
  changes.forEach(c => {
    const match = c.changesSummary.match(/\+(\d+)\s*-(\d+)\s*~(\d+)/);
    if (match) {
      totalAdded += parseInt(match[1]) || 0;
      totalDeleted += parseInt(match[2]) || 0;
      totalModified += parseInt(match[3]) || 0;
    }
  });
  
  // Update header
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Changes Ready';
  
  // Stop spinner
  statusDialog.querySelector('.asd-spinner')?.classList.add('done');
  
  // Update status
  updateStatusText(`${changes.length} file${changes.length > 1 ? 's' : ''} modified`);
  updateProgress(100);
  
  // Show summary
  const summary = statusDialog.querySelector('.asd-summary') as HTMLElement;
  if (summary) {
    summary.style.display = 'flex';
    summary.innerHTML = `
      <div class="summary-stat add"><span class="num">+${totalAdded}</span><span class="label">added</span></div>
      <div class="summary-stat del"><span class="num">-${totalDeleted}</span><span class="label">deleted</span></div>
      <div class="summary-stat mod"><span class="num">~${totalModified}</span><span class="label">modified</span></div>
    `;
  }
  
  // Show footer with buttons
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) {
    footer.style.display = 'flex';
  }
  
  // Add expanded class for animation
  statusDialog.classList.add('expanded');
  
  // Setup button handlers
  statusDialog.querySelector('.asd-btn-accept')?.addEventListener('click', handleAccept);
  statusDialog.querySelector('.asd-btn-reject')?.addEventListener('click', handleReject);
  
  // Keyboard handler
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      const active = document.activeElement;
      if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleAccept();
        document.removeEventListener('keydown', keyHandler);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleReject();
      document.removeEventListener('keydown', keyHandler);
    }
  };
  document.addEventListener('keydown', keyHandler);
  (statusDialog as any)._keyHandler = keyHandler;
  
  hasUnapprovedChanges = true;
  
  // Auto-open the first modified file so user can see the changes
  if (changes.length > 0) {
    const firstFile = changes[0].fileName;
    console.log(`📂 [AutoOpen] Opening first modified file: ${firstFile}`);
    setTimeout(async () => {
      await openFileAndWait(firstFile, 3000);
    }, 300);
  }
}

// Handle Accept button
async function handleAccept(): Promise<void> {
  if (!statusDialog || pendingChanges.length === 0) return;
  
  // Update UI to saving state
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Saving...';
  statusDialog.querySelector('.asd-spinner')?.classList.remove('done');
  
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) footer.style.display = 'none';
  
  statusDialog.classList.remove('expanded');
  statusDialog.classList.add('saving');
  
  updateStatusText('Saving files...');
  addStatusLog('Starting save process...', 'info');
  
  let savedCount = 0;
  const total = pendingChanges.length;
  
  for (let i = 0; i < pendingChanges.length; i++) {
    const change = pendingChanges[i];
    updateProgress((i / total) * 100);
    
    try {
      markBlockAsApplied(change.block, change.blockId);
      addStatusLog(`Saving ${change.fileName}...`, 'info');
      updateStatusText(`Saving ${change.fileName}...`);
      
      // Open file
      const opened = await openFileAndWait(change.fileName, 3000);
      if (!opened) {
        addStatusLog(`Failed to open ${change.fileName}`, 'error');
        continue;
      }
      
      await new Promise(r => setTimeout(r, 100));
      
      // Get content
      const editor = getMonacoEditorForApply();
      const model = editor?.getModel();
      if (!model) continue;
      
      const content = model.getValue();
      let filePath = change.fullPath || model.uri?.path || '';
      if (filePath.startsWith('/') && filePath.charAt(2) === ':') {
        filePath = filePath.substring(1);
      }
      filePath = filePath.replace(/\\/g, '/');
      
      // Save
      let saved = false;
      
      try {
        const invoke = (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
        if (invoke) {
          await invoke('write_file', { path: filePath, content });
          saved = true;
        }
      } catch (e) {}
      
      if (!saved) {
        try {
          const fs = (window as any).__TAURI__?.fs;
          if (fs?.writeTextFile) {
            await fs.writeTextFile(filePath, content);
            saved = true;
          }
        } catch (e) {}
      }
      
      if (!saved) {
        try {
          const saveFile = (window as any).saveFile;
          if (saveFile) {
            await saveFile(content, filePath);
            saved = true;
          }
        } catch (e) {}
      }
      
      if (!saved) {
        try {
          const tabManager = (window as any).tabManager;
          if (tabManager?.saveCurrentTab) {
            await tabManager.saveCurrentTab();
            saved = true;
          }
        } catch (e) {}
      }
      
      if (saved) {
        savedCount++;
        addStatusLog(`Saved ${change.fileName}`, 'success');
        
        // Update tab state
        try {
          const tabManager = (window as any).tabManager;
          if (tabManager) {
            const activeTab = tabManager.getActiveTab?.();
            if (activeTab) {
              activeTab.isModified = false;
              activeTab.originalContent = content;
              tabManager.markTabAsSaved?.(activeTab.id);
            }
          }
          document.dispatchEvent(new CustomEvent('file-saved', { detail: { path: filePath } }));
        } catch (e) {}
      } else {
        addStatusLog(`Failed to save ${change.fileName}`, 'error');
      }
      
      await new Promise(r => setTimeout(r, 150));
      
    } catch (e) {
      addStatusLog(`Error: ${change.fileName}`, 'error');
    }
  }
  
  updateProgress(100);
  
  // Final state
  if (savedCount === total) {
    addStatusLog(`All ${savedCount} file(s) saved successfully`, 'success');
    updateStatusText('Complete!');
  } else {
    addStatusLog(`Saved ${savedCount}/${total} files`, savedCount > 0 ? 'warning' : 'error');
    updateStatusText(`Saved ${savedCount}/${total}`);
  }
  
  // Close dialog after delay
  setTimeout(() => {
    closeStatusDialog();
  }, 2000);
  
  // Cleanup
  hasUnapprovedChanges = false;
  isProcessingMultiFile = false;
  clearPendingDecorations();
  clearAllDecorations();
  pendingChanges = [];
}

// Handle Reject button
async function handleReject(): Promise<void> {
  if (!statusDialog) return;
  
  // Update UI
  const titleText = statusDialog.querySelector('.asd-title-text');
  if (titleText) titleText.textContent = 'Reverting...';
  statusDialog.querySelector('.asd-spinner')?.classList.remove('done');
  
  const footer = statusDialog.querySelector('.asd-footer') as HTMLElement;
  if (footer) footer.style.display = 'none';
  
  statusDialog.classList.remove('expanded');
  
  addStatusLog('Reverting changes...', 'warning');
  updateStatusText('Reverting...');
  
  for (const change of pendingChanges) {
    try {
      markBlockAsRejected(change.block, change.blockId);
      
      const opened = await openFileAndWait(change.fileName, 3000);
      if (opened) {
        const editor = getMonacoEditorForApply();
        const model = editor?.getModel();
        if (model && editor) {
          const monaco = (window as any).monaco;
          editor.executeEdits('revert', [{
            range: model.getFullModelRange(),
            text: change.originalContent,
            forceMoveMarkers: true
          }]);
          addStatusLog(`Reverted ${change.fileName}`, 'info');
        }
      }
    } catch (e) {
      addStatusLog(`Error reverting ${change.fileName}`, 'error');
    }
  }
  
  addStatusLog('All changes reverted', 'success');
  updateStatusText('Reverted');
  
  // Close after delay
  setTimeout(() => {
    closeStatusDialog();
  }, 1500);
  
  // Cleanup
  hasUnapprovedChanges = false;
  isProcessingMultiFile = false;
  clearPendingDecorations();
  clearAllDecorations();
  pendingChanges = [];
}

// Close and remove dialog
function closeStatusDialog(): void {
  if (statusDialog) {
    const keyHandler = (statusDialog as any)._keyHandler;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    
    statusDialog.classList.add('closing');
    setTimeout(() => {
      statusDialog?.remove();
      statusDialog = null;
    }, 300);
  }
  statusLogEntries = [];
}

// Make element draggable
function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let offsetX = 0, offsetY = 0, isDragging = false;
  
  handle.style.cursor = 'move';
  
  handle.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    element.style.transition = 'none';
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Keep within viewport
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
    element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.style.transition = '';
      document.body.style.userSelect = '';
    }
  });
}

// Inject styles for status dialog
function injectStatusDialogStyles(): void {
  if (document.getElementById('ai-status-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-status-dialog-styles';
  style.textContent = `
    .ai-status-dialog {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 420px;
      background: #1a1d23;
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e6edf3;
      animation: asdSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    
    .ai-status-dialog.closing {
      animation: asdSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    .ai-status-dialog.minimized .asd-body,
    .ai-status-dialog.minimized .asd-footer {
      display: none !important;
    }
    
    .ai-status-dialog.minimized {
      width: 280px;
    }
    
    @keyframes asdSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes asdSlideDown {
      from { opacity: 1; }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    
    .asd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #21262d;
      border-bottom: 1px solid #30363d;
      border-radius: 12px 12px 0 0;
    }
    
    .asd-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #f0f6fc;
    }
    
    .asd-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #30363d;
      border-top-color: #58a6ff;
      border-radius: 50%;
      animation: asdSpin 0.8s linear infinite;
    }
    
    .asd-spinner.done {
      border-color: #3fb950;
      border-top-color: #3fb950;
      animation: none;
    }
    
    @keyframes asdSpin {
      to { transform: rotate(360deg); }
    }
    
    .asd-controls {
      display: flex;
      gap: 4px;
    }
    
    .asd-minimize {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #8b949e;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .asd-minimize:hover {
      background: #30363d;
      color: #f0f6fc;
    }
    
    .asd-body {
      padding: 16px;
    }
    
    .asd-status-text {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 10px;
    }
    
    .asd-progress {
      height: 4px;
      background: #21262d;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    
    .asd-progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #238636, #3fb950);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .asd-log {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 10px 12px;
      max-height: 120px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 11px;
      line-height: 1.7;
      margin-bottom: 12px;
    }
    
    .asd-log .log-entry {
      display: flex;
      gap: 8px;
    }
    
    .asd-log .log-time {
      color: #484f58;
      flex-shrink: 0;
    }
    
    .asd-log .log-icon {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
    }
    
    .asd-log .log-entry.info .log-icon { color: #58a6ff; }
    .asd-log .log-entry.success .log-icon { color: #3fb950; }
    .asd-log .log-entry.warning .log-icon { color: #d29922; }
    .asd-log .log-entry.error .log-icon { color: #f85149; }
    
    .asd-log .log-msg {
      color: #c9d1d9;
    }
    
    .asd-files {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    
    .asd-file {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #21262d;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    
    .asd-file:hover {
      background: #30363d;
      border-color: #58a6ff;
    }
    
    .asd-file:active {
      transform: scale(0.98);
    }
    
    .asd-file-icon {
      width: 16px;
      text-align: center;
      color: #8b949e;
    }
    
    .asd-file.done .asd-file-icon { color: #3fb950; }
    .asd-file.error .asd-file-icon { color: #f85149; }
    .asd-file.processing .asd-file-icon { color: #58a6ff; animation: asdSpin 1s linear infinite; }
    
    .asd-file-name {
      flex: 1;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      color: #58a6ff;
    }
    
    .asd-file-stats {
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 11px;
      color: #8b949e;
    }
    
    .asd-file-new {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 3px;
      letter-spacing: 0.5px;
      animation: newFilePulse 1.5s ease-in-out infinite;
    }
    
    @keyframes newFilePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .asd-summary {
      display: flex;
      gap: 20px;
      padding: 12px 16px;
      background: #21262d;
      border-radius: 8px;
      margin-bottom: 0;
    }
    
    .summary-stat {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    
    .summary-stat .num {
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 16px;
      font-weight: 600;
    }
    
    .summary-stat .label {
      font-size: 11px;
      color: #8b949e;
    }
    
    .summary-stat.add .num { color: #3fb950; }
    .summary-stat.del .num { color: #f85149; }
    .summary-stat.mod .num { color: #d29922; }
    
    .asd-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b22;
      border-top: 1px solid #21262d;
      animation: asdFadeIn 0.3s ease;
    }
    
    @keyframes asdFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .asd-hint {
      font-size: 11px;
      color: #484f58;
    }
    
    .asd-hint kbd {
      display: inline-block;
      padding: 2px 6px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 10px;
      color: #8b949e;
    }
    
    .asd-actions {
      display: flex;
      gap: 8px;
    }
    
    .asd-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .asd-btn-accept {
      background: #238636;
      color: #fff;
    }
    
    .asd-btn-accept:hover {
      background: #2ea043;
    }
    
    .asd-btn-reject {
      background: transparent;
      color: #f85149;
      border-color: #f85149;
    }
    
    .asd-btn-reject:hover {
      background: rgba(248, 81, 73, 0.1);
    }
    
    /* Scrollbar */
    .asd-log::-webkit-scrollbar {
      width: 6px;
    }
    
    .asd-log::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .asd-log::-webkit-scrollbar-thumb {
      background: #30363d;
      border-radius: 3px;
    }
    
    .asd-log::-webkit-scrollbar-thumb:hover {
      background: #484f58;
    }
    
    /* Expanded state animation */
    .ai-status-dialog.expanded {
      animation: asdExpand 0.3s ease forwards;
    }
    
    @keyframes asdExpand {
      from { }
      to { }
    }
  `;
  document.head.appendChild(style);
}

// Legacy function wrapper for compatibility
function showMultiFileConfirmationBar(changes: Array<{
  fileName: string;
  fullPath: string;
  originalContent: string;
  newContent: string;
  changesSummary: string;
  block: HTMLElement;
  blockId: string;
}>, errorCount: number): void {
  // Update file list with done status
  updateFileList(changes.map(c => ({
    fileName: c.fileName,
    status: 'done' as const,
    summary: c.changesSummary
  })));
  
  // Show completion state
  showCompletionState(changes, errorCount);
}

/**
 * Apply code without showing confirmation (confirmation shown separately per file)
 */
async function doApplyCodeWithoutConfirmation(block: HTMLElement, code: string, blockId: string): Promise<void> {
  const editor = getMonacoEditorForApply();
  if (!editor) return;
  
  const model = editor.getModel();
  if (!model) return;
  
  // Apply with typing animation
  const lines = code.split('\n');
  const totalChars = code.length;
  const baseDelay = Math.max(1, Math.min(5, 2000 / totalChars));
  
  // Clear editor first
  editor.executeEdits('auto-apply-clear', [{
    range: model.getFullModelRange(),
    text: '',
    forceMoveMarkers: true
  }]);
  
  // Type content progressively
  let currentContent = '';
  for (let i = 0; i < lines.length; i++) {
    currentContent += (i > 0 ? '\n' : '') + lines[i];
    
    editor.executeEdits('auto-apply-type', [{
      range: model.getFullModelRange(),
      text: currentContent,
      forceMoveMarkers: true
    }]);
    
    // Scroll to show current line
    editor.revealLine(i + 1);
    
    // Variable delay based on line length
    const lineDelay = Math.min(50, baseDelay * lines[i].length);
    if (lineDelay > 0 && i < lines.length - 1) {
      await new Promise(r => setTimeout(r, lineDelay));
    }
  }
  
  // Final position
  editor.setPosition({ lineNumber: 1, column: 1 });
  editor.revealLine(1);
}

/**
 * Show per-file confirmation dialog and wait for user response
 */
function showPerFileConfirmation(fileName: string, current: number, total: number): Promise<'accept' | 'reject'> {
  return new Promise((resolve) => {
    // Remove any existing confirmation bars (both single-file and multi-file)
    const existingMulti = document.querySelector('.multi-file-confirm-bar');
    if (existingMulti) existingMulti.remove();
    
    const existingSingle = document.querySelector('.aca-confirm-bar, #aca-confirm-bar');
    if (existingSingle) existingSingle.remove();
    
    // Reset single-file state
    hasUnapprovedChanges = false;
    
    // Create confirmation bar
    const bar = document.createElement('div');
    bar.className = 'multi-file-confirm-bar';
    bar.innerHTML = `
      <div class="mf-confirm-content">
        <span class="mf-confirm-icon">📄</span>
        <span class="mf-confirm-file">${fileName}</span>
        <span class="mf-confirm-progress">(${current}/${total})</span>
        <div class="mf-confirm-buttons">
          <button class="mf-accept-btn" title="Accept (Enter)">
            <span>✓</span> Accept
          </button>
          <button class="mf-reject-btn" title="Reject (Escape)">
            <span>✗</span> Reject
          </button>
        </div>
        <span class="mf-confirm-hint">Enter to accept, Escape to reject</span>
      </div>
    `;
    
    // Add styles if not present
    if (!document.querySelector('#multi-file-confirm-styles')) {
      const style = document.createElement('style');
      style.id = 'multi-file-confirm-styles';
      style.textContent = `
        .multi-file-confirm-bar {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, rgba(30, 35, 45, 0.98), rgba(40, 45, 55, 0.98));
          border: 1px solid rgba(100, 180, 255, 0.4);
          border-radius: 12px;
          padding: 12px 20px;
          z-index: 10001;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(100, 180, 255, 0.15);
          animation: mfConfirmSlideUp 0.3s ease-out;
        }
        
        @keyframes mfConfirmSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        .mf-confirm-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .mf-confirm-icon {
          font-size: 20px;
        }
        
        .mf-confirm-file {
          color: #7dd3fc;
          font-weight: 600;
          font-size: 14px;
          font-family: 'SF Mono', Monaco, monospace;
        }
        
        .mf-confirm-progress {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }
        
        .mf-confirm-buttons {
          display: flex;
          gap: 8px;
          margin-left: 8px;
        }
        
        .mf-accept-btn, .mf-reject-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mf-accept-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        
        .mf-accept-btn:hover {
          background: linear-gradient(135deg, #34d399, #10b981);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        
        .mf-reject-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }
        
        .mf-reject-btn:hover {
          background: linear-gradient(135deg, #f87171, #ef4444);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        
        .mf-confirm-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
          margin-left: 8px;
        }
        
        @media (max-width: 600px) {
          .mf-confirm-hint { display: none; }
          .mf-confirm-content { gap: 8px; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(bar);
    
    // Cleanup function
    const cleanup = () => {
      bar.remove();
      document.removeEventListener('keydown', handleKeydown);
    };
    
    // Handle keyboard
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve('accept');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve('reject');
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Handle button clicks
    bar.querySelector('.mf-accept-btn')?.addEventListener('click', () => {
      cleanup();
      resolve('accept');
    });
    
    bar.querySelector('.mf-reject-btn')?.addEventListener('click', () => {
      cleanup();
      resolve('reject');
    });
  });
}

/**
 * Mark block as applied (green styling)
 */
function markBlockAsApplied(block: HTMLElement, blockId: string): void {
  const wrapper = block.closest('.cbe-wrapper') || block;
  wrapper.classList.add('code-applied');
  wrapper.classList.remove('code-rejected');
  
  // Find header to insert status badge properly
  const header = wrapper.querySelector('.cbe-header');
  const targetContainer = header || wrapper;
  
  // Update or add status indicator
  let indicator = wrapper.querySelector('.code-apply-status');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'code-apply-status';
    
    // Insert into header if available, otherwise append to wrapper
    if (header) {
      // Find the actions container or append to header
      const actions = header.querySelector('.cbe-actions, .cbe-header-actions');
      if (actions) {
        actions.appendChild(indicator);
      } else {
        header.appendChild(indicator);
      }
    } else {
      wrapper.appendChild(indicator);
    }
  }
  indicator.innerHTML = '✓ Applied';
  indicator.className = 'code-apply-status status-applied';
}

/**
 * Mark block as rejected (red styling)  
 */
function markBlockAsRejected(block: HTMLElement, blockId: string): void {
  const wrapper = block.closest('.cbe-wrapper') || block;
  wrapper.classList.add('code-rejected');
  wrapper.classList.remove('code-applied');
  
  // Find header to insert status badge properly
  const header = wrapper.querySelector('.cbe-header');
  
  // Update or add status indicator
  let indicator = wrapper.querySelector('.code-apply-status');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'code-apply-status';
    
    // Insert into header if available
    if (header) {
      const actions = header.querySelector('.cbe-actions, .cbe-header-actions');
      if (actions) {
        actions.appendChild(indicator);
      } else {
        header.appendChild(indicator);
      }
    } else {
      wrapper.appendChild(indicator);
    }
  }
  indicator.innerHTML = '✗ Rejected';
  indicator.className = 'code-apply-status status-rejected';
}

/**
 * Mark block as checked (no changes needed - gray styling)
 */
function markBlockAsChecked(block: HTMLElement, blockId: string): void {
  const wrapper = block.closest('.cbe-wrapper') || block;
  wrapper.classList.add('code-checked');
  wrapper.classList.remove('code-applied', 'code-rejected');
  
  // Find header to insert status badge properly
  const header = wrapper.querySelector('.cbe-header');
  
  // Update or add status indicator
  let indicator = wrapper.querySelector('.code-apply-status');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'code-apply-status';
    
    // Insert into header if available
    if (header) {
      const actions = header.querySelector('.cbe-actions, .cbe-header-actions');
      if (actions) {
        actions.appendChild(indicator);
      } else {
        header.appendChild(indicator);
      }
    } else {
      wrapper.appendChild(indicator);
    }
  }
  indicator.innerHTML = '⏭️ No changes';
  indicator.className = 'code-apply-status status-checked';
  
  // Add to processed IDs
  processedBlockIds.add(blockId);
}

(window as any).processMultiFileApply = processMultiFileApply;

async function autoOpenAndApply(targetFileName: string, code: string, blockId: string, block: HTMLElement): Promise<boolean> {
  console.log(`🚀 [AutoOpen] Auto-opening "${targetFileName}" to apply code...`);
  showAutoApplyToast(`📂 Opening ${targetFileName}...`, 'success');
  
  pendingAutoApply = { fileName: targetFileName, code, blockId, block };
  
  const opened = await openFileAndWait(targetFileName, 6000);
  
  if (opened) {
    console.log(`✅ [AutoOpen] File "${targetFileName}" opened successfully!`);
    pendingAutoApply = null;
    processedBlockIds.add(blockId);
    await doApplyCode(block, code, blockId);
    return true;
  } else {
    console.log(`❌ [AutoOpen] Could not open file: ${targetFileName}`);
    showAutoApplyToast(`⚠️ Could not open ${targetFileName}`, 'error');
    pendingAutoApply = null;
    processedBlockIds.add(blockId);
    return false;
  }
}

(window as any).autoOpenAndApply = autoOpenAndApply;
(window as any).isAIProjectSearchEnabled = isAIProjectSearchEnabled;

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

(window as any).testFindFile = (fileName: string) => {
  console.log(`\n🧪 ===== TEST: Find File =====`);
  const result = findFileInProject(fileName);
  if (result) {
    console.log(`✅ FOUND:`, result.element);
    console.log(`   Path: ${result.path}`);
    return true;
  } else {
    console.log(`❌ NOT FOUND`);
    return false;
  }
};

(window as any).testOpenFile = async (fileName: string) => {
  console.log(`\n🧪 ===== TEST: Open File =====`);
  const result = await openFileAndWait(fileName, 5000);
  console.log(result ? `✅ SUCCESS` : `❌ FAILED`);
  return result;
};

(window as any).testStatus = () => {
  console.log(`\n🧪 ===== SYSTEM STATUS =====`);
  console.log(`   AI Search enabled: ${isAIProjectSearchEnabled()}`);
  console.log(`   Auto-Apply enabled: ${autoApplyEnabled}`);
  console.log(`   Multi-file processing: ${isProcessingMultiFile}`);
  
  const editor = getMonacoEditorForApply();
  const currentFile = editor?.getModel()?.uri?.path?.split('/').pop() || 'none';
  console.log(`   Current file in editor: ${currentFile}`);
  
  const blocks = getUnprocessedCodeBlocks();
  console.log(`   Unprocessed code blocks: ${blocks.length}`);
};

function injectFileMismatchStyles(): void {
  if (document.getElementById('aca-file-mismatch-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'aca-file-mismatch-styles';
  style.textContent = `
    .aca-file-mismatch-warning {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
      border: 2px solid #f0883e;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      z-index: 10002;
      max-width: 400px;
    }
    .aca-warning-icon { font-size: 32px; }
    .aca-warning-content { text-align: center; }
    .aca-warning-title { color: #f0883e; font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .aca-warning-text { color: #ccc; font-size: 13px; line-height: 1.5; }
    .aca-warning-text strong { color: #fff; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .aca-warning-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .aca-warning-btn { padding: 8px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
    .aca-warning-btn.proceed { background: #333; color: #f0883e; border: 1px solid #f0883e; }
    .aca-warning-btn.proceed:hover { background: rgba(240, 136, 62, 0.2); }
    .aca-warning-btn.cancel { background: #333; color: #ccc; border: 1px solid #555; }
    .aca-warning-btn.cancel:hover { background: #444; }
    .aca-warning-btn.open-file { background: linear-gradient(135deg, #238636 0%, #2ea043 100%); color: #fff; }
    .aca-warning-btn.open-file:hover { background: linear-gradient(135deg, #2ea043 0%, #3fb950 100%); }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// SMART CODE SELECTION
// ============================================================================

const MIN_SCORE_TO_APPLY = 30;

interface CodeBlockScore {
  block: HTMLElement;
  code: string;
  language: string;
  score: number;
  reasons: string[];
  shouldSkip: boolean;
}

function isExplanationRequest(): boolean {
  const userMessages = document.querySelectorAll('.user-message, .human-message, [class*="user-msg"], [data-role="user"]');
  let lastUserMsg = userMessages[userMessages.length - 1];
  
  if (!lastUserMsg) {
    const allMessages = document.querySelectorAll('.message, .chat-message, [class*="message"]');
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.classList.contains('user') || msg.classList.contains('human') || msg.getAttribute('data-role') === 'user') {
        lastUserMsg = msg;
        break;
      }
    }
  }
  
  if (!lastUserMsg) return false;
  
  const msgText = lastUserMsg.textContent?.toLowerCase() || '';
  
  // If user is asking about a specific line, it's an explanation query
  if (/\b(code\s*)?line\s*\d+/i.test(msgText)) return true;
  if (/what('s| is)\s+(on\s+)?line/i.test(msgText)) return true;
  
  const explanationKeywords = ['explain', 'what is', 'what does', 'why does', 'how does', 'tell me about', 'describe', 'meaning of', 'understand', 'clarify', 'show me line', 'what\'s line', 'line number'];
  const modificationKeywords = ['fix', 'update', 'change', 'modify', 'improve', 'refactor', 'rewrite', 'add', 'remove', 'delete', 'replace', 'create', 'make', 'build', 'write', 'generate'];
  
  for (const keyword of modificationKeywords) {
    if (msgText.includes(keyword)) return false;
  }
  
  for (const keyword of explanationKeywords) {
    if (msgText.includes(keyword)) return true;
  }
  
  return false;
}

function isSnippetOrExample(code: string, block: HTMLElement): boolean {
  const lines = code.split('\n').filter(l => l.trim());
  
  // Very short code blocks are almost always snippets
  if (lines.length <= 5) return true;
  
  // Check if this is an explanation context
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  if (parentMessage) {
    const messageText = parentMessage.textContent?.toLowerCase() || '';
    
    // If AI is explaining a specific line, it's a snippet
    if (/line\s*\d+\s*(is|shows?|contains?)/i.test(messageText)) return true;
    if (/this\s+(line|code)\s+(is|imports?|exports?)/i.test(messageText)) return true;
    if (/here('s| is)\s+(the\s+)?(line|code)/i.test(messageText)) return true;
  }
  
  const hasImport = /^import\s+/m.test(code);
  const hasExport = /^export\s+/m.test(code);
  const hasFunction = /^(async\s+)?function\s+\w+/m.test(code) || /^(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/m.test(code);
  const hasClass = /^class\s+\w+/m.test(code);
  const hasConst = /^(const|let|var)\s+\w+\s*=/m.test(code);
  const hasComponent = /^(export\s+)?(default\s+)?function\s+[A-Z]/m.test(code) || /^const\s+[A-Z]\w+\s*=/m.test(code);
  
  const hasCompleteStructure = hasImport || hasExport || hasFunction || hasClass || hasComponent;
  
  if (lines.length >= 10 && hasCompleteStructure) return false;
  if (lines.length >= 15) return false;
  
  if (!hasImport && !hasExport && !hasFunction && !hasClass && !hasConst && lines.length < 10) return true;
  
  return false;
}

function scoreCodeBlock(block: HTMLElement, currentFileLang: string, currentFileName: string): CodeBlockScore | null {
  const codeInfo = extractCodeFromBlockForApply(block);
  if (!codeInfo || !codeInfo.code.trim()) return null;
  
  const code = codeInfo.code;
  const language = codeInfo.language.toLowerCase();
  const lineCount = code.split('\n').length;
  const nonEmptyLines = code.trim().split('\n').filter(line => line.trim()).length;
  
  let score = 0;
  const reasons: string[] = [];
  let shouldSkip = false;
  
  // ===== SNIPPET FILTER: Very small code blocks are usually examples =====
  if (nonEmptyLines < 3) {
    score -= 500;
    reasons.push(`❌ TOO SMALL (${nonEmptyLines} lines)`);
    shouldSkip = true;
  }
  
  // Skip PLAINTEXT blocks - they're usually just showing examples
  if (language === 'plaintext') {
    score -= 400;
    reasons.push('❌ PLAINTEXT (example)');
    shouldSkip = true;
  }
  
  // Skip import-only snippets
  const trimmedCode = code.trim();
  if (trimmedCode.startsWith('import ') && nonEmptyLines <= 2) {
    score -= 400;
    reasons.push('❌ IMPORT-ONLY snippet');
    shouldSkip = true;
  }
  // ===== END SNIPPET FILTER =====
  
  const editor = getMonacoEditorForApply();
  const currentEditorCode = editor?.getValue() || '';
  const normalizedBlockCode = code.trim().replace(/\r\n/g, '\n');
  const normalizedEditorCode = currentEditorCode.trim().replace(/\r\n/g, '\n');
  
  if (normalizedBlockCode === normalizedEditorCode) {
    score -= 500;
    reasons.push('❌ IDENTICAL TO EDITOR');
    shouldSkip = true;
  }
  
  const isModificationRequest = !isExplanationRequest();
  
  if (!isModificationRequest) {
    score -= 50;
    reasons.push('explanation request');
    if (lineCount < 10) shouldSkip = true;
  }
  
  if (isSnippetOrExample(code, block) && lineCount < 10) {
    score -= 40;
    reasons.push('snippet/example');
    shouldSkip = true;
  }
  
  const aiFileCheck = checkAIMessageForDifferentFile(block, currentFileName);
  if (aiFileCheck.mentionsDifferentFile) {
    const aiSearchOn = isAIProjectSearchEnabled();
    
    if (aiSearchOn) {
      score -= 50;
      reasons.push(`📂 WILL AUTO-OPEN: ${aiFileCheck.mentionedFile || 'unknown'}`);
    } else {
      score -= 300;
      reasons.push(`❌ AI MENTIONS DIFFERENT FILE: ${aiFileCheck.mentionedFile || 'unknown'}`);
      shouldSkip = true;
    }
  }
  
  const detectedFileName = extractTargetFileName(block, code);
  const aiSearchEnabled = isAIProjectSearchEnabled();
  
  if (detectedFileName && currentFileName) {
    const detectedBase = detectedFileName.replace(/\.[^/.]+$/, '').toLowerCase();
    const currentBase = currentFileName.replace(/\.[^/.]+$/, '').toLowerCase();
    
    if (detectedFileName.toLowerCase() === currentFileName.toLowerCase()) {
      score += 100;
      reasons.push(`✅ FILE MATCH: ${detectedFileName}`);
      if (!aiFileCheck.mentionsDifferentFile) shouldSkip = false;
    } else if (detectedBase === currentBase) {
      score += 50;
      reasons.push(`similar file: ${detectedFileName}`);
      if (!aiFileCheck.mentionsDifferentFile) shouldSkip = false;
    } else {
      if (aiSearchEnabled) {
        reasons.push(`📂 Target: ${detectedFileName}`);
      } else {
        score -= 200;
        reasons.push(`❌ WRONG FILE: ${detectedFileName} ≠ ${currentFileName}`);
        shouldSkip = true;
      }
    }
  }
  
  if (currentFileLang && language !== 'plaintext') {
    const langMap: Record<string, string[]> = {
      'typescript': ['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'],
      'typescriptreact': ['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'],
      'javascript': ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'],
      'javascriptreact': ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'],
      'python': ['python', 'py'],
      'rust': ['rust', 'rs'],
      'csharp': ['csharp', 'cs', 'c#'],
      'java': ['java'],
      'html': ['html', 'htm'],
      'css': ['css', 'scss', 'sass'],
      'json': ['json'],
    };
    
    const currentLangAliases = langMap[currentFileLang] || [currentFileLang];
    if (currentLangAliases.includes(language)) {
      score += 50;
      reasons.push(`language match (${language})`);
    }
  }
  
  const parentMessage = block.closest('.message, .ai-message, .assistant-message, [class*="message"]');
  const textBefore = parentMessage?.textContent?.toLowerCase() || '';
  
  const recommendedKeywords = ['recommended', 'final', 'complete', 'updated', 'fixed', 'corrected', 'improved', 'here is the', 'use this', 'replace with'];
  for (const keyword of recommendedKeywords) {
    if (textBefore.includes(keyword)) {
      score += 20;
      reasons.push(`has "${keyword}" marker`);
      break;
    }
  }
  
  if (lineCount >= 10 && lineCount <= 500) {
    score += Math.min(lineCount / 5, 25);
    reasons.push(`${lineCount} lines`);
  } else if (lineCount >= 5 && lineCount < 10) {
    score += 10;
    reasons.push(`${lineCount} lines (medium)`);
  } else if (lineCount < 5) {
    score -= 20;
    reasons.push('very short');
  }
  
  const hasCompleteStructure = /^(export\s+)?(function|class|const|let|var|interface|type|def|async|public|private)\s+\w+/m.test(code);
  if (hasCompleteStructure) {
    score += 15;
    reasons.push('complete structure');
  }
  
  if (code.includes('<<<') || code.includes('>>>') || code.includes('===')) {
    score -= 30;
    reasons.push('looks like diff');
  }
  
  const nonCommentLines = code.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('*');
  });
  if (nonCommentLines.length < 3) {
    score -= 20;
    reasons.push('mostly comments');
  }
  
  const isWrongFile = reasons.some(r => r.includes('WRONG FILE'));
  const isIdentical = reasons.some(r => r.includes('IDENTICAL'));
  const aiMentionsDifferent = reasons.some(r => r.includes('AI MENTIONS DIFFERENT FILE'));
  const willAutoOpen = reasons.some(r => r.includes('WILL AUTO-OPEN'));
  
  if (willAutoOpen) {
    shouldSkip = false;
  } else if (score >= MIN_SCORE_TO_APPLY && !isWrongFile && !isIdentical && !aiMentionsDifferent) {
    shouldSkip = false;
  }
  
  if ((isWrongFile || isIdentical || aiMentionsDifferent) && !willAutoOpen) {
    shouldSkip = true;
  }
  
  return { block, code, language, score, reasons, shouldSkip };
}

function selectBestCodeBlock(blocks: HTMLElement[]): HTMLElement | null {
  if (blocks.length === 0) return null;
  
  const editor = getMonacoEditorForApply();
  const model = editor?.getModel();
  const currentFileLang = model?.getLanguageId?.() || '';
  const currentFileName = model?.uri?.path?.split('/').pop() || '';
  
  console.log(`🎯 [SmartSelect] Scoring ${blocks.length} code blocks (file: ${currentFileName})`);
  
  const scoredBlocks: CodeBlockScore[] = [];
  for (const block of blocks) {
    const scored = scoreCodeBlock(block, currentFileLang, currentFileName);
    if (scored) {
      scoredBlocks.push(scored);
      const skipNote = scored.shouldSkip ? ' ⚠️ SKIP' : '';
      console.log(`   📊 Score ${scored.score}: ${scored.language} (${scored.code.split('\n').length} lines) - ${scored.reasons.join(', ')}${skipNote}`);
    }
  }
  
  if (scoredBlocks.length === 0) return null;
  
  if (isAIProjectSearchEnabled() && scoredBlocks.length > 1) {
    const targetFiles = new Set<string>();
    for (const scored of scoredBlocks) {
      const detectedFile = extractTargetFileName(scored.block, scored.code);
      // Filter out false positives before adding to target files
      if (detectedFile && !isTechnologyNameNotFile(detectedFile)) {
        targetFiles.add(detectedFile.toLowerCase());
      }
    }
    
    if (targetFiles.size > 1) {
      console.log(`📚 [SmartSelect] Multi-file detected! ${targetFiles.size} different files`);
      showAutoApplyToast(`📚 Found code for ${targetFiles.size} files - processing...`, 'success');
      setTimeout(() => processMultiFileApply(), 100);
      return null;
    }
  }
  
  const validBlocks = scoredBlocks.filter(b => !b.shouldSkip);
  const skippedBlocks = scoredBlocks.filter(b => b.shouldSkip);
  
  if (skippedBlocks.length > 0) {
    console.log(`   ⏭️ Skipping ${skippedBlocks.length} blocks`);
  }
  
  if (validBlocks.length === 0) {
    const autoOpenBlocks = skippedBlocks.filter(b => b.reasons.some(r => r.includes('WILL AUTO-OPEN')));
    
    if (autoOpenBlocks.length > 0 && isAIProjectSearchEnabled()) {
      console.log(`📂 [SmartSelect] All blocks are for different files - triggering multi-file apply`);
      setTimeout(() => processMultiFileApply(), 100);
      return null;
    }
    
    console.log(`   ⏭️ No valid blocks`);
    const identicalBlocks = skippedBlocks.filter(b => b.reasons.some(r => r.includes('IDENTICAL')));
    
    if (identicalBlocks.length > 0 && identicalBlocks.length === skippedBlocks.length) {
      showAutoApplyToast(`⏭️ AI returned same code - no changes`, 'success');
    } else {
      showAutoApplyToast('⏭️ Skipped: No suitable code block', 'success');
    }
    
    blocks.forEach(b => {
      const id = generateBlockId(b);
      processedBlockIds.add(id);
    });
    
    return null;
  }
  
  validBlocks.sort((a, b) => b.score - a.score);
  const best = validBlocks[0];
  
  const isAutoOpenBlock = best.reasons.some(r => r.includes('WILL AUTO-OPEN'));
  
  if (best.score < MIN_SCORE_TO_APPLY && !isAutoOpenBlock) {
    console.log(`   ⏭️ Best score (${best.score}) below threshold`);
    showAutoApplyToast('⏭️ Skipped: No suitable code block', 'success');
    blocks.forEach(b => processedBlockIds.add(generateBlockId(b)));
    return null;
  }
  
  console.log(`   ✅ Selected: ${best.language} with score ${best.score}`);
  return best.block;
}

function getUnprocessedCodeBlocks(): HTMLElement[] {
  // Find the LATEST AI message only
  const aiMessages = document.querySelectorAll('.ai-message, .assistant-message, .response-message, [data-role="assistant"]');
  
  console.log(`🔍 [GetBlocks] Found ${aiMessages.length} AI messages`);
  
  if (aiMessages.length === 0) {
    // Fallback: get all blocks if no AI message container found
    console.log(`🔍 [GetBlocks] No AI message container, searching entire document...`);
    const allBlocks = document.querySelectorAll('.cbe-wrapper, .muf-block, pre:has(code)');
    const unprocessed: HTMLElement[] = [];
    allBlocks.forEach(block => {
      const blockId = generateBlockId(block as HTMLElement);
      if (!processedBlockIds.has(blockId)) {
        unprocessed.push(block as HTMLElement);
      }
    });
    console.log(`🔍 [GetBlocks] Found ${unprocessed.length} unprocessed blocks in document`);
    return unprocessed;
  }
  
  // Get the LAST (most recent) AI message
  const latestMessage = aiMessages[aiMessages.length - 1];
  console.log(`🔍 [GetBlocks] Searching in latest AI message...`);
  
  // ⭐ FIX: Look for ALL possible code block types
  // This catches code blocks that messageUIFix hasn't enhanced yet
  const enhancedBlocks = latestMessage.querySelectorAll('.cbe-wrapper, .muf-block');
  const rawPreBlocks = latestMessage.querySelectorAll('pre:not(.muf-pre):not(.cvp-pre)');
  const codeOnlyBlocks = latestMessage.querySelectorAll('code[class*="language-"], code[class*="hljs"]');
  
  console.log(`🔍 [GetBlocks] Enhanced: ${enhancedBlocks.length}, Raw pre: ${rawPreBlocks.length}, Code-only: ${codeOnlyBlocks.length}`);
  
  const unprocessed: HTMLElement[] = [];
  const seenBlocks = new Set<HTMLElement>();
  
  // Add enhanced blocks
  enhancedBlocks.forEach(block => {
    const blockId = generateBlockId(block as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(block as HTMLElement)) {
      console.log(`  ✅ Added enhanced block: ${blockId}`);
      unprocessed.push(block as HTMLElement);
      seenBlocks.add(block as HTMLElement);
    }
  });
  
  // Add raw pre blocks that aren't inside enhanced wrappers
  rawPreBlocks.forEach(pre => {
    // Skip if already inside an enhanced wrapper
    if (pre.closest('.muf-block') || pre.closest('.cbe-wrapper')) {
      console.log(`  ⏭️ Skipping pre - inside enhanced wrapper`);
      return;
    }
    
    // Check for code element OR direct code content
    const codeEl = pre.querySelector('code');
    const hasDirectCode = pre.textContent && pre.textContent.trim().length > 20;
    
    if (!codeEl && !hasDirectCode) {
      console.log(`  ⏭️ Skipping pre - no code content`);
      return;
    }
    
    const blockId = generateBlockId(pre as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(pre as HTMLElement)) {
      console.log(`  ✅ Added raw pre block: ${blockId}`);
      unprocessed.push(pre as HTMLElement);
      seenBlocks.add(pre as HTMLElement);
    }
  });
  
  // Add code-only blocks (not inside pre) that aren't inside enhanced wrappers
  codeOnlyBlocks.forEach(code => {
    // Skip if inside pre or enhanced wrapper
    if (code.closest('pre') || code.closest('.muf-block') || code.closest('.cbe-wrapper')) {
      return;
    }
    
    // Get or create a wrapper element to work with
    const wrapper = code.parentElement;
    if (!wrapper) return;
    
    const blockId = generateBlockId(wrapper as HTMLElement);
    if (!processedBlockIds.has(blockId) && !seenBlocks.has(wrapper as HTMLElement)) {
      console.log(`  ✅ Added code-only block: ${blockId}`);
      unprocessed.push(wrapper as HTMLElement);
      seenBlocks.add(wrapper as HTMLElement);
    }
  });
  
  console.log(`🔍 [GetBlocks] Total: ${unprocessed.length} unprocessed blocks`);
  
  return unprocessed;
}

// ============================================================================
// AUTO-APPLY NEW CODE BLOCK - MAIN FUNCTION WITH MULTI-FILE INTEGRATION
// ============================================================================

async function autoApplyNewCodeBlock(block: HTMLElement | null = null): Promise<void> {
  if (!autoApplyEnabled) {
    return; // Disabled
  }
  
  if (isTypingInProgress) {
    return; // Typing in progress
  }
  
  // Skip if multi-file is processing
  if (isProcessingMultiFile) {
    return; // Multi-file in progress
  }
  
  // Check for multi-file scenario
  if (!isProcessingMultiFile) {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    
    if (unprocessedBlocks.length >= 1) {
      const targetFiles = new Map<string, HTMLElement[]>();
      
      for (const blk of unprocessedBlocks) {
        const codeInfo = extractCodeFromBlockForApply(blk);
        if (!codeInfo || !codeInfo.code.trim()) continue;
        
        // ===== SNIPPET FILTER: Skip tiny code blocks =====
        const codeLines = codeInfo.code.trim().split('\n').filter(line => line.trim());
        if (codeLines.length < 5) continue; // Skip snippets (increased from 3)
        if (codeInfo.language?.toLowerCase() === 'plaintext') continue; // Skip PLAINTEXT
        const trimmedCode = codeInfo.code.trim();
        if (trimmedCode.startsWith('import ') && codeLines.length <= 3) continue; // Skip import-only
        
        // Skip explanation snippets
        const parentMessage = blk.closest('.message, .ai-message, .assistant-message, [class*="message"]');
        if (parentMessage) {
          const messageText = parentMessage.textContent?.toLowerCase() || '';
          if (/line\s*\d+\s*(is|shows?|contains?)/i.test(messageText) && codeLines.length <= 5) continue;
          if (/this\s+(line|code)\s+(is|imports?)/i.test(messageText) && codeLines.length <= 5) continue;
        }
        // ===== END SNIPPET FILTER =====
        
        const detectedFile = extractTargetFileName(blk, codeInfo.code);
        // Filter out false positives before adding to target files
        if (detectedFile && !isTechnologyNameNotFile(detectedFile)) {
          const key = detectedFile.toLowerCase();
          if (!targetFiles.has(key)) targetFiles.set(key, []);
          targetFiles.get(key)!.push(blk);
        }
      }
      
      console.log(`📊 [AutoApply] Found ${unprocessedBlocks.length} blocks targeting ${targetFiles.size} file(s)`);
      
      const editor = getMonacoEditorForApply();
      const currentFile = editor?.getModel()?.uri?.path?.split('/').pop()?.toLowerCase() || '';
      
      if (targetFiles.size > 1) {
        console.log(`📚 [AutoApply] MULTI-FILE DETECTED: ${Array.from(targetFiles.keys()).join(', ')}`);
        await processMultiFileApply();
        return;
      }
      
      if (targetFiles.size === 1) {
        const targetFile = Array.from(targetFiles.keys())[0];
        
        if (targetFile !== currentFile && currentFile !== '') {
          console.log(`📂 [AutoApply] Code is for "${targetFile}" but "${currentFile}" is open`);
          await processMultiFileApply();
          return;
        } else if (currentFile === '') {
          console.log(`📂 [AutoApply] No file open. Will open "${targetFile}"`);
          await processMultiFileApply();
          return;
        }
      }
    }
  }
  
  // Only clear processedBlockIds if there's truly a new message AND we haven't processed it yet
  if (hasNewMessage()) {
    // Mark the message as processed FIRST to prevent re-clearing
    markMessageProcessed();
    // Then clear for this new message
    processedBlockIds.clear();
    console.log('📨 [AutoApply] New message - cleared processed blocks');
  }
  
  let targetBlock = block;
  if (!targetBlock) {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length === 0) {
      console.log('⏭️ [AutoApply] No unprocessed blocks');
      markMessageProcessed();
      return;
    }
    
    targetBlock = selectBestCodeBlock(unprocessedBlocks);
    if (!targetBlock) {
      console.log('⚠️ [AutoApply] No suitable code block found');
      markMessageProcessed();
      return;
    }
  } else {
    const unprocessedBlocks = getUnprocessedCodeBlocks();
    if (unprocessedBlocks.length > 1) {
      console.log(`🎯 [AutoApply] Multiple blocks (${unprocessedBlocks.length}), selecting best...`);
      targetBlock = selectBestCodeBlock(unprocessedBlocks);
      if (!targetBlock) {
        markMessageProcessed();
        return;
      }
    }
  }
  
  const blockId = generateBlockId(targetBlock);
  console.log('🔍 [AutoApply] Processing block:', blockId);
  
  if (processedBlockIds.has(blockId)) {
    console.log('⏭️ [AutoApply] Already processed:', blockId);
    return;
  }
  
  const codeInfo = extractCodeFromBlockForApply(targetBlock);
  if (!codeInfo || !codeInfo.code.trim()) {
    console.log('⚠️ [AutoApply] No code found in block');
    return;
  }
  
  console.log('📝 [AutoApply] Selected code:', codeInfo.language, codeInfo.code.length, 'chars');
  
  const editor = getMonacoEditorForApply();
  if (!editor) {
    console.log('⚠️ [AutoApply] No editor open');
    showAutoApplyToast('⚠️ Open a file first', 'error');
    return;
  }
  
  const fileValidation = validateFileMatch(targetBlock, codeInfo.code);
  console.log(`📄 [FileValidation] ${fileValidation.reason}`);
  
  if (!fileValidation.isValid) {
    console.log(`⚠️ [FileValidation] Mismatch: ${fileValidation.detectedFileName} vs ${fileValidation.currentFileName}`);
    
    if (isAIProjectSearchEnabled() && fileValidation.detectedFileName) {
      console.log(`🔍 [AutoOpen] AI Project Search is ON - attempting auto-open...`);
      
      const success = await autoOpenAndApply(fileValidation.detectedFileName, codeInfo.code, blockId, targetBlock);
      if (success) return;
      
      console.log(`⚠️ [AutoOpen] Auto-open failed, showing manual warning`);
    }
    
    return new Promise<void>((resolve) => {
      showFileMismatchWarning(
        fileValidation,
        async () => {
          console.log('🔄 [FileValidation] User chose to apply anyway');
          await doApplyCode(targetBlock!, codeInfo.code, blockId);
          resolve();
        },
        () => {
          console.log('❌ [FileValidation] User cancelled apply');
          processedBlockIds.add(blockId);
          showAutoApplyToast(`⏭️ Skipped - wrong file`, 'success');
          resolve();
        }
      );
    });
  }
  
  await doApplyCode(targetBlock, codeInfo.code, blockId);
}

async function doApplyCode(targetBlock: HTMLElement, code: string, blockId: string): Promise<void> {
  const allUnprocessed = getUnprocessedCodeBlocks();
  allUnprocessed.forEach(b => {
    const id = generateBlockId(b);
    processedBlockIds.add(id);
  });
  lastProcessedBlockId = blockId;
  
  markMessageProcessed();
  
  showAutoApplyToast(`🔍 Analyzing changes...`, 'success');
  
  targetBlock.style.boxShadow = '0 0 0 2px #4caf50';
  targetBlock.style.transition = 'box-shadow 0.3s';
  
  allUnprocessed.forEach(b => {
    if (b !== targetBlock) {
      (b as HTMLElement).style.opacity = '0.5';
      setTimeout(() => { (b as HTMLElement).style.opacity = ''; }, 2000);
    }
  });
  
  console.log('🚀 [AutoApply] Starting smart update...');
  const result = await applySmartUpdate(code);
  
  setTimeout(() => { targetBlock!.style.boxShadow = ''; }, 500);
  
  if (result.success) {
    showAutoApplyToast(`✅ ${result.message}`, 'success');
    console.log(`✅ [AutoApply] ${result.message}`);
  } else {
    console.warn('❌ [AutoApply] Failed:', result.message);
    showAutoApplyToast(`❌ ${result.message}`, 'error');
  }
}

function getMonacoEditorForApply(): any {
  const monaco = (window as any).monaco;
  if (!monaco?.editor) return null;
  const editors = monaco.editor.getEditors();
  return editors?.find((e: any) => e.hasTextFocus()) || editors?.[0] || null;
}

function extractCodeFromBlockForApply(block: HTMLElement): { code: string; language: string } | null {
  // Method 1: Check for data textarea (cbe-wrapper style) - BEST SOURCE
  const textarea = block.querySelector('.cbe-data') as HTMLTextAreaElement;
  if (textarea?.value) {
    const lang = block.getAttribute('data-lang') || 'plaintext';
    console.log(`📝 [ExtractCode] Got code from textarea (${textarea.value.split('\n').length} lines)`);
    return { code: textarea.value, language: lang };
  }
  
  // Method 2: Find the actual code element (not language labels, buttons, etc.)
  // Be specific: only look for actual code containers
  let codeEl: Element | null = null;
  
  // Priority 1: <code> element inside block
  codeEl = block.querySelector('code:not(.muf-lang-name):not(.cbe-lang)');
  
  // Priority 2: Specific code classes
  if (!codeEl) {
    codeEl = block.querySelector('.muf-code, .cbe-code, .hljs');
  }
  
  // Priority 3: If block IS a pre element, use it (but not the wrapper)
  if (!codeEl && block.tagName === 'PRE') {
    // Check if there's a code inside first
    codeEl = block.querySelector('code') || block;
  }
  
  // Priority 4: Find pre inside block
  if (!codeEl) {
    const pre = block.querySelector('pre');
    if (pre) {
      codeEl = pre.querySelector('code') || pre;
    }
  }
  
  if (!codeEl) return null;
  
  let code = '';
  
  // Try to get from data attribute first (preserves formatting)
  const rawCode = block.getAttribute('data-raw-code');
  if (rawCode) {
    try { 
      code = decodeURIComponent(rawCode); 
      console.log(`📝 [ExtractCode] Got code from data-raw-code (${code.split('\n').length} lines)`);
    } catch { 
      code = ''; 
    }
  }
  
  // ⭐ FIX: If no raw code, try multiple methods to preserve newlines
  if (!code) {
    // ⭐ IMPORTANT: Make sure we're extracting from the CODE element, not the wrapper
    const actualCodeEl = codeEl as HTMLElement;
    
    // Method A: Use innerText (preserves whitespace in pre elements)
    // innerText respects CSS styling and preserves line breaks
    const innerText = actualCodeEl.innerText;
    
    // Method B: Use innerHTML and convert
    const innerHTML = actualCodeEl.innerHTML;
    
    // Method C: Use textContent as fallback
    const textContent = actualCodeEl.textContent || '';
    
    // Choose the one with more newlines (better formatting preservation)
    const innerTextLines = innerText?.split('\n').length || 0;
    const textContentLines = textContent.split('\n').length;
    
    // Process innerHTML to extract text with newlines
    let processedHtml = innerHTML
      .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
      .replace(/<\/div>/gi, '\n')     // Convert </div> to newlines
      .replace(/<\/p>/gi, '\n')       // Convert </p> to newlines
      .replace(/<\/li>/gi, '\n')      // Convert </li> to newlines
      .replace(/<[^>]+>/g, '');       // Remove remaining HTML tags
    
    // Decode HTML entities
    const tempEl = document.createElement('textarea');
    tempEl.innerHTML = processedHtml;
    const htmlProcessedCode = tempEl.value;
    const htmlProcessedLines = htmlProcessedCode.split('\n').length;
    
    // Choose the best result
    if (innerTextLines >= htmlProcessedLines && innerTextLines >= textContentLines) {
      code = innerText;
      console.log(`📝 [ExtractCode] Using innerText (${innerTextLines} lines)`);
    } else if (htmlProcessedLines >= textContentLines) {
      code = htmlProcessedCode;
      console.log(`📝 [ExtractCode] Using processed innerHTML (${htmlProcessedLines} lines)`);
    } else {
      code = textContent;
      console.log(`📝 [ExtractCode] Using textContent (${textContentLines} lines)`);
    }
    
    // If code looks like it has HTML entities, try to decode them
    if (code.includes('&lt;') || code.includes('&gt;') || code.includes('&amp;')) {
      const temp = document.createElement('textarea');
      temp.innerHTML = code;
      code = temp.value;
    }
  }
  
  code = code.trim();
  if (!code) return null;
  
  // ⭐ FIX: Clean up common garbage characters at the start
  // Sometimes HTML extraction picks up stray characters from labels, class names, etc.
  // e.g., "s" from "css", "x" from "tsx", etc.
  const cleanupPatterns = [
    /^[a-z]\n/i,           // Single letter followed by newline (e.g., "s\n" from "css")
    /^[a-z]{1,3}\s*\n/i,   // 1-3 letters followed by whitespace/newline
    /^(css|tsx|jsx|ts|js|html|json|py|rs)\s*\n/i,  // Language label on its own line
    /^Copy\s*\n/i,         // "Copy" button text
    /^Copied!\s*\n/i,      // "Copied!" button text
  ];
  
  for (const pattern of cleanupPatterns) {
    if (pattern.test(code)) {
      const before = code.substring(0, 20).replace(/\n/g, '↵');
      code = code.replace(pattern, '');
      console.log(`🧹 [ExtractCode] Cleaned garbage prefix: "${before}" → "${code.substring(0, 20).replace(/\n/g, '↵')}"`);
      break;
    }
  }
  
  code = code.trim();
  if (!code) return null;
  
  // ⭐ DIAGNOSTIC: Log if we still have no newlines
  if (!code.includes('\n') && code.length > 100) {
    console.warn(`⚠️ [ExtractCode] Code has ${code.length} chars but NO newlines - formatting may be lost`);
    console.log(`⚠️ [ExtractCode] First 200 chars: ${code.substring(0, 200)}`);
  }
  
  // Detect language
  let language = block.getAttribute('data-lang') || 'plaintext';
  if (language === 'plaintext') {
    // Check code element class
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      language = langMatch[1];
    } else {
      // Check for lang display elements
      const langEl = block.querySelector('.muf-lang-name, .cbe-lang');
      if (langEl) language = langEl.textContent?.toLowerCase() || 'plaintext';
    }
  }
  
  // ⭐ Auto-detect language from code content if still plaintext
  if (language === 'plaintext') {
    if (code.includes('import React') || code.includes('export default') || code.includes('useState')) {
      language = 'typescript';
    } else if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<head>')) {
      language = 'html';
    } else if (code.match(/^\s*[.#]?\w+\s*\{/m) || code.includes('margin:') || code.includes('padding:')) {
      language = 'css';
    }
  }
  
  return { code, language };
}

export function applyCodeToEditor(code: string, mode: 'replace' | 'insert' | 'append'): { success: boolean; message: string } {
  return applyCodeInstant(code, mode);
}

function showAutoApplyToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const existing = document.querySelector('.aca-toast');
  if (existing) existing.remove();
  
  // Determine if this is an Auto Mode toggle message
  const isAutoModeOn = message.includes('Auto Mode ON') || message.includes('Autonomous Mode ON');
  const isAutoModeOff = message.includes('Auto Mode OFF') || message.includes('Autonomous Mode OFF');
  const isAutoMode = isAutoModeOn || isAutoModeOff;
  
  const toast = document.createElement('div');
  toast.className = `aca-toast ${type} ${isAutoMode ? 'aca-toast-auto-mode' : ''} ${isAutoModeOn ? 'auto-on' : ''} ${isAutoModeOff ? 'auto-off' : ''}`;
  
  // Choose icon based on message type
  let icon = '';
  if (isAutoModeOn) {
    icon = `<svg class="aca-toast-icon auto-icon spinning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>`;
  } else if (isAutoModeOff) {
    icon = `<svg class="aca-toast-icon pause-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="10" y1="15" x2="10" y2="9"/>
      <line x1="14" y1="15" x2="14" y2="9"/>
    </svg>`;
  } else if (type === 'success') {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
  } else if (type === 'error') {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
  } else {
    icon = `<svg class="aca-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`;
  }
  
  // Clean message (remove emojis for auto mode)
  let cleanMessage = message;
  if (isAutoMode) {
    cleanMessage = isAutoModeOn ? 'Auto Mode' : 'Auto Mode';
  }
  
  toast.innerHTML = `
    <div class="aca-toast-content">
      ${icon}
      <span class="aca-toast-text">${cleanMessage}</span>
      ${isAutoModeOn ? '<span class="aca-toast-badge">ON</span>' : ''}
      ${isAutoModeOff ? '<span class="aca-toast-badge off">OFF</span>' : ''}
    </div>
    ${isAutoMode ? '<div class="aca-toast-progress"></div>' : ''}
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
    if (isAutoMode) {
      toast.classList.add('animate-in');
    }
  });
  
  // Auto dismiss
  const duration = isAutoMode ? 2500 : 3000;
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('animate-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// AUTO MODE DIALOG - Professional UI
// ============================================================================

function showAutoModeDialog(isEnabled: boolean): void {
  // Remove existing dialog
  const existing = document.querySelector('.auto-mode-dialog-overlay');
  if (existing) existing.remove();
  
  // Inject dialog styles
  injectAutoModeDialogStyles();
  
  const overlay = document.createElement('div');
  overlay.className = 'auto-mode-dialog-overlay';
  
  const statusIcon = isEnabled 
    ? `<svg class="auto-dialog-icon ${isEnabled ? 'spinning' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>`
    : `<svg class="auto-dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="10" y1="15" x2="10" y2="9"/>
        <line x1="14" y1="15" x2="14" y2="9"/>
      </svg>`;
  
  const features = isEnabled ? `
    <div class="auto-dialog-features">
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Auto-apply code to editor</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Multi-file processing</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Smart code detection</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>AI Project auto-enabled</span>
      </div>
    </div>
  ` : `
    <div class="auto-dialog-features disabled">
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Auto-apply disabled</span>
      </div>
      <div class="auto-feature-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Manual code application</span>
      </div>
    </div>
  `;
  
  overlay.innerHTML = `
    <div class="auto-mode-dialog ${isEnabled ? 'enabled' : 'disabled'}">
      <button class="auto-dialog-close" onclick="this.closest('.auto-mode-dialog-overlay').remove()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="auto-dialog-header">
        <div class="auto-dialog-icon-wrapper ${isEnabled ? 'active' : ''}">
          ${statusIcon}
        </div>
        <div class="auto-dialog-title-section">
          <h3 class="auto-dialog-title">Auto Mode</h3>
          <div class="auto-dialog-status">
            <span class="auto-status-indicator ${isEnabled ? 'on' : 'off'}"></span>
            <span class="auto-status-text">${isEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </div>
        </div>
      </div>
      
      <div class="auto-dialog-body">
        <p class="auto-dialog-description">
          ${isEnabled 
            ? 'AI code will be auto-applied. Press Ctrl+Z to undo.' 
            : 'Auto mode off. Apply code manually.'}
        </p>
        ${features}
      </div>
      
      <div class="auto-dialog-footer">
        <button class="auto-dialog-btn auto-dialog-btn-primary" onclick="this.closest('.auto-mode-dialog-overlay').remove()">
          OK
        </button>
        <button class="auto-dialog-btn auto-dialog-btn-secondary" onclick="this.closest('.auto-mode-dialog-overlay').remove(); if(window.toggleAutoApply) window.toggleAutoApply();">
          ${isEnabled ? 'Turn Off' : 'Turn On'}
        </button>
      </div>
      
      <div class="auto-dialog-progress ${isEnabled ? 'active' : ''}"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
  
  // Auto close after 4 seconds
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  }, 4000);
}

function injectAutoModeDialogStyles(): void {
  if (document.getElementById('auto-mode-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'auto-mode-dialog-styles';
  style.textContent = `
    /* ============================================
       AUTO MODE DIALOG - Standalone Floating UI
       ============================================ */
    .auto-mode-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10003;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .auto-mode-dialog-overlay.show {
      opacity: 1;
    }
    
    .auto-mode-dialog {
      pointer-events: auto;
      background: linear-gradient(135deg, #1e2128 0%, #171a1f 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      width: 280px;
      max-width: 90vw;
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .auto-mode-dialog-overlay.show .auto-mode-dialog {
      transform: scale(1) translateY(0);
    }
    
    .auto-mode-dialog.enabled {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    }
    
    .auto-mode-dialog.disabled {
      border-color: rgba(107, 114, 128, 0.3);
    }
    
    .auto-dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px 12px;
    }
    
    .auto-dialog-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(107, 114, 128, 0.15);
      border: 1px solid rgba(107, 114, 128, 0.2);
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    
    .auto-dialog-icon-wrapper.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }
    
    .auto-dialog-icon {
      width: 28px;
      height: 28px;
      transition: all 0.3s ease;
    }
    
    .auto-dialog-icon-wrapper.active .auto-dialog-icon {
      color: #10b981;
    }
    
    .auto-dialog-icon-wrapper:not(.active) .auto-dialog-icon {
      color: #6b7280;
    }
    
    .auto-dialog-icon.spinning {
      animation: auto-dialog-icon-spin 3s linear infinite;
    }
    
    @keyframes auto-dialog-icon-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .auto-dialog-title-section {
      flex: 1;
      min-width: 0;
    }
    
    .auto-dialog-title {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #e6edf3;
    }
    
    .auto-dialog-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .auto-status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
    
    .auto-status-indicator.on {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
      animation: auto-status-blink 2s ease-in-out infinite;
    }
    
    .auto-status-indicator.off {
      background: #6b7280;
    }
    
    @keyframes auto-status-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .auto-status-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #9ca3af;
    }
    
    .auto-mode-dialog.enabled .auto-status-text {
      color: #10b981;
    }
    
    .auto-dialog-body {
      padding: 0 16px 14px;
    }
    
    .auto-dialog-description {
      margin: 0 0 12px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #8b949e;
    }
    
    .auto-dialog-features {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .auto-feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #c9d1d9;
    }
    
    .auto-feature-item svg {
      width: 12px;
      height: 12px;
      color: #10b981;
      flex-shrink: 0;
    }
    
    .auto-dialog-features.disabled .auto-feature-item svg {
      color: #6b7280;
    }
    
    .auto-dialog-features.disabled .auto-feature-item {
      color: #6b7280;
    }
    
    .auto-dialog-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .auto-dialog-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }
    
    .auto-dialog-btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
    }
    
    .auto-dialog-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
    }
    
    .auto-mode-dialog.disabled .auto-dialog-btn-primary {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      box-shadow: 0 2px 6px rgba(107, 114, 128, 0.3);
    }
    
    .auto-mode-dialog.disabled .auto-dialog-btn-primary:hover {
      box-shadow: 0 4px 10px rgba(107, 114, 128, 0.4);
    }
    
    .auto-dialog-btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .auto-dialog-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
    
    .auto-dialog-progress {
      height: 2px;
      background: transparent;
    }
    
    .auto-dialog-progress.active {
      background: linear-gradient(90deg, #10b981, #059669);
      animation: auto-dialog-progress 4s linear forwards;
    }
    
    @keyframes auto-dialog-progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    /* Close button */
    .auto-dialog-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    
    .auto-dialog-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e6edf3;
    }
  `;
  document.head.appendChild(style);
}

function addApplyButtonToBlock(block: HTMLElement): void {
  if (block.querySelector('.aca-btn')) return;
  
  const codeInfo = extractCodeFromBlockForApply(block);
  if (!codeInfo) return;
  
  const btnsContainer = block.querySelector('.cbe-btns, .muf-header-actions');
  if (!btnsContainer) return;
  
  const applyBtn = document.createElement('button');
  applyBtn.className = 'aca-btn cbe-btn';
  applyBtn.innerHTML = AUTO_APPLY_ICONS.apply;
  applyBtn.title = 'Apply to Editor';
  applyBtn.setAttribute('data-act', 'apply');
  
  // REMOVED: Auto-toggle button from code block header
  // The autonomous toggle is now only in the main toolbar (near send button)
  
  applyBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const result = applyCodeToEditor(codeInfo.code, 'replace');
    if (result.success) {
      applyBtn.innerHTML = AUTO_APPLY_ICONS.check;
      applyBtn.classList.add('success');
      showAutoApplyToast(`✓ ${result.message}`, 'success');
      setTimeout(() => {
        applyBtn.innerHTML = AUTO_APPLY_ICONS.apply;
        applyBtn.classList.remove('success');
      }, 2000);
    } else {
      applyBtn.classList.add('error');
      showAutoApplyToast(`✗ ${result.message}`, 'error');
      setTimeout(() => applyBtn.classList.remove('error'), 2000);
    }
  };
  
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative; display: inline-flex;';
  wrapper.appendChild(applyBtn);
  btnsContainer.insertBefore(wrapper, btnsContainer.firstChild);
}

function processAutoApplyCodeBlocks(): void {
  const blocks = document.querySelectorAll('.cbe-wrapper, .muf-block');
  blocks.forEach(block => { if (!block.querySelector('.aca-btn')) addApplyButtonToBlock(block as HTMLElement); });
}


// ============================================================================
// EXPORTS
// ============================================================================

export {
  // File detection
  extractTargetFileName,
  detectFileNameFromCode,
  isTechnologyNameNotFile,
  isTerminalCommand,
  checkAIMessageForDifferentFile,
  validateFileMatch,
  
  // AI Project Search
  isAIProjectSearchEnabled,
  findFileInProject,
  normalizeFileNameCase,
  
  // New file creation
  detectNewFileIntent,
  createNewFile,
  extractTargetPath,
  openFileAndWait,
  waitForFileInEditor,
  
  // Multi-file apply
  processMultiFileApply,
  extractAllFilesWithBlocks,
  shouldUseMultiFileSystem,
  
  // Status dialog
  showStatusDialog,
  updateStatusText,
  updateProgress,
  addStatusLog,
  clearStatusLog,
  updateFileList,
  showCompletionState,
  closeStatusDialog,
  
  // Code block processing
  markBlockAsApplied,
  markBlockAsRejected,
  markBlockAsChecked,
  autoOpenAndApply,
  doApplyCodeWithoutConfirmation,
  showPerFileConfirmation,
  
  // File mismatch
  showFileMismatchWarning,
  injectFileMismatchStyles,
  
  // Smart code selection
  scoreCodeBlock,
  selectBestCodeBlock,
  isExplanationRequest,
  isSnippetOrExample,
  
  // Auto-apply main
  autoApplyNewCodeBlock,
  getUnprocessedCodeBlocks,
  
  // Dialog
  addApplyButtonToBlock,
  processAutoApplyCodeBlocks,
};

console.log('✅ autonomousMultiFile.ts loaded (split module)');
