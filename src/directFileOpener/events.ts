// 1. events.ts - Main event handler registration

import { setupButtonEventListeners } from './eventHandlers/buttonEvents';
import { setupInputEventListeners } from './eventHandlers/inputEvents';
import { setupModalEventListeners } from './eventHandlers/modalEvents';
import { setupFileUploadEventListeners } from './eventHandlers/fileEvents';

// ============================================================================
// SHARED DOM-READINESS HELPER
// ============================================================================
// The chat panel mounts asynchronously, so setup* functions used to run before
// their target elements existed and bailed with console.error ("New chat button
// not found", etc). waitForElement polls briefly for the element and resolves
// when it appears, or null after the timeout. This removes the init-race noise
// without changing main.ts's init sequencing.
export function waitForElement(
  selector: string,
  timeoutMs: number = 8000,
  intervalMs: number = 100
): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const immediate = document.querySelector(selector);
    if (immediate instanceof HTMLElement) {
      resolve(immediate);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}

// Set up all event listeners
export function setupEventListeners(): void {
  console.log('Setting up event listeners...');
  
  // Set up button event listeners (new chat, send, export, import)
  setupButtonEventListeners();
  
  // Set up input event listeners (message input)
  setupInputEventListeners();
  
  // Set up modal event listeners (settings modal)
  setupModalEventListeners();
  
  // Set up file upload listeners
  setupFileUploadEventListeners();
  
  console.log('Event listeners set up successfully');
}

// Re-export necessary functions from sub-modules
export { setupFileUploadEventListeners as setupFileUploadListeners } from './eventHandlers/fileEvents';