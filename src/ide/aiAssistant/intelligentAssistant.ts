// src/ide/aiAssistant/intelligentAssistant.ts
// Intelligent AI Assistant - Combines Context Manager + Build System AI
// Provides context-aware assistance with full project understanding

import { contextManager, ProjectContext, FileContext } from './contextManager';
import { 
  analyzeError, 
  BuildErrorAnalysis,
  getBuildOptimizations 
} from '../../fileOperations/buildSystemAI';
import { detectBuildSystem } from '../../fileOperations/buildSystemIntegration';

/**
 * Enhanced AI Assistant with Full Context Awareness
 */
export class IntelligentAssistant {
  private isInitialized: boolean = false;
  
  /**
   * Initialize the intelligent assistant
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🤖 Initializing Intelligent AI Assistant...');
    
    // Auto-detect project context if not set
    await this.autoDetectProject();
    
    this.isInitialized = true;
    console.log('✅ Intelligent Assistant ready!');
  }
  
  /**
   * Auto-detect project details and initialize context
   */
  private async autoDetectProject(): Promise<void> {
    try {
      // Get project path
      const projectPath = this.getProjectPath();
      if (!projectPath || projectPath === '.') {
        console.log('ℹ️  No project detected yet');
        return;
      }
      
      // Detect build system
      const buildSystem = await detectBuildSystem(projectPath);
      
      if (buildSystem) {
        const projectName = this.extractProjectName(projectPath);
        const techStack = this.detectTechStack(buildSystem.name);
        
        const projectContext: ProjectContext = {
          purpose: 'Software Development',
          projectName: projectName,
          projectType: buildSystem.displayName,
          techStack: techStack,
          developmentPhase: 'Active Development',
          timestamp: Date.now()
        };
        
        contextManager.setProjectContext(projectContext);
        
        console.log(`✅ Project detected: ${projectName} (${buildSystem.displayName})`);
      }
    } catch (error) {
      console.error('Error auto-detecting project:', error);
    }
  }
  
  /**
   * Get project path from various sources
   */
  private getProjectPath(): string {
    const fileExplorer = (window as any).fileExplorer;
    if (fileExplorer?.rootPath) {
      return fileExplorer.rootPath;
    }
    
    const fileSystem = (window as any).fileSystem;
    if (fileSystem?.rootPath) {
      return fileSystem.rootPath;
    }
    
    return localStorage.getItem('currentProjectPath') || '.';
  }
  
