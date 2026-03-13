// src/monaco.config.ts
// Monaco Editor Worker Configuration - FIXED VERSION

import * as monaco from 'monaco-editor';

// Import workers directly (Vite will bundle them)
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// @ts-ignore
self.MonacoEnvironment = {
  getWorker: function (_moduleId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

// ============================================================================
// ALTERNATIVE: If worker imports don't work, DISABLE built-in hover for CSS
// ============================================================================

// Option 2: Disable hanging hovers by setting defaults
monaco.languages.css.cssDefaults.setOptions({
  validate: true,
  lint: {
    compatibleVendorPrefixes: 'ignore',
    vendorPrefix: 'warning',
    duplicateProperties: 'warning'
  }
});

// Option 3: If all else fails, disable hover entirely for CSS
// Uncomment this if workers still don't load:
/*
monaco.languages.registerHoverProvider(['css', 'scss', 'less'], {
  provideHover: () => null  // Return null immediately, no "Loading..."
});
*/

console.log('✅ Monaco workers configured');

export {};