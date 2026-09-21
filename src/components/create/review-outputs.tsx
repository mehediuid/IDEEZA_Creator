"use client";

// ReviewOutputs — the last view of a build (Ai-Flow frames 15 / DL-02 /
// DL-03 / Wiring / Parts). One pill tab per deliverable the build really
// produced, the artifact itself on the left, what ships with it on the
// right, and the two things a finished build can become:
//
//   • Save Project  — opens this build's Brief (/build/<id>/brief), which
//                     is where the build is given a project: Step 1's
//                     chooser attaches it to an existing one or starts a
//                     new one, then the outcome (sell / give / private)
//                     runs from there.
//   • Advance Edit  — skip the brief: make (or reuse) the project now and
//                     open it straight in the PCB editor.
//
// One project per build. Save Project makes nothing on its own — the
// attachment is the maker's answer, not a side effect of pressing a
// button — and Advance Edit goes through `projectFromBuild`, so pressing
// it twice reuses the project rather than making a second one. Once the
// build carries a project the footer says so and offers the ways on
// instead of repeating the two first-time actions.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  FloppyDiskIcon,
  HelpCircleIcon,
  PencilEdit02Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { ModelViewer } from "@/components/3d/model-viewer";
import {
  ITEM_LABELS,
  ITEM_KINDS,
  productsOf,
  statusOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import { stepHref, useManualProjects } from "@/lib/manual/projects";
import type { ArtifactSource } from "@/lib/create/build-artifacts";
import { confidenceFor } from "@/lib/create/confidence";
import { ConfidenceBadge } from "./confidence-badge";
import {
  FirmwarePreview,
  PartsPreview,
  PartsSummary,
  PcbPreview,
  WHAT_SHIPS,
  WiringPreview,
} from "./deliverable-previews";

export function ReviewOutputs({
  job,
  productId: controlledProductId,
  onProductChange,
}: {
  job: BuildJob;
  productId?: string;
  onProductChange?: (id: string) => void;
}) {
  // The panel reads `?tab=` for a deep link (a project card links
  // straight at its parts list), which needs a boundary so the route can
  // still be pre-rendered. The build view only renders once the store
  // has hydrated in the browser, so the fallback is never seen.
  return (
    <React.Suspense fallback={null}>
      <ReviewPanel
        job={job}
        controlledProductId={controlledProductId}
        onProductChange={onProductChange}
      />
    </React.Suspense>
  );
}

function ReviewPanel({
  job,
  controlledProductId,
  onProductChange,
}: {
  job: BuildJob;
  controlledProductId?: string;
  onProductChange?: (id: string) => void;
}) {
  const router = useRouter();
  const query = useSearchParams();
  const { setBuildProject } = useCreateHistory();
  const { projects, projectFromBuild, selectProject } = useManualProjects();

  // An artifact an older build never produced has nothing to review, so
  // it gets no tab — a deliverable panel for something that was never
  // made would be a lie.
  // §4.7 — a build covers one product or several, and each product opens
  // into its own tabs. The product switcher only appears when there is
  // more than one; a single-product build is the surface it always was.
  const products = React.useMemo(() => productsOf(job), [job]);
  // Controlled when the shell shares the selection with the rail beside it,
  // so picking a product in either moves both.
  const [ownProductId, setOwnProductId] = React.useState("primary");
  const productId = controlledProductId ?? ownProductId;
  const setProductId = (id: string) => {
    setOwnProductId(id);
    onProductChange?.(id);
  };
  // The surface is live: it opens when the build starts and fills in as each
  // piece lands, rather than withholding everything until the last one does.
  // A piece nobody can look at yet says so in its own panel; the decisions at
  // the foot wait for the whole build, because they act on all of it.
  const building = statusOf(job) !== "ready";
  const product =
    products.find((x) => x.id === productId) ?? products[0];
  const deliverables = React.useMemo(
    () => product.items.filter((i) => i.status !== "skipped"),
    [product.items],
  );
  // §4.3 — one badge per product (§4.4.9), computed from the products
  // themselves so the badge on screen is what the checker returned.
  const confidence = React.useMemo(
    () => confidenceFor(job, products),
    [job, products],
  );
  const productConfidence =
    confidence.byProduct.find((c) => c.productId === product.id) ??
    confidence.byProduct[0];

  const [picked, setPicked] = React.useState<BuildItemKind | null>(null);
  const linked = query.get("tab");
  const wanted = picked ?? ITEM_KINDS.find((k) => k === linked) ?? null;
  // Falls back to the first real deliverable when the link (or a job
  // whose items changed underneath) names one this build doesn't have.
  const shown =
    deliverables.find((i) => i.kind === wanted)?.kind ??
    deliverables[0]?.kind ??
    null;

  const shownItem = deliverables.find((i) => i.kind === shown) ?? null;

  // The project this build already belongs to — the Brief's Step 1 (or
  // Advance Edit) is what put it there. A stored id whose project is gone
  // reads as unsaved, so the footer can't point at a project that isn't
  // in this browser any more.
  const saved = React.useMemo(
    () => (job.projectId ? projects.find((p) => p.id === job.projectId) ?? null : null),
    [job.projectId, projects],
  );

  // Advance Edit's project: created on the first press and handed back on
  // every one after it. Selecting it is explicit — the editor pages work
  // on the active project, so landing there means switching to it, but
  // nothing else on this surface moves it under the user.
  // Which footer control is taking the maker off this surface. All four
  // navigate to a route whose payload has to be fetched, and the two editor
  // ones pull the PCB module's chunk behind it, so the press is followed by
  // a pause with nothing in it — the press has to say so or it reads as a
  // click that missed. Never cleared: the navigation unmounts this surface.
  const [leaving, setLeaving] = React.useState<null | "brief" | "editor">(null);

  const openInEditor = React.useCallback(() => {
    setLeaving("editor");
    const project = projectFromBuild(job);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
    selectProject(project.id);
    router.push(stepHref(project, "pcb"));
  }, [job, projectFromBuild, setBuildProject, selectProject, router]);

  const openBrief = React.useCallback(() => {
    setLeaving("brief");
    router.push(`/build/${job.id}/brief`);
  }, [job.id, router]);

  return (
    <section
      aria-labelledby="review-heading"
      className="overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface"
    >
      <header className="px-10 pb-6 pt-8">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-brand">
          {building ? "Building" : "Build ready"}
        </p>
        <h2
          id="review-heading"
          className="mt-1 text-xl font-bold tracking-tight text-text-primary"
        >
          {building ? "Your deliverables, as they land" : "Review your deliverables"}
        </h2>
        {/* §4.3 + §4.4.9 — the product's own tier, and on a multi-product
            build the project's headline is the lowest of them, which this
            badge already is because the switcher lands on that product's
            own state. The list opens under it. */}
        <div className="mt-4">
          {/* Keyed by product: switching products is looking at a
              different thing, so the list closes rather than carrying one
              product's open state onto another's issues. */}
          <ConfidenceBadge
            key={productConfidence.productId}
            confidence={productConfidence}
          />
        </div>
      </header>

      {shown === null ? (
        <div className="flex flex-col items-center gap-5 px-10 pb-24 pt-4 text-center">
          <Icon icon={HelpCircleIcon} size={28} />
          <p className="max-w-[380px] text-sm text-text-secondary">
            This build has no deliverables to review — generate a new full
            product from a concept.
          </p>
        </div>
      ) : (
        <>
          {products.length > 1 && (
            <div
              role="tablist"
              aria-label="Products in this build"
              data-testid="product-switcher"
              className="mx-10 mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-solid border-border bg-bg-subtle p-2"
            >
              {products.map((x) => {
                const on = x.id === product.id;
                return (
                  <button
                    key={x.id}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => {
                      setProductId(x.id);
                      setPicked(null);
                    }}
                    className={[
                      "inline-flex h-[32px] items-center rounded-lg px-5 text-sm font-semibold outline-none transition-colors duration-fast",
                      "focus-visible:ring-2 focus-visible:ring-border-focus",
                      on
                        ? "bg-bg-surface text-text-primary shadow-1"
                        : "text-text-secondary hover:text-text-primary",
                    ].join(" ")}
                  >
                    {x.name}
                  </button>
                );
              })}
            </div>
          )}

          <div
            role="tablist"
            aria-label="Deliverables"
            className="flex flex-wrap items-center gap-4 px-10 pb-6"
          >
            {deliverables.map((item) => {
              const isActive = shown === item.kind;
              return (
                <button
                  key={item.kind}
                  id={`review-tab-${item.kind}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls="review-tabpanel"
                  onClick={() => setPicked(item.kind)}
                  className={[
                    "inline-flex h-[36px] items-center rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-fast",
                    "focus-visible:ring-2 focus-visible:ring-border-focus",
                    isActive
                      ? "bg-bg-brand text-text-on-brand"
                      : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                  ].join(" ")}
                >
                  {ITEM_LABELS[item.kind]}
                </button>
              );
            })}
          </div>

          <div
            id="review-tabpanel"
            role="tabpanel"
            aria-labelledby={`review-tab-${shown}`}
            className="grid gap-8 px-10 pb-10 md:grid-cols-[minmax(0,1fr)_260px]"
          >
            {/* A wiring map or a long BOM is taller than the card; it
                scrolls inside the panel instead of stretching the page
                away from the two actions below. */}
            <div className="max-h-[520px] min-w-0 overflow-auto rounded-xl">
              {/* A piece that has not landed shows what it is doing rather
                  than an empty frame — the rail beside this says the same
                  thing, and disagreeing with it would be worse than silence. */}
              {shownItem && shownItem.status !== "ready" ? (
                <div className="flex h-[280px] flex-col items-center justify-center gap-[8px] rounded-xl border border-solid border-border bg-bg-subtle text-center">
                  <p className="text-md font-medium text-text-secondary">
                    {shownItem.status === "failed"
                      ? "This piece couldn't be generated"
                      : shownItem.status === "building"
                        ? `Generating · ${Math.round(shownItem.progress)}%`
                        : "Waiting to start"}
                  </p>
                  <p className="max-w-[40ch] text-sm text-text-tertiary">
                    {shownItem.status === "failed"
                      ? "The other pieces are unaffected — retry it from the build."
                      : "It appears here the moment it lands."}
                  </p>
                </div>
              ) : (
                <DeliverablePanel kind={shown} product={product} job={job} />
              )}
            </div>
            <aside className="flex flex-col gap-8 rounded-xl border border-solid border-border bg-bg-surface p-8">
              {shown === "parts" && <PartsSummary job={product} />}
              <section>
                <h3 className="text-2xs font-bold tracking-wider text-text-secondary">
                  WHAT THIS COVERS
                </h3>
                <ul role="list" className="mt-4 flex flex-col items-start gap-3">
                  {WHAT_SHIPS[shown].map((line) => (
                    <li
                      key={line}
                      className="inline-flex items-center gap-3 rounded-full bg-bg-subtle px-4 py-2 text-sm text-text-secondary"
                    >
                      <Icon icon={CheckmarkCircle02Icon} size={14} className="shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          {!building && (
          <footer className="flex flex-wrap items-center justify-between gap-8 border-t border-solid border-border px-10 py-8">
            {saved ? (
              <>
                <p className="inline-flex items-center gap-4 text-sm text-text-secondary">
                  <Icon
                    icon={CheckmarkCircle02Icon}
                    size={16}
                    className="shrink-0 text-text-success"
                  />
                  Saved to {saved.name}. Pick the brief back up, or open the
                  project to keep editing.
                </p>
                <div className="flex items-center gap-6">
                  <LeaveButton
                    tone="primary"
                    busy={leaving === "brief"}
                    blocked={leaving !== null}
                    onClick={openBrief}
                    /* Carrying on, not saving again — the floppy belongs to
                       "Save Project", which is the button this one replaces
                       once the build has a project. */
                    icon={ArrowRight02Icon}
                  >
                    Continue Brief
                  </LeaveButton>
                  <LeaveButton
                    tone="quiet"
                    busy={leaving === "editor"}
                    blocked={leaving !== null}
                    onClick={openInEditor}
                    icon={PencilEdit02Icon}
                  >
                    Open Project
                  </LeaveButton>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  {deliverables.length === ITEM_KINDS.length
                    ? "All five pieces are ready. Choose what happens to this build next."
                    : "Every piece this build made is ready. Choose what happens to this build next."}
                </p>
                <div className="flex items-center gap-6">
                  <LeaveButton
                    tone="primary"
                    busy={leaving === "brief"}
                    blocked={leaving !== null}
                    onClick={openBrief}
                    icon={FloppyDiskIcon}
                  >
                    Save Project
                  </LeaveButton>
                  <LeaveButton
                    tone="quiet"
                    busy={leaving === "editor"}
                    blocked={leaving !== null}
                    onClick={openInEditor}
                    icon={PencilEdit02Icon}
                  >
                    Advance Edit
                  </LeaveButton>
                </div>
              </>
            )}
          </footer>
          )}
        </>
      )}
    </section>
  );
}

function DeliverablePanel({
  kind,
  product,
  job,
}: {
  kind: BuildItemKind;
  /** The product being reviewed — the primary, or one of its companions
   *  (§4.7). Every artifact below is derived from this product's own
   *  parts, so a remote's BOM is the remote's. */
  product: ArtifactSource;
  /** Still the job, for the one thing that is the job's and not a
   *  product's: the generated 3D model. */
  job: BuildJob;
}) {
  if (kind === "pcb") return <PcbPreview job={product} />;
  if (kind === "code") return <FirmwarePreview job={product} />;
  if (kind === "wiring") return <WiringPreview job={product} />;
  if (kind === "parts") return <PartsPreview job={product} />;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-solid border-border bg-bg-surface-raised">
      {job.modelGlbUrl ? (
        <ModelViewer url={job.modelGlbUrl} />
      ) : (
        <GeneratingModel />
      )}
    </div>
  );
}

// Shown in the 3D tab while the enclosure mesh is still being generated from
// the concept image. The build can flip to "ready" before a slow provider
// finishes the mesh, so this keeps the panel honest until the model lands.
function GeneratingModel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-text-tertiary">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="ix-modelspin">
        <circle cx="12" cy="12" r="9" stroke="var(--color-border)" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--color-text-brand)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-text-secondary">Generating 3D model…</p>
      <style>{`.ix-modelspin{animation:ix-modelspin-kf 1s linear infinite}@keyframes ix-modelspin-kf{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.ix-modelspin{animation:none}}`}</style>
    </div>
  );
}

/** A footer control that leaves this surface. It spins and says "Opening…"
 *  from the click, and every one of them is shut while any is under way —
 *  two navigations at once is not a thing the maker can have meant. */
function LeaveButton({
  tone,
  busy,
  blocked,
  onClick,
  icon,
  children,
}: {
  tone: "primary" | "quiet";
  busy: boolean;
  blocked: boolean;
  onClick: () => void;
  icon: IconValue;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-[40px] items-center gap-4 rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
  const paint =
    tone === "primary"
      ? "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover"
      : "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={blocked}
      aria-busy={busy}
      className={[
        base,
        paint,
        blocked ? (busy ? "cursor-wait opacity-80" : "opacity-60") : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={busy ? "inline-flex motion-safe:animate-spin" : "inline-flex"}
      >
        <Icon icon={busy ? Refresh01Icon : icon} size={18} />
      </span>
      {busy ? "Opening…" : children}
    </button>
  );
}
