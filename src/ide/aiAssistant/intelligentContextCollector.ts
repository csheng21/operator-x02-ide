/**
 * Intelligent Context Collector - Advanced context gathering for AI Assistant
 * Collects: Project info, session activity, file context, developer patterns
 * This extends the existing contextManager with intelligent collection capabilities
 */

import { contextManager, FileContext, Decision } from './contextManager';
import { conversationManager } from './conversationManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SessionActivity {
  startTime: Date;
  filesOpened: string[];
  filesModified: FileModification[];
  errorsEncountered: ErrorLog[];
  recentSearches: string[];
  recentCommands: string[];
}

export interface FileModification {
  path: string;
  timestamp: number;
  changes: number; // Number of lines changed
  language: string;
}

export interface ErrorLog {
  message: string;
  file?: string;
  line?: number;
  timestamp: number;
}

export interface DeveloperPattern {
  type: 'naming' | 'architecture' | 'tool' | 'workflow';
  pattern: string;
  frequency: number;
  lastUsed: number;
}

export interface CodeStructure {
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: string[];
}

export interface FunctionInfo {
  name: string;
  params: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ImportInfo {
  module: string;
  items: string[];
  isDefault: boolean;
}

export interface ContextInsight {
  type: 'info' | 'warning' | 'suggestion';
  message: string;
  relevance: number; // 0-100
}

// ============================================================================
// INTELLIGENT CONTEXT COLLECTOR CLASS
// ============================================================================

export class IntelligentContextCollector {
  private static instance: IntelligentContextCollector;
  private sessionActivity: SessionActivity;
  private developerPatterns: Map<string, DeveloperPattern> = new Map();
  private contextCache: Map<string, any> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  static getInstance(): IntelligentContextCollector {
    if (!IntelligentContextCollector.instance) {
      IntelligentContextCollector.instance = new IntelligentContextCollector();
    }
    return IntelligentContextCollector.instance;
  }

  constructor() {
    this.sessionActivity = {
      startTime: new Date(),
      filesOpened: [],
      filesModified: [],
      errorsEncountered: [],
      recentSearches: [],
      recentCommands: []
    };
    this.loadDeveloperPatterns();
  }

  // ============================================================================
  // MAIN CONTEXT COLLECTION
  // ============================================================================

  /**
   * Collect comprehensive context for AI assistant
   * This is the main entry point that gathers all context
   */
  async collectFullContext(userMessage: string): Promise<string> {
    const parts: string[] = [];
    
    // Detect what kind of context is needed based on user message
    const contextNeeds = this.detectContextNeeds(userMessage);
    
    // 1. Project Context (High Priority)
    if (contextNeeds.needsProjectInfo) {
      const projectContext = this.getProjectContextString();
      if (projectContext) parts.push(projectContext);
    }
    
    // 2. Current File Context (Highest Priority for code questions)
    if (contextNeeds.needsFileContext) {
      const fileContext = await this.getCurrentFileContextString();
      if (fileContext) parts.push(fileContext);
    }
    
    // 3. Session Activity (Medium Priority)
    if (contextNeeds.needsSessionInfo) {
      const sessionContext = this.getSessionActivityString();
      if (sessionContext) parts.push(sessionContext);
    }
    
    // 4. Conversation History (Important for continuity)
    if (contextNeeds.needsConversationHistory) {
      const conversationContext = this.getConversationContextString();
      if (conversationContext) parts.push(conversationContext);
    }
    
    // 5. Developer Patterns (Lower Priority)
    if (contextNeeds.needsPatterns) {
      const patternsContext = this.getDeveloperPatternsString();
      if (patternsContext) parts.push(patternsContext);
    }
    
    // 6. Related Files (for architecture questions)
    if (contextNeeds.needsRelatedFiles) {
      const relatedFiles = await this.getRelatedFilesContext();
      if (relatedFiles) parts.push(relatedFiles);
    }
    
    // Generate insights
    const insights = this.generateContextInsights();
    if (insights.length > 0) {
      parts.push(this.formatInsights(insights));
    }
    
    return parts.join('\n\n---\n\n');
  }

