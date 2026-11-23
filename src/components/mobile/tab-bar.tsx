"use client";

// Figma "Navbar Container" (3070:11343, variants Home · Earn Coin · Ai ·
// Message · Profile): the app's five tabs, in that order with the AI orb in
// the middle. bg/page with Elevation/4 — Overlay; a 64 px row padded 12 / 4,
// items spread. Each item is 48 wide: a 2 px border/focus line on top when
// it is the current tab, then the 24 px icon and its Caption/SM label 4
// apart — icon/default + text/secondary when current, icon/secondary +
// text/tertiary when not. The orb (48) has no label. Under the row: the home
// indicator (21) in the phone frame, the safe-area inset on a phone.
//
// Like the web's sidebar, Message carries the count of unread Inbox
// conversations (a brand pill on the icon, "99+" past 99; the same number the
// web shows, `countsFor().unread`) and the AI orb a red dot while a build
// needs you. Each tab
// remembers where you were in it (this tab of the browser): leaving Earn ›
// Stake for Messages and coming back opens Stake again; tapping the tab you
// are on goes to its root, and on its root scrolls the screen to the top.
// While the first-product guide is on, its strip sits on top of the tab row
// (guide/guide-strip.tsx, AUTH-5), in the flow, so it never covers a screen.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CoinsDollarIcon, Home09Icon, Message01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { useAuth } from "@/lib/account/auth";
import { useCreateHistory } from "@/lib/create/history";
import { countsFor } from "@/lib/messages/rules";
import { useMessages } from "@/lib/messages/store";
import { ME } from "@/lib/messages/types";
import { useDemoMessagesSeed } from "@/lib/messages/use-demo-seed";
import { useMessagePeople } from "@/lib/messages/use-people";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { GuestGate } from "./account/guest-gate";
import { GuideStrip } from "./guide/guide-strip";
import { HomeIndicator } from "./home-indicator";
import { PRESSED_DIM } from "./kit/press";
import { FOOT_ATTR } from "./kit/toast";
import { SCROLL_ATTR } from "./screen";
import { T } from "./type";

type Tab = {
  href: string;
  label: string;
  icon: IconValue | null;
  /** A guest (Explore first) browses Home only; the others ask them in (AU-03). */
  gate?: { title: string; description?: string };
};

export const TABS: readonly Tab[] = [
  { href: "/m", label: "Home", icon: Home09Icon },
  {
    href: "/m/earn",
    label: "Earn Coin",
    icon: CoinsDollarIcon,
    gate: { title: "Log In to earn coins", description: "You’ll land on Earn Coin after you Log In." },
  },
  {
    href: "/m/ai",
    label: "AI",
    icon: null,
    gate: { title: "Log In to start a project", description: "You’ll start your project right after you Log In." },
  },
  {
    href: "/m/messages",
    label: "Message",
    icon: Message01Icon,
    gate: { title: "Log In to see your messages", description: "You’ll land on Messages after you Log In." },
  },
  {
    href: "/m/profile",
    label: "Profile",
    icon: UserCircleIcon,
    gate: { title: "Log In to see your profile", description: "You’ll land on your profile after you Log In." },
  },
];

/** The orb's art (brand gradients, not DS colours, so it stays a file); the /m layout preloads it. */
export const AI_ORB_SRC = "/m/ai-orb.svg";

function isCurrent(href: string, pathname: string): boolean {
  const path = pathname.length > 2 ? pathname.replace(/\/+$/, "") : pathname;
  if (href === "/m") return path === "/m";
  return path === href || path.startsWith(`${href}/`);
}

const LAST_KEY = "ideeza:m:tab-paths";
const LAST_EVENT = "ideeza:m:tab-paths";

