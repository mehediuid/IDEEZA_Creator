"use client";

// MyProjects — the "My Projects" surface from User Panel V2 (Figma node
// 16838:392921). Content is lifted from the Figma — the six filter tabs
// (All / Public / Contributed / Private / Draft / Utility NFT), the
// search + Sort By + Status toolbar, the project-card grid, the Utility
// NFT card variant, and pagination — but everything is rendered with the
// existing IDEEZA design-system tokens and the same patterns the Newsfeed
// grid already uses (rounded-[12px] thumbnails, 2xs tabular-nums stats,
// rounded-full controls). Nothing in the shared chrome is changed.

import * as React from "react";
import Link from "next/link";
import {
  ViewIcon,
  FavouriteIcon,
  Comment01Icon,
  MoreVerticalIcon,
  Search01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";

// ───────────────────────── data model ─────────────────────────

type TabId =
  | "all"
  | "public"
  | "contributed"
  | "private"
  | "draft"
  | "nft";

type Scope = "public" | "contributed" | "private" | "draft";
type Status = "idea" | "prototyping" | "purchased";

type MyProject = {
  id: string;
  name: string;
  image: string;
  status: Status;
  scope: Scope;
  products: number;
  views: number;
  likes: number;
  comments: number;
  createdAt: number; // higher = newer (drives Newest/Oldest sort)
};

type NftItem = {
  id: string;
  title: string;
  tokenId: string;
  owner: string;
  revealAt: string;
  claimed: boolean;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "public", label: "Public Projects" },
  { id: "contributed", label: "Contributed Projects" },
  { id: "private", label: "Private Projects" },
  { id: "draft", label: "Draft" },
  { id: "nft", label: "Utility NFT" },
];

