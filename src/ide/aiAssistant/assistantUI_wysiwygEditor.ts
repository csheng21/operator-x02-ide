// assistantUI_wysiwygEditor.ts - Professional WYSIWYG Editor
// Supports Modern Fluent and Word Dark Mode themes

import { showNotification } from './notificationManager';

type EditorTheme = 'fluent' | 'dark';

interface WYSIWYGConfig {
  htmlContent: string;
  fileName: string;
  onSave?: (html: string) => void;
  onClose?: () => void;
  theme?: EditorTheme;
}

// Theme color definitions
const THEMES = {
  fluent: {
    name: 'Modern Fluent',
    header: 'linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%)',
    headerBorder: '#d1d1d1',
    headerText: '#1a1a1a',
    statusReady: '#0067c0',
    tabs: '#fafafa',
    tabsBorder: '#e5e5e5',
    tabText: '#666',
    tabActive: '#0067c0',
    tabActiveBg: '#fff',
    ribbon: '#fff',
    ribbonBorder: '#e5e5e5',
    ribbonBtn: '#f5f5f5',
    ribbonBtnBorder: 'transparent',
    ribbonBtnText: '#333',
    ribbonBtnHover: '#e8f4fc',
    ribbonBtnHoverBorder: '#0067c0',
    accent: '#0067c0',
    accentHover: '#005ba1',
    workspace: '#f5f5f5',
    editorBg: '#fff',
    editorShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    inspector: '#fafafa',
    inspectorBorder: '#e5e5e5',
    inspectorText: '#1a1a1a',
    inputBg: '#fff',
    inputBorder: '#d1d1d1',
    inputText: '#1a1a1a',
    statusBar: '#f5f5f5',
    statusBarText: '#666',
    groupLabel: '#888',
    selectBg: '#fff',
    selectText: '#333',
    overlay: 'rgba(0, 0, 0, 0.4)',
    btnGroupBg: '#fff',
    iconBtn: '#666',
    iconBtnHover: '#e5e5e5',
    divider: '#d1d1d1',
    closeBtnHoverBg: '#fde8e8',
    closeBtnHoverBorder: '#f87171',
    closeBtnHoverColor: '#dc2626',
  },
  dark: {
    name: 'Word Dark',
    header: 'linear-gradient(180deg, #1e1e1e 0%, #252526 100%)',
    headerBorder: '#3c3c3c',
    headerText: '#e0e0e0',
    statusReady: '#0078d4',
    tabs: '#252526',
    tabsBorder: '#3c3c3c',
    tabText: '#969696',
    tabActive: '#0078d4',
    tabActiveBg: '#2d2d2d',
    ribbon: '#2d2d2d',
    ribbonBorder: '#3c3c3c',
    ribbonBtn: '#3c3c3c',
    ribbonBtnBorder: '#4a4a4a',
    ribbonBtnText: '#d4d4d4',
    ribbonBtnHover: '#094771',
    ribbonBtnHoverBorder: '#0078d4',
    accent: '#0078d4',
    accentHover: '#1a8ad4',
    workspace: '#1e1e1e',
    editorBg: '#252526',
    editorShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    inspector: '#252526',
    inspectorBorder: '#3c3c3c',
    inspectorText: '#e0e0e0',
    inputBg: '#3c3c3c',
    inputBorder: '#4a4a4a',
    inputText: '#e0e0e0',
    statusBar: '#007acc',
    statusBarText: '#fff',
    groupLabel: '#808080',
    selectBg: '#3c3c3c',
    selectText: '#d4d4d4',
    overlay: 'rgba(0, 0, 0, 0.7)',
    btnGroupBg: '#3c3c3c',
    iconBtn: '#969696',
    iconBtnHover: '#4a4a4a',
    divider: '#3c3c3c',
    closeBtnHoverBg: '#4a4a4a',
    closeBtnHoverBorder: '#4a4a4a',
    closeBtnHoverColor: '#e0e0e0',
  }
};

export class WYSIWYGEditor {
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private config: WYSIWYGConfig;
  private originalHTML: string;
  private isEditing: boolean = false;
  private selectedElement: HTMLElement | null = null;
  private history: string[] = [];
  private historyIndex: number = -1;
  private globalKeydownHandler?: (e: KeyboardEvent) => void;
  private currentTab: string = 'home';
  private currentTheme: EditorTheme = 'fluent';

  constructor(config: WYSIWYGConfig) {
    this.config = config;
    this.originalHTML = config.htmlContent;
    this.history.push(this.originalHTML);
    this.historyIndex = 0;
    this.currentTheme = config.theme || 'fluent';
  }

  public open(): void {
    this.createEditorUI();
    this.setupEventListeners();
    this.setupGlobalKeyboardShortcuts();
    this.loadContent();
    
    // Add debug helper to window
    (window as any).__wysiwygEditor = {
      checkSaveMethods: () => {
        console.log('🔍 WYSIWYG Save Methods Available:');
        console.log('  - onSave callback:', !!this.config.onSave);
        console.log('  - window.tabManager:', !!(window as any).tabManager);
        console.log('  - window.fileSystem:', !!(window as any).fileSystem);
        console.log('  - window.monaco:', !!(window as any).monaco);
        console.log('\nTo test save, call: __wysiwygEditor.testSave()');
      },
      testSave: () => {
        console.log('🧪 Testing save...');
        this.handleSave();
      }
    };
    
    console.log('✅ WYSIWYG Editor opened');
    console.log('💡 Debug: Type __wysiwygEditor.checkSaveMethods() in console to check save methods');
  }

  public close(): void {
    this.removeGlobalKeyboardShortcuts();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.config.onClose?.();
  }

