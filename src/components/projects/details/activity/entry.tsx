"use client";

// One Activity History entry (P2-TABS-6…8, -11): its title row with the
// stage's own "?", the date and product-tag line, the 4-line description,
// its 60×60 media tiles and link cards, its price-snapshot pills, and the
// owner-only "⋮ Actions for {stage}" menu (Edit / Delete). The lightbox
// (CNT-18's pattern, generalised to video) lives here too, since only an
// entry's own media opens one.

import * as React from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Doc01Icon,
  HelpCircleIcon,
  Image01Icon,
  Link01Icon,
  MoreVerticalIcon,
  Pdf01Icon,
  SquareArrowUpRightIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { createPortal } from "react-dom";
import { Icon } from "@/components/dashboard/icon";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { Badge, TestnetDemoBadge, Tooltip } from "@/components/ideeza";
import { STAGES, type Activity, type MediaRef } from "@/lib/manual/journey";
import { getMediaFile } from "@/lib/manual/journey-store";
import { formatDate } from "@/lib/manual/project-summary";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import type { Token } from "@/lib/brief/types";
import type { EditionKind } from "@/lib/market/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<MediaRef["kind"], typeof Pdf01Icon> = {
  image: Image01Icon,
  video: Video01Icon,
  pdf: Pdf01Icon,
  doc: Doc01Icon,
};

const USE_LABEL: Record<"private" | "commercial", string> = {
  private: "Private use",
  commercial: "Commercial use",
};

function stageMetaOf(activity: Activity) {
  const meta = STAGES.find((s) => s.id === activity.type) ?? null;
  const title = activity.type === "others" ? activity.customName?.trim() || "Others" : (meta?.label ?? "Activity");
  return { title, help: meta?.help ?? "" };
}

async function downloadMedia(m: MediaRef): Promise<void> {
  const blob = await getMediaFile(m.blobKey);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = m.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─────────────────────────── a small hover/focus/tap bubble ───────────────────────────

function InfoBubble({ label, text }: { label: string; text: string }) {
  const [show, setShow] = React.useState(false);
  const tipId = React.useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={show ? tipId : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShow(false);
        }}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
      >
        <Icon icon={HelpCircleIcon} size={14} />
      </button>
      {show && (
        <span id={tipId} role="tooltip" className="pointer-events-none absolute left-0 top-full z-popover mt-2 w-max max-w-[260px]">
          <Tooltip label={text} />
        </span>
      )}
    </span>
  );
}

// ─────────────────────────── ⋮ Actions for {stage} ───────────────────────────

