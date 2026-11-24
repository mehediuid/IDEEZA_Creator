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
// SampleMarketSection right under the title, SampleShopBar as its footer.
// Laid out as a product page (owner 2026-11-12), and since 2026-11-22 (owner,
// "Yes, build A" on study Uq1VPBrq9Jjez6jeWwEkjz: the bar's Buy now silently
// bought the whole project, even with a copy on screen) the buyer chooses
// first, as on the web's Marketplace box:
// · "You own n NFTs › See what you own" (you-own.tsx, CL-035) for anyone who
//   holds any of it now; it follows the holder;
// · one buy box (buy-pick.tsx): Main NFT · Physical NFT · Virtual NFT, only what
//   the post sells, opening on the web's tab (an address's ?nft=, else what
//   the buyer holds, else the first with something to buy). Main NFT =
//   its box ("Main NFT", the price large, Listing,
//   Share, Royalties, Minting, Chain, Collection and what Royalties and Lazy
//   mean, the wallet line, "No activity yet · listed {date}", the Testnet
//   demo line), the share-sale note under it (BUY-7, the web's sample facts).
//   A copy kind = what it gets you (units behind ⓘ), then
//   Use: Personal use and Business use as radio rows (sample-market.ts
//   `copyUsesOf`: Business at twice Personal), each with its price, sold
//   count and last sale (a sold-out use stays, greyed); then From holders as
//   rows of the same choice (holder-offers.tsx, CL-036); then NFT details,
//   one row opening its sheet (BUY-7);
// · the bar says what is picked and its price, with Change, beside Ask the
//   creator (a chat icon) and the one Buy now — Manage for the buyer's own
//   holder listing; the wallet sheet's title names it too (D4). Nothing left
//   to buy: Ask the creator alone.
// The copies are the whole project's: a product's screen doesn't sell them
// (CL-018) — its bar (SampleCopiesBar) says what they start at and opens
// this box on them (Buy a copy → ?nft=).

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { buttonVariants } from "@/components/ideeza/button";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
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
import { askedTabOf, buyTitleOf, holderPickTitle, MAIN_PICK_TITLE, mainBarLine, openingTabOf, pickedChoiceOf, copyBarLine, copyPickTitle, type PickTab } from "@/lib/market/buy-pick";
import { holderOf, type Resale } from "@/lib/market/resales";
import { unitsAllowanceOf, type UnitsUse } from "@/lib/market/units";
import { lowestOf } from "@/lib/market/market-list";
import { randomId } from "@/lib/market/sales";
import { copyUseBlockOf, copyUsesOf, copyUseStateOf, SAMPLE_COLLECTION, SAMPLE_ROYALTIES_PCT, type SampleMarket, type UseOffer } from "@/lib/market/sample-market";
import type { EditionKind } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { PhoneWalletScope } from "../phone-wallet";
import { tabPanelProps } from "../../kit/tabs";
import { BUY_BOX_ID, Choice, ChoiceGroup, PickBar, PickTabs, revealBuyBox, titled, type BarAction, type BarPick } from "./buy-pick";
import { COPY_FACTS_NOTE, KindHead, NftDetailsRow, SoldBar } from "./copies";
import { HolderChoice, holderFactsOf, useHolderBuy, useHolderListings } from "./holder-offers";
import { readSampleSales, useSampleSales, writeSampleSales } from "./sample-sales-store";
import { BuyBox, ClosedCard, DemoShopBanner, IconLine, PurchaseDoneSheet, WalletLine, type BoxFact, type DoneFacts } from "./parts";
import { YouOwnRow } from "./you-own";
import { T } from "../../type";

/** The web's words for a project sold in full (lib/market/purchase.ts). */
const LOCKED = "This project was sold in full, so its NFTs aren't for sale any more.";
const SAMPLE_BANNER_BODY = "A demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.";
const KINDS: EditionKind[] = ["physical", "virtual"];
const BOX_TABS = "sv-buy";

