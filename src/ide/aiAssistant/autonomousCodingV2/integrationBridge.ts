// integrationBridge.ts - Bridge between v2.0 and existing autonomousCoding.ts
// ============================================================================
// This module provides backward compatibility with the existing system
// while enabling gradual migration to v2.0 improvements.
// 
// USAGE:
// 1. Import this file in your main.ts AFTER autonomousCoding.ts
// 2. The bridge will automatically enhance the existing system
// 3. Existing API remains unchanged - new features added transparently
// ============================================================================

import { 
  AutonomousCodingEngine,
  getEngine,
  initializeEngine,
  computeDiff,
  getLineChanges,
  AnimationSpeed,
  AnimationStats,
  DiffResult
} from './index';

import {
  getStateMachine,
  AutonomousState,
  sendEvent
} from './stateMachine';

import {
  getAnimator,
  applyCodeAnimated,
  cancelAnimation,
  clearHighlights,
  injectAnimatorStyles
} from './application/animator';

import {
  getProcessedBlockCache,
  ProcessedBlockCache
} from './utils/cache';

import {
  SmartCodeBlockObserver,
  getSmartObserver,
  initializeObserver as initializeSmartObserver
} from './utils/observer';

// ============================================================================
// LEGACY API COMPATIBILITY LAYER
// ============================================================================

/**
 * Bridge class that wraps v2.0 engine and exposes legacy API
 */
class AutonomousBridge {
  private engine: AutonomousCodingEngine;
  private blockCache: ProcessedBlockCache;
  private legacyCallbacks: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;
  
  constructor() {
    this.engine = getEngine();
    this.blockCache = getProcessedBlockCache();
  }
  
