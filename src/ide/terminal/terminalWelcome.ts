// ============================================================
// terminalWelcome.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// injectTerminalWelcomeUI / x02TerminalTick / startX02TerminalPoller
// ============================================================

// --- Welcome banner (injected once terminal panel is visible) ---
export function injectTerminalWelcomeUI(): void {
  if ((window as any).__terminalWelcomeDone) return;

  const selectors = ['.terminal-body','.terminal-output','.terminal-content','.xterm-rows','.term-output'];
  let out: HTMLElement | null = null;
  for (const s of selectors) { out = document.querySelector(s) as HTMLElement; if (out) break; }
  if (!out) return; // will retry via poller

  // Only inject if the terminal panel is actually visible to the user
  const panelVisible = out.offsetParent !== null || out.offsetHeight > 0 || out.offsetWidth > 0;
  if (!panelVisible) return; // panel hidden, skip for now

  if (out.querySelector('#x02-terminal-welcome')) return;
  (window as any).__terminalWelcomeDone = true;

  const now  = new Date();
  const dStr = now.toLocaleDateString('en-MY', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
  const tStr = now.toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const el = document.createElement('div');
  el.id = 'x02-terminal-welcome';
  el.style.cssText = [
    'font-family:"Cascadia Code","Fira Code",Consolas,monospace',
    'font-size:13px','line-height:1.7','padding:10px 16px 8px',
    'color:#4ec94e','user-select:none',
    'border-bottom:1px solid rgba(78,201,78,0.15)','margin-bottom:4px'
  ].join(';');

  const hr  = '<span style="color:#2ea043">' + '\u2500'.repeat(42) + '</span>';
  const dot = '<span style="color:#4ec94e">  \u25b8 </span>';
  const tl  = '\u250c' + '\u2500'.repeat(46) + '\u2510';
  const bl  = '\u2514' + '\u2500'.repeat(46) + '\u2518';

  el.innerHTML = '<div style="font-family:Consolas,Monaco,\"Courier New\",monospace;font-size:11px;line-height:1.6;padding:3px 0 3px 8px;border-left:2px solid #1a5c1a"><span style="color:#4ec94e;font-weight:700;letter-spacing:.5px">&#9889; OPERATOR X02</span><br><span style="color:#2a5a2a;font-size:10px">' + new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) + '  ' + new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).toLowerCase() + '</span><br><span style="color:#1a3a1a;font-size:10px">-------------------------------</span><br><span style="color:#3a7a3a;font-size:10px">run<span style="color:#1a3a1a">...........<\/span><span style="color:#4ec94e">Ctrl+Shift+B<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">chat<span style="color:#1a3a1a">.........<\/span><span style="color:#4ec94e">Ctrl+Shift+A<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">surgical<span style="color:#1a3a1a">.....<\/span><span style="color:#4ec94e">active<\/span><\/span><br><span style="color:#3a7a3a;font-size:10px">gpu<span style="color:#1a3a1a">............<\/span><span style="color:#4ec94e">live<\/span><\/span><br><span style="color:#1a3a1a;font-size:10px">-------------------------------<\/span><br><span style="color:#2a4a2a;font-style:italic;font-size:10px">Coding is Art. Feel it. Enjoy it.<\/span><\/div>';

  out.insertBefore(el, out.firstChild);
  console.log('[X02] Terminal welcome UI injected.');
}

// --- Single tick: click terminal tab + attempt banner injection ---
export function x02TerminalTick(): boolean {
  // 1. Find and click the TERMINAL tab if not already active
  const termTab = document.querySelector('[data-tab="terminal"]') as HTMLElement;
  const isActive = termTab && termTab.classList.contains('active');

  if (termTab && !isActive) {
    termTab.click();
    console.log('[X02] Tick: terminal tab clicked.');
  }

  // 2. Try injecting the welcome banner
  if (!(window as any).__terminalWelcomeDone) {
    injectTerminalWelcomeUI();
  }

  // Return true if both jobs are done
  return !!(isActive && (window as any).__terminalWelcomeDone);
}

// --- MAIN: Start polling loop immediately after initializeLayout() ---
export function startX02TerminalPoller(): void {
  // Guard: prevent multiple pollers running in parallel
  if ((window as any).__x02PollerRunning) {
    console.log('[X02] Terminal poller already running, skipping.');
    return;
  }
  (window as any).__x02PollerRunning = true;

  const startTime = Date.now();
  const maxDuration = 15000; // poll for 15 seconds max (production needs more time)
  const interval   = 100;  // every 100ms

  let ticks = 0;
  const timer = setInterval(function() {
    ticks++;
    const done = x02TerminalTick();
    const elapsed = Date.now() - startTime;

    if (done || elapsed > maxDuration) {
      clearInterval(timer);
      (window as any).__x02PollerRunning = false;
      if (done) {
        console.log('[X02] Terminal poller done after ' + ticks + ' ticks (' + elapsed + 'ms).');
      } else {
        console.warn('[X02] Terminal poller timed out after ' + ticks + ' ticks. Forcing one last time.');
        const t = document.querySelector('[data-tab="terminal"]') as HTMLElement;
        if (t) t.click();
        injectTerminalWelcomeUI();
      }
    }
  }, interval);

  console.log('[X02] Terminal poller started (100ms x 50 ticks max).');
}

