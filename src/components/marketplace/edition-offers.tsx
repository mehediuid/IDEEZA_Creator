"use client";

// The buyer rail's copies (spec §2.4, TABS T2, P2-TABS-26; owner, 2026-11-15:
// "the Physical and Virtual offers stacked one after another push the page far
// down"): every listed Physical or Virtual NFT, the whole project's first, then
// each product's, under the Main NFT's box in the same Marketplace block — or
// alone, when the Main NFT was never listed: copies sell on their own (owner,
// 2026-10-11). Only the lock hides them (R1-2).
//
// Laid out as a 20-expert panel recommended and the phone's approved copies
// (owner, 2026-11-12: one row per copy, never a card with a Buy on every card):
// - Physical NFT · Virtual NFT tabs (the dev app's and the product page's
//   tabs), each with its lowest price; a kind alone is a plain heading. The
//   tab opens on the kind the buyer already holds, else Physical.
// - Under the tabs, what that kind gets you, said once (helperLineOf, the
//   product page's line).
// - Rows grouped by scope — "Whole project", then each product (a link to its
//   page) — one row per offer: the kind mark, "Physical NFT · Personal use",
//   its price ("From x" when it has two), a thin sold bar with "n of N sold",
//   its activity line, and a small secondary Buy. A use is its own row: it has
//   its own price and supply.
// - More than ROWS_OPEN rows in a tab: each product's rows fold into one line
//   ("BreezeFan · 2 offers · from x") that opens in place.
// - Buy on a one-price offer goes straight to the wallet; on a two-price offer
//   a dialog (the one popup style) asks This version or With future updates,
//   with each help line once, and its one button opens the wallet. The Main
//   NFT's Buy now stays the page's one violet on the page itself.
// - While every unit left is in another tab's checkout, Buy waits, greyed,
//   with "Someone is buying this now. Try again in a few minutes." under it.
// - A preview reads the same rows with both prices and no Buy (PPL-6).

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, CubeIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, Radio, TestnetDemoBadge } from "@/components/ideeza";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import type { SlotProps } from "@/components/projects/details/slots";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, editionOffersOf, isProjectScope, TIER_HELP, trackCardOf } from "@/lib/market/editions";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type Listing, type Sale } from "@/lib/market/types";
import { moveTab } from "@/lib/ui/tab-keys";
import { buyerLabel } from "@/lib/wallet/identities";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { TIER_WORD, useEditionPurchase, type EditionTier } from "./purchase-dialog";

const TIERS: EditionTier[] = ["regular", "extended"];
const KINDS: EditionKind[] = ["physical", "virtual"];
/** Rows a tab shows open; past it, each product's rows fold into one line. */
export const ROWS_OPEN = 6;
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const LINK =
  "inline-flex items-center rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";
const TAB =
  "inline-flex min-h-[44px] flex-1 flex-col items-start justify-center rounded-t-lg border-b-2 border-solid px-5 py-2 text-left outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };
type Group = { productId: string; name: string; tracks: Listed[] };

/** The lowest price a buyer can pay among `tracks` (each offer's This version price). */
function lowestOf(tracks: Listed[]): Listed["listing"] | null {
  let low: Listed["listing"] | null = null;
  for (const t of tracks) {
    if (!low || (t.listing.token === low.token && compareAmounts(t.listing.regular, low.regular) < 0)) low = t.listing;
  }
  return low;
}

const fromLine = (l: Listed["listing"] | null) => (l ? `from ${formatAmount(l.regular, l.token)}` : "");

