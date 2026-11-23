"use client";

// Save project on a phone (27 · A8 · 28), the web's one save (save-step.tsx)
// as a sheet. The mode is the web's (`useSaveMode`), and the maker can move
// between new and join as on the web:
// · new — "Save project": the name and what it's for (Update with AI when
//   two or more products are described), and the cover when there are two
//   images or more. A single product with no lineage gets "Add it to a
//   project you already have instead" under the name (CRE-5);
// · join — "Add to {project}": the project picked at the question as a row
//   with Change, which opens the pick rows in the sheet (+ New project, then
//   Your projects); nothing to fill in. Several products are all named (CL-034,
//   CRE-4);
// · version — "Save version N": a rebuild of a chat already saved, with the
//   project's row (Version N−1 → N), what changes as rows, and that the name
//   stays (CRE-6).
// Joining or versioning a project that isn't a Draft says it's already minted
// and this won't be part of that mint (CRE-6).
// One record is written (saveBuild), the store's write is waited for, then
// the build names its project and the concept network becomes the project's
// network; the sheet turns into what was saved, read off the project's real
// status (the web's SavedDialog, CRE-3), with View project (the project page);
// ✕ goes back to the chat. A refused write keeps what was typed.

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Field } from "@/components/auth/auth-parts";
import { joinableOf, type SaveModeInfo } from "@/components/create/save-step";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { useDescriptionAiAssist } from "@/components/projects/description-ai-assist";
import { useStatusOf } from "@/components/projects/saved-dialog";
import { useCreateHistory, type BuildJob } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { STATUS_WORD, formatShortDate } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject, type SaveInput } from "@/lib/manual/projects";
import {
  checkSaveDraft,
  coverChoicesOf,
  describedProductsOf,
  holderOf,
  mintNoticeOf,
  namesOf,
  saveDefaultsOf,
  savedNoticeOf,
  versionChangesOf,
  type VersionChanges,
} from "@/lib/manual/save-step";
import { useGuards, useWriteGuard } from "@/lib/manual/use-write-guard";
import { networkForSave } from "@/lib/network/from-concept";
import { networkProducts } from "@/lib/network/products";
import { readNetwork, saveNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { Eyebrow } from "../kit/eyebrow";
import { ListCard, ListRow } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { Thumb } from "../project/parts";

type Kind = "new" | "join" | "version";

/** The chooser's own value for "+ New project" — no project id carries it. */
const NEW_PROJECT = "__new__";

function countLabel(n: number): string {
  return `${n} product${n === 1 ? "" : "s"}`;
}

export function SaveSheet({ open, job, info, onClose }: { open: boolean; job: BuildJob; info: SaveModeInfo; onClose: () => void }) {
  return open ? <SavePanel job={job} info={info} onClose={onClose} /> : null;
}

function SavePanel({ job, info: infoProp, onClose }: { job: BuildJob; info: SaveModeInfo; onClose: () => void }) {
  const { projects, saveBuild } = useManualProjects();
  const { builds, setBuildProject, getChat } = useCreateHistory();
  const guards = useGuards();
  // The mode as the sheet opened: the save itself makes the build "saved" a render before it
  // settles. The one change it takes is the lock (below), as on the web.
  const [info, setInfo] = React.useState(infoProp);
  const [now] = React.useState(() => Date.now());
  const defaults = React.useMemo(() => saveDefaultsOf(job), [job]);
  const single = (job.companions?.length ?? 0) === 0;
  const [name, setName] = React.useState(defaults.name);
  const [description, setDescription] = React.useState(defaults.description);
  const [cover, setCover] = React.useState<string>(defaults.coverProductId);
  // New or join, and the join's project (the web's SaveDraft `mode` / `joinId`).
  const [draftMode, setDraftMode] = React.useState<"new" | "join">(infoProp.mode.kind === "join" ? "join" : "new");
  const [joinId, setJoinId] = React.useState<string | null>(infoProp.mode.kind === "join" ? infoProp.mode.project.id : null);
  const [changing, setChanging] = React.useState(false);
  // "That project isn't in this browser any more." — a join or version target gone at submit: the
  // sheet goes on as a new project (P2-SAVE-15).
  const [gone, setGone] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const [storageFull, setStorageFull] = React.useState(false);
  const [stillPaused, setStillPaused] = React.useState(false);
  const [pending, setPending] = React.useState<{ projectId: string; revert: () => void; unpause: () => boolean } | null>(null);
  const [saved, setSaved] = React.useState<{ projectId: string; kind: Kind; at: number } | null>(null);
  const busy = React.useRef(false);
  const otherNames = React.useMemo(() => projects.map((p) => p.name), [projects]);
  const choices = React.useMemo(() => coverChoicesOf(job), [job]);
  const aiProducts = React.useMemo(() => describedProductsOf(job), [job]);
  const ai = useDescriptionAiAssist({ products: aiProducts, value: description, onReplace: setDescription, pillClassName: "min-h-[36px]" });
  const nameId = React.useId();
  const descId = React.useId();

  // ── the mode, as the web's dialog reads it ──
  const joinable = React.useMemo(() => joinableOf(projects, guards), [projects, guards]);
  const version = !gone && info.mode.kind === "version" ? info.mode : null;
  const joining = !version && !gone && draftMode === "join";
  const joinTarget = joining && joinId ? (joinable.find((p) => p.id === joinId) ?? null) : null;
  const kind: Kind = version ? "version" : joining ? "join" : "new";
  const target: ManualProject | null = version?.project ?? joinTarget;
  // A single product may switch to joining a project; several join only the one the question
  // chose (a project's Add a product), and may still Change it.
  const canJoin = (info.mode.kind === "new" ? single && info.mode.canJoin : info.mode.kind === "join") && joinable.length > 0;
  // The pick rows: open when join mode has no project yet, or after Change.
  const choosing = kind === "join" && (changing || !joinTarget);

  const gate = useWriteGuard(kind === "new" ? null : (target?.id ?? null));
  const blocked = kind !== "new" && target ? gate.reasonOf("addProduct") : null;

  const applied = pending !== null && holderOf(job, projects)?.id === pending.projectId;
  const write = useStoreWrite(applied, () => {
    if (!pending) return;
    if (job.projectId !== pending.projectId) setBuildProject(job.id, pending.projectId);
    const holder = projects.find((p) => p.id === pending.projectId);
    if (holder && kind !== "join") {
      const network = networkForSave({
        existing: readNetwork(holder.id),
        projectId: holder.id,
        name: holder.name,
        products: networkProducts(holder, buildsOf(holder, builds)),
        job,
        chat: getChat(job.chatId),
        now: Date.now(),
      });
      if (network) saveNetwork(network);
    }
    setSaved({ projectId: pending.projectId, kind, at: Date.now() });
    setPending(null);
    busy.current = false;
  });
  const saving = pending !== null || write.saving;

  // A sale in another tab that sells the target in full turns the version or join into a new
  // project, with why (the web's dialog does the same).
  if (infoProp.broken !== null && info.broken === null && !saving) {
    setInfo(infoProp);
    setDraftMode("new");
    setJoinId(null);
    setChanging(false);
  }

  React.useEffect(() => {
    if (!write.failed || !pending) return;
    const frame = window.requestAnimationFrame(() => {
      pending.revert();
      // A live listing the pause confirm paused for this save goes back on (the web's undo).
      setStillPaused(!pending.unpause());
      setPending(null);
      busy.current = false;
      setStorageFull(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [write.failed, pending]);

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
      setDraftMode("new");
      setJoinId(null);
      return;
    }
    setPending({ projectId: result.project.id, revert: result.revert, unpause });
  };

  const check = checkSaveDraft({ mode: "new", name, description, coverProductId: cover, joinId: null }, otherNames);
  const submit = () => {
    if (busy.current || saving) return;
    setRefusal(null);
    if (kind === "new") {
      if (!check.ok) {
        setShown(true);
        return;
      }
      const picked = cover !== "primary" && choices.some((c) => c.productId === cover) ? { buildId: job.id, productId: cover } : null;
      commit({ kind: "new", name: check.name.value, description: check.description.value, cover: picked });
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
    const input: SaveInput = kind === "version" ? { kind: "version", projectId: target.id } : { kind: "join", projectId: target.id };
    // A live Buy-now listing is paused before the save runs; a refused save puts it back.
    const outcome = gate.guard("addProduct", (undo) => commit(input, undo));
    if (outcome.kind === "refused") setRefusal(outcome.reason);
  };

  // "Add it to a project you already have instead": the pick rows, nothing picked yet.
  const switchToJoin = () => {
    setRefusal(null);
    setGone(null);
    setDraftMode("join");
    setJoinId(null);
    setChanging(true);
  };
  const pickProject = (v: string) => {
    setRefusal(null);
    setChanging(false);
    if (v === NEW_PROJECT) {
      setDraftMode("new");
      setJoinId(null);
      return;
    }
    setDraftMode("join");
    setJoinId(v);
  };

  // ── the words (the web's save-step.tsx) ──
  const product = job.title.trim();
  // A join of several products names them all (CL-034).
  const joinNames = namesOf([job.title, ...(job.companions ?? []).map((c) => c.name)]);
  const n = version?.version ?? 0;

  if (saved) {
    const project = projects.find((p) => p.id === saved.projectId);
    if (!project) return null;
    return <SavedPanel project={project} kind={saved.kind} product={single ? product : joinNames} many={!single} version={n} onClose={onClose} />;
  }

  const title = kind === "new" ? "Save project" : kind === "version" ? `Save version ${n}` : joinTarget ? `Add to ${joinTarget.name}` : "Add to a project";
  const sheetDescription =
    kind === "new"
      ? "Name it and say what it's for. You can change both later on the project page."
      : version
        ? `This is a rebuild in the chat “${version.chatTitle}”, so it becomes version ${n} of ${version.project.name}. Version ${n - 1} stays in the project's history.`
        : joinTarget
          ? single
            ? `${product} joins ${joinTarget.name} as a new product. The project's name and description stay as they are.`
            : `${joinNames} join ${joinTarget.name} as new products. The project's name and description stay as they are.`
          : single
            ? `Pick the project ${product} joins. Its name and description stay as they are.`
            : `Pick the project ${joinNames} join. Its name and description stay as they are.`;
  const primaryLabel = kind === "new" ? "Save project" : kind === "version" ? `Save version ${n}` : "Add to project";
  const changes = version ? <VersionChangesRows project={version.project} job={job} lineage={info.lineage} now={now} previous={n - 1} /> : null;

  return (
    <>
      <Sheet
        open
        onClose={() => !saving && onClose()}
        title={title}
        description={sheetDescription}
        actions={
          <Button size="xl" className="w-full" loading={saving} onClick={submit} disabled={!!blocked}>
            {primaryLabel}
          </Button>
        }
      >
        {/* Joining or versioning a project past Draft: the new work isn't in its mint (P2-SAVE-5/6). */}
        {target && kind !== "new" && <MintLine project={target} what={kind === "version" ? "version" : single ? "product" : "products"} />}
        {storageFull && (
          <Banner tone="error" title="Couldn't save">
            This browser&apos;s storage is full, so the project wasn&apos;t kept. What you typed is still here.
            {stillPaused && " Its listing stayed paused: relist it from the project's Marketplace block."}
          </Banner>
        )}
        {gone && <Banner tone="attention">{gone}</Banner>}
        {kind === "new" && info.broken && <Banner tone="attention">{info.broken}</Banner>}
        {(refusal || blocked) && <Banner tone="attention">{refusal ?? blocked}</Banner>}

        {kind === "new" && (
          <>
            <Field label="Project name" htmlFor={nameId} error={shown ? check.name.error ?? undefined : undefined}>
              <TextInput id={nameId} size="xl" value={name} onValueChange={setName} invalid={shown && !!check.name.error} maxLength={120} />
            </Field>
            {canJoin && (
              <ListCard label="Project">
                <ListRow icon={Folder01Icon} title="Add it to a project you already have instead" onClick={switchToJoin} />
              </ListCard>
            )}
            <Field label="Description" htmlFor={descId} aside={ai.pill} error={shown ? check.description.error ?? undefined : undefined}>
              <Textarea id={descId} value={description} onValueChange={setDescription} rows={4} invalid={shown && !!check.description.error} />
            </Field>
            <p className={cn(T.meta, "-mt-3 text-text-tertiary")}>Optional.</p>
            {choices.length > 1 && (
              <div className="flex flex-col gap-3">
                <p className={T.rowTitle}>Cover</p>
                <p className={T.meta}>Shown on the project card in My projects.</p>
                <div role="radiogroup" aria-label="Cover" className="flex gap-4 overflow-x-auto pb-1">
                  {choices.map((c) => (
                    <button
                      key={c.productId}
                      type="button"
                      role="radio"
                      aria-checked={cover === c.productId}
                      aria-label={c.name}
                      onClick={() => setCover(c.productId)}
                      className={cn(
                        "relative size-[120px] shrink-0 overflow-hidden rounded-xl border-[length:var(--border-width-2)] border-solid outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                        cover === c.productId ? "border-border-brand" : "border-border-subtle",
                      )}
                    >
                      <Image src={c.imageUrl} alt="" fill sizes="120px" className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {kind === "join" &&
          (choosing ? (
            // The web's chooser as the sheet's own pick rows (a pick applies on tap).
            <div className="flex flex-col gap-2">
              <PickList
                label="New project"
                value={null}
                options={[{ value: NEW_PROJECT, label: "+ New project", helper: "This product becomes its first." }]}
                onPick={pickProject}
              />
              <Eyebrow tone="tertiary" as="h3" className="pt-4">
                Your projects
              </Eyebrow>
              <PickList
                label="Your projects"
                value={joinTarget?.id ?? null}
                options={joinable.map((p) => ({ value: p.id, label: p.name, helper: `${countLabel(p.products?.length || 1)} · updated ${formatShortDate(p.updatedAt, now)}` }))}
                onPick={pickProject}
              />
            </div>
          ) : joinTarget ? (
            <ListCard label="Project">
              <ListRow
                leading={<Thumb url={coverOf(joinTarget, buildsOf(joinTarget, builds))} icon={Folder01Icon} className="size-[44px]" />}
                title={joinTarget.name}
                meta={`${countLabel(joinTarget.products?.length || 1)} · updated ${formatShortDate(joinTarget.updatedAt, now)}`}
                value="Change"
                onClick={() => setChanging(true)}
              />
            </ListCard>
          ) : null)}

        {kind === "version" && version && (
          <>
            <ListCard label="Project">
              <ListRow
                leading={<Thumb url={coverOf(version.project, buildsOf(version.project, builds))} icon={Folder01Icon} className="size-[44px]" />}
                title={version.project.name}
                meta={`Version ${n - 1} → ${n}`}
              />
            </ListCard>
            {changes}
            <p className={T.meta}>The name stays {version.project.name}. Rename it on the project page.</p>
          </>
        )}
      </Sheet>
      {gate.dialog}
    </>
  );
}

/** "Smart Home Kit is already minted. This product won't be part of that mint." — read off the
 *  project's status as its page shows it; nothing while it is a Draft. */
function MintLine({ project, what }: { project: ManualProject; what: "product" | "products" | "version" }) {
  const status = useStatusOf(project);
  const line = mintNoticeOf(status, project.name, what);
  return line ? <p className={T.meta}>{line}</p> : null;
}

/** P2-SAVE-6: what the version changes, as rows — New / Updated / Not in this version. */
function VersionChangesRows({
  project,
  job,
  lineage,
  now,
  previous,
}: {
  project: ManualProject;
  job: BuildJob;
  lineage: BuildJob[];
  now: number;
  previous: number;
}) {
  const { builds } = useCreateHistory();
  const changes: VersionChanges = React.useMemo(() => versionChangesOf(project, job, lineage, builds, [], now), [project, job, lineage, builds, now]);
  const rows = [
    changes.added.length ? { key: "new", title: "New", meta: changes.added.join(", ") } : null,
    changes.updated.length ? { key: "updated", title: "Updated", meta: changes.updated.join(", ") } : null,
    changes.dropped.length ? { key: "dropped", title: "Not in this version", meta: `${changes.dropped.join(", ")} — stays listed from version ${previous}` } : null,
  ].filter((r): r is { key: string; title: string; meta: string } => r !== null);
  return (
    <section aria-label="What changes" className="flex flex-col gap-2">
      <Eyebrow tone="tertiary" as="h3" className="pt-2">
        What changes
      </Eyebrow>
      {rows.length ? (
        <ListCard label="What changes">
          {rows.map((r) => (
            <ListRow key={r.key} title={r.title} meta={r.meta} />
          ))}
        </ListCard>
      ) : (
        <p className={T.meta}>Same products as version {previous}.</p>
      )}
    </section>
  );
}

/** What the save says once it held — the web's SavedDialog: the title and the line read off the
 *  project's real status (a minted or listed project isn't "Only you can see it", CRE-3), and its
 *  status word on the card. */
function SavedPanel({
  project,
  kind,
  product,
  many,
  version,
  onClose,
}: {
  project: ManualProject;
  kind: Kind;
  product: string;
  many: boolean;
  version: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const status = useStatusOf(project);
  const notice = savedNoticeOf(kind, { name: project.name, product, version, draft: status === "draft", many });
  const n = project.products?.length || 1;
  return (
    <Sheet
      open
      onClose={onClose}
      title={notice.title}
      description={`${notice.body}${notice.publishLine ? " When it’s ready, publish it from the project page." : ""}`}
      // One primary; ✕, swipe and the scrim go back to the chat (kit rule: no button that only closes).
      actions={
        <Button size="xl" className="w-full" onClick={() => router.push(`/m/projects/${project.id}`)}>
          View project
        </Button>
      }
    >
      <div className="flex items-center gap-6 rounded-xl bg-bg-subtle p-6">
        <span className="inline-flex size-[44px] shrink-0 items-center justify-center rounded-lg bg-bg-surface text-[color:var(--color-icon-brand)]">
          <Icon icon={Folder01Icon} size={20} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={cn(T.bodyStrong, "truncate")}>{project.name}</span>
          <span className={T.meta}>
            {n} {n === 1 ? "product" : "products"} · {STATUS_WORD[status]}
          </span>
        </span>
      </div>
    </Sheet>
  );
}
