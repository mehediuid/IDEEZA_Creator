"use client";

// SaveStep — the name and details step before Save (owner decision 5;
// P2-SAVE-2…7, 15, 16). One dialog, three modes, from `saveModeOf`:
//
// - new: "Save project" asks the project's name and description (the shared
//   ProjectDetailsFields, with "Update with AI" on a multi-product build) and,
//   when the build has two or more images, its first cover. A single-product
//   build with no lineage can switch to join instead.
// - join: "Add to {project}" — the project the setup question chose. It asks
//   nothing; Change swaps the project, or goes back to a new one.
// - version: "Save version {n}" — a rebuild of a chat already saved (O2 makes
//   it binding): the project, what changes, and nothing to type.
//
// The lock (decision 12) and the listing (P2-LISTING-13) sit in front of the
// two modes that change an existing project (P2-SAVE-5/6 as changed):
// - a project sold in full takes nothing: it is never offered to join, and a
//   rebuild of it saves as a new project, with saveBlockOf's line;
// - a live Buy-now listing asks the pause confirm first
//   (useProjectEditGate's guard); a running auction refuses, with its reason.
//
// Saving writes ONE record (the provider's saveBuild), waits for the store's
// write to settle (useStoreWrite: 250 ms, projectWriteRefused), and only then
// records the build's project, clears the draft and goes to the project page
// with `?saved=` (P2-SAVE-9). A refused write reverts the list — and puts back
// a listing the pause confirm paused for it — and keeps the dialog open with
// its text. What the maker typed is kept per build, in memory, until a save
// or a reload.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, ModalFrame, Radio, SelectMenu } from "@/components/ideeza";
import {
  ProjectDetailsFields,
  type DetailsField,
  type ProjectDetailsFieldsHandle,
} from "@/components/projects/project-details-fields";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { useProjectEditGate } from "@/components/projects/use-edit-gate";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { useCreateHistory, type BuildJob } from "@/lib/create/history";
import { lockOf } from "@/lib/manual/edit-gate";
import { ownershipOf } from "@/lib/manual/ownership";
import { can } from "@/lib/manual/permissions";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { formatShortDate, projectStatus } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject, type SaveInput } from "@/lib/manual/projects";
import {
  checkSaveDraft,
  coverChoicesOf,
  describedProductsOf,
  holderOf,
  mintNoticeOf,
  saveBlockOf,
  saveDefaultsOf,
  saveModeOf,
  versionChangesOf,
  type CoverChoice,
  type SaveDefaults,
  type SaveDraft,
  type SaveMode,
} from "@/lib/manual/save-step";
import { listingViewOf } from "@/lib/market/listing";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { mainSalesOf } from "@/lib/market/sales";
import type { Listing, ListingMetadata, MarketData } from "@/lib/market/types";
import type { ProjectLock } from "@/lib/manual/p2-types";
import { cn } from "@/lib/utils";

// ─────────────────────────── the mode, with the lock applied ───────────────────────────

export type SaveModeInfo = {
  /** The save this build gets. A version or join into a project sold in full reads as new. */
  mode: SaveMode;
  /** The OTHER builds of the build's chat. */
  lineage: BuildJob[];
  /** Why a version or join became new: saveBlockOf's line (decision 12). */
  broken: string | null;
};

const OWNER = { kind: "local-owner" } as const;

/** The lock a project is under, from the market's sales alone (decision 12).
 *  Every chooser that offers existing projects leaves a locked one out. */
export function lockOfProject(p: ManualProject, market: MarketData): ProjectLock | null {
  const sales = mainSalesOf(p.id, market.sales);
  if (!sales.length) return null;
  const split = ownershipOf({ createdAt: p.createdAt, contributors: p.contributors ?? [], sales, listedPercent: 0 });
  return lockOf(split, sales);
}

/** The projects a build may join: `can(owner, "product.add")` under each one's lock (P2-SAVE-5 as changed). */
function joinableOf(projects: readonly ManualProject[], market: MarketData): ManualProject[] {
  return projects.filter((p) => can(OWNER, "product.add", { locked: lockOfProject(p, market) !== null }));
}

/**
 * Which save `job` gets — the review footer, the rail's sentence and the
 * dialog all read this one answer. Null for no build.
 */
