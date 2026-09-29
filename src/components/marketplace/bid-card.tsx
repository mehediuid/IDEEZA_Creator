"use client";

// The buyer rail's Auction card (Figma 41505:134245; P2-MARKETPLACE-11, -12,
// -15). The rail (buyer-rail.tsx) hands in the facts and the wallet line; this
// file draws the rest, in order:
// - Bid history (n) ▾ — a disclosure, highest first, "You (Sam)" for the
//   active buyer's own rows, five and then "Show all (n)";
// - "You're the highest bidder." while the active buyer leads;
// - "Your bid" and the inline ★ Place bid (the page's one violet), checked by
//   `validateBid` (T04) on submit and on blur against `freeMicrosFor`;
// - "Buy now with {x}" (secondary) when the listing has a buy-now price;
// - once ended, the sentence of who leads, and no field or button.
//
// Timing: `useAuctionClock` ticks each minute and once more at `endsAt`, so the
// card flips on time; the page's live region says "The auction has ended."
// once. The countdown text itself is not live, so it doesn't chatter.
//
// After a bid is signed, focus goes to "You're the highest bidder." once the
// wallet dialog closes, and the live region says the sentence
// (`useAfterDialogClose`, which the purchase uses too).

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { Icon } from "@/components/dashboard/icon";
import { Button, TextInput } from "@/components/ideeza";
import { formatDateTime } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { bidsOf, validateBid } from "@/lib/market/auction";
import { useMarket } from "@/lib/market/market-store";
import type { AuctionState, Bid, Listing } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount, fromMicros } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { freeMicrosFor, usePlaceBid } from "./bid-dialog";
import { buyerNameOf } from "./purchase-dialog";

const MINUTE = 60_000;
const HISTORY_SHOWN = 5;
/** 44 px at phone width and on a coarse pointer; Buy now and Place bid are always 44 px. */
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/**
 * The wall clock to the minute, and exactly `endsAt` once it has passed, so an
 * auction ends on time rather than up to a minute late. Never earlier than the
 * page's own clock.
 */
export function useAuctionClock(endsAt: number | undefined, pageNow: number): number {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const tick = window.setInterval(onChange, MINUTE);
      const left = endsAt === undefined ? -1 : endsAt - Date.now();
      // One shot at the end (setTimeout's ceiling is ~24.8 days; the minute tick covers anything longer).
      const once = left > 0 && left < 2_147_000_000 ? window.setTimeout(onChange, left + 20) : null;
      return () => {
        window.clearInterval(tick);
        if (once !== null) window.clearTimeout(once);
      };
    },
    [endsAt],
  );
  const snap = React.useSyncExternalStore(
    subscribe,
    () => {
      const now = Date.now();
      const minute = Math.floor(now / MINUTE) * MINUTE;
      return endsAt !== undefined && now >= endsAt ? Math.max(minute, endsAt) : minute;
    },
    () => 0,
  );
  return Math.max(snap, pageNow);
}

/**
 * Runs `run` once no modal dialog is open any more (`whenDialogsClose`) — the
 * wallet dialog stays open on Done after `request()` resolves, and the control
 * that opened it may be gone by then (a sold listing's Buy now), so focus
 * would fall to <body>. Unmounting the caller cancels it.
 */
export function useAfterDialogClose(): (run: () => void) => void {
  const stop = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => stop.current?.(), []);
  return React.useCallback((run: () => void) => {
    stop.current?.();
    stop.current = whenDialogsClose(run);
  }, []);
}

