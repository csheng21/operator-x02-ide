// ============================================================================
// PROFESSIONAL SVG ICONS - PIXEL-ALIGNED SHARP ICONS
// ============================================================================
// 
// Clean vertical layout - all icons same gray color
// Pixel-aligned SVGs for crisp rendering at 16x16
// Enhanced Analyze Badge with multiple style options
//
// Layout:
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Ask me anything...                                                          │
// │                                                                             │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │ [Analyze] [</>] [🔍] [📷] [📄] [⚡]                            [ ↑ SEND ]   │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ============================================================================

/**
 * SVG Icons - Pixel-aligned for crisp 16x16 display
 * All icons use 24x24 viewBox with integer coordinates for pixel grid alignment
 */
export const PROFESSIONAL_ICONS = {
  code: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`,
  
  camera: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`,
  
  // Camera ON - Camera with indicator dot
  cameraOn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
    <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none"></circle>
  </svg>`,
  
  image: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="9" cy="9" r="2"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>`,
  
  file: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>`,
  
  lightning: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>`,
  
  microphone: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>`,
  
  send: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>`,
  
  sendUp: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>`,
  
  plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`,
  
  search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="17" y2="17"></line>
  </svg>`,
  
  settings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`,
  
  analyze: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="17" y2="17"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>`,

  // Small analyze icon for badge
  analyzeSmall: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="17" y2="17"></line>
  </svg>`,

  stop: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
  </svg>`,

  globe: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>`,

  upload: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`,
  
  debug: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12" y2="16"></line>
  </svg>`,

  // ============================================
  // GROUPED TOOLBAR ICONS
  // ============================================
  
  // Auto Mode OFF - Simple circle with dot (inactive/standby)
  autoModeOff: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`,
  
  // Auto Mode ON - Sun with rays (active/running)
  autoModeOn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>`,
  
  // Terminal - Command prompt
  terminal: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>`,

  // Terminal ON - Command prompt with indicator dot
  terminalOn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
    <circle cx="18" cy="7" r="2.5" fill="currentColor" stroke="none"></circle>
  </svg>`,

  // AI Search OFF - Empty star (outline)
  aiSearchOff: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`,
  
  // AI Search ON - Filled star with sparkle
  aiSearchOn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`,

  // Attach File - Paperclip
  attach: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>`,

  // Fix Errors - Wrench tool
  fixErrors: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>`
};

// ============================================================================
// TOOLBAR BUTTON CONFIG - Grouped Layout
// ============================================================================

export interface ToolButtonConfig {
  id: string;
  icon: keyof typeof PROFESSIONAL_ICONS;
  iconOn?: keyof typeof PROFESSIONAL_ICONS;  // Icon when active
  tooltip: string;
  group: 'mode' | 'ai' | 'attach' | 'action';
  color: string;
  colorOn?: string;  // Color when active
  hoverBg: string;
  activeClass?: string;
}

export const TOOLBAR_BUTTONS: ToolButtonConfig[] = [
  // MODE GROUP - Auto Mode + Project Search
  {
    id: 'autonomous-mode-toggle',
    icon: 'autoModeOff',
    iconOn: 'autoModeOn',
    tooltip: 'Auto Mode',
    group: 'mode',
    color: '#707070',
    colorOn: '#06b6d4',
    hoverBg: 'rgba(6, 182, 212, 0.15)',
    activeClass: 'auto-active'
  },
  {
    id: 'ai-search-btn',
    icon: 'aiSearchOff',
    iconOn: 'aiSearchOn',
    tooltip: 'Project Search',
    group: 'mode',
    color: '#707070',
    colorOn: '#10b981',
    hoverBg: 'rgba(16, 185, 129, 0.15)',
    activeClass: 'ai-active'
  },
  
  // AI GROUP - Terminal, Analyze, Debug
  {
    id: 'terminal-ctx-btn',
    icon: 'terminal',
    iconOn: 'terminalOn',  // Icon with indicator dot when ON
    tooltip: 'Terminal Context',
    group: 'ai',
    color: '#707070',  // OFF: Gray (same as others)
    colorOn: '#4fc3f7',  // ON: Light blue
    hoverBg: 'rgba(79, 195, 247, 0.15)',
    activeClass: 'terminal-active'
  },
  {
    id: 'analyze-code-btn',
    icon: 'analyze',
    tooltip: 'Analyze Code',
    group: 'ai',
    color: '#3b82f6',
    hoverBg: 'rgba(59, 130, 246, 0.15)',
    activeClass: 'analyze-active'
  },
  {
    id: 'debug-code-btn',
    icon: 'debug',
    tooltip: 'Debug Code',
    group: 'ai',
    color: '#8b5cf6',
    hoverBg: 'rgba(139, 92, 246, 0.15)',
    activeClass: 'debug-active'
  },
  
  // ATTACH GROUP
  {
    id: 'camera-toggle-btn',
    icon: 'camera',
    iconOn: 'cameraOn',  // Icon with indicator dot when ON
    tooltip: 'Camera',
    group: 'attach',
    color: '#707070',
    colorOn: '#f472b6',  // Pink when active
    hoverBg: 'rgba(244, 114, 182, 0.15)',
    activeClass: 'camera-active'
  },
  {
    id: 'assistant-upload',
    icon: 'attach',
    tooltip: 'Attach File',
    group: 'attach',
    color: '#707070',
    hoverBg: 'rgba(255, 255, 255, 0.08)'
  },
  
  // ACTION GROUP
  {
    id: 'fix-errors-btn',
    icon: 'fixErrors',
    tooltip: 'Fix Errors',
    group: 'action',
    color: '#f59e0b',
    hoverBg: 'rgba(245, 158, 11, 0.15)',
    activeClass: 'fix-active'
  },
  {
    id: 'quick-actions-btn',
    icon: 'lightning',
    tooltip: 'Quick Actions',
    group: 'action',
    color: '#a855f7',
    hoverBg: 'rgba(168, 85, 247, 0.15)',
    activeClass: 'quick-active'
  }
];

export const COLORS = {
  autoMode: '#06b6d4',
  terminal: '#4fc3f7',
  aiSearch: '#10b981',
  analyze: '#3b82f6',
  debug: '#8b5cf6',
  camera: '#f472b6',
  fixErrors: '#f59e0b',
  quickActions: '#a855f7',
  default: '#707070',
};

// ============================================================================
// ANALYZE BADGE STYLE TYPE
// ============================================================================
export type AnalyzeBadgeStyle = 'pill' | 'chip' | 'accent' | 'outlined' | 'glass';

// Current badge style - can be changed at runtime
let currentBadgeStyle: AnalyzeBadgeStyle = 'pill';

/**
 * Set the Analyze badge style
 */
export function setAnalyzeBadgeStyle(style: AnalyzeBadgeStyle): void {
  currentBadgeStyle = style;
  addAnalyzeBadgeStyles();
  console.log(`✅ Analyze badge style set to: ${style}`);
}

/**
 * Add Analyze badge styles based on current style setting
 */
function addAnalyzeBadgeStyles(): void {
  // Remove existing badge styles
  const existing = document.getElementById('analyze-badge-styles');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = 'analyze-badge-styles';
  
  // ULTRA HIGH SPECIFICITY - Will override everything
  const baseStyles = `
    /* ============================================================================ */
    /* ANALYZE MODE BADGE - ULTRA HIGH SPECIFICITY BASE STYLES                     */
    /* ============================================================================ */
    
    /* Target by class - repeated for specificity */
    .analyze-mode-badge,
    .analyze-mode-badge.analyze-mode-badge,
    span.analyze-mode-badge,
    div.analyze-mode-badge,
    .code-analysis-badge,
    .mode-indicator,
    .analysis-indicator,
    .analyze-badge,
    
    /* Target by attribute */
    [class*="analyze-badge"],
    [class*="mode-badge"],
    [class*="analyze-mode"],
    
    /* Target spans in toolbar areas */
    .chat-input-box .mode-label,
    .modern-bottom-toolbar .mode-label,
    .tool-buttons-group > span:not(.tool-button):not(button),
    .modern-tools-left > span:not(.tool-button):not(button),
    .modern-bottom-toolbar > span:not(.tool-button):not(button),
    
    /* Target by parent context - very specific */
    .chat-input-area .tool-buttons-group > span,
    .chat-input-area .modern-tools-left > span,
    .chat-input-area .modern-bottom-toolbar > span:first-child,
    .assistant-panel .tool-buttons-group > span:not(button),
    .assistant-panel .modern-tools-left > span:not(button) {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      white-space: nowrap !important;
      cursor: default !important;
      user-select: none !important;
      -webkit-font-smoothing: antialiased !important;
      text-rendering: geometricPrecision !important;
      transition: all 0.2s ease !important;
      flex-shrink: 0 !important;
      margin-right: 6px !important;
    }
    
    /* Badge icon styling - high specificity */
    .analyze-mode-badge svg,
    span.analyze-mode-badge svg,
    .code-analysis-badge svg,
    .mode-indicator svg,
    .analyze-badge svg,
    .tool-buttons-group > span:not(.tool-button) svg,
    .modern-tools-left > span:not(.tool-button) svg,
    .chat-input-area .tool-buttons-group > span svg,
    .chat-input-area .modern-tools-left > span svg {
      flex-shrink: 0 !important;
      transition: transform 0.2s ease !important;
    }
  `;

  // Style variants with ULTRA HIGH SPECIFICITY
  const styleVariants: Record<AnalyzeBadgeStyle, string> = {
    // PILL STYLE - White background, black text (MAXIMUM VISIBILITY)
    pill: `
      /* PILL STYLE - Maximum visibility with white background */
      .analyze-mode-badge,
      .analyze-mode-badge.analyze-mode-badge,
      span.analyze-mode-badge,
      div.analyze-mode-badge,
      .code-analysis-badge,
      .mode-indicator,
      .analysis-indicator,
      .analyze-badge,
      [class*="analyze-badge"],
      [class*="mode-badge"],
      [class*="analyze-mode"],
      .tool-buttons-group > span:not(.tool-button):not(button),
      .modern-tools-left > span:not(.tool-button):not(button),
      .modern-bottom-toolbar > span:not(.tool-button):not(button):not(.modern-send-right),
      .chat-input-area .tool-buttons-group > span,
      .chat-input-area .modern-tools-left > span,
      .assistant-panel .tool-buttons-group > span:not(button),
      .assistant-panel .modern-tools-left > span:not(button) {
        padding: 4px 12px !important;
        font-size: 11px !important;
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #1a1a1a !important;
        border: none !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25) !important;
      }
      
      .analyze-mode-badge:hover,
      span.analyze-mode-badge:hover,
      .code-analysis-badge:hover,
      .mode-indicator:hover,
      .analyze-badge:hover,
      .tool-buttons-group > span:not(.tool-button):hover,
      .modern-tools-left > span:not(.tool-button):hover,
      .chat-input-area .tool-buttons-group > span:hover,
      .chat-input-area .modern-tools-left > span:hover {
        background: #f0f0f0 !important;
        background-color: #f0f0f0 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      }
      
      .analyze-mode-badge svg,
      span.analyze-mode-badge svg,
      .code-analysis-badge svg,
      .mode-indicator svg,
      .analyze-badge svg,
      .tool-buttons-group > span:not(.tool-button) svg,
      .modern-tools-left > span:not(.tool-button) svg,
      .chat-input-area .tool-buttons-group > span svg,
      .chat-input-area .modern-tools-left > span svg {
        width: 12px !important;
        height: 12px !important;
        stroke: #1a1a1a !important;
        stroke-width: 2.5 !important;
        fill: none !important;
      }
    `,
    
    // CHIP STYLE - Blue background, white text (Professional)
    chip: `
      .analyze-mode-badge,
      .code-analysis-badge,
      .mode-indicator,
      .analysis-indicator,
      [class*="analyze-badge"],
      [class*="mode-badge"],
      .tool-buttons-group > span:not(.tool-button),
      .modern-tools-left > span:not(.tool-button) {
        padding: 3px 10px !important;
        font-size: 10px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        background: #0078d4 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 4px !important;
        box-shadow: 0 1px 3px rgba(0, 120, 212, 0.3) !important;
      }
      
      .analyze-mode-badge:hover,
      .code-analysis-badge:hover,
      .mode-indicator:hover,
      .tool-buttons-group > span:not(.tool-button):hover,
      .modern-tools-left > span:not(.tool-button):hover {
        background: #106ebe !important;
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.4) !important;
      }
      
      .analyze-mode-badge svg,
      .code-analysis-badge svg,
      .mode-indicator svg,
      .tool-buttons-group > span:not(.tool-button) svg,
      .modern-tools-left > span:not(.tool-button) svg {
        width: 11px !important;
        height: 11px !important;
        stroke: #ffffff !important;
        stroke-width: 2.5 !important;
        fill: none !important;
      }
    `,
    
    // ACCENT STYLE - Green background (Success/Active indicator)
    accent: `
      .analyze-mode-badge,
      .code-analysis-badge,
      .mode-indicator,
      .analysis-indicator,
      [class*="analyze-badge"],
      [class*="mode-badge"],
      .tool-buttons-group > span:not(.tool-button),
      .modern-tools-left > span:not(.tool-button) {
        padding: 4px 10px !important;
        font-size: 11px !important;
        background: #2ea043 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 6px !important;
        box-shadow: 0 1px 3px rgba(46, 160, 67, 0.35) !important;
      }
      
      .analyze-mode-badge:hover,
      .code-analysis-badge:hover,
      .mode-indicator:hover,
      .tool-buttons-group > span:not(.tool-button):hover,
      .modern-tools-left > span:not(.tool-button):hover {
        background: #238636 !important;
        box-shadow: 0 2px 6px rgba(46, 160, 67, 0.5) !important;
      }
      
      .analyze-mode-badge svg,
      .code-analysis-badge svg,
      .mode-indicator svg,
      .tool-buttons-group > span:not(.tool-button) svg,
      .modern-tools-left > span:not(.tool-button) svg {
        width: 12px !important;
        height: 12px !important;
        stroke: #ffffff !important;
        stroke-width: 2.5 !important;
        fill: none !important;
      }
    `,
    
    // OUTLINED STYLE - Transparent with white border (Subtle)
    outlined: `
      .analyze-mode-badge,
      .code-analysis-badge,
      .mode-indicator,
      .analysis-indicator,
      [class*="analyze-badge"],
      [class*="mode-badge"],
      .tool-buttons-group > span:not(.tool-button),
      .modern-tools-left > span:not(.tool-button) {
        padding: 3px 10px !important;
        font-size: 11px !important;
        background: transparent !important;
        color: #e0e0e0 !important;
        border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
        border-radius: 6px !important;
        box-shadow: none !important;
      }
      
      .analyze-mode-badge:hover,
      .code-analysis-badge:hover,
      .mode-indicator:hover,
      .tool-buttons-group > span:not(.tool-button):hover,
      .modern-tools-left > span:not(.tool-button):hover {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
        color: #ffffff !important;
      }
      
      .analyze-mode-badge svg,
      .code-analysis-badge svg,
      .mode-indicator svg,
      .tool-buttons-group > span:not(.tool-button) svg,
      .modern-tools-left > span:not(.tool-button) svg {
        width: 12px !important;
        height: 12px !important;
        stroke: currentColor !important;
        stroke-width: 2 !important;
        fill: none !important;
      }
    `,
    
    // GLASS STYLE - Frosted glass effect
    glass: `
      .analyze-mode-badge,
      .code-analysis-badge,
      .mode-indicator,
      .analysis-indicator,
      [class*="analyze-badge"],
      [class*="mode-badge"],
      .tool-buttons-group > span:not(.tool-button),
      .modern-tools-left > span:not(.tool-button) {
        padding: 4px 12px !important;
        font-size: 11px !important;
        background: rgba(255, 255, 255, 0.92) !important;
        color: #1a1a1a !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      }
      
      .analyze-mode-badge:hover,
      .code-analysis-badge:hover,
      .mode-indicator:hover,
      .tool-buttons-group > span:not(.tool-button):hover,
      .modern-tools-left > span:not(.tool-button):hover {
        background: rgba(255, 255, 255, 1) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }
      
      .analyze-mode-badge svg,
      .code-analysis-badge svg,
      .mode-indicator svg,
      .tool-buttons-group > span:not(.tool-button) svg,
      .modern-tools-left > span:not(.tool-button) svg {
        width: 12px !important;
        height: 12px !important;
        stroke: #1a1a1a !important;
        stroke-width: 2.5 !important;
        fill: none !important;
      }
    `
  };

  style.textContent = baseStyles + styleVariants[currentBadgeStyle];
  document.head.appendChild(style);
}

/**
 * Add professional icon styles
 */
