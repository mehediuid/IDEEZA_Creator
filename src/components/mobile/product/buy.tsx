"use client";

// Buying a copy of this product (Product Details 10h, 23a–23h; decision D1:
// the sticky bar is the one buy path). The web's product Marketplace box
// (copy-panel.tsx with this product's scope, CL-018 / CL-036) and purchase
// (purchase-dialog.tsx `useEditionPurchase`), on the phone's sheets. Only this
// product's own copies: the whole project's are sold on the project's screen.
// - the bar: "Copies from {lowest}" and Buy a copy; once this demo buyer holds
//   one now, "You own copy #n" and See your files (23d) — a copy they sold on
//   is someone else's (resales.ts), one bought from a holder is theirs; a
//   preview reads it with Buy switched off (31a);
// - Buy a copy (23a): a card per kind on sale, Physical first — what it gets
//   you (and the units a Physical copy lets you make), then Use: Personal use
//   and Business use, always both, each with its own price (a use the creator
//   didn't list reads "Not on sale", a sold-out one "Sold out"; both greyed,
//   never picked), "n of N sold · you own n", Buy now · price (sold out: "All
//   N are sold."; every unit left in another checkout: greyed, with "Someone is
//   buying this now. Try again in a few minutes."), the copies' activity line.
//   No version choice (owner 2026-11-15): one price per use, the listing's
//   Price (`versionless`). Under each card, From holders (CL-036);
// - Confirm purchase is the demo wallet's own request, as a bottom sheet
//   (the Shared kit's wallet sheet: review, waiting, confirming; you
//   cancelled / didn't go through say "Nothing changed."), with the web's
//   rows and re-checks — sold out, taken off, the price changed, sold in
//   full (23e–23h);
// - Purchase successful (23c): what was minted to whose demo wallet, the
//   transaction and what was paid, and See your files.
// "Shop as someone else" switches the demo buyer (Mira, Leo, Sam), the web's
// "Shopping as".
// One set of words for a copy on every step — the card, the wallet's request,
// the success line, the owned bar: "Personal use" / "Business use" (`USE_LABEL`).

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useEditionPurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { historyOf, labelOf, ageOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, trackCardOf } from "@/lib/market/editions";
import { lowestOf } from "@/lib/market/market-list";
import { readMarketNow } from "@/lib/market/market-store";
import { plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse, Sale } from "@/lib/market/types";
import { listingUnitsLine } from "@/lib/market/units";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_CARD } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { heldCopiesOf } from "../project-earn/buyer/held";
import { HolderOffers, useHolderListings } from "../project-earn/buyer/holder-offers";
import type { DoneFacts } from "../project-earn/buyer/parts";
import { T } from "../type";
import { useListedCopies } from "./overview";
import { BANNER_LINK, FactCard } from "./parts";
import { useProduct } from "./use-product";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];

/** The copies of this product the active demo buyer holds now, newest first (a copy sold on is its new holder's). */
function useHeldCopies() {
  const { view, product, buyerId } = useProduct();
  const resales = useResales();
  return React.useMemo(
    () => (buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.productId === product.id) : []),
    [view.sales, buyerId, resales, product.id],
  );
}

/** Other holders' listings of this product's own copies that the active buyer could buy, of the kinds the
 *  creator lists (each sits under its kind, as in the web's tabs). */
function useOthersListings(tracks: readonly Listed[]) {
  const { project, name, buyerId } = useProduct();
  const physical = useHolderListings(project.id, "physical", name);
  const virtual = useHolderListings(project.id, "virtual", name);
  return [...physical, ...virtual].filter((r) => r.sellerId !== buyerId && tracks.some((t) => t.kind === r.kind));
}

/** The sticky bar on the buyer's side (10h, 23d, 31a); null when nothing of it is on sale. */
export function BuyBar({ onBuy, onFiles }: { onBuy: () => void; onFiles: () => void }) {
  const { view, viewer } = useProduct();
  const tracks = useListedCopies();
  const held = useHeldCopies();
  const others = useOthersListings(tracks);
  const open = tracks.filter((t) => !trackCardOf(t, view.sales).soldOut).map((t) => ({ amount: t.listing.regular, token: t.listing.token }));
  const from = lowestOf([...open, ...others.map((r) => ({ amount: r.price, token: r.token }))]);
  const latest = held[0] ?? null;
  if (latest) {
    const kinds = KINDS.map((k) => ({ k, n: held.filter((s) => s.item.nft === k).length })).filter((x) => x.n > 0);
    return (
      <BottomBar className="flex-row items-center gap-6 pt-6">
        {/* 23d: the small line says it is yours, the main line which copy; both wrap at 320. */}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>{held.length === 1 ? `You own copy #${latest.item.serial}` : `You own ${held.length} copies`}</span>
          <span className={T.rowTitle}>
            {held.length === 1
              ? `${KIND_LABEL[latest.item.nft]} · ${USE_LABEL[latest.item.use]}`
              : kinds.map((x) => `${KIND_LABEL[x.k]} ×${x.n}`).join(" · ")}
          </span>
        </span>
        <Button size="xl" onClick={onFiles}>
          See your files
        </Button>
      </BottomBar>
    );
  }
  if (!from) return null;
  const canBuy = can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  return (
    <BottomBar className="gap-2 pt-6">
      <div className="flex items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>Copies from</span>
          <span className={cn(T.section, "tabular-nums")}>{formatAmount(from.amount, from.token)}</span>
        </span>
        <Button size="xl" className="min-w-0 flex-1" disabled={!canBuy} onClick={onBuy}>
          Buy a copy
        </Button>
      </div>
      {!canBuy && <p className={T.meta}>{PREVIEW_BUY_OFF}</p>}
    </BottomBar>
  );
}

