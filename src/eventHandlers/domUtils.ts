// eventHandlers/domUtils.ts - DOM utility functions

// Get DOM element by ID with type safety
export function getDomElement<T extends HTMLElement = HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

// Get DOM element by CSS selector with type safety
export function getElementBySelector<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  const element = document.querySelector(selector);
  return element as T | null;
}

// Create DOM element with given HTML
export function createElement<T extends HTMLElement = HTMLElement>(
  tagName: string, 
  options?: { 
    className?: string; 
    id?: string; 
    html?: string; 
    attributes?: Record<string, string>;
  }
): T {
  const element = document.createElement(tagName) as T;
  
  if (options) {
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.id) {
      element.id = options.id;
    }
    
    if (options.html) {
      element.innerHTML = options.html;
    }
    
    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        element.setAttribute(key, value);
      }
    }
  }
  
  return element;
}

// Add an event listener with proper typing
export function addEventHandler<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  eventType: K,
  handler: (event: HTMLElementEventMap[K]) => void
): void {
  if (element) {
    element.addEventListener(eventType, handler);
  }
}

// Remove an event listener
export function removeEventHandler<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  eventType: K,
  handler: (event: HTMLElementEventMap[K]) => void
): void {
  if (element) {
    element.removeEventListener(eventType, handler);
  }
}

// Toggle element visibility
export function toggleElementVisibility(
  element: HTMLElement | null, 
  visible: boolean
): void {
  if (!element) return;
  
  element.style.display = visible ? 'block' : 'none';
}