/** "just now" · "5 minutes ago" · "2 hours ago" · "3 days ago". */
function ago(at: number, now: number): string {
  const m = Math.max(0, Math.round((now - at) / MINUTE));
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The sentence an ended auction reads, for the active buyer (or a visitor, `buyerId` null). */
function endedLine(listing: Listing, state: AuctionState, buyerId: DemoBuyerId | null): string {
  const top = state.top;
  if (!top) return "Ended with no bids.";
  const amount = formatAmount(top.amount, listing.token);
  if (buyerId && top.bidderId === buyerId) {
    return `You won at ${amount} — the sale completes when the creator closes the auction.`;
  }
  return `Auction ended ${formatDateTime(listing.endsAt ?? listing.listedAt)}. Highest bid ${amount} by ${buyerLabel(
    top.bidderId,
  )} — the sale completes when the creator closes the auction.`;
}

export function BidCard({
  project,
  listing,
  bids,
  state,
  clock,
  buyerId,
  canBid,
  canBuy,
  buyBusy,
  onBuyNow,
  facts,
  wallet,
  announce,
}: {
  project: ManualProject;
  listing: Listing;
  /** This project's bids (`view.bids`). */
  bids: Bid[];
  /** `auctionStateOf(listing, bids, clock)`. */
  state: AuctionState;
  clock: number;
  /** The active demo buyer; null in a preview, which reads the card and never bids. */
  buyerId: DemoBuyerId | null;
  canBid: boolean;
  canBuy: boolean;
  buyBusy: boolean;
  onBuyNow: () => void;
  facts: React.ReactNode;
  wallet: React.ReactNode;
  announce: (message: string) => void;
}) {
  const ended = state.phase === "ended";
  const leads = buyerId !== null && state.top?.bidderId === buyerId;
  const leaderRef = React.useRef<HTMLParagraphElement>(null);
  const afterClose = useAfterDialogClose();

  // "The auction has ended." once, when it ends while the card is on screen.
  const wasEnded = React.useRef(ended);
  React.useEffect(() => {
    if (ended && !wasEnded.current) announce("The auction has ended.");
    wasEnded.current = ended;
  }, [ended, announce]);

  const onPlaced = (sentence: string) =>
    afterClose(() => {
      leaderRef.current?.focus();
      announce(sentence);
    });

  return (
    <div className="flex flex-col gap-8">
      {facts}
      <BidHistory listing={listing} bids={bids} buyerId={buyerId} now={clock} />
      {ended ? (
        <p className="text-md text-text-primary">{endedLine(listing, state, buyerId)}</p>
      ) : (
        <>
          {leads && (
            <p ref={leaderRef} tabIndex={-1} className="rounded-sm text-md font-semibold text-text-success outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
              You&apos;re the highest bidder.
            </p>
          )}
          {buyerId !== null && canBid && (
            <BidForm project={project} listing={listing} state={state} clock={clock} buyerId={buyerId} onPlaced={onPlaced} />
          )}
          {canBuy && listing.auctionBuyNow && (
            <Button
              type="button"
              hierarchy="secondary"
              size="lg"
              className="h-[44px] w-full"
              disabled={buyBusy}
              onClick={onBuyNow}
            >
              Buy now with {formatAmount(listing.auctionBuyNow, listing.token)}
            </Button>
          )}
          {buyerId !== null && wallet}
        </>
      )}
    </div>
  );
}

function BidForm({
  project,
  listing,
  state,
  clock,
  buyerId,
  onPlaced,
}: {
  project: ManualProject;
  listing: Listing;
  state: AuctionState;
  clock: number;
  buyerId: DemoBuyerId;
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const check = validateBid(value, state, listing, free);
    if (!check.ok) {
      setError(check.message);
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={fieldId} className="text-sm font-medium text-text-primary">
        Your bid
      </label>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <TextInput
            ref={inputRef}
            id={fieldId}
            size="xl"
            inputMode="decimal"
            autoComplete="off"
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
        </div>
        <Button type="submit" hierarchy="primary" size="lg" className="h-[44px] shrink-0" disabled={busy}>
          Place bid
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-text-error">
          {error}
        </p>
      )}
    </form>
  );
}

function BidHistory({
  listing,
  bids,
  buyerId,
  now,
}: {
  listing: Listing;
  bids: Bid[];
  buyerId: DemoBuyerId | null;
  now: number;
}) {
  const rows = React.useMemo(() => bidsOf(listing.id, bids), [listing.id, bids]);
  const [open, setOpen] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const panelId = React.useId();
  const firstRevealed = React.useRef<HTMLLIElement>(null);
  const shown = all ? rows : rows.slice(0, HISTORY_SHOWN);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          TAP,
        )}
      >
        Bid history ({rows.length})
        <span
          aria-hidden
          className={cn(
            "inline-flex text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
            open && "rotate-180",
          )}
        >
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <div id={panelId} hidden={!open}>
        {rows.length === 0 ? (
          <p className="text-md text-text-secondary">No bids yet.</p>
        ) : (
          <>
            <ol role="list" className="flex flex-col gap-3">
              {shown.map((b, i) => (
                <li
                  key={b.id}
                  ref={all && i === HISTORY_SHOWN ? firstRevealed : undefined}
                  tabIndex={all && i === HISTORY_SHOWN ? -1 : undefined}
                  className="rounded-sm text-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <span className="font-semibold tabular-nums">{formatAmount(b.amount, b.token)}</span>
                  {" · "}
                  {b.bidderId === buyerId ? `You (${buyerNameOf(b.bidderId)})` : buyerLabel(b.bidderId)}
                  {" · "}
                  <time dateTime={new Date(b.at).toISOString()} title={formatDateTime(b.at)} className="text-text-secondary">
                    {ago(b.at, now)}
                  </time>
                </li>
              ))}
            </ol>
            {!all && rows.length > HISTORY_SHOWN && (
              <button
                type="button"
                onClick={() => {
                  setAll(true);
                  requestAnimationFrame(() => firstRevealed.current?.focus());
                }}
                className={cn(
                  "mt-3 inline-flex min-h-[24px] items-center rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus",
                  TAP,
                )}
              >
                Show all ({rows.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
