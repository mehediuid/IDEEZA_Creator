"use client";

// Buying another creator's shared project from the Feed (Figma "Project
// Details · 2026 update" 18b–18e on a sample project, `/m/projects/p1`; the
// lead's decision 2026-11-05): as on one's own listing, a demo creator — Mira,
// Leo or Sam, "Testnet demo · shopping as Mira" — does the buying with test
// tokens. The sample's listing rows are its offers (Main NFT = the whole
// project, then its copies); a purchase is the demo wallet's request in the
// phone's sheet, paid from the buyer's demo balance, and recorded in
// `ideeza:market:phone-sample-sales` (lib/market/phone-sample-sales.ts). The
// page then shows what the active buyer holds (Purchase summary) and the bar
// turns to Get creator support. Samples sell by Buy now only.
//
// sample-project.tsx mounts the pieces: SampleShop around its screen, the
// banner over its header, SampleMarketSection in its Overview (the Feed's
// `?tab=marketplace` scrolls to it) and SampleShopBar as its bottom bar.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BubbleChatIcon, Coins01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { estimateGas } from "@/lib/commerce/gas";
import { SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import type { InnovationPost } from "@/lib/innovations/types";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
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
  serialText,
  STORAGE_FULL,
  withSampleSale,
  type SampleOffer,
  type SampleSale,
} from "@/lib/market/phone-sample-sales";
import { randomId } from "@/lib/market/sales";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { LIST_CARD } from "../../kit/list";
import { SectionHeading } from "../../project/parts";
import { PhoneWalletScope } from "../phone-wallet";
import { readSampleSales, useSampleSales, writeSampleSales } from "./sample-sales-store";
import { CardNote, ClosedCard, DemoShopBanner, Disclosure, NftActivityLine, OfferCard, OfferRowsCard, PurchaseDoneSheet, WalletLine, type DoneFacts } from "./parts";
import { T } from "../../type";

/** The web's words for a project sold in full (lib/market/purchase.ts). */
const LOCKED = "This project was sold in full, so its NFTs aren't for sale any more.";
const SAMPLE_BANNER_BODY = "A demo creator does the buying — test tokens in a test wallet. Nothing is sent to a blockchain.";

type Shop = {
  post: InnovationPost;
  id: string;
  offers: SampleOffer[];
  /** This project's sales, oldest first. */
  sales: SampleSale[];
  buyerId: DemoBuyerId;
  holding: SampleSale[];
  busy: SampleOffer["kind"] | null;
  buy: (offer: SampleOffer) => void;
};

/** The Marketplace block's id: the bar's Buy now brings the copies into view by it. */
const SECTION_ID = "sample-market";

const Ctx = React.createContext<Shop | null>(null);

function useShop(): Shop | null {
  return React.useContext(Ctx);
}

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
  const [busy, setBusy] = React.useState<SampleOffer["kind"] | null>(null);
  const [done, setDone] = React.useState<DoneFacts | null>(null);

  const buy = React.useCallback(
    async (offer: SampleOffer) => {
      if (busy) return;
      const req = sampleRequestOf({ title: post.title, offer, buyerId: buyer.id, serial: nextSampleSerial(offer, id, readSampleSales()) });
      setBusy(offer.kind);
      try {
        const result = await request(req, {
          recheck: () => sampleBuyBlock(offer, id, readSampleSales()),
          commit: (proof) => {
            const now = readSampleSales();
            const sale = makeSampleSale({
              id: randomId("psale"),
              projectId: id,
              offer,
              buyerId: buyer.id,
              buyerAddress: proof.address,
              serial: nextSampleSerial(offer, id, now),
              txHash: proof.txHash ?? "",
              at: proof.at,
            });
            const next = withSampleSale(now, offer, sale);
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
            paid: `${formatAmount(offer.price, offer.token)} (+ ${formatAmount(String(gas.fee), gas.native)} network fee)`,
          });
        }
      } finally {
        setBusy(null);
      }
    },
    [busy, post.title, buyer.id, id, request],
  );

  const shop = React.useMemo<Shop>(
    () => ({ post, id, offers, sales, buyerId: buyer.id, holding: sampleHoldingOf(id, buyer.id, sales), busy, buy: (o) => void buy(o) }),
    [post, id, offers, sales, buyer.id, busy, buy],
  );
  return (
    <Ctx.Provider value={shop}>
      {children}
      <PurchaseDoneSheet done={done} onClose={() => setDone(null)} />
    </Ctx.Provider>
  );
}

/** "Testnet demo · shopping as Mira" over the header, while the project is on sale. */
export function SampleShopBanner() {
  return useShop() ? <DemoShopBanner body={SAMPLE_BANNER_BODY} /> : null;
}

