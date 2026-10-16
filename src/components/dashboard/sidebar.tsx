"use client";

// Dashboard Sidebar — IDEEZA nav from the original product spec. Uses
// Hugeicons (the IDEEZA DS icon set, same as the editor) via the shared
// `Icon` wrapper. Sizes: 16px on list rows / 20px on primary actions +
// the brand mark. 14px font (text-md token).
//
// Collapsible: the top toggle shrinks the sidebar to a 64px icon rail (O04,
// --layout-sidebar-collapsed)
// (labels hidden, tooltips + aria-labels keep every item reachable) and
// expands it back. The choice persists in localStorage (sidebar-state.ts).
//
// Messages carries the unread badge (Messages spec §6; D7: only here, never
// the bell): a count pill beside the label, a dot on the collapsed rail.
//
// Sizing note: the project's Tailwind preset overrides `spacing` with
// the IDEEZA DS spacing tokens (so `h-5` resolves to 10px, not 20px).
// Component dimensions therefore use explicit arbitrary px values.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen01Icon,
  Bug01Icon,
  Cancel01Icon,
  Compass01Icon,
  CpuIcon,
  FlashIcon,
  Folder01Icon,
  HistoryIcon,
  Home01Icon,
  HelpCircleIcon,
  Mail01Icon,
  Menu01Icon,
  MortarboardIcon,
  News01Icon,
  Notification03Icon,
  Search01Icon,
  ShoppingBag01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { useCreateHistory, type BuildAttention } from "@/lib/create/history";
import { PLAN_PRICING_HREF } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { Icon, type IconValue } from "./icon";
import { SIDEBAR_COLLAPSED_KEY } from "./sidebar-state";
import {
  AccountPopover,
  FloatingPanel,
  WalletPopover,
  moveFocus,
  useMe,
  usePlanLabel,
} from "./sidebar-account";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Avatar } from "@/components/ideeza";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { useStoredActingAs } from "@/lib/messages/identity";
import { MESSAGES_HREF } from "@/lib/messages/links";
import { countsFor } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { useDemoMessagesSeed } from "@/lib/messages/use-demo-seed";
import { useMessagePeople } from "@/lib/messages/use-people";
import { Badge, linkVariants } from "@/components/ideeza";
import { openReportProblem } from "@/lib/support/open-report";
import { useBlog, useReviewClock, updateBlog } from "@/lib/blog/store";
import { findArticle, markSeen } from "@/lib/blog/article";
import { DEMO_REVIEW_LABEL } from "@/lib/blog/demo-review";
import { blogNews, newsAnnouncement, newsKicker, newsMessage, type BlogNews } from "@/lib/blog/news";
import { markNoticesSeen, useSeenNotices } from "@/lib/blog/notice-seen";
import { articleHref, slugOf } from "@/lib/blog/slug";

// `href: null` is a section with no page behind it yet. It stays in the list,
// so the shape of the product is visible, but it says it is not open rather
// than linking to a 404. `unread` is the Messages badge, set where NAV is drawn.
type NavItem = { label: string; href: string | null; icon: IconValue; unread?: number };

const NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home01Icon },
  { label: "History", href: "/history", icon: HistoryIcon },
  { label: "My projects", href: "/projects", icon: Folder01Icon },
  { label: "Parts & agile module", href: "/parts", icon: CpuIcon },
  { label: "Explore marketplace", href: "/marketplace", icon: ShoppingBag01Icon },
  { label: "Innovations", href: "/innovations", icon: News01Icon },
  { label: "Blog", href: "/blog", icon: BookOpen01Icon },
  { label: "Messages", href: MESSAGES_HREF, icon: Mail01Icon },
];

/** The builds that need the maker — minus the one whose chat is open, which
 *  is already in front of them. The bell used to say "1 needs attention"
 *  about the very build on screen. */
function useAttentionElsewhere(): BuildAttention[] {
  const pathname = usePathname();
  const { attentionBuilds } = useCreateHistory();
  return React.useMemo(() => {
    const open = pathname.startsWith("/chat/") ? pathname.split("/")[2] : null;
    return open
      ? attentionBuilds.filter((a) => a.job.chatId !== open)
      : attentionBuilds;
  }, [attentionBuilds, pathname]);
}

/** Unread Inbox conversations of the tab's acting person; 0 until both stores are read. The
 *  demo conversations are planted here, so the badge counts them from the first visit. */
function useMessagesUnread(): number {
  useDemoMessagesSeed();
  const { data, hydrated } = useMessages();
  const people = useMessagePeople();
  const asId = useStoredActingAs();
  if (!hydrated || !people.hydrated) return 0;
  return countsFor(data, asId, people.teamIdsOf).unread;
}

