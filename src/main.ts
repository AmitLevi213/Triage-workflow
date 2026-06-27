import * as readline from "node:readline";
import { Command } from "@langchain/langgraph";
import { app } from "./graph.js";
import { streamRun } from "./runner.js";
import { writeAudit } from "./audit.js";

async function main() {
  const threadId = "report-001";
  const config = { configurable: { thread_id: threadId } };

  // A security bug -> exercises the human-approval path in one run.
  const report = `
    URGENT!!! the   login page lets me sign in with ANY password as long as
    the username exists??? tried on prod, v2.3.1, chrome.
  `;

  console.log("=== Sample run: bug-report triage ===\n");
  const pending = await streamRun({ rawReport: report }, config);

  // If the graph paused at the interrupt, ask a real human, then resume.
  if (pending) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise<string>((resolve) => {
      rl.question(`\n${pending.question} `, (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    console.log("\n--- resuming graph ---\n");
    await streamRun(new Command({ resume: answer }), config);
  }

  const final = await app.getState(config);
  console.log("\n=== Final resolution ===");
  console.log(final.values.resolution);

  // Decision audit log: what was classified, which route, why.
  await writeAudit({
    timestamp: new Date().toISOString(),
    threadId,
    report: final.values.cleanReport,
    classification: final.values.classification,
    decision: final.values.decision,
    resolution: final.values.resolution,
  });
}

main().catch((err) => {
  console.error("\n[fatal]", err.message ?? err);
  process.exit(1);
});
