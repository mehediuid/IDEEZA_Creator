"use client";

// The project on Explore marketplace, as the active demo buyer shops it
// (Figma "Project Details · 2026 update" 18b–18h, 18j–18l; the web's
// /marketplace/[id], `useProjectPageData(id, "market")`): every listing here
// is the person's own, so a demo creator — Mira, Leo or Sam — does the buying
// with test tokens in a test wallet. The whole screen signs through the
// phone's wallet sheet (PhoneWalletScope), in the owner's licence words, each
// request titled with what it buys (BuyWordsScope, D4).
// Laid out as a product page (owner 2026-11-12, as the Feed sample's page):
// · Top bar: Back; the name comes into it once the header scrolls away.
// · The clip the Feed plays on top (the project video in use, else a
//   product's; the cover while it loads or when it isn't in this browser).
// · The header: name and status chip, "Created by {the creator's name} ·
//   Listed {date}" — the page speaks to the buyer, never "you" for the
//   creator — (and "You own n%" for a holder).
// · Right under it, the marketplace: "You own n NFTs › See what you own" for
//   anyone who holds any of it now (you-own.tsx, CL-035: a copy sold on is no
//   longer theirs), Purchase summary for a holder of the Main NFT, then one buy
//   box (buy-pick.tsx; owner 2026-11-22, "Yes, build A" on study
//   Uq1VPBrq9Jjez6jeWwEkjz: the bar's Buy now bought the Main NFT even with a
//   copy on screen): Main NFT · Physical NFT · Virtual NFT, only what is sold,
//   opening on the web's tab (an address's ?nft=, else the Main NFT the buyer
//   holds, else the kind they bought last, else the first with something to
//   buy). Main NFT = an auction's standing banner, its box (main-offer.tsx)
//   with the wallet, activity and Testnet demo lines in its foot. A copy kind
//   = the whole project's copies (copies.tsx; a product's own are its
//   screen's): what it gets you, Use (Personal use / Business use) and From
//   holders as choices of one radio group. Then the description.
// · Tabs Overview · Products · Media (`?tab=`, the kit's client-state tabs);
//   the Overview holds Project activity, the products, Legal information,
//   Holder benefits, About (with Team and Network rows that push read-only
//   screens when the web shows those tabs, BUY-9) and Recent (the web's rail
//   log, public lines).
// · The bottom bar (PickBar): what is picked and its price, with Change, then
//   Ask the creator (Get creator support for a holder) as a chat icon beside
//   the one primary for the pick — Buy now (Buy another share), Place bid
//   (Bid again), View your share, Browse other projects for the Main NFT; Buy
//   now for a copy; Manage for the buyer's own holder listing. While another
//   checkout holds it, Buy now waits, greyed, with "Someone is buying this
//   now. Try again in a few minutes." (CL-016). Nothing to buy: Ask the
//   creator alone.
// · 18d: a confirmed purchase ends on Purchase successful, a bid on its toast.
// Not on the marketplace (never listed, or listed in another browser): the
// web's "This project isn't on the marketplace"; paused by its creator: "This
// project is off the marketplace for now", unless the buyer already holds part
// of it (the web's OffMarketGate, BUY-4). A Feed sample's market address opens
// the sample's own page on its Marketplace block, where it sells, on the kind
// the address asked for (`?nft=`).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { scrollWithin } from "@/components/create/anchors";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useAuctionClock } from "@/components/marketplace/bid-card";
import { listedKindsOf } from "@/components/marketplace/copy-panel";
import { useCreatorName } from "@/components/marketplace/use-creator-name";
import { useEditionPurchase, usePurchase, type EditionTier } from "@/components/marketplace/purchase-dialog";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { StatusChip } from "@/components/projects/status-chip";
import { can } from "@/lib/manual/permissions";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { offMarketNow, sampleProjectOf, VIEWER_TABS, type PhoneTab } from "@/lib/manual/phone-project";
import { MARKET_VIEW } from "@/lib/manual/phone-product";
import { detailsRows } from "@/lib/manual/rail-copy";
import { coverOf } from "@/lib/manual/project-read";
import { headerText } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { auctionStateOf } from "@/lib/market/auction";
import { askedTabOf, buyTitleOf, copyBarLine, copyPickTitle, holderPickTitle, MAIN_PICK_TITLE, mainBarLine, openingTabOf, pickedChoiceOf, type PickTab } from "@/lib/market/buy-pick";
import { IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf, tracksOf } from "@/lib/market/editions";
import { readMarketNow } from "@/lib/market/market-store";
import type { Resale } from "@/lib/market/resales";
import { holdingOf } from "@/lib/market/sales";
import { USE_LABEL } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionKind, type Listing, type Sale } from "@/lib/market/types";
import { unitsAllowanceOf, type UnitsUse } from "@/lib/market/units";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY } from "@/lib/video/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { EmptyState } from "../../kit/state";
import { tabPanelProps, useTabParam } from "../../kit/tabs";
import { OfflineBanner } from "../../kit/states";
import { useToast } from "../../kit/toast";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { useShareAction } from "../../feed/share-action";
import { shareItemId } from "@/lib/innovations/share-items";
import { ProjectProvider, type Ready } from "../../project/context";
import { ProjectRecent } from "../../project/overview";
import { MediaTab } from "../../project/media-tab";
import { BuildCheckLine, ProductLinkQueryProvider, useProductRows } from "../../project/product-rows";
import { ListCard } from "../../kit/list";
import { ProductRow, SectionHeading, SubLine } from "../../project/parts";
import { Description } from "../../project/project-screen";
import { MediaHero } from "../../project/sample-project";
import { ProductsTab } from "../../project/products-tab";
import { usePhoneWriteGate } from "../../project/write-gate";
import { PhoneWalletScope } from "../phone-wallet";
import { OffMarket } from "../../product/states";
import { BUY_BOX_ID, PickBar, PickTabs, revealBuyBox, type BarAction, type BarPick } from "./buy-pick";
import { BuyWordsScope, CopyPanel, copyUseChoicesOf, doneFactsOf, useBuyTitle, type HolderChoiceOf, type UseChoiceOf } from "./copies";
import { heldCopiesOf } from "./held";
import { holderFactsOf, useHolderBuy, useHolderListings } from "./holder-offers";
import { YouOwnRow } from "./you-own";
import { useBuyerAboutLinks } from "./about-screens";
import {
  AuctionCard,
  auctionBarLineOf,
  BID_FORM_ID,
  bidStandingOf,
  BuyNowCard,
  closedLineOf,
  MainActivity,
  PurchaseSummary,
  StandingBanner,
  type BidStanding,
} from "./main-offer";
import {
  AboutRows,
  ClosedCard,
  DemoShopBanner,
  HolderBenefits,
  IconLine,
  LegalSection,
  ProjectActivity,
  ProjectTop,
  PurchaseDoneSheet,
  useScrolledPast,
  ViewerTabs,
  VIEWER_TABS_ID,
  WalletLine,
  type DoneFacts,
} from "./parts";
import { T } from "../../type";

