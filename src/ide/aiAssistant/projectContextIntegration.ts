// src/ide/aiAssistant/projectContextIntegration.ts
// Integrates project analysis context into regular chat messages
// Add this import to main.ts and call initializeProjectContextIntegration()

console.log('🧠 [ProjectContext] Loading integration...');

const CONTEXT_KEY = 'ai_project_analysis_context';

interface ProjectAnalysisContext {
  projectName: string;
  projectPath: string;
  fileCount: number;
  files: { name: string; content: string; language: string }[];
  analysisResult: string;
  timestamp: number;
}

function getProjectContext(): ProjectAnalysisContext | null {
  try {
    const saved = localStorage.getItem(CONTEXT_KEY);
    if (saved) {
      const context = JSON.parse(saved);
      // Fresh within 2 hours
      if (Date.now() - context.timestamp < 2 * 60 * 60 * 1000) {
        return context;
      }
    }
  } catch {}
  return null;
}

function shouldIncludeContext(message: string): boolean {
  const context = getProjectContext();
  if (!context) return false;
  
  const msg = message.toLowerCase();
  
  // Keywords that suggest user is asking about the project
  const projectKeywords = [
    'file', 'files', 'folder', 'folders', 'project', 'structure',
    'how many', 'what does', 'explain', 'show me', 'list',
    'code', 'function', 'component', 'import', 'export',
    'dependency', 'dependencies', 'package',
    'this project', 'the project', 'my project',
    'app.tsx', 'main.ts', 'index', 'config',
    context.projectName.toLowerCase()
  ];
  
  return projectKeywords.some(kw => msg.includes(kw));
}

function buildContextEnhancedMessage(userMessage: string): string {
  const context = getProjectContext();
  if (!context) return userMessage;
  
  // Build concise file list
  const fileList = context.files.map(f => `• ${f.name} (${f.language})`).join('\n');
  
  // Build context block
  const contextBlock = `[PROJECT CONTEXT - ${context.projectName}]
Files (${context.fileCount} total, ${context.files.length} analyzed):
${fileList}

Analysis Summary:
${context.analysisResult.substring(0, 1500)}${context.analysisResult.length > 1500 ? '...' : ''}

---
User Question: ${userMessage}

Answer based on the project context above.`;

  return contextBlock;
}

export function initializeProjectContextIntegration(): void {
  console.log('🧠 [ProjectContext] Initializing integration...');
  
  // Expose helper functions globally for use in main.ts
  (window as any).projectContextHelper = {
    shouldInclude: shouldIncludeContext,
    enhance: buildContextEnhancedMessage,
    get: getProjectContext
  };
  
  // Show indicator in chat when context is active
  const showContextIndicator = () => {
    const context = getProjectContext();
    const existingIndicator = document.querySelector('.project-context-indicator');
    
    if (context && !existingIndicator) {
      const inputArea = document.querySelector('.chat-input-area, .chat-input-box');
      if (inputArea) {
        const indicator = document.createElement('div');
        indicator.className = 'project-context-indicator';
        indicator.style.cssText = `
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(79, 195, 247, 0.1);
          border: 1px solid rgba(79, 195, 247, 0.3);
          border-radius: 4px;
          font-size: 11px;
          color: #4fc3f7;
          margin-bottom: 8px;
        `;
        indicator.innerHTML = `
          <span>🧠</span>
          <span>Project context: <strong>${context.projectName}</strong> (${context.fileCount} files)</span>
          <button onclick="this.parentElement.remove(); localStorage.removeItem('${CONTEXT_KEY}');" 
                  style="background:none;border:none;color:#888;cursor:pointer;margin-left:auto;">✕</button>
        `;
        inputArea.insertBefore(indicator, inputArea.firstChild);
      }
    }
  };
  
  // Check periodically for context
  setInterval(showContextIndicator, 3000);
  setTimeout(showContextIndicator, 1000);
  
  console.log('✅ [ProjectContext] Integration ready!');
  console.log('   • window.projectContextHelper.shouldInclude(msg)');
  console.log('   • window.projectContextHelper.enhance(msg)');
}

// ============================================================================
// INTEGRATION INSTRUCTIONS FOR main.ts
// ============================================================================
/*

Add to your main.ts where you send messages to the AI:

1. Import this file:
   import { initializeProjectContextIntegration } from './ide/aiAssistant/projectContextIntegration';

2. Initialize in your init function:
   initializeProjectContextIntegration();

3. In your message sending code (around line 3000-3200), before calling the API,
   add this check to enhance the message with project context:

   // Check if we should include project context
   const projectHelper = (window as any).projectContextHelper;
   if (projectHelper?.shouldInclude(userMessage)) {
     fullMessage = projectHelper.enhance(userMessage);
     console.log('[Context] Enhanced message with project context');
   }

This will automatically include project analysis context when user asks
follow-up questions about the analyzed project.

*/

export default initializeProjectContextIntegration;
