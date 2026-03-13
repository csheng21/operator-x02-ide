// notificationSystem_flexible.ts - Fixed version with flexible container selector
// ============================================================================
// FIX: Updated to work with your actual DOM structure
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOTIFICATION_CONFIG = {
  displayDuration: 10000,      // 10 seconds total display time
  fadeOutDuration: 500,        // 0.5 seconds fade animation
  countdownInterval: 1000,     // Update countdown every second
  // NEW: Flexible container selectors (tries multiple)
  containerSelectors: [
    '.chat-messages',
    '.ai-chat-container .chat-messages',
    '.ai-chat-container',
    '[class*="chat"]',
    '[class*="message"]',
    'main',
    'body'
  ]
};

// Export configuration for external access if needed
export { NOTIFICATION_CONFIG };

// ============================================================================
// STATE TRACKING
// ============================================================================

/**
 * Track active notifications with their metadata
 * Map<Element, NotificationData>
 */
interface NotificationData {
  message: string;
  timestamp: number;
  timeoutId: number;
  countdownIntervalId: number;
  remainingTime: number;
  countdownElement: HTMLElement | null;
}

const activeNotifications = new Map<Element, NotificationData>();

// ============================================================================
// HELPER: FIND CHAT CONTAINER
// ============================================================================

/**
 * Find the chat messages container using multiple selectors
 */
function findChatContainer(): HTMLElement | null {
  // Try each selector in order
  for (const selector of NOTIFICATION_CONFIG.containerSelectors) {
    const container = document.querySelector(selector);
    if (container instanceof HTMLElement) {
      console.log(`✅ Found chat container using selector: "${selector}"`);
      return container;
    }
  }
  
  console.warn('⚠️ Chat messages container not found. Tried selectors:', 
    NOTIFICATION_CONFIG.containerSelectors.join(', '));
  return null;
}

// ============================================================================
// CORE NOTIFICATION SYSTEM
// ============================================================================

/**
 * Add a system message with automatic removal after 10 seconds
 * Includes countdown timer and status bar updates
 */
