// multiProviderOrchestrator.ts - Intelligent Multi-Provider AI Router
// ============================================================================
// Routes tasks to the best AI provider automatically
// Default: Operator X02 | Fallback: Groq → Gemini → Deepseek → Claude
// ✅ FIXED: All .includes() calls now have null checks to prevent crashes
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProviderName = 'operator_x02' | 'groq' | 'gemini' | 'deepseek' | 'claude' | 'openai';

export type TaskType = 
  | 'code_generation'    // Write new code
  | 'code_fix'           // Debug/fix code
  | 'code_explain'       // Explain code
  | 'quick_answer'       // Simple quick questions
  | 'complex_reasoning'  // Complex analysis
  | 'creative_writing'   // Stories, content
  | 'image_analysis'     // Analyze images (needs vision)
  | 'translation'        // Language translation
  | 'summarize'          // Summarize text
  | 'general';           // Default/general

export type ProviderRole = 
  | 'disabled'    // Provider is disabled - not used in auto-routing
  | 'auto'        // Default - uses task detection
  | 'architect'   // System design & planning
  | 'developer'   // Code implementation
  | 'reviewer'    // Code review & quality
  | 'tester'      // Testing & QA
  | 'debugger'    // Bug fixing & troubleshooting
  | 'documenter'  // Documentation & comments
  | 'pm'          // Project management
  | 'security';   // Security analysis

// Role-specific system prompts
export const ROLE_PROMPTS: Record<ProviderRole, string> = {
  disabled: '', // No prompt for disabled
  auto: 'You are a helpful AI coding assistant in an IDE. Provide clear, detailed responses about programming and software development.',
  
  architect: `You are a Senior Software Architect. Your focus is on:
- System design and architecture decisions
- Design patterns and best practices
- Scalability and performance considerations
- Technology stack recommendations
- High-level planning and structure
Provide architectural guidance and explain design rationale.`,

  developer: `You are an Expert Software Developer. Your focus is on:
- Writing clean, efficient, production-ready code
- Following coding standards and best practices
- Implementing features and functionality
- Code optimization and refactoring
Provide working code with clear explanations.`,

  reviewer: `You are a Code Reviewer. Your focus is on:
- Code quality and maintainability
- Identifying bugs, issues, and code smells
- Suggesting improvements and optimizations
- Checking for best practices compliance
- Security and performance concerns
Provide constructive feedback with specific suggestions.`,

  tester: `You are a QA Engineer / Tester. Your focus is on:
- Writing unit tests, integration tests, and e2e tests
- Test coverage and edge cases
- Test-driven development (TDD)
- Bug identification and reproduction steps
- Quality assurance strategies
Provide comprehensive test cases and testing guidance.`,

  debugger: `You are a Debugging Expert. Your focus is on:
- Identifying root causes of bugs and errors
- Step-by-step debugging strategies
- Error message analysis and interpretation
- Fix recommendations with explanations
- Preventing similar issues in the future
Provide systematic debugging guidance and solutions.`,

  documenter: `You are a Technical Writer. Your focus is on:
- Clear and comprehensive documentation
- Code comments and inline documentation
- README files and API documentation
- Usage examples and tutorials
- JSDoc/TSDoc comments
Provide well-structured documentation that helps developers understand the code.`,

  pm: `You are a Technical Project Manager. Your focus is on:
- Project planning and task breakdown
- Timeline and milestone estimation
- Risk assessment and mitigation
- Team coordination and communication
- Agile/Scrum methodologies
Provide actionable project management guidance.`,

  security: `You are a Security Expert. Your focus is on:
- Security vulnerabilities and threats
- Secure coding practices
- Authentication and authorization
- Data protection and encryption
- OWASP guidelines and compliance
Identify security issues and provide secure implementation guidance.`
};

// ============================================================================
// IDE CONTEXT AWARENESS - Modified Files Integration
// ============================================================================

/**
 * Get language from file extension
 */
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'ts': 'TypeScript', 'tsx': 'TypeScript React',
    'js': 'JavaScript', 'jsx': 'JavaScript React',
    'py': 'Python', 'rs': 'Rust', 'go': 'Go',
    'java': 'Java', 'kt': 'Kotlin', 'cs': 'C#',
    'cpp': 'C++', 'c': 'C', 'h': 'C Header',
    'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS',
    'json': 'JSON', 'yaml': 'YAML', 'yml': 'YAML',
    'md': 'Markdown', 'sql': 'SQL', 'sh': 'Shell',
    'vue': 'Vue', 'svelte': 'Svelte', 'php': 'PHP'
  };
  return langMap[ext] || ext.toUpperCase() || 'Text';
}

/**
 * Get current IDE context for AI awareness
 * Includes: modified files, current file, project info
 */
export function getIDEContextForAI(): {
  modifiedFiles: {
    hasModifiedFiles: boolean;
    count: number;
    files: Array<{ path: string; fileName: string; originalLines: number; currentLines: number; lineDiff: number }>;
    summary: string;
  };
  currentFile: { path: string; name: string; language: string } | null;
  projectPath: string | null;
  contextText: string;
} {
  // Get modified files context from fileTreeRenderer
  const getModifiedFilesContext = (window as any).getModifiedFilesContextForAI;
  const modifiedFiles = getModifiedFilesContext 
    ? getModifiedFilesContext() 
    : { hasModifiedFiles: false, count: 0, files: [], summary: '' };
  
  // Get current/active file from tabManager
  const tabManager = (window as any).tabManager;
  const activeTab = tabManager?.getActiveTab?.() || null;
  
  let currentFile = null;
  if (activeTab) {
    const fileName = activeTab.name || activeTab.path?.split(/[/\\]/).pop() || '';
    currentFile = {
      path: activeTab.path || '',
      name: fileName,
      language: activeTab.language || getLanguageFromExtension(fileName)
    };
  }
  
  // Get project path
  const projectPath = (window as any).currentProjectPath || null;
  
  // Build context text for AI prompt
  let contextText = '';
  
  if (currentFile) {
    contextText += `[Active File: ${currentFile.name} (${currentFile.language})]\n`;
  }
  
  if (modifiedFiles.hasModifiedFiles) {
    contextText += `[UNSAVED CHANGES - ${modifiedFiles.count} file(s)]\n`;
    modifiedFiles.files.forEach((file: any) => {
      contextText += `• ${file.fileName}: ${file.originalLines}→${file.currentLines} lines`;
      if (file.lineDiff !== 0) {
        contextText += ` (${file.lineDiff > 0 ? '+' : ''}${file.lineDiff})`;
      }
      contextText += '\n';
    });
  }
  
  return { modifiedFiles, currentFile, projectPath, contextText };
}

/**
 * Handle AI commands for modified files
 */
export function handleModifiedFilesCommand(message: string): { handled: boolean; response?: string } {
  const lowerMessage = message.toLowerCase().trim();
  
  // /modified or /unsaved command
  if (lowerMessage === '/modified' || lowerMessage === '/unsaved' || 
      lowerMessage.startsWith('/modified ') || lowerMessage.startsWith('/unsaved ')) {
    const context = getIDEContextForAI();
    
    if (!context.modifiedFiles.hasModifiedFiles) {
      return { handled: true, response: '✅ No unsaved changes. All files are saved.' };
    }
    
    let response = `📝 **Unsaved Changes (${context.modifiedFiles.count} files)**\n\n`;
    context.modifiedFiles.files.forEach((file: any, i: number) => {
      response += `${i + 1}. **${file.fileName}**\n`;
      response += `   Lines: ${file.originalLines} → ${file.currentLines}`;
      if (file.lineDiff !== 0) response += ` (${file.lineDiff > 0 ? '+' : ''}${file.lineDiff})`;
      response += '\n';
    });
    response += `\n💡 Use \`/save-all\` or Ctrl+Alt+S to save all.`;
    return { handled: true, response };
  }
  
  // /save-all command
  if (lowerMessage === '/save-all' || lowerMessage === '/saveall') {
    const tabManager = (window as any).tabManager;
    if (tabManager?.saveAllTabs) {
      tabManager.saveAllTabs().then((result: any) => {
        console.log('💾 AI triggered Save All:', result);
      });
      return { handled: true, response: '💾 Saving all modified files...' };
    }
    return { handled: true, response: '⚠️ Save function not available.' };
  }
  
  return { handled: false };
}