export function addProfessionalIconStyles(): void {
  if (document.getElementById('professional-icon-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'professional-icon-styles';
  style.textContent = `
    /* ============================================================================ */
    /* RESET & OVERRIDE                                                            */
    /* ============================================================================ */
    
    .assistant-panel,
    .assistant-panel *,
    .ai-chat-container,
    .chat-input-area,
    .chat-input-box {
      box-shadow: none !important;
    }
    
    /* ============================================================================ */
    /* MAIN INPUT AREA CONTAINER - COMPACT LAYOUT                                  */
    /* ============================================================================ */
    /* ============================================================================ */
    /* MAIN INPUT AREA CONTAINER - COMPACT LAYOUT                                  */
    /* ============================================================================ */
    .chat-input-area {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      padding: 6px 8px 4px 8px !important;
      margin: 0 !important;
      background: #1a1a1a !important;
      border-top: 1px solid #2a2a2a !important;
      box-sizing: border-box !important;
      overflow: visible !important;
      position: relative !important;
    }
    
    /* HIDE ALL SEPARATOR LINES - These cause the messy UI */
    .chat-input-area hr,
    .chat-input-area .separator,
    .chat-input-area .divider,
    .chat-input-area > div:empty,
    .chat-input-box hr,
    .chat-input-box .separator,
    .chat-input-box .divider,
    .chat-input-box > div:empty,
    .modern-input-wrapper hr,
    .modern-input-wrapper .separator,
    .modern-input-wrapper > div:empty,
    .modern-restructured hr,
    .modern-restructured .separator,
    .modern-restructured > div:empty {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      opacity: 0 !important;
    }
    
    /* ============================================================================ */
    /* MODERN INPUT WRAPPER - COMPACT                                              */
    /* ============================================================================ */
    .chat-input-box,
    .modern-input-wrapper {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #1a1a1a !important;
      border: none !important;
      border-radius: 0 !important;
      overflow: visible !important;
      position: relative !important;
      z-index: 1 !important;
    }
    
    .chat-input-box:focus-within,
    .modern-input-wrapper:focus-within {
      border: none !important;
      box-shadow: none !important;
    }
    
    /* ============================================================================ */
    /* TEXTAREA - With blue focus border - LOW Z-INDEX                             */
    /* ============================================================================ */
    .chat-input-box textarea,
    .chat-input-box #ai-assistant-input,
    #ai-assistant-input,
    textarea#ai-assistant-input,
    .modern-textarea {
      width: 100% !important;
      min-height: 60px !important;
      max-height: 180px !important;
      padding: 12px 12px !important;
      margin: 0 !important;
      border: 1px solid transparent !important;
      border-radius: 8px !important;
      background: #252525 !important;
      color: #e0e0e0 !important;
      font-size: 13px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.5 !important;
      resize: none !important;
      outline: none !important;
      box-sizing: border-box !important;
      overflow-y: auto !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
      position: relative !important;
      z-index: 1 !important;
    }
    
    /* Textarea wrapper - compact, no gap to toolbar */
    .modern-textarea-wrapper {
      position: relative !important;
      z-index: 1 !important;
      overflow: visible !important;
      margin-bottom: 2px !important;
    }
    
    .chat-input-box textarea:focus,
    .chat-input-box #ai-assistant-input:focus,
    #ai-assistant-input:focus,
    textarea#ai-assistant-input:focus,
    .modern-textarea:focus {
      border: 1px solid #0078d4 !important;
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2) !important;
      outline: none !important;
      background: #252525 !important;
      z-index: 1 !important;
    }
    
    .chat-input-box textarea::placeholder,
    #ai-assistant-input::placeholder,
    .modern-textarea::placeholder {
      color: #555 !important;
    }
    
    .chat-input-box textarea::-webkit-scrollbar,
    #ai-assistant-input::-webkit-scrollbar {
      width: 4px !important;
    }
    
    .chat-input-box textarea::-webkit-scrollbar-track,
    #ai-assistant-input::-webkit-scrollbar-track {
      background: transparent !important;
    }
    
    .chat-input-box textarea::-webkit-scrollbar-thumb,
    #ai-assistant-input::-webkit-scrollbar-thumb {
      background: #444 !important;
      border-radius: 2px !important;
    }
    
    /* ============================================================================ */
    /* BOTTOM TOOLBAR - COMPACT, HIGH Z-INDEX FOR TOOLTIPS                        */
    /* ============================================================================ */
    .modern-bottom-toolbar,
    .input-toolbar {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
      padding: 2px 4px 2px 4px !important;
      margin: 0 !important;
      background: #1a1a1a !important;
      border-top: none !important;
      box-sizing: border-box !important;
      position: relative !important;
      z-index: 100 !important;
      overflow: visible !important;
    }
    
    /* ============================================================================ */
    /* TOOL BUTTONS GROUP - ALLOW TOOLTIP OVERFLOW                                 */
    /* ============================================================================ */
    .tool-buttons-group,
    .modern-tools-left {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 2px !important;
      flex-shrink: 0 !important;
      position: relative !important;
      z-index: 100 !important;
      overflow: visible !important;
    }
    
    /* ============================================================================ */
    /* TOOL BUTTONS - ALL SAME GRAY, SMALLER ICONS                                 */
    /* ============================================================================ */
    
    .chat-input-area button,
    .chat-input-box button,
    .modern-bottom-toolbar button,
    .tool-buttons-group button,
    .input-toolbar button,
    .tool-button,
    #camera-toggle-btn,
    #analyze-code-btn,
    #debug-code-btn,
    #assistant-upload,
    #voice-input-btn,
    #quick-action-btn,
    button.tool-button,
    button[class*="camera"],
    button[class*="btn-camera"],
    button[id*="camera"],
    button[id*="upload"],
    button[id*="attach"],
    .btn-camera,
    [class*="btn-camera"],
    [id*="camera"],
    /* CONSISTENT STYLES WHEN FILES ATTACHED */
    .file-context-bar ~ .chat-input-box .tool-button,
    .file-context-bar ~ .modern-input-wrapper .tool-button,
    .file-context-bar ~ * .tool-button,
    .attached-files-preview ~ .chat-input-box .tool-button,
    .attached-files-preview ~ * .tool-button,
    .chat-input-area:has(.file-context-bar) .tool-button,
    .chat-input-area:has(.attached-files-preview) .tool-button {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      min-height: 28px !important;
      max-width: 28px !important;
      max-height: 28px !important;
      padding: 0 !important;
      margin: 0 2px !important;
      border-radius: 4px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: none !important;
      border-width: 0 !important;
      border-style: none !important;
      border-color: transparent !important;
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
      color: #707070 !important;
      cursor: pointer !important;
      transition: background 0.15s ease, color 0.15s ease !important;
      position: relative !important;
      box-shadow: none !important;
      outline: none !important;
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      appearance: none !important;
      flex-shrink: 0 !important;
    }
    
    .tool-button:hover,
    #camera-toggle-btn:hover,
    button[class*="camera"]:hover,
    button[id*="camera"]:hover,
    .btn-camera:hover,
    [class*="btn-camera"]:hover,
    [id*="camera"]:hover,
    .chat-input-area button:hover,
    .chat-input-box button:hover,
    .tool-buttons-group button:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: #a0a0a0 !important;
      border: none !important;
      border-width: 0 !important;
      border-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
    }
    
    .tool-button:active,
    #camera-toggle-btn:active,
    [id*="camera"]:active {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    
    /* ============================================================================ */
    /* SVG ICONS - Pixel-aligned crisp rendering with hover animation              */
    /* CONSISTENT REGARDLESS OF FILE ATTACHMENT STATE                              */
    /* ============================================================================ */
    .tool-button svg,
    #camera-toggle-btn svg,
    button[class*="camera"] svg,
    button[id*="camera"] svg,
    .btn-camera svg,
    [class*="btn-camera"] svg,
    [id*="camera"] svg,
    .chat-input-area button svg,
    .chat-input-box button svg,
    .tool-buttons-group button svg,
    .modern-bottom-toolbar button svg,
    /* WHEN FILES ARE ATTACHED */
    .file-context-bar ~ * .tool-button svg,
    .attached-files-preview ~ * .tool-button svg,
    .chat-input-area:has(.file-context-bar) .tool-button svg,
    .chat-input-area:has(.attached-files-preview) .tool-button svg {
      width: 16px !important;
      height: 16px !important;
      min-width: 16px !important;
      min-height: 16px !important;
      max-width: 16px !important;
      max-height: 16px !important;
      stroke: currentColor !important;
      stroke-width: 2 !important;
      fill: none !important;
      
      /* Pixel-perfect rendering */
      shape-rendering: geometricPrecision !important;
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
      
      /* GPU acceleration */
      will-change: transform, opacity !important;
      transform: translateZ(0) !important;
      -webkit-transform: translateZ(0) !important;
      -webkit-backface-visibility: hidden !important;
      backface-visibility: hidden !important;
      
      /* Smooth transition for hover */
      transition: transform 0.15s ease, opacity 0.15s ease !important;
      
      /* Prevent resizing */
      flex-shrink: 0 !important;
    }
    
    /* Hover animation - subtle lift and brighten */
    .tool-button:hover svg {
      transform: translateZ(0) scale(1.1) !important;
      opacity: 1 !important;
    }
    
    /* Active state - press down effect */
    .tool-button:active svg {
      transform: translateZ(0) scale(0.95) !important;
    }
    
    /* Underline animation on hover */
    .tool-button::after {
      transition: opacity 0.08s ease, visibility 0.08s ease, transform 0.15s ease !important;
    }
    
    /* Button hover underline effect */
    .tool-button {
      position: relative !important;
    }
    
    .tool-button::before {
      content: '' !important;
      position: absolute !important;
      bottom: 2px !important;
      left: 50% !important;
      width: 0 !important;
      height: 2px !important;
      background: #0078d4 !important;
      border-radius: 1px !important;
      transform: translateX(-50%) !important;
      transition: width 0.2s ease !important;
      opacity: 0 !important;
      visibility: hidden !important;
      display: block !important;
    }
    
    .tool-button:hover::before {
      width: 12px !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
    
    /* ============================================================================ */
    /* SEND BUTTON - Same style as tool buttons                                    */
    /* ============================================================================ */
    .modern-send-right {
      flex-shrink: 0 !important;
    }
    
    #send-btn,
    .send-button,
    .modern-send-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      border: none !important;
      border-radius: 4px !important;
      color: #707070 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }
    
    #send-btn svg,
    .send-button svg,
    .modern-send-btn svg {
      width: 14px !important;
      height: 14px !important;
      stroke: currentColor !important;
      stroke-width: 2 !important;
      fill: none !important;
    }
    
    #send-btn:hover:not(:disabled),
    .send-button:hover:not(:disabled),
    .modern-send-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #a0a0a0 !important;
      transform: none !important;
      box-shadow: none !important;
    }
    
    #send-btn:hover:not(:disabled) svg,
    .modern-send-btn:hover:not(:disabled) svg {
      transform: scale(1.05) !important;
    }
    
    #send-btn:active:not(:disabled),
    .modern-send-btn:active:not(:disabled) {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    
    #send-btn:disabled,
    .modern-send-btn:disabled {
      background: transparent !important;
      color: #444 !important;
      cursor: not-allowed !important;
    }
    
    #send-btn:disabled svg,
    .modern-send-btn:disabled svg {
      stroke: #444 !important;
    }
    
    /* ============================================================================ */
    /* TOOLTIPS - WHITE BACKGROUND FOR VISIBILITY                                */
    /* ============================================================================ */
    .tool-button {
      position: relative !important;
      overflow: visible !important;
    }
    
    /* ANALYZE BADGE - ALWAYS VISIBLE ON TOP */
    #analyze-code-btn[data-tooltip]::after,
    [data-tooltip="Analyze"]::after {
      content: attr(data-tooltip);
      position: absolute !important;
      bottom: calc(100% + 8px) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      
      /* Padding */
      padding: 4px 12px !important;
      line-height: 1.3 !important;
      
      /* Fit to content */
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      box-sizing: content-box !important;
      white-space: nowrap !important;
      
      /* WHITE BACKGROUND - BLACK TEXT */
      color: #1a1a1a !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      border: 1px solid #ccc !important;
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      
      /* Sharpness settings */
      -webkit-font-smoothing: antialiased !important;
      text-rendering: geometricPrecision !important;
      
      border-radius: 6px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      
      /* ALWAYS VISIBLE - ON TOP OF EVERYTHING */
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: none !important;
      z-index: 999999 !important;
    }
    
    /* Other tooltips - show on hover only */
    .tool-button[data-tooltip]:not(#analyze-code-btn)::after,
    .modern-send-btn[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute !important;
      bottom: calc(100% + 8px) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      
      /* Padding */
      padding: 4px 10px !important;
      line-height: 1.3 !important;
      
      /* Fit to content */
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      box-sizing: content-box !important;
      white-space: nowrap !important;
      
      /* WHITE BACKGROUND - BLACK TEXT */
      color: #1a1a1a !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      border: 1px solid #ccc !important;
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      
      /* Sharpness settings */
      -webkit-font-smoothing: antialiased !important;
      text-rendering: geometricPrecision !important;
      
      border-radius: 6px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      
      /* Hidden by default - show on hover */
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: opacity 0.15s ease, visibility 0.15s ease !important;
      z-index: 99999 !important;
    }
    
    .tool-button[data-tooltip]:not(#analyze-code-btn):hover::after,
    .modern-send-btn[data-tooltip]:hover::after {
      opacity: 1 !important;
      visibility: visible !important;
    }
    
    .tool-buttons-group,
    .modern-tools-left,
    .modern-bottom-toolbar,
    .input-toolbar {
      overflow: visible !important;
    }
    
    /* ============================================================================ */
    /* CONTEXT BARS - COMPACT & MATCHING STYLES                                   */
    /* ============================================================================ */
    
    /* Hide any extra separator lines or decorative elements */
    .chat-input-area > hr,
    .chat-input-area > .separator,
    .chat-input-area > .divider,
    .chat-input-box > hr,
    .chat-input-box > .separator,
    .modern-input-wrapper > hr,
    .modern-input-wrapper > .separator,
    .file-context-bar ~ hr,
    .attached-files-preview ~ hr,
    [class*="separator"]:not(.code-separator),
    [class*="divider"]:not(.code-divider) {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
    
    /* Main file context bar - MATCH CONTEXT STYLE */
    .file-context-bar,
    .attached-files-preview {
      width: 100% !important;
      padding: 4px 8px !important;
      margin: 0 0 2px 0 !important;
      background: #1e1e1e !important;
      border: 1px solid #333 !important;
      border-radius: 6px !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 8px !important;
    }
    
    /* Hide empty file bars */
    .file-context-bar:empty,
    .attached-files-preview:empty {
      display: none !important;
    }
    
    /* ============================================================================ */
    /* CONTEXT BAR (the one with folder icon) - ULTRA COMPACT                     */
    /* ============================================================================ */
    .context-bar,
    .code-context-bar,
    .file-context-bar,
    .attached-files-preview,
    [class*="context-bar"],
    [class*="context_bar"],
    .chat-input-area > div:first-child,
    .chat-input-box > div:first-child:not(.modern-textarea-wrapper) {
      padding: 3px 8px !important;
      margin: 0 0 2px 0 !important;
      background: #1e1e1e !important;
      border: 1px solid #333 !important;
      border-radius: 5px !important;
      gap: 6px !important;
      min-height: 0 !important;
      height: auto !important;
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
    }
    
    /* Context label/button - NO background, just text */
    .context-bar button,
    .context-bar > div:first-child,
    .context-bar [class*="label"],
    [class*="context-bar"] button,
    [class*="context-bar"] > div:first-child,
    .file-context-bar > div:first-child {
      padding: 2px 6px !important;
      font-size: 10px !important;
      height: 20px !important;
      min-height: 20px !important;
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      border-radius: 4px !important;
      color: #888 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }
    
    /* Context file tags */
    .context-bar .file-tag,
    .context-bar .tag,
    .context-bar > span,
    .context-bar > div:not(:first-child),
    [class*="context-bar"] .file-tag,
    [class*="context-bar"] .tag,
    [class*="context-bar"] > span,
    [class*="context-bar"] > div:not(:first-child):not([class*="label"]) {
      padding: 2px 8px !important;
      font-size: 10px !important;
      height: 20px !important;
      min-height: 20px !important;
      background: #333 !important;
      border: 1px solid #444 !important;
      border-radius: 4px !important;
      color: #bbb !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
    }
    
    /* Folder icon in context */
    .context-bar svg,
    .context-bar [class*="icon"],
    [class*="context-bar"] svg:not([class*="close"] svg),
    [class*="context-bar"] [class*="icon"]:not([class*="close"]) {
      width: 12px !important;
      height: 12px !important;
    }
    
    /* Close/remove button on context bar - default state */
    .context-bar [class*="close"],
    .context-bar [class*="remove"],
    [class*="context-bar"] [class*="close"],
    [class*="context-bar"] [class*="remove"] {
      width: 14px !important;
      height: 14px !important;
      min-width: 14px !important;
      padding: 0 !important;
      background: transparent !important;
      border: none !important;
      color: #666 !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      transition: all 0.15s ease !important;
    }
    
    /* Close button turns RED on hover */
    .context-bar [class*="close"]:hover,
    .context-bar [class*="remove"]:hover,
    [class*="context-bar"] [class*="close"]:hover,
    [class*="context-bar"] [class*="remove"]:hover,
    .context-bar > div:hover [class*="close"],
    .context-bar > span:hover [class*="close"],
    [class*="context-bar"] > div:hover [class*="close"],
    [class*="context-bar"] > span:hover [class*="close"] {
      background: #e53935 !important;
      background-color: #e53935 !important;
      color: #fff !important;
    }
    
    .context-bar [class*="close"]:hover svg,
    .context-bar [class*="remove"]:hover svg,
    [class*="context-bar"] [class*="close"]:hover svg,
    [class*="context-bar"] [class*="remove"]:hover svg {
      stroke: #fff !important;
    }
    
    /* ============================================================================ */
    /* PND FILE ATTACHMENT STYLES - MATCH CONTEXT STYLE                           */
    /* ============================================================================ */
    
    /* Attach button (pnd-label) - NO background, just text */
    .pnd-label,
    .file-context-bar .attach-btn,
    .file-context-bar > button:first-child {
      padding: 2px 8px !important;
      font-size: 11px !important;
      height: 22px !important;
      min-height: 22px !important;
      border-radius: 4px !important;
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      color: #888 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      cursor: pointer !important;
      transition: color 0.15s ease !important;
    }
    
    .pnd-label:hover,
    .file-context-bar .attach-btn:hover {
      background: transparent !important;
      color: #bbb !important;
    }
    
    /* Attach icon */
    .pnd-label .pnd-icon,
    .pnd-label svg {
      width: 12px !important;
      height: 12px !important;
      opacity: 0.7 !important;
    }
    
    /* Chips container */
    .pnd-chips {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      align-items: center !important;
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    
    /* Individual file chip - match Context file tag style */
    .pnd-chip {
      display: inline-flex !important;
      align-items: center !important;
      padding: 2px 6px !important;
      height: 22px !important;
      min-height: 22px !important;
      background: #3a3a3a !important;
      border: 1px solid #4a4a4a !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      color: #ccc !important;
      gap: 3px !important;
      max-width: 200px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }
    
    .pnd-chip:hover {
      background: #454545 !important;
      border-color: #555 !important;
      color: #ddd !important;
    }
    
    /* File extension badge - subtle */
    .pnd-ext {
      background: #0078d4 !important;
      color: #fff !important;
      padding: 1px 3px !important;
      border-radius: 2px !important;
      font-size: 8px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.2px !important;
      margin-right: 1px !important;
    }
    
    /* File name */
    .pnd-name {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 120px !important;
      color: #ccc !important;
      font-size: 11px !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Remove button */
    .pnd-remove {
      width: 14px !important;
      height: 14px !important;
      min-width: 14px !important;
      padding: 0 !important;
      margin-left: 2px !important;
      border-radius: 50% !important;
      background: rgba(255,255,255,0.1) !important;
      border: none !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 9px !important;
      line-height: 1 !important;
      color: #999 !important;
      transition: all 0.15s ease !important;
    }
    
    /* RED close button on hover */
    .pnd-remove:hover,
    .pnd-chip:hover .pnd-remove {
      background: #e53935 !important;
      background-color: #e53935 !important;
      color: #fff !important;
    }
    
    .pnd-remove svg {
      width: 8px !important;
      height: 8px !important;
      stroke: currentColor !important;
    }
    
    /* Also style Context bar close buttons red on hover */
    .context-bar [class*="close"]:hover,
    .context-bar [class*="remove"]:hover,
    [class*="context-bar"] [class*="close"]:hover,
    [class*="context-bar"] [class*="remove"]:hover,
    .file-context-bar [class*="close"]:hover,
    .file-context-bar [class*="remove"]:hover,
    .attached-files-preview [class*="close"]:hover,
    .attached-files-preview [class*="remove"]:hover {
      background: #e53935 !important;
      color: #fff !important;
      border-radius: 50% !important;
    }
    
    /* ============================================================================ */
    /* CLOSE ALL BUTTON - Next to Attach when multiple files                      */
    /* ============================================================================ */
    .pnd-close-all {
      width: 14px !important;
      height: 14px !important;
      min-width: 14px !important;
      padding: 0 !important;
      margin: 0 0 0 2px !important;
      border-radius: 50% !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #666 !important;
      transition: all 0.15s ease !important;
      flex-shrink: 0 !important;
      vertical-align: middle !important;
    }
    
    .pnd-close-all:hover {
      background: #e53935 !important;
      color: #fff !important;
    }
    
    .pnd-close-all svg {
      width: 9px !important;
      height: 9px !important;
      stroke: currentColor !important;
      stroke-width: 2.5 !important;
    }
    
    /* ============================================================================ */
    /* LEGACY FILE ATTACHMENT STYLES (fallback)                                    */
    /* ============================================================================ */
    
    /* Attach button - compact and styled */
    .file-context-bar .attach-btn,
    .attached-files-preview .attach-btn {
      padding: 2px 8px !important;
      font-size: 11px !important;
      height: 22px !important;
      min-height: 22px !important;
      border-radius: 4px !important;
      background: #2d2d2d !important;
      border: 1px solid #444 !important;
      color: #999 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }
    
    /* File tags/chips - match context style */
    .file-context-bar .file-tag,
    .file-context-bar .file-chip,
    .file-context-bar .attached-file,
    .attached-files-preview .file-tag,
    .attached-files-preview .file-chip,
    .attached-files-preview .attached-file {
      padding: 2px 8px !important;
      font-size: 11px !important;
      height: 22px !important;
      min-height: 22px !important;
      max-height: 22px !important;
      border-radius: 4px !important;
      background: #3a3a3a !important;
      border: 1px solid #4a4a4a !important;
      color: #ccc !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 200px !important;
    }
    
    .keyboard-hint,
    .modern-hint-center {
      display: none !important;
    }
    
    /* ============================================================================ */
    /* DRAG & DROP - MINIMAL: Transparent, just icon + text                        */
    /* ============================================================================ */
    
    .drag-over,
    .dragover,
    .drag-active,
    .file-drop-zone,
    .drop-zone,
    .drop-target,
    .dropping,
    .dragging,
    [class*="drag-over"],
    [class*="dragover"],
    [class*="drop-zone"],
    [class*="drop-target"],
    [class*="file-drop"],
    .assistant-panel.drag-over,
    .assistant-panel.dragover,
    .assistant-panel.dropping,
    .ai-chat-container.drag-over,
    .ai-chat-container.dragover,
    .chat-messages.drag-over,
    .chat-messages.dragover,
    .chat-container.drag-over,
    .chat-container.dragover,
    div[class*="drop"]:not(.modern-bottom-toolbar),
    div[class*="drag"]:not(.modern-bottom-toolbar) {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .drop-overlay,
    .drag-overlay,
    .file-drop-overlay,
    .drop-zone-overlay,
    [class*="drop-overlay"],
    [class*="drag-overlay"],
    [class*="file-drop"]:not(input) {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    
    .drop-zone-content,
    .drop-overlay-content,
    .drag-drop-content,
    .drop-message,
    .drop-area,
    .file-drop-area,
    [class*="drop-area"],
    [class*="drop-content"] {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
    }
    
    .drop-zone-content svg,
    .drop-overlay-content svg,
    .drag-drop-content svg,
    .drop-zone-icon,
    .drop-icon,
    .drop-overlay svg,
    .drag-overlay svg {
      width: 48px !important;
      height: 48px !important;
      stroke: #666666 !important;
      fill: none !important;
      stroke-width: 1.5 !important;
    }
    
    .drop-zone-text,
    .drop-text,
    .drag-text,
    .drop-message,
    .drop-overlay span,
    .drag-overlay span {
      color: #666666 !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      background: transparent !important;
    }
    
    /* ============================================================================ */
    /* GROUPED TOOLBAR STYLES                                                       */
    /* ============================================================================ */
    
    .toolbar-group {
      display: flex !important;
      align-items: center !important;
      gap: 2px !important;
      padding: 2px 4px !important;
      border-radius: 8px !important;
      transition: background-color 0.15s ease !important;
      flex-shrink: 0 !important;
    }
    
    /* Mode Group - Auto Mode + Project Search */
    .toolbar-group.mode-group {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(16, 185, 129, 0.08)) !important;
      border: 1px solid rgba(6, 182, 212, 0.2) !important;
    }
    
    .toolbar-group.mode-group:hover {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.12)) !important;
      border-color: rgba(6, 182, 212, 0.3) !important;
    }

    /* AI Group - Terminal + Analyze + Debug */
    .toolbar-group.ai-group {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.08), rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08)) !important;
      border: 1px solid rgba(79, 195, 247, 0.2) !important;
    }

    .toolbar-group.ai-group:hover {
      background: linear-gradient(135deg, rgba(79, 195, 247, 0.12), rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12)) !important;
      border-color: rgba(79, 195, 247, 0.3) !important;
    }
    
    /* Attach Group */
    .toolbar-group.attach-group {
      background: transparent !important;
    }

    /* Toolbar Divider */
    .toolbar-divider {
      width: 1px !important;
      height: 20px !important;
      background: #3a3a3a !important;
      margin: 0 6px !important;
      flex-shrink: 0 !important;
    }
    
    /* ============================================================================ */
    /* DISABLE RIPPLE/WAVE EFFECTS FOR TOGGLE BUTTONS                              */
    /* ============================================================================ */
    
    /* Auto Mode, Project Search, Terminal, Fix Errors, Quick Actions - No ripple animation */
    #autonomous-mode-toggle,
    #ai-search-btn,
    #terminal-ctx-btn,
    #fix-errors-btn,
    #quick-actions-btn,
    .tool-button.btn-auto-mode,
    .tool-button.btn-ai-search,
    .tool-button.btn-terminal-ctx,
    .tool-button.btn-fix-errors,
    .tool-button.btn-quick-actions,
    .mode-group .tool-button,
    .ai-group .tool-button:first-child {
      /* Disable all animations */
      animation: none !important;
      -webkit-animation: none !important;
      
      /* Prevent ripple overflow */
      overflow: hidden !important;
      
      /* Instant transitions for these toggle buttons */
      transition: color 0.15s ease, background-color 0.15s ease !important;
    }
    
    /* Remove any ::after ripple pseudo-elements */
    #autonomous-mode-toggle::after,
    #ai-search-btn::after,
    #terminal-ctx-btn::after,
    #fix-errors-btn::after,
    #quick-actions-btn::after,
    .tool-button.btn-auto-mode::after,
    .tool-button.btn-ai-search::after,
    .tool-button.btn-terminal-ctx::after,
    .tool-button.btn-fix-errors::after,
    .tool-button.btn-quick-actions::after,
    .mode-group .tool-button::after,
    .ai-group .tool-button:first-child::after {
      display: none !important;
      content: none !important;
      animation: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
    }
    
    /* Remove any ::before ripple pseudo-elements */
    #autonomous-mode-toggle::before,
    #ai-search-btn::before,
    #terminal-ctx-btn::before,
    #fix-errors-btn::before,
    #quick-actions-btn::before,
    .tool-button.btn-auto-mode::before,
    .tool-button.btn-ai-search::before,
    .tool-button.btn-terminal-ctx::before,
    .tool-button.btn-fix-errors::before,
    .tool-button.btn-quick-actions::before,
    .mode-group .tool-button::before,
    .ai-group .tool-button:first-child::before {
      display: none !important;
      content: none !important;
      animation: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
    }
    
    /* Disable any child ripple elements */
    #autonomous-mode-toggle .ripple,
    #ai-search-btn .ripple,
    #terminal-ctx-btn .ripple,
    #fix-errors-btn .ripple,
    #quick-actions-btn .ripple,
    #autonomous-mode-toggle [class*="ripple"],
    #ai-search-btn [class*="ripple"],
    #terminal-ctx-btn [class*="ripple"],
    #fix-errors-btn [class*="ripple"],
    #quick-actions-btn [class*="ripple"],
    #autonomous-mode-toggle [class*="wave"],
    #ai-search-btn [class*="wave"],
    #terminal-ctx-btn [class*="wave"],
    #fix-errors-btn [class*="wave"],
    #quick-actions-btn [class*="wave"],
    .mode-group .ripple,
    .mode-group [class*="ripple"],
    .mode-group [class*="wave"] {
      display: none !important;
      animation: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Auto Mode button colors */
    .tool-button.btn-auto-mode,
    #autonomous-mode-toggle {
      color: #707070 !important;
    }
    
    .tool-button.btn-auto-mode.active,
    .tool-button.btn-auto-mode.auto-active,
    #autonomous-mode-toggle.active,
    #autonomous-mode-toggle.auto-active {
      color: #06b6d4 !important;
      background: rgba(6, 182, 212, 0.2) !important;
      box-shadow: 0 0 8px rgba(6, 182, 212, 0.4) !important;
    }
    
    .tool-button.btn-auto-mode:not(.active):not(.auto-active):hover,
    #autonomous-mode-toggle:not(.active):not(.auto-active):hover {
      color: #06b6d4 !important;
      background: rgba(6, 182, 212, 0.1) !important;
    }
    
    /* Project Search button colors */
    .tool-button.btn-ai-search,
    #ai-search-btn {
      color: #707070 !important;
    }
    
    .tool-button.btn-ai-search.active,
    .tool-button.btn-ai-search.ai-active,
    #ai-search-btn.active,
    #ai-search-btn.ai-active {
      color: #34d399 !important;
      background: rgba(16, 185, 129, 0.25) !important;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.4) !important;
    }
    
    .tool-button.btn-ai-search:not(.active):not(.ai-active):hover,
    #ai-search-btn:not(.active):not(.ai-active):hover {
      color: #10b981 !important;
      background: rgba(16, 185, 129, 0.1) !important;
    }
    
    /* Terminal button colors */
    .tool-button.btn-terminal-ctx,
    #terminal-ctx-btn {
      color: #707070 !important;
      background: transparent !important;
    }
    
    .tool-button.btn-terminal-ctx.active,
    .tool-button.btn-terminal-ctx.terminal-active,
    .tool-button.btn-terminal-ctx.btn-fix-on,
    #terminal-ctx-btn.active,
    #terminal-ctx-btn.terminal-active,
    #terminal-ctx-btn.btn-fix-on {
      color: #4fc3f7 !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }
    
    /* Terminal button SVG - outline style with indicator dot */
    #terminal-ctx-btn.active svg,
    #terminal-ctx-btn.terminal-active svg,
    #terminal-ctx-btn.btn-fix-on svg {
      stroke: #4fc3f7 !important;
      fill: none !important;
    }
    
    #terminal-ctx-btn.active svg polyline,
    #terminal-ctx-btn.terminal-active svg polyline,
    #terminal-ctx-btn.btn-fix-on svg polyline,
    #terminal-ctx-btn.active svg line,
    #terminal-ctx-btn.terminal-active svg line,
    #terminal-ctx-btn.btn-fix-on svg line {
      stroke: #4fc3f7 !important;
      fill: none !important;
    }
    
    #terminal-ctx-btn.active svg circle[r="2.5"],
    #terminal-ctx-btn.terminal-active svg circle[r="2.5"],
    #terminal-ctx-btn.btn-fix-on svg circle[r="2.5"] {
      fill: #4fc3f7 !important;
      stroke: none !important;
    }
    
    .tool-button.btn-terminal-ctx:not(.active):not(.terminal-active):hover,
    #terminal-ctx-btn:not(.active):not(.terminal-active):hover {
      color: #4fc3f7 !important;
      background: transparent !important;
    }
    
    /* Analyze button colors */
    .tool-button.btn-analyze,
    #analyze-code-btn {
      color: #3b82f6 !important;
    }
    
    .tool-button.btn-analyze:hover,
    #analyze-code-btn:hover {
      background: rgba(59, 130, 246, 0.15) !important;
    }
    
    /* Debug button colors */
    .tool-button.btn-debug,
    #debug-code-btn {
      color: #8b5cf6 !important;
    }
    
    .tool-button.btn-debug:hover,
    #debug-code-btn:hover {
      background: rgba(139, 92, 246, 0.15) !important;
    }
    
    /* Camera button colors */
    .tool-button.btn-camera,
    #camera-toggle-btn {
      color: #707070 !important;
      background: transparent !important;
    }
    
    .tool-button.btn-camera.active,
    .tool-button.btn-camera.camera-active,
    #camera-toggle-btn.active,
    #camera-toggle-btn.camera-active {
      color: #f472b6 !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }
    
    /* Camera button SVG - outline style with indicator dot */
    #camera-toggle-btn.active svg,
    #camera-toggle-btn.camera-active svg {
      stroke: #f472b6 !important;
      fill: none !important;
    }
    
    #camera-toggle-btn.active svg path,
    #camera-toggle-btn.camera-active svg path,
    #camera-toggle-btn.active svg circle[r="4"],
    #camera-toggle-btn.camera-active svg circle[r="4"] {
      stroke: #f472b6 !important;
      fill: none !important;
    }
    
    #camera-toggle-btn.active svg circle[r="1.5"],
    #camera-toggle-btn.camera-active svg circle[r="1.5"] {
      fill: #f472b6 !important;
      stroke: none !important;
    }
    
    .tool-button.btn-camera:not(.active):not(.camera-active):hover,
    #camera-toggle-btn:not(.active):not(.camera-active):hover {
      color: #f472b6 !important;
      background: transparent !important;
    }
    
    /* Fix Errors button colors */
    .tool-button.btn-fix-errors,
    #fix-errors-btn {
      color: #f59e0b !important;
    }
    
    .tool-button.btn-fix-errors:hover,
    #fix-errors-btn:hover {
      background: rgba(245, 158, 11, 0.15) !important;
    }
    
    /* Quick Actions button colors */
    .tool-button.btn-quick-actions,
    #quick-actions-btn {
      color: #a855f7 !important;
    }
    
    .tool-button.btn-quick-actions:hover,
    #quick-actions-btn:hover {
      background: rgba(168, 85, 247, 0.15) !important;
    }
    
    .tool-button.btn-quick-actions.active,
    #quick-actions-btn.active {
      color: #a855f7 !important;
      background: rgba(168, 85, 247, 0.2) !important;
    }
    
    /* Hide underline for grouped buttons */
    .toolbar-group .tool-button::before {
      display: none !important;
    }
    
    /* HIDE duplicate autonomous buttons outside groups */
    .modern-bottom-toolbar > button.autonomous-mode-toggle,
    .modern-bottom-toolbar > .autonomous-mode-toggle,
    .tool-buttons-group > button.autonomous-mode-toggle:not(.toolbar-group button) {
      display: none !important;
    }
    
    /* ============================================================================ */
    /* ULTRA-SPECIFIC PSEUDO-ELEMENT OVERRIDES - Force no background               */
    /* ============================================================================ */
    button#camera-toggle-btn::before,
    button#camera-toggle-btn::after,
    button#camera-toggle-btn.active::before,
    button#camera-toggle-btn.active::after,
    button#camera-toggle-btn.camera-active::before,
    button#camera-toggle-btn.camera-active::after,
    #camera-toggle-btn::before,
    #camera-toggle-btn::after,
    #camera-toggle-btn.active::before,
    #camera-toggle-btn.active::after,
    #camera-toggle-btn.camera-active::before,
    #camera-toggle-btn.camera-active::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      background-color: transparent !important;
      opacity: 0 !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
    
    button#terminal-ctx-btn::before,
    button#terminal-ctx-btn::after,
    button#terminal-ctx-btn.active::before,
    button#terminal-ctx-btn.active::after,
    button#terminal-ctx-btn.terminal-active::before,
    button#terminal-ctx-btn.terminal-active::after,
    button#terminal-ctx-btn.btn-fix-off::before,
    button#terminal-ctx-btn.btn-fix-off::after,
    button#terminal-ctx-btn.btn-fix-on::before,
    button#terminal-ctx-btn.btn-fix-on::after,
    #terminal-ctx-btn::before,
    #terminal-ctx-btn::after,
    #terminal-ctx-btn.active::before,
    #terminal-ctx-btn.active::after,
    #terminal-ctx-btn.terminal-active::before,
    #terminal-ctx-btn.terminal-active::after,
    #terminal-ctx-btn.btn-fix-off::before,
    #terminal-ctx-btn.btn-fix-off::after,
    #terminal-ctx-btn.btn-fix-on::before,
    #terminal-ctx-btn.btn-fix-on::after,
    .btn-terminal-ctx::before,
    .btn-terminal-ctx::after,
    .btn-terminal-ctx.active::before,
    .btn-terminal-ctx.active::after,
    .btn-terminal-ctx.btn-fix-off::before,
    .btn-terminal-ctx.btn-fix-off::after,
    .btn-terminal-ctx.btn-fix-on::before,
    .btn-terminal-ctx.btn-fix-on::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      background-color: transparent !important;
      opacity: 0 !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
    
    /* ============================================================================ */
    /* ULTRA-SPECIFIC btn-fix-on OVERRIDE - This is the key fix!                   */
    /* rgba(79, 195, 247, 0.25) background comes from .btn-fix-on class            */
    /* ============================================================================ */
    html body button#terminal-ctx-btn.btn-fix-on,
    html body button.btn-terminal-ctx.btn-fix-on,
    html body #terminal-ctx-btn.btn-fix-on,
    html body .tool-button.btn-fix-on,
    html body .tool-button.btn-terminal-ctx.btn-fix-on,
    button#terminal-ctx-btn.btn-fix-on,
    button.btn-terminal-ctx.btn-fix-on,
    #terminal-ctx-btn.btn-fix-on,
    .tool-button.btn-fix-on,
    .tool-button.btn-terminal-ctx.btn-fix-on {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }
  `;
  
  document.head.appendChild(style);
  
  // Also add the analyze badge styles
  addAnalyzeBadgeStyles();
  
  console.log('✅ Clean modern styles added');
}

/**
 * Fix drag-drop zone - force transparent
 */
function fixDropZoneStyles(): void {
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    const element = el as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const bg = computedStyle.backgroundColor;
    const className = element.className || '';
    
    const isBlue = bg && (
      bg.includes('0, 120, 212') || 
      bg.includes('0,120,212') || 
      bg.includes('rgb(0, 120') ||
      bg.includes('rgb(30, 144') ||
      bg.includes('30, 144, 255') ||
      bg === 'rgb(0, 120, 212)' ||
      bg === 'rgb(30, 144, 255)'
    );
    
    const isDropZone = typeof className === 'string' && (
      className.includes('drop') || 
      className.includes('drag')
    );
    
    const isInAssistant = element.closest('.assistant-panel') || 
                          element.closest('.ai-chat-container');
    
    if ((isBlue || isDropZone) && isInAssistant) {
      element.style.setProperty('background', 'transparent', 'important');
      element.style.setProperty('background-color', 'transparent', 'important');
      element.style.setProperty('border', 'none', 'important');
      element.style.setProperty('box-shadow', 'none', 'important');
      
      const svgs = element.querySelectorAll('svg');
      svgs.forEach(svg => {
        (svg as SVGElement).style.setProperty('stroke', '#666666', 'important');
        (svg as SVGElement).style.setProperty('width', '48px', 'important');
        (svg as SVGElement).style.setProperty('height', '48px', 'important');
      });
      
      const texts = element.querySelectorAll('span, p, div');
      texts.forEach(text => {
        const textEl = text as HTMLElement;
        if (textEl.textContent?.toLowerCase().includes('drop')) {
          textEl.style.setProperty('color', '#666666', 'important');
          textEl.style.setProperty('background', 'transparent', 'important');
        }
      });
    }
  });
}

