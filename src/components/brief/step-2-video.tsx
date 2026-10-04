"use client";

// Step 2 — "Pick your preview" (VIDEO P2-VIDEO-17).
//
// Every product gets its own 10-second video: one row per current product,
// each a disclosure holding the Generate AI video form inline (`VideoForm`,
// the same body the Generate dialog uses). The browser's clip renderer makes
// a real file for each (P2-VIDEO-2); the renders keep running while the maker
// sets up the mint, and the rows follow them live.
//
// - One row is open at a time. A single-product project opens with its row
//   open; after a Generate, the next product without a video opens.
// - Generate video is a secondary button here: the step's one violet is its
//   Continue.
// - Continue, when a step follows, needs every product's video started
//   (rendering or ready). When this step is the commit (a Save), a Save
//   posted to Innovations needs every video ready; a plain Save may skip.
// - Skip ("Add later") is locked for Sell, Give and anything posted to
//   Innovations. AR is unchanged: the phone app isn't out yet.

import * as React from "react";
import { ArrowDown01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ProgressBar } from "@/components/ideeza";
import {
  VideoForm,
  formValueOf,
  videoFormBlocker,
  videoTargetOf,
  type VideoFormValue,
  type VideoTarget,
} from "@/components/video-jobs/generate-video-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { StatusGlyph, VideoPlayer, useClipUrl } from "@/components/video-jobs/video-player";
import type { ProductReadiness } from "@/lib/manual/p2-types";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ManualProject } from "@/lib/manual/projects";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { etaLabel, progressOf } from "@/lib/video/jobs";
import { useProjectVideos } from "@/lib/video/store";
import { VIDEO_QUALITY, type OnScreenLines } from "@/lib/video/types";
import { FAILURE_COPY, stageLine, statusCopy } from "@/lib/video/video-copy";
import { commitCtaLabel } from "@/lib/wallet/mint";
import { cn } from "@/lib/utils";
import { BriefCard, type BriefGate } from "./brief-app";
import type { BriefState, Intent, MediaType } from "./brief-app";
import { ArRecordPanel } from "./ar-record-panel";

const LOCK_LISTING = "A listing needs a video for every product";
const LOCK_DROP = "A drop needs a video for every product";
const LOCK_SHOWCASE = "A showcase needs a video for every product";

const SUBLINE: Record<"sell" | "give" | "showcase" | "save", string> = {
  sell: "Every product in a listing needs its own 10-second video. They render while you set up the mint.",
  give: "Every product in a drop needs its own 10-second video. They render while you finish.",
  showcase: "Every product in a showcase needs its own 10-second video.",
  save: "Pick how you want to record — or skip it for now.",
};

/** The render outlives this step: its corner toast carries on on every page. */
const KEEPS_RENDERING = "It keeps rendering if you carry on or leave — its progress also shows in the corner.";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** "1 product still needs a video." / "2 products still need a video." */
function stillNeedLine(n: number): string {
  return n === 1 ? "1 product still needs a video." : `${n} products still need a video.`;
}

const hasVideo = (r: ProductReadiness) => r.video.state === "rendering" || r.video.state === "ready";

