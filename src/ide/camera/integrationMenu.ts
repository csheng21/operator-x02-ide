// src/ide/camera/cameraManager.ts - Update to initialize API settings

// Add these imports at the top of your file
import { initializeApiSettings } from './apiSettings';
import { initializeScreenshotContextMenu } from './integrationMenu';
import { 
  analyzeImage, 
  enhanceImage, 
  extractTextFromImage, 
  detectObjectsInImage 
} from './apiIntegration';

// Then, modify the createCameraPanel function to add API settings button
// Add this line near the end of the createCameraPanel function:
function createCameraPanel() {
  // Existing code...
  
  // Make panel resizable
  makeResizable(cameraPanel);
  
  // Initialize API settings
  initializeApiSettings(cameraPanel);
  
  // Initialize screenshot context menu
  initializeScreenshotContextMenu();
  
  return cameraPanel;
}

// Add this new function to your cameraManager.ts
/**
 * Process image with API based on selected operation
 * @param imageData The base64 image data
 * @param operation The operation to perform (analyze, enhance, ocr, detect-objects)
 */
async function processImageWithApi(imageData, operation = 'analyze') {
  try {
    let result;
    
    switch (operation) {
      case 'enhance':
        // Show processing notification
        showNotification('info', 'Processing', 'Enhancing image...');
        
        // Process image
        const enhancedImage = await enhanceImage(imageData);
        
        // Update the screenshot with enhanced image
        updateScreenshotWithResult(enhancedImage);
        break;
        
      case 'ocr':
        // Show processing notification
        showNotification('info', 'Processing', 'Extracting text...');
        
        // Process image
        const extractedText = await extractTextFromImage(imageData);
        
        // Show result in a modal
        showTextResultModal('Extracted Text', extractedText);
        break;
        
      case 'detect-objects':
        // Show processing notification
        showNotification('info', 'Processing', 'Detecting objects...');
        
        // Process image
        const detectedObjects = await detectObjectsInImage(imageData);
        
        // Show result in a modal
        showObjectDetectionResult(imageData, detectedObjects);
        break;
        
      case 'analyze':
      default:
        // Show processing notification
        showNotification('info', 'Processing', 'Analyzing image...');
        
        // Process image
        result = await analyzeImage(imageData);
        
        // Show result in modal
        showAnalysisResult(result);
        break;
    }
  } catch (error) {
    console.error(`Error processing image with operation '${operation}':`, error);
    showNotification('error', 'API Processing', `Error: ${error.message}`);
  }
}

/**
 * Update the screenshot with a new image
 */
function updateScreenshotWithResult(newImageData) {
  // Find the screenshot image
  const screenshotContainer = cameraPanel.querySelector('.screenshot-container');
  if (!screenshotContainer) return;
  
  const screenshotImg = screenshotContainer.querySelector('img');
  if (!screenshotImg) return;
  
  // Update the image
  screenshotImg.src = newImageData;
  
  // Show success notification
  showNotification('success', 'Image Processing', 'Image enhanced successfully');
}

/**
 * Show text extraction result in a modal
 */
