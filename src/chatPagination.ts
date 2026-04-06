// chatPagination.ts — Clean Chat Pagination for IDE
// ====================================================================
//
// Shows only the last 5 messages in the chat. Everything older is hidden
// behind a "Show earlier" button. CEM bars count as messages too.
//
// KEY: Injects a CSS-only pre-hide rule IMMEDIATELY so there's no flash
// of all messages on IDE reset. JS pagination takes over afterwards.
//
// FIX v5: Speed improvements over v4:
// 1. renderCoordActive flag: BLOCKS all pagination while RenderCoord
//    is bulk-rendering (prevents 40+ cascade paginate calls → 1 call)
// 2. Faster timers: debounce 100ms, initial 800ms, stability 1200ms
// 3. Smart RenderCoord detection: listens for "Rendering X messages"
//    start AND "Rendered X messages" end — paginates exactly once
// 4. MutationObserver, events, paginate() all skip when blocked
// 5. Infinite scroll upward + PageUp keyboard shortcut
// 6. Scroll position preservation on load-more
//
// FIX v8: TRUE DEFERRED RENDERING (Option B)
// After RenderCoord renders 8 messages and unlocks input, the old loader
// adds 32+ messages one-by-one. Previously each triggered MarkdownProcessor,
// AI History saves, and pagination — massive DOM thrashing.
//
// Now: MutationObserver INTERCEPTS those messages during backgroundLoadMode,
// REMOVES them from DOM before other observers process them, and stores
// them in a deferredElements array. When user clicks "Show earlier" or
// scrolls up, messages are re-added to DOM in batches (lazy rendering).
//
// Result: 0 messages processed during background load. Each batch is
// processed only on-demand when user wants to see earlier history.
//
// USAGE: import './chatPagination';
// ====================================================================

// ── INSTANT CSS PRE-HIDE (runs synchronously on import) ──────────────
// FIX v4: Use opacity:0 on the ENTIRE container instead of nth-last-child.
// nth-last-child recalculates on every DOM mutation → causes ripple flicker.
// opacity:0 hides everything during rendering, then we reveal atomically
// after JS pagination applies display:none.
// Safety timeout ensures container is ALWAYS revealed even if pagination fails.
const __preHideStyle = document.createElement('style');
__preHideStyle.id = 'chat-pagination-prehide';
__preHideStyle.textContent = `
  .ai-chat-container {
    opacity: 0 !important;
    transition: none !important;
  }
  #chat-search-btn {
    display: none !important;
  }
  /* Loading animation */
  @keyframes chat-loading-pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  .chat-loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    pointer-events: none;
    background: var(--bg-primary, #1e1e1e);
  }
  .chat-loading-dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .chat-loading-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ec9b0;
    animation: chat-loading-pulse 1.2s ease-in-out infinite;
  }
  .chat-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
  .chat-loading-dots span:nth-child(3) { animation-delay: 0.3s; }
  .chat-loading-label {
    margin-top: 10px;
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    letter-spacing: 0.5px;
  }

`;
document.head.appendChild(__preHideStyle);

// ── PERMANENT input-lock styles (separate tag — NEVER removed by removePreHide) ──
const __inputLockStyle = document.createElement('style');
__inputLockStyle.id = 'chat-input-lock-styles';
__inputLockStyle.textContent = `
  @keyframes inputLockPulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  @keyframes inputLockFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  #ai-assistant-input[data-locked="true"] {
    pointer-events: none !important;
    opacity: 0.25 !important;
    cursor: not-allowed !important;
  }
  #send-btn[data-locked="true"] {
    pointer-events: none !important;
    opacity: 0.15 !important;
    cursor: not-allowed !important;
  }
`;
document.head.appendChild(__inputLockStyle);

// Inject loading overlay as a FIXED element (not inside container which has opacity:0)
function __showChatLoading() {
  if (document.getElementById('chat-loading-overlay')) return;
  // Don't show if app-loader is still covering the screen
  if (document.getElementById('app-loader')) return;
  
  const container = document.querySelector('.ai-chat-container');
  const overlay = document.createElement('div');
  overlay.id = 'chat-loading-overlay';
  overlay.className = 'chat-loading-overlay';
  // Position over the chat container area if it exists, otherwise center-right
  if (container) {
    const rect = container.getBoundingClientRect();
    overlay.style.position = 'fixed';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  } else {
    // Fallback: position in the right panel area
    overlay.style.position = 'fixed';
    overlay.style.top = '50px';
    overlay.style.right = '0';
    overlay.style.width = '450px';
    overlay.style.bottom = '0';
  }
  overlay.innerHTML = `
    <div class="chat-loading-dots">
      <span></span><span></span><span></span>
    </div>
    <div class="chat-loading-label">Loading messages...</div>
  `;
  document.body.appendChild(overlay);
}

// ── Input Lock: Prevent user from typing while messages load ──────────
// SIMPLE APPROACH: data-locked attribute + loading bar inserted above input.
// No overlay positioning or parent class guessing needed.
let __inputLocked = false;
let __lockPollTimer: ReturnType<typeof setInterval> | null = null;
let __loadingBarShownAt = 0; // Track when bar was shown for minimum display time

function __lockChatInput(): void {
  if (__inputLocked) return;
  __inputLocked = true;
  if (typeof window !== 'undefined') (window as any).__chatInputLocked = true;
  console.log('🔒 [InputLock] LOCK called');

  __applyLockToDOM();

  // Poll every 500ms to re-apply lock (input might be created/cloned later)
  if (!__lockPollTimer) {
    __lockPollTimer = setInterval(() => {
      if (!__inputLocked) {
        if (__lockPollTimer) { clearInterval(__lockPollTimer); __lockPollTimer = null; }
        return;
      }
      __applyLockToDOM();
    }, 500);
  }
}

function __applyLockToDOM(): void {
  const input = document.getElementById('ai-assistant-input') as HTMLElement | null;
  const sendBtn = document.getElementById('send-btn') as HTMLElement | null;

  if (input) {
    input.setAttribute('data-locked', 'true');
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.disabled = true;
      if (!input.dataset.prevPlaceholder) {
        input.dataset.prevPlaceholder = input.placeholder;
      }
      input.placeholder = '⏳ Loading conversation...';
    }
  }
  if (sendBtn) {
    sendBtn.setAttribute('data-locked', 'true');
    if (sendBtn instanceof HTMLButtonElement) {
      sendBtn.disabled = true;
    }
  }

  // ── Create loading bar with ALL INLINE STYLES (no CSS class dependency!) ──
  // Appended to document.body as position:fixed — guaranteed visible.
  // z-index: 1000001 — ABOVE app-loader (999999) so user sees it during boot too.
  if (!document.getElementById('chat-input-loading-bar')) {
    const bar = document.createElement('div');
    bar.id = 'chat-input-loading-bar';

    // ALL styles inline — survives removePreHide() destroying class-based CSS
    bar.style.cssText = `
      position: fixed;
      bottom: 55px;
      right: 0;
      width: 450px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px 0;
      background: rgba(25, 25, 30, 0.97);
      border-top: 1px solid rgba(78, 201, 176, 0.25);
      border-bottom: 1px solid rgba(78, 201, 176, 0.1);
      z-index: 1000001;
      user-select: none;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: inputLockFadeIn 0.3s ease;
      box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
    `;

    // Dots with inline animation
    const dotsHtml = [0, 1, 2].map(i => {
      const delay = i * 0.15;
      return `<span style="
        display:inline-block; width:9px; height:9px; border-radius:50%;
        background:#4ec9b0;
        animation: inputLockPulse 1.2s ease-in-out ${delay}s infinite;
      "></span>`;
    }).join('');

    bar.innerHTML = `
      <div style="display:flex; gap:7px; align-items:center;">${dotsHtml}</div>
      <span style="font-size:13px; color:rgba(255,255,255,0.5); letter-spacing:0.5px;">
        Loading conversation...
      </span>
    `;

    // Position to match assistant panel if it exists
    __repositionLoadingBar(bar, input);

    document.body.appendChild(bar);
    __loadingBarShownAt = Date.now();
    console.log('🔒 [InputLock] Loading bar INSERTED (fixed to body, z:1000001 — above app-loader)');
  } else {
    // Bar exists — reposition to track panel/input
    const bar = document.getElementById('chat-input-loading-bar')!;
    __repositionLoadingBar(bar, input);
  }
}

