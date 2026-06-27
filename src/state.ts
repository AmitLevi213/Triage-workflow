import { Annotation } from "@langchain/langgraph";
import { z } from "zod";

/** Structured output produced by the classifier node (requirement #2). */
export const Classification = z.object({
  category: z
    .enum(["crash", "ui_glitch", "performance", "feature_request", "security"])
    .describe("Type of bug report"),
  urgency: z
    .enum(["low", "medium", "high", "critical"])
    .describe("How urgent this report is"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "How confident you are in this classification, 0..1. " +
        "Use < 0.5 when the report is vague, ambiguous, or missing key details.",
    ),
  missingInfo: z
    .array(z.string())
    .describe("Info the reporter forgot (repro steps, version, logs...)"),
});
export type Classification = z.infer<typeof Classification>;

/** Which leaf the router chose, and the human-readable reason why. */
export type RouteDecision = {
  route: "escalate" | "auto_respond";
  reason: string;
  /** Deterministic rule that fired, if any (overrides the LLM). */
  triggeredRule: string | null;
};

/**
 * Shared graph state threaded through every node.
 * Every channel has a default reducer so reads are never `undefined`,
 * which removes the need for load-bearing `!` non-null assertions.
 */
export const TriageState = Annotation.Root({
  rawReport: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  cleanReport: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  classification: Annotation<Classification | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  decision: Annotation<RouteDecision | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  resolution: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

export type State = typeof TriageState.State;
