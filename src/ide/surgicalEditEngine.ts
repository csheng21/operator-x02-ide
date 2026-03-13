// src/ide/surgicalEditEngine.ts
// ============================================================================
// 🔬 SURGICAL EDIT ENGINE - Frontend Module for Operator X02 Code IDE
// ============================================================================
// TypeScript wrapper for the Rust surgical edit backend commands.
// Provides: AI-integrated editing pipeline, diff UI, verification,
// and one-call convenience methods for the AI assistant roles.
// ============================================================================

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// TYPES (mirrors Rust structs)
// ============================================================================

export interface SearchMatch {
  file_path: string;
  line_number: number;
  line_content: string;
  trimmed_content: string;
  context_before: string[];
  context_after: string[];
}

export interface BlockBoundary {
  start_line: number;
  end_line: number;
  total_lines: number;
  preview: string[];
  block_type: string;
}

export interface CodeSymbol {
  name: string;
  line_number: number;
  symbol_type: string;
  preview: string;
}

export interface FileReconReport {
  file_path: string;
  file_size: number;
  total_lines: number;
  functions: CodeSymbol[];
  classes: CodeSymbol[];
  imports: CodeSymbol[];
  exports: CodeSymbol[];
}

export interface EditResult {
  success: boolean;
  message: string;
  file_path: string;
  lines_before: number;
  lines_after: number;
  bytes_before: number;
  bytes_after: number;
  backup_path: string | null;
  changes_applied: ChangeRecord[];
}

export interface ChangeRecord {
  strategy: string;
  start_line: number;
  end_line: number;
  lines_removed: number;
  lines_added: number;
  description: string;
}

export interface VerifyResult {
  file_exists: boolean;
  file_size: number;
  total_lines: number;
  duplicates: DuplicateInfo[];
  syntax_issues: string[];
  changed_lines: LineInfo[];
}

export interface DuplicateInfo {
  pattern: string;
  count: number;
  line_numbers: number[];
}

export interface LineInfo {
  line_number: number;
  content: string;
}

export interface DiffPreview {
  file_path: string;
  strategy: string;
  old_lines: LineInfo[];
  new_lines: string[];
  start_line: number;
  end_line: number;
  context_before: LineInfo[];
  context_after: LineInfo[];
}

export type EditStrategy = 'line_replace' | 'block_replace' | 'string_replace' | 'insert' | 'remove';
export type InsertPosition = 'before' | 'after';

export interface EditRequest {
  file_path: string;
  strategy: EditStrategy;
  search_pattern?: string;
  search_pattern_secondary?: string;
  start_line?: number;
  end_line?: number;
  new_content: string;
  old_content?: string;
  dry_run: boolean;
  create_backup: boolean;
  insert_position?: InsertPosition;
}

export interface BatchEditRequest {
  file_path: string;
  edits: SingleEdit[];
  dry_run: boolean;
  create_backup: boolean;
}

export interface SingleEdit {
  strategy: EditStrategy;
  search_pattern?: string;
  search_pattern_secondary?: string;
  start_line?: number;
  end_line?: number;
  new_content: string;
  old_content?: string;
  insert_position?: InsertPosition;
  description?: string;
}

// ============================================================================
// CORE ENGINE CLASS
// ============================================================================

export class SurgicalEditEngine {
  private static instance: SurgicalEditEngine;
  private editHistory: EditResult[] = [];
  private maxHistory = 50;

  static getInstance(): SurgicalEditEngine {
    if (!SurgicalEditEngine.instance) {
      SurgicalEditEngine.instance = new SurgicalEditEngine();
    }
    return SurgicalEditEngine.instance;
  }

  // ========================================================================
  // PHASE 1: RECONNAISSANCE
  // ========================================================================

  /**
   * Full file reconnaissance - get structure, symbols, metadata
   */
  async recon(filePath: string): Promise<FileReconReport> {
    console.log(`🔬 [SurgicalEdit] Recon: ${filePath}`);
    return await invoke('surgical_recon', { filePath });
  }

  /**
   * Search for a pattern in a single file
   */
  async search(
    filePath: string,
    pattern: string,
    options?: { maxResults?: number; caseSensitive?: boolean }
  ): Promise<SearchMatch[]> {
    console.log(`🔍 [SurgicalEdit] Search: "${pattern}" in ${filePath}`);
    return await invoke('surgical_search', {
      filePath,
      pattern,
      maxResults: options?.maxResults ?? 50,
      caseSensitive: options?.caseSensitive ?? false,
    });
  }