export function Step2Video({
  state,
  project,
  products,
  gate,
  onChange,
  onContinue,
  onBack,
  isLastStep,
  minting,
  mintError,
}: {
  state: BriefState;
  /** The project the videos belong to. */
  project: ManualProject;
  /** Its current products, one row each. */
  products: ProjectProduct[];
  gate: BriefGate;
  onChange: (patch: Partial<BriefState>) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Is this preview the last thing to answer — so Continue commits? */
  isLastStep: boolean;
  /** The commit's wallet request is open: the CTA says so and takes no second press. */
  minting: boolean;
  /** Why the last commit didn't mint. */
  mintError: string | null;
}) {
  const intent = (state.intent || "sell") as Intent;
  const reasonId = React.useId();
  // Sell and Give must ship a video for every product, and so must anything
  // posted to Innovations; only a plain Save may skip.
  const skipLocked = intent === "sell" || intent === "give" || state.shareToNewsfeed;
  const lockReason = intent === "sell" ? LOCK_LISTING : intent === "give" ? LOCK_DROP : LOCK_SHOWCASE;
  // A stored "skip" from before the maker switched intent must not carry
  // forward once Skip is locked — it reads as no choice made yet.
  const effectiveMediaType: MediaType | null =
    skipLocked && state.mediaType === "skip" ? null : state.mediaType;
  const sub = SUBLINE[intent === "save" ? (state.shareToNewsfeed ? "showcase" : "save") : intent];

  const { readiness, gated } = gate;
  const counts = readiness.counts;
  // When a step follows, every video has to be started; when this is the
  // commit, the gate decides (a rendering video never counts, C5).
  const videosReason = !isLastStep
    ? counts.missing > 0
      ? stillNeedLine(counts.missing)
      : null
    : gated
      ? readiness.blocker
      : null;
  const reason =
    effectiveMediaType === null
      ? "Choose AI to make a video for every product."
      : effectiveMediaType === "ar"
        ? state.arClip
          ? videosReason
          : "The clip hasn't arrived yet."
        : effectiveMediaType === "skip"
          ? null
          : videosReason;
  const canGo = !reason && !minting;
  const label = commitCtaLabel(intent, intent === "save" ? "lazy" : state.mintType, {
    last: isLastStep,
    fromPreview: true,
    innovations: state.shareToNewsfeed,
  });

  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[20px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Pick your preview
          </h1>
          <p className="mt-[6px] text-sm leading-relaxed text-text-secondary">{sub}</p>
        </div>

        <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
          <TypeCard
            id="ar"
            label="AR"
            sub="Record from your phone"
            status="soon"
            selected={effectiveMediaType === "ar"}
            onClick={() => onChange({ mediaType: "ar" })}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="3" width="12" height="18" rx="2" />
                <circle cx="12" cy="17" r="1" />
                <path d="M9 7h6" />
              </svg>
            }
          />
          <TypeCard
            id="ai"
            label="AI"
            sub="Generate from a prompt"
            status="recommended"
            selected={effectiveMediaType === "ai"}
            onClick={() => onChange({ mediaType: "ai" })}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.5 3l1.7 4.8L17 9.5l-4.8 1.7L10.5 16l-1.7-4.8L4 9.5l4.8-1.7z" />
                <path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
              </svg>
            }
          />
          <TypeCard
            id="skip"
            label="Skip"
            sub="Add later"
            status={skipLocked ? "locked" : "available"}
            locked={skipLocked}
            lockReason={lockReason}
            selected={effectiveMediaType === "skip"}
            onClick={() => {
              if (!skipLocked) onChange({ mediaType: "skip" });
            }}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5V12l3 1.8" />
              </svg>
            }
          />
        </div>

        {effectiveMediaType === "ai" && (
          <ProductVideos project={project} products={products} rows={readiness.products} />
        )}

        {effectiveMediaType === "ar" && (
          <ArRecordPanel
            projectId={state.projectId}
            onSwitchToAi={() => onChange({ mediaType: "ai" })}
          />
        )}

        {effectiveMediaType === "skip" && (
          <div className="text-sm text-text-secondary">
            You can add videos later from each product&rsquo;s Media tab.
          </div>
        )}

        <div className="flex flex-col gap-[8px] border-t border-solid border-border-subtle pt-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-[16px]">
            <span id={reasonId} className="min-w-0 flex-1 text-sm text-text-secondary">
              {reason ??
                (effectiveMediaType === "ai" && counts.rendering > 0 && !isLastStep
                  ? "The videos keep rendering while you carry on."
                  : null)}
            </span>
            {/* A disabled button takes no pointer events, so the reason has to
                live on a wrapper the cursor can still reach. */}
            <span title={reason ?? undefined} className="inline-flex">
              <button
                type="button"
                onClick={() => {
                  if (canGo) onContinue();
                }}
                disabled={!canGo}
                aria-describedby={reason ? reasonId : undefined}
                aria-busy={minting || undefined}
                className={primaryFooterButton(canGo)}
              >
                {minting ? (
                  <>
                    <Spinner />
                    Waiting for your wallet…
                  </>
                ) : (
                  <>
                    {label}
                    {isLastStep ? null : <ChevronRight />}
                  </>
                )}
              </button>
            </span>
          </div>
          {mintError && !minting && (
            <p role="status" className="m-0 text-right text-sm text-text-primary">
              {mintError}
            </p>
          )}
        </div>
      </div>
    </BriefCard>
  );
}

