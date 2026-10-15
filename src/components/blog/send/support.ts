"use client";

import { REPORT_EVENT } from "@/lib/support/open-report";

/** Opens Report a problem, as openReportProblem() does (the same window event), with a topic for
 *  the writer to start from as the event's detail ("Blog reuse: <title>"). The dialog opens either
 *  way; it fills the topic in once its listener reads `detail.details` (see the fix report). */
export function openSupport(topic: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPORT_EVENT, { detail: { details: topic } }));
}
