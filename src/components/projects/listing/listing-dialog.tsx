"use client";

// ListingDialog — "Add to marketplace" and "Edit listing" (Figma
// 41505:142407…143557 and 143717; P2-LISTING-4…7 as changed in spec §4.5).
//
// - One ModalFrame, size sm, whose body scrolls while the footer stays: the
//   Testnet demo line, the videos line (Add), ListingFields, the cost box and
//   the wallet fact line, then `listingSummaryRows` — the IDEEZA fee and what
//   the maker receives (C10).
// - The CTA stays focusable while something is missing (aria-disabled), with
//   the first problem under it; pressing it then shows every message and
//   moves focus to the first field that needs one (P2-LISTING-5).
// - Submitting makes ONE wallet request (§3.9). Just before it confirms, the
//   recheck reads the market, every product's video and the maker's share
//   fresh (`sellRecheckOf`): another tab may have listed it, dropped a
//   video or given the share away. Its `commit` runs inside the dialog at
//   confirmed: the mint record (when it changes; a mint that yields no
//   record writes nothing), then the listing in one write; a refused listing
//   write puts the record back as it was.
//   The collection's token counter moves only for a new mint. The wallet
//   writes its debit after all of that, last.
// - Busy: the CTA reads "Listing…" / "Updating…", and the wallet dialog on
//   top owns the keyboard. Cancelled in the wallet: back here, nothing
//   written. A refused write: this dialog stays open and says why.

import * as React from "react";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { Banner, Button, ModalFrame, Spinner, TestnetDemoBadge } from "@/components/ideeza";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { MintCostRows, WalletFactLine, useMintShortfall } from "@/components/wallet/mint-cost";
import { useMint } from "@/components/wallet/use-mint";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/brief/gas";
import type { Network } from "@/lib/brief/types";
import { bumpMinted } from "@/lib/brief/wallet";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { parseStored, readStoredKey } from "@/lib/key-store";
import { ownershipOf } from "@/lib/manual/ownership";
import { listingMetadataOf, type ProjectView } from "@/lib/manual/project-read";
import { normalizeProjects, PROJECTS_KEY, useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { readinessFactsOf, readinessOf } from "@/lib/manual/readiness";
import { FEE_LABEL } from "@/lib/market/fee";
import { createListing, editListing, listingViewOf } from "@/lib/market/listing";
import {
  COLLECTION_UNKNOWN,
  DEMO_LINE,
  MARKET_UNREADABLE,
  STORAGE_FULL,
  VIDEOS_READY_LINE,
  addInputOf,
  cleanBenefits,
  editRequestOf,
  listRequestOf,
  listedAnnouncement,
  listedMintingType,
  updatedAnnouncement,
} from "@/lib/market/listing-flow";
import {
  listingInputFromListing,
  listingProblems,
  listingSummaryRows,
  type ListingCtx,
  type ListingInput,
} from "@/lib/market/listing-form";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { mainSalesOf, randomId } from "@/lib/market/sales";
import type { Listing, ListingMetadata, MarketData } from "@/lib/market/types";
import type { VideoJob } from "@/lib/video/jobs";
import { readProjectVideos } from "@/lib/video/store";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import type { RequestResult } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { ListingFields, type ListingField } from "./listing-fields";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const NETWORK_UNKNOWN = "This mint's network isn't known, so it can't be listed. Check it in the Brief.";
const GONE = "This project no longer exists.";
const NO_MINT_RECORD = "This project's mint record is gone, so it can't be minted on chain now. Close this and look again.";
/** Amount fields show a wrong typed value at once; the rest after they're left (P2-LISTING-5). */
const AT_ONCE: ReadonlySet<ListingField> = new Set<ListingField>(["price", "minBid", "auctionBuyNow"]);
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

const wallClock = () => Date.now();

let pendingFocus: (() => void) | null = null;

/** Focuses `id` once it's on the page — the next render may be the one that draws it — and
 *  once every dialog has closed: the wallet dialog stays open on Done after the write, and
 *  its own close would otherwise take focus back to a control that's gone. The latest call
 *  wins; it outlives the caller, whose card may be replaced by the write. */
export function focusSoon(id: string, tries = 12): void {
  pendingFocus?.();
  const step = (left: number) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.focus();
      else if (left > 0) step(left - 1);
    });
  pendingFocus = whenDialogsClose(() => {
    pendingFocus = null;
    step(tries);
  });
}

/** Why a store write was refused, in the listing's words. */
export function refusedCopy(reason: "unreadable" | "conflict" | "storage"): string {
  if (reason === "unreadable") return MARKET_UNREADABLE;
  if (reason === "conflict") return "Another tab changed this listing first — close this and look again.";
  return STORAGE_FULL;
}