export function useSaveMode(job: BuildJob | null): SaveModeInfo | null {
  const { projects } = useManualProjects();
  const { builds, chats } = useCreateHistory();
  const { data: market } = useMarket();
  const chatId = job?.chatId;
  const jobId = job?.id;
  const lineage = React.useMemo(
    () => (chatId ? builds.filter((b) => b.chatId === chatId && b.id !== jobId) : []),
    [builds, chatId, jobId],
  );
  return React.useMemo(() => {
    if (!job) return null;
    const base = saveModeOf(job, lineage, projects, builds, chats);
    const joinable = joinableOf(projects, market);
    const single = (job.companions?.length ?? 0) === 0;
    if (base.kind === "version" || base.kind === "join") {
      const lock = lockOfProject(base.project, market);
      if (lock) {
        // The link to that project is broken for this build: it saves as a new one.
        const block = saveBlockOf(base, { kind: "locked", reason: lock.line });
        const canJoin = base.kind === "join" && single && joinable.length > 0;
        return { mode: { kind: "new", choiceGone: false, canJoin }, lineage, broken: block?.reason ?? null };
      }
    }
    if (base.kind === "new" && base.canJoin && joinable.length === 0) {
      return { mode: { ...base, canJoin: false }, lineage, broken: null };
    }
    return { mode: base, lineage, broken: null };
  }, [job, lineage, projects, builds, chats, market]);
}

/**
 * Puts back each of `before` (the project's live listings as the save was
 * pressed) that reads paused now — the pause the confirm wrote for a save
 * that was then refused. False when that write is refused too.
 */
function unpauseOf(before: readonly Listing[], write: (next: Listing[]) => { ok: boolean }): boolean {
  if (!before.length) return true;
  const was = new Map(before.map((l) => [l.id, l]));
  const now = readMarketNow().listings;
  if (!now.some((l) => was.has(l.id) && l.status === "paused")) return true;
  return write(now.map((l) => (l.status === "paused" ? (was.get(l.id) ?? l) : l))).ok;
}

// ─────────────────────────── the draft ───────────────────────────

/** What the maker typed, per build, until a save or a reload (P2-SAVE-2). */
const DRAFTS = new Map<string, SaveDraft>();

function initialDraft(mode: SaveMode, defaults: SaveDefaults): SaveDraft {
  return {
    mode: mode.kind === "join" ? "join" : "new",
    name: defaults.name,
    description: defaults.description,
    coverProductId: defaults.coverProductId,
    joinId: mode.kind === "join" ? mode.project.id : null,
  };
}

const NEW_PROJECT = "__new__";
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
/** Every control in the dialog is at least 44 px tall: the dialog is always under 640 px wide (P2-SAVE-16). */
const TOUCH = "min-h-[var(--touch-min)]";
const QUIET_TEXT_BUTTON =
  "inline-flex min-h-[var(--touch-min)] items-center self-start rounded-sm text-md font-semibold text-text-secondary underline decoration-dotted underline-offset-4 outline-none transition-colors duration-normal ease-decelerate hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

function productCount(p: ManualProject): number {
  return p.products?.length || 1;
}

function countLabel(n: number): string {
  return `${n} product${n === 1 ? "" : "s"}`;
}

// ─────────────────────────── the dialog ───────────────────────────

export function SaveStep({
  open,
  job,
  info,
  onClose,
}: {
  open: boolean;
  job: BuildJob;
  info: SaveModeInfo;
  onClose: () => void;
}) {
  if (!open) return null;
  return <SaveDialog job={job} info={info} onClose={onClose} />;
}

