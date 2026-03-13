// plugins/builtin/pythonSupport/src/linting/linter.ts
import { PluginApi } from '../../../../core/pluginInterface';

export function setupLinter(api: PluginApi): void {
  // Register editor change listener
  api.editor.onDocumentChanged((document) => {
    // Only lint Python files
    if (document.getLanguage() !== 'python') return;
    
    const editor = api.editor.getActiveEditor();
    if (!editor) return;
    
    // Get the text
    const text = document.getText();
    
    // Lint the code
    const issues = lintPythonCode(text);
    
    // Display diagnostics
    displayDiagnostics(api, editor, issues);
  });
}

interface LintIssue {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

function lintPythonCode(code: string): LintIssue[] {
  const issues: LintIssue[] = [];
  
  // Split code into lines
  const lines = code.split('\n');
  
  // Check for some common issues (very basic example)
  lines.forEach((line, index) => {
    // Check line length (PEP 8 recommends max 79 chars)
    if (line.length > 79) {
      issues.push({
        line: index + 1,
        column: 79,
        message: 'Line too long (over 79 characters)',
        severity: 'warning'
      });
    }
    
    // Check for trailing whitespace
    if (line.endsWith(' ') || line.endsWith('\t')) {
      issues.push({
        line: index + 1,
        column: line.length,
        message: 'Trailing whitespace',
        severity: 'info'
      });
    }
    
    // Check for tabs vs spaces
    if (line.startsWith('\t')) {
      issues.push({
        line: index + 1,
        column: 1,
        message: 'Use spaces instead of tabs',
        severity: 'info'
      });
    }
  });
  
  return issues;
}

function displayDiagnostics(api: PluginApi, editor: any, issues: LintIssue[]): void {
  // Convert issues to editor diagnostics format
  const diagnostics = issues.map(issue => ({
    range: {
      startLineNumber: issue.line,
      startColumn: issue.column,
      endLineNumber: issue.line,
      endColumn: issue.column + 1
    },
    message: issue.message,
    severity: issue.severity === 'error' ? 1 : issue.severity === 'warning' ? 2 : 3
  }));
  
  // Set diagnostics in editor
  editor.setModelMarkers(editor.getModel(), 'python-linter', diagnostics);
}