function EntryMenu({
  activityId,
  stage,
  onEdit,
  onDelete,
}: {
  activityId: string;
  stage: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const firstItemRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${stage}`}
        data-activity-actions={activityId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
      >
        <Icon icon={MoreVerticalIcon} size={16} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${stage}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const items = wrapRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
              if (!items || !items.length) return;
              const list = Array.from(items);
              const at = list.indexOf(document.activeElement as HTMLButtonElement);
              const next = e.key === "ArrowDown" ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
              list[next]?.focus();
            }
          }}
          className="absolute right-0 top-full z-popover mt-1 w-[200px] rounded-lg border border-solid border-border bg-bg-surface py-1 shadow-2"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              // The item goes with the menu: the keyboard waits on ⋮, which
              // the drawer hands it back to after the form or the confirm.
              triggerRef.current?.focus();
              setOpen(false);
              onEdit();
            }}
            className="block w-full px-4 py-3 text-left text-sm text-text-primary outline-none hover:bg-bg-subtle focus-visible:bg-bg-subtle"
          >
            Edit Activity
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              triggerRef.current?.focus();
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-4 py-3 text-left text-sm text-text-error outline-none hover:bg-bg-error-subtle focus-visible:bg-bg-error-subtle"
          >
            Delete Activity
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── media tile (60×60) ───────────────────────────

function MediaTile({ media, onView }: { media: MediaRef; onView: () => void }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (media.kind !== "image") return;
    let revoked = false;
    let objectUrl: string | null = null;
    void getMediaFile(media.blobKey).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [media.kind, media.blobKey]);

  const downloadable = media.kind === "pdf" || media.kind === "doc";
  const label = downloadable ? `Download ${media.name}` : `View ${media.name}`;

  return (
    <button
      type="button"
      onClick={() => (downloadable ? void downloadMedia(media) : onView())}
      aria-label={label}
      title={media.name}
      className="relative flex size-[60px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-solid border-border bg-bg-surface-raised outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {media.kind === "image" && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon icon={KIND_ICON[media.kind]} size={20} className="text-text-tertiary" />
      )}
    </button>
  );
}

// ─────────────────────────── the price pills (P2-TABS-11) ───────────────────────────

function productNameOf(products: readonly { id: string; name: string }[], id: string): string {
  return products.find((p) => p.id === id)?.name ?? "A product";
}

function minAmount(values: readonly string[]): string {
  return values.reduce((min, v) => (compareAmounts(v, min) < 0 ? v : min), values[0] ?? "0");
}

function EditionPopover({
  kind,
  rows,
  token,
  products,
}: {
  kind: EditionKind;
  rows: readonly { productId: string; use: "private" | "commercial"; regular: string; extended: string }[];
  token: Token;
  products: readonly { id: string; name: string }[];
}) {
  const [show, setShow] = React.useState(false);
  const title = kind === "physical" ? "Physical NFT price" : "Virtual NFT price";
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={show}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShow(false);
        }}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Badge tone="blue" className="cursor-pointer">
          {kind === "physical" ? "Physical" : "Virtual"} from{" "}
          {formatAmount(minAmount(rows.flatMap((r) => [r.regular, r.extended])), token)}
        </Badge>
      </button>
      {show && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-full z-popover mt-2 w-[280px] rounded-xl border border-solid border-border bg-bg-surface p-4 text-left shadow-3"
        >
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <div className="mt-3 flex flex-col gap-3">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-text-tertiary">{productNameOf(products, r.productId)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{USE_LABEL[r.use]} · Regular</span>
                  <span className="tabular-nums text-text-primary">{formatAmount(r.regular, token)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{USE_LABEL[r.use]} · Extended</span>
                  <span className="tabular-nums text-text-primary">{formatAmount(r.extended, token)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-tertiary">Listed prices when this entry was added — Testnet demo.</p>
        </div>
      )}
    </span>
  );
}

function PricePills({ activity, products }: { activity: Activity; products: readonly { id: string; name: string }[] }) {
  const pricing = activity.pricing;
  if (!pricing) return null;
  const physical = pricing.editions.filter((e) => e.kind === "physical");
  const virtual = pricing.editions.filter((e) => e.kind === "virtual");
  if (!pricing.main && !physical.length && !virtual.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {pricing.main && <Badge tone="blue">Main {formatAmount(pricing.main, pricing.token)}</Badge>}
      {physical.length > 0 && <EditionPopover kind="physical" rows={physical} token={pricing.token} products={products} />}
      {virtual.length > 0 && <EditionPopover kind="virtual" rows={virtual} token={pricing.token} products={products} />}
      <TestnetDemoBadge />
    </div>
  );
}

// ─────────────────────────── the entry card ───────────────────────────

export type ProductTag = { text: string; href?: string };

export function productTagOf(
  activity: Activity,
  scope: { productId: string } | undefined,
  products: readonly { id: string; name: string }[],
): ProductTag | null {
  if (!scope) {
    if (!activity.productId) return null;
    const p = products.find((x) => x.id === activity.productId);
    return p ? { text: p.name, href: `/projects/${activity.projectId}/products/${p.id}` } : { text: "A removed product" };
  }
  if (activity.productId) return null;
  return { text: "Whole project" };
}

export function ActivityEntry({
  activity,
  scope,
  products,
  canWrite,
  onEdit,
  onDeleteRequest,
  onOpenMedia,
  onOpenLink,
}: {
  activity: Activity;
  scope?: { productId: string };
  products: readonly { id: string; name: string }[];
  canWrite: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
}) {
  const { title, help } = stageMetaOf(activity);
  const tag = productTagOf(activity, scope, products);
  const viewable = activity.media.filter((m) => m.kind === "image" || m.kind === "video");

  return (
    <li className="border-b border-solid border-border py-6 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-md font-semibold text-text-primary">{title}</h3>
          {help && <InfoBubble label={`What is ${title}?`} text={help} />}
        </div>
        {canWrite && <EntryMenu activityId={activity.id} stage={title} onEdit={onEdit} onDelete={onDeleteRequest} />}
      </div>

      <p className="mt-1 text-sm text-text-tertiary">
        {formatDate(activity.createdAt)}
        {tag && (
          <>
            {" · "}
            {tag.href ? (
              <a href={tag.href} className="underline underline-offset-2 hover:text-text-secondary">
                {tag.text}
              </a>
            ) : (
              tag.text
            )}
          </>
        )}
      </p>

      {activity.description && <p className="mt-3 line-clamp-4 text-sm text-text-secondary">{activity.description}</p>}

      {activity.media.length > 0 && (
        <ul role="list" className="mt-4 flex flex-wrap gap-2">
          {activity.media.map((m) => (
            <li key={m.id}>
              <MediaTile media={m} onView={() => onOpenMedia(viewable, viewable.indexOf(m))} />
            </li>
          ))}
        </ul>
      )}

      {activity.urls.length > 0 && (
        <ul role="list" className="mt-3 flex flex-col gap-2">
          {activity.urls.map((u, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpenLink(u)}
                className="flex w-full items-center gap-2 rounded-lg border border-solid border-border px-4 py-3 text-left text-sm text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Link01Icon} size={16} className="shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate">{u}</span>
                <Icon icon={SquareArrowUpRightIcon} size={14} className="shrink-0 text-text-tertiary" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <PricePills activity={activity} products={products} />
    </li>
  );
}

// ─────────────────────────── the lightbox (CNT-18's pattern, image + video) ───────────────────────────

const LIGHTBOX_BUTTON =
  "z-10 inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-on-brand outline-none transition-colors duration-normal ease-decelerate hover:bg-[color-mix(in_srgb,var(--color-text-on-brand)_10%,transparent)] focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";

export function ActivityLightbox({
  media,
  index,
  onIndexChange,
  onClose,
}: {
  media: MediaRef[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const item = media[index];
  const [url, setUrl] = React.useState<string | null>(null);
  useDialogFocus(true, dialogRef, closeRef);

  // The shown image/video swaps under the same <img>/<video>: reset to
  // "loading" the moment the item changes (adjusted during render, React's
  // own pattern — not in the effect below, which only ever runs the async
  // fetch and its own cleanup).
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);
  if (item && loadedFor !== item.blobKey && url !== null) {
    setUrl(null);
  }

  React.useEffect(() => {
    if (!item) return;
    let revoked = false;
    let objectUrl: string | null = null;
    void getMediaFile(item.blobKey).then((blob) => {
      if (revoked || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLoadedFor(item.blobKey);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && index < media.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, media.length, onClose, onIndexChange]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-4 px-4 py-6"
    >
      <div aria-hidden className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm" />

      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`absolute right-4 top-4 ${LIGHTBOX_BUTTON}`}>
        <Icon icon={Cancel01Icon} size={22} />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index - 1);
          }}
          aria-label="Previous"
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${LIGHTBOX_BUTTON}`}
        >
          <Icon icon={ArrowLeft01Icon} size={22} />
        </button>
      )}
      {index < media.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange(index + 1);
          }}
          aria-label="Next"
          className={`absolute right-4 top-1/2 -translate-y-1/2 ${LIGHTBOX_BUTTON}`}
        >
          <Icon icon={ArrowRight01Icon} size={22} />
        </button>
      )}

      {url && item.kind === "video" ? (
        <video
          src={url}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[85vh] max-w-[90vw] rounded-lg"
        />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.name} onClick={(e) => e.stopPropagation()} className="relative max-h-[85vh] max-w-[90vw] rounded-lg object-contain" />
      ) : (
        <span className={cn("relative", "text-text-on-brand")}>Loading…</span>
      )}

      <p onClick={(e) => e.stopPropagation()} className="relative z-10 text-sm text-text-on-brand">
        {index + 1} of {media.length} · {item.name}
      </p>
    </div>,
    document.body,
  );
}
