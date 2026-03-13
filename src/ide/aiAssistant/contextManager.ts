// contextManager.ts - File Tracking & Context Management System
// Tracks opened files, modifications, and decisions for AI context awareness

export interface TrackedFile {
  path: string;
  name: string;
  extension: string;
  language: string;
  openedAt: number;
  lastModified: number;
  modificationCount: number;
  lineCount: number;
  size: number;
  isActive: boolean;
}

export interface Decision {
  id: string;
  type: 'create' | 'modify' | 'delete' | 'refactor' | 'rename' | 'move' | 'ai-suggestion' | 'user-action';
  description: string;
  filePath?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ProjectContext {
  projectName: string;
  projectPath: string;
  createdAt: number;
  lastUpdated: number;
}

export interface ContextStatus {
  enabled: boolean;
  filesTracked: number;
  decisionsCount: number;
  lastActivity: number;
  activityMessage: string;
}

class ContextManager {
  private trackedFiles: Map<string, TrackedFile> = new Map();
  private decisions: Decision[] = [];
  private projectContext: ProjectContext | null = null;
  private enabled: boolean = true;
  private lastActivity: number = Date.now();
  private activityMessage: string = 'Initializing...';
  private maxDecisions: number = 100;
  private storageKey: string = 'contextManagerData';
  
  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.exposeGlobally();
    console.log('✅ ContextManager initialized');
  }
  
  // =========================================================================
  // GLOBAL EXPOSURE
  // =========================================================================
  
  private exposeGlobally(): void {
    const w = window as any;
    w.contextManager = {
      // File tracking
      trackFile: this.trackFile.bind(this),
      untrackFile: this.untrackFile.bind(this),
      updateFile: this.updateFile.bind(this),
      getTrackedFiles: this.getTrackedFiles.bind(this),
      getTrackedFilesCount: this.getTrackedFilesCount.bind(this),
      isFileTracked: this.isFileTracked.bind(this),
      setActiveFile: this.setActiveFile.bind(this),
      getActiveFile: this.getActiveFile.bind(this),
      
      // Decisions
      addDecision: this.addDecision.bind(this),
      getDecisions: this.getDecisions.bind(this),
      getRecentDecisions: this.getRecentDecisions.bind(this),
      clearDecisions: this.clearDecisions.bind(this),
      
      // Project context
      setProjectContext: this.setProjectContext.bind(this),
      getProjectContext: this.getProjectContext.bind(this),
      clearProjectContext: this.clearProjectContext.bind(this),
      
      // Status
      getStatus: this.getStatus.bind(this),
      enable: this.enable.bind(this),
      disable: this.disable.bind(this),
      isEnabled: this.isEnabled.bind(this),
      
      // Context operations
      clearContext: this.clearContext.bind(this),
      exportContext: this.exportContext.bind(this),
      getContextSummary: this.getContextSummary.bind(this),
      
      // File type stats
      getFileTypeDistribution: this.getFileTypeDistribution.bind(this),
    };
  }
  
  // =========================================================================
  // FILE TRACKING
  // =========================================================================
  
  public trackFile(filePath: string, metadata?: Partial<TrackedFile>): TrackedFile {
    if (!this.enabled) return this.createEmptyTrackedFile(filePath);
    
    const existing = this.trackedFiles.get(filePath);
    if (existing) {
      existing.lastModified = Date.now();
      existing.isActive = true;
      this.saveToStorage();
      return existing;
    }
    
    const fileName = this.extractFileName(filePath);
    const extension = this.extractExtension(filePath);
    
    const trackedFile: TrackedFile = {
      path: filePath,
      name: fileName,
      extension: extension,
      language: this.getLanguageFromExtension(extension),
      openedAt: Date.now(),
      lastModified: Date.now(),
      modificationCount: 0,
      lineCount: metadata?.lineCount || 0,
      size: metadata?.size || 0,
      isActive: true,
      ...metadata
    };
    
    this.trackedFiles.set(filePath, trackedFile);
    this.updateActivity(`Tracking: ${fileName}`);
    this.addDecision({
      id: this.generateId(),
      type: 'create',
      description: `Started tracking file: ${fileName}`,
      filePath: filePath,
      timestamp: Date.now()
    });
    
    this.saveToStorage();
    this.dispatchEvent('fileTracked', trackedFile);
    
    return trackedFile;
  }
  
