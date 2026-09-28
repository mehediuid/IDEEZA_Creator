// The project log lines a sale or a support request add (Phase 2 spec
// §3.5.5, §3.3.5): the two Phase 2 `ProjectLogEntry` kinds this area owns.
// `project-read.ts`'s `projectLogOf` (T10) merges this with every other
// area's entries.
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { ProjectLogEntry } from "../manual/project-read";
import type { Sale, SupportRequest } from "./types";

/**
 * `{ kind: "sold" }` for every sale of this project, and — owner only —
 * `{ kind: "support" }` for every support request: a buyer's own message to
 * the creator is never listed on the buyer view's log (P2-MARKETPLACE-20).
 */
export function marketLogOf(
  projectId: string,
  sales: Sale[],
  support: SupportRequest[],
  ctx: { owner: boolean },
): ProjectLogEntry[] {
  const out: ProjectLogEntry[] = [];
  for (const sale of sales) {
    if (sale.projectId === projectId) out.push({ kind: "sold", at: sale.at, sale });
  }
  if (ctx.owner) {
    for (const request of support) {
      if (request.projectId === projectId) out.push({ kind: "support", at: request.at, request });
    }
  }
  return out;
}
