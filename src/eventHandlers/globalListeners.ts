// eventHandlers/globalListeners.ts
// Global event listeners extracted from main.ts

export function setupGlobalFileListener() {
  console.log('Setting up global file click listener');
  document.addEventListener('file-selected', (e) => {
    const detail = (e as CustomEvent).detail;
    console.log('Global file-selected event received:', detail);
    if (detail && detail.path) {
      try {
        // Try to dynamically import and call the editor module
        import('../editor/editorManager.js').then(module => {
          console.log('Editor module imported successfully');
          if (module.openFile) {
            module.openFile(detail.path)
              .then(() => console.log('File opened successfully via global handler'))
              .catch(err => console.error('Error opening file via global handler:', err));
          } else {
            console.error('openFile function not found in editor module');
          }
        }).catch(err => {
          console.error('Failed to import editor module:', err);
        });
      } catch (error) {
        console.error('Error in global file click handler:', error);
      }
    }
  });
}

export function addTestFileButton() {
  console.log('Adding test file open button');
  setTimeout(() => {
    const appDiv = document.querySelector('.ide-layout') || document.body;
    const testButton = document.createElement('button');
    testButton.textContent = 'Test File Open';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '50px';
    testButton.style.right = '50px';
    testButton.style.zIndex = '9999';
    testButton.style.display = 'none'; // Hide in production, only for debugging
    
    testButton.addEventListener('click', () => {
      console.log('Test button clicked');
      const testEvent = new CustomEvent('file-selected', {
        detail: { path: '/src/main.ts' }
      });
      document.dispatchEvent(testEvent);
    });
    
    appDiv.appendChild(testButton);
  }, 2000);
}