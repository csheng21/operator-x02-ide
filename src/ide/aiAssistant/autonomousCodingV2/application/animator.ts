// animator.ts - RequestAnimationFrame-based Code Animation System
// ============================================================================
// Smooth, non-blocking code application using browser's animation API
// Features:
// - 60fps smooth animation
// - Adaptive batch sizing based on content size
// - Cancellation support
// - Progress callbacks
// - Monaco editor integration
// ============================================================================

import { DiffResult, DiffEntry, LineChange, getLineChanges } from '../diff/myersDiff';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Animation configuration options
 */
export interface AnimationConfig {
  /** Speed preset: 'instant' | 'fast' | 'normal' | 'slow' | 'typewriter' */
  speed: AnimationSpeed;
  /** Enable visual highlighting of changes */
  highlightChanges: boolean;
  /** Callback for progress updates (0-100) */
  onProgress?: (progress: number, currentLine: number, totalLines: number) => void;
  /** Callback when animation completes */
  onComplete?: (success: boolean, stats: AnimationStats) => void;
  /** Callback when animation is cancelled */
  onCancel?: () => void;
  /** Show line-by-line typing effect vs batch application */
  typewriterMode: boolean;
  /** Scroll editor to follow changes */
  autoScroll: boolean;
}

export type AnimationSpeed = 'instant' | 'fast' | 'normal' | 'slow' | 'typewriter';

/**
 * Animation statistics
 */
export interface AnimationStats {
  totalLines: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  durationMs: number;
  framesRendered: number;
}

/**
 * Internal animation state
 */
interface AnimationState {
  // Content
  lines: string[];
  currentIndex: number;
  totalLines: number;
  
  // Timing
  batchSize: number;
  frameDelay: number;
  startTime: number;
  framesRendered: number;
  
  // Editor
  editor: any; // Monaco editor instance
  model: any;  // Monaco text model
  
  // Diff info
  diffResult: DiffResult | null;
  lineChanges: LineChange[];
  
  // Control
  isCancelled: boolean;
  isPaused: boolean;
  
  // Callbacks
  config: AnimationConfig;
  resolve: (stats: AnimationStats) => void;
  reject: (error: Error) => void;
}

/**
 * Decoration tracking for highlighting
 */
interface DecorationState {
  addedDecorations: string[];
  deletedDecorations: string[];
  modifiedDecorations: string[];
}

// ============================================================================
// SPEED PRESETS
// ============================================================================

const SPEED_CONFIG: Record<AnimationSpeed, { batchSize: number; frameDelay: number }> = {
  instant: { batchSize: 10000, frameDelay: 0 },      // Apply all at once
  fast: { batchSize: 50, frameDelay: 0 },            // 50 lines per frame, ~60fps
  normal: { batchSize: 20, frameDelay: 16 },         // 20 lines per frame, smooth
  slow: { batchSize: 5, frameDelay: 33 },            // 5 lines per frame, visible
  typewriter: { batchSize: 1, frameDelay: 50 }       // 1 line per frame, typing effect
};

// ============================================================================
// MAIN ANIMATOR CLASS
// ============================================================================

/**
 * Code Animator - Handles smooth code application to Monaco editor
 */
