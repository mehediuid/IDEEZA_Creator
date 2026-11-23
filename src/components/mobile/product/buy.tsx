"use client";

// Buying a copy of this product (Product Details 10h, 23a–23h; decision D1:
// the sticky bar is the one buy path). The web's product Marketplace box
// (copy-panel.tsx with this product's scope, CL-018 / CL-036) and purchase
// (purchase-dialog.tsx `useEditionPurchase`), on the phone's sheets. Only this
// product's own copies: the whole project's are sold on the project's screen.
// Since 2026-11-22 (owner, "Yes, build A": a Buy now must always say what it
// buys) Buy a copy is the phone's buy box (project-earn/buyer/buy-pick.tsx),
// as on the project's screens:
// - the bar: "Copies from {lowest}" and Buy a copy while any copy is on sale —
//   the creator's or another holder's — for a holder of a copy too (D6); a
//   preview reads it with Buy switched off (31a). Nothing on sale and the
//   buyer holds a copy: "You own copy #n" and See your files (23d);
// - what the buyer holds now is a row under the header (D6, OwnedCopiesRow):
//   "You own copy #n" with its kind and use, and See your files › — a copy
//   they sold on is someone else's (resales.ts), one bought from a holder is
//   theirs;
// - Buy a copy (23a): Physical NFT · Virtual NFT as tabs (the kinds this
//   product sells, or other holders sell on), opening on the kind the buyer
//   bought last, else the first with something to buy (the web's rule,
//   `openingTabOf`). A tab: what the kind gets you (and the units a Physical
//   copy lets you make), then Use: Personal use and Business use, always both,
//   each with its price and "n of N sold · you own n" (a use the creator
//   didn't list reads "Not on sale", a sold-out one "Sold out"; both greyed,
//   never picked), the copies' activity line, then From holders as choices of
//   the same group (CL-036), then NFT details — one row opening the picked
//   use's facts (BUY-7). No row has a Buy of its own. No version choice
//   (owner 2026-11-15): one price per use, the listing's Price (`versionless`);
// - the sheet's foot says what is picked and its price ("Physical NFT ·
//   Personal use", "0.02 ETH · makes 1 unit") over its one Buy now (every unit
//   left in another checkout: greyed, with "Someone is buying this now. Try
//   again in a few minutes."; a preview: greyed, with why); the buyer's own
//   holder listing: Manage;
// - Confirm purchase is the demo wallet's own request, as a bottom sheet
//   (the Shared kit's wallet sheet: review, waiting, confirming; you
//   cancelled / didn't go through say "Nothing changed."), titled with what is
//   bought (D4: "Buy Physical NFT · Personal use"), with the web's rows and
//   re-checks — sold out, taken off, the price changed, sold in full (23e–23h);
// - Purchase successful (23c): what was minted to whose demo wallet, the
//   transaction and what was paid, and See your files.
// "Shop as someone else" switches the demo buyer (Mira, Leo, Sam), the web's
// "Shopping as".
// One set of words for a copy on every step — the choice, the foot, the
// wallet's request, the success line, the owned row: "Personal use" /
// "Business use" (`USE_LABEL`).

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useEditionPurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { can } from "@/lib/manual/permissions";
import { formatDate } from "@/lib/manual/project-summary";
import { historyOf, labelOf, ageOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { buyTitleOf, copyBarLine, copyPickTitle, holderPickTitle, openingTabOf, pickedChoiceOf } from "@/lib/market/buy-pick";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, trackCardOf } from "@/lib/market/editions";
import { lowestOf } from "@/lib/market/market-list";
import { readMarketNow } from "@/lib/market/market-store";
import { plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import type { Resale } from "@/lib/market/resales";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import type { EditionKind, EditionTrack, EditionUse, Sale } from "@/lib/market/types";
import { listingUnitsLine, unitsAllowanceOf, type UnitsUse } from "@/lib/market/units";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { Chevron, LIST_ROW, ListCard } from "../kit/list";
import { PickSheet } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { tabPanelProps } from "../kit/tabs";
import { Choice, ChoiceGroup, PickTabs, titled, type BarPick } from "../project-earn/buyer/buy-pick";
import { copyFactsOf, NftDetailsRow, SoldBar } from "../project-earn/buyer/copies";
import { heldCopiesOf } from "../project-earn/buyer/held";
import { HolderChoice, holderFactsOf, useHolderBuy, useHolderListings } from "../project-earn/buyer/holder-offers";
import type { DoneFacts } from "../project-earn/buyer/parts";
import { T } from "../type";
import { useListedCopies } from "./overview";
import { BANNER_LINK, FactCard } from "./parts";
import { useProduct } from "./use-product";

type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** One thing Buy a copy can pick: a use of one kind (the creator's copies), or another holder's copy. */
type UseChoiceT = { type: "use"; key: string; kind: EditionKind; use: EditionUse; track: Listed | null; open: boolean; aside: string | null };
type HolderChoiceT = { type: "holder"; key: string; kind: EditionKind; open: boolean; resale: Resale };
type CopyChoice = UseChoiceT | HolderChoiceT;

const KINDS: EditionKind[] = ["physical", "virtual"];
const USES: EditionUse[] = ["private", "commercial"];
/** The box's tabs inside the sheet: ids apart from the page's own tabs ("pd"). */
const BOX_TABS = "pd-buy";

/** The copies of this product the active demo buyer holds now, newest first (a copy sold on is its new holder's). */
function useHeldCopies() {
  const { view, product, buyerId } = useProduct();
  const resales = useResales();
  return React.useMemo(
    () => (buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.productId === product.id) : []),
    [view.sales, buyerId, resales, product.id],
  );
}

/** This product's copies on offer: the creator's listed ones (none without the project's chain, which a
 *  purchase needs), and other holders' listings of each kind — none in a preview, where nobody buys. */
function useCopyStock() {
  const { project, view, name, buyerId } = useProduct();
  const listed = useListedCopies();
  const physical = useHolderListings(project.id, "physical", name);
  const virtual = useHolderListings(project.id, "virtual", name);
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const tracks = editionChainOf(view.mint.record, main, null) ? listed : [];
  const holdersOf = (k: EditionKind): Resale[] => (buyerId ? (k === "physical" ? physical : virtual) : []);
  return { tracks, holdersOf };
}

/** "You own copy #3" with its kind and use, or "You own 2 copies" with each kind's count; null with none. */
function ownedWordsOf(held: ReturnType<typeof useHeldCopies>): { title: string; line: string } | null {
  const latest = held[0];
  if (!latest) return null;
  if (held.length === 1) return { title: `You own copy #${latest.item.serial}`, line: `${KIND_LABEL[latest.item.nft]} · ${USE_LABEL[latest.item.use]}` };
  const kinds = KINDS.map((k) => ({ k, n: held.filter((s) => s.item.nft === k).length })).filter((x) => x.n > 0);
  return { title: `You own ${held.length} copies`, line: kinds.map((x) => `${KIND_LABEL[x.k]} ×${x.n}`).join(" · ") };
}

/** D6: what the buyer holds of this product now, under the header, with the way to its files (the Build tab);
 *  the bar keeps selling. Nothing held: no row. */
export function OwnedCopiesRow({ onFiles }: { onFiles: () => void }) {
  const owned = ownedWordsOf(useHeldCopies());
  if (!owned) return null;
  return (
    <div className="px-8 pb-8">
      <ListCard label="What you own">
        <li>
          <button type="button" onClick={onFiles} className={LIST_ROW}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn(T.rowTitle, "break-words")}>{owned.title}</span>
              <span className={cn(T.meta, "break-words tabular-nums")}>{owned.line}</span>
            </span>
            <span className={cn(T.rowTitle, "max-w-[45%] shrink-0 text-right text-text-brand")}>See your files</span>
            <Chevron className="-ml-4" />
          </button>
        </li>
      </ListCard>
    </div>
  );
}

