// notificationManager.ts - Toast Notification System

export function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  const colors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  };
  
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 10px 16px;
    border-radius: 6px;
    z-index: 10001;
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideInRight 0.3s ease;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}