/**
 * IDE Script Auto-Continue Module
 * ================================
 * Solves the problem where AI reads a file (ide_read_file) but stops
 * without issuing the follow-up ide_patch command.
 * 
 * This module intercepts ide_read_file results and automatically sends
 * them back to the AI as a continuation message, prompting it to
 * proceed with the actual code modifications.
 * 
 * INSTALLATION:
 * 1. Place this file in: src/ide/aiAssistant/ideScriptAutoContinue.ts
 * 2. Import and initialize in main.ts (after IDE Script Bridge init):
 *    
 *    import { initAutoContinue } from './ide/aiAssistant/ideScriptAutoContinue';
 *    // After IDE Script Bridge is initialized:
 *    initAutoContinue();
 * 
 * 3. OR — patch ideScriptBridge.ts directly (see INTEGRATION OPTION B below)
 */

// ============================================================
// Configuration
// ============================================================
interface AutoContinueConfig {
    /** Enable/disable the auto-continue system */
    enabled: boolean;
    /** Max number of continuation rounds per user message (prevents infinite loops) */
    maxRounds: number;
    /** Delay (ms) before sending continuation to let UI settle */
    delayMs: number;
    /** Commands that trigger auto-continuation when their result is available */
    triggerCommands: string[];
    /** Whether to show a visual indicator during continuation */
    showIndicator: boolean;
    /** Max file content length to include (chars). Truncate large files */
    maxContentLength: number;
    /** Log to console */
    debug: boolean;
}

const DEFAULT_CONFIG: AutoContinueConfig = {
    enabled: true,
    maxRounds: 5,          // safety: max 5 read→patch rounds per conversation turn
    delayMs: 800,          // wait for UI to finish rendering
    triggerCommands: [
        'ide_read_file',   // AI read a file → needs to act on it
        'ide_review',      // AI reviewed code → needs to suggest fixes
    ],
    showIndicator: true,
    maxContentLength: 50000,  // ~50KB max per file content injection
    debug: true,
};

// ============================================================
// State
// ============================================================
let config: AutoContinueConfig = { ...DEFAULT_CONFIG };
let roundCount = 0;
let isProcessing = false;
let lastUserMessage = '';
let initialized = false;

// ============================================================
// Logging
// ============================================================
function log(...args: any[]) {
    if (config.debug) {
        console.log('🔄 [AutoContinue]', ...args);
    }
}

function warn(...args: any[]) {
    console.warn('⚠️ [AutoContinue]', ...args);
}

// ============================================================
// Core: Intercept IDE Script Results
// ============================================================

/**
 * Called after an ide_script command completes.
 * If it was a read/review command, sends the result back to the AI.
 */
export function onIdeScriptResult(
    command: string,
    args: Record<string, any>,
    result: { success: boolean; data?: string; error?: string }
) {
    if (!config.enabled || !result.success) {
        if (!result.success) {
            log(`Command ${command} failed:`, result.error);
        }
        return;
    }

    // Check if this command should trigger continuation
    if (!config.triggerCommands.includes(command)) {
        log(`Command ${command} is not a trigger, skipping`);
        return;
    }

    // Safety: prevent infinite loops
    if (roundCount >= config.maxRounds) {
        warn(`Max rounds (${config.maxRounds}) reached, stopping auto-continue`);
        resetRoundCount();
        return;
    }

    // Don't stack continuations
    if (isProcessing) {
        log('Already processing a continuation, skipping');
        return;
    }

    const filePath = args.file_path || args.path || 'unknown';
    const content = result.data || '';

    log(`Trigger: ${command} completed for "${filePath}" (${content.length} chars)`);
    log(`Round ${roundCount + 1}/${config.maxRounds}`);

    // Truncate large files
    let fileContent = content;
    if (fileContent.length > config.maxContentLength) {
        fileContent = fileContent.substring(0, config.maxContentLength) +
            `\n\n... [TRUNCATED: file is ${content.length} chars, showing first ${config.maxContentLength}]`;
        log(`Content truncated from ${content.length} to ${config.maxContentLength} chars`);
    }

    // Build continuation message
    const continuationMessage = buildContinuationMessage(command, filePath, fileContent);

    // Send it back to the AI after a delay
    isProcessing = true;
    roundCount++;

    if (config.showIndicator) {
        showContinuationIndicator(command, filePath, roundCount);
    }

    setTimeout(() => {
        sendContinuation(continuationMessage);
        isProcessing = false;
    }, config.delayMs);
}