/** The maker's share now: the co-owners as storage holds them (another tab may have given
 *  the share away) and the Main sales in `market`. */
export function makerShareNow(p: ManualProject, market: MarketData): number {
  const stored = normalizeProjects(parseStored(readStoredKey(PROJECTS_KEY)).value ?? []).find((x) => x.id === p.id);
  return ownershipOf({
    createdAt: p.createdAt,
    contributors: (stored ?? p).contributors ?? [],
    sales: mainSalesOf(p.id, market.sales),
    listedPercent: 0,
  }).maker;
}

/**
 * The last check before a new listing or a relist confirms, read fresh: every
 * product's video still ready (Sell's rule, P2-VIDEO-13) and the maker still
 * holding the share it sells (R1-1). Null when both hold.
 */
export function sellRecheckOf(
  p: ManualProject,
  ctx: {
    view: ProjectView;
    brief: StoredDraft | null;
    purpose: "sell" | "relist";
    percentSelling: number;
    market: MarketData;
    jobs: VideoJob[];
    now: number;
  },
): string | null {
  const facts = readinessFactsOf(p, ctx.view, ctx.brief, readProjectVideos(p.id), ctx.jobs, ctx.now);
  const videos = readinessOf(facts, ctx.purpose).rules.find((r) => r.id === "videos");
  if (videos && !videos.ok) return `A video changed while this was open: ${videos.reason}`;
  const maker = makerShareNow(p, ctx.market);
  if (ctx.percentSelling <= maker) return null;
  return maker > 0
    ? `You hold ${maker}% of this project now, less than the ${ctx.percentSelling}% this listing sells. Close this and lower Percent Selling.`
    : "You no longer hold any share of this project to sell.";
}

export type ListingDialogProps = {
  mode: "add" | "edit";
  project: ManualProject;
  view: ProjectView;
  brief: StoredDraft | null;
  /** The page's minute clock. */
  now: number;
  /** Edit: the live or paused Buy-now listing. */
  listing?: Listing;
  onClose: () => void;
  /** After the write: what the page's live region says. */
  onDone: (message: string) => void;
};

