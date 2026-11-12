"use client";

// The Main NFT's row and its Manage (Figma 14, 14b–14g, 14j–14m; the web's
// sell.tsx MainRow, rail-marketplace.tsx ListingBody, listing/* and
// rail-outcome.tsx MintDetails). The state and button are `mainRowStateOf`:
// · not minted — Sell is the mint flow (Sell intent);
// · minted, not on sale — Sell opens Add to marketplace: the readiness sheet
//   first while a video is missing, then the listing screen; under L3 the
//   missing steps stand under the row in its place; `?list=1` opens it once,
//   on arrival (Publish › Sell of a Private project);
// · live or paused — Manage opens "Your project" under the row:
//   Buy now (14b): the mint details (Minting, Token, Signature with Copy
//   signature, Payout wallet and its change while lazy), Edit · Remove,
//   View on marketplace;
//   Auction (14e, 14k, 14l): the time pill, its facts, "An auction can't be
//   changed once it starts.", Bidding History (n) (14f) and Close auction
//   (14g, 14m), off with its hint until it ends;
//   Paused (14d): what changed, the terms, "To relist:" (ready / missing with
//   Generate videos), Relist (off until ready), Edit · Remove listing.
// Remove (14c) asks first and pays the network fee only on chain. Once
// minted and not managed here, Mint details folds under the card.

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowDown01Icon, ArrowUpRight01Icon, Clock01Icon, Copy01Icon, Delete02Icon, PencilEdit01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { unlistTracksIfLocked } from "@/components/marketplace/purchase-dialog";
import { dialogBlockerOf } from "@/components/projects/details/readiness-dialog";
import { useCommitCheck, useCommitGate } from "@/components/projects/earn/ladder/level-check";
import { earnSourceOf } from "@/components/projects/earn/ladder/use-earn-facts";
import { makerShareNow, refusedCopy, sellRecheckOf } from "@/components/projects/listing/listing-dialog";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useMint } from "@/components/wallet/use-mint";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { auctionStateOf, type SettleResult } from "@/lib/market/auction";
import { earnPairOf, mainRowStateOf } from "@/lib/manual/earn-view";
import { ownershipOf } from "@/lib/manual/ownership";
import { can } from "@/lib/manual/permissions";
import { listingMetadataOf } from "@/lib/manual/project-read";
import type { MetaPart, NextAction } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { outcomeView, type OutcomeRow } from "@/lib/manual/rail-copy";
import { phoneMarketHref, phoneMintHref } from "@/lib/manual/phone-earn";
import { closeListing, relistChecklist, relistListing, removeListing } from "@/lib/market/listing";
import {
  RELISTED_ANNOUNCEMENT,
  REMOVED_ANNOUNCEMENT,
  biddingHistoryLabel,
  bidRowsOf,
  closeCopyOf,
  closedAnnouncement,
  marketplaceCardOf,
  relistRequestOf,
  removeRequestOf,
  saleShareOf,
} from "@/lib/market/listing-flow";
import { readMarketNow, settleWithWallets, useMarket } from "@/lib/market/market-store";
import { makeSale } from "@/lib/market/purchase";
import { mainSalesOf } from "@/lib/market/sales";
import type { Listing, MarketData } from "@/lib/market/types";
import { demoAddress, makerId, readWallet } from "@/lib/wallet/demo-wallet";
import { buyerLabel, DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { mintViewOf, payoutAddressOf } from "@/lib/wallet/mint";
import { formatAmount } from "@/lib/wallet/money";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { Sheet } from "../../kit/sheet";
import { useToast } from "../../kit/toast";
import { useEarn } from "../context";
import { FactRows, LevelCheck } from "../parts";
import { ListingFormLayer } from "./listing-form";
import { NftActivityLine } from "./nft-activity";
import { LINK_MD, LINK_SM, ReadinessSheet, RowButton, RowLink, SellRow, StateLines, SUB } from "./parts";
import { T } from "../../type";

const LIST_HANDLED = ["videos", "ownership"] as const;
const RELIST_HANDLED = ["videos"] as const;
/** The auction facts the phone keeps (14e): the row line already says the share. */
const AUCTION_FACTS = new Set(["Minimum bid", "Buy now price", "Top bid", "You receive", "Ends"]);

type Open = "gate" | "form" | "edit" | "remove" | "bids" | "close" | null;

/** A fact's parts: text, or a time with its full date as the title. */
export function Parts({ parts }: { parts: readonly MetaPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ) : (
          <time key={i} dateTime={p.time.dateTime} title={p.time.title}>
            {p.time.text}
          </time>
        ),
      )}
    </>
  );
}