  /**
   * Initialize bridge - call this after existing autonomousCoding.ts loads
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    console.log('🌉 [Bridge] Initializing v2.0 integration bridge...');
    
    // Inject v2.0 styles
    injectAnimatorStyles();
    
    // Initialize smart observer
    initializeSmartObserver();
    
    // Hook into existing global functions
    this.hookLegacyFunctions();
    
    // Subscribe to state changes for legacy event emission
    getStateMachine().subscribe((state, context) => {
      this.emitLegacyEvent('stateChange', { state, context });
    });
    
    this.isInitialized = true;
    console.log('✅ [Bridge] v2.0 integration complete');
  }
  
  /**
   * Hook into existing window functions and enhance them
   */
  private hookLegacyFunctions(): void {
    const win = window as any;
    
    // Store original functions
    const originalApplyCodeToEditor = win.applyCodeToEditor;
    const originalApplySmartUpdate = win.applySmartUpdate;
    const originalToggleAutoApply = win.toggleAutoApply;
    const originalSetAutoApply = win.setAutoApply;
    const originalIsAutoApplyEnabled = win.isAutoApplyEnabled;
    const originalAcceptChanges = win.acceptAutoApplyChanges;
    const originalRejectChanges = win.rejectAutoApplyChanges;
    const originalStopTyping = win.stopAutoApplyTyping;
    
    // ========================================================================
    // ENHANCED: applyCodeToEditor - now uses Myers diff + RAF animation
    // ========================================================================
    win.applyCodeToEditor = async (code: string, mode: string = 'replace') => {
      const editor = this.getMonacoEditor();
      if (!editor) {
        console.warn('⚠️ [Bridge] No editor found');
        return { success: false, message: 'No editor found' };
      }
      
      try {
        // Use v2.0 engine for application
        const result = await this.engine.applyCode(code, editor);
        
        if (result.success) {
          return {
            success: true,
            message: `Applied: +${result.stats?.linesAdded || 0} -${result.stats?.linesDeleted || 0} ~${result.stats?.linesModified || 0}`,
            stats: result.stats
          };
        } else {
          // Fallback to original if v2.0 fails
          if (originalApplyCodeToEditor) {
            return originalApplyCodeToEditor(code, mode);
          }
          return { success: false, message: result.error || 'Apply failed' };
        }
      } catch (error) {
        console.error('❌ [Bridge] Apply error:', error);
        // Fallback to original
        if (originalApplyCodeToEditor) {
          return originalApplyCodeToEditor(code, mode);
        }
        return { success: false, message: 'Apply failed' };
      }
    };
    
    // ========================================================================
    // ENHANCED: applySmartUpdate - uses Myers diff for faster comparison
    // ========================================================================
    win.applySmartUpdate = async (newCode: string, options: any = {}) => {
      const editor = this.getMonacoEditor();
      if (!editor) {
        return { success: false, message: 'No editor' };
      }
      
      const model = editor.getModel();
      if (!model) {
        return { success: false, message: 'No model' };
      }
      
      const oldCode = model.getValue();
      
      // Use v2.0 Myers diff
      const diffResult = computeDiff(oldCode, newCode);
      
      if (diffResult.isIdentical) {
        return { success: false, message: 'Code is identical' };
      }
      
      console.log(`📊 [Bridge] Myers diff: +${diffResult.stats.additions} -${diffResult.stats.deletions} ~${diffResult.stats.modifications} (${diffResult.executionTimeMs.toFixed(2)}ms)`);
      
      // Apply using v2.0 animator
      const speed = options.speed || this.getSpeedFromLegacy();
      const result = await this.engine.applyCode(newCode, editor);
      
      return {
        success: result.success,
        message: result.success 
          ? `Updated: +${diffResult.stats.additions} -${diffResult.stats.deletions} ~${diffResult.stats.modifications}`
          : (result.error || 'Update failed'),
        diff: diffResult
      };
    };
    
    // ========================================================================
    // ENHANCED: toggleAutoApply - syncs with v2.0 state machine
    // ========================================================================
    win.toggleAutoApply = () => {
      const wasEnabled = this.engine.isEnabled();
      
      if (wasEnabled) {
        this.engine.disable();
      } else {
        this.engine.enable();
      }
      
      const isEnabled = this.engine.isEnabled();
      
      // Sync legacy state
      win.autoApplyEnabled = isEnabled;
      
      // Update legacy indicator
      this.updateLegacyIndicator(isEnabled);
      
      // Call original if exists (for UI updates)
      if (originalToggleAutoApply && typeof originalToggleAutoApply === 'function') {
        // Don't call original toggle, just sync state
        win.setAutoApplyState?.(isEnabled);
      }
      
      console.log(`🤖 [Bridge] Auto mode: ${isEnabled ? 'ON' : 'OFF'}`);
      return isEnabled;
    };
    
    // ========================================================================
    // ENHANCED: acceptAutoApplyChanges - uses v2.0 state machine
    // ========================================================================
    win.acceptAutoApplyChanges = () => {
      const result = this.engine.accept();
      
      if (result.success) {
        // Emit legacy event
        this.emitLegacyEvent('accept', {});
        
        // Clear v2.0 highlights after delay
        setTimeout(() => clearHighlights(), 2000);
      }
      
      // Call original for UI cleanup
      if (originalAcceptChanges) {
        originalAcceptChanges();
      }
      
      return result.success;
    };
    
    // ========================================================================
    // ENHANCED: rejectAutoApplyChanges - uses v2.0 rollback
    // ========================================================================
    win.rejectAutoApplyChanges = () => {
      const editor = this.getMonacoEditor();
      const result = this.engine.reject(editor);
      
      if (result.success) {
        this.emitLegacyEvent('reject', {});
      }
      
      // Call original for UI cleanup
      if (originalRejectChanges) {
        originalRejectChanges();
      }
      
      return result.success;
    };
    
    // ========================================================================
    // ENHANCED: stopAutoApplyTyping - uses v2.0 cancel
    // ========================================================================
    win.stopAutoApplyTyping = () => {
      cancelAnimation();
      this.engine.cancel();
      
      // Call original
      if (originalStopTyping) {
        originalStopTyping();
      }
      
      console.log('🛑 [Bridge] Animation cancelled');
    };
    
    // ========================================================================
    // NEW: v2.0 specific functions exposed to window
    // ========================================================================
    
    // Get v2.0 engine
    win.getAutonomousEngine = () => this.engine;
    
    // Get state machine
    win.getAutonomousStateMachine = () => getStateMachine();
    
    // Get current state
    win.getAutonomousState = () => ({
      // Legacy format
      autoApplyEnabled: this.engine.isEnabled(),
      isTypingInProgress: this.engine.isBusy(),
      isProcessingMultiFile: getStateMachine().isIn('multi-file'),
      processedBlockIds: this.blockCache.keys(),
      stopTypingFlag: false,
      // v2.0 additions
      v2State: getStateMachine().getState(),
      v2Context: getStateMachine().getContext()
    });
    
    // Compute diff (exposed utility)
    win.computeCodeDiff = (oldCode: string, newCode: string) => {
      return computeDiff(oldCode, newCode);
    };
    
    // Check if block was processed (using LRU cache)
    win.isBlockProcessed = (blockId: string) => {
      return this.blockCache.wasProcessed(blockId);
    };
    
    // Mark block as processed
    win.markBlockProcessed = (blockId: string, fileName: string | null, applied: boolean) => {
      this.blockCache.markProcessed(blockId, fileName, applied);
    };
    
    // Get cache stats
    win.getBlockCacheStats = () => {
      return this.blockCache.getStats();
    };
    
    // Set animation speed
    win.setAutoApplyTypingSpeed = (speed: string) => {
      const speedMap: Record<string, AnimationSpeed> = {
        'fast': 'fast',
        'normal': 'normal',
        'slow': 'slow',
        'instant': 'instant'
      };
      this.engine.setSpeed(speedMap[speed] || 'normal');
    };
    
    console.log('🔗 [Bridge] Legacy functions hooked');
  }
  
