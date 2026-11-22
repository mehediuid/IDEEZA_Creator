"use client";

// Buying another creator's shared project from the Feed (Figma "Project
// Details · 2026 update" 18b–18e on a sample project, `/m/projects/p1`; the
// lead's decision 2026-11-05): as on one's own listing, a demo creator — Mira,
// Leo or Sam, "Testnet demo · shopping as Mira" — does the buying with test
// tokens. The sample's listing rows are its offers (Main NFT = the whole
// project, then its copies); a purchase is the demo wallet's request in the
// phone's sheet, paid from the buyer's demo balance, and recorded in
// `ideeza:market:phone-sample-sales` (lib/market/phone-sample-sales.ts) — the
// same store the web's sample box writes (marketplace/sample-offer-box.tsx),
// with the same request, re-check and commit. Samples sell by Buy now only.
//
// sample-project.tsx mounts the pieces: SampleShop around its screen,
// SampleMarketSection right under the title (owner 2026-11-12: the page the
// Feed's pill opens was a spreadsheet — a loud demo banner on top, a table of
// rows that said the price twice, empty "activity" headings and a Buy button
// on every card). As a product page:
// · "You own n NFTs › See what you own" (you-own.tsx, CL-035) for anyone who
//   holds any of it now — one row in place of a receipt card per purchase;
//   it follows the holder, so a copy sold on is no longer "yours";
// · one buy box — "Whole project · Main NFT", the price large, three facts
//   (Listing, Share, Chain), the wallet line, the last sale and the Testnet
//   demo line with Change — the share-sale note under it;
// · the copies, each kind with its two Use rows, Personal use and Business
//   use (sample-market.ts `copyUsesOf`: the post's row and the other use,
//   Business at twice Personal), each with its own price, sold count and
//   small Buy; a sold-out use reads "Sold out" (CL-018); then From holders
//   (holder-offers.tsx, CL-036).
// The bottom bar's Buy now buys the Main NFT, so the box has no button of its
// own; with the Main NFT gone it brings the copies into view. The copies are
// the whole project's: a product's screen doesn't sell them (CL-018) — its bar
// (SampleCopiesBar) says what they start at and opens them here.

