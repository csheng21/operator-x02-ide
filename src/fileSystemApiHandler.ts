// src/fileSystemApiHandler.ts

// File handle storage
const fileHandles = new Map<string, any>();

/**
 * Initialize File System API functionality
 */
export function initFileSystemAPI(): void {
  console.log('Initializing File System API...');
  
  // Check if the API is supported
  if (!('showOpenFilePicker' in window)) {
    console.log('File System Access API is not supported in this browser');
    return;
  }
  
  // DO NOT ADD VISIBLE BUTTONS - just initialize the background functionality
  
  // Add keyboard shortcut for saving
  document.addEventListener('keydown', function(e) {
    // Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      const currentFileName = localStorage.getItem('currentFileName');
      
      // If file was opened with File System API, use that for saving
      if (currentFileName && fileHandles.has(currentFileName)) {
        e.preventDefault(); // Prevent default save
        saveWithFileSystemAPI();
      }
    }
  });
  
  console.log('File System API initialized successfully');
}

/**
 * Open file with File System Access API
 */
async function openWithFileSystemAPI(): Promise<void> {
  try {
    if (!('showOpenFilePicker' in window)) {
      alert('Your browser doesn\'t support the File System Access API. Try Chrome or Edge.');
      return;
    }
    
    // Open file picker
    // @ts-ignore - TypeScript might not recognize this API
    const [fileHandle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: 'Text Files',
        accept: {
          'text/plain': ['.txt', '.py', '.js', '.ts', '.html', '.css', '.json']
        }
      }]
    });
    
    // Get the file
    const file = await fileHandle.getFile();
    
    // Read the content
    const content = await file.text();
    
    // Store handle for later
    fileHandles.set(file.name, fileHandle);
    
    // Update the editor with content
    const editor = window.monaco?.editor.getEditors()[0];
    if (editor) {
      // Set the content in the editor
      editor.setValue(content);
      
      // Update UI elements
      const pathStatus = document.getElementById('file-path-status');
      if (pathStatus) {
        pathStatus.textContent = `fsapi://${file.name}`;
      }
      
      // Update window title
      document.title = `${file.name} - Deepseek Code IDE`;
      
      // Store for later use
      localStorage.setItem('currentFilePath', `fsapi://${file.name}`);
      localStorage.setItem('currentFileName', file.name);
    }
  } catch (error) {
    console.error('Error opening file with File System Access API:', error);
  }
}

/**
 * Save/overwrite file with File System Access API
 */
async function saveWithFileSystemAPI(): Promise<void> {
  try {
    const editor = window.monaco?.editor.getEditors()[0];
    if (!editor) return;
    
    const content = editor.getValue();
    const currentFileName = localStorage.getItem('currentFileName');
    
    if (!currentFileName || !fileHandles.has(currentFileName)) {
      // Silently try to save using the standard save dialog
      try {
        // @ts-ignore - TypeScript might not recognize this API
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: currentFileName || 'untitled.txt',
          types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt', '.py', '.js', '.ts', '.html', '.css', '.json']
            }
          }]
        });
        
        // Store handle for future use
        fileHandles.set(fileHandle.name, fileHandle);
        
        // Create a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the content
        await writable.write(content);
        
        // Close the stream
        await writable.close();
        
        // Store the filename for future use
        localStorage.setItem('currentFileName', fileHandle.name);
        localStorage.setItem('currentFilePath', `fsapi://${fileHandle.name}`);
        
        // Update UI
        const pathStatus = document.getElementById('file-path-status');
        if (pathStatus) {
          pathStatus.textContent = `fsapi://${fileHandle.name}`;
        }
        
        showSaveNotification(fileHandle.name);
        return;
      } catch (saveError) {
        console.error('Error saving with file picker:', saveError);
        return;
      }
    }
    
    const fileHandle = fileHandles.get(currentFileName);
    
    // Request permission to write
    const options = { mode: 'readwrite' };
    // @ts-ignore
    if ((await fileHandle.queryPermission(options)) !== 'granted') {
      // @ts-ignore
      const permission = await fileHandle.requestPermission(options);
      if (permission !== 'granted') {
        console.error('Permission to write to the file was denied');
        return;
      }
    }
    
    // Create a writable stream
    const writable = await fileHandle.createWritable();
    
    // Write the content
    await writable.write(content);
    
    // Close the stream
    await writable.close();
    
    console.log('File saved successfully!');
    
    // Show a brief notification
    showSaveNotification(currentFileName);
  } catch (error) {
    console.error('Error saving file:', error);
  }
}

/**
 * Show a brief notification when file is saved
 */
function showSaveNotification(fileName: string): void {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#333';
  notification.style.color = '#fff';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.textContent = `File "${fileName}" saved successfully!`;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}