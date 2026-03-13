// ============================================================================
// 🖼️ ASSET MANAGER PANEL - Operator X02 Code IDE
// ============================================================================
// Manages game assets: sprites, audio, fonts, tilemaps
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = 'sprite' | 'audio' | 'font' | 'tilemap' | 'data' | 'other';

export interface GameAsset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size: number;
  dimensions?: { width: number; height: number };
  duration?: number; // For audio
  thumbnail?: string;
  tags: string[];
  lastModified: Date;
}

export interface AssetFolder {
  name: string;
  path: string;
  assets: GameAsset[];
  subfolders: AssetFolder[];
}

// ============================================================================
// ASSET MANAGER CLASS
// ============================================================================

class AssetManagerPanel {
  private container: HTMLElement | null = null;
  private assets: GameAsset[] = [];
  private selectedAsset: GameAsset | null = null;
  private currentFilter: AssetType | 'all' = 'all';
  private searchQuery: string = '';
  private viewMode: 'grid' | 'list' = 'grid';

  constructor() {
    console.log('[AssetManager] ✅ Initialized');
  }

  // ==========================================================================
  // UI CREATION
  // ==========================================================================

  createPanel(parentElement: HTMLElement): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'am-panel';
    this.container.innerHTML = this.getPanelHTML();
    
    parentElement.appendChild(this.container);
    this.attachEventListeners();
    this.injectStyles();
    
