"use client";

// The Main NFT on the phone's Explore marketplace view (Figma 18b, 18e, 18f,
// 18j–18l), the web's buyer rail (marketplace/buyer-rail.tsx, bid-card.tsx)
// placed for a phone. Its logic and words are the web's: `usePurchase` and
// `usePlaceBid` sign through the phone's wallet sheet (PhoneWalletScope), the
// `can()` answers come from `view.canCtx`, the auction asks again at its own
// clock (`useAuctionClock`).
// It is the Main NFT tab of the screen's buy box (buy-pick.tsx, owner
// 2026-11-22 "Yes, build A"): the bar says "Main NFT" and its price before its
// one primary.
// · A holder reads their receipt first (18e: what they own, Token · Paid ·
//   Purchased, All details closed), above the box, then "Buy another share"
//   when the creator has another share on sale.
// · Buy now (18b): a buy box (owner 2026-11-12: the page read as a
//   spreadsheet) — what is sold, the price large, the facts three to a row,
//   the wallet line, the activity line and the Testnet demo line; the
//   share-sale note under it. The button is the bottom bar's.
// · An auction (18f): the same box with the top (or starting) bid, its time
//   left, Bid history (n), who leads, Your bid (the bar's Place bid submits
//   it; the bar's line is `auctionBarLineOf`), Buy now with X (greyed, with
//   "Someone is buying this now…", while another checkout holds it — CL-016). Outbid (18j), won (18k) and lost
//   (18l) each lead with a banner; once ended, the web's sentence replaces the
//   field.
// · Paused, removed, closed with no bids and sold each say so.
// · Main NFT activity: the newest sale, else the newest NFT entry, else "No
//   activity yet · listed {date}".

