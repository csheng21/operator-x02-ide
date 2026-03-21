// src/ide/aiAssistant/aiEditorFeatures.ts
// ============================================================================
// AI-Powered Editor Features Collection
// Comprehensive AI integration for Monaco Editor
// ============================================================================

import { callGenericAPI } from './apiProviderManager';

// ============================================================================
// 1. AI HOVER EXPLANATION
// ============================================================================

interface AIHoverConfig {
  enabled: boolean;
  delay: number;
  maxLength: number;
}

const hoverConfig: AIHoverConfig = {
  enabled: true,
  delay: 300,
  maxLength: 500
};

const hoverCache = new Map<string, { content: string; time: number }>();

/**
 * Initialize AI-powered hover explanations
 */
export function initializeAIHover(monaco: any): void {
  console.log('🤖 Initializing AI Hover...');

  const languages = ['typescript', 'javascript', 'python', 'rust', 'java', 'csharp', 'go', 'cpp'];

  languages.forEach(lang => {
    monaco.languages.registerHoverProvider(lang, {
      provideHover: async (model: any, position: any) => {
        if (!hoverConfig.enabled) return null;

        const word = model.getWordAtPosition(position);
        if (!word || word.word.length < 3) return null;

        // Skip common keywords
        const skipWords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'interface', 'type'];
        if (skipWords.includes(word.word)) return null;

        const line = model.getLineContent(position.lineNumber);
        const cacheKey = `${model.uri.toString()}:${position.lineNumber}:${word.word}`;

        // Check cache (valid for 60 seconds)
        const cached = hoverCache.get(cacheKey);
        if (cached && Date.now() - cached.time < 60000) {
          return {
            contents: [{ value: cached.content }],
            range: {
              startLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: word.endColumn
            }
          };
        }

        try {
          const explanation = await getQuickExplanation(word.word, line, model.getLanguageId());
          if (explanation) {
            hoverCache.set(cacheKey, { content: explanation, time: Date.now() });
            return {
              contents: [{ value: explanation }],
              range: {
                startLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endLineNumber: position.lineNumber,
                endColumn: word.endColumn
              }
            };
          }
        } catch (e) {
          console.debug('AI Hover error:', e);
        }

        return null;
      }
    });
  });

  console.log('✅ AI Hover initialized');
}

async function getQuickExplanation(word: string, line: string, language: string): Promise<string | null> {
  const prompt = `In ${language}, briefly explain "${word}" in this context: "${line.trim()}". 
Reply in 1 sentence only. If it's just a variable name, say "Variable: " and describe its likely purpose.`;

  const response = await callGenericAPI(prompt);
  if (!response || response.length > hoverConfig.maxLength) return null;
  
  return `🤖 **AI:** ${response.trim()}`;
}

// ============================================================================
// 2. AI ERROR EXPLAINER
// ============================================================================

interface ErrorExplanation {
  summary: string;
  cause: string;
  fix: string;
  example?: string;
}

/**
 * Explain compiler/linter errors in plain English
 */
export async function explainError(errorMessage: string, code: string, language: string): Promise<ErrorExplanation> {
  const prompt = `Explain this ${language} error to a developer:

Error: ${errorMessage}
Code: ${code}

Reply in JSON format:
{
  "summary": "One sentence explaining what went wrong",
  "cause": "Why this error occurs",
  "fix": "How to fix it",
  "example": "Fixed code example (optional)"
}`;

  try {
    const response = await callGenericAPI(prompt);
    return JSON.parse(response);
  } catch (e) {
    return {
      summary: errorMessage,
      cause: 'Unable to analyze',
      fix: 'Check the error message and documentation'
    };
  }
}

/**
 * Initialize error explanation on marker hover
 */
