// src/ide/projectFolderContextMenu.ts
// Professional UI with Quick & Deep Analysis Modes
// Right-click menu for project root folder

console.log('📁 [ProjectMenu] Loading with dual analysis modes...');

// ============================================================================
// STYLES
// ============================================================================

const styles = `
.project-context-menu {
  position: fixed;
  background: linear-gradient(180deg, #2d2d30 0%, #1e1e1e 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px;
  min-width: 280px;
  z-index: 10000;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  opacity: 0;
  transform: scale(0.92) translateY(-8px);
  animation: menuSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes menuSlideIn { to { opacity: 1; transform: scale(1) translateY(0); } }
.project-context-menu.closing { animation: menuSlideOut 0.18s ease-out forwards; pointer-events: none; }
@keyframes menuSlideOut { to { opacity: 0; transform: scale(0.95) translateY(-5px); } }

.project-menu-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  cursor: pointer; color: #d4d4d4; border-radius: 8px; margin: 2px 0;
  transition: all 0.18s ease; position: relative;
}
.project-menu-item:hover { color: #fff; background: rgba(255,255,255,0.05); transform: translateX(4px); }
.project-menu-item:active { transform: translateX(4px) scale(0.98); }
.project-menu-item.highlight { background: linear-gradient(90deg, rgba(79, 195, 247, 0.1) 0%, transparent 100%); }
.project-menu-item.highlight .project-menu-icon { color: #4fc3f7; }
.project-menu-item.highlight .project-menu-text { color: #4fc3f7; font-weight: 500; }
.project-menu-item.highlight:hover { background: linear-gradient(90deg, rgba(79, 195, 247, 0.2) 0%, transparent 100%); }
.project-menu-item.quick { background: linear-gradient(90deg, rgba(76, 175, 80, 0.1) 0%, transparent 100%); }
.project-menu-item.quick .project-menu-icon { color: #4caf50; }
.project-menu-item.quick .project-menu-text { color: #4caf50; font-weight: 500; }
.project-menu-item.quick:hover { background: linear-gradient(90deg, rgba(76, 175, 80, 0.2) 0%, transparent 100%); }
.project-menu-item.subtle { opacity: 0.6; }
.project-menu-item.subtle:hover { opacity: 1; }

.project-menu-icon {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05); border-radius: 8px; transition: all 0.2s ease;
}
.project-menu-icon svg { width: 16px; height: 16px; }
.project-menu-item:hover .project-menu-icon { background: rgba(255,255,255,0.1); transform: scale(1.05); }

.project-menu-text { flex: 1; font-size: 13px; }
.project-menu-desc { font-size: 10px; color: #888; margin-top: 2px; }
.project-menu-shortcut { font-size: 10px; color: #666; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 4px; }
.project-menu-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 8px 12px; }
.project-menu-header { padding: 10px 14px 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #666; display: flex; align-items: center; gap: 8px; }
.project-menu-header::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent); }

.ai-sparkle { animation: sparkle 2s ease-in-out infinite; }
@keyframes sparkle { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }

.context-badge { padding: 2px 8px; background: rgba(79, 195, 247, 0.15); border-radius: 10px; font-size: 10px; color: #4fc3f7; }
.token-badge { padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 8px; font-size: 9px; color: #888; margin-left: auto; }

/* Response Actions */
.ai-message-content { line-height: 1.5; font-size: 13px; }

/* ============================================================================ */
/* COLLAPSIBLE RESPONSE - PROFESSIONAL REDESIGN V2 */
/* ============================================================================ */

.analysis-collapsible { 
  position: relative;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  animation: collapsibleSlideIn 0.3s ease-out;
  border: 1px solid #333;
}
.analysis-collapsible:hover {
  border-color: #444;
}
@keyframes collapsibleSlideIn { 
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header Row */
.analysis-collapse-header { 
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.analysis-collapse-header:hover { 
  background: rgba(255,255,255,0.02); 
}

/* Icon - Dark IDE Theme */
.analysis-collapse-icon { 
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #2d2d30;
  border: 1px solid #3e3e42;
}
.analysis-collapse-icon svg { 
  width: 16px; 
  height: 16px; 
  color: #9cdcfe; 
}

/* Info Section - Better Alignment */
.analysis-collapse-info { 
  flex: 1; 
  min-width: 0; 
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.analysis-collapse-title { 
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Stats Row - Properly Aligned */
.analysis-collapse-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.analysis-stat-item {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}
.analysis-stat-value { 
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-right: 2px;
}
.analysis-stat-label { 
  font-weight: 400;
}
.analysis-stat-item.files .analysis-stat-value { color: #569cd6; }
.analysis-stat-item.size .analysis-stat-value { color: #c586c0; }
.analysis-stat-item.tokens .analysis-stat-value { color: #4ec9b0; }

/* Separator between stats */
.analysis-stat-separator {
  color: #555;
  margin: 0 4px;
  font-size: 10px;
}

/* Toggle Button */
.analysis-collapse-toggle { 
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  opacity: 0.6;
}
.analysis-collapsible:hover .analysis-collapse-toggle { opacity: 1; }
.analysis-collapse-toggle:hover { 
  background: rgba(255,255,255,0.06); 
}
.analysis-collapse-toggle svg { 
  width: 12px;
  height: 12px;
  color: #808080;
  transition: transform 0.2s ease;
}
.analysis-collapsible.expanded .analysis-collapse-toggle svg { 
  transform: rotate(180deg);
  color: #569cd6;
}

/* Actions Bar */
.analysis-collapse-actions-bar { 
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #252526;
  border-top: 1px solid #333;
}
.analysis-collapse-actions { 
  display: flex; 
  gap: 4px; 
}
.analysis-collapse-btn { 
  padding: 5px 10px;
  background: transparent;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #9d9d9d;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}
.analysis-collapse-btn:hover { 
  background: #2d2d30;
  border-color: #569cd6;
  color: #569cd6;
}
.analysis-collapse-btn:active { 
  transform: scale(0.97); 
}
.analysis-collapse-btn svg { 
  width: 12px; 
  height: 12px; 
}
.analysis-collapse-btn.success { 
  background: #2d3b2d;
  border-color: #4ec9b0;
  color: #4ec9b0;
}

/* Meta Info */
.analysis-collapse-meta { 
  font-size: 10px;
  color: #6d6d6d;
  display: flex;
  align-items: center;
  gap: 6px;
}
.analysis-collapse-meta::before {
  content: '';
  width: 5px;
  height: 5px;
  background: #4ec9b0;
  border-radius: 50%;
  animation: statusPulse 2s ease-in-out infinite;
}
@keyframes statusPulse { 
  0%, 100% { opacity: 1; } 
  50% { opacity: 0.4; }
}

/* Expandable Content */
.analysis-collapse-content { 
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.analysis-collapsible.expanded .analysis-collapse-content { 
  max-height: 400px;
  overflow-y: auto;
}
.analysis-collapse-content .ai-message-content { 
  padding: 14px;
  border-top: 1px solid #333;
}

/* Custom Scrollbar */
.analysis-collapse-content::-webkit-scrollbar { width: 6px; }
.analysis-collapse-content::-webkit-scrollbar-track { background: transparent; }
.analysis-collapse-content::-webkit-scrollbar-thumb { background: #3e3e42; border-radius: 3px; }
.analysis-collapse-content::-webkit-scrollbar-thumb:hover { background: #555; }


.analysis-response-actions { display: flex; align-items: center; gap: 4px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; }
.analysis-action-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; color: #666; transition: all 0.2s ease; }
.analysis-action-btn:hover { background: rgba(255,255,255,0.08); color: #ccc; }
.analysis-action-btn svg { width: 16px; height: 16px; }
.analysis-response-meta { display: flex; align-items: center; gap: 8px; margin-left: auto; font-size: 11px; color: #666; }

/* HTML View Modal */
.html-view-overlay { position: fixed; inset: 0; background: rgba(1,4,9,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10001; animation: overlayFadeIn 0.2s ease; }
@keyframes overlayFadeIn { from { opacity: 0; } }
.html-view-modal { width: 92%; max-width: 1100px; max-height: 90vh; background: #0d1117; border: 1px solid #30363d; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,54,61,0.5); animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes modalSlideUp { from { transform: translateY(20px); opacity: 0; } }
.html-view-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #161b22; border-bottom: 1px solid #30363d; }
.html-view-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.html-view-icon svg { width: 18px; height: 18px; color: #79c0ff; }
.html-view-title-group { flex: 1; }
.html-view-title { font-size: 18px; font-weight: 600; color: #f0f6fc; margin: 0; letter-spacing: -0.3px; }
.html-view-subtitle { font-size: 12px; color: #8b949e; margin-top: 2px; }
.html-view-actions { display: flex; gap: 8px; }
.html-view-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 13px; cursor: pointer; transition: all 0.15s; font-weight: 500; }
.html-view-btn:hover { background: #30363d; border-color: #484f58; color: #f0f6fc; }
.html-view-btn svg { width: 14px; height: 14px; }
.html-view-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; color: #8b949e; margin-left: 8px; transition: all 0.15s; }
.html-view-close:hover { background: rgba(248,81,73,0.1); border-color: rgba(248,81,73,0.4); color: #f85149; }
.html-view-close svg { width: 16px; height: 16px; }
.html-view-tabs { display: flex; gap: 0; padding: 0 24px; background: #161b22; border-bottom: 1px solid #30363d; }
.html-view-tab { padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #8b949e; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.15s; margin-bottom: -1px; font-weight: 500; }
.html-view-tab:hover { color: #f0f6fc; }
.html-view-tab.active { color: #58a6ff; border-bottom-color: #58a6ff; }
.html-view-tab svg { width: 16px; height: 16px; }
.html-view-body { flex: 1; overflow: auto; background: #0d1117; }
.html-formatted-view { padding: 0; color: #c9d1d9; line-height: 1.6; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }

/* IDE Dark Blue Theme Document */
.doc-container { max-width: 100%; background: #0d1117; }

/* Document Header */
.doc-header-bar { padding: 24px 32px; background: #161b22; border-bottom: 1px solid #30363d; }
.doc-header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.doc-header-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border: 1px solid #3d6a97; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.doc-header-title { font-size: 24px; font-weight: 600; color: #f0f6fc; letter-spacing: -0.5px; }
.doc-header-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.doc-header-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(56,139,253,0.15); border: 1px solid rgba(56,139,253,0.4); border-radius: 16px; font-size: 12px; font-weight: 500; color: #58a6ff; }
.doc-header-stat { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #8b949e; }

/* Table of Contents */
.doc-toc { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px 20px; margin: 0 32px 24px; }
.doc-toc-title { font-size: 12px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.doc-toc-list { display: flex; flex-wrap: wrap; gap: 8px; }
.doc-toc-item { padding: 6px 12px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; font-size: 13px; color: #c9d1d9; transition: all 0.15s ease; }
.doc-toc-item:hover { background: #30363d; border-color: #484f58; color: #f0f6fc; }

/* Document Body */
.doc-body { padding: 0 32px 32px; }
.doc-para { margin: 0 0 16px; color: #8b949e; line-height: 1.7; font-size: 14px; }
.doc-para:empty { display: none; }

/* Section Cards - Dark Blue Theme */
.doc-section { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin: 16px 0; overflow: hidden; }
.doc-section-header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: linear-gradient(90deg, rgba(56,139,253,0.08) 0%, transparent 100%); border-bottom: 1px solid #30363d; }
.doc-section-num { min-width: 26px; height: 26px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; color: #fff; }
.doc-section-title { font-size: 15px; font-weight: 600; color: #f0f6fc; }
.doc-section-content { padding: 16px 20px; }

/* Data Fields - Blue Theme */
.doc-field { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #21262d; }
.doc-field:last-child { border-bottom: none; }
.doc-field-label { font-weight: 500; color: #58a6ff; min-width: 180px; font-size: 13px; font-family: 'SF Mono', Consolas, monospace; }
.doc-field-value { color: #c9d1d9; font-size: 14px; }

/* Lists - Blue Bullets */
.doc-list-item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-bottom: 1px solid #21262d; }
.doc-list-item:last-child { border-bottom: none; }
.doc-bullet { width: 6px; height: 6px; background: #58a6ff; border-radius: 50%; margin-top: 8px; flex-shrink: 0; }
.doc-list-text { color: #c9d1d9; line-height: 1.6; }

/* Code - Blue Accent */
.doc-inline-code { background: rgba(56,139,253,0.15); padding: 2px 8px; border-radius: 6px; font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #79c0ff; }
.doc-code-block { margin: 16px 0; border-radius: 8px; overflow: hidden; border: 1px solid #30363d; }
.doc-code-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #161b22; border-bottom: 1px solid #30363d; }
.doc-code-lang { font-size: 12px; font-weight: 500; color: #8b949e; font-family: 'SF Mono', Consolas, monospace; }
.doc-code-copy { padding: 5px 12px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 12px; cursor: pointer; font-weight: 500; }
.doc-code-copy:hover { background: #30363d; }
.doc-code-content { margin: 0; padding: 16px; background: #0d1117; overflow-x: auto; }
.doc-code-content code { font-family: 'SF Mono', Consolas, monospace; font-size: 13px; line-height: 1.6; color: #c9d1d9; }

/* Bold */
.doc-bold { color: #f0f6fc; font-weight: 600; }

.html-formatted-view h3 { font-size: 16px; color: #f0f6fc; margin: 24px 0 12px; font-weight: 600; }
.html-formatted-view h4 { font-size: 14px; color: #c9d1d9; margin: 16px 0 8px; font-weight: 600; }
.html-formatted-view strong { color: #f0f6fc; font-weight: 600; }
.html-formatted-view code { background: rgba(110,118,129,0.2); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #79c0ff; }
.html-formatted-view pre { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; }
.html-formatted-view pre code { background: none; padding: 0; color: #c9d1d9; line-height: 1.6; }
.html-section-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 12px 0; }
.html-raw-view { padding: 24px 32px; background: #010409; min-height: 100%; }
.html-raw-view pre { margin: 0; white-space: pre-wrap; font-family: 'SF Mono', Consolas, monospace; font-size: 14px; line-height: 1.7; color: #8b949e; }
.html-view-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: #161b22; border-top: 1px solid #30363d; }
.html-view-stats { display: flex; gap: 24px; font-size: 12px; color: #8b949e; }
.html-view-stat { display: flex; align-items: center; gap: 8px; }
.html-view-stat svg { width: 14px; height: 14px; color: #8b949e; }
.html-view-body::-webkit-scrollbar { width: 10px; height: 10px; }
.html-view-body::-webkit-scrollbar-track { background: #0d1117; }
.html-view-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 5px; border: 2px solid #0d1117; }
.html-view-body::-webkit-scrollbar-thumb:hover { background: #484f58; }

/* Analysis Mode Badge */
.analysis-mode-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 500; margin-left: 8px; }
.analysis-mode-badge.quick { background: rgba(76,175,80,0.15); color: #4caf50; }
.analysis-mode-badge.deep { background: rgba(56,139,253,0.15); color: #58a6ff; }

/* Create File/Folder Dialog */
.create-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  animation: dialogFadeIn 0.15s ease;
}
@keyframes dialogFadeIn { from { opacity: 0; } }
.create-dialog {
  width: 400px;
  background: linear-gradient(180deg, #1e1e1e 0%, #161616 100%);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: dialogSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
@keyframes dialogSlideIn { from { transform: translateY(-20px) scale(0.95); opacity: 0; } }
.create-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.create-dialog-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.create-dialog-icon.type-file { background: linear-gradient(135deg, #1565c0 0%, #42a5f5 100%); }
.create-dialog-icon.type-folder { background: linear-gradient(135deg, #f57c00 0%, #ffb74d 100%); }
.create-dialog-icon svg { width: 18px; height: 18px; color: #fff; }

/* CRITICAL: Hide any chevrons injected by file tree scripts */
.create-dialog-overlay .folder-chevron,
.create-dialog .folder-chevron,
.create-dialog-icon .folder-chevron,
.create-dialog-header .folder-chevron,
.create-dialog-overlay [class*="chevron"],
.create-dialog [class*="chevron"] {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  font-size: 0 !important;
}

/* Prevent list-style markers */
.create-dialog-overlay,
.create-dialog-overlay * {
  list-style: none !important;
  list-style-type: none !important;
}

/* Prevent ::before and ::after content injection */
.create-dialog-icon::before,
.create-dialog-icon::after,
.create-dialog-header::before,
.create-dialog-header::after {
  content: none !important;
  display: none !important;
}

.create-dialog-title { font-size: 15px; font-weight: 600; color: #e6edf3; }
.create-dialog-subtitle { font-size: 11px; color: #7d8590; margin-top: 2px; }
.create-dialog-body { padding: 20px; }
.create-dialog-input {
  width: 100%;
  padding: 12px 14px;
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e6edf3;
  font-size: 14px;
  font-family: 'SF Mono', Consolas, monospace;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.create-dialog-input:focus {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88,166,255,0.15);
}
.create-dialog-input::placeholder { color: #484f58; }
.create-dialog-hint {
  font-size: 11px;
  color: #7d8590;
  margin-top: 8px;
  padding-left: 2px;
}
.create-dialog-error {
  font-size: 11px;
  color: #f85149;
  margin-top: 8px;
  padding-left: 2px;
  display: none;
}
.create-dialog-error.show { display: block; }
.create-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  background: rgba(0,0,0,0.2);
  border-top: 1px solid rgba(255,255,255,0.04);
}
.create-dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.create-dialog-btn.cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #8b949e;
}
.create-dialog-btn.cancel:hover { background: rgba(255,255,255,0.05); color: #e6edf3; }
.create-dialog-btn.create {
  background: #238636;
  border: 1px solid #238636;
  color: #fff;
}
.create-dialog-btn.create:hover { background: #2ea043; }
.create-dialog-btn.create:disabled { opacity: 0.5; cursor: not-allowed; }
`;

