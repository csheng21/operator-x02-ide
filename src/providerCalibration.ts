// providerCalibration.ts - Auto-Learning Calibration System with Manual Override
// ============================================================================
// Learns which providers are best for which tasks, with user correction ability
// ============================================================================

import { ProviderName, TaskType } from './multiProviderOrchestrator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CapabilityStatus = 
  | 'auto'           // System decides based on test results
  | 'enabled'        // Manually enabled (override: always use)
  | 'disabled'       // Manually disabled (override: never use)
  | 'learning';      // Currently being tested/learned

export interface CapabilityScore {
  successCount: number;
  failureCount: number;
  lastTested: number;
  avgLatency: number;
  confidenceScore: number;    // 0-100: how confident the system is
  manualOverride: CapabilityStatus;  // User override
  notes: string[];            // User notes/reasons for override
}

export interface ProviderCapabilities {
  providerId: ProviderName;
  capabilities: Record<TaskType, CapabilityScore>;
  lastCalibrated: number;
  overallScore: number;
}

export interface CalibrationConfig {
  autoLearnEnabled: boolean;
  confidenceThreshold: number;     // Min confidence to auto-route (default: 70)
  minTestsRequired: number;        // Tests needed before trusting (default: 3)
  decayFactor: number;             // How fast old results fade (0-1)
  enableUserFeedback: boolean;
}

export interface TestResult {
  provider: ProviderName;
  taskType: TaskType;
  success: boolean;
  latency: number;
  timestamp: number;
  userFeedback?: 'good' | 'bad' | 'neutral';
  notes?: string;
}

// ============================================================================
// DEFAULT CALIBRATION CONFIG
// ============================================================================

const DEFAULT_CONFIG: CalibrationConfig = {
  autoLearnEnabled: true,
  confidenceThreshold: 70,
  minTestsRequired: 3,
  decayFactor: 0.95,
  enableUserFeedback: true
};

// Default capability baseline (what we "think" each provider can do before testing)
const DEFAULT_CAPABILITIES: Record<ProviderName, TaskType[]> = {
  operator_x02: ['code_generation', 'code_fix', 'code_explain', 'quick_answer'],
  groq: ['quick_answer', 'translation', 'summarize'],
  gemini: ['image_analysis', 'creative_writing', 'summarize', 'general'],
  deepseek: ['code_generation', 'code_fix', 'code_explain', 'complex_reasoning'],
  claude: ['code_generation', 'code_fix', 'complex_reasoning', 'creative_writing'],
  openai: ['code_generation', 'code_fix', 'image_analysis', 'creative_writing', 'general']
};

// Which providers definitely CANNOT do certain tasks (known limitations)
const KNOWN_LIMITATIONS: Record<ProviderName, TaskType[]> = {
  operator_x02: ['image_analysis'],  // No vision support
  groq: ['image_analysis'],          // No vision support
  gemini: [],                        // Has vision
  deepseek: ['image_analysis'],      // No vision support
  claude: [],                        // Claude has vision in some models
  openai: []                         // GPT-4V has vision
};

// ============================================================================
// CALIBRATION MANAGER CLASS
// ============================================================================

export class CalibrationManager {
  private config: CalibrationConfig;
  private capabilities: Record<ProviderName, ProviderCapabilities>;
  private testHistory: TestResult[];
  private readonly STORAGE_KEY = 'providerCalibrationData';
  private readonly HISTORY_KEY = 'calibrationTestHistory';
  private readonly CONFIG_KEY = 'calibrationConfig';

  constructor() {
    this.config = this.loadConfig();
    this.capabilities = this.loadCapabilities();
    this.testHistory = this.loadHistory();
    console.log('🎯 Calibration Manager initialized');
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  private loadConfig(): CalibrationConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  private loadCapabilities(): Record<ProviderName, ProviderCapabilities> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return this.initializeCapabilities();
  }

