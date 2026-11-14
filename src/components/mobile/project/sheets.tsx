"use client";

// The project page's sheets, every one rising from the bottom:
// · 07 ⋯ Project actions (M12): Edit name and description · Share to Feed (a
//   Draft's row says "Mint it first" and goes to the mint; the Feed shows only
//   what is for sale (owner 2026-11-12), so a project with nothing on the
//   marketplace says "List it first" and goes to Sell) — or, once shared,
//   View post (its clip on the Feed, while something of it is for sale), Edit
//   post (the story) and Stop sharing (asks first, the toast offers Undo),
//   which the web keeps on the post · Delete project…, the red row last;
// · 07b Edit name and description (07g–07n): the web's editor — the name
//   (1–80, a name another project has is a note), the description (counter
//   from 800, "What it is, and who it is for."), Update with AI with Undo,
//   Save through the edit gate (a live listing pauses first, 21), Discard
//   changes? on the way out, the storage error kept in the sheet;
// · 07c / 22a–22i Delete: What goes and What stays, the typed name when work
//   would be lost; blocked (web order: couldn't check → sold → auction →
//   listed → co-owners), it says why and where to fix it;
// · 07d / 07e Share to Feed: every product's video, the project video, the
//   story (500) and the owner's box; Share stays off with its reason;
// · 08 Publish: Keep private · Give to the community · Sell, each with its
//   fee line; 08b readiness: Give and Sell first need every product's AI
//   video and the project video, then go on to the mint (Earn).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Delete02Icon,
  Edit02Icon,
  LockIcon,
  News01Icon,
  PencilEdit01Icon,
  PlayIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox, Radio } from "@/components/ideeza/checkbox";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { INTENTS } from "@/components/brief/step-choose";
