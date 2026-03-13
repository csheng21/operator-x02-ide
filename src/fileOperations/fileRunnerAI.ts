// src/fileOperations/fileRunnerAI.ts
// AI-Powered File Runner Analysis using operator_x02 API
// Provides intelligent file detection, error analysis, and suggestions

/**
 * File analysis result from AI
 */
export interface FileAnalysis {
  fileType: string;
  canRunDirectly: boolean;
  requiresBundler: boolean;
  framework?: string;
  explanation: string;
  suggestions: string[];
  commands: string[];
  severity: 'info' | 'warning' | 'error';
}

/**
 * Error analysis result
 */
export interface ErrorAnalysis {
  errorType: string;
  explanation: string;
  suggestions: string[];
  quickFix?: string;
  documentation?: string;
}

/**
 * AI Settings - Uses operator_x02 API
 */
export function getAISettings(): { provider: string; apiKey: string; model: string; baseUrl: string } {
  // Get settings from window.aiSettings or localStorage
  const settings = (window as any).aiSettings || {};
  const storedSettings = localStorage.getItem('ai_settings');
  const parsed = storedSettings ? JSON.parse(storedSettings) : {};
  
  return {
    provider: settings.provider || parsed.provider || 'operator_x02',
    apiKey: settings.apiKey || parsed.apiKey || '',
    model: settings.model || parsed.model || 'operator_x02',
    baseUrl: settings.baseUrl || parsed.baseUrl || ''
  };
}

/**
 * Call operator_x02 AI API
 */
export async function callOperatorX02API(prompt: string, maxTokens: number = 500): Promise<string | null> {
  try {
    const settings = getAISettings();
    
    // Try using the Tauri invoke if available
    if ((window as any).__TAURI__) {
      const { invoke } = await import('@tauri-apps/api/core');
      
      const response = await invoke('call_ai_api', {
        provider: 'operator_x02',
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
        message: prompt,
        maxTokens: maxTokens,
        temperature: 0.3
      });
      
      return response as string;
    }
    
    // Fallback: Try using window.operatorX02 if exposed globally
    const operatorX02 = (window as any).operatorX02 || (window as any).operator_x02;
    if (operatorX02?.chat || operatorX02?.complete) {
      const response = await (operatorX02.chat || operatorX02.complete)({
        message: prompt,
        maxTokens: maxTokens
      });
      return response?.content || response?.text || response;
    }
    
    // Fallback: Try using window.aiChat if available
    const aiChat = (window as any).aiChat;
    if (aiChat?.sendMessage) {
      const response = await aiChat.sendMessage(prompt);
      return response;
    }
    
    console.warn('No AI API available');
    return null;
    
  } catch (error) {
    console.error('operator_x02 API error:', error);
    return null;
  }
}

/**
 * Pattern-based quick analysis (fast, no API call)
 * Falls back to this when AI is not available
 */
