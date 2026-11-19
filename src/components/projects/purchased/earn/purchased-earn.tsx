"use client";

// Earn for a project the active demo creator bought copies of: /projects/purchased/<id>/earn[/sell] (owner,
// 2026-11-19: "if I want to sell it again, complete that flow — and like the Earn inside a project's details,
// somewhere I go to see it all, with good UX"). The project's own Earn, for what a holder can do: the same header
// (← the project, the h1 Earn, one status pill), the same tabs, the same cards; two tabs, because a holder sells
// copies on and nothing else:
// - Overview: what the copies earned and hold, the one thing to do next, then what happened (bought, put up for
//   sale, taken off, sold, units made), and how selling on works, folded.
// - Sell: the board of the copies (by kind, then the ones sold on) and the item panel beside it (a drawer under a
//   1024 px page): sell a copy, change its price, take it off sale, or its receipt (resale-panel.tsx).
// A whole project held is the buyer's own project: it sells from that project's own Earn, linked here.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft02Icon, ArrowRight01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Drawer, StateCard, buttonVariants, type BadgeTone } from "@/components/ideeza";
import { PAGE_CONTAINER, WITH_RAIL } from "@/components/ideeza/page";
import { DemoBuyerBanner } from "@/components/marketplace/demo-buyer-banner";
import { MoreFacts } from "@/components/marketplace/offer-parts";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { LiveRegion, usePageArrival } from "@/components/projects/details/arrival";
import { PAGE_CONTENT } from "@/components/projects/details/frame";
import { ProjectSkeleton } from "@/components/projects/details/page-states";
import { RailStackScope, useRailStacked } from "@/components/projects/details/rail-block";
import { TAB, TAB_OFF, TAB_ON } from "@/components/projects/details/tab-strip";
import { KindDot, SoldMeter } from "@/components/projects/earn/sell/board";
import { PanelFrame, PanelInDrawer } from "@/components/projects/earn/sell/item-panel";
import { EARN_CARD, EARN_COLUMN, EARN_H2, EARN_LEAD, EARN_STACK, TAP } from "@/components/projects/earn/surface";
import { acquiredIdOf } from "@/lib/demo/acquired-projects";
import { formatDate } from "@/lib/manual/project-summary";
import { KIND_NAME, type PurchasedProject } from "@/lib/market/purchases";
import { earnEventsOf, earnFactsOf, earnNextOf, resaleTilesOf, tileKeyOfCopy, type ResaleTile } from "@/lib/market/resale-desk";
import { unitsLineOf } from "@/lib/market/units";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { useResales } from "../resales-store";
import { useUnitsLog } from "../units-store";
import { NothingBought } from "../purchased-page";
import { usePurchased } from "../use-purchased";
import { ResalePanel, resaleHeadOf, STATE_CHIP } from "./resale-panel";
import { useResaleTerms } from "./resale-terms";
import { purchasedEarnHref, type PurchasedEarnSection } from "./href";

const LABEL: Record<PurchasedEarnSection, string> = { overview: "Overview", sell: "Sell" };
const PANEL_ID = "resale-item-panel";


const BACK =
  "inline-flex min-h-[24px] max-w-full items-center gap-2 self-start rounded-sm text-md font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)]";
const PRIMARY = cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "h-[44px] self-start gap-2 hover:text-[color:var(--color-button-primary-text)] max-sm:w-full");

export function PurchasedEarn({ id, section }: { id: string; section: PurchasedEarnSection }) {
  const { ready, buyer, purchases } = usePurchased();
  if (!ready) return <ProjectSkeleton />;
  const p = purchases.find((x) => x.id === id);
  if (!p) return <NothingBought buyerName={buyer.name} />;
  return <EarnBody p={p} buyer={buyer} section={section} />;
}

/** One status pill, in a holder's words. */
function statusOf(p: PurchasedProject): { word: string; tone: BadgeTone } {
  if (p.forSale > 0) return { word: p.forSale === 1 ? "1 copy for sale" : `${p.forSale} copies for sale`, tone: "brand" };
  if (p.count === 0 && p.sold.length > 0) return { word: "Sold every copy", tone: "success" };
  return { word: "Not selling", tone: "neutral" };
}

