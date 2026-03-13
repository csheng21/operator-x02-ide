// projectCreationNotifier.ts
// Automatically notify AI assistant when projects are created

import { addSystemMessage, addSystemMessageWithAutoRemoval } from './ide/aiAssistant/assistantUI';

export interface ProjectCreationInfo {
  projectName: string;
  projectPath: string;
  projectType: string;
  template: string;
  files: string[];
  fileContents?: Record<string, string>;
  timestamp: number;
}

/**
 * Notify the AI assistant about a newly created project
 * This gives the AI full context about what was just created
 */
export async function notifyAIAboutProjectCreation(info: ProjectCreationInfo): Promise<void> {
  console.log('🤖 Notifying AI assistant about project creation...');
  
  try {
    // Build a comprehensive message for the AI
    const message = buildProjectContextMessage(info);
    
    // Send to AI chat as a system message (persistent)
    addSystemMessage(message);
    
    console.log('✅ AI assistant notified successfully');
    
    // Also show a brief auto-removing notification about the context being added
    setTimeout(() => {
      addSystemMessageWithAutoRemoval(
        `📋 Project context loaded: "${info.projectName}" (${info.template})`
      );
    }, 500);
    
    // Add a searchable marker message
    setTimeout(() => {
      addSystemMessage(
        `📌 **Quick Reference: ${info.projectName}**\n\n` +
        `Files created: ${info.files.join(', ')}\n\n` +
        `To see full details, refer to the "New Project Created" message above.`
      );
    }, 1000);
    
  } catch (error) {
    console.error('❌ Failed to notify AI assistant:', error);
  }
}

/**
 * Build a detailed project context message for the AI
 */
