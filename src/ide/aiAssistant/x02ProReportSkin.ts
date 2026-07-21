// ============================================================================
// FILE: src/ide/aiAssistant/x02ProReportSkin.ts
// [ProSkin] Compact Engineering Grid restyle (his chosen option 4) for the
// legacy Professional Code Analysis report.
//
// Architecture: POST-PROCESSING SKIN. The generator (aiChangesExplanation)
// is untouched and keeps producing exactly the HTML it produces today; this
// module restructures + re-skins the finished document just before display:
//   - seven-part Change blocks (What/Why/How/References/Mechanism/
//     Verification/Coverage) become label-value grids (~half the scrolling)
//   - meta paragraph becomes a compact meta line; risk tables get severity
//     pills; "Reference:" paragraphs become citation chips
//   - GitHub-dark family tokens (matches the TwoCol dialog + assessment)
// CONTENT IS PRESERVED VERBATIM - nodes are re-arranged and re-clothed,
// never rewritten. If the document does not match the known structure
// (fewer than 3 recognized labels) or anything throws, the ORIGINAL html
// is returned unchanged and the classic report shows as before.
// ============================================================================

const SEVEN: { [k: string]: string } = {
  'What was changed': 'WHAT CHANGED',
  'Why it was changed': 'WHY',
  'How it improves safety': 'SAFETY IMPACT',
  'ISO 26262 References': 'ISO REFERENCES',
  'Safety Mechanism': 'SAFETY MECHANISM',
  'Verification Method': 'VERIFICATION',
  'Diagnostic Coverage Impact': 'DIAG COVERAGE'
};