export function initializeErrorExplainer(monaco: any, editor: any): void {
  console.log('🔴 Initializing AI Error Explainer...');

  // Listen for marker (error/warning) hover
  editor.onDidChangeModelDecorations(() => {
    const model = editor.getModel();
    if (!model) return;

    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    
    // Add AI explanation action to each error
    markers.forEach((marker: any) => {
      if (marker.severity >= monaco.MarkerSeverity.Warning) {
        // Store marker info for context menu
        (window as any).__lastErrorMarker = marker;
      }
    });
  });

  // Add context menu action
  editor.addAction({
    id: 'ai-explain-error',
    label: '🤖 AI: Explain This Error',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 0,
    run: async (ed: any) => {
      const marker = (window as any).__lastErrorMarker;
      if (!marker) {
        showNotification('No error selected', 'warning');
        return;
      }

      const model = ed.getModel();
      const code = model.getLineContent(marker.startLineNumber);
      
      showNotification('🤖 Analyzing error...', 'info');
      
      const explanation = await explainError(marker.message, code, model.getLanguageId());
      
      showErrorExplanationPanel(explanation);
    }
  });

  console.log('✅ AI Error Explainer initialized');
}

// ============================================================================
// 3. AI CODE ACTIONS (Quick Fixes)
// ============================================================================

interface AICodeAction {
  title: string;
  kind: string;
  edit?: any;
  command?: any;
}

/**
 * Initialize AI-powered code actions
 */
export function initializeAICodeActions(monaco: any): void {
  console.log('⚡ Initializing AI Code Actions...');

  const languages = ['typescript', 'javascript', 'python'];

  languages.forEach(lang => {
    monaco.languages.registerCodeActionProvider(lang, {
      provideCodeActions: async (model: any, range: any, context: any) => {
        const actions: AICodeAction[] = [];
        const selectedText = model.getValueInRange(range);

        if (selectedText.length < 3) return { actions: [], dispose: () => {} };

        // Add AI actions
        actions.push({
          title: '🤖 AI: Explain This Code',
          kind: 'quickfix.ai.explain'
        });

        actions.push({
          title: '🤖 AI: Improve This Code',
          kind: 'quickfix.ai.improve'
        });

        actions.push({
          title: '🤖 AI: Add Comments',
          kind: 'quickfix.ai.comment'
        });

        actions.push({
          title: '🤖 AI: Generate Tests',
          kind: 'quickfix.ai.test'
        });

        // Check for potential issues
        if (selectedText.includes('TODO') || selectedText.includes('FIXME')) {
          actions.push({
            title: '🤖 AI: Implement TODO',
            kind: 'quickfix.ai.todo'
          });
        }

        return {
          actions: actions.map(a => ({
            title: a.title,
            kind: a.kind,
            command: {
              id: 'ai.codeAction',
              title: a.title,
              arguments: [a.kind, selectedText, model.getLanguageId(), range]
            }
          })),
          dispose: () => {}
        };
      }
    });
  });

  console.log('✅ AI Code Actions initialized');
}

// ============================================================================
// 4. AI AUTOCOMPLETE ENHANCEMENT
// ============================================================================

/**
 * Initialize AI-enhanced autocomplete
 */
export function initializeAIAutocomplete(monaco: any): void {
  console.log('✨ Initializing AI Autocomplete...');

  const languages = ['typescript', 'javascript', 'python'];

  languages.forEach(lang => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '/', '@', '#'],
      provideCompletionItems: async (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 5),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        // Only trigger for meaningful contexts
        if (textUntilPosition.length < 10) {
          return { suggestions: [] };
        }

        // Check if it's a comment context (for AI suggestions)
        const currentLine = model.getLineContent(position.lineNumber);
        if (currentLine.trim().startsWith('//') || currentLine.trim().startsWith('#')) {
          return await getAICommentCompletions(textUntilPosition, lang, position, monaco);
        }

        return { suggestions: [] };
      }
    });
  });

  console.log('✅ AI Autocomplete initialized');
}

