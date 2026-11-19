"use client";

// Earn › Sell's phone parts (mobile UX pass 2026-11-15, Figma 14, 14b, 15d):
// · SellListRow — one sellable thing as a list row: its kind's icon, the kind,
//   its live state as the meta line (success ink while on sale), the chevron;
//   the whole row opens what comes next (its screen, the mint, the sell sheet);
// · SummaryCard — what a sell screen leads with: the state as an overline, the
//   price (or the state) large, a line under it, three facts, "All details"
//   closed, and a note;
// · StepsCard — "Before you can {verb}": the ladder's missing steps as a state
//   card, each with its one fix;
// · InfoButton — ⓘ beside a heading: the words the screen no longer prints;
// · CheckRow — a labelled checkbox row, the whole row the control;
// · FullLayer — a pushed full screen (an NFT's screen, its activity, the
//   listing form): over the Earn screen, under the kit's sheets, with its own
//   top bar; stacked layers answer Escape top first;
// · useLiveReadiness / ReadinessSheet — the web's readiness gate as a sheet
//   (Sell, Relist, a product's copies): every product's video, the project
//   video, Continue off until they are ready.

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { InformationCircleIcon, LockIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { IconButton } from "@/components/ideeza/icon-button";
import type { LevelCheck as Check } from "@/lib/commerce/ladder";
import type { License } from "@/lib/brief/types";
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
import { BottomBar } from "../../kit/bottom-bar";
import { Sheet } from "../../kit/sheet";
import { Screen } from "../../screen";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard } from "../../kit/list";
import { MEDIA_CHIP } from "../../kit/media";
import { PRESSED } from "../../kit/press";
import { Thumb } from "../../project/parts";
import { TopBar, type TopBarAction } from "../../top-bar";
import { useEarn } from "../context";
import { MissingSteps } from "../parts";
import { T } from "../../type";

/** A card of rows: the kit's list card, its rows split by the kit's line. */
export const ROWS_CARD = cn(LIST_CARD, LIST_DIVIDERS);
export const SUB = T.meta;
/** A03 Link SM. */
export const LINK_SM = cn(T.caption, "text-text-brand outline-none hover:underline focus-visible:underline");
/** A03 Link MD. */
export const LINK_MD = cn(T.rowTitle, "text-text-brand outline-none hover:underline focus-visible:underline");

/** Each sellable kind's mark: the project itself, a built unit, the design files (shared with the web's Sell board). */
export { KIND_ICON } from "@/components/marketplace/kind-icon";

/** The state's lines: one, or one per listed use. `live` reads in the success ink. */
export function StateLines({ lines, live = false, id }: { lines: readonly string[]; live?: boolean; id?: string }) {
  return (
    <span id={id} className="flex flex-col">
      {lines.map((line, i) => (
        <span key={i} className={cn(T.meta, "break-words tabular-nums", live ? "text-text-success" : "text-text-secondary")}>
          {line}
        </span>
      ))}
    </span>
  );
}

/** One sellable thing as a row: icon, kind, live state, chevron; the whole row opens what's next.
 *  `disabled` greys it with its reason as the state; `href` links (the mint), `onClick` opens. */
export function SellListRow({
  icon,
  title,
  state,
  live = false,
  extra,
  href,
  onClick,
  disabled = false,
  label,
}: {
  icon: IconValue;
  title: string;
  state: readonly string[];
  live?: boolean;
  /** A line under the state (how many steps before you can list, why it waits). */
  extra?: string | null;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** The row's accessible name when the visible words aren't enough. */
  label?: string;
}) {
  const opens = !disabled && (!!href || !!onClick);
  const body = (
    <>
      <span aria-hidden className={cn("flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-surface-raised", disabled ? "text-[color:var(--color-icon-disabled)]" : "text-[color:var(--color-icon-default)]")}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.rowTitle, disabled && "text-text-disabled")}>{title}</span>
        <StateLines lines={state} live={live} />
        {extra && <span className={cn(T.meta, "break-words")}>{extra}</span>}
      </span>
      {opens && <Chevron />}
    </>
  );
  if (href && opens)
    return (
      <li>
        <Link href={href} aria-label={label} className={cn(LIST_ROW, PRESSED, "items-center")}>
          {body}
        </Link>
      </li>
    );
  if (onClick && opens)
    return (
      <li>
        <button type="button" aria-label={label} aria-haspopup="dialog" onClick={onClick} className={cn(LIST_ROW, PRESSED, "items-center")}>
          {body}
        </button>
      </li>
    );
  return <li className={cn(LIST_ROW, "items-center hover:bg-transparent")}>{body}</li>;
}