// Expose to window
(window as any).getIDEContextForAI = getIDEContextForAI;
(window as any).handleModifiedFilesCommand = handleModifiedFilesCommand;

// ============================================================================

export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  strengths: TaskType[];
  speed: 'fastest' | 'fast' | 'medium' | 'slow';
  costTier: 'free' | 'cheap' | 'medium' | 'expensive';
  supportsVision: boolean;
  priority: number;  // Lower = higher priority for fallback
  role: ProviderRole;  // ✅ NEW: Assigned role for this provider
}

// Role icons for UI display
export const ROLE_ICONS: Record<ProviderRole, string> = {
  disabled: '⛔',
  auto: '🔀',
  architect: '🏗️',
  developer: '👨‍💻',
  reviewer: '🔍',
  tester: '🧪',
  debugger: '🐛',
  documenter: '📝',
  pm: '📋',
  security: '🔒'
};

export const ROLE_LABELS: Record<ProviderRole, string> = {
  disabled: 'Disabled',
  auto: 'Auto',
  architect: 'Architect',
  developer: 'Developer',
  reviewer: 'Reviewer',
  tester: 'Tester',
  debugger: 'Debugger',
  documenter: 'Documenter',
  pm: 'Project Manager',
  security: 'Security'
};

export interface OrchestratorConfig {
  defaultProvider: ProviderName;
  enableAutoRouting: boolean;
  enableFallback: boolean;
  enableParallelMode: boolean;
  showProviderIndicator: boolean;
  maxRetries: number;
  providers: Record<ProviderName, ProviderConfig>;
}

export interface RouteResult {
  provider: ProviderName;
  reason: string;
  taskType: TaskType;
  confidence: number;
}

