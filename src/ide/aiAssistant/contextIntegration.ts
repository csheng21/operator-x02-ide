/**
 * Context Integration - UPDATED WITH EDITOR CONTEXT
 * Connects intelligent context collection with AI Assistant
 * NOW INCLUDES: Current editor file context automatically
 * FIXED: Added safety checks for contextManager methods
 */

import { intelligentContext } from './intelligentContextCollector';
import { contextManager } from './contextManager';
import { getEditorContextForAI, getCurrentEditorContext, formatEditorContextCompact } from './editorContextCapture';

// ============================================================================
// CONTEXT INTEGRATION
// ============================================================================

export class ContextIntegration {
  private static instance: ContextIntegration;
  private contextEnabled: boolean = true;
  private autoContextEnabled: boolean = true;
  private editorContextEnabled: boolean = true; // NEW: Enable editor context

  static getInstance(): ContextIntegration {
    if (!ContextIntegration.instance) {
      ContextIntegration.instance = new ContextIntegration();
    }
    return ContextIntegration.instance;
  }

  /**
   * Enhance user message with intelligent context + editor context
   * This is called before sending message to AI
   */
  async enhanceMessageWithContext(userMessage: string): Promise<string> {
    if (!this.contextEnabled) {
      return userMessage;
    }

    try {
      const parts: string[] = [];
      
      // ========================================================================
      // NEW: ADD CURRENT EDITOR CONTEXT
      // ========================================================================
      if (this.editorContextEnabled) {
        console.log('📄 Adding current editor context...');
        const editorContext = getEditorContextForAI(userMessage);
        
        if (editorContext) {
          parts.push(editorContext);
          parts.push('');
          parts.push('---');
          parts.push('');
          console.log('✅ Editor context added');
        } else {
          console.log('ℹ️ No editor context available');
        }
      }
      
      // ========================================================================
      // EXISTING: COLLECT PROJECT/CONVERSATION CONTEXT
      // ========================================================================
      const projectContext = await intelligentContext.collectFullContext(userMessage);
      
      if (projectContext && projectContext.trim().length > 0) {
        parts.push(projectContext);
        parts.push('');
        parts.push('---');
        parts.push('');
      }
      
      // ========================================================================
      // ADD USER'S ACTUAL MESSAGE
      // ========================================================================
      parts.push('# User Question');
      parts.push(userMessage);
      
      const enhancedMessage = parts.join('\n');
      
      console.log('✅ Message enhanced with context');
      console.log(`📊 Total context length: ${enhancedMessage.length} characters`);
      
      return enhancedMessage;
      
    } catch (error) {
      console.error('Failed to collect context:', error);
      return userMessage; // Fallback to original message
    }
  }

  /**
   * Learn from AI interaction
   * Call this after AI responds
   */
  async learnFromInteraction(userMessage: string, aiResponse: string): Promise<void> {
    try {
      // Detect patterns in user's coding style
      this.detectCodingPatterns(userMessage, aiResponse);
      
      // Extract decisions if any
      this.extractDecisions(userMessage, aiResponse);
      
      // Update file context if discussing code
      await this.updateFileContext(userMessage, aiResponse);
      
    } catch (error) {
      console.error('Failed to learn from interaction:', error);
    }
  }

  /**
   * Detect coding patterns from interactions
   */
  private detectCodingPatterns(userMessage: string, aiResponse: string): void {
    const message = userMessage.toLowerCase();
    
    // Detect naming patterns
    if (message.includes('camelcase') || message.includes('camel case')) {
      intelligentContext.learnPattern('naming', 'camelCase');
    } else if (message.includes('snake_case') || message.includes('snake case')) {
      intelligentContext.learnPattern('naming', 'snake_case');
    } else if (message.includes('kebab-case') || message.includes('kebab case')) {
      intelligentContext.learnPattern('naming', 'kebab-case');
    }
    
    // Detect architecture patterns
    if (message.includes('mvc') || aiResponse.toLowerCase().includes('model-view-controller')) {
      intelligentContext.learnPattern('architecture', 'MVC');
    } else if (message.includes('mvvm')) {
      intelligentContext.learnPattern('architecture', 'MVVM');
    } else if (message.includes('microservice')) {
      intelligentContext.learnPattern('architecture', 'Microservices');
    }
    
    // Detect tool preferences
    if (message.includes('typescript')) {
      intelligentContext.learnPattern('tool', 'TypeScript');
    } else if (message.includes('python')) {
      intelligentContext.learnPattern('tool', 'Python');
    }
  }

  /**
   * Extract key decisions from conversation
   */
  private extractDecisions(userMessage: string, aiResponse: string): void {
    const decisionKeywords = [
      'decided to', 'going with', 'will use', 'chose to', 
      'decided on', 'opted for', 'settling on'
    ];
    
    const message = (userMessage + ' ' + aiResponse).toLowerCase();
    
    for (const keyword of decisionKeywords) {
      if (message.includes(keyword)) {
        // Extract the decision (simplified)
        const index = message.indexOf(keyword);
        const context = message.substring(index, index + 100);
        
        // Try to extract what was decided
        const sentences = context.split(/[.!?]/);
        if (sentences.length > 0) {
          const decision = sentences[0].replace(keyword, '').trim();
          if (decision.length > 5 && decision.length < 200) {
            // FIXED: Check if addDecision exists
            if (typeof contextManager.addDecision === 'function') {
              contextManager.addDecision(
                'Development Decision',
                decision,
                `From conversation on ${new Date().toLocaleDateString()}`
              );
            }
          }
        }
        break;
      }
    }
  }