if (!document.getElementById('project-menu-styles-v6')) {
  const s = document.createElement('style');
  s.id = 'project-menu-styles-v6';
  s.textContent = styles;
  document.head.appendChild(s);
}

// ============================================================================
// SVG ICONS
// ============================================================================

const icons = {
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2z"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  print: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
};

// ============================================================================
// PROJECT CONTEXT
// ============================================================================

const CONTEXT_KEY = 'ai_project_analysis_context';

function saveProjectContext(context: any): void {
  try { localStorage.setItem(CONTEXT_KEY, JSON.stringify(context)); } catch {}
}

function getProjectContext(): any {
  try {
    const s = localStorage.getItem(CONTEXT_KEY);
    if (s) { const c = JSON.parse(s); if (Date.now() - c.timestamp < 7200000) return c; }
  } catch {}
  return null;
}

function clearProjectContext(): void {
  localStorage.removeItem(CONTEXT_KEY);
}

// ============================================================================
// KEY FILES DETECTION
// ============================================================================

const KEY_FILES = [
  'package.json', 'tsconfig.json', 'vite.config.ts', 'webpack.config.js',
  'main.ts', 'main.tsx', 'index.ts', 'index.tsx', 'App.tsx', 'App.vue', 'App.js',
  'app.py', 'main.py', '__init__.py', 'manage.py',
  'Cargo.toml', 'main.rs', 'lib.rs',
  'pubspec.yaml', 'main.dart',
  'go.mod', 'main.go'
];

const SKIP_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.test.', '.spec.', '.stories.', '.d.ts', '.min.js', '.map'
];

function isKeyFile(path: string): boolean {
  const name = path.split(/[/\\]/).pop() || '';
  return KEY_FILES.some(k => name === k || name.endsWith(k));
}

function shouldSkip(path: string): boolean {
  return SKIP_PATTERNS.some(p => path.includes(p));
}

function getFileImportance(path: string): number {
  const name = path.split(/[/\\]/).pop() || '';
  if (['package.json', 'Cargo.toml', 'pubspec.yaml', 'go.mod'].includes(name)) return 100;
  if (['main.ts', 'main.tsx', 'index.ts', 'index.tsx', 'main.rs', 'main.py', 'main.go', 'main.dart'].includes(name)) return 90;
  if (['App.tsx', 'App.vue', 'App.js', 'app.py'].includes(name)) return 85;
  if (name.includes('config')) return 70;
  if (name.includes('route') || name.includes('router')) return 65;
  if (name.includes('store') || name.includes('state')) return 60;
  if (path.includes('/components/') || path.includes('/pages/')) return 50;
  return 30;
}

// ============================================================================
// BUILD FOLDER STRUCTURE
// ============================================================================

interface FolderNode {
  name: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  fileCount?: number;
}

function buildFolderStructure(paths: string[], projectPath: string): FolderNode {
  const root: FolderNode = { name: projectPath.split(/[/\\]/).pop() || 'Project', type: 'folder', children: [], fileCount: 0 };
  
  const folderCounts: Record<string, number> = {};
  
  paths.forEach(fullPath => {
    const rel = fullPath.replace(projectPath, '').replace(/^[/\\]/, '');
    const parts = rel.split(/[/\\]/);
    
    // Count files per folder
    if (parts.length > 1) {
      const folder = parts[0];
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    }
  });
  
  // Build structure
  Object.entries(folderCounts).forEach(([folder, count]) => {
    root.children!.push({ name: folder, type: 'folder', fileCount: count });
  });
  
  // Add root-level files
  paths.forEach(fullPath => {
    const rel = fullPath.replace(projectPath, '').replace(/^[/\\]/, '');
    const parts = rel.split(/[/\\]/);
    if (parts.length === 1) {
      root.children!.push({ name: parts[0], type: 'file' });
    }
  });
  
  root.fileCount = paths.length;
  return root;
}

function formatStructure(node: FolderNode, indent: string = ''): string {
  let result = '';
  
  if (node.type === 'folder') {
    const count = node.fileCount ? ` (${node.fileCount} files)` : '';
    result += `${indent}📁 ${node.name}${count}\n`;
    
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      
      node.children.forEach(child => {
        result += formatStructure(child, indent + '  ');
      });
    }
  } else {
    result += `${indent}📄 ${node.name}\n`;
  }
  
  return result;
}

// ============================================================================
// QUICK ANALYZE (Structure + Key Files Only)
// ============================================================================