  // ============================================================================
  // CONTEXT NEED DETECTION
  // ============================================================================

  /**
   * Analyze user message to determine what context is needed
   */
  private detectContextNeeds(message: string): {
    needsProjectInfo: boolean;
    needsFileContext: boolean;
    needsSessionInfo: boolean;
    needsConversationHistory: boolean;
    needsPatterns: boolean;
    needsRelatedFiles: boolean;
  } {
    const lowerMessage = message.toLowerCase();
    
    return {
      // Always include project info unless it's a simple greeting
      needsProjectInfo: !this.isSimpleGreeting(message),
      
      // File context for anything mentioning "this file", "current code", errors
      needsFileContext: 
        /\b(this|current|here|file|code|function|class|bug|error|fix)\b/i.test(message) ||
        this.mentionsCurrentFile(message),
      
      // Session info for debugging, recent activity questions
      needsSessionInfo:
        /\b(error|bug|recent|last|previous|debug|issue)\b/i.test(message),
      
      // Conversation history for continuations and references
      needsConversationHistory:
        /\b(we|earlier|before|discussed|mentioned|talked about|previous)\b/i.test(message) ||
        this.isContinuation(message),
      
      // Patterns for architecture, structure, "how should I" questions
      needsPatterns:
        /\b(how should|best practice|pattern|architecture|structure|organize)\b/i.test(message),
      
      // Related files for architecture, dependencies, imports
      needsRelatedFiles:
        /\b(architecture|structure|related|dependency|import|use)\b/i.test(message)
    };
  }

  private isSimpleGreeting(message: string): boolean {
    return /^(hi|hello|hey|good morning|good afternoon|good evening)[\s\S]{0,20}$/i.test(message.trim());
  }

  private mentionsCurrentFile(message: string): boolean {
    return /\b(this file|current file|this code|here)\b/i.test(message);
  }

  private isContinuation(message: string): boolean {
    // Check if message starts with continuation words
    return /^(and|also|then|next|after that|continuing|furthermore)/i.test(message.trim());
  }

  // ============================================================================
  // PROJECT CONTEXT
  // ============================================================================

  private getProjectContextString(): string {
    const project = contextManager.getProjectContext();
    if (!project) return '';
    
    return `## 📁 Project Context
**Project:** ${project.projectName}
**Type:** ${project.projectType}
**Tech Stack:** ${project.techStack.join(', ')}
**Phase:** ${project.developmentPhase}
**Purpose:** ${project.purpose}`;
  }

  // ============================================================================
  // FILE CONTEXT COLLECTION
  // ============================================================================

