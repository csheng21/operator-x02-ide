// myersDiff.ts - Myers Diff Algorithm Implementation
// ============================================================================
// High-performance diff algorithm for code comparison
// Complexity: O((n+m)*d) where d = edit distance (number of changes)
// Much faster than LCS O(n*m) for similar files with few changes
// ============================================================================

/**
 * Diff operation types
 */
export type DiffOperation = 'equal' | 'insert' | 'delete' | 'replace';

/**
 * Single diff result entry
 */
export interface DiffEntry {
  type: DiffOperation;
  oldStart: number;      // Start line in old text (0-indexed)
  oldEnd: number;        // End line in old text (exclusive)
  newStart: number;      // Start line in new text (0-indexed)
  newEnd: number;        // End line in new text (exclusive)
  oldLines?: string[];   // Lines from old text (for delete/replace)
  newLines?: string[];   // Lines from new text (for insert/replace)
}

/**
 * Complete diff result with statistics
 */
export interface DiffResult {
  entries: DiffEntry[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
    totalOldLines: number;
    totalNewLines: number;
  };
  isIdentical: boolean;
  executionTimeMs: number;
}

/**
 * Line-level change for UI highlighting
 */
export interface LineChange {
  lineNumber: number;    // 1-indexed line number in new text
  type: 'added' | 'deleted' | 'modified' | 'unchanged';
  oldContent?: string;
  newContent?: string;
}

// ============================================================================
// MYERS DIFF ALGORITHM
// ============================================================================

/**
 * Myers Diff Algorithm - Core Implementation
 * 
 * Based on Eugene W. Myers' paper:
 * "An O(ND) Difference Algorithm and Its Variations" (1986)
 * 
 * Key insight: Instead of filling an N×M matrix like LCS,
 * we only track the furthest reaching points on each diagonal.
 * 
 * @param oldLines - Array of lines from original text
 * @param newLines - Array of lines from new text
 * @returns Array of diff entries
 */
