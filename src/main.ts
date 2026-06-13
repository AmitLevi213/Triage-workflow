import * as readline from "readline";
import { Command } from "@langchain/langgraph";
import { app } from "./graph.js";
import { streamRun } from "./runner.js";

async function main() {
  const config = { configurable: { thread_id: "report-001" } };

  // A security bug -> exercises the human-approval path in one run.
  const report = `
    URGENT!!! the   login page lets me sign in with ANY password as long as
    the username exists??? tried on prod, v2.3.1, chrome.
  `;

  console.log("=== Sample run: bug-report triage ===\n");
  const pending = await streamRun(
    { rawReport: report, classification: null },
    config,
  );

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
}

main().catch(console.error);