// The collapsed choice is read from <html data-sidebar>, which the root
// layout's script sets from localStorage before the first paint
// (sidebar-state.ts). So a mount reads the right width at once; it used to be
// read in an effect, and every mount painted one frame at 280 and then jumped
// to 64. The server renders expanded: hydration starts there and catches up
// straight after, while globals.css keeps that first draw at the rail's width.
const collapsedListeners = new Set<() => void>();
function subscribeCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange);
  return () => {
    collapsedListeners.delete(onChange);
  };
}
const readCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";
const serverCollapsed = () => false;

function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = React.useSyncExternalStore(subscribeCollapsed, readCollapsed, serverCollapsed);

  const toggle = React.useCallback(() => {
    const next = !readCollapsed();
    if (next) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
    collapsedListeners.forEach((onChange) => onChange());
  }, []);

  return [collapsed, toggle];
}

export function DashboardSidebar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  // The page the drawer was opened on. A drawer is for getting somewhere, so
  // arriving closes it: once the path changes it no longer matches.
  const pathname = usePathname();
  const [openOn, setOpenOn] = React.useState<string | null>(null);
  const drawerOpen = openOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenOn(open ? pathname : null);
  // The Blog's demo review decides about a minute after sending, on every page.
  useReviewClock();

  return (
    <>
      {/* Below `md` the 280 px sidebar is a drawer behind a bar. At phone
          width it stayed open beside every page and left the page 120 px —
          the home headline broke a word a line, and the chat's canvas was off
          the screen entirely. */}
      <MobileBar
        onOpenMenu={() => setDrawerOpen(true)}
        onOpenSearch={onOpenSearch}
      />
      {/* Blog results are said once when they arrive, on any page and any width. */}
      <BlogNewsAnnouncer />
      <aside
        aria-label="Primary navigation"
        data-collapsed={collapsed}
        // Collapses at once rather than animating its width: a width
        // animation re-lays the whole page out on every frame, and a panel
        // toggle is a state change that needs no choreography.
        className={[
          "hidden h-full shrink-0 flex-col border-r border-border bg-bg-page md:flex",
          collapsed ? "w-[var(--layout-sidebar-collapsed)]" : "w-[var(--layout-sidebar)]",
        ].join(" ")}
      >
        <SidebarBody
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onOpenSearch={onOpenSearch}
        />
      </aside>
      {drawerOpen && (
        <SidebarDrawer
          onClose={() => setDrawerOpen(false)}
          onOpenSearch={() => {
            setDrawerOpen(false);
            onOpenSearch();
          }}
        />
      )}
    </>
  );
}

function SidebarBody({
  collapsed,
  onToggle,
  onOpenSearch,
  onClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenSearch: () => void;
  /** Present in the drawer: the brand row closes it instead of collapsing. */
  onClose?: () => void;
}) {
  const unread = useMessagesUnread();
  return (
    <>
      <Brand collapsed={collapsed} onToggle={onToggle} onClose={onClose} />

      <div className={collapsed ? "px-[12px] pt-[12px]" : "px-[16px] pt-[16px]"}>
        {collapsed && (
          <div className="mb-[8px]">
            <ExpandButton onClick={onToggle} />
          </div>
        )}
        <SearchRow onOpen={onOpenSearch} collapsed={collapsed} />
      </div>

      <nav
        aria-label="Sections"
        className="mt-[16px] flex-1 overflow-y-auto overflow-x-hidden px-[12px]"
      >
        <ul role="list" className="flex flex-col gap-[2px]">
          {NAV.map((item) => (
            <NavRow
              key={item.label}
              item={item.href === MESSAGES_HREF ? { ...item, unread } : item}
              collapsed={collapsed}
            />
          ))}
        </ul>
      </nav>

      <Footer collapsed={collapsed} onLeave={onClose} />
    </>
  );
}

/** The phone's own chrome: the menu, the mark, and search — the three things
 *  the sidebar is for, at 56 px instead of 280. */
function MobileBar({
  onOpenMenu,
  onOpenSearch,
}: {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}) {
  return (
    <div className="flex h-[56px] shrink-0 items-center gap-[8px] border-b border-border bg-bg-page px-[12px] md:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open the menu"
        aria-haspopup="dialog"
        className="inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Menu01Icon} />
      </button>
      <Link
        href="/"
        aria-label="IDEEZA — go to dashboard"
        className="flex min-w-0 flex-1 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <IdeezaLogo height={24} decorative className="shrink-0" />
      </Link>
      <PhoneBell />
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search commands, pages, and settings"
        className="inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Search01Icon} />
      </button>
    </div>
  );
}

/** The sidebar as a drawer over the page, for phone widths: the same body,
 *  a backdrop that closes it, Escape, and focus held inside while it is open
 *  and handed back to the menu button when it closes. */
