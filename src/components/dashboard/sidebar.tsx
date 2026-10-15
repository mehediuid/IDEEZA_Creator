"use client";

// Dashboard Sidebar — IDEEZA nav from the original product spec. Uses
// Hugeicons (the IDEEZA DS icon set, same as the editor) via the shared
// `Icon` wrapper. Sizes: 16px on list rows / 20px on primary actions +
// the brand mark. 14px font (text-md token).
//
// Collapsible: the top toggle shrinks the sidebar to a 72px icon rail
// (labels hidden, tooltips + aria-labels keep every item reachable) and
// expands it back. The choice persists in localStorage.
//
// Messages carries the unread badge (Messages spec §6; D7: only here, never
// the bell): a count pill beside the label, a dot on the collapsed rail.
//
// Sizing note: the project's Tailwind preset overrides `spacing` with
// the IDEEZA DS spacing tokens (so `h-5` resolves to 10px, not 20px).
// Component dimensions therefore use explicit arbitrary px values.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDown01Icon,
  BookOpen01Icon,
  Bug01Icon,
  Cancel01Icon,
  Compass01Icon,
  ComputerIcon,
  CpuIcon,
  CrownIcon,
  FlashIcon,
  Folder01Icon,
  HistoryIcon,
  Home01Icon,
  HelpCircleIcon,
  Logout01Icon,
  Mail01Icon,
  Menu01Icon,
  Moon01Icon,
  MortarboardIcon,
  News01Icon,
  Notification03Icon,
  Search01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Sun01Icon,
  User02Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/theme-provider";
import { useCreateHistory, type BuildAttention } from "@/lib/create/history";
import { Icon, type IconValue } from "./icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { useDialogFocus } from "@/components/create/use-dialog-focus";
import { WalletMenuEntry } from "@/components/wallet/wallet-menu-entry";
import { useStoredActingAs } from "@/lib/messages/identity";
import { MESSAGES_HREF } from "@/lib/messages/links";
import { countsFor } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { useDemoMessagesSeed } from "@/lib/messages/use-demo-seed";
import { useMessagePeople } from "@/lib/messages/use-people";
import { useBlog, useReviewClock, updateBlog } from "@/lib/blog/store";
import { findArticle, markSeen } from "@/lib/blog/article";
import { DEMO_REVIEW_LABEL } from "@/lib/blog/demo-review";
import { blogNews, newsAnnouncement, newsKicker, newsMessage, type BlogNews } from "@/lib/blog/news";
import { markNoticesSeen, useSeenNotices } from "@/lib/blog/notice-seen";
import { articleHref, slugOf } from "@/lib/blog/slug";
import { Badge, linkVariants } from "@/components/ideeza";
import { openReportProblem } from "@/lib/support/open-report";
import { displayNameOf, initialsOf } from "@/lib/people/ids";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";

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

const COLLAPSED_KEY = "ideeza:sidebar:collapsed";

// Collapsed state persisted to localStorage. Loads after mount (the component
// SSRs expanded, then adopts the stored value) to avoid a hydration mismatch.
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of localStorage after mount (see above)
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  return [collapsed, toggle];
}

export function DashboardSidebar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  // The Blog's demo review decides about a minute after sending, on every page.
  useReviewClock();
  // The page the drawer was opened on. A drawer is for getting somewhere, so
  // arriving closes it: once the path changes it no longer matches.
  const pathname = usePathname();
  const [openOn, setOpenOn] = React.useState<string | null>(null);
  const drawerOpen = openOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenOn(open ? pathname : null);

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
          collapsed ? "w-[72px]" : "w-[280px]",
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

/** The phone's own chrome: the menu, the mark, the bell and search — the
 *  things the sidebar is for, at 56 px instead of 280. The bell sits here, not
 *  in the drawer, so a result shows its count on every phone page (F25). */
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
        className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-bg-page shadow-3"
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
      <UpgradeButton collapsed={collapsed} />
      <SupportBlock collapsed={collapsed} onLeave={onLeave} />
      <ProfileRow collapsed={collapsed} onLeave={onLeave} />
    </div>
  );
}

