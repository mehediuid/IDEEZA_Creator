"use client";

// Earn for a project the demo creator you shop as bought copies of, on the phone (CL-036; the web's
// /projects/purchased/<id>/earn[/sell], its words kept), built like the project's own phone Earn — a hub whose
// rows push their screens:
// · the hub (`…/earn`): the project's name as the large title with one status pill (Not selling · {n} copies for
//   sale · Sold every copy); What your copies earned (Earned from selling copies on, For sale now, You hold, Units
//   made) with the one next step's line; the Sell row with its live line; Activity, newest first; How selling a copy
//   on works as a row that opens its five lines; the next step's one button in the bottom bar (Sell a copy, Manage
//   what's for sale, Buy another copy, Open its Earn);
// · Sell (`…/earn/sell`): Your copies, the whole project's row when it is held too (it sells from its own Earn),
//   then the copies grouped Physical NFTs · Virtual NFTs · Sold on, a row each (its chip, use, number, price or
//   "Sold for … to …", a Physical copy's units, and what a tap does: Set a price ›, Manage ›, Receipt ›), each
//   pushing its screen (resale-item.tsx); nothing to sell: "No copies to sell" with Buy a copy.

import * as React from "react";
import Link from "next/link";
import { CrownIcon, InformationCircleIcon, ShoppingBag01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, type BadgeTone } from "@/components/ideeza/badge";
import { buttonVariants } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { KIND_ICON } from "@/components/marketplace/kind-icon";
import { useResales } from "@/components/projects/purchased/resales-store";
import { useUnitsLog } from "@/components/projects/purchased/units-store";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { acquiredIdOf } from "@/lib/demo/acquired-projects";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { formatDate } from "@/lib/manual/project-summary";
import { KIND_NAME, wholeProjectOnly, type PurchasedProject } from "@/lib/market/purchases";
import { earnEventsOf, earnFactsOf, earnNextOf, resaleTilesOf, type ResaleTile } from "@/lib/market/resale-desk";
import { unitsLineOf } from "@/lib/market/units";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../../kit/list";
import { Sheet } from "../../kit/sheet";
import { EmptyState } from "../../kit/state";
import { OfflineBanner } from "../../kit/states";
import { EARN_CARD } from "../../project-earn/parts";
import { Screen } from "../../screen";
import { TopBar } from "../../top-bar";
import { T } from "../../type";
import { holdsWhole, NothingBought, PurchasedLoading, statusOf, UnitsMeter, useScrolledPast } from "../parts";
import { PURCHASED_TAB_HREF, purchasedEarnPath, purchasedPath, purchasedPhoneHrefOf, purchasedShopHref, resaleItemPath, type PurchasedEarnSection } from "../paths";

export const STATE_CHIP: Record<ResaleTile["state"], { label: string; tone: BadgeTone }> = {
  held: { label: "Not for sale", tone: "neutral" },
  listed: { label: "For sale", tone: "brand" },
  sold: { label: "Sold", tone: "success" },
};

const HOW_IT_WORKS = [
  "You set one price, in the token you bought it with. Listing it and a new price are free signatures; taking it off sale needs none.",
  "It stays yours, in your wallet, until someone buys it. No units are made with a copy while it's for sale.",
  "The buyer gets the copy, its licence and its units left. The units you made stay yours.",
  "Out of the price, the creator gets their royalty and IDEEZA its 2.5% fee; the rest is paid to your demo wallet.",
  "The whole project (its Main NFT) sells from that project's own Earn.",
];

export function PurchasedEarnScreen({ id, section }: { id: string; section: PurchasedEarnSection }) {
  const { ready, buyer, purchases } = usePurchased();
  const back = section === "sell" ? purchasedEarnPath(id) : purchasedPath(id);
  if (!ready) return <PurchasedLoading back={back} title={section === "sell" ? "Sell" : "Earn"} />;
  const p = purchases.find((x) => x.id === id);
  if (!p || wholeProjectOnly(p)) return <NothingBought buyerName={buyer.name} back={p ? purchasedPhoneHrefOf(p) : PURCHASED_TAB_HREF} />;
  return section === "sell" ? <SellBody p={p} buyer={buyer} /> : <HubBody p={p} buyer={buyer} />;
}

/** The whole project's own Earn › Sell (a sample bought whole is the buyer's own copy of it). */
function ownEarnHref(p: PurchasedProject): string {
  return phoneEarnHref(p.source === "sample" ? acquiredIdOf(p.id) : p.id, "sell");
}

// ─────────────────────────── the hub ───────────────────────────