/** A row that opens something on the item's screen (Activity, Mint details, View on marketplace). */
export function ActionRow({
  icon,
  title,
  meta,
  value,
  onClick,
  danger = false,
  label,
}: {
  icon: IconValue;
  title: string;
  meta?: React.ReactNode;
  value?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  label?: string;
}) {
  return (
    <li>
      <button type="button" aria-label={label} onClick={onClick} className={cn(LIST_ROW, PRESSED)}>
        <span aria-hidden className={cn("shrink-0", danger ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-default)]")}>
          <Icon icon={icon} size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn(T.body, danger ? "text-text-error" : "text-text-primary")}>{title}</span>
          {meta ? <span className={cn(T.meta, "break-words")}>{meta}</span> : null}
        </span>
        {value != null && value !== "" && <span className={cn(T.body, "shrink-0 tabular-nums")}>{value}</span>}
        {!danger && <Chevron />}
      </button>
    </li>
  );
}

export type SummaryFact = { label: string; value: React.ReactNode };

/** A sell screen's lead (the buyer's buy box, for the maker): the state as an overline, the
 *  headline large (a price in Heading/H3, a state in Heading/H6), the line under it, `aside`
 *  (a chip, a ⋯) beside it, up to three facts, then `children`, "All details" closed, the note. */
