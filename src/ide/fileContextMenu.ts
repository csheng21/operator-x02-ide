// src/ide/fileContextMenu.ts
// Professional Animated File/Folder Context Menu
// Modern UI with glassmorphism and smooth animations
// ✅ UPDATED: Added SVN Integration

console.log('📁 [FileContextMenu] Loading professional context menu with SVN support...');

// ============================================================================
// SVN IMPORTS - Add these at the top of your file
// ============================================================================

import { svnManager } from './svn/svnManager';
import { enhancedSvnUI } from './svn/svnUIEnhanced';

// ============================================================================
// STYLES (Add SVN submenu styles)
// ============================================================================

const styles = `
/* Professional File Context Menu */
.file-context-menu {
  position: fixed;
  background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 6px;
  min-width: 220px;
  max-width: 280px;
  z-index: 10001;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  transform-origin: top left;
  animation: fileMenuSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  overflow: visible; /* Changed for submenu */
}

.file-context-menu::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

@keyframes fileMenuSlideIn {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.file-context-menu.closing {
  animation: fileMenuSlideOut 0.15s ease-out forwards;
  pointer-events: none;
}

@keyframes fileMenuSlideOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
}

/* Menu Header */
.file-menu-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 4px;
}

.file-menu-header-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-menu-header-icon.file-icon {
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
}

.file-menu-header-icon.folder-icon {
  background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
}

.file-menu-header-icon svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.file-menu-header-info {
  flex: 1;
  min-width: 0;
}

.file-menu-header-name {
  font-size: 12px;
  font-weight: 600;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-menu-header-path {
  font-size: 10px;
  color: #7d8590;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* Menu Items */
.file-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  color: #d4d4d4;
  border-radius: 6px;
  margin: 1px 0;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.file-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  border-radius: 0 2px 2px 0;
  transition: all 0.15s ease;
}

.file-menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  transform: translateX(2px);
}

.file-menu-item:hover::before {
  background: #4fc3f7;
}

.file-menu-item:active {
  transform: translateX(2px) scale(0.98);
  background: rgba(255, 255, 255, 0.08);
}

.file-menu-item.danger:hover {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.file-menu-item.danger:hover::before {
  background: #f44336;
}

.file-menu-item.danger:hover .file-menu-icon {
  color: #f44336;
}

/* Menu Icon */
.file-menu-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.file-menu-icon svg {
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease;
}

.file-menu-item:hover .file-menu-icon {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.05);
}

.file-menu-item:hover .file-menu-icon svg {
  transform: scale(1.1);
}

/* Menu Text */
.file-menu-text {
  flex: 1;
  font-size: 12.5px;
  font-weight: 450;
  letter-spacing: -0.01em;
}

/* Keyboard Shortcut */
.file-menu-shortcut {
  font-size: 10px;
  color: #666;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  letter-spacing: 0.5px;
  transition: all 0.15s ease;
}

.file-menu-item:hover .file-menu-shortcut {
  background: rgba(255, 255, 255, 0.1);
  color: #888;
}

/* Divider */
.file-menu-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 5%, rgba(255, 255, 255, 0.08) 50%, transparent 95%);
  margin: 6px 8px;
}

/* Section Header */
.file-menu-section {
  padding: 6px 10px 4px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-menu-section::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent);
}

/* Special item styles */
.file-menu-item.primary .file-menu-icon {
  background: rgba(79, 195, 247, 0.15);
  color: #4fc3f7;
}

.file-menu-item.primary:hover {
  background: rgba(79, 195, 247, 0.1);
}

.file-menu-item.primary:hover .file-menu-icon {
  background: rgba(79, 195, 247, 0.25);
}

.file-menu-item.success .file-menu-icon {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.file-menu-item.success:hover {
  background: rgba(76, 175, 80, 0.1);
}

/* ============================================ */
/* ✅ NEW: SVN Menu Item Styles */
/* ============================================ */

.file-menu-item.svn .file-menu-icon {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.file-menu-item.svn:hover {
  background: rgba(255, 152, 0, 0.1);
}

.file-menu-item.svn:hover .file-menu-icon {
  background: rgba(255, 152, 0, 0.25);
}

.file-menu-item.has-submenu {
  overflow: visible;
}

.file-menu-item.has-submenu .file-menu-arrow {
  color: #666;
  font-size: 10px;
  transition: transform 0.15s ease;
}

.file-menu-item.has-submenu:hover .file-menu-arrow {
  color: #fff;
  transform: translateX(2px);
}

/* SVN Submenu */
.svn-submenu {
  position: absolute;
  left: calc(100% + 4px);
  top: 0;
  background: linear-gradient(135deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px;
  min-width: 180px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  z-index: 10002;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-8px);
  transition: all 0.15s ease;
}

.file-menu-item.has-submenu:hover .svn-submenu {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.svn-submenu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  color: #d4d4d4;
  border-radius: 6px;
  margin: 1px 0;
  transition: all 0.15s ease;
  font-size: 12.5px;
}

.svn-submenu-item:hover {
  background: rgba(255, 152, 0, 0.15);
  color: #fff;
}

.svn-submenu-item .svn-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 5px;
  font-size: 12px;
}

.svn-submenu-item:hover .svn-icon {
  background: rgba(255, 152, 0, 0.2);
}

/* SVN Status Badge */
.svn-status-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  margin-left: auto;
}

.svn-status-badge.modified {
  background: rgba(255, 152, 0, 0.2);
  color: #ff9800;
}

.svn-status-badge.unversioned {
  background: rgba(156, 39, 176, 0.2);
  color: #ce93d8;
}

.svn-status-badge.added {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

/* Toast notification for copy */
.file-menu-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(30, 30, 35, 0.95);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 10px 20px;
  color: #4caf50;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  z-index: 10002;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  animation: toastIn 0.3s ease forwards;
}

.file-menu-toast svg {
  width: 16px;
  height: 16px;
}

@keyframes toastIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.file-menu-toast.hiding {
  animation: toastOut 0.2s ease forwards;
}

@keyframes toastOut {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
}

/* Rename input */
.file-rename-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(79, 195, 247, 0.5);
  border-radius: 4px;
  padding: 4px 8px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.file-rename-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.2);
}

/* Confirmation dialog */
.file-confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10003;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  animation: dialogFadeIn 0.2s ease forwards;
}

@keyframes dialogFadeIn {
  to { opacity: 1; }
}

.file-confirm-content {
  background: linear-gradient(135deg, #2d2d30 0%, #1e1e1e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transform: scale(0.95);
  animation: dialogContentIn 0.2s ease forwards;
}

@keyframes dialogContentIn {
  to { transform: scale(1); }
}

.file-confirm-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-confirm-title svg {
  color: #f44336;
}

.file-confirm-message {
  font-size: 13px;
  color: #aaa;
  margin-bottom: 20px;
  line-height: 1.5;
}

.file-confirm-filename {
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #fff;
}

.file-confirm-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.file-confirm-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.file-confirm-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
}

.file-confirm-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.file-confirm-btn.danger {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: #fff;
}

.file-confirm-btn.danger:hover {
  background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}
`;

