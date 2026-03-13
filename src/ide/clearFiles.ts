// Add this function to your fileExplorer.ts file or create a new clearFiles.ts

/**
 * Clears the file explorer when no project is loaded
 */
export function clearFileExplorer(): void {
  console.log('Clearing file explorer');
  
  // Get the file tree container
  const fileTree = document.querySelector('.file-tree');
  if (!fileTree) {
    console.error('File tree container not found');
    return;
  }
  
  // Clear all file nodes
  fileTree.innerHTML = '';
  
  // Add a placeholder message
  const placeholder = document.createElement('div');
  placeholder.className = 'file-tree-placeholder';
  placeholder.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📁</div>
      <div class="empty-message">No project open</div>
      <div class="empty-action">
        <button id="empty-new-project-btn">Create New Project</button>
        <button id="empty-open-project-btn">Open Project</button>
      </div>
    </div>
  `;
  
  // Add some inline styles for the placeholder
  const style = document.createElement('style');
  style.textContent = `
    .file-tree-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      color: #888;
    }
    
    .empty-state {
      text-align: center;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .empty-message {
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .empty-action {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .empty-action button {
      background-color: #2d2d30;
      border: 1px solid #3e3e42;
      color: #cccccc;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .empty-action button:hover {
      background-color: #3e3e42;
    }
  `;
  
  document.head.appendChild(style);
  fileTree.appendChild(placeholder);
  
  // Add event listeners to buttons
  const newProjectBtn = document.getElementById('empty-new-project-btn');
  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      // Show the new project modal
      const newProjectModal = document.getElementById('new-project-modal');
      if (newProjectModal) {
        newProjectModal.style.display = 'block';
      } else {
        console.error('New project modal not found');
        
        // Dispatch a custom event that can be caught elsewhere
        document.dispatchEvent(new CustomEvent('menu-new-project'));
      }
    });
  }
  
  const openProjectBtn = document.getElementById('empty-open-project-btn');
  if (openProjectBtn) {
    openProjectBtn.addEventListener('click', () => {
      // Trigger open project dialog
      if (window.dialog && window.dialog.open) {
        window.dialog.open({
          directory: true,
          multiple: false,
          title: 'Select Project Folder'
        }).then(selected => {
          if (selected) {
            console.log('Selected project folder:', selected);
            // Here you would load the project
            alert('Project would be loaded from: ' + selected);
          }
        }).catch(err => {
          console.error('Error selecting project folder:', err);
        });
      } else {
        // Mock for development
        alert('In the actual application, a folder selection dialog would appear here.');
      }
    });
  }
  
  console.log('File explorer cleared and placeholder added');
}

// Call this function to clear the file explorer
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(clearFileExplorer, 1000);
});

