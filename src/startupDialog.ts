// src/startupDialog.ts
// Operator X02 — Startup Welcome Dialog
// Usage: import { showStartupDialog } from './startupDialog';
//        showStartupDialog();  ← call once on app init

export function showStartupDialog(): void {
  // Only show once per session (or remove localStorage check to show every launch)
  // if (localStorage.getItem('x02_startup_shown')) return;
  // localStorage.setItem('x02_startup_shown', '1');

  const overlay = document.createElement('div');
  overlay.id = 'x02-startup-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,.72);
    display:flex;align-items:center;justify-content:center;
    z-index:99999;padding:20px;
    font-family:'Segoe UI',system-ui,sans-serif;
    animation:x02FadeIn .4s ease both;
  `;

  overlay.innerHTML = `
<style>
@keyframes x02FadeIn{from{opacity:0}to{opacity:1}}
@keyframes x02SlideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes x02Shimmer{0%,100%{opacity:1}50%{opacity:.65}}
@keyframes x02BadgePop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
@keyframes x02MemPulse{0%,100%{opacity:.5;transform:scaleX(1)}50%{opacity:1;transform:scaleX(1.02)}}
</style>

<div style="width:560px;max-height:90vh;overflow-y:auto;background:#1a1a1c;border:1px solid #2e2e32;border-radius:14px;animation:x02SlideUp .5s cubic-bezier(.22,.68,0,1.2) both;scrollbar-width:thin;scrollbar-color:#2e2e32 transparent">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0d1a0d 0%,#111318 60%,#0a0e1a 100%);padding:28px 28px 22px;border-bottom:1px solid #2a2a2e;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(78,201,176,.07) 0%,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
      <div style="width:44px;height:44px;border-radius:10px;background:#0e1e0e;border:1.5px solid #1a8c5a;display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:x02Shimmer 3s ease-in-out infinite">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><polygon points="13,2 2,20 24,20" fill="none" stroke="#4ec9b0" stroke-width="1.8" stroke-linejoin="round"/><line x1="13" y1="8" x2="13" y2="15" stroke="#4ec9b0" stroke-width="1.8" stroke-linecap="round"/><circle cx="13" cy="18" r="1.2" fill="#4ec9b0"/></svg>
      </div>
      <div>
        <div style="font-size:20px;font-weight:600;color:#e8e8ea;letter-spacing:-.3px">Operator X02
          <span style="font-size:12px;font-weight:400;color:#4ec9b0;background:rgba(78,201,176,.1);border:1px solid rgba(78,201,176,.2);border-radius:4px;padding:2px 8px;margin-left:4px;vertical-align:middle;animation:x02BadgePop .5s .4s both ease backwards">BETA</span>
        </div>
        <div style="font-size:12.5px;color:#7c7c82;margin-top:2px">AI-Powered Embedded &amp; Edge IDE</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      <div style="background:rgba(78,201,176,.07);border:1px solid rgba(78,201,176,.15);border-radius:7px;padding:10px 12px;animation:x02SlideUp .4s .15s both ease">
        <div style="font-size:18px;font-weight:600;color:#4ec9b0">6</div>
        <div style="font-size:11px;color:#7c7c82;margin-top:1px">AI Providers</div>
      </div>
      <div style="background:rgba(86,156,214,.07);border:1px solid rgba(86,156,214,.15);border-radius:7px;padding:10px 12px;animation:x02SlideUp .4s .22s both ease">
        <div style="font-size:18px;font-weight:600;color:#569cd6">40+</div>
        <div style="font-size:11px;color:#7c7c82;margin-top:1px">Build Systems</div>
      </div>
      <div style="background:rgba(197,134,192,.07);border:1px solid rgba(197,134,192,.15);border-radius:7px;padding:10px 12px;animation:x02SlideUp .4s .29s both ease">
        <div style="font-size:18px;font-weight:600;color:#c586c0">200+</div>
        <div style="font-size:11px;color:#7c7c82;margin-top:1px">Modules</div>
      </div>
    </div>
  </div>

  <!-- PLATFORMS -->
  <div style="padding:14px 28px;border-bottom:1px solid #222226;animation:x02SlideUp .4s .3s both ease">
    <div style="font-size:11px;color:#5a5a60;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Supported platforms</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap">
      <span style="background:#1a2a1a;border:1px solid #2a4a2a;color:#4ec9b0;font-size:11.5px;padding:4px 11px;border-radius:5px">NVIDIA Jetson</span>
      <span style="background:#1a1e2a;border:1px solid #2a2e4a;color:#569cd6;font-size:11.5px;padding:4px 11px;border-radius:5px">Arduino / ESP32</span>
      <span style="background:#2a1a1a;border:1px solid #4a2a2a;color:#f44747;font-size:11.5px;padding:4px 11px;border-radius:5px">Raspberry Pi</span>
      <span style="background:#1e1a2a;border:1px solid #3a2a4a;color:#c586c0;font-size:11.5px;padding:4px 11px;border-radius:5px">Android</span>
      <span style="background:#1e2a1a;border:1px solid #2a4a2a;color:#b5cea8;font-size:11.5px;padding:4px 11px;border-radius:5px">CUDA / GPU</span>
    </div>
  </div>

  <!-- FEATURES -->
  <div style="padding:14px 28px;border-bottom:1px solid #222226;animation:x02SlideUp .4s .36s both ease">
    <div style="font-size:11px;color:#5a5a60;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Key features</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">

      <!-- BOUNDLESS MEMORY — full width hero -->
      <div style="grid-column:1/-1;background:linear-gradient(135deg,#0e1a2e 0%,#0a1420 100%);border:1px solid rgba(86,156,214,.35);border-radius:9px;padding:14px 16px;position:relative;overflow:hidden">
        <div style="position:absolute;bottom:-18px;right:-18px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(86,156,214,.1) 0%,transparent 70%);pointer-events:none"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(86,156,214,.08)">
          <div style="height:100%;background:linear-gradient(90deg,transparent,rgba(86,156,214,.5),transparent);animation:x02MemPulse 2.5s ease-in-out infinite;width:60%"></div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:36px;height:36px;border-radius:8px;background:rgba(86,156,214,.12);border:1px solid rgba(86,156,214,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="4" width="16" height="10" rx="2" stroke="#569cd6" stroke-width="1.3"/><rect x="3" y="6.5" width="3" height="5" rx=".8" fill="#569cd6" opacity=".7"/><rect x="7.5" y="6.5" width="3" height="5" rx=".8" fill="#569cd6" opacity=".5"/><rect x="12" y="6.5" width="3" height="5" rx=".8" fill="#569cd6" opacity=".3"/><line x1="9" y1="1.5" x2="9" y2="4" stroke="#569cd6" stroke-width="1.2" stroke-linecap="round"/><line x1="5" y1="14" x2="5" y2="16.5" stroke="#569cd6" stroke-width="1.2" stroke-linecap="round"/><line x1="13" y1="14" x2="13" y2="16.5" stroke="#569cd6" stroke-width="1.2" stroke-linecap="round"/></svg>
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:13.5px;color:#c8d8f0;font-weight:600">Boundless Memory</span>
              <span style="font-size:10px;color:#569cd6;background:rgba(86,156,214,.12);border:1px solid rgba(86,156,214,.25);border-radius:3px;padding:1px 7px;font-weight:600">UNLIMITED</span>
            </div>
            <div style="font-size:12px;color:#6a8aaa;line-height:1.55">AI remembers your entire codebase — every file, every decision, every context. No token limits, no forgotten history. The longer you work, the smarter it gets.</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(86,156,214,.12)">
          <div style="display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:#4ec9b0"></div><span style="font-size:11px;color:#6a8aaa">Full project context</span></div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:#569cd6"></div><span style="font-size:11px;color:#6a8aaa">Persistent across sessions</span></div>
          <div style="display:flex;align-items:center;gap:5px"><div style="width:6px;height:6px;border-radius:50%;background:#c586c0"></div><span style="font-size:11px;color:#6a8aaa">Auto architecture reports</span></div>
        </div>
      </div>

      <div style="display:flex;align-items:flex-start;gap:10px;background:#141416;border:1px solid #222226;border-radius:8px;padding:10px 12px">
        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:1px"><circle cx="8" cy="8" r="7" fill="none" stroke="#4ec9b0" stroke-width="1.2"/><path d="M5 8l2 2 4-4" stroke="#4ec9b0" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div><div style="font-size:12.5px;color:#c8c8cc;font-weight:500">Surgical Edit Engine</div><div style="font-size:11px;color:#5a5a62;margin-top:2px">Targeted edits with auto-backup</div></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;background:#141416;border:1px solid #222226;border-radius:8px;padding:10px 12px">
        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:1px"><rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="#569cd6" stroke-width="1.2"/><circle cx="5" cy="8" r="1.5" fill="#569cd6"/><line x1="8" y1="6" x2="13" y2="6" stroke="#569cd6" stroke-width="1" stroke-linecap="round"/><line x1="8" y1="8" x2="13" y2="8" stroke="#569cd6" stroke-width="1" stroke-linecap="round"/></svg>
        <div><div style="font-size:12.5px;color:#c8c8cc;font-weight:500">Camera Code Analysis</div><div style="font-size:11px;color:#5a5a62;margin-top:2px">Capture code from whiteboard</div></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;background:#141416;border:1px solid #222226;border-radius:8px;padding:10px 12px">
        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:1px"><path d="M8 1L10 6h5L11 9.5l2 5L8 12l-5 2.5 2-5L1 6h5z" fill="none" stroke="#dcdcaa" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <div><div style="font-size:12.5px;color:#c8c8cc;font-weight:500">8 AI Roles</div><div style="font-size:11px;color:#5a5a62;margin-top:2px">Architect, Dev, Reviewer...</div></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;background:#141416;border:1px solid #222226;border-radius:8px;padding:10px 12px">
        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;margin-top:1px"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="none" stroke="#c586c0" stroke-width="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="none" stroke="#c586c0" stroke-width="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="none" stroke="#c586c0" stroke-width="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="none" stroke="#c586c0" stroke-width="1.2"/></svg>
        <div><div style="font-size:12.5px;color:#c8c8cc;font-weight:500">100% Local &amp; Private</div><div style="font-size:11px;color:#5a5a62;margin-top:2px">Ollama + offline support</div></div>
      </div>
    </div>
  </div>

  <!-- GITHUB COMMUNITY -->
  <div style="padding:14px 28px;border-bottom:1px solid #222226;animation:x02SlideUp .4s .44s both ease">
    <div style="font-size:11px;color:#5a5a60;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Join the community</div>
    <div id="x02-gh-card" style="background:linear-gradient(135deg,#161b22 0%,#0d1117 100%);border:1px solid #30363d;border-radius:10px;padding:16px 18px;cursor:pointer;transition:border-color .2s,transform .15s;position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:radial-gradient(circle,rgba(240,136,62,.06) 0%,transparent 70%);pointer-events:none"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:8px;background:#21262d;border:1px solid #30363d;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#c9d1d9"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          </div>
          <div>
            <div style="font-size:13.5px;font-weight:600;color:#e6edf3">csheng21 / operator-x02-ide</div>
            <div style="font-size:11.5px;color:#7d8590;margin-top:2px">Open source AI IDE for embedded &amp; edge AI</div>
          </div>
        </div>
        <div id="x02-star-btn" style="display:flex;align-items:center;gap:6px;background:#21262d;border:1px solid #30363d;border-radius:6px;padding:6px 12px;flex-shrink:0;transition:background .15s,border-color .15s">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" fill="#f0883e"/></svg>
          <span style="font-size:12px;font-weight:600;color:#e6edf3">Star</span>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
        <span style="background:#1f2937;border:1px solid #374151;color:#60a5fa;font-size:10.5px;padding:3px 9px;border-radius:12px">rust</span>
        <span style="background:#1f2937;border:1px solid #374151;color:#34d399;font-size:10.5px;padding:3px 9px;border-radius:12px">typescript</span>
        <span style="background:#1f2937;border:1px solid #374151;color:#f59e0b;font-size:10.5px;padding:3px 9px;border-radius:12px">tauri</span>
        <span style="background:#1f2937;border:1px solid #374151;color:#a78bfa;font-size:10.5px;padding:3px 9px;border-radius:12px">embedded-ai</span>
        <span style="background:#1f2937;border:1px solid #374151;color:#f87171;font-size:10.5px;padding:3px 9px;border-radius:12px">edge-computing</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px">
      <div id="x02-btn-bug" style="background:#141416;border:1px solid #1e1e22;border-radius:7px;padding:10px;text-align:center;cursor:pointer;transition:border-color .2s">
        <svg width="18" height="18" viewBox="0 0 16 16" style="display:block;margin:0 auto 6px"><circle cx="8" cy="8" r="7" fill="none" stroke="#4ec9b0" stroke-width="1.2"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="#4ec9b0" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="10.5" r=".9" fill="#4ec9b0"/></svg>
        <div style="font-size:11px;font-weight:500;color:#c8c8cc">Report Bug</div>
        <div style="font-size:10px;color:#5a5a62;margin-top:2px">Issues</div>
      </div>
      <div id="x02-btn-discuss" style="background:#141416;border:1px solid #1e1e22;border-radius:7px;padding:10px;text-align:center;cursor:pointer;transition:border-color .2s">
        <svg width="18" height="18" viewBox="0 0 16 16" style="display:block;margin:0 auto 6px"><path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H7l-3 2.5V9H2a1 1 0 01-1-1V3a1 1 0 011-1z" fill="none" stroke="#569cd6" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <div style="font-size:11px;font-weight:500;color:#c8c8cc">Discuss</div>
        <div style="font-size:10px;color:#5a5a62;margin-top:2px">Discussions</div>
      </div>
      <div id="x02-btn-fork" style="background:#141416;border:1px solid #1e1e22;border-radius:7px;padding:10px;text-align:center;cursor:pointer;transition:border-color .2s">
        <svg width="18" height="18" viewBox="0 0 16 16" style="display:block;margin:0 auto 6px"><circle cx="5" cy="3" r="1.8" fill="none" stroke="#c586c0" stroke-width="1.2"/><circle cx="11" cy="3" r="1.8" fill="none" stroke="#c586c0" stroke-width="1.2"/><circle cx="8" cy="13" r="1.8" fill="none" stroke="#c586c0" stroke-width="1.2"/><path d="M5 4.8v1.7a2 2 0 002 2h2a2 2 0 002-2V4.8M8 8.5v2.7" stroke="#c586c0" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>
        <div style="font-size:11px;font-weight:500;color:#c8c8cc">Contribute</div>
        <div style="font-size:10px;color:#5a5a62;margin-top:2px">Fork &amp; PR</div>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div style="padding:16px 28px;animation:x02SlideUp .4s .5s both ease">
    <div style="display:flex;align-items:center;gap:8px;background:#12180e;border:1px solid #1e3018;border-radius:7px;padding:10px 14px;margin-bottom:14px">
      <svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0"><circle cx="7" cy="7" r="6" fill="none" stroke="#4ec9b0" stroke-width="1.2"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="#4ec9b0" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="9.5" r=".9" fill="#4ec9b0"/></svg>
      <span style="font-size:12px;color:#7cb87c">Right-click in the editor to access all AI actions instantly</span>
    </div>
    <div style="display:flex;gap:10px">
      <button id="x02-btn-start" style="flex:1;background:linear-gradient(135deg,#0e8a5a,#0a6e49);border:none;border-radius:8px;color:#fff;font-size:14px;font-weight:600;padding:13px;cursor:pointer;transition:filter .15s">Get Started</button>
      <button id="x02-btn-web" style="background:#1a1a1e;border:1px solid #2e2e34;border-radius:8px;color:#8c8c92;font-size:13px;padding:13px 18px;cursor:pointer;transition:background .15s">Website</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:12px">
      <span style="font-size:11px;color:#3a3a42;display:flex;align-items:center;gap:4px">
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="#3a3a42" stroke-width="1"/><path d="M3 5l1.5 1.5L7 3.5" stroke="#3a3a42" stroke-width="1" fill="none" stroke-linecap="round"/></svg>Open Source</span>
      <span style="font-size:11px;color:#3a3a42;display:flex;align-items:center;gap:4px">
        <svg width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="4" width="6" height="5" rx="1" fill="none" stroke="#3a3a42" stroke-width="1"/><path d="M3.5 4V3a1.5 1.5 0 013 0v1" fill="none" stroke="#3a3a42" stroke-width="1"/></svg>100% Local</span>
      <span style="font-size:11px;color:#3a3a42;display:flex;align-items:center;gap:4px">
        <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,1 9,4 9,9 1,9 1,4" fill="none" stroke="#3a3a42" stroke-width="1" stroke-linejoin="round"/></svg>Free Forever</span>
    </div>
  </div>

</div>
`;

  document.body.appendChild(overlay);
  _bindStartupEvents(overlay);
}

function _openUrl(url: string): void {
  // Use Tauri's open_external_url if available, otherwise fallback
  const tauri = (window as any).__TAURI__;
  if (tauri?.core?.invoke) {
    tauri.core.invoke('open_external_url', { url }).catch(() => window.open(url, '_blank'));
  } else {
    window.open(url, '_blank');
  }
}

function _close(overlay: HTMLElement): void {
  overlay.style.animation = 'x02FadeIn .25s ease reverse forwards';
  setTimeout(() => overlay.remove(), 260);
}

function _bindStartupEvents(overlay: HTMLElement): void {
  const REPO = 'https://github.com/csheng21/operator-x02-ide';

  const ghCard = overlay.querySelector('#x02-gh-card') as HTMLElement;
  ghCard?.addEventListener('mouseenter', () => { ghCard.style.borderColor = '#f0883e'; ghCard.style.transform = 'translateY(-1px)'; });
  ghCard?.addEventListener('mouseleave', () => { ghCard.style.borderColor = '#30363d'; ghCard.style.transform = ''; });
  ghCard?.addEventListener('click', () => _openUrl(REPO));

  const starBtn = overlay.querySelector('#x02-star-btn') as HTMLElement;
  starBtn?.addEventListener('mouseenter', () => { starBtn.style.background = '#2a3140'; starBtn.style.borderColor = '#f0883e'; });
  starBtn?.addEventListener('mouseleave', () => { starBtn.style.background = '#21262d'; starBtn.style.borderColor = '#30363d'; });

  const bugBtn = overlay.querySelector('#x02-btn-bug') as HTMLElement;
  bugBtn?.addEventListener('mouseenter', () => bugBtn.style.borderColor = '#4ec9b0');
  bugBtn?.addEventListener('mouseleave', () => bugBtn.style.borderColor = '#1e1e22');
  bugBtn?.addEventListener('click', (e) => { e.stopPropagation(); _openUrl(`${REPO}/issues`); });

  const discussBtn = overlay.querySelector('#x02-btn-discuss') as HTMLElement;
  discussBtn?.addEventListener('mouseenter', () => discussBtn.style.borderColor = '#569cd6');
  discussBtn?.addEventListener('mouseleave', () => discussBtn.style.borderColor = '#1e1e22');
  discussBtn?.addEventListener('click', (e) => { e.stopPropagation(); _openUrl(`${REPO}/discussions`); });

  const forkBtn = overlay.querySelector('#x02-btn-fork') as HTMLElement;
  forkBtn?.addEventListener('mouseenter', () => forkBtn.style.borderColor = '#c586c0');
  forkBtn?.addEventListener('mouseleave', () => forkBtn.style.borderColor = '#1e1e22');
  forkBtn?.addEventListener('click', (e) => { e.stopPropagation(); _openUrl(`${REPO}/fork`); });

  const startBtn = overlay.querySelector('#x02-btn-start') as HTMLElement;
  startBtn?.addEventListener('mouseenter', () => startBtn.style.filter = 'brightness(1.1)');
  startBtn?.addEventListener('mouseleave', () => startBtn.style.filter = '');
  startBtn?.addEventListener('click', () => _close(overlay));

  const webBtn = overlay.querySelector('#x02-btn-web') as HTMLElement;
  webBtn?.addEventListener('mouseenter', () => webBtn.style.background = '#222228');
  webBtn?.addEventListener('mouseleave', () => webBtn.style.background = '#1a1a1e');
  webBtn?.addEventListener('click', () => _openUrl('https://operatorx02.com'));

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _close(overlay);
  });

  // Close on Escape
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { _close(overlay); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}
