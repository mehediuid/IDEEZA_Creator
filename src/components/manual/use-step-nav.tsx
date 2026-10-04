"use client";

// useStepNav — one place to navigate between editor steps. The editor works
// on one PRODUCT (P2-EDITOR-1), so an editor step's URL is
// /project/<slug>/products/<productId>/<step>: the product the editor holds
// (`activeProductId`), else the one the project resumes (P2-EDITOR-2). The
// Brief is the project's, /project/<slug>/brief. With no active project the
// links fall back home.
//
// useEditorScope — the product an editor app reads and writes its documents
// for. ProjectWorkspace mounts an editor only once this matches its URL.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  stepHref,
  useManualProjects,
  type ManualFlowState,
  type ManualProject,
} from "@/lib/manual/projects";
import { editorHref, resumeProductOf } from "@/lib/manual/editor-scope";
import { productRowsOf } from "@/lib/manual/project-read";
import type { EditorScope } from "@/lib/manual/p2-types";

// Left-rail item key → flow step. The 3D rail item keys as "3d" while its flow
// step is "three". Shared by every editor rail so they navigate identically.
export const RAIL_KEY_TO_STEP: Partial<
  Record<string, keyof ManualFlowState>
> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  assembly: "assembly",
  wiring: "wiring",
  preview: "preview",
  brief: "brief",
};

/** Where `step` opens for this project: the Brief is project-level; an
 *  editor step opens `productId` (the held product), else the resumed one. */
export function stepHrefFor(
  project: ManualProject,
  productId: string | null,
  step: keyof ManualFlowState,
): string {
  if (step === "brief") return stepHref(project, "brief");
  return editorHref(project, productId ?? resumeProductOf(project), step);
}

export function useStepNav() {
  const router = useRouter();
  const { activeProject, activeProductId } = useManualProjects();

  const hrefFor = (step: keyof ManualFlowState) =>
    activeProject ? stepHrefFor(activeProject, activeProductId, step) : "/";
  const go = (step: keyof ManualFlowState) => {
    router.push(hrefFor(step));
  };

  return { go, hrefFor, activeProject };
}

export type EditorScopeInfo = {
  scope: EditorScope;
  /** The project's first row — the only one that may adopt a legacy
   *  per-project document (P2-EDITOR-3). */
  headRowId: string;
  /** The product's name, trimmed — "" for a row not named yet. */
  productName: string;
};

/** The product the editor holds, or null outside a product editor (the
 *  Brief, or before the scope is applied). */
export function useEditorScope(): EditorScopeInfo | null {
  const { activeProject, activeProductId } = useManualProjects();
  const rows = activeProject ? productRowsOf(activeProject) : [];
  const row = activeProductId ? rows.find((r) => r.id === activeProductId) : undefined;
  const projectId = row && activeProject ? activeProject.id : null;
  const productId = row?.id ?? null;
  const headRowId = rows[0]?.id ?? null;
  const productName = row ? row.name.trim() : "";
  // `scope` is stable across every other write to the project (a stamp, a
  // rename), so an editor's hydration keyed on it runs once per product.
  const scope = React.useMemo(
    () => (projectId && productId ? { projectId, productId } : null),
    [projectId, productId],
  );
  return React.useMemo(
    () => (scope && headRowId ? { scope, headRowId, productName } : null),
    [scope, headRowId, productName],
  );
}