async function quickAnalyzeProject(projectPath: string): Promise<void> {
  (window as any).__analysisMode = true; // X02: block AutoApply during analysis
  console.log('🚀 [Quick] Starting quick analysis:', projectPath);
  
  const container = document.querySelector('.ai-chat-container');
  if (!container) { alert('Please open the AI chat panel first'); return; }

  const projectName = projectPath.split(/[/\\]/).pop() || 'Project';

  // User message
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.innerHTML = `<div class="ai-message-content"><span style="display:inline-flex;align-items:center;gap:8px;"><span style="font-size:14px;display:inline-block;animation:rocketPulse 1s ease-in-out infinite;">&#9889;</span><strong style="color:#63b3ed;">Quick Analyze</strong><code style="background:rgba(99,179,237,0.1);padding:3px 10px;border-radius:6px;font-size:11px;color:#63b3ed;border:1px solid rgba(99,179,237,0.15);">${projectName}</code></span></div><style>@keyframes rocketPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}</style>`;
  container.appendChild(userDiv);

  // Enhanced Loading with Analysis Log
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message assistant-message';
  loadingDiv.innerHTML = `
    <div class="analysis-progress-panel" style="background:#111118;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04);animation:analysisPanelIn 0.5s cubic-bezier(0.16,1,0.3,1);font-family:monospace;">
      <div class="analysis-header" style="padding:14px 18px 12px;background:linear-gradient(135deg,rgba(99,179,237,0.08),rgba(139,92,246,0.06));border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:-100%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(99,179,237,0.05),transparent);animation:headerShimmer 3s ease-in-out infinite;"></div>
        <div class="analysis-header-icon" style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#1a365d,#2b6cb0);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(66,153,225,0.3);position:relative;z-index:1;flex-shrink:0;">
          <div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
        </div>
        <div style="position:relative;z-index:1;">
          <div class="loading-text" style="font-weight:600;color:#f0f0f0;font-size:13px;letter-spacing:-0.3px;">Quick Analyze</div>
          <div class="loading-detail" style="font-size:10px;color:#666;margin-top:1px;letter-spacing:0.3px;text-transform:uppercase;">${projectName}</div>
        </div>
        <div class="provider-badge-live" style="margin-left:auto;display:flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(99,179,237,0.08);border:1px solid rgba(99,179,237,0.15);border-radius:20px;font-size:10px;color:#63b3ed;font-weight:500;position:relative;z-index:1;animation:badgePulse 2s ease-in-out infinite;">
          <span style="width:5px;height:5px;border-radius:50%;background:#63b3ed;animation:dotGlow 1.5s ease-in-out infinite;"></span>
          Operator X02
        </div>
      </div>
      <div class="analysis-log" style="padding:14px 18px;display:flex;flex-direction:column;gap:2px;font-size:12px;">
        <div class="log-item" data-step="scan" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Scanning project structure</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="files" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Identifying key files</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="read" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Reading source code</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="analyze" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">AI analyzing patterns</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="generate" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Generating insights</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
      </div>
      <div class="analysis-progress-bar" style="margin:0 18px 14px;height:3px;background:rgba(255,255,255,0.04);border-radius:2px;overflow:hidden;">
        <div class="progress-fill" style="height:100%;width:0%;border-radius:2px;background:linear-gradient(90deg,#2b6cb0,#63b3ed);transition:width 0.8s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;"></div>
      </div>
      <div style="padding:10px 18px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#555;background:rgba(0,0,0,0.2);">
        <div class="analysis-timer" style="display:flex;align-items:center;gap:5px;font-variant-numeric:tabular-nums;">
          <span class="timer-blink" style="width:4px;height:4px;border-radius:50%;background:#63b3ed;animation:timerBlink 1s step-end infinite;"></span>
          <span class="timer-text">0.0s</span>
        </div>
        <div style="display:flex;gap:10px;">
          <span class="file-count-stat">0 files</span>
          <span class="size-stat">0KB</span>
        </div>
      </div>
    </div>
    <style>
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes analysisPanelIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes headerShimmer{0%,100%{left:-100%}50%{left:100%}}
      @keyframes badgePulse{0%,100%{opacity:0.8}50%{opacity:1}}
      @keyframes dotGlow{0%,100%{box-shadow:0 0 4px rgba(99,179,237,0.4)}50%{box-shadow:0 0 8px rgba(99,179,237,0.8)}}
      @keyframes timerBlink{50%{opacity:0}}
      @keyframes iconPop{0%{transform:scale(0.8)}100%{transform:scale(1)}}
      @keyframes progressShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      .progress-fill::after{content:"";position:absolute;top:0;left:-50%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:progressShimmer 1.5s ease-in-out infinite}
      .log-item.active{color:#63b3ed !important}
      .log-item.active .log-icon{background:rgba(99,179,237,0.15) !important;border-color:rgba(99,179,237,0.3) !important;color:#63b3ed}
      .log-item.active .log-status{background:rgba(99,179,237,0.1);color:#63b3ed;border:1px solid rgba(99,179,237,0.15);animation:badgePulse 1.5s ease infinite}
      .log-item.done{color:#48bb78 !important;opacity:0.8}
      .log-item.done .log-icon{background:rgba(72,187,120,0.12) !important;border-color:rgba(72,187,120,0.25) !important;color:#48bb78;animation:iconPop 0.3s cubic-bezier(0.34,1.56,0.64,1)}
      .log-item.done .log-status{background:rgba(72,187,120,0.1);color:#48bb78;border:1px solid rgba(72,187,120,0.15)}
      .log-item.done + .log-connector{background:rgba(72,187,120,0.3) !important}
      .log-item.active + .log-connector{background:rgba(99,179,237,0.3) !important}
    </style>
  `;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  // Update functions for the new log UI
  const updateLoading = (t: string, d?: string) => {
    const tEl = loadingDiv.querySelector('.loading-text');
    const dEl = loadingDiv.querySelector('.loading-detail');
    if (tEl) tEl.textContent = t;
    if (dEl) dEl.textContent = d || '';
  };
  
  const setLogStep = (step: string, status: 'active' | 'done', detail?: string) => {
    const logItems = loadingDiv.querySelectorAll('.log-item');
    let doneCount = 0;
    const totalSteps = logItems.length;
    logItems.forEach(item => {
      const itemStep = item.getAttribute('data-step');
      const icon = item.querySelector('.log-icon');
      const statusEl = item.querySelector('.log-status');
      if (itemStep === step) {
        item.classList.remove('active', 'done');
        item.classList.add(status);
        if (icon) icon.innerHTML = status === 'done' ? '&#10003;' : '&#9694;';
        if (statusEl && detail) statusEl.textContent = detail;
      }
      if (item.classList.contains('done')) doneCount++;
    });
    // Update progress bar
    const progressFill = loadingDiv.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      const pct = Math.round((doneCount / totalSteps) * 100);
      progressFill.style.width = pct + '%';
      if (doneCount === totalSteps) {
        progressFill.style.background = 'linear-gradient(90deg, #276749, #48bb78)';
      }
    }
    // Update provider badge on completion
    if (status === 'done' && step === 'generate') {
      const badge = loadingDiv.querySelector('.provider-badge-live') as HTMLElement;
      if (badge) {
        badge.style.background = 'rgba(72,187,120,0.08)';
        badge.style.borderColor = 'rgba(72,187,120,0.15)';
        badge.style.color = '#48bb78';
        badge.style.animation = 'none';
        badge.innerHTML = '<span style="width:5px;height:5px;border-radius:50%;background:#48bb78;"></span> &#10003; Done';
      }
      const timerBlink = loadingDiv.querySelector('.timer-blink') as HTMLElement;
      if (timerBlink) { timerBlink.style.background = '#48bb78'; timerBlink.style.animation = 'none'; }
      // Replace spinner with checkmark
      const spinner = loadingDiv.querySelector('.analysis-header div div[style*="border-radius:50%"][style*="animation"]') as HTMLElement;
      if (spinner) spinner.outerHTML = '<span style="color:#fff;font-size:15px;">&#10003;</span>';
      const headerIcon = loadingDiv.querySelector('.analysis-header > div:first-child') as HTMLElement;
      if (headerIcon) {
        headerIcon.style.background = 'linear-gradient(135deg, #276749, #38a169)';
        headerIcon.style.boxShadow = '0 2px 8px rgba(72,187,120,0.3)';
      }
    }
    container.scrollTop = container.scrollHeight;
  };

  // Helper function for step delays
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: Scan project structure
    setLogStep('scan', 'active');
    updateLoading('Scanning Project', 'Finding all files...');
    await delay(300); // Visual delay

    // Start live timer
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = loadingDiv.querySelector('.timer-text');
      if (timerEl) timerEl.textContent = elapsed + 's';
    }, 100);

    // Helper to update footer stats
    const updateFooterStats = (files: number, sizeKB: number) => {
      const fc = loadingDiv.querySelector('.file-count-stat');
      const sc = loadingDiv.querySelector('.size-stat');
      if (fc) fc.textContent = files + ' files';
      if (sc) sc.textContent = sizeKB.toFixed(1) + 'KB';
    };
    
    const fileTree = document.querySelector('.file-tree, #file-tree');
    const fileElements = fileTree ? fileTree.querySelectorAll('[data-path]') : document.querySelectorAll('.file-tree [data-path], #file-tree [data-path]');
    const allPaths: string[] = [];
    fileElements.forEach(el => {
      const path = el.getAttribute('data-path');
      const isDir = el.getAttribute('data-is-directory') === 'true';
      if (path && !isDir && !shouldSkip(path) && path.includes(projectPath.split(/[/\\\\]/).filter(Boolean).pop() || '___NONE___')) allPaths.push(path);
    });

    if (allPaths.length === 0) throw new Error('No files found. Expand the file tree first.');

    setLogStep('scan', 'done', `${allPaths.length} files`);
    updateFooterStats(allPaths.length, 0);
    updateFooterStats(allPaths.length, 0);
    await delay(250); // Pause before next step

    // Build folder structure
    const structure = buildFolderStructure(allPaths, projectPath);
    const structureText = formatStructure(structure);

    // Step 2: Find key files
    setLogStep('files', 'active');
    updateLoading('Identifying Files', 'Selecting key files...');
    await delay(300); // Visual delay
    
    const keyFiles = allPaths
      .filter(p => !shouldSkip(p))
      .map(p => ({ path: p, importance: getFileImportance(p) }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5); // Only top 5 key files

    console.log('🔑 Key files:', keyFiles.map(f => f.path.split(/[/\\]/).pop()));
    setLogStep('files', 'done', `${keyFiles.length} key files`);
    await delay(250); // Pause before next step

    // Step 3: Read source code
    setLogStep('read', 'active');
    updateLoading('Reading Code', `Loading ${keyFiles.length} files...`);
    await delay(200); // Visual delay
    
    const { invoke } = await import('@tauri-apps/api/core');
    const fileContents: { name: string; content: string }[] = [];

    for (let i = 0; i < keyFiles.length; i++) {
      const file = keyFiles[i];
      const fileName = file.path.split(/[/\\]/).pop() || '';
      updateLoading('Reading Code', `${fileName}`);
      await delay(150); // Small delay for each file
      
      try {
        let content: string;
        try { content = await invoke('read_file', { path: file.path }) as string; }
        catch { content = await invoke('read_file_content', { path: file.path }) as string; }
        
        const trimmed = content.length > 1500 ? content.substring(0, 1500) + '\n...(truncated)' : content;
        fileContents.push({ name: fileName, content: trimmed });
      } catch {}
    }
    
    setLogStep('read', 'done', `${fileContents.length} files read`);
    await delay(250); // Pause before next step

    // Step 4: AI Analysis
    setLogStep('analyze', 'active');
    updateLoading('AI Analysis', 'Processing patterns...');
    await delay(300); // Visual delay
    
    const prompt = `Quick analyze project "${projectName}":

## Project Structure
\`\`\`
${structureText}
\`\`\`

## Key Files
${fileContents.map(f => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')}

Provide a structured analysis with these sections:
You are a senior software architect. Produce a professional Markdown report with:

## Project Overview
- **Type**: (e.g., "Vue 3 SPA with TypeScript")
- **Purpose**: What this project does
- **Primary Language**: With type system info

## Complete File List
List ALL files found in the project with their type and purpose:
| # | File | Type | Purpose |
|---|------|------|---------|
Number every file. Include extension-based type (Component, Config, Style, Entry, etc.) and a brief purpose description.

## File Structure & Connections
Describe how files connect to each other. Map the dependency flow:
- Entry point and initialization chain
- Which files import from which (e.g., main.ts -> App.vue -> components)
- Data flow direction

## Technology Stack
| Category | Technology | Version |
|----------|-----------|---------|
List all detected technologies in a table.

## Architecture Pattern
Describe the structure pattern, module system, and how components are organized.

## Quick Assessment
- **Strengths**: What is done well
- **Concerns**: Any potential issues
- **Suggestions**: 2-3 actionable improvements

Use rich Markdown formatting with **bold**, tables, and \`code\` references. Be specific with versions. Keep response ~600 words.`;

    // 🔧 FORCE OPERATOR X02 FOR QUICK ANALYZE
    // Always use Operator X02 (Deepseek) for project analysis
    let config: any = {};
    try { 
      // Get Operator X02 config specifically
      const x02Config = JSON.parse(localStorage.getItem('apiConfiguration_operator_x02') || '{}');
      const savedKeys = JSON.parse(localStorage.getItem('savedApiKeys') || '{}');
      
      // Operator X02 uses Deepseek backend
      // Operator X02 always uses Supabase proxy - no local key needed
      config = {
        provider: 'operator_x02',
        apiKey: 'PROXY',
        apiBaseUrl: 'PROXY',
        model: 'x02-coder'
      };





      console.log('🤖 [Quick] Using Operator X02 for analysis');
    } catch {
      config = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    }
    if (!config.apiKey) throw new Error('No API key. Please configure Operator X02 in Quick Switch panel.');

    setLogStep('analyze', 'done', 'patterns detected');
    await delay(250); // Pause before next step
    
    // Step 5: Generate insights with countdown timer
    setLogStep('generate', 'active');
    
    // Calculate total code size
    const totalCodeSize = fileContents.reduce((sum, f) => sum + f.content.length, 0);
    const totalKB = totalCodeSize / 1024;
    
    // ============================================================
    // SMART TIME ESTIMATION
    // Factors: Total files in directory, Code size, API provider
    // ============================================================
    
    // Provider speed multipliers (lower = faster)
    const providerSpeed: Record<string, number> = {
      'groq': 0.4,         // Fastest - optimized inference
      'operator_x02': 0.7, // Operator X02 - Fast
      'openai': 1.0,       // Baseline
      'gpt': 1.0,          // OpenAI alias
      'claude': 1.2,       // Slightly slower but high quality
      'anthropic': 1.2,    // Claude alias
      'deepseek': 0.7,     // Fast
      'gemini': 0.9,       // Google - fast
      'ollama': 2.0,       // Local - varies by hardware
      'local': 2.0,        // Local alias
      'lmstudio': 2.0      // Local alias
    };
    
    // Estimation formula for Quick Analyze:
    // Time = (Base + DirectoryFactor + CodeSizeFactor) × ProviderMultiplier
    const baseTime = 3;                                          // Network + API overhead
    const directoryFactor = Math.log10(allPaths.length + 1) * 2; // Log scale for total files
    const codeSizeFactor = Math.sqrt(totalKB) * 0.8;             // Square root for code size
    const providerMultiplier = providerSpeed[config.provider?.toLowerCase()] || 1.0;
    
    // Calculate estimated time
    let estimatedSeconds = Math.ceil(
      (baseTime + directoryFactor + codeSizeFactor) * providerMultiplier
    );
    
    // Clamp to reasonable range (3-30 seconds for Quick Analyze)
    estimatedSeconds = Math.max(3, Math.min(30, estimatedSeconds));
    
    let countdown = estimatedSeconds;
    
    // Log estimation details
    console.log(`⏱️ [Quick] Timer: ${estimatedSeconds}s | Dir: ${allPaths.length} files | Read: ${fileContents.length} files | Size: ${totalKB.toFixed(1)}KB | Provider: ${config.provider}`);
    
    // Update timer display
    const updateTimer = () => {
      if (countdown > 0) {
        updateLoading('Generating Insights', `~${countdown}s remaining`);
        setLogStep('generate', 'active', `~${countdown}s`);
      } else {
        updateLoading('Generating Insights', 'Almost done...');
        setLogStep('generate', 'active', 'processing...');
      }
    };
    
    updateTimer();
    const countdownInterval = setInterval(() => {
      countdown--;
      updateTimer();
    }, 1000);

    let response: string;
    try {
      if (config.apiKey === 'PROXY' && (window as any).smartAICall) {
        console.log('[Quick] Routing through proxy');
        response = await (window as any).smartAICall({
          provider: config.provider || 'operator_x02',
          apiKey: 'PROXY',
          model: config.model || 'x02-coder',
          message: prompt,
          maxTokens: 2000,
          temperature: 0.7
        });
      } else {
        response = await invoke('call_ai_api', {
          request: { provider: config.provider || 'groq', api_key: config.apiKey, base_url: config.apiBaseUrl || '', model: config.model || '', message: prompt, max_tokens: 2000, temperature: 0.7 }
        }) as string;
      }
    } finally {
      // Always stop timer
      clearInterval(timerInterval);
    }

    if (!response) throw new Error('Empty response');
    
    const actualTime = estimatedSeconds - countdown;
    setLogStep('generate', 'done', `${actualTime > 0 ? actualTime : 1}s`);
    updateLoading('Complete', '✓ Analysis ready');
    await delay(400); // Pause to show completion before transitioning

    // Save context
    saveProjectContext({ projectName, projectPath, fileCount: allPaths.length, mode: 'quick', files: fileContents, structure: structureText, analysisResult: response, timestamp: Date.now() });

    // Display collapsible result (use totalCodeSize calculated earlier)
    const formattedHtml = formatResponse(response);
    const collapsible = createCollapsibleResponse({
      projectName,
      mode: 'quick',
      response,
      formattedHtml,
      stats: { 
        totalFiles: allPaths.length, 
        filesRead: fileContents.length, 
        totalSize: totalCodeSize,
        tokens: '~3K' 
      },
      provider: config.provider
    });

    // Hide user message with animation
    userDiv.style.transition = 'all 0.4s ease-out';
    userDiv.style.opacity = '0';
    userDiv.style.transform = 'translateY(-10px)';
    userDiv.style.maxHeight = userDiv.offsetHeight + 'px';
    setTimeout(() => {
      userDiv.style.maxHeight = '0';
      userDiv.style.padding = '0';
      userDiv.style.margin = '0';
    }, 200);
    setTimeout(() => userDiv.remove(), 500);

    loadingDiv.innerHTML = '';
    collapsible.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply
    loadingDiv.appendChild(collapsible);
    setTimeout(() => { (window as any).__analysisMode = false; }, 500); // X02: delayed reset - MutationObserver sees true, blocks AutoApply

    clearInterval(timerInterval);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const timerEl2 = loadingDiv.querySelector('.timer-text');
    if (timerEl2) timerEl2.textContent = 'Completed in ' + totalTime + 's';
    console.log('✅ [Quick] Analysis complete!');

  } catch (error: any) {
    try { clearInterval(timerInterval); } catch(e) {}
    loadingDiv.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;color:#f55;"><span style="font-size:24px;">❌</span><div><div style="font-weight:500;">Quick Analysis Failed</div><div style="font-size:12px;color:#888;margin-top:4px;">${error.message}</div></div></div>`;
  }

  container.scrollTop = container.scrollHeight;
}

