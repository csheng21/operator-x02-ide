// intelligentContextProvider.ts
// Provides intelligent context awareness to the AI

/**
 * Context information about the current state
 */
interface ContextInfo {
  project?: {
    name: string;
    template: string;
    files: string[];
    location: string;
  };
  editor?: {
    currentFile?: string;
    language?: string;
    hasContent: boolean;
  };
  recentActivity?: {
    lastAction?: string;
    timestamp?: number;
  };
}

/**
 * Get current project context from stored data
 */
export function getCurrentProjectContext(): ContextInfo['project'] | null {
  const projectInfo = (window as any).__lastProject;
  
  if (!projectInfo) {
    return null;
  }
  
  return {
    name: projectInfo.projectName,
    template: projectInfo.template,
    files: projectInfo.files || [],
    location: projectInfo.projectPath
  };
}

/**
 * Get current editor context
 */
export function getCurrentEditorContext(): ContextInfo['editor'] {
  // Try to get Monaco editor instance
  const monaco = (window as any).monaco;
  
  if (!monaco?.editor) {
    return { hasContent: false };
  }
  
  try {
    const editors = monaco.editor.getModels();
    if (editors && editors.length > 0) {
      const activeEditor = editors[0];
      const language = activeEditor.getLanguageId?.() || 'unknown';
      const uri = activeEditor.uri?.path || activeEditor.uri?.toString() || 'unknown';
      const content = activeEditor.getValue?.() || '';
      
      // Extract filename from URI
      let filename = 'unknown';
      if (uri.includes('/')) {
        const parts = uri.split('/');
        filename = parts[parts.length - 1];
      }
      
      return {
        currentFile: filename,
        language: language,
        hasContent: content.length > 0
      };
    }
  } catch (error) {
    console.warn('Could not get editor context:', error);
  }
  
  return { hasContent: false };
}

/**
 * Build comprehensive context information
 */
export function buildFullContext(): ContextInfo {
  return {
    project: getCurrentProjectContext(),
    editor: getCurrentEditorContext(),
    recentActivity: {
      lastAction: getLastAction(),
      timestamp: Date.now()
    }
  };
}

/**
 * Get the last significant action (project creation, file opened, etc.)
 */
