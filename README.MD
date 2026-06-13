# Bug-report triage workflow (LangGraph.js)

`preprocess → classify → route`, with a human-approval interrupt before the risky action.

## Layout

| File | Role |
|------|------|
| `src/state.ts` | Shared graph state + Zod classification schema |
| `src/model.ts` | Model instance + structured-output classifier |
| `src/nodes.ts` | The 3 executors (preprocess, classify, router) + leaf nodes |
| `src/graph.ts` | Wires nodes/edges and compiles with a checkpointer |
| `src/runner.ts` | `streamRun` helper that prints each executor step |
| `src/main.ts` | Entry point: sample run + resume after human input |

## How it meets the requirements

1. **3 executors** — `preprocess` (plain fn), `classify` (agent), `route` (router).
2. **Structured output** — `Classification` Zod schema via `withStructuredOutput`.
3. **Conditional edges** — `addConditionalEdges` with `escalate` + `auto_respond`.
4. **Streamed events** — `streamMode: "updates"` prints every node as it finishes.
5. **Bonus** — `escalate` calls `interrupt()` and resumes via `Command({ resume })`.

## Run

```bash
npm install
export ANTHROPIC_API_KEY=sk-...
npm start
```