export function analyzeFileQuick(fileName: string, content: string): FileAnalysis {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  
  // React/JSX Detection
  if ((ext === '.tsx' || ext === '.jsx') && isReactComponent(content)) {
    return {
      fileType: 'React Component',
      canRunDirectly: false,
      requiresBundler: true,
      framework: 'React',
      explanation: `${fileName} is a React component that exports JSX. React components cannot be executed directly - they need to be bundled and served by a development server.`,
      suggestions: [
        'Start the development server to see your component',
        'React components are rendered in the browser, not executed in Node.js',
        'Make sure you have all dependencies installed with npm install'
      ],
      commands: ['npm run dev', 'npm start', 'yarn dev'],
      severity: 'warning'
    };
  }
  
  // Vue Component Detection
  if (ext === '.vue') {
    return {
      fileType: 'Vue Component',
      canRunDirectly: false,
      requiresBundler: true,
      framework: 'Vue',
      explanation: `${fileName} is a Vue Single File Component (SFC). Vue components require the Vue CLI or Vite to compile and serve.`,
      suggestions: [
        'Use Vue CLI or Vite development server',
        'Vue SFCs are compiled at build time'
      ],
      commands: ['npm run serve', 'npm run dev', 'yarn dev'],
      severity: 'warning'
    };
  }
  
  // Svelte Component Detection
  if (ext === '.svelte') {
    return {
      fileType: 'Svelte Component',
      canRunDirectly: false,
      requiresBundler: true,
      framework: 'Svelte',
      explanation: `${fileName} is a Svelte component. Svelte components are compiled at build time and need a bundler.`,
      suggestions: [
        'Use SvelteKit or Vite with Svelte plugin',
        'Run the development server to see your component'
      ],
      commands: ['npm run dev', 'yarn dev'],
      severity: 'warning'
    };
  }
  
  // Angular Component Detection
  if (ext === '.ts' && content.includes('@Component') && content.includes('@angular')) {
    return {
      fileType: 'Angular Component',
      canRunDirectly: false,
      requiresBundler: true,
      framework: 'Angular',
      explanation: `${fileName} is an Angular component. Angular requires the Angular CLI to compile and serve.`,
      suggestions: [
        'Use ng serve to start the development server',
        'Angular components are part of a module system'
      ],
      commands: ['ng serve', 'npm start'],
      severity: 'warning'
    };
  }
  
  // HTML with framework scripts
  if (ext === '.html' && (content.includes('react') || content.includes('vue') || content.includes('angular'))) {
    return {
      fileType: 'HTML with Framework',
      canRunDirectly: true,
      requiresBundler: false,
      explanation: `${fileName} is an HTML file that may include framework scripts. You can open it directly in a browser.`,
      suggestions: [
        'Open in browser to view',
        'Use a local server for better development experience'
      ],
      commands: ['npx serve .', 'python -m http.server'],
      severity: 'info'
    };
  }
  
  // TypeScript that needs compilation
  if (ext === '.ts' && !content.includes('Deno')) {
    const hasMainFunction = /^(async\s+)?function\s+main|const\s+main\s*=|export\s+(async\s+)?function/m.test(content);
    const isModule = content.includes('export ') || content.includes('import ');
    
    if (isModule && !hasMainFunction) {
      return {
        fileType: 'TypeScript Module',
        canRunDirectly: false,
        requiresBundler: true,
        explanation: `${fileName} appears to be a TypeScript module without a main entry point. It's likely meant to be imported by other files.`,
        suggestions: [
          'This file exports functionality for other files to use',
          'Run your main entry file instead',
          'Or add executable code to test this module'
        ],
        commands: [],
        severity: 'info'
      };
    }
  }
  
  // CSS/SCSS/LESS files
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    return {
      fileType: 'Stylesheet',
      canRunDirectly: false,
      requiresBundler: false,
      explanation: `${fileName} is a stylesheet. CSS files are not executable - they style HTML pages.`,
      suggestions: [
        'Link this stylesheet to an HTML file',
        'Import it in your JavaScript/TypeScript entry file'
      ],
      commands: [],
      severity: 'info'
    };
  }
  
  // JSON files
  if (ext === '.json') {
    const isPackageJson = fileName === 'package.json';
    return {
      fileType: isPackageJson ? 'Package Configuration' : 'JSON Data',
      canRunDirectly: false,
      requiresBundler: false,
      explanation: isPackageJson 
        ? `${fileName} is your project configuration. Use npm commands to run scripts defined in it.`
        : `${fileName} is a JSON data file. JSON files store data, not executable code.`,
      suggestions: isPackageJson
        ? ['Run "npm run [script]" to execute scripts', 'Check "scripts" section for available commands']
        : ['Use this file as data input for your programs'],
      commands: isPackageJson ? ['npm run dev', 'npm start', 'npm test'] : [],
      severity: 'info'
    };
  }
  
  // Default - can run
  return {
    fileType: getFileTypeFromExtension(ext),
    canRunDirectly: true,
    requiresBundler: false,
    explanation: `${fileName} can be executed directly.`,
    suggestions: [],
    commands: [],
    severity: 'info'
  };
}

/**
 * Check if content is a React component
 */