export function MainRow() {
  const { project, view, viewer, brief, now, announce } = useEarn();
  const search = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const add = [pair.first, pair.second].find((a): a is Extract<NextAction, { kind: "add-to-marketplace" }> => a?.kind === "add-to-marketplace") ?? null;
  const state = mainRowStateOf({
    status: view.summary.status,
    listing: view.listing,
    locked: view.lock !== null,
    canList: add !== null,
    manage: can(viewer, "facts.seeOwnerOnly") && (view.listing.kind === "live" || view.listing.kind === "paused"),
  });
  const { check, ready } = useCommitGate("list", earnSourceOf(project, view, brief), { handled: LIST_HANDLED });
  const steps = state.action === "list" && ready && !check.ok;
  const blocked = add?.blocked ?? null;
  const firstStep = React.useCallback((): Open => (dialogBlockerOf(view.videos.readiness.sell) ? "gate" : "form"), [view.videos.readiness.sell]);
  const [open, setOpen] = React.useState<Open>(() => (state.action === "list" && !blocked && search.get("list") === "1" ? firstStep() : null));
  const [manage, setManage] = React.useState(false);
  // A listing just written opens its controls.
  const [seen, setSeen] = React.useState(view.listing.kind);
  if (seen !== view.listing.kind) {
    setSeen(view.listing.kind);
    if (view.listing.kind === "live" || view.listing.kind === "paused") setManage(true);
  }
  // `?list=1` opens the flow once; the address drops it so Back or a reload doesn't again.
  React.useEffect(() => {
    if (search.get("list") === null) return;
    const qs = new URLSearchParams(search.toString());
    qs.delete("list");
    const rest = qs.toString();
    window.history.replaceState(window.history.state, "", rest ? `${pathname}?${rest}` : pathname);
  }, [search, pathname]);

  const done = (message: string) => {
    setOpen(null);
    announce(message);
    toast({ title: message });
  };
  const stateId = "state-main";
  const panelId = "manage-main";
  const action =
    state.action === "mint" ? (
      <RowLink href={phoneMintHref(project.id, "sell")} label="Sell" />
    ) : state.action === "manage" ? (
      <RowButton label="Manage" expanded={manage} controls={panelId} onClick={() => setManage((m) => !m)} />
    ) : state.action === "list" && add ? (
      steps ? null : <RowButton label={state.label} disabled={!!blocked} describedBy={stateId} onClick={() => setOpen(firstStep())} />
    ) : state.action === "none" || state.action === "list" ? null : (
      <RowButton label={state.label} disabled describedBy={stateId} />
    );
  const listing: Listing | null = "listing" in view.listing ? view.listing.listing : null;

  return (
    <SellRow
      label="Main NFT"
      stateId={stateId}
      state={
        <div className="flex flex-col gap-1">
          <StateLines lines={[state.line]} live={state.live} />
          {blocked && <p className={SUB}>{blocked}</p>}
          {view.summary.status !== "draft" && view.mint.status !== "notMinted" && <NftActivityLine target={{ kind: "main" }} />}
        </div>
      }
      action={action}
    >
      {steps && (
        <div className="px-8 pb-6">
          <LevelCheck check={check} what="list" projectId={project.id} license={brief?.state.license ?? null} announce={announce} />
        </div>
      )}
      {state.action === "manage" && manage && listing && (
        <div id={panelId} className="flex flex-col gap-4 border-t-[length:var(--border-width-1)] border-solid border-border px-8 py-6">
          <ListingPanel listing={listing} onOpen={setOpen} />
        </div>
      )}
      {open === "gate" && ready && !steps && <ReadinessSheet purpose="sell" onPass={() => setOpen("form")} onClose={() => setOpen(null)} />}
      {open === "form" && ready && !steps && <ListingFormLayer listing={null} onClose={() => setOpen(null)} onDone={done} />}
      {open === "edit" && listing && <ListingFormLayer listing={listing} onClose={() => setOpen(null)} onDone={done} />}
      {open === "remove" && listing && <RemoveSheet listing={listing} onClose={() => setOpen(null)} onDone={done} />}
      {open === "bids" && listing && <BidsSheet listing={listing} onClose={() => setOpen(null)} />}
      {open === "close" && listing && <CloseAuctionSheet listing={listing} now={now} onClose={() => setOpen(null)} onDone={done} />}
    </SellRow>
  );
}

