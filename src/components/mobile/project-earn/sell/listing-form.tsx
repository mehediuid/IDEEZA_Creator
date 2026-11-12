"use client";

// Add to marketplace and Edit listing (Figma 13's terms on the Sell tab, 14j;
// the web's listing-dialog.tsx), as a pushed full screen: the Testnet demo
// line, the videos-ready line (Add), the shared listing terms (Edit locks the
// first four), the cost and the wallet's line, "Each sale", then Cancel ·
// Add to marketplace / Update in the bottom bar with the first missing thing
// under it. One wallet request through the phone's sheet:
// · Add — the mint's request when the project still needs one (lazy or
//   instant), else a free signature; at confirm the record, then the listing,
//   are written; a refused listing write puts the record back.
// · Edit — a free signature for a lazy listing, the network fee for an
//   on-chain one; it may not change once sold or closed.

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import type { ListingField } from "@/components/projects/listing/listing-fields";
import { makerShareNow, refusedCopy, sellRecheckOf } from "@/components/projects/listing/listing-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { MintCostRows, WalletFactLine, useMintShortfall } from "@/components/wallet/mint-cost";
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
import { useEarn } from "../context";
import { ListingFields } from "../listing-fields";
import { FullLayer, SUB } from "./parts";
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
    if (!busy) onClose();
  };

  const runAdd = async (): Promise<{ result: RequestResult; written: Listing | null }> => {
    const net = input.network!;
    const collection = input.collection;
    const chosen = input.mintingType;
    const plan = mint.plan({ projectId: project.id, intent: "sell", type: chosen, network: net, collection, current: mintStatus });
    if (!plan) return { result: { ok: false, reason: "recheck", message: GONE }, written: null };
    const endsAt = input.type === "auction" ? new Date(input.endsAt).getTime() : null;
    const req = listRequestOf({ projectName: project.name, network: net, collection, tokenId: plan.tokenId, input, endsAt, mintRequest: plan.request });
    const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
    let written: Listing | null = null;
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
        const prior = p.mint ?? null;
        const record = plan.request ? plan.nextRecord(proof) : null;
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
        if (typeof p.ownerConfirmedAt !== "number") setOwnerConfirmed(p.id, proof.at);
        written = created.listings[created.listings.length - 1];
        return { ok: true };
      },
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
    const reason = firstReason ?? listingProblems(input, { ...ctx, now: wallClock() }).first;
    if (reason) {
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setError(null);
    setBusy(true);
    const { result, written } = editing ? await runEdit(editing) : await runAdd();
    setBusy(false);
    if (result.ok && written) return onDone(editing ? updatedAnnouncement(written) : listedAnnouncement(written));
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
        <BottomBar className="pt-8">
          <div className="flex gap-6">
            <Button hierarchy="secondary" size="xl" className="flex-1" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              size="xl"
              className="flex-1"
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
      <div ref={bodyRef} inert={busy || undefined} className="flex flex-col gap-8 px-8 pb-12">
        <p className={T.meta}>{`Main NFT · ${project.name}`}</p>
        <p className={cn(T.body, "flex flex-wrap items-center gap-3")}>
          <TestnetDemoBadge />
          {DEMO_LINE}
        </p>
        {error && <Banner tone="error">{error}</Banner>}
        {!editing && <p className={cn(T.rowTitle, "text-text-success")}>{VIDEOS_READY_LINE}</p>}
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
              <section className="flex flex-col gap-3 rounded-xl bg-bg-surface-raised p-8">
                <span className={cn(T.label, "text-text-tertiary")}>Cost</span>
                <p className={T.body}>
                  {editing.mintingType === "instant" ? "Changing an on-chain listing costs a network fee." : "Nothing to pay — you sign the new terms."}
                </p>
                {editing.mintingType === "instant" && gas && (
                  <p className={cn(T.rowTitle, "flex flex-wrap justify-between gap-x-6 text-text-secondary")}>
                    <span>{gas.label}</span>
                    <span className="tabular-nums">{`${gas.fee} ${gas.native} ${gas.note}`}</span>
                  </p>
                )}
              </section>
            ) : mintStatus === "onChain" ? (
              <section className="flex flex-col gap-3 rounded-xl bg-bg-surface-raised p-8">
                <span className={cn(T.label, "text-text-tertiary")}>Cost</span>
                <p className={T.body}>Nothing to pay now — the token is already on chain. You sign the listing.</p>
              </section>
            ) : (
              <MintCostRows type={input.mintingType} network={network} intent="sell" listing={costRow} />
            )}
            <WalletFactLine type={(editing ? editing.mintingType === "instant" : mints && input.mintingType === "instant") ? "instant" : "lazy"} network={network} />
          </div>
        )}
        <section aria-label="Each sale" className="flex flex-col gap-2 rounded-xl border-[length:var(--border-width-1)] border-solid border-border p-6">
          <span className={cn(T.label, "text-text-tertiary")}>Each sale</span>
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
        </section>
      </div>
    </FullLayer>
  );
}

/** Re-exported for the Main row: the maker's share now, read fresh. */
export { makerShareNow };