/** One thing the box can pick: the Main NFT, a copy of one use, or another holder's copy. */
type ShopChoice =
  | { type: "main"; key: "main"; tab: "main"; open: boolean; offer: SampleOffer }
  | { type: "use"; key: string; tab: EditionKind; open: boolean; offer: UseOffer; aside: string | null }
  | { type: "holder"; key: string; tab: EditionKind; open: boolean; resale: Resale };

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
  /** The tabs the box shows, the open one, and its setter. */
  tabs: PickTab[];
  tab: PickTab | null;
  setTab: (t: PickTab) => void;
  choicesOf: (t: PickTab) => ShopChoice[];
  /** What the open tab has picked. */
  picked: ShopChoice | null;
  pick: (c: ShopChoice) => void;
  /** Something on the page can still be bought (the buyer's own holder listing aside). */
  anyBuyable: boolean;
  /** The key of the choice being bought. */
  busy: string | null;
  run: (c: ShopChoice) => void;
};

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
  const params = useSearchParams();
  const all = useSampleSales();
  const sales = React.useMemo(() => sampleSalesOf(id, all), [id, all]);
  const offers = React.useMemo(() => sampleOffersOf(post), [post]);
  const market = React.useMemo<SampleMarket>(() => ({ feedId: id, post, offers }), [id, post, offers]);
  const physical = useHolderListings(id, "physical", null);
  const virtual = useHolderListings(id, "virtual", null);
  const [buying, setBuying] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<DoneFacts | null>(null);
  const holderBuy = useHolderBuy({ onBought: setDone });
  const [pickedTab, setPickedTab] = React.useState<PickTab | null>(null);
  const [picks, setPicks] = React.useState<Partial<Record<PickTab, string>>>({});
  const asked = askedTabOf(params.get("nft"));

  // A link that asks for a tab (a product's See copies) opens with the box in view.
  React.useEffect(() => {
    if (!asked) return;
    const t = window.setTimeout(() => revealBuyBox("auto"), 60);
    return () => window.clearTimeout(t);
  }, [asked]);

  // The web's sample purchase (sample-offer-box.tsx): the Main NFT, or a copy for one use (its own count,
  // its own sold-out), titled with what it buys.
  const buy = React.useCallback(
    async (o: SampleOffer | UseOffer, key: string, title: string) => {
      if (buying) return;
      const blockOf = (list: SampleSale[]) => (isUse(o) ? copyUseBlockOf(o, id, list) : sampleBuyBlock(o, id, list));
      const serialOf = (list: SampleSale[]) => (isUse(o) ? copyUseStateOf(o, id, list).count + 1 : nextSampleSerial(o, id, list));
      const req = titled(sampleRequestOf({ title: post.title, offer: o, buyerId: buyer.id, serial: serialOf(readSampleSales()) }), title);
      setBuying(key);
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
        setBuying(null);
      }
    },
    [buying, post.title, buyer.id, id, request],
  );

  const shop = React.useMemo<Shop>(() => {
    const main = offers.find((o) => o.kind === "main") ?? null;
    const holdersOf = (k: EditionKind) => (k === "physical" ? physical : virtual);
    const choicesOf = (t: PickTab): ShopChoice[] => {
      if (t === "main") return main ? [{ type: "main", key: "main", tab: "main", open: sampleBuyBlock(main, id, sales) === null, offer: main }] : [];
      const uses: ShopChoice[] = copyUsesOf(market, t).map((o) => {
        const why = copyUseBlockOf(o, id, sales);
        return { type: "use", key: `use:${o.use}`, tab: t, open: why === null, offer: o, aside: why ? (copyUseStateOf(o, id, sales).locked ? "Not on sale" : "Sold out") : null };
      });
      const holders: ShopChoice[] = holdersOf(t).map((r) => ({ type: "holder", key: `holder:${r.id}`, tab: t, open: true, resale: r }));
      return [...uses, ...holders];
    };
    const buyableChoice = (c: ShopChoice) => c.open && !(c.type === "holder" && c.resale.sellerId === buyer.id);
    const tabs: PickTab[] = [...(main ? (["main"] as const) : []), ...KINDS.filter((k) => copyUsesOf(market, k).length > 0 || holdersOf(k).length > 0)];
    const holding = sampleHoldingOf(id, buyer.id, sales);
    const opening = openingTabOf({
      tabs,
      asked,
      heldKinds: [...holding].reverse().map((s) => s.kind),
      buyable: (t) => choicesOf(t).some(buyableChoice),
    });
    const tab = pickedTab && tabs.includes(pickedTab) ? pickedTab : opening;
    const picked = tab ? pickedChoiceOf(choicesOf(tab), picks[tab] ?? null) : null;
    const run = (c: ShopChoice) => {
      if (c.type === "main") void buy(c.offer, c.key, buyTitleOf({ kind: "main", sharePct: null }));
      else if (c.type === "use") void buy(c.offer, c.key, buyTitleOf({ kind: "use", copy: c.tab, use: c.offer.use }));
      else if (c.resale.sellerId !== buyer.id) {
        const f = holderFactsOf(c.resale, buyer.id, []);
        void holderBuy.buy(c.resale, buyTitleOf({ kind: "holder", copy: c.tab, number: f.number, use: f.use, seller: f.seller }));
      }
    };
    return {
      post,
      id,
      market,
      offers,
      sales,
      buyerId: buyer.id,
      holding,
      tabs,
      tab,
      setTab: setPickedTab,
      choicesOf,
      picked,
      pick: (c) => setPicks((m) => ({ ...m, [c.tab]: c.key })),
      anyBuyable: tabs.some((t) => choicesOf(t).some(buyableChoice)),
      busy: buying ?? (holderBuy.busyId ? `holder:${holderBuy.busyId}` : null),
      run,
    };
  }, [post, id, market, offers, sales, buyer.id, physical, virtual, asked, pickedTab, picks, buy, buying, holderBuy]);

  return (
    <Ctx.Provider value={shop}>
      {children}
      <PurchaseDoneSheet done={done} onClose={() => setDone(null)} />
    </Ctx.Provider>
  );
}