  public untrackFile(filePath: string): boolean {
    const file = this.trackedFiles.get(filePath);
    if (file) {
      this.trackedFiles.delete(filePath);
      this.updateActivity(`Untracked: ${file.name}`);
      this.saveToStorage();
      this.dispatchEvent('fileUntracked', { path: filePath });
      return true;
    }
    return false;
  }
  
  public updateFile(filePath: string, updates: Partial<TrackedFile>): TrackedFile | null {
    const file = this.trackedFiles.get(filePath);
    if (file) {
      Object.assign(file, updates, { lastModified: Date.now() });
      file.modificationCount++;
      this.updateActivity(`Modified: ${file.name}`);
      this.saveToStorage();
      this.dispatchEvent('fileUpdated', file);
      return file;
    }
    return null;
  }
  
  public getTrackedFiles(): TrackedFile[] {
    return Array.from(this.trackedFiles.values());
  }
  
  public getTrackedFilesCount(): number {
    return this.trackedFiles.size;
  }
  
  public isFileTracked(filePath: string): boolean {
    return this.trackedFiles.has(filePath);
  }
  
  public setActiveFile(filePath: string): void {
    // Deactivate all files
    this.trackedFiles.forEach(file => {
      file.isActive = false;
    });
    
    // Activate the specified file
    const file = this.trackedFiles.get(filePath);
    if (file) {
      file.isActive = true;
      this.updateActivity(`Active: ${file.name}`);
    } else {
      // Auto-track if not tracked
      this.trackFile(filePath);
    }
    
    this.saveToStorage();
    this.dispatchEvent('activeFileChanged', { path: filePath });
  }
  
  public getActiveFile(): TrackedFile | null {
    for (const file of this.trackedFiles.values()) {
      if (file.isActive) return file;
    }
    return null;
  }
  
  // =========================================================================
  // DECISIONS TRACKING
  // =========================================================================
  
  public addDecision(decision: Decision): void {
    if (!this.enabled) return;
    
    this.decisions.unshift(decision);
    
    // Keep only recent decisions
    if (this.decisions.length > this.maxDecisions) {
      this.decisions = this.decisions.slice(0, this.maxDecisions);
    }
    
    this.updateActivity(decision.description);
    this.saveToStorage();
    this.dispatchEvent('decisionAdded', decision);
  }
  
  public getDecisions(): Decision[] {
    return [...this.decisions];
  }
  
  public getRecentDecisions(count: number = 10): Decision[] {
    return this.decisions.slice(0, count);
  }
  
  public clearDecisions(): void {
    this.decisions = [];
    this.saveToStorage();
    this.dispatchEvent('decisionsCleared', null);
  }
  
  // =========================================================================
  // PROJECT CONTEXT
  // =========================================================================
  