export const MARKET_BANNER_BODY =
  "Every listing here is yours, so a demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.";

const KINDS: EditionKind[] = ["physical", "virtual"];
const BOX_TABS = "bv-buy";
const SUMMARY_ID = "bv-summary";

export function MarketScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "market");
  if (data.state === "loading") return <MarketLoading />;
  if (data.state === "missing") return <NotOnMarketplace id={id} />;
  // BUY-4: a paused listing is off the marketplace (the web's OffMarketGate), unless the buyer holds part of it.
  const shopper = data.viewer.kind === "demo-buyer" ? data.viewer.buyerId : null;
  if (offMarketNow({ listing: data.view.listing.kind, projectId: data.project.id, sales: data.view.sales, buyerId: shopper })) return <OffMarket paused />;
  return (
    <PhoneWalletScope>
      <BuyWordsScope>
        <MarketReady data={data} />
      </BuyWordsScope>
    </PhoneWalletScope>
  );
}

function MarketLoading() {
  return (
    <Screen top={<TopBar back />}>
      <div role="status" aria-label="Loading the listing" className="flex flex-col gap-6 px-8 pb-8">
        <Skeleton shape="block" className="h-[84px] w-full" />
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[40px] w-full" />
        <Skeleton shape="block" className="h-[320px] w-full" />
      </div>
    </Screen>
  );
}

