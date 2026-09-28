"use client";

// The product page's Editor block (COR-59…61, COR-65; P2-EDITOR-11), moved
// here from the project page's rail (details/rail-editor.tsx): the editor
// opens a product now (owner decision 7). Six rows — PCB Design · Code ·
// 3D Module · Assembly · Peripheral Wiring · Product Preview — each a link
// to THIS product's editor step (`editorHref`), with the one fact this
// product's own documents support (`editorWorkOf(scope)`, P2-EDITOR-8), and
// never a status word. The Brief is not a row: it is the project's, and its
// door is the project header.
//
// Under the rows sits the seed caption slot ("Opens with version {n}'s …" /
// "Loaded from version {n}.") with Load version {m}… and Restore version {b}
// (P2-BUILDLOAD-9, 10, 13); TB2 fills `caption`. There is no shared-stores
// note any more: every step has a per-product fact (P2-EDITOR-8).
//
// The facts are read once per visit, in an idle callback after the first
// paint, so arriving never parses a PCB doc before the page has drawn; until
// then each row reads "—". Who: `product.openEditor` with the page's canCtx —
// the owner of a project that isn't sold in full. Absent in every preview.

import * as React from "react";
import NextLink from "next/link";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { RailBlock, useRailStacked } from "@/components/projects/details/rail-block";
import { EDITOR_STEPS, editorHref } from "@/lib/manual/editor-scope";
import { editorWorkOf, type EditorWork } from "@/lib/manual/editor-work";
import type { EditorStep } from "@/lib/manual/p2-types";
import { can, type CanContext, type Viewer } from "@/lib/manual/permissions";
import { productRowsOf } from "@/lib/manual/project-read";
import { STEP_LABELS, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { stepFactText } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";

export function ProductEditorBlock({
  project,
  productId,
  viewer,
  canCtx,
  caption,
}: {
  project: ManualProject;
  /** The product row this page shows. */
  productId: string;
  viewer: Viewer;
  /** `view.canCtx`: the lock refuses product.openEditor (§3.8.5). */
  canCtx: CanContext;
  /** The seed caption and its Load / Restore buttons, under the rows (TB2, P2-BUILDLOAD-13). */
  caption?: React.ReactNode;
}) {
  if (!can(viewer, "product.openEditor", canCtx)) return null;
  return (
    <RailBlock title="Editor">
      <EditorRows project={project} productId={productId} />
      {caption}
    </RailBlock>
  );
}

/** COR-61: one read per visit, after first paint, when the browser is idle.
 *  `undefined` until it has run. The reader never writes. */
function useEditorWork(projectId: string, productId: string, headRowId: string): EditorWork | undefined {
  const key = `${projectId}:${productId}:${headRowId}`;
  const [read, setRead] = React.useState<{ key: string; work: EditorWork } | null>(null);
  React.useEffect(() => {
    const run = () => setRead({ key, work: editorWorkOf({ projectId, productId }, headRowId) });
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    // No requestIdleCallback (Safari): a macrotask still lands after paint.
    const timer = window.setTimeout(run, 1);
    return () => window.clearTimeout(timer);
  }, [key, projectId, productId, headRowId]);
  return read?.key === key ? read.work : undefined;
}

function EditorRows({ project, productId }: { project: ManualProject; productId: string }) {
  const { selectEditorScope } = useManualProjects();
  // The first row falls back to the project's legacy (pre-product) documents (P2-EDITOR-3).
  const headRowId = productRowsOf(project)[0]?.id ?? productId;
  const work = useEditorWork(project.id, productId, headRowId);
  const stacked = useRailStacked();
  // LeaveButton's press state (review-outputs.tsx): the pressed row says
  // "Opening…" and every row is shut until the editor takes over — two
  // navigations at once is not a thing the maker can have meant.
  const [leaving, setLeaving] = React.useState<EditorStep | null>(null);

  return (
    <ul role="list" className="-mx-3 flex flex-col">
      {EDITOR_STEPS.map((step) => {
        const busy = leaving === step;
        const blocked = leaving !== null && !busy;
        const fact = busy ? "Opening…" : stepFactText(work?.[step]);
        return (
          <li key={step}>
            <NextLink
              href={editorHref(project, productId, step)}
              aria-busy={busy || undefined}
              aria-disabled={blocked || undefined}
              onClick={(e) => {
                // Shut while any row is already leaving, the pressed one too.
                if (leaving !== null) e.preventDefault();
              }}
              onNavigate={() => {
                // Only an in-app navigation presses the row: a Cmd/Ctrl-click
                // opens a tab and leaves this page as it was.
                selectEditorScope(project.id, productId);
                setLeaving(step);
              }}
              className={cn(
                "group flex min-h-16 items-start gap-4 rounded-md px-3 py-3 outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                stacked && "min-h-[var(--touch-min)] items-center",
                busy && "cursor-wait",
                blocked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="shrink-0 text-md font-medium leading-md text-text-primary">
                {STEP_LABELS[step]}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-right text-sm leading-md tabular-nums",
                  busy ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {fact}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-[var(--line-height-md)] shrink-0 items-center text-text-tertiary transition-colors duration-normal ease-decelerate group-hover:text-text-primary",
                  busy && "motion-safe:animate-spin",
                )}
              >
                <Icon icon={busy ? Refresh01Icon : ArrowRight01Icon} size={16} />
              </span>
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}