async function getAICommentCompletions(context: string, language: string, position: any, monaco: any) {
  try {
    const prompt = `Given this ${language} code context, suggest what code should come next. 
Context:
${context}

Provide 3 short code suggestions. Reply as JSON array: ["suggestion1", "suggestion2", "suggestion3"]`;

    const response = await callGenericAPI(prompt);
    const suggestions = JSON.parse(response);

    return {
      suggestions: suggestions.map((s: string, i: number) => ({
        label: `🤖 ${s.substring(0, 50)}...`,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: s,
        detail: 'AI Suggestion',
        sortText: `0${i}`,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        }
      }))
    };
  } catch (e) {
    return { suggestions: [] };
  }
}

// ============================================================================
// 5. AI CODE REVIEW
// ============================================================================

interface CodeReviewResult {
  score: number; // 1-10
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    line?: number;
    message: string;
    suggestion?: string;
  }>;
  summary: string;
  improvements: string[];
}

/**
 * Perform AI code review on selected code or entire file
 */
export async function performCodeReview(code: string, language: string): Promise<CodeReviewResult> {
  const prompt = `Review this ${language} code for:
1. Bugs and potential errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Readability

Code:
\`\`\`${language}
${code}
\`\`\`

Reply in JSON format:
{
  "score": 8,
  "issues": [
    {"severity": "warning", "line": 5, "message": "Issue description", "suggestion": "How to fix"}
  ],
  "summary": "Overall assessment",
  "improvements": ["Improvement 1", "Improvement 2"]
}`;

  try {
    const response = await callGenericAPI(prompt);
    return JSON.parse(response);
  } catch (e) {
    return {
      score: 0,
      issues: [{ severity: 'error', message: 'Failed to analyze code' }],
      summary: 'Analysis failed',
      improvements: []
    };
  }
}

/**
 * Initialize code review command
 */
export function initializeCodeReview(monaco: any, editor: any): void {
  console.log('📋 Initializing AI Code Review...');

  editor.addAction({
    id: 'ai-code-review',
    label: '🤖 AI: Review This Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR],
    contextMenuGroupId: 'ai',
    contextMenuOrder: 1,
    run: async (ed: any) => {
      const model = ed.getModel();
      const selection = ed.getSelection();
      
      let code: string;
      if (selection && !selection.isEmpty()) {
        code = model.getValueInRange(selection);
      } else {
        code = model.getValue();
      }

      if (code.length < 20) {
        showNotification('Please select more code to review', 'warning');
        return;
      }

      showNotification('🤖 Reviewing code...', 'info');

      const review = await performCodeReview(code, model.getLanguageId());
      showCodeReviewPanel(review, ed);
    }
  });

  console.log('✅ AI Code Review initialized (Ctrl+Shift+R)');
}

// ============================================================================
// 6. AI TEST GENERATOR
// ============================================================================

/**
 * Generate unit tests for selected code
 */
export async function generateTests(code: string, language: string, framework?: string): Promise<string> {
  const testFramework = framework || getDefaultTestFramework(language);
  
  const prompt = `Generate unit tests for this ${language} code using ${testFramework}:

\`\`\`${language}
${code}
\`\`\`

Requirements:
1. Test all public functions/methods
2. Include edge cases
3. Include error cases
4. Use descriptive test names
5. Add comments explaining each test

Reply with ONLY the test code, no explanations.`;

  const response = await callGenericAPI(prompt);
  return response;
}

function getDefaultTestFramework(language: string): string {
  const frameworks: Record<string, string> = {
    'typescript': 'Jest',
    'javascript': 'Jest',
    'python': 'pytest',
    'rust': 'built-in #[test]',
    'java': 'JUnit',
    'csharp': 'NUnit',
    'go': 'testing package'
  };
  return frameworks[language] || 'appropriate testing framework';
}

/**
 * Initialize test generator command
 */
