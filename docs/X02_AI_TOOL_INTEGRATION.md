# Operator X02 — AI Tool Integration (Step 3 Design)

**Status:** Design doc, not yet implemented.
**Companion to:** `docs/X02_CMD_SUBSYSTEM.md`.
**Prepared:** End of May 23, 2026 session (after r1294 shipped).
**Implement in:** Next sprint (estimated 2 commits, ~400 lines new code).

---

## Purpose

Connect the AI chat to the project-analysis tools shipped in r1294 (`count_files`, `read_file`). Today the tools exist on `window.__projectAnalysis` but the AI doesn't know about them. After Step 3, the AI can call tools autonomously to ground its answers in real project data.

**Concrete user goal:** ask "how many TypeScript files do I have?" in chat → AI answers "358" by actually calling `count_files('*.ts')`, not by hallucinating.

---

## Recon Findings (from session r1289-r1294)

### smartAICall — the entry point we extend

| Fact | Value |
|---|---|
| File | `src\utils\proxyAwareCall.ts` |
| Lines | 226 |
| Signature | `export async function smartAICall(params: {...})` at line 15 |
| Single API call site | line 99 — `fetch(${baseUrl}/chat/completions, ...)` |
| API format | **OpenAI-compatible only**: `chat/completions` endpoint |
| Provider config block | lines 139-163 (Groq, OpenAI, Anthropic listed) |
| Callers (confirmed) | `src\editor\inlineAutocomplete.ts:140`, `src\ide\projectFolderContextMenu.ts:1102, 1574` |

### Call shape

Existing callers pass a flat object:

```typescript
await (window as any).smartAICall({
  provider: 'operator_x02',   // or 'openai', 'anthropic', 'groq'
  apiKey: 'PROXY',             // or real key
  model: 'x02-coder',
  message: prompt,
  maxTokens: 2000,
  temperature: 0.7,
});
```

### Important implication

Because `smartAICall` uses the OpenAI `chat/completions` format for everything (including Anthropic), the tool definitions and tool-result messages we add must also use the **OpenAI function-calling shape**:

- Tool declarations go in `tools[]` (each `{type: "function", function: {name, description, parameters}}`)
- AI returns tool calls as `message.tool_calls[]` (each `{id, function: {name, arguments}}`)
- We send results back as `messages[]` entries with `role: "tool"`, `tool_call_id`, `content`

If Anthropic/Claude is reached via the proxy, the proxy is presumably already translating OpenAI shape → Anthropic shape. So we stay in OpenAI shape end-to-end.

---

## Design

### Three new files

| File | Purpose | Approx. LOC |
|---|---|---|
| `src/ide/aiTools/toolDefinitions.ts` | JSON schemas declaring tool name, params, descriptions. The "API contract" the AI sees. | ~80 |
| `src/ide/aiTools/toolDispatcher.ts` | Maps `{name, arguments}` from AI → calls `window.__projectAnalysis[name](args)` → returns result string. Handles errors and unknown tools as hard error returns. | ~70 |
| `src/ide/aiTools/conversationLoop.ts` | The loop: send → if tool calls, dispatch + append `role:tool` messages → repeat. Caps at N iterations. | ~150 |

### One existing file touched

`src/utils/proxyAwareCall.ts` — add optional `enableTools` flag. When true, route through `conversationLoop`. When false (default), exact existing behavior. **Zero regression for callers that don't opt in.**

### Conversation loop pseudocode

```
function smartAICallWithTools(params):
  messages = [{role: "user", content: params.message}]
  for i in 0..MAX_ITERATIONS (default 5):
    response = await callOpenAICompat(messages, tools=TOOL_DEFINITIONS)
    if response.tool_calls is empty:
      return response.content    // final text answer
    messages.append({role: "assistant", tool_calls: response.tool_calls})
    for call in response.tool_calls:
      result = await dispatchTool(call.function.name, JSON.parse(call.function.arguments))
      messages.append({role: "tool", tool_call_id: call.id, content: truncate(result, 4000)})
  // Hit iteration cap — force final answer
  messages.append({role: "user", content: "Please give your final answer now without more tool calls."})
  return (await callOpenAICompat(messages)).content
```

### Safety constraints

| Constraint | Value | Reason |
|---|---|---|
| Max tool iterations per turn | 5 | Prevents infinite loops, hallucinated tool chains |
| Sequential tool calls only | enforced by `await` | r1291 PTY constraint already established |
| Tool result truncation | 4000 chars | Half of `projectAnalysis.MAX_OUTPUT_CHARS` (8000) — leaves room for AI's own context |
| Unknown tool name | Returns error string, doesn't throw | Lets the AI recover gracefully on its next turn |
| Tool call timeout | 30s per call | Same as `headlessExecute` default |
| Total wall-clock cap | 90s | Prevents UI hanging if AI keeps trying tools |

### Provider support matrix

