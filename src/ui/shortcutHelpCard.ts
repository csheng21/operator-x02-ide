// ============================================================
// shortcutHelpCard.ts  |  Operator X02
// Extracted from main.ts by refactor_main.ps1
// showShortcutHelpCard / dismissShortcutHelpCard
// ============================================================

// ============================================================================
export function showShortcutHelpCard(): void {
  if (document.getElementById('x02-help-card')) {
    dismissShortcutHelpCard();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'x02-help-card';
  overlay.style.cssText = [
    'position:fixed','top:0','left:0','right:0','bottom:0',
    'z-index:99999','display:flex','align-items:center','justify-content:center',
    'background:rgba(0,0,0,0.6)','animation:x02FadeIn 0.15s ease'
  ].join(';');

  const nl2 = '\n';
  const card = document.createElement('div');
  card.style.cssText = [
    'background:#1e1e1e','border:1px solid #3c3c3c','border-radius:10px',
    'padding:28px 32px','max-width:720px','width:90%','max-height:85vh',
    'overflow-y:auto','box-shadow:0 20px 60px rgba(0,0,0,0.7)',
    'font-family:"Cascadia Code","Fira Code",Consolas,monospace','color:#cccccc',
    'animation:x02SlideUp 0.15s ease'
  ].join(';');

  const groups = [
    {
      title: 'AI Code Writing',
      color: '#4ec9b0',
      items: [
        ['Ctrl+Shift+I', 'Generate code at cursor from description'],
        ['Ctrl+Shift+E', 'Edit selected code with AI instruction'],
        ['Ctrl+K',       'Quick AI code generation popup'],
        ['Ctrl+Alt+A',   'AI Code Assistant Panel'],
        ['Ctrl+Shift+R', 'AI Code Review'],
        ['Ctrl+Shift+T', 'Generate Tests'],
        ['Ctrl+Shift+D', 'Generate Documentation'],
        ['Ctrl+Shift+F', 'Refactor Suggestions']
      ]
    },
    {
      title: 'Editor',
      color: '#569cd6',
      items: [
        ['Ctrl+S',       'Save file'],
        ['Ctrl+N',       'New file'],
        ['Ctrl+Shift+N', 'New folder'],
        ['F5',           'Run project'],
        ['Shift+F5',     'Stop project'],
        ['Ctrl+L',       'Clear terminal']
      ]
    },
    {
      title: 'Panels & Views',
      color: '#ce9178',
      items: [
        ['Ctrl+Shift+G', 'Toggle Git / SVN panel'],
        ['Ctrl+Shift+H', 'Git history'],
        ['Ctrl+Shift+T', 'Toggle terminal context'],
        ['Ctrl+Shift+P', 'Preview tab'],
        ['Ctrl+Shift+O', 'Multi-provider settings'],
        ['Ctrl+Shift+C', 'Calibration panel'],
        ['Ctrl+Shift+A', 'Toggle AI chat']
      ]
    },
    {
      title: 'AI Chat',
      color: '#dcdcaa',
      items: [
        ['+',            'Attach file to message'],
        ['=',            'Insert current file as context'],
        ['#provider',    'Route message to specific AI (e.g. #groq hello)'],
        ['Ctrl+Shift+F', 'Search project files (AI)'],
        ['Ctrl+Shift+[', 'Chat panel narrower'],
        ['Ctrl+Shift+]', 'Chat panel wider']
      ]
    }
  ];

  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-size:18px;font-weight:700;color:#fff;">Operator X02 - Keyboard Shortcuts</div>' +
    '<div style="font-size:12px;color:#666;cursor:pointer;" id="x02-help-close">Press ? or Esc to close</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';

  for (const g of groups) {
    html += '<div><div style="font-size:11px;font-weight:700;color:' + g.color +
      ';letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:6px;">' +
      g.title + '</div><table style="width:100%;border-collapse:collapse;">';
    for (const [key, desc] of g.items) {
      html += '<tr style="line-height:1.9;">' +
        '<td style="padding-right:14px;white-space:nowrap;">' +
        '<kbd style="background:#2d2d2d;border:1px solid #555;border-radius:3px;padding:2px 7px;font-size:11px;color:#fff;font-family:inherit;">' +
        key + '</kbd></td>' +
        '<td style="font-size:12px;color:#aaa;">' + desc + '</td></tr>';
    }
    html += '</table></div>';
  }

  html += '</div><div style="margin-top:20px;text-align:center;font-size:11px;color:#444;">' +
    'Coding is Art. Feel it. Enjoy it. &nbsp;&middot;&nbsp; operatorx02.com</div>';

  card.innerHTML = html;

  if (!document.getElementById('x02-help-styles')) {
    const style = document.createElement('style');
    style.id = 'x02-help-styles';
    style.textContent = '@keyframes x02FadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes x02SlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) dismissShortcutHelpCard();
  });
  const closeBtn = overlay.querySelector('#x02-help-close') as HTMLElement;
  if (closeBtn) closeBtn.addEventListener('click', dismissShortcutHelpCard);

  console.log('[X02] Shortcut help card shown. Press Ctrl+? or Esc to close.');
}


export function dismissShortcutHelpCard(): void {
  const el = document.getElementById('x02-help-card');
  if (el) el.remove();
}

