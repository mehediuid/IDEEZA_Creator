"use client";

// The Add / Edit activity form (P2-TABS-7), carried from v1's ACT-43…63:
// Activity Type (required, the 11 stages plus Others, each with its own
// help), Activity Name for Others (1–40, live), Description (1–400, live),
// Attach URLs (https only) and Attach Media (real per-file saving — never a
// fake percentage), plus the Product select P2-TABS-7 adds. No price inputs
// (v1 §9): a price is a read-only snapshot taken at save time (P2-TABS-11),
// never edited here.
//
// It replaces the drawer's list view in place (Drawer's `onBack`), so it is
// the drawer's own header/body/footer, not a second dialog.

import * as React from "react";
import { Cancel01Icon, CloudUploadIcon, Doc01Icon, Image01Icon, Pdf01Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, SelectMenu, TextInput, Textarea } from "@/components/ideeza";
import {
  STAGES,
  checkActivity,
  snapshotPrices,
  type Activity,
  type ActivityInput,
  type LiveListingFacts,
  type MediaRef,
  type StageId,
} from "@/lib/manual/journey";
import { deleteMediaFiles, getMediaFile, putMediaFile } from "@/lib/manual/journey-store";
import { randomId } from "@/lib/market/sales";
import { cn } from "@/lib/utils";
import type { WriteResult } from "@/lib/key-store";

const CUSTOM_NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const STORAGE_FULL = "Couldn't save — this browser's storage is full.";
const ACCEPT =
  "image/png,image/jpeg,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*";

function isHttpsUrl(u: string): boolean {
  return /^https:\/\//i.test(u.trim());
}