export function initializeTestGenerator(monaco: any, editor: any): void {
  console.log('🧪 Initializing AI Test Generator...');

  editor.addAction({
    id: 'ai-generate-tests',
    label: '🤖 AI: Generate Tests',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT],
    contextMenuGroupId: 'ai',
    contextMenuOrder: 2,
    run: async (ed: any) => {
      const model = ed.getModel();
      const selection = ed.getSelection();
      
      let code: string;
      if (selection && !selection.isEmpty()) {
        code = model.getValueInRange(selection);
      } else {
        showNotification('Please select code to generate tests for', 'warning');
        return;
      }

      showNotification('🧪 Generating tests...', 'info');

      const tests = await generateTests(code, model.getLanguageId());
      
      // Show in new editor or panel
      showGeneratedCode(tests, `tests.${getTestFileExtension(model.getLanguageId())}`);
    }
  });

  console.log('✅ AI Test Generator initialized (Ctrl+Shift+T)');
}

function getTestFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    'typescript': 'test.ts',
    'javascript': 'test.js',
    'python': '_test.py',
    'rust': 'rs',
    'java': 'Test.java',
    'csharp': 'Tests.cs',
    'go': '_test.go'
  };
  return extensions[language] || 'test.txt';
}

// ============================================================================
// 7. AI REFACTOR SUGGESTIONS
// ============================================================================

interface RefactorSuggestion {
  type: 'extract-function' | 'rename' | 'simplify' | 'modernize' | 'dry';
  description: string;
  before: string;
  after: string;
}

/**
 * Get refactoring suggestions for code
 */
export async function getRefactorSuggestions(code: string, language: string): Promise<RefactorSuggestion[]> {
  const prompt = `Analyze this ${language} code and suggest refactoring improvements:

\`\`\`${language}
${code}
\`\`\`

Suggest up to 3 refactorings. Reply in JSON format:
[
  {
    "type": "simplify",
    "description": "What to improve",
    "before": "original code snippet",
    "after": "refactored code snippet"
  }
]`;

  try {
    const response = await callGenericAPI(prompt);
    return JSON.parse(response);
  } catch (e) {
    return [];
  }
}

/**
 * Initialize refactor suggestions
 */
export function initializeRefactorSuggestions(monaco: any, editor: any): void {
  console.log('🔧 Initializing AI Refactor Suggestions...');

  editor.addAction({
    id: 'ai-refactor',
    label: '🤖 AI: Suggest Refactoring',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
    contextMenuGroupId: 'ai',
    contextMenuOrder: 3,
    run: async (ed: any) => {
      const model = ed.getModel();
      const selection = ed.getSelection();
      
      let code: string;
      if (selection && !selection.isEmpty()) {
        code = model.getValueInRange(selection);
      } else {
        code = model.getValue();
      }

      showNotification('🔧 Analyzing for refactoring...', 'info');

      const suggestions = await getRefactorSuggestions(code, model.getLanguageId());
      
      if (suggestions.length === 0) {
        showNotification('No refactoring suggestions found', 'info');
        return;
      }

      showRefactorPanel(suggestions, ed);
    }
  });

  console.log('✅ AI Refactor initialized (Ctrl+Shift+F)');
}

// ============================================================================
// 8. AI DOCUMENTATION GENERATOR
// ============================================================================

/**
 * Generate documentation for code
 */
export async function generateDocumentation(code: string, language: string, style: 'jsdoc' | 'docstring' | 'markdown' = 'jsdoc'): Promise<string> {
  const styleInstructions = {
    'jsdoc': 'JSDoc format with @param, @returns, @example',
    'docstring': 'Python docstring format with Args, Returns, Example',
    'markdown': 'Markdown documentation with headers and code examples'
  };

  const prompt = `Generate ${styleInstructions[style]} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
1. Description of purpose
2. Parameters with types
3. Return value
4. Usage example
5. Any important notes

Reply with ONLY the documentation, properly formatted.`;

  return await callGenericAPI(prompt);
}

/**
 * Initialize documentation generator
 */