function SidebarDrawer({
  onClose,
  onOpenSearch,
}: {
  onClose: () => void;
  onOpenSearch: () => void;
}) {
  const panelRef = React.useRef<HTMLElement>(null);
  useDialogFocus(true, panelRef);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-overlay md:hidden">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)]"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className="relative flex h-full w-[var(--layout-sidebar)] max-w-[85vw] flex-col border-r border-border bg-bg-page shadow-3"
      >
        <SidebarBody
          collapsed={false}
          onToggle={onClose}
          onOpenSearch={onOpenSearch}
          onClose={onClose}
        />
      </aside>
    </div>
  );
}

// ────────────────────────────────── parts ───────────────────────────────

function Brand({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}) {
  // Collapsed: the icon mark sits where the full logo was (still links Home).
  // A separate, clearly-visible ExpandButton below it does the expanding, so
  // the control is discoverable instead of hidden behind the logo.
  if (collapsed) {
    return (
      <div className="flex h-[64px] items-center justify-center border-b border-border px-[12px]">
        <Link
          href="/"
          aria-label="IDEEZA — go to dashboard"
          className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <IdeezaLogo mark height={26} decorative />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[64px] items-center gap-[12px] border-b border-border px-[20px]">
      <Link
        href="/"
        aria-label="IDEEZA — go to dashboard"
        className="flex min-w-0 flex-1 items-center gap-[12px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <IdeezaLogo height={28} decorative className="shrink-0" />
      </Link>
      <button
        type="button"
        onClick={onClose ?? onToggle}
        aria-label={onClose ? "Close the menu" : "Collapse sidebar"}
        aria-expanded={onClose ? undefined : true}
        title={onClose ? "Close the menu" : "Collapse sidebar"}
        className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={onClose ? Cancel01Icon : SidebarLeft01Icon} />
      </button>
    </div>
  );
}

// Visible expand control shown only on the collapsed rail. Bordered + filled
// like the search button so it clearly reads as a tappable control (not just
// a faint icon), with the standard "open panel" glyph + tooltip.
function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Expand sidebar"
      aria-expanded={false}
      title="Expand sidebar"
      className="flex h-[40px] w-full items-center justify-center rounded-lg border border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={SidebarRight01Icon} />
    </button>
  );
}

function SearchRow({
  onOpen,
  collapsed,
}: {
  onOpen: () => void;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Search commands, pages, and settings"
        title="Search  ⌘K"
        className="flex h-[40px] w-full items-center justify-center rounded-lg border border-border bg-bg-surface text-text-tertiary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={Search01Icon} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search commands, pages, and settings"
      className="flex h-[40px] w-full items-center gap-[10px] rounded-lg border border-border bg-bg-surface px-[12px] text-md font-regular text-text-tertiary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={Search01Icon} />
      <span className="flex-1 text-left">Search</span>
      <kbd
        aria-hidden
        className="font-mono text-2xs font-medium text-text-tertiary"
      >
        ⌘K
      </kbd>
    </button>
  );
}