function NotOnMarketplace({ id }: { id: string }) {
  const router = useRouter();
  const sample = sampleProjectOf(id) !== null;
  // The kind a link asked for (Buy another Virtual NFT, BUY-5) goes along, so the sample's box opens on it.
  const asked = askedTabOf(useSearchParams().get("nft"));
  // A Feed sample sells on its own page (`?tab=marketplace` opens its Marketplace block).
  React.useEffect(() => {
    if (sample) router.replace(`/m/projects/${encodeURIComponent(id)}?tab=marketplace${asked ? `&nft=${asked}` : ""}`);
  }, [sample, id, router, asked]);
  if (sample) return <MarketLoading />;
  return (
    <Screen top={<TopBar back />} className="px-8 pb-8">
      <EmptyState
        icon={Store01Icon}
        title="This project isn't on the marketplace"
        body="This page shows only projects their creator added to Explore marketplace. This one may never have been listed, or it was listed in a different browser."
        action={{ label: "Browse the Feed", href: "/m" }}
      />
    </Screen>
  );
}

/** "Paid": the price and its network fee, as the purchase summary says them. */
export function paidOf(sale: Sale): string {
  return `${formatAmount(sale.price, sale.token)} (+ ${formatAmount(sale.fees.network.amount, sale.fees.network.coin)} network fee)`;
}

/** The newest sale this buyer made of this project (in the store as it is now), optionally of one listing. */
function newestSale(projectId: string, buyerId: DemoBuyerId, listingId?: string): Sale | null {
  return (
    readMarketNow()
      .sales.filter((s) => s.projectId === projectId && s.buyerId === buyerId && (!listingId || s.listingId === listingId))
      .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null) ?? null
  );
}

const NO_SHEET = () => {};

/** One thing the box can pick: the Main NFT, a copy of one use, or another holder's copy. */
type MarketChoice = { type: "main"; key: "main"; tab: "main"; open: boolean } | UseChoiceOf | HolderChoiceOf;

/** What the bar says is picked, its one primary, and why that primary waits (if it does). */
type Bar = { pick: BarPick; action: BarAction; reason: string | null };

const offAction = (label: string): BarAction => ({ kind: "button", label, run: NO_SHEET, disabled: true });

