"use client";

// Earn › Sell's phone parts (Figma 14, 14b, 15d at 375 px):
// · SellRow — one sellable thing: its kind (Label/LG), its state (Body/XS),
//   one 44 px quiet button, and what opens under it; 12 / 16 padding, the rows
//   of a card divided by border/subtle;
// · RowButton / RowLink — the row's Sell or Manage; a greyed one stays
//   focusable and says why (`describedBy`);
// · CheckRow — a labelled checkbox row, the whole row the control;
// · FullLayer — a pushed full screen (the NFT activity history, the listing
//   form): over the Earn screen, under the kit's sheets, with its own top bar;
// · useLiveReadiness / ReadinessSheet — the web's readiness gate as a sheet
//   (Sell, Relist, a product's copies): every product's video, the project
//   video, Continue off until they are ready.

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckmarkCircle02Icon, LockIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { dialogBlockerOf } from "@/components/projects/details/readiness-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import type { ReadinessPurpose } from "@/lib/manual/p2-types";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { phoneProductVideoHref } from "@/lib/manual/phone-earn";
import { phoneProjectPath, readyOfLine } from "@/lib/manual/phone-project";
import { useProjectVideos } from "@/lib/video/store";
import { actionLabel, projectActionLabel, projectRowCopy, readinessCopy, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { MOBILE_APP_ID } from "../../mobile-root";
import { Sheet } from "../../kit/sheet";
import { Screen } from "../../screen";
import { LIST_CARD, LIST_DIVIDERS, ListCard } from "../../kit/list";
import { MEDIA_CHIP } from "../../kit/media";
import { Thumb } from "../../project/parts";
import { TopBar } from "../../top-bar";
import { useEarn } from "../context";
import { T } from "../../type";

/** A card of rows: the kit's list card, its rows split by the kit's line. */
export const ROWS_CARD = cn(LIST_CARD, LIST_DIVIDERS);
export const SUB = T.meta;
/** A03 Link SM. */
export const LINK_SM = cn(T.caption, "text-text-brand outline-none hover:underline focus-visible:underline");
/** A03 Link MD. */
export const LINK_MD = cn(T.rowTitle, "text-text-brand outline-none hover:underline focus-visible:underline");

/** One sellable thing: kind · state · its one button, and what opens under it. */
export function SellRow({
  label,
  state,
  stateId,
  action,
  children,
}: {
  label: string;
  state: React.ReactNode;
  stateId: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <div className="flex items-center gap-4 px-8 py-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={T.name}>{label}</span>
          <div id={stateId} className="min-w-0">
            {state}
          </div>
        </div>
        {action && <div className="flex shrink-0">{action}</div>}
      </div>
      {children}
    </li>
  );
}

/** The state's lines: one, or one per listed use. `live` reads in the success ink. */
export function StateLines({ lines, live = false }: { lines: readonly string[]; live?: boolean }) {
  return (
    <ul className="flex flex-col">
      {lines.map((line, i) => (
        <li key={i} className={cn(T.meta, "break-words tabular-nums", live ? "text-text-success" : "text-text-secondary")}>
          {line}
        </li>
      ))}
    </ul>
  );
}

/** The row's quiet Sell / Manage. Disabled stays focusable and points at its reason. */
export function RowButton({
  label,
  onClick,
  disabled = false,
  describedBy,
  expanded,
  controls,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  describedBy?: string;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <Button
      hierarchy="secondary"
      size="xl"
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? describedBy : undefined}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      aria-haspopup={expanded === undefined && !disabled ? "dialog" : undefined}
      className={cn(disabled && "cursor-not-allowed opacity-60")}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
    >
      {label}
    </Button>
  );
}

export function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
      {label}
    </Link>
  );
}

/** The sentence a write leaves under its row ("On sale: …"). */
export function DoneNote({ note }: { note: string }) {
  return (
    <p className={cn(T.meta, "flex items-start gap-2 text-text-success")}>
      <span aria-hidden className="mt-px inline-flex">
        <Icon icon={CheckmarkCircle02Icon} size={14} />
      </span>
      {note}
    </p>
  );
}

/** A labelled checkbox row — the whole row is the control. */
export function CheckRow({
  checked,
  onToggle,
  invalid,
  describedBy,
  id,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  invalid?: boolean;
  describedBy?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onClick={onToggle}
      className={cn(T.body, "flex min-h-[44px] items-start gap-4 rounded-md py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus text-text-primary")}
    >
      <Checkbox checked={checked} decorative className="mt-1 shrink-0" />
      <span className={cn(invalid && "text-text-error")}>{children}</span>
    </button>
  );
}

