"use client";

// My projects (master page "My project" section, Shared kit KIT-EM-01): every
// project this account keeps, as the web's /projects lists them — the tabs
// All · Draft · Minted · Listed · Sold with their counts (the kit's
// MobileTabs), search over project and product names and descriptions, Shared
// only and the sort (one filter sheet), the count line, and one card per
// project: the cover, the title with its status chip, "{n} products · Saved
// {date}" and the next-step hint. A card has no button and no ⋮: the whole
// card opens the project (owner, 2026-10-11; the master page's card ⋮ and its
// view / like counts are not built — web rule, and no invented figures).
// "New project" (+) in the top bar starts one on the AI tab. Twelve at a
// time, Show more for the rest. The view lives in the address
// (`?tab=&q=&sort=&showcase=1`); what was shown and where the list was
// scrolled come back when Back returns from a project. Back goes to the
// Profile hub. A write the browser refused says so under the top bar.
//
// Web parity (2026-11-22):
// · Purchased after Sold (`?tab=purchased`, CL-035): what the demo creator you
//   shop as bought, one card per project (purchased/purchased-card.tsx), the
//   Shopping as row on top and "{n} projects bought as {name} (demo creator)";
// · All holds the purchases too (CL-037, the web's all-tab.ts): one order, one
//   search, one count; a whole project bought shows once, as the creator's own
//   project, its line starting "Bought from {creator}" (CL-038);
// · under the top bar, the plan's projects used: "2 of 3 projects used", and
//   with every one in use "· Builder gives you 20" to Builder's checkout (CL-034);
// · a card's hint while a video renders: "Video rendering · {p}%" / "Video
//   waiting to render" (CL-015); signed while videos are still made: the chip
//   "Waiting for videos" and "Next: review {n} videos" (CL-030).

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Add01Icon, ArrowRight01Icon, Clock01Icon, CpuIcon, File01Icon, FilterHorizontalIcon, ImageNotFound01Icon, Search01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useMinuteClock } from "@/components/create/build-status";
import { allTabOf, type AllEntry } from "@/components/projects/all-tab";
import { useProjectRoom } from "@/components/projects/project-limit";
import { usePurchased } from "@/components/projects/purchased/use-purchased";
import { ICONS } from "@/components/projects/status-chip";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { readBriefDraft, showcaseBackfillOf } from "@/lib/brief/project-brief";
import { briefDraftKey } from "@/lib/brief/types";
import { useCreateHistory } from "@/lib/create/history";
import {
  LIST_TABS,
  SORT_OPTIONS,
  countLine,
  listQueryString,
  parseListQuery,
  type ListItem,
  type ListTab,
} from "@/lib/manual/project-list";
import { PAGE_SIZE, cardText, projectSummary, renderHintOf, type ListQuery, type ProjectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { useMarket } from "@/lib/market/market-store";
import { HELD_CHIP, heldOf, useHeld } from "@/lib/market/held";
import type { PurchasedProject } from "@/lib/market/purchases";
import { useProjectVideos } from "@/lib/video/store";
import { cn } from "@/lib/utils";
import { LIST_CARD } from "../kit/list";
import { PickList } from "../kit/pick-list";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { MobileTabs } from "../kit/tabs";
import { SCROLL_ATTR, Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { ShopAsRow } from "../purchased/parts";
import { PurchasedCard } from "../purchased/purchased-card";
import { LINK_MD, PhoneStatusChip } from "./parts";

const DRAFT_PREFIX = briefDraftKey("");
let draftsVersion = 0;
function subscribeDrafts(onChange: () => void): () => void {
  const bump = () => {
    draftsVersion += 1;
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(DRAFT_PREFIX)) bump();
  };
  window.addEventListener("focus", bump);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("focus", bump);
    window.removeEventListener("storage", onStorage);
  };
}

/** The web's empty-tab words (LST-53). */
const EMPTY_TAB: Record<Exclude<ListTab, "all">, { title: string; body?: string; icon: keyof typeof ICONS }> = {
  draft: { title: "Nothing in progress", body: "A build you save starts here.", icon: "circle" },
  minted: { title: "Nothing minted yet", body: "Open a draft and mint it.", icon: "hexagon" },
  listed: { title: "Nothing on the marketplace", body: "Open a minted project and sell it.", icon: "tag" },
  sold: { title: "Nothing sold yet", icon: "badge-check" },
};

