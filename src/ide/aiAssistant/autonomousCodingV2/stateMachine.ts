// stateMachine.ts - Autonomous Coding State Machine
// ============================================================================
// Finite State Machine for managing autonomous coding states
// Prevents race conditions and invalid state combinations
// Features:
// - Explicit state definitions
// - Valid transition enforcement
// - Event-driven architecture
// - State persistence
// - Debug logging
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * All possible states of the autonomous coding system
 */
export type AutonomousState =
  | 'idle'           // System ready, waiting for code blocks
  | 'detecting'      // Scanning for new code blocks
  | 'selecting'      // Scoring and selecting best code block
  | 'validating'     // Validating file match
  | 'applying'       // Applying code with animation
  | 'confirming'     // Waiting for user accept/reject
  | 'saving'         // Saving changes to file
  | 'multi-file'     // Processing multiple files
  | 'paused'         // System paused by user
  | 'error';         // Error state

/**
 * Events that trigger state transitions
 */
export type AutonomousEvent =
  // Detection events
  | { type: 'CODE_BLOCK_DETECTED'; blockId: string; blockCount: number }
  | { type: 'NO_BLOCKS_FOUND' }
  
  // Selection events
  | { type: 'BLOCK_SELECTED'; blockId: string; score: number; targetFile: string }
  | { type: 'NO_SUITABLE_BLOCK' }
  | { type: 'MULTI_FILE_DETECTED'; fileCount: number; files: string[] }
  
  // Validation events
  | { type: 'FILE_MATCH_VALID' }
  | { type: 'FILE_MISMATCH'; expected: string; actual: string }
  | { type: 'FILE_OPENED'; path: string }
  
  // Application events
  | { type: 'APPLY_START' }
  | { type: 'APPLY_PROGRESS'; progress: number; currentLine: number }
  | { type: 'APPLY_COMPLETE'; stats: ApplyStats }
  | { type: 'APPLY_CANCELLED' }
  
  // Confirmation events
  | { type: 'USER_ACCEPT' }
  | { type: 'USER_REJECT' }
  | { type: 'CONFIRMATION_TIMEOUT' }
  
  // Save events
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_FAILED'; error: string }
  
  // Multi-file events
  | { type: 'MULTI_FILE_NEXT'; currentIndex: number; totalFiles: number }
  | { type: 'MULTI_FILE_COMPLETE'; successCount: number; failCount: number }
  
  // Control events
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'ENABLE' }
  | { type: 'DISABLE' }
  | { type: 'ERROR'; message: string };

/**
 * Apply statistics
 */
export interface ApplyStats {
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  durationMs: number;
}

/**
 * Current context data
 */
export interface StateContext {
  // Enable/disable
  isEnabled: boolean;
  
  // Current operation
  currentBlockId: string | null;
  currentFile: string | null;
  currentCode: string | null;
  originalCode: string | null;
  
  // Multi-file
  multiFileSession: MultiFileSession | null;
  
  // Statistics
  lastApplyStats: ApplyStats | null;
  totalApplied: number;
  totalRejected: number;
  
  // Error tracking
  lastError: string | null;
  errorCount: number;
  
  // Timing
  stateEnteredAt: number;
  lastTransitionAt: number;
}

/**
 * Multi-file session data
 */
export interface MultiFileSession {
  files: Array<{
    path: string;
    blockId: string;
    status: 'pending' | 'applying' | 'confirmed' | 'rejected' | 'error';
  }>;
  currentIndex: number;
  startedAt: number;
}

/**
 * State machine configuration
 */
export interface StateMachineConfig {
  /** Enable debug logging */
  debug: boolean;
  /** Timeout for confirmation (ms) */
  confirmationTimeout: number;
  /** Auto-save on accept */
  autoSaveOnAccept: boolean;
  /** Persist state to localStorage */
  persistState: boolean;
  /** State change callback */
  onStateChange?: (prev: AutonomousState, next: AutonomousState, event: AutonomousEvent) => void;
}

/**
 * State transition result
 */
export interface TransitionResult {
  success: boolean;
  previousState: AutonomousState;
  newState: AutonomousState;
  reason?: string;
}

// ============================================================================
// VALID STATE TRANSITIONS
// ============================================================================

/**
 * Define valid transitions: [fromState]: [allowedEvents] -> nextState
 */