function NavRow({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const attentionBuilds = useAttentionElsewhere();
  if (!item.href) {
    const why = `${item.label} isn't open yet`;
    return (
      <li>
        <span
          role="link"
          aria-disabled="true"
          aria-label={why}
          title={why}
          className={[
            "flex h-[32px] cursor-not-allowed items-center rounded-md text-md font-regular text-text-disabled",
            collapsed ? "justify-center px-0" : "gap-[12px] px-[10px]",
          ].join(" ")}
        >
          <span aria-hidden className="shrink-0">
            <Icon icon={item.icon} />
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              <span className="shrink-0 text-xs text-text-tertiary">Soon</span>
            </>
          )}
        </span>
      </li>
    );
  }
  const href = item.href;
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  // History row gets a red dot whenever any build needs attention. Per
  // spec §7b, the dot stays on until the user resolves the issue (not
  // just because they dismissed the banner) — that's why we read the
  // raw attentionBuilds count, not topAttention.
  const showAttention = href === "/history" && attentionBuilds.length > 0;
  const attentionLabel = showAttention
    ? `, ${attentionBuilds.length} build${attentionBuilds.length === 1 ? "" : "s"} need${attentionBuilds.length === 1 ? "s" : ""} attention`
    : "";
  const unread = item.unread ?? 0;
  const unreadLabel = unread > 0 ? `, ${unread} unread` : "";
  const fullLabel = `${item.label}${attentionLabel}${unreadLabel}`;
  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed || showAttention || unread > 0 ? fullLabel : undefined}
        title={collapsed ? item.label : undefined}
        className={[
          "relative flex h-[32px] items-center rounded-md text-md text-text-primary outline-none transition-colors duration-fast",
          "focus-visible:ring-2 focus-visible:ring-border-focus",
          collapsed ? "justify-center px-0" : "gap-[12px] px-[10px]",
          isActive
            ? "bg-bg-surface-raised font-medium"
            : "font-regular hover:bg-bg-surface-raised",
        ].join(" ")}
      >
        <span aria-hidden className="shrink-0">
          <Icon icon={item.icon} />
        </span>
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {showAttention && (
          <span
            aria-hidden
            className={[
              "inline-flex h-[8px] w-[8px] shrink-0 rounded-full bg-bg-error",
              collapsed ? "absolute right-[14px] top-[4px]" : "",
            ].join(" ")}
          />
        )}
        {unread > 0 &&
          (collapsed ? (
            <span
              aria-hidden
              className="absolute right-[14px] top-[4px] inline-flex h-[8px] w-[8px] rounded-full bg-bg-brand"
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-bg-brand px-[6px] text-md font-semibold leading-md tabular-nums text-text-on-brand"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ))}
      </Link>
    </li>
  );
}

function Footer({ collapsed, onLeave }: { collapsed: boolean; onLeave?: () => void }) {
  return (
    <div className="border-t border-border p-[12px]">
      <UpgradeButton collapsed={collapsed} onLeave={onLeave} />
      <SupportBlock collapsed={collapsed} onLeave={onLeave} />
      <ProfileRow collapsed={collapsed} onLeave={onLeave} />
    </div>
  );
}

// The way up from your plan (Creator Panel V3.0's "Upgrade to Builder · Unlock
// more features"): a link to the plans, naming the next plan worth it — Builder
// from Free or Tinkerer, Disruptor from Builder. Gone on the top plan.
function UpgradeButton({ collapsed, onLeave }: { collapsed: boolean; onLeave?: () => void }) {
  const { hydrated, sub } = useCreatePlan();
  if (!hydrated || sub.tier === "disruptor") return null;
  const next = planOf(sub.tier === "builder" ? "disruptor" : "builder");
  const label = `Upgrade to ${next.name}`;
  if (collapsed) {
    return (
      <Link
        href={PLAN_PRICING_HREF}
        aria-label={label}
        title={label}
        className="mb-[12px] flex h-[40px] w-full items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={FlashIcon} />
      </Link>
    );
  }
  return (
    <Link
      href={PLAN_PRICING_HREF}
      onClick={onLeave}
      className="mb-[16px] flex w-full items-center gap-[12px] rounded-lg bg-bg-brand-subtle px-[12px] py-[12px] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-md font-semibold leading-md text-text-brand">{label}</span>
        <span className="block truncate text-sm font-regular leading-sm text-text-secondary">
          {next.credits.toLocaleString("en-US")} AI credits a month, and more
        </span>
      </span>
      <span
        aria-hidden
        className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-bg-surface text-text-brand"
      >
        <Icon icon={FlashIcon} />
      </span>
    </Link>
  );
}

// Support — the four help destinations, written as sentence links rather
// than four nav-sized rows: they are read once, not navigated daily.
const SUPPORT_LINKS: Array<{ label: string; icon: IconValue }> = [
  { label: "Help Center", icon: HelpCircleIcon },
  { label: "Tutorial", icon: MortarboardIcon },
  { label: "Tour Guide", icon: Compass01Icon },
];

// Report a problem is the one live row: it opens the app's one Report a
// problem dialog in place. In the phone drawer the drawer closes first, so
// the dialog's focus trap isn't stacked on the drawer's and focus comes back
// to the drawer's menu button.
function SupportBlock({ collapsed, onLeave }: { collapsed: boolean; onLeave?: () => void }) {
  const report = () => {
    onLeave?.();
    openReportProblem();
  };
  if (collapsed) {
    return (
      <ul role="list" className="mb-[12px] flex flex-col gap-[2px]">
        {SUPPORT_LINKS.map((row) => (
          <li key={row.label}>
            <SupportAction label={row.label} icon={row.icon} collapsed />
          </li>
        ))}
        <li>
          <SupportAction label="Report a problem" icon={Bug01Icon} collapsed onClick={report} />
        </li>
      </ul>
    );
  }
  return (
    <div className="mb-[16px]">
      <p className="mb-[6px] text-md font-semibold text-text-primary">
        Support
      </p>
      <p className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
        {SUPPORT_LINKS.map((row, i) => (
          <React.Fragment key={row.label}>
            {i > 0 && (
              <span aria-hidden className="text-text-tertiary">
                •
              </span>
            )}
            <SupportAction label={row.label} icon={row.icon} />
          </React.Fragment>
        ))}
      </p>
      <p className="mt-[2px]">
        <SupportAction label="Report a problem" icon={Bug01Icon} onClick={report} />
      </p>
    </div>
  );
}

// Help Center, Tutorial and Tour Guide have no page of their own yet, so
// without an `onClick` the control says so instead of pretending to
// navigate.
function SupportAction({
  label,
  icon,
  collapsed,
  onClick,
}: {
  label: string;
  icon: IconValue;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  if (onClick) {
    return collapsed ? (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="flex h-[32px] w-full items-center justify-center rounded-md text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={icon} />
      </button>
    ) : (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onClick}
        className={linkVariants({ color: "neutral", size: "md", className: "min-h-[24px] font-regular" })}
      >
        {label}
      </button>
    );
  }
  if (collapsed) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        aria-label={`${label} — not available yet`}
        title={`${label} isn't available yet`}
        className="flex h-[32px] w-full cursor-not-allowed items-center justify-center rounded-md text-text-disabled"
      >
        <Icon icon={icon} />
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled
      aria-disabled
      aria-label={`${label} — not available yet`}
      title={`${label} isn't available yet`}
      className="inline-flex min-h-[24px] cursor-not-allowed items-center text-sm font-regular text-[color:var(--color-button-disabled-text)]"
    >
      {label}
    </button>
  );
}

