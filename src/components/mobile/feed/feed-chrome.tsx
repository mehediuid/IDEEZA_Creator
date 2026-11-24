"use client";

// Feed · "Clips top nav" (mobile Figma, Feed states): over the clip, in the
// Dark semantic mode, 16 in from each side — the Feed | Following switch (A17
// Badge LG, the current one on color/glass/fill-sm) and the marketplace
// activity button on the left; Search and the bell (with the web bell's
// count) on the right. Under it, while a build of yours waits its turn, the
// queue pill ("Popup when user is in queue") with the web's words for it; a
// tap opens that build's chat, as the build pill on every other tab does.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity01Icon, Notification01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Spinner } from "@/components/ideeza/spinner";
import { queuedAhead, statusOf, useCreateHistory } from "@/lib/create/history";
import { cn } from "@/lib/utils";
import { MEDIA_INK } from "../kit/media";
import { T } from "../type";
import { usePhoneNotices } from "./use-phone-notices";
import type { Guard } from "./use-guest";

export type FeedTab = "feed" | "following";

export function FeedTopNav({ tab, onTab, guard }: { tab: FeedTab; onTab: (t: FeedTab) => void; guard: Guard }) {
  const router = useRouter();
  const notices = usePhoneNotices();
  const go = (title: string, href: string) => guard(title, () => router.push(href), href);
  const badge = notices.hydrated ? notices.badge : 0;
  return (
    <div className="flex items-center justify-between px-8 py-2">
      <div className="flex items-center gap-4">
        <div role="tablist" aria-label="Feed" className="flex h-[28px] items-center gap-2">
          {(["feed", "following"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTab(t)}
              className={cn(
                T.name,
                MEDIA_INK,
                "flex h-full items-center rounded-md px-5 py-2 outline-none after:absolute after:inset-x-0 after:-inset-y-[8px] after:content-[''] focus-visible:ring-2 focus-visible:ring-border-focus relative",
                tab === t ? "bg-[var(--color-glass-fill-sm)]" : "bg-transparent",
              )}
            >
              {t === "feed" ? "Feed" : "Following"}
            </button>
          ))}
        </div>
        <NavIcon icon={Activity01Icon} label="Marketplace activity" onClick={() => go("Log In to see marketplace activity", "/m/market-activity")} />
      </div>
      <div className="flex items-center gap-4">
        <NavIcon icon={Search01Icon} label="Search" onClick={() => go("Log In to search", "/m/search")} />
        <span className="relative">
          <NavIcon
            icon={Notification01Icon}
            label={badge > 0 ? `Notifications, ${badge} new` : "Notifications"}
            onClick={() => go("Log In to see your notifications", "/m/notifications")}
          />
          {badge > 0 && (
            <span
              aria-hidden
              className={cn(
                T.micro,
                MEDIA_INK,
                "pointer-events-none absolute right-[4px] top-[4px] inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--color-text-error)] px-1",
              )}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function NavIcon({ icon, label, onClick }: { icon: IconValue; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(MEDIA_INK, "inline-flex size-[44px] items-center justify-center rounded-full outline-none transition-colors duration-fast active:bg-[var(--color-glass-fill-sm)] focus-visible:ring-2 focus-visible:ring-border-focus")}
    >
      <Icon icon={icon} size={24} />
    </button>
  );
}

/** Your build waiting its turn, in the web's words (History: "n builds ahead in line"). */
export function QueuePill() {
  const router = useRouter();
  const { hydrated, builds } = useCreateHistory();
  const queued = React.useMemo(
    () => (hydrated ? (builds.filter((b) => statusOf(b) === "queued" && !b.blocked).sort((a, b) => a.createdAt - b.createdAt)[0] ?? null) : null),
    [hydrated, builds],
  );
  if (!queued) return null;
  const ahead = queuedAhead(queued, builds);
  const text = ahead ? `Please wait. Your build has ${ahead} ${ahead === 1 ? "build" : "builds"} ahead in line.` : "Please wait. Your build is next in line.";
  return (
    <div className="flex justify-center px-8 pt-2">
      <button
        type="button"
        data-theme="light"
        onClick={() => router.push(`/m/ai/chat/${encodeURIComponent(queued.chatId)}`)}
        className={cn(T.meta, "flex items-center gap-4 rounded-md bg-bg-surface px-5 py-2 text-text-primary shadow-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
      >
        <Spinner size={16} />
        {text}
      </button>
    </div>
  );
}
