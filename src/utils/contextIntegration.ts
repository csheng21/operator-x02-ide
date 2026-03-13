/**
 * Context Integration - UPDATED WITH PDF CONTEXT
 * Connects intelligent context collection with AI Assistant
 * NOW INCLUDES: 
 *   - Current editor file context
 *   - PDF document context (automatically extracted)
 * FIXED: Added safety checks for contextManager methods
 */

import { intelligentContext } from './intelligentContextCollector';
import { contextManager } from './contextManager';
import { getEditorContextForAI, getCurrentEditorContext, formatEditorContextCompact } from './editorContextCapture';
import { pdfContextManager } from './pdfContextManager';

// ============================================================================
// CONTEXT INTEGRATION
// ============================================================================

export class ContextIntegration {
  private static instance: ContextIntegration;
  private contextEnabled: boolean = true;
  private autoContextEnabled: boolean = true;
  private editorContextEnabled: boolean = true;
  private pdfContextEnabled: boolean = true; // NEW: PDF context flag

  static getInstance(): ContextIntegration {
    if (!ContextIntegration.instance) {
      ContextIntegration.instance = new ContextIntegration();
    }
    return ContextIntegration.instance;
  }

  /**
   * Enhance user message with all context types
   * This is called before sending message to AI
   */
  async enhanceMessageWithContext(userMessage: string): Promise<string> {
    if (!this.contextEnabled) {
      return userMessage;
    }

    try {
      const parts: string[] = [];
      
      // ========================================================================
      // NEW: ADD PDF DOCUMENT CONTEXT (if any PDFs attached)
      // ========================================================================
      if (this.pdfContextEnabled && pdfContextManager.hasAttachments()) {
        console.log('📄 Adding PDF document context...');
        
        const pdfContext = await pdfContextManager.getPdfContext();
        
        if (pdfContext) {
          parts.push(pdfContext);
          parts.push('');
          parts.push('---');
          parts.push('');
          console.log('✅ PDF context added:', 
            pdfContextManager.getCount(), 'document(s)',
            pdfContext.length, 'chars');
        }
      }
      
      // ========================================================================
      // ADD CURRENT EDITOR CONTEXT
      // ========================================================================
      if (this.editorContextEnabled) {
        console.log('📝 Adding current editor context...');
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
      // ADD PROJECT/CONVERSATION CONTEXT
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
      return userMessage;
    }
  }

  /**
   * Learn from AI interaction
   */
  async learnFromInteraction(userMessage: string, aiResponse: string): Promise<void> {
    try {
      this.detectCodingPatterns(userMessage, aiResponse);
      this.extractDecisions(userMessage, aiResponse);
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
    
    if (message.includes('camelcase') || message.includes('camel case')) {
      intelligentContext.learnPattern('naming', 'camelCase');
    } else if (message.includes('snake_case') || message.includes('snake case')) {
      intelligentContext.learnPattern('naming', 'snake_case');
    } else if (message.includes('kebab-case') || message.includes('kebab case')) {
      intelligentContext.learnPattern('naming', 'kebab-case');
    }
    
    if (message.includes('mvc') || aiResponse.toLowerCase().includes('model-view-controller')) {
      intelligentContext.learnPattern('architecture', 'MVC');
    } else if (message.includes('mvvm')) {
      intelligentContext.learnPattern('architecture', 'MVVM');
    } else if (message.includes('microservice')) {
      intelligentContext.learnPattern('architecture', 'Microservices');
    }
    
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
        const index = message.indexOf(keyword);
        const context = message.substring(index, index + 100);
        const sentences = context.split(/[.!?]/);
        
        if (sentences.length > 0) {
          const decision = sentences[0].replace(keyword, '').trim();
          if (decision.length > 5 && decision.length < 200) {
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
    const mentionsFile = /\b(this file|current file|this code|here)\b/i.test(userMessage);
    
    if (mentionsFile) {
      const editorContext = getCurrentEditorContext();
      
      if (editorContext) {
        const summary = aiResponse.substring(0, 200).replace(/\n/g, ' ').trim();
        
        if (typeof contextManager.addFileContext === 'function') {
          contextManager.addFileContext({
            path: editorContext.filePath,
            language: editorContext.language,
            lastModified: Date.now(),
            summary: summary || undefined,
            relevance: 90
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
   * Get context status for UI - NOW INCLUDES PDF STATUS
   */
  getContextStatus(): {
    enabled: boolean;
    editorContextEnabled: boolean;
    pdfContextEnabled: boolean;
    hasProjectContext: boolean;
    sessionFiles: number;
    recentErrors: number;
    conversationLength: number;
    currentFile: string | null;
    pdfCount: number;
    pdfSummary: string;
  } {
    let project = null;
    let trackedFiles: any[] = [];
    let conversationLength = 0;
    
    try {
      if (typeof contextManager.getProjectContext === 'function') {
        project = contextManager.getProjectContext();
      }
      
      if (typeof contextManager.getTrackedFiles === 'function') {
        trackedFiles = contextManager.getTrackedFiles() || [];
      }
      
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
      pdfContextEnabled: this.pdfContextEnabled,
      hasProjectContext: !!project,
      sessionFiles: trackedFiles.length,
      recentErrors: 0,
      conversationLength: conversationLength,
      currentFile: editorContext?.fileName || null,
      pdfCount: pdfContextManager.getCount(),
      pdfSummary: pdfContextManager.getContextSummary()
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
   * Toggle PDF context
   */
  togglePdfContext(enabled: boolean): void {
    this.pdfContextEnabled = enabled;
    console.log(`PDF context ${enabled ? 'enabled' : 'disabled'}`);
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
   * Check if PDF context is enabled
   */
  isPdfContextEnabled(): boolean {
    return this.pdfContextEnabled;
  }

  /**
   * Get context summary for display - NOW INCLUDES PDF
   */
  getContextSummary(): string {
    if (!this.contextEnabled) {
      return 'Context disabled';
    }
    
    const parts: string[] = [];
    
    // PDF context summary
    if (this.pdfContextEnabled) {
      const pdfSummary = pdfContextManager.getContextSummary();
      if (pdfSummary) {
        parts.push(pdfSummary);
      }
    }
    
    // Editor context info
    if (this.editorContextEnabled) {
      const editorContext = getCurrentEditorContext();
      if (editorContext) {
        parts.push(formatEditorContextCompact(editorContext));
      }
    }
    
    // Project context info
    const projectSummary = intelligentContext.getContextSummary();
    if (projectSummary) {
      parts.push(projectSummary);
    }
    
    return parts.join(' | ') || 'No context available';
  }

  // ========================================================================
  // PDF-SPECIFIC HELPERS
  // ========================================================================

  /**
   * Check if there are PDF attachments
   */
  hasPdfAttachments(): boolean {
    return pdfContextManager.hasAttachments();
  }

  /**
   * Get PDF attachment count
   */
  getPdfCount(): number {
    return pdfContextManager.getCount();
  }

  /**
   * Clear all PDF attachments
   */
  clearPdfAttachments(): void {
    pdfContextManager.clearAll();
  }

  /**
   * Get PDF manager for advanced operations
   */
  getPdfManager() {
    return pdfContextManager;
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

export function togglePdfContext(enabled: boolean): void {
  contextIntegration.togglePdfContext(enabled);
}

export function isContextEnabled(): boolean {
  return contextIntegration.isContextEnabled();
}

export function isEditorContextEnabled(): boolean {
  return contextIntegration.isEditorContextEnabled();
}

export function isPdfContextEnabled(): boolean {
  return contextIntegration.isPdfContextEnabled();
}

// PDF-specific exports
export function hasPdfAttachments(): boolean {
  return contextIntegration.hasPdfAttachments();
}

export function getPdfCount(): number {
  return contextIntegration.getPdfCount();
}

export function clearPdfAttachments(): void {
  contextIntegration.clearPdfAttachments();
}