/**
 * Observe for drop zone
 */
function observeDropZone(): void {
  let dragInterval: number | null = null;
  
  document.addEventListener('dragenter', () => {
    fixDropZoneStyles();
    if (!dragInterval) {
      dragInterval = window.setInterval(fixDropZoneStyles, 30);
    }
  });
  
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    fixDropZoneStyles();
  });
  
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget) {
      if (dragInterval) {
        clearInterval(dragInterval);
        dragInterval = null;
      }
    }
  });
  
  document.addEventListener('drop', () => {
    if (dragInterval) {
      clearInterval(dragInterval);
      dragInterval = null;
    }
  });
  
  document.addEventListener('dragend', () => {
    if (dragInterval) {
      clearInterval(dragInterval);
      dragInterval = null;
    }
  });
  
  const observer = new MutationObserver(() => {
    fixDropZoneStyles();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

/**
 * Fix all tool button styles - force consistent appearance
 */
function fixAllToolButtonStyles(): void {
  const selectors = [
    '.tool-button:not(.camera-panel):not(.dev-camera-panel)',
    '#camera-toggle-btn',
    // FIXED: Only match camera BUTTONS, not the camera PANEL
    'button[class*="camera"]:not(.camera-panel)',
    '[id*="camera"]:not(.camera-panel):not(.dev-camera-panel)',
    '.btn-camera:not(.camera-panel)',
    '.chat-input-box button',
    '.tool-buttons-group button',
    '.modern-bottom-toolbar button'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(btn => {
      const el = btn as HTMLElement;
      
      // Skip send button AND camera panel
      if (el.id === 'send-btn' || 
          el.classList.contains('modern-send-btn') ||
          el.classList.contains('camera-panel') ||
          el.classList.contains('dev-camera-panel')) {
        return;
      }
      
      // Force all inline styles
      el.style.setProperty('width', '28px', 'important');
      el.style.setProperty('height', '28px', 'important');
      el.style.setProperty('min-width', '28px', 'important');
      el.style.setProperty('min-height', '28px', 'important');
      el.style.setProperty('max-width', '28px', 'important');
      el.style.setProperty('max-height', '28px', 'important');
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('margin', '0 2px', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('border-width', '0', 'important');
      el.style.setProperty('border-style', 'none', 'important');
      el.style.setProperty('border-color', 'transparent', 'important');
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('background-color', 'transparent', 'important');
      el.style.setProperty('box-shadow', 'none', 'important');
      el.style.setProperty('outline', 'none', 'important');
      el.style.setProperty('color', '#707070', 'important');
      el.style.setProperty('border-radius', '4px', 'important');
      
      // Fix SVG inside
      const svg = el.querySelector('svg');
      if (svg) {
        svg.style.setProperty('width', '14px', 'important');
        svg.style.setProperty('height', '14px', 'important');
        svg.style.setProperty('stroke', 'currentColor', 'important');
        svg.style.setProperty('stroke-width', '1.8', 'important');
        svg.style.setProperty('fill', 'none', 'important');
      }
      
      // Remove native title to avoid duplicate tooltip
      el.removeAttribute('title');
      
      // Remove any color classes
      el.classList.remove('btn-code', 'btn-camera', 'btn-search', 'btn-image', 'btn-file', 'btn-lightning', 'btn-mic');
      
      // Ensure tool-button class is present
      if (!el.classList.contains('tool-button') && !el.classList.contains('modern-send-btn')) {
        el.classList.add('tool-button');
      }
    });
  });
  
  console.log('✅ Fixed all tool button styles');
}

/**
 * Upgrade existing Analyze text to styled badge with INLINE STYLES
 * This guarantees the white background will be applied
 */
function upgradeAnalyzeBadges(): void {
  // Find any span or text element that contains just "Analyze"
  const toolGroups = document.querySelectorAll('.tool-buttons-group, .modern-tools-left, .modern-bottom-toolbar, .chat-input-area, .input-toolbar');
  
  toolGroups.forEach(group => {
    const children = Array.from(group.childNodes);
    
    children.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const text = el.textContent?.trim();
        
        // Check if this is a plain text "Analyze" label (not a button)
        if ((text === 'Analyze' || text?.includes('Analyze')) && 
            !el.matches('button') && 
            !el.classList.contains('tool-button') &&
            el.tagName !== 'BUTTON') {
          
          // Add the badge class
          el.classList.add('analyze-mode-badge');
          
          // APPLY INLINE STYLES DIRECTLY - This overrides everything!
          el.style.setProperty('display', 'inline-flex', 'important');
          el.style.setProperty('align-items', 'center', 'important');
          el.style.setProperty('justify-content', 'center', 'important');
          el.style.setProperty('gap', '5px', 'important');
          el.style.setProperty('padding', '4px 12px', 'important');
          el.style.setProperty('margin-right', '8px', 'important');
          el.style.setProperty('font-family', "'Segoe UI', -apple-system, sans-serif", 'important');
          el.style.setProperty('font-size', '11px', 'important');
          el.style.setProperty('font-weight', '600', 'important');
          el.style.setProperty('letter-spacing', '0.3px', 'important');
          el.style.setProperty('white-space', 'nowrap', 'important');
          
          // WHITE BACKGROUND - BLACK TEXT
          el.style.setProperty('background', '#ffffff', 'important');
          el.style.setProperty('background-color', '#ffffff', 'important');
          el.style.setProperty('color', '#1a1a1a', 'important');
          
          el.style.setProperty('border', 'none', 'important');
          el.style.setProperty('border-radius', '12px', 'important');
          el.style.setProperty('box-shadow', '0 1px 4px rgba(0, 0, 0, 0.25)', 'important');
          el.style.setProperty('cursor', 'default', 'important');
          el.style.setProperty('user-select', 'none', 'important');
          el.style.setProperty('flex-shrink', '0', 'important');
          
          // Add icon if not already present
          if (!el.querySelector('svg')) {
            el.innerHTML = `${PROFESSIONAL_ICONS.analyzeSmall}<span>Analyze</span>`;
          }
          
          // Style the SVG icon inside
          const svg = el.querySelector('svg');
          if (svg) {
            (svg as SVGElement).style.setProperty('width', '12px', 'important');
            (svg as SVGElement).style.setProperty('height', '12px', 'important');
            (svg as SVGElement).style.setProperty('stroke', '#1a1a1a', 'important');
            (svg as SVGElement).style.setProperty('stroke-width', '2.5', 'important');
            (svg as SVGElement).style.setProperty('fill', 'none', 'important');
            (svg as SVGElement).style.setProperty('flex-shrink', '0', 'important');
          }
          
          console.log('✅ Upgraded Analyze text to styled badge with inline styles');
        }
      }
    });
  });
  
  // Also search for any element with "Analyze" text anywhere in the input area
  const inputArea = document.querySelector('.chat-input-area');
  if (inputArea) {
    const allSpans = inputArea.querySelectorAll('span, div');
    allSpans.forEach(span => {
      const el = span as HTMLElement;
      const text = el.textContent?.trim();
      
      if (text === 'Analyze' && 
          !el.matches('button') && 
          !el.classList.contains('tool-button') &&
          !el.classList.contains('analyze-mode-badge') &&
          el.tagName !== 'BUTTON' &&
          el.children.length === 0) {
        
        // This is a plain text "Analyze" - style it!
        el.classList.add('analyze-mode-badge');
        
        // Apply inline styles
        el.style.setProperty('display', 'inline-flex', 'important');
        el.style.setProperty('align-items', 'center', 'important');
        el.style.setProperty('padding', '4px 12px', 'important');
        el.style.setProperty('background', '#ffffff', 'important');
        el.style.setProperty('background-color', '#ffffff', 'important');
        el.style.setProperty('color', '#1a1a1a', 'important');
        el.style.setProperty('font-size', '11px', 'important');
        el.style.setProperty('font-weight', '600', 'important');
        el.style.setProperty('border-radius', '12px', 'important');
        el.style.setProperty('box-shadow', '0 1px 4px rgba(0, 0, 0, 0.25)', 'important');
        el.style.setProperty('margin-right', '8px', 'important');
        
        console.log('✅ Found and styled plain Analyze text');
      }
    });
  }
}

/**
 * Restructure the input area
 */
function restructureInputArea(): void {
  const inputArea = document.querySelector('.chat-input-area') as HTMLElement;
  const inputBox = document.querySelector('.chat-input-box') as HTMLElement;
  
  if (!inputArea || !inputBox) {
    console.warn('⚠️ Input area or box not found');
    return;
  }
  
  if (inputBox.classList.contains('modern-restructured')) {
    return;
  }
  
  console.log('🔄 Restructuring to clean vertical layout...');
  
  const textarea = inputBox.querySelector('#ai-assistant-input, textarea') as HTMLTextAreaElement;
  const sendBtn = inputBox.querySelector('#send-btn') as HTMLButtonElement;
  const toolButtons = Array.from(inputBox.querySelectorAll('.tool-button'));
  
  if (!textarea) {
    console.warn('⚠️ Textarea not found');
    return;
  }
  
  const originalSendHandler = sendBtn?.onclick;
  const toolHandlers = new Map<HTMLElement, EventListener | null>();
  toolButtons.forEach(btn => {
    toolHandlers.set(btn as HTMLElement, (btn as any).onclick);
  });
  
  inputBox.innerHTML = '';
  inputBox.classList.add('modern-restructured');
  
  const textareaWrapper = document.createElement('div');
  textareaWrapper.className = 'modern-textarea-wrapper';
  textareaWrapper.style.cssText = 'width: 100%; padding: 0;';
  
  textarea.className = 'modern-textarea';
  textarea.placeholder = 'Ask me anything....';
  textareaWrapper.appendChild(textarea);
  
  const toolbar = document.createElement('div');
  toolbar.className = 'modern-bottom-toolbar';
  
  const toolsGroup = document.createElement('div');
  toolsGroup.className = 'tool-buttons-group modern-tools-left';
  
  toolButtons.forEach(btn => {
    const handler = toolHandlers.get(btn as HTMLElement);
    if (handler) {
      (btn as HTMLElement).onclick = handler as any;
    }
    btn.className = 'tool-button';
    toolsGroup.appendChild(btn);
  });
  
  const sendWrapper = document.createElement('div');
  sendWrapper.className = 'modern-send-right';
  
  let newSendBtn: HTMLButtonElement;
  if (sendBtn) {
    newSendBtn = sendBtn;
  } else {
    newSendBtn = document.createElement('button');
    newSendBtn.id = 'send-btn';
  }
  
  newSendBtn.className = 'modern-send-btn';
  newSendBtn.innerHTML = PROFESSIONAL_ICONS.sendUp;
  newSendBtn.setAttribute('data-tooltip', 'Send (Enter)');
  newSendBtn.removeAttribute('title');
  
  if (originalSendHandler) {
    newSendBtn.onclick = originalSendHandler;
  }
  
  sendWrapper.appendChild(newSendBtn);
  
  toolbar.appendChild(toolsGroup);
  toolbar.appendChild(sendWrapper);
  
  inputBox.appendChild(textareaWrapper);
  inputBox.appendChild(toolbar);
  
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 180);
    textarea.style.height = `${newHeight}px`;
  });
  
  console.log('✅ Clean vertical layout applied');
}

/**
 * Upgrade existing chat input icons from emoji to SVG
 */
export function upgradeChatInputIcons(): void {
  // [X02Fix 1] Debounce: icon upgrade runs max once per 200ms
  if ((window as any).__x02IconUpgradePending) return;
  (window as any).__x02IconUpgradePending = true;
  setTimeout(function() { delete (window as any).__x02IconUpgradePending; }, 200);
  console.log('🎨 Upgrading chat input icons to SVG...');
  
  const emojiToIcon: Record<string, { icon: string; tooltip: string }> = {
    '🔵': { icon: PROFESSIONAL_ICONS.code, tooltip: 'Code' },
    '🔍': { icon: PROFESSIONAL_ICONS.analyze, tooltip: 'Analyze' },
    '📷': { icon: PROFESSIONAL_ICONS.camera, tooltip: 'Camera' },
    '🎤': { icon: PROFESSIONAL_ICONS.microphone, tooltip: 'Voice' },
    '⚡': { icon: PROFESSIONAL_ICONS.lightning, tooltip: 'Quick' },
    '📎': { icon: PROFESSIONAL_ICONS.file, tooltip: 'Attach' },
    '🖼️': { icon: PROFESSIONAL_ICONS.image, tooltip: 'Image' },
    '🖼': { icon: PROFESSIONAL_ICONS.image, tooltip: 'Image' },
    '➕': { icon: PROFESSIONAL_ICONS.plus, tooltip: 'Add' },
    '+': { icon: PROFESSIONAL_ICONS.plus, tooltip: 'Add' }
  };
  
  const toolButtons = document.querySelectorAll('.tool-button');
  let upgraded = 0;
  
  toolButtons.forEach(button => {
    const btn = button as HTMLElement;
    const text = btn.textContent?.trim() || '';
    const span = btn.querySelector('span');
    const spanText = span?.textContent?.trim() || '';
    const checkText = spanText || text;
    
    for (const [emoji, config] of Object.entries(emojiToIcon)) {
      if (checkText.includes(emoji)) {
        btn.innerHTML = config.icon;
        btn.className = 'tool-button';
        btn.setAttribute('data-tooltip', config.tooltip);
        btn.removeAttribute('title');
        upgraded++;
        break;
      }
    }
  });
  
  const buttonIdMap: Record<string, { icon: string; tooltip: string }> = {
    'analyze-code-btn': { icon: PROFESSIONAL_ICONS.code, tooltip: 'Analyze' },
    'debug-code-btn': { icon: PROFESSIONAL_ICONS.analyze, tooltip: 'Debug' },
    'camera-toggle-btn': { icon: PROFESSIONAL_ICONS.camera, tooltip: 'Camera' },
    'assistant-upload': { icon: PROFESSIONAL_ICONS.file, tooltip: 'Attach' },
    'voice-input-btn': { icon: PROFESSIONAL_ICONS.microphone, tooltip: 'Voice' },
    'quick-action-btn': { icon: PROFESSIONAL_ICONS.lightning, tooltip: 'Quick' }
  };
  
  for (const [id, config] of Object.entries(buttonIdMap)) {
    const btn = document.getElementById(id);
    if (btn && btn.classList.contains('tool-button')) {
      btn.innerHTML = config.icon;
      btn.className = 'tool-button';
      btn.setAttribute('data-tooltip', config.tooltip);
      btn.removeAttribute('title');
      upgraded++;
    }
  }
  
  // Also upgrade any Analyze badges
  upgradeAnalyzeBadges();
  
  console.log(`✅ Upgraded ${upgraded} buttons to SVG icons`);
}

/**
 * Create a single tool button with SVG icon
 */
export function createToolButton(
  iconType: keyof typeof PROFESSIONAL_ICONS,
  tooltip: string,
  onClick?: () => void
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'tool-button';
  btn.innerHTML = PROFESSIONAL_ICONS[iconType];
  btn.setAttribute('data-tooltip', tooltip);
  
  if (onClick) {
    btn.addEventListener('click', onClick);
  }
  
  return btn;
}

/**
 * Create an Analyze mode badge element
 */
export function createAnalyzeBadge(text: string = 'Analyze'): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'analyze-mode-badge';
  badge.innerHTML = `${PROFESSIONAL_ICONS.analyzeSmall}<span>${text}</span>`;
  return badge;
}

/**
 * Fix duplicate tooltips, apply ultra-sharp styling, and add hover animations
 * This must run AFTER all other styles are loaded
 */
function killDuplicateTooltips(): void {
  // Remove any existing fix to prevent duplicates
  const existing = document.getElementById('kill-duplicate-tooltips');
  if (existing) existing.remove();
  
  const style = document.createElement('style');
  style.id = 'kill-duplicate-tooltips';
  style.textContent = `
    /* ================================================================ */
    /* KILL DUPLICATE TOOLTIPS FROM OTHER LIBRARIES                    */
    /* Only target tooltip-related ::before, keep our underline        */
    /* ================================================================ */
    
    /* Kill tooltip ::before from external libraries */
    [data-tooltip]::before,
    [data-tooltip]:hover::before,
    [title]::before,
    [title]:hover::before {
      display: none !important;
      content: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
    
    /* ================================================================ */
    /* HOVER UNDERLINE ANIMATION                                       */
    /* ================================================================ */
    .tool-button {
      position: relative !important;
      overflow: visible !important;
    }
    
    .tool-button::before {
      content: '' !important;
      position: absolute !important;
      bottom: 2px !important;
      left: 50% !important;
      width: 0 !important;
      height: 2px !important;
      background: #0078d4 !important;
      border-radius: 1px !important;
      transform: translateX(-50%) !important;
      transition: width 0.2s ease !important;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: none !important;
    }
    
    .tool-button:hover::before {
      width: 14px !important;
    }
    
    /* ================================================================ */
    /* PIXEL-PERFECT SVG ICONS                                         */
    /* ================================================================ */
    .tool-button svg,
    .modern-send-btn svg {
      width: 16px !important;
      height: 16px !important;
      stroke-width: 2 !important;
      stroke: currentColor !important;
      fill: none !important;
      
      /* Pixel-perfect rendering */
      shape-rendering: geometricPrecision !important;
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
      
      /* GPU acceleration without blur */
      will-change: transform !important;
      transform: translateZ(0) !important;
      -webkit-backface-visibility: hidden !important;
      backface-visibility: hidden !important;
      
      /* Smooth hover transition */
      transition: transform 0.15s ease, opacity 0.15s ease !important;
    }
    
    /* Icon hover - scale up */
    .tool-button:hover svg {
      transform: translateZ(0) scale(1.12) !important;
    }
    
    /* Icon active - press down */
    .tool-button:active svg {
      transform: translateZ(0) scale(0.95) !important;
    }
    
    /* ================================================================ */
    /* ULTRA SHARP TOOLTIP STYLING - WHITE BACKGROUND FOR VISIBILITY  */
    /* ================================================================ */
    .tool-button[data-tooltip]::after,
    .modern-send-btn[data-tooltip]::after,
    #analyze-code-btn[data-tooltip]::after,
    [data-tooltip="Analyze"]::after {
      /* Position above button */
      content: attr(data-tooltip) !important;
      position: absolute !important;
      bottom: calc(100% + 8px) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      top: auto !important;
      
      /* Tight padding - matches text exactly */
      padding: 4px 10px !important;
      line-height: 1.3 !important;
      
      /* No extra size - fit to content */
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      max-height: none !important;
      box-sizing: content-box !important;
      white-space: nowrap !important;
      
      /* WHITE BACKGROUND - BLACK TEXT - Maximum visibility */
      color: #1a1a1a !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      border: 1px solid #ccc !important;
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 0.3px !important;
      
      /* Maximum sharpness settings */
      -webkit-font-smoothing: antialiased !important;
      text-rendering: geometricPrecision !important;
      
      border-radius: 6px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      z-index: 99999 !important;
      
      /* Hidden by default */
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: opacity 0.15s ease, visibility 0.15s ease !important;
    }
    
    .tool-button[data-tooltip]:hover::after,
    .modern-send-btn[data-tooltip]:hover::after,
    #analyze-code-btn[data-tooltip]:hover::after,
    [data-tooltip="Analyze"]:hover::after {
      opacity: 1 !important;
      visibility: visible !important;
    }
  `;
  
  // Append to end of head to ensure highest priority
  document.head.appendChild(style);
  
  // Fix Send button tooltip text
  const sendBtn = document.querySelector('#send-btn, .modern-send-btn, .send-button');
  if (sendBtn) {
    sendBtn.setAttribute('data-tooltip', 'Send (Enter)');
  }
  
  console.log('✅ Tooltip fix & hover animations applied');
}

/**
 * Initialize the clean modern input area
 */
export function initializeProfessionalIcons(): void {
  addProfessionalIconStyles();
  
  // Apply tooltip fix after a delay to ensure it's last
  setTimeout(killDuplicateTooltips, 100);
  
  observeDropZone();
  
  // Initial upgrade
  setTimeout(() => {
    upgradeChatInputIcons();
    fixAllToolButtonStyles();
    restructureInputAreaGrouped(); // Use grouped toolbar
    upgradeAnalyzeBadges();
    setTimeout(fixAllToolButtonStyles, 100);
    setTimeout(killDuplicateTooltips, 200);
  }, 500);
  
  // Multiple retry attempts to catch late-loading badges
  setTimeout(upgradeAnalyzeBadges, 1000);
  setTimeout(upgradeAnalyzeBadges, 2000);
  setTimeout(upgradeAnalyzeBadges, 3000);
  
  // Keep checking periodically for new badges
  let badgeCheckCount = 0;
  const badgeInterval = setInterval(() => {
    upgradeAnalyzeBadges();
    badgeCheckCount++;
    if (badgeCheckCount > 10) {
      clearInterval(badgeInterval);
    }
  }, 500);
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const hasToolButtons = Array.from(mutation.addedNodes).some(node => {
          if (node instanceof HTMLElement) {
            // Also check for Analyze text
            if (node.textContent?.includes('Analyze')) {
              return true;
            }
            return node.classList?.contains('tool-button') || 
                   node.querySelector?.('.tool-button') ||
                   node.classList?.contains('chat-input-box');
          }
          return false;
        });
        
        if (hasToolButtons) {
          setTimeout(() => {
            upgradeChatInputIcons();
            fixAllToolButtonStyles();
            upgradeAnalyzeBadges();
            const inputBox = document.querySelector('.chat-input-box');
            if (inputBox && !inputBox.classList.contains('modern-grouped-restructured')) {
              restructureInputAreaGrouped(); // Use grouped toolbar
            }
            setTimeout(fixAllToolButtonStyles, 100);
            setTimeout(killDuplicateTooltips, 150);
            // Extra badge upgrade after DOM settles
            setTimeout(upgradeAnalyzeBadges, 200);
          }, 100);
        }
      }
    }
  });
  
  const assistantPanel = document.querySelector('.assistant-panel');
  if (assistantPanel) {
    observer.observe(assistantPanel, { childList: true, subtree: true });
  }
  
  // Also observe the entire document for late-loading elements
  observer.observe(document.body, { childList: true, subtree: true });
  
  console.log('🎨 Clean modern input area initialized');
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).professionalIcons = {
    upgrade: upgradeChatInputIcons,
    addStyles: addProfessionalIconStyles,
    init: initializeProfessionalIcons,
    icons: PROFESSIONAL_ICONS,
    createButton: createToolButton,
    createBadge: createAnalyzeBadge,
    fixDropZone: fixDropZoneStyles,
    fixTooltips: killDuplicateTooltips,
    // Badge style controls
    setBadgeStyle: setAnalyzeBadgeStyle,
    upgradeBadges: upgradeAnalyzeBadges,
    badgeStyles: ['pill', 'chip', 'accent', 'outlined', 'glass'] as AnalyzeBadgeStyle[],
    // Grouped toolbar
    TOOLBAR_BUTTONS,
    COLORS,
    restructureGrouped: restructureInputAreaGrouped,
    createToolButtonFromConfig,
    updateButtonIcon,
    registerButtonHandler  // For external modules to register handlers
  };
  
  console.log('🎨 Professional Icons loaded with Grouped Toolbar');
  console.log('   Rebuild toolbar: window.professionalIcons.restructureGrouped()');
  console.log('   Update icon: window.professionalIcons.updateButtonIcon(id, isActive)');
  console.log('   Register handler: window.registerToolbarHandler(id, fn)');
}

