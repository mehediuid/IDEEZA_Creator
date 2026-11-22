"use client";

// The project on Explore marketplace, as the active demo buyer shops it
// (Figma "Project Details · 2026 update" 18b–18h, 18j–18l; the web's
// /marketplace/[id], `useProjectPageData(id, "market")`): every listing here
// is the person's own, so a demo creator — Mira, Leo or Sam — does the buying
// with test tokens in a test wallet. The whole screen signs through the
// phone's wallet sheet (PhoneWalletScope).
// Laid out as a product page (owner 2026-11-12, as the Feed sample's page):
// · Top bar: Back; the name comes into it once the header scrolls away.
// · The clip the Feed plays on top (the project video in use, else a
//   product's; the cover while it loads or when it isn't in this browser).
// · The header: name and status chip, "Created by {the creator's name} ·
//   Listed {date}" — the page speaks to the buyer, never "you" for the
//   creator — (and "You own n%" for a holder).
// · Right under it, the marketplace: an auction's standing banner, "You own n
//   NFTs › See what you own" for anyone who holds any of it now (you-own.tsx,
//   CL-035: a copy sold on is no longer theirs), Purchase summary for a holder
//   of the Main NFT, its buy box (main-offer.tsx) with the wallet, activity and
//   Testnet demo lines in its foot, then the whole project's copies as Use rows
//   with From holders (copies.tsx; a product's own copies are its screen's).
//   Then the description.
// · Tabs Overview · Products · Media (`?tab=`, the kit's client-state tabs);
//   the Overview holds Project activity, the products, Legal information,
//   Holder benefits and About.
// · The bottom bar: the one primary for where the buyer stands — Buy now (Buy
//   another share), Place bid (Bid again), View your share, Browse other
//   projects — beside Ask the creator, or Get creator support for a holder.
//   While another checkout holds the Main NFT, Buy now waits, greyed, with
//   "Someone is buying this now. Try again in a few minutes." (CL-016).
// · 18d: a confirmed purchase ends on Purchase successful, a bid on its toast.
// Not on the marketplace (never listed, or listed in another browser): the
// web's "This project isn't on the marketplace". A Feed sample's market
// address opens the sample's own page on its Marketplace block, where it sells.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BubbleChatIcon, Coins01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { scrollWithin } from "@/components/create/anchors";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useAuctionClock } from "@/components/marketplace/bid-card";
import { useCreatorName } from "@/components/marketplace/use-creator-name";
import { usePurchase } from "@/components/marketplace/purchase-dialog";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { StatusChip } from "@/components/projects/status-chip";
import { can } from "@/lib/manual/permissions";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { sampleProjectOf, VIEWER_TABS, type PhoneTab } from "@/lib/manual/phone-project";
import { detailsRows } from "@/lib/manual/rail-copy";
import { coverOf } from "@/lib/manual/project-read";
import { headerText } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { auctionStateOf } from "@/lib/market/auction";
import { IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { readMarketNow } from "@/lib/market/market-store";
import { holdingOf } from "@/lib/market/sales";
import type { Listing, Sale } from "@/lib/market/types";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { useProjectVideos } from "@/lib/video/store";
import { PROJECT_VIDEO_KEY } from "@/lib/video/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { EmptyState } from "../../kit/state";
import { tabPanelProps, useTabParam } from "../../kit/tabs";
import { OfflineBanner } from "../../kit/states";
import { useToast } from "../../kit/toast";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { ProjectProvider, type Ready } from "../../project/context";
import { MediaTab } from "../../project/media-tab";
import { BuildCheckLine, useProductRows } from "../../project/product-rows";
import { ListCard } from "../../kit/list";
import { ProductRow, SectionHeading, SubLine } from "../../project/parts";
import { Description } from "../../project/project-screen";
import { MediaHero } from "../../project/sample-project";
import { ProductsTab } from "../../project/products-tab";
import { usePhoneWriteGate } from "../../project/write-gate";
import { PhoneWalletScope } from "../phone-wallet";
import { PhoneCopies, projectCopiesLive } from "./copies";
import { YouOwnRow } from "./you-own";
import {
  AuctionCard,
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
  LegalSection,
  ProjectActivity,
  ProjectTop,
  PurchaseDoneSheet,
  useScrolledPast,
  ViewerTabs,
  VIEWER_TABS_ID,
  type DoneFacts,
} from "./parts";
import { T } from "../../type";

export const MARKET_BANNER_BODY =
  "Every listing here is yours, so a demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.";

export function MarketScreen({ id }: { id: string }) {
  const data = useProjectPageData(id, "market");
  if (data.state === "loading") return <MarketLoading />;
  if (data.state === "missing") return <NotOnMarketplace id={id} />;
  return (
    <PhoneWalletScope>
      <MarketReady data={data} />
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
  // A Feed sample sells on its own page (`?tab=marketplace` opens its Marketplace block).
  React.useEffect(() => {
    if (sample) router.replace(`/m/projects/${encodeURIComponent(id)}?tab=marketplace`);
  }, [sample, id, router]);
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

function MarketReady({ data }: { data: Ready }) {
  const { project, view, viewer, now } = data;
  const buyerId: DemoBuyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : DEMO_BUYERS[0].id;
  const toast = useToast();
  const [tab, goTab] = useTabParam<PhoneTab>("tab", VIEWER_TABS.map((t) => t.id), "overview");
  const creator = useCreatorName();
  const gate = usePhoneWriteGate(project.id);
  const ctx = { ...data, gate, open: NO_SHEET };
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const titleGone = useScrolledPast(titleRef);
  const summaryRef = React.useRef<HTMLButtonElement>(null);
  const copiesRef = React.useRef<HTMLElement>(null);
  const [focusBid, setFocusBid] = React.useState(0);
  const [done, setDone] = React.useState<DoneFacts | null>(null);

  const listing: Listing | null = view.listing.kind === "none" ? null : view.listing.listing;
  const clock = useAuctionClock(listing?.type === "auction" ? listing.endsAt : undefined, now);
  const live = view.listing.kind === "live";
  const auction = live && listing?.type === "auction" ? auctionStateOf(listing, view.bids, clock) : null;
  const holding = holdingOf(project.id, buyerId, view.sales.filter((s) => s.item.nft === "main"));
  const canBuy = live && can(viewer, "listing.buy", view.canCtx);
  const canBid = live && auction !== null && can(viewer, "listing.bid", { ...view.canCtx, auction: auction.phase });
  const standing: BidStanding = listing && auction ? bidStandingOf(listing, auction, view.bids, buyerId) : "none";
  // The whole project's copies only: a product's own are sold on its screen (CL-018).
  const copiesLive = projectCopiesLive(view);
  const { busy, buy } = usePurchase({ project, view, buyerId });
  const holds = useCheckoutHolds();
  // Another tab's checkout holds the Main NFT: its Buy waits until that settles or lapses (CL-016).
  const mainHeld = listing !== null && holds.others(listing.id) > 0;

  const purchase = async (via: "buyNow" | "auctionBuyNow") => {
    if (!listing || busy || mainHeld) return;
    const sentence = await buy(listing, via);
    if (!sentence) return;
    const sale = newestSale(project.id, buyerId, listing.id);
    setDone({ sentence: sentence.replace(/^Purchase successful\. /, ""), transaction: sale?.txHash ?? null, paid: sale ? paidOf(sale) : null });
  };

  const text = headerText(view.summary, { viewer, context: "market" });
  // The header names the creator: every listing here is the signed-in person's own, shopped by a demo creator.
  const createdBy = (text.createdBy ?? "Created by you").replace(/^Created by you/, `Created by ${creator}`);
  const meta = [createdBy, holding ? `You own ${holding.sharePct}%` : null].filter(Boolean).join(" · ");

  // Bring a control of the marketplace block into view, inside the screen's own scroller.
  const reveal = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    scrollWithin(el, "nearest", "smooth");
    el.focus({ preventScroll: true });
  };
  const bar = (
    <MarketBar
      projectId={project.id}
      sales={view.sales}
      buyerId={buyerId}
      primary={
        live && listing?.type === "buyNow" && canBuy
          ? { kind: "buy", label: holding ? "Buy another share" : "Buy now", busy, held: mainHeld, run: () => void purchase("buyNow") }
          : auction && canBid && (standing === "none" || standing === "outbid" || standing === "leads")
            ? {
                kind: "bid",
                label: standing === "outbid" ? "Bid again" : "Place bid",
                run: () => {
                  const form = document.getElementById(BID_FORM_ID) as HTMLFormElement | null;
                  if (form) form.requestSubmit();
                  else setFocusBid((n) => n + 1);
                },
              }
            : standing === "won"
              ? {
                  kind: "share",
                  label: "View your share",
                  reason: holding ? null : "It's yours once the creator closes the auction.",
                  run: () => reveal(summaryRef.current),
                }
              : standing === "lost"
                ? { kind: "browse", label: "Browse other projects" }
                : copiesLive && !holding
                  ? {
                      kind: "copies",
                      label: "Buy now",
                      run: () => reveal(copiesRef.current?.querySelector<HTMLButtonElement>("[data-copy-buy]")),
                    }
                  : null
      }
    />
  );

  // The box's foot after the wallet line: the newest activity, and who is shopping (Change).
  const boxFoot = listing && (
    <>
      <MainActivity projectId={project.id} sales={view.sales} listedAt={listing.listedAt} />
      <DemoShopBanner body={MARKET_BANNER_BODY} line />
    </>
  );
  const boxShown = !!listing && (live && listing.type === "buyNow" ? true : auction !== null);

  return (
    <ProjectProvider value={ctx}>
      <Screen top={<TopBar back title={titleGone ? project.name : undefined} />} footer={bar}>
        <OfflineBanner />
        <ListingHero project={project} view={view} />
        <ProjectTop name={project.name} chips={<StatusChip status={view.summary.status} word={text.chip.word} />} meta={meta} description="" titleRef={titleRef} />
        <section aria-labelledby="bv-market" className="flex flex-col gap-6 px-8 pb-8">
          <h2 id="bv-market" className="sr-only">
            Marketplace
          </h2>
          {listing && auction && <StandingBanner standing={standing} listing={listing} state={auction} bids={view.bids} buyerId={buyerId} />}
          <YouOwnRow projectId={project.id} />
          {holding && can(viewer, "purchase.seeSummary", view.canCtx) && <PurchaseSummary holding={holding} toggleRef={summaryRef} />}
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
          ) : (
            <ClosedOrNothing view={view} holdsSale={holding !== null && view.listing.kind === "sold" && view.listing.sale.buyerId === buyerId} />
          )}
          {!boxShown && <DemoShopBanner body={MARKET_BANNER_BODY} line />}
          <PhoneCopies project={project} view={view} viewer={viewer} buyerId={buyerId} onBought={setDone} anchorRef={copiesRef} />
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
              />
            </div>
          )}
          {tab === "products" && <ProductsTab />}
          {tab === "media" && <MediaTab />}
        </div>
      </Screen>
      <PurchaseDoneSheet done={done} onClose={() => setDone(null)} />
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


