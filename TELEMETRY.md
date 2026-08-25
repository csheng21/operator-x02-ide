# Telemetry in Operator X02

Operator X02 sends an anonymous heartbeat so the project can count how many
people are using it. This page lists **every field** that leaves your machine.
If something is not on this page, X02 does not send it.

## What is sent

Once on launch, then every 60 seconds while X02 is open:

| Field | Example | Why |
|---|---|---|
| `anon_id` | a random UUID generated locally on first run | count installs without identifying you |
| `app_version` | `v1.5.9.1c` | know which versions still need support |
| `os` | `windows` | prioritise platform work |

That is the whole payload. Three fields.

## What is never sent

- Your source code, in any form
- Your prompts, or any AI response
- File paths, file names, project names, directory structure
- Serial port names, device names, board names, hostnames, user names
- License keys, API keys, account details
- Your machine ID or MAC address — `anon_id` is random, not derived from hardware

The heartbeat fails silently when offline, behind a corporate firewall, or on
an air-gapped bench. It never blocks the IDE and never shows an error.

## Turning it off

Any of these works:

1. **Console**: `localStorage.setItem('x02.livePing', 'off')`
2. **Delete the file**: remove `src/ide/telemetry/livePing.ts` and its import
   from `src/main.ts`. Nothing else depends on it — X02 builds and runs
   identically without it.
3. **Firewall**: block the ingest hostname. X02 fails silently.

To get a fresh anonymous ID: `localStorage.removeItem('x02.anonId')`

## Verify it yourself

The whole implementation is one file: `src/ide/telemetry/livePing.ts`.
It is about 100 lines. Read it — the payload is constructed in one place and
there is nothing else in it.

## Where it goes

The heartbeat is sent to a Supabase Edge Function operated by this project.
The receiving code is in this repository at
`supabase/functions/ping/index.ts`, and the table definitions are in
`supabase/migrations/001_live_users.sql`.

The stored row holds only the three fields above plus first-seen/last-seen
timestamps and a ping counter. IP addresses are not stored.

## Separate from this: the AI proxy

If you use the built-in `operator_x02` provider (rather than your own API key
or a local Ollama model), your AI requests are relayed through a proxy so the
project's upstream key is not shipped in the binary. That proxy records
per-call token counts for cost control — token *counts*, never prompt or
response *content*. See `supabase/functions/ai-proxy/index.ts`.

Using your own API key or a local model bypasses the proxy entirely.