function HubBody({ p, buyer }: { p: PurchasedProject; buyer: DemoBuyer }) {
  const log = useUnitsLog();
  const resales = useResales();
  const [how, setHow] = React.useState(false);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const gone = useScrolledPast(titleRef);
  const facts = earnFactsOf(p, buyer.id, log);
  const next = earnNextOf(facts, p);
  const events = earnEventsOf(p, buyer.id, resales, log);
  const status = statusOf(p);
  const href =
    next.action?.to === "sell" ? purchasedEarnPath(p.id, "sell") : next.action?.to === "project" ? ownEarnHref(p) : purchasedShopHref(p, p.buyable[0]);
  const figures: { label: string; value: string; note?: string }[] = [
    { label: "Earned from selling copies on", value: facts.earned ?? "Nothing yet", note: facts.sold ? `${facts.sold} sold · after royalties and fees` : "After the creator's royalty and IDEEZA's fee" },
    { label: "For sale now", value: facts.forSale ? `${facts.forSale} ${facts.forSale === 1 ? "copy" : "copies"}` : "None", note: facts.asking ? `Asking ${facts.asking}` : undefined },
    { label: "You hold", value: `${facts.held} ${facts.held === 1 ? "copy" : "copies"}`, note: facts.ownsProject ? "And the whole project" : undefined },
    ...(facts.units ? [{ label: "Units made", value: `${facts.units.made} of ${facts.units.allowance}`, note: "With the Physical copies you hold" }] : []),
  ];
  const sellLine = [
    `${facts.held} ${facts.held === 1 ? "copy" : "copies"}`,
    facts.forSale ? `${facts.forSale} for sale` : null,
    facts.sold ? `${facts.sold} sold` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen
      top={<TopBar back={purchasedPath(p.id)} titleAs="p" title={gone ? p.name : "Earn"} />}
      footer={
        next.action ? (
          <BottomBar>
            <Link href={href} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              {next.action.label}
            </Link>
          </BottomBar>
        ) : undefined
      }
    >
      <OfflineBanner />
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 ref={titleRef} className={cn(T.title, "min-w-0 break-words")}>
            <span className="sr-only">Earn · </span>
            {p.name}
          </h1>
          <Badge tone={status.tone} className="shrink-0">
            {status.word}
          </Badge>
        </header>

        <section aria-labelledby="pe-earned" className={EARN_CARD}>
          <div className="flex items-center justify-between gap-4">
            <h2 id="pe-earned" className={T.section}>
              What your copies earned
            </h2>
            <TestnetDemoBadge />
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8">
            {figures.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-1">
                <dt className={T.meta}>{f.label}</dt>
                <dd className={cn(T.section, "break-words tabular-nums")}>{f.value}</dd>
                {f.note && <dd className={cn(T.meta, "text-text-tertiary")}>{f.note}</dd>}
              </div>
            ))}
          </dl>
          <p className={cn(T.body, "border-t-[length:var(--border-width-1)] border-solid border-border pt-6 text-text-primary")}>{next.line}</p>
        </section>

        <ListCard label="Earn">
          <ListRow icon={Store01Icon} title="Sell" meta={sellLine} href={purchasedEarnPath(p.id, "sell")} />
        </ListCard>

        <section aria-labelledby="pe-activity" className="flex flex-col gap-4">
          <h2 id="pe-activity" className={T.section}>
            Activity
          </h2>
          {events.length ? (
            <ol aria-label="Activity" className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-6 px-8 py-6">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.body, "break-words text-text-primary")}>{e.text}</span>
                    <time dateTime={new Date(e.at).toISOString()} className={cn(T.meta, "text-text-tertiary")}>
                      {formatDate(e.at)}
                    </time>
                  </span>
                  {e.amount && (
                    <span className={cn(T.rowTitle, "shrink-0 whitespace-nowrap tabular-nums", e.amount.startsWith("+") ? "text-text-success" : "text-text-secondary")}>{e.amount}</span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className={T.body}>Nothing yet.</p>
          )}
        </section>

        <ListCard label="How it works">
          <ListRow icon={InformationCircleIcon} title="How selling a copy on works" onClick={() => setHow(true)} />
        </ListCard>
      </div>
      <Sheet open={how} onClose={() => setHow(false)} title="How selling a copy on works">
        <ul className="flex list-disc flex-col gap-3 pb-8 pl-8">
          {HOW_IT_WORKS.map((line) => (
            <li key={line} className={cn(T.body, "text-text-primary")}>
              {line}
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  );
}

// ─────────────────────────── Sell ───────────────────────────

function SellBody({ p, buyer }: { p: PurchasedProject; buyer: DemoBuyer }) {
  const log = useUnitsLog();
  const tiles = resaleTilesOf(p, buyer.id, log);
  const owns = holdsWhole(p);
  const back = purchasedEarnPath(p.id);
  if (!tiles.length && !owns) {
    return (
      <Screen top={<TopBar back={back} title="Sell" />} className="px-8 pb-8">
        <EmptyState
          icon={ShoppingBag01Icon}
          title="No copies to sell"
          body={`You hold no Physical or Virtual copies of ${p.name}.`}
          action={p.buyable.length ? { label: "Buy a copy", href: purchasedShopHref(p, p.buyable[0]) } : undefined}
        />
      </Screen>
    );
  }
  const groups: { id: "physical" | "virtual" | "sold"; title: string; lead: string; tiles: ResaleTile[] }[] = [
    { id: "physical" as const, title: `${KIND_NAME.physical}s`, lead: "Each copy sells with its licence and its units left.", tiles: tiles.filter((t) => t.kind === "physical" && t.state !== "sold") },
    { id: "virtual" as const, title: `${KIND_NAME.virtual}s`, lead: "Each copy sells with its licence.", tiles: tiles.filter((t) => t.kind === "virtual" && t.state !== "sold") },
    { id: "sold" as const, title: "Sold on", lead: "Copies you sold, and what they paid you.", tiles: tiles.filter((t) => t.state === "sold") },
  ].filter((g) => g.tiles.length > 0);

  return (
    <Screen top={<TopBar back={back} title="Sell" />}>
      <OfflineBanner />
      <div className="flex flex-col gap-12 px-8 pb-12 pt-2">
        <header className="flex flex-col gap-1">
          <h1 className={T.section}>Your copies</h1>
          <p className={T.body}>Pick a copy to sell it, change its price or take it off sale.</p>
        </header>

        {owns && (
          <ListCard label="The whole project">
            <ListRow icon={CrownIcon} title="The whole project is yours" meta="It sells, with its copies, from its own Earn." value="Open its Earn" href={ownEarnHref(p)} />
          </ListCard>
        )}

        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`sell-${g.id}`} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={`sell-${g.id}`} className={cn(T.section, "flex items-center gap-3")}>
                {g.id !== "sold" && (
                  <span aria-hidden className="inline-flex text-[color:var(--color-icon-default)]">
                    <Icon icon={KIND_ICON[g.id]} size={20} />
                  </span>
                )}
                {g.title}
                <Badge tone="neutral">{g.tiles.length}</Badge>
              </h2>
              <p className={T.meta}>{g.lead}</p>
            </div>
            <ul aria-label={g.title} className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {g.tiles.map((t) => (
                <TileRow key={t.key} p={p} tile={t} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Screen>
  );
}

function TileRow({ p, tile: t }: { p: PurchasedProject; tile: ResaleTile }) {
  const chip = STATE_CHIP[t.state];
  const action = t.state === "held" ? "Set a price" : t.state === "listed" ? "Manage" : "Receipt";
  const price = t.price ? (t.state === "sold" ? `Sold for ${t.price}${t.sold ? ` to ${t.sold.to}` : ""}` : t.price) : "No price yet";
  return (
    <li>
      <Link
        href={resaleItemPath(p.id, t.key)}
        aria-label={`${t.number} · ${KIND_NAME[t.kind]} · ${t.use}: ${chip.label}, ${price}${t.units ? `, ${unitsLineOf(t.units)}` : ""}. ${action}`}
        className={cn(LIST_ROW, "items-start")}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone={chip.tone}>{chip.label}</Badge>
            <span className={T.meta}>{[t.use, t.product].filter(Boolean).join(" · ")}</span>
          </span>
          <span className={cn(T.rowTitle, "font-mono tabular-nums")}>{t.number}</span>
          <span className={cn(t.price ? T.rowTitle : T.body, "tabular-nums", !t.price && "text-text-tertiary")}>{price}</span>
          {t.units && (
            <span className="flex flex-col gap-2 pt-1">
              <UnitsMeter units={t.units} label={`Units made with ${t.number}`} />
              <span className={cn(T.meta, "tabular-nums")}>{unitsLineOf(t.units)}</span>
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 self-center">
          <span className={cn(T.meta, t.state === "held" ? "text-text-brand" : "text-text-tertiary")}>{action}</span>
          <Chevron />
        </span>
      </Link>
    </li>
  );
}
