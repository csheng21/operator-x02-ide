// eventHandlers/directHandlers.ts
// Direct DOM event handlers extracted from main.ts

export function setupDirectEventHandlers() {
  console.log('Setting up direct event handlers');
  
  // Send message button
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      console.log('Send button clicked (direct handler)');
      import('../conversation').then(module => {
        module.sendMessage();
      }).catch(err => {
        console.error('Failed to import conversation module:', err);
      });
    });
  } else {
    console.error('Send button not found in DOM');
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('Settings button clicked (direct handler)');
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.style.display = 'block';
      } else {
        console.error('Settings modal not found in DOM');
      }
    });
  }
  
  // Close modal button
  const closeModalBtn = document.querySelector('.close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      console.log('Close modal button clicked (direct handler)');
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.style.display = 'none';
      } else {
        console.error('Settings modal not found in DOM');
      }
    });
  }
  
  // Toggle AI sidebar button
  const toggleAiBtn = document.getElementById('toggle-assistant');
  if (toggleAiBtn) {
    toggleAiBtn.addEventListener('click', () => {
      console.log('Toggle AI panel button clicked');
      const aiPanel = document.querySelector('.assistant-panel');
      if (aiPanel instanceof HTMLElement) {
        if (aiPanel.classList.contains('collapsed')) {
          aiPanel.classList.remove('collapsed');
          toggleAiBtn.textContent = '◀';
        } else {
          aiPanel.classList.add('collapsed');
          toggleAiBtn.textContent = '▶';
        }
      }
    });
  }
  
  // New chat button
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      console.log('New chat button clicked (direct handler)');
      import('../conversation').then(module => {
        module.createNewConversation();
      }).catch(err => {
        console.error('Failed to import conversation module:', err);
      });
    });
  }
  
  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      console.log('Export button clicked (direct handler)');
      import('../conversation').then(module => {
        module.exportConversations();
      }).catch(err => {
        console.error('Failed to import conversation module:', err);
      });
    });
  } else {
    console.error('Export button not found in DOM');
  }
  
  // Import button
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      console.log('Import button clicked (direct handler)');
      import('../conversation').then(module => {
        module.importConversations();
      }).catch(err => {
        console.error('Failed to import conversation module:', err);
      });
    });
  } else {
    console.error('Import button not found in DOM');
  }
  
  // History button
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      console.log('History button clicked');
      const historyModal = document.getElementById('history-modal');
      if (historyModal instanceof HTMLElement) {
        historyModal.style.display = 'block';
      }
    });
  }
  
  console.log('Direct event handlers setup complete');
}