function buildProjectContextMessage(info: ProjectCreationInfo): string {
  const separator = info.projectPath.includes('\\') ? '\\' : '/';
  const fullPath = `${info.projectPath}${separator}${info.projectName}`;
  
  // Format file tree
  const fileTree = formatFileTree(info.files);
  
  // Get file descriptions based on template type
  const fileDescriptions = getFileDescriptions(info.template, info.files);
  
  return `🎉 **New Project Created** 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  PROJECT CONTEXT - PLEASE READ CAREFULLY ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A new project was just created with actual files on disk.

**When asked about:**
• "what files were created"
• "project structure"
• "files in the project"  
• "what's in my project"

👉 **REFER TO THIS MESSAGE**, not the current editor state.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Project Details:**
- **Name:** ${info.projectName}
- **Location:** ${fullPath}
- **Type:** ${info.projectType}
- **Template:** ${info.template}
- **Created:** ${new Date(info.timestamp).toLocaleString()}

**Project Structure:**
\`\`\`
${fileTree}
\`\`\`

**Files Created (${info.files.length} files):**

${fileDescriptions}

**What You Can Do:**
- Ask me questions about any of these files
- Request explanations of the project structure
- Get help with next steps or modifications
- Debug any issues you encounter
- Extend functionality or add new features

**Example Questions:**
• "What does main.tsx do in this project?"
• "Explain the project structure above"
• "How do I run this ${info.template} project?"
• "What files are in the src directory?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ I'm now fully aware of this project!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Format file list into a tree structure
 */
function formatFileTree(files: string[]): string {
  if (files.length === 0) return '(no files)';
  
  // Sort files (directories first, then alphabetically)
  const sorted = [...files].sort((a, b) => {
    const aHasSlash = a.includes('/');
    const bHasSlash = b.includes('/');
    
    if (aHasSlash && !bHasSlash) return -1;
    if (!aHasSlash && bHasSlash) return 1;
    return a.localeCompare(b);
  });
  
  // Build tree structure
  const lines: string[] = [];
  const processed = new Set<string>();
  
  for (const file of sorted) {
    const parts = file.split('/');
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      
      if (processed.has(currentPath)) continue;
      processed.add(currentPath);
      
      const indent = '  '.repeat(i);
      const isLast = i === parts.length - 1;
      const icon = isLast ? '📄' : '📁';
      const prefix = i === 0 ? '├──' : '│   ├──';
      
      lines.push(`${indent}${prefix} ${icon} ${parts[i]}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Get descriptions for files based on template type
 */
function getFileDescriptions(template: string, files: string[]): string {
  const descriptions: string[] = [];
  
  for (const file of files) {
    const desc = getFileDescription(template, file);
    if (desc) {
      descriptions.push(`**${file}**\n${desc}\n`);
    }
  }
  
  return descriptions.length > 0 
    ? descriptions.join('\n')
    : 'Project files have been created and are ready for development.';
}

/**
 * Get description for a specific file based on its name and template
 */
function getFileDescription(template: string, fileName: string): string {
  // Common files across templates
  if (fileName === 'README.md') {
    return '- Documentation and project overview (AI-generated with detailed setup instructions)';
  }
  
  if (fileName === 'package.json') {
    return '- Project metadata and dependencies\n- Contains scripts for dev, build, test, etc.';
  }
  
  if (fileName === 'tsconfig.json' || fileName === 'jsconfig.json') {
    return '- TypeScript/JavaScript compiler configuration\n- Defines module resolution and compiler options';
  }
  
  if (fileName === '.gitignore') {
    return '- Git ignore rules to exclude node_modules, build files, etc.';
  }
  
  if (fileName.endsWith('.html')) {
    return '- HTML entry point with basic structure\n- Links to styles and scripts';
  }
  
  if (fileName.endsWith('.css') || fileName.includes('styles')) {
    return '- Stylesheet for visual styling\n- Can be extended with your custom styles';
  }
  
  // Template-specific descriptions
  if (template.includes('react')) {
    if (fileName.includes('App.') || fileName.includes('app.')) {
      return '- Main React component\n- Root of your component tree\n- Start building your UI here';
    }
    if (fileName.includes('main.') || fileName.includes('index.')) {
      return '- Application entry point\n- Mounts React app to DOM\n- Handles initial setup';
    }
  }
  
  if (template.includes('vue')) {
    if (fileName.includes('App.vue')) {
      return '- Root Vue component\n- Contains template, script, and styles\n- Start building your UI here';
    }
    if (fileName.includes('main.')) {
      return '- Application entry point\n- Creates Vue app instance\n- Handles plugins and router';
    }
  }
  
  if (template.includes('python') || template.includes('fastapi') || template.includes('django')) {
    if (fileName === 'main.py' || fileName === 'app.py') {
      return '- Main application entry point\n- Contains core application logic\n- Run this file to start the server';
    }
    if (fileName === 'requirements.txt') {
      return '- Python dependencies list\n- Install with: pip install -r requirements.txt';
    }
    if (fileName === 'config.py' || fileName === 'settings.py') {
      return '- Configuration settings\n- Database, API keys, environment variables';
    }
  }
  
  if (template.includes('express') || template.includes('node')) {
    if (fileName.includes('server.') || fileName.includes('app.')) {
      return '- Express server setup\n- Defines routes and middleware\n- Run with: npm start';
    }
    if (fileName.includes('routes/')) {
      return '- API route definitions\n- Handles HTTP endpoints';
    }
  }
  
  if (template.includes('arduino') || template.includes('embedded')) {
    if (fileName.endsWith('.ino')) {
      return '- Arduino sketch file\n- Contains setup() and loop() functions\n- Upload to board with Arduino IDE';
    }
    if (fileName.endsWith('.cpp') || fileName.endsWith('.h')) {
      return '- C/C++ source code\n- Contains embedded logic and hardware interfacing';
    }
  }
  
  // Configuration files
  if (fileName.includes('vite.config') || fileName.includes('webpack.config')) {
    return '- Build tool configuration\n- Defines bundling and dev server settings';
  }
  
  if (fileName.includes('.env')) {
    return '- Environment variables\n- Store API keys and configuration (NOT committed to git)';
  }
  
  // Default for unknown files
  return `- Project file for ${template} template`;
}

/**
 * Get file contents for important files (to provide more context to AI)
 */
export async function getProjectFileContents(
  projectPath: string,
  files: string[]
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  
  // Prioritize reading these files for AI context
  const priorityFiles = [
    'README.md',
    'package.json',
    'main.py',
    'app.py',
    'main.ts',
    'main.js',
    'index.html'
  ];
  
  const filesToRead = files.filter(file => 
    priorityFiles.some(pf => file.endsWith(pf))
  );
  
  // Read files using Tauri if available
  if ((window as any).__TAURI__?.invoke) {
    try {
      const { invoke } = (window as any).__TAURI__;
      const separator = projectPath.includes('\\') ? '\\' : '/';
      
      for (const file of filesToRead) {
        try {
          const fullPath = `${projectPath}${separator}${file}`;
          const content = await invoke('read_file', { path: fullPath });
          contents[file] = content;
        } catch (error) {
          console.warn(`Could not read ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Error reading files:', error);
    }
  }
  
  return contents;
}

/**
 * Enhanced notification with file contents
 */
export async function notifyAIWithFileContents(info: ProjectCreationInfo): Promise<void> {
  console.log('🤖 Notifying AI with full file contents...');
  
  try {
    // Get file contents
    const contents = await getProjectFileContents(info.projectPath, info.files);
    info.fileContents = contents;
    
    // Build enhanced message
    const message = buildEnhancedProjectMessage(info);
    
    // Send to AI
    addSystemMessage(message);
    
    console.log('✅ AI assistant notified with file contents');
    
  } catch (error) {
    console.error('❌ Failed to notify AI with contents:', error);
    // Fallback to basic notification
    await notifyAIAboutProjectCreation(info);
  }
}

/**
 * Build enhanced message with file contents
 */
function buildEnhancedProjectMessage(info: ProjectCreationInfo): string {
  const basicMessage = buildProjectContextMessage(info);
  
  if (!info.fileContents || Object.keys(info.fileContents).length === 0) {
    return basicMessage;
  }
  
  // Add file contents section
  let contentsSection = '\n\n**Key File Contents:**\n\n';
  
  for (const [fileName, content] of Object.entries(info.fileContents)) {
    // Limit content size to avoid overwhelming the AI
    const truncated = content.length > 1000 
      ? content.substring(0, 1000) + '\n... (truncated)'
      : content;
    
    contentsSection += `**${fileName}:**\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
  }
  
  return basicMessage + contentsSection;
}

/**
 * Listen for project creation events and auto-notify AI
 */
export function initializeProjectCreationNotifier(): void {
  console.log('🔧 Initializing project creation notifier...');
  
  // Listen for custom project-created events
  document.addEventListener('project-created', async (event: any) => {
    console.log('🎉 project-created event received:', event.detail);
    
    const info: ProjectCreationInfo = event.detail;
    
    // Notify AI with full context
    await notifyAIWithFileContents(info);
  });
  
  console.log('✅ Project creation notifier initialized');
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).notifyAIAboutProjectCreation = notifyAIAboutProjectCreation;
  (window as any).notifyAIWithFileContents = notifyAIWithFileContents;
}