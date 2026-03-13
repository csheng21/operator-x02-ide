// messageCollapse.ts - FIXED VERSION
// Searches entire chat container for code blocks (not just within messages)

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_LINES_COLLAPSED = 3;
const LINE_HEIGHT = 20;
const MAX_HEIGHT_COLLAPSED = MAX_LINES_COLLAPSED * LINE_HEIGHT;

const CODE_COLLAPSED_LINES = 2;
const CODE_LINE_HEIGHT = 20;
const CODE_COLLAPSED_HEIGHT = CODE_COLLAPSED_LINES * CODE_LINE_HEIGHT;

// ============================================================================
// CODE BLOCK COLLAPSING - SEARCHES ENTIRE CONTAINER
// ============================================================================

export function collapseAllCodeBlocksInChat(): void {
  console.log('🔍 Searching for code blocks in entire chat...');
  
  // Find chat container
  const container = document.querySelector('.ai-chat-container, [class*="chat-container"], [class*="chat"]');
  if (!container) {
    console.warn('⚠️ Chat container not found');
    return;
  }
  
  // Find ALL pre elements in container
  const preElements = container.querySelectorAll('pre');
  console.log(`📦 Found ${preElements.length} code blocks in chat`);
  
  let collapsedCount = 0;
  preElements.forEach((pre) => {
    if (collapseCodeBlock(pre as HTMLElement)) {
      collapsedCount++;
    }
  });
  
  console.log(`✅ Collapsed ${collapsedCount} code blocks`);
}

export function collapseCodeBlocksInMessage(messageElement: HTMLElement): void {
  console.log('🔍 Checking message for code blocks...');
  
  const preElements = messageElement.querySelectorAll('pre');
  
  if (preElements.length === 0) {
    console.log('⏭️ No code blocks found in message');
    return;
  }
  
  console.log(`📦 Found ${preElements.length} code blocks in message`);
  
  preElements.forEach((preElement) => {
    collapseCodeBlock(preElement as HTMLElement);
  });
}