// There is no paid plan to move to yet, so this is not a button that does
// nothing: it names the plan and says it is not on sale, the convention every
// other not-yet control here follows.
function UpgradeButton({ collapsed }: { collapsed: boolean }) {
  const why = "The Builder plan isn't on sale yet";
  if (collapsed) {
    return (
      <span
        role="img"
        aria-label={why}
        title={why}
        className="mb-[12px] flex h-[40px] w-full items-center justify-center rounded-lg bg-bg-subtle text-text-tertiary"
      >
        <Icon icon={CrownIcon} />
      </span>
    );
  }
  return (
    <div
      aria-label={why}
      className="mb-[16px] flex w-full items-center gap-[12px] rounded-lg bg-bg-subtle px-[12px] py-[12px]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-md font-semibold text-text-secondary">
          Builder plan
        </span>
        <span className="block truncate text-xs font-regular text-text-tertiary">
          Not on sale yet — you are on Free
        </span>
      </span>
      <span
        aria-hidden
        className="inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-lg bg-bg-surface text-text-tertiary"
      >
        <Icon icon={FlashIcon} />
      </span>
    </div>
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

function ProfileRow({
  collapsed,
  onLeave,
}: {
  collapsed: boolean;
  /** Present in the phone drawer: closes it, so a dialog opened from the
   *  menu doesn't sit over a second focus trap. */
  onLeave?: () => void;
}) {
  // One panel open at a time — the account menu and the notification bell
  // both anchor to this row, and opening one must close the other rather
  // than let them stack on top of each other.
  const [openPanel, setOpenPanel] = React.useState<"menu" | "bell" | null>(
    null,
  );
  const ref = React.useRef<HTMLDivElement>(null);
  const accountButton = React.useRef<HTMLButtonElement>(null);

  // The Demo wallet dialog opens from inside the account menu, which closes
  // (P2-MINT-2). Focus goes to the account button first, so the dialog hands
  // it back there when it closes — the entry itself is gone with the menu.
  // In the drawer, the drawer closes too and hands focus to its menu button.
  const openWallet = () => {
    accountButton.current?.focus();
    setOpenPanel(null);
    onLeave?.();
  };

  React.useEffect(() => {
    if (!openPanel) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setOpenPanel(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPanel]);

  const { fields: profile } = useMyProfile();
  const photo = useMyPhoto();
  const meName = displayNameOf(profile.name);
  const meInitials = initialsOf(meName, profile.latinName || null);

  return (
    <div ref={ref} className="relative border-t border-border pt-[12px]">
      <div className="flex items-center gap-[6px]">
        <button
          ref={accountButton}
          type="button"
          onClick={() =>
            setOpenPanel((v) => (v === "menu" ? null : "menu"))
          }
          aria-haspopup="menu"
          aria-expanded={openPanel === "menu"}
          aria-label={`${meName} — open account menu`}
          title={collapsed ? `${meName} — account` : undefined}
          className={[
            "flex min-w-0 flex-1 items-center rounded-lg outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
            collapsed
              ? "h-[44px] justify-center px-0"
              : "h-[52px] gap-[12px] px-[8px]",
          ].join(" ")}
        >
          <span
            aria-hidden
            className="relative inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-bg-brand text-md font-bold text-text-on-brand"
          >
            {photo.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              meInitials
            )}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-md font-medium text-text-primary">
                {meName}
              </span>
              <span className="block truncate text-xs font-regular text-text-tertiary">
                Free plan
              </span>
            </span>
          )}
        </button>

        {/* Credits and notifications sit beside the account button, not
            inside it — each is its own destination. In the phone drawer the
            bell is left out: it lives in the phone's top bar. */}
        {!collapsed && (
          <>
            <Link
              href="/history#credits"
              aria-label="Credits ledger"
              title="Credits ledger"
              className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]"
            >
              <Icon icon={Wallet01Icon} />
            </Link>
            {!onLeave && (
              <NotificationBell
                open={openPanel === "bell"}
                onToggle={() =>
                  setOpenPanel((v) => (v === "bell" ? null : "bell"))
                }
                onClose={() => setOpenPanel(null)}
              />
            )}
          </>
        )}
      </div>

      {openPanel === "menu" && (
        <AccountMenu
          collapsed={collapsed}
          onClose={() => setOpenPanel(null)}
          onOpenWallet={openWallet}
        />
      )}
    </div>
  );
}

