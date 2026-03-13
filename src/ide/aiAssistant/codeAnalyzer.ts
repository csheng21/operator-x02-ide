// src/ide/aiAssistant/codeAnalyzer.ts
import { getCurrentContent } from '../../editor/editorManager';
import { callDeepseekAPI } from '../../utils/apiClient';
import { tabManager } from '../../editor/tabManager';

/**
 * Get information about the current file
 */

/**
 * Analyze the current code in the editor
 */
// src/ide/aiAssistant/codeAnalyzer.ts
import { getMonacoEditor } from '../../editor/editorManager';
import { callDeepseekAPI } from '../../utils/apiClient';
import { tabManager } from '../../editor/tabManager';

/**
 * Get current editor content
 */
function getCurrentContent(): string {
  const editor = getMonacoEditor();
  if (!editor) {
    return '';
  }
  
  return editor.getValue();
}

/**
 * Get information about the current file
 */
export function getCurrentFileInfo(): { path: string; language: string; name: string } {
  const activeTab = tabManager.getActiveTab();
  
  if (!activeTab) {
    return {
      path: 'Untitled',
      language: 'plaintext',
      name: 'Untitled'
    };
  }
  
  return {
    path: activeTab.path,
    language: activeTab.language,
    name: activeTab.name
  };
}

/**
 * Analyze the current code in the editor
 */
export async function analyzeCurrentCode(apiKey: string, apiBaseUrl: string): Promise<string> {
  // Get current code and file info
  const code = getCurrentContent();
  const fileInfo = getCurrentFileInfo();
  
  if (!code) {
    return "No code found in the editor. Please open a file or write some code first.";
  }
  
  try {
    console.log('Analyzing code from:', fileInfo.path);
    
    // Create optimized prompt for code analysis
    const messages = [
      {
        role: 'system',
        content: `You are a specialized code analysis assistant. Analyze the provided ${fileInfo.language} code and provide:
1. A brief summary of what the code does
2. Any bugs, issues, or potential problems in the code
3. Suggestions for improvements or optimizations
Be specific in your analysis and reference line numbers when possible. Format your analysis with clear headings and bullet points.`
      },
      {
        role: 'user',
        content: `Analyze this ${fileInfo.language} code from file ${fileInfo.name}:\n\n${code}`
      }
    ];
    
    // Call the API
    const response = await callDeepseekAPI(apiKey, apiBaseUrl, messages);
    
    // Extract the assistant's response
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    } else {
      return "Analysis completed, but no results were returned. Please try again.";
    }
  } catch (error) {
    console.error('Code analysis failed:', error);
    return `Failed to analyze code: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}