export function addSystemMessageWithAutoRemoval(message: string): void {
  console.log('🔔 Adding notification:', message);
  
  // Get or create the chat messages container
  const chatMessages = findChatContainer();
  if (!chatMessages) {
    console.error('❌ Cannot add notification: No suitable container found');
    console.log('💡 Tip: Add a container selector to NOTIFICATION_CONFIG.containerSelectors');
    return;
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'message system notification-message';
  notification.setAttribute('data-role', 'system');
  notification.style.cssText = `
    background: rgba(33, 150, 243, 0.1);
    border-left: 3px solid #2196F3;
    padding: 12px 16px;
    margin: 8px 0;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #e0e0e0;
    transition: opacity 0.5s ease, transform 0.5s ease;
  `;
  
  // Create message content
  const messageContent = document.createElement('div');
  messageContent.style.cssText = 'flex: 1; min-width: 0;';
  messageContent.textContent = `ℹ️ ${message}`;
  
  // Create countdown element
  const countdown = document.createElement('div');
  countdown.className = 'notification-countdown';
  countdown.style.cssText = `
    background: rgba(33, 150, 243, 0.2);
    color: #4fc3f7;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 12px;
    white-space: nowrap;
    min-width: 32px;
    text-align: center;
  `;
  countdown.textContent = '10s';
  
  notification.appendChild(messageContent);
  notification.appendChild(countdown);
  chatMessages.appendChild(notification);
  
  // Track this notification
  const notificationData: NotificationData = {
    message,
    timestamp: Date.now(),
    timeoutId: 0,
    countdownIntervalId: 0,
    remainingTime: 10,
    countdownElement: countdown
  };
  
  // Start countdown
  notificationData.countdownIntervalId = window.setInterval(() => {
    notificationData.remainingTime--;
    if (countdown && notificationData.remainingTime >= 0) {
      countdown.textContent = `${notificationData.remainingTime}s`;
    }
  }, NOTIFICATION_CONFIG.countdownInterval);
  
  // Schedule removal
  notificationData.timeoutId = window.setTimeout(() => {
    console.log('🗑️ Removing notification');
    removeNotificationWithAnimation(notification);
  }, NOTIFICATION_CONFIG.displayDuration);
  
  activeNotifications.set(notification, notificationData);
  
  console.log('📌 Tracking notification for removal');
  console.log(`✅ Notification tracked. Active: ${activeNotifications.size}`);
  
  // Update status bar
  updateStatusBar();
  
  // Scroll to bottom to show new notification
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Remove notification with smooth fade-out animation
 */
function removeNotificationWithAnimation(element: Element): void {
  const htmlElement = element as HTMLElement;
  const notificationData = activeNotifications.get(element);
  
  if (!notificationData) {
    console.warn('⚠️ Notification data not found for element');
    return;
  }
  
  // Clear intervals
  if (notificationData.countdownIntervalId) {
    clearInterval(notificationData.countdownIntervalId);
  }
  if (notificationData.timeoutId) {
    clearTimeout(notificationData.timeoutId);
  }
  
  // Apply fade-out animation
  htmlElement.style.transition = `opacity ${NOTIFICATION_CONFIG.fadeOutDuration}ms ease, transform ${NOTIFICATION_CONFIG.fadeOutDuration}ms ease, height ${NOTIFICATION_CONFIG.fadeOutDuration}ms ease`;
  htmlElement.style.opacity = '0';
  htmlElement.style.transform = 'translateX(-20px)';
  htmlElement.style.height = '0px';
  htmlElement.style.margin = '0';
  htmlElement.style.padding = '0';
  htmlElement.style.overflow = 'hidden';
  
  // Remove from DOM after animation
  setTimeout(() => {
    if (htmlElement.parentNode) {
      htmlElement.remove();
      console.log('✅ Notification removed from DOM');
    }
    activeNotifications.delete(element);
    
    // Update status bar
    updateStatusBar();
    console.log(`📊 Status bar updated: ${activeNotifications.size} notification(s) active`);
  }, NOTIFICATION_CONFIG.fadeOutDuration);
}

/**
 * Manually remove a specific notification immediately
 */
export function removeNotificationImmediate(element: Element): void {
  const notificationData = activeNotifications.get(element);
  
  if (notificationData) {
    // Clear timeouts
    if (notificationData.timeoutId) {
      clearTimeout(notificationData.timeoutId);
    }
    if (notificationData.countdownIntervalId) {
      clearInterval(notificationData.countdownIntervalId);
    }
    
    activeNotifications.delete(element);
  }
  
  element.remove();
  updateStatusBar();
}

/**
 * Clear all active notifications
 */
export function clearAllNotifications(): void {
  console.log('🗑️ Clearing all notifications...');
  
  activeNotifications.forEach((data, element) => {
    // Clear timeouts
    if (data.timeoutId) {
      clearTimeout(data.timeoutId);
    }
    if (data.countdownIntervalId) {
      clearInterval(data.countdownIntervalId);
    }
    
    // Remove element
    if (element.parentNode) {
      element.remove();
    }
  });
  
  activeNotifications.clear();
  updateStatusBar();
  console.log('✅ All notifications cleared');
}

/**
 * Get count of currently active notifications
 */
export function getActiveNotificationCount(): number {
  return activeNotifications.size;
}

/**
 * Get all active notification messages
 */
export function getActiveNotifications(): string[] {
  return Array.from(activeNotifications.values()).map(data => data.message);
}

// ============================================================================
// ORPHANED NOTIFICATION DETECTION & TRACKING
// ============================================================================

/**
 * Find and track any orphaned notifications that weren't tracked initially
 * This handles notifications created before this system was initialized
 */
export function trackOrphanedNotifications(): void {
  const chatMessages = findChatContainer();
  if (!chatMessages) return;
  
  // Find all notifications using multiple selectors
  const selectors = [
    '.message.system',
    '.system-message',
    '[data-role="system"]',
    '.notification-message'
  ];
  
  const allNotifications = chatMessages.querySelectorAll(selectors.join(', '));
  
  allNotifications.forEach((element: Element) => {
    // Skip if already tracked
    if (activeNotifications.has(element)) {
      return;
    }
    
    console.log('🔍 Found orphaned notification, tracking it:', element.textContent?.trim());
    
    // Get or create countdown element
    let countdown = element.querySelector('.notification-countdown') as HTMLElement;
    if (!countdown) {
      countdown = document.createElement('div');
      countdown.className = 'notification-countdown';
      countdown.style.cssText = `
        background: rgba(33, 150, 243, 0.2);
        color: #4fc3f7;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 12px;
        white-space: nowrap;
        min-width: 32px;
        text-align: center;
      `;
      countdown.textContent = '10s';
      element.appendChild(countdown);
    }
    
    // Track this orphaned notification
    const notificationData: NotificationData = {
      message: element.textContent?.trim() || 'Unknown',
      timestamp: Date.now(),
      timeoutId: 0,
      countdownIntervalId: 0,
      remainingTime: 10,
      countdownElement: countdown
    };
    
    // Start countdown
    notificationData.countdownIntervalId = window.setInterval(() => {
      notificationData.remainingTime--;
      if (countdown && notificationData.remainingTime >= 0) {
        countdown.textContent = `${notificationData.remainingTime}s`;
      }
    }, NOTIFICATION_CONFIG.countdownInterval);
    
    // Schedule removal
    notificationData.timeoutId = window.setTimeout(() => {
      removeNotificationWithAnimation(element);
    }, NOTIFICATION_CONFIG.displayDuration);
    
    activeNotifications.set(element, notificationData);
  });
  
  if (allNotifications.length > 0) {
    updateStatusBar();
  }
}

// ============================================================================
// STATUS BAR INTEGRATION
// ============================================================================

/**
 * Update status bar to show notification count
 * Integrates with the activity indicator system
 */
function updateStatusBar(): void {
  // Try to update the unified status bar if it exists
  if (typeof (window as any).updateUnifiedStatusBar === 'function') {
    (window as any).updateUnifiedStatusBar();
  }
  
  // Also try to update activity message directly
  const activityMessage = document.querySelector('.activity-message');
  if (activityMessage && activeNotifications.size > 0) {
    activityMessage.textContent = `${activeNotifications.size} notification${activeNotifications.size === 1 ? '' : 's'} active`;
  }
}

// ============================================================================
// INITIALIZATION & AUTO-TRACKING
// ============================================================================

/**
 * Initialize the notification system
 * Call this when the page loads
 */
export function initializeNotificationSystem(): void {
  console.log('🔔 Initializing notification system...');
  
  // Check if container exists
  const container = findChatContainer();
  if (container) {
    console.log('✅ Chat container found and ready');
  } else {
    console.warn('⚠️ No chat container found. Notifications will not appear until container is available.');
    console.log('💡 Available selectors:', NOTIFICATION_CONFIG.containerSelectors.join(', '));
  }
  
  // Track any existing orphaned notifications
  trackOrphanedNotifications();
  
  // Set up periodic orphan detection (every 5 seconds)
  setInterval(() => {
    trackOrphanedNotifications();
  }, 5000);
  
  console.log('✅ Notification system initialized');
  console.log(`📊 Currently tracking ${activeNotifications.size} notification(s)`);
}

// ============================================================================
// DIAGNOSTIC TOOL
// ============================================================================

/**
 * Diagnostic function to help find the correct container selector
 */
export function findAvailableContainers(): void {
  console.log('🔍 Searching for possible chat containers...');
  console.log('');
  
  const possibleSelectors = [
    '.chat-messages',
    '.ai-chat-container',
    '.messages',
    '.chat',
    '[class*="chat"]',
    '[class*="message"]',
    'main',
    '#app',
    'body'
  ];
  
  const found: string[] = [];
  
  possibleSelectors.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      found.push(selector);
      console.log(`✅ Found: ${selector}`);
      console.log(`   Element:`, element);
      console.log(`   Classes:`, element.className);
      console.log('');
    }
  });
  
  if (found.length === 0) {
    console.log('❌ No suitable containers found!');
    console.log('💡 Try inspecting your chat UI in DevTools to find the correct selector');
  } else {
    console.log(`📊 Found ${found.length} possible container(s)`);
    console.log('💡 Add the best selector to NOTIFICATION_CONFIG.containerSelectors');
  }
}