function showTextResultModal(title, text) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'api-result-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.backgroundColor = 'var(--bg-color, #1e1e1e)';
  content.style.borderRadius = '5px';
  content.style.padding = '20px';
  content.style.width = '500px';
  content.style.maxWidth = '90%';
  content.style.maxHeight = '80%';
  content.style.overflowY = 'auto';
  content.style.position = 'relative';
  
  // Add title
  const titleElement = document.createElement('h2');
  titleElement.textContent = title;
  titleElement.style.margin = '0 0 15px 0';
  titleElement.style.padding = '0 0 10px 0';
  titleElement.style.borderBottom = '1px solid var(--border-color, #333)';
  
  // Add text content
  const textElement = document.createElement('pre');
  textElement.textContent = text || 'No text detected';
  textElement.style.margin = '0';
  textElement.style.padding = '10px';
  textElement.style.backgroundColor = 'var(--code-bg, #252525)';
  textElement.style.border = '1px solid var(--border-color, #333)';
  textElement.style.borderRadius = '3px';
  textElement.style.whiteSpace = 'pre-wrap';
  textElement.style.wordBreak = 'break-word';
  textElement.style.maxHeight = '300px';
  textElement.style.overflowY = 'auto';
  
  // Add action buttons
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';
  actions.style.marginTop = '15px';
  
  // Copy button
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.padding = '6px 12px';
  copyButton.style.backgroundColor = 'var(--btn-secondary-bg, #3c3c3c)';
  copyButton.style.color = 'var(--btn-secondary-color, #e1e1e1)';
  copyButton.style.border = 'none';
  copyButton.style.borderRadius = '3px';
  copyButton.style.cursor = 'pointer';
  
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showNotification('success', 'Clipboard', 'Text copied to clipboard');
      })
      .catch(err => {
        console.error('Error copying text:', err);
        showNotification('error', 'Clipboard', 'Failed to copy text');
      });
  });
  
  // Insert into editor button
  const insertButton = document.createElement('button');
  insertButton.textContent = 'Insert into Editor';
  insertButton.style.padding = '6px 12px';
  insertButton.style.backgroundColor = 'var(--btn-primary-bg, #0e639c)';
  insertButton.style.color = 'var(--btn-primary-color, #ffffff)';
  insertButton.style.border = 'none';
  insertButton.style.borderRadius = '3px';
  insertButton.style.cursor = 'pointer';
  
  insertButton.addEventListener('click', () => {
    // Get the active editor
    const editorInstances = window.monaco?.editor?.getEditors?.() || [];
    if (editorInstances.length > 0) {
      const editor = editorInstances[0];
      const position = editor.getPosition();
      
      editor.executeEdits('camera-integration', [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: text
        }
      ]);
      
      showNotification('success', 'Editor', 'Text inserted into editor');
      modal.remove();
    } else {
      showNotification('error', 'Editor', 'No active editor found');
    }
  });
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '6px 12px';
  closeButton.style.backgroundColor = 'var(--btn-secondary-bg, #3c3c3c)';
  closeButton.style.color = 'var(--btn-secondary-color, #e1e1e1)';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  
  actions.appendChild(copyButton);
  actions.appendChild(insertButton);
  actions.appendChild(closeButton);
  
  // Add top-right close button
  const topCloseButton = document.createElement('button');
  topCloseButton.textContent = '×';
  topCloseButton.style.position = 'absolute';
  topCloseButton.style.top = '10px';
  topCloseButton.style.right = '10px';
  topCloseButton.style.backgroundColor = 'transparent';
  topCloseButton.style.border = 'none';
  topCloseButton.style.color = 'var(--close-btn-color, #999)';
  topCloseButton.style.fontSize = '20px';
  topCloseButton.style.cursor = 'pointer';
  
  topCloseButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Assemble modal
  content.appendChild(titleElement);
  content.appendChild(textElement);
  content.appendChild(actions);
  content.appendChild(topCloseButton);
  modal.appendChild(content);
  
  // Add to document
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Show object detection results
 */