    return this.container;
  }

  private getPanelHTML(): string {
    return `
      <div class="am-header">
        <div class="am-title">
          <span class="am-icon">🖼️</span>
          <span>ASSETS</span>
        </div>
        <div class="am-header-actions">
          <button class="am-btn am-btn-add" id="amAdd" title="Add Asset">
            ➕
          </button>
          <button class="am-btn am-btn-ai" id="amAI" title="Generate with AI">
            🤖
          </button>
          <button class="am-btn am-btn-refresh" id="amRefresh" title="Refresh">
            🔄
          </button>
        </div>
      </div>
      
      <div class="am-toolbar">
        <div class="am-search">
          <span class="am-search-icon">🔍</span>
          <input type="text" id="amSearch" placeholder="Search assets..." />
        </div>
        <div class="am-filters">
          <button class="am-filter active" data-filter="all">All</button>
          <button class="am-filter" data-filter="sprite">🖼️</button>
          <button class="am-filter" data-filter="audio">🔊</button>
          <button class="am-filter" data-filter="font">Aa</button>
          <button class="am-filter" data-filter="tilemap">🗺️</button>
        </div>
        <div class="am-view-toggle">
          <button class="am-view-btn active" data-view="grid" title="Grid View">⊞</button>
          <button class="am-view-btn" data-view="list" title="List View">☰</button>
        </div>
      </div>
      
      <div class="am-content" id="amContent">
        <div class="am-empty">
          <div class="am-empty-icon">📁</div>
          <div class="am-empty-text">No assets yet</div>
          <div class="am-empty-hint">Click ➕ to add assets or 🤖 to generate with AI</div>
        </div>
      </div>
      
      <div class="am-details" id="amDetails" style="display: none;">
        <div class="am-details-header">
          <span id="amDetailsTitle">Asset Details</span>
          <button class="am-details-close" id="amDetailsClose">✕</button>
        </div>
        <div class="am-details-content" id="amDetailsContent">
          <!-- Dynamic content -->
        </div>
      </div>
      
      <div class="am-footer">
        <span id="amAssetCount">0 assets</span>
        <span id="amTotalSize">0 KB</span>
      </div>
    `;
  }

  private injectStyles(): void {
    if (document.getElementById('am-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'am-styles';
    styles.textContent = `
      .am-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e1e2e;
        font-family: 'Segoe UI', sans-serif;
      }
      
      .am-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: #252536;
        border-bottom: 1px solid #333;
      }
      
      .am-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #00ff88;
        font-weight: 600;
        font-size: 13px;
      }
      
      .am-header-actions {
        display: flex;
        gap: 4px;
      }
      
      .am-btn {
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: #333;
        color: #ccc;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.15s;
      }
      
      .am-btn:hover {
        background: #444;
        color: #fff;
      }
      
      .am-btn-ai:hover { background: #6644aa; }
      .am-btn-add:hover { background: #00aa66; }
      
      .am-toolbar {
        display: flex;
        gap: 8px;
        padding: 10px 12px;
        background: #1e1e2e;
        border-bottom: 1px solid #333;
        align-items: center;
      }
      
      .am-search {
        flex: 1;
        display: flex;
        align-items: center;
        background: #252536;
        border-radius: 6px;
        padding: 0 10px;
      }
      
      .am-search-icon {
        font-size: 12px;
        opacity: 0.5;
      }
      
      .am-search input {
        flex: 1;
        background: none;
        border: none;
        padding: 8px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }
      
      .am-filters {
        display: flex;
        gap: 2px;
      }
      
      .am-filter {
        padding: 6px 10px;
        border: none;
        background: none;
        color: #888;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
      }
      
      .am-filter:hover {
        background: #333;
        color: #fff;
      }
      
      .am-filter.active {
        background: #00ff88;
        color: #000;
      }
      
      .am-view-toggle {
        display: flex;
        gap: 2px;
      }
      
      .am-view-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: none;
        color: #666;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
      }
      
      .am-view-btn:hover {
        background: #333;
        color: #fff;
      }
      
      .am-view-btn.active {
        background: #333;
        color: #00ff88;
      }
      
      .am-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }
      
      .am-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
        text-align: center;
      }
      
      .am-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
      
      .am-empty-text {
        font-size: 16px;
        margin-bottom: 8px;
      }
      
      .am-empty-hint {
        font-size: 13px;
        opacity: 0.7;
      }
      
      /* Grid View */
      .am-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 12px;
      }
      
      .am-asset-card {
        background: #252536;
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
      }
      
      .am-asset-card:hover {
        border-color: #444;
        transform: translateY(-2px);
      }
      
      .am-asset-card.selected {
        border-color: #00ff88;
        background: rgba(0, 255, 136, 0.1);
      }
      
      .am-asset-thumb {
        aspect-ratio: 1;
        background: #1a1a2a;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        overflow: hidden;
      }
      
      .am-asset-thumb img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
      }
      
      .am-asset-thumb-icon {
        font-size: 32px;
        opacity: 0.6;
      }
      
      .am-asset-name {
        font-size: 12px;
        color: #fff;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .am-asset-type {
        font-size: 10px;
        color: #666;
        text-align: center;
        margin-top: 2px;
      }
      
      /* List View */
      .am-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .am-asset-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: #252536;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }
      
      .am-asset-row:hover {
        background: #2a2a3a;
      }
      
      .am-asset-row.selected {
        background: rgba(0, 255, 136, 0.1);
        outline: 1px solid #00ff88;
      }
      
      .am-row-thumb {
        width: 40px;
        height: 40px;
        background: #1a1a2a;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      
      .am-row-thumb img {
        max-width: 100%;
        max-height: 100%;
        image-rendering: pixelated;
      }
      
      .am-row-info {
        flex: 1;
        min-width: 0;
      }
      
      .am-row-name {
        color: #fff;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .am-row-meta {
        color: #666;
        font-size: 11px;
        margin-top: 2px;
      }
      
      .am-row-size {
        color: #888;
        font-size: 12px;
      }
      
      /* Details Panel */
      .am-details {
        border-top: 1px solid #333;
        background: #252536;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .am-details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid #333;
        color: #fff;
        font-weight: 600;
        font-size: 13px;
      }
      
      .am-details-close {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 14px;
        padding: 4px;
      }
      
      .am-details-close:hover {
        color: #fff;
      }
      
      .am-details-content {
        padding: 12px;
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 8px;
        font-size: 12px;
      }
      
      .am-details-content .label {
        color: #666;
      }
      
      .am-details-content .value {
        color: #fff;
      }
      
      .am-details-preview {
        grid-column: span 2;
        background: #1a1a2a;
        border-radius: 8px;
        padding: 12px;
        display: flex;
        justify-content: center;
        margin-bottom: 8px;
      }
      
      .am-details-preview img {
        max-width: 150px;
        max-height: 150px;
        image-rendering: pixelated;
      }
      
      .am-details-actions {
        grid-column: span 2;
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      
      .am-details-btn {
        flex: 1;
        padding: 8px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s;
      }
      
      .am-details-btn-primary {
        background: #00ff88;
        color: #000;
      }
      
      .am-details-btn-secondary {
        background: #333;
        color: #fff;
      }
      
      .am-details-btn:hover {
        opacity: 0.9;
      }
      
      .am-footer {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        background: #252536;
        border-top: 1px solid #333;
        font-size: 11px;
        color: #666;
      }
      
      /* AI Generation Modal */
      .am-ai-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .am-ai-content {
        background: #1e1e2e;
        border-radius: 16px;
        width: 500px;
        max-width: 95vw;
        padding: 24px;
        border: 1px solid #333;
      }
      
      .am-ai-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .am-ai-header h3 {
        margin: 0;
        color: #fff;
      }
      
      .am-ai-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .am-ai-form label {
        color: #888;
        font-size: 13px;
        margin-bottom: 4px;
        display: block;
      }
      
      .am-ai-form input,
      .am-ai-form select,
      .am-ai-form textarea {
        width: 100%;
        background: #252536;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 10px 12px;
        color: #fff;
        font-size: 14px;
      }
      
      .am-ai-form input:focus,
      .am-ai-form select:focus,
      .am-ai-form textarea:focus {
        outline: none;
        border-color: #00ff88;
      }
      
      .am-ai-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      
      .am-ai-actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }
      
      .am-ai-actions button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      
      .am-ai-generate {
        background: linear-gradient(135deg, #6644aa 0%, #4422aa 100%);
        color: #fff;
      }
      
      .am-ai-cancel {
        background: #333;
        color: #fff;
      }
    `;
    document.head.appendChild(styles);
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  private attachEventListeners(): void {
    if (!this.container) return;

    // Add asset button
    this.container.querySelector('#amAdd')?.addEventListener('click', () => this.showAddAssetDialog());
    
    // AI generate button
    this.container.querySelector('#amAI')?.addEventListener('click', () => this.showAIGenerateModal());
    
    // Refresh button
    this.container.querySelector('#amRefresh')?.addEventListener('click', () => this.refreshAssets());
    
    // Search
    this.container.querySelector('#amSearch')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderAssets();
    });
    
    // Filters
    this.container.querySelectorAll('.am-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container?.querySelectorAll('.am-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter') as AssetType | 'all';
        this.renderAssets();
      });
    });
    
    // View toggle
    this.container.querySelectorAll('.am-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container?.querySelectorAll('.am-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.viewMode = btn.getAttribute('data-view') as 'grid' | 'list';
        this.renderAssets();
      });
    });
    
    // Details close
    this.container.querySelector('#amDetailsClose')?.addEventListener('click', () => {
      this.hideDetails();
    });
  }

  // ==========================================================================
  // ASSET MANAGEMENT
  // ==========================================================================

  async loadAssets(projectPath: string): Promise<void> {
    console.log('[AssetManager] Loading assets from:', projectPath);
    
    try {
      // Scan assets folder
      const assetsPath = `${projectPath}/assets`;
      const files = await this.scanDirectory(assetsPath);
      
      this.assets = files.map(file => this.fileToAsset(file));
      this.renderAssets();
      this.updateFooter();
      
      console.log('[AssetManager] Loaded', this.assets.length, 'assets');
    } catch (error) {
      console.error('[AssetManager] Error loading assets:', error);
    }
  }

  private async scanDirectory(path: string): Promise<string[]> {
    try {
      const entries = await invoke<string[]>('list_directory', { path });
      return entries;
    } catch (error) {
      return [];
    }
  }

  private fileToAsset(filePath: string): GameAsset {
    const name = filePath.split('/').pop() || filePath;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    
    let type: AssetType = 'other';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) type = 'sprite';
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio';
    else if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) type = 'font';
    else if (['json', 'tmx', 'tsx'].includes(ext)) type = 'tilemap';
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      path: filePath,
      size: 0,
      tags: [],
      lastModified: new Date()
    };
  }

  private getFilteredAssets(): GameAsset[] {
    let filtered = this.assets;
    
    // Apply type filter
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(a => a.type === this.currentFilter);
    }
    
    // Apply search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  private renderAssets(): void {
    const content = this.container?.querySelector('#amContent') as HTMLElement;
    if (!content) return;

    const filtered = this.getFilteredAssets();

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="am-empty">
          <div class="am-empty-icon">📁</div>
          <div class="am-empty-text">${this.assets.length === 0 ? 'No assets yet' : 'No matching assets'}</div>
          <div class="am-empty-hint">Click ➕ to add assets or 🤖 to generate with AI</div>
        </div>
      `;
      return;
    }

    if (this.viewMode === 'grid') {
      content.innerHTML = `
        <div class="am-grid">
          ${filtered.map(asset => this.renderAssetCard(asset)).join('')}
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="am-list">
          ${filtered.map(asset => this.renderAssetRow(asset)).join('')}
        </div>
      `;
    }

    // Add click listeners
    content.querySelectorAll('[data-asset-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-asset-id');
        const asset = this.assets.find(a => a.id === id);
        if (asset) this.selectAsset(asset);
      });
    });
  }

  private renderAssetCard(asset: GameAsset): string {
    const typeIcons: Record<AssetType, string> = {
      sprite: '🖼️',
      audio: '🔊',
      font: 'Aa',
      tilemap: '🗺️',
      data: '📄',
      other: '📁'
    };

    return `
      <div class="am-asset-card ${this.selectedAsset?.id === asset.id ? 'selected' : ''}" 
           data-asset-id="${asset.id}">
        <div class="am-asset-thumb">
          ${asset.type === 'sprite' && asset.thumbnail 
            ? `<img src="${asset.thumbnail}" alt="${asset.name}" />`
            : `<span class="am-asset-thumb-icon">${typeIcons[asset.type]}</span>`
          }
        </div>
        <div class="am-asset-name">${asset.name}</div>
        <div class="am-asset-type">${asset.type}</div>
      </div>
    `;
  }

  private renderAssetRow(asset: GameAsset): string {
    const typeIcons: Record<AssetType, string> = {
      sprite: '🖼️',
      audio: '🔊',
      font: 'Aa',
      tilemap: '🗺️',
      data: '📄',
      other: '📁'
    };

    return `
      <div class="am-asset-row ${this.selectedAsset?.id === asset.id ? 'selected' : ''}" 
           data-asset-id="${asset.id}">
        <div class="am-row-thumb">
          ${asset.type === 'sprite' && asset.thumbnail 
            ? `<img src="${asset.thumbnail}" alt="${asset.name}" />`
            : `<span>${typeIcons[asset.type]}</span>`
          }
        </div>
        <div class="am-row-info">
          <div class="am-row-name">${asset.name}</div>
          <div class="am-row-meta">${asset.type}${asset.dimensions ? ` • ${asset.dimensions.width}×${asset.dimensions.height}` : ''}</div>
        </div>
        <div class="am-row-size">${this.formatSize(asset.size)}</div>
      </div>
    `;
  }

  private selectAsset(asset: GameAsset): void {
    this.selectedAsset = asset;
    this.renderAssets();
    this.showDetails(asset);
  }

  private showDetails(asset: GameAsset): void {
    const details = this.container?.querySelector('#amDetails') as HTMLElement;
    const content = this.container?.querySelector('#amDetailsContent') as HTMLElement;
    const title = this.container?.querySelector('#amDetailsTitle') as HTMLElement;
    
    if (!details || !content || !title) return;

    title.textContent = asset.name;
    details.style.display = 'block';

    content.innerHTML = `
      ${asset.type === 'sprite' && asset.thumbnail ? `
        <div class="am-details-preview">
          <img src="${asset.thumbnail}" alt="${asset.name}" />
        </div>
      ` : ''}
      <div class="label">Type:</div>
      <div class="value">${asset.type}</div>
      <div class="label">Size:</div>
      <div class="value">${this.formatSize(asset.size)}</div>
      ${asset.dimensions ? `
        <div class="label">Dimensions:</div>
        <div class="value">${asset.dimensions.width} × ${asset.dimensions.height}</div>
      ` : ''}
      ${asset.duration ? `
        <div class="label">Duration:</div>
        <div class="value">${asset.duration.toFixed(2)}s</div>
      ` : ''}
      <div class="label">Path:</div>
      <div class="value" style="word-break: break-all; font-size: 11px;">${asset.path}</div>
      <div class="am-details-actions">
        <button class="am-details-btn am-details-btn-primary" onclick="window.assetManager.openAsset('${asset.id}')">Open</button>
        <button class="am-details-btn am-details-btn-secondary" onclick="window.assetManager.copyAssetPath('${asset.id}')">Copy Path</button>
        <button class="am-details-btn am-details-btn-secondary" onclick="window.assetManager.deleteAsset('${asset.id}')">Delete</button>
      </div>
    `;
  }

  private hideDetails(): void {
    const details = this.container?.querySelector('#amDetails') as HTMLElement;
    if (details) details.style.display = 'none';
    this.selectedAsset = null;
    this.renderAssets();
  }

  private updateFooter(): void {
    const countEl = this.container?.querySelector('#amAssetCount') as HTMLElement;
    const sizeEl = this.container?.querySelector('#amTotalSize') as HTMLElement;
    
    if (countEl) countEl.textContent = `${this.assets.length} assets`;
    if (sizeEl) {
      const totalSize = this.assets.reduce((sum, a) => sum + a.size, 0);
      sizeEl.textContent = this.formatSize(totalSize);
    }
  }

  // ==========================================================================
  // AI GENERATION
  // ==========================================================================

  private showAIGenerateModal(): void {
    const modal = document.createElement('div');
    modal.className = 'am-ai-modal';
    modal.innerHTML = `
      <div class="am-ai-content">
        <div class="am-ai-header">
          <span style="font-size: 32px;">🤖</span>
          <h3>Generate Asset with AI</h3>
        </div>
        
        <div class="am-ai-form">
          <div>
            <label>Asset Type</label>
            <select id="aiAssetType">
              <option value="sprite">Sprite / Character</option>
              <option value="tileset">Tileset</option>
              <option value="icon">Icon / Item</option>
              <option value="background">Background</option>
              <option value="ui">UI Element</option>
            </select>
          </div>
          
          <div>
            <label>Description</label>
            <textarea id="aiDescription" rows="3" placeholder="A pixel art knight character with sword and shield, 32x32, side view..."></textarea>
          </div>
          
          <div class="am-ai-options">
            <div>
              <label>Style</label>
              <select id="aiStyle">
                <option value="pixel-16">Pixel Art (16-bit)</option>
                <option value="pixel-32">Pixel Art (32-bit)</option>
                <option value="pixel-64">Pixel Art (64-bit)</option>
                <option value="hand-drawn">Hand Drawn</option>
                <option value="vector">Vector / Flat</option>
              </select>
            </div>
            <div>
              <label>Size</label>
              <select id="aiSize">
                <option value="16">16 × 16</option>
                <option value="32" selected>32 × 32</option>
                <option value="64">64 × 64</option>
                <option value="128">128 × 128</option>
                <option value="256">256 × 256</option>
              </select>
            </div>
          </div>
          
          <div class="am-ai-actions">
            <button class="am-ai-cancel" onclick="this.closest('.am-ai-modal').remove()">Cancel</button>
            <button class="am-ai-generate" onclick="window.assetManager.generateWithAI()">✨ Generate</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  async generateWithAI(): Promise<void> {
    const modal = document.querySelector('.am-ai-modal');
    const type = (modal?.querySelector('#aiAssetType') as HTMLSelectElement)?.value;
    const description = (modal?.querySelector('#aiDescription') as HTMLTextAreaElement)?.value;
    const style = (modal?.querySelector('#aiStyle') as HTMLSelectElement)?.value;
    const size = (modal?.querySelector('#aiSize') as HTMLSelectElement)?.value;

    console.log('[AssetManager] Generating AI asset:', { type, description, style, size });

    // Here you would call your AI image generation API
    // For now, show a placeholder message
    alert(`AI sprite generation would create:\n\nType: ${type}\nDescription: ${description}\nStyle: ${style}\nSize: ${size}×${size}\n\nThis feature requires API integration with DALL-E, Stable Diffusion, or similar.`);
    
    modal?.remove();
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async showAddAssetDialog(): Promise<void> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const files = await open({
        multiple: true,
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] },
          { name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (files) {
        console.log('[AssetManager] Adding files:', files);
        // Copy files to assets folder and refresh
      }
    } catch (e) {
      console.log('File picker not available');
    }
  }

  refreshAssets(): void {
    const projectPath = (window as any).currentProjectPath;
    if (projectPath) {
      this.loadAssets(projectPath);
    }
  }

  openAsset(id: string): void {
    const asset = this.assets.find(a => a.id === id);
    if (asset) {
      console.log('[AssetManager] Opening asset:', asset.path);
      // Emit event to open in editor
    }
  }

  copyAssetPath(id: string): void {
    const asset = this.assets.find(a => a.id === id);
    if (asset) {
      navigator.clipboard.writeText(asset.path);
    }
  }

  deleteAsset(id: string): void {
    if (confirm('Delete this asset?')) {
      const asset = this.assets.find(a => a.id === id);
      if (asset) {
        console.log('[AssetManager] Deleting asset:', asset.path);
        this.assets = this.assets.filter(a => a.id !== id);
        this.hideDetails();
        this.renderAssets();
        this.updateFooter();
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const assetManager = new AssetManagerPanel();
(window as any).assetManager = assetManager;

console.log('[AssetManagerPanel] Module loaded');
