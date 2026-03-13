// src/directFileOpener/handlers/directoryHandlers.ts
import { getMockFilesForDirectory } from '../content/mockFileData';
import { setupFileClickHandlers } from './fileHandlers';

/**
 * Set up click handlers for directory items
 */
export function setupDirectoryClickHandlers(): void {
  const directoryItems = document.querySelectorAll('.file-item.directory');
  
  directoryItems.forEach(item => {
    // Check if we've already attached our handler
    if (item.classList.contains('dir-handler-attached')) {
      return;
    }
    
    // Add our class to mark it
    item.classList.add('dir-handler-attached');
    
    // Add the handler
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Get directory path
      const dirPath = item.getAttribute('data-path');
      if (!dirPath) return;
      
      // Find or create child list
      let childList = item.querySelector('.file-children');
      if (!childList) {
        childList = document.createElement('ul');
        childList.className = 'file-children';
        item.appendChild(childList);
      }
      
      // Toggle visibility
      const isExpanded = childList.style.display !== 'none';
      childList.style.display = isExpanded ? 'none' : 'block';
      
      // Toggle folder icon
      toggleFolderIcon(item, isExpanded);
      
      // If expanding and empty, populate with mock files
      if (!isExpanded && childList.children.length === 0) {
        populateDirectoryContents(dirPath, childList as HTMLElement);
      }
    });
  });
}

/**
 * Toggle the folder icon between open and closed states
 */
function toggleFolderIcon(item: Element, isExpanded: boolean): void {
  const iconElement = item.querySelector('.file-icon');
  if (iconElement) {
    iconElement.textContent = isExpanded ? '📁' : '📂';
  }
}

/**
 * Populate directory contents with mock files
 */
export function populateDirectoryContents(dirPath: string, container: HTMLElement): void {
  const dirName = dirPath.split('/').pop() || '';
  const mockFiles = getMockFilesForDirectory(dirName);
  
  // Create and add items to container
  mockFiles.forEach(file => {
    const item = document.createElement('li');
    item.className = `file-item ${file.isDirectory ? 'directory' : 'file'}`;
    item.dataset.path = `${dirPath}/${file.name}`;
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = file.isDirectory ? '📁' : '📄';
    
    // Create name
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = file.name;
    
    // Add to item
    item.appendChild(icon);
    item.appendChild(name);
    
    // Add to container
    container.appendChild(item);
  });
  
  // Set up click handlers for newly created items
  setTimeout(() => {
    setupFileClickHandlers();
    setupDirectoryClickHandlers();
  }, 0);
}