| Provider | Function calling | First-cut? |
|---|---|---|
| Claude (via Anthropic API or operator_x02 proxy) | Yes | Yes |
| GPT-4 / GPT-4o (OpenAI) | Yes | Yes |
| Groq (Llama 3.x) | Yes (Llama 3.1+) | Yes |
| Gemini | Yes (different shape) | Defer |
| Ollama | Model-dependent (Llama 3.1+ yes) | Defer |
| operator_x02 proxy | Depends on backend routing | Yes if proxy passes `tools` through |

First-cut targets: Claude, GPT-4, Groq. They all support OpenAI-format function calling.

For providers that don't support function calling, the call falls back silently to non-tool mode (existing behavior). The AI just doesn't get the tools; the user can't ground answers in project data with that provider until they switch.

---

## Tool Definitions (the AI's contract)

Schemas use JSON Schema, OpenAI function-calling format:

```typescript
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "count_files",
      description: "Counts files in the user's currently open project matching a wildcard pattern. Use this to answer questions like 'how many TS files do I have' or 'is this a big project'. Returns a single integer.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Wildcard pattern, e.g. '*.ts' or '*.md'. Defaults to '*' (all files). Only alphanumeric, dot, hyphen, underscore, and asterisk allowed.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Reads the contents of a file inside the user's currently open project. Use this when the user asks about a specific file or you need to inspect code to answer accurately. Paths outside the open project will be rejected.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Path inside the open project. Can be relative (e.g. 'src/main.ts') or absolute (e.g. 'C:/Users/.../project/src/main.ts'). Must NOT contain '..' segments.",
          },
          lineRange: {
            type: "array",
            description: "Optional [startLine, endLine] (1-indexed, inclusive). Omit to read the whole file.",
            items: { type: "number" },
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ["filePath"],
      },
    },
  },
];
```

Why the descriptions matter: this is *prompt engineering*. The descriptions are what the AI reads to decide when to call which tool. Short, action-oriented, with concrete example questions. Bad descriptions = AI never calls tools or calls them wrongly.

---

## Dispatcher sketch

```typescript
// src/ide/aiTools/toolDispatcher.ts
const TOOL_RESULT_MAX = 4000;

function truncate(s: string): string {
  if (s.length <= TOOL_RESULT_MAX) return s;
  return s.slice(0, TOOL_RESULT_MAX) + '\n[result truncated]';
}

export async function dispatchTool(name: string, args: any): Promise<string> {
  const tools = (window as any).__projectAnalysis;
  if (!tools) {
    return JSON.stringify({ error: 'tools not loaded' });
  }

  try {
    let result: any;
    switch (name) {
      case 'count_files':
        result = await tools.count_files(args.pattern ?? '*');
        break;
      case 'read_file':
        result = await tools.read_file(args.filePath, args.lineRange);
        break;
      default:
        return JSON.stringify({ error: `unknown tool: ${name}` });
    }

    // Results come back as either a primitive (number) or a string.
    // Wrap consistently so the AI always sees JSON.
    const wrapped = typeof result === 'string'
      ? result
      : JSON.stringify(result);
    return truncate(wrapped);
  } catch (err: any) {
    return JSON.stringify({ error: err?.message ?? String(err) });
  }
}
```

Note the **error-as-data** pattern: dispatcher never throws. Errors come back as `{error: "..."}` strings, which the AI can read and adjust on its next turn. Throwing would terminate the whole conversation loop.

---

## Conversation loop sketch

```typescript
// src/ide/aiTools/conversationLoop.ts
import { TOOL_DEFINITIONS } from './toolDefinitions';
import { dispatchTool } from './toolDispatcher';

const MAX_ITERATIONS = 5;
const MAX_WALL_CLOCK_MS = 90_000;

interface Params {
  provider: string;
  apiKey: string;
  model: string;
  message: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function callWithTools(
  params: Params,
  apiCall: (messages: any[], extra: any) => Promise<any>
): Promise<{ content: string; toolCalls: Array<{name: string, args: any, result: string}> }> {
  const startTime = Date.now();
  const messages: any[] = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  messages.push({ role: 'user', content: params.message });

  const toolCallLog: Array<{name: string, args: any, result: string}> = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (Date.now() - startTime > MAX_WALL_CLOCK_MS) break;

    const response = await apiCall(messages, { tools: TOOL_DEFINITIONS });
    const msg = response.choices?.[0]?.message ?? response.message ?? response;

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return { content: msg.content ?? '', toolCalls: toolCallLog };
    }

    // Add the assistant message asking for tools
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: toolCalls,
    });

    // Dispatch each tool sequentially (PTY constraint)
    for (const call of toolCalls) {
      const name = call.function.name;
      let args: any;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        args = {};
      }
      const result = await dispatchTool(name, args);
      toolCallLog.push({ name, args, result });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  // Hit iteration or wall-clock cap — force the AI to give a final answer
  messages.push({
    role: 'user',
    content: 'Please give your final answer now without making additional tool calls.',
  });
  const final = await apiCall(messages, {});
  return {
    content: final.choices?.[0]?.message?.content ?? '',
    toolCalls: toolCallLog,
  };
}
```

