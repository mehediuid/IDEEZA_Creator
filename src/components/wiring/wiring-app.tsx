"use client";

// Wiring — the step between Product Preview and Add Brief. For now it reuses
// the entire Preview workspace (same scene, panels, toolbar) via the
// PreviewApp variant; only the rail highlight and flow pills differ. When
// wiring gets its own tools (nets, harness routing) it forks into its own
// module here.

import { PreviewApp } from "@/components/preview/preview-app";

export function WiringApp() {
  return <PreviewApp variant="wiring" />;
}