/** "Your project": the live or paused listing's own controls. */
function ListingPanel({ listing, onOpen }: { listing: Listing; onOpen: (o: Open) => void }) {
  const { project, view, viewer, now } = useEarn();
  const router = useRouter();
  const card = marketplaceCardOf(view.listing, { bids: view.bids, now });
  const manage = can(viewer, "listing.manage", view.canCtx);
  const hintId = React.useId();
  const head = (
    <div className="flex items-center justify-between gap-4">
      <h3 className={T.section}>Your project</h3>
      {card.kind === "auction" && <Badge tone={card.pill.tone}>{card.pill.text}</Badge>}
    </div>
  );
  const viewOnMarket = (
    <Button hierarchy="ghost" size="xl" className="self-start" iconLeading={<Icon icon={ArrowUpRight01Icon} size={20} />} onClick={() => router.push(phoneMarketHref(project.id))}>
      View on marketplace
    </Button>
  );

  if (card.kind === "buyNow") {
    return (
      <>
        {head}
        <MintRows />
        {manage && (
          <div className="flex flex-wrap gap-4">
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={PencilEdit01Icon} size={20} />} onClick={() => onOpen("edit")}>
              Edit
            </Button>
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Delete02Icon} size={20} />} onClick={() => onOpen("remove")}>
              Remove
            </Button>
          </div>
        )}
        {viewOnMarket}
      </>
    );
  }
  if (card.kind === "auction") {
    return (
      <>
        {head}
        {auctionStateOf(listing, view.bids, now).phase === "endingSoon" && <Banner tone="attention">Ends in under an hour. You can close it once it ends.</Banner>}
        <FactRows rows={card.facts.filter((f) => AUCTION_FACTS.has(f.label)).map((f) => ({ label: f.label, value: <Parts parts={f.value} /> }))} />
        <p className={SUB}>{card.fixedNote}</p>
        {manage && (
          <div className="flex flex-col gap-4">
            <Button hierarchy="secondary" size="xl" className="self-start" iconLeading={<Icon icon={Clock01Icon} size={20} />} onClick={() => onOpen("bids")}>
              {biddingHistoryLabel(card.bids)}
            </Button>
            <Button size="xl" className="self-start" disabled={!card.closeReady} aria-describedby={card.closeHint ? hintId : undefined} onClick={() => onOpen("close")}>
              Close auction
            </Button>
            {card.closeHint && (
              <p id={hintId} className={SUB}>
                {card.closeHint}
              </p>
            )}
          </div>
        )}
        {viewOnMarket}
      </>
    );
  }
  if (card.kind === "paused") {
    return (
      <>
        {head}
        <p className={T.body}>
          <Parts parts={card.since} />
        </p>
        <p className={T.body}>{card.changed}</p>
        <p className={T.body}>{card.terms}</p>
        {manage && <RelistBlock listing={listing} onOpen={onOpen} />}
      </>
    );
  }
  return null;
}