  /**
   * Get Monaco editor instance
   */
  private getMonacoEditor(): any {
    const monaco = (window as any).monaco;
    if (!monaco) return null;
    
    const editors = monaco.editor?.getEditors?.();
    return editors?.[0] || null;
  }
  
  /**
   * Get speed setting from legacy config
   */
  private getSpeedFromLegacy(): AnimationSpeed {
    const win = window as any;
    const legacySpeed = win.autoApplyTypingSpeed || 'normal';
    
    const speedMap: Record<string, AnimationSpeed> = {
      'fast': 'fast',
      'normal': 'normal', 
      'slow': 'slow',
      'instant': 'instant'
    };
    
    return speedMap[legacySpeed] || 'normal';
  }
  
  /**
   * Update legacy UI indicator
   */
  private updateLegacyIndicator(enabled: boolean): void {
    // Update toolbar button if exists
    const toolbarBtn = document.getElementById('autonomous-mode-toggle');
    if (toolbarBtn) {
      toolbarBtn.classList.toggle('active', enabled);
      toolbarBtn.classList.toggle('auto-active', enabled);
      toolbarBtn.title = enabled ? 'Auto Mode: ON (v2.0)' : 'Auto Mode: OFF';
    }
    
    // Update any other toggle buttons
    document.querySelectorAll('.autonomous-mode-toggle').forEach(btn => {
      btn.classList.toggle('active', enabled);
    });
  }
  
  /**
   * Emit legacy-style events for backward compatibility
   */
  private emitLegacyEvent(eventName: string, data: any): void {
    // Custom event dispatch
    const event = new CustomEvent(`autonomous:${eventName}`, { detail: data });
    document.dispatchEvent(event);
    
    // Call registered callbacks
    const callbacks = this.legacyCallbacks.get(eventName) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`[Bridge] Callback error for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * Register legacy event callback
   */
  on(eventName: string, callback: Function): () => void {
    if (!this.legacyCallbacks.has(eventName)) {
      this.legacyCallbacks.set(eventName, []);
    }
    this.legacyCallbacks.get(eventName)!.push(callback);
    
    return () => {
      const callbacks = this.legacyCallbacks.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let bridgeInstance: AutonomousBridge | null = null;

/**
 * Get bridge instance
 */
export function getBridge(): AutonomousBridge {
  if (!bridgeInstance) {
    bridgeInstance = new AutonomousBridge();
  }
  return bridgeInstance;
}

/**
 * Initialize the integration bridge
 * Call this AFTER autonomousCoding.ts has loaded
 */
export function initializeBridge(): void {
  getBridge().initialize();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Auto-initialize when DOM is ready
 */
function autoInit(): void {
  // Wait for existing autonomousCoding.ts to load
  const checkAndInit = () => {
    const win = window as any;
    
    // Check if legacy system is loaded
    if (win.initAutoCodeApply || win.applyCodeToEditor) {
      console.log('🌉 [Bridge] Legacy system detected, initializing bridge...');
      initializeBridge();
    } else {
      // Retry after short delay
      setTimeout(checkAndInit, 500);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkAndInit, 1000); // Wait 1s after DOM ready
    });
  } else {
    setTimeout(checkAndInit, 1000);
  }
}

// Auto-init when module loads
if (typeof window !== 'undefined') {
  autoInit();
  
  // Expose bridge to window for debugging
  (window as any).autonomousBridge = {
    get: getBridge,
    init: initializeBridge,
    on: (event: string, cb: Function) => getBridge().on(event, cb)
  };
}

// ============================================================================
// EXPORTS (AutonomousBridge class - functions already exported above)
// ============================================================================

export { AutonomousBridge };

console.log('✅ integrationBridge.ts loaded - v2.0 ↔ legacy compatibility layer');