// ============================================================================
// GLOBAL EXPORTS FOR TESTING
// ============================================================================

// Expose functions globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).addSystemMessageWithAutoRemoval = addSystemMessageWithAutoRemoval;
  (window as any).clearAllNotifications = clearAllNotifications;
  (window as any).getActiveNotificationCount = getActiveNotificationCount;
  (window as any).getActiveNotifications = getActiveNotifications;
  (window as any).trackOrphanedNotifications = trackOrphanedNotifications;
  (window as any).initializeNotificationSystem = initializeNotificationSystem;
  (window as any).findAvailableContainers = findAvailableContainers;
  
  console.log('');
  console.log('🔔 Notification System Functions Available:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Available in browser console:');
  console.log('   • addSystemMessageWithAutoRemoval(message)');
  console.log('   • clearAllNotifications()');
  console.log('   • getActiveNotificationCount()');
  console.log('   • getActiveNotifications()');
  console.log('   • findAvailableContainers() ← Use this to find your container!');
  console.log('');
  console.log('💡 Try these commands:');
  console.log('   findAvailableContainers()  // Find your chat container');
  console.log('   addSystemMessageWithAutoRemoval("Test notification 🎉")');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeNotificationSystem();
    });
  } else {
    // DOM already loaded
    initializeNotificationSystem();
  }
}

// ============================================================================
// MODULE LOADED
// ============================================================================

console.log('✅ Notification system module loaded successfully');