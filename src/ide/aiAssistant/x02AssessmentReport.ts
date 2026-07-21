// ============================================================================
// FILE: src/ide/aiAssistant/x02AssessmentReport.ts
// [EngAssessment] AI Engineering Assessment Report — the evolution of the
// professional code analysis. Design rules (agreed 2026-07-19):
//   - HONEST NUMBERS ONLY: every number has computable provenance. Score is
//     a published formula on counted findings; checklist is evidence-counted
//     N/M; confidence is qualitative + evidence count; time is a labeled
//     difficulty-band heuristic. The model is never asked for percentages.
//   - Clause references come from the curated checklist below (edition-
//     dated), never from model recall. Page numbers intentionally absent.
//   - Machine-readable twin (assessment.json) with stable finding IDs.
//   - Per-project score history (localStorage) renders the trend line.
//   - Fix-via-review buttons route through the Proposed-Changes dialog via
//     window.opener; disabled with an explanation in exported HTML.
// ============================================================================

import { callGenericAPI } from './apiProviderManager';

// Curated, edition-dated checklist. The model judges status+evidence per id;
// clause text here is short paraphrase only (ISO copyright).
const X02_ASIL_CHECKLIST: Array<{ id: string; title: string; clauses: string; group: string }> = [
  { id: 'det-1', group: 'Error detection',      title: 'Errors detected at architectural boundaries',            clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'det-2', group: 'Error detection',      title: 'External interface failures are caught',                  clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'det-3', group: 'Error detection',      title: 'No silent catch-all handlers',                            clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'cls-1', group: 'Fault classification', title: 'Faults carry a classification code',                      clauses: 'ISO 26262-6:2018 \u00a77.4.14, \u00a77.4.5' },
  { id: 'cls-2', group: 'Fault classification', title: 'Severity systematically derived, not caller-chosen',      clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'cls-3', group: 'Fault classification', title: 'Fault records carry time information',                    clauses: 'ISO 26262-6:2018 \u00a77.4.5' },
  { id: 'saf-1', group: 'Safe state',           title: 'Safe state entered on critical fault',                    clauses: 'ISO 26262-6:2018 \u00a77.4.4' },
  { id: 'saf-2', group: 'Safe state',           title: 'Safe-state exit condition specified',                     clauses: 'ISO 26262-6:2018 \u00a77.4.4, \u00a77.4.6' },
  { id: 'saf-3', group: 'Safe state',           title: 'Operations suppressed while in safe state',               clauses: 'ISO 26262-6:2018 \u00a77.4.4' },
  { id: 'saf-4', group: 'Safe state',           title: 'Safe-state transitions are logged',                       clauses: 'ISO 26262-6:2018 \u00a77.4.4' },
  { id: 'dia-1', group: 'Diagnostic surfacing', title: 'Critical faults visible outside the component',           clauses: 'ISO 26262-6:2018 \u00a77.4.14; Part 5 \u00a77.4.2.3' },
  { id: 'dia-2', group: 'Diagnostic surfacing', title: 'Fault history available for diagnosis',                   clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'dia-3', group: 'Diagnostic surfacing', title: 'Fault data structured for automated analysis',            clauses: 'ISO 26262-6:2018 \u00a77.4.14' },
  { id: 'ver-1', group: 'Verification hooks',   title: 'Error paths are testable / fault-injectable',             clauses: 'ISO 26262-6:2018 \u00a79' }
];

const BAND: any = { EASY: '<15m', MEDIUM: '15\u201360m', HARD: '>1h' };