  public setProjectContext(name: string, path: string): void {
    this.projectContext = {
      projectName: name,
      projectPath: path,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    this.updateActivity(`Project: ${name}`);
    this.addDecision({
      id: this.generateId(),
      type: 'user-action',
      description: `Set project context: ${name}`,
      timestamp: Date.now(),
      metadata: { projectPath: path }
    });
    
    this.saveToStorage();
    this.dispatchEvent('projectContextChanged', this.projectContext);
  }
  
  public getProjectContext(): ProjectContext | null {
    return this.projectContext;
  }
  
  public clearProjectContext(): void {
    this.projectContext = null;
    this.saveToStorage();
    this.dispatchEvent('projectContextCleared', null);
  }
  
  // =========================================================================
  // STATUS & CONTROL
  // =========================================================================
  
  public getStatus(): ContextStatus {
    return {
      enabled: this.enabled,
      filesTracked: this.trackedFiles.size,
      decisionsCount: this.decisions.length,
      lastActivity: this.lastActivity,
      activityMessage: this.activityMessage
    };
  }
  
  public enable(): void {
    this.enabled = true;
    this.updateActivity('Context tracking enabled');
    this.saveToStorage();
    this.dispatchEvent('contextEnabled', null);
  }
  
  public disable(): void {
    this.enabled = false;
    this.updateActivity('Context tracking disabled');
    this.saveToStorage();
    this.dispatchEvent('contextDisabled', null);
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  // =========================================================================
  // CONTEXT OPERATIONS
  // =========================================================================
  
  public clearContext(): void {
    this.trackedFiles.clear();
    this.decisions = [];
    this.projectContext = null;
    this.updateActivity('Context cleared');
    this.saveToStorage();
    this.dispatchEvent('contextCleared', null);
  }
  
  public exportContext(): object {
    return {
      timestamp: Date.now(),
      project: this.projectContext,
      trackedFiles: this.getTrackedFiles(),
      decisions: this.decisions,
      status: this.getStatus()
    };
  }
  
  public getContextSummary(): string {
    const files = this.getTrackedFiles();
    const activeFile = this.getActiveFile();
    
    let summary = '## Current Context\n\n';
    
    if (this.projectContext) {
      summary += `**Project:** ${this.projectContext.projectName}\n`;
      summary += `**Path:** ${this.projectContext.projectPath}\n\n`;
    }
    
    summary += `**Files Tracked:** ${files.length}\n`;
    summary += `**Recent Decisions:** ${this.decisions.length}\n\n`;
    
    if (activeFile) {
      summary += `**Active File:** ${activeFile.name}\n`;
      summary += `**Language:** ${activeFile.language}\n\n`;
    }
    
    if (files.length > 0) {
      summary += '### Tracked Files\n';
      files.slice(0, 10).forEach(file => {
        summary += `- ${file.name} (${file.language})\n`;
      });
    }
    
    return summary;
  }
  
  public getFileTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    this.trackedFiles.forEach(file => {
      const ext = file.extension || 'unknown';
      distribution[ext] = (distribution[ext] || 0) + 1;
    });
    
    return distribution;
  }
  
  // =========================================================================
  // STORAGE
  // =========================================================================
  
  private saveToStorage(): void {
    try {
      const data = {
        enabled: this.enabled,
        trackedFiles: Array.from(this.trackedFiles.entries()),
        decisions: this.decisions,
        projectContext: this.projectContext,
        lastActivity: this.lastActivity,
        activityMessage: this.activityMessage
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save context to storage:', e);
    }
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.enabled = data.enabled ?? true;
        this.trackedFiles = new Map(data.trackedFiles || []);
        this.decisions = data.decisions || [];
        this.projectContext = data.projectContext || null;
        this.lastActivity = data.lastActivity || Date.now();
        this.activityMessage = data.activityMessage || 'Loaded from storage';
      }
    } catch (e) {
      console.warn('Failed to load context from storage:', e);
    }
  }
  
  // =========================================================================
  // EVENT LISTENERS - Auto-track Monaco editor files
  // =========================================================================
  