function isReactComponent(content: string): boolean {
  const hasJSX = /<[A-Za-z][^>]*>/.test(content) && 
                 (content.includes('/>') || /<\/[A-Za-z]+>/.test(content));
  const hasReactImport = /from\s+['"]react['"]/.test(content);
  const hasExportDefault = /export\s+default/.test(content);
  const hasHooks = /use(State|Effect|Context|Reducer|Callback|Memo|Ref)/.test(content);
  const hasComponent = /function\s+[A-Z]|const\s+[A-Z]\w+\s*=\s*(props|\(\s*\{|\(\s*\))/.test(content);
  
  return hasJSX && (hasReactImport || hasExportDefault || hasHooks || hasComponent);
}

/**
 * Get file type description from extension
 */
function getFileTypeFromExtension(ext: string): string {
  const types: Record<string, string> = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.jsx': 'JavaScript React',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.cs': 'C#',
    '.sh': 'Shell Script',
    '.ps1': 'PowerShell',
    '.bat': 'Batch Script'
  };
  return types[ext] || 'Unknown';
}

/**
 * AI-powered file analysis using operator_x02 API
 */
export async function analyzeFileWithAI(
  fileName: string, 
  content: string,
  error?: string
): Promise<FileAnalysis> {
  // Always try quick analysis first for speed
  const quickResult = analyzeFileQuick(fileName, content);
  
  // If quick analysis found something specific, use it
  if (!quickResult.canRunDirectly) {
    return quickResult;
  }
  
  try {
    const prompt = `Analyze this code file and determine if it can be run directly.

File: ${fileName}
${error ? `Error when trying to run: ${error}` : ''}

Code (first 500 chars):
\`\`\`
${content.substring(0, 500)}
\`\`\`

Respond in JSON format only:
{
  "fileType": "type of file (e.g., React Component, Python Script)",
  "canRunDirectly": true/false,
  "requiresBundler": true/false,
  "framework": "framework name if applicable",
  "explanation": "brief explanation for the user",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "commands": ["command to run"],
  "severity": "info/warning/error"
}`;

    const response = await callOperatorX02API(prompt, 500);
    
    if (response) {
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as FileAnalysis;
        // Ensure all required fields exist
        return {
          fileType: parsed.fileType || 'Unknown',
          canRunDirectly: parsed.canRunDirectly ?? true,
          requiresBundler: parsed.requiresBundler ?? false,
          framework: parsed.framework,
          explanation: parsed.explanation || '',
          suggestions: parsed.suggestions || [],
          commands: parsed.commands || [],
          severity: parsed.severity || 'info'
        };
      }
    }
    
    // Fallback to quick analysis
    return quickResult;
    
  } catch (error) {
    console.warn('AI analysis failed, using pattern-based:', error);
    return quickResult;
  }
}

/**
 * AI-powered error analysis using operator_x02 API
 */
export async function analyzeErrorWithAI(
  errorMessage: string,
  fileName: string,
  content?: string
): Promise<ErrorAnalysis> {
  // Quick pattern matching first (always fast)
  const quickAnalysis = analyzeErrorQuick(errorMessage);
  
  try {
    const prompt = `Analyze this error and provide helpful suggestions.

File: ${fileName}
Error: ${errorMessage}
${content ? `Code context (first 300 chars): ${content.substring(0, 300)}` : ''}

Respond in JSON format only:
{
  "errorType": "type of error",
  "explanation": "user-friendly explanation",
  "suggestions": ["fix suggestion 1", "fix suggestion 2"],
  "quickFix": "command to fix if applicable",
  "documentation": "relevant documentation URL if known"
}`;

    const response = await callOperatorX02API(prompt, 400);
    
    if (response) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ErrorAnalysis;
        return {
          errorType: parsed.errorType || quickAnalysis.errorType,
          explanation: parsed.explanation || quickAnalysis.explanation,
          suggestions: parsed.suggestions || quickAnalysis.suggestions,
          quickFix: parsed.quickFix,
          documentation: parsed.documentation
        };
      }
    }
    
    return quickAnalysis;
    
  } catch (error) {
    console.warn('AI error analysis failed:', error);
    return quickAnalysis;
  }
}

/**
 * Quick error pattern matching
 */