function esc(t: any): string {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function parseAssessmentJson(response: string): any | null {
  try {
    const clean = response.replace(/```json/gi, '```').replace(/```/g, '').trim();
    const s = clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
    return JSON.parse(s);
  } catch (_) { return null; }
}

function buildPrompt(original: string, modified: string, fileName: string, description: string): string {
  const items = X02_ASIL_CHECKLIST.map(i => i.id + ': ' + i.title).join('\n');
  return 'You are a senior functional-safety software assessor. Assess this code change.\n\n' +
    'File: ' + fileName + '\nChange intent: ' + description + '\n\n' +
    'ORIGINAL:\n```\n' + original + '\n```\n\nMODIFIED:\n```\n' + modified + '\n```\n\n' +
    'CHECKLIST ITEMS (judge each by id):\n' + items + '\n\n' +
    'Reply with ONLY this JSON, no prose, no markdown fences. Do NOT output any scores, percentages, or time estimates - those are computed by the IDE:\n' +
    '{"execSummary": "3-4 sentences", "aiSummary": "2 sentences: is it sound, what single thing blocks it",\n' +
    ' "findings": [{"severity": "CRITICAL|MAJOR|MINOR", "line": "L<n>", "category": "safe-state|error-handling|robustness|diagnosability|types|quality",\n' +
    '   "finding": "what", "evidence": "verbatim observation from the code proving it", "confidence": "HIGH|MEDIUM|LOW", "evidenceCount": 1,\n' +
    '   "checklistId": "matching checklist id or null", "fix": "short fix", "fixInstruction": "imperative instruction usable as an AI edit prompt", "difficulty": "EASY|MEDIUM|HARD"}],\n' +
    ' "checklist": [{"id": "each id above", "status": "yes|no|na", "evidence": "short code observation"}],\n' +
    ' "rootCause": {"chain": ["step 1", "step 2", "..."], "confidence": "HIGH|MEDIUM|LOW", "evidence": ["source 1", "source 2"]},\n' +
    ' "beforeAfter": {"gained": ["benefit gained by the change"], "missing": "what still lacks"},\n' +
    ' "actions": [{"title": "action", "why": "reason + finding it closes", "closes": ["finding index 0-based"], "verify": ["check 1", "check 2"], "difficulty": "EASY|MEDIUM|HARD"}],\n' +
    ' "risk": {"likelihood": "LOW|MEDIUM|HIGH", "severity": "LOW|MEDIUM|HIGH", "residual": "LOW|MEDIUM|HIGH", "rationale": "one sentence"},\n' +
    ' "decision": {"release": "OK|NOT_RECOMMENDED", "reason": "one line", "nextStep": "one line"}}';
}

function computeScore(findings: any[]): number {
  let c = 0, M = 0, m = 0;
  findings.forEach(f => {
    const s = String(f.severity || '').toUpperCase();
    if (s === 'CRITICAL') c++; else if (s === 'MAJOR') M++; else m++;
  });
  return Math.max(0, 100 - 15 * c - 5 * M - 1 * m);
}

function severityCounts(findings: any[]): any {
  const out: any = { crit: 0, maj: 0, min: 0 };
  findings.forEach(f => {
    const s = String(f.severity || '').toUpperCase();
    if (s === 'CRITICAL') out.crit++; else if (s === 'MAJOR') out.maj++; else out.min++;
  });
  return out;
}

function historyKey(fileName: string): string { return 'x02-assessment-history:' + fileName; }

function pushHistory(fileName: string, score: number, counts: any): any[] {
  try {
    const key = historyKey(fileName);
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ ts: Date.now(), score: score, counts: counts });
    while (arr.length > 12) { arr.shift(); }
    localStorage.setItem(key, JSON.stringify(arr));
    return arr;
  } catch (_) { return []; }
}

function heatmapHtml(findings: any[], startLine: number, endLine: number): string {
  const span = Math.max(1, endLine - startLine);
  const sevClass: any = { CRITICAL: 'crit', MAJOR: 'maj', MINOR: 'warn' };
  const marks = findings.map((f, i) => {
    const n = parseInt(String(f.line || '').replace(/[^0-9]/g, ''), 10);
    return { pos: isNaN(n) ? 0 : Math.min(1, Math.max(0, (n - startLine) / span)), cls: sevClass[String(f.severity || '').toUpperCase()] || 'warn', i: i, line: f.line };
  }).sort((a, b) => a.pos - b.pos);
  let segs = ''; let prev = 0;
  marks.forEach(mk => {
    const w = Math.max(0, mk.pos - prev - 0.03);
    if (w > 0.01) { segs += '<div class="ok" style="flex:' + w.toFixed(3) + '"></div>'; }
    segs += '<div class="' + mk.cls + '" style="flex:0.06" data-t="' + esc(mk.line) + ': X02-A-' + String(mk.i + 1).padStart(3, '0') + '" onclick="x02go(\'f' + mk.i + '\')"></div>';
    prev = mk.pos + 0.03;
  });
  if (prev < 1) { segs += '<div class="ok" style="flex:' + (1 - prev).toFixed(3) + '"></div>'; }
  return segs;
}

