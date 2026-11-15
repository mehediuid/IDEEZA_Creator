"use client";

// The Main NFT's row and its screen (mobile UX pass 2026-11-15; Figma 14,
// 14b–14g, 14j–14m; the web's sell.tsx MainRow, rail-marketplace.tsx
// ListingBody, listing/* and rail-outcome.tsx MintDetails). The state is
// `mainRowStateOf`:
// · not minted — the row opens the mint flow (Sell intent);
// · minted — the row pushes the Main NFT screen: the summary (the state, the
//   price large, three facts, All details, "Selling the Main NFT sells the
//   project."), then
//   – not on sale: Sell in the bottom bar opens Add to marketplace (the
//     readiness sheet first while a video is missing, then the listing
//     screen); under L3 "Before you can list" stands in its place as a state
//     card; `?list=1` opens it once, on arrival (Publish › Sell of a Private
//     project);
//   – Buy now (14b): Edit listing and Remove listing rows; View on marketplace;
//   – Auction (14e, 14k, 14l): the time chip, "An auction can't be changed
//     once it starts.", Bidding History (n) (14f), and Close auction (14g,
//     14m) in the bottom bar, off with its hint until it ends;
//   – Paused (14d): what changed, "To relist:" (ready / missing with Generate
//     videos), Relist in the bottom bar (off until ready), Edit · Remove;
//   – every minted state: Activity and Mint details (Minting, Token, Signature
//     with Copy signature, Payout wallet and its change while lazy) as rows.
// Remove (14c) asks first and pays the network fee only on chain.

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Certificate01Icon, Clock01Icon, Copy01Icon, Delete02Icon, PencilEdit01Icon, Store01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
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
  type CardFact,
} from "@/lib/market/listing-flow";
import { readMarketNow, settleWithWallets, useMarket } from "@/lib/market/market-store";
import { makeSale } from "@/lib/market/purchase";
import { mainSalesOf } from "@/lib/market/sales";
import { MAIN_SALE_NOTE } from "@/lib/market/sell-flow";
import type { Listing, MarketData } from "@/lib/market/types";
import { demoAddress, makerId, readWallet } from "@/lib/wallet/demo-wallet";
import { buyerLabel, DEMO_ACCOUNTS } from "@/lib/wallet/identities";
import { mintViewOf, payoutAddressOf } from "@/lib/wallet/mint";
import { formatAmount } from "@/lib/wallet/money";
import { payoutOf } from "@/lib/market/fee";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
import { useToast } from "../../kit/toast";
import { useEarn } from "../context";
import { ListingFormLayer } from "./listing-form";
import { NftActivityRow } from "./nft-activity";
import {
  ActionRow,
  FullLayer,
  KIND_ICON,
  LINK_MD,
  LINK_SM,
  PrimaryBar,
  ReadinessSheet,
  ROWS_CARD,
  SellListRow,
  StepsCard,
  SUB,
  SummaryCard,
  type SummaryFact,
} from "./parts";
import { T } from "../../type";

const LIST_HANDLED = ["videos", "ownership"] as const;
const RELIST_HANDLED = ["videos"] as const;

type Open = "gate" | "form" | "edit" | "remove" | "bids" | "close" | "mint" | null;

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

const asFacts = (facts: readonly CardFact[]): SummaryFact[] => facts.map((f) => ({ label: f.label, value: <Parts parts={f.value} /> }));
const pick = (facts: readonly CardFact[], labels: readonly string[]): SummaryFact[] =>
  labels.flatMap((l) => {
    const f = facts.find((x) => x.label === l);
    return f ? [{ label: l, value: <Parts parts={f.value} /> }] : [];
  });

/** The Main NFT's state and its one next step, shared by its row and its screen. */
function useMainState() {
  const { project, view, viewer, brief } = useEarn();
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
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  return { add, state, check, ready, steps, minted, blocked: add?.blocked ?? null };
}

