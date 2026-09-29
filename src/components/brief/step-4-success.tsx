"use client";

// Step 4 — Mint Success.
//
// Reached once the commit's wallet request confirmed and its writes landed.
// A Sell is listed on Explore marketplace (P2-LISTING-22), and a Sell or a
// Give only commits once every product's video is ready (C5), so they arrive
// here finished. Only a Save can mint while a video still renders: it shows
// "Mint complete" and the renders' progress, then turns "Saved" as they land.
//
// Under the subline: the ownership proof (P2-MINT-6's MintProofCard); for a
// Sell, the listing's terms as the listing record holds them now, and "View
// on marketplace"; the ready products' posters, each opening its video; then
// Go to My Projects and Showcase (P2-VIDEO-16).

import * as React from "react";
import Link from "next/link";
import { EyeIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { type BriefState, type Intent } from "./brief-app";
import { Icon } from "@/components/dashboard/icon";
import { ProgressBar, TestnetDemoBadge } from "@/components/ideeza";
import { dialogBlockerOf, ReadinessDialog } from "@/components/projects/details/readiness-dialog";
import { useMinuteClock, useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { VideoPlayerDialog, useClipUrl } from "@/components/video-jobs/video-player";
import { MintProofCard } from "@/components/wallet/mint-proof-card";
import {
  LISTING_HOME_NOTE,
  VIEW_ON_MARKETPLACE,
  liveSubline,
  pendingCardLine,
  pendingSubline,
  showcaseGateLine,
} from "@/lib/brief/success-copy";
import { can } from "@/lib/manual/permissions";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { useManualProjects } from "@/lib/manual/projects";
import { SUCCESS_SHOWCASE, showcaseAnnouncement } from "@/lib/manual/showcase-copy";
import { listingViewOf } from "@/lib/market/listing";
import { termsLineOf } from "@/lib/market/listing-flow";
import { useMarket } from "@/lib/market/market-store";
import type { ListingMetadata } from "@/lib/market/types";
import { productVideoStatus } from "@/lib/video/product-video";
import { useProjectVideos } from "@/lib/video/store";
import type { VideoTake } from "@/lib/video/types";

const HEADING_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Listed on the marketplace",
  give: "Given to the community",
  save: "Saved",
};

const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

export function Step4Success({
  state,
  onBrowse,
  projectName,
  projectId,
  products,
}: {
  state: BriefState;
  onBrowse: (href: string) => void;
  projectName: string;
  /** The project this brief minted — what Showcase flags (COM-56). */
  projectId: string | null;
  /** Its current products, one video each. */
  products: ProjectProduct[];
}) {
  const { jobs, now } = useVideoJobs();
  const { record: videos } = useProjectVideos(projectId);
  const { projects } = useManualProjects();
  const { data: market } = useMarket();
  const minute = useMinuteClock();
  const intent = (state.intent || "sell") as Intent;
  const project = projectId ? (projects.find((p) => p.id === projectId) ?? null) : null;
  const [watching, setWatching] = React.useState<{ take: VideoTake; name: string } | null>(null);

  const rows = products.map((p) => ({
    product: p,
    status: productVideoStatus(videos?.products[p.id], jobs, now),
  }));
  const rendering = rows.filter((r) => r.status.state === "rendering").length;
  const ready = rows.flatMap((r) =>
    r.status.state === "ready" ? [{ product: r.product, take: r.status.take }] : [],
  );
  // Live once nothing renders any more (only a Save can arrive with a render running).
  const isLive = rendering === 0;
  const heading = isLive ? HEADING_LIVE_BY_INTENT[intent] : "Mint complete";
  const subline = isLive ? liveSubline(intent, ready.length > 0) : pendingSubline();

  // The listing as its record holds it now, so an edit from the rail shows here too.
  const listing =
    intent === "sell" && projectId
      ? listingViewOf(projectId, { ...market, now: minute, current: NO_METADATA })
      : null;
  const listed = listing && listing.kind !== "none" ? listing.listing : null;
  const onMarket = listing?.kind === "live" || listing?.kind === "paused";

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-[24px] text-center">
      <div
        className={[
          "flex h-[64px] w-[64px] items-center justify-center rounded-full shadow-2",
          isLive ? "bg-bg-success-subtle" : "bg-bg-brand-subtle",
        ].join(" ")}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isLive ? "var(--color-text-success)" : "var(--color-text-brand)"}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 13l4 4 10-10" />
        </svg>
      </div>

      <div>
        <h1 className="m-0 text-5xl font-bold tracking-tight text-text-primary">{heading}</h1>
        <p className="mt-[6px] max-w-[460px] text-md text-text-secondary">{subline}</p>
      </div>

      {project?.mint ? (
        <MintProofCard record={project.mint} owner intent={intent} className="w-full text-left" />
      ) : null}

      {listed ? (
        <section
          aria-label="Listing"
          className="flex w-full flex-col gap-[6px] rounded-lg border border-solid border-border bg-bg-surface p-[16px] text-left"
        >
          <div className="flex flex-wrap items-center gap-[8px]">
            <h2 className="m-0 text-md font-semibold text-text-primary">Listing</h2>
            <TestnetDemoBadge />
          </div>
          <p className="m-0 text-md font-medium tabular-nums text-text-primary">{termsLineOf(listed)}</p>
          <p className="m-0 text-sm text-text-secondary">{LISTING_HOME_NOTE}</p>
          {/* Only while there is a listing to see: a removed or ended one opens nothing there. */}
          {onMarket && (
            <Link
              href={`/marketplace/${projectId}`}
              className="mt-[4px] inline-flex min-h-[32px] items-center self-start rounded-md text-sm font-semibold text-text-brand underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {VIEW_ON_MARKETPLACE}
            </Link>
          )}
        </section>
      ) : null}

      {!isLive && <PendingCard rows={rows} rendering={rendering} />}

      {ready.length > 0 && (
        <section aria-label="Videos" className="flex w-full flex-col gap-[10px] text-left">
          <div className="text-sm font-medium text-text-tertiary">{projectName || "Videos"}</div>
          <ul role="list" className="m-0 grid list-none grid-cols-2 gap-[8px] p-0 sm:grid-cols-3">
            {ready.map(({ product, take }) => (
              <li key={product.id}>
                <PosterTile
                  take={take}
                  name={displayProductName(product.name)}
                  onOpen={() => setWatching({ take, name: displayProductName(product.name) })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex w-full flex-col items-stretch gap-[10px]">
        <button
          type="button"
          onClick={() => onBrowse("/projects")}
          className="inline-flex items-center justify-center gap-[8px] rounded-3xl border-none bg-bg-brand px-[24px] py-[14px] text-md font-bold text-text-on-brand outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Go to My Projects
        </button>

        {projectId && <SuccessShowcase projectId={projectId} />}

        <div className="flex items-center justify-center">
          <Link
            href="/"
            className="rounded-full bg-bg-brand-subtle px-[12px] py-[6px] text-sm font-bold text-text-brand no-underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Back to home
          </Link>
        </div>
      </div>

      {projectId && (
        <VideoPlayerDialog
          open={watching !== null}
          take={watching?.take ?? null}
          productName={watching?.name ?? ""}
          projectId={projectId}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  );
}

/** A ready product's poster; pressing it opens the video (P2-VIDEO-16). */
function PosterTile({ take, name, onOpen }: { take: VideoTake; name: string; onOpen: () => void }) {
  const clip = useClipUrl(take.id);
  const [broken, setBroken] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play ${name} video`}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border-0 bg-bg-surface-raised p-0 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {clip.state === "ready" && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : null}
      <span className="relative inline-flex h-[32px] w-[32px] items-center justify-center rounded-full bg-bg-surface text-text-brand shadow-2">
        <Icon icon={PlayIcon} size={14} />
      </span>
      <span className="absolute inset-x-0 bottom-0 truncate bg-[color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent)] px-[6px] py-[3px] text-left text-xs font-semibold text-[var(--color-white)]">
        {name}
      </span>
    </button>
  );
}

/**
 * Showcase, offered the moment the outcome is chosen (COM-56): after any of
 * the three intents. It flags the project (COR-105) — the Showcase badge and
 * the Showcase tab of My projects follow it — and posts nothing, because the
 * Innovations feed isn't open. A mint with Share to Innovations ticked
 * arrives already showcased (the Brief's commit writes the same flag), so the
 * step opens on the status row and nothing takes focus until a press.
 *
 * P2-VIDEO-16: it runs the same gate as the Outcome block's Showcase — every
 * product needs a ready video. Ready, one press flips it. Blocked, the press
 * opens the readiness dialog over this step, where the videos can be made
 * without leaving it; its CTA then showcases.
 */
function SuccessShowcase({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  const { setShowcase } = useManualProjects();
  const [said, setSaid] = React.useState("");
  const [gateOpen, setGateOpen] = React.useState(false);
  const lineId = React.useId();
  const doneId = React.useId();
  const showRef = React.useRef<HTMLButtonElement>(null);
  const undoRef = React.useRef<HTMLButtonElement>(null);
  const project = data.state === "ready" ? data.project : null;
  const on = typeof project?.showcasedAt === "number";
  // The control that replaces the one just pressed takes focus once it has rendered.
  const focusNext = React.useRef<"show" | "undo" | null>(null);
  React.useEffect(() => {
    const target =
      focusNext.current === "undo" ? undoRef.current : focusNext.current === "show" ? showRef.current : null;
    focusNext.current = null;
    target?.focus();
  }, [on]);

  if (data.state !== "ready" || !project) return null;
  const { view, brief } = data;
  const status = view.summary.status;
  if (!can({ kind: "local-owner" }, "project.showcase", { status })) return null;
  const readiness = view.videos.readiness.showcase;
  const blocked = dialogBlockerOf(readiness) !== null;

  const flip = (next: boolean) => {
    focusNext.current = next ? "undo" : "show";
    setShowcase(project.id, next);
    setSaid(showcaseAnnouncement(next, project.name));
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-3">
      {on ? (
        <div className="flex min-h-[44px] items-center gap-4 rounded-3xl border border-solid border-border-subtle bg-bg-surface py-2 pl-10 pr-2 text-left">
          <span aria-hidden className="inline-flex shrink-0 text-[color:var(--color-icon-info)]">
            <Icon icon={EyeIcon} size={18} />
          </span>
          <p id={doneId} className="m-0 min-w-0 flex-1 text-md text-text-primary">
            {SUCCESS_SHOWCASE.done}
          </p>
          <button
            ref={undoRef}
            type="button"
            onClick={() => flip(false)}
            aria-describedby={doneId}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-3xl px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {SUCCESS_SHOWCASE.undo}
          </button>
        </div>
      ) : (
        <>
          <button
            ref={showRef}
            type="button"
            onClick={() => (blocked ? setGateOpen(true) : flip(true))}
            aria-describedby={lineId}
            className="inline-flex min-h-[44px] items-center justify-center gap-4 rounded-3xl border border-solid border-border bg-bg-surface px-12 py-6 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={EyeIcon} size={16} />
            {SUCCESS_SHOWCASE.action}
          </button>
          <p id={lineId} className="m-0 text-sm text-text-secondary">
            {blocked ? showcaseGateLine(readiness.counts.ready, readiness.counts.total) : SUCCESS_SHOWCASE.line}
          </p>
        </>
      )}
      <p role="status" className="sr-only">
        {said}
      </p>
      {gateOpen && (
        <ReadinessDialog
          purpose="showcase"
          project={project}
          view={view}
          brief={brief}
          onPass={() => {
            setGateOpen(false);
            flip(true);
          }}
          onClose={() => {
            setGateOpen(false);
            requestAnimationFrame(() => showRef.current?.focus());
          }}
        />
      )}
    </div>
  );
}

/** A Save's videos still rendering: each one's progress, and that they need no one to wait. */
function PendingCard({
  rows,
  rendering,
}: {
  rows: { product: ProjectProduct; status: ReturnType<typeof productVideoStatus> }[];
  rendering: number;
}) {
  return (
    <div className="flex w-full flex-col gap-[10px] rounded-lg border border-solid border-border-brand bg-bg-brand-subtle p-[16px] text-left">
      <div className="text-md font-bold text-text-brand">{pendingCardLine(rendering)}</div>
      <ul role="list" className="m-0 flex list-none flex-col gap-[8px] p-0">
        {rows.map(({ product, status }) =>
          status.state === "rendering" ? (
            <li key={product.id} className="flex flex-col gap-[4px]">
              <div className="flex items-center justify-between gap-[8px] text-sm font-semibold text-text-brand">
                <span className="truncate">{displayProductName(product.name)}</span>
                <span className="tabular-nums">{status.eta} left</span>
              </div>
              <ProgressBar value={status.progress} label={`${displayProductName(product.name)} video`} />
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
