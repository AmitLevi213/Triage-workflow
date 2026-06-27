import { interrupt } from "@langchain/langgraph";
import type { State, RouteDecision } from "./state.js";
import { classifier } from "./model.js";
import { firstRedFlag } from "./redflags.js";

/** Low-confidence reports are escalated for a human to look at. */
const CONFIDENCE_THRESHOLD = 0.5;

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
  try {
    const result = await classifier.invoke([
      {
        role: "system",
        content:
          "You triage incoming bug reports for a software team. " +
          "Classify by category and urgency, give a confidence 0..1, " +
          "and list any missing info.",
      },
      { role: "user", content: state.cleanReport },
    ]);
    return { classification: result };
  } catch (err) {
    // No swallowed errors: surface a clear, actionable message.
    throw new Error(
      `Classification failed: ${(err as Error).message}. ` +
        "Check your ANTHROPIC_API_KEY and network connection.",
    );
  }
}

/**
 * Executor #3 — router (deterministic decision).
 * The classifier *proposes*; this router *decides* by combining three
 * signals in priority order:
 *   1. deterministic red-flag rules (highest authority — can override LLM)
 *   2. low classifier confidence  -> escalate to a human
 *   3. the LLM's own urgency/category
 */
export function decide(state: State): { decision: RouteDecision } {
  const c = state.classification;

  if (!c) {
    return {
      decision: {
        route: "escalate",
        reason: "No classification produced; escalating for safety.",
        triggeredRule: null,
      },
    };
  }

  const rule = firstRedFlag(state.cleanReport);
  if (rule) {
    return {
      decision: {
        route: "escalate",
        reason: `Deterministic red-flag rule "${rule}" fired; overriding LLM.`,
        triggeredRule: rule,
      },
    };
  }

  if (c.confidence < CONFIDENCE_THRESHOLD) {
    return {
      decision: {
        route: "escalate",
        reason: `Low classifier confidence (${c.confidence.toFixed(2)} < ${CONFIDENCE_THRESHOLD}); escalating.`,
        triggeredRule: null,
      },
    };
  }

  const risky = c.urgency === "critical" || c.category === "security";
  return {
    decision: risky
      ? {
          route: "escalate",
          reason: `LLM flagged ${c.urgency} ${c.category}.`,
          triggeredRule: null,
        }
      : {
          route: "auto_respond",
          reason: `Low-risk: ${c.urgency} ${c.category}, confidence ${c.confidence.toFixed(2)}.`,
          triggeredRule: null,
        },
  };
}

/** Edge selector: reads the decision the router recorded. */
export function pickRoute(state: State): "escalate" | "auto_respond" {
  return state.decision?.route ?? "escalate";
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
  const c = state.classification;
  const label = c ? `${c.urgency} (${c.category})` : "unclassified";
  const why = state.decision?.reason ?? "";
  const approved = interrupt({
    question: `This looks ${label}. ${why} Page the on-call engineer? (yes/no)`,
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