export function myersDiff(oldLines: string[], newLines: string[]): DiffEntry[] {
  const n = oldLines.length;
  const m = newLines.length;
  const max = n + m;
  
  // Edge cases
  if (n === 0 && m === 0) return [];
  if (n === 0) {
    return [{
      type: 'insert',
      oldStart: 0, oldEnd: 0,
      newStart: 0, newEnd: m,
      newLines: newLines.slice()
    }];
  }
  if (m === 0) {
    return [{
      type: 'delete',
      oldStart: 0, oldEnd: n,
      newStart: 0, newEnd: 0,
      oldLines: oldLines.slice()
    }];
  }
  
  // V array: V[k] = x coordinate of endpoint of furthest reaching path in diagonal k
  // We use a Map for sparse storage (only store diagonals we've visited)
  const v: Map<number, number> = new Map();
  
  // Trace: history of V arrays for backtracking
  const trace: Map<number, number>[] = [];
  
  // Initial state: start at (0,0) which is diagonal 1 with x=0
  v.set(1, 0);
  
  // Main loop: try edit distances from 0 to max
  for (let d = 0; d <= max; d++) {
    // Save current V for backtracking
    trace.push(new Map(v));
    
    // Try all diagonals from -d to +d (step by 2 since parity alternates)
    for (let k = -d; k <= d; k += 2) {
      // Decide whether to move down (insert) or right (delete)
      // Move down if: k === -d (must move down)
      //            or: k !== d AND moving down gives us further x position
      let x: number;
      
      if (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) {
        // Move down from diagonal k+1 (insert operation)
        x = v.get(k + 1) ?? 0;
      } else {
        // Move right from diagonal k-1 (delete operation)
        x = (v.get(k - 1) ?? 0) + 1;
      }
      
      // Calculate y from x and diagonal k
      let y = x - k;
      
      // Extend diagonal (follow matching lines - "snake")
      while (x < n && y < m && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      
      // Store furthest reaching point for this diagonal
      v.set(k, x);
      
      // Check if we've reached the end
      if (x >= n && y >= m) {
        // Found shortest edit script! Backtrack to build diff
        return backtrack(trace, oldLines, newLines, d);
      }
    }
  }
  
  // Should never reach here for valid inputs
  console.error('❌ [MyersDiff] Failed to find edit path');
  return [];
}

/**
 * Backtrack through trace to build diff entries
 */
function backtrack(
  trace: Map<number, number>[],
  oldLines: string[],
  newLines: string[],
  d: number
): DiffEntry[] {
  const n = oldLines.length;
  const m = newLines.length;
  
  // Start from the end
  let x = n;
  let y = m;
  
  // Collect edits in reverse order
  const edits: Array<{ type: 'insert' | 'delete' | 'equal'; x: number; y: number }> = [];
  
  // Walk backwards through the trace
  for (let step = d; step > 0; step--) {
    const v = trace[step];
    const vPrev = trace[step - 1];
    const k = x - y;
    
    // Determine how we got to this diagonal
    let prevK: number;
    if (k === -step || (k !== step && (vPrev.get(k - 1) ?? -1) < (vPrev.get(k + 1) ?? -1))) {
      // We came from diagonal k+1 (insert)
      prevK = k + 1;
    } else {
      // We came from diagonal k-1 (delete)
      prevK = k - 1;
    }
    
    const prevX = vPrev.get(prevK) ?? 0;
    const prevY = prevX - prevK;
    
    // Add diagonal moves (equal lines)
    while (x > prevX && y > prevY) {
      x--;
      y--;
      edits.push({ type: 'equal', x, y });
    }
    
    // Add the edit that brought us to this diagonal
    if (step > 0) {
      if (x === prevX) {
        // y changed: insert
        y--;
        edits.push({ type: 'insert', x, y });
      } else {
        // x changed: delete
        x--;
        edits.push({ type: 'delete', x, y });
      }
    }
  }
  
  // Add remaining diagonal moves at the start
  while (x > 0 && y > 0) {
    x--;
    y--;
    edits.push({ type: 'equal', x, y });
  }
  
  // Reverse to get forward order
  edits.reverse();
  
  // Convert to DiffEntry format
  return compactEdits(edits, oldLines, newLines);
}

/**
 * Compact individual edits into ranges
 */
function compactEdits(
  edits: Array<{ type: 'insert' | 'delete' | 'equal'; x: number; y: number }>,
  oldLines: string[],
  newLines: string[]
): DiffEntry[] {
  if (edits.length === 0) return [];
  
  const entries: DiffEntry[] = [];
  let i = 0;
  
  while (i < edits.length) {
    const edit = edits[i];
    
    if (edit.type === 'equal') {
      // Find run of equal lines
      const start = i;
      while (i < edits.length && edits[i].type === 'equal') {
        i++;
      }
      entries.push({
        type: 'equal',
        oldStart: edits[start].x,
        oldEnd: edits[start].x + (i - start),
        newStart: edits[start].y,
        newEnd: edits[start].y + (i - start)
      });
    } else if (edit.type === 'delete') {
      // Find run of deletes (possibly followed by inserts = replace)
      const deleteStart = i;
      while (i < edits.length && edits[i].type === 'delete') {
        i++;
      }
      const deleteCount = i - deleteStart;
      
      // Check for following inserts (replace operation)
      const insertStart = i;
      while (i < edits.length && edits[i].type === 'insert') {
        i++;
      }
      const insertCount = i - insertStart;
      
      if (insertCount > 0) {
        // Replace operation
        entries.push({
          type: 'replace',
          oldStart: edits[deleteStart].x,
          oldEnd: edits[deleteStart].x + deleteCount,
          newStart: edits[insertStart].y,
          newEnd: edits[insertStart].y + insertCount,
          oldLines: oldLines.slice(edits[deleteStart].x, edits[deleteStart].x + deleteCount),
          newLines: newLines.slice(edits[insertStart].y, edits[insertStart].y + insertCount)
        });
      } else {
        // Pure delete
        entries.push({
          type: 'delete',
          oldStart: edits[deleteStart].x,
          oldEnd: edits[deleteStart].x + deleteCount,
          newStart: edits[deleteStart].y,
          newEnd: edits[deleteStart].y,
          oldLines: oldLines.slice(edits[deleteStart].x, edits[deleteStart].x + deleteCount)
        });
      }
    } else if (edit.type === 'insert') {
      // Find run of inserts
      const start = i;
      while (i < edits.length && edits[i].type === 'insert') {
        i++;
      }
      entries.push({
        type: 'insert',
        oldStart: edit.x,
        oldEnd: edit.x,
        newStart: edits[start].y,
        newEnd: edits[start].y + (i - start),
        newLines: newLines.slice(edits[start].y, edits[start].y + (i - start))
      });
    }
  }
  
  return entries;
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * Compute diff between two texts with full statistics
 * 
 * @param oldText - Original text (string or array of lines)
 * @param newText - New text (string or array of lines)
 * @returns Complete diff result with entries and statistics
 */
export function computeDiff(
  oldText: string | string[],
  newText: string | string[]
): DiffResult {
  const startTime = performance.now();
  
  // Normalize inputs to line arrays
  const oldLines = Array.isArray(oldText) ? oldText : oldText.split('\n');
  const newLines = Array.isArray(newText) ? newText : newText.split('\n');
  
  // Quick identity check
  if (oldLines.length === newLines.length) {
    let identical = true;
    for (let i = 0; i < oldLines.length; i++) {
      if (oldLines[i] !== newLines[i]) {
        identical = false;
        break;
      }
    }
    if (identical) {
      return {
        entries: [{
          type: 'equal',
          oldStart: 0, oldEnd: oldLines.length,
          newStart: 0, newEnd: newLines.length
        }],
        stats: {
          additions: 0,
          deletions: 0,
          modifications: 0,
          unchanged: oldLines.length,
          totalOldLines: oldLines.length,
          totalNewLines: newLines.length
        },
        isIdentical: true,
        executionTimeMs: performance.now() - startTime
      };
    }
  }
  
  // Compute diff
  const entries = myersDiff(oldLines, newLines);
  
  // Calculate statistics
  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  let unchanged = 0;
  
  for (const entry of entries) {
    switch (entry.type) {
      case 'insert':
        additions += entry.newEnd - entry.newStart;
        break;
      case 'delete':
        deletions += entry.oldEnd - entry.oldStart;
        break;
      case 'replace':
        modifications += Math.max(entry.oldEnd - entry.oldStart, entry.newEnd - entry.newStart);
        break;
      case 'equal':
        unchanged += entry.newEnd - entry.newStart;
        break;
    }
  }
  
  return {
    entries,
    stats: {
      additions,
      deletions,
      modifications,
      unchanged,
      totalOldLines: oldLines.length,
      totalNewLines: newLines.length
    },
    isIdentical: additions === 0 && deletions === 0 && modifications === 0,
    executionTimeMs: performance.now() - startTime
  };
}

/**
 * Get line-by-line changes for UI highlighting
 * 
 * @param diffResult - Result from computeDiff
 * @returns Array of line changes for the new text
 */
export function getLineChanges(diffResult: DiffResult): LineChange[] {
  const changes: LineChange[] = [];
  
  for (const entry of diffResult.entries) {
    switch (entry.type) {
      case 'equal':
        for (let i = entry.newStart; i < entry.newEnd; i++) {
          changes.push({
            lineNumber: i + 1, // 1-indexed
            type: 'unchanged'
          });
        }
        break;
        
      case 'insert':
        for (let i = entry.newStart; i < entry.newEnd; i++) {
          changes.push({
            lineNumber: i + 1,
            type: 'added',
            newContent: entry.newLines?.[i - entry.newStart]
          });
        }
        break;
        
      case 'delete':
        // Deleted lines don't appear in new text, but we track position
        // This is used for gutter markers showing where deletions occurred
        if (entry.newStart < changes.length) {
          const existing = changes.find(c => c.lineNumber === entry.newStart + 1);
          if (existing && existing.type === 'unchanged') {
            existing.type = 'modified';
          }
        }
        break;
        
      case 'replace':
        for (let i = entry.newStart; i < entry.newEnd; i++) {
          changes.push({
            lineNumber: i + 1,
            type: 'modified',
            oldContent: entry.oldLines?.[i - entry.newStart],
            newContent: entry.newLines?.[i - entry.newStart]
          });
        }
        break;
    }
  }
  
  // Sort by line number
  changes.sort((a, b) => a.lineNumber - b.lineNumber);
  
  return changes;
}

/**
 * Generate unified diff format string (for display/debugging)
 */
export function toUnifiedDiff(
  diffResult: DiffResult,
  oldLabel: string = 'old',
  newLabel: string = 'new'
): string {
  const lines: string[] = [];
  lines.push(`--- ${oldLabel}`);
  lines.push(`+++ ${newLabel}`);
  
  for (const entry of diffResult.entries) {
    switch (entry.type) {
      case 'equal':
        // Show context (first and last 3 lines of equal blocks)
        const equalLines = entry.newEnd - entry.newStart;
        if (equalLines <= 6) {
          for (let i = entry.newStart; i < entry.newEnd; i++) {
            lines.push(` ${entry.newLines?.[i - entry.newStart] || ''}`);
          }
        } else {
          lines.push(`@@ ... ${equalLines} unchanged lines ... @@`);
        }
        break;
        
      case 'delete':
        for (const line of entry.oldLines || []) {
          lines.push(`-${line}`);
        }
        break;
        
      case 'insert':
        for (const line of entry.newLines || []) {
          lines.push(`+${line}`);
        }
        break;
        
      case 'replace':
        for (const line of entry.oldLines || []) {
          lines.push(`-${line}`);
        }
        for (const line of entry.newLines || []) {
          lines.push(`+${line}`);
        }
        break;
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// PERFORMANCE COMPARISON UTILITY
// ============================================================================

/**
 * Compare Myers diff performance against naive LCS
 * (for benchmarking/validation purposes)
 */
export function benchmarkDiff(oldLines: string[], newLines: string[]): {
  myersTimeMs: number;
  myersResult: DiffResult;
} {
  const myersStart = performance.now();
  const myersResult = computeDiff(oldLines, newLines);
  const myersTimeMs = performance.now() - myersStart;
  
  console.log(`📊 [MyersDiff] Benchmark:`);
  console.log(`   Old: ${oldLines.length} lines, New: ${newLines.length} lines`);
  console.log(`   Myers: ${myersTimeMs.toFixed(2)}ms`);
  console.log(`   Changes: +${myersResult.stats.additions} -${myersResult.stats.deletions} ~${myersResult.stats.modifications}`);
  
  return { myersTimeMs, myersResult };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  myersDiff,
  computeDiff,
  getLineChanges,
  toUnifiedDiff,
  benchmarkDiff
};

console.log('✅ myersDiff.ts loaded - High-performance diff algorithm');