export class CodeAnimator {
  private state: AnimationState | null = null;
  private decorations: DecorationState = {
    addedDecorations: [],
    deletedDecorations: [],
    modifiedDecorations: []
  };
  private animationFrameId: number | null = null;
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Apply new code to editor with animation
   * 
   * @param editor - Monaco editor instance
   * @param newCode - New code content (string or lines array)
   * @param diffResult - Optional pre-computed diff result
   * @param config - Animation configuration
   * @returns Promise that resolves when animation completes
   */
  async applyWithAnimation(
    editor: any,
    newCode: string | string[],
    diffResult?: DiffResult,
    config: Partial<AnimationConfig> = {}
  ): Promise<AnimationStats> {
    // Cancel any existing animation
    this.cancel();
    
    // Get Monaco instance
    const monaco = (window as any).monaco;
    if (!monaco || !editor) {
      throw new Error('Monaco editor not available');
    }
    
    const model = editor.getModel();
    if (!model) {
      throw new Error('Editor model not available');
    }
    
    // Normalize new code to lines array
    const newLines = Array.isArray(newCode) ? newCode : newCode.split('\n');
    
    // Merge config with defaults
    const fullConfig: AnimationConfig = {
      speed: 'normal',
      highlightChanges: true,
      typewriterMode: false,
      autoScroll: true,
      ...config
    };
    
    // Get speed settings
    const speedSettings = SPEED_CONFIG[fullConfig.speed];
    
    // Compute diff if not provided
    const oldCode = model.getValue();
    const oldLines = oldCode.split('\n');
    
    if (!diffResult) {
      const { computeDiff } = await import('../diff/myersDiff');
      diffResult = computeDiff(oldLines, newLines);
    }
    
    // Get line changes for highlighting
    const lineChanges = getLineChanges(diffResult);
    
    // Create animation state
    return new Promise((resolve, reject) => {
      this.state = {
        lines: newLines,
        currentIndex: 0,
        totalLines: newLines.length,
        batchSize: this.calculateAdaptiveBatchSize(newLines.length, speedSettings.batchSize),
        frameDelay: speedSettings.frameDelay,
        startTime: performance.now(),
        framesRendered: 0,
        editor,
        model,
        diffResult,
        lineChanges,
        isCancelled: false,
        isPaused: false,
        config: fullConfig,
        resolve: (stats) => {
          this.cleanup();
          resolve(stats);
        },
        reject: (error) => {
          this.cleanup();
          reject(error);
        }
      };
      
      // Clear existing decorations
      this.clearDecorations(editor);
      
      // Start animation
      if (fullConfig.speed === 'instant') {
        // Apply instantly without animation
        this.applyInstant();
      } else {
        // Start animated application
        this.scheduleFrame();
      }
    });
  }
  