// Exhaustive over BuildAttention.reason — a build blocked on credits reads
// and links differently than one merely waiting on a retry or a review, and
// TS enforces every reason has a kicker so a new reason can't fall through.
const ATTENTION_KICKER: Record<BuildAttention["reason"], string> = {
  review: "Ready to review",
  retry: "Needs attention",
  credits: "Paused — needs credits",
};

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

/** The rows a keyboard moves through, in order. */
const bellRows = (panel: HTMLElement | null) => Array.from(panel?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

// A focused row shows a ring inside its own edge (the DS Menu row's), not just a fill
// that measures 1.04:1 against the panel (F10).
const BELL_ROW =
  "block px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const BELL_KICKER = "flex flex-wrap items-center gap-[6px] text-sm font-medium leading-sm text-text-secondary";

// The bell answers with what the app actually knows: the builds waiting
// for the user (the same list the attention banner surfaces) and the Blog's
// news, or, when there are none, a panel that says so — never a click that
// does nothing. Open state is controlled by the place that draws it (the
// sidebar's profile row, the phone top bar), so it never stacks with the
// account menu. A menu button (WAI-ARIA APG): Enter, Space or ↓ opens it on the
// first row, ↑ on the last; ↑ ↓ wrap, Home End jump; Escape closes it back to
// the bell; Tab closes it and moves on from the bell.
function NotificationBell({
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
                <BlogNewsItem key={n.key} news={n} onClose={onClose} />
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
                    className={BELL_ROW}
                  >
                    <span className={BELL_KICKER}>{ATTENTION_KICKER[att.reason]}</span>
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

/** A Blog item in the bell (D10, D-16), in the Figma's status words: opening it marks it seen
 *  and lands on the blog's details, where a rejection's or removal's reasons sit on top. */
function BlogNewsItem({ news: n, onClose }: { news: BlogNews; onClose: () => void }) {
  const { data } = useBlog();
  const article = findArticle(data, n.id);
  if (!article) return null;
  return (
    <li role="none">
      <Link
        href={articleHref(slugOf(article))}
        role="menuitem"
        onClick={() => {
          markNewsSeen(n);
          onClose();
        }}
        className={BELL_ROW}
      >
        <span className={BELL_KICKER}>
          {newsKicker(n)}
          {n.demo && (
            <Badge tone="neutral" className="px-[6px] py-0 text-xs leading-xs">
              {DEMO_REVIEW_LABEL}
            </Badge>
          )}
        </span>
        <span className="mt-[2px] block text-sm font-regular text-text-primary">{newsMessage(n)}</span>
      </Link>
    </li>
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
      <NotificationBell open={open} onToggle={() => setOpen((v) => !v)} onClose={() => setOpen(false)} placement="below" />
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

function AccountMenu({
  collapsed,
  onClose,
  onOpenWallet,
}: {
  collapsed: boolean;
  onClose: () => void;
  /** Closes the menu before the Demo wallet dialog opens. */
  onOpenWallet: () => void;
}) {
  const [walletOpen, setWalletOpen] = React.useState(false);
  const router = useRouter();
  return (
    <div
      role="menu"
      aria-label="Account"
      className={[
        "absolute bottom-[calc(100%+8px)] z-dropdown overflow-hidden rounded-xl border border-border bg-bg-surface shadow-3",
        // Collapsed: pop out to a fixed width beside the rail. Expanded: span
        // the sidebar width.
        collapsed ? "left-[8px] w-[260px]" : "left-[8px] right-[8px]",
      ].join(" ")}
    >
      <ul role="none" className="py-[8px]">
        <MenuRow
          icon={User02Icon}
          label="Profile"
          onClick={() => {
            onClose();
            router.push("/creators/me");
          }}
        />
        <MenuRow
          icon={Settings01Icon}
          label="Settings"
          onClick={() => {
            onClose();
          }}
        />
        <li role="none" className="my-[4px] border-t border-border" />
        <li role="none">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={walletOpen}
            onClick={() => setWalletOpen((v) => !v)}
            className="flex h-[36px] w-full items-center gap-[12px] px-[16px] text-left text-md font-regular text-text-primary outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle"
          >
            <span aria-hidden className="text-text-secondary">
              <Icon icon={Wallet01Icon} />
            </span>
            <span className="flex-1 truncate">Wallet & tokens</span>
            <span
              aria-hidden
              className={[
                "text-text-tertiary transition-transform duration-fast",
                walletOpen ? "" : "-rotate-90",
              ].join(" ")}
            >
              <Icon icon={ArrowDown01Icon} />
            </span>
          </button>
          {walletOpen && (
            <ul role="menu" className="bg-bg-page py-[4px]">
              {/* The wallet's one standing home (P2-MINT-2): it opens the
                  Demo wallet dialog, where every identity connects. */}
              <li role="none">
                <WalletMenuEntry variant="sidebar" onOpen={onOpenWallet} />
              </li>
              <WalletSubRow
                title="Earn IDZ tokens"
                hint="Free tokens to start"
              />
              <WalletSubRow
                title="Claim rewards"
                hint="See pending claims"
              />
              <li className="px-[20px] py-[12px] text-xs text-text-tertiary">
                Needed to mint or buy. Testnet demo — no real money.
              </li>
            </ul>
          )}
        </li>
        <li role="none" className="my-[4px] border-t border-border" />
        <ThemeSelector />
        <li role="none" className="my-[4px] border-t border-border" />
        <MenuRow
          icon={Logout01Icon}
          label="Sign out"
          destructive
          onClick={() => {
            onClose();
          }}
        />
      </ul>
    </div>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const options: Array<{
    value: "light" | "dark" | "system";
    label: string;
    icon: IconValue;
  }> = [
    { value: "light", label: "Light", icon: Sun01Icon },
    { value: "dark", label: "Dark", icon: Moon01Icon },
    { value: "system", label: "System", icon: ComputerIcon },
  ];
  return (
    <li role="none" className="px-[16px] py-[6px]">
      <p className="mb-[6px] text-2xs font-bold uppercase tracking-wider text-text-tertiary">
        Theme
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex h-[36px] w-full items-center gap-[2px] rounded-md border border-border bg-bg-page p-[2px]"
      >
        {options.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Use ${o.label.toLowerCase()} theme`}
              onClick={() => setTheme(o.value)}
              className={[
                "inline-flex h-[28px] flex-1 items-center justify-center gap-[6px] rounded-sm text-2xs outline-none transition-colors duration-fast",
                "focus-visible:ring-2 focus-visible:ring-border-focus",
                active
                  ? "bg-bg-surface font-medium text-text-primary shadow-1"
                  : "font-regular text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon icon={o.icon} size={14} />
              {o.label}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function MenuRow({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: IconValue;
  label: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        className={[
          "flex h-[36px] w-full items-center gap-[12px] px-[16px] text-left text-md font-regular outline-none transition-colors duration-fast",
          "hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle",
          destructive ? "text-text-error" : "text-text-primary",
        ].join(" ")}
      >
        <span
          aria-hidden
          className={destructive ? "text-text-error" : "text-text-secondary"}
        >
          <Icon icon={icon} />
        </span>
        <span className="flex-1 truncate">{label}</span>
      </button>
    </li>
  );
}

function WalletSubRow({ title, hint }: { title: string; hint: string }) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className="flex w-full flex-col items-start gap-[2px] px-[20px] py-[12px] text-left outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle"
      >
        <span className="text-md font-regular text-text-primary">{title}</span>
        <span className="text-xs font-regular text-text-tertiary">{hint}</span>
      </button>
    </li>
  );
}
