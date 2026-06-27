import { test } from "node:test";
import assert from "node:assert/strict";

import { preprocess, decide } from "../src/nodes.js";
import { firstRedFlag } from "../src/redflags.js";
import type { State } from "../src/state.js";
import { EVAL_CASES } from "./cases.js";

/** Build a State object for the router from an eval case. */
function stateFor(rawReport: string, classification: State["classification"]): State {
  return {
    rawReport,
    cleanReport: preprocess({ rawReport } as State).cleanReport ?? rawReport,
    classification,
    decision: null,
    resolution: "",
  };
}

// --- preprocess: plain-function node ---
test("preprocess collapses whitespace and trims", () => {
  const out = preprocess({ rawReport: "  hello   world  \n\t x " } as State);
  assert.equal(out.cleanReport, "hello world x");
});

test("preprocess strips zero-width characters", () => {
  const out = preprocess({ rawReport: "a\u200Bb\u200Dc" } as State);
  assert.equal(out.cleanReport, "abc");
});

// --- red-flag rules: deterministic layer ---
test("auth-bypass rule fires on 'any password'", () => {
  assert.equal(firstRedFlag("sign in with any password"), "auth-bypass");
});

test("data-loss rule fires on 'deleted everything'", () => {
  assert.equal(firstRedFlag("it deleted everything"), "data-loss");
});

test("benign text trips no rule", () => {
  assert.equal(firstRedFlag("the button is slightly misaligned"), null);
});

// --- the eval set: routing decisions over labeled cases ---
for (const c of EVAL_CASES) {
  test(`route: ${c.name}`, () => {
    const { decision } = decide(stateFor(c.rawReport, c.classification));
    assert.equal(
      decision.route,
      c.expectedRoute,
      `expected ${c.expectedRoute}, got ${decision.route} (reason: ${decision.reason})`,
    );
    if (c.expectedRule !== undefined) {
      assert.equal(decision.triggeredRule, c.expectedRule);
    }
  });
}

// --- safety: missing classification escalates ---
test("null classification escalates for safety", () => {
  const { decision } = decide(stateFor("anything", null));
  assert.equal(decision.route, "escalate");
});
