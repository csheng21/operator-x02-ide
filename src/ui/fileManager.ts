import { invoke } from '@tauri-apps/api/core';

/**
 * Function maintained for compatibility, but no longer adds a button
 */
export function addFileManagerButton(): void {
  // Function intentionally left empty to disable the button
  console.log('File manager button disabled by user request');
  return;
}

/**
 * Show the file manager dialog - kept for API compatibility
 * but won't be accessible from the removed button
 */
export function showFileManager(): void {
  // Create a modal dialog
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = '#fff';
  modal.style.padding = '20px';
  modal.style.borderRadius = '5px';
  modal.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  modal.style.zIndex = '2000';
  modal.style.maxWidth = '80%';
  modal.style.maxHeight = '80%';
  modal.style.overflow = 'auto';
  
  // Add a title
  const title = document.createElement('h2');
  title.textContent = 'File Manager';
  modal.appendChild(title);
  
  // Add a note about browser limitations
  const note = document.createElement('p');
  note.textContent = 'Browser security prevents automatic file overwriting. Use these options to manage duplicates:';
  modal.appendChild(note);
  
  // Add instructions for manual cleanup
  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <h3>To clean up duplicate files:</h3>
    <ol>
      <li>Open your Downloads folder</li>
      <li>Keep only the most recent version of each file</li>
      <li>Delete files with suffixes like (1), (2), etc.</li>
    </ol>
    <div style="margin-top: 15px;">
      <button id="openDownloads" style="background:#444;color:white;border:none;padding:8px 12px;cursor:pointer;">Open Downloads Folder</button>
      <button id="closeManager" style="float:right;background:#444;color:white;border:none;padding:8px 12px;cursor:pointer;">Close</button>
    </div>
  `;
  modal.appendChild(instructions);
  
  // Add the modal to the document
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('openDownloads')?.addEventListener('click', () => {
    // Try to open downloads folder using execute_command
    try {
      const isWindows = navigator.platform.indexOf('Win') > -1;
      const command = isWindows 
        ? 'start %USERPROFILE%\\Downloads' 
        : 'open ~/Downloads';
        
      invoke('execute_command', {
        command,
        is_powershell: isWindows
      }).catch((e) => {
        console.error('Command error:', e);
        // Fallback - try to use window.open
        window.open('file:///C:/Users/Downloads', '_blank');
      });
    } catch (error) {
      console.error('Failed to open downloads folder:', error);
    }
  });
  
  document.getElementById('closeManager')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}