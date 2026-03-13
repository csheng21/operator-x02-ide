// ============================================================================
// Auto Apply - Type Definitions
// ============================================================================

/** Modes for applying code to editor */
export type ApplyMode = 'replace' | 'insert' | 'append';

/** Actions for code blocks */
export type ApplyAction = 'replace' | 'insert' | 'append' | 'create' | 'delete' | 'patch';

/** Result of applying code */
export interface ApplyResult {
  success: boolean;
  message: string;
  linesChanged?: number;
  filePath?: string;
}

/** Parsed code block info */
export interface CodeBlockInfo {
  code: string;
  language: string;
  raw: string;
  startIndex: number;
  endIndex: number;
  fileAnnotation: FileAnnotation | null;
  actionAnnotation: string | null;
  lineRange: { start: number; end: number } | null;
}

/** File annotation in code block */
export interface FileAnnotation {
  path: string;
  raw: string;
}

/** A change to be applied to a file */
export interface FileChange {
  filePath: string;
  code: string;
  action: ApplyAction;
  language: string;
  lineRange?: { start: number; end: number };
}

/** Configuration for auto-apply behavior */
export interface AutoApplyConfig {
  enabled: boolean;
  autoDetectFiles: boolean;
  showDiffPreview: boolean;
  requireConfirmation: boolean;
  maxFilesPerBatch: number;
}

/** A chunk in a diff */
export interface DiffChunk {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  lineNumber: number;
}

/** A batch of code applications */
export interface ApplyBatch {
  id: string;
  changes: FileChange[];
  timestamp: number;
  applied: boolean;
  undone: boolean;
}
