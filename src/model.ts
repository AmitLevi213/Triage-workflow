import "dotenv/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { Classification } from "./state.js";

/**
 * Validate the key lazily, the first time the classifier is actually used.
 * Doing this at import time would break unit tests that only exercise the
 * deterministic router (they never call the model and need no key).
 * (Image 1: "Clean failure paths - clear message on a missing/invalid key.")
 */
function buildClassifier() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("your-key-here")) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing or still set to the placeholder.\n" +
        "Fix: copy .env.example to .env and paste your real key, " +
        "or `export ANTHROPIC_API_KEY=sk-ant-...` before running.\n" +
        "Get a key at https://console.anthropic.com/",
    );
  }

  const modelName = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
  const model = new ChatAnthropic({ model: modelName, apiKey });

  return model.withStructuredOutput(Classification, {
    name: "classify_bug_report",
  });
}

type StructuredClassifier = ReturnType<typeof buildClassifier>;

let cached: StructuredClassifier | null = null;

/** Lazily-built, schema-bound classifier. Validates the key on first use. */
export const classifier = {
  invoke(messages: Parameters<StructuredClassifier["invoke"]>[0]) {
    if (!cached) cached = buildClassifier();
    return cached.invoke(messages);
  },
};