import { useDescriptionAiAssist } from "@/components/projects/description-ai-assist";
import { useStoreWrite } from "@/components/projects/details/use-store-write";
import { dialogBlockerOf } from "@/components/projects/details/readiness-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreateHistory } from "@/lib/create/history";
import { postIdOfProject } from "@/lib/innovations/slug";
import { deletePlanOf, matchesTypedName } from "@/lib/manual/delete-plan";
import { earnHref, earnMintHref, publishHrefOf, publishOptionsOf, type PublishIntent } from "@/lib/manual/earn-route";
import { editorWorkOfProject } from "@/lib/manual/editor-work";
import { readJourney } from "@/lib/manual/journey-store";
import type { ReadinessPurpose } from "@/lib/manual/p2-types";
import { can, deleteBlockOf, type DeleteBlock } from "@/lib/manual/permissions";
import { DESCRIPTION_SAVED, WRITE_FAILED, checkDescription, checkProjectName, renamedMessage } from "@/lib/manual/project-header";
import { deleteFactsOf, productRowsOf } from "@/lib/manual/project-read";
import { formatDate, projectSummary } from "@/lib/manual/project-summary";
import { PROJECT_DESC_COUNTER_FROM, PROJECT_DESC_MAX, PROJECT_NAME_MAX, useManualProjects } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { STORY_MAX, sharePostBlocker } from "@/lib/manual/share-post";
import { deleteFixOf, phoneHrefOf, phoneProjectPath, publishLineOf, readyOfLine } from "@/lib/manual/phone-project";
import { readMarketNow } from "@/lib/market/market-store";
import { readNetwork } from "@/lib/network/store";
import { useProjectVideos } from "@/lib/video/store";
import { actionLabel, projectActionLabel, projectRowCopy, readinessCopy, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { MEDIA_GROUND, MEDIA_INK } from "../kit/media";
import { ActionSheet, Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { useProject, type ProjectSheet, type Ready } from "./context";
import { LIST_ROW, ListCard, Thumb } from "./parts";
import { AddProductSheet } from "./products-tab";

/** The time a press is stamped with, read when it is pressed. */
const stamp = () => Date.now();

export function ProjectSheets({ sheet, onSheet }: { sheet: ProjectSheet | null; onSheet: (s: ProjectSheet | null) => void }) {
  const close = () => onSheet(null);
  return (
    <>
      <MenuSheet open={sheet?.kind === "menu"} onClose={close} onSheet={onSheet} />
      {sheet?.kind === "edit" && <EditSheet ai={sheet.ai === true} onClose={close} />}
      {sheet?.kind === "delete" && <DeleteSheet onClose={close} />}
      {sheet?.kind === "share" && <ShareSheet onClose={close} />}
      {sheet?.kind === "edit-post" && <EditPostSheet onClose={close} />}
      <StopSharingSheet open={sheet?.kind === "stop-sharing"} onClose={close} />
      <PublishSheet open={sheet?.kind === "publish"} onClose={close} onSheet={onSheet} />
      {sheet?.kind === "readiness" && <ReadinessSheet purpose={sheet.purpose} then={sheet.then} onClose={close} />}
      <AddProductSheet open={sheet?.kind === "add-product"} onClose={close} />
    </>
  );
}

// ─────────────────────────── 07 · ⋯ Project actions ───────────────────────────

function MenuSheet({ open, onClose, onSheet }: { open: boolean; onClose: () => void; onSheet: (s: ProjectSheet) => void }) {
  const { project, view, viewer } = useProject();
  const router = useRouter();
  const [mintFirst, setMintFirst] = React.useState(false);
  const [listFirst, setListFirst] = React.useState(false);
  const canEdit = can(viewer, "project.rename", view.canCtx) || can(viewer, "project.editDescription", view.canCtx);
  const canShare = can(viewer, "project.showcase", view.canCtx);
  const shared = view.summary.showcase;
  const onFeed = forSaleNow(view);
  // Minted with nothing for sale: sharing waits for a listing — unless it can never be listed again.
  const needsListing = canShare && !onFeed;
  const canList = can(viewer, "listing.create", view.canCtx);
  const shareShown =
    (canShare && (onFeed || canList || shared !== null)) || (view.lock === null && view.summary.status === "draft" && can(viewer, "facts.seeOwnerOnly"));
  const sellHref =
    phoneHrefOf(view.summary.status === "draft" ? earnMintHref(project.id, "sell") : earnHref(project.id, "sell", { list: "1" }), project.id) ?? "/m/projects";
  const items = [
    ...(canEdit ? [{ label: "Edit name and description", icon: PencilEdit01Icon, onSelect: () => onSheet({ kind: "edit" }) }] : []),
    ...(shareShown
      ? [
          ...(shared
            ? [
                ...(onFeed
                  ? [{ label: "View post", icon: News01Icon, onSelect: () => router.push(`/m/clip/${encodeURIComponent(postIdOfProject(project.id))}`) }]
                  : []),
                ...(canShare
                  ? [
                      { label: "Edit post", icon: Edit02Icon, onSelect: () => onSheet({ kind: "edit-post" }) },
                      { label: "Stop sharing", icon: ViewOffSlashIcon, onSelect: () => onSheet({ kind: "stop-sharing" }) },
                    ]
                  : []),
              ]
            : [
                {
                  // A Draft can't share yet, nor a project with nothing for sale: the row says why
                  // before the tap (Figma 07 10371:2201).
                  label: !canShare ? "Share to Feed · Mint it first" : needsListing ? "Share to Feed · List it first" : "Share to Feed",
                  icon: News01Icon,
                  onSelect: () => (!canShare ? setMintFirst(true) : needsListing ? setListFirst(true) : onSheet({ kind: "share" })),
                },
              ]),
        ]
      : []),
    ...(can(viewer, "project.delete") ? [{ label: "Delete project…", icon: Delete02Icon, destructive: true, onSelect: () => onSheet({ kind: "delete" }) }] : []),
  ];
  return (
    <>
      <ActionSheet
        open={open}
        onClose={onClose}
        title={shared ? (onFeed ? `${project.name} · on Feed since ${formatDate(shared.at)}` : `${project.name} · off the Feed until it’s for sale`) : project.name}
        items={items}
      />
      <Sheet
        open={listFirst}
        onClose={() => setListFirst(false)}
        title="List it first"
        description="The Feed shows only what is for sale. Put the project or a copy of it on the marketplace, then share it to the Feed."
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push(sellHref)}>
              Go to Sell
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setListFirst(false)}>
              Cancel
            </Button>
          </>
        }
      />
      <Sheet
        open={mintFirst}
        onClose={() => setMintFirst(false)}
        title="Mint it first"
        description="Minting keeps your name on it before anyone sees it. Then share it to Feed."
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push(phoneHrefOf(earnMintHref(project.id, "save")) ?? "/m/projects")}>
              Go to mint
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setMintFirst(false)}>
              Cancel
            </Button>
          </>
        }
      />
    </>
  );
}

