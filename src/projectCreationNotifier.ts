// projectCreationNotifier.ts
// Automatically notify AI assistant when projects are created

import { addSystemMessage, addSystemMessageWithAutoRemoval, addMessageToChat } from './ide/aiAssistant/assistantUI';

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
        `📋 Project loaded: ${info.projectName}`
      );
    }, 500);
    
  } catch (error) {
    console.error('❌ Failed to notify AI assistant:', error);
  }
}

/**
 * Build a compact, professional project context message for the AI
 * Format inspired by clean file analysis cards (like image 1)
 */
function buildProjectContextMessage(info: ProjectCreationInfo): string {
  const time = new Date(info.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const fileCount = info.files.length;
  
  // Super compact format like: "my-app | 11 files | react-vite | web | 05:43 AM"
  return `✅ **${info.projectName}** | ${fileCount} files | ${info.template} | ${info.projectType} | ${time}`;
}

/**
 * Build compact single-line tree preview
 */
function buildCompactTree(files: string[]): string {
  if (files.length === 0) return '';
  
  // Group by top-level folders
  const folders = new Set<string>();
  const rootFiles: string[] = [];
  
  files.forEach(file => {
    if (file.includes('/')) {
      folders.add(file.split('/')[0]);
    } else {
      rootFiles.push(file);
    }
  });
  
  // Build compact representation
  const parts: string[] = [];
  
  folders.forEach(folder => {
    const folderFiles = files.filter(f => f.startsWith(folder + '/'));
    const fileNames = folderFiles.map(f => f.split('/').pop());
    parts.push(`📁 ${folder} | ${fileNames.map(f => `📄 ${f}`).join(' | ')}`);
  });
  
  if (rootFiles.length > 0) {
    parts.push(rootFiles.map(f => `📄 ${f}`).join(' | '));
  }
  
  return parts.join(' | ');
}

/**
 * Format file list into a tree structure (kept for backwards compatibility)
 */
function formatFileTree(files: string[]): string {
  return buildCompactTree(files);
}

/**
 * Get compact one-line descriptions for files
 */
function getCompactFileDescription(template: string, fileName: string): string {
  // Common files
  if (fileName === 'README.md') return 'Documentation and project overview (AI-generated with detailed setup instructions)';
  if (fileName === 'package.json') return 'Project metadata and dependencies - Contains scripts for dev, build, test, etc.';
  if (fileName === 'tsconfig.json') return 'TypeScript/JavaScript compiler configuration - Defines module resolution and compiler options';
  if (fileName === 'tsconfig.node.json') return 'Project file for react-vite template';
  if (fileName === '.gitignore') return 'Git ignore rules to exclude node_modules, build files, etc.';
  if (fileName.endsWith('.html')) return 'HTML entry point with basic structure - Links to styles and scripts';
  if (fileName.includes('vite.config')) return 'Build tool configuration - Defines bundling and dev server settings';
  if (fileName.endsWith('.css')) return 'Stylesheet for visual styling - Can be extended with your custom styles';
  
  // Entry points
  if (fileName.includes('main.tsx') || fileName.includes('main.ts')) return 'Application entry point - Mounts React app to DOM - Handles initial setup';
  if (fileName.includes('App.tsx') || fileName.includes('App.ts')) return 'Main React component - Root of your component tree - Start building your UI here';
  
  return '';
}

/**
 * Get descriptions for files based on template type (kept for backwards compatibility)
 */
function getFileDescriptions(template: string, files: string[]): string {
  return files.map(f => `**${f}** - ${getCompactFileDescription(template, f) || 'Project file'}`).join(' ');
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
    
    // Build enhanced message (compact header)
    const message = buildEnhancedProjectMessage(info);
    
    // Send compact notification to chat
    addSystemMessage(message);
    
    // After a short delay, add AI's helpful response
    setTimeout(() => {
      const aiResponse = buildAIResponse(info);
      addAIResponseMessage(aiResponse);
    }, 300);
    
    console.log('✅ AI assistant notified with file contents');
    
  } catch (error) {
    console.error('❌ Failed to notify AI with contents:', error);
    // Fallback to basic notification
    await notifyAIAboutProjectCreation(info);
  }
}

/**
 * Build a helpful AI response after project creation
 */