// ============================================================================
// SVG ICONS (Added SVN icons)
// ============================================================================

const icons = {
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  open: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  newFile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  newFolder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  duplicate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/></svg>`,
  
  // ✅ NEW: SVN Icons
  svn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><path d="M12 22V12"/><path d="M2 7l10 5 10-5"/></svg>`,
  svnCommit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="8"/><polyline points="8,4 12,2 16,4"/></svg>`,
  svnUpdate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  svnDiff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  svnHistory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
  svnRevert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  svnAdd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
};

// ============================================================================
// INJECT STYLES
// ============================================================================

function injectStyles(): void {
  if (!document.getElementById('file-context-menu-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'file-context-menu-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// MENU CREATION
// ============================================================================

interface MenuItemConfig {
  icon: string;
  text: string;
  action: string;
  shortcut?: string;
  className?: string;
}

function createMenuItem(config: MenuItemConfig): HTMLElement {
  const item = document.createElement('div');
  item.className = `file-menu-item ${config.className || ''}`;
  item.dataset.action = config.action;
  
  item.innerHTML = `
    <div class="file-menu-icon">${config.icon}</div>
    <span class="file-menu-text">${config.text}</span>
    ${config.shortcut ? `<span class="file-menu-shortcut">${config.shortcut}</span>` : ''}
  `;
  
  return item;
}

// ============================================================================
// ✅ NEW: SVN SUBMENU CREATION
// ============================================================================

function createSvnSubmenu(filePath: string, isDirectory: boolean): HTMLElement {
  const submenu = document.createElement('div');
  submenu.className = 'svn-submenu';
  
  const svnItems = [
    { icon: '🔄', label: 'Commit...', action: 'svn-commit' },
    { icon: '↓', label: 'Update', action: 'svn-update' },
    { icon: '📊', label: 'Diff', action: 'svn-diff' },
    { icon: '📜', label: 'History', action: 'svn-history' },
    { icon: '↩', label: 'Revert', action: 'svn-revert' },
    { icon: '➕', label: 'Add', action: 'svn-add' },
    { divider: true },
    { icon: '🐢', label: 'TortoiseSVN', action: 'svn-tortoise' },
  ];
  
  svnItems.forEach(item => {
    if ('divider' in item && item.divider) {
      const divider = document.createElement('div');
      divider.className = 'file-menu-divider';
      submenu.appendChild(divider);
  // X02 FIX: Smooth pop-in
  menu.style.opacity = "0";
  menu.style.transform = "translateY(-6px) scale(0.97)";
  menu.style.transition = "opacity 0.13s ease, transform 0.13s cubic-bezier(0.22,1,0.36,1)";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      menu.style.opacity = "1";
      menu.style.transform = "translateY(0) scale(1)";
    });
  });
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'svn-submenu-item';
      menuItem.dataset.action = item.action;
      menuItem.innerHTML = `
        <span class="svn-icon">${item.icon}</span>
        <span>${item.label}</span>
      `;
      
      menuItem.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Close menu
        document.querySelectorAll('.file-context-menu').forEach(m => {
          m.classList.add('closing');
          setTimeout(() => m.remove(), 150);
        });
        // Execute SVN action
        await handleSvnAction(item.action!, filePath, isDirectory);
      });
      
      submenu.appendChild(menuItem);
    }
  });
  
  return submenu;
}

// ============================================================================
// ✅ NEW: SVN ACTION HANDLERS
// ============================================================================

async function handleSvnAction(action: string, filePath: string, isDirectory: boolean): Promise<void> {
  console.log(`🔄 [SVN] Action: ${action} for ${filePath}`);
  
  try {
    switch (action) {
      case 'svn-commit':
        // Open SVN panel with commit view
        await enhancedSvnUI.show();
        enhancedSvnUI.switchView?.('commit');
        // Pre-select this file
        if (enhancedSvnUI.selectFile) {
          enhancedSvnUI.selectFile(filePath);
        }
        showToast('SVN panel opened');
        break;
        
      case 'svn-update':
        showToast('🔄 Updating...', 'info');
        await svnManager.update(isDirectory ? filePath : getParentPath(filePath));
        showToast('✅ Update complete');
        // Refresh file tree
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        break;
        
      case 'svn-diff':
        await enhancedSvnUI.show();
        enhancedSvnUI.switchView?.('diff');
        if (enhancedSvnUI.showFileDiff) {
          enhancedSvnUI.showFileDiff(filePath);
        }
        break;
        
      case 'svn-history':
        await enhancedSvnUI.show();
        enhancedSvnUI.switchView?.('history');
        if (enhancedSvnUI.loadHistoryForFile) {
          enhancedSvnUI.loadHistoryForFile(filePath);
        }
        break;
        
      case 'svn-revert':
        const fileName = filePath.split(/[/\\]/).pop() || 'file';
        if (confirm(`Revert changes to "${fileName}"?\n\nThis cannot be undone!`)) {
          await svnManager.revert([filePath]);
          showToast('✅ File reverted');
          // Refresh file tree and editor
          document.dispatchEvent(new CustomEvent('file-tree-refresh'));
          // Refresh editor if open
          if ((window as any).tabManager?.refreshTab) {
            (window as any).tabManager.refreshTab(filePath);
          }
        }
        break;
        
      case 'svn-add':
        await svnManager.add([filePath]);
        showToast('✅ File added to SVN');
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        break;
        
      case 'svn-tortoise':
        await svnManager.openTortoiseSVN('reposbrowser', filePath);
        break;
    }
  } catch (error) {
    console.error(`❌ [SVN] ${action} failed:`, error);
    showToast(`SVN ${action.replace('svn-', '')} failed`, 'error');
  }
}

function getParentPath(filePath: string): string {
  return filePath.split(/[/\\]/).slice(0, -1).join(filePath.includes('/') ? '/' : '\\');
}

// ============================================================================
// MAIN MENU CREATION (Updated with SVN)
// ============================================================================

function createMenu(x: number, y: number, filePath: string, isDirectory: boolean): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'file-context-menu';
  
  // Extract file name from path
  const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
  const parentPath = filePath.split(/[/\\]/).slice(0, -1).join('/');
  
  // Header with file info
  const header = document.createElement('div');
  header.className = 'file-menu-header';
  header.innerHTML = `
    <div class="file-menu-header-icon ${isDirectory ? 'folder-icon' : 'file-icon'}">
      ${isDirectory ? icons.folder : icons.file}
    </div>
    <div class="file-menu-header-info">
      <div class="file-menu-header-name">${fileName}</div>
      <div class="file-menu-header-path">${parentPath || 'Project root'}</div>
    </div>
  `;
  menu.appendChild(header);
  
  // Menu items based on type
  const items: (MenuItemConfig | 'divider' | { section: string })[] = isDirectory ? [
    { icon: icons.open, text: 'Open Folder', action: 'open-folder', className: 'primary' },
    'divider',
    { icon: icons.newFile, text: 'New File', action: 'new-file', shortcut: 'Ctrl+N' },
    { icon: icons.newFolder, text: 'New Folder', action: 'new-folder', shortcut: 'Ctrl+Shift+N' },
    'divider',
    { icon: icons.terminal, text: 'Open Terminal Here', action: 'open-terminal' },
    { icon: icons.explorer, text: 'Reveal in Explorer', action: 'reveal-explorer' },
    'divider',
    { icon: icons.copy, text: 'Copy Path', action: 'copy-path' },
    { icon: icons.rename, text: 'Rename', action: 'rename', shortcut: 'F2' },
    { icon: icons.delete, text: 'Delete', action: 'delete', shortcut: 'Del', className: 'danger' },
  ] : [
    { icon: icons.open, text: 'Open File', action: 'open-file', className: 'primary' },
    { icon: icons.duplicate, text: 'Duplicate', action: 'duplicate' },
    'divider',
    { icon: icons.newFile, text: 'New File', action: 'new-file', shortcut: 'Ctrl+N' },
    { icon: icons.newFolder, text: 'New Folder', action: 'new-folder' },
    'divider',
    { icon: icons.terminal, text: 'Open Terminal Here', action: 'open-terminal' },
    { icon: icons.explorer, text: 'Reveal in Explorer', action: 'reveal-explorer' },
    'divider',
    { icon: icons.copy, text: 'Copy Path', action: 'copy-path' },
    { icon: icons.rename, text: 'Rename', action: 'rename', shortcut: 'F2' },
    { icon: icons.delete, text: 'Delete', action: 'delete', shortcut: 'Del', className: 'danger' },
  ];
  
  items.forEach(item => {
    if (item === 'divider') {
      const divider = document.createElement('div');
      divider.className = 'file-menu-divider';
      menu.appendChild(divider);
    } else if ('section' in item) {
      const section = document.createElement('div');
      section.className = 'file-menu-section';
      section.textContent = item.section;
      menu.appendChild(section);
    } else {
      const menuItem = createMenuItem(item);
      menuItem.addEventListener('click', () => handleAction(item.action, filePath, isDirectory, menu));
      menu.appendChild(menuItem);
    }
  });
  
  // ✅ NEW: Add SVN menu item with submenu
  addSvnMenuItem(menu, filePath, isDirectory);
  
  // Position menu
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  // Adjust position if menu would go off screen
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const padding = 10;
    
    if (rect.right > window.innerWidth - padding) {
      menu.style.left = `${window.innerWidth - rect.width - padding}px`;
    }
    if (rect.bottom > window.innerHeight - padding) {
      menu.style.top = `${window.innerHeight - rect.height - padding}px`;
    }
  });
  
  return menu;
}

// ============================================================================
// ✅ NEW: ADD SVN MENU ITEM
// ============================================================================

async function addSvnMenuItem(menu: HTMLElement, filePath: string, isDirectory: boolean): Promise<void> {
  // Check if project is SVN working copy
  const projectPath = (window as any).currentFolderPath || 
                      localStorage.getItem('currentProjectPath') || 
                      getParentPath(filePath);
  
  try {
    const isSvn = await svnManager.isWorkingCopy(projectPath);
    
    if (!isSvn) {
      console.log('📁 Not an SVN working copy, skipping SVN menu');
      return;
    }
    
    // Add divider before SVN
    const divider = document.createElement('div');
    divider.className = 'file-menu-divider';
    menu.appendChild(divider);
    
    // Create SVN menu item with submenu
    const svnItem = document.createElement('div');
    svnItem.className = 'file-menu-item svn has-submenu';
    svnItem.innerHTML = `
      <div class="file-menu-icon">${icons.svn}</div>
      <span class="file-menu-text">SVN</span>
      <span class="file-menu-arrow">▶</span>
    `;
    
    // Create and append submenu
    const submenu = createSvnSubmenu(filePath, isDirectory);
    svnItem.appendChild(submenu);
    
    menu.appendChild(svnItem);
    
    console.log('✅ SVN menu item added');
    
  } catch (error) {
    console.log('⚠️ SVN check failed, skipping SVN menu:', error);
  }
}

// ============================================================================
// ACTIONS (Original handlers)
// ============================================================================

async function handleAction(action: string, filePath: string, isDirectory: boolean, menu: HTMLElement): Promise<void> {
  // Close menu first
  closeMenu(menu);
  
  const fileName = filePath.split(/[/\\]/).pop() || '';
  const parentPath = filePath.split(/[/\\]/).slice(0, -1).join(filePath.includes('/') ? '/' : '\\');
  
  switch (action) {
    case 'open-file':
      const fileItem = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`) as HTMLElement;
      if (fileItem) {
        fileItem.click();
      }
      break;
      
    case 'open-folder':
      const folderItem = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`) as HTMLElement;
      if (folderItem) {
        folderItem.click();
      }
      break;
      
    case 'new-file':
      if ((window as any).createNewFile) {
        (window as any).createNewFile(isDirectory ? filePath : parentPath);
      } else if ((window as any).showCreateDialog) {
        (window as any).showCreateDialog('file', isDirectory ? filePath : parentPath);
      }
      break;
      
    case 'new-folder':
      if ((window as any).createNewFolder) {
        (window as any).createNewFolder(isDirectory ? filePath : parentPath);
      } else if ((window as any).showCreateDialog) {
        (window as any).showCreateDialog('folder', isDirectory ? filePath : parentPath);
      }
      break;
      
    case 'open-terminal':
      const terminalPath = isDirectory ? filePath : parentPath;
      if ((window as any).openTerminalAt) {
        (window as any).openTerminalAt(terminalPath);
      } else {
        document.dispatchEvent(new CustomEvent('open-terminal', { detail: { path: terminalPath } }));
      }
      break;
      
    case 'reveal-explorer':
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('show_in_folder', { path: filePath });
      } catch (e) {
        console.error('Failed to reveal in explorer:', e);
        showToast('Failed to open file explorer', 'error');
      }
      break;
      
    case 'copy-path':
      try {
        await navigator.clipboard.writeText(filePath);
        showToast('Path copied to clipboard');
      } catch (e) {
        console.error('Failed to copy path:', e);
      }
      break;
      
    case 'rename':
      showRenameDialog(filePath, fileName, isDirectory);
      break;
      
    case 'delete':
      showDeleteConfirmation(filePath, fileName, isDirectory);
      break;
      
    case 'duplicate':
      await duplicateFile(filePath, fileName);
      break;
  }
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  document.querySelectorAll('.file-menu-toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = 'file-menu-toast';
  
  const colors = {
    success: 'rgba(76, 175, 80, 0.3)',
    error: 'rgba(244, 67, 54, 0.3)',
    info: 'rgba(33, 150, 243, 0.3)'
  };
  const textColors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3'
  };
  
  toast.style.borderColor = colors[type];
  toast.style.color = textColors[type];
  toast.innerHTML = `${icons.check}<span>${message}</span>`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

// ============================================================================
// RENAME DIALOG
// ============================================================================

function showRenameDialog(filePath: string, fileName: string, isDirectory: boolean): void {
  const overlay = document.createElement('div');
  overlay.className = 'file-confirm-dialog';
  
  const ext = isDirectory ? '' : (fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '');
  const baseName = isDirectory ? fileName : fileName.replace(ext, '');
  
  overlay.innerHTML = `
    <div class="file-confirm-content">
      <div class="file-confirm-title">
        ${isDirectory ? icons.folder : icons.file}
        <span>Rename ${isDirectory ? 'Folder' : 'File'}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <input type="text" class="file-rename-input" value="${baseName}" data-ext="${ext}">
      </div>
      <div class="file-confirm-buttons">
        <button class="file-confirm-btn cancel">Cancel</button>
        <button class="file-confirm-btn" style="background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%); color: #000;">Rename</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const input = overlay.querySelector('.file-rename-input') as HTMLInputElement;
  const cancelBtn = overlay.querySelector('.file-confirm-btn.cancel') as HTMLButtonElement;
  const renameBtn = overlay.querySelector('.file-confirm-btn:not(.cancel)') as HTMLButtonElement;
  
  input.focus();
  input.select();
  
  const closeDialog = () => {
    overlay.style.animation = 'dialogFadeIn 0.15s ease reverse';
    setTimeout(() => overlay.remove(), 150);
  };
  
  const performRename = async () => {
    const newName = input.value.trim() + (overlay.querySelector('.file-rename-input') as HTMLInputElement).dataset.ext;
    if (!newName || newName === fileName) {
      closeDialog();
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const parentPath = filePath.substring(0, filePath.lastIndexOf(filePath.includes('/') ? '/' : '\\'));
      const newPath = parentPath + (filePath.includes('/') ? '/' : '\\') + newName;
      
      await invoke('rename_file', { oldPath: filePath, newPath });
      showToast(`Renamed to ${newName}`);
      
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
    } catch (e) {
      console.error('Failed to rename:', e);
      showToast('Failed to rename', 'error');
    }
    
    closeDialog();
  };
  
  cancelBtn.addEventListener('click', closeDialog);
  renameBtn.addEventListener('click', performRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performRename();
    if (e.key === 'Escape') closeDialog();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });
}

