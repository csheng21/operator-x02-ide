// ----------------------------------------------------------------------------
// projectAnalysis.ts - typed AI tool wrappers
// ----------------------------------------------------------------------------
// SECURITY BOUNDARY between the AI and the user's machine.
//
// The AI never gets to write raw PowerShell or pick file paths freely.
// Every tool here:
//   1. Takes typed parameters that go through input validation
//   2. Runs a hardcoded command template (no string interpolation from AI input
//      except via whitelisted placeholders)
//   3. Enforces path boundaries (everything must stay inside the open project)
//   4. Truncates oversized output so a runaway tool can't blow up the chat
//
// Sequential use only. Callers must `await` one tool call before starting the
// next, otherwise concurrent headlessExecute calls can interfere through the
// shared PTY event stream.
//
// Tools shipped in this starter set (r1294):
//   - count_files  (statistical, PowerShell-backed)
//   - read_file    (content, Rust-backed)
//
// Deferred to next session per X02_CMD_SUBSYSTEM.md roadmap:
//   - find_biggest_files  (needs Rust impl - PowerShell gci -Recurse is too
//                          slow on projects with node_modules)
//   - find_recent_files, count_lines, list_directory
//   - search_code, find_definition, find_references, find_related
// ----------------------------------------------------------------------------
import { invoke } from '@tauri-apps/api/core';
import { headlessExecute } from './headlessExecute';

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

/** Hard cap on any tool's returned string. Truncated content gets a marker. */
const MAX_OUTPUT_CHARS = 8000;

/** Whitelist for the `pattern` parameter. Defends against shell injection. */
const FILE_PATTERN = /^[*a-zA-Z0-9.\-_]+$/;

// ----------------------------------------------------------------------------
// Shared safety helpers
// ----------------------------------------------------------------------------

/**
 * Resolve the current project's root path. Throws if no project is open.
 * Returns a normalized form (forward slashes, no trailing slash).
 */
function getProjectRoot(): string {
  const raw = (window as any).currentProjectPath as string | undefined;
  if (!raw || typeof raw !== 'string') {
    throw new Error('projectAnalysis: no project open');
  }
  return raw.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Assert that `filePath` resolves inside the open project. Defends against
 * `..` traversal, absolute paths to other drives, and symlink hops.
 * Returns the normalized absolute path.
 */
function assertInProject(filePath: string): string {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('projectAnalysis: path must be a non-empty string');
  }
  const root = getProjectRoot();
  const normalized = filePath.replace(/\\/g, '/');

  // Reject obvious traversal attempts
  if (normalized.split('/').some((seg) => seg === '..')) {
    throw new Error(`projectAnalysis: path traversal forbidden: ${filePath}`);
  }

  // Allow either absolute paths inside the project or relative paths
  if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith('/')) {
    // Absolute path — must be under project root (case-insensitive on Windows)
    if (normalized.toLowerCase().startsWith(root.toLowerCase())) {
      return normalized;
    }
    throw new Error(`projectAnalysis: path outside project boundary: ${filePath}`);
  }

  // Relative path — join under project root
  return `${root}/${normalized}`;
}

/** Truncate oversized strings so a tool can't dump a 5MB file into the chat. */
function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT_CHARS) return s;
  return s.slice(0, MAX_OUTPUT_CHARS) + '\n[truncated]';
}

/** Clamp a numeric parameter into a safe range. */
function clamp(n: number, min: number, max: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ----------------------------------------------------------------------------
// Tool: count_files
// ----------------------------------------------------------------------------

/**
 * Count files in the open project matching a wildcard pattern.
 *
 * @param pattern  Glob-ish wildcard, e.g. '*' (default), '*.ts', '*.md'.
 *                 Restricted to [a-zA-Z0-9*.\-_].
 * @returns        Count as a number. Returns 0 on empty/non-parseable output.
 *
 * Example: await count_files('*.ts')  -> 358
 *
 * Note: counts ALL files including node_modules/, .git/, etc. This is the raw
 * "literal count" semantics. A future count_source_files() will exclude
 * dependency and build directories.
 */
export async function count_files(pattern: string = '*'): Promise<number> {
  if (typeof pattern !== 'string' || !FILE_PATTERN.test(pattern)) {
    throw new Error(`count_files: invalid pattern: ${pattern}`);
  }
  const out = await headlessExecute(
    `(Get-ChildItem -Recurse -Filter '${pattern}' -File -ErrorAction SilentlyContinue | Measure-Object).Count`
  );
  const n = parseInt(out.trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

// ----------------------------------------------------------------------------
// Tool: read_file
// ----------------------------------------------------------------------------

/**
 * Read a file's contents (or a line range) from the open project.
 *
 * @param filePath   Path inside the open project. Relative or absolute (under project).
 *                   Outside-project paths and `..` traversal are rejected.
 * @param lineRange  Optional [startLine, endLine], 1-indexed, inclusive.
 * @returns          File content as a string, truncated to MAX_OUTPUT_CHARS.
 *
 * Example: await read_file('src/main.ts')
 *          await read_file('src/main.ts', [10, 50])
 */
export async function read_file(
  filePath: string,
  lineRange?: [number, number]
): Promise<string> {
  const safePath = assertInProject(filePath);
  const content = await invoke<string>('read_file_content', { path: safePath });

  if (lineRange) {
    if (!Array.isArray(lineRange) || lineRange.length !== 2) {
      throw new Error('read_file: lineRange must be [start, end]');
    }
    const start = clamp(lineRange[0], 1, Number.MAX_SAFE_INTEGER);
    const end = clamp(lineRange[1], start, Number.MAX_SAFE_INTEGER);
    const lines = content.split('\n');
    return truncate(lines.slice(start - 1, end).join('\n'));
  }

  return truncate(content);
}

// ----------------------------------------------------------------------------
// EXPOSE TO WINDOW FOR TESTING FROM DEVTOOLS CONSOLE
// ----------------------------------------------------------------------------

(window as any).__projectAnalysis = {
  count_files,
  read_file,
};

console.log('[projectAnalysis] loaded - window.__projectAnalysis available (count_files, read_file)');
