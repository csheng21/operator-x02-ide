// ============================================================================
// FILE: src/ide/camera/cameraQueueSystem.ts
// DESCRIPTION: Enhanced Queue System with Working Image Replacement
// VERSION: 3.0 - Complete with all fixes
// ============================================================================

import { 
  analyzeMultipleImages, 
  analyzeWithContext,
  analyzeImageForDevelopment 
} from './cameraManager_vision';
import { sendMessageDirectly } from '../aiAssistant/assistantUI';

// ============================================================================
// QUEUE STATE
// ============================================================================

interface QueueItem {
  id: number;
  imageData: string;
  timestamp: Date;
  context?: string;
  thumbnail?: string;
}

let imageQueue: QueueItem[] = [];
let queueIdCounter = 1;

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

export function addToQueue(imageData: string, context?: string): void {
  const item: QueueItem = {
    id: queueIdCounter++,
    imageData,
    timestamp: new Date(),
    context,
    thumbnail: createThumbnail(imageData)
  };
  
  imageQueue.push(item);
  updateQueueStatus();
  showNotification('success', 'Added to Queue', `Image #${item.id} added (${imageQueue.length} total)`);
  
  console.log('Image added to queue:', item.id, 'Total:', imageQueue.length);
}

export function removeFromQueue(id: number): void {
  const index = imageQueue.findIndex(item => item.id === id);
  if (index > -1) {
    imageQueue.splice(index, 1);
    
    // Sync with internal camera queue
    if ((window as any).__cameraQueue && (window as any).__cameraQueue[index]) {
      (window as any).__cameraQueue.splice(index, 1);
    }
    
    // Update badge display
    if (typeof (window as any).updateCaptureBadge === 'function') {
      (window as any).updateCaptureBadge();
    }
    
    updateQueueStatus();
    console.log('Image removed from queue:', id);
  }
}

export function replaceInQueue(id: number, newImageData: string): void {
  const item = imageQueue.find(item => item.id === id);
  if (item) {
    console.log('Replacing image in queue, ID:', id);
    item.imageData = newImageData;
    item.timestamp = new Date();
    
    // Update cached thumbnail
    if (item.thumbnail) {
      item.thumbnail = newImageData;
    }
    
    showNotification('success', 'Image Replaced', `Image #${id} has been updated`);
    console.log('Image replaced successfully');
  } else {
    console.error('Image not found in queue, ID:', id);
  }
}

export function clearQueue(): void {
  imageQueue = [];
  queueIdCounter = 1;
  
  // Clear internal camera queue
  if ((window as any).__cameraQueue) {
    (window as any).__cameraQueue.length = 0;
  }
  
  // Update badge display
  if (typeof (window as any).updateCaptureBadge === 'function') {
    (window as any).updateCaptureBadge();
  }
  
  updateQueueStatus();
  console.log('Queue cleared');
}

export function getQueueLength(): number {
  return imageQueue.length;
}

export function getQueue(): QueueItem[] {
  return [...imageQueue];
}

// ============================================================================
// ENHANCED CONTEXT DIALOG WITH WORKING REPLACE FUNCTIONALITY
// ============================================================================

