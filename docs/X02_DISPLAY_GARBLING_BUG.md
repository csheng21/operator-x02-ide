# Display Garbling Bug — Investigation Complete, Fix Pending

**Status:** Bug located. Fix candidates identified. Patching deferred to a focused session.
**Severity:** Medium — affects file safety indirectly via Apply button corruption risk
**Companion to:** `docs/X02_AI_TOOL_INTEGRATION.md`
**Date:** May 27, 2026 session

---

## What the bug actually is

The chat renderer mangles **every code block in every AI response** — not just file-read tool results. The damage signature is consistent:

```
class="comment">/* foo */
class="number">1.5
class="string">"value"
```

These are highlight.js span attributes leaking into the displayed text — caused by `<span class="hljs-...">` HTML being **HTML-escaped a second time** after the highlighter already wrote it.

Reproduced on: App.css read, main.tsx read, tsconfig.json read, AND a plain "explain CSS flexbox" question (no file read at all). The bug is **not specific to ide_script tool results.**

---

## Why this is actually serious

Connects to file safety via the Apply button:

1. AI emits code → highlight.js produces span-decorated HTML
2. `enhanceCodeBlocks` re-escapes the span HTML, mangling it visually
3. **Auto-apply or user-clicked Apply scrapes the mangled DOM** and writes the corruption to disk
4. File ends up containing `class="comment">` fragments instead of real code

This is how `index.css` got corrupted in the latest session — not via the initial render of a tool result, but via a re-render (pagination `showMore`) of an old garbled message that triggered auto-apply.

**Fix the display bug = fix the corruption risk for ALL code blocks**, not just tool results.

---

## Today's commits (already in)

| Fix | Status | What it does |
|---|---|---|
| System prompt patch (`src/main.ts:9727`) | ✅ Committed | Teaches AI to use ide_script blocks |
| AutoApply guard (`src/main.ts:9849`) | ✅ Committed | Sets `window.__analysisMode = true` for 1500ms after tool result injection |

Together: AI can now read files, and the *initial render* doesn't corrupt them. **Gap:** re-renders (pagination `showMore`, scroll-back) still corrupt files because the 1500ms window has expired. This gap is closed once the display bug is fixed at the source (no more garbled HTML → no more garbage to scrape).

---

## Where the bug lives — confirmed by investigation

**File:** `src/ide/aiAssistant/messageUIFix.ts`
**Function:** `enhanceCodeBlocks` at **line 1189**
**Smoking-gun line:** **1530** — `const escapedCode = escapeHtml(processedCode);`

The function:
1. Finds code blocks in the rendered chat DOM (`<pre><code class="language-...">`)
2. Highlight.js has *already* processed them by this point (the file has explicit checks for `code.hljs` at line 486)
3. `enhanceCodeBlocks` reads `codeText` from the DOM (somewhere before line 1491 — chain not fully traced)
4. Passes that text through `escapeHtml()` at line 1530
5. **If `codeText` was read via `.innerHTML`, it contains the highlight.js spans → those spans get HTML-escaped → mangled text rendered**

The file itself is aware of the issue at some level — line 745 comment says *"Language detection can be wrong when syntax highlighting artifacts leak into text"*. That's the same artifact-leak that's corrupting display.

---

## Fix candidates (next session)

The investigation stopped before reading where `codeText` is extracted (a few lines before 1491). The fix will likely be one of these, depending on what that read looks like:

**Candidate A:** Change `codeEl.innerHTML` to `codeEl.textContent` when reading the code
- Most likely fix
- `textContent` returns plain text without span markup
- One-line change

**Candidate B:** Skip enhancement if the code element already has `.hljs` class (already highlighted)
- `if (codeEl.classList.contains('hljs')) return;`
- Guard at the top of `enhanceCodeBlocks`
- Sidesteps the double-process entirely

**Candidate C:** Strip span tags before re-escaping
- `processedCode = processedCode.replace(/<\/?span[^>]*>/g, '')`
- Defensive but less clean

### First commands next session

```powershell
# 1. Find where codeText is set in enhanceCodeBlocks
$f = "src\ide\aiAssistant\messageUIFix.ts"
Get-Content $f | Select-Object -Skip 1185 -First 30
```

Look for `const codeText = ...` or `let codeText = ...`. That single line tells us which Candidate (A/B/C) applies.

```powershell
# 2. After identifying the fix, apply via file-based patcher (proven safe today)
#    - old.txt and new.txt for the specific line
#    - Re-use the apply_*.ps1 template from today's work
```

---

## What's already ruled out (do not re-investigate)

| Location | Verdict |
|---|---|
| `transformContentForIDE()` in `ideMarkdownTransformer.ts:60` | Passthrough |
| `postProcessHTML()` in `ideMarkdownTransformer.ts:21` | Only adds CSS classes via regex |
| `processMessageContent()` in `messageUI.ts:1158` | 3-line wrapper around `markdownProcessor.processMarkdown` |
| `unifiedMarkdownProcessor.ts:renderCodeBlock` (~line 427-540) | Correctly escapes raw text once, marks block with `language-X` class |
| 5 duplicate `processMessageContent` definitions | Live copy is `messageUI.ts:1158`, others are dead code |
| Auto-apply guards in `autonomousCoding.ts` | All ide_script guards work correctly — bug is upstream |

---

## Workaround for users until fixed

**Safe to ask:**
- General coding questions answered in prose ("explain X", "how do Y")
- Questions that don't require AI to show code blocks

**Avoid until fix lands:**
- Asking AI to read files (`ide_read_file` triggers tool result block)
- Asking AI for code suggestions you'd want to Apply (code blocks will be garbled)
- Clicking Apply on any code block (corrupts the target file)
- Scrolling back to older messages (re-render can trigger auto-apply)

**Files restored during today's session** (verified clean):
- `C:\Users\hi\Desktop\projects\testcmd\src\App.css`
- `C:\Users\hi\Desktop\projects\testcmd\src\index.css`
- `C:\Users\hi\Desktop\projects\testcmd\src\main.tsx`

---

## Estimated fix scope

Once `codeText` source is identified (1 read, ~30 lines):
- **Patch:** 1-3 lines in `messageUIFix.ts`
- **Verify:** Ask AI "show me App.css" — code block displays cleanly, no `class="..."` fragments
- **Side effect to watch:** highlight.js syntax colors may need to be re-applied if Candidate A is chosen (since `textContent` strips them); Candidate B avoids this
- **Total time in focused session:** 20-30 minutes

---

## Why the session stopped here

The session ran several hours and produced:
- 1 fully-working fix (prompt patch)
- 1 partial fix (auto-apply guard — incomplete due to pagination re-renders)
- 3 file restorations after corruption (App.css twice, index.css)
- 1 rollback during patching
- This investigation, which narrowed a vague bug to a specific function and 3 candidate fixes

The remaining work needs a focused fresh session — applying the fix carefully and testing it doesn't break highlight.js rendering. Tacking it onto this session at the end raises rollback risk without commensurate benefit.

Next-session-you starts with the command above and has a candidate fix in 5 minutes.
