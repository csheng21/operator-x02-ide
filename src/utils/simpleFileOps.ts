// src/utils/simpleFileOps.ts

export async function saveFileToLocal(content: string, fileName: string): Promise<string | null> {
  console.log('Attempting to save file:', fileName);
  
  // Check if we have a working Tauri environment
  const hasTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  
  // Known correct path for saving files
  const correctUserPath = 'C:\\Users\\hi';
  
  if (hasTauri) {
    try {
      // Try direct hardcoded path first - most reliable approach
      if (window.__TAURI__.fs && typeof window.__TAURI__.fs.writeTextFile === 'function') {
        try {
          const directPath = `${correctUserPath}\\Downloads\\${fileName}`;
          console.log('Attempting to save directly to:', directPath);
          
          await window.__TAURI__.fs.writeTextFile(directPath, content);
          console.log('File saved successfully at direct path:', directPath);
          return directPath;
        } catch (directError) {
          console.error('Error saving to direct path:', directError);
          // Continue to other methods if this fails
        }
      }
      
      // Try direct invoke command as fallback
      if (window.__TAURI__.invoke) {
        try {
          // Try our custom invoke command if available
          const savePath = await window.__TAURI__.invoke('write_file_to_downloads', { 
            fileName, 
            content 
          });
          console.log('File saved via invoke command to:', savePath);
          return savePath as string;
        } catch (invokeError) {
          console.error('Error with invoke command:', invokeError);
        }
      }
      
      // Try to use Downloads directory as fallback
      if (window.__TAURI__.path && typeof window.__TAURI__.path.downloadDir === 'function') {
        try {
          const downloadDir = await window.__TAURI__.path.downloadDir();
          console.log('Download directory:', downloadDir);
          
          // Fix path with known correct username
          let fixedDownloadDir = downloadDir;
          const incorrectUsernameMatch = downloadDir.match(/C:\\Users\\([^\\]+)\\/);
          if (incorrectUsernameMatch && incorrectUsernameMatch[1] !== 'hi') {
            fixedDownloadDir = downloadDir.replace(`C:\\Users\\${incorrectUsernameMatch[1]}\\`, `C:\\Users\\hi\\`);
            console.log('Fixed download directory path:', fixedDownloadDir);
          }
          
          const filePath = `${fixedDownloadDir}/${fileName}`;
          console.log('Attempting to save file to:', filePath);
          
          // Try to write file using fs API
          if (window.__TAURI__.fs && typeof window.__TAURI__.fs.writeTextFile === 'function') {
            try {
              await window.__TAURI__.fs.writeTextFile(filePath, content);
              console.log('File saved successfully at:', filePath);
              return filePath;
            } catch (fsError) {
              console.error('Error writing file with Tauri FS:', fsError);
            }
          }
        } catch (pathError) {
          console.error('Error with download directory:', pathError);
        }
      }
    } catch (tauriError) {
      console.error('Tauri error:', tauriError);
    }
  }
  
  // Browser fallback
  console.log('Using browser fallback for file save');
  try {
    // Create a blob and download link
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return `Downloads/${fileName} (browser fallback)`;
  } catch (browserError) {
    console.error('Browser download failed:', browserError);
    return null;
  }
}

export async function openFileFromLocal(): Promise<{ content: string, name: string } | null> {
  console.log('Attempting to open file');
  
  // Check if we have a working Tauri environment
  const hasTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
  
  // Known correct path for files
  const correctUserPath = 'C:\\Users\\hi';
  
  if (hasTauri) {
    // Try direct invoke first
    if (window.__TAURI__.invoke) {
      try {
        const result = await window.__TAURI__.invoke('open_file_from_dialog');
        if (result && typeof result === 'object' && 'content' in result && 'name' in result) {
          return {
            content: result.content as string,
            name: result.name as string
          };
        }
      } catch (invokeError) {
        console.error('Tauri invoke error:', invokeError);
        // Continue to next method if this fails
      }
    }
    
    // Try dialog API
    if (window.__TAURI__.dialog && typeof window.__TAURI__.dialog.open === 'function') {
      try {
        const filePath = await window.__TAURI__.dialog.open({
          multiple: false,
          filters: [{
            name: 'All Files',
            extensions: ['*']
          }]
        });
        
        if (!filePath) {
          console.log('File dialog cancelled');
          return null;
        }
        
        // Fix path with known correct username
        let fixedPath = typeof filePath === 'string' ? filePath : filePath[0];
        console.log('Original file path:', fixedPath);
        
        const incorrectUsernameMatch = fixedPath.match(/C:\\Users\\([^\\]+)\\/);
        if (incorrectUsernameMatch && incorrectUsernameMatch[1] !== 'hi') {
          fixedPath = fixedPath.replace(`C:\\Users\\${incorrectUsernameMatch[1]}\\`, `C:\\Users\\hi\\`);
          console.log('Fixed file path:', fixedPath);
        }
        
        // Try to read the file
        if (window.__TAURI__.fs && typeof window.__TAURI__.fs.readTextFile === 'function') {
          try {
            console.log('Attempting to read file from:', fixedPath);
            const content = await window.__TAURI__.fs.readTextFile(fixedPath);
            const name = fixedPath.split(/[/\\]/).pop() || 'untitled';
            return { content, name };
          } catch (readError) {
            console.error('Error reading file from fixed path:', readError);
            
            // If reading from fixed path fails, try reading from the original path
            try {
              console.log('Attempting to read from original path:', filePath);
              const originalPath = typeof filePath === 'string' ? filePath : filePath[0];
              const content = await window.__TAURI__.fs.readTextFile(originalPath);
              const name = originalPath.split(/[/\\]/).pop() || 'untitled';
              return { content, name };
            } catch (originalPathError) {
              console.error('Error reading from original path:', originalPathError);
            }
          }
        }
      } catch (dialogError) {
        console.error('Dialog open error:', dialogError);
      }
    }
  }
  
  // Browser fallback
  console.log('Using browser fallback for file open');
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.js,.ts,.html,.css,.json,.md';
    
    input.onchange = (event) => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          content: reader.result as string,
          name: file.name
        });
      };
      
      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        resolve(null);
      };
      
      reader.readAsText(file);
    };
    
    // Handle cancel
    input.oncancel = () => {
      resolve(null);
    };
    
    // Trigger file dialog
    input.click();
  });
}