  private setupEventListeners(): void {
    // Listen for Monaco editor file changes
    window.addEventListener('monaco-file-opened', ((e: CustomEvent) => {
      const { filePath, content } = e.detail || {};
      if (filePath) {
        this.trackFile(filePath, {
          lineCount: content ? content.split('\n').length : 0,
          size: content ? new Blob([content]).size : 0
        });
      }
    }) as EventListener);
    
    window.addEventListener('monaco-file-changed', ((e: CustomEvent) => {
      const { filePath, content } = e.detail || {};
      if (filePath) {
        this.updateFile(filePath, {
          lineCount: content ? content.split('\n').length : 0,
          size: content ? new Blob([content]).size : 0
        });
      }
    }) as EventListener);
    
    window.addEventListener('monaco-file-saved', ((e: CustomEvent) => {
      const { filePath } = e.detail || {};
      if (filePath) {
        const file = this.trackedFiles.get(filePath);
        if (file) {
          this.addDecision({
            id: this.generateId(),
            type: 'modify',
            description: `Saved: ${file.name}`,
            filePath: filePath,
            timestamp: Date.now()
          });
        }
      }
    }) as EventListener);
    
    // Listen for file explorer events
    window.addEventListener('file-explorer-open', ((e: CustomEvent) => {
      const { filePath } = e.detail || {};
      if (filePath) {
        this.trackFile(filePath);
      }
    }) as EventListener);
    
    // Listen for tab changes
    window.addEventListener('editor-tab-changed', ((e: CustomEvent) => {
      const { filePath } = e.detail || {};
      if (filePath) {
        this.setActiveFile(filePath);
      }
    }) as EventListener);
    
    // Listen for AI suggestions applied
    window.addEventListener('ai-suggestion-applied', ((e: CustomEvent) => {
      const { description, filePath } = e.detail || {};
      this.addDecision({
        id: this.generateId(),
        type: 'ai-suggestion',
        description: description || 'AI suggestion applied',
        filePath: filePath,
        timestamp: Date.now()
      });
    }) as EventListener);
    
    // Periodic activity update
    setInterval(() => {
      if (this.enabled) {
        const elapsed = Date.now() - this.lastActivity;
        if (elapsed > 30000) { // 30 seconds of inactivity
          this.activityMessage = 'Monitoring...';
        }
      }
    }, 10000);
  }
  
  // =========================================================================
  // UTILITIES
  // =========================================================================
  
  private updateActivity(message: string): void {
    this.lastActivity = Date.now();
    this.activityMessage = message;
    this.dispatchEvent('activityUpdated', { message, timestamp: this.lastActivity });
  }
  
  private dispatchEvent(eventName: string, detail: any): void {
    window.dispatchEvent(new CustomEvent(`context-${eventName}`, { detail }));
  }
  
  private generateId(): string {
    return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private extractFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
  }
  
  private extractExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }
  
  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'js': 'JavaScript',
      'jsx': 'JavaScript React',
      'py': 'Python',
      'rs': 'Rust',
      'go': 'Go',
      'java': 'Java',
      'kt': 'Kotlin',
      'cs': 'C#',
      'cpp': 'C++',
      'c': 'C',
      'h': 'C Header',
      'hpp': 'C++ Header',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'less': 'LESS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'ps1': 'PowerShell',
      'vue': 'Vue',
      'svelte': 'Svelte',
      'php': 'PHP',
      'rb': 'Ruby',
      'swift': 'Swift',
      'dart': 'Dart',
      'r': 'R',
      'lua': 'Lua',
      'toml': 'TOML',
      'ini': 'INI',
      'cfg': 'Config',
      'env': 'Environment',
      'dockerfile': 'Dockerfile',
      'makefile': 'Makefile',
    };
    
    return languageMap[ext] || ext.toUpperCase() || 'Unknown';
  }
  
  private createEmptyTrackedFile(filePath: string): TrackedFile {
    return {
      path: filePath,
      name: this.extractFileName(filePath),
      extension: this.extractExtension(filePath),
      language: 'Unknown',
      openedAt: 0,
      lastModified: 0,
      modificationCount: 0,
      lineCount: 0,
      size: 0,
      isActive: false
    };
  }
}

// Create and export singleton instance
export const contextManager = new ContextManager();

// Auto-initialize when module loads
export function initContextManager(): void {
  console.log('📁 Context Manager ready');
  console.log('   - Track files: window.contextManager.trackFile(path)');
  console.log('   - Add decision: window.contextManager.addDecision({...})');
  console.log('   - Get status: window.contextManager.getStatus()');
}

// Initialize immediately
initContextManager();
