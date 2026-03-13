/**
 * Pre-Run Dependency Check
 * Blocks Run (button + F5) if node_modules is missing in a Node.js project.
 * Shows a helpful toast + terminal message suggesting the install command.
 */

console.log('[PreRunCheck] Module loaded');

// ---- State ----
let depsStatus: 'unknown' | 'missing' | 'ok' = 'unknown';
let installCmd = 'npm install';
let lastCheckedPath = '';

// ---- Tauri invoke helper ----
function getInvoke(): ((cmd: string, args?: any) => Promise<any>) | null {
  return (window as any).__TAURI__?.core?.invoke 
    || (window as any).__TAURI__?.invoke 
    || null;
}

// ---- Check if node_modules exists ----
async function checkDeps(): Promise<void> {
  const projectPath = (window as any).__currentProjectPath 
    || (window as any).currentFolderPath
    || (window as any).fileSystem?.currentPath
    || '';
  
  if (!projectPath) { depsStatus = 'unknown'; return; }
  if (projectPath === lastCheckedPath && depsStatus !== 'unknown') return;
  lastCheckedPath = projectPath;
  
  const invoke = getInvoke();
  if (!invoke) { depsStatus = 'unknown'; return; }
  
  // Is this a Node.js project?
  let hasPackageJson = false;
  try {
    await invoke('read_file', { path: projectPath + '\\package.json' });
    hasPackageJson = true;
  } catch(_) {
    try {
      await invoke('read_file', { path: projectPath + '/package.json' });
      hasPackageJson = true;
    } catch(_) {}
  }
  
  if (!hasPackageJson) { depsStatus = 'ok'; return; }
  
  // Detect package manager
  installCmd = 'npm install';
  try { await invoke('read_file', { path: projectPath + '\\yarn.lock' }); installCmd = 'yarn install'; } catch(_) {}
  try { await invoke('read_file', { path: projectPath + '\\pnpm-lock.yaml' }); installCmd = 'pnpm install'; } catch(_) {}
  
  // Check node_modules folder
  let hasNodeModules = false;
  const nmPath = projectPath.includes('/') 
    ? projectPath + '/node_modules' 
    : projectPath + '\\node_modules';
  
  try {
    // Try reading the directory
    await invoke('read_directory_recursive', { path: nmPath, maxDepth: 1 });
    hasNodeModules = true;
  } catch(_) {
    try {
      await invoke('read_dir', { path: nmPath });
      hasNodeModules = true;
    } catch(_) {
      try {
        // Last resort: check if a known file exists inside
        await invoke('read_file', { path: nmPath + '\\.package-lock.json' });
        hasNodeModules = true;
      } catch(_) {
        hasNodeModules = false;
      }
    }
  }
  
  depsStatus = hasNodeModules ? 'ok' : 'missing';
  console.log('[PreRunCheck] Status:', depsStatus, '| Cmd:', installCmd);
}