  /**
   * Search across multiple files in a directory
   */
  async searchFiles(
    directory: string,
    pattern: string,
    options?: { fileExtensions?: string[]; maxResults?: number; maxDepth?: number }
  ): Promise<SearchMatch[]> {
    console.log(`🔍 [SurgicalEdit] Multi-search: "${pattern}" in ${directory}`);
    return await invoke('surgical_search_files', {
      directory,
      pattern,
      fileExtensions: options?.fileExtensions,
      maxResults: options?.maxResults ?? 100,
      maxDepth: options?.maxDepth ?? 10,
    });
  }

  /**
   * Read specific line ranges
   */
  async readLines(filePath: string, startLine: number, endLine: number): Promise<LineInfo[]> {
    return await invoke('surgical_read_lines', { filePath, startLine, endLine });
  }

  /**
   * Find block boundaries (function, class, HTML template, etc.)
   */
  async findBlock(
    filePath: string,
    startPattern: string,
    options?: { endPattern?: string; nearLine?: number; maxSearchRange?: number }
  ): Promise<BlockBoundary> {
    console.log(`🔍 [SurgicalEdit] Find block: "${startPattern}" in ${filePath}`);
    return await invoke('surgical_find_block', {
      filePath,
      startPattern,
      endPattern: options?.endPattern,
      nearLine: options?.nearLine,
      maxSearchRange: options?.maxSearchRange ?? 200,
    });
  }

  // ========================================================================
  // PHASE 2: MODIFICATION
  // ========================================================================

  /**
   * Main surgical edit - supports all strategies
   */
  async edit(request: EditRequest): Promise<EditResult> {
    console.log(`🔬 [SurgicalEdit] Edit: ${request.strategy} on ${request.file_path}`);
    const result = await invoke<EditResult>('surgical_edit', { request });

    if (result.success && !request.dry_run) {
      this.addToHistory(result);
    }
    return result;
  }

  /**
   * Batch edit - apply multiple edits in sequence with auto-rollback on failure
   */
  async editBatch(request: BatchEditRequest): Promise<EditResult> {
    console.log(`🔬 [SurgicalEdit] Batch: ${request.edits.length} edits on ${request.file_path}`);
    const result = await invoke<EditResult>('surgical_edit_batch', { request });

    if (result.success && !request.dry_run) {
      this.addToHistory(result);
    }
    return result;
  }

  /**
   * Preview changes without applying
   */
  async preview(request: Omit<EditRequest, 'dry_run'>): Promise<EditResult> {
    return this.edit({ ...request, dry_run: true });
  }

  /**
   * Get a diff preview for an edit
   */
  async diffPreview(request: EditRequest): Promise<DiffPreview> {
    return await invoke('surgical_diff_preview', { request: { ...request, dry_run: true } });
  }

  // ========================================================================
  // CONVENIENCE METHODS (One-call operations)
  // ========================================================================

