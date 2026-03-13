// utils/errorHandlers.ts
// Error handling functionality extracted from main.ts

export function setupGlobalErrorHandler() {
  return function(message: string, source?: string, lineno?: number, colno?: number, error?: Error) {
    console.error('Global error:', message, 'at', source, lineno, colno, error);
    
    // Append error to the DOM for visibility
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.bottom = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.maxWidth = '80%';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = `Error: ${message} (${source}:${lineno})`;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
    
    return false;
  };
}