/** Right under the title: what the active buyer holds, then the buy box. */
export function SampleMarketSection() {
  const shop = useShop();
  if (!shop) return null;
  const { id, tabs, tab, setTab } = shop;
  return (
    <section aria-labelledby="sv-market" className="flex flex-col gap-6 px-8 pb-8">
      <h2 id="sv-market" className="sr-only">
        Marketplace
      </h2>
      <YouOwnRow projectId={id} />
      {tab ? (
        <div id={BUY_BOX_ID} className="flex scroll-mt-[56px] flex-col gap-6">
          <PickTabs tabs={tabs} value={tab} onChange={setTab} idBase={BOX_TABS} />
          <div {...(tabs.length > 1 ? tabPanelProps(BOX_TABS, tab) : {})} className="flex flex-col gap-6 outline-none">
            {tab === "main" ? <MainPanel shop={shop} /> : <CopyPanel shop={shop} kind={tab} />}
          </div>
        </div>
      ) : (
        <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
      )}
    </section>
  );
}

/** Main NFT: its box, or how it was sold. */
function MainPanel({ shop }: { shop: Shop }) {
  const { id, post, offers, sales, buyerId } = shop;
  const main = offers.find((o) => o.kind === "main");
  if (!main) return null;
  const mainSale = offerStateOf(main, id, sales).soldTo ?? null;
  if (mainSale) {
    return (
      <>
        {mainSale.buyerId === buyerId ? (
          <ClosedCard title="You own the Main NFT." detail="It opens from See what you own, above." />
        ) : (
          <ClosedCard title={`Sold on ${formatDate(mainSale.at)}.`} detail={`Sold for ${formatAmount(mainSale.price, mainSale.token)} · the whole project`} />
        )}
        <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
      </>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <BuyBox
        label="Main NFT"
        overline="Main NFT"
        price={formatAmount(main.price, main.token)}
        // The web's sample facts (sample-offer-box.tsx, BUY-7): what the royalty is, how it mints, which collection.
        facts={[
          { label: "Listing", value: "Buy now" },
          { label: "Share", value: "100%" },
          { label: "Royalties", value: `${SAMPLE_ROYALTIES_PCT}%` },
          { label: "Minting", value: "Lazy" },
          { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
          { label: "Collection", value: SAMPLE_COLLECTION },
        ]}
        notes={COPY_FACTS_NOTE}
        foot={
          <>
            <IconLine icon={Wallet01Icon}>
              <WalletLine buyerId={buyerId} token={main.token} network={SAMPLE_NETWORK} verb="buy" />
            </IconLine>
            <IconLine icon={Activity01Icon}>
              <p className={cn(T.meta, "tabular-nums")}>
                <span className="sr-only">Main NFT activity: </span>
                {`No activity yet · listed ${formatDate(post.sharedAt)}`}
              </p>
            </IconLine>
            <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
          </>
        }
      />
      <p className={cn(T.caption, "text-text-tertiary")}>{SHARE_SALE_NOTE}</p>
    </div>
  );
}

/** A copy kind: what it gets you, its Use choices, other holders' copies, then who is paying. */
function CopyPanel({ shop, kind }: { shop: Shop; kind: EditionKind }) {
  const { post, sales, buyerId, picked, pick, choicesOf } = shop;
  const choices = choicesOf(kind);
  const uses = choices.filter((c): c is Extract<ShopChoice, { type: "use" }> => c.type === "use");
  const holders = choices.filter((c): c is Extract<ShopChoice, { type: "holder" }> => c.type === "holder");
  const locked = sales.some((s) => s.kind === "main");
  const token = picked?.type === "use" ? picked.offer.token : picked?.type === "holder" ? picked.resale.token : (uses[0]?.offer.token ?? "ETH");
  const name = `sv-pick-${kind}`;
  // NFT details (BUY-7): the picked use's, else the first that can be bought, else the first (the web's copy tab).
  const details = (picked?.type === "use" && picked.tab === kind ? picked.offer : null) ?? uses.find((c) => c.open)?.offer ?? uses[0]?.offer ?? null;
  return (
    <>
      <KindHead id={`sv-copies-${kind}`} kind={kind} name={post.title} />
      <p className={T.meta}>{locked ? LOCKED : "Of the whole project, each with its own NFT."}</p>
      {uses.length > 0 && (
        <ChoiceGroup label="Use">
          {uses.map((c) => (
            <UseChoice key={c.key} shop={shop} choice={c} name={name} checked={picked?.key === c.key} onSelect={() => pick(c)} />
          ))}
        </ChoiceGroup>
      )}
      {holders.length > 0 && (
        <ChoiceGroup
          label={`From holders · ${holders.length}`}
          note={`Copies others bought and sell on. You get the copy, its licence${kind === "physical" ? " and its units left" : ""}; the creator still gets a royalty.`}
        >
          {holders.map((c) => (
            <HolderChoice key={c.key} resale={c.resale} buyerId={buyerId} name={name} checked={picked?.key === c.key} onSelect={() => pick(c)} />
          ))}
        </ChoiceGroup>
      )}
      {details && <NftDetailsRow offer={details.name} facts={sampleCopyFactsOf(details, shop)} />}
      <IconLine icon={Wallet01Icon}>
        <WalletLine buyerId={buyerId} token={token} network={SAMPLE_NETWORK} verb="buy" />
      </IconLine>
      <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
    </>
  );
}

/** A sample copy's NFT details as the web's sample box reads them (sample-offer-box.tsx): Copies, Use, Royalties,
 *  Minting, Chain, Collection. */
function sampleCopyFactsOf(offer: UseOffer, shop: Shop): BoxFact[] {
  const state = copyUseStateOf(offer, shop.id, shop.sales);
  return [
    // Only what the post's row says: a row that names no total has no Copies fact (owner, 2026-11-24).
    ...(state.of !== null ? [{ label: "Copies", value: `${state.of}` }] : []),
    { label: "Use", value: offer.use },
    { label: "Royalties", value: `${SAMPLE_ROYALTIES_PCT}%` },
    { label: "Minting", value: "Lazy" },
    { label: "Chain", value: networkLabelOf(SAMPLE_NETWORK) },
    { label: "Collection", value: SAMPLE_COLLECTION },
  ];
}

/** One use of one kind: its price, how many are sold (and held by this buyer now), its last sale. */
function UseChoice({ shop, choice, name, checked, onSelect }: { shop: Shop; choice: Extract<ShopChoice, { type: "use" }>; name: string; checked: boolean; onSelect: () => void }) {
  const { id, sales, buyerId, post } = shop;
  const resales = useResales();
  const offer = choice.offer;
  const state = copyUseStateOf(offer, id, sales);
  // Held now: a copy sold on is its new holder's (resales.ts).
  const owned = state.sales.filter((s) => holderOf(sampleSaleKeyOf(s) ?? s.id, s.buyerId, resales) === buyerId).length;
  const sold = state.of !== null ? (state.count >= state.of ? `All ${state.of} sold` : `${state.count} of ${state.of} sold`) : state.count ? `${state.count} sold` : null;
  const line = [sold, owned > 0 ? `you own ${owned}` : null].filter(Boolean).join(" · ");
  const last = state.sales.at(-1) ?? null;
  return (
    <Choice
      name={name}
      checked={checked && choice.open}
      disabled={!choice.open}
      onSelect={onSelect}
      title={offer.use}
      price={formatAmount(offer.price, offer.token)}
      aside={choice.aside ?? undefined}
    >
      {state.of !== null ? <SoldBar share={state.of ? Math.round((state.count / state.of) * 100) : 0} line={line} /> : line && <span className={cn(T.caption, "tabular-nums")}>{line}</span>}
      <span className={T.caption}>
        {last ? `Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}` : `No activity yet · listed ${formatDate(post.sharedAt)}`}
      </span>
    </Choice>
  );
}

/** What the bar says the pick is, and its one primary (buy-pick.tsx). */
function barOf(shop: Shop, log: Parameters<typeof holderFactsOf>[2]): { pick: BarPick; action: BarAction; reason: string | null } | null {
  const c = shop.picked;
  if (!c) return null;
  const busy = shop.busy === c.key;
  const off = (why: string) => ({ kind: "button" as const, label: "Buy now", run: () => {}, disabled: true, why });
  if (c.type === "main") {
    const price = formatAmount(c.offer.price, c.offer.token);
    const action = c.open ? { kind: "button" as const, label: "Buy now", busy, run: () => shop.run(c) } : off("The Main NFT is sold.");
    return { pick: { title: MAIN_PICK_TITLE, line: mainBarLine(price, null) }, action, reason: "why" in action ? action.why : null };
  }
  if (c.type === "use") {
    const price = formatAmount(c.offer.price, c.offer.token);
    const units = c.tab === "physical" ? unitsAllowanceOf(c.offer.use as UnitsUse) : null;
    const action = c.open ? { kind: "button" as const, label: "Buy now", busy, run: () => shop.run(c) } : off(c.aside === "Not on sale" ? LOCKED : "This use is sold out. Pick another, or a holder's copy.");
    return { pick: { title: copyPickTitle(c.tab, c.offer.use), line: copyBarLine(price, c.tab, units) }, action, reason: "why" in action ? action.why : null };
  }
  const f = holderFactsOf(c.resale, shop.buyerId, log);
  const pick = { title: holderPickTitle(c.tab, f.number, f.use), line: `${f.price} · ${f.line}` };
  if (f.mine) return { pick, action: { kind: "link", label: "Manage", href: f.manageHref }, reason: null };
  return { pick, action: { kind: "button", label: "Buy now", busy, run: () => shop.run(c) }, reason: null };
}

/** The bottom bar: what is picked and its price, Ask the creator (Get creator support once the active buyer
 *  bought any of it) and the one Buy now. With nothing left to buy, Ask the creator alone. */
export function SampleShopBar({ ask }: { ask: string }) {
  const shop = useShop();
  const log = useUnitsLog();
  const askLink = { href: ask, label: shop?.holding.length ? "Get creator support" : "Ask the creator" };
  const bar = shop && shop.anyBuyable ? barOf(shop, log) : null;
  if (!bar) return <PickBar ask={askLink} pick={null} action={null} />;
  return <PickBar ask={askLink} pick={bar.pick} action={bar.action} reason={bar.reason} onChange={() => revealBuyBox()} />;
}

/** A sample product's bottom bar: its copies are the whole project's, sold on the project's screen
 *  (CL-018: a product with no copies of its own sells none). What they start at — the creator's open uses
 *  and other holders' listings — and Buy a copy, which opens the project's buy box on them (?nft=); "All
 *  copies are sold." once none is left. No copies: no bar. */
export function SampleCopiesBar({ post, id }: { post: InnovationPost; id: string }) {
  const all = useSampleSales();
  const { buyer } = useActiveBuyer();
  const physical = useHolderListings(id, "physical", null);
  const virtual = useHolderListings(id, "virtual", null);
  const market = React.useMemo<SampleMarket>(() => ({ feedId: id, post, offers: sampleOffersOf(post) }), [id, post]);
  const uses = KINDS.flatMap((k) => copyUsesOf(market, k));
  if (!post.listing || !uses.length) return null;
  const openUses = uses.filter((o) => copyUseBlockOf(o, id, all) === null);
  const others = [...physical, ...virtual].filter((r) => r.sellerId !== buyer.id);
  const open = openUses.map((o) => ({ amount: o.price, token: o.token }));
  const holders = others.map((r) => ({ amount: r.price, token: r.token }));
  const from = lowestOf([...open, ...holders]) ?? lowestOf(uses.map((o) => ({ amount: o.price, token: o.token })));
  // The kind it opens on: the first with something to buy, Physical first.
  const kind = KINDS.find((k) => openUses.some((o) => o.kind === k) || others.some((r) => r.kind === k)) ?? "physical";
  return (
    <BottomBar className="pt-6">
      <div className="flex items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>Copies from</span>
          {from && <span className={cn(T.section, "tabular-nums")}>{formatAmount(from.amount, from.token)}</span>}
        </span>
        {open.length || holders.length ? (
          <Link href={`/m/projects/${encodeURIComponent(id)}?nft=${kind}`} className={cn(buttonVariants({ size: "xl" }), "min-w-0 flex-1")}>
            Buy a copy
          </Link>
        ) : (
          <p className={cn(T.body, "min-w-0 flex-1 text-right")}>All copies are sold.</p>
        )}
      </div>
    </BottomBar>
  );
}