function readLastRaw(): string {
  try {
    return sessionStorage.getItem(LAST_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribeLast(onChange: () => void) {
  window.addEventListener(LAST_EVENT, onChange);
  return () => window.removeEventListener(LAST_EVENT, onChange);
}

/** Where each tab was left, kept as you move (one browser tab's session). */
function useLastPaths(pathname: string): Record<string, string> {
  const raw = React.useSyncExternalStore(subscribeLast, readLastRaw, () => "{}");
  React.useEffect(() => {
    const tab = TABS.find((t) => isCurrent(t.href, pathname));
    if (!tab) return;
    try {
      const all = JSON.parse(readLastRaw()) as Record<string, string>;
      all[tab.href] = pathname + window.location.search;
      sessionStorage.setItem(LAST_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event(LAST_EVENT));
    } catch {
      // Storage refused: each tab opens at its root.
    }
  }, [pathname]);
  return React.useMemo(() => {
    try {
      const v: unknown = JSON.parse(raw);
      return v && typeof v === "object" ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, [raw]);
}

/** Unread Inbox conversations (the web sidebar's badge, for you; hidden words count as on the Inbox). */
function useUnread(): number {
  useDemoMessagesSeed();
  const { data, hydrated } = useMessages();
  const people = useMessagePeople();
  const settings = useSettings();
  if (!hydrated || !people.hydrated) return 0;
  return countsFor(data, ME, people.teamIdsOf, settings.blocking.hiddenWords).unread;
}

/** Builds that need you, less the one whose chat is open. */
function useAttention(pathname: string): number {
  const { attentionBuilds } = useCreateHistory();
  const open = pathname.startsWith("/m/ai/chat/") ? pathname.split("/")[4] : null;
  return attentionBuilds.filter((a) => a.job.chatId !== open).length;
}

/** Each tab's link carries its root path here, so the phone's tour can point at it. */
export const TAB_ATTR = "data-tab";

const DOT = "pointer-events-none absolute right-0 top-0 size-[8px] rounded-full";
/** The unread count on a tab's icon: a 16 px brand pill, Caption/SM in text/on-brand. */
const COUNT = cn(
  T.micro,
  "pointer-events-none absolute -top-2 left-[14px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-bg-brand px-2 tabular-nums text-[color:var(--color-text-on-brand)]",
);

export function TabBar() {
  const pathname = usePathname();
  const { signedIn } = useAuth();
  const [gate, setGate] = React.useState<Tab | null>(null);
  const last = useLastPaths(pathname);
  const unread = useUnread();
  const attention = useAttention(pathname);
  return (
    <nav aria-label="Tabs" {...{ [FOOT_ATTR]: "" }} className="relative shrink-0 bg-bg-page shadow-overlay">
      <GuideStrip at="tabs" />
      <ul className="flex h-[64px] items-center justify-between px-6 py-2">
        {TABS.map((t) => {
          const current = isCurrent(t.href, pathname);
          const dot = t.href === "/m/messages" ? unread : t.href === "/m/ai" ? attention : 0;
          const said =
            t.href === "/m/messages" && unread
              ? `${t.label}, ${unread} unread`
              : t.href === "/m/ai" && attention
                ? `${t.label}, ${attention} build${attention === 1 ? " needs" : "s need"} attention`
                : t.icon
                  ? undefined
                  : t.label;
          return (
            <li key={t.href}>
              <Link
                href={current ? t.href : (last[t.href] ?? t.href)}
                aria-current={current ? "page" : undefined}
                aria-label={said}
                {...{ [TAB_ATTR]: t.href }}
                onClick={(e) => {
                  if (!signedIn && t.gate) {
                    e.preventDefault();
                    setGate(t);
                    return;
                  }
                  // On the tab's own root: back to the top of it.
                  if (current && pathname.replace(/\/+$/, "") === t.href) {
                    e.preventDefault();
                    document.querySelector(`#m-app [${SCROLL_ATTR}]`)?.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={cn(
                  "flex h-[56px] min-w-[48px] flex-col items-center justify-center gap-2 border-t-[length:var(--border-width-2)] border-solid outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  PRESSED_DIM,
                  current ? "border-[var(--color-border-focus)]" : "border-transparent",
                )}
              >
                {t.icon ? (
                  <>
                    <span
                      className={cn(
                        "relative",
                        current ? "text-[color:var(--color-icon-default)]" : "text-[color:var(--color-icon-secondary)]",
                      )}
                    >
                      <Icon icon={t.icon} size={24} />
                      {dot > 0 && (
                        <span aria-hidden className={COUNT}>
                          {dot > 99 ? "99+" : dot}
                        </span>
                      )}
                    </span>
                    <span className={cn(T.micro, "whitespace-nowrap", !current && "text-text-tertiary")}>{t.label}</span>
                  </>
                ) : (
                  <span className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the orb is a static brand mark, preloaded by the /m layout */}
                    <img src={AI_ORB_SRC} alt="" width={48} height={48} className="size-[48px]" />
                    {dot > 0 && <span aria-hidden className={cn(DOT, "right-2 top-2 bg-bg-error")} />}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <HomeIndicator />
      <GuestGate
        open={!!gate}
        onClose={() => setGate(null)}
        title={gate?.gate?.title ?? ""}
        description={gate?.gate?.description}
        next={gate?.href}
      />
    </nav>
  );
}
