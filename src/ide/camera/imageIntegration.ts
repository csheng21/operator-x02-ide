// src/ide/camera/imageIntegration.ts

/**
 * Utilities for integrating camera images with other IDE components
 */

/**
 * Insert an image into the current editor at cursor position
 * @param imageData Base64 encoded image data
 * @param filename Optional filename for the image
 */
export async function insertImageIntoEditor(imageData: string, filename: string = 'camera_capture.png') {
  try {
    // Get active editor instance from Monaco
    const editorInstances = window.monaco?.editor?.getEditors?.() || [];
    if (editorInstances.length === 0) {
      showNotification('error', 'Camera Integration', 'No active editor found');
      return false;
    }
    
    const editor = editorInstances[0]; // Use the first editor or find the active one
    const model = editor.getModel();
    if (!model) {
      showNotification('error', 'Camera Integration', 'No active document in editor');
      return false;
    }
    
    // Get current position and file type
    const position = editor.getPosition();
    const fileExtension = getFileExtension(model.uri.path);
    
    // Generate appropriate code for the file type
    let insertText = '';
    switch (fileExtension) {
      case 'md':
      case 'markdown':
        // Markdown image syntax
        insertText = `![${filename}](${imageData})\n`;
        break;
      case 'html':
      case 'htm':
      case 'jsx':
      case 'tsx':
        // HTML image tag
        insertText = `<img src="${imageData}" alt="${filename}" />\n`;
        break;
      case 'css':
      case 'scss':
        // CSS background image
        insertText = `background-image: url('${imageData}');\n`;
        break;
      default:
        // Default to markdown for unknown types
        insertText = `![${filename}](${imageData})\n`;
    }
    
    // Insert at current position
    editor.executeEdits('camera-integration', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: insertText
      }
    ]);
    
    showNotification('success', 'Camera Integration', 'Image inserted into editor');
    return true;
  } catch (error) {
    console.error('Error inserting image into editor:', error);
    showNotification('error', 'Camera Integration', 'Failed to insert image into editor');
    return false;
  }
}

/**
 * Send an image to the AI Assistant
 * @param imageData Base64 encoded image data
 * @param prompt Optional text prompt to send along with the image
 */
export async function sendImageToAssistant(imageData: string, prompt: string = 'Analyze this image:') {
  try {
    // Find the chat input
    const chatInput = document.getElementById('message-input') as HTMLTextAreaElement;
    if (!chatInput) {
      showNotification('error', 'Camera Integration', 'AI Assistant chat input not found');
      return false;
    }
    
    // Generate markdown with the image
    const markdownWithImage = `${prompt}\n\n![Camera Capture](${imageData})\n`;
    
    // Set the input value
    chatInput.value = markdownWithImage;
    
    // Trigger input event to ensure any listeners update
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Optional: auto-send the message
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
      showNotification('info', 'Camera Integration', 'Image attached to AI Assistant message');
      // Uncomment to auto-send:
      // sendButton.click();
    }
    
    return true;
  } catch (error) {
    console.error('Error sending image to AI Assistant:', error);
    showNotification('error', 'Camera Integration', 'Failed to send image to AI Assistant');
    return false;
  }
}

/**
 * Create a temporary image file on disk 
 * This can be useful for saving the image before inserting it
 * @param imageData Base64 encoded image data
 * @param filename Filename to save as
 * @returns Path to the saved file or null if failed
 */
export async function saveImageToFile(imageData: string, filename: string = 'camera_capture.png'): Promise<string | null> {
  try {
    // Check if we're in Tauri environment and have file system access
    if (window.fs?.writeFile) {
      // Extract base64 data (remove the data:image/png;base64, part)
      const base64Data = imageData.split(',')[1];
      
      // Convert to binary
      const binaryData = atob(base64Data);
      const byteArray = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
      }
      
      // Get temp folder or use downloads folder
      const savePath = await getSaveLocation(filename);
      
      // Write file
      await window.fs.writeFile(savePath, byteArray);
      
      showNotification('success', 'Camera Integration', `Image saved to ${savePath}`);
      return savePath;
    } else {
      // Web fallback - trigger download
      const link = document.createElement('a');
      link.href = imageData;
      link.download = filename;
      link.click();
      
      showNotification('success', 'Camera Integration', 'Image downloaded');
      return null;
    }
  } catch (error) {
    console.error('Error saving image:', error);
    showNotification('error', 'Camera Integration', 'Failed to save image');
    return null;
  }
}

/**
 * Get a path where the image can be saved
 */
async function getSaveLocation(filename: string): Promise<string> {
  // Try to get system temp directory or use a default
  let basePath;
  
  if (window.__systemInfo?.homedir) {
    basePath = `${window.__systemInfo.homedir}/Pictures/DeepseekIDE`;
  } else {
    basePath = '/tmp/DeepseekIDE';
  }
  
  // Create a timestamped filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const fullFilename = `${timestamp}_${filename}`;
  
  return `${basePath}/${fullFilename}`;
}

/**
 * Get file extension from a path
 */
function getFileExtension(path: string): string {
  if (!path) return '';
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Show a notification - implement this based on your notification system
 */
function showNotification(type: string, title: string, message: string) {
  // Import and call your notification function
  // This is a placeholder - replace with your actual implementation
  try {
    // Dynamically import notification module
    import('../layout').then(module => {
      if (typeof module.showNotification === 'function') {
        module.showNotification(type, title, message);
      }
    }).catch(error => {
      console.error('Failed to import showNotification:', error);
      // Fallback notification
      console.log(`${title}: ${message}`);
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}