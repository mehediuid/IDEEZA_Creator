"use client";

// ProjectDetails — the "Project Details" surface (User Panel V2, Figma
// node 16838:306201), reworked for UX over a literal trace:
//   • No nested cards — left content sits on the page surface with
//     dividers; product thumbnails are borderless image-first tiles
//     (the Newsfeed pattern). The right rail is the one panel surface.
//   • Honest affordances — the project stage is a real <select>; the
//     wallet is a copy chip; nothing wears a chevron it can't open.
//   • One primary action (Add To Marketplace); Share is secondary.
//   • Sticky right rail, real heading order, working description toggle,
//     and an arrow-key underline tab bar.
// All tokens are the existing IDEEZA DS; shared chrome is untouched.

import * as React from "react";
import Link from "next/link";
import {
  Share08Icon,
  MoreVerticalIcon,
  HelpCircleIcon,
  Copy01Icon,
  Tick02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  PlusSignIcon,
  ViewIcon,
  FavouriteIcon,
  Comment01Icon,
  Bookmark02Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";

// ───────────────────────── content (from Figma) ─────────────────────────

const STAGES = ["Idea", "Prototyping", "Testing", "Purchased", "Launched"] as const;
type Stage = (typeof STAGES)[number];

const PROJECT = {
  scopeLabel: "My Private Project",
  mintStatus: "Lazy Minted",
  title: "Project Title",
  stage: "Idea" as Stage,
  wallet: "0×68f4rt....4e",
  owner: "User-2",
  description:
    "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy.",
  stats: { likes: 35, comments: 3, views: 10, saves: 20 },
};

const CONTENT_TABS = [
  "Product",
  "Customers",
  "Contributors",
  "Media",
  "Premium Parts",
] as const;
type ContentTab = (typeof CONTENT_TABS)[number];

const NFT_TABS = ["Main NFT", "Physical NFT", "Virtual NFT"] as const;
type NftTab = (typeof NFT_TABS)[number];

const IMG = "/innovations";

type Product = {
  id: string;
  name: string;
  image: string;
  stage: string;
  views: number;
  likes: number;
  comments: number;
};

const PRODUCTS: Product[] = [
  { id: "pr1", name: "Robotic Arm Module", image: `${IMG}/robotic-arm-with-haptics.png`, stage: "Idea", views: 3988, likes: 35, comments: 35 },
  { id: "pr2", name: "Micro Rover Base", image: `${IMG}/line-following-micro-rover.png`, stage: "Idea", views: 3988, likes: 35, comments: 35 },
  { id: "pr3", name: "Balancer Controller", image: `${IMG}/self-balancing-two-wheeler.png`, stage: "Idea", views: 3988, likes: 35, comments: 35 },
];

const BASIC_INFO: Array<{ label: string; value: string; link?: boolean }> = [
  { label: "Created By", value: "User-1", link: true },
  { label: "Created At", value: "8-Feb-2024 at 12:11 AM" },
  { label: "Network Type", value: "Polygon Testnet (Mumbai)" },
  { label: "Collection", value: "Car Project Collection" },
  { label: "NFT ID", value: "#111" },
  { label: "File Size", value: "2.10 MB" },
];

const LEGAL_INFO: Array<{ label: string; value: string; link?: boolean }> = [
  { label: "Patent", value: "1.100.21.100" },
  { label: "Copyright", value: "USPTO", link: true },
  { label: "Trademark", value: "Attorney Name : David", link: true },
];

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

// ───────────────────────── page ─────────────────────────

export function ProjectDetails({ id }: { id: string }) {
  const [tab, setTab] = React.useState<ContentTab>("Product");
  const [nftTab, setNftTab] = React.useState<NftTab>("Main NFT");
  const [stage, setStage] = React.useState<Stage>(PROJECT.stage);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-[32px] py-[28px]" data-project-id={id}>
      {/* Breadcrumb + actions */}
      <div className="mb-[24px] flex flex-wrap items-center justify-between gap-[12px]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-[6px] text-sm">
          <Link
            href="/projects"
            className="rounded-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Private Projects
          </Link>
          <span aria-hidden className="text-text-tertiary">
            <Icon icon={ArrowRight01Icon} size={15} />
          </span>
          <span aria-current="page" className="font-semibold text-text-primary">
            Details
          </span>
        </nav>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            className="inline-flex h-[40px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Share08Icon} size={18} />
            Share to Newsfeed
          </button>
          <button
            type="button"
            aria-label="More project actions"
            className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg border border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={MoreVerticalIcon} size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-[28px] min-[1100px]:flex-row min-[1100px]:items-start">
        {/* ───────── left column (no card; sits on page surface) ───────── */}
        <section className="min-w-0 flex-1">
          {/* scope + mint status */}
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <span className="inline-flex h-[26px] items-center rounded-full bg-bg-brand-subtle px-[12px] text-2xs font-bold uppercase tracking-wide text-text-brand">
              {PROJECT.scopeLabel}
            </span>
            <span className="text-xs text-text-secondary">
              Mint status:{" "}
              <span className="font-semibold text-text-primary">{PROJECT.mintStatus}</span>
            </span>
          </div>

          {/* title + stage + help */}
          <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {PROJECT.title}
            </h1>
            <StageSelect value={stage} onChange={setStage} />
            <button
              type="button"
              aria-label="What does the project stage mean?"
              className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={HelpCircleIcon} size={18} />
            </button>
          </div>

          {/* owner + wallet */}
          <div className="mt-[12px] flex flex-wrap items-center gap-x-[20px] gap-y-[10px]">
            <p className="text-sm text-text-secondary">
              Owned by{" "}
              <Link
                href="#"
                className="rounded-sm font-semibold text-text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {PROJECT.owner}
              </Link>
            </p>
            <WalletChip address={PROJECT.wallet} />
          </div>

          {/* description */}
          <Description text={PROJECT.description} />

          {/* stats */}
          <ul className="mt-[18px] flex flex-wrap items-center gap-x-[22px] gap-y-[8px]">
            <Stat icon={FavouriteIcon} value={PROJECT.stats.likes} label="appreciations" />
            <Stat icon={Comment01Icon} value={PROJECT.stats.comments} label="comments" />
            <Stat icon={ViewIcon} value={PROJECT.stats.views} label="views" />
            <Stat icon={Bookmark02Icon} value={PROJECT.stats.saves} label="saves" />
          </ul>

          {/* content tabs */}
          <TabBar tabs={CONTENT_TABS} value={tab} onChange={setTab} className="mt-[24px]" />

          {/* tab panel */}
          <div role="tabpanel" aria-label={tab} className="mt-[24px]">
            {tab === "Product" ? (
              <>
                <div className="grid grid-cols-1 gap-x-[20px] gap-y-[24px] min-[520px]:grid-cols-2 min-[1400px]:grid-cols-3">
                  <AddProductTile />
                  {PRODUCTS.map((p) => (
                    <ProductTile key={p.id} product={p} />
                  ))}
                </div>
                <MiniPagination />
              </>
            ) : (
              <EmptyTab tab={tab} />
            )}
          </div>
        </section>

        {/* ───────── right rail: marketplace panel (sticky) ───────── */}
        <aside
          aria-label="Marketplace & details"
          className="w-full shrink-0 rounded-[16px] border border-border bg-bg-surface p-[20px] min-[1100px]:sticky min-[1100px]:top-[28px] min-[1100px]:max-h-[calc(100dvh-56px)] min-[1100px]:w-[400px] min-[1100px]:overflow-y-auto"
        >
          <h2 className="text-lg font-bold text-text-primary">Marketplace</h2>

          {/* NFT type — segmented control */}
          <div
            role="tablist"
            aria-label="NFT type"
            className="mt-[14px] flex gap-[2px] rounded-lg bg-bg-surface-raised p-[3px]"
          >
            {NFT_TABS.map((t) => {
              const active = nftTab === t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setNftTab(t)}
                  className={[
                    "inline-flex h-[34px] flex-1 items-center justify-center rounded-md px-[8px] text-xs font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                    active
                      ? "bg-bg-surface text-text-primary shadow-1"
                      : "text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* activity (read-only) */}
          <div className="mt-[18px] flex items-center justify-between gap-[12px]">
            <span className="text-sm font-medium text-text-secondary">Activity</span>
            <span className="inline-flex h-[26px] items-center rounded-full bg-bg-brand-subtle px-[12px] text-2xs font-bold text-text-brand">
              {stage}
            </span>
          </div>

          {/* collection / blockchain */}
          <dl className="mt-[18px] grid grid-cols-2 gap-[16px]">
            <div>
              <dt className="text-xs font-medium text-text-secondary">Collection</dt>
              <dd className="mt-[4px] text-sm font-semibold text-text-primary">
                Presell Campaign test
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-xs font-medium text-text-secondary">Blockchain</dt>
              <dd className="mt-[4px] text-sm font-semibold text-text-primary">
                Mumbai testnet
              </dd>
            </div>
          </dl>

          {/* primary action */}
          <button
            type="button"
            className="mt-[20px] inline-flex h-[44px] w-full items-center justify-center rounded-lg bg-violet-600 px-[20px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Add To Marketplace
          </button>

          <Divider />
          <Collapsible title="Basic Information" defaultOpen>
            <InfoRows rows={BASIC_INFO} />
          </Collapsible>

          <Divider />
          <Collapsible title="Legal Information" defaultOpen>
            <InfoRows rows={LEGAL_INFO} />
          </Collapsible>

          <Divider />
          <Collapsible title="Activities">
            <p className="text-sm text-text-secondary">No recent activity yet.</p>
          </Collapsible>
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────── pieces ─────────────────────────

function StageSelect({
  value,
  onChange,
}: {
  value: Stage;
  onChange: (s: Stage) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="project-stage" className="sr-only">
        Project stage
      </label>
      <select
        id="project-stage"
        value={value}
        onChange={(e) => onChange(e.target.value as Stage)}
        className="h-[32px] appearance-none rounded-full bg-bg-brand-subtle pl-[14px] pr-[34px] text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:brightness-95 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-text-brand"
      >
        <Icon icon={ArrowDown01Icon} size={15} />
      </span>
    </div>
  );
}

function WalletChip({ address }: { address: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(address)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Wallet address copied" : `Copy wallet address ${address}`}
      className="group inline-flex h-[32px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[10px] text-sm outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="text-xs font-medium text-text-secondary">Wallet</span>
      <span className="font-mono text-sm font-medium text-text-primary">{address}</span>
      <span className={copied ? "text-text-success" : "text-text-tertiary group-hover:text-text-secondary"}>
        <Icon icon={copied ? Tick02Icon : Copy01Icon} size={15} />
      </span>
    </button>
  );
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-[14px] max-w-[68ch]">
      <p
        className={[
          "text-sm leading-relaxed text-text-secondary",
          open ? "" : "line-clamp-3",
        ].join(" ")}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-[6px] rounded-sm text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {open ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: IconValue;
  value: number;
  label: string;
}) {
  return (
    <li className="inline-flex items-center gap-[6px] text-sm font-medium tabular-nums text-text-secondary">
      <span aria-hidden className="text-text-tertiary">
        <Icon icon={icon} size={16} strokeWidth={1.6} />
      </span>
      {formatCount(value)}
      <span className="sr-only">{label}</span>
    </li>
  );
}

function TabBar({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly ContentTab[];
  value: ContentTab;
  onChange: (t: ContentTab) => void;
  className?: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.indexOf(value);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next =
        e.key === "ArrowRight"
          ? tabs[(i + 1) % tabs.length]
          : tabs[(i - 1 + tabs.length) % tabs.length];
      onChange(next);
    }
  };
  return (
    <div
      role="tablist"
      aria-label="Project content"
      onKeyDown={onKeyDown}
      className={`flex gap-[4px] overflow-x-auto border-b border-border ${className ?? ""}`}
    >
      {tabs.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t)}
            className={[
              "relative -mb-px shrink-0 whitespace-nowrap rounded-t-md px-[14px] pb-[12px] pt-[8px] text-sm font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              active
                ? "text-text-primary after:absolute after:inset-x-[10px] after:bottom-[-1px] after:h-[2px] after:rounded-full after:bg-violet-600"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function ProductTile({ product }: { product: Product }) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <article className="group/thumb flex flex-col gap-[10px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-bg-surface-raised">
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-normal ease-out group-hover/thumb:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 flex items-center justify-center text-text-tertiary">
            <Icon icon={ViewIcon} size={26} strokeWidth={1.4} />
          </div>
        )}
        <span className="absolute left-[10px] top-[10px] inline-flex h-[22px] items-center rounded-full bg-bg-surface/95 px-[10px] text-2xs font-bold text-text-brand shadow-1 backdrop-blur">
          {product.stage}
        </span>
        <div className="absolute inset-x-0 bottom-[10px] flex items-center justify-center gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className={i === 0 ? "h-[6px] w-[14px] rounded-full bg-white" : "h-[6px] w-[6px] rounded-full bg-white/55"}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-[10px]">
        <p className="min-w-0 truncate text-md font-semibold text-text-primary">
          {product.name}
        </p>
        <Link
          href="#"
          className="shrink-0 rounded-md px-[8px] py-[4px] text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          View
        </Link>
      </div>

      <ul className="flex items-center gap-[16px] text-sm font-medium tabular-nums text-text-secondary">
        <Stat icon={ViewIcon} value={product.views} label="views" />
        <Stat icon={FavouriteIcon} value={product.likes} label="appreciations" />
        <Stat icon={Comment01Icon} value={product.comments} label="comments" />
      </ul>
    </article>
  );
}

function AddProductTile() {
  return (
    <button
      type="button"
      className="flex aspect-[4/3] flex-col items-center justify-center gap-[10px] rounded-[12px] border border-dashed border-border-strong bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-brand hover:bg-bg-brand-subtle hover:text-text-brand focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-bg-surface-raised text-text-brand">
        <Icon icon={PlusSignIcon} size={22} />
      </span>
      <span className="text-sm font-semibold">Add New Product</span>
    </button>
  );
}

function EmptyTab({ tab }: { tab: ContentTab }) {
  return (
    <div className="flex flex-col items-center gap-[8px] rounded-[12px] border border-dashed border-border px-[24px] py-[56px] text-center">
      <p className="text-md font-semibold text-text-primary">No {tab.toLowerCase()} yet</p>
      <p className="max-w-[360px] text-sm text-text-secondary">
        {tab} added to this project will show up here.
      </p>
    </div>
  );
}

function Divider() {
  return <div className="my-[16px] h-px w-full bg-border" />;
}

function Collapsible({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-[12px] rounded-md py-[2px] text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="text-md font-bold text-text-primary">{title}</span>
          <span
            aria-hidden
            className={[
              "text-text-secondary transition-transform duration-fast",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            <Icon icon={ArrowDown01Icon} size={20} />
          </span>
        </button>
      </h3>
      {open && <div className="mt-[14px]">{children}</div>}
    </div>
  );
}

function InfoRows({
  rows,
}: {
  rows: Array<{ label: string; value: string; link?: boolean }>;
}) {
  return (
    <dl className="flex flex-col gap-[12px] text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-[16px]">
          <dt className="shrink-0 font-medium text-text-secondary">{r.label}</dt>
          <dd className="text-right">
            {r.link ? (
              <Link
                href="#"
                className="rounded-sm font-semibold text-text-brand underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {r.value}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">{r.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MiniPagination() {
  const [page, setPage] = React.useState(1);
  const items: Array<number | "ellipsis"> = [1, 2, 3, "ellipsis", 10];
  const btn =
    "inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border px-[8px] text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus";
  return (
    <nav aria-label="Product pagination" className="mt-[28px] flex items-center justify-center gap-[6px]">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>
      {items.map((it, i) =>
        it === "ellipsis" ? (
          <span key={`e-${i}`} aria-hidden className="inline-flex h-[34px] min-w-[20px] items-center justify-center text-sm text-text-tertiary">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={page === it ? "page" : undefined}
            onClick={() => setPage(it)}
            className={[
              btn,
              page === it
                ? "border-transparent bg-violet-600 text-text-on-brand"
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
        disabled={page >= 10}
        onClick={() => setPage((p) => Math.min(10, p + 1))}
        className={`${btn} border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}
