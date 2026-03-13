// utils/mockFileSystem.ts
// Mock file system for browser environment - stores files in memory

// Types
export interface MockFileEntry {
  path: string;
  content: string;
  lastModified: Date;
  size: number;
  type: 'file' | 'directory';
  children?: string[];
}

export interface MockFileSystem {
  [path: string]: string | MockFileEntry;
}

// Global mock file system storage
export const mockFileSystem: MockFileSystem = {};

// File system operations
export class MockFileSystemManager {
  
  /**
   * Write file to mock file system
   */
  static writeFile(path: string, content: string): void {
    const normalizedPath = this.normalizePath(path);
    
    // Store as simple string for backwards compatibility
    mockFileSystem[normalizedPath] = content;
    
    // Also store as entry for metadata
    const entry: MockFileEntry = {
      path: normalizedPath,
      content,
      lastModified: new Date(),
      size: content.length,
      type: 'file'
    };
    
    mockFileSystem[`${normalizedPath}:meta`] = entry;
    console.log(`Mock file written: ${normalizedPath} (${content.length} bytes)`);
  }
  
  /**
   * Read file from mock file system
   */
  static readFile(path: string): string | null {
    const normalizedPath = this.normalizePath(path);
    const content = mockFileSystem[normalizedPath];
    
    if (typeof content === 'string') {
      return content;
    }
    
    if (content && typeof content === 'object' && content.type === 'file') {
      return content.content;
    }
    
    return null;
  }
  
  /**
   * Check if file exists
   */
  static fileExists(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    return normalizedPath in mockFileSystem;
  }
  
  /**
   * Get all files recursively
   */
  static getAllFiles(): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    
    for (const [path, value] of Object.entries(mockFileSystem)) {
      if (!path.includes(':meta')) {
        let content = '';
        
        if (typeof value === 'string') {
          content = value;
        } else if (value && typeof value === 'object' && value.type === 'file') {
          content = value.content;
        }
        
        if (content) {
          files.push({ path, content });
        }
      }
    }
    
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }
  
  /**
   * Clear all files
   */
  static clear(): void {
    for (const key in mockFileSystem) {
      delete mockFileSystem[key];
    }
    console.log('Mock file system cleared');
  }
  
  /**
   * Normalize file path
   */
  private static normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .replace(/^\//, '') // Remove leading slash
      .replace(/\/$/, ''); // Remove trailing slash
  }
}

// Convenience functions for backwards compatibility
export function writeFile(path: string, content: string): void {
  MockFileSystemManager.writeFile(path, content);
}

export function readFile(path: string): string | null {
  return MockFileSystemManager.readFile(path);
}

export function fileExists(path: string): boolean {
  return MockFileSystemManager.fileExists(path);
}

export function clearFileSystem(): void {
  MockFileSystemManager.clear();
}

// Initialize with some default files for the IDE
export function initializeDefaultFiles(): void {
  const defaultFiles = {
    'welcome.md': `# Welcome to Deepseek IDE

This is a powerful AI-assisted development environment that runs in your browser.

## Features

- 📁 **Folder Management**: Open folders from your computer or use templates
- 🎨 **Monaco Editor**: Professional code editing with syntax highlighting  
- 🤖 **AI Assistant**: Get coding help and suggestions
- 🔧 **Plugin System**: Extensible with custom plugins
- 🐍 **Python Support**: Built-in Python development tools
- ⚛️ **React/Vue**: Frontend framework support

## Getting Started

1. **Open a Folder**: Click the "Open Folder" button or drag & drop a folder
2. **Create Files**: Use the file explorer to create new files
3. **Start Coding**: Edit files with full syntax highlighting and IntelliSense
4. **Ask AI**: Use the AI assistant for help with your code

## Keyboard Shortcuts

- **Ctrl/Cmd+O**: Open folder
- **Ctrl/Cmd+N**: New file
- **Ctrl/Cmd+S**: Save file
- **Drag & Drop**: Works anywhere in the IDE

Happy coding! 🚀
`,
    
    'examples/hello-world.js': `// Hello World Example
console.log('Hello, World!');

// Function example
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Developer'));

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);
`,
    
    'examples/sample.py': `# Python Example
def hello_world():
    """A simple hello world function"""
    print("Hello, World!")

def fibonacci(n):
    """Generate fibonacci sequence up to n"""
    a, b = 0, 1
    sequence = []
    
    while a < n:
        sequence.append(a)
        a, b = b, a + b
    
    return sequence

if __name__ == "__main__":
    hello_world()
    print("Fibonacci sequence:", fibonacci(50))
`,
    
    'config/settings.json': JSON.stringify({
      "editor": {
        "theme": "vs-dark",
        "fontSize": 14,
        "tabSize": 2,
        "wordWrap": "on"
      },
      "ai": {
        "provider": "deepseek",
        "model": "deepseek-coder",
        "enabled": true
      },
      "files": {
        "autoSave": true,
        "encoding": "utf8"
      }
    }, null, 2)
  };
  
  // Only initialize if file system is empty
  const files = MockFileSystemManager.getAllFiles();
  if (files.length === 0) {
    for (const [path, content] of Object.entries(defaultFiles)) {
      MockFileSystemManager.writeFile(path, content);
    }
    
    console.log('Default files initialized in mock file system');
  }
}

// Add this function to utils/mockFileSystem.ts

/**
 * List all mock files (alias for getAllFiles for backwards compatibility)
 */
export function listMockFiles(): { path: string; content: string }[] {
  return MockFileSystemManager.getAllFiles();
}

/**
 * Get mock file structure as tree
 */
export function getMockFileStructure(): any[] {
  const files = MockFileSystemManager.getAllFiles();
  const tree: any[] = [];
  
  files.forEach(file => {
    const pathParts = file.path.split('/');
    let currentLevel = tree;
    
    pathParts.forEach((part, index) => {
      const isLast = index === pathParts.length - 1;
      const existing = currentLevel.find(item => item.name === part);
      
      if (existing) {
        if (!isLast) {
          currentLevel = existing.children;
        }
      } else {
        const newItem = {
          name: part,
          path: pathParts.slice(0, index + 1).join('/'),
          isDirectory: !isLast,
          children: isLast ? undefined : []
        };
        
        currentLevel.push(newItem);
        
        if (!isLast) {
          currentLevel = newItem.children;
        }
      }
    });
  });
  
  return tree;
}
// Initialize default files when module loads
initializeDefaultFiles();