/**
 * ====================================================================================================
 * FILE: src/ide/terminal/errorHighlighter.ts - Beautiful Error Display and Highlighting
 * ====================================================================================================
 * 
 * PURPOSE:
 * Formats and highlights errors in the terminal with clickable file paths,
 * color-coded components, and beautiful visual presentation.
 * 
 * FEATURES:
 * - Color-coded error components
 * - Clickable file paths that open in editor
 * - Error badges with icons
 * - Stack trace formatting
 * - Inline error annotations
 * 
 * ====================================================================================================
 */

import { ParsedError, StackFrame, ErrorParser } from './errorParser';

export interface HighlightedOutput {
  element: HTMLElement;
  hasError: boolean;
  errorCount: number;
  warningCount: number;
}

export class ErrorHighlighter {
  private static onFileClick?: (file: string, line?: number, column?: number) => void;

  /**
   * Set callback for when file paths are clicked
   */
  static setFileClickHandler(handler: (file: string, line?: number, column?: number) => void) {
    this.onFileClick = handler;
  }

  /**
   * Main highlighting function - processes terminal output and returns highlighted HTML
   */
  static highlightOutput(output: string): HighlightedOutput {
    const container = document.createElement('div');
    container.className = 'terminal-output-highlighted';
    
    let errorCount = 0;
    let warningCount = 0;
    let hasError = false;

    // Try to parse as error
    const parsedError = ErrorParser.parse(output);
    
    if (parsedError) {
      hasError = true;
      if (parsedError.type === 'error') {
        errorCount++;
      } else if (parsedError.type === 'warning') {
        warningCount++;
      }
      
      // Create formatted error display
      const errorElement = this.createFormattedError(parsedError);
      container.appendChild(errorElement);
    } else {
      // Check if it's multi-line output that might contain errors
      const lines = output.split('\n');
      let hasAnyError = false;
      
      for (const line of lines) {
        if (line.trim() === '') {
          continue;
        }
        
        const lineElement = this.highlightLine(line);
        container.appendChild(lineElement);
        
        if (lineElement.classList.contains('error-line') || 
            lineElement.classList.contains('warning-line')) {
          hasAnyError = true;
        }
      }
      
      hasError = hasAnyError;
    }

    return {
      element: container,
      hasError,
      errorCount,
      warningCount,
    };
  }

  /**
   * Create formatted error display with all components
   */
  private static createFormattedError(error: ParsedError): HTMLElement {
    const container = document.createElement('div');
    container.className = `formatted-error ${error.type}-container`;
    
    // Add error badge/header
    const header = this.createErrorHeader(error);
    container.appendChild(header);
    
    // Add error message
    const message = this.createErrorMessage(error);
    container.appendChild(message);
    
    // Add file location if available
    if (error.file) {
      const location = this.createFileLocation(error.file, error.line, error.column);
      container.appendChild(location);
    }
    
    // Add stack trace if available
    if (error.stackTrace && error.stackTrace.length > 0) {
      const stack = this.createStackTrace(error.stackTrace);
      container.appendChild(stack);
    }
    
    return container;
  }

