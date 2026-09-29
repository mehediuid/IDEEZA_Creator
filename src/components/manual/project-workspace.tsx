"use client";

// ProjectWorkspace — the client gate behind the editor routes.
//
// The editor opens a PRODUCT, not a project (owner decision 7, P2-EDITOR-1):
// /project/<slug>/products/<productId>/<step>. The URL is the source of
// truth. The gate, in order:
//   1. not hydrated (projects, marketplace) → "Loading project…";
//   2. unknown slug → My projects;
//   3. locked (sold in full, §3.8.5) → "{project} was sold in full"; and,
//      as delete does, unreadable marketplace records lock it too — they
//      can't say whether it was sold;
//   4. a legacy /project/<slug>/<step> → the product it resumes (P2-EDITOR-2);
//   5. unknown product → "This product isn't in {project}" — never another
//      product silently, or the maker would edit the wrong one;
//   6. the scope isn't applied yet → "Opening product…".
// Applying the scope makes the project active with its product
// (`selectEditorScope`); fills a built product's documents from its build on
// its first open (`ensureSeeded`, P2-BUILDLOAD-7 — once the build history has
// hydrated, so the row's build is known); then points the root PCB store at
// the product's board (`setDocScope`, P2-EDITOR-4). The editor mounts once
// both match the URL, keyed by project and product, so switching product
// remounts every editor. Under the top bar it shows what the seed brought in
// (P2-BUILDLOAD-12), then "Bring it in" (P2-EDITOR-5): one banner at a time.
//
// The Brief (/project/<slug>/brief) is the project's: it has no product,
// and a locked project keeps it (View brief stays, §3.8.5).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { HelpCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import { useCreateHistory } from "@/lib/create/history";
import { pendingNoticeOf, type SeedEditor } from "@/lib/manual/build-load";
import { ensureSeeded, readSeed, type EnsureResult, type SeedBuilt } from "@/lib/manual/build-load-io";
import { useManualProjects, type ManualFlowState } from "@/lib/manual/projects";
import { buildsOf, productRowsOf, productsOfProject } from "@/lib/manual/project-read";
import { editorHref, resumeProductOf } from "@/lib/manual/editor-scope";
import { can } from "@/lib/manual/permissions";
import type { EditorScope, EditorStep } from "@/lib/manual/p2-types";
import { useMarket } from "@/lib/market/market-store";
import { usePcbActions, usePcbDocScope } from "@/lib/pcb/store";
import { cn } from "@/lib/utils";
import { BringInBanner, EditorBannerProvider, focusEditorBanners } from "./bring-in-banner";
import { ImportNotice, SeedFailedNotice } from "./import-notice";

function BlankShell({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-dvh w-full items-center justify-center bg-bg-page text-md text-text-tertiary"
    >
      {label}
    </div>
  );
}

/** A whole-viewport state: the card's title is the page's h1, and route
 *  focus lands on it. */
function EditorStateCard({
  icon,
  title,
  body,
  backHref,
}: {
  icon: typeof HelpCircleIcon;
  title: string;
  body: string;
  backHref: string;
}) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [title]);
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-bg-page px-[16px] py-[48px]">
      <StateCard
        tone="empty"
        titleAs="h1"
        titleRef={titleRef}
        icon={<Icon icon={icon} size={32} />}
        title={title}
        body={body}
        action={
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ hierarchy: "secondary", size: "lg" }),
              "no-underline hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
            )}
          >
            Back to the project
          </Link>
        }
      />
    </main>
  );
}

// Code-split each editor so a route only ships the app it needs.
const loading = () => <BlankShell label="Loading editor…" />;
const PcbApp = dynamic(
  () => import("@/components/pcb/pcb-app").then((m) => m.PcbApp),
  { ssr: false, loading },
);
const CodeApp = dynamic(
  () => import("@/components/code/code-app").then((m) => m.CodeApp),
  { ssr: false, loading },
);
const ThreeApp = dynamic(
  () => import("@/components/3d/three-app").then((m) => m.ThreeApp),
  { ssr: false, loading },
);
const PreviewApp = dynamic(
  () => import("@/components/preview/preview-app").then((m) => m.PreviewApp),
  { ssr: false, loading },
);
const AssemblyApp = dynamic(
  () => import("@/components/assembly/assembly-app").then((m) => m.AssemblyApp),
  { ssr: false, loading },
);
const WiringApp = dynamic(
  () => import("@/components/wiring/wiring-app").then((m) => m.WiringApp),
  { ssr: false, loading },
);
const BriefApp = dynamic(
  () => import("@/components/brief/brief-app").then((m) => m.BriefApp),
  { ssr: false, loading },
);

const APP_BY_STEP: Record<keyof ManualFlowState, React.ComponentType> = {
  pcb: PcbApp,
  code: CodeApp,
  three: ThreeApp,
  assembly: AssemblyApp,
  wiring: WiringApp,
  preview: PreviewApp,
  brief: BriefApp,
};