/**
 * The videos, one row per current product: its poster, name and status, and
 * — open — the Generate form, the render's progress, or the player.
 */
function ProductVideos({
  project,
  products,
  rows,
}: {
  project: ManualProject;
  products: ProjectProduct[];
  rows: ProductReadiness[];
}) {
  const { jobs, now, startProductVideo, cancelRender, saveDraft } = useVideoJobs();
  const { record } = useProjectVideos(project.id);
  const headingId = React.useId();
  const ready = rows.filter((r) => r.video.state === "ready").length;

  const [open, setOpen] = React.useState<string | null>(() =>
    rows.length === 1 ? rows[0].productId : (rows.find((r) => !hasVideo(r))?.productId ?? null),
  );
  // A ready product whose form is open again, for a new take.
  const [again, setAgain] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, VideoFormValue>>({});
  const [tried, setTried] = React.useState<string | null>(null);
  const [error, setError] = React.useState<{ id: string; text: string } | null>(null);
  const promptRef = React.useRef<HTMLTextAreaElement>(null);

  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const targetOf = (id: string): VideoTarget | null => {
    const p = byId.get(id);
    return p ? videoTargetOf(project, p) : null;
  };
  const valueOf = (t: VideoTarget): VideoFormValue => values[t.productId] ?? formValueOf(t, record?.products[t.productId]);

  // What the maker types is kept as the product's draft, 400 ms after typing
  // stops, and flushed when the step unmounts.
  const pending = React.useRef(new Map<string, { value: VideoFormValue; timer: number }>());
  React.useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, p] of map) {
        window.clearTimeout(p.timer);
        saveDraft(project.id, id, p.value);
      }
      map.clear();
    };
  }, [project.id, saveDraft]);
  const change = (id: string, value: VideoFormValue) => {
    setValues((v) => ({ ...v, [id]: value }));
    setError(null);
    const was = pending.current.get(id);
    if (was) window.clearTimeout(was.timer);
    const timer = window.setTimeout(() => {
      pending.current.delete(id);
      saveDraft(project.id, id, value);
    }, 400);
    pending.current.set(id, { value, timer });
  };

  const generate = (t: VideoTarget) => {
    const value = valueOf(t);
    if (videoFormBlocker(value)) {
      setTried(t.productId);
      promptRef.current?.focus();
      return;
    }
    const res = startProductVideo({
      projectId: t.projectId,
      projectName: t.projectName,
      productId: t.productId,
      productName: t.productName,
      prompt: value.prompt.trim(),
      lines: value.lines.map((l) => l.trim()) as OnScreenLines,
      quality: VIDEO_QUALITY[value.quality].available ? value.quality : "low",
      source: t.source,
      imageUrl: t.imageUrl,
    });
    if (!res.ok) {
      setError({ id: t.productId, text: WRITE_ERROR_MESSAGE });
      return;
    }
    setTried(null);
    setAgain(null);
    // The next product without a video opens; the one just started stays in view otherwise.
    const next = rows.find((r) => r.productId !== t.productId && !hasVideo(r));
    setOpen(next ? next.productId : t.productId);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-[10px]">
      <h2 id={headingId} className="m-0 text-md font-semibold text-text-primary">
        Videos · {ready} of {rows.length} ready
      </h2>
      <ul role="list" className="m-0 flex list-none flex-col divide-y divide-solid divide-border rounded-lg border border-solid border-border p-0">
        {rows.map((row) => {
          const t = targetOf(row.productId);
          if (!t) return null;
          const expanded = open === row.productId;
          const panelId = `brief-video-${row.productId}`;
          const copy = statusCopy(row.video);
          const name = displayProductName(row.name);
          const blocker = videoFormBlocker(valueOf(t));
          const showForm = row.video.state === "none" || row.video.state === "failed" || again === row.productId;
          const video = row.video;
          const job = video.state === "rendering" ? jobs.find((j) => j.id === video.take.id) : undefined;
          return (
            <li key={row.productId} className="flex flex-col">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : row.productId)}
                className={cn(
                  "flex min-h-[56px] w-full items-center gap-[12px] border-0 bg-transparent px-[14px] py-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
                  TAP,
                )}
              >
                <RowThumb row={row} />
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-md font-semibold text-text-primary">{name}</span>
                  <span className="flex items-center gap-[6px] text-sm text-text-secondary">
                    <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
                    <span>{copy.text}</span>
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex shrink-0 text-text-secondary transition-transform duration-fast motion-reduce:transition-none",
                    expanded && "rotate-180",
                  )}
                >
                  <Icon icon={ArrowDown01Icon} size={18} />
                </span>
              </button>
              {copy.progress !== null && !expanded && (
                <ProgressBar value={copy.progress} label={`${name} video`} className="mx-[14px] mb-[12px] w-auto" />
              )}
              {expanded && (
                <div id={panelId} className="flex flex-col gap-[14px] px-[14px] pb-[16px]">
                  {showForm ? (
                    <>
                      {row.video.state === "failed" && again !== row.productId && (
                        <p className="m-0 text-sm text-text-error">{FAILURE_COPY[row.video.failure]}</p>
                      )}
                      <VideoForm
                        target={t}
                        value={valueOf(t)}
                        onChange={(v) => change(row.productId, v)}
                        promptRef={promptRef}
                        describedBy={blocker && tried === row.productId ? `${panelId}-blocker` : undefined}
                      />
                      <div className="flex flex-wrap items-center gap-[12px]">
                        <Button
                          type="button"
                          hierarchy="secondary"
                          size="lg"
                          aria-disabled={blocker ? true : undefined}
                          aria-describedby={blocker ? `${panelId}-blocker` : undefined}
                          className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
                          onClick={() => generate(t)}
                        >
                          Generate video
                        </Button>
                        {again === row.productId && (
                          <Button type="button" hierarchy="ghost" size="lg" className={TAP} onClick={() => setAgain(null)}>
                            Keep this video
                          </Button>
                        )}
                        {blocker && (
                          <span id={`${panelId}-blocker`} className="text-sm text-text-secondary">
                            {blocker}
                          </span>
                        )}
                      </div>
                      {error?.id === row.productId && (
                        <p role="alert" className="m-0 text-sm text-text-error">
                          {error.text}
                        </p>
                      )}
                    </>
                  ) : row.video.state === "rendering" ? (
                    <div className="flex flex-col gap-[8px]">
                      <p className="m-0 text-sm font-semibold text-text-primary">
                        {stageLine(row.video.take.n, row.video.stage)}
                      </p>
                      <ProgressBar value={row.video.progress} label={`${name} video`} />
                      <p className="m-0 text-sm text-text-secondary">
                        {job ? `${etaLabel(progressOf(job, now).etaSec)} left` : `${row.video.eta} left`}
                      </p>
                      <p className="m-0 text-sm text-text-secondary">{KEEPS_RENDERING}</p>
                      <Button
                        type="button"
                        hierarchy="ghost"
                        size="lg"
                        className={cn("self-start", TAP)}
                        onClick={() => cancelRender(row.video.state === "rendering" ? row.video.take.id : "")}
                      >
                        Cancel render
                      </Button>
                    </div>
                  ) : row.video.state === "ready" ? (
                    <>
                      <VideoPlayer take={row.video.take} productName={name} projectId={project.id} owner />
                      <Button
                        type="button"
                        hierarchy="secondary"
                        size="lg"
                        className={cn("self-start", TAP)}
                        onClick={() => {
                          setAgain(row.productId);
                          setValues((v) => {
                            const take = row.video.state === "ready" ? row.video.take : null;
                            return take
                              ? { ...v, [row.productId]: formValueOf(t, record?.products[row.productId], take) }
                              : v;
                          });
                        }}
                      >
                        Regenerate
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The in-use poster, else the concept image, else a neutral icon (44 px). */
function RowThumb({ row }: { row: ProductReadiness }) {
  const inUse = row.video.state === "ready" ? row.video.take.id : null;
  const clip = useClipUrl(inUse);
  const [broken, setBroken] = React.useState(false);
  const src = clip.state === "ready" ? clip.posterUrl : !broken ? row.thumb : null;
  return (
    <span aria-hidden className="relative inline-flex size-[44px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-surface-raised text-text-tertiary">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Icon icon={Image01Icon} size={18} />
      )}
    </span>
  );
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function primaryFooterButton(enabled: boolean): string {
  return [
    "px-[22px] py-[11px] rounded-lg text-md font-semibold inline-flex items-center gap-[8px] border-0",
    "transition-colors duration-fast",
    enabled
      ? "cursor-pointer bg-bg-brand text-text-on-brand"
      : "cursor-not-allowed bg-bg-subtle text-text-disabled",
  ].join(" ");
}

type CardStatus = "available" | "recommended" | "locked" | "soon";

// The status is the card's own header band — what this way of getting a
// preview costs you is the first thing to read, before the name.
const STATUS_BAND: Record<CardStatus, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-bg-success-subtle text-text-success",
  },
  // A recommendation is information, not the page's action: the brand's
  // quiet tint, not the gradient slab (white on the gradient's light end also
  // failed contrast in dark).
  recommended: {
    label: "Recommended",
    className: "bg-bg-brand-subtle text-text-brand",
  },
  locked: {
    label: "Locked",
    className: "bg-bg-subtle text-text-secondary",
  },
  // The phone app that records the clip is not released. The card stays —
  // picking it explains that and offers the way to AI — but it no longer
  // wears a green "Available" over a dead end.
  soon: {
    label: "App coming soon",
    className: "bg-bg-warning-subtle text-text-warning",
  },
};

function TypeCard({
  label,
  sub,
  icon,
  status,
  selected,
  locked,
  lockReason,
  onClick,
}: {
  id: MediaType;
  label: string;
  sub: string;
  icon: React.ReactNode;
  status: CardStatus;
  selected: boolean;
  locked?: boolean;
  lockReason?: string;
  onClick: () => void;
}) {
  const band = STATUS_BAND[status];
  return (
    <button
      onClick={() => {
        if (!locked) onClick();
      }}
      aria-disabled={locked || undefined}
      aria-pressed={selected}
      title={locked ? lockReason : undefined}
      className={[
        "flex flex-col overflow-hidden rounded-xl text-left",
        "border border-solid bg-bg-surface transition-[border-color,box-shadow] duration-fast",
        selected ? "border-border-brand" : "border-border",
        selected ? "shadow-[0_0_0_3px_var(--color-bg-brand-subtle)]" : "",
        locked ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <span className={`block px-[10px] py-[5px] text-xs font-semibold ${band.className}`}>
        {band.label}
      </span>
      <span className="flex flex-col gap-[4px] px-[12px] pb-[12px] pt-[10px]">
        <span
          className={`inline-flex items-center gap-[8px] ${
            selected ? "text-text-brand" : "text-text-primary"
          }`}
        >
          {icon}
          <span className="text-md font-semibold">{label}</span>
        </span>
        <span className="text-sm text-text-secondary">{sub}</span>
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-[ix-brief-spin_0.8s_linear_infinite] rounded-full border-2 border-solid border-border border-t-current">
      <style>{`@keyframes ix-brief-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}
