"use client";

// 18h · Copies on sale: the whole project's Physical and Virtual NFTs under the Main NFT (the web's
// copy-panel.tsx on a phone, CL-018 / CL-036). Only the whole project's copies: a product's own copies
// are sold on that product's screen. Owner 2026-11-12 (the page read as a spreadsheet, a Buy on every
// card): one row per offer, as a product page lists its options. Per kind, Physical first:
// · the kind and what it gets you, said once (helperLineOf); a Physical NFT's ⓘ says the units each
//   copy lets you make (listingUnitsLine);
// · its two Use rows, Personal use then Business use, always both (owner 2026-11-16): a Physical or
//   Virtual mark, "Physical NFT · Personal use", the price, a thin sold bar with "n of N sold" and
//   " · you own n" (the copies held now: a copy sold on is its new holder's), the activity line, and a
//   small Buy straight to the wallet — no version sheet (owner 2026-11-15): one price per use, the
//   listing's Price (`versionless`). A use the creator didn't list reads "Not on sale", a sold-out one
//   "Sold out"; both stay, greyed. While every unit left is in another checkout, Buy waits, greyed,
//   with "Someone is buying this now. Try again in a few minutes.";
// · From holders (holder-offers.tsx), when someone sells one on.
// Buying is the web's `useEditionPurchase` through the phone's wallet sheet, in the owner's licence
// words. A preview reads the same rows and prices with no button. Only the lock (sold in full) hides them.