export function showContextDialog(): void {
  if (imageQueue.length === 0) {
    showNotification('info', 'Queue Empty', 'No images to analyze');
    return;
  }
  
  console.log('Opening context dialog with', imageQueue.length, 'images');
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(1, 4, 9, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10002;
    backdrop-filter: blur(8px);
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    border: 1px solid #30363d;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 20px 24px;
    border-bottom: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const headerContent = document.createElement('div');
  headerContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="9" x2="15" y2="15"></line>
        <line x1="9" y1="15" x2="15" y2="9"></line>
      </svg>
      <div>
        <h3 style="margin: 0; color: #e6edf3; font-size: 18px; font-weight: 600;">
          Add Context for Analysis
        </h3>
        <p style="margin: 4px 0 0 0; color: #7d8590; font-size: 12px;">
          Ask questions linking these ${imageQueue.length} image${imageQueue.length > 1 ? 's' : ''} in sequence
        </p>
      </div>
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  closeBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.onclick = () => modal.remove();
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(248, 81, 73, 0.1)';
    closeBtn.style.color = '#f85149';
  });
  
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#8b949e';
  });
  
  header.appendChild(headerContent);
  header.appendChild(closeBtn);
  
  // Content area
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    padding: 20px 24px;
    overflow-y: auto;
  `;
  
  // Tips section
  const tipsSection = document.createElement('div');
  tipsSection.style.cssText = `
    padding: 12px 16px;
    background: rgba(88, 166, 255, 0.1);
    border: 1px solid rgba(88, 166, 255, 0.3);
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  `;
  
  tipsSection.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 16v-4"></path>
      <path d="M12 8h.01"></path>
    </svg>
    <div style="flex: 1;">
      <div style="color: #58a6ff; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
        💡 Tip: Sequential Image Analysis
      </div>
      <div style="color: #7d8590; font-size: 12px; line-height: 1.5;">
        This feature helps AI understand the continuity or relation between your images and provide better solutions. 
        Add context to link images together for more accurate analysis.
      </div>
    </div>
  `;
  
  content.appendChild(tipsSection);
  
  // Image list with replace functionality
  const imageList = document.createElement('div');
  imageList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  `;
  
  imageQueue.forEach((item, index) => {
    const imageItem = document.createElement('div');
    imageItem.style.cssText = `
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(13, 17, 23, 0.6);
      border: 1px solid #30363d;
      border-radius: 8px;
      transition: all 0.2s;
    `;
    
    imageItem.addEventListener('mouseenter', () => {
      imageItem.style.background = 'rgba(13, 17, 23, 0.8)';
      imageItem.style.borderColor = '#484f58';
    });
    
    imageItem.addEventListener('mouseleave', () => {
      imageItem.style.background = 'rgba(13, 17, 23, 0.6)';
      imageItem.style.borderColor = '#30363d';
    });
    
    // Image number badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      width: 32px;
      height: 32px;
      background: #1f6feb;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    `;
    badge.textContent = `#${index + 1}`;
    
    // Thumbnail with click to view and replace functionality
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.style.cssText = `
      position: relative;
      width: 80px;
      height: 60px;
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      border: 1px solid #30363d;
    `;
    
    const thumbnail = document.createElement('img');
    thumbnail.src = item.thumbnail || item.imageData;
    thumbnail.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    thumbnail.title = 'Click to view full image';
    
    // Replace button overlay
    const replaceOverlay = document.createElement('div');
    replaceOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    `;
    
    const replaceBtn = document.createElement('button');
    replaceBtn.style.cssText = `
      background: #238636;
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      pointer-events: all;
    `;
    replaceBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      Replace
    `;
    
    // FIXED: Proper click handler with event handling
    replaceBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Replace button clicked for image ID:', item.id);
      showReplaceOptions(item.id, thumbnailContainer, thumbnail);
    };
    
    replaceOverlay.appendChild(replaceBtn);
    thumbnailContainer.appendChild(thumbnail);
    thumbnailContainer.appendChild(replaceOverlay);
    
    // Show overlay on hover
    thumbnailContainer.addEventListener('mouseenter', () => {
      console.log('Mouse entered thumbnail');
      replaceOverlay.style.opacity = '1';
    });
    
    thumbnailContainer.addEventListener('mouseleave', () => {
      replaceOverlay.style.opacity = '0';
    });
    
    // Click thumbnail to view full image (only if not clicking replace button)
    thumbnail.onclick = (e) => {
      if (e.target === thumbnail) {
        viewFullImage(item.imageData);
      }
    };
    
    // Image info
    const imageInfo = document.createElement('div');
    imageInfo.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const imageTitle = document.createElement('div');
    imageTitle.style.cssText = `
      font-size: 14px;
      color: #e6edf3;
      font-weight: 500;
    `;
    imageTitle.textContent = `Image #${index + 1}`;
    
    const imageTime = document.createElement('div');
    imageTime.style.cssText = `
      font-size: 12px;
      color: #7d8590;
    `;
    imageTime.textContent = item.timestamp.toLocaleTimeString();
    
    // Context input for each image
    const contextInput = document.createElement('textarea');
    contextInput.placeholder = `e.g., "Explain this function" or leave blank for general analysis`;
    contextInput.value = item.context || '';
    contextInput.style.cssText = `
      width: 100%;
      min-height: 50px;
      padding: 8px;
      background: #010409;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 12px;
      font-family: inherit;
      resize: vertical;
      margin-top: 8px;
    `;
    
    contextInput.addEventListener('input', () => {
      item.context = contextInput.value;
    });
    
    contextInput.addEventListener('focus', () => {
      contextInput.style.borderColor = '#58a6ff';
      contextInput.style.outline = 'none';
    });
    
    contextInput.addEventListener('blur', () => {
      contextInput.style.borderColor = '#30363d';
    });
    
    // Button container for edit and delete buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    `;
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(88, 166, 255, 0.3);
      color: #58a6ff;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.title = 'Edit/Replace image';
    
    editBtn.addEventListener('mouseenter', () => {
      editBtn.style.background = 'rgba(88, 166, 255, 0.1)';
      editBtn.style.borderColor = 'rgba(88, 166, 255, 0.5)';
    });
    
    editBtn.addEventListener('mouseleave', () => {
      editBtn.style.background = 'transparent';
      editBtn.style.borderColor = 'rgba(88, 166, 255, 0.3)';
    });
    
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Edit button clicked for image ID:', item.id);
      showReplaceOptions(item.id, thumbnailContainer, thumbnail);
    });
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = `
      background: transparent;
      border: 1px solid rgba(248, 81, 73, 0.3);
      color: #f85149;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.title = 'Remove from queue';
    
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = 'rgba(248, 81, 73, 0.1)';
      deleteBtn.style.borderColor = 'rgba(248, 81, 73, 0.5)';
    });
    
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'transparent';
      deleteBtn.style.borderColor = 'rgba(248, 81, 73, 0.3)';
    });
    
    deleteBtn.addEventListener('click', () => {
      removeFromQueue(item.id);
      imageItem.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        imageItem.remove();
        updateDialogCount();
      }, 300);
    });
    
    imageInfo.appendChild(imageTitle);
    imageInfo.appendChild(imageTime);
    imageInfo.appendChild(contextInput);
    
    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(deleteBtn);
    
    imageItem.appendChild(badge);
    imageItem.appendChild(thumbnailContainer);
    imageItem.appendChild(imageInfo);
    imageItem.appendChild(buttonContainer);
    
    imageList.appendChild(imageItem);
  });
  
  content.appendChild(imageList);
  
  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding: 16px 24px;
    border-top: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  `;
  
  const clearBtn = document.createElement('button');
  clearBtn.style.cssText = `
    padding: 8px 16px;
    background: transparent;
    border: 1px solid rgba(248, 81, 73, 0.3);
    border-radius: 6px;
    color: #f85149;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  `;
  clearBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    Clear All
  `;
  
  clearBtn.addEventListener('mouseenter', () => {
    clearBtn.style.background = 'rgba(248, 81, 73, 0.1)';
    clearBtn.style.borderColor = 'rgba(248, 81, 73, 0.5)';
  });
  
  clearBtn.addEventListener('mouseleave', () => {
    clearBtn.style.background = 'transparent';
    clearBtn.style.borderColor = 'rgba(248, 81, 73, 0.3)';
  });
  
  clearBtn.addEventListener('click', () => {
    clearQueue();
    modal.remove();
    showNotification('success', 'Cleared', 'All images removed');
  });
  
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 10px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#30363d';
    cancelBtn.style.borderColor = '#484f58';
  });
  
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#21262d';
    cancelBtn.style.borderColor = '#30363d';
  });
  
  cancelBtn.onclick = () => modal.remove();
  
  const analyzeBtn = document.createElement('button');
  analyzeBtn.style.cssText = `
    padding: 8px 20px;
    background: linear-gradient(135deg, #238636, #2ea043);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(35, 134, 54, 0.3);
  `;
  analyzeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
    Analyze ${imageQueue.length} Image${imageQueue.length > 1 ? 's' : ''}
  `;
  
  analyzeBtn.addEventListener('mouseenter', () => {
    analyzeBtn.style.transform = 'translateY(-1px)';
    analyzeBtn.style.boxShadow = '0 4px 12px rgba(35, 134, 54, 0.4)';
  });
  
  analyzeBtn.addEventListener('mouseleave', () => {
    analyzeBtn.style.transform = 'translateY(0)';
    analyzeBtn.style.boxShadow = '0 2px 8px rgba(35, 134, 54, 0.3)';
  });
  
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner"></span> Analyzing...`;
    
    try {
      await analyzeQueuedImages();
      modal.remove();
    } catch (error: any) {
      console.error('Analysis failed:', error);
      showNotification('error', 'Analysis Failed', error.message);
    } finally {
      analyzeBtn.disabled = false;
    }
  });
  
  buttonGroup.appendChild(cancelBtn);
  buttonGroup.appendChild(analyzeBtn);
  
  footer.appendChild(clearBtn);
  footer.appendChild(buttonGroup);
  
  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(content);
  dialog.appendChild(footer);
  modal.appendChild(dialog);
  
  // Add styles
  if (!document.getElementById('queue-dialog-styles')) {
    const style = document.createElement('style');
    style.id = 'queue-dialog-styles';
    style.textContent = `
      @keyframes slideOut {
        to { transform: translateX(-100%); opacity: 0; }
      }
      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .replace-options-menu button:hover {
        background: rgba(139, 148, 158, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(modal);
  
  // Update dialog count helper
  function updateDialogCount() {
    const headerText = header.querySelector('p');
    if (headerText) {
      headerText.textContent = `Optional questions or context for ${imageQueue.length} image${imageQueue.length > 1 ? 's' : ''}`;
    }
    analyzeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      Analyze ${imageQueue.length} Image${imageQueue.length > 1 ? 's' : ''}
    `;
  }
}