/** A pushed full screen over the Earn screen: its own top bar (Back closes it), under the sheets. */
export function FullLayer({
  title,
  onBack,
  footer,
  children,
}: {
  title: string;
  onBack: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  // A layer opens on a press, so it only ever renders in the browser.
  const host = typeof document === "undefined" ? null : document.getElementById(MOBILE_APP_ID);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal="true"]')) onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);
  if (!host) return null;
  return createPortal(
    <div role="region" aria-label={title} className="absolute inset-0 z-overlay bg-bg-page motion-safe:animate-in motion-safe:slide-in-from-right-8 motion-safe:duration-normal">
      <Screen top={<LayerBar title={title} onBack={onBack} />} footer={footer}>
        {children}
      </Screen>
    </div>,
    host,
  );
}

/** The kit's top bar for a layer: its Back closes the layer (no navigation) and takes focus on arrival. */
function LayerBar({ title, onBack }: { title: string; onBack: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => ref.current?.querySelector("button")?.focus(), []);
  return (
    <div ref={ref}>
      <TopBar back title={title} onBack={() => onBack()} />
    </div>
  );
}

/** The readiness gate a commit point reads, live: ticking or a video finishing reads back at once. */
export function useLiveReadiness(purpose: ReadinessPurpose, product?: ProjectProduct | null) {
  const { project: given, view, brief } = useEarn();
  const { projects } = useManualProjects();
  const project = projects.find((p) => p.id === given.id) ?? given;
  const { record } = useProjectVideos(project.id);
  const { jobs, now } = useVideoJobs();
  return React.useMemo(() => {
    const facts = readinessFactsOf(project, view, brief, record, jobs, now);
    return readinessOf(purpose === "edition" ? { ...facts, product: product ?? undefined } : facts, purpose);
  }, [project, view, brief, record, jobs, now, purpose, product]);
}

/** 08b's sheet for a Sell commit point: the products' videos and the project video; Continue waits for them. */
export function ReadinessSheet({
  purpose,
  product,
  extra,
  onPass,
  onClose,
}: {
  purpose: ReadinessPurpose;
  product?: ProjectProduct | null;
  extra?: React.ReactNode;
  onPass: () => void;
  onClose: () => void;
}) {
  const readiness = useLiveReadiness(purpose, product);
  const copy = readinessCopy(purpose, product ? displayProductName(product.name) : undefined);
  const blocker = dialogBlockerOf(readiness);
  return (
    <Sheet
      open
      onClose={onClose}
      title={copy.title}
      actions={
        <>
          <Button size="xl" className="w-full" disabled={blocker !== null} onClick={onPass}>
            {copy.cta}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          {blocker && <p className={SUB}>{blocker}</p>}
        </>
      }
    >
      <Banner tone="info">{copy.info}</Banner>
      <ReadinessRows readiness={readiness} />
      {extra}
    </Sheet>
  );
}

/** Earn › Overview's "Make videos" (the web's dialog as a sheet): every product's video with its
 *  one action, which opens that product's video maker, and the project video under them. */
export function MakeVideosSheet({ onClose }: { onClose: () => void }) {
  const readiness = useLiveReadiness("videos");
  return (
    <Sheet
      open
      onClose={onClose}
      title="Make videos"
      description="Each product needs its own video before the project can be sold."
      actions={
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ReadinessRows readiness={readiness} />
    </Sheet>
  );
}

/** The products' videos and the project video, each with the one action that moves it on. */
function ReadinessRows({ readiness }: { readiness: ReturnType<typeof useLiveReadiness> }) {
  const { project } = useEarn();
  const router = useRouter();
  const pv = readiness.project;
  const pvCopy = pv ? projectRowCopy(pv) : null;
  const pvAction = pvCopy ? projectActionLabel(pvCopy.action) : null;
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h3 className={T.section}>Products</h3>
        <span className={SUB}>{readyOfLine(readiness.counts.ready, readiness.counts.total)}</span>
      </div>
      <ListCard label="Products">
        {readiness.products.map((p) => {
          const c = statusCopy(p.video);
          const label = actionLabel(c.action);
          const ready = p.video.state === "ready";
          return (
            <li key={p.productId} className="flex items-start gap-6 p-6">
              <Thumb url={p.thumb}>
                {ready && (
                  <span aria-hidden className={cn(MEDIA_CHIP, "absolute size-[28px] justify-center p-0")}>
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </Thumb>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={cn(T.rowTitle, "truncate")}>{displayProductName(p.name)}</span>
                <span className={cn(T.meta, ready ? "text-text-success" : "text-text-secondary")}>{c.text}</span>
                {label && (
                  <Button hierarchy="secondary" size="xl" className="self-start" onClick={() => router.push(phoneProductVideoHref(project.id, p.productId))}>
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
              <span className={SUB}>{pvCopy.text}</span>
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
