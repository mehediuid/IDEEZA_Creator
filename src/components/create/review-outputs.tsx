"use client";

// ReviewOutputs — the last view of a build (Ai-Flow frames 15 / DL-02 /
// DL-03 / Wiring / Parts). One pill tab per deliverable the build really
// produced, the artifact itself on the left, what ships with it on the
// right, and the two things a finished build can become:
//
//   • Save Project  — the build becomes a ManualProject, listed under
//                     My projects.
//   • Advance Edit  — the same project, opened straight in the PCB
//                     editor.
//
// One project per build: both routes go through `projectFromBuild`, so
// pressing either twice reuses the project rather than making a second
// one. What happens to the design after that — private, community,
// marketplace — is the Brief module's step, not this surface's.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckmarkCircle02Icon,
  FloppyDiskIcon,
  HelpCircleIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ModelViewer } from "@/components/3d/model-viewer";
import {
  ITEM_LABELS,
  ITEM_KINDS,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import { stepHref, useManualProjects } from "@/lib/manual/projects";
import {
  FirmwarePreview,
  PartsPreview,
  PartsSummary,
  PcbPreview,
  WHAT_SHIPS,
  WiringPreview,
} from "./deliverable-previews";

export function ReviewOutputs({ job }: { job: BuildJob }) {
  // The panel reads `?tab=` for a deep link (a project card links
  // straight at its parts list), which needs a boundary so the route can
  // still be pre-rendered. The build view only renders once the store
  // has hydrated in the browser, so the fallback is never seen.
  return (
    <React.Suspense fallback={null}>
      <ReviewPanel job={job} />
    </React.Suspense>
  );
}

function ReviewPanel({ job }: { job: BuildJob }) {
  const router = useRouter();
  const query = useSearchParams();
  const { setBuildProject } = useCreateHistory();
  const { projectFromBuild, selectProject } = useManualProjects();

  // An artifact an older build never produced has nothing to review, so
  // it gets no tab — a deliverable panel for something that was never
  // made would be a lie.
  const deliverables = React.useMemo(
    () => job.items.filter((i) => i.status !== "skipped"),
    [job.items],
  );

  const [picked, setPicked] = React.useState<BuildItemKind | null>(null);
  const linked = query.get("tab");
  const wanted = picked ?? ITEM_KINDS.find((k) => k === linked) ?? null;
  // Falls back to the first real deliverable when the link (or a job
  // whose items changed underneath) names one this build doesn't have.
  const shown =
    deliverables.find((i) => i.kind === wanted)?.kind ??
    deliverables[0]?.kind ??
    null;

  // The project this build becomes — created on the first press and
  // handed back on every one after it, so Save Project and Advance Edit
  // are two doors into one project rather than two projects.
  const ensureProject = React.useCallback(() => {
    const project = projectFromBuild(job);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
    return project;
  }, [job, projectFromBuild, setBuildProject]);

  return (
    <section
      aria-labelledby="review-heading"
      className="overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface"
    >
      <header className="px-10 pb-6 pt-8">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-brand">
          Build ready
        </p>
        <h2
          id="review-heading"
          className="mt-1 text-xl font-bold tracking-tight text-text-primary"
        >
          Review your deliverables
        </h2>
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
              <DeliverablePanel kind={shown} job={job} />
            </div>
            <aside className="flex flex-col gap-8 rounded-xl border border-solid border-border bg-bg-surface p-8">
              {shown === "parts" && <PartsSummary job={job} />}
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

          <footer className="flex flex-wrap items-center justify-between gap-8 border-t border-solid border-border px-10 py-8">
            <p className="text-sm text-text-secondary">
              {deliverables.length === ITEM_KINDS.length
                ? "All five pieces are ready. Choose what happens to this build next."
                : "Every piece this build made is ready. Choose what happens to this build next."}
            </p>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  ensureProject();
                  router.push("/projects");
                }}
                className="inline-flex h-[40px] items-center gap-4 rounded-lg bg-bg-brand px-8 text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={FloppyDiskIcon} size={18} />
                Save Project
              </button>
              <button
                type="button"
                onClick={() => {
                  const project = ensureProject();
                  // The editor pages work on the active project, so it
                  // has to be this one before we land there.
                  selectProject(project.id);
                  router.push(stepHref(project, "pcb"));
                }}
                className="inline-flex h-[40px] items-center gap-4 rounded-lg border border-solid border-border bg-bg-surface px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={PencilEdit02Icon} size={18} />
                Advance Edit
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function DeliverablePanel({
  kind,
  job,
}: {
  kind: BuildItemKind;
  job: BuildJob;
}) {
  if (kind === "pcb") return <PcbPreview job={job} />;
  if (kind === "code") return <FirmwarePreview job={job} />;
  if (kind === "wiring") return <WiringPreview job={job} />;
  if (kind === "parts") return <PartsPreview job={job} />;
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