// ============================================================================
// REPLACE IMAGE FUNCTIONALITY - FIXED VERSION
// ============================================================================

function showReplaceOptions(imageId: number, container: HTMLElement, thumbnailImg: HTMLImageElement): void {
  console.log('Showing replace options for image:', imageId);
  
  // Remove any existing menu
  const existingMenu = document.querySelector('.replace-options-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create menu
  const menu = document.createElement('div');
  menu.className = 'replace-options-menu';
  menu.style.cssText = `
    position: fixed;
    background: #1c2128;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 10005;
    min-width: 180px;
  `;
  
  // Position the menu
  const rect = container.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 5}px`;
  
  // Option 1: Upload from file
  const uploadBtn = document.createElement('button');
  uploadBtn.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #c9d1d9;
    cursor: pointer;
    font-size: 12px;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    transition: all 0.2s;
  `;
  uploadBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    Upload Image
  `;
  
  uploadBtn.addEventListener('mouseenter', () => {
    uploadBtn.style.background = 'rgba(139, 148, 158, 0.1)';
  });
  
  uploadBtn.addEventListener('mouseleave', () => {
    uploadBtn.style.background = 'transparent';
  });
  
  uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Upload button clicked');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected:', file.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target?.result as string;
          console.log('Image loaded, replacing in queue');
          
          // Replace the image in queue
          replaceInQueue(imageId, imageData);
          
          // Update the thumbnail
          thumbnailImg.src = imageData;
          console.log('Thumbnail updated');
        };
        reader.readAsDataURL(file);
      }
    });
    
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
    
    menu.remove();
  });
  
  // Option 2: Capture from camera
  const captureBtn = document.createElement('button');
  captureBtn.style.cssText = uploadBtn.style.cssText;
  captureBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
    Capture from Camera
  `;
  
  captureBtn.addEventListener('mouseenter', () => {
    captureBtn.style.background = 'rgba(139, 148, 158, 0.1)';
  });
  
  captureBtn.addEventListener('mouseleave', () => {
    captureBtn.style.background = 'transparent';
  });
  
  captureBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Capture button clicked');
    
    const video = document.querySelector('.camera-video') as HTMLVideoElement;
    if (video && video.srcObject) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/png');
        
        // Replace the image
        replaceInQueue(imageId, imageData);
        
        // Update thumbnail
        thumbnailImg.src = imageData;
        
        console.log('Image captured and replaced');
      }
    } else {
      showNotification('warning', 'Camera Not Active', 'Please ensure camera panel is open');
    }
    
    menu.remove();
  });
  
  // Option 3: Paste from clipboard
  const pasteBtn = document.createElement('button');
  pasteBtn.style.cssText = uploadBtn.style.cssText;
  pasteBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    Paste from Clipboard
  `;
  
  pasteBtn.addEventListener('mouseenter', () => {
    pasteBtn.style.background = 'rgba(139, 148, 158, 0.1)';
  });
  
  pasteBtn.addEventListener('mouseleave', () => {
    pasteBtn.style.background = 'transparent';
  });
  
  pasteBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Paste button clicked');
    
    try {
      // Try modern clipboard API
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        let imageFound = false;
        
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              
              reader.onload = (e) => {
                const imageData = e.target?.result as string;
                
                // Replace the image
                replaceInQueue(imageId, imageData);
                
                // Update thumbnail
                thumbnailImg.src = imageData;
                
                console.log('Image pasted from clipboard');
              };
              
              reader.readAsDataURL(blob);
              imageFound = true;
              break;
            }
          }
          if (imageFound) break;
        }
        
        if (!imageFound) {
          showNotification('warning', 'No Image', 'No image found in clipboard');
        }
      } else {
        // Fallback for older browsers
        showNotification('info', 'Paste Image', 'Clipboard API not supported. Try Ctrl+V in a text area.');
      }
    } catch (error) {
      console.error('Paste error:', error);
      showNotification('error', 'Paste Failed', 'Could not access clipboard');
    }
    
    menu.remove();
  });
  
  // Add all buttons to menu
  menu.appendChild(uploadBtn);
  menu.appendChild(captureBtn);
  menu.appendChild(pasteBtn);
  
  // Add menu to document body
  document.body.appendChild(menu);
  
  // Adjust position if menu would go off screen
  setTimeout(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      menu.style.top = `${rect.top - menuRect.height - 5}px`;
    }
  }, 0);
  
  // Close menu when clicking outside
  setTimeout(() => {
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== menu) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 100);
}

// ============================================================================
// VIEW FULL IMAGE
// ============================================================================

function viewFullImage(imageData: string): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10006;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = imageData;
  img.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  `;
  
  modal.appendChild(img);
  modal.onclick = () => modal.remove();
  
  // Close on escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  document.body.appendChild(modal);
}