export async function runEngineeringAssessment(opts: {
  original: string; modified: string; fileName: string;
  startLine: number; endLine: number; description: string;
}): Promise<void> {
  const response = await callGenericAPI(buildPrompt(opts.original, opts.modified, opts.fileName, opts.description || 'code change'));
  const a = parseAssessmentJson(response);
  if (!a || !a.findings || !a.decision) { throw new Error('assessment contract parse failed'); }

  const findings: any[] = a.findings || [];
  const counts = severityCounts(findings);
  const score = computeScore(findings);
  const modifiedLines = opts.modified.split('\n').length;
  const endLine = opts.startLine + modifiedLines;
  // projected score: findings closed by the first two actions removed
  const closed: any = {};
  (a.actions || []).slice(0, 2).forEach((act: any) => (act.closes || []).forEach((ix: any) => { closed[Number(ix)] = true; }));
  const projected = computeScore(findings.filter((_, i) => !closed[i]));
  const checklistById: any = {}; (a.checklist || []).forEach((c: any) => { checklistById[c.id] = c; });
  let covYes = 0, covTotal = 0;
  X02_ASIL_CHECKLIST.forEach(item => {
    const st = checklistById[item.id];
    if (st && String(st.status) !== 'na') { covTotal++; if (String(st.status) === 'yes') { covYes++; } }
  });
  const history = pushHistory(opts.fileName, score, counts);
  const now = new Date();
  const reportId = 'X02-EAR-' + now.toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(now.getTime()).slice(-4);
  const assessmentJson = {
    reportId: reportId, file: opts.fileName, lines: opts.startLine + '-' + opts.endLine,
    generated: now.toISOString(), generator: 'Operator X02', scoreFormula: '100 - 15*critical - 5*major - 1*minor',
    score: score, projectedScoreAfterTopActions: projected, counts: counts,
    checklistCoverage: covYes + '/' + covTotal,
    findings: findings.map((f, i) => Object.assign({ id: 'X02-A-' + String(i + 1).padStart(3, '0') }, f)),
    checklist: X02_ASIL_CHECKLIST.map(item => Object.assign({ title: item.title, clauses: item.clauses }, checklistById[item.id] || { id: item.id, status: 'na' })),
    rootCause: a.rootCause, actions: a.actions, risk: a.risk, decision: a.decision
  };

  const html = renderReport(a, assessmentJson, opts, { score: score, projected: projected, counts: counts, covYes: covYes, covTotal: covTotal, endLine: endLine, history: history, reportId: reportId });
  // [fix2] Tauri webviews do not honor window.open the browser way - the
  // call "succeeds" but no window ever displays. Route through the app's
  // proven HTML viewer instead (the same path the legacy professional
  // analysis and MISRA reports use, which accepts full HTML documents).
  const { HTMLViewerGenerator } = await import('./htmlViewerGenerator');
  HTMLViewerGenerator.openInNewWindow(html, 'AI Engineering Assessment Report');
}

function sevPill(sev: string): string {
  const s = String(sev || '').toUpperCase();
  const color = s === 'CRITICAL' ? '#f85149' : s === 'MAJOR' ? '#ff9d55' : '#d29922';
  return '<span class="pill" style="color:' + color + ';border:1px solid ' + color + '">' + esc(s) + '</span>';
}
function confTag(f: any): string {
  const c = String(f.confidence || 'MEDIUM').toUpperCase();
  const color = c === 'HIGH' ? '#3fb950' : c === 'LOW' ? '#f85149' : '#d29922';
  const n = Number(f.evidenceCount || 1);
  return '<span style="color:' + color + '">confidence ' + esc(c) + ' (' + n + ' evidence)</span>';
}

