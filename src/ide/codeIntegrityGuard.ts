// ============================================================================
// codeIntegrityGuard.ts
// Defense-in-depth against syntax-highlight-scrape corruption.
//
// ROOT CAUSE this guards: code was extracted from the RENDERED / highlighted
// chat DOM (innerHTML) instead of the raw model message. The highlighter wraps
// tokens in <span class="string|number|comment|...">  and HTML-escapes quotes
// (' -> &#039;). A botched tag-strip then leaks `class="string">` fragments and
// broken entities into the source that gets written to disk, so the generated
// app fails to compile (the "black box / blank preview" symptom).
//
// The REAL fix is upstream: prefer the raw model text (buildRawCodeMapFromMessage)
// and never read highlighted innerHTML as a code source. This module is the
// floor at the extraction/write boundary so a poisoned file can never silently
// reach disk again. Same "refuse rather than pollute" stance as PathFix v3 (r1352).
// ============================================================================

const FRAGMENT_RE =
  /class="(?:string|number|comment|keyword|tag|attr|attribute|operator|punctuation|literal|built_in|title|params)">/gi;

/**
 * True only when content shows the highlight-scrape fingerprint. Deliberately
 * conservative so it does NOT fire on legitimate source/HTML that happens to
 * contain a styled <span> (e.g. a real `<span class="string">&#039;</span>`):
 *   - fused-entity markers (`&class="...">`, `class="number">039;`) are impossible
 *     in valid content -> always corruption;
 *   - otherwise we require MANY class-fragments whose `<span` openings were
 *     stripped away (intact <span> count far below the fragment count).
 */
export function isHighlightCorrupted(content: string): boolean {
  if (!content) return false;

  // Hard markers: an entity ampersand fused to a class attribute, or a number
  // span emitting exactly the tail of &#039; — neither occurs in valid content.
  if (/&class="(?:comment|number|string|keyword)">/.test(content)) return true;
  if (/class="number">0?39;/.test(content)) return true;

  const fragments = (content.match(FRAGMENT_RE) || []).length;
  if (fragments === 0) return false;

  // Stripped-tag signature: lots of `class="...">` fragments but the matching
  // `<span` openings are gone. Legit highlighted HTML keeps its <span> tags.
  const intactSpans = (content.match(/<span\b/gi) || []).length;
  return fragments >= 2 && intactSpans < fragments / 2;
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

/**
 * Best-effort recovery of clean source from highlight-scraped content.
 * Order matters: strip the leaked `class="...">` fragments WITHOUT consuming the
 * surrounding `&` / `#`, so split entities (e.g. `&` `class="comment">` `#`
 * `class="number">` `039;`) reassemble into `&#039;` and then decode.
 * Only call when isHighlightCorrupted() is true.
 */
export function recoverScrapedCode(content: string): string {
  let s = content;
  s = s.replace(/<\/?span[^>]*>/gi, '');         // drop any surviving real span tags
  s = s.replace(FRAGMENT_RE, '');                // drop orphaned class="...">  fragments
  s = s.replace(/&#x([0-9a-f]+);/gi, (_m, h) => safeCp(parseInt(h, 16)));
  s = s.replace(/&#(\d+);/g, (_m, d) => safeCp(parseInt(d, 10)));
  s = s.replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_m, n) => NAMED[n.toLowerCase()] ?? _m);
  return s;
}

function safeCp(n: number): string {
  try { return Number.isFinite(n) ? String.fromCodePoint(n) : ''; } catch { return ''; }
}

/**
 * Non-throwing sanitizer for the EXTRACTION boundary
 * (e.g. extractCodeFromBlockForApply). Returns clean code if corruption is
 * detected and recoverable, the original otherwise. Never throws — extraction
 * should degrade gracefully, not crash an apply cycle.
 */
export function sanitizeExtractedCode(code: string, label = '(block)'): string {
  if (!isHighlightCorrupted(code)) return code;
  const before = (code.match(FRAGMENT_RE) || []).length;
  const recovered = recoverScrapedCode(code);
  if (isHighlightCorrupted(recovered)) {
    console.error(`[CodeIntegrity] ${label}: highlight-scrape corruption NOT fully recoverable — returning best effort`);
  } else {
    console.warn(`[CodeIntegrity] ${label}: recovered (stripped ${before} leaked highlight fragments, decoded entities)`);
  }
  return recovered;
}

export interface IntegrityResult { clean: string; wasCorrupted: boolean; }

/**
 * Throwing guard for the WRITE chokepoint (ide_create_file / resolveFilePath /
 * Rust write boundary). If corruption survives recovery it THROWS so a poisoned
 * file never reaches disk.
 */
export function guardWriteContent(content: string, path = '<unknown>'): IntegrityResult {
  if (!isHighlightCorrupted(content)) return { clean: content, wasCorrupted: false };
  const recovered = recoverScrapedCode(content);
  if (isHighlightCorrupted(recovered)) {
    throw new Error(
      `[CodeIntegrity] refusing to write "${path}": content is corrupted by highlight-scrape ` +
      `and could not be recovered. Fix the upstream extractor to read the RAW model message, ` +
      `not the rendered/highlighted DOM (buildRawCodeMapFromMessage).`,
    );
  }
  console.warn(`[CodeIntegrity] recovered "${path}" before write`);
  return { clean: recovered, wasCorrupted: true };
}