// The footer's account row, drawn from Creator Panel V3.0 (Figma 45356:2823):
// the avatar with your name and plan, then the wallet and the bell. Each opens
// its own popover (sidebar-account.tsx), one at a time — opening one closes
// the other rather than stacking them. On the collapsed rail the three stack,
// wallet and bell above the avatar, and the popovers open beside the rail.
function ProfileRow({
  collapsed,
  onLeave,
}: {
  collapsed: boolean;
  /** Present in the phone drawer: closes it, so a dialog opened from the
   *  menu doesn't sit over a second focus trap. */
  onLeave?: () => void;
}) {
  const [openPanel, setOpenPanel] = React.useState<Panel | null>(null);
  const [byKeyboard, setByKeyboard] = React.useState(false);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const accountButton = React.useRef<HTMLButtonElement>(null);
  const walletButton = React.useRef<HTMLButtonElement>(null);
  const bellButton = React.useRef<HTMLButtonElement>(null);
  const ids = { account: React.useId(), wallet: React.useId(), bell: React.useId() };
  const planLabel = usePlanLabel();
  const me = useMe();

  React.useLayoutEffect(() => {
    railRef.current = rowRef.current?.closest("aside") ?? null;
  });

  const close = (restoreFocus: boolean) => {
    const opener = { account: accountButton, wallet: walletButton, bell: bellButton };
    if (restoreFocus && openPanel) opener[openPanel].current?.focus({ preventScroll: true });
    setOpenPanel(null);
  };
  // A keyboard press arrives as a click with no pointer detail: it opens on
  // the first row, a pointer on the panel.
  const toggle = (which: Panel) => (e: React.MouseEvent) => {
    if (openPanel === which) return close(true);
    setByKeyboard(e.detail === 0);
    setOpenPanel(which);
  };
  const trigger = (which: Panel) => ({
    type: "button" as const,
    onClick: toggle(which),
    "aria-expanded": openPanel === which,
    "aria-controls": openPanel === which ? ids[which] : undefined,
  });

  React.useEffect(() => {
    if (!openPanel) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (rowRef.current?.contains(t) || t.closest?.("[data-footer-popover]")) return;
      setOpenPanel(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [openPanel]);

  const side = collapsed ? "right" : "top";
  const frameRef = collapsed ? railRef : rowRef;
  const popover = {
    frameRef,
    side,
    panelRef,
    focusFirst: byKeyboard,
    onClose: close,
    onLeave,
  } as const;

  const account = (
    <button
      ref={accountButton}
      {...trigger("account")}
      aria-haspopup="dialog"
      aria-label={`${me.name}, ${planLabel} — open account menu`}
      title={collapsed ? `${me.name} — account` : undefined}
      className={[
        "flex items-center rounded-lg outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
        collapsed
          ? "size-[40px] justify-center max-md:size-[var(--touch-min)]"
          : "min-w-0 flex-1 gap-[8px] p-[4px] max-md:min-h-[var(--touch-min)]",
        // Pressed while its popover is open, in the popover's own fill: that
        // is what ties the two together, where the design had an arrow.
        openPanel === "account" ? "bg-bg-surface-raised" : "",
      ].join(" ")}
    >
      <Avatar initials={me.initials} src={me.photo} size="sm" />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col gap-[2px] text-left">
          <span className="truncate text-md font-medium leading-md text-text-primary">
            {me.name}
          </span>
          <span className="truncate text-sm font-regular leading-xs text-text-secondary">
            {planLabel}
          </span>
        </span>
      )}
    </button>
  );
  const wallet = (
    <button
      ref={walletButton}
      {...trigger("wallet")}
      aria-haspopup="menu"
      aria-label="Wallet and tokens"
      title="Wallet and tokens"
      className={[FOOTER_BUTTON, openPanel === "wallet" ? "bg-bg-subtle text-text-primary" : ""].join(" ")}
    >
      <Icon icon={Wallet01Icon} />
    </button>
  );
  // In the phone drawer the bell is left out: it lives in the phone's top bar (F25).
  const bell = onLeave ? null : (
    <NotificationBell
      buttonRef={bellButton}
      trigger={trigger("bell")}
      open={openPanel === "bell"}
      id={ids.bell}
      popover={popover}
      onPick={() => setOpenPanel(null)}
    />
  );

  return (
    <div ref={rowRef} className="relative border-t border-border pt-[12px]">
      {collapsed ? (
        <div className="flex flex-col items-center gap-[12px]">
          {wallet}
          {bell}
          {account}
        </div>
      ) : (
        <div className="flex items-center gap-[10px]">
          {account}
          {wallet}
          {bell}
        </div>
      )}

      {openPanel === "account" && (
        <AccountPopover id={ids.account} anchorRef={accountButton} {...popover} />
      )}
      {openPanel === "wallet" && (
        <WalletPopover id={ids.wallet} anchorRef={walletButton} {...popover} />
      )}
    </div>
  );
}