  /**
   * Create error header with icon and type
   */
  private static createErrorHeader(error: ParsedError): HTMLElement {
    const header = document.createElement('div');
    header.className = 'error-header';
    
    // Icon based on type
    const icon = document.createElement('span');
    icon.className = 'error-icon';
    
    if (error.type === 'error') {
      icon.innerHTML = '🔴';
      icon.style.color = '#ff5252';
    } else if (error.type === 'warning') {
      icon.innerHTML = '⚠️';
      icon.style.color = '#ffa726';
    } else {
      icon.innerHTML = 'ℹ️';
      icon.style.color = '#42a5f5';
    }
    
    header.appendChild(icon);
    
    // Error type
    if (error.errorType) {
      const type = document.createElement('span');
      type.className = 'error-type';
      type.textContent = error.errorType;
      type.style.cssText = `
        color: ${error.type === 'error' ? '#ff5252' : '#ffa726'};
        font-weight: bold;
        margin-left: 8px;
        font-size: 14px;
      `;
      header.appendChild(type);
    }
    
    // Language badge
    if (error.language) {
      const lang = document.createElement('span');
      lang.className = 'error-language';
      lang.textContent = error.language.toUpperCase();
      lang.style.cssText = `
        background: rgba(100, 221, 23, 0.2);
        color: #64dd17;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
        margin-left: 8px;
        font-weight: 600;
      `;
      header.appendChild(lang);
    }
    
    header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 4px 0;
    `;
    
    return header;
  }

  /**
   * Create formatted error message
   */
  private static createErrorMessage(error: ParsedError): HTMLElement {
    const message = document.createElement('div');
    message.className = 'error-message';
    message.textContent = error.message;
    message.style.cssText = `
      color: #f0f0f0;
      font-size: 13px;
      line-height: 1.5;
      padding: 4px 0 4px 28px;
      margin-bottom: 8px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    `;
    
    return message;
  }

  /**
   * Create clickable file location
   */
  private static createFileLocation(file: string, line?: number, column?: number): HTMLElement {
    const location = document.createElement('div');
    location.className = 'error-location';
    
    const fileLink = document.createElement('span');
    fileLink.className = 'file-path-link';
    
    let locationText = file;
    if (line !== undefined) {
      locationText += `:${line}`;
      if (column !== undefined) {
        locationText += `:${column}`;
      }
    }
    
    fileLink.textContent = `📄 ${locationText}`;
    fileLink.style.cssText = `
      color: #42a5f5;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    `;
    
    // Make clickable
    fileLink.addEventListener('click', () => {
      if (this.onFileClick) {
        this.onFileClick(file, line, column);
      } else {
        console.log('Open file:', file, 'at line:', line, 'column:', column);
      }
    });
    
    fileLink.addEventListener('mouseenter', () => {
      fileLink.style.color = '#64b5f6';
      fileLink.style.backgroundColor = 'rgba(66, 165, 245, 0.1)';
    });
    
    fileLink.addEventListener('mouseleave', () => {
      fileLink.style.color = '#42a5f5';
      fileLink.style.backgroundColor = 'transparent';
    });
    
    location.appendChild(fileLink);
    location.style.cssText = `
      padding: 4px 0 4px 28px;
      margin-bottom: 8px;
    `;
    
    return location;
  }

  /**
   * Create formatted stack trace
   */
  private static createStackTrace(frames: StackFrame[]): HTMLElement {
    const stack = document.createElement('div');
    stack.className = 'error-stack-trace';
    
    const title = document.createElement('div');
    title.textContent = 'Stack Trace:';
    title.style.cssText = `
      color: #888;
      font-size: 11px;
      margin-bottom: 4px;
      padding-left: 28px;
      font-weight: 600;
      text-transform: uppercase;
    `;
    stack.appendChild(title);
    
    const frameList = document.createElement('div');
    frameList.className = 'stack-frames';
    
    frames.slice(0, 10).forEach((frame, index) => {
      const frameElement = this.createStackFrame(frame, index);
      frameList.appendChild(frameElement);
    });
    
    if (frames.length > 10) {
      const more = document.createElement('div');
      more.textContent = `... and ${frames.length - 10} more`;
      more.style.cssText = `
        color: #888;
        font-size: 11px;
        padding: 4px 0 4px 40px;
        font-style: italic;
      `;
      frameList.appendChild(more);
    }
    
    stack.appendChild(frameList);
    
    return stack;
  }

  /**
   * Create single stack frame element
   */
  private static createStackFrame(frame: StackFrame, index: number): HTMLElement {
    const element = document.createElement('div');
    element.className = 'stack-frame';
    
    // Frame number
    const number = document.createElement('span');
    number.textContent = `${index + 1}.`;
    number.style.cssText = `
      color: #666;
      font-size: 11px;
      min-width: 20px;
      display: inline-block;
    `;
    element.appendChild(number);
    
    // Function name if available
    if (frame.function) {
      const func = document.createElement('span');
      func.textContent = frame.function;
      func.style.cssText = `
        color: #ce93d8;
        margin-left: 8px;
        font-size: 12px;
      `;
      element.appendChild(func);
    }
    
    // File path
    const fileLink = document.createElement('span');
    fileLink.className = 'stack-file-link';
    
    let locationText = frame.file;
    if (frame.line !== undefined) {
      locationText += `:${frame.line}`;
      if (frame.column !== undefined) {
        locationText += `:${frame.column}`;
      }
    }
    
    fileLink.textContent = ` (${locationText})`;
    fileLink.style.cssText = `
      color: #64b5f6;
      cursor: pointer;
      font-size: 11px;
      text-decoration: underline;
    `;
    
    fileLink.addEventListener('click', () => {
      if (this.onFileClick) {
        this.onFileClick(frame.file, frame.line, frame.column);
      }
    });
    
    element.appendChild(fileLink);
    
    element.style.cssText = `
      padding: 2px 0 2px 40px;
      font-family: 'Consolas', 'Monaco', monospace;
      line-height: 1.4;
    `;
    
    return element;
  }

