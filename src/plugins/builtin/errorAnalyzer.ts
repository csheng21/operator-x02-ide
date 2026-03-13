// src/plugins/builtin/errorAnalyzer/index.ts

import { Plugin, PluginApi } from '../../core/pluginInterface';
import { ERROR_DATABASE } from './errorDatabase';

export const activate = async (api: PluginApi): Promise<void> => {
  console.log('Error Analyzer plugin activated');
  
  // Subscribe to terminal output
  api.terminal.onOutput((output: string, isError: boolean) => {
    if (isError || output.includes('Error:') || output.includes('Traceback')) {
      analyzeError(output, api);
    }
  });
  
  // Register commands
  api.ui.registerCommand('errorAnalyzer.analyze', 'Analyze Selected Error', () => {
    const selectedText = api.editor.getSelectedText();
    if (selectedText) {
      analyzeError(selectedText, api);
    } else {
      api.ui.showNotification('Please select an error message to analyze', 'info');
    }
  });
};

export const deactivate = async (): Promise<void> => {
  console.log('Error Analyzer plugin deactivated');
  // Clean up resources, remove event listeners, etc.
};

// Analyze error messages
function analyzeError(errorText: string, api: PluginApi): void {
  // Check for known error patterns
  for (const { pattern, solution } of ERROR_DATABASE) {
    if (pattern.test(errorText)) {
      // Found a match, show the solution
      api.ui.createPanel('errorAnalysis', 'Error Analysis', formatSolution(solution));
      return;
    }
  }
  
  // No specific match found, provide generic guidance
  api.ui.showNotification('No specific solution found for this error', 'info');
}

// Format solution text with HTML
function formatSolution(solution: string): string {
  return solution
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// Error database
const ERROR_DATABASE = [
  {
    pattern: /module ['"]flet['"] has no attribute ['"]colors['"]/i,
    solution: `I see the error: "module 'flet' has no attribute 'colors'"\n\n` +
      `This error occurs because of a Flet version compatibility issue. In newer versions of Flet, the colors structure has changed. Here's how to fix it:\n\n` +
      `### Option 1: Use hex color codes directly\n` +
      `\`\`\`python\n` +
      `# Replace all instances of:\n` +
      `ft.colors.BLUE_GREY_100\n\n` +
      `# With:\n` +
      `"#B0BEC5"  # Use hex color codes directly\n` +
      `\`\`\`\n\n` +
      `### Option 2: Import colors specifically\n` +
      `\`\`\`python\n` +
      `# At the top of your file, add:\n` +
      `from flet.colors import BLUE_GREY_100, RED_100\n\n` +
      `# Then replace:\n` +
      `ft.colors.BLUE_GREY_100 → BLUE_GREY_100\n` +
      `\`\`\`\n\n` +
      `### Option 3: Update your Flet version\n` +
      `\`\`\`\n` +
      `pip install --upgrade flet\n` +
      `\`\`\``
  },
  // Add more error patterns
];