function renderReport(a: any, aj: any, opts: any, x: any): string {
  const findRows = (a.findings || []).map((f: any, i: number) => {
    const fid = 'X02-A-' + String(i + 1).padStart(3, '0');
    const item = X02_ASIL_CHECKLIST.filter(it => it.id === f.checklistId)[0];
    const clause = item ? '<span class="clause" onclick="x02tog(\'c' + i + '\')">' + esc(item.clauses) + '</span><div class="clause-x" id="c' + i + '">' + esc(item.title) + ' \u2014 curated checklist item ' + esc(item.id) + '</div>' : '\u2014';
    const fixBtn = f.fixInstruction ? '<br><span class="clause x02-fix" style="border-style:solid;display:inline-block;margin-top:4px" data-instr="' + esc(f.fixInstruction) + '">\u26a1 Fix via review</span>' : '';
    return '<tr id="f' + i + '"><td class="fid">' + fid + '</td><td>' + sevPill(f.severity) + '</td>' +
      '<td class="mono" style="color:#58a6ff">' + esc(f.line) + '</td>' +
      '<td><span class="pill pcat">' + esc(f.category) + '</span></td>' +
      '<td>' + esc(f.finding) + '<br><span class="ev">evidence: ' + esc(f.evidence) + ' \u00b7 ' + confTag(f) + '</span></td>' +
      '<td>' + clause + '</td><td>' + esc(f.fix) + fixBtn + '</td></tr>';
  }).join('');

  const covGroups: any = {};
  X02_ASIL_CHECKLIST.forEach(item => {
    const st = (aj.checklist || []).filter((c: any) => c.id === item.id)[0] || { status: 'na' };
    if (!covGroups[item.group]) { covGroups[item.group] = { yes: 0, total: 0, clauses: item.clauses, items: [] }; }
    if (String(st.status) !== 'na') { covGroups[item.group].total++; if (String(st.status) === 'yes') { covGroups[item.group].yes++; } }
    covGroups[item.group].items.push({ item: item, st: st });
  });
  const covRows = Object.keys(covGroups).map(g => {
    const d = covGroups[g];
    const pct = d.total ? Math.round(100 * d.yes / d.total) : 0;
    const color = pct === 100 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';
    return '<div class="cov-row"><span>' + esc(g) + ' <span class="mono cref">' + esc(d.clauses) + '</span></span>' +
      '<div class="bar"><i style="width:' + pct + '%;background:' + color + '"></i></div><span class="cov-n">' + d.yes + ' / ' + d.total + '</span></div>';
  }).join('');
  const covDetail = X02_ASIL_CHECKLIST.map(item => {
    const st = (aj.checklist || []).filter((c: any) => c.id === item.id)[0] || { status: 'na', evidence: '' };
    const mark = String(st.status) === 'yes' ? '<span style="color:#3fb950">\u2714</span>' : String(st.status) === 'no' ? '<span style="color:#f85149">\u2718</span>' : '<span style="color:#8b949e">\u2013</span>';
    return '<li>' + mark + ' ' + esc(item.title) + ' <span class="mono cref">[' + esc(item.clauses.replace('ISO 26262-6:2018 ', '')) + ']</span> \u2014 <q>' + esc(st.evidence || 'not assessed') + '</q></li>';
  }).join('');

  const actRows = (a.actions || []).map((act: any, i: number) => {
    const d = String(act.difficulty || 'MEDIUM').toUpperCase();
    const dc = d === 'EASY' ? '#3fb950' : d === 'HARD' ? '#f85149' : '#d29922';
    const checks = (act.verify || []).map((v: string) => '\u2610 ' + esc(v)).join(' &nbsp;');
    return '<div class="act"><span class="num">' + (i + 1) + '</span><div><b>' + esc(act.title) + '</b>' +
      '<div class="why">' + esc(act.why) + '</div><div class="verify">verify: ' + checks + '</div></div>' +
      '<span class="pill" style="align-self:center;color:' + dc + ';border:1px solid ' + dc + '">' + esc(d) + ' \u00b7 ' + esc(BAND[d] || '') + '</span></div>';
  }).join('');

  const tree = (a.rootCause && a.rootCause.chain || []).map((s: string, i: number) =>
    (i === 0 ? '' : '<span class="arrow">' + '&nbsp;'.repeat(i * 4) + '\u2514\u2500\u25b6</span> ') + esc(s)).join('<br>');
  const rc = a.rootCause || {};
  const risk = a.risk || {};
  const dec = a.decision || {};
  const relOk = String(dec.release || '').toUpperCase() === 'OK';
  const trend = (x.history.length >= 2)
    ? '<div class="honest" style="margin-top:10px">Score trend for ' + esc(opts.fileName) + ' (stored assessments): ' +
      x.history.slice(-4).map((h: any) => '<b>' + h.score + '</b>').join(' \u2192 ') + '</div>' : '';
  const bandNote = 'time bands are difficulty-class heuristics, not measurements';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AI Engineering Assessment Report \u2014 ' + esc(opts.fileName) + '</title><style>' +
    ':root{--bg:#0d1117;--panel:#161b22;--panel2:#1c2129;--border:#30363d;--text:#c9d1d9;--dim:#8b949e;--blue:#58a6ff;--purple:#a371f7;--purple2:#d2a8ff;--red:#f85149;--orange:#ff9d55;--green:#3fb950;--amber:#d29922;--cyan:#39c5cf}' +
    '*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--text);font-family:Segoe UI,system-ui,sans-serif;line-height:1.55}' +
    '.wrap{max-width:1080px;margin:0 auto;padding:34px 26px 80px}.mono{font-family:Consolas,monospace}' +
    '.rep-hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--purple);padding-bottom:16px;margin-bottom:14px}' +
    '.logo{width:40px;height:40px;border-radius:9px;background:linear-gradient(135deg,#a371f7,#d2a8ff);display:flex;align-items:center;justify-content:center;font-size:20px}' +
    'h1{font-size:21px}.sub{color:var(--dim);font-size:12.5px}.meta{margin-left:auto;text-align:right;font-family:Consolas,monospace;font-size:11.5px;color:var(--dim);line-height:1.7}.meta b{color:var(--blue)}' +
    '.method{display:flex;gap:7px;flex-wrap:wrap;font-family:Consolas,monospace;font-size:10.5px;color:var(--dim);margin:0 0 18px}.method span.s{color:var(--text)}' +
    'h2{font-size:12px;letter-spacing:.11em;color:var(--purple);margin:28px 0 12px;font-weight:700}h2 .n{color:var(--dim);font-weight:400;margin-right:8px}' +
    'p{font-size:13.5px;margin-bottom:8px}' +
    '.dash{display:grid;grid-template-columns:1.15fr .8fr .9fr .9fr 1fr;gap:12px}.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 16px}' +
    '.card .lbl{font-size:10.5px;letter-spacing:.08em;color:var(--dim);font-weight:700;margin-bottom:6px}.card .big{font-family:Consolas,monospace;font-size:26px;font-weight:700}.card .small{font-size:11.5px;color:var(--dim);margin-top:4px}' +
    '.vchip{display:inline-block;font-family:Consolas,monospace;font-size:13px;font-weight:700;border-radius:8px;padding:4px 14px;margin-top:2px;border:2px solid}' +
    '.sev-row{display:flex;gap:14px;font-family:Consolas,monospace;font-size:13px;margin-top:4px}.sev-row b{font-size:22px;display:block}' +
    '.reco{margin-top:12px;background:rgba(248,81,73,.08);border:1px solid rgba(248,81,73,.4);border-left-width:4px;border-radius:8px;padding:10px 16px;font-size:13px;display:flex;gap:12px;align-items:center}' +
    '.reco .tag{font-family:Consolas,monospace;font-size:10.5px;color:var(--red);border:1px solid var(--red);border-radius:9px;padding:1px 9px;font-weight:700;white-space:nowrap}' +
    '.honest{font-size:10.5px;color:var(--dim);font-family:Consolas,monospace;margin-top:8px}' +
    '.aisum{background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--purple);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:8px}' +
    '.heat{display:flex;height:22px;border-radius:6px;overflow:hidden;border:1px solid var(--border)}.heat div{cursor:pointer;position:relative}' +
    '.heat div:hover::after{content:attr(data-t);position:absolute;bottom:26px;left:50%;transform:translateX(-50%);background:var(--panel2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:10.5px;white-space:nowrap;z-index:5;color:var(--text)}' +
    '.heat .ok{background:rgba(63,185,80,.25)}.heat .warn{background:rgba(210,153,34,.4)}.heat .maj{background:rgba(255,157,85,.5)}.heat .crit{background:rgba(248,81,73,.55)}' +
    '.hs{display:flex;justify-content:space-between;font-family:Consolas,monospace;font-size:10px;color:var(--dim);margin:4px 0 10px}' +
    'table{width:100%;border-collapse:collapse;font-size:12.5px;background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden}' +
    'th{text-align:left;color:var(--dim);font-weight:600;font-size:10.5px;letter-spacing:.06em;background:var(--panel2);padding:8px 12px;border-bottom:1px solid var(--border)}' +
    'td{padding:9px 12px;border-bottom:1px solid #21262d;vertical-align:top}tr:last-child td{border-bottom:none}' +
    '.fid{font-family:Consolas,monospace;color:var(--purple2);font-size:11px;white-space:nowrap}' +
    '.pill{font-family:Consolas,monospace;font-size:10px;border-radius:9px;padding:1px 8px;font-weight:700;white-space:nowrap}.pcat{color:var(--cyan);border:1px solid var(--cyan);font-weight:600}' +
    '.ev{font-size:11px;color:var(--dim);font-family:Consolas,monospace}' +
    '.clause{font-family:Consolas,monospace;font-size:10.5px;color:var(--blue);border:1px dashed var(--blue);border-radius:6px;padding:1px 8px;cursor:pointer;white-space:nowrap}' +
    '.clause-x{display:none;margin:8px 0 2px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:12px}.clause-x.show{display:block}' +
    '.tree{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px 20px;font-family:Consolas,monospace;font-size:12.5px;line-height:2}.tree .arrow{color:var(--dim)}.tree .conf{margin-top:6px;font-size:11.5px;color:var(--dim)}.tree .conf b{color:var(--green)}' +
    '.ba{display:grid;grid-template-columns:1fr 1fr 220px;border:1px solid var(--border);border-radius:10px;overflow:hidden}.ba>div{padding:12px 14px;font-family:Consolas,monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow:auto;max-height:380px}' +
    '.ba .b{background:rgba(248,81,73,.07);border-right:1px solid var(--border)}.ba .a{background:rgba(46,160,67,.07);border-right:1px solid var(--border)}.ba .ben{background:var(--panel);font-family:Segoe UI,sans-serif;white-space:normal}.ba .lbl{font-size:10px;letter-spacing:.07em;color:var(--dim);font-weight:700;margin-bottom:6px;font-family:Segoe UI,sans-serif}' +
    '.cov{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 18px}.cov-row{display:grid;grid-template-columns:250px 1fr 70px;gap:12px;align-items:center;padding:6px 0;font-size:12.5px}' +
    '.cref{font-size:10.5px;color:var(--blue)}.bar{height:9px;background:#21262d;border-radius:5px;overflow:hidden}.bar i{display:block;height:100%;border-radius:5px}.cov-n{font-family:Consolas,monospace;font-size:11.5px;color:var(--dim);text-align:right}' +
    '.cov details{margin-top:10px;font-size:12px;color:var(--dim)}.cov summary{cursor:pointer;color:var(--blue);font-size:12px}.cov li{margin:4px 0 4px 18px;list-style:none}.cov q{font-family:Consolas,monospace;font-size:11px;color:var(--purple2)}' +
    '.act{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:10px;display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:start}' +
    '.act .num{font-family:Consolas,monospace;font-size:16px;font-weight:700;color:var(--purple2)}.act b{display:block;font-size:13px;margin-bottom:2px}.act .why{font-size:12px;color:var(--dim)}.act .verify{font-size:11.5px;color:var(--green);font-family:Consolas,monospace;margin-top:4px}' +
    '.verdict{border:2px solid;border-radius:12px;padding:18px 22px}.verdict .row{display:flex;gap:34px;flex-wrap:wrap;font-size:13px}.verdict .row div b{display:block;font-family:Consolas,monospace;font-size:16px;margin-top:2px}.verdict ul{margin:10px 0 0 20px;font-size:12.5px}' +
    '.foot{margin-top:34px;border-top:1px solid var(--border);padding-top:14px;display:flex;align-items:center;gap:14px;font-size:11.5px;color:var(--dim)}.btn{background:var(--panel2);border:1px solid var(--border);color:var(--blue);border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px}.motto{margin-left:auto;font-style:italic;color:var(--purple2)}' +
    '</style></head><body><div class="wrap">' +
    '<div class="rep-hd"><div class="logo">\u25c6</div><div><h1>AI Engineering Assessment Report</h1><div class="sub">Operator X02 \u00b7 AI Hardware Debugging Platform</div></div>' +
    '<div class="meta">Report <b>' + esc(x.reportId) + '</b><br>' + esc(opts.fileName) + ' \u00b7 lines ' + opts.startLine + '\u2013' + opts.endLine + '<br>' + esc(new Date().toLocaleString()) + ' \u00b7 Generated by <b>Operator X02</b></div></div>' +
    '<div class="method"><span>METHOD</span><span class="s">Source</span>\u2192<span class="s">Diff</span>\u2192<span class="s">AI Review</span>\u2192<span class="s">Curated ISO Checklist</span>\u2192<span class="s">Report + assessment.json</span></div>' +
    '<h2><span class="n">1</span>ENGINEERING DASHBOARD</h2><div class="dash">' +
    '<div class="card"><div class="lbl">ENGINEERING VERDICT</div><span class="vchip" style="color:' + (relOk ? 'var(--green);border-color:var(--green)' : 'var(--amber);border-color:var(--amber)') + '">' + (relOk ? 'PASS' : 'PASS \u00b7 WITH CONDITIONS') + '</span>' +
    '<div class="small">Production ready: <b style="color:' + (relOk ? 'var(--green)">YES' : 'var(--red)">NO') + '</b></div></div>' +
    '<div class="card"><div class="lbl">ENGINEERING SCORE</div><div class="big" style="color:' + (x.score >= 85 ? 'var(--green)' : x.score >= 60 ? 'var(--amber)' : 'var(--red)') + '">' + x.score + '<span style="font-size:14px;color:var(--dim)">/100</span></div>' +
    '<div class="small mono">100 \u221215\u00d7' + x.counts.crit + 'c \u22125\u00d7' + x.counts.maj + 'M \u22121\u00d7' + x.counts.min + 'm</div></div>' +
    '<div class="card"><div class="lbl">FINDINGS</div><div class="sev-row"><span style="color:var(--red)"><b>' + x.counts.crit + '</b>CRIT</span><span style="color:var(--orange)"><b>' + x.counts.maj + '</b>MAJOR</span><span style="color:var(--amber)"><b>' + x.counts.min + '</b>MINOR</span></div></div>' +
    '<div class="card"><div class="lbl">CHECKLIST</div><div class="big" style="color:var(--amber)">' + x.covYes + '<span style="font-size:14px;color:var(--dim)">/' + x.covTotal + '</span></div><div class="small">clauses addressed with evidence</div></div>' +
    '<div class="card"><div class="lbl">ASSESSMENT CONFIDENCE</div><div class="big" style="font-size:16px;color:var(--green)">' + esc((rc.confidence || 'MEDIUM')) + '</div>' +
    '<div class="small mono">' + (rc.evidence || []).map((e: string) => '\u2714 ' + esc(e)).join('<br>') + '</div></div></div>' +
    ((a.findings || []).length && !relOk ? '<div class="reco"><span class="tag">TOP PRIORITY</span>' + esc(dec.reason || '') + ' ' + esc(dec.nextStep || '') + '</div>' : '') +
    '<div class="honest">All counts computed from findings \u00b7 score = published formula on counted findings \u00b7 checklist = evidence-counted N/M \u00b7 ' + bandNote + ' \u00b7 clause refs from the curated IDE checklist, edition-dated \u00b7 no invented percentages</div>' +
    '<h2><span class="n">2</span>EXECUTIVE SUMMARY</h2><div class="aisum"><b>AI Summary:</b> ' + esc(a.aiSummary || '') + '</div><p>' + esc(a.execSummary || '') + '</p>' +
    '<h2><span class="n">3</span>AI FINDINGS</h2>' +
    '<div class="heat">' + heatmapHtml(a.findings || [], opts.startLine, x.endLine) + '</div>' +
    '<div class="hs"><span>L' + opts.startLine + '</span><span>L' + Math.round((opts.startLine + x.endLine) / 2) + '</span><span>L' + x.endLine + '</span></div>' +
    '<table><tr><th>ID</th><th>SEV</th><th>LINE</th><th>CATEGORY</th><th>FINDING \u00b7 EVIDENCE</th><th>STANDARD</th><th>SUGGESTED FIX</th></tr>' + findRows + '</table>' +
    '<h2><span class="n">4</span>ROOT-CAUSE REASONING</h2><div class="tree">' + tree +
    '<div class="conf">Confidence: <b>' + esc(rc.confidence || 'MEDIUM') + '</b> \u2014 evidence: ' + esc((rc.evidence || []).join(' \u00b7 ')) + '</div></div>' +
    '<h2><span class="n">5</span>KEY CHANGE \u2014 BEFORE / AFTER <span style="color:var(--dim);font-weight:400;font-size:11px">(actual code from the proposal, not model-echoed)</span></h2><div class="ba">' +
    '<div class="b"><div class="lbl">BEFORE \u274c \u00b7 lines ' + opts.startLine + '\u2013' + opts.endLine + '</div>' + esc(opts.original) + '</div>' +
    '<div class="a"><div class="lbl">AFTER \u2714 \u00b7 as proposed</div>' + esc(opts.modified) + '</div>' +
    '<div class="ben"><div class="lbl">GAINED</div>' + ((a.beforeAfter || {}).gained || []).map((g: string) => '\u2022 ' + esc(g)).join('<br>') +
    '<br><br><span style="color:var(--dim);font-size:11px">Still missing: ' + esc((a.beforeAfter || {}).missing || '\u2014') + '</span></div></div>' +
    '<h2><span class="n">6</span>ASIL CHECKLIST COVERAGE \u2014 ' + x.covYes + ' / ' + x.covTotal + ' <span style="color:var(--dim);font-weight:400;font-size:11px">(counted, not estimated \u00b7 clause refs from the curated IDE checklist)</span></h2>' +
    '<div class="cov">' + covRows + '<details><summary>Show all ' + X02_ASIL_CHECKLIST.length + ' checklist items with evidence</summary>' + covDetail + '</details></div>' +
    '<h2><span class="n">7</span>REQUIRED ACTIONS <span style="color:var(--dim);font-weight:400;font-size:11px">(priority order \u00b7 each with verification checks)</span></h2>' + actRows +
    '<h2><span class="n">8</span>RESIDUAL RISK</h2><p><b class="mono" style="color:var(--amber)">' + esc(risk.residual || 'MEDIUM') + '</b> \u2014 ' + esc(risk.rationale || '') + ' <span style="color:var(--dim);font-size:12px">(likelihood ' + esc(risk.likelihood || '?') + ' \u00d7 severity ' + esc(risk.severity || '?') + ', qualitative placement)</span></p>' +
    '<h2><span class="n">9</span>AI ENGINEERING DECISION</h2>' +
    '<div class="verdict" style="border-color:' + (relOk ? 'var(--green)' : 'var(--red)') + ';background:' + (relOk ? 'rgba(63,185,80,.05)' : 'rgba(248,81,73,.05)') + '"><div class="row">' +
    '<div>RELEASE<b style="color:' + (relOk ? 'var(--green)">\u2713 OK' : 'var(--red)">\u2717 NOT RECOMMENDED') + '</b></div>' +
    '<div>REASON<b style="font-size:13px;font-family:Segoe UI,sans-serif">' + esc(dec.reason || '') + '</b></div>' +
    '<div>RESIDUAL RISK<b style="color:var(--amber)">' + esc(risk.residual || '') + '</b></div>' +
    '<div>CONFIDENCE<b style="color:var(--green)">' + esc(rc.confidence || 'MEDIUM') + ' \u00b7 ' + (rc.evidence || []).length + ' evidence</b></div></div>' +
    '<ul><li><b>Recommended next step:</b> ' + esc(dec.nextStep || '') + '</li>' +
    (relOk ? '' : '<li>Projected score after top actions: <b class="mono">' + x.projected + '/100</b> by the published formula.</li>') + '</ul></div>' + trend +
    '<div class="foot"><button class="btn" onclick="x02save()">\ud83d\udcbe Save HTML</button><button class="btn" onclick="x02json()">\ud83d\udcc4 Export assessment.json</button>' +
    '<span>Machine-readable twin with stable finding IDs</span><span class="motto">Coding is Art. Feel it. Enjoy it.</span></div>' +
    '</div><script id="x02-aj" type="application/json">' + JSON.stringify(aj).replace(/</g, '\\u003c') + '</scr' + 'ipt><script>' +
    'function x02tog(id){document.getElementById(id).classList.toggle("show")}' +
    'function x02go(id){var el=document.getElementById(id);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.style.background="rgba(163,113,247,.12)";setTimeout(function(){el.style.background=""},1200)}}' +
    'function x02dl(name,mime,text){var u=URL.createObjectURL(new Blob([text],{type:mime}));var l=document.createElement("a");l.href=u;l.download=name;l.click()}' +
    'function x02save(){x02dl("' + esc(x.reportId) + '.html","text/html","<!DOCTYPE html>"+document.documentElement.outerHTML)}' +
    'function x02json(){x02dl("' + esc(x.reportId) + '.json","application/json",document.getElementById("x02-aj").textContent)}' +
    'document.querySelectorAll(".x02-fix").forEach(function(b){b.onclick=function(){try{var de=window.opener&&window.opener.aiDirectEditor;' +
    'if(de&&de.editSelection){de.editSelection(b.getAttribute("data-instr"));window.opener.focus()}else{alert("Fix routing works inside the IDE session only - disabled in exported/standalone HTML.")}}catch(e){alert("Fix routing unavailable here.")}}});' +
    '</scr' + 'ipt></body></html>';
}