/** The sticky bar on the buyer's side (10h, 23d, 31a); null when nothing of it is on sale and nothing is held. */
export function BuyBar({ onBuy, onFiles }: { onBuy: () => void; onFiles: () => void }) {
  const { view, viewer, buyerId } = useProduct();
  const { tracks, holdersOf } = useCopyStock();
  const owned = ownedWordsOf(useHeldCopies());
  const open = tracks.filter((t) => !trackCardOf(t, view.sales).soldOut).map((t) => ({ amount: t.listing.regular, token: t.listing.token }));
  const others = KINDS.flatMap((k) => holdersOf(k))
    .filter((r) => r.sellerId !== buyerId)
    .map((r) => ({ amount: r.price, token: r.token }));
  const from = lowestOf([...open, ...others]);
  if (!from) {
    if (!owned) return null;
    return (
      <BottomBar className="flex-row items-center gap-6 pt-6">
        {/* 23d: the small line says it is yours, the main line which copy; both wrap at 320. */}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>{owned.title}</span>
          <span className={T.rowTitle}>{owned.line}</span>
        </span>
        <Button size="xl" onClick={onFiles}>
          See your files
        </Button>
      </BottomBar>
    );
  }
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

/** Why Buy is off in the owner's preview (31a) — on the bar, in Buy a copy and on a piece's footer. */
export const PREVIEW_BUY_OFF = "Buying is off in a preview — this is how buyers see it.";

/** 23a–23c: Buy a copy, the wallet's confirm and Purchase successful. */
export function BuyCopy({ open, onClose, onFiles }: { open: boolean; onClose: () => void; onFiles: () => void }) {
  const { project, view, viewer, product, name, buyerId } = useProduct();
  const { tracks, holdersOf } = useCopyStock();
  const held = useHeldCopies();
  const holds = useCheckoutHolds();
  const log = useUnitsLog();
  const wallet = useWalletSheet();
  const [done, setDone] = React.useState<DoneFacts | null>(null);
  const [pickedTab, setPickedTab] = React.useState<EditionKind | null>(null);
  const [picks, setPicks] = React.useState<Partial<Record<EditionKind, string>>>({});
  // Holder choices exist only for a demo buyer (useCopyStock), so `me` names them; the purchase hook needs one too.
  const me: DemoBuyerId = buyerId ?? "buyer-mira";
  const canBuy = buyerId !== null && can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });

  // Both uses whenever the creator lists the kind (a use not listed or sold out stays, greyed), then other
  // holders' copies, cheapest first.
  const choicesOf = (k: EditionKind): CopyChoice[] => {
    const ofKind = tracks.filter((t) => t.kind === k);
    const uses: CopyChoice[] = ofKind.length
      ? USES.map((use) => {
          const t = ofKind.find((x) => x.use === use) ?? null;
          const soldOut = t ? trackCardOf(t, view.sales).soldOut : false;
          return { type: "use", key: `use:${use}`, kind: k, use, track: t, open: t !== null && !soldOut, aside: !t ? "Not on sale" : soldOut ? "Sold out" : null };
        })
      : [];
    const holders: CopyChoice[] = holdersOf(k).map((r) => ({ type: "holder", key: `holder:${r.id}`, kind: k, open: true, resale: r }));
    return [...uses, ...holders];
  };
  const buyable = (c: CopyChoice) => c.open && !(c.type === "holder" && c.resale.sellerId === buyerId);
  const tabs = KINDS.filter((k) => choicesOf(k).length > 0);
  const opening = openingTabOf({
    tabs,
    asked: null,
    heldKinds: [...held].reverse().map((s) => s.item.nft),
    buyable: (t) => t !== "main" && choicesOf(t).some(buyable),
  });
  const tab: EditionKind | null = pickedTab && tabs.includes(pickedTab) ? pickedTab : opening === "physical" || opening === "virtual" ? opening : null;
  const choices = tab ? choicesOf(tab) : [];
  const picked = pickedChoiceOf(choices, tab ? (picks[tab] ?? null) : null);
  const factsOf = (r: Resale) => holderFactsOf(r, me, log);

  // What the wallet sheet's title says is bought (D4).
  const buyTitle = !picked
    ? null
    : picked.type === "use"
      ? buyTitleOf({ kind: "use", copy: picked.kind, use: USE_LABEL[picked.use] })
      : (() => {
          const f = factsOf(picked.resale);
          return buyTitleOf({ kind: "holder", copy: picked.kind, number: f.number, use: f.use, seller: f.seller });
        })();
  // The web purchase's words for a copy ("Private use"), said in the phone's ("Personal use"), titled with
  // the pick. Both purchases ask the wallet straight from the press, so the pick is the one on screen.
  const request: typeof wallet.request = (req, handlers) => wallet.request(titled(withUseWords(req), buyTitle), handlers);
  const purchase = useEditionPurchase({ project, view, buyerId: me, request, versionless: true });
  const holderBuy = useHolderBuy({ request, onBought: setDone });

  // A refusal is the wallet sheet's to say (cancelled, didn't go through); this sheet stays for another try.
  const buyUse = async (t: Listed) => {
    // The listing's Price; where "Price with future updates" was left empty (the same price), the updates come with it.
    const tier: EditionTier = t.listing.regular === t.listing.extended ? "extended" : "regular";
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

  // The foot: what is picked and its price, over the one primary.
  let foot: React.ReactNode = undefined;
  if (picked?.type === "use") {
    const t = picked.track;
    const card = t ? trackCardOf(t, view.sales) : null;
    const price = t ? formatAmount(t.listing.regular, t.listing.token) : null;
    const units = picked.kind === "physical" ? unitsAllowanceOf(USE_LABEL[picked.use] as UnitsUse) : null;
    const pick: BarPick = {
      title: copyPickTitle(picked.kind, USE_LABEL[picked.use]),
      line: price ? copyBarLine(price, picked.kind, units) : (picked.aside ?? "Not on sale"),
    };
    const inCheckout = t !== null && card !== null && !card.soldOut && checkoutBlocks(holds.others(t.id), card.total - card.sold);
    // Picked but closed only when nothing in the tab can be bought (pickedChoiceOf).
    const reason = !picked.open ? (card?.soldOut ? `All ${card.total} are sold.` : null) : !canBuy ? PREVIEW_BUY_OFF : inCheckout ? IN_CHECKOUT_BUYER_LINE : null;
    foot = (
      <BuyFoot
        pick={pick}
        reason={reason}
        action={{
          kind: "button",
          busy: t !== null && purchase.busyId === t.id,
          off: !picked.open || !canBuy || inCheckout,
          run: () => {
            if (t) void buyUse(t);
          },
        }}
      />
    );
  } else if (picked?.type === "holder") {
    const r = picked.resale;
    const f = factsOf(r);
    const pick: BarPick = { title: holderPickTitle(picked.kind, f.number, f.use), line: `${f.price} · ${f.line}` };
    foot = f.mine ? (
      <BuyFoot pick={pick} reason={null} action={{ kind: "link", label: "Manage", href: f.manageHref }} />
    ) : (
      <BuyFoot
        pick={pick}
        reason={canBuy ? null : PREVIEW_BUY_OFF}
        action={{ kind: "button", busy: holderBuy.busyId === r.id, off: !canBuy, run: () => void holderBuy.buy(r, buyTitle ?? undefined) }}
      />
    );
  }

  return (
    <>
      <Sheet
        open={open && !wallet.busy && done === null}
        onClose={onClose}
        title="Buy a copy"
        description={`${name} · each copy is its own NFT, not the project.`}
        actions={foot}
      >
        <div className="flex flex-col gap-6 pb-8">
          <div className="flex">
            <TestnetDemoBadge />
          </div>
          {tab ? (
            <>
              <PickTabs
                tabs={tabs}
                value={tab}
                onChange={(t) => {
                  if (t !== "main") setPickedTab(t);
                }}
                idBase={BOX_TABS}
              />
              <div {...(tabs.length > 1 ? tabPanelProps(BOX_TABS, tab) : {})} className="flex flex-col gap-6 outline-none">
                <KindPanel
                  kind={tab}
                  named={tabs.length < 2}
                  choices={choices}
                  picked={picked}
                  onPick={(c) => setPicks((m) => ({ ...m, [c.kind]: c.key }))}
                />
              </div>
            </>
          ) : (
            <p className={T.body}>{`No copies of ${product.name} are on sale right now.`}</p>
          )}
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

/** One kind's tab: what it gets you, its two Use choices, the copies' activity, then other holders' copies.
 *  `named`: the only kind on offer, so no tab names it. */
function KindPanel({
  kind,
  named,
  choices,
  picked,
  onPick,
}: {
  kind: EditionKind;
  named: boolean;
  choices: CopyChoice[];
  picked: CopyChoice | null;
  onPick: (c: CopyChoice) => void;
}) {
  const { project, product, name, buyerId, view } = useProduct();
  const uses = choices.filter((c): c is UseChoiceT => c.type === "use");
  const holders = choices.filter((c): c is HolderChoiceT => c.type === "holder");
  const group = `use-${product.id}-${kind}`;
  // The activity of the picked use's copies, else of the first use the creator lists.
  const shown = (picked?.type === "use" ? picked.track : null) ?? uses.find((c) => c.track)?.track ?? null;
  // NFT details (BUY-7): the picked use's, else the first that can be bought — the web's copy tab.
  const detailed = (picked?.type === "use" ? picked.track : null) ?? uses.find((c) => c.open)?.track ?? shown;
  const chain = editionChainOf(view.mint.record, view.listing.kind === "none" ? null : view.listing.listing, null);
  return (
    <>
      <div className="flex flex-col gap-1">
        {named && <span className={T.name}>{KIND_LABEL[kind]}</span>}
        <p className={T.meta}>{helperLineOf(kind, name)}</p>
        {kind === "physical" && <p className={T.meta}>{listingUnitsLine()}</p>}
      </div>
      {uses.length > 0 && (
        <ChoiceGroup label="Use">
          {uses.map((c) => (
            <UseChoice key={c.key} choice={c} name={group} checked={picked?.key === c.key} onSelect={() => onPick(c)} />
          ))}
        </ChoiceGroup>
      )}
      {shown && <CopiesLine projectId={project.id} track={shown} productId={product.id} />}
      {buyerId && holders.length > 0 && (
        <ChoiceGroup
          label={`From holders · ${holders.length}`}
          note={`Copies others bought and sell on. You get the copy, its licence${kind === "physical" ? " and its units left" : ""}; the creator still gets a royalty.`}
        >
          {holders.map((c) => (
            <HolderChoice key={c.key} resale={c.resale} buyerId={buyerId} name={group} checked={picked?.key === c.key} onSelect={() => onPick(c)} />
          ))}
        </ChoiceGroup>
      )}
      {detailed && chain && <NftDetailsRow offer={`${KIND_LABEL[kind]} · ${USE_LABEL[detailed.use]}`} facts={copyFactsOf(detailed, view.sales, chain)} />}
    </>
  );
}

/** One use of one kind: its price, how many are sold and how many this buyer holds now; greyed with why
 *  ("Not on sale", "Sold out") when it can't be bought. */
function UseChoice({ choice, name, checked, onSelect }: { choice: UseChoiceT; name: string; checked: boolean; onSelect: () => void }) {
  const { view, buyerId } = useProduct();
  const resales = useResales();
  const t = choice.track;
  const card = t ? trackCardOf(t, view.sales) : null;
  // Held now: a copy sold on is its new holder's (resales.ts).
  const owned = t && buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.trackId === t.id).length : 0;
  return (
    <Choice
      name={name}
      checked={checked && choice.open}
      disabled={!choice.open}
      onSelect={onSelect}
      title={USE_LABEL[choice.use]}
      price={t ? formatAmount(t.listing.regular, t.listing.token) : ""}
      aside={choice.aside ?? undefined}
    >
      {card && (
        <SoldBar
          share={card.total ? Math.round((card.sold / card.total) * 100) : 0}
          line={`${card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}${owned > 0 ? ` · you own ${owned}` : ""}`}
        />
      )}
    </Choice>
  );
}

type FootAction = { kind: "button"; run: () => void; busy: boolean; off: boolean } | { kind: "link"; label: string; href: string };

/** The sheet's foot: the pick and its price (and why Buy waits), then Buy now — or Manage for the buyer's own
 *  listing. Buy now is described by the pick, so it says what it buys to a screen reader too. */
function BuyFoot({ pick, reason, action }: { pick: BarPick; reason: string | null; action: FootAction }) {
  const id = React.useId();
  return (
    <>
      {/* A <div>, not a <p>: the sheet lifts a bare line above its button, and this block already is. */}
      <div id={id} className="flex flex-col gap-1">
        <span className={cn(T.rowTitle, "break-words")}>{pick.title}</span>
        <span className={cn(T.meta, "tabular-nums")}>{pick.line}</span>
        {reason && <span className={T.meta}>{reason}</span>}
      </div>
      {action.kind === "link" ? (
        <Link href={action.href} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          {action.label}
        </Link>
      ) : (
        <Button
          size="xl"
          className={cn("w-full", action.off && "cursor-not-allowed opacity-60")}
          loading={action.busy}
          // Not `disabled`: that drops its focus before the wallet sheet reads its opener; pressing it does nothing (CL-016).
          aria-disabled={action.busy || action.off || undefined}
          aria-describedby={id}
          onClick={() => {
            if (!action.busy && !action.off) action.run();
          }}
        >
          Buy now
        </Button>
      )}
    </>
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
