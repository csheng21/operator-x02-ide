// ide/aiAssistant/storageSettingsManager.ts
// FIXED VERSION - Properly handles settings changes and notifies conversationManager
// ============================================================================

export interface StorageSettings {
  storageType: 'memory-only' | 'custom';
  customPath?: string;
  lastVerified?: number;  // Timestamp when path was last verified accessible
}

// Event types for settings changes
export type StorageSettingsEvent = 'settings-changed' | 'path-changed' | 'type-changed';

type SettingsChangeCallback = (settings: StorageSettings, event: StorageSettingsEvent) => void;

class StorageSettingsManager {
  private static instance: StorageSettingsManager;
  private settings: StorageSettings;
  private settingsKey = 'ai_storage_settings';
  private listeners: SettingsChangeCallback[] = [];
  private pathVerified: boolean = false;

  static getInstance(): StorageSettingsManager {
    if (!StorageSettingsManager.instance) {
      StorageSettingsManager.instance = new StorageSettingsManager();
    }
    return StorageSettingsManager.instance;
  }

  constructor() {
    this.settings = this.loadSettings();
    this.initFromRustConfig(); // patched
    
    // Verify path on startup if custom path is set
    if (this.settings.storageType === 'custom' && this.settings.customPath) {
      this.verifyPathAsync();
    }
    
    console.log('📁 StorageSettingsManager initialized:', this.settings);
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getSettings(): StorageSettings {
    return { ...this.settings };
  }

  getStoragePath(): string | null {
    if (this.settings.storageType === 'custom' && this.settings.customPath) {
      return this.settings.customPath;
    }
    return null;
  }

  getConversationFilePath(): string {
    const customPath = this.getStoragePath();
    if (customPath) {
      return `${customPath}/ai_conversations.json`;
    }
    return 'memory-only';
  }

  isCustomStorage(): boolean {
    return this.settings.storageType === 'custom' && !!this.settings.customPath;
  }

  isMemoryOnly(): boolean {
    return this.settings.storageType === 'memory-only';
  }

  // ==========================================================================
  // SETTERS WITH NOTIFICATIONS
  // ==========================================================================

  setStorageType(type: StorageSettings['storageType']): void {
    const oldType = this.settings.storageType;
    this.settings.storageType = type;
    this.saveSettings();
    
    if (oldType !== type) {
      console.log(`📁 Storage type changed: ${oldType} → ${type}`);
      this.notifyListeners('type-changed');
    }
  }

  setCustomPath(path: string): void {
    const oldPath = this.settings.customPath;
    const oldType = this.settings.storageType;
    
    this.settings.customPath = path;
    this.settings.storageType = 'custom';
    this.settings.lastVerified = Date.now();
    this.pathVerified = true;
    this.saveSettings();
    
    console.log(`📁 Custom path set: ${path}`);
    
    // Notify about path change
    if (oldPath !== path) {
      this.notifyListeners('path-changed');
    }
    
    // Also notify if type changed
    if (oldType !== 'custom') {
      this.notifyListeners('type-changed');
    }
    
    // Trigger immediate save of current conversations to new path
    this.triggerConversationMigration();
  }

  // ==========================================================================
  // PATH SELECTION DIALOG
  // ==========================================================================

  async selectCustomPath(): Promise<string | null> {
    try {
      if (!this.isTauriAvailable()) {
        console.warn('⚠️ Tauri not available for folder selection');
        this.showBrowserFallbackMessage();
        return null;
      }

      // Import the dialog plugin
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Conversation Storage Folder',
        defaultPath: this.settings.customPath
      });

      if (selected && typeof selected === 'string') {
        // Verify the path is writable
        const isWritable = await this.verifyPathWritable(selected);
        
        if (isWritable) {
          this.setCustomPath(selected);
          return selected;
        } else {
          console.error('❌ Selected path is not writable:', selected);
          this.showNotification('Selected folder is not writable. Please choose another folder.', 'error');
          return null;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Failed to select custom path:', error);
      this.showNotification('Failed to open folder picker: ' + (error as Error).message, 'error');
      return null;
    }
  }

  // ==========================================================================
  // PATH VERIFICATION
  // ==========================================================================

  // patched: default custom folder on first install
  private async initFromRustConfig(): Promise<void> {
    if (localStorage.getItem(this.settingsKey)) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const cfg = await invoke<{ mode: string; path: string }>('get_storage_config');
      if (cfg && cfg.mode === 'custom' && cfg.path) {
        this.settings = { storageType: 'custom', customPath: cfg.path, lastVerified: Date.now() };
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
        console.log('[StorageSettings] First install default:', cfg.path);
        this.notifyListeners('settings-changed');
        window.dispatchEvent(new CustomEvent('storage-settings-initialized', { detail: this.settings }));
      }
    } catch (e) { console.warn('[StorageSettings] initFromRustConfig:', e); }
  }

  private async verifyPathAsync(): Promise<void> {
    if (!this.settings.customPath) return;
    
    const isAccessible = await this.verifyPathWritable(this.settings.customPath);
    this.pathVerified = isAccessible;
    
    if (!isAccessible) {
      console.warn('⚠️ Custom path is not accessible:', this.settings.customPath);
      // Don't auto-reset - just warn the user
      this.showNotification(
        `Storage path is not accessible: ${this.settings.customPath}. Conversations may not be saved.`,
        'warning'
      );
    } else {
      console.log('✅ Custom path verified:', this.settings.customPath);
      this.settings.lastVerified = Date.now();
      this.saveSettings();
    }
  }

