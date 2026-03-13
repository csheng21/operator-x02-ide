// src/ide/fileExplorer/fileIconUtils.ts

/**
 * Get appropriate icon for file based on extension
 */
export function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Icons based on file type (using emoji for simplicity)
  switch(extension) {
    case 'js':
      return '📄'; // JavaScript file
    case 'ts':
      return '📄'; // TypeScript file
    case 'tsx':
    case 'jsx':
      return '📄'; // React component
    case 'html':
      return '📄'; // HTML file
    case 'css':
      return '📄'; // CSS file
    case 'json':
      return '📄'; // JSON file
    case 'md':
      return '📄'; // Markdown file
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return '🖼️'; // Image file
    default:
      return '📄'; // Generic file
  }
}

/**
 * Get folder icon based on expanded state
 */
export function getFolderIcon(expanded: boolean): string {
  return expanded ? '📂' : '📁';
}