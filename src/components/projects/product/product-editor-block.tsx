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
// Under the rows, the seed caption says where a built product's documents
// came from (`seedCaptionOf`, P2-BUILDLOAD-13): "Opens with version {n}'s …"
// before its first open, "Loaded from version {n}." after. It carries the
// one home of **Load version {m}…** (P2-BUILDLOAD-9, the confirm) and
// **Restore version {b}** (P2-BUILDLOAD-10, which undoes itself, so it has
// no dialog). Both let go of the PCB store's hold on this product first, so
// a board still in memory can't be saved over what they write. A hand-made,
// build-gone or unmatched product has no caption.
//
// The facts and the seed record are read once per visit, in one idle
// callback after the first paint, so arriving never parses a PCB doc before
// the page has drawn; until then each row, and the caption, reads "—". Load
// and Restore re-read them at once. Who: `product.openEditor` with the
// page's canCtx — the owner of a project that isn't sold in full, so Load and
// Restore go with the editor on a locked project (BUILDLOAD C8). Absent in
// every preview.

import * as React from "react";
import NextLink from "next/link";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button } from "@/components/ideeza";
import { RailBlock, useRailStacked } from "@/components/projects/details/rail-block";
import { useCreateHistory } from "@/lib/create/history";
import { piecesOf as seedPiecesOf, seedCaptionOf, type EditorSeed } from "@/lib/manual/build-load";
import { readSeed, restoreBackup } from "@/lib/manual/build-load-io";
import { EDITOR_STEPS, editorHref } from "@/lib/manual/editor-scope";
import { editorWorkOf, type EditorWork } from "@/lib/manual/editor-work";
import type { EditorScope, EditorStep } from "@/lib/manual/p2-types";
import { can, type CanContext, type Viewer } from "@/lib/manual/permissions";
import { WRITE_FAILED } from "@/lib/manual/project-header";
import { buildsOf, productRowsOf, productsOfProject } from "@/lib/manual/project-read";
import { STEP_LABELS, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { stepFactText } from "@/lib/manual/rail-rows";
import { usePcbActions } from "@/lib/pcb/store";
import { cn } from "@/lib/utils";
import { LoadVersionDialog } from "./load-version-dialog";

export function ProductEditorBlock({
  project,
  productId,
  viewer,
  canCtx,
}: {
  project: ManualProject;
  /** The product row this page shows. */
  productId: string;
  viewer: Viewer;
  /** `view.canCtx`: the lock refuses product.openEditor (§3.8.5). */
  canCtx: CanContext;
}) {
  if (!can(viewer, "product.openEditor", canCtx)) return null;
  return (
    <RailBlock title="Editor">
      <EditorBody project={project} productId={productId} />
    </RailBlock>
  );
}

type EditorRead = { key: string; work: EditorWork; record: EditorSeed | null };

function seedRecordOf(scope: EditorScope): EditorSeed | null {
  try {
    return readSeed(scope, window.localStorage);
  } catch {
    return null;
  }
}

/** COR-61: one read per visit, after first paint, when the browser is idle —
 *  the step facts and the seed record together. `read` is undefined until it
 *  has run; `refresh` reads again at once. The reader never writes. */
function useEditorRead(projectId: string, productId: string, headRowId: string) {
  const key = `${projectId}:${productId}:${headRowId}`;
  const [read, setRead] = React.useState<EditorRead | null>(null);
  const readNow = React.useCallback(
    (): EditorRead => ({
      key,
      work: editorWorkOf({ projectId, productId }, headRowId),
      record: seedRecordOf({ projectId, productId }),
    }),
    [key, projectId, productId, headRowId],
  );
  React.useEffect(() => {
    const run = () => setRead(readNow());
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    // No requestIdleCallback (Safari): a macrotask still lands after paint.
    const timer = window.setTimeout(run, 1);
    return () => window.clearTimeout(timer);
  }, [readNow]);
  const refresh = React.useCallback(() => setRead(readNow()), [readNow]);
  return { read: read?.key === key ? read : undefined, refresh };
}

function EditorBody({ project, productId }: { project: ManualProject; productId: string }) {
  // The first row falls back to the project's legacy (pre-product) documents (P2-EDITOR-3).
  const headRowId = productRowsOf(project)[0]?.id ?? productId;
  const { read, refresh } = useEditorRead(project.id, productId, headRowId);
  // The slot under the six rows (P2-EDITOR-11).
  const caption = <SeedCaption project={project} productId={productId} read={read} refresh={refresh} />;
  return (
    <>
      <EditorRows project={project} productId={productId} work={read?.work} />
      {caption}
    </>
  );
}

function EditorRows({
  project,
  productId,
  work,
}: {
  project: ManualProject;
  productId: string;
  work: EditorWork | undefined;
}) {
  const { selectEditorScope } = useManualProjects();
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

// The page's quiet button (product-version.tsx's, on a <button>: the reset
// takes a button's border style, so it is named here).
const QUIET = "border-solid [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** Focus the block's h2 — its toggle, once the rail has stacked — after Load
 *  or Restore replaced the buttons under the caption (P2-BUILDLOAD-9). */
function focusHeading(from: HTMLElement | null) {
  const h2 = from?.closest("section")?.querySelector("h2");
  if (!h2) return;
  const toggle = h2.querySelector("button");
  if (toggle) {
    toggle.focus();
    return;
  }
  h2.tabIndex = -1;
  h2.focus();
}

/** P2-BUILDLOAD-13: where this product's documents came from, and the Load /
 *  Restore buttons, in a wrapping row under one line of text. */
function SeedCaption({
  project,
  productId,
  read,
  refresh,
}: {
  project: ManualProject;
  productId: string;
  read: EditorRead | undefined;
  refresh: () => void;
}) {
  const { builds } = useCreateHistory();
  const pcb = usePcbActions();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  // Asked for by Load and Restore; run after the commit that closed the
  // dialog, whose own clean-up would otherwise put focus back on its opener.
  const [focusAsked, setFocusAsked] = React.useState(0);
  React.useEffect(() => {
    if (focusAsked) focusHeading(rootRef.current);
  }, [focusAsked]);
  // The row's build now — the version it points at, which a later version's
  // Save moves on (a dropped product stays on the last version that had it).
  const row = React.useMemo(
    () => productsOfProject(project, buildsOf(project, builds)).find((r) => r.id === productId) ?? null,
    [project, builds, productId],
  );
  const built = row?.state === "built" ? row.built : null;
  const pieces = React.useMemo(() => (built ? seedPiecesOf(built.product) : []), [built]);
  if (!row || !built) return null;

  const scope: EditorScope = { projectId: project.id, productId };
  const caption = read ? seedCaptionOf(row.state, read.record, built.ref.version, pieces) : null;
  if (read && !caption) return null;

  const done = (message: string) => {
    setError(null);
    setAnnouncement(message);
    refresh();
    setFocusAsked((n) => n + 1);
  };
  const restore = () => {
    // Its documents are about to change under the store: it lets go first.
    pcb.releaseScope(scope);
    let result: ReturnType<typeof restoreBackup>;
    try {
      result = restoreBackup(scope, Date.now(), window.localStorage);
    } catch {
      result = { ok: false, reason: "write" };
    }
    if (result.ok) done(result.message);
    else if (result.reason === "write") setError(WRITE_FAILED);
    else refresh(); // no backup any more: another tab restored it
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-[8px]">
      <p className="m-0 max-w-[62ch] text-sm leading-md text-text-secondary">
        {caption ? caption.lines.join(" ") : "—"}
      </p>
      {caption && (caption.load || caption.restore) && (
        <div className="flex flex-wrap items-center gap-[8px]">
          {caption.load && (
            <Button
              hierarchy="secondary"
              size="md"
              aria-haspopup="dialog"
              className={QUIET}
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
            >
              {caption.load.label}
            </Button>
          )}
          {caption.restore && (
            <Button hierarchy="secondary" size="md" className={QUIET} onClick={restore}>
              {caption.restore.label}
            </Button>
          )}
        </div>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {loading && read && (
        <LoadVersionDialog
          scope={scope}
          built={built}
          record={read.record}
          onClose={() => setLoading(false)}
          onLoaded={(message) => {
            setLoading(false);
            done(message);
          }}
        />
      )}
    </div>
  );
}
