// projectCommandHandler.ts
// Direct command handler that bypasses AI context confusion

import { addSystemMessage } from './ide/aiAssistant/assistantUI';

// Store last project info globally
let lastProjectInfo: any = null;

/**
 * Store project info when created
 */
export function storeProjectInfo(info: any): void {
  lastProjectInfo = info;
  (window as any).__lastProject = info; // Make globally accessible
}

/**
 * Check if message is a project question
 */
export function isProjectQuestion(message: string): boolean {
  const keywords = [
    'what files',
    'which files',
    'list files',
    'files created',
    'files in',
    'project structure',
    'project files',
    'show files'
  ];
  
  const lowerMessage = message.toLowerCase();
  return keywords.some(kw => lowerMessage.includes(kw));
}

/**
 * Handle project questions directly
 */
export function handleProjectQuestion(message: string): string | null {
  if (!lastProjectInfo) {
    return null; // No project to reference
  }
  
  const lowerMessage = message.toLowerCase();
  
  // Question: What files were created?
  if (lowerMessage.includes('what files') || lowerMessage.includes('list files')) {
    return formatFilesList(lastProjectInfo);
  }
  
  // Question: Project structure?
  if (lowerMessage.includes('structure')) {
    return formatProjectStructure(lastProjectInfo);
  }
  
  // Question: Files in src/?
  if (lowerMessage.includes('files in')) {
    const match = message.match(/files in (.+?)[\s?]/i);
    if (match) {
      const folder = match[1];
      return formatFilesInFolder(lastProjectInfo, folder);
    }
  }
  
  return null;
}

/**
 * Format files list
 */
function formatFilesList(info: any): string {
  if (!info.files || info.files.length === 0) {
    return 'No files information available.';
  }
  
  let response = `📋 **Files in ${info.projectName}:**\n\n`;
  
  info.files.forEach((file: string, index: number) => {
    response += `${index + 1}. ${file}\n`;
  });
  
  response += `\n**Total:** ${info.files.length} files`;
  response += `\n**Template:** ${info.template}`;
  response += `\n**Location:** ${info.projectPath}`;
  
  return response;
}

/**
 * Format project structure
 */
function formatProjectStructure(info: any): string {
  if (!info.files) return 'No structure information available.';
  
  let response = `📁 **Project Structure for ${info.projectName}:**\n\n`;
  response += '```\n';
  
  // Build tree
  const tree: any = {};
  info.files.forEach((file: string) => {
    const parts = file.split('/');
    let current = tree;
    
    parts.forEach((part: string, index: number) => {
      if (index === parts.length - 1) {
        // File
        if (!current.__files) current.__files = [];
        current.__files.push(part);
      } else {
        // Directory
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });
  
  response += renderTree(tree, '');
  response += '```\n';
  
  return response;
}

/**
 * Render tree structure
 */
function renderTree(node: any, indent: string): string {
  let result = '';
  
  // Render directories
  Object.keys(node).forEach(key => {
    if (key === '__files') return;
    result += `${indent}├── 📁 ${key}\n`;
    result += renderTree(node[key], indent + '│   ');
  });
  
  // Render files
  if (node.__files) {
    node.__files.forEach((file: string) => {
      result += `${indent}├── 📄 ${file}\n`;
    });
  }
  
  return result;
}

/**
 * Format files in specific folder
 */
function formatFilesInFolder(info: any, folder: string): string {
  const filesInFolder = info.files.filter((file: string) => 
    file.startsWith(folder + '/') || file.startsWith(folder + '\\')
  );
  
  if (filesInFolder.length === 0) {
    return `No files found in "${folder}" folder.`;
  }
  
  let response = `📂 **Files in ${folder}/:**\n\n`;
  
  filesInFolder.forEach((file: string, index: number) => {
    const fileName = file.split(/[/\\]/).pop();
    response += `${index + 1}. ${fileName}\n`;
  });
  
  response += `\n**Total:** ${filesInFolder.length} files`;
  
  return response;
}

/**
 * Intercept user messages and handle project questions
 */
export function interceptProjectQuestions(message: string): {
  handled: boolean;
  response?: string;
} {
  if (!isProjectQuestion(message)) {
    return { handled: false };
  }
  
  const response = handleProjectQuestion(message);
  
  if (response) {
    // Show response directly in chat
    addSystemMessage(response);
    return { handled: true, response };
  }
  
  return { handled: false };
}

/**
 * Add slash command: /project-files
 */
export function registerProjectCommands(): void {
  // Register /project-files command
  (window as any).projectFiles = () => {
    if (!lastProjectInfo) {
      console.log('No project created yet');
      return;
    }
    
    const response = formatFilesList(lastProjectInfo);
    addSystemMessage(response);
    console.log(response);
  };
  
  // Register /project-structure command
  (window as any).projectStructure = () => {
    if (!lastProjectInfo) {
      console.log('No project created yet');
      return;
    }
    
    const response = formatProjectStructure(lastProjectInfo);
    addSystemMessage(response);
    console.log(response);
  };
  
  console.log('✅ Project commands registered:');
  console.log('   - projectFiles()');
  console.log('   - projectStructure()');
}

// Auto-register on load
if (typeof window !== 'undefined') {
  registerProjectCommands();
}
