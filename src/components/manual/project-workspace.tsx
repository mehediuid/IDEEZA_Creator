"use client";

// ProjectWorkspace — the client gate behind the editor routes.
//
// The editor opens a PRODUCT, not a project (owner decision 7, P2-EDITOR-1):
// /project/<slug>/products/<productId>/<step>. The URL is the source of
// truth. The gate, in order:
//   1. not hydrated (projects, marketplace) → "Loading project…";
//   2. unknown slug → My projects;
//   3. locked (sold in full, §3.8.5) → "{project} was sold in full";
//   4. a legacy /project/<slug>/<step> → the product it resumes (P2-EDITOR-2);
//   5. unknown product → "This product isn't in {project}" — never another
//      product silently, or the maker would edit the wrong one;
//   6. the scope isn't applied yet → "Opening product…".
// Applying the scope makes the project active with its product
// (`selectEditorScope`) and points the root PCB store at the product's board
// (`setDocScope`, P2-EDITOR-4); the editor mounts once both match the URL,
// keyed by project and product, so switching product remounts every editor.
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
import { useManualProjects, type ManualFlowState } from "@/lib/manual/projects";
import { productRowsOf } from "@/lib/manual/project-read";
import { editorHref, resumeProductOf } from "@/lib/manual/editor-scope";
import { can } from "@/lib/manual/permissions";
import type { EditorScope, EditorStep } from "@/lib/manual/p2-types";
import { useMarket } from "@/lib/market/market-store";
import { usePcbActions, usePcbDocScope } from "@/lib/pcb/store";
import { cn } from "@/lib/utils";
import { BringInBanner, EditorBannerProvider } from "./bring-in-banner";

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
  const pcb = usePcbActions();
  const pcbScope = usePcbDocScope();
  const project = findBySlug(slug);
  const gate = useProjectEditGate(project?.id ?? null);

  const isBrief = step === "brief";
  const ready = hydrated && market.hydrated;
  // The lock (decision 12): Open in editor is refused, so the route is too.
  const locked =
    !isBrief &&
    !!project &&
    !can(OWNER, "product.openEditor", { locked: gate.gateOf("editProduct").kind === "locked" });
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

  // A product route applies its scope: the project and product become the
  // editor's, then the PCB store takes the product's board. Re-applied if the
  // store lets go of it while this route is open (Load / Restore, delete).
  React.useEffect(() => {
    if (!ready || !projectId || !rowId || !headRowId || locked) return;
    const scope: EditorScope = { projectId, productId: rowId };
    selectEditorScope(projectId, rowId);
    // BUILDLOAD (TB2): `ensureSeeded(scope, built, now, localStorage, headRowId)`
    // runs here — after the gate, before the PCB store reads the documents.
    pcb.setDocScope(scope, headRowId);
  }, [ready, projectId, rowId, headRowId, locked, pcbHolds, selectEditorScope, pcb]);

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

  if (!ready) return <BlankShell label="Loading project…" />;
  if (!project) return <BlankShell label="Returning to projects…" />;
  const projectHref = `/projects/${project.id}`;
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
  if (!applied) return <BlankShell label="Opening product…" />;
  // The same object every render of this product (pcbScope is the store's
  // published value), so the banner's storage read runs once per product.
  const scope = pcbScope!;

  const App = APP_BY_STEP[step];
  const bringInEditor = step === "code" ? "code" : step === "three" ? "three" : null;
  const productName = row.name.trim() || "Not named yet";
  // The banner slot under the top bar (P2-EDITOR-5; BUILDLOAD's import
  // notice, TB2, shows before it).
  const banners = bringInEditor ? (
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
