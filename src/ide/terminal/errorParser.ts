/**
 * ====================================================================================================
 * FILE: src/ide/terminal/errorParser.ts - Advanced Error Detection and Parsing
 * ====================================================================================================
 * 
 * PURPOSE:
 * Detects and parses errors from terminal output for various programming languages and tools.
 * Supports Node.js, Python, TypeScript, Rust, Java, C++, and more.
 * 
 * FEATURES:
 * - Multi-language error detection
 * - File path extraction with line/column numbers
 * - Error type classification
 * - Stack trace parsing
 * - Warning detection
 * 
 * ====================================================================================================
 */

export interface ParsedError {
  type: 'error' | 'warning' | 'info';
  errorType?: string; // SyntaxError, TypeError, etc.
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stackTrace?: StackFrame[];
  raw: string;
  language?: string;
}

export interface StackFrame {
  file: string;
  line?: number;
  column?: number;
  function?: string;
  raw: string;
}

export class ErrorParser {
  /**
   * Main parsing function - detects and parses errors from output
   */
  static parse(output: string): ParsedError | null {
    const lines = output.split('\n');
    
    // Try different error patterns
    const parsers = [
      this.parseNodeError,
      this.parseTypeScriptError,
      this.parsePythonError,
      this.parseRustError,
      this.parseJavaError,
      this.parseGccError,
      this.parseGenericError,
    ];

    for (const parser of parsers) {
      const result = parser.call(this, lines, output);
      if (result) {
        return result;
      }
    }

    // Check if it contains error keywords
    if (this.containsErrorKeywords(output)) {
      return {
        type: 'error',
        message: output.trim(),
        raw: output,
      };
    }

    return null;
  }

  /**
   * Parse Node.js errors
   * Pattern: Error: message
   *          at function (file:line:column)
   */
  private static parseNodeError(lines: string[], fullOutput: string): ParsedError | null {
    // Look for error patterns
    const errorLineRegex = /^([A-Z][a-zA-Z]*Error): (.+)$/;
    const filePathRegex = /at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/;
    
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    let file: string | undefined;
    let line: number | undefined;
    let column: number | undefined;
    const stackTrace: StackFrame[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      
      // Check for error type and message
      const errorMatch = currentLine.match(errorLineRegex);
      if (errorMatch) {
        errorType = errorMatch[1];
        errorMessage = errorMatch[2];
        
        // Look ahead for file path in next lines
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const stackLine = lines[j].trim();
          const pathMatch = stackLine.match(filePathRegex);
          
          if (pathMatch) {
            const funcName = pathMatch[1];
            const filePath = pathMatch[2];
            const lineNum = parseInt(pathMatch[3]);
            const colNum = parseInt(pathMatch[4]);
            
            stackTrace.push({
              file: filePath,
              line: lineNum,
              column: colNum,
              function: funcName,
              raw: stackLine,
            });
            
            // Set first occurrence as main file
            if (!file) {
              file = filePath;
              line = lineNum;
              column = colNum;
            }
          }
        }
        
        return {
          type: 'error',
          errorType,
          message: errorMessage || currentLine,
          file,
          line,
          column,
          stackTrace: stackTrace.length > 0 ? stackTrace : undefined,
          raw: fullOutput,
          language: 'javascript',
        };
      }
    }