// ============================================================================
// DEEP ANALYZE (All Files)
// ============================================================================

async function deepAnalyzeProject(projectPath: string): Promise<void> {
  console.log('🔍 [Deep] Starting deep analysis:', projectPath);
  
  const container = document.querySelector('.ai-chat-container');
  if (!container) { alert('Please open the AI chat panel first'); return; }

  const projectName = projectPath.split(/[/\\]/).pop() || 'Project';

  // User message with pulse animation
  const userDiv = document.createElement('div');
  userDiv.className = 'ai-message user-message';
  userDiv.innerHTML = `<div class="ai-message-content"><span style="display:inline-flex;align-items:center;gap:8px;"><span style="font-size:14px;display:inline-block;animation:searchPulse 1.2s ease-in-out infinite;">&#128300;</span><strong style="color:#9f7aea;">Deep Analyze</strong><code style="background:rgba(139,92,246,0.1);padding:3px 10px;border-radius:6px;font-size:11px;color:#9f7aea;border:1px solid rgba(139,92,246,0.15);">${projectName}</code></span></div><style>@keyframes searchPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}</style>`;
  container.appendChild(userDiv);

  // Enhanced Loading with Analysis Log
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ai-message assistant-message';
  loadingDiv.innerHTML = `
    <div class="analysis-progress-panel" style="background:#111118;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.04);animation:analysisPanelIn 0.5s cubic-bezier(0.16,1,0.3,1);font-family:monospace;">
      <div class="analysis-header" style="padding:14px 18px 12px;background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(99,179,237,0.06));border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:-100%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(139,92,246,0.05),transparent);animation:headerShimmer 3s ease-in-out infinite;"></div>
        <div class="analysis-header-icon" style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#44337a,#6b46c1);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(139,92,246,0.3);position:relative;z-index:1;flex-shrink:0;">
          <div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
        </div>
        <div style="position:relative;z-index:1;">
          <div class="loading-text" style="font-weight:600;color:#f0f0f0;font-size:13px;letter-spacing:-0.3px;">Deep Analyze</div>
          <div class="loading-detail" style="font-size:10px;color:#666;margin-top:1px;letter-spacing:0.3px;text-transform:uppercase;">${projectName}</div>
        </div>
        <div class="provider-badge-live" style="margin-left:auto;display:flex;align-items:center;gap:5px;padding:3px 10px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:20px;font-size:10px;color:#9f7aea;font-weight:500;position:relative;z-index:1;animation:badgePulse 2s ease-in-out infinite;">
          <span style="width:5px;height:5px;border-radius:50%;background:#9f7aea;animation:dotGlow 1.5s ease-in-out infinite;"></span>
          Operator X02
        </div>
      </div>
      <div class="analysis-log" style="padding:14px 18px;display:flex;flex-direction:column;gap:2px;font-size:12px;">
        <div class="log-item" data-step="scan" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Scanning all directories</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="filter" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Filtering code files</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="read" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Reading source files</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="analyze" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Deep code analysis</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
        <div class="log-connector" style="width:1px;height:8px;background:rgba(255,255,255,0.06);margin-left:11px;transition:background 0.4s;"></div>
        <div class="log-item" data-step="generate" style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#555;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);">
          <span class="log-icon" style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:10px;flex-shrink:0;transition:all 0.4s;">&#9675;</span>
          <span class="log-text" style="flex:1;">Generating report</span>
          <span class="log-status" style="font-size:9px;padding:2px 8px;border-radius:10px;"></span>
        </div>
      </div>
      <div class="analysis-progress-bar" style="margin:0 18px 14px;height:3px;background:rgba(255,255,255,0.04);border-radius:2px;overflow:hidden;">
        <div class="progress-fill" style="height:100%;width:0%;border-radius:2px;background:linear-gradient(90deg,#6b46c1,#9f7aea);transition:width 0.8s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;"></div>
      </div>
      <div style="padding:10px 18px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#555;background:rgba(0,0,0,0.2);">
        <div class="analysis-timer" style="display:flex;align-items:center;gap:5px;font-variant-numeric:tabular-nums;">
          <span class="timer-blink" style="width:4px;height:4px;border-radius:50%;background:#9f7aea;animation:timerBlink 1s step-end infinite;"></span>
          <span class="timer-text">0.0s</span>
        </div>
        <div style="display:flex;gap:10px;">
          <span class="file-count-stat">0 files</span>
          <span class="size-stat">0KB</span>
        </div>
      </div>
    </div>
    <style>
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes analysisPanelIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes headerShimmer{0%,100%{left:-100%}50%{left:100%}}
      @keyframes badgePulse{0%,100%{opacity:0.8}50%{opacity:1}}
      @keyframes dotGlow{0%,100%{box-shadow:0 0 4px rgba(139,92,246,0.4)}50%{box-shadow:0 0 8px rgba(139,92,246,0.8)}}
      @keyframes timerBlink{50%{opacity:0}}
      @keyframes iconPop{0%{transform:scale(0.8)}100%{transform:scale(1)}}
      @keyframes progressShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      .progress-fill::after{content:"";position:absolute;top:0;left:-50%;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:progressShimmer 1.5s ease-in-out infinite}
      .log-item.active{color:#9f7aea !important}
      .log-item.active .log-icon{background:rgba(139,92,246,0.15) !important;border-color:rgba(139,92,246,0.3) !important;color:#9f7aea}
      .log-item.active .log-status{background:rgba(139,92,246,0.1);color:#9f7aea;border:1px solid rgba(139,92,246,0.15);animation:badgePulse 1.5s ease infinite}
      .log-item.done{color:#48bb78 !important;opacity:0.8}
      .log-item.done .log-icon{background:rgba(72,187,120,0.12) !important;border-color:rgba(72,187,120,0.25) !important;color:#48bb78;animation:iconPop 0.3s cubic-bezier(0.34,1.56,0.64,1)}
      .log-item.done .log-status{background:rgba(72,187,120,0.1);color:#48bb78;border:1px solid rgba(72,187,120,0.15)}
      .log-item.done + .log-connector{background:rgba(72,187,120,0.3) !important}
      .log-item.active + .log-connector{background:rgba(139,92,246,0.3) !important}
    </style>
  `;
  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;

  const updateLoading = (t: string, d?: string) => {
    const tEl = loadingDiv.querySelector('.loading-text');
    const dEl = loadingDiv.querySelector('.loading-detail');
    if (tEl) tEl.textContent = t;
    if (dEl) dEl.textContent = d || '';
  };
  
  const setLogStep = (step: string, status: 'active' | 'done', detail?: string) => {
    const logItems = loadingDiv.querySelectorAll('.log-item');
    let doneCount = 0;
    const totalSteps = logItems.length;
    logItems.forEach(item => {
      const itemStep = item.getAttribute('data-step');
      const icon = item.querySelector('.log-icon');
      const statusEl = item.querySelector('.log-status');
      if (itemStep === step) {
        item.classList.remove('active', 'done');
        item.classList.add(status);
        if (icon) icon.innerHTML = status === 'done' ? '&#10003;' : '&#9694;';
        if (statusEl && detail) statusEl.textContent = detail;
      }
      if (item.classList.contains('done')) doneCount++;
    });
    const progressFill = loadingDiv.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      const pct = Math.round((doneCount / totalSteps) * 100);
      progressFill.style.width = pct + '%';
      if (doneCount === totalSteps) progressFill.style.background = 'linear-gradient(90deg, #276749, #48bb78)';
    }
    if (status === 'done' && step === 'generate') {
      const badge = loadingDiv.querySelector('.provider-badge-live') as HTMLElement;
      if (badge) {
        badge.style.background = 'rgba(72,187,120,0.08)';
        badge.style.borderColor = 'rgba(72,187,120,0.15)';
        badge.style.color = '#48bb78';
        badge.style.animation = 'none';
        badge.innerHTML = '<span style="width:5px;height:5px;border-radius:50%;background:#48bb78;"></span> &#10003; Done';
      }
      const timerBlink = loadingDiv.querySelector('.timer-blink') as HTMLElement;
      if (timerBlink) { timerBlink.style.background = '#48bb78'; timerBlink.style.animation = 'none'; }
      const spinner = loadingDiv.querySelector('.analysis-header div div[style*="border-radius:50%"][style*="animation"]') as HTMLElement;
      if (spinner) spinner.outerHTML = '<span style="color:#fff;font-size:15px;">&#10003;</span>';
      const headerIcon = loadingDiv.querySelector('.analysis-header > div:first-child') as HTMLElement;
      if (headerIcon) {
        headerIcon.style.background = 'linear-gradient(135deg, #276749, #38a169)';
        headerIcon.style.boxShadow = '0 2px 8px rgba(72,187,120,0.3)';
      }
    }
    container.scrollTop = container.scrollHeight;
  };
  
  // Helper function for step delays
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: Scan directories
    setLogStep('scan', 'active');
    updateLoading('Scanning', 'Finding all files...');
    await delay(300); // Visual delay

    // Start live timer
    const deepStartTime = Date.now();
    const deepTimerInterval = setInterval(() => {
      const elapsed = ((Date.now() - deepStartTime) / 1000).toFixed(1);
      const tEl = loadingDiv.querySelector('.timer-text');
      if (tEl) tEl.textContent = elapsed + 's';
    }, 100);

    const updateDeepFooter = (files: number, sizeKB: number) => {
      const fc = loadingDiv.querySelector('.file-count-stat');
      const sc = loadingDiv.querySelector('.size-stat');
      if (fc) fc.textContent = files + ' files';
      if (sc) sc.textContent = sizeKB.toFixed(1) + 'KB';
    };
    
    const fileTree = document.querySelector('.file-tree, #file-tree');
    const allPaths: string[] = [];
    (fileTree || document).querySelectorAll('[data-path]').forEach(el => {
      const path = el.getAttribute('data-path');
      const isDir = el.getAttribute('data-is-directory') === 'true';
      if (path && !isDir && path.toLowerCase().includes(projectName.toLowerCase())) allPaths.push(path);
    });

    if (allPaths.length === 0) throw new Error('No files found. Expand the file tree first.');
    setLogStep('scan', 'done', `${allPaths.length} files`);
    updateDeepFooter(allPaths.length, 0);
    await delay(250); // Pause before next step

    // Step 2: Filter code files
    setLogStep('filter', 'active');
    updateLoading('Filtering', 'Finding code files...');
    await delay(300); // Visual delay

    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.vue', '.css', '.html', '.json', '.dart', '.rs', '.go'];
    const filesToAnalyze = allPaths.filter(p => {
      const name = p.split(/[/\\]/).pop() || '';
      const ext = '.' + name.split('.').pop();
      if (shouldSkip(p)) return false;
      return codeExts.includes(ext) || KEY_FILES.includes(name);
    });

    if (filesToAnalyze.length === 0) throw new Error('No code files found.');
    setLogStep('filter', 'done', `${filesToAnalyze.length} code files`);
    await delay(250); // Pause before next step

    // Step 3: Read files
    setLogStep('read', 'active');
    updateLoading('Reading', 'Starting...');
    await delay(200); // Visual delay
    
    const { invoke } = await import('@tauri-apps/api/core');
    const fileContents: { name: string; content: string; language: string }[] = [];
    const limitedFiles = filesToAnalyze.slice(0, 25); // Max 25 files

    for (let i = 0; i < limitedFiles.length; i++) {
      const fileName = limitedFiles[i].split(/[/\\]/).pop() || '';
      updateLoading('Reading', `${fileName}`);
      await delay(100); // Small delay for each file
      try {
        let content: string;
        try { content = await invoke('read_file', { path: limitedFiles[i] }) as string; }
        catch { content = await invoke('read_file_content', { path: limitedFiles[i] }) as string; }
        
        const name = limitedFiles[i].split(/[/\\]/).pop() || '';
        const rel = limitedFiles[i].replace(projectPath, '').replace(/^[/\\]/, '');
        const ext = name.split('.').pop() || '';
        const langMap: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', py: 'python', rs: 'rust', vue: 'vue', dart: 'dart', css: 'css', html: 'html', json: 'json', go: 'go' };
        const trimmed = content.length > 2500 ? content.substring(0, 2500) + '\n...' : content;
        fileContents.push({ name: rel || name, content: trimmed, language: langMap[ext] || ext });
      } catch {}
    }
    
    setLogStep('read', 'done', `${fileContents.length} files read`);
    await delay(250); // Pause before next step

    if (fileContents.length === 0) throw new Error('Could not read any files.');

    // Step 4: Deep code analysis
    setLogStep('analyze', 'active');
    updateLoading('Analyzing', 'Processing code patterns...');
    await delay(400); // Visual delay for analyze
    
    const fileList = fileContents.map(f => `### ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');
    const prompt = `You are a principal software architect performing a comprehensive deep code analysis of project "${projectName}" (${fileContents.length} of ${filesToAnalyze.length} files analyzed).

${fileList}

Produce a detailed **Technical Deep Analysis Report** in rich Markdown:

## Executive Summary
Brief 2-3 sentence overview of what this project is, its maturity level, and overall quality assessment.

## Complete Technology Stack
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
List EVERY dependency with category (Core Framework, UI Library, Build Tool, Dev Tool, Testing, Utility).

## Architecture Deep Dive
- Module system and component hierarchy
- State management approach
- Routing strategy
- API/data layer patterns
- Design patterns identified (Composition, Observer, Factory, etc.)

## File-by-File Analysis
For each key file:
- **Purpose**: What it does
- **Imports/Exports**: Key dependencies
- **Patterns**: Notable code patterns
- **Quality**: Any issues or strengths

## Dependency Graph
Describe how files connect: entry point -> router -> views -> components -> services -> utils. Show the data flow.

## Code Quality Assessment
- **Type Safety**: TypeScript strictness, any types, type coverage
- **Error Handling**: try/catch patterns, error boundaries
- **Performance**: Bundle size concerns, lazy loading, memoization
- **Security**: Input validation, XSS prevention, secrets handling
- **Maintainability**: Code duplication, naming conventions, documentation

## Testing & CI/CD
Testing framework, coverage, CI pipeline, deployment setup.

## Detailed Recommendations
Provide 5-8 prioritized recommendations with:
- **Priority**: Critical / High / Medium / Low
- **Category**: Performance, Security, Maintainability, Testing, DX
- **Action**: Specific actionable step

Use **bold**, *italic*, \`code\`, tables, bullet points, and code blocks for professional formatting. Be thorough and specific. Aim for 1000-1500 words.`;

    // 🔧 FORCE OPERATOR X02 FOR DEEP ANALYZE
    // Always use Operator X02 (Deepseek) for project analysis
    let config: any = {};
    try { 
      // Get Operator X02 config specifically
      const x02Config = JSON.parse(localStorage.getItem('apiConfiguration_operator_x02') || '{}');
      const savedKeys = JSON.parse(localStorage.getItem('savedApiKeys') || '{}');
      
      // Operator X02 uses Deepseek backend
      // Operator X02 always uses Supabase proxy - no local key needed
      config = {
        provider: 'operator_x02',
        apiKey: 'PROXY',
        apiBaseUrl: 'PROXY',
        model: 'x02-coder'
      };





      console.log('🤖 [Deep] Using Operator X02 for analysis');
    } catch {
      config = JSON.parse(localStorage.getItem('aiApiConfig') || '{}');
    }
    if (!config.apiKey) throw new Error('No API key. Please configure Operator X02 in Quick Switch panel.');

    setLogStep('analyze', 'done', 'patterns found');
    await delay(250); // Pause before next step
    
    // Step 5: Generate report with countdown timer
    setLogStep('generate', 'active');
    
    // Calculate total code size
    const totalCodeSize = fileContents.reduce((sum, f) => sum + f.content.length, 0);
    const totalKB = totalCodeSize / 1024;
    
    // ============================================================
    // SMART TIME ESTIMATION
    // Factors: Total files in directory, Code size, API provider
    // ============================================================
    
    // Provider speed multipliers (lower = faster)
    const providerSpeed: Record<string, number> = {
      'groq': 0.4,         // Fastest - optimized inference
      'operator_x02': 0.7, // Operator X02 - Fast
      'openai': 1.0,       // Baseline
      'gpt': 1.0,          // OpenAI alias
      'claude': 1.2,       // Slightly slower but high quality
      'anthropic': 1.2,    // Claude alias
      'deepseek': 0.7,     // Fast
      'gemini': 0.9,       // Google - fast
      'ollama': 2.0,       // Local - varies by hardware
      'local': 2.0,        // Local alias
      'lmstudio': 2.0      // Local alias
    };
    
    // Estimation formula for Deep Analyze (more files, more tokens):
    // Time = (Base + DirectoryFactor + FilesReadFactor + CodeSizeFactor) × ProviderMultiplier
    const baseTime = 5;                                               // Network + API overhead
    const directoryFactor = Math.log10(filesToAnalyze.length + 1) * 3; // Log scale for total files
    const filesReadFactor = fileContents.length * 0.3;                 // Linear for files actually read
    const codeSizeFactor = Math.sqrt(totalKB) * 1.2;                   // Square root for code size
    const providerMultiplier = providerSpeed[config.provider?.toLowerCase()] || 1.0;
    
    // Calculate estimated time
    let estimatedSeconds = Math.ceil(
      (baseTime + directoryFactor + filesReadFactor + codeSizeFactor) * providerMultiplier
    );
    
    // Clamp to reasonable range (5-90 seconds for Deep Analyze)
    estimatedSeconds = Math.max(5, Math.min(90, estimatedSeconds));
    
    let countdown = estimatedSeconds;
    
    // Log estimation details
    updateDeepFooter(filesToAnalyze.length, totalKB);
    console.log(`⏱️ [Deep] Timer: ${estimatedSeconds}s | Dir: ${filesToAnalyze.length} files | Read: ${fileContents.length} files | Size: ${totalKB.toFixed(1)}KB | Provider: ${config.provider}`);
    
    // Update timer display
    const updateTimer = () => {
      if (countdown > 0) {
        updateLoading('Generating Report', `~${countdown}s remaining`);
        setLogStep('generate', 'active', `~${countdown}s`);
      } else {
        updateLoading('Generating Report', 'Almost done...');
        setLogStep('generate', 'active', 'processing...');
      }
    };
    
    updateTimer();
    const countdownInterval = setInterval(() => {
      countdown--;
      updateTimer();
    }, 1000);

    let response: string;
    try {
      if (config.apiKey === 'PROXY' && (window as any).smartAICall) {
        console.log('[Deep] Routing through proxy');
        response = await (window as any).smartAICall({ provider: config.provider || 'operator_x02', apiKey: 'PROXY', model: config.model || 'x02-coder', message: prompt, maxTokens: 4000, temperature: 0.7 });
      } else {
        response = await invoke('call_ai_api', {
          request: { provider: config.provider || 'groq', api_key: config.apiKey, base_url: config.apiBaseUrl || '', model: config.model || '', message: prompt, max_tokens: 4000, temperature: 0.7 }
        }) as string;
      }
    } finally {
      // Always stop timer
      clearInterval(countdownInterval);
    }

    if (!response) throw new Error('Empty response');
    
    const actualTime = estimatedSeconds - countdown;
    setLogStep('generate', 'done', `${actualTime > 0 ? actualTime : 1}s`);
    updateLoading('Complete', '✓ Analysis ready');
    await delay(400); // Pause to show completion before transitioning

    saveProjectContext({ projectName, projectPath, fileCount: filesToAnalyze.length, mode: 'deep', files: fileContents, analysisResult: response, timestamp: Date.now() });

    // Display collapsible result (use totalCodeSize calculated earlier)
    const formattedHtml = formatResponse(response);
    const collapsible = createCollapsibleResponse({
      projectName,
      mode: 'deep',
      response,
      formattedHtml,
      stats: { 
        totalFiles: filesToAnalyze.length, 
        filesRead: fileContents.length, 
        totalSize: totalCodeSize,
        tokens: '~10K' 
      },
      provider: config.provider
    });

    // Hide user message with animation
    userDiv.style.transition = 'all 0.4s ease-out';
    userDiv.style.opacity = '0';
    userDiv.style.transform = 'translateY(-10px)';
    userDiv.style.maxHeight = userDiv.offsetHeight + 'px';
    setTimeout(() => {
      userDiv.style.maxHeight = '0';
      userDiv.style.padding = '0';
      userDiv.style.margin = '0';
    }, 200);
    setTimeout(() => userDiv.remove(), 500);

    loadingDiv.innerHTML = '';
    collapsible.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply (deep)
    loadingDiv.appendChild(collapsible);

    clearInterval(deepTimerInterval);
    const deepTotal = ((Date.now() - deepStartTime) / 1000).toFixed(1);
    const dtEl = loadingDiv.querySelector('.timer-text');
    if (dtEl) dtEl.textContent = 'Completed in ' + deepTotal + 's';
    console.log('✅ [Deep] Analysis complete!');

  } catch (error: any) {
    try { clearInterval(deepTimerInterval); } catch(e) {}
    loadingDiv.innerHTML = `<div style="display:flex;align-items:flex-start;gap:12px;color:#f55;"><span style="font-size:24px;">❌</span><div><div style="font-weight:500;">Deep Analysis Failed</div><div style="font-size:12px;color:#888;margin-top:4px;">${error.message}</div></div></div>`;
  }

  container.scrollTop = container.scrollHeight;
}

