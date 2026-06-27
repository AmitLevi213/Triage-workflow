import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { TriageState } from "./state.js";
import {
  preprocess,
  classify,
  decide,
  pickRoute,
  escalate,
  autoRespond,
} from "./nodes.js";

/**
 * preprocess -> classify -> decide -> (escalate | auto_respond)
 *
 * `decide` is a real node that records the routing decision into state
 * (separation of concerns: the classifier proposes, the router decides).
 * `pickRoute` is just the edge selector that reads that decision.
 */
const graph = new StateGraph(TriageState)
  .addNode("preprocess", preprocess)
  .addNode("classify", classify)
  .addNode("decide", decide)
  .addNode("escalate", escalate)
  .addNode("auto_respond", autoRespond)
  .addEdge(START, "preprocess")
  .addEdge("preprocess", "classify")
  .addEdge("classify", "decide")
  .addConditionalEdges("decide", pickRoute, ["escalate", "auto_respond"])
  .addEdge("escalate", END)
  .addEdge("auto_respond", END);

/** Checkpointer is required for interrupt() to work. */
export const app = graph.compile({ checkpointer: new MemorySaver() });
