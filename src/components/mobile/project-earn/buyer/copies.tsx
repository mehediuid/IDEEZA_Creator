"use client";

// A copy tab of the phone's buy box on the maker's own listing (market-screen.tsx) and its Preview as
// buyer (preview-screen.tsx): the whole project's Physical NFT or Virtual NFT (the web's copy-panel.tsx
// on a phone, CL-018 / CL-036). Only the whole project's copies: a product's own copies are sold on that
// product's screen. Since 2026-11-22 (owner, "Yes, build A" on study Uq1VPBrq9Jjez6jeWwEkjz: the bar's
// Buy now bought the Main NFT even with a copy on screen, and every row had a Buy of its own) the buyer
// chooses first, then the bar buys what is chosen (buy-pick.tsx). Per kind:
// · the kind and what it gets you, said once (KindHead: helperLineOf; a Physical NFT's ⓘ says the units
//   each copy lets you make), then "Each with its own NFT.";
// · Use: Personal use and Business use as radio rows, always both (owner 2026-11-16), each with its
//   price, a thin sold bar with "n of N sold" and " · you own n" (the copies held now: a copy sold on is
//   its new holder's) and the activity line. One price per use, the listing's Price (no version sheet,
//   owner 2026-11-15). A use the creator didn't list reads "Not on sale", a sold-out one "Sold out"; both
//   stay, greyed, and can't be picked. While every unit left is in another checkout, the row says
//   "Someone is buying this now. Try again in a few minutes." and the bar's Buy now waits (CL-016);
// · From holders (holder-offers.tsx), choices of the same group, when someone sells one on;
// · NFT details (BUY-7, the web's folded facts): one row that opens a sheet with the picked use's copies,
//   royalties, minting, chain and collection, and what Royalties and Lazy mean;
// · the screen's foot (the wallet line and the Testnet demo line).
// No row has a Buy: the bar's one Buy now buys the picked choice. A preview reads the same rows and
// prices, pickable, with no holders, no wallet and no bar. Only the lock (sold in full) hides the uses.

import * as React from "react";
import { ViewIcon } from "@hugeicons/core-free-icons";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useWalletRequest, WalletRequestScope, type WalletRequestApi } from "@/components/wallet/wallet-provider";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { editionChainOf, trackCardOf, tracksOf } from "@/lib/market/editions";
import { readMarketNow } from "@/lib/market/market-store";
import { plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import type { Resale } from "@/lib/market/resales";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { listingUnitsLine } from "@/lib/market/units";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type EditionUse, type Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { Network } from "@/lib/brief/types";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { ListCard, ListRow } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
import { FactRows, InfoButton } from "../parts";
import { T } from "../../type";
import { Choice, ChoiceGroup, titled } from "./buy-pick";
import { heldCopiesOf } from "./held";
import { HolderChoice } from "./holder-offers";
import type { BoxFact, DoneFacts } from "./parts";

const USES: EditionUse[] = ["private", "commercial"];

/** A creator's listed copy track. */
export type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** One use of one kind as a choice of the box: the creator's listing of it, or why it can't be bought. */
export type UseChoiceOf = {
  type: "use";
  key: string;
  tab: EditionKind;
  use: EditionUse;
  /** The creator's listing of this use; null when it isn't on sale. */
  track: Listed | null;
  /** Can be picked (listed and not sold out). */
  open: boolean;
  /** Said in the price's place when it can't be picked. */
  aside: "Not on sale" | "Sold out" | null;
  /** Every unit left is in another checkout: its Buy now waits (CL-016). */
  held: boolean;
};

/** Another holder's copy as a choice of the box. */
export type HolderChoiceOf = { type: "holder"; key: string; tab: EditionKind; open: boolean; resale: Resale };

/** A kind's two uses, Personal use first, as choices: listed, sold out or not on sale (none listed while
 *  the project is sold in full). `othersIn` counts another checkout's holds on a track (none in a preview). */
export function copyUseChoicesOf(view: ProjectView, kind: EditionKind, othersIn: (trackId: string) => number): UseChoiceOf[] {
  const offers = view.lock !== null ? [] : tracksOf(PROJECT_SCOPE, view.editions).filter((t): t is Listed => t.kind === kind && t.listing !== null);
  return USES.map((use): UseChoiceOf => {
    const key = `use:${use}`;
    const track = offers.find((t) => t.use === use) ?? null;
    if (!track) return { type: "use", key, tab: kind, use, track: null, open: false, aside: "Not on sale", held: false };
    const card = trackCardOf(track, view.sales);
    const held = !card.soldOut && checkoutBlocks(othersIn(track.id), card.total - card.sold);
    return { type: "use", key, tab: kind, use, track, open: !card.soldOut, aside: card.soldOut ? "Sold out" : null, held };
  });
}

const BuyTitle = React.createContext<(title: string | null) => void>(() => {});

/** The wallet requests under it in the owner's licence words (Personal use / Business use), titled with
 *  what the box buys (D4) while a title is set — a buy sets it (`useBuyTitle`) right before it asks the
 *  wallet and clears it once the request is on its way. */
export function BuyWordsScope({ children }: { children: React.ReactNode }) {
  const api = useWalletRequest();
  const titleRef = React.useRef<string | null>(null);
  const scoped = React.useMemo<WalletRequestApi>(() => ({ ...api, request: (req, opts) => api.request(titled(withUseWords(req), titleRef.current), opts) }), [api]);
  const setTitle = React.useCallback((title: string | null) => {
    titleRef.current = title;
  }, []);
  return (
    <WalletRequestScope api={scoped}>
      <BuyTitle.Provider value={setTitle}>{children}</BuyTitle.Provider>
    </WalletRequestScope>
  );
}

/** Sets (or clears) the title BuyWordsScope gives the next wallet request. */
export function useBuyTitle(): (title: string | null) => void {
  return React.useContext(BuyTitle);
}

/** What Purchase successful says about a copy just bought: the sentence, its transaction and what was paid. */
export function doneFactsOf(sentence: string, projectId: string, buyerId: DemoBuyerId, trackId: string): DoneFacts {
  const sale =
    readMarketNow()
      .sales.filter((s) => s.projectId === projectId && s.buyerId === buyerId && s.listingId === trackId)
      .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null) ?? null;
  return {
    sentence: plainUseWords(sentence).replace(/^Purchase successful\.\s*/, ""),
    transaction: sale?.txHash ?? null,
    paid: sale ? `${formatAmount(sale.price, sale.token)} (+ ${formatAmount(sale.fees.network.amount, sale.fees.network.coin)} network fee)` : null,
  };
}