  private createEditorUI(): void {
    const existing = document.getElementById('wysiwyg-editor-container');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'wysiwyg-editor-container';
    this.container.className = 'wysiwyg-editor';

    this.container.innerHTML = `
      <div class="wysiwyg-overlay"></div>
      <div class="wysiwyg-main" data-theme="${this.currentTheme}">
        <!-- Header Bar -->
        <div class="wysiwyg-header">
          <div class="header-left">
            <div class="file-info">
              <div class="file-name">${this.config.fileName}</div>
              <div class="file-status" id="save-status">Ready</div>
            </div>
          </div>
          <div class="header-actions">
            <div class="btn-group">
              <button class="icon-btn" id="undo-btn" disabled title="Undo (Ctrl+Z)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                </svg>
              </button>
              <button class="icon-btn" id="redo-btn" disabled title="Redo (Ctrl+Shift+Z)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
                </svg>
              </button>
            </div>
            <div class="header-divider"></div>
            <button class="icon-btn theme-toggle-btn" id="theme-toggle" title="Toggle Theme (Light/Dark)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <div class="header-divider"></div>
            <button class="wysiwyg-action-btn wysiwyg-save-btn" id="save-btn" title="Save (Ctrl+S)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Save</span>
            </button>
            <button class="wysiwyg-action-btn wysiwyg-preview-btn" id="toggle-preview" title="Preview (Ctrl+P)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Preview</span>
            </button>
            <div class="header-divider"></div>
            <button class="icon-btn close-btn" id="close-btn" title="Close (ESC)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Ribbon Tabs -->
        <div class="ribbon-tabs">
          <button class="ribbon-tab active" data-tab="home">Home</button>
          <button class="ribbon-tab" data-tab="insert">Insert</button>
          <button class="ribbon-tab" data-tab="view">View</button>
        </div>

        <!-- Ribbon Content -->
        <div class="ribbon-content">
          <!-- Home Tab -->
          <div class="ribbon-panel active" data-panel="home">
            <div class="ribbon-group">
              <div class="group-label">Font</div>
              <div class="group-controls">
                <select class="compact-select" id="font-family">
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
                <select class="compact-select" id="font-size">
                  <option value="12px">12</option>
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="18px">18</option>
                  <option value="24px">24</option>
                  <option value="32px">32</option>
                </select>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Format</div>
              <div class="group-controls">
                <button class="ribbon-btn" data-action="bold" title="Bold (Ctrl+B)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="italic" title="Italic (Ctrl+I)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="4" x2="10" y2="4"/>
                    <line x1="14" y1="20" x2="5" y2="20"/>
                    <line x1="15" y1="4" x2="9" y2="20"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="underline" title="Underline (Ctrl+U)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="strikethrough" title="Strikethrough">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.5 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6M4 12h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Paragraph</div>
              <div class="group-controls">
                <button class="ribbon-btn" data-action="alignLeft" title="Align Left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="alignCenter" title="Align Center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="alignRight" title="Align Right">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
                    <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="insertUnorderedList" title="Bullets">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/>
                    <circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
                  </svg>
                </button>
                <button class="ribbon-btn" data-action="insertOrderedList" title="Numbering">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
                    <line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2"/>
                    <path d="M6 14H4a2 2 0 00-2 2v0a2 2 0 002 2h2M4 18l2-2"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Styles</div>
              <div class="group-controls">
                <button class="ribbon-btn" data-action="heading1" title="Heading 1">H1</button>
                <button class="ribbon-btn" data-action="heading2" title="Heading 2">H2</button>
                <button class="ribbon-btn" data-action="heading3" title="Heading 3">H3</button>
                <button class="ribbon-btn" data-action="paragraph" title="Normal">P</button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Colors</div>
              <div class="group-controls">
                <label class="color-btn" title="Text Color">
                  <input type="color" id="text-color" value="#000000">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 20h16M6.5 9l4.5-7 4.5 7M7.5 12h9"/>
                  </svg>
                  <span class="color-indicator"></span>
                </label>
                <label class="color-btn" title="Highlight">
                  <input type="color" id="bg-color" value="#ffff00">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                  <span class="color-indicator"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Insert Tab -->
          <div class="ribbon-panel" data-panel="insert">
            <div class="ribbon-group">
              <div class="group-label">Links</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large" data-action="createLink">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  <span>Link</span>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Media</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large" data-action="insertImage">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>Image</span>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Tables</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large" data-action="insertTable">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="12" y1="3" x2="12" y2="21"/>
                  </svg>
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          <!-- View Tab -->
          <div class="ribbon-panel" data-panel="view">
            <div class="ribbon-group">
              <div class="group-label">View Mode</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large active" data-mode="visual">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                  </svg>
                  <span>Visual</span>
                </button>
                <button class="ribbon-btn ribbon-btn-large" data-mode="html">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span>HTML</span>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Tools</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large" id="toggle-code">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span>View Source</span>
                </button>
                <button class="ribbon-btn ribbon-btn-large" data-action="removeFormat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16M9 20h6M12 4v16"/>
                    <line x1="2" y1="2" x2="22" y2="22"/>
                  </svg>
                  <span>Clear Format</span>
                </button>
              </div>
            </div>

            <div class="ribbon-separator"></div>

            <div class="ribbon-group">
              <div class="group-label">Export</div>
              <div class="group-controls">
                <button class="ribbon-btn ribbon-btn-large" id="export-html-btn" title="Download HTML file to your computer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span>Download HTML</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="editor-workspace">
          <div class="editor-main">
            <div class="editor-container">
              <iframe id="wysiwyg-iframe" class="wysiwyg-iframe active"></iframe>
              <textarea id="html-source" class="html-source-editor"></textarea>
            </div>
          </div>

          <!-- Compact Inspector Panel -->
          <div class="inspector-panel" id="inspector-panel">
            <div class="inspector-header">
              <span class="inspector-title">Properties</span>
              <button class="inspector-toggle" id="toggle-inspector" title="Hide Panel">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
            <div class="inspector-content" id="inspector-content">
              <div class="inspector-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                </svg>
                <p>Select an element to edit</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Dark Status Bar -->
        <div class="status-bar">
          <span class="status-item" id="element-path">Body</span>
          <span class="status-item status-right">
            <span id="word-count">0 words</span>
          </span>
        </div>
      </div>
    `;

    this.addStyles();
    document.body.appendChild(this.container);
    this.iframe = document.getElementById('wysiwyg-iframe') as HTMLIFrameElement;
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Header buttons
    const closeBtn = this.container.querySelector('#close-btn');
    const saveBtn = this.container.querySelector('#save-btn');
    const undoBtn = this.container.querySelector('#undo-btn');
    const redoBtn = this.container.querySelector('#redo-btn');
    const togglePreview = this.container.querySelector('#toggle-preview');
    const toggleCode = this.container.querySelector('#toggle-code');
    const toggleInspector = this.container.querySelector('#toggle-inspector');
    const exportBtn = this.container.querySelector('#export-html-btn');
    const themeToggle = this.container.querySelector('#theme-toggle');

    closeBtn?.addEventListener('click', () => this.handleClose());
    saveBtn?.addEventListener('click', () => this.handleSave());
    undoBtn?.addEventListener('click', () => this.handleUndo());
    redoBtn?.addEventListener('click', () => this.handleRedo());
    togglePreview?.addEventListener('click', () => this.togglePreviewMode());
    toggleCode?.addEventListener('click', () => this.showHTMLSource());
    toggleInspector?.addEventListener('click', () => this.toggleInspector());
    exportBtn?.addEventListener('click', () => this.exportHTML());
    themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Ribbon tabs
    const ribbonTabs = this.container.querySelectorAll('.ribbon-tab');
    ribbonTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = (tab as HTMLElement).dataset.tab;
        this.switchRibbonTab(tabName || 'home');
      });
    });

    // Toolbar actions
    const toolbarBtns = this.container.querySelectorAll('[data-action]');
    toolbarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action) this.executeCommand(action);
      });
    });

    // View mode buttons
    const modeBtns = this.container.querySelectorAll('[data-mode]');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode;
        this.switchMode(mode || 'visual');
      });
    });

    // Font controls
    const fontFamily = this.container.querySelector('#font-family') as HTMLSelectElement;
    const fontSize = this.container.querySelector('#font-size') as HTMLSelectElement;
    const textColor = this.container.querySelector('#text-color') as HTMLInputElement;
    const bgColor = this.container.querySelector('#bg-color') as HTMLInputElement;

    fontFamily?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) this.applyStyle('fontFamily', value);
    });

    fontSize?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) this.applyStyle('fontSize', value);
    });

    textColor?.addEventListener('change', (e) => {
      this.executeCommand('foreColor', (e.target as HTMLInputElement).value);
    });

    bgColor?.addEventListener('change', (e) => {
      this.executeCommand('backColor', (e.target as HTMLInputElement).value);
    });

    // Overlay click
    const overlay = this.container.querySelector('.wysiwyg-overlay');
    overlay?.addEventListener('click', () => this.handleClose());

    // Prevent click propagation on main container
    const mainContainer = this.container.querySelector('.wysiwyg-main');
    mainContainer?.addEventListener('click', (e) => e.stopPropagation());
  }

  private switchRibbonTab(tabName: string): void {
    this.currentTab = tabName;
    
    const tabs = this.container?.querySelectorAll('.ribbon-tab');
    const panels = this.container?.querySelectorAll('.ribbon-panel');
    
    tabs?.forEach(tab => tab.classList.remove('active'));
    panels?.forEach(panel => panel.classList.remove('active'));
    
    const activeTab = this.container?.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = this.container?.querySelector(`[data-panel="${tabName}"]`);
    
    activeTab?.classList.add('active');
    activePanel?.classList.add('active');
  }

  private toggleInspector(): void {
    const panel = this.container?.querySelector('.inspector-panel');
    const btn = this.container?.querySelector('#toggle-inspector svg');
    
    if (panel?.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if (btn) btn.style.transform = 'rotate(0deg)';
    } else {
      panel?.classList.add('collapsed');
      if (btn) btn.style.transform = 'rotate(180deg)';
    }
  }

  private setupGlobalKeyboardShortcuts(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.handleClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.handleSave();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        this.togglePreviewMode();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.globalKeydownHandler = handleKeyDown;
  }

  private removeGlobalKeyboardShortcuts(): void {
    if (this.globalKeydownHandler) {
      document.removeEventListener('keydown', this.globalKeydownHandler);
    }
  }

  private loadContent(): void {
    if (!this.iframe) return;

    const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(this.config.htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      if (!iframeDoc.body) return;
      
      iframeDoc.body.contentEditable = 'true';
      iframeDoc.body.style.padding = '40px';
      iframeDoc.body.style.minHeight = '100%';
      iframeDoc.body.style.outline = 'none';
      iframeDoc.body.style.fontFamily = 'Calibri, Arial, sans-serif';
      iframeDoc.body.style.fontSize = '14px';
      iframeDoc.body.style.lineHeight = '1.6';

      const style = iframeDoc.createElement('style');
      style.textContent = `
        * { cursor: text !important; }
        *:hover { outline: 1px solid #06b6d4 !important; }
        .selected-element { 
          outline: 2px solid #06b6d4 !important;
          outline-offset: 2px;
        }
      `;
      iframeDoc.head.appendChild(style);

      this.setupIframeListeners(iframeDoc);
      this.isEditing = true;
      this.updateStatus('Ready');
    }, 100);
  }

  private setupIframeListeners(doc: Document): void {
    doc.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.selectElement(target);
    });

    doc.addEventListener('input', () => {
      this.saveToHistory();
      this.updateStatus('Editing');
      this.updateWordCount();
    });

    doc.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            this.handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              this.handleRedo();
            } else {
              this.handleUndo();
            }
            break;
        }
      }
    });
  }

  private selectElement(element: HTMLElement): void {
    if (!this.iframe?.contentDocument) return;

    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected-element');
    }

    this.selectedElement = element;
    element.classList.add('selected-element');

    this.showInspector(element);
    this.updateElementPath();
  }

  private showInspector(element: HTMLElement): void {
    const inspectorContent = this.container?.querySelector('#inspector-content');
    if (!inspectorContent) return;

    const tagName = element.tagName.toLowerCase();
    const computedStyle = this.iframe?.contentWindow?.getComputedStyle(element);

    inspectorContent.innerHTML = `
      <div class="prop-group">
        <div class="prop-label">Element</div>
        <input type="text" class="prop-input" value="${tagName}" readonly>
      </div>

      <div class="prop-group">
        <div class="prop-label">ID</div>
        <input type="text" class="prop-input" id="element-id" value="${element.id}" placeholder="none">
      </div>

      <div class="prop-group">
        <div class="prop-label">Class</div>
        <input type="text" class="prop-input" id="element-classes" value="${Array.from(element.classList).filter(c => c !== 'selected-element').join(' ')}" placeholder="none">
      </div>

      <div class="prop-group">
        <div class="prop-label">Text</div>
        <textarea class="prop-textarea" id="element-text" rows="2">${element.textContent || ''}</textarea>
      </div>

      <div class="prop-separator"></div>

      <div class="prop-group">
        <div class="prop-label">Font Size</div>
        <input type="text" class="prop-input" id="element-font-size" value="${computedStyle?.fontSize || '14px'}">
      </div>

      <div class="prop-group">
        <div class="prop-label">Color</div>
        <input type="color" class="prop-color" id="element-color" value="${this.rgbToHex(computedStyle?.color || '#000000')}">
      </div>

      <div class="prop-group">
        <div class="prop-label">Background</div>
        <input type="color" class="prop-color" id="element-bg" value="${this.rgbToHex(computedStyle?.backgroundColor || '#ffffff')}">
      </div>

      <div class="prop-actions">
        <button class="prop-btn prop-btn-primary" id="apply-changes">Apply</button>
        <button class="prop-btn prop-btn-danger" id="delete-element">Delete</button>
      </div>
    `;

    this.setupInspectorListeners(element);
  }

  private setupInspectorListeners(element: HTMLElement): void {
    const applyBtn = this.container?.querySelector('#apply-changes');
    const deleteBtn = this.container?.querySelector('#delete-element');

    applyBtn?.addEventListener('click', () => {
      this.applyInspectorChanges(element);
    });

    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this element?')) {
        element.remove();
        this.saveToHistory();
        this.selectedElement = null;
        
        const inspectorContent = this.container?.querySelector('#inspector-content');
        if (inspectorContent) {
          inspectorContent.innerHTML = '<div class="inspector-empty"><p>Element deleted</p></div>';
        }
        
        this.showToast('Element deleted', 'success');
      }
    });
  }

  private applyInspectorChanges(element: HTMLElement): void {
    const getId = (id: string) => this.container?.querySelector(id) as HTMLInputElement;

    const newId = getId('#element-id')?.value;
    if (newId) element.id = newId;

    const newClasses = getId('#element-classes')?.value;
    if (newClasses !== undefined) element.className = newClasses;

    const newText = getId('#element-text')?.value;
    if (newText !== undefined && element.childNodes.length <= 1) {
      element.textContent = newText;
    }

    const fontSize = getId('#element-font-size')?.value;
    if (fontSize) element.style.fontSize = fontSize;

    const color = getId('#element-color')?.value;
    if (color) element.style.color = color;

    const bg = getId('#element-bg')?.value;
    if (bg) element.style.backgroundColor = bg;

    this.saveToHistory();
    this.showToast('Changes applied', 'success');
  }

  private executeCommand(command: string, value?: string): void {
    if (!this.iframe?.contentDocument) return;
    const doc = this.iframe.contentDocument;
    doc.execCommand(command, false, value);
    this.saveToHistory();
  }

  private applyStyle(property: string, value: string): void {
    if (!this.iframe?.contentWindow) return;
    const selection = this.iframe.contentWindow.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = this.iframe.contentDocument!.createElement('span');
    span.style[property as any] = value;

    try {
      range.surroundContents(span);
      this.saveToHistory();
    } catch (e) {
      console.error('Failed to apply style:', e);
    }
  }

  private switchMode(mode: string): void {
    const iframe = this.container?.querySelector('#wysiwyg-iframe');
    const textarea = this.container?.querySelector('#html-source') as HTMLTextAreaElement;
    const modeBtns = this.container?.querySelectorAll('[data-mode]');

    modeBtns?.forEach(btn => btn.classList.remove('active'));
    const activeBtn = this.container?.querySelector(`[data-mode="${mode}"]`);
    activeBtn?.classList.add('active');

    if (mode === 'html') {
      const html = this.iframe?.contentDocument?.documentElement.outerHTML || '';
      if (textarea) {
        textarea.value = this.formatHTML(html);
        textarea.style.display = 'block';
      }
      if (iframe) iframe.classList.remove('active');
    } else {
      if (textarea && textarea.value && this.iframe) {
        const doc = this.iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(textarea.value);
          doc.close();
          setTimeout(() => this.loadContent(), 100);
        }
      }
      if (textarea) textarea.style.display = 'none';
      if (iframe) iframe.classList.add('active');
    }
  }

  private togglePreviewMode(): void {
    console.log('🔄 Preview mode requested');
    
    if (!this.iframe?.contentDocument) {
      this.showToast('No content to preview', 'error');
      return;
    }

    const currentHTML = this.iframe.contentDocument.documentElement.outerHTML;
    const fileName = this.config.fileName;
    const hasChanges = currentHTML !== this.originalHTML;
    
    if (hasChanges) {
      console.log('⚠️ Unsaved changes detected');
      const saveFirst = confirm('You have unsaved changes. Save before preview?');
      
      if (saveFirst) {
        console.log('💾 Saving before preview...');
        this.handleSave().then(() => {
          console.log('✅ Saved, now opening preview');
          this.exitToPreview(currentHTML, fileName);
        }).catch(err => {
          console.error('❌ Save failed:', err);
          this.showToast('Save failed, opening preview anyway', 'warning');
          this.exitToPreview(currentHTML, fileName);
        });
        return;
      } else {
        console.log('⏭️ Skipping save, opening preview with unsaved changes');
      }
    } else {
      console.log('✅ No unsaved changes, opening preview');
    }

    this.exitToPreview(currentHTML, fileName);
  }

  private exitToPreview(htmlContent: string, fileName: string): void {
    console.log('📺 Exiting to preview mode...');
    console.log('📄 Content length:', htmlContent.length);
    
    if (this.container) {
      this.container.style.opacity = '0';
      this.container.style.transition = 'opacity 0.2s ease';
      
      setTimeout(() => {
        console.log('🗑️ Removing editor container');
        this.container?.remove();
        this.container = null;
        
        console.log('📦 Loading preview viewer module...');
        import('./assistantUI_htmlviewer').then(module => {
          if (module.displayHTMLResponseViewerBlob) {
            console.log('✅ Opening preview viewer');
            module.displayHTMLResponseViewerBlob(htmlContent, fileName);
            
            if (typeof showNotification === 'function') {
              showNotification('Preview opened', 'success');
            }
          } else {
            console.error('❌ displayHTMLResponseViewerBlob not found in module');
            alert('Preview viewer not available');
          }
        }).catch(err => {
          console.error('❌ Failed to load preview viewer:', err);
          alert('Failed to load preview viewer: ' + err.message);
        });
        
        if (this.config.onClose) {
          this.config.onClose();
        }
        
        console.log('✅ Editor closed successfully');
      }, 200);
    } else {
      console.error('❌ Container not found');
    }
  }

  private showHTMLSource(): void {
    const html = this.iframe?.contentDocument?.documentElement.outerHTML || '';
    
    const modal = document.createElement('div');
    modal.className = 'source-modal';
    modal.innerHTML = `
      <div class="source-modal-content">
        <div class="source-modal-header">
          <span>HTML Source Code</span>
          <button class="source-close">×</button>
        </div>
        <textarea class="source-textarea" readonly>${this.formatHTML(html)}</textarea>
        <div class="source-modal-footer">
          <button class="source-btn" id="copy-html">Copy</button>
          <button class="source-btn source-btn-primary" id="close-source">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.source-close')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#close-source')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#copy-html')?.addEventListener('click', () => {
      navigator.clipboard.writeText(html);
      this.showToast('HTML copied', 'success');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  private saveToHistory(): void {
    if (!this.iframe?.contentDocument) return;
    const currentHTML = this.iframe.contentDocument.documentElement.outerHTML;
    if (currentHTML === this.history[this.historyIndex]) return;

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(currentHTML);
    this.historyIndex++;

    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateHistoryButtons();
  }

  private handleUndo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreFromHistory();
  }

  private handleRedo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreFromHistory();
  }

  private restoreFromHistory(): void {
    if (!this.iframe?.contentDocument) return;
    const html = this.history[this.historyIndex];
    const doc = this.iframe.contentDocument;
    
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      if (doc.body) doc.body.contentEditable = 'true';
    }, 100);

    this.updateHistoryButtons();
  }

  private updateHistoryButtons(): void {
    const undoBtn = this.container?.querySelector('#undo-btn') as HTMLButtonElement;
    const redoBtn = this.container?.querySelector('#redo-btn') as HTMLButtonElement;

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  private updateElementPath(): void {
    const pathDisplay = this.container?.querySelector('#element-path');
    if (!pathDisplay || !this.iframe?.contentWindow) return;

    const selection = this.iframe.contentWindow.getSelection();
    if (!selection || !selection.anchorNode) {
      pathDisplay.textContent = 'Body';
      return;
    }

    const element = selection.anchorNode.nodeType === Node.ELEMENT_NODE 
      ? selection.anchorNode as HTMLElement
      : selection.anchorNode.parentElement;

    if (!element) return;

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.tagName !== 'BODY') {
      const tag = current.tagName.toLowerCase();
      path.unshift(tag);
      current = current.parentElement;
    }

    pathDisplay.textContent = path.length > 0 ? path.join(' > ') : 'Body';
  }

  private updateWordCount(): void {
    const wordCountEl = this.container?.querySelector('#word-count');
    if (!wordCountEl || !this.iframe?.contentDocument) return;

    const text = this.iframe.contentDocument.body.textContent || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  }

  private updateStatus(message: string): void {
    const status = this.container?.querySelector('#save-status');
    if (status) {
      status.textContent = message;
      if (message === 'Ready') {
        status.className = 'file-status ready';
      } else if (message === 'Saved') {
        status.className = 'file-status saved';
      } else if (message === 'Editing' || message === 'Saving...') {
        status.className = 'file-status editing';
      } else {
        status.className = 'file-status';
      }
    }
  }

  private async handleSave(): Promise<void> {
    console.log('💾 SAVE BUTTON CLICKED - Starting save process...');
    
    if (!this.iframe?.contentDocument) {
      console.error('❌ No iframe document');
      this.showToast('Nothing to save', 'error');
      return;
    }

    this.updateStatus('Saving...');
    const html = this.iframe.contentDocument.documentElement.outerHTML;
    console.log('📄 HTML content length:', html.length);
    
    try {
      // CRITICAL: Check what's available
      const fileSystem = (window as any).fileSystem;
      const tabManager = (window as any).tabManager;
      const monaco = (window as any).monaco;
      
      console.log('🔍 Available save methods:', {
        hasOnSave: !!this.config.onSave,
        hasTabManager: !!tabManager,
        hasFileSystem: !!fileSystem,
        hasMonaco: !!monaco
      });

      // Method 1: Use onSave callback if provided (highest priority)
      if (this.config.onSave) {
        console.log('✅ Method 1: Using onSave callback');
        try {
          await this.config.onSave(html);
          this.showToast('✅ File saved successfully', 'success');
          this.updateStatus('Saved');
          this.originalHTML = html;
          console.log('✅ Save completed via onSave callback');
          return;
        } catch (error) {
          console.error('❌ onSave callback failed:', error);
          // Don't return, try next method
        }
      }

      // Method 2: Use Monaco editor to update content
      if (monaco?.editor) {
        const editors = monaco.editor.getEditors();
        console.log('🔍 Monaco editors found:', editors?.length || 0);
        
        if (editors && editors.length > 0) {
          const editor = editors[0];
          const model = editor.getModel();
          
          if (model) {
            console.log('✅ Method 2: Updating Monaco editor');
            model.setValue(html);
            
            // Also mark as not modified if possible
            if (tabManager?.currentFile) {
              tabManager.currentFile.content = html;
              tabManager.currentFile.modified = false;
            }
            
            this.showToast('✅ File saved to editor', 'success');
            this.updateStatus('Saved');
            this.originalHTML = html;
            console.log('✅ Save completed via Monaco editor');
            return;
          }
        }
      }
      
      // Method 3: Use tabManager to save file
      if (tabManager?.currentFile) {
        console.log('✅ Method 3: Using tabManager');
        
        // Update the tab content
        tabManager.currentFile.content = html;
        tabManager.currentFile.modified = true;
        
        // If tabManager has saveCurrentFile, use it
        if (tabManager.saveCurrentFile) {
          try {
            await tabManager.saveCurrentFile();
            this.showToast('✅ File saved via tab manager', 'success');
            this.updateStatus('Saved');
            this.originalHTML = html;
            console.log('✅ Save completed via tabManager');
            return;
          } catch (error) {
            console.error('❌ tabManager.saveCurrentFile failed:', error);
          }
        } else {
          // Just update the content without saving
          this.showToast('✅ Content updated in tab', 'success');
          this.updateStatus('Saved');
          this.originalHTML = html;
          console.log('✅ Content updated in tab (no save method)');
          return;
        }
      }
      
      // Method 4: Use fileSystem.writeFile
      if (fileSystem?.writeFile) {
        console.log('✅ Method 4: Using fileSystem.writeFile');
        const filePath = this.config.fileName.endsWith('.html') 
          ? this.config.fileName 
          : `${this.config.fileName}.html`;
        
        console.log('📁 Saving to path:', filePath);
        await fileSystem.writeFile(filePath, html);
        this.showToast('✅ File saved to disk', 'success');
        this.updateStatus('Saved');
        this.originalHTML = html;
        console.log('✅ Save completed via fileSystem');
        return;
      }

      // If we get here, no save method worked
      console.error('❌ No save method available!');
      this.showToast('⚠️ Cannot save - IDE integration not available', 'error');
      this.updateStatus('Error');
      
      // DO NOT DOWNLOAD - just inform user
      console.log('ℹ️ Use "Export HTML" button to download file');
      
    } catch (error) {
      console.error('❌ Save error:', error);
      this.showToast('❌ Save failed: ' + (error as Error).message, 'error');
      this.updateStatus('Error');
    }
  }

  private downloadFile(html: string): void {
    console.log('💾 Creating download for HTML file...');
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.config.fileName.endsWith('.html') 
      ? this.config.fileName 
      : `${this.config.fileName}.html`;
    
    console.log('📁 Download filename:', a.download);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Download triggered');
  }

  private handleClose(): void {
    // Close directly without confirmation
    this.closeEditor();
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'fluent' ? 'dark' : 'fluent';
    const mainContainer = this.container?.querySelector('.wysiwyg-main');
    if (mainContainer) {
      mainContainer.setAttribute('data-theme', this.currentTheme);
    }
    
    // Update theme toggle icon
    const themeToggle = this.container?.querySelector('#theme-toggle');
    if (themeToggle) {
      const isDark = this.currentTheme === 'dark';
      themeToggle.innerHTML = isDark ? `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      ` : `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      `;
      themeToggle.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
    
    console.log(`🎨 Theme switched to: ${this.currentTheme}`);
    this.showToast(`Theme: ${this.currentTheme === 'fluent' ? 'Modern Fluent' : 'Word Dark'}`, 'info');
  }

  public setTheme(theme: EditorTheme): void {
    this.currentTheme = theme;
    const mainContainer = this.container?.querySelector('.wysiwyg-main');
    if (mainContainer) {
      mainContainer.setAttribute('data-theme', this.currentTheme);
    }
  }

  private closeEditor(): void {
    this.removeGlobalKeyboardShortcuts();
    
    if (this.container) {
      this.container.style.opacity = '0';
      this.container.style.transition = 'opacity 0.2s ease';
      
      setTimeout(() => {
        this.container?.remove();
        this.container = null;
        this.config.onClose?.();
      }, 200);
    }
  }

  private hasUnsavedChanges(): boolean {
    if (!this.iframe?.contentDocument) return false;
    const currentHTML = this.iframe.contentDocument.documentElement.outerHTML;
    return currentHTML !== this.originalHTML;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private exportHTML(): void {
    console.log('📥 EXPORT button clicked - This will DOWNLOAD the file');
    
    if (!this.iframe?.contentDocument) {
      this.showToast('Nothing to export', 'error');
      return;
    }

    const html = this.iframe.contentDocument.documentElement.outerHTML;
    console.log('📦 Exporting HTML, length:', html.length);
    
    this.downloadFile(html);
    this.showToast('📥 HTML file downloaded to your computer', 'success');
    console.log('✅ File downloaded successfully');
  }

  private formatHTML(html: string): string {
    let formatted = '';
    let indent = 0;
    
    html.split(/>\s*</).forEach(element => {
      if (element.match(/^\/\w/)) indent--;
      formatted += '  '.repeat(indent) + '<' + element + '>\n';
      if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith('input')) indent++;
    });
    
    return formatted.substring(1, formatted.length - 2);
  }

  private rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private addStyles(): void {
    if (document.getElementById('wysiwyg-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'wysiwyg-editor-styles';
    style.textContent = `
      /* ============================================================================ */
      /* WYSIWYG EDITOR - Dark Theme Matching IDE Design                              */
      /* ============================================================================ */
      
      .wysiwyg-editor {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
      }

      .wysiwyg-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
      }

      .wysiwyg-main {
        position: relative;
        width: 94%;
        height: 94%;
        margin: 3%;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 
          0 0 0 1px rgba(0, 0, 0, 0.1),
          0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* ============================================================================ */
      /* HEADER - Modern Fluent                                                       */
      /* ============================================================================ */
      
      .wysiwyg-header {
        background: linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%);
        border-bottom: 1px solid #d1d1d1;
        padding: 0 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 52px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
        max-width: 60%;
      }

      .file-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        overflow: visible;
      }

      .file-name {
        font-size: 13px;
        font-weight: 600;
        color: #1a1a1a;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-status {
        font-size: 11px;
        color: #666;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
        overflow: visible;
      }

      .file-status::before {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        min-width: 6px;
        border-radius: 50%;
        background: #999;
        flex-shrink: 0;
      }

      .file-status.editing {
        color: #d97706;
      }
      
      .file-status.editing::before {
        background: #f59e0b;
        box-shadow: 0 0 4px rgba(245, 158, 11, 0.4);
      }

      .file-status.saved {
        color: #059669;
      }
      
      .file-status.saved::before {
        background: #10b981;
        box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
      }

      .file-status.ready {
        color: #0067c0;
      }
      
      .file-status.ready::before {
        background: #0067c0;
        box-shadow: 0 0 4px rgba(0, 103, 192, 0.4);
      }

      .header-actions {
        display: flex !important;
        flex-direction: row !important;
        gap: 8px !important;
        align-items: center !important;
        flex-shrink: 0;
      }

      .btn-group {
        display: flex;
        flex-direction: row;
        gap: 2px;
        background: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 6px;
        padding: 3px 4px;
        flex-shrink: 0;
      }

      /* Icon-only buttons (undo, redo, close) */
      .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        min-width: 28px;
        background: transparent;
        border: none;
        border-radius: 4px;
        color: #666;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }

      .icon-btn:hover {
        background: #e5e5e5;
        color: #1a1a1a;
      }

      .icon-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .icon-btn:disabled:hover {
        background: transparent;
        color: #666;
      }

      .icon-btn svg {
        width: 14px;
        height: 14px;
      }

      /* Close button special styling */
      .close-btn {
        background: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 6px;
        width: 32px;
        height: 32px;
        min-width: 32px;
      }

      .close-btn:hover {
        background: #fde8e8;
        border-color: #f87171;
        color: #dc2626;
      }

      /* Action buttons with text (Save, Preview) - ISOLATED */
      .wysiwyg-action-btn {
        all: unset;
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 32px;
        padding: 0 16px;
        margin: 0;
        border: 1px solid transparent;
        border-radius: 6px;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
        box-sizing: border-box;
        position: static;
        transform: none;
      }

      .wysiwyg-action-btn svg {
        width: 14px;
        height: 14px;
        min-width: 14px;
        flex-shrink: 0;
      }

      .wysiwyg-action-btn span {
        line-height: 1;
      }

      /* Save button - Blue primary */
      .wysiwyg-save-btn {
        background: #0067c0;
        border-color: #0067c0;
        color: white;
      }

      .wysiwyg-save-btn:hover {
        background: #005ba1;
        border-color: #005ba1;
      }

      /* Preview button - Light secondary */
      .wysiwyg-preview-btn {
        background: #fff;
        border-color: #d1d1d1;
        color: #1a1a1a;
      }

      .wysiwyg-preview-btn:hover {
        background: #f5f5f5;
        border-color: #0067c0;
        color: #0067c0;
      }

      .header-divider {
        width: 1px;
        height: 20px;
        background: #d1d1d1;
        flex-shrink: 0;
      }

      /* ============================================================================ */
      /* RIBBON TABS - Modern Fluent                                                  */
      /* ============================================================================ */
      
      .ribbon-tabs {
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        gap: 4px;
        padding: 0 16px;
      }

      .ribbon-tab {
        background: transparent;
        border: none;
        padding: 10px 18px;
        color: #666;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        border-radius: 6px 6px 0 0;
        position: relative;
        margin-bottom: -1px;
      }

      .ribbon-tab:hover {
        background: #f0f0f0;
        color: #333;
      }

      .ribbon-tab.active {
        background: #fff;
        color: #0067c0;
        border: 1px solid #e5e5e5;
        border-bottom-color: #fff;
      }

      /* ============================================================================ */
      /* RIBBON CONTENT - Modern Fluent                                               */
      /* ============================================================================ */
      
      .ribbon-content {
        background: #fff;
        border-bottom: 1px solid #e5e5e5;
        padding: 10px 16px;
        min-height: 72px;
      }

      .ribbon-panel {
        display: none;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .ribbon-panel.active {
        display: flex;
      }

      .ribbon-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 8px;
      }

      .group-label {
        font-size: 9px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        padding: 0 2px;
      }

      .group-controls {
        display: flex;
        gap: 3px;
        align-items: center;
      }

      .ribbon-separator {
        width: 1px;
        height: 52px;
        background: #e5e5e5;
        margin: 0 8px;
      }

      .ribbon-btn {
        background: #f5f5f5;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 7px 10px;
        color: #333;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
      }

      .ribbon-btn:hover {
        background: #e8f4fc;
        border-color: #0067c0;
        color: #0067c0;
      }

      .ribbon-btn:active {
        background: #d0e8f7;
      }

      .ribbon-btn.active {
        background: #e8f4fc;
        border-color: #0067c0;
        color: #0067c0;
      }

      .ribbon-btn-large {
        flex-direction: column;
        padding: 8px 14px;
        gap: 4px;
        min-width: 60px;
        height: 52px;
      }

      .ribbon-btn-large span {
        font-size: 10px;
        font-weight: 500;
      }

      .compact-select {
        background: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 6px;
        padding: 6px 10px;
        color: #333;
        font-size: 12px;
        cursor: pointer;
        height: 32px;
        min-width: 90px;
      }

      .compact-select:hover {
        border-color: #0067c0;
      }

      .compact-select:focus {
        outline: none;
        border-color: #0067c0;
        box-shadow: 0 0 0 2px rgba(0, 103, 192, 0.15);
      }

      .compact-select option {
        background: #fff;
        color: #333;
      }

      .color-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        background: #f5f5f5;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 6px 10px;
        min-width: 32px;
        height: 32px;
        color: #333;
      }

      .color-btn:hover {
        background: #e8f4fc;
        border-color: #0067c0;
      }

      .color-btn input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }

      .color-indicator {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 3px;
        background: currentColor;
      }

      /* ============================================================================ */
      /* EDITOR WORKSPACE - Modern Fluent                                             */
      /* ============================================================================ */
      
      .editor-workspace {
        flex: 1;
        display: flex;
        overflow: hidden;
        background: #f5f5f5;
      }

      .editor-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .editor-container {
        flex: 1;
        position: relative;
        background: white;
        margin: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        border: none;
        overflow: auto;
      }

      .wysiwyg-iframe {
        position: absolute;
        width: 100%;
        height: 100%;
        border: none;
        background: white;
        display: none;
      }

      .wysiwyg-iframe.active {
        display: block;
      }

      .html-source-editor {
        position: absolute;
        width: 100%;
        height: 100%;
        padding: 16px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: none;
        font-family: 'Cascadia Code', 'Consolas', monospace;
        font-size: 13px;
        line-height: 1.6;
        resize: none;
        display: none;
      }

      /* ============================================================================ */
      /* INSPECTOR PANEL - Modern Fluent                                              */
      /* ============================================================================ */
      
      .inspector-panel {
        width: 280px;
        background: #fafafa;
        border-left: 1px solid #e5e5e5;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s;
      }

      .inspector-panel.collapsed {
        width: 0;
        min-width: 0;
      }

      .inspector-header {
        background: #fff;
        border-bottom: 1px solid #e5e5e5;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 44px;
      }

      .inspector-title {
        font-size: 13px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .inspector-toggle {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        transition: all 0.15s;
      }

      .inspector-toggle:hover {
        background: #e5e5e5;
        color: #1a1a1a;
      }

      .inspector-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
      }

      .inspector-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #888;
        padding: 40px 16px;
        height: 100%;
      }

      .inspector-empty svg {
        margin-bottom: 12px;
        opacity: 0.4;
        color: #ccc;
      }

      .inspector-empty p {
        font-size: 12px;
        margin: 0;
      }

      .prop-group {
        margin-bottom: 14px;
      }

      .prop-label {
        font-size: 11px;
        font-weight: 600;
        color: #666;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .prop-input, .prop-textarea {
        width: 100%;
        padding: 8px 12px;
        background: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 6px;
        color: #1a1a1a;
        font-size: 12px;
        font-family: inherit;
      }

      .prop-input:focus, .prop-textarea:focus {
        outline: none;
        border-color: #0067c0;
        box-shadow: 0 0 0 2px rgba(0, 103, 192, 0.15);
      }

      .prop-textarea {
        resize: vertical;
        min-height: 60px;
      }

      .prop-color {
        width: 100%;
        height: 36px;
        padding: 2px;
        border: 1px solid #d1d1d1;
        border-radius: 6px;
        cursor: pointer;
        background: #fff;
      }

      .prop-separator {
        height: 1px;
        background: #30363d;
        margin: 16px 0;
      }

      .prop-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .prop-btn {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #c9d1d9;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }

      .prop-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(139, 148, 158, 0.4);
      }

      .prop-btn-primary {
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: white;
        border-color: #06b6d4;
      }

      .prop-btn-primary:hover {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
      }

      .prop-btn-danger {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.3);
      }

      .prop-btn-danger:hover {
        background: rgba(239, 68, 68, 0.2);
      }

      /* ============================================================================ */
      /* STATUS BAR - Modern Fluent                                                   */
      /* ============================================================================ */
      
      .status-bar {
        background: #f5f5f5;
        border-top: 1px solid #e5e5e5;
        padding: 6px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 28px;
        font-size: 11px;
        color: #666;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-right {
        margin-left: auto;
      }

      /* ============================================================================ */
      /* SOURCE CODE MODAL - Modern Fluent                                            */
      /* ============================================================================ */
      
      .source-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
      }

      .source-modal-content {
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        width: 85%;
        max-width: 1000px;
        max-height: 85%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      }

      .source-modal-header {
        background: #f5f5f5;
        border-bottom: 1px solid #e5e5e5;
        padding: 14px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
        border-radius: 8px 8px 0 0;
      }

      .source-close {
        background: transparent;
        border: none;
        font-size: 24px;
        color: #8b949e;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .source-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e6edf3;
      }

      .source-textarea {
        flex: 1;
        padding: 20px;
        background: #010409;
        color: #c9d1d9;
        border: none;
        font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.6;
        resize: none;
      }

      .source-textarea:focus {
        outline: none;
      }

      .source-modal-footer {
        background: #161b22;
        border-top: 1px solid #30363d;
        padding: 14px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-radius: 0 0 12px 12px;
      }

      .source-btn {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #c9d1d9;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }

      .source-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .source-btn-primary {
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: white;
        border-color: #06b6d4;
      }

      .source-btn-primary:hover {
        background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
      }

      /* ============================================================================ */
      /* TOAST NOTIFICATIONS                                                          */
      /* ============================================================================ */
      
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #161b22;
        border: 1px solid #30363d;
        color: #e6edf3;
        padding: 14px 24px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        font-size: 13px;
        z-index: 1000001;
        opacity: 1;
        transition: opacity 0.3s;
      }

      .toast-success {
        background: rgba(16, 185, 129, 0.15);
        border-color: #10b981;
        color: #10b981;
      }

      .toast-error {
        background: rgba(239, 68, 68, 0.15);
        border-color: #ef4444;
        color: #f87171;
      }

      .toast-warning {
        background: rgba(245, 158, 11, 0.15);
        border-color: #f59e0b;
        color: #f59e0b;
      }

      /* ============================================================================ */
      /* SCROLLBAR                                                                    */
      /* ============================================================================ */
      
      ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }

      ::-webkit-scrollbar-track {
        background: #0d1117;
      }

      ::-webkit-scrollbar-thumb {
        background: #30363d;
        border-radius: 6px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #484f58;
      }

      /* ============================================================================ */
      /* RESPONSIVE                                                                   */
      /* ============================================================================ */
      
      @media (max-width: 1024px) {
        .inspector-panel {
          display: none;
        }
        
        .wysiwyg-main {
          width: 98%;
          height: 98%;
          margin: 1%;
        }
      }

      /* ============================================================================ */
      /* WORD DARK MODE THEME                                                         */
      /* ============================================================================ */
      
      [data-theme="dark"] {
        background: #1e1e1e;
      }

      [data-theme="dark"] .wysiwyg-header {
        background: linear-gradient(180deg, #1e1e1e 0%, #252526 100%);
        border-bottom-color: #3c3c3c;
      }

      [data-theme="dark"] .file-name {
        color: #e0e0e0;
      }

      [data-theme="dark"] .file-status {
        color: #969696;
      }

      [data-theme="dark"] .file-status::before {
        background: #969696;
      }

      [data-theme="dark"] .file-status.ready {
        color: #0078d4;
      }

      [data-theme="dark"] .file-status.ready::before {
        background: #0078d4;
        box-shadow: 0 0 4px rgba(0, 120, 212, 0.4);
      }

      [data-theme="dark"] .file-status.editing {
        color: #dcdcaa;
      }

      [data-theme="dark"] .file-status.editing::before {
        background: #dcdcaa;
        box-shadow: 0 0 4px rgba(220, 220, 170, 0.4);
      }

      [data-theme="dark"] .file-status.saved {
        color: #4ec9b0;
      }

      [data-theme="dark"] .file-status.saved::before {
        background: #4ec9b0;
        box-shadow: 0 0 4px rgba(78, 201, 176, 0.4);
      }

      [data-theme="dark"] .btn-group {
        background: #3c3c3c;
        border-color: #4a4a4a;
      }

      [data-theme="dark"] .icon-btn {
        color: #969696;
      }

      [data-theme="dark"] .icon-btn:hover {
        background: #4a4a4a;
        color: #e0e0e0;
      }

      [data-theme="dark"] .icon-btn:disabled {
        color: #5a5a5a;
      }

      [data-theme="dark"] .close-btn {
        background: #3c3c3c;
        border-color: #4a4a4a;
      }

      [data-theme="dark"] .close-btn:hover {
        background: #4a4a4a;
        border-color: #4a4a4a;
        color: #e0e0e0;
      }

      [data-theme="dark"] .header-divider {
        background: #3c3c3c;
      }

      [data-theme="dark"] .wysiwyg-save-btn {
        background: #0078d4;
        border-color: #0078d4;
      }

      [data-theme="dark"] .wysiwyg-save-btn:hover {
        background: #1a8ad4;
        border-color: #1a8ad4;
      }

      [data-theme="dark"] .wysiwyg-preview-btn {
        background: #3c3c3c;
        border-color: #4a4a4a;
        color: #e0e0e0;
      }

      [data-theme="dark"] .wysiwyg-preview-btn:hover {
        background: #4a4a4a;
        border-color: #0078d4;
        color: #0078d4;
      }

      [data-theme="dark"] .ribbon-tabs {
        background: #252526;
        border-bottom-color: #3c3c3c;
      }

      [data-theme="dark"] .ribbon-tab {
        color: #969696;
      }

      [data-theme="dark"] .ribbon-tab:hover {
        background: #2d2d2d;
        color: #e0e0e0;
      }

      [data-theme="dark"] .ribbon-tab.active {
        background: #2d2d2d;
        color: #0078d4;
        border-color: #3c3c3c;
        border-bottom-color: #2d2d2d;
      }

      [data-theme="dark"] .ribbon-content {
        background: #2d2d2d;
        border-bottom-color: #3c3c3c;
      }

      [data-theme="dark"] .group-label {
        color: #808080;
      }

      [data-theme="dark"] .ribbon-btn {
        background: #3c3c3c;
        border-color: #4a4a4a;
        color: #d4d4d4;
      }

      [data-theme="dark"] .ribbon-btn:hover {
        background: #094771;
        border-color: #0078d4;
        color: #fff;
      }

      [data-theme="dark"] .ribbon-btn.active {
        background: #094771;
        border-color: #0078d4;
        color: #fff;
      }

      [data-theme="dark"] .ribbon-separator {
        background: #3c3c3c;
      }

      [data-theme="dark"] .compact-select {
        background: #3c3c3c;
        border-color: #4a4a4a;
        color: #d4d4d4;
      }

      [data-theme="dark"] .compact-select:hover {
        border-color: #0078d4;
      }

      [data-theme="dark"] .compact-select:focus {
        border-color: #0078d4;
        box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
      }

      [data-theme="dark"] .compact-select option {
        background: #2d2d2d;
        color: #d4d4d4;
      }

      [data-theme="dark"] .color-btn {
        background: #3c3c3c;
        border-color: #4a4a4a;
        color: #d4d4d4;
      }

      [data-theme="dark"] .color-btn:hover {
        background: #094771;
        border-color: #0078d4;
      }

      [data-theme="dark"] .editor-workspace {
        background: #1e1e1e;
      }

      [data-theme="dark"] .editor-container {
        background: #252526;
        border: 1px solid #3c3c3c;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      [data-theme="dark"] .html-source-editor {
        background: #1e1e1e;
        color: #d4d4d4;
      }

      [data-theme="dark"] .inspector-panel {
        background: #252526;
        border-left-color: #3c3c3c;
      }

      [data-theme="dark"] .inspector-header {
        background: #2d2d2d;
        border-bottom-color: #3c3c3c;
      }

      [data-theme="dark"] .inspector-title {
        color: #e0e0e0;
      }

      [data-theme="dark"] .inspector-toggle {
        color: #969696;
      }

      [data-theme="dark"] .inspector-toggle:hover {
        background: #3c3c3c;
        color: #e0e0e0;
      }

      [data-theme="dark"] .inspector-empty {
        color: #808080;
      }

      [data-theme="dark"] .inspector-empty svg {
        color: #4a4a4a;
      }

      [data-theme="dark"] .prop-label {
        color: #808080;
      }

      [data-theme="dark"] .prop-input,
      [data-theme="dark"] .prop-textarea {
        background: #3c3c3c;
        border-color: #4a4a4a;
        color: #e0e0e0;
      }

      [data-theme="dark"] .prop-input:focus,
      [data-theme="dark"] .prop-textarea:focus {
        border-color: #0078d4;
        box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
      }

      [data-theme="dark"] .prop-color {
        background: #3c3c3c;
        border-color: #4a4a4a;
      }

      [data-theme="dark"] .status-bar {
        background: #007acc;
        border-top-color: #007acc;
        color: #fff;
      }

      [data-theme="dark"] .source-modal-content {
        background: #1e1e1e;
        border-color: #3c3c3c;
      }

      [data-theme="dark"] .source-modal-header {
        background: #252526;
        border-bottom-color: #3c3c3c;
        color: #e0e0e0;
      }

      /* Theme toggle button highlight */
      .theme-toggle-btn {
        position: relative;
      }

      [data-theme="dark"] .theme-toggle-btn {
        color: #dcdcaa;
      }
    `;

    document.head.appendChild(style);
  }
}

export function openWYSIWYGEditor(config: WYSIWYGConfig): WYSIWYGEditor {
  const editor = new WYSIWYGEditor(config);
  editor.open();
  return editor;
}
