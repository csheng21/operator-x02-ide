/**
 * ====================================================================================================
 * FILE: src/ide/terminal/autoFormatErrors.ts - AUTOMATIC ERROR FORMATTING (V3 - ULTRA RELIABLE)
 * ====================================================================================================
 * 
 * AUTOMATIC ERROR FORMATTING SYSTEM - VERSION 3
 * 
 * This version is ULTRA RELIABLE:
 * - Keeps trying to initialize every 2 seconds until successful
 * - Polls for errors every 500ms (twice per second)
 * - Never gives up trying to start
 * - Guaranteed to work once terminal and error system are ready
 * 
 * ====================================================================================================
 */

let pollInterval: any = null;
let initAttemptInterval: any = null;
let isPollingActive = false;

/**
 * Initialize automatic error formatting
 * This keeps trying until it succeeds!
 */
export function initializeAutoErrorFormatting(): void {
  // [X02Fix 6] Idempotency guard
  if ((window as any).__autoErrorFmtInit) return;
  (window as any).__autoErrorFmtInit = true;
  console.log('🎨 Starting Auto Error Formatting initialization...');
  
  // Try to start immediately
  if (tryStartFormatting()) {
    return; // Success!
  }
  
  // If not ready yet, keep trying every 2 seconds
  if (!initAttemptInterval) {
    initAttemptInterval = setInterval(() => {
      console.log('🔄 Retry: Attempting to start auto-formatting...');
      
      if (tryStartFormatting()) {
        // Success! Stop trying
        clearInterval(initAttemptInterval);
        initAttemptInterval = null;
      }
    }, 2000);
    
    // suppressed: will keep trying every 2 seconds until ready
  }
}

/**
 * Try to start the formatting system
 * @returns true if successful, false if not ready yet
 */
function tryStartFormatting(): boolean {
  const term = document.getElementById('integrated-terminal-output');
  const integration = (window as any).TerminalErrorIntegration;
  
  if (!term) {
    console.log('⏳ Terminal not ready yet...');
    return false;
  }
  
  if (!integration) {
    console.log('⏳ TerminalErrorIntegration not ready yet...');
    return false;
  }
  
  // Both ready! Start the system
  console.log('✅ Terminal and TerminalErrorIntegration ready!');
  startPolling(term, integration);
  return true;
}

/**
 * Start continuous polling for errors
 */
function startPolling(
  terminalElement: HTMLElement,
  errorIntegration: any
): void {
  // Stop any existing polling
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  // Format existing errors immediately
  formatAllUnformattedErrors(terminalElement, errorIntegration);
  
  // Start polling every 500ms (twice per second)
  pollInterval = setInterval(() => {
    formatAllUnformattedErrors(terminalElement, errorIntegration);
  }, 500);
  
  isPollingActive = true;
  
  console.log('🎉 Auto-formatting active!');
  console.log('⚡ Polling every 500ms for new errors');
}

/**
 * Format all unformatted errors
 */
function formatAllUnformattedErrors(
  terminalElement: HTMLElement,
  errorIntegration: any
): void {
  // Find unformatted stderr elements
  const unformattedErrors = terminalElement.querySelectorAll(
    '.terminal-stderr:not(.error-formatted)'
  );
  
  if (unformattedErrors.length === 0) {
    return; // No new errors
  }
  
  console.log(`🎨 Formatting ${unformattedErrors.length} error(s)...`);
  
  let successCount = 0;
  unformattedErrors.forEach((el) => {
    if (formatErrorElement(el as HTMLElement, errorIntegration)) {
      successCount++;
    }
  });
  
  if (successCount > 0) {
    console.log(`✅ Successfully formatted ${successCount} error(s)`);
  }
}

/**
 * Format a single error element
 */
function formatErrorElement(
  element: HTMLElement,
  errorIntegration: any
): boolean {
  // Skip if already formatted
  if (element.classList.contains('error-formatted')) {
    return false;
  }
  
  const text = element.textContent || '';
  
  // Check if contains an error
  if (!errorIntegration.hasErrors(text)) {
    // Mark as checked so we don't keep checking it
    element.classList.add('error-formatted');
    return false;
  }
  
  try {
    // Get formatted element
    const formattedElement = errorIntegration.processOutput(text);
    
    // Verify it's valid
    if (!formattedElement || !formattedElement.tagName) {
      console.warn('⚠️ Failed to create formatted element');
      return false;
    }
    
    // Replace content
    element.innerHTML = '';
    element.appendChild(formattedElement);
    element.classList.add('error-formatted');
    
    return true;
  } catch (error) {
    console.error('❌ Error formatting element:', error);
    return false;
  }
}

/**
 * Manual formatting trigger
 */
export function formatAllErrors(): void {
  const term = document.getElementById('integrated-terminal-output');
  const integration = (window as any).TerminalErrorIntegration;
  
  if (!term || !integration) {
    console.error('❌ Terminal or Error Integration not available');
    return;
  }
  
  formatAllUnformattedErrors(term, integration);
}

/**
 * Check if active
 */
export function isAutoFormattingActive(): boolean {
  return isPollingActive && pollInterval !== null;
}

/**
 * Stop auto-formatting
 */
export function stopAutoFormatting(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  
  if (initAttemptInterval) {
    clearInterval(initAttemptInterval);
    initAttemptInterval = null;
  }
  
  isPollingActive = false;
  console.log('🛑 Auto-formatting stopped');
}

/**
 * Restart auto-formatting
 */
export function restartAutoFormatting(): void {
  console.log('🔄 Restarting auto-formatting...');
  stopAutoFormatting();
  initializeAutoErrorFormatting();
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

if (typeof window !== 'undefined') {
  // Expose to window immediately for manual control
  (window as any).errorFormatting = {
    format: formatAllErrors,
    isActive: isAutoFormattingActive,
    reinitialize: restartAutoFormatting,
    stop: stopAutoFormatting
  };
  
  // Try multiple times at increasing intervals
  // Total: tries for about 60 seconds before giving up
  
  setTimeout(() => initializeAutoErrorFormatting(), 100);    // 0.1s
  setTimeout(() => initializeAutoErrorFormatting(), 500);    // 0.5s
  setTimeout(() => initializeAutoErrorFormatting(), 1000);   // 1s
  setTimeout(() => initializeAutoErrorFormatting(), 2000);   // 2s
  setTimeout(() => initializeAutoErrorFormatting(), 3000);   // 3s
  setTimeout(() => initializeAutoErrorFormatting(), 5000);   // 5s
  setTimeout(() => initializeAutoErrorFormatting(), 7000);   // 7s
  setTimeout(() => initializeAutoErrorFormatting(), 10000);  // 10s
  setTimeout(() => initializeAutoErrorFormatting(), 15000);  // 15s
  setTimeout(() => initializeAutoErrorFormatting(), 20000);  // 20s
  setTimeout(() => initializeAutoErrorFormatting(), 30000);  // 30s
  setTimeout(() => initializeAutoErrorFormatting(), 45000);  // 45s
  setTimeout(() => initializeAutoErrorFormatting(), 60000);  // 60s
}

console.log('📦 Auto Error Formatting V4 (FINAL) loaded');
// suppressed: will keep trying for 60 seconds