export function MainRow() {
  const { project, view, now, announce } = useEarn();
  const search = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const main = useMainState();
  const { state, add, ready, steps, minted, blocked } = main;
  const firstStep = React.useCallback((): Open => (dialogBlockerOf(view.videos.readiness.sell) ? "gate" : "form"), [view.videos.readiness.sell]);
  const [open, setOpen] = React.useState<Open>(() => (state.action === "list" && !blocked && search.get("list") === "1" ? firstStep() : null));
  const [screen, setScreen] = React.useState(false);
  // A listing just written opens its screen.
  const [seen, setSeen] = React.useState(view.listing.kind);
  if (seen !== view.listing.kind) {
    setSeen(view.listing.kind);
    if (view.listing.kind === "live" || view.listing.kind === "paused") setScreen(true);
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
  const listing: Listing | null = "listing" in view.listing ? view.listing.listing : null;
  const left = main.check.ok ? 0 : main.check.missing.length;
  const extra = steps ? `${left} ${left === 1 ? "step" : "steps"} before you can list` : blocked;

  return (
    <>
      {state.action === "mint" ? (
        <SellListRow icon={KIND_ICON.main} title="Main NFT" state={[state.line]} href={phoneMintHref(project.id, "sell")} label={`Main NFT: ${state.line}. Sell`} />
      ) : minted ? (
        <SellListRow icon={KIND_ICON.main} title="Main NFT" state={[state.line]} live={state.live} extra={extra} onClick={() => setScreen(true)} />
      ) : (
        <SellListRow icon={KIND_ICON.main} title="Main NFT" state={[state.line]} extra={blocked} disabled />
      )}
      {screen && <MainNftScreen main={main} listing={listing} onOpen={(o) => setOpen(o ?? firstStep())} onClose={() => setScreen(false)} />}
      {open === "gate" && ready && !steps && <ReadinessSheet purpose="sell" onPass={() => setOpen("form")} onClose={() => setOpen(null)} />}
      {open === "form" && ready && !steps && add && <ListingFormLayer listing={null} onClose={() => setOpen(null)} onDone={done} />}
      {open === "edit" && listing && <ListingFormLayer listing={listing} onClose={() => setOpen(null)} onDone={done} />}
      {open === "remove" && listing && <RemoveSheet listing={listing} onClose={() => setOpen(null)} onDone={done} />}
      {open === "bids" && listing && <BidsSheet listing={listing} onClose={() => setOpen(null)} />}
      {open === "close" && listing && <CloseAuctionSheet listing={listing} now={now} onClose={() => setOpen(null)} onDone={done} />}
      {open === "mint" && <MintDetailsSheet onClose={() => setOpen(null)} />}
    </>
  );
}

/** The Main NFT's own screen: what it is now, what's next (one primary), and its rows. */
function MainNftScreen({
  main,
  listing,
  onOpen,
  onClose,
}: {
  main: ReturnType<typeof useMainState>;
  listing: Listing | null;
  /** `null`: Sell (the readiness sheet first while a video is missing). */
  onOpen: (o: Open) => void;
  onClose: () => void;
}) {
  const { project, view, viewer, brief, now, announce } = useEarn();
  const router = useRouter();
  const { state, steps, check, blocked } = main;
  const card = marketplaceCardOf(view.listing, { bids: view.bids, now });
  const manage = can(viewer, "listing.manage", view.canCtx) && state.action === "manage";
  const reasonId = React.useId();
  const relist = useRelist(listing);
  const live = card.kind === "buyNow" || card.kind === "auction";
  const hasProof = outcomeView(view.commerce, view.summary, view.videos.readiness.showcase).minted !== null;

  let primary: React.ReactNode = null;
  let reason: string | null = null;
  if (state.action === "list" && main.add && !steps && main.ready) {
    reason = blocked;
    primary = (
      <Button size="xl" className="w-full" aria-disabled={blocked ? true : undefined} aria-describedby={blocked ? reasonId : undefined} onClick={() => !blocked && onOpen(null)}>
        {state.label}
      </Button>
    );
  } else if (manage && card.kind === "auction") {
    reason = card.closeHint;
    primary = (
      <Button size="xl" className="w-full" disabled={!card.closeReady} aria-describedby={card.closeHint ? reasonId : undefined} onClick={() => onOpen("close")}>
        Close auction
      </Button>
    );
  } else if (manage && card.kind === "paused" && listing) {
    reason = relist.ready ? null : "Finish the items above to relist.";
    primary = (
      <Button size="xl" className="w-full" loading={relist.busy} disabled={!relist.ready || !relist.ladder.ok} aria-describedby={reason ? reasonId : undefined} onClick={() => void relist.run(relist.ready)}>
        {relist.busy ? "Relisting…" : "Relist"}
      </Button>
    );
  }

  return (
    <FullLayer
      title="Main NFT"
      onBack={onClose}
      footer={
        primary ? (
          <PrimaryBar reason={reason} reasonId={reasonId}>
            {primary}
          </PrimaryBar>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8 px-8 pb-12 pt-4">
        <p className={cn(T.meta, "break-words")}>{`Whole project · ${project.name}`}</p>
        <MainSummary card={card} listing={listing} line={state.line} blocked={blocked} />
        {card.kind === "auction" && listing && auctionStateOf(listing, view.bids, now).phase === "endingSoon" && (
          <Banner tone="attention">Ends in under an hour. You can close it once it ends.</Banner>
        )}
        {steps && <StepsCard check={check} what="list" projectId={project.id} license={brief?.state.license ?? null} announce={announce} />}
        {manage && card.kind === "paused" && listing && <RelistCard relist={relist} />}
        <ul aria-label="Main NFT" className={ROWS_CARD}>
          <NftActivityRow target={{ kind: "main" }} />
          {manage && card.kind === "auction" && <ActionRow icon={Clock01Icon} title={biddingHistoryLabel(card.bids)} onClick={() => onOpen("bids")} />}
          {hasProof && <ActionRow icon={Certificate01Icon} title="Mint details" onClick={() => onOpen("mint")} />}
          {live && <ActionRow icon={Store01Icon} title="View on marketplace" onClick={() => router.push(phoneMarketHref(project.id))} />}
        </ul>
        {manage && (card.kind === "buyNow" || card.kind === "paused") && (
          <ul aria-label="Your listing" className={ROWS_CARD}>
            <ActionRow icon={PencilEdit01Icon} title="Edit listing" onClick={() => onOpen("edit")} />
            <ActionRow icon={Delete02Icon} title="Remove listing" danger onClick={() => onOpen("remove")} />
          </ul>
        )}
      </div>
    </FullLayer>
  );
}

/** The summary the Main NFT screen leads with, per listing state. */
function MainSummary({ card, listing, line, blocked }: { card: ReturnType<typeof marketplaceCardOf>; listing: Listing | null; line: string; blocked: string | null }) {
  const { view, now } = useEarn();
  if (card.kind === "buyNow" && listing) {
    return (
      <SummaryCard
        label="Your listing"
        overline="Buy now"
        headline={formatAmount(listing.price ?? "0", listing.token)}
        sub={`${listing.percentSelling}% of the project`}
        chip={<Badge tone="success">On the marketplace</Badge>}
        facts={[
          { label: "You receive", value: formatAmount(payoutOf(listing.price ?? "0"), listing.token) },
          { label: "Royalties", value: `${listing.royaltiesPct}%` },
          { label: "Minting", value: listing.mintingType === "instant" ? "Instant" : "Lazy" },
        ]}
        details={asFacts(card.facts)}
        note={MAIN_SALE_NOTE}
      />
    );
  }
  if (card.kind === "auction" && listing) {
    const a = auctionStateOf(listing, view.bids, now);
    const top = a.top;
    return (
      <SummaryCard
        label="Your auction"
        overline={top ? "Top bid" : "Minimum bid"}
        headline={formatAmount(top ? top.amount : (listing.minBid ?? "0"), listing.token)}
        sub={`${listing.percentSelling}% of the project · ${card.bids === 1 ? "1 bid" : `${card.bids} bids`}`}
        chip={<Badge tone={card.pill.tone}>{card.pill.text}</Badge>}
        facts={pick(card.facts, top ? ["Minimum bid", "Buy now price", "Ends"] : ["Buy now price", "Ends"])}
        details={asFacts(card.facts)}
        note={card.fixedNote}
      />
    );
  }
  if (card.kind === "paused" && listing) {
    return (
      <SummaryCard
        label="Your listing"
        overline={listing.type === "auction" ? "Auction" : "Buy now"}
        headline={formatAmount((listing.type === "auction" ? listing.minBid : listing.price) ?? "0", listing.token)}
        sub={`${listing.percentSelling}% of the project`}
        chip={<Badge tone="neutral">Paused</Badge>}
        note={MAIN_SALE_NOTE}
      >
        <div className="flex flex-col gap-1">
          <p className={T.meta}>
            <Parts parts={card.since} />
          </p>
          <p className={cn(T.body, "text-text-primary")}>{card.changed}</p>
        </div>
      </SummaryCard>
    );
  }
  return (
    <SummaryCard label="Main NFT" overline="Main NFT" headline={line} amount={false} sub={blocked ?? undefined} details={card.kind === "sold" ? asFacts(card.facts) : undefined} note={MAIN_SALE_NOTE}>
      {card.kind === "ended" && (
        <div className="flex flex-col gap-1">
          <p className={T.meta}>{card.when}</p>
          <p className={T.meta}>{card.terms}</p>
        </div>
      )}
    </SummaryCard>
  );
}

/** Paused (14d): the relist checklist, its videos gate, the ladder and the write the bottom bar runs. */
function useRelist(listing: Listing | null) {
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
  const [gate, setGate] = React.useState(false);
  const changed = view.listing.kind === "paused" ? view.listing.changed : [];
  const items = relistChecklist(view.videos.readiness.relist, changed);
  const ready = items.every((i) => i.ok);
  const ladder = useCommitCheck("list", earnSourceOf(project, view, brief), { handled: RELIST_HANDLED });

  /** `videosReady`: the checklist's, or the gate sheet's own once it lets the relist through. */
  const run = async (videosReady: boolean) => {
    if (!listing || busy || !ladder.ok || !videosReady) return;
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
  return { items, ready, ladder, busy, error, gate, setGate, changed, run };
}

/** "To relist:" as a card: each item ready or missing, Generate videos on the missing videos, the ladder. */
function RelistCard({ relist }: { relist: ReturnType<typeof useRelist> }) {
  const { project, brief, announce } = useEarn();
  const { items, error, gate, setGate, changed, ladder, run } = relist;
  return (
    <>
      <section aria-label="To relist" className={cn(LIST_CARD, "pb-4")}>
        <h3 className={cn(T.section, "px-8 pb-2 pt-6")}>To relist:</h3>
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className={cn(T.body, "flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 px-8 py-4")}>
              <span aria-hidden className={cn("w-[16px] shrink-0 text-center", item.id === "metadata" ? "text-text-tertiary" : item.ok ? "text-text-success" : "text-text-error")}>
                {item.id === "metadata" ? "•" : <Icon icon={item.ok ? Tick02Icon : Delete02Icon} size={16} />}
              </span>
              <span className="min-w-0 flex-1 text-text-primary">
                {item.label}
                {item.id !== "metadata" && <span className={cn("font-semibold", item.ok ? "text-text-success" : "text-text-error")}>{` · ${item.ok ? "Ready" : "Missing"}`}</span>}
              </span>
              {item.href === "generate-videos" && (
                <button type="button" onClick={() => setGate(true)} className={cn(LINK_MD, "-my-3 min-h-[44px]")}>
                  Generate videos
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {error && <Banner tone="error">{error}</Banner>}
      <StepsCard check={ladder} what="relist" projectId={project.id} license={brief?.state.license ?? null} announce={announce} />
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
            void run(true);
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

/** 14f · Bidding History: the web's table as rows (the bid over its bidder, the date over the time). */
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
        <ul aria-label={`Bids on ${project.name}, newest first`} className={ROWS_CARD}>
          {rows.map((r) => (
            <li key={r.id} className="flex min-h-[48px] items-start justify-between gap-6 px-8 py-5">
              <span className="flex min-w-0 flex-col gap-1">
                <span className={cn(T.rowTitle, "tabular-nums")}>{r.bid}</span>
                <span className={cn(T.meta, "break-words")}>{r.bidder}</span>
              </span>
              <time dateTime={new Date(r.at).toISOString()} title={r.time} className={cn(T.meta, "shrink-0 text-right")}>
                <span className="block">{r.date}</span>
                <span className="block">{r.clock}</span>
              </time>
            </li>
          ))}
        </ul>
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

/** Mint details as a sheet (the web's disclosure): the mint's proof rows, Copy, the payout wallet. */
function MintDetailsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet
      open
      onClose={onClose}
      title="Mint details"
      actions={
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
          Close
        </Button>
      }
    >
      <MintRows />
    </Sheet>
  );
}