function buildAIResponse(info: ProjectCreationInfo): string {
  const template = info.template.toLowerCase();
  
  // Get appropriate run commands based on template
  let runCommands = '';
  
  if (template.includes('react') || template.includes('vue') || template.includes('svelte') || template.includes('next')) {
    runCommands = 'npm install → npm run dev';
  } else if (template.includes('python') || template.includes('fastapi') || template.includes('django')) {
    runCommands = 'pip install -r requirements.txt → python main.py';
  } else if (template.includes('express') || template.includes('node')) {
    runCommands = 'npm install → npm start';
  } else if (template.includes('arduino') || template.includes('esp32')) {
    runCommands = 'Open in Arduino IDE → Upload to board';
  } else if (template.includes('raspberry')) {
    runCommands = 'pip3 install -r requirements.txt → python3 main.py';
  } else {
    runCommands = 'npm install → npm run dev';
  }
  
  // Inject animation styles for the sparkle icon
  injectSparkleAnimation();
  
  return `**${info.projectName}** is ready!

**Quick Start:** \`${runCommands}\`

**How to use AI:**

1. Open any file in the IDE editor if you want me to help with that file

2. To let me search and read all project files, enable **AI Project Search** by clicking:
   <span class="sparkle-icon-animate">✦</span> **"AI Project Search: OFF"** → <span class="sparkle-icon-on">✦</span> **"AI Project Search: ON"**
   (Located in the bottom status bar)

**I can help you with:**
- Explain any file's purpose
- Add new features or components
- Debug issues you encounter
- Set up testing or deployment

What would you like to do first?`;
}

/**
 * Inject CSS animation for sparkle icon (grey to blue transition)
 */
function injectSparkleAnimation(): void {
  if (document.getElementById('sparkle-animation-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'sparkle-animation-styles';
  style.textContent = `
    /* Grey OFF state - animates to show "click me" */
    .sparkle-icon-animate {
      display: inline-block;
      font-size: 1.2em;
      animation: sparkle-grey-to-blue 2s ease-in-out infinite;
    }
    
    /* Blue ON state - steady glow */
    .sparkle-icon-on {
      display: inline-block;
      color: #00d4ff;
      font-size: 1.2em;
      text-shadow: 0 0 8px #00d4ff, 0 0 12px #00d4ff;
      animation: sparkle-glow 1.5s ease-in-out infinite;
    }
    
    /* Animation: grey → blue transition */
    @keyframes sparkle-grey-to-blue {
      0%, 40% {
        color: #888888;
        text-shadow: none;
        transform: scale(1);
      }
      50% {
        color: #00d4ff;
        text-shadow: 0 0 10px #00d4ff, 0 0 20px #00d4ff;
        transform: scale(1.3);
      }
      60%, 100% {
        color: #888888;
        text-shadow: none;
        transform: scale(1);
      }
    }
    
    /* Animation: steady blue glow */
    @keyframes sparkle-glow {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.1);
        text-shadow: 0 0 12px #00d4ff, 0 0 20px #00d4ff;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Add AI response message to chat using DOM manipulation
 * Creates a proper assistant message in the chat
 */
function addAIResponseMessage(message: string): void {
  try {
    // Try using the imported function first
    if (typeof addMessageToChat === 'function') {
      addMessageToChat('assistant', message);
      console.log('✅ AI response added via addMessageToChat');
      return;
    }
    
    // Try window function
    if (typeof (window as any).addMessageToChat === 'function') {
      (window as any).addMessageToChat('assistant', message);
      console.log('✅ AI response added via window.addMessageToChat');
      return;
    }
    
    // Fallback: Direct DOM manipulation
    console.log('⚠️ Using DOM fallback for AI message');
    
    const chatContainer = document.querySelector('.ai-chat-container') ||
                         document.querySelector('.chat-messages') ||
                         document.querySelector('#chat-messages');
    
    if (!chatContainer) {
      console.warn('❌ Chat container not found');
      return;
    }
    
    // Create assistant message element matching existing structure
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    messageDiv.setAttribute('data-role', 'assistant');
    
    // Format message with markdown-like syntax
    const formattedMessage = message
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
      <div class="message-content ai-message-content">
        ${formattedMessage}
      </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    console.log('✅ AI response added via DOM');
    
  } catch (error) {
    console.error('❌ Failed to add AI response:', error);
  }
}

/**
 * Build enhanced message with file contents (compact format)
 * Shows minimal info to user, stores details internally for AI context
 */
function buildEnhancedProjectMessage(info: ProjectCreationInfo): string {
  const time = new Date(info.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const fileCount = info.files.length;
  const hasContents = info.fileContents && Object.keys(info.fileContents).length > 0;
  const analyzedCount = hasContents ? Object.keys(info.fileContents!).length : 0;
  
  // Store detailed info globally for AI to access when needed
  (window as any).__projectContext = {
    ...info,
    treePreview: buildCompactTree(info.files),
    fileDescriptions: info.files.map(f => ({
      name: f,
      desc: getCompactFileDescription(info.template, f)
    }))
  };
  
  // Return super compact display message
  // Format: "✅ my-app | 11 files | react-vite | web | 05:43 AM"
  let message = `✅ **${info.projectName}** | ${fileCount} files`;
  
  if (analyzedCount > 0) {
    message += ` (${analyzedCount} analyzed)`;
  }
  
  message += ` | ${info.template} | ${info.projectType} | ${time}`;
  
  return message;
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