// ============================================================================
// HELPERS
// ============================================================================

function createThumbnail(imageData: string): string {
  // For now, return the same image
  // Could implement actual thumbnail generation if needed
  return imageData;
}

function updateQueueStatus(): void {
  const statusElement = document.getElementById('queue-status');
  if (statusElement) {
    statusElement.textContent = `Queue: ${imageQueue.length}`;
  }
}

function showNotification(type: string, title: string, message: string): void {
  // Use your existing notification system
  if (typeof (window as any).showNotification === 'function') {
    (window as any).showNotification(type, title, message);
  } else if (typeof (window as any).safeShowNotification === 'function') {
    (window as any).safeShowNotification(type, title, message);
  } else {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // Fallback: Show simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#f85149' : type === 'success' ? '#3fb950' : '#58a6ff'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10007;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = `${title}: ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// ============================================================================
// ANALYZE QUEUED IMAGES
// ============================================================================

async function analyzeQueuedImages(): Promise<void> {
  try {
    console.log('Starting batch analysis for', imageQueue.length, 'images');
    
    const images = imageQueue.map(item => item.imageData);
    const contexts = imageQueue.map(item => item.context || '');
    
    // Build combined context
    let combinedContext = 'Analyzing multiple images:\n\n';
    contexts.forEach((ctx, i) => {
      if (ctx) {
        combinedContext += `Image ${i + 1}: ${ctx}\n`;
      }
    });
    
    // Check if we have specific contexts
    const hasContexts = contexts.some(ctx => ctx.trim() !== '');
    
    let message = `📸 **Camera Batch Analysis** (${imageQueue.length} images)\n\n`;
    
    if (hasContexts) {
      // Analyze with context
      console.log('Analyzing with context');
      const results = await analyzeMultipleImages(images, combinedContext);
      
      results.forEach((result, i) => {
        message += `### Image ${i + 1}`;
        if (contexts[i]) {
          message += ` - ${contexts[i]}`;
        }
        message += `\n\n${result}\n\n`;
      });
    } else {
      // General analysis without context
      console.log('General analysis without context');
      for (let i = 0; i < images.length; i++) {
        const result = await analyzeImageForDevelopment(images[i]);
        message += `### Image ${i + 1}\n\n${result}\n\n`;
      }
    }
    
    // Send to AI assistant
    await sendMessageDirectly(message);
    
    // Clear queue after successful analysis
    clearQueue();
    
    showNotification('success', 'Analysis Complete', 'Results sent to AI Assistant');
    
  } catch (error: any) {
    console.error('Batch analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  QueueItem,
  imageQueue,
  updateQueueStatus,
  showNotification,
  viewFullImage,
  analyzeQueuedImages
};