// ============================================================================
// GROUPED TOOLBAR FUNCTIONS
// ============================================================================

function createToolbarDivider(): HTMLElement {
  const divider = document.createElement('div');
  divider.className = 'toolbar-divider';
  return divider;
}

/**
 * Registry for custom button handlers - external modules can register handlers
 */
const buttonHandlerRegistry: Map<string, (btn: HTMLButtonElement) => void> = new Map();

/**
 * Register a custom click handler for a toolbar button
 * Call this from other modules to override default behavior
 */
export function registerButtonHandler(buttonId: string, handler: (btn: HTMLButtonElement) => void): void {
  buttonHandlerRegistry.set(buttonId, handler);
  
  // If button already exists, update its handler
  const btn = document.getElementById(buttonId) as HTMLButtonElement;
  if (btn) {
    btn.onclick = () => handler(btn);
    console.log(`✅ Handler registered for ${buttonId}`);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  (window as any).registerToolbarHandler = registerButtonHandler;
  
  // Expose convenience functions for common buttons
  (window as any).setAnalyzeHandler = (handler: () => void) => {
    registerButtonHandler('analyze-code-btn', handler);
  };
  (window as any).setDebugHandler = (handler: () => void) => {
    registerButtonHandler('debug-code-btn', handler);
  };
  (window as any).setCameraHandler = (handler: () => void) => {
    registerButtonHandler('camera-toggle-btn', handler);
  };
  (window as any).setFixErrorsHandler = (handler: () => void) => {
    registerButtonHandler('fix-errors-btn', handler);
  };
}

/**
 * Update button icon based on active state
 */
export function updateButtonIcon(buttonId: string, isActive: boolean): void {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  const config = TOOLBAR_BUTTONS.find(c => c.id === buttonId);
  if (!config) return;
  
  const color = isActive && config.colorOn ? config.colorOn : config.color;
  
  if (isActive && config.iconOn) {
    btn.innerHTML = PROFESSIONAL_ICONS[config.iconOn];
    btn.style.color = color;
    btn.style.setProperty('color', color, 'important');
  } else {
    btn.innerHTML = PROFESSIONAL_ICONS[config.icon];
    btn.style.color = config.color;
    btn.style.setProperty('color', config.color, 'important');
  }
  
  // ✅ Handle camera button SVG styling (outline with indicator dot)
  if (buttonId === 'camera-toggle-btn') {
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.style.stroke = color;
      svg.style.setProperty('stroke', color, 'important');
      svg.style.fill = 'none';
      svg.style.setProperty('fill', 'none', 'important');
      
      // Set stroke on main elements (path, large circle)
      svg.querySelectorAll('path, circle[r="4"]').forEach(el => {
        const elem = el as SVGElement;
        elem.style.stroke = color;
        elem.style.setProperty('stroke', color, 'important');
        elem.style.fill = 'none';
        elem.style.setProperty('fill', 'none', 'important');
      });
      
      // Fill the indicator dot when active
      svg.querySelectorAll('circle[r="1.5"]').forEach(el => {
        const elem = el as SVGElement;
        if (isActive) {
          elem.style.fill = color;
          elem.style.setProperty('fill', color, 'important');
        } else {
          elem.style.fill = 'none';
        }
        elem.style.stroke = 'none';
      });
    }
  }
  
  // ✅ Handle terminal button SVG styling (outline with indicator dot)
  if (buttonId === 'terminal-ctx-btn') {
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.style.stroke = color;
      svg.style.setProperty('stroke', color, 'important');
      svg.style.fill = 'none';
      svg.style.setProperty('fill', 'none', 'important');
      
      // Set stroke on main elements (polyline, line)
      svg.querySelectorAll('polyline, line').forEach(el => {
        const elem = el as SVGElement;
        elem.style.stroke = color;
        elem.style.setProperty('stroke', color, 'important');
        elem.style.fill = 'none';
        elem.style.setProperty('fill', 'none', 'important');
      });
      
      // Fill the indicator dot when active (r="2.5")
      svg.querySelectorAll('circle[r="2.5"]').forEach(el => {
        const elem = el as SVGElement;
        if (isActive) {
          elem.style.fill = color;
          elem.style.setProperty('fill', color, 'important');
        } else {
          elem.style.fill = 'none';
        }
        elem.style.stroke = 'none';
      });
    }
  }
}

/**
 * Remove any ripple/wave effects from a button (for toggle buttons)
 */
function removeRippleEffect(btn: HTMLElement): void {
  // Remove any ripple child elements
  const ripples = btn.querySelectorAll('.ripple, [class*="ripple"], [class*="wave"], .effect, [class*="effect"]');
  ripples.forEach(r => r.remove());
  
  // Reset any animation styles
  btn.style.animation = 'none';
  btn.style.setProperty('animation', 'none', 'important');
  
  // Force remove any pseudo-element effects via class
  btn.classList.remove('rippling', 'has-ripple', 'clicking', 'pressed');
  
  // Ensure no transform animation
  btn.style.transform = 'none';
  
  // Schedule another cleanup after animation frame
  requestAnimationFrame(() => {
    const moreRipples = btn.querySelectorAll('.ripple, [class*="ripple"], [class*="wave"]');
    moreRipples.forEach(r => r.remove());
  });
}

/**
 * Force clear pseudo-elements (::before, ::after) for a button
 * AND clear btn-fix-on background highlighting
 */
function forceClearPseudoElements(buttonId: string): void {
  const styleId = `force-clear-pseudo-${buttonId}`;
  let existingStyle = document.getElementById(styleId);
  if (existingStyle) existingStyle.remove();
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Clear pseudo-elements */
    #${buttonId}::before,
    #${buttonId}::after,
    #${buttonId}.active::before,
    #${buttonId}.active::after,
    #${buttonId}.camera-active::before,
    #${buttonId}.camera-active::after,
    #${buttonId}.terminal-active::before,
    #${buttonId}.terminal-active::after,
    #${buttonId}.btn-fix-off::before,
    #${buttonId}.btn-fix-off::after,
    #${buttonId}.btn-fix-on::before,
    #${buttonId}.btn-fix-on::after,
    button#${buttonId}::before,
    button#${buttonId}::after,
    button#${buttonId}.active::before,
    button#${buttonId}.active::after,
    button#${buttonId}.btn-fix-off::before,
    button#${buttonId}.btn-fix-off::after,
    button#${buttonId}.btn-fix-on::before,
    button#${buttonId}.btn-fix-on::after {
      display: none !important;
      content: none !important;
      background: transparent !important;
      background-color: transparent !important;
      opacity: 0 !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
    
    /* Clear btn-fix-on background */
    #${buttonId}.btn-fix-on,
    button#${buttonId}.btn-fix-on,
    html body #${buttonId}.btn-fix-on,
    html body button#${buttonId}.btn-fix-on {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Expose globally for autonomousCoding.ts to use
if (typeof window !== 'undefined') {
  (window as any).updateToolbarButtonIcon = updateButtonIcon;
  
  // ✅ Global function to sync camera button state (can be called from main.ts)
  (window as any).syncCameraButtonState = (isVisible: boolean) => {
    const cameraBtn = document.getElementById('camera-toggle-btn');
    if (!cameraBtn) return;
    
    cameraBtn.classList.toggle('active', isVisible);
    cameraBtn.classList.toggle('camera-active', isVisible);
    cameraBtn.title = isVisible ? 'Camera: ON' : 'Camera: OFF';
    
    // Use updateButtonIcon for proper icon and color change
    updateButtonIcon('camera-toggle-btn', isVisible);
    
    // ✅ Force clear pseudo-elements to prevent background highlight
    forceClearPseudoElements('camera-toggle-btn');
    
    console.log(`📷 [Sync] Camera button state synced: ${isVisible ? 'ON' : 'OFF'}`);
  };
  
  // ✅ Global function to sync terminal button state
  (window as any).syncTerminalButtonState = (isActive: boolean) => {
    const termBtn = document.getElementById('terminal-ctx-btn');
    if (!termBtn) return;
    
    termBtn.classList.toggle('active', isActive);
    termBtn.classList.toggle('terminal-active', isActive);
    termBtn.title = isActive ? 'Terminal Context: ON' : 'Terminal Context: OFF';
    
    // Use updateButtonIcon for proper icon and color change
    updateButtonIcon('terminal-ctx-btn', isActive);
    
    // ✅ Force clear pseudo-elements to prevent background highlight
    forceClearPseudoElements('terminal-ctx-btn');
    
    console.log(`📟 [Sync] Terminal button state synced: ${isActive ? 'ON' : 'OFF'}`);
  };
  
  // ✅ Listen for camera-panel-closed event to sync button state
  document.addEventListener('camera-panel-closed', () => {
    console.log('📷 [Event] camera-panel-closed received');
    (window as any).syncCameraButtonState?.(false);
  });
  
  // ✅ Watch for camera panel removal via MutationObserver (backup sync)
  const cameraPanelObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach(node => {
          if (node instanceof HTMLElement && node.classList?.contains('camera-panel')) {
            console.log('📷 [Observer] Camera panel removed from DOM');
            (window as any).syncCameraButtonState?.(false);
          }
        });
      }
    }
  });
  
  // Start observing when DOM is ready
  if (document.body) {
    cameraPanelObserver.observe(document.body, { childList: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      cameraPanelObserver.observe(document.body, { childList: true });
    });
  }
}

// ============================================================================
// 📝 DYNAMIC PLACEHOLDER SYSTEM
// Changes the input placeholder text based on active modes
// ============================================================================

interface PlaceholderConfig {
  id: string;
  priority: number;
  condition: () => boolean;
  placeholder: string;
  icon?: string;
  shortName?: string;
}

const PLACEHOLDER_CONFIGS: PlaceholderConfig[] = [
  {
    id: 'auto-mode',
    priority: 100,
    condition: () => {
      // Check button class (most reliable) + localStorage + global state
      const btn = document.getElementById('autonomous-mode-toggle');
      const btnActive = btn?.className?.includes('active') || btn?.className?.includes('auto-active');
      return btnActive ||
             localStorage.getItem('autonomousMode') === 'true' ||
             (window as any).autoApplyEnabled === true;
    },
    placeholder: "Describe what to build or fix, I'll handle the code...",
    icon: '🤖',
    shortName: 'Auto'
  },
  {
    id: 'code-analysis',
    priority: 90,
    condition: () => {
      return (window as any).isInCodeAnalysis?.() === true ||
             (window as any).codeAnalysisMode === true;
    },
    placeholder: "Ask about this code - explain, debug, or improve...",
    icon: '🔬',
    shortName: 'Analyze'
  },
  {
    id: 'terminal-errors',
    priority: 85,
    condition: () => {
      // Check button class for terminal active
      const btn = document.getElementById('terminal-ctx-btn');
      const btnActive = btn?.className?.includes('btn-fix-on') || 
                        btn?.className?.includes('active') || 
                        btn?.className?.includes('terminal-active');
      const hasErrors = (window as any).terminalHasRecentErrors === true;
      return btnActive && hasErrors;
    },
    placeholder: "I see terminal errors - ask me to help fix them...",
    icon: '🔴',
    shortName: 'Errors'
  },
  {
    id: 'terminal-context',
    priority: 75,
    condition: () => {
      // Check button class (btn-fix-on is the actual class used!)
      const btn = document.getElementById('terminal-ctx-btn');
      const btnActive = btn?.className?.includes('btn-fix-on') || 
                        btn?.className?.includes('active') || 
                        btn?.className?.includes('terminal-active');
      return btnActive || localStorage.getItem('terminalContextEnabled') === 'true';
    },
    placeholder: "Ask me anything, terminal output is included...",
    icon: '⚡',
    shortName: 'Terminal'
  },
  {
    id: 'project-search',
    priority: 70,
    condition: () => {
      // Check button class + localStorage + global state
      const btn = document.getElementById('ai-search-btn');
      const btnActive = btn?.className?.includes('active') || btn?.className?.includes('ai-active');
      return btnActive ||
             localStorage.getItem('aiFileExplorerEnabled') === 'true' ||
             (window as any).aiFileExplorerEnabled === true;
    },
    placeholder: "Ask about your project files, I can read and analyze them...",
    icon: '🔍',
    shortName: 'Search'
  },
  {
    id: 'has-project',
    priority: 50,
    condition: () => {
      const projectPath = (window as any).currentFolderPath || 
                         (window as any).currentProjectPath || '';
      return projectPath.length > 0;
    },
    placeholder: "Ask me anything....",
    icon: '📁',
    shortName: 'Project'
  },
  {
    id: 'default',
    priority: 0,
    condition: () => true,
    placeholder: "Ask me anything....",
    icon: '💬',
    shortName: 'Chat'
  }
];

// Modes that should be shown in combined message (excludes 'has-project' and 'default')
const COMBINABLE_MODES = ['auto-mode', 'code-analysis', 'terminal-errors', 'terminal-context', 'project-search'];

let placeholderUpdateTimer: number | null = null;

/**
 * Get all currently active modes (for combined display)
 */
function getActiveModes(): PlaceholderConfig[] {
  return PLACEHOLDER_CONFIGS.filter(config => {
    // Only check combinable modes
    if (!COMBINABLE_MODES.includes(config.id)) return false;
    
    try {
      return config.condition();
    } catch (e) {
      return false;
    }
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Get the current placeholder based on active modes (highest priority wins)
 */
function getCurrentPlaceholderConfig(): PlaceholderConfig {
  const sorted = [...PLACEHOLDER_CONFIGS].sort((a, b) => b.priority - a.priority);
  
  for (const config of sorted) {
    try {
      if (config.condition()) {
        return config;
      }
    } catch (e) {
      // Condition check failed, skip
    }
  }
  
  return PLACEHOLDER_CONFIGS.find(c => c.id === 'default')!;
}

/**
 * Build combined placeholder text when multiple modes are active
 */
function buildCombinedPlaceholder(activeModes: PlaceholderConfig[]): string {
  if (activeModes.length === 0) {
    return "Ask me anything....";
  }
  
  if (activeModes.length === 1) {
    return activeModes[0].placeholder;
  }
  
  // Check for specific combinations first
  const modeIds = activeModes.map(m => m.id);
  
  // Auto Mode + Project Search (with or without terminal)
  if (modeIds.includes('auto-mode') && modeIds.includes('project-search')) {
    if (modeIds.includes('terminal-context') || modeIds.includes('terminal-errors')) {
      return "Ask about your project, I can read files and handle the code with terminal context...";
    }
    return "Ask about your project files, I can read and analyze, I'll handle the project code...";
  }
  
  // Auto Mode + Terminal (without search)
  if (modeIds.includes('auto-mode') && (modeIds.includes('terminal-context') || modeIds.includes('terminal-errors'))) {
    return "Describe what to build or fix, I'll handle the code with terminal context...";
  }
  
  // Project Search + Terminal (without auto)
  if (modeIds.includes('project-search') && (modeIds.includes('terminal-context') || modeIds.includes('terminal-errors'))) {
    return "Ask about your project files, terminal output is included...";
  }
  
  // Multiple modes active - show combined format (fallback)
  // Filter out terminal-errors if terminal-context is also active (they overlap)
  const filtered = activeModes.filter((mode, index, arr) => {
    if (mode.id === 'terminal-errors' && arr.some(m => m.id === 'terminal-context')) {
      return false; // Skip terminal-errors if terminal-context is active
    }
    return true;
  });
  
  const parts = filtered.map(m => `${m.icon || ''} ${m.shortName || m.id}`);
  return `${parts.join(' + ')} active - ask me anything....`;
}

/**
 * Update the placeholder text in the input area
 */
function updateInputPlaceholder(): void {
  const textarea = document.getElementById('ai-assistant-input') as HTMLTextAreaElement;
  if (!textarea) return;

  // Get all active combinable modes
  const activeModes = getActiveModes();
  
  let newPlaceholder: string;
  
  if (activeModes.length > 1) {
    // Multiple modes - show combined message
    newPlaceholder = buildCombinedPlaceholder(activeModes);
  } else if (activeModes.length === 1) {
    // Single mode - show its specific message
    newPlaceholder = activeModes[0].placeholder;
  } else {
    // No special modes - check for project or default
    const config = getCurrentPlaceholderConfig();
    newPlaceholder = config.placeholder;
  }
  
  // Only update if changed
  if (textarea.placeholder !== newPlaceholder) {
    textarea.placeholder = newPlaceholder;
    console.log(`📝 Placeholder: "${newPlaceholder}"`);
    
    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('placeholderChanged', {
      detail: { placeholder: newPlaceholder, activeModes: activeModes.map(m => m.id) }
    }));
  }
}

/**
 * Force update the placeholder (call after mode changes)
 */
function forceUpdatePlaceholder(): void {
  updateInputPlaceholder();
}

/**
 * Schedule a debounced placeholder update
 */
function scheduleUpdatePlaceholder(): void {
  if (placeholderUpdateTimer) {
    clearTimeout(placeholderUpdateTimer);
  }
  placeholderUpdateTimer = window.setTimeout(() => {
    forceUpdatePlaceholder();
  }, 100);
}

/**
 * Add a custom placeholder configuration
 */
function addCustomPlaceholder(config: PlaceholderConfig): void {
  const existingIndex = PLACEHOLDER_CONFIGS.findIndex(c => c.id === config.id);
  if (existingIndex >= 0) {
    PLACEHOLDER_CONFIGS.splice(existingIndex, 1);
  }
  PLACEHOLDER_CONFIGS.push(config);
  forceUpdatePlaceholder();
}

/**
 * Initialize the dynamic placeholder system
 */
function initializeDynamicPlaceholder(): void {
  console.log('📝 Initializing dynamic placeholder system...');
  
  // Listen for mode change events
  window.addEventListener('autoModeChanged', scheduleUpdatePlaceholder);
  window.addEventListener('projectSearchChanged', scheduleUpdatePlaceholder);
  window.addEventListener('codeAnalysisModeChanged', scheduleUpdatePlaceholder);
  window.addEventListener('terminalContextChanged', scheduleUpdatePlaceholder);
  window.addEventListener('projectLoaded', scheduleUpdatePlaceholder);
  window.addEventListener('projectClosed', scheduleUpdatePlaceholder);
  
  // Periodic check (backup for missed events)
  setInterval(updateInputPlaceholder, 3000);
  
  // Initial update
  setTimeout(forceUpdatePlaceholder, 1000);
  
  console.log('✅ Dynamic placeholder system initialized');
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).updateInputPlaceholder = forceUpdatePlaceholder;
  (window as any).getCurrentPlaceholder = getCurrentPlaceholderConfig;
  (window as any).getActiveModes = getActiveModes;
  (window as any).addCustomPlaceholder = addCustomPlaceholder;
  (window as any).placeholderConfigs = PLACEHOLDER_CONFIGS;
  
  // Debug helper
  (window as any).debugPlaceholder = () => {
    console.log('========================================');
    console.log('📝 Dynamic Placeholder Debug');
    console.log('========================================');
    
    const activeModes = getActiveModes();
    console.log('Active modes:', activeModes.length);
    activeModes.forEach(m => {
      console.log(`  ${m.icon} ${m.shortName} (${m.id})`);
    });
    console.log('');
    
    if (activeModes.length > 1) {
      console.log('Combined message:', buildCombinedPlaceholder(activeModes));
    } else if (activeModes.length === 1) {
      console.log('Single mode message:', activeModes[0].placeholder);
    } else {
      console.log('Default/Project message:', getCurrentPlaceholderConfig().placeholder);
    }
    console.log('');
    
    console.log('All configs (by priority):');
    [...PLACEHOLDER_CONFIGS].sort((a, b) => b.priority - a.priority).forEach(c => {
      let active = false;
      try { active = c.condition(); } catch (e) {}
      const icon = c.icon || '  ';
      console.log(`  ${active ? '✅' : '  '} ${icon} [${c.priority}] ${c.id}: "${c.placeholder.substring(0, 40)}..."`);
    });
    console.log('========================================');
  };
}

// ============================================================================
// END DYNAMIC PLACEHOLDER SYSTEM
// ============================================================================

// ============================================================================
// 🤖 AUTO MODE PANEL HIGHLIGHT
// Changes project panel background when Auto Mode is ON
// ============================================================================

const AUTO_MODE_PANEL_CONFIG = {
  colors: {
    background: 'rgba(245, 158, 11, 0.04)',
    border: 'rgba(245, 158, 11, 0.3)',
    glow: 'rgba(245, 158, 11, 0.15)',
    accent: '#f59e0b',
  }
};

let autoModePanelStylesInjected = false;

function injectAutoModePanelStyles(): void {
  // Always remove and re-inject to ensure fresh styles
  const existingStyle = document.getElementById('auto-mode-panel-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'auto-mode-panel-styles';
  style.textContent = `
    /* ============================================ */
    /* Auto Mode, Project Search & Terminal        */
    /* SOFT GROWING FROM BOTTOM animation          */
    /* ============================================ */
    
    /* Explorer Panel - Base styles */
    .explorer-panel.auto-mode-active,
    .explorer-panel.project-search-active {
      position: relative;
      overflow: hidden;
    }
    
    /* Terminal Panel - Base styles */
    #terminal-content.terminal-context-active,
    .bottom-panel.terminal-context-active {
      position: relative;
      overflow: hidden;
    }
    
    /* Pseudo-element for growing effect */
    .explorer-panel.auto-mode-active::after,
    .explorer-panel.project-search-active::after,
    #terminal-content.terminal-context-active::after,
    .bottom-panel.terminal-context-active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 0%;
      pointer-events: none;
      z-index: 9999;
    }
    
    /* Soft Blue grow for Auto Mode */
    .explorer-panel.auto-mode-active::after {
      background: linear-gradient(to top, 
        rgba(59, 130, 246, 0.25) 0%, 
        rgba(59, 130, 246, 0.15) 40%,
        rgba(59, 130, 246, 0.08) 70%,
        transparent 100%
      );
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
      animation: grow-up 1s ease-out forwards;
    }
    
    /* Soft Green grow for Project Search */
    .explorer-panel.project-search-active::after {
      background: linear-gradient(to top, 
        rgba(16, 185, 129, 0.25) 0%, 
        rgba(16, 185, 129, 0.15) 40%,
        rgba(16, 185, 129, 0.08) 70%,
        transparent 100%
      );
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
      animation: grow-up 1s ease-out forwards;
    }
    
    /* Soft Purple grow for Terminal */
    #terminal-content.terminal-context-active::after,
    .bottom-panel.terminal-context-active::after {
      background: linear-gradient(to top, 
        rgba(139, 92, 246, 0.25) 0%, 
        rgba(139, 92, 246, 0.15) 40%,
        rgba(139, 92, 246, 0.08) 70%,
        transparent 100%
      );
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
      animation: grow-up 1s ease-out forwards;
    }
    
    /* Unified soft grow animation */
    @keyframes grow-up {
      0% { 
        height: 0%;
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      60% { 
        height: 100%;
        opacity: 0.8;
      }
      100% { 
        height: 100%;
        opacity: 0;
      }
    }
    
    /* Child element styles for Explorer Panel */
    .explorer-panel.auto-mode-active .ide-file-tree,
    .explorer-panel.auto-mode-active .file-tree,
    .explorer-panel.auto-mode-active .tree-list,
    .explorer-panel.project-search-active .ide-file-tree,
    .explorer-panel.project-search-active .file-tree,
    .explorer-panel.project-search-active .tree-list {
      background: rgba(8, 12, 24, 0.95) !important;
    }
    
    .explorer-panel.auto-mode-active .explorer-content,
    .explorer-panel.project-search-active .explorer-content {
      background: rgba(6, 11, 22, 0.95) !important;
    }
    
    .explorer-panel.auto-mode-active .panel-header,
    .explorer-panel.auto-mode-active .explorer-header,
    .explorer-panel.auto-mode-active .tree-project-header,
    .explorer-panel.project-search-active .panel-header,
    .explorer-panel.project-search-active .explorer-header,
    .explorer-panel.project-search-active .tree-project-header {
      background: linear-gradient(180deg, rgba(15, 25, 45, 0.95) 0%, rgba(8, 15, 30, 0.98) 100%) !important;
    }
    
    .explorer-panel.auto-mode-active .explorer-tabs,
    .explorer-panel.project-search-active .explorer-tabs {
      background: rgba(10, 18, 35, 0.95) !important;
    }
    
    /* Child element styles for Terminal Panel */
    #terminal-content.terminal-context-active .integrated-terminal,
    .bottom-panel.terminal-context-active .integrated-terminal {
      background: rgba(5, 10, 20, 0.98) !important;
    }
    
    #terminal-content.terminal-context-active .terminal-output,
    #terminal-content.terminal-context-active #integrated-terminal-output,
    .bottom-panel.terminal-context-active .terminal-output,
    .bottom-panel.terminal-context-active #integrated-terminal-output {
      background: rgba(8, 12, 24, 0.95) !important;
    }
    
    #terminal-content.terminal-context-active .terminal-header,
    .bottom-panel.terminal-context-active .terminal-header {
      background: linear-gradient(180deg, rgba(50, 30, 70, 0.95) 0%, rgba(25, 15, 40, 0.98) 100%) !important;
    }
    
    #terminal-content.terminal-context-active .terminal-input-line,
    .bottom-panel.terminal-context-active .terminal-input-line {
      background: rgba(10, 15, 25, 0.95) !important;
    }
  `;
  
  document.head.appendChild(style);
  autoModePanelStylesInjected = true;
}

function findProjectPanel(): HTMLElement | null {
  // Target the specific explorer-panel class
  const panel = document.querySelector('.explorer-panel') as HTMLElement;
  if (panel) {
    console.log('🎯 Found panel: .explorer-panel');
    return panel;
  }
  
  // Fallback selectors - try more options
  const fallbacks = [
    '.file-explorer-panel',
    '.project-panel',
    '.explorer-container',
    '#explorer-panel',
    '.explorer',
    '[data-panel="explorer"]',
    '.sidebar-panel',
    '.left-panel',
  ];
  
  for (const selector of fallbacks) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      console.log(`🎯 Found panel: ${selector}`);
      return el;
    }
  }
  
  console.log('⚠️ No explorer panel found with any selector');
  return null;
}

