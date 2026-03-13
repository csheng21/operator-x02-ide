// eventHandlers/inputEvents.ts - Contains event handlers for input elements

import { messageInput, apiKeyInput, apiBaseUrlInput, showCommandHint } from '../ui';
import { sendMessage, createNewConversation } from '../conversation';
import { getDomElement } from './domUtils';
import { currentConversationId } from '../state';

// Set up input event listeners
export function setupInputEventListeners(): void {
  console.log('Setting up input event listeners...');
  
  // Message input (Enter key to send and command hints)
  setupMessageInputHandler();
  
  console.log('Input event listeners set up successfully');
}

// Set up message input event handler
// Set up message input event handler
function setupMessageInputHandler(): void {
  const keydownHandler = (e: KeyboardEvent) => {
    // Enter key to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter key pressed');
      
      // Check if it's a command
      if (messageInput?.value.trim().startsWith('/cmd ') || messageInput?.value.trim().startsWith('/ps ')) {
        const commandText = messageInput.value.trim();
        // Process the command directly
        handleCommandExecution(commandText).then(isCommand => {
          if (isCommand) {
            messageInput.value = '';
          } else {
            // Fall back to normal message sending if not a command
            sendMessage();
          }
        });
      } else {
        // Normal message sending
        sendMessage();
      }
    }
    
    // Command hints
    if (e.key === ' ' && messageInput instanceof HTMLTextAreaElement) {
      if (messageInput.value === '/cmd') {
        // Show command hint in a small overlay
        showCommandHint('CMD command. Example: dir, ipconfig, systeminfo');
      } else if (messageInput.value === '/ps') {
        // Show PowerShell hint in a small overlay
        showCommandHint('PowerShell command. Example: Get-Process, Get-Service, Get-ChildItem');
      }
    }
  };

  // Try UI reference first
  if (messageInput) {
    messageInput.addEventListener('keydown', keydownHandler);
    console.log('Message input handler set up (using UI reference)');
    return;
  }
  
  // Fall back to direct DOM query
  const msgInput = getDomElement('message-input');
  if (msgInput) {
    msgInput.addEventListener('keydown', keydownHandler);
    console.log('Message input handler set up (using DOM reference)');
  } else {
    console.error('Message input not found');
  }
}