function escT(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pillWord(w: string): string {
  const u = w.toUpperCase();
  let color = '';
  if (u === 'CRITICAL' || u === 'NOT ADDRESSED') { color = '#f85149'; }
  else if (u === 'HIGH') { color = '#ff9d55'; }
  else if (u === 'MEDIUM' || u === 'PARTIALLY MITIGATED') { color = '#d29922'; }
  else if (u === 'LOW' || u === 'MITIGATED' || u === 'ADDRESSED') { color = '#3fb950'; }
  if (!color) { return escT(w); }
  return '<span class="x4-pill" style="color:' + color + ';border-color:' + color + '">' + escT(u) + '</span>';
}

function pillifyTable(tbl: HTMLElement): string {
  const clone = tbl.cloneNode(true) as HTMLElement;
  clone.classList.add('x4-risk');
  clone.querySelectorAll('td').forEach((td) => {
    const t = (td.textContent || '').trim();
    if (/^(CRITICAL|HIGH|MEDIUM|LOW|Not Addressed|Partially Mitigated|Mitigated|Addressed)$/i.test(t)) {
      td.innerHTML = pillWord(t);
    }
  });
  return clone.outerHTML;
}

export function restyleProfessionalAnalysis(rawHtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    const content = (doc.querySelector('.content') || doc.body) as HTMLElement;
    if (!content || !content.children || content.children.length === 0) { return rawHtml; }

    let known = 0;
    content.querySelectorAll('h3').forEach((h) => { if (SEVEN[(h.textContent || '').trim()]) { known++; } });
    if (known < 3) { return rawHtml; }

    let out = '';
    let grid = '';
    let row: string | null = null;
    let rowBuf = '';
    let metaHtml = '';
    let compliance = '';

    const flushRow = () => {
      if (row !== null) {
        grid += '<div class="x4-row"><span class="x4-l">' + escT(row) + '</span><span class="x4-v">' + rowBuf + '</span></div>';
        row = null; rowBuf = '';
      }
    };
    const flushGrid = () => {
      flushRow();
      if (grid) { out += '<div class="x4-grid">' + grid + '</div>'; grid = ''; }
    };

    const kids = Array.prototype.slice.call(content.children) as HTMLElement[];
    for (let i = 0; i < kids.length; i++) {
      const el = kids[i];
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();

      if (!compliance && /Overall|Compliance Status/i.test(text)) {
        const m = text.match(/Non-?Compliant|Partially Compliant|Fully Compliant|Compliant/i);
        if (m) { compliance = m[0]; }
      }

      if (tag === 'h1') {
        flushGrid();
        if (/COMPLIANCE ANALYSIS REPORT|Professional Code Analysis/i.test(text)) { continue; }
        out += '<h2 class="x4-sec">' + escT(text) + '</h2>';
      } else if (tag === 'h2') {
        flushGrid();
        if (/^Change\s+\d/i.test(text)) {
          grid = '<div class="x4-gh">' + escT(text) + '</div>';
        } else {
          out += '<h3 class="x4-sub">' + escT(text) + '</h3>';
        }
      } else if (tag === 'h3') {
        const short = SEVEN[text];
        if (grid && short) { flushRow(); row = short; }
        else { flushGrid(); out += '<h3 class="x4-sub">' + escT(text) + '</h3>'; }
      } else if (tag === 'hr' || tag === 'style' || tag === 'script') {
        // structural noise - drop (no user content)
      } else if (!metaHtml && tag === 'p' && /<strong>\s*Project\s*<\/strong>/i.test(el.innerHTML)) {
        metaHtml = el.innerHTML.replace(/\n/g, ' <span class="x4-dot">\u00b7</span> ');
      } else {
        let html: string;
        if (tag === 'table') { html = pillifyTable(el); }
        else if (tag === 'p' && /^Reference\b/i.test(text)) { html = '<div class="x4-cite">' + el.innerHTML + '</div>'; }
        else { html = el.outerHTML; }
        if (row !== null) { rowBuf += html; }
        else if (grid) { grid += '<div class="x4-row"><span class="x4-l"></span><span class="x4-v">' + html + '</span></div>'; }
        else { out += html; }
      }
    }
    flushGrid();

    const compPill = compliance
      ? '<span class="x4-pill" style="color:#d29922;border-color:#d29922;font-size:11px;padding:2px 10px">' + escT(compliance.toUpperCase()) + '</span>'
      : '';

    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<title>Professional Code Analysis - Operator X02</title><style>' +
      ':root{--bg:#0d1117;--panel:#161b22;--panel2:#1c2129;--bd:#30363d;--bd2:#21262d;--tx:#c9d1d9;--tx2:#e6edf3;--dim:#8b949e;--purple:#a371f7;--blue:#58a6ff;--cyan:#39c5cf}' +
      '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font-family:Segoe UI,system-ui,sans-serif;line-height:1.65}' +
      '.x4-wrap{max-width:1000px;margin:0 auto;padding:0 24px 70px}' +
      '.x4-bar{position:sticky;top:0;display:flex;gap:12px;align-items:center;background:var(--panel2);border-bottom:1px solid var(--bd);padding:11px 24px;font-size:14px;font-weight:600;color:var(--tx2);z-index:5}' +
      '.x4-bar .sp{flex:1}' +
      '.x4-save{background:#238636;border:1px solid #2ea043;color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer}' +
      '.x4-save:hover{background:#2ea043}' +
      '.metaline,.x4-meta{font-family:Consolas,monospace;font-size:11.5px;color:var(--dim);margin:16px 0 6px;line-height:1.9}' +
      '.x4-meta strong{color:var(--blue);font-weight:600}' +
      '.x4-dot{color:var(--bd)}' +
      '.x4-sec{font-size:12px;letter-spacing:.1em;color:var(--purple);margin:26px 0 10px;font-weight:700}' +
      '.x4-sub{font-size:13.5px;color:var(--tx2);margin:14px 0 5px}' +
      'p{font-size:13px;margin:0 0 7px}p strong,li strong{color:var(--tx2)}' +
      'ul,ol{margin:0 0 8px 22px;font-size:13px}li{margin:2px 0}' +
      'code{font-family:Consolas,monospace;font-size:12px;color:#d2a8ff;background:var(--panel2);border:1px solid var(--bd2);border-radius:4px;padding:0 5px}' +
      '.x4-grid{border:1px solid var(--bd2);border-radius:9px;overflow:hidden;margin:0 0 12px;background:var(--panel)}' +
      '.x4-gh{background:var(--panel2);padding:9px 14px;font-size:13px;font-weight:600;color:var(--tx2)}' +
      '.x4-row{display:grid;grid-template-columns:160px 1fr;border-top:1px solid var(--bd2)}' +
      '.x4-l{padding:8px 12px;font-size:10.5px;color:var(--dim);font-weight:700;letter-spacing:.05em;background:rgba(255,255,255,.015)}' +
      '.x4-v{padding:8px 14px;font-size:12.5px;line-height:1.6;min-width:0}' +
      '.x4-v p{margin:0 0 4px;font-size:12.5px}' +
      '.x4-pill{font-family:Consolas,monospace;font-size:10px;border:1px solid;border-radius:9px;padding:1px 8px;font-weight:700;white-space:nowrap}' +
      '.x4-cite{font-family:Consolas,monospace;font-size:11px;color:var(--blue);border:1px dashed var(--blue);border-radius:6px;padding:4px 10px;display:inline-block;margin:2px 0 8px}' +
      '.x4-cite strong{color:var(--blue)}' +
      'table{width:100%;border-collapse:collapse;font-size:12.5px;margin:6px 0 10px}' +
      'th{text-align:left;color:var(--dim);font-size:10.5px;letter-spacing:.06em;border-bottom:1px solid var(--bd);padding:6px 10px 6px 0}' +
      'td{border-bottom:1px solid var(--bd2);padding:7px 10px 7px 0;vertical-align:top}' +
      '.x4-foot{margin-top:30px;border-top:1px solid var(--bd);padding-top:12px;font-size:11.5px;color:var(--dim);display:flex;gap:14px;align-items:center}' +
      '.x4-motto{margin-left:auto;font-style:italic;color:#d2a8ff}' +
      '@media (max-width:760px){.x4-row{grid-template-columns:1fr}.x4-l{padding-bottom:0}}' +
      '</style></head><body>' +
      '<div class="x4-bar">\ud83d\udee1\ufe0f ISO 26262 Compliance Analysis' + (compPill ? ' ' + compPill : '') +
      '<span class="sp"></span><button class="x4-save" onclick="x4save()">\ud83d\udcbe Save HTML</button></div>' +
      '<div class="x4-wrap">' +
      (metaHtml ? '<div class="x4-meta">' + metaHtml + '</div>' : '') +
      out +
      '<div class="x4-foot"><span>Generated by Operator X02 \u00b7 Professional Code Analysis</span>' +
      '<span class="x4-motto">Coding is Art. Feel it. Enjoy it.</span></div>' +
      '</div><script>' +
      'function x4save(){var u=URL.createObjectURL(new Blob(["<!DOCTYPE html>"+document.documentElement.outerHTML],{type:"text/html"}));' +
      'var a=document.createElement("a");a.href=u;a.download="professional-code-analysis-"+Date.now()+".html";a.click()}' +
      '</scr' + 'ipt></body></html>';
  } catch (_) {
    return rawHtml;
  }
}