function toggleAutoModePanelHighlight(enabled: boolean): void {
  injectAutoModePanelStyles();
  
  const panel = findProjectPanel();
  if (panel) {
    if (enabled) {
      // IMPORTANT: Remove inline background style so CSS animation can work!
      console.log('🤖 [Auto Mode] Removing inline styles...');
      panel.style.removeProperty('background');
      panel.style.removeProperty('background-color');
      
      // Remove class first to re-trigger animation
      panel.classList.remove('auto-mode-active');
      // Force reflow to restart animation
      void panel.offsetWidth;
      // Add class to trigger animation
      panel.classList.add('auto-mode-active');
      console.log('🤖 [Auto Mode Panel] Highlight ON + Animation');
    } else {
      panel.classList.remove('auto-mode-active');
      console.log('🤖 [Auto Mode Panel] Highlight OFF');
    }
  } else {
    console.log('⚠️ [Auto Mode Panel] Explorer panel not found');
  }
}

function toggleProjectSearchPanelHighlight(enabled: boolean): void {
  injectAutoModePanelStyles();
  
  const panel = findProjectPanel();
  if (panel) {
    if (enabled) {
      // Remove class first to re-trigger animation
      panel.classList.remove('project-search-active');
      // Force reflow to restart animation
      void panel.offsetWidth;
      // Add class to trigger animation
      panel.classList.add('project-search-active');
      console.log('🔍 [Project Search Panel] Highlight ON + Animation');
    } else {
      panel.classList.remove('project-search-active');
      console.log('🔍 [Project Search Panel] Highlight OFF');
    }
  }
}

function toggleTerminalContextPanelHighlight(enabled: boolean): void {
  injectAutoModePanelStyles();
  
  // Try multiple selectors for terminal
  let terminal = document.getElementById('terminal-content');
  if (!terminal) {
    terminal = document.querySelector('.bottom-panel') as HTMLElement;
  }
  
  if (terminal) {
    if (enabled) {
      // IMPORTANT: Remove inline background style so CSS animation can work!
      console.log('⚡ [Terminal] Removing inline style...'); // MARKER V2
      terminal.style.removeProperty('background');
      terminal.style.removeProperty('background-color');
      console.log('⚡ [Terminal] Inline style removed, bg now:', terminal.style.background || '(empty)');
      
      // Remove class first to re-trigger animation
      terminal.classList.remove('terminal-context-active');
      // Force reflow to restart animation
      void terminal.offsetWidth;
      // Add class to trigger CSS animation
      terminal.classList.add('terminal-context-active');
      console.log('⚡ [Terminal Context Panel] Highlight ON + Animation (V2)');
    } else {
      terminal.classList.remove('terminal-context-active');
      // Restore original background
      terminal.style.setProperty('background', 'rgb(13, 17, 23)', 'important');
      console.log('⚡ [Terminal Context Panel] Highlight OFF');
    }
  } else {
    console.log('⚠️ [Terminal Context Panel] Terminal element not found');
  }
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).autoModePanel = {
    enable: () => toggleAutoModePanelHighlight(true),
    disable: () => toggleAutoModePanelHighlight(false),
    toggle: toggleAutoModePanelHighlight,
  };
  (window as any).projectSearchPanel = {
    enable: () => toggleProjectSearchPanelHighlight(true),
    disable: () => toggleProjectSearchPanelHighlight(false),
    toggle: toggleProjectSearchPanelHighlight,
  };
  (window as any).terminalContextPanel = {
    enable: () => toggleTerminalContextPanelHighlight(true),
    disable: () => toggleTerminalContextPanelHighlight(false),
    toggle: toggleTerminalContextPanelHighlight,
  };
  
  // Test function for debugging animations
  (window as any).testPanelAnimations = () => {
    console.log('🧪 Testing panel animations...');
    
    // Test Auto Mode (blue)
    console.log('1️⃣ Testing Auto Mode (blue)...');
    (window as any).autoModePanel.enable();
    
    setTimeout(() => {
      console.log('2️⃣ Testing Project Search (green)...');
      (window as any).projectSearchPanel.enable();
    }, 1500);
    
    setTimeout(() => {
      console.log('3️⃣ Testing Terminal (purple)...');
      (window as any).terminalContextPanel.enable();
    }, 3000);
    
    setTimeout(() => {
      console.log('✅ Test complete!');
    }, 4500);
  };
  
  console.log('💡 Test animations: window.testPanelAnimations()');
}

// ============================================================================
// END AUTO MODE PANEL HIGHLIGHT
// ============================================================================

/**
 * Show Auto Mode notification toast
 */
