"use client";

// The Main NFT on the phone's Explore marketplace view (Figma 18b, 18e, 18f,
// 18j–18l), the web's buyer rail (marketplace/buyer-rail.tsx, bid-card.tsx)
// placed for a phone. Its logic and words are the web's: `usePurchase` and
// `usePlaceBid` sign through the phone's wallet sheet (PhoneWalletScope), the
// `can()` answers come from `view.canCtx`, the auction asks again at its own
// clock (`useAuctionClock`).
// · A holder reads Purchase summary first (18e), then "Buy another share" when
//   the creator has another share on sale.
// · Buy now (18b): the price line, the listing's facts, the wallet line and
//   the share-sale note. The button is the bottom bar's.
// · An auction (18f): the price line with its time left, the facts, Bid
//   history (n), who leads, Your bid (the bar's Place bid submits it), the
//   wallet line and the note, Buy now with X. Outbid (18j), won (18k) and lost
//   (18l) each lead with a banner; once ended, the web's sentence replaces the
//   field.
// · Paused, removed, closed with no bids and sold each say so.
// · Main NFT activity: the newest sale, else the newest NFT entry, else "No
//   activity yet · listed {date}".

import * as React from "react";
import { Badge } from "@/components/ideeza/badge";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { freeMicrosFor, usePlaceBid } from "@/components/marketplace/bid-dialog";
import { buyerNameOf } from "@/components/marketplace/purchase-dialog";
import { royaltyText, SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { bidsOf, timeLeftLabel, validateBid } from "@/lib/market/auction";
import { useMarket } from "@/lib/market/market-store";
import type { AuctionState, Bid, Listing, Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { addAmounts, formatAmount, fromMicros } from "@/lib/wallet/money";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { CardNote, Disclosure, NftActivityLine, OfferCard, OfferRowsCard, WalletLine, type OfferRow } from "./parts";
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

/** The listing's facts, as the web reads them (buyer-rail.tsx `ListingFacts`). */
function mintingOf(listing: Listing, view: ProjectView): string {
  if (view.mint.status === "lazyMinted") return "Lazy — the token is minted when you buy";
  if (view.mint.status === "onChain") return `Minted on ${networkLabelOf(listing.network)}`;
  return listing.mintingType === "lazy" ? "Lazy — the token is minted when you buy" : `Minted on ${networkLabelOf(listing.network)}`;
}

function tailRows(listing: Listing, view: ProjectView): OfferRow[] {
  return [
    { label: "Royalties", value: royaltyText(listing.royaltiesPct) },
    { label: "Minting", value: mintingOf(listing, view) },
    { label: "Collection", value: listing.collection || "—" },
    { label: "Blockchain", value: networkLabelOf(listing.network) },
  ];
}

/** 18b: a live Buy now listing's card. */
export function BuyNowCard({ listing, view, buyerId }: { listing: Listing; view: ProjectView; buyerId: DemoBuyerId | null }) {
  const price = formatAmount(listing.price ?? "0", listing.token);
  return (
    <OfferCard
      title={`Buy now · ${price}`}
      sub={`Main NFT · ${listing.percentSelling}% of the project`}
      rows={[
        { label: "Listing type", value: "Buy now" },
        { label: "Price", value: price },
        { label: "Selling percentage", value: `${listing.percentSelling}%` },
        ...tailRows(listing, view),
      ]}
      foot={
        <>
          {buyerId && <WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="buy" />}
          <CardNote>{SHARE_SALE_NOTE}</CardNote>
        </>
      }
    />
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

/** 18f: the auction card. `buyerId` null in a preview, which reads it and never bids. */
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
  onBuyNow,
  onPlaced,
  focusBid,
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
  onBuyNow: () => void;
  onPlaced: (sentence: string) => void;
  /** Bumped by the bar's Place bid when the field wasn't on screen: focus it. */
  focusBid: number;
}) {
  const ended = state.phase === "ended";
  const top = state.top;
  const rows = bidsOf(listing.id, view.bids);
  const leads = buyerId !== null && top?.bidderId === buyerId;
  const leaderRef = React.useRef<HTMLParagraphElement>(null);
  const title = ended
    ? top
      ? `Auction ended · top bid ${formatAmount(top.amount, listing.token)}`
      : "Auction ended"
    : top
      ? `Auction · top bid ${formatAmount(top.amount, listing.token)}`
      : `Auction · starting bid ${formatAmount(listing.minBid ?? "0", listing.token)}`;
  const facts: OfferRow[] = [
    { label: "Minimum bid", value: formatAmount(listing.minBid ?? "0", listing.token) },
    ...(listing.auctionBuyNow ? [{ label: "Buy now price", value: formatAmount(listing.auctionBuyNow, listing.token) }] : []),
    ...(top ? [{ label: "Top bid", value: `${formatAmount(top.amount, listing.token)} · ${rows.length} ${rows.length === 1 ? "bid" : "bids"}` }] : []),
    { label: ended ? "Ended" : "Ends", value: formatDateTime(listing.endsAt ?? listing.listedAt) },
    ...tailRows(listing, view),
  ];

  // Once it ends, a bidder reads the outcome in the banner above (StandingBanner).
  const bidder = buyerId !== null && rows.some((b) => b.bidderId === buyerId);
  const status = ended
    ? bidder
      ? null
      : top
        ? `Auction ended ${formatDateTime(listing.endsAt ?? listing.listedAt)}. Highest bid ${formatAmount(top.amount, listing.token)} by ${buyerLabel(top.bidderId)} — the sale completes when the creator closes the auction.`
        : "Ended with no bids."
    : leads
      ? null
      : top
        ? `Top bid ${formatAmount(top.amount, listing.token)}, by ${buyerLabel(top.bidderId)}. Bid more than ${formatAmount(top.amount, listing.token)}.`
        : `No bids yet. Bid at least ${formatAmount(listing.minBid ?? "0", listing.token)}.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className={T.section}>{title}</p>
          <p className={T.meta}>{`Main NFT · ${listing.percentSelling}% of the project`}</p>
        </div>
        {!ended && (
          <Badge tone={state.phase === "endingSoon" ? "warning" : "success"} className="shrink-0">
            {timeLeftLabel(state.msLeft)}
          </Badge>
        )}
      </div>
      <OfferRowsCard rows={facts} label="Auction facts" />
      <BidHistory listing={listing} rows={rows} buyerId={buyerId} now={clock} />
      {leads && !ended ? (
        <p ref={leaderRef} tabIndex={-1} className={cn(T.rowTitle, "outline-none text-text-success")}>
          You&apos;re the highest bidder.
        </p>
      ) : (
        status && <p className={T.rowTitle}>{status}</p>
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
      {!ended && (
        <div className="flex flex-col gap-2">
          {buyerId && <WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="bid" />}
          <CardNote>{SHARE_SALE_NOTE}</CardNote>
        </div>
      )}
      {!ended && canBuy && listing.auctionBuyNow && (
        <Button
          hierarchy="secondary"
          size="xl"
          className="w-full"
          aria-disabled={buyBusy || undefined}
          onClick={() => {
            if (!buyBusy) onBuyNow();
          }}
        >
          {`Buy now with ${formatAmount(listing.auctionBuyNow, listing.token)}`}
        </Button>
      )}
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

/** Main NFT activity: the newest Main sale, else the newest NFT entry, else when it was listed. */
export function MainActivity({ projectId, sales, listedAt }: { projectId: string; sales: Sale[]; listedAt: number }) {
  const { record } = useJourney(projectId);
  const sale = sales.filter((s) => s.item.nft === "main").reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, projectId, { kind: "main" })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(listedAt)}`;
  return <NftActivityLine heading="Main NFT activity" line={line} />;
}

/** 18e: what the active buyer holds of the Main NFT, from their own Sale records (the web's Purchased
 *  Summary), open at first. */
export function PurchaseSummary({ holding, toggleRef }: { holding: { sharePct: number; sales: Sale[] }; toggleRef?: React.Ref<HTMLButtonElement> }) {
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
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
    <section aria-label="Purchase summary" className="flex flex-col gap-4">
      <Disclosure title="Purchase summary" open={open} onToggle={() => setOpen((v) => !v)} controls={id} toggleRef={toggleRef} className="w-full justify-between" />
      <div id={id} hidden={!open} className="flex flex-col gap-4">
        <OfferRowsCard
          label="Purchase summary"
          rows={[
            { label: "Collection", value: latest.collection },
            { label: "Blockchain", value: networkLabelOf(latest.network) },
            { label: "NFT type", value: "Main NFT" },
            { label: "Token ID", value: tokenId !== null ? `#${tokenId}` : "Not assigned" },
            { label: "Your share", value: `${holding.sharePct}% of the project${n > 1 ? ` in ${n} purchases` : ""}` },
            { label: "Price paid", value: `${price} (+ ${fee} network fee)` },
            { label: "Purchased from", value: "You (the creator)" },
            { label: "Transaction", value: `${shortAddress(latest.txHash)} · Demo` },
            { label: "Purchased", value: formatDateTime(latest.at) },
          ]}
        />
        <p className={T.meta}>Not on a blockchain — this is a testnet demo.</p>
      </div>
    </section>
  );
}