function SaveDialog({ job, info: infoProp, onClose }: { job: BuildJob; info: SaveModeInfo; onClose: () => void }) {
  const router = useRouter();
  const { projects, saveBuild } = useManualProjects();
  const { builds, setBuildProject } = useCreateHistory();
  const { data: market, writeListings } = useMarket();
  // The mode as the dialog opened: the save itself makes the build "saved" a
  // render before it settles, and the dialog must not change under it. The
  // one change it takes is the lock: a sale in another tab that sells the
  // target in full turns the version or join into a new project, with why.
  const [info, setInfo] = React.useState(infoProp);
  const [now] = React.useState(() => Date.now());
  const defaults = React.useMemo(() => saveDefaultsOf(job), [job]);
  const single = (job.companions?.length ?? 0) === 0;

  const [draft, setDraft] = React.useState<SaveDraft>(() => DRAFTS.get(job.id) ?? initialDraft(info.mode, defaults));
  React.useEffect(() => {
    DRAFTS.set(job.id, draft);
  }, [job.id, draft]);
  const patch = (p: Partial<SaveDraft>) => setDraft((d) => ({ ...d, ...p }));

  // "That project isn't in this browser any more." — a join or version target
  // gone at submit (P2-SAVE-15): the dialog goes on in new mode.
  const [gone, setGone] = React.useState<string | null>(null);
  const joinable = React.useMemo(() => joinableOf(projects, market), [projects, market]);
  const version = !gone && info.mode.kind === "version" ? info.mode : null;
  const joining = !version && !gone && draft.mode === "join";
  const joinTarget = joining && draft.joinId ? (joinable.find((p) => p.id === draft.joinId) ?? null) : null;
  const kind: "new" | "join" | "version" = version ? "version" : joining ? "join" : "new";
  const target: ManualProject | null = version?.project ?? joinTarget;
  const canJoin =
    single && (info.mode.kind === "new" ? info.mode.canJoin : info.mode.kind === "join") && joinable.length > 0;

  // The Change chooser. Open when join mode has no project yet.
  const [changing, setChanging] = React.useState(false);
  const choosing = kind === "join" && (changing || !joinTarget);

  const gate = useProjectEditGate(kind === "new" ? null : (target?.id ?? null));
  const blocked = kind !== "new" && target ? gate.reasonOf("addProduct") : null;
  const confirming = React.isValidElement<{ open?: boolean }>(gate.dialog) && gate.dialog.props.open === true;

  const brief = useProjectBrief(target?.id ?? "");
  const status = target
    ? projectStatus(target, brief ?? null, {
        listing: listingViewOf(target.id, { ...market, now, current: NO_METADATA }),
        sales: market.sales,
      })
    : "draft";
  const mintLine =
    target && kind !== "new" ? mintNoticeOf(status, target.name, kind === "version" ? "version" : "product") : null;

  // ── fields ──
  const fieldsRef = React.useRef<ProjectDetailsFieldsHandle>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const primaryRef = React.useRef<HTMLButtonElement>(null);
  const changeRef = React.useRef<HTMLButtonElement>(null);
  const chooserRef = React.useRef<HTMLDivElement>(null);
  const alertRef = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState<Record<DetailsField, boolean>>({ name: false, description: false });
  const otherNames = React.useMemo(() => projects.map((p) => p.name), [projects]);
  const aiProducts = React.useMemo(() => describedProductsOf(job), [job]);
  const choices = React.useMemo(() => coverChoicesOf(job), [job]);

  // ── saving ──
  const busy = React.useRef(false);
  const [pending, setPending] = React.useState<{ projectId: string; revert: () => void; unpause: () => boolean } | null>(null);
  const [storageFull, setStorageFull] = React.useState(false);
  const [stillPaused, setStillPaused] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const applied = pending !== null && holderOf(job, projects)?.id === pending.projectId;
  const write = useStoreWrite(applied, () => {
    if (!pending) return;
    // The write held: now the build names its project, and the draft is done.
    if (job.projectId !== pending.projectId) setBuildProject(job.id, pending.projectId);
    DRAFTS.delete(job.id);
    router.push(`/projects/${pending.projectId}?saved=${encodeURIComponent(job.id)}`);
  });
  const saving = pending !== null || write.saving;

  if (infoProp.broken !== null && info.broken === null && !saving) {
    setInfo(infoProp);
    setDraft((d) => ({ ...d, mode: "new", joinId: null }));
    setChanging(false);
  }

  // Storage full (P2-SAVE-15): the list goes back as it was, the text stays,
  // and the banner takes the focus.
  const onRefused = React.useEffectEvent(() => {
    if (!pending) return;
    pending.revert();
    setStillPaused(!pending.unpause());
    setPending(null);
    busy.current = false;
    setStorageFull(true);
    window.requestAnimationFrame(() => alertRef.current?.focus());
  });
  React.useEffect(() => {
    if (!write.failed) return;
    // Next frame: the revert writes the provider's list, not this dialog's.
    const frame = window.requestAnimationFrame(() => onRefused());
    return () => window.cancelAnimationFrame(frame);
  }, [write.failed]);

  // New mode opens on the name with its text selected (P2-SAVE-2); the frame
  // has focused it the frame before.
  const selectName = React.useEffectEvent(() => {
    if (kind === "new") nameRef.current?.select();
  });
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => selectName());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const commit = (input: SaveInput, unpause: () => boolean = () => true) => {
    busy.current = true;
    setStorageFull(false);
    setStillPaused(false);
    write.start();
    const result = saveBuild(job, info.lineage, input);
    if (!result) {
      write.reset();
      busy.current = false;
      setGone("That project isn't in this browser any more.");
      patch({ mode: "new", joinId: null });
      window.requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    setPending({ projectId: result.project.id, revert: result.revert, unpause });
  };

  const submit = () => {
    if (busy.current || saving) return;
    setRefusal(null);
    if (kind === "new") {
      const check = checkSaveDraft(draft, otherNames);
      if (!check.ok) {
        setShown({ name: true, description: true });
        window.requestAnimationFrame(() => fieldsRef.current?.focusFirstInvalid());
        return;
      }
      const picked = draft.coverProductId;
      const cover =
        picked !== "primary" && choices.some((c) => c.productId === picked)
          ? { buildId: job.id, productId: picked }
          : null;
      commit({ kind: "new", name: check.name.value, description: check.description.value, cover });
      return;
    }
    if (!target) {
      setRefusal("Pick the project this product joins.");
      return;
    }
    if (blocked) {
      setRefusal(blocked);
      return;
    }
    const input: SaveInput =
      kind === "version" ? { kind: "version", projectId: target.id } : { kind: "join", projectId: target.id };
    // A live Buy-now listing is paused before the save runs; a refused save puts it back.
    const live = readMarketNow().listings.filter((l) => l.projectId === target.id && l.status === "live");
    const outcome = gate.guard("addProduct", () => commit(input, () => unpauseOf(live, writeListings)));
    if (outcome.kind === "refused") setRefusal(outcome.reason);
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  // ── copy ──
  const product = job.title.trim();
  const n = version?.version ?? 0;
  const title =
    kind === "new" ? "Save project" : kind === "version" ? `Save version ${n}` : joinTarget ? `Add to ${joinTarget.name}` : "Add to a project";
  const description =
    kind === "new"
      ? "Name it and say what it's for. You can change both later on the project page."
      : kind === "version" && version
        ? `This is a rebuild in the chat “${version.chatTitle}”, so it becomes version ${n} of ${version.project.name}. Version ${n - 1} stays in the project's history.`
        : joinTarget
          ? `${product} joins ${joinTarget.name} as a new product. The project's name and description stay as they are.`
          : `Pick the project ${product} joins. Its name and description stay as they are.`;
  const primaryLabel = kind === "new" ? "Save Project" : kind === "version" ? `Save version ${n}` : "Add to project";
  const reason = refusal ?? blocked;
  const reasonId = React.useId();

  const changes = React.useMemo(
    () => (version ? versionChangesOf(version.project, job, info.lineage, builds, [], now) : null),
    [version, job, info.lineage, builds, now],
  );

  const pickProject = (v: string) => {
    setRefusal(null);
    setChanging(false);
    if (v === NEW_PROJECT) {
      patch({ mode: "new", joinId: null });
      window.requestAnimationFrame(() => fieldsRef.current?.focusName());
      return;
    }
    patch({ mode: "join", joinId: v });
    window.requestAnimationFrame(() => changeRef.current?.focus());
  };

  return (
    <>
      <ModalFrame
        open
        onClose={close}
        size="sm"
        covered={confirming}
        title={title}
        description={description}
        initialFocus={kind === "new" ? nameRef : primaryRef}
        footer={
          // The footer's own width. ModalFrame "sm" is ~446 px here, not the
          // Figma's 536, so the spec's "under 480 px" is read as the phone
          // case: a footer under 360 px (a dialog under ~400 px) stacks
          // Cancel and the primary full width, the primary last (P2-SAVE-2).
          <div className="w-full [container-type:inline-size]">
            <div className="flex flex-col gap-4 [@container(min-width:360px)]:flex-row [@container(min-width:360px)]:items-center [@container(min-width:360px)]:justify-end">
              <Button
                type="button"
                hierarchy="secondary"
                size="lg"
                onClick={close}
                aria-disabled={saving || undefined}
                className={cn(TOUCH, "w-full [@container(min-width:360px)]:w-auto")}
              >
                Cancel
              </Button>
              <Button
                ref={primaryRef}
                type="button"
                hierarchy="primary"
                size="lg"
                onClick={submit}
                aria-busy={saving || undefined}
                aria-disabled={saving || blocked !== null || undefined}
                aria-describedby={reason ? reasonId : undefined}
                className={cn(
                  TOUCH,
                  "w-full [@container(min-width:360px)]:w-auto",
                  blocked !== null && "cursor-not-allowed opacity-60",
                  saving && "cursor-wait",
                )}
              >
                {saving ? (
                  <>
                    <span aria-hidden className="inline-flex motion-safe:animate-spin">
                      <Icon icon={Loading03Icon} size={16} />
                    </span>
                    Saving…
                  </>
                ) : (
                  primaryLabel
                )}
              </Button>
            </div>
            {reason && (
              <p id={reasonId} className="mt-3 text-sm text-text-secondary [@container(min-width:360px)]:text-right">
                {reason}
              </p>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-10 [container-type:inline-size]">
          {gone && <Banner tone="attention">{gone}</Banner>}
          {kind === "new" && info.broken && <Banner tone="attention">{info.broken}</Banner>}

          {kind === "new" && (
            <>
              <ProjectDetailsFields
                ref={fieldsRef}
                nameRef={nameRef}
                name={draft.name}
                description={draft.description}
                onNameChange={(v) => patch({ name: v })}
                onDescriptionChange={(v) => patch({ description: v })}
                otherNames={otherNames}
                shown={shown}
                onShow={(f) => setShown((s) => (s[f] ? s : { ...s, [f]: true }))}
                onSubmit={submit}
                aiProducts={aiProducts}
                afterName={
                  canJoin ? (
                    <button
                      type="button"
                      className={QUIET_TEXT_BUTTON}
                      onClick={() => {
                        setRefusal(null);
                        // The project that went is out of the list; the maker picks another.
                        setGone(null);
                        patch({ mode: "join", joinId: null });
                        setChanging(true);
                        window.requestAnimationFrame(() =>
                          chooserRef.current?.querySelector<HTMLElement>("button")?.focus(),
                        );
                      }}
                    >
                      Add it to a project you already have instead
                    </button>
                  ) : null
                }
              />
              {choices.length >= 2 && (
                <CoverPicker
                  choices={choices}
                  value={choices.some((c) => c.productId === draft.coverProductId) ? draft.coverProductId : choices[0].productId}
                  onChange={(id) => patch({ coverProductId: id })}
                />
              )}
            </>
          )}

          {kind === "join" &&
            (choosing ? (
              <div ref={chooserRef}>
                <SelectMenu
                  label="Project"
                  placeholder="Choose a project"
                  value={joinTarget?.id ?? null}
                  onChange={pickProject}
                  options={[
                    { value: NEW_PROJECT, label: "+ New project", sub: "This product becomes its first." },
                    ...joinable.map((p) => ({
                      value: p.id,
                      label: p.name,
                      sub: `${countLabel(productCount(p))} · updated ${formatShortDate(p.updatedAt, now)}`,
                      section: "Your projects",
                    })),
                  ]}
                />
              </div>
            ) : joinTarget ? (
              <ProjectRow
                project={joinTarget}
                cover={coverOf(joinTarget, buildsOf(joinTarget, builds))}
                meta={`${countLabel(productCount(joinTarget))} · updated ${formatShortDate(joinTarget.updatedAt, now)}`}
                action={
                  <Button
                    ref={changeRef}
                    type="button"
                    hierarchy="ghost"
                    size="md"
                    onClick={() => {
                      setChanging(true);
                      window.requestAnimationFrame(() =>
                        chooserRef.current?.querySelector<HTMLElement>("button")?.focus(),
                      );
                    }}
                    className={TOUCH}
                  >
                    Change
                  </Button>
                }
              />
            ) : null)}

          {kind === "version" && version && (
            <>
              <ProjectRow
                project={version.project}
                cover={coverOf(version.project, buildsOf(version.project, builds))}
                meta={`Version ${n - 1} → ${n}`}
              />
              {changes && <VersionChanges changes={changes} previous={n - 1} />}
              <p className="text-sm text-text-secondary">
                The name stays {version.project.name}. Rename it on the project page.
              </p>
            </>
          )}

          {mintLine && <p className="text-sm text-text-secondary">{mintLine}</p>}

          {storageFull && (
            <div
              ref={alertRef}
              role="alert"
              tabIndex={-1}
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Banner tone="error" title="This browser's storage is full">
                The project wasn&apos;t saved. Your text is kept here until you reload. Delete a project you no
                longer need, then save again.
                {stillPaused && " Its listing stayed paused: relist it from the project's Marketplace block."}
              </Banner>
            </div>
          )}
        </div>
      </ModalFrame>
      {gate.dialog}
    </>
  );
}

// ─────────────────────────── pieces ───────────────────────────

/** The project a join or a version goes into: its cover (the box reserved), name and one fact. */
function ProjectRow({
  project,
  cover,
  meta,
  action,
}: {
  project: ManualProject;
  cover: string | null;
  meta: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-solid border-border px-6 py-5">
      <div className="size-[48px] shrink-0 overflow-hidden rounded-lg bg-bg-subtle">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={48} height={48} className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-md font-semibold text-text-primary">{project.name}</p>
        <p className="text-sm text-text-secondary">{meta}</p>
      </div>
      {action}
    </div>
  );
}

/** P2-SAVE-6: the diff the Versions block will show, as names. */
function VersionChanges({
  changes,
  previous,
}: {
  changes: { added: string[]; updated: string[]; dropped: string[] };
  previous: number;
}) {
  const lines = [
    changes.added.length ? `New: ${changes.added.join(", ")}` : null,
    changes.updated.length ? `Updated: ${changes.updated.join(", ")}` : null,
    changes.dropped.length
      ? `Not in this version: ${changes.dropped.join(", ")} — stays listed from version ${previous}`
      : null,
  ].filter((l): l is string => l !== null);
  return (
    <section aria-label="What changes" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">What changes</h3>
      {lines.length ? (
        <ul role="list" className="flex list-disc flex-col gap-2 pl-8 text-sm text-text-secondary marker:text-text-tertiary">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary">Same products as version {previous}.</p>
      )}
    </section>
  );
}

/**
 * P2-SAVE-7: the first cover, new mode only. A radiogroup of cards — the
 * labelled card owns the role, the Radio is its picture — two per row in a
 * container of 400 px or less, three above. Arrow keys move the selection;
 * the selected card takes the brand border, which is selection, not a second
 * violet action.
 */
function CoverPicker({
  choices,
  value,
  onChange,
}: {
  choices: CoverChoice[];
  value: string;
  onChange: (productId: string) => void;
}) {
  const legendId = React.useId();
  const helpId = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, by: number) => {
    const next = (from + by + choices.length) % choices.length;
    onChange(choices[next].productId);
    refs.current[next]?.focus();
  };
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend id={legendId} className="mb-3 p-0 text-md font-semibold text-text-primary">
        Cover
      </legend>
      <p id={helpId} className="-mt-2 text-sm text-text-secondary">
        Shown on the project&apos;s card in My projects. Change it later in Media.
      </p>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-describedby={helpId}
        className="grid grid-cols-2 gap-4 [@container(min-width:401px)]:grid-cols-3"
      >
        {choices.map((c, i) => {
          const on = c.productId === value;
          return (
            <button
              key={c.productId}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(c.productId)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(i, 1);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(i, -1);
                }
              }}
              className={cn(
                "flex min-h-[var(--touch-min)] min-w-0 flex-col gap-3 rounded-xl border border-solid bg-bg-surface p-3 text-left outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
                on ? "border-border-brand" : "border-border hover:bg-bg-subtle",
              )}
            >
              <span className="block aspect-[4/3] w-full overflow-hidden rounded-lg bg-bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt={`${c.name} concept image`} className="size-full object-cover" />
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <Radio checked={on} decorative size="sm" />
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">{c.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