// ============================================================
// Message Building
// ============================================================

function buildContinuationMessage(command: string, filePath: string, content: string): string {
    if (command === 'ide_read_file') {
        return [
            `[IDE Script Result] Successfully read file: ${filePath}`,
            '',
            '```',
            content,
            '```',
            '',
            'The file has been read successfully. Now please proceed with the modifications you planned.',
            'Use ide_patch, ide_insert, or ide_create_file to apply your changes.',
            'Do NOT read the file again — use the content above.',
        ].join('\n');
    }

    if (command === 'ide_review') {
        return [
            `[IDE Script Result] Review completed for: ${filePath}`,
            '',
            content,
            '',
            'Based on this review, please apply the necessary fixes using ide_patch or ide_insert.',
        ].join('\n');
    }

    // Generic fallback
    return [
        `[IDE Script Result] Command "${command}" completed for: ${filePath}`,
        '',
        content,
        '',
        'Please continue with your planned modifications.',
    ].join('\n');
}

// ============================================================
// Send Continuation to AI
// ============================================================

function sendContinuation(message: string) {
    log('Sending continuation message to AI...');

    // Strategy 1: Use the existing sendMessageDirectly if available
    const sendDirectly = (window as any).sendMessageDirectly;
    if (typeof sendDirectly === 'function') {
        log('Using window.sendMessageDirectly');
        sendDirectly(message, { isAutoContinue: true, silent: true });
        return;
    }

    // Strategy 2: Use handleEnhancedSendMessage
    const handleEnhanced = (window as any).handleEnhancedSendMessage;
    if (typeof handleEnhanced === 'function') {
        log('Using window.handleEnhancedSendMessage');
        handleEnhanced(message, { isAutoContinue: true });
        return;
    }

    // Strategy 3: Inject into the input field and trigger send
    const input = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-button') ||
                    document.querySelector('.send-button') ||
                    document.querySelector('[data-action="send"]');

    if (input && sendBtn) {
        log('Using input field injection');
        
        // Store original value
        const originalValue = input.value;
        
        // Set the continuation message
        input.value = message;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Small delay then click send
        setTimeout(() => {
            (sendBtn as HTMLElement).click();
            log('Continuation sent via button click');
        }, 100);
        return;
    }

    // Strategy 4: Direct API call (most reliable but bypasses UI)
    log('Falling back to direct conversation injection');
    injectAsConversationContext(message);
}

/**
 * Injects the read result directly into the conversation history
 * so the next AI call has it as context, then triggers a re-send.
 */
function injectAsConversationContext(message: string) {
    try {
        // Access conversation manager
        const convManager = (window as any).conversationManager;
        if (!convManager) {
            warn('No conversationManager found, cannot inject context');
            return;
        }

        // Add as a "system" or "user" message to current conversation
        convManager.addMessage({
            role: 'user',
            content: message,
            metadata: {
                isAutoContinue: true,
                timestamp: Date.now(),
            }
        });

        log('Injected continuation into conversation context');

        // Now re-trigger the AI to respond
        const event = new CustomEvent('auto-continue-request', {
            detail: { message, roundCount }
        });
        window.dispatchEvent(event);

    } catch (err) {
        warn('Failed to inject context:', err);
    }
}

// ============================================================
// UI Indicator
// ============================================================