/** Paused (14d): "To relist:", then Relist, Edit and Remove listing. */
function RelistBlock({ listing, onOpen }: { listing: Listing; onOpen: (o: Open) => void }) {
  const { project, view, brief, announce } = useEarn();
  const { projects } = useManualProjects();
  const { writeListings } = useMarket();
  const { request } = useWalletRequest();
  const { jobs } = useVideoJobs();
  const toast = useToast();
  const latest = React.useRef({ projects, jobs });
  React.useEffect(() => {
    latest.current = { projects, jobs };
  }, [projects, jobs]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const changed = view.listing.kind === "paused" ? view.listing.changed : [];
  const items = relistChecklist(view.videos.readiness.relist, changed);
  const ready = items.every((i) => i.ok);
  const ladder = useCommitCheck("list", earnSourceOf(project, view, brief), { handled: RELIST_HANDLED });
  const hintId = React.useId();
  const [gate, setGate] = React.useState(false);

  /** `videosReady`: the checklist's, or the gate sheet's own once it lets the relist through. */
  const relist = async (videosReady: boolean) => {
    if (busy || !ladder.ok || !videosReady) return;
    setError(null);
    setBusy(true);
    const result = await request(relistRequestOf(listing, project.name, changed), {
      recheck: () => {
        const m = readMarketNow();
        const cur = m.listings.find((l) => l.id === listing.id);
        if (cur?.status !== "paused") return "This listing isn't paused any more.";
        const p = latest.current.projects.find((x) => x.id === project.id) ?? project;
        return sellRecheckOf(p, { view, brief, purpose: "relist", percentSelling: cur.percentSelling, market: m, jobs: latest.current.jobs, now: Date.now() });
      },
      commit: (proof) => {
        const p = latest.current.projects.find((x) => x.id === project.id) ?? project;
        const m = readMarketNow();
        const next = relistListing(m.listings, listing.id, listingMetadataOf(p, view.products, proof.at), videosReady, proof.at, { creatorPct: makerShareNow(p, m) });
        if (!next.ok) return { ok: false, message: next.reason };
        const w = writeListings(next.listings);
        return w.ok ? { ok: true } : { ok: false, message: refusedCopy(w.reason) };
      },
    });
    setBusy(false);
    if (result.ok) {
      announce(RELISTED_ANNOUNCEMENT);
      toast({ title: RELISTED_ANNOUNCEMENT });
    } else if (result.reason !== "rejected") setError(result.message || refusedCopy("storage"));
  };

  return (
    <>
      <section className="flex flex-col gap-3">
        <h4 className={T.rowTitle}>To relist:</h4>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className={cn(T.body, "flex flex-wrap items-start gap-x-3 gap-y-1")}>
              <span aria-hidden className={cn("w-[16px] shrink-0 pt-px text-center", item.id === "metadata" ? "text-text-tertiary" : item.ok ? "text-text-success" : "text-text-error")}>
                {item.id === "metadata" ? "•" : <Icon icon={item.ok ? Tick02Icon : Delete02Icon} size={16} />}
              </span>
              <span className="min-w-0 flex-1 text-text-primary">
                {item.label}
                {item.id !== "metadata" && <span className={cn("font-semibold", item.ok ? "text-text-success" : "text-text-error")}>{` · ${item.ok ? "Ready" : "Missing"}`}</span>}
              </span>
              {item.href === "generate-videos" && (
                <button type="button" onClick={() => setGate(true)} className={cn(LINK_MD, "-my-3 min-h-[44px] pl-8")}>
                  Generate videos
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-wrap gap-4">
        <Button size="xl" loading={busy} disabled={!ready || !ladder.ok} aria-describedby={!ready ? hintId : undefined} onClick={() => void relist(ready)}>
          {busy ? "Relisting…" : "Relist"}
        </Button>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={PencilEdit01Icon} size={20} />} onClick={() => onOpen("edit")}>
          Edit
        </Button>
        <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Delete02Icon} size={20} />} onClick={() => onOpen("remove")}>
          Remove listing
        </Button>
      </div>
      {!ready && (
        <p id={hintId} className={SUB}>
          Finish the items above to relist.
        </p>
      )}
      <LevelCheck check={ladder} what="relist" projectId={project.id} license={brief?.state.license ?? null} announce={announce} />
      {gate && (
        <ReadinessSheet
          purpose="relist"
          extra={
            <p className={SUB}>
              <span className="font-semibold text-text-primary">NFT metadata</span>
              {changed.length ? ` · updates now: ${changed.join(", ")}` : " · updated when you relist"}
            </p>
          }
          onPass={() => {
            setGate(false);
            void relist(true);
          }}
          onClose={() => setGate(false)}
        />
      )}
    </>
  );
}