const SORTS = [
  { id: "newest", label: "Newest to Oldest" },
  { id: "oldest", label: "Oldest to Newest" },
  { id: "views", label: "Most Viewed" },
  { id: "likes", label: "Most Liked" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const STATUSES = [
  { id: "default", label: "Default" },
  { id: "physical", label: "Physical NFT" },
  { id: "virtual", label: "Virtual NFT" },
  { id: "utility", label: "Utility NFT" },
  { id: "sold", label: "Sold" },
  { id: "due", label: "Payment Due" },
] as const;
type StatusId = (typeof STATUSES)[number]["id"];

const IMG = "/innovations";

const PROJECTS: MyProject[] = [
  { id: "p1", name: "Robotic Arm w/ Haptics", image: `${IMG}/robotic-arm-with-haptics.png`, status: "prototyping", scope: "public", products: 2, views: 3988, likes: 35, comments: 35, createdAt: 10 },
  { id: "p2", name: "Hexapod Walking Robot", image: `${IMG}/hexapod-walking-robot.png`, status: "idea", scope: "public", products: 2, views: 2410, likes: 48, comments: 12, createdAt: 9 },
  { id: "p3", name: "Line-Following Rover", image: `${IMG}/line-following-micro-rover.png`, status: "purchased", scope: "public", products: 1, views: 5120, likes: 76, comments: 21, createdAt: 8 },
  { id: "p4", name: "LoRa Weather Station", image: `${IMG}/lora-weather-station.png`, status: "purchased", scope: "public", products: 3, views: 1890, likes: 22, comments: 8, createdAt: 7 },
  { id: "p5", name: "Self-Balancing Two-Wheeler", image: `${IMG}/self-balancing-two-wheeler.png`, status: "prototyping", scope: "contributed", products: 2, views: 4360, likes: 59, comments: 30, createdAt: 6 },
  { id: "p6", name: "Quadruped Pet Companion", image: `${IMG}/quadruped-pet-companion.jpg`, status: "idea", scope: "contributed", products: 9, views: 7200, likes: 91, comments: 44, createdAt: 5 },
  { id: "p7", name: "Swarm Beacon Drone", image: `${IMG}/swarm-beacon-drone.png`, status: "idea", scope: "private", products: 2, views: 980, likes: 14, comments: 3, createdAt: 4 },
  { id: "p8", name: "E-Ink Smartwatch", image: `${IMG}/e-ink-smartwatch.png`, status: "prototyping", scope: "private", products: 1, views: 3310, likes: 41, comments: 18, createdAt: 3 },
  { id: "p9", name: "Heart-Rate Fitness Band", image: `${IMG}/heart-rate-fitness-band.png`, status: "idea", scope: "draft", products: 2, views: 640, likes: 9, comments: 2, createdAt: 2 },
  { id: "p10", name: "Smart Plant Watering Hub", image: `${IMG}/smart-plant-watering-hub.png`, status: "prototyping", scope: "draft", products: 3, views: 1520, likes: 27, comments: 11, createdAt: 1 },
];

const NFTS: NftItem[] = [
  { id: "n1", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44238", owner: "0x780…07887", revealAt: "Not Reveal", claimed: false },
  { id: "n2", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44239", owner: "0x780…07887", revealAt: "Not Reveal", claimed: true },
  { id: "n3", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44240", owner: "0x780…07887", revealAt: "Not Reveal", claimed: false },
  { id: "n4", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44241", owner: "0x780…07887", revealAt: "Not Reveal", claimed: true },
  { id: "n5", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44242", owner: "0x780…07887", revealAt: "Not Reveal", claimed: true },
  { id: "n6", title: "MJC ICOMPANY PRESELL CA…", tokenId: "44243", owner: "0x780…07887", revealAt: "Not Reveal", claimed: false },
];

// ───────────────────────── helpers ─────────────────────────

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

function tabCount(id: TabId): number {
  if (id === "all") return PROJECTS.length;
  if (id === "nft") return NFTS.length;
  return PROJECTS.filter((p) => p.scope === id).length;
}

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  idea: { label: "Idea", cls: "bg-bg-brand-subtle text-text-brand" },
  prototyping: { label: "Prototyping", cls: "bg-bg-warning-subtle text-text-warning" },
  purchased: { label: "Purchased", cls: "bg-bg-success-subtle text-text-success" },
};

// ───────────────────────── page ─────────────────────────

export function MyProjects() {
  const [tab, setTab] = React.useState<TabId>("public");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortId>("newest");
  const [status, setStatus] = React.useState<StatusId>("default");
  const [page, setPage] = React.useState(1);

  // Switching scope or searching resets to the first page. Done in the
  // handlers (not an effect) to avoid a cascading-render setState-in-effect.
  const changeTab = (id: TabId) => {
    setTab(id);
    setPage(1);
  };
  const changeQuery = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const projects = React.useMemo(() => {
    let list = PROJECTS.slice();
    if (tab !== "all") list = list.filter((p) => p.scope === tab);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    switch (sort) {
      case "oldest":
        list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "views":
        list.sort((a, b) => b.views - a.views);
        break;
      case "likes":
        list.sort((a, b) => b.likes - a.likes);
        break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [tab, query, sort]);

  const nftList = React.useMemo(() => {
    if (tab !== "nft") return [];
    if (!query.trim()) return NFTS;
    const q = query.trim().toLowerCase();
    return NFTS.filter((n) => n.title.toLowerCase().includes(q));
  }, [tab, query]);

  const isNft = tab === "nft";
  const shown = isNft ? nftList.length : projects.length;

  return (
    <div className="w-full px-[32px] py-[28px]">
      <header className="mb-[20px]">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          My projects
        </h1>
        <p className="mt-[4px] text-sm text-text-secondary">
          Everything you&apos;ve created — switch scopes, search, and pick up
          any project where you left off.
        </p>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Project scope"
        className="flex flex-wrap items-center gap-[8px] border-b border-border pb-[16px]"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => changeTab(t.id)}
              className={[
                "inline-flex h-[36px] items-center gap-[8px] rounded-full border px-[14px] text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                active
                  ? "border-transparent bg-bg-brand-subtle text-text-brand"
                  : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-2xs font-bold tabular-nums",
                  active
                    ? "bg-violet-600 text-text-on-brand"
                    : "bg-bg-surface-raised text-text-tertiary",
                ].join(" ")}
              >
                {tabCount(t.id)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: search + Sort By + Status */}
      <div className="mt-[16px] flex flex-col gap-[12px] min-[860px]:flex-row min-[860px]:items-center">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative min-[860px]:max-w-[420px] min-[860px]:flex-1"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-text-tertiary"
          >
            <Icon icon={Search01Icon} size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search by project name or tag"
            aria-label="Search projects"
            className="h-[40px] w-full rounded-full border border-border bg-bg-surface pl-[42px] pr-[16px] text-sm text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus placeholder:text-text-tertiary"
          />
        </form>

        <div className="flex items-center gap-[10px] min-[860px]:ml-auto">
          <Select
            label="Sort By"
            value={sort}
            onChange={(v) => setSort(v as SortId)}
            options={SORTS}
          />
          <Select
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as StatusId)}
            options={STATUSES}
          />
        </div>
      </div>

      {/* Count line */}
      <p className="mt-[16px] text-sm font-medium text-text-secondary">
        {shown} of {isNft ? 26 : 100} {isNft ? "Showing" : "Projects"}
      </p>

      {/* Grid */}
      {isNft ? (
        nftList.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            role="list"
            className="mt-[16px] grid grid-cols-1 gap-[24px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
          >
            {nftList.map((n) => (
              <li key={n.id}>
                <NftCard item={n} />
              </li>
            ))}
          </ul>
        )
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <ul
          role="list"
          className="mt-[16px] grid grid-cols-1 gap-[24px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
        >
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}

      {shown > 0 && <Pagination page={page} total={10} onChange={setPage} />}
    </div>
  );
}

// ───────────────────────── project card ─────────────────────────

function ProjectCard({ project }: { project: MyProject }) {
  const [imgOk, setImgOk] = React.useState(true);
  const badge = STATUS_BADGE[project.status];

  return (
    <article className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-bg-surface">
      <div className="group/thumb relative aspect-[16/10] overflow-hidden bg-bg-surface-raised">
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.image}
            alt={project.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-bg-surface-raised text-text-tertiary"
          >
            <Icon icon={ViewIcon} size={28} strokeWidth={1.4} />
          </div>
        )}

        {/* status badge — overlaid top-left */}
        <span
          className={`absolute left-[10px] top-[10px] inline-flex h-[24px] items-center rounded-full px-[10px] text-2xs font-bold ${badge.cls}`}
        >
          {badge.label}
        </span>

        {/* carousel dots */}
        <div className="absolute inset-x-0 bottom-[10px] flex items-center justify-center gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className={
                i === 0
                  ? "h-[6px] w-[14px] rounded-full bg-white"
                  : "h-[6px] w-[6px] rounded-full bg-white/55"
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] p-[14px]">
        <div className="flex items-start justify-between gap-[10px]">
          <div className="min-w-0">
            <p className="truncate text-md font-medium text-text-primary">
              {project.name}
            </p>
            <p className="mt-[2px] text-sm text-text-tertiary">
              {project.products} {project.products === 1 ? "Product" : "Products"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[4px]">
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex h-[28px] items-center rounded-full px-[10px] text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              View
            </Link>
            <button
              type="button"
              aria-label={`More options for ${project.name}`}
              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={MoreVerticalIcon} size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-[16px] text-2xs font-medium tabular-nums text-text-tertiary">
          <Stat icon={ViewIcon} value={project.views} title="views" />
          <Stat icon={FavouriteIcon} value={project.likes} title="appreciations" />
          <Stat icon={Comment01Icon} value={project.comments} title="comments" />
        </div>
      </div>
    </article>
  );
}

function Stat({
  icon,
  value,
  title,
}: {
  icon: IconValue;
  value: number;
  title: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-[5px]"
      title={`${value} ${title}`}
    >
      <Icon icon={icon} size={14} strokeWidth={1.6} />
      {formatCount(value)}
    </span>
  );
}

// ───────────────────────── NFT card ─────────────────────────

function NftCard({ item }: { item: NftItem }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-bg-surface">
      {/* Reveal placeholder — the "?" hex */}
      <div className="relative flex aspect-[16/11] items-center justify-center overflow-hidden bg-gradient-to-br from-violet-700 to-violet-950">
        <span className="absolute right-[10px] top-[10px] inline-flex h-[24px] items-center rounded-full bg-white/15 px-[10px] text-2xs font-bold text-white backdrop-blur">
          NFT Reveal
        </span>
        <span
          aria-hidden
          className="inline-flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-white/10 text-violet-100"
        >
          <Icon icon={HelpCircleIcon} size={40} strokeWidth={1.8} />
        </span>
      </div>

      <div className="flex flex-col gap-[10px] p-[14px]">
        <p className="truncate text-md font-medium text-text-primary">
          {item.title}
        </p>
        <dl className="flex flex-col gap-[6px] text-sm">
          <NftRow label="Token Id" value={item.tokenId} />
          <NftRow label="Owner" value={item.owner} copyable />
          <NftRow label="Reveal At" value={item.revealAt} />
        </dl>
        <button
          type="button"
          disabled={item.claimed}
          className={[
            "mt-[2px] inline-flex h-[40px] w-full items-center justify-center rounded-full text-sm font-bold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
            item.claimed
              ? "cursor-not-allowed border border-border bg-bg-surface text-text-tertiary"
              : "bg-violet-600 text-text-on-brand hover:bg-violet-500",
          ].join(" ")}
        >
          {item.claimed ? "Claimed NFT" : "Claim NFT"}
        </button>
      </div>
    </article>
  );
}

function NftRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-[10px]">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="inline-flex items-center gap-[6px] font-medium text-text-primary">
        {value}
        {copyable && (
          <button
            type="button"
            aria-label={`Copy ${label}`}
            onClick={() => {
              navigator.clipboard?.writeText(value).catch(() => {});
            }}
            className="text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Copy01Icon} size={14} />
          </button>
        )}
      </dd>
    </div>
  );
}