  /**
   * Highlight a single line
   */
  private static highlightLine(line: string): HTMLElement {
    const element = document.createElement('div');
    element.className = 'terminal-line';
    
    // Check for error indicators
    if (this.isErrorLine(line)) {
      element.classList.add('error-line');
      element.innerHTML = this.highlightErrorInLine(line);
    } else if (ErrorParser.isWarning(line)) {
      element.classList.add('warning-line');
      element.innerHTML = this.highlightWarningInLine(line);
    } else {
      // Highlight file paths in regular lines
      element.innerHTML = this.highlightFilePaths(line);
    }
    
    element.style.cssText = `
      padding: 1px 0;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.4;
    `;
    
    return element;
  }

  /**
   * Check if line contains error
   */
  private static isErrorLine(line: string): boolean {
    const errorPatterns = [
      /^error:/i,
      /\[error\]/i,
      /syntaxerror:/i,
      /typeerror:/i,
      /referenceerror:/i,
      /exception/i,
    ];
    
    return errorPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Highlight error keywords in line
   */
  private static highlightErrorInLine(line: string): string {
    // Highlight error type
    line = line.replace(
      /([A-Z][a-zA-Z]*Error|Exception|Fatal)/g,
      '<span style="color: #ff5252; font-weight: bold;">$1</span>'
    );
    
    // Highlight file paths
    line = this.highlightFilePaths(line);
    
    return line;
  }

  /**
   * Highlight warning keywords in line
   */
  private static highlightWarningInLine(line: string): string {
    // Highlight warning keyword
    line = line.replace(
      /(warning|warn)/gi,
      '<span style="color: #ffa726; font-weight: bold;">$1</span>'
    );
    
    // Highlight file paths
    line = this.highlightFilePaths(line);
    
    return line;
  }

  /**
   * Highlight file paths in text
   */
  private static highlightFilePaths(text: string): string {
    // Pattern for file:line:column
    const pattern = /([a-zA-Z]:[\\\/][\w\\\/\-\.]+\.\w+|[\w\/\-\.]+\.\w+):(\d+)(?::(\d+))?/g;
    
    return text.replace(pattern, (match, file, line, column) => {
      const locationText = column ? `${file}:${line}:${column}` : `${file}:${line}`;
      return `<span class="file-path-link" style="color: #42a5f5; text-decoration: underline; cursor: pointer;" data-file="${file}" data-line="${line}" data-column="${column || ''}">${locationText}</span>`;
    });
  }

  /**
   * Initialize click handlers for dynamically added file paths
   */
  static initializeFilePathHandlers(container: HTMLElement) {
    const fileLinks = container.querySelectorAll('.file-path-link');
    fileLinks.forEach(link => {
      const element = link as HTMLElement;
      const file = element.dataset.file;
      const line = element.dataset.line;
      const column = element.dataset.column;
      
      element.addEventListener('click', () => {
        if (this.onFileClick && file) {
          this.onFileClick(
            file,
            line ? parseInt(line) : undefined,
            column ? parseInt(column) : undefined
          );
        }
      });
      
      element.addEventListener('mouseenter', () => {
        element.style.backgroundColor = 'rgba(66, 165, 245, 0.1)';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.backgroundColor = 'transparent';
      });
    });
  }

  /**
   * Apply custom CSS for error highlighting
   */
  static injectStyles() {
    const styleId = 'error-highlighter-styles';
    
    // Check if already injected
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .formatted-error {
        border-left: 3px solid #ff5252;
        padding: 8px;
        margin: 8px 0;
        background: rgba(255, 82, 82, 0.05);
        border-radius: 4px;
      }
      
      .formatted-error.warning-container {
        border-left-color: #ffa726;
        background: rgba(255, 167, 38, 0.05);
      }
      
      .error-line {
        color: #ff8a80 !important;
      }
      
      .warning-line {
        color: #ffd54f !important;
      }
      
      .file-path-link {
        transition: background-color 0.2s ease;
        padding: 0 2px;
        border-radius: 2px;
      }
      
      .stack-frame {
        transition: background-color 0.2s ease;
      }
      
      .stack-frame:hover {
        background: rgba(255, 255, 255, 0.02);
      }
      
      .terminal-output-highlighted {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      }
    `;
    
    document.head.appendChild(style);
  }
}