// Reposition the fixed loading bar to match current panel/input position
function __repositionLoadingBar(bar?: HTMLElement | null, inputEl?: HTMLElement | null): void {
  if (!bar) bar = document.getElementById('chat-input-loading-bar');
  if (!bar) return;
  if (!inputEl) inputEl = document.getElementById('ai-assistant-input');
  const panel = document.querySelector('.assistant-panel') as HTMLElement;
  if (panel) {
    const pr = panel.getBoundingClientRect();
    if (pr.width > 0) {
      bar.style.right = (window.innerWidth - pr.right) + 'px';
      bar.style.width = pr.width + 'px';
    }
  }
  if (inputEl) {
    const ir = inputEl.getBoundingClientRect();
    if (ir.top > 0 && ir.height > 0) {
      bar.style.bottom = (window.innerHeight - ir.top + 2) + 'px';
    }
  }
}

function __unlockChatInput(): void {
  if (!__inputLocked) return;
  __inputLocked = false;
  if (typeof window !== 'undefined') (window as any).__chatInputLocked = false;
  console.log('🔓 [InputLock] UNLOCK called');

  // Stop polling
  if (__lockPollTimer) { clearInterval(__lockPollTimer); __lockPollTimer = null; }

  const input = document.getElementById('ai-assistant-input') as HTMLElement | null;
  const sendBtn = document.getElementById('send-btn') as HTMLElement | null;

  if (input) {
    input.removeAttribute('data-locked');
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.disabled = false;
      if (input.dataset.prevPlaceholder) {
        input.placeholder = input.dataset.prevPlaceholder;
        delete input.dataset.prevPlaceholder;
      }
    }
    // Reset any inline styles that might have been applied
    input.style.opacity = '';
    input.style.pointerEvents = '';
    // Auto-focus
    setTimeout(() => (input as HTMLElement).focus(), 80);
  }
  if (sendBtn) {
    sendBtn.removeAttribute('data-locked');
    if (sendBtn instanceof HTMLButtonElement) {
      sendBtn.disabled = false;
    }
    sendBtn.style.opacity = '';
    sendBtn.style.pointerEvents = '';
  }

  // Remove loading bar — enforce minimum 1.5s display so user actually sees it
  const __removeBar = () => {
    const bar = document.getElementById('chat-input-loading-bar');
    if (bar) {
      bar.style.opacity = '0';
      bar.style.transition = 'opacity 0.25s ease';
      setTimeout(() => bar.remove(), 300);
      console.log('🔓 [InputLock] Loading bar REMOVED');
    }
  };

  const elapsed = Date.now() - __loadingBarShownAt;
  const MIN_DISPLAY_MS = 800; // v7: Reduced from 3000ms
  if (elapsed >= MIN_DISPLAY_MS || __loadingBarShownAt === 0) {
    __removeBar();
  } else {
    const remaining = MIN_DISPLAY_MS - elapsed;
    console.log(`🔓 [InputLock] Bar shown ${elapsed}ms ago, waiting ${remaining}ms more`);
    setTimeout(__removeBar, remaining);
  }
}

// Lock input on initial boot (while pre-hide is active)
// The poll timer inside __lockChatInput will re-apply once input element appears.
__lockChatInput();
console.log('🔒 [InputLock] Initial boot lock applied');

// Don't show immediately — app-loader (z-index:999999) covers everything during boot.
// Instead, poll until app-loader is gone, THEN show if pre-hide is still active.
// During boot: update app-loader text as a progress indicator.
const __loadingRetry = setInterval(() => {
  // Stop if pre-hide already removed (pagination done)
  if (!document.getElementById('chat-pagination-prehide')) {
    clearInterval(__loadingRetry);
    const lo = document.getElementById('chat-loading-overlay');
    if (lo) lo.remove();
    return;
  }
  // During boot: if app-loader exists, update its text to show chat loading progress
  const appLoader = document.getElementById('app-loader');
  if (appLoader) {
    const loaderText = document.getElementById('loader-text');
    if (loaderText && !loaderText.dataset.chatPhase) {
      loaderText.dataset.chatPhase = 'true';
      loaderText.textContent = 'Loading messages...';
    }
    return; // Don't show our overlay yet — app-loader covers it
  }
  // App-loader gone: show our overlay if not already showing
  if (!document.getElementById('chat-loading-overlay')) {
    __showChatLoading();
    clearInterval(__loadingRetry);
  }
}, 200);
setTimeout(() => clearInterval(__loadingRetry), 10000);

// Safety: ALWAYS reveal after 10s no matter what (v7: reduced — first paginate should unlock much earlier)
setTimeout(() => {
  const ph = document.getElementById('chat-pagination-prehide');
  if (ph) {
    ph.remove();
    console.log('📄 [ChatPage] Safety timeout: force-removed pre-hide after 10s');
  }
  const lo = document.getElementById('chat-loading-overlay');
  if (lo) lo.remove();
  // v5: Force unlock input regardless of any flags
  if (__lockPollTimer) { clearInterval(__lockPollTimer); __lockPollTimer = null; }
  __inputLocked = true; // Ensure unlock doesn't skip
  // v6: Clear settling state
  if (typeof window !== 'undefined') {
    // postRenderSettling is in IIFE scope, but we force unlock anyway
  }
  __unlockChatInput();
  // Set window flag so IIFE code knows safety fired
  if (typeof window !== 'undefined') (window as any).__chatSafetyFired = true;
  console.log('🔓 [InputLock] Safety timeout: force unlocked at 10s');
}, 10000);
// ──────────────────────────────────────────────────────────────────────

