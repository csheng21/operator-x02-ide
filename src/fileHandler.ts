// fileHandler.ts
// Simplified version without direct Tauri API dependencies
export async function uploadFile(options: {
  multiple?: boolean; 
  fileTypes?: string[];
}): Promise<any[]> {
  // Create a file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = options.multiple || false;
  
  if (options.fileTypes && options.fileTypes.length > 0) {
    input.accept = options.fileTypes.map(ext => `.${ext}`).join(',');
  }
  
  // Return a promise that resolves when files are selected
  return new Promise((resolve) => {
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      const results = await Promise.all(files.map(async (file) => {
        // Read file content
        const content = await readFileAsArrayBuffer(file);
        
        return {
          name: file.name,
          path: file.name, // Browser API doesn't provide full path
          type: getFileTypeFromMime(file.type),
          size: file.size,
          content: new Uint8Array(content)
        };
      }));
      
      resolve(results);
    };
    
    // Trigger click
    input.click();
  });
}

// Helper function to read file as ArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Helper function to get file type from MIME type
function getFileTypeFromMime(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.includes('pdf') || mimeType.includes('word') || 
      mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
  return 'binary';
}

// Helper function to determine file type
export function getFileType(extension: string): string {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  const textExtensions = ['txt', 'md', 'json', 'csv', 'html', 'xml', 'js', 'ts', 'css'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (documentExtensions.includes(extension)) return 'document';
  if (textExtensions.includes(extension)) return 'text';
  
  return 'binary';
}

// NEW - always shows KB (no bytes)
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0.0 KB';
  
  // Always convert to KB for files under 1 MB
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  
  // Show MB for larger files
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  // Show GB for very large files
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Helper function to get MIME type from file extension
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}