function ClosedOrNothing({ view, holdsSale }: { view: Ready["view"]; holdsSale: boolean }) {
  const closed = closedLineOf(view);
  if (!closed || holdsSale) return null;
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

type Primary =
  | { kind: "buy" | "bid" | "copies"; label: string; busy?: boolean; held?: boolean; run: () => void }
  | { kind: "share"; label: string; reason: string | null; run: () => void }
  | { kind: "browse"; label: string }
  | null;

/** The bottom bar: the buyer's one primary beside the way to the creator (Get creator support for a
 *  holder of any sale of the project, about the newest one; else Ask the creator, about the listing). */
function MarketBar({ projectId, sales, buyerId, primary }: { projectId: string; sales: Sale[]; buyerId: DemoBuyerId; primary: Primary }) {
  const latest = sales.filter((s) => s.buyerId === buyerId).reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const href = `/m${startHref({ kind: "direct", to: ME, projectId, about: latest ? { kind: "purchase", saleId: latest.id } : { kind: "listing" } }, buyerId)}`;
  const askLabel = latest ? "Get creator support" : "Ask the creator";
  const ask = (
    <Link href={href} className={cn(buttonVariants({ hierarchy: primary ? "secondary" : "primary", size: "xl" }), "min-w-0 flex-1")}>
      <Icon icon={BubbleChatIcon} size={20} />
      {askLabel}
    </Link>
  );
  const held = primary !== null && "held" in primary && primary.held === true;
  const reason = primary?.kind === "share" ? primary.reason : held ? IN_CHECKOUT_BUYER_LINE : null;
  const reasonId = React.useId();
  // A label longer than half the bar holds ("Get creator support", "Browse other projects", "Buy another
  // share") stacks the two; stacked, the held line sits right under the button it is about.
  const stacked = primary !== null && (latest !== null || primary.label.length > 15);
  const reasonLine = reason && (
    <p id={reasonId} className={T.meta}>
      {reason}
    </p>
  );
  const button =
    primary &&
    (primary.kind === "browse" ? (
      <Link href="/m" className={cn(buttonVariants({ size: "xl" }), "min-w-0 flex-1")}>
        {primary.label}
      </Link>
    ) : (
      <Button
        size="xl"
        className={cn("min-w-0 flex-1", held && "cursor-not-allowed opacity-60")}
        iconLeading={<Icon icon={Coins01Icon} size={20} />}
        disabled={reason !== null && primary.kind === "share"}
        // Held: not `disabled`, so it keeps its focus; pressing it does nothing (CL-016).
        aria-disabled={("busy" in primary && primary.busy) || held || undefined}
        aria-describedby={held ? reasonId : undefined}
        onClick={held ? undefined : primary.run}
      >
        {primary.label}
      </Button>
    ));
  return (
    <BottomBar className="gap-2 pt-8">
      <div className={cn("flex gap-6", stacked && "flex-col gap-4")}>
        {stacked && held ? (
          <div className="flex flex-col gap-2">
            {button}
            {reasonLine}
          </div>
        ) : (
          button
        )}
        {ask}
      </div>
      {!(stacked && held) && reasonLine}
    </BottomBar>
  );
}
