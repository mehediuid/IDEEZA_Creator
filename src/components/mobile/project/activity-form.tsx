"use client";

// 04b / 04e · Add new activity and Edit activity, full screen (04c, 04f,
// 04o–04s): the web's form (activity/form.tsx) with its rules and words —
// Activity Type (a pick-one sheet with each type's help under it, 04c), the
// Activity Name for Others (1–40), Description (1–400), Attach links
// (optional, https only), Attach media (at least one photo, video, PDF or
// document; each file really saved to this browser before Add now counts it).
// Errors show after Add now (04f); a file that can't be saved says so (04p);
// Add now waits while files save (04o). Editing keeps at least one file, so
// the only one can't be removed (04e). Cancel · Add now ride on the keyboard
// (04s). A price snapshot is taken when it is added while listed (04i).
// Cancel and Back ask "Discard this activity?" once anything was typed or
// attached (07g pattern), since the files picked here are dropped on leaving.

import * as React from "react";
import { ArrowDown01Icon, Cancel01Icon, CloudUploadIcon, Doc01Icon, Image01Icon, InformationCircleIcon, Pdf01Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { FIELD_LABEL, Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput, Textarea } from "@/components/ideeza/text-input";
import { useMinuteClock, useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { catalogueOf, checkActivity, labelOf, snapshotPrices, historyOf, type Activity, type ActivityTarget, type LiveListingFacts, type MediaRef } from "@/lib/manual/journey";
import { productAddedAt } from "@/lib/manual/journey-dates";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { phoneProductPath } from "@/lib/manual/phone-product";
import { deleteMediaFiles, getMediaFile, putMediaFile, useJourney } from "@/lib/manual/journey-store";
import { listingViewOf } from "@/lib/market/listing";
import { useEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { randomId } from "@/lib/market/sales";
import type { ListingMetadata } from "@/lib/market/types";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { useGoBack } from "../nav-trail";
import { Sheet } from "../kit/sheet";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { ProjectLoading, ProjectMissing } from "./project-screen";

const NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const ACCEPT =
  "image/png,image/jpeg,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*";
const TARGET: ActivityTarget = { kind: "project" };
/** The time a save is stamped with, read when it is pressed. */
const stamp = () => Date.now();

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

const KIND_ICON = { image: Image01Icon, video: Video01Icon, pdf: Pdf01Icon, doc: Doc01Icon } as const;

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

export function ActivityFormScreen({
  projectId,
  activityId,
  productId = null,
}: {
  projectId: string;
  activityId: string | null;
  /** A product's own activity (Product Details 10s), from its product page: its target, its back. */
  productId?: string | null;
}) {
  const data = useProjectPageData(projectId, "project");
  const { hydrated, record } = useJourney(data.state === "ready" ? data.project.id : null);
  if (data.state === "loading" || (data.state === "ready" && !hydrated)) return <ProjectLoading />;
  const product = productId && data.state === "ready" ? (data.view.products.find((p) => p.id === productId) ?? null) : null;
  const back = productId ? phoneProductPath(projectId, productId, "activity") : phoneProjectHref(projectId, "activity");
  if (data.state === "missing") return <ProjectMissing />;
  if (productId && !product) return <ProjectMissing thing="product" back={phoneProjectHref(projectId, "products")} backLabel="Back to Products" />;
  const target: ActivityTarget = product ? { kind: "product", productId: product.id } : TARGET;
  const defaultAt = product ? productAddedAt(data.project, data.view.refs, product) : data.project.createdAt;
  const entry = activityId ? (historyOf(record, data.project.id, target, defaultAt).find((e) => e.id === activityId && !e.isDefault) ?? null) : null;
  if (activityId && !entry) return <ProjectMissing thing="activity" back={back} backLabel="Back to Activity" />;
  return (
    <ActivityForm
      key={entry?.id ?? "new"}
      projectId={data.project.id}
      products={data.view.products}
      entry={entry}
      back={back}
      target={target}
      forName={product ? displayProductName(product.name) : null}
    />
  );
}

/** The facts `snapshotPrices` reads, live (the web drawer's `useLiveListingFacts`). */
function useListingFacts(projectId: string, products: { id: string; name: string }[]): LiveListingFacts {
  const { data } = useMarket();
  const editions = useEditions(projectId);
  const now = useMinuteClock();
  return React.useMemo(() => {
    const current: ListingMetadata = { name: "", description: "", products, cover: null, at: 0 };
    const view = listingViewOf(projectId, { listings: data.listings, sales: data.sales, bids: data.bids, now, current });
    const main =
      view.kind === "live" && view.listing.type === "buyNow" && view.listing.price
        ? { token: view.listing.token, price: view.listing.price, at: view.listing.updatedAt }
        : undefined;
    const live = editions.record
      .filter((t) => t.listing !== null)
      .map((t) => ({ productId: t.productId, kind: t.kind, use: t.use, regular: t.listing!.regular, extended: t.listing!.extended }));
    return { main, editions: live };
  }, [projectId, products, data.listings, data.sales, data.bids, editions.record, now]);
}

function ActivityForm({
  projectId,
  products,
  entry,
  back,
  target = TARGET,
  forName = null,
}: {
  projectId: string;
  products: { id: string; name: string }[];
  entry: Activity | null;
  back: string;
  target?: ActivityTarget;
  /** A product's name: the form says whose activity it adds and where its NFTs' activity is. */
  forName?: string | null;
}) {
  const toast = useToast();
  const { record, write } = useJourney(projectId);
  const listingFacts = useListingFacts(projectId, products);
  const mode = entry ? "edit" : "add";
  const ids = useFieldIds(["type", "name", "description", "media"] as const);
  const [type, setType] = React.useState(entry?.type ?? "");
  const [picking, setPicking] = React.useState(false);
  const [rules, setRules] = React.useState(false);
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
  const [leaving, setLeaving] = React.useState<(() => void) | null>(null);
  const goBack = useGoBack(back);

  // A file this form wrote is dropped again unless the entry is saved (quota is real).
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
  // Thumbnails for the entry's own images.
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
    const pricing = mode === "add" ? snapshotPrices(listingFacts) : entry?.pricing;
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
    goBack();
  };

  const failed = files.filter((f) => f.status === "error").length;
  // Anything typed, linked or attached that Save hasn't kept yet.
  const dirty = entry
    ? type !== entry.type ||
      customName !== (entry.customName ?? "") ||
      description !== entry.description ||
      urls.join("\n") !== entry.urls.join("\n") ||
      files.length !== entry.media.length ||
      files.some((f) => f.isNew)
    : type !== "" || customName.trim() !== "" || description.trim() !== "" || urls.some((u) => u.trim()) || files.length > 0;
  const leave = (go: () => void) => (dirty && !saving ? setLeaving(() => go) : go());
  return (
    <Screen
      top={
        <TopBar
          back={back}
          onBack={leave}
          title={mode === "add" ? "Add new activity" : "Edit activity"}
          actions={[{ icon: InformationCircleIcon, label: "What this needs", onClick: () => setRules(true) }]}
        />
      }
      footer={
        <BottomBar className="flex-row gap-6 pt-8">
          <Button hierarchy="secondary" size="xl" className="flex-1" onClick={() => leave(goBack)}>
            Cancel
          </Button>
          <Button size="xl" className="flex-1" type="submit" form="m-activity-form" loading={busy}>
            {mode === "add" ? "Add now" : "Update"}
          </Button>
        </BottomBar>
      }
    >
      <form id="m-activity-form" onSubmit={submit} noValidate className="flex flex-col gap-8 px-8 pb-12">
        {forName && <p className={T.body}>For {forName}. Its NFTs get their own activity in Earn › Sell.</p>}

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
            <span className={T.caption}>
              {nameLen}/{NAME_MAX}
            </span>
          </Field>
        )}

        <Field label="Description" htmlFor={ids.description.id} error={descError} errorId={ids.description.errorId}>
          <Textarea
            id={ids.description.id}
            rows={4}
            value={description}
            onValueChange={setDescription}
            placeholder="What happened at this stage?"
            {...errorProps(descError, ids.description.errorId)}
          />
          <span className={T.caption}>
            {descLen}/{DESCRIPTION_MAX}
          </span>
        </Field>

        <div className="flex flex-col gap-3">
          <p className={FIELD_LABEL}>Attach links (optional)</p>
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
              {urlErrors[i] && <p className={cn(T.caption, "text-text-error")}>{urlErrors[i]}</p>}
            </div>
          ))}
          <div>
            <Button hierarchy="secondary" size="xl" onClick={() => setUrls((cur) => [...cur, ""])}>
              + Add URL
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p id={ids.media.id} className={FIELD_LABEL}>
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
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }} />
          {mediaError && (
            <p id={ids.media.errorId} className={cn(T.caption, "text-text-error")}>
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
                      <span className={cn(T.meta, f.status === "error" && "text-text-error")}>
                        {sizeOf(f.size)}
                        {f.status === "saving" ? " · Saving…" : f.status === "error" ? " · Couldn't save this file" : ""}
                      </span>
                    </span>
                    <Button
                      hierarchy="ghost"
                      size="xl"
                      iconOnly
                      aria-label={`Remove ${f.name}`}
                      disabled={lastProof}
                      onClick={() => removeFile(f.id)}
                    >
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

      <Sheet open={picking} onClose={() => setPicking(false)} title="Activity type">
        <ul role="radiogroup" aria-label="Activity type" className="-mx-2 flex flex-col pb-8">
          {types.map((t) => (
            <li key={t.id}>
              <label className="relative flex cursor-pointer items-start gap-6 rounded-md px-2 py-3 hover:bg-bg-subtle">
                <input
                  type="radio"
                  name="m-activity-type"
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
      <ConfirmSheet
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title={mode === "add" ? "Discard this activity?" : "Discard your changes?"}
        body={mode === "add" ? "What you typed and the files you added aren’t saved yet." : "Your changes to this activity aren’t saved yet."}
        verb="Discard"
        destructive
        cancelLabel="Keep editing"
        onConfirm={() => {
          const go = leaving;
          setLeaving(null);
          go?.();
        }}
      />
      {/* The form's rules (lens 1: off the form, one tap away). */}
      <Sheet open={rules} onClose={() => setRules(false)} title={mode === "add" ? "Add new activity" : "Edit activity"}>
        <p className={cn(T.body, "pb-8")}>
          {mode === "add"
            ? "Add at least one photo, video, PDF or document as proof — people who buy it see it in the journey. Everything is required unless it says optional."
            : "Changes update this entry in the journey. It keeps at least one file."}
        </p>
      </Sheet>
    </Screen>
  );
}