export function ListingDialog({ mode, project, view, brief, now, listing, onClose, onDone }: ListingDialogProps) {
  const { projects, setMint, updateProject, setOwnerConfirmed } = useManualProjects();
  const { writeListings } = useMarket();
  const mint = useMint();
  const { request } = useWalletRequest();
  const { jobs } = useVideoJobs();
  const editing = mode === "edit" && listing ? listing : null;
  const creatorPct = view.ownership.maker;
  const mintStatus = view.mint.status;

  const [input, setInput] = React.useState<ListingInput>(() =>
    editing
      ? listingInputFromListing(editing)
      : addInputOf({
          listing: view.listing,
          record: view.mint.record,
          mintStatus,
          draft: brief?.state ?? null,
          creatorPct,
          now,
        }),
  );
  const [left, setLeft] = React.useState<ReadonlySet<ListingField>>(() => new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const reasonId = React.useId();

  // The latest record, for a commit that runs seconds after the press.
  const latest = React.useRef(projects);
  const latestJobs = React.useRef(jobs);
  React.useEffect(() => {
    latest.current = projects;
    latestJobs.current = jobs;
  }, [projects, jobs]);
  const find = () => latest.current.find((p) => p.id === project.id) ?? null;

  const network = input.network;
  // A new mint, or an upgrade: the wallet charges or signs the mint itself.
  const mints = !editing && mintStatus !== "onChain" && !(mintStatus === "lazyMinted" && input.mintingType === "lazy");
  const shortfall = useMintShortfall(mints ? input.mintingType : "lazy", network ?? "mumbai");

  const ctx: ListingCtx = { mode: editing ? "edit" : "add", now, creatorPct, original: editing ?? undefined };
  const problems = listingProblems(input, ctx);
  const firstReason = !network ? NETWORK_UNKNOWN : !input.collection ? COLLECTION_UNKNOWN : problems.first ?? shortfall?.missing ?? null;

  const shown: Partial<Record<ListingField, string>> = {};
  for (const [key, message] of Object.entries(problems.fields) as [ListingField, string][]) {
    const typed = AT_ONCE.has(key) && String(input[key] ?? "").trim() !== "";
    if (submitted || left.has(key) || typed) shown[key] = message;
  }

  const change = (patch: Partial<ListingInput>) => {
    setError(null);
    setInput((i) => ({ ...i, ...patch }));
  };
  const leave = (field: ListingField) => setLeft((s) => (s.has(field) ? s : new Set(s).add(field)));

  const close = () => {
    if (!busy) onClose();
  };

  const runAdd = async (): Promise<{ result: RequestResult; written: Listing | null }> => {
    const net = input.network!;
    const collection = input.collection;
    const chosen = input.mintingType;
    const plan = mint.plan({ projectId: project.id, intent: "sell", type: chosen, network: net, collection, current: mintStatus });
    if (!plan) return { result: { ok: false, reason: "recheck", message: GONE }, written: null };
    const endsAt = input.type === "auction" ? new Date(input.endsAt).getTime() : null;
    const req = listRequestOf({
      projectName: project.name,
      network: net,
      collection,
      tokenId: plan.tokenId,
      input,
      endsAt,
      mintRequest: plan.request,
    });
    const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
    let written: Listing | null = null;
    const result = await request(req, {
      // Another tab may have listed it meanwhile (errata 13: the caller gates a new listing).
      recheck: () => {
        const m = readMarketNow();
        const at = Date.now();
        const v = listingViewOf(project.id, { listings: m.listings, sales: m.sales, bids: m.bids, now: at, current: NO_METADATA });
        if (v.kind === "live" || v.kind === "paused") return "This project is already on the marketplace.";
        const p = find();
        if (!p) return GONE;
        return sellRecheckOf(p, {
          view,
          brief,
          purpose: "sell",
          percentSelling: input.percentSelling ?? 0,
          market: m,
          jobs: latestJobs.current,
          now: at,
        });
      },
      commit: (proof) => {
        const p = find();
        if (!p) return { ok: false, message: GONE };
        const m = readMarketNow();
        const terms: ListingInput = {
          ...input,
          network: net,
          collection,
          mintingType: listedMintingType(mintStatus, chosen),
          benefits: cleanBenefits(input.benefits),
        };
        const created = createListing(
          m.listings,
          p.id,
          terms,
          listingMetadataOf(p, view.products, proof.at),
          "page",
          proof.at,
          { listing: () => randomId("lst_") },
        );
        if (!created.ok) return { ok: false, message: created.reason };
        const prior = p.mint ?? null;
        const record = plan.request ? plan.nextRecord(proof) : null;
        // A mint that yields no record would list it as minted with nothing behind it.
        if (plan.request && !record) return { ok: false, conflict: true, message: NO_MINT_RECORD };
        if (record && !setMint(p.id, record)) return { ok: false, message: STORAGE_FULL };
        const w = writeListings(created.listings);
        if (!w.ok) {
          if (record) {
            if (prior) setMint(p.id, prior);
            else updateProject(p.id, { mint: undefined });
          }
          return { ok: false, message: refusedCopy(w.reason) };
        }
        if (newMint) bumpMinted(net, collection);
        // The box ticked here is the Sell rule's ownership fix (readiness `fixedIn: "form"`).
        if (typeof p.ownerConfirmedAt !== "number") setOwnerConfirmed(p.id, proof.at);
        written = created.listings[created.listings.length - 1];
        return { ok: true };
      },
      // "Use lazy mint instead" when an instant mint can't be paid: back to the form, lazy chosen.
      onUseLazy: mints && chosen === "instant" ? () => change({ mintingType: "lazy" }) : undefined,
    });
    return { result, written };
  };

  const runEdit = async (l: Listing): Promise<{ result: RequestResult; written: Listing | null }> => {
    const next: ListingInput = { ...input, benefits: cleanBenefits(input.benefits) };
    let written: Listing | null = null;
    const result = await request(editRequestOf(l, project.name, next), {
      recheck: () => {
        const m = readMarketNow();
        const cur = m.listings.find((x) => x.id === l.id);
        if (m.sales.some((s) => s.listingId === l.id && s.item.nft === "main")) return "It has just sold, so its terms can't change.";
        return cur && (cur.status === "live" || cur.status === "paused") ? null : "This listing isn't open any more.";
      },
      commit: (proof) => {
        const m = readMarketNow();
        const edited = editListing(m.listings, l.id, next, proof.at);
        if (!edited.ok) return { ok: false, message: edited.reason };
        const w = writeListings(edited.listings);
        if (!w.ok) return { ok: false, message: refusedCopy(w.reason) };
        written = edited.listings.find((x) => x.id === l.id) ?? null;
        return { ok: true };
      },
    });
    return { result, written };
  };

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    // The auction end is checked once more against the wall clock, not the minute one.
    const reason = firstReason ?? listingProblems(input, { ...ctx, now: wallClock() }).first;
    if (reason) {
      // Every message shows now; focus goes to the first field that has one.
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setError(null);
    setBusy(true);
    const { result, written } = editing ? await runEdit(editing) : await runAdd();
    setBusy(false);
    if (result.ok && written) {
      onDone(editing ? updatedAnnouncement(written) : listedAnnouncement(written));
      return;
    }
    if (!result.ok && result.reason !== "rejected") setError(result.message || STORAGE_FULL);
  };

  const title = editing ? "Edit listing" : "Add to marketplace";
  const cta = editing ? (busy ? "Updating…" : "Update") : busy ? "Listing…" : "Add to marketplace";
  const summary = summaryRows(input, ctx);

  return (
    <ModalFrame
      open
      onClose={close}
      covered={busy}
      size="sm"
      initialFocus={titleRef}
      title={
        <span ref={titleRef} tabIndex={-1} className="outline-none">
          {title}
        </span>
      }
      description={`Main NFT · ${project.name}`}
      footer={
        <div className="ml-auto flex w-full flex-col items-stretch gap-3 [@media(min-width:480px)]:w-auto [@media(min-width:480px)]:items-end">
          <div className="flex flex-col-reverse gap-4 [@media(min-width:480px)]:flex-row [@media(min-width:480px)]:justify-end">
            <Button type="button" hierarchy="secondary" size="lg" disabled={busy} className={TAP} onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              aria-disabled={firstReason ? true : undefined}
              aria-describedby={firstReason ? reasonId : undefined}
              aria-busy={busy || undefined}
              className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={() => void submit()}
            >
              {busy && <Spinner size={16} />}
              {cta}
            </Button>
          </div>
          {firstReason && (
            <p id={reasonId} className="max-w-[40ch] text-sm text-text-secondary [@media(min-width:480px)]:text-right">
              {firstReason}
            </p>
          )}
        </div>
      }
    >
      <div ref={bodyRef} inert={busy || undefined} className="flex flex-col gap-8">
        <p className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <TestnetDemoBadge />
          {DEMO_LINE}
        </p>
        {error && <Banner tone="error">{error}</Banner>}
        {!editing && <p className="text-sm font-medium text-text-success">{VIDEOS_READY_LINE}</p>}

        <ListingFields
          mode={editing ? "edit" : "add"}
          value={input}
          onChange={change}
          errors={shown}
          onLeave={leave}
          creatorPct={creatorPct}
          mintStatus={mintStatus}
          mintAddress={view.mint.record?.wallet.address}
          now={now}
          newBenefitId={() => randomId("ben_")}
        />

        {network && (
          <div className="flex flex-col gap-6">
            {editing ? (
              <EditCost onChain={editing.mintingType === "instant"} network={network} />
            ) : mintStatus === "onChain" ? (
              <PlainCost line="Nothing to pay now — the token is already on chain. You sign the listing." />
            ) : (
              <MintCostRows type={input.mintingType} network={network} intent="sell" listing={listingCostRow(input)} />
            )}
            <WalletFactLine
              type={(editing ? editing.mintingType === "instant" : mints && input.mintingType === "instant") ? "instant" : "lazy"}
              network={network}
            />
          </div>
        )}

        <section aria-label="Each sale" className="flex flex-col gap-2 rounded-lg border border-solid border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Each sale</span>
            <TestnetDemoBadge />
          </div>
          {summary.map((r, i) => (
            <p key={i} className="text-sm text-text-secondary">
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
      </div>
    </ModalFrame>
  );
}

/** `listingSummaryRows`, except before a Buy-now price is typed: the rate alone, not "0 MATIC". */
function summaryRows(input: ListingInput, ctx: ListingCtx) {
  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  if (input.type === "buyNow" && !priced) return [{ label: FEE_LABEL, value: "taken from the price of each sale" }];
  return listingSummaryRows(input, ctx);
}

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

function PlainCost({ line }: { line: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-bg-surface-raised p-8">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Cost</span>
        <TestnetDemoBadge />
      </div>
      <p className="text-sm text-text-secondary">{line}</p>
    </div>
  );
}

/** Edit's cost (P2-LISTING-7): a free signature, or the network fee for an on-chain listing. */
function EditCost({ onChain, network }: { onChain: boolean; network: Network }) {
  if (!onChain) return <PlainCost line="Nothing to pay — you sign the new terms." />;
  const gas = estimateGas(network);
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-bg-surface-raised p-8">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">Cost</span>
        <TestnetDemoBadge />
      </div>
      <p className="text-sm text-text-secondary">Changing an on-chain listing costs a network fee.</p>
      <div className="flex flex-wrap justify-between gap-x-6 text-sm font-medium text-text-secondary">
        <span>{gas.label}</span>
        <span className="tabular-nums">
          {gas.fee} {gas.native} <span className="font-regular text-text-tertiary">{gas.note}</span>
        </span>
      </div>
    </div>
  );
}
