// instantClarificationShortcut.ts
// Instant "?" keyboard shortcut - EXACT same pattern as your "+" shortcut

import { detectAmbiguity, ClarificationRequest } from './clarificationManager';

// Callback to show clarification dialog
let clarificationCallback: ((clarification: ClarificationRequest) => void) | null = null;

/**
 * Setup instant "?" keyboard shortcut
 * Follows EXACT same pattern as setupProjectScaffoldingShortcut() from projectScaffoldingUI.ts
 */
export function setupInstantClarificationShortcut(
  onShowClarification: (clarification: ClarificationRequest) => void
): void {
  console.log('⌨️ Setting up instant "?" clarification shortcut...');
  clarificationCallback = onShowClarification;
  
  // Function to find message input (same as project scaffolding)
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
  
  // Setup with retry mechanism (same as project scaffolding)
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
    
    console.log('✅ Message input found, attaching "?" keyboard listener...');
    
    // ═══════════════════════════════════════════════════════════════════════
    // KEYDOWN LISTENER - EXACT SAME PATTERN AS "+" SHORTCUT
    // ═══════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if "?" key is pressed
      if (event.key === '?' && !event.ctrlKey && !event.altKey) {
        console.log('🔑 "?" key detected!');
        
        // Check if input is empty or just contains "?"
        const currentValue = messageInput.value.trim();
        console.log('📝 Current input value:', currentValue);
        
        if (currentValue === '' || currentValue === '?') {
          // ✅ PREVENT DEFAULT - This stops "?" from being typed
          event.preventDefault();
          event.stopPropagation();
          
          console.log('🚀 Triggering instant clarification...');
          
          // Clear input
          messageInput.value = '';
          
          // Trigger input event to notify any listeners
          messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Get clarification and show dialog
          const clarification = detectAmbiguity('?');
          
          if (clarification && clarificationCallback) {
            console.log('✅ Showing clarification dialog instantly!');
            clarificationCallback(clarification);
          } else {
            console.error('❌ Clarification failed or callback not set');
          }
          
          console.log('✨ Instant clarification shortcut executed successfully!');
        } else {
          console.log('⏭️ Input not empty, allowing "?" to be typed normally');
        }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // KEYPRESS LISTENER - Backup prevention
    // ═══════════════════════════════════════════════════════════════════════
    messageInput.addEventListener('keypress', (event: KeyboardEvent) => {
      const currentValue = messageInput.value.trim();
      if (event.key === '?' && (currentValue === '' || currentValue === '?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    
    console.log('✅ Instant "?" keyboard shortcut successfully set up!');
    console.log('💡 Press "?" in empty message input to trigger clarification');
  };
  
  // Start setup with retry
  setupWithRetry();
}