import * as React from "react";
import Link from "next/link";
import { Activity01Icon, BubbleChatIcon, Coins01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { scrollWithin } from "@/components/create/anchors";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/commerce/gas";
import { SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import type { InnovationPost } from "@/lib/innovations/types";
import { formatDate } from "@/lib/manual/project-summary";
import {
  makeSampleSale,
  nextSampleSerial,
  offerStateOf,
  SAMPLE_NETWORK,
  sampleBuyBlock,
  sampleHoldingOf,
  sampleOffersOf,
  sampleRequestOf,
  sampleSalesOf,
  STORAGE_FULL,
  withSampleSale,
  type SampleOffer,
  type SampleSale,
} from "@/lib/market/phone-sample-sales";
import { sampleSaleKeyOf } from "@/lib/market/purchases";
import { holderOf } from "@/lib/market/resales";
import { lowestOf } from "@/lib/market/market-list";
import { randomId } from "@/lib/market/sales";
import { copyUseBlockOf, copyUsesOf, copyUseStateOf, type SampleMarket, type UseOffer } from "@/lib/market/sample-market";
import type { EditionKind } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { PhoneWalletScope } from "../phone-wallet";
import { KindHead, KindMark, SoldBar } from "./copies";
import { HIT44, HolderOffers, useHolderListings } from "./holder-offers";
import { readSampleSales, useSampleSales, writeSampleSales } from "./sample-sales-store";
import { BuyBox, ClosedCard, DemoShopBanner, IconLine, PurchaseDoneSheet, WalletLine, type DoneFacts } from "./parts";
import { YouOwnRow } from "./you-own";
import { T } from "../../type";

/** The web's words for a project sold in full (lib/market/purchase.ts). */
const LOCKED = "This project was sold in full, so its NFTs aren't for sale any more.";
const SAMPLE_BANNER_BODY = "A demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.";
const KINDS: EditionKind[] = ["physical", "virtual"];

type Shop = {
  post: InnovationPost;
  id: string;
  /** The sample as the web's marketplace reads it (sample-market.ts). */
  market: SampleMarket;
  offers: SampleOffer[];
  /** This project's sales, oldest first. */
  sales: SampleSale[];
  buyerId: DemoBuyerId;
  holding: SampleSale[];
  /** The offer being bought, by its name. */
  busy: string | null;
  buy: (offer: SampleOffer | UseOffer) => void;
  /** Copies other holders sell on that the active buyer could buy. */
  fromHolders: number;
  /** A purchase from a holder went through: Purchase successful. */
  bought: (done: DoneFacts) => void;
};

/** The marketplace block's id: with the Main NFT gone, the bar's Buy now brings the copies into view by it. */
const SECTION_ID = "sample-market";

const Ctx = React.createContext<Shop | null>(null);

function useShop(): Shop | null {
  return React.useContext(Ctx);
}

const isUse = (o: SampleOffer | UseOffer): o is UseOffer => "use" in o;

export function SampleShop({ post, id, children }: { post: InnovationPost; id: string; children: React.ReactNode }) {
  if (!post.listing) return <>{children}</>;
  return (
    <PhoneWalletScope>
      <ShopProvider post={post} id={id}>
        {children}
      </ShopProvider>
    </PhoneWalletScope>
  );
}

function ShopProvider({ post, id, children }: { post: InnovationPost; id: string; children: React.ReactNode }) {
  const { request } = useWalletRequest();
  const { buyer } = useActiveBuyer();
  const all = useSampleSales();
  const sales = React.useMemo(() => sampleSalesOf(id, all), [id, all]);
  const offers = React.useMemo(() => sampleOffersOf(post), [post]);
  const market = React.useMemo<SampleMarket>(() => ({ feedId: id, post, offers }), [id, post, offers]);
  const physical = useHolderListings(id, "physical", null);
  const virtual = useHolderListings(id, "virtual", null);
  const fromHolders = [...physical, ...virtual].filter((r) => r.sellerId !== buyer.id).length;
  const [busy, setBusy] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<DoneFacts | null>(null);

  // The web's sample purchase (sample-offer-box.tsx): the Main NFT, or a copy for one use (its own count,
  // its own sold-out).
  const buy = React.useCallback(
    async (o: SampleOffer | UseOffer) => {
      if (busy) return;
      const blockOf = (list: SampleSale[]) => (isUse(o) ? copyUseBlockOf(o, id, list) : sampleBuyBlock(o, id, list));
      const serialOf = (list: SampleSale[]) => (isUse(o) ? copyUseStateOf(o, id, list).count + 1 : nextSampleSerial(o, id, list));
      const req = sampleRequestOf({ title: post.title, offer: o, buyerId: buyer.id, serial: serialOf(readSampleSales()) });
      setBusy(o.name);
      try {
        const result = await request(req, {
          recheck: () => blockOf(readSampleSales()),
          commit: (proof) => {
            const stored = readSampleSales();
            const why = blockOf(stored);
            if (why) return { ok: false, conflict: true, message: why };
            const sale = makeSampleSale({
              id: randomId("psale"),
              projectId: id,
              offer: o,
              buyerId: buyer.id,
              buyerAddress: proof.address,
              serial: serialOf(stored),
              txHash: proof.txHash ?? "",
              at: proof.at,
            });
            // A copy's use was checked above; the Main NFT goes through the phone's own check.
            const next = isUse(o) ? { ok: true as const, sales: [...stored, sale] } : withSampleSale(stored, o, sale);
            if (!next.ok) return { ok: false, conflict: true, message: next.message };
            if (!writeSampleSales(next.sales)) return { ok: false, message: STORAGE_FULL };
            return { ok: true };
          },
        });
        if (result.ok) {
          const gas = estimateGas(SAMPLE_NETWORK);
          setDone({
            sentence: req.doneLine,
            transaction: result.proof.txHash ?? null,
            paid: `${formatAmount(o.price, o.token)} (+ ${formatAmount(String(gas.fee), gas.native)} network fee)`,
          });
        }
      } finally {
        setBusy(null);
      }
    },
    [busy, post.title, buyer.id, id, request],
  );

  const shop = React.useMemo<Shop>(
    () => ({
      post,
      id,
      market,
      offers,
      sales,
      buyerId: buyer.id,
      holding: sampleHoldingOf(id, buyer.id, sales),
      busy,
      buy: (o) => void buy(o),
      fromHolders,
      bought: setDone,
    }),
    [post, id, market, offers, sales, buyer.id, busy, buy, fromHolders],
  );
  return (
    <Ctx.Provider value={shop}>
      {children}
      <PurchaseDoneSheet done={done} onClose={() => setDone(null)} />
    </Ctx.Provider>
  );
}

/** Right under the title: what the active buyer holds, the Main NFT's buy box, then the copies. */
export function SampleMarketSection() {
  const shop = useShop();
  if (!shop) return null;
  const { id, offers, sales, buyerId } = shop;
  const main = offers.find((o) => o.kind === "main") ?? null;
  const mainState = main ? offerStateOf(main, id, sales) : null;
  const mainSale = mainState?.soldTo ?? null;
  const lastMain = mainSale
    ? `Bought by ${buyerLabel(mainSale.buyerId)} · ${formatAmount(mainSale.price, mainSale.token)} · ${formatDate(mainSale.at)}`
    : "No sales yet";
  return (
    <section id={SECTION_ID} aria-labelledby="sv-market" className="flex flex-col gap-6 px-8 pb-8">
      <h2 id="sv-market" className="sr-only">
        Marketplace
      </h2>
      <YouOwnRow projectId={id} />
      {main &&
        (mainSale ? (
          // The buyer's own whole project is in the row above (it opens as their project).
          mainSale.buyerId === buyerId ? null : (
            <ClosedCard title={`Sold on ${formatDate(mainSale.at)}.`} detail={`Sold for ${formatAmount(mainSale.price, mainSale.token)} · the whole project`} />
          )
        ) : (
          <div className="flex flex-col gap-3">
            <BuyBox
              label="Main NFT, the whole project"
              overline="Whole project · Main NFT"
              price={formatAmount(main.price, main.token)}
              facts={[
                { label: "Listing", value: "Buy now" },
                { label: "Share", value: "100%" },
                { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
              ]}
              foot={
                <>
                  <IconLine icon={Wallet01Icon}>
                    <WalletLine buyerId={buyerId} token={main.token} network={SAMPLE_NETWORK} verb="buy" />
                  </IconLine>
                  <IconLine icon={Activity01Icon}>
                    <p className={T.meta}>
                      <span className="sr-only">Main NFT activity: </span>
                      {lastMain}
                    </p>
                  </IconLine>
                  <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
                </>
              }
            />
            <p className={cn(T.caption, "text-text-tertiary")}>{SHARE_SALE_NOTE}</p>
          </div>
        ))}
      {/* With no buy box (no Main NFT, or it is sold), who is shopping is said on its own. */}
      {(!main || mainSale) && <DemoShopBanner body={SAMPLE_BANNER_BODY} line />}
      <SampleCopies />
    </section>
  );
}

/** The whole project's copies: each kind with its Use rows, then From holders. */
function SampleCopies() {
  const shop = useShop();
  if (!shop) return null;
  const { market, sales } = shop;
  const kinds = KINDS.filter((k) => copyUsesOf(market, k).length > 0);
  if (!kinds.length) return null;
  const locked = sales.some((s) => s.kind === "main");
  return (
    <section aria-labelledby="sv-copies" className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h3 id="sv-copies" className={T.section}>
          Copies
        </h3>
        <p className={T.meta}>{locked ? LOCKED : "Of the whole project, each with its own NFT."}</p>
      </div>
      {kinds.map((kind) => (
        <SampleKind key={kind} shop={shop} kind={kind} />
      ))}
    </section>
  );
}

function SampleKind({ shop, kind }: { shop: Shop; kind: EditionKind }) {
  const { market, post, id } = shop;
  const headingId = `sv-copies-${kind}`;
  return (
    <div className="flex flex-col gap-4">
      <KindHead id={headingId} kind={kind} name={post.title} />
      <ul aria-labelledby={headingId} className={cn(LIST_CARD, LIST_DIVIDERS)}>
        {copyUsesOf(market, kind).map((o) => (
          <SampleUseRow key={o.use} shop={shop} offer={o} kind={kind} />
        ))}
      </ul>
      <HolderOffers projectId={id} kind={kind} product={null} onBought={shop.bought} />
    </div>
  );
}

/** One use of one kind: its price, how many are sold (and held by this buyer now), its last sale, and Buy. */
function SampleUseRow({ shop, offer, kind }: { shop: Shop; offer: UseOffer; kind: EditionKind }) {
  const { id, sales, buyerId, busy, buy, post } = shop;
  const resales = useResales();
  const state = copyUseStateOf(offer, id, sales);
  const why = copyUseBlockOf(offer, id, sales);
  const price = formatAmount(offer.price, offer.token);
  // Held now: a copy sold on is its new holder's (resales.ts).
  const owned = state.sales.filter((s) => holderOf(sampleSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId).length;
  const sold = state.of !== null ? `${state.count} of ${state.of} sold` : state.count ? `${state.count} sold` : null;
  const line = [sold, owned > 0 ? `you own ${owned}` : null].filter(Boolean).join(" · ");
  const last = state.sales.at(-1) ?? null;
  return (
    <li className="flex items-center gap-6 px-8 py-6">
      <KindMark kind={kind} />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1", why && "opacity-60")}>
        <span className={cn(T.rowTitle, "break-words")}>{offer.name}</span>
        <span className={cn(T.meta, "tabular-nums text-text-primary")}>{price}</span>
        {state.of !== null ? <SoldBar share={state.of ? Math.round((state.count / state.of) * 100) : 0} line={line} /> : line && <span className={cn(T.caption, "tabular-nums")}>{line}</span>}
        <span className={T.caption}>
          {last ? `Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}` : `No activity yet · listed ${formatDate(post.sharedAt)}`}
        </span>
      </div>
      {why ? (
        <span className={cn(T.meta, "shrink-0 opacity-60")}>{state.locked ? "Not for sale" : "Sold out"}</span>
      ) : (
        <Button
          hierarchy="secondary"
          size="md"
          className={cn(HIT44, "shrink-0")}
          data-copy-buy=""
          aria-label={`Buy ${offer.name} for ${price}`}
          aria-disabled={busy !== null || undefined}
          loading={busy === offer.name}
          onClick={() => {
            if (busy === null) buy(offer);
          }}
        >
          Buy
        </Button>
      )}
    </li>
  );
}

/** The bottom bar: Buy now (the Main NFT, else the copies — the creator's or a holder's) beside Ask the
 *  creator — Get creator support once the active buyer bought any of it. With nothing left to buy, the
 *  way to the creator is the bar's one button. */
export function SampleShopBar({ ask }: { ask: string }) {
  const shop = useShop();
  if (!shop) {
    return (
      <BottomBar className="pt-8">
        <Link href={ask} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
          <Icon icon={BubbleChatIcon} size={20} />
          Ask the creator
        </Link>
      </BottomBar>
    );
  }
  const { market, offers, id, sales, holding, busy, buy, fromHolders } = shop;
  const main = offers.find((o) => o.kind === "main" && sampleBuyBlock(o, id, sales) === null) ?? null;
  const copy = KINDS.some((k) => copyUsesOf(market, k).some((o) => copyUseBlockOf(o, id, sales) === null)) || fromHolders > 0;
  const primary = main || copy;
  return (
    <BottomBar className={cn("pt-8", holding.length && primary ? "gap-4" : "flex-row gap-6")}>
      {primary && (
        <Button
          size="xl"
          className="min-w-0 flex-1"
          iconLeading={<Icon icon={Coins01Icon} size={20} />}
          aria-disabled={busy !== null || undefined}
          onClick={() => {
            if (busy !== null) return;
            if (main) return buy(main);
            const el = document.getElementById(SECTION_ID)?.querySelector<HTMLButtonElement>("[data-copy-buy]");
            if (!el) return;
            scrollWithin(el, "nearest", "smooth");
            el.focus({ preventScroll: true });
          }}
        >
          Buy now
        </Button>
      )}
      <Link href={ask} className={cn(buttonVariants({ hierarchy: primary ? "secondary" : "primary", size: "xl" }), "min-w-0 flex-1")}>
        <Icon icon={BubbleChatIcon} size={20} />
        {holding.length ? "Get creator support" : "Ask the creator"}
      </Link>
    </BottomBar>
  );
}

/** A sample product's bottom bar: its copies are the whole project's, sold on the project's screen
 *  (CL-018: a product with no copies of its own sells none; "Part of {project}" leads to the project's
 *  offers). What they start at — the creator's open uses and other holders' listings — and Buy a copy,
 *  which opens them there; "All copies are sold." once none is left. No copies: no bar. */
export function SampleCopiesBar({ post, id }: { post: InnovationPost; id: string }) {
  const all = useSampleSales();
  const { buyer } = useActiveBuyer();
  const physical = useHolderListings(id, "physical", null);
  const virtual = useHolderListings(id, "virtual", null);
  const market = React.useMemo<SampleMarket>(() => ({ feedId: id, post, offers: sampleOffersOf(post) }), [id, post]);
  const uses = KINDS.flatMap((k) => copyUsesOf(market, k));
  if (!post.listing || !uses.length) return null;
  const open = uses.filter((o) => copyUseBlockOf(o, id, all) === null).map((o) => ({ amount: o.price, token: o.token }));
  const holders = [...physical, ...virtual].filter((r) => r.sellerId !== buyer.id).map((r) => ({ amount: r.price, token: r.token }));
  const from = lowestOf([...open, ...holders]) ?? lowestOf(uses.map((o) => ({ amount: o.price, token: o.token })));
  return (
    <BottomBar className="pt-6">
      <div className="flex items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>Copies from</span>
          {from && <span className={cn(T.section, "tabular-nums")}>{formatAmount(from.amount, from.token)}</span>}
        </span>
        {open.length || holders.length ? (
          <Link href={`/m/projects/${encodeURIComponent(id)}?tab=marketplace`} className={cn(buttonVariants({ size: "xl" }), "min-w-0 flex-1")}>
            Buy a copy
          </Link>
        ) : (
          <p className={cn(T.body, "min-w-0 flex-1 text-right")}>All copies are sold.</p>
        )}
      </div>
    </BottomBar>
  );
}