function showAutoModeNotification(enabled: boolean): void {
  // Update placeholder when mode changes
  scheduleUpdatePlaceholder();
  
  // Update panel highlight
  toggleAutoModePanelHighlight(enabled);
  
  // Remove existing notification
  const existing = document.querySelector('.auto-mode-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'auto-mode-notification';
  notification.innerHTML = enabled ? `
    <div class="auto-mode-notification-content">
      <div class="auto-mode-notification-icon">☀️</div>
      <div class="auto-mode-notification-text">
        <div class="auto-mode-notification-title">Auto Mode Enabled</div>
        <div class="auto-mode-notification-desc">AI will automatically apply code changes</div>
      </div>
    </div>
  ` : `
    <div class="auto-mode-notification-content">
      <div class="auto-mode-notification-icon">○</div>
      <div class="auto-mode-notification-text">
        <div class="auto-mode-notification-title">Auto Mode Disabled</div>
        <div class="auto-mode-notification-desc">Use code block buttons to apply manually</div>
      </div>
    </div>
  `;
  
  // Add styles if not present
  if (!document.getElementById('auto-mode-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'auto-mode-notification-styles';
    style.textContent = `
      .auto-mode-notification {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 99999;
        animation: autoModeSlideIn 0.3s ease-out;
      }
      
      @keyframes autoModeSlideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes autoModeSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
      
      .auto-mode-notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #1e1e1e;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        min-width: 280px;
      }
      
      .auto-mode-notification-icon {
        font-size: 24px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .auto-mode-notification-text {
        flex: 1;
      }
      
      .auto-mode-notification-title {
        font-size: 14px;
        font-weight: 600;
        color: #e0e0e0;
        margin-bottom: 2px;
      }
      
      .auto-mode-notification-desc {
        font-size: 12px;
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'autoModeSlideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Show Camera notification toast
 */
function showCameraNotification(enabled: boolean): void {
  // Remove existing notification
  const existing = document.querySelector('.camera-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'camera-notification';
  notification.innerHTML = enabled ? `
    <div class="camera-notification-content">
      <div class="camera-notification-icon">📷</div>
      <div class="camera-notification-text">
        <div class="camera-notification-title">Camera Enabled</div>
        <div class="camera-notification-desc">Camera panel is now visible</div>
      </div>
    </div>
  ` : `
    <div class="camera-notification-content">
      <div class="camera-notification-icon">○</div>
      <div class="camera-notification-text">
        <div class="camera-notification-title">Camera Disabled</div>
        <div class="camera-notification-desc">Camera panel is hidden</div>
      </div>
    </div>
  `;
  
  // Add styles if not present
  if (!document.getElementById('camera-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'camera-notification-styles';
    style.textContent = `
      .camera-notification {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 99999;
        animation: cameraSlideIn 0.3s ease-out;
      }
      
      @keyframes cameraSlideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes cameraSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
      
      .camera-notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #1e1e1e;
        border: 1px solid #f472b6;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(244, 114, 182, 0.2);
        min-width: 280px;
      }
      
      .camera-notification-icon {
        font-size: 24px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .camera-notification-text {
        flex: 1;
      }
      
      .camera-notification-title {
        font-size: 14px;
        font-weight: 600;
        color: #f472b6;
        margin-bottom: 2px;
      }
      
      .camera-notification-desc {
        font-size: 12px;
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'cameraSlideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Show Project Search notification toast
 */
function showProjectSearchNotification(enabled: boolean): void {
  // Update placeholder when mode changes
  scheduleUpdatePlaceholder();
  
  // Update panel highlight
  toggleProjectSearchPanelHighlight(enabled);
  
  // Remove existing notification
  const existing = document.querySelector('.project-search-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'project-search-notification';
  notification.innerHTML = enabled ? `
    <div class="project-search-notification-content enabled">
      <div class="project-search-notification-icon">🔍</div>
      <div class="project-search-notification-text">
        <div class="project-search-notification-title">Project Search ON</div>
        <div class="project-search-notification-desc">AI will search your project files for context</div>
      </div>
    </div>
  ` : `
    <div class="project-search-notification-content disabled">
      <div class="project-search-notification-icon">○</div>
      <div class="project-search-notification-text">
        <div class="project-search-notification-title">Project Search OFF</div>
        <div class="project-search-notification-desc">AI will not include project files in context</div>
      </div>
    </div>
  `;
  
  // Add styles if not present
  if (!document.getElementById('project-search-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'project-search-notification-styles';
    style.textContent = `
      .project-search-notification {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 99999;
        animation: projectSearchSlideIn 0.3s ease-out;
      }
      
      @keyframes projectSearchSlideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes projectSearchSlideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
      
      .project-search-notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #1e1e1e;
        border: 1px solid #10b981;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        min-width: 280px;
      }
      
      .project-search-notification-content.disabled {
        border-color: #3c3c3c;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .project-search-notification-icon {
        font-size: 24px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .project-search-notification-text {
        flex: 1;
      }
      
      .project-search-notification-title {
        font-size: 14px;
        font-weight: 600;
        color: #10b981;
        margin-bottom: 2px;
      }
      
      .project-search-notification-content.disabled .project-search-notification-title {
        color: #888;
      }
      
      .project-search-notification-desc {
        font-size: 12px;
        color: #888;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'projectSearchSlideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================================================
// QUICK ACTIONS MENU - Lightning bolt popup
// ============================================================================

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  color: string;
  type: 'explain' | 'code';  // Type determines output format
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain',
    icon: '💬',
    label: 'Explain Code',
    prompt: `Analyze and explain this code in detail. Format your response EXACTLY like this:

## OVERVIEW
[1-2 sentence summary of what this code does]

## IMPORTS & DEPENDENCIES
[List each import and what it provides]

## FUNCTIONS & COMPONENTS
For each function/component:
### [function_name]
- **Purpose:** [what it does]
- **Parameters:** [list params with types]
- **Returns:** [what it returns]
- **How it works:** [step-by-step explanation]

## RELATIONSHIPS
[How different parts of the code interact with each other]

## POTENTIAL ISSUES
[Any bugs, performance issues, or improvements suggested]

Be concise but thorough. Use bullet points for clarity.`,
    color: '#3b82f6',
    type: 'explain'
  },
  {
    id: 'optimize',
    icon: '🚀',
    label: 'Optimize',
    prompt: `Optimize this code for better performance. 

First, output the COMPLETE optimized code.

Then, after the code, explain:
## What Changed
- List each optimization made

## Benefits  
- Performance improvements
- Efficiency gains

## Why
Brief explanation of the optimization strategy.`,
    color: '#10b981',
    type: 'code'
  },
  {
    id: 'comments',
    icon: '📝',
    label: 'Add Comments',
    prompt: `Add comprehensive documentation comments to this code.

First, output the COMPLETE commented code.

Then, after the code, explain:
## What Was Added
- Types of comments added (JSDoc, inline, etc.)

## Benefits
- Improved readability
- Better IDE support`,
    color: '#f59e0b',
    type: 'code'
  },
  {
    id: 'refactor',
    icon: '🔄',
    label: 'Refactor',
    prompt: `Refactor this code to improve structure and maintainability.

First, output the COMPLETE refactored code.

Then, after the code, explain:
## What Changed
- List each refactoring applied

## Benefits
- Maintainability improvements  
- Code reusability

## Principles Applied
- SOLID, DRY, etc.`,
    color: '#8b5cf6',
    type: 'code'
  },
  {
    id: 'tests',
    icon: '🧪',
    label: 'Generate Tests',
    prompt: `Generate comprehensive unit tests for this code.

First, output the COMPLETE test code.

Then, after the code, explain:
## Test Coverage
- What is being tested

## Test Cases
- Normal cases
- Edge cases  
- Error handling`,
    color: '#ec4899',
    type: 'code'
  },
  {
    id: 'types',
    icon: '📐',
    label: 'Add Types',
    prompt: `Add TypeScript types and interfaces to this code.

First, output the COMPLETE typed code.

Then, after the code, explain:
## Types Added
- Interfaces/types created
- Function signatures typed

## Benefits
- Type safety
- Better autocomplete`,
    color: '#06b6d4',
    type: 'code'
  },
  {
    id: 'security',
    icon: '🔒',
    label: 'Security Check',
    prompt: `Review this code for security issues. Format your response EXACTLY like this:

## SECURITY ANALYSIS

### ✅ SAFE PATTERNS
[List good security practices found in the code]

### ⚠️ POTENTIAL RISKS
For each issue found:
- **Issue:** [description]
- **Location:** [where in the code]
- **Risk Level:** [Low/Medium/High]
- **Fix:** [how to fix it]

### 🔧 RECOMMENDED FIXES
[Specific code changes to improve security]

### 📋 CHECKLIST
- [ ] Input validation
- [ ] Output encoding
- [ ] Authentication/Authorization
- [ ] Data protection
- [ ] Error handling

Be specific and actionable.`,
    color: '#ef4444',
    type: 'explain'
  },
  {
    id: 'simplify',
    icon: '✨',
    label: 'Simplify',
    prompt: `Simplify this code to be more readable and concise.

First, output the COMPLETE simplified code.

Then, after the code, explain:
## What Changed
- List simplifications made

## Benefits
- Reduced complexity
- Better readability

## Techniques Used
- Modern syntax, removed redundancy, etc.`,
    color: '#a855f7',
    type: 'code'
  }
];

/**
 * Show Quick Actions popup menu
 */
function showQuickActionsMenu(anchorBtn: HTMLElement): void {
  // Remove existing menu
  const existingMenu = document.querySelector('.quick-actions-menu');
  if (existingMenu) {
    existingMenu.remove();
    return; // Toggle off
  }
  
  // Create menu container
  const menu = document.createElement('div');
  menu.className = 'quick-actions-menu';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'quick-actions-header';
  header.innerHTML = `
    <span class="quick-actions-icon">⚡</span>
    <span class="quick-actions-title">Quick Actions</span>
    <span class="quick-actions-badge">Operator X02</span>
  `;
  menu.appendChild(header);
  
  // Create actions grid
  const grid = document.createElement('div');
  grid.className = 'quick-actions-grid';
  
  QUICK_ACTIONS.forEach((action, index) => {
    const item = document.createElement('button');
    item.className = 'quick-action-item';
    item.dataset.actionId = action.id;
    item.style.animationDelay = `${index * 0.05}s`;  // Staggered animation
    item.innerHTML = `
      <span class="quick-action-icon" style="background: ${action.color}20; color: ${action.color}">${action.icon}</span>
      <span class="quick-action-label">${action.label}</span>
    `;
    
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeQuickAction(action);
      menu.remove();
    };
    
    grid.appendChild(item);
  });
  
  menu.appendChild(grid);
  
  // Add styles if not present
  if (!document.getElementById('quick-actions-styles')) {
    const style = document.createElement('style');
    style.id = 'quick-actions-styles';
    style.textContent = `
      .quick-actions-menu {
        position: fixed;
        z-index: 10000;
        background: linear-gradient(180deg, #252526 0%, #1e1e1e 100%);
        border: 1px solid #3c3c3c;
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05) inset;
        padding: 8px;
        min-width: 290px;
        max-width: 320px;
        animation: quickActionsPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform-origin: bottom center;
      }
      
      @keyframes quickActionsPopIn {
        0% {
          opacity: 0;
          transform: translateY(15px) scale(0.9);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .quick-actions-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid #3c3c3c;
        margin-bottom: 8px;
        animation: quickActionsHeaderGlow 0.5s ease;
      }
      
      @keyframes quickActionsHeaderGlow {
        0% { opacity: 0; }
        50% { opacity: 1; background: rgba(78, 201, 176, 0.1); }
        100% { opacity: 1; background: transparent; }
      }
      
      .quick-actions-icon {
        font-size: 18px;
        animation: quickActionsIconPulse 0.6s ease;
      }
      
      @keyframes quickActionsIconPulse {
        0% { transform: scale(0); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
      }
      
      .quick-actions-title {
        font-size: 13px;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      .quick-actions-badge {
        margin-left: auto;
        font-size: 9px;
        color: #4ec9b0;
        background: rgba(78, 201, 176, 0.15);
        padding: 3px 8px;
        border-radius: 10px;
        border: 1px solid rgba(78, 201, 176, 0.3);
        animation: quickActionsBadgeFade 0.4s ease 0.2s backwards;
      }
      
      @keyframes quickActionsBadgeFade {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      .quick-actions-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        padding: 4px;
      }
      
      .quick-action-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        animation: quickActionItemSlide 0.3s ease backwards;
        position: relative;
        overflow: hidden;
      }
      
      @keyframes quickActionItemSlide {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .quick-action-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .quick-action-item:hover::before {
        opacity: 1;
      }
      
      .quick-action-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .quick-action-item:active {
        transform: scale(0.97) translateY(0);
        transition: transform 0.1s;
      }
      
      .quick-action-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-size: 15px;
        flex-shrink: 0;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .quick-action-item:hover .quick-action-icon {
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      
      .quick-action-label {
        font-size: 12px;
        color: #b0b0b0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 0.2s;
      }
      
      .quick-action-item:hover .quick-action-label {
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Position menu above the button
  document.body.appendChild(menu);
  
  const btnRect = anchorBtn.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  
  // Position above button, centered
  let left = btnRect.left + (btnRect.width / 2) - (menuRect.width / 2);
  let top = btnRect.top - menuRect.height - 8;
  
  // Keep within viewport
  if (left < 10) left = 10;
  if (left + menuRect.width > window.innerWidth - 10) {
    left = window.innerWidth - menuRect.width - 10;
  }
  if (top < 10) {
    // Show below if no room above
    top = btnRect.bottom + 8;
  }
  
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  
  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchorBtn) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 10);
  
  // Close on Escape
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      menu.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Execute a quick action - show dialog with results
 */
function executeQuickAction(action: QuickAction): void {
  console.log(`⚡ Executing quick action: ${action.label}`);
  
  // Get current code from Monaco editor for context
  let currentCode = '';
  let currentFileName = '';
  let currentLanguage = '';
  
  try {
    const monaco = (window as any).monaco;
    if (monaco?.editor) {
      const editors = monaco.editor.getEditors();
      if (editors.length > 0) {
        const model = editors[0].getModel();
        if (model) {
          currentCode = model.getValue();
          currentFileName = model.uri?.path?.split('/').pop() || 'current file';
          currentLanguage = model.getLanguageId() || '';
        }
      }
    }
  } catch (e) {
    console.warn('Could not get editor content:', e);
  }
  
  if (!currentCode || currentCode.trim().length < 10) {
    showQuickActionErrorDialog('No code found', 'Please open a file in the editor first.');
    return;
  }
  
  // Show the quick action dialog with loading state
  showQuickActionResultDialog(action, currentCode, currentFileName, currentLanguage);
}

/**
 * Show error dialog for quick actions
 */
function showQuickActionErrorDialog(title: string, message: string): void {
  const existing = document.querySelector('.qa-error-dialog');
  if (existing) existing.remove();
  
  const dialog = document.createElement('div');
  dialog.className = 'qa-error-dialog';
  dialog.innerHTML = `
    <div class="qa-error-content">
      <div class="qa-error-icon">⚠️</div>
      <div class="qa-error-title">${title}</div>
      <div class="qa-error-message">${message}</div>
      <button class="qa-error-close">OK</button>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .qa-error-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
    }
    .qa-error-content {
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      max-width: 320px;
    }
    .qa-error-icon { font-size: 32px; margin-bottom: 12px; }
    .qa-error-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px; }
    .qa-error-message { font-size: 13px; color: #888; margin-bottom: 16px; }
    .qa-error-close {
      background: #333;
      border: none;
      color: #fff;
      padding: 8px 24px;
      border-radius: 6px;
      cursor: pointer;
    }
    .qa-error-close:hover { background: #444; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(dialog);
  
  dialog.querySelector('.qa-error-close')?.addEventListener('click', () => dialog.remove());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
}

/**
 * Show Quick Action Result Dialog - Draggable, non-modal dialog
 */
function showQuickActionResultDialog(
  action: QuickAction, 
  currentCode: string, 
  fileName: string, 
  language: string
): void {
  // Remove existing dialog
  const existing = document.querySelector('.qa-result-dialog');
  if (existing) existing.remove();
  
  // Inject styles
  injectQuickActionDialogStyles();
  
  const isExplainMode = action.type === 'explain';
  
  // Create dialog (non-modal - no overlay)
  const dialog = document.createElement('div');
  dialog.className = 'qa-result-dialog';
  dialog.innerHTML = `
    <div class="qa-result-panel ${isExplainMode ? 'qa-explain-mode' : 'qa-code-mode'}">
      <div class="qa-result-header" title="Drag to move">
        <div class="qa-result-header-left">
          <span class="qa-drag-handle">⋮⋮</span>
          <span class="qa-result-icon" style="background: ${action.color}20; color: ${action.color}">${action.icon}</span>
          <span class="qa-result-title">${action.label}</span>
          <span class="qa-result-file">${fileName}</span>
          <span class="qa-powered-by">⚡ Operator X02</span>
        </div>
        <button class="qa-result-close" title="Close (Escape)">✕</button>
      </div>
      <div class="qa-result-body">
        <div class="qa-result-loading">
          <div class="qa-spinner"></div>
          <div class="qa-loading-text">${isExplainMode ? 'Analyzing' : 'Processing'} ${action.label.toLowerCase()}...</div>
        </div>
        <div class="qa-result-content" style="display: none;">
          ${isExplainMode 
            ? '<div class="qa-explain-content"></div>' 
            : `<pre class="qa-result-code"><code></code></pre>
               <div class="qa-details-panel" style="display: none;">
                 <div class="qa-details-header">
                   <span class="qa-details-icon">📋</span>
                   <span>Changes & Reasons</span>
                   <button class="qa-details-collapse" title="Collapse">▼</button>
                 </div>
                 <div class="qa-details-content"></div>
               </div>`}
        </div>
        <div class="qa-result-error" style="display: none;">
          <div class="qa-error-msg"></div>
        </div>
      </div>
      <div class="qa-result-footer">
        <div class="qa-result-stats"></div>
        <div class="qa-result-actions">
          ${!isExplainMode ? `
          <button class="qa-btn qa-btn-details" style="display: none;" title="Show why these changes were made">
            <span class="qa-btn-icon">📋</span> Details
          </button>` : ''}
          <button class="qa-btn qa-btn-secondary qa-btn-cancel">Close</button>
          ${!isExplainMode ? `
          <button class="qa-btn qa-btn-primary qa-btn-apply" disabled>
            <span class="qa-btn-icon">✓</span> Apply
          </button>` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  
  // Make dialog draggable
  const panel = dialog.querySelector('.qa-result-panel') as HTMLElement;
  const header = dialog.querySelector('.qa-result-header') as HTMLElement;
  
  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  
  // Center the dialog initially
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${(window.innerWidth - rect.width) / 2}px`;
  panel.style.top = `${(window.innerHeight - rect.height) / 2}px`;
  
  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.qa-result-close')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const panelRect = panel.getBoundingClientRect();
    initialLeft = panelRect.left;
    initialTop = panelRect.top;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = 'grab';
  });
  
  // Get elements
  const closeBtn = dialog.querySelector('.qa-result-close') as HTMLButtonElement;
  const cancelBtn = dialog.querySelector('.qa-btn-cancel') as HTMLButtonElement;
  const applyBtn = dialog.querySelector('.qa-btn-apply') as HTMLButtonElement | null;
  const loadingEl = dialog.querySelector('.qa-result-loading') as HTMLElement;
  const contentEl = dialog.querySelector('.qa-result-content') as HTMLElement;
  const errorEl = dialog.querySelector('.qa-result-error') as HTMLElement;
  const statsEl = dialog.querySelector('.qa-result-stats') as HTMLElement;
  
  let resultCode = '';
  
  // Close handlers
  const closeDialog = () => dialog.remove();
  closeBtn.addEventListener('click', closeDialog);
  cancelBtn.addEventListener('click', closeDialog);
  
  // Escape key to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  // Apply handler (only for code actions)
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      if (!resultCode) return;
      
      applyBtn.disabled = true;
      applyBtn.innerHTML = '<span class="qa-btn-icon">⏳</span> Applying...';
      
      // Apply with highlights
      if (typeof (window as any).applySmartUpdate === 'function') {
        const result = await (window as any).applySmartUpdate(resultCode);
        if (result.success) {
          closeDialog();
          showQuickActionToast(`✅ ${action.label} applied: ${result.message}`, action.color);
        } else {
          applyBtn.disabled = false;
          applyBtn.innerHTML = '<span class="qa-btn-icon">✓</span> Apply to Editor';
          showQuickActionToast(`❌ Failed: ${result.message}`, '#ef4444');
        }
      } else if (typeof (window as any).applyCodeToEditor === 'function') {
        const result = (window as any).applyCodeToEditor(resultCode, 'replace');
        if (result.success) {
          closeDialog();
          showQuickActionToast(`✅ ${action.label} applied`, action.color);
        }
      }
    });
  }
  
  // Details button toggle (for code actions)
  const detailsBtn = dialog.querySelector('.qa-btn-details') as HTMLButtonElement | null;
  const detailsPanel = dialog.querySelector('.qa-details-panel') as HTMLElement | null;
  const detailsCollapseBtn = dialog.querySelector('.qa-details-collapse') as HTMLButtonElement | null;
  
  let changesContent: string | null = null;
  let isLoadingDetails = false;
  
  if (detailsBtn && detailsPanel) {
    // Always show Details button for code actions
    detailsBtn.style.display = 'flex';
    
    detailsBtn.addEventListener('click', async () => {
      const isHidden = detailsPanel.style.display === 'none';
      
      if (isHidden) {
        // Show panel
        detailsPanel.style.display = 'block';
        detailsBtn.innerHTML = '<span class="qa-btn-icon">📋</span> Hide';
        
        // If no changes loaded yet, fetch them
        const detailsContentEl = detailsPanel.querySelector('.qa-details-content') as HTMLElement;
        if (!changesContent && !isLoadingDetails && detailsContentEl) {
          isLoadingDetails = true;
          detailsContentEl.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 20px; justify-content: center;">
              <div class="qa-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
              <span style="color: #808080;">Analyzing changes...</span>
            </div>
          `;
          
          // Fetch explanation
          const explainPrompt = `Analyze the differences between these two code versions and explain:

## What Changed
- List the specific changes made

## Benefits
- Why these changes improve the code

## Reasoning
- Brief explanation of the approach

ORIGINAL CODE:
\`\`\`
${currentCode}
\`\`\`

MODIFIED CODE:
\`\`\`
${resultCode || 'Not yet available'}
\`\`\``;

          processQuickAction(explainPrompt, language, (explanation, error) => {
            isLoadingDetails = false;
            if (explanation && detailsContentEl) {
              changesContent = explanation;
              detailsContentEl.innerHTML = formatExplanation(explanation, action.color);
            } else {
              detailsContentEl.innerHTML = `<div style="color: #808080; padding: 20px; text-align: center;">Could not load explanation</div>`;
            }
          }, true);
        }
      } else {
        // Hide panel
        detailsPanel.style.display = 'none';
        detailsBtn.innerHTML = '<span class="qa-btn-icon">📋</span> Details';
      }
    });
  }
  
  if (detailsCollapseBtn && detailsPanel) {
    detailsCollapseBtn.addEventListener('click', () => {
      detailsPanel.style.display = 'none';
      if (detailsBtn) {
        detailsBtn.innerHTML = '<span class="qa-btn-icon">📋</span> Details';
      }
    });
  }
  
  // Build prompt for AI based on action type
  let prompt: string;
  if (isExplainMode) {
    prompt = `${action.prompt}

Here is the code to analyze:

\`\`\`${language}
${currentCode}
\`\`\``;
  } else {
    prompt = `${action.prompt}

IMPORTANT: 
1. First, output the complete modified code inside a markdown code block with \`\`\`${language || 'code'}
2. Then, output the explanation with ## headers

Here is the current code:

\`\`\`${language}
${currentCode}
\`\`\``;
  }

  // Send to AI and get response (keepMarkdown=true to preserve formatting)
  processQuickAction(prompt, language, (response, error) => {
    loadingEl.style.display = 'none';
    
    if (error) {
      errorEl.style.display = 'block';
      const errorMsg = errorEl.querySelector('.qa-error-msg') as HTMLElement;
      errorMsg.textContent = error;
      return;
    }
    
    if (response) {
      contentEl.style.display = 'block';
      console.log('📝 [QuickAction] Response received, length:', response.length);
      
      if (isExplainMode) {
        // Format explanation with colors
        const explainEl = contentEl.querySelector('.qa-explain-content') as HTMLElement;
        explainEl.innerHTML = formatExplanation(response, action.color);
        statsEl.textContent = `Analysis complete`;
      } else {
        // Parse CODE and CHANGES sections
        const { code, changes } = parseCodeResponse(response);
        console.log('📝 [QuickAction] Parsed - Code length:', code.length, 'Changes:', changes ? 'YES' : 'NO');
        
        // Show code with syntax highlighting
        resultCode = code;
        const codeEl = contentEl.querySelector('.qa-result-code code') as HTMLElement;
        codeEl.innerHTML = highlightCode(code, language);
        
        // Pre-populate changes if available from response
        if (changes && detailsPanel) {
          changesContent = changes;
          const detailsContentEl = detailsPanel.querySelector('.qa-details-content') as HTMLElement;
          if (detailsContentEl) {
            detailsContentEl.innerHTML = formatExplanation(changes, action.color);
          }
        }
        
        // Calculate stats
        const oldLines = currentCode.split('\n').length;
        const newLines = code.split('\n').length;
        const diff = newLines - oldLines;
        statsEl.textContent = `${newLines} lines (${diff >= 0 ? '+' : ''}${diff})`;
        
        if (applyBtn) applyBtn.disabled = false;
      }
    }
  }, true);  // Always keepMarkdown to preserve formatting
}

/**
 * Parse AI response to extract CODE and CHANGES sections
 */
function parseCodeResponse(response: string): { code: string; changes: string | null } {
  console.log('📝 [parseCodeResponse] Raw response:', response.substring(0, 200) + '...');
  
  // Method 1: Try ===CODE=== and ===CHANGES=== markers
  const codeMatch = response.match(/===CODE===\s*([\s\S]*?)\s*===END_CODE===/);
  const changesMatch = response.match(/===CHANGES===\s*([\s\S]*?)\s*===END_CHANGES===/);
  
  if (codeMatch) {
    console.log('📝 [parseCodeResponse] Found ===CODE=== markers');
    return {
      code: codeMatch[1].trim(),
      changes: changesMatch ? changesMatch[1].trim() : null
    };
  }
  
  // Method 2: Try to find markdown code block followed by explanation
  const mdCodeMatch = response.match(/```[\w]*\n?([\s\S]*?)```/);
  if (mdCodeMatch) {
    console.log('📝 [parseCodeResponse] Found markdown code block');
    const codeBlockStart = response.indexOf('```');
    const codeBlockEnd = response.lastIndexOf('```') + 3;
    
    // Get text after the code block
    const afterCode = response.substring(codeBlockEnd).trim();
    // Get text before the code block  
    const beforeCode = response.substring(0, codeBlockStart).trim();
    
    console.log('📝 [parseCodeResponse] After code length:', afterCode.length);
    console.log('📝 [parseCodeResponse] Before code length:', beforeCode.length);
    
    // Determine which part is the explanation
    let explanation: string | null = null;
    if (afterCode.length > 30 && /##|Benefits|Changed|Why|Principles/i.test(afterCode)) {
      explanation = afterCode;
    } else if (beforeCode.length > 30 && /##|Benefits|Changed|Why|Principles/i.test(beforeCode)) {
      explanation = beforeCode;
    } else if (afterCode.length > 50) {
      explanation = afterCode;
    }
    
    return {
      code: mdCodeMatch[1].trim(),
      changes: explanation
    };
  }
  
  // Method 3: Look for ## headers that indicate explanation
  const headerIndex = response.search(/\n##\s/);
  if (headerIndex > 50) {
    console.log('📝 [parseCodeResponse] Found ## header at index:', headerIndex);
    const codePart = response.substring(0, headerIndex).trim();
    const explanationPart = response.substring(headerIndex).trim();
    
    return {
      code: codePart,
      changes: explanationPart
    };
  }
  
  // Method 4: Look for common explanation patterns
  const explanationPatterns = [
    /\n\*\*What Changed\*\*/i,
    /\n\*\*Benefits\*\*/i,
    /\nChanges:/i,
    /\nBenefits:/i,
    /\nWhat changed:/i,
    /\nWhy:/i,
  ];
  
  for (const pattern of explanationPatterns) {
    const match = response.search(pattern);
    if (match > 50) {
      console.log('📝 [parseCodeResponse] Found explanation pattern at:', match);
      return {
        code: response.substring(0, match).trim(),
        changes: response.substring(match).trim()
      };
    }
  }
  
  // Method 5: If response looks like pure code, return as-is
  console.log('📝 [parseCodeResponse] No explanation found, returning raw code');
  return {
    code: response.trim(),
    changes: null
  };
}

/**
 * Syntax highlighter for code display (VS Code dark theme colors)
 */
function highlightSyntax(code: string, language: string = ''): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Language detection
  const lang = language.toLowerCase();
  const isTS = lang.includes('typescript') || lang.includes('tsx') || lang === 'ts';
  const isJS = lang.includes('javascript') || lang.includes('jsx') || lang === 'js' || isTS;
  const isCSS = lang.includes('css') || lang.includes('scss') || lang.includes('less');
  const isHTML = lang.includes('html') || lang.includes('xml') || lang.includes('jsx') || lang.includes('tsx');
  const isPython = lang.includes('python') || lang === 'py';
  const isRust = lang.includes('rust') || lang === 'rs';
  const isJSON = lang.includes('json');
  
  // Token patterns with VS Code dark theme colors
  const patterns: Array<{ pattern: RegExp; className: string }> = [];
  
  // Comments (must be first to avoid conflicts)
  patterns.push({ pattern: /(\/\/[^\n]*)/g, className: 'sh-comment' });  // Single line
  patterns.push({ pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'sh-comment' });  // Multi line
  if (isPython) {
    patterns.push({ pattern: /(#[^\n]*)/g, className: 'sh-comment' });  // Python comments
  }
  
  // Strings (before other patterns)
  patterns.push({ pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'sh-string' });  // Template literals
  patterns.push({ pattern: /("(?:[^"\\]|\\.)*")/g, className: 'sh-string' });  // Double quotes
  patterns.push({ pattern: /('(?:[^'\\]|\\.)*')/g, className: 'sh-string' });  // Single quotes
  
  // Numbers
  patterns.push({ pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, className: 'sh-number' });
  
  // Define keywords based on language
  if (isJS || isTS) {
    // TypeScript/JavaScript keywords
    patterns.push({ 
      pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|delete|typeof|instanceof|in|of|class|extends|super|static|get|set|async|await|yield|import|export|from|default|as|this|null|undefined|true|false|void|enum|interface|type|namespace|module|declare|readonly|public|private|protected|abstract|implements)\b/g, 
      className: 'sh-keyword' 
    });
    // Built-in objects
    patterns.push({
      pattern: /\b(console|window|document|Array|Object|String|Number|Boolean|Function|Promise|Map|Set|WeakMap|WeakSet|Symbol|BigInt|Math|Date|RegExp|Error|JSON|Intl)\b/g,
      className: 'sh-builtin'
    });
    // React specific
    patterns.push({
      pattern: /\b(React|useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|Component|Fragment|Suspense|lazy|memo|forwardRef|createContext|createRef)\b/g,
      className: 'sh-builtin'
    });
  } else if (isPython) {
    patterns.push({
      pattern: /\b(def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|pass|break|continue|and|or|not|in|is|lambda|yield|global|nonlocal|True|False|None|self|async|await)\b/g,
      className: 'sh-keyword'
    });
    patterns.push({
      pattern: /\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|super|property|staticmethod|classmethod)\b/g,
      className: 'sh-builtin'
    });
  } else if (isRust) {
    patterns.push({
      pattern: /\b(fn|let|mut|const|if|else|match|loop|while|for|in|return|break|continue|struct|enum|impl|trait|type|where|pub|mod|use|crate|self|super|as|move|ref|static|unsafe|async|await|dyn|true|false)\b/g,
      className: 'sh-keyword'
    });
    patterns.push({
      pattern: /\b(String|Vec|Option|Result|Box|Rc|Arc|Cell|RefCell|HashMap|HashSet|Some|None|Ok|Err|Self)\b/g,
      className: 'sh-builtin'
    });
  } else if (isCSS) {
    // CSS properties
    patterns.push({
      pattern: /\b(display|position|top|left|right|bottom|width|height|margin|padding|border|background|color|font|text|flex|grid|align|justify|transform|transition|animation|opacity|z-index|overflow|cursor|outline|box-shadow|border-radius)\b/g,
      className: 'sh-property'
    });
    // CSS values
    patterns.push({
      pattern: /\b(none|auto|inherit|initial|unset|block|inline|flex|grid|absolute|relative|fixed|sticky|center|start|end|space-between|space-around|row|column|wrap|nowrap|hidden|visible|scroll|pointer|default)\b/g,
      className: 'sh-keyword'
    });
    // CSS units
    patterns.push({
      pattern: /(\d+)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)\b/g,
      className: 'sh-number'
    });
  }
  
  // Function calls (generic)
  patterns.push({ 
    pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, 
    className: 'sh-function' 
  });
  
  // Types (TypeScript, Rust, etc.)
  if (isTS || isRust) {
    patterns.push({
      pattern: /:\s*([A-Z][a-zA-Z0-9_]*(?:&lt;[^&]*&gt;)?)/g,
      className: 'sh-type'
    });
    patterns.push({
      pattern: /\b(string|number|boolean|any|unknown|never|void|null|undefined|object|symbol|bigint)\b/g,
      className: 'sh-type'
    });
  }
  
  // JSX/HTML tags
  if (isHTML || isJS) {
    patterns.push({
      pattern: /(&lt;\/?)([\w.-]+)/g,
      className: 'sh-tag'
    });
    // JSX attributes
    patterns.push({
      pattern: /\s([a-zA-Z_][\w-]*)(=)/g,
      className: 'sh-attribute'
    });
  }
  
  // Operators
  patterns.push({
    pattern: /([+\-*/%=!<>&|^~?:]+)/g,
    className: 'sh-operator'
  });
  
  // Apply patterns
  // We need to be careful about overlapping matches, so we use a token-based approach
  const tokens: Array<{ start: number; end: number; className: string; text: string }> = [];
  
  // Find all matches
  for (const { pattern, className } of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = match[1] || match[0];
      const start = match.index + (match[0].indexOf(text));
      tokens.push({
        start,
        end: start + text.length,
        className,
        text
      });
    }
  }
  
  // Sort by start position (descending) to replace from end to start
  tokens.sort((a, b) => b.start - a.start);
  
  // Remove overlapping tokens (keep the first one found)
  const usedRanges: Array<{ start: number; end: number }> = [];
  const filteredTokens = tokens.filter(token => {
    const overlaps = usedRanges.some(range => 
      (token.start >= range.start && token.start < range.end) ||
      (token.end > range.start && token.end <= range.end) ||
      (token.start <= range.start && token.end >= range.end)
    );
    if (!overlaps) {
      usedRanges.push({ start: token.start, end: token.end });
      return true;
    }
    return false;
  });
  
  // Apply highlighting
  for (const token of filteredTokens) {
    const before = html.substring(0, token.start);
    const after = html.substring(token.end);
    html = before + `<span class="${token.className}">${token.text}</span>` + after;
  }
  
  return html;
}

/**
 * Inject syntax highlighting CSS
 */
function injectSyntaxHighlightStyles(): void {
  if (document.getElementById('qa-syntax-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'qa-syntax-styles';
  style.textContent = `
    /* VS Code Dark+ Theme Colors */
    .sh-keyword { color: #569cd6; }           /* Blue - keywords */
    .sh-string { color: #ce9178; }            /* Orange - strings */
    .sh-number { color: #b5cea8; }            /* Light green - numbers */
    .sh-comment { color: #6a9955; font-style: italic; }  /* Green - comments */
    .sh-function { color: #dcdcaa; }          /* Yellow - functions */
    .sh-type { color: #4ec9b0; }              /* Teal - types */
    .sh-builtin { color: #4fc1ff; }           /* Cyan - built-in */
    .sh-operator { color: #d4d4d4; }          /* Light gray - operators */
    .sh-property { color: #9cdcfe; }          /* Light blue - properties */
    .sh-tag { color: #569cd6; }               /* Blue - HTML/JSX tags */
    .sh-attribute { color: #9cdcfe; }         /* Light blue - attributes */
    .sh-variable { color: #9cdcfe; }          /* Light blue - variables */
    .sh-constant { color: #4fc1ff; }          /* Cyan - constants */
    .sh-regex { color: #d16969; }             /* Red - regex */
    .sh-punctuation { color: #d4d4d4; }       /* Light gray - punctuation */
    
    /* Code block with line numbers feel */
    .qa-result-code {
      counter-reset: line;
    }
    
    .qa-result-code code {
      display: block;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Apply syntax highlighting to code (VS Code dark theme colors)
 */
function highlightCode(code: string, language: string = ''): string {
  console.log('🎨 [highlightCode] Input language:', language, 'Code length:', code.length);
  
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Detect language if not provided
  const lang = language.toLowerCase() || detectLanguage(code);
  console.log('🎨 [highlightCode] Detected/using language:', lang);
  
  // Apply highlighting based on language
  if (['javascript', 'typescript', 'jsx', 'tsx', 'js', 'ts', 'typescriptreact', 'javascriptreact'].includes(lang)) {
    console.log('🎨 [highlightCode] Using JavaScript highlighter');
    html = highlightJavaScript(html);
  } else if (['css', 'scss', 'less'].includes(lang)) {
    html = highlightCSS(html);
  } else if (['html', 'xml', 'svg'].includes(lang)) {
    html = highlightHTML(html);
  } else if (['python', 'py'].includes(lang)) {
    html = highlightPython(html);
  } else if (['json'].includes(lang)) {
    html = highlightJSON(html);
  } else if (['rust', 'rs'].includes(lang)) {
    html = highlightRust(html);
  } else {
    console.log('🎨 [highlightCode] Using generic highlighter for:', lang);
    html = highlightGeneric(html);
  }
  
  console.log('🎨 [highlightCode] Output contains hl- spans:', html.includes('hl-'));
  return html;
}

/**
 * Detect language from code content
 */
function detectLanguage(code: string): string {
  if (/import\s+.*\s+from\s+['"]|export\s+(default\s+)?(function|class|const)|=>\s*{|React\.|useState|useEffect/.test(code)) {
    return 'typescript';
  }
  if (/def\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+:/.test(code)) {
    return 'python';
  }
  if (/fn\s+\w+|let\s+mut|impl\s+\w+|pub\s+(fn|struct|enum)/.test(code)) {
    return 'rust';
  }
  if (/^\s*[\.\#]?\w+\s*\{[\s\S]*?:[\s\S]*?\}/m.test(code)) {
    return 'css';
  }
  if (/^\s*\{[\s\S]*"[\w]+"[\s\S]*:[\s\S]*\}/m.test(code)) {
    return 'json';
  }
  if (/<\w+[\s>]|<\/\w+>/.test(code)) {
    return 'html';
  }
  return 'javascript';
}

/**
 * Highlight JavaScript/TypeScript code
 */
function highlightJavaScript(code: string): string {
  // Use a placeholder system to avoid double-highlighting
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  
  const savePlaceholder = (text: string, className: string): string => {
    const placeholder = `__PH${placeholderIndex++}__`;
    placeholders.push(`<span class="${className}">${text}</span>`);
    return placeholder;
  };
  
  // Comments (must be first to avoid conflicts)
  code = code.replace(/(\/\/[^\n]*)/g, (_, m) => savePlaceholder(m, 'hl-comment'));
  code = code.replace(/(\/\*[\s\S]*?\*\/)/g, (_, m) => savePlaceholder(m, 'hl-comment'));
  
  // Strings (handle template literals, single, and double quotes)
  code = code.replace(/(`(?:[^`\\]|\\.)*`)/g, (_, m) => savePlaceholder(m, 'hl-string'));
  code = code.replace(/("(?:[^"\\]|\\.)*")/g, (_, m) => savePlaceholder(m, 'hl-string'));
  code = code.replace(/('(?:[^'\\]|\\.)*')/g, (_, m) => savePlaceholder(m, 'hl-string'));
  
  // JSX/TSX tags: <Component, </div>, etc.
  code = code.replace(/(&lt;\/?)([A-Z][\w]*|[a-z][\w.-]*)/g, (_, bracket, tag) => {
    return bracket + savePlaceholder(tag, 'hl-tag');
  });
  
  // JSX attributes: className=, onClick=, etc.
  code = code.replace(/\s([a-zA-Z_][\w-]*)(=)/g, (_, attr, eq) => {
    return ' ' + savePlaceholder(attr, 'hl-attribute') + eq;
  });
  
  // Types and interfaces (TypeScript)
  code = code.replace(/:\s*([A-Z][\w]*(?:&lt;[\w\s,|&lt;&gt;]+&gt;)?)/g, (_, type) => {
    return ': ' + savePlaceholder(type, 'hl-type');
  });
  code = code.replace(/(interface|type)\s+([A-Z][\w]*)/g, (_, kw, name) => {
    return savePlaceholder(kw, 'hl-keyword') + ' ' + savePlaceholder(name, 'hl-type');
  });
  
  // Built-in types
  code = code.replace(/:\s*(string|number|boolean|any|void|null|undefined|never|unknown|object)(?=[\s,;\)\]\}>|&]|$)/g, (_, type) => {
    return ': ' + savePlaceholder(type, 'hl-type');
  });
  
  // Keywords
  const keywords = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'finally', 'throw',
    'class', 'extends', 'new', 'this', 'super', 'static', 'get', 'set',
    'import', 'export', 'from', 'as', 'async', 'await', 'yield',
    'typeof', 'instanceof', 'in', 'of', 'delete', 'void',
    'enum', 'implements', 'private', 'public', 'protected', 'readonly', 'abstract',
    'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
  ];
  
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  code = code.replace(keywordPattern, (_, kw) => savePlaceholder(kw, 'hl-keyword'));
  
  // Built-in objects and React
  const builtins = [
    'console', 'window', 'document', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'Function', 'Promise', 'Map', 'Set', 'Math', 'Date', 'JSON', 'Error',
    'React', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
    'Component', 'Fragment', 'memo', 'forwardRef'
  ];
  
  const builtinPattern = new RegExp(`\\b(${builtins.join('|')})\\b`, 'g');
  code = code.replace(builtinPattern, (_, bi) => {
    if (!code.includes(`__PH`) || !placeholders.some(p => p.includes(bi))) {
      return savePlaceholder(bi, 'hl-builtin');
    }
    return bi;
  });
  
  // Function calls: functionName(
  code = code.replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, (match, fn) => {
    // Skip if already highlighted
    if (match.includes('__PH')) return match;
    return savePlaceholder(fn, 'hl-function');
  });
  
  // Arrow functions: =>
  code = code.replace(/(=&gt;)/g, (_, arrow) => savePlaceholder(arrow, 'hl-operator'));
  
  // Numbers
  code = code.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, (match, num) => {
    if (match.includes('__PH')) return match;
    return savePlaceholder(num, 'hl-number');
  });
  
  // Operators (be careful not to break HTML entities)
  code = code.replace(/([+\-*/%]=?|[=!]=?=?|[<>]=?|&&?|\|\|?|\?{1,2}|:(?!:))/g, (_, op) => {
    if (op.includes('__PH')) return op;
    return savePlaceholder(op, 'hl-operator');
  });
  
  // Restore placeholders
  for (let i = 0; i < placeholders.length; i++) {
    code = code.replace(`__PH${i}__`, placeholders[i]);
  }
  
  return code;
}

/**
 * Highlight CSS code
 */
function highlightCSS(code: string): string {
  // Comments
  code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
  
  // Selectors (class, id, element)
  code = code.replace(/^(\s*)([\.\#]?[\w\-\[\]="'\s,:\*\(\)]+)(\s*\{)/gm, 
    '$1<span class="hl-selector">$2</span>$3');
  
  // Properties
  code = code.replace(/(\s+)([\w\-]+)(\s*:)/g, '$1<span class="hl-property">$2</span>$3');
  
  // Values - colors
  code = code.replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="hl-color">$1</span>');
  
  // Values - strings
  code = code.replace(/("[^"]*"|'[^']*')/g, '<span class="hl-string">$1</span>');
  
  // Values - numbers with units
  code = code.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|deg|s|ms)?\b/g, 
    '<span class="hl-number">$1</span><span class="hl-unit">$2</span>');
  
  // Functions
  code = code.replace(/\b(rgb|rgba|hsl|hsla|url|calc|var|linear-gradient|radial-gradient)(\s*\()/g, 
    '<span class="hl-function">$1</span>$2');
  
  // CSS variables
  code = code.replace(/(--[\w\-]+)/g, '<span class="hl-variable">$1</span>');
  
  // Important
  code = code.replace(/(!important)/g, '<span class="hl-keyword">$1</span>');
  
  return code;
}

/**
 * Highlight HTML/XML code
 */
function highlightHTML(code: string): string {
  // Comments
  code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');
  
  // Doctype
  code = code.replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi, '<span class="hl-keyword">$1</span>');
  
  // Tags
  code = code.replace(/(&lt;\/?)([\w\-]+)/g, '$1<span class="hl-tag">$2</span>');
  
  // Attributes
  code = code.replace(/\s([\w\-]+)(=)/g, ' <span class="hl-attribute">$1</span>$2');
  
  // Attribute values
  code = code.replace(/(=)("[^"]*"|'[^']*')/g, '$1<span class="hl-string">$2</span>');
  
  return code;
}

/**
 * Highlight Python code
 */
function highlightPython(code: string): string {
  // Comments
  code = code.replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>');
  
  // Docstrings and strings
  code = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, '<span class="hl-string">$1</span>');
  code = code.replace(/("[^"\\]*(?:\\.[^"\\]*)*")/g, '<span class="hl-string">$1</span>');
  code = code.replace(/('[^'\\]*(?:\\.[^'\\]*)*')/g, '<span class="hl-string">$1</span>');
  
  // Keywords
  const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 
    'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'raise', 'pass', 'break',
    'continue', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None',
    'async', 'await', 'global', 'nonlocal', 'assert', 'del'];
  
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  code = code.replace(keywordPattern, '<span class="hl-keyword">$1</span>');
  
  // Function definitions and calls
  code = code.replace(/\b([\w]+)(\s*\()/g, '<span class="hl-function">$1</span>$2');
  
  // Decorators
  code = code.replace(/(@[\w\.]+)/g, '<span class="hl-decorator">$1</span>');
  
  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  
  return code;
}

/**
 * Highlight JSON code
 */
function highlightJSON(code: string): string {
  // Keys
  code = code.replace(/("[\w\-]+")(\s*:)/g, '<span class="hl-property">$1</span>$2');
  
  // String values
  code = code.replace(/(:\s*)("(?:[^"\\]|\\.)*")/g, '$1<span class="hl-string">$2</span>');
  
  // Numbers
  code = code.replace(/(:\s*)(\d+\.?\d*)/g, '$1<span class="hl-number">$2</span>');
  
  // Booleans and null
  code = code.replace(/\b(true|false|null)\b/g, '<span class="hl-keyword">$1</span>');
  
  return code;
}

/**
 * Highlight Rust code
 */
function highlightRust(code: string): string {
  // Comments
  code = code.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
  code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
  
  // Strings
  code = code.replace(/("[^"\\]*(?:\\.[^"\\]*)*")/g, '<span class="hl-string">$1</span>');
  
  // Keywords
  const keywords = ['fn', 'let', 'mut', 'const', 'static', 'if', 'else', 'match', 'loop', 
    'while', 'for', 'in', 'return', 'break', 'continue', 'struct', 'enum', 'impl', 'trait',
    'pub', 'mod', 'use', 'crate', 'self', 'super', 'where', 'async', 'await', 'move',
    'type', 'as', 'ref', 'dyn', 'unsafe', 'extern', 'true', 'false'];
  
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  code = code.replace(keywordPattern, '<span class="hl-keyword">$1</span>');
  
  // Types
  code = code.replace(/\b([A-Z][\w]*)\b/g, '<span class="hl-type">$1</span>');
  
  // Functions
  code = code.replace(/\b([\w]+)(\s*\()/g, '<span class="hl-function">$1</span>$2');
  
  // Macros
  code = code.replace(/\b([\w]+)!/g, '<span class="hl-macro">$1</span>!');
  
  // Lifetimes
  code = code.replace(/('[\w]+)/g, '<span class="hl-lifetime">$1</span>');
  
  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  
  return code;
}

/**
 * Generic code highlighting
 */
function highlightGeneric(code: string): string {
  // Comments
  code = code.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
  code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
  code = code.replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>');
  
  // Strings
  code = code.replace(/("[^"\\]*(?:\\.[^"\\]*)*")/g, '<span class="hl-string">$1</span>');
  code = code.replace(/('[^'\\]*(?:\\.[^'\\]*)*')/g, '<span class="hl-string">$1</span>');
  
  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  
  // Common keywords
  const keywords = ['if', 'else', 'for', 'while', 'return', 'function', 'class', 'def', 
    'var', 'let', 'const', 'import', 'export', 'from', 'true', 'false', 'null', 'none'];
  const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  code = code.replace(keywordPattern, '<span class="hl-keyword">$1</span>');
  
  return code;
}

/**
 * Format explanation text with colored sections
 */
function formatExplanation(text: string, accentColor: string): string {
  let html = text;
  
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Format code blocks first (before other formatting)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<div class="qa-code-block"><pre><code>${code.trim()}</code></pre></div>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="qa-inline-code">$1</code>');
  
  // H2 headers (## HEADER)
  html = html.replace(/^## (.+)$/gm, `<h2 class="qa-section-header" style="border-left-color: ${accentColor}">$1</h2>`);
  
  // H3 headers (### HEADER)
  html = html.replace(/^### (.+)$/gm, '<h3 class="qa-subsection-header">$1</h3>');
  
  // Bold text (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="qa-bold">$1</strong>');
  
  // Checkboxes
  html = html.replace(/- \[ \] (.+)/g, '<div class="qa-checkbox"><span class="qa-check-box">☐</span> $1</div>');
  html = html.replace(/- \[x\] (.+)/gi, '<div class="qa-checkbox checked"><span class="qa-check-box">☑</span> $1</div>');
  
  // Bullet points (- item)
  html = html.replace(/^- (.+)$/gm, '<div class="qa-bullet">• $1</div>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="qa-paragraph">');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph
  html = `<p class="qa-paragraph">${html}</p>`;
  
  // Clean up empty paragraphs
  html = html.replace(/<p class="qa-paragraph"><\/p>/g, '');
  html = html.replace(/<p class="qa-paragraph"><br>/g, '<p class="qa-paragraph">');
  
  return html;
}

/**
 * Process quick action via AI backend (NOT through chat)
 */
async function processQuickAction(
  prompt: string, 
  language: string,
  callback: (code: string | null, error: string | null) => void,
  keepMarkdown: boolean = false
): Promise<void> {
  console.log('🚀 [QuickAction] Calling Operator X02 API...');
  
// Always use Operator X02 API for Quick Actions
  const provider = 'operator_x02';
  const apiKey = 'PROXY';
  const apiBaseUrl = 'PROXY';
  const model = 'x02-chat';
  
  console.log(`📡 [QuickAction] Using Operator X02: ${model}`);

  // ✅ PROXY PATH — Route through Supabase proxy
  const smartCall = (window as any).smartAICall;
  if (apiKey === 'PROXY' && smartCall) {
    try {
      console.log(`🔒 [QuickAction] Using proxy for ${provider}`);
      const response = await smartCall({
        provider,
        apiKey: 'PROXY',
        model,
        message: prompt,
        maxTokens: 4096,
        temperature: 0.7
      });
      let code = response;
      if (!keepMarkdown) {
        const codeBlockMatch = code.match(/```(?:\w+)?\n([\s\S]*?)```/);
        if (codeBlockMatch) code = codeBlockMatch[1];
      }
      callback(code.trim(), null);
      return;
    } catch (error: any) {
      console.error('❌ [QuickAction] Proxy error:', error);
      callback(null, `Proxy error: ${error.message}`);
      return;
    }
  }
  
  // Try Tauri invoke first (direct backend call)
  const invoke = (window as any).__TAURI__?.invoke || (window as any).invoke;
  
  if (typeof invoke === 'function') {
    try {
      console.log(`📡 [QuickAction] Using Tauri invoke: ${provider} / ${model}`);
      
      const response = await invoke('send_ai_message', {
        message: prompt,
        provider: provider,
        model: model,
        apiKey: apiKey,
        conversationHistory: []
      });
      
      if (response && typeof response === 'string') {
        let code = response;
        // Only extract from code blocks if NOT keeping markdown (for code actions)
        if (!keepMarkdown) {
          const codeBlockMatch = code.match(/```(?:\w+)?\n([\s\S]*?)```/);
          if (codeBlockMatch) {
            code = codeBlockMatch[1];
          }
        }
        callback(code.trim(), null);
        return;
      } else if (response?.content) {
        callback(response.content.trim(), null);
        return;
      }
    } catch (error: any) {
      console.error('❌ [QuickAction] Tauri error:', error);
      // Fall through to fetch
    }
  }
  
  // Fallback: Direct API fetch to Operator X02
  try {
    console.log(`📡 [QuickAction] Using direct Operator X02 API fetch`);
    
    // Always use Operator X02 (DeepSeek) endpoint
    const endpoint = `${apiBaseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const body = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    };
    
    console.log(`📡 [QuickAction] Fetching: ${endpoint}`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      callback(null, `Operator X02 API Error: ${response.status} - ${errorText.substring(0, 200)}`);
      return;
    }
    
    const data = await response.json();
    let code = data.choices?.[0]?.message?.content || '';
    
    // Only extract from code blocks if NOT keeping markdown (for code actions)
    if (!keepMarkdown) {
      const codeBlockMatch = code.match(/```(?:\w+)?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        code = codeBlockMatch[1];
      }
    }
    
    callback(code.trim(), null);
    
  } catch (error: any) {
    console.error('❌ [QuickAction] Operator X02 API error:', error);
    callback(null, error?.message || 'Failed to connect to AI service');
  }
}

/**
 * Inject Quick Action Dialog Styles
 */
function injectQuickActionDialogStyles(): void {
  if (document.getElementById('qa-dialog-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'qa-dialog-styles';
  style.textContent = `
    /* Non-modal container - no overlay, allows background interaction */
    .qa-result-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10002;
    }
    
    .qa-result-panel {
      position: fixed;
      pointer-events: auto;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      width: 650px;
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      animation: qaSlideUp 0.2s ease;
      resize: both;
      overflow: hidden;
      font-family: 'Consolas', 'Monaco', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
    }
    
    @keyframes qaSlideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .qa-result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #3c3c3c;
      background: #252526;
      cursor: grab;
      user-select: none;
    }
    
    .qa-result-header:active {
      cursor: grabbing;
    }
    
    .qa-result-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .qa-drag-handle {
      color: #5a5a5a;
      font-size: 10px;
      letter-spacing: 1px;
    }
    
    .qa-result-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .qa-result-title {
      font-size: 12px;
      font-weight: 500;
      color: #cccccc;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    
    .qa-result-file {
      font-size: 11px;
      color: #808080;
      background: #2d2d2d;
      padding: 2px 8px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-powered-by {
      font-size: 10px;
      color: #4ec9b0;
      background: rgba(78, 201, 176, 0.1);
      padding: 2px 8px;
      border-radius: 3px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      border: 1px solid rgba(78, 201, 176, 0.3);
      margin-left: auto;
    }
    
    .qa-result-close {
      background: transparent;
      border: none;
      color: #808080;
      font-size: 14px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      transition: all 0.15s;
      line-height: 1;
    }
    
    .qa-result-close:hover {
      background: #3c3c3c;
      color: #ffffff;
    }
    
    .qa-result-body {
      flex: 1;
      overflow: auto;
      padding: 12px;
      min-height: 180px;
      max-height: 450px;
      background: #1e1e1e;
    }
    
    .qa-result-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 180px;
      gap: 12px;
    }
    
    .qa-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid #3c3c3c;
      border-top-color: #0e639c;
      border-radius: 50%;
      animation: qaSpin 0.8s linear infinite;
    }
    
    @keyframes qaSpin {
      to { transform: rotate(360deg); }
    }
    
    .qa-loading-text {
      color: #808080;
      font-size: 12px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-result-content {
      background: #1e1e1e;
    }
    
    .qa-result-code {
      margin: 0;
      padding: 12px;
      overflow: auto;
      max-height: 400px;
      font-family: 'Consolas', 'Monaco', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;
      white-space: pre;
      tab-size: 2;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
    }
    
    .qa-result-code code {
      font-family: inherit;
      color: #d4d4d4;
    }
    
    .qa-result-error {
      background: #5a1d1d;
      border: 1px solid #f14c4c;
      border-radius: 4px;
      padding: 12px;
      text-align: left;
    }
    
    .qa-error-msg {
      color: #f14c4c;
      font-size: 12px;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-result-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-top: 1px solid #3c3c3c;
      background: #252526;
    }
    
    .qa-result-stats {
      font-size: 11px;
      color: #808080;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-result-actions {
      display: flex;
      gap: 8px;
    }
    
    .qa-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border: none;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    
    .qa-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .qa-btn-secondary {
      background: #3c3c3c;
      color: #cccccc;
      border: 1px solid #3c3c3c;
    }
    
    .qa-btn-secondary:hover:not(:disabled) {
      background: #4c4c4c;
    }
    
    .qa-btn-primary {
      background: #0e639c;
      color: #ffffff;
    }
    
    .qa-btn-primary:hover:not(:disabled) {
      background: #1177bb;
    }
    
    .qa-btn-icon {
      font-size: 11px;
    }
    
    /* ============================================
       EXPLAIN MODE - IDE Style for explanations
       ============================================ */
    .qa-result-panel.qa-explain-mode {
      width: 720px;
    }
    
    .qa-explain-content {
      padding: 4px;
      line-height: 1.6;
      color: #d4d4d4;
      font-size: 13px;
      font-family: 'Consolas', 'Monaco', 'Cascadia Code', 'Fira Code', monospace;
    }
    
    /* Section Headers (##) - IDE style comment block */
    .qa-section-header {
      font-size: 13px;
      font-weight: 600;
      color: #4ec9b0;
      margin: 16px 0 10px 0;
      padding: 6px 10px;
      background: #252526;
      border-radius: 3px;
      border-left: 3px solid #4ec9b0;
      font-family: 'Consolas', 'Monaco', monospace;
      letter-spacing: 0.5px;
    }
    
    .qa-section-header:first-child {
      margin-top: 0;
    }
    
    /* Subsection Headers (###) - Function name style */
    .qa-subsection-header {
      font-size: 13px;
      font-weight: 600;
      color: #dcdcaa;
      margin: 14px 0 6px 0;
      padding-left: 8px;
      border-left: 2px solid #dcdcaa;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    /* Bold text - Keyword style */
    .qa-bold {
      color: #569cd6;
      font-weight: 600;
    }
    
    /* Bullet points - Comment style */
    .qa-bullet {
      padding: 3px 0 3px 16px;
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-bullet::before {
      content: '';
    }
    
    /* Checkboxes */
    .qa-checkbox {
      padding: 3px 0 3px 8px;
      color: #808080;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-checkbox.checked {
      color: #4ec9b0;
    }
    
    .qa-check-box {
      margin-right: 6px;
      color: #808080;
    }
    
    .qa-checkbox.checked .qa-check-box {
      color: #4ec9b0;
    }
    
    /* Inline code - String literal style */
    .qa-inline-code {
      background: #2d2d2d;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #ce9178;
      border: 1px solid #3c3c3c;
    }
    
    /* Code blocks - Editor style */
    .qa-code-block {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      margin: 10px 0;
      overflow: hidden;
    }
    
    .qa-code-block pre {
      margin: 0;
      padding: 10px 12px;
      overflow-x: auto;
      background: #1e1e1e;
    }
    
    .qa-code-block code {
      font-family: 'Consolas', 'Monaco', 'Cascadia Code', 'Fira Code', monospace;
      font-size: 12px;
      color: #d4d4d4;
      line-height: 1.5;
    }
    
    /* Paragraphs */
    .qa-paragraph {
      margin: 6px 0;
      color: #d4d4d4;
    }
    
    /* Line numbers style indicator */
    .qa-explain-content .qa-bullet {
      position: relative;
    }
    
    /* Scrollbar styling for IDE look */
    .qa-result-body::-webkit-scrollbar,
    .qa-result-code::-webkit-scrollbar,
    .qa-explain-content::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    .qa-result-body::-webkit-scrollbar-track,
    .qa-result-code::-webkit-scrollbar-track,
    .qa-explain-content::-webkit-scrollbar-track {
      background: #1e1e1e;
    }
    
    .qa-result-body::-webkit-scrollbar-thumb,
    .qa-result-code::-webkit-scrollbar-thumb,
    .qa-explain-content::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 5px;
    }
    
    .qa-result-body::-webkit-scrollbar-thumb:hover,
    .qa-result-code::-webkit-scrollbar-thumb:hover,
    .qa-explain-content::-webkit-scrollbar-thumb:hover {
      background: #4f4f4f;
    }
    
    /* ============================================
       CODE MODE - With collapsible details panel
       ============================================ */
    .qa-result-panel.qa-code-mode {
      width: 680px;
    }
    
    .qa-result-panel.qa-code-mode .qa-result-body {
      max-height: 500px;
    }
    
    .qa-result-panel.qa-code-mode .qa-result-code {
      max-height: 300px;
    }
    
    /* Details Button */
    .qa-btn-details {
      background: #2d2d2d;
      color: #4ec9b0;
      border: 1px solid #3c3c3c;
      gap: 4px;
    }
    
    .qa-btn-details:hover {
      background: #383838;
      border-color: #4ec9b0;
    }
    
    /* Details Panel - Collapsible */
    .qa-details-panel {
      margin-top: 12px;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
      overflow: hidden;
      animation: qaDetailsSlide 0.2s ease;
    }
    
    @keyframes qaDetailsSlide {
      from { 
        opacity: 0;
        max-height: 0;
      }
      to { 
        opacity: 1;
        max-height: 300px;
      }
    }
    
    .qa-details-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #2d2d2d;
      border-bottom: 1px solid #3c3c3c;
      font-size: 12px;
      font-weight: 500;
      color: #4ec9b0;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    
    .qa-details-icon {
      font-size: 14px;
    }
    
    .qa-details-collapse {
      margin-left: auto;
      background: transparent;
      border: none;
      color: #808080;
      font-size: 10px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      transition: all 0.15s;
    }
    
    .qa-details-collapse:hover {
      background: #3c3c3c;
      color: #fff;
    }
    
    .qa-details-content {
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #d4d4d4;
    }
    
    .qa-details-content .qa-section-header {
      font-size: 12px;
      padding: 4px 8px;
      margin: 10px 0 6px 0;
    }
    
    .qa-details-content .qa-section-header:first-child {
      margin-top: 0;
    }
    
    .qa-details-content .qa-subsection-header {
      font-size: 11px;
      margin: 8px 0 4px 0;
    }
    
    .qa-details-content .qa-bullet {
      font-size: 12px;
      padding: 2px 0 2px 12px;
    }
    
    .qa-details-content .qa-paragraph {
      margin: 4px 0;
    }
    
    /* Details content scrollbar */
    .qa-details-content::-webkit-scrollbar {
      width: 8px;
    }
    
    .qa-details-content::-webkit-scrollbar-track {
      background: #252526;
    }
    
    .qa-details-content::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 4px;
    }
    
    .qa-details-content::-webkit-scrollbar-thumb:hover {
      background: #4f4f4f;
    }
    
    /* ============================================
       SYNTAX HIGHLIGHTING - VS Code Dark+ Theme
       ============================================ */
    
    /* Keywords: const, let, if, else, return, etc. */
    .hl-keyword {
      color: #569cd6;
      font-weight: normal;
    }
    
    /* Strings: "text", 'text' */
    .hl-string {
      color: #ce9178;
    }
    
    /* Template literals: \`text\` */
    .hl-template {
      color: #ce9178;
    }
    
    /* Numbers: 123, 45.67 */
    .hl-number {
      color: #b5cea8;
    }
    
    /* Comments: // comment, /* comment */ 
    .hl-comment {
      color: #6a9955;
      font-style: italic;
    }
    
    /* Functions: functionName() */
    .hl-function {
      color: #dcdcaa;
    }
    
    /* Built-in objects: console, window, Array, React, useState */
    .hl-builtin {
      color: #4fc1ff;
    }
    
    /* Types: String, Number, Interface, Props */
    .hl-type {
      color: #4ec9b0;
    }
    
    /* JSX/HTML Tags: div, span, Component */
    .hl-tag {
      color: #569cd6;
    }
    
    /* HTML/JSX Attributes: className, onClick */
    .hl-attribute {
      color: #9cdcfe;
    }
    
    /* Operators: =, +, -, *, /, =>, etc. */
    .hl-operator {
      color: #d4d4d4;
    }
    
    /* CSS Selectors: .class, #id */
    .hl-selector {
      color: #d7ba7d;
    }
    
    /* CSS Properties: color, display, etc. */
    .hl-property {
      color: #9cdcfe;
    }
    
    /* CSS Units: px, em, rem */
    .hl-unit {
      color: #b5cea8;
    }
    
    /* CSS Colors: #fff, #000 */
    .hl-color {
      color: #ce9178;
    }
    
    /* CSS Variables: --var-name */
    .hl-variable {
      color: #9cdcfe;
    }
    
    /* Python Decorators: @decorator */
    .hl-decorator {
      color: #dcdcaa;
    }
    
    /* Rust Macros: macro! */
    .hl-macro {
      color: #dcdcaa;
    }
    
    /* Rust Lifetimes: 'a, 'static */
    .hl-lifetime {
      color: #569cd6;
    }
    
    /* Line numbers (optional) */
    .qa-result-code {
      counter-reset: line;
    }
    
    .qa-result-code code {
      display: block;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show quick action toast notification
 */
function showQuickActionToast(message: string, color: string): void {
  const existing = document.querySelector('.qa-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'qa-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    border: 1px solid ${color}40;
    border-left: 3px solid ${color};
    padding: 12px 20px;
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    z-index: 10003;
    animation: qaToastIn 0.3s ease;
  `;
  toast.textContent = message;
  
  if (!document.getElementById('qa-toast-anim')) {
    const style = document.createElement('style');
    style.id = 'qa-toast-anim';
    style.textContent = `
      @keyframes qaToastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes qaToastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'qaToastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show quick action notification (kept for compatibility)
 */
function showQuickActionNotification(action: QuickAction): void {
  const existing = document.querySelector('.quick-action-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'quick-action-notification';
  notification.innerHTML = `
    <div class="quick-action-notification-content">
      <span class="quick-action-notification-icon" style="background: ${action.color}20; color: ${action.color}">${action.icon}</span>
      <span class="quick-action-notification-text">${action.label} ready</span>
    </div>
  `;
  
  if (!document.getElementById('quick-action-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'quick-action-notification-styles';
    style.textContent = `
      .quick-action-notification {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        animation: quickActionNotifIn 0.3s ease-out;
      }
      
      @keyframes quickActionNotifIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes quickActionNotifOut {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-10px);
        }
      }
      
      .quick-action-notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }
      
      .quick-action-notification-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .quick-action-notification-text {
        font-size: 13px;
        color: #e0e0e0;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'quickActionNotifOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

export function createToolButtonFromConfig(config: ToolButtonConfig): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = config.id;
  btn.className = `tool-button btn-${config.id.replace(/-btn$/, '').replace(/-toggle$/, '')}`;
  btn.innerHTML = PROFESSIONAL_ICONS[config.icon];  // Start with OFF icon
  btn.title = config.tooltip;
  btn.style.color = config.color;  // Start with OFF color
  
  // Store config reference for icon swapping
  (btn as any).__toolConfig = config;
  
  if (config.group === 'mode') {
    if (config.id === 'autonomous-mode-toggle') btn.classList.add('btn-auto-mode');
    if (config.id === 'ai-search-btn') btn.classList.add('btn-ai-search');
  } else if (config.group === 'ai') {
    if (config.id === 'terminal-ctx-btn') btn.classList.add('btn-terminal-ctx');
    if (config.id === 'analyze-code-btn') {
      btn.classList.add('btn-analyze');
      btn.style.color = COLORS.analyze;
    }
    if (config.id === 'debug-code-btn') {
      btn.classList.add('btn-debug');
      btn.style.color = COLORS.debug;
    }
  } else if (config.id === 'fix-errors-btn') {
    btn.classList.add('btn-fix-errors');
    btn.style.color = COLORS.fixErrors;
  } else if (config.id === 'camera-toggle-btn') {
    btn.classList.add('btn-camera');
  }
  return btn;
}

export function restructureInputAreaGrouped(): void {
  const inputArea = document.querySelector('.chat-input-area') as HTMLElement;
  const inputBox = document.querySelector('.chat-input-box') as HTMLElement;

  if (!inputArea || !inputBox) {
    console.warn('⚠️ Input area or box not found');
    return;
  }

  if (inputBox.classList.contains('modern-grouped-restructured') || 
      inputBox.classList.contains('modern-restructured')) {
    return;
  }

  console.log('🔄 Restructuring to grouped toolbar layout...');

  const textarea = inputBox.querySelector('#ai-assistant-input, textarea') as HTMLTextAreaElement;
  const sendBtn = inputBox.querySelector('#send-btn') as HTMLButtonElement;
  const existingButtons = Array.from(inputBox.querySelectorAll('button:not(#send-btn)')) as HTMLElement[];

  if (!textarea) {
    console.warn('⚠️ Textarea not found');
    return;
  }

  const originalSendHandler = sendBtn?.onclick;
  
  // Note: We no longer need to store old handlers since all buttons 
  // check buttonHandlerRegistry at click time for late-registered handlers

  inputBox.innerHTML = '';
  inputBox.classList.add('modern-grouped-restructured', 'modern-restructured');

  const textareaWrapper = document.createElement('div');
  textareaWrapper.className = 'modern-textarea-wrapper';
  textarea.className = 'modern-textarea';
  textarea.placeholder = 'Ask me anything....';
  textareaWrapper.appendChild(textarea);

  const toolbar = document.createElement('div');
  toolbar.className = 'modern-bottom-toolbar';

  const toolsContainer = document.createElement('div');
  toolsContainer.className = 'tool-buttons-group modern-tools-left';

  // 1. MODE GROUP (Auto Mode + Project Search) - 2 buttons only
  const modeGroup = document.createElement('div');
  modeGroup.className = 'toolbar-group mode-group';
  
  const autoConfig = TOOLBAR_BUTTONS.find(c => c.id === 'autonomous-mode-toggle')!;
  const autoBtn = createToolButtonFromConfig(autoConfig);
  
  // Auto mode button - check registry at click time
  autoBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRippleEffect(autoBtn); // Prevent ripple animation
    console.log('🤖 Auto Mode button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('autonomous-mode-toggle');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(autoBtn);
      removeRippleEffect(autoBtn);
      // Update placeholder even when using registered handler
      setTimeout(scheduleUpdatePlaceholder, 150);
      return;
    }
    
    // Toggle state directly (don't call toggleAutoApply - it double-toggles!)
    const isActive = autoBtn.classList.contains('active') || 
                     autoBtn.classList.contains('auto-active');
    const newState = !isActive;
    
    // Update button UI
    autoBtn.classList.toggle('active', newState);
    autoBtn.classList.toggle('auto-active', newState);
    updateButtonIcon('autonomous-mode-toggle', newState);
    autoBtn.title = newState ? 'Auto Mode: ON' : 'Auto Mode: OFF';
    
    // Update storage and global state DIRECTLY
    localStorage.setItem('autonomousMode', String(newState));
    (window as any).autoApplyEnabled = newState;
    
    // Sync with autonomousCoding.ts internal state (if function exists)
    if (typeof (window as any).setAutoApplyState === 'function') {
      (window as any).setAutoApplyState(newState);
    }
    
    // ✅ When Auto Mode turns ON, also turn ON Project Search
    // ❌ REMOVED: Auto-enable of Project Search with Auto Mode
    // Users reported this was unwanted behavior
    
    // ✅ Trigger file explorer panel animation
    if ((window as any).autoModePanel) {
      if (newState) {
        (window as any).autoModePanel.enable();
      } else {
        (window as any).autoModePanel.disable();
      }
    }
    
    // Show notification toast
    showAutoModeNotification(newState);
    
    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('autoModeChanged', { detail: { enabled: newState } }));
    
    console.log(`  ✅ Auto mode ${newState ? 'ENABLED' : 'DISABLED'}`);
    removeRippleEffect(autoBtn);
  };
  
  // ✅ Always start OFF on page load - clear any saved state
  localStorage.removeItem('autonomousMode');
  (window as any).autoApplyEnabled = false;
  autoBtn.classList.remove('active', 'auto-active');
  autoBtn.title = 'Auto Mode: OFF';
  
  modeGroup.appendChild(autoBtn);
  
  const searchConfig = TOOLBAR_BUTTONS.find(c => c.id === 'ai-search-btn')!;
  const searchBtn = createToolButtonFromConfig(searchConfig);
  
  // AI search button - check registry at click time
  searchBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRippleEffect(searchBtn); // Prevent ripple animation
    console.log('🔍 Project Search button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('ai-search-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(searchBtn);
      removeRippleEffect(searchBtn);
      // Update placeholder even when using registered handler
      setTimeout(scheduleUpdatePlaceholder, 150);
      return;
    }
    
    // Toggle state directly (same pattern as Auto Mode and Terminal)
    const isActive = searchBtn.classList.contains('active') || 
                     searchBtn.classList.contains('ai-active');
    const newState = !isActive;
    
    searchBtn.classList.toggle('active', newState);
    searchBtn.classList.toggle('ai-active', newState);
    updateButtonIcon('ai-search-btn', newState);
    searchBtn.title = newState ? 'Project Search: ON' : 'Project Search: OFF';
    searchBtn.style.color = newState ? COLORS.aiSearch : COLORS.default;
    
    // Update localStorage and global state
    localStorage.setItem('aiFileExplorerEnabled', String(newState));
    (window as any).aiFileExplorerEnabled = newState;
    (window as any).aiSearchEnabled = newState;
    
    // Call global function if available (non-blocking)
    if (typeof (window as any).toggleAISearch === 'function') {
      console.log('  → Calling window.toggleAISearch()');
      // Don't call toggleAISearch as we already toggled - it would double toggle
    }
    
    // ✅ Show notification toast
    showProjectSearchNotification(newState);
    
    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('projectSearchChanged', { detail: { enabled: newState } }));
    
    console.log(`  ✅ Project Search ${newState ? 'ENABLED' : 'DISABLED'}`);
    removeRippleEffect(searchBtn);
  };
  
  // ✅ Always start OFF on page load - clear any saved state
  localStorage.removeItem('aiFileExplorerEnabled');
  (window as any).aiFileExplorerEnabled = false;
  (window as any).aiSearchEnabled = false;
  searchBtn.classList.remove('active', 'ai-active');
  searchBtn.title = 'Project Search: OFF';
  searchBtn.style.color = COLORS.default;
  
  modeGroup.appendChild(searchBtn);
  
  toolsContainer.appendChild(modeGroup);
  toolsContainer.appendChild(createToolbarDivider());

  // 2. AI GROUP (Terminal + Analyze + Debug)
  const aiGroup = document.createElement('div');
  aiGroup.className = 'toolbar-group ai-group';

  const termConfig = TOOLBAR_BUTTONS.find(c => c.id === 'terminal-ctx-btn')!;
  const termBtn = createToolButtonFromConfig(termConfig);
  
  // Terminal context button - check registry at click time
  termBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRippleEffect(termBtn); // Prevent ripple animation
    console.log('📟 Terminal Context button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('terminal-ctx-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(termBtn);
      removeRippleEffect(termBtn);
      // Update placeholder even when using registered handler
      setTimeout(scheduleUpdatePlaceholder, 150);
      return;
    }
    
    // Toggle state directly (same pattern as Auto Mode and Project Search)
    const isActive = termBtn.classList.contains('active') || 
                     termBtn.classList.contains('terminal-active');
    const newState = !isActive;
    
    termBtn.classList.toggle('active', newState);
    termBtn.classList.toggle('terminal-active', newState);
    updateButtonIcon('terminal-ctx-btn', newState);
    termBtn.title = newState ? 'Terminal Context: ON' : 'Terminal Context: OFF';
    
    // ✅ Force clear pseudo-elements to prevent background highlight
    forceClearPseudoElements('terminal-ctx-btn');
    
    // Update localStorage and global state
    localStorage.setItem('terminalContextEnabled', String(newState));
    (window as any).terminalContextEnabled = newState;
    
    // Update terminal panel highlight
    toggleTerminalContextPanelHighlight(newState);
    
    // Call global function if available (non-blocking)
    if (typeof (window as any).toggleTerminalContext === 'function') {
      console.log('  → Calling window.toggleTerminalContext()');
      (window as any).toggleTerminalContext();
    }
    
    // Dispatch event for terminal context module
    window.dispatchEvent(new CustomEvent('terminal-context-toggle', { detail: { active: newState } }));
    window.dispatchEvent(new CustomEvent('terminalContextChanged', { detail: { enabled: newState } }));
    console.log(`  ✅ Terminal context ${newState ? 'enabled' : 'disabled'}`);
    
    // Update placeholder
    scheduleUpdatePlaceholder();
    
    removeRippleEffect(termBtn);
  };
  
  // Restore saved state
  if (localStorage.getItem('terminalContextEnabled') === 'true') {
    termBtn.classList.add('active', 'terminal-active');
    termBtn.title = 'Terminal Context: ON';
    setTimeout(() => {
      updateButtonIcon('terminal-ctx-btn', true);
      forceClearPseudoElements('terminal-ctx-btn');
      toggleTerminalContextPanelHighlight(true);  // Restore panel highlight
    }, 100);  // Update color on restore
  }
  aiGroup.appendChild(termBtn);

  const analyzeConfig = TOOLBAR_BUTTONS.find(c => c.id === 'analyze-code-btn')!;
  const analyzeBtn = createToolButtonFromConfig(analyzeConfig);
  
  // Analyze button - check registry at click time
  analyzeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔍 Analyze button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('analyze-code-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(analyzeBtn);
      return;
    }
    
    // Try the specific exposed function first
    if (typeof (window as any).handleAnalyzeCode === 'function') {
      console.log('  → Calling window.handleAnalyzeCode()');
      (window as any).handleAnalyzeCode();
      return;
    }
    
    // Fallback to other possible function names
    if (typeof (window as any).analyzeCode === 'function') {
      console.log('  → Calling window.analyzeCode()');
      (window as any).analyzeCode();
      return;
    }
    if (typeof (window as any).triggerAnalyze === 'function') {
      console.log('  → Calling window.triggerAnalyze()');
      (window as any).triggerAnalyze();
      return;
    }
    
    console.warn('  ⚠️ No analyze handler found!');
  };
  aiGroup.appendChild(analyzeBtn);

  const debugConfig = TOOLBAR_BUTTONS.find(c => c.id === 'debug-code-btn')!;
  const debugBtn = createToolButtonFromConfig(debugConfig);
  
  // Debug button - check registry at click time
  debugBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🐛 Debug button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('debug-code-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(debugBtn);
      return;
    }
    
    // Try the specific exposed function first
    if (typeof (window as any).handleDebugCode === 'function') {
      console.log('  → Calling window.handleDebugCode()');
      (window as any).handleDebugCode();
      return;
    }
    
    // Fallback to other possible function names
    if (typeof (window as any).debugCode === 'function') {
      console.log('  → Calling window.debugCode()');
      (window as any).debugCode();
      return;
    }
    if (typeof (window as any).triggerDebug === 'function') {
      console.log('  → Calling window.triggerDebug()');
      (window as any).triggerDebug();
      return;
    }
    
    console.warn('  ⚠️ No debug handler found!');
  };
  aiGroup.appendChild(debugBtn);

  toolsContainer.appendChild(aiGroup);
  toolsContainer.appendChild(createToolbarDivider());

  // 3. ATTACH GROUP
  const attachGroup = document.createElement('div');
  attachGroup.className = 'toolbar-group attach-group';

  const cameraConfig = TOOLBAR_BUTTONS.find(c => c.id === 'camera-toggle-btn')!;
  const cameraBtn = createToolButtonFromConfig(cameraConfig);
  
  // Camera button - check registry at click time
  cameraBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Prevent other handlers from firing!
    removeRippleEffect(cameraBtn);
    console.log('📷 Camera button clicked (professionalIcons handler)');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('camera-toggle-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(cameraBtn);
      removeRippleEffect(cameraBtn);
      return;
    }
    
    // Get current state BEFORE toggling
    const existingPanel = document.querySelector('.camera-panel, #camera-panel, .dev-camera-panel');
    const wasVisible = existingPanel && 
                       window.getComputedStyle(existingPanel).display !== 'none';
    const newState = !wasVisible;
    
    console.log(`  📷 Current state: ${wasVisible ? 'OPEN' : 'CLOSED'}, toggling to: ${newState ? 'OPEN' : 'CLOSED'}`);
    
    // ✅ ONLY use window.toggleCameraPanel - no fallback events
    // Fallback events can cause double-toggle if caught by other listeners
    if (typeof (window as any).toggleCameraPanel === 'function') {
      console.log('  → Calling window.toggleCameraPanel()');
      (window as any).toggleCameraPanel();
    } else {
      console.error('  ❌ window.toggleCameraPanel not found! Make sure main.ts exposes it.');
      // Show user-friendly notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; bottom: 80px; right: 20px; z-index: 99999; 
             padding: 12px 16px; background: #1e1e1e; border: 1px solid #f85149; 
             border-radius: 8px; color: #f85149; font-size: 13px;">
          ⚠️ Camera function not ready. Please refresh the page.
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      return;
    }
    
    // Sync button state after toggle completes
    setTimeout(() => {
      const panel = document.querySelector('.camera-panel, #camera-panel, .dev-camera-panel') as HTMLElement;
      let isVisible = false;
      
      if (panel) {
        const style = window.getComputedStyle(panel);
        isVisible = style.display !== 'none' && 
                    style.visibility !== 'hidden' && 
                    panel.offsetParent !== null;
      }
      
      console.log(`  📷 Panel found: ${!!panel}, visible: ${isVisible}`);
      
      cameraBtn.classList.toggle('active', isVisible);
      cameraBtn.classList.toggle('camera-active', isVisible);
      cameraBtn.title = isVisible ? 'Camera: ON' : 'Camera: OFF';
      
      // ✅ Use updateButtonIcon for proper icon and color change
      updateButtonIcon('camera-toggle-btn', isVisible);
      
      // ✅ Force clear pseudo-elements to prevent background highlight
      forceClearPseudoElements('camera-toggle-btn');
      
      // Update storage
      localStorage.setItem('cameraPanelEnabled', String(isVisible));
      (window as any).cameraPanelEnabled = isVisible;
      
      // Show notification
      showCameraNotification(isVisible);
      
      console.log(`  ✅ Camera ${isVisible ? 'ENABLED' : 'DISABLED'}`);
      removeRippleEffect(cameraBtn);
    }, 300); // Longer delay to let panel fully initialize
  };
  
  // Restore camera saved state on load
  setTimeout(() => {
    const cameraPanel = document.querySelector('.camera-panel, #camera-panel, .dev-camera-panel') as HTMLElement;
    const isVisible = cameraPanel && 
                      window.getComputedStyle(cameraPanel).display !== 'none' &&
                      cameraPanel.offsetParent !== null;
    if (isVisible) {
      cameraBtn.classList.add('active', 'camera-active');
      cameraBtn.title = 'Camera: ON';
      updateButtonIcon('camera-toggle-btn', true);
      forceClearPseudoElements('camera-toggle-btn');
    }
  }, 1000);
  attachGroup.appendChild(cameraBtn);

  const attachConfig = TOOLBAR_BUTTONS.find(c => c.id === 'assistant-upload')!;
  const attachBtn = createToolButtonFromConfig(attachConfig);
  
  // Attach button - check registry at click time
  attachBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📎 Attach button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('assistant-upload');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(attachBtn);
      return;
    }
    
    // Try global function first
    if (typeof (window as any).handleFileUpload === 'function') {
      console.log('  → Calling window.handleFileUpload()');
      (window as any).handleFileUpload();
      return;
    }
    
    if (typeof (window as any).triggerFileUpload === 'function') {
      console.log('  → Calling window.triggerFileUpload()');
      (window as any).triggerFileUpload();
      return;
    }
    
    // Fallback: Look for existing file input or create one
    console.log('  → Using fallback: triggering file input');
    let fileInput = document.getElementById('assistant-file-input') as HTMLInputElement;
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'assistant-file-input';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      fileInput.accept = '*/*';
      document.body.appendChild(fileInput);
      
      fileInput.onchange = () => {
        if (fileInput.files && fileInput.files.length > 0) {
          console.log(`  ✅ Selected ${fileInput.files.length} file(s)`);
          // Dispatch event for file handling module
          window.dispatchEvent(new CustomEvent('files-selected', { 
            detail: { files: Array.from(fileInput.files) } 
          }));
        }
      };
    }
    fileInput.click();
  };
  attachGroup.appendChild(attachBtn);

  toolsContainer.appendChild(attachGroup);
  toolsContainer.appendChild(createToolbarDivider());

  // 4. FIX ERRORS
  const fixConfig = TOOLBAR_BUTTONS.find(c => c.id === 'fix-errors-btn')!;
  const fixBtn = createToolButtonFromConfig(fixConfig);
  
  // Fix errors button - check registry at click time
  fixBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ✅ Clear any ripple/wave effects
    forceClearPseudoElements('fix-errors-btn');
    
    console.log('🔧 Fix Errors button clicked');
    
    // Check registry first (at click time)
    const registeredHandler = buttonHandlerRegistry.get('fix-errors-btn');
    if (registeredHandler) {
      console.log('  → Using registered handler');
      registeredHandler(fixBtn);
      return;
    }
    
    // Try global functions first
    if (typeof (window as any).handleFixErrors === 'function') {
      console.log('  → Calling window.handleFixErrors()');
      (window as any).handleFixErrors();
      return;
    }
    
    if (typeof (window as any).fixErrors === 'function') {
      console.log('  → Calling window.fixErrors()');
      (window as any).fixErrors();
      return;
    }
    
    if (typeof (window as any).autoFixErrors === 'function') {
      console.log('  → Calling window.autoFixErrors()');
      (window as any).autoFixErrors();
      return;
    }
    
    // Fallback: Get current code and send fix request
    console.log('  → Using fallback: checking current code for errors');
    
    // Get current code from Monaco editor
    let currentCode = '';
    let currentFileName = '';
    let currentLanguage = '';
    
    try {
      const monaco = (window as any).monaco;
      if (monaco?.editor) {
        const editors = monaco.editor.getEditors();
        if (editors.length > 0) {
          const model = editors[0].getModel();
          if (model) {
            currentCode = model.getValue();
            currentFileName = model.uri?.path || 'current file';
            currentLanguage = model.getLanguageId() || 'unknown';
          }
        }
      }
      
      // Also try getting from tabManager
      if (!currentCode) {
        const tabManager = (window as any).tabManager || (window as any).ideTabManager;
        if (tabManager?.getActiveTab) {
          const activeTab = tabManager.getActiveTab();
          if (activeTab) {
            currentFileName = activeTab.title || activeTab.name || 'current file';
          }
        }
      }
    } catch (e) {
      console.warn('Could not get editor content:', e);
    }
    
    // Build context-aware prompt
    let prompt: string;
    if (currentCode && currentCode.trim().length > 10) {
      prompt = `🔧 **Fix Errors Request**

**File:** ${currentFileName}
**Language:** ${currentLanguage}

**Instructions:**
1. Analyze the code below for ANY errors (syntax, runtime, logic, type errors)
2. If NO errors found → Reply with: "✅ No errors found in ${currentFileName}"
3. If errors found → Fix them and provide the COMPLETE corrected code
4. Apply the fix directly to the editor (use auto-apply if available)

**Current Code:**
\`\`\`${currentLanguage}
${currentCode}
\`\`\`

Please check and fix any errors, or confirm the code is error-free.`;
    } else {
      prompt = `🔧 **Fix Errors Request**

Please analyze the currently open file in the IDE editor:
1. If NO errors found → Reply: "✅ No errors found"
2. If errors found → Fix them and apply the corrected code directly

Check for: syntax errors, runtime exceptions, type errors, and warnings.`;
    }
    
    // ✅ ARM the force-apply system to auto-apply the AI's fix
    if (typeof (window as any).setForceApplyNext === 'function') {
      console.log('  → Arming force-apply for next code block');
      (window as any).setForceApplyNext(true);
    }
    
    // Try to use sendMessageDirectly if available
    if (typeof (window as any).sendMessageDirectly === 'function') {
      console.log('  → Using sendMessageDirectly()');
      (window as any).sendMessageDirectly(prompt);
      return;
    }
    
    // Otherwise insert and trigger send
    const ta = document.querySelector('#ai-assistant-input') as HTMLTextAreaElement ||
               document.querySelector('.modern-textarea') as HTMLTextAreaElement ||
               document.querySelector('textarea') as HTMLTextAreaElement;
    if (ta) {
      ta.value = prompt;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Find and click the send button
      setTimeout(() => {
        const sendBtn = document.querySelector('#send-btn') as HTMLButtonElement ||
                        document.querySelector('.modern-send-btn') as HTMLButtonElement ||
                        document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (sendBtn && !sendBtn.disabled) {
          console.log('  → Clicking send button');
          sendBtn.click();
        } else {
          // Try dispatching Enter key event
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          });
          ta.dispatchEvent(enterEvent);
          console.log('  → Dispatched Enter key');
        }
      }, 50);
      
      console.log('  ✅ Fix errors prompt sent');
    } else {
      console.warn('  ⚠️ No textarea found!');
    }
  };
  toolsContainer.appendChild(fixBtn);

  // 5. QUICK ACTIONS - Lightning bolt menu
  const quickConfig = TOOLBAR_BUTTONS.find(c => c.id === 'quick-actions-btn')!;
  const quickBtn = createToolButtonFromConfig(quickConfig);
  
  // Quick actions button - shows popup menu
  quickBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ✅ Clear any ripple/wave effects
    forceClearPseudoElements('quick-actions-btn');
    
    console.log('⚡ Quick Actions button clicked');
    
    // Toggle menu visibility
    showQuickActionsMenu(quickBtn);
  };
  toolsContainer.appendChild(quickBtn);

  const sendWrapper = document.createElement('div');
  sendWrapper.className = 'modern-send-right';

  let newSendBtn: HTMLButtonElement;
  if (sendBtn) {
    newSendBtn = sendBtn;
  } else {
    newSendBtn = document.createElement('button');
    newSendBtn.id = 'send-btn';
  }

  newSendBtn.className = 'modern-send-btn';
  newSendBtn.innerHTML = PROFESSIONAL_ICONS.sendUp;
  newSendBtn.title = 'Send';

  if (originalSendHandler) {
    newSendBtn.onclick = originalSendHandler;
  }

  sendWrapper.appendChild(newSendBtn);

  toolbar.appendChild(toolsContainer);
  toolbar.appendChild(sendWrapper);

  inputBox.appendChild(textareaWrapper);
  inputBox.appendChild(toolbar);

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 180);
    textarea.style.height = `${newHeight}px`;
  });

  // ✅ Always start OFF on page load - do not restore any saved state
  setTimeout(() => {
    // Ensure Auto Mode is OFF
    const autoBtn = document.getElementById('autonomous-mode-toggle');
    if (autoBtn) {
      autoBtn.classList.remove('active', 'auto-active');
      autoBtn.title = 'Auto Mode: OFF';
      updateButtonIcon('autonomous-mode-toggle', false);
    }
    
    // Ensure Project Search is OFF
    const aiBtn = document.getElementById('ai-search-btn');
    if (aiBtn) {
      aiBtn.classList.remove('active', 'ai-active');
      aiBtn.title = 'Project Search: OFF';
      (aiBtn as HTMLElement).style.color = '#707070';
      updateButtonIcon('ai-search-btn', false);
    }
    
    // Clear localStorage
    localStorage.removeItem('autonomousMode');
    if (!(window as any).__bridgeAutoEnabled) localStorage.removeItem('aiFileExplorerEnabled');
    (window as any).autoApplyEnabled = false;
    // REMOVED: No longer reset Auto Mode and AI Search to OFF
    // Auto Mode and AI Search now default ON (set in assistantUI.ts)
    
    // ✅ Force clear pseudo-elements on all toggle buttons to prevent background highlights
    forceClearPseudoElements('camera-toggle-btn');
    forceClearPseudoElements('terminal-ctx-btn');
    forceClearPseudoElements('autonomous-mode-toggle');
    forceClearPseudoElements('ai-search-btn');
    forceClearPseudoElements('fix-errors-btn');
    forceClearPseudoElements('quick-actions-btn');
    
    console.log('✅ Toolbar layout applied (Auto Mode + AI Search preserved)');
  }, 100);

  console.log('✅ Grouped toolbar layout applied');
}