import * as React from "react";
import { Activity01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { freeMicrosFor, usePlaceBid } from "@/components/marketplace/bid-dialog";
import { buyerNameOf } from "@/components/marketplace/purchase-dialog";
import { SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { bidsOf, timeLeftLabel, validateBid } from "@/lib/market/auction";
import { IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useMarket } from "@/lib/market/market-store";
import type { AuctionState, Bid, Listing, Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { addAmounts, formatAmount, fromMicros } from "@/lib/wallet/money";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { useCreatorName } from "@/components/marketplace/use-creator-name";
import { BuyBox, Disclosure, IconLine, ReceiptCard, WalletLine, type BoxFact } from "./parts";
import { LIST_CARD } from "../../kit/list";
import { T } from "../../type";

export const BID_FORM_ID = "market-bid-form";

/** The web's words for a listing that can't be bought now (buyer-rail.tsx `closedLine`). */
export function closedLineOf(view: ProjectView): { title: string; detail?: string } | null {
  const lv = view.listing;
  if (lv.kind === "paused") return { title: "Paused by the creator — it can't be bought right now." };
  if (lv.kind === "ended") {
    if (lv.why === "removed") return { title: "The creator took this listing off the marketplace." };
    return lv.unpaid ? { title: "Ended without a sale: no bid could be paid." } : { title: "Ended with no bids." };
  }
  if (lv.kind === "sold") {
    const sale = lv.sale;
    const pct = sale.item.nft === "main" ? sale.item.sharePct : 0;
    return {
      title: `Sold on ${formatDate(sale.at)}.`,
      detail: `Sold for ${formatAmount(sale.price, sale.token)} · ${pct >= 100 ? "the whole project" : `${pct}% of the project`}`,
    };
  }
  return null;
}

/** Where the active buyer stands in an auction. */
export type BidStanding = "none" | "leads" | "outbid" | "won" | "lost";

export function bidStandingOf(listing: Listing, state: AuctionState, bids: Bid[], buyerId: DemoBuyerId): BidStanding {
  const mine = bidsOf(listing.id, bids).some((b) => b.bidderId === buyerId);
  const leads = state.top?.bidderId === buyerId;
  if (state.phase === "ended") return leads ? "won" : mine ? "lost" : "none";
  if (leads) return "leads";
  return mine ? "outbid" : "none";
}

/** The listing's facts, as the web reads them (buyer-rail.tsx `ListingFacts`), short for the box's
 *  grid; what Royalties and Lazy mean is said once under it (`factNotesOf`). */
function isLazy(listing: Listing, view: ProjectView): boolean {
  if (view.mint.status === "lazyMinted") return true;
  if (view.mint.status === "onChain") return false;
  return listing.mintingType === "lazy";
}

function tailFacts(listing: Listing, view: ProjectView): BoxFact[] {
  return [
    { label: "Chain", value: networkLabelOf(listing.network) },
    { label: "Royalties", value: `${listing.royaltiesPct}%` },
    { label: "Minting", value: isLazy(listing, view) ? "Lazy" : "Minted" },
    { label: "Collection", value: listing.collection || "—" },
  ];
}

function factNotesOf(listing: Listing, view: ProjectView): string {
  return `Royalties are a share of resales, if marketplaces honor them.${isLazy(listing, view) ? " Lazy: the token is minted when you buy." : ""}`;
}

/** "Whole project · Main NFT", or the share on sale. */
function soldWhat(listing: Listing): string {
  return listing.percentSelling >= 100 ? "Whole project · Main NFT" : `Main NFT · ${listing.percentSelling}% of the project`;
}

/** 18b: a live Buy now listing's box — the bottom bar's Buy now buys it. `foot`: the activity line and
 *  the Testnet demo line, under the wallet's. */
export function BuyNowCard({ listing, view, buyerId, foot }: { listing: Listing; view: ProjectView; buyerId: DemoBuyerId | null; foot?: React.ReactNode }) {
  const price = formatAmount(listing.price ?? "0", listing.token);
  return (
    <div className="flex flex-col gap-3">
      <BuyBox
        label={`${soldWhat(listing)}, buy now for ${price}`}
        overline={soldWhat(listing)}
        price={price}
        facts={[{ label: "Listing", value: "Buy now" }, { label: "Share", value: `${listing.percentSelling}%` }, ...tailFacts(listing, view)]}
        notes={factNotesOf(listing, view)}
        foot={
          (buyerId || foot) && (
            <>
              {buyerId && (
                <IconLine icon={Wallet01Icon}>
                  <WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="buy" />
                </IconLine>
              )}
              {foot}
            </>
          )
        }
      />
      <p className={cn(T.caption, "text-text-tertiary")}>{SHARE_SALE_NOTE}</p>
    </div>
  );
}

/** 18j / 18k / 18l: the banner an auction leads with for the active buyer. */
export function StandingBanner({ standing, listing, state, bids, buyerId }: { standing: BidStanding; listing: Listing; state: AuctionState; bids: Bid[]; buyerId: DemoBuyerId }) {
  const top = state.top;
  if (!top) return null;
  const amount = formatAmount(top.amount, listing.token);
  if (standing === "outbid") {
    const mine = bidsOf(listing.id, bids).find((b) => b.bidderId === buyerId);
    return (
      <Banner tone="attention" title="You were outbid">
        {`${buyerNameOf(top.bidderId)} bid ${amount}.${mine ? ` Your ${formatAmount(mine.amount, listing.token)} is back in your demo wallet.` : ""}`}
      </Banner>
    );
  }
  if (standing === "won") {
    return (
      <Banner tone="good" title="You won the auction">
        {`You won at ${amount} — the sale completes when the creator closes the auction.`}
      </Banner>
    );
  }
  if (standing === "lost") {
    return (
      <Banner tone="info" title="The auction ended">
        {`Highest bid ${amount} by ${buyerLabel(top.bidderId)} — the sale completes when the creator closes the auction. Nothing was taken from your wallet.`}
      </Banner>
    );
  }
  return null;
}

/** The buy box bar's second line for an auction, in the box's own words: the top (or starting) bid and
 *  the time left; once it ends, how it ended for this buyer (StandingBanner's titles). */
export function auctionBarLineOf(listing: Listing, state: AuctionState, standing: BidStanding): string {
  const price = formatAmount(state.top?.amount ?? listing.minBid ?? "0", listing.token);
  if (state.phase !== "ended") return `${price} · ${state.top ? "Top bid" : "Starting bid"} · ${timeLeftLabel(state.msLeft)}`;
  return `${price} · ${standing === "won" ? "You won the auction" : "The auction ended"}`;
}

/** 18f: the auction box. `buyerId` null in a preview, which reads it and never bids. `foot`: the
 *  activity line and the Testnet demo line, under the wallet's. */
export function AuctionCard({
  project,
  listing,
  view,
  state,
  clock,
  buyerId,
  canBid,
  canBuy,
  buyBusy,
  buyHeld = false,
  onBuyNow,
  onPlaced,
  focusBid,
  foot,
}: {
  project: ManualProject;
  listing: Listing;
  view: ProjectView;
  state: AuctionState;
  clock: number;
  buyerId: DemoBuyerId | null;
  canBid: boolean;
  canBuy: boolean;
  buyBusy: boolean;
  /** Another checkout holds the listing (CL-016): Buy now with X waits, greyed, with the line under it. */
  buyHeld?: boolean;
  onBuyNow: () => void;
  onPlaced: (sentence: string) => void;
  /** Bumped by the bar's Place bid when the field wasn't on screen: focus it. */
  focusBid: number;
  foot?: React.ReactNode;
}) {
  const ended = state.phase === "ended";
  const top = state.top;
  const rows = bidsOf(listing.id, view.bids);
  const leads = buyerId !== null && top?.bidderId === buyerId;
  const leaderRef = React.useRef<HTMLParagraphElement>(null);
  const heldId = React.useId();
  const count = `${rows.length} ${rows.length === 1 ? "bid" : "bids"}`;
  const price = formatAmount(top?.amount ?? listing.minBid ?? "0", listing.token);
  const sub = ended ? (top ? `Auction ended · top bid · ${count}` : "Auction ended · no bids") : top ? `Top bid · ${count}` : "Starting bid";
  const facts: BoxFact[] = [
    { label: "Minimum bid", value: formatAmount(listing.minBid ?? "0", listing.token) },
    ...(listing.auctionBuyNow ? [{ label: "Buy now", value: formatAmount(listing.auctionBuyNow, listing.token) }] : []),
    { label: ended ? "Ended" : "Ends", value: formatDateTime(listing.endsAt ?? listing.listedAt) },
    ...tailFacts(listing, view),
  ];

  // Once it ends, a bidder reads the outcome in the banner above (StandingBanner).
  const bidder = buyerId !== null && rows.some((b) => b.bidderId === buyerId);
  const status = ended
    ? bidder
      ? null
      : top
        ? `Highest bid ${formatAmount(top.amount, listing.token)} by ${buyerLabel(top.bidderId)} — the sale completes when the creator closes the auction.`
        : "Ended with no bids."
    : leads
      ? null
      : top
        ? `Top bid ${formatAmount(top.amount, listing.token)}, by ${buyerLabel(top.bidderId)}. Bid more than ${formatAmount(top.amount, listing.token)}.`
        : `No bids yet. Bid at least ${formatAmount(listing.minBid ?? "0", listing.token)}.`;
  const wallet = !ended && buyerId !== null;

  return (
    <div className="flex flex-col gap-3">
      <BuyBox
        label={`${soldWhat(listing)}, auction`}
        overline={`Auction · ${soldWhat(listing)}`}
        price={price}
        sub={sub}
        aside={
          !ended && (
            <Badge tone={state.phase === "endingSoon" ? "warning" : "success"} className="shrink-0">
              {timeLeftLabel(state.msLeft)}
            </Badge>
          )
        }
        facts={facts}
        notes={factNotesOf(listing, view)}
        foot={
          (wallet || foot) && (
            <>
              {wallet && (
                <IconLine icon={Wallet01Icon}>
                  <WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="bid" />
                </IconLine>
              )}
              {foot}
            </>
          )
        }
      >
        <BidHistory listing={listing} rows={rows} buyerId={buyerId} now={clock} />
        {leads && !ended ? (
          <p ref={leaderRef} tabIndex={-1} className={cn(T.rowTitle, "outline-none text-text-success")}>
            You&apos;re the highest bidder.
          </p>
        ) : (
          status && <p className={T.body}>{status}</p>
        )}
        {!ended && buyerId !== null && canBid && (
          <BidForm
            project={project}
            listing={listing}
            state={state}
            clock={clock}
            buyerId={buyerId}
            focusBid={focusBid}
            onPlaced={(sentence) => {
              onPlaced(sentence);
              requestAnimationFrame(() => leaderRef.current?.focus());
            }}
          />
        )}
        {!ended && canBuy && listing.auctionBuyNow && (
          <div className="flex flex-col gap-3">
            <Button
              hierarchy="secondary"
              size="xl"
              className={cn("w-full", buyHeld && "cursor-not-allowed opacity-60")}
              aria-disabled={buyBusy || buyHeld || undefined}
              aria-describedby={buyHeld ? heldId : undefined}
              onClick={() => {
                if (!buyBusy && !buyHeld) onBuyNow();
              }}
            >
              {`Buy now with ${formatAmount(listing.auctionBuyNow, listing.token)}`}
            </Button>
            {buyHeld && (
              <p id={heldId} className={T.body}>
                {IN_CHECKOUT_BUYER_LINE}
              </p>
            )}
          </div>
        )}
      </BuyBox>
      {!ended && <p className={cn(T.caption, "text-text-tertiary")}>{SHARE_SALE_NOTE}</p>}
    </div>
  );
}

const MINUTE = 60_000;

/** "just now" · "5 minutes ago" · "2 hours ago" · "3 days ago" (the web's bid history). */
function ago(at: number, now: number): string {
  const m = Math.max(0, Math.round((now - at) / MINUTE));
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function BidHistory({ listing, rows, buyerId, now }: { listing: Listing; rows: Bid[]; buyerId: DemoBuyerId | null; now: number }) {
  const [open, setOpen] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const id = React.useId();
  const shown = all ? rows : rows.slice(0, 5);
  return (
    <div className="flex flex-col gap-4">
      <Disclosure title={`Bid history (${rows.length})`} open={open} onToggle={() => setOpen((v) => !v)} controls={id} />
      <div id={id} hidden={!open}>
        {rows.length === 0 ? (
          <p className={T.body}>No bids yet.</p>
        ) : (
          <ol className={cn(LIST_CARD, "px-8 py-2")}>
            {shown.map((b) => (
              <li key={b.id} className={cn(T.body, "flex flex-wrap items-baseline gap-x-2 border-b-[length:var(--border-width-1)] border-solid border-border py-4 last:border-b-0 text-text-primary")}>
                <span className="font-semibold tabular-nums">{formatAmount(b.amount, listing.token)}</span>
                <span>·</span>
                <span>{b.bidderId === buyerId ? `You (${buyerNameOf(b.bidderId)})` : buyerLabel(b.bidderId)}</span>
                <span>·</span>
                <time dateTime={new Date(b.at).toISOString()} className="text-text-secondary">
                  {ago(b.at, now)}
                </time>
              </li>
            ))}
          </ol>
        )}
        {!all && rows.length > 5 && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className={cn(T.rowTitle, "inline-flex min-h-[44px] items-center outline-none hover:underline focus-visible:underline text-text-brand")}
          >
            {`Show all (${rows.length})`}
          </button>
        )}
      </div>
    </div>
  );
}

function BidForm({
  project,
  listing,
  state,
  clock,
  buyerId,
  focusBid,
  onPlaced,
}: {
  project: ManualProject;
  listing: Listing;
  state: AuctionState;
  clock: number;
  buyerId: DemoBuyerId;
  focusBid: number;
  onPlaced: (sentence: string) => void;
}) {
  const wallet = useDemoWallet();
  const { data } = useMarket();
  const { busy, place } = usePlaceBid({ project, buyerId });
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fieldId = React.useId();
  const errorId = React.useId();
  const free = freeMicrosFor(buyerId, listing, { wallet, market: data, now: clock });

  React.useEffect(() => {
    if (focusBid === 0) return;
    inputRef.current?.scrollIntoView({ block: "center" });
    inputRef.current?.focus();
  }, [focusBid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const check = validateBid(value, state, listing, free);
    if (!check.ok) {
      setError(check.message);
      inputRef.current?.scrollIntoView({ block: "center" });
      inputRef.current?.focus();
      return;
    }
    setError(null);
    const done = await place(listing, fromMicros(check.micros), free);
    if (done) {
      setValue("");
      onPlaced(done);
    }
  };

  return (
    <form id={BID_FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={fieldId} className={T.rowTitle}>
        Your bid
      </label>
      <TextInput
        ref={inputRef}
        id={fieldId}
        size="xl"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="send"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          if (error) setError(null);
        }}
        onBlur={() => {
          if (!value.trim()) return;
          const check = validateBid(value, state, listing, free);
          setError(check.ok ? null : check.message);
        }}
        placeholder={state.top ? `More than ${state.top.amount}` : `At least ${listing.minBid ?? "0"}`}
        suffix={listing.token}
        invalid={error !== null}
        aria-invalid={error !== null || undefined}
        aria-describedby={error ? errorId : undefined}
        className="tabular-nums"
      />
      {error && (
        <p id={errorId} className={cn(T.meta, "text-text-error")}>
          {error}
        </p>
      )}
    </form>
  );
}

/** Main NFT activity, one line in the buy box's foot: the newest Main sale, else the newest NFT
 *  entry, else when it was listed. */
export function MainActivity({ projectId, sales, listedAt }: { projectId: string; sales: Sale[]; listedAt: number }) {
  const { record } = useJourney(projectId);
  const sale = sales.filter((s) => s.item.nft === "main").reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, projectId, { kind: "main" })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(listedAt)}`;
  return (
    <IconLine icon={Activity01Icon}>
      <p className={cn(T.meta, "tabular-nums")}>
        <span className="sr-only">Main NFT activity: </span>
        {line}
      </p>
    </IconLine>
  );
}

/** 18e: what the active buyer holds of the Main NFT, from their own Sale records (the web's Purchased
 *  Summary), as a receipt card. */
export function PurchaseSummary({ holding, toggleRef }: { holding: { sharePct: number; sales: Sale[] }; toggleRef?: React.Ref<HTMLButtonElement> }) {
  // Bought from the creator, named as the buyer knows them, never "you" (owner, 2026-11-15).
  const creator = useCreatorName();
  const sales = [...holding.sales].sort((a, b) => a.at - b.at);
  const latest = sales[sales.length - 1];
  const n = sales.length;
  const tokenId = sales.find((s) => s.tokenId !== null)?.tokenId ?? null;
  const sum = (parts: { amount: string; coin: string }[]) => {
    const by = new Map<string, string>();
    for (const p of parts) by.set(p.coin, by.has(p.coin) ? addAmounts(by.get(p.coin) ?? "0", p.amount) : p.amount);
    return [...by].map(([coin, amount]) => formatAmount(amount, coin as Sale["token"])).join(" + ");
  };
  const price = sum(sales.map((s) => ({ amount: s.price, coin: s.token })));
  const fee = sum(sales.map((s) => ({ amount: s.fees.network.amount, coin: s.fees.network.coin })));
  return (
    <ReceiptCard
      label="Purchase summary"
      overline="Your purchase · Main NFT"
      headline={`You own ${holding.sharePct}% of the project${n > 1 ? ` · ${n} purchases` : ""}`}
      facts={[
        { label: "Token", value: tokenId !== null ? `#${tokenId}` : "Not assigned" },
        { label: "Paid", value: price },
        { label: "Purchased", value: formatDate(latest.at) },
      ]}
      details={[
        { label: "Collection", value: latest.collection },
        { label: "Blockchain", value: networkLabelOf(latest.network) },
        { label: "Price paid", value: `${price} (+ ${fee} network fee)` },
        { label: "Purchased from", value: creator },
        { label: "Transaction", value: `${shortAddress(latest.txHash)} · Demo` },
        { label: "Purchased", value: formatDateTime(latest.at) },
      ]}
      toggleRef={toggleRef}
    />
  );
}