type Panel = "account" | "wallet" | "bell";

// Figma A01 Button, Secondary, icon-only SM: 32 px, a 1.5 px edge, radius lg.
const FOOTER_BUTTON =
  "relative inline-flex size-[32px] shrink-0 items-center justify-center rounded-lg border-[length:var(--border-width-1-5)] border-solid border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)] [@media(pointer:coarse)]:size-[var(--touch-min)]";

// Exhaustive over BuildAttention.reason — a build blocked on credits reads
// and links differently than one merely waiting on a retry or a review, and
// TS enforces every reason has a kicker so a new reason can't fall through.
const ATTENTION_KICKER: Record<BuildAttention["reason"], string> = {
  review: "Ready to review",
  retry: "Needs attention",
  credits: "Paused — needs credits",
};

// The bell answers with what the app actually knows: the builds waiting
// for the user (the same list the attention banner surfaces), or, when
// there are none, a panel that says so — never a click that does nothing.
// Open state is controlled by ProfileRow so the bell and the other popovers
// can never be open at once.
function NotificationBell({
  buttonRef,
  trigger,
  open,
  id,
  popover,
  onPick,
}: {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  trigger: {
    type: "button";
    onClick: (e: React.MouseEvent) => void;
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
  };
  open: boolean;
  id: string;
  popover: {
    frameRef: React.RefObject<HTMLElement | null>;
    side: "top" | "right";
    panelRef: React.RefObject<HTMLDivElement | null>;
    focusFirst: boolean;
    onClose: (restoreFocus: boolean) => void;
  };
  /** A notification was followed: close, and close the drawer too. */
  onPick: () => void;
}) {
  const attentionBuilds = useAttentionElsewhere();
  const { getChat } = useCreateHistory();
  const news = useBlogNews();
  const count = attentionBuilds.length + news.length;
  const { frameRef, side, panelRef, focusFirst, onClose } = popover;

  const label = bellLabel(attentionBuilds.length, news.length);

  return (
    <>
      <button
        ref={buttonRef}
        {...trigger}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        className={[FOOTER_BUTTON, open ? "bg-bg-subtle text-text-primary" : ""].join(" ")}
      >
        <Icon icon={Notification03Icon} />
        {count > 0 && (
          <span
            aria-hidden
            // Filled with the error ink, not the error fill: white on
            // red-500 is 3.76:1 at 10 px, on red-600 it is 4.83:1.
            className="absolute right-[-6px] top-[-6px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--color-text-error)] px-[4px] text-2xs font-bold leading-none text-text-inverse"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <FloatingPanel
          id={id}
          role="menu"
          aria-label="Notifications"
          anchorRef={buttonRef}
          frameRef={frameRef}
          side={side}
          tone="surface"
          panelRef={panelRef}
          initialFocus={focusFirst ? "first" : "panel"}
          onKeyDown={(e) => {
            if (moveFocus(e, panelRef.current)) return;
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onClose(true);
            } else if (e.key === "Tab") {
              onClose(true);
            }
          }}
        >
          <p className="border-b border-border px-[16px] py-[10px] text-2xs font-bold uppercase tracking-wider text-text-tertiary">
            Notifications
          </p>
          {count === 0 ? (
            <p className="px-[16px] py-[16px] text-sm font-regular text-text-tertiary">
              No notifications yet — builds that need you and your Blog&apos;s review results show up here.
            </p>
          ) : (
            <ul role="none" className="max-h-[min(420px,60vh)] overflow-y-auto py-[4px]">
              {news.map((n) => (
                <BlogNewsItem key={n.key} news={n} onPick={onPick} />
              ))}
              {attentionBuilds.map((att) => (
                <li key={att.job.id} role="none">
                  <Link
                    href={
                      att.reason === "credits"
                        ? "/history#credits"
                        : getChat(att.job.chatId)
                          ? `/chat/${att.job.chatId}`
                          : `/build/${att.job.id}`
                    }
                    role="menuitem"
                    data-nav-item
                    onClick={onPick}
                    className={BELL_ROW}
                  >
                    <span className="block text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                      {ATTENTION_KICKER[att.reason]}
                    </span>
                    <span className="mt-[2px] block truncate text-sm font-regular text-text-primary">
                      {att.message}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </FloatingPanel>
      )}
    </>
  );
}

/** The bell's name: how many builds need the maker, and how many Blog updates wait. */
function bellLabel(builds: number, blog: number): string {
  const parts = [
    builds ? `${builds} need${builds === 1 ? "s" : ""} attention` : "",
    blog ? `${blog} Blog update${blog === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.length ? `Notifications, ${parts.join(", ")}` : "No notifications yet";
}

// A focused row shows a ring inside its own edge (the DS Menu row's), not just a fill that
// measures 1.04:1 against the panel (F10); 44 px tall on touch.
const BELL_ROW =
  "block px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The Blog's news the bell lists: unopened review results, and Featured or Removed. */
function useBlogNews(): BlogNews[] {
  const blog = useBlog();
  const notices = useSeenNotices();
  return React.useMemo(
    () => (blog.hydrated && notices.hydrated ? blogNews(blog.data, notices.seen) : []),
    [blog.hydrated, blog.data, notices.hydrated, notices.seen],
  );
}

/** Opening a news item: it is seen (the record's round, or the notice's key). */
function markNewsSeen(n: BlogNews): void {
  if (n.notice) markNoticesSeen([n.key]);
  else updateBlog((d) => markSeen(d, n.id));
}

/** A Blog item in the bell (D10, D-16), in the Figma's status words: opening it marks it seen
 *  and lands on the blog's details, where a rejection's or removal's reasons sit on top. */
function BlogNewsItem({ news: n, onPick }: { news: BlogNews; onPick: () => void }) {
  const { data } = useBlog();
  const article = findArticle(data, n.id);
  if (!article) return null;
  return (
    <li role="none">
      <Link
        href={articleHref(slugOf(article))}
        role="menuitem"
        data-nav-item
        onClick={() => {
          markNewsSeen(n);
          onPick();
        }}
        className={BELL_ROW}
      >
        <span className="flex flex-wrap items-center gap-[6px] text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          {newsKicker(n)}
          {n.demo && (
            <Badge tone="neutral" className="px-[6px] py-0 text-xs normal-case leading-xs tracking-normal">
              {DEMO_REVIEW_LABEL}
            </Badge>
          )}
        </span>
        <span className="mt-[2px] block text-sm font-regular text-text-primary">{newsMessage(n)}</span>
      </Link>
    </li>
  );
}

/** The rows a keyboard moves through, in order. */
const bellRows = (panel: HTMLElement | null) => Array.from(panel?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

// A focused row shows a ring inside its own edge (the DS Menu row's), not just a fill
// that measures 1.04:1 against the panel (F10).
const PHONE_BELL_ROW =
  "block px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const PHONE_BELL_KICKER = "flex flex-wrap items-center gap-[6px] text-sm font-medium leading-sm text-text-secondary";

// The phone top bar's bell: the same news and builds in a panel that opens below the bar.
function PhoneNotificationBell({
  open,
  onToggle,
  onClose,
  placement = "above",
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Above the sidebar's profile row; below the phone top bar. */
  placement?: "above" | "below";
}) {
  const attentionBuilds = useAttentionElsewhere();
  const { getChat } = useCreateHistory();
  const news = useBlogNews();
  const count = attentionBuilds.length + news.length;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  // Where focus goes when the panel opens: a row (keyboard), or the panel itself (pointer).
  const focusOnOpen = React.useRef<"first" | "last" | "panel">("panel");

  const builds = attentionBuilds.length;
  const parts = [
    builds ? `${builds} need${builds === 1 ? "s" : ""} attention` : "",
    news.length ? `${news.length} Blog update${news.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const label = count > 0 ? `Notifications, ${parts.join(", ")}` : "No notifications yet";

  React.useEffect(() => {
    if (!open) return;
    const rows = bellRows(panelRef.current);
    const want = focusOnOpen.current;
    focusOnOpen.current = "panel";
    if (want === "first" && rows[0]) rows[0].focus();
    else if (want === "last" && rows.length) rows[rows.length - 1].focus();
    else panelRef.current?.focus();
  }, [open]);

  const closeToBell = () => {
    buttonRef.current?.focus();
    onClose();
  };

  const onButtonKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") focusOnOpen.current = "first";
    else if (e.key === "ArrowUp") focusOnOpen.current = "last";
    else return;
    e.preventDefault();
    onToggle();
  };

  const onPanelKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const rows = bellRows(panelRef.current);
    const at = rows.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => rows.length && rows[(i + rows.length) % rows.length].focus();
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at < 0 ? rows.length - 1 : at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
    else if (e.key === "Escape") closeToBell();
    else if (e.key === "Tab") {
      // Focus the bell first, so the browser's own Tab moves on from it.
      buttonRef.current?.focus();
      onClose();
      return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onKeyDown={onButtonKey}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        title={label}
        className={
          placement === "below"
            ? "relative inline-flex h-[var(--touch-min)] w-[var(--touch-min)] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            : "relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]"
        }
      >
        <Icon icon={Notification03Icon} />
        {count > 0 && (
          <span
            aria-hidden
            // Filled with the error ink, not the error fill: white on
            // red-500 is 3.76:1 at 10 px, on red-600 it is 4.83:1.
            className="absolute right-[2px] top-[2px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--color-text-error)] px-[4px] text-2xs font-bold leading-none text-text-inverse"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label="Notifications"
          tabIndex={-1}
          onKeyDown={onPanelKey}
          className={[
            "absolute right-0 z-dropdown overflow-hidden rounded-xl border border-border bg-bg-surface shadow-3 outline-none",
            // Above, it spans the sidebar from the bell's edge; below the phone bar it may be wider.
            placement === "below" ? "top-[calc(100%+8px)] w-[300px] max-w-[calc(100vw-24px)]" : "bottom-[calc(100%+8px)] w-[260px]",
          ].join(" ")}
        >
          <p className="border-b border-border px-[16px] py-[10px] text-sm font-semibold leading-sm text-text-primary">Notifications</p>
          {count === 0 ? (
            <p className="px-[16px] py-[16px] text-sm font-regular text-text-secondary">
              No notifications yet. Builds that need you and your Blog&apos;s review results show up here.
            </p>
          ) : (
            <ul role="none" className="max-h-[min(420px,60vh)] overflow-y-auto py-[4px]">
              {news.map((n) => (
                <BlogNewsItem key={n.key} news={n} onPick={onClose} />
              ))}
              {attentionBuilds.map((att) => (
                <li key={att.job.id} role="none">
                  <Link
                    href={
                      att.reason === "credits"
                        ? "/history#credits"
                        : getChat(att.job.chatId)
                          ? `/chat/${att.job.chatId}`
                          : `/build/${att.job.id}`
                    }
                    role="menuitem"
                    onClick={onClose}
                    className={PHONE_BELL_ROW}
                  >
                    <span className={PHONE_BELL_KICKER}>{ATTENTION_KICKER[att.reason]}</span>
                    <span className="mt-[2px] block truncate text-sm font-regular text-text-primary">
                      {att.message}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** The phone's bell, in the top bar (F25): the same bell and panel at 44 px, opening below. */
function PhoneBell() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);
  return (
    <div ref={ref}>
      <PhoneNotificationBell open={open} onToggle={() => setOpen((v) => !v)} onClose={() => setOpen(false)} placement="below" />
    </div>
  );
}

/** Says once, politely, when a Blog result arrives (F25): a toast anyone can see, read out by
 *  screen readers, with a way to it. Nothing is said for what was already waiting when the app
 *  opened, and a result that arrives in a background tab waits until the tab is in view. */
function BlogNewsAnnouncer() {
  const news = useBlogNews();
  const blog = useBlog();
  const known = React.useRef<Set<string> | null>(null);
  const [say, setSay] = React.useState<BlogNews | null>(null);
  const [queued, setQueued] = React.useState<BlogNews | null>(null);

  React.useEffect(() => {
    if (!blog.hydrated) return;
    const keys = new Set(news.map((n) => n.key));
    if (known.current === null) {
      known.current = keys;
      return;
    }
    const fresh = news.find((n) => !known.current!.has(n.key));
    for (const k of keys) known.current.add(k);
    if (fresh) setQueued(fresh);
  }, [news, blog.hydrated]);

  React.useEffect(() => {
    if (!queued) return;
    const show = () => {
      if (document.visibilityState !== "visible") return;
      setSay(queued);
      setQueued(null);
    };
    show();
    document.addEventListener("visibilitychange", show);
    return () => document.removeEventListener("visibilitychange", show);
  }, [queued]);

  React.useEffect(() => {
    if (!say) return;
    const t = window.setTimeout(() => setSay(null), 8000);
    return () => window.clearTimeout(t);
  }, [say]);

  const article = say ? findArticle(blog.data, say.id) : null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[64px] z-toast flex justify-center px-8 md:top-auto md:bottom-[88px]">
      {say && (
        <div className="pointer-events-auto flex max-w-[480px] items-center gap-8 rounded-xl bg-bg-inverse px-8 py-6 text-sm text-text-inverse shadow-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal">
          <span>{newsAnnouncement(say)}</span>
          {article && (
            <Link
              href={articleHref(slugOf(article))}
              onClick={() => {
                markNewsSeen(say);
                setSay(null);
              }}
              className="inline-flex shrink-0 items-center rounded-md font-semibold text-text-inverse underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
            >
              View
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
