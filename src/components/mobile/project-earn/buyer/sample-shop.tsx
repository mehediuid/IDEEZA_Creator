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
// sample-project.tsx mounts the pieces: SampleShop around its screen,
// SampleMarketSection right under the title (owner 2026-11-12: the page the
// Feed's pill opens was a spreadsheet — a loud demo banner on top, a table of
// rows that said the price twice, empty "activity" headings and a Buy button
// on every card). Now, as a product page: one buy box — "Whole project ·
// Main NFT", the price large, three facts (Listing, Share, Chain), the wallet
// line, the last sale and the Testnet demo line with Change — the share-sale
// note under it, then the copies as rows (icon, name, price, sold bar, a
// small Buy). The bottom bar's Buy now buys the Main NFT, so the box has no
// button of its own; with the Main NFT gone it brings the copies into view.

import * as React from "react";
import Link from "next/link";
import { BubbleChatIcon, Coins01Icon, CubeIcon, PackageIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { scrollWithin } from "@/components/create/anchors";
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
import { LIST_CARD, LIST_DIVIDERS } from "../../kit/list";
import { PhoneWalletScope } from "../phone-wallet";
import { readSampleSales, useSampleSales, writeSampleSales } from "./sample-sales-store";
import { ClosedCard, DemoShopBanner, Disclosure, OfferRowsCard, PurchaseDoneSheet, WalletLine, type DoneFacts } from "./parts";
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

/** The marketplace block's id: with the Main NFT gone, the bar's Buy now brings the copies into view by it. */
const SECTION_ID = "sample-market";
/** The copies' list, which a product's Buy a copy brings into view. */
const COPIES_ID = "sample-copies";

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

/** A fact in the buy box: a small label over its value. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={T.micro}>{label}</dt>
      <dd className={cn(T.rowTitle, "break-words")}>{value}</dd>
    </div>
  );
}

/** Right under the title: what the active buyer holds, the Main NFT's buy box, then the copies. */
export function SampleMarketSection() {
  const shop = useShop();
  if (!shop) return null;
  const { post, id, offers, sales, buyerId, holding } = shop;
  const main = offers.find((o) => o.kind === "main") ?? null;
  const copies = offers.filter((o) => o.kind !== "main");
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
      {holding.length > 0 && <SamplePurchaseSummary holding={holding} creator={post.creator.name} copies={copies} />}
      {main &&
        (mainSale ? (
          mainSale.buyerId === buyerId ? null : (
            <ClosedCard title={`Sold on ${formatDate(mainSale.at)}.`} detail={`Sold for ${formatAmount(mainSale.price, mainSale.token)} · the whole project`} />
          )
        ) : (
          <div className="flex flex-col gap-3">
            <section aria-label="Main NFT, the whole project" className={cn(LIST_CARD, "gap-6 p-8")}>
              <div className="flex flex-col gap-1">
                <p className={T.overline}>Whole project · Main NFT</p>
                <p className={cn(T.display, "tabular-nums")}>{formatAmount(main.price, main.token)}</p>
              </div>
              <dl className="grid grid-cols-[auto_auto_1fr] gap-x-8 gap-y-2">
                <Fact label="Listing" value="Buy now" />
                <Fact label="Share" value="100%" />
                <Fact label="Chain" value={networkLabelOf(SAMPLE_NETWORK)} />
              </dl>
              <div className="flex flex-col gap-3 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="mt-[2px] shrink-0 text-[color:var(--color-icon-secondary)]">
                    <Icon icon={Wallet01Icon} size={16} />
                  </span>
                  <WalletLine buyerId={buyerId} token={main.token} network={SAMPLE_NETWORK} verb="buy" />
                </div>
                <p className={T.meta}>
                  <span className="sr-only">Main NFT activity: </span>
                  {lastMain}
                </p>
                <DemoShopBanner body={SAMPLE_BANNER_BODY} line />
              </div>
            </section>
            <p className={cn(T.caption, "text-text-tertiary")}>{SHARE_SALE_NOTE}</p>
          </div>
        ))}
      {!main && <DemoShopBanner body={SAMPLE_BANNER_BODY} line />}
      <SampleCopies />
    </section>
  );
}