const VALID_TRANSITIONS: Record<AutonomousState, Partial<Record<AutonomousEvent['type'], AutonomousState>>> = {
  idle: {
    'CODE_BLOCK_DETECTED': 'detecting',
    'DISABLE': 'idle',
    'ENABLE': 'idle',
    'ERROR': 'error'
  },
  
  detecting: {
    'BLOCK_SELECTED': 'selecting',
    'MULTI_FILE_DETECTED': 'multi-file',
    'NO_BLOCKS_FOUND': 'idle',
    'NO_SUITABLE_BLOCK': 'idle',
    'PAUSE': 'paused',
    'RESET': 'idle',
    'ERROR': 'error'
  },
  
  selecting: {
    'FILE_MATCH_VALID': 'validating',
    'FILE_MISMATCH': 'validating',
    'RESET': 'idle',
    'PAUSE': 'paused',
    'ERROR': 'error'
  },
  
  validating: {
    'APPLY_START': 'applying',
    'FILE_OPENED': 'applying',
    'USER_REJECT': 'idle',
    'RESET': 'idle',
    'PAUSE': 'paused',
    'ERROR': 'error'
  },
  
  applying: {
    'APPLY_PROGRESS': 'applying',  // Stay in applying
    'APPLY_COMPLETE': 'confirming',
    'APPLY_CANCELLED': 'idle',
    'RESET': 'idle',
    'ERROR': 'error'
  },
  
  confirming: {
    'USER_ACCEPT': 'saving',
    'USER_REJECT': 'idle',
    'CONFIRMATION_TIMEOUT': 'idle',
    'RESET': 'idle',
    'ERROR': 'error'
  },
  
  saving: {
    'SAVE_SUCCESS': 'idle',
    'SAVE_FAILED': 'error',
    'ERROR': 'error'
  },
  
  'multi-file': {
    'MULTI_FILE_NEXT': 'multi-file',  // Process next file
    'APPLY_START': 'multi-file',
    'APPLY_COMPLETE': 'multi-file',
    'USER_ACCEPT': 'multi-file',
    'USER_REJECT': 'multi-file',
    'MULTI_FILE_COMPLETE': 'idle',
    'RESET': 'idle',
    'PAUSE': 'paused',
    'ERROR': 'error'
  },
  
  paused: {
    'RESUME': 'idle',
    'RESET': 'idle',
    'DISABLE': 'idle'
  },
  
  error: {
    'RESET': 'idle',
    'RESUME': 'idle'
  }
};

// ============================================================================
// STATE MACHINE CLASS
// ============================================================================

/**
 * Autonomous Coding State Machine
 * 
 * Manages all state transitions for the autonomous coding system.
 * Ensures only valid transitions occur, preventing race conditions.
 */
export class AutonomousStateMachine {
  private state: AutonomousState = 'idle';
  private context: StateContext;
  private config: StateMachineConfig;
  private listeners: Set<(state: AutonomousState, context: StateContext) => void> = new Set();
  private transitionHistory: Array<{ from: AutonomousState; to: AutonomousState; event: AutonomousEvent['type']; timestamp: number }> = [];
  
