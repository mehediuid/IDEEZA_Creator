"use client";

// Review and sign — what is minted, the readiness gate, the cost, and the ONE
// wallet request (the flow's `commit`), Lazy or Instant as Details chose.
//
// - What is minted: the project as its engineering record holds it (name,
//   description, products — edited on the project page, never here) and the
//   terms Details set.
// - The gate (P2-VIDEO-17): one row per current product with its video's
//   state, live. Videos are made in the project's Media tab, so a missing one
//   offers "Make videos", which opens the products' videos in a dialog over
//   the review (make-videos.tsx); a render still running never counts (C5).
//   A plain private mint runs no gate — its videos are optional.
// - The cost box (Sell and Give), the wallet fact line, and for a Sell what
//   each sale pays out.
// - The CTA is `commitCtaLabel`'s ("Sign and list" / "Pay and give" / "Sign
//   and save"), the page's one violet control. It stays aria-disabled on
//   `reviewMissing`, with the reason under it, and on the ladder (Build and
//   Earn P1-4): Keep private and Give at the mint level (L2; a Give's license
//   is its gate's form rule), a Sell at the list level (L3), since it lists
//   as it mints. The steps this flow doesn't gate itself (the demo wallet)
//   show above it, each with its fix.
// - A Sell is a sale of a share: its terms carry the fixed testnet note, and
//   royalties read as a share of resales, if marketplaces honour it.