  /**
   * Get current file context with code analysis
   */
  private async getCurrentFileContextString(): Promise<string> {
    const cacheKey = 'current_file_context';
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    const editor = this.getActiveEditor();
    if (!editor) return '';
    
    const model = editor.getModel();
    if (!model) return '';
    
    const filePath = this.getCurrentFilePath();
    const content = model.getValue();
    const language = model.getLanguageId();
    
    // Analyze code structure
    const structure = this.analyzeCodeStructure(content, language);
    
    // Build context string
    const contextParts: string[] = [
      `## 📄 Current File: ${filePath}`,
      `**Language:** ${language}`,
      `**Lines:** ${model.getLineCount()}`
    ];
    
    // Add functions if found
    if (structure.functions.length > 0) {
      contextParts.push(`\n**Functions (${structure.functions.length}):**`);
      structure.functions.slice(0, 10).forEach(func => {
        contextParts.push(`  • ${func.name}(${func.params.join(', ')})`);
      });
    }
    
    // Add classes if found
    if (structure.classes.length > 0) {
      contextParts.push(`\n**Classes (${structure.classes.length}):**`);
      structure.classes.slice(0, 5).forEach(cls => {
        contextParts.push(`  • ${cls.name} - ${cls.methods.length} methods`);
      });
    }
    
    // Add imports
    if (structure.imports.length > 0) {
      contextParts.push(`\n**Key Imports:**`);
      structure.imports.slice(0, 8).forEach(imp => {
        contextParts.push(`  • ${imp.module}`);
      });
    }
    
    // Add recent modifications from context manager
    const fileContext = contextManager.getTrackedFiles().find(f => f.path === filePath);
    if (fileContext) {
      contextParts.push(`\n**Last Modified:** ${new Date(fileContext.lastModified).toLocaleTimeString()}`);
      if (fileContext.summary) {
        contextParts.push(`**Summary:** ${fileContext.summary}`);
      }
    }
    
    const result = contextParts.join('\n');
    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Analyze code structure to extract functions, classes, imports
   */
  private analyzeCodeStructure(content: string, language: string): CodeStructure {
    const structure: CodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: []
    };
    
    const lines = content.split('\n');
    
    if (language === 'typescript' || language === 'javascript') {
      this.analyzeTypeScriptStructure(lines, structure);
    } else if (language === 'python') {
      this.analyzePythonStructure(lines, structure);
    }
    
    return structure;
  }