function getLastAction(): string | undefined {
  const projectInfo = (window as any).__lastProject;
  
  if (projectInfo && projectInfo.timestamp) {
    const timeSinceCreation = Date.now() - projectInfo.timestamp;
    const minutesAgo = Math.floor(timeSinceCreation / 60000);
    
    if (minutesAgo < 5) {
      return `Created ${projectInfo.projectName} project ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
    }
  }
  
  return undefined;
}

/**
 * Build intelligent system prompt with full context
 */
export function buildIntelligentSystemPrompt(): string {
  const context = buildFullContext();
  
  let prompt = `You are an intelligent AI coding assistant with full awareness of the user's current context.

CORE CAPABILITIES:
- Provide clear, detailed responses about programming and software development
- Understand context from project state, open files, and recent actions
- Infer what the user is asking about based on current context
- Be helpful even with vague questions like "what?" or "how?"

`;

  // Add project context if available
  if (context.project) {
    prompt += `CURRENT PROJECT CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project Name: ${context.project.name}
Template: ${context.project.template}
Location: ${context.project.location}

Files in Project (${context.project.files.length} total):
${context.project.files.map(f => `  • ${f}`).join('\n')}

`;

    // Add helpful context about the template
    const templateHelp = getTemplateHelp(context.project.template);
    if (templateHelp) {
      prompt += `Template Info: ${templateHelp}\n`;
    }
    
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
  }

  // Add editor context if available
  if (context.editor?.currentFile && context.editor.currentFile !== 'unknown') {
    prompt += `CURRENT EDITOR STATE:
File: ${context.editor.currentFile}
Language: ${context.editor.language}
Status: ${context.editor.hasContent ? 'Has content' : 'Empty/New file'}

`;
  }

  // Add recent activity
  if (context.recentActivity?.lastAction) {
    prompt += `RECENT ACTIVITY:
${context.recentActivity.lastAction}

`;
  }

  // Add intelligent interpretation guidelines
  prompt += `CONTEXT INTERPRETATION GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the user asks vague questions, be intelligent about what they mean:

• "what?" → They likely want to know about:
  ${context.project ? `- The ${context.project.name} project you just saw created` : '- The current file or project'}
  ${context.editor?.currentFile ? `- The ${context.editor.currentFile} file that's open` : ''}
  ${context.recentActivity?.lastAction ? `- Recent activity: ${context.recentActivity.lastAction}` : ''}
  
• "how?" → They likely want to know:
  ${context.project ? `- How to run/use the ${context.project.name} project` : ''}
  ${context.project?.template ? `- How ${context.project.template} works` : ''}
  
• "why?" → They likely want to know:
  ${context.project ? `- Why certain files exist in ${context.project.name}` : ''}
  - Why things are structured a certain way

IMPORTANT RULES:
1. When you see project context above, ALWAYS consider it when answering
2. If user asks vague questions, intelligently infer based on recent activity
3. Reference the project name and files naturally in your responses
4. If they just created a project, assume questions are about that project
5. Be proactive - if you see context, use it!

EXAMPLES:

User: "what?"
Good response: "You just created the ${context.project?.name || 'project'} using ${context.project?.template || 'a template'}. It includes ${context.project?.files.length || 'several'} files like ${context.project?.files[0] || 'the main files'}. What would you like to know about it?"

Bad response: "What do you mean? Can you clarify?"

User: "how?"
Good response: "To run your ${context.project?.name || 'React + Vite'} project, open a terminal in the project directory and run: npm install (first time only), then npm run dev. This will start the development server."

Bad response: "How what? Please be more specific."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remember: Be intelligent, contextual, and helpful. Use the information above!`;

  return prompt;
}

/**
 * Get helpful information about a template
 */
function getTemplateHelp(template: string): string {
  const templates: Record<string, string> = {
    'react-vite': 'React + Vite is a modern, fast development setup. Run with: npm install && npm run dev',
    'vue-vite': 'Vue + Vite is a fast Vue.js development setup. Run with: npm install && npm run dev',
    'vanilla': 'Vanilla HTML/CSS/JS project. Open index.html in a browser.',
    'python-fastapi': 'Python FastAPI backend. Run with: pip install -r requirements.txt && python main.py',
    'express': 'Node.js Express server. Run with: npm install && npm start',
    'nextjs': 'Next.js React framework. Run with: npm install && npm run dev'
  };
  
  return templates[template] || `${template} template project`;
}

/**
 * Add context summary to user message (invisible to user)
 */
export function enhanceMessageWithContext(message: string): string {
  const context = buildFullContext();
  
  // If message is very vague, add helpful context
  const vaguePhrases = ['what', 'how', 'why', 'huh', '?'];
  const isVague = vaguePhrases.some(phrase => 
    message.toLowerCase().trim() === phrase || 
    message.toLowerCase().trim() === phrase + '?'
  );
  
  if (isVague && context.project) {
    // Add invisible context hint
    return `${message}\n\n[SYSTEM: User just created ${context.project.name} (${context.project.template}) and is asking a vague question. Infer what they mean based on recent project creation.]`;
  }
  
  return message;
}

/**
 * Check if we should automatically provide project info
 */
export function shouldAutoProvideProjectInfo(message: string): boolean {
  const autoTriggers = [
    'what',
    'huh',
    'explain',
    'tell me',
    'show me',
    '?'
  ];
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Very short vague questions
  if (lowerMessage.length <= 5 && autoTriggers.some(t => lowerMessage.includes(t))) {
    return true;
  }
  
  return false;
}

/**
 * Generate intelligent auto-response for vague questions
 */
export function generateIntelligentAutoResponse(message: string): string | null {
  const context = buildFullContext();
  
  if (!context.project) {
    return null; // No context to work with
  }
  
  const lowerMessage = message.toLowerCase().trim();
  
  // "what?" type questions
  if (lowerMessage === 'what' || lowerMessage === 'what?') {
    return `I just helped create the **${context.project.name}** project using the **${context.project.template}** template! 

Here's what was created:
${context.project.files.slice(0, 5).map(f => `• ${f}`).join('\n')}
${context.project.files.length > 5 ? `...and ${context.project.files.length - 5} more files` : ''}

**What would you like to know about it?** I can explain any file, show you how to run it, or help you get started!`;
  }
  
  // "how?" type questions  
  if (lowerMessage === 'how' || lowerMessage === 'how?') {
    const templateHelp = getTemplateHelp(context.project.template);
    return `To run your **${context.project.name}** project:\n\n${templateHelp}\n\nNeed help with something else?`;
  }
  
  return null;
}

/**
 * Log context for debugging
 */
export function logCurrentContext(): void {
  const context = buildFullContext();
  console.log('🧠 Current Context:', context);
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).getContext = buildFullContext;
  (window as any).logContext = logCurrentContext;
}
