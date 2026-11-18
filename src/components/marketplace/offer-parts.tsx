"use client";

// The buy box's parts on Explore marketplace's buyer view (owner, 2026-11-15:
// the marketplace details page is a shop page, the phone's approved buy box on
// the web — overline, price large, then the button; and, the same day, "after
// the Main NFT there is so much information": every fact folds away):
// - OfferTabs: the one Marketplace box's tabs, Main NFT / Physical NFT /
//   Virtual NFT (the dev app's Marketplace section), only the ones on sale;
//   with one, a chip names it instead. One panel shows at a time.
// - OfferTop: what is sold as the overline ("10% of the project",
//   "Physical NFT · Personal use"), the price in large type, and an optional
//   line under it (an auction's end and time left, a copy's sold count).
// - WalletLine: who pays, from which demo wallet, with the Testnet demo badge
//   beside the money (prototype only).
// - MoreFacts: "NFT details", folded — the listing's facts as a compact grid
//   (DealFacts for the Main NFT, the copy's own for a copy) and its activity.
// - LegalLine: the one legal line under the Main NFT, always shown.

import * as React from "react";
import { ArrowDown01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Radio, TestnetDemoBadge } from "@/components/ideeza";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import type { Network, Token } from "@/lib/brief/types";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { timeLeftLabel } from "@/lib/market/auction";
import { useMarket } from "@/lib/market/market-store";
import type { AuctionState, EditionKind, Listing } from "@/lib/market/types";
import { moveTab } from "@/lib/ui/tab-keys";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf, testCoin } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { buyerNameOf } from "./purchase-dialog";

export type OfferTab = "main" | EditionKind;

export const OFFER_TAB_LABEL: Record<OfferTab, string> = {
  main: "Main NFT",
  physical: "Physical NFT",
  virtual: "Virtual NFT",
};

const TAB =
  "inline-flex min-h-[40px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-3 text-md font-semibold outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";
const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";