// ============================================================================
// HTML VIEW MODAL
// ============================================================================

function showHtmlView(rawResponse: string, formattedHtml: string, projectName?: string): void {
  document.querySelector('.html-view-overlay')?.remove();
  
  const wordCount = rawResponse.split(/\s+/).length;
  const charCount = rawResponse.length;
  const timestamp = new Date().toLocaleString();
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const overlay = document.createElement('div');
  overlay.className = 'html-view-overlay';
  overlay.setAttribute("data-analysis-result", "true"); // X02: prevent AutoApply
  
  overlay.innerHTML = `
    <div class="html-view-modal">
      <div class="html-view-header">
        <div class="html-view-icon">${icons.document}</div>
        <div class="html-view-title-group">
          <h2 class="html-view-title">${projectName || 'Project'}</h2>
          <div class="html-view-subtitle">Technical Analysis Report • ${dateStr}</div>
        </div>
        <div class="html-view-actions">
          <button class="html-view-btn" data-action="copy">${icons.copy}<span>Copy</span></button>
          <button class="html-view-btn" data-action="download">${icons.download}<span>Export</span></button>
        </div>
        <button class="html-view-close">${icons.close}</button>
      </div>
      <div class="html-view-tabs">
        <button class="html-view-tab active" data-tab="formatted">${icons.eye}<span>Document</span></button>
        <button class="html-view-tab" data-tab="raw">${icons.code}<span>Markdown</span></button>
      </div>
      <div class="html-view-body">
        <div class="html-formatted-view" data-content="formatted">${formatHtmlContent(rawResponse, projectName)}</div>
        <div class="html-raw-view" data-content="raw" style="display:none;"><pre>${escapeHtml(rawResponse)}</pre></div>
      </div>
      <div class="html-view-footer">
        <div class="html-view-stats">
          <span class="html-view-stat">${icons.fileText}<span>${wordCount} words</span></span>
          <span class="html-view-stat">${icons.code}<span>${charCount} characters</span></span>
          <span class="html-view-stat">${icons.clock}<span>Generated ${timestamp}</span></span>
        </div>
      </div>
    </div>`;
  
  overlay.querySelector('.html-view-close')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
  
  overlay.querySelectorAll('.html-view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      overlay.querySelectorAll('.html-view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      overlay.querySelectorAll('[data-content]').forEach(c => { (c as HTMLElement).style.display = c.getAttribute('data-content') === tabName ? 'block' : 'none'; });
    });
  });
  
  overlay.querySelectorAll('.html-view-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-action');
      const span = btn.querySelector('span');
      if (action === 'copy') {
        await navigator.clipboard.writeText(rawResponse);
        if (span) { span.textContent = 'Copied!'; setTimeout(() => span.textContent = 'Copy', 2000); }
      } else if (action === 'download') {
        const blob = new Blob([rawResponse], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName || 'analysis'}-analysis.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (span) { span.textContent = 'Exported!'; setTimeout(() => span.textContent = 'Export', 2000); }
      }
    });
  });
  
  document.body.appendChild(overlay);
}

