"use client";

// Earn › Sell's NFT activity (the web's nft-activity.tsx; Figma 14b's
// "Activity + Add · latest ›" line, 14h / 14i, 04j–04l). On every Sell row that
// exists — the Main NFT once minted, a Physical / Virtual scope once it has
// copies — one line: "Activity", + Add, and the latest entry (its type, its
// date, how many) opening the history. The history is a pushed screen:
// "{project} · {NFT} · newest first. Buyers see these on the listing.", Add
// activity, each entry with its type's help (?) and ⋮ Edit · Delete (asks
// first); none yet says what to add. Add / Edit is the full-screen form with
// the NFT's own type list (Main: IP / Patent · Partnership · Sales report ·
// Milestone · Roadmap · Others; Physical; Virtual), the web's rules
// (`checkActivity`) and words; files are saved to this browser before Add
// now counts them, and a listed project's prices are kept with a new entry.

import * as React from "react";
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  CloudUploadIcon,
  Delete02Icon,
  Doc01Icon,
  HelpCircleIcon,
  Image01Icon,
  MoreVerticalIcon,
  PencilEdit01Icon,
  Pdf01Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import {
  activitiesOf,
  catalogueOf,
  checkActivity,
  labelOf,
  snapshotPrices,
  targetNameOf,
  typeDefOf,
  type Activity,
  type ActivityTarget,
  type LiveListingFacts,
  type MediaRef,
} from "@/lib/manual/journey";
import { deleteMediaFiles, getMediaFile, putMediaFile, removeActivity, useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { randomId } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../../kit/sheet";
import { useToast } from "../../kit/toast";
import { useMediaUrl } from "../../project/activity-tab";
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { useEarn } from "../context";
import { FullLayer, LINK_SM } from "./parts";
import { T } from "../../type";

const NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const ACCEPT =
  "image/png,image/jpeg,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*";
const KIND_ICON = { image: Image01Icon, video: Video01Icon, pdf: Pdf01Icon, doc: Doc01Icon } as const;
/** The time a save is stamped with, read when it is pressed. */
const stamp = () => Date.now();

const NFT_WORD: Record<"main" | "physical" | "virtual", string> = { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" };

function classify(file: File): MediaRef["kind"] | null {
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t === "application/pdf") return "pdf";
  if (t === "application/msword" || t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "doc";
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "doc";
  return null;
}

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type NftTarget = Extract<ActivityTarget, { kind: "main" | "physical" | "virtual" }>;

/** The facts `snapshotPrices` reads, from the Earn screen's one derivation. */
function listingFactsOf(view: ReturnType<typeof useEarn>["view"]): LiveListingFacts {
  const l = view.listing;
  const main =
    l.kind === "live" && l.listing.type === "buyNow" && l.listing.price ? { token: l.listing.token, price: l.listing.price, at: l.listing.updatedAt } : undefined;
  const editions = view.editions
    .filter((t) => t.listing !== null)
    .map((t) => ({ productId: t.productId, kind: t.kind, use: t.use, regular: t.listing!.regular, extended: t.listing!.extended }));
  return { main, editions };
}

/** "Activity [+ Add] Milestone · Oct 28, 2026 · 1 ›" inside a Sell row. */
export function NftActivityLine({ target }: { target: NftTarget }) {
  const { project, view, viewer } = useEarn();
  const { hydrated, record } = useJourney(project.id);
  const [open, setOpen] = React.useState<"list" | "add" | null>(null);
  if (!hydrated) return null;
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const stored = activitiesOf(record, target);
  const latest = stored[0] ?? null;
  if (!latest && !canWrite) return null;
  const name = nameOf(target, project.name, view.products);
  return (
    <div className="flex flex-col gap-1">
      <p className={cn(T.meta, "flex flex-wrap items-center gap-x-4")}>
        <span className="text-text-secondary">Activity</span>
        {canWrite && (
          <button type="button" onClick={() => setOpen("add")} aria-label={`Add activity for ${name}`} className={cn(LINK_SM, "-my-6 inline-flex min-h-[44px] items-center gap-1")}>
            <Icon icon={Add01Icon} size={12} />
            Add
          </button>
        )}
        {!latest && <span className="text-text-secondary">None yet</span>}
      </p>
      {latest && (
        <button
          type="button"
          onClick={() => setOpen("list")}
          aria-label={`${name} activity: ${labelOf(latest)}, ${formatDate(latest.createdAt)}. History, ${stored.length}`}
          className={cn(LINK_SM, "-my-5 inline-flex min-h-[44px] items-center self-start text-left")}
        >
          {`${labelOf(latest)} · ${formatDate(latest.createdAt)} · ${stored.length} ›`}
        </button>
      )}
      {open === "list" && <NftHistory target={target} onClose={() => setOpen(null)} />}
      {open === "add" && <NftActivityForm target={target} entry={null} onClose={() => setOpen(null)} />}
    </div>
  );
}

function nameOf(target: NftTarget, project: string, products: readonly { id: string; name: string }[]): string {
  return targetNameOf(target, {
    project: project.trim() || "Untitled project",
    productName: (id) => displayProductName(products.find((p) => p.id === id)?.name ?? "A product"),
  });
}

/** 14h / 14i · the NFT's activity, newest first. */
function NftHistory({ target, onClose }: { target: NftTarget; onClose: () => void }) {
  const { project, view, viewer } = useEarn();
  const { record } = useJourney(project.id);
  const toast = useToast();
  const entries = activitiesOf(record, target);
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const [form, setForm] = React.useState<{ entry: Activity | null } | null>(null);
  const [actions, setActions] = React.useState<Activity | null>(null);
  const [deleting, setDeleting] = React.useState<Activity | null>(null);
  const [help, setHelp] = React.useState<Activity | null>(null);
  const name = nameOf(target, project.name, view.products);
  return (
    <>
      <FullLayer title={`${NFT_WORD[target.kind]} activity`} onBack={onClose}>
        <div className="flex flex-col gap-8 px-8 pb-12 pt-8">
          <p className={T.meta}>{`${project.name} · ${name} · newest first. Buyers see these on the listing.`}</p>
          {canWrite && (
            <Button hierarchy="tonal" size="xl" className="w-full" iconLeading={<Icon icon={Add01Icon} size={20} />} onClick={() => setForm({ entry: null })}>
              Add activity
            </Button>
          )}
          {entries.length === 0 ? (
            <p className={T.meta}>
              No activity yet. Add what buyers should know — an award, a deal, a sales report or what’s next.
            </p>
          ) : (
            <ul aria-label={`${NFT_WORD[target.kind]} activity`} className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {entries.map((e) => (
                <li key={e.id} className="flex flex-col gap-2 px-8 pb-8 pt-4">
                  <div className="flex min-h-[44px] items-center">
                    <span className={T.rowTitle}>{labelOf(e)}</span>
                    {typeDefOf(e.target, e.type) && (
                      <button
                        type="button"
                        aria-label={`What is ${labelOf(e)}?`}
                        aria-haspopup="dialog"
                        onClick={() => setHelp(e)}
                        className="inline-flex size-[44px] items-center justify-center rounded-xl text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={HelpCircleIcon} size={20} />
                      </button>
                    )}
                    <span className="flex-1" />
                    {canWrite && (
                      <button
                        type="button"
                        aria-label={`Actions for ${labelOf(e)}`}
                        aria-haspopup="dialog"
                        onClick={() => setActions(e)}
                        className="-mr-4 inline-flex size-[44px] items-center justify-center rounded-xl text-[color:var(--color-icon-default)] outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <Icon icon={MoreVerticalIcon} size={20} />
                      </button>
                    )}
                  </div>
                  <time dateTime={new Date(e.createdAt).toISOString()} className={T.meta}>
                    {formatDate(e.createdAt)}
                  </time>
                  <p className={cn(T.body, "whitespace-pre-line break-words text-text-primary")}>{e.description}</p>
                  {e.media.length > 0 && (
                    <ul className="flex flex-wrap gap-4 pt-3">
                      {e.media.map((m) => (
                        <li key={m.id}>
                          <ProofTile media={m} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.urls.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {e.urls.map((u, i) => (
                        <li key={i}>
                          <a href={u} target="_blank" rel="noopener noreferrer" className={cn(LINK_SM, "break-all")}>
                            {u.replace(/^https:\/\//i, "")}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </FullLayer>
      <ActionSheet
        open={actions !== null}
        onClose={() => setActions(null)}
        title={actions ? `${labelOf(actions)} · ${formatDate(actions.createdAt)}` : undefined}
        items={
          actions
            ? [
                { label: "Edit Activity", icon: PencilEdit01Icon, onSelect: () => setForm({ entry: actions }) },
                { label: "Delete Activity", icon: Delete02Icon, destructive: true, onSelect: () => setDeleting(actions) },
              ]
            : []
        }
      />
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this activity?"
        body={deleting ? `“${labelOf(deleting)}” (${formatDate(deleting.createdAt)}). Its files, links and prices are removed from this browser. This can't be undone.` : null}
        verb="Delete activity"
        destructive
        onConfirm={async () => {
          const e = deleting;
          if (!e) return;
          const out = await removeActivity(project.id, e.id);
          toast(out.ok ? { title: `${labelOf(e)} deleted` } : { title: "Couldn't delete it — this browser's storage refused.", lead: "error" });
        }}
      />
      <Sheet open={help !== null} onClose={() => setHelp(null)} title={help ? `What is ${labelOf(help)}?` : ""}>
        {help && <p className={cn(T.body, "pb-8")}>{typeDefOf(help.target, help.type)?.help}</p>}
      </Sheet>
      {form && <NftActivityForm target={target} entry={form.entry} onClose={() => setForm(null)} />}
    </>
  );
}

function ProofTile({ media }: { media: MediaRef }) {
  const url = useMediaUrl(media.kind === "image" ? media.blobKey : null);
  return (
    <span title={media.name} className="relative flex size-[56px] items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised text-[color:var(--color-icon-secondary)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a proof file kept in this browser
        <img src={url} alt={media.name} className="absolute inset-0 size-full object-cover" />
      ) : (
        <Icon icon={KIND_ICON[media.kind]} size={24} />
      )}
    </span>
  );
}

type Attached = {
  id: string;
  name: string;
  mime: string;
  kind: MediaRef["kind"];
  size: number;
  blobKey: string;
  status: "saving" | "done" | "error";
  preview: string | null;
  isNew: boolean;
};

/** 04b / 04e for an NFT: the full-screen form, its type list the NFT's own (04j–04l). */
function NftActivityForm({ target, entry, onClose }: { target: NftTarget; entry: Activity | null; onClose: () => void }) {
  const { project, view } = useEarn();
  const projectId = project.id;
  const toast = useToast();
  const { record, write } = useJourney(projectId);
  const mode = entry ? "edit" : "add";
  const ids = useFieldIds(["type", "name", "description", "media"] as const);
  const [type, setType] = React.useState(entry?.type ?? "");
  const [picking, setPicking] = React.useState(false);
  const [customName, setCustomName] = React.useState(entry?.customName ?? "");
  const [description, setDescription] = React.useState(entry?.description ?? "");
  const [urls, setUrls] = React.useState<string[]>(entry?.urls ?? []);
  const [files, setFiles] = React.useState<Attached[]>(() =>
    (entry?.media ?? []).map((m) => ({ id: m.id, name: m.name, mime: m.mime, kind: m.kind, size: m.size, blobKey: m.blobKey, status: "done", preview: null, isNew: false })),
  );
  const [tried, setTried] = React.useState(false);
  const [rejected, setRejected] = React.useState(0);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // A file this form wrote is dropped again unless the entry is saved.
  const filesRef = React.useRef(files);
  React.useEffect(() => {
    filesRef.current = files;
  });
  const submitted = React.useRef(false);
  React.useEffect(
    () => () => {
      if (submitted.current) return;
      for (const f of filesRef.current) {
        if (f.isNew) void deleteMediaFiles([f.blobKey]);
        if (f.preview) URL.revokeObjectURL(f.preview);
      }
    },
    [],
  );
  React.useEffect(() => {
    let alive = true;
    for (const m of entry?.media ?? []) {
      if (m.kind !== "image") continue;
      void getMediaFile(m.blobKey).then((blob) => {
        if (!alive || !blob) return;
        const url = URL.createObjectURL(blob);
        setFiles((cur) => cur.map((x) => (x.id === m.id ? { ...x, preview: url } : x)));
      });
    }
    return () => {
      alive = false;
    };
  }, [entry]);

  const isOthers = type === "others";
  const kept = urls.map((u) => u.trim()).filter(Boolean);
  const count = files.filter((f) => f.status !== "error").length;
  const errors = checkActivity({ type, customName, description, urls: kept, attachments: count });
  const nameLen = Array.from(customName.trim()).length;
  const descLen = Array.from(description.trim()).length;
  const typeError = tried ? errors.type : null;
  const nameError = isOthers ? (nameLen > NAME_MAX || tried ? errors.customName : null) : null;
  const descError = descLen > DESCRIPTION_MAX || tried ? errors.description : null;
  const mediaError = tried ? errors.attachments : null;
  const urlErrors = urls.map((u) => {
    const i = kept.indexOf(u.trim());
    return u.trim() && i >= 0 && tried ? errors.urls[i] : null;
  });
  const busy = saving || files.some((f) => f.status === "saving");
  const types = catalogueOf(target);
  const picked = types.find((t) => t.id === type) ?? null;

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    let bad = 0;
    for (const f of Array.from(list)) {
      const kind = classify(f);
      if (!kind) {
        bad += 1;
        continue;
      }
      const id = randomId("med_");
      const blobKey = randomId("med_");
      const preview = kind === "image" ? URL.createObjectURL(f) : null;
      setFiles((cur) => [...cur, { id, name: f.name, mime: f.type, kind, size: f.size, blobKey, status: "saving", preview, isNew: true }]);
      void putMediaFile({ key: blobKey, projectId, blob: f, createdAt: Date.now() }).then((res) =>
        setFiles((cur) => cur.map((x) => (x.id === id ? { ...x, status: res.ok ? "done" : "error" } : x))),
      );
    }
    setRejected(bad);
  };

  const removeFile = (id: string) =>
    setFiles((cur) => {
      const f = cur.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      if (f?.isNew) void deleteMediaFiles([f.blobKey]);
      return cur.filter((x) => x.id !== id);
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (busy || !errors.ok) return;
    setSaving(true);
    setSaveError(null);
    const now = stamp();
    const media: MediaRef[] = files
      .filter((f) => f.status === "done")
      .map((f) => ({ id: f.id, name: f.name, mime: f.mime, kind: f.kind, size: f.size, blobKey: f.blobKey }));
    const pricing = mode === "add" ? snapshotPrices(listingFactsOf(view)) : entry?.pricing;
    const activity: Activity = {
      v: 2,
      id: entry?.id ?? randomId("act_"),
      projectId,
      target,
      type,
      ...(isOthers && customName.trim() ? { customName: customName.trim() } : {}),
      description: description.trim(),
      urls: kept,
      media,
      ...(pricing ? { pricing } : {}),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    };
    const next = entry
      ? { ...record, activities: record.activities.map((a) => (a.id === activity.id ? activity : a)) }
      : { ...record, activities: [...record.activities, activity] };
    if (!write(next).ok) {
      setSaving(false);
      setSaveError("Couldn't save — this browser's storage is full.");
      return;
    }
    if (entry) {
      const keep = new Set(media.flatMap((m) => [m.blobKey, ...(m.posterKey ? [m.posterKey] : [])]));
      const orphaned = entry.media.flatMap((m) => [m.blobKey, ...(m.posterKey ? [m.posterKey] : [])]).filter((k) => !keep.has(k));
      if (orphaned.length) void deleteMediaFiles(orphaned);
    }
    submitted.current = true;
    toast({ title: `${labelOf({ target, type, customName })} ${mode === "add" ? "added" : "updated"}` });
    onClose();
  };

  const failed = files.filter((f) => f.status === "error").length;
  const formId = React.useId();
  return (
    <>
      <FullLayer
        title={mode === "add" ? "Add new activity" : "Edit activity"}
        onBack={onClose}
        footer={
          <BottomBar className="flex-row gap-6 pt-8">
            <Button hierarchy="secondary" size="xl" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button size="xl" className="flex-1" type="submit" form={formId} loading={busy}>
              {mode === "add" ? "Add now" : "Update"}
            </Button>
          </BottomBar>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-8 px-8 pb-12">
          <p className={T.body}>
            {mode === "add"
              ? "Add at least one photo, video, PDF or document as proof — people who buy it see it in the journey. Everything is required unless it says optional."
              : "Changes update this entry in the journey. It keeps at least one file."}
          </p>
          <Field label="Activity type" htmlFor={ids.type.id} error={typeError} errorId={ids.type.errorId}>
            <button
              id={ids.type.id}
              type="button"
              aria-haspopup="dialog"
              aria-describedby={typeError ? ids.type.errorId : undefined}
              onClick={() => setPicking(true)}
              className={cn(
                "flex h-[44px] w-full items-center justify-between gap-4 rounded-xl border-[length:var(--border-width-1-5)] border-solid bg-[var(--color-input-bg)] px-6 text-left outline-none focus-visible:shadow-focus-brand",
                typeError ? "border-[var(--color-input-border-error)]" : "border-[var(--color-input-border)]",
              )}
            >
              <span className={cn(T.bodyLg, "truncate", picked ? "text-[color:var(--color-input-text)]" : "text-[color:var(--color-input-placeholder)]")}>
                {picked?.label ?? "Choose a type"}
              </span>
              <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-[color:var(--color-icon-default)]" />
            </button>
          </Field>
          {isOthers && (
            <Field label="Activity Name" htmlFor={ids.name.id} error={nameError} errorId={ids.name.errorId}>
              <TextInput id={ids.name.id} size="xl" value={customName} onValueChange={setCustomName} autoComplete="off" {...errorProps(nameError, ids.name.errorId)} />
              <span className={T.meta}>
                {nameLen}/{NAME_MAX}
              </span>
            </Field>
          )}
          <Field label="Description" htmlFor={ids.description.id} error={descError} errorId={ids.description.errorId}>
            <Textarea id={ids.description.id} rows={4} value={description} onValueChange={setDescription} {...errorProps(descError, ids.description.errorId)} />
            <span className={T.meta}>
              {descLen}/{DESCRIPTION_MAX}
            </span>
          </Field>
          <div className="flex flex-col gap-3">
            <p className={T.rowTitle}>Attach links (optional)</p>
            {urls.map((u, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <TextInput
                    size="xl"
                    type="url"
                    inputMode="url"
                    value={u}
                    placeholder="https://…"
                    aria-label={`Link ${i + 1}`}
                    invalid={!!urlErrors[i]}
                    onValueChange={(v) => setUrls((cur) => cur.map((x, j) => (j === i ? v : x)))}
                    containerClassName="min-w-0 flex-1"
                  />
                  <Button hierarchy="ghost" size="xl" iconOnly aria-label={`Remove link ${i + 1}`} onClick={() => setUrls((cur) => cur.filter((_, j) => j !== i))}>
                    <Icon icon={Cancel01Icon} size={20} />
                  </Button>
                </div>
                {urlErrors[i] && <p className={cn(T.meta, "text-text-error")}>{urlErrors[i]}</p>}
              </div>
            ))}
            <div>
              <Button hierarchy="secondary" size="xl" onClick={() => setUrls((cur) => [...cur, ""])}>
                + Add URL
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p id={ids.media.id} className={T.rowTitle}>
              Attach media
            </p>
            <button
              type="button"
              aria-describedby={mediaError ? ids.media.errorId : undefined}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-[length:var(--border-width-1-5)] border-dashed px-8 py-8 text-center outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                mediaError ? "border-[var(--color-input-border-error)]" : "border-border",
              )}
            >
              <Icon icon={CloudUploadIcon} size={24} className="text-[color:var(--color-icon-default)]" />
              <span className={T.rowTitle}>Tap to add a photo, video or file</span>
              <span className={T.meta}>PNG, JPG, PDF, DOC, GIF, Video or DOCX</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              data-nft-activity-files=""
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {mediaError && (
              <p id={ids.media.errorId} className={cn(T.meta, "text-text-error")}>
                {mediaError}
              </p>
            )}
            {files.length > 0 && (
              <ul className="flex flex-col gap-4">
                {files.map((f) => {
                  const lastProof = mode === "edit" && files.filter((x) => x.status !== "error").length <= 1 && f.status !== "error";
                  return (
                    <li key={f.id} className="flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-4">
                      <span className="relative flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised text-[color:var(--color-icon-secondary)]">
                        {f.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element -- the picked file, before it is saved
                          <img src={f.preview} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <Icon icon={KIND_ICON[f.kind]} size={20} />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={cn(T.body, "truncate text-text-primary")}>{f.name}</span>
                        <span className={cn(T.meta, f.status === "error" ? "text-text-error" : "text-text-secondary")}>
                          {sizeOf(f.size)}
                          {f.status === "saving" ? " · Saving…" : f.status === "error" ? " · Couldn't save this file" : ""}
                        </span>
                      </span>
                      <Button hierarchy="ghost" size="xl" iconOnly aria-label={`Remove ${f.name}`} disabled={lastProof} onClick={() => removeFile(f.id)}>
                        <Icon icon={Cancel01Icon} size={20} />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {mode === "edit" && count <= 1 && <p className={T.meta}>Keep at least one file as proof. Add another to remove this one.</p>}
            {(failed > 0 || rejected > 0) && (
              <Banner tone="error" title={failed > 0 ? "Couldn't save — this browser's storage is full." : "Some files weren't added."}>
                {[
                  failed > 0 ? "Free up some space, then try again." : null,
                  rejected > 0 ? `${rejected === 1 ? "One file wasn't" : `${rejected} files weren't`} a supported type.` : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </Banner>
            )}
            {saveError && <Banner tone="error">{saveError}</Banner>}
          </div>
        </form>
      </FullLayer>
      <Sheet open={picking} onClose={() => setPicking(false)} title={`${NFT_WORD[target.kind]} activity type`}>
        <ul role="radiogroup" aria-label={`${NFT_WORD[target.kind]} activity type`} className="-mx-2 flex flex-col pb-8">
          {types.map((t) => (
            <li key={t.id}>
              <label className="relative flex cursor-pointer items-start gap-6 rounded-md px-2 py-3 hover:bg-bg-subtle">
                <input
                  type="radio"
                  name={`m-nft-activity-type-${target.kind}`}
                  className="sr-only"
                  checked={type === t.id}
                  onChange={() => {
                    setType(t.id);
                    setPicking(false);
                  }}
                />
                <Radio checked={type === t.id} decorative className="mt-1" />
                <span className="flex flex-col gap-1">
                  <span className={T.bodyLg}>{t.label}</span>
                  <span className={T.meta}>{t.help}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