import * as React from "react";
import { CubeIcon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { listedKindsOf } from "@/components/marketplace/copy-panel";
import { useEditionPurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { helperLineOf } from "@/components/projects/editions/edition-block";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useWalletRequest, WalletRequestScope, type WalletRequestApi } from "@/components/wallet/wallet-provider";
import { historyOf, labelOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { checkoutBlocks, IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, trackCardOf, tracksOf } from "@/lib/market/editions";
import { readMarketNow } from "@/lib/market/market-store";
import { plainUseWords, withUseWords } from "@/lib/market/phone-sell";
import { KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { listingUnitsLine } from "@/lib/market/units";
import { PROJECT_SCOPE, type EditionKind, type EditionTrack, type EditionUse, type Listing, type Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { InfoButton } from "../parts";
import { T } from "../../type";
import { heldCopiesOf } from "./held";
import { HIT44, HolderOffers } from "./holder-offers";
import type { DoneFacts } from "./parts";

const USES: EditionUse[] = ["private", "commercial"];
type Listed = EditionTrack & { listing: NonNullable<EditionTrack["listing"]> };

/** True while the whole project sells copies of its own (a product's are its screen's). */
export function projectCopiesLive(view: ProjectView): boolean {
  return listedKindsOf(view, PROJECT_SCOPE).length > 0;
}

/** The wallet requests under it in the owner's licence words (Personal use / Business use). */
function UseWordsScope({ children }: { children: React.ReactNode }) {
  const api = useWalletRequest();
  const scoped = React.useMemo<WalletRequestApi>(() => ({ ...api, request: (req, opts) => api.request(withUseWords(req), opts) }), [api]);
  return <WalletRequestScope api={scoped}>{children}</WalletRequestScope>;
}

/** What Purchase successful says about a copy just bought: the sentence, its transaction and what was paid. */
function doneFactsOf(sentence: string, projectId: string, buyerId: DemoBuyerId, trackId: string): DoneFacts {
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

export function PhoneCopies(props: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  /** The active demo buyer; null in a preview. */
  buyerId: DemoBuyerId | null;
  /** A purchase went through (a creator's copy, or one from a holder): what Purchase successful says. */
  onBought: (done: DoneFacts) => void;
  anchorRef?: React.Ref<HTMLElement>;
}) {
  return (
    <UseWordsScope>
      <Copies {...props} />
    </UseWordsScope>
  );
}

function Copies({
  project,
  view,
  viewer,
  buyerId,
  onBought,
  anchorRef,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId | null;
  onBought: (done: DoneFacts) => void;
  anchorRef?: React.Ref<HTMLElement>;
}) {
  const kinds = listedKindsOf(view, PROJECT_SCOPE);
  const main: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, null);
  if (!kinds.length || !chain) return null;
  return (
    <section ref={anchorRef} aria-labelledby="bv-copies" className="flex scroll-mt-[48px] flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h3 id="bv-copies" className={T.section}>
          Copies
        </h3>
        <p className={T.meta}>Each with its own NFT.</p>
      </div>
      {kinds.map((kind) => (
        <KindBlock key={kind} project={project} view={view} viewer={viewer} buyerId={buyerId} kind={kind} onBought={onBought} />
      ))}
    </section>
  );
}

/** One kind: what it gets you, its two Use rows, then From holders. */
function KindBlock({
  project,
  view,
  viewer,
  buyerId,
  kind,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId | null;
  kind: EditionKind;
  onBought: (done: DoneFacts) => void;
}) {
  const offers = tracksOf(PROJECT_SCOPE, view.editions).filter((t): t is Listed => t.kind === kind && t.listing !== null);
  const headingId = `bv-copies-${kind}`;
  return (
    <div className="flex flex-col gap-4">
      <KindHead id={headingId} kind={kind} name={project.name} />
      <ul aria-labelledby={headingId} className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {USES.map((use) => {
          const track = offers.find((t) => t.use === use);
          return track ? (
            <CopyRow key={use} project={project} view={view} viewer={viewer} buyerId={buyerId} track={track} onBought={onBought} />
          ) : (
            <NotOnSaleRow key={use} kind={kind} use={use} />
          );
        })}
      </ul>
      {buyerId && <HolderOffers projectId={project.id} kind={kind} product={null} onBought={onBought} />}
    </div>
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

/** A kind's mark at the start of a row. */
export function KindMark({ kind }: { kind: EditionKind }) {
  return (
    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]">
      <Icon icon={kind === "physical" ? PackageIcon : CubeIcon} size={20} />
    </span>
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

/** A use the creator didn't list: it stays in the list, greyed, and can't be bought. */
export function NotOnSaleRow({ kind, use, aside = "Not on sale" }: { kind: EditionKind; use: string; aside?: string }) {
  const label = use === "private" || use === "commercial" ? USE_LABEL[use] : use;
  return (
    <li className="flex items-center gap-6 px-8 py-6 opacity-60">
      <KindMark kind={kind} />
      <span className={cn(T.rowTitle, "min-w-0 flex-1 break-words")}>{`${KIND_LABEL[kind]} · ${label}`}</span>
      <span className={cn(T.meta, "shrink-0")}>{aside}</span>
    </li>
  );
}

function CopyRow({
  project,
  view,
  viewer,
  buyerId,
  track,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId | null;
  track: Listed;
  onBought: (done: DoneFacts) => void;
}) {
  const resales = useResales();
  const holds = useCheckoutHolds();
  const heldId = React.useId();
  const card = trackCardOf(track, view.sales);
  const name = `${KIND_LABEL[track.kind]} · ${USE_LABEL[track.use]}`;
  const price = formatAmount(track.listing.regular, track.listing.token);
  const share = card.total ? Math.round((card.sold / card.total) * 100) : 0;
  // Held now: a copy sold on is its new holder's.
  const owned = buyerId ? heldCopiesOf(view.sales, buyerId, resales, (s) => s.item.trackId === track.id).length : 0;
  const held = buyerId !== null && !card.soldOut && checkoutBlocks(holds.others(track.id), card.total - card.sold);
  const soldLine = `${card.soldOut ? `All ${card.total} sold` : `${card.sold} of ${card.total} sold`}${owned > 0 ? ` · you own ${owned}` : ""}`;
  return (
    <li className="flex items-center gap-6 px-8 py-6">
      <KindMark kind={track.kind} />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", card.soldOut && "opacity-60")}>
        <span className={cn(T.rowTitle, "break-words")}>{name}</span>
        <span className={cn(T.meta, "tabular-nums text-text-primary")}>{price}</span>
        <SoldBar share={share} line={soldLine} />
        <CopyActivity project={project} track={track} sales={view.sales} />
        {held && (
          <span id={heldId} className={T.meta}>
            {IN_CHECKOUT_BUYER_LINE}
          </span>
        )}
      </div>
      {card.soldOut ? (
        <span className={cn(T.meta, "shrink-0 opacity-60")}>Sold out</span>
      ) : (
        buyerId && (
          <BuyCopy project={project} view={view} viewer={viewer} buyerId={buyerId} track={track} name={name} price={price} held={held} heldId={heldId} onBought={onBought} />
        )
      )}
    </li>
  );
}

/** The row's small Buy: the use at its one price, straight to the wallet. */
function BuyCopy({
  project,
  view,
  viewer,
  buyerId,
  track,
  name,
  price,
  held,
  heldId,
  onBought,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  buyerId: DemoBuyerId;
  track: Listed;
  name: string;
  price: string;
  held: boolean;
  heldId: string;
  onBought: (done: DoneFacts) => void;
}) {
  const { busyId, buy } = useEditionPurchase({ project, view, buyerId, versionless: true });
  if (!can(viewer, "listing.buy", { ...view.canCtx, listingLive: true })) return null;
  const busy = busyId === track.id;
  // The listing's Price. Where the Sell flow's "Price with future updates" was left empty (the same price),
  // the updates come with it, as on the web.
  const tier: EditionTier = track.listing.regular === track.listing.extended ? "extended" : "regular";
  return (
    <Button
      hierarchy="secondary"
      size="md"
      className={cn(HIT44, "shrink-0", held && "cursor-not-allowed opacity-60")}
      data-copy-buy=""
      aria-label={`Buy ${name} for ${price}`}
      // Not `disabled`: that drops its focus before the wallet sheet reads its opener.
      aria-disabled={busy || held || undefined}
      aria-describedby={held ? heldId : undefined}
      loading={busy}
      onClick={async () => {
        if (busy || held) return;
        const done = await buy(track, tier);
        if (done) onBought(doneFactsOf(done, project.id, buyerId, track.id));
      }}
    >
      Buy
    </Button>
  );
}

/** A copy's activity line: its newest sale, else its newest entry, else when it was listed. */
function CopyActivity({ project, track, sales }: { project: ManualProject; track: Listed; sales: Sale[] }) {
  const { record } = useJourney(project.id);
  const sale = sales.filter((s) => s.item.nft !== "main" && s.item.trackId === track.id).reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const entry = historyOf(record, project.id, { kind: track.kind, scope: track.productId })[0] ?? null;
  const line = sale
    ? `Bought by ${buyerLabel(sale.buyerId)} · ${formatAmount(sale.price, sale.token)} · ${formatDate(sale.at)}`
    : entry
      ? `${labelOf(entry)} · ${formatDate(entry.createdAt)}`
      : `No activity yet · listed ${formatDate(track.listing.listedAt)}`;
  return <span className={T.caption}>{line}</span>;
}
