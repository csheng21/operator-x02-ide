// index.ts - Autonomous Coding System v2.0
// ============================================================================
// Main entry point integrating all v2.0 improvements:
// - Myers Diff Algorithm (fast code comparison)
// - RAF Animation (smooth 60fps application)
// - State Machine (race condition prevention)
// ============================================================================

// Re-export all modules
export * from './diff/myersDiff';
export * from './application/animator';
export * from './stateMachine';
export * from './utils/cache';
export * from './utils/observer';

// Import for internal use
import { computeDiff, DiffResult, getLineChanges, LineChange, toUnifiedDiff } from './diff/myersDiff';
import { 
  CodeAnimator, 
  getAnimator, 
  applyCodeAnimated, 
  applyCodeInstant, 
  cancelAnimation,
  isAnimating,
  clearHighlights,
  AnimationConfig,
  AnimationSpeed,
  AnimationStats,
  injectAnimatorStyles
} from './application/animator';
import {
  AutonomousStateMachine,
  getStateMachine,
  getCurrentState,
  sendEvent,
  isReadyForBlocks,
  isSystemBusy,
  AutonomousState,
  AutonomousEvent,
  StateContext,
  TransitionResult
} from './stateMachine';

// ============================================================================
// UNIFIED AUTONOMOUS CODING ENGINE
// ============================================================================

/**
 * Configuration for the unified engine
 */
export interface AutonomousEngineConfig {
  // Animation settings
  animationSpeed: AnimationSpeed;
  highlightChanges: boolean;
  autoScroll: boolean;
  
  // State machine settings
  confirmationTimeout: number;
  autoSaveOnAccept: boolean;
  
  // Behavior settings
  autoApplyEnabled: boolean;
  aiProjectSearchEnabled: boolean;
  
  // Callbacks
  onStateChange?: (state: AutonomousState, context: StateContext) => void;
  onApplyProgress?: (progress: number, line: number, total: number) => void;
  onApplyComplete?: (stats: AnimationStats) => void;
  onError?: (error: string) => void;
}

/**
 * Code block information
 */
export interface CodeBlockInfo {
  id: string;
  code: string;
  language: string;
  targetFile: string | null;
  score: number;
  element: HTMLElement;
}

/**
 * Apply result
 */
export interface ApplyResult {
  success: boolean;
  stats?: AnimationStats;
  diffResult?: DiffResult;
  error?: string;
}

/**
 * Unified Autonomous Coding Engine v2.0
 * 
 * Integrates:
 * - Myers Diff for fast code comparison
 * - RAF Animation for smooth application
 * - State Machine for safe state management
 */
export class AutonomousCodingEngine {
  private config: AutonomousEngineConfig;
  private stateMachine: AutonomousStateMachine;
  private animator: CodeAnimator;
  private originalCode: string | null = null;
  private processedBlocks: Set<string> = new Set();
  
