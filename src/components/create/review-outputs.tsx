"use client";

// ReviewOutputs — a build's own surface, live from the moment it starts (Ai-Flow
// frames 15 / DL-02 / DL-03 / Wiring / Parts). One tab per deliverable the
// build really produced, the artifact itself on the left, what it covers on
// the right, and the one thing a finished build becomes next:
//
//   • Save Project — opens the save step (save-step.tsx, owner decision 5):
//                    the project's name and details before anything is saved,
//                    or the project the setup question chose, or — for a
//                    rebuild — the version it becomes. Saving goes to the
//                    project page, where the next step lives (P2-SAVE-9).
//   • Open project — once saved, the one control (P2-SAVE-10). The Brief is
//                    the project page's main button, and the editor opens a
//                    product from its own page (decision 7), so neither is
//                    carried here a second time.
//
// Nothing makes a project without the save step. One project per build: the
// provider's saveBuild hands the same one back on every later press, and a
// rebuild of a chat already saved joins that project as its next version. A
// piece that failed is retried from its own panel, here, rather than from a
// page of its own.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  FloppyDiskIcon,
  HelpCircleIcon,
  MobileProgramming01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { deriveAssembly } from "@/lib/three/assembly";
import { ModelPanelLazy } from "./model-panel/model-panel-lazy";
import {
  ITEM_LABELS,
  ITEM_KINDS,
  productsOf,
  statusOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import { buildsOf } from "@/lib/manual/project-read";
import { footerLineOf } from "@/lib/manual/save-step";
import { isSampleModel, type ArtifactSource } from "@/lib/create/build-artifacts";
import { confidenceFor } from "@/lib/create/confidence";
import { ConfidenceBadge, ConfidenceIssuesPanel } from "./confidence-badge";
import {
  coversFor,
  FirmwarePreview,
  PartsPreview,
  PartsSummary,
  PcbPreview,
  WiringPreview,
} from "./deliverable-previews";
import { REVIEW_PRIMARY_ID } from "./anchors";
import { LeaveButton } from "./leave-button";
import { SaveStep, useSaveMode } from "./save-step";
import { moveTab } from "@/lib/ui/tab-keys";

export function ReviewOutputs({
  job,
  productId: controlledProductId,
  onProductChange,
  projectName,
}: {
  job: BuildJob;
  productId?: string;
  onProductChange?: (id: string) => void;
  /** The project these products belong to, when the surface knows it — the
   *  chat does, from the answer at the question. The build page does not, so
   *  it falls back to the project this build was saved into, and then to the
   *  primary product's own title. */
  projectName?: string;
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
        projectName={projectName}
      />
    </React.Suspense>
  );
}

function ReviewPanel({
  job,
  controlledProductId,
  onProductChange,
  projectName,
}: {
  job: BuildJob;
  controlledProductId?: string;
  onProductChange?: (id: string) => void;
  projectName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const { builds, retryBuildItem, setBuildModelFailed } = useCreateHistory();
  // Which save this build gets (saveModeOf, with the lock applied): the
  // footer's sentence, its one control and the save step all read it. A
  // rebuild of a chat already saved is that project's next version (COR-89).
  const saveInfo = useSaveMode(job);

  // An artifact an older build never produced has nothing to review, so
  // it gets no tab — a deliverable panel for something that was never
  // made would be a lie.
  // §4.7 — a build covers one product or several, and each product opens
  // into its own tabs. The product switcher only appears when there is
  // more than one; a single-product build is the surface it always was.
  const products = React.useMemo(() => productsOf(job), [job]);
  // Controlled when the shell shares the selection with the rail beside it,
  // so picking a product in either moves both. The review keeps the last
  // product it was told to show, adopted while rendering: Done, Close and
  // Esc on the spec sheet clear the selection, and the review stays where it
  // was rather than snapping back to the primary — the rail picked that
  // companion to look at its deliverables.
  const [ownProductId, setOwnProductId] = React.useState(controlledProductId ?? "primary");
  if (controlledProductId && controlledProductId !== ownProductId) setOwnProductId(controlledProductId);
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
  // L1 — the toggle stays beside the heading, but the list it opens needs
  // real width, so it renders as its own full-width row below the header
  // instead of squeezed into the header's left column beside its actions.
  // Keyed by product (derived, not an effect) so switching products closes
  // one product's open list rather than carrying it open onto another's.
  const [issuesOpenState, setIssuesOpenState] = React.useState<{
    productId: string;
    open: boolean;
  }>({ productId: productConfidence.productId, open: false });
  const issuesOpen =
    issuesOpenState.productId === productConfidence.productId
      ? issuesOpenState.open
      : false;
  const setIssuesOpen = (open: boolean) =>
    setIssuesOpenState({ productId: productConfidence.productId, open });

  const [picked, setPicked] = React.useState<BuildItemKind | null>(null);
  const linked = query.get("tab");
  const wanted = picked ?? ITEM_KINDS.find((k) => k === linked) ?? null;
  // Falls back to the first real deliverable when the link (or a job
  // whose items changed underneath) names one this build doesn't have.
  // With nothing asked for, open on something there is to look at: a finished
  // piece. The 3D tab is one as soon as its piece is — the model is built
  // from the parts, and the concept mesh only replaces its shell.
  const viewable = (i: (typeof deliverables)[number]) => i.status === "ready";
  const shown =
    deliverables.find((i) => i.kind === wanted)?.kind ??
    deliverables.find(viewable)?.kind ??
    deliverables[0]?.kind ??
    null;

  const shownItem = deliverables.find((i) => i.kind === shown) ?? null;

  // The 3D tab's model: this product's own parts on its own board in its own
  // enclosure. Only the primary has a concept mesh (the job generates one),
  // so only its shell can take that shape.
  const isPrimary = product.id === "primary";
  const assembly = React.useMemo(
    () =>
      deriveAssembly({
        title: product.title,
        parts: product.parts,
        spec: product.spec,
        meshUrl: isPrimary ? job.modelGlbUrl : undefined,
      }),
    [product.title, product.parts, product.spec, isPrimary, job.modelGlbUrl],
  );
  const shellNote = !isPrimary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;
  const showModel = shown === "3d" && shownItem?.status === "ready";

  // The project this build already belongs to (holderOf: its projectId, or
  // a project whose builds name it — a save whose builds-store write failed
  // still reads as saved, so a reload never offers Save again). A stored id
  // whose project is gone reads as unsaved, so the footer can't point at a
  // project that isn't in this browser any more.
  const saved = saveInfo?.mode.kind === "saved" ? saveInfo.mode.project : null;
  const savedVersion = React.useMemo(
    () => (saved ? (buildsOf(saved, builds).find((r) => r.buildId === job.id)?.version ?? null) : null),
    [saved, job, builds],
  );

  // What the card is about. The project the maker named, which is what the
  // rail beside it already calls this work; then the project it was saved
  // into; then the primary product, for a build that has neither.
  const heading =
    projectName?.trim() ||
    saved?.name ||
    job.projectChoiceName?.trim() ||
    job.title;

  // Open project navigates to a route whose payload has to be fetched, so
  // the press is followed by a pause with nothing in it — the press has to
  // say so or it reads as a click that missed. Never cleared: the navigation
  // unmounts this surface.
  const [leaving, setLeaving] = React.useState(false);
  const openProject = React.useCallback(() => {
    if (!saved) return;
    setLeaving(true);
    router.push(`/projects/${saved.id}`);
  }, [saved, router]);

  // The save step (P2-SAVE-2). A build that stops being ready while it's open
  // (a piece retried) closes it; what was typed is kept in the step's draft.
  const [stepOpen, setStepOpen] = React.useState(false);
  if (building && stepOpen) setStepOpen(false);
  const unsaved = !building && saveInfo !== null && saveInfo.mode.kind !== "saved";

  // `?save=1` (P2-SAVE-13): the Brief's address for a build with no project
  // lands here and opens the step once; the parameter goes at once, so a
  // reload or Back never opens it again.
  const wantsSave = query.get("save") === "1";
  const openFromLink = React.useEffectEvent((open: boolean) => {
    if (open) setStepOpen(true);
    const rest = new URLSearchParams(query.toString());
    rest.delete("save");
    const qs = rest.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  });
  React.useEffect(() => {
    // Wait while it builds; a saved build has nothing to open.
    if (!wantsSave || building || saveInfo === null) return;
    const frame = window.requestAnimationFrame(() => openFromLink(unsaved));
    return () => window.cancelAnimationFrame(frame);
  }, [wantsSave, building, saveInfo, unsaved]);

  // Every product's pieces, for the footer's count.
  const pieceCount = React.useMemo(
    () =>
      products.reduce(
        (n, x) => n + x.items.filter((i) => i.status !== "skipped").length,
        0,
      ),
    [products],
  );

  // The review lays out by its own width, not the window's: beside a docked
  // spec sheet a 1440 px window leaves it about 340 px, where the window's
  // `md:` still gave the aside its 260 px and the artifact the few left. So
  // the card is the container, and its two columns and its header row wait
  // for room of their own.
  return (
    <section
      aria-labelledby="review-heading"
      className="overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface [container-type:inline-size]"
    >
      {/* The eyebrow carries the state and the heading carries the subject.
          It used to spend the heading on "Review your deliverables", which
          describes the surface the maker is already looking at — the tabs,
          the panels and the footer all say that — while the one thing the
          card could not tell you was which project this is. */}
      {/* The state and the subject in one line of hierarchy: a small state
          word, then the project. The actions stay beside the heading at any
          width the card is given — the issue list renders as its own
          full-width row below this header instead (L1), rather than
          widening this left column and pushing the actions onto a row of
          their own. */}
      <header className="flex flex-col gap-6 px-10 pb-6 pt-8 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-tertiary">
            {building ? "Building" : "Build ready"}
          </p>
          <h2
            id="review-heading"
            className="mt-1 truncate text-xl font-bold tracking-tight text-text-primary"
          >
            {heading}
          </h2>
          {/* §4.3 + §4.4.9 — the product's own tier. The list this opens is
              rendered below the whole header (L1), controlled from here so
              switching products closes it rather than carrying it open onto
              another product's issues. */}
          <div className="mt-4">
            <ConfidenceBadge
              confidence={productConfidence}
              open={issuesOpen}
              onOpenChange={setIssuesOpen}
            />
          </div>
        </div>

        {/* What this project could become next. A tier below the footer's
            Save Project, so quiet. Create Mobile App has no engine behind it
            yet and says so on the control, where a pointer, a keyboard and a
            touch screen all reach it. The network is worked out at the concept
            stage, in the rail's Network section. */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <HeaderAction icon={MobileProgramming01Icon} label="Create Mobile App" />
        </div>
      </header>

      {/* L1 — full width under the header row, not squeezed beside the
          actions above: grouped issues, passes and the credit note need
          more than the ~150 px the header's left column left them. */}
      {issuesOpen && productConfidence.tier === "draft" && (
        <div className="px-10 pb-6">
          <ConfidenceIssuesPanel confidence={productConfidence} />
        </div>
      )}

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
              onKeyDown={(e) =>
                moveTab(
                  e,
                  products.map((x) => x.id),
                  product.id,
                  (id) => {
                    setProductId(id);
                    setPicked(null);
                  },
                )
              }
              className="mx-10 mb-4 flex flex-wrap items-center gap-2 border-b border-solid border-border pb-4"
            >
              {products.map((x) => {
                const on = x.id === product.id;
                return (
                  <button
                    key={x.id}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    aria-controls="review-tabpanel"
                    tabIndex={on ? 0 : -1}
                    data-tab={x.id}
                    onClick={() => {
                      setProductId(x.id);
                      setPicked(null);
                    }}
                    className={[
                      "inline-flex h-[36px] items-center rounded-lg px-5 text-md font-semibold outline-none transition-colors duration-fast",
                      "focus-visible:ring-2 focus-visible:ring-border-focus",
                      on
                        ? "bg-bg-subtle text-text-primary"
                        : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
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
            onKeyDown={(e) =>
              shown &&
              moveTab(
                e,
                deliverables.map((i) => i.kind),
                shown,
                (kind) => setPicked(kind as BuildItemKind),
              )
            }
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
                  tabIndex={isActive ? 0 : -1}
                  data-tab={item.kind}
                  onClick={() => setPicked(item.kind)}
                  className={[
                    "inline-flex h-[36px] items-center rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-fast",
                    "focus-visible:ring-2 focus-visible:ring-border-focus",
                    isActive
                      ? "bg-bg-brand-subtle text-text-brand"
                      : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                  ].join(" ")}
                >
                  {ITEM_LABELS[item.kind]}
                </button>
              );
            })}
          </div>

          {showModel ? (
            // The model carries its own rail — the model, its systems, what
            // ships — so it takes the whole width instead of sitting beside
            // the aside.
            <div
              id="review-tabpanel"
              role="tabpanel"
              aria-labelledby={`review-tab-${shown}`}
              className="px-10 pb-10"
            >
              <ModelPanelLazy
                key={product.id}
                assembly={assembly}
                shellNote={shellNote}
                onRetryMesh={() => setBuildModelFailed(job.id, false)}
              />
            </div>
          ) : (
          <div
            id="review-tabpanel"
            role="tabpanel"
            aria-labelledby={`review-tab-${shown}`}
            // Two columns once the artifact keeps 300 px beside the aside's
            // 260 — 640 with the padding and the gap; under that the aside
            // stacks below the artifact, full width.
            className="grid gap-8 px-10 pb-10 [@container(min-width:640px)]:grid-cols-[minmax(0,1fr)_260px]"
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
                      ? job.failure === "system"
                        ? "This piece didn't run"
                        : "This piece couldn't be generated"
                      : shownItem.status === "building"
                        ? `Generating · ${Math.round(shownItem.progress)}%`
                        : "Waiting to start"}
                  </p>
                  <p className="max-w-[40ch] text-sm text-text-tertiary">
                    {shownItem.status === "failed"
                      ? job.failure === "system"
                        ? "The whole build stopped on our side — try it again from the panel beside the chat."
                        : "The other pieces are unaffected. Retrying costs no extra credits."
                      : "It appears here the moment it lands."}
                  </p>
                  {shownItem.status === "failed" && job.failure !== "system" && (
                    <button
                      type="button"
                      onClick={() =>
                        retryBuildItem(job.id, shownItem.kind, product.id)
                      }
                      className="mt-[4px] inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Icon icon={Refresh01Icon} size={16} />
                      Retry {ITEM_LABELS[shownItem.kind]}
                    </button>
                  )}
                </div>
              ) : (
                <DeliverablePanel kind={shown} product={product} />
              )}
            </div>
            {/* Beside the artifact, not a second card inside this one: a
                hairline divides the two columns, and the list is a list — the
                check-mark pills read as "verified" and wrapped inside
                themselves. */}
            <aside className="flex flex-col gap-8 [@container(min-width:640px)]:border-l [@container(min-width:640px)]:border-solid [@container(min-width:640px)]:border-border [@container(min-width:640px)]:pl-8">
              {shown === "parts" && <PartsSummary job={product} />}
              <section>
                <h3 className="text-sm font-semibold text-text-primary">
                  What this covers
                </h3>
                <ul role="list" className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-text-secondary marker:text-text-tertiary">
                  {coversFor(
                    shown,
                    product,
                    isSampleModel(job.modelGlbUrl),
                    product.id !== "primary",
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
          )}

          {!building && saveInfo && (
          <footer className="flex flex-wrap items-center justify-between gap-8 border-t border-solid border-border px-10 py-8">
            {/* One live region for both states, mounted with the footer: a
                region that appears already holding its words isn't read,
                so the save is said when this same element's text changes.
                Saved, the name is plain text — the button beside it goes
                to the same place (P2-SAVE-10). */}
            <p role="status" className="inline-flex items-center gap-4 text-sm text-text-secondary">
              {saved ? (
                <>
                  <Icon
                    icon={CheckmarkCircle02Icon}
                    size={16}
                    className="shrink-0 text-text-success"
                  />
                  <span>
                    Saved to <strong className="font-semibold text-text-primary">{saved.name}</strong>
                    {savedVersion != null ? ` as version ${savedVersion}.` : "."}
                  </span>
                </>
              ) : (
                <span>{footerLineOf(saveInfo.mode, pieceCount)}</span>
              )}
            </p>
            {saved ? (
              <LeaveButton
                id={REVIEW_PRIMARY_ID}
                tone="primary"
                busy={leaving}
                blocked={leaving}
                onClick={openProject}
                icon={ArrowRight02Icon}
              >
                Open project
              </LeaveButton>
            ) : (
              <button
                id={REVIEW_PRIMARY_ID}
                type="button"
                aria-haspopup="dialog"
                onClick={() => setStepOpen(true)}
                className="inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg bg-bg-brand px-8 text-md font-semibold text-text-on-brand outline-none ring-offset-bg-surface transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
              >
                <Icon icon={FloppyDiskIcon} size={18} />
                Save Project
              </button>
            )}
          </footer>
          )}
        </>
      )}
      {saveInfo && (
        // Opened only on an unsaved build, then kept open through its own
        // save: the build reads as saved a render before the write settles.
        <SaveStep open={stepOpen && !building} job={job} info={saveInfo} onClose={() => setStepOpen(false)} />
      )}
    </section>
  );
}

function DeliverablePanel({
  kind,
  product,
}: {
  kind: BuildItemKind;
  /** The product being reviewed — the primary, or one of its companions
   *  (§4.7). Every artifact below is derived from this product's own
   *  parts, so a remote's BOM is the remote's. */
  product: ArtifactSource;
}) {
  if (kind === "pcb") return <PcbPreview job={product} />;
  if (kind === "code") return <FirmwarePreview job={product} />;
  if (kind === "wiring") return <WiringPreview job={product} />;
  if (kind === "parts") return <PartsPreview job={product} />;
  // The 3D tab is the model panel, which takes this panel's place above.
  return null;
}

/** A next step this project could take, offered from the card's own header.
 *  Quiet by design: the footer's Save Project is the decision this surface
 *  exists to take, and a second solid button beside the heading would argue
 *  with it. Disabled with its reason while there is no engine behind it —
 *  the convention this app uses everywhere rather than accepting a press
 *  and doing nothing with it. */
function HeaderAction({ icon, label }: { icon: IconValue; label: string }) {
  const reason = `${label} isn't built yet`;
  // Focusable, so the reason is reachable from the keyboard — a disabled
  // button takes no focus and its title reaches nobody but a mouse.
  return (
    <button
      type="button"
      aria-disabled="true"
      title={reason}
      aria-label={`${label} — ${reason}`}
      onClick={(e) => e.preventDefault()}
      className="inline-flex h-[36px] cursor-not-allowed items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-semibold text-text-disabled outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={icon} size={16} />
      {label}
      <span className="text-xs font-medium text-text-tertiary">Soon</span>
    </button>
  );
}