// Mirror of HTMLViewerGenerator.markdownToHtml (same subset, same order),
// so the skin sees the same HTML the classic template would have shown.
function mdToHtml(markdown: string): string {
  let html = markdown;
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^---$/gim, '<hr>');
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, (m) => '<ul>' + m + '</ul>');
  html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, (match, header, rows) => {
    const headerCells = String(header).split('|').filter((c: string) => c.trim());
    const headerRow = '<tr>' + headerCells.map((c: string) => '<th>' + c.trim() + '</th>').join('') + '</tr>';
    const bodyRows = String(rows).trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim());
      return '<tr>' + cells.map((c: string) => '<td>' + c.trim() + '</td>').join('') + '</tr>';
    }).join('');
    return '<table>' + headerRow + bodyRows + '</table>';
  });
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<table>)/g, '$1');
  html = html.replace(/(<\/table>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  return html;
}

// v2 entry point: MARKDOWN in (what generateDetailedExplanation returns).
// Returns the full skinned document, or null when the structure is not
// recognized - caller then falls back to the classic viewer path.
export function restyleProfessionalAnalysisMarkdown(markdown: string): string | null {
  try {
    if (!markdown || markdown.indexOf('###') === -1) { return null; }
    const result = restyleProfessionalAnalysis('<div class="content">' + mdToHtml(markdown) + '</div>');
    return result.indexOf('x4-bar') !== -1 ? result : null;
  } catch (_) { return null; }
}
