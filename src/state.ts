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
  missingInfo: z
    .array(z.string())
    .describe("Info the reporter forgot (repro steps, version, logs...)"),
});
export type Classification = z.infer<typeof Classification>;

/** Shared graph state threaded through every node. */
export const TriageState = Annotation.Root({
  rawReport: Annotation<string>,
  cleanReport: Annotation<string>,
  classification: Annotation<Classification | null>,
  resolution: Annotation<string>,
});

export type State = typeof TriageState.State;