/** A copy tab's panel: what the kind gets you, its Use choices, other holders' copies, then the foot. */
export function CopyPanel({
  project,
  view,
  kind,
  uses,
  holders,
  buyerId,
  pickedKey,
  onPick,
  foot,
}: {
  project: ManualProject;
  view: ProjectView;
  kind: EditionKind;
  uses: readonly UseChoiceOf[];
  holders: readonly HolderChoiceOf[];
  /** The active demo buyer; null in a preview, which lists no holders. */
  buyerId: DemoBuyerId | null;
  pickedKey: string | null;
  onPick: (c: UseChoiceOf | HolderChoiceOf) => void;
  foot?: React.ReactNode;
}) {
  const name = `bv-pick-${kind}`;
  // The facts are the picked use's, else the first that can be bought (the web's copy tab).
  const picked = uses.find((c) => c.key === pickedKey && c.track)?.track ?? uses.find((c) => c.open)?.track ?? uses.find((c) => c.track)?.track ?? null;
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  return (
    <>
      <KindHead id={`bv-copies-${kind}`} kind={kind} name={project.name} />
      <p className={T.meta}>Each with its own NFT.</p>
      <ChoiceGroup label="Use">
        {uses.map((c) => (
          <CopyUseChoice key={c.key} project={project} view={view} choice={c} buyerId={buyerId} name={name} checked={pickedKey === c.key} onSelect={() => onPick(c)} />
        ))}
      </ChoiceGroup>
      {buyerId && holders.length > 0 && (
        <ChoiceGroup
          label={`From holders · ${holders.length}`}
          note={`Copies others bought and sell on. You get the copy, its licence${kind === "physical" ? " and its units left" : ""}; the creator still gets a royalty.`}
        >
          {holders.map((c) => (
            <HolderChoice key={c.key} resale={c.resale} buyerId={buyerId} name={name} checked={pickedKey === c.key} onSelect={() => onPick(c)} />
          ))}
        </ChoiceGroup>
      )}
      {picked && chain && <NftDetailsRow offer={`${KIND_LABEL[kind]} · ${USE_LABEL[picked.use]}`} facts={copyFactsOf(picked, view.sales, chain)} />}
      {foot}
    </>
  );
}

/** The web's words under a copy's NFT details (copy-panel.tsx, sample-offer-box.tsx). */
export const COPY_FACTS_NOTE = "Royalties are a share of resales, if marketplaces honour them. Lazy: the token is minted when you buy.";

/** A creator's listed copy as the web's NFT details read it (copy-panel.tsx): Copies, Royalties, Minting, Chain,
 *  Collection. */
export function copyFactsOf(track: Listed, sales: readonly Sale[], chain: { network: Network; collection: string }): BoxFact[] {
  const card = trackCardOf(track, [...sales]);
  return [
    { label: "Copies", value: `${card.total}` },
    { label: "Royalties", value: `${track.listing.royaltyPct}%` },
    { label: "Minting", value: "Lazy" },
    { label: "Chain", value: networkLabelOf(chain.network) },
    { label: "Collection", value: chain.collection || "—" },
  ];
}

/** BUY-7 · NFT details on a copy tab (the web folds them under its choices): one row — the royalty, which comes out
 *  of the price if the copy is sold on, and the chain — that opens a sheet with every fact of `offer` and what
 *  Royalties and Lazy mean. */