function collapseCodeBlock(preElement: HTMLElement): boolean {
  // Skip if already processed
  if (preElement.hasAttribute('data-collapse-processed')) {
    return false;
  }
  
  preElement.setAttribute('data-collapse-processed', 'true');
  
  const codeElement = preElement.querySelector('code');
  if (!codeElement) {
    return false;
  }
  
  const codeText = codeElement.textContent || '';
  const lines = codeText.split('\n');
  const lineCount = lines.length;
  
  console.log(`📏 Code block has ${lineCount} lines`);
  
  if (lineCount <= CODE_COLLAPSED_LINES) {
    console.log('⏭️ Code too short, no collapse needed');
    return false;
  }
  
  if (preElement.parentElement?.querySelector('.code-collapse-btn')) {
    return false;
  }
  
  // Create wrapper
  let wrapper = preElement.parentElement;
  if (!wrapper?.classList.contains('code-block-wrapper')) {
    wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    preElement.parentNode?.insertBefore(wrapper, preElement);
    wrapper.appendChild(preElement);
  }
  
  // Add collapsed state with INLINE STYLES (force it)
  preElement.classList.add('code-collapsed');
  preElement.style.maxHeight = `${CODE_COLLAPSED_HEIGHT}px`;
  preElement.style.overflow = 'hidden';
  preElement.style.position = 'relative';
  preElement.style.display = 'block';
  preElement.style.transition = 'max-height 0.3s ease';
  preElement.setAttribute('data-line-count', lineCount.toString());
  
  // Add gradient overlay
  const gradient = document.createElement('div');
  gradient.className = 'code-gradient';
  gradient.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to bottom, transparent, rgba(30, 30, 30, 0.95));
    pointer-events: none;
    z-index: 10;
  `;
  preElement.appendChild(gradient);
  
  // Create button
  const button = createCodeCollapseButton(preElement, gradient, lineCount);
  wrapper.insertBefore(button, preElement);
  
  console.log(`✅ Code block collapsed to ${CODE_COLLAPSED_LINES} lines`);
  return true;
}

function createCodeCollapseButton(preElement: HTMLElement, gradient: HTMLElement, lineCount: number): HTMLElement {
  const button = document.createElement('button');
  button.className = 'code-collapse-btn';
  button.setAttribute('data-state', 'collapsed');
  
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #2d2d30;
    border: 1px solid #3e3e42;
    color: #cccccc;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: all 0.2s ease;
  `;
  
  button.innerHTML = `
    <svg class="collapse-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
    <span class="collapse-text">Show ${lineCount} lines</span>
  `;
  
  // Hover effects
  button.onmouseenter = function() {
    button.style.background = '#3e3e42';
    button.style.borderColor = '#007acc';
    button.style.color = '#ffffff';
  };
  
  button.onmouseleave = function() {
    button.style.background = '#2d2d30';
    button.style.borderColor = '#3e3e42';
    button.style.color = '#cccccc';
  };
  
  // Click handler
  button.addEventListener('click', () => {
    const state = button.getAttribute('data-state');
    
    if (state === 'collapsed') {
      // EXPAND
      preElement.style.maxHeight = 'none';
      gradient.style.display = 'none';
      button.setAttribute('data-state', 'expanded');
      button.innerHTML = `
        <svg class="collapse-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg);">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="collapse-text">Hide code</span>
      `;
      console.log('📖 Code expanded');
    } else {
      // COLLAPSE
      preElement.style.maxHeight = `${CODE_COLLAPSED_HEIGHT}px`;
      gradient.style.display = 'block';
      button.setAttribute('data-state', 'collapsed');
      button.innerHTML = `
        <svg class="collapse-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span class="collapse-text">Show ${lineCount} lines</span>
      `;
      console.log('📦 Code collapsed');
      button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  
  return button;
}

export function expandAllCodeBlocks(): void {
  const buttons = document.querySelectorAll('.code-collapse-btn[data-state="collapsed"]');
  buttons.forEach(button => {
    (button as HTMLElement).click();
  });
  console.log(`✅ Expanded ${buttons.length} code blocks`);
}

// ============================================================================
// MESSAGE COLLAPSE (ORIGINAL FUNCTIONALITY)
// ============================================================================

export function collapsePreviousMessages(): void {
  console.log('🔍 Starting collapse check...');
  
  const possibleSelectors = [
    '.message.assistant',
    '[data-role="assistant"]',
    '.ai-message',
    '.assistant-message',
    '.message[data-type="assistant"]',
    '.chat-message.assistant',
  ];
  
  let messages: NodeListOf<Element> | null = null;
  
  for (const selector of possibleSelectors) {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      messages = found;
      console.log(`✅ Found ${found.length} messages using selector: "${selector}"`);
      break;
    }
  }
  
  if (!messages || messages.length === 0) {
    console.warn('⚠️ No AI messages found');
    return;
  }
  
  let collapsedCount = 0;
  messages.forEach((message, index) => {
    if (index < messages.length - 1) {
      const wasCollapsed = collapseMessage(message as HTMLElement);
      if (wasCollapsed) collapsedCount++;
    }
  });
  
  console.log(`✅ Collapsed ${collapsedCount} messages`);
}

function collapseMessage(messageElement: HTMLElement): boolean {
  const contentSelectors = [
    '.message-content',
    '[class*="content"]',
    '.ai-content',
    'div > div',
    'p',
  ];
  
  let contentDiv: HTMLElement | null = null;
  
  for (const selector of contentSelectors) {
    const found = messageElement.querySelector(selector) as HTMLElement;
    if (found && found.scrollHeight > 60) {
      contentDiv = found;
      break;
    }
  }
  
  if (!contentDiv || messageElement.querySelector('.collapse-toggle')) {
    return false;
  }
  
  const contentHeight = contentDiv.scrollHeight;
  if (contentHeight <= MAX_HEIGHT_COLLAPSED + 20) {
    return false;
  }
  
  contentDiv.classList.add('collapsed');
  const expandBtn = createExpandButton(messageElement, contentDiv);
  messageElement.appendChild(expandBtn);
  
  return true;
}

function createExpandButton(messageElement: HTMLElement, contentDiv: HTMLElement): HTMLElement {
  const button = document.createElement('button');
  button.className = 'collapse-toggle';
  button.innerHTML = `
    <span class="collapse-icon">▼</span>
    <span class="collapse-text">Show more</span>
  `;
  
  button.addEventListener('click', () => {
    const isCollapsed = contentDiv.classList.contains('collapsed');
    
    if (isCollapsed) {
      contentDiv.classList.remove('collapsed');
      button.innerHTML = `
        <span class="collapse-icon rotate">▼</span>
        <span class="collapse-text">Show less</span>
      `;
    } else {
      contentDiv.classList.add('collapsed');
      button.innerHTML = `
        <span class="collapse-icon">▼</span>
        <span class="collapse-text">Show more</span>
      `;
      contentDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  
  return button;
}

export function expandAllMessages(): void {
  const messages = document.querySelectorAll('.message.assistant, [data-role="assistant"]');
  
  messages.forEach(message => {
    const contentDiv = message.querySelector('.message-content.collapsed, [class*="content"].collapsed') as HTMLElement;
    const button = message.querySelector('.collapse-toggle') as HTMLElement;
    
    if (contentDiv && button) {
      contentDiv.classList.remove('collapsed');
      button.innerHTML = `
        <span class="collapse-icon rotate">▼</span>
        <span class="collapse-text">Show less</span>
      `;
    }
  });
  
  console.log('✅ All messages expanded');
}

// ============================================================================
// AUTO-COLLAPSE OBSERVER
// ============================================================================

export function setupAutoCollapseObserver(): void {
  const chatContainer = document.querySelector('.ai-chat-container, [class*="chat-container"], [class*="chat"]');
  
  if (!chatContainer) {
    console.warn('⚠️ Chat container not found');
    return;
  }
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check for code blocks in added nodes
          const preElements = node.querySelectorAll('pre');
          if (preElements.length > 0) {
            setTimeout(() => {
              preElements.forEach(pre => collapseCodeBlock(pre as HTMLElement));
            }, 100);
          }
        }
      });
    });
  });
  
  observer.observe(chatContainer, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Auto-collapse observer active');
}