/** The Overview's Marketplace block: what the active buyer holds, the Main NFT, the copies. */
export function SampleMarketSection() {
  const shop = useShop();
  const params = useSearchParams();
  const wantsMarket = params.get("tab") === "marketplace";
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (wantsMarket) ref.current?.scrollIntoView({ block: "start" });
  }, [wantsMarket]);
  if (!shop) return null;
  const { post, id, offers, sales, buyerId, holding, busy, buy } = shop;
  const main = offers.find((o) => o.kind === "main") ?? null;
  const copies = offers.filter((o) => o.kind !== "main");
  const mainState = main ? offerStateOf(main, id, sales) : null;
  const mainSale = mainState?.soldTo ?? null;
  return (
    <section
      ref={ref}
      id={SECTION_ID}
      aria-labelledby="sv-market"
      className="flex scroll-mt-[48px] flex-col gap-4"
    >
      <SectionHeading id="sv-market" title="Marketplace" />
      {holding.length > 0 && <SamplePurchaseSummary holding={holding} creator={post.creator.name} copies={copies} />}
      {main &&
        (mainSale ? (
          mainSale.buyerId === buyerId ? null : (
            <ClosedCard title={`Sold on ${formatDate(mainSale.at)}.`} detail={`Sold for ${formatAmount(mainSale.price, mainSale.token)} · the whole project`} />
          )
        ) : (
          <OfferCard
            title={`Buy now · ${formatAmount(main.price, main.token)}`}
            sub="Main NFT · the whole project"
            rows={[
              { label: "Listing type", value: "Buy now" },
              { label: "Price", value: formatAmount(main.price, main.token) },
              { label: "Selling percentage", value: "100%" },
              { label: "Blockchain", value: networkLabelOf(SAMPLE_NETWORK) },
            ]}
            foot={
              <>
                <WalletLine buyerId={buyerId} token={main.token} network={SAMPLE_NETWORK} verb="buy" />
                <CardNote>{SHARE_SALE_NOTE}</CardNote>
              </>
            }
          />
        ))}
      {main && (
        <NftActivityLine
          heading="Main NFT activity"
          line={mainSale ? `Bought by ${buyerLabel(mainSale.buyerId)} · ${formatAmount(mainSale.price, mainSale.token)} · ${formatDate(mainSale.at)}` : "No activity yet"}
        />
      )}
      {copies.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className={T.section}>Whole project</h3>
          {copies.map((o) => {
            const state = offerStateOf(o, id, sales);
            const why = sampleBuyBlock(o, id, sales);
            const last = sales.filter((s) => s.kind === o.kind).at(-1) ?? null;
            return (
              <section key={o.kind} aria-label={o.name} className={cn(LIST_CARD, "gap-4 p-6")}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className={cn(T.rowTitle, "min-w-0")}>{o.name}</span>
                  {state.count !== null && state.of !== null && (
                    <span className={cn(T.meta, "shrink-0 tabular-nums")}>{state.soldOut ? "Sold out" : `${state.count} of ${state.of} sold`}</span>
                  )}
                </div>
                <p className={T.meta}>
                  {last ? `Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}` : "No activity yet"}
                </p>
                {state.locked ? (
                  <p className={T.body}>{LOCKED}</p>
                ) : state.soldOut ? (
                  <p className={T.body}>{`All ${state.of} are sold.`}</p>
                ) : (
                  <Button
                    hierarchy="secondary"
                    size="xl"
                    className="w-full"
                    data-copy-buy=""
                    aria-disabled={busy !== null || why !== null || undefined}
                    onClick={() => {
                      if (busy === null && why === null) buy(o);
                    }}
                  >
                    {`Buy now · ${formatAmount(o.price, o.token)}`}
                  </Button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** What the active buyer holds of this sample, newest first. */
function SamplePurchaseSummary({ holding, creator, copies }: { holding: SampleSale[]; creator: string; copies: SampleOffer[] }) {
  const [open, setOpen] = React.useState(true);
  const id = React.useId();
  return (
    <section aria-label="Purchase summary" className="flex flex-col gap-4">
      <Disclosure title="Purchase summary" open={open} onToggle={() => setOpen((v) => !v)} controls={id} className="w-full justify-between" />
      <div id={id} hidden={!open} className="flex flex-col gap-4">
        {holding.map((s) => (
          <OfferRowsCard
            key={s.id}
            label={s.name}
            rows={[
              { label: "NFT type", value: s.name },
              s.kind === "main"
                ? { label: "Your share", value: "100% of the project" }
                : { label: "Copy", value: s.serial !== null ? serialText(s.serial, copies.find((o) => o.kind === s.kind)?.sold?.of ?? null) : "—" },
              { label: "Blockchain", value: networkLabelOf(s.network) },
              { label: "Price paid", value: `${formatAmount(s.price, s.token)} (+ ${formatAmount(s.networkFee, s.token)} network fee)` },
              { label: "Purchased from", value: creator },
              { label: "Transaction", value: `${shortAddress(s.txHash)} · Demo` },
              { label: "Purchased", value: formatDateTime(s.at) },
            ]}
          />
        ))}
        <p className={T.meta}>Not on a blockchain — this is a testnet demo.</p>
      </div>
    </section>
  );
}

/** The bottom bar: Buy now (the Main NFT, else the copies) beside Ask the creator — Get creator
 *  support once the active buyer holds any of it. With nothing left to buy, the way to the creator
 *  is the bar's one button. */
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
  const { offers, id, sales, holding, busy, buy } = shop;
  const main = offers.find((o) => o.kind === "main" && sampleBuyBlock(o, id, sales) === null) ?? null;
  const copy = offers.some((o) => o.kind !== "main" && sampleBuyBlock(o, id, sales) === null);
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
            const el = document.getElementById(SECTION_ID);
            el?.scrollIntoView({ block: "start" });
            el?.querySelector<HTMLButtonElement>("[data-copy-buy]")?.focus();
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