/** The Purchased tab's address (`?tab=purchased`), beside the list's own tabs (the web's). */
const PURCHASED = "purchased";
type PhoneListTab = ListTab | typeof PURCHASED;

// What the list showed when a card was opened: Back puts it back (the web's rememberScroll).
const KEPT_KEY = "ideeza:m:projects:kept";
type Kept = { query: string; shown: number; top: number };

function readKept(query: string): Kept | null {
  try {
    const raw = sessionStorage.getItem(KEPT_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Kept>) : null;
    return v && v.query === query && typeof v.shown === "number" && typeof v.top === "number" ? (v as Kept) : null;
  } catch {
    return null;
  }
}

function keep(kept: Kept | null): void {
  try {
    if (kept) sessionStorage.setItem(KEPT_KEY, JSON.stringify(kept));
    else sessionStorage.removeItem(KEPT_KEY);
  } catch {
    // Storage refused: Back opens the list at its top.
  }
}

export function MyProjectsScreen() {
  const { hydrated, projects, backfillShowcase } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs } = useVideoJobs();
  const { hydrated: marketHydrated, data: market } = useMarket();
  const bought = usePurchased();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const now = useMinuteClock();
  const query = React.useMemo(() => parseListQuery(params), [params]);
  const [view, setView] = React.useState<ListQuery>(query);
  const [onPurchased, setOnPurchased] = React.useState(() => params.get("tab") === PURCHASED);
  const keptKey = (purchased: boolean, q: ListQuery) => (purchased ? `?tab=${PURCHASED}` : listQueryString({ ...q, page: 1 }));
  const [kept] = React.useState(() => (typeof window === "undefined" ? null : readKept(keptKey(params.get("tab") === PURCHASED, query))));
  const [shown, setShown] = React.useState(kept?.shown ?? PAGE_SIZE);
  const [filtering, setFiltering] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const change = (patch: Partial<ListQuery>) => {
    const next = { ...view, ...patch, page: 1 };
    setView(next);
    setOnPurchased(false);
    setShown(PAGE_SIZE);
    window.history.replaceState(window.history.state, "", `${pathname}${listQueryString(next)}`);
  };
  const openPurchased = () => {
    setOnPurchased(true);
    window.history.replaceState(window.history.state, "", `${pathname}?tab=${PURCHASED}`);
  };

  const tick = React.useSyncExternalStore(subscribeDrafts, () => draftsVersion, () => -1);
  const ready = hydrated && buildsHydrated && jobsHydrated && marketHydrated && bought.ready && tick >= 0;

  // A project minted with sharing before the flag existed gets its shared date on first read,
  // as the web's list does (COR-105), so Shared only finds it here too.
  React.useEffect(() => {
    if (!ready) return;
    for (const p of projects) {
      const at = showcaseBackfillOf(p, readBriefDraft(p.id));
      if (at !== null) backfillShowcase(p.id, at);
    }
  }, [ready, projects, backfillShowcase, tick]);

  const items = React.useMemo<ListItem[] | null>(
    () =>
      ready
        ? projects.map((project) => ({
            project,
            summary: projectSummary(project, { builds, brief: readBriefDraft(project.id), videoJobs: jobs, now, projects, market }),
          }))
        : null,
    // `tick` re-reads the drafts when another tab or the focus changes them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, projects, builds, jobs, now, market, tick],
  );
  // Every match, in order (the web's pages, one after another): the phone shows them twelve at a time.
  // All lists the purchases too (the web's all-tab.ts), so the list waits for them as for the other stores.
  const purchases = bought.purchases;
  const result = React.useMemo(() => (items ? allTabOf(items, purchases, { ...view, page: 1 }) : null), [items, purchases, view]);
  const matches = React.useMemo<AllEntry[]>(() => {
    if (!items || !result) return [];
    return Array.from({ length: result.pageCount }, (_, i) => (i === 0 ? result.entries : allTabOf(items, purchases, { ...view, page: i + 1 }).entries)).flat();
  }, [items, purchases, result, view]);

  // Back from a project: the list is where it was left, once its cards are there.
  const scroller = () => listRef.current?.closest<HTMLElement>(`[${SCROLL_ATTR}]`) ?? null;
  const restored = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!result || restored.current) return;
    restored.current = true;
    const el = scroller();
    if (kept && el) el.scrollTop = kept.top;
    keep(null);
  }, [result, kept]);
  const onOpenCard = () => keep({ query: keptKey(onPurchased, view), shown, top: scroller()?.scrollTop ?? 0 });

  const noProjects = result !== null && result.total === 0 && purchases.length === 0;
  // The strip scrolls sideways: the tab on screen is brought into it (Purchased sits past Sold).
  const activeTab = onPurchased ? PURCHASED : view.tab;
  React.useEffect(() => {
    const strip = tabsRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-tab="${activeTab}"]`);
    if (!strip || !tab) return;
    const left = tab.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = Math.max(0, left - 16);
  }, [activeTab, noProjects]);
  const tabLabel = LIST_TABS.find((t) => t.id === view.tab)?.label ?? "All";
  const narrowed = view.tab !== "all" || view.showcase;
  const filtered = view.showcase || view.sort !== "updated";

  return (
    <Screen
      top={
        <TopBar
          back="/m/profile"
          title="My projects"
          actions={noProjects || result === null ? [] : [{ icon: Add01Icon, label: "New project", onClick: () => router.push("/m/ai") }]}
        />
      }
      className="pb-12"
    >
      <OfflineBanner />
      <StorageErrorBanner className="mx-8 mb-6" />
      <ProjectsUsage />
      {noProjects ? (
        <div className="px-8 pt-8">
          <EmptyState
            icon={File01Icon}
            title="No projects yet"
            // The web's words (NoProjectsState), the phone's place: the AI tab is its Home box (PRJ-12).
            body="Describe an idea on the AI tab and save the build. It shows up here."
            action={{ label: "Create a project", href: "/m/ai" }}
          />
        </div>
      ) : (
        <>
          <div ref={tabsRef} className="overflow-x-auto [scrollbar-width:none]">
            <MobileTabs<PhoneListTab>
              label="Projects"
              width="hug"
              className="min-w-max px-8 max-[359px]:gap-3 max-[359px]:px-4"
              tabs={[
                ...LIST_TABS.map((t) => ({
                  value: t.id as PhoneListTab,
                  label: t.label,
                  count: result ? result.counts[t.id] : undefined,
                  countLabel: result ? `, ${result.counts[t.id]} ${result.counts[t.id] === 1 ? "project" : "projects"}` : undefined,
                })),
                {
                  value: PURCHASED,
                  label: "Purchased",
                  count: bought.ready ? purchases.length : undefined,
                  countLabel: bought.ready ? `, ${purchases.length} ${purchases.length === 1 ? "project" : "projects"}` : undefined,
                },
              ]}
              value={onPurchased ? PURCHASED : view.tab}
              onChange={(tab) => (tab === PURCHASED ? openPurchased() : change({ tab }))}
            />
          </div>
          {onPurchased ? (
            <div ref={listRef} className="flex flex-col gap-6 px-8 pt-8">
              <PurchasedPanel ready={bought.ready} purchases={purchases} buyerName={bought.buyer.name} now={now} onOpen={onOpenCard} />
            </div>
          ) : (
          <div ref={listRef} className="flex flex-col gap-6 px-8 pt-8">
            <div className="flex items-center gap-4">
              <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 flex-1">
                <SearchInput
                  size="xl"
                  value={view.q}
                  onValueChange={(q) => change({ q })}
                  placeholder="Search projects and products"
                  aria-label="Search projects and products"
                  enterKeyHint="search"
                />
              </form>
              <Button
                hierarchy="secondary"
                size="xl"
                iconOnly
                aria-label={filtered ? "Filter and sort, on" : "Filter and sort"}
                aria-haspopup="dialog"
                onClick={() => setFiltering(true)}
                className={filtered ? "border-[var(--color-border-brand)]" : undefined}
              >
                <Icon icon={FilterHorizontalIcon} size={20} />
              </Button>
            </div>
            <p aria-live="polite" className={T.rowTitle}>
              {result ? countLine(result) : "—"}
            </p>
            {!result ? (
              <ul aria-label="Loading" className="flex flex-col gap-6">
                {[0, 1, 2].map((i) => (
                  <li key={i} className={cn(LIST_CARD, "gap-4 p-4")}>
                    <Skeleton shape="block" className="aspect-video h-auto w-full" />
                    <Skeleton shape="text" size="lg" />
                    <Skeleton shape="text" size="md" />
                  </li>
                ))}
              </ul>
            ) : matches.length === 0 ? (
              view.tab !== "all" && result.counts[view.tab] === 0 ? (
                <EmptyState icon={ICONS[EMPTY_TAB[view.tab].icon]} title={EMPTY_TAB[view.tab].title} body={EMPTY_TAB[view.tab].body} />
              ) : view.q.trim() ? (
                <>
                  <EmptyState
                    icon={Search01Icon}
                    title={`No matches for "${view.q}"`}
                    body={`Nothing in ${view.showcase ? `${tabLabel} (Shared only)` : tabLabel} has that in a project or product name or description.`}
                    action={
                      narrowed
                        ? { label: "Search all projects", onClick: () => change({ tab: "all", showcase: false }) }
                        : { label: "Clear search", onClick: () => change({ q: "" }) }
                    }
                  />
                  {narrowed && (
                    <button type="button" onClick={() => change({ q: "" })} className={cn(LINK_MD, "min-h-[44px] self-center")}>
                      Clear search
                    </button>
                  )}
                </>
              ) : (
                <EmptyState icon={ICONS.eye} title={result.showcased === 0 ? "Nothing shared to Feed yet" : `Nothing shared in ${tabLabel}`} />
              )
            ) : (
              <>
                <ul aria-label={`${tabLabel} projects`} className="flex flex-col gap-6">
                  {matches.slice(0, shown).map((e) => (
                    <li key={e.key}>
                      {e.kind === "own" ? (
                        <ProjectCard summary={e.row.summary} via={e.row.via} now={now} onOpen={onOpenCard} />
                      ) : (
                        <PurchasedCard p={e.bought} now={now} variant="all" onOpen={onOpenCard} />
                      )}
                    </li>
                  ))}
                </ul>
                {matches.length > shown && (
                  <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                    Show more ({matches.length - shown})
                  </Button>
                )}
              </>
            )}
          </div>
          )}
        </>
      )}

      <Sheet open={filtering} onClose={() => setFiltering(false)} title="Filter and sort">
        <div className="flex flex-col gap-4 pb-8">
          <label className={cn(T.bodyLg, "relative flex min-h-[44px] cursor-pointer items-center gap-4")}>
            <input type="checkbox" className="sr-only" checked={view.showcase} onChange={() => change({ showcase: !view.showcase })} />
            <Checkbox checked={view.showcase} decorative />
            Shared only
          </label>
          <p className={cn(T.rowTitle, "text-text-secondary")}>Sort</p>
          <PickList
            label="Sort"
            options={SORT_OPTIONS}
            value={view.sort}
            onPick={(sort) => {
              change({ sort });
              setFiltering(false);
            }}
          />
        </div>
      </Sheet>
    </Screen>
  );
}

/** "2 of 3 projects used" under the top bar — and, with every one in use, the way to more: "· Builder gives you 20",
 *  to that plan's checkout (CL-034; monthly from Free, else the cycle paid by). None on Disruptor. */
function ProjectsUsage() {
  const room = useProjectRoom();
  if (!room.ready) return null;
  const href = room.full && room.pitch ? `/m/plans/checkout?plan=${room.pitch.tier}&cycle=${room.cycle}` : null;
  return (
    <p className={cn(T.meta, "px-8 pb-4 tabular-nums")}>
      {room.held} of {room.allowed} projects used
      {href && room.pitch && (
        <>
          {" · "}
          <Link href={href} className={cn(LINK_MD, "-my-6 inline-flex min-h-[44px] items-center")}>
            {room.pitch.name} gives you {room.pitch.projects}
          </Link>
        </>
      )}
    </p>
  );
}

/** My projects › Purchased (CL-035): what the demo creator you shop as bought, one card per project. */
function PurchasedPanel({
  ready,
  purchases,
  buyerName,
  now,
  onOpen,
}: {
  ready: boolean;
  purchases: readonly PurchasedProject[];
  buyerName: string;
  now: number;
  onOpen: () => void;
}) {
  return (
    <>
      <ShopAsRow />
      <p aria-live="polite" className={T.rowTitle}>
        {!ready ? "—" : purchases.length === 0 ? `Nothing bought as ${buyerName} yet` : `${purchases.length} ${purchases.length === 1 ? "project" : "projects"} bought as ${buyerName} (demo creator)`}
      </p>
      {!ready ? (
        <ul aria-label="Loading" className="flex flex-col gap-6">
          {[0, 1].map((i) => (
            <li key={i} className={cn(LIST_CARD, "gap-4 p-4")}>
              <Skeleton shape="block" className="aspect-video h-auto w-full" />
              <Skeleton shape="text" size="lg" />
              <Skeleton shape="text" size="md" />
            </li>
          ))}
        </ul>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingBag01Icon}
          title="Nothing bought yet"
          body={`What ${buyerName} buys on Explore marketplace shows here: the whole project or its copies, how many, and what each use allows.`}
          action={{ label: "Go to Feed", href: "/m" }}
        />
      ) : (
        <ul aria-label="Purchased projects" className="flex flex-col gap-6">
          {purchases.map((p) => (
            <li key={`${p.source}:${p.id}`}>
              <PurchasedCard p={p} now={now} variant="tab" onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "Waiting for videos": signed while its videos are still made, it says so until it is live (CL-030). */
function HeldChip() {
  return (
    <Badge tone="warning" icon={<Icon icon={Clock01Icon} size={12} />} className="shrink-0">
      {HELD_CHIP}
    </Badge>
  );
}

function ProjectCard({ summary, via, now, onOpen }: { summary: ProjectSummary; via?: string; now: number; onOpen: () => void }) {
  const [failed, setFailed] = React.useState(false);
  const text = cardText(summary, now);
  // While a video renders for the project or a product (CL-015): the render clock ticks faster than the list's.
  const { jobs, now: renderNow } = useVideoJobs();
  const renderHint = renderHintOf(summary.id, jobs, renderNow);
  // Signed while videos were still being made (CL-030): it says so until it's live.
  const { store: held } = useHeld();
  const waiting = heldOf(held, summary.id).length > 0;
  const { record } = useProjectVideos(waiting ? summary.id : null);
  const toReview = Object.values(record?.products ?? {}).filter((v) => v.takes.some((t) => t.toReview && t.readyAt && !t.failure)).length;
  const waitingHint = !waiting ? null : toReview > 0 ? `Next: review ${toReview} ${toReview === 1 ? "video" : "videos"}` : HELD_CHIP;
  return (
    <Link
      href={phoneProjectHref(summary.id)}
      onClick={onOpen}
      className={cn(LIST_CARD, "gap-4 p-4 outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus")}
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-md bg-bg-surface-raised">
        {summary.cover && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- the project's cover from the build store
          <img src={summary.cover} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[color:var(--color-icon-secondary)]">
            <Icon icon={summary.cover ? ImageNotFound01Icon : CpuIcon} size={24} />
            {summary.cover && <span className={cn(T.meta, "text-text-tertiary")}>Image didn’t load</span>}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-2 px-2 pb-2">
        <span className="flex items-start justify-between gap-4">
          <span className={cn(T.section, "line-clamp-2 min-w-0 break-words")}>{summary.name}</span>
          {waiting ? <HeldChip /> : <PhoneStatusChip status={summary.status} word={text.chip.word} shared={text.chip.badge !== null} />}
        </span>
        <span className={cn(T.body, "truncate")}>
          {summary.boughtFrom ? `Bought from ${summary.boughtFrom} · ` : ""}
          {text.count} · <time dateTime={text.time.dateTime}>{text.time.text}</time>
          {via ? ` · matches ${via}` : ""}
        </span>
        <span className={cn(T.rowTitle, "flex items-center gap-2 text-text-secondary")}>
          <span className={cn("truncate", renderHint && "tabular-nums", waitingHint && !renderHint && "text-text-warning")}>{renderHint ?? waitingHint ?? text.hint}</span>
          <Icon icon={ArrowRight01Icon} size={16} className="shrink-0" />
        </span>
      </span>
    </Link>
  );
}