// ============================================================================
// CLOSE ALL FILES BUTTON - Auto-added when multiple files are attached
// ============================================================================

let closeAllDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastChipCount = 0;

/**
 * Add "Close All" button next to Attach label when multiple files attached
 */
function addCloseAllButton(): void {
  const chips = document.querySelectorAll('.pnd-chip');
  const existingCloseAll = document.querySelector('.pnd-close-all');
  
  // Skip if chip count hasn't changed and button exists
  if (chips.length === lastChipCount && existingCloseAll) {
    return;
  }
  lastChipCount = chips.length;
  
  // Remove existing
  if (existingCloseAll) {
    existingCloseAll.remove();
  }
  
  // Only show when 2+ files
  if (chips.length >= 2) {
    // Find the pnd-label (Attach button) to insert after it
    const attachLabel = document.querySelector('.pnd-label');
    if (!attachLabel) return;
    
    // Check if already has close all button next to it
    if (attachLabel.nextElementSibling?.classList.contains('pnd-close-all')) return;
    
    const closeAllBtn = document.createElement('button');
    closeAllBtn.className = 'pnd-close-all';
    closeAllBtn.title = 'Remove all files';
    closeAllBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    
    closeAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Click all individual remove buttons
      const removeButtons = document.querySelectorAll('.pnd-remove');
      removeButtons.forEach((btn) => {
        (btn as HTMLButtonElement).click();
      });
      
      console.log('🗑️ Removed all attached files');
    });
    
    // Insert right after the Attach label
    attachLabel.insertAdjacentElement('afterend', closeAllBtn);
    console.log('➕ Added Close All button next to Attach');
  }
}