const OWNER = { kind: "local-owner" } as const;

/** The editor each step's import notice belongs to (P2-BUILDLOAD-12). */
const SEED_EDITOR_OF: Partial<Record<keyof ManualFlowState, SeedEditor>> = {
  pcb: "pcb",
  three: "three",
  code: "code",
  wiring: "wiring",
};

/** What this open's seed did for one product (`key` = project:row), and the
 *  notices Got it has hidden since. */
type SeedState = { key: string; result: EnsureResult; hidden: SeedEditor[]; failureHidden: boolean };

const SKIPPED: EnsureResult = { status: "skipped", record: null };

function storageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked storage: no editor can read a document either
  }
}

export function ProjectWorkspace({
  slug,
  step,
  productId,
}: {
  slug: string;
  step: keyof ManualFlowState;
  /** The product route's row id; absent on the legacy /project/<slug>/<step>
   *  and on the Brief. */
  productId?: string;
}) {
  const router = useRouter();
  const {
    hydrated,
    findBySlug,
    activeProjectId,
    activeProductId,
    selectProject,
    selectEditorScope,
    touchOpened,
  } = useManualProjects();
  const market = useMarket();
  const { hydrated: historyHydrated, builds } = useCreateHistory();
  const pcb = usePcbActions();
  const pcbScope = usePcbDocScope();
  const project = findBySlug(slug);
  const gate = useProjectEditGate(project?.id ?? null);

  const isBrief = step === "brief";
  const ready = hydrated && market.hydrated;
  // The lock (decision 12): Open in editor is refused, so the route is too.
  // Unreadable market records read as "no sales", so they lock it as well.
  const marketUnreadable = !isBrief && !!project && market.data.unreadable;
  const locked =
    marketUnreadable ||
    (!isBrief &&
      !!project &&
      !can(OWNER, "product.openEditor", { locked: gate.gateOf("editProduct").kind === "locked" }));
  const rows = project ? productRowsOf(project) : [];
  const headRowId = rows[0]?.id ?? null;
  const row = productId !== undefined ? (rows.find((r) => r.id === productId) ?? null) : null;
  const legacyRoute = !isBrief && productId === undefined;

  const projectId = project?.id ?? null;
  const rowId = row?.id ?? null;
  const pcbHolds = !!projectId && !!rowId && pcbScope?.projectId === projectId && pcbScope.productId === rowId;
  const applied = pcbHolds && activeProjectId === projectId && activeProductId === rowId;

  // An unknown slug goes back to My projects; a legacy editor address goes
  // to the product it resumes, keeping any query it carried.
  const resumeHref =
    ready && project && legacyRoute && !locked
      ? editorHref(project, resumeProductOf(project), step as EditorStep)
      : null;
  React.useEffect(() => {
    if (!ready) return;
    if (!project) {
      router.replace("/projects");
      return;
    }
    if (resumeHref) router.replace(resumeHref + window.location.search);
  }, [ready, project, resumeHref, router]);

  // The Brief works on the project.
  React.useEffect(() => {
    if (!ready || !projectId || !isBrief) return;
    if (activeProjectId !== projectId) selectProject(projectId);
  }, [ready, projectId, isBrief, activeProjectId, selectProject]);

  // The build a row is, read when the scope is applied — never a dependency,
  // so a build running elsewhere doesn't re-apply an open product.
  const builtOf = React.useEffectEvent((rowId: string): SeedBuilt | null => {
    if (!project) return null;
    return productsOfProject(project, buildsOf(project, builds)).find((r) => r.id === rowId)?.built ?? null;
  });
  const seedNow = React.useEffectEvent((scope: EditorScope, head: string, storage: Storage) =>
    ensureSeeded(scope, builtOf(scope.productId), Date.now(), storage, head),
  );

  // This open's seed (P2-BUILDLOAD-7, 12), and the product this mount has
  // already run it for, so a refused seed is retried once per open, not in a
  // loop.
  const [seed, setSeed] = React.useState<SeedState | null>(null);
  const seededFor = React.useRef<string | null>(null);

  // A product route applies its scope: the project and product become the
  // editor's; a built product's documents are seeded on its first open,
  // after the gate and before anything reads them; then the PCB store takes
  // the product's board. Re-applied if the store lets go of it while this
  // route is open (Load / Restore, delete).
  React.useEffect(() => {
    if (!ready || !historyHydrated || !projectId || !rowId || !headRowId || locked) return;
    const scope: EditorScope = { projectId, productId: rowId };
    const key = `${projectId}:${rowId}`;
    selectEditorScope(projectId, rowId);
    if (seededFor.current === key && pcbHolds) return;
    const storage = storageOrNull();
    if (pcbHolds) {
      // An earlier open holds the board. Its seed record says what it did —
      // unless that seed was refused, or the row has taken a build since:
      // then the store lets go first (flushing the maker's pending save),
      // so the seed below never races a board still in memory.
      const record = storage ? readSeed(scope, storage) : null;
      if (!record && storage && builtOf(rowId)) {
        pcb.releaseScope(scope);
        return;
      }
      seededFor.current = key;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the seed record is external state, read once per open
      setSeed({ key, result: record ? { status: "exists", record } : SKIPPED, hidden: [], failureHidden: false });
      return;
    }
    seededFor.current = key;
    const result = storage ? seedNow(scope, headRowId, storage) : SKIPPED;
    setSeed({ key, result, hidden: [], failureHidden: false });
    pcb.setDocScope(scope, headRowId);
  }, [ready, historyHydrated, projectId, rowId, headRowId, locked, pcbHolds, selectEditorScope, pcb]);

  // P2-EDITOR-7 (COR-91): this product at this step is where it resumes.
  React.useEffect(() => {
    if (!applied || !projectId || !rowId || isBrief) return;
    touchOpened(projectId, rowId, step as EditorStep);
  }, [applied, projectId, rowId, step, isBrief, touchOpened]);

  // "Bring it in" remounts the editor on the product's new documents, and
  // says so politely from outside the editor, which the remount replaces.
  const [generation, setGeneration] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");
  const onBrought = React.useCallback((message: string) => {
    setAnnouncement(message);
    setGeneration((g) => g + 1);
  }, []);
  // The remount replaced the slot the pressed button was in: focus the new one.
  React.useEffect(() => {
    if (generation > 0) focusEditorBanners();
  }, [generation]);

  if (!ready) return <BlankShell label="Loading project…" />;
  if (!project) return <BlankShell label="Returning to projects…" />;
  const projectHref = `/projects/${project.id}`;
  if (marketUnreadable) {
    return (
      <EditorStateCard
        icon={LockIcon}
        title={`${project.name} can't be edited right now`}
        body="This browser's marketplace records couldn't be read, so we can't tell whether it was sold. Its products stay read-only until they can be."
        backHref={projectHref}
      />
    );
  }
  if (locked) {
    return (
      <EditorStateCard
        icon={LockIcon}
        title={`${project.name} was sold in full`}
        body="Its products are read-only now — the buyer owns them."
        backHref={projectHref}
      />
    );
  }

  if (isBrief) {
    // Hold the Brief until the active project matches the URL — avoids a
    // frame of the previous project's chrome while selectProject settles.
    if (activeProjectId !== project.id) return <BlankShell label="Opening project…" />;
    return <BriefApp key={project.id} />;
  }

  if (legacyRoute) return <BlankShell label="Opening product…" />;
  if (!row) {
    return (
      <EditorStateCard
        icon={HelpCircleIcon}
        title={`This product isn't in ${project.name}`}
        body="Its link doesn't match any product saved in this project — it may have come from another browser."
        backHref={projectHref}
      />
    );
  }
  // The seed is decided inside "Opening product…" too: no editor mounts on
  // documents its build is about to fill.
  const seedHere = seed?.key === `${project.id}:${row.id}` ? seed : null;
  if (!applied || !seedHere) return <BlankShell label="Opening product…" />;
  // The same object every render of this product (pcbScope is the store's
  // published value), so the banner's storage read runs once per product.
  const scope = pcbScope!;

  const App = APP_BY_STEP[step];
  const bringInEditor = step === "code" ? "code" : step === "three" ? "three" : null;
  const productName = row.name.trim() || "Not named yet";

  // The banner slot under the top bar, one banner at a time: a refused seed,
  // else what the seed brought into this editor (P2-BUILDLOAD-12), else
  // "Bring it in" (P2-EDITOR-5).
  const seedEditor = SEED_EDITOR_OF[step] ?? null;
  const { result } = seedHere;
  const failure = result.status === "failed" && !seedHere.failureHidden ? result.message : null;
  const notice =
    seedEditor && !seedHere.hidden.includes(seedEditor) ? pendingNoticeOf(result.record, seedEditor) : null;
  const hide = (patch: Partial<Pick<SeedState, "hidden" | "failureHidden">>) =>
    setSeed((s) => (s && s.key === seedHere.key ? { ...s, ...patch } : s));
  const banners = failure ? (
    <SeedFailedNotice message={failure} onDismissed={() => hide({ failureHidden: true })} />
  ) : notice && seedEditor ? (
    <ImportNotice
      key={seedEditor}
      scope={scope}
      editor={seedEditor}
      notice={notice}
      onDismissed={(e) => hide({ hidden: [...seedHere.hidden, e] })}
    />
  ) : bringInEditor ? (
    <BringInBanner
      key={`${scope.projectId}:${scope.productId}:${generation}`}
      editor={bringInEditor}
      scope={scope}
      productName={productName}
      onBrought={onBrought}
    />
  ) : null;

  return (
    <>
      <EditorBannerProvider banners={banners}>
        <App key={`${scope.projectId}:${scope.productId}:${generation}`} />
      </EditorBannerProvider>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