/** 14c · Remove this listing? */
function RemoveSheet({ listing, onClose, onDone }: { listing: Listing; onClose: () => void; onDone: (message: string) => void }) {
  const { project } = useEarn();
  const { writeListings } = useMarket();
  const { request } = useWalletRequest();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const onChain = listing.mintingType === "instant";
  const write = (at: number): string | null => {
    const m = readMarketNow();
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return "It has just sold, so it can't be removed.";
    const next = removeListing(m.listings, listing.id, at);
    if (!next.ok) return next.reason;
    const w = writeListings(next.listings);
    return w.ok ? null : refusedCopy(w.reason);
  };
  const confirm = async () => {
    if (busy) return;
    setError(null);
    const req = removeRequestOf(listing, project.name);
    if (!req) {
      const failed = write(Date.now());
      return failed ? setError(failed) : onDone(REMOVED_ANNOUNCEMENT);
    }
    setBusy(true);
    const result = await request(req, {
      commit: (proof) => {
        const failed = write(proof.at);
        return failed ? { ok: false, message: failed } : { ok: true };
      },
    });
    setBusy(false);
    if (result.ok) onDone(REMOVED_ANNOUNCEMENT);
    else if (result.reason !== "rejected") setError(result.message || refusedCopy("storage"));
  };
  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title="Remove this listing?"
      actions={
        <>
          <Button hierarchy="danger" size="xl" className="w-full" loading={busy} onClick={() => void confirm()}>
            Remove listing
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={busy} onClick={onClose}>
            Keep it listed
          </Button>
        </>
      }
    >
      <p className={T.body}>Nobody can see or buy it now. Its terms are kept, so you can list it again.</p>
      {onChain && <p className={T.body}>Removing an on-chain listing costs a network fee (test tokens — no real cost).</p>}
      {error && <Banner tone="error">{error}</Banner>}
    </Sheet>
  );
}

