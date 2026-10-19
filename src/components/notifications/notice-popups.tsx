"use client";

// The pop-ups the bell's notices make beyond the page's own toasts (V5),
// mounted once at the root so the editors have them too:
// - outside the tab: with this tab hidden, a notice that arrives and may pop up
//   (lib/notifications/popups.ts) shows as the browser's own pop-up, when the
//   browser allows it. A build that finishes in the chat open here counts too:
//   the bell leaves that one out because it is on screen, but a hidden tab's
//   screen is not seen.
// - once a day: the first look after the day turns, one toast sums up what
//   came in since the last one. It waits for the tab to be in view and for
//   quiet hours to end; "Keep notices until I close them" keeps it up.
// Nothing is said about what was already waiting when the app opened.

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Cancel01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory } from "@/lib/create/history";
import { parseStored, useStoredKey, writeStoredKey } from "@/lib/key-store";
import {
  browserPopupAllowed,
  dailySummary,
  dayKeyOf,
  decodeSummaryMark,
  freshNotices,
  summaryDue,
  summaryLine,
  SUMMARY_KEY,
  type DailySummary,
} from "@/lib/notifications/popups";
import { useNoticeReads } from "@/lib/notifications/read-store";
import { buildNotices } from "@/lib/notifications/sources";
import type { Notice } from "@/lib/notifications/types";
import { popupPermission, showBrowserPopup } from "./browser-popups";
import { markRead, useNoticeClock, useNotices } from "./use-notices";

/** At most this many browser pop-ups at once; the bell holds the rest. */
const BURST = 3;
const HIDE_MS = 8000;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const noSubscribe = () => () => {};
/** The root layout's toast layer slot the build attention toast also uses (app/layout.tsx). */
const toastSlot = () => document.getElementById("ideeza-toast-layer-attention");
const useTabVisible = () =>
  React.useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);

export function NoticePopups() {
  const feed = useNotices();
  const reads = useNoticeReads();
  const { attentionBuilds, getChat, hydrated: historyReady } = useCreateHistory();
  const router = useRouter();
  const now = useNoticeClock();
  const visible = useTabVisible();
  const settings = feed.settings;
  const keep = settings.appearance.keepNotices;
  const ready = feed.hydrated && historyReady;

  const candidates = React.useMemo<Notice[]>(() => {
    const byId = new Map(feed.all.map((n) => [n.id, n]));
    for (const n of buildNotices(attentionBuilds, (id) => !!getChat(id))) if (!byId.has(n.id)) byId.set(n.id, n);
    return [...byId.values()];
  }, [feed.all, attentionBuilds, getChat]);

  // ── outside the tab ──
  const known = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (!ready) return;
    if (known.current === null) {
      known.current = new Set(candidates.map((n) => n.id));
      return;
    }
    const fresh = freshNotices(candidates, known.current, reads.keys);
    for (const n of candidates) known.current.add(n.id);
    const tab = { hidden: document.visibilityState === "hidden", permission: popupPermission() };
    fresh
      .filter((n) => browserPopupAllowed(n, settings, Date.now(), tab))
      .sort((a, b) => b.at - a.at)
      .slice(0, BURST)
      .forEach((n) =>
        showBrowserPopup(n, keep, () => {
          markRead([n]);
          router.push(n.href);
        }),
      );
  }, [ready, candidates, reads.keys, settings, keep, router]);

  // ── once a day ──
  const { hydrated: markReady, raw } = useStoredKey(SUMMARY_KEY);
  const mark = React.useMemo(() => decodeSummaryMark(parseStored(raw).value), [raw]);
  const [say, setSay] = React.useState<DailySummary | null>(null);
  React.useEffect(() => {
    if (!ready || !markReady || !now || !visible || !summaryDue(settings, mark, now)) return;
    const sum = dailySummary(feed.all, reads.keys, settings, mark, now);
    if (!writeStoredKey(SUMMARY_KEY, { day: dayKeyOf(now), at: now }).ok) return;
    // A one-shot pop-up: the stored mark it was just written to keeps it from coming back.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sum.total > 0) setSay(sum);
  }, [ready, markReady, now, visible, settings, mark, feed.all, reads.keys]);

  React.useEffect(() => {
    if (!say || keep) return;
    const t = window.setTimeout(() => setSay(null), HIDE_MS);
    return () => window.clearTimeout(t);
  }, [say, keep]);

  const slot = React.useSyncExternalStore(noSubscribe, toastSlot, () => null);

  if (!say || !slot) return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex w-[540px] max-w-full items-start gap-[12px] rounded-2xl border border-solid border-border-brand bg-bg-surface px-[16px] py-[12px] shadow-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
    >
      <span aria-hidden className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand">
        <Icon icon={Notification03Icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm leading-sm text-text-tertiary">Your daily summary</p>
        <p className="m-0 mt-[2px] text-md leading-md text-text-primary">{summaryLine(say)} They&apos;re in the bell.</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss the daily summary"
        onClick={() => setSay(null)}
        className="inline-flex size-[36px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]"
      >
        <Icon icon={Cancel01Icon} />
      </button>
    </div>,
    slot,
  );
}
