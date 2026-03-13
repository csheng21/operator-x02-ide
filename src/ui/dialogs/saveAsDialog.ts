// src/ui/dialogs/saveAsDialog.ts

import { isTauriAvailable, generateMockPath } from '../../utils/browserUtils';

/**
 * Show a custom Save As dialog
 * @param defaultFilename Default filename to use
 * @param callback Callback function with selected path or null if cancelled
 */
export function showSaveAsDialog(defaultFilename: string, callback: (path: string | null) => void) {
  // Create the dialog container
  const dialogOverlay = document.createElement('div');
  dialogOverlay.className = 'dialog-overlay';
  dialogOverlay.style.position = 'fixed';
  dialogOverlay.style.top = '0';
  dialogOverlay.style.left = '0';
  dialogOverlay.style.width = '100%';
  dialogOverlay.style.height = '100%';
  dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  dialogOverlay.style.zIndex = '9999';
  dialogOverlay.style.display = 'flex';
  dialogOverlay.style.justifyContent = 'center';
  dialogOverlay.style.alignItems = 'center';

  // Create the dialog content
  const dialogContent = document.createElement('div');
  dialogContent.className = 'dialog-content';
  dialogContent.style.backgroundColor = '#1e1e1e';
  dialogContent.style.borderRadius = '8px';
  dialogContent.style.padding = '20px';
  dialogContent.style.width = '500px';
  dialogContent.style.maxWidth = '90%';
  dialogContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
  dialogContent.style.color = '#ffffff';

  // Create the dialog header
  const dialogHeader = document.createElement('div');
  dialogHeader.className = 'dialog-header';
  dialogHeader.style.marginBottom = '20px';
  dialogHeader.style.display = 'flex';
  dialogHeader.style.justifyContent = 'space-between';
  dialogHeader.style.alignItems = 'center';

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = 'Save As';
  dialogTitle.style.margin = '0';
  dialogTitle.style.fontSize = '18px';

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = '#888';
  closeButton.style.fontSize = '20px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '0';
  closeButton.style.width = '24px';
  closeButton.style.height = '24px';
  closeButton.style.display = 'flex';
  closeButton.style.justifyContent = 'center';
  closeButton.style.alignItems = 'center';
  closeButton.style.borderRadius = '50%';

  closeButton.addEventListener('mouseover', () => {
    closeButton.style.color = '#fff';
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });

  closeButton.addEventListener('mouseout', () => {
    closeButton.style.color = '#888';
    closeButton.style.backgroundColor = 'transparent';
  });

  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialogOverlay);
    callback(null);
  });

  dialogHeader.appendChild(dialogTitle);
  dialogHeader.appendChild(closeButton);

  // Create the dialog body
  const dialogBody = document.createElement('div');
  dialogBody.className = 'dialog-body';

  // Filename input group
  const filenameGroup = document.createElement('div');
  filenameGroup.style.marginBottom = '20px';

  const filenameLabel = document.createElement('label');
  filenameLabel.textContent = 'File Name';
  filenameLabel.style.display = 'block';
  filenameLabel.style.marginBottom = '8px';
  filenameLabel.style.color = '#bbb';

  const filenameInput = document.createElement('input');
  filenameInput.type = 'text';
  filenameInput.value = defaultFilename;
  filenameInput.style.width = '100%';
  filenameInput.style.padding = '8px 12px';
  filenameInput.style.backgroundColor = '#2a2a2a';
  filenameInput.style.border = '1px solid #444';
  filenameInput.style.borderRadius = '4px';
  filenameInput.style.color = '#fff';
  filenameInput.style.fontSize = '14px';
  filenameInput.style.boxSizing = 'border-box';

  filenameGroup.appendChild(filenameLabel);
  filenameGroup.appendChild(filenameInput);

  // Location input group
  const locationGroup = document.createElement('div');
  locationGroup.style.marginBottom = '20px';

  const locationLabel = document.createElement('label');
  locationLabel.textContent = 'Location';
  locationLabel.style.display = 'block';
  locationLabel.style.marginBottom = '8px';
  locationLabel.style.color = '#bbb';

  const locationInputContainer = document.createElement('div');
  locationInputContainer.style.display = 'flex';
  locationInputContainer.style.gap = '8px';

  const locationInput = document.createElement('input');
  locationInput.type = 'text';
  locationInput.value = 'C:\\Users\\Documents';
  locationInput.style.flex = '1';
  locationInput.style.padding = '8px 12px';
  locationInput.style.backgroundColor = '#2a2a2a';
  locationInput.style.border = '1px solid #444';
  locationInput.style.borderRadius = '4px';
  locationInput.style.color = '#fff';
  locationInput.style.fontSize = '14px';

  const browseButton = document.createElement('button');
  browseButton.textContent = 'Browse';
  browseButton.style.padding = '8px 12px';
  browseButton.style.backgroundColor = '#444';
  browseButton.style.border = 'none';
  browseButton.style.borderRadius = '4px';
  browseButton.style.color = '#fff';
  browseButton.style.cursor = 'pointer';
  browseButton.style.fontSize = '14px';

  browseButton.addEventListener('mouseover', () => {
    browseButton.style.backgroundColor = '#555';
  });

  browseButton.addEventListener('mouseout', () => {
    browseButton.style.backgroundColor = '#444';
  });

  // Try to use Tauri dialog if available, otherwise use mock folder selection
  browseButton.addEventListener('click', async () => {
    try {
      if (isTauriAvailable()) {
        try {
          // Import dialog API dynamically
          const dialog = await import('@tauri-apps/plugin-dialog');
          // Show folder picker
          const folderPath = await dialog.open({
            directory: true, 
            multiple: false,
            title: 'Select folder to save'
          });
          
          if (folderPath) {
            locationInput.value = folderPath as string;
          }
        } catch (error) {
          console.error('Error using Tauri folder dialog:', error);
          // Mock folder selection
          locationInput.value = 'C:\\Users\\Documents\\' + Math.random().toString(36).substring(2, 7);
        }
      } else {
        // Mock folder selection in browser environment
        locationInput.value = 'C:\\Users\\Documents\\' + Math.random().toString(36).substring(2, 7);
      }
    } catch (error) {
      console.error('Error in folder browse:', error);
      // Mock folder selection as fallback
      locationInput.value = 'C:\\Users\\Documents\\' + Math.random().toString(36).substring(2, 7);
    }
  });

  locationInputContainer.appendChild(locationInput);
  locationInputContainer.appendChild(browseButton);

  locationGroup.appendChild(locationLabel);
  locationGroup.appendChild(locationInputContainer);

  // Add fields to dialog body
  dialogBody.appendChild(filenameGroup);
  dialogBody.appendChild(locationGroup);

  // Create the dialog footer with action buttons
  const dialogFooter = document.createElement('div');
  dialogFooter.className = 'dialog-footer';
  dialogFooter.style.display = 'flex';
  dialogFooter.style.justifyContent = 'flex-end';
  dialogFooter.style.gap = '10px';
  dialogFooter.style.marginTop = '20px';

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = 'transparent';
  cancelButton.style.border = '1px solid #444';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.color = '#fff';
  cancelButton.style.cursor = 'pointer';
  cancelButton.style.fontSize = '14px';

  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  });

  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = 'transparent';
  });

  cancelButton.addEventListener('click', () => {
    document.body.removeChild(dialogOverlay);
    callback(null);
  });

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.padding = '8px 16px';
  saveButton.style.backgroundColor = '#4CAF50';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '4px';
  saveButton.style.color = '#fff';
  saveButton.style.cursor = 'pointer';
  saveButton.style.fontSize = '14px';

  saveButton.addEventListener('mouseover', () => {
    saveButton.style.backgroundColor = '#45a049';
  });

  saveButton.addEventListener('mouseout', () => {
    saveButton.style.backgroundColor = '#4CAF50';
  });

  saveButton.addEventListener('click', () => {
    const filename = filenameInput.value.trim();
    const location = locationInput.value.trim();
    
    if (!filename) {
      // Show error for empty filename
      filenameInput.style.border = '1px solid #ff5555';
      setTimeout(() => {
        filenameInput.style.border = '1px solid #444';
      }, 3000);
      return;
    }
    
    document.body.removeChild(dialogOverlay);
    
    // Combine location and filename - ensure exact path is used
    let fullPath = location;
    if (!fullPath.endsWith('/') && !fullPath.endsWith('\\')) {
      fullPath += '\\';
    }
    fullPath += filename;
    
    callback(fullPath);
  });

  dialogFooter.appendChild(cancelButton);
  dialogFooter.appendChild(saveButton);

  // Assemble the dialog
  dialogContent.appendChild(dialogHeader);
  dialogContent.appendChild(dialogBody);
  dialogContent.appendChild(dialogFooter);
  dialogOverlay.appendChild(dialogContent);

  // Add dialog to the page
  document.body.appendChild(dialogOverlay);

  // Focus the filename input
  setTimeout(() => {
    filenameInput.focus();
    filenameInput.select();
  }, 0);
}