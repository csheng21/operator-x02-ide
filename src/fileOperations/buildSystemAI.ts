// src/fileOperations/buildSystemAI.ts
// AI-Powered Build System Assistant
// Analyzes errors, suggests fixes, and provides intelligent recommendations

import { invoke } from '@tauri-apps/api/core';

/**
 * AI Build Assistant Configuration
 */
interface AIAssistantConfig {
  enabled: boolean;
  apiKey?: string;
  model?: string;
  autoAnalyze: boolean;
  showSuggestions: boolean;
}

/**
 * Build error analysis result
 */
interface BuildErrorAnalysis {
  error: string;
  errorType: string;
  explanation: string;
  suggestions: string[];
  quickFix?: string;
  documentation?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Build optimization recommendation
 */
interface BuildOptimization {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  implementation: string;
  estimatedImprovement: string;
}

/**
 * AI-powered error pattern database
 */
const ERROR_PATTERNS = {
  // Node.js / npm errors
  MODULE_NOT_FOUND: {
    pattern: /cannot find module|module not found|cannot resolve/i,
    type: 'dependency',
    explanation: 'A required package or module is missing from your project.',
    quickFixes: [
      'Run "npm install" to install all dependencies',
      'Check if the package is listed in package.json',
      'Verify the import path is correct'
    ],
    autoFix: 'npm install'
  },
  
  NPM_NOT_FOUND: {
    pattern: /npm.*not found|command not found.*npm/i,
    type: 'environment',
    explanation: 'Node.js and npm are not installed or not in your system PATH.',
    quickFixes: [
      'Install Node.js from https://nodejs.org',
      'Add Node.js to your system PATH',
      'Restart your IDE after installation'
    ],
    documentation: 'https://nodejs.org/en/download/'
  },
  
  PORT_IN_USE: {
    pattern: /port.*already in use|address already in use/i,
    type: 'runtime',
    explanation: 'Another process is already using the port your app needs.',
    quickFixes: [
      'Stop the other process using the port',
      'Change your app to use a different port',
      'Kill the process: "npx kill-port 3000"'
    ],
    autoFix: 'npx kill-port 3000'
  },
  
  PERMISSION_DENIED: {
    pattern: /permission denied|access denied|eacces/i,
    type: 'permissions',
    explanation: 'You don\'t have permission to access the file or directory.',
    quickFixes: [
      'Run the command with administrator privileges',
      'Check file/folder permissions',
      'Make sure no other program is using the file'
    ]
  },
  
  // Rust / Cargo errors
  CARGO_NOT_FOUND: {
    pattern: /cargo.*not found|command not found.*cargo/i,
    type: 'environment',
    explanation: 'Rust and Cargo are not installed or not in your PATH.',
    quickFixes: [
      'Install Rust from https://rustup.rs',
      'Run: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh',
      'Restart your terminal after installation'
    ],
    documentation: 'https://www.rust-lang.org/tools/install'
  },
  
  RUST_COMPILE_ERROR: {
    pattern: /error\[E\d+\]:|cannot find|mismatched types/i,
    type: 'syntax',
    explanation: 'There\'s a syntax or type error in your Rust code.',
    quickFixes: [
      'Check the error message for the exact line number',
      'Run "cargo check" for detailed error information',
      'Read the Rust compiler suggestions carefully'
    ]
  },
  
  // Python errors
  PYTHON_NOT_FOUND: {
    pattern: /python.*not found|command not found.*python/i,
    type: 'environment',
    explanation: 'Python is not installed or not in your system PATH.',
    quickFixes: [
      'Install Python from https://python.org',
      'Add Python to your system PATH',
      'On Windows: Check "Add Python to PATH" during installation'
    ],
    documentation: 'https://www.python.org/downloads/'
  },
  
  PYTHON_MODULE_NOT_FOUND: {
    pattern: /ModuleNotFoundError|No module named/i,
    type: 'dependency',
    explanation: 'A required Python package is not installed.',
    quickFixes: [
      'Install the package: "pip install [package-name]"',
      'Create requirements.txt and run "pip install -r requirements.txt"',
      'Check if you\'re using the correct virtual environment'
    ],
    autoFix: 'pip install'
  },
  
  // Java / Maven errors
  JAVA_NOT_FOUND: {
    pattern: /java.*not found|command not found.*java/i,
    type: 'environment',
    explanation: 'Java JDK is not installed or not in your PATH.',
    quickFixes: [
      'Install Java JDK from https://adoptium.net',
      'Set JAVA_HOME environment variable',
      'Add Java bin directory to your PATH'
    ],
    documentation: 'https://adoptium.net/installation/'
  },
  
  MAVEN_DEPENDENCY_ERROR: {
    pattern: /could not resolve dependencies|dependency not found/i,
    type: 'dependency',
    explanation: 'Maven cannot download or find a required dependency.',
    quickFixes: [
      'Check your internet connection',
      'Run "mvn clean install" to re-download dependencies',
      'Verify the dependency exists in Maven Central',
      'Check your pom.xml for typos'
    ]
  },
  
  // Generic errors
  SYNTAX_ERROR: {
    pattern: /syntax error|unexpected token|parse error/i,
    type: 'syntax',
    explanation: 'There\'s a syntax error in your code.',
    quickFixes: [
      'Check the line number in the error message',
      'Look for missing brackets, quotes, or semicolons',
      'Use your IDE\'s syntax highlighting to spot issues'
    ]
  },
  
  OUT_OF_MEMORY: {
    pattern: /out of memory|heap.*exceeded|memory.*error/i,
    type: 'performance',
    explanation: 'Your build process is running out of memory.',
    quickFixes: [
      'Close other applications to free up RAM',
      'Increase Node.js memory: "NODE_OPTIONS=--max-old-space-size=4096"',
      'Split large builds into smaller chunks',
      'Clear build cache: "npm run clean"'
    ]
  },
  
  TIMEOUT_ERROR: {
    pattern: /timeout|timed out|connection timeout/i,
    type: 'network',
    explanation: 'A network operation took too long and timed out.',
    quickFixes: [
      'Check your internet connection',
      'Try again - it might be a temporary issue',
      'Use a different npm registry: "npm config set registry https://registry.npmjs.org/"',
      'Increase timeout: "npm config set timeout 600000"'
    ]
  }
};

/**
 * Analyze build error and provide AI-powered suggestions
 */
export function analyzeError(errorMessage: string): BuildErrorAnalysis | null {
  if (!errorMessage || errorMessage.trim().length === 0) {
    return null;
  }
  
  // Check against known patterns
  for (const [key, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.pattern.test(errorMessage)) {
      return {
        error: errorMessage,
        errorType: pattern.type,
        explanation: pattern.explanation,
        suggestions: pattern.quickFixes,
        quickFix: pattern.autoFix,
        documentation: pattern.documentation,
        severity: pattern.type === 'syntax' ? 'error' : 'warning'
      };
    }
  }
  
  // If no pattern matches, provide generic analysis
  return analyzeErrorGeneric(errorMessage);
}

/**
 * Generic error analysis when no pattern matches
 */
function analyzeErrorGeneric(errorMessage: string): BuildErrorAnalysis {
  // Extract key information
  const hasLineNumber = /line \d+|:\d+:/i.test(errorMessage);
  const hasFile = /\.js|\.ts|\.py|\.rs|\.java/i.test(errorMessage);
  
  let explanation = 'An error occurred during the build process.';
  const suggestions: string[] = [];
  
  if (hasLineNumber && hasFile) {
    explanation = 'There appears to be an error in your code at a specific line.';
    suggestions.push('Check the file and line number mentioned in the error');
    suggestions.push('Read the full error message for details');
  }
  
  if (errorMessage.toLowerCase().includes('not found')) {
    suggestions.push('Make sure all required tools are installed');
    suggestions.push('Check your system PATH environment variable');
  }
  
  if (errorMessage.toLowerCase().includes('failed')) {
    suggestions.push('Try running the command again');
    suggestions.push('Check if you have internet connectivity');
  }
  
  suggestions.push('Copy the error and search online for solutions');
  suggestions.push('Ask the AI assistant for help interpreting this error');
  
  return {
    error: errorMessage,
    errorType: 'unknown',
    explanation,
    suggestions,
    severity: 'error'
  };
}

/**
 * Get AI-powered build optimizations
 */
export async function getBuildOptimizations(
  buildSystem: string,
  projectPath: string
): Promise<BuildOptimization[]> {
  const optimizations: BuildOptimization[] = [];
  
  // Analyze based on build system
  switch (buildSystem.toLowerCase()) {
    case 'npm':
    case 'yarn':
    case 'pnpm':
      optimizations.push(...getNodeOptimizations());
      break;
    case 'cargo':
      optimizations.push(...getRustOptimizations());
      break;
    case 'maven':
    case 'gradle':
      optimizations.push(...getJavaOptimizations());
      break;
  }
  
  return optimizations;
}

/**
 * Node.js build optimizations
 */
function getNodeOptimizations(): BuildOptimization[] {
  return [
    {
      title: 'Enable npm cache',
      description: 'Cache downloaded packages to speed up future installs',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'npm config set cache ~/.npm-cache --global',
      estimatedImprovement: '50-70% faster installs on repeat builds'
    },
    {
      title: 'Use production builds',
      description: 'Exclude dev dependencies in production builds',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'npm install --production',
      estimatedImprovement: '30-50% smaller bundle size'
    },
    {
      title: 'Parallelize builds',
      description: 'Use concurrent builds to leverage multiple CPU cores',
      impact: 'medium',
      difficulty: 'medium',
      implementation: 'npm install concurrently --save-dev',
      estimatedImprovement: '20-40% faster builds'
    },
    {
      title: 'Enable TypeScript incremental builds',
      description: 'Only rebuild changed files',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'Add "incremental": true to tsconfig.json',
      estimatedImprovement: '60-80% faster rebuilds'
    }
  ];
}

/**
 * Rust build optimizations
 */
function getRustOptimizations(): BuildOptimization[] {
  return [
    {
      title: 'Use release mode for benchmarking',
      description: 'Enable optimizations for production builds',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'cargo build --release',
      estimatedImprovement: '10-100x faster runtime performance'
    },
    {
      title: 'Enable link-time optimization (LTO)',
      description: 'Optimize across crate boundaries',
      impact: 'medium',
      difficulty: 'easy',
      implementation: 'Add lto = true to Cargo.toml [profile.release]',
      estimatedImprovement: '5-15% smaller binary, slightly slower build'
    },
    {
      title: 'Use sccache for faster rebuilds',
      description: 'Cache compiled artifacts',
      impact: 'high',
      difficulty: 'medium',
      implementation: 'cargo install sccache && export RUSTC_WRAPPER=sccache',
      estimatedImprovement: '50-90% faster rebuilds'
    }
  ];
}

/**
 * Java build optimizations
 */
function getJavaOptimizations(): BuildOptimization[] {
  return [
    {
      title: 'Enable Maven parallel builds',
      description: 'Build multiple modules simultaneously',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'mvn clean install -T 4 (or -T 1C for 1 thread per core)',
      estimatedImprovement: '30-60% faster multi-module builds'
    },
    {
      title: 'Skip tests during development',
      description: 'Speed up builds by skipping test execution',
      impact: 'medium',
      difficulty: 'easy',
      implementation: 'mvn clean install -DskipTests',
      estimatedImprovement: '40-70% faster builds'
    },
    {
      title: 'Use Gradle build cache',
      description: 'Reuse outputs from previous builds',
      impact: 'high',
      difficulty: 'easy',
      implementation: 'Add org.gradle.caching=true to gradle.properties',
      estimatedImprovement: '50-80% faster rebuilds'
    }
  ];
}

/**
 * Display AI analysis in terminal
 */
export function displayErrorAnalysis(
  analysis: BuildErrorAnalysis,
  terminal?: any
): void {
  const term = terminal || (window as any).terminal || (window as any).xterm;
  
  if (!term) {
    console.error('Terminal not available');
    return;
  }
  
  // Clear and show analysis
  term.write('\r\n');
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\x1b[1;33m🤖 AI Error Analysis\x1b[0m\r\n');
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\r\n');
  
  // Error type
  term.write(`\x1b[1;35m📋 Error Type:\x1b[0m ${analysis.errorType}\r\n`);
  term.write('\r\n');
  
  // Explanation
  term.write('\x1b[1;32m💡 What happened:\x1b[0m\r\n');
  term.write(`   ${analysis.explanation}\r\n`);
  term.write('\r\n');
  
  // Suggestions
  if (analysis.suggestions.length > 0) {
    term.write('\x1b[1;33m🔧 Suggested fixes:\x1b[0m\r\n');
    analysis.suggestions.forEach((suggestion, i) => {
      term.write(`   ${i + 1}. ${suggestion}\r\n`);
    });
    term.write('\r\n');
  }
  
  // Quick fix
  if (analysis.quickFix) {
    term.write('\x1b[1;36m⚡ Quick fix command:\x1b[0m\r\n');
    term.write(`   \x1b[1;37m${analysis.quickFix}\x1b[0m\r\n`);
    term.write('\r\n');
  }
  
  // Documentation
  if (analysis.documentation) {
    term.write('\x1b[1;34m📚 Learn more:\x1b[0m\r\n');
    term.write(`   ${analysis.documentation}\r\n`);
    term.write('\r\n');
  }
  
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\r\n');
}

/**
 * Display optimization recommendations
 */
export function displayOptimizations(
  optimizations: BuildOptimization[],
  terminal?: any
): void {
  const term = terminal || (window as any).terminal || (window as any).xterm;
  
  if (!term || optimizations.length === 0) {
    return;
  }
  
  term.write('\r\n');
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\x1b[1;33m🚀 AI Build Optimizations\x1b[0m\r\n');
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\r\n');
  
  optimizations.forEach((opt, i) => {
    // Impact indicator
    const impactColor = opt.impact === 'high' ? '\x1b[1;32m' : 
                       opt.impact === 'medium' ? '\x1b[1;33m' : '\x1b[1;37m';
    
    term.write(`\x1b[1;35m${i + 1}. ${opt.title}\x1b[0m\r\n`);
    term.write(`   ${opt.description}\r\n`);
    term.write(`   ${impactColor}Impact: ${opt.impact.toUpperCase()}\x1b[0m | Difficulty: ${opt.difficulty}\r\n`);
    term.write(`   \x1b[1;36m💡 ${opt.estimatedImprovement}\x1b[0m\r\n`);
    term.write(`   \x1b[1;37mRun: ${opt.implementation}\x1b[0m\r\n`);
    term.write('\r\n');
  });
  
  term.write('\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
  term.write('\r\n');
}

/**
 * Ask AI assistant about a build issue (using your AI API)
 */
export async function askAIAssistant(
  question: string,
  context: {
    buildSystem?: string;
    error?: string;
    projectPath?: string;
  }
): Promise<string> {
  try {
    // Prepare the prompt
    const prompt = `
You are an expert build system assistant. Help the developer with this build issue:

Question: ${question}

Context:
- Build System: ${context.buildSystem || 'Unknown'}
- Project Path: ${context.projectPath || 'Unknown'}
${context.error ? `- Error Message: ${context.error}` : ''}

Provide a clear, concise answer with:
1. Explanation of the issue
2. Step-by-step solution
3. Example commands if applicable
4. Any relevant best practices

Keep it practical and actionable.
`.trim();

    // Use your existing AI API integration
    const response = await invoke('call_ai_api', {
      provider: 'claude',
      apiKey: '', // Get from settings
      baseUrl: '',
      model: 'claude-sonnet-4-5',
      message: prompt,
      maxTokens: 1000,
      temperature: 0.7
    });
    
    return response as string;
  } catch (error) {
    console.error('AI Assistant error:', error);
    return 'Sorry, I couldn\'t analyze this issue. Please check the error message and try common solutions.';
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).buildSystemAI = {
    analyzeError,
    displayErrorAnalysis,
    getBuildOptimizations,
    displayOptimizations,
    askAIAssistant
  };
}