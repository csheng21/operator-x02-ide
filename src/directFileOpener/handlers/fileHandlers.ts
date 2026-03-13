// src/directFileOpener/handlers/fileHandlers.ts

/**
 * Set up click handlers for all file items
 */
export function setupFileClickHandlers(): void {
  const fileItems = document.querySelectorAll('.file-item:not(.directory)');
  
  fileItems.forEach(item => {
    // Check if we've already attached our handler
    if (item.classList.contains('direct-handler-attached')) {
      return;
    }
    
    // Add our class to mark it
    item.classList.add('direct-handler-attached');
    
    // Add the handler
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Get file path
      const filePath = item.getAttribute('data-path');
      if (!filePath) return;
      
      // Highlight selected file
      highlightSelectedItem(item);
      
      // Create and dispatch event
      triggerFileSelectedEvent(filePath);
    });
  });
}

/**
 * Highlight the selected file item and remove highlights from others
 */
function highlightSelectedItem(item: Element): void {
  document.querySelectorAll('.file-item').forEach(el => {
    el.classList.remove('selected');
  });
  item.classList.add('selected');
}

/**
 * Create and dispatch a file-selected event
 */
function triggerFileSelectedEvent(filePath: string): void {
  const event = new CustomEvent('file-selected', {
    detail: { path: filePath }
  });
  document.dispatchEvent(event);
}