The `apiCall` parameter is a thin adapter that wraps the existing `fetch` block in `proxyAwareCall.ts` — passes through `tools` if provided, returns the raw response. Easier to test, easier to swap providers later.

---

## Wiring into smartAICall

Add at top of `smartAICall` (around line 16):

```typescript
if (params.enableTools && (window as any).__projectAnalysis) {
  const { callWithTools } = await import('../ide/aiTools/conversationLoop');
  const result = await callWithTools(params, (messages, extra) =>
    callOpenAICompat({ ...params, messagesOverride: messages, ...extra })
  );
  return result.content;
}
```

Where `callOpenAICompat` is a refactored helper extracted from the existing line 99 fetch block. Refactoring is mechanical: move the fetch + response parsing into a named function that takes `messages` (instead of building it inline from `params.message`) and an `extra` object for `tools`.

Callers opt in by adding `enableTools: true`:

```typescript
const reply = await window.smartAICall({
  provider: 'anthropic',
  apiKey: 'PROXY',
  model: 'claude-opus-4-5',
  message: 'How many TS files do I have?',
  enableTools: true,        // ← new
});
```

Callers that don't pass `enableTools` get exact existing behavior.

---

## UI: tool-call indicator (Phase 2)

For the first commit (r1295/r1296), no UI changes. The chat just answers correctly without showing tool calls visually. Verify it works via DevTools logging.

For the second commit (later sprint), add inline indicators in the chat:

```
You: How many TypeScript files do I have?

🤖 [Tools: count_files('*.ts') → 358, 1.2s]
There are 358 TypeScript files in your project. The bulk of these are likely in...
```

Implementation: `toolCallLog` returned by `callWithTools` gets attached as metadata to the assistant message. Chat rendering shows a collapsed badge with the array; click expands.

---

## Test plan

### Phase A — dispatcher works (console-testable, no AI involved)

```javascript
const { dispatchTool } = await import('./ide/aiTools/toolDispatcher');
await dispatchTool('count_files', { pattern: '*.ts' });
// -> "358"
await dispatchTool('read_file', { filePath: 'package.json', lineRange: [1, 3] });
// -> JSON-stringified file content
await dispatchTool('nonexistent', {});
// -> '{"error":"unknown tool: nonexistent"}'
```

### Phase B — loop works with a stubbed apiCall

Inject a fake `apiCall` that returns canned tool calls, verify the loop dispatches correctly, sends the right `role: "tool"` follow-up, and terminates on a non-tool response.

### Phase C — end-to-end with real provider

```javascript
const reply = await window.smartAICall({
  provider: 'anthropic',      // or 'openai', 'groq'
  apiKey: 'PROXY',
  model: 'claude-opus-4-5',
  message: 'How many TypeScript files are in my project?',
  enableTools: true,
});
console.log(reply);
// Expected: text mentioning 358 (the real count)
```

### Phase D — safety boundary

```javascript
const reply = await window.smartAICall({
  provider: 'anthropic',
  apiKey: 'PROXY',
  model: 'claude-opus-4-5',
  message: 'Read C:\\Windows\\System32\\drivers\\etc\\hosts',
  enableTools: true,
});
// Expected: AI receives the boundary error and responds with refusal/explanation,
// not the file contents
```

---

## Estimated commits

| Commit | Scope | Lines |
|---|---|---|
| r1295 | `toolDefinitions.ts` + `toolDispatcher.ts` + console smoke tests | ~150 |
| r1296 | `conversationLoop.ts` + `smartAICall` wiring + end-to-end test | ~250 |
| r1297 (future) | UI tool-call indicators in chat | ~100 |

Total Step 3 first-cut: ~400 lines, 2 commits. Tomorrow.

---

## What could go wrong (anticipated)

1. **Provider doesn't pass `tools` field through proxy.** Test early — Phase C against `provider: 'anthropic'` first. If proxy strips it, work directly against `api.anthropic.com` initially.
2. **Tool descriptions too vague, AI never calls them.** Iterate on descriptions. Add example questions in the description text.
3. **AI loops indefinitely on tool errors.** The 5-iteration cap + error-as-data dispatcher prevents this. If we still see it, lower the cap.
4. **`messages` array structure off-by-one.** OpenAI is strict — the `role: "tool"` message must have the matching `tool_call_id` from the previous assistant message. Test Phase B carefully.
5. **`maxTokens: 2000` runs out before a multi-tool turn finishes.** Tool results eat tokens. Default to 4000 when `enableTools` is true.

---

## Closing the loop after implementation

Once r1295/r1296 ship:
- Update `docs/X02_CMD_SUBSYSTEM.md` SVN History table
- Mark Step 3 as Done in the roadmap table
- Update the Architecture diagram (`projectAnalysis.ts -> smartAICall` arrow is now real, not pending)
- Add the `read_file_content` field to the file map (Rust backend section)