function formatHtmlContent(text: string, projectName?: string): string {
  // Parse sections and create professional document structure
  let sectionNum = 0;
  const sectionTitles: string[] = [];
  
  // First pass: collect section titles
  const sectionPattern = /^\d+\.\s*\*?\*?([^*\n]+)\*?\*?\s*$/gm;
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    sectionTitles.push(match[1].trim());
  }
  
  // Process text line by line for better control
  const lines = text.split('\n');
  let htmlLines: string[] = [];
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for section header (e.g., "1. Project Type")
    const sectionMatch = line.match(/^\d+\.\s*\*?\*?([^*\n]+)\*?\*?\s*$/);
    if (sectionMatch) {
      // Close previous section if open
      if (inSection) {
        htmlLines.push('</div></div>');
      }
      sectionNum++;
      htmlLines.push(`<div class="doc-section" id="section-${sectionNum}">`);
      htmlLines.push(`<div class="doc-section-header">`);
      htmlLines.push(`<span class="doc-section-num">${sectionNum}</span>`);
      htmlLines.push(`<span class="doc-section-title">${sectionMatch[1].trim()}</span>`);
      htmlLines.push(`</div>`);
      htmlLines.push(`<div class="doc-section-content">`);
      inSection = true;
      continue;
    }
    
    // Skip markdown header markers
    line = line.replace(/^#{1,4}\s*/, '');
    
    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      let codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      htmlLines.push(`<div class="doc-code-block">`);
      htmlLines.push(`<div class="doc-code-header"><span class="doc-code-lang">${lang || 'code'}</span><button class="doc-code-copy" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent);this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)">Copy</button></div>`);
      htmlLines.push(`<pre class="doc-code-content"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      htmlLines.push(`</div>`);
      continue;
    }
    
    // Bold field labels (e.g., "* **Frontend**: React" or "**Frontend**: React")
    const fieldMatch = line.match(/^[\*\-•]?\s*\*\*([^*:]+)\*\*:\s*(.+)$/);
    if (fieldMatch) {
      htmlLines.push(`<div class="doc-field"><span class="doc-field-label">${fieldMatch[1]}</span><span class="doc-field-value">${processInline(fieldMatch[2])}</span></div>`);
      continue;
    }
    
    // List items
    const listMatch = line.match(/^[\*\-•]\s+(.+)$/);
    if (listMatch) {
      htmlLines.push(`<div class="doc-list-item"><span class="doc-bullet"></span><span class="doc-list-text">${processInline(listMatch[1])}</span></div>`);
      continue;
    }
    
    // Regular text (skip empty lines)
    if (line.trim()) {
      htmlLines.push(`<p class="doc-para">${processInline(line)}</p>`);
    }
  }
  
  // Close last section
  if (inSection) {
    htmlLines.push('</div></div>');
  }
  
  // Helper function to process inline elements
  function processInline(text: string): string {
    return text
      .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="doc-bold">$1</strong>');
  }

  // Build table of contents
  const tocHtml = sectionTitles.length > 0 ? `
    <div class="doc-toc">
      <div class="doc-toc-title">Contents</div>
      <div class="doc-toc-list">
        ${sectionTitles.map((title, i) => `<span class="doc-toc-item"><span class="toc-num">${i + 1}.</span>${title}</span>`).join('')}
      </div>
    </div>` : '';

  const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `
    <div class="doc-container">
      <div class="doc-header-bar">
        <div class="doc-header-top">
          <div class="doc-header-icon">📊</div>
          <div class="doc-header-title">${projectName || 'Project'}</div>
        </div>
        <div class="doc-header-meta">
          <span class="doc-header-badge">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/></svg>
            AI Analysis
          </span>
          <span class="doc-header-stat">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5.75 0a.75.75 0 0 1 .75.75V2h3V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25V3.75C2 2.784 2.784 2 3.75 2H5V.75A.75.75 0 0 1 5.75 0Zm7.75 7.5H2.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25Z"/></svg>
            ${timestamp}
          </span>
          <span class="doc-header-stat">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073Z"/></svg>
            ${sectionTitles.length} sections
          </span>
        </div>
      </div>
      ${tocHtml}
      <div class="doc-body">
        ${htmlLines.join('\n')}
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// COLLAPSIBLE RESPONSE
// ============================================================================

interface CollapsibleOptions {
  projectName: string;
  mode: 'quick' | 'deep';
  response: string;
  formattedHtml: string;
  stats: { 
    totalFiles: number;      // Total files in project
    filesRead: number;       // Files actually read
    totalSize: number;       // Total bytes analyzed
    tokens: string;          // Estimated tokens
  };
  provider: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createCollapsibleResponse(options: CollapsibleOptions): HTMLElement {
  const { projectName, mode, response, formattedHtml, stats, provider } = options;
  const isQuick = mode === 'quick';
  const modeIcon = isQuick ? icons.zap : icons.brain;
  
  const container = document.createElement('div');
  container.className = 'analysis-collapsible';
  
  // Store response data as data attributes for event delegation
  const responseId = `analysis-${Date.now()}`;
  container.setAttribute('data-response-id', responseId);
  container.setAttribute('data-response', btoa(encodeURIComponent(response)));
  container.setAttribute('data-formatted', btoa(encodeURIComponent(formattedHtml)));
  container.setAttribute('data-project-name', projectName);
  
  container.innerHTML = `
    <div class="analysis-collapse-header" data-action="toggle">
      <div class="analysis-collapse-icon">
        ${modeIcon}
      </div>
      <div class="analysis-collapse-info">
        <span class="analysis-collapse-title">${projectName}</span>
        <div class="analysis-collapse-stats">
          <span class="analysis-stat-item files"><span class="analysis-stat-value">${stats.filesRead}</span><span class="analysis-stat-label">/${stats.totalFiles} files</span></span>
          <span class="analysis-stat-separator">·</span>
          <span class="analysis-stat-item size"><span class="analysis-stat-value">${formatSize(stats.totalSize)}</span><span class="analysis-stat-label"> analyzed</span></span>
          <span class="analysis-stat-separator">·</span>
          <span class="analysis-stat-item tokens"><span class="analysis-stat-value">${stats.tokens}</span><span class="analysis-stat-label"> tokens</span></span>
        </div>
      </div>
      <div class="analysis-collapse-toggle">
        ${icons.chevronDown}
      </div>
    </div>
    <div class="analysis-collapse-actions-bar">
      <div class="analysis-collapse-actions">
        <button class="analysis-collapse-btn" data-action="copy">${icons.copy}<span>Copy</span></button>
        <button class="analysis-collapse-btn" data-action="view">${icons.eye}<span>View</span></button>
        <button class="analysis-collapse-btn" data-action="export">${icons.download}<span>Export</span></button>
      </div>
      <div class="analysis-collapse-meta">
        ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${provider}
      </div>
    </div>
    <div class="analysis-collapse-content">
      <div class="ai-message-content">${formattedHtml}</div>
    </div>
  `;
  
  return container;
}

// Event delegation handler - attached to document once
function setupCollapsibleEventDelegation(): void {
  if ((window as any).__collapsibleDelegationSetup) return;
  (window as any).__collapsibleDelegationSetup = true;
  
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    // Find the collapsible container
    const collapsible = target.closest('.analysis-collapsible') as HTMLElement;
    if (!collapsible) return;
    
    // Check for header click (toggle)
    const header = target.closest('.analysis-collapse-header');
    if (header) {
      collapsible.classList.toggle('expanded');
      return;
    }
    
    // Check for action button click
    const btn = target.closest('.analysis-collapse-btn') as HTMLElement;
    if (!btn) return;
    
    e.stopPropagation();
    const action = btn.getAttribute('data-action');
    
    // Get stored data
    const responseEncoded = collapsible.getAttribute('data-response');
    const formattedEncoded = collapsible.getAttribute('data-formatted');
    const projectName = collapsible.getAttribute('data-project-name');
    
    if (!responseEncoded || !formattedEncoded) return;
    
    const response = decodeURIComponent(atob(responseEncoded));
    const formattedHtml = decodeURIComponent(atob(formattedEncoded));
    
    if (action === 'copy') {
      await navigator.clipboard.writeText(response);
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `${icons.copy} Copied!`;
      setTimeout(() => btn.innerHTML = originalHtml, 1500);
    } else if (action === 'view') {
      showHtmlView(response, formattedHtml, projectName || 'Project');
    } else if (action === 'export') {
      const blob = new Blob([response], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'analysis'}-analysis.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show feedback
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `${icons.download} Exported!`;
      setTimeout(() => btn.innerHTML = originalHtml, 1500);
    }
  });
}

// ============================================================================
// RESPONSE ACTIONS
// ============================================================================

function createResponseActions(rawResponse: string, formattedHtml: string, projectName?: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'analysis-response-actions';
  
  const button = document.createElement('button');
  button.className = 'analysis-action-btn';
  button.innerHTML = icons.code;
  button.title = 'View as HTML';
  button.onclick = () => showHtmlView(rawResponse, formattedHtml, projectName);
  container.appendChild(button);
  
  return container;
}

function formatResponse(text: string): string {
  return text
    // Code blocks - compact
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#151515;padding:10px 12px;border-radius:6px;overflow-x:auto;margin:6px 0;border:1px solid #2a2a2a;font-size:12px;line-height:1.4;"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#2a2a2a;padding:1px 6px;border-radius:4px;font-size:12px;">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#e0e0e0;">$1</strong>')
    // Headers - much tighter margins
    .replace(/^### (.+)$/gm, '<div style="color:#4fc3f7;margin:10px 0 4px;font-size:13px;font-weight:600;">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#4fc3f7;margin:12px 0 4px;font-size:14px;font-weight:600;">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="color:#4fc3f7;margin:14px 0 6px;font-size:15px;font-weight:600;">$1</div>')
    // Lists - compact
    .replace(/^\* (.+)$/gm, '<div style="margin:2px 0;padding-left:12px;">• $1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin:2px 0;padding-left:12px;">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="margin:2px 0;padding-left:12px;">$&</div>')
    // Remove excessive line breaks, keep single breaks
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n/g, '<div style="height:8px;"></div>')
    .replace(/\n/g, '<br style="line-height:1.4;">');
}

// ============================================================================
// CREATE FILE/FOLDER DIALOG
// ============================================================================

async function showCreateDialog(type: 'file' | 'folder', projectPath: string): Promise<void> {
  // Remove any existing dialogs (cleanup stuck dialogs)
  document.querySelectorAll('.create-dialog-overlay').forEach(el => el.remove());
  
  const isFile = type === 'file';
  const iconEmoji = isFile ? '📄' : '📁';
  const title = isFile ? 'New File' : 'New Folder';
  const placeholder = isFile ? 'example.ts' : 'folder-name';
  const hint = isFile ? 'Enter file name with extension (e.g., index.ts, styles.css)' : 'Enter folder name';
  const projectName = projectPath.split(/[/\\]/).pop() || 'project';
  
  // Use type-file or type-folder to prevent chevron injection from file tree code
  const iconClass = isFile ? 'type-file' : 'type-folder';
  
  // Create dialog using DOM methods to avoid innerHTML SVG issues
  const overlay = document.createElement('div');
  overlay.className = 'create-dialog-overlay';
  
  const dialog = document.createElement('div');
  dialog.className = 'create-dialog';
  
  // Header
  const header = document.createElement('div');
  header.className = 'create-dialog-header';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'create-dialog-icon ' + iconClass;
  iconDiv.textContent = iconEmoji;
  iconDiv.style.fontSize = '18px';
  iconDiv.style.display = 'flex';
  iconDiv.style.alignItems = 'center';
  iconDiv.style.justifyContent = 'center';
  
  const titleContainer = document.createElement('div');
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'create-dialog-title';
  titleDiv.textContent = title;
  
  const subtitleDiv = document.createElement('div');
  subtitleDiv.className = 'create-dialog-subtitle';
  subtitleDiv.textContent = 'in ' + projectName;
  
  titleContainer.appendChild(titleDiv);
  titleContainer.appendChild(subtitleDiv);
  header.appendChild(iconDiv);
  header.appendChild(titleContainer);
  
  // Body
  const body = document.createElement('div');
  body.className = 'create-dialog-body';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'create-dialog-input';
  input.placeholder = placeholder;
  input.setAttribute('spellcheck', 'false');
  
  const hintDiv = document.createElement('div');
  hintDiv.className = 'create-dialog-hint';
  hintDiv.textContent = hint;
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'create-dialog-error';
  errorDiv.textContent = 'Name cannot be empty or contain invalid characters';
  
  body.appendChild(input);
  body.appendChild(hintDiv);
  body.appendChild(errorDiv);
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'create-dialog-footer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'create-dialog-btn cancel';
  cancelBtn.textContent = 'Cancel';
  
  const createBtn = document.createElement('button');
  createBtn.className = 'create-dialog-btn create';
  createBtn.textContent = 'Create';
  createBtn.disabled = true;
  
  footer.appendChild(cancelBtn);
  footer.appendChild(createBtn);
  
  // Assemble dialog
  dialog.appendChild(header);
  dialog.appendChild(body);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  
  document.body.appendChild(overlay);
  
  // CRITICAL: Remove any chevrons injected by file tree scripts
  const removeInjectedChevrons = () => {
    overlay.querySelectorAll('.folder-chevron, [class*="chevron"]').forEach(el => {
      console.log('🗑️ Removing injected chevron from dialog');
      el.remove();
    });
  };
  
  // Remove immediately
  removeInjectedChevrons();
  
  // Watch for any future injections
  const observer = new MutationObserver((mutations) => {
    let hasChevron = false;
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('folder-chevron') || 
              node.className?.includes?.('chevron')) {
            hasChevron = true;
          }
          // Also check children
          if (node.querySelector?.('.folder-chevron, [class*="chevron"]')) {
            hasChevron = true;
          }
        }
      });
    });
    if (hasChevron) {
      removeInjectedChevrons();
    }
  });
  
  observer.observe(overlay, { childList: true, subtree: true });
  
  // Store observer reference to disconnect on close
  (overlay as any).__chevronObserver = observer;
  
  // Focus input
  setTimeout(() => input.focus(), 50);
  
  // Validate input
  const validateName = (name: string): boolean => {
    if (!name.trim()) return false;
    // Check for invalid characters
    const invalidChars = /[<>:"|?*\\\/]/;
    if (invalidChars.test(name)) return false;
    return true;
  };
  
  // Input handler
  input.addEventListener('input', () => {
    const isValid = validateName(input.value);
    createBtn.disabled = !isValid;
    errorDiv.classList.toggle('show', input.value.length > 0 && !isValid);
  });
  
  // Close dialog - more robust version
  const closeDialog = () => {
    try {
      // Disconnect chevron observer
      if ((overlay as any).__chevronObserver) {
        (overlay as any).__chevronObserver.disconnect();
      }
      // Remove immediately to prevent stuck state
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    } catch (e) {
      console.warn('Dialog close error:', e);
      // Force remove by ID if exists
      document.querySelector('.create-dialog-overlay')?.remove();
    }
  };
  
  // Create file/folder
  const doCreate = async () => {
    const name = input.value.trim();
    if (!validateName(name)) return;
    
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    
    // Detect path separator (Windows vs Unix)
    const sep = projectPath.includes('\\') ? '\\' : '/';
    const fullPath = projectPath + sep + name;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      if (isFile) {
        // Try create_file command
        await invoke('create_file', { path: fullPath, content: '' });
        console.log('✅ Created file:', fullPath);
      } else {
        // Try create_directory command
        await invoke('create_directory', { path: fullPath });
        console.log('✅ Created folder:', fullPath);
      }
      
      // Success! Close dialog immediately
      closeDialog();
      showToast((isFile ? 'File' : 'Folder') + ' "' + name + '" created successfully!', 'success');
      
      // Refresh file tree after dialog closed
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('file-tree-refresh'));
      }, 100);
      
    } catch (error1: any) {
      console.log('First attempt failed, trying fallback...', error1.message);
      
      // Try fallback methods
      try {
        if (isFile) {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(fullPath, '');
          console.log('✅ Created file (plugin-fs):', fullPath);
        } else {
          const { mkdir } = await import('@tauri-apps/plugin-fs');
          await mkdir(fullPath);
          console.log('✅ Created folder (plugin-fs):', fullPath);
        }
        
        // Success with fallback! Close dialog
        closeDialog();
        showToast((isFile ? 'File' : 'Folder') + ' "' + name + '" created successfully!', 'success');
        
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('file-tree-refresh'));
        }, 100);
        
      } catch (error2: any) {
        console.error('❌ All create methods failed:', error2);
        errorDiv.textContent = error2.message || 'Failed to create. Check permissions.';
        errorDiv.classList.add('show');
        createBtn.disabled = false;
        createBtn.textContent = 'Create';
      }
    }
  };
  
  // Event handlers
  createBtn.addEventListener('click', doCreate);
  cancelBtn.addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !createBtn.disabled) doCreate();
    if (e.key === 'Escape') closeDialog();
  });
  
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