  /**
   * Cancel current animation
   */
  cancel(): void {
    if (this.state) {
      this.state.isCancelled = true;
      if (this.state.config.onCancel) {
        this.state.config.onCancel();
      }
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.state = null;
  }
  
  /**
   * Pause animation
   */
  pause(): void {
    if (this.state) {
      this.state.isPaused = true;
    }
  }
  
  /**
   * Resume paused animation
   */
  resume(): void {
    if (this.state && this.state.isPaused) {
      this.state.isPaused = false;
      this.scheduleFrame();
    }
  }
  
  /**
   * Check if animation is in progress
   */
  isAnimating(): boolean {
    return this.state !== null && !this.state.isCancelled && !this.state.isPaused;
  }
  
  /**
   * Get current progress (0-100)
   */
  getProgress(): number {
    if (!this.state) return 0;
    return Math.round((this.state.currentIndex / this.state.totalLines) * 100);
  }
  
  /**
   * Clear all highlighting decorations
   */
  clearDecorations(editor?: any): void {
    const ed = editor || this.state?.editor;
    if (!ed) return;
    
    const allDecorations = [
      ...this.decorations.addedDecorations,
      ...this.decorations.deletedDecorations,
      ...this.decorations.modifiedDecorations
    ];
    
    if (allDecorations.length > 0) {
      ed.deltaDecorations(allDecorations, []);
    }
    
    this.decorations = {
      addedDecorations: [],
      deletedDecorations: [],
      modifiedDecorations: []
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Calculate adaptive batch size based on total lines
   */
  private calculateAdaptiveBatchSize(totalLines: number, baseBatchSize: number): number {
    // For very small files, use smaller batches for better visual effect
    if (totalLines < 20) return Math.max(1, Math.floor(baseBatchSize / 10));
    if (totalLines < 50) return Math.max(2, Math.floor(baseBatchSize / 5));
    if (totalLines < 100) return Math.max(5, Math.floor(baseBatchSize / 2));
    if (totalLines < 500) return baseBatchSize;
    // For large files, increase batch size for performance
    if (totalLines < 1000) return baseBatchSize * 2;
    return baseBatchSize * 4;
  }
  
  /**
   * Schedule next animation frame
   */
  private scheduleFrame(): void {
    if (!this.state || this.state.isCancelled || this.state.isPaused) return;
    
    if (this.state.frameDelay > 0) {
      // Use setTimeout for controlled delay, then RAF for smooth rendering
      setTimeout(() => {
        this.animationFrameId = requestAnimationFrame(() => this.animationFrame());
      }, this.state.frameDelay);
    } else {
      // No delay - use RAF directly for maximum performance
      this.animationFrameId = requestAnimationFrame(() => this.animationFrame());
    }
  }
  
  /**
   * Single animation frame - apply batch of lines
   */
  private animationFrame(): void {
    if (!this.state || this.state.isCancelled || this.state.isPaused) return;
    
    const { lines, currentIndex, batchSize, totalLines, editor, model, config } = this.state;
    
    // Calculate end index for this batch
    const endIndex = Math.min(currentIndex + batchSize, totalLines);
    
    // Build content up to current position
    const content = lines.slice(0, endIndex).join('\n');
    
    // Apply to editor using executeEdits for undo support
    const monaco = (window as any).monaco;
    const fullRange = model.getFullModelRange();
    
    editor.executeEdits('autonomous-apply', [{
      range: fullRange,
      text: content,
      forceMoveMarkers: true
    }]);
    
    // Update decorations for changed lines
    if (config.highlightChanges) {
      this.updateDecorations(endIndex);
    }
    
    // Auto-scroll to current position
    if (config.autoScroll && endIndex > 0) {
      editor.revealLineInCenter(Math.min(endIndex, model.getLineCount()));
    }
    
    // Update state
    this.state.currentIndex = endIndex;
    this.state.framesRendered++;
    
    // Report progress
    const progress = Math.round((endIndex / totalLines) * 100);
    if (config.onProgress) {
      config.onProgress(progress, endIndex, totalLines);
    }
    
    // Check if complete
    if (endIndex >= totalLines) {
      this.complete();
    } else {
      // Schedule next frame
      this.scheduleFrame();
    }
  }
  
  /**
   * Apply code instantly (no animation)
   */
  private applyInstant(): void {
    if (!this.state) return;
    
    const { lines, editor, model, config, diffResult } = this.state;
    const content = lines.join('\n');
    
    // Apply all at once
    const monaco = (window as any).monaco;
    const fullRange = model.getFullModelRange();
    
    editor.executeEdits('autonomous-apply', [{
      range: fullRange,
      text: content,
      forceMoveMarkers: true
    }]);
    
    // Apply all decorations at once
    if (config.highlightChanges) {
      this.applyAllDecorations();
    }
    
    // Complete
    this.state.currentIndex = this.state.totalLines;
    this.state.framesRendered = 1;
    this.complete();
  }
  
  /**
   * Update decorations for current progress
   */
  private updateDecorations(upToLine: number): void {
    if (!this.state) return;
    
    const { editor, lineChanges, config } = this.state;
    const monaco = (window as any).monaco;
    if (!monaco) return;
    
    // Get changes up to current line
    const relevantChanges = lineChanges.filter(c => c.lineNumber <= upToLine);
    
    // Build decoration arrays
    const addedDecs: any[] = [];
    const modifiedDecs: any[] = [];
    
    for (const change of relevantChanges) {
      if (change.type === 'added') {
        addedDecs.push({
          range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'aca-line-added',
            glyphMarginClassName: 'aca-glyph-added',
            overviewRuler: {
              color: '#4caf50',
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        });
      } else if (change.type === 'modified') {
        modifiedDecs.push({
          range: new monaco.Range(change.lineNumber, 1, change.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'aca-line-modified',
            glyphMarginClassName: 'aca-glyph-modified',
            overviewRuler: {
              color: '#ffc107',
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        });
      }
    }
    
    // Apply decorations (replacing previous)
    this.decorations.addedDecorations = editor.deltaDecorations(
      this.decorations.addedDecorations,
      addedDecs
    );
    this.decorations.modifiedDecorations = editor.deltaDecorations(
      this.decorations.modifiedDecorations,
      modifiedDecs
    );
  }
  
  /**
   * Apply all decorations at once (for instant mode)
   */
  private applyAllDecorations(): void {
    if (!this.state) return;
    this.updateDecorations(this.state.totalLines);
  }
  
  /**
   * Complete animation successfully
   */
  private complete(): void {
    if (!this.state) return;
    
    const { diffResult, startTime, framesRendered, config } = this.state;
    
    const stats: AnimationStats = {
      totalLines: this.state.totalLines,
      linesAdded: diffResult?.stats.additions || 0,
      linesDeleted: diffResult?.stats.deletions || 0,
      linesModified: diffResult?.stats.modifications || 0,
      durationMs: performance.now() - startTime,
      framesRendered
    };
    
    console.log(`✅ [Animator] Complete:`, stats);
    
    if (config.onComplete) {
      config.onComplete(true, stats);
    }
    
    this.state.resolve(stats);
  }
  
  /**
   * Cleanup after animation
   */
  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let animatorInstance: CodeAnimator | null = null;

/**
 * Get the singleton animator instance
 */
export function getAnimator(): CodeAnimator {
  if (!animatorInstance) {
    animatorInstance = new CodeAnimator();
  }
  return animatorInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Apply code with animation (convenience function)
 */
export async function applyCodeAnimated(
  editor: any,
  newCode: string | string[],
  speed: AnimationSpeed = 'normal',
  onProgress?: (progress: number) => void
): Promise<AnimationStats> {
  return getAnimator().applyWithAnimation(editor, newCode, undefined, {
    speed,
    highlightChanges: true,
    autoScroll: true,
    onProgress: onProgress ? (p) => onProgress(p) : undefined
  });
}

/**
 * Apply code instantly without animation
 */
export async function applyCodeInstant(
  editor: any,
  newCode: string | string[]
): Promise<AnimationStats> {
  return getAnimator().applyWithAnimation(editor, newCode, undefined, {
    speed: 'instant',
    highlightChanges: true,
    autoScroll: false
  });
}

/**
 * Cancel any running animation
 */
export function cancelAnimation(): void {
  getAnimator().cancel();
}

/**
 * Check if animation is in progress
 */
export function isAnimating(): boolean {
  return getAnimator().isAnimating();
}

/**
 * Clear all highlighting decorations
 */
export function clearHighlights(editor?: any): void {
  getAnimator().clearDecorations(editor);
}

// ============================================================================
// STYLE INJECTION
// ============================================================================

/**
 * Inject required CSS styles for highlighting
 */
export function injectAnimatorStyles(): void {
  if (document.getElementById('animator-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'animator-styles';
  style.textContent = `
    /* Added lines - green */
    .monaco-editor .aca-line-added {
      background: rgba(76, 175, 80, 0.15) !important;
    }
    .monaco-editor .aca-glyph-added {
      background: #4caf50 !important;
      width: 4px !important;
      margin-left: 3px;
      border-radius: 2px;
    }
    
    /* Modified lines - yellow/amber */
    .monaco-editor .aca-line-modified {
      background: rgba(255, 193, 7, 0.15) !important;
    }
    .monaco-editor .aca-glyph-modified {
      background: #ffc107 !important;
      width: 4px !important;
      margin-left: 3px;
      border-radius: 2px;
    }
    
    /* Deleted lines marker - red */
    .monaco-editor .aca-line-deleted {
      background: rgba(244, 67, 54, 0.15) !important;
    }
    .monaco-editor .aca-glyph-deleted {
      background: #f44336 !important;
      width: 4px !important;
      margin-left: 3px;
      border-radius: 2px;
    }
    
    /* Animation for newly applied lines */
    @keyframes aca-line-flash {
      0% { background: rgba(76, 175, 80, 0.4); }
      100% { background: rgba(76, 175, 80, 0.15); }
    }
    
    .monaco-editor .aca-line-new {
      animation: aca-line-flash 0.5s ease-out;
    }
    
    /* Progress indicator overlay */
    .aca-progress-overlay {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(30, 30, 30, 0.9);
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    
    .aca-progress-bar {
      width: 100px;
      height: 4px;
      background: #2d2d2d;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .aca-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      transition: width 0.1s ease-out;
    }
    
    .aca-progress-text {
      min-width: 40px;
      text-align: right;
      font-family: 'SF Mono', 'Consolas', monospace;
    }
  `;
  document.head.appendChild(style);
}

// Auto-inject styles
if (typeof document !== 'undefined') {
  injectAnimatorStyles();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CodeAnimator,
  getAnimator,
  applyCodeAnimated,
  applyCodeInstant,
  cancelAnimation,
  isAnimating,
  clearHighlights,
  injectAnimatorStyles
};

console.log('✅ animator.ts loaded - RAF-based smooth animation system');
