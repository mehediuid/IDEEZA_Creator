"use client";

// Feed · Marketplace activities (mobile Figma "Marketplace activities"
// 10764:2708), summary first (2026 mobile UX pass): the period as three tabs
// (7, 30 or 90 days, kept in the address as `?days=`); Sales overview with the
// week's average price and volume as two figures (demo dollars, Testnet); the
// sales per day as a smooth area over a grid; then the sales, newest first, a
// row each — the project, its NFT (Main, Physical, Virtual) and the date, the
// price and its dollars. A row opens the sale in a sheet: the token, from the
// seller to the buyer, the quantity, and the way on to the project (a sample)
// or the sale in Earn › Money (yours). Every sale this browser knows is here:
// the web's marketplace record (market-store, yours and the demo buyers'), the
// Feed samples bought on the phone, and the copies holders sold on to each
// other (CL-036: a real sale — the buyer pays, the seller and the creator are
// paid; BUY-16), a row each as "Physical NFT · from {seller}", opening the
// project's shop on that kind. Money is Testnet demo. The list's
// heading is "Recent sales" where the Figma says "Top Specialties": a named
// departure, as the list is the sales, newest first.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Store01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { useResales } from "@/components/projects/purchased/resales-store";
import { PROJECTS } from "@/lib/feed";
import { OFFER_NAME } from "@/lib/innovations/clips";
import { activityRows, chartPoints, chartTop, dailySales, dollars, smoothPath, weekStats } from "@/lib/market/activity-stats";
import { useMarket } from "@/lib/market/market-store";
import { useManualProjects } from "@/lib/manual/projects";
import { phoneMarketHref } from "@/lib/manual/phone-earn";
import { buyerNameOf } from "@/lib/market/resales";
import { initialsOf } from "@/lib/people/ids";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { MobileTabs, tabPanelProps, useTabParam } from "../kit/tabs";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useMinuteNow } from "./use-feed";

const PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;
type Period = (typeof PERIODS)[number]["value"];
const PERIOD_VALUES = PERIODS.map((p) => p.value);

const W = 280;
const H = 200;

type Row = ReturnType<typeof activityRows>[number];

