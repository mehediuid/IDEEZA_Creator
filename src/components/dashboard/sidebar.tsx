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
  ArrowUpRight01Icon,
  BookOpen01Icon,
  Bug01Icon,
  Compass01Icon,
  ComputerIcon,
  CpuIcon,
  CrownIcon,
  Folder01Icon,
  HistoryIcon,
  Home01Icon,
  HelpCircleIcon,
  Logout01Icon,
  Mail01Icon,
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
import { useCreateHistory } from "@/lib/create/history";
import { Icon, type IconValue } from "./icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";

const NAV: Array<{
  label: string;
  href: string;
  icon: IconValue;
}> = [
  { label: "Home", href: "/", icon: Home01Icon },
  { label: "History", href: "/history", icon: HistoryIcon },
  { label: "My projects", href: "/projects", icon: Folder01Icon },
  { label: "Parts & agile module", href: "/parts", icon: CpuIcon },
  { label: "Explore marketplace", href: "/marketplace", icon: ShoppingBag01Icon },
  { label: "Innovations", href: "/innovations", icon: News01Icon },
  { label: "Messages", href: "/messages", icon: Mail01Icon },
  { label: "Blog", href: "/blog", icon: BookOpen01Icon },
];

const USER = {
  name: "You",
  initials: "Y",
  notificationCount: 0,
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

  return (
    <aside
      aria-label="Primary navigation"
      data-collapsed={collapsed}
      className={[
        "flex h-full shrink-0 flex-col border-r border-border bg-bg-page",
        "transition-[width] duration-normal ease-decelerate motion-reduce:transition-none",
        collapsed ? "w-[72px]" : "w-[280px]",
      ].join(" ")}
    >
      <Brand collapsed={collapsed} onToggle={toggleCollapsed} />

      <div className={collapsed ? "px-[12px] pt-[12px]" : "px-[16px] pt-[16px]"}>
        {collapsed && (
          <div className="mb-[8px]">
            <ExpandButton onClick={toggleCollapsed} />
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
            <NavRow key={item.href} item={item} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      <Footer collapsed={collapsed} />
    </aside>
  );
}

// ────────────────────────────────── parts ───────────────────────────────

function Brand({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
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
        onClick={onToggle}
        aria-label="Collapse sidebar"
        aria-expanded
        title="Collapse sidebar"
        className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={SidebarLeft01Icon} />
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
  item: { label: string; href: string; icon: IconValue };
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { attentionBuilds } = useCreateHistory();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  // History row gets a red dot whenever any build needs attention. Per
  // spec §7b, the dot stays on until the user resolves the issue (not
  // just because they dismissed the banner) — that's why we read the
  // raw attentionBuilds count, not topAttention.
  const showAttention =
    item.href === "/history" && attentionBuilds.length > 0;
  const attentionLabel = showAttention
    ? `, ${attentionBuilds.length} build${attentionBuilds.length === 1 ? "" : "s"} need${attentionBuilds.length === 1 ? "s" : ""} attention`
    : "";
  const fullLabel = `${item.label}${attentionLabel}`;
  return (
    <li>
      <Link
        href={item.href}
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
      <ForYouGroup collapsed={collapsed} />
      <ProfileRow collapsed={collapsed} />
    </div>
  );
}

function UpgradeButton({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Upgrade to Pro"
        title="Upgrade to Pro"
        className="mb-[12px] flex h-[40px] w-full items-center justify-center rounded-md bg-violet-600 text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <Icon icon={CrownIcon} />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Upgrade to Pro for unlimited generations, on-chain proofs, and marketplace listings"
      className="mb-[12px] flex h-[40px] w-full items-center gap-[10px] rounded-md bg-violet-600 px-[12px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <Icon icon={CrownIcon} />
      <span className="flex-1 text-left">Upgrade to Pro</span>
      <Icon icon={ArrowUpRight01Icon} />
    </button>
  );
}

function ForYouGroup({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="mb-[16px]">
      {!collapsed && (
        <p className="mb-[6px] px-[10px] text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          For you
        </p>
      )}
      <ul role="list" className="flex flex-col gap-[2px]">
        <ForYouRow icon={MortarboardIcon} label="Tutorial" collapsed={collapsed} />
        <ForYouRow icon={Compass01Icon} label="Tour guide" collapsed={collapsed} />
        <ForYouRow icon={HelpCircleIcon} label="Help & support" collapsed={collapsed} />
        <ForYouRow icon={Bug01Icon} label="Report a problem" collapsed={collapsed} />
      </ul>
    </div>
  );
}

function ForYouRow({
  icon,
  label,
  collapsed,
}: {
  icon: IconValue;
  label: string;
  collapsed: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={[
          "flex h-[32px] w-full items-center rounded-md text-md font-regular text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
          collapsed ? "justify-center px-0" : "gap-[12px] px-[10px]",
        ].join(" ")}
      >
        <span aria-hidden className="shrink-0">
          <Icon icon={icon} />
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    </li>
  );
}

function ProfileRow({ collapsed }: { collapsed: boolean }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={ref} className="relative border-t border-border pt-[12px]">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`${USER.name} — open account menu`}
        title={collapsed ? `${USER.name} — account` : undefined}
        className={[
          "flex w-full items-center rounded-lg outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus",
          collapsed ? "h-[44px] justify-center px-0" : "h-[52px] gap-[12px] px-[8px]",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-violet-600 text-md font-bold text-text-on-brand"
        >
          {USER.initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-md font-medium text-text-primary">
                {USER.name}
              </span>
              <span className="block truncate text-xs font-regular text-text-tertiary">
                Free plan
              </span>
            </span>
            <NotificationBell count={USER.notificationCount} />
            <span
              aria-hidden
              className={[
                "shrink-0 text-text-tertiary transition-transform duration-fast",
                menuOpen ? "rotate-180" : "",
              ].join(" ")}
            >
              <Icon icon={ArrowDown01Icon} />
            </span>
          </>
        )}
      </button>

      {menuOpen && (
        <AccountMenu collapsed={collapsed} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

function NotificationBell({ count }: { count: number }) {
  return (
    <span
      aria-label={
        count > 0
          ? `Notifications, ${count} unread`
          : "Notifications, none unread"
      }
      className="relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-lg text-text-tertiary"
    >
      <Icon icon={Notification03Icon} />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-[4px] top-[4px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-bg-error px-[4px] text-2xs font-bold leading-none text-text-inverse"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
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
