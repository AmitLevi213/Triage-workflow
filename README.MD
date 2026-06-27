# Bug-Report Triage Workflow

A small, production-shaped triage agent built with **LangGraph.js**. It takes a
free-text bug report, classifies it with a typed LLM call, then routes it
through a **deterministic** decision layer that can override the model on risky
cases — pausing for human approval before anything is escalated.

[![CI](https://github.com/AmitLevi213/Triage-workflow/actions/workflows/ci.yml/badge.svg)](https://github.com/AmitLevi213/Triage-workflow/actions/workflows/ci.yml)

```
preprocess  →  classify  →  decide  →  ┌─ escalate (human-in-the-loop)
 (plain fn)    (LLM, typed)  (rules)    └─ auto_respond
```

## Why it's built this way

- **The classifier proposes, the router decides.** The LLM returns a typed
  classification; a separate deterministic `decide` node makes the routing call.
  This keeps the risky decision auditable and testable without the model.
- **Deterministic red-flag rules override the LLM.** Keyword/regex rules
  (auth-bypass, data-loss, RCE, outage…) force escalation even if the model
  under-rates a report. See `src/redflags.ts`.
- **Confidence drives routing.** The model returns a `confidence` score; low
  confidence is escalated for a human to look at rather than auto-filed.
- **Human-in-the-loop.** Risky cases pause via LangGraph's `interrupt()` and
  resume after a real yes/no.
- **Everything is audited.** Each run appends a line to `audit-log.jsonl`:
  what was classified, which route, and why.

## Run it

### Option A — Docker (one command)

```bash
cp .env.example .env          # then paste your real key into .env
docker compose run --rm triage
```

### Option B — Node (local)

Requires Node 22+.

```bash
cp .env.example .env          # then paste your real key into .env
npm install
npm start
```

You'll see each step stream as it completes. The sample report is a security
bug, so the graph pauses and asks you to approve paging the on-call engineer.

## Develop

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test over the labeled eval set — no API key needed
npm run check       # both gates (what CI runs)
```

The test suite (`tests/`) asserts routing decisions over a labeled eval set
that includes the hard cases — ambiguous reports, and reports where a red-flag
rule must override a calm LLM. These run with **no API key** because they
exercise the deterministic layer directly.

## Layout

| File | Role |
|------|------|
| `src/state.ts` | Graph state + Zod classification schema (`confidence` included) |
| `src/model.ts` | Lazily-built, schema-bound classifier with a clear key-failure message |
| `src/redflags.ts` | Deterministic red-flag rules that can override the LLM |
| `src/nodes.ts` | Executors: `preprocess`, `classify`, `decide`, leaves |
| `src/graph.ts` | Wires nodes/edges, compiles with a checkpointer |
| `src/audit.ts` | Appends each decision to `audit-log.jsonl` |
| `src/runner.ts` | `streamRun` helper that prints each step |
| `src/main.ts` | Entry point: sample run + resume after human input |
| `tests/` | Labeled eval set + assertions |

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `ANTHROPIC_API_KEY` | — (required) | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Override the model |
| `AUDIT_LOG_PATH` | `audit-log.jsonl` | Where decisions are logged |