export function EditionOffers({
  project,
  view,
  viewer,
  announce,
  alone = false,
}: Pick<SlotProps, "project" | "view" | "viewer" | "announce"> & {
  /** No Main NFT box above it: no rule between them. */
  alone?: boolean;
}) {
  const scopes = React.useMemo(
    () => [{ id: PROJECT_SCOPE, name: project.name }, ...view.products.map((p) => ({ id: p.id, name: displayProductName(p.name) }))],
    [project.name, view.products],
  );
  const groups = editionOffersOf(scopes, view.editions, view.lock !== null) as Group[];
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;
  const kinds = KINDS.filter((k) => groups.some((g) => g.tracks.some((t) => t.kind === k)));
  // A holder opens on the kind they own; everyone else on Physical, the dev app's default.
  const held = buyerId
    ? KINDS.find((k) => kinds.includes(k) && view.sales.some((s) => s.buyerId === buyerId && s.item.nft === k))
    : undefined;
  const [picked, setPicked] = React.useState<EditionKind | null>(null);
  const titleId = React.useId();
  const base = React.useId().replace(/:/g, "");
  if (!groups.length || !chain || !kinds.length) return null;
  const kind = picked && kinds.includes(picked) ? picked : (held ?? kinds[0]);
  const ofKind = groups
    .map((g) => ({ ...g, tracks: g.tracks.filter((t) => t.kind === kind) }))
    .filter((g) => g.tracks.length > 0);
  const rows = ofKind.reduce((n, g) => n + g.tracks.length, 0);
  const fold = rows > ROWS_OPEN;
  const tabId = (k: EditionKind) => `${base}-tab-${k}`;
  const panelId = `${base}-panel`;
  const tabbed = kinds.length > 1;
  const lowest = (k: EditionKind) => lowestOf(groups.flatMap((g) => g.tracks.filter((t) => t.kind === k)));

  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-5", !alone && "border-t border-solid border-border pt-8")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="m-0 text-md font-bold text-text-primary">
          Physical and Virtual NFTs
        </h3>
        <TestnetDemoBadge />
      </div>

      {tabbed ? (
        <div
          role="tablist"
          aria-label="NFT kind"
          onKeyDown={(e) => moveTab(e, kinds, kind, setPicked)}
          className="flex items-end gap-2 border-b border-solid border-border"
        >
          {kinds.map((k) => {
            const on = k === kind;
            return (
              <button
                key={k}
                id={tabId(k)}
                type="button"
                role="tab"
                data-tab={k}
                aria-selected={on}
                aria-controls={on ? panelId : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => setPicked(k)}
                className={cn(TAB, on ? TAB_ON : TAB_OFF)}
              >
                <span className="text-md font-semibold">{KIND_LABEL[k]}</span>
                <span className="text-sm tabular-nums text-text-secondary">{fromLine(lowest(k))}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="m-0 text-md font-semibold text-text-primary">{KIND_LABEL[kind]}</p>
      )}

      <div
        id={panelId}
        role={tabbed ? "tabpanel" : undefined}
        aria-labelledby={tabbed ? tabId(kind) : undefined}
        className="flex flex-col gap-5"
      >
        <p className="m-0 text-sm text-text-secondary">{helperLineOf(kind, project.name)}</p>
        {ofKind.map((g) => (
          <ScopeGroup
            key={g.productId}
            group={g}
            folded={fold && !isProjectScope(g.productId)}
            titled={ofKind.length > 1 || !isProjectScope(g.productId)}
            project={project}
            view={view}
            viewer={viewer}
            buyerId={buyerId}
            announce={announce}
          />
        ))}
      </div>
    </section>
  );
}

/** One scope's rows under its subhead; folded, one line that opens them in place. */
function ScopeGroup({
  group,
  folded,
  titled,
  project,
  view,
  viewer,
  buyerId,
  announce,
}: {
  group: Group;
  folded: boolean;
  titled: boolean;
  project: SlotProps["project"];
  view: SlotProps["view"];
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId | null;
  announce: (m: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const whole = isProjectScope(group.productId);
  const n = group.tracks.length;
  const list = (
    <ul
      id={listId}
      role="list"
      aria-label={whole ? "Copies of the whole project" : `Copies of ${group.name}`}
      className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-solid border-border p-0"
    >
      {group.tracks.map((t) => (
        <CopyRow
          key={t.id}
          track={t}
          scopeName={whole ? "whole project" : group.name}
          project={project}
          view={view}
          viewer={viewer}
          buyerId={buyerId}
          announce={announce}
        />
      ))}
    </ul>
  );
  if (folded) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex min-h-[40px] items-center justify-between gap-4 rounded-lg border border-solid border-border bg-bg-surface px-5 py-3 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          <span className="min-w-0 text-md text-text-primary">
            <span className="font-semibold">{group.name}</span>
            <span className="tabular-nums text-text-secondary">{` · ${n} ${n === 1 ? "offer" : "offers"} · ${fromLine(lowestOf(group.tracks))}`}</span>
          </span>
          <span aria-hidden className={cn("inline-flex shrink-0 transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}>
            <Icon icon={ArrowDown01Icon} size={16} />
          </span>
        </button>
        {open && list}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {titled &&
        (whole ? (
          <h4 className="m-0 text-sm font-semibold text-text-secondary">Whole project</h4>
        ) : (
          <h4 className="m-0">
            <Link href={`/marketplace/${project.id}/products/${group.productId}`} className={cn(LINK, TAP)}>
              {group.name}
            </Link>
          </h4>
        ))}
      {list}
    </div>
  );
}

/** One offer as one row: mark, name, price, sold bar, activity, and a small Buy. */
function CopyRow({
  track,
  scopeName,
  project,
  view,
  viewer,
  buyerId,
  announce,
}: {
  track: Listed;
  scopeName: string;
  project: SlotProps["project"];
  view: SlotProps["view"];
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId | null;
  announce: (m: string) => void;
}) {
  const card = trackCardOf(track, view.sales);
  const name = `${KIND_LABEL[track.kind]} · ${USE_LABEL[track.use]}`;
  const oneTier = track.listing.extended === track.listing.regular;
  const price = (t: EditionTier) => formatAmount(t === "regular" ? track.listing.regular : track.listing.extended, track.listing.token);
  const share = card.total ? Math.min(100, Math.round((card.sold / card.total) * 100)) : 0;
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      <span
        aria-hidden
        className="mt-[2px] inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]"
      >
        <Icon icon={track.kind === "physical" ? PackageIcon : CubeIcon} size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="break-words text-md font-semibold text-text-primary">{name}</span>
        {/* One price; or "From" with Buy's dialog to choose; a preview, with no Buy, names both. */}
        <span className="text-md tabular-nums text-text-primary">
          {oneTier
            ? price("extended")
            : buyerId
              ? `From ${price("regular")}`
              : `${TIER_WORD.regular} ${price("regular")} · ${TIER_WORD.extended} ${price("extended")}`}
        </span>
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-[4px] w-[48px] shrink-0 overflow-hidden rounded-full bg-[var(--color-border-default)]">
            <span className="block h-full rounded-full bg-[var(--color-icon-secondary)]" style={{ width: `${share}%` }} />
          </span>
          <span className="text-sm tabular-nums text-text-secondary">
            {card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}
          </span>
        </span>
        <CopyActivity project={project} track={track} sales={view.sales} />
      </div>
      {buyerId && !card.soldOut && (
        <BuyCopy
          project={project}
          view={view}
          viewer={viewer}
          buyerId={buyerId}
          track={track}
          name={name}
          scopeName={scopeName}
          oneTier={oneTier}
          price={price}
          available={card.total - card.sold}
          announce={announce}
        />
      )}
    </li>
  );
}

/** The row's small Buy: straight to the wallet with one price; with two, a dialog asks which first. */
function BuyCopy({
  project,
  view,
  viewer,
  buyerId,
  track,
  name,
  scopeName,
  oneTier,
  price,
  available,
  announce,
}: {
  project: SlotProps["project"];
  view: SlotProps["view"];
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId;
  track: Listed;
  name: string;
  scopeName: string;
  oneTier: boolean;
  price: (t: EditionTier) => string;
  available: number;
  announce: (m: string) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId });
  const holds = useCheckoutHolds();
  const [choosing, setChoosing] = React.useState(false);
  const [tier, setTier] = React.useState<EditionTier>("regular");
  const heldId = React.useId();
  const groupName = React.useId();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  // The dialog opens on the price that is picked, the one the row's "From" showed.
  const pickedRef = React.useRef<HTMLInputElement>(null);
  if (!can(viewer, "listing.buy", { ...view.canCtx, listingLive: true })) return null;
  const busy = busyId === track.id;
  const held = checkoutBlocks(holds.others(track.id), available);
  const scopeLine = scopeName === "whole project" ? `${project.name}, the whole project` : scopeName;
  const go = async (t: EditionTier) => {
    if (busy) return;
    setChoosing(false);
    // The wallet dialog reads its opener: the row's Buy, back in focus once this dialog is gone.
    buttonRef.current?.focus();
    const done = await buy(track, t);
    if (done) announce(done);
  };
  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <Button
        ref={buttonRef}
        type="button"
        hierarchy="secondary"
        size="md"
        className={cn(TAP, held && "cursor-not-allowed opacity-60")}
        aria-label={oneTier ? `Buy ${name}, ${scopeName}, for ${price("extended")}` : `Buy ${name}, ${scopeName}, from ${price("regular")}`}
        aria-haspopup={oneTier ? undefined : "dialog"}
        // Not `disabled`: that drops its focus before the wallet dialog reads its opener.
        aria-disabled={busy || held || undefined}
        aria-describedby={held ? heldId : undefined}
        onClick={(e) => {
          if (busy || held) return;
          // Safari doesn't focus a clicked button.
          e.currentTarget.focus();
          if (oneTier) void go("extended");
          else setChoosing(true);
        }}
      >
        Buy
      </Button>
      {held && (
        <p id={heldId} className="m-0 max-w-[160px] text-right text-sm text-text-secondary">
          {IN_CHECKOUT_BUYER_LINE}
        </p>
      )}
      {!oneTier && (
        <ModalFrame
          open={choosing}
          onClose={() => setChoosing(false)}
          title={name}
          description={`${scopeLine}. Choose This version, or With future updates to get every new version too.`}
          size="sm"
          sheet
          initialFocus={pickedRef}
          footer={
            <Button type="button" hierarchy="primary" size="lg" className="w-full" onClick={() => void go(tier)}>
              {`Buy now · ${price(tier)}`}
            </Button>
          }
        >
          <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
            <legend className="sr-only">{`${name}: choose`}</legend>
            {TIERS.map((t) => {
              const on = tier === t;
              return (
                <label
                  key={t}
                  className={cn(
                    "relative flex min-h-[44px] cursor-pointer items-start gap-4 rounded-lg border border-solid px-5 py-4 transition-colors duration-fast motion-reduce:transition-none",
                    on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface hover:bg-bg-subtle",
                  )}
                >
                  <input
                    ref={on ? pickedRef : undefined}
                    type="radio"
                    name={groupName}
                    checked={on}
                    onChange={() => setTier(t)}
                    className="peer sr-only"
                  />
                  <Radio checked={on} decorative size="sm" className="mt-[2px] peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-md font-semibold text-text-primary">{TIER_WORD[t]}</span>
                    <span className="text-md text-text-secondary">{TIER_HELP[t]}</span>
                  </span>
                  <span className="shrink-0 text-md font-semibold tabular-nums text-text-primary">{price(t)}</span>
                </label>
              );
            })}
          </fieldset>
        </ModalFrame>
      )}
    </div>
  );
}

/** A copy's activity line: its newest sale, else its newest entry, else when it was listed (the phone's words). */
function CopyActivity({ project, track, sales }: { project: SlotProps["project"]; track: Listed; sales: Sale[] }) {
  const { record } = useJourney(project.id);
  const sale = sales
    .filter((s) => s.item.nft !== "main" && s.item.trackId === track.id)
    .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, project.id, { kind: track.kind, scope: track.productId })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(track.listing.listedAt)}`;
  return <span className="text-sm text-text-tertiary">{line}</span>;
}
