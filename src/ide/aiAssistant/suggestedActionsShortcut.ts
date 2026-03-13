// suggestedActionsShortcut.ts
// Instant "=" keyboard shortcut - Triggers Suggested Actions panel
// EXACT same pattern as "+" and "?" shortcuts

// Callback to show suggested actions panel
let suggestedActionsCallback: (() => void) | null = null;

/**
 * Setup instant "=" keyboard shortcut
 * Follows EXACT same pattern as setupProjectScaffoldingShortcut() and setupInstantClarificationShortcut()
 */
export function setupSuggestedActionsShortcut(
  onShowSuggestedActions: () => void
): void {
  console.log('⌨️ Setting up instant "=" suggested actions shortcut...');
  suggestedActionsCallback = onShowSuggestedActions;
  
  // Function to find message input (same as other shortcuts)
  const findMessageInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    const selectors = [
      '#ai-assistant-input',      // Your specific ID
      '.message-input',
      'input[placeholder*="Ask"]',
      'textarea[placeholder*="Ask"]',
      'input[type="text"]',
      'textarea',
      '#message-input',
      '[class*="message"]',
      '[class*="input"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        console.log(`✅ Found message input using selector: ${selector}`);
        return element;
      }
    }
    return null;
  };
  
  // Setup with retry mechanism (same as other shortcuts)
  const setupWithRetry = (attempts: number = 0): void => {
    const messageInput = findMessageInput();
    
    if (!messageInput) {
      if (attempts < 10) {
        console.log(`⏳ Message input not found yet, retrying... (attempt ${attempts + 1}/10)`);
        setTimeout(() => setupWithRetry(attempts + 1), 500);
      } else {
        console.error('❌ Message input not found after 10 attempts.');
      }
      return;
    }
    
    console.log('✅ Message input found, attaching "=" keyboard listener...');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // KEYDOWN LISTENER - EXACT SAME PATTERN AS "+" AND "?" SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if "=" key is pressed
      if (event.key === '=' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        console.log('🔑 "=" key detected!');
        
        // Check if input is empty or just contains "="
        const currentValue = messageInput.value.trim();
        console.log('🔍 Current input value:', currentValue);
        
        if (currentValue === '' || currentValue === '=') {
          // ✅ PREVENT DEFAULT - This stops "=" from being typed
          event.preventDefault();
          event.stopPropagation();
          
          console.log('🚀 Triggering suggested actions panel...');
          
          // Clear input
          messageInput.value = '';
          
          // Trigger input event to notify any listeners
          messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Show suggested actions panel
          if (suggestedActionsCallback) {
            console.log('✅ Showing suggested actions panel instantly!');
            suggestedActionsCallback();
          } else {
            console.error('❌ Suggested actions callback not set');
          }
          
          console.log('✨ Suggested actions shortcut executed successfully!');
        } else {
          console.log('⭕ Input not empty, allowing "=" to be typed normally');
        }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // KEYPRESS LISTENER - Backup prevention
    // ═══════════════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keypress', (event: KeyboardEvent) => {
      const currentValue = messageInput.value.trim();
      if (event.key === '=' && (currentValue === '' || currentValue === '=')) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    
    console.log('✅ Instant "=" keyboard shortcut successfully set up!');
    console.log('💡 Press "=" in empty message input to trigger suggested actions');
  };
  
  // Start setup with retry
  setupWithRetry();
}

/**
 * Alternative: Initialize with automatic panel detection
 * Use this if you want to auto-detect the suggested actions panel
 */
export function initializeSuggestedActionsShortcut(): void {
  console.log('🎯 Auto-initializing suggested actions shortcut...');
  
  // Auto-detect and trigger the suggested actions panel
  setupSuggestedActionsShortcut(() => {
    // Try to find and click the suggested actions button/trigger
    const possibleTriggers = [
      'button[data-action="suggested-actions"]',
      '.suggested-actions-trigger',
      '#suggested-actions-btn',
      '[class*="suggested"]',
      '[aria-label*="Suggested Actions"]'
    ];
    
    for (const selector of possibleTriggers) {
      const trigger = document.querySelector(selector) as HTMLElement;
      if (trigger) {
        console.log(`✅ Found suggested actions trigger: ${selector}`);
        trigger.click();
        return;
      }
    }
    
    console.log('⚠️ Could not find suggested actions trigger, attempting direct call...');
    
    // Try to call the function directly if available
    if (typeof (window as any).displaySuggestedActions === 'function') {
      (window as any).displaySuggestedActions();
    } else {
      console.error('❌ No suggested actions handler found');
    }
  });
}