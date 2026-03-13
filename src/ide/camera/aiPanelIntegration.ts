// src/ide/camera/aiPanelIntegration.ts
// Utility for integrating camera results with the AI Assistant panel

/**
 * Interface for camera analysis results
 */
export interface CameraAnalysisResult {
  type: 'image_analysis' | 'object_detection' | 'ocr';
  data: any;
  summary?: string;
  timestamp?: Date;
  imageData?: string; // Base64 image data
}

/**
 * Main function to send camera results to AI Assistant panel
 * @param result The analysis result
 * @param title Title for the message
 * @param imageData Optional base64 image data
 */
export function sendToAIAssistant(result: any, title: string, imageData?: string): boolean {
  try {
    // Try multiple methods to find and integrate with the AI panel
    return (
      tryDirectMessageInsertion(result, title, imageData) ||
      tryConversationAPI(result, title, imageData) ||
      tryEventDispatch(result, title, imageData) ||
      tryFallbackDisplay(result, title)
    );
  } catch (error) {
    console.error('Failed to send result to AI Assistant:', error);
    return false;
  }
}

/**
 * Method 1: Direct message insertion into AI panel DOM
 */
function tryDirectMessageInsertion(result: any, title: string, imageData?: string): boolean {
  try {
    // Look for AI Assistant panel with various possible selectors
    const aiPanel = findAIPanel();
    if (!aiPanel) return false;

    // Find the messages container
    const messagesContainer = findMessagesContainer(aiPanel);
    if (!messagesContainer) return false;

    // Create and insert the message
    const messageElement = createAIMessage(result, title, imageData);
    messagesContainer.appendChild(messageElement);

    // Scroll to show new message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    console.log('Successfully inserted message into AI panel');
    return true;
  } catch (error) {
    console.warn('Direct message insertion failed:', error);
    return false;
  }
}

/**
 * Method 2: Try to use conversation API if available
 */
function tryConversationAPI(result: any, title: string, imageData?: string): boolean {
  try {
    // Check if there's a global conversation manager
    const conversationManager = (window as any).conversationManager || 
                               (window as any).aiAssistant || 
                               (window as any).chatManager;

    if (conversationManager && typeof conversationManager.addMessage === 'function') {
      const message = formatResultAsMessage(result, title, imageData);
      conversationManager.addMessage({
        role: 'assistant',
        content: message,
        type: 'camera_analysis',
        timestamp: new Date()
      });
      
      console.log('Successfully added message via conversation API');
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Conversation API method failed:', error);
    return false;
  }
}

/**
 * Method 3: Dispatch custom event for AI panel to handle
 */
function tryEventDispatch(result: any, title: string, imageData?: string): boolean {
  try {
    const event = new CustomEvent('camera-analysis-result', {
      detail: {
        result,
        title,
        imageData,
        timestamp: new Date(),
        formattedMessage: formatResultAsMessage(result, title, imageData)
      }
    });

    document.dispatchEvent(event);
    
    // Also try dispatching on the AI panel specifically
    const aiPanel = findAIPanel();
    if (aiPanel) {
      aiPanel.dispatchEvent(event);
    }

    console.log('Dispatched camera analysis event');
    return true;
  } catch (error) {
    console.warn('Event dispatch method failed:', error);
    return false;
  }
}

/**
 * Method 4: Fallback display in a modal or notification
 */
function tryFallbackDisplay(result: any, title: string): boolean {
  try {
    // Create a modal or overlay to display the result
    const modal = createResultModal(result, title);
    document.body.appendChild(modal);

    console.log('Displayed result in fallback modal');
    return true;
  } catch (error) {
    console.warn('Fallback display failed:', error);
    return false;
  }
}

/**
 * Find the AI Assistant panel using various selectors
 */
function findAIPanel(): HTMLElement | null {
  const selectors = [
    '.ai-assistant-panel',
    '[data-panel="ai-assistant"]',
    '.panel:has(.ai-assistant)',
    '.ai-panel',
    '.assistant-panel',
    '.chat-panel',
    '.conversation-panel',
    // Try finding by header text
    '.panel-header:contains("AI Assistant")',
    '.panel-header:contains("Assistant")',
  ];

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    } catch (e) {
      // Ignore invalid selectors
    }
  }

  // Try finding by walking the DOM
  const panels = document.querySelectorAll('.panel');
  for (const panel of panels) {
    const headerText = panel.querySelector('.panel-title, .panel-header')?.textContent?.toLowerCase();
    if (headerText && (headerText.includes('ai') || headerText.includes('assistant') || headerText.includes('chat'))) {
      return panel as HTMLElement;
    }
  }

  return null;
}

/**
 * Find messages container within the AI panel
 */
function findMessagesContainer(aiPanel: HTMLElement): HTMLElement | null {
  const selectors = [
    '.ai-messages',
    '.messages-container',
    '.conversation-messages',
    '.chat-messages',
    '.messages',
    '.conversation-content',
    '.chat-content',
    '.panel-content .scrollable',
    '.panel-content [style*="overflow"]',
  ];

  for (const selector of selectors) {
    const element = aiPanel.querySelector(selector) as HTMLElement;
    if (element) return element;
  }

  // Fallback to panel content
  return aiPanel.querySelector('.panel-content') as HTMLElement;
}

