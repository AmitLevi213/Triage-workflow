import { interrupt } from "@langchain/langgraph";
import type { State } from "./state.js";
import { classifier } from "./model.js";

/** Executor #1 — plain-function node: tidy up the raw text. */
export function preprocess(state: State) {
  const clean = state.rawReport
    .replace(/\s+/g, " ") // collapse whitespace
    .replace(/[\u200B-\u200D]/g, "") // strip zero-width chars
    .trim();
  return { cleanReport: clean };
}

/** Executor #2 — agent node: classify with structured output. */
export async function classify(state: State) {
  const result = await classifier.invoke([
    {
      role: "system",
      content:
        "You triage incoming bug reports for a software team. " +
        "Classify by category and urgency, and list any missing info.",
    },
    { role: "user", content: state.cleanReport },
  ]);
  return { classification: result };
}

/** Executor #3 — router: pick the route based on the classification. */
export function route(state: State): "escalate" | "auto_respond" {
  const c = state.classification!;
  const risky = c.urgency === "critical" || c.category === "security";
  return risky ? "escalate" : "auto_respond";
}

/** Low-risk leaf: file it and optionally ask for missing info. */
export function autoRespond(state: State) {
  const c = state.classification!;
  const ask = c.missingInfo.length
    ? ` We also asked the reporter for: ${c.missingInfo.join(", ")}.`
    : "";
  return {
    resolution: `Filed as ${c.category} (urgency: ${c.urgency}) in the backlog.${ask}`,
  };
}

/** Bonus: pause for human approval before the risky action. */
export function escalate(state: State) {
  const c = state.classification!;
  const approved = interrupt({
    question: `This looks ${c.urgency} (${c.category}). Page the on-call engineer? (yes/no)`,
    report: state.cleanReport,
  });
  if (String(approved).toLowerCase().startsWith("y")) {
    return { resolution: "On-call engineer paged. Incident channel opened." };
  }
  return {
    resolution:
      "Escalation declined by human reviewer; filed as high-priority ticket instead.",
  };
}
