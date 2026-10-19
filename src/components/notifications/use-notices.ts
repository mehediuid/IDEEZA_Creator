"use client";

// The bell's notices, live (spec §5.6): every source in lib/notifications read
// from the stores this browser keeps, with the Notification settings applied
// and the read state merged. The sidebar's bell, the phone's, the editor's and
// the two toasts read this one list, so they never disagree.

import * as React from "react";
import { usePathname } from "next/navigation";
import { markNoticesSeen, useSeenNotices } from "@/lib/blog/notice-seen";
import { markSeen } from "@/lib/blog/article";
import { updateBlog, useBlog } from "@/lib/blog/store";
import { useCreateHistory, type BuildAttention } from "@/lib/create/history";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { COMMENTS_KEY, decodeComments } from "@/lib/innovations/comments-store";
import { personOf, ME as POST_ME } from "@/lib/innovations/people";
import { mineSlugOf, postIdOfProject } from "@/lib/innovations/slug";
import { readStoredKey, subscribeStores } from "@/lib/key-store";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { usePayout } from "@/lib/account/use-payout";
import { useMarket } from "@/lib/market/market-store";
import { useMessages } from "@/lib/messages/store";
import { useMessagePeople } from "@/lib/messages/use-people";
import { bellNotices, filterNotices, groupNotices, toastAllowed, unreadCount, type NoticeGroup } from "@/lib/notifications/filter";
import { isNoticeRead } from "@/lib/notifications/read";
import { markNoticesRead, useNoticeReads } from "@/lib/notifications/read-store";
import {
  blogNotices,
  buildNotices,
  coinNotices,
  commentNotices,
  marketNotices,
  messageNotices,
  payoutNotices,
  videoNotices,
  type SharedPostInput,
} from "@/lib/notifications/sources";
import type { Notice } from "@/lib/notifications/types";
import { readSettings, updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";

/** The builds that need the maker, minus the one whose chat is open: it is already in front of
 *  them. The bell used to say "1 needs attention" about the very build on screen. */
export function useAttentionElsewhere(): BuildAttention[] {
  const pathname = usePathname();
  const { attentionBuilds } = useCreateHistory();
  return React.useMemo(() => {
    const open = pathname.startsWith("/chat/") ? pathname.split("/")[2] : null;
    return open ? attentionBuilds.filter((a) => a.job.chatId !== open) : attentionBuilds;
  }, [attentionBuilds, pathname]);
}

// A clock that moves every half minute: auctions ending, credits expiring and quiet hours all
// turn on it. The server and hydration read 0, and every source waits for its store anyway.
const TICK_MS = 30_000;
function subscribeTick(onChange: () => void) {
  const id = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(id);
}
const tickNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
export function useNoticeClock(): number {
  return React.useSyncExternalStore(subscribeTick, tickNow, () => 0);
}

const SEP = "\u0000";

/** The comments on every project this browser shared (showcased) on Innovations. */
function useSharedComments(projects: readonly ManualProject[]): SharedPostInput[] {
  const shared = React.useMemo(() => projects.filter((p) => typeof p.showcasedAt === "number"), [projects]);
  const snapshot = React.useSyncExternalStore(
    subscribeStores,
    () => shared.map((p) => readStoredKey(COMMENTS_KEY(postIdOfProject(p.id))) ?? "").join(SEP),
    () => "",
  );
  return React.useMemo(() => {
    const raws = snapshot.split(SEP);
    return shared.map((p, i) => ({
      projectId: p.id,
      projectName: p.name.trim() || "Untitled project",
      slug: mineSlugOf(p),
      comments: decodeComments(raws[i] || null, postIdOfProject(p.id))?.comments ?? [],
    }));
  }, [shared, snapshot]);
}

/** Marks notices read: in the bell's own keys, and a Blog result also where the Blog keeps it,
 *  so its article page and the bell agree. */
export function markRead(list: readonly Notice[]): boolean {
  for (const n of list) {
    if (!n.blog || n.read) continue;
    const { key, articleId, notice } = n.blog;
    if (notice) markNoticesSeen([key]);
    else updateBlog((d) => markSeen(d, articleId));
  }
  return markNoticesRead(list.map((n) => n.id)).ok;
}

/** Adds a project to the muted list; false when the browser refused the write. */
export function muteProject(projectId: string): boolean {
  const muted = readSettings().notifications.mutedProjects;
  return muted.includes(projectId) || updateSettings("notifications", { mutedProjects: [...muted, projectId] });
}

export function unmuteProject(projectId: string): boolean {
  const muted = readSettings().notifications.mutedProjects;
  return updateSettings("notifications", { mutedProjects: muted.filter((id) => id !== projectId) });
}

export type NoticeFeed = {
  /** False until every store has been read: the count waits, so it never flickers. */
  hydrated: boolean;
  settings: SettingsV1;
  /** What the bell lists: the settings applied, newest first. */
  list: Notice[];
  /** `list` under the digest's headings (one group with no heading right away). */
  groups: NoticeGroup[];
  /** The bell's count (quiet hours hold back what comes in during them). */
  unread: number;
  /** Every unread notice the settings let show — what Mark all as read marks. */
  unreadList: Notice[];
  isRead: (n: Notice) => boolean;
  projectName: (projectId: string) => string | null;
};

export function useNotices(): NoticeFeed {
  const settings = useSettings();
  const now = useNoticeClock();
  const attention = useAttentionElsewhere();
  const history = useCreateHistory();
  const blog = useBlog();
  const seen = useSeenNotices();
  const messages = useMessages();
  const people = useMessagePeople();
  const market = useMarket();
  const { projects, hydrated: projectsReady } = useManualProjects();
  const credits = useCredits();
  const plan = useCreatePlan();
  const video = useVideoJobs();
  const shared = useSharedComments(projects);
  const reads = useNoticeReads();
  const payout = usePayout();

  const { hydrated: historyReady, getChat } = history;
  const all = React.useMemo<Notice[]>(() => {
    if (!now) return [];
    const sub = plan.sub;
    const pending = sub.pending && sub.pending.tier !== "free" ? planOf(sub.pending.tier).name : null;
    return [
      ...(historyReady ? buildNotices(attention, (id) => !!getChat(id)) : []),
      ...(blog.hydrated && seen.hydrated ? blogNotices(blog.data, seen.seen) : []),
      ...(messages.hydrated && people.hydrated ? messageNotices(messages.data, people.nameOf) : []),
      ...(market.hydrated && projectsReady ? marketNotices(market.data, projects, now) : []),
      ...(credits.hydrated && plan.hydrated
        ? coinNotices({
            balance: credits.balance,
            ledger: credits.ledger,
            lowAt: settings.credits.lowAt,
            expiryReminderDays: settings.credits.expiryReminderDays,
            plan:
              sub.tier === "free"
                ? null
                : {
                    subId: sub.id,
                    tier: sub.tier,
                    name: plan.plan.name,
                    renewsAt: sub.renewsAt,
                    autoRenew: sub.autoRenew && sub.pending?.tier !== "free",
                    pendingName: pending,
                  },
            now,
          })
        : []),
      ...(video.hydrated ? videoNotices(video.jobs) : []),
      ...commentNotices(shared, POST_ME.id, (id) => personOf(id).name),
      ...(payout ? payoutNotices(payout.methodLog) : []),
    ];
  }, [
    now,
    historyReady,
    attention,
    getChat,
    blog.hydrated,
    blog.data,
    seen.hydrated,
    seen.seen,
    messages.hydrated,
    messages.data,
    people.hydrated,
    people.nameOf,
    market.hydrated,
    market.data,
    projectsReady,
    projects,
    credits.hydrated,
    credits.balance,
    credits.ledger,
    plan.hydrated,
    plan.sub,
    plan.plan.name,
    settings.credits.lowAt,
    settings.credits.expiryReminderDays,
    video.hydrated,
    video.jobs,
    shared,
    payout,
  ]);

  const names = React.useMemo(() => new Map(projects.map((p) => [p.id, p.name.trim() || "Untitled project"])), [projects]);
  return React.useMemo(() => {
    const keys = reads.keys;
    const visible = filterNotices(all, settings);
    const list = bellNotices(visible, keys, now);
    return {
      hydrated: !!now && historyReady && blog.hydrated && messages.hydrated && market.hydrated && credits.hydrated && reads.hydrated,
      settings,
      list,
      groups: groupNotices(list, settings.notifications.digest, now, settings.language.dateLocale),
      unread: unreadCount(visible, keys, settings, now),
      unreadList: visible.filter((n) => !isNoticeRead(n, keys)),
      isRead: (n: Notice) => isNoticeRead(n, keys),
      projectName: (id: string) => names.get(id) ?? null,
    };
  }, [all, settings, reads.keys, reads.hydrated, now, historyReady, blog.hydrated, messages.hydrated, market.hydrated, credits.hydrated, names]);
}

/** Whether a toast may show for `n` now (digest, quiet hours, the kind's toggle, mutes). */
export function useToastGate(): (n: Notice) => boolean {
  const settings = useSettings();
  const now = useNoticeClock();
  return React.useCallback((n: Notice) => !!now && toastAllowed(n, settings, now), [settings, now]);
}