function MarketReady({ data }: { data: Ready }) {
  const { project, view, viewer, now } = data;
  const buyerId: DemoBuyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : DEMO_BUYERS[0].id;
  const toast = useToast();
  const setBuyTitle = useBuyTitle();
  const params = useSearchParams();
  const [tab, goTab] = useTabParam<PhoneTab>("tab", VIEWER_TABS.map((t) => t.id), "overview");
  const creator = useCreatorName();
  const gate = usePhoneWriteGate(project.id);
  const ctx = { ...data, gate, open: NO_SHEET };
  const headRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(headRef);
  // Share (owner 2026-11-22): the listing can be shared to your Feed while it is on the Marketplace.
  const share = useShareAction(shareItemId("mine", project.id));
  const [focusBid, setFocusBid] = React.useState(0);
  const [done, setDone] = React.useState<DoneFacts | null>(null);
  const [pickedTab, setPickedTab] = React.useState<PickTab | null>(null);
  const [picks, setPicks] = React.useState<Partial<Record<PickTab, string>>>({});
  const asked = askedTabOf(params.get("nft"));

  const listing: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const clock = useAuctionClock(listing?.type === "auction" ? listing.endsAt : undefined, now);
  const live = view.listing.kind === "live";
  const auction = live && listing?.type === "auction" ? auctionStateOf(listing, view.bids, clock) : null;
  const holding = holdingOf(project.id, buyerId, view.sales.filter((s) => s.item.nft === "main"));
  const holdsSale = holding !== null && view.listing.kind === "sold" && view.listing.sale.buyerId === buyerId;
  const canBuy = live && can(viewer, "listing.buy", view.canCtx);
  const canBid = live && auction !== null && can(viewer, "listing.bid", { ...view.canCtx, auction: auction.phase });
  const copyCan = can(viewer, "listing.buy", { ...view.canCtx, listingLive: true });
  const standing: BidStanding = listing && auction ? bidStandingOf(listing, auction, view.bids, buyerId) : "none";
  const { busy, buy } = usePurchase({ project, view, buyerId });
  const copyBuy = useEditionPurchase({ project, view, buyerId, versionless: true });
  const holderBuy = useHolderBuy({ onBought: setDone });
  const holds = useCheckoutHolds();
  const resales = useResales();
  const log = useUnitsLog();
  const physical = useHolderListings(project.id, "physical", null);
  const virtual = useHolderListings(project.id, "virtual", null);
  // Another tab's checkout holds the Main NFT: its Buy waits until that settles or lapses (CL-016).
  const mainHeld = listing !== null && holds.others(listing.id) > 0;

  // A link that asks for a tab (?nft=) opens with the box in view.
  React.useEffect(() => {
    if (!asked) return;
    const t = window.setTimeout(() => revealBuyBox("auto"), 60);
    return () => window.clearTimeout(t);
  }, [asked]);

  // Every buy asks the wallet with its title set (D4), cleared once the request is on its way.
  const titledRun = <R,>(title: string, run: () => Promise<R>): Promise<R> => {
    setBuyTitle(title);
    try {
      return run();
    } finally {
      setBuyTitle(null);
    }
  };

  const purchase = async (via: "buyNow" | "auctionBuyNow") => {
    if (!listing || busy || mainHeld) return;
    const sentence = await titledRun(buyTitleOf({ kind: "main", sharePct: listing.percentSelling }), () => buy(listing, via));
    if (!sentence) return;
    const sale = newestSale(project.id, buyerId, listing.id);
    setDone({ sentence: sentence.replace(/^Purchase successful\. /, ""), transaction: sale?.txHash ?? null, paid: sale ? paidOf(sale) : null });
  };

  // A copy of one use at the listing's Price; where the Sell flow's "Price with future updates" was left
  // empty (the same price), the updates come with it, as on the web.
  const buyUse = async (c: UseChoiceOf) => {
    const track = c.track;
    if (!track || copyBuy.busyId || c.held) return;
    const tier: EditionTier = track.listing.regular === track.listing.extended ? "extended" : "regular";
    const sentence = await titledRun(buyTitleOf({ kind: "use", copy: c.tab, use: USE_LABEL[c.use] }), () => copyBuy.buy(track, tier));
    if (sentence) setDone(doneFactsOf(sentence, project.id, buyerId, track.id));
  };

  const buyHolder = (r: Resale) => {
    const f = holderFactsOf(r, buyerId, log);
    void holderBuy.buy(r, buyTitleOf({ kind: "holder", copy: r.kind, number: f.number, use: f.use, seller: f.seller }));
  };

  // View your share: the Purchase summary's All details, brought into view inside the screen's own scroller.
  const revealSummary = () => {
    const el = document.getElementById(SUMMARY_ID)?.querySelector<HTMLElement>("button[aria-controls]");
    if (!el) return;
    scrollWithin(el, "nearest", "smooth");
    el.focus({ preventScroll: true });
  };

  // The tabs: the Main NFT while there is a listing, then each kind the whole project sells or someone
  // sells on (a copy needs the collection's chain).
  const chain = editionChainOf(view.mint.record, listing, null);
  const holdersOf = (k: EditionKind) => (k === "physical" ? physical : virtual);
  const listedKinds = chain ? listedKindsOf(view, PROJECT_SCOPE) : [];
  const kinds = KINDS.filter((k) => listedKinds.includes(k) || holdersOf(k).length > 0);
  const tabs: PickTab[] = [...(listing ? (["main"] as const) : []), ...kinds];
  const usesOf = (k: EditionKind) => (chain ? copyUseChoicesOf(view, k, (id) => holds.others(id)) : []);
  const choicesOf = (t: PickTab): MarketChoice[] =>
    t === "main"
      ? listing
        ? [{ type: "main", key: "main", tab: "main", open: true }]
        : []
      : [...usesOf(t), ...holdersOf(t).map((r): HolderChoiceOf => ({ type: "holder", key: `holder:${r.id}`, tab: t, open: true, resale: r }))];
  const buyableCopy = (c: MarketChoice) => (c.type === "use" ? c.open && copyCan : c.type === "holder" && c.resale.sellerId !== buyerId);

  // The Main NFT's primary, today's labels and rules: null when it has none (sold, paused, ended).
  const placeBid = () => {
    const form = document.getElementById(BID_FORM_ID) as HTMLFormElement | null;
    if (form) form.requestSubmit();
    else setFocusBid((n) => n + 1);
  };
  const mainPrice =
    view.listing.kind === "sold" ? formatAmount(view.listing.sale.price, view.listing.sale.token) : listing ? formatAmount(listing.price ?? listing.minBid ?? "0", listing.token) : "";
  const mainPick: BarPick | null = listing
    ? { title: MAIN_PICK_TITLE, line: auction ? auctionBarLineOf(listing, auction, standing) : mainBarLine(mainPrice, listing.percentSelling) }
    : null;
  const mainBar: Bar | null = !listing || !mainPick
    ? null
    : listing.type === "buyNow" && live && canBuy
      ? {
          pick: mainPick,
          action: { kind: "button", label: holding ? "Buy another share" : "Buy now", busy, held: mainHeld, run: () => void purchase("buyNow") },
          reason: mainHeld ? IN_CHECKOUT_BUYER_LINE : null,
        }
      : auction && canBid && (standing === "none" || standing === "outbid" || standing === "leads")
        ? { pick: mainPick, action: { kind: "button", label: standing === "outbid" ? "Bid again" : "Place bid", run: placeBid }, reason: null }
        : standing === "won"
          ? {
              pick: mainPick,
              action: { kind: "button", label: "View your share", disabled: holding === null, run: revealSummary },
              reason: holding ? null : "It's yours once the creator closes the auction.",
            }
          : standing === "lost"
            ? { pick: mainPick, action: { kind: "link", label: "Browse other projects", href: "/m" }, reason: null }
            : null;
  // Picked while it has no primary (other tabs still sell): greyed, with why.
  const mainOff: Bar | null = mainPick && {
    pick: mainPick,
    action: offAction(listing?.type === "auction" ? "Place bid" : "Buy now"),
    reason: view.listing.kind === "sold" ? (holdsSale ? "You own the Main NFT." : "The Main NFT is sold.") : (closedLineOf(view)?.title ?? (auction ? "The auction ended." : null)),
  };
  const mainBuyable = mainBar !== null && standing !== "lost";

  // Opening tab (D1): the address's ?nft=, else the Main NFT the buyer holds, else the kind they bought
  // last (the whole project's copies they hold now), else the first with something to buy.
  const scopeTracks = new Set(tracksOf(PROJECT_SCOPE, view.editions).map((t) => t.id));
  const heldKinds: PickTab[] = [
    ...(holding ? holding.sales.map((s) => ({ tab: "main" as PickTab, at: s.at })) : []),
    ...heldCopiesOf(view.sales, buyerId, resales, (s) => scopeTracks.has(s.item.trackId)).map((s) => ({ tab: s.item.nft as PickTab, at: s.at })),
  ]
    .sort((a, b) => a.at - b.at)
    .map((e) => e.tab);
  const opening = openingTabOf({ tabs, asked, heldKinds, buyable: (t) => (t === "main" ? mainBuyable : choicesOf(t).some(buyableCopy)) });
  const boxTab = pickedTab && tabs.includes(pickedTab) ? pickedTab : opening;
  const picked = boxTab ? pickedChoiceOf(choicesOf(boxTab), picks[boxTab] ?? null) : null;
  const pick = (c: MarketChoice) => setPicks((m) => ({ ...m, [c.tab]: c.key }));

  // What a copy pick says on the bar, and its Buy now (Manage for the buyer's own holder listing).
  const copyBarOf = (c: UseChoiceOf | HolderChoiceOf): Bar => {
    if (c.type === "holder") {
      const f = holderFactsOf(c.resale, buyerId, log);
      const holderPick = { title: holderPickTitle(c.tab, f.number, f.use), line: `${f.price} · ${f.line}` };
      if (f.mine) return { pick: holderPick, action: { kind: "link", label: "Manage", href: f.manageHref }, reason: null };
      return { pick: holderPick, action: { kind: "button", label: "Buy now", busy: holderBuy.busyId === c.resale.id, run: () => buyHolder(c.resale) }, reason: null };
    }
    const use = USE_LABEL[c.use];
    const title = copyPickTitle(c.tab, use);
    if (!c.track) return { pick: { title, line: "Not on sale" }, action: offAction("Buy now"), reason: "This use isn't on sale. Pick another, or a holder's copy." };
    const track = c.track;
    const price = formatAmount(track.listing.regular, track.listing.token);
    const usePick = { title, line: copyBarLine(price, c.tab, c.tab === "physical" ? unitsAllowanceOf(use as UnitsUse) : null) };
    if (!c.open) return { pick: usePick, action: offAction("Buy now"), reason: "This use is sold out. Pick another, or a holder's copy." };
    return {
      pick: usePick,
      action: { kind: "button", label: "Buy now", busy: copyBuy.busyId === track.id, held: c.held, disabled: !copyCan, run: () => void buyUse(c) },
      reason: c.held ? IN_CHECKOUT_BUYER_LINE : null,
    };
  };

  const anyAction = mainBar !== null || kinds.some((k) => choicesOf(k).some(buyableCopy));
  const bar: Bar | null = !anyAction || !picked ? null : picked.type === "main" ? (mainBar ?? mainOff) : copyBarOf(picked);

  // Ask the creator, or Get creator support for a holder of any sale of the project (about the newest one).
  const latest = view.sales.filter((s) => s.buyerId === buyerId).reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const ask = {
    href: `/m${startHref({ kind: "direct", to: ME, projectId: project.id, about: latest ? { kind: "purchase", saleId: latest.id } : { kind: "listing" } }, buyerId)}`,
    label: latest ? "Get creator support" : "Ask the creator",
  };

  // About's Team and Network rows (BUY-9): the web's Team and Network tabs for this buyer.
  const aboutLinks = useBuyerAboutLinks(data, "market");

  const text = headerText(view.summary, { viewer, context: "market" });
  // The header names the creator: every listing here is the signed-in person's own, shopped by a demo creator.
  const createdBy = (text.createdBy ?? "Created by you").replace(/^Created by you/, `Created by ${creator}`);
  const meta = [createdBy, holding ? `You own ${holding.sharePct}%` : null].filter(Boolean).join(" · ");

  // The Main NFT box's foot after the wallet line: the newest activity, and who is shopping (Change).
  const boxFoot = listing && (
    <>
      <MainActivity projectId={project.id} sales={view.sales} listedAt={listing.listedAt} />
      <DemoShopBanner body={MARKET_BANNER_BODY} line />
    </>
  );
  const boxShown = !!listing && (live && listing.type === "buyNow" ? true : auction !== null);

  const mainPanel = (
    <>
      {listing && auction && <StandingBanner standing={standing} listing={listing} state={auction} bids={view.bids} buyerId={buyerId} />}
      {listing && live && listing.type === "buyNow" ? (
        <div className="flex flex-col gap-4">
          {holding && <h3 className={T.section}>Buy another share</h3>}
          <BuyNowCard listing={listing} view={view} buyerId={buyerId} foot={boxFoot} />
        </div>
      ) : listing && auction ? (
        <AuctionCard
          project={project}
          listing={listing}
          view={view}
          state={auction}
          clock={clock}
          buyerId={buyerId}
          canBid={canBid}
          canBuy={canBuy}
          buyBusy={busy}
          buyHeld={mainHeld}
          onBuyNow={() => void purchase("auctionBuyNow")}
          onPlaced={(sentence) => toast({ title: sentence })}
          focusBid={focusBid}
          foot={boxFoot}
        />
      ) : holdsSale ? (
        <ClosedCard title="You own the Main NFT." detail="It opens from See what you own, above." />
      ) : (
        <ClosedOrNothing view={view} />
      )}
      {!boxShown && <DemoShopBanner body={MARKET_BANNER_BODY} line />}
    </>
  );

  // A copy tab's foot: who is paying (the picked choice's coin), and who is shopping.
  const copyFoot = (k: EditionKind) => {
    const first = usesOf(k).find((c) => c.track)?.track?.listing.token;
    const coin = picked?.type === "use" && picked.track ? picked.track.listing.token : picked?.type === "holder" ? picked.resale.token : (first ?? "ETH");
    const network = picked?.type === "holder" ? picked.resale.network : chain?.network;
    return (
      <>
        {network && (
          <IconLine icon={Wallet01Icon}>
            <WalletLine buyerId={buyerId} token={coin} network={network} verb="buy" />
          </IconLine>
        )}
        <DemoShopBanner body={MARKET_BANNER_BODY} line />
      </>
    );
  };

  const footer = bar ? (
    <PickBar ask={ask} pick={bar.pick} action={bar.action} reason={bar.reason} onChange={() => revealBuyBox()} />
  ) : (
    <PickBar ask={ask} pick={null} action={null} />
  );

  return (
    <ProjectProvider value={ctx}>
      <ProductLinkQueryProvider value={`view=${MARKET_VIEW}`}>
      <Screen top={<TopBar back title={titleGone ? project.name : undefined} actions={share.action ? [share.action] : []} />} footer={footer}>
        <OfflineBanner />
        <ListingHero project={project} view={view} />
        <ProjectTop name={project.name} chips={<StatusChip status={view.summary.status} word={text.chip.word} />} meta={meta} description="" titleRef={headRef} />
        <section aria-labelledby="bv-market" className="flex flex-col gap-6 px-8 pb-8">
          <h2 id="bv-market" className="sr-only">
            Marketplace
          </h2>
          <YouOwnRow projectId={project.id} />
          {holding && can(viewer, "purchase.seeSummary", view.canCtx) && (
            <div id={SUMMARY_ID}>
              <PurchaseSummary holding={holding} />
            </div>
          )}
          {boxTab ? (
            <div id={BUY_BOX_ID} className="flex scroll-mt-[56px] flex-col gap-6">
              <PickTabs tabs={tabs} value={boxTab} onChange={setPickedTab} idBase={BOX_TABS} />
              <div {...(tabs.length > 1 ? tabPanelProps(BOX_TABS, boxTab) : {})} className="flex flex-col gap-6 outline-none">
                {boxTab === "main" ? (
                  mainPanel
                ) : (
                  <CopyPanel
                    project={project}
                    view={view}
                    kind={boxTab}
                    uses={usesOf(boxTab)}
                    holders={choicesOf(boxTab).filter((c): c is HolderChoiceOf => c.type === "holder")}
                    buyerId={buyerId}
                    pickedKey={picked?.key ?? null}
                    onPick={pick}
                    foot={copyFoot(boxTab)}
                  />
                )}
              </div>
            </div>
          ) : (
            <DemoShopBanner body={MARKET_BANNER_BODY} line />
          )}
        </section>
        {project.description.trim() && (
          <div className="px-8 pb-8">
            <Description text={project.description} />
          </div>
        )}
        <ViewerTabs tabs={VIEWER_TABS} tab={tab} onChange={goTab} />
        <div {...tabPanelProps(VIEWER_TABS_ID, tab)} className="px-8 pb-12 pt-8 outline-none">
          {tab === "overview" && (
            <div className="flex flex-col gap-12">
              <ProjectActivity projectId={project.id} createdAt={project.createdAt} />
              <ProductsSection seeAll={`${phoneMarketHref(project.id)}?tab=products`} />
              <LegalSection legal={project.legal} />
              <HolderBenefits listing={view.listing} />
              <AboutRows
                rows={detailsRows({ source: view.summary.source, when: view.summary.when, createdAt: project.createdAt, ownerFacts: false }).map((r) => ({
                  label: r.label,
                  value: r.value.map((m) => (m.kind === "time" ? m.time.text : m.text)).join(""),
                }))}
                links={aboutLinks}
              />
              <ProjectRecent />
            </div>
          )}
          {tab === "products" && <ProductsTab />}
          {tab === "media" && <MediaTab />}
        </div>
        {share.sheets}
      </Screen>
      <PurchaseDoneSheet done={done} onClose={() => setDone(null)} />
      </ProductLinkQueryProvider>
    </ProjectProvider>
  );
}