export function SummaryCard({
  label,
  overline,
  chip,
  headline,
  amount = true,
  sub,
  aside,
  facts = [],
  details,
  note,
  children,
}: {
  label: string;
  overline: string;
  /** A status chip beside the overline ("On the marketplace"). */
  chip?: React.ReactNode;
  headline: React.ReactNode;
  /** The headline is an amount (Heading/H3, tabular) rather than words. */
  amount?: boolean;
  sub?: React.ReactNode;
  aside?: React.ReactNode;
  facts?: readonly SummaryFact[];
  details?: readonly SummaryFact[];
  note?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <section aria-label={label} className={cn(LIST_CARD, "gap-6 p-8")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-h-[20px] flex-wrap items-center gap-x-4 gap-y-1">
            <p className={T.overline}>{overline}</p>
            {chip}
          </div>
          <p className={cn(amount ? cn(T.display, "tabular-nums") : T.section, "break-words")}>{headline}</p>
          {sub && <p className={cn(T.meta, "break-words tabular-nums")}>{sub}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-center">{aside}</div>}
      </div>
      {facts.length > 0 && (
        <dl className="grid grid-cols-3 gap-x-8 gap-y-6">
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-1">
              <dt className={T.micro}>{f.label}</dt>
              <dd className={cn(T.rowTitle, "break-words tabular-nums")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {details && details.length > 0 && (
        <div className="flex flex-col gap-2 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className={cn(T.rowTitle, "-my-4 flex min-h-[44px] w-full items-center justify-between gap-2 text-left outline-none focus-visible:underline")}
          >
            All details
            <Chevron className={cn("transition-transform duration-fast motion-reduce:transition-none", open ? "-rotate-90" : "rotate-90")} />
          </button>
          <dl id={id} hidden={!open} className={cn("-mx-8 flex-col", open ? "flex" : "hidden", LIST_DIVIDERS)}>
            {details.map((r) => (
              <div key={r.label} className="flex min-h-[44px] items-start justify-between gap-6 px-8 py-5">
                <dt className={cn(T.body, "shrink-0")}>{r.label}</dt>
                <dd className={cn(T.body, "min-w-0 break-words text-right text-text-primary")}>{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {note && <p className={T.meta}>{note}</p>}
    </section>
  );
}

/** "Before you can {what}" as a state card: the ladder's missing steps, each with its one fix. */
export function StepsCard({
  check,
  what,
  projectId,
  license,
  announce,
}: {
  check: Check;
  what: string;
  projectId: string;
  license: License | null;
  announce?: (message: string) => void;
}) {
  const headingId = React.useId();
  if (check.ok) return null;
  const n = check.missing.length;
  return (
    <section aria-labelledby={headingId} className={cn(LIST_CARD, "gap-6 p-8")}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-surface-raised text-[color:var(--color-icon-default)]">
          <Icon icon={LockIcon} size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={headingId} className={T.section}>{`Before you can ${what}`}</h3>
          <p className={T.meta}>{`${n} ${n === 1 ? "step" : "steps"} left`}</p>
        </div>
      </div>
      <MissingSteps steps={check.missing} projectId={projectId} license={license} announce={announce} />
    </section>
  );
}

/** ⓘ beside a heading (lens 1): a 44 px icon button opening the kit Sheet with the words the
 *  screen no longer prints inline. */
export function InfoButton({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <IconButton
        hierarchy="ghost"
        size="xl"
        aria-label={label}
        aria-haspopup="dialog"
        icon={<Icon icon={InformationCircleIcon} size={20} />}
        onClick={() => setOpen(true)}
        className="-my-4 shrink-0 text-[color:var(--color-icon-default)]"
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="flex flex-col gap-6 pb-8">{children}</div>
      </Sheet>
    </>
  );
}

/** A slim note with its mark: a rule a field carries (the share-sale note), never a banner. */
export function NoteLine({ icon = InformationCircleIcon, children, id }: { icon?: IconValue; children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className={cn(T.meta, "flex items-start gap-3")}>
      <span aria-hidden className="mt-[1px] shrink-0 text-[color:var(--color-icon-secondary)]">
        <Icon icon={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/** The one primary of a pushed sell screen, full width, with why it's off under it. */
export function PrimaryBar({ children, reason, reasonId }: { children: React.ReactNode; reason?: string | null; reasonId?: string }) {
  return (
    <BottomBar>
      {children}
      {reason && (
        <p id={reasonId} className={T.meta}>
          {reason}
        </p>
      )}
    </BottomBar>
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

/** Open full layers, oldest first: only the top one answers Escape. */
const fullLayers: number[] = [];
let nextFullLayer = 0;

/** A pushed full screen over the Earn screen: its own top bar (Back closes it; `actions` on the
 *  right), under the sheets. Layers stack (an NFT's screen, then its activity); Escape closes the top. */
export function FullLayer({
  title,
  onBack,
  actions,
  footer,
  children,
}: {
  title: string;
  onBack: () => void;
  actions?: TopBarAction[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  // A layer opens on a press, so it only ever renders in the browser.
  const host = typeof document === "undefined" ? null : document.getElementById(MOBILE_APP_ID);
  const [id] = React.useState(() => ++nextFullLayer);
  React.useEffect(() => {
    fullLayers.push(id);
    return () => {
      const i = fullLayers.indexOf(id);
      if (i >= 0) fullLayers.splice(i, 1);
    };
  }, [id]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || fullLayers[fullLayers.length - 1] !== id) return;
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack, id]);
  if (!host) return null;
  return createPortal(
    <div role="region" aria-label={title} className="absolute inset-0 z-overlay bg-bg-page motion-safe:animate-in motion-safe:slide-in-from-right-8 motion-safe:duration-normal">
      <Screen top={<LayerTop title={title} onBack={onBack} actions={actions} />} footer={footer}>
        {children}
      </Screen>
    </div>,
    host,
  );
}

/** The kit's top bar for a layer: its Back closes the layer (no navigation) and takes focus on arrival. */
function LayerTop({ title, onBack, actions }: { title: string; onBack: () => void; actions?: TopBarAction[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => ref.current?.querySelector("button")?.focus(), []);
  return (
    <div ref={ref}>
      <TopBar back title={title} onBack={() => onBack()} actions={actions} />
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
      description={copy.info}
      actions={
        <>
          <Button size="xl" className="w-full" disabled={blocker !== null} onClick={onPass}>
            {copy.cta}
          </Button>
          {blocker && <p className={SUB}>{blocker}</p>}
        </>
      }
    >
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
          const name = displayProductName(p.name);
          // One compact row per product (owner 2026-11-15: two products didn't fit the sheet): the
          // video's state, and its action as the row's last line — the whole row opens the video maker.
          const body = (
            <>
              <Thumb url={p.thumb}>
                {ready && (
                  <span aria-hidden className={cn(MEDIA_CHIP, "absolute size-[28px] justify-center p-0")}>
                    <Icon icon={PlayIcon} size={16} />
                  </span>
                )}
              </Thumb>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.rowTitle, "truncate")}>{name}</span>
                <span className={cn(T.meta, ready ? "text-text-success" : "text-text-secondary")}>{c.text}</span>
                {label && <span className={cn(T.rowTitle, "text-text-brand")}>{label}</span>}
              </span>
              {label && <Chevron />}
            </>
          );
          return (
            <li key={p.productId}>
              {label ? (
                <button
                  type="button"
                  aria-label={`${name}: ${label}`}
                  onClick={() => router.push(phoneProductVideoHref(project.id, p.productId))}
                  className={cn(LIST_ROW, PRESSED, "w-full items-center text-left")}
                >
                  {body}
                </button>
              ) : (
                <div className={cn(LIST_ROW, "items-center hover:bg-transparent active:bg-transparent")}>{body}</div>
              )}
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