/** The box's tabs and the one panel under them; with one tab, a chip names it. */
export function OfferTabs<T extends OfferTab>({
  tabs,
  active,
  onSelect,
  children,
}: {
  tabs: readonly T[];
  active: T;
  onSelect: (tab: T) => void;
  children: React.ReactNode;
}) {
  const base = React.useId().replace(/:/g, "");
  const tabId = (t: T) => `${base}-tab-${t}`;
  const panelId = `${base}-panel`;
  if (tabs.length < 2) {
    return (
      <div className="flex flex-col gap-6">
        <Badge tone="neutral" className="self-start">
          {OFFER_TAB_LABEL[active]}
        </Badge>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="What's on sale"
        onKeyDown={(e) => moveTab(e, tabs, active, onSelect)}
        className="flex items-end gap-1 border-b border-solid border-border"
      >
        {tabs.map((t) => {
          const on = t === active;
          return (
            <button
              key={t}
              id={tabId(t)}
              type="button"
              role="tab"
              data-tab={t}
              aria-selected={on}
              aria-controls={on ? panelId : undefined}
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(t)}
              className={cn(TAB, on ? TAB_ON : TAB_OFF)}
            >
              {OFFER_TAB_LABEL[t]}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="flex flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

/** "10% of the project", or "The whole project": the Main NFT tab already names what it is. */
export function soldWhatOf(listing: Listing): string {
  return listing.percentSelling >= 100 ? "The whole project" : `${listing.percentSelling}% of the project`;
}

/** Lazy while nothing is on chain yet: the token is minted at the sale. */
function isLazy(listing: Listing, view: ProjectView): boolean {
  if (view.mint.status === "lazyMinted") return true;
  if (view.mint.status === "onChain") return false;
  return listing.mintingType === "lazy";
}

/** The overline, the price large, and what stands under it. */
export function OfferTop({
  overline,
  label,
  price,
  sub,
}: {
  overline: string;
  /** Said before the price for an auction: "Current bid", "Starting bid". */
  label?: string;
  price: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 text-sm font-medium text-text-secondary">{overline}</p>
      {label && <p className="m-0 text-sm text-text-tertiary">{label}</p>}
      <p className="m-0 break-words text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{price}</p>
      {sub && <div className="text-sm text-text-secondary">{sub}</div>}
    </div>
  );
}

/** An auction's price block: the bid that leads (or the starting bid), and when it ends. */
export function AuctionTop({ listing, auction }: { listing: Listing; auction: AuctionState }) {
  const ended = auction.phase === "ended";
  const endsAt = listing.endsAt ?? listing.listedAt;
  return (
    <OfferTop
      overline={`${soldWhatOf(listing)} · Auction`}
      label={auction.top ? (ended ? "Winning bid" : "Current bid") : ended ? "No bids" : "Starting bid"}
      price={formatAmount(auction.top?.amount ?? listing.minBid ?? "0", listing.token)}
      sub={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
          <span>
            {ended ? "Ended" : "Ends"}{" "}
            <time dateTime={new Date(endsAt).toISOString()}>{formatDateTime(endsAt)}</time>
          </span>
          {!ended && <Badge tone={auction.phase === "endingSoon" ? "warning" : "neutral"}>{timeLeftLabel(auction.msLeft)}</Badge>}
        </span>
      }
    />
  );
}

/** "Paying from Mira's demo wallet · 0x7d50…8993 · 10 test MATIC" (P2-MARKETPLACE-13 as changed), the Testnet
 *  demo badge beside it, then the one home of every wallet control, the Demo wallet dialog. */
export function WalletLine({
  buyerId,
  token,
  network,
  verb,
  now,
}: {
  buyerId: DemoBuyerId;
  token: Token;
  network: Network;
  verb: "buy" | "bid";
  now: number;
}) {
  const wallet = useDemoWallet();
  const { data } = useMarket();
  const { openManage } = useWalletRequest();
  const name = buyerNameOf(buyerId);
  const connected = wallet?.identities[buyerId]?.connected === true;
  const have = availableOf(buyerId, token, network, { wallet, market: data, now });
  return (
    <div className="flex flex-col gap-3 text-md text-text-secondary">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-[2px] inline-flex shrink-0 text-text-tertiary">
          <Icon icon={Wallet01Icon} size={14} />
        </span>
        <p className="m-0 min-w-0 break-words">
          {wallet === undefined ? (
            "Reading the demo wallet…"
          ) : connected ? (
            <span className="tabular-nums">
              Paying from {name}&apos;s demo wallet · {shortAddress(demoAddress(buyerId))} · {testCoin(have, token)}
            </span>
          ) : (
            <>
              {name}&apos;s demo wallet isn&apos;t connected — you&apos;ll connect it when you {verb}.
            </>
          )}{" "}
          <TestnetDemoBadge className="align-middle" />
        </p>
      </div>
      <button type="button" onClick={openManage} className={QUIET_LINK}>
        Manage demo wallets
      </button>
    </div>
  );
}

/** The one legal line under a share on sale. */
export function LegalLine() {
  return <p className="m-0 text-sm text-text-tertiary">{SHARE_SALE_NOTE}</p>;
}

/** "NFT details", folded under a hairline: the facts a buyer may want, never in the way of the button. */
export function MoreFacts({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="flex flex-col gap-5 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[24px] items-center justify-between gap-3 rounded-sm text-md font-semibold text-text-primary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
      >
        NFT details
        <span
          aria-hidden
          className={cn("inline-flex transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}
        >
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-5">
          {children}
        </div>
      )}
    </div>
  );
}

export type Fact = { label: string; value: string };

/** Facts as a compact grid: a small label over each value, three to a row. */
export function FactGrid({ facts }: { facts: Fact[] }) {
  return (
    <dl className="m-0 grid grid-cols-3 gap-x-6 gap-y-5">
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-sm text-text-tertiary">{f.label}</dt>
          <dd className="m-0 break-words text-md text-text-primary">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The Main NFT listing's facts and the note they need (inside NFT details). */
export function DealFacts({ listing, view }: { listing: Listing; view: ProjectView }) {
  const lazy = isLazy(listing, view);
  return (
    <>
      <FactGrid
        facts={[
          { label: "Listing", value: listing.type === "auction" ? "Auction" : "Buy now" },
          { label: "Share", value: `${listing.percentSelling}%` },
          { label: "Royalties", value: `${listing.royaltiesPct}%` },
          { label: "Minting", value: lazy ? "Lazy" : "Minted" },
          { label: "Chain", value: networkLabelOf(listing.network) },
          { label: "Collection", value: listing.collection || "—" },
        ]}
      />
      <p className="m-0 text-sm text-text-tertiary">
        Royalties are a share of resales, if marketplaces honour them.
        {lazy ? " Lazy: the token is minted when you buy." : ""}
      </p>
    </>
  );
}

export type ChoiceRow = { value: string; label: string; aside: string; disabled?: boolean };

/** A choice as radio rows: each with its word and what stands beside it (a price, "Sold out", "Not on sale").
 *  A row that can't be picked stays, greyed, so the buyer sees every use there is (owner, 2026-11-16). */
export function ChoiceRows({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: ChoiceRow[];
}) {
  const group = React.useId();
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-3 p-0 text-sm font-semibold text-text-secondary">{legend}</legend>
      {options.map((o) => {
        const on = o.value === value && !o.disabled;
        return (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-[44px] items-center gap-4 rounded-lg border border-solid px-5 py-3 transition-colors duration-fast motion-reduce:transition-none",
              o.disabled
                ? "cursor-not-allowed border-border bg-bg-surface opacity-60"
                : on
                  ? "cursor-pointer border-border-brand bg-bg-brand-subtle"
                  : "cursor-pointer border-border bg-bg-surface hover:bg-bg-subtle",
            )}
          >
            <input
              type="radio"
              name={group}
              checked={on}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <Radio checked={on} decorative size="sm" className="peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus" />
            <span className="min-w-0 flex-1 text-md font-semibold text-text-primary">{o.label}</span>
            <span className="shrink-0 text-md tabular-nums text-text-secondary">{o.aside}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