export function MarketActivity() {
  const router = useRouter();
  const settings = useSettings();
  const now = useMinuteNow();
  const { hydrated, data } = useMarket();
  const { projects } = useManualProjects();
  const sampleSales = useSampleSales();
  const resales = useResales();
  const [period, setPeriod] = useTabParam<Period>("days", PERIOD_VALUES, "30");
  const days = Number(period);
  const [open, setOpen] = React.useState<Row | null>(null);

  // A copy sold on between holders (BUY-16): who sold it and its kind, by the row's id.
  const soldOn = React.useMemo(
    () => new Map(resales.filter((r) => r.sale).map((r) => [r.id, { seller: buyerNameOf(r.sellerId), kind: r.kind }] as const)),
    [resales],
  );
  // One list: the marketplace's sales, the Feed samples bought on this phone (seller = the creator), and the
  // copies sold on between holders (the copy's number as its ID).
  const allSales = React.useMemo(
    () => [
      ...data.sales,
      ...sampleSales.map((s) => ({
        id: s.id,
        projectId: s.projectId,
        at: s.at,
        token: s.token,
        price: s.price,
        item: { nft: s.kind },
        sellerAddress: PROJECTS.find((p) => p.id === s.projectId)?.creator.name ?? "Creator",
        buyerAddress: s.buyerAddress,
        tokenId: null,
      })),
      ...resales.flatMap((r) =>
        r.sale
          ? [
              {
                id: r.id,
                projectId: r.projectId,
                at: r.sale.at,
                token: r.token,
                price: r.price,
                item: { nft: r.kind },
                sellerAddress: r.sellerAddress,
                buyerAddress: r.sale.buyerAddress,
                tokenId: r.serial,
              },
            ]
          : [],
      ),
    ],
    [data.sales, sampleSales, resales],
  );
  const since = now - days * 86_400_000;
  const sales = React.useMemo(() => allSales.filter((s) => s.at > since), [allSales, since]);
  const week = weekStats(allSales, now);
  const series = dailySales(sales, now, days);
  const points = chartPoints(series, W, H);
  const top = chartTop(series);
  const rows = activityRows(sales);
  const sample = (id: string) => PROJECTS.find((p) => p.id === id) ?? null;
  const nameOf = (id: string) => sample(id)?.title ?? (projects.find((p) => p.id === id)?.name.trim() || "Untitled project");
  // A sample's sale opens its Marketplace; a copy sold on, the shop on its kind (where From holders lists them);
  // your own sale, the sale in Earn › Money.
  const hrefOf = (r: Row) => {
    const resale = soldOn.get(r.id);
    if (sample(r.projectId)) return `/m/projects/${encodeURIComponent(r.projectId)}?tab=marketplace${resale ? `&nft=${resale.kind}` : ""}`;
    if (resale) return `${phoneMarketHref(r.projectId)}?nft=${resale.kind}`;
    return `/m/projects/${encodeURIComponent(r.projectId)}/earn/money?sale=${encodeURIComponent(r.id)}`;
  };
  // "Physical NFT · from Mira" for a copy sold on, else the NFT alone.
  const offerOf = (r: Row) => {
    const resale = soldOn.get(r.id);
    return resale ? `${OFFER_NAME[r.nft]} · from ${resale.seller}` : OFFER_NAME[r.nft];
  };
  const date = (ms: number) => formatDate(ms, settings.language.dateLocale, { style: "medium" });
  const tick = (ms: number) => {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const step = Math.max(1, Math.round(series.length / 7));
  const ticks = series.filter((_, i) => i % step === 0);
  const line = smoothPath(points);
  const label = PERIODS.find((p) => p.value === period)?.label ?? "";
  const pictureOf = (id: string) => sample(id)?.image ?? null;

  return (
    <Screen top={<TopBar back title="Marketplace Activities" />}>
      <MobileTabs label="Period" idBase="market-days" value={period} onChange={setPeriod} className="mx-8" tabs={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
      <div {...tabPanelProps("market-days", period)} className="outline-none">
        {!hydrated || !now ? (
          <div className="px-8 pt-6">
            <ListBones rows={5} />
          </div>
        ) : (
          <div className="flex flex-col gap-8 px-8 pb-10 pt-6">
            <section aria-labelledby="market-overview" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 id="market-overview" className={T.section}>
                  Sales overview
                </h2>
                <TestnetDemoBadge />
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Figure label="Weekly average price" value={week.averageUsd === null ? "No sales" : dollars(week.averageUsd)} />
                <Figure label="Weekly volume" value={dollars(week.volumeUsd)} />
              </dl>
              <figure className="flex flex-col gap-4 rounded-lg bg-bg-surface p-6">
                <figcaption className="sr-only">
                  Sales per day, {label.toLowerCase()}: {sales.length} in all.
                </figcaption>
                <div className="flex gap-4">
                  <div aria-hidden className={cn(T.micro, "flex h-[160px] flex-col justify-between text-text-tertiary")}>
                    {[top, (top * 3) / 4, top / 2, top / 4, 0].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[160px] w-full overflow-visible" aria-hidden>
                    {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                      <line key={`h${f}`} x1={0} x2={W} y1={H * f} y2={H * f} className="stroke-[var(--color-border-subtle)]" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    ))}
                    {ticks.map((t) => {
                      const x = points[series.indexOf(t)]?.x ?? 0;
                      return <line key={`v${t.day}`} x1={x} x2={x} y1={0} y2={H} className="stroke-[var(--color-border-subtle)]" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
                    })}
                    <path d={`${line} L${W},${H} L0,${H} Z`} className="fill-[var(--color-bg-brand-subtle)]" />
                    <path d={line} fill="none" className="stroke-[var(--color-icon-brand)]" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
                <div aria-hidden className={cn(T.micro, "flex justify-between pl-[28px] text-text-tertiary")}>
                  {ticks.map((t) => (
                    <span key={t.day}>{tick(t.day)}</span>
                  ))}
                </div>
              </figure>
            </section>

            <section aria-labelledby="market-sales" className="flex flex-col gap-2">
              <h2 id="market-sales" className={T.section}>
                Recent sales
              </h2>
              {rows.length === 0 ? (
                <EmptyState
                  className="mt-2"
                  icon={Store01Icon}
                  title="No sales in this period"
                  body="Sales on the marketplace show up here, yours and the demo buyers’."
                  action={days < 90 ? { label: "Show the last 90 days", onClick: () => setPeriod("90") } : undefined}
                />
              ) : (
                <ul className="flex flex-col">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setOpen(r)}
                        className="-mx-2 flex min-h-[64px] w-[calc(100%_+_var(--spacing-4))] items-center gap-6 rounded-md px-2 py-4 text-left outline-none transition-colors duration-fast active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <SalePicture src={pictureOf(r.projectId)} name={nameOf(r.projectId)} />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className={cn(T.rowTitle, "truncate")}>{nameOf(r.projectId)}</span>
                          <span className={cn(T.meta, "truncate")}>
                            {offerOf(r)} · {date(r.at)}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className={cn(T.rowTitle, "tabular-nums")}>{r.price}</span>
                          <span className={cn(T.meta, "tabular-nums")}>{r.usd}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? nameOf(open.projectId) : "Sale"}
        description={open ? date(open.at) : undefined}
        actions={
          open && (
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                const r = open;
                setOpen(null);
                router.push(hrefOf(r));
              }}
            >
              {sample(open.projectId) || soldOn.has(open.id) ? "View project" : "View sale"}
            </Button>
          )
        }
      >
        {open && (
          <>
            <div className={cn(LIST_CARD, "gap-1 p-6")}>
              <Badge tone="blue" className="self-start">
                {OFFER_NAME[open.nft]}
              </Badge>
              <p className={cn(T.display, "pt-2 tabular-nums")}>{open.price}</p>
              <p className={cn(T.meta, "tabular-nums")}>{open.usd}</p>
            </div>
            <dl className={cn(LIST_CARD, "[&>*+*]:border-t-[length:var(--border-width-1)] [&>*+*]:border-solid [&>*+*]:border-border")}>
              {open.token && <Fact label="ID" value={open.token} brand />}
              <Fact label="From" value={open.from} />
              <Fact label="To" value={open.to} />
              <Fact label="Quantity" value="01" />
            </dl>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

/** One of the week's two figures: its name over it, the number large. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(LIST_CARD, "gap-1 p-6")}>
      <dt className={T.meta}>{label}</dt>
      <dd className={cn(T.title, "break-words tabular-nums")}>{value}</dd>
    </div>
  );
}

/** A sale's fact, label left and value right (an inset row). */
function Fact({ label, value, brand }: { label: string; value: string; brand?: boolean }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-6 px-8 py-4">
      <dt className={T.body}>{label}</dt>
      <dd className={cn(T.body, "min-w-0 text-right text-text-primary [overflow-wrap:anywhere]", brand && "text-text-brand")}>{value}</dd>
    </div>
  );
}

/** The project's picture (a sample's), else its initials. */
function SalePicture({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- the project's picture
    return <img src={src} alt="" className="size-[48px] shrink-0 rounded-md object-cover" />;
  }
  return <Avatar size="lg" initials={initialsOf(name)} />;
}
