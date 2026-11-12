"use client";

// Feed · Marketplace activities (mobile Figma "Marketplace activities"
// 10764:2708): the top bar with the period (the clock: 7, 30 or 90 days, a
// pick-one sheet, kept in the address as `?days=`); Statistics · Sales
// overview with the week's average price and volume (demo dollars); the sales
// per day as a smooth area over a grid; then the sales, newest first — the
// project, its token, the NFT (Main, Physical, Virtual), from the seller to the
// buyer, the quantity, the price and its dollars, the date. Every sale this
// browser knows is here: the web's marketplace record (market-store, yours and
// the demo buyers') and the Feed samples bought on the phone. Money is Testnet
// demo. The list's heading is "Recent sales" where the Figma says "Top
// Specialties": a named departure, as the list is the sales, newest first.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock01Icon, DollarCircleIcon, EthereumIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { PROJECTS } from "@/lib/feed";
import { OFFER_NAME } from "@/lib/innovations/clips";
import { activityRows, chartPoints, chartTop, dailySales, dollars, smoothPath, weekStats } from "@/lib/market/activity-stats";
import { useMarket } from "@/lib/market/market-store";
import { useManualProjects } from "@/lib/manual/projects";
import { initialsOf } from "@/lib/people/ids";
import { formatDate } from "@/lib/settings/dates";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { PickSheet } from "../kit/pick-list";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useTabParam } from "../kit/tabs";
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

export function MarketActivity() {
  const router = useRouter();
  const settings = useSettings();
  const now = useMinuteNow();
  const { hydrated, data } = useMarket();
  const { projects } = useManualProjects();
  const sampleSales = useSampleSales();
  const [period, setPeriod] = useTabParam<Period>("days", PERIOD_VALUES, "30");
  const days = Number(period);
  const [picking, setPicking] = React.useState(false);

  // One list: the marketplace's sales, and the Feed samples bought on this phone (seller = the creator).
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
    ],
    [data.sales, sampleSales],
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
  const hrefOf = (r: (typeof rows)[number]) =>
    sample(r.projectId) ? `/m/projects/${encodeURIComponent(r.projectId)}?tab=marketplace` : `/m/projects/${encodeURIComponent(r.projectId)}/earn/money?sale=${encodeURIComponent(r.id)}`;
  const date = (ms: number) => formatDate(ms, settings.language.dateLocale, { style: "medium" });
  const tick = (ms: number) => {
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const step = Math.max(1, Math.round(series.length / 7));
  const ticks = series.filter((_, i) => i % step === 0);
  const line = smoothPath(points);
  const label = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <Screen top={<TopBar back title="Marketplace Activities" actions={[{ icon: Clock01Icon, label: `Period: ${label}`, onClick: () => setPicking(true) }]} />}>
      {!hydrated || !now ? (
        <div className="px-8">
          <ListBones rows={5} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 px-8 pb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <span className={cn(T.meta, "text-text-tertiary")}>Statistics</span>
              <h2 className={T.section}>Sales overview</h2>
            </div>
            <div className={cn(T.meta, "flex flex-col items-end text-right")}>
              <span>
                Weekly average price: <span className="text-text-brand">{week.averageUsd === null ? "No sales" : dollars(week.averageUsd)}</span>
              </span>
              <span>
                Weekly volume: <span className="text-text-brand">{dollars(week.volumeUsd)}</span>
              </span>
              <TestnetDemoBadge className="mt-2" />
            </div>
          </div>

          <figure className="flex flex-col gap-4 rounded-lg bg-bg-surface p-6">
            <figcaption className="sr-only">
              Sales per day, {label.toLowerCase()}: {sales.length} in all.
            </figcaption>
            <div className="flex gap-4">
              <div aria-hidden className={cn(T.micro, "flex h-[200px] flex-col justify-between text-text-tertiary")}>
                {[top, (top * 3) / 4, top / 2, top / 4, 0].map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[200px] w-full overflow-visible" aria-hidden>
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

          <section className="flex flex-col gap-4">
            <h2 className={T.section}>Recent sales</h2>
            {rows.length === 0 ? (
              <EmptyState
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
                      onClick={() => router.push(hrefOf(r))}
                      className="flex w-full items-start gap-6 border-b-[length:var(--border-width-1)] border-solid border-border py-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <Avatar size="md" initials={initialsOf(nameOf(r.projectId))} />
                      <span className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className={cn(T.rowTitle, "truncate")}>{nameOf(r.projectId)}</span>
                        {r.token && (
                          <span className={T.meta}>
                            ID: <span className="text-text-brand">{r.token}</span>
                          </span>
                        )}
                        <Badge tone="blue" className="self-start">
                          {OFFER_NAME[r.nft]}
                        </Badge>
                        <span className={cn(T.meta, "[overflow-wrap:anywhere]")}>
                          {r.from} to {r.to}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-2">
                        <span className={T.meta}>Quantity: 01</span>
                        <span className={cn(T.rowTitle, "flex items-center gap-2")}>
                          <Icon icon={EthereumIcon} size={16} />
                          {r.price}
                        </span>
                        <span className={cn(T.body, "flex items-center gap-2")}>
                          <Icon icon={DollarCircleIcon} size={16} />
                          {r.usd}
                        </span>
                        <span className={cn(T.meta, "text-text-tertiary")}>{date(r.at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <PickSheet open={picking} onClose={() => setPicking(false)} title="Period" options={PERIODS} value={period} onPick={setPeriod} />
    </Screen>
  );
}
