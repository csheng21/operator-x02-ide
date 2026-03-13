// noteManager.ts - Note Management System

import { conversationManager } from './conversationManager';
import { formatTime, MessageNote } from './assistantUI';
import { showNotification } from './notificationManager';

// Message notes storage
export const messageNotes = new Map<string, MessageNote>();

export function initializeNoteSystem(): void {
  // Any initialization logic for notes
}

export function showNoteDialog(messageId: string, existingNote?: MessageNote): void {
  const existingDialog = document.getElementById('note-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  const dialogOverlay = document.createElement('div');
  dialogOverlay.id = 'note-dialog';
  dialogOverlay.className = 'note-dialog-overlay';
  dialogOverlay.innerHTML = `
    <div class="note-dialog-container">
      <div class="note-dialog-header">
        <h3>Add Note</h3>
        <button class="note-dialog-close" id="note-dialog-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="note-dialog-body">
        <textarea 
          id="note-input" 
          class="note-input" 
          placeholder="Enter your note or comment about this response..."
          rows="6"
        >${existingNote ? existingNote.content : ''}</textarea>
        ${existingNote ? `<div class="note-metadata">Last updated: ${formatTime(new Date(existingNote.lastUpdated))}</div>` : ''}
      </div>
      <div class="note-dialog-footer">
        ${existingNote ? `<button class="note-delete-btn" id="note-delete-btn">Delete Note</button>` : ''}
        <div class="note-dialog-actions">
          <button class="note-cancel-btn" id="note-cancel-btn">Cancel</button>
          <button class="note-save-btn" id="note-save-btn">Save Note</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(dialogOverlay);

  const noteInput = document.getElementById('note-input') as HTMLTextAreaElement;
  if (noteInput) {
    noteInput.focus();
    noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length);
  }

  // Setup event listeners
  document.getElementById('note-dialog-close')?.addEventListener('click', () => {
    dialogOverlay.remove();
  });

  document.getElementById('note-cancel-btn')?.addEventListener('click', () => {
    dialogOverlay.remove();
  });

  document.getElementById('note-save-btn')?.addEventListener('click', () => {
    const content = noteInput?.value.trim();
    if (content) {
      saveMessageNote(messageId, content);
      updateNoteIndicator(messageId, true);
      showNotification('Note saved', 'success');
    }
    dialogOverlay.remove();
  });

  document.getElementById('note-delete-btn')?.addEventListener('click', () => {
    if (confirm('Delete this note?')) {
      deleteMessageNote(messageId);
      updateNoteIndicator(messageId, false);
      showNotification('Note deleted', 'info');
      dialogOverlay.remove();
    }
  });

  dialogOverlay.addEventListener('click', (e) => {
    if (e.target === dialogOverlay) {
      dialogOverlay.remove();
    }
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      dialogOverlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

export function saveMessageNote(messageId: string, content: string): void {
  const note: MessageNote = {
    content,
    createdAt: messageNotes.get(messageId)?.createdAt || Date.now(),
    lastUpdated: Date.now()
  };
  
  messageNotes.set(messageId, note);
  
  const conv = conversationManager.getCurrentConversation();
  if (conv) {
    const message = conv.messages.find(m => m.id === messageId);
    if (message) {
      message.note = note;
      conversationManager.saveConversations();
    }
  }
}

export function deleteMessageNote(messageId: string): void {
  messageNotes.delete(messageId);
  
  const conv = conversationManager.getCurrentConversation();
  if (conv) {
    const message = conv.messages.find(m => m.id === messageId);
    if (message) {
      delete message.note;
      conversationManager.saveConversations();
    }
  }
}

export function updateNoteIndicator(messageId: string, hasNote: boolean): void {
  const noteBtn = document.querySelector(`[data-message-id="${messageId}"] .note-btn`) as HTMLElement;
  if (noteBtn) {
    noteBtn.setAttribute('data-has-note', hasNote.toString());
    if (hasNote) {
      noteBtn.style.color = '#ffd700';
      noteBtn.title = 'Edit note';
    } else {
      noteBtn.style.color = '';
      noteBtn.title = 'Add note';
    }
  }
}