/**
 * Debounced version to prevent excessive calls
 */
function debouncedAddCloseAllButton(): void {
  if (closeAllDebounceTimer) {
    clearTimeout(closeAllDebounceTimer);
  }
  closeAllDebounceTimer = setTimeout(() => {
    addCloseAllButton();
  }, 100);
}

// Watch for file attachments changes
function watchFileAttachments(): void {
  const observer = new MutationObserver(() => {
    debouncedAddCloseAllButton();
  });
  
  // Observe only the chat input area for changes (more targeted)
  const chatInputArea = document.querySelector('.chat-input-area');
  if (chatInputArea) {
    observer.observe(chatInputArea, { 
      childList: true, 
      subtree: true
    });
  }
  
  // Initial check
  setTimeout(addCloseAllButton, 500);
  
  console.log('👀 Watching for file attachments (debounced)');
}

// Initialize file attachment watcher
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    setTimeout(watchFileAttachments, 500);
    setTimeout(initializeDynamicPlaceholder, 600);  // Initialize after DOM ready
    setTimeout(initAutoModePanelSync, 700);  // Sync panel highlight on load
  } else {
    window.addEventListener('load', () => {
      setTimeout(watchFileAttachments, 500);
      setTimeout(initializeDynamicPlaceholder, 600);  // Initialize after DOM ready
      setTimeout(initAutoModePanelSync, 700);  // Sync panel highlight on load
    });
  }
  
  // Expose function
  (window as any).addCloseAllButton = addCloseAllButton;
}

/**
 * Initialize Auto Mode panel sync - watches button and syncs on load
 */
function initAutoModePanelSync(): void {
  // Check if auto mode is currently active
  const autoBtn = document.getElementById('autonomous-mode-toggle');
  if (autoBtn) {
    const isActive = autoBtn.className.includes('active') || autoBtn.className.includes('auto-active');
    if (isActive) {
      toggleAutoModePanelHighlight(true);
    }
    
    // Watch for button changes
    const observer = new MutationObserver(() => {
      const active = autoBtn.className.includes('active') || autoBtn.className.includes('auto-active');
      toggleAutoModePanelHighlight(active);
    });
    observer.observe(autoBtn, { attributes: true, attributeFilter: ['class'] });
    console.log('👀 [Auto Mode Panel] Watching button state');
  }
  
  // Check if project search is currently active
  const searchBtn = document.getElementById('ai-search-btn');
  if (searchBtn) {
    const isActive = searchBtn.className.includes('active') || searchBtn.className.includes('ai-active');
    if (isActive) {
      toggleProjectSearchPanelHighlight(true);
    }
    
    // Watch for button changes
    const searchObserver = new MutationObserver(() => {
      const active = searchBtn.className.includes('active') || searchBtn.className.includes('ai-active');
      toggleProjectSearchPanelHighlight(active);
    });
    searchObserver.observe(searchBtn, { attributes: true, attributeFilter: ['class'] });
    console.log('👀 [Project Search Panel] Watching button state');
  }
  
  // Check if terminal context is currently active
  const termBtn = document.getElementById('terminal-ctx-btn');
  if (termBtn) {
    const isActive = termBtn.className.includes('active') || 
                     termBtn.className.includes('terminal-active') ||
                     termBtn.className.includes('btn-fix-on');
    if (isActive) {
      toggleTerminalContextPanelHighlight(true);
    }
    
    // Watch for button changes
    const termObserver = new MutationObserver(() => {
      const active = termBtn.className.includes('active') || 
                     termBtn.className.includes('terminal-active') ||
                     termBtn.className.includes('btn-fix-on');
      toggleTerminalContextPanelHighlight(active);
    });
    termObserver.observe(termBtn, { attributes: true, attributeFilter: ['class'] });
    console.log('👀 [Terminal Context Panel] Watching button state');
  }
  
  // Also check localStorage
  if (localStorage.getItem('aiFileExplorerEnabled') === 'true') {
    toggleProjectSearchPanelHighlight(true);
  }
  if (localStorage.getItem('terminalContextEnabled') === 'true') {
    toggleTerminalContextPanelHighlight(true);
  }
}