/** Something of it is for sale — a live Main listing or a listed copy — so its clip is on the Feed
 *  (the Feed's own rule, feed/use-clips.ts). */
function forSaleNow(view: Ready["view"]): boolean {
  return view.listing.kind === "live" || (view.lock === null && view.editions.some((t) => t.listing !== null));
}

// ─────────────────────────── 07b · Edit name and description ───────────────────────────

function EditSheet({ ai: startAi, onClose }: { ai: boolean; onClose: () => void }) {
  const { project, gate } = useProject();
  const { projects, updateProject, setDescriptionHint } = useManualProjects();
  const toast = useToast();
  const ids = useFieldIds(["name", "description"] as const);
  const [initial] = React.useState(() => ({ name: project.name, description: project.description }));
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description);
  const [tried, setTried] = React.useState(false);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const [pending, setPending] = React.useState<{ name: string; description: string } | null>(null);
  const others = React.useMemo(() => projects.filter((p) => p.id !== project.id).map((p) => p.name), [projects, project.id]);
  const nameCheck = checkProjectName(name, others, PROJECT_NAME_MAX);
  const descCheck = checkDescription(description, PROJECT_DESC_MAX, PROJECT_DESC_COUNTER_FROM);
  const nameChanged = nameCheck.value !== initial.name.trim();
  const descChanged = descCheck.value !== initial.description.trim();
  const dirty = name !== initial.name || description !== initial.description;
  const change = nameChanged ? "rename" : "description";
  const rows = React.useMemo(() => productRowsOf(project).map((r) => ({ name: r.name, description: r.description })), [project]);
  const ai = useDescriptionAiAssist({ products: rows, value: description, onReplace: setDescription, pillClassName: "min-h-[44px] rounded-xl leading-md tracking-wide" });
  const started = React.useRef(false);
  React.useEffect(() => {
    if (!startAi || started.current) return;
    started.current = true;
    ai.start(project.description);
  }, [startAi, ai, project.description]);

  const write = useStoreWrite(pending !== null && project.name === pending.name && project.description === pending.description, () => {
    const p = pending;
    if (p) {
      const renamed = p.name !== initial.name.trim();
      const described = p.description !== initial.description.trim();
      if (described) setDescriptionHint(project.id, { dismissedAt: stamp(), productCount: rows.length });
      toast({ title: renamed && described ? "Name and description saved" : renamed ? renamedMessage(p.name) : DESCRIPTION_SAVED });
    }
    ai.reset();
    onClose();
  });

  const nameError = tried ? nameCheck.error : null;
  const save = () => {
    if (write.saving) return;
    setTried(true);
    if (nameCheck.error || descCheck.tooLong) return;
    if (!nameChanged && !descChanged && !write.failed) {
      if (ai.wrote) setDescriptionHint(project.id, { dismissedAt: stamp(), productCount: rows.length });
      ai.reset();
      return onClose();
    }
    const next = { name: nameCheck.value, description: descCheck.value };
    setDenied(null);
    const out = gate.guard(change, () => {
      setPending(next);
      write.start();
      updateProject(project.id, next);
    });
    if (out.kind === "refused") setDenied(out.reason);
  };
  const leave = () => {
    if (write.failed) updateProject(project.id, initial);
    write.reset();
    ai.reset();
    onClose();
  };
  const requestClose = () => {
    if (write.saving) return;
    if (dirty) setDiscarding(true);
    else leave();
  };

  return (
    <>
      <Sheet
        open
        onClose={requestClose}
        title="Edit name and description"
        description="People who buy it and the community see these."
        actions={
          <>
            <Button size="xl" className="w-full" loading={write.saving || ai.running} onClick={save}>
              {write.failed ? "Try again" : "Save"}
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={requestClose}>
              Cancel
            </Button>
          </>
        }
      >
        <Field label="Name" htmlFor={ids.name.id} error={nameError} errorId={ids.name.errorId}>
          <TextInput
            id={ids.name.id}
            size="xl"
            value={name}
            onValueChange={(v) => {
              setName(v);
              setTried(false);
            }}
            autoComplete="off"
            {...errorProps(nameError, ids.name.errorId)}
          />
          <span className={cn(T.caption, nameCheck.counter && "text-text-error")}>
            {nameCheck.counter ?? `${Array.from(name.trim()).length}/${PROJECT_NAME_MAX}`}
          </span>
          {nameCheck.note && <span className={T.caption}>{nameCheck.note}</span>}
        </Field>
        <Field label="Description" htmlFor={ids.description.id} error={descCheck.tooLong ? descCheck.error : null} errorId={ids.description.errorId}>
          <Textarea
            id={ids.description.id}
            rows={4}
            value={description}
            onValueChange={setDescription}
            readOnly={ai.running}
            {...errorProps(descCheck.tooLong ? descCheck.error : null, ids.description.errorId)}
          />
          <span className={cn(T.caption, "flex justify-between gap-4")}>
            <span>What it is, and who it is for.</span>
            {descCheck.counter && <span>{descCheck.counter}</span>}
          </span>
        </Field>
        {ai.shown && (
          <div className="flex flex-col gap-3">
            <div>{ai.pill}</div>
            {ai.status}
          </div>
        )}
        {(denied || write.failed) && <Banner tone="error">{denied ?? WRITE_FAILED}</Banner>}
      </Sheet>
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard changes?"
        body="Your new name and description aren’t saved yet."
        verb="Discard changes"
        destructive
        cancelLabel="Keep editing"
        onConfirm={leave}
      />
    </>
  );
}