// ---- Show warning ----
function showDepsWarning(): void {
  console.warn('[PreRunCheck] BLOCKED - node_modules not found!');
  
  // === Terminal message ===
  const terminalAreas = document.querySelectorAll(
    '.terminal-output, .xterm-rows, [class*="terminal-content"], .terminal-container pre, .enhanced-terminal-output'
  );
  const termOut = terminalAreas.length > 0 
    ? terminalAreas[terminalAreas.length - 1] as HTMLElement 
    : null;
  
  if (termOut) {
    const msg = document.createElement('div');
    msg.style.cssText = [
      'padding:10px 14px', 'margin:6px 4px',
      'background:linear-gradient(135deg,#2d1b00,#1a1000)',
      'border:1px solid #f59e0b', 'border-left:3px solid #f59e0b',
      'border-radius:6px', 'color:#fbbf24',
      'font-family:monospace', 'font-size:13px', 'line-height:1.7'
    ].join(';');
    msg.innerHTML = 
      '\u26A0\uFE0F <b style="font-size:14px">Cannot run \u2014 dependencies not installed</b><br>'
      + '<span style="color:#d1d5db">Run this command in terminal first:</span><br>'
      + '<code style="display:inline-block;margin:4px 0;background:#1f2937;padding:5px 12px;'
      + 'border-radius:4px;color:#34d399;font-size:13px;cursor:pointer;border:1px solid #374151;'
      + 'user-select:all" onclick="navigator.clipboard.writeText(\'' + installCmd + '\');'
      + 'var s=this.nextElementSibling;if(s)s.style.display=\'inline\'">'
      + installCmd + '</code>'
      + '<span style="color:#34d399;font-size:11px;margin-left:8px;display:none"> \u2713 Copied!</span><br>'
      + '<span style="color:#9ca3af;font-size:11px">node_modules folder not found in project</span>';
    termOut.appendChild(msg);
    termOut.scrollTop = termOut.scrollHeight;
  }
  
  // === Floating toast ===
  const old = document.querySelector('._prerun-toast');
  if (old) old.remove();
  
  const toast = document.createElement('div');
  toast.className = '_prerun-toast';
  toast.style.cssText = [
    'position:fixed', 'bottom:60px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:999999', 'background:#1c1917', 'border:1px solid #f59e0b',
    'border-radius:10px', 'padding:14px 22px', 'color:#fbbf24',
    'font-size:13px', 'font-family:system-ui,sans-serif',
    'display:flex', 'align-items:center', 'gap:12px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.6)', 'max-width:440px',
    'animation:_prSlide 0.3s ease'
  ].join(';');
  toast.innerHTML = 
    '<span style="font-size:22px">\uD83D\uDCE6</span>'
    + '<div><b>Dependencies not installed</b><br>'
    + '<span style="color:#d1d5db;font-size:12px">Run <code style="background:#292524;'
    + 'padding:2px 6px;border-radius:3px;color:#34d399">' + installCmd 
    + '</code> in terminal first, then click Run again</span></div>'
    + '<span style="cursor:pointer;color:#6b7280;font-size:18px;margin-left:8px" '
    + 'onclick="this.parentElement?.remove()">\u2715</span>';
  document.body.appendChild(toast);
  
  // Animation keyframe
  if (!document.getElementById('_pr-style')) {
    const s = document.createElement('style');
    s.id = '_pr-style';
    s.textContent = '@keyframes _prSlide{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(s);
  }
  
  // Auto-dismiss
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

// ---- Hook into window.buildSystem ----
function interceptBuildSystem(): void {
  const bs = (window as any).buildSystem;
  if (!bs) return;
  if (bs.__depsPatched) return;
  bs.__depsPatched = true;
  
  // Wrap the run method (try common names)
  const runMethods = ['runProject', 'run', 'startProject', 'start', 'executeRun'];
  
  for (const methodName of runMethods) {
    if (typeof bs[methodName] === 'function') {
      const original = bs[methodName].bind(bs);
      bs[methodName] = async function(...args: any[]) {
        // Re-check deps (might have changed)
        await checkDeps();
        
        if (depsStatus === 'missing') {
          showDepsWarning();
          return; // Block the run
        }
        
        return original(...args);
      };
      console.log('[PreRunCheck] Wrapped buildSystem.' + methodName);
      break;
    }
  }
}

// ---- Hook Run button click (fallback) ----
function hookRunButton(): boolean {
  // Find by ID, class, or text content
  let runBtn: HTMLElement | null = document.getElementById('run-button')
    || document.querySelector('.run-button') as HTMLElement;
  
  // Fallback: find button with "Run" or "▶" text
  if (!runBtn) {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim();
      if (text === 'Run' || text === '\u25B6' || text === '\u25B6 Run' || text.includes('▶')) {
        // Make sure it's the toolbar run button, not some other button
        if (btn.closest('.toolbar, .editor-toolbar, .header-toolbar, .top-bar')) {
          runBtn = btn as HTMLElement;
          break;
        }
      }
    }
  }
  
  if (!runBtn || (runBtn as any).__prHooked) return !!(runBtn as any)?.__prHooked;
  (runBtn as any).__prHooked = true;
  
  runBtn.addEventListener('click', async (e: Event) => {
    // Only block if we KNOW deps are missing (don't block if unknown)
    if (depsStatus === 'missing') {
      e.stopImmediatePropagation();
      e.preventDefault();
      showDepsWarning();
    } else if (depsStatus === 'unknown') {
      // Quick check first
      await checkDeps();
      if (depsStatus === 'missing') {
        e.stopImmediatePropagation();
        e.preventDefault();
        showDepsWarning();
      }
    }
  }, true); // Capturing phase = runs first
  
  console.log('\u2705 [PreRunCheck] Run button interceptor hooked');
  return true;
}

// ---- F5 key interceptor ----
document.addEventListener('keydown', async (e: KeyboardEvent) => {
  if (e.key === 'F5' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    if (depsStatus === 'missing') {
      e.stopImmediatePropagation();
      e.preventDefault();
      showDepsWarning();
    } else if (depsStatus === 'unknown') {
      await checkDeps();
      if (depsStatus === 'missing') {
        e.stopImmediatePropagation();
        e.preventDefault();
        showDepsWarning();
      }
    }
  }
}, true);

// ---- Initialize ----
setTimeout(() => {
  // Check deps on load
  checkDeps().then(() => {
    console.log('[PreRunCheck] Initial check:', depsStatus);
  });
  
  // Hook buildSystem (runs after it's set up)
  interceptBuildSystem();
  
  // Also try to hook the run button
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    // Re-try buildSystem intercept
    interceptBuildSystem();
    // Try button hook
    if (hookRunButton() || attempts > 30) {
      clearInterval(interval);
    }
  }, 500);
  
  // Re-check deps periodically if missing (user might npm install externally)
  setInterval(() => {
    if (depsStatus === 'missing') {
      depsStatus = 'unknown';
      checkDeps();
    }
  }, 10000);
  
  // Re-check when folder changes
  const origFolderPath = Object.getOwnPropertyDescriptor(window, 'currentFolderPath');
  let _folderPath = (window as any).currentFolderPath;
  try {
    Object.defineProperty(window, 'currentFolderPath', {
      get() { return _folderPath; },
      set(val) { 
        _folderPath = val; 
        depsStatus = 'unknown';
        lastCheckedPath = '';
        setTimeout(() => checkDeps(), 500);
      },
      configurable: true
    });
  } catch(_) {
    // Property might not be configurable
  }
  
  console.log('\u2705 [PreRunCheck] Ready');
}, 3000);
