// src/utils/fileUtils.ts

/**
 * Get language identifier from file extension
 * @param extension File extension without the dot
 * @returns Language name
 */
export function getLanguageFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case 'js':
      return 'JavaScript';
    case 'ts':
      return 'TypeScript';
    case 'py':
      return 'Python';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'json':
      return 'JSON';
    case 'md':
      return 'Markdown';
    default:
      return 'Plain Text';
  }
}

/**
 * Get default filename based on language
 * @param language Language identifier
 * @returns Default filename for that language
 */
export function getDefaultFileName(language: string): string {
  switch (language) {
    case 'python':
      return 'hello.py';
    case 'javascript':
      return 'script.js';
    case 'typescript':
      return 'script.ts';
    case 'html':
      return 'index.html';
    case 'css':
      return 'styles.css';
    case 'markdown':
      return 'readme.md';
    case 'json':
      return 'data.json';
    default:
      return 'document.txt';
  }
}

/**
 * Determine language from file path
 * @param path File path
 * @returns Monaco editor language identifier
 */
export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'php': 'php',
    'rb': 'ruby',
    'rs': 'rust',
    'swift': 'swift',
    'sh': 'shell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql'
  };

  return languageMap[extension] || 'plaintext';
}

/**
 * Get file icon for file explorer based on file type
 * @param path File path
 * @returns Icon character or class to use
 */
export function getFileIcon(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  
  // Map extensions to icons
  const iconMap: Record<string, string> = {
    // Code files
    'js': '📄 JS',
    'ts': '📄 TS',
    'html': '📄 HTML',
    'css': '📄 CSS',
    'py': '📄 PY',
    'java': '📄 JAVA',
    
    // Config files
    'json': '⚙️',
    'yml': '⚙️',
    'yaml': '⚙️',
    'xml': '⚙️',
    'toml': '⚙️',
    
    // Doc files
    'md': '📝',
    'txt': '📝',
    'pdf': '📑',
    'doc': '📝',
    'docx': '📝',
    
    // Image files
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'gif': '🖼️',
    'svg': '🖼️',
    
    // Default
    'default': '📄'
  };
  
  return iconMap[extension] || iconMap.default;
}

/**
 * Normalize a file path for consistent usage
 * @param path File path
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  // Replace backslashes with forward slashes
  let normalized = path.replace(/\\/g, '/');
  
  // Remove trailing slash if not root
  if (normalized.endsWith('/') && normalized !== '/') {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Extract filename from path
 * @param path File path
 * @returns Filename without path
 */
export function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

/**
 * Get file extension from path
 * @param path File path
 * @returns Extension without the dot
 */
export function getFileExtension(path: string): string {
  const fileName = getFileName(path);
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}