export function analyzeErrorQuick(errorMessage: string): ErrorAnalysis {
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerError.includes('module not found') || lowerError.includes('cannot find module')) {
    const moduleMatch = errorMessage.match(/['"]([^'"]+)['"]/);
    const moduleName = moduleMatch ? moduleMatch[1] : 'the module';
    return {
      errorType: 'Missing Module',
      explanation: `The module ${moduleName} is not installed or cannot be found.`,
      suggestions: [
        `Run "npm install ${moduleName}" to install the package`,
        'Check if the import path is correct',
        'Make sure node_modules exists (run npm install)'
      ],
      quickFix: `npm install ${moduleName.split('/')[0]}`
    };
  }
  
  if (lowerError.includes('syntax error') || lowerError.includes('unexpected token')) {
    return {
      errorType: 'Syntax Error',
      explanation: 'There is a syntax error in your code.',
      suggestions: [
        'Check for missing brackets, parentheses, or semicolons',
        'Look at the line number mentioned in the error',
        'Check for typos in keywords'
      ]
    };
  }
  
  if (lowerError.includes('permission denied') || lowerError.includes('eacces')) {
    return {
      errorType: 'Permission Error',
      explanation: 'You do not have permission to access this file or run this command.',
      suggestions: [
        'Run the IDE as administrator',
        'Check file permissions',
        'Make sure no other program is using the file'
      ]
    };
  }
  
  if (lowerError.includes('not found') || lowerError.includes('not recognized')) {
    const programMatch = errorMessage.match(/['"]?(\w+)['"]?\s*(is\s+)?not\s+(found|recognized)/i);
    const program = programMatch ? programMatch[1] : 'The program';
    return {
      errorType: 'Program Not Found',
      explanation: `${program} is not installed or not in your system PATH.`,
      suggestions: [
        `Install ${program} on your system`,
        'Add the program to your system PATH',
        'Restart the IDE after installation'
      ]
    };
  }
  
  if (lowerError.includes('port') && (lowerError.includes('in use') || lowerError.includes('already'))) {
    return {
      errorType: 'Port In Use',
      explanation: 'The port is already being used by another application.',
      suggestions: [
        'Stop the other application using the port',
        'Use a different port (check your config)',
        'Run "npx kill-port 3000" to free the port'
      ],
      quickFix: 'npx kill-port 3000'
    };
  }
  
  return {
    errorType: 'Unknown Error',
    explanation: 'An error occurred while running your code.',
    suggestions: [
      'Check the error message for details',
      'Search for the error message online',
      'Make sure all dependencies are installed'
    ]
  };
}

/**
 * Display AI analysis in terminal with styled UI
 */
export function displayAnalysisInTerminal(
  terminal: HTMLElement,
  analysis: FileAnalysis,
  fileName: string
): void {
  // Create styled container - consistent 12px base font
  const container = document.createElement('div');
  container.style.cssText = `
    margin: 6px 8px;
    padding: 10px 14px;
    background: rgba(88, 166, 255, 0.06);
    border-left: 3px solid #58a6ff;
    border-radius: 0 4px 4px 0;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  `;
  
  // Header with icon based on severity
  const icons = { info: 'ℹ️', warning: '⚠️', error: '❌' };
  const colors = { info: '#58a6ff', warning: '#d29922', error: '#f85149' };
  
  let html = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <span style="font-size: 14px;">${icons[analysis.severity]}</span>
      <span style="color: ${colors[analysis.severity]}; font-weight: 600; font-size: 13px;">${analysis.fileType}</span>
      ${analysis.framework ? `<span style="color: #8b949e; font-size: 12px;">(${analysis.framework})</span>` : ''}
    </div>
    <div style="color: #c9d1d9; font-size: 12px; margin-bottom: 8px;">${analysis.explanation}</div>
  `;
  
  // Suggestions
  if (analysis.suggestions.length > 0) {
    html += `<div style="color: #8b949e; font-size: 12px; margin-bottom: 4px;">💡 Suggestions:</div>`;
    analysis.suggestions.forEach(s => {
      html += `<div style="color: #9ca3af; font-size: 12px; padding-left: 16px; margin-bottom: 2px;">• ${s}</div>`;
    });
  }
  
  // Commands
  if (analysis.commands.length > 0) {
    html += `<div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">`;
    html += `<span style="color: #8b949e; font-size: 12px;">Run:</span>`;
    analysis.commands.forEach((cmd, i) => {
      html += `<span style="padding: 4px 10px; background: rgba(88, 166, 255, 0.15); border-radius: 4px; color: #58a6ff; font-size: 12px; font-weight: 500; cursor: pointer;" onclick="navigator.clipboard.writeText('${cmd}')" title="Click to copy">${cmd}</span>`;
      if (i < analysis.commands.length - 1) {
        html += `<span style="color: #6e7681; font-size: 12px;">or</span>`;
      }
    });
    html += `</div>`;
  }
  
  container.innerHTML = html;
  terminal.appendChild(container);
  
  // Scroll to bottom
  requestAnimationFrame(() => {
    terminal.scrollTop = terminal.scrollHeight;
  });
}

