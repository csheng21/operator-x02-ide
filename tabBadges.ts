// ============================================================
// ui/tabBadges.ts
// Tab badge system - Git change count badges on sidebar tabs
// Extracted from main.ts | Operator X02
// ============================================================

// ── Styles ──────────────────────────────────────────────────
const TAB_BADGE_STYLES = `
  .tab-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 16px; height: 16px; padding: 0 5px; margin-left: 6px;
    font-size: 10px; font-weight: 600; color: #fff;
    background: #007acc; border-radius: 8px; line-height: 1;
    transition: all 0.2s ease;
  }
  .tab-badge.git-badge { background: #f05033; color: #fff; }
  .tab-badge.git-badge.staged { background: #89d185; color: #1e1e1e; }
  .tab-badge.hidden { display: none; }
  @keyframes badgePulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .tab-badge.pulse { animation: badgePulse 0.3s ease; }
  .explorer-tab .tab-label,
  .explorer-tab-v3 .tab-label { display: inline-flex; align-items: center; }
`;

// ── Internal helpers ─────────────────────────────────────────

function _injectBadgeStyles(): void {
  if (document.getElementById('tab-badge-styles')) return;
  const style = document.createElement('style');
  style.id = 'tab-badge-styles';
  style.textContent = TAB_BADGE_STYLES;
  document.head.appendChild(style);
}

function _addBadgeToTab(tab: HTMLElement, type: string): void {
  if (tab.querySelector(`.${type}-badge`)) return;
  const badge = document.createElement('span');
  badge.className = `tab-badge ${type}-badge hidden`;
  badge.id = `${type}-tab-badge`;
  badge.textContent = '0';
  const label = tab.querySelector('.tab-label');
  if (label) label.appendChild(badge);
  else tab.appendChild(badge);
  console.log(`[TabBadge] ${type.toUpperCase()} tab badge added`);
}

function _addBadgeToGitTab(): void {
  let tab = document.querySelector('[data-tab-id="git"]') as HTMLElement | null;

  if (!tab) {
    const tabs = document.querySelectorAll('.explorer-tab, .explorer-tab-v3');
    tabs.forEach(t => {
      const label = t.querySelector('.tab-label');
      if (label && label.textContent?.trim().toUpperCase() === 'GIT') {
        tab = t as HTMLElement;
      }
    });
  }

  if (!tab) {
    console.warn('[TabBadge] GIT tab not found');
    return;
  }
  _addBadgeToTab(tab, 'git');
}

// ── Public API ───────────────────────────────────────────────

/**
 * Update the Git tab badge with the count of uncommitted changes.
 * If count is omitted, reads from window.gitStatus automatically.
 */
export function updateGitTabBadge(count?: number): void {
  const badge = document.getElementById('git-tab-badge');
  if (!badge) return;

  if (count === undefined) {
    const gitStatus = (window as any).gitStatus || {};
    const modified   = gitStatus.modified?.length  || 0;
    const untracked  = gitStatus.untracked?.length || 0;
    const staged     = gitStatus.staged?.length    || 0;
    count = modified + untracked + staged;

    if (staged > 0 && modified === 0 && untracked === 0) {
      badge.classList.add('staged');
    } else {
      badge.classList.remove('staged');
    }
  }

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.remove('hidden');
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 300);
  } else {
    badge.classList.add('hidden');
  }
}

function _setupBadgeUpdateListeners(): void {
  document.addEventListener('git-status-updated', (e: any) => {
    const d = e.detail || {};
    const count = (d.modified?.length || 0) + (d.untracked?.length || 0) + (d.staged?.length || 0);
    updateGitTabBadge(count);
  });

  window.addEventListener('git-status-changed', () => updateGitTabBadge());

  setInterval(() => updateGitTabBadge(), 5000);
  setTimeout(() => updateGitTabBadge(), 2000);

  console.log('[TabBadge] Update listeners ready');
}

/**
 * Initialize the entire tab badge system.
 * Call once after DOM is ready.
 */
export function initializeTabBadges(): void {
  console.log('[TabBadge] Initializing...');
  _injectBadgeStyles();
  setTimeout(() => {
    _addBadgeToGitTab();
    _setupBadgeUpdateListeners();
  }, 1000);
}

// Expose to window for external callers
(window as any).updateGitTabBadge = updateGitTabBadge;
