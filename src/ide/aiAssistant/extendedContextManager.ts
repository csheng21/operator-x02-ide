/**
 * Enhanced Context Manager - Extended version with advanced features
 * This EXTENDS the existing contextManager.ts with additional capabilities
 * All your existing code remains intact - these are ADD-ONS
 */

import { contextManager } from './contextManager';
import type { 
  ProjectContext, 
  FileContext, 
  ConversationMessage, 
  Decision,
  ContextData 
} from './contextManager';

// ============================================================================
// EXTENDED TYPE DEFINITIONS
// ============================================================================

export interface EnhancedFileContext extends FileContext {
  dependencies?: string[];
  dependents?: string[];
  complexity?: number; // 1-10 scale
  lastDiscussed?: number;
}

export interface CodePattern {
  pattern: string;
  category: 'naming' | 'structure' | 'error-handling' | 'design';
  frequency: number;
  examples: string[];
  lastSeen: number;
}

export interface ContextInsight {
  type: 'info' | 'warning' | 'tip' | 'error';
  category: 'project' | 'file' | 'conversation' | 'pattern';
  message: string;
  relevance: number; // 0-100
  actionable?: boolean;
  action?: string;
}

export interface SessionMetrics {
  startTime: number;
  totalMessages: number;
  filesModified: number;
  errorsFixed: number;
  decisionsMode: number;
  productivityScore: number; // 0-100
}

// ============================================================================
// EXTENDED CONTEXT MANAGER CLASS
// ============================================================================

class ExtendedContextManager {
  private codePatterns: Map<string, CodePattern> = new Map();
  private sessionMetrics: SessionMetrics;
  private contextInsights: ContextInsight[] = [];
  private autoSummaryEnabled: boolean = true;

  constructor() {
    this.sessionMetrics = {
      startTime: Date.now(),
      totalMessages: 0,
      filesModified: 0,
      errorsFixed: 0,
      decisionsMode: 0,
      productivityScore: 0
    };
    this.loadCodePatterns();
  }

  // ============================================================================
  // CODE PATTERN DETECTION & LEARNING
  // ============================================================================

  /**
   * Detect and learn code patterns from content
   */
  detectCodePatterns(content: string, language: string): CodePattern[] {
    const detectedPatterns: CodePattern[] = [];
    const lines = content.split('\n');
    
    // Detect naming patterns
    const camelCaseCount = content.match(/[a-z]+[A-Z][a-zA-Z]*/g)?.length || 0;
    const snakeCaseCount = content.match(/[a-z]+_[a-z]+/g)?.length || 0;
    const kebabCaseCount = content.match(/[a-z]+-[a-z]+/g)?.length || 0;
    
    if (camelCaseCount > 5) {
      this.learnPattern('naming', 'camelCase', `${language} prefers camelCase`);
      detectedPatterns.push(this.getPattern('naming:camelCase')!);
    }
    if (snakeCaseCount > 5) {
      this.learnPattern('naming', 'snake_case', `${language} uses snake_case`);
      detectedPatterns.push(this.getPattern('naming:snake_case')!);
    }
    
    // Detect error handling patterns
    if (content.includes('try') && content.includes('catch')) {
      this.learnPattern('error-handling', 'try-catch', 'Uses try-catch blocks');
      detectedPatterns.push(this.getPattern('error-handling:try-catch')!);
    }
    if (content.includes('if (') && content.includes('throw')) {
      this.learnPattern('error-handling', 'guard-clauses', 'Uses guard clauses');
      detectedPatterns.push(this.getPattern('error-handling:guard-clauses')!);
    }
    
    // Detect structural patterns
    if (content.includes('class ') && content.includes('extends')) {
      this.learnPattern('structure', 'inheritance', 'Uses class inheritance');
      detectedPatterns.push(this.getPattern('structure:inheritance')!);
    }
    if (content.includes('interface ') || content.includes('type ')) {
      this.learnPattern('structure', 'type-definitions', 'Defines types/interfaces');
      detectedPatterns.push(this.getPattern('structure:type-definitions')!);
    }
    
    // Detect design patterns
    if (content.match(/getInstance.*static/s)) {
      this.learnPattern('design', 'singleton', 'Singleton pattern detected');
      detectedPatterns.push(this.getPattern('design:singleton')!);
    }
    if (content.includes('factory') || content.includes('Factory')) {
      this.learnPattern('design', 'factory', 'Factory pattern detected');
      detectedPatterns.push(this.getPattern('design:factory')!);
    }
    
    return detectedPatterns;
  }

