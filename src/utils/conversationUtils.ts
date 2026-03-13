// utils/conversationUtils.ts - Conversation-related utilities

import { Conversation } from '../types';

// Start renaming a conversation
export function startRenamingConversation(
  conversationId: string, 
  conversations: Conversation[], 
  renderConversationList: () => void,
  saveConversations: () => void
): void {
  const conversationItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
  if (!conversationItem) return;

  const titleElement = conversationItem.querySelector('.conversation-title');
  if (!titleElement) return;

  const currentTitle = titleElement.textContent || '';
  
  // Replace title with input
  const inputElement = document.createElement('input');
  inputElement.type = 'text';
  inputElement.className = 'rename-input';
  inputElement.value = currentTitle;
  titleElement.innerHTML = '';
  titleElement.appendChild(inputElement);
  
  // Focus the input
  inputElement.focus();
  
  // Handle input events
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTitle = inputElement.value.trim();
      
      // Update conversation title
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation && newTitle) {
        conversation.title = newTitle;
        saveConversations();
        renderConversationList();
      }
    } else if (e.key === 'Escape') {
      renderConversationList();
    }
  });
  
  // Handle blur event
  inputElement.addEventListener('blur', () => {
    const newTitle = inputElement.value.trim();
    
    // Update conversation title
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation && newTitle) {
      conversation.title = newTitle;
      saveConversations();
    }
    
    renderConversationList();
  });
}