// ui/tabBadges.ts
// Tab badge system (GIT tab change count badge)
// Extracted from main.ts.
// Sets (window as any).updateGitTabBadge for external access.

export function initializeTabBadges(): void {
  console.log('??? Initializing tab badge system...');
  
  // Add badge styles
  const badgeStyles = document.createElement('style');
  badgeStyles.id = 'tab-badge-styles';
  badgeStyles.textContent = `
    /* Tab badge base styles */
    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 5px;
      margin-left: 6px;
      font-size: 10px;
      font-weight: 600;
      color: #fff;
      background: #007acc;
      border-radius: 8px;
      line-height: 1;
      transition: all 0.2s ease;
    }
    
    /* GIT tab badge - red for changes, green for staged */
    .tab-badge.git-badge {
      background: #f05033;
      color: #fff;
    }
    
    .tab-badge.git-badge.staged {
      background: #89d185;
      color: #1e1e1e;
    }
    
    /* Hide badge when count is 0 */
    .tab-badge.hidden {
      display: none;
    }
    
    /* Pulse animation for new changes */
    @keyframes badgePulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    
    .tab-badge.pulse {
      animation: badgePulse 0.3s ease;
    }
    
    /* Tab label container */
    .explorer-tab .tab-label,
    .explorer-tab-v3 .tab-label {
      display: inline-flex;
      align-items: center;
    }
  `;
  
  if (!document.getElementById('tab-badge-styles')) {
    document.head.appendChild(badgeStyles);
  }
  
  // Wait for tabs to be available
  setTimeout(() => {
    addBadgeToGitTab();
    setupBadgeUpdateListeners();
  }, 1000);
}

/**
 * Add badge to GIT tab
 */
function addBadgeToGitTab(): void {
  // Find GIT tab
  const gitTab = document.querySelector('[data-tab-id="git"]') as HTMLElement;
  
  if (!gitTab) {
    // Try finding by label
    const tabs = document.querySelectorAll('.explorer-tab, .explorer-tab-v3');
    let foundTab: HTMLElement | null = null;
    
    tabs.forEach(tab => {
      const label = tab.querySelector('.tab-label');
      if (label && label.textContent?.trim().toUpperCase() === 'GIT') {
        foundTab = tab as HTMLElement;
      }
    });
    
    if (!foundTab) {
      console.warn('GIT tab not found');
      return;
    }
    
    addBadgeToTab(foundTab, 'git');
    return;
  }
  
  addBadgeToTab(gitTab, 'git');
}

function addBadgeToTab(tab: HTMLElement, type: string): void {
  // Check if badge already exists
  if (tab.querySelector(`.${type}-badge`)) return;
  
  // Create badge
  const badge = document.createElement('span');
  badge.className = `tab-badge ${type}-badge hidden`;
  badge.id = `${type}-tab-badge`;
  badge.textContent = '0';
  
  // Add badge to tab label
  const label = tab.querySelector('.tab-label');
  if (label) {
    label.appendChild(badge);
  } else {
    tab.appendChild(badge);
  }
  
  console.log(`? ${type.toUpperCase()} tab badge added`);
}

/**
 * Update GIT tab badge with uncommitted changes count
 */
function updateGitTabBadge(count?: number): void {
  const badge = document.getElementById('git-tab-badge');
  if (!badge) return;
  
  // If count not provided, try to get from git status
  if (count === undefined) {
    const gitStatus = (window as any).gitStatus || {};
    const modified = gitStatus.modified?.length || 0;
    const untracked = gitStatus.untracked?.length || 0;
    const staged = gitStatus.staged?.length || 0;
    count = modified + untracked + staged;
    
    // Change color if all are staged
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

/**
 * Setup listeners to update GIT badge automatically
 */
function setupBadgeUpdateListeners(): void {
  // Listen for git status changes
  document.addEventListener('git-status-updated', (e: any) => {
    const detail = e.detail || {};
    const count = (detail.modified?.length || 0) + 
                  (detail.untracked?.length || 0) + 
                  (detail.staged?.length || 0);
    updateGitTabBadge(count);
  });
  
  window.addEventListener('git-status-changed', () => {
    updateGitTabBadge();
  });
  
  // Periodic update for GIT badge (every 5 seconds)
  setInterval(() => {
    updateGitTabBadge();
  }, 5000);
  
  // Initial update
  setTimeout(() => {
    updateGitTabBadge();
  }, 2000);
  
  console.log('? GIT badge update listeners setup complete');
}

// Export function for external use
(window as any).updateGitTabBadge = updateGitTabBadge;