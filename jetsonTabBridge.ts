// ============================================================================
// jetsonTabBridge.ts - Wires Jetson Panel into the IDE UI
// Location: src/jetson/jetsonTabBridge.ts
//
// CREATES three visible entry points:
//   1. Lightning GPU button in menu bar (after Run, before Plugin)
//   2. Lightning GPU item in bottom status bar (next to Surgical / Backups)
//   3. "Deploy to Jetson" item in Run dropdown
//   4. window.openJetsonDemoTab() for DevTools
// ============================================================================
import { openJetsonDemoTab } from './jetsonDemoTab';

(window as any).openJetsonDemoTab = openJetsonDemoTab;

// ============================================================================
// 1. MENU BAR BUTTON (top: File Project View Git Run [GPU] Plugin)
// ============================================================================
function createMenuBarButton(): void {
  if (document.getElementById('jetson-menubar-btn')) return;
  const menuBar = document.querySelector('.menu-bar') as HTMLElement;
  if (!menuBar) { setTimeout(createMenuBarButton, 2000); return; }

  const btn = document.createElement('div');
  btn.id = 'jetson-menubar-btn';
  btn.style.cssText = `
    padding: 0 14px; height: 30px; display: flex; align-items: center;
    gap: 6px; cursor: pointer; color: #76b900; font-size: 13px;
    transition: all 0.2s; user-select: none;
    border-right: 1px solid rgba(255,255,255,0.08);
  `;
  btn.innerHTML = '\u26A1 <span>GPU</span>';
  btn.title = 'Open Jetson Deploy Panel';

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(118,185,0,0.15)'; btn.style.color = '#8fd400';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent'; btn.style.color = '#76b900';
  });
  btn.addEventListener('click', (e) => { e.stopPropagation(); openJetsonDemoTab(); });

  // Insert after "Run"
  let inserted = false;
  for (const child of Array.from(menuBar.children)) {
    if ((child.textContent || '').trim() === 'Run') {
      child.nextSibling ? menuBar.insertBefore(btn, child.nextSibling) : menuBar.appendChild(btn);
      inserted = true; break;
    }
  }
  if (!inserted) {
    for (const child of Array.from(menuBar.children)) {
      if ((child.textContent || '').trim() === 'Plugin') {
        menuBar.insertBefore(btn, child); inserted = true; break;
      }
    }
  }
  if (!inserted) menuBar.appendChild(btn);
  console.log('[Jetson] Menu bar GPU button created');
}

// ============================================================================
// 2. STATUS BAR ITEM (bottom: ... Surgical | Backups 1 | [GPU])
// ============================================================================
function createStatusBarItem(): void {
  if (document.getElementById('jetson-status-item')) return;
  const bar = document.querySelector('.status-bar-right') as HTMLElement
    || document.querySelector('.status-bar') as HTMLElement;
  if (!bar) { setTimeout(createStatusBarItem, 2000); return; }

  const item = document.createElement('div');
  item.id = 'jetson-status-item';
  item.style.cssText = `
    display: inline-flex; align-items: center; gap: 4px;
    padding: 0 10px; height: 100%; cursor: pointer;
    color: #76b900; font-size: 11px; font-weight: 600;
    transition: all 0.2s; border-left: 1px solid rgba(255,255,255,0.08);
    user-select: none;
  `;
  item.innerHTML = '\u26A1 GPU';
  item.title = 'Open Jetson Deploy Panel';

  item.addEventListener('mouseenter', () => { item.style.background = 'rgba(118,185,0,0.15)'; });
  item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
  item.addEventListener('click', (e) => { e.stopPropagation(); openJetsonDemoTab(); });

  const anchor = bar.querySelector('[title*="Visit"]') || bar.querySelector('[class*="visit"]');
  anchor ? bar.insertBefore(item, anchor) : bar.appendChild(item);
  console.log('[Jetson] Status bar GPU item created');
}

// ============================================================================
// 3. "Deploy to Jetson" IN RUN DROPDOWN
// ============================================================================
function watchRunDropdown(): void {
  function inject(): boolean {
    const dd = document.querySelector('.build-system-dropdown,.run-dropdown') as HTMLElement;
    if (!dd || dd.querySelector('.jetson-run-item')) return false;

    const sep = document.createElement('div');
    sep.className = 'jetson-run-item';
    sep.style.cssText = 'height:1px;background:#3e3e42;margin:4px 0;';

    const item = document.createElement('div');
    item.className = 'jetson-run-item';
    item.style.cssText = `
      padding: 6px 14px; cursor: pointer; font-size: 12px;
      display: flex; align-items: center; gap: 8px;
      color: #cccccc; white-space: nowrap;
    `;
    item.innerHTML = '<span style="color:#76b900;">\u26A1</span> Deploy to Jetson';

    item.addEventListener('mouseenter', () => { item.style.background = '#094771'; item.style.color = '#fff'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; item.style.color = '#cccccc'; });
    item.addEventListener('click', (e) => { e.stopPropagation(); openJetsonDemoTab(); dd.style.display = 'none'; });

    dd.appendChild(sep);
    dd.appendChild(item);
    return true;
  }

  const observer = new MutationObserver(() => { inject(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 60000);
}

// ============================================================================
// PUBLIC: Update status when connected/disconnected
// ============================================================================
export function updateGPUStatus(connected: boolean, name?: string): void {
  const item = document.getElementById('jetson-status-item');
  if (!item) return;
  if (connected) {
    item.innerHTML = '\u26A1 <span style="color:#3fb950;">\u25CF</span> ' + (name || 'Jetson');
    item.title = 'Connected to ' + (name || 'Jetson');
  } else {
    item.innerHTML = '\u26A1 GPU';
    item.title = 'Open Jetson Deploy Panel';
  }
}

// ============================================================================
// Initialize
// ============================================================================
export function initJetsonTabBridge(): void {
  setTimeout(() => {
    createMenuBarButton();
    createStatusBarItem();
    watchRunDropdown();
    console.log('[Jetson] Tab bridge ready');
  }, 2500);
}
