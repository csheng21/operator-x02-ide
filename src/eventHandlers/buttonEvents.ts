// eventHandlers/buttonEvents.ts - Contains event handlers for buttons

import { 
  newChatButton, 
  sendButton, 
  exportButton, 
  importButton, 
  saveApiKeyButton
} from '../ui';

import { 
  createNewConversation, 
  sendMessage, 
  exportConversations, 
  importConversations 
} from '../conversation';

import { getDomElement } from './domUtils';

// Set up button event listeners
export function setupButtonEventListeners(): void {
  console.log('Setting up button event listeners...');
  
  // New chat button
  setupButtonHandler(
    newChatButton,
    'new-chat-btn',
    'New chat button',
    (event) => {
      event.preventDefault();
      createNewConversation();
    }
  );

  // Send message button
  setupButtonHandler(
    sendButton,
    'send-btn',
    'Send button',
    (event) => {
      event.preventDefault();
      sendMessage();
    }
  );

  // Export button
  setupButtonHandler(
    exportButton,
    'export-btn',
    'Export button',
    () => {
      exportConversations();
    }
  );

  // Import button
  setupButtonHandler(
    importButton,
    'import-btn',
    'Import button',
    () => {
      importConversations();
    }
  );
  
  console.log('Button event listeners set up successfully');
}

// Helper function to set up button event handlers
function setupButtonHandler(
  uiRef: HTMLButtonElement | null, 
  elementId: string, 
  elementName: string,
  handler: (event: Event) => void
): void {
  // Try UI reference first
  if (uiRef) {
    uiRef.addEventListener('click', handler);
    console.log(`${elementName} handler set up (using UI reference)`);
    return;
  }
  
  // Fall back to direct DOM query
  const element = getDomElement(elementId);
  if (element) {
    element.addEventListener('click', handler);
    console.log(`${elementName} handler set up (using DOM reference)`);
  } else {
    console.error(`${elementName} not found`);
  }
}