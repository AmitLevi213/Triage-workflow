import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { TriageState } from "./state.js";
import { preprocess, classify, route, escalate, autoRespond } from "./nodes.js";

const graph = new StateGraph(TriageState)
  .addNode("preprocess", preprocess)
  .addNode("classify", classify)
  .addNode("escalate", escalate)
  .addNode("auto_respond", autoRespond)
  .addEdge(START, "preprocess")
  .addEdge("preprocess", "classify")
  // 2 routes, one of them the escalate-to-a-human path (requirement #3)
  .addConditionalEdges("classify", route, ["escalate", "auto_respond"])
  .addEdge("escalate", END)
  .addEdge("auto_respond", END);

/** Checkpointer is required for interrupt() to work. */
export const app = graph.compile({ checkpointer: new MemorySaver() });
