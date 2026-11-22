"use client";

// Add to marketplace and Edit listing (Figma 13's terms on the Sell tab, 14j;
// the web's listing-dialog.tsx), as a pushed full screen (mobile UX pass
// 2026-11-15): what is listed with the Testnet demo chip, the videos-ready
// line (Add), the shared listing terms (what the mint fixed as one read-only
// list; Edit adds the listing type and minting type), then one summary card —
// the cost, the wallet's line and "Each sale" — and Add to marketplace /
// Update as the bottom bar's one primary with the first missing thing under
// it (Back closes). One wallet request through the phone's sheet:
// · Add — the mint's request when the project still needs one (lazy or
//   instant), else a free signature; at confirm the record, then the listing,
//   are written; a refused listing write puts the record back.
// · Edit — a free signature for a lazy listing, the network fee for an
//   on-chain one; it may not change once sold or closed.
// CL-030: once every video has started, a video still rendering or waiting
// for review doesn't stop Add — the form says "You don't have to wait. …", the
// wallet's done line says it waits, and the listing is kept off Explore
// marketplace (lib/market/held.ts) until every video is ready, then goes live
// by itself. CL-016: closing with any field changed asks "Discard this
// listing?" first (Cancel · Discard); with nothing changed it closes at once.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import type { ListingField } from "@/components/projects/listing/listing-fields";
import { makerShareNow, refusedCopy, sellRecheckOf } from "@/components/projects/listing/listing-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { readinessFactsOf, readinessOf, videoCountOf, videosBlockerOf } from "@/lib/manual/readiness";
import { hold, heldId } from "@/lib/market/held";
import { readProjectVideos } from "@/lib/video/store";
import { heldNoteOf } from "@/lib/video/video-copy";
import { useMintShortfall } from "@/components/wallet/mint-cost";
import { useMint } from "@/components/wallet/use-mint";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/brief/gas";
import { bumpMinted } from "@/lib/brief/wallet";
import { listingMetadataOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { FEE_LABEL } from "@/lib/market/fee";
import { createListing, editListing, listingViewOf } from "@/lib/market/listing";
import {
  COLLECTION_UNKNOWN,
  DEMO_LINE,
  HELD_ANNOUNCEMENT,
  HELD_DONE_LINE,
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
import { listingInputFromListing, listingProblems, listingSummaryRows, type ListingCtx, type ListingInput } from "@/lib/market/listing-form";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { randomId } from "@/lib/market/sales";
import type { Listing, ListingMetadata } from "@/lib/market/types";
import { formatAmount, toMicros } from "@/lib/wallet/money";
import type { RequestResult } from "@/lib/wallet/types";
import { BottomBar } from "../../kit/bottom-bar";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { useEarn } from "../context";
import { ListingFields } from "../listing-fields";
import { CostCard, WalletLine } from "../mint/mint-steps";
import { FullLayer, SUB } from "./parts";
import { LIST_CARD } from "../../kit/list";
import { cn } from "@/lib/utils";
import { T } from "../../type";

const NETWORK_UNKNOWN = "This mint's network isn't known, so it can't be listed. Check it in the Brief.";
const GONE = "This project no longer exists.";
const NO_MINT_RECORD = "This project's mint record is gone, so it can't be minted on chain now. Close this and look again.";
/** Amount fields show a wrong typed value at once; the rest after they're left. */
const AT_ONCE: ReadonlySet<ListingField> = new Set<ListingField>(["price", "minBid", "auctionBuyNow"]);
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
const wallClock = () => Date.now();

export function ListingFormLayer({ listing, onClose, onDone }: { listing: Listing | null; onClose: () => void; onDone: (message: string) => void }) {
  const { project, view, brief, now } = useEarn();
  const { projects, setMint, updateProject, setOwnerConfirmed } = useManualProjects();
  const { writeListings } = useMarket();
  const mint = useMint();
  const { request } = useWalletRequest();
  const { jobs } = useVideoJobs();
  const editing = listing;
  const creatorPct = view.ownership.maker;
  const mintStatus = view.mint.status;

  const [input, setInput] = React.useState<ListingInput>(() =>
    editing
      ? listingInputFromListing(editing)
      : addInputOf({ listing: view.listing, record: view.mint.record, mintStatus, draft: brief?.state ?? null, creatorPct, now }),
  );
  // What the form opened with: closing asks first once anything differs from it (CL-016).
  const [opening] = React.useState(input);
  const [discarding, setDiscarding] = React.useState(false);
  const [left, setLeft] = React.useState<ReadonlySet<ListingField>>(() => new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const reasonId = React.useId();

  const latest = React.useRef({ projects, jobs });
  React.useEffect(() => {
    latest.current = { projects, jobs };
  }, [projects, jobs]);
  const find = () => latest.current.projects.find((p) => p.id === project.id) ?? null;
  // A video still being made: the listing will wait for it (CL-030).
  const videosWait = !editing ? videosBlockerOf(view.videos.readiness.sell) : null;

  const network = input.network;
  const mints = !editing && mintStatus !== "onChain" && !(mintStatus === "lazyMinted" && input.mintingType === "lazy");
  const shortfall = useMintShortfall(mints ? input.mintingType : "lazy", network ?? "mumbai");
  const ctx: ListingCtx = { mode: editing ? "edit" : "add", now, creatorPct, original: editing ?? undefined };
  const problems = listingProblems(input, ctx);
  const firstReason = !network ? NETWORK_UNKNOWN : !input.collection ? COLLECTION_UNKNOWN : (problems.first ?? shortfall?.missing ?? null);

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
    if (busy) return;
    if (JSON.stringify(input) !== JSON.stringify(opening)) setDiscarding(true);
    else onClose();
  };

  const runAdd = async (): Promise<{ result: RequestResult; written: Listing | null; held: boolean }> => {
    const net = input.network!;
    const collection = input.collection;
    const chosen = input.mintingType;
    const plan = mint.plan({ projectId: project.id, intent: "sell", type: chosen, network: net, collection, current: mintStatus });
    if (!plan) return { result: { ok: false, reason: "recheck", message: GONE }, written: null, held: false };
    const endsAt = input.type === "auction" ? new Date(input.endsAt).getTime() : null;
    const built = listRequestOf({ projectName: project.name, network: net, collection, tokenId: plan.tokenId, input, endsAt, mintRequest: plan.request });
    // A video still being made: the wallet says it waits (CL-030).
    const req = videosWait ? { ...built, doneLine: HELD_DONE_LINE } : built;
    const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
    let written: Listing | null = null;
    let held = false;
    const result = await request(req, {
      recheck: () => {
        const m = readMarketNow();
        const at = Date.now();
        const v = listingViewOf(project.id, { listings: m.listings, sales: m.sales, bids: m.bids, now: at, current: NO_METADATA });
        if (v.kind === "live" || v.kind === "paused") return "This project is already on the marketplace.";
        const p = find();
        if (!p) return GONE;
        return sellRecheckOf(p, { view, brief, purpose: "sell", percentSelling: input.percentSelling ?? 0, market: m, jobs: latest.current.jobs, now: at });
      },
      commit: (proof) => {
        const p = find();
        if (!p) return { ok: false, message: GONE };
        const m = readMarketNow();
        const terms: ListingInput = { ...input, network: net, collection, mintingType: listedMintingType(mintStatus, chosen), benefits: cleanBenefits(input.benefits) };
        const created = createListing(m.listings, p.id, terms, listingMetadataOf(p, view.products, proof.at), "page", proof.at, { listing: () => randomId("lst_") });
        if (!created.ok) return { ok: false, message: created.reason };
        // A video still missing, rendering or unreviewed (CL-030): signed now, the listing waits off
        // Explore marketplace until every video is ready, then goes live by itself.
        const waitFor = videosBlockerOf(readinessOf(readinessFactsOf(p, view, brief, readProjectVideos(p.id), latest.current.jobs, proof.at), "sell"));
        const prior = p.mint ?? null;
        const record = plan.request ? plan.nextRecord(proof) : null;
        if (plan.request && !record) return { ok: false, conflict: true, message: NO_MINT_RECORD };
        if (record && !setMint(p.id, record)) return { ok: false, message: STORAGE_FULL };
        const made = created.listings[created.listings.length - 1];
        const w = waitFor
          ? hold({ id: heldId(), projectId: p.id, kind: "main", at: proof.at, listing: made }).ok
            ? ({ ok: true } as const)
            : ({ ok: false, reason: "storage" } as const)
          : writeListings(created.listings);
        if (!w.ok) {
          if (record) {
            if (prior) setMint(p.id, prior);
            else updateProject(p.id, { mint: undefined });
          }
          return { ok: false, message: refusedCopy(w.reason) };
        }
        if (newMint) bumpMinted(net, collection);
        if (typeof p.ownerConfirmedAt !== "number") setOwnerConfirmed(p.id, proof.at);
        written = made;
        held = waitFor !== null;
        return { ok: true };
      },
    });
    return { result, written, held };
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
    const reason = firstReason ?? listingProblems(input, { ...ctx, now: wallClock() }).first;
    if (reason) {
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setError(null);
    setBusy(true);
    const run = editing ? { ...(await runEdit(editing)), held: false } : await runAdd();
    const { result, written } = run;
    setBusy(false);
    if (result.ok && written) return onDone(editing ? updatedAnnouncement(written) : run.held ? HELD_ANNOUNCEMENT : listedAnnouncement(written));
    if (!result.ok && result.reason !== "rejected") setError(result.message || STORAGE_FULL);
  };

  const priced = (toMicros(input.price.trim()) ?? BigInt(0)) > BigInt(0);
  const summary =
    input.type === "buyNow" && !priced ? [{ label: FEE_LABEL, value: "taken from the price of each sale" }] : listingSummaryRows(input, ctx);
  const costRow =
    input.token && input.type === "buyNow" && toMicros(input.price.trim())
      ? { label: "Listing (Buy now)", amount: formatAmount(input.price, input.token) }
      : input.token && input.type === "auction" && toMicros(input.minBid.trim())
        ? { label: "Listing (Auction)", amount: `from ${formatAmount(input.minBid, input.token)}` }
        : undefined;
  const gas = network ? estimateGas(network) : null;

  return (
    <FullLayer
      title={editing ? "Edit listing" : "Add to marketplace"}
      onBack={close}
      footer={
        <BottomBar>
          <div className="flex">
            <Button
              size="xl"
              className="w-full"
              loading={busy}
              aria-disabled={firstReason ? true : undefined}
              aria-describedby={firstReason ? reasonId : undefined}
              onClick={() => void submit()}
            >
              {editing ? (busy ? "Updating…" : "Update") : busy ? "Listing…" : "Add to marketplace"}
            </Button>
          </div>
          {firstReason && (
            <p id={reasonId} className={SUB}>
              {firstReason}
            </p>
          )}
        </BottomBar>
      }
    >
      <div ref={bodyRef} inert={busy || undefined} className="flex flex-col gap-8 px-8 pb-12 pt-4">
        <div className="flex flex-col gap-2">
          <p className={cn(T.meta, "flex flex-wrap items-center gap-x-3 gap-y-1")}>
            <span className="min-w-0 break-words">{`Main NFT · ${project.name}`}</span>
            <TestnetDemoBadge />
          </p>
          {!editing &&
            (videosWait ? (
              <p className={cn(T.body, "rounded-xl border-[length:var(--border-width-1)] border-solid border-border-brand bg-bg-brand-subtle p-6 text-text-primary")}>
                {heldNoteOf("Explore marketplace", videoCountOf(view.videos.readiness.sell).total)}
              </p>
            ) : (
              <p className={cn(T.meta, "text-text-success")}>{VIDEOS_READY_LINE}</p>
            ))}
        </div>
        {error && <Banner tone="error">{error}</Banner>}
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
        <section aria-label="Cost and each sale" className={cn(LIST_CARD, "gap-6 p-8")}>
          {network && (
            <>
              {editing ? (
                <div className="flex flex-col gap-3">
                  <h3 className={T.section}>Cost</h3>
                  <p className={T.body}>
                    {editing.mintingType === "instant" ? "Changing an on-chain listing costs a network fee." : "Nothing to pay — you sign the new terms."}
                  </p>
                  {editing.mintingType === "instant" && gas && (
                    <p className={cn(T.rowTitle, "flex flex-wrap justify-between gap-x-6 text-text-secondary")}>
                      <span>{gas.label}</span>
                      <span className="tabular-nums">{`${gas.fee} ${gas.native} ${gas.note}`}</span>
                    </p>
                  )}
                </div>
              ) : mintStatus === "onChain" ? (
                <div className="flex flex-col gap-3">
                  <h3 className={T.section}>Cost</h3>
                  <p className={T.body}>Nothing to pay now — the token is already on chain. You sign the listing.</p>
                </div>
              ) : (
                <CostCard type={input.mintingType} network={network} intent="sell" listing={costRow} />
              )}
              <WalletLine type={(editing ? editing.mintingType === "instant" : mints && input.mintingType === "instant") ? "instant" : "lazy"} network={network} badge={false} ruled />
            </>
          )}
          <div className="flex flex-col gap-2 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
            <h3 className={T.section}>Each sale</h3>
            {summary.map((r, i) => (
              <p key={i} className={T.body}>
                {r.label ? (
                  <>
                    <span>{r.label}</span> · <span className="font-medium tabular-nums text-text-primary">{r.value}</span>
                  </>
                ) : (
                  r.value
                )}
              </p>
            ))}
          </div>
          <p className={T.meta}>{DEMO_LINE}</p>
        </section>
      </div>
      <ConfirmSheet
        open={discarding}
        onClose={() => setDiscarding(false)}
        title="Discard this listing?"
        body="Nothing entered here is saved yet. Closing now throws it away."
        verb="Discard"
        destructive
        onConfirm={() => {
          setDiscarding(false);
          onClose();
        }}
      />
    </FullLayer>
  );
}

/** Re-exported for the Main row: the maker's share now, read fresh. */
export { makerShareNow };