/**
 * Create a formatted AI message element
 */
function createAIMessage(result: any, title: string, imageData?: string): HTMLElement {
  const messageContainer = document.createElement('div');
  messageContainer.className = 'ai-message camera-analysis-message';
  messageContainer.style.cssText = `
    margin-bottom: 15px;
    padding: 12px;
    background-color: rgba(14, 99, 156, 0.1);
    border-left: 3px solid #0e639c;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Message header
  const header = document.createElement('div');
  header.className = 'message-header';
  header.style.cssText = `
    font-size: 14px;
    font-weight: bold;
    color: #0e639c;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  `;

  const icon = document.createElement('span');
  icon.textContent = getIconForTitle(title);
  icon.style.marginRight = '8px';

  const headerText = document.createElement('span');
  headerText.textContent = `Camera ${title}`;

  const timestamp = document.createElement('span');
  timestamp.textContent = new Date().toLocaleTimeString();
  timestamp.style.cssText = `
    margin-left: auto;
    font-size: 12px;
    opacity: 0.7;
    font-weight: normal;
  `;

  header.appendChild(icon);
  header.appendChild(headerText);
  header.appendChild(timestamp);

  // Message content
  const content = document.createElement('div');
  content.className = 'message-content';
  content.style.cssText = `
    font-size: 13px;
    line-height: 1.4;
    color: #e0e0e0;
  `;

  // Add thumbnail if image data is provided
  if (imageData) {
    const thumbnail = document.createElement('img');
    thumbnail.src = imageData;
    thumbnail.style.cssText = `
      max-width: 100px;
      max-height: 100px;
      float: right;
      margin-left: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      cursor: pointer;
    `;
    thumbnail.title = 'Click to view full image';
    thumbnail.addEventListener('click', () => openImageModal(imageData));
    content.appendChild(thumbnail);
  }

  // Format the result content
  const textContent = document.createElement('div');
  textContent.innerHTML = formatResultContent(result);
  content.appendChild(textContent);

  messageContainer.appendChild(header);
  messageContainer.appendChild(content);

  return messageContainer;
}

/**
 * Format result content based on type
 */
function formatResultContent(result: any): string {
  if (typeof result === 'string') {
    return escapeHtml(result);
  }

  if (result.analysis || result.description) {
    return escapeHtml(result.analysis || result.description);
  }

  if (result.objects && Array.isArray(result.objects)) {
    const objectList = result.objects
      .map((obj, index) => 
        `${index + 1}. <strong>${escapeHtml(obj.name)}</strong>${
          obj.confidence ? ` <span style="opacity: 0.7;">(${Math.round(obj.confidence * 100)}%)</span>` : ''
        }`
      )
      .join('<br>');
    
    return `
      <div style="margin-bottom: 8px;">${escapeHtml(result.summary || 'Detected objects:')}</div>
      <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 3px;">
        ${objectList}
      </div>
    `;
  }

  // Fallback for other result formats
  return `<pre style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 3px; white-space: pre-wrap; font-family: monospace;">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
}

/**
 * Format result as plain text message
 */
function formatResultAsMessage(result: any, title: string, imageData?: string): string {
  let message = `**Camera ${title}**\n\n`;
  
  if (typeof result === 'string') {
    message += result;
  } else if (result.analysis || result.description) {
    message += result.analysis || result.description;
  } else if (result.objects && Array.isArray(result.objects)) {
    message += result.summary || 'Detected objects:';
    message += '\n\n';
    result.objects.forEach((obj, index) => {
      message += `${index + 1}. ${obj.name}${obj.confidence ? ` (${Math.round(obj.confidence * 100)}%)` : ''}\n`;
    });
  } else {
    message += JSON.stringify(result, null, 2);
  }
  
  return message;
}

/**
 * Get appropriate icon for the analysis type
 */
function getIconForTitle(title: string): string {
  if (title.toLowerCase().includes('detection')) return '🔍';
  if (title.toLowerCase().includes('ocr') || title.toLowerCase().includes('text')) return '📝';
  return '🤖';
}

/**
 * Create fallback modal for displaying results
 */
function createResultModal(result: any, title: string): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'camera-result-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: #2a2a2a;
    padding: 20px;
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
  `;
  closeButton.addEventListener('click', () => modal.remove());

  const titleElement = document.createElement('h3');
  titleElement.textContent = `Camera ${title}`;
  titleElement.style.color = '#0e639c';

  const resultElement = document.createElement('div');
  resultElement.innerHTML = formatResultContent(result);

  content.appendChild(closeButton);
  content.appendChild(titleElement);
  content.appendChild(resultElement);
  modal.appendChild(content);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  return modal;
}

/**
 * Open image in full-size modal
 */
function openImageModal(imageData: string): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    cursor: pointer;
  `;

  const img = document.createElement('img');
  img.src = imageData;
  img.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  `;

  modal.appendChild(img);
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text: string): string {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}