function classify(file: File): MediaRef["kind"] | null {
  const type = file.type;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  if (type === "application/msword" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "doc";
  }
  // Some drag sources report no MIME type at all — fall back on the extension.
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (ext === "doc" || ext === "docx") return "doc";
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_ICON: Record<MediaRef["kind"], typeof Pdf01Icon> = {
  image: Image01Icon,
  video: Video01Icon,
  pdf: Pdf01Icon,
  doc: Doc01Icon,
};

type AttachedFile = {
  id: string;
  name: string;
  mime: string;
  kind: MediaRef["kind"];
  size: number;
  blobKey: string;
  status: "saving" | "done" | "error";
  previewUrl: string | null;
  /** True only for a file attached during this session — Cancel / remove
   *  clean up its blob; a survivor from the entry being edited never does. */
  isNew: boolean;
};

function blobKeysOf(media: readonly MediaRef[]): string[] {
  return media.flatMap((m) => (m.posterKey ? [m.blobKey, m.posterKey] : [m.blobKey]));
}

export type ActivityFormProps = {
  mode: "add" | "edit";
  entry: Activity | null;
  projectId: string;
  products: { id: string; name: string }[];
  /** The product page's own product, defaulted on Add (P2-TABS-7). */
  defaultProductId?: string;
  /** LISTING's Main listing and this area's edition listings, live — read
   *  once at save time (P2-TABS-11); an edit never re-snapshots (ACT-98). */
  listingFacts: LiveListingFacts;
  onSubmit: (activity: Activity) => WriteResult;
  onSaved: (stageLabel: string) => void;
  /** The drawer's footer renders the Cancel / Add Now·Update pair outside
   *  this form's own scrolling body (Drawer's `footer` slot); the submit
   *  button reaches this form by the native `form="…"` attribute, so it
   *  never needs to be this element's DOM descendant. This reports busy
   *  state up so that pair can show "Saving…" and disable itself. */
  formId: string;
  onBusyChange: (busy: boolean) => void;
};

export function ActivityForm({
  mode,
  entry,
  projectId,
  products,
  defaultProductId,
  listingFacts,
  onSubmit,
  onSaved,
  formId,
  onBusyChange,
}: ActivityFormProps) {
  const [type, setType] = React.useState<StageId | "">(entry?.type ?? "");
  const [customName, setCustomName] = React.useState(entry?.customName ?? "");
  const [description, setDescription] = React.useState(entry?.description ?? "");
  const [urls, setUrls] = React.useState<string[]>(entry?.urls && entry.urls.length ? entry.urls : []);
  const [productId, setProductId] = React.useState<string>(entry ? (entry.productId ?? "") : (defaultProductId ?? ""));
  const [files, setFiles] = React.useState<AttachedFile[]>(() =>
    (entry?.media ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      mime: m.mime,
      kind: m.kind,
      size: m.size,
      blobKey: m.blobKey,
      status: "done" as const,
      previewUrl: null,
      isNew: false,
    })),
  );
  const [touched, setTouched] = React.useState(false);
  const [rejectedCount, setRejectedCount] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cleanup bookkeeping: a file this session wrote to IndexedDB is dropped if
  // the form never reaches a successful save (Cancel, Esc, the drawer's ×,
  // or navigating away mid-form) — quota is real, so nothing is left behind.
  const filesRef = React.useRef(files);
  React.useEffect(() => {
    filesRef.current = files;
  });
  const submittedRef = React.useRef(false);
  React.useEffect(
    () => () => {
      if (submittedRef.current) return;
      for (const f of filesRef.current) {
        if (f.isNew) void deleteMediaFiles([f.blobKey]);
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      }
    },
    [],
  );

  // Lazily load a thumbnail for the entry's own images (no local File object
  // to draw one from) — once, for the entry this form opened with.
  React.useEffect(() => {
    let cancelled = false;
    const targets = (entry?.media ?? []).filter((m) => m.kind === "image");
    for (const m of targets) {
      void getMediaFile(m.blobKey).then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        setFiles((cur) => cur.map((x) => (x.id === m.id ? { ...x, previewUrl: url } : x)));
      });
    }
    return () => {
      cancelled = true;
    };
    // Only the entry this form was opened with — the form never swaps entries mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeMeta = STAGES.find((s) => s.id === type) ?? null;
  const isOthers = type === "others";

  const nonBlankUrls = React.useMemo(() => urls.map((u) => u.trim()).filter(Boolean), [urls]);
  const attachmentsCount = files.filter((f) => f.status !== "error").length;
  const input: ActivityInput = { type, customName, description, urls: nonBlankUrls, attachments: attachmentsCount };
  const errors = checkActivity(input, products.length);

  const nameLen = Array.from(customName.trim()).length;
  const descLen = Array.from(description.trim()).length;

  // Live feedback (a length overflow, an https miss) shows as it happens;
  // "required" errors only once the maker has tried to save (ACT AC1 vs AC2/3).
  const showTypeError = touched && errors.type;
  const showNameError = isOthers && (nameLen > CUSTOM_NAME_MAX ? errors.customName : touched ? errors.customName : null);
  const showDescError = descLen > DESCRIPTION_MAX ? errors.description : touched ? errors.description : null;
  const showAttachError = touched ? errors.attachments : null;

  const stageOptions = STAGES.map((s) => ({ value: s.id, label: s.label, info: s.help }));
  const productOptions = [{ value: "", label: "Whole project" }, ...products.map((p) => ({ value: p.id, label: p.name }))];

  function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    let rejected = 0;
    for (const f of Array.from(list)) {
      const kind = classify(f);
      if (!kind) {
        rejected += 1;
        continue;
      }
      const id = randomId("med_");
      const blobKey = randomId("med_");
      const previewUrl = kind === "image" ? URL.createObjectURL(f) : null;
      setFiles((cur) => [
        ...cur,
        { id, name: f.name, mime: f.type, kind, size: f.size, blobKey, status: "saving", previewUrl, isNew: true },
      ]);
      void putMediaFile({ key: blobKey, projectId, blob: f, createdAt: Date.now() }).then((res) => {
        setFiles((cur) => cur.map((x) => (x.id === id ? { ...x, status: res.ok ? "done" : "error" } : x)));
      });
    }
    if (rejected) setRejectedCount(rejected);
  }

  function removeFile(id: string) {
    setFiles((cur) => {
      const target = cur.find((x) => x.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.isNew) void deleteMediaFiles([target.blobKey]);
      }
      return cur.filter((x) => x.id !== id);
    });
  }

  const filesBusy = files.some((f) => f.status === "saving");
  const busy = saving || filesBusy;
  React.useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!errors.ok || filesBusy || saving) return;

    setSaving(true);
    setSaveError(null);
    const now = Date.now();
    const media: MediaRef[] = files
      .filter((f) => f.status === "done")
      .map((f) => ({ id: f.id, name: f.name, mime: f.mime, kind: f.kind, size: f.size, blobKey: f.blobKey }));
    // ACT-98: editing never re-snapshots, and never touches a listing.
    const pricing = mode === "add" ? snapshotPrices(listingFacts) : entry?.pricing;

    const activity: Activity = {
      v: 1,
      id: entry?.id ?? randomId("act_"),
      projectId,
      ...(productId ? { productId } : {}),
      type: type as StageId,
      ...(isOthers && customName.trim() ? { customName: customName.trim() } : {}),
      description: description.trim(),
      urls: nonBlankUrls,
      media,
      ...(pricing ? { pricing } : {}),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    };

    const result = onSubmit(activity);
    if (!result.ok) {
      setSaving(false);
      setSaveError(STORAGE_FULL);
      return;
    }
    // An edit that dropped a media item cleans up its now-orphaned blob(s).
    if (mode === "edit" && entry) {
      const kept = new Set(blobKeysOf(media));
      const orphaned = blobKeysOf(entry.media).filter((k) => !kept.has(k));
      if (orphaned.length) void deleteMediaFiles(orphaned);
    }
    submittedRef.current = true;
    setSaving(false);
    const label = isOthers ? customName.trim() || "Activity" : (typeMeta?.label ?? "Activity");
    onSaved(label);
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <p className="text-sm text-text-secondary">
        {mode === "add"
          ? "Show this stage with photos, videos, files or links — buyers see them in your product journey."
          : "Changes update this stage in your product journey."}
      </p>

      <div className="flex flex-col gap-2">
        <SelectMenu<StageId>
          label="Activity Type"
          value={type || null}
          options={stageOptions}
          placeholder="Choose a stage"
          onChange={(v) => setType(v)}
          error={showTypeError ? errors.type ?? undefined : undefined}
        />
      </div>

      {isOthers && (
        <div className="flex flex-col gap-2">
          <label htmlFor="activity-name" className="text-md text-input-label">
            Activity Name
          </label>
          <TextInput
            id="activity-name"
            value={customName}
            onValueChange={setCustomName}
            invalid={!!showNameError}
            maxLength={200}
            placeholder="Name this stage"
          />
          <div className="flex items-center justify-between text-sm">
            <span className={cn(showNameError ? "text-text-error" : "text-text-tertiary")}>
              {showNameError ?? ""}
            </span>
            <span className="tabular-nums text-text-tertiary">
              {nameLen}/{CUSTOM_NAME_MAX}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="activity-description" className="text-md text-input-label">
          Description
        </label>
        <Textarea
          id="activity-description"
          value={description}
          onValueChange={setDescription}
          invalid={!!showDescError}
          rows={4}
          placeholder="What happened at this stage?"
        />
        <div className="flex items-center justify-between text-sm">
          <span className={cn(showDescError ? "text-text-error" : "text-text-tertiary")}>{showDescError ?? ""}</span>
          <span className="tabular-nums text-text-tertiary">
            {descLen}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {products.length >= 2 && (
        <SelectMenu
          label="Product"
          value={productId}
          options={productOptions}
          placeholder="Whole project"
          onChange={setProductId}
        />
      )}

      <UrlsSection urls={urls} onChange={setUrls} />

      <MediaSection
        files={files}
        dragOver={dragOver}
        fileInputRef={fileInputRef}
        onDragOver={setDragOver}
        onFiles={handleFiles}
        onRemove={removeFile}
        rejectedCount={rejectedCount}
        onDismissRejected={() => setRejectedCount(0)}
      />

      {showAttachError && (
        <p role="alert" className="text-sm text-text-error">
          {showAttachError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm text-text-error">
          {saveError}
        </p>
      )}
    </form>
  );
}

/** The pinned Cancel / Add Now·Update pair — rendered in the Drawer's
 *  `footer` slot (outside this form's own scrolling body), reaching the
 *  form by the native `form="…"` attribute rather than DOM nesting. */
export function ActivityFormFooter({
  formId,
  mode,
  busy,
  onCancel,
}: {
  formId: string;
  mode: "add" | "edit";
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-4">
      <Button type="button" hierarchy="ghost" size="lg" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button type="submit" form={formId} hierarchy="primary" size="lg" disabled={busy} className="ml-auto">
        {busy ? "Saving…" : mode === "add" ? "Add Now" : "Update"}
      </Button>
    </div>
  );
}

// ─────────────────────────── Attach URLs ───────────────────────────

function UrlsSection({ urls, onChange }: { urls: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-md text-input-label">Attach URLs</span>
      {urls.map((u, i) => {
        const shown = u.trim() !== "" && !isHttpsUrl(u);
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <TextInput
                value={u}
                onValueChange={(v) => onChange(urls.map((x, j) => (j === i ? v : x)))}
                invalid={shown}
                placeholder="https://…"
                aria-label={`Link ${i + 1}`}
                containerClassName="flex-1"
              />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                aria-label={`Remove link ${i + 1}`}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            {shown && (
              <p role="alert" className="text-sm text-text-error">
                Please enter a valid URL starting with https://
              </p>
            )}
          </div>
        );
      })}
      <Button type="button" hierarchy="secondary" size="sm" className="self-start" onClick={() => onChange([...urls, ""])}>
        + Add URL
      </Button>
    </div>
  );
}