  constructor(config: Partial<AutonomousEngineConfig> = {}) {
    this.config = {
      animationSpeed: 'normal',
      highlightChanges: true,
      autoScroll: true,
      confirmationTimeout: 30000,
      autoSaveOnAccept: true,
      autoApplyEnabled: true,
      aiProjectSearchEnabled: true,
      ...config
    };
    
    // Initialize state machine
    this.stateMachine = getStateMachine();
    
    // Subscribe to state changes
    if (this.config.onStateChange) {
      this.stateMachine.subscribe(this.config.onStateChange);
    }
    
    // Initialize animator
    this.animator = getAnimator();
    
    // Inject styles
    injectAnimatorStyles();
    
    console.log('🚀 [AutonomousEngine v2.0] Initialized');
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Apply code to the current editor
   * 
   * @param newCode - Code to apply
   * @param editor - Monaco editor instance
   * @returns Promise with apply result
   */
  async applyCode(newCode: string, editor: any): Promise<ApplyResult> {
    // Check if we can apply
    if (!this.stateMachine.canTransition('APPLY_START')) {
      return {
        success: false,
        error: `Cannot apply in state: ${this.stateMachine.getState()}`
      };
    }
    
    try {
      // Store original code for rollback
      const model = editor.getModel();
      if (!model) {
        return { success: false, error: 'No editor model' };
      }
      
      this.originalCode = model.getValue();
      
      // Compute diff using Myers algorithm
      const diffResult = computeDiff(this.originalCode, newCode);
      
      // Check if code is identical
      if (diffResult.isIdentical) {
        console.log('📋 [Engine] Code is identical, skipping apply');
        return {
          success: false,
          error: 'Code is identical to current content',
          diffResult
        };
      }
      
      console.log(`📊 [Engine] Diff computed in ${diffResult.executionTimeMs.toFixed(2)}ms:`, diffResult.stats);
      
      // Transition to applying state
      this.stateMachine.transition({ type: 'APPLY_START' });
      
      // Apply with animation
      const stats = await this.animator.applyWithAnimation(
        editor,
        newCode,
        diffResult,
        {
          speed: this.config.animationSpeed,
          highlightChanges: this.config.highlightChanges,
          autoScroll: this.config.autoScroll,
          onProgress: this.config.onApplyProgress,
          onComplete: (success, s) => {
            if (success) {
              this.stateMachine.transition({ 
                type: 'APPLY_COMPLETE', 
                stats: {
                  linesAdded: s.linesAdded,
                  linesDeleted: s.linesDeleted,
                  linesModified: s.linesModified,
                  durationMs: s.durationMs
                }
              });
            }
          },
          onCancel: () => {
            this.stateMachine.transition({ type: 'APPLY_CANCELLED' });
          }
        }
      );
      
      if (this.config.onApplyComplete) {
        this.config.onApplyComplete(stats);
      }
      
      return {
        success: true,
        stats,
        diffResult
      };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.stateMachine.transition({ type: 'ERROR', message });
      
      if (this.config.onError) {
        this.config.onError(message);
      }
      
      return {
        success: false,
        error: message
      };
    }
  }
  
  /**
   * Accept current changes
   */
  accept(): TransitionResult {
    const result = this.stateMachine.transition({ type: 'USER_ACCEPT' });
    
    if (result.success && this.config.autoSaveOnAccept) {
      // Trigger save
      this.triggerSave();
    }
    
    // Clear highlights after a delay
    setTimeout(() => {
      this.animator.clearDecorations();
    }, 2000);
    
    return result;
  }
  
  /**
   * Reject current changes and rollback
   */
  reject(editor: any): TransitionResult {
    const result = this.stateMachine.transition({ type: 'USER_REJECT' });
    
    if (result.success && this.originalCode !== null) {
      // Rollback to original code
      const model = editor.getModel();
      if (model) {
        const monaco = (window as any).monaco;
        editor.executeEdits('autonomous-rollback', [{
          range: model.getFullModelRange(),
          text: this.originalCode,
          forceMoveMarkers: true
        }]);
      }
      
      this.originalCode = null;
      this.animator.clearDecorations(editor);
    }
    
    return result;
  }
  
  /**
   * Cancel current animation
   */
  cancel(): void {
    this.animator.cancel();
  }
  
  /**
   * Pause the engine
   */
  pause(): TransitionResult {
    return this.stateMachine.transition({ type: 'PAUSE' });
  }
  
  /**
   * Resume the engine
   */
  resume(): TransitionResult {
    return this.stateMachine.transition({ type: 'RESUME' });
  }
  
  /**
   * Reset the engine
   */
  reset(): TransitionResult {
    this.animator.cancel();
    this.animator.clearDecorations();
    this.originalCode = null;
    this.processedBlocks.clear();
    return this.stateMachine.reset();
  }
  
  /**
   * Enable auto-apply
   */
  enable(): TransitionResult {
    this.config.autoApplyEnabled = true;
    return this.stateMachine.enable();
  }
  
  /**
   * Disable auto-apply
   */
  disable(): TransitionResult {
    this.config.autoApplyEnabled = false;
    return this.stateMachine.disable();
  }
  
  // ============================================================================
  // STATE QUERIES
  // ============================================================================
  
  /**
   * Get current state
   */
  getState(): AutonomousState {
    return this.stateMachine.getState();
  }
  
  /**
   * Get full state context
   */
  getContext(): StateContext {
    return this.stateMachine.getContext();
  }
  
  /**
   * Check if engine is enabled
   */
  isEnabled(): boolean {
    return this.config.autoApplyEnabled && this.stateMachine.getContext().isEnabled;
  }
  
  /**
   * Check if engine is busy
   */
  isBusy(): boolean {
    return this.stateMachine.isBusy() || this.animator.isAnimating();
  }
  
  /**
   * Check if ready to accept new code blocks
   */
  isReady(): boolean {
    return this.isEnabled() && !this.isBusy() && this.stateMachine.isIn('idle');
  }
  
  /**
   * Check if block was already processed
   */
  isBlockProcessed(blockId: string): boolean {
    return this.processedBlocks.has(blockId);
  }
  
  /**
   * Mark block as processed
   */
  markBlockProcessed(blockId: string): void {
    this.processedBlocks.add(blockId);
    
    // Keep set bounded
    if (this.processedBlocks.size > 500) {
      const first = this.processedBlocks.values().next().value;
      this.processedBlocks.delete(first);
    }
  }
  
  /**
   * Clear processed blocks
   */
  clearProcessedBlocks(): void {
    this.processedBlocks.clear();
  }
  
  /**
   * Get animation progress (0-100)
   */
  getProgress(): number {
    return this.animator.getProgress();
  }
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutonomousEngineConfig>): void {
    Object.assign(this.config, config);
    console.log('⚙️ [Engine] Config updated:', this.config);
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AutonomousEngineConfig {
    return { ...this.config };
  }
  
  /**
   * Set animation speed
   */
  setSpeed(speed: AnimationSpeed): void {
    this.config.animationSpeed = speed;
  }
  
  // ============================================================================
  // DIFF UTILITIES
  // ============================================================================
  
  /**
   * Compute diff between two texts
   */
  computeDiff(oldText: string, newText: string): DiffResult {
    return computeDiff(oldText, newText);
  }
  
  /**
   * Get line-by-line changes
   */
  getLineChanges(diffResult: DiffResult): LineChange[] {
    return getLineChanges(diffResult);
  }
  
  /**
   * Generate unified diff string
   */
  toUnifiedDiff(diffResult: DiffResult): string {
    return toUnifiedDiff(diffResult);
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Trigger file save
   */
  private triggerSave(): void {
    // Method 1: Click save button
    const saveBtn = document.querySelector('[title*="Save"], [data-action="save"], .save-button') as HTMLElement;
    if (saveBtn) {
      saveBtn.click();
      this.stateMachine.transition({ type: 'SAVE_SUCCESS' });
      return;
    }
    
    // Method 2: Dispatch Ctrl+S
    const editor = document.querySelector('.monaco-editor');
    if (editor) {
      const event = new KeyboardEvent('keydown', {
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      editor.dispatchEvent(event);
      this.stateMachine.transition({ type: 'SAVE_SUCCESS' });
      return;
    }
    
    // Method 3: Global save function
    if ((window as any).saveCurrentFile) {
      (window as any).saveCurrentFile();
      this.stateMachine.transition({ type: 'SAVE_SUCCESS' });
      return;
    }
    
    console.warn('⚠️ [Engine] Could not trigger save');
    this.stateMachine.transition({ type: 'SAVE_FAILED', error: 'No save method available' });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let engineInstance: AutonomousCodingEngine | null = null;

/**
 * Get the singleton engine instance
 */
export function getEngine(): AutonomousCodingEngine {
  if (!engineInstance) {
    engineInstance = new AutonomousCodingEngine();
  }
  return engineInstance;
}

/**
 * Initialize engine with config
 */
export function initializeEngine(config: Partial<AutonomousEngineConfig> = {}): AutonomousCodingEngine {
  engineInstance = new AutonomousCodingEngine(config);
  return engineInstance;
}

/**
 * Reset engine instance
 */
export function resetEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
  }
  engineInstance = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick apply code
 */
export async function applyCode(newCode: string, editor: any): Promise<ApplyResult> {
  return getEngine().applyCode(newCode, editor);
}

/**
 * Accept changes
 */
export function acceptChanges(): TransitionResult {
  return getEngine().accept();
}

/**
 * Reject changes
 */
export function rejectChanges(editor: any): TransitionResult {
  return getEngine().reject(editor);
}

/**
 * Toggle auto-apply
 */
export function toggleAutoApply(): boolean {
  const engine = getEngine();
  if (engine.isEnabled()) {
    engine.disable();
    return false;
  } else {
    engine.enable();
    return true;
  }
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).autonomousEngine = {
    // Core
    get: getEngine,
    init: initializeEngine,
    reset: resetEngine,
    
    // Actions
    apply: applyCode,
    accept: acceptChanges,
    reject: rejectChanges,
    toggle: toggleAutoApply,
    cancel: () => getEngine().cancel(),
    pause: () => getEngine().pause(),
    resume: () => getEngine().resume(),
    
    // State
    getState: () => getEngine().getState(),
    getContext: () => getEngine().getContext(),
    isEnabled: () => getEngine().isEnabled(),
    isBusy: () => getEngine().isBusy(),
    isReady: () => getEngine().isReady(),
    getProgress: () => getEngine().getProgress(),
    
    // Config
    setSpeed: (speed: AnimationSpeed) => getEngine().setSpeed(speed),
    getConfig: () => getEngine().getConfig(),
    
    // Diff utilities
    computeDiff,
    getLineChanges,
    toUnifiedDiff
  };
  
  console.log('🎯 [AutonomousEngine v2.0] Available at window.autonomousEngine');
}

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = {
  major: 2,
  minor: 0,
  patch: 0,
  label: 'Autonomous Coding Engine v2.0',
  features: [
    'Myers Diff Algorithm - O((n+m)*d) complexity',
    'RAF Animation - 60fps smooth application',
    'State Machine - race condition prevention',
    'LRU Block Cache - memory optimization',
    'Unified API - simplified integration'
  ]
};

console.log(`✅ ${VERSION.label} loaded`);
console.log('   Features:', VERSION.features.join(', '));