/** 14f · Bidding History: the web's table as stacked rows (bid · bidder · date over time). */
function BidsSheet({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { project, view } = useEarn();
  const rows = bidRowsOf(listing, view.bids);
  return (
    <Sheet
      open
      onClose={onClose}
      title="Bidding History"
      actions={
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
          Close
        </Button>
      }
    >
      <TestnetDemoBadge className="self-start" />
      {rows.length === 0 ? (
        <p className={T.body}>No bids yet.</p>
      ) : (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{`Bids on ${project.name}, newest first`}</caption>
          <thead>
            <tr className={cn(T.meta, "border-b-[length:var(--border-width-1)] border-solid border-border text-text-tertiary")}>
              <th scope="col" className="py-4 pr-6 font-regular">
                Bid
              </th>
              <th scope="col" className="py-4 pr-6 font-regular">
                Bidder
              </th>
              <th scope="col" className="py-4 font-regular">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b-[length:var(--border-width-1)] border-solid border-border last:border-b-0">
                <td className={cn(T.rowTitle, "py-5 pr-6 align-top tabular-nums")}>{r.bid}</td>
                <td className={cn(T.body, "py-5 pr-6 align-top text-text-primary")}>{r.bidder}</td>
                <td className={cn(T.meta, "py-5 align-top")}>
                  <time dateTime={new Date(r.at).toISOString()} title={r.time}>
                    <span className="block">{r.date}</span>
                    <span className="block">{r.clock}</span>
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}

const winnerKey = (r: SettleResult) => (r.kind === "sale" ? `sale:${r.bid.id}` : r.kind);

function changedCopy(r: SettleResult, l: Listing): string {
  return r.kind === "sale"
    ? `The bids changed while this was open: ${buyerLabel(r.bid.bidderId)} now wins with ${formatAmount(r.bid.amount, l.token)}. Check it, then close again.`
    : "The bids changed while this was open: no bid can be paid now. Check it, then close again.";
}

/** 14g / 14m · Close the auction? — the winner, or nobody; a refused sale offers Close without a sale. */
function CloseAuctionSheet({ listing, now, onClose, onDone }: { listing: Listing; now: number; onClose: () => void; onDone: (message: string) => void }) {
  const { project, brief } = useEarn();
  const { projects } = useManualProjects();
  const { data: market, appendSale, writeListings } = useMarket();
  const wallet = useDemoWallet();
  const [error, setError] = React.useState<string | null>(null);
  const [refused, setRefused] = React.useState<string | null>(null);
  const [seen, setSeen] = React.useState<SettleResult | null>(null);
  const live = React.useMemo(() => settleWithWallets(listing, { wallet, market, now: Math.max(now, listing.endsAt ?? now) }), [listing, wallet, market, now]);
  const shown = seen ?? live;
  const copy = closeCopyOf(shown, listing, market.bids);

  const fresh = (m: MarketData): Listing | string => {
    const cur = m.listings.find((l) => l.id === listing.id);
    if (m.sales.some((s) => s.listingId === listing.id && s.item.nft === "main")) return "This auction has already been settled.";
    if (!cur || cur.status !== "live") return "This auction has already been closed.";
    return cur;
  };
  const closeWithoutSale = (m: MarketData, cur: Listing, at: number, said: string) => {
    const closed = closeListing(m.listings, cur.id, at);
    if (!closed.ok) return setError(closed.reason);
    const w = writeListings(closed.listings);
    if (!w.ok) return setError(refusedCopy(w.reason));
    onDone(said);
  };
  const confirm = () => {
    setError(null);
    const at = Date.now();
    const m = readMarketNow();
    const cur = fresh(m);
    if (typeof cur === "string") return setError(cur);
    const settled = settleWithWallets(cur, { wallet: readWallet(), market: m, now: at });
    if (settled.kind === "running") return setError("The auction hasn't ended yet.");
    if (winnerKey(settled) !== winnerKey(shown)) {
      setSeen(settled);
      return setError(changedCopy(settled, cur));
    }
    if (settled.kind === "noBids") return closeWithoutSale(m, cur, at, closedAnnouncement(settled, cur));
    const p = projects.find((x) => x.id === project.id) ?? project;
    const split = ownershipOf({ createdAt: p.createdAt, contributors: p.contributors ?? [], sales: mainSalesOf(p.id, m.sales), listedPercent: 0 });
    const sale = makeSale(
      {
        listingId: cur.id,
        projectId: p.id,
        buyerId: settled.bid.bidderId,
        buyerAddress: demoAddress(settled.bid.bidderId),
        sellerAddress: payoutAddressOf(p.mint),
        item: saleShareOf(cur),
        via: "auctionWin",
        token: cur.token,
        price: settled.bid.amount,
        royaltiesPct: cur.royaltiesPct,
        network: cur.network,
        collection: cur.collection,
        benefits: cur.benefits,
      },
      { sales: m.sales, mint: mintViewOf(p, brief, m.sales), ownership: { creatorPct: split.maker }, now: at },
    );
    if ("ok" in sale) {
      const winner = buyerLabel(settled.bid.bidderId);
      return setRefused(
        sale.reason === "overShare"
          ? `You hold ${split.maker}% of ${p.name} now, less than the ${cur.percentSelling}% this auction sells, so ${winner}'s bid can't be settled. Close it without a sale, or free up the share in Contributors and close it again.`
          : `${winner}'s bid can't be settled: ${sale.message} Close it without a sale instead.`,
      );
    }
    const w = appendSale(sale);
    if (!w.ok) return setError(w.reason === "conflict" ? "This auction has already been settled." : refusedCopy(w.reason));
    unlistTracksIfLocked(p, [...m.sales, sale]);
    onDone(closedAnnouncement(settled, cur));
  };
  const closeAnyway = () => {
    setError(null);
    const m = readMarketNow();
    const cur = fresh(m);
    if (typeof cur === "string") return setError(cur);
    closeWithoutSale(m, cur, Date.now(), "Auction closed without a sale");
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={refused ? "Close without a sale?" : copy.title}
      actions={
        <>
          {refused ? (
            <Button size="xl" className="w-full" onClick={closeAnyway}>
              Close without a sale
            </Button>
          ) : (
            <Button size="xl" className="w-full" onClick={confirm}>
              {copy.confirm}
            </Button>
          )}
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <p className={T.body}>{copy.body}</p>
      {copy.skipped && <p className={T.body}>{copy.skipped}</p>}
      {refused && <Banner tone="error">{refused}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}
    </Sheet>
  );
}

/** The mint's proof rows (14b): Minting, Token, Signature (Copy signature), Payout wallet and, while lazy, its change. */
function MintRows() {
  const { project, view, announce } = useEarn();
  const outcome = outcomeView(view.commerce, view.summary, view.videos.readiness.showcase);
  const minted = outcome.minted;
  if (!minted) return null;
  if (!minted.rows.length) return <p className={SUB}>{outcome.subline}</p>;
  const copies = minted.rows.filter((r) => r.copy);
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col">
        {minted.rows.map((row) => (
          <MintRow key={row.key} row={row} mintStatus={outcome.mint} projectId={project.id} />
        ))}
      </dl>
      {copies.map((r) => (
        <CopyLink key={r.key} label={r.copy!.label} value={r.copy!.value} onCopied={() => announce("Copied")} />
      ))}
      <p className={cn(T.meta, "text-text-tertiary")}>{minted.footnote}</p>
    </div>
  );
}

function MintRow({ row, mintStatus, projectId }: { row: OutcomeRow; mintStatus: ReturnType<typeof outcomeView>["mint"]; projectId: string }) {
  const { view } = useEarn();
  return (
    <div className="flex min-h-[44px] flex-col gap-1 p-6">
      <div className="flex items-start justify-between gap-6">
        <dt className={cn(T.body, "shrink-0")}>{row.label}</dt>
        <dd className={cn(T.body, "flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-text-primary")}>
          <span className="break-words">
            <Parts parts={row.value} />
          </span>
        </dd>
      </div>
      {row.note && <p className={T.meta}>{row.note}</p>}
      {row.key === "wallet" && mintStatus === "lazyMinted" && view.mint.record && <PayoutChange projectId={projectId} account={view.mint.record.wallet.account} />}
    </div>
  );
}

function CopyLink({ label, value, onCopied }: { label: string; value: string; onCopied: () => void }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof navigator === "undefined" || !navigator.clipboard) return;
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          onCopied();
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn(LINK_SM, "-my-5 inline-flex min-h-[44px] items-center gap-1 self-start")}
    >
      <Icon icon={copied ? Tick02Icon : Copy01Icon} size={14} />
      {copied ? "Copied" : label}
    </button>
  );
}

/** While lazy, the payout wallet can move to the connected account: a free re-signature. */
function PayoutChange({ projectId, account }: { projectId: string; account: number }) {
  const wallet = useDemoWallet();
  const { changePayoutWallet } = useMint();
  const [pending, setPending] = React.useState(false);
  if (!wallet) return null;
  const active = wallet.account;
  const connected = wallet.identities[makerId(active)]?.connected === true;
  if (!connected || active === account) {
    return <p className={T.meta}>{`You can change it until the token is on chain — ${connected ? "switch account in your wallet" : "connect your wallet"} first.`}</p>;
  }
  const label = DEMO_ACCOUNTS.find((a) => a.index === active)?.label ?? "Demo account";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await changePayoutWallet(projectId);
        } finally {
          setPending(false);
        }
      }}
      className={cn(LINK_SM, "-my-3 inline-flex min-h-[44px] items-center self-start disabled:opacity-60")}
    >
      {`Use ${label} instead`}
    </button>
  );
}

/** Mint details, folded under the card once minted (the web's disclosure) — unless Manage shows them. */
export function MintDetails() {
  const { view } = useEarn();
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const outcome = outcomeView(view.commerce, view.summary, view.videos.readiness.showcase);
  if (!outcome.minted) return null;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(T.rowTitle, "-my-3 inline-flex min-h-[44px] items-center gap-2 self-start outline-none focus-visible:underline")}
      >
        Mint details
        <span aria-hidden className={cn("inline-flex transition-transform duration-normal", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open && (
        <div id={id} className="pt-4">
          <MintRows />
        </div>
      )}
    </div>
  );
}