function EarnBody({ p, buyer, section }: { p: PurchasedProject; buyer: DemoBuyer; section: PurchasedEarnSection }) {
  const label = LABEL[section];
  const { titleRef, live, announce } = usePageArrival(`purchased-earn:${p.id}`, `Earn, ${label}`, `${label} · Earn · ${p.name} · IDEEZA`);
  const status = statusOf(p);
  return (
    <>
      <div className={PAGE_CONTAINER}>
        <div className={PAGE_CONTENT}>
          <div className="flex min-w-0 flex-col">
            <header className="flex flex-col gap-6">
              <Link href={`/projects/purchased/${encodeURIComponent(p.id)}`} className={BACK}>
                <Icon icon={ArrowLeft02Icon} size={16} />
                <span className="min-w-0 truncate">{p.name}</span>
              </Link>
              <DemoBuyerBanner />
              <div className="flex min-h-[40px] flex-wrap items-center gap-x-6 gap-y-3">
                <h1 ref={titleRef} tabIndex={-1} className="m-0 text-3xl font-semibold leading-3xl tracking-slight text-text-primary outline-none">
                  Earn
                </h1>
                <Badge tone={status.tone} className="h-[24px] px-[10px] py-0 text-sm font-semibold leading-sm">
                  {status.word}
                </Badge>
              </div>
            </header>
            <nav aria-label="Earn" className="mt-10 min-w-0 border-b border-solid border-border">
              <ul className="m-0 flex list-none flex-nowrap items-end gap-2 overflow-x-auto p-0">
                {(["overview", "sell"] as PurchasedEarnSection[]).map((s) => (
                  <li key={s} className="flex shrink-0">
                    <Link href={purchasedEarnHref(p.id, s)} aria-current={s === section ? "page" : undefined} className={cn(TAB, s === section ? TAB_ON : TAB_OFF)}>
                      {LABEL[s]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-12 min-w-0">{section === "overview" ? <Overview p={p} buyer={buyer} /> : <SellDeskScope p={p} buyer={buyer} announce={announce} />}</div>
          </div>
        </div>
      </div>
      <LiveRegion text={live} />
    </>
  );
}

// ─────────────────────────────── Overview ───────────────────────────────

function Overview({ p, buyer }: { p: PurchasedProject; buyer: DemoBuyer }) {
  const log = useUnitsLog();
  const resales = useResales();
  const facts = earnFactsOf(p, buyer.id, log);
  const next = earnNextOf(facts, p);
  const events = earnEventsOf(p, buyer.id, resales, log);
  const headingId = React.useId();
  const href =
    next.action?.to === "sell"
      ? purchasedEarnHref(p.id, "sell")
      : next.action?.to === "project"
        ? `/projects/${encodeURIComponent(p.source === "sample" ? acquiredIdOf(p.id) : p.id)}/earn/sell`
        : `${p.marketHref}${p.buyable[0] ? `?nft=${p.buyable[0]}` : ""}`;
  const figures: { label: string; value: string; note?: string }[] = [
    { label: "Earned from selling copies on", value: facts.earned ?? "Nothing yet", note: facts.sold ? `${facts.sold} sold · after royalties and fees` : "After the creator's royalty and IDEEZA's fee" },
    { label: "For sale now", value: facts.forSale ? `${facts.forSale} ${facts.forSale === 1 ? "copy" : "copies"}` : "None", note: facts.asking ? `Asking ${facts.asking}` : undefined },
    { label: "You hold", value: `${facts.held} ${facts.held === 1 ? "copy" : "copies"}`, note: facts.ownsProject ? "And the whole project" : undefined },
    ...(facts.units ? [{ label: "Units made", value: `${facts.units.made} of ${facts.units.allowance}`, note: "With the Physical copies you hold" }] : []),
  ];
  return (
    <div className={cn(EARN_COLUMN, EARN_STACK)}>
      <section aria-labelledby={headingId} className={EARN_CARD}>
        <h2 id={headingId} className={EARN_H2}>
          What your copies earned
        </h2>
        <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-6 [@container(min-width:560px)]:grid-cols-2">
          {figures.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <dt className="text-sm font-medium text-text-secondary">{f.label}</dt>
              <dd className="m-0 text-xl font-semibold leading-xl tabular-nums text-text-primary">{f.value}</dd>
              {f.note && <dd className="m-0 text-sm leading-sm text-text-tertiary">{f.note}</dd>}
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-4 border-x-0 border-b-0 border-t border-solid border-border pt-8">
          <p className={EARN_LEAD}>{next.line}</p>
          {next.action && (
            <Link href={href} className={PRIMARY}>
              {next.action.label}
              <Icon icon={ArrowRight01Icon} size={16} />
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby={`${headingId}-act`} className="flex min-w-0 flex-col gap-8">
        <h2 id={`${headingId}-act`} className={EARN_H2}>
          Activity
        </h2>
        {events.length ? (
          <ol className="m-0 flex list-none flex-col rounded-2xl border border-solid border-border bg-bg-surface px-8 py-2 [@container(min-width:640px)]:px-12">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-x-0 border-b-0 border-t border-solid border-border py-6 first:border-t-0">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-md leading-md text-text-primary">{e.text}</span>
                  <time dateTime={new Date(e.at).toISOString()} className="text-sm leading-sm text-text-tertiary">
                    {formatDate(e.at)}
                  </time>
                </span>
                {e.amount && (
                  <span className={cn("text-md font-semibold tabular-nums", e.amount.startsWith("+") ? "text-text-success" : "text-text-secondary")}>{e.amount}</span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className={EARN_LEAD}>Nothing yet.</p>
        )}
      </section>

      <div className="flex flex-col">
        <MoreFacts title="How selling a copy on works">
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-md leading-md text-text-primary">
            <li>You set one price, in the token you bought it with. Listing it and a new price are free signatures; taking it off sale needs none.</li>
            <li>It stays yours, in your wallet, until someone buys it. No units are made with a copy while it&apos;s for sale.</li>
            <li>The buyer gets the copy, its licence and its units left. The units you made stay yours.</li>
            <li>Out of the price, the creator gets their royalty and IDEEZA its 2.5% fee; the rest is paid to your demo wallet.</li>
            <li>The whole project (its Main NFT) sells from that project&apos;s own Earn.</li>
          </ul>
        </MoreFacts>
      </div>
    </div>
  );
}

// ─────────────────────────────── Sell ───────────────────────────────

function SellDeskScope(props: { p: PurchasedProject; buyer: DemoBuyer; announce: (m: string) => void }) {
  // The probe reads the page frame's width: from 1024 px the item panel sits in the rail, below it a drawer.
  return (
    <RailStackScope>
      <SellDesk {...props} />
    </RailStackScope>
  );
}

function SellDesk({ p, buyer, announce }: { p: PurchasedProject; buyer: DemoBuyer; announce: (m: string) => void }) {
  const log = useUnitsLog();
  const resales = useResales();
  const sampleSales = useSampleSales();
  const terms = useResaleTerms(p, sampleSales);
  const narrow = useRailStacked();
  const tiles = resaleTilesOf(p, buyer.id, log);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [drawer, setDrawer] = React.useState(false);
  const [hash, setHash] = React.useState("");
  React.useEffect(() => {
    const read = () => {
      setHash(decodeURIComponent(window.location.hash.slice(1)));
      setPicked(null);
    };
    const frame = requestAnimationFrame(read);
    window.addEventListener("hashchange", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", read);
    };
  }, []);
  // A copy the address names (`#copy-<key>`, the purchased page's Sell this copy) opens its drawer on a narrow page.
  React.useEffect(() => {
    if (!narrow || !hash.startsWith("copy-")) return;
    const frame = requestAnimationFrame(() => setDrawer(true));
    return () => cancelAnimationFrame(frame);
  }, [narrow, hash]);

  const fromHash = hash.startsWith("copy-") ? tileKeyOfCopy(hash.slice(5)) : null;
  const keys = new Set(tiles.map((t) => t.key));
  const fallback = (fromHash && keys.has(fromHash) ? fromHash : null) ?? tiles.find((t) => t.state === "held")?.key ?? tiles[0]?.key ?? null;
  const selected = picked && keys.has(picked) ? picked : fallback;
  const tile = tiles.find((t) => t.key === selected) ?? null;
  const pick = (key: string) => {
    setPicked(key);
    if (narrow) setDrawer(true);
    const t = tiles.find((x) => x.key === key);
    if (t && !narrow) announce(`${t.number}: ${STATE_CHIP[t.state].label}`);
  };

  const owns = p.lines.some((l) => l.kind === "main" && (l.sharePct ?? 0) >= 100);
  if (!tiles.length && !owns) {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={ShoppingBag01Icon} size={32} />}
        title="No copies to sell"
        body={`You hold no Physical or Virtual copies of ${p.name}.`}
        action={
          p.buyable.length ? (
            <Link href={`${p.marketHref}?nft=${p.buyable[0]}`} className={PRIMARY}>
              Buy a copy
            </Link>
          ) : undefined
        }
      />
    );
  }

  const panel = tile ? <ResalePanel key={tile.key} p={p} tile={tile} buyer={buyer} terms={terms} resales={resales} announce={announce} inDrawer={narrow} /> : null;
  const head = tile ? resaleHeadOf(tile) : { title: "", description: "" };
  return (
    <div className={WITH_RAIL}>
      <Board p={p} tiles={tiles} selected={narrow && !drawer ? null : selected} onSelect={pick} opens={narrow} owns={owns} />
      {narrow ? (
        <Drawer open={drawer && !!tile} onClose={() => setDrawer(false)} title={head.title} description={head.description} bodyClassName="p-0">
          <PanelInDrawer value>
            <div id={PANEL_ID} className="flex min-w-0 flex-col divide-y divide-border">
              {panel}
            </div>
          </PanelInDrawer>
        </Drawer>
      ) : (
        panel && <PanelFrame id={PANEL_ID}>{panel}</PanelFrame>
      )}
    </div>
  );
}

function Board({
  p,
  tiles,
  selected,
  onSelect,
  opens,
  owns,
}: {
  p: PurchasedProject;
  tiles: ResaleTile[];
  selected: string | null;
  onSelect: (key: string) => void;
  opens: boolean;
  owns: boolean;
}) {
  const headingId = React.useId();
  const groups: { id: string; title: string; lead: string; tiles: ResaleTile[] }[] = [
    { id: "physical", title: `${KIND_NAME.physical}s`, lead: "Each copy sells with its licence and its units left.", tiles: tiles.filter((t) => t.kind === "physical" && t.state !== "sold") },
    { id: "virtual", title: `${KIND_NAME.virtual}s`, lead: "Each copy sells with its licence.", tiles: tiles.filter((t) => t.kind === "virtual" && t.state !== "sold") },
    { id: "sold", title: "Sold on", lead: "Copies you sold, and what they paid you.", tiles: tiles.filter((t) => t.state === "sold") },
  ].filter((g) => g.tiles.length > 0);
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className={EARN_H2}>
          Your copies
        </h2>
        <p className={EARN_LEAD}>Pick a copy to sell it, change its price or take it off sale.</p>
      </div>
      <div className="min-w-0 rounded-2xl border border-solid border-border bg-bg-surface px-8 py-6 [container-type:inline-size] [@container(min-width:640px)]:px-12">
        {owns && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-border-strong px-7 py-6">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-md font-semibold leading-md text-text-primary">The whole project is yours</span>
              <span className="text-sm leading-sm text-text-secondary">It sells, with its copies, from its own Earn.</span>
            </span>
            <Link
              href={`/projects/${encodeURIComponent(p.source === "sample" ? acquiredIdOf(p.id) : p.id)}/earn/sell`}
              className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "gap-2 hover:text-[color:var(--color-button-secondary-text)]", TAP)}
            >
              Open its Earn
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col gap-6 py-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-bg-subtle px-7 py-4">
              <h3 className="m-0 flex items-center gap-3 text-md font-semibold leading-md text-text-primary">
                {g.id !== "sold" && <KindDot kind={g.id as "physical" | "virtual"} />}
                {g.title}
              </h3>
              <Badge tone="neutral" className="h-[22px] bg-bg-surface px-[8px] py-0 text-sm font-semibold leading-sm">
                {g.tiles.length}
              </Badge>
              <span className="text-sm leading-sm text-text-secondary">{g.lead}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 [@container(min-width:480px)]:grid-cols-2 [@container(min-width:880px)]:grid-cols-3">
              {g.tiles.map((t) => (
                <Tile key={t.key} tile={t} selected={selected === t.key} onSelect={onSelect} opens={opens} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tile({ tile: t, selected, onSelect, opens }: { tile: ResaleTile; selected: boolean; onSelect: (key: string) => void; opens: boolean }) {
  const chip = STATE_CHIP[t.state];
  const action = t.state === "held" ? "Set a price" : t.state === "listed" ? "Manage" : "Receipt";
  return (
    <button
      type="button"
      id={t.copy ? `copy-${t.copy.key}` : undefined}
      aria-pressed={selected}
      aria-label={`${t.number} · ${KIND_NAME[t.kind]} · ${t.use}: ${chip.label}${t.price ? `, ${t.price}` : ""}${t.units ? `, ${unitsLineOf(t.units)}` : ""}`}
      onClick={() => onSelect(t.key)}
      className={cn(
        "flex min-h-[132px] min-w-0 scroll-mt-10 flex-col gap-4 rounded-xl border border-solid border-border bg-transparent px-7 py-6 text-left outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none",
        selected && "border-border-brand bg-bg-brand-subtle hover:border-border-brand",
      )}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={chip.tone} className="h-[24px] shrink-0 px-[10px] py-0 text-sm font-semibold leading-sm">
          {chip.label}
        </Badge>
        <span className="text-sm leading-sm text-text-tertiary">{[t.use, t.product].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="font-mono text-lg font-semibold leading-lg tabular-nums text-text-primary">{t.number}</span>
      <span className={cn("text-md leading-md tabular-nums", t.price ? "font-semibold text-text-primary" : "text-text-tertiary")}>
        {t.price ? (t.state === "sold" ? `Sold for ${t.price}${t.sold ? ` to ${t.sold.to}` : ""}` : t.price) : "No price yet"}
      </span>
      {t.units && (
        <span className="flex flex-col gap-2">
          <SoldMeter meter={{ sold: t.units.made, total: t.units.allowance }} label={`Units made with ${t.number}`} />
          <span className="text-sm leading-sm tabular-nums text-text-secondary">{unitsLineOf(t.units)}</span>
        </span>
      )}
      <span className={cn("mt-auto self-end text-sm font-semibold leading-sm", t.state === "held" ? "text-text-link" : "text-text-tertiary")}>
        {opens || t.state === "held" ? `${action} ›` : ""}
      </span>
    </button>
  );
}
