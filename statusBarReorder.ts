// ============================================================
// statusBarReorder.ts — SIMPLE FIX using exact IDs
// ============================================================
// Moves #ide-script-mode-toggle (Classic/Auto) INTO #status-right
// Result: Surgical | Backups 4 | Classic | Auto | ?
//
// USAGE: import './statusBarReorder';  (add to main.ts)
// ============================================================

let _done = false;
let _attempts = 0;

function reorder(): boolean {
    const toggle = document.getElementById('ide-script-mode-toggle');
    const rightSection = document.getElementById('status-right');

    if (!toggle || !rightSection) return false;

    // Already in the right place?
    if (toggle.parentElement === rightSection) {
        _done = true;
        return true;
    }

    // Move Classic/Auto into status-right, at the END (after Surgical + Backups)
    rightSection.appendChild(toggle);

    // Fix spacing so it looks grouped
    toggle.style.marginLeft = '8px';
    toggle.style.borderLeft = '1px solid #30363d';
    toggle.style.paddingLeft = '8px';

    console.log('%c[StatusBar] Reordered: Surgical | Backups | Classic | Auto', 'color:#4CAF50;font-weight:bold');
    _done = true;
    return true;
}

// Retry until elements exist (they load async)
const interval = setInterval(() => {
    _attempts++;
    if (_done || _attempts > 60) {
        clearInterval(interval);
        if (!_done) console.warn('[StatusBar] Reorder gave up after 30s');
        return;
    }
    reorder();
}, 500);

// Watch for status bar rebuilds (e.g. hot reload)
setTimeout(() => {
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar) return;

    let guard = false;
    const obs = new MutationObserver(() => {
        if (guard) return;
        guard = true;
        setTimeout(() => {
            _done = false;
            reorder();
            guard = false;
        }, 300);
    });
    obs.observe(statusBar, { childList: true, subtree: true });
}, 5000);

// Debug helper
(window as any).fixStatusBarOrder = reorder;