// Toast notification
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const existing = document.querySelector('.create-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'create-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#238636' : '#da3633'};
    color: #fff;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    z-index: 10003;
    animation: toastSlideIn 0.3s ease;
  `;
  toast.textContent = message;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `
      @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } }
      @keyframes toastSlideOut { to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

function createMenu(x: number, y: number, projectPath: string): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'project-context-menu';
  menu.style.left = Math.min(x, window.innerWidth - 300) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 480) + 'px';
  
  const hasContext = getProjectContext();
  const contextMode = hasContext?.mode;
  
  const items: any[] = [
    { type: 'header', text: 'Create' },
    { icon: icons.file, text: 'New File', action: 'new-file', shortcut: 'Ctrl+N' },
    { icon: icons.folder, text: 'New Folder', action: 'new-folder', shortcut: 'Ctrl+Shift+N' },
    { type: 'divider' },
    { type: 'header', text: 'AI Analysis' },
    { icon: icons.zap, text: 'Quick Analyze', desc: 'Structure + key files (~2K tokens)', action: 'quick-analyze', className: 'quick' },
    { icon: icons.search, text: 'Deep Analyze', desc: 'All code files (~10K tokens)', action: 'deep-analyze', className: 'highlight' },
    ...(hasContext ? [{ icon: icons.trash, text: 'Clear Analysis', action: 'clear-context', className: 'subtle' }] : []),
    { type: 'divider' },
    { type: 'header', text: 'Tools' },
    { icon: icons.terminal, text: 'Open Terminal', action: 'terminal' },
    { icon: icons.explorer, text: 'Reveal in Explorer', action: 'reveal' },
    { type: 'divider' },
    { icon: icons.copy, text: 'Copy Path', action: 'copy-path' },
    { icon: icons.refresh, text: 'Refresh', action: 'refresh' },
  ];
  
  items.forEach((item) => {
    if (item.type === 'header') { const h = document.createElement('div'); h.className = 'project-menu-header'; h.textContent = item.text; menu.appendChild(h); return; }
    if (item.type === 'divider') { const d = document.createElement('div'); d.className = 'project-menu-divider'; menu.appendChild(d); return; }
    
    const mi = document.createElement('div');
    mi.className = `project-menu-item ${item.className || ''}`;
    
    let badge = '';
    if (item.action === 'quick-analyze' && contextMode === 'quick') badge = '<span class="context-badge">Active</span>';
    if (item.action === 'deep-analyze' && contextMode === 'deep') badge = '<span class="context-badge">Active</span>';
    
    mi.innerHTML = `
      <span class="project-menu-icon ${item.action?.includes('analyze') ? 'ai-sparkle' : ''}">${item.icon}</span>
      <div style="flex:1;">
        <div class="project-menu-text">${item.text}</div>
        ${item.desc ? `<div class="project-menu-desc">${item.desc}</div>` : ''}
      </div>
      ${item.shortcut ? `<span class="project-menu-shortcut">${item.shortcut}</span>` : ''}
      ${badge}
    `;
    
    mi.onclick = async () => {
      menu.classList.add('closing');
      await new Promise(r => setTimeout(r, 180));
      menu.remove();
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        if (item.action === 'new-file') { showCreateDialog('file', projectPath); }
        else if (item.action === 'new-folder') { showCreateDialog('folder', projectPath); }
        else if (item.action === 'quick-analyze') { quickAnalyzeProject(projectPath); }
        else if (item.action === 'deep-analyze') { deepAnalyzeProject(projectPath); }
        else if (item.action === 'clear-context') { clearProjectContext(); showToast('Analysis context cleared', 'success'); }
        else if (item.action === 'terminal') { await invoke('open_terminal', { path: projectPath }); }
        else if (item.action === 'reveal') { await invoke('reveal_in_explorer', { path: projectPath }); }
        else if (item.action === 'copy-path') { navigator.clipboard.writeText(projectPath); showToast('Path copied to clipboard', 'success'); }
        else if (item.action === 'refresh') { 
          document.dispatchEvent(new CustomEvent('file-tree-refresh')); 
          document.dispatchEvent(new CustomEvent('refresh-file-tree'));
          showToast('File tree refreshed', 'success');
        }
      } catch (e: any) { console.error('[Menu]', e); }
    };
    
    menu.appendChild(mi);
  });
  
  return menu;
}