  /**
   * Extract project name from path
   */
  private extractProjectName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Untitled Project';
  }
  
  /**
   * Detect tech stack from build system
   */
  private detectTechStack(buildSystem: string): string[] {
    const stacks: Record<string, string[]> = {
      'npm': ['Node.js', 'JavaScript', 'TypeScript'],
      'yarn': ['Node.js', 'JavaScript', 'TypeScript'],
      'pnpm': ['Node.js', 'JavaScript', 'TypeScript'],
      'cargo': ['Rust'],
      'maven': ['Java'],
      'gradle': ['Java', 'Kotlin'],
      'poetry': ['Python'],
      'pipenv': ['Python'],
      'go': ['Go'],
      'dotnet': ['.NET', 'C#']
    };
    
    return stacks[buildSystem.toLowerCase()] || ['Unknown'];
  }
  
  /**
   * Enhanced message sending with full context
   */
  async sendMessageWithContext(
    userMessage: string,
    apiFunction: Function
  ): Promise<string> {
    // Track the user message
    contextManager.addMessage('user', userMessage);
    
    // Build enhanced prompt with full context
    const enhancedPrompt = contextManager.buildEnhancedPrompt(userMessage);
    
    console.log('🤖 Sending message with context...');
    console.log('📋 Context includes:');
    console.log('   -', contextManager.getContextSummary());
    
    // Call API with enhanced context
    try {
      const response = await apiFunction(enhancedPrompt);
      
      // Track the response
      contextManager.addMessage('assistant', response);
      
      return response;
    } catch (error: any) {
      console.error('❌ API call failed:', error);
      throw error;
    }
  }
  
  /**
   * Analyze build error with full context
   */
  async analyzeBuildErrorWithContext(
    error: string,
    buildCommand?: string
  ): Promise<BuildErrorAnalysis | null> {
    // Get basic error analysis
    const analysis = analyzeError(error);
    
    if (!analysis) return null;
    
    // Enhance with project context
    const project = contextManager.getProjectContext();
    if (project) {
      // Add project-specific suggestions
      const projectType = project.projectType.toLowerCase();
      
      if (analysis.errorType === 'dependency' && projectType.includes('node')) {
        analysis.suggestions.unshift(
          `Check ${project.projectName}/package.json for the missing dependency`
        );
      }
      
      if (analysis.errorType === 'environment') {
        analysis.suggestions.push(
          `This project uses ${project.techStack.join(', ')} - make sure all tools are installed`
        );
      }
    }
    
    // Add to context as a decision
    contextManager.addDecision(
      'Build Error',
      `Encountered ${analysis.errorType} error`,
      `Error: ${error.substring(0, 100)}...`
    );
    
    return analysis;
  }
  
  /**
   * Get AI recommendations for current project
   */
  async getProjectRecommendations(): Promise<string[]> {
    const project = contextManager.getProjectContext();
    if (!project) {
      return ['Initialize project context first'];
    }
    
    const recommendations: string[] = [];
    
    // Get build optimizations
    const optimizations = await getBuildOptimizations(
      project.projectType.toLowerCase(),
      this.getProjectPath()
    );
    
    if (optimizations.length > 0) {
      recommendations.push(`Found ${optimizations.length} build optimizations available`);
      
      // Add top 3 high-impact optimizations
      const topOpts = optimizations
        .filter(opt => opt.impact === 'high')
        .slice(0, 3);
      
      topOpts.forEach(opt => {
        recommendations.push(`⚡ ${opt.title}: ${opt.estimatedImprovement}`);
      });
    }
    
    // Check for common issues based on decisions
    const decisions = contextManager.getDecisions();
    const errorDecisions = decisions.filter(d => d.topic === 'Build Error');
    
    if (errorDecisions.length > 3) {
      recommendations.push('⚠️ Multiple build errors detected - consider reviewing project setup');
    }
    
    // Check tracked files
    const files = contextManager.getTrackedFiles();
    if (files.length === 0) {
      recommendations.push('💡 Open files in the editor to track your work automatically');
    }
    
    return recommendations;
  }
  
  /**
   * Track file being worked on
   */
  trackFile(path: string, language: string, relevance: number = 1.0): void {
    const fileContext: FileContext = {
      path,
      language,
      lastModified: Date.now(),
      relevance
    };
    
    contextManager.addFileContext(fileContext);
    console.log(`📄 Tracking file: ${path}`);
  }
  
  /**
   * Ask AI about current project
   */
  async askAboutProject(question: string, apiFunction: Function): Promise<string> {
    const project = contextManager.getProjectContext();
    
    if (!project) {
      return 'No project context available. Please open a project folder first.';
    }
    
    // Build project-specific prompt
    const prompt = `
I'm working on a project called "${project.projectName}".

Project Details:
- Type: ${project.projectType}
- Tech Stack: ${project.techStack.join(', ')}
- Phase: ${project.developmentPhase}

Recently worked on files:
${contextManager.getTrackedFiles().map(f => `- ${f.path} (${f.language})`).join('\n')}

Recent decisions:
${contextManager.getDecisions().slice(-3).map(d => `- ${d.topic}: ${d.decision}`).join('\n')}

Question: ${question}

Please answer considering the full context of this project.
`.trim();
    
    try {
      const response = await apiFunction(prompt);
      
      // Track this interaction
      contextManager.addMessage('user', question);
      contextManager.addMessage('assistant', response);
      
      return response;
    } catch (error: any) {
      console.error('Error asking AI:', error);
      return 'Sorry, I couldn\'t process that question. Please try again.';
    }
  }
  
  /**
   * Generate project summary
   */
  async generateProjectSummary(apiFunction: Function): Promise<string> {
    const project = contextManager.getProjectContext();
    
    if (!project) {
      return 'No project loaded.';
    }
    
    const prompt = `
Summarize this development project in 2-3 sentences:

Project: ${project.projectName}
Type: ${project.projectType}
Tech Stack: ${project.techStack.join(', ')}
Phase: ${project.developmentPhase}

Recent Activity:
${contextManager.getRecentConversation(5).map(m => {
  return `${m.role}: ${m.content.substring(0, 100)}...`;
}).join('\n')}

Files worked on:
${contextManager.getTrackedFiles().map(f => f.path).join(', ')}

Provide a concise summary of what we're building and current focus.
`.trim();
    
    try {
      const summary = await apiFunction(prompt);
      contextManager.updateSummary(summary);
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Could not generate summary.';
    }
  }
  
  /**
   * Get context status for UI display
   */
  getContextStatus(): {
    active: boolean;
    summary: string;
    project: string | null;
    filesCount: number;
    messagesCount: number;
    decisionsCount: number;
  } {
    const project = contextManager.getProjectContext();
    
    return {
      active: project !== null,
      summary: contextManager.getContextSummary(),
      project: project?.projectName || null,
      filesCount: contextManager.getTrackedFiles().length,
      messagesCount: contextManager.getRecentConversation(100).length,
      decisionsCount: contextManager.getDecisions().length
    };
  }
  
  /**
   * Clear all context (start fresh)
   */
  clearContext(): void {
    contextManager.clearContext();
    console.log('🗑️ Context cleared');
  }
  
  /**
   * Export context for debugging or backup
   */
  exportContext(): string {
    return contextManager.exportContext();
  }
  
  /**
   * Import context from backup
   */
  importContext(contextJson: string): boolean {
    return contextManager.importContext(contextJson);
  }
}

// Export singleton instance
export const intelligentAssistant = new IntelligentAssistant();

// Initialize on load
if (typeof window !== 'undefined') {
  (window as any).intelligentAssistant = intelligentAssistant;
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      intelligentAssistant.initialize();
    });
  } else {
    intelligentAssistant.initialize();
  }
}