import { appendFile } from "node:fs/promises";
import type { Classification, RouteDecision } from "./state.js";

/**
 * Decision audit log (Image 1: "what was classified, which route, why").
 * Appends one JSON object per line (JSONL) so it is easy to grep, tail,
 * or load into a notebook later.
 */
export type AuditEntry = {
  timestamp: string;
  threadId: string;
  report: string;
  classification: Classification | null;
  decision: RouteDecision | null;
  resolution: string;
};

const AUDIT_PATH = process.env.AUDIT_LOG_PATH ?? "audit-log.jsonl";

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await appendFile(AUDIT_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    // Logging must never crash the workflow, but we don't swallow silently.
    console.error(`[audit] failed to write log: ${(err as Error).message}`);
  }
}