  /**
   * Replace a single line found by pattern
   */
  async replaceLine(
    filePath: string,
    searchPattern: string,
    newContent: string,
    secondaryPattern?: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'line_replace',
      search_pattern: searchPattern,
      search_pattern_secondary: secondaryPattern,
      new_content: newContent,
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Replace a block of code (from start pattern to end pattern)
   */
  async replaceBlock(
    filePath: string,
    startPattern: string,
    endPattern: string,
    newContent: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'block_replace',
      search_pattern: startPattern,
      search_pattern_secondary: endPattern,
      new_content: newContent,
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Replace a block by line numbers (1-indexed)
   */
  async replaceLines(
    filePath: string,
    startLine: number,
    endLine: number,
    newContent: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'block_replace',
      start_line: startLine,
      end_line: endLine,
      new_content: newContent,
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Find and replace an exact string in the file
   */
  async replaceString(
    filePath: string,
    oldString: string,
    newString: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'string_replace',
      old_content: oldString,
      new_content: newString,
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Insert new code after a matching pattern
   */
  async insertAfter(
    filePath: string,
    searchPattern: string,
    newContent: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'insert',
      search_pattern: searchPattern,
      new_content: newContent,
      insert_position: 'after',
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Insert new code before a matching pattern
   */
  async insertBefore(
    filePath: string,
    searchPattern: string,
    newContent: string
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'insert',
      search_pattern: searchPattern,
      new_content: newContent,
      insert_position: 'before',
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Insert code at a specific line number
   */
  async insertAtLine(
    filePath: string,
    lineNumber: number,
    newContent: string,
    position: InsertPosition = 'after'
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'insert',
      start_line: lineNumber,
      new_content: newContent,
      insert_position: position,
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Remove lines by line numbers (1-indexed)
   */
  async removeLines(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'remove',
      start_line: startLine,
      end_line: endLine,
      new_content: '',
      dry_run: false,
      create_backup: true,
    });
  }

  /**
   * Remove a line matching a pattern
   */
  async removeLine(filePath: string, searchPattern: string): Promise<EditResult> {
    return this.edit({
      file_path: filePath,
      strategy: 'remove',
      search_pattern: searchPattern,
      new_content: '',
      dry_run: false,
      create_backup: true,
    });
  }

  // ========================================================================
  // PHASE 3: VERIFICATION
  // ========================================================================

  /**
   * Verify file integrity after edit
   */
  async verify(filePath: string, checkPatterns?: string[]): Promise<VerifyResult> {
    console.log(`✅ [SurgicalEdit] Verify: ${filePath}`);
    return await invoke('surgical_verify', { filePath, checkPatterns });
  }

  // ========================================================================
  // PHASE 4: ROLLBACK & HISTORY
  // ========================================================================

  /**
   * Rollback to a backup
   */
  async rollback(filePath: string, backupPath: string): Promise<EditResult> {
    console.log(`⏪ [SurgicalEdit] Rollback: ${filePath}`);
    const result = await invoke<EditResult>('surgical_rollback', { filePath, backupPath });
    this.addToHistory(result);
    return result;
  }

  /**
   * List available backups for a file
   */
  async listBackups(fileName: string): Promise<Array<{ path: string; name: string; size: string }>> {
    return await invoke('surgical_list_backups', { fileName });
  }

  /**
   * Get the last N edit results from history
   */
  getHistory(limit?: number): EditResult[] {
    return this.editHistory.slice(-(limit || this.maxHistory));
  }

  /**
   * Undo the last edit (rollback)
   */
  async undoLast(): Promise<EditResult | null> {
    const last = this.editHistory[this.editHistory.length - 1];
    if (!last?.backup_path) {
      console.warn('[SurgicalEdit] No backup available for undo');
      return null;
    }
    return this.rollback(last.file_path, last.backup_path);
  }

  private addToHistory(result: EditResult): void {
    this.editHistory.push(result);
    if (this.editHistory.length > this.maxHistory) {
      this.editHistory.shift();
    }
  }

  // ========================================================================
  // AI INTEGRATION: High-level pipeline methods
  // ========================================================================

  /**
   * Full AI editing pipeline: Recon → Search → Edit → Verify
   * This is the main entry point for AI roles (Developer, Reviewer, etc.)
   */
  async aiEdit(params: {
    filePath: string;
    taskDescription: string;
    searchPattern: string;
    newContent: string;
    strategy?: EditStrategy;
    endPattern?: string;
    dryRun?: boolean;
  }): Promise<{
    recon: FileReconReport;
    searchResults: SearchMatch[];
    editResult: EditResult;
    verification: VerifyResult;
  }> {
    console.log(`🤖 [SurgicalEdit] AI Pipeline: "${params.taskDescription}"`);
    console.log(`   File: ${params.filePath}`);
    console.log(`   Search: "${params.searchPattern}"`);

    // Phase 1: Reconnaissance
    const recon = await this.recon(params.filePath);
    console.log(`   📊 Recon: ${recon.total_lines} lines, ${recon.functions.length} functions, ${recon.classes.length} classes`);

    // Phase 1: Search for target
    const searchResults = await this.search(params.filePath, params.searchPattern, { maxResults: 10 });
    console.log(`   🔍 Found ${searchResults.length} matches for "${params.searchPattern}"`);

    if (searchResults.length === 0) {
      throw new Error(`Pattern "${params.searchPattern}" not found in ${params.filePath}`);
    }

    // Phase 2: Apply edit
    const strategy = params.strategy || 'block_replace';
    const editResult = await this.edit({
      file_path: params.filePath,
      strategy,
      search_pattern: params.searchPattern,
      search_pattern_secondary: params.endPattern,
      new_content: params.newContent,
      dry_run: params.dryRun ?? false,
      create_backup: true,
    });

    console.log(`   ${editResult.success ? '✅' : '❌'} Edit: ${editResult.message}`);

    // Phase 3: Verification
    const verification = await this.verify(params.filePath);
    const issues = verification.duplicates.length + verification.syntax_issues.length;
    console.log(`   🔎 Verify: ${issues === 0 ? 'Clean ✅' : `${issues} issue(s) ⚠️`}`);

    if (verification.duplicates.length > 0) {
      console.warn('   ⚠️ Duplicate declarations found:', verification.duplicates);
    }
    if (verification.syntax_issues.length > 0) {
      console.warn('   ⚠️ Syntax issues:', verification.syntax_issues);
    }

    return { recon, searchResults, editResult, verification };
  }

  /**
   * AI-assisted function replacement
   * Finds a function by name, replaces its entire body
   */
  async aiFunctionReplace(
    filePath: string,
    functionName: string,
    newFunctionBody: string
  ): Promise<EditResult> {
    console.log(`🤖 [SurgicalEdit] Replace function: ${functionName}`);

    // Find the function
    const block = await this.findBlock(filePath, functionName, {
      maxSearchRange: 500,
    });

    console.log(`   Found: lines ${block.start_line}-${block.end_line} (${block.total_lines} lines, type: ${block.block_type})`);

    // Replace the block
    return this.replaceLines(filePath, block.start_line, block.end_line, newFunctionBody);
  }

  /**
   * AI-assisted import management
   * Add an import if it doesn't already exist
   */
  async aiAddImport(filePath: string, importStatement: string): Promise<EditResult | null> {
    // Check if already imported
    const existing = await this.search(filePath, importStatement, { maxResults: 1 });
    if (existing.length > 0) {
      console.log(`[SurgicalEdit] Import already exists at line ${existing[0].line_number}`);
      return null;
    }

    // Find last import line
    const recon = await this.recon(filePath);
    const lastImport = recon.imports[recon.imports.length - 1];
    const insertLine = lastImport ? lastImport.line_number : 1;

    return this.insertAtLine(filePath, insertLine, importStatement, 'after');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const surgicalEdit = SurgicalEditEngine.getInstance();

// ============================================================================
// GLOBAL REGISTRATION (accessible from AI assistant and console)
// ============================================================================

export function initSurgicalEditEngine(): void {
  const engine = SurgicalEditEngine.getInstance();

  // Make accessible from browser console and AI assistant
  (window as any).surgicalEdit = engine;

  // Register convenience functions on window for AI assistant
  (window as any).se = {
    // Quick access
    recon: (path: string) => engine.recon(path),
    search: (path: string, pattern: string) => engine.search(path, pattern),
    searchAll: (dir: string, pattern: string) => engine.searchFiles(dir, pattern),
    readLines: (path: string, start: number, end: number) => engine.readLines(path, start, end),
    findBlock: (path: string, pattern: string, endPattern?: string) =>
      engine.findBlock(path, pattern, { endPattern }),

    // Editing
    replaceLine: (path: string, pattern: string, newContent: string) =>
      engine.replaceLine(path, pattern, newContent),
    replaceBlock: (path: string, start: string, end: string, newContent: string) =>
      engine.replaceBlock(path, start, end, newContent),
    replaceString: (path: string, old: string, replacement: string) =>
      engine.replaceString(path, old, replacement),
    insertAfter: (path: string, pattern: string, code: string) =>
      engine.insertAfter(path, pattern, code),
    insertBefore: (path: string, pattern: string, code: string) =>
      engine.insertBefore(path, pattern, code),
    removeLines: (path: string, start: number, end: number) =>
      engine.removeLines(path, start, end),

    // Verification
    verify: (path: string) => engine.verify(path),

    // Undo
    undo: () => engine.undoLast(),
    history: (n?: number) => engine.getHistory(n),
    backups: (name: string) => engine.listBackups(name),

    // AI pipeline
    aiEdit: engine.aiEdit.bind(engine),
    aiReplaceFunction: engine.aiFunctionReplace.bind(engine),
    aiAddImport: engine.aiAddImport.bind(engine),
  };

  console.log('🔬 Surgical Edit Engine initialized');
  console.log('   Access via: window.surgicalEdit or window.se');
  console.log('   Quick commands: se.recon(path), se.search(path, pattern), se.replaceLine(...)');
}
