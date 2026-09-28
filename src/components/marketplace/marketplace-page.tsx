"use client";

// MarketplacePage — /marketplace, Explore marketplace (Phase 2 spec §2.4;
// P2-MARKETPLACE-2…7, -19). The My projects shell (my-projects.tsx): the
// Testnet demo banner with the Shopping as switch, the h1 and its count line,
// the For sale · Sold · Purchased tabs, the toolbar, the card grid and the
// pagination.
//
// - Every item is real local data: the listings, sales and bids
//   (`useMarket`), the projects and their builds for the name, cover and
//   product count, and the active demo buyer. `marketItemsOf` makes one item
//   per live listing (an auction ended but not closed included) and one per
//   sale; paused and removed listings appear in no tab. `filterMarket` counts
//   the tabs, filters by type, sorts and pages.
// - Purchased is the active buyer's holdings, one card per project, their
//   share summed over every purchase (P2-MARKETPLACE-19).
// - Search matches the project name, product names and descriptions with
//   My projects' own `matchProject`. The tab counts are over every item, as
//   on My projects; the search narrows the grid.
// - The view lives in the URL (`?tab=&q=&type=&sort=&page=`), written with
//   replaceState and defaults left out (LST-28).
// - Until the projects, builds and market stores are read, six skeleton
//   cards; the counts read "—".

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search01Icon, ShoppingBag01Icon, Store01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, SearchInput, SelectMenu, StateCard, buttonVariants, type SelectOption } from "@/components/ideeza";
import { useMinuteClock } from "@/components/create/build-status";
import { Pagination } from "@/components/projects/pagination";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { useCreateHistory } from "@/lib/create/history";
import { matchProject, projectSummary, type ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { useMarket } from "@/lib/market/market-store";
import {
  filterMarket,
  marketItemsOf,
  marketQueryString,
  parseMarketQuery,
  type MarketItem,
  type MarketQuery,
} from "@/lib/market/market-list";
import { holdingOf } from "@/lib/market/sales";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import { ListingCard, ListingCardSkeleton } from "./listing-card";

type Tab = MarketQuery["tab"];

const TABS: { id: Tab; label: string }[] = [
  { id: "forSale", label: "For sale" },
  { id: "sold", label: "Sold" },
  { id: "purchased", label: "Purchased" },
];

const TYPE_OPTIONS: SelectOption<MarketQuery["type"]>[] = [
  { value: "all", label: "All" },
  { value: "buyNow", label: "Buy now" },
  { value: "auction", label: "Auction" },
];

const SORT_OPTIONS: SelectOption<MarketQuery["sort"]>[] = [
  { value: "newest", label: "Newest listed" },
  { value: "ending", label: "Ending soon" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
];

const PANEL_ID = "market-panel";
const tabId = (tab: Tab) => `market-tab-${tab}`;
const GRID =
  "mt-[16px] grid grid-cols-1 gap-[24px] [container-type:inline-size] [@container(min-width:560px)]:grid-cols-2 [@container(min-width:900px)]:grid-cols-3";
// A link dressed as the quiet button; the reset colours every a:hover as a link.
const QUIET_LINK = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

/** One card per project the active buyer holds (P2-MARKETPLACE-19): the newest held sale carries the
 *  buyer's whole share of the project; their older sales of it stay on Sold only. */
function oneCardPerHolding(items: MarketItem[], holdingPct: (projectId: string) => number): MarketItem[] {
  const newest = new Map<string, MarketItem>();
  for (const it of items) {
    if (!it.holding) continue;
    const cur = newest.get(it.projectId);
    if (!cur || it.sortAt > cur.sortAt) newest.set(it.projectId, it);
  }
  return items.map((it) => {
    if (!it.holding) return it;
    return newest.get(it.projectId) === it
      ? { ...it, holding: { sharePct: holdingPct(it.projectId) } }
      : { ...it, holding: null };
  });
}

export function MarketplacePage() {
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const market = useMarket();
  const { buyer } = useActiveBuyer();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useMinuteClock();

  // ── the view (LST-28's pattern: the field keeps its own copy of q) ──
  const query = React.useMemo(() => parseMarketQuery(params), [params]);
  const [text, setText] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    if (text.trim() !== query.q) setText(query.q);
  }
  const view = React.useMemo<MarketQuery>(() => ({ ...query, q: text.trim() }), [query, text]);
  const write = React.useCallback(
    (next: MarketQuery) => window.history.replaceState(null, "", `${pathname}${marketQueryString(next)}`),
    [pathname],
  );
  const changeView = (patch: Partial<Omit<MarketQuery, "page">>) => write({ ...view, ...patch, page: 1 });
  const changeQuery = (next: string) => {
    setText(next);
    write({ ...view, q: next.trim(), page: 1 });
  };

  // ── the data ──
  const ready = hydrated && buildsHydrated && market.hydrated;
  const listed = React.useMemo(() => {
    const ids = new Set(market.data.listings.map((l) => l.projectId));
    return projects.filter((p) => ids.has(p.id));
  }, [projects, market.data.listings]);
  // The grid reads a summary's name, cover, product count and products only — none of which the Brief
  // draft or the clips change — so it is derived without them.
  const summaries = React.useMemo(
    () =>
      new Map<string, { project: ManualProject; summary: ProjectSummary }>(
        listed.map((p) => [
          p.id,
          { project: p, summary: projectSummary(p, { builds, brief: null, videoJobs: [], now, projects, market: market.data }) },
        ]),
      ),
    [listed, builds, now, projects, market.data],
  );
  const items = React.useMemo(() => {
    const like = [...summaries.values()].map(({ summary: s }) => ({
      id: s.id,
      name: s.name,
      cover: s.cover,
      productCount: s.productCount,
    }));
    const all = marketItemsOf(market.data.listings, like, market.data.sales, market.data.bids, buyer.id, now);
    return oneCardPerHolding(all, (id) => holdingOf(id, buyer.id, market.data.sales)?.sharePct ?? 0);
  }, [summaries, market.data, buyer.id, now]);

  const counts = React.useMemo(() => filterMarket(items, { ...view, q: "", page: 1 }).counts, [items, view]);
  const result = React.useMemo(() => {
    const matched = view.q
      ? items.filter((it) => {
          const row = summaries.get(it.projectId);
          return row ? matchProject(row.summary, row.project.description, view.q).hit : false;
        })
      : items;
    const r = filterMarket(matched, { ...view, q: "" });
    return { ...r, page: Math.min(Math.max(1, view.page), r.pages) };
  }, [items, summaries, view]);

  // ── a page turn goes to the results and focuses their heading (LST-27) ──
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const changePage = (page: number) => {
    write({ ...view, page });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  };
  const clearSearch = () => {
    changeQuery("");
    searchRef.current?.focus();
  };

  const forSale = ready ? counts.forSale : null;
  const tabLabel = TABS.find((t) => t.id === view.tab)?.label ?? "For sale";
  const filtered = view.tab !== "purchased";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] [container-type:inline-size] min-[640px]:px-[32px]">
      <StorageErrorBanner className="mb-[16px]" />
      <DemoBuyerBanner className="mb-[20px]" />
      <header className="mb-[20px] flex flex-col gap-[4px]">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Explore marketplace</h1>
        <p aria-live="polite" className="text-md text-text-secondary">
          {forSale === null ? "—" : forSale === 0 ? "Nothing for sale" : `${forSale} for sale`}
        </p>
      </header>

      <MarketTabs tab={view.tab} counts={ready ? counts : null} onChange={(tab) => changeView({ tab })} />

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(view.tab)}>
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          {tabLabel}
        </h2>

        {/* Search, then Type and Sort (For sale and Sold only). Below a 720 px content box search takes the
            row and the two menus share the next. */}
        <div className="mt-[16px] grid grid-cols-2 gap-[12px] [@container(min-width:720px)]:flex [@container(min-width:720px)]:items-center">
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="col-span-2 [@container(min-width:720px)]:max-w-[420px] [@container(min-width:720px)]:flex-1"
          >
            <SearchInput
              ref={searchRef}
              value={text}
              onValueChange={changeQuery}
              onClear={() => searchRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === "Escape" && text) {
                  e.preventDefault();
                  changeQuery("");
                }
              }}
              placeholder="Search listings"
              aria-label="Search listings"
              enterKeyHint="search"
              className="text-[length:var(--font-size-md)]"
              containerClassName="min-h-[44px] [&>button]:before:-inset-[15.5px]"
            />
          </form>
          {filtered && (
            <>
              <SelectMenu<MarketQuery["type"]>
                ariaLabel="Type"
                value={view.type}
                onChange={(type) => changeView({ type })}
                options={TYPE_OPTIONS}
                placeholder="All"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:w-[160px] [@container(min-width:720px)]:shrink-0"
              />
              <SelectMenu<MarketQuery["sort"]>
                ariaLabel="Sort"
                value={view.sort}
                onChange={(sort) => changeView({ sort })}
                options={SORT_OPTIONS}
                placeholder="Newest listed"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:w-[200px] [@container(min-width:720px)]:shrink-0"
              />
            </>
          )}
        </div>

        <div ref={resultsRef} className="scroll-mt-[16px]" />

        {!ready ? (
          <ul role="list" aria-hidden className={GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <ListingCardSkeleton />
              </li>
            ))}
          </ul>
        ) : result.items.length === 0 ? (
          counts[view.tab] > 0 && view.q ? (
            <StateCard
              tone="empty"
              icon={<Icon icon={Search01Icon} size={32} />}
              title={`No listings match “${view.q}”`}
              body={`Nothing in ${tabLabel} has that in a project or product name or description.`}
              action={
                <Button type="button" hierarchy="secondary" size="md" onClick={clearSearch}>
                  Clear search
                </Button>
              }
              className="mx-auto mt-[24px]"
            />
          ) : counts[view.tab] > 0 ? (
            // The Type filter alone emptied the tab.
            <StateCard
              tone="empty"
              icon={<Icon icon={Search01Icon} size={32} />}
              title={`No ${TYPE_OPTIONS.find((o) => o.value === view.type)?.label ?? ""} listings in ${tabLabel}`}
              body="Choose All under Type to see every listing here."
              action={
                <Button type="button" hierarchy="secondary" size="md" onClick={() => changeView({ type: "all" })}>
                  Show every type
                </Button>
              }
              className="mx-auto mt-[24px]"
            />
          ) : (
            <EmptyTab tab={view.tab} buyerName={buyer.name} onForSale={() => changeView({ tab: "forSale" })} />
          )
        ) : (
          <>
            <ul role="list" className={GRID}>
              {result.items.map((item) => (
                <li key={item.sale?.id ?? item.listing.id}>
                  <ListingCard
                    item={item}
                    tab={view.tab}
                    now={now}
                    heldPct={view.tab === "forSale" ? (holdingOf(item.projectId, buyer.id, market.data.sales)?.sharePct ?? null) : null}
                  />
                </li>
              ))}
            </ul>
            {result.pages > 1 ? <Pagination page={result.page} pageCount={result.pages} onChange={changePage} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── tabs ─────────────────────────

// My projects' ARIA tablist (LST-8): one Tab stop, ← → Home End move and select, every tab names its
// count, and all of them control the one panel.
function MarketTabs({
  tab,
  counts,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number> | null;
  onChange: (tab: Tab) => void;
}) {
  const refs = React.useRef(new Map<Tab, HTMLButtonElement>());
  const ids = TABS.map((t) => t.id);
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, from: Tab) => {
    const i = ids.indexOf(from);
    const to =
      e.key === "ArrowRight"
        ? ids[(i + 1) % ids.length]
        : e.key === "ArrowLeft"
          ? ids[(i - 1 + ids.length) % ids.length]
          : e.key === "Home"
            ? ids[0]
            : e.key === "End"
              ? ids[ids.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    onChange(to);
    refs.current.get(to)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Explore marketplace"
      className="flex flex-wrap items-center gap-[8px] border-b border-solid border-border pb-[16px]"
    >
      {TABS.map((t) => {
        const active = t.id === tab;
        const n = counts ? counts[t.id] : null;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            id={tabId(t.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={PANEL_ID}
            aria-label={`${t.label}, ${n === null ? "not counted yet" : n === 1 ? "1 listing" : `${n} listings`}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, t.id)}
            className={cn(
              "inline-flex h-[36px] items-center gap-[8px] rounded-full border border-solid px-[14px] text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px]",
              active
                ? "border-transparent bg-bg-brand-subtle text-text-brand"
                : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-sm font-semibold tabular-nums",
                active ? "bg-bg-brand text-text-on-brand" : "bg-bg-subtle text-text-secondary",
              )}
            >
              {n ?? "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────── empty tabs (P2-MARKETPLACE-7) ─────────────────────────

function EmptyTab({ tab, buyerName, onForSale }: { tab: Tab; buyerName: string; onForSale: () => void }) {
  if (tab === "sold") {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={Tag01Icon} size={32} />}
        title="Nothing sold yet"
        body="A sale shows here once a demo buyer buys a listing."
        className="mx-auto mt-[24px]"
      />
    );
  }
  if (tab === "purchased") {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={ShoppingBag01Icon} size={32} />}
        title={`${buyerName} hasn't bought anything yet`}
        body={`Buy a listing under For sale while shopping as ${buyerName}.`}
        action={
          <Button type="button" hierarchy="secondary" size="md" onClick={onForSale}>
            See what&apos;s for sale
          </Button>
        }
        className="mx-auto mt-[24px]"
      />
    );
  }
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={Store01Icon} size={32} />}
      title="Nothing for sale yet"
      body="A project shows here once it's added to the marketplace. Open a minted project and choose Add to marketplace."
      action={
        <Link href="/projects" className={QUIET_LINK}>
          Go to My projects
        </Link>
      }
      className="mx-auto mt-[24px]"
    />
  );
}