  /**
   * Update file context based on discussion
   */
  private async updateFileContext(userMessage: string, aiResponse: string): Promise<void> {
    // Check if discussing current file
    const mentionsFile = /\b(this file|current file|this code|here)\b/i.test(userMessage);
    
    if (mentionsFile) {
      const editorContext = getCurrentEditorContext();
      
      if (editorContext) {
        // Generate summary from AI response (first 200 chars)
        const summary = aiResponse.substring(0, 200).replace(/\n/g, ' ').trim();
        
        // FIXED: Check if addFileContext exists
        if (typeof contextManager.addFileContext === 'function') {
          contextManager.addFileContext({
            path: editorContext.filePath,
            language: editorContext.language,
            lastModified: Date.now(),
            summary: summary || undefined,
            relevance: 90 // High relevance since it was just discussed
          });
          
          console.log('✅ Updated file context for:', editorContext.fileName);
        }
      }
    }
  }

  /**
   * Track file modification event
   */
  trackFileChange(filePath: string, changesCount: number, language: string): void {
    intelligentContext.trackFileModification(filePath, changesCount, language);
  }

  /**
   * Track error occurrence
   */
  trackError(message: string, file?: string, line?: number): void {
    intelligentContext.trackError(message, file, line);
  }

  /**
   * Get context status for UI
   * FIXED: Added safety checks for all contextManager methods
   */
  getContextStatus(): {
    enabled: boolean;
    editorContextEnabled: boolean;
    hasProjectContext: boolean;
    sessionFiles: number;
    recentErrors: number;
    conversationLength: number;
    currentFile: string | null;
  } {
    // FIXED: Safe access to contextManager methods
    let project = null;
    let trackedFiles: any[] = [];
    let conversationLength = 0;
    
    try {
      // Check if getProjectContext exists
      if (typeof contextManager.getProjectContext === 'function') {
        project = contextManager.getProjectContext();
      }
      
      // Check if getTrackedFiles exists
      if (typeof contextManager.getTrackedFiles === 'function') {
        trackedFiles = contextManager.getTrackedFiles() || [];
      }
      
      // FIXED: Check if getRecentConversation exists before calling
      if (typeof contextManager.getRecentConversation === 'function') {
        const conversation = contextManager.getRecentConversation(100);
        conversationLength = Array.isArray(conversation) ? conversation.length : 0;
      }
    } catch (error) {
      console.warn('⚠️ [ContextIntegration] Error accessing contextManager:', error);
    }
    
    const editorContext = getCurrentEditorContext();
    
    return {
      enabled: this.contextEnabled,
      editorContextEnabled: this.editorContextEnabled,
      hasProjectContext: !!project,
      sessionFiles: trackedFiles.length,
      recentErrors: 0,
      conversationLength: conversationLength,
      currentFile: editorContext?.fileName || null
    };
  }

  /**
   * Toggle context system
   */
  toggleContext(enabled: boolean): void {
    this.contextEnabled = enabled;
    console.log(`Context system ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle editor context
   */
  toggleEditorContext(enabled: boolean): void {
    this.editorContextEnabled = enabled;
    console.log(`Editor context ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if context is enabled
   */
  isContextEnabled(): boolean {
    return this.contextEnabled;
  }

  /**
   * Check if editor context is enabled
   */
  isEditorContextEnabled(): boolean {
    return this.editorContextEnabled;
  }

  /**
   * Get context summary for display
   */
  getContextSummary(): string {
    if (!this.contextEnabled) {
      return 'Context disabled';
    }
    
    const parts: string[] = [];
    
    // Add editor context info
    if (this.editorContextEnabled) {
      const editorContext = getCurrentEditorContext();
      if (editorContext) {
        parts.push(formatEditorContextCompact(editorContext));
      }
    }
    
    // Add project context info
    const projectSummary = intelligentContext.getContextSummary();
    if (projectSummary) {
      parts.push(projectSummary);
    }
    
    return parts.join(' | ') || 'No context available';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const contextIntegration = ContextIntegration.getInstance();

// Convenience functions
export function enhanceMessageWithContext(message: string): Promise<string> {
  return contextIntegration.enhanceMessageWithContext(message);
}

export function learnFromInteraction(userMessage: string, aiResponse: string): Promise<void> {
  return contextIntegration.learnFromInteraction(userMessage, aiResponse);
}

export function trackFileChange(filePath: string, changes: number, language: string): void {
  contextIntegration.trackFileChange(filePath, changes, language);
}

export function trackError(message: string, file?: string, line?: number): void {
  contextIntegration.trackError(message, file, line);
}

export function getContextStatus() {
  return contextIntegration.getContextStatus();
}

export function toggleContextSystem(enabled: boolean): void {
  contextIntegration.toggleContext(enabled);
}

export function toggleEditorContext(enabled: boolean): void {
  contextIntegration.toggleEditorContext(enabled);
}

export function isContextEnabled(): boolean {
  return contextIntegration.isContextEnabled();
}

export function isEditorContextEnabled(): boolean {
  return contextIntegration.isEditorContextEnabled();
}
