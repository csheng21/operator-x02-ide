// calibrationIntegration.ts - Integration with Multi-Provider Orchestrator
// ============================================================================
// Connects the calibration system to your existing orchestrator
// ============================================================================

import { 
  getCalibrationManager, 
  recordResult,
  canProviderHandle,
  selectBestProvider
} from './providerCalibration';
import { showCalibrationPanel, showFeedbackWidget } from './calibrationUI';
import { 
  getOrchestrator, 
  ProviderName, 
  TaskType, 
  detectTaskType,
  OrchestratorResponse 
} from './multiProviderOrchestrator';

// ============================================================================
// ENHANCED ORCHESTRATOR WITH CALIBRATION
// ============================================================================

/**
 * Enhanced send that uses calibration for routing + records results
 */
export async function calibratedSend(
  message: string, 
  hasImage: boolean = false
): Promise<OrchestratorResponse> {
  const orchestrator = getOrchestrator();
  const calibration = getCalibrationManager();
  const config = orchestrator.getConfig();
  
  // Detect task type
  const taskType = detectTaskType(message, hasImage);
  
  // Get enabled providers (with API keys)
  const enabledProviders = (Object.keys(config.providers) as ProviderName[])
    .filter(p => {
      const prov = config.providers[p];
      return prov.enabled && prov.apiKey;
    });
  
  // Use calibration to select best provider
  let selectedProvider: ProviderName | null = null;
  
  if (config.enableAutoRouting && calibration.getConfig().autoLearnEnabled) {
    selectedProvider = selectBestProvider(taskType, enabledProviders);
    
    if (selectedProvider) {
      console.log(`🎯 Calibration selected: ${selectedProvider} for ${taskType}`);
    }
  }
  
  // Fall back to orchestrator's default if calibration didn't pick one
  if (!selectedProvider) {
    selectedProvider = config.defaultProvider;
  }
  
  // Send the message
  const startTime = Date.now();
  let response: OrchestratorResponse;
  let success = false;
  
  try {
    response = await orchestrator.sendMessage(message, hasImage);
    success = true;
  } catch (error) {
    // Record failure
    recordResult(selectedProvider, taskType, false, Date.now() - startTime);
    throw error;
  }
  
  // Record success
  const latency = Date.now() - startTime;
  recordResult(response.provider, taskType, success, latency);
  
  // Show feedback widget (if enabled)
  if (calibration.getConfig().enableUserFeedback) {
    showFeedbackWidget(response.provider, taskType, latency);
  }
  
  return response;
}

// ============================================================================
// QUICK ACCESS FUNCTIONS
// ============================================================================

/**
 * Check if a provider should be used for a task (respects calibration)
 */
export function shouldUseProvider(provider: ProviderName, taskType: TaskType): boolean {
  return canProviderHandle(provider, taskType);
}

/**
 * Get the recommended provider for a task
 */
export function getRecommendedProvider(taskType: TaskType): ProviderName | null {
  const config = getOrchestrator().getConfig();
  const enabled = (Object.keys(config.providers) as ProviderName[])
    .filter(p => config.providers[p].enabled && config.providers[p].apiKey);
  
  return selectBestProvider(taskType, enabled);
}

/**
 * Open the calibration panel
 */
export function openCalibration(): void {
  showCalibrationPanel();
}

// ============================================================================
// ADD CALIBRATION BUTTON TO EXISTING UI
// ============================================================================

export function addCalibrationButton(): void {
  // Check if already added
  if (document.getElementById('calibration-quick-btn')) return;
  
  // Find the orchestrator status bar or settings panel
  const statusBar = document.getElementById('orchestrator-status-bar');
  
  if (statusBar) {
    const calibBtn = document.createElement('span');
    calibBtn.id = 'calibration-quick-btn';
    calibBtn.innerHTML = '🎯';
    calibBtn.title = 'Provider Calibration';
    calibBtn.style.cssText = `
      cursor: pointer;
      padding: 0 8px;
      transition: transform 0.2s;
    `;
    calibBtn.onclick = (e) => {
      e.stopPropagation();
      (window as any).__calibrationUserTriggered = true;
      showCalibrationPanel();
    };
    calibBtn.onmouseenter = () => { calibBtn.style.transform = 'scale(1.2)'; };
    calibBtn.onmouseleave = () => { calibBtn.style.transform = 'scale(1)'; };
    
    statusBar.appendChild(calibBtn);
  }
}

// ============================================================================
// KEYBOARD SHORTCUT
// ============================================================================

export function initCalibrationShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+C for Calibration panel
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      (window as any).__calibrationUserTriggered = true;
      showCalibrationPanel();
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeCalibration(): void {
  console.log('🎯 Initializing Calibration System...');
  
  // Initialize the calibration manager
  getCalibrationManager();
  
  // Add keyboard shortcuts
  initCalibrationShortcuts();
  
  // Add button to UI after a delay
  setTimeout(() => {
    addCalibrationButton();
  }, 2000);
  
  console.log('✅ Calibration System initialized');
  console.log('   Press Ctrl+Shift+C to open calibration panel');
}

// ============================================================================
// EXAMPLE USAGE IN YOUR ORCHESTRATOR
// ============================================================================

/*
// In your multiProviderOrchestrator.ts, modify the routeTask method:

import { canProviderHandle, selectBestProvider, recordResult } from './providerCalibration';

// In routeTask method, add calibration check:
private routeTask(message: string, hasImage: boolean): RouteResult {
  const taskType = detectTaskType(message, hasImage);
  
  // Check calibration first
  const enabledProviders = this.getEnabledProviders();
  const calibratedChoice = selectBestProvider(taskType, enabledProviders);
  
  if (calibratedChoice) {
    return {
      provider: calibratedChoice,
      reason: `Calibration: best for ${taskType}`,
      taskType,
      confidence: 90
    };
  }
  
  // ... existing routing logic as fallback
}

// After a successful response:
recordResult(response.provider, taskType, true, latencyMs);

// After a failed response:
recordResult(response.provider, taskType, false, 0);
*/

// ============================================================================
// EXPOSE TO WINDOW
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).calibration = {
    ...((window as any).calibration || {}),
    open: openCalibration,
    send: calibratedSend,
    shouldUse: shouldUseProvider,
    recommend: getRecommendedProvider,
    init: initializeCalibration
  };
}

export default {
  calibratedSend,
  shouldUseProvider,
  getRecommendedProvider,
  openCalibration,
  initializeCalibration
};
