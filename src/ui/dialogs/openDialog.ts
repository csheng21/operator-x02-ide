// src/ui/dialogs/openDialog.ts
import { FileInfo } from '../../types/fileTypes';
import { mockFileSystem } from '../../utils/mockFileSystem';
import { generateMockPath } from '../../utils/browserUtils';

/**
 * Show a custom Open file dialog for browser environments
 * @param callback Callback function with selected file info or null if cancelled
 */
export function showOpenFileDialog(callback: (fileInfo: FileInfo | null) => void) {
  // Create an input element and hide it
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.ts,.js,.html,.css,.json,.txt,.py,.md';
  input.style.display = 'none';
  
  // Add to DOM temporarily
  document.body.appendChild(input);
  
  // Handle file selection
  input.onchange = () => {
    if (!input.files || input.files.length === 0) {
      document.body.removeChild(input);
      callback(null);
      return;
    }
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string || '';
      const mockPath = generateMockPath(file.name);
      
      // Store in mock system
      mockFileSystem[mockPath] = content;
      
      document.body.removeChild(input);
      callback({
        path: mockPath,
        content,
        name: file.name
      });
    };
    
    reader.onerror = () => {
      document.body.removeChild(input);
      callback(null);
    };
    
    reader.readAsText(file);
  };
  
  // Handle cancellation
  input.oncancel = () => {
    document.body.removeChild(input);
    callback(null);
  };
  
  // Trigger file dialog
  input.click();
}

/**
 * Show a custom dialog with multiple file types
 * @param acceptTypes Array of file extensions to accept
 * @param callback Callback function with selected file info or null if cancelled
 */
export function showCustomOpenDialog(acceptTypes: string[], callback: (fileInfo: FileInfo | null) => void) {
  // Create an input element and hide it
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = acceptTypes.map(ext => ext.startsWith('.') ? ext : `.${ext}`).join(',');
  input.style.display = 'none';
  
  // Add to DOM temporarily
  document.body.appendChild(input);
  
  // Handle file selection
  input.onchange = () => {
    if (!input.files || input.files.length === 0) {
      document.body.removeChild(input);
      callback(null);
      return;
    }
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string || '';
      const mockPath = generateMockPath(file.name);
      
      // Store in mock system
      mockFileSystem[mockPath] = content;
      
      document.body.removeChild(input);
      callback({
        path: mockPath,
        content,
        name: file.name
      });
    };
    
    reader.onerror = () => {
      document.body.removeChild(input);
      callback(null);
    };
    
    reader.readAsText(file);
  };
  
  // Trigger file dialog
  input.click();
}