import { app } from "./graph.js";

type RunConfig = { configurable: { thread_id: string } };

/**
 * Run the graph and print every executor step as it completes (requirement #4).
 * Returns the interrupt payload if the graph paused, otherwise null.
 */
export async function streamRun(
  input: unknown,
  config: RunConfig,
): Promise<{ question: string } | null> {
  let interrupted: { question: string } | null = null;

  // streamMode "updates" emits one chunk per node as it finishes.
  for await (const chunk of await app.stream(input as any, {
    ...config,
    streamMode: "updates",
  })) {
    for (const [node, update] of Object.entries(chunk)) {
      if (node === "__interrupt__") {
        interrupted = (update as any)[0].value;
        console.log(`⏸  [interrupt] ${interrupted!.question}`);
      } else {
        console.log(`✅ [${node}]`, JSON.stringify(update, null, 2));
      }
    }
  }
  return interrupted;
}