// ============================================================================
// DELETE CONFIRMATION
// ============================================================================

function showDeleteConfirmation(filePath: string, fileName: string, isDirectory: boolean): void {
  const overlay = document.createElement('div');
  overlay.className = 'file-confirm-dialog';
  
  overlay.innerHTML = `
    <div class="file-confirm-content">
      <div class="file-confirm-title">
        ${icons.warning}
        <span>Delete ${isDirectory ? 'Folder' : 'File'}</span>
      </div>
      <div class="file-confirm-message">
        Are you sure you want to delete <span class="file-confirm-filename">${fileName}</span>?
        ${isDirectory ? '<br><br>This will delete all contents inside the folder.' : ''}
        <br><br>This action cannot be undone.
      </div>
      <div class="file-confirm-buttons">
        <button class="file-confirm-btn cancel">Cancel</button>
        <button class="file-confirm-btn danger">Delete</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const cancelBtn = overlay.querySelector('.file-confirm-btn.cancel') as HTMLButtonElement;
  const deleteBtn = overlay.querySelector('.file-confirm-btn.danger') as HTMLButtonElement;
  
  const closeDialog = () => {
    overlay.style.animation = 'dialogFadeIn 0.15s ease reverse';
    setTimeout(() => overlay.remove(), 150);
  };
  
  const performDelete = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      if (isDirectory) {
        await invoke('delete_directory', { path: filePath });
      } else {
        await invoke('delete_file', { path: filePath });
      }
      
      showToast(`Deleted ${fileName}`);
      document.dispatchEvent(new CustomEvent('file-tree-refresh'));
    } catch (e) {
      console.error('Failed to delete:', e);
      showToast('Failed to delete', 'error');
    }
    
    closeDialog();
  };
  
  cancelBtn.addEventListener('click', closeDialog);
  deleteBtn.addEventListener('click', performDelete);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });
}

// ============================================================================
// DUPLICATE FILE
// ============================================================================

async function duplicateFile(filePath: string, fileName: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const { readTextFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
    
    const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
    const baseName = fileName.replace(ext, '');
    const parentPath = filePath.substring(0, filePath.lastIndexOf(filePath.includes('/') ? '/' : '\\'));
    const sep = filePath.includes('/') ? '/' : '\\';
    
    let newName = `${baseName} copy${ext}`;
    let counter = 1;
    let newPath = `${parentPath}${sep}${newName}`;
    
    try {
      while (true) {
        await readTextFile(newPath);
        counter++;
        newName = `${baseName} copy ${counter}${ext}`;
        newPath = `${parentPath}${sep}${newName}`;
      }
    } catch {
      // File doesn't exist, we can use this name
    }
    
    const content = await readTextFile(filePath);
    await writeTextFile(newPath, content);
    
    showToast(`Created ${newName}`);
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));
  } catch (e) {
    console.error('Failed to duplicate:', e);
    showToast('Failed to duplicate file', 'error');
  }
}

// ============================================================================
// CLOSE MENU
// ============================================================================

function closeMenu(menu: HTMLElement): void {
  menu.classList.add('closing');
  setTimeout(() => menu.remove(), 150);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeFileContextMenu(): void {
  console.log('📁 [FileContextMenu] Initializing with SVN support...');
  
  injectStyles();
  
  const defaultMenu = document.getElementById('context-menu');
  if (defaultMenu) {
    defaultMenu.style.display = 'none';
  }
  
  // DISABLED: fileClickHandlers.ts setupContextMenu() is the correct handler
  // It shows the full menu: Open/Create/Rename/Delete + AI Analysis submenu
  console.log('? [FileContextMenu] Skipping - fileClickHandlers handles context menu');
  return;

  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    const fileItem = target.closest('[data-path]') as HTMLElement;
    
    if (!fileItem) return;
    
    const inFileTree = fileItem.closest('.file-tree, #file-tree, #files-content, .file-container');
    if (!inFileTree) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const filePath = fileItem.getAttribute('data-path') || '';
    const isDirectory = fileItem.getAttribute('data-is-directory') === 'true' || 
                        fileItem.classList.contains('folder-item') ||
                        fileItem.classList.contains('directory');
    
    document.querySelectorAll('.file-context-menu').forEach(m => {
      m.classList.add('closing');
      setTimeout(() => m.remove(), 150);
    });
    
    const menu = createMenu(e.clientX, e.clientY, filePath, isDirectory);
    document.body.appendChild(menu);
    
    const closeHandler = (ev: MouseEvent) => {
      if (ev.button === 2) return; // FIX: ignore right-clicks (they open new context menu)
      if (!menu.contains(ev.target as Node)) {
        closeMenu(menu);
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 300); // FIX: was 10ms, too fast - right-click chain fires click within 10ms
    
    const escHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        closeMenu(menu);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }, true);
  
  console.log('✅ [FileContextMenu] Ready with SVN support!');
}

// Auto-initialize
initializeFileContextMenu();

export default initializeFileContextMenu;