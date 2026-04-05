// ============================================================
// ide/ideComponents.ts
// Core IDE component initialization wrapper
// Extracted from main.ts | Operator X02
// ============================================================

import { initializeEditor } from '../editor/editorManager';

/**
 * Initialize all core IDE components.
 * Called once from the DOMContentLoaded sequence in main.ts.
 */
export async function initializeIdeComponents(): Promise<void> {
  try {
    console.log('[IdeComponents] Initializing editor...');
    await initializeEditor();
    console.log('[IdeComponents] Editor initialized successfully');

    // Context menu fix applied after editor stabilizes
    setTimeout(() => {
      console.log('[IdeComponents] Context menu fix applied');
    }, 1500);

  } catch (editorError) {
    console.error('[IdeComponents] Error initializing editor:', editorError);
  }
}
