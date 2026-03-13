// aiFileExplorerHighlights.ts - Improved AI File Highlight System
// ============================================================================
// A modern, multi-state highlight system for AI Project Search
// ============================================================================

/**
 * Highlight States:
 * - scanning: Amber - AI is searching for files matching query
 * - reading: Blue - AI is actively reading file content  
 * - indexed: Green - File has been read and added to context
 * - error: Red - Failed to read file
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type HighlightState = 'scanning' | 'reading' | 'indexed' | 'error';

interface FileHighlightInfo {
  path: string;
  state: HighlightState;
  progress?: number;
  timestamp: number;
  element?: HTMLElement;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const HIGHLIGHT_CONFIG = {
  colors: {
    scanning: { 
      primary: '#f59e0b', 
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.3)'
    },
    reading: { 
      primary: '#3b82f6', 
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)'
    },
    indexed: { 
      primary: '#10b981', 
      bg: 'rgba(16, 185, 129, 0.06)',
      border: 'rgba(16, 185, 129, 0.2)'
    },
    error: { 
      primary: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.3)'
    },
  },
  icons: {
    scanning: '◌',  // Hollow circle - searching
    reading: '◐',   // Half-filled circle - in progress
    indexed: '●',   // Filled circle - complete
    error: '✕',     // X mark - failed
  },
  labels: {
    scanning: 'Scanning',
    reading: 'Reading',
    indexed: 'Indexed',
    error: 'Error',
  },
  timing: {
    animationDuration: '0.3s',
    animationEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    autoFadeDelay: 5000,     // Fade indexed files after 5s
    completionFlash: 600,    // Flash duration on completion
  }
} as const;

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const highlightedFiles = new Map<string, FileHighlightInfo>();
let stylesInjected = false;

// ============================================================================
// STYLE INJECTION
// ============================================================================

function injectHighlightStyles(): void {
  if (stylesInjected || document.getElementById('ai-unified-highlight-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ai-unified-highlight-styles';
  style.textContent = `
    /* ========================================================== */
    /* AI FILE HIGHLIGHT SYSTEM - v2.0                            */
    /* Multi-state visual feedback for AI file operations         */
    /* ========================================================== */
    
    /* Base highlight class */
    .ai-hl {
      position: relative;
      transition: all ${HIGHLIGHT_CONFIG.timing.animationDuration} ${HIGHLIGHT_CONFIG.timing.animationEasing};
      border-radius: 4px;
      margin: 1px 4px;
      padding-right: 28px !important;
    }
    
    /* Left accent border */
    .ai-hl::before {
      content: '';
      position: absolute;
      left: 0;
      top: 3px;
      bottom: 3px;
      width: 3px;
      border-radius: 2px;
      transition: background-color 0.3s ease, opacity 0.3s ease;
    }
    
    /* State indicator badge */
    .ai-hl-indicator {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      font-weight: 600;
      opacity: 0.8;
      transition: all 0.3s ease;
      z-index: 10;
    }
    
    /* Progress bar (for reading state) */
    .ai-hl-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      border-radius: 0 0 4px 4px;
      transition: width 0.15s ease-out;
      z-index: 10;
    }
    
    /* ---------------------------------------------------------- */
    /* STATE: SCANNING (Amber)                                    */
    /* ---------------------------------------------------------- */
    .ai-hl-scanning {
      background: ${HIGHLIGHT_CONFIG.colors.scanning.bg};
      padding-left: 12px !important;
    }
    
    .ai-hl-scanning::before {
      background: ${HIGHLIGHT_CONFIG.colors.scanning.primary};
      animation: hl-scan-pulse 1.2s ease-in-out infinite;
    }
    
    .ai-hl-scanning .ai-hl-indicator {
      color: ${HIGHLIGHT_CONFIG.colors.scanning.primary};
      animation: hl-scan-bounce 0.6s ease-in-out infinite;
    }
    
    @keyframes hl-scan-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    
    @keyframes hl-scan-bounce {
      0%, 100% { transform: translateY(-50%) scale(1); }
      50% { transform: translateY(-50%) scale(1.2); }
    }
    
    /* ---------------------------------------------------------- */
    /* STATE: READING (Blue)                                      */
    /* ---------------------------------------------------------- */
    .ai-hl-reading {
      background: ${HIGHLIGHT_CONFIG.colors.reading.bg};
      padding-left: 12px !important;
    }
    
    .ai-hl-reading::before {
      background: ${HIGHLIGHT_CONFIG.colors.reading.primary};
    }
    
    .ai-hl-reading .ai-hl-indicator {
      color: ${HIGHLIGHT_CONFIG.colors.reading.primary};
      animation: hl-read-spin 1s linear infinite;
    }
    
    .ai-hl-reading .ai-hl-progress {
      background: linear-gradient(90deg, 
        ${HIGHLIGHT_CONFIG.colors.reading.primary}, 
        #8b5cf6
      );
    }
    
    @keyframes hl-read-spin {
      from { transform: translateY(-50%) rotate(0deg); }
      to { transform: translateY(-50%) rotate(360deg); }
    }
    
    /* Shimmer effect for reading */
    .ai-hl-reading::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(59, 130, 246, 0.08) 20%,
        rgba(59, 130, 246, 0.15) 50%,
        rgba(59, 130, 246, 0.08) 80%,
        transparent 100%
      );
      animation: hl-shimmer 1.8s infinite;
      border-radius: 4px;
      pointer-events: none;
    }
    
    @keyframes hl-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    /* ---------------------------------------------------------- */
    /* STATE: INDEXED (Green)                                     */
    /* ---------------------------------------------------------- */
    .ai-hl-indexed {
      background: ${HIGHLIGHT_CONFIG.colors.indexed.bg};
      padding-left: 12px !important;
    }
    
    .ai-hl-indexed::before {
      background: ${HIGHLIGHT_CONFIG.colors.indexed.primary};
    }
    
    .ai-hl-indexed .ai-hl-indicator {
      color: ${HIGHLIGHT_CONFIG.colors.indexed.primary};
    }
    
    /* Completion flash animation */
    .ai-hl-just-completed {
      animation: hl-complete-flash ${HIGHLIGHT_CONFIG.timing.completionFlash}ms ease-out;
    }
    
    @keyframes hl-complete-flash {
      0% { 
        background: rgba(16, 185, 129, 0.25);
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
      }
      100% { 
        background: ${HIGHLIGHT_CONFIG.colors.indexed.bg};
        box-shadow: none;
      }
    }
    
    /* Fade out animation for indexed files */
    .ai-hl-fading {
      animation: hl-fade-out 0.5s ease-out forwards;
    }
    
    @keyframes hl-fade-out {
      from { 
        opacity: 1;
        background: ${HIGHLIGHT_CONFIG.colors.indexed.bg};
      }
      to { 
        opacity: 0;
        background: transparent;
      }
    }
    
    /* ---------------------------------------------------------- */
    /* STATE: ERROR (Red)                                         */
    /* ---------------------------------------------------------- */
    .ai-hl-error {
      background: ${HIGHLIGHT_CONFIG.colors.error.bg};
      padding-left: 12px !important;
    }
    
    .ai-hl-error::before {
      background: ${HIGHLIGHT_CONFIG.colors.error.primary};
    }
    
    .ai-hl-error .ai-hl-indicator {
      color: ${HIGHLIGHT_CONFIG.colors.error.primary};
    }
    
    /* ---------------------------------------------------------- */
    /* HOVER STATES                                               */
    /* ---------------------------------------------------------- */
    .ai-hl:hover {
      filter: brightness(1.05);
    }
    
    .ai-hl:hover .ai-hl-indicator {
      opacity: 1;
      transform: translateY(-50%) scale(1.1);
    }
    
    /* ---------------------------------------------------------- */
    /* FILE COUNT BADGE ON TOGGLE BUTTON                          */
    /* ---------------------------------------------------------- */
    .ai-file-count-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 16px;
      height: 16px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.3),
        0 0 0 2px rgba(30, 30, 30, 1);
      z-index: 100;
      pointer-events: none;
    }
    
    .ai-file-count-badge.reading {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    
    /* ---------------------------------------------------------- */
    /* ENHANCED TOGGLE BUTTON                                     */
    /* ---------------------------------------------------------- */
    #ai-search-tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #888;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      outline: none;
    }
    
    #ai-search-tool-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: #aaa;
    }
    
    #ai-search-tool-btn.active {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.25);
      color: #10b981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
    }
    
    #ai-search-tool-btn.active:hover {
      background: rgba(16, 185, 129, 0.18);
      border-color: rgba(16, 185, 129, 0.35);
    }
    
    #ai-search-tool-btn .btn-icon {
      display: flex;
      align-items: center;
      transition: transform 0.2s ease;
    }
    
    #ai-search-tool-btn.active .btn-icon {
      animation: btn-icon-pulse 2s ease-in-out infinite;
    }
    
    @keyframes btn-icon-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    
    /* ---------------------------------------------------------- */
    /* TOOLTIP STYLES                                             */
    /* ---------------------------------------------------------- */
    .ai-hl-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      color: #e0e0e0;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 1000;
    }
    
    .ai-hl:hover .ai-hl-tooltip {
      opacity: 1;
    }
  `;
  
  document.head.appendChild(style);
  stylesInjected = true;
  console.log('🎨 [AI Highlight] Styles injected');
}

// ============================================================================
// CORE HIGHLIGHT FUNCTIONS
// ============================================================================

/**
 * Check if AI Search is enabled
 */
function isAISearchEnabled(): boolean {
  return localStorage.getItem('aiFileExplorerEnabled') === 'true';
}

/**
 * Find file row element in file tree
 */
function findFileRow(fileName: string): HTMLElement | null {
  const fileTree = document.querySelector('.file-tree, #file-tree, .explorer-panel') as HTMLElement;
  if (!fileTree) return null;
  
  // Try exact match first
  const elements = fileTree.querySelectorAll('[data-path]');
  for (const el of elements) {
    const path = el.getAttribute('data-path') || '';
    if (path.endsWith(fileName) || path.endsWith('/' + fileName) || path.endsWith('\\' + fileName)) {
      return el as HTMLElement;
    }
  }
  
  // Try text content match
  for (const el of elements) {
    const text = el.textContent?.trim() || '';
    if (text === fileName) {
      return el as HTMLElement;
    }
  }
  
  return null;
}

/**
 * Set file highlight state - main API
 */
function setFileHighlightState(
  filePath: string,
  state: HighlightState,
  progress?: number
): void {
  // Always check if AI Search is enabled
  if (!isAISearchEnabled()) {
    console.log('🔒 [AI Highlight] AI Search disabled, skipping highlight');
    return;
  }
  
  injectHighlightStyles();
  
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const row = findFileRow(fileName);
  
  if (!row) {
    console.warn(`⚠️ [AI Highlight] Could not find element for: ${fileName}`);
    return;
  }
  
  // Get previous state for transition effects
  const prevInfo = highlightedFiles.get(filePath);
  const prevState = prevInfo?.state;
  
  // Update state tracking
  highlightedFiles.set(filePath, {
    path: filePath,
    state,
    progress,
    timestamp: Date.now(),
    element: row,
  });
  
  // Clear previous classes
  row.classList.remove(
    'ai-hl', 
    'ai-hl-scanning', 
    'ai-hl-reading', 
    'ai-hl-indexed', 
    'ai-hl-error',
    'ai-hl-just-completed',
    'ai-hl-fading'
  );
  
  // Remove existing indicator and progress elements
  row.querySelector('.ai-hl-indicator')?.remove();
  row.querySelector('.ai-hl-progress')?.remove();
  row.querySelector('.ai-hl-tooltip')?.remove();
  
  // Apply new state classes
  row.classList.add('ai-hl', `ai-hl-${state}`);
  
  // Add state indicator
  const indicator = document.createElement('span');
  indicator.className = 'ai-hl-indicator';
  indicator.textContent = HIGHLIGHT_CONFIG.icons[state];
  indicator.title = HIGHLIGHT_CONFIG.labels[state];
  row.appendChild(indicator);
  
  // Add tooltip
  const tooltip = document.createElement('span');
  tooltip.className = 'ai-hl-tooltip';
  tooltip.textContent = HIGHLIGHT_CONFIG.labels[state];
  row.appendChild(tooltip);
  
  // Add progress bar for reading state
  if (state === 'reading' && progress !== undefined) {
    const progressBar = document.createElement('div');
    progressBar.className = 'ai-hl-progress';
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    row.appendChild(progressBar);
  }
  
  // Flash animation when transitioning to indexed
  if (state === 'indexed' && prevState && prevState !== 'indexed') {
    row.classList.add('ai-hl-just-completed');
    setTimeout(() => {
      row.classList.remove('ai-hl-just-completed');
    }, HIGHLIGHT_CONFIG.timing.completionFlash);
  }
  
  // Scroll into view for reading state
  if (state === 'reading') {
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Auto-fade indexed files after delay
  if (state === 'indexed') {
    setTimeout(() => {
      // Check if still indexed (not changed to another state)
      const currentInfo = highlightedFiles.get(filePath);
      if (currentInfo?.state === 'indexed') {
        fadeOutHighlight(filePath);
      }
    }, HIGHLIGHT_CONFIG.timing.autoFadeDelay);
  }
  
  // Update toggle button badge
  updateToggleBadge();
  
  console.log(`🎯 [AI Highlight] ${fileName} → ${state}${progress !== undefined ? ` (${progress}%)` : ''}`);
}

/**
 * Update progress for a file being read
 */
function updateReadProgress(filePath: string, progress: number): void {
  const info = highlightedFiles.get(filePath);
  if (!info || info.state !== 'reading') return;
  
  const row = info.element;
  if (!row) return;
  
  let progressBar = row.querySelector('.ai-hl-progress') as HTMLElement;
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.className = 'ai-hl-progress';
    row.appendChild(progressBar);
  }
  
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  info.progress = progress;
}

/**
 * Fade out highlight with animation
 */
function fadeOutHighlight(filePath: string): void {
  const info = highlightedFiles.get(filePath);
  if (!info?.element) return;
  
  const row = info.element;
  row.classList.add('ai-hl-fading');
  
  setTimeout(() => {
    clearFileHighlight(filePath);
  }, 500);
}

/**
 * Clear highlight for a specific file
 */
function clearFileHighlight(filePath: string): void {
  const info = highlightedFiles.get(filePath);
  if (info?.element) {
    const row = info.element;
    row.classList.remove(
      'ai-hl',
      'ai-hl-scanning',
      'ai-hl-reading',
      'ai-hl-indexed',
      'ai-hl-error',
      'ai-hl-just-completed',
      'ai-hl-fading'
    );
    row.querySelector('.ai-hl-indicator')?.remove();
    row.querySelector('.ai-hl-progress')?.remove();
    row.querySelector('.ai-hl-tooltip')?.remove();
    row.style.paddingLeft = '';
    row.style.paddingRight = '';
  }
  
  highlightedFiles.delete(filePath);
  updateToggleBadge();
  
  console.log(`🧹 [AI Highlight] Cleared: ${filePath.split(/[/\\]/).pop()}`);
}

/**
 * Clear all highlights
 */
function clearAllHighlights(): void {
  // Clear via DOM (catches any orphaned highlights)
  document.querySelectorAll('.ai-hl').forEach(el => {
    el.classList.remove(
      'ai-hl',
      'ai-hl-scanning',
      'ai-hl-reading',
      'ai-hl-indexed',
      'ai-hl-error',
      'ai-hl-just-completed',
      'ai-hl-fading'
    );
    el.querySelector('.ai-hl-indicator')?.remove();
    el.querySelector('.ai-hl-progress')?.remove();
    el.querySelector('.ai-hl-tooltip')?.remove();
    (el as HTMLElement).style.paddingLeft = '';
    (el as HTMLElement).style.paddingRight = '';
  });
  
  highlightedFiles.clear();
  updateToggleBadge();
  
  console.log('🧹 [AI Highlight] All highlights cleared');
}

// ============================================================================
// TOGGLE BUTTON BADGE
// ============================================================================

/**
 * Update the file count badge on the toggle button
 */
function updateToggleBadge(): void {
  const btn = document.getElementById('ai-search-tool-btn');
  if (!btn) return;
  
  let badge = btn.querySelector('.ai-file-count-badge') as HTMLElement;
  const count = highlightedFiles.size;
  const hasReading = Array.from(highlightedFiles.values()).some(f => f.state === 'reading');
  
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ai-file-count-badge';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('reading', hasReading);
  } else if (badge) {
    badge.remove();
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Highlight file as scanning
 */
function highlightFileScanning(filePath: string): void {
  setFileHighlightState(filePath, 'scanning');
}

/**
 * Highlight file as reading (with optional progress)
 */
function highlightFileReading(filePath: string, progress: number = 0): void {
  setFileHighlightState(filePath, 'reading', progress);
}

/**
 * Mark file as indexed (complete)
 */
function highlightFileIndexed(filePath: string): void {
  setFileHighlightState(filePath, 'indexed');
}

/**
 * Mark file as error
 */
function highlightFileError(filePath: string): void {
  setFileHighlightState(filePath, 'error');
}

/**
 * Get all currently highlighted files
 */
function getHighlightedFiles(): Map<string, FileHighlightInfo> {
  return new Map(highlightedFiles);
}

/**
 * Get count by state
 */
function getHighlightCounts(): Record<HighlightState, number> {
  const counts: Record<HighlightState, number> = {
    scanning: 0,
    reading: 0,
    indexed: 0,
    error: 0,
  };
  
  highlightedFiles.forEach(info => {
    counts[info.state]++;
  });
  
  return counts;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the highlight system
 */
function initHighlightSystem(): void {
  injectHighlightStyles();
  
  // Clear highlights when AI Search is disabled
  window.addEventListener('storage', (e) => {
    if (e.key === 'aiFileExplorerEnabled' && e.newValue !== 'true') {
      clearAllHighlights();
    }
  });
  
  console.log('✅ [AI Highlight] System initialized');
}

// Auto-initialize
if (document.readyState === 'complete') {
  initHighlightSystem();
} else {
  window.addEventListener('load', initHighlightSystem);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Main API
  setFileHighlightState,
  updateReadProgress,
  clearFileHighlight,
  clearAllHighlights,
  
  // Convenience functions
  highlightFileScanning,
  highlightFileReading,
  highlightFileIndexed,
  highlightFileError,
  
  // Query functions
  getHighlightedFiles,
  getHighlightCounts,
  
  // Utilities
  findFileRow,
  isAISearchEnabled,
  
  // Configuration
  HIGHLIGHT_CONFIG,
  
  // Types
  HighlightState,
  FileHighlightInfo,
};

// Expose to window for debugging
(window as any).aiHighlight = {
  set: setFileHighlightState,
  clear: clearFileHighlight,
  clearAll: clearAllHighlights,
  scanning: highlightFileScanning,
  reading: highlightFileReading,
  indexed: highlightFileIndexed,
  error: highlightFileError,
  getAll: getHighlightedFiles,
  counts: getHighlightCounts,
  config: HIGHLIGHT_CONFIG,
};

console.log('🎨 [AI Highlight] Module loaded. Use window.aiHighlight for debugging.');