    return null;
  }

  /**
   * Parse TypeScript compiler errors
   * Pattern: file.ts(line,col): error TS2304: message
   */
  private static parseTypeScriptError(lines: string[], fullOutput: string): ParsedError | null {
    const tsErrorRegex = /(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/;
    
    for (const line of lines) {
      const match = line.match(tsErrorRegex);
      if (match) {
        return {
          type: match[4] === 'error' ? 'error' : 'warning',
          errorType: `TS${match[5]}`,
          message: match[6],
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          raw: fullOutput,
          language: 'typescript',
        };
      }
    }

    return null;
  }

  /**
   * Parse Python errors
   * Pattern:   File "script.py", line 5
   *            ErrorType: message
   */
  private static parsePythonError(lines: string[], fullOutput: string): ParsedError | null {
    const fileRegex = /File "(.+?)", line (\d+)(?:, in (.+))?/;
    const errorRegex = /^([A-Z][a-zA-Z]*(?:Error|Warning)): (.+)$/;
    
    let file: string | undefined;
    let line: number | undefined;
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    const stackTrace: StackFrame[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      
      // Check for file path
      const fileMatch = currentLine.match(fileRegex);
      if (fileMatch) {
        const frame: StackFrame = {
          file: fileMatch[1],
          line: parseInt(fileMatch[2]),
          function: fileMatch[3],
          raw: currentLine,
        };
        
        stackTrace.push(frame);
        
        if (!file) {
          file = frame.file;
          line = frame.line;
        }
      }
      
      // Check for error type
      const errorMatch = currentLine.match(errorRegex);
      if (errorMatch) {
        errorType = errorMatch[1];
        errorMessage = errorMatch[2];
      }
    }

    if (errorType || file) {
      return {
        type: errorType?.includes('Warning') ? 'warning' : 'error',
        errorType,
        message: errorMessage || fullOutput,
        file,
        line,
        stackTrace: stackTrace.length > 0 ? stackTrace : undefined,
        raw: fullOutput,
        language: 'python',
      };
    }

    return null;
  }

  /**
   * Parse Rust compiler errors
   * Pattern: error[E0425]: cannot find value `x` in this scope
   *          --> src/main.rs:5:13
   */
  private static parseRustError(lines: string[], fullOutput: string): ParsedError | null {
    const errorRegex = /(error|warning)\[([A-Z]\d+)\]: (.+)/;
    const locationRegex = /-->\s+(.+?):(\d+):(\d+)/;
    
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    let file: string | undefined;
    let line: number | undefined;
    let column: number | undefined;

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      
      const errorMatch = currentLine.match(errorRegex);
      if (errorMatch) {
        errorType = `${errorMatch[1]}[${errorMatch[2]}]`;
        errorMessage = errorMatch[3];
        
        // Look for location in next lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const locMatch = lines[j].match(locationRegex);
          if (locMatch) {
            file = locMatch[1];
            line = parseInt(locMatch[2]);
            column = parseInt(locMatch[3]);
            break;
          }
        }
        
        return {
          type: errorMatch[1] === 'error' ? 'error' : 'warning',
          errorType,
          message: errorMessage,
          file,
          line,
          column,
          raw: fullOutput,
          language: 'rust',
        };
      }
    }

    return null;
  }

  /**
   * Parse Java compiler errors
   * Pattern: Main.java:5: error: ';' expected
   */
  private static parseJavaError(lines: string[], fullOutput: string): ParsedError | null {
    const javaErrorRegex = /(.+\.java):(\d+):\s+(error|warning):\s+(.+)/;
    
    for (const line of lines) {
      const match = line.match(javaErrorRegex);
      if (match) {
        return {
          type: match[3] as 'error' | 'warning',
          message: match[4],
          file: match[1],
          line: parseInt(match[2]),
          raw: fullOutput,
          language: 'java',
        };
      }
    }

    return null;
  }

  /**
   * Parse GCC/Clang errors
   * Pattern: main.c:5:13: error: 'x' undeclared
   */
  private static parseGccError(lines: string[], fullOutput: string): ParsedError | null {
    const gccErrorRegex = /(.+?):(\d+):(\d+):\s+(error|warning):\s+(.+)/;
    
    for (const line of lines) {
      const match = line.match(gccErrorRegex);
      if (match) {
        return {
          type: match[4] as 'error' | 'warning',
          message: match[5],
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          raw: fullOutput,
          language: 'c/c++',
        };
      }
    }

    return null;
  }

  /**
   * Generic error detection
   */
  private static parseGenericError(lines: string[], fullOutput: string): ParsedError | null {
    // Look for common error patterns
    const patterns = [
      /ERROR:\s+(.+)/i,
      /Error:\s+(.+)/,
      /\[ERROR\]\s+(.+)/,
      /Fatal error:\s+(.+)/i,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          return {
            type: 'error',
            message: match[1] || line.trim(),
            raw: fullOutput,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if output contains error keywords
   */
  private static containsErrorKeywords(output: string): boolean {
    const errorKeywords = [
      'error',
      'exception',
      'failed',
      'fatal',
      'panic',
      'traceback',
      'syntaxerror',
      'typeerror',
      'referenceerror',
    ];

    const lowerOutput = output.toLowerCase();
    return errorKeywords.some(keyword => lowerOutput.includes(keyword));
  }

  /**
   * Check if line is a warning
   */
  static isWarning(line: string): boolean {
    const warningPatterns = [
      /warning:/i,
      /\[warn\]/i,
      /⚠/,
      /warn\s+/i,
    ];

    return warningPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract all file paths from output
   */
  static extractFilePaths(output: string): Array<{path: string, line?: number, column?: number}> {
    const paths: Array<{path: string, line?: number, column?: number}> = [];
    
    // Pattern: file:line:column or file(line,column) or file:line
    const patterns = [
      /([a-zA-Z]:[\\\/].+?|[\w\/\-\.]+\.\w+):(\d+):(\d+)/g, // file:line:column
      /([a-zA-Z]:[\\\/].+?|[\w\/\-\.]+\.\w+)\((\d+),(\d+)\)/g, // file(line,column)
      /([a-zA-Z]:[\\\/].+?|[\w\/\-\.]+\.\w+):(\d+)/g, // file:line
      /"([^"]+\.\w+)", line (\d+)/g, // "file", line X (Python)
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        paths.push({
          path: match[1],
          line: match[2] ? parseInt(match[2]) : undefined,
          column: match[3] ? parseInt(match[3]) : undefined,
        });
      }
    }

    return paths;
  }
}