  constructor(config: Partial<StateMachineConfig> = {}) {
    this.config = {
      debug: true,
      confirmationTimeout: 30000, // 30 seconds
      autoSaveOnAccept: true,
      persistState: true,
      ...config
    };
    
    this.context = this.createInitialContext();
    
    // Restore state from localStorage if enabled
    if (this.config.persistState) {
      this.restoreState();
    }
    
    this.log('🚀 State Machine initialized', { state: this.state });
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Get current state
   */
  getState(): AutonomousState {
    return this.state;
  }
  
  /**
   * Get current context
   */
  getContext(): StateContext {
    return { ...this.context };
  }
  
  /**
   * Get full state snapshot
   */
  getSnapshot(): { state: AutonomousState; context: StateContext } {
    return {
      state: this.state,
      context: this.getContext()
    };
  }
  
  /**
   * Attempt a state transition
   * 
   * @param event - Event triggering the transition
   * @returns Result indicating success/failure
   */
  transition(event: AutonomousEvent): TransitionResult {
    const previousState = this.state;
    
    // Check if system is enabled (except for enable/disable/reset events)
    if (!this.context.isEnabled && 
        event.type !== 'ENABLE' && 
        event.type !== 'DISABLE' && 
        event.type !== 'RESET') {
      return {
        success: false,
        previousState,
        newState: this.state,
        reason: 'System is disabled'
      };
    }
    
    // Check if transition is valid
    const validTransitions = VALID_TRANSITIONS[this.state];
    const nextState = validTransitions?.[event.type];
    
    if (!nextState) {
      this.log(`⚠️ Invalid transition: ${this.state} + ${event.type}`, { event });
      return {
        success: false,
        previousState,
        newState: this.state,
        reason: `Invalid transition: ${event.type} not allowed in state ${this.state}`
      };
    }
    
    // Update context based on event
    this.updateContext(event);
    
    // Perform transition
    this.state = nextState;
    this.context.lastTransitionAt = Date.now();
    
    if (previousState !== nextState) {
      this.context.stateEnteredAt = Date.now();
    }
    
    // Record history
    this.transitionHistory.push({
      from: previousState,
      to: nextState,
      event: event.type,
      timestamp: Date.now()
    });
    
    // Keep history bounded
    if (this.transitionHistory.length > 100) {
      this.transitionHistory.shift();
    }
    
    // Persist state
    if (this.config.persistState) {
      this.persistState();
    }
    
    // Notify listeners
    this.notifyListeners();
    
    // Call config callback
    if (this.config.onStateChange) {
      this.config.onStateChange(previousState, nextState, event);
    }
    
    this.log(`✅ Transition: ${previousState} → ${nextState}`, { event });
    
    return {
      success: true,
      previousState,
      newState: nextState
    };
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: AutonomousState, context: StateContext) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Enable the system
   */
  enable(): TransitionResult {
    this.context.isEnabled = true;
    this.log('✅ System enabled');
    return this.transition({ type: 'ENABLE' });
  }
  
  /**
   * Disable the system
   */
  disable(): TransitionResult {
    this.context.isEnabled = false;
    this.log('🛑 System disabled');
    return this.transition({ type: 'DISABLE' });
  }
  
  /**
   * Reset to initial state
   */
  reset(): TransitionResult {
    this.context = this.createInitialContext();
    this.context.isEnabled = true;
    this.state = 'idle';
    this.log('🔄 System reset');
    return { success: true, previousState: this.state, newState: 'idle' };
  }
  
  /**
   * Check if a transition would be valid
   */
  canTransition(eventType: AutonomousEvent['type']): boolean {
    if (!this.context.isEnabled && eventType !== 'ENABLE' && eventType !== 'DISABLE' && eventType !== 'RESET') {
      return false;
    }
    return VALID_TRANSITIONS[this.state]?.[eventType] !== undefined;
  }
  
  /**
   * Get valid events for current state
   */
  getValidEvents(): AutonomousEvent['type'][] {
    return Object.keys(VALID_TRANSITIONS[this.state] || {}) as AutonomousEvent['type'][];
  }
  
  /**
   * Check if system is in a specific state
   */
  isIn(state: AutonomousState): boolean {
    return this.state === state;
  }
  
  /**
   * Check if system is in any of the specified states
   */
  isInAny(...states: AutonomousState[]): boolean {
    return states.includes(this.state);
  }
  
  /**
   * Check if system is busy (not idle or paused)
   */
  isBusy(): boolean {
    return !this.isInAny('idle', 'paused', 'error');
  }
  
  /**
   * Check if system can accept new code blocks
   */
  canAcceptBlocks(): boolean {
    return this.context.isEnabled && this.isIn('idle');
  }
  
  /**
   * Get transition history
   */
  getHistory(): typeof this.transitionHistory {
    return [...this.transitionHistory];
  }
  
  /**
   * Get time in current state (ms)
   */
  getTimeInState(): number {
    return Date.now() - this.context.stateEnteredAt;
  }
  
  // ============================================================================
  // CONTEXT HELPERS
  // ============================================================================
  
  /**
   * Set current operation context
   */
  setCurrentOperation(blockId: string, file: string, code: string, originalCode: string): void {
    this.context.currentBlockId = blockId;
    this.context.currentFile = file;
    this.context.currentCode = code;
    this.context.originalCode = originalCode;
  }
  
  /**
   * Clear current operation context
   */
  clearCurrentOperation(): void {
    this.context.currentBlockId = null;
    this.context.currentFile = null;
    this.context.currentCode = null;
    this.context.originalCode = null;
  }
  
  /**
   * Start multi-file session
   */
  startMultiFileSession(files: Array<{ path: string; blockId: string }>): void {
    this.context.multiFileSession = {
      files: files.map(f => ({ ...f, status: 'pending' as const })),
      currentIndex: 0,
      startedAt: Date.now()
    };
  }
  
  /**
   * Update multi-file session progress
   */
  updateMultiFileProgress(index: number, status: 'applying' | 'confirmed' | 'rejected' | 'error'): void {
    if (this.context.multiFileSession && this.context.multiFileSession.files[index]) {
      this.context.multiFileSession.files[index].status = status;
      this.context.multiFileSession.currentIndex = index;
    }
  }
  
  /**
   * End multi-file session
   */
  endMultiFileSession(): void {
    this.context.multiFileSession = null;
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private createInitialContext(): StateContext {
    return {
      isEnabled: true,
      currentBlockId: null,
      currentFile: null,
      currentCode: null,
      originalCode: null,
      multiFileSession: null,
      lastApplyStats: null,
      totalApplied: 0,
      totalRejected: 0,
      lastError: null,
      errorCount: 0,
      stateEnteredAt: Date.now(),
      lastTransitionAt: Date.now()
    };
  }
  
  private updateContext(event: AutonomousEvent): void {
    switch (event.type) {
      case 'CODE_BLOCK_DETECTED':
        this.context.currentBlockId = event.blockId;
        break;
        
      case 'BLOCK_SELECTED':
        this.context.currentBlockId = event.blockId;
        this.context.currentFile = event.targetFile;
        break;
        
      case 'APPLY_COMPLETE':
        this.context.lastApplyStats = event.stats;
        break;
        
      case 'USER_ACCEPT':
        this.context.totalApplied++;
        break;
        
      case 'USER_REJECT':
        this.context.totalRejected++;
        this.clearCurrentOperation();
        break;
        
      case 'SAVE_SUCCESS':
        this.clearCurrentOperation();
        break;
        
      case 'ERROR':
        this.context.lastError = event.message;
        this.context.errorCount++;
        break;
        
      case 'RESET':
        Object.assign(this.context, this.createInitialContext());
        this.context.isEnabled = true;
        break;
        
      case 'MULTI_FILE_DETECTED':
        this.startMultiFileSession(event.files.map((f, i) => ({ path: f, blockId: `block-${i}` })));
        break;
        
      case 'MULTI_FILE_COMPLETE':
        this.endMultiFileSession();
        break;
    }
  }
  
  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(callback => {
      try {
        callback(snapshot.state, snapshot.context);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }
  
  private persistState(): void {
    try {
      const data = {
        state: this.state,
        context: {
          isEnabled: this.context.isEnabled,
          totalApplied: this.context.totalApplied,
          totalRejected: this.context.totalRejected
        }
      };
      localStorage.setItem('autonomous-state-machine', JSON.stringify(data));
    } catch (error) {
      // Ignore storage errors
    }
  }
  
  private restoreState(): void {
    try {
      const data = localStorage.getItem('autonomous-state-machine');
      if (data) {
        const parsed = JSON.parse(data);
        this.context.isEnabled = parsed.context?.isEnabled ?? true;
        this.context.totalApplied = parsed.context?.totalApplied ?? 0;
        this.context.totalRejected = parsed.context?.totalRejected ?? 0;
        // Don't restore state - always start idle
      }
    } catch (error) {
      // Ignore storage errors
    }
  }
  
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`🔄 [StateMachine] ${message}`, data || '');
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let stateMachineInstance: AutonomousStateMachine | null = null;

/**
 * Get the singleton state machine instance
 */
export function getStateMachine(): AutonomousStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new AutonomousStateMachine();
  }
  return stateMachineInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetStateMachine(): void {
  stateMachineInstance = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick state check
 */
export function getCurrentState(): AutonomousState {
  return getStateMachine().getState();
}

/**
 * Quick transition
 */
export function sendEvent(event: AutonomousEvent): TransitionResult {
  return getStateMachine().transition(event);
}

/**
 * Check if ready for new blocks
 */
export function isReadyForBlocks(): boolean {
  return getStateMachine().canAcceptBlocks();
}

/**
 * Check if system is busy
 */
export function isSystemBusy(): boolean {
  return getStateMachine().isBusy();
}

// ============================================================================
// WINDOW EXPORTS (for debugging)
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).autonomousStateMachine = {
    get: getStateMachine,
    getState: getCurrentState,
    send: sendEvent,
    isReady: isReadyForBlocks,
    isBusy: isSystemBusy,
    reset: () => getStateMachine().reset(),
    enable: () => getStateMachine().enable(),
    disable: () => getStateMachine().disable(),
    getHistory: () => getStateMachine().getHistory(),
    getContext: () => getStateMachine().getContext()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  AutonomousStateMachine,
  getStateMachine,
  resetStateMachine,
  getCurrentState,
  sendEvent,
  isReadyForBlocks,
  isSystemBusy
};

console.log('✅ stateMachine.ts loaded - Finite State Machine for autonomous coding');