  private loadHistory(): TestResult[] {
    try {
      const saved = localStorage.getItem(this.HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.capabilities));
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.testHistory.slice(-500))); // Keep last 500
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
  }

  private initializeCapabilities(): Record<ProviderName, ProviderCapabilities> {
    const allTaskTypes: TaskType[] = [
      'code_generation', 'code_fix', 'code_explain', 'quick_answer',
      'complex_reasoning', 'creative_writing', 'image_analysis',
      'translation', 'summarize', 'general'
    ];

    const providers: ProviderName[] = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
    const result: Record<ProviderName, ProviderCapabilities> = {} as any;

    for (const provider of providers) {
      const defaults = DEFAULT_CAPABILITIES[provider] || [];
      const limitations = KNOWN_LIMITATIONS[provider] || [];
      
      result[provider] = {
        providerId: provider,
        capabilities: {} as Record<TaskType, CapabilityScore>,
        lastCalibrated: Date.now(),
        overallScore: 50
      };

      for (const task of allTaskTypes) {
        const isDefault = defaults.includes(task);
        const isLimited = limitations.includes(task);
        
        result[provider].capabilities[task] = {
          successCount: isDefault ? 2 : 0,
          failureCount: isLimited ? 5 : 0,  // Pre-set failures for known limitations
          lastTested: 0,
          avgLatency: 0,
          confidenceScore: isLimited ? 95 : (isDefault ? 50 : 20),
          manualOverride: isLimited ? 'disabled' : 'auto',  // Auto-disable known limitations
          notes: isLimited ? ['Known limitation: No vision support'] : []
        };
      }
    }

    return result;
  }

  // ===========================================================================
  // CORE CALIBRATION LOGIC
  // ===========================================================================

  /**
   * Record a test result and update calibration
   */
  recordTestResult(result: TestResult): void {
    // Add to history
    this.testHistory.push(result);

    // Update capability score
    const cap = this.getCapability(result.provider, result.taskType);
    
    if (result.success) {
      cap.successCount++;
    } else {
      cap.failureCount++;
    }

    // Update latency (exponential moving average)
    if (result.latency > 0) {
      cap.avgLatency = cap.avgLatency === 0 
        ? result.latency 
        : cap.avgLatency * 0.8 + result.latency * 0.2;
    }

    cap.lastTested = result.timestamp;
    
    // Recalculate confidence
    this.recalculateConfidence(result.provider, result.taskType);

    // If user provided feedback, weigh it more heavily
    if (result.userFeedback) {
      this.applyUserFeedback(result);
    }

    this.save();
    console.log(`📊 Calibration updated: ${result.provider} / ${result.taskType} = ${cap.confidenceScore}%`);
  }

  private recalculateConfidence(provider: ProviderName, taskType: TaskType): void {
    const cap = this.getCapability(provider, taskType);
    const total = cap.successCount + cap.failureCount;
    
    if (total === 0) {
      cap.confidenceScore = 20; // No data
      return;
    }

    // Base success rate
    const successRate = cap.successCount / total;
    
    // Confidence grows with more tests (asymptotic to 100)
    const testConfidence = 1 - Math.exp(-total / 5); // ~86% confidence after 10 tests
    
    // Final score: weighted combination
    cap.confidenceScore = Math.round(successRate * testConfidence * 100);
  }

  private applyUserFeedback(result: TestResult): void {
    const cap = this.getCapability(result.provider, result.taskType);
    
    // User feedback is worth 3 normal tests
    if (result.userFeedback === 'good') {
      cap.successCount += 2;
    } else if (result.userFeedback === 'bad') {
      cap.failureCount += 2;
    }
    
    if (result.notes) {
      cap.notes.push(`[${new Date().toLocaleDateString()}] ${result.notes}`);
      // Keep only last 5 notes
      cap.notes = cap.notes.slice(-5);
    }
    
    this.recalculateConfidence(result.provider, result.taskType);
  }

  // ===========================================================================
  // MANUAL OVERRIDE
  // ===========================================================================

  /**
   * Manually set a capability status (override auto-learning)
   */
  setManualOverride(
    provider: ProviderName, 
    taskType: TaskType, 
    status: CapabilityStatus,
    reason?: string
  ): void {
    const cap = this.getCapability(provider, taskType);
    cap.manualOverride = status;
    
    if (reason) {
      cap.notes.push(`[OVERRIDE] ${reason}`);
      cap.notes = cap.notes.slice(-5);
    }

    // If manually disabled, set confidence to 0
    if (status === 'disabled') {
      cap.confidenceScore = 0;
    }
    // If manually enabled, set confidence to 100
    else if (status === 'enabled') {
      cap.confidenceScore = 100;
    }

    this.save();
    console.log(`🔧 Manual override: ${provider} / ${taskType} = ${status}`);
  }

  /**
   * Reset a capability to auto-learning mode
   */
  resetToAuto(provider: ProviderName, taskType: TaskType): void {
    const cap = this.getCapability(provider, taskType);
    cap.manualOverride = 'auto';
    this.recalculateConfidence(provider, taskType);
    this.save();
  }

  /**
   * Reset all calibration data and start fresh
   */
  resetAll(): void {
    this.capabilities = this.initializeCapabilities();
    this.testHistory = [];
    this.save();
    console.log('🔄 Calibration reset to defaults');
  }

  // ===========================================================================
  // QUERY METHODS
  // ===========================================================================

  getCapability(provider: ProviderName, taskType: TaskType): CapabilityScore {
    if (!this.capabilities[provider]) {
      this.capabilities[provider] = this.initializeCapabilities()[provider];
    }
    if (!this.capabilities[provider].capabilities[taskType]) {
      this.capabilities[provider].capabilities[taskType] = {
        successCount: 0,
        failureCount: 0,
        lastTested: 0,
        avgLatency: 0,
        confidenceScore: 20,
        manualOverride: 'auto',
        notes: []
      };
    }
    return this.capabilities[provider].capabilities[taskType];
  }

  /**
   * Can this provider handle this task?
   */
  canHandle(provider: ProviderName, taskType: TaskType): boolean {
    const cap = this.getCapability(provider, taskType);
    
    // Check manual override first
    if (cap.manualOverride === 'disabled') return false;
    if (cap.manualOverride === 'enabled') return true;
    
    // Auto mode: check confidence threshold
    return cap.confidenceScore >= this.config.confidenceThreshold;
  }

  /**
   * Get the best provider for a task
   */
  getBestProvider(taskType: TaskType, enabledProviders: ProviderName[]): ProviderName | null {
    let best: { provider: ProviderName; score: number } | null = null;

    for (const provider of enabledProviders) {
      const cap = this.getCapability(provider, taskType);
      
      // Skip manually disabled
      if (cap.manualOverride === 'disabled') continue;
      
      // Manually enabled always wins (if multiple, first one)
      if (cap.manualOverride === 'enabled') {
        return provider;
      }
      
      // Compare confidence scores
      if (!best || cap.confidenceScore > best.score) {
        best = { provider, score: cap.confidenceScore };
      }
    }

    // Only return if above threshold
    if (best && best.score >= this.config.confidenceThreshold) {
      return best.provider;
    }

    return null;
  }

  /**
   * Get all provider scores for a task (for UI display)
   */
  getTaskScores(taskType: TaskType): Array<{
    provider: ProviderName;
    score: number;
    status: CapabilityStatus;
    canHandle: boolean;
    latency: number;
    testCount: number;
  }> {
    const providers: ProviderName[] = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
    
    return providers.map(provider => {
      const cap = this.getCapability(provider, taskType);
      return {
        provider,
        score: cap.confidenceScore,
        status: cap.manualOverride,
        canHandle: this.canHandle(provider, taskType),
        latency: cap.avgLatency,
        testCount: cap.successCount + cap.failureCount
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Get calibration summary for a provider
   */
  getProviderSummary(provider: ProviderName): {
    strongTasks: TaskType[];
    weakTasks: TaskType[];
    disabledTasks: TaskType[];
    overrideTasks: TaskType[];
    overallScore: number;
  } {
    const caps = this.capabilities[provider]?.capabilities || {};
    const allTasks: TaskType[] = [
      'code_generation', 'code_fix', 'code_explain', 'quick_answer',
      'complex_reasoning', 'creative_writing', 'image_analysis',
      'translation', 'summarize', 'general'
    ];

    const strong: TaskType[] = [];
    const weak: TaskType[] = [];
    const disabled: TaskType[] = [];
    const override: TaskType[] = [];
    let totalScore = 0;

    for (const task of allTasks) {
      const cap = caps[task];
      if (!cap) continue;

      totalScore += cap.confidenceScore;

      if (cap.manualOverride === 'disabled') {
        disabled.push(task);
      } else if (cap.manualOverride === 'enabled') {
        override.push(task);
      } else if (cap.confidenceScore >= 70) {
        strong.push(task);
      } else {
        weak.push(task);
      }
    }

    return {
      strongTasks: strong,
      weakTasks: weak,
      disabledTasks: disabled,
      overrideTasks: override,
      overallScore: Math.round(totalScore / allTasks.length)
    };
  }

  /**
   * Get test history for review
   */
  getTestHistory(filter?: {
    provider?: ProviderName;
    taskType?: TaskType;
    limit?: number;
  }): TestResult[] {
    let results = [...this.testHistory];

    if (filter?.provider) {
      results = results.filter(r => r.provider === filter.provider);
    }
    if (filter?.taskType) {
      results = results.filter(r => r.taskType === filter.taskType);
    }

    // Sort newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Correct a test result (user found it was wrong)
   */
  correctTestResult(index: number, shouldHaveSucceeded: boolean, reason?: string): void {
    const result = this.testHistory[index];
    if (!result) return;

    const cap = this.getCapability(result.provider, result.taskType);

    // Undo the original result
    if (result.success) {
      cap.successCount = Math.max(0, cap.successCount - 1);
    } else {
      cap.failureCount = Math.max(0, cap.failureCount - 1);
    }

    // Apply the correction (with extra weight for user correction)
    if (shouldHaveSucceeded) {
      cap.successCount += 2;
    } else {
      cap.failureCount += 2;
    }

    // Update the history record
    result.success = shouldHaveSucceeded;
    result.userFeedback = shouldHaveSucceeded ? 'good' : 'bad';
    if (reason) {
      result.notes = reason;
      cap.notes.push(`[CORRECTED] ${reason}`);
    }

    this.recalculateConfidence(result.provider, result.taskType);
    this.save();

    console.log(`✏️ Test result corrected: ${result.provider} / ${result.taskType}`);
  }

  // ===========================================================================
  // CONFIG METHODS
  // ===========================================================================

  getConfig(): CalibrationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CalibrationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  getAllCapabilities(): Record<ProviderName, ProviderCapabilities> {
    return JSON.parse(JSON.stringify(this.capabilities));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let calibrationInstance: CalibrationManager | null = null;

export function getCalibrationManager(): CalibrationManager {
  if (!calibrationInstance) {
    calibrationInstance = new CalibrationManager();
  }
  return calibrationInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick check if provider can handle task
 */
export function canProviderHandle(provider: ProviderName, taskType: TaskType): boolean {
  return getCalibrationManager().canHandle(provider, taskType);
}

/**
 * Get best provider for a task
 */
export function selectBestProvider(taskType: TaskType, enabled: ProviderName[]): ProviderName | null {
  return getCalibrationManager().getBestProvider(taskType, enabled);
}

/**
 * Record a result for learning
 */
export function recordResult(
  provider: ProviderName, 
  taskType: TaskType, 
  success: boolean, 
  latency: number
): void {
  getCalibrationManager().recordTestResult({
    provider,
    taskType,
    success,
    latency,
    timestamp: Date.now()
  });
}

/**
 * Manually disable a capability
 */
export function disableCapability(
  provider: ProviderName, 
  taskType: TaskType, 
  reason?: string
): void {
  getCalibrationManager().setManualOverride(provider, taskType, 'disabled', reason);
}

/**
 * Manually enable a capability
 */
export function enableCapability(
  provider: ProviderName, 
  taskType: TaskType, 
  reason?: string
): void {
  getCalibrationManager().setManualOverride(provider, taskType, 'enabled', reason);
}

// ============================================================================
// EXPOSE TO WINDOW FOR DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  // Add to window.calibration namespace
  (window as any).calibration = {
    get: getCalibrationManager,
    canHandle: canProviderHandle,
    selectBest: selectBestProvider,
    record: recordResult,
    disable: disableCapability,
    enable: enableCapability,
    reset: () => getCalibrationManager().resetAll()
  };
  
  // Also expose directly for easier access
  (window as any).getCalibrationManager = getCalibrationManager;
  (window as any).recordResult = recordResult;
  
  console.log('✅ Calibration system loaded! Use window.calibration or window.getCalibrationManager()');
}

export default CalibrationManager;