  private analyzeTypeScriptStructure(lines: string[], structure: CodeStructure): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract functions
      const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*[=:]?\s*(?:async\s+)?(?:function)?\s*\(([^)]*)\)/);
      if (funcMatch) {
        structure.functions.push({
          name: funcMatch[1],
          params: funcMatch[2].split(',').map(p => p.trim()).filter(p => p),
          lineStart: i + 1,
          lineEnd: i + 1 // Simplified
        });
      }
      
      // Extract classes
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        const methods: string[] = [];
        // Look ahead for methods
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const methodMatch = lines[j].trim().match(/(\w+)\s*\([^)]*\)\s*[:{]/);
          if (methodMatch && !['if', 'for', 'while', 'switch'].includes(methodMatch[1])) {
            methods.push(methodMatch[1]);
          }
        }
        
        structure.classes.push({
          name: classMatch[1],
          methods,
          lineStart: i + 1,
          lineEnd: i + 1 // Simplified
        });
      }
      
      // Extract imports
      const importMatch = line.match(/import\s+(?:{([^}]+)}|(\w+))?\s*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        structure.imports.push({
          module: importMatch[3],
          items: importMatch[1] ? importMatch[1].split(',').map(i => i.trim()) : [importMatch[2] || 'default'],
          isDefault: !!importMatch[2]
        });
      }
      
      // Extract exports
      const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/);
      if (exportMatch) {
        structure.exports.push(exportMatch[1]);
      }
    }
  }

  private analyzePythonStructure(lines: string[], structure: CodeStructure): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract functions
      const funcMatch = line.match(/^def\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        structure.functions.push({
          name: funcMatch[1],
          params: funcMatch[2].split(',').map(p => p.trim().split(':')[0]).filter(p => p),
          lineStart: i + 1,
          lineEnd: i + 1
        });
      }
      
      // Extract classes
      const classMatch = line.match(/^class\s+(\w+)/);
      if (classMatch) {
        const methods: string[] = [];
        // Look ahead for methods
        for (let j = i + 1; j < Math.min(i + 100, lines.length); j++) {
          const methodMatch = lines[j].match(/^\s+def\s+(\w+)/);
          if (methodMatch) {
            methods.push(methodMatch[1]);
          }
          // Stop at next class or unindented line
          if (lines[j].match(/^class\s/) || (lines[j].trim() && !lines[j].match(/^\s/))) {
            break;
          }
        }
        
        structure.classes.push({
          name: classMatch[1],
          methods,
          lineStart: i + 1,
          lineEnd: i + 1
        });
      }
      
      // Extract imports
      const importMatch = line.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/);
      if (importMatch) {
        structure.imports.push({
          module: importMatch[1] || importMatch[2],
          items: [],
          isDefault: false
        });
      }
    }
  }

  // ============================================================================
  // SESSION ACTIVITY
  // ============================================================================

  private getSessionActivityString(): string {
    const duration = Date.now() - this.sessionActivity.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    
    const parts: string[] = [
      `## ⏱️ Current Session`,
      `**Duration:** ${minutes} minutes`
    ];
    
    if (this.sessionActivity.filesModified.length > 0) {
      parts.push(`\n**Recently Modified Files:**`);
      this.sessionActivity.filesModified.slice(-5).forEach(file => {
        parts.push(`  • ${file.path} (${file.changes} changes)`);
      });
    }
    
    if (this.sessionActivity.errorsEncountered.length > 0) {
      parts.push(`\n**Recent Errors:**`);
      this.sessionActivity.errorsEncountered.slice(-3).forEach(err => {
        parts.push(`  • ${err.message}${err.file ? ` in ${err.file}` : ''}`);
      });
    }
    
    return parts.join('\n');
  }

  /**
   * Track file modification
   */
  trackFileModification(path: string, changes: number, language: string): void {
    this.sessionActivity.filesModified.push({
      path,
      timestamp: Date.now(),
      changes,
      language
    });
    
    // Keep only last 20 modifications
    if (this.sessionActivity.filesModified.length > 20) {
      this.sessionActivity.filesModified = this.sessionActivity.filesModified.slice(-20);
    }
    
    // Update context manager
    contextManager.addFileContext({
      path,
      language,
      lastModified: Date.now(),
      relevance: 100 // Recently modified = highly relevant
    });
  }

  /**
   * Track error occurrence
   */
  trackError(message: string, file?: string, line?: number): void {
    this.sessionActivity.errorsEncountered.push({
      message,
      file,
      line,
      timestamp: Date.now()
    });
    
    // Keep only last 10 errors
    if (this.sessionActivity.errorsEncountered.length > 10) {
      this.sessionActivity.errorsEncountered = this.sessionActivity.errorsEncountered.slice(-10);
    }
  }

  // ============================================================================
  // CONVERSATION CONTEXT
  // ============================================================================

  private getConversationContextString(): string {
    const recentMessages = conversationManager.getRecentMessages(6);
    
    if (recentMessages.length === 0) return '';
    
    const parts: string[] = ['## 💬 Recent Conversation'];
    
    recentMessages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'AI';
      // Truncate long messages
      const content = msg.content.length > 150 
        ? msg.content.substring(0, 150) + '...'
        : msg.content;
      
      parts.push(`**${role}:** ${content}`);
    });
    
    // Add key decisions from context manager
    const decisions = contextManager.getDecisions();
    if (decisions.length > 0) {
      parts.push(`\n**Key Decisions Made:**`);
      decisions.slice(-3).forEach(decision => {
        parts.push(`  • ${decision.topic}: ${decision.decision}`);
      });
    }
    
    return parts.join('\n');
  }

  // ============================================================================
  // DEVELOPER PATTERNS
  // ============================================================================

  private getDeveloperPatternsString(): string {
    if (this.developerPatterns.size === 0) return '';
    
    const patterns = Array.from(this.developerPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    if (patterns.length === 0) return '';
    
    const parts: string[] = ['## 🎯 Developer Patterns'];
    
    patterns.forEach(pattern => {
      parts.push(`  • ${pattern.pattern} (used ${pattern.frequency} times)`);
    });
    
    return parts.join('\n');
  }

  /**
   * Learn developer pattern from interaction
   */
  learnPattern(type: DeveloperPattern['type'], pattern: string): void {
    const key = `${type}:${pattern}`;
    const existing = this.developerPatterns.get(key);
    
    if (existing) {
      existing.frequency++;
      existing.lastUsed = Date.now();
    } else {
      this.developerPatterns.set(key, {
        type,
        pattern,
        frequency: 1,
        lastUsed: Date.now()
      });
    }
    
    this.saveDeveloperPatterns();
  }

  // ============================================================================
  // RELATED FILES CONTEXT
  // ============================================================================

  private async getRelatedFilesContext(): Promise<string> {
    // Get tracked files from context manager
    const files = contextManager.getTrackedFiles();
    
    if (files.length === 0) return '';
    
    const parts: string[] = ['## 🔗 Related Files'];
    
    files.slice(0, 5).forEach(file => {
      parts.push(`  • ${file.path} (${file.language})`);
      if (file.summary) {
        parts.push(`    ${file.summary}`);
      }
    });
    
    return parts.join('\n');
  }

  // ============================================================================
  // CONTEXT INSIGHTS
  // ============================================================================

  /**
   * Generate insights based on collected context
   */
  private generateContextInsights(): ContextInsight[] {
    const insights: ContextInsight[] = [];
    
    // Check for recent errors
    if (this.sessionActivity.errorsEncountered.length > 0) {
      insights.push({
        type: 'warning',
        message: `${this.sessionActivity.errorsEncountered.length} errors detected in current session`,
        relevance: 90
      });
    }
    
    // Check for project context
    const project = contextManager.getProjectContext();
    if (!project) {
      insights.push({
        type: 'suggestion',
        message: 'Consider setting project context for better AI assistance',
        relevance: 70
      });
    }
    
    // Check for repeated patterns
    const patterns = Array.from(this.developerPatterns.values());
    const highFrequency = patterns.filter(p => p.frequency > 5);
    if (highFrequency.length > 0) {
      insights.push({
        type: 'info',
        message: `${highFrequency.length} common patterns detected in your workflow`,
        relevance: 60
      });
    }
    
    return insights.sort((a, b) => b.relevance - a.relevance);
  }

  private formatInsights(insights: ContextInsight[]): string {
    const parts: string[] = ['## 💡 Context Insights'];
    
    insights.forEach(insight => {
      const icon = insight.type === 'warning' ? '⚠️' : 
                   insight.type === 'suggestion' ? '💡' : 'ℹ️';
      parts.push(`${icon} ${insight.message}`);
    });
    
    return parts.join('\n');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getActiveEditor(): any {
    return (window as any).monaco?.editor?.getEditors()?.[0];
  }

  private getCurrentFilePath(): string {
    return (window as any).tabManager?.currentFile?.path || 'untitled';
  }

  // Cache management
  private getCached(key: string): string | null {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }
    return null;
  }

  private setCached(key: string, value: string): void {
    this.contextCache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  // Pattern persistence
  private saveDeveloperPatterns(): void {
    try {
      const patterns = Array.from(this.developerPatterns.entries());
      localStorage.setItem('developer_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  }

  private loadDeveloperPatterns(): void {
    try {
      const saved = localStorage.getItem('developer_patterns');
      if (saved) {
        const patterns = JSON.parse(saved);
        this.developerPatterns = new Map(patterns);
      }
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get context summary for UI display
   */
  getContextSummary(): string {
    const parts: string[] = [];
    
    const project = contextManager.getProjectContext();
    if (project) {
      parts.push(`📁 ${project.projectName}`);
    }
    
    if (this.sessionActivity.filesModified.length > 0) {
      parts.push(`${this.sessionActivity.filesModified.length} files`);
    }
    
    const messages = conversationManager.getRecentMessages(1);
    if (messages.length > 0) {
      parts.push(`💬 Active`);
    }
    
    return parts.join(' • ') || 'No context';
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.sessionActivity = {
      startTime: new Date(),
      filesOpened: [],
      filesModified: [],
      errorsEncountered: [],
      recentSearches: [],
      recentCommands: []
    };
    this.contextCache.clear();
  }
}

// Export singleton
export const intelligentContext = IntelligentContextCollector.getInstance();
