import "dotenv/config";
import { ChatAnthropic } from "@langchain/anthropic";
import { Classification } from "./state.js";

/** Swap for ChatOpenAI from @langchain/openai if your course uses OpenAI. */
const model = new ChatAnthropic({ model: "claude-sonnet-4-5" });

/** Model bound to the Zod schema so it always returns typed JSON. */
export const classifier = model.withStructuredOutput(Classification, {
  name: "classify_bug_report",
});