/** The clip the Feed plays for this project (feed/use-clips.ts): the project video in use (two or
 *  more products), else the first product's; the cover while it loads, or when its file isn't in
 *  this browser. */
function ListingHero({ project, view }: { project: ManualProject; view: Ready["view"] }) {
  const { record } = useProjectVideos(project.id);
  const takeOf = (key: string) => {
    const pv = record?.products[key];
    return pv?.inUseId && pv.takes.some((t) => t.id === pv.inUseId) ? pv.inUseId : null;
  };
  const current = view.products.filter((p) => p.dropped === null);
  // One product: its video is the project's (owner, 2026-11-17).
  const own = current.length >= 2 ? takeOf(PROJECT_VIDEO_KEY) : null;
  const take = own ?? current.map((p) => takeOf(p.id)).find((t) => t !== null) ?? null;
  const clip = useClipUrl(take);
  const src = take && clip.state === "ready" ? clip.url : null;
  return (
    <MediaHero
      video={src ? { src, alt: `${project.name} video` } : null}
      picture={(src ? clip.posterUrl : null) ?? coverOf(project, view.refs)}
      name={project.name}
    />
  );
}

/** How a listing that can't be bought now ended (paused, removed, no bids, sold). */
function ClosedOrNothing({ view }: { view: Ready["view"] }) {
  const closed = closedLineOf(view);
  if (!closed) return null;
  return <ClosedCard title={closed.title} detail={closed.detail} />;
}

/** The Overview's products: the count and pieces line, the Build check, the first three rows. */
export function ProductsSection({ seeAll }: { seeAll: string }) {
  const { rows, line, headline } = useProductRows();
  return (
    <section aria-labelledby="bv-products" className="flex flex-col gap-4">
      <SectionHeading id="bv-products" title="Products" link={rows.length ? { href: seeAll, label: "See all", aria: "See all products" } : undefined} />
      <SubLine>{line}</SubLine>
      <BuildCheckLine headline={headline} />
      {rows.length > 0 && (
        <ListCard label="Products">
          {rows.slice(0, 3).map((r) => (
            <ProductRow key={r.id} href={r.href} thumb={r.thumb} name={r.name} stage={r.stage} meta={r.meta} facts={r.facts} />
          ))}
        </ListCard>
      )}
    </section>
  );
}
