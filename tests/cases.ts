import type { Classification } from "../src/state.js";

/**
 * Labeled eval set (Image 1: "assertions over labeled cases — include the
 * hard ones: high-risk, ambiguous — not just a smoke run").
 *
 * Each case carries a raw report, a stubbed classification (what the LLM
 * *would* propose), and the route we expect the deterministic router to
 * choose. This lets us test routing logic with zero API calls.
 */
export type EvalCase = {
  name: string;
  rawReport: string;
  classification: Classification;
  expectedRoute: "escalate" | "auto_respond";
  /** If a deterministic red-flag rule should fire, name it here. */
  expectedRule?: string | null;
};

export const EVAL_CASES: EvalCase[] = [
  // --- Clear low-risk: should auto-respond ---
  {
    name: "minor UI glitch, high confidence",
    rawReport: "The settings icon is 2px off-center on the profile page.",
    classification: {
      category: "ui_glitch",
      urgency: "low",
      confidence: 0.95,
      missingInfo: [],
    },
    expectedRoute: "auto_respond",
    expectedRule: null,
  },
  {
    name: "feature request, medium urgency",
    rawReport: "Would love a dark mode toggle in the toolbar.",
    classification: {
      category: "feature_request",
      urgency: "medium",
      confidence: 0.9,
      missingInfo: ["use case"],
    },
    expectedRoute: "auto_respond",
    expectedRule: null,
  },

  // --- Clear high-risk via LLM: should escalate ---
  {
    name: "critical crash, high confidence",
    rawReport: "App crashes on launch for all users after the 3.0 update.",
    classification: {
      category: "crash",
      urgency: "critical",
      confidence: 0.92,
      missingInfo: [],
    },
    expectedRoute: "escalate",
    expectedRule: null,
  },
  {
    name: "security category always escalates",
    rawReport: "Found a way to read other users' invoices by changing the id.",
    classification: {
      category: "security",
      urgency: "medium",
      confidence: 0.88,
      missingInfo: [],
    },
    expectedRoute: "escalate",
    expectedRule: null,
  },

  // --- HARD: red-flag rule overrides a calm LLM ---
  {
    name: "auth-bypass phrasing overrides low-urgency LLM",
    rawReport:
      "the login page lets me sign in with any password if the username exists",
    classification: {
      // Note: LLM under-rated this as a mere ui_glitch / low — the rule saves us.
      category: "ui_glitch",
      urgency: "low",
      confidence: 0.8,
      missingInfo: [],
    },
    expectedRoute: "escalate",
    expectedRule: "auth-bypass",
  },
  {
    name: "data-loss phrasing overrides medium LLM",
    rawReport: "After sync my account deleted everything, total data loss.",
    classification: {
      category: "crash",
      urgency: "medium",
      confidence: 0.7,
      missingInfo: [],
    },
    expectedRoute: "escalate",
    expectedRule: "data-loss",
  },

  // --- HARD: low confidence forces a human look ---
  {
    name: "ambiguous report, low confidence escalates",
    rawReport: "it broke",
    classification: {
      category: "crash",
      urgency: "low",
      confidence: 0.3,
      missingInfo: ["what broke", "steps", "version"],
    },
    expectedRoute: "escalate",
    expectedRule: null,
  },
];