// ───────────────────────── shared bits ─────────────────────────

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
}) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-[40px] appearance-none rounded-full border border-border bg-bg-surface pl-[14px] pr-[38px] text-sm font-medium text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus:border-border-focus"
      >
        <option value={options[0].id} disabled hidden>
          {label}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-text-tertiary"
      >
        <Icon icon={ArrowDown01Icon} size={16} />
      </span>
    </div>
  );
}

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  // Compact list: 1 2 3 … last (matches the Figma "‹ 1 2 3 … 10 ›").
  const items: Array<number | "ellipsis"> = [1, 2, 3, "ellipsis", total];

  const btn =
    "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-lg border px-[8px] text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";

  return (
    <nav
      aria-label="Pagination"
      className="mt-[28px] flex items-center justify-end gap-[6px]"
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>

      {items.map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden
            className="inline-flex h-[36px] min-w-[24px] items-center justify-center text-sm text-text-tertiary"
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={page === it ? "page" : undefined}
            onClick={() => onChange(it)}
            className={[
              btn,
              page === it
                ? "border-border-strong bg-bg-surface text-text-primary"
                : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
            ].join(" ")}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= total}
        onClick={() => onChange(Math.min(total, page + 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary shadow-1 hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}

// ───────────────────────── empty ─────────────────────────

function EmptyState() {
  return (
    <div className="mt-[16px] flex flex-col items-center gap-[10px] rounded-[12px] border border-border bg-bg-surface px-[24px] py-[48px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-bg-brand-subtle text-text-brand"
      >
        <Icon icon={Search01Icon} size={20} />
      </span>
      <p className="text-md font-semibold text-text-primary">No projects found</p>
      <p className="max-w-[420px] text-sm text-text-secondary">
        Nothing matches this view yet. Try a different tab or clear your search.
      </p>
    </div>
  );
}