// ─────────────────────────── Attach Media ───────────────────────────

function MediaSection({
  files,
  dragOver,
  fileInputRef,
  onDragOver,
  onFiles,
  onRemove,
  rejectedCount,
  onDismissRejected,
}: {
  files: AttachedFile[];
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (v: boolean) => void;
  onFiles: (list: FileList | null) => void;
  onRemove: (id: string) => void;
  rejectedCount: number;
  onDismissRejected: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-md text-input-label">Attach Media</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(true);
        }}
        onDragLeave={() => onDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
          dragOver ? "border-border-brand bg-bg-brand-subtle" : "border-border hover:border-border-strong",
        )}
      >
        <Icon icon={CloudUploadIcon} size={22} className="text-text-tertiary" />
        <p className="text-sm font-medium text-text-primary">Click or drag a file to upload</p>
        <p className="text-xs text-text-tertiary">PNG, JPG, PDF, DOC, GIF, Video or DOCX</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {rejectedCount > 0 && (
        <p role="alert" className="text-sm text-text-error">
          {rejectedCount === 1 ? "One file wasn't a supported type." : `${rejectedCount} files weren't a supported type.`}{" "}
          <button type="button" onClick={onDismissRejected} className="underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}
      {files.length > 0 && (
        <ul role="list" className="flex flex-col gap-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-solid border-border bg-bg-surface px-4 py-3"
            >
              {f.kind === "image" && f.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.previewUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded bg-bg-subtle text-text-tertiary">
                  <Icon icon={KIND_ICON[f.kind]} size={18} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text-primary">{f.name}</span>
                <span className="block text-xs text-text-tertiary">
                  {formatSize(f.size)}
                  {f.status === "saving" && " · Saving…"}
                  {f.status === "error" && " · Couldn't save this file"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                aria-label={`Remove ${f.name}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
              >
                <Icon icon={Cancel01Icon} size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
