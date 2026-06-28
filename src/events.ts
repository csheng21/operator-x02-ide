// 1. events.ts - Main event handler registration

import { setupButtonEventListeners } from './eventHandlers/buttonEvents';
import { setupInputEventListeners } from './eventHandlers/inputEvents';
import { setupModalEventListeners } from './eventHandlers/modalEvents';
import { setupFileUploadEventListeners } from './eventHandlers/fileEvents';

// Re-export the shared DOM-readiness helper. The real implementation lives in
// eventHandlers/domReady.ts (a dependency-free module) so the handler files can
// import it without creating an import cycle with this file.
export { waitForElement } from './eventHandlers/domReady';

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