function showContinuationIndicator(command: string, filePath: string, round: number) {
    // Add a subtle indicator in the chat
    const chatContainer = document.querySelector('.ai-chat-container') ||
                          document.querySelector('.chat-messages');
    
    if (!chatContainer) return;

    const indicator = document.createElement('div');
    indicator.className = 'auto-continue-indicator';
    indicator.innerHTML = `
        <div style="
            display: flex; align-items: center; gap: 8px;
            padding: 8px 16px; margin: 4px 0;
            background: rgba(59, 130, 246, 0.1);
            border-left: 3px solid #3b82f6;
            border-radius: 0 6px 6px 0;
            font-size: 12px; color: #93a3b8;
            animation: acPulse 1.5s ease-in-out infinite;
        ">
            <span style="animation: acSpin 1s linear infinite; display: inline-block;">⟳</span>
            <span>Auto-continuing: sending <strong>${command}</strong> result for 
            <strong>${filePath.split(/[/\\]/).pop()}</strong> back to AI 
            (round ${round}/${config.maxRounds})</span>
        </div>
    `;

    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Remove after the AI responds
    setTimeout(() => {
        indicator.style.transition = 'opacity 0.5s';
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
    }, 5000);
}

// Inject animation styles
function injectStyles() {
    if (document.getElementById('auto-continue-styles')) return;

    const style = document.createElement('style');
    style.id = 'auto-continue-styles';
    style.textContent = `
        @keyframes acPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }
        @keyframes acSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .auto-continue-indicator {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// Event Listeners & Hooks
// ============================================================

/**
 * Hook into the existing IDE Script Bridge by listening for its events
 */
function setupEventListeners() {
    // Listen for ide-script-completed events (if your bridge dispatches them)
    window.addEventListener('ide-script-completed', ((event: CustomEvent) => {
        const { command, args, result } = event.detail || {};
        if (command && result) {
            onIdeScriptResult(command, args || {}, result);
        }
    }) as EventListener);

    // Listen for ai-response-received to reset round counter
    window.addEventListener('ai-response-received', () => {
        // Only reset if AI responded with actual content (not just a read)
        // The round count resets when a NEW user message is sent
    });

    // Reset rounds when user sends a NEW message
    window.addEventListener('user-message-sent', ((event: CustomEvent) => {
        const msg = event.detail?.message || '';
        if (msg !== lastUserMessage && !(event.detail?.isAutoContinue)) {
            resetRoundCount();
            lastUserMessage = msg;
        }
    }) as EventListener);

    // Also listen on the input to detect new user messages
    const input = document.getElementById('ai-assistant-input');
    if (input) {
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // User is sending a new message, reset rounds
                resetRoundCount();
            }
        });
    }

    log('Event listeners registered');
}

/**
 * Monkey-patch the IDE Script Bridge's execute function to capture results.
 * This is the most reliable integration method.
 */
function patchIdeScriptBridge() {
    // Try to find the bridge
    const bridge = (window as any).ideScriptBridge ||
                   (window as any).sb ||
                   (window as any).surgicalBridge;

    if (!bridge) {
        log('IDE Script Bridge not found yet, will retry...');
        setTimeout(patchIdeScriptBridge, 2000);
        return;
    }

    // Look for the execute function
    const originalExecute = bridge.execute || bridge.executeCommand || bridge.run;
    if (!originalExecute) {
        log('No execute function found on bridge, trying alternate approach');
        patchViaDispatch();
        return;
    }

    // Wrap it
    const wrappedExecute = async function (...fnArgs: any[]) {
        const result = await originalExecute.apply(bridge, fnArgs);

        // Extract command info from args
        const command = fnArgs[0]?.command || fnArgs[0] || '';
        const args = fnArgs[0]?.args || fnArgs[1] || {};

        // Trigger auto-continue if applicable
        if (result && typeof result === 'object') {
            onIdeScriptResult(command, args, {
                success: !result.error,
                data: result.data || result.content || result.output || '',
                error: result.error || '',
            });
        }

        return result;
    };

    // Apply patch
    if (bridge.execute) bridge.execute = wrappedExecute;
    if (bridge.executeCommand) bridge.executeCommand = wrappedExecute;
    if (bridge.run) bridge.run = wrappedExecute;

    log('✅ Patched IDE Script Bridge execute function');
}

/**
 * Alternative: Listen for DOM changes in the chat to detect ide_script results
 */
function patchViaDispatch() {
    log('Using DOM observation fallback for ide_script results');

    // Watch for new messages in chat that contain ide_script results
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node instanceof HTMLElement) {
                    checkForIdeScriptResult(node);
                }
            }
        }
    });

    const chatContainer = document.querySelector('.ai-chat-container') ||
                          document.querySelector('.chat-messages') ||
                          document.body;

    observer.observe(chatContainer, { childList: true, subtree: true });
    log('DOM observer attached for ide_script result detection');
}

function checkForIdeScriptResult(element: HTMLElement) {
    const text = element.textContent || '';

    // Look for patterns like "[IDE Script] ide_read_file completed"
    const readMatch = text.match(/\[IDE Script\]\s*(ide_read_file|ide_review)\s*(completed|success)/i);
    if (readMatch) {
        const command = readMatch[1];
        log(`Detected ${command} completion in DOM`);

        // Try to extract the file content from the result
        // The ideScriptBridge logs usually show the path
        const pathMatch = text.match(/Path resolved:.*?->\s*(.+?)(?:\n|$)/);
        const filePath = pathMatch ? pathMatch[1].trim() : 'unknown';

        // Read the file content ourselves since the DOM might not have it
        readFileForContinuation(command, filePath);
    }
}

async function readFileForContinuation(command: string, filePath: string) {
    try {
        const fs = (window as any).fileSystem;
        if (!fs || !fs.readFile) {
            warn('fileSystem.readFile not available');
            return;
        }

        const content = await fs.readFile(filePath);
        if (content) {
            onIdeScriptResult(command, { file_path: filePath }, {
                success: true,
                data: content,
            });
        }
    } catch (err) {
        warn('Failed to read file for continuation:', err);
    }
}

// ============================================================
// Public API
// ============================================================

export function resetRoundCount() {
    roundCount = 0;
    log('Round count reset');
}

export function setEnabled(enabled: boolean) {
    config.enabled = enabled;
    log(`Auto-continue ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

export function setConfig(overrides: Partial<AutoContinueConfig>) {
    config = { ...config, ...overrides };
    log('Config updated:', config);
}

export function getStatus() {
    return {
        enabled: config.enabled,
        roundCount,
        maxRounds: config.maxRounds,
        isProcessing,
        initialized,
    };
}

// ============================================================
// Initialization
// ============================================================

export function initAutoContinue(overrides?: Partial<AutoContinueConfig>) {
    if (initialized) {
        log('Already initialized, skipping');
        return;
    }

    if (overrides) {
        config = { ...config, ...overrides };
    }

    log('Initializing...');
    injectStyles();
    setupEventListeners();

    // Patch the bridge (with retry)
    setTimeout(() => patchIdeScriptBridge(), 1000);

    // Expose to window for debugging
    (window as any).autoContinue = {
        setEnabled,
        setConfig,
        getStatus,
        resetRoundCount,
        onIdeScriptResult,  // manual trigger for testing
        config,
    };

    initialized = true;

    console.log('🔄 [AutoContinue] ✅ Ready!');
    console.log('   Auto-sends ide_read_file results back to AI');
    console.log(`   Max rounds: ${config.maxRounds} | Delay: ${config.delayMs}ms`);
    console.log('   Debug: window.autoContinue.getStatus()');
    console.log('   Toggle: window.autoContinue.setEnabled(true/false)');
}

// ============================================================
// INTEGRATION OPTION B: Patch for ideScriptBridge.ts
// ============================================================
/*
 * If you prefer to patch ideScriptBridge.ts directly instead of
 * using this as a separate module, add this code after each
 * ide_read_file execution:
 *
 * // In ideScriptBridge.ts, after ide_read_file completes:
 * case 'ide_read_file': {
 *     const content = await window.fileSystem.readFile(resolvedPath);
 *     if (content) {
 *         resultOutput = content;
 *         
 *         // >>> ADD THIS: Auto-continue <<<
 *         if (window.autoContinue?.config?.enabled !== false) {
 *             window.dispatchEvent(new CustomEvent('ide-script-completed', {
 *                 detail: {
 *                     command: 'ide_read_file',
 *                     args: { file_path: resolvedPath },
 *                     result: { success: true, data: content }
 *                 }
 *             }));
 *         }
 *     }
 *     break;
 * }
 */

export default { initAutoContinue, onIdeScriptResult, setEnabled, getStatus };
