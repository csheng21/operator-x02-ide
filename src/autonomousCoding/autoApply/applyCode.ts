// ============================================================================
// Apply Code to Editor
// ============================================================================
import type { ApplyResult, ApplyMode } from './types';

/**
 * Apply code to the currently active Monaco editor
 */
export function applyCodeToEditor(
  code: string,
  mode: ApplyMode = 'replace'
): ApplyResult {
  try {
    const monaco = (window as any).monaco;
    if (!monaco?.editor) {
      return { success: false, message: 'Monaco editor not available' };
    }

    const editors = monaco.editor.getEditors();
    if (!editors?.length) {
      return { success: false, message: 'No active editor found' };
    }

    const editor = editors[0];
    const model = editor.getModel();
    if (!model) {
      return { success: false, message: 'No editor model found' };
    }

    if (mode === 'replace') {
      const fullRange = model.getFullModelRange();
      editor.executeEdits('autoApply', [{
        range: fullRange,
        text: code,
        forceMoveMarkers: true
      }]);
    } else if (mode === 'insert') {
      const position = editor.getPosition();
      if (position) {
        editor.executeEdits('autoApply', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: code,
          forceMoveMarkers: true
        }]);
      }
    } else if (mode === 'append') {
      const lastLine = model.getLineCount();
      const lastCol = model.getLineMaxColumn(lastLine);
      editor.executeEdits('autoApply', [{
        range: {
          startLineNumber: lastLine,
          startColumn: lastCol,
          endLineNumber: lastLine,
          endColumn: lastCol
        },
        text: '\n' + code,
        forceMoveMarkers: true
      }]);
    }

    return { success: true, message: `Code ${mode}d successfully` };
  } catch (err: any) {
    console.error('[AutoApply] Error:', err);
    return { success: false, message: err.message || 'Unknown error' };
  }
}