/** Why Buy is off in the owner's preview (31a) — on the bar and on a piece's footer. */
export const PREVIEW_BUY_OFF = "Buying is off in a preview — this is how buyers see it.";

/** 23a–23c: Buy a copy, the wallet's confirm and Purchase successful. */
export function BuyCopy({ open, onClose, onFiles }: { open: boolean; onClose: () => void; onFiles: () => void }) {
  const { project, view, viewer, product, name, buyerId } = useProduct();
  const tracks = useListedCopies();
  const wallet = useWalletSheet();
  // The web purchase's words for a copy ("Private use"), said in the phone's ("Personal use").
  const request: typeof wallet.request = (req, handlers) => wallet.request(withUseWords(req), handlers);
  const purchase = useEditionPurchase({ project, view, buyerId: buyerId ?? "buyer-mira", request, versionless: true });
  const [done, setDone] = React.useState<DoneFacts | null>(null);
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  const canBuy = buyerId !== null && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  const kinds = KINDS.filter((k) => tracks.some((t) => t.kind === k));

  // A refusal is the wallet sheet's to say (cancelled, didn't go through); this sheet stays for another try.
  const buy = async (t: Listed, tier: EditionTier) => {
    const line = await purchase.buy(t, tier);
    if (!line || !buyerId) return;
    const sale =
      readMarketNow()
        .sales.filter((s) => s.projectId === project.id && s.buyerId === buyerId && s.listingId === t.id)
        .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null) ?? null;
    setDone({
      sentence: plainUseWords(line).replace(/^Purchase successful\.\s*/, ""),
      transaction: sale?.txHash ?? null,
      paid: sale ? `${formatAmount(sale.price, sale.token)} (+ ${formatAmount(sale.fees.network.amount, sale.fees.network.coin)} network fee)` : null,
    });
  };

  return (
    <>
      <Sheet
        open={open && !wallet.busy && done === null}
        onClose={onClose}
        title="Buy a copy"
        description={`${name} · each copy is its own NFT, not the project.`}
      >
        <div className="flex flex-col gap-6 pb-8">
          <div className="flex">
            <TestnetDemoBadge />
          </div>
          {chain &&
            kinds.map((k) => (
              <div key={k} className="flex flex-col gap-4">
                <KindCard kind={k} tracks={tracks.filter((t) => t.kind === k)} busyId={purchase.busyId} canBuy={canBuy} onBuy={(t, tier) => void buy(t, tier)} />
                {buyerId && <HolderOffers projectId={project.id} kind={k} product={name} request={request} onBought={setDone} />}
              </div>
            ))}
          {!kinds.length && <p className={T.body}>{`No copies of ${product.name} are on sale right now.`}</p>}
        </div>
      </Sheet>
      {wallet.sheet}
      <Sheet
        open={done !== null}
        onClose={() => {
          setDone(null);
          onClose();
        }}
        title="Purchase successful"
        actions={
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              setDone(null);
              onClose();
              onFiles();
            }}
          >
            See your files
          </Button>
        }
      >
        {done && (
          <div className="flex flex-col gap-6 pb-4">
            <p className={cn(T.body, "flex items-start gap-4 text-text-primary")}>
              <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-success)]">
                <Icon icon={CheckmarkCircle02Icon} size={20} />
              </span>
              {done.sentence}
            </p>
            {(done.transaction || done.paid) && (
              <FactCard
                rows={[
                  ...(done.transaction ? [["Transaction", `${shortAddress(done.transaction)} · Demo`] as const] : []),
                  ...(done.paid ? [["Paid", done.paid] as const] : []),
                ]}
              />
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** One kind of this product's copies: what it gets you, its two Use rows, the picked use's sold line, Buy now. */
function KindCard({
  kind,
  tracks,
  busyId,
  canBuy,
  onBuy,
}: {
  kind: EditionKind;
  tracks: Listed[];
  busyId: string | null;
  canBuy: boolean;
  onBuy: (t: Listed, tier: EditionTier) => void;
}) {
  const { project, view, product, name, buyerId } = useProduct();
  const resales = useResales();
  const holds = useCheckoutHolds();
  const heldId = React.useId();
  const groupId = React.useId();
  const firstOpen = tracks.find((t) => !trackCardOf(t, view.sales).soldOut) ?? null;
  const [picked, setPicked] = React.useState<string | null>(null);
  const track = tracks.find((t) => t.id === picked && !trackCardOf(t, view.sales).soldOut) ?? firstOpen ?? tracks[0];
  const card = trackCardOf(track, view.sales);
  // The listing's Price; where "Price with future updates" was left empty (the same price), the updates come with it.
  const tier: EditionTier = track.listing.regular === track.listing.extended ? "extended" : "regular";
  const price = formatAmount(track.listing.regular, track.listing.token);
  const owned = buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.trackId === track.id).length : 0;
  const held = !card.soldOut && checkoutBlocks(holds.others(track.id), card.total - card.sold);
  const busy = busyId === track.id;
  const title = KIND_LABEL[kind];
  return (
    <section aria-label={title} className={cn(LIST_CARD, "gap-4 p-6")}>
      <div className="flex flex-col gap-1">
        <span className={T.name}>{title}</span>
        <span className={T.meta}>{helperLineOf(kind, name)}</span>
        {kind === "physical" && <span className={T.meta}>{listingUnitsLine()}</span>}
      </div>
      <div role="radiogroup" aria-labelledby={groupId} className="flex flex-col gap-3">
        <span id={groupId} className={T.label}>
          Use
        </span>
        {USES.map((use) => {
          const t = tracks.find((x) => x.use === use) ?? null;
          const soldOut = t ? trackCardOf(t, view.sales).soldOut : false;
          const off = !t || soldOut;
          const on = !off && t?.id === track.id;
          return (
            <label
              key={use}
              className={cn(
                "relative flex min-h-[44px] items-center gap-4 rounded-md border-[length:var(--border-width-1)] border-solid px-6 py-4",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
                off ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name={`use-${product.id}-${kind}`}
                className="peer sr-only"
                checked={on}
                disabled={off}
                onChange={() => t && setPicked(t.id)}
              />
              <Radio checked={on} decorative size="sm" className="peer-focus-visible:ring-2 peer-focus-visible:ring-border-focus" />
              <span className={cn(T.rowTitle, "min-w-0 flex-1")}>{USE_LABEL[use]}</span>
              <span className={cn(T.body, "shrink-0 tabular-nums")}>
                {!t ? "Not on sale" : soldOut ? "Sold out" : formatAmount(t.listing.regular, t.listing.token)}
              </span>
            </label>
          );
        })}
      </div>
      <span className={cn(T.meta, "tabular-nums")}>
        {`${card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}${owned > 0 ? ` · you own ${owned}` : ""}`}
      </span>
      {card.soldOut ? (
        <p className={T.body}>All {card.total} are sold.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            size="xl"
            className={cn("w-full", held && "cursor-not-allowed opacity-60")}
            loading={busy}
            disabled={!canBuy}
            // Held: not `disabled`, so it keeps its focus; pressing it does nothing (CL-016).
            aria-disabled={held || undefined}
            aria-describedby={held ? heldId : undefined}
            onClick={() => {
              if (!busy && !held) onBuy(track, tier);
            }}
          >
            {`Buy now · ${price}`}
          </Button>
          {held && (
            <p id={heldId} className={T.meta}>
              {IN_CHECKOUT_BUYER_LINE}
            </p>
          )}
        </div>
      )}
      <CopiesLine projectId={project.id} track={track} productId={product.id} />
    </section>
  );
}

/** "No activity yet · listed Oct 28, 2026", or the copies' newest entry: their kind's journey. */
function CopiesLine({ projectId, track, productId }: { projectId: string; track: Listed; productId: string }) {
  const { record } = useJourney(projectId);
  const now = useMinuteClock();
  const latest = historyOf(record, projectId, { kind: track.kind, scope: productId })[0] ?? null;
  return (
    <p className={T.meta}>
      {latest ? `Activity · ${labelOf(latest)} · ${ageOf(latest.createdAt, now)}` : `No activity yet · listed ${formatDate(track.listing.listedAt)}`}
    </p>
  );
}

/** The marketplace's Testnet demo banner and its "Shopping as" switch (the web's DemoBuyerBanner). */
export function DemoBuyerBanner() {
  const { buyer, setActiveBuyer } = useActiveBuyer();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Banner
        tone="attention"
        title={`Testnet demo · shopping as ${buyer.name}`}
        action={
          <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={BANNER_LINK}>
            Shop as someone else
          </button>
        }
      >
        Every listing here is yours, so a demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.
      </Banner>
      <PickSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Shopping as"
        value={buyer.id}
        options={DEMO_BUYERS.map((b) => ({ value: b.id as DemoBuyerId, label: `${b.name} · demo creator` }))}
        onPick={(id) => {
          setActiveBuyer(id);
          setOpen(false);
        }}
      />
    </>
  );
}