export function NftDetailsRow({ offer, facts, note = COPY_FACTS_NOTE }: { offer: string; facts: readonly BoxFact[]; note?: string }) {
  const [open, setOpen] = React.useState(false);
  const meta = facts
    .filter((f) => f.label === "Royalties" || f.label === "Chain")
    .map((f) => (f.label === "Royalties" ? `Royalties ${f.value}` : f.value))
    .join(" · ");
  return (
    <>
      <ListCard label="NFT details">
        <ListRow icon={ViewIcon} title="NFT details" meta={meta || undefined} onClick={() => setOpen(true)} />
      </ListCard>
      <Sheet open={open} onClose={() => setOpen(false)} title="NFT details" description={offer}>
        <div className="flex flex-col gap-4 pb-8">
          <FactRows label="NFT details" rows={facts} />
          <p className={T.meta}>{note}</p>
        </div>
      </Sheet>
    </>
  );
}

/** One use as a radio row: its price, how many are sold (and held by this buyer now), its activity. */
function CopyUseChoice({
  project,
  view,
  choice,
  buyerId,
  name,
  checked,
  onSelect,
}: {
  project: ManualProject;
  view: ProjectView;
  choice: UseChoiceOf;
  buyerId: DemoBuyerId | null;
  name: string;
  checked: boolean;
  onSelect: () => void;
}) {
  const resales = useResales();
  const track = choice.track;
  const label = USE_LABEL[choice.use];
  if (!track) return <Choice name={name} checked={false} disabled onSelect={onSelect} title={label} price="" aside="Not on sale" />;
  const card = trackCardOf(track, view.sales);
  // Held now: a copy sold on is its new holder's.
  const owned = buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.trackId === track.id).length : 0;
  const soldLine = `${card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}${owned > 0 ? ` · you own ${owned}` : ""}`;
  return (
    <Choice
      name={name}
      checked={checked && choice.open}
      disabled={!choice.open}
      onSelect={onSelect}
      title={label}
      price={formatAmount(track.listing.regular, track.listing.token)}
      aside={choice.aside ?? undefined}
    >
      <SoldBar share={card.total ? Math.round((card.sold / card.total) * 100) : 0} line={soldLine} />
      <CopyActivity project={project} track={track} sales={view.sales} />
      {choice.held && <span className={T.caption}>{IN_CHECKOUT_BUYER_LINE}</span>}
    </Choice>
  );
}

/** "Physical NFT", what it gets you in one line, and (Physical) the units a copy allows behind ⓘ. */
export function KindHead({ id, kind, name }: { id: string; kind: EditionKind; name: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h4 id={id} className={cn(T.rowTitle, "min-w-0 flex-1")}>
          {KIND_LABEL[kind]}
        </h4>
        {kind === "physical" && (
          <InfoButton title={KIND_LABEL.physical} label="Units a Physical NFT lets you make">
            <p className={cn(T.body, "text-text-primary")}>{listingUnitsLine()}</p>
          </InfoButton>
        )}
      </div>
      <p className={T.meta}>{helperLineOf(kind, name)}</p>
    </div>
  );
}

/** A thin sold bar and its line ("3 of 50 sold · you own 1"). */
export function SoldBar({ share, line }: { share: number; line: string }) {
  return (
    <span className="flex items-center gap-3">
      <span aria-hidden className="h-[4px] w-[56px] shrink-0 overflow-hidden rounded-full bg-[var(--color-border-default)]">
        <span className="block h-full rounded-full bg-bg-brand" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
      </span>
      <span className={cn(T.caption, "tabular-nums")}>{line}</span>
    </span>
  );
}

/** A copy's newest sale in the web's words ("Bought by Leo · 0.02 ETH · Nov 20, 2026"); null before its first. */
export function copySaleLineOf(track: Listed, sales: readonly Sale[]): string | null {
  const sale = sales.filter((s) => s.item.nft !== "main" && s.item.trackId === track.id).reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  return sale ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}` : null;
}

/** The newest sale of a copy, alone, under its use (the product's Buy a copy, BUY-10: its own activity line stays
 *  under the uses); nothing before its first sale. */
export function CopySaleLine({ track, sales }: { track: Listed; sales: readonly Sale[] }) {
  const line = copySaleLineOf(track, sales);
  return line ? <span className={cn(T.caption, "tabular-nums")}>{line}</span> : null;
}

/** A copy's activity line: its newest sale, else its newest entry, else when it was listed. */
function CopyActivity({ project, track, sales }: { project: ManualProject; track: Listed; sales: Sale[] }) {
  const { record } = useJourney(project.id);
  const entry = historyOf(record, project.id, { kind: track.kind, scope: track.productId })[0] ?? null;
  const line =
    copySaleLineOf(track, sales) ??
    (entry ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}` : `No activity yet · listed ${formatDate(track.listing.listedAt)}`);
  return <span className={T.caption}>{line}</span>;
}