/** The copies on sale, as rows: an icon, the name, the price, how many are sold, and a small Buy.
 *  The project page shows them under its buy box; a product's page shows them as its own. */
export function SampleCopies({ sub = "Of the whole project, each with its own NFT." }: { sub?: string }) {
  const shop = useShop();
  if (!shop) return null;
  const { id, offers, sales, busy, buy } = shop;
  const copies = offers.filter((o) => o.kind !== "main");
  return (
    <>
      {copies.length > 0 && (
        <section id={COPIES_ID} aria-labelledby="sv-copies" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id="sv-copies" className={T.section}>
              Copies
            </h3>
            <p className={T.meta}>{sub}</p>
          </div>
          <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
            {copies.map((o) => {
              const state = offerStateOf(o, id, sales);
              const why = sampleBuyBlock(o, id, sales);
              const last = sales.filter((x) => x.kind === o.kind).at(-1) ?? null;
              const price = formatAmount(o.price, o.token);
              const share = state.count !== null && state.of ? Math.min(100, Math.round((state.count / state.of) * 100)) : null;
              return (
                <li key={o.kind} className="flex items-center gap-6 px-8 py-6">
                  <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-default)]">
                    <Icon icon={o.kind === "physical" ? PackageIcon : CubeIcon} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.rowTitle, "break-words")}>{o.name}</span>
                    <span className={cn(T.meta, "tabular-nums text-text-primary")}>{price}</span>
                    {state.count !== null && state.of !== null && (
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="h-[4px] w-[56px] shrink-0 overflow-hidden rounded-full bg-[var(--color-border-default)]">
                          <span className="block h-full rounded-full bg-bg-brand" style={{ width: `${share ?? 0}%` }} />
                        </span>
                        <span className={cn(T.caption, "tabular-nums")}>{state.soldOut ? "Sold out" : `${state.count} of ${state.of} sold`}</span>
                      </span>
                    )}
                    {last && (
                      <span className={T.caption}>{`Bought by ${buyerLabel(last.buyerId)} · ${formatAmount(last.price, last.token)} · ${formatDate(last.at)}`}</span>
                    )}
                    {state.locked && <span className={T.caption}>{LOCKED}</span>}
                  </div>
                  {!state.locked && !state.soldOut && (
                    <Button
                      hierarchy="secondary"
                      size="md"
                      className="shrink-0"
                      data-copy-buy=""
                      aria-label={`Buy ${o.name} for ${price}`}
                      aria-disabled={busy !== null || why !== null || undefined}
                      loading={busy === o.kind}
                      onClick={() => {
                        if (busy === null && why === null) buy(o);
                      }}
                    >
                      Buy
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/** A product's bottom bar: what copies start at, and Buy a copy — the one copy straight away, or,
 *  with more than one, the copies brought into view to pick from. */
export function SampleCopyBar() {
  const shop = useShop();
  if (!shop) return null;
  const { offers, id, sales, busy, buy } = shop;
  const open = offers.filter((o) => o.kind !== "main" && sampleBuyBlock(o, id, sales) === null);
  const all = offers.filter((o) => o.kind !== "main");
  if (!all.length) return null;
  const from = all.reduce((a, o) => (Number(o.price) < Number(a.price) ? o : a), all[0]);
  return (
    <BottomBar className="pt-6">
      <div className="flex items-center gap-6">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={T.meta}>Copies from</span>
          <span className={cn(T.section, "tabular-nums")}>{formatAmount(from.price, from.token)}</span>
        </span>
        {open.length ? (
          <Button
            size="xl"
            className="min-w-0 flex-1"
            loading={busy !== null}
            onClick={() => {
              if (busy !== null) return;
              if (open.length === 1) return buy(open[0]);
              const el = document.getElementById(COPIES_ID)?.querySelector<HTMLButtonElement>("[data-copy-buy]");
              if (!el) return;
              scrollWithin(el, "nearest", "smooth");
              el.focus({ preventScroll: true });
            }}
          >
            Buy a copy
          </Button>
        ) : (
          <p className={cn(T.body, "min-w-0 flex-1 text-right")}>All copies are sold.</p>
        )}
      </div>
    </BottomBar>
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

