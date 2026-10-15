"use client";

import { openReportProblem } from "@/lib/support/open-report";

/** Opens Report a problem with a topic for the writer to start from ("Blog reuse: <title>"). */
export function openSupport(topic: string): void {
  openReportProblem({ details: topic });
}
