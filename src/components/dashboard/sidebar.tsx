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
// Sizing note: the project's Tailwind preset overrides `spacing` with
// the IDEEZA DS spacing tokens (so `h-5` resolves to 10px, not 20px).
// Component dimensions therefore use explicit arbitrary px values.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

// `href: null` is a section with no page behind it yet. It stays in the list,
// so the shape of the product is visible, but it says it is not open rather
// than linking to a 404.
type NavItem = { label: string; href: string | null; icon: IconValue };

const NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home01Icon },
  { label: "History", href: "/history", icon: HistoryIcon },
  { label: "My projects", href: "/projects", icon: Folder01Icon },
  { label: "Parts & agile module", href: "/parts", icon: CpuIcon },
  { label: "Explore marketplace", href: null, icon: ShoppingBag01Icon },
  { label: "Innovations", href: "/innovations", icon: News01Icon },
  { label: "Messages", href: null, icon: Mail01Icon },
  { label: "Blog", href: null, icon: BookOpen01Icon },
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

const USER = {
  name: "You",
  initials: "Y",
};

const COLLAPSED_KEY = "ideeza:sidebar:collapsed";

// Collapsed state persisted to localStorage. Loads after mount (the component
// SSRs expanded, then adopts the stored value) to avoid a hydration mismatch.
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
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
            <NavRow key={item.label} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      <Footer collapsed={collapsed} />
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
        className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
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
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search commands, pages, and settings"
        className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
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
  const fullLabel = `${item.label}${attentionLabel}`;
  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? fullLabel : showAttention ? fullLabel : undefined}
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
      </Link>
    </li>
  );
}

function Footer({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="border-t border-border p-[12px]">
      <UpgradeButton collapsed={collapsed} />
      <SupportBlock collapsed={collapsed} />
      <ProfileRow collapsed={collapsed} />
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

function SupportBlock({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <ul role="list" className="mb-[12px] flex flex-col gap-[2px]">
        {[...SUPPORT_LINKS, { label: "Report a Problem", icon: Bug01Icon }].map(
          (row) => (
            <li key={row.label}>
              <SupportAction label={row.label} icon={row.icon} collapsed />
            </li>
          ),
        )}
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
        <SupportAction label="Report a Problem" icon={Bug01Icon} />
      </p>
    </div>
  );
}

// One handler for all four: they open the same help surfaces the command
// palette lists, which have no page of their own yet — so the control
// says so instead of pretending to navigate.
function SupportAction({
  label,
  icon,
  collapsed,
}: {
  label: string;
  icon: IconValue;
  collapsed?: boolean;
}) {
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

function ProfileRow({ collapsed }: { collapsed: boolean }) {
  // One panel open at a time — the account menu and the notification bell
  // both anchor to this row, and opening one must close the other rather
  // than let them stack on top of each other.
  const [openPanel, setOpenPanel] = React.useState<"menu" | "bell" | null>(
    null,
  );
  const ref = React.useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="relative border-t border-border pt-[12px]">
      <div className="flex items-center gap-[6px]">
        <button
          type="button"
          onClick={() =>
            setOpenPanel((v) => (v === "menu" ? null : "menu"))
          }
          aria-haspopup="menu"
          aria-expanded={openPanel === "menu"}
          aria-label={`${USER.name} — open account menu`}
          title={collapsed ? `${USER.name} — account` : undefined}
          className={[
            "flex min-w-0 flex-1 items-center rounded-lg outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
            collapsed
              ? "h-[44px] justify-center px-0"
              : "h-[52px] gap-[12px] px-[8px]",
          ].join(" ")}
        >
          <span
            aria-hidden
            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-bg-brand text-md font-bold text-text-on-brand"
          >
            {USER.initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-md font-medium text-text-primary">
                {USER.name}
              </span>
              <span className="block truncate text-xs font-regular text-text-tertiary">
                Free plan
              </span>
            </span>
          )}
        </button>

        {/* Credits and notifications sit beside the account button, not
            inside it — each is its own destination. */}
        {!collapsed && (
          <>
            <Link
              href="/history#credits"
              aria-label="Credits ledger"
              title="Credits ledger"
              className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Icon icon={Wallet01Icon} />
            </Link>
            <NotificationBell
              open={openPanel === "bell"}
              onToggle={() =>
                setOpenPanel((v) => (v === "bell" ? null : "bell"))
              }
              onClose={() => setOpenPanel(null)}
            />
          </>
        )}
      </div>

      {openPanel === "menu" && (
        <AccountMenu collapsed={collapsed} onClose={() => setOpenPanel(null)} />
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

// The bell answers with what the app actually knows: the builds waiting
// for the user (the same list the attention banner surfaces), or, when
// there are none, a panel that says so — never a click that does nothing.
// Open state is controlled by ProfileRow so the bell and the account menu
// can never both be open at once.
function NotificationBell({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const attentionBuilds = useAttentionElsewhere();
  const { getChat } = useCreateHistory();
  const count = attentionBuilds.length;

  const label =
    count > 0
      ? `Notifications, ${count} need${count === 1 ? "s" : ""} attention`
      : "No notifications yet";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg border border-border text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
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
          role="menu"
          aria-label="Notifications"
          className="absolute bottom-[calc(100%+8px)] right-0 z-dropdown w-[260px] overflow-hidden rounded-xl border border-border bg-bg-surface shadow-3"
        >
          <p className="border-b border-border px-[16px] py-[10px] text-2xs font-bold uppercase tracking-wider text-text-tertiary">
            Notifications
          </p>
          {count === 0 ? (
            <p className="px-[16px] py-[16px] text-sm font-regular text-text-tertiary">
              No notifications yet — builds that need you show up here.
            </p>
          ) : (
            <ul role="none" className="py-[4px]">
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
                    className="block px-[16px] py-[10px] outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:bg-bg-brand-subtle"
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
        </div>
      )}
    </div>
  );
}

function AccountMenu({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose: () => void;
}) {
  const [walletOpen, setWalletOpen] = React.useState(false);
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
              <WalletSubRow
                title="Connect wallet"
                hint="Add an on-chain identity"
              />
              <WalletSubRow
                title="Earn IDZ tokens"
                hint="Free tokens to start"
              />
              <WalletSubRow
                title="Claim rewards"
                hint="See pending claims"
              />
              <li className="px-[20px] py-[12px] text-xs text-text-tertiary">
                Set up later — only needed when you sell.
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
