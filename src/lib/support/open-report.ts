// Opens the one Report a problem dialog from anywhere: the sidebar, ⌘K, and
// the editors' Help menus, which are built from pure data and can't reach a
// React context. It asks over a window event.

import type { ReportKind } from "./problem-report";

export const REPORT_EVENT = "ideeza:report-problem";

/** What the dialog can start from, e.g. `{ details: "Blog removed: <title>" }`. It fills an empty
 *  "What happened?" and an unchosen "What's it about?" only — what the person already chose or wrote
 *  is never replaced. */
export type ReportPrefill = { details?: string; kind?: ReportKind };

export function openReportProblem(prefill?: ReportPrefill): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<ReportPrefill | undefined>(REPORT_EVENT, { detail: prefill }));
}