// ============================================================================
// STYLES
// ============================================================================

export function addMessageCollapseStyles(): void {
  if (document.getElementById('message-collapse-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'message-collapse-styles';
  style.textContent = `
    /* Message collapse styles */
    .message-content.collapsed {
      max-height: ${MAX_HEIGHT_COLLAPSED}px !important;
      overflow: hidden !important;
      position: relative;
      transition: max-height 0.3s ease;
    }
    
    .message-content.collapsed::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, transparent, #1e1e1e);
      pointer-events: none;
    }
    
    .collapse-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid #3c3c3c;
      color: #858585;
      padding: 4px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      margin-top: 8px;
    }
    
    .collapse-toggle:hover {
      background: #2a2d2e;
      border-color: #007acc;
      color: #cccccc;
    }
    
    .collapse-icon.rotate {
      transform: rotate(180deg);
    }
  `;
  
  document.head.appendChild(style);
  console.log('✅ Styles added');
}

// ============================================================================
// INITIALIZE
// ============================================================================

export function initializeMessageCollapse(): void {
  addMessageCollapseStyles();
  console.log('✅ Message collapse system initialized');
  
  // Collapse existing code blocks
  setTimeout(() => {
    collapseAllCodeBlocksInChat();
  }, 1000);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const messageCollapse = {
  collapsePreviousMessages,
  expandAllMessages,
  initializeMessageCollapse,
  collapseCodeBlocksInMessage,
  collapseAllCodeBlocksInChat,
  expandAllCodeBlocks,
  setupAutoCollapseObserver
};