/**
 * Deterministic red-flag rules (Image 1: "regex / keywords / thresholds
 * augmenting the LLM").
 *
 * The LLM *proposes* a classification; these rules let a deterministic
 * layer *decide* and override on risky cases. Each rule is a name + a
 * test against the cleaned report text. The first match wins.
 */
export type RedFlagRule = {
  name: string;
  test: RegExp;
};

export const RED_FLAG_RULES: RedFlagRule[] = [
  // Security-sensitive language that must never be auto-filed.
  {
    name: "auth-bypass",
    test: /\b(any\s+password|bypass\s+(auth|login)|sign\s*in\s+with\s+any)\b/i,
  },
  {
    name: "data-leak",
    test: /\b(leak(ed|ing)?|expos(e|ed|ing)|dump(ed)?)\b.{0,40}\b(password|token|api[\s-]?key|secret|pii|credential)/i,
  },
  {
    name: "rce-or-injection",
    test: /\b(remote\s+code\s+execution|rce|sql\s+injection|xss|csrf)\b/i,
  },
  // Hard operational signals.
  {
    name: "data-loss",
    test: /\b(data\s+loss|lost\s+all|deleted\s+everything|corrupt(ed|ion)?)\b/i,
  },
  {
    name: "outage",
    test: /\b(outage|down\s+for\s+everyone|completely\s+down|cannot\s+access\s+prod)\b/i,
  },
];

/** Returns the name of the first rule that fires, or null. */
export function firstRedFlag(text: string): string | null {
  for (const rule of RED_FLAG_RULES) {
    if (rule.test.test(text)) return rule.name;
  }
  return null;
}