/**
 * Display error analysis in terminal
 */
export function displayErrorInTerminal(
  terminal: HTMLElement,
  analysis: ErrorAnalysis,
  originalError: string
): void {
  const container = document.createElement('div');
  container.style.cssText = `
    margin: 6px 8px;
    padding: 10px 14px;
    background: rgba(248, 81, 73, 0.06);
    border-left: 3px solid #f85149;
    border-radius: 0 4px 4px 0;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  `;
  
  let html = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <span style="font-size: 14px;">🤖</span>
      <span style="color: #f85149; font-weight: 600; font-size: 13px;">AI Error Analysis</span>
      <span style="color: #8b949e; font-size: 12px;">${analysis.errorType}</span>
    </div>
    <div style="color: #c9d1d9; font-size: 12px; margin-bottom: 8px;">${analysis.explanation}</div>
  `;
  
  if (analysis.suggestions.length > 0) {
    html += `<div style="color: #3fb950; font-size: 12px; margin-bottom: 4px;">🔧 Suggested fixes:</div>`;
    analysis.suggestions.forEach((s, i) => {
      html += `<div style="color: #9ca3af; font-size: 12px; padding-left: 16px; margin-bottom: 2px;">${i + 1}. ${s}</div>`;
    });
  }
  
  if (analysis.quickFix) {
    html += `
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
        <span style="color: #3fb950; font-size: 12px;">⚡ Quick fix:</span>
        <span style="padding: 4px 10px; background: rgba(63, 185, 80, 0.15); border-radius: 4px; color: #3fb950; font-size: 12px; font-weight: 500; cursor: pointer;" onclick="navigator.clipboard.writeText('${analysis.quickFix}')" title="Click to copy">${analysis.quickFix}</span>
      </div>
    `;
  }
  
  if (analysis.documentation) {
    html += `
      <div style="margin-top: 6px;">
        <a href="${analysis.documentation}" target="_blank" style="color: #58a6ff; font-size: 12px; text-decoration: none;">📚 Documentation →</a>
      </div>
    `;
  }
  
  container.innerHTML = html;
  terminal.appendChild(container);
  
  requestAnimationFrame(() => {
    terminal.scrollTop = terminal.scrollHeight;
  });
}

/**
 * Main function to check file before running
 * Returns true if file can be run, false if it needs bundler/special handling
 */
export async function checkFileBeforeRun(
  terminal: HTMLElement,
  fileName: string,
  content: string,
  useAI: boolean = false
): Promise<{ canRun: boolean; analysis: FileAnalysis }> {
  let analysis: FileAnalysis;
  
  if (useAI) {
    analysis = await analyzeFileWithAI(fileName, content);
  } else {
    analysis = analyzeFileQuick(fileName, content);
  }
  
  // If file cannot run directly, show analysis
  if (!analysis.canRunDirectly) {
    displayAnalysisInTerminal(terminal, analysis, fileName);
    return { canRun: false, analysis };
  }
  
  return { canRun: true, analysis };
}

/**
 * Handle execution error with AI analysis
 */
export async function handleExecutionError(
  terminal: HTMLElement,
  fileName: string,
  error: string,
  content?: string,
  useAI: boolean = false
): Promise<void> {
  let analysis: ErrorAnalysis;
  
  if (useAI) {
    analysis = await analyzeErrorWithAI(error, fileName, content);
  } else {
    analysis = analyzeErrorQuick(error);
  }
  
  displayErrorInTerminal(terminal, analysis, error);
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).fileRunnerAI = {
    analyzeFileQuick,
    analyzeFileWithAI,
    analyzeErrorWithAI,
    checkFileBeforeRun,
    handleExecutionError,
    displayAnalysisInTerminal,
    displayErrorInTerminal,
    // operator_x02 API access
    callOperatorX02API,
    getAISettings
  };
}

export default {
  analyzeFileQuick,
  analyzeFileWithAI,
  analyzeErrorWithAI,
  checkFileBeforeRun,
  handleExecutionError,
  displayAnalysisInTerminal,
  displayErrorInTerminal,
  callOperatorX02API,
  getAISettings
};
