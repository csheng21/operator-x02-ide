// setupClarificationShortcut.ts
// Follow the EXACT same pattern as your "+" project scaffolding shortcut

import { detectAmbiguity, ClarificationRequest } from './clarificationManager';

// Callback to show clarification modal
let onClarificationCallback: ((clarification: ClarificationRequest) => void) | null = null;

/**
 * Initialize the "?" keyboard shortcut
 * Call this in your initialization, same place as initializeProjectScaffolding()
 */
export function initializeClarificationShortcut(
  onShowClarification: (clarification: ClarificationRequest) => void
): void {
  console.log('⌨️ Initializing clarification keyboard shortcut...');
  onClarificationCallback = onShowClarification;
  setupClarificationShortcut();
  console.log('✅ Clarification shortcut initialized');
}

/**
 * Sets up keyboard shortcut: Press "?" to trigger clarification
 * EXACT SAME PATTERN as setupProjectScaffoldingShortcut()
 */
function setupClarificationShortcut(): void {
  console.log('⌨️ Setting up clarification keyboard shortcut...');
  
  // Function to find message input (same selectors as project scaffolding)
  const findMessageInput = (): HTMLInputElement | HTMLTextAreaElement | null => {
    const selectors = [
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
  
  // Retry mechanism (same as project scaffolding)
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
    
    console.log('✅ Message input found, attaching keyboard listener...');
    
    // ═══════════════════════════════════════════════════════════════════════
    // KEYDOWN LISTENER - SAME PATTERN AS "+" SHORTCUT
    // ═══════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keydown', (event: KeyboardEvent) => {
      console.log('🔑 Key pressed:', event.key, 'Value:', messageInput.value);
      
      // Check if "?" key is pressed
      if (event.key === '?' && !event.ctrlKey && !event.altKey) {
        console.log('✨ Question mark detected!');
        
        // Check if input is empty or just "?"
        const currentValue = messageInput.value.trim();
        console.log('📝 Current value:', currentValue);
        
        if (currentValue === '' || currentValue === '?') {
          // ✅ PREVENT DEFAULT - This stops "?" from being typed
          event.preventDefault();
          event.stopPropagation();
          
          console.log('🚀 Triggering clarification modal...');
          
          // Clear input
          messageInput.value = '';
          
          // Trigger input event to notify any listeners
          messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Get clarification and show modal
          const clarification = detectAmbiguity('?');
          
          if (clarification && onClarificationCallback) {
            console.log('✅ Showing clarification modal instantly!');
            onClarificationCallback(clarification);
          } else {
            console.error('❌ Clarification callback not set or detection failed');
          }
          
          console.log('✨ Clarification shortcut triggered successfully!');
        } else {
          console.log('⏭️ Input not empty, allowing "?" to be typed');
        }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // KEYPRESS LISTENER - Backup to prevent "?" from appearing
    // ═══════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keypress', (event: KeyboardEvent) => {
      const currentValue = messageInput.value.trim();
      if (event.key === '?' && (currentValue === '' || currentValue === '?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    
    console.log('✅ Keyboard shortcut successfully set up! Press "?" in the message input.');
  };
  
  // Start setup with retry mechanism
  setupWithRetry();
}

// Export for use
export { setupClarificationShortcut };