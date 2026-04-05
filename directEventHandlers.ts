// ============================================================
// ide/directEventHandlers.ts
// Direct DOM event handlers (send button, settings button)
// Extracted from main.ts | Operator X02
// ============================================================

/**
 * Wire up the send button with plugin source code detection.
 * If plugin code (exports.manifest + exports.activate) is open
 * in Monaco, it injects a plugin development context into the prompt.
 */
export function setupDirectEventHandlers(): void {
  console.log('[EventHandlers] Setting up direct event handlers');

  // ── Send Button ─────────────────────────────────────────
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
      const aiInput   = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
      const actualInput = userInput || aiInput;

      if (!actualInput) {
        console.error('[EventHandlers] No input element found!');
        return;
      }

      const originalMessage = actualInput.value.trim();
      if (!originalMessage) return;

      // Check if plugin code is open in editor
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const model = editor.getModel();
        if (model) {
          const code = model.getValue();

          const isPluginCode = (src: string) =>
            src &&
            (src.includes('exports.manifest') || src.includes('export const manifest')) &&
            (src.includes('exports.activate') || src.includes('export function activate'));

          if (isPluginCode(code)) {
            console.log('[EventHandlers][Plugin] Plugin code detected - injecting context');

            const pluginContext = `[SYSTEM CONTEXT - Plugin Development Mode]
This is plugin source code for the AI IDE Plugin System.

Plugin Structure:
- exports.manifest = { id, name, version, description, author }
- exports.activate = function(context) { ... }
- exports.deactivate = function() { ... } (optional)

Available APIs in context parameter:
- editorApi: getActiveDocument(), insertText(), getSelectedText(), onDocumentChange()
- uiApi: showMessage(), showPanel(), updateStatusBar()
- fileSystemApi: readFile(), writeFile(), getCurrentPath()
- terminalApi: executeCommand()
- createdElements: [] (track UI elements for cleanup)

Best Practices:
- Always track created DOM elements in context.createdElements
- Add data-plugin="\${your-plugin-id}" to all created elements
- Implement deactivate() to clean up resources
- Use context.subscriptions for event listeners

Current plugin code in editor:
\`\`\`javascript
${code}
\`\`\`

The user is developing this plugin. Help them with code improvements, bug fixes, and feature additions.
[END SYSTEM CONTEXT]

User question: ${originalMessage}`;

            actualInput.value = pluginContext;

            setTimeout(() => {
              import('../conversation').then(m => m.sendMessage()).catch(err => {
                console.error('[EventHandlers] Failed to import conversation:', err);
              });
            }, 150);
            return;
          }
        }
      }

      // Normal send
      import('../conversation').then(m => m.sendMessage()).catch(err => {
        console.error('[EventHandlers] Failed to import conversation:', err);
      });
    });
  }

  // ── Settings Button ─────────────────────────────────────
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.style.display = 'block';
    });
  }

  console.log('[EventHandlers] Direct event handlers ready');
}

/**
 * Debug helper - logs all input elements to console.
 */
export function debugInputElements(): void {
  console.group('[EventHandlers] Input Element Debug');
  const userInput = document.getElementById('user-input');
  const aiInput   = document.getElementById('ai-assistant-input');
  console.log('user-input:', userInput);
  console.log('ai-assistant-input:', aiInput);
  if (userInput) console.log('user-input value:', (userInput as HTMLTextAreaElement).value);
  if (aiInput)   console.log('ai-assistant-input value:', (aiInput as HTMLTextAreaElement).value);
  console.groupEnd();
}
