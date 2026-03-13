// autonomousCoding/autoApply/types.ts
// ============================================================================
// SHARED TYPES FOR AUTO-APPLY CODE SYSTEM
// ============================================================================

/**
 * Information about a parsed code block
 */
export interface CodeBlockInfo {
  /** Unique identifier for this code block */
  id: string;
  
  /** The DOM element containing the code block */
  element: HTMLElement;
  
  /** The extracted code content */
  code: string;
  
  /** Detected programming language */
  language: string;
  
  /** Target filename if detected from annotations */
  filename: string | null;
  
  /** Full file path if detected */
  filepath: string | null;
  
  /** Suggested action based on context */
  action: ApplyAction;
  
  /** Line range if partial update (e.g., lines 10-20) */
  lineRange?: {
    start: number;
    end: number;
  };
  
  /** Original code before modification (for undo) */
  originalCode?: string;
  
  /** Timestamp when parsed */
  timestamp: number;
}

/**
 * Action types for applying code
 */
export type ApplyAction = 
  | 'replace'      // Replace entire file content
  | 'insert'       // Insert at cursor position
  | 'append'       // Append to end of file
  | 'prepend'      // Prepend to start of file
  | 'create'       // Create new file
  | 'patch'        // Apply as diff/patch
  | 'smart-merge'; // Intelligent merge with existing code

/**
 * Mode for applying code to editor
 */
export type ApplyMode = 'replace' | 'insert' | 'append' | 'prepend';

/**
 * Result of applying code
 */
export interface ApplyResult {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Human-readable message */
  message: string;
  
  /** Number of lines changed */
  linesChanged?: number;
  
  /** Number of files affected */
  filesAffected?: number;
  
  /** The file path that was modified */
  filepath?: string;
  
  /** Undo token for reverting this change */
  undoToken?: string;
  
  /** Diff of changes made */
  diff?: string;
}

/**
 * File change record for undo system
 */
export interface FileChange {
  /** Unique identifier */
  id: string;
  
  /** File path */
  filepath: string;
  
  /** Content before change */
  beforeContent: string;
  
  /** Content after change */
  afterContent: string;
  
  /** Timestamp of change */
  timestamp: number;
  
  /** Description of change */
  description: string;
  
  /** Whether this change has been undone */
  undone: boolean;
}

/**
 * Configuration for auto-apply system
 */
export interface AutoApplyConfig {
  /** Whether to show confirmation before applying */
  confirmBeforeApply: boolean;
  
  /** Whether to show diff preview */
  showDiffPreview: boolean;
  
  /** Whether to auto-save after applying */
  autoSaveAfterApply: boolean;
  
  /** Maximum undo history size */
  maxUndoHistory: number;
  
  /** Whether to enable keyboard shortcuts */
  enableShortcuts: boolean;
  
  /** Default apply mode */
  defaultApplyMode: ApplyMode;
  
  /** Whether to parse file annotations from code comments */
  parseFileAnnotations: boolean;
  
  /** Whether to auto-detect target file from context */
  autoDetectTargetFile: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: AutoApplyConfig = {
  confirmBeforeApply: false,
  showDiffPreview: false,
  autoSaveAfterApply: false,
  maxUndoHistory: 50,
  enableShortcuts: true,
  defaultApplyMode: 'replace',
  parseFileAnnotations: true,
  autoDetectTargetFile: true,
};

/**
 * File annotation patterns
 */
export interface FileAnnotation {
  /** The detected filename */
  filename: string;
  
  /** Full path if available */
  fullPath?: string;
  
  /** The pattern that matched */
  pattern: string;
  
  /** Line number where annotation was found */
  lineNumber: number;
}

/**
 * Diff chunk for preview
 */
export interface DiffChunk {
  /** Type of change */
  type: 'add' | 'remove' | 'unchanged';
  
  /** The content */
  content: string;
  
  /** Line numbers in old file */
  oldLines?: { start: number; end: number };
  
  /** Line numbers in new file */
  newLines?: { start: number; end: number };
}

/**
 * Multi-file apply batch
 */
export interface ApplyBatch {
  /** Unique batch ID */
  id: string;
  
  /** List of code blocks to apply */
  codeBlocks: CodeBlockInfo[];
  
  /** Status of the batch */
  status: 'pending' | 'applying' | 'completed' | 'failed' | 'partial';
  
  /** Results for each file */
  results: Map<string, ApplyResult>;
  
  /** Timestamp when batch was created */
  createdAt: number;
  
  /** Timestamp when batch completed */
  completedAt?: number;
}