import * as React from "react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProgressBar, TestnetDemoBadge } from "@/components/ideeza";
import { MintCostRows, WalletFactLine } from "@/components/wallet/mint-cost";
import { StatusGlyph, useClipUrl } from "@/components/video-jobs/video-player";
import { briefStateOf, type MintState } from "@/lib/brief/mint-flow";
import { LICENSES, NETWORKS, type Intent } from "@/lib/brief/types";
import type { ProductReadiness } from "@/lib/manual/p2-types";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { FEE_LABEL } from "@/lib/market/fee";
import { listingInputFromBrief, listingSummaryRows, type ListingCtx, type ListingInput } from "@/lib/market/listing-form";
import { commitCtaLabel } from "@/lib/wallet/mint";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import type { MintType } from "@/lib/wallet/types";
import { readyCountLine, statusCopy } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { royaltyText, SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import { LevelCheck, useCommitCheck } from "@/components/projects/earn/ladder/level-check";
import { MakeVideosButton } from "@/components/projects/make-videos";
import type { BriefGate } from "./brief-app";
import { BriefCard, Spinner, TAP, primaryCta } from "./brief-card";

const SUB_BY_INTENT: Record<Intent, string> = {
  sell: "Check what goes on the marketplace, then sign once in your wallet.",
  give: "Check what you're giving, then sign once in your wallet. A gift can't be taken back.",
  save: "Check what you're keeping, then sign once in your wallet — it's free.",
};

const SHARED_AS: Record<Intent, string> = {
  sell: "Listed for sale",
  give: "Given to the community",
  save: "Kept private",
};

export const MAKE_VIDEOS = "Make videos";
const VIDEOS_OPTIONAL = "Videos are optional when you keep it private.";
const VIDEOS_READY = "Every product has its video.";
/** The flow's own ownership confirm and its readiness gate already ask these. */
const MINT_HANDLED = ["ownership", "videos"] as const;
/** A Sell's too, and Details asks its license; the commit is the mint, and every mint pays a wallet. */
const LIST_HANDLED = ["ownership", "videos", "license", "minted", "payout"] as const;

/** The cost box's listing row: "Listing (Buy now) · 0.05 MATIC". */
function listingCostRow(input: ListingInput): { label: string; amount: string } | undefined {
  const token = input.token;
  if (!token) return undefined;
  if (input.type === "buyNow") {
    return toMicros(input.price.trim()) ? { label: "Listing (Buy now)", amount: formatAmount(input.price, token) } : undefined;
  }
  return toMicros(input.minBid.trim())
    ? { label: "Listing (Auction)", amount: `from ${formatAmount(input.minBid, token)}` }
    : undefined;
}

/** What each sale pays out (C10) — the rate alone before a Buy-now price is typed. */
function eachSaleRows(input: ListingInput, ctx: ListingCtx) {
  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  if (input.type === "buyNow" && !priced) return [{ label: FEE_LABEL, value: "taken from the price of each sale" }];
  return listingSummaryRows(input, ctx);
}

/** The terms Details set, as label/value rows. */
function termsOf(s: MintState, intent: Intent, type: MintType, input: ListingInput): { label: string; value: string }[] {
  const rows = [
    { label: "Shared as", value: SHARED_AS[intent] },
    { label: "Blockchain", value: NETWORKS.find((n) => n.value === s.network)?.label ?? s.network },
    { label: "Collection", value: s.collection || "Not chosen" },
    { label: "Minting", value: type === "instant" ? "Instant — on chain now" : "Lazy — a free signature" },
  ];
  if (intent === "give" || intent === "sell") {
    rows.push({ label: "License", value: LICENSES.find((l) => l.value === s.license)?.label ?? "Not chosen" });
  }
  if (intent === "sell") {
    const cost = listingCostRow(input);
    rows.push({ label: input.type === "auction" ? "Auction" : "Buy now", value: cost?.amount ?? "No price yet" });
    if (input.percentSelling !== null) rows.push({ label: "Selling", value: `${input.percentSelling}% of the project` });
    if (input.royalties.trim()) rows.push({ label: "Royalties", value: royaltyText(input.royalties.trim()) });
  }
  return rows;
}

export function StepReview({
  state,
  project,
  imageUrl,
  gate,
  type,
  missing,
  detailsMissing,
  now,
  creatorPct,
  minting,
  mintError,
  onBack,
  onSign,
}: {
  state: MintState;
  /** The engineering record, read back. */
  project: { id: string; name: string; description: string; detail: string };
  /** The headline product's concept image, when the project came from a build. */
  imageUrl?: string;
  gate: BriefGate;
  /** Lazy or Instant: what the wallet will be asked for. A private mint is always lazy. */
  type: MintType;
  /** `reviewMissing`: why the CTA is shut, or null. */
  missing: string | null;
  /** Details' own reason, when one has come back (an auction end that passed). */
  detailsMissing: string | null;
  now: number;
  creatorPct: number;
  /** The commit's wallet request is open. */
  minting: boolean;
  /** Why the last commit didn't mint. */
  mintError: string | null;
  onBack: () => void;
  onSign: () => void;
}) {
  const intent: Intent = state.intent ?? "sell";
  const reasonId = React.useId();
  const headingId = React.useId();
  const input = listingInputFromBrief(briefStateOf(state));
  const listingCtx: ListingCtx = { mode: "brief", now, creatorPct };
  // Nothing is minted until this commit, so "none" stands in; a Sell's minted and payout steps are the commit's own.
  const selling = intent === "sell";
  const ladder = useCommitCheck(
    selling ? "list" : "mint",
    { products: gate.readiness.products.map(() => ({ dropped: null })), sell: gate.readiness, commercial: "none", license: state.license },
    { handled: selling ? LIST_HANDLED : MINT_HANDLED },
  );
  const stepsId = React.useId();
  const canGo = !missing && !minting && ladder.ok;
  const cta = commitCtaLabel(intent, type, { last: true, fromPreview: false, innovations: state.shareToNewsfeed });
  const { readiness, gated } = gate;
  const counts = readiness.counts;
  const videosLine = !gated
    ? VIDEOS_OPTIONAL
    : (readiness.rules.find((r) => r.id === "videos" && !r.ok)?.reason ?? VIDEOS_READY);

  return (
    <BriefCard title="Review and sign" description={SUB_BY_INTENT[intent]} onBack={minting ? undefined : onBack}>
      <div className="flex flex-col gap-[20px]">
        <section aria-label="What is minted" className="flex flex-col gap-[14px]">
          <div className="flex items-start gap-[14px]">
            <Thumb src={imageUrl ?? null} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold text-text-primary">{project.name}</div>
              <p className="m-0 mt-[2px] line-clamp-3 max-w-[62ch] text-md leading-relaxed text-text-secondary">
                {project.description.trim() || "No description yet."}
              </p>
              <div className="mt-[4px] text-sm text-text-tertiary">{project.detail}</div>
            </div>
          </div>
          <dl className="m-0 flex flex-col divide-y divide-solid divide-border-subtle border-y border-solid border-border-subtle">
            {termsOf(state, intent, type, input).map((r) => (
              <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-[16px] gap-y-[2px] py-[8px]">
                <dt className="text-sm text-text-secondary">{r.label}</dt>
                <dd className="m-0 min-w-0 text-right text-md font-medium tabular-nums text-text-primary">{r.value}</dd>
              </div>
            ))}
          </dl>
          {intent === "sell" && <p className="m-0 max-w-[62ch] text-md leading-relaxed text-text-secondary">{SHARE_SALE_NOTE}</p>}
        </section>

        <section aria-labelledby={headingId} className="flex flex-col gap-[10px]">
          <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
            <h2 id={headingId} className="m-0 text-md font-semibold text-text-primary">
              Videos
            </h2>
            <span className="text-sm text-text-secondary">{readyCountLine(counts.ready, counts.total)}</span>
          </div>
          {readiness.products.length > 0 ? (
            <ul role="list" className="m-0 flex list-none flex-col divide-y divide-solid divide-border rounded-lg border border-solid border-border p-0">
              {readiness.products.map((row) => (
                <VideoRow key={row.productId} row={row} />
              ))}
            </ul>
          ) : null}
          <p className="m-0 text-md text-text-secondary">{videosLine}</p>
          {counts.missing > 0 ? (
            // The videos open over the review: the maker never leaves the mint (owner, 2026-10-12).
            <MakeVideosButton projectId={project.id} label={MAKE_VIDEOS} className={cn(TAP, "self-start")} />
          ) : null}
        </section>

        {/* Money shows for a Sell and a Give, never for a private mint (v1's rule). */}
        {intent !== "save" && (
          <MintCostRows
            type={type}
            network={state.network}
            intent={intent}
            listing={intent === "sell" ? listingCostRow(input) : undefined}
          />
        )}
        <WalletFactLine type={type} network={state.network} />

        {intent === "sell" && (
          <section aria-label="Each sale" className="flex flex-col gap-2 rounded-lg border border-solid border-border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-caps text-text-tertiary">Each sale</span>
              <TestnetDemoBadge />
            </div>
            {eachSaleRows(input, listingCtx).map((r, i) => (
              <p key={i} className="m-0 text-md text-text-secondary">
                {r.label ? (
                  <>
                    <span>{r.label}</span> · <span className="font-medium tabular-nums text-text-primary">{r.value}</span>
                  </>
                ) : (
                  r.value
                )}
              </p>
            ))}
          </section>
        )}

        <LevelCheck check={ladder} what={selling ? "mint and list" : "mint"} id={stepsId} project={project} brief={null} />

        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => {
              if (canGo) onSign();
            }}
            aria-disabled={!canGo || undefined}
            aria-describedby={[missing && reasonId, !ladder.ok && stepsId].filter(Boolean).join(" ") || undefined}
            aria-busy={minting || undefined}
            className={primaryCta(canGo)}
          >
            {minting ? (
              <>
                <Spinner />
                Waiting for your wallet…
              </>
            ) : (
              <>
                {/* The wallet glyph stands for "pay" — only an instant mint does. */}
                {type === "instant" ? <WalletIcon /> : null}
                {cta}
              </>
            )}
          </button>
          {missing ? (
            <p id={reasonId} className="m-0 text-center text-md leading-relaxed text-text-secondary">
              {missing}
              {detailsMissing === missing ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onBack}
                    className={`inline-flex items-center border-0 bg-transparent p-0 text-md font-semibold text-text-primary underline underline-offset-2 ${TAP}`}
                  >
                    Change the details
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
          {mintError && !minting ? (
            <p role="status" className="m-0 text-center text-md leading-relaxed text-text-primary">
              {mintError}
            </p>
          ) : null}
        </div>
      </div>
    </BriefCard>
  );
}

/** One product's video: its poster, name and state, live; a render shows its progress. */
function VideoRow({ row }: { row: ProductReadiness }) {
  const copy = statusCopy(row.video);
  const name = displayProductName(row.name);
  return (
    <li className="flex flex-col gap-[8px] px-[14px] py-[10px]">
      <div className="flex min-h-[44px] items-center gap-[12px]">
        <RowThumb row={row} />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="truncate text-md font-semibold text-text-primary">{name}</span>
          <span className="flex items-center gap-[6px] text-sm text-text-secondary">
            <StatusGlyph icon={copy.icon} tone={copy.tone} size={14} />
            <span>{copy.text}</span>
          </span>
        </span>
      </div>
      {copy.progress !== null ? <ProgressBar value={copy.progress} label={`${name} video`} /> : null}
    </li>
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

/** The project's picture: its concept image, else the brand gradient. */
function Thumb({ src }: { src: string | null }) {
  const [broken, setBroken] = React.useState<string | null>(null);
  const shown = src && src !== broken ? src : null;
  return (
    <span aria-hidden className="relative flex h-[54px] w-[72px] flex-none overflow-hidden rounded-md bg-[image:var(--gradient-brand)]">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(shown)} />
      ) : null}
    </span>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2" />
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M16.5 13.5h1.5" />
    </svg>
  );
}
