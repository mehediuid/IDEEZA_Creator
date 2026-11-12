"use client";

// What every part of the phone's project page reads: the web's one
// derivation (`useProjectPageData`, the "project" context — the owner's own
// page), and the page's sheets, opened from anywhere on it.

import * as React from "react";
import type { ProjectPageData } from "@/components/projects/details/use-project-page-data";
import type { ReadinessPurpose } from "@/lib/manual/p2-types";
import type { PhoneWriteGate } from "./write-gate";

export type Ready = Extract<ProjectPageData, { state: "ready" }>;

export type ProjectSheet =
  | { kind: "menu" }
  | { kind: "edit"; ai?: boolean }
  | { kind: "delete" }
  | { kind: "share" }
  | { kind: "edit-post" }
  | { kind: "stop-sharing" }
  | { kind: "publish" }
  | { kind: "readiness"; purpose: ReadinessPurpose; then: string | null }
  | { kind: "add-product" };

export type ProjectCtx = Ready & {
  gate: PhoneWriteGate;
  open: (sheet: ProjectSheet) => void;
};

const Ctx = React.createContext<ProjectCtx | null>(null);
export const ProjectProvider = Ctx.Provider;

export function useProject(): ProjectCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useProject outside the project page");
  return v;
}
