// codeContextManager.ts - Code Analysis Context Management

import { addSystemMessage } from './messageUI';

interface CodeContext {
  code: string;
  language: string;
  fileName: string;
  lastAnalyzedTimestamp: number;
}

let isInCodeAnalysisMode = false;
let currentCodeContext: CodeContext = {
  code: '',
  language: '',
  fileName: '',
  lastAnalyzedTimestamp: 0
};

export function getCurrentCodeContext(): CodeContext {
  return currentCodeContext;
}

export function setCodeAnalysisMode(enabled: boolean, context?: CodeContext): void {
  isInCodeAnalysisMode = enabled;
  if (context) {
    currentCodeContext = context;
  }
}

export function isInCodeAnalysis(): boolean {
  return isInCodeAnalysisMode;
}



function getCurrentFileInfo(): { name: string; language: string; lines: number } {
  let fileName = 'untitled.txt';
  
  const possibleTabSelectors = [
    '.editor-tab.active',
    '.tab.active',
    '.active-tab',
    '[aria-selected="true"]',
    '.monaco-tab.active'
  ];
  
  let activeTab = null;
  for (const selector of possibleTabSelectors) {
    activeTab = document.querySelector(selector);
    if (activeTab) break;
  }
  
  if (activeTab) {
    const possibleTitleSelectors = ['.tab-title', '.tab-name', '.file-name', 'span'];
    for (const selector of possibleTitleSelectors) {
      const tabTitle = activeTab.querySelector(selector);
      if (tabTitle?.textContent?.trim()) {
        fileName = tabTitle.textContent.trim();
        break;
      }
    }
  }
  
  const parts = fileName.split('.');
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || 'txt' : 'txt';
  
  const languageMap: { [key: string]: string } = {
    'js': 'javascript', 'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'html': 'html', 'css': 'css',
    'json': 'json', 'md': 'markdown', 'java': 'java',
    'cpp': 'cpp', 'c': 'c', 'go': 'go', 'rs': 'rust'
  };
  
  return {
    name: fileName,
    language: languageMap[extension] || 'plaintext',
    lines: 0
  };
}

export function enhanceMessageContextForCurrentFile(message: string): string {
  try {
    const editor = window.monaco?.editor?.getEditors?.()?.[0];
    if (editor) {
      const currentCode = editor.getValue();
      const currentFileInfo = getCurrentFileInfo();
      
      const fileNameInMessage = message.match(/([a-zA-Z0-9_-]+\.[a-z]+)/i);
      
      if (fileNameInMessage) {
        const requestedFile = fileNameInMessage[1];
        
        if (requestedFile === currentFileInfo.name) {
          setCodeAnalysisMode(true, {
            code: currentCode,
            language: currentFileInfo.language,
            fileName: currentFileInfo.name,
            lastAnalyzedTimestamp: Date.now()
          });
          
          return `Analyzing ${currentFileInfo.language} code in "${currentFileInfo.name}":

\`\`\`${currentFileInfo.language}
${currentCode}
\`\`\`

Question: ${message}`;
        }
      }
      
      if (message.toLowerCase().includes('this code') || 
          message.toLowerCase().includes('this file') ||
          message.toLowerCase().includes('current code')) {
        
        setCodeAnalysisMode(true, {
          code: currentCode,
          language: currentFileInfo.language,
          fileName: currentFileInfo.name,
          lastAnalyzedTimestamp: Date.now()
        });
        
        return `Analyzing current ${currentFileInfo.language} code in "${currentFileInfo.name}":

\`\`\`${currentFileInfo.language}
${currentCode}
\`\`\`

Question: ${message}`;
      }
    }
  } catch (error) {
    console.error('Error enhancing message context:', error);
  }
  
  return message;
}

export function checkCodeAnalysisModeTimeout(): void {
  if (isInCodeAnalysisMode) {
    const now = Date.now();
    const timeElapsed = now - currentCodeContext.lastAnalyzedTimestamp;
    
    if (timeElapsed > 30 * 60 * 1000) {
      setCodeAnalysisMode(false);
      addSystemMessage('Code analysis mode timed out.');
    }
  }
}