(function initChatPagination() {
  const TAG = '📄 [ChatPage]';
  const PAGE_SIZE = 5;       // Number of conversation messages to show per page
  const LOAD_MORE_BATCH = 10; // v5: Reveal more per click
  const SCROLL_TRIGGER_PX = 60;  // v5: Auto-load when within this many px of top
  const SCROLL_COOLDOWN_MS = 400;
  let hiddenMessages: HTMLElement[] = [];
  let loadMoreBar: HTMLElement | null = null;
  let isProcessing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollLoadCooldown = false;
  let infiniteScrollAttached = false;

  // v5: Block pagination while RenderCoord is actively rendering messages.
  // Without this, each of 83 messages triggers MutationObserver → paginate(),
  // causing 40+ individual paginate() calls instead of 1 clean pass.
  let renderCoordActive = false;
  let renderCoordSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  
  // v5: Track full conversation load lifecycle (from loadConversationToUI start to RenderCoord end).
  // Prevents early removePreHide() from unlocking input before messages finish rendering.
  let conversationLoadInProgress = true; // Start true — boot always loads a conversation

  // ── Classify a message element ─────────────────────────────────────
  type MsgType = 'user' | 'assistant' | 'cem' | 'system' | 'unknown';

  function classifyElement(el: HTMLElement): MsgType {
    const cls = el.className || '';

    // CEM compact edit messages — never counted, always shown
    if (cls.includes('ai-edit-message') || el.querySelector('.cem-row')) {
      return 'cem';
    }

    // Regular system messages (non-CEM)
    if (cls.includes('system-message') && !cls.includes('ai-edit-message')) {
      return 'system';
    }

    // User messages
    if (cls.includes('user-message') || cls.includes('user')) {
      if (cls.includes('assistant')) return 'assistant';
      return 'user';
    }

    // Assistant messages
    if (cls.includes('assistant-message') || cls.includes('assistant')) {
      return 'assistant';
    }

    return 'unknown';
  }

  // ── Check if element is a "conversation" message (counts toward limit) ─
  function isConversationMsg(type: MsgType): boolean {
    return type === 'user' || type === 'assistant';
  }

  // ── Collapse consecutive CEM-only runs into a summary ─────────────
  const CEM_COLLAPSE_THRESHOLD = 3; // Collapse runs of 3+ consecutive CEM bars

  function collapseCEMRuns(
    container: HTMLElement,
    classified: Array<{ el: HTMLElement; type: MsgType }>
  ): void {
    // Remove any existing CEM collapse bars
    container.querySelectorAll('.cem-collapse-bar').forEach(el => el.remove());

    // Find consecutive CEM runs
    let runStart = -1;
    const runs: Array<{ start: number; end: number }> = [];

    for (let i = 0; i <= classified.length; i++) {
      const isCem = i < classified.length && classified[i].type === 'cem';
      if (isCem && runStart === -1) {
        runStart = i;
      } else if (!isCem && runStart !== -1) {
        const runLength = i - runStart;
        if (runLength >= CEM_COLLAPSE_THRESHOLD) {
          runs.push({ start: runStart, end: i - 1 });
        }
        runStart = -1;
      }
    }

    // Collapse each long run — keep first and last visible, hide middle
    for (const run of runs) {
      const runLength = run.end - run.start + 1;
      const hiddenInRun: HTMLElement[] = [];

      // Hide middle elements (keep first and last)
      for (let i = run.start + 1; i < run.end; i++) {
        classified[i].el.style.display = 'none';
        hiddenInRun.push(classified[i].el);
      }

      if (hiddenInRun.length === 0) continue;

      // Count statuses
      let sentCount = 0, rejectedCount = 0, errorCount = 0;
      for (let i = run.start; i <= run.end; i++) {
        const text = classified[i].el.textContent?.toLowerCase() || '';
        if (text.includes('rejected') || text.includes('error')) {
          if (text.includes('error')) errorCount++;
          else rejectedCount++;
        } else {
          sentCount++;
        }
      }

      // Create compact summary bar
      const summary = document.createElement('div');
      summary.className = 'cem-collapse-bar';
      summary.setAttribute('data-chat-pagination', 'true');

      const parts: string[] = [];
      if (sentCount > 0) parts.push(`✅ ${sentCount} sent`);
      if (rejectedCount > 0) parts.push(`❌ ${rejectedCount} rejected`);
      if (errorCount > 0) parts.push(`⚠️ ${errorCount} errors`);

      summary.innerHTML = `
        <button class="cem-collapse-toggle" title="Click to expand ${runLength} edit operations">
          <span class="cem-collapse-text">${parts.join(' · ')} (${runLength} operations)</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      `;

      let expanded = false;
      summary.querySelector('.cem-collapse-toggle')?.addEventListener('click', () => {
        expanded = !expanded;
        hiddenInRun.forEach(el => {
          el.style.display = expanded ? '' : 'none';
        });
        const textEl = summary.querySelector('.cem-collapse-text');
        if (textEl) {
          textEl.textContent = expanded 
            ? `▾ Collapse ${runLength} operations`
            : `${parts.join(' · ')} (${runLength} operations)`;
        }
      });

      // "Clear all" button for the collapsed run
      const clearAllBtn = document.createElement('button');
      clearAllBtn.className = 'cem-clear-all-btn';
      clearAllBtn.title = `Remove all ${runLength} edit notifications`;
      clearAllBtn.textContent = '✕ Clear';
      clearAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        for (let i = run.start; i <= run.end; i++) {
          classified[i].el.remove();
        }
        summary.remove();
      });
      summary.querySelector('.cem-collapse-toggle')?.after(clearAllBtn);

      // Insert after the first CEM in the run
      classified[run.start].el.after(summary);
    }
  }

  // ── Inject delete (×) button onto individual CEM bars ──────────────
  function injectCEMDeleteButtons(container: HTMLElement): void {
    const cemEls = container.querySelectorAll(
      '.ai-edit-message, [class*="ai-edit-message"]'
    );

    cemEls.forEach(el => {
      // Skip if already has a delete button
      if (el.querySelector('.cem-delete-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'cem-delete-btn';
      btn.title = 'Dismiss this notification';
      btn.innerHTML = '✕';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        (el as HTMLElement).style.transition = 'opacity 0.15s ease, max-height 0.15s ease';
        (el as HTMLElement).style.opacity = '0';
        (el as HTMLElement).style.maxHeight = '0';
        (el as HTMLElement).style.overflow = 'hidden';
        (el as HTMLElement).style.margin = '0';
        (el as HTMLElement).style.padding = '0';
        setTimeout(() => el.remove(), 160);
      });

      // Append to the element (positioned absolute via CSS)
      (el as HTMLElement).style.position = 'relative';
      el.appendChild(btn);
    });
  }

  // ── Create the "Show earlier" bar ──────────────────────────────────
  function createLoadMoreBar(hiddenCount: number, totalHidden: number): HTMLElement {
    const bar = document.createElement('div');
    bar.id = 'chat-pagination-load-more';
    bar.className = 'chat-pagination-bar';
    bar.setAttribute('data-chat-pagination', 'true');
    
    const convCount = totalHidden;
    const label = convCount === 1 ? '1 earlier message' : `${convCount} earlier messages`;

    bar.innerHTML = `
      <div class="chat-pagination-row">
        <button class="chat-pagination-btn" title="Show ${PAGE_SIZE} more messages">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          <span class="chat-pagination-text">${label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="chat-pagination-search-btn" title="Search messages">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    `;

    bar.querySelector('.chat-pagination-btn')?.addEventListener('click', () => {
      showMore();
    });

    bar.querySelector('.chat-pagination-search-btn')?.addEventListener('click', () => {
      triggerSearch();
    });

    return bar;
  }

  // ── Trigger conversation search ────────────────────────────────────
  function triggerSearch(): void {
    const w = window as any;

    // Use the exact function from conversationSearchIntegration.ts
    if (w.showConversationSearch) { w.showConversationSearch(); return; }
    if (w.toggleConversationSearch) { w.toggleConversationSearch(); return; }

    // Fallback: dispatch event
    document.dispatchEvent(new CustomEvent('open-conversation-search'));
  }

  // ── Show more messages ─────────────────────────────────────────────
  function showMore(): void {
    // v8: Don't reveal during background load — observer would re-capture them
    if (backgroundLoadMode) return;

    // v8: Prioritize hiddenMessages (already in DOM, display:none — fastest)
    if (hiddenMessages.length > 0) {
      revealHidden();
      return;
    }
    // v8: Then handle deferredElements (removed from DOM during background load)
    if (deferredElements.length > 0) {
      revealDeferred();
      return;
    }
  }

  // ── Reveal hidden messages (in DOM, display:none) ──────────────────
  function revealHidden(): void {
    if (hiddenMessages.length === 0) return;

    const container = document.querySelector('.ai-chat-container');
    if (!container) return;

    // v5: Save scroll position relative to bottom to prevent jump
    const scrollBottom = container.scrollHeight - container.scrollTop;

    // Reveal elements until we've shown LOAD_MORE_BATCH conversation messages
    let convRevealed = 0;
    const toReveal: HTMLElement[] = [];

    while (hiddenMessages.length > 0 && convRevealed < LOAD_MORE_BATCH) {
      const el = hiddenMessages.pop()!;
      el.style.display = '';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      toReveal.push(el);

      const type = classifyElement(el);
      if (isConversationMsg(type)) {
        convRevealed++;
      }
    }

    // v5: Animate all at once in a single RAF (no staggered setTimeout)
    requestAnimationFrame(() => {
      toReveal.forEach(el => {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });

    // v5: Restore scroll position
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight - scrollBottom;
    });

    // Update or remove the load-more bar
    if (hiddenMessages.length === 0 && deferredElements.length === 0) {
      loadMoreBar?.remove();
      loadMoreBar = null;
    } else {
      updateLoadMoreBar();
    }

    console.log(`${TAG} Revealed ${toReveal.length} elements. ${hiddenMessages.length} hidden, ${deferredElements.length} deferred.`);
  }

  // ── v8: Reveal deferred messages (removed from DOM, lazy render) ───
  function revealDeferred(): void {
    const container = document.querySelector('.ai-chat-container') as HTMLElement;
    if (!container || deferredElements.length === 0) return;

    const scrollBottom = container.scrollHeight - container.scrollTop;

    // Take batch from END of array (newest deferred = closest to visible messages)
    let convRevealed = 0;
    const batch: HTMLElement[] = [];

    while (deferredElements.length > 0 && convRevealed < LOAD_MORE_BATCH) {
      const el = deferredElements.pop()!;
      batch.push(el);
      const type = classifyElement(el);
      if (isConversationMsg(type)) {
        convRevealed++;
      }
    }

    // Find insertion point: just after the load-more bar (or at container start)
    const insertRef = loadMoreBar ? loadMoreBar.nextSibling : container.firstChild;

    // v8: Suppress MutationObserver during insertion to prevent paginate from re-hiding
    isRevealing = true;

    // Insert batch into DOM — this triggers MarkdownFix observer for lazy processing
    for (const el of batch) {
      el.removeAttribute('data-deferred');
      el.style.display = '';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      container.insertBefore(el, insertRef);
    }

    isRevealing = false;

    // Animate reveal
    requestAnimationFrame(() => {
      batch.forEach(el => {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });

    // Restore scroll position
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight - scrollBottom;
    });

    // Update or remove load-more bar
    if (deferredElements.length === 0 && hiddenMessages.length === 0) {
      loadMoreBar?.remove();
      loadMoreBar = null;
    } else {
      updateLoadMoreBar();
    }

    console.log(`${TAG} 🔄 Lazy-rendered ${batch.length} deferred messages. ${deferredElements.length} still deferred.`);
  }

  // ── Update load-more bar count ─────────────────────────────────────
  function updateLoadMoreBar(): void {
    if (!loadMoreBar) return;
    // v8: Count both hidden (in DOM) and deferred (removed from DOM) messages
    const hiddenConvCount = hiddenMessages.filter(el => isConversationMsg(classifyElement(el))).length;
    const deferredConvCount = deferredElements.filter(el => isConversationMsg(classifyElement(el))).length;
    const totalConv = hiddenConvCount + deferredConvCount;
    const textEl = loadMoreBar.querySelector('.chat-pagination-text');
    if (textEl) {
      textEl.textContent = totalConv === 1 ? '1 earlier message' : `${totalConv} earlier messages`;
    }
  }

  // v8: Ensure load-more bar exists when deferred elements are present
  function ensureDeferredLoadMoreBar(): void {
    const container = document.querySelector('.ai-chat-container') as HTMLElement;
    if (!container) return;
    
    if (!loadMoreBar && (deferredElements.length > 0 || hiddenMessages.length > 0)) {
      const convCount = deferredElements.filter(el => isConversationMsg(classifyElement(el))).length
        + hiddenMessages.filter(el => isConversationMsg(classifyElement(el))).length;
      if (convCount > 0) {
        loadMoreBar = createLoadMoreBar(deferredElements.length + hiddenMessages.length, convCount);
        container.insertBefore(loadMoreBar, container.firstChild);
        attachInfiniteScroll();
      }
    } else {
      updateLoadMoreBar();
    }
  }

  // ── Main: paginate the chat container ──────────────────────────────
  let lastChildCount = 0;
  let stableCount = 0;       // How many consecutive checks had same count
  let initialLoadDone = false; // Skip stability check after first successful paginate
  let stabilityStartTime = 0; // Track when stability checking started
  let postRenderSettling = false;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let resetSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  let firstPaginateUnlocked = false; // v7: Unlock after FIRST successful paginate, reset per conversation
  let backgroundLoadMode = false; // v8: Intercept + defer messages during background load
  let bgPaginateTimer: ReturnType<typeof setTimeout> | null = null; // v8: Safety timer for background mode
  let deferredElements: HTMLElement[] = []; // v8: Messages removed from DOM during background load
  let isRevealing = false; // v8: Suppress observer during deferred reveal
  const STABLE_THRESHOLD = 2; // Need 2 consecutive same counts
  const MAX_STABILITY_WAIT = 1200;
  const RESET_SAFETY_MS = 4000; // Guaranteed unlock 4s after any loading signal
  const BG_MODE_SAFETY_MS = 45000; // v8: Safety exit from background mode (generous for slow loaders)

  // v7: Start a per-reset safety timer. Guarantees unlock regardless of flags.
  function startResetSafety(): void {
    if (resetSafetyTimer) clearTimeout(resetSafetyTimer);
    resetSafetyTimer = setTimeout(() => {
      resetSafetyTimer = null;
      console.log(`${TAG} ⚠️ Reset safety: force unlock after ${RESET_SAFETY_MS}ms`);
      renderCoordActive = false;
      conversationLoadInProgress = false;
      backgroundLoadMode = false; // v8
      if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
      postRenderSettling = false;
      removePreHide();
      if (__inputLocked) {
        __unlockChatInput();
      }
    }, RESET_SAFETY_MS);
  }

  // v7: Clear reset safety (called when paginate succeeds normally)
  function clearResetSafety(): void {
    if (resetSafetyTimer) { clearTimeout(resetSafetyTimer); resetSafetyTimer = null; }
  }

  function paginate(): void {
    if (isProcessing) return;
    // v5: NEVER paginate while RenderCoord is actively rendering 83 messages
    if (renderCoordActive) return;
    isProcessing = true;
    let paginationCompleted = false; // v7: Track if we actually paginated

    try {
      const container = document.querySelector('.ai-chat-container');
      if (!container) return;

      // ── Stability check: only on initial load ──
      // After first successful paginate, skip this (live messages should be fast)
      if (!initialLoadDone) {
        const currentCount = container.children.length;
        
        // Track when we started waiting
        if (stabilityStartTime === 0) stabilityStartTime = Date.now();
        
        // FIX v4: If we've been waiting too long, force proceed regardless
        const waited = Date.now() - stabilityStartTime;
        const forceExpired = waited > MAX_STABILITY_WAIT;
        
        if (!forceExpired && currentCount !== lastChildCount) {
          // DOM still changing — keep CSS pre-hide, reschedule
          lastChildCount = currentCount;
          stableCount = 0;
          console.log(`${TAG} DOM still changing (${currentCount} children), waiting...`);
          isProcessing = false;
          schedulePaginate();
          return;
        }
        
        if (!forceExpired) {
          stableCount++;
          if (stableCount < STABLE_THRESHOLD) {
            lastChildCount = currentCount;
            console.log(`${TAG} Stability check ${stableCount}/${STABLE_THRESHOLD}...`);
            isProcessing = false;
            schedulePaginate();
            return;
          }
        }
        
        // Stable OR force-expired! Proceed.
        initialLoadDone = true;
        if (forceExpired) {
          console.log(`${TAG} Max stability wait reached (${waited}ms). Force proceeding with ${currentCount} children.`);
        } else {
          console.log(`${TAG} DOM stable at ${currentCount} children. Proceeding.`);
        }
      }

      // ── DOM is stable — safe to proceed ──
      // ✅ FIX: Do NOT remove CSS pre-hide yet!
      // Apply JS display:none FIRST, then remove pre-hide.
      // This eliminates the flash where all messages are briefly visible.

      // Remove old load-more bar
      loadMoreBar?.remove();
      loadMoreBar = null;
      hiddenMessages = [];

      // Get all direct children that are message elements
      const children = Array.from(container.children) as HTMLElement[];
      
      // Filter to actual message elements (skip pagination bars, dividers, etc.)
      const messageEls = children.filter(el => {
        if (el.getAttribute('data-chat-pagination') === 'true') return false;
        const cls = el.className || '';
        return cls.includes('message') || cls.includes('ai-edit-message') || el.querySelector('.cem-row');
      });

      if (messageEls.length === 0) {
        // v7: Remove pre-hide + unlock even if no messages (empty state)
        paginationCompleted = true;
        removePreHide();
        __unlockChatInput();
        clearResetSafety();
        return;
      }

      // ── Classify all elements ──
      const classified = messageEls.map(el => ({
        el,
        type: classifyElement(el),
      }));

      // ── Find conversation messages (user/assistant only) ──
      const convMessages = classified.filter(c => isConversationMsg(c.type));

      if (convMessages.length <= PAGE_SIZE) {
        // Not enough conversation messages to paginate — show everything
        messageEls.forEach(el => {
          el.style.display = '';
          el.style.opacity = '1';
          el.style.transform = '';
        });
        // Still collapse long CEM runs even when not paginating
        collapseCEMRuns(container as HTMLElement, classified);
        injectCEMDeleteButtons(container as HTMLElement);
        // v7: ALWAYS remove pre-hide + unlock — no conditions
        paginationCompleted = true;
        removePreHide();
        __unlockChatInput();
        clearResetSafety();
        return;
      }

      // ── Find boundary: show from the Nth-last conversation message to end ──
      // The first visible conversation message
      const firstVisibleConv = convMessages[convMessages.length - PAGE_SIZE];
      const boundaryIndex = classified.indexOf(firstVisibleConv);

      // ✅ FIX: Apply display:none FIRST (while CSS pre-hide still covers everything)
      for (let i = 0; i < boundaryIndex; i++) {
        const el = classified[i].el;
        el.style.display = 'none';
        hiddenMessages.push(el);
      }

      // Show everything from boundary onwards
      for (let i = boundaryIndex; i < classified.length; i++) {
        classified[i].el.style.display = '';
        classified[i].el.style.opacity = '1';
        classified[i].el.style.transform = '';
      }

      // ✅ FIX: NOW safe to remove pre-hide — JS display:none is already applied
      removePreHide();

      // ── Collapse long CEM runs in the visible section ──
      const visibleSection = classified.slice(boundaryIndex);
      collapseCEMRuns(container as HTMLElement, visibleSection);
      injectCEMDeleteButtons(container as HTMLElement);

      // Insert "load more" bar at the top of the container
      // v8: Include both hidden (display:none) AND deferred (removed from DOM) messages
      const totalHidden = hiddenMessages.length + deferredElements.length;
      if (totalHidden > 0) {
        const hiddenConvCount = (convMessages.length - PAGE_SIZE)
          + deferredElements.filter(el => isConversationMsg(classifyElement(el))).length;
        loadMoreBar = createLoadMoreBar(totalHidden, hiddenConvCount);
        container.insertBefore(loadMoreBar, container.firstChild);
      }

      console.log(`${TAG} Showing last ${PAGE_SIZE} conversations + attached CEM bars. Hidden: ${hiddenMessages.length} elements. Deferred: ${deferredElements.length} elements.`);
      // v5: Attach infinite scroll now that pagination is active
      attachInfiniteScroll();
      paginationCompleted = true; // v7: Actual pagination ran
    } finally {
      isProcessing = false;
      // v7: Unlock after FIRST successful paginate — no settle timer needed
      if (paginationCompleted && !firstPaginateUnlocked) {
        firstPaginateUnlocked = true;
        initialLoadDone = true;
        removePreHide();
        postRenderSettling = false;
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
        __unlockChatInput();
        clearResetSafety();

        // v8: If old loader is still adding messages, enter background mode
        // to intercept and defer them (TRUE Option B: lazy rendering)
        if (conversationLoadInProgress && !backgroundLoadMode) {
          backgroundLoadMode = true;
          if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
          bgPaginateTimer = setTimeout(() => {
            bgPaginateTimer = null;
            if (backgroundLoadMode) {
              console.log(`${TAG} ⚠️ Background mode safety: force exit after ${BG_MODE_SAFETY_MS}ms`);
              backgroundLoadMode = false;
              conversationLoadInProgress = false;
              // Don't paginate — deferred elements stay deferred, just update bar
              ensureDeferredLoadMoreBar();
            }
          }, BG_MODE_SAFETY_MS);
          console.log(`${TAG} ✅ First paginate complete — unlocked, background mode ON (deferred rendering)`);
        } else {
          console.log(`${TAG} ✅ First paginate complete — unlocking input immediately`);
        }
      }
    }
  }

  // ✅ FIX: Separate function to safely remove the CSS pre-hide
  function removePreHide(): void {
    // Remove loading overlay
    const lo = document.getElementById('chat-loading-overlay');
    if (lo) lo.remove();
    // Remove pre-hide CSS — container becomes visible
    const preHide = document.getElementById('chat-pagination-prehide');
    if (preHide) {
      preHide.remove();
      console.log(`${TAG} Pre-hide CSS removed`);
    }
    // v7: NO unlock here — paginate() always unlocks in its finally block.
    // This prevents stale flags (conversationLoadInProgress, renderCoordActive)
    // from blocking the unlock on 2nd+ resets.
  }

  // ── Debounced paginate (called after renders settle) ───────────────
  function schedulePaginate(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    // v7: No settle timer reset — first paginate unlocks immediately
    debounceTimer = setTimeout(() => {
      paginate();
      debounceTimer = null;
    }, 100);
  }

  // ── Inject styles ──────────────────────────────────────────────────
  function injectStyles(): void {
    if (document.getElementById('chat-pagination-styles')) return;

    const style = document.createElement('style');
    style.id = 'chat-pagination-styles';
    style.textContent = `
      /* ── Chat Pagination: Load More Bar ───────────── */
      .chat-pagination-bar {
        position: sticky;
        top: 0;
        z-index: 10;
        padding: 6px 12px;
        display: flex;
        justify-content: center;
        background: #161b22;
        border-bottom: 1px solid #30363d;
      }

      .chat-pagination-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .chat-pagination-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        letter-spacing: 0.3px;
        cursor: pointer;
        transition: all 0.2s ease;
        line-height: 1;
      }
      .chat-pagination-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.8);
      }
      .chat-pagination-btn:active {
        transform: translateY(0);
        background: rgba(255, 255, 255, 0.1);
      }
      .chat-pagination-btn svg {
        opacity: 0.5;
        flex-shrink: 0;
      }
      .chat-pagination-btn:hover svg {
        opacity: 0.8;
      }
      .chat-pagination-text {
        white-space: nowrap;
      }

      /* Search button */
      .chat-pagination-search-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .chat-pagination-search-btn:hover {
        background: rgba(100, 180, 255, 0.12);
        border-color: rgba(100, 180, 255, 0.3);
        color: rgba(100, 180, 255, 0.9);
      }
      .chat-pagination-search-btn:active {
        transform: translateY(0);
        background: rgba(100, 180, 255, 0.18);
      }

      /* Hide original green floating search button — replaced by pagination search icon */
      #chat-search-btn {
        display: none !important;
      }

      /* ── CEM Collapse Bar ─────────────────────────── */
      .cem-collapse-bar {
        display: flex;
        justify-content: center;
        padding: 3px 0;
      }

      .cem-collapse-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 12px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.02);
        color: rgba(255, 255, 255, 0.35);
        font-size: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cem-collapse-toggle:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
      }

      /* CEM "Clear all" button inside collapse bar */
      .cem-clear-all-btn {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        margin-left: 4px;
        border: 1px solid rgba(255, 80, 80, 0.15);
        border-radius: 4px;
        background: rgba(255, 80, 80, 0.06);
        color: rgba(255, 80, 80, 0.5);
        font-size: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cem-clear-all-btn:hover {
        background: rgba(255, 80, 80, 0.15);
        border-color: rgba(255, 80, 80, 0.3);
        color: rgba(255, 80, 80, 0.9);
      }

      /* Individual CEM delete (×) button */
      .cem-delete-btn {
        position: absolute;
        top: 50%;
        right: 6px;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: none;
        border-radius: 3px;
        background: transparent;
        color: rgba(255, 255, 255, 0.2);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.12s ease;
        opacity: 0;
        pointer-events: none;
      }
      .ai-edit-message:hover .cem-delete-btn,
      [class*="ai-edit-message"]:hover .cem-delete-btn {
        opacity: 1;
        pointer-events: auto;
      }
      .cem-delete-btn:hover {
        background: rgba(255, 80, 80, 0.2);
        color: rgba(255, 80, 80, 0.9);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Event hooks ────────────────────────────────────────────────────
  function setupHooks(): void {
    // Run after conversation load events
    const events = [
      'conversation-loaded',
      'conversations-rendered', 
      'conversation-switched'
    ];
    for (const evt of events) {
      document.addEventListener(evt, () => {
        // Reset stability on conversation switch — new content incoming
        if (evt === 'conversation-switched') {
          initialLoadDone = false;
          stableCount = 0;
          lastChildCount = 0;
          stabilityStartTime = 0; // Reset timer
          renderCoordActive = false; // v5: Reset render blocking
          conversationLoadInProgress = true; // v5: New conversation loading
          backgroundLoadMode = false; // v8: Reset background mode
          if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
          deferredElements = []; // v8: Clear deferred messages from previous conversation
          infiniteScrollAttached = false; // v5: Re-attach on new conversation
          // v6: Clear any previous settling state
          postRenderSettling = false;
          if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
          if (renderCoordSafetyTimer) { clearTimeout(renderCoordSafetyTimer); renderCoordSafetyTimer = null; }
          // Re-inject CSS pre-hide to prevent flash
          if (!document.getElementById('chat-pagination-prehide')) {
            const ph = document.createElement('style');
            ph.id = 'chat-pagination-prehide';
            ph.textContent = `
              .ai-chat-container {
                opacity: 0 !important;
                transition: none !important;
              }
              #chat-search-btn { display: none !important; }
            `;
            document.head.appendChild(ph);
            // Show loading animation
            __showChatLoading();
            // v5: Lock input during conversation switch
            __lockChatInput();
            // Safety: always reveal after 15s
            setTimeout(() => {
              const s = document.getElementById('chat-pagination-prehide');
              if (s) { s.remove(); console.log(`${TAG} Safety: force-revealed on switch`); }
              const lo = document.getElementById('chat-loading-overlay');
              if (lo) lo.remove();
              conversationLoadInProgress = false; // v5: Force clear
              backgroundLoadMode = false; // v8: Force clear
              if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
              postRenderSettling = false; // v6: Clear settling
              if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
              __unlockChatInput(); // Safety: always unlock input
              console.log('🔓 [InputLock] Safety: force unlocked on switch at 15s');
            }, 15000);
          }
        }
        // v5: Don't paginate if RenderCoord is still bulk-rendering
        // v8: Don't paginate during background mode (messages being deferred)
        if (!renderCoordActive && !backgroundLoadMode) {
          schedulePaginate();
        }
      });
    }

    // Intercept console logs from renderers (same pattern as CEM fix)
    const origLog = console.log;

    // ── Noise filter: suppress high-frequency logs that spam DevTools ──────
    // These patterns fire 60-120x/min and provide no actionable info at runtime.
    // Add patterns here to suppress; remove to re-enable for debugging.
    const __noisePatterns: string[] = [
      '[GetBlocks]',          // chatPagination scan — fires every 2s, always "Found 0"
      'Save icon',            // save-icon state update — fires every poll cycle
      'Status bar updated',   // status bar refresh — fires every poll cycle
      '[AutoSave]',           // auto-save heartbeat
      '[CONTEXT-FIX]',        // re-attach guard — fires every 15s
      '[Watchdog]',           // autoModeWatchdog localStorage checks
      '[AUTO-SCAN]',          // folder sync scan
      '[Plugin Detection]',   // plugin file scan (original)
      // X02-noiseFix: high-frequency patterns added below
      'Captured editor context',
      'Found chat container',
      '[BackupManager] Getting',
      'IDE state saved',
      'State saved via Tauri',
      'Handling view menu action',
      '[X02] showTerminal',
      '[X02] Tick:',
      '[LoadFix] Periodic',
      'Found 0 file items',
      'tauri://drag-over',
      'tauri://drag-enter',
      '[MUF v15] SKIP',
      'Skipping pre - inside',
      'Project path:',
      'Captured IDE state',
    ];

    console.log = function (...args: any[]) {
      const msg = args[0];
      // Suppress noisy patterns before they reach DevTools
      if (typeof msg === 'string') {
        for (let _i = 0; _i < __noisePatterns.length; _i++) {
          if (msg.includes(__noisePatterns[_i])) return;
        }
      }
      origLog.apply(console, args);
      if (typeof msg !== 'string') return;

      // v5: Detect RenderCoord START — block ALL pagination until it finishes.
      // This is the #1 speed fix: prevents 40+ cascade paginate() calls.
      // Log format: "🎯 [RenderCoord] Rendering 83 messages..."
      if (msg.includes('[RenderCoord]') && msg.includes('Rendering') && msg.includes('messages')) {
        renderCoordActive = true;
        conversationLoadInProgress = true;
        firstPaginateUnlocked = false; // v7: Reset for new render cycle
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
        __inputLocked = false;
        __lockChatInput();
        startResetSafety(); // v7: Guarantee unlock within 4s even if RenderCoord hangs
        
        // Re-inject pre-hide to hide chat container during bulk render
        if (!document.getElementById('chat-pagination-prehide')) {
          const ph = document.createElement('style');
          ph.id = 'chat-pagination-prehide';
          ph.textContent = `
            .ai-chat-container {
              opacity: 0 !important;
              transition: none !important;
            }
            #chat-search-btn { display: none !important; }
          `;
          document.head.appendChild(ph);
        }
        
        // Safety: if RenderCoord never emits "Rendered", unblock after 15s
        if (renderCoordSafetyTimer) clearTimeout(renderCoordSafetyTimer);
        renderCoordSafetyTimer = setTimeout(() => {
          if (renderCoordActive) {
            renderCoordActive = false;
            conversationLoadInProgress = false;
            backgroundLoadMode = false; // v8
            if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
            postRenderSettling = false; // v6: Clear settling
            if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
            origLog.call(console, `${TAG} RenderCoord safety timeout — force unblocking`);
            __unlockChatInput();
            schedulePaginate();
          }
        }, 15000);
        
        origLog.call(console, `${TAG} RenderCoord STARTED — pagination BLOCKED, input LOCKED`);
        return;
      }

      // v5: Detect RenderCoord END — NOW safe to paginate (exactly once!)
      // Log format: "✅ [RenderCoord] Rendered 83 messages"
      if (msg.includes('[RenderCoord] Rendered')) {
        renderCoordActive = false;
        // v8: DON'T clear conversationLoadInProgress — old loader still adding messages
        // We'll intercept those in MutationObserver and defer them
        if (renderCoordSafetyTimer) { clearTimeout(renderCoordSafetyTimer); renderCoordSafetyTimer = null; }
        initialLoadDone = true;
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
        
        // v7: Immediate unlock — RenderCoord rendered 8 messages, user can see them
        if (!firstPaginateUnlocked) {
          firstPaginateUnlocked = true;
          removePreHide();
          __unlockChatInput();
          clearResetSafety();
        }
        
        // v8: Enter background mode — intercept + defer all subsequent messages
        backgroundLoadMode = true;
        if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
        bgPaginateTimer = setTimeout(() => {
          bgPaginateTimer = null;
          if (backgroundLoadMode) {
            origLog.call(console, `${TAG} ⚠️ Background mode safety: force exit after ${BG_MODE_SAFETY_MS}ms`);
            backgroundLoadMode = false;
            conversationLoadInProgress = false;
            ensureDeferredLoadMoreBar();
          }
        }, BG_MODE_SAFETY_MS);
        
        origLog.call(console, `${TAG} ✅ RenderCoord FINISHED — unlocked immediately, deferred rendering ON (${deferredElements.length} stored)`);
        
        // One paginate to hide old messages down to last 5
        setTimeout(() => paginate(), 50);
        return;
      }

      // Other render signals (only when RenderCoord isn't active)
      if (msg.includes('[CEMFix] Fixed')) {
        if (!renderCoordActive && !backgroundLoadMode) {
          schedulePaginate();
        }
      }
      
      // v5: "Conversation loaded with X messages" — loadConversationToUI finished.
      // v8: All messages have been intercepted. Exit background mode, update bar.
      if (msg.includes('Conversation loaded with')) {
        const wasBgMode = backgroundLoadMode;
        backgroundLoadMode = false;
        conversationLoadInProgress = false;
        if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
        
        if (wasBgMode && deferredElements.length > 0) {
          // v8: Messages were deferred — just update the load-more bar, don't paginate
          ensureDeferredLoadMoreBar();
          origLog.call(console, `${TAG} ✅ Background load complete — ${deferredElements.length} messages deferred for lazy rendering`);
        } else if (!renderCoordActive) {
          schedulePaginate();
        }
        
        // v7: If first paginate already unlocked, just let background paginate handle it.
        // If not yet unlocked (e.g. RenderCoord path), force unlock after 1s.
        setTimeout(() => {
          if (!firstPaginateUnlocked) {
            firstPaginateUnlocked = true;
            initialLoadDone = true;
            origLog.call(console, `${TAG} Conversation loaded — force unlocking (firstPaginate hadn't fired)`);
            removePreHide();
            __unlockChatInput();
            clearResetSafety();
          }
        }, 1000);
      }
      
      // v5: Detect conversation loading START — lock input immediately.
      // "🔄 [Dedup] Loading conversation:" fires before any messages render.
      if (msg.includes('[Dedup] Loading conversation')) {
        conversationLoadInProgress = true;
        initialLoadDone = false;
        firstPaginateUnlocked = false; // v7: Reset for new conversation
        backgroundLoadMode = false; // v8: Reset
        if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
        deferredElements = []; // v8: Clear deferred from previous conversation
        stabilityStartTime = 0;
        stableCount = 0;
        lastChildCount = 0;
        hiddenMessages = [];
        loadMoreBar?.remove();
        loadMoreBar = null;
        __inputLocked = false;
        __lockChatInput();
        startResetSafety(); // v7: Guarantee unlock within 4s
        origLog.call(console, `${TAG} Conversation loading detected — input LOCKED, state reset, safety started`);
      }
      
      // v5: Detect "Conversation loading: true" from setConversationLoading
      if (msg.includes('Conversation loading: true')) {
        initialLoadDone = false;
        firstPaginateUnlocked = false; // v7: Reset for new conversation
        backgroundLoadMode = false; // v8: Reset
        if (bgPaginateTimer) { clearTimeout(bgPaginateTimer); bgPaginateTimer = null; }
        deferredElements = []; // v8: Clear
        stabilityStartTime = 0;
        stableCount = 0;
        lastChildCount = 0;
        if (!__inputLocked) {
          __lockChatInput();
        }
        startResetSafety(); // v7: Guarantee unlock within 4s
      }

      // v7: Settle timer resets REMOVED — paginate() always unlocks when input is locked.
    };

    // Also observe DOM changes in chat container
    const observer = new MutationObserver((mutations) => {
      // v5: Skip entirely while RenderCoord is bulk-rendering
      if (renderCoordActive) return;
      // v8: Skip during deferred reveal (prevents paginate from re-hiding just-revealed elements)
      if (isRevealing) return;

      // v8: TRUE DEFERRED RENDERING — intercept messages during background load
      // Remove them from DOM BEFORE other observers (MarkdownFix, AI History) process them.
      // This is the core of Option B: zero processing during background load.
      if (backgroundLoadMode) {
        let intercepted = 0;
        for (const m of mutations) {
          if (m.type !== 'childList') continue;
          const target = m.target as HTMLElement;
          // Only intercept additions to the chat container itself
          if (!target.classList?.contains('ai-chat-container') &&
              target !== document.querySelector('.ai-chat-container')) continue;
          
          for (const node of Array.from(m.addedNodes)) {
            if (!(node instanceof HTMLElement)) continue;
            // Skip our own pagination elements
            if (node.getAttribute('data-chat-pagination') === 'true') continue;
            // Skip if already a deferred marker
            if (node.hasAttribute('data-deferred')) continue;
            
            // Mark as deferred and remove from DOM
            node.setAttribute('data-deferred', 'true');
            if (node.parentNode) {
              node.parentNode.removeChild(node);
            }
            deferredElements.push(node);
            intercepted++;
          }
        }
        if (intercepted > 0) {
          origLog.call(console, `${TAG} 🔄 Deferred ${intercepted} messages (${deferredElements.length} total stored)`);
          // Update load-more bar count while messages accumulate
          ensureDeferredLoadMoreBar();
        }
        return;
      }

      let hasAdded = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          // Check it's in the chat container
          const target = m.target as HTMLElement;
          if (target.classList?.contains('ai-chat-container') ||
              target === document.querySelector('.ai-chat-container')) {
            // Ignore our own pagination bar additions
            for (const node of Array.from(m.addedNodes)) {
              if (node instanceof HTMLElement && 
                  node.getAttribute('data-chat-pagination') === 'true') {
                continue;
              }
              hasAdded = true;
            }
          }
        }
      }
      if (hasAdded) {
        stableCount = 0;  // Reset stability — DOM changed
        // v7: No settle timer reset — just re-paginate to hide new messages
        schedulePaginate();
      }
    });

    // Attach observer
    function attach() {
      const container = document.querySelector('.ai-chat-container');
      if (container) {
        observer.observe(container, { childList: true });
        console.log(`${TAG} Observer attached`);
        return true;
      }
      return false;
    }

    if (!attach()) {
      const retry = setInterval(() => {
        if (attach()) clearInterval(retry);
      }, 500);
      setTimeout(() => clearInterval(retry), 30000);
    }
  }

  // ── Infinite scroll upward ─────────────────────────────────────────
  function attachInfiniteScroll(): void {
    if (infiniteScrollAttached) return;
    const container = document.querySelector('.ai-chat-container');
    if (!container) return;

    container.addEventListener('scroll', () => {
      if (scrollLoadCooldown || (hiddenMessages.length === 0 && deferredElements.length === 0)) return;
      if (container.scrollTop <= SCROLL_TRIGGER_PX) {
        scrollLoadCooldown = true;
        showMore();
        setTimeout(() => { scrollLoadCooldown = false; }, SCROLL_COOLDOWN_MS);
      }
    }, { passive: true });

    infiniteScrollAttached = true;
    console.log(`${TAG} Infinite scroll attached`);
  }

  // ── Keyboard: PageUp at top loads more ─────────────────────────────
  function attachKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'PageUp' || (hiddenMessages.length === 0 && deferredElements.length === 0)) return;
      const container = document.querySelector('.ai-chat-container');
      if (!container) return;
      if (container.scrollTop <= SCROLL_TRIGGER_PX * 2) {
        e.preventDefault();
        showMore();
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    console.log(`${TAG} v8 Loading...`);
    injectStyles();
    setupHooks();
    attachKeyboardShortcut();

    // v5: Faster initial pagination — 800ms instead of 1500ms
    setTimeout(paginate, 800);
    setTimeout(paginate, 2500);  // Safety net (was 3500)

    // Expose for debugging
    if (typeof window !== 'undefined') {
      (window as any).chatPagination = {
        paginate,
        showMore,
        revealDeferred,
        showAll: () => {
          removePreHide();
          hiddenMessages.forEach(el => {
            el.style.display = '';
            el.style.opacity = '1';
            el.style.transform = '';
          });
          hiddenMessages = [];
          // v8: Also re-add all deferred elements
          const container = document.querySelector('.ai-chat-container') as HTMLElement;
          if (container && deferredElements.length > 0) {
            isRevealing = true;
            const insertRef = loadMoreBar ? loadMoreBar.nextSibling : container.firstChild;
            for (const el of deferredElements) {
              el.removeAttribute('data-deferred');
              el.style.display = '';
              el.style.opacity = '1';
              el.style.transform = '';
              container.insertBefore(el, insertRef);
            }
            isRevealing = false;
            deferredElements = [];
          }
          loadMoreBar?.remove();
          loadMoreBar = null;
        },
        getHiddenCount: () => hiddenMessages.length,
        getDeferredCount: () => deferredElements.length,
        getTotalEarlierCount: () => hiddenMessages.length + deferredElements.length,
        getHiddenConvCount: () => hiddenMessages.filter(el => isConversationMsg(classifyElement(el))).length,
        getDeferredConvCount: () => deferredElements.filter(el => isConversationMsg(classifyElement(el))).length,
        lockInput: __lockChatInput,
        unlockInput: __unlockChatInput,
        isInputLocked: () => __inputLocked,
        isLoading: () => ({ conversationLoadInProgress, renderCoordActive, backgroundLoadMode }),
        clearAllCEM: () => {
          const container = document.querySelector('.ai-chat-container');
          if (!container) return 0;
          const cems = container.querySelectorAll('.ai-edit-message, [class*="ai-edit-message"]');
          const count = cems.length;
          cems.forEach(el => el.remove());
          container.querySelectorAll('.cem-collapse-bar').forEach(el => el.remove());
          console.log(`${TAG} Cleared ${count} CEM notifications`);
          return count;
        },
      };
    }

    console.log(`${TAG} v8 Ready! Debug: window.chatPagination`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