function showObjectDetectionResult(imageData, objects) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'api-result-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.backgroundColor = 'var(--bg-color, #1e1e1e)';
  content.style.borderRadius = '5px';
  content.style.padding = '20px';
  content.style.width = '600px';
  content.style.maxWidth = '90%';
  content.style.maxHeight = '80%';
  content.style.overflowY = 'auto';
  content.style.position = 'relative';
  
  // Add title
  const titleElement = document.createElement('h2');
  titleElement.textContent = 'Detected Objects';
  titleElement.style.margin = '0 0 15px 0';
  titleElement.style.padding = '0 0 10px 0';
  titleElement.style.borderBottom = '1px solid var(--border-color, #333)';
  
  // Add image with overlay
  const imageContainer = document.createElement('div');
  imageContainer.style.position = 'relative';
  imageContainer.style.marginBottom = '15px';
  
  const img = document.createElement('img');
  img.src = imageData;
  img.style.width = '100%';
  img.style.height = 'auto';
  img.style.border = '1px solid var(--border-color, #333)';
  img.style.borderRadius = '3px';
  
  imageContainer.appendChild(img);
  
  // Add object list
  const objectList = document.createElement('div');
  objectList.style.marginBottom = '15px';
  
  if (objects.length === 0) {
    const noObjects = document.createElement('p');
    noObjects.textContent = 'No objects detected';
    noObjects.style.color = 'var(--text-color, #ccc)';
    objectList.appendChild(noObjects);
  } else {
    // Create a table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // Add header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Object', 'Confidence'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      th.style.padding = '8px';
      th.style.textAlign = 'left';
      th.style.borderBottom = '1px solid var(--border-color, #333)';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add data rows
    const tbody = document.createElement('tbody');
    
    objects.forEach(obj => {
      const row = document.createElement('tr');
      
      // Object name
      const nameCell = document.createElement('td');
      nameCell.textContent = obj.name || 'Unknown';
      nameCell.style.padding = '8px';
      nameCell.style.borderBottom = '1px solid var(--border-color, #333)';
      
      // Confidence score
      const confidenceCell = document.createElement('td');
      const confidence = obj.confidence || obj.score || 0;
      confidenceCell.textContent = confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A';
      confidenceCell.style.padding = '8px';
      confidenceCell.style.borderBottom = '1px solid var(--border-color, #333)';
      
      row.appendChild(nameCell);
      row.appendChild(confidenceCell);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    objectList.appendChild(table);
  }
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '6px 12px';
  closeButton.style.backgroundColor = 'var(--btn-secondary-bg, #3c3c3c)';
  closeButton.style.color = 'var(--btn-secondary-color, #e1e1e1)';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'block';
  closeButton.style.marginLeft = 'auto';
  
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Add top-right close button
  const topCloseButton = document.createElement('button');
  topCloseButton.textContent = '×';
  topCloseButton.style.position = 'absolute';
  topCloseButton.style.top = '10px';
  topCloseButton.style.right = '10px';
  topCloseButton.style.backgroundColor = 'transparent';
  topCloseButton.style.border = 'none';
  topCloseButton.style.color = 'var(--close-btn-color, #999)';
  topCloseButton.style.fontSize = '20px';
  topCloseButton.style.cursor = 'pointer';
  
  topCloseButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Assemble modal
  content.appendChild(titleElement);
  content.appendChild(imageContainer);
  content.appendChild(objectList);
  content.appendChild(closeButton);
  content.appendChild(topCloseButton);
  modal.appendChild(content);
  
  // Add to document
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Show generic analysis results
 */
function showAnalysisResult(result) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'api-result-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '9999';
  
  // Create modal content
  const content = document.createElement('div');
  content.style.backgroundColor = 'var(--bg-color, #1e1e1e)';
  content.style.borderRadius = '5px';
  content.style.padding = '20px';
  content.style.width = '600px';
  content.style.maxWidth = '90%';
  content.style.maxHeight = '80%';
  content.style.overflowY = 'auto';
  content.style.position = 'relative';
  
  // Add title
  const titleElement = document.createElement('h2');
  titleElement.textContent = 'Image Analysis Results';
  titleElement.style.margin = '0 0 15px 0';
  titleElement.style.padding = '0 0 10px 0';
  titleElement.style.borderBottom = '1px solid var(--border-color, #333)';
  
  // Format the result for display
  const resultContent = document.createElement('pre');
  resultContent.textContent = JSON.stringify(result, null, 2);
  resultContent.style.margin = '0';
  resultContent.style.padding = '10px';
  resultContent.style.backgroundColor = 'var(--code-bg, #252525)';
  resultContent.style.border = '1px solid var(--border-color, #333)';
  resultContent.style.borderRadius = '3px';
  resultContent.style.whiteSpace = 'pre-wrap';
  resultContent.style.wordBreak = 'break-word';
  resultContent.style.maxHeight = '300px';
  resultContent.style.overflowY = 'auto';
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '6px 12px';
  closeButton.style.backgroundColor = 'var(--btn-secondary-bg, #3c3c3c)';
  closeButton.style.color = 'var(--btn-secondary-color, #e1e1e1)';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'block';
  closeButton.style.marginLeft = 'auto';
  closeButton.style.marginTop = '15px';
  
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Add top-right close button
  const topCloseButton = document.createElement('button');
  topCloseButton.textContent = '×';
  topCloseButton.style.position = 'absolute';
  topCloseButton.style.top = '10px';
  topCloseButton.style.right = '10px';
  topCloseButton.style.backgroundColor = 'transparent';
  topCloseButton.style.border = 'none';
  topCloseButton.style.color = 'var(--close-btn-color, #999)';
  topCloseButton.style.fontSize = '20px';
  topCloseButton.style.cursor = 'pointer';
  
  topCloseButton.addEventListener('click', () => {
    modal.remove();
  });
  
  // Assemble modal
  content.appendChild(titleElement);
  content.appendChild(resultContent);
  content.appendChild(closeButton);
  content.appendChild(topCloseButton);
  modal.appendChild(content);
  
  // Add to document
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}