// ─────────────────────────── 07c / 22a–22i · Delete project ───────────────────────────

/** The delete gate over what is stored now (the market and the record), as the web asks at confirm. */
function deleteBlockNow(project: ReturnType<typeof useProject>["project"], view: ReturnType<typeof useProject>["view"], draft: ReturnType<typeof useProject>["brief"]): DeleteBlock | null {
  const market = readMarketNow();
  const builds = view.refs.flatMap((r) => (r.job ? [r.job] : []));
  const summary = projectSummary(project, { builds, brief: draft, videoJobs: [], now: Date.now(), market });
  return deleteBlockOf(
    deleteFactsOf({
      ...view,
      listing: summary.listing,
      sales: market.sales.filter((s) => s.projectId === project.id),
      ownership: summary.ownership,
      marketUnreadable: market.unreadable,
    }),
  );
}

/** The most of a project's name a sheet title shows before it is cut. */
const TITLE_NAME_MAX = 32;

function DeleteSheet({ onClose }: { onClose: () => void }) {
  const { project, view, brief } = useProject();
  const router = useRouter();
  const toast = useToast();
  const { deleteProject } = useManualProjects();
  const { chats } = useCreateHistory();
  const [entry, setEntry] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [lateBlock, setLateBlock] = React.useState<DeleteBlock | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fieldId = React.useId();
  const name = project.name.trim();
  const block = deleteBlockOf(view.deleteFacts) ?? lateBlock;

  const plan = React.useMemo(() => {
    const live = view.refs.filter((r) => r.job !== null);
    const known = new Set(chats.map((c) => c.id));
    const keptChats = new Set(live.flatMap((r) => (r.chatId && known.has(r.chatId) ? [r.chatId] : [])));
    const network = readNetwork(project.id);
    const endedListings = readMarketNow().listings.filter((l) => l.projectId === project.id && (l.status === "removed" || l.status === "closed")).length;
    const journey = readJourney(project.id);
    return deletePlanOf({
      status: view.summary.status,
      draft: brief,
      products: view.summary.productCount,
      rows: editorWorkOfProject(project),
      network: network ? { links: network.links.length } : null,
      showcased: view.summary.showcase !== null,
      builds: live.length,
      chats: keptChats.size,
      contributors: (project.contributors ?? []).filter((c) => !(c.role === "coOwner" && c.share > 0)).length,
      activity: { entries: journey.activities.length, files: journey.activities.reduce((n, a) => n + a.media.length, 0) },
      endedListings,
      mint: view.mint.status,
    });
  }, [project, view, brief, chats]);

  if (block) {
    const fix = deleteFixOf(block);
    const fixHref = fix ? phoneHrefOf(earnHref(project.id, fix.place)) : null;
    return (
      <Sheet
        open
        onClose={onClose}
        title={fix ? "You can't delete this project yet" : "You can't delete this project"}
        actions={
          <>
            {fix && fixHref && (
              <Button size="xl" className="w-full" onClick={() => router.push(fixHref)}>
                {fix.label}
              </Button>
            )}
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
              {fix ? "Cancel" : "Close"}
            </Button>
          </>
        }
      >
        <Banner tone="attention" title={block.reason}>
          {block.detail}
        </Banner>
      </Sheet>
    );
  }

  // A long name is cut in the title (two lines at 320 px) and said in full in the sheet.
  const longName = Array.from(name).length > TITLE_NAME_MAX;
  const matched = !plan.typed || matchesTypedName(entry, name);
  const mismatch = plan.typed && checked && entry.trim() !== "" && !matched;
  const confirm = () => {
    if (pending || !matched) return;
    const now = deleteBlockNow(project, view, brief);
    if (now) return setLateBlock(now);
    startTransition(() => {
      if (!deleteProject(project.id)) {
        toast({ title: "It couldn't be deleted right now. Try again.", lead: "error" });
        return;
      }
      toast({ title: `Deleted “${name}”` });
      router.replace("/m/projects");
    });
  };

  return (
    <Sheet
      open
      onClose={() => !pending && onClose()}
      title={`Delete “${longName ? `${Array.from(name).slice(0, TITLE_NAME_MAX).join("")}…` : name}”?`}
      actions={
        <>
          <Button hierarchy="danger" size="xl" className="w-full" disabled={!matched} loading={pending} onClick={confirm}>
            {pending ? "Deleting…" : "Delete project"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {longName && <p className={cn(T.body, "break-words text-text-primary")}>“{name}”</p>}
      <div className={cn(T.body, "flex flex-col gap-2")}>
        <h3 className={T.rowTitle}>What goes</h3>
        <ul className="flex list-disc flex-col gap-1 pl-8">
          {plan.goes.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {plan.minted && <p>{plan.minted}</p>}
        {plan.stays.length > 0 && (
          <>
            <h3 className={cn(T.rowTitle, "pt-4")}>What stays</h3>
            <ul className="flex flex-col gap-1">
              {plan.stays.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      {plan.typed && (
        <Field
          label="Type the project name to confirm"
          htmlFor={fieldId}
          error={mismatch ? `That doesn’t match “${name}”.` : null}
          errorId={`${fieldId}-error`}
        >
          <TextInput
            id={fieldId}
            size="xl"
            value={entry}
            onValueChange={(v) => {
              setEntry(v);
              setChecked(false);
            }}
            onBlur={() => setChecked(true)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            {...errorProps(mismatch ? "x" : null, `${fieldId}-error`)}
          />
        </Field>
      )}
    </Sheet>
  );
}

// ─────────────────────────── readiness rows (07d, 08b) ───────────────────────────

/** The readiness of a project's videos for `purpose`, live (the web's dialog reads the same). */
export function useReadinessOf(given: Ready["project"], view: Ready["view"], brief: Ready["brief"], purpose: ReadinessPurpose) {
  const { projects } = useManualProjects();
  const project = projects.find((p) => p.id === given.id) ?? given;
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  return React.useMemo(() => readinessOf(readinessFactsOf(project, view, brief, record, jobs, now), purpose), [project, view, brief, record, jobs, now, purpose]);
}

function useLiveReadiness(purpose: ReadinessPurpose) {
  const { project, view, brief } = useProject();
  return useReadinessOf(project, view, brief, purpose);
}

/** Each product with its video's state and the web's action (Generate AI video…), then the
 *  project video's row. `projectVideo={false}` leaves that row out (the Project video screen). */
export function ReadinessRows({
  readiness,
  projectId,
  projectVideo = true,
}: {
  readiness: ReturnType<typeof useReadinessOf>;
  projectId: string;
  projectVideo?: boolean;
}) {
  const project = { id: projectId };
  const productHref = (pid: string) => phoneHrefOf(`/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(pid)}`) ?? "#";
  const router = useRouter();
  const pv = projectVideo ? readiness.project : null;
  const pvCopy = pv ? projectRowCopy(pv) : null;
  const pvAction = pvCopy ? projectActionLabel(pvCopy.action) : null;
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h3 className={T.section}>Products</h3>
        <span className={T.meta}>{readyOfLine(readiness.counts.ready, readiness.counts.total)}</span>
      </div>
      <ListCard label="Products">
        {readiness.products.map((p) => {
          const copy = statusCopy(p.video);
          const label = actionLabel(copy.action);
          const ready = p.video.state === "ready";
          return (
            <li key={p.productId} className={cn(LIST_ROW, "flex items-start gap-6 p-6")}>
              <Thumb url={p.thumb}>
                {ready && (
                  <span aria-hidden className={cn(MEDIA_GROUND, MEDIA_INK, "absolute inline-flex size-[28px] items-center justify-center rounded-full")}>
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </Thumb>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={cn(T.rowTitle, "truncate")}>{p.name}</span>
                <span className={cn(T.meta, ready && "text-text-success")}>{copy.text}</span>
                {label && (
                  <Button hierarchy="secondary" size="xl" className="self-start" onClick={() => router.push(productHref(p.productId))}>
                    {label}
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ListCard>
      {pv && pvCopy && (
        <>
          <h3 className={T.section}>Project video</h3>
          <div className="flex items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-dashed border-border p-6">
            <span aria-hidden className="mt-1 text-[color:var(--color-icon-secondary)]">
              <Icon icon={LockIcon} size={16} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className={T.meta}>{pvCopy.text}</span>
              {pvAction && (
                <Button hierarchy="secondary" size="xl" className="self-start" onClick={() => router.push(phoneProjectPath(project.id, "video"))}>
                  {pvAction}
                </Button>
              )}
            </span>
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────── 07d / 07e · Share to Feed ───────────────────────────

function ShareSheet({ onClose }: { onClose: () => void }) {
  const { project, brief } = useProject();
  const { setShowcase, setOwnerConfirmed } = useManualProjects();
  const toast = useToast();
  const readiness = useLiveReadiness("showcase");
  const [story, setStory] = React.useState(() => project.post?.story ?? brief?.state.story ?? "");
  const ownership = readiness.rules.find((r) => r.id === "ownership");
  const [askOwnership] = React.useState(() => ownership?.ok === false);
  const blocker = dialogBlockerOf(readiness) ?? sharePostBlocker({ story });
  const storyId = React.useId();
  const share = () => {
    if (blocker) return;
    setShowcase(project.id, true, undefined, { story: story.trim() });
    toast({ title: "Shared to Feed" });
    onClose();
  };
  const reason = !story.trim() && ownership?.ok === false ? "Write your story and tick the box to share." : blocker;
  return (
    <Sheet
      open
      onClose={onClose}
      title="Share to Feed"
      actions={
        <>
          <Button size="xl" className="w-full" disabled={blocker !== null} onClick={share}>
            Share to Feed
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          {reason && <p className={T.meta}>{reason}</p>}
        </>
      }
    >
      <Banner tone="info">Every product needs an AI video, and the post needs your story.</Banner>
      <ReadinessRows readiness={readiness} projectId={project.id} />
      <div className="flex flex-col gap-2">
        <h3 className={T.section}>Write your story</h3>
        <label htmlFor={storyId} className={T.label}>
          The post
        </label>
        <Textarea
          id={storyId}
          rows={3}
          value={story}
          maxLength={STORY_MAX}
          onValueChange={(v) => setStory(v.slice(0, STORY_MAX))}
          placeholder="Why did you build this? What should others do with it?"
        />
        <span className={cn(T.caption, "flex justify-between gap-4")}>
          <span>Shown with your post in Feed, with the project&apos;s current activity as its status.</span>
          <span>
            {story.length}/{STORY_MAX}
          </span>
        </span>
      </div>
      {askOwnership && (
        <label className={cn(T.rowTitle, "relative flex min-h-[44px] cursor-pointer items-center gap-4")}>
          <input
            type="checkbox"
            className="sr-only"
            checked={ownership?.ok === true}
            onChange={() => setOwnerConfirmed(project.id, stamp())}
            disabled={ownership?.ok === true}
          />
          <Checkbox checked={ownership?.ok === true} decorative />I confirm I am the rightful owner of this idea
        </label>
      )}
    </Sheet>
  );
}

// ─────────────────────────── Edit post · Stop sharing (the web's post bar) ───────────────────────────

/** Edit post: the share's own story. Its status is the project's current Activity, set on the
 *  project, so it isn't edited here; the shared time stays (web: post-owner-bar.tsx). */
function EditPostSheet({ onClose }: { onClose: () => void }) {
  const { project, view } = useProject();
  const { setShowcase } = useManualProjects();
  const toast = useToast();
  const [story, setStory] = React.useState(project.post?.story ?? "");
  const [tried, setTried] = React.useState(false);
  const storyId = React.useId();
  const blocker = sharePostBlocker({ story });
  const save = () => {
    if (blocker) return setTried(true);
    setShowcase(project.id, true, view.summary.showcase?.at, { story: story.trim() });
    toast({ title: "Post updated" });
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit post"
      description="What people read with your post on Feed."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={save}>
            Save
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={storyId} className={T.label}>
          The post
        </label>
        <Textarea
          id={storyId}
          rows={4}
          value={story}
          maxLength={STORY_MAX}
          invalid={tried && blocker !== null}
          onValueChange={(v) => setStory(v.slice(0, STORY_MAX))}
          placeholder="Why did you build this? What should others do with it?"
        />
        <span className={cn(T.caption, "flex justify-between gap-4", tried && blocker && "text-text-error")}>
          <span role={tried && blocker ? "alert" : undefined}>{tried && blocker ? blocker : "Its status is the project’s current activity."}</span>
          <span className="text-text-secondary">
            {story.length}/{STORY_MAX}
          </span>
        </span>
      </div>
    </Sheet>
  );
}

function StopSharingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { project, view } = useProject();
  const { setShowcase } = useManualProjects();
  const toast = useToast();
  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      title="Stop sharing to Feed?"
      body="The post leaves Feed, and only you can open it. Its comments are kept and come back if you share again."
      verb="Stop sharing"
      onConfirm={() => {
        const at = view.summary.showcase?.at;
        const post = project.post;
        setShowcase(project.id, false);
        toast({
          title: "Stopped sharing. The post left Feed.",
          action: { label: "Undo", onClick: () => setShowcase(project.id, true, at, post) },
        });
      }}
    />
  );
}

// ─────────────────────────── 08 · Publish ───────────────────────────

function PublishSheet({ open, onClose, onSheet }: { open: boolean; onClose: () => void; onSheet: (s: ProjectSheet) => void }) {
  const { project, view, brief } = useProject();
  const router = useRouter();
  const [pick, setPick] = React.useState<PublishIntent | null>(null);
  const status = view.summary.status;
  const options = publishOptionsOf(status, brief?.state.mintedAt != null) ?? [];
  const items = INTENTS.filter((i) => options.includes(i.id as PublishIntent));
  const close = () => {
    setPick(null);
    onClose();
  };
  const go = () => {
    if (!pick) return;
    const href = phoneHrefOf(publishHrefOf(project.id, status, pick)) ?? "/m/projects";
    const purpose: ReadinessPurpose | null = pick === "give" ? "give" : pick === "sell" ? "sell" : null;
    setPick(null);
    if (purpose && dialogBlockerOf(view.videos.readiness[purpose])) return onSheet({ kind: "readiness", purpose, then: href });
    onClose();
    router.push(href);
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={`Publish ${project.name}`}
      description={publishLineOf(status)}
      actions={
        <>
          <Button size="xl" className="w-full" disabled={!pick} onClick={go}>
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
          {!pick && <p className={T.meta}>Pick how it goes out.</p>}
        </>
      }
    >
      <p id="m-publish-label" className={T.section}>
        How it goes out
      </p>
      <div role="radiogroup" aria-labelledby="m-publish-label" className="flex flex-col gap-4 pb-4">
        {items.map((it) => {
          const on = pick === it.id;
          return (
            <label
              key={it.id}
              className={cn(
                "relative flex cursor-pointer items-start gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border",
              )}
            >
              <input type="radio" name="m-publish" className="sr-only" checked={on} onChange={() => setPick(it.id as PublishIntent)} />
              <Radio checked={on} decorative className="mt-1" />
              <span className="flex flex-col gap-1">
                <span className={T.rowTitle}>{it.label}</span>
                <span className={T.meta}>{status === "private" && it.id === "sell" ? "List it on Explore marketplace." : it.sub}</span>
                <span className={T.meta}>{it.requirement}</span>
              </span>
            </label>
          );
        })}
      </div>
    </Sheet>
  );
}

// ─────────────────────────── 08b · readiness ───────────────────────────

function ReadinessSheet({ purpose, then, onClose }: { purpose: ReadinessPurpose; then: string | null; onClose: () => void }) {
  const { project } = useProject();
  const router = useRouter();
  const readiness = useLiveReadiness(purpose);
  const copy = readinessCopy(purpose);
  const blocker = dialogBlockerOf(readiness);
  return (
    <Sheet
      open
      onClose={onClose}
      title={copy.title}
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            disabled={blocker !== null}
            onClick={() => {
              onClose();
              if (then) router.push(then);
            }}
          >
            {copy.cta}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          {blocker && <p className={T.meta}>{blocker}</p>}
        </>
      }
    >
      <Banner tone="info">{copy.info}</Banner>
      <ReadinessRows readiness={readiness} projectId={project.id} />
    </Sheet>
  );
}