export interface OrchestratorResponse {
  response: string;
  provider: ProviderName;
  taskType: TaskType;
  latencyMs: number;
  fallbackUsed: boolean;
  fallbackChain: ProviderName[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  defaultProvider: 'operator_x02',  // ✅ Operator X02 as default
  enableAutoRouting: false,  // ⭐ Default OFF - user must enable manually
  enableFallback: true,
  enableParallelMode: false,
  showProviderIndicator: true,
  maxRetries: 3,
  providers: {
    operator_x02: {
      name: 'operator_x02',
      displayName: 'Operator X02',
      enabled: true,
      apiKey: '',
      baseUrl: 'https://api.operator-x02.com/v1',  // ✅ Standalone API
      model: 'operator-x02-chat',  // ✅ Custom model
      maxTokens: 4000,
      strengths: ['code_generation', 'code_fix'],  // ✅ Focused on code tasks
      speed: 'fast',
      costTier: 'cheap',
      supportsVision: false,
      priority: 1,  // Highest for code tasks
      role: 'auto'
    },
    groq: {
      name: 'groq',
      displayName: 'Groq',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4000,
      strengths: ['quick_answer', 'translation'],  // ✅ Best for quick answers
      speed: 'fastest',
      costTier: 'free',
      supportsVision: false,
      priority: 1,  // ✅ Highest priority for quick_answer
      role: 'auto'
    },
    gemini: {
      name: 'gemini',
      displayName: 'Gemini',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      maxTokens: 4000,
      strengths: ['image_analysis', 'creative_writing'],  // ✅ Vision + creative
      speed: 'fast',
      costTier: 'free',
      supportsVision: true,
      priority: 1,  // ✅ Highest for image_analysis
      role: 'auto'
    },
    deepseek: {
      name: 'deepseek',
      displayName: 'Deepseek',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      maxTokens: 4000,
      strengths: ['code_explain'],  // ✅ Code explanation specialty
      speed: 'fast',
      costTier: 'cheap',
      supportsVision: false,
      priority: 2,  // Fallback for code tasks
      role: 'auto'
    },
    claude: {
      name: 'claude',
      displayName: 'Claude',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4000,
      strengths: ['complex_reasoning', 'summarize'],  // ✅ Best for complex reasoning
      speed: 'medium',
      costTier: 'expensive',
      supportsVision: true,
      priority: 1,  // ✅ Highest for complex_reasoning
      role: 'auto'
    },
    openai: {
      name: 'openai',
      displayName: 'OpenAI',
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      maxTokens: 4000,
      strengths: ['general'],  // ✅ General purpose fallback
      speed: 'medium',
      costTier: 'expensive',
      supportsVision: true,
      priority: 3,
      role: 'auto'
    }
  }
};

// ============================================================================
// STORAGE KEYS
// ============================================================================

const ORCHESTRATOR_CONFIG_KEY = 'multiProviderOrchestratorConfig';
const ORCHESTRATOR_STATS_KEY = 'multiProviderOrchestratorStats';

// ============================================================================
// TASK DETECTION - Analyzes message to determine task type
// ============================================================================

// ============================================================================
// TASK DETECTION v2 - Scoring-based system for accurate routing
// ============================================================================
// Instead of first-match regex, we SCORE all task types and pick the highest.
// This ensures messages like "help me write a function" correctly route to
// 'code_generation' instead of falling through to 'general'.
// ============================================================================

interface TaskScore {
  taskType: TaskType;
  score: number;
  matchedKeywords: string[];
}

// Keyword-based scoring (each keyword adds to the score)
const TASK_KEYWORDS: Record<Exclude<TaskType, 'general'>, { keywords: string[]; patterns: RegExp[]; weight: number }> = {
  code_generation: {
    keywords: ['write', 'create', 'generate', 'make', 'build', 'implement', 'code', 'add', 
               'develop', 'function', 'class', 'component', 'script', 'program', 'app',
               'feature', 'module', 'api', 'endpoint', 'route', 'handler', 'hook',
               'template', 'boilerplate', 'scaffold', 'setup', 'init', 'new'],
    patterns: [
      /\b(write|create|generate|make|build|implement)\b.*\b(function|class|component|code|app|script|module)\b/i,
      /\b(can you|please|could you|help me)\b.*\b(write|create|code|build|make|add)\b/i,
      /^(write|create|generate|implement|build|make|add|code)\s/i,
      /\b(how to|how do i)\b.*\b(create|make|build|implement|write|add)\b/i
    ],
    weight: 1.0
  },
  code_fix: {
    keywords: ['fix', 'debug', 'repair', 'solve', 'resolve', 'bug', 'error', 'issue', 
               'problem', 'broken', 'crash', 'fail', 'wrong', 'unexpected', 'undefined',
               'null', 'exception', 'stack trace', 'not working', 'doesn\'t work',
               'won\'t', 'can\'t', 'unable', 'stuck', 'help'],
    patterns: [
      /\b(fix|debug|repair|solve|resolve)\b.*\b(bug|error|issue|problem|code)\b/i,
      /\b(why|what's wrong|doesn't work|not working|broken|won't|can't)\b/i,
      /\b(error|exception|crash|fail|undefined|null|NaN)\b.*\b(when|in|at|on)\b/i,
      /\b(getting|throws?|shows?)\b.*\b(error|exception|warning)\b/i,
      /\b(TypeError|ReferenceError|SyntaxError|RuntimeError|panic)\b/i
    ],
    weight: 1.0
  },
  code_explain: {
    keywords: ['explain', 'what does', 'how does', 'understand', 'clarify', 'meaning',
               'purpose', 'why does', 'how is', 'what is this', 'walk me through',
               'break down', 'tell me about', 'describe', 'overview'],
    patterns: [
      /\b(explain|what does|how does|understand|clarify)\b.*\b(code|function|this|it|class|method)\b/i,
      /\b(what is|what are|how do)\b.*\b(this|these|it|that)\b/i,
      /^explain\s/i,
      /\b(walk me through|break down|describe)\b/i,
      /\b(what|how)\b.*\b(work|mean|do)\b/i
    ],
    weight: 1.0
  },
  quick_answer: {
    keywords: ['quick', 'briefly', 'short', 'fast', 'simple', 'yes or no', 'which'],
    patterns: [
      /^(what|who|when|where|is|are|can|does|do|which|how much|how many)\s.{0,80}(\?)?$/i,
      /^(yes or no|quick|briefly|short answer)\b/i,
      /^.{0,30}\?$/  // Very short questions
    ],
    weight: 0.8  // Lower weight — many things look like questions
  },
  complex_reasoning: {
    keywords: ['analyze', 'analysis', 'compare', 'contrast', 'evaluate', 'assess',
               'reason', 'think through', 'pros and cons', 'advantages', 'disadvantages',
               'implications', 'trade-offs', 'tradeoffs', 'recommend', 'best approach',
               'architecture', 'design', 'plan', 'strategy', 'review', 'optimize',
               'refactor', 'improve', 'performance', 'scalability', 'comprehensive',
               'detailed', 'thorough', 'step by step', 'in-depth'],
    patterns: [
      /\b(analyze|analysis|compare|contrast|evaluate|assess|review)\b/i,
      /\b(pros and cons|advantages|disadvantages|trade-?offs|implications)\b/i,
      /\b(step by step|detailed|comprehensive|thorough|in-depth)\b/i,
      /\b(best (approach|way|practice|method)|how should (i|we))\b/i,
      /\b(architect|design|plan|strategy)\b.*\b(system|app|project|solution)\b/i
    ],
    weight: 1.0
  },
  creative_writing: {
    keywords: ['story', 'poem', 'essay', 'article', 'blog', 'content', 'creative',
               'fiction', 'narrative', 'draft', 'compose', 'letter', 'email'],
    patterns: [
      /\b(write|create|compose|draft)\b.*\b(story|poem|essay|article|blog|content|letter|email)\b/i,
      /\b(creative|fiction|narrative|imaginative)\b/i
    ],
    weight: 1.0
  },
  image_analysis: {
    keywords: ['image', 'picture', 'photo', 'screenshot', 'diagram', 'chart', 'visual',
               'camera', 'scan', 'OCR'],
    patterns: [
      /\b(image|picture|photo|screenshot|diagram|chart)\b/i,
      /\b(what('s| is) in|describe|analyze)\b.*\b(image|picture|this|photo)\b/i
    ],
    weight: 1.2  // Higher weight — image tasks are very specific
  },
  translation: {
    keywords: ['translate', 'translation', 'language', 'localize', 'i18n'],
    patterns: [
      /\b(translate|translation|convert)\b.*\b(to|into|from)\b/i,
      /\b(in|to)\s+(english|spanish|french|german|chinese|japanese|korean|arabic|hindi|portuguese|russian|malay|indonesian)\b/i
    ],
    weight: 1.2
  },
  summarize: {
    keywords: ['summarize', 'summary', 'tldr', 'brief', 'overview', 'key points',
               'recap', 'outline', 'document', 'documentation', 'docs', 'readme',
               'api doc', 'jsdoc', 'javadoc', 'docstring', 'write docs', 'generate doc',
               'main points', 'gist'],
    patterns: [
      /\b(summarize|summary|tldr|tl;dr|brief|overview|key points|recap|outline)\b/i,
      /\b(main (points|ideas|takeaways)|gist)\b/i,
      /\b(generate|create|write|make)\b.*\b(doc(s|ument|umentation)?|readme|report)\b/i,
      /\b(doc(s|ument|umentation)?)\b.*\b(for|about|of)\b/i
    ],
    weight: 1.0
  }
};

/**
 * Detect the type of task from user message
 * ✅ v2: Uses scoring system instead of first-match regex
 * - Scores ALL task types simultaneously
 * - Picks highest score above threshold
 * - Falls back to 'general' only when truly ambiguous
 * - Also detects code presence in message for better routing
 */
export function detectTaskType(message: string): { taskType: TaskType; confidence: number } {
  // ✅ FIX: Handle null/undefined/empty message
  if (!message || typeof message !== 'string') {
    console.warn('detectTaskType: Invalid message, defaulting to general');
    return { taskType: 'general', confidence: 0.3 };
  }
  
  const messageLower = message.toLowerCase();
  const messageLength = message.length;
  
  // ✅ Special case: Very short messages (greetings, etc.) → quick_answer
  if (messageLength < 15 && !/[{}\[\]()=<>;]/.test(message)) {
    // Short casual message like "hi", "hello", "thanks", etc.
    return { taskType: 'quick_answer', confidence: 0.7 };
  }
  
  // ✅ Special case: Message contains code blocks or code-like content → code task
  const hasCodeBlock = /```[\s\S]*```/.test(message);
  const hasCodeSyntax = /\b(function|class|const|let|var|import|export|return|if|else|for|while|def |fn |pub |async |await )\b/.test(message);
  const hasErrorTrace = /\b(at\s+\w+|line\s+\d+|Error:|Traceback|panic!|stack trace)\b/i.test(message);
  
  // Score each task type
  const scores: TaskScore[] = [];
  
  for (const [taskType, config] of Object.entries(TASK_KEYWORDS)) {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    // Score from keyword matches
    for (const keyword of config.keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }
    
    // Score from pattern matches (higher value than keywords)
    for (const pattern of config.patterns) {
      if (pattern && pattern.test(message)) {
        score += 25;
      }
    }
    
    // Apply weight
    score *= config.weight;
    
    // Bonus for code presence
    if (hasCodeBlock || hasCodeSyntax) {
      if (taskType === 'code_generation' || taskType === 'code_fix' || taskType === 'code_explain') {
        score += 15;
      }
    }
    
    if (hasErrorTrace) {
      if (taskType === 'code_fix') {
        score += 30; // Strong signal for debugging
      }
    }
    
    if (score > 0) {
      scores.push({ taskType: taskType as TaskType, score, matchedKeywords });
    }
  }
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);
  
  if (scores.length > 0 && scores[0].score >= 10) {
    let best = scores[0];
    const secondScore = scores[1]?.score || 0;
    
    // ✅ FIX: If quick_answer wins but a SPECIFIC task also scored well,
    // prefer the specific task. Quick_answer gets inflated by question patterns
    // matching almost any "can you...?", "how to...?" message.
    if (best.taskType === 'quick_answer' && scores.length > 1) {
      const specificTask = scores.find(s => 
        s.taskType !== 'quick_answer' && 
        s.taskType !== 'general' && 
        s.score >= 25  // Has at least one keyword + pattern match
      );
      if (specificTask) {
        console.log(`   🔄 Overriding quick_answer (${best.score}) with specific task ${specificTask.taskType} (${specificTask.score})`);
        best = specificTask;
      }
    }
    
    // Calculate confidence based on score and gap to second-best
    const gap = best.score - (scores.find(s => s !== best)?.score || 0);
    const confidence = Math.min(0.95, 0.6 + (gap / 100) + (best.score / 200));
    
    console.log(`🎯 Task scoring: ${best.taskType} (score: ${best.score}, keywords: ${best.matchedKeywords.join(', ')})`);
    if (scores.length > 1) {
      console.log(`   Runner-up: ${scores[1].taskType} (score: ${scores[1].score})`);
    }
    
    return { taskType: best.taskType, confidence };
  }
  
  // ✅ NEW: If message has code content but no clear task → default to code_generation
  if (hasCodeBlock || hasCodeSyntax) {
    return { taskType: 'code_generation', confidence: 0.6 };
  }
  
  // ✅ NEW: If it's a question → quick_answer instead of general
  if (message.trim().endsWith('?') || /^(what|who|when|where|how|why|is|are|can|does|do|which|should)\s/i.test(messageLower)) {
    return { taskType: 'quick_answer', confidence: 0.6 };
  }
  
  // Default to general (but this should happen much less now)
  return { taskType: 'general', confidence: 0.5 };
}

// ============================================================================
// PROVIDER ROUTING LOGIC
// ============================================================================

/**
 * Get the best provider for a given task type
 * ✅ FIXED: All .includes() calls now have null checks
 */
export function getBestProviderForTask(
  taskType: TaskType, 
  config: OrchestratorConfig,
  hasImage: boolean = false
): RouteResult {
  // ✅ FIX: Validate taskType
  if (!taskType) {
    taskType = 'general';
  }
  
  // Get provider roles from localStorage
  let providerRoles: Record<string, string> = {};
  try {
    providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
  } catch (e) {
    providerRoles = {};
  }
  
  // Role to task type mapping — EXPANDED so roles handle more task types
  // ✅ FIX: Added 'general' and 'quick_answer' to relevant roles
  // ✅ FIX: Each role now covers a broader range of tasks it can handle
  const roleToTasks: Record<string, string[]> = {
    'auto': [], // Uses default strengths
    'architect': ['complex_reasoning', 'code_explain', 'general', 'summarize'],
    'developer': ['code_generation', 'code_fix', 'code_explain', 'general'],
    'reviewer': ['code_explain', 'code_fix', 'complex_reasoning'],
    'tester': ['quick_answer', 'code_fix', 'code_generation', 'code_explain'],
    'debugger': ['code_fix', 'code_explain', 'code_generation'],
    'documenter': ['code_explain', 'summarize', 'creative_writing', 'general'],
    'pm': ['complex_reasoning', 'summarize', 'general', 'creative_writing'],
    'security': ['code_explain', 'code_fix', 'code_generation'],
    'disabled': []
  };
  
  // ✅ NEW: Role priority for 'general' tasks (which role should handle general first?)
  // Lower number = higher priority for general/unclassified messages
  const roleGeneralPriority: Record<string, number> = {
    'developer': 1,    // IDE → most messages are about coding
    'architect': 2,    // Design questions are common too
    'documenter': 3,   // Explanation/docs
    'pm': 4,           // Project questions
    'reviewer': 5,
    'debugger': 6,
    'tester': 7,
    'security': 8,
    'auto': 99,
    'disabled': 999
  };
  
  // ✅ FIX: Ensure config.providers exists
  if (!config?.providers) {
    console.warn('getBestProviderForTask: No providers in config');
    return {
      provider: config?.defaultProvider || 'operator_x02',
      reason: 'No providers configured',
      taskType,
      confidence: 0
    };
  }
  
  // Filter out providers that are:
  // 1. Not enabled or no API key
  // 2. Role is set to "disabled" or empty (user chose "—")
  const enabledProviders = Object.values(config.providers)
    .filter(p => {
      // ✅ FIX: Check if p exists
      if (!p) return false;
      if (!p.enabled || !p.apiKey) return false;
      const role = providerRoles[p.name] || 'auto';
      if (role === 'disabled' || role === '') return false;
      return true;
    });
  
  console.log(`🔍 Finding best provider for task: ${taskType}`);
  console.log(`   Enabled providers: ${enabledProviders.map(p => `${p.name}(${providerRoles[p.name] || 'auto'})`).join(', ') || 'none'}`);
  
  if (enabledProviders.length === 0) {
    return {
      provider: config.defaultProvider || 'operator_x02',
      reason: 'No providers configured',
      taskType,
      confidence: 0
    };
  }
  
  // If image analysis task OR hasImage flag, filter to vision-capable providers
  const needsVision = hasImage || taskType === 'image_analysis';
  let candidates = needsVision 
    ? enabledProviders.filter(p => p.supportsVision)
    : enabledProviders;
  
  if (needsVision && candidates.length === 0) {
    // No vision-capable providers available
    console.log(`   ⚠️ No vision-capable providers available for ${taskType}`);
    // Return first enabled provider with a warning
    return {
      provider: enabledProviders[0]?.name || config.defaultProvider || 'operator_x02',
      reason: 'No vision provider available (fallback)',
      taskType,
      confidence: 0.3
    };
  }
  
  if (candidates.length === 0) {
    candidates = enabledProviders;
  }
  
  // ✅ FIX: Safe getProviderStrengths helper that always returns an array
  const getProviderStrengths = (provider: typeof candidates[0]): string[] => {
    if (!provider) return [];
    const role = providerRoles[provider.name] || 'auto';
    if (role !== 'auto' && roleToTasks[role]) {
      return roleToTasks[role] || [];
    }
    // ✅ FIX: Ensure we always return an array
    return Array.isArray(provider.strengths) ? provider.strengths : [];
  };
  
  // ✅ FIX: Find providers with EXPLICIT ROLE assignments first (prioritize user configuration)
  const roleSpecialists = candidates.filter(p => {
    if (!p) return false;
    const role = providerRoles[p.name] || 'auto';
    if (role === 'auto') return false; // Skip auto-role providers
    const strengths = roleToTasks[role] || [];
    // ✅ FIX: Safe .includes() call
    return Array.isArray(strengths) && strengths.includes(taskType);
  });
  
  if (roleSpecialists.length > 0) {
    // Sort by priority (lower = better), with role-based tiebreaker for general tasks
    roleSpecialists.sort((a, b) => {
      const priDiff = (a.priority || 99) - (b.priority || 99);
      if (priDiff !== 0) return priDiff;
      // Tiebreaker: use role suitability for the task type
      const roleA = providerRoles[a.name] || 'auto';
      const roleB = providerRoles[b.name] || 'auto';
      return (roleGeneralPriority[roleA] ?? 50) - (roleGeneralPriority[roleB] ?? 50);
    });
    const selected = roleSpecialists[0];
    const role = providerRoles[selected.name];
    console.log(`   ✅ Selected by role: ${selected.name} [${role}] for ${taskType}`);
    return {
      provider: selected.name,
      reason: `${role} role for ${taskType.replace('_', ' ')}`,
      taskType,
      confidence: 0.9
    };
  }
  
  // ✅ FIX: Find providers with default strengths (auto role) - THE MAIN BUG FIX
  const autoSpecialists = candidates.filter(p => {
    if (!p) return false;
    const role = providerRoles[p.name] || 'auto';
    if (role !== 'auto') return false; // Skip role-assigned providers
    // ✅ FIX: Check if p.strengths exists and is an array BEFORE calling .includes()
    return Array.isArray(p.strengths) && p.strengths.includes(taskType);
  });
  
  if (autoSpecialists.length > 0) {
    autoSpecialists.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    const selected = autoSpecialists[0];
    console.log(`   ✅ Selected by default strength: ${selected.name} for ${taskType}`);
    return {
      provider: selected.name,
      reason: `Best for ${taskType.replace('_', ' ')}`,
      taskType,
      confidence: 0.85
    };
  }
  
  // No specialist, use default or fastest
  if (taskType === 'quick_answer') {
    // For quick answers, prefer fastest provider
    // ✅ FIX: Use DEFAULT_CONFIG speeds as fallback since localStorage merge may lose speed field
    candidates.sort((a, b) => {
      const speedOrder: Record<string, number> = { fastest: 0, fast: 1, medium: 2, slow: 3 };
      const defaultSpeedA = DEFAULT_CONFIG.providers[a.name as keyof typeof DEFAULT_CONFIG.providers]?.speed;
      const defaultSpeedB = DEFAULT_CONFIG.providers[b.name as keyof typeof DEFAULT_CONFIG.providers]?.speed;
      const speedA = speedOrder[a.speed] ?? speedOrder[defaultSpeedA] ?? 2;
      const speedB = speedOrder[b.speed] ?? speedOrder[defaultSpeedB] ?? 2;
      return speedA - speedB;
    });
    console.log(`   ⚡ Using fastest for quick_answer: ${candidates[0].name} (speed: ${candidates[0].speed || 'unknown'})`);
    console.log(`   📊 Speed ranking: ${candidates.map(c => `${c.name}=${c.speed || '?'}`).join(', ')}`);
    return {
      provider: candidates[0].name,
      reason: 'Fastest available',
      taskType,
      confidence: 0.7
    };
  }
  
  // ✅ FIXED: For 'general' or 'quick_answer' tasks, pick the best-suited role
  // instead of looking for a non-existent 'auto' role provider
  if (taskType === 'general' || taskType === 'quick_answer') {
    // Strategy 1: Sort by role priority for general tasks
    const generalCandidates = candidates
      .map(p => {
        const role = providerRoles[p.name] || 'auto';
        return { provider: p, role, priority: roleGeneralPriority[role] ?? 50 };
      })
      .sort((a, b) => a.priority - b.priority);
    
    if (generalCandidates.length > 0) {
      const selected = generalCandidates[0];
      console.log(`   🤖 Routing '${taskType}' by role priority: ${selected.provider.name} [${selected.role}] (priority: ${selected.priority})`);
      return {
        provider: selected.provider.name,
        reason: `${selected.role} handles ${taskType} (role priority)`,
        taskType,
        confidence: 0.75
      };
    }
  }
  
  // Default provider
  const defaultProvider = candidates.find(p => p.name === config.defaultProvider);
  if (defaultProvider) {
    console.log(`   📍 Using default: ${config.defaultProvider}`);
    return {
      provider: config.defaultProvider,
      reason: 'Default provider',
      taskType,
      confidence: 0.6
    };
  }
  
  // First enabled provider
  console.log(`   🔄 Using first available: ${candidates[0].name}`);
  return {
    provider: candidates[0].name,
    reason: 'First available',
    taskType,
    confidence: 0.5
  };
}

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

class MultiProviderOrchestrator {
  private config: OrchestratorConfig;
  private stats: Record<ProviderName, { calls: number; errors: number; totalLatency: number }>;
  
  constructor() {
    this.config = this.loadConfig();
    this.stats = this.loadStats();
  }
  
  // -------------------------------------------------------------------------
  // Configuration Management
  // -------------------------------------------------------------------------
  
  private loadConfig(): OrchestratorConfig {
    try {
      const saved = localStorage.getItem(ORCHESTRATOR_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // ✅ FIX: Deep merge with defaults to ensure all fields exist including strengths arrays
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        
        // ⭐ v15: One-time migration - force Auto-Route OFF if not explicitly toggled by user
        if (!parsed._autoRouteUserSet) {
          merged.enableAutoRouting = false;
          merged._autoRouteUserSet = true;
          try { localStorage.setItem(ORCHESTRATOR_CONFIG_KEY, JSON.stringify(merged)); } catch(e) {}
          console.log('🔄 [Orchestrator] Auto-Route default changed to OFF');
        }
        
        // Ensure all providers have proper structure
        for (const [name, defaultProvider] of Object.entries(DEFAULT_CONFIG.providers)) {
          if (merged.providers[name]) {
            merged.providers[name] = {
              ...defaultProvider,
              ...merged.providers[name],
              // ✅ FIX: Ensure strengths is always an array
              strengths: Array.isArray(merged.providers[name].strengths) 
                ? merged.providers[name].strengths 
                : defaultProvider.strengths || []
            };
          } else {
            merged.providers[name] = { ...defaultProvider };
          }
        }
        return merged;
      }
    } catch (e) {
      console.warn('Failed to load orchestrator config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }
  
  saveConfig(): void {
    try {
      localStorage.setItem(ORCHESTRATOR_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save orchestrator config:', e);
    }
  }
  
  private loadStats(): Record<ProviderName, { calls: number; errors: number; totalLatency: number }> {
    try {
      const saved = localStorage.getItem(ORCHESTRATOR_STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    
    const stats: any = {};
    for (const provider of Object.keys(DEFAULT_CONFIG.providers)) {
      stats[provider] = { calls: 0, errors: 0, totalLatency: 0 };
    }
    return stats;
  }
  
  private saveStats(): void {
    try {
      localStorage.setItem(ORCHESTRATOR_STATS_KEY, JSON.stringify(this.stats));
    } catch (e) {}
  }
  
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  
  /**
   * Get current configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OrchestratorConfig>): void {
    // ⭐ v15: Track if user explicitly changed auto-route
    if ('enableAutoRouting' in updates) {
      (this.config as any)._autoRouteUserSet = true;
    }
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }
  
  /**
   * Update a specific provider's configuration
   */
  updateProvider(name: ProviderName, updates: Partial<ProviderConfig>): void {
    if (this.config.providers[name]) {
      this.config.providers[name] = { ...this.config.providers[name], ...updates };
      this.saveConfig();
    }
  }
  
  /**
   * Reset config to defaults (keeps API keys)
   */
  resetConfig(): void {
    console.log('🔄 Resetting orchestrator config to defaults...');
    
    // Save current API keys
    const savedKeys: Record<string, string> = {};
    for (const [name, provider] of Object.entries(this.config.providers)) {
      if (provider.apiKey) {
        savedKeys[name] = provider.apiKey;
      }
    }
    
    // Reset to defaults
    this.config = { ...DEFAULT_CONFIG };
    
    // Deep copy providers to avoid reference issues
    this.config.providers = JSON.parse(JSON.stringify(DEFAULT_CONFIG.providers));
    
    // Restore API keys
    for (const [name, key] of Object.entries(savedKeys)) {
      if (this.config.providers[name as ProviderName]) {
        this.config.providers[name as ProviderName].apiKey = key;
        this.config.providers[name as ProviderName].enabled = true;
      }
    }
    
    this.saveConfig();
    console.log('✅ Config reset complete. Routing table:');
    for (const [name, provider] of Object.entries(this.config.providers)) {
      if (provider.enabled && provider.apiKey) {
        // ✅ FIX: Safe access to strengths
        const strengths = Array.isArray(provider.strengths) ? provider.strengths.join(',') : 'none';
        console.log(`   ${name}: strengths=[${strengths}] priority=${provider.priority}`);
      }
    }
  }
  
  /**
   * Set API key for a provider
   */
  setProviderApiKey(name: ProviderName, apiKey: string): void {
    this.updateProvider(name, { apiKey, enabled: apiKey.length > 0 });
  }
  
  /**
   * Import API keys from existing aiApiConfig
   */
  importFromLegacyConfig(): void {
    console.log('📥 Importing API keys from legacy config...');
    
    try {
      // ✅ FIX: Detect proxy-based providers first
      // Only operator_x02 uses the Supabase proxy by default
      const PROXY_PROVIDERS: ProviderName[] = ['operator_x02'];
      const hasProxy = !!(window as any).smartAICall;
      
      if (hasProxy) {
        for (const provider of PROXY_PROVIDERS) {
          if (this.config.providers[provider] && (!this.config.providers[provider].apiKey || this.config.providers[provider].apiKey === '')) {
            this.config.providers[provider].apiKey = 'PROXY';
            this.config.providers[provider].baseUrl = 'PROXY';
            this.config.providers[provider].enabled = true;
            console.log(`  ✅ ${provider} configured via proxy`);
          }
        }
      }
      
      // Import individual provider keys from providerApiKeys
      const savedKeys = localStorage.getItem('providerApiKeys');
      if (savedKeys) {
        const keys = JSON.parse(savedKeys);
        for (const [provider, key] of Object.entries(keys)) {
          if (key && this.config.providers[provider as ProviderName]) {
            console.log(`  ✅ Found key for ${provider}`);
            this.config.providers[provider as ProviderName].apiKey = key as string;
            this.config.providers[provider as ProviderName].enabled = true;
          }
        }
      }
      
      // Import current config
      const currentConfig = localStorage.getItem('aiApiConfig');
      if (currentConfig) {
        const cfg = JSON.parse(currentConfig);
        if (cfg.provider && cfg.apiKey && this.config.providers[cfg.provider as ProviderName]) {
          console.log(`  ✅ Found current provider: ${cfg.provider}`);
          this.config.providers[cfg.provider as ProviderName].apiKey = cfg.apiKey;
          this.config.providers[cfg.provider as ProviderName].enabled = true;
          
          // Also update baseUrl and model if available
          if (cfg.apiBaseUrl) {
            this.config.providers[cfg.provider as ProviderName].baseUrl = cfg.apiBaseUrl;
          }
          if (cfg.model) {
            this.config.providers[cfg.provider as ProviderName].model = cfg.model;
          }
        }
      }
      
      // Save the updated config
      this.saveConfig();
      
      // ✅ FIX: Explicitly disable providers that don't have real API keys
      // and aren't in the proxy list - prevents unwanted fallbacks
      for (const [name, provider] of Object.entries(this.config.providers)) {
        if (!PROXY_PROVIDERS.includes(name as ProviderName)) {
          if (!provider.apiKey || provider.apiKey === '' || provider.apiKey === 'PROXY') {
            provider.enabled = false;
          }
        }
      }
      
      const activeCount = Object.values(this.config.providers).filter(p => p.enabled && p.apiKey).length;
      console.log(`✅ Imported API keys - ${activeCount} providers active`);
    } catch (e) {
      console.warn('Failed to import legacy config:', e);
    }
  }
  
  /**
   * Sync API keys before making calls (ensures latest keys are used)
   */
  private syncApiKeys(): void {
    try {
      // Get provider roles to check for disabled providers
      const providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
      
      // ✅ FIX: Detect proxy-based providers first
      // Only operator_x02 uses the Supabase proxy by default
      const PROXY_PROVIDERS: ProviderName[] = ['operator_x02'];
      const hasProxy = !!(window as any).smartAICall;
      
      if (hasProxy) {
        for (const provider of PROXY_PROVIDERS) {
          if (this.config.providers[provider]) {
            // Only set PROXY if provider doesn't already have a real API key
            if (!this.config.providers[provider].apiKey || this.config.providers[provider].apiKey === '') {
              this.config.providers[provider].apiKey = 'PROXY';
              this.config.providers[provider].baseUrl = 'PROXY';
            }
            // Enable unless explicitly disabled by user
            const isDisabled = providerRoles[provider] === 'disabled';
            this.config.providers[provider].enabled = !isDisabled;
          }
        }
      }
      
      // Sync from providerApiKeys (overrides proxy defaults if user has real keys)
      const savedKeys = localStorage.getItem('providerApiKeys');
      if (savedKeys) {
        const keys = JSON.parse(savedKeys);
        for (const [provider, key] of Object.entries(keys)) {
          if (key && this.config.providers[provider as ProviderName]) {
            this.config.providers[provider as ProviderName].apiKey = key as string;
            // Only enable if not explicitly disabled
            const isDisabled = providerRoles[provider] === 'disabled';
            this.config.providers[provider as ProviderName].enabled = !isDisabled;
          }
        }
      }
      
      // Each provider now has its own independent API key
      // operator_x02 uses proxy, others need real API keys
      
      // ✅ FIX: Explicitly disable providers that don't have real API keys
      // and aren't in the proxy list - prevents unwanted fallbacks
      for (const [name, provider] of Object.entries(this.config.providers)) {
        if (!PROXY_PROVIDERS.includes(name as ProviderName)) {
          if (!provider.apiKey || provider.apiKey === '' || provider.apiKey === 'PROXY') {
            provider.enabled = false;
          }
        }
      }
      
      // Sync from current aiApiConfig
      const currentConfig = localStorage.getItem('aiApiConfig');
      if (currentConfig) {
        const cfg = JSON.parse(currentConfig);
        if (cfg.provider && cfg.apiKey && this.config.providers[cfg.provider as ProviderName]) {
          this.config.providers[cfg.provider as ProviderName].apiKey = cfg.apiKey;
          const isDisabled = providerRoles[cfg.provider] === 'disabled';
          this.config.providers[cfg.provider as ProviderName].enabled = !isDisabled;
        }
      }
    } catch (e) {
      console.warn('Failed to sync API keys:', e);
    }
  }
  
  /**
   * Get statistics for all providers
   */
  getStats(): Record<ProviderName, { calls: number; errors: number; avgLatency: number }> {
    const result: any = {};
    for (const [name, stat] of Object.entries(this.stats)) {
      result[name] = {
        calls: stat.calls,
        errors: stat.errors,
        avgLatency: stat.calls > 0 ? Math.round(stat.totalLatency / stat.calls) : 0
      };
    }
    return result;
  }
  
  /**
   * Main function: Send message and get response from best provider
   */
  async sendMessage(message: string, hasImage: boolean = false, rawMessage?: string): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const fallbackChain: ProviderName[] = [];
    
    // Sync API keys from legacy config before each request
    this.syncApiKeys();
    
    // ✅ NEW: Check for AI commands first (modified files, save-all, etc.)
    const commandResult = handleModifiedFilesCommand(message);
    if (commandResult.handled && commandResult.response) {
      return {
        response: commandResult.response,
        provider: 'operator_x02', // System response
        taskType: 'general',
        confidence: 1,
        latency: Date.now() - startTime,
        fallbackChain: [],
        success: true
      };
    }
    
    // ✅ NEW: Get IDE context and enhance message
    const ideContext = getIDEContextForAI();
    let enhancedMessage = message;
    
    if (ideContext.contextText && ideContext.contextText.trim()) {
      enhancedMessage = `${ideContext.contextText}\n---\n${message}`;
      console.log('📎 IDE Context injected:', {
        modifiedFiles: ideContext.modifiedFiles.count,
        currentFile: ideContext.currentFile?.name || 'none'
      });
    }
    
    // ✅ FIX: Extract CLEAN user message for task detection
    // The message may be polluted by:
    //   - AI History prefix: "=== IMPORTANT: PREVIOUS CONVERSATION HISTORY ===\n..."
    //   - IDE context: "[Active File: ErrorBoundary.tsx (TypeScript)]\n...\n---\n"
    //   - Full file content: "[🖥️ CURRENTLY OPEN FILE: ...]\n```typescript\n..."
    // These inject words like "implement", "code", "script", "function", "class"
    // which cause EVERY message to be misclassified as code_generation
    let taskType: TaskType = 'general';
    let confidence = 0.5;
    let cleanUserMessage = rawMessage || message;
    
    // If rawMessage not provided, try to extract clean user text from polluted message
    if (!rawMessage && message) {
      let extracted = message;
      
      // Strip AI History prefix
      if (extracted.includes('=== IMPORTANT: PREVIOUS CONVERSATION HISTORY ===')) {
        // User's actual message is typically after the history block
        // Look for patterns like "[User]\n" or the last line after "---"
        const userMarker = extracted.lastIndexOf('[User]\n');
        const lastSeparator = extracted.lastIndexOf('\n---\n');
        if (userMarker > -1) {
          extracted = extracted.substring(userMarker + 7).trim();
        } else if (lastSeparator > -1) {
          extracted = extracted.substring(lastSeparator + 5).trim();
        }
      }
      
      // Strip IDE context (format: "[Active File: ...]\n...\n---\nactual message")
      if (extracted.startsWith('[Active File:') || extracted.startsWith('[🖥️') || extracted.startsWith('[📄')) {
        const separator = extracted.indexOf('\n---\n');
        if (separator > -1) {
          extracted = extracted.substring(separator + 5).trim();
        }
      }
      
      // Strip file content blocks
      extracted = extracted.replace(/\[🖥️ CURRENTLY OPEN FILE:.*?\][\s\S]*?```[\s\S]*?```/g, '').trim();
      extracted = extracted.replace(/\[📄 FULL FILE CONTEXT.*?\][\s\S]*?```[\s\S]*?```/g, '').trim();
      
      // Strip project info blocks
      extracted = extracted.replace(/\[📁 PROJECT:.*?\]/g, '').trim();
      extracted = extracted.replace(/\[🔍 AI Search.*?\]/g, '').trim();
      
      if (extracted && extracted.length > 0) {
        cleanUserMessage = extracted;
      }
      
      console.log(`🧹 Clean message for task detection: "${cleanUserMessage.substring(0, 80)}${cleanUserMessage.length > 80 ? '...' : ''}"`);
    }
    
    try {
      if (cleanUserMessage && typeof cleanUserMessage === 'string') {
        const detected = detectTaskType(cleanUserMessage);
        taskType = detected.taskType || 'general';
        confidence = detected.confidence || 0.5;
      }
    } catch (e) {
      console.warn('Task detection failed, using general:', e);
    }
    console.log(`🎯 Task detected: ${taskType} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    
    // Determine provider
    let routeResult: RouteResult;
    
    // Get provider roles from localStorage
    let providerRoles: Record<string, string> = {};
    try {
      providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
    } catch (e) {}
    
    // Helper function to check if provider is available (has key + not disabled)
    const isProviderAvailable = (provider: ProviderName): boolean => {
      const providerConfig = this.config.providers[provider];
      if (!providerConfig) return false;
      if (!providerConfig.enabled) return false;
      if (!providerConfig.apiKey || providerConfig.apiKey === '') return false;
      // Check role from localStorage (this is where user sets disabled)
      const role = providerRoles[provider] || 'auto';
      if (role === 'disabled' || role === '') return false;
      return true;
    };
    
    // Get first available provider as fallback
    const getFirstAvailableProvider = (): ProviderName => {
      const priorities: ProviderName[] = ['operator_x02', 'groq', 'gemini', 'deepseek', 'claude', 'openai'];
      for (const p of priorities) {
        if (isProviderAvailable(p)) return p;
      }
      return this.config.defaultProvider; // Last resort
    };
    
    if (this.config.enableAutoRouting) {
      // Always use intelligent routing when auto-route is enabled
      // Even with low confidence, role-based routing is better than falling back to default
      routeResult = getBestProviderForTask(taskType, this.config, hasImage);
      // Verify the selected provider is available
      if (!isProviderAvailable(routeResult.provider)) {
        const fallbackProvider = getFirstAvailableProvider();
        console.log(`⚠️ ${routeResult.provider} is disabled/unavailable, using ${fallbackProvider}`);
        routeResult.provider = fallbackProvider;
        routeResult.reason = `Fallback (${routeResult.provider} disabled)`;
      }
      console.log(`🔀 Auto-routing to: ${routeResult.provider} (${routeResult.reason}) [confidence: ${(confidence * 100).toFixed(0)}%]`);
    } else {
      // Check if default provider is available
      let defaultProvider = this.config.defaultProvider;
      if (!isProviderAvailable(defaultProvider)) {
        defaultProvider = getFirstAvailableProvider();
        console.log(`⚠️ Default ${this.config.defaultProvider} is disabled/unavailable, using ${defaultProvider}`);
      }
      routeResult = {
        provider: defaultProvider,
        reason: 'Default provider (auto-routing disabled or low confidence)',
        taskType,
        confidence
      };
      console.log(`📍 Using default: ${routeResult.provider}`);
    }
    
    // Try to get response with fallback
    let currentProvider = routeResult.provider;
    let lastError: Error | null = null;
    let attempts = 0;
    
    while (attempts < this.config.maxRetries) {
      attempts++;
      fallbackChain.push(currentProvider);
      
      try {
        console.log(`🚀 Attempt ${attempts}: Calling ${currentProvider}...`);
        this.showProviderIndicator(currentProvider, 'calling');
        
        // ✅ Use enhanced message with IDE context
        const response = await this.callProvider(currentProvider, enhancedMessage);
        
        // Success!
        const latencyMs = Date.now() - startTime;
        this.recordSuccess(currentProvider, latencyMs);
        // Don't show 'success' here - let assistantUI handle it when message is rendered
        
        return {
          response,
          provider: currentProvider,
          taskType,
          latencyMs,
          fallbackUsed: fallbackChain.length > 1,
          fallbackChain
        };
        
      } catch (error: any) {
        console.error(`❌ ${currentProvider} failed:`, error.message);
        lastError = error;
        this.recordError(currentProvider);
        this.showProviderIndicator(currentProvider, 'error');
        
        // Try fallback
        if (this.config.enableFallback) {
          const nextProvider = this.getNextFallbackProvider(fallbackChain);
          if (nextProvider) {
            console.log(`🔄 Falling back to: ${nextProvider}`);
            currentProvider = nextProvider;
            continue;
          }
        }
        break;
      }
    }
    
    // All attempts failed
    throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }
  
  // -------------------------------------------------------------------------
  // Provider API Calls
  // -------------------------------------------------------------------------
  
  private async callProvider(provider: ProviderName, message: string): Promise<string> {
    const config = this.config.providers[provider];
    
    if (!config || !config.enabled) {
      throw new Error(`${provider} is not configured`);
    }
    
    // ✅ FIX: Handle PROXY providers via window.smartAICall (Supabase proxy)
    if (config.apiKey === 'PROXY') {
      const smartAICall = (window as any).smartAICall;
      if (!smartAICall) {
        throw new Error(`${provider} requires proxy but window.smartAICall is not available`);
      }
      
      const role = this.getProviderRole(provider);
      const systemPrompt = this.getRoleSystemPrompt(provider);
      const messageWithRole = role !== 'auto' 
        ? `[System Context: ${systemPrompt}]\n\n${message}`
        : message;
      
      console.log(`🔒 [Orchestrator] Routing ${provider} through Supabase proxy (Role: ${role})...`);
      
      try {
        const result = await smartAICall({
          provider: provider,
          apiKey: 'PROXY',
          model: config.model,
          message: messageWithRole,
          maxTokens: config.maxTokens || 4000,
          temperature: 0.7
        });
        return result;
      } catch (proxyErr: any) {
        throw new Error(`Proxy ${provider} error: ${proxyErr.message || proxyErr}`);
      }
    }
    
    // Non-proxy providers need a real API key
    if (!config.apiKey || config.apiKey === '') {
      throw new Error(`${provider} is not configured (no API key)`);
    }
    
    // Check if we're in Tauri environment
    const isTauri = !!(window as any).__TAURI_INTERNALS__;
    
    // For Tauri, use backend for all providers to avoid CORS issues
    if (isTauri) {
      return this.callViaTauri(provider, config, message);
    }
    
    // Browser mode - only some providers work
    switch (provider) {
      case 'groq':
      case 'gemini':
        // These usually work in browser
        break;
      default:
        throw new Error(`${provider} requires desktop app (CORS restriction)`);
    }
    
    switch (provider) {
      case 'groq':
        return this.callOpenAICompatible(config, message);
      case 'gemini':
        return this.callGemini(config, message);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
  
  /**
   * Get the role assigned to a provider
   */
  private getProviderRole(provider: ProviderName): ProviderRole {
    try {
      const roles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
      return (roles[provider] as ProviderRole) || 'auto';
    } catch (e) {
      return 'auto';
    }
  }
  
  /**
   * Get the system prompt for a provider based on its role
   */
  private getRoleSystemPrompt(provider: ProviderName): string {
    const role = this.getProviderRole(provider);
    return ROLE_PROMPTS[role] || ROLE_PROMPTS.auto;
  }
  
  /**
   * Call any provider via Tauri backend (bypasses CORS)
   */
  private async callViaTauri(provider: ProviderName, config: ProviderConfig, message: string): Promise<string> {
    const role = this.getProviderRole(provider);
    const systemPrompt = this.getRoleSystemPrompt(provider);
    console.log(`🔐 Calling ${provider} via Tauri backend (Role: ${role})...`);
    
    // Prepend role context to message for providers that don't support system prompts in Tauri
    const messageWithRole = role !== 'auto' 
      ? `[System Context: ${systemPrompt}]\n\n${message}`
      : message;
    
    if (provider === 'claude') {
      // Claude uses special endpoint
      const result = await invoke<string>('call_claude_api', {
        request: {
          api_key: config.apiKey,
          model: config.model,
          message: messageWithRole,
          max_tokens: config.maxTokens,
          temperature: 0.7
        }
      });
      return result;
    }
    
    if (provider === 'gemini') {
      // Gemini uses different format - call directly since it usually works
      return this.callGemini(config, messageWithRole);
    }
    
    // All other providers (OpenAI-compatible)
    const result = await invoke<string>('call_ai_api', {
      request: {
        provider: provider,
        api_key: config.apiKey,
        base_url: config.baseUrl,
        model: config.model,
        message: messageWithRole,
        max_tokens: config.maxTokens,
        temperature: 0.7,
        system_prompt: systemPrompt  // Pass system prompt to Tauri backend
      }
    });
    return result;
  }
  
  private async callOpenAICompatible(config: ProviderConfig, message: string): Promise<string> {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: 'You are an AI coding assistant in an IDE. Be concise and helpful.' },
          { role: 'user', content: message }
        ],
        max_tokens: config.maxTokens,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${config.displayName} API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response';
  }
  
  private async callGemini(config: ProviderConfig, message: string): Promise<string> {
    const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: 0.7
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  }
  
  private async callClaude(config: ProviderConfig, message: string): Promise<string> {
    // Claude requires Tauri backend due to CORS
    if (!(window as any).__TAURI_INTERNALS__) {
      throw new Error('Claude requires Tauri desktop app');
    }
    
    const result = await invoke<string>('call_claude_api', {
      request: {
        api_key: config.apiKey,
        model: config.model,
        message: message,
        max_tokens: config.maxTokens,
        temperature: 0.7
      }
    });
    
    return result;
  }
  
  // -------------------------------------------------------------------------
  // Fallback Logic
  // -------------------------------------------------------------------------
  
  private getNextFallbackProvider(alreadyTried: ProviderName[]): ProviderName | null {
    // Get provider roles from localStorage
    let providerRoles: Record<string, string> = {};
    try {
      providerRoles = JSON.parse(localStorage.getItem('providerRoles') || '{}');
    } catch (e) {}
    
    const available = Object.values(this.config.providers)
      .filter(p => {
        if (!p || !p.enabled || !p.apiKey) return false;
        if (alreadyTried.includes(p.name)) return false;
        // Check if provider is disabled via role
        const role = providerRoles[p.name] || 'auto';
        if (role === 'disabled' || role === '') return false;
        return true;
      })
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return available.length > 0 ? available[0].name : null;
  }
  
  // -------------------------------------------------------------------------
  // Stats Recording
  // -------------------------------------------------------------------------
  
  private recordSuccess(provider: ProviderName, latencyMs: number): void {
    if (!this.stats[provider]) {
      this.stats[provider] = { calls: 0, errors: 0, totalLatency: 0 };
    }
    this.stats[provider].calls++;
    this.stats[provider].totalLatency += latencyMs;
    this.saveStats();
    
    // Log activity
    this.logActivity(provider, true, latencyMs);
  }
  
  private recordError(provider: ProviderName): void {
    if (!this.stats[provider]) {
      this.stats[provider] = { calls: 0, errors: 0, totalLatency: 0 };
    }
    this.stats[provider].calls++;
    this.stats[provider].errors++;
    this.saveStats();
    
    // Log activity
    this.logActivity(provider, false, 0);
  }
  
  private logActivity(provider: ProviderName, success: boolean, latency: number): void {
    try {
      let log = JSON.parse(localStorage.getItem('orchestratorActivityLog') || '[]');
      log.push({
        provider,
        time: Date.now(),
        success,
        latency
      });
      // Keep only last 50 entries
      if (log.length > 50) log = log.slice(-50);
      localStorage.setItem('orchestratorActivityLog', JSON.stringify(log));
    } catch (e) {}
  }
  
  // -------------------------------------------------------------------------
  // UI Indicator - Clean IDE-Matching Design
  // -------------------------------------------------------------------------
  
  private showProviderIndicator(provider: ProviderName, status: 'calling' | 'success' | 'error'): void {
    if (!this.config.showProviderIndicator) return;
    
    // Provider accent colors (small dot only)
    const accentColors: Record<ProviderName, string> = {
      operator_x02: '#9c27b0',
      groq: '#f55036',
      gemini: '#4285f4',
      deepseek: '#0066ff',
      claude: '#cc785c',
      openai: '#10a37f'
    };
    
    // Add styles if not present
    if (!document.getElementById('provider-indicator-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'provider-indicator-styles';
      styleEl.textContent = `
        @keyframes providerFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes providerFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-4px); }
        }
        
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        .provider-indicator-ide {
          position: fixed;
          bottom: 72px;
          right: 16px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          z-index: 10000;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2d2d2d;
          border: 1px solid #404040;
          color: #cccccc;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: providerFadeIn 0.2s ease-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .provider-indicator-ide.hiding {
          animation: providerFadeOut 0.2s ease-out forwards;
        }
        
        .provider-indicator-ide .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .provider-indicator-ide .status-dot.calling {
          animation: dotPulse 1s ease-in-out infinite;
        }
        
        .provider-indicator-ide .status-dot.success {
          background: #4caf50 !important;
          box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
        }
        
        .provider-indicator-ide .status-dot.error {
          background: #f44336 !important;
          box-shadow: 0 0 6px rgba(244, 67, 54, 0.5);
        }
        
        .provider-indicator-ide .provider-name {
          color: #e0e0e0;
          letter-spacing: 0.2px;
        }
        
        .provider-indicator-ide .status-text {
          color: #888;
          font-size: 10px;
          padding-left: 8px;
          border-left: 1px solid #404040;
        }
        
        .provider-indicator-ide .status-text.calling {
          animation: statusPulse 1.5s ease-in-out infinite;
        }
        
        .provider-indicator-ide .status-text.success {
          color: #4caf50;
        }
        
        .provider-indicator-ide .status-text.error {
          color: #f44336;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Update or create indicator
    let indicator = document.getElementById('provider-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'provider-indicator';
      indicator.className = 'provider-indicator-ide';
      document.body.appendChild(indicator);
    }
    
    // Reset animation
    indicator.className = 'provider-indicator-ide';
    
    const config = this.config.providers[provider];
    const displayName = config?.displayName || provider;
    const accentColor = accentColors[provider] || '#888';
    
    const statusTexts: Record<string, string> = {
      calling: 'Sending...',
      success: 'Done',
      error: 'Failed'
    };
    
    indicator.innerHTML = `
      <span class="status-dot ${status}" style="background: ${accentColor};"></span>
      <span class="provider-name">${displayName}</span>
      <span class="status-text ${status}">${statusTexts[status]}</span>
    `;
    
    // Only auto-hide on error (after 3 seconds)
    // Success indicator stays until hideProviderIndicator() is called
    if (status === 'error') {
      setTimeout(() => {
        if (indicator) {
          indicator.classList.add('hiding');
          setTimeout(() => {
            if (indicator) indicator.remove();
          }, 200);
        }
      }, 3000);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let orchestratorInstance: MultiProviderOrchestrator | null = null;

export function getOrchestrator(): MultiProviderOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MultiProviderOrchestrator();
    // Auto-import legacy config on first use
    orchestratorInstance.importFromLegacyConfig();
  }
  return orchestratorInstance;
}

/**
 * Hide the provider indicator - call this when message loading is complete
 * Shows "Done" briefly then fades out
 */
export function hideProviderIndicator(): void {
  const indicator = document.getElementById('provider-indicator');
  if (indicator) {
    // Update to show "Done" status
    const statusDot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    if (statusDot) {
      statusDot.className = 'status-dot success';
    }
    if (statusText) {
      statusText.className = 'status-text success';
      statusText.textContent = 'Done';
    }
    
    // Fade out after showing "Done" briefly
    setTimeout(() => {
      if (indicator) {
        indicator.classList.add('hiding');
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.remove();
          }
        }, 200);
      }
    }, 800); // Show "Done" for 800ms before fading
  }
}

// Expose globally for easy access
if (typeof window !== 'undefined') {
  (window as any).hideProviderIndicator = hideProviderIndicator;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick send - uses orchestrator with auto-routing
 */
export async function orchestratedSend(message: string, hasImage: boolean = false, rawMessage?: string): Promise<OrchestratorResponse> {
  return getOrchestrator().sendMessage(message, hasImage, rawMessage);
}

/**
 * Set default provider
 */
export function setDefaultProvider(provider: ProviderName): void {
  getOrchestrator().updateConfig({ defaultProvider: provider });
}

/**
 * Toggle auto-routing
 */
export function setAutoRouting(enabled: boolean): void {
  getOrchestrator().updateConfig({ enableAutoRouting: enabled });
}

/**
 * Set provider API key
 */
export function setProviderKey(provider: ProviderName, apiKey: string): void {
  getOrchestrator().setProviderApiKey(provider, apiKey);
}

/**
 * Set provider role
 */
export function setProviderRole(provider: ProviderName, role: ProviderRole): void {
  const orchestrator = getOrchestrator();
  const config = orchestrator.getConfig();
  if (config.providers[provider]) {
    config.providers[provider].role = role;
    orchestrator.saveConfig();
    console.log(`✅ ${provider} role set to: ${role}`);
  }
}

/**
 * Get provider role
 */
export function getProviderRole(provider: ProviderName): ProviderRole {
  const config = getOrchestrator().getConfig();
  return config.providers[provider]?.role || 'auto';
}

/**
 * Get all available roles
 */
export function getAvailableRoles(): { value: ProviderRole; label: string; icon: string }[] {
  return [
    { value: 'auto', label: 'Auto', icon: '🔀' },
    { value: 'developer', label: 'Developer', icon: '👨‍💻' },
    { value: 'architect', label: 'Architect', icon: '🏗️' },
    { value: 'reviewer', label: 'Reviewer', icon: '🔍' },
    { value: 'tester', label: 'Tester', icon: '🧪' },
    { value: 'debugger', label: 'Debugger', icon: '🐛' },
    { value: 'documenter', label: 'Documenter', icon: '📝' },
    { value: 'pm', label: 'Project Manager', icon: '📋' },
    { value: 'security', label: 'Security', icon: '🔒' }
  ];
}

// ============================================================================
// EXPOSE TO WINDOW FOR DEBUGGING
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).orchestrator = {
    get: getOrchestrator,
    send: orchestratedSend,
    setDefault: setDefaultProvider,
    setAutoRouting,
    setKey: setProviderKey,
    setRole: setProviderRole,
    getRole: getProviderRole,
    getRoles: getAvailableRoles,
    detectTask: detectTaskType,
    reset: () => getOrchestrator().resetConfig(),  // ✅ Reset to defaults
    getConfig: () => getOrchestrator().getConfig(),  // ✅ View current config
    ROLE_PROMPTS,
    ROLE_ICONS,
    ROLE_LABELS
  };
}

export default MultiProviderOrchestrator;