// ============================================================================
// INITIALIZE
// ============================================================================

export function initializeProjectFolderContextMenu(): void {
  console.log('📁 [ProjectMenu] Initializing dual-mode analysis...');

  // Setup event delegation for collapsible responses
  setupCollapsibleEventDelegation();

  document.addEventListener('contextmenu', async (e) => {
    const target = e.target as HTMLElement;
    
    // .file-tree will always exist now (created by menuSystem.ts)
    const fileTree = target.closest('.file-tree, #file-tree');
    if (!fileTree || target.closest('[data-path]')) return;
    
    const isProjectHeader = target.closest('.project-name, .project-header, .folder-header') || 
                            (target.tagName === 'DIV' && target.textContent?.match(/^[A-Z0-9\-_]+$/i)) ||
                            target.classList.contains('file-container');
    if (!isProjectHeader) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    let projectPath = '';
    const firstFile = document.querySelector('[data-path]');
    if (firstFile) {
      const path = firstFile.getAttribute('data-path') || '';
      const parts = path.split(/[/\\]/);
      for (let i = parts.length - 1; i >= 0; i--) {
        if (['src', 'lib', 'app'].includes(parts[i])) { projectPath = parts.slice(0, i).join('\\'); break; }
      }
      if (!projectPath) projectPath = parts.slice(0, -2).join('\\');
    }
    
    document.querySelectorAll('.project-context-menu').forEach(m => { m.classList.add('closing'); setTimeout(() => m.remove(), 180); });
    
    const menu = createMenu(e.clientX, e.clientY, projectPath);
    document.body.appendChild(menu);
    
    setTimeout(() => {
      const close = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) { menu.classList.add('closing'); setTimeout(() => menu.remove(), 180); document.removeEventListener('click', close); } };
      document.addEventListener('click', close);
    }, 10);
  }, true);

  // Global APIs
  (window as any).quickAnalyzeProject = () => {
    const firstFile = document.querySelector('[data-path]');
    if (!firstFile) { alert('No project open.'); return; }
    const path = firstFile.getAttribute('data-path') || '';
    const parts = path.split(/[/\\]/);
    let projectPath = '';
    for (let i = parts.length - 1; i >= 0; i--) { if (['src', 'lib', 'app'].includes(parts[i])) { projectPath = parts.slice(0, i).join('\\'); break; } }
    if (!projectPath) projectPath = parts.slice(0, -2).join('\\');
    quickAnalyzeProject(projectPath);
  };

  (window as any).deepAnalyzeProject = () => {
    const firstFile = document.querySelector('[data-path]');
    if (!firstFile) { alert('No project open.'); return; }
    const path = firstFile.getAttribute('data-path') || '';
    const parts = path.split(/[/\\]/);
    let projectPath = '';
    for (let i = parts.length - 1; i >= 0; i--) { if (['src', 'lib', 'app'].includes(parts[i])) { projectPath = parts.slice(0, i).join('\\'); break; } }
    if (!projectPath) projectPath = parts.slice(0, -2).join('\\');
    deepAnalyzeProject(projectPath);
  };
  
  (window as any).projectContext = { get: getProjectContext, clear: clearProjectContext };

  // Global APIs for file/folder creation
  (window as any).createNewFile = (projectPath?: string) => {
    if (!projectPath) {
      const firstFile = document.querySelector('[data-path]');
      if (!firstFile) { alert('No project open.'); return; }
      const path = firstFile.getAttribute('data-path') || '';
      const parts = path.split(/[/\\]/);
      for (let i = parts.length - 1; i >= 0; i--) { if (['src', 'lib', 'app'].includes(parts[i])) { projectPath = parts.slice(0, i).join('\\'); break; } }
      if (!projectPath) projectPath = parts.slice(0, -2).join('\\');
    }
    showCreateDialog('file', projectPath!);
  };

  (window as any).createNewFolder = (projectPath?: string) => {
    if (!projectPath) {
      const firstFile = document.querySelector('[data-path]');
      if (!firstFile) { alert('No project open.'); return; }
      const path = firstFile.getAttribute('data-path') || '';
      const parts = path.split(/[/\\]/);
      for (let i = parts.length - 1; i >= 0; i--) { if (['src', 'lib', 'app'].includes(parts[i])) { projectPath = parts.slice(0, i).join('\\'); break; } }
      if (!projectPath) projectPath = parts.slice(0, -2).join('\\');
    }
    showCreateDialog('folder', projectPath!);
  };

  // Expose refresh trigger for file tree components
  (window as any).triggerFileTreeRefresh = () => {
    document.dispatchEvent(new CustomEvent('file-tree-refresh'));
    document.dispatchEvent(new CustomEvent('refresh-file-tree'));
    document.dispatchEvent(new CustomEvent('fileTreeRefresh'));
  };

  // Expose createMenu for project header icon button
  (window as any).createProjectMenu = createMenu;
  
  // Listen for show-project-menu event (from header icon)
  document.addEventListener('show-project-menu', ((e: CustomEvent) => {
    const { x, y, projectPath } = e.detail;
    
    // Remove existing menus
    document.querySelectorAll('.project-context-menu').forEach(m => {
      m.classList.add('closing');
      setTimeout(() => m.remove(), 180);
    });
    
    // Create and show menu
    const menu = createMenu(x, y, projectPath);
    document.body.appendChild(menu);
    
    // Close handler
    const close = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        menu.classList.add('closing');
        setTimeout(() => menu.remove(), 180);
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 10);
  }) as EventListener);

  console.log('✅ [ProjectMenu] Ready with Quick & Deep modes!');
  console.log('📁 [ProjectMenu] File tree should listen for: file-tree-refresh, refresh-file-tree, fileTreeRefresh events');
  
  // ============================================================================
  // PROJECT HEADER MENU BUTTON
  // ============================================================================
  
  function addProjectHeaderMenuButton(): void {
    // Now .file-tree always exists (created by menuSystem.ts if missing)
    const fileTree = document.querySelector('.file-tree, #file-tree');
    if (!fileTree) return;
    
    const projectHeader = fileTree.querySelector('.project-header') as HTMLElement;
    if (!projectHeader) return;
    
    // Skip if already has menu button or wrapper
    if (projectHeader.querySelector('.project-header-menu-btn')) return;
    if (projectHeader.querySelector('.header-buttons')) return;
    
    const closeButton = projectHeader.querySelector('button') as HTMLElement;
    
    if (!closeButton) {
      console.log('📂 [ProjectMenu] No close button found, creating header buttons...');
      
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'header-buttons';
      wrapper.style.cssText = 'display:flex;align-items:center;gap:2px;margin-left:auto;';
      
      // Create menu button
      const menuBtn = createHeaderMenuButton();
      wrapper.appendChild(menuBtn);
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.title = 'Close project';
      closeBtn.style.cssText = 'background:transparent;border:none;color:#888;cursor:pointer;font-size:16px;padding:4px 8px;border-radius:4px;transition:all 0.15s;';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent('close-project'));
        const ft = document.querySelector('.file-tree, #file-tree');
        if (ft) ft.innerHTML = '';
        console.log('✅ Project closed');
      });
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255,255,255,0.15)';
        closeBtn.style.color = '#fff';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = '#888';
      });
      wrapper.appendChild(closeBtn);
      
      projectHeader.style.display = 'flex';
      projectHeader.style.justifyContent = 'space-between';
      projectHeader.style.alignItems = 'center';
      
      projectHeader.appendChild(wrapper);
      console.log('✅ [ProjectMenu] Header buttons created!');
      return;
    }
    
    // Close button exists - wrap both buttons
    console.log('📂 [ProjectMenu] Found close button, wrapping with menu button...');
    
    const menuBtn = createHeaderMenuButton();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'header-buttons';
    wrapper.style.cssText = 'display:flex;align-items:center;gap:2px;';
    
    wrapper.appendChild(menuBtn);
    wrapper.appendChild(closeButton);
    projectHeader.appendChild(wrapper);
    
    console.log('✅ [ProjectMenu] Header menu button added!');
  }
  
  function createHeaderMenuButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'project-header-menu-btn';
    btn.title = 'Project menu';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:none;background:transparent;color:#888;cursor:pointer;border-radius:4px;padding:0;transition:all 0.15s;';
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = btn.getBoundingClientRect();
      
      // Get project path
      let projectPath = '';
      const firstFile = document.querySelector('[data-path]');
      if (firstFile) {
        const path = firstFile.getAttribute('data-path') || '';
        const parts = path.split(/[/\\]/);
        for (let i = parts.length - 1; i >= 0; i--) {
          if (['src', 'lib', 'app', 'public'].includes(parts[i])) {
            projectPath = parts.slice(0, i).join(path.includes('/') ? '/' : '\\');
            break;
          }
        }
        if (!projectPath) projectPath = parts.slice(0, -2).join(path.includes('/') ? '/' : '\\');
      }
      
      // Remove existing menus
      document.querySelectorAll('.project-context-menu').forEach(m => {
        m.classList.add('closing');
        setTimeout(() => m.remove(), 180);
      });
      
      // Create and show menu
      const menu = createMenu(rect.left, rect.bottom + 4, projectPath);
      document.body.appendChild(menu);
      
      // Close handler
      const close = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node)) {
          menu.classList.add('closing');
          setTimeout(() => menu.remove(), 180);
          document.removeEventListener('click', close);
        }
      };
      setTimeout(() => document.addEventListener('click', close), 10);
    });
    
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.15)';
      btn.style.color = '#fff';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = '#888';
    });
    
    return btn;
  }
  
  // Add button when project opens
  document.addEventListener('project-opened', () => {
    console.log('📂 [ProjectMenu] project-opened event, adding header button...');
    setTimeout(addProjectHeaderMenuButton, 200);
    setTimeout(addProjectHeaderMenuButton, 500);
    setTimeout(addProjectHeaderMenuButton, 1000);
    setTimeout(addProjectHeaderMenuButton, 2000);
  });
  
  // Periodic check - look for any file explorer with files but no menu button
  setInterval(() => {
    const hasButton = document.querySelector('.project-header-menu-btn');
    const hasFiles = document.querySelector('[data-path]');
    
    // If we have files but no menu button, try to add it
    if (!hasButton && hasFiles) {
      addProjectHeaderMenuButton();
    }
  }, 2000);
  
  // Initial check after delay
  setTimeout(addProjectHeaderMenuButton, 1000);
  
  // Expose globally
  (window as any).addProjectHeaderMenuButton = addProjectHeaderMenuButton;
  
  // 🔧 EXPOSE ANALYZE FUNCTIONS FOR AI DROPDOWN
  // These take a path parameter directly
  (window as any).quickAnalyzeProject = quickAnalyzeProject;
  (window as any).deepAnalyzeProject = deepAnalyzeProject;
  
  console.log('✅ [ProjectMenu] Analyze functions exposed to window');
}

export default initializeProjectFolderContextMenu;