  private async verifyPathWritable(path: string): Promise<boolean> {
    if (!this.isTauriAvailable()) return false;
    
    try {
      const { invoke } = (window as any).__TAURI__.core || 
                          await import('@tauri-apps/api/core');
      
      // Try to check if path exists
      const exists = await invoke('path_exists', { path });
      if (!exists) {
        console.log('📁 Path does not exist, will be created:', path);
        return true; // Will be created on first save
      }
      
      // Try to check if it's a directory
      const isDir = await invoke('is_directory', { path });
      if (!isDir) {
        console.error('❌ Path is not a directory:', path);
        return false;
      }
      
      // Try a test write
      const testFile = `${path}/.write_test_${Date.now()}`;
      try {
        await invoke('write_file_content', { path: testFile, content: 'test' });
        await invoke('delete_path', { path: testFile });
        return true;
      } catch (writeError) {
        console.warn('Write test failed:', writeError);
        return false;
      }
      
    } catch (error) {
      console.warn('Path verification error:', error);
      return true; // Assume writable if we can't check
    }
  }

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  /**
   * Register a callback for settings changes
   */
  onChange(callback: SettingsChangeCallback): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(event: StorageSettingsEvent): void {
    const settings = this.getSettings();
    
    this.listeners.forEach(callback => {
      try {
        callback(settings, event);
      } catch (error) {
        console.error('Settings change listener error:', error);
      }
    });
    
    // Also dispatch a custom event for global listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storage-settings-changed', {
        detail: { settings, event }
      }));
    }
  }

  // ==========================================================================
  // CONVERSATION MIGRATION
  // ==========================================================================

  /**
   * Trigger migration of conversations to new storage location
   */
  private async triggerConversationMigration(): Promise<void> {
    console.log('🔄 Triggering conversation migration to new path...');
    
    // Dispatch event for conversationManager to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('migrate-conversations', {
        detail: {
          newPath: this.settings.customPath,
          storageType: this.settings.storageType
        }
      }));
      
      // Also try direct call if conversationManager is available
      const conversationManager = (window as any).conversationManager;
      if (conversationManager && typeof conversationManager.saveConversations === 'function') {
        setTimeout(async () => {
          try {
            await conversationManager.saveConversations();
            console.log('✅ Conversations migrated to new path');
            this.showNotification('Conversations saved to new location', 'success');
          } catch (error) {
            console.error('❌ Migration save failed:', error);
            this.showNotification('Failed to save conversations to new location', 'error');
          }
        }, 100);
      }
    }
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private saveSettings(): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
      console.log('Storage settings saved:', this.settings);
      // patched: sync to ~/OperatorX02/config/storage.json
      (async () => { try {
        const { invoke } = await import('@tauri-apps/api/core');
        const mode = this.settings.storageType === 'custom' ? 'custom' : 'memory';
        await invoke('save_storage_config', { mode, path: this.settings.customPath ?? null });
      } catch(e){} })();
    } catch (error) {
      console.error('Failed to save storage settings:', error);
    }
  }

  private loadSettings(): StorageSettings {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 Loaded storage settings:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Failed to load storage settings:', error);
    }

    console.log('📂 Using default storage settings (memory-only)');
    return {
      storageType: 'memory-only'
    };
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  resetToDefaults(): void {
    const oldSettings = { ...this.settings };
    
    this.settings = {
      storageType: 'memory-only'
    };
    this.pathVerified = false;
    this.saveSettings();
    
    console.log('🔄 Storage settings reset to defaults');
    
    // Notify about the change
    if (oldSettings.storageType !== 'memory-only' || oldSettings.customPath) {
      this.notifyListeners('type-changed');
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    // Try to use the app's notification system
    if (typeof window !== 'undefined') {
      const showNotification = (window as any).showNotification;
      if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
      }
    }
    
    // Fallback to console
    switch (type) {
      case 'error':
        console.error(`❌ ${message}`);
        break;
      case 'warning':
        console.warn(`⚠️ ${message}`);
        break;
      case 'success':
        console.log(`✅ ${message}`);
        break;
      default:
        console.log(`ℹ️ ${message}`);
    }
  }

  private showBrowserFallbackMessage(): void {
    alert('Folder selection is only available in the desktop app. Please run the application in Tauri.');
  }

  // ==========================================================================
  // DEBUG HELPERS
  // ==========================================================================

  debug(): void {
    console.log('═══════════════════════════════════════════════════════');
    console.log('STORAGE SETTINGS DEBUG');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Settings:', this.settings);
    console.log('Storage Type:', this.settings.storageType);
    console.log('Custom Path:', this.settings.customPath || '(not set)');
    console.log('Path Verified:', this.pathVerified);
    console.log('Last Verified:', this.settings.lastVerified 
      ? new Date(this.settings.lastVerified).toLocaleString() 
      : '(never)');
    console.log('File Path:', this.getConversationFilePath());
    console.log('Tauri Available:', this.isTauriAvailable());
    console.log('Listeners:', this.listeners.length);
    console.log('═══════════════════════════════════════════════════════');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const storageSettingsManager = StorageSettingsManager.getInstance();

// ============================================================================
// GLOBAL EVENT LISTENER SETUP
// ============================================================================

// Listen for migration events from conversationManager side
if (typeof window !== 'undefined') {
  // Expose for debugging
  (window as any).storageSettingsManager = storageSettingsManager;
  (window as any).debugStorageSettings = () => storageSettingsManager.debug();
  
  console.log('✅ StorageSettingsManager loaded');
  console.log('💡 Debug: window.debugStorageSettings()');
}