export function initializeDocGenerator(monaco: any, editor: any): void {
  console.log('📝 Initializing AI Doc Generator...');

  editor.addAction({
    id: 'ai-generate-docs',
    label: '🤖 AI: Generate Documentation',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
    contextMenuGroupId: 'ai',
    contextMenuOrder: 4,
    run: async (ed: any) => {
      const model = ed.getModel();
      const selection = ed.getSelection();
      
      let code: string;
      let insertPosition: any;
      
      if (selection && !selection.isEmpty()) {
        code = model.getValueInRange(selection);
        insertPosition = { lineNumber: selection.startLineNumber, column: 1 };
      } else {
        // Get current function/class
        const position = ed.getPosition();
        code = model.getLineContent(position.lineNumber);
        insertPosition = { lineNumber: position.lineNumber, column: 1 };
      }

      showNotification('📝 Generating documentation...', 'info');

      const docs = await generateDocumentation(code, model.getLanguageId());
      
      // Insert documentation above the code
      ed.executeEdits('ai-docs', [{
        range: {
          startLineNumber: insertPosition.lineNumber,
          startColumn: 1,
          endLineNumber: insertPosition.lineNumber,
          endColumn: 1
        },
        text: docs + '\n'
      }]);

      showNotification('✅ Documentation added', 'success');
    }
  });

  console.log('✅ AI Doc Generator initialized (Ctrl+Shift+D)');
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

function showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const colors = {
    info: '#007acc',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };

  const notification = document.createElement('div');
  notification.className = 'ai-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    ">${message}</div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showErrorExplanationPanel(explanation: ErrorExplanation): void {
  const panel = document.createElement('div');
  panel.className = 'ai-error-panel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2d2d2d;
      border: 1px solid #dc3545;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #dc3545;">🔴 Error Explanation</h3>
        <span style="cursor: pointer; color: #888; font-size: 20px;" onclick="this.closest('.ai-error-panel').remove()">×</span>
      </div>
      <div style="color: #ccc;">
        <p><strong>Summary:</strong> ${explanation.summary}</p>
        <p><strong>Cause:</strong> ${explanation.cause}</p>
        <p><strong>Fix:</strong> ${explanation.fix}</p>
        ${explanation.example ? `<p><strong>Example:</strong><pre style="background: #1e1e1e; padding: 10px; border-radius: 4px; overflow-x: auto;">${explanation.example}</pre></p>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function showCodeReviewPanel(review: CodeReviewResult, editor: any): void {
  const scoreColor = review.score >= 8 ? '#28a745' : review.score >= 5 ? '#ffc107' : '#dc3545';
  
  const panel = document.createElement('div');
  panel.className = 'ai-review-panel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2d2d2d;
      border: 1px solid #007acc;
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #007acc;">📋 Code Review</h3>
        <span style="cursor: pointer; color: #888; font-size: 20px;" onclick="this.closest('.ai-review-panel').remove()">×</span>
      </div>
      
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; color: ${scoreColor}; font-weight: bold;">${review.score}/10</div>
        <div style="color: #888;">Code Quality Score</div>
      </div>
      
      <div style="color: #ccc;">
        <p><strong>Summary:</strong> ${review.summary}</p>
        
        ${review.issues.length > 0 ? `
          <h4 style="color: #ffc107;">⚠️ Issues Found (${review.issues.length})</h4>
          <ul style="padding-left: 20px;">
            ${review.issues.map(i => `
              <li style="margin: 8px 0; color: ${i.severity === 'error' ? '#dc3545' : i.severity === 'warning' ? '#ffc107' : '#17a2b8'};">
                ${i.line ? `Line ${i.line}: ` : ''}${i.message}
                ${i.suggestion ? `<br><em style="color: #888;">💡 ${i.suggestion}</em>` : ''}
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #28a745;">✅ No issues found!</p>'}
        
        ${review.improvements.length > 0 ? `
          <h4 style="color: #17a2b8;">💡 Suggested Improvements</h4>
          <ul style="padding-left: 20px;">
            ${review.improvements.map(i => `<li style="margin: 8px 0;">${i}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function showRefactorPanel(suggestions: RefactorSuggestion[], editor: any): void {
  const panel = document.createElement('div');
  panel.className = 'ai-refactor-panel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2d2d2d;
      border: 1px solid #28a745;
      border-radius: 8px;
      padding: 20px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #28a745;">🔧 Refactoring Suggestions</h3>
        <span style="cursor: pointer; color: #888; font-size: 20px;" onclick="this.closest('.ai-refactor-panel').remove()">×</span>
      </div>
      
      <div style="color: #ccc;">
        ${suggestions.map((s, i) => `
          <div style="margin: 16px 0; padding: 16px; background: #1e1e1e; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #007acc;">${i + 1}. ${s.type.toUpperCase()}</h4>
            <p>${s.description}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
              <div>
                <div style="color: #dc3545; margin-bottom: 4px;">Before:</div>
                <pre style="background: #252525; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${escapeHtml(s.before)}</pre>
              </div>
              <div>
                <div style="color: #28a745; margin-bottom: 4px;">After:</div>
                <pre style="background: #252525; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${escapeHtml(s.after)}</pre>
              </div>
            </div>
            <button onclick="applyRefactoring(${i})" style="
              margin-top: 12px;
              background: #28a745;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            ">Apply This Refactoring</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function showGeneratedCode(code: string, filename: string): void {
  const panel = document.createElement('div');
  panel.className = 'ai-generated-code';
  panel.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2d2d2d;
      border: 1px solid #17a2b8;
      border-radius: 8px;
      padding: 20px;
      width: 80%;
      max-width: 800px;
      max-height: 80vh;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #17a2b8;">🧪 Generated: ${filename}</h3>
        <span style="cursor: pointer; color: #888; font-size: 20px;" onclick="this.closest('.ai-generated-code').remove()">×</span>
      </div>
      
      <pre style="
        background: #1e1e1e;
        padding: 16px;
        border-radius: 6px;
        overflow: auto;
        max-height: 60vh;
        font-size: 13px;
        color: #ccc;
      ">${escapeHtml(code)}</pre>
      
      <div style="margin-top: 16px; display: flex; gap: 12px;">
        <button onclick="navigator.clipboard.writeText(this.closest('.ai-generated-code').querySelector('pre').textContent); this.textContent='Copied!'" style="
          background: #007acc;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">📋 Copy to Clipboard</button>
        <button onclick="createNewFile('${filename}', this.closest('.ai-generated-code').querySelector('pre').textContent)" style="
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">💾 Create File</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// MASTER INITIALIZATION
// ============================================================================

/**
 * Initialize all AI editor features
 */
export function initializeAllAIFeatures(monaco: any, editor: any): void {
  console.log('🚀 Initializing ALL AI Editor Features...');

  // Core features
  initializeAIHover(monaco);
  initializeAICodeActions(monaco);
  
  // Editor actions
  initializeErrorExplainer(monaco, editor);
  initializeCodeReview(monaco, editor);
  initializeTestGenerator(monaco, editor);
  initializeRefactorSuggestions(monaco, editor);
  initializeDocGenerator(monaco, editor);
  
  // Optional: AI autocomplete (can be slow)
  // initializeAIAutocomplete(monaco);

  console.log('🎉 All AI features initialized!');
  console.log('   Shortcuts:');
  console.log('   - Ctrl+Shift+R: Code Review');
  console.log('   - Ctrl+Shift+T: Generate Tests');
  console.log('   - Ctrl+Shift+F: Refactor Suggestions');
  console.log('   - Ctrl+Shift+D: Generate Documentation');
  console.log('   - Right-click for more AI actions');

  // Expose API
  (window as any).aiFeatures = {
    review: (code: string, lang: string) => performCodeReview(code, lang),
    tests: (code: string, lang: string) => generateTests(code, lang),
    refactor: (code: string, lang: string) => getRefactorSuggestions(code, lang),
    docs: (code: string, lang: string) => generateDocumentation(code, lang),
    explain: (error: string, code: string, lang: string) => explainError(error, code, lang)
  };
}

export default {
  initializeAllAIFeatures,
  initializeAIHover,
  initializeAICodeActions,
  initializeErrorExplainer,
  initializeCodeReview,
  initializeTestGenerator,
  initializeRefactorSuggestions,
  initializeDocGenerator,
  initializeAIAutocomplete
};