  /**
   * Learn a code pattern
   */
  private learnPattern(category: CodePattern['category'], pattern: string, example: string): void {
    const key = `${category}:${pattern}`;
    const existing = this.codePatterns.get(key);
    
    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      if (!existing.examples.includes(example)) {
        existing.examples.push(example);
        if (existing.examples.length > 5) {
          existing.examples = existing.examples.slice(-5);
        }
      }
    } else {
      this.codePatterns.set(key, {
        pattern,
        category,
        frequency: 1,
        examples: [example],
        lastSeen: Date.now()
      });
    }
    
    this.saveCodePatterns();
  }

  /**
   * Get a specific pattern
   */
  private getPattern(key: string): CodePattern | undefined {
    return this.codePatterns.get(key);
  }

  /**
   * Get all patterns by category
   */
  getPatternsByCategory(category: CodePattern['category']): CodePattern[] {
    return Array.from(this.codePatterns.values())
      .filter(p => p.category === category)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get top patterns across all categories
   */
  getTopPatterns(count: number = 10): CodePattern[] {
    return Array.from(this.codePatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);
  }

  // ============================================================================
  // FILE DEPENDENCY TRACKING
  // ============================================================================

  /**
   * Add file with dependencies
   */
  addEnhancedFileContext(file: EnhancedFileContext): void {
    // Use the base context manager for core functionality
    contextManager.addFileContext(file);
    
    // Store additional metadata if needed
    // This could be extended to track dependencies separately
  }

  /**
   * Analyze file dependencies from imports
   */
  analyzeFileDependencies(content: string, language: string): {
    dependencies: string[];
    exports: string[];
  } {
    const dependencies: string[] = [];
    const exports: string[] = [];
    
    const lines = content.split('\n');
    
    if (language === 'typescript' || language === 'javascript') {
      lines.forEach(line => {
        // Import statements
        const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          dependencies.push(importMatch[1]);
        }
        
        // Export statements
        const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/);
        if (exportMatch) {
          exports.push(exportMatch[1]);
        }
      });
    } else if (language === 'python') {
      lines.forEach(line => {
        // Import statements
        const importMatch = line.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/);
        if (importMatch) {
          dependencies.push(importMatch[1] || importMatch[2]);
        }
      });
    }
    
    return { dependencies, exports };
  }

  // ============================================================================
  // CONTEXT INSIGHTS & ANALYSIS
  // ============================================================================

  /**
   * Generate intelligent insights from context
   */
  generateInsights(): ContextInsight[] {
    const insights: ContextInsight[] = [];
    
    // Project context insights
    const project = contextManager.getProjectContext();
    if (!project) {
      insights.push({
        type: 'warning',
        category: 'project',
        message: 'No project context set. AI responses may be less specific.',
        relevance: 80,
        actionable: true,
        action: 'Click the context button to set up your project details'
      });
    } else {
      insights.push({
        type: 'info',
        category: 'project',
        message: `Working on: ${project.projectName} (${project.projectType})`,
        relevance: 60,
        actionable: false
      });
    }
    
    // File context insights
    const files = contextManager.getTrackedFiles();
    if (files.length === 0) {
      insights.push({
        type: 'tip',
        category: 'file',
        message: 'No files tracked yet. Open and modify files to build context.',
        relevance: 50,
        actionable: false
      });
    } else if (files.length > 15) {
      insights.push({
        type: 'warning',
        category: 'file',
        message: `Tracking ${files.length} files. Consider focusing on key files for better performance.`,
        relevance: 60,
        actionable: true,
        action: 'Relevant files are automatically prioritized'
      });
    }
    
    // Pattern insights
    const topPatterns = this.getTopPatterns(3);
    if (topPatterns.length > 0) {
      insights.push({
        type: 'info',
        category: 'pattern',
        message: `Detected patterns: ${topPatterns.map(p => p.pattern).join(', ')}`,
        relevance: 70,
        actionable: false
      });
    }
    
    // Conversation insights
    const recentConv = contextManager.getRecentConversation(20);
    if (recentConv.length > 15) {
      insights.push({
        type: 'tip',
        category: 'conversation',
        message: 'Long conversation detected. AI has full history for context.',
        relevance: 55,
        actionable: false
      });
    }
    
    // Decision insights
    const decisions = contextManager.getDecisions();
    if (decisions.length > 0) {
      const recentDecisions = decisions.slice(-3);
      insights.push({
        type: 'info',
        category: 'conversation',
        message: `${decisions.length} decisions tracked. Recent: ${recentDecisions[0]?.topic || 'None'}`,
        relevance: 65,
        actionable: false
      });
    }
    
    // Productivity insights
    this.updateProductivityScore();
    if (this.sessionMetrics.productivityScore > 70) {
      insights.push({
        type: 'info',
        category: 'project',
        message: `High productivity session! Score: ${this.sessionMetrics.productivityScore}/100`,
        relevance: 75,
        actionable: false
      });
    }
    
    // Sort by relevance
    insights.sort((a, b) => b.relevance - a.relevance);
    
    this.contextInsights = insights;
    return insights;
  }

  /**
   * Get current insights
   */
  getInsights(): ContextInsight[] {
    return this.contextInsights;
  }

  // ============================================================================
  // SESSION METRICS & PRODUCTIVITY
  // ============================================================================

  /**
   * Update session metrics
   */
  updateSessionMetrics(type: 'message' | 'file' | 'error' | 'decision'): void {
    switch (type) {
      case 'message':
        this.sessionMetrics.totalMessages++;
        break;
      case 'file':
        this.sessionMetrics.filesModified++;
        break;
      case 'error':
        this.sessionMetrics.errorsFixed++;
        break;
      case 'decision':
        this.sessionMetrics.decisionsMode++;
        break;
    }
    
    this.updateProductivityScore();
  }

  /**
   * Calculate productivity score
   */
  private updateProductivityScore(): void {
    const sessionDuration = Date.now() - this.sessionMetrics.startTime;
    const hours = sessionDuration / (1000 * 60 * 60);
    
    // Score based on activity
    let score = 0;
    
    // Files modified (max 30 points)
    score += Math.min(this.sessionMetrics.filesModified * 3, 30);
    
    // Messages sent (max 25 points)
    score += Math.min(this.sessionMetrics.totalMessages * 2, 25);
    
    // Errors fixed (max 20 points)
    score += Math.min(this.sessionMetrics.errorsFixed * 5, 20);
    
    // Decisions made (max 15 points)
    score += Math.min(this.sessionMetrics.decisionsMode * 3, 15);
    
    // Time factor (max 10 points)
    // Penalize very long sessions without much activity
    if (hours > 0) {
      const activityRate = (this.sessionMetrics.filesModified + this.sessionMetrics.totalMessages) / hours;
      score += Math.min(activityRate, 10);
    }
    
    this.sessionMetrics.productivityScore = Math.min(Math.round(score), 100);
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): SessionMetrics {
    return { ...this.sessionMetrics };
  }

  /**
   * Get session summary
   */
  getSessionSummary(): string {
    const duration = Date.now() - this.sessionMetrics.startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    return `Session: ${hours}h ${minutes}m | ` +
           `${this.sessionMetrics.filesModified} files | ` +
           `${this.sessionMetrics.totalMessages} messages | ` +
           `Score: ${this.sessionMetrics.productivityScore}/100`;
  }

  // ============================================================================
  // AUTO-SUMMARY GENERATION
  // ============================================================================

  /**
   * Generate automatic summary of conversation
   * This uses a simple heuristic - you can enhance with AI later
   */
  async generateAutoSummary(): Promise<string> {
    if (!this.autoSummaryEnabled) return '';
    
    const messages = contextManager.getRecentConversation(20);
    if (messages.length < 5) return '';
    
    // Extract user messages (what user talked about)
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    
    // Extract key topics (simple keyword extraction)
    const topics: Map<string, number> = new Map();
    
    userMessages.forEach(message => {
      // Extract potential topics (words 4+ chars, not common words)
      const words = message.toLowerCase()
        .split(/\W+/)
        .filter(w => w.length >= 4 && !this.isCommonWord(w));
      
      words.forEach(word => {
        topics.set(word, (topics.get(word) || 0) + 1);
      });
    });
    
    // Get top topics
    const topTopics = Array.from(topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
    
    // Build summary
    const summary = `Recent discussion topics: ${topTopics.join(', ')}. ` +
                   `${messages.length} messages in conversation. ` +
                   `User asked about ${userMessages.length} topics.`;
    
    contextManager.updateSummary(summary);
    return summary;
  }

  /**
   * Check if word is common (to filter out)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been', 'were', 'what',
      'when', 'where', 'which', 'while', 'would', 'could', 'should',
      'about', 'after', 'before', 'there', 'these', 'those', 'their',
      'please', 'want', 'need', 'like', 'know', 'think', 'make', 'help'
    ]);
    return commonWords.has(word);
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private saveCodePatterns(): void {
    try {
      const patterns = Array.from(this.codePatterns.entries());
      localStorage.setItem('code_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save code patterns:', error);
    }
  }

  private loadCodePatterns(): void {
    try {
      const saved = localStorage.getItem('code_patterns');
      if (saved) {
        const patterns = JSON.parse(saved);
        this.codePatterns = new Map(patterns);
      }
    } catch (error) {
      console.error('Failed to load code patterns:', error);
    }
  }

  /**
   * Clear all extended data
   */
  clearExtendedData(): void {
    this.codePatterns.clear();
    this.contextInsights = [];
    this.sessionMetrics = {
      startTime: Date.now(),
      totalMessages: 0,
      filesModified: 0,
      errorsFixed: 0,
      decisionsMode: 0,
      productivityScore: 0
    };
    this.saveCodePatterns();
  }

  /**
   * Export all data including patterns
   */
  exportAllData(): string {
    const baseContext = JSON.parse(contextManager.exportContext());
    const patterns = Array.from(this.codePatterns.entries());
    
    const allData = {
      ...baseContext,
      codePatterns: patterns,
      sessionMetrics: this.sessionMetrics,
      insights: this.contextInsights,
      exportedAt: Date.now()
    };
    
    return JSON.stringify(allData, null, 2);
  }

  /**
   * Import all data including patterns
   */
  importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Import base context
      contextManager.importContext(JSON.stringify({
        project: data.project,
        files: data.files,
        conversation: data.conversation,
        decisions: data.decisions,
        summary: data.summary,
        lastUpdated: data.lastUpdated
      }));
      
      // Import patterns
      if (data.codePatterns) {
        this.codePatterns = new Map(data.codePatterns);
        this.saveCodePatterns();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const extendedContextManager = new ExtendedContextManager();

// Re-export base context manager functions for convenience
export { contextManager };

// Export enhanced functions
export function detectCodePatterns(content: string, language: string): CodePattern[] {
  return extendedContextManager.detectCodePatterns(content, language);
}

export function generateContextInsights(): ContextInsight[] {
  return extendedContextManager.generateInsights();
}

export function getSessionSummary(): string {
  return extendedContextManager.getSessionSummary();
}

export function updateSessionMetrics(type: 'message' | 'file' | 'error' | 'decision'): void {
  extendedContextManager.updateSessionMetrics(type);
}

export function generateAutoSummary(): Promise<string> {
  return extendedContextManager.generateAutoSummary();
}

export function getTopCodePatterns(count: number = 10): CodePattern[] {
  return extendedContextManager.getTopPatterns(count);
}

console.log('✅ Extended Context Manager loaded');
