// ----------------------------------------------------------------------------
// headlessExecute.ts - MARKER-BASED EXTRACTION
// ----------------------------------------------------------------------------
// Runs a single PowerShell command in a hidden PTY and returns captured output.
//
// Output extraction uses unique start/end markers wrapped around the command,
// so PowerShell's character-by-character echo and continuation prompts are
// ignored entirely. We just slice the buffer between the last occurrence of
// each marker.
// ----------------------------------------------------------------------------
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 30;
const DEFAULT_TIMEOUT_MS = 30000;

// Flip to true for verbose [HE] log trail
const FORCE_HE_LOGS = false;
const HE = (...args: any[]) => { if (FORCE_HE_LOGS) console.warn('[HE]', ...args); };

export interface HeadlessExecuteOptions {
  cwd?: string;
  shell?: string;
  timeoutMs?: number;
  verbose?: boolean;
}

interface SpawnResponse {
  id: string;
  shell: string;
  cols: number;
  rows: number;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');
}

function endsWithPrompt(buffer: string): boolean {
  const clean = stripAnsi(buffer);
  return /PS [A-Za-z]:[^\r\n]*>\s*$/.test(clean);
}

function resolveDefaultCwd(explicit?: string): string | undefined {
  if (explicit && typeof explicit === 'string') return explicit;
  try {
    const wp = (window as any).currentProjectPath;
    if (wp && typeof wp === 'string') return wp;
  } catch {
    /* ignore */
  }
  return undefined;
}

// Generate a unique marker pair per call so concurrent calls can't collide.
function makeMarkers(): { start: string; end: string } {
  const nonce = Math.random().toString(36).slice(2, 10);
  return {
    start: `__X02_HE_START_${nonce}__`,
    end: `__X02_HE_END_${nonce}__`,
  };
}

// Extract the command output from the PTY buffer using markers.
// Picks the LAST occurrence of each marker, since the echo of our input
// will produce earlier ones we want to ignore.
function extractBetweenMarkers(buffer: string, start: string, end: string): string | null {
  const clean = stripAnsi(buffer);
  const startIdx = clean.lastIndexOf(start);
  if (startIdx === -1) return null;
  // Find the LAST end marker that comes AFTER the last start marker
  const endIdx = clean.indexOf(end, startIdx + start.length);
  if (endIdx === -1) return null;

  let raw = clean.slice(startIdx + start.length, endIdx);
  // Drop the newline immediately after the start marker, and the one
  // immediately before the end marker
  raw = raw.replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '');
  return raw;
}

export async function headlessExecute(
  command: string,
  options: HeadlessExecuteOptions = {}
): Promise<string> {
  HE('1. ENTRY command=', JSON.stringify(command));

  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('headlessExecute: command must be a non-empty string');
  }
  if (options.verbose === true) {
    // Honor verbose flag too: temporarily enable HE
    // (caller-driven verbose still works)
  }

  const cwd = resolveDefaultCwd(options.cwd);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const markers = makeMarkers();
  HE('2. cwd=', cwd, 'timeoutMs=', timeoutMs, 'markers=', markers);

  // Wrap the user's command between Write-Host markers. We use single quotes
  // so PowerShell does no interpolation on the marker string itself.
  // The command is wrapped in & { ... } to handle multi-line/complex input.
  const wrappedCommand =
    `Write-Host '${markers.start}'; ` +
    `& { ${command} }; ` +
    `Write-Host '${markers.end}'`;
  HE('3. wrapped command length=', wrappedCommand.length);

  const spawn = await invoke<SpawnResponse>('pty_spawn', {
    request: { cwd, cols: DEFAULT_COLS, rows: DEFAULT_ROWS, shell: options.shell },
  });
  HE('4. spawned id=', spawn.id);

  const { id } = spawn;
  let buffer = '';
  let unlisten: UnlistenFn | null = null;
  let timeoutHandle: number | null = null;
  let resolved = false;

  const cleanup = async () => {
    if (timeoutHandle !== null) { clearTimeout(timeoutHandle); timeoutHandle = null; }
    if (unlisten) { try { unlisten(); } catch { /* ignore */ } unlisten = null; }
    try { await invoke('pty_kill', { id }); } catch { /* probably already exited */ }
  };

  return new Promise<string>((resolve, reject) => {
    const finishOk = async (output: string) => {
      if (resolved) return;
      resolved = true;
      HE('FINISH-OK length=', output.length);
      await cleanup();
      resolve(output);
    };

    const finishErr = async (err: Error) => {
      if (resolved) return;
      resolved = true;
      HE('FINISH-ERR:', err.message);
      await cleanup();
      reject(err);
    };

    timeoutHandle = window.setTimeout(() => {
      finishErr(new Error(`headlessExecute: timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    type State = 'waiting-ready' | 'command-sent';
    let state: State = 'waiting-ready';

    listen<string>(`pty:${id}`, (event) => {
      buffer += event.payload;

      if (state === 'waiting-ready') {
        if (endsWithPrompt(buffer)) {
          HE('initial prompt seen, sending wrapped command');
          state = 'command-sent';
          invoke('pty_write', { id, data: wrappedCommand + '\r\n' }).catch((err) => {
            finishErr(new Error(`pty_write failed: ${err}`));
          });
        }
        return;
      }

      if (state === 'command-sent') {
        // Wait until we see the end marker AS WRITE-HOST OUTPUT
        // (not as the echo of our input). The simplest heuristic: the buffer
        // also has a fresh prompt after the markers — meaning the command
        // truly finished.
        if (buffer.includes(markers.end) && endsWithPrompt(buffer)) {
          const extracted = extractBetweenMarkers(buffer, markers.start, markers.end);
          if (extracted !== null) {
            HE('extracted', extracted.length, 'chars');
            finishOk(extracted);
          } else {
            finishErr(new Error('markers not found in output; PTY may have garbled output'));
          }
        }
      }
    }).then((fn) => {
      unlisten = fn;
    }).catch((err) => {
      finishErr(new Error(`failed to attach pty listener: ${err?.message || err}`));
    });
  });
}

// ----------------------------------------------------------------------------
// EXPOSE TO WINDOW FOR TESTING FROM DEVTOOLS CONSOLE
// ----------------------------------------------------------------------------
(window as any).__aiExecute = headlessExecute;
console